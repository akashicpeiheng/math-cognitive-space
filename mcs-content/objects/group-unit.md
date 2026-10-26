````mcs-object
{
  "schema": "mcs-object/1",
  "id": "obj:group:unit",
  "version": "1",
  "title": "右单位结构中的左乘接口",
  "language": "mcs-formal/1",
  "grammar": "mcs-object-grammar/1",
  "scale": "unit",
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
      "id": "obj:group:mul",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:4ad66b0bd46906a27c3e654410b33c835d4096493dd371103b65f3fd9dfa0309"
    },
    {
      "id": "obj:group:e",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:4936e839ded82235b4f2aabc967b43ff428c53c5725067a883c095a19a724ba7"
    },
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
    },
    {
      "id": "obj:group:injective",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:2d24c91e5ddcf4023449e20726f3c3ed115d9b0d2b3228410288df4a754c3f6d"
    }
  ],
  "imports": [],
  "exports": [
    {
      "name": "rightUnit",
      "ref": {
        "id": "obj:group:right-unit",
        "version": "1",
        "anchor": "condition",
        "formalHash": "sha256:8a61a2944c73ab97b57a85b3e177feaf23a52f6e2d3317d700a5ece1b015a80e"
      },
      "type": "o"
    },
    {
      "name": "leftMul",
      "ref": {
        "id": "obj:group:left-mul",
        "version": "1",
        "anchor": "definition",
        "formalHash": "sha256:0ede3c1ede5f8dfd3ba1ebfb9fc0742829f5dfe1cdddecdfcf5b55ee6b15adf4"
      },
      "type": "G -> G -> G"
    },
    {
      "name": "injective",
      "ref": {
        "id": "obj:group:injective",
        "version": "1",
        "anchor": "claim",
        "formalHash": "sha256:0aee9ebfbd3f48106938ffe641aac7e4c7bf99d382cdc7d0095cc4d073e38293"
      },
      "type": "o"
    }
  ],
  "links": [],
  "lean": []
}
````

# 右单位结构中的左乘接口

直觉：把有关符号、条件、定义和结论封装为一个可引用的接口。成员类型与导出可机械检查；成员归属不意味着已证明全部声明。

对象正文是说明；机器接口中的形式负载为修订依据。

## 证据与边界

DEF：结构与接口约定。FINITE：运行文档检查可核对类型、构造与引用；结构合法不推出数学命题为真。

## 参考

- MCS 专稿第 02、04、09 章。
- MCS Lean 工程的 Expected.rightUnitInjective 及对应说明（涉及单射性时）。
