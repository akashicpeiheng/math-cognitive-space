import { concept, claim, proof, example, counterexample, construction, method, patternNode, problem, action, input, output, relation, evidence, support, claimRecord, representation, selfCheck, condition } from '../authoring.mjs';

// 学科按**对象**取值（2026-10 细分）：本案例的对象全是群、群元素与群作用，因此是「群论」，
// 而不是笼统的「代数」——原来的「代数」一支里还混着线性代数与张量代数（见 data/fields.mjs）。
const discipline = '群论';
const provenance = { sources: ['专稿：案例 04、第 10 与第 14 章', 'mcs-foundations/cases/04-群概念的多来源.md'], note: '三个入口共享抽象群目标；Cayley 桥梁单独登记。' };

export const groupNodes = [
  concept('group:group-concept', '群', {
    discipline, case: 'group', summary: '(G,·,e,inv) 满足结合律、单位元与逆元公理。',
    objectType: '带运算与常元的集合', parameters: ['G', '·', 'e', 'inv'], predicate: 'Group(G,·,e,inv)', type: 'o',
    formal: { symbols: ['Group', '·', 'e', '⁻¹'], typeEnv: { G: 'Set', '·': 'G -> G -> G', e: 'G' }, assumptions: ['结合律', '左右单位', '左右逆'], boundary: ['交换律不属于群定义。'] },
    representations: [representation('rep-group-axioms', 'definition', '群公理模板', '公式', 'DEF', '结合律、单位与逆分别列出。')],
    motivation: { internal: ['对称性需要一个统一代数结构。'], external: ['几何对称、数论与方程论。'], aesthetic: ['用最少公理统一多来源结构。'], growthChain: ['对称操作 → 封闭与结合 → 单位与逆 → 抽象群'] },
    teaching: { conditions: [condition('结合律', '删去结合律', '结合但无逆的结构不再满足群论证', '左乘映射的复合等式失效。'), condition('左右逆与单位', '只保留右单位', '可以构造非群但右单位成立的结构', 'Cayley 的单射步骤缺条件。')], commonMisconceptions: ['把交换律当作群公理。'], reviewQuestions: ['三个入口如何汇合到同一公理模板？'], evidenceStatus: 'DEF' },
    provenance,
  }),
  example('group:perm', '置换群', {
    discipline, case: 'group', summary: 'X 上双射关于复合构成群。',
    concept: 'group:group-concept', objectSpec: { G: 'Perm(X)', op: '复合', e: 'id_X', inv: '逆映射' },
    satisfaction: '复合结合、恒等为单位、双射的逆仍为双射。',
    formal: { boundary: ['作用约定必须先声明。'] },
    representations: [representation('rep-group-perm', 'example', '置换群', '例子', 'PROOF', '逐条验证群公理。')],
    motivation: { internal: ['置换是最一般的对称实现。'], external: ['排序、置换检验与组合计数。'], aesthetic: ['Cayley 桥梁的另一端。'], growthChain: ['双射 → 复合封闭 → 置换群'] },
    teaching: { proofOverview: '逐条检查复合结合、恒等与逆。', commonMisconceptions: ['把置换群只当作有限对称群。'], reviewQuestions: ['复合顺序约定如何影响反例计算？'], evidenceStatus: 'PROOF' },
    provenance,
  }),
  example('group:triangle-sym', '等边三角形的刚性对称', {
    discipline, case: 'group', summary: '保持等边三角形的刚性变换构成群。',
    concept: 'group:group-concept', objectSpec: { G: '等边三角形的刚性对称', op: '复合', e: '恒等', inv: '逆变换' },
    satisfaction: '三个旋转与三个反射；复合与逆仍保持图形。',
    formal: { boundary: ['几何图像提供动机，不替代群公理检查。'] },
    representations: [representation('rep-group-triangle', 'example', '三角形对称', '几何图示', 'PROOF', '顶点作用给出忠实置换表示。')],
    motivation: { internal: ['几何对称自然产生群结构。'], external: ['晶体与分子对称。'], aesthetic: ['图形动机与代数结构互相照亮。'], growthChain: ['图形对称 → 操作复合 → 对称群'] },
    teaching: { proofOverview: '列出六个对称，检查复合封闭与逆。', commonMisconceptions: ['把“看起来对称”当作元素相同。'], reviewQuestions: ['顶点作用为什么忠实？'], evidenceStatus: 'PROOF' },
    provenance,
  }),
  example('group:units5', '模 5 乘法单位群', {
    discipline, case: 'group', summary: '{1,2,3,4} 关于模 5 乘法构成循环四元群。',
    concept: 'group:group-concept', objectSpec: { G: '{1,2,3,4}', op: '模 5 乘法', e: '1', inv: '指数取负' },
    satisfaction: '2 的幂依次为 1,2,4,3；闭合、结合、单位与逆逐项验证。',
    formal: { boundary: ['该例的交换性是偶然特征，不是群公理。'] },
    representations: [representation('rep-group-units5', 'example', '模 5 幂表', '表格', 'PROOF', '用指数模 4 验证。')],
    motivation: { internal: ['数论给出群的另一个来源。'], external: ['模算术与密码学。'], aesthetic: ['有限循环结构的显式幂表。'], growthChain: ['同余乘法 → 单位集 → 幂表 → 循环群'] },
    teaching: { proofOverview: '以 2 为生成元列幂表，逐项读出单位与逆。', commonMisconceptions: ['把交换性推广到所有群。'], reviewQuestions: ['3 的逆是什么？'], selfCheck: [selfCheck('sc-group-units5-1', '在 Units5 中求 3 的逆。', '计算', 'group:units5', '3·2≡1 mod 5，故逆为 2。')], evidenceStatus: 'PROOF' },
    provenance,
  }),
  claim('group:cayley', 'Cayley 定理', {
    discipline, case: 'group', roles: ['Theorem'], summary: '每个群同构于其底集置换群的一个子群。',
    formula: '∀群 G ∃单同态 G→Perm(G)', typeEnv: { G: 'Group' },
    formal: { assumptions: ['群公理'], boundary: ['结论不表示每个群都是有限对称群。'] },
    motivation: { internal: ['抽象群可以具体实现为置换群。'], external: ['用置换表示计算群作用。'], aesthetic: ['左正则表示的普遍性。'], growthChain: ['左乘映射 → 复合同态 → 单射 → 置换子群'] },
    teaching: {
      proofOverview: '对 g 定义 L_g(x)=gx。L_{g⁻¹} 为逆，故 L_g 双射；L_g∘L_h=L_{gh}，故为同态；在 e 处取值得单射；像为置换子群。',
      conditions: [condition('群公理', '删去结合律', '复合等式 L_g∘L_h=L_{gh} 失效', '同态性无法证明。'), condition('单位元', '删去单位元', '在 e 处取值这一步没有对象', '单射证明缺少取值点。')],
      commonMisconceptions: ['把结论读成“每个群都是 S_n”。'],
      reviewQuestions: ['单射证明为什么需要单位元？'],
      selfCheck: [selfCheck('sc-group-cayley-1', '写出 L_g 的逆映射。', '证明', 'group:cayley', 'L_{g⁻¹}。'), selfCheck('sc-group-cayley-2', '写出 L_g∘L_h 的复合等式。', '证明', 'group:cayley', '(L_g∘L_h)(x)=g(hx)=(gh)x=L_{gh}(x)。')],
      evidenceStatus: 'PROOF',
    },
    provenance,
  }),
  counterexample('group:noncomm', 'S₃ 非交换反例', {
    discipline, case: 'group', summary: '按右侧先作用的约定，(12)(23)≠(23)(12)。',
    target: '所有群都交换', objectSpec: { G: 'S₃', a: '(12)', b: '(23)' },
    failureWitness: '两个复合对 1 的像分别为 2 与 3，故不相等。',
    formal: { anchors: ['group:group-concept', 'group:units5'], boundary: ['只反驳“所有群交换”的过度推广。'] },
    representations: [representation('rep-group-s3', 'counterexample', 'S₃ 复合计算', '计算', 'PROOF', '两个复合作用结果不同。')],
    motivation: { internal: ['有限例子即可否定全称交换律。'], external: ['置换复合的顺序敏感。'], aesthetic: ['两个对换的最小非交换例子。'], growthChain: ['置换群 → 复合顺序 → 非交换反例'] },
    teaching: { proofOverview: '按约定计算两个复合对 1 的像，分别为 2 与 3。', conditions: [condition('复合顺序约定', '不声明约定直接比较', '左右作用互换会使等式结论改变', '必须随节点保存约定。')], commonMisconceptions: ['把模乘法的交换性当作普遍规律。'], reviewQuestions: ['这个反例为什么不否定 Cayley 定理？'], evidenceStatus: 'PROOF' },
    provenance,
  }),
  claim('group:claim-injective', '左乘映射相等推出元素相等', {
    discipline, case: 'group', roles: ['Property'], summary: '机器认证片段：L_g=L_h ⇒ g=h，只使用右单位律。',
    formula: 'L_g=L_h ⇒ g=h', typeEnv: { g: 'G', h: 'G' },
    formal: { assumptions: ['右单位律 ∀x. x·e=x', '开放假设 L_g=L_h'], boundary: ['不含结合律、逆元、左乘双射、复合同态与像子群。'] },
    motivation: { internal: ['Cayley 单射步骤的最小依赖。'], external: ['展示开放假设随证书保留。'], aesthetic: ['在单位元处取值。'], growthChain: ['左乘映射 → 函数相等 → 单位处取值 → 消去右单位'] },
    teaching: { proofOverview: 'g=ge=L_g(e)=L_h(e)=he=h。', conditions: [condition('右单位', '删去右单位', 'G={0,1} 且所有乘积为 0，所有左乘映射相等而 0≠1', '结论失败。'), condition('L_g=L_h', '删去该假设', '二元循环群取 g≠h', '结论不能得出。')], commonMisconceptions: ['把这一步当作完整 Cayley 定理已认证。'], reviewQuestions: ['后续还缺哪些证明义务？'], evidenceStatus: 'FINITE' },
    provenance,
  }),
  proof('group:proof-injective', 'Cayley 单射片段证书', {
    discipline, case: 'group', target: 'group:claim-injective', checkStatus: 'passed',
    formal: { theory: 'T_right_unit', openAssumptions: ['对象等式 L_g=L_h 的认证翻译'], boundary: ['理论仅含右单位律；完整群公理未编码。'] },
    // 证据等级：本条是能重放的有限证书（machine-certificate / passed），带一个开放假设。
    teaching: { evidenceStatus: 'FINITE', reviewQuestions: ['这条证书为什么不能直接当作 Cayley 定理已认证？'] },
    summary: '现有 ND 子集检查器接受的局部证书，带一个开放假设。', provenance,
  }),
  construction('group:left-mul', '左乘映射', {
    discipline, case: 'group', summary: '对 g∈G 定义 L_g(x)=gx。',
    inputs: ['群 G', '元素 g'], outputs: ['映射 L_g:G→G'],
    steps: [{ id: 's1', note: '固定 g，对每个 x 取 gx。' }, { id: 's2', note: '用结合律验证复合等式。' }, { id: 's3', note: '用逆元证明双射。' }],
    verificationTarget: 'L_g 为双射且 g↦L_g 为群同态。',
    formal: { boundary: ['逆与双射论证依赖完整群公理。'] },
    representations: [representation('rep-group-leftmul', 'construction', '左正则表示', '定义', 'PROOF', '复合对应乘法。')],
    motivation: { internal: ['把抽象元素变成可复合的映射。'], external: ['群作用与置换表示。'], aesthetic: ['左正则表示。'], growthChain: ['乘法 → 左乘 → 置换表示'] },
    teaching: { proofOverview: 'L_{g⁻¹} 给出逆，故双射；复合计算给出同态。', conditions: [condition('逆元', '删去逆元', '无法给出 L_g 的逆映射', '双射性失去依据。')], commonMisconceptions: ['把 L_g 当作同态本身。'], reviewQuestions: ['L_g 与 L_{g⁻¹} 的复合是什么？'], evidenceStatus: 'PROOF' },
    provenance,
  }),
  method('group:method-abstract', '从特例抽象共同运算', {
    discipline, case: 'group', scope: '全局方法', summary: '比较多个具体结构的运算，抽出共同公理模板。',
    In: '多个具体代数或几何结构', Out: '共同运算模板与保留/丢弃特征清单', Pre: '每个结构的运算与单位已明确', Post: '公理模板与反例边界',
    Use: ['group:group-concept'], Demo: ['group:perm', 'group:triangle-sym', 'group:units5'], Fail: '偶然特征不得写入公理；至少保留一条失败边界（如交换性）。',
    body: '列出各结构的运算、单位与逆，比较哪些性质在所有例子中成立，再用反例检查候选公理是否过强。',
    formal: { applicableTo: ['group:group-concept'], boundary: ['方法输出候选公理模板，不替代逐条验证。'] },
    motivation: { internal: ['抽象应保留共同结构而丢弃偶然性。'], external: ['跨领域统一。'], aesthetic: ['最小公理集。'], growthChain: ['三个例子 → 共同性质 → 公理模板 → 反例边界'] },
    teaching: { selfCheck: [selfCheck('sc-group-method-1', '列出三个入口的共同性质与至少一个不同性质。', '方法使用', 'group:method-abstract', '共同：闭合、结合、单位、逆；不同：交换性。')], reviewQuestions: ['如何判断一个性质是偶然的还是结构性的？'], evidenceStatus: 'ILLUSTRATION' },
    provenance,
  }),
  method('group:method-counterexample', '用 S₃ 反驳交换性推广', {
    discipline, case: 'group', scope: '局部方法', summary: '用最小非交换群反例修正从交换例子得到的过度推广。',
    In: '来自交换例子的全称交换性猜测', Out: '非交换反例与否定范围', Pre: '置换复合顺序已声明', Post: '具体反例与不延伸范围',
    Use: ['group:noncomm'], Demo: ['group:units5'], Fail: '反例只否定全称交换性，不否定交换群的子类。',
    body: '选择最小的非交换置换群，计算两个对换的复合顺序差异。',
    formal: { applicableTo: ['group:noncomm'], boundary: ['方法只产生反例，不替代群的分类定理。'] },
    motivation: { internal: ['反例把偶然性从抽象中剥离。'], external: ['置换复合顺序敏感性。'], aesthetic: ['S₃ 是最小反例。'], growthChain: ['交换例子 → 过度推广 → S₃ 反例'] },
    teaching: { selfCheck: [selfCheck('sc-group-method-2', '计算 (12)(23) 与 (23)(12) 对 1 的像。', '反例构造', 'group:method-counterexample', '2 与 3，故不相等。')], reviewQuestions: ['为什么不能把 Units5 的交换性写进群定义？'], evidenceStatus: 'PROOF' },
    provenance,
  }),
  method('group:method-cayley-table', '用小阶乘法表核验公理与交换性', {
    discipline, case: 'group', scope: '局部方法',
    summary: '对一个阶数很小、元素可以逐个列出的集合，直接写出完整乘法表，用表格读出单位、逆与交换性。',
    In: '阶数很小且元素可枚举的集合与它的运算', Out: '公理逐条的成立或失败点，以及是否交换', Pre: '集合元素已列全，运算法则可逐步计算',
    Post: '给出乘法表，并据表回答每一条公理与交换性',
    Use: ['group:group-concept', 'group:cayley'], Demo: ['group:units5', 'group:noncomm'],
    Fail: '阶数一大表格就不可写；本方法给出的是逐例结论，不能推广成对所有群的断言。',
    body: '列出全部元素；逐格算出乘积填满表格；查表判断每行每列是否恰有一个单位元、是否对称（交换性）；出现失败点时指出是哪一格。',
    formal: { applicableTo: ['group:cayley'], boundary: ['只适用于有限小阶；不构成对一般群的证明。'] },
    motivation: {
      internal: ['公理是逐条可检查的，小阶情形一次填表就能全部回答。'],
      external: ['有限群的计算机枚举与小规模验证。'],
      aesthetic: ['把四条公理压缩成一张表。'],
      growthChain: ['公理抽象 → 小阶具体例子 → 乘法表 → 逐条核验与反例'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-group-method-cayley-1', '写出 Units5 的乘法表并据此判断它是否交换。', '计算', 'group:method-cayley-table', '每行每列恰有一个 1，且表格对称。')],
      reviewQuestions: ['表格不对称时，能否据此断言该群非交换？'],
      evidenceStatus: 'ILLUSTRATION',
    },
    provenance,
  }),
  method('group:method-order-count', '用元素阶数比对两个群', {
    discipline, case: 'group', scope: '局部方法',
    summary: '要判断两个小阶群是否同构，先数各自的元素阶数分布；分布不同就直接排除。',
    In: '两个阶数相同的小群', Out: '排除结论，或标出需要继续找的同构候选', Pre: '两群的元素已可枚举',
    Post: '给出阶数分布的比较结果与排除依据',
    Use: ['group:group-concept', 'group:perm'], Demo: ['group:noncomm'],
    Fail: '阶数分布相同只是同构的必要条件，不能据此断定同构；本方法不产生同构映射。',
    body: '对每个元素求它的阶；统计每个阶有多少个元素；两边的分布不一致即排除；一致时仍需另行构造同构。',
    formal: { applicableTo: ['group:group-concept'], boundary: ['必要条件，不是充分条件；不给同构映射。'] },
    motivation: {
      internal: ['同构保持元素阶，因此分布是同构不变量。'],
      external: ['有限群的快速分类尝试。'],
      aesthetic: ['用一个不变量排除一大类可能。'],
      growthChain: ['同构问题 → 找不变量 → 元素阶分布 → 排除或转构造'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-group-method-order-1', '统计 S₃ 与 Z₆ 的元素阶分布并比较。', '计算', 'group:method-order-count', 'S₃ 无 6 阶元素，分布不同。')],
      reviewQuestions: ['分布相同的情况下，下一步该做什么？'],
      evidenceStatus: 'ILLUSTRATION',
    },
    provenance,
  }),
  patternNode('group:pattern-all-commutative', '误区：所有群都交换', {
    discipline, case: 'group', summary: '把模乘法的交换性推广为群公理。',
    wrongRule: '对所有群 G 与 a,b∈G，ab=ba', task: '给出一个非交换群的复合计算',
    counterexample: 'S₃ 中的 (12)(23)≠(23)(12)', scope: '只反驳全称交换性；交换群仍然是群。', anchors: ['group:units5', 'group:group-concept'],
    formal: { boundary: ['个体是否持有该误区属于外部模型 E。'] },
    motivation: { internal: ['例子带来的偶然直觉需要反例校正。'], external: ['复合顺序在许多实际系统中不可交换。'], aesthetic: ['最小非交换群。'], growthChain: ['交换例子 → 过度推广 → S₃ 修正'] },
    teaching: { selfCheck: [selfCheck('sc-group-pattern-1', '写出 S₃ 中两个不交换的元素。', '反例构造', 'group:pattern-all-commutative', '(12) 与 (23)。')], reviewQuestions: ['哪些群论定理只对交换群成立？'], evidenceStatus: 'ILLUSTRATION' },
    provenance,
  }),
  problem('group:problem-inverse', '在 Units5 中求逆', {
    discipline, case: 'group', summary: '计算 3 在模 5 乘法下的逆。',
    inputs: ['Units5 的幂表或乘法表'], outputs: ['3 的逆元素'],
    goal: '求出 3⁻¹ 并验证乘积为单位元。', constraints: ['模 5', '验证 3·3⁻¹≡1'],
    formal: { boundary: ['有限计算题；不假装具有一般群算法。'] },
    motivation: { internal: ['逆元是群公理的显式操作。'], external: ['模算术求逆。'], aesthetic: ['一次乘法验证。'], growthChain: ['群公理 → 单位元 → 求逆'] },
    teaching: { selfCheck: [selfCheck('sc-group-problem-1', '验证 3·2≡1 mod 5。', '计算', 'group:problem-inverse', '逆为 2。')], reviewQuestions: ['如果模数换成 6，3 有逆吗？'], evidenceStatus: 'DEF' },
    provenance,
  }),
];

export const groupActions = [
  action('g-perm', 'construction', '构造置换群例子', [input('bg:set:function', ['statement', 'definition'])], [output('group:perm', ['statement', 'construction'])], { witness: { type: 'axiom-check', status: 'PROOF', ref: 'ev-group-perm' } }),
  action('g-geom', 'construction', '构造三角形对称例子', [input('bg:set:function', ['statement'])], [output('group:triangle-sym', ['statement', 'construction'])], { witness: { type: 'axiom-check', status: 'PROOF', ref: 'ev-group-triangle' } }),
  action('g-mod', 'construction', '构造 Units5 例子', [input('bg:group:binary', ['statement', 'definition'])], [output('group:units5', ['statement', 'construction'])], { witness: { type: 'finite-check', status: 'FINITE', ref: 'ev-group-units5' } }),
  action('g-abs-p', 'deduction', '从置换例子抽象群', [input('group:perm', ['statement', 'construction']), input('bg:group:binary', ['definition', 'statement'])], [output('group:group-concept', ['definition', 'statement'])], { witness: { type: 'abstraction', status: 'PROOF', ref: 'ev-group-abstract' } }),
  action('g-abs-g', 'deduction', '从几何例子抽象群', [input('group:triangle-sym', ['statement', 'construction']), input('bg:group:binary', ['definition', 'statement'])], [output('group:group-concept', ['definition', 'statement'])], { witness: { type: 'abstraction', status: 'PROOF', ref: 'ev-group-abstract' } }),
  action('g-abs-m', 'deduction', '从模乘法例子抽象群', [input('group:units5', ['statement', 'construction']), input('bg:group:binary', ['definition', 'statement'])], [output('group:group-concept', ['definition', 'statement'])], { witness: { type: 'abstraction', status: 'PROOF', ref: 'ev-group-abstract' } }),
  action('g-leftmul', 'construction', '构造左乘映射', [input('group:group-concept', ['definition', 'statement']), input('bg:set:function', ['statement'])], [output('group:left-mul', ['construction'])], { witness: { type: 'finite-construction', status: 'PROOF', ref: 'ev-group-cayley' } }),
  action('g-cayley', 'deduction', '证明 Cayley 定理', [input('group:group-concept', ['definition', 'statement']), input('group:left-mul', ['construction']), input('bg:set:function', ['statement'])], [output('group:cayley', ['statement', 'proof'])], { witness: { type: 'prose-proof', status: 'PROOF', ref: 'ev-group-cayley' } }),
  action('g-noncomm', 'task', '给出 S₃ 非交换反例', [input('group:perm', ['statement', 'construction'])], [output('group:noncomm', ['statement'])], { witness: { type: 'counterexample', status: 'PROOF', ref: 'ev-group-noncomm' } }),
  action('g-injective', 'evidence', '重放 Cayley 单射片段证书', [input('bg:logic:equality', ['statement'])], [output('group:claim-injective', ['statement']), output('group:proof-injective', ['proof', 'certificate'])], { witness: { type: 'machine-check', status: 'FINITE', ref: 'ev-group-injective-cert' } }),
  action('g-method-abstract', 'method', '提出从特例抽象方法', [input('group:perm', ['statement']), input('group:units5', ['statement'])], [output('group:method-abstract', ['method'])], { witness: { type: 'method-presentation', status: 'ILLUSTRATION', ref: 'case:04#method' } }),
  action('g-method-counter', 'method', '提出 S₃ 反例方法', [input('group:noncomm', ['statement']), input('group:units5', ['statement'])], [output('group:method-counterexample', ['method'])], { witness: { type: 'method-presentation', status: 'PROOF', ref: 'case:04#method-counter' } }),
  action('g-pattern', 'task', '登记交换性误区', [input('group:units5', ['statement']), input('group:noncomm', ['statement'])], [output('group:pattern-all-commutative', ['statement'])], { witness: { type: 'pattern-description', status: 'ILLUSTRATION', ref: 'case:04#pattern' } }),
  action('g-problem', 'task', '提出 Units5 求逆练习', [input('group:units5', ['statement', 'construction'])], [output('group:problem-inverse', ['task'])], { witness: { type: 'task-interface', status: 'DEF', ref: 'case:04#problem' } }),
  // 方法节点的引入行动：输入按「要会用它，必须先有什么」定，输出类型为 method。
  action('g-method-cayley', 'method', '提出乘法表核验法', [input('group:group-concept', ['definition', 'statement']), input('group:cayley', ['statement', 'construction'])], [output('group:method-cayley-table', ['method'])], { witness: { type: 'method-presentation', status: 'ILLUSTRATION', ref: 'case:04#method' } }),
  action('g-method-order', 'method', '提出元素阶比对法', [input('group:group-concept', ['definition', 'statement']), input('group:perm', ['statement'])], [output('group:method-order-count', ['method'])], { witness: { type: 'method-presentation', status: 'ILLUSTRATION', ref: 'case:04#method' } }),
];

export const groupRelations = [
  relation('rel-group-generalization', 'hardGeneralization', 'group:group-concept', 'group:perm', { witness: { type: 'instance-witness', status: 'PROOF', ref: 'ev-group-perm' }, scope: '置换群是群的一个实例；反向不成立。' }),
  relation('rel-group-generalization-geom', 'hardGeneralization', 'group:group-concept', 'group:triangle-sym', { witness: { type: 'instance-witness', status: 'PROOF', ref: 'ev-group-triangle' }, scope: '几何对称群是群的一个实例。' }),
  relation('rel-group-generalization-mod', 'hardGeneralization', 'group:group-concept', 'group:units5', { witness: { type: 'instance-witness', status: 'FINITE', ref: 'ev-group-units5' }, scope: 'Units5 是群的一个有限实例。' }),
  // 反方向：Units5 是群概念的特化实例。与上面一条成对，依据同一处有限核验。
  relation('rel-group-specialization', 'specialization', 'group:units5', 'group:group-concept', { witness: { type: 'inverse-of-declared-generalization', status: 'FINITE', ref: 'ev-group-units5' }, scope: '有限实例方向；该核验不推广到其他模数。' }),
  relation('rel-group-bridge', 'bridge', 'group:group-concept', 'group:cayley', { witness: { type: 'embedding-proof', status: 'PROOF', ref: 'ev-group-cayley' }, scope: '每个群嵌入其底集的置换群。' }),
  relation('rel-group-application', 'application', 'group:group-concept', 'group:triangle-sym', { witness: { type: 'application-description', status: 'PROOF', ref: 'ev-group-triangle' }, task: '用群论统一几何对称。' }),

  /*
   * 硬前置（`hardPrereq`，2026-10 补，与 limit / dg 两案例同一口径）：
   * **不用它，目标节点的定义就写不出来**。见证一律 `DEF` + `definitional-dependency`。
   *
   * 本案例的定义性依赖只有这四处：背景的公理模板 → 群概念 → 左乘映射 → 单射命题，
   * 以及置换群 → Cayley 定理。三个例子（置换群、三角形对称、Units5）与群概念的关系
   * 已经由 `hardGeneralization` + 实例见证登记（「它是群的一个实例」），
   * 不重复写一条同向同端点的硬前置——那只会让同一对节点上叠两条线（见 TODO A2-14）。
   * 方法、误区、练习类节点不登记。
   */
  relation('rel-group-pre-binary-concept', 'hardPrereq', 'bg:group:binary', 'group:group-concept', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定义 (G,·,e,inv) 满足结合律、单位元与逆元公理：三元组里的运算、常元与三条公理都由背景模板给出。' },
    scope: '删去背景模板，群的定义只剩一个集合 G，公理无从表述。',
  }),
  relation('rel-group-pre-concept-leftmul', 'hardPrereq', 'group:group-concept', 'group:left-mul', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定义 L_g(x) = gx 逐字使用群的乘法与元素 g∈G。' },
    scope: '没有群运算，「左乘」这个映射写不出来。',
  }),
  relation('rel-group-pre-leftmul-injective', 'hardPrereq', 'group:left-mul', 'group:claim-injective', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '命题陈述「若 L_g = L_h 则 g = h」的主语就是左乘映射族。' },
    scope: '命题用左乘映射的相等来断定元素的相等；没有 L_g 就没有这条命题。',
  }),
  relation('rel-group-pre-perm-cayley', 'hardPrereq', 'group:perm', 'group:cayley', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: 'Cayley 定理的陈述是「G 同构于 Perm(G) 的一个子群」：置换群 Perm(G) 出现在结论里。' },
    scope: '结论的落点是置换群；没有置换群这个对象，定理没有可陈述的像。',
  }),
  // 证明依赖：证书片段的证明目标是那条断言（证据 ev-group-injective-cert 同时列出两者，状态 FINITE）。
  relation('rel-group-proof-claim-injective', 'hardPrereq', 'group:proof-injective', 'group:claim-injective', {
    witness: { type: 'proof-dependency', status: 'FINITE', ref: 'ev-group-injective-cert', scope: '证书的证明目标是「左乘映射相等推出元素相等」；这条断言是 Cayley 单射步骤的接口。' },
    scope: '证书片段依赖它的目标断言；这是「证明用到什么」，不是定义材料。',
  }),
];

