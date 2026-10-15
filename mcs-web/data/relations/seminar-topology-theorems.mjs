/**
 * 讨论班笔记的硬前置关系：微分拓扑（横截性 / Sard 定理 / 嵌入定理）。
 *
 * 与 `data/cases/dg.mjs` 里那批关系同一把尺子：**不用它，目标节点的定义或陈述就写不出来**。
 * 见证一律 `type: 'definitional-dependency'` + `status: 'DEF'`，`scope` 指明它出现在
 * 源笔记定义 / 陈述文本的哪一处——不冒充证明。
 *
 * ## 依据来源（逐条可核，与源笔记对照）
 *
 * 三篇笔记的体例不同，依据的位置因此也不同，这里如实分开写：
 *
 * - `def/横截性.md` **有**「前置知识 → 必备知识」一节，前置取自语料自己引用的概念
 *   （光滑流形 / 切空间 / 正则子流形即嵌入子流形）；
 * - `thm/Sard定理.md`、`thm/嵌入定理.md` **没有**「前置知识」一节（实测：全文从「动机」直接开始），
 *   因此这两条的前置只能取自「形式 → 规范的通用形式」里**陈述本身直接引用的概念**
 *   （光滑流形、切空间（df_x 的定义域与靶）、坐标图（流形上零测度的定义）、光滑嵌入、紧致性），
 *   不替源笔记编造一节它没有的「必备知识」。
 *
 * ## 故意没有登记的两条依赖（写在这里，免得被当成漏填）
 *
 * `dg:sard-theorem` 是 `dg:transversality`（横截性定理的通有性）与 `dg:embedding-theorem`
 * （投影降维）**证明**里的核心工具，源笔记自己也是这么写的（横截性笔记把它放在「辅助知识」、
 * 嵌入定理笔记的标签里有 `#Sard定理`）。但那是**证明依赖**，不是定义 / 陈述依赖：
 * 没有 Sard 定理，这两条陈述照样写得出来。按本文件的见证口径（DEF + definitional-dependency）
 * 登记它会把证明依赖伪装成定义依赖；要登记得走 `witness.type = 'proof-dependency'`，
 * 而那需要一条同时列出两端节点的证据记录（证据在 `data/cases/dg.mjs`，不在本批次的所有权内）。
 * 这一条欠账因此在报告里显式列出，不在这里伪造。
 *
 * 依据来源：源笔记（`H:/微分几何讨论班/vault/Geometry&Topology`，只读快照见 `data/dg/`）。
 *
 * **本文件可以并行编写**：每个批次一个文件，避免多人同时改 `data/cases/dg.mjs` 的同一个数组。
 * 汇总在 `data/cases/dg.mjs` 的 import 段（`seminarTopology Theorems`）。
 */
import { relation } from '../authoring.mjs';

/**
 * 硬前置：`[from, to, scope]` 三元组。
 *
 * id 由端点拼出来（`rel-dg-seminar-<from>-<to>-<序号>`）：手写 id 在多人分头写时
 * 很容易撞名，而撞名会在装配期静默覆盖——拼出来的 id 至少保证「同一条关系只有一个 id」。
 */
export const relations = [
  // —— 横截性（Concept）：必备知识里语料自己引用的三个概念 ——
  ['dg:smooth-manifold', 'gt:transversality', '必备知识第一条「微分流形的基本概念：光滑流形、光滑映射、切空间与切映射」；定义句就是「设 f: M → N 为微分流形之间的光滑映射」。'],
  ['dg:tangent-coordinate-basis', 'gt:transversality', '定义条件 f_{*p}(T_pM) + T_qS = T_qN 的两项都是切空间：源笔记的「必要条件分析」写明横截性条件是关于切空间的满射条件。'],
  ['dg:smooth-embedding', 'gt:transversality', '必备知识第二条「正则子流形：嵌入子流形的定义与结构定理」；S 必须是 N 的正则子流形，横截性是对这样的 S 陈述的，S 仅为浸入子流形时理论不再直接适用。'],

  // —— Sard 定理（Claim）：陈述里直接引用的概念（该篇没有「前置知识」一节）——
  ['dg:smooth-manifold', 'gt:sard-theorem', '定理第一句「设 M, N 为光滑流形，f: M → N 为光滑映射」；条件分析表另把「f 光滑（C^∞）」「M 是流形（第二可数）」列为不可删的前提。'],
  ['dg:tangent-coordinate-basis', 'gt:sard-theorem', '临界点集按 C = {x ∈ M | rank df_x < dim N} 定义，其中 df_x: T_xM → T_{f(x)}N 是切映射，定义域与靶空间都是切空间。'],
  ['dg:coordinate-chart', 'gt:sard-theorem', '结论「f(C) 在 N 中具有零测度」按「等价表达」第 3 条定义：流形上的零测度通过局部坐标卡拉回 R^l（可数个矩形体覆盖、体积和 < ε）定义，没有坐标图就写不出这个结论。'],

  // —— 嵌入定理（Claim）：陈述里的「被嵌入的对象 / 嵌入 / 紧致性」——
  ['dg:smooth-manifold', 'gt:embedding-theorem', '三个形式的陈述对象都是「n 维（紧致 / 一般）光滑流形」，嵌入与浸入的目标维数 2n+1、2n、2n−1 全部由 n 给出。'],
  ['dg:smooth-embedding', 'gt:embedding-theorem', '结论「可以嵌入到 R^{2n+1} 中」「均可嵌入到 R^{2n} 中」里的「嵌入」就是光滑嵌入（单浸入且是到其像上的同胚）——概念是定理陈述的词项，不是被定理替代的对象。'],
  ['dg:compactness', 'gt:embedding-theorem', '形式一（梅加强定理 1.5.6）的前提就是 M 紧致；紧致性还使「单浸入即嵌入」成立（源笔记的条件分析第 2 条），这是 2n+1 维数估计里省掉单射性一步的依据。'],
].map(([from, to, scope], index) => relation(
  'rel-dg-seminar-' + String(from).replace(/^dg:/, '') + '-' + String(to).replace(/^dg:/, '') + '-' + index,
  'hardPrereq',
  from,
  to,
  { witness: { type: 'definitional-dependency', status: 'DEF', scope }, scope },
));
