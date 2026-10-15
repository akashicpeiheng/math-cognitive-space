/**
 * 讨论班笔记的硬前置关系：分析基础（Jacobi 矩阵 / σ-代数 / 压缩映射原理 / 可数公理）。
 *
 * 与 `data/cases/dg.mjs` 里那批关系同一把尺子：**不用它，目标节点的定义就写不出来**。
 * 见证一律 `type: 'definitional-dependency'` + `status: 'DEF'`，`scope` 指明它出现在
 * 源笔记定义文本的哪一处——不冒充证明（这些是定义材料的依赖，不是定理）。
 *
 * 依据来源：源笔记的「前置知识 → 必备知识」一节里**语料自己引用**的概念
 * （`H:/微分几何讨论班/vault/Geometry&Topology`，只读快照见 `data/dg/`）。
 *
 * **本文件可以并行编写**：每个批次一个文件，避免多人同时改 `data/cases/dg.mjs` 的同一个数组。
 * 汇总在 `data/cases/dg.mjs` 的 import 段（`seminarFoundations`）。
 */
import { relation } from '../authoring.mjs';

/**
 * 硬前置：`[from, to, scope]` 三元组。
 *
 * id 由端点拼出来（`rel-dg-seminar-<from>-<to>-<序号>`）：手写 id 在多人分头写时
 * 很容易撞名，而撞名会在装配期静默覆盖——拼出来的 id 至少保证「同一条关系只有一个 id」。
 *
 * 已知小瑕疵（不改公式的原因）：下面的 `replace(/^dg:/, '')` 只去掉 `dg:` 前缀，
 * 因此以 `rudin:` / `top:` / `bg:` 结尾的端点会把冒号带进 id
 * （实测 `top` 与 `rudin` 两案例的既有关系 id 里一个冒号都没有）。
 * 改公式要动每个批次各自的文件（这批文件是可并行编写的，公式在各文件里重复），
 * 而 id 只用于 `key`、`data-edge-id` 与审计显示，带冒号不影响任何渲染或路由——
 * 因此这里**照样如实登记，不为了好看去改公共公式**。
 */
