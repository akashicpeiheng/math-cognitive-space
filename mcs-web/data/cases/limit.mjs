import { concept, claim, proof, example, counterexample, problem, method, patternNode, action, input, output, relation, evidence, support, claimRecord, representation, selfCheck, condition } from '../authoring.mjs';

const discipline = '分析';
const provenance = { sources: ['专稿：案例 01、第 05–07 章、第 10–12 章', 'mcs-foundations/cases/01-极限与连续.md'], note: '自然语言证明与机器认证片段分开登记。' };

export const limitNodes = [
  concept('limit:distance', '实数距离', {
    discipline, case: 'limit', summary: 'd(x,y)=|x−y| 是极限与连续讨论的度量背景。',
    objectType: '实数对', parameters: ['x', 'y'], predicate: 'd(x,y)=|x−y|', type: 'o',
    formal: { symbols: ['d', '|·|'], typeEnv: { x: 'R', y: 'R' }, boundary: ['实数完备性未在此节点内编码。'] },
    representations: [representation('rep-limit-distance-formula', 'formula', '绝对值公式', '公式', 'DEF', 'd(x,y)=|x−y|')],
    motivation: {
      internal: ['ε–δ 语言要把“靠近”写成只依赖距离的有限条件。', '没有距离记号，全称量词的条件无法落地。'],
      external: ['物理测量与数值逼近都需要误差界。'], aesthetic: ['把几何意义上的邻近压缩成一个非负实数。'],
      growthChain: ['朴素靠近直觉 → 绝对误差 → 距离函数 d(x,y)=|x−y|'],
    },
    teaching: { commonMisconceptions: ['把“距离很小”当作“等于零”。'], reviewQuestions: ['为什么极限定义使用 0<|x−a|？'], evidenceStatus: 'DEF' },
    provenance,
  }),
  concept('limit:seq-conv', '序列收敛', {
    discipline, case: 'limit', summary: 'x_n→a 的 ε–N 定义。',
    objectType: '实数序列', parameters: ['(x_n)', 'a'], predicate: '∀ε>0 ∃N ∀n≥N: |x_n−a|<ε', type: 'o',
    formal: { symbols: ['SeqConv'], typeEnv: { x: 'N -> R', a: 'R' }, boundary: ['自然数标准模型与实数完备性作为声明背景。'] },
    representations: [representation('rep-limit-seq-eps', 'formula', 'ε–N 定义', '公式', 'DEF', '逐项误差最终小于任意正 ε。'), representation('rep-limit-seq-image', 'intuition', '最终进入任意邻域', '自然语言', 'ILLUSTRATION', '把 ε 看成邻域半径。')],
    motivation: { internal: ['把无限过程的“最终”换成一个有限的 N。'], external: ['数值算法的收敛判据。'], aesthetic: ['用有限验证结构表达无限趋近。'], growthChain: ['逼近观察 → 误差序列 → ε–N 量词次序'] },
    teaching: { conditions: [condition('∀ε>0', '只要求某些 ε', '取 ε 为更小值时误差不一定受控', '结论从“任意精度”退化为单点精度。'), condition('最终 (n≥N)', '要求每一项', '前有限项可以任意偏离', '定义不检查有限初始段。')], commonMisconceptions: ['把“最终”读成“每一项”。'], reviewQuestions: ['N 可以依赖 ε 吗？'], evidenceStatus: 'DEF' },
    provenance,
  }),
  concept('limit:limit-ed', '函数极限的 ε–δ 定义', {
    discipline, case: 'limit', summary: '去心邻域条件下的函数极限。',
    objectType: '函数在聚点处的极限', parameters: ['f:D→R', 'a', 'L'], predicate: '∀ε>0 ∃δ>0 ∀x∈D: 0<|x−a|<δ ⇒ |f(x)−L|<ε', type: 'o',
    formal: { symbols: ['LimitED'], typeEnv: { f: 'R -> R', a: 'R', L: 'R' }, assumptions: ['a 是 D 的聚点'], boundary: ['D、a 与聚点条件必须随节点保存。'] },
    representations: [representation('rep-limit-ed-formula', 'formula', 'ε–δ 定义', '公式', 'DEF', '全称次序为 ε 先于 δ。'), representation('rep-limit-ed-intuition', 'intuition', '误差预算与响应半径', '自然语言', 'ILLUSTRATION', 'ε 是目标误差，δ 是允许的输入范围。')],
    motivation: {
      internal: ['连续性需要描述 f(x) 在 a 附近的行为，而不依赖 f(a)。', '序列定义要求事先有序列；ε–δ 直接作用于函数定义域。'],
      external: ['工程容差要求把输出误差预算转成输入容差。', '数值分析需要量化的稳定半径。'],
      aesthetic: ['用有限量词链代替动态“趋近”意象。'],
      growthChain: ['动态趋近直觉 → 序列检验 → 直接量词定义 → ε–δ'],
    },
    teaching: {
      conditions: [
        condition('0<|x−a|', '改为 |x−a|<δ（含 x=a）', '取 f 在 a 处重新定义且与其他点不同的函数', '极限会被强行绑定到 f(a)；这正是连续性才要求的内容。'),
        condition('a 是聚点', '允许 a 为孤立点', 'D={a} 时去心邻域为空，量词条件空洞成立，任何 L 都满足', '函数极限不再唯一。'),
        condition('ε 先于 δ', '交换 ∃δ∀ε', '取 f(x)=x, a=0，先固定 δ 再让 ε→0 会失败', '量词次序不能交换。'),
      ],
      proofOverview: 'ε–δ 与序列定义的双向桥梁：正向把序列最终落入 δ 邻域；反向用量词否定和 δ=1/n 选择反例序列。',
      commonMisconceptions: ['把极限值当作 f(a)。', '认为 δ 可以依赖 x。'],
      reviewQuestions: ['为什么反向桥梁需要选择公理或等价原则？'],
      selfCheck: [selfCheck('sc-limit-ed-1', '写出 ε–δ 定义的完整量词次序。', '定义陈述', 'limit:limit-ed', '与标准定义逐字量词一致。'), selfCheck('sc-limit-ed-2', '构造一个极限存在但 f(a) 不同的例子。', '例子构造', 'limit:limit-ed', '给出分段函数并验证去心条件。')],
      evidenceStatus: 'DEF',
    },
    provenance,
  }),
  concept('limit:limit-seq', '序列式极限定义', {
    discipline, case: 'limit', summary: 'Heine 条件：所有趋于 a 的去心序列的像趋于 L。',
    objectType: '函数极限的序列刻画', parameters: ['f', 'a', 'L'], predicate: '∀(x_n)⊂D\\{a}: x_n→a ⇒ f(x_n)→L', type: 'o',
    formal: { symbols: ['LimitSeq'], typeEnv: { f: 'R -> R', a: 'R', L: 'R' }, assumptions: ['a 是 D 的聚点'], boundary: ['序列选择所需的元理论前提随案例声明。'] },
    representations: [representation('rep-limit-seq-def', 'formula', 'Heine 条件', '公式', 'DEF', '把函数极限化为所有序列的检验。')],
    motivation: { internal: ['已有序列收敛语言时，可以直接检验函数。'], external: ['计算上可用离散采样逼近极限。'], aesthetic: ['把函数层的连续性降为序列层。'], growthChain: ['序列收敛 → 逐序列检验 → 量词提升到所有序列'] },
    teaching: { conditions: [condition('对所有序列', '只检验一条序列', '取常值序列 x_n=a 之外的另一条路径会得到不同极限', '单条序列不能确定函数极限。'), condition('x_n≠a', '允许 x_n=a', 'f(a) 被重新定义时，常值序列给出错误极限', '去心条件必须保留。')], commonMisconceptions: ['用一条路径代替所有路径。'], reviewQuestions: ['这条定义与 ε–δ 的桥梁方向分别需要什么？'], evidenceStatus: 'DEF' },
    provenance,
  }),
  claim('limit:bridge', 'ε–δ 与序列定义的等价', {
    discipline, case: 'limit', roles: ['Theorem'], summary: '在聚点条件下，LimitED ⇔ LimitSeq。',
    formula: 'LimitED(f,a,L) ⇔ LimitSeq(f,a,L)', typeEnv: { f: 'R -> R', a: 'R', L: 'R' },
    formal: { assumptions: ['a 是 D 的聚点'], boundary: ['证明中的序列选择按 ZFC 元理论成立；削弱选择原则时需另加前提。'] },
    representations: [representation('rep-limit-bridge-proof', 'proof', '双向证明', '自然语言与量词演算', 'PROOF', '正向与反向两个方向分别展开。')],
    motivation: { internal: ['两种定义必须能互相翻译，否则极限概念不统一。'], external: ['把连续问题化为序列问题便于计算与反例构造。'], aesthetic: ['量词结构的对偶转换。'], growthChain: ['两套定义 → 正向验证 → 反向量词否定 → 等价定理'] },
    teaching: {
      proofOverview: '正向：给定 ε 取 δ，序列最终落入 δ 邻域，故像进入 ε 邻域。反向：若 ε–δ 失败，对每个 δ=1/n 选出反例点 x_n，得到收敛序列但像不收敛。',
      conditions: [condition('a 为聚点', '去掉聚点条件', '孤立点附近没有去心序列，序列条件空洞成立', '等价式单侧退化。'), condition('选择原则', '在削弱选择的对象理论中直接使用 δ=1/n 选择', '无法保证序列 (x_n) 存在', '反向证明停止。')],
      commonMisconceptions: ['把“证明存在反例序列”当作构造性算法。'], reviewQuestions: ['反向证明的量词否定第一行应该怎么写？'],
      selfCheck: [selfCheck('sc-limit-bridge-1', '写出 LimitED 失败时的量词否定。', '证明', 'limit:bridge', '存在 ε₀ 使每个 δ 都有反例点。'), selfCheck('sc-limit-bridge-2', '解释为什么这条定理不使两种定义合并为一个节点。', '结构辨析', 'limit:bridge', '节点身份按表达与来源区分，等价不等于同一。')],
      evidenceStatus: 'PROOF',
    },
    provenance,
  }),
  concept('limit:continuous', '函数在一点连续', {
    discipline, case: 'limit', summary: 'ε–δ 连续定义，包含 x=a 的情形。',
    objectType: '函数在点 a 的连续性', parameters: ['f:D→R', 'a∈D'], predicate: '∀ε>0 ∃δ>0 ∀x∈D: |x−a|<δ ⇒ |f(x)−f(a)|<ε', type: 'o',
    formal: { symbols: ['Continuous'], typeEnv: { f: 'R -> R', a: 'R' }, assumptions: ['a∈D'], boundary: ['孤立点上连续自动成立，这是定义的结果而非缺陷。'] },
    representations: [representation('rep-limit-cont-def', 'formula', '连续定义', '公式', 'DEF', '邻域条件不使用去心限制。')],
    motivation: { internal: ['极限存在且等于函数值，才能说函数在该点无断裂。'], external: ['控制系统要求输入微扰下输出微扰受控。'], aesthetic: ['把函数值与极限缝合为同一条件。'], growthChain: ['函数极限 → 要求 f(a)=L → 直接邻域定义'] },
    teaching: { conditions: [condition('a∈D', '允许 a∉D', '在 D 外讨论 f(a) 没有定义', '连续断言失去对象。'), condition('不使用去心邻域', '改为去心条件', '在 a 处重新定义的函数仍被判连续', '连续性包含函数值，去心条件不足以表达。')], commonMisconceptions: ['认为连续等价于图像可一笔画出。'], reviewQuestions: ['孤立点上连续为什么自动成立？'], evidenceStatus: 'DEF' },
    provenance,
  }),
  claim('limit:bridge-cont', '连续与函数极限的关系', {
    discipline, case: 'limit', roles: ['Theorem'], summary: 'a 为聚点时，连续等价于极限值为 f(a)。',
    formula: 'Continuous(f,a) ⇔ (a∈D ∧ a 为聚点 ∧ LimitED(f,a,f(a)))', typeEnv: { f: 'R -> R', a: 'R' },
    formal: { assumptions: ['a∈D', 'a 为 D 的聚点'], boundary: ['孤立点情形单独说明。'] },
    motivation: { internal: ['连续性应当由极限语言表达。'], external: ['把连续性问题转为极限计算。'], aesthetic: ['两种定义的接口缝合。'], growthChain: ['连续定义 → 限制到去心条件 → 补上 x=a 情形'] },
    teaching: { proofOverview: '正向把连续邻域条件限制到 x≠a；反向在 x=a 时误差为零，与去心极限条件合并。', conditions: [condition('a 为聚点', '去掉聚点条件', '孤立点连续但没有去心极限', '等价式失效。')], commonMisconceptions: ['把连续与极限存在混为一谈。'], reviewQuestions: ['为什么隔离点需要单独处理？'], evidenceStatus: 'PROOF' },
    provenance,
  }),
  example('limit:constant-seq', '常值序列', {
    discipline, case: 'limit', summary: 'x_n=a 对所有 n，极限为 a，且各项等于极限。',
    concept: 'limit:seq-conv', objectSpec: { sequence: 'x_n=a', a: '任意实数' }, satisfaction: '取 N=1 即对所有 ε>0 满足 |x_n−a|=0<ε。',
    formal: { boundary: ['本节点只涉及序列收敛，不涉及函数极限的去心条件。'] },
    representations: [representation('rep-limit-constant', 'example', '常值序列检验', '例子', 'PROOF', '直接验证 ε–N 条件。')],
    motivation: { internal: ['最简单的收敛序列暴露“最终”与“每一项”的差别。'], external: ['数值迭代可能立即到达固定点。'], aesthetic: ['用一个零误差例子测试定义。'], growthChain: ['量化定义 → 取零误差 → 常值反例'] },
    teaching: { proofOverview: '对任意 ε>0 取 N=1，误差恒为 0。', commonMisconceptions: ['认为极限点不能被序列取到。'], reviewQuestions: ['如果去掉 N=1 直接写“最终”，定义还检查什么？'], evidenceStatus: 'PROOF' },
    provenance,
  }),
  claim('limit:no-never-equal', '收敛不推出各项不等于极限', {
    discipline, case: 'limit', roles: ['Property'], summary: '存在收敛序列，其某一项等于极限。',
    formula: '∃(x_n) ∃a: SeqConv(x_n,a) ∧ ∃n. x_n=a', typeEnv: { x: 'N -> R', a: 'R' },
    formal: { assumptions: [], boundary: ['本命题只反驳“所有收敛序列各项都不同于极限”这一全称错误；不否定去心极限条件。'] },
    motivation: { internal: ['序列收敛定义不排除取到极限点。'], external: ['数值算法可能一步到达解。'], aesthetic: ['常值序列是最小的反例模型。'], growthChain: ['错误全称规则 → 构造常值序列 → 精确否定范围'] },
    teaching: { proofOverview: '常值序列 x_n=a 的误差恒为零，且存在 n 使 x_n=a。', conditions: [condition('序列可以取到极限', '误把“任意靠近”加强为“每项不等”', '常值序列', '该错误规则被直接反驳。')], commonMisconceptions: ['把函数极限的去心条件错误搬到序列上。'], reviewQuestions: ['这个反例为什么不反驳 ε–δ 中的 0<|x−a|？'], evidenceStatus: 'PROOF' },
    provenance,
  }),
  claim('limit:claim-eval-constant', '常值函数的取值', {
    discipline, case: 'limit', roles: ['Property'], summary: '机器认证片段：(λn.a)(n)=a，无开放假设。',
    formula: '∀a∀n. (λn.a)(n)=a', typeEnv: { a: 'R', n: 'N' },
    formal: { assumptions: [], boundary: ['本片段不含实数度量、收敛定义或极限桥梁；N 与 R 在证书中只是排序名。'] },
    motivation: { internal: ['把极限证明中的一步取值拆成可重放证书。'], external: ['展示展示记录与证书接受的区别。'], aesthetic: ['最小证书验证 β 归约。'], growthChain: ['自然语言取值 → 有类型 λ 项 → ND 子集证书'] },
    teaching: { proofOverview: '证书展开 λ 抽象并把实参代入，得到对象等式回接。', conditions: [], commonMisconceptions: ['把这一步当作收敛桥梁已认证。'], reviewQuestions: ['这条证书完成后，桥梁还缺哪些义务？'], evidenceStatus: 'FINITE' },
    provenance,
  }),
  proof('limit:proof-eval-constant', '常值取值证书', {
    discipline, case: 'limit', target: 'limit:claim-eval-constant', checkStatus: 'passed',
    formal: { theory: 'T_lambda_typing', openAssumptions: [], boundary: ['证书只覆盖取值步骤，不覆盖实数与收敛。'] },
    // 证据等级：本条是能重放的有限证书（machine-certificate / passed），不是正文证明。
    teaching: { evidenceStatus: 'FINITE', reviewQuestions: ['这条证书覆盖到哪一步为止？实数与收敛定义在哪里？'] },
    summary: '现有 ND 子集检查器接受的有限证书。', provenance,
  }),
  problem('limit:problem-quantifier-negation', '写出反向桥梁的量词否定', {
    discipline, case: 'limit', summary: '把 ε–δ 失败写成可使用的存在量词条件。',
    inputs: ['LimitED 定义', '实数距离'], outputs: ['存在量词形式的反例条件'],
    goal: '写出 ∃ε₀>0 ∀δ>0 ∃x∈D: 0<|x−a|<δ ∧ |f(x)−L|≥ε₀',
    constraints: ['保留 0<|x−a|', '不交换量词次序', '说明选择序列所需前提'],
    formal: { boundary: ['开放证明题不假装具有通用判定器。'] },
    motivation: { internal: ['量词否定是反向证明的入口。'], external: ['错误状态的可检验形式。'], aesthetic: ['否定保持结构。'], growthChain: ['极限定义 → 逐层否定 → 反例序列选择'] },
    teaching: { selfCheck: [selfCheck('sc-limit-neg-1', '逐层否定 ε–δ 公式。', '证明', 'limit:problem-quantifier-negation', '量词次序与不等式方向正确。')], reviewQuestions: ['δ=1/n 的序列选择在哪里使用选择原则？'], evidenceStatus: 'PROOF' },
    provenance,
  }),
  patternNode('limit:pattern-never-equal', '误区：收敛序列各项都不等于极限', {
    discipline, case: 'limit', summary: '把“任意靠近”加强为“每一项都不同”。',
    wrongRule: 'x_n→a ⇒ 对所有 n，x_n≠a', task: '给出一个同时收敛到 a 且取到 a 的序列',
    counterexample: '常值序列 x_n=a', scope: '只反驳序列层面的错误规则；不否定函数极限定义中的去心条件。', anchors: ['limit:constant-seq', 'limit:seq-conv'],
    formal: { boundary: ['个体是否持有该误区属于外部模型 E。'] },
    motivation: { internal: ['“趋近但不取到”的直觉需要一个反例校正。'], external: ['算法可能一步到达解。'], aesthetic: ['最小反例。'], growthChain: ['动态趋近意象 → 过度加强 → 常值反例'] },
    teaching: { selfCheck: [selfCheck('sc-limit-pattern-1', '写出常值序列满足收敛定义的验证。', '反例构造', 'limit:pattern-never-equal', '对任意 ε 取 N=1。')], reviewQuestions: ['这个错误直觉从哪里来？'], evidenceStatus: 'ILLUSTRATION' },
    provenance,
  }),
  method('limit:method-constant-test', '用常值序列检验动态趋近意象', {
    discipline, case: 'limit', scope: '局部方法', summary: '用取到极限点的序列检查“趋近不能取到”的隐含信念。',
    In: '含全称词的动态趋近直觉猜测', Out: '候选反例与否定范围', Pre: '已有序列收敛定义', Post: '反例实例与不延伸的否定范围',
    Use: ['limit:seq-conv', 'limit:constant-seq'], Demo: ['limit:no-never-equal'],
    Fail: '该反例不适用于函数极限的去心条件；两者的量化对象不同。',
    body: '把“任意靠近”写成 ε–N 条件，再取误差恒为零的序列，检查全称加强是否仍成立。',
    formal: { applicableTo: ['limit:seq-conv'], boundary: ['方法输出候选与范围，不替代数学证明。'] },
    motivation: { internal: ['一个零误差例子足以否定全称加强。'], external: ['测试数值算法是否允许精确命中。'], aesthetic: ['极简反例。'], growthChain: ['自然语言直觉 → 形式化 → 反例检验'] },
    teaching: { selfCheck: [selfCheck('sc-limit-method-1', '用方法模板检查“极限不能取到”的信念。', '方法使用', 'limit:method-constant-test', '输出常值反例并说明范围。')], reviewQuestions: ['什么时候该方法会失效？'], evidenceStatus: 'ILLUSTRATION' },
    provenance,
  }),
  method('limit:method-ratio-test', '用相邻项比值判定增长量级', {
    discipline, case: 'limit', scope: '局部方法',
    summary: '比较两列正项的增长量级：先看相邻项比值的极限，再用夹逼定出更强的一方。',
    In: '两列正项 a_n 与 b_n', Out: '增长量级的比较结论或失败点', Pre: '两列都是正项，且相邻项比值有极限',
    Post: '给出 a_n / b_n 的极限，或指出比值无极限因而本方法不适用',
    Use: ['limit:seq-conv', 'limit:distance'], Demo: ['limit:bridge'],
    Fail: '比值无极限（如振荡）时本方法不适用；也不能处理有正负号或会取零的项。',
    body: '先确认两列都为正项；计算 a_{n+1}/a_n 与 b_{n+1}/b_n 的极限并作比；由比值判断谁增长更快，必要时用夹逼把结论抬到 a_n/b_n。',
    formal: { applicableTo: ['limit:seq-conv'], boundary: ['本方法只给量级比较，不给出极限的具体数值。'] },
    motivation: {
      internal: ['量级比较可以绕开逐项求极限。'],
      external: ['算法复杂度估算需要比较增长阶。'],
      aesthetic: ['把「谁更大」化归为一步比值。'],
      growthChain: ['比较两列大小的困惑 → 相邻项比值 → 量级结论 → 夹逼补严'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-limit-method-ratio-1', '对给定的两列正项写出相邻项比值并作比。', '计算', 'limit:method-ratio-test', '比值趋于 0 时应说明更强的结论需要夹逼。')],
      reviewQuestions: ['比值无极限时，还能不能用别的方式比较量级？'],
      evidenceStatus: 'ILLUSTRATION',
    },
    provenance,
  }),
  method('limit:method-neighborhood-estimate', '用邻域估计替代逐点求值', {
    discipline, case: 'limit', scope: '局部方法',
    summary: '当函数在 a 点无定义或难以取值时，改为在 a 的去心邻域上给出统一估计，再取极限。',
    In: '在 a 的去心邻域上有界的表达式', Out: '极限值或「估计不足以定值」的结论', Pre: '能写出只依赖 ε 或邻域半径的统一界',
    Post: '给出满足 ε–δ 条件的 δ，或指出估计不够紧',
    Use: ['limit:limit-ed', 'limit:distance'], Demo: ['limit:bridge'],
    Fail: '只在一列样本点上成立的经验估计不是统一界，不能当作极限存在性的依据；本方法不替代证明。',
    body: '先把目标式写成 |f(x) − L| 的形式；找出只依赖 |x − a| 的统一上界；解出使上界小于 ε 的 δ；若无法解出，报告估计不足而不是给出数值。',
    formal: { applicableTo: ['limit:limit-ed'], boundary: ['方法给出候选 δ 与估计，成立性仍需按定义验证。'] },
    motivation: {
      internal: ['去心邻域上的统一界正是 ε–δ 的内容。'],
      external: ['数值计算需要在给定精度下选取步长。'],
      aesthetic: ['把逐点求值换成一致估计。'],
      growthChain: ['代入失败 → 邻域上统一估计 → 解出 δ'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-limit-method-neighborhood-1', '为给定的 |f(x)−L| 找一个只依赖 |x−a| 的上界。', '估计', 'limit:method-neighborhood-estimate', '解出 δ 或明确报告估计不足。')],
      reviewQuestions: ['为什么「在一列样本点上成立」不能当作极限存在的依据？'],
      evidenceStatus: 'ILLUSTRATION',
    },
    provenance,
  }),
];

export const limitActions = [
  action('a-limit:distance', 'definition', '引入实数距离', [input('bg:real:metric', ['statement', 'definition'])], [output('limit:distance', ['definition', 'statement'])], { witness: { type: 'definition-introduction', status: 'DEF', ref: 'case:01#distance' } }),
  action('a-limit:d', 'definition', '引入 ε–δ 定义', [input('bg:real:metric', ['statement', 'definition']), input('bg:logic:quantifier', ['statement']), input('limit:distance', ['statement', 'definition'])], [output('limit:limit-ed', ['definition', 'statement'])], { witness: { type: 'definition-introduction', status: 'DEF', ref: 'case:01#limit-ed' } }),
  action('a-limit:s', 'definition', '引入序列收敛与序列式极限', [input('bg:real:metric', ['statement', 'definition']), input('bg:logic:quantifier', ['statement']), input('limit:distance', ['statement'])], [output('limit:seq-conv', ['definition', 'statement']), output('limit:limit-seq', ['definition', 'statement'])], { witness: { type: 'definition-introduction', status: 'DEF', ref: 'case:01#seq' } }),
  action('a-limit:bridge', 'deduction', '证明两种极限定义等价', [input('limit:limit-ed', ['definition', 'statement']), input('limit:limit-seq', ['definition', 'statement']), input('limit:seq-conv', ['statement'])], [output('limit:bridge', ['statement', 'proof'])], { witness: { type: 'prose-proof', status: 'PROOF', ref: 'ev-limit-bridge-proof' }, scope: '证明选择原则按 ZFC 元理论成立。' }),
  action('a-limit:continuous', 'definition', '引入连续定义', [input('limit:limit-ed', ['definition']), input('bg:set:function', ['statement'])], [output('limit:continuous', ['definition', 'statement'])], { witness: { type: 'definition-introduction', status: 'DEF', ref: 'case:01#continuous' } }),
  action('a-limit:bridge-cont', 'deduction', '证明连续与极限值的关系', [input('limit:continuous', ['definition', 'statement']), input('limit:limit-ed', ['definition']), input('bg:set:function', ['statement'])], [output('limit:bridge-cont', ['statement', 'proof'])], { witness: { type: 'prose-proof', status: 'PROOF', ref: 'ev-limit-bridge-cont-proof' } }),
  action('a-limit:constant', 'construction', '构造常值序列', [input('bg:logic:quantifier', ['statement']), input('bg:real:metric', ['statement'])], [output('limit:constant-seq', ['statement', 'construction'])], { witness: { type: 'finite-construction', status: 'PROOF', ref: 'case:01#constant' } }),
  action('a-limit:counter', 'deduction', '反驳“各项都不等于极限”', [input('limit:seq-conv', ['definition', 'statement']), input('limit:constant-seq', ['statement'])], [output('limit:no-never-equal', ['statement', 'proof'])], { witness: { type: 'counterexample', status: 'PROOF', ref: 'ev-limit-never-equal' } }),
  action('a-limit:method', 'method', '提出常值检验方法', [input('limit:seq-conv', ['definition', 'statement']), input('limit:constant-seq', ['statement'])], [output('limit:method-constant-test', ['method'])], { witness: { type: 'method-presentation', status: 'ILLUSTRATION', ref: 'case:01#method' } }),
  action('a-limit:eval-constant', 'evidence', '重放常值取值证书', [input('bg:logic:equality', ['statement'])], [output('limit:claim-eval-constant', ['statement']), output('limit:proof-eval-constant', ['proof', 'certificate'])], { witness: { type: 'machine-check', status: 'FINITE', ref: 'ev-limit-constant-cert' } }),
  action('a-limit:pattern', 'task', '登记误区模式', [input('limit:seq-conv', ['definition', 'statement']), input('limit:constant-seq', ['statement'])], [output('limit:pattern-never-equal', ['statement'])], { witness: { type: 'pattern-description', status: 'ILLUSTRATION', ref: 'case:01#pattern' } }),
  action('a-limit:problem', 'task', '提出量词否定练习', [input('limit:limit-ed', ['definition', 'statement']), input('bg:logic:quantifier', ['statement'])], [output('limit:problem-quantifier-negation', ['task'])], { witness: { type: 'task-interface', status: 'DEF', ref: 'case:01#problem' } }),
  // 方法节点的引入行动：输入按「要会用它，必须先有什么」定，输出类型为 method。
  action('a-limit:method-ratio', 'method', '提出比值判量级法', [input('limit:seq-conv', ['definition', 'statement']), input('limit:distance', ['definition'])], [output('limit:method-ratio-test', ['method'])], { witness: { type: 'method-presentation', status: 'ILLUSTRATION', ref: 'case:01#method' } }),
  action('a-limit:method-neighborhood', 'method', '提出邻域估计法', [input('limit:limit-ed', ['definition', 'statement']), input('limit:distance', ['definition'])], [output('limit:method-neighborhood-estimate', ['method'])], { witness: { type: 'method-presentation', status: 'ILLUSTRATION', ref: 'case:01#method' } }),
];

export const limitRelations = [
  relation('rel-limit-bridge', 'bridge', 'limit:limit-ed', 'limit:limit-seq', { witness: { type: 'equivalence-proof', status: 'PROOF', ref: 'ev-limit-bridge-proof' }, scope: 'a 为聚点、f 定义在 D 上。' }),
  relation('rel-limit-generalization', 'hardGeneralization', 'limit:limit-ed', 'limit:continuous', { witness: { type: 'same-carrier-implication', status: 'PROOF', ref: 'ev-limit-bridge-cont-proof' }, scope: '连续蕴含极限存在且等于函数值；反向需要 a 为聚点且 f(a)=L。' }),
  relation('rel-limit-analogy', 'analogy', 'limit:seq-conv', 'limit:limit-seq', { witness: { type: 'candidate-analogy', status: 'ILLUSTRATION' }, candidateNote: '两处都出现 ε 与最终条件；精确对应由 Bridge 证书给出，不把相似性当同构。' }),
  relation('rel-limit-application', 'application', 'limit:limit-ed', 'limit:continuous', { witness: { type: 'application-description', status: 'PROOF', ref: 'ev-limit-bridge-cont-proof' }, task: '把连续性问题化为极限计算。' }),

  /*
   * 硬前置（`hardPrereq`）：**不用它，目标节点的定义就写不出来**。
   *
   * 这是本案例核心内容里「必须先有」的部分，此前只隐含在契约的 mode=definition 里
   * （行动接口能推出「哪些输入产出它」，但推不出「不满足就不成立」这句断言）。
   * 见证一律记 `DEF` + `definitional-dependency`：依据是目标节点的定义文本本身，
   * 不冒充证明（这几条不是定理，谈不上 PROOF），scope 里写明它出现在定义的哪一处。
   */
  relation('rel-limit-pre-distance-seq', 'hardPrereq', 'limit:distance', 'limit:seq-conv', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '序列收敛的 ε–N 定义里出现 |x_n − a|，即 d(x_n, a)。' },
    scope: 'x_n→a 的 ε–N 定义：∀ε>0 ∃N ∀n≥N, |x_n − a| < ε。',
  }),
  /*
   * 背景一侧也可以当前置的来源（2026-10 补；dg 案例登记的都是案例内节点）。
   * `bg:real:metric` 是背景接口：它本身不参与语义关系（见 data/relation-coverage.mjs），
   * 但「实数距离」的定义确实建立在它之上——这是背景节点存在的意义。
   */
  relation('rel-limit-pre-real-metric-distance', 'hardPrereq', 'bg:real:metric', 'limit:distance', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '距离定义 d(x,y) = |x − y| 里的实数、序与绝对值都由实数度量背景声明。' },
    scope: '删去背景，|x − y| 只是一个没有类型的记号；实数完备性虽未用在这里，但数系本身来自背景。',
  }),
  relation('rel-limit-pre-distance-ed', 'hardPrereq', 'limit:distance', 'limit:limit-ed', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: 'ε–δ 定义里同时出现 |x − a| 与 |f(x) − L| 两个距离。' },
    scope: '函数极限的 ε–δ 定义：0 < |x − a| < δ ⇒ |f(x) − L| < ε。去掉距离就没有「接近」可言。',
  }),
  relation('rel-limit-pre-seq-neighborhood', 'hardPrereq', 'limit:seq-conv', 'limit:limit-seq', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: 'Heine 条件说的是「所有趋于 a 的去心序列的像趋于 L」，逐字用到序列收敛。' },
    scope: '序列式极限定义建立在序列收敛之上；没有它，条件里那个「趋于」没有内容。',
  }),
  relation('rel-limit-pre-ed-bridge', 'hardPrereq', 'limit:limit-ed', 'limit:bridge', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '等价性断言的一侧就是 LimitED，证明从它出发。' },
    scope: 'LimitED ⇔ LimitSeq。断言的对象是这两个定义，去掉任何一侧就没有可证的命题。',
  }),
  relation('rel-limit-pre-seq-bridge', 'hardPrereq', 'limit:seq-conv', 'limit:bridge', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '另一侧 LimitSeq 逐字引序列收敛；证明的「⇒」方向要现造趋于 a 的序列。' },
    scope: '对同一对象 LimitSeq 而言，序列收敛是它的构成材料。',
  }),
  relation('rel-limit-pre-ed-continuous', 'hardPrereq', 'limit:limit-ed', 'limit:continuous', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '连续的定义与 ε–δ 极限定义共用同一套量词结构，只是把 0 < |x − a| 放宽为 |x − a| < δ 以容纳 x = a。' },
    scope: '要写出「f 在 a 连续」，先要有极限的 ε–δ 语言；这不是蕴含，是定义材料的依赖。',
  }),
  relation('rel-limit-pre-continuous-bridge-cont', 'hardPrereq', 'limit:continuous', 'limit:bridge-cont', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '断言的主语就是「连续」。' },
    scope: '「a 为聚点时连续等价于极限值为 f(a)」——两个概念都在句子里，缺一不可。',
  }),
  relation('rel-limit-pre-ed-bridge-cont', 'hardPrereq', 'limit:limit-ed', 'limit:bridge-cont', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '等式的右端「极限值」由 LimitED 给出。' },
    scope: '同上一条：这条断言比较的是两个定义的对象，因此两者都是它的材料。',
  }),
  relation('rel-limit-pre-seq-constant', 'hardPrereq', 'limit:seq-conv', 'limit:constant-seq', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '「常值序列的极限为 a」这句话本身要用收敛定义才成立。' },
    scope: '常值序列是例子；例子要成为「收敛」的实例，仍然依赖收敛的定义。',
  }),
  relation('rel-limit-pre-constant-never-equal', 'hardPrereq', 'limit:constant-seq', 'limit:no-never-equal', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '反例的具体构造就是常值序列：某一项（其实每一项）等于极限。' },
    scope: '断言「存在收敛序列其某项等于极限」；没有常值序列这个实例，命题只能空谈。',
  }),
  /*
   * 证明依赖（`proof-dependency`，2026-10 加）：证书片段以那条断言为**目标**。
   * `ref` 指向机器证书记录 `ev-limit-constant-cert`，它同时列出了断言与证书两个节点，
   * 因此「这张证书在证什么」在数据上可核；见证状态取证据的状态（FINITE = 有限证书已重放），
   * 不因为它是「一条关系」就升格成 PROOF。
   */
  relation('rel-limit-proof-claim-constant', 'hardPrereq', 'limit:proof-eval-constant', 'limit:claim-eval-constant', {
    witness: { type: 'proof-dependency', status: 'FINITE', ref: 'ev-limit-constant-cert', scope: '证书的证明目标就是这条断言：不先写下 (λn.a)(n)=a，就没有可重放的证书。' },
    scope: '证书片段依赖它的目标断言；这是「证明用到什么」这一类关系，不是定义材料。',
  }),
];

