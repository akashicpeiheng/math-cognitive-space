"""Finite reference semantics. Does not import or call kernel evaluation helpers.

Functions are explicit value tables. Full function domains are generated only
for the finite types requested by a test, with a hard cardinality limit.
"""
from itertools import product

def key(t): return tuple(map(key,t)) if isinstance(t,list) else t

class Model:
    def __init__(self,bases,constants=None):
        self.bases=bases; self.constants=constants or {}; self.cache={}
    def domain(self,t):
        k=key(t)
        if isinstance(t,str): return tuple(self.bases[t])
        if k not in self.cache:
            a,b=self.domain(t[1]),self.domain(t[2])
            if len(b)**len(a)>65536: raise ValueError('reference finite function bound')
            self.cache[k]=tuple(product(b,repeat=len(a)))
        return self.cache[k]
    def apply(self,f,x,ty): return f[self.domain(ty[1]).index(x)]
    def logic(self,t):
        op=t[1]
        if op=='true': return 1,'o'
        if op=='false': return 0,'o'
        if op=='not': return (1,0),['->','o','o']
        if op in ['and','or','imp']:
            fun={'and':lambda a,b:a and b,'or':lambda a,b:a or b,'imp':lambda a,b:(not a) or b}[op]
            return tuple(tuple(int(fun(a,b)) for b in [0,1]) for a in [0,1]),['->','o',['->','o','o']]
        a=t[2]; d=self.domain(a)
        if op=='eq': return tuple(tuple(int(x==y) for y in d) for x in d),['->',a,['->',a,'o']]
        pred=['->',a,'o']
        fn=all if op=='all' else any
        return tuple(int(fn(v)) for v in self.domain(pred)),['->',pred,'o']
    def named(self,t,env):
        k=t[0]
        if k=='v': return env[t[1]],t[2]
        if k=='c': return self.constants[t[1]]
        if k=='logic': return self.logic(t)
        if k=='app':
            f,ft=self.named(t[1],env); a,_=self.named(t[2],env)
            return self.apply(f,a,ft),ft[2]
        if k=='lambda':
            vals=[self.named(t[3],dict(env,**{t[1]:a})) for a in self.domain(t[2])]
            return tuple(v[0] for v in vals),['->',t[2],vals[0][1]]
        raise ValueError(k)
    def db(self,t,env,stack=()):
        k=t[0]
        if k=='b': return stack[t[1]],t[2]
        if k=='v': return env[t[1]],t[2]
        if k=='c': return self.constants[t[1]]
        if k=='logic': return self.logic(t)
        if k=='app':
            f,ft=self.db(t[1],env,stack); a,_=self.db(t[2],env,stack)
            return self.apply(f,a,ft),ft[2]
        if k=='lam':
            vals=[self.db(t[2],env,(a,)+stack) for a in self.domain(t[1])]
            return tuple(v[0] for v in vals),['->',t[1],vals[0][1]]
        raise ValueError(k)
    def term(self,t,env):
        k=t[0]
        if k=='lift':
            # Independently collect free variables; binder indexes carry no names.
            vars={}
            def collect(a):
                if a[0]=='v': vars[a[1]]=a[2]
                elif a[0]=='app': collect(a[1]); collect(a[2])
                elif a[0]=='lam': collect(a[2])
            collect(t[1])
            # All identifiers in this finite fixture are plain ASCII. Sorting
            # names agrees here with JSON variable codes; no general claim.
            names=sorted(vars)
            values=[self.term(a,env)[0] for a in t[2]]
            return self.db(t[1],dict(zip(names,values)))
        if k=='app':
            f,ft=self.term(t[1],env); a,_=self.term(t[2],env)
            return self.apply(f,a,ft),ft[2]
        return self.db(t,env)
    def formula(self,f,env):
        k=f[0]
        if k=='false': return False
        if k=='eq': return self.term(f[1],env)[0]==self.term(f[2],env)[0]
        if k=='and': return self.formula(f[1],env) and self.formula(f[2],env)
        if k=='or': return self.formula(f[1],env) or self.formula(f[2],env)
        if k=='imp': return not self.formula(f[1],env) or self.formula(f[2],env)
        vals=(self.formula(f[2],dict(env,**{f[1][1]:v})) for v in self.domain(f[1][2]))
        return all(vals) if k=='all' else any(vals)

def enumerate_terms(size,ty,bound=()):
    """Exactly size nodes; i, i->i, i->i->i; bind depth <=2; free x,y:i."""
    i='i'; types=[i,['->',i,i],['->',i,['->',i,i]]]
    if size==1:
        for n,t in [('x',i),('y',i)]+list(bound):
            if t==ty: yield ['v',n,t]
    if size<2: return
    if isinstance(ty,list) and len(bound)<2:
        n='b'+str(len(bound))
        for body in enumerate_terms(size-1,ty[2],bound+((n,ty[1]),)):
            yield ['lambda',n,ty[1],body]
    for arg in types:
        ft=['->',arg,ty]
        if ft not in types: continue
        for left_size in range(1,size-1):
            for f in enumerate_terms(left_size,ft,bound):
                for x in enumerate_terms(size-1-left_size,arg,bound):
                    yield ['app',f,x]
