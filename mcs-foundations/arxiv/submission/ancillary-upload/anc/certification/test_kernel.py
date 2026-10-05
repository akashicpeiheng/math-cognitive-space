"""Adversarial certificates, CLI behavior, independent semantics and mutations."""
from pathlib import Path
from itertools import product
import copy
import importlib.util
import json
import subprocess
import sys
import tempfile
import kernel as K
import examples as E
from independent import Model,enumerate_terms

HERE=Path(__file__).resolve().parent

def proof(b): return b['proofs'][b['target']]
def last(b): return proof(b)['steps'][-1]

def universal_leak():
    b=E.Builder(E.theory('bad-all'),'bad-all'); x,y=K.V('x','i'),K.V('y','i')
    p=b.assume('h',K.Eq(y,x))
    p=b.add('all_i',K.All(y,K.Eq(y,x)),[p],variable=y)
    return b.bundle(p)

def existential_leak():
    b=E.Builder(E.theory('bad-ex'),'bad-ex'); x,y,c=K.V('x','i'),K.V('y','i'),K.V('c','i')
    p=b.assume('ex',K.Ex(x,K.Eq(x,c))); q=b.assume('w',K.Eq(y,c))
    p=b.add('ex_e',K.Eq(y,c),[p,q],discharge='w',variable=y)
    return b.bundle(p)

def negative_examples():
    out={'all_eigen_leak':universal_leak(),'ex_eigen_leak':existential_leak()}
    b=E.group(); proof(b)['open_hypotheses']={}; out['hidden_open_hypothesis']=b
    b=E.identity_implication(); last(b)['discharge']='missing'; out['illegal_discharge']=b
    b=E.quantifiers(); last(b)['rule']='classical_refutation'; out['unsupported_rule']=b
    b=E.constant_sequence(); proof(b)['steps'][0]['conclusion']=K.Eq(K.L('true'),K.L('false')); out['forged_h_axiom']=b
    b=E.group(); s=next(s for s in proof(b)['steps'] if s['rule']=='theory'); s['witness']='fake'; out['forged_axiom_witness']=b
    b=E.group(); s=next(s for s in proof(b)['steps'] if s['rule']=='theory'); s['axiom']='bridge_is_true'; out['undeclared_axiom']=b
    b=E.nested(); last(b)['premises']=[last(b)['id']]; out['proof_cycle']=b
    b=E.nested(); last(b)['premises']=['fake-proof']; out['forged_proof_id']=b
    b=E.nested(); proof(b)['checker']='mcs-nd-subset/0'; out['checker_version']=b
    b=E.nested(); b['theory']['version']='2'; out['theory_version']=b
    b=E.nested(); last(b)['conclusion']=['app',K.L('true'),K.L('false')]; out['object_fol_confusion']=b
    b=E.constant_sequence()
    def remove_parameter(t):
        if isinstance(t,list):
            if t and t[0]=='lift': t[2].clear(); return True
            return any(remove_parameter(a) for a in t)
        return False
    assert remove_parameter(last(b)['conclusion'])
    out['lift_parameter_omission']=b
    # A closed forged abstraction equation with swapped same-sort parameters.
    t=E.theory('swap'); builder=E.Builder(t,'swap')
    x,y,z=K.V('x','i'),K.V('y','i'),K.V('z','i')
    lam=['lambda','z','i',K.App(['lambda','unused','i',x],y)]
    p=builder.beta(lam)
    b=builder.bundle(p)
    f=proof(b)['steps'][0]['conclusion']
    f[2][2][2][1][1][2].reverse()
    out['lift_parameter_swap']=b
    b=E.term_definition(); b['theory']['definitions'][0]['kind']='specification'; proof(b)['theory_sha256']=K.digest(b['theory']); out['specification_without_realization']=b
    b=E.term_definition(); b['theory']['definitions'][0]['term']=K.C('identity'); proof(b)['theory_sha256']=K.digest(b['theory']); out['self_definition']=b
    b=E.nested(); p=proof(b); p['steps']=[{'id':'ref','rule':'theorem','premises':[],'conclusion':p['conclusion'],'reference':{'id':b['target'],'checker':K.VERSION,'theory_sha256':K.digest(b['theory']),'proof_sha256':'self'}}]; p['root']='ref'; out['theorem_self_cycle']=b
    # Valid independent theorem reference, then corrupt its version.
    b=E.identity_implication(); q=copy.deepcopy(proof(b)); q['steps']=[{'id':'ref','rule':'theorem','premises':[],'conclusion':q['conclusion'],'reference':{'id':b['target'],'checker':K.VERSION,'theory_sha256':K.digest(b['theory']),'proof_sha256':K.digest(proof(b))}}]; q['root']='ref'
    b['proofs']['client']=q; b['target']='client'; K.check(b)
    q['steps'][0]['reference']['proof_sha256']='old'; out['cross_version_reference']=b
    return out

