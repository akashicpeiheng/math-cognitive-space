````mcs-node
{
  "schema": "mcs-node/1",
  "version": "1",
  "id": "learn:group:left-mul-overview",
  "title": "从二元运算到左乘表示",
  "goals": [
    "联结运算、条件、定义与单射命题",
    "区分形式单元与一次学习的内容组织"
  ],
  "objects": [
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
      "id": "obj:group:left-mul",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:0ede3c1ede5f8dfd3ba1ebfb9fc0742829f5dfe1cdddecdfcf5b55ee6b15adf4"
    },
    {
      "id": "obj:group:injective",
      "version": "1",
      "anchor": "claim",
      "formalHash": "sha256:0aee9ebfbd3f48106938ffe641aac7e4c7bf99d382cdc7d0095cc4d073e38293"
    },
    {
      "id": "obj:group:unit",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:afe289eafcb2bdf775e1f88ea5c53bb3372a4c780bb758686933bf5d996496b8"
    }
  ],
  "prerequisites": []
}
````

# 从二元运算到左乘表示

#群论 #表示

## 为什么把元素改写成函数

研究一个运算时，可以固定一个输入，观察它怎样作用于另一个输入。这样把“元素是什么”转成“元素做了什么”。本篇承诺连接运算、左乘定义与信息是否丢失这三个问题。

必备背景是函数、函数相等与二元运算；群公理只是拓展背景。

## 从胚子到精确对象

DEF：先有 $\operatorname{mul}:G\to G\to G$；固定 $g$ 得 $L_g(x)=\operatorname{mul}(g,x)$；再把 $g\mapsto L_g$ 看作表示。若存在共同右单位 $e$，则 $L_g(e)=g$，所以不同元素不会产生同一个左乘函数。

PROOF：假设 $L_g=L_h$，在 $e$ 处取值即得 $g=h$。形式对象分别保存运算、定义、右单位条件与命题；本篇把它们组织成一次阅读，也引用封装它们的形式单元。

## 边界与下一步

单射性只回答信息能否恢复。若要得到群到置换群的同态，还需要检查每个左乘函数的双射性，以及复合怎样对应乘法。这些义务不由本篇的单射结论代替。

ILLUSTRATION：同一个命题可以有直观讲解与证明详解，两篇节点不因此成为两个数学命题；本篇引用多个对象，也不会因此自动成为更高数学尺度。

## 回看

尝试写出只有右单位、却不需要群公理的例子。分别指出哪些对象属于 M，哪些讲解属于 L，自己的理解记录又应放在哪里。

思想：**对象独立，讲解可重组**。方法：本篇通过固定输入构造函数，再在恢复点检验是否丢失信息。

## 参考

- MCS 专稿群案例与第 09 章形式尺度。
- MCS Lean 工程的右单位单射目标；本篇不把有限试点称为完整群论。
