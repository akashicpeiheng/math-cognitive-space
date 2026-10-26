````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:group:mul",
  "version": "1",
  "title": "二元运算参数",
  "language": "mcs-formal/1",
  "grammar": "mcs-object-grammar/1",
  "scale": "atom",
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
      "id": "symbol",
      "kind": "term",
      "type": "G -> G -> G",
      "source": "mul",
      "status": "DEF"
    }
  ],
  "references": [],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 二元运算参数

直觉：先允许把两个元素合成为一个元素，再调查需要哪些规律。这里仅声明类型；结合律、单位律、逆元都没有随名称获得。

对象正文是说明；机器接口中的形式负载为修订依据。

## 证据与边界

DEF：结构与接口约定。FINITE：运行文档检查可核对类型、构造与引用；结构合法不推出数学命题为真。

## 参考

- MCS 专稿第 02、04、09 章。
- MCS Lean 工程的 Expected.rightUnitInjective 及对应说明（涉及单射性时）。
