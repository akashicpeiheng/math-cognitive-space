"""Synthetic-only external model and finite representation comparison.

Run with --generate once to save the fixed input. Default reads that input;
--split participant|time selects the isolation rule. No participant recruitment.
"""
from pathlib import Path
from itertools import product
import argparse
import hashlib
import json
import math
import random
import statistics
import time

HERE=Path(__file__).resolve().parent
SEED=20260929
MODEL='beta-observation-and-stipulated-transition/1'

def digest(x):
    return hashlib.sha256(json.dumps(x,sort_keys=True,separators=(',',':')).encode()).hexdigest()

def generate():
    rng=random.Random(SEED)
    abilities=['definition','calculation','proof','transfer']
    nodes=['LimitED','Group','Tensor','CkAtlas']
    items=[]
    for k,a in enumerate(abilities):
        for t in range(6):
            items.append({'id':a+'-'+str(t),'ability':a,'anchor':[{'node':nodes[k],'competence':a}],
                          'phase':'diagnostic' if t<2 else 'fit' if t<4 else 'holdout',
                          'occasion':t,'migration_task':t==4,'delayed_task':t==5})
    rows=[]
    for i in range(36):
        latent={a:rng.uniform(.2,.8) for a in abilities}
        for item in items:
            p=latent[item['ability']]
            correct=int(rng.random()<p)
            missing=(i+item['occasion'])%29==0
            rows.append({'id':f'p{i:02d}:'+item['id'],'participant':f'p{i:02d}','item':item['id'],
                         'time':item['occasion'],'correct':None if missing else correct,
                         'confidence':None if missing else round(min(1,max(0,p+rng.uniform(-.2,.2))),4),
                         'seconds':None if missing else round(20+40*(1-p)+rng.uniform(0,15),4)})
    data={'schema':'mcs-synthetic-research/1','synthetic':True,'seed':SEED,'model':MODEL,
          'public_version':'research-content/1','items':items,'observations':rows,
          'model_assumptions':{'prior':[1,1],'learning_rate':{'analogy':.15,'deduction':.10},
                               'forgetting':.05,'cost':{'analogy':1,'deduction':2},
                               'note':'stipulated transition and cost, NOT empirically fitted'},
          'comparison':{'nodes':['a','b','c','g'],'goal':'g','horizon':3,'budget':3,
                        'actions':[{'id':'ab','inputs':['a','b'],'output':'g','kind':'certified','cost':2},
                                   {'id':'c','inputs':['c'],'output':'g','kind':'certified','cost':1},
                                   {'id':'show_b','inputs':[],'output':'b','kind':'presentation','cost':1},
                                   {'id':'prove_b','inputs':['a'],'output':'b','kind':'certified','cost':1}]}}
    (HERE/'research-input.json').write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')

def split(data,mode):
    items={i['id']:i for i in data['items']}
    people=sorted({r['participant'] for r in data['observations']})
    random.Random(data['seed']).shuffle(people)
    training=set(people[:24]); testing=set(people[24:])
    if mode=='participant':
        train=[r for r in data['observations'] if r['participant'] in training and items[r['item']]['phase']!='holdout']
        test=[r for r in data['observations'] if r['participant'] in testing and items[r['item']]['phase']=='holdout']
        context=[r for r in data['observations'] if r['participant'] in testing and items[r['item']]['phase']=='diagnostic']
        assert {r['participant'] for r in train}.isdisjoint(r['participant'] for r in test)
    else:
        train=[r for r in data['observations'] if r['time']<4]
        test=[r for r in data['observations'] if r['time']>=4]
        context=[] # fitting already used the earlier observations, no double counting
        assert max(r['time'] for r in train)<min(r['time'] for r in test)
    assert {r['id'] for r in train}.isdisjoint(r['id'] for r in test)
    assert {r['item'] for r in train}.isdisjoint(r['item'] for r in test)
    assert {r['id'] for r in context}.isdisjoint(r['id'] for r in train+test)
    return train,test,context

def fit_model(train,items):
    state={i['ability']:[1.0,1.0] for i in items.values()}
    for r in train:
        if r['correct'] is not None:
            state[items[r['item']]['ability']][1-r['correct']]+=1
    return state

