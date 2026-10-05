import { backgroundNodes, backgroundActions } from './cases/background.mjs';
import { limit } from './cases/limit.mjs';
import { manifold } from './cases/manifold.mjs';
import { tensor } from './cases/tensor.mjs';
import { group } from './cases/group.mjs';
import { dg } from './cases/dg.mjs';
import { liang } from './cases/liang.mjs';
import { rudin } from './cases/rudin.mjs';
import { attachFormalStatements } from './formal-statements.mjs';
import { applyGranularity } from './granularity.mjs';
import { ROLES } from '../shared/contracts.mjs';

const SHARED_TEMPLATE_FIELDS = [
  '身份与角色', '问题动机', '直觉与表征', '正式负载', '概念支持', '公开入口与输出',
  '例子与边界', '一般误区模式', '自检任务', '应用与迁移', '可选结构路线', '来源与证据状态',
];

const ROLE_TEMPLATE_NOTES = {
  Concept: '对象与边界、等价与判别、认知入口、结构联系、自检维度。',
  Definition: '新符号、定义主体、合法性、保守性、解释与练习。',
  Axiom: '所属理论、精确公式、成员见证、独立性与一致性边界。',
  Theorem: '前提、结论、证明或引用证据、逐条件反例、适用范围。',
  Property: '用途、证据状态、条件与失效边界。',
  Proof: '目标 Claim、有限证书代码、检查状态与开放假设。',
  Example: '概念引用、对象规格、满足断言与验证方式。',
  Counterexample: '精确目标、对象规格、失败见证与否定的范围。',
  Problem: '输入输出、目标规格、约束与解决来源。',
  Theory: '语言、演算、公理呈现或模块引用、一致性边界。',
  Construction: '输入输出、有限步骤、验证目标与终止性。',
  GlobalMethod: '全局范围、任务接口、启发体、公共案例与失效范围。',
  LocalMethod: '局部适用范围、任务接口、启发体与失效范围。',
};

const templates = ROLES.map((role) => ({
  role,
  title: role,
  sharedFields: SHARED_TEMPLATE_FIELDS,
  specificFields: ROLE_TEMPLATE_NOTES[role],
  note: '未知字段保留 Unknown；空白不代表已查明，教学效果另由外部模型评价。',
}));

const signature = {
  version: '1',
  baseTypes: [
    { name: 'o', note: '真值类型' },
    { name: 'R', note: '实数排序名；本站不编码完备性定理' },
    { name: 'N', note: '自然数排序名' },
    { name: 'Set', note: '集合排序' },
    { name: 'Function', note: '函数排序' },
    { name: 'TopSpace', note: '拓扑空间排序' },
    { name: 'Manifold', note: '流形排序' },
    { name: 'VectorSpace', note: '向量空间排序' },
    { name: 'Field', note: '域排序' },
    { name: 'Matrix', note: '矩阵排序' },
    { name: 'Group', note: '群排序' },
    { name: 'Atlas', note: '图册排序' },
    { name: 'Bundle', note: '丛排序' },
    { name: 'Open', note: '开集排序' },
    { name: 'Fun', note: '未定型函数排序' },
  ],
  constants: [
    { name: 'd', type: 'R -> R -> R', note: '实数距离' },
    { name: '·', type: 'Group -> Group -> Group', note: '群乘法占位' },
    { name: 'e', type: 'Group', note: '群单位元占位' },
    { name: '⊗', type: 'VectorSpace -> VectorSpace -> VectorSpace', note: '张量积占位' },
    { name: '∘', type: 'Fun -> Fun -> Fun', note: '复合' },
    { name: '=', type: 'o', note: '等式逻辑常元' },
    { name: '∀', type: 'o', note: '全称量词' },
    { name: '∃', type: 'o', note: '存在量词' },
  ],
  note: '基本类型与常元只覆盖四案例使用片段；不是完整核心签名，完整清单见专稿附录 E。',
};

