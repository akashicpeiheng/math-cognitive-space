````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:grad:why",
  "version": "1",
  "title": "梯度：方向很多，为什么还能用一个向量概括",
  "goals": [
    "用自己的话说出梯度要解决的问题：把各方向的方向导数打包成一个向量",
    "区分方向导数这条规则与把它表示成向量所需的额外结构"
  ],
  "objects": [
    {
      "id": "obj:grad:definition",
      "version": "1",
      "anchor": "definition",
      "formalHash": "sha256:ffbf6628d58081a7db9fb0f3976113acac50d696049b443806e15b53c2893870"
    },
    {
      "id": "obj:grad:characterization",
      "version": "1",
      "anchor": "claim",
      "formalHash": "sha256:6e0123698bb66226b118e3b578e93ff2553b9b8076fb81312b818857dea3a9ef"
    }
  ],
  "prerequisites": []
}
````

# 梯度：方向很多，为什么还能用一个向量概括

#微积分 #微分 #梯度

<!-- mcs-section:overview -->
## 对象与任务

一句话：梯度把“每个方向上的变化率”打包成一个向量，使方向导数变成一次内积。它帮助我们把逐方向检查换成一次线性读取。

本篇的任务是建立这个打包问题的动机与边界：先承认方向导数本身已经定义，再问“是否存在一个向量，使所有方向导数都能由它与方向的内积读出”。精确的定义与证明放在后续节点；本篇不把“最速上升”当作定义。

<!-- mcs-section:background -->
## 背景与约定

固定实向量空间 $E$，并在标准模型里把它读作内积空间：给定二元函数 $\langle\cdot,\cdot\rangle:E\times E\to\mathbb R$，假设它对称、双线性、正定。$f:E\to\mathbb R$ 在点 $x$ 处可微。记
$$
(\operatorname{deriv} f\,x)(v)=D_v f(x)
$$
为 $f$ 在 $x$ 处沿 $v$ 的方向导数。注意 $\operatorname{deriv} f\,x$ 是一条规则 $E\to\mathbb R$，不是向量；它还没有用到内积。

本片段的形式接口只登记 $\operatorname{inner}$ 的类型，不登记上述公理，也不登记 Riesz 定理。因此下文凡用到“内积”“表示存在”的地方，都是标准模型中的约定或明确假设；末尾的表格逐项标注。$E$ 的具体构造、$\operatorname{deriv}$ 的差商定义与 Riesz 定理的证明都不在本篇内。

## 直觉

把许多次测量压成一个向量。站在山坡上，问“朝哪个方向走，坡度是多少”。每个方向给出一个读数；如果存在一个箭头 $g$，使任意方向的读数都等于 $g$ 在该方向上的投影，那么 $g$ 就把整张“方向—坡度”表压成了一个对象。在标准内积、$g\ne0$ 时：

- $g$ 指向坡度增加最快的方向；
- $|g|$ 是最大的坡度；
- 与 $g$ 垂直的方向坡度为零。

这些是使用内积后的几何后果，不是定义。没有内积，或者方向导数不来自一个线性规则，就未必有这样的 $g$。

<!-- mcs-section:form -->
## 精确内容

两个层次。第一层是定义：给定表示映射 $\operatorname{rep}$，把梯度定义为
$$
\operatorname{grad} f(x):=\operatorname{rep}\bigl(\operatorname{deriv} f\,x\bigr).
$$
它把“规则”换回“向量”；换法由内积决定。

第二层是表征。若 $\operatorname{rep}$ 满足
$$
(\operatorname{deriv} f\,x)(v)=\langle \operatorname{rep}(\operatorname{deriv} f\,x),v\rangle
\quad\text{对所有 }v,
$$
则展开定义立即得到
$$
(\operatorname{deriv} f\,x)(v)=\langle \operatorname{grad} f(x),v\rangle .
$$
这就是“梯度对方向导数的表征”。量词顺序是：对任意 $f$、任意 $x$、任意 $v$。对象引用把完整形式、假设与证据标签固定下来，本篇不重新定义它们。

## 为什么不直接说“梯度是偏导数向量”

在 $\mathbb R^n$ 配标准内积时，两者一致；这是坐标模型里的定理，不是定义本身。换一个内积，同一个方向导数规则会得到不同的表示向量；在流形上，梯度还依赖度量的选择。把“偏导数排成一列”当作定义，会把一个依赖度量的对象误认成不依赖度量的对象。坐标计算与度量例子分别在后续节点展开。

<!-- mcs-section:evidence -->
## 依据与边界

| 断言 | 标签 | 核对入口与边界 |
| --- | --- | --- |
| 方向导数是 $E\to\mathbb R$ 的规则 | DEF | 对象 `deriv` 的类型；解析定义未登记 |
| 梯度由 $\operatorname{rep}\circ\operatorname{deriv}$ 定义 | DEF | 对象 `obj:grad:definition` 的 `definition` 声明 |
| 表征式在假设下成立 | PROOF | 对象 `obj:grad:characterization`；证明是展开定义 |
| 表示的存在性与唯一性 | NOT-CLAIMED（作为假设） | 两条假设；Riesz 定理不在本片段内 |
| 内积公理（对称、双线性、正定） | NOT-CLAIMED（标准模型假设） | 本篇按标准模型使用；形式接口只有 `inner` 的类型 |
| 最速上升与等值线法向 | ILLUSTRATION（标准模型） | 后续几何节点；依赖内积公理与链式法则 |

NOT-CLAIMED：本篇不证明 Riesz 表示定理，不声称任意 $E$ 上都有梯度，也不把“最速上升”当作已形式化的结论。

## 回看

- 如果 $E=\mathbb R$，梯度的方向和大小分别是什么？请用表征式验证。
- 如果只改变内积、不改变 $f$ 与 $x$，方向导数 $D_v f(x)$ 会变吗？梯度会变吗？
- 如果只在一个方向上给出读数，而没有“对所有 $v$ 成立”，还能确定一个向量吗？

## 参考文献

- MCS 专稿第 02、04、09、10 章（语言、对象与阅读节点、尺度、模板）。
- 候选片段说明 `mcs-content/candidates/gradient/README.md`。
- 外部教材定位待补；本篇不写未核对的页码或定理号。