export const groupEvidence = [
  evidence('ev-group-cayley', 'prose-proof', 'PROOF', 'not_run', 'Cayley 定理正文证明', { scope: '左乘双射、复合同态、单射与像子群。', nodes: ['group:cayley', 'group:left-mul'], obligations: ['机器编码左乘双射、复合同态与像子群'], reference: 'mcs-foundations/cases/04-群概念的多来源.md#2' }),
  evidence('ev-group-noncomm', 'counterexample', 'PROOF', 'not_run', 'S₃ 非交换反例', { scope: '按声明顺序计算两个复合。', nodes: ['group:noncomm', 'group:pattern-all-commutative'], reference: 'mcs-foundations/cases/04-群概念的多来源.md#2' }),
  evidence('ev-group-perm', 'prose-proof', 'PROOF', 'not_run', '置换群公理验证', { scope: '复合结合、恒等与逆。', nodes: ['group:perm'] }),
  evidence('ev-group-triangle', 'prose-proof', 'PROOF', 'not_run', '三角形对称群的公理验证', { scope: '三个旋转与三个反射；顶点作用忠实。', nodes: ['group:triangle-sym'] }),
  evidence('ev-group-units5', 'finite-check', 'FINITE', 'passed', 'Units5 幂表核验', { scope: '四个元素的闭合、单位与逆在有限表上核验。', nodes: ['group:units5'], obligations: ['不推广到其他模数。'] }),
  evidence('ev-group-abstract', 'prose-proof', 'PROOF', 'not_run', '三入口抽象共同公理', { scope: '保留闭合、结合、单位与逆，丢弃交换性。', nodes: ['group:group-concept', 'group:method-abstract'] }),
  evidence('ev-group-injective-cert', 'machine-certificate', 'FINITE', 'passed', 'Cayley 单射片段证书', {
    scope: 'L_g=L_h ⇒ g=h；理论仅含右单位律。', nodes: ['group:claim-injective', 'group:proof-injective'],
    certificate: 'mcs-foundations/validation/certification/certificates/group.json', checker: 'mcs-nd-subset/1',
    openAssumptions: ['对象等式 L_g=L_h 的认证翻译'], obligations: ['左乘双射、复合同态、置换群与像子群未编码'],
  }),
  evidence('ev-group-not-claimed', 'not-claimed', 'NOT-CLAIMED', 'not_run', '未声称的范围', { scope: '不声称完整 Cayley 定理已机器认证，也不声称已测量教学效果。', nodes: ['group:cayley'] }),
  // 方法本身是操作步骤而非可证命题：证据只声明「步骤与案例正文一致」。
  evidence('ev-group-method-cayley-table', 'prose-proof', 'ILLUSTRATION', 'not_run', '乘法表核验法：步骤与案例正文一致', {
    scope: '方法不是命题；本证据只声明步骤描述没有超出正文，且「阶数一大即不适用」这一边界已写出。',
    nodes: ['group:method-cayley-table'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对由表格读出的每条公理与正文用语一致'],
    reference: 'mcs-foundations/cases/04-群概念的多来源.md#2',
  }),
  evidence('ev-group-method-order', 'prose-proof', 'ILLUSTRATION', 'not_run', '元素阶比对法：步骤与案例正文一致', {
    scope: '方法不是命题；本证据只声明步骤描述没有超出正文，且「分布相同不足够」已写入边界。',
    nodes: ['group:method-order-count'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对必要条件的表述没有被写成充分条件'],
    reference: 'mcs-foundations/cases/04-群概念的多来源.md#2',
  }),
  // 原有方法也补一条：让「每个方法节点都有独立证据」这条不变量一致成立。
  evidence('ev-group-method-counterexample', 'prose-proof', 'DEF', 'not_run', '用 S₃ 反驳交换性：步骤与案例正文一致', {
    scope: '方法不是命题；本证据只声明步骤描述没有超出正文，且「只产生反例、不替代分类定理」已写出。',
    nodes: ['group:method-counterexample'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对置换复合顺序的声明'],
    reference: 'mcs-foundations/cases/04-群概念的多来源.md#2',
  }),
  /*
   * 「从特例抽象共同运算」这个方法需要一条**以它为主体**的证据。
   *
   * 已有的 `ev-group-abstract` 主体是「三入口抽象共同公理」这个**断言**（PROOF 名副其实），
   * 方法只是它顺带提到的对象。两者不是一回事：断言可以被证明，方法只能被核对步骤。
   * 因此这里单独记一条，等级为 ILLUSTRATION。
   */
  evidence('ev-group-method-abstract', 'prose-proof', 'ILLUSTRATION', 'not_run', '从特例抽象共同运算：步骤与案例正文一致', {
    scope: '方法不是命题；本证据只声明步骤描述没有超出正文，且「偶然特征不得写入公理」已写出。',
    nodes: ['group:method-abstract'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对至少保留一条失败边界这一要求'],
    reference: 'mcs-foundations/cases/04-群概念的多来源.md#2',
  }),
];

export const groupSupport = [
  support('sup-group-concept-expr', 'group:group-concept', 'expression', 'known', { set: ['bg:group:binary', 'bg:set:function'], minimal: false }),
  support('sup-group-perm-proof', 'group:perm', 'proof', 'known', { set: ['bg:set:function'], minimal: true, evidence: ['ev-group-perm'] }),
  support('sup-group-triangle-proof', 'group:triangle-sym', 'proof', 'known', { set: ['bg:set:function'], minimal: false, evidence: ['ev-group-triangle'] }),
  support('sup-group-units5-proof', 'group:units5', 'proof', 'known', { set: ['bg:group:binary'], minimal: true, evidence: ['ev-group-units5'] }),
  support('sup-group-cayley-proof', 'group:cayley', 'proof', 'known', { set: ['group:group-concept', 'group:left-mul', 'bg:set:function'], minimal: false, evidence: ['ev-group-cayley'] }),
  support('sup-group-cayley-route', 'group:cayley', 'route', 'known', { set: ['bg:group:binary', 'bg:set:function'], minimal: false, evidence: ['ev-group-cayley'] }),
  support('sup-group-pattern-route', 'group:pattern-all-commutative', 'route', 'unknown', { reason: '误区模式不登记个人路线输入支持。' }),
];

export const groupClaims = [
  claimRecord('claim-group-cayley', 'group:cayley', '每个群同构于其底集置换群的一个子群。', ['ev-group-cayley']),
  claimRecord('claim-group-injective', 'group:claim-injective', 'L_g=L_h ⇒ g=h（只依赖右单位）。', ['ev-group-injective-cert'], 'FINITE'),
];

export const groupPatterns = [
  { id: 'group:pattern-all-commutative', node: 'group:pattern-all-commutative', anchors: ['group:units5', 'group:group-concept'], title: '所有群都交换' },
];

export const groupAggregates = [
  { id: 'agg-group', kind: 'topic', title: '群：几何、置换与模乘法的汇合', blocks: [['group:group-concept', 'group:perm', 'group:triangle-sym', 'group:units5', 'group:cayley'], ['group:method-abstract', 'group:method-counterexample', 'group:method-cayley-table', 'group:method-order-count']], note: '三个入口共享目标 Group；交换性被明确排除。方法节点单独成块。' },
];

export const group = { nodes: groupNodes, actions: groupActions, relations: groupRelations, evidence: groupEvidence, support: groupSupport, claims: groupClaims, patterns: groupPatterns, aggregates: groupAggregates };