const theory = {
  id: 'T_cases',
  title: '四案例公共背景与推理白名单',
  calculus: '经典外延简单类型论 + 多排序自然演绎白名单子集；经典反证、析取规则与一般派生规则尚未实现。',
  axioms: [
    { id: 'ax-eq-refl', statement: '∀x. x=x', kind: '逻辑公理' },
    { id: 'ax-eq-subst', statement: '在指定自由变量上下文中的等式替换', kind: '逻辑公理' },
    { id: 'ax-imp-elim', statement: '由 φ 与 φ⇒ψ 推出 ψ', kind: '推理规则' },
    { id: 'ax-imp-intro', statement: '由假设 φ 下推出 ψ 得 φ⇒ψ', kind: '推理规则' },
    { id: 'ax-and-intro', statement: '由 φ 与 ψ 推出 φ∧ψ', kind: '推理规则' },
    { id: 'ax-and-elim', statement: '由 φ∧ψ 分别推出 φ 与 ψ', kind: '推理规则' },
    { id: 'ax-forall-intro', statement: '本征变量条件下引入全称量词', kind: '推理规则' },
    { id: 'ax-forall-elim', statement: '全称实例化', kind: '推理规则' },
    { id: 'ax-exists-intro', statement: '存在引入', kind: '推理规则' },
    { id: 'ax-exists-elim', statement: '存在消去；见证变量不得泄漏到结论', kind: '推理规则' },
  ],
  modules: [
    { id: 'M_real_metric', title: '实数度量背景', status: 'background-assumed', note: '完备性与确界定理未形式化。' },
    { id: 'M_linear', title: '有限维线性代数背景', status: 'background-assumed', note: '基与维数按案例条件使用。' },
    { id: 'M_topology', title: '拓扑背景', status: 'background-assumed', note: '分离公理与第二可数性在案例 02 显式声明。' },
    { id: 'M_multivariable', title: '多元微分背景', status: 'background-assumed', note: '链式法则与 C^k 复合封闭性未形式化。' },
    { id: 'M_group_axioms', title: '群公理模板', status: 'background-assumed', note: '具体结构仍需逐项检查。' },
  ],
  note: '公理与规则白名单对应现有检查器 mcs-nd-subset/1；白名单之外的推理返回 unsupported，不冒称已实现。',
};

const environmentBoundary = {
  refs: [
    'env:ZFC-metatheory',
    'env:full-hol-checker',
    'env:reference-stillwell',
    'env:reference-classical-texts',
    'env:teaching-experiment',
    'env:deeptutor-runtime',
  ],
  note: '环境边界声明未展开的元理论、检查器、文献与外部模型；未知引用保留为边界，不伪装成空依赖。',
};

