/**
 * 讨论班笔记的硬前置关系：拓扑与流形刷新（拓扑空间 / 拓扑流形 / 流形 / 光滑流形 / 同胚）。
 *
 * 与 `data/cases/dg.mjs` 里那批关系同一把尺子：**不用它，目标节点的定义就写不出来**。
 * 见证一律 `type: 'definitional-dependency'` + `status: 'DEF'`，`scope` 指明它出现在
 * 源笔记定义文本的哪一处——不冒充证明（这些是定义材料的依赖，不是定理）。
 *
 * 依据来源：源笔记的「前置知识 → 必备知识」一节里**语料自己引用**的概念
 * （`H:/微分几何讨论班/vault/Geometry&Topology`，只读快照见 `data/dg/`）。
 *
 * **本文件可以并行编写**：每个批次一个文件，避免多人同时改 `data/cases/dg.mjs` 的同一个数组。
 * 汇总在 `data/cases/dg.mjs` 的 import 段（`seminarTopology Core`）。
 */
import { relation } from '../authoring.mjs';

/**
 * 硬前置：`[from, to, scope]` 三元组。
 *
 * id 由端点拼出来（`rel-dg-seminar-<from>-<to>-<序号>`）：手写 id 在多人分头写时
 * 很容易撞名，而撞名会在装配期静默覆盖——拼出来的 id 至少保证「同一条关系只有一个 id」。
 */
export const relations = [
  // 例：['dg:smooth-manifold', 'gt:riemannian-metric', '定义第一句就是「设 M 是一个光滑 n 维流形」。'],
  /*
   * 本批五篇只登记这一条**新**的硬前置；其余候选都与旧世代登记同端点、同理由，不重复加：
   * - dg:topological-space → dg:topological-manifold / dg:manifold：已有
   *   `rel-dg-pre-top-manifold`、`rel-dg-pre-top-manifold-entry`；
   * - dg:homeomorphism → dg:topological-manifold / dg:manifold：已有
   *   `rel-dg-pre-homeo-manifold-t`、`rel-dg-pre-homeo-manifold`；
   * - dg:topological-space → dg:homeomorphism：已有 `rel-dg-pre-top-homeo`
   *   （top:continuous-map → dg:homeomorphism 在老登记里没有，但它是 top 案例的同案例登记，
   *   不在这批「新世代自己缺的」缺口里，故留待 top 案例处理，见汇报）。
   * 上面几对合并后端点会改写成 top:space / top:homeomorphism / top:topological-manifold，
   * 与已有关系是**同一条三元组**，重复加会在装配期被 droppedDuplicates 丢掉或在测试里报「重复的同向三元组」。
   */
  [
    'top:countability-axioms',
    'dg:smooth-manifold',
    '源笔记 def/光滑流形.md 的定义第一句写「设 M 是一个 Hausdorff、第二可数的拓扑空间」：第二可数（A₂）'
    + '是光滑流形定义明写的条件之一，而不是从别处继承——本批 dg:manifold / dg:topological-manifold 两节按'
    + '「Hausdorff + 局部欧氏」登记、不含第二可数，因此这条不能靠拓扑流形那一支传递得到。'
    + '它同时是单位分解与 Whitney 嵌入的前提（源笔记「必要条件分析」第 2 条）。',
  ],
].map(([from, to, scope], index) => relation(
  'rel-dg-seminar-' + String(from).replace(/^dg:/, '') + '-' + String(to).replace(/^dg:/, '') + '-' + index,
  'hardPrereq',
  from,
  to,
  { witness: { type: 'definitional-dependency', status: 'DEF', scope }, scope },
));
