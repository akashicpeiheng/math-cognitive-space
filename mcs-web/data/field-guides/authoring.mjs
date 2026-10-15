export const p=(zh,en)=>({zh,en});
export const core=(id,zh,en,bridge=false)=>({id,reason:p(zh,en),bridge});
export const question=(title,explanation,nodes)=>({title,explanation,nodes});
export const guide=spec=>({...spec,questions:spec.questions.map((q,i)=>({id:'q'+(i+1),...q})),status:'ILLUSTRATION'});