export const limitEvidence = [
  evidence('ev-limit-bridge-proof', 'prose-proof', 'PROOF', 'not_run', '两种极限定义等价：正文双向证明', { scope: '完整自然语言证明；尚未编码为第 02 章 ND 证书。', nodes: ['limit:bridge'], obligations: ['机器编码桥梁证明', '显式处理选择原则'], reference: 'mcs-foundations/cases/01-极限与连续.md#2' }),
  evidence('ev-limit-bridge-cont-proof', 'prose-proof', 'PROOF', 'not_run', '连续与极限值的正文证明', { scope: 'a∈D 且 a 为聚点；孤立点情形单独说明。', nodes: ['limit:bridge-cont'], obligations: ['机器编码连续桥梁'], reference: 'mcs-foundations/cases/01-极限与连续.md#2' }),
  evidence('ev-limit-never-equal', 'counterexample', 'PROOF', 'not_run', '常值序列反例', { scope: '反驳“收敛序列各项都不等于极限”，不触及函数极限去心条件。', nodes: ['limit:no-never-equal', 'limit:constant-seq', 'limit:pattern-never-equal'], reference: 'mcs-foundations/cases/01-极限与连续.md#4' }),
  evidence('ev-limit-constant-cert', 'machine-certificate', 'FINITE', 'passed', '常值取值片段证书', {
    scope: '(λn.a)(n)=a；N 与 R 在证书中只是排序名。', nodes: ['limit:claim-eval-constant', 'limit:proof-eval-constant'],
    certificate: 'mcs-foundations/validation/certification/certificates/limit.json', checker: 'mcs-nd-subset/1',
    obligations: ['实数度量、收敛定义、ε–δ 与序列桥梁、所需选择均未编码'],
  }),
  evidence('ev-limit-reference-stillwell', 'reference', 'REF', 'not_run', '极限动机的历史来源', { scope: 'Stillwell 第 9 章；历史来源不充当硬先修。', nodes: ['limit:limit-ed'], reference: 'Stillwell, Mathematics and Its History, ch. 9 §9.1（印刷 121–122）' }),
  evidence('ev-limit-not-claimed', 'not-claimed', 'NOT-CLAIMED', 'not_run', '未声称的范围', { scope: '不使用该案例声称真实教学收益、群体规律或完整机器形式化。', nodes: ['limit:bridge'] }),
  // 方法本身是操作步骤而非可证命题：证据只声明「步骤与案例正文一致」。
  evidence('ev-limit-method-ratio', 'prose-proof', 'ILLUSTRATION', 'not_run', '比值判量级法：步骤与案例正文一致', {
    scope: '方法不是命题，不能证明也不能反驳；本证据只声明步骤描述没有超出正文。',
    nodes: ['limit:method-ratio-test'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对正项与比值有极限两个前提是否都写进了方法边界'],
    reference: 'mcs-foundations/cases/01-极限与连续.md#4',
  }),
  evidence('ev-limit-method-neighborhood', 'prose-proof', 'ILLUSTRATION', 'not_run', '邻域估计法：步骤与案例正文一致', {
    scope: '方法不是命题，不能证明也不能反驳；本证据只声明步骤描述没有超出正文。',
    nodes: ['limit:method-neighborhood-estimate'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对「估计不足」这一失败分支是否被显式写出'],
    reference: 'mcs-foundations/cases/01-极限与连续.md#4',
  }),
  // 原有方法也补一条：让「每个方法节点都有独立证据」这条不变量一致成立。
  evidence('ev-limit-method-constant-test', 'prose-proof', 'ILLUSTRATION', 'not_run', '常值检验法：步骤与案例正文一致', {
    scope: '方法不是命题；本证据只声明步骤描述没有超出正文，且失效范围已写出。',
    nodes: ['limit:method-constant-test'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对去心邻域这一失效条件是否保留'],
    reference: 'mcs-foundations/cases/01-极限与连续.md#4',
  }),
];

export const limitSupport = [
  support('sup-limit-distance-expr', 'limit:distance', 'expression', 'known', { set: ['bg:real:metric'], minimal: true, evidence: ['ev-limit-reference-stillwell'] }),
  support('sup-limit-seq-expr', 'limit:seq-conv', 'expression', 'known', { set: ['bg:logic:quantifier', 'bg:real:metric', 'limit:distance'], minimal: false }),
  support('sup-limit-ed-expr', 'limit:limit-ed', 'expression', 'known', { set: ['bg:logic:quantifier', 'bg:real:metric', 'limit:distance'], minimal: false }),
  support('sup-limit-ed-proof', 'limit:limit-ed', 'proof', 'unknown', { reason: '定义节点没有证明义务；此处保留 Unknown，避免把“无需证明”写成空支持。' }),
  support('sup-limit-bridge-proof', 'limit:bridge', 'proof', 'known', { set: ['limit:limit-ed', 'limit:limit-seq', 'limit:seq-conv', 'bg:real:metric'], minimal: false, evidence: ['ev-limit-bridge-proof'] }),
  support('sup-limit-bridge-route', 'limit:bridge', 'route', 'known', { set: ['bg:real:metric', 'bg:logic:quantifier', 'limit:distance'], minimal: false, evidence: ['ev-limit-bridge-proof'] }),
  support('sup-limit-cont-proof', 'limit:continuous', 'proof', 'known', { set: ['limit:limit-ed', 'bg:set:function'], minimal: false, evidence: ['ev-limit-bridge-cont-proof'] }),
  support('sup-limit-never-proof', 'limit:no-never-equal', 'proof', 'known', { set: ['limit:constant-seq', 'limit:seq-conv'], minimal: true, evidence: ['ev-limit-never-equal'] }),
  support('sup-limit-method-route', 'limit:method-constant-test', 'route', 'unknown', { reason: '方法呈现只认证接口，未登记路线输入支持。' }),
];

export const limitClaims = [
  claimRecord('claim-limit-bridge', 'limit:bridge', '在聚点条件下，ε–δ 极限与序列式极限等价。', ['ev-limit-bridge-proof']),
  claimRecord('claim-limit-bridge-cont', 'limit:bridge-cont', 'a 为聚点且 a∈D 时，连续等价于极限值等于 f(a)。', ['ev-limit-bridge-cont-proof']),
  claimRecord('claim-limit-never-equal', 'limit:no-never-equal', '存在收敛序列取到其极限。', ['ev-limit-never-equal']),
  claimRecord('claim-limit-eval-constant', 'limit:claim-eval-constant', '(λn.a)(n)=a。', ['ev-limit-constant-cert'], 'FINITE'),
];

export const limitPatterns = [
  { id: 'limit:pattern-never-equal', node: 'limit:pattern-never-equal', anchors: ['limit:constant-seq', 'limit:seq-conv'], title: '收敛序列各项都不等于极限' },
];

export const limitAggregates = [
  { id: 'agg-limit', kind: 'topic', title: '极限与连续', blocks: [['limit:distance', 'limit:seq-conv', 'limit:limit-ed', 'limit:limit-seq', 'limit:bridge', 'limit:continuous', 'limit:bridge-cont'], ['limit:method-constant-test', 'limit:method-ratio-test', 'limit:method-neighborhood-estimate']], note: '话题块允许重叠，不把成员关系读成必修链；方法节点单独成块。' },
];

export const limit = { nodes: limitNodes, actions: limitActions, relations: limitRelations, evidence: limitEvidence, support: limitSupport, claims: limitClaims, patterns: limitPatterns, aggregates: limitAggregates };
