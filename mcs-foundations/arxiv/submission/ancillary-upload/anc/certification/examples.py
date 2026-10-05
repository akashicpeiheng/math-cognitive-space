"""Untrusted certificate producer. Every generated step is replayed by kernel.py."""
from pathlib import Path
import copy
import json
import kernel as K

HERE=Path(__file__).resolve().parent

def theory(name,bases=None,constants=None,axioms=None,definitions=None):
    return {'id':name,'version':'1','bases':bases or ['o','i'],
            'constants':constants or {},'axioms':axioms or [],'definitions':definitions or []}

class Builder:
    def __init__(self,t,pid):
        self.t,self.pid=t,pid
        self.sig,self.defs,self.axioms=K.environment(t)
        self.steps=[]; self.hyp={}; self.fs={}; self.hs={}
    def add(self,rule,f,premises=(),**kw):
        sid='s'+str(len(self.steps))
        self.steps.append(dict(id=sid,rule=rule,conclusion=f,premises=list(premises),**kw))
        self.fs[sid]=f
        hs=set().union(*(self.hs[p] for p in premises))
        if rule=='assume': hs={kw['hypothesis']}
        if rule=='imp_i': hs.discard(kw['discharge'])
        if rule=='ex_e': hs=self.hs[premises[0]] | (self.hs[premises[1]]-{kw['discharge']})
        self.hs[sid]=hs
        return sid
    def assume(self,name,f):
        self.hyp[name]=f; return self.add('assume',f,hypothesis=name)
    def h(self,spec,*terms):
        p=self.add('h_axiom',K.axiom(spec,self.sig),instance=spec)
        return self.inst(p,*terms)
    def inst(self,p,*terms):
        for t in terms:
            f=self.fs[p]
            p=self.add('all_e',K.fsub(f[2],f[1],t),[p],term=t)
        return p
    def theory(self,aid,*terms):
        f=self.axioms[aid]
        return self.inst(self.add('theory',f,axiom=aid,witness=K.digest(f)),*terms)
    def refl(self,t): return self.add('refl',K.Eq(t,t))
    def sym(self,p):
        a,b=self.fs[p][1:]; z=K.V('replace',K.term_type(a,self.sig))
        return self.add('eq_e',K.Eq(b,a),[p,self.refl(a)],variable=z,context=K.Eq(z,a))
    def trans(self,p,q):
        a,b=self.fs[p][1:]; bb,c=self.fs[q][1:]; assert b==bb
        z=K.V('replace',K.term_type(b,self.sig))
        return self.add('eq_e',K.Eq(a,c),[q,p],variable=z,context=K.Eq(a,z))
    def beta(self,term,*params):
        return self.h({'schema':'abstraction','term':term},*params)
    def to_object_eq(self,p,left,right):
        obj=K.App(K.App(K.L('eq',K.infer(K.source(left,self.sig),self.sig)),left),right)
        a,b=self.fs[p][1:]
        eq=self.h({'schema':'equality','type':K.term_type(a,self.sig)},a,b)
        direction=self.add('and_r',self.fs[eq][2],[eq])
        out=self.add('imp_e',K.B(K.lift(obj,self.sig)),[direction,p])
        return out,obj
    def from_object_eq(self,p,ty,a,b):
        eq=self.h({'schema':'equality','type':ty},a,b)
        direction=self.add('and_l',self.fs[eq][1],[eq])
        return self.add('imp_e',K.Eq(a,b),[direction,p])
    def bundle(self,root,obj=None):
        proof={'checker':K.VERSION,'theory_sha256':K.digest(self.t),'hypotheses':self.hyp,
               'steps':self.steps,'root':root,'conclusion':self.fs[root],
               'open_hypotheses':{h:self.hyp[h] for h in sorted(self.hs[root])}}
        if obj is not None: proof['object_conclusion']=obj
        return {'format':K.VERSION,'theory':self.t,'proofs':{self.pid:proof},'target':self.pid}

