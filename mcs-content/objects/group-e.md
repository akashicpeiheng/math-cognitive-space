````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:group:e",
  "version": "1",
  "title": "右单位候选参数",
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
      "type": "G",
      "source": "e",
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

# 右单位候选参数

直觉：希望找到一个放在右侧不会改变元素的参照点。此处 e 只是元素参数；是否满足右单位律由独立条件声明判断。

对象正文是说明；机器接口中的形式负载为修订依据。

## 证据与边界

DEF：结构与接口约定。FINITE：运行文档检查可核对类型、构造与引用；结构合法不推出数学命题为真。

## 参考

- MCS 专稿第 02、04、09 章。
- MCS Lean 工程的 Expected.rightUnitInjective 及对应说明（涉及单射性时）。
