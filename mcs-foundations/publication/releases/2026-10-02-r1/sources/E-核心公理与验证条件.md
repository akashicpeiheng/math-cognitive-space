# E　核心公理的分型汇总与模型义务

本附录把各章分散的接口汇总为一套有类型的理论模式，便于后续实现或证明助理编码。它不另引入一个与第 02 章竞争的逻辑。核心仍是 ZFC 中明确指定的记录结构；其可内部化部分用所选 HOL 表达，语法代码及检查器的意义按指定解释固定。

## E.1　签名和构造层

互异基本类型包括 Node、Kind、Code、TheoryCode、ProofCode、PremFam、Action、RouteCode、ViewCode、Evt、Template、Aggregate，以及角色标号域 Role。它们是引用/代码域。某类合法记录为空时，仍可使用非空代码域加 Valid 谓词，避免与第 03 章各排序非空的约定冲突。

核心非逻辑常元至少有：

\[
\begin{aligned}
&kind:Node\to Kind,\quad payload:Node\to Code,\quad theory:Node\to TheoryCode,\\
&WF:Node\to o,\quad Registered,External,Concept:Node\to o,\\
&ValidA:Action\to o,\quad In,Out:Action\to Node\to o,\\
&Check:TheoryCode\to PremFam\to Node\to ProofCode\to o,\\
&FiniteSetCode:Code\to o,\quad Ref:Code\to Node\to o.
\end{aligned}
\]

Code 和 Node 不互相默认强制转换。PremFam 解释为有限带标签命题节点列表的代码，事件/路线/视图也先检查代码，再通过有型投影得到有效数据。谓词本身是箭头型项，能够被抽象和量化；命名该谓词的 Node 是另一对象。

TypeOK、Check、WF 等符号在**合法结构类**中不是任意赋值：它们分别解释为第 02、04 章指定的有限语法关系或由该关系构成的接口。只有一个名叫 Check 的任意关系，不足以认证数学证明。将这些递归关系完全内部化需另给数码表示与表示正确性证明，不能默认有限 Python 检查已经完成这一步。

## E.2　核心公理模式

**定义 E.1（核结构条件的逻辑形式）。** 下列模式与第 04 章定义 4.2 联用，未展开的谓词按对应章节的定义解释。

| 公理/定义模式 | 含义及检查位置 |
|---|---|
| ∀n. Registered(n)⇒WF(n) | 每个登记节点具有合法类型和负载 |
| ∀n,m. Registered(n)∧Ref(payload(n),m)⇒Registered(m)∨External(m) | 负载引用有登记或显式环境来源 |
| ∀a,m. ValidA(a)∧(In(a,m)∨Out(a,m))⇒Registered(m)∨External(m) | 行动端点无悬空引用 |
| ∀a. ValidA(a)⇒FiniteIn(a)∧FiniteOut(a)∧WitnessOK(a) | 有限联合接口和模式相符的结构见证 |
| ∀P,n,p. Ded(P,n,p)⇔Check(theory(n),P,n,p) | 硬演绎的定义，背景及类型相容检查包含在 Check |
| ∀n,i. ValidSuppIndex(n,i)⇒Supp(n,i)∈ISet(K_Σ) | 支持的值域与未知标签相容 |
| ∀t. ValidTemplate(t)⇒PublicSchema(t) | 模板字段仅描述共享内容；个体填写是外部实例 |
| ∀a. ValidAggregate(a)⇒TypedMembers(a)∧Traceable(a) | 聚合具有层级类型及可展开引用 |

身份功能性由 payload、kind 的函数类型保证；版本迁移另用版本参数化引用。WF 的构造定义保证不同记录类型形成规则不冲突。FiniteIn、WitnessOK、TypedMembers 等不是自然语言标签：它们分别展开为第 06 章有限集合及对应证书、第 09 章成员类型判断。对于启发性方法，WitnessOK 只认证公共接口，不认证启发体等价于算法。

Supp 的上述值域只容纳精确已知集合和 Unknown。部分信息另存于第 05 章的 Supp^bounds，值为 L⊆U⊆K_Σ；仅 L=U 时能投影为 Known(L)。不把一个真部分区间直接塞入 ISet(K_Σ)。

不能给所有节点内容加入统一的无条件“都真”公理：Claim 节点允许未决甚至已反驳命题；相应证据状态单独记录。不同领域理论亦以 theory 标签隔离，不能把两个不相容背景的结论悄悄并成一个理论。

## E.3　路线、先修与关系量化

对有效路线代码 r，由解码得到有限事件谓词 E_r、行动标记 act_r、来源边 S_r 及背景 B_r。其有效性包括：

