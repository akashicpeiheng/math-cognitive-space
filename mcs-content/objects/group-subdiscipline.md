````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:group:subdiscipline",
  "version": "1",
  "title": "群论形式组织：有限片段",
  "language": "mcs-formal/1",
  "grammar": "mcs-object-grammar/1",
  "scale": "subdiscipline",
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
      "id": "obj:group:topic",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:d6ed44e7e8d9ab397dd2c573d4c45b33f8f7da5f6dd9837bf411cc3e6c3d621d"
    }
  ],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 群论形式组织：有限片段

直觉：在更高层组织已经登记的话题，使引用边界可查。这里只是群论中的一个有限片段，不代表群论全貌；该名称不规定学习顺序或难度。

对象正文是说明；机器接口中的形式负载为修订依据。

## 证据与边界

DEF：结构与接口约定。FINITE：运行文档检查可核对类型、构造与引用；结构合法不推出数学命题为真。

## 参考

- MCS 专稿第 02、04、09 章。
- MCS Lean 工程的 Expected.rightUnitInjective 及对应说明（涉及单射性时）。
