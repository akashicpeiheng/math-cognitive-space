import { concept, claim, proof, construction, method, patternNode, problem, counterexample, action, input, output, relation, evidence, support, claimRecord, representation, selfCheck, condition } from '../authoring.mjs';

// 学科按**对象**取值（2026-10 细分）：本案例主体是多重线性与张量代数；
// 只用到线性结构的四个节点（对偶、算子同构、无限维算子反例、维数计数）另行标为「线性代数」。
const discipline = '多重线性与张量代数';
const linearAlgebra = '线性代数';
const provenance = { sources: ['专稿：案例 03、第 08 与第 14 章', 'mcs-foundations/cases/03-张量与张量场.md'], note: '有限维条件与无限维反例分开。' };

export const tensorNodes = [
  concept('tensor:dual', '对偶空间', {
    discipline: linearAlgebra, case: 'tensor', summary: 'V*=Hom(V,F)，线性函数空间。',
    objectType: '线性函数空间', parameters: ['V', 'F'], predicate: 'Dual(V,F)=Hom(V,F)', type: 'o',
    formal: { symbols: ['V*', 'Hom'], typeEnv: { V: 'VectorSpace(F)', F: 'Field' }, boundary: ['未给度量或内积时不存在自然的 V≅V*。'] },
    representations: [representation('rep-tensor-dual', 'definition', '线性函数空间', '公式', 'DEF', 'V* 的元素作用于 V 得到标量。')],
    motivation: { internal: ['张量需要同时吃向量与协向量。'], external: ['线性泛函与测量。'], aesthetic: ['对偶把“作用”对象化。'], growthChain: ['线性映射 → 取值泛函 → 对偶空间'] },
    teaching: { conditions: [condition('有限维', '直接推广到无限维自然同构', '无限维 V 与 V** 的自然嵌入不必满射', '同构结论失效。')], commonMisconceptions: ['默认为 V 与 V* 有自然同构。'], reviewQuestions: ['对偶基依赖什么选择？'], evidenceStatus: 'DEF' },
    provenance,
  }),
  concept('tensor:tensor-product', '张量积', {
    discipline, case: 'tensor', summary: '双线性映射的通用对象。',
    objectType: '通用双线性对象', parameters: ['V', 'W'], predicate: 'TensorProduct(V,W)', type: 'o',
    formal: { symbols: ['⊗'], typeEnv: { V: 'VectorSpace(F)', W: 'VectorSpace(F)' }, boundary: ['通用性质的存在唯一性来自共享线性代数背景。'] },
    representations: [representation('rep-tensor-product', 'definition', '通用性质', '公式与交换图', 'DEF', '双线性映射唯一分解经张量积。')],
    motivation: { internal: ['把双线性问题化为线性问题。'], external: ['多重线性测量与物理量。'], aesthetic: ['泛性质消去坐标。'], growthChain: ['双线性映射 → 分量直觉 → 通用对象'] },
    teaching: { conditions: [condition('双线性', '允许一般函数', '任意函数不能经线性映射分解', '通用性质失效。')], commonMisconceptions: ['把张量积当作逐分量乘积。'], reviewQuestions: ['通用性质里“唯一”约束了什么？'], evidenceStatus: 'DEF' },
    provenance,
  }),
  concept('tensor:tensor-rs', '(r,s) 型张量空间', {
    discipline, case: 'tensor', summary: 'T^r_s(V)=V^{⊗r}⊗(V*)^{⊗s}。',
    objectType: '张量空间', parameters: ['V', 'r', 's'], predicate: 'T^r_s(V)', type: 'o',
    formal: { symbols: ['T^r_s'], typeEnv: { V: 'VectorSpace(F)', r: 'N', s: 'N' }, assumptions: ['r,s 有限'], boundary: ['零重张量积约定为 F。'] },
    representations: [representation('rep-tensor-rs', 'definition', '张量空间公式', '公式', 'DEF', '上下指标分别对应协变与逆变方向。')],
    motivation: { internal: ['统一处理多重线性对象。'], external: ['应力、曲率与电磁张量。'], aesthetic: ['上下指标的对称结构。'], growthChain: ['向量与对偶 → 多重张量积 → T^r_s'] },
    teaching: { conditions: [condition('r,s 有限', '直接使用无限张量积', '代数张量只含有限和', '自然同构论证失效。')], commonMisconceptions: ['把上下指标顺序当作无关紧要。'], reviewQuestions: ['为什么 (1,1) 型张量可对应线性映射？'], evidenceStatus: 'DEF' },
    provenance,
  }),
  concept('tensor:multilinear', '多重线性函数', {
    discipline, case: 'tensor', summary: '(V*)^r×V^s→F 的多线性函数。',
    objectType: '多重线性映射', parameters: ['r', 's'], predicate: 'Multilinear(f,r,s)', type: 'o',
    formal: { symbols: ['Multilinear'], typeEnv: { f: 'Fun', r: 'N', s: 'N' }, boundary: ['多线性与线性不是同一条件。'] },
    representations: [representation('rep-tensor-multilinear', 'definition', '逐变量线性', '公式', 'DEF', '固定其余变量后对每个变量线性。')],
    motivation: { internal: ['张量的操作定义与坐标计算。'], external: ['多重线性响应函数。'], aesthetic: ['逐变量线性的乘积结构。'], growthChain: ['线性映射 → 双线性 → 多重线性'] },
    teaching: { conditions: [condition('对每个变量线性', '只要求对第一个变量线性', '混合偏导或双重线性反例', '张量性失效。')], commonMisconceptions: ['把所有多重函数都叫张量。'], reviewQuestions: ['多线性函数空间与 T^r_s 的关系是什么？'], evidenceStatus: 'DEF' },
    provenance,
  }),
  claim('tensor:basis-law', '换基规律', {
    discipline, case: 'tensor', roles: ['Theorem'], summary: '同一张量的分量在换基下按上下指标变换。',
    formula: '每个上指标乘 A⁻¹，每个下指标乘 A；一般分量满足 [T]′ = A^{…}T A^{…}', typeEnv: { A: 'Matrix', T: 'Tensor' },
    formal: { assumptions: ['e′_j=Σ_i e_i A^i_j'], boundary: ['规律是同一对象在两组基下的表达，不生成新对象。'] },
    motivation: { internal: ['区分对象与坐标表征。'], external: ['坐标变换下的物理量。'], aesthetic: ['指标计数与变换律的自然配对。'], growthChain: ['线性映射矩阵 → 换基 → 一般指标规律'] },
    teaching: { proofOverview: '先把旧坐标 Av′ 代入线性映射，再把输出换成新坐标 A⁻¹LAv′；对任意 v′ 成立即得矩阵等式，一般张量按因子线性延拓。', conditions: [condition('同一线性映射', '把换基当作改变映射', '同一映射换基前后矩阵相似但不相等', '把表达变化误当对象变化。')], commonMisconceptions: ['把任意指标数组都当作张量。'], reviewQuestions: ['Christoffel 系数为什么不是张量？'], evidenceStatus: 'PROOF' },
    provenance,
  }),
  claim('tensor:end-iso', '张量与线性算子的同构', {
    // 归「线性代数」：这条命题讲的是算子与矩阵（End(V)、矩阵单位、相似），张量空间只是等式的一侧。
    discipline: linearAlgebra, case: 'tensor', roles: ['Theorem'], summary: '有限维时 Φ:V⊗V*→End(V) 是自然同构。',
    formula: 'Φ(v⊗α)(w)=α(w)v；dim V<∞ ⇒ Φ 为同构', typeEnv: { v: 'V', α: 'V*', w: 'V' },
    formal: { assumptions: ['dim V 有限'], boundary: ['Φ 的定义不选基；证明双射时才使用基。'] },
    motivation: { internal: ['(1,1) 型张量与线性映射应互相翻译。'], external: ['线性算子代数与张量代数的接口。'], aesthetic: ['无坐标定义 + 基证明。'], growthChain: ['秩一映射 → 双线性 → 通用性质 → 同构'] },
    teaching: { proofOverview: '(v,α)↦(w↦α(w)v) 双线性，诱导 Φ；取基与对偶基，Φ(e_i⊗ε^j) 为矩阵单位 E_ij，两端同维且基对应，故为同构。', conditions: [condition('有限维', '推广到无限维', '恒等算子无限秩，不在代数张量像中', '满射性失败。')], commonMisconceptions: ['把基证明当作 Φ 依赖基的定义。'], reviewQuestions: ['无限维反例具体排除了哪个方向？'], evidenceStatus: 'PROOF' },
    provenance,
  }),
  claim('tensor:rank1-additive', '秩一映射保持加法', {
    discipline, case: 'tensor', roles: ['Property'], summary: '机器认证片段：R(x)=α(x)v 保持加法。',
    formula: 'R(x+y)=R(x)+R(y)，其中 R(x)=α(x)v', typeEnv: { α: 'V -> F', v: 'V', x: 'V', y: 'V' },
    formal: { assumptions: ['α 保持加法', '标量对加法分配'], boundary: ['不含标量线性、张量积通用性质、基、有限维双射与丛/截面。'] },
    motivation: { internal: ['张量证明中最常复用的代数一步。'], external: ['展示条件如何随证书保留。'], aesthetic: ['逐项替换。'], growthChain: ['Φ 定义 → 秩一情形 → 加法保持证书'] },
    teaching: { proofOverview: '展开 R(x+y)=α(x+y)v=(α(x)+α(y))v=α(x)v+α(y)v。', conditions: [condition('α 可加', '删去可加性', 'F₂ 一维空间取 α 恒为 1、v=1', 'R(x+y)≠R(x)+R(y)。'), condition('标量分配律', '保留 α 可加但把标量作用定义为恒 1', 'F₂ 上 R(x+y)=1 而 R(x)+R(y)=0', '结论失败。')], commonMisconceptions: ['把这一步当作完整同构已认证。'], reviewQuestions: ['下一步还需要证明什么？'], evidenceStatus: 'FINITE' },
    provenance,
  }),
  proof('tensor:proof-rank1-additive', '秩一加法证书', {
    discipline, case: 'tensor', target: 'tensor:rank1-additive', checkStatus: 'passed',
    formal: { theory: 'T_scalar_distributive', openAssumptions: ['α 保持加法'], boundary: ['标量分配律作为闭理论公理；其余向量空间公理未编码。'] },
    // 证据等级：本条是能重放的有限证书（machine-certificate / passed），带一个开放假设。
    teaching: { evidenceStatus: 'FINITE', reviewQuestions: ['这条证书依赖哪个开放假设？完整同构还缺哪些义务？'] },
    summary: '现有 ND 子集检查器接受的局部证书，带一个开放假设。', provenance,
  }),
  construction('tensor:bundle', '张量丛', {
    discipline, case: 'tensor', summary: '各点 T^r_s(T_xX) 的光滑丛。',
    inputs: ['光滑流形 X', '切丛 TX', 'T^r_s'], outputs: ['张量丛'],
    steps: [{ id: 's1', note: '在每点取纤维 T^r_s(T_xX)。' }, { id: 's2', note: '用坐标图给出局部平凡化。' }, { id: 's3', note: '按 Jacobian 换基规律验证过渡函数。' }],
    verificationTarget: '局部平凡化与过渡函数满足丛的粘合条件。',
    formal: { boundary: ['光滑性与过渡规律来自丛定义；未编码为机器证书。'] },
    representations: [representation('rep-tensor-bundle', 'construction', '逐点纤维粘合', '有限步骤', 'PROOF', '过渡函数为张量换基规律。')],
    motivation: { internal: ['把逐点张量组织成整体结构。'], external: ['曲率与应力场。'], aesthetic: ['局部线性数据粘合为整体。'], growthChain: ['逐点张量 → 坐标图 → 过渡函数 → 丛'] },
    teaching: { proofOverview: '每点纤维经局部平凡化拼合；相邻图之间的分量按上下指标换基规律变换，保证粘合良定义。', conditions: [condition('图册覆盖 X', '删去覆盖', '未覆盖点没有局部纤维坐标', '整体构造缺口。')], commonMisconceptions: ['任意逐点赋值都能组成丛。'], reviewQuestions: ['过渡函数在这里扮演什么角色？'], evidenceStatus: 'PROOF' },
    provenance,
  }),
  concept('tensor:field', '张量场', {
    discipline, case: 'tensor', summary: '张量丛的光滑截面。',
    objectType: '截面空间', parameters: ['X', 'T^r_s'], predicate: 'TensorField(X,T^r_s)', type: 'o',
    formal: { symbols: ['Γ'], typeEnv: { X: 'Manifold', T: 'Bundle' }, boundary: ['光滑截面与局部分量等价需要正确的过渡函数。'] },
    representations: [representation('rep-tensor-field', 'definition', '光滑截面', '公式', 'DEF', '每点取值在对应纤维中且随点光滑变化。')],
    motivation: { internal: ['几何与物理关心随位置变化的张量。'], external: ['电磁场与曲率。'], aesthetic: ['截面把丛的逐点结构提升为整体对象。'], growthChain: ['张量 → 张量丛 → 截面'] },
    teaching: { conditions: [condition('光滑', '只要求逐点取值', '任意选择基逐点赋值不保证光滑', '截面定义失效。')], commonMisconceptions: ['把所有指标数组都当作张量场。'], reviewQuestions: ['局部分量与截面何时一一对应？'], evidenceStatus: 'DEF' },
    provenance,
  }),
  counterexample('tensor:non-tensor-gamma', 'Christoffel 系数不是张量', {
    discipline, case: 'tensor', summary: '联络系数在换基下多出非齐次项。',
    target: '所有带指标数组都是张量', objectSpec: { transform: 'y=x²', gamma_old: 'Γ^y_yy=0', gamma_new: 'Γ^y_yy=−1/(2y)' },
    failureWitness: '同一联络在两坐标下的系数不按张量换基规律变换。',
    formal: { anchors: ['tensor:field', 'tensor:basis-law'], boundary: ['反例只排除“所有指标数组都是张量”的过度推广。'] },
    representations: [representation('rep-tensor-gamma', 'counterexample', 'Christoffel 反例', '计算', 'PROOF', '非齐次项破坏张量变换律。')],
    motivation: { internal: ['指标外形相似不等于张量性。'], external: ['联络与曲率的区别。'], aesthetic: ['变换律是最小判据。'], growthChain: ['指标数组 → 变换律检查 → 非张量反例'] },
    teaching: { proofOverview: '按联络换坐标公式计算，非齐次项无法消去，故不满足张量变换律。', conditions: [condition('使用联络的换坐标公式', '只比较数组外形', '可以把任意数组写成上标下标形式', '“看起来像张量”的判据失效。')], commonMisconceptions: ['把上下指标当作张量定义。'], reviewQuestions: ['如何用变换律排除一个候选？'], selfCheck: [selfCheck('sc-tensor-gamma-1', '写出张量与联络系数的变换律差异。', '结构辨析', 'tensor:non-tensor-gamma', '指出非齐次项。')], evidenceStatus: 'PROOF' },
    provenance,
  }),
  counterexample('tensor:infinite-rank', '无限维恒等算子不在 Φ 像中', {
    discipline: linearAlgebra, case: 'tensor', summary: '代数张量的像只含有限秩算子。',
    target: '无限维时 Φ:V⊗V*→End(V) 满射', objectSpec: { V: '无限维向量空间', id: '恒等算子' },
    failureWitness: '恒等算子不是有限秩算子，而 v⊗α 的像为一维，有限和仍为有限秩。',
    formal: { anchors: ['tensor:end-iso'], boundary: ['只反驳无限维满射，不否定单射与有限维同构。'] },
    representations: [representation('rep-tensor-infinite', 'counterexample', '无限维秩反例', '证明', 'PROOF', '有限和保持有限秩。')],
    motivation: { internal: ['有限维条件在满射处实质使用。'], external: ['无限维算子代数与代数张量的差别。'], aesthetic: ['秩是最小障碍。'], growthChain: ['有限维证明 → 检查满射 → 无限维反例'] },
    teaching: { proofOverview: '每个 v⊗α 的像至多一维；有限和至多有限维；恒等算子像为整个无限维空间。', conditions: [condition('dim V<∞', '删去有限维条件', 'V 无限维时恒等算子', '满射性失败。')], commonMisconceptions: ['把有限维同构无条件推广。'], reviewQuestions: ['单射在无限维还成立吗？'], evidenceStatus: 'PROOF' },
    provenance,
  }),
  method('tensor:method-invariant', '寻找不变量', {
    discipline, case: 'tensor', scope: '全局方法', summary: '通过换基前后保持的量区分对象与表征。',
    In: '含表征选择的几何或代数问题', Out: '候选不变量及其保持证明', Pre: '变换族与有效域已声明', Post: '不变量、保持范围与失效边界',
    Use: ['tensor:basis-law'], Demo: ['tensor:end-iso', 'tensor:non-tensor-gamma'], Fail: '未证明保持的量只是候选；不能因为多个例子不变就当作不变量。',
    body: '列出变换族，找一个在所有允许变换下保持的量，再检查它是否区分目标对象。',
    formal: { applicableTo: ['tensor:tensor-rs'], boundary: ['方法不替代保持性证明。'] },
    motivation: { internal: ['对象不随坐标改变，表征会改变。'], external: ['守恒量与规范不变性。'], aesthetic: ['用不变量消除坐标噪声。'], growthChain: ['换基 → 保持量 → 不变量'] },
    teaching: { selfCheck: [selfCheck('sc-tensor-method-1', '为 Φ 同构找一个换基下保持的判据。', '方法使用', 'tensor:method-invariant', '如秩或维数；需给出证明。')], reviewQuestions: ['候选不变量在什么变换族下保持？'], evidenceStatus: 'ILLUSTRATION' },
    provenance,
  }),
  patternNode('tensor:pattern-index-array', '误区：所有指标数组都是张量', {
    discipline, case: 'tensor', summary: '把上下指标外形当作张量性判据。',
    wrongRule: '任何带上下指标的数组都按张量变换', task: '检查候选数组的换基规律',
    counterexample: 'Christoffel 系数带非齐次项', scope: '只反驳“外形足以判定张量”的规则；不否定个别数组确实满足变换律。', anchors: ['tensor:non-tensor-gamma', 'tensor:basis-law'],
    formal: { boundary: ['个体是否持有该误区属于外部模型 E。'] },
    motivation: { internal: ['指标记号很容易掩盖变换律。'], external: ['物理教材中的记号混淆。'], aesthetic: ['用变换律作判别式。'], growthChain: ['指标外形 → 变换律 → 反例'] },
    teaching: { selfCheck: [selfCheck('sc-tensor-pattern-1', '写出上指标与下指标的变换因子。', '定义陈述', 'tensor:pattern-index-array', '上指标 A⁻¹，下指标 A。')], reviewQuestions: ['为什么“看起来像”不是定义？'], evidenceStatus: 'ILLUSTRATION' },
    provenance,
  }),
  problem('tensor:problem-transform-law', '检查一个候选数组的变换律', {
    discipline, case: 'tensor', summary: '给定坐标变换与候选分量，判断是否为张量。',
    inputs: ['坐标变换', '候选分量数组'], outputs: ['变换律检查结果或反例'],
    goal: '按上下指标分别应用变换因子，判断候选数组是否满足张量变换律。', constraints: ['写出定义域', '不以外形判断'],
    formal: { boundary: ['开放计算题不假装具有通用判定器。'] },
    motivation: { internal: ['把定义转化为可执行检查。'], external: ['坐标变换下的量纲与守恒检验。'], aesthetic: ['一次代入即可否定。'], growthChain: ['变换律 → 代入 → 非齐次项识别'] },
    teaching: { selfCheck: [selfCheck('sc-tensor-problem-1', '对 Γ^y_yy 在 y=x² 下计算变换结果。', '计算', 'tensor:problem-transform-law', '得到非齐次项。')], reviewQuestions: ['什么额外结构能让联络系数变成张量？'], evidenceStatus: 'DEF' },
    provenance,
  }),
  method('tensor:method-basis-check', '逐个代入上下指标验证变换律', {
    discipline, case: 'tensor', scope: '局部方法',
    summary: '拿到一个候选分量数组时，逐个把上下指标配上变换因子再相加，直接代入检查是否等于目标值。',
    In: '坐标变换与候选分量数组', Out: '满足或违反变换律的结论与非齐次项', Pre: '已写出变换矩阵及其逆',
    Post: '给出逐项的检查结果；违反时指出非齐次项的位置',
    Use: ['tensor:basis-law', 'tensor:non-tensor-gamma'],
    Demo: ['tensor:pattern-index-array'],
    Fail: '只对给定的这一组变换代入，不能据一个例子断定它对所有变换都成立；反例方向是可靠的，全称方向仍需证明。',
    body: '写出变换矩阵 A 与逆 A⁻¹；对上指标配 A⁻¹、下指标配 A；逐项求和后与候选数组在同一坐标下的取值比较；不等时把差写成非齐次项。',
    formal: { applicableTo: ['tensor:basis-law'], boundary: ['一次代入只能否定，不能肯定；肯定需要一般性证明。'] },
    motivation: {
      internal: ['变换律是一个可逐项核对的等式，代入即可判定。'],
      external: ['坐标变换下的量纲与守恒检验。'],
      aesthetic: ['把结构问题降为一次代数代入。'],
      growthChain: ['指标外形混淆 → 写出变换因子 → 逐项代入 → 非齐次项'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-tensor-method-basis-1', '为上指标与下指标分别写出变换因子。', '计算', 'tensor:method-basis-check', '上指标 A⁻¹，下指标 A。')],
      reviewQuestions: ['为什么代入一个反例就足以否定，但代入一百个例子仍不足以肯定？'],
      evidenceStatus: 'ILLUSTRATION',
    },
    provenance,
  }),
  method('tensor:method-dimension-count', '用维数计数区分同构与同构的具体实现', {
    discipline: linearAlgebra, case: 'tensor', scope: '局部方法',
    summary: '两个张量空间是否可能同构，先算维数：维数不等立即排除，维数相等再去找显式映射。',
    In: '两个张量空间的描述', Out: '维数比较结论或待构造的显式同构', Pre: '两个空间都是有限维且维数可算',
    Post: '维数不等时给出排除结论；相等时给出需要构造的映射类型',
    Use: ['tensor:tensor-rs', 'tensor:end-iso', 'bg:linear:vector'],
    Demo: ['tensor:end-iso'],
    Fail: '维数相等只是同构的必要条件；本方法不产生同构本身，也不适用于无限维空间。',
    body: '分别数出两个空间的自由指标个数得到维数；不等则排除；相等则写下候选映射并验证线性与双射。',
    formal: { applicableTo: ['tensor:end-iso'], boundary: ['有限维前提不可删去；无限维情形维数论证失效。'] },
    motivation: {
      internal: ['有限维空间的同构判定第一步就是维数。'],
      external: ['指标运算的实现前先确认自由度是否匹配。'],
      aesthetic: ['用最少的信息排除最大的一类错误。'],
      growthChain: ['同构猜测 → 数维数 → 排除或转为构造任务'],
    },
    teaching: {
      selfCheck: [selfCheck('sc-tensor-method-dimension-1', '数出 (r,s) 型张量空间与 End 空间的维数并比较。', '计算', 'tensor:method-dimension-count', '两者维数相等时仍需构造显式映射。')],
      reviewQuestions: ['维数论证在哪里依赖有限维这一前提？'],
      evidenceStatus: 'ILLUSTRATION',
    },
    provenance,
  }),
];

export const tensorActions = [
  action('t-dual', 'definition', '引入对偶空间', [input('bg:linear:vector', ['statement', 'definition'])], [output('tensor:dual', ['definition', 'statement'])], { witness: { type: 'definition-introduction', status: 'DEF', ref: 'case:03#dual' } }),
  action('t-univ', 'definition', '引入张量积与通用性质', [input('bg:linear:vector', ['statement', 'definition']), input('tensor:dual', ['definition', 'statement'])], [output('tensor:tensor-product', ['definition', 'statement']), output('tensor:tensor-rs', ['definition', 'statement'])], { witness: { type: 'universal-property', status: 'REF', ref: 'case:03#product' } }),
  action('t-multilinear', 'definition', '引入多重线性函数', [input('tensor:tensor-rs', ['definition', 'statement']), input('tensor:dual', ['statement'])], [output('tensor:multilinear', ['definition', 'statement'])], { witness: { type: 'definition-introduction', status: 'DEF', ref: 'case:03#multilinear' } }),
  action('t-matrix', 'deduction', '证明换基规律', [input('tensor:tensor-rs', ['definition', 'statement']), input('bg:linear:vector', ['statement'])], [output('tensor:basis-law', ['statement', 'proof'])], { witness: { type: 'prose-proof', status: 'PROOF', ref: 'ev-tensor-basis-law' } }),
  action('t-bridge', 'deduction', '证明张量与线性算子同构', [input('tensor:tensor-product', ['definition', 'statement']), input('tensor:dual', ['definition', 'statement']), input('bg:linear:vector', ['statement'])], [output('tensor:end-iso', ['statement', 'proof'])], { witness: { type: 'prose-proof', status: 'PROOF', ref: 'ev-tensor-end-iso' } }),
  action('t-bundle', 'construction', '构造张量丛', [input('manifold:top-manifold', ['statement', 'definition']), input('tensor:tensor-rs', ['definition', 'statement'])], [output('tensor:bundle', ['construction'])], { witness: { type: 'finite-construction', status: 'PROOF', ref: 'ev-tensor-bundle' } }),
  action('t-field', 'definition', '引入张量场', [input('tensor:bundle', ['construction']), input('bg:top:space', ['statement'])], [output('tensor:field', ['definition', 'statement'])], { witness: { type: 'definition-introduction', status: 'DEF', ref: 'case:03#field' } }),
  action('t-guard', 'task', '给出 Christoffel 非张量反例', [input('tensor:basis-law', ['statement', 'proof']), input('bg:manifold:calc', ['statement'])], [output('tensor:non-tensor-gamma', ['statement'])], { witness: { type: 'counterexample', status: 'PROOF', ref: 'ev-tensor-gamma' } }),
  action('t-infinite', 'task', '给出无限维秩反例', [input('tensor:end-iso', ['statement', 'proof']), input('bg:linear:vector', ['statement'])], [output('tensor:infinite-rank', ['statement'])], { witness: { type: 'counterexample', status: 'PROOF', ref: 'ev-tensor-infinite' } }),
  action('t-rank1', 'evidence', '重放秩一加法证书', [input('bg:logic:equality', ['statement'])], [output('tensor:rank1-additive', ['statement']), output('tensor:proof-rank1-additive', ['proof', 'certificate'])], { witness: { type: 'machine-check', status: 'FINITE', ref: 'ev-tensor-rank1-cert' } }),
  action('t-method', 'method', '提出寻找不变量方法', [input('tensor:basis-law', ['statement', 'proof'])], [output('tensor:method-invariant', ['method'])], { witness: { type: 'method-presentation', status: 'ILLUSTRATION', ref: 'case:03#method' } }),
  action('t-pattern', 'task', '登记指标数组误区', [input('tensor:basis-law', ['statement']), input('tensor:non-tensor-gamma', ['statement'])], [output('tensor:pattern-index-array', ['statement'])], { witness: { type: 'pattern-description', status: 'ILLUSTRATION', ref: 'case:03#pattern' } }),
  action('t-problem', 'task', '提出变换律检查练习', [input('tensor:basis-law', ['statement', 'proof'])], [output('tensor:problem-transform-law', ['task'])], { witness: { type: 'task-interface', status: 'DEF', ref: 'case:03#problem' } }),
  // 方法节点的引入行动：输入按「要会用它，必须先有什么」定，输出类型为 method。
  action('t-method-basis', 'method', '提出逐项代入验证法', [input('tensor:basis-law', ['statement', 'proof']), input('tensor:non-tensor-gamma', ['statement'])], [output('tensor:method-basis-check', ['method'])], { witness: { type: 'method-presentation', status: 'ILLUSTRATION', ref: 'case:03#method' } }),
  action('t-method-dimension', 'method', '提出维数计数法', [input('tensor:tensor-rs', ['definition', 'statement']), input('tensor:end-iso', ['statement', 'proof'])], [output('tensor:method-dimension-count', ['method'])], { witness: { type: 'method-presentation', status: 'ILLUSTRATION', ref: 'case:03#method' } }),
];

export const tensorRelations = [
  relation('rel-tensor-generalization', 'hardGeneralization', 'tensor:multilinear', 'tensor:tensor-rs', { witness: { type: 'universal-property', status: 'REF', ref: 'case:03#product' }, scope: '多重线性函数空间与张量空间按通用性质对应。' }),
  // 反方向：张量空间按通用性质对应多重线性函数空间。与上面一条成对，依据同一处引用。
  relation('rel-tensor-specialization', 'specialization', 'tensor:tensor-rs', 'tensor:multilinear', { witness: { type: 'inverse-of-declared-generalization', status: 'REF', ref: 'case:03#product' }, scope: '反方向同属一条通用性质；两条关系成对，不代表两个方向各自独立成立。' }),
  relation('rel-tensor-bridge', 'bridge', 'tensor:tensor-product', 'tensor:end-iso', { witness: { type: 'isomorphism-proof', status: 'PROOF', ref: 'ev-tensor-end-iso' }, scope: '有限维；基只用于证明。' }),
  relation('rel-tensor-application', 'application', 'tensor:tensor-rs', 'tensor:field', { witness: { type: 'application-description', status: 'PROOF', ref: 'ev-tensor-bundle' }, task: '从逐点张量到整体张量场。' }),
  // 对偶：V⊗V* ≅ End(V)。依据与 end-iso 同一处正文证明；「对偶」是这对空间的名称，不是新的数学断言。
  relation('rel-tensor-duality', 'duality', 'tensor:tensor-product', 'tensor:dual', { witness: { type: 'isomorphism-proof', status: 'PROOF', ref: 'ev-tensor-end-iso' }, scope: 'V⊗V* 与 End(V) 在有限维下同构，对偶来自这一配对；无限维不成立。' }),
  // 跨域：张量丛的构造同时使用流形与线性结构（t-bundle 的输入即为二者）。
  relation('rel-tensor-crossdomain', 'crossDomain', 'manifold:top-manifold', 'tensor:bundle', { witness: { type: 'cross-domain-construction', status: 'PROOF', ref: 'ev-tensor-bundle' }, scope: '构造张量丛需要底流形与逐点线性结构；两条线索在构造处汇合。', task: '从流形与线性结构到张量丛的跨域接口。' }),

  /*
   * 硬前置（`hardPrereq`，2026-10 补，与 limit / dg 两案例同一口径）：
   * **不用它，目标节点的定义就写不出来**。见证一律 `DEF` + `definitional-dependency`。
   *
   * 本案例的定义链是：线性代数背景 → 对偶空间 →（多重线性）→ 张量积 → (r,s) 型张量空间
   * → 张量丛 → 张量场，旁支是换基规律。例子、误区、方法、练习与证书类节点不登记。
   * `bg:linear:vector` 是背景接口，按同口径可以当前置的来源。
   */
  relation('rel-tensor-pre-linear-dual', 'hardPrereq', 'bg:linear:vector', 'tensor:dual', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定义写作 V* = Hom(V,F)：Hom(V,F) 是线性映射空间，V 与 F 都来自线性代数背景。' },
    scope: '对偶空间的元素是线性函数；「线性」与「域」都由背景提供。',
  }),
  relation('rel-tensor-pre-dual-multilinear', 'hardPrereq', 'tensor:dual', 'tensor:multilinear', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定义域写成 (V*)^r × V^s：多重线性函数的每个变量槽都以对偶空间或原空间为类型。' },
    scope: '多重线性函数的定义逐字用到 V 与 V*；没有对偶空间，协变槽无法写。',
  }),
  relation('rel-tensor-pre-linear-product', 'hardPrereq', 'bg:linear:vector', 'tensor:tensor-product', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '张量积是「双线性映射的通用对象」：双线性、线性映射与向量空间三个词都来自线性代数背景。' },
    scope: '没有线性结构就没有双线性映射，也就没有要求分解的对象。',
  }),
  relation('rel-tensor-pre-multilinear-product', 'hardPrereq', 'tensor:multilinear', 'tensor:tensor-product', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '通用性质说的是「任一（多）线性映射唯一地经 V⊗W 分解」：被分解的映射就是多重线性映射。' },
    scope: '张量积的定义以多重线性映射为量词对象；删去它，通用性质没有内容。',
  }),
  relation('rel-tensor-pre-product-rs', 'hardPrereq', 'tensor:tensor-product', 'tensor:tensor-rs', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '定义 T^r_s(V) = V^{⊗r} ⊗ (V*)^{⊗s} 逐字是张量积的重复与再取积。' },
    scope: '去掉张量积，T^r_s 的等式右边写不出来。',
  }),
  relation('rel-tensor-pre-dual-rs', 'hardPrereq', 'tensor:dual', 'tensor:tensor-rs', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '同一个定义里的 (V*)^{⊗s} 用的是对偶空间。' },
    scope: '协变部分的载体是对偶空间；s = 0 时它才退化掉。',
  }),
  relation('rel-tensor-pre-rs-basis', 'hardPrereq', 'tensor:tensor-rs', 'tensor:basis-law', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '换基规律说的是 (r,s) 型张量的分量在基变换下的变换式：分量与上下指标都来自 T^r_s。' },
    scope: '变换律的每条指标都对应一个张量槽；没有 (r,s) 型张量的定义就没有这条规律的对象。',
  }),
  relation('rel-tensor-pre-rs-bundle', 'hardPrereq', 'tensor:tensor-rs', 'tensor:bundle', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '构造写作「各点取纤维 T^r_s(T_xX)」：纤维就是 (r,s) 型张量空间。' },
    scope: '张量丛的纤维类型由 T^r_s 指定；换一种张量空间就换一种丛。',
  }),
  relation('rel-tensor-pre-bundle-field', 'hardPrereq', 'tensor:bundle', 'tensor:field', {
    witness: { type: 'definitional-dependency', status: 'DEF', scope: '张量场定义为**张量丛的光滑截面**：丛是这条定义的主语。' },
    scope: '没有张量丛，「截面」就没有可截的对象。',
  }),
  // 证明依赖：证书片段的证明目标是那条断言（证据 ev-tensor-rank1-cert 同时列出两者，状态 FINITE）。
  relation('rel-tensor-proof-claim-rank1', 'hardPrereq', 'tensor:proof-rank1-additive', 'tensor:rank1-additive', {
    witness: { type: 'proof-dependency', status: 'FINITE', ref: 'ev-tensor-rank1-cert', scope: '证书的证明目标是「秩一映射保持加法」这条断言；断言不写下来，证书没有可证的对象。' },
    scope: '证书片段依赖它的目标断言；这是「证明用到什么」，不是定义材料。',
  }),
];

