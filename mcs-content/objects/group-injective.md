````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:group:injective",
  "version": "1",
  "title": "右单位律下的左乘单射性",
  "language": "mcs-formal/1",
  "grammar": "mcs-object-grammar/1",
  "scale": "molecule",
  "context": {
    "signature": "signature:right-unital/1",
    "bases": [
      "o",
      "G"
    ],
    "constants": [
      {
        "name": "mul",
        "type": "G -> G -> G",
        "background": "任意 G 上的二元运算参数，不假设结合律"
      },
      {
        "name": "e",
        "type": "G",
        "background": "G 中的元素参数；右单位律由公式显式给出"
      }
    ]
  },
  "definitions": [],
  "assumptions": [],
  "declarations": [
    {
      "id": "claim",
      "kind": "formula",
      "source": "(forall x:G. mul(x)(e) = x) -> forall g:G h:G. (lam x:G. mul(g)(x)) = (lam x:G. mul(h)(x)) -> g = h",
      "status": "PROOF"
    }
  ],
  "references": [
    {
      "id": "obj:group:right-unit",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:ad97070769c603f495413e502b62be77b211fb700f7b6d722146e715cdbfb892"
    },
    {
      "id": "obj:group:left-mul",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:52cc260852e6d43c74a497aeeeff88e07221218fd2fe6a64068498e4de234bf5"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": [
    {
      "anchor": "claim",
      "registrationId": "lean-group-injective",
      "target": "MCS.Expected.rightUnitInjective",
      "mapping": "HOL 固定任意非空基本类型 G，以 mul:G→G→G 与 e:G 为签名参数。对这些参数的普遍闭包对应 Lean 中对 mul、e 的全称量化；Lean 的 Type u 量化对应一族 HOL 签名实例，HOL 内没有类型量化。假设只有右单位律，结论保留完整函数相等。这里只登记该目标，不认证完整 Cayley 定理或一般 HOL—Lean 翻译。",
      "review": "pending"
    }
  ]
}
````

# 右单位律下的左乘单射性

直觉：在共同的右单位处读取两个函数，便能找回各自的左乘参数。概括证明是 g=mul(g,e)=mul(h,e)=h。形式负载固定前提与结论；PROOF 表示有纸笔论证与对应 Lean 材料，不代表本次读取已运行检查或完成对应审阅。

对象正文是说明；机器接口中的形式负载为修订依据。

## 证据与边界

DEF：结构与接口约定。FINITE：运行文档检查可核对类型、构造与引用；结构合法不推出数学命题为真。

## 参考

- MCS 专稿第 02、04、09 章。
- MCS Lean 工程的 Expected.rightUnitInjective 及对应说明（涉及单射性时）。
