import { symbol, theoryNode, method, action, input, output } from '../authoring.mjs';

const provenance = { sources: ['专稿：第 01–04 章与附录 E'], note: '共享背景只在声明范围内使用；未编码部分保留为边界。' };

/*
 * 背景节点的证据等级（2026-10 补）。
 *
 * 这九个背景节点原先一个都没有 `teaching.evidenceStatus`——节点页与列表页因此显示不出
 * 它们的证据等级（界面上是「没有标签」而不是「不声称」）。补的时候按**节点在做什么**取值，
 * 取值口径与各案例一致（见 README 的证据等级表）：
 * - 符号与背景理论是**声明**（本站把它们当作声明的背景使用，不在这里证什么）→ `DEF`；
 * - 全局方法是操作步骤而不是可证命题 → `ILLUSTRATION`（与其它方法节点同档）。
 */
const DECLARED = { evidenceStatus: 'DEF' };
const ILLUSTRATION = { evidenceStatus: 'ILLUSTRATION' };

export const backgroundNodes = [
  symbol('bg:logic:quantifier', '量词与全称/存在陈述', {
    discipline: '数理逻辑', summary: '有限公式中的全称、存在与量词次序。',
    declaration: '全称量词 ∀ 与存在量词 ∃ 作为逻辑常元使用', type: 'o',
    formal: { symbols: ['∀', '∃'], boundary: ['对象语言的完整语法与语义在专稿第 02–03 章；本站只编码使用片段。'] },
    teaching: DECLARED,
    contentRef: false, provenance,
  }),
  symbol('bg:logic:equality', '等式与替换', {
    discipline: '数理逻辑', summary: '等式的自反、对称、传递与在指定上下文中的替换。',
    declaration: '有类型等式的自反与替换规则', type: 'o',
    formal: { symbols: ['='], boundary: ['替换的变量条件与捕获避免由检查器核验。'] },
    teaching: DECLARED,
    contentRef: false, provenance,
  }),
  symbol('bg:set:function', '函数、复合与逆', {
    discipline: '集合论', summary: '函数、复合、单射、满射与逆映射的最低接口。',
    declaration: '函数作为有类型的映射；复合与逆按集合论复合定义', type: 'o',
    formal: { symbols: ['∘', '⁻¹'], boundary: ['具体定义域与陪域随案例声明。'] },
    teaching: DECLARED,
    contentRef: false, provenance,
  }),
  theoryNode('bg:real:metric', '实数度量背景', {
    discipline: '分析', summary: '实数、绝对值、序与距离 d(x,y)=|x−y| 的共享背景。',
    formal: {
      language: '实数排序、序关系与二元距离函数',
      calculus: '经典一阶逻辑片段',
      modules: [{ id: 'M_real_metric', status: 'background-assumed', note: '本站在四案例中作为声明背景使用，未编码实数完备性定理。' }],
      symbols: ['R', 'd', '|·|', '<'],
      boundary: ['实数完备性、确界定理与度量空间一般理论未在本站形式化。'],
    },
    teaching: DECLARED,
    contentRef: false, provenance,
  }),
  theoryNode('bg:linear:vector', '向量空间与线性映射', {
    discipline: '线性代数', summary: '域、向量空间、线性映射、对偶、张量积与有限维基。',
    formal: {
      language: '向量空间与线性映射的多排序语言',
      calculus: '经典简单类型论片段',
      modules: [{ id: 'M_linear', status: 'background-assumed', note: '有限维与基的存在性按案例条件声明。' }],
      symbols: ['F', 'V', 'Hom', '⊗', 'End'],
      boundary: ['一般模论与无限维线性代数未在本站形式化。'],
    },
    teaching: DECLARED,
    contentRef: false, provenance,
  }),
  theoryNode('bg:top:space', '拓扑空间与局部欧氏性', {
    discipline: '拓扑', summary: '拓扑空间、开集、连续映射、同胚、覆盖与第二可数性。',
    formal: {
      language: '拓扑空间与连续映射语言',
      calculus: '经典一阶逻辑片段',
      modules: [{ id: 'M_topology', status: 'background-assumed', note: 'Hausdorff 与第二可数性在案例 02 中显式声明。' }],
      symbols: ['τ', 'U', 'f', '≅'],
      boundary: ['一般拓扑的分离公理与紧性理论未在本站展开。'],
    },
    teaching: DECLARED,
    contentRef: false, provenance,
  }),
  theoryNode('bg:manifold:calc', '多元微分与 C^k 正则性', {
    discipline: '分析', summary: 'R^n 上的 C^k 映射、复合、局部性与链式法则。',
    formal: {
      language: '有限维实向量空间上的可微映射语言',
      calculus: '经典分析片段',
      modules: [{ id: 'M_multivariable', status: 'background-assumed', note: '链式法则与 C^k 复合封闭性作为声明背景。' }],
      symbols: ['C^k', 'C^∞', 'd'],
      boundary: ['反函数定理、隐函数定理与光滑化定理未在本站形式化。'],
    },
    teaching: DECLARED,
    contentRef: false, provenance,
  }),
  theoryNode('bg:group:binary', '二元运算与群公理模板', {
    discipline: '群论', summary: '二元运算、结合律、单位元、逆元与子群接口。',
    formal: {
      language: '带二元运算与常元的多排序语言',
      calculus: '经典一阶逻辑片段',
      modules: [{ id: 'M_group_axioms', status: 'background-assumed', note: '群公理作为模板；具体结构仍需逐项检查。' }],
      symbols: ['·', 'e', '⁻¹'],
      boundary: ['同态基本定理与自由群理论未在本站展开。'],
    },
    teaching: DECLARED,
    contentRef: false, provenance,
  }),
  method('bg:misc:counterexample-method', '构造反例的方法', {
    discipline: '数学方法', scope: '全局方法',
    summary: '对目标命题逐条件削弱，构造满足其余条件而使结论失败的实例。',
    In: '一个含全称词或条件的候选命题', Out: '候选反例、失败见证与否定范围',
    Pre: '命题的量词、方向与条件已写清', Post: '反例实例、失败见证与不延伸的否定范围',
    Use: ['专稿第 14 章反例集', '各案例的条件反例'], Demo: ['limit:constant-seq', 'tensor:non-tensor-gamma', 'group:noncomm'],
    Fail: '条件其实冗余或反例只否定过度推广时，必须如实记录，不把充分条件假装成必要条件。',
    body: '先写出目标的全称形式，再删去或削弱一个条件，固定其余条件，搜索使结论失败的最小实例。',
    formal: { symbols: ['counterexample'], boundary: ['本方法只产生候选与失败见证；反例是否成立仍需逐项核验。'] },
    teaching: ILLUSTRATION,
    contentRef: false, provenance,
  }),
];

/**
 * 背景侧的行动契约（2026-10 补）。
 *
 * 为什么要有：`bg:misc:counterexample-method` 是本库唯一**既没有任何关系、也没有任何契约**
 * 的节点——它在网络视图里无法被引入，节点页的「行动」一栏永远是空的（见 `data/relation-coverage.mjs`
 * 里的孤立类）。其它案例的方法节点都有自己的 `mode: 'method'` 行动，
 * 这里按同一形状补上：输入是它演示过的三个反例，输出是方法本身。
 *
 * 输入只声明「要用这个方法，先得见过这些反例」，不声称这些反例是方法的必要条件。
 */
export const backgroundActions = [
  action('a-bg:counterexample-method', 'method', '提出构造反例的方法',
    [
      input('limit:constant-seq', ['statement']),
      input('tensor:non-tensor-gamma', ['statement']),
      input('group:noncomm', ['statement']),
    ],
    [output('bg:misc:counterexample-method', ['method'])],
    { witness: { type: 'method-presentation', status: 'ILLUSTRATION', ref: '专稿第 14 章反例集与各案例的条件反例' } }),
];