const aggregates = [
  ...limit.aggregates,
  ...manifold.aggregates,
  ...tensor.aggregates,
  ...group.aggregates,
  ...dg.aggregates,
  ...liang.aggregates,
  ...rudin.aggregates,
  { id: 'agg-analysis', kind: 'discipline', title: '分析', blocks: [['limit:limit-ed', 'limit:seq-conv', 'limit:bridge', 'limit:continuous'], ['manifold:top-manifold', 'manifold:chart-atlas', 'manifold:ck-atlas'], ['dg:implicit-function-theorem', 'dg:inverse-function-theorem'], ['rudin:least-upper-bound', 'rudin:cauchy-sequence', 'rudin:continuous-function', 'rudin:derivative', 'rudin:uniform-convergence']], note: '学科聚合允许重叠与跨案例成员。' },
  { id: 'agg-algebra', kind: 'discipline', title: '代数', blocks: [['tensor:tensor-rs', 'tensor:end-iso', 'group:group-concept', 'group:cayley'], ['dg:tensor', 'dg:tensor-product-dg'], ['liang:tensor-field', 'liang:abstract-index'], ['rudin:complex-field', 'rudin:linear-transformation']], note: '学科聚合不把成员关系读成必修链。' },
  { id: 'agg-geometry', kind: 'discipline', title: '几何与拓扑', blocks: [['manifold:top-manifold', 'manifold:transition', 'tensor:bundle', 'tensor:field'], ['dg:smooth-manifold', 'dg:tangent-bundle', 'dg:smooth-embedding'], ['liang:manifold', 'liang:derivative-operator', 'liang:riemann-tensor'], ['rudin:differential-form', 'rudin:stokes-theorem']], note: '几何聚合保留跨领域接口。' },
  { id: 'agg-topology', kind: 'discipline', title: '拓扑', blocks: [['bg:top:space', 'dg:topological-space', 'dg:manifold', 'dg:topological-manifold', 'dg:homeomorphism', 'dg:compactness', 'dg:metric-space', 'dg:metric-completeness', 'dg:partition-of-unity'], ['liang:topological-space', 'liang:continuous-map', 'liang:compactness'], ['rudin:metric-space', 'rudin:compact-set', 'rudin:connected-set', 'rudin:countable-set']], note: '点集拓扑与流形的前置层；与几何聚合允许重叠成员。' },
  { id: 'agg-relativity', kind: 'discipline', title: '相对论与宇宙论', blocks: [['liang:minkowski-spacetime', 'liang:inertial-observer', 'liang:proper-time', 'liang:kinematic-effects', 'liang:four-momentum', 'liang:energy-momentum-tensor'], ['liang:gravity-as-geometry', 'liang:equivalence-principle', 'liang:tidal-deviation', 'liang:einstein-equation', 'liang:linearized-gravity'], ['liang:static-stationary', 'liang:schwarzschild-solution', 'liang:kruskal-extension', 'liang:schwarzschild-black-hole'], ['liang:cosmological-principle', 'liang:rw-metric', 'liang:hubble-redshift', 'liang:scale-factor', 'liang:new-standard-cosmology']], note: '教材案例引入的物理学科分支；与几何、拓扑聚合允许重叠成员。' },
  { id: 'agg-measure', kind: 'discipline', title: '测度论', blocks: [['rudin:set-function', 'rudin:lebesgue-measure', 'rudin:measurable-function', 'rudin:lebesgue-integral']], note: 'Rudin 案例第 11 章引入的分支；与「分析」聚合允许重叠成员。' },
];

export default {
  schema: 'mcs-web-ontology/1',
  signature,
  theory,
  // 形式表达在装配时贴上去：登记表与案例数据分开维护，挑选清单集中在一处可见（见 formal-statements.mjs）。
  // 粒度同理：判据与逐条判定结果集中在 granularity.mjs，案例文件不各写一份（第五十二轮只在 liang 里判过）。
  nodes: applyGranularity(attachFormalStatements([...backgroundNodes, ...limit.nodes, ...manifold.nodes, ...tensor.nodes, ...group.nodes, ...dg.nodes, ...liang.nodes, ...rudin.nodes])),
  actions: [...backgroundActions, ...limit.actions, ...manifold.actions, ...tensor.actions, ...group.actions, ...dg.actions, ...liang.actions, ...rudin.actions],
  relations: [...limit.relations, ...manifold.relations, ...tensor.relations, ...group.relations, ...dg.relations, ...liang.relations, ...rudin.relations],
  evidence: [...limit.evidence, ...manifold.evidence, ...tensor.evidence, ...group.evidence, ...dg.evidence, ...liang.evidence, ...rudin.evidence],
  support: [...limit.support, ...manifold.support, ...tensor.support, ...group.support, ...dg.support, ...liang.support, ...rudin.support],
  claims: [...limit.claims, ...manifold.claims, ...tensor.claims, ...group.claims, ...dg.claims, ...liang.claims, ...rudin.claims],
  patterns: [...limit.patterns, ...manifold.patterns, ...tensor.patterns, ...group.patterns, ...dg.patterns, ...liang.patterns, ...rudin.patterns],
  aggregates,
  templates,
  environmentBoundary,
};