\[
\forall p,m\;
[E_r(p)\land In(act_r(p),m)]
\Rightarrow
[BSource_r(p,m)\lor
 \exists q(E_r(q)\land EventSource_r(p,m,q)\land Out(act_r(q),m))].
\]

来源指派是函数性选择，不能只保存“某个生产者可能存在”。S_r 的每条边来自该来源选择，且无环；源为背景时须另有 m∈B_r。目标也有指定来源。于是第 06 章得到 ≼_r 的偏序性质。

对指定非空路线族 ℛ 与目标 g：

\[
HardPre_{\mathcal R}(m,g)
\iff
\forall r\,[r\in\mathcal R\Rightarrow m\in Req_r(g)].
\]

ℛ∈𝒫(Rte_M(B,G)) 在元层解释；在 Henkin 模型内部量化某个路线集型变量时，只量化该模型实际域内的集合表示，不能把它自动扩大为元层全幂集。相同提醒适用于全概念支持族与自动生成的最小闭包。

令 Rel=Node→Node→o。关系间包含、逆及复合用真正高阶表达：

\[
Sub=\lambda R^{Rel}S^{Rel}.
  \forall x^{Node}y^{Node}(Rxy\Rightarrow Sxy),
\]
\[
Inv=\lambda R^{Rel}x^{Node}y^{Node}.Ryx,\qquad
Comp=\lambda S^{Rel}R^{Rel}x^{Node}z^{Node}.
 \exists y^{Node}(Rxy\land Syz).
\]

它们分别具有 Rel→Rel→o、Rel→Rel、Rel→Rel→Rel 的类型。可量化 F:Rel→Rel 来陈述保单调：

\[
\forall R,S:Rel.\ Sub(R,S)\Rightarrow Sub(FR,FS).
\]

因此本体研究的不只是端点之间的边，也包括关系运算、关系包含与证据变换。对于具体硬/软关系，只有各自的定义或见证支持相应公理，不能因上述通用运算存在就宣布每种关系传递。

## E.4　外部接口的相对模型类

E 的状态类型 X_E 不要求属于上述核心签名。最小接入在元层构成有兼容引用的对 (M,E)，并保留投影

\[
\pi:\operatorname{ExtMCS}\to\operatorname{CoreMCS},
\qquad \pi(M,E)=M.
\]

固定 M 后的所有外部模型、状态及派生结果处在 π 的同一纤维中。学习转移、遗忘和个体诊断只能改变纤维内的数据；公共修订 M→M' 是另一种显式操作。把 E 的模型描述编码为核心节点，并不会把其全部运行状态加入核心载体。

**命题 E.2（固定核心解释下的不可区分性）。** 两个接入对象投影为同一个档案 M 时，核心记录相同。再固定 M 的一个核心解释 A，并要求两个语义接入均以 A 为约化，则任何只使用核心签名的项或公式在相同核心赋值下解释相同。

**证明。** 档案部分由投影及只读契约直接得到。语义部分的变量赋值取相同核心对象；A 固定核心常元、应用及量词域的解释，对项和公式逐层归纳即得。若内部化扩张改变旧箭头量词域，则以同一 A 为约化的前提失败。相同理论档案可有不同模型，不能只凭档案相同就断言任意未决句子在那些模型中真值相同。∎

该非干扰性质本身不能推出**理论保守性**。一个充分判据是：核心理论的每个模型都有兼容扩张，并在指定语义中保持全部旧解释；第 07 章给出该条件下的证明。这种逐模型可扩张性比句子层的保守性更强，不能未经证明把它称为所有保守扩张的必要条件。

## E.5　派生结构及合法模型的四种检查

| 结构 | 数学定义层 | 核验义务 |
|---|---|---|
| 节点/本体 | 有类型记录、形成规则及上述核心条件 | 良构、引用、证据含义、版本及类型一致 |
| 关系及关系间运算 | 认证纤维、λ 特征函数、复合与包含 | 见证保持、量词域、方向及背景相容 |
| 局部/显示结构 | Loc、Cut、聚合伴随与部分函数复合 | 隐藏依赖、溯源、逐项 Pres，不误称初等子模型 |
| 学习计划 | 公共路线、外部约束、来源 DAG 和事件偏序 | AND/OR 选择、排程可行性、预算、不确定性、界内搜索 |

本稿的“统一”是共享有类型引用、证据与保持义务，不是把所有东西都塞进一个无差别二元图。通用网络是这些结构的关系呈现；具体软件若要自称此理论的模型，必须按声明的片段履行相应义务。