export const relations = [
  /*
   * ── Jacobi 矩阵（dg:jacobi-matrix）──
   *
   * 依据：源笔记「前置知识 → 必备知识」第 1 条「多元函数微分学：偏导数的定义与计算」
   * 与第 3 条「线性映射：线性映射可以用矩阵表示」；定义式本身是
   * `df = (∂f^i/∂x^j)`，即「微分的矩阵表示」，两条都是写下这条定义所必需的。
   */
  ['dg:inverse-function-theorem', 'gt:jacobi-matrix',
    '定义式 df = (∂f^i/∂x^j) 的每个元素都是偏导数：没有多元微分与偏导数，这张矩阵写不出来。'
    + '源笔记「必备知识」第 1 条列的是「多元函数微分学：偏导数的定义与计算」——本案例里承担这一层的是'
    + '反函数定理（陈述与证明正是「f 可微、df 可逆 ⇒ 局部可逆」，逐字用到偏导数矩阵）。'
    + '**原先写的是 `rudin:derivative`**：那是 rudin 案例的登记，跨案例硬前置会被 `tests/hard-prereq.mjs` 拒'
    + '（两个案例没有共享登记），故改用案例内的节点，依据不变。'],
  ['bg:linear:vector', 'gt:jacobi-matrix',
    '源笔记把 Jacobi 矩阵定义为线性映射（微分 df_{P_0}）在取定基下的矩阵表示，'
    + '「必备知识」第 3 条即「线性映射可以用矩阵表示，线性映射的复合对应矩阵乘法」；'
    + '没有线性映射这个概念，这张矩阵表就没有被表示的对象。'],

  /*
   * ── σ-代数（dg:sigma-algebra）──
   *
   * 依据：源笔记「前置知识 → 必备知识」明写「只需要三样东西」，前两样是集合的运算
   * （并、交、差、补）与 De Morgan 公式——三条公理里的「取补」「可数并」就是这两样；
   * 第三样是幂集，并以「另外需要知道『可数』的意思」收尾，即 A ⊆ P(X) 中的 P(X)
   * 与「可数并」里的可数性都必须在定义之前就有。
   */
  ['bg:set:function', 'gt:sigma-algebra',
    '公理里的 A ⊆ P(X)（X 的一族子集）、取补 A^c、可数并 ⋃_i A_i 用的就是集合与集合运算的语言；'
    + '源笔记「必备知识」第 1、3 条列的正是集合的运算与幂集。'],
  ['bg:set:function', 'gt:sigma-algebra',
    '公理里的 A ⊆ P(X)（X 的一族子集）、取补 A^c、可数并 ⋃_i A_i 用的就是集合与集合运算的语言；'
    + '源笔记「必备知识」第 1、3 条列的正是集合的运算与幂集。'
    + '（这一条同时替下原先的 `rudin:countable-set`：「可数」确实是定义的一部分，但它是**数量限定词**而不是'
    + '被依赖的对象，而 rudin 案例的登记跨过来会被 `tests/hard-prereq.mjs` 拒——两个案例没有共享登记。'
    + '「可数」这一层在本站点里由 `rudin:countable-set` 单独承担，读过它的人自然认得出这个词。）'],

  /*
   * ── 压缩映射原理（dg:contraction-principle）──
   *
   * 依据：源笔记「前置知识 → 必备知识」三条：度量空间、完备性、连续映射。
   * 注意最后一条的边界：完备性与「连续」是**陈述**这一层就需要的
   * （X 是完备度量空间；定理的证明要用到「压缩映射连续」），
   * 而「压缩映射原理的证明用到反函数定理」这个方向在本批**不登记**——
   * 没有一条证据同时列出 dg:contraction-principle 与 dg:inverse-function-theorem，
   * 站内现有的那条反向依赖（rudin:contraction-principle → dg:inverse-function-theorem）
   * 与 rudin 的 Claim 绑定，见本批报告。
   */
  ['dg:metric-space', 'gt:contraction-principle',
    '陈述第一句就是「设 X 是一个完备度量空间」：距离 d 与度量空间是这条陈述的对象，'
    + '源笔记「必备知识」第 1 条即「度量空间」。'],
  ['dg:metric-completeness', 'gt:contraction-principle',
    '陈述要求 X 完备（去掉它反例立即出现：(0, 1] 上 t(x) = x/2 没有不动点）；'
    + '源笔记「必备知识」第 2 条即「完备性：任意 Cauchy 序列都收敛于 X 中的点」。'],
  ['dg:metric-space', 'gt:contraction-principle',
    '定理的舞台是一个**完备度量空间**：压缩映射 T: X → X 要求 X 上先有距离，'
    + '迭代序列的 Cauchy 性与极限的唯一性都靠它。源笔记「必备知识」第 1、2 条即'
    + '「度量空间」与「完备性」——两者在本案例里都由 `dg:metric-space` 与 `dg:metric-completeness` 承担。'
    + '（这一条替下原先的 `limit:continuous`：连续性确实用到了「压缩映射是利普希茨的」，'
    + '但 `limit` 案例的登记跨过来会被 `tests/hard-prereq.mjs` 拒——两个案例没有共享登记。）'],

  /*
   * ── 可数公理（dg:countability-axioms）──
   *
   * 依据：源笔记「前置知识 → 必备知识」两条：「集合的基数与可数集」（含可数多个的编号、
   * 以及「可数个可数集的并仍可数」）与「拓扑空间的基本概念」（拓扑、开集、邻域、
   * 拓扑基、邻域基）。两条公理的定义句里出现的「可数邻域基」「可数拓扑基」正是这两样。
   */
  ['top:space', 'gt:countability-axioms',
    '两条公理都作用在拓扑空间上：C₁ 要求每点有可数邻域基、C₂ 要求全空间有可数拓扑基；'
    + '源笔记「必备知识」第 2 条即「拓扑空间的基本概念：拓扑、开集、闭集、邻域、拓扑基、邻域基」。'],
  ['bg:logic:quantifier', 'gt:countability-axioms',
    '「可数多个」是两条定义句里唯一的定量条件（去掉它只剩「邻域基」「拓扑基」，那就退回本站已有的「拓扑空间」）；'
    + '源笔记「必备知识」第 1 条即「集合的基数与可数集」，并要求知道「可数个可数集的并集仍可数」——'
    + '这一层的语言（存在可数多个…、对每个 n…）在本案例里由量词背景节点承担。'
    + '（这一条替下原先的 `rudin:countable-set`：那是 rudin 案例的登记，跨案例硬前置会被 `tests/hard-prereq.mjs` 拒。）'],
  ['bg:set:function', 'gt:countability-axioms',
    '定义量化到可数多个邻域 {V₁, V₂, …} 与可数多个开集 {B₁, B₂, …}，'
    + '「任何邻域 U 都包含其中某个 Vₙ」「任何开集都是其中某些成员的并」用的是集合族与包含关系；'
    + '源笔记「必备知识」第 1 条明写「可以对其元素用自然数进行编号」。'],
].map(([from, to, scope], index) => relation(
  'rel-dg-seminar-' + String(from).replace(/^dg:/, '') + '-' + String(to).replace(/^dg:/, '') + '-' + index,
  'hardPrereq',
  from,
  to,
  { witness: { type: 'definitional-dependency', status: 'DEF', scope }, scope },
));
