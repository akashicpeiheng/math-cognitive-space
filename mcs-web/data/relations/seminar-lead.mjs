/**
 * 讨论班笔记的硬前置关系：拓扑与映射的补充（lead 补写，2026-10-12）。
 *
 * ## 为什么单独一个文件
 *
 * 这四条属于两个批次（`seminar-topology-theorems` / `seminar-maps-and-manifolds`），
 * 但那两个批次在交接时都只写到一半（各自把「其余候选与既有关系重复」的部分留给了我裁决），
 * 于是有 4 个新节点一条关系都没有——doctor 把它们算成「完全孤立（缺陷）」，全站检查因此不过。
 * 单独成文件比插进别人的文件清楚：谁写的、为什么写在这里，一眼看得出来。
 *
 * ## 依据（逐条取自源笔记「前置知识 → 必备知识」）
 *
 * - `分离公理`：「拓扑空间的基本定义」是必备知识第 1 条——公理本身就是给拓扑空间加分离条件。
 * - `微分流形`：必备知识里的「拓扑流形」与「图册与坐标卡」——微分流形 = 拓扑流形 + C^r 图册。
 * - `切向量`：「光滑流形」与「光滑函数/芽」——切向量定义在光滑函数芽代数上，没有光滑结构写不出来。
 * - `Ricci 流`：「黎曼流形与黎曼度量」——方程 ∂g/∂t = −2Ric(g) 的主角就是度量 g。
 */
import { relation } from '../authoring.mjs';

export const relations = [
  ['top:space', 'gt:separation-axioms',
    '分离公理是给**拓扑空间**的开集族追加的条件（T₀–T₄ 都写成「对任意点/闭集存在开集…」）；'
    + '源笔记「必备知识」第 1 条即「拓扑空间的基本定义：开集、邻域、闭集」。'],
  ['top:topological-manifold', 'gt:differentiable-manifold',
    '定义是「拓扑流形 + 一个 C^r 图册」：底空间、局部欧氏与同胚都来自拓扑流形；'
    + '源笔记「必备知识」第 1、2 条即「拓扑流形」与「图册与坐标卡」。'],
  ['dg:smooth-manifold', 'gt:tangent-vector',
    '切向量定义在**光滑函数的芽代数** C^∞_p(M) 上（导子定义），芽与光滑映射都要先有光滑流形；'
    + '源笔记「必备知识」第 1、2 条即「光滑流形」与「光滑函数与光滑映射」。'],
  ['gt:riemannian-metric', 'gt:ricci-flow',
    'Ricci 流的方程演化的是黎曼度量 g（∂g/∂t = −2Ric(g)），Ric 由 g 的曲率张量缩并得到；'
    + '源笔记「必备知识」列的第 1 条就是「黎曼流形与黎曼度量」。'],
].map(([from, to, scope], index) => relation(
  'rel-dg-seminar-lead-' + String(from).replace(/^[a-z]+:/, '') + '-' + String(to).replace(/^gt:/, '') + '-' + index,
  'hardPrereq',
  from,
  to,
  { witness: { type: 'definitional-dependency', status: 'DEF', scope }, scope },
));