def evaluate(data,mode):
    items={i['id']:i for i in data['items']}
    train,test,context=split(data,mode); fitted=fit_model(train,items)
    predictions=[]; brier=[]; ll=[]; acc=[]
    for r in test:
        skill=items[r['item']]['ability']; a,b=fitted[skill]
        # The population posterior supplies a unit-strength prior; only strictly
        # earlier diagnostic observations update the held-out person's state.
        a,b=a/(a+b),b/(a+b)
        for obs in context:
            if obs['participant']==r['participant'] and obs['time']<r['time'] and items[obs['item']]['ability']==skill and obs['correct'] is not None:
                a+=obs['correct']; b+=1-obs['correct']
        p=a/(a+b)
        predictions.append({'observation':r['id'],'predicted_correct':p,'outcome':r['correct'],'ability':skill})
        if r['correct'] is not None:
            y=r['correct']; brier.append((p-y)**2); ll.append(-(y*math.log(p)+(1-y)*math.log(1-p))); acc.append(int((p>=.5)==bool(y)))
    # Unknown stays unknown through the stipulated learning/forgetting update.
    def transition(q,action):
        if q is None: return None
        rate=data['model_assumptions']['learning_rate'][action]
        return (q+rate*(1-q))*(1-data['model_assumptions']['forgetting'])
    assert transition(None,'analogy') is None
    public={'items':data['items'],'comparison':data['comparison'],'version':data['public_version']}
    h=digest(public); demo={a:transition(.4,a) for a in ['analogy','deduction']}; assert digest(public)==h
    result={'split':mode,'train_rows':len(train),'test_rows':len(test),'context_rows':len(context),
            'scored':len(brier),'missing_test':len(test)-len(brier),'brier':statistics.mean(brier),
            'log_loss':statistics.mean(ll),'accuracy_at_half':statistics.mean(acc),
            'population_beta':fitted,'predictions':predictions,
            'train_ids_sha256':digest([r['id'] for r in train]),'test_ids_sha256':digest([r['id'] for r in test]),
            'holdout_item_ids':sorted({r['item'] for r in test}),
            'transition_demo':demo,'unknown_transition':None,'public_sha256':h,
            'confidence_mean':statistics.mean(r['confidence'] for r in test if r['confidence'] is not None),
            'seconds_mean':statistics.mean(r['seconds'] for r in test if r['seconds'] is not None)}
    # Leakage probe: flip every held-out outcome; fitted parameters and predictions stay fixed.
    mutated=json.loads(json.dumps(data)); test_ids={r['id'] for r in test}
    for r in mutated['observations']:
        if r['id'] in test_ids and r['correct'] is not None: r['correct']=1-r['correct']
    train2,test2,context2=split(mutated,mode)
    assert fit_model(train2,items)==fitted and context2==context
    result['heldout_outcome_mutation_does_not_change_fit']=True
    return result

def oracle(word,known,comp):
    """Direct finite semantics: enumerate every completion of unknown availability."""
    unknown=[n for n,v in known.items() if v is None]; values=[]
    by={a['id']:a for a in comp['actions']}
    for bits in product([False,True],repeat=len(unknown)):
        assignment=dict(known,**dict(zip(unknown,bits)))
        resources={(n,'certified') for n,v in assignment.items() if v}
        cost=0; okay=True
        for name in word:
            a=by[name]; cost+=a['cost']
            if any((n,'certified') not in resources for n in a['inputs']): okay=False; break
            resources.add((a['output'],a['kind']))
        values.append(okay and cost<=comp['budget'] and (comp['goal'],'certified') in resources)
    return 'Found' if all(values) else 'Conditional' if any(values) else 'InfeasibleWithinBound'

def classify(word,known,comp,representation):
    by={a['id']:a for a in comp['actions']}; available=dict(known); cost=0
    supports={}; trace=[]
    if representation=='plain-dependency-graph':
        # Strong conservative convention: all incoming node edges are required.
        # OR and output resource type cannot be recovered from these edges alone.
        for a in comp['actions']: supports.setdefault(a['output'],set()).update(a['inputs'])
    conditional=False
    for name in word:
        a=by[name]; cost+=a['cost']
        ins=supports[a['output']] if supports else a['inputs']
        states=[available.get(n,False) for n in ins]
        if any(s is False for s in states): return 'InfeasibleWithinBound',trace
        uncertain=any(s is None for s in states); conditional=conditional or uncertain
        if a['kind']=='certified' or representation=='plain-dependency-graph':
            produced=None if uncertain else True
            # A prior confirmed resource cannot become unknown on repeat use.
            if available.get(a['output']) is not True: available[a['output']]=produced
        if representation!='plain-dependency-graph': trace.append({'action':name,'inputs':list(a['inputs']),'output':a['output'],'resource_kind':a['kind']})
    target=available.get(comp['goal'],False)
    if cost>comp['budget'] or target is False: return 'InfeasibleWithinBound',trace
    return ('Conditional' if conditional or target is None else 'Found'),trace

def encode(comp,name):
    if name=='plain-dependency-graph':
        return {'nodes':comp['nodes'],'edges':sorted({(i,a['output']) for a in comp['actions'] for i in a['inputs']}),
                'convention':'all incoming edges required; task/action labels retained for common candidate domain'}
    if name=='typed-action-graph':
        return {'hyperarcs':[{'id':a['id'],'tail':a['inputs'],'head':a['output'],'resource':a['kind'],'cost':a['cost']} for a in comp['actions']]}
    if name=='annotated-bipartite-graph':
        return {'resource_nodes':comp['nodes'],'action_nodes':[{k:a[k] for k in ['id','kind','cost']} for a in comp['actions']],
                'edges':[[i,'act:'+a['id'],'input'] for a in comp['actions'] for i in a['inputs']]+[['act:'+a['id'],a['output'],'output'] for a in comp['actions']]}
    return {'version':'finite-mcs/1','nodes':[{ 'id':n,'version':'1'} for n in comp['nodes']],
            'contracts':[dict(a,witness={'kind':'symbolic-structure-fixture','source':'common-comparison-input'}) for a in comp['actions']]}

