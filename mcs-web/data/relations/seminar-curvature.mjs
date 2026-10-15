/**
 * 讨论班笔记的硬前置关系：曲率与张量场（黎曼曲率张量 / 和乐群 / 协变张量场 / 李导数）。
 *
 * 与 `data/cases/dg.mjs` 里那批关系同一把尺子：**不用它，目标节点的定义就写不出来**。
 * 见证一律 `type: 'definitional-dependency'` + `status: 'DEF'`，`scope` 指明它出现在
 * 源笔记定义文本的哪一处——不冒充证明（这些是定义材料的依赖，不是定理）。
 *
 * 依据来源：源笔记的「前置知识 → 必备知识」一节里**语料自己引用**的概念
 * （`H:/微分几何讨论班/vault/Geometry&Topology`，只读快照见 `data/dg/`）。
 *
 * **本文件可以并行编写**：每个批次一个文件，避免多人同时改 `data/cases/dg.mjs` 的同一个数组。
 * 汇总在 `data/cases/dg.mjs` 的 import 段（`seminarCurvature`）。
 *
 * ## 本批的三处口径（不对齐会把边上错，因此写在文件头）
 *
 * 1. **合并后端点会改名**：`dg:riemann-curvature-tensor` 与 `dg:lie-derivative` 已被
 *    `data/merges.mjs` 收口（canonical 分别是 `liang:riemann-tensor` 与 `liang:lie-derivative`），
 *    装配期 `applyMerges()` 会把端点逐字改写。这里仍按**登记 id** 写端点——手改成 liang 的
 *    规范 id 反而会绕开「改写到底」那条检查（同一件事只在一处发生）。
 *
 * 2. **与既有登记重复的边不重写**：合并之后规范节点上的硬前置是两处的并集，
 *    下列两条在 liang 案例里已经登记过，本批**不再写一条同向重复边**（会撞上
 *    `tests/hard-prereq.mjs` 的「没有重复的同向三元组」）：
 *    - `liang:derivative-operator → liang:riemann-tensor`（`rel-liang-pre-derivative-riemann`）
 *      ——黎曼曲率张量对协变导数 ∇ 的依赖；
 *    - `dg:smooth-vector-field → liang:lie-derivative`（`rel-liang-pre-vectorfield-lie`）
 *      ——李导数对光滑向量场的依赖。
 *
 * 3. **两条真的缺边，如实留在这里**（不是漏写）：源笔记「必备知识」列了
 *    「平行移动」与「Levi-Civita 联络」，站内只有 liang 案例的登记
 *    （`liang:parallel-transport` / `liang:christoffel`），它们与 `dg:holonomy-group`
 *    **没有共享登记案例**——`tests/hard-prereq.mjs` 的判据是「两个端点共享至少一个登记案例」，
 *    这样的边正是它要禁掉的「两个互不相干的案例之间凭空长出的前置」。
 *    另有三条同样找不到站内对象：和乐群的「正交群 O(n) / SO(n)」（站内没有该节点）、
 *    李导数的「单参数变换群（流）」（站内没有该节点）、协变张量场的「张量场」
 *    （`tensor:field` 的登记案例是 tensor 与 liang，与 dg 侧的这条登记同样没有交集）。
 *    这四条依赖如实留在 `data/seminar-notes.mjs` 各条的 `prereq` 字段与
 *    `data/merges.mjs` 的 KEPT_SEPARATE 说明里；等 dg 侧有了对应的登记（或这些对象被收口到
 *    共享登记的节点上）再补边，而不是在这里写一条通不过判据的边。
 */
import { relation } from '../authoring.mjs';

/**
 * 硬前置：`[from, to, scope]` 三元组。
 *
 * id 由端点拼出来（`rel-dg-seminar-<from>-<to>-<序号>`）：手写 id 在多人分头写时
 * 很容易撞名，而撞名会在装配期静默覆盖——拼出来的 id 至少保证「同一条关系只有一个 id」。
 */
