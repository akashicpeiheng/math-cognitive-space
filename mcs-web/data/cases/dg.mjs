/**
 * 微分几何案例：从 G:\DifferentialGeometry\object 选出的 30 个核心节点。
 *
 * 本文件只登记**语料里明确写出**的结构；正文由 scripts/build-dg-case.mjs 从
 * 只读快照 data/dg/ 生成到 data/cases/05-differential-geometry.md。
 *
 * 证据纪律：
 * - 语料是笔记，没有机器证书。因此证据一律登记为 prose-proof / DEF / REF，
 *   checkStatus 固定 not_run，obligations 写明「未编码为 ND 证书」。
 * - 不签发任何 FINITE 或「已认证」结论；`evidenceStatus` 只反映语料自己声明的状态。
 *
 * 取值来源：
 * - predicate：各源文件「规范的通用形式」一节的**定义句**，逐条提取，未改写数学内容。
 * - 行动契约的 inputs：取该源文件「前置知识 → 必备知识」里**语料自己引用**的概念。
 * - boundary：取「常见的误解」与「推广」两节声明的失效范围。
 */
import {
  concept, claim, patternNode, method,
  action, input, output, relation, evidence, support, claimRecord, selfCheck,
} from '../authoring.mjs';

const provenanceNote = '正文为 G:/DifferentialGeometry/object 的只读快照，见 data/dg/；本次只做格式归一化与链接重写，未改动数学内容。';
const source = (path) => `G:/DifferentialGeometry/object/${path}`;

