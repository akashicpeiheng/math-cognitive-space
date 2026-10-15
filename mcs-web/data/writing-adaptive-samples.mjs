/** Small adversarial writing fixtures. No historical or public-open-status claims. */
export const ADAPTIVE_WRITING_SAMPLES = [
  { id: '01-记号约定', title: '本篇自然数记号', type: 'notation', sections: {
    overview: String.raw`避免零是否属于自然数的歧义，本节点只固定本篇记号。`,
    background: String.raw`讨论整数；约定只作用于本篇，不要求其他文献采用同一记号。`,
    form: String.raw`记 $\mathbb N=\{0,1,2,\ldots\}$，$\mathbb N_{>0}=\{1,2,3,\ldots\}$。`,
    evidence: String.raw`DEF：这是命名约定，没有宣称新的存在定理。未使用外部资料。`,
  } },
  { id: '02-冗余条件', title: '删条件不一定产生反例', type: 'theorem', sections: {
    overview: String.raw`用一个短命题区分充分条件与不可删条件。`,
    background: String.raw`变量 $x$ 为实数，采用实数的通常次序与乘法。`,
    form: String.raw`若 $x>1$ 且 $x>0$，则 $x^2>1$。条件 $x>0$ 已由 $x>1$ 蕴含，删除后结论仍成立；不应寻找不存在的反例。`,
    argument: String.raw`概括：把目标差分解为两个正因子。由 $x>1$，有 $x-1>0$、$x+1>0$，故 $x^2-1=(x-1)(x+1)>0$。`,
    evidence: String.raw`PROOF：论证节给出了证明。条件冗余的依据是 $x>1\Rightarrow x>0$；未主张所有命题的假设都冗余。`,
  } },
  { id: '03-混合例反例', title: '绝对值：连续的例子与可导的反例', type: 'example', roles: ['counterexample'], sections: {
    overview: String.raw`同一对象承担两个角色，帮助区分连续与可导。`,
    background: String.raw`在实数域上取 $f(x)=|x|$；连续和可导均按实变量函数的通常定义。`,
    form: String.raw`正例目标：$f$ 在实数上连续。反例目标：否定“每个在零点连续的实函数都在零点可导”。`,
    argument: String.raw`概括：用三角不等式控制增量，用左右差商否定可导。由 $||x|-|y||\leq |x-y|$，任给 $\varepsilon>0$，取 $\delta=\varepsilon$ 即得连续性。零点差商为 $|h|/h$，在 $h>0$ 时为 $1$，在 $h<0$ 时为 $-1$，故其极限不存在。`,
    evidence: String.raw`PROOF：论证节验证连续前提并给出导数不存在的见证。此例未否定“可导推出连续”。`,
  } },
  { id: '04-商上的构造', title: '同余类加法的代表元无关性', type: 'construction', roles: ['definition'], sections: {
    overview: String.raw`把整数相加搬到同余类上，关键是选择不同代表元不能改变答案。`,
    background: String.raw`固定正整数 $n$，$[a]$ 表示整数 $a$ 模 $n$ 的同余类。`,
    form: String.raw`规定 $[a]+[b]=[a+b]$。这同时作出良定义承诺，不能用“不适用”省去代表元检查。`,
    argument: String.raw`概括：更换代表元造成的差仍是 $n$ 的倍数。若 $a-a'=kn$、$b-b'=\ell n$，则 $(a+b)-(a'+b')=(k+\ell)n$，故 $[a+b]=[a'+b']$。整数和存在，所以结果同余类存在；唯一指同余类相同，不指代表整数唯一。`,
    evidence: String.raw`DEF：运算规格。PROOF：论证节验证存在与代表元无关性，并限定唯一性的含义。`,
  } },
  { id: '05-个人问题', title: '平方和公式的个人探索入口', type: 'problem', sections: {
    overview: String.raw`本篇只登记一个准备探索的问题，不提供解答。`,
    background: String.raw`给定正整数 $n$，可以使用有限求和、代数恒等式和数学归纳法。`,
    form: String.raw`寻找 $S(n)=\sum_{k=1}^{n}k^2$ 的闭式，并给出对全部正整数成立的证明。`,
    evidence: String.raw`NOT-CLAIMED：本篇未给出公式或证明，也未核验文献。这是个人学习任务，不宣称数学界尚未解决。下一步先算小样本，再检验候选公式。`,
  } },
  { id: '06-候选猜想', title: '有限数据提示的候选公式', type: 'conjecture', sections: {
    overview: String.raw`记录从小样本形成的候选判断，区分猜测与证明。`,
    background: String.raw`正整数 $n$，有限和 $S(n)=1+3+\cdots+(2n-1)$。`,
    form: String.raw`候选命题：对所有正整数 $n$，有 $S(n)=n^2$。`,
    evidence: String.raw`FINITE：$S(1)=1$、$S(2)=4$、$S(3)=9$。NOT-CLAIMED：本篇没有给出一般证明，不把有限样本当证明；这是个人候选判断，未宣称公开未解。可尝试归纳或排列图形。`,
  } },
  { id: '07-算法', title: '欧几里得算法的三个承诺', type: 'algorithm', sections: {
    overview: String.raw`用取余缩小整数对，同时分别交代步骤合法性、终止与结果正确性。`,
    background: String.raw`输入非负整数 $a,b$，且不同时为零。使用整数带余除法。`,
    form: String.raw`当 $b>0$ 时，取 $r=a\bmod b$ 并把 $(a,b)$ 替换为 $(b,r)$；当 $b=0$ 时输出 $a$。`,
    argument: String.raw`概括：每步保留公因子集合，并严格减小非零的第二分量。带余除法给 $a=qb+r$ 且 $0\leq r<b$；整数 $d$ 同时整除 $a,b$ 当且仅当同时整除 $b,r$。第二分量不能在非负整数中无限严格下降，故终止；终止时 $(a,0)$ 的最大公因子是正整数 $a$，它等于原输入的最大公因子。`,
    evidence: String.raw`PROOF：论证节分别支持合法性、终止和正确性。NOT-CLAIMED：未给出复杂度分析；数次试跑不能替代这些证明。`,
  } },
  { id: '08-表征', title: '用坐标对表示复数', type: 'representation', sections: {
    overview: String.raw`把复数表示为实坐标对，同时明确此对应并不自动证明全部运算关系。`,
    background: String.raw`复数写成 $z=a+bi$，其中 $a,b$ 为实数且 $i^2=-1$；固定通常的实部、虚部约定。`,
    form: String.raw`对应 $a+bi\mapsto(a,b)$ 保留两个分量。由复数加法定义，$(a+bi)+(c+di)=(a+c)+(b+d)i$，因此加法对应坐标逐项相加。`,
    evidence: String.raw`DEF：坐标对应。PROOF：精确内容给出加法保持性的计算。NOT-CLAIMED：不能据此宣称乘法也是逐项相乘，例如 $i^2=-1$ 不对应 $(0,1)$ 逐项平方所得的 $(0,1)$。`,
  } },
  { id: '09-未知角色', title: '待辨认对象的探索稿', type: 'unclassified-structure', customChecks: '这个对象是否依赖代表元？所谓相同指相等还是同构？', sections: {
    overview: String.raw`先记录对象辨认任务；当前专用角色尚未确定。`,
    background: String.raw`参数范围、所处理论及等同关系均待作者核对。`,
    form: String.raw`尚未给出对象规格；此处是探索稿，不宣称存在合法的新构造。`,
    evidence: String.raw`NOT-CLAIMED：数学内容未建立。下一步补对象规格并确认角色，模板核心检查不能代替专用审查。`,
  } },
  { id: '10-短推论', title: '整数范围内的平方不等式', type: 'corollary', sections: {
    overview: '把相邻样稿的实数结果直接用于整数，不另写发现史。',
    background: '取整数 n，且 n 大于等于 2；把整数看作实数。',
    form: '结论：n 的平方大于 1。上游命题为本组样稿《删条件不一定产生反例》中“实数 x 大于 1 则平方大于 1”。',
    argument: '概括：检查前提并代入。整数 n 大于等于 2，故 n 大于 1；令上游命题中的 x 等于 n，立即得到结论。上游证明可在同组第二篇的论证节定位，无需在此重复。',
    evidence: 'PROOF：本节给出条件匹配与特例化推导，上游见 [[02-冗余条件]]。未使用外部资料，不另造历史归属。',
  } },
  { id: '11-理论组织', title: '等价关系：本篇组织范围', type: 'theory', sections: {
    overview: '整理等价关系的语言和待衔接的问题，作为索引入口。',
    background: '固定集合 X，关系 R 是 X 与自身笛卡尔积的子集；采用经典集合语言。',
    form: '等价关系要求自反、对称、传递。后续分别讨论同余关系的例子、等价类及商集构造；本篇只规定组织范围，不宣称列出所有后果。',
    evidence: 'DEF：本篇的语言约定和目录范围。NOT-CLAIMED：本篇尚未证明等价类形成划分；这一承诺留给单独的命题与证明节点，不能由目录的箭头取得认证。',
  } },
];
