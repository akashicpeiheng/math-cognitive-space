"""Read-only public action adapter. Never accepts a UI status as a proof."""
from pathlib import Path
import copy
import json
import kernel as K

HERE=Path(__file__).resolve().parent

def authorize(public, action_id, resource, declared_background):
    """A declared assumption remains a condition, not an established theorem."""
    before=K.digest(public)
    action=public['actions'][action_id]
    node=public['nodes'][action['output']]
    K.need(resource.get('kind')=='certificate','presentation is not proof evidence')
    K.need(resource['node']==node['id'] and resource['node_version']==node['version'],'node/version mismatch')
    bundle=resource['bundle']
    result=K.check(bundle,resource['proof_id'])
    K.need(bundle['theory']==node['theory'],'public theory structure mismatch')
    K.need(result['theory_sha256']==node['theory_sha256'],'public theory digest mismatch')
    K.need(result['checker']==action['checker'] and result['checker_sha256']==action['checker_sha256'],'checker implementation/version mismatch')
    K.need(result['conclusion_type']==node['conclusion_type'] and K.same(result['conclusion'],node['conclusion']),'public conclusion/type mismatch')
    K.need(result['open_hypotheses']==node['required_hypotheses'],'public open hypothesis contract mismatch')
    for label,f in result['open_hypotheses'].items():
        r=declared_background.get(label)
        K.need(r is not None and r.get('kind')=='declared_assumption','open assumption has no declared source: '+label)
        K.need(r['theory']==node['theory'] and K.same(r['formula'],f),'assumption source mismatch')
        K.need(bool(r.get('source')),'missing assumption provenance')
    K.need(K.digest(public)==before,'public ontology mutated')
    return {'status':'passed','output_node':node['id'],'node_version':node['version'],
            'certificate':result,'conditions':result['open_hypotheses'],
            'unconditional':not result['open_hypotheses'],
            'scope':'fragment only; conditional on theory and declared assumptions',
            'personal_mastery':'NOT-CLAIMED','public_sha256':before}

def create_fixture():
    import examples as E
    public={'version':'certified-fragments/1','nodes':{},'actions':{}}
    resources={}; backgrounds={}
    for name in ['group','limit','manifold','tensor']:
        bundle=K.load(HERE/'certificates'/f'{name}.json'); result=K.check(bundle)
        nid=name+'-fragment'
        node={'id':nid,'version':'1','theory':bundle['theory'],'theory_sha256':result['theory_sha256'],
              'conclusion':result['conclusion'],'conclusion_type':result['conclusion_type'],
              'required_hypotheses':result['open_hypotheses']}
        public['nodes'][nid]=node
        public['actions'][name]={'output':nid,'checker':K.VERSION,'checker_sha256':K.file_hash(HERE/'kernel.py')}
        resources[name]={'kind':'certificate','node':nid,'node_version':'1','bundle':bundle,'proof_id':bundle['target']}
        backgrounds[name]={h:{'kind':'declared_assumption','formula':f,'theory':bundle['theory'],'source':'explicit public conditional context: '+h} for h,f in result['open_hypotheses'].items()}
    fixture={'public':public,'resources':resources,'backgrounds':backgrounds,'synthetic_personal_data':False}
    (HERE/'actions-fixture.json').write_text(json.dumps(fixture,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def run():
    f=K.load(HERE/'actions-fixture.json'); public=f['public']; successes={}; rejects=[]
    for name in public['actions']:
        successes[name]=authorize(public,name,f['resources'][name],f['backgrounds'][name])
    cases=[]
    r=copy.deepcopy(f['resources']['group']); r['kind']='presentation'; cases.append(('display_without_proof',r,f['backgrounds']['group']))
    cases.append(('unsatisfied_assumption',f['resources']['group'],{}))
    r=copy.deepcopy(f['resources']['group']); r['node_version']='0'; cases.append(('old_certificate_new_node',r,f['backgrounds']['group']))
    r=copy.deepcopy(f['resources']['group']); r['bundle']['theory']['version']='2'; cases.append(('changed_theory',r,f['backgrounds']['group']))
    background=copy.deepcopy(f['backgrounds']['group']); next(iter(background.values()))['kind']='learner_confirmed'; cases.append(('personal_confirmation_is_not_assumption',f['resources']['group'],background))
    for name,r,context in cases:
        try: authorize(public,'group',r,context)
        except K.CheckError as e: rejects.append({'case':name,'status':'rejected','reason':str(e)})
        else: raise AssertionError('invalid action admitted: '+name)
    result={'status':'passed','successes':successes,'rejected':rejects,'site_integration':'standalone adapter only'}
    (HERE/'action-report.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'passed','case_fragments':len(successes),'negative_actions':len(rejects)}))

if __name__=='__main__':
    import sys
    if sys.argv[1:]==['--create-fixture']: create_fixture()
    else: run()