/** 30 个节点的形成字段。predicate 逐条取自各源文件的定义句。 */
const spec = [
  {
    id: 'dg:topological-space', title: '拓扑空间', discipline: '拓扑', source: 'def/拓扑空间.md',
    objectType: '集合与开集族', parameters: ['X', 'T'],
    predicate: 'T ⊆ P(X) 且 ∅,X ∈ T；T 中有限交封闭；T 中任意并封闭',
    boundary: ['去掉 Hausdorff 会允许极限不唯一的空间；拓扑空间的公理本身不保证分离性。'],
  },
  {
    id: 'dg:homeomorphism', title: '同胚', discipline: '拓扑', source: 'def/同胚.md',
    objectType: '拓扑空间之间的映射', parameters: ['f', 'X', 'Y'],
    predicate: 'f: X → Y 是一一对应，且 f 与 f⁻¹ 都连续',
    boundary: ['同胚是拓扑性质的等价，不是度量性质的等价；不保持长度与角度。'],
  },
  {
    id: 'dg:manifold', title: '流形', discipline: '微分几何', source: 'def/流形.md',
    objectType: '拓扑空间', parameters: ['M', 'n'],
    predicate: 'M 为 Hausdorff 空间，且每点有邻域同胚于 R^n 的开子集，dim M = n',
    boundary: ['这里的「流形」指拓扑流形；它本身不含光滑结构。去掉 Hausdorff 会破坏极限的唯一性。'],
  },
  {
    id: 'dg:topological-manifold', title: '拓扑流形', discipline: '微分几何', source: 'def/拓扑流形.md',
    objectType: '局部欧氏的 Hausdorff 空间', parameters: ['M', 'n'],
    predicate: 'M 为 Hausdorff 空间，每点 p 有开邻域 U 与映射 φ: U → R^n 使 φ(U) 为 R^n 中开集且 φ 为同胚',
    boundary: ['不要求坐标变换光滑；因此拓扑流形上还不能定义切向量与微分。'],
  },
  {
    id: 'dg:coordinate-chart', title: '坐标图', discipline: '微分几何', source: 'def/坐标图.md',
    objectType: '开集与其坐标映射', parameters: ['U', 'φ'],
    predicate: '(U, φ) 中 U ⊆ M 为开集，φ: U → φ(U) ⊆ R^n 为同胚',
    boundary: ['坐标是局部的：一般没有覆盖整个流形的单个坐标图。'],
  },
  {
    id: 'dg:smooth-structure', title: '光滑结构', discipline: '微分几何', source: 'def/光滑结构.md',
    objectType: '拓扑流形上的极大图册', parameters: ['M', 'σ'],
    predicate: 'σ 是 M 上的极大光滑图册，等价于相容光滑图册的等价类',
    boundary: ['同一拓扑流形可以有互不相容的光滑结构；光滑结构是独立于拓扑的额外信息。'],
  },
  {
    id: 'dg:smooth-atlas', title: '光滑图册', discipline: '微分几何', source: 'def/光滑图册.md',
    objectType: '坐标图的集合', parameters: ['A', 'M'],
    predicate: 'A = {(U_α, φ_α)} 覆盖 M，且任意两图在重叠域上的坐标变换是 C^∞',
    boundary: ['图册要求覆盖；只给出部分图不能称为图册。'],
  },
  {
    id: 'dg:smooth-manifold', title: '光滑流形', discipline: '微分几何', source: 'def/光滑流形.md',
    objectType: '带光滑结构的拓扑流形', parameters: ['M', 'n'],
    predicate: 'M 为 Hausdorff、第二可数拓扑空间，存在图册使所有坐标变换 φ_β∘φ_α⁻¹ 为 C^∞',
    boundary: ['Hausdorff 与第二可数不可删：去掉第二可数会失去单位分解。', '本节点与本站 manifold:smooth-atlas 语义相邻，通过关系对接而不重复。'],
  },
  {
    id: 'dg:smooth-embedding', title: '光滑嵌入', discipline: '微分几何', source: 'def/光滑嵌入.md',
    objectType: '光滑流形之间的映射', parameters: ['f', 'M', 'N'],
    predicate: 'f: M → N 为单浸入，且 f 是到其像上的同胚（像取子空间拓扑）',
    boundary: ['单浸入未必是嵌入；像可能不自带子流形拓扑。'],
  },
  {
    id: 'dg:smooth-distribution', title: '光滑切分布', discipline: '微分几何', source: 'def/光滑切分布.md',
    objectType: '切丛的子丛', parameters: ['D', 'M', 'k'],
    predicate: 'D 将每点 p 映为 T_pM 的 k 维线性子空间，且在每点邻域内由 k 个光滑向量场局部张成',
    boundary: ['分布的光滑性是局部条件；对合性不是分布定义的一部分，是可积性定理的额外前提。'],
  },
  {
    id: 'dg:partition-of-unity', title: '单位分解', discipline: '微分几何', source: 'def/单位分解.md',
    objectType: '光滑函数族', parameters: ['{g_i}', 'M', '{U_α}'],
    predicate: 'g_i 光滑、支集紧且局部有限、Σ g_i ≡ 1，且每个 supp g_i 含于某个 U_α',
    boundary: ['存在性依赖第二可数与 Hausdorff；去掉第二可数时不一定存在。'],
  },
  {
    id: 'dg:compactness', title: '紧致性', discipline: '拓扑', source: 'prop/紧致性.md',
    objectType: '拓扑空间或其子集', parameters: ['X', 'A'],
    predicate: 'A 的任一开覆盖都有有限子覆盖',
    boundary: ['紧致是拓扑性质，同胚不变；不蕴含度量有界以外的欧氏性质。'],
  },
  {
    id: 'dg:metric-space', title: '度量空间', discipline: '拓扑', source: 'def/度量空间.md',
    objectType: '集合与距离函数', parameters: ['X', 'd'],
    predicate: 'd: X×X → R 满足非负定、对称、三角不等式，且 d(x,y)=0 ⇔ x=y',
    boundary: ['度量诱导拓扑，但不同度量可诱导同一拓扑；度量的具体数值不是拓扑不变量。'],
  },
  {
    id: 'dg:metric-completeness', title: '度量完备性', discipline: '拓扑', source: 'def/度量完备性.md',
    objectType: '度量空间的性质', parameters: ['X', 'd'],
    predicate: 'X 中每个 Cauchy 序列都收敛于 X 中的点',
    boundary: ['完备性是度量性质，不同度量可以改变完备性；等距同构保持它，同胚不保持。'],
  },
  {
    id: 'dg:tangent-vector-curve', title: '切向量的曲线定义', discipline: '微分几何', source: 'def/切向量的曲线定义.md',
    objectType: '光滑流形在一点处的切向量', parameters: ['γ', 'p', 'M'],
    predicate: '经过 p 的光滑曲线在局部坐标下按 (φ∘γ)′(0) 取等价类，等价类即 p 处的一个切向量',
    boundary: ['等价性依赖坐标卡的选取，但等价关系本身与坐标卡无关；需要先有光滑结构。'],
  },
  {
    id: 'dg:tangent-vector-derivation', title: '切向量的导子定义', discipline: '微分几何', source: 'def/切向量的导子定义.md',
    objectType: '光滑函数芽上的线性泛函', parameters: ['X_p', 'p', 'M'],
    predicate: 'X_p: C^∞(M) → R 线性，且满足 Leibniz 法则 X_p(fg) = f(p)X_p(g) + g(p)X_p(f)',
    boundary: ['必须有 Leibniz 法则；只要求线性会得到远大于切空间的泛函集合。'],
  },
  {
    id: 'dg:tangent-vector-equivalence', title: '切向量两种定义的等价性', discipline: '微分几何', source: 'def/切向量两种定义的等价性.md',
    objectType: '两种切向量定义之间的对应', parameters: ['M', 'p'],
    predicate: '曲线等价类与导子之间存在保持线性结构与 Leibniz 法则的自然双射',
    boundary: ['等价性在 C^∞ 结构下成立；对有限 C^k 结构两种定义的对应需要额外的表述约定。'],
  },
  {
    id: 'dg:tangent-coordinate-basis', title: '切空间的坐标基', discipline: '微分几何', source: 'def/切空间的坐标基.md',
    objectType: '切空间的一组基', parameters: ['∂/∂u^i', 'p', '(U; u^i)'],
    predicate: '∂/∂u^i|_p 由 (∂/∂u^i)(f) = ∂(f∘φ⁻¹)/∂x^i|_{φ(p)} 定义，构成 T_pM 的 n 元基',
    boundary: ['这组基依赖坐标卡的选取，在坐标变换下按 Jacobi 矩阵变换。'],
  },
  {
    id: 'dg:tangent-bundle', title: '切丛', discipline: '微分几何', source: 'def/切丛.md',
    objectType: '向量丛', parameters: ['TM', 'M', 'π'],
    predicate: 'TM = ⊔_{p∈M} T_pM，π: TM → M 取 π(T_pM) = p，且 TM 带 2n 维光滑流形结构使 π 为光滑淹没',
    boundary: ['切丛的光滑结构由 M 的图册诱导；换图册会改变 TM 的光滑结构。'],
  },
  {
    id: 'dg:smooth-vector-field', title: '光滑向量场', discipline: '微分几何', source: 'def/光滑向量场.md',
    objectType: '切丛的光滑截面', parameters: ['X', 'M', 'TM'],
    predicate: 'X: M → TM 为光滑映射，且 π∘X = id_M',
    boundary: ['「光滑」是相对 TM 的光滑结构而言；没有这个结构只能谈集合论的截取。'],
  },
  {
    id: 'dg:tensor', title: '张量', discipline: '多重线性与张量代数', source: 'def/张量.md',
    objectType: '多重线性函数', parameters: ['T', 'r', 's', 'V'],
    predicate: 'T 对 r 个余向量与 s 个向量分别线性，即 T ∈ T^r_s(V)',
    boundary: ['多线性是定义的核心；只对部分变量线性不构成张量。零向量空间上的同名对象需与本站 tensor:tensor-rs 对接，不重复登记。'],
  },
  {
    id: 'dg:tensor-product-dg', title: '张量积（微分几何）', discipline: '多重线性与张量代数', source: 'def/张量积.md',
    objectType: '双线性泛函诱导的对象', parameters: ['V', 'W', '⊗'],
    predicate: 'V⊗W 由双线性映射的通用性质刻画：任意双线性映射唯一地经过 ⊗ 分解',
    boundary: ['通用性质是定义的一部分；只按分量逐个相乘不构成张量积的定义。'],
  },
  {
    id: 'dg:differential-form', title: '微分形式', discipline: '微分几何', source: 'def/微分形式.md',
    objectType: '外代数丛的光滑截面', parameters: ['ω', 'p', 'M'],
    predicate: 'p 次微分形式是 ⋀^p T*M 的光滑截面，全体记为 Ω^p(M)',
    boundary: ['p 次形式要求全反称；不反称的多重线性对象不是形式。'],
  },
  {
    id: 'dg:form-wedge-product', title: '微分形式的外积', discipline: '微分几何', source: 'def/微分形式的外积.md',
    objectType: '外形式之间的运算', parameters: ['f', 'g', '∧'],
    predicate: 'f∧g 为反称化后的多重线性形式，满足 f∧g = (−1)^{rs} g∧f',
    boundary: ['外积有分次交换符号；把它当作普通乘法交换会算错符号。'],
  },
  {
    id: 'dg:d-squared-zero', title: '外微分平方为零', discipline: '微分几何', source: 'def/外微分平方为零.md',
    objectType: '外微分算子的恒等式', parameters: ['d', 'ω'],
    predicate: '对任意微分形式 ω 有 d(dω) = 0',
    boundary: ['该恒等式对光滑形式成立；在奇点或非光滑情形需要另加条件。'],
  },
  {
    id: 'dg:form-pullback', title: '微分形式的拉回', discipline: '微分几何', source: 'def/微分形式的拉回.md',
    objectType: '光滑映射诱导的形式映射', parameters: ['f*', 'f', 'ω'],
    predicate: 'f*ω 由 (f*ω)_p(v_1,…,v_r) = ω_{f(p)}(f_{*p}v_1,…,f_{*p}v_r) 定义',
    boundary: ['拉回沿映射反方向进行；它保持外积与 d，但不保持积分（积分需要定向）。'],
  },
  {
    id: 'dg:implicit-function-theorem', title: '隐函数定理', discipline: '分析', source: 'thm/隐函数定理.md',
    construct: 'Claim', role: 'Theorem',
    objectType: '方程局部可解性的定理', parameters: ['F', 'x', 'y'],
    predicate: 'F(x₀,y₀)=0 且 ∂F/∂y 在 (x₀,y₀) 可逆，则存在 g 使 F(x,g(x))=0',
    boundary: ['要求偏导数可逆；可逆性失效时结论可能不成立。'],
  },
  {
    id: 'dg:inverse-function-theorem', title: '反函数定理', discipline: '分析', source: 'thm/反函数定理.md',
    construct: 'Claim', role: 'Theorem',
    objectType: '局部可逆性的定理', parameters: ['F', 'p'],
    predicate: 'F 为 C^k（k≥1）且 dF_p 为线性同构，则 F 在 p 的邻域上是 C^k 微分同胚',
    boundary: ['结论是局部的；dF 处处可逆也只给出局部同胚，整体单射需要另外论证。'],
  },
  {
    id: 'dg:generalized-stokes-theorem', title: '广义 Stokes 定理', discipline: '微分几何', source: 'thm/广义 Stokes 定理.md',
    construct: 'Claim', role: 'Theorem',
    objectType: '带边流形上的积分恒等式', parameters: ['ω', 'M', '∂M'],
    predicate: '∫_M dω = ∫_{∂M} ω，其中 M 为带边定向光滑流形、ω 为具紧支集的 (n−1) 形式',
    boundary: ['需要定向与紧支集；去掉定向时带符号的边界积分没有定义。'],
  },
  {
    id: 'dg:poincare-lemma', title: 'Poincaré 引理', discipline: '微分几何', source: 'thm/Poincare 引理.md',
    construct: 'Claim', role: 'Theorem',
    objectType: '闭形式与恰当形式的关系', parameters: ['ω', 'U'],
    predicate: '在可缩开集 U 上，若 dω = 0 则存在 η 使 ω = dη',
    boundary: ['只对可缩区域成立；一般的闭形式未必恰当，障碍由 de Rham 上同调度量。'],
  },
  // 误区模式是独立的 MisconceptionPattern 对象，不混进概念节点的 30 人名单。
  {
    id: 'dg:pattern-manifold-is-surface', title: '把光滑流形等同于嵌入在 R^N 中的曲面',
    discipline: '微分几何', source: 'def/光滑流形.md', construct: 'MisconceptionPattern',
    wrongRule: '光滑流形就是嵌入在 R^N 中的曲面',
    task: '判断一个抽象定义的对象是否依赖外部嵌入',
    counterexample: 'Whitney 嵌入定理保证可嵌入，但导子定义的切空间不需要任何外部 R^N',
    scope: '反驳的是「定义依赖嵌入」，不否定嵌入作为直观手段的价值。',
    anchors: ['dg:smooth-embedding', 'dg:smooth-manifold'],
  },
  {
    id: 'dg:pattern-global-coordinates', title: '以为流形上每点可以用唯一坐标标记',
    discipline: '微分几何', source: 'def/坐标图.md', construct: 'MisconceptionPattern',
    wrongRule: '流形上存在覆盖整体的单一坐标系',
    task: '判断给定空间能否用一张图覆盖',
    counterexample: '球面至少需要两张球极投影图，不存在覆盖 S² 的单一坐标图',
    scope: '反驳的是「整体单一坐标」，不否定局部坐标的存在性。',
    anchors: ['dg:coordinate-chart', 'dg:smooth-atlas'],
  },
  {
    id: 'dg:pattern-derivation-ignores-leibniz', title: '定义导子时漏掉 Leibniz 法则',
    discipline: '微分几何', source: 'def/切向量的导子定义.md', construct: 'MisconceptionPattern',
    wrongRule: '切向量就是 C^∞(M) 上的任意线性泛函',
    task: '检验一个泛函是否属于切空间',
    counterexample: '只要求线性会得到远大于 T_pM 的泛函集合，维数不再等于 n',
    scope: '反驳的是「线性即可」，Leibniz 法则是分出切空间的关键条件。',
    anchors: ['dg:tangent-vector-derivation'],
  },
  {
    id: 'dg:pattern-closed-implies-exact', title: '把闭形式一律当作恰当形式',
    discipline: '微分几何', source: 'thm/Poincare 引理.md', construct: 'MisconceptionPattern',
    wrongRule: 'dω = 0 就存在 η 使 ω = dη',
    task: '在给定区域上判断闭形式是否恰当',
    counterexample: '去心平面上的角形式闭但不恰当；障碍由 de Rham 上同调给出',
    scope: 'Poincaré 引理只对可缩区域成立；结论的适用范围由区域拓扑决定。',
    anchors: ['dg:poincare-lemma', 'dg:differential-form'],
  },
];

