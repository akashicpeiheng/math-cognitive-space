import { concept, claim, proof, example, construction, method, patternNode, problem, action, input, output, relation, evidence, support, claimRecord, representation, selfCheck, condition } from '../authoring.mjs';

const discipline = '微分几何';
const provenance = { sources: ['专稿：案例 02、第 06 与第 08 章', 'mcs-foundations/cases/02-Ck与光滑流形.md'], note: '同载体蕴含与跨载体遗忘分别登记。' };

export const manifoldNodes = [
  concept('manifold:top-manifold', '拓扑流形', {
    discipline, case: 'manifold', summary: 'Hausdorff、第二可数、局部欧氏的拓扑空间。',
    objectType: '拓扑空间', parameters: ['X', 'n'], predicate: 'TopManifold(X,n)', type: 'o',
    formal: { symbols: ['TopManifold', '≅'], typeEnv: { X: 'TopSpace', n: 'N' }, assumptions: ['Hausdorff', '第二可数'], boundary: ['拓扑与局部欧氏性的完整定义在共享背景中。'] },
    representations: [representation('rep-manifold-top', 'definition', '局部欧氏拓扑空间', '公式与自然语言', 'DEF', '每点有到 R^n 开集的同胚邻域。')],
    motivation: { internal: ['微积分需要局部坐标，同时允许整体弯曲。'], external: ['广义相对论的时空与机器人的构型空间。'], aesthetic: ['把局部线性结构粘合成整体对象。'], growthChain: ['曲面参数化 → 图册 → 拓扑流形'] },
    teaching: { conditions: [condition('Hausdorff', '去掉分离性', '带两个原点的直线', '极限与连续论证失去唯一性背景。'), condition('第二可数', '去掉可数基', '长直线', '单位分解与嵌入定理的常见形式失效。')], commonMisconceptions: ['把“局部像 R^n”当作整体就是 R^n。'], reviewQuestions: ['为什么要求第二可数？'], evidenceStatus: 'DEF' },
    provenance,
  }),
  concept('manifold:chart-atlas', '图、图册与覆盖', {
    discipline, case: 'manifold', summary: '(U,φ) 为局部坐标图；图册覆盖 X 且过渡映射有定义。',
    objectType: '局部坐标系的集合', parameters: ['X', '{(U_i,φ_i)}'], predicate: 'Atlas(X,{(U_i,φ_i)})', type: 'o',
    formal: { symbols: ['U', 'φ', 'Atlas'], typeEnv: { X: 'TopSpace', U: 'Open(X)', φ: 'U -> R^n' }, boundary: ['覆盖与同胚条件逐图核验。'] },
    representations: [representation('rep-manifold-atlas', 'definition', '覆盖图册', '公式与图示', 'DEF', '每点至少落在一张图内。')],
    motivation: { internal: ['局部坐标必须覆盖整个空间。'], external: ['地图册覆盖地球表面。'], aesthetic: ['局部信息粘合。'], growthChain: ['单张图 → 覆盖条件 → 图册'] },
    teaching: { conditions: [condition('覆盖 X', '删去一张图', '未被覆盖的点仍可能有其他图，需逐个检查；若整点无图则不是图册', '局部坐标断言在缺口处失效。')], commonMisconceptions: ['只看图本身，不检查覆盖。'], reviewQuestions: ['图册的“最大”指什么？'], evidenceStatus: 'DEF' },
    provenance,
  }),
  concept('manifold:transition', '过渡映射', {
    discipline, case: 'manifold', summary: 'ψ∘φ⁻¹ 在重叠域上的映射，定义域与像在 R^n。',
    objectType: '坐标转换', parameters: ['φ', 'ψ'], predicate: 'Transition(φ,ψ)=ψ∘φ⁻¹', type: 'o',
    formal: { symbols: ['Transition', '∘', '⁻¹'], typeEnv: { φ: 'U -> R^n', ψ: 'V -> R^n' }, assumptions: ['重叠域 φ(U∩V) 非空'], boundary: ['限制域与开集条件必须显式保留。'] },
    representations: [representation('rep-manifold-transition', 'formula', '过渡映射公式', '公式', 'DEF', '在重叠域上双向检查。')],
    motivation: { internal: ['换坐标时，同一对象的表示必须相容。'], external: ['地图投影之间的换算。'], aesthetic: ['把相容性化简为 R^n 上的正则性。'], growthChain: ['两张图 → 重叠域 → 过渡映射'] },
    teaching: { conditions: [condition('限制到 φ(U∩V)', '在整个 R^n 上讨论', 'φ⁻¹ 在像之外没有定义', '复合映射失去定义域。'), condition('两个方向都检查', '只检查 ψ∘φ⁻¹', '非 C^k 的逆同胚可以单向光滑', 'C^k 图册条件被削弱。')], commonMisconceptions: ['把同胚当作自动 C^k。'], reviewQuestions: ['为什么 C^k 条件需要对所有有序图对成立？'], evidenceStatus: 'DEF' },
    provenance,
  }),
  concept('manifold:ck-atlas', 'C^k 图册', {
    discipline, case: 'manifold', summary: '所有过渡映射均为 C^k 的图册。',
    objectType: '图册性质', parameters: ['A', 'k'], predicate: 'CkAtlas(A,k)', type: 'o',
    formal: { symbols: ['CkAtlas', 'C^k'], typeEnv: { A: 'Atlas', k: 'N' }, assumptions: ['k≥1'], boundary: ['多元微分与复合封闭性来自共享背景。'] },
    representations: [representation('rep-manifold-ck', 'definition', '逐对正则性', '公式', 'DEF', '每个过渡映射 C^k。')],
    motivation: { internal: ['需要可微结构才能谈切空间与微分。'], external: ['广义相对论要求光滑结构。'], aesthetic: ['把局部微分结构粘合。'], growthChain: ['拓扑流形 → 图册 → C^k 过渡条件'] },
    teaching: { conditions: [condition('k≥1', '允许 k=0', 'C^0 图册只有连续过渡', '不能定义切空间。')], commonMisconceptions: ['把 C^k 与 C^∞ 混用。'], reviewQuestions: ['同一拓扑流形可以有不同 C^k 结构吗？'], evidenceStatus: 'DEF' },
    provenance,
  }),
  concept('manifold:smooth-atlas', '光滑图册', {
    discipline, case: 'manifold', summary: '所有过渡映射为 C^∞ 的图册。',
    objectType: '图册性质', parameters: ['A'], predicate: 'SmoothAtlas(A)', type: 'o',
    formal: { symbols: ['SmoothAtlas', 'C^∞'], typeEnv: { A: 'Atlas' }, boundary: ['光滑化定理未在本站形式化。'] },
    representations: [representation('rep-manifold-smooth', 'definition', 'C^∞ 过渡', '公式', 'DEF', '各阶导数存在且连续。')],
    motivation: { internal: ['光滑性使各阶微分运算可迭代。'], external: ['经典场论与微分几何。'], aesthetic: ['无界阶正则性。'], growthChain: ['C^k → 所有 k → C^∞'] },
    teaching: { conditions: [condition('所有阶', '只要求有限 k', 'h(x)=x+x|x| 给出 C¹ 非 C² 的例子', 'C^∞ 结论失效。')], commonMisconceptions: ['把 C¹ 当作 C^∞。'], reviewQuestions: ['C¹ 非 C² 的例子否定了什么、没有否定什么？'], evidenceStatus: 'DEF' },
    provenance,
  }),
  concept('manifold:compatible-k', 'C^k 兼容', {
    discipline, case: 'manifold', summary: '两张图册的并为 C^k 图册。',
    objectType: '图册关系', parameters: ['A', 'B', 'k'], predicate: 'Compatible_k(A,B,k)', type: 'o',
    formal: { symbols: ['Compatible_k'], typeEnv: { A: 'Atlas', B: 'Atlas', k: 'N' }, boundary: ['兼容性需检查所有跨图册过渡。'] },
    representations: [representation('rep-manifold-compatible', 'definition', '并的过渡条件', '公式', 'DEF', '跨图册与册内过渡都需 C^k。')],
    motivation: { internal: ['图册之间需要可比较的精细结构。'], external: ['不同坐标覆盖的融合。'], aesthetic: ['等价类的并。'], growthChain: ['C^k 图册 → 并 → 兼容关系'] },
    teaching: { conditions: [condition('所有跨图册过渡', '只检查册内过渡', '取两份互不兼容的图册', '并失去 C^k 性质。')], commonMisconceptions: ['把相容性当作图册相等。'], reviewQuestions: ['相容关系的对称性与传递性成立吗？'], evidenceStatus: 'DEF' },
    provenance,
  }),
  construction('manifold:max-k', '最大 C^k 兼容扩张', {
    discipline, case: 'manifold', summary: 'A_max 为所有与 A 兼容的图组成的 C^k 图册。',
    inputs: ['C^k 图册 A', '过渡映射定义'], outputs: ['最大 C^k 图册 A_max'],
    steps: [{ id: 's1', note: '收集所有与 A 每张图 C^k 兼容的图。' }, { id: 's2', note: '证明并仍为 C^k 图册且覆盖 X。' }, { id: 's3', note: '证明任何可再加入的图都在其中。' }],
    verificationTarget: 'A_max 是 C^k 图册且按包含关系最大。',
    formal: { boundary: ['正则性是局部性质；链式法则来自共享背景。'] },
    representations: [representation('rep-manifold-max', 'construction', '相容扩张构造', '有限步骤', 'PROOF', '覆盖由 A⊆A_max 保证。')],
    motivation: { internal: ['消去图册选择的余量，得到结构本身。'], external: ['同一微分结构的范本。'], aesthetic: ['把等价类选出一个最大代表。'], growthChain: ['图册 → 兼容性 → 最大扩张'] },
    teaching: { proofOverview: '先证 A_max 覆盖：A⊆A_max。再证两张新增图的过渡是局部 C^k 复合，最后由“可再加入的图都已被收集”得最大性。', conditions: [condition('A 本身是 C^k 图册', '删去 A 的正则性', 'A_max 的覆盖与正则性都失去依据', '最大性证明无法开始。')], commonMisconceptions: ['把最大扩张当成与 A 无关的另一个图册。'], reviewQuestions: ['为什么新增图之间的过渡可以经过 A 的图分解？'], evidenceStatus: 'PROOF' },
    provenance,
  }),
  example('manifold:example-h', 'C¹ 非 C² 的图册例子', {
    discipline, case: 'manifold', summary: 'h(x)=x+x|x| 与恒等图组成 C¹ 图册，但不是 C² 图册。',
    concept: 'manifold:ck-atlas', objectSpec: { X: 'R', atlas: '{id,h}', h: 'x↦x+x|x|' }, satisfaction: 'h 严格递增且为同胚；过渡映射 h 在 0 处二阶导数不连续。',
    formal: { boundary: ['该反例不证明 R 不能另取光滑图册。'], anchors: ['manifold:smooth-atlas', 'manifold:ck-atlas'] },
    representations: [representation('rep-manifold-h', 'counterexample', 'h 的图册反例', '计算', 'PROOF', 'h 的导数 1+2|x| 连续且正。')],
    motivation: { internal: ['区分“同一图册不是 C²”与“底空间没有光滑结构”。'], external: ['避免对结构存在的过度推断。'], aesthetic: ['最小的一元反例。'], growthChain: ['C^k 定义 → 构造图册 → 计算二阶导数 → 精确否定范围'] },
    teaching: { proofOverview: 'h 的导数连续且为正，故为同胚；二阶导数在 0 两侧分别为 2 与 −2，故不是 C²。', conditions: [condition('只检验给定图册', '把反例扩大为底空间不存在光滑图册', 'R 本身有恒等光滑图册', '过度推广被反驳。')], commonMisconceptions: ['把图册性质当作底空间性质。'], reviewQuestions: ['这个反例精确否定了哪条命题？'], selfCheck: [selfCheck('sc-manifold-h-1', '计算 h 的导数与二阶导数。', '计算', 'manifold:example-h', '导数 1+2|x|；两侧二阶导数分别为 2 与 −2。')], evidenceStatus: 'PROOF' },
    provenance,
  }),
  claim('manifold:claim-max', '最大扩张是 C^k 图册且最大', {
    discipline, case: 'manifold', roles: ['Theorem'], summary: '对任意 C^k 图册 A，其最大兼容扩张 A_max 是 C^k 图册且按包含最大。',
    formula: 'CkAtlas(A,k) ⇒ CkAtlas(A_max,k) ∧ ∀图 g 与 A 兼容 ⇒ g∈A_max', typeEnv: { A: 'Atlas', k: 'N' },
    formal: { assumptions: ['A 是 C^k 图册'], boundary: ['正则性的局部性来自共享背景。'] },
    motivation: { internal: ['同一 C^k 结构的不同图册应给出同一最大扩张。'], external: ['微分结构的规范代表。'], aesthetic: ['极大性把选择消掉。'], growthChain: ['兼容性 → 收集 → 局部复合 → 最大性'] },
    teaching: { proofOverview: '覆盖由 A⊆A_max；新增图之间的过渡在每点可经 A 的图分解为 C^k 复合；最大性由收集规则直接得到。', conditions: [condition('A 覆盖 X', '删去覆盖', '未被覆盖区域没有坐标可分解过渡', '局部复合论证出现缺口。')], commonMisconceptions: ['把最大扩张的成员关系当作原图册的成员关系。'], reviewQuestions: ['最大性证明用到了‘所有兼容图’的哪条性质？'], evidenceStatus: 'PROOF' },
    provenance,
  }),
  claim('manifold:claim-generalization', '光滑图册是 C^k 图册', {
    discipline, case: 'manifold', roles: ['Theorem'], summary: '同一图册编码下，C^∞ 过渡推出每个有限 k 的 C^k 过渡。',
    formula: 'P_∞(A) ⇒ P_k(A)（同一图册编码）', typeEnv: { A: 'Atlas', k: 'N' },
    formal: { assumptions: ['k≥1'], boundary: ['跨载体映射是另一条遗忘构造，不与此同载体蕴含混用。'] },
    motivation: { internal: ['正则性越高应能遗忘到更低阶。'], external: ['不同光滑性要求的模型选择。'], aesthetic: ['同一载体上的单调性。'], growthChain: ['C^∞ 定义 → 有限阶截断 → 同载体蕴含'] },
    teaching: { proofOverview: 'C^∞ 表示各阶导数存在且连续，特别地第 1..k 阶满足 C^k。', conditions: [condition('同一图册编码', '把蕴含换成跨结构映射', '光滑结构与最大 C^k 扩张不是字面相等', '需要额外的遗忘映射与良定义证明。')], commonMisconceptions: ['把 P_∞⇒P_k 误写成 C^∞ 结构与 C^k 结构同一。'], reviewQuestions: ['跨载体遗忘映射为什么不依赖代表图册？'], evidenceStatus: 'PROOF' },
    provenance,
  }),
  claim('manifold:claim-transition-eval', '同图过渡在指定点的取值', {
    discipline, case: 'manifold', roles: ['Property'], summary: '机器认证片段：在右逆假设下 φ(φ⁻¹(y))=y。',
    formula: '∀y. φ⁻¹ 为指定点 y 的右逆 ⇒ φ(φ⁻¹(y))=y', typeEnv: { φ: 'U -> R^n', 'φ⁻¹': 'R^n -> U', y: 'R^n' },
    formal: { assumptions: ['在指定点 y 有 φ∘φ⁻¹(y)=y'], boundary: ['不含开集、限制域、图册、覆盖与链式法则。'] },
    motivation: { internal: ['把过渡映射的复合展开为可重放一步。'], external: ['展示开放假设如何随证书保留。'], aesthetic: ['最小复合恒等。'], growthChain: ['过渡定义 → 指定点 → 右逆假设 → ND 证书'] },
    teaching: { proofOverview: '证书展开复合并在右逆等式处使用开放假设。', conditions: [condition('右逆假设', '删去假设', 'φ 恒为 0、φ⁻¹ 为恒等，在 y=1 处复合值不为 1', '取值结论失败。')], commonMisconceptions: ['把这一步当作整个流形结构已认证。'], reviewQuestions: ['若把右逆加强为双边逆，证书还需要哪些条件？'], evidenceStatus: 'FINITE' },
    provenance,
  }),
  proof('manifold:proof-transition', '同图过渡证书', {
    discipline, case: 'manifold', target: 'manifold:claim-transition-eval', checkStatus: 'passed',
    formal: { theory: 'T_total_functions', openAssumptions: ['指定点的右逆等式'], boundary: ['两个排序上的总函数；真实限制域未编码。'] },
    // 证据等级：本条是能重放的有限证书（machine-certificate / passed），带一个开放假设。
    teaching: { evidenceStatus: 'FINITE', reviewQuestions: ['这条证书的开放假设是什么？它在完整过渡论证里排第几步？'] },
    summary: '现有 ND 子集检查器接受的局部证书，带一个开放假设。', provenance,
  }),
  method('manifold:method-regularity', '逐对检查图册过渡正则性', {
    discipline, case: 'manifold', scope: '局部方法', summary: '对给定图册的每一对图检查重叠域与 C^k 条件。',
    In: '有限图册与目标 k', Out: '兼容性检查结果或失败点', Pre: '图册有限且每对重叠域可处理', Post: '每对过渡的 C^k 结论或具体失败点',
    Use: ['manifold:transition', 'bg:manifold:calc'], Demo: ['manifold:example-h'], Fail: '无限图册或不可判定义域时返回未决，不声称已检查全部对。',
    body: '枚举每对图，写出 φ(U∩V) 与复合 ψ∘φ⁻¹，再检查各阶导数的存在与连续。',
    formal: { applicableTo: ['manifold:ck-atlas'], boundary: ['方法只处理有限可枚举图对。'] },
    motivation: { internal: ['C^k 条件是可逐对核验的局部性质。'], external: ['有限图册的工程检查。'], aesthetic: ['把整体条件降为有限检查。'], growthChain: ['C^k 定义 → 逐对枚举 → 失败点定位'] },
    teaching: { selfCheck: [selfCheck('sc-manifold-method-1', '为一对图写出过渡映射的定义域与像。', '计算', 'manifold:method-regularity', '域为 φ(U∩V)，像为 ψ(U∩V)。')], reviewQuestions: ['为什么只检查一个方向不够？'], evidenceStatus: 'ILLUSTRATION' },
    provenance,
  }),
  patternNode('manifold:pattern-one-direction', '误区：只检验一个过渡方向', {
    discipline, case: 'manifold', summary: '把 ψ∘φ⁻¹ 的正则性当作逆映射自动正则。',
    wrongRule: '只要 ψ∘φ⁻¹ 是 C^k，图对就满足 C^k 条件', task: '检查同胚但其逆不光滑的例子',
    counterexample: '存在 C^k 但逆不 C^k 的同胚；一般同胚不自动提升正则性', scope: '只针对“单向检查足够”的错误规则；不否定在额外条件下逆的 C^k 结论。', anchors: ['manifold:transition', 'manifold:ck-atlas'],
    formal: { boundary: ['个体是否持有该误区属于外部模型 E。'] },
    motivation: { internal: ['正则性不是同胚的内置性质。'], external: ['坐标变换工程中常见的方向混淆。'], aesthetic: ['双向条件是定义的一部分。'], growthChain: ['同胚直觉 → 单向检查 → 反例修正'] },
    teaching: { selfCheck: [selfCheck('sc-manifold-pattern-1', '写出 C^k 条件需要检查的两组映射。', '定义陈述', 'manifold:pattern-one-direction', '两个方向的过渡映射都需 C^k。')], reviewQuestions: ['什么时候逆映射自动 C^k？'], evidenceStatus: 'ILLUSTRATION' },
    provenance,
  }),
  problem('manifold:problem-transition-domain', '写出过渡映射的定义域与像', {
    discipline, case: 'manifold', summary: '给定两张图，写出重叠域的坐标表示。',
    inputs: ['(U,φ)', '(V,ψ)'], outputs: ['φ(U∩V)', 'ψ(U∩V)', 'ψ∘φ⁻¹ 的表达式'],
    goal: '正确写出过渡映射的定义域、像与复合表达式。', constraints: ['两个方向都要写', '说明开集来源'],
    formal: { boundary: ['开放题不假装具有通用判定器。'] },
    motivation: { internal: ['定义域错误是过渡讨论的常见失败点。'], external: ['坐标换算必须先确定有效范围。'], aesthetic: ['把几何重叠写成两个开集。'], growthChain: ['图 → 重叠 → 坐标域 → 复合'] },
    teaching: { selfCheck: [selfCheck('sc-manifold-problem-1', '写出 ψ∘φ⁻¹ 的完整定义域。', '计算', 'manifold:problem-transition-domain', '定义域为 φ(U∩V)。')], reviewQuestions: ['如果重叠域为空，过渡条件还需要检查吗？'], evidenceStatus: 'DEF' },
    provenance,
  }),
  method('manifold:method-cover-by-charts', '先用有限张图覆盖再逐图验证', {
    discipline, case: 'manifold', scope: '局部方法',
    summary: '面对一个具体空间，先写出覆盖它的有限张坐标图，把整体问题拆成每张图上的欧氏问题。',
    In: '待判定是否为流形的具体空间', Out: '候选图册，或指出哪一点无法被覆盖', Pre: '空间上已能写出至少一张坐标图',
    Post: '给出有限覆盖，或明确指出未覆盖的点这一失败点',
    Use: ['manifold:chart-atlas', 'bg:top:space'], Demo: ['manifold:top-manifold'],
    Fail: '写出覆盖不等于验证了 C^k 兼容性；本方法只处理「能不能覆盖」，兼容性要另走逐对检查。',
    body: '为空间中每个点找一张坐标图；把重叠区域显式写出来；若某点找不到图邻域，就停在那里报告失败点，而不是继续套用其它步骤。',
    formal: { applicableTo: ['manifold:chart-atlas'], boundary: ['只处理覆盖，不处理过渡正则性。'] },
    motivation: {
      internal: ['流形定义的第一句就是「每点有邻域同胚于 R^n」，覆盖是它的直接展开。'],
      external: ['球面的地图册、机器人的局部坐标系划分。'],
      aesthetic: ['把整体几何拆成有限个欧氏片。'],
      growthChain: ['整体不可坐标化 → 拆成局部片 → 有限覆盖 → 过渡相容性问题浮现'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-manifold-method-cover-1', '为球面写出两张球极投影图并说明为什么两张就够。', '构造', 'manifold:method-cover-by-charts', '南北极点各被另一张图覆盖。')],
      reviewQuestions: ['覆盖写完之后，还差哪一步才能说它是光滑流形？'],
      evidenceStatus: 'ILLUSTRATION',
    },
    provenance,
  }),
  method('manifold:method-extension-check', '用延拓检验判定光滑性', {
    discipline, case: 'manifold', scope: '局部方法',
    summary: '要判断一个只在闭集上给出的函数能否光滑延拓，先看它在边界处各阶导数的相容性。',
    In: '定义在闭子集上的函数', Out: '可延拓的结论或边界处的失败点', Pre: '闭子集有良好的边界（如带边流形的边界）',
    Post: '给出延拓的存在结论，或指出哪一阶导数在边界上不相容',
    Use: ['manifold:smooth-atlas', 'bg:manifold:calc'], Demo: ['manifold:example-h'],
    Fail: '边界不光滑或维数不对时本方法不适用；本方法也不给出延拓的显式公式。',
    body: '把函数限制在边界上；逐阶求导并检查是否与内部极限一致；某一阶不一致就报告失败点。',
    formal: { applicableTo: ['manifold:smooth-atlas'], boundary: ['只判定相容性，不构造延拓。'] },
    motivation: {
      internal: ['光滑函数在边界处的各阶导数必须来自内部。'],
      external: ['分段建模中把局部数据拼成整体函数。'],
      aesthetic: ['把存在性问题化为有限阶导数的核对。'],
      growthChain: ['局部数据 → 边界相容性 → 延拓存在或失败点'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-manifold-method-extension-1', '写出 f 在边界点的左右各阶导数并比较。', '计算', 'manifold:method-extension-check', '某一阶不一致即报告失败点。')],
      reviewQuestions: ['为什么只在边界的一个点上检查不足？'],
      evidenceStatus: 'ILLUSTRATION',
    },
    provenance,
  }),
];

export const manifoldActions = [
  action('m-chart', 'definition', '引入图与图册', [input('bg:top:space', ['statement', 'definition']), input('bg:set:function', ['statement'])], [output('manifold:top-manifold', ['definition', 'statement']), output('manifold:chart-atlas', ['definition', 'statement'])], { witness: { type: 'definition-introduction', status: 'DEF', ref: 'case:02#chart' } }),
  action('m-trans', 'construction', '构造过渡映射', [input('manifold:chart-atlas', ['definition', 'statement']), input('bg:set:function', ['statement'])], [output('manifold:transition', ['definition', 'statement', 'construction'])], { witness: { type: 'finite-construction', status: 'DEF', ref: 'case:02#transition' } }),
  action('m-reg', 'definition', '引入 C^k 图册条件', [input('manifold:transition', ['definition', 'statement']), input('bg:manifold:calc', ['statement', 'definition'])], [output('manifold:ck-atlas', ['definition', 'statement'])], { witness: { type: 'definition-introduction', status: 'DEF', ref: 'case:02#ck' } }),
  action('m-smooth', 'definition', '引入光滑图册', [input('manifold:transition', ['definition', 'statement']), input('bg:manifold:calc', ['statement'])], [output('manifold:smooth-atlas', ['definition', 'statement'])], { witness: { type: 'definition-introduction', status: 'DEF', ref: 'case:02#smooth' } }),
  action('m-forget', 'deduction', '从光滑遗忘到 C^k', [input('manifold:smooth-atlas', ['definition', 'statement']), input('manifold:ck-atlas', ['definition', 'statement']), input('bg:manifold:calc', ['statement'])], [output('manifold:claim-generalization', ['statement', 'proof'])], { witness: { type: 'prose-proof', status: 'PROOF', ref: 'ev-manifold-generalization' } }),
  action('m-max', 'deduction', '证明最大相容扩张', [input('manifold:ck-atlas', ['definition', 'statement']), input('manifold:transition', ['definition', 'statement']), input('bg:manifold:calc', ['statement'])], [output('manifold:max-k', ['construction']), output('manifold:claim-max', ['statement', 'proof'])], { witness: { type: 'prose-proof', status: 'PROOF', ref: 'ev-manifold-max' } }),
  action('m-example', 'construction', '构造 h 的 C¹ 非 C² 图册', [input('manifold:chart-atlas', ['definition', 'statement']), input('bg:manifold:calc', ['statement'])], [output('manifold:example-h', ['statement', 'construction'])], { witness: { type: 'counterexample', status: 'PROOF', ref: 'ev-manifold-h' } }),
  action('m-transition-eval', 'evidence', '重放同图过渡证书', [input('bg:logic:equality', ['statement'])], [output('manifold:claim-transition-eval', ['statement']), output('manifold:proof-transition', ['proof', 'certificate'])], { witness: { type: 'machine-check', status: 'FINITE', ref: 'ev-manifold-transition-cert' } }),
  action('m-method', 'method', '提出逐对正则性检查方法', [input('manifold:transition', ['statement']), input('bg:manifold:calc', ['statement'])], [output('manifold:method-regularity', ['method'])], { witness: { type: 'method-presentation', status: 'ILLUSTRATION', ref: 'case:02#method' } }),
  action('m-pattern', 'task', '登记单向检查误区', [input('manifold:transition', ['statement']), input('manifold:ck-atlas', ['statement'])], [output('manifold:pattern-one-direction', ['statement'])], { witness: { type: 'pattern-description', status: 'ILLUSTRATION', ref: 'case:02#pattern' } }),
  action('m-problem', 'task', '提出过渡域练习', [input('manifold:chart-atlas', ['statement']), input('manifold:transition', ['statement'])], [output('manifold:problem-transition-domain', ['task'])], { witness: { type: 'task-interface', status: 'DEF', ref: 'case:02#problem' } }),
  action('m-compatible', 'definition', '引入图册兼容关系', [input('manifold:ck-atlas', ['definition', 'statement']), input('manifold:chart-atlas', ['statement'])], [output('manifold:compatible-k', ['definition', 'statement'])], { witness: { type: 'definition-introduction', status: 'DEF', ref: 'case:02#compatible' } }),
  // 方法节点的引入行动：输入按「要会用它，必须先有什么」定，输出类型为 method。
  action('m-method-cover', 'method', '提出有限覆盖法', [input('manifold:chart-atlas', ['definition', 'statement']), input('bg:top:space', ['statement'])], [output('manifold:method-cover-by-charts', ['method'])], { witness: { type: 'method-presentation', status: 'ILLUSTRATION', ref: 'case:02#method' } }),
  action('m-method-extension', 'method', '提出延拓检验法', [input('manifold:smooth-atlas', ['definition', 'statement']), input('bg:manifold:calc', ['statement'])], [output('manifold:method-extension-check', ['method'])], { witness: { type: 'method-presentation', status: 'ILLUSTRATION', ref: 'case:02#method' } }),
];

export const manifoldRelations = [
  relation('rel-manifold-generalization', 'hardGeneralization', 'manifold:ck-atlas', 'manifold:smooth-atlas', { witness: { type: 'same-carrier-implication', status: 'PROOF', ref: 'ev-manifold-generalization' }, scope: '同一图册编码下的 P_∞ ⇒ P_k。' }),
  relation('rel-manifold-forget', 'bridge', 'manifold:smooth-atlas', 'manifold:ck-atlas', { witness: { type: 'forgetful-map', status: 'PROOF', ref: 'ev-manifold-generalization' }, scope: '跨载体遗忘映射；不宣称最大图册字面相等。' }),
  relation('rel-manifold-compat', 'hardGeneralization', 'manifold:compatible-k', 'manifold:ck-atlas', { witness: { type: 'same-carrier-implication', status: 'DEF' }, scope: '兼容性依赖 C^k 定义。' }),
  // specialization 是 hardGeneralization 的反方向：它相对已登记关系有定义，不是新的数学断言。
  // ev-manifold-generalization 的 scope 已写明「不把蕴含换成同一」，反向由该证明本身界定。
  relation('rel-manifold-specialization', 'specialization', 'manifold:smooth-atlas', 'manifold:ck-atlas', { witness: { type: 'inverse-of-declared-generalization', status: 'PROOF', ref: 'ev-manifold-generalization' }, scope: 'C^∞ 是 C^k 的特化（k 有限）；反向不成立，见硬泛化关系的范围说明。' }),
  relation('rel-manifold-application', 'application', 'manifold:chart-atlas', 'manifold:transition', { witness: { type: 'application-description', status: 'DEF', ref: 'm-trans' }, task: '图册给出过渡映射的定义域与像（φ(U∩V) 与 ψ(U∩V)）。' }),
  relation('rel-manifold-crossdomain', 'crossDomain', 'bg:linear:vector', 'manifold:chart-atlas', { witness: { type: 'background-provides-coordinate-space', status: 'DEF' }, scope: '图卡 φ:U→R^n 的像落在 R^n；线性结构是声明背景，不是本案例内导出的结论。', task: '从流形到线性结构的跨域接口。' }),

  /*
   * 硬前置（`hardPrereq`，2026-10 补，与 limit / dg 两案例同一口径）：
   * **不用它，目标节点的定义就写不出来**。见证一律 `DEF` + `definitional-dependency`，
   * `witness.scope` 指明它出现在目标节点定义的哪一处，`scope` 说明这条依赖说的是什么。
   *
   * 只登记定义链上的核心（拓扑 → 图册 → 过渡与 C^k → 光滑 → 兼容与最大扩张）；
   * 例子、误区、方法、练习类节点不登记——它们不是「先有才能定义」的关系。
   * `bg:top:space` 是背景接口，按同一条口径可以当前置的来源（dg 案例登记的是案例内节点，
   * 这里补上背景一侧；背景节点本身不参与语义关系，见 data/relation-coverage.mjs）。
   */
  relation('rel-manifold-pre-top-manifold', 'hardPrereq', 'bg:top:space', 'manifold:top-manifold', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定义的第一句就是「Hausdorff、第二可数、局部欧氏的拓扑空间」：Hausdorff、开集、邻域都来自拓扑。' },
    scope: 'M 是拓扑空间 + 两条分离/可数条件 + 每点有开邻域同胚于 R^n 的开子集。',
  }),
  relation('rel-manifold-pre-manifold-atlas', 'hardPrereq', 'manifold:top-manifold', 'manifold:chart-atlas', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '坐标图 (U,φ) 里的 U 是底空间的开集、φ 是同胚，图册是这些图的覆盖——开、覆盖、同胚三个词都由拓扑流形提供。' },
    scope: '图册的成员是坐标图，坐标图的定义域必须是 X 的开集。',
  }),
  relation('rel-manifold-pre-atlas-ck', 'hardPrereq', 'manifold:chart-atlas', 'manifold:ck-atlas', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定义写作「所有过渡映射均为 C^k 的**图册**」：图册是这条定义的主语。' },
    scope: '去掉图册，(A,k) 里的 A 就没有对象；C^k 是加在图册上的条件。',
  }),
  relation('rel-manifold-pre-transition-ck', 'hardPrereq', 'manifold:transition', 'manifold:ck-atlas', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '「所有过渡映射均为 C^k」逐字用到过渡映射 ψ∘φ⁻¹，它的定义域 φ(U∩V) 也是 C^k 条件的检查范围。' },
    scope: 'C^k 是对过渡映射提的要求；没有过渡映射这个对象，条件无从写起。',
  }),
  relation('rel-manifold-pre-atlas-smooth', 'hardPrereq', 'manifold:chart-atlas', 'manifold:smooth-atlas', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '光滑图册的定义是「所有过渡映射为 C^∞ 的图册」，主语同样是图册。' },
    scope: '光滑图册首先是图册；C^∞ 只是把 C^k 的 k 推到所有阶。',
  }),
  relation('rel-manifold-pre-ck-compatible', 'hardPrereq', 'manifold:ck-atlas', 'manifold:compatible-k', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定义是「两张图册的并为 C^k 图册」：C^k 图册是这条定义的谓词。' },
    scope: '兼容性判断的对象就是两本 C^k 图册之并；没有 C^k 图册就没有可判断的东西。',
  }),
  relation('rel-manifold-pre-compatible-max', 'hardPrereq', 'manifold:compatible-k', 'manifold:max-k', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '最大扩张定义为「所有与 A 兼容的图」组成的 C^k 图册——「兼容」正是这条构造的筛选条件。' },
    scope: '删去兼容性，(A_max) 就退化成「所有图」的集合，不再是图册。',
  }),
  relation('rel-manifold-pre-ck-max', 'hardPrereq', 'manifold:ck-atlas', 'manifold:max-k', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '构造的输出要求是 C^k 图册，且最大性说的是「不能再加入 C^k 兼容的图」。' },
    scope: 'A_max 本身是一本 C^k 图册；它的正确性目标写在 C^k 条件上。',
  }),
  /*
   * 证明依赖（`proof-dependency`，2026-10 加）：证书片段的证明目标是那条断言。
   * `ref` 指向 `ev-manifold-transition-cert`（状态 FINITE，同时列出断言与证书两个节点），
   * 见证状态与证据一致。
   */
  relation('rel-manifold-proof-claim-transition', 'hardPrereq', 'manifold:proof-transition', 'manifold:claim-transition-eval', {
    witness: { type: 'proof-dependency', status: 'FINITE', ref: 'ev-manifold-transition-cert', scope: '证书的证明目标是「同图过渡在指定点的取值」，不先写下这条断言就没有可重放的证书。' },
    scope: '证书片段依赖它的目标断言；这是「证明用到什么」，不是定义材料。',
  }),
];

