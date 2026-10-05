"""MCS finite ND subset v1. No proof search, implicit theory, or trusted cache.

Wire objects are JSON arrays. Source lambda terms use de Bruijn binders after
canonicalization. Certification formulas are a separate, sorted FOL language.
This Python implementation has NOT been formally verified.
"""
from pathlib import Path
import argparse
import hashlib
import json
import sys

VERSION = 'mcs-nd-subset/1'
MAX_BYTES = 4_000_000
MAX_STEPS = 2000
MAX_NODES = 150_000

class CheckError(Exception):
    def __init__(self, message, status='failed', step=None):
        super().__init__(message)
        self.status, self.step = status, step

def need(condition, message):
    if not condition:
        raise CheckError(message)

def stable(x):
    return json.dumps(x, ensure_ascii=True, separators=(',', ':'), sort_keys=True)

def digest(x):
    return hashlib.sha256(stable(x).encode()).hexdigest()

def file_hash(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def arr(a, b): return ['->', a, b]
def V(n, t): return ['v', n, t]
def C(n): return ['c', n]
def L(n, t=None): return ['logic', n] if t is None else ['logic', n, t]
def App(f, x): return ['app', f, x]
def Eq(t, u): return ['eq', t, u]
def Imp(a, b): return ['imp', a, b]
def And(a, b): return ['and', a, b]
def All(v, p): return ['all', v, p]
def Ex(v, p): return ['ex', v, p]
def B(t): return Eq(t, L('true'))
def Iff(a, b): return And(Imp(a, b), Imp(b, a))

def size_guard(x):
    stack, count = [(x, 0)], 0
    while stack:
        obj, depth = stack.pop()
        count += 1
        if count > MAX_NODES or depth > 100:
            raise CheckError('syntax resource bound exceeded', 'resource_exhausted')
        if isinstance(obj, dict):
            stack.extend((v, depth+1) for v in obj.values())
        elif isinstance(obj, list):
            stack.extend((v, depth+1) for v in obj)

def type_ok(t, bases):
    if isinstance(t, str):
        need(t in bases, 'undeclared base type: ' + t)
    else:
        need(isinstance(t, list) and len(t) == 3 and t[0] == '->', 'invalid type')
        type_ok(t[1], bases); type_ok(t[2], bases)
    return t

def logical_type(t, bases):
    op = t[1]
    if op in ['true', 'false', 'not', 'and', 'or', 'imp']:
        need(len(t) == 2, 'unexpected logical parameter')
        return {'true':'o', 'false':'o', 'not':arr('o','o'),
                'and':arr('o',arr('o','o')), 'or':arr('o',arr('o','o')),
                'imp':arr('o',arr('o','o'))}[op]
    need(op in ['eq', 'all', 'ex'] and len(t) == 3, 'unknown logical constant')
    a = type_ok(t[2], bases)
    return arr(a,arr(a,'o')) if op == 'eq' else arr(arr(a,'o'),'o')

def canonical(t, env=()):
    """Named source -> canonical object term; caller subsequently checks types."""
    need(isinstance(t, list) and t and isinstance(t[0], str), 'invalid object term')
    k = t[0]
    if k == 'lambda':
        need(len(t) == 4 and isinstance(t[1], str), 'invalid named abstraction')
        return ['lam', t[2], canonical(t[3], ((t[1],t[2]),)+env)]
    if k == 'v':
        need(len(t) == 3 and isinstance(t[1], str), 'invalid variable')
        for i, (name, ty) in enumerate(env):
            if name == t[1]:
                need(ty == t[2], 'bound variable type mismatch')
                return ['b', i, ty]
        return t
    if k == 'lam':
        need(len(t) == 3, 'invalid canonical abstraction')
        return ['lam', t[1], canonical(t[2], ((None,t[1]),)+env)]
    if k == 'app':
        need(len(t) == 3, 'invalid application')
        return App(canonical(t[1],env), canonical(t[2],env))
    need(k in ['b','c','logic'], 'unsupported object syntax')
    return t

def merge_vars(*maps):
    result = {}
    for m in maps:
        for n,t in m.items():
            need(n not in result or result[n] == t, 'inconsistent free variable type: '+n)
            result[n] = t
    return result

def object_fv(t):
    if t[0] == 'v': return {t[1]:t[2]}
    if t[0] == 'app': return merge_vars(object_fv(t[1]),object_fv(t[2]))
    if t[0] == 'lam': return object_fv(t[2])
    return {}

def infer(t, sig, bound=()):
    need(isinstance(t,list) and t, 'invalid term')
    k = t[0]
    if k == 'v':
        need(len(t)==3 and isinstance(t[1],str) and t[1] and t[1] not in sig['constants'], 'invalid/overlapping variable')
        return type_ok(t[2],sig['bases'])
    if k == 'b':
        need(len(t)==3 and type(t[1]) is int and 0<=t[1]<len(bound), 'dangling bound variable')
        need(t[2]==bound[t[1]], 'bound sort mismatch')
        return t[2]
    if k == 'c':
        need(len(t)==2 and t[1] in sig['constants'], 'undeclared constant')
        return sig['constants'][t[1]]
    if k == 'logic': return logical_type(t, sig['bases'])
    if k == 'app':
        need(len(t)==3, 'application arity')
        f,x = infer(t[1],sig,bound),infer(t[2],sig,bound)
        need(isinstance(f,list) and f[0]=='->' and f[1]==x, 'application type mismatch')
        return f[2]
    if k == 'lam':
        need(len(t)==3, 'abstraction arity')
        a = type_ok(t[1],sig['bases'])
        return arr(a,infer(t[2],sig,(a,)+bound))
    raise CheckError('object term constructor not supported: '+str(k), 'unsupported')

def source(t, sig):
    t = canonical(t)
    infer(t,sig); object_fv(t)
    return t

def shift(t, amount, cutoff=0):
    if t[0]=='b': return ['b',t[1]+amount if t[1]>=cutoff else t[1],t[2]]
    if t[0]=='app': return App(shift(t[1],amount,cutoff),shift(t[2],amount,cutoff))
    if t[0]=='lam': return ['lam',t[1],shift(t[2],amount,cutoff+1)]
    return t

def open_body(body, value, depth=0):
    if body[0]=='b':
        if body[1]==depth: return shift(value,depth)
        return ['b',body[1]-1 if body[1]>depth else body[1],body[2]]
    if body[0]=='app': return App(open_body(body[1],value,depth),open_body(body[2],value,depth))
    if body[0]=='lam': return ['lam',body[1],open_body(body[2],value,depth+1)]
    return body

def object_substitute(t, v, u, sig):
    t,u = source(t,sig),source(u,sig)
    need(infer(v,sig)==infer(u,sig), 'substitution type mismatch')
    need(v[0]=='v','substitution variable required')
    def sub(a,depth=0):
        if a==v: return shift(u,depth)
        if a[0]=='app': return App(sub(a[1],depth),sub(a[2],depth))
        if a[0]=='lam': return ['lam',a[1],sub(a[2],depth+1)]
        return a
    return source(sub(t),sig)

def parameters(a):
    return sorted([V(n,t) for n,t in object_fv(a).items()], key=stable)

def lift(t, sig):
    t = source(t,sig)
    if t[0]=='lam': return ['lift',t,parameters(t)]
    if t[0]=='app': return App(lift(t[1],sig),lift(t[2],sig))
    return t

def term_type(t, sig):
    need(isinstance(t,list) and t, 'invalid certification term')
    if t[0]=='lift':
        need(len(t)==3 and isinstance(t[2],list), 'lift arity')
        a = source(t[1],sig)
        need(a==t[1] and a[0]=='lam', 'lift identity must be canonical abstraction structure')
        ps = parameters(a)
        need(len(ps)==len(t[2]), 'lift parameter arity')
        for v,u in zip(ps,t[2]): need(v[2]==term_type(u,sig), 'lift parameter sort/order mismatch')
        return infer(a,sig)
    if t[0]=='app':
        need(len(t)==3, 'app arity')
        f,u=term_type(t[1],sig),term_type(t[2],sig)
        need(isinstance(f,list) and f[0]=='->' and f[1]==u,'sorted app mismatch')
        return f[2]
    need(t[0] in ['v','c','logic'],'object/certification language confusion')
    return infer(t,sig)

def term_fv(t):
    if t[0]=='v': return {t[1]:t[2]}
    if t[0]=='app': return merge_vars(term_fv(t[1]),term_fv(t[2]))
    if t[0]=='lift': return merge_vars(*(term_fv(u) for u in t[2]))
    return {}

def formula_ok(f, sig):
    need(isinstance(f,list) and f, 'invalid certification formula')
    k=f[0]
    if k=='false': need(len(f)==1,'false arity')
    elif k=='eq':
        need(len(f)==3,'equality arity')
        need(term_type(f[1],sig)==term_type(f[2],sig),'equality sort mismatch')
        merge_vars(term_fv(f[1]),term_fv(f[2]))
    elif k in ['imp','and','or']:
        need(len(f)==3,'connective arity')
        formula_ok(f[1],sig); formula_ok(f[2],sig)
    elif k in ['all','ex']:
        need(len(f)==3 and f[1][0]=='v','quantifier binder')
        infer(f[1],sig); formula_ok(f[2],sig)
        need(f[1][1] not in formula_fv(f[2]) or formula_fv(f[2])[f[1][1]]==f[1][2], 'binder sort clash')
    else: raise CheckError('unsupported certification formula: '+str(k),'unsupported')
    formula_fv(f)
    return f

def formula_fv(f):
    k=f[0]
    if k=='eq': return merge_vars(term_fv(f[1]),term_fv(f[2]))
    if k in ['imp','and','or']: return merge_vars(formula_fv(f[1]),formula_fv(f[2]))
    if k in ['all','ex']: return {n:t for n,t in formula_fv(f[2]).items() if n!=f[1][1]}
    return {}

def all_names(x):
    if not isinstance(x,list): return set()
    if x and x[0]=='v': return {x[1]}
    return set().union(*(all_names(a) for a in x))

def fresh(names):
    i=0
    while 'z'+str(i) in names: i+=1
    return 'z'+str(i)

def term_sub(t,v,u):
    if t==v: return u
    if t[0]=='app': return App(term_sub(t[1],v,u),term_sub(t[2],v,u))
    # The identity stored inside a lift symbol is NOT a term argument.
    if t[0]=='lift': return ['lift',t[1],[term_sub(a,v,u) for a in t[2]]]
    return t

def fsub(f,v,u):
    k=f[0]
    if k=='eq': return Eq(term_sub(f[1],v,u),term_sub(f[2],v,u))
    if k in ['imp','and','or']: return [k,fsub(f[1],v,u),fsub(f[2],v,u)]
    if k in ['all','ex']:
        if f[1]==v: return f
        binder,body=f[1],f[2]
        if binder[1] in term_fv(u):
            renamed=V(fresh(all_names(f)|all_names(u)|{v[1]}),binder[2])
            body=fsub(body,binder,renamed); binder=renamed
        return [k,binder,fsub(body,v,u)]
    return f

def fcode(f, env=()):
    def tc(t):
        if t[0]=='v':
            for i,v in enumerate(env):
                if t==v: return ['bound',i,t[2]]
        if t[0]=='app': return ['app',tc(t[1]),tc(t[2])]
        if t[0]=='lift': return ['lift',t[1],[tc(a) for a in t[2]]]
        return t
    if f[0]=='eq': return Eq(tc(f[1]),tc(f[2]))
    if f[0] in ['imp','and','or']: return [f[0],fcode(f[1],env),fcode(f[2],env)]
    if f[0] in ['all','ex']: return [f[0],f[1][2],fcode(f[2],(f[1],)+env)]
    return f

def same(a,b): return fcode(a)==fcode(b)

def close(vs,f):
    for v in reversed(vs): f=All(v,f)
    return f

def axiom(spec,sig):
    """Reconstruct closed H_Sigma schema. No supplied conclusion is trusted."""
    k=spec['schema']
    p,q=V('p','o'),V('q','o')
    if k=='two_distinct': f=Imp(Eq(L('true'),L('false')),['false'])
    elif k=='two_exhaustive': f=All(p,['or',B(p),Eq(p,L('false'))])
    elif k=='logic':
        op=spec['op']; need(op in ['not','and','or','imp'],'unknown logical schema')
        if op=='not': f=All(p,Iff(B(App(L(op),p)),Imp(B(p),['false'])))
        else: f=close([p,q],Iff(B(App(App(L(op),p),q)),[op,B(p),B(q)]))
    elif k=='equality':
        a=type_ok(spec['type'],sig['bases']); x,y=V('x',a),V('y',a)
        f=close([x,y],Iff(B(App(App(L('eq',a),x),y)),Eq(x,y)))
    elif k=='quantifier':
        a=type_ok(spec['type'],sig['bases']); op=spec['op']; need(op in ['all','ex'],'quantifier schema')
        pred,x=V('P',arr(a,'o')),V('x',a)
        f=All(pred,Iff(B(App(L(op,a),pred)),[op,x,B(App(pred,x))]))
    elif k=='extensionality':
        a,b=type_ok(spec['domain'],sig['bases']),type_ok(spec['codomain'],sig['bases'])
        ff,g,x=V('f',arr(a,b)),V('g',arr(a,b)),V('x',a)
        f=close([ff,g],Imp(All(x,Eq(App(ff,x),App(g,x))),Eq(ff,g)))
    elif k=='abstraction':
        a=source(spec['term'],sig); need(a[0]=='lam','abstraction schema requires lambda')
        ps=parameters(a); x=V(fresh(set(object_fv(a))|set(sig['constants'])),a[1])
        f=close(ps+[x],Eq(App(lift(a,sig),x),lift(open_body(a[2],x),sig)))
    else: raise CheckError('unsupported axiom schema: '+str(k),'unsupported')
    formula_ok(f,sig)
    need(not formula_fv(f),'internal unclosed background axiom')
    return f

def environment(theory):
    need(theory['version'] and theory['id'],'theory identity required')
    sig={'bases':theory['bases'], 'constants':dict(theory['constants'])}
    need(isinstance(sig['bases'],list) and 'o' in sig['bases'] and len(set(sig['bases']))==len(sig['bases']),'invalid bases')
    for n,t in sig['constants'].items():
        need(isinstance(n,str) and bool(n),'invalid constant name'); type_ok(t,sig['bases'])
    definitions={}
    for d in theory.get('definitions',[]):
        if d.get('kind')!='term': raise CheckError('specification definition requires separate domain-realization certification; unsupported','unsupported')
        need(d['name'] not in sig['constants'] and d['name'] not in definitions,'nonfresh definition')
        t=source(d['term'],sig)
        need(not object_fv(t),'term definition must be old-language closed')
        ty=infer(t,sig); sig['constants'][d['name']]=ty
        definitions[d['name']]=Eq(C(d['name']),lift(t,sig))
    axioms={}
    for entry in theory.get('axioms',[]):
        need(entry['id'] not in axioms,'duplicate theory axiom')
        f=entry['formula']; formula_ok(f,sig)
        need(not formula_fv(f),'theory axioms must be closed')
        axioms[entry['id']]=f
    return sig,definitions,axioms

def check(bundle, theorem_id=None):
    size_guard(bundle)
    need(bundle['format']==VERSION,'certificate format/version mismatch')
    theory=bundle['theory']; sig,definitions,axioms=environment(theory)
    thash=digest(theory)
    proofs=bundle['proofs']; need(isinstance(proofs,dict) and proofs,'proof registry required')
    total=sum(len(p['steps']) for p in proofs.values())
    if total>MAX_STEPS: raise CheckError('proof step bound exceeded','resource_exhausted')
    checked,active={},set()
    def replay(pid):
        need(pid in proofs,'unresolved proof ID: '+str(pid))
        need(pid not in active,'cyclic theorem dependency: '+str(pid))
        if pid in checked: return checked[pid]
        active.add(pid)
        proof=proofs[pid]
        need(proof['checker']==VERSION,'proof checker version mismatch')
        need(proof['theory_sha256']==thash,'proof theory version/hash mismatch')
        hypotheses=proof['hypotheses']
        for name,f in hypotheses.items(): formula_ok(f,sig)
        steps={s['id']:s for s in proof['steps']}
        need(len(steps)==len(proof['steps']) and steps,'duplicate/empty proof steps')
        done,visiting={},set()
        def visit(sid):
            need(sid in steps,'unresolved step ID: '+str(sid))
            need(sid not in visiting,'cyclic step dependency: '+str(sid))
            if sid in done: return done[sid]
            visiting.add(sid); s=steps[sid]
            try:
                f=s['conclusion']; formula_ok(f,sig)
                deps=[visit(x) for x in s.get('premises',[])]
                fs=[d[0] for d in deps]; hs=set().union(*(d[1] for d in deps))
                used=set().union(*(d[2] for d in deps)); r=s['rule']
                def count(n): need(len(fs)==n,'wrong premise count for '+r)
                if r=='assume':
                    count(0); h=s['hypothesis']; need(h in hypotheses and same(f,hypotheses[h]),'invalid assumption'); hs={h}
                elif r=='h_axiom': count(0); need(same(f,axiom(s['instance'],sig)),'forged H_Sigma instance'); used={'H:'+stable(s['instance'])}
                elif r=='theory':
                    count(0); aid=s['axiom']; need(aid in axioms and s['witness']==digest(axioms[aid]) and same(f,axioms[aid]),'invalid finite theory member witness'); used={'T:'+aid}
                elif r=='definition':
                    count(0); name=s['name']; need(name in definitions and same(f,definitions[name]),'invalid old-term definition'); used={'D:'+name}
                elif r=='theorem':
                    count(0); ref=s['reference']; other=replay(ref['id'])
                    need(ref['checker']==VERSION and ref['theory_sha256']==thash and ref['proof_sha256']==digest(proofs[ref['id']]),'cross-version theorem reference')
                    need(not other['open_hypotheses'],'external theorem has open assumptions')
                    need(same(f,other['conclusion']),'theorem conclusion mismatch'); used=set(other['dependencies'])
                elif r=='imp_i':
                    count(1); h=s['discharge']; need(h in hypotheses,'undeclared discharge label')
                    need(same(f,Imp(hypotheses[h],fs[0])),'implication introduction mismatch'); hs.discard(h)
                elif r=='imp_e':
                    count(2); need(fs[0][0]=='imp' and same(fs[0][1],fs[1]) and same(f,fs[0][2]),'implication elimination mismatch')
                elif r=='and_i': count(2); need(same(f,And(*fs)),'conjunction introduction mismatch')
                elif r in ['and_l','and_r']:
                    count(1); need(fs[0][0]=='and' and same(f,fs[0][1 if r=='and_l' else 2]),'conjunction elimination mismatch')
                elif r=='refl': count(0); need(f[0]=='eq' and f[1]==f[2],'equality reflexivity mismatch')
                elif r=='eq_e':
                    count(2); need(fs[0][0]=='eq','equality premise required')
                    v,ctx=s['variable'],s['context']; need(v[0]=='v','equality context variable')
                    formula_ok(ctx,sig); need(infer(v,sig)==term_type(fs[0][1],sig),'equality substitution sort')
                    need(same(fs[1],fsub(ctx,v,fs[0][1])) and same(f,fsub(ctx,v,fs[0][2])),'equality substitution mismatch')
                elif r=='all_i':
                    count(1); need(f[0]=='all','universal conclusion required'); v=s['variable']
                    need(v[0]=='v' and infer(v,sig)==infer(f[1],sig),'universal eigenvariable sort')
                    need(same(fs[0],fsub(f[2],f[1],v)),'universal instance mismatch')
                    need(v[1] not in formula_fv(f), 'eigenvariable remains free in universal conclusion')
                    need(all(v[1] not in formula_fv(hypotheses[h]) for h in hs),'universal eigenvariable leaks into open assumptions')
                elif r=='all_e':
                    count(1); need(fs[0][0]=='all','universal premise required'); t=s['term']
                    need(term_type(t,sig)==fs[0][1][2],'universal instantiation sort')
                    need(same(f,fsub(fs[0][2],fs[0][1],t)),'universal elimination mismatch')
                elif r=='ex_i':
                    count(1); need(f[0]=='ex','existential conclusion required'); t=s['term']
                    need(term_type(t,sig)==f[1][2] and same(fs[0],fsub(f[2],f[1],t)),'existential introduction mismatch')
                elif r=='ex_e':
                    count(2); need(fs[0][0]=='ex','existential premise required'); h=s['discharge']; v=s['variable']
                    need(v[0]=='v' and infer(v,sig)==fs[0][1][2],'existential eigenvariable sort')
                    need(h in hypotheses and same(hypotheses[h],fsub(fs[0][2],fs[0][1],v)) and same(f,fs[1]),'existential elimination mismatch')
                    # Discharge only the case derivation, never the existential premise.
                    hs=deps[0][1] | (deps[1][1]-{h})
                    need(v[1] not in formula_fv(fs[0]) and v[1] not in formula_fv(f) and all(v[1] not in formula_fv(hypotheses[a]) for a in hs),'existential eigenvariable leaks')
                else: raise CheckError('unsupported rule: '+str(r),'unsupported')
                done[sid]=(f,hs,used); visiting.remove(sid); return done[sid]
            except CheckError as e:
                if e.step is None: e.step=pid+':'+sid
                raise
        # Even unused supplied nodes must be well formed and acyclic.
        for sid in steps: visit(sid)
        f,hs,used=visit(proof['root'])
        need(same(f,proof['conclusion']),'declared final conclusion mismatch')
        actual={h:hypotheses[h] for h in sorted(hs)}
        need(proof['open_hypotheses']==actual,'declared open hypotheses differ from recomputed ones')
        if 'object_conclusion' in proof:
            p=source(proof['object_conclusion'],sig); need(infer(p,sig)=='o','object conclusion is not Boolean')
            need(same(f,B(lift(p,sig))),'final HOL/FOL translation mismatch')
        result={'status':'passed','checker':VERSION,'checker_sha256':file_hash(__file__),
                'theory_id':theory['id'],'theory_version':theory['version'],'theory_sha256':thash,
                'proof_id':pid,'proof_sha256':digest(proof),'conclusion':f,
                'conclusion_type':'FOL-formula','object_conclusion':proof.get('object_conclusion'),
                'open_hypotheses':actual,'dependencies':sorted(used),
                'kernel_formally_verified':False}
        checked[pid]=result; active.remove(pid); return result
    target=theorem_id or bundle['target']
    for pid in proofs: replay(pid)
    return replay(target)

def load(path):
    data=Path(path).read_bytes()
    if len(data)>MAX_BYTES: raise CheckError('file size bound exceeded','resource_exhausted')
    def unique(pairs):
        d={}
        for k,v in pairs:
            if k in d: raise CheckError('duplicate JSON key: '+k,'corrupt')
            d[k]=v
        return d
    return json.loads(data,object_pairs_hook=unique)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('certificate'); parser.add_argument('--theorem'); parser.add_argument('--output')
    args=parser.parse_args()
    try:
        result=check(load(args.certificate),args.theorem)
        result['input_sha256']=file_hash(args.certificate); code=0
    except CheckError as e:
        result={'status':e.status,'step':e.step,'message':str(e)}
        code={'failed':1,'unsupported':2,'resource_exhausted':3,'corrupt':4}.get(e.status,1)
    except (OSError,ValueError,KeyError,TypeError,IndexError) as e:
        result={'status':'corrupt','message':str(e)}; code=4
    except (RecursionError,MemoryError) as e:
        result={'status':'resource_exhausted','message':type(e).__name__}; code=3
    output=json.dumps(result,ensure_ascii=True,indent=2)
    if args.output:
        p=Path(args.output); p.parent.mkdir(parents=True,exist_ok=True); p.write_text(output+'\n',encoding='utf-8')
    print(output)
    return code

if __name__=='__main__': sys.exit(main())