/**
 * 概念节点用 concept()，定理节点用 claim()（形成检查要求 Claim 构造带公式），
 * 误区模式用 patternNode()。三者共用同一份 provenance 与环境边界。
 */
function buildNode(spec_) {
  const shared = {
    discipline: spec_.discipline,
    case: 'dg',
    summary: spec_.objectType + '：' + spec_.predicate + '。',
    formal: { assumptions: [], boundary: spec_.boundary },
    representations: [],
    provenance: { sources: [source(spec_.source)], note: provenanceNote },
  };

  if (spec_.construct === 'MisconceptionPattern') {
    return patternNode(spec_.id, spec_.title, {
      ...shared,
      // 误区模式在源笔记本里没有独立正文；不伪造正文，显式声明无内容块。
      contentRef: false,
      /*
       * 证据等级（2026-10 补）：误区模式登记的是**一条错误规则连同反驳它的反例**，
       * 不是一个待证命题，因此取 `ILLUSTRATION`（与其它案例的误区模式同档），
       * 而不是留空——留空在界面上是「没有标签」，看不出本站是否声称过它。
       */
      teaching: {
        evidenceStatus: 'ILLUSTRATION',
        reviewQuestions: [`「${spec_.wrongRule}」这条规则的反例在哪里，它精确否定了什么、没有否定什么？`],
      },
      wrongRule: spec_.wrongRule,
      task: spec_.task,
      counterexample: spec_.counterexample,
      scope: spec_.scope,
      anchors: spec_.anchors,
    });
  }

  const teaching = {
    evidenceStatus: 'DEF',
    reviewQuestions: [`${spec_.title}的定义中，哪个条件可以去掉而不失去主要结论？`],
  };
  // 不合成 motivation：源笔记正文自带完整的「动机 → 引入动机 / 构造动机」一节，
  // 再放一个指向它的占位条目只会形成重复的噪声。

  if (spec_.construct === 'Claim') {
    return claim(spec_.id, spec_.title, {
      ...shared,
      roles: [spec_.role ?? 'Theorem'],
      formula: spec_.predicate,
      formal: { assumptions: [], boundary: spec_.boundary },
      teaching,
      // 定理节点的正文块与节点 id 同名；显式声明以通过形成检查。
      contentRef: spec_.id,
    });
  }

  return concept(spec_.id, spec_.title, {
    ...shared,
    objectType: spec_.objectType,
    parameters: spec_.parameters,
    predicate: spec_.predicate,
    teaching,
  });
}

export const dgNodes = spec.map(buildNode);

/**
 * 方法节点。
 *
 * 语料是**笔记**：它把「怎么算」写在定理正文的推导步骤里，而不是抽象成方法条目。
 * 因此这里的两个方法是从源文件的推导步骤**提炼**出来的，不声称语料里有同名条目；
 * 提炼依据逐条写在 provenance 与对应的证据记录里。
 *
 * 分成两类（这是本站在方法上的既有分类，见 `data/authoring.mjs` 的 `method()`）：
 * - `LocalMethod`（局部技巧）：任务形状明确、步骤可枚举，换一个场景就不一定适用。
 * - `GlobalMethod`（全局方法）：跨场景的策略，不针对单个任务。
 *
 * 这里两个都是**局部技巧**：它们都要求先有一个具体候选，再按固定步骤核验。
 */