def run():
    checks=[]
    def record(name,detail): checks.append({'id':name,'status':'passed','detail':detail})
    for n,b in E.examples().items(): K.check(b)
    record('positive_certificates',len(E.examples()))
    b=E.Builder(E.theory('exists-case'),'exists-case'); x,y,z,c=K.V('x','i'),K.V('y','i'),K.V('z','i'),K.V('c','i')
    p=b.assume('exists',K.Ex(x,K.Eq(x,c))); q=b.assume('case',K.Eq(y,c))
    q=b.add('ex_i',K.Ex(z,K.Eq(z,c)),[q],term=y)
    p=b.add('ex_e',b.fs[q],[p,q],discharge='case',variable=y)
    K.check(b.bundle(p)); record('existential_nonvacuous_case',1)
    failures=HERE/'failures'; failures.mkdir(exist_ok=True)
    negatives=negative_examples()
    for n,b in negatives.items():
        try: K.check(b)
        except K.CheckError as e: record(n,{'rejected':e.status,'step':e.step,'reason':str(e)})
        else: raise AssertionError('ILLEGAL CERTIFICATE ACCEPTED: '+n)
        (failures/(n+'.json')).write_text(json.dumps(b,indent=2)+'\n',encoding='utf-8')
    sig=K.environment(E.theory('syntax'))[0]; x,y=K.V('x','i'),K.V('y','i')
    assert K.source(['lambda','x','i',x],sig)==K.source(['lambda','y','i',y],sig)
    assert K.source(['lambda','x','i',y],sig)!=K.source(['lambda','y','i',y],sig)
    sub=K.object_substitute(['lambda','y','i',x],x,y,sig)
    assert K.object_fv(sub)=={'y':'i'} and sub==['lam','i',y]
    assert K.source(['lambda','x','i',['lambda','y','i',x]],sig)!=K.source(['lambda','y','i',['lambda','y','i',y]],sig)
    try: K.object_substitute(x,x,K.L('true'),sig)
    except K.CheckError: pass
    else: raise AssertionError('wrong-type substitution accepted')
    record('binding_and_capture',5)
    comparisons=0; terms_count=0
    for n in range(1,6):
        for ty in ['i',K.arr('i','i'),K.arr('i',K.arr('i','i'))]:
            for term in enumerate_terms(n,ty):
                terms_count+=1
                for cardinality in [1,2]:
                    m=Model({'i':range(cardinality),'o':[0,1]})
                    for a,b in product(range(cardinality),repeat=2):
                        env={'x':a,'y':b}
                        assert m.named(term,env)==m.term(K.lift(term,sig),env)
                        comparisons+=1
    record('independent_translation',{'terms':terms_count,'comparisons':comparisons,'bound':'exact AST size 1..5, three result types i, i->i, i->i->i; depth<=2; free x,y:i; base size 1,2; all assignments'})
    # Independent model comparison for actual case statements under all displayed valuations.
    cases=E.examples(); count=0
    for name,b in cases.items():
        if name not in ['group','limit','manifold','tensor']: continue
        if name=='group': m=Model({'o':[0,1],'G':[0,1]}, {'unit':(0,'G'),'mul':(((0,1),(1,0)),K.arr('G',K.arr('G','G')))})
        elif name=='limit': m=Model({'o':[0,1],'R':[0,1],'N':[0,1]})
        elif name=='manifold': m=Model({'o':[0,1],'X':[0,1],'Y':[0,1]}, {'chart':((0,1),K.arr('X','Y')),'inverse':((0,1),K.arr('Y','X'))})
        else: m=Model({'o':[0,1],'F':[0,1],'Vec':[0,1]}, {'scalar':(((0,0),(0,1)),K.arr('F',K.arr('Vec','Vec'))),'vadd':(((0,1),(1,0)),K.arr('Vec',K.arr('Vec','Vec'))),'fadd':(((0,1),(1,0)),K.arr('F',K.arr('F','F')))})
        p=proof(b); vs=K.merge_vars(K.formula_fv(p['conclusion']),*(K.formula_fv(f) for f in p['open_hypotheses'].values()))
        for values in product(*(m.domain(t) for t in vs.values())):
            env=dict(zip(vs,values))
            if all(m.formula(f,env) for f in p['open_hypotheses'].values()): assert m.formula(p['conclusion'],env)
            count+=1
    record('independent_case_models',{'assignments':count,'scope':'C2, two-valued constant sequence, identity charts, 1D vector space over F2; not full cases'})
    # A concrete two-element countermodel of each bad quantifier inference.
    m=Model({'o':[0,1],'i':[0,1]})
    p=proof(universal_leak()); assert m.formula(p['hypotheses']['h'],{'x':0,'y':0}) and not m.formula(p['conclusion'],{'x':0})
    p=proof(existential_leak()); assert m.formula(p['hypotheses']['ex'],{'c':0}) and not m.formula(p['conclusion'],{'c':0,'y':1})
    record('quantifier_countermodels',2)
    # Check every supported background schema in bounded standard models.
    m=Model({'o':[0,1],'i':[0,1]}); schemas=[{'schema':'two_distinct'},{'schema':'two_exhaustive'}]
    schemas += [{'schema':'logic','op':x} for x in ['not','and','or','imp']]
    schemas += [{'schema':'equality','type':'i'},{'schema':'quantifier','op':'all','type':'i'},{'schema':'quantifier','op':'ex','type':'i'},{'schema':'extensionality','domain':'i','codomain':'i'},{'schema':'abstraction','term':['lambda','x','i',x]}]
    for spec in schemas: assert m.formula(K.axiom(spec,sig),{})
    record('independent_background_schemas',len(schemas))
    mutant_rows=[]
    code=(HERE/'kernel.py').read_text(encoding='utf-8')
    lines=[("need(all(v[1] not in formula_fv(hypotheses[h]) for h in hs),'universal eigenvariable leaks into open assumptions')",'all_eigen_leak'),
           ("need(v[1] not in formula_fv(fs[0]) and v[1] not in formula_fv(f) and all(v[1] not in formula_fv(hypotheses[a]) for a in hs),'existential eigenvariable leaks')",'ex_eigen_leak')]
    with tempfile.TemporaryDirectory(prefix='mcs-mutation-') as tmp:
        for i,(line,negative) in enumerate(lines):
            assert code.count(line)==1
            path=Path(tmp)/('mutant'+str(i)+'.py'); path.write_text(code.replace(line,'pass # controlled deletion'),encoding='utf-8')
            spec=importlib.util.spec_from_file_location('mutant'+str(i),path); module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
            # The negative-test predicate fails when this mutant accepts it.
            accepted=module.check(negatives[negative])['status']=='passed'
            assert accepted,'mutation did not exercise the removed guard'
            probe="import importlib.util,sys; s=importlib.util.spec_from_file_location('mut',sys.argv[1]); m=importlib.util.module_from_spec(s); s.loader.exec_module(m)\ntry: m.check(m.load(sys.argv[2]))\nexcept m.CheckError: sys.exit(0)\nprint('NEGATIVE TEST FAILED: invalid certificate accepted'); sys.exit(1)"
            proc=subprocess.run([sys.executable,'-c',probe,str(path),str(failures/(negative+'.json'))],capture_output=True,text=True)
            assert proc.returncode==1
            mutant_rows.append({'removed_guard':negative,'negative_harness_exit':proc.returncode,'output':proc.stdout.strip(),'production_untouched':K.file_hash(HERE/'kernel.py')})
    record('controlled_mutations',mutant_rows)
    with tempfile.TemporaryDirectory(prefix='mcs-cli-') as tmp:
        path=Path(tmp)/'truncated.json'; path.write_text('{"format":',encoding='utf-8')
        huge=Path(tmp)/'huge.json'; huge.write_text(' '* (K.MAX_BYTES+1),encoding='utf-8')
        for p,expected in [(path,4),(huge,3),(failures/'unsupported_rule.json',2),(failures/'all_eigen_leak.json',1),(HERE/'certificates/group.json',0)]:
            proc=subprocess.run([sys.executable,str(HERE/'kernel.py'),str(p)],capture_output=True,text=True)
            assert proc.returncode==expected,(p,proc.stdout,proc.stderr)
        (failures/'truncated.json').write_text('{"format":',encoding='utf-8')
    record('cli_exit_classes',{'accepted':0,'invalid':1,'unsupported':2,'resource_exhausted':3,'corrupt':4})
    report={'status':'passed','checker':K.VERSION,'checker_sha256':K.file_hash(HERE/'kernel.py'),'checks':checks,'not_claimed':['general kernel soundness','completeness','all lambda closure','empirical effects']}
    (HERE/'kernel-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'passed','checks':len(checks),'negative_certificates':len(negatives),'semantic_comparisons':comparisons}))

if __name__=='__main__': run()