export const tensorEvidence = [
  evidence('ev-tensor-basis-law', 'prose-proof', 'PROOF', 'not_run', '换基规律正文证明', { scope: '(1,1) 与一般 (r,s) 型的换基计算。', nodes: ['tensor:basis-law'], obligations: ['机器编码矩阵相似与一般指标延拓'], reference: 'mcs-foundations/cases/03-张量与张量场.md#2' }),
  evidence('ev-tensor-end-iso', 'prose-proof', 'PROOF', 'not_run', 'Φ 同构正文证明', { scope: '有限维；基只用于证明双射；无限维反例另列。', nodes: ['tensor:end-iso'], obligations: ['机器编码张量积通用性质与矩阵单位'], reference: 'mcs-foundations/cases/03-张量与张量场.md#2' }),
  evidence('ev-tensor-bundle', 'prose-proof', 'PROOF', 'not_run', '张量场与局部分量对应证明', { scope: '覆盖 X 的图册；过渡函数必须是正确的张量丛过渡。', nodes: ['tensor:bundle', 'tensor:field'], obligations: ['机器编码丛的粘合条件'], reference: 'mcs-foundations/cases/03-张量与张量场.md#3' }),
  evidence('ev-tensor-gamma', 'counterexample', 'PROOF', 'not_run', 'Christoffel 系数反例', { scope: '排除“所有指标数组都是张量”。', nodes: ['tensor:non-tensor-gamma', 'tensor:pattern-index-array'], reference: 'mcs-foundations/cases/03-张量与张量场.md#3' }),
  evidence('ev-tensor-infinite', 'counterexample', 'PROOF', 'not_run', '无限维恒等算子反例', { scope: '排除无限维满射推广。', nodes: ['tensor:infinite-rank'], reference: 'mcs-foundations/cases/03-张量与张量场.md#2' }),
  evidence('ev-tensor-rank1-cert', 'machine-certificate', 'FINITE', 'passed', '秩一加法片段证书', {
    scope: 'R(x+y)=R(x)+R(y) 在标量分配与 α 可加条件下。', nodes: ['tensor:rank1-additive', 'tensor:proof-rank1-additive'],
    certificate: 'mcs-foundations/validation/certification/certificates/tensor.json', checker: 'mcs-nd-subset/1',
    openAssumptions: ['α 保持加法'], obligations: ['标量线性、张量积通用性质、基、有限维双射与丛/截面未编码'],
  }),
  evidence('ev-tensor-not-claimed', 'not-claimed', 'NOT-CLAIMED', 'not_run', '未声称的范围', { scope: '不声称完整张量代数或丛论已机器形式化。', nodes: ['tensor:end-iso'] }),
  // 方法本身是操作步骤而非可证命题：证据只声明「步骤与案例正文一致」。
  evidence('ev-tensor-method-basis', 'prose-proof', 'ILLUSTRATION', 'not_run', '逐项代入验证法：步骤与案例正文一致', {
    scope: '方法不是命题；本证据只声明步骤描述没有超出正文，且「一次代入只能否定」这一边界已写出。',
    nodes: ['tensor:method-basis-check'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对上下指标的变换因子与正文一致'],
    reference: 'mcs-foundations/cases/03-张量与张量场.md#3',
  }),
  evidence('ev-tensor-method-dimension', 'prose-proof', 'ILLUSTRATION', 'not_run', '维数计数法：步骤与案例正文一致', {
    scope: '方法不是命题；本证据只声明步骤描述没有超出正文，且有限维前提已写入边界。',
    nodes: ['tensor:method-dimension-count'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对有限维前提是否在方法边界中保留'],
    reference: 'mcs-foundations/cases/03-张量与张量场.md#2',
  }),
  // 原有方法也补一条：让「每个方法节点都有独立证据」这条不变量一致成立。
  evidence('ev-tensor-method-invariant', 'prose-proof', 'ILLUSTRATION', 'not_run', '寻找不变量：步骤与案例正文一致', {
    scope: '方法不是命题；本证据只声明步骤描述没有超出正文，且「未证明保持的量只是候选」已写出。',
    nodes: ['tensor:method-invariant'],
    obligations: ['机器编码为第 02 章 ND 证书', '核对不替代保持性证明这一限制'],
    reference: 'mcs-foundations/cases/03-张量与张量场.md#2',
  }),
];

export const tensorSupport = [
  support('sup-tensor-dual-expr', 'tensor:dual', 'expression', 'known', { set: ['bg:linear:vector'], minimal: true }),
  support('sup-tensor-product-expr', 'tensor:tensor-product', 'expression', 'known', { set: ['bg:linear:vector', 'tensor:dual'], minimal: false }),
  support('sup-tensor-rs-expr', 'tensor:tensor-rs', 'expression', 'known', { set: ['tensor:tensor-product', 'tensor:dual'], minimal: false }),
  support('sup-tensor-basis-proof', 'tensor:basis-law', 'proof', 'known', { set: ['tensor:tensor-rs', 'bg:linear:vector'], minimal: false, evidence: ['ev-tensor-basis-law'] }),
  support('sup-tensor-iso-proof', 'tensor:end-iso', 'proof', 'known', { set: ['tensor:tensor-product', 'tensor:dual', 'bg:linear:vector'], minimal: false, evidence: ['ev-tensor-end-iso'] }),
  support('sup-tensor-field-route', 'tensor:field', 'route', 'known', { set: ['tensor:bundle', 'bg:top:space'], minimal: false, evidence: ['ev-tensor-bundle'] }),
  support('sup-tensor-gamma-proof', 'tensor:non-tensor-gamma', 'proof', 'known', { set: ['tensor:basis-law', 'bg:manifold:calc'], minimal: false, evidence: ['ev-tensor-gamma'] }),
];

export const tensorClaims = [
  claimRecord('claim-tensor-basis-law', 'tensor:basis-law', '张量分量按上下指标换基。', ['ev-tensor-basis-law']),
  claimRecord('claim-tensor-end-iso', 'tensor:end-iso', '有限维时 V⊗V* 与 End(V) 同构。', ['ev-tensor-end-iso']),
  claimRecord('claim-tensor-rank1', 'tensor:rank1-additive', '秩一映射在声明条件下保持加法。', ['ev-tensor-rank1-cert'], 'FINITE'),
];

export const tensorPatterns = [
  { id: 'tensor:pattern-index-array', node: 'tensor:pattern-index-array', anchors: ['tensor:non-tensor-gamma', 'tensor:basis-law'], title: '所有指标数组都是张量' },
];

export const tensorAggregates = [
  { id: 'agg-tensor', kind: 'topic', title: '张量、坐标变换与张量场', blocks: [['tensor:dual', 'tensor:tensor-product', 'tensor:tensor-rs', 'tensor:multilinear', 'tensor:basis-law', 'tensor:end-iso', 'tensor:field'], ['tensor:method-invariant', 'tensor:method-basis-check', 'tensor:method-dimension-count']], note: '话题块允许重叠；方法节点单独成块。' },
];

export const tensor = { nodes: tensorNodes, actions: tensorActions, relations: tensorRelations, evidence: tensorEvidence, support: tensorSupport, claims: tensorClaims, patterns: tensorPatterns, aggregates: tensorAggregates };