export const dgMethodNodes = [
  method('dg:method-inverse-check', '用反函数定理核验候选映射', {
    discipline: '分析', case: 'dg', scope: '局部方法',
    summary: '对给定的光滑映射，先在一点算雅可比并检查其可逆性，再据反函数定理局部求逆。',
    In: '光滑映射 F: M → N 与一点 p', Out: '局部逆映射的存在性结论或失败点', Pre: 'F 在 p 的某个坐标表示可算偏导',
    Post: '给出 p 邻域上的局部逆，或指出雅可比奇异这一失败点',
    Use: ['dg:inverse-function-theorem', 'bg:linear:vector'], Demo: ['dg:implicit-function-theorem'],
    Fail: '雅可比在 p 奇异时定理不适用，此时不能据本方法断言逆存在；也不给出整体逆。',
    body: '取 p 处的坐标图，写出 F 的坐标表示与雅可比矩阵；判定其行列式是否非零；非零时按定理得到局部逆，并说明逆只在 p 的某个邻域上存在。',
    formal: { applicableTo: ['dg:inverse-function-theorem'], boundary: ['只判定局部可逆；整体单射性不在本方法范围内。'] },
    motivation: {
      internal: ['反函数定理是局部的，因此「先算雅可比、再谈可逆」是最自然的检验顺序。'],
      external: ['数值求解与坐标变换的可行性判定。'],
      aesthetic: ['把非线性问题在一点线性化。'],
      growthChain: ['隐式方程求解困惑 → 线性化 → 雅可比可逆判据 → 局部逆'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-dg-method-inverse-1', '写出 F 在 p 处的雅可比并判断是否可逆。', '计算', 'dg:method-inverse-check', '可逆时给出局部逆的存在结论；奇异时报告失败点。')],
      reviewQuestions: ['为什么雅可比非零只保证局部可逆？'],
      evidenceStatus: 'DEF',
    },
    provenance: {
      sources: [source('thm/反函数定理.md')],
      note: provenanceNote + ' 本方法由该源文件正文的推导步骤提炼，语料未单列同名方法条目。',
    },
  }),
  method('dg:method-closed-form-test', '在原点上验证闭形式是否恰当', {
    discipline: '微分几何', case: 'dg', scope: '局部方法',
    summary: '给定一个闭形式，先判区域是否可缩；可缩时用 Poincaré 引理构造原函数，不可缩时去找障碍。',
    In: '微分形式 ω 与它所在的区域 U', Out: '原函数 η 或区域层面的障碍', Pre: '已知 dω = 0',
    Post: '在可缩区域上给出 ω = dη；否则指出障碍来自区域拓扑而非形式本身',
    Use: ['dg:poincare-lemma', 'dg:differential-form'], Demo: ['dg:pattern-closed-implies-exact'],
    Fail: '区域不可缩时本方法不能断定 ω 不恰当，只能说 Poincaré 引理不适用；障碍需要另行计算。',
    body: '先算 dω 确认闭合；再检查 U 是否可缩。可缩则按引理构造 η；不可缩则改装到去心平面这类区域上找反例。',
    formal: { applicableTo: ['dg:poincare-lemma'], boundary: ['「闭 + 可缩 ⇒ 恰当」是充分条件，不是充要条件。'] },
    motivation: {
      internal: ['闭与恰当的差别只在区域拓扑上，因此方法的第一步必须是判区域。'],
      external: ['向量场势函数的存在性判定。'],
      aesthetic: ['把分析问题化归为区域的拓扑性质。'],
      growthChain: ['dω=0 却找不到原函数 → 检查区域 → 可缩性与障碍'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-dg-method-closed-1', '判断给定的 U 是否可缩，并说明这一步为什么必要。', '判定', 'dg:method-closed-form-test', '可缩用引理；不可缩则给障碍，不断言不恰当。')],
      reviewQuestions: ['去心平面上的角形式为什么是关键的对照例子？'],
      evidenceStatus: 'DEF',
    },
    provenance: {
      sources: [source('thm/Poincare 引理.md')],
      note: provenanceNote + ' 本方法由该源文件正文的推导步骤提炼，语料未单列同名方法条目。',
    },
  }),
];

/**
 * 两条从语料正文里提炼出的断言节点。
 *
 * 语料把「两种切向量定义等价」与「外微分平方为零」写在 detail 文件内部，
 * 没有独立的定理文件，因此这里登记为独立 Claim 节点，让断言与概念分开：
 * 概念节点回答「它是什么」，断言节点回答「断言了什么」。
 * 它们没有独立正文块（contentRef: false），因为语料没有对应文件——不伪造正文。
 */
export const dgClaimNodes = [
  claim('dg:claim-tangent-equivalence', '两种切向量定义给出同一切空间', {
    discipline: '微分几何',
    case: 'dg',
    summary: '曲线等价类与导子之间存在保持线性结构与 Leibniz 法则的自然双射。',
    formula: '存在自然双射 T_p^{curve}M ≅ T_p^{derivation}M',
    evidenceStatus: 'PROOF',
    formal: { assumptions: ['M 为光滑流形，p ∈ M'], boundary: ['等价性在 C^∞ 结构下成立；有限 C^k 结构需另加表述约定。'] },
    representations: [],
    teaching: { evidenceStatus: 'PROOF', reviewQuestions: ['等价性证明中在哪里用到 Leibniz 法则？'] },
    provenance: { sources: [source('def/切向量两种定义的等价性.md')], note: provenanceNote + ' 本条为从源正文提炼出的断言节点，语料无独立定理文件。' },
    contentRef: false,
  }),
  claim('dg:claim-d-squared-zero', '外微分平方为零', {
    discipline: '微分几何',
    case: 'dg',
    summary: '对任意微分形式 ω 有 d(dω) = 0。',
    formula: '∀ω ∈ Ω^p(M). d(dω) = 0',
    evidenceStatus: 'PROOF',
    formal: { assumptions: ['ω 为光滑微分形式'], boundary: ['对光滑形式成立；非光滑情形需另加条件。'] },
    representations: [],
    teaching: { evidenceStatus: 'PROOF', reviewQuestions: ['d²=0 在坐标下化为什么恒等式？'] },
    provenance: { sources: [source('def/外微分平方为零.md')], note: provenanceNote + ' 本条为从源正文提炼出的断言节点，语料无独立定理文件。' },
    contentRef: false,
  }),
];

const byId = new Map(spec.map((item) => [item.id, item]));
// 断言节点也参与来源查找：行动契约的 witness.ref 要能指回源文件。
const claimSource = {
  'dg:claim-tangent-equivalence': 'def/切向量两种定义的等价性.md',
  'dg:claim-d-squared-zero': 'def/外微分平方为零.md',
};
const sourceOf = (id) => byId.get(id)?.source ?? claimSource[id] ?? null;

/** 行动契约的输入取自各源文件「必备知识」里语料自己引用的概念。 */
const actionSpecs = [
  ['a-dg:topological-space', 'definition', '引入拓扑空间', [], ['dg:topological-space']],
  ['a-dg:metric-space', 'definition', '引入度量空间', [], ['dg:metric-space']],
  ['a-dg:homeomorphism', 'definition', '引入同胚', ['dg:topological-space'], ['dg:homeomorphism']],
  ['a-dg:compactness', 'definition', '引入紧致性', ['dg:topological-space'], ['dg:compactness']],
  ['a-dg:metric-completeness', 'definition', '引入度量完备性', ['dg:metric-space'], ['dg:metric-completeness']],
  ['a-dg:manifold', 'definition', '引入流形', ['dg:topological-space', 'dg:homeomorphism'], ['dg:manifold', 'dg:topological-manifold']],
  ['a-dg:coordinate-chart', 'definition', '引入坐标图', ['dg:topological-manifold'], ['dg:coordinate-chart']],
  ['a-dg:smooth-atlas', 'definition', '引入光滑图册', ['dg:manifold', 'dg:coordinate-chart'], ['dg:smooth-atlas']],
  ['a-dg:smooth-structure', 'definition', '引入光滑结构', ['dg:topological-manifold', 'dg:smooth-atlas'], ['dg:smooth-structure']],
  ['a-dg:smooth-manifold', 'definition', '引入光滑流形', ['dg:topological-space', 'dg:smooth-atlas', 'dg:homeomorphism'], ['dg:smooth-manifold']],
  ['a-dg:partition-of-unity', 'deduction', '构造单位分解', ['dg:smooth-manifold', 'dg:compactness'], ['dg:partition-of-unity']],
  ['a-dg:smooth-embedding', 'definition', '引入光滑嵌入', ['dg:smooth-manifold'], ['dg:smooth-embedding']],
  ['a-dg:tangent-bundle', 'construction', '构造切丛', ['dg:smooth-manifold', 'dg:tangent-coordinate-basis'], ['dg:tangent-bundle']],
  ['a-dg:tangent-curve', 'definition', '用曲线定义切向量', ['dg:smooth-manifold'], ['dg:tangent-vector-curve']],
  ['a-dg:tangent-derivation', 'definition', '用导子定义切向量', ['dg:smooth-manifold'], ['dg:tangent-vector-derivation']],
  ['a-dg:tangent-equivalence', 'deduction', '证明两种切向量定义等价', ['dg:tangent-vector-curve', 'dg:tangent-vector-derivation'], ['dg:tangent-vector-equivalence']],
  ['a-dg:tangent-basis', 'construction', '给出切空间的坐标基', ['dg:smooth-manifold', 'dg:tangent-vector-derivation'], ['dg:tangent-coordinate-basis']],
  ['a-dg:vector-field', 'definition', '引入光滑向量场', ['dg:tangent-bundle'], ['dg:smooth-vector-field']],
  ['a-dg:distribution', 'definition', '引入光滑切分布', ['dg:tangent-bundle', 'dg:smooth-vector-field'], ['dg:smooth-distribution']],
  ['a-dg:tensor', 'definition', '引入张量', ['dg:smooth-manifold', 'bg:linear:vector'], ['dg:tensor', 'dg:tensor-product-dg']],
  ['a-dg:differential-form', 'definition', '引入微分形式', ['dg:smooth-manifold', 'dg:tensor'], ['dg:differential-form']],
  ['a-dg:form-wedge', 'definition', '引入外积', ['dg:differential-form'], ['dg:form-wedge-product']],
  ['a-dg:form-d-squared-zero', 'deduction', '证明外微分平方为零', ['dg:form-wedge-product'], ['dg:d-squared-zero']],
  ['a-dg:form-pullback', 'definition', '引入微分形式的拉回', ['dg:differential-form'], ['dg:form-pullback']],
  ['a-dg:implicit', 'deduction', '陈述隐函数定理', ['dg:inverse-function-theorem', 'bg:linear:vector'], ['dg:implicit-function-theorem']],
  ['a-dg:inverse', 'deduction', '陈述反函数定理', ['bg:real:metric', 'bg:linear:vector'], ['dg:inverse-function-theorem']],
  ['a-dg:stokes', 'deduction', '陈述广义 Stokes 定理', ['dg:differential-form', 'dg:form-pullback'], ['dg:generalized-stokes-theorem']],
  ['a-dg:poincare-lemma', 'deduction', '陈述 Poincaré 引理', ['dg:differential-form', 'dg:d-squared-zero'], ['dg:poincare-lemma']],
  // 两条从语料提炼的断言：概念节点 → 断言节点。
  ['a-dg:claim-tangent-equivalence', 'deduction', '证明两种切向量定义等价', ['dg:tangent-vector-curve', 'dg:tangent-vector-derivation'], ['dg:claim-tangent-equivalence']],
  // 输入是概念节点、输出是断言节点；若写成同一个 id，契约边会退化成自环而被丢弃。
  ['a-dg:claim-d-squared-zero', 'deduction', '证明外微分平方为零', ['dg:d-squared-zero', 'dg:form-wedge-product'], ['dg:claim-d-squared-zero']],
  // 误区模式节点也要有产出它们的行动，否则它们在网络视图里无法被引入。
  ['a-dg:pattern-manifold-is-surface', 'task', '登记「把流形当作嵌入曲面」误区', ['dg:smooth-manifold', 'dg:smooth-embedding'], ['dg:pattern-manifold-is-surface']],
  ['a-dg:pattern-global-coordinates', 'task', '登记「存在整体坐标」误区', ['dg:coordinate-chart', 'dg:smooth-atlas'], ['dg:pattern-global-coordinates']],
  ['a-dg:pattern-derivation-ignores-leibniz', 'task', '登记「线性即可」误区', ['dg:tangent-vector-derivation'], ['dg:pattern-derivation-ignores-leibniz']],
  ['a-dg:pattern-closed-implies-exact', 'task', '登记「闭即恰当」误区', ['dg:poincare-lemma', 'dg:differential-form'], ['dg:pattern-closed-implies-exact']],
];

export const dgActions = actionSpecs.map(([id, mode, title, inputs, outputs]) => action(
  id, mode, title,
  inputs.map((nodeId) => input(nodeId, nodeId.startsWith('bg:') ? ['statement', 'definition'] : ['definition', 'statement'])),
  outputs.map((nodeId) => output(nodeId, ['definition', 'statement'])),
  { witness: { type: 'declared-contract', status: 'DEF', ref: source(sourceOf(outputs[0])) } },
));

/**
 * 方法节点的引入行动。
 *
 * 与其它行动分开写：方法节点的输入按「要会用它，必须先有什么」来定，
 * 而不是按定义链；输出类型是 `method`，与概念/断言的契约区分开。
 */
export const dgMethodActions = [
  action('a-dg:method-inverse-check', 'method', '提出反函数定理核验法',
    [input('dg:inverse-function-theorem', ['statement', 'proof']), input('bg:linear:vector', ['statement', 'definition'])],
    [output('dg:method-inverse-check', ['method'])],
    { witness: { type: 'method-presentation', status: 'DEF', ref: source('thm/反函数定理.md') } }),
  action('a-dg:method-closed-form-test', 'method', '提出闭形式恰当性判定法',
    [input('dg:poincare-lemma', ['statement', 'proof']), input('dg:differential-form', ['definition', 'statement'])],
    [output('dg:method-closed-form-test', ['method'])],
    { witness: { type: 'method-presentation', status: 'DEF', ref: source('thm/Poincare 引理.md') } }),
];

/** 关系：只登记语料明确断言的包含与特化方向。 */
export const dgRelations = [
  relation('rel-dg-manifold-specialization', 'specialization', 'dg:topological-manifold', 'dg:manifold', { witness: { type: 'inverse-of-declared-generalization', status: 'DEF', ref: source('def/流形.md') }, scope: '流形的定义即为「Hausdorff + 局部欧氏」，与拓扑流形在该表述下重合。' }),
  relation('rel-dg-smooth-manifold-generalization', 'hardGeneralization', 'dg:topological-manifold', 'dg:smooth-manifold', { witness: { type: 'same-carrier-implication', status: 'DEF', ref: source('def/光滑流形.md') }, scope: '光滑流形是拓扑流形再加光滑图册；反过来不成立（同一拓扑流形可以有不兼容的光滑结构）。' }),
  relation('rel-dg-chart-application', 'application', 'dg:smooth-atlas', 'dg:coordinate-chart', { witness: { type: 'application-description', status: 'DEF', ref: source('def/光滑图册.md') }, task: '图册由坐标图构成，坐标图是图册的成员单位。' }),
  relation('rel-dg-tangent-basis-application', 'application', 'dg:tangent-coordinate-basis', 'dg:tangent-bundle', { witness: { type: 'application-description', status: 'DEF', ref: source('def/切丛.md') }, task: '切丛的局部平凡化用坐标基给出纤维的线性坐标。' }),
  relation('rel-dg-form-application', 'application', 'dg:form-wedge-product', 'dg:differential-form', { witness: { type: 'application-description', status: 'DEF', ref: source('def/微分形式的外积.md') }, task: '外积是微分形式代数上的基本运算。' }),
  relation('rel-dg-stokes-application', 'application', 'dg:generalized-stokes-theorem', 'dg:form-pullback', { witness: { type: 'application-description', status: 'DEF', ref: source('thm/广义 Stokes 定理.md') }, task: 'Stokes 定理的证明在拉回到 R^n 后进行。' }),
  // 与本站已有案例对接：不新建重复节点，用关系表达同名概念的位置。
  relation('rel-dg-crossdomain-smooth', 'crossDomain', 'dg:smooth-manifold', 'manifold:smooth-atlas', { witness: { type: 'cross-domain-interface', status: 'DEF', ref: source('def/光滑流形.md') }, scope: '本站 manifold 案例的 C^k/C^∞ 图册与微分几何笔记的光滑流形覆盖同一层概念；保留两处登记，不合并。', task: '两个案例对「光滑结构」的表述接口。' }),
  relation('rel-dg-crossdomain-tensor', 'crossDomain', 'dg:tensor', 'tensor:tensor-rs', { witness: { type: 'cross-domain-interface', status: 'DEF', ref: source('def/张量.md') }, scope: '本站 tensor 案例按 (r,s) 型登记张量；微分几何笔记用同一分层，两处对接而不互相覆盖。', task: '张量概念在两个案例之间的接口。' }),
  relation('rel-dg-crossdomain-manifold', 'crossDomain', 'dg:topological-manifold', 'manifold:top-manifold', { witness: { type: 'cross-domain-interface', status: 'DEF', ref: source('def/拓扑流形.md') }, scope: '两处登记同一层概念（局部欧氏 + Hausdorff）；本案例额外登记了量词式的局部同胚条件。', task: '拓扑流形表述的跨案例接口。' }),
  relation('rel-dg-crossdomain-background-topology', 'crossDomain', 'bg:top:space', 'dg:topological-space', { witness: { type: 'background-provides-topology', status: 'DEF' }, scope: '本站背景节点 bg:top:space 与微分几何笔记的拓扑空间是同一层；本案例给出开集公理的完整版本。', task: '点集拓扑背景的跨案例接口。' }),

  /*
   * 硬前置（`hardPrereq`）：**不用它，目标节点的定义就写不出来**。
   *
   * 只登记微分几何**核心链**上的依赖：拓扑空间 → 同胚/流形/紧致 → 坐标图 → 图册 → 光滑结构/光滑流形 →
   * 切向量 → 切丛 → 向量场/分布/张量 → 微分形式 → 拉回、外积、d²=0 → Poincaré 与 Stokes（含单位分解、嵌入）。
   * 例子、误区、方法、练习类节点不登记：它们不是「先有才能定义」的关系。
   *
   * 见证一律 `DEF` + `definitional-dependency`：依据是目标节点的定义文本本身，
   * 不冒充证明（这些是定义材料的依赖，不是定理）。scope 写明它出现在定义的哪一处。
   * 与既有 `specialization` / `hardGeneralization` / `application` 关系**并存**：
   * 那几类说「谁更一般」「怎么用」，这里说的是「没有它连定义都写不出来」——两回事。
   */
  relation('rel-dg-pre-top-homeo', 'hardPrereq', 'dg:topological-space', 'dg:homeomorphism', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '同胚的定义写着 f: X → Y 是一一对应且 f 与 f⁻¹ 都连续——连续与拓扑空间都来自这里。' },
    scope: 'X、Y 必须是拓扑空间；「f 连续」也要先有拓扑才有意义。',
  }),
  relation('rel-dg-pre-top-manifold', 'hardPrereq', 'dg:topological-space', 'dg:topological-manifold', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '局部欧氏空间的定义以 Hausdorff 空间（即拓扑空间）为起点。' },
    scope: 'M 是 Hausdorff 空间 + 每点有开邻域同胚于 R^n 的开子集：开、邻域、同胚三个词都预设了拓扑。',
  }),
  relation('rel-dg-pre-top-manifold-entry', 'hardPrereq', 'dg:topological-space', 'dg:manifold', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '本案例入口节点「流形」的定义同样以拓扑空间开头。' },
    scope: 'M 为 Hausdorff 空间、每点有邻域同胚于 R^n 的开子集——与拓扑流形同一层表述。',
  }),
  relation('rel-dg-pre-homeo-manifold', 'hardPrereq', 'dg:homeomorphism', 'dg:manifold', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定义里的「邻域同胚于 R^n 的开子集」逐字用到同胚。' },
    scope: '用户举的例子「同胚 → 流形」：没有同胚，局部欧氏这句话写不出来。',
  }),
  relation('rel-dg-pre-homeo-manifold-t', 'hardPrereq', 'dg:homeomorphism', 'dg:topological-manifold', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '局部坐标映射 φ: U → R^n 被要求是同胚。' },
    scope: 'φ(U) 为 R^n 中开集且 φ 为同胚——拓扑流形定义条目之一。',
  }),
  relation('rel-dg-pre-homeo-chart', 'hardPrereq', 'dg:homeomorphism', 'dg:coordinate-chart', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '坐标图就是 (U, φ)，其中 φ: U → φ(U) ⊆ R^n 为同胚。' },
    scope: '把「同胚」从坐标图的定义里去掉，(U, φ) 就只剩一个集合与一个映射，不再是坐标。',
  }),
  relation('rel-dg-pre-top-compactness', 'hardPrereq', 'dg:topological-space', 'dg:compactness', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '紧致性用开覆盖定义，开覆盖是拓扑空间的概念。' },
    scope: 'A 的任一开覆盖都有有限子覆盖——「开」由拓扑给出。',
  }),
  relation('rel-dg-pre-metric-completeness', 'hardPrereq', 'dg:metric-space', 'dg:metric-completeness', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '完备性说的是 Cauchy 序列收敛于 X 中的点——收敛与 Cauchy 都按度量 d 定义。' },
    scope: '没有度量就没有「距离小于 ε」，也就没有 Cauchy 序列。',
  }),
  relation('rel-dg-pre-chart-atlas', 'hardPrereq', 'dg:coordinate-chart', 'dg:smooth-atlas', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '图册 A = {(U_α, φ_α)} 是坐标图的集合，并额外要求覆盖与坐标变换 C^∞。' },
    scope: '用户举的例子「坐标图 → 光滑图册」：图册的每个成员都是坐标图。',
  }),
  relation('rel-dg-pre-manifold-atlas', 'hardPrereq', 'dg:topological-manifold', 'dg:smooth-atlas', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '图册的 U_α 是 M 的开集，「覆盖 M」也以 M 的拓扑为前提。' },
    scope: '图册长在拓扑流形上；同一个坐标图集合放在别的底上不构成图册。',
  }),
  relation('rel-dg-pre-atlas-structure', 'hardPrereq', 'dg:smooth-atlas', 'dg:smooth-structure', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '光滑结构 σ 定义为 M 上的极大光滑图册（等价于相容光滑图册的等价类）。' },
    scope: '极大化这一步的对象就是图册。',
  }),
  relation('rel-dg-pre-atlas-smooth-manifold', 'hardPrereq', 'dg:smooth-atlas', 'dg:smooth-manifold', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '光滑流形的定义是「存在图册使所有坐标变换 φ_β∘φ_α⁻¹ 为 C^∞」。' },
    scope: '注意这里是**存在**一个图册，而不是指定某一个——所以依赖的是图册这个概念。',
  }),
  relation('rel-dg-pre-manifold-smooth-manifold', 'hardPrereq', 'dg:topological-manifold', 'dg:smooth-manifold', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '光滑流形被定义为「带光滑结构的拓扑流形」，并要求 Hausdorff、第二可数。' },
    scope: '`rel-dg-smooth-manifold-generalization` 登记的是「谁更一般」；这里登记的是「定义材料」。',
  }),
  relation('rel-dg-pre-smooth-tangent-curve', 'hardPrereq', 'dg:smooth-manifold', 'dg:tangent-vector-curve', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '曲线定义用「经过 p 的光滑曲线 γ」与局部坐标 (φ∘γ)′(0)。' },
    scope: '光滑曲线与局部坐标都要求 M 是光滑流形。',
  }),
  relation('rel-dg-pre-smooth-tangent-derivation', 'hardPrereq', 'dg:smooth-manifold', 'dg:tangent-vector-derivation', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '导子定义在 C^∞(M)（光滑函数芽）上，光滑结构决定了哪些函数是光滑的。' },
    scope: '换成拓扑流形，C^∞(M) 无从谈起，Leibniz 法则那套也就落空。',
  }),
  relation('rel-dg-pre-curve-equivalence', 'hardPrereq', 'dg:tangent-vector-curve', 'dg:tangent-vector-equivalence', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '等价性断言的一侧就是曲线等价类。' },
    scope: '两种定义的对应：去掉任何一侧，命题没有主语。',
  }),
  relation('rel-dg-pre-derivation-equivalence', 'hardPrereq', 'dg:tangent-vector-derivation', 'dg:tangent-vector-equivalence', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '另一侧是满足 Leibniz 法则的导子。' },
    scope: '同一条断言的另一半材料。',
  }),
  relation('rel-dg-pre-derivation-basis', 'hardPrereq', 'dg:tangent-vector-derivation', 'dg:tangent-coordinate-basis', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '坐标基定义为 (∂/∂u^i)(f) = ∂(f∘φ⁻¹)/∂x^i——∂/∂u^i 就是一个导子。' },
    scope: '基向量按导子作用在函数上定义；没有导子的语言，这组基写不出来。',
  }),
  relation('rel-dg-pre-basis-bundle', 'hardPrereq', 'dg:tangent-coordinate-basis', 'dg:tangent-bundle', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: 'TM = ⊔_{p∈M} T_pM，而 T_pM 的坐标刻画由这组基给出。' },
    scope: '切丛的 2n 维光滑结构与局部平凡化都按坐标基表述。',
  }),
  relation('rel-dg-pre-bundle-vector-field', 'hardPrereq', 'dg:tangent-bundle', 'dg:smooth-vector-field', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '光滑向量场定义为切丛的光滑截面 X: M → TM 且 π∘X = id_M。' },
    scope: '投影 π 与全空间 TM 都来自切丛。',
  }),
  relation('rel-dg-pre-bundle-distribution', 'hardPrereq', 'dg:tangent-bundle', 'dg:smooth-distribution', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '光滑切分布定义为切丛的子丛：每点 p 映为 T_pM 的 k 维子空间。' },
    scope: '「子丛」「T_pM」两个词都要先有切丛。',
  }),
  relation('rel-dg-pre-bundle-form', 'hardPrereq', 'dg:tangent-bundle', 'dg:differential-form', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: 'p 次形式是 ⋀^p T*M 的光滑截面；T*M 是切丛的对偶丛。' },
    scope: '余切丛依附于切丛，因此形式的载体来自切丛。',
  }),
  relation('rel-dg-pre-tensor-product-tensor', 'hardPrereq', 'dg:tensor-product-dg', 'dg:tensor', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: 'T ∈ T^r_s(V) 里的 T^r_s 由 V 与 V* 的张量积构成。' },
    scope: '多重线性函数的定义域与值域按张量积组织；没有 ⊗ 就没有 (r,s) 这套指标。',
  }),
  relation('rel-dg-pre-tensor-form', 'hardPrereq', 'dg:tensor', 'dg:differential-form', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: 'p 次形式是**反对称**的多重线性形式——多重线性这一层来自张量。' },
    scope: '形式的取值规则（吃 p 个向量、对每个变量线性）就是张量的定义，再加反对称条件。',
  }),
  relation('rel-dg-pre-wedge-form', 'hardPrereq', 'dg:form-wedge-product', 'dg:differential-form', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: 'Ω^•(M) 的代数结构由外积给出（f∧g = (−1)^{rs} g∧f）。' },
    scope: '形式不只是截面：它是一个代数里的元素，乘法的定义来自外积。',
  }),
  relation('rel-dg-pre-form-pullback', 'hardPrereq', 'dg:differential-form', 'dg:form-pullback', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: 'f*ω 由 (f*ω)_p(v_1,…) = ω_{f(p)}(f_{*p}v_1,…) 定义，两侧都是微分形式。' },
    scope: '拉回是形式的运算；没有形式就没有被拉回的对象。',
  }),
  relation('rel-dg-pre-form-d2', 'hardPrereq', 'dg:differential-form', 'dg:d-squared-zero', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '恒等式 d(dω) = 0 对任意微分形式 ω 陈述。' },
    scope: '外微分算子 d 作用在形式上——没有形式，这条恒等式没有定义域。',
  }),
  relation('rel-dg-pre-wedge-d2', 'hardPrereq', 'dg:form-wedge-product', 'dg:d-squared-zero', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: 'd 的刻画里含 Leibniz 型法则 d(ω∧η) = dω∧η + (−1)^p ω∧dη。' },
    scope: '外微分是外代数上的反导子；这条恒等式的证明要用外积与它的次数。',
  }),
  relation('rel-dg-pre-form-poincare', 'hardPrereq', 'dg:differential-form', 'dg:poincare-lemma', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '「若 dω = 0 则存在 η 使 ω = dη」——ω、η 都是微分形式。' },
    scope: '闭形式与恰当形式的定义都以形式为载体。',
  }),
  relation('rel-dg-pre-d2-poincare', 'hardPrereq', 'dg:d-squared-zero', 'dg:poincare-lemma', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '「闭」写作 dω = 0、「恰当」写作 ω = dη，两个词都用 d；d²=0 说明恰当必闭。' },
    scope: '这条引理比较的正是这两个条件，而条件由 d 定义。',
  }),
  relation('rel-dg-pre-form-stokes', 'hardPrereq', 'dg:differential-form', 'dg:generalized-stokes-theorem', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '∫_M dω = ∫_{∂M} ω 里的 ω 是具紧支集的 (n−1) 形式。' },
    scope: '被积对象是形式；定向与带边结构也按形式积分定义。',
  }),
  relation('rel-dg-pre-manifold-stokes', 'hardPrereq', 'dg:smooth-manifold', 'dg:generalized-stokes-theorem', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定理陈述要求 M 为带边定向光滑流形。' },
    scope: '带边流形的边界 ∂M、定向与积分都建立在光滑流形之上。',
  }),
  relation('rel-dg-pre-smooth-partition', 'hardPrereq', 'dg:smooth-manifold', 'dg:partition-of-unity', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '单位分解是 M 上的光滑函数族，且每个 supp g_i 含于某个坐标域 U_α。' },
    scope: '「光滑函数」「坐标域」「紧支集」三个词都要先有光滑流形。',
  }),
  relation('rel-dg-pre-compact-partition', 'hardPrereq', 'dg:compactness', 'dg:partition-of-unity', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定义要求支集紧致、族局部有限——「紧」与「局部有限」按覆盖的语言表述。' },
    scope: '存在性证明用的正是「紧致的开覆盖有有限子覆盖」这一步。',
  }),
  relation('rel-dg-pre-manifold-embedding', 'hardPrereq', 'dg:smooth-manifold', 'dg:smooth-embedding', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '光滑嵌入定义为光滑流形之间的单浸入 f: M → N，且 f 是到其像上的同胚。' },
    scope: '源与靶都是光滑流形；「浸入」按切映射定义。',
  }),
  /*
   * 这一条与上面 45 条**不是同一类依赖**（2026-10 改）：
   * 上面说的是「不用它，目标节点的定义就写不出来」；这一条说的是「目标的证明用到它」。
   *
   * 原先它混在 `DEF` + `definitional-dependency` 里，只在 scope 里用一句话注明，
   * 从数据上看不出区别（第五十二轮的欠账）。现在见证类型可区分：
   * `proof-dependency` + `PROOF` + `ref` 指向一条**同时列出两端节点**的证据记录，
   * 由 core/ontology.mjs 的校验器核对——引用必须存在、状态必须是 PROOF、两端都必须在证据里。
   */
  relation('rel-dg-pre-inverse-implicit', 'hardPrereq', 'dg:inverse-function-theorem', 'dg:implicit-function-theorem', {
    witness: { type: 'proof-dependency', status: 'PROOF', ref: 'ev-dg-inverse-implicit', scope: '隐函数定理的标准推导把方程 F(x,y)=0 化为 (x,y) ↦ (x, F(x,y))，再用反函数定理。' },
    scope: '推导依赖：隐函数定理的陈述里没有反函数定理，但它的证明要用；依据见证据 ev-dg-inverse-implicit（尚未编码成证书）。',
  }),
];

