````mcs-node
{
  "schema": "mcs-node/1",
  "id": "learn:grad:compute",
  "version": "1",
  "title": "坐标里的梯度：偏导数向量与两个例子",
  "goals": [
    "在标准内积下把梯度写成偏导数向量并完成两个可复算的例子",
    "说明坐标公式依赖的条件，并识别“方向导数都存在但不可微”的反例"
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
    },
    {
      "id": "obj:grad:representation-iff",
      "version": "1",
      "anchor": "claim",
      "formalHash": "sha256:d37b6435d70c5d64e24a189816a9f92d6823ba0ed451999555175b0fd52afe7e"
    },
    {
      "id": "obj:grad:unit",
      "version": "1",
      "anchor": "$",
      "formalHash": "sha256:e8c3ad57eb2a2b9b971703883adfb1909a630f03b6be96d822baac420497bf04"
    }
  ],
  "prerequisites": [
    {
      "id": "learn:grad:definition",
      "version": "1"
    }
  ]
}
````

# 坐标里的梯度：偏导数向量与两个例子

#微积分 #微分 #梯度 #计算

<!-- mcs-section:overview -->
## 对象与任务

本篇把抽象定义落到标准坐标模型：在 $\mathbb R^n$ 配标准内积时，梯度就是偏导数排成的向量。任务是完成两个可复算的例子，并说明这个公式依赖哪些条件；不把“偏导数存在”误当成“梯度存在”。

<!-- mcs-section:background -->
## 背景与约定

取 $E=\mathbb R^n$，$\langle u,v\rangle=\sum_i u_i v_i$，$f$ 在 $x$ 的某邻域内有定义、在 $x$ 处可微。记 $\partial_i f(x)$ 为第 $i$ 个偏导数。方向导数与偏导数的关系是标准微分学中的坐标展开：
$$
(\operatorname{deriv} f\,x)(v)=\sum_{i=1}^n \partial_i f(x)\,v_i .
$$
标准内积的对称、双线性与正定性是本篇按标准模型使用的性质；M 只登记 `inner` 的类型。本片段也没有坐标与有限和的形式构造，因此这条展开在 M 中不出现；它是本篇用以计算的标准结果。下文的例子用差商直接核对，不依赖未登记的定理。

<!-- mcs-section:form -->
## 精确内容

从表征式到偏导数向量。若 $g=(\partial_1 f(x),\dots,\partial_n f(x))$，则
$$
\langle g,v\rangle=\sum_i \partial_i f(x)v_i=(\operatorname{deriv} f\,x)(v)
$$
对所有 $v$ 成立。由充要命题，$g=\operatorname{grad} f(x)$。这一步的逻辑是：先承认方向导数的坐标展开，再用“表征 + 唯一性”识别梯度；不是把偏导数向量当作定义。

## 两个例子

### 例 1：$f(x,y)=x^2+y^2$ 在 $(1,2)$

偏导数 $\partial_x f=2x$，$\partial_y f=2y$，故
$$
\operatorname{grad} f(1,2)=(2,4).
$$
取 $v=(3,4)$。直接算：
$$
f(1+3t,2+4t)=(1+3t)^2+(2+4t)^2=5+22t+25t^2,
$$
所以方向导数为 $22$；而 $\langle(2,4),(3,4)\rangle=6+16=22$。两边一致。

### 例 2：$f(x,y)=x^2+3xy+y^2$ 在 $(1,2)$

偏导数 $\partial_x f=2x+3y$，$\partial_y f=3x+2y$，在 $(1,2)$ 得
$$
\operatorname{grad} f(1,2)=(8,7).
$$
沿 $v=(3,4)$：
$$
f(1+3t,2+4t)=11+52t+61t^2,
$$
方向导数为 $52$；而 $\langle(8,7),(3,4)\rangle=24+28=52$。一致。

两个例子都是 PROOF（初等展开与求值），不是对一般坐标公式的证明；一般公式的证明需要坐标展开与链式法则，属于标准微分学。

## 边界：方向导数都存在，也可能没有梯度

在 $\mathbb R^2$ 上令
$$
f(x,y)=\begin{cases}\dfrac{x^2y}{x^2+y^2},&(x,y)\ne(0,0),\\[2mm]0,&(x,y)=(0,0).\end{cases}
$$
沿 $v=(a,b)$ 计算：
$$
\frac{f(ta,tb)-f(0,0)}{t}=\frac{a^2b}{a^2+b^2}\quad(t\ne0),
$$
极限存在，记为 $D_v f(0,0)$。但映射 $(a,b)\mapsto a^2b/(a^2+b^2)$ 不是线性的：$v=(1,1)$ 给 $1/2$，而 $v=(1,0)$ 与 $v=(0,1)$ 都给 $0$，可加性失败。因此不存在线性泛函 $\operatorname{deriv} f\,0$，梯度也不存在。PROOF：初等计算与线性性检验。

这个例子说明：方向导数逐方向存在，不足以推出“有一个向量代表全部方向导数”；表征假设不是自动的。

## 常见误区

- “偏导数存在就有梯度。”上面的例子给出反例；需要的是可微（存在线性导数泛函），而不只是逐方向或逐坐标的差商存在。
- “梯度就是 $(\partial_1 f,\dots,\partial_n f)$。”这只在标准内积与标准坐标下成立；换内积或换坐标，分量会变。下一节点给出度量改变的例子。

<!-- mcs-section:evidence -->
## 依据与边界

| 断言 | 标签 | 核对入口与边界 |
| --- | --- | --- |
| 标准内积下 $\operatorname{grad} f=(\partial_i f)$ | PROOF（条件：标准内积与坐标展开） | 本篇的代入计算；坐标展开本身未在 M 中形式化 |
| 两个例子的梯度与方向导数 | PROOF | 上面的差商展开 |
| 方向导数都存在但不可微的反例 | PROOF | 初等计算 |
| 一般 $n$ 维坐标公式 | REF（标准微分学；本篇不证） | 需要标准微分学的坐标展开 |
| 标准内积公理（对称、双线性、正定） | NOT-CLAIMED（标准模型假设） | 本篇按标准模型使用；形式接口只有 `inner` 的类型 |

## 回看

- 对 $f(x,y)=xy$ 在 $(2,3)$ 重复例 1 的步骤：梯度是什么？沿 $(1,-1)$ 的方向导数是多少？
- 如果把内积改成 $\langle u,v\rangle_A=u^{\mathsf T}Av$，偏导数向量还是梯度吗？
- 上面的反例中，哪一个方向导数的读数破坏了线性性？请给出两个方向与它们的和。

## 参考文献

- MCS 专稿第 02、04、10 章。
- 候选片段 `README.md` 与表征、充要对象。
- 标准多元微积分教材的坐标展开；具体版次与页码待补，本篇不写未核对定位。