def group():
    ty='G'; mul=K.C('mul'); e=K.C('unit'); x,g,h=K.V('x',ty),K.V('g',ty),K.V('h',ty)
    times=lambda a,b:K.App(K.App(mul,a),b)
    unit=K.All(x,K.Eq(times(x,e),x))
    t=theory('right-unital-magma',['o',ty],{'mul':K.arr(ty,K.arr(ty,ty)),'unit':ty},[{'id':'right_identity','formula':unit}])
    b=Builder(t,'cayley-evaluation-injective')
    lg=['lambda','x',ty,times(g,x)]; lh=['lambda','x',ty,times(h,x)]
    flg,flh=K.lift(lg,b.sig),K.lift(lh,b.sig)
    eqobj=K.App(K.App(K.L('eq',K.arr(ty,ty)),lg),lh)
    p=b.assume('equal_left_translations',K.B(K.lift(eqobj,b.sig)))
    p=b.from_object_eq(p,K.arr(ty,ty),flg,flh)
    z=K.V('function',K.arr(ty,ty))
    at_e=b.add('eq_e',K.Eq(K.App(flg,e),K.App(flh,e)),[p,b.refl(K.App(flg,e))],variable=z,context=K.Eq(K.App(flg,e),K.App(z,e)))
    bg=b.beta(lg,g,e); bh=b.beta(lh,h,e)
    result=b.trans(b.trans(b.sym(bg),at_e),bh)
    result=b.trans(b.trans(b.sym(b.theory('right_identity',g)),result),b.theory('right_identity',h))
    result,obj=b.to_object_eq(result,g,h)
    return b.bundle(result,obj)

def constant_sequence():
    t=theory('constant-sequence-evaluation',['o','N','R'])
    b=Builder(t,'constant-sequence-value')
    a,n=K.V('a','R'),K.V('n','N')
    lam=['lambda','k','N',a]
    p=b.beta(lam,a,n)
    p,obj=b.to_object_eq(p,K.App(lam,n),a)
    return b.bundle(p,obj)

def chart_composition():
    t=theory('chart-transition-algebra',['o','X','Y'],{'chart':K.arr('X','Y'),'inverse':K.arr('Y','X')})
    b=Builder(t,'chart-self-transition')
    y=K.V('y','Y'); phi,inv=K.C('chart'),K.C('inverse')
    lhs=K.App(phi,K.App(inv,y))
    p=b.assume('right_inverse_at_y',K.Eq(lhs,y))
    transition=['lambda','u','Y',K.App(phi,K.App(inv,K.V('u','Y')))]
    beta=b.beta(transition,y)
    p=b.trans(beta,p); p,obj=b.to_object_eq(p,K.App(transition,y),y)
    return b.bundle(p,obj)