/** 证据：语料是笔记，因此全部为 prose-proof / DEF / REF，不签发机器认证。 */
export const dgEvidence = [
  ...spec.map((item) => evidence(
    `ev-dg-${item.id.replace(/^dg:/, '')}`,
    'prose-proof',
    'PROOF',
    'not_run',
    `${item.title}：源笔记的正文证明与推导`,
    {
      scope: `正文由 ${source(item.source)} 的只读快照提供；本证据只声明「存在正文级论证」，不声明机器核验。`,
      nodes: [item.id],
      obligations: ['机器编码为第 02 章 ND 证书', '逐条核对定义与定理表述的等价性'],
      reference: source(item.source),
    },
  )),
  /*
   * 推导依赖的证据（2026-10 加）：
   * `hardPrereq` 里 `witness.type = 'proof-dependency'` 的边必须指向一条**同时列出两端节点**的证据，
   * 校验器据此核对「引用存在 + 状态 PROOF + 两端都在证据里」。
   * 这条依赖是站内两处定理陈述之间的推导关系（见 thm/反函数定理.md 与 thm/隐函数定理.md），
   * 尚未编码成 ND 证书——义务里如实写着。
   */
  evidence('ev-dg-inverse-implicit', 'prose-proof', 'PROOF', 'not_run',
    '隐函数定理的推导依赖反函数定理', {
      scope: '把 F(x,y)=0 化为 (x,y) ↦ (x, F(x,y)) 的反函数问题，再调用反函数定理；依据是两处定理的正文与站内推导叙述。',
      nodes: ['dg:inverse-function-theorem', 'dg:implicit-function-theorem'],
      obligations: [
        '把这条推导编码为第 02 章 ND 证书（目前只是正文级叙述）',
        '核对两处定理陈述的前提是否逐条对齐（开集、C¹、雅可比可逆）',
      ],
      reference: `${source('thm/反函数定理.md')}；${source('thm/隐函数定理.md')}`,
    }),
];

