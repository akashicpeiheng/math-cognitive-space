import { selfCheck } from '../authoring.mjs';

// 2026-10-15：本程的可读形式陈述与教学接口。正文在 11-jiang-first-stage.md。
// PROOF 表示正文有一般论证；checkStatus 仍为 not_run，未登记机器证明。
const check = (slug, suffix, prompt, criterion) => selfCheck(
  `sc-jiang-${slug}-${suffix}`, prompt, '解释与检验', `jiang:${slug}`, criterion,
);
export const jiangFirstStage = {
  'field-axioms': {
    version: '2',
    summary: '先选好计算规则：加减乘和非零除法使消元可靠；用实数与只有两个元素的域对照，看到哪些直觉需要检查。',
    boundary: '本站展开域的运算与量词，证明零乘法、消去律和逆元唯一性，并核验 F₂ 模型；条件作用分析不声称整套公理逐条独立。教材 §1.1 沿用书签定位，正文未逐字核对；未登记机器证明。',
    formal: { assumptions: ['F 是集合；+ 与 · 是 F×F 到 F 的函数；0,1∈F。'] },
    formalStatement: {
      tex: String.raw`\begin{gathered}0\ne1,\quad\forall a,b,c\in F:\\(a+b)+c=a+(b+c),\ a+b=b+a,\ a+0=a,\\(ab)c=a(bc),\ ab=ba,\ a1=a,\ a(b+c)=ab+ac;\\\forall a\in F\ \exists d\in F:\ a+d=0,\\\forall a\in F\setminus\{0\}\ \exists e\in F:\ ae=1.\end{gathered}`,
      reading: '两个封闭运算满足结合、交换、单位元和分配律；每个元素有加法逆元，每个非零元素有乘法逆元，且 0 与 1 不同。',
      notation: [{ symbol: 'F', means: '所选系数集合，可以是实数域，也可以是有限域' }, { symbol: 'd,e', means: '分别为 a 的加法逆元、非零 a 的乘法逆元；可依赖 a' }],
      label: 'DEF', note: '先读正文中的具体方程即可；本式列出定义，不是机器已检查的公理系统。',
    },
    motivation: {
      internal: ['为移项、消元和非零除法明确可以使用的运算律。'],
      external: ['只有 0、1 的计算也能解线性问题：用 F₂ 对照数轴直觉。'],
      growthChain: ['具体四则运算', '找出消元重复使用的规则', '允许替换系数集合', '定义域并检验模型'],
    },
    teaching: {
      readingFirst: true,
      evidenceStatus: 'DEF',
      selfCheck: [check('field-axioms', 'f2', '在 F₂ 中解 x+1=0，并解释为什么 0x=1 无解。', 'x=1，因为 1+1=0；0 乘任何元素为 0，而 0≠1。'), check('field-axioms', 'integer', '整数没有零因子，为什么仍不能在整数中解出 2x=1？', '无零因子只支持非零消去；2 的逆元不在整数中，故不是所有非零元都能除。')],
      reviewQuestions: ['把某一步搬到 F₂ 时，是否除以了已经变成 0 的系数？'],
    },
  },
  'elementary-row-operations': {
    version: '2',
    summary: '把方程记成增广矩阵，用三种可撤销的整行操作保持同一组变量下的全部解；先把贯穿例子化成阶梯形。',
    boundary: '正文定义解集、整行操作和阶梯形，证明同解性并展示逐步算例；来源行与目标行必须不同，常数列同步变化。阶梯形存在性的消元流程见方法节点，行最简形唯一性未在本程证明；未登记机器证明。',
    formal: { assumptions: ['F 为域，m,n≥1，A∈F^{m×n}，b∈F^m。', '行加倍数使用不同的两行；行倍乘的系数非零；操作包括常数列。'] },
    formalStatement: {
      tex: String.raw`\begin{gathered}S(A,b)=\{x\in F^n:\ \forall i\in\{1,\ldots,m\},\ \sum_{j=1}^na_{ij}x_j=b_i\},\\{}[A\mid b]\sim_{\rm row}[B\mid c]\ \Longrightarrow\ S(A,b)=S(B,c).\end{gathered}`,
      reading: '经过有限次合法初等行变换，原方程与新方程在同一组变量下解集完全相等。',
      notation: [{ symbol: 'S(A,b)', means: '满足每一条原方程的 n 元数组集合' }, { symbol: '∼row', means: '有限次换行、非零倍乘、不同两行间加倍数，均包括右端' }],
      label: 'PROOF', note: '正文用正向保持和逆操作证明两个包含；没有机器证书。',
    },
    motivation: {
      internal: ['消元既要减少抄写，也要保证没有漏解或多解。'],
      external: ['把每一步记成可复算的数表操作，便于人工和程序核对。'],
      growthChain: ['中学加减消元', '抽出系数和常数', '规定三种可逆动作', '整理为阶梯形'],
    },
    teaching: {
      readingFirst: true,
      evidenceStatus: 'PROOF',
      selfCheck: [check('elementary-row-operations', 'contradiction', '对 x+y=1、2x+2y=3 作 R₂←R₂−2R₁，读出结果。', '第二行变成 0=1，故无解；右端也必须作 3−2×1。'), check('elementary-row-operations', 'inverse', '为什么 R₁←R₁+R₂ 要保留 R₂？同时把两行都改成和会怎样？', '保留 R₂ 才可用 R₁←R₁−R₂ 撤销；x=1、y=2 同时改成两条 x+y=3 会丢掉约束。')],
      reviewQuestions: ['出现 0=0 时，为什么不能直接宣布有多个解？'],
    },
  },
  'linear-substitution': {
    version: '2',
    summary: '给常见的线性组合起新名字，再用正反代入检查能够唯一还原；保持的是明确映射下的解集双射。',
    boundary: '用分量和式定义换元，不预借矩阵乘法、逆矩阵或行列式；正文证明全局双射限制到解集仍为双射。不可逆代入可能遗漏或重复表示，代入所得新解还原后仍满足原式；全局可逆不声称是某个特定方程组的必要条件。未登记机器证明。',
    formal: { assumptions: ['F 为域，n≥1；T(y)ⱼ=Σₖpⱼₖyₖ，pⱼₖ∈F。', 'T:F^n→F^n 为双射；S′ 由完整代入原方程定义。'] },
    formalStatement: {
      tex: String.raw`\begin{gathered}T(y)_j=\sum_{k=1}^n p_{jk}y_k,\qquad \forall x\in F^n\ \exists!y\in F^n:\ T(y)=x,\\ S'=T^{-1}(S)=\{y\in F^n:T(y)\in S\},\\ T|_{S'}:S'\xrightarrow{\ \sim\ }S.\end{gathered}`,
      reading: '若换元在全部变量取值上可唯一还原，那么它在新旧方程组解集之间也给出双射。',
      notation: [{ symbol: 'T⁻¹(S)', means: 'S 在 T 下的原像集合；不把原像符号与逆函数混为一谈' }, { symbol: '∃!', means: '恰有一个；同时要求存在和唯一' }],
      label: 'PROOF', note: '定义与限制双射证明均在正文；不声称换元后新旧坐标逐项相等。',
    },
    motivation: {
      internal: ['反复出现的组合可以成为更适合解题的新变量。'],
      external: ['总量、差量的测量描述提示换元，还原能力须另行检查。'],
      growthChain: ['为组合命名', '选够新变量', '写出逆公式并来回代入', '得到解集双射'],
    },
    teaching: {
      readingFirst: true,
      evidenceStatus: 'PROOF',
      selfCheck: [check('linear-substitution', 'restore', '实数上令 x=u+v、y=v，解 x+y=3、x−y=1，并写出逆公式。', '新式为 u+2v=3、u=1，得 v=1，再还原 x=2、y=1；逆为 u=x−y、v=y。'), check('linear-substitution', 'characteristic', 'u=x+y、v=x−y 在 F₂ 中为什么不能唯一还原？', 'F₂ 中 −y=y，所以两个新变量相同；例如 (0,0) 与 (1,1) 都给 (u,v)=(0,0)，不单射。')],
      reviewQuestions: ['如果新解有重复表示，还原后会不会自动成为不满足原方程的旧解？'],
    },
  },
  'solution-cases': {
    version: '2',
    summary: '先排除矛盾行，再用自由坐标逐一命名所有解：无矛盾时解集与 F^{n−r} 双射；有限域有 q^{n−r} 个解，无限域有自由变量时才有无穷多解。',
    boundary: '正文对任意域证明无矛盾时自由坐标与解的双射，r 只数系数列主元；有限域计数与无限域边界分开。证明直接用同解行变换与回代，不预借秩不变性、行最简形唯一性或线性换元；教材正文未逐字核对，未登记机器证明。',
    formal: { assumptions: ['F 为任意域，m,n≥1，A∈F^{m×n}，b∈F^m。', '[U|c] 是 [A|b] 经有限次初等行变换得到的阶梯形；r 为系数列的主元数，d=n−r。'] },
    formalStatement: {
      tex: String.raw`\begin{gathered}(\exists i:\ U_{i1}=\cdots=U_{in}=0\ \land\ c_i\ne0)\ \Longrightarrow\ S(A,b)=\varnothing;\\ \text{otherwise}\quad \pi:S(A,b)\xrightarrow{\ \sim\ }F^d,\quad d=n-r,\\|S|=1\iff d=0,\qquad |F|=q<\infty\ \Longrightarrow\ |S|=q^d,\\|F|=\infty\ \land\ d>0\ \Longrightarrow\ |S|=\infty.\end{gathered}`,
      reading: '先看有没有矛盾行；无矛盾时每组自由坐标恰好给一个解。唯一、有限多个还是无穷多个，要同时检查自由变量数和系数域。',
      notation: [{ symbol: 'r', means: '系数列主元个数；不是原矩阵的非零行数，也不把常数列当未知量列' }, { symbol: 'π', means: '按列号取出全部自由坐标；逆映射由倒序回代构造' }, { symbol: 'F⁰', means: '只含空数组的单元素集合，对应没有自由变量' }],
      label: 'PROOF', note: '第二行及其后均以“无矛盾”为前提；正文给出任意域上的一般证明，机器检查未运行。',
    },
    motivation: {
      internal: ['找到一个解以后，还要知道是否找全、哪些变量可以任选。'],
      external: ['重复信息与互相冲突的约束需要区别，方程多不自动意味着约束多。'],
      growthChain: ['观察具体解', '识别矛盾与冗余', '分开主元列与自由列', '证明参数与全部解双射'],
    },
    teaching: {
      readingFirst: true,
      evidenceStatus: 'PROOF',
      selfCheck: [check('solution-cases', 'parameter', '实数上判断 x+y=2、2x+2y=c 何时有解，并写出全部解。', 'c=4 时相容，解为 (2−t,t)，t∈R；c≠4 出现矛盾行。'), check('solution-cases', 'finite', 'F₂ 上 x+y=0 有多少个解？能否因存在自由变量就说无穷多？', '恰有 (0,0)、(1,1)，即 2¹ 个；自由变量只有两种取值，故不是无穷多。'), check('solution-cases', 'redundant', '实数方程 x=1、2x=2 出现零行，为什么仍为唯一解？', '唯一未知量所在列已有主元，r=n=1，无自由变量；零行只说明方程冗余。')],
      reviewQuestions: ['回代中的哪一步保证不会漏解，哪一步保证参数不会重复命名同一个解？'],
    },
  },
};
