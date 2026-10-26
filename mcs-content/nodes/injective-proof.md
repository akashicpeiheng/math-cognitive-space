````mcs-node
{
  "schema": "mcs-node/1",
  "version": "1",
  "id": "learn:group:injective-proof",
  "title": "左乘单射性的证明与形式边界",
  "goals": [
    "重建不增加额外假设的证明",
    "解释固定 HOL 类型与 Lean 类型参数的对应范围"
  ],
  "objects": [
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

# 左乘单射性的证明与形式边界

#群论 #形式验证

## 任务与约定

本篇把“在单位处取值”写成可逐步检查的证明。必备背景是函数相等和右单位律。固定任意类型 $G$、二元运算 $\operatorname{mul}$、右单位 $e$，令 $L_g(x)=\operatorname{mul}(g,x)$。

精确目标是：右单位律下，任意 $g,h$ 满足 $L_g=L_h$ 时有 $g=h$。对象引用固定了完整条件，阅读节点自身不重新定义它。

## 先看证明骨架

在共同输入 $e$ 处使用函数相等，再分别消去右单位：

$$g=\operatorname{mul}(g,e)=L_g(e)=L_h(e)=\operatorname{mul}(h,e)=h.$$

PROOF：第一与最后一个等式来自右单位律；第二与倒数第二个来自定义；中间来自函数相等。证明没有使用结合律、左单位或逆元。

## 形式化到底覆盖了什么

HOL 对象语言固定基本类型 $G$，并把运算与 $e$ 作为参数。Lean 目标还量化类型 $G:\mathrm{Type} u$。对应关系是每个固定签名的实例与参数普遍闭包；不能声称 HOL 公式内部也量化了类型。

机器检查认证固定的 Lean 命题和其允许的公理依赖；自然语言、HOL 表达与 Lean 命题之间的对应须另行审阅。NOT-CLAIMED：一般 HOL—Lean 翻译正确性、完整 Cayley 定理与教学效果。

## 检查自己的理解

如果只知道 $L_g(x_0)=L_h(x_0)$，而 $x_0$ 不是恢复点，能否沿用证明？如果删除右单位律，等式链从哪一步断开？

思想：**证明责任随条件固定**。方法：逐个标出等式的来源，再检查是否偷偷加入额外假设。

## 参考

- MCS 专稿群案例 §2.1–2.2。
- MCS Lean 工程 Expected.rightUnitInjective、Proofs/Group 与 Verified；对应审阅保持 pending。
