/**
 * 讨论班笔记的硬前置关系：黎曼几何基础（内积 / 黎曼度量 / 黎曼流形 / 测地线）。
 *
 * 与 `data/cases/dg.mjs` 里那批关系同一把尺子：**不用它，目标节点的定义就写不出来**。
 * 见证一律 `type: 'definitional-dependency'` + `status: 'DEF'`，`scope` 指明它出现在
 * 源笔记定义文本的哪一处——不冒充证明（这些是定义材料的依赖，不是定理）。
 *
 * 依据来源：源笔记的「前置知识 → 必备知识」一节里**语料自己引用**的概念
 * （`H:/微分几何讨论班/vault/Geometry&Topology`，只读快照见 `data/dg/`）。
 *
 * **本文件可以并行编写**：每个批次一个文件，避免多人同时改 `data/cases/dg.mjs` 的同一个数组。
 * 汇总在 `data/cases/dg.mjs` 的 import 段（`seminarRiemannian`）。
 */
import { relation } from '../authoring.mjs';

/**
 * 硬前置：`[from, to, scope]` 三元组。
 *
 * id 由端点拼出来（`rel-dg-seminar-<from>-<to>-<序号>`）：手写 id 在多人分头写时
 * 很容易撞名，而撞名会在装配期静默覆盖——拼出来的 id 至少保证「同一条关系只有一个 id」。
 */
export const relations = [
  /* ── dg:inner-product（内积）─────────────────────────────
   * 三条分别对应源笔记「前置知识 → 必备知识」的三条：
   * 向量空间 / 线性函数与双线性型 / 实数的基本性质。 */
  ['bg:linear:vector', 'gt:inner-product',
    '定义第一句「设 V 是实数域 R 上的向量空间」——没有向量空间，⟨·,·⟩: V × V → R 连定义域都写不出来。'],
  ['dg:tensor', 'gt:inner-product',
    '定义第 2 条公理「双线性」逐字写成 ⟨a₁u₁ + a₂u₂, v⟩ = a₁⟨u₁,v⟩ + a₂⟨u₂,v⟩ 以及对第二变量的对应式，这就是二元的多重线性映射（本站登记为「张量」）那一层语言。'],
  ['bg:real:metric', 'gt:inner-product',
    '定义第 3 条公理「⟨u,u⟩ ≥ 0，且等号成立当且仅当 u = 0」里的值与不等式都取在实数域上——背景接口声明的正是 R 与序 <。'],

  /* ── dg:riemannian-metric（黎曼度量，样板条目）───────────
   * 必备知识四条（光滑流形 / 切空间与切向量 / 协变张量场 / 内积）里，
   * 第一条「dg:smooth-manifold → dg:riemannian-metric」已登记在 data/cases/dg.mjs
   * （rel-dg-pre-smooth-riemannian-metric），此处不重复写同向三元组。 */
  ['dg:tangent-vector-curve', 'gt:riemannian-metric',
    '定义里 g_p: T_pM × T_pM → R 的两个自变量就是切向量，T_pM 是 p 处的切空间——本条对应必备知识第 2 条。'],
  ['dg:tensor', 'gt:riemannian-metric',
    '定义要求 g 是「光滑的 (0,2) 型协变张量场」，(0,2) 型这一层指标语言来自张量——本条对应必备知识第 3 条「协变张量场」。'],
  ['gt:inner-product', 'gt:riemannian-metric',
    '定义第 1、2 条（对称性 g_p(X,Y) = g_p(Y,X)；正定性 g_p(X,X) ≥ 0 且等号仅当 X = 0）就是内积公理的对应条目；「等价表达」第 1 条更把它逐字写成「在每一点 p 的切空间 T_pM 上指定一个内积」——本条对应必备知识第 4 条。'],

  /* ── dg:riemannian-manifold（黎曼流形）─────────────────── */
  ['dg:smooth-manifold', 'gt:riemannian-manifold',
    '定义第一句「设 M 为光滑 n 维流形」——(M, g) 里的 M 这一半就是它。'],
  ['dg:tangent-vector-curve', 'gt:riemannian-manifold',
    '定义里 g_p: T_pM × T_pM → R 的 T_pM 是 p 处的切空间，其元素是切向量；「对称、正定」这两个条件是对这些元素说的。'],
  ['dg:tensor', 'gt:riemannian-manifold',
    '定义要求 g 是「光滑的 (0,2) 型张量场」，(0,2) 型这一层指标语言来自张量。'],
  ['gt:inner-product', 'gt:riemannian-manifold',
    '定义句把 g_p 说成「T_pM 上的内积（即对称、正定）」——内积的两条实质性公理逐字出现在这里。'],
  ['gt:riemannian-metric', 'gt:riemannian-manifold',
    '定义句里的 g 就是「M 上的一个黎曼度量」，而 (M, g) 才被称为黎曼流形——没有度量这一半，这个名字没有指称对象。（本条前置直接取自定义文本，不在「必备知识」的四条里，理由记在汇报里。）'],

  /* ── dg:geodesic（测地线）───────────────────────────────
   * 「形式 → 规范的通用形式」给出四副面孔（A 联络 / B 坐标方程 / C Liouville / D 抽象曲面）；
   * 这里按 A（笔记自己标注为「最通用」）登记，B、C 里用到的度量与坐标另计。 */
  ['dg:smooth-manifold', 'gt:geodesic',
    '形式 A 的定义对象是「(M, ∇_a) 带仿射联络」，形式 B 还要 γ 落在坐标域内——曲线、坐标域与联络都长在 M 上。'],
  ['dg:tangent-vector-curve', 'gt:geodesic',
    '形式 A 的定义句是「曲线 γ(t) 的切矢 T^a」：判据 T^b∇_bT^a = 0 整个是对切矢说的，形式 D 更直接写成「单位切向量沿曲线自身平行」。'],
  ['gt:riemannian-metric', 'gt:geodesic',
    '形式 B 的 Γ^μ_{νσ} 取与 g 适配的联络（构造动机·现代规范形式：「有度规时取与 g_{ab} 适配的联络」），形式 C 的一阶系统用的 E、G 是正交参数系下的第一基本形式分量，「s 为弧长」也由 g 定——没有度量，Γ、E、G 与弧长参数都写不出来。'],
].map(([from, to, scope], index) => relation(
  'rel-dg-seminar-' + String(from).replace(/^dg:/, '') + '-' + String(to).replace(/^dg:/, '') + '-' + index,
  'hardPrereq',
  from,
  to,
  { witness: { type: 'definitional-dependency', status: 'DEF', scope }, scope },
));
