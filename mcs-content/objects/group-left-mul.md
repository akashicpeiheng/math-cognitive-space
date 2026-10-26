````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:group:left-mul",
  "version": "1",
  "title": "左乘映射",
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
      "id": "definition",
      "kind": "term",
      "type": "G -> G -> G",
      "source": "lam g:G. lam x:G. mul(g)(x)",
      "status": "DEF"
    }
  ],
  "references": [
    {
      "id": "obj:group:mul",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:4ad66b0bd46906a27c3e654410b33c835d4096493dd371103b65f3fd9dfa0309"
    }
  ],
  "members": [],
  "imports": [],
  "exports": [],
  "links": [],
  "lean": []
}
````

# 左乘映射

直觉：固定第一个输入 g，把二元运算看成一个作用在 x 上的函数。定义未使用结合律或逆元；是否双射需要另外的条件。

对象正文是说明；机器接口中的形式负载为修订依据。

## 证据与边界

DEF：结构与接口约定。FINITE：运行文档检查可核对类型、构造与引用；结构合法不推出数学命题为真。

## 参考

- MCS 专稿第 02、04、09 章。
- MCS Lean 工程的 Expected.rightUnitInjective 及对应说明（涉及单射性时）。
