````mcs-node
{
  "schema": "mcs-node/1",
  "version": "1",
  "id": "learn:group:injective-intuition",
  "title": "为什么在单位处看一眼就够了",
  "goals": [
    "理解右单位如何让左乘映射保留参数信息",
    "区分左乘映射单射与每个左乘映射自身是双射"
  ],
  "objects": [
    {
      "id": "obj:group:right-unit",
      "version": "1",
      "anchor": "condition",
      "formalHash": "sha256:8a61a2944c73ab97b57a85b3e177feaf23a52f6e2d3317d700a5ece1b015a80e"
    },
    {
      "id": "obj:group:injective",
      "version": "1",
      "anchor": "claim",
      "formalHash": "sha256:0aee9ebfbd3f48106938ffe641aac7e4c7bf99d382cdc7d0095cc4d073e38293"
    }
  ],
  "prerequisites": []
}
````

# 为什么在单位处看一眼就够了

#群论 #单射

## 问题先出现

把元素 $g$ 换成函数 $L_g:x\mapsto gx$，会不会丢失信息？如果两个元素产生完全相同的函数，能否找回原来的元素？这是本篇要完成的任务。

必备背景只有函数相等与右单位律。先把二元运算记为 $\operatorname{mul}$，取 $e$ 满足每个 $x$ 都有 $\operatorname{mul}(x,e)=x$；这里没有假设结合律、逆元或交换律。

## 找一个能读回参数的位置

直觉是让输入尽可能不干扰左边的参数。右单位恰好做到这一点：$L_g(e)=g$。因此，只要知道函数 $L_g$，在 $e$ 处求值就能恢复 $g$。

精确命题：对固定类型 $G$、运算 $\operatorname{mul}:G\to G\to G$ 和右单位 $e$，若 $L_g=L_h$，则 $g=h$。其权威形式声明由本节点的对象引用固定。

PROOF：函数相等给出 $L_g(e)=L_h(e)$，两端用右单位律化简，即得 $g=h$。

## 条件调查与误解

删去右单位律，可以在有两个元素的集合上把所有乘积定义为同一个元素。所有左乘函数相同，参数却未必相同，单射性失败。其余前提——二元运算存在、两函数相等——仍然满足。

这里证明的是 $g\mapsto L_g$ 单射。它没有证明每个 $L_g$ 都是双射，也没有证明完整 Cayley 定理。混淆往往来自两处都出现“映射”这个词。

## 回看

为什么只保留右单位就够用？没有左单位或结合律时，上面的等式链哪一步仍然成立？

思想：**在恢复点读取参数**。方法：本篇证明在 $e$ 处评价函数等式；下次遇到函数表示时，寻找能够恢复原参数的输入。

## 参考与证据边界

- MCS 专稿群案例的左乘单射步骤。
- MCS Lean 工程：Expected.rightUnitInjective。机器重放状态与文字对应审阅分开显示；本篇不宣称已完成独立人工审阅。
