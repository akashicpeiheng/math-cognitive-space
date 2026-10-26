````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:group:topic",
  "version": "1",
  "title": "代数结构的映射表示：有限片段",
  "language": "mcs-formal/1",
  "grammar": "mcs-object-grammar/1",
  "scale": "topic",
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
  "declarations": [],
  "references": [],
  "members": [
    {
      "id": "obj:group:unit",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:afe289eafcb2bdf775e1f88ea5c53bb3372a4c780bb758686933bf5d996496b8"
    }
  ],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 代数结构的映射表示：有限片段

直觉：用显式成员表组织可连接的形式单元。这里只含一个已经登记的片段，不声称构成完整的表示理论。接口关系为空；未虚构跨模块定理。

对象正文是说明；机器接口中的形式负载为修订依据。

## 证据与边界

DEF：结构与接口约定。FINITE：运行文档检查可核对类型、构造与引用；结构合法不推出数学命题为真。

## 参考

- MCS 专稿第 02、04、09 章。
- MCS Lean 工程的 Expected.rightUnitInjective 及对应说明（涉及单射性时）。