export const dgMethodEvidence = [
  evidence('ev-dg-method-inverse-check', 'prose-proof', 'DEF', 'not_run', '反函数定理核验法：提炼自源文件正文的推导步骤', {
    scope: '方法本身是操作步骤，不是可证命题；本证据只声明「步骤与源文件一致」，不声明它是定理。',
    nodes: ['dg:method-inverse-check'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对提炼出的步骤是否遗漏源文件的前置条件'],
    reference: source('thm/反函数定理.md'),
  }),
  evidence('ev-dg-method-closed-form-test', 'prose-proof', 'DEF', 'not_run', '闭形式恰当性判定法：提炼自源文件正文的推导步骤', {
    scope: '方法本身是操作步骤，不是可证命题；本证据只声明「步骤与源文件一致」，不声明它是定理。',
    nodes: ['dg:method-closed-form-test'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对不可缩区域的处理是否与源文件一致'],
    reference: source('thm/Poincare 引理.md'),
  }),
];

export const dgSupport = [
  support('sup-dg-manifold-expr', 'dg:manifold', 'expression', 'known', { set: ['dg:topological-space', 'dg:homeomorphism'], minimal: true, evidence: ['ev-dg-manifold'] }),
  support('sup-dg-smooth-manifold-expr', 'dg:smooth-manifold', 'expression', 'known', { set: ['dg:topological-space', 'dg:smooth-atlas', 'dg:homeomorphism'], minimal: false, evidence: ['ev-dg-smooth-manifold'] }),
  support('sup-dg-tangent-equivalence-proof', 'dg:tangent-vector-equivalence', 'proof', 'known', { set: ['dg:tangent-vector-curve', 'dg:tangent-vector-derivation'], minimal: true, evidence: ['ev-dg-tangent-vector-equivalence'] }),
  support('sup-dg-d-squared-zero-proof', 'dg:d-squared-zero', 'proof', 'known', { set: ['dg:form-wedge-product'], minimal: true, evidence: ['ev-dg-d-squared-zero'] }),
  // 未登记支持记录时保留 Unknown，不把「没查」写成空集。
  support('sup-dg-partition-route', 'dg:partition-of-unity', 'route', 'unknown', { reason: '源笔记未登记路线级输入支持；未知不等于空支持。' }),
];

export const dgClaims = [
  claimRecord('claim-dg-tangent-equivalence', 'dg:claim-tangent-equivalence', '曲线定义与导子定义给出的切空间自然同构。', ['ev-dg-tangent-vector-equivalence']),
  claimRecord('claim-dg-d-squared-zero', 'dg:claim-d-squared-zero', '对任意微分形式 ω，d(dω)=0。', ['ev-dg-d-squared-zero']),
  claimRecord('claim-dg-stokes', 'dg:generalized-stokes-theorem', '在带边定向光滑流形上 ∫_M dω = ∫_{∂M} ω。', ['ev-dg-generalized-stokes-theorem']),
  claimRecord('claim-dg-poincare', 'dg:poincare-lemma', '可缩开集上的闭形式都是恰当形式。', ['ev-dg-poincare-lemma']),
];

export const dgPatterns = spec.filter((item) => item.construct === 'MisconceptionPattern').map((item) => ({
  id: item.id,
  node: item.id,
  anchors: item.anchors,
  title: item.title,
}));

export const dgAggregates = [
  {
    id: 'agg-dg', kind: 'topic', title: '微分几何：机制与切空间',
    blocks: [
      ['dg:topological-space', 'dg:homeomorphism', 'dg:manifold', 'dg:topological-manifold', 'dg:coordinate-chart', 'dg:smooth-structure', 'dg:smooth-atlas', 'dg:smooth-manifold'],
      ['dg:partition-of-unity', 'dg:compactness', 'dg:metric-space', 'dg:metric-completeness'],
      ['dg:tangent-vector-curve', 'dg:tangent-vector-derivation', 'dg:tangent-vector-equivalence', 'dg:tangent-coordinate-basis', 'dg:tangent-bundle', 'dg:smooth-vector-field', 'dg:smooth-distribution', 'dg:smooth-embedding'],
      ['dg:tensor', 'dg:tensor-product-dg', 'dg:differential-form', 'dg:form-wedge-product', 'dg:d-squared-zero', 'dg:form-pullback', 'dg:generalized-stokes-theorem', 'dg:poincare-lemma'],
      ['dg:implicit-function-theorem', 'dg:inverse-function-theorem'],
      // 方法节点单独成块：它们是「怎么算」，与前面的概念块不是同一类成员。
      ['dg:method-inverse-check', 'dg:method-closed-form-test'],
    ],
    note: '话题块按源笔记的组织方式分组；块之间可重叠，不把成员关系读成必修链。',
  },
];

export const dg = {
  nodes: [...dgNodes, ...dgClaimNodes, ...dgMethodNodes],
  actions: [...dgActions, ...dgMethodActions],
  relations: dgRelations,
  evidence: [...dgEvidence, ...dgMethodEvidence],
  support: dgSupport,
  claims: dgClaims,
  patterns: dgPatterns,
  aggregates: dgAggregates,
};

// 供接线时核对：案例覆盖的节点数与最大前置深度。
export const dgSummary = {
  nodeCount: dgNodes.filter((item) => item.construct !== 'MisconceptionPattern').length,
  claimNodeCount: dgClaimNodes.length,
  methodNodeCount: dgMethodNodes.length,
  patternCount: dgPatterns.length,
  actionCount: dgActions.length + dgMethodActions.length,
  relationCount: dgRelations.length,
  evidenceCount: dgEvidence.length + dgMethodEvidence.length,
};