export const relations = [
  /* —— 黎曼曲率张量：登记 id `dg:riemann-curvature-tensor`，合并后规范节点 `liang:riemann-tensor` —— */
  ['dg:tensor', 'gt:riemann-curvature-tensor', '「形式 → 规范的通用形式」定义方式一的头一句就是「黎曼曲率张量 R 是一个 (1,3) 型张量场」，坐标分量式里的每一项也都是张量分量。'],
  ['top:differentiable-manifold', 'gt:riemann-curvature-tensor', '定义写在「设 (M, ∇) 是一个带仿射联络的流形」上：切空间与向量场的存在都来自 M 的光滑结构，流形是这句话的主语。'],
  ['dg:smooth-vector-field', 'gt:riemann-curvature-tensor', '定义对任意光滑向量场 X, Y, Z 取值（源笔记写作 ∀X,Y,Z ∈ 𝔛(M)），并用李括号 [X,Y] 修正；没有光滑向量场就写不出 R(X,Y)Z 的自变量。'],
  ['gt:riemannian-metric', 'gt:riemann-curvature-tensor', '「指标下降后的 (0,4) 型黎曼张量」写成 R_{abcd} = g_{dρ}R_{abc}{}^{ρ}，正是用度量 g 把逆变指标降下来；「必要条件分析」2 的与度量相容 ∇g = 0 也是相对 g 说的。'],
  ['liang:christoffel', 'gt:riemann-curvature-tensor', '坐标分量式 R_{μνσ}{}^{ρ} = ∂_μΓ^ρ_{νσ} − ∂_νΓ^ρ_{μσ} + Γ^λ_{μσ}Γ^ρ_{νλ} − Γ^λ_{νσ}Γ^ρ_{μλ} 逐项由 Christoffel 符号写成：没有 Γ 就写不出这个分量式。'],

  /* —— 和乐群：`dg:holonomy-group`（未与任何既有登记合并）—— */
  ['top:differentiable-manifold', 'gt:holonomy-group', '定义第一句「设 M 为 n 维黎曼流形，x ∈ M」：切空间 M_x 与闭曲线 γ 的光滑性都由流形结构给出。'],
  ['gt:riemannian-manifold', 'gt:holonomy-group', '定义的主语就是黎曼流形 M，而 γ̃ 是 M_x → M_x 的等距同构、H 与 H^* 是 M_x 上等距自同构群的子群——没有黎曼流形就没有这句话的作用对象。'],
  ['gt:riemannian-metric', 'gt:holonomy-group', '内积 g 使平行移动是等距同构，才有 H ⊆ H^* ⊆ O(n) 这句结论；去掉度量，「等距自同构」与 O(n) 都无从谈起。'],
  ['liang:riemann-tensor', 'gt:holonomy-group', '「形式 → 等价表达」1 用曲率张量及其平行移动生成和乐代数（Ambrose–Singer 和乐定理）；「前置知识 → 必备知识」也把曲率张量单列为一条。'],

  /* —— 协变张量场：`dg:covariant-tensor-field`（未与任何既有登记合并）—— */
  ['dg:tensor', 'gt:covariant-tensor-field', '定义的主体是多重线性映射 T_p: T_pM × ⋯ × T_pM → R；「张量」正是这个多重线性对象，等价表达 2 的 F(M)-多重线性映射用的还是它。'],
  ['tensor:tensor-product', 'gt:covariant-tensor-field', '坐标表达式 T = T_{i_1⋯i_r} dx^{i_1}⊗⋯⊗dx^{i_r} 与「张量丛 ⊗^{0,r}TM 的光滑截面」都要用张量积 ⊗，它被「必备知识」与「构造动机」单列为一条。'],
  ['top:differentiable-manifold', 'gt:covariant-tensor-field', '定义第一句「设 M 为 n 维光滑流形，p ∈ M」，并用到切空间 T_pM 与余切空间 T_p^*M；光滑流形是这条定义的主语。'],
  ['dg:tangent-coordinate-basis', 'gt:covariant-tensor-field', 'T_p 的自变量取自切空间 T_pM，分量式里的 ∂/∂x^i 就是切空间的坐标基；「必备知识」明确要求切空间与余切空间。'],
  ['dg:tangent-bundle', 'gt:covariant-tensor-field', '等价表达 1 把协变张量场写成张量丛的光滑截面；「必备知识」的「向量丛的定义及其光滑截面的概念」在站内由切丛这一登记承担（张量丛本身登记在 tensor:bundle，与本节点没有共享登记案例，见文件头第 3 条）。'],

  /* —— 李导数：登记 id `dg:lie-derivative`，合并后规范节点 `liang:lie-derivative` —— */
  ['top:differentiable-manifold', 'gt:lie-derivative', '定义写在光滑流形 M 上：φ_t: M → M 是单参数变换群，「对光滑函数 f ∈ C^∞(M)」也以它为背景。'],
  ['liang:pushforward-pullback', 'gt:lie-derivative', '定义的核心是「沿流拉回再求导」：L_ξ T = d/dt|_{t=0} F_t^* T，对微分形式 L_X(ω) = d/dt|_{t=0}(φ_t)^*ω；没有推前与拉回就写不出这个极限。'],
].map(([from, to, scope], index) => relation(
  'rel-dg-seminar-' + String(from).replace(/^dg:/, '') + '-' + String(to).replace(/^dg:/, '') + '-' + index,
  'hardPrereq',
  from,
  to,
  { witness: { type: 'definitional-dependency', status: 'DEF', scope }, scope },
));