def tensor_rank_one():
    # The linearity of this map is a substantive local step in Phi's construction.
    F,V='F','Vec'; scalar=K.C('scalar'); plus=K.C('vadd'); add=K.C('fadd')
    x,y,v=K.V('x',V),K.V('y',V),K.V('v',V); alpha=K.V('alpha',K.arr(V,F))
    a,c=K.V('a',F),K.V('c',F)
    apps=lambda f,*ts: __import__('functools').reduce(K.App,ts,f)
    distrib=K.close([a,c,v],K.Eq(apps(scalar,apps(add,a,c),v),apps(plus,apps(scalar,a,v),apps(scalar,c,v))))
    t=theory('module-additive-fragment',['o',F,V],{'scalar':K.arr(F,K.arr(V,V)),'vadd':K.arr(V,K.arr(V,V)),'fadd':K.arr(F,K.arr(F,F))},[{'id':'scalar_distributes','formula':distrib}])
    b=Builder(t,'rank-one-additivity')
    xy=apps(plus,x,y); ax=K.App(alpha,x); ay=K.App(alpha,y)
    linear=K.All(K.V('s',V),K.All(K.V('t',V),K.Eq(K.App(alpha,apps(plus,K.V('s',V),K.V('t',V))),apps(add,K.App(alpha,K.V('s',V)),K.App(alpha,K.V('t',V))))))
    p=b.assume('alpha_additive',linear); p=b.inst(p,x,y)
    z=K.V('replace_scalar',F)
    left=apps(scalar,K.App(alpha,xy),v)
    eq=b.add('eq_e',K.Eq(left,apps(scalar,apps(add,ax,ay),v)),[p,b.refl(left)],variable=z,context=K.Eq(left,apps(scalar,z,v)))
    eq=b.trans(eq,b.theory('scalar_distributes',ax,ay,v))
    w=K.V('w',V); rank=['lambda','w',V,apps(scalar,K.App(alpha,w),v)]
    # Free parameters are sorted by their complete canonical variable codes.
    beta=lambda point:b.beta(rank,alpha,v,point)
    eq=b.trans(beta(xy),eq)
    rx,ry=b.sym(beta(x)),b.sym(beta(y))
    z=K.V('replace_vector',V)
    right=b.fs[eq][2]
    eq=b.add('eq_e',K.Eq(b.fs[eq][1],apps(plus,K.App(K.lift(rank,b.sig),x),apps(scalar,ay,v))),[rx,eq],variable=z,context=K.Eq(b.fs[eq][1],apps(plus,z,apps(scalar,ay,v))))
    eq=b.add('eq_e',K.Eq(b.fs[eq][1],apps(plus,K.App(K.lift(rank,b.sig),x),K.App(K.lift(rank,b.sig),y))),[ry,eq],variable=z,context=K.Eq(b.fs[eq][1],apps(plus,K.App(K.lift(rank,b.sig),x),z)))
    eq,obj=b.to_object_eq(eq,K.App(rank,xy),apps(plus,K.App(rank,x),K.App(rank,y)))
    return b.bundle(eq,obj)

def quantifiers():
    t=theory('quantifier-demo'); b=Builder(t,'quantifiers')
    x,y=K.V('x','i'),K.V('y','i')
    p=b.refl(y)
    p=b.add('all_i',K.All(x,K.Eq(x,x)),[p],variable=y)
    p=b.inst(p,y)
    p=b.add('ex_i',K.Ex(x,K.Eq(x,x)),[p],term=y)
    b.assume('witness',K.Eq(y,y))
    q=b.refl(K.L('true'))
    p=b.add('ex_e',b.fs[q],[p,q],variable=y,discharge='witness')
    return b.bundle(p)

def nested():
    t=theory('nested-lambda'); b=Builder(t,'nested-lambda')
    x,y,z=K.V('x','i'),K.V('y','i'),K.V('z','i')
    lam=['lambda','x','i',['lambda','y','i',x]]
    p=b.beta(lam,z)
    return b.bundle(p)

def identity_implication():
    t=theory('implication-demo'); b=Builder(t,'identity-implication')
    f=K.Eq(K.V('x','i'),K.V('y','i')); p=b.assume('h',f)
    p=b.add('imp_i',K.Imp(f,f),[p],discharge='h')
    return b.bundle(p)

def term_definition():
    t=theory('old-term-definition',definitions=[{'kind':'term','name':'identity','term':['lambda','x','i',K.V('x','i')]}])
    b=Builder(t,'identity-definition'); p=b.add('definition',b.defs['identity'],name='identity')
    return b.bundle(p)

def examples():
    return { 'group':group(), 'limit':constant_sequence(), 'manifold':chart_composition(),
             'tensor':tensor_rank_one(), 'quantifiers':quantifiers(), 'nested':nested(),
             'implication':identity_implication(), 'definition':term_definition() }

def write():
    target=HERE/'certificates'; target.mkdir(exist_ok=True)
    for name,bundle in examples().items():
        K.check(bundle)
        (target/(name+'.json')).write_text(json.dumps(bundle,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'passed','generated':len(examples())}))

if __name__=='__main__': write()
