/**
 * 讨论班笔记的硬前置关系：映射与流形（分离公理 / 微分流形 / 切向量 / 反函数 / 隐函数 / Ricci 流）。
 *
 * 与 `data/cases/dg.mjs` 里那批关系同一把尺子：**不用它，目标节点的定义就写不出来**。
 * 见证一律 `type: 'definitional-dependency'` + `status: 'DEF'`，`scope` 指明它出现在
 * 源笔记定义文本的哪一处——不冒充证明（这些是定义材料的依赖，不是定理）。
 *
 * 依据来源：源笔记的「前置知识 → 必备知识」一节里**语料自己引用**的概念
 * （`H:/微分几何讨论班/vault/Geometry&Topology`，只读快照见 `data/dg/`）。
 *
 * **本文件可以并行编写**：每个批次一个文件，避免多人同时改 `data/cases/dg.mjs` 的同一个数组。
 * 汇总在 `data/cases/dg.mjs` 的 import 段（`seminarMaps And Manifolds`）。
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
].map(([from, to, scope], index) => relation(
  'rel-dg-seminar-' + String(from).replace(/^dg:/, '') + '-' + String(to).replace(/^dg:/, '') + '-' + index,
  'hardPrereq',
  from,
  to,
  { witness: { type: 'definitional-dependency', status: 'DEF', scope }, scope },
));