export const manifoldEvidence = [
  evidence('ev-manifold-max', 'prose-proof', 'PROOF', 'not_run', '最大相容扩张的正文证明', { scope: '覆盖、局部 C^k 复合与最大性。', nodes: ['manifold:claim-max', 'manifold:max-k'], obligations: ['机器编码局部复合与链式法则'], reference: 'mcs-foundations/cases/02-Ck与光滑流形.md#3' }),
  evidence('ev-manifold-generalization', 'prose-proof', 'PROOF', 'not_run', '同载体与跨载体的泛化方向证明', { scope: 'P_∞⇒P_k 与遗忘映射良定义；不混用两种模式。', nodes: ['manifold:claim-generalization'], obligations: ['机器编码良定义证明'], reference: 'mcs-foundations/cases/02-Ck与光滑流形.md#2' }),
  evidence('ev-manifold-h', 'counterexample', 'PROOF', 'not_run', 'C¹ 非 C² 图册反例', { scope: '只反驳给定图册的 C² 性质，不否定光滑结构存在。', nodes: ['manifold:example-h', 'manifold:pattern-one-direction'], reference: 'mcs-foundations/cases/02-Ck与光滑流形.md#3' }),
  evidence('ev-manifold-transition-cert', 'machine-certificate', 'FINITE', 'passed', '同图过渡片段证书', {
    scope: '指定点的右逆等式下 φ(φ⁻¹(y))=y；不含限制域、图册与正则性。', nodes: ['manifold:claim-transition-eval', 'manifold:proof-transition'],
    certificate: 'mcs-foundations/validation/certification/certificates/manifold.json', checker: 'mcs-nd-subset/1',
    openAssumptions: ['指定点的右逆等式'], obligations: ['开集、限制域、图册、覆盖、正则性、链式法则与最大扩张未编码'],
  }),
  evidence('ev-manifold-reference', 'reference', 'REF', 'not_run', '流形结构的经典来源', { scope: '经典微分流形教材的定义范围；未逐页核对全部证明。', nodes: ['manifold:top-manifold'], reference: '专稿附录 B 的流形来源条目' }),
  evidence('ev-manifold-not-claimed', 'not-claimed', 'NOT-CLAIMED', 'not_run', '未声称的范围', { scope: '不声称任意连续双射可微，也不认证最大图册的机器检查。', nodes: ['manifold:claim-max'] }),
  // 方法本身是操作步骤而非可证命题：证据只声明「步骤与案例正文一致」。
  evidence('ev-manifold-method-cover', 'prose-proof', 'ILLUSTRATION', 'not_run', '有限覆盖法：步骤与案例正文一致', {
    scope: '方法不是命题；本证据只声明步骤描述没有超出正文，且「覆盖 ≠ 相容」这一边界已写出。',
    nodes: ['manifold:method-cover-by-charts'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对覆盖与过渡相容两步是否分得很清楚'],
    reference: 'mcs-foundations/cases/02-Ck与光滑流形.md#2',
  }),
  evidence('ev-manifold-method-extension', 'prose-proof', 'ILLUSTRATION', 'not_run', '延拓检验法：步骤与案例正文一致', {
    scope: '方法不是命题；本证据只声明步骤描述没有超出正文，且不声称构造出延拓。',
    nodes: ['manifold:method-extension-check'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对「只判定相容性、不构造延拓」这一限制是否保留'],
    reference: 'mcs-foundations/cases/02-Ck与光滑流形.md#3',
  }),
  // 原有方法也补一条：让「每个方法节点都有独立证据」这条不变量一致成立。
  evidence('ev-manifold-method-regularity', 'prose-proof', 'ILLUSTRATION', 'not_run', '逐对检查法：步骤与案例正文一致', {
    scope: '方法不是命题；本证据只声明步骤描述没有超出正文，且「无限图册返回未决」已写出。',
    nodes: ['manifold:method-regularity'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对有限可枚举这一前提是否保留'],
    reference: 'mcs-foundations/cases/02-Ck与光滑流形.md#2',
  }),
];

export const manifoldSupport = [
  support('sup-manifold-top-expr', 'manifold:top-manifold', 'expression', 'known', { set: ['bg:top:space', 'bg:set:function'], minimal: false }),
  support('sup-manifold-transition-expr', 'manifold:transition', 'expression', 'known', { set: ['manifold:chart-atlas', 'bg:set:function'], minimal: false }),
  support('sup-manifold-ck-expr', 'manifold:ck-atlas', 'expression', 'known', { set: ['manifold:transition', 'bg:manifold:calc'], minimal: false }),
  support('sup-manifold-smooth-expr', 'manifold:smooth-atlas', 'expression', 'known', { set: ['manifold:transition', 'bg:manifold:calc'], minimal: false }),
  support('sup-manifold-max-proof', 'manifold:claim-max', 'proof', 'known', { set: ['manifold:ck-atlas', 'manifold:transition', 'bg:manifold:calc'], minimal: false, evidence: ['ev-manifold-max'] }),
  support('sup-manifold-generalization-proof', 'manifold:claim-generalization', 'proof', 'known', { set: ['manifold:smooth-atlas', 'manifold:ck-atlas'], minimal: true, evidence: ['ev-manifold-generalization'] }),
  support('sup-manifold-h-proof', 'manifold:example-h', 'proof', 'known', { set: ['bg:manifold:calc', 'manifold:chart-atlas'], minimal: false, evidence: ['ev-manifold-h'] }),
  support('sup-manifold-pattern-route', 'manifold:pattern-one-direction', 'route', 'unknown', { reason: '误区模式是公共描述，不登记个人的路线输入支持。' }),
];

export const manifoldClaims = [
  claimRecord('claim-manifold-max', 'manifold:claim-max', 'A_max 是 C^k 图册且按包含最大。', ['ev-manifold-max']),
  claimRecord('claim-manifold-generalization', 'manifold:claim-generalization', '同一图册编码下 C^∞ 过渡推出 C^k 过渡。', ['ev-manifold-generalization']),
  claimRecord('claim-manifold-transition-eval', 'manifold:claim-transition-eval', '右逆假设下同图过渡在指定点等于该点。', ['ev-manifold-transition-cert'], 'FINITE'),
];

export const manifoldPatterns = [
  { id: 'manifold:pattern-one-direction', node: 'manifold:pattern-one-direction', anchors: ['manifold:transition', 'manifold:ck-atlas'], title: '只检验一个过渡方向' },
];

export const manifoldAggregates = [
  { id: 'agg-manifold', kind: 'topic', title: 'C^k 与光滑流形', blocks: [['manifold:top-manifold', 'manifold:chart-atlas', 'manifold:transition', 'manifold:ck-atlas', 'manifold:smooth-atlas', 'manifold:max-k'], ['manifold:method-regularity', 'manifold:method-cover-by-charts', 'manifold:method-extension-check']], note: '话题块保留重叠成员与来源；方法节点单独成块。' },
];

export const manifold = { nodes: manifoldNodes, actions: manifoldActions, relations: manifoldRelations, evidence: manifoldEvidence, support: manifoldSupport, claims: manifoldClaims, patterns: manifoldPatterns, aggregates: manifoldAggregates };