def decode(encoded,comp,name):
    out={k:v for k,v in comp.items() if k!='actions'}
    if name=='plain-dependency-graph':
        out['actions']=[dict(a,inputs=[i for i,o in encoded['edges'] if o==a['output']]) for a in comp['actions']]
    elif name=='typed-action-graph':
        out['actions']=[{'id':a['id'],'inputs':a['tail'],'output':a['head'],'kind':a['resource'],'cost':a['cost']} for a in encoded['hyperarcs']]
    elif name=='annotated-bipartite-graph':
        out['actions']=[dict(a,inputs=[i for i,o,k in encoded['edges'] if o=='act:'+a['id'] and k=='input'],output=next(o for i,o,k in encoded['edges'] if i=='act:'+a['id'] and k=='output')) for a in encoded['action_nodes']]
    else:
        out['actions']=[{k:a[k] for k in ['id','inputs','output','kind','cost']} for a in encoded['contracts']]
    if name!='plain-dependency-graph': assert out==comp
    return out

def compare(comp):
    words=[w for length in range(comp['horizon']+1) for w in product([a['id'] for a in comp['actions']],repeat=length)]
    conditions=[dict(zip(['a','b','c'],v)) for v in product([False,True,None],repeat=3)]
    names=['plain-dependency-graph','typed-action-graph','MCS','annotated-bipartite-graph']
    reports={}; truth={(tuple(k.values()),w):oracle(w,k,comp) for k in conditions for w in words}
    for name in names:
        start=time.perf_counter(); encoded=encode(comp,name); represented=decode(encoded,comp,name)
        misses=spurious=unknown_errors=trace_count=0; total=0; witnesses=[]
        for known in conditions:
            for word in words:
                expected=truth[(tuple(known.values()),word)]; actual,trace=classify(word,known,represented,name)
                total+=1
                misses+=expected!='InfeasibleWithinBound' and actual=='InfeasibleWithinBound'
                spurious+=actual=='Found' and expected!='Found'
                unknown_errors+=(actual=='Conditional')!=(expected=='Conditional')
                trace_count+=bool(trace)
                if expected!=actual and len(witnesses)<3: witnesses.append({'initial':known,'word':word,'reference':expected,'observed':actual})
                if name!='plain-dependency-graph': assert expected==actual,(name,known,word,expected,actual)
        reports[name]={'candidates':total,'legal_route_misses':misses,'unjustified_found':spurious,
                       'conditional_classification_errors':unknown_errors,'candidates_with_resource_trace':trace_count,
                       'evidence_trace_supported':name!='plain-dependency-graph','mismatch_examples':witnesses,
                       'encoding':encoded,'encoding_sha256':digest(encoded),'encoding_json_bytes':len(json.dumps(encoded).encode()),
                       'elapsed_seconds_diagnostic':time.perf_counter()-start}
    # Identifiability baseline: 0..4 repetitions of a agree; untried b differs.
    def observe(model,word):
        result=[]
        for action in word: result.append(1 if action=='a' or model=='E1' else 0)
        return result
    histories=[['a']*n for n in range(5)]
    assert all(observe('E1',w)==observe('E2',w) for w in histories)
    assert observe('E1',['b'])!=observe('E2',['b'])
    ident={'same_records':[observe('E1',w) for w in histories],'new_b_predictions':{'E1':observe('E1',['b'])[0],'E2':observe('E2',['b'])[0]},
           'needed_observation':'prospectively observe b under a design controlling initial state and allocation'}
    return {'bound':{'actions':4,'words':len(words),'initial_information_states':len(conditions),'horizon':comp['horizon'],'budget':comp['budget']},
            'representations':reports,'identifiability':ident,
            'interpretation':'Typed action graph and annotated bipartite graph can match MCS on this fragment. No unique MCS advantage or teaching effect inferred.'}

def run(input_path,mode):
    data=json.loads(Path(input_path).read_text(encoding='utf-8'))
    if data.get('synthetic') is not True: raise ValueError('This runner only accepts explicitly synthetic inputs')
    assert len({r['id'] for r in data['observations']})==len(data['observations'])
    assert all(r['correct'] in [0,1,None] for r in data['observations'])
    modes=['participant','time'] if mode=='both' else [mode]
    result={'status':'passed','synthetic':True,'seed':data['seed'],'model':MODEL,'input_sha256':hashlib.sha256(Path(input_path).read_bytes()).hexdigest(),
            'implementation_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            'evaluation':[evaluate(data,m) for m in modes],'comparison':compare(data['comparison']),
            'not_claimed':['teaching effectiveness','causal benefit','measurement validity','general model identifiability','general representation superiority']}
    (HERE/'research-report.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'passed','synthetic':True,'splits':modes,'comparison_candidates_per_representation':next(iter(result['comparison']['representations'].values()))['candidates']}))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('--generate',action='store_true'); p.add_argument('--input',default=str(HERE/'research-input.json')); p.add_argument('--split',choices=['participant','time','both'],default='both'); a=p.parse_args()
    if a.generate: generate()
    else: run(a.input,a.split)
