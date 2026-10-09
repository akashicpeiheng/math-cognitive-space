/**
 * 方法库：可以单独练的十条方法。
 *
 * 与 `intro-content.ts` 的 `METHOD_CORE` 的分工：
 * - `METHOD_CORE`（八条）是**认知发展笔记里已经写出完整论述**的原则，逐条带「怎么做 / 为什么有效 / 出处」；
 * - 这里（十条）是**可以单独拎出来练的动作**，每条给「简介 → 细致解析」两级，
 *   细致解析讲四件事：它解决什么问题、怎么做、什么时候会失效、本站哪里能看到它。
 *
 * 出处的标注必须诚实，因此每条都写明它有没有文档依据：
 * `认知发展笔记.md` 有正文（13.5 KB）；`构造反例的方法.md`、`内省.md`、`直觉的建立与失效.md`
 * 在生产目录里都是 **0 字节**；其余几条在 vault 里没有对应文档。
 * 没有依据的条目一律写成「站点自己的整理」，不假装是从某份文档里摘出来的。
 *
 * 排序依据（重要性由本站判定，写在页面上）：先元方法（内省）与容器（认知发展笔记），
 * 再收益最高、最廉价的两个动作（构造反例、从特例切入），然后是抽象与找证明的核心动作
 * （找不变量、逆向分析），接着是判断「什么时候不该信直觉」（直觉的建立与失效）与表达纪律
 * （不轻易诉诸「显然」），最后是两条进阶分辨（独立的动机溯源练习、次阶段的应用 ≠ 本阶段的特定联系）。
 */

import type { Locale } from './i18n/locales';

export interface MethodEntry {
  /** 路由片段：`/method/<id>`。 */
  id: string;
  title: string;
  /** 卡片上的一句话简介。 */
  gist: string;
  /** 分类标签，用于卡片上的小标记。 */
  tag: string;
  /** 它解决什么问题（这一条最容易被跳过，所以放最前面）。 */
  problem: string;
  /** 怎么做：可执行的步骤。 */
  how: string[];
  /** 什么时候会失效、常见误用。 */
  boundary: string[];
  /** 本站哪里能看到它。 */
  example?: string;
  /** 站内相关的本体节点或页面。 */
  links?: Array<{ label: string; to: string }>;
  /** 出处：写明有没有文档依据。 */
  source: string;
}

export const METHOD_LIBRARY: MethodEntry[] = [
  {
    id: 'introspection',
    title: '内省',
    gist: '主动审视自己的思维过程，而不是等错误造成实际损失之后再回头找原因。',
    tag: '元方法',
    problem:
      '被动的进步是盲目的。读、听、做题都在发生，但没有任何意识在审视「我为什么在这一步卡住」「我为什么会觉得这个结论显然」。'
      + '等错误产生实际伤害（考试丢分、推导走偏）再回头，成本已经付掉了。',
    how: [
      '在卡住的那一刻停下来，把「我现在凭什么认为这一步成立」写下来——写不出来就是没成立。',
      '区分三类卡点：不知道定义、不知道用哪个已知结论、知道但不敢用（不确信条件是否满足）。三类的解法完全不同。',
      '事后回看这段记录，标出哪些卡点是重复出现的；重复出现的就是要单独练的东西。',
      '把「我觉得显然」逐个展开成可检查的一步；展不开的，记成未解问题而不是结论。',
    ],
    boundary: [
      '内省不能替代外部检验：自己觉得想通了，仍要过一个具体的检查（证明、反例、算一遍）。',
      '内省的成本随频率上升；写成「每道题都复盘」会挤掉做题本身，只在卡点与误判处做。',
      '把自己的思维当成客观对象来读是会失真的——记录要写具体动作，不写「我懂了」这种结论。',
    ],
    example: '本站把这条落到节点页上：每篇笔记要求写明「常见误解」与「回看提问」，就是给下一次内省留的接口。',
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md（开篇：内省的过程是很重要的）——有正文；《内省.md》在生产目录里是 0 字节，本条目其余部分是站点自己的整理。',
  },
  {
    id: 'cognitive-notes',
    title: '认知发展笔记',
    gist: '把上面这些方法本身当作一份持续更新的笔记来写：既记录内容，也记录自己思维的变化。',
    tag: '容器',
    problem:
      '方法读一遍就忘了；「要内源、要找证据」这类原则如果没有落到一份具体的、会被重读的载体上，'
      + '就只是口号。缺的不是原则，是让原则反复生效的容器。',
    how: [
      '为自己建一份长期笔记，专门记思维过程：为什么这么想、在哪一步卡住、后来怎么解决的。',
      '内容上守住两条：用自己生成的话写（全然内源）；关键断言给证据，给不出证明就退成例子并标注。',
      '阶段性做总结：先总结思想（给一类问题的推进思路命名），再总结方法（可复用的步骤）。',
      '隔一段时间重读并压缩：用更经济的语言重写，甚至用一个典型例子替代整段论述。',
      '保留未解问题，过一段时间再拷问自己一次。',
    ],
    boundary: [
      '它替换不了教材与论文：笔记是加工场所，不是资料来源。',
      '只写内容不写过程，它就会退化成第二份教材；只写过程不写内容，它就没有可检验的东西。',
      '压缩不等于删减细节：压掉的是已经内化的中间步骤，不是还没走通的地方。',
    ],
    example: '本站的节点模板就是这份笔记在单个数学对象上的形状：前置知识分三层、逐条件反例、概括证明先行、常见误解、总结与回看提问。',
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md（13.5 KB，有正文：全然内源 / 不断更新 / 要有证据 / 总结思想与方法 / 对思想方法再加工）——本条目是站点对它的整理。',
  },
  {
    id: 'counterexample',
    title: '构造反例',
    gist: '对每个条件做一次删除实验，找一个让结论崩溃的具体例子——这是最廉价、收益最高的一步。',
    tag: '练习',
    problem:
      '定理的条件读起来像恼人的累赘：「为什么要假设光滑？」「可微还不够吗？」'
      + '不理解条件的作用，就会在别处无意识地把过强的条件当成理所当然，或者在条件不满足时照用结论。',
    how: [
      '把定理的条件逐条列出来，一条不落。',
      '每次只删掉一条，去找一个「其余条件都满足、结论不成立」的具体例子。',
      '写清结论是怎么塌的：删掉的条件原本在证明的哪一步被用到。',
      '反例要能被别人核对：给出具体对象、具体数值或具体构造，不写「存在某个反例」。',
      '顺手记下这条反例属于哪类误解；同类反例攒够三个，就能看出条件的真实作用。',
    ],
    boundary: [
      '找不到反例不等于条件必要——可能只是没想到；这时标成未解问题，别改成「条件确实必要」。',
      '反例只能否证，不能证明；删条件后结论仍成立时，说明条件是强的，不是错的。',
      '远离原定理语境的反例没有教学价值（例如用一个病态空间去否定一条有限维命题），要落在定义允许的范围内。',
    ],
    example: '本体里已经登记了三个反例对象与十一个误区模式：例如「Christoffel 系数不是张量」（张量性在坐标变换下失效的具体反例），以及「收敛序列各项都不等于极限」这类把直觉当定义的误区。',
    links: [
      { label: '反例：Christoffel 系数不是张量', to: '/nodes/tensor:non-tensor-gamma' },
      { label: '误区：收敛序列各项都不等于极限', to: '/nodes/limit:pattern-never-equal' },
    ],
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md ·「删掉某个条件会怎样？」（有正文）＋模板的「逐条件反例」一节；《构造反例的方法.md》在生产目录里是 0 字节，本条目其余部分是站点自己的整理。',
  },
  {
    id: 'special-case',
    title: '从特例切入',
    gist: '先在一个最小的、能算的例子把话说完，再回到一般陈述——顺序反过来最容易假懂。',
    tag: '入口',
    problem:
      '一般定义是压缩过的：它把动机、边界、例外都压掉了。'
      + '直接读一般形式，得到的是「每个字都认识、合起来不知道在说什么」的状态，而这句话常常被误认成理解了。',
    how: [
      '取最小的非平凡特例：维度最低、结构最简单、能动手算完的那一个。',
      '在特例上把定义、定理、证明各走一遍，确认每一步都能落地。',
      '记下特例里哪些步骤用到了「一般性」，哪些只是这个例子的巧合。',
      '回到一般陈述，逐条对照：一般形式的每个条件，在特例里对应什么。',
      '再换一个特例走第二遍；两次都卡在同一处，那一处就是你真正的缺口。',
    ],
    boundary: [
      '特例成立的结论不能直接推广；特例的作用是暴露结构，不是提供证明。',
      '挑错了特例会误导：太特殊的例子（如恒等映射、零矩阵）会掩盖一般情形里的主要困难。',
      '只停在特例上就退化成「只会做例题」，必须回到一般陈述收口。',
    ],
    example: '本站的节点页把「例子与反例」当成与定义同级的字段：定义之后紧接着一个能算完的具体实例，再往下才是证明与推广。',
    source: '站点自己的整理（vault 里没有对应文档）。本站的依据是节点模板要求「直觉与定义配对」与「断言与验证配对」。',
  },
  {
    id: 'invariant',
    title: '找不变量',
    gist: '问「什么东西在这个变换下不变」——不变量才是对象的真身，坐标只是它在某处的样子。',
    tag: '抽象',
    problem:
      '同一个对象在不同表示下长得完全不同（不同坐标系、不同基底、不同参数化）。'
      + '盯着表示本身，就会把「换一套坐标就变的东西」当成对象自己的性质，得出似是而非的结论。',
    how: [
      '先问清：这里的「同一个对象」是在什么变换下被认为相同？（换坐标、换基底、换参数化、同构）',
      '在这个变换下逐个检查你关心的量：不变的留下，变的划掉。',
      '把留下的量组织成完整的不变量组：它们能否反过来确定对象（这是「完全不变量」的问题）。',
      '用不变量重写结论：定义、定理、计算都尽量只用不变量表达。',
      '检查一个量是否是不变量，最快的办法是拿一个已知的非不变量对照（例如 Christoffel 系数）。',
    ],
    boundary: [
      '不变量依赖变换群：换了「什么算相同」，不变量集合就要重新算一遍。',
      '不变量组不完整时，两个不同对象会有相同的不变量值，据此下的结论会错。',
      '找不变量是重写视角，不是省力的捷径：有些问题在不变量语言下反而更难算。',
    ],
    example: '本体里有一个专门的方法论节点「寻找不变量」，从「表示依赖」讲到不变量与完全不变量；张量性、微分同胚不变性这类判断都挂在它下面。',
    links: [{ label: '方法节点：寻找不变量', to: '/nodes/tensor:method-invariant' }],
    source: '站点自己的整理；本体里已有对应的方法论节点 `tensor:method-invariant`（寻找不变量）。',
  },
  {
    id: 'reverse-analysis',
    title: '逆向分析',
    gist: '从要证的结论往回推：要得到它，只差什么；那个「什么」又要什么——直到接上已知。',
    tag: '找证明',
    problem:
      '面对一个待证命题，从条件正向推很容易在中间迷路：每一步都合法，但不知道走哪儿去。'
      + '正向搜索的状态空间太大，而结论本身其实提供了很强的约束。',
    how: [
      '把结论写成「目标形式」：要证的是等式、不等式、存在性还是唯一性？形式决定了工具。',
      '问：要得到这个形式，上一句最可能是什么？（要用这条定理，还差哪个条件？）',
      '把差的条件记成新的子目标，对子目标再做一次同样的追问，形成一条逆向链。',
      '逆向链与正向链在中间会合时，把两头接起来，再从头顺写一遍——顺写的那一遍才是最终证明。',
      '某一步往回推时出现多个可能，就先挑最像最短的那个试；试不通换另一支，别在原地重写。',
    ],
    boundary: [
      '逆向推出来的链条不是证明：中间若有不可逆的步骤（如两边平方、除以可能为零的量），必须单独补上可逆性。',
      '会合不上时不要硬接：先检查结论的目标形式是否写错了。',
      '逆向分析对存在性命题特别有效，对「构造」类命题帮助有限——那类要靠正面造出来。',
    ],
    example: '本站的证明类节点要求「概括证明先行」：先给一句证明的战略（往往就是逆向链的骨架），再展开细节；细节里的每一步都能回指到骨架。',
    links: [{ label: '正文级证明示例：常值取值证书', to: '/nodes/limit:proof-eval-constant' }],
    source: '站点自己的整理（vault 里没有对应文档）。',
  },
  {
    id: 'intuition',
    title: '直觉的建立与失效',
    gist: '直觉用来猜方向，不用来下结论；主动找出直觉失效的例子，比反复强化它更有用。',
    tag: '判断',
    problem:
      '直觉多半来自有限几个例子，它给出的是「像不像」，不是「成不成立」。'
      + '当直觉被当成理由时，错误不会以「我算错了」的形式出现，而是以「我觉得显然」的形式固化下来。',
    how: [
      '把直觉写出来：你脑海里那幅图是什么？定义式的说法又是什么？两者差在哪里。',
      '主动找直觉失效的地方：反直觉的例子（处处连续处处不可导、收敛序列各项都不等于极限）。',
      '给直觉标注适用范围：它在哪类对象上可靠，超过哪条线就需要证明兜底。',
      '把失效例子挂在对应定义旁边，作为每次使用直觉时的检查点。',
      '区分两种直觉：来自图像的空间直觉，来自形式的代数直觉；两者失效的条件不一样。',
    ],
    boundary: [
      '不要为了「严谨」而放弃直觉：没有直觉就找不到证明方向，代价是把探索变成穷举。',
      '反直觉不等于假：量子力学式的「反直觉」是直觉的适用范围问题，不是直觉本身错。',
      '直觉的有效范围只能靠例子与证明来划定，靠反复自我暗示划不出来。',
    ],
    example: '本体里的十一个误区模式就是直觉失效的具体清单：例如「收敛序列各项都不等于极限」（把「趋近」当成「取不到」），以及「只检验一个过渡方向」（把 C^k 相容性方向性忘掉）。',
    links: [
      { label: '误区：收敛序列各项都不等于极限', to: '/nodes/limit:pattern-never-equal' },
      { label: '误区：只检验一个过渡方向', to: '/nodes/manifold:pattern-one-direction' },
    ],
    source: '站点自己的整理（vault 里没有对应文档）。《直觉的建立与失效.md》在生产目录里是 0 字节。',
  },
  {
    id: 'not-obvious',
    title: '不轻易诉诸「显然」',
    gist: '每个「显然」都要能展开成一步可检查的论证；展不开的，标成未验证的直觉。',
    tag: '纪律',
    problem:
      '「显然」是推理链上最常见的伪装：它把一个未验证的跳跃说成不需要验证。'
      + '在教材里省略证明步骤是合理的（篇幅），在自学里沿用「显然」则会让整条链断在自己没意识到的地方。',
    how: [
      '读到「显然」「容易看出」「同理可得」时，停下来问：它省略的是哪一步？',
      '尝试把那一步写全；写不出来就记成待办，而不是点头过去。',
      '给每个断言标状态：定义（DEF）、有证明（PROOF）、有引用（REF）、只有例子（ILLUSTRATION）、未验证（NOT-CLAIMED）。',
      '在给别人讲或写笔记时，把「显然」换成「这一步用到的是……」；如果补不上，就承认它还没验证。',
    ],
    boundary: [
      '不是要求每一步都从公理写起：已经内化的步骤可以跳过，但要能随时展开。',
      '过度的展开会淹没主线；笔记里可以用「展开见附注」的方式分层，而不是全部铺平。',
      '「显然」在同伴交流里是效率工具，前提是双方共享同一套已验证的背景。',
    ],
    example: '本站的证据状态标签就是这个纪律的实现：每个关键断言都要标 DEF / PROOF / REF / FINITE / ILLUSTRATION / NOT-CLAIMED，页面会如实显示哪些是例子、哪些没被声称。',
    source: '站点自己的整理；与 `mcs-foundations/15-验证与完成标准.md` 的证据标签体系一致。',
  },
  {
    id: 'motivation-tracing',
    title: '独立的动机溯源练习',
    gist: '不依赖教材给的动机，自己独立重建一次：这个对象为什么必须存在，它的胚子长什么样。',
    tag: '进阶练习',
    problem:
      '教材常以「过来人视角」引入概念：先定义，再用。'
      + '读者跟着走能算题，但不知道这个概念是为解决什么而生的，于是它在脑子里没有挂靠点，忘得也快。'
      + '更麻烦的是：别人给的动机（哪怕是作者写的）不会自动变成自己的动机。',
    how: [
      '合上书，自己回答：不引入这个对象，理论会在哪里卡住？',
      '分三条线索找：学科内部（哪条定理缺它说不下去）、外部应用（哪个问题逼出它）、结构与审美（它让哪类陈述变整齐）。',
      '找「胚子」：最早的粗糙形态是什么（特殊情形、失败的定义），它经过哪几步修正才成为今天的形式。',
      '对照教材的引入顺序，标出哪些地方是「作者的方便」而不是「逻辑的必然」。',
      '把这次重建写成一段话保存在笔记里；过一段时间重写一遍，比较两次的差别。',
    ],
    boundary: [
      '动机是补充，不是替代：重建动机之后仍要回到严格定义与证明。',
      '重建出的动机可能与历史事实不符（历史顺序常常是乱的），要区分「个体学习上的自然顺序」与「历史顺序」。',
      '不是每个概念都有深刻的动机；有些就是技术性的（为了记号方便），这时如实说明比编一个故事好。',
    ],
    example: '本站的每个节点页都把「动机」分成引入动机与构造动机两栏，并要求动机尽量多路径（学科内部 / 外部应用 / 审美结构）。',
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md ·「动机溯源」（有正文，含不定积分引入路径的例子）；「独立的练习」这一层是站点自己的整理。',
  },
  {
    id: 'stage-connections',
    title: '次阶段的应用 ≠ 本阶段的特定联系',
    gist: '别用后面阶段才用得上的漂亮应用，来代替当前阶段内部那根非接不可的联系。',
    tag: '进阶分辨',
    problem:
      '解释一个概念时，最省力的说法往往是它在后面的用途（「张量在广义相对论里很有用」）。'
      + '这种说法听起来深刻，却跳过了学习者此刻真正需要的那根联系——'
      + '本阶段里，这个概念与上一个概念之间到底靠什么接起来。结果是从「记住了用途」直接跳到「会算」，中间的桥始终没搭。',
    how: [
      '先分清两件事：这个对象在**当前阶段**与哪些已学内容有非接不可的联系；它在**后续阶段**有哪些应用。',
      '本阶段的联系优先：写清「没有它，本阶段的哪条结论说不下去」。',
      '后面的应用只作为远望存在——写一句它的去向即可，不要拿来当引入理由。',
      '检查自己的笔记：如果某个概念的引入理由全部来自后续章节，就补一条本阶段的联系。',
    ],
    boundary: [
      '不是禁止提应用，而是禁止**用应用代替联系**：应用可以作为动机的第二条线索。',
      '阶段边界是学习者视角的划分，不是数学上的分层；同一个内容对不同人可能在不同阶段。',
      '有些概念确实是先有工具、后有用途（历史上如此），这时如实说明顺序，不要硬编联系。',
    ],
    example: '张量就是典型：本阶段的联系是「坐标变换下的不变性 / 张量性」，后续应用是广义相对论；用后者代替前者，会把张量讲成「一堆指标的数组」——本体里的误区模式「所有指标数组都是张量」正是这么来的。',
    links: [
      { label: '张量性反例：Christoffel 系数不是张量', to: '/nodes/tensor:non-tensor-gamma' },
      { label: '方法节点：寻找不变量', to: '/nodes/tensor:method-invariant' },
    ],
    source: '站点自己的整理（vault 里没有对应文档）。',
  },
];

/** 按重要性排好的十条：页面按这个顺序渲染，序号就是重要性顺序。 */
export const METHOD_LIBRARY_ORDER = METHOD_LIBRARY.map((entry) => entry.id);

export function methodEntry(id: string | undefined): MethodEntry | undefined {
  return METHOD_LIBRARY.find((entry) => entry.id === id);
}

/* ======================================================================
 * 英文版（2026-10 中英双语，task-8）
 *
 * 中文那份逐字不动。`id`、顺序、`links[].to`、条数一一对应；
 * `source` 里引用的**文档名与路径保持原样**（那是可核验的事实），只译周围的话。
 * 出处标注同样诚实：0 字节的文档就说 0 bytes，「站点自己的整理」就说
 * `the site’s own compilation`，不假装是从某份文档里摘出来的。
 * ==================================================================== */

export const METHOD_LIBRARY_EN: MethodEntry[] = [
  {
    id: 'introspection',
    title: 'Introspection',
    gist: 'Examine your own thinking on purpose, rather than looking for the cause only after an error has done real damage.',
    tag: 'Meta-method',
    problem:
      'Passive progress is blind. Reading, listening and solving problems all happen, but nothing in you is asking “why am I stuck at this step” or “why do I feel this conclusion is obvious”. '
      + 'Waiting until an error does real harm (a lost mark, a derivation gone astray) means the cost has already been paid.',
    how: [
      'Stop at the moment you get stuck and write down “what makes me think this step holds?” — if you cannot write it, it does not hold.',
      'Tell three kinds of blockage apart: you do not know the definition; you do not know which known result to use; you know it but dare not use it (you are unsure whether the conditions hold). Each has a completely different remedy.',
      'Look back at the record later and mark which blockages recur; what recurs is what has to be trained separately.',
      'Expand each “this is obvious” into a checkable step; whatever cannot be expanded is recorded as an open question, not as a conclusion.',
    ],
    boundary: [
      'Introspection cannot replace external checking: feeling that you have thought it through still has to pass a concrete check (a proof, a counterexample, computing it once).',
      'The cost of introspection rises with frequency; writing “review every problem” squeezes out the solving itself — do it at blockages and errors only.',
      'Reading your own thinking as an objective object distorts it — record concrete actions, not conclusions such as “I understand it now”.',
    ],
    example: 'This site puts it on the node pages: every note has to state its “common misconceptions” and “questions to revisit”, which is the interface left for the next round of introspection.',
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md（开篇：内省的过程是很重要的）— has body text; 《内省.md》 is 0 bytes in the production directory, and the rest of this entry is the site’s own compilation.',
  },
  {
    id: 'cognitive-notes',
    title: 'The cognitive-development notebook',
    gist: 'Write these methods themselves as a notebook you keep updating: record the content, and record how your own thinking changes.',
    tag: 'Container',
    problem:
      'A method read once is forgotten; principles such as “be endogenous, demand evidence” remain slogans unless they land in a concrete carrier that will be read again. '
      + 'What is missing is not the principle but a container that keeps the principle in force.',
    how: [
      'Keep a long-term notebook of your own, devoted to the process of thinking: why you thought this way, where you got stuck, how it was later resolved.',
      'Hold two lines on content: write in words you generated yourself (wholly endogenous); give evidence for key claims, and when no proof is available fall back to an example and label it as one.',
      'Summarize in stages: first the idea (name the line of advance for a class of problems), then the method (the reusable steps).',
      'Reread and compress after some time: rewrite in more economical language, or even replace a whole passage with one typical example.',
      'Keep the open questions and interrogate yourself again after a while.',
    ],
    boundary: [
      'It does not replace textbooks and papers: a notebook is a workshop, not a source.',
      'Write only content and no process, and it degenerates into a second textbook; write only process and no content, and there is nothing checkable in it.',
      'Compression is not deleting detail: what gets pressed out are the intermediate steps you have internalized, not the places you have not yet walked through.',
    ],
    example: 'The node template on this site is the shape this notebook takes for a single mathematical object: prerequisites in three tiers, condition-by-condition counterexamples, the proof overview first, common misconceptions, and a summary with questions to revisit.',
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md（13.5 KB, with body text: 全然内源 / 不断更新 / 要有证据 / 总结思想与方法 / 对思想方法再加工）— this entry is the site’s compilation of it.',
  },
  {
    id: 'counterexample',
    title: 'Constructing counterexamples',
    gist: 'Run one deletion experiment per condition and find a concrete example where the conclusion collapses — the cheapest step with the highest return.',
    tag: 'Practice',
    problem:
      'The conditions of a theorem read like irritating clutter: “why assume smoothness?”, “is differentiability not enough?” '
      + 'Not understanding what a condition does leads you to take an over-strong condition for granted elsewhere, or to keep using the conclusion when the condition fails.',
    how: [
      'List the conditions of the theorem one by one, leaving none out.',
      'Delete one at a time and look for a concrete example in which “every other condition holds and the conclusion fails”.',
      'Write down how the conclusion collapses: at which step of the proof the deleted condition was used.',
      'The counterexample has to be checkable by someone else: give the concrete object, value or construction — never “there exists some counterexample”.',
      'Note along the way which kind of misconception this counterexample belongs to; after three of a kind, the real role of the condition becomes visible.',
    ],
    boundary: [
      'Failing to find a counterexample does not make the condition necessary — you may simply not have thought of one; mark it as an open question instead of turning it into “the condition really is necessary”.',
      'A counterexample can only refute, never prove; if the conclusion still holds after deleting a condition, the condition is strong rather than wrong.',
      'A counterexample far outside the original context teaches nothing (rejecting a finite-dimensional claim with a pathological space, say); it has to stay inside what the definitions allow.',
    ],
    example: 'The ontology already registers three counterexample objects and eleven misconception patterns: for instance “the Christoffel symbols are not a tensor” (a concrete counterexample where tensoriality fails under a change of coordinates), and the misconception “no term of a convergent sequence equals its limit”, which mistakes intuition for a definition.',
    links: [
      { label: 'Counterexample: the Christoffel symbols are not a tensor', to: '/nodes/tensor:non-tensor-gamma' },
      { label: 'Misconception: no term of a convergent sequence equals the limit', to: '/nodes/limit:pattern-never-equal' },
    ],
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md ·「删掉某个条件会怎样？」（with body text）＋ the template’s “condition-by-condition counterexamples” section; 《构造反例的方法.md》 is 0 bytes in the production directory, and the rest of this entry is the site’s own compilation.',
  },
  {
    id: 'special-case',
    title: 'Enter from a special case',
    gist: 'Say everything first about the smallest example you can actually compute, then return to the general statement — the reverse order is where false understanding lives.',
    tag: 'Entry point',
    problem:
      'A general definition is compressed: motivation, boundaries and exceptions have all been pressed out of it. '
      + 'Reading the general form directly leaves you recognizing every word and unable to say what the sentence means — a state that is very often mistaken for understanding.',
    how: [
      'Take the smallest non-trivial special case: lowest dimension, simplest structure, the one you can compute to the end.',
      'Walk the definition, the theorem and the proof through on that case, checking that each step lands.',
      'Note which steps in the special case used “generality” and which were a coincidence of this example.',
      'Return to the general statement and compare item by item: what does each condition of the general form correspond to in the special case?',
      'Then walk a second special case; if both get stuck at the same place, that place is your real gap.',
    ],
    boundary: [
      'A conclusion that holds in a special case cannot simply be generalized; the special case exposes structure, it does not supply a proof.',
      'Choosing the wrong special case misleads: over-special examples (the identity map, the zero matrix) hide the main difficulty of the general situation.',
      'Stopping at the special case degenerates into “can only do worked examples”; you have to return to the general statement to close.',
    ],
    example: 'The node pages here treat “examples and counterexamples” as a field on the same level as the definition: a concrete computable instance follows the definition immediately, and only then come the proof and the generalization.',
    source: 'The site’s own compilation (no corresponding document in the vault). Its basis here is the node template’s requirements that “intuition and definition come in pairs” and “claims and verification come in pairs”.',
  },
  {
    id: 'invariant',
    title: 'Find the invariants',
    gist: 'Ask “what stays the same under this transformation” — the invariants are the object itself; coordinates are only how it looks in one place.',
    tag: 'Abstraction',
    problem:
      'The same object looks completely different in different representations (different coordinate systems, bases, parametrizations). '
      + 'Staring at the representation itself mistakes “what changes when you change coordinates” for a property of the object and yields plausible-sounding but wrong conclusions.',
    how: [
      'First ask: under which transformations are “the same object” here considered the same? (change of coordinates, change of basis, change of parametrization, isomorphism)',
      'Check the quantities you care about one by one under that transformation: keep the invariant ones, cross out the rest.',
      'Organize what is left into a complete set of invariants: can they determine the object back? (this is the question of completeness)',
      'Rewrite the conclusions with invariants: definitions, theorems and computations expressed in invariants as far as possible.',
      'The fastest way to check whether a quantity is invariant is to compare with a known non-invariant (the Christoffel symbols, for instance).',
    ],
    boundary: [
      'Invariants depend on the transformation group: change “what counts as the same” and the set of invariants has to be recomputed.',
      'When the set of invariants is incomplete, two different objects share the same invariant values and conclusions drawn from them go wrong.',
      'Finding invariants is a change of viewpoint, not a shortcut: some problems are harder to compute in the language of invariants.',
    ],
    example: 'The ontology has a dedicated methodology node, “Seeking invariants”, which runs from representation-dependence to invariants and complete invariants; judgements such as tensoriality and diffeomorphism invariance hang under it.',
    links: [{ label: 'Method node: seeking invariants', to: '/nodes/tensor:method-invariant' }],
    source: 'The site’s own compilation; the ontology already has the corresponding methodology node `tensor:method-invariant`（寻找不变量）.',
  },
  {
    id: 'reverse-analysis',
    title: 'Working backwards',
    gist: 'Push back from the conclusion you want: what is still missing to get it, and what does that in turn need — until you meet what you know.',
    tag: 'Finding proofs',
    problem:
      'Facing a proposition to prove, pushing forward from the conditions easily loses its way in the middle: every step is legal, but you do not know where you are going. '
      + 'Forward search has too large a state space, while the conclusion itself actually supplies strong constraints.',
    how: [
      'Put the conclusion into “goal form”: is it an equality, an inequality, an existence or a uniqueness? The form decides the tool.',
      'Ask: to get this form, what is the most likely previous sentence? (To use this theorem, which condition is still missing?)',
      'Record the missing condition as a new subgoal and ask the same question again of the subgoal, forming a backward chain.',
      'When the backward chain meets the forward chain in the middle, join the two ends and write the whole thing forward from the start — that forward pass is the final proof.',
      'If a backward step branches, try the branch that looks shortest first; if it fails, switch, and do not rewrite in place.',
    ],
    boundary: [
      'A backward chain is not a proof: if it contains irreversible steps (squaring both sides, dividing by something that may be zero), reversibility has to be supplied separately.',
      'When the chains do not meet, do not force the join: first check whether the goal form of the conclusion was written down wrongly.',
      'Working backwards is especially effective for existence statements and of limited help for “constructive” ones — those have to be built outright.',
    ],
    example: 'Proof-type nodes here require “the proof overview first”: one sentence of strategy (often the skeleton of the backward chain), then the details, and every detail can point back to the skeleton.',
    links: [{ label: 'Prose-level proof example: the constant-value certificate', to: '/nodes/limit:proof-eval-constant' }],
    source: 'The site’s own compilation (no corresponding document in the vault).',
  },
  {
    id: 'intuition',
    title: 'How intuition is built, and how it fails',
    gist: 'Use intuition to guess a direction, never to settle a conclusion; actively finding where it fails is more useful than reinforcing it.',
    tag: 'Judgement',
    problem:
      'Intuition mostly comes from a few examples, and it tells you whether something “looks right”, not whether it holds. '
      + 'Once intuition is treated as a reason, the error does not show up as “I computed it wrong” but hardens into “I feel this is obvious”.',
    how: [
      'Write the intuition out: what is the picture in your head, and what does the definition say? Where do they differ?',
      'Actively look for places where intuition fails: counter-intuitive examples (continuous everywhere and differentiable nowhere; no term of a convergent sequence equals its limit).',
      'Mark the range in which the intuition is reliable: on which kind of object it holds, and beyond which line a proof has to back it up.',
      'Hang the failing examples next to the definitions they belong to, as checkpoints every time the intuition is used.',
      'Tell two kinds of intuition apart: spatial intuition from pictures and algebraic intuition from form; they fail under different conditions.',
    ],
    boundary: [
      'Do not give up intuition for the sake of “rigour”: without it you cannot find a direction for the proof, and the price is turning exploration into enumeration.',
      'Counter-intuitive is not the same as false: the “counter-intuitive” of quantum mechanics is a question about the range of intuition, not an error in intuition itself.',
      'The range in which an intuition works can only be drawn by examples and proofs, not by repeated self-suggestion.',
    ],
    example: 'The eleven misconception patterns in the ontology are exactly a list of places where intuition fails: for instance “no term of a convergent sequence equals its limit” (taking “approaches” for “never attains”), and “checking only one direction of the transition” (forgetting the directionality of C^k compatibility).',
    links: [
      { label: 'Misconception: no term of a convergent sequence equals the limit', to: '/nodes/limit:pattern-never-equal' },
      { label: 'Misconception: checking only one direction of the transition', to: '/nodes/manifold:pattern-one-direction' },
    ],
    source: 'The site’s own compilation (no corresponding document in the vault). 《直觉的建立与失效.md》 is 0 bytes in the production directory.',
  },
  {
    id: 'not-obvious',
    title: 'Do not appeal to “obvious” too readily',
    gist: 'Every “obvious” has to expand into one checkable argument; whatever cannot be expanded is labelled an unverified intuition.',
    tag: 'Discipline',
    problem:
      '“Obvious” is the most common disguise on a chain of reasoning: it presents an unverified leap as needing no verification. '
      + 'Omitting proof steps in a textbook is reasonable (space), but carrying “obvious” over into self-study breaks the chain where you do not notice.',
    how: [
      'When you read “obviously”, “it is easy to see” or “similarly”, stop and ask: which step is being omitted?',
      'Try to write that step out in full; if you cannot, record it as a to-do instead of nodding past it.',
      'Give every claim a status: definition (DEF), proof available (PROOF), reference available (REF), example only (ILLUSTRATION), not verified (NOT-CLAIMED).',
      'When explaining to someone or writing notes, replace “obviously” with “the step that uses …”; if it cannot be supplied, admit that it is not verified yet.',
    ],
    boundary: [
      'This does not demand writing every step from the axioms: internalized steps may be skipped, but they must be expandable at any time.',
      'Over-expansion drowns the main line; in notes you can layer it as “expand in a footnote” rather than flattening everything.',
      '“Obvious” is an efficiency tool among peers, on the premise that both sides share the same verified background.',
    ],
    example: 'The evidence-status tags on this site are that discipline implemented: every key claim is tagged DEF / PROOF / REF / FINITE / ILLUSTRATION / NOT-CLAIMED, and the pages show honestly which are examples and which are not claimed.',
    source: 'The site’s own compilation; consistent with the evidence-tag system of `mcs-foundations/15-验证与完成标准.md`.',
  },
  {
    id: 'motivation-tracing',
    title: 'An independent motivation-tracing exercise',
    gist: 'Without relying on the motivation a textbook gives, rebuild it yourself: why must this object exist, and what did its embryo look like?',
    tag: 'Advanced exercise',
    problem:
      'Textbooks often introduce a concept from the perspective of someone who already knows the way: define first, use afterwards. '
      + 'The reader can follow and compute, but does not know what the concept was born to solve, so it has nothing to hang on to in the mind and is forgotten quickly. '
      + 'Worse: a motivation given by someone else (even by the author) does not automatically become your own.',
    how: [
      'Close the book and answer for yourself: without this object, where would the theory get stuck?',
      'Look along three lines: inside the subject (which theorem cannot be stated without it), external applications (which problem forced it out), structure and aesthetics (which kind of statement it makes tidy).',
      'Find the “embryo”: what the earliest rough form was (a special case, a failed definition), and through which corrections it became today’s form.',
      'Compare with the order in which the textbook introduces it and mark which parts are “convenient for the author” rather than “logically necessary”.',
      'Write this reconstruction as a paragraph in your notes; rewrite it after some time and compare the two versions.',
    ],
    boundary: [
      'Motivation is a supplement, not a replacement: after rebuilding it you still return to the rigorous definition and proof.',
      'A reconstructed motivation may not match historical fact (history is often out of order); tell “the natural order for an individual learner” apart from “the historical order”.',
      'Not every concept has a deep motivation; some are purely technical (notation made convenient), and saying so honestly beats inventing a story.',
    ],
    example: 'Every node page here splits “motivation” into motivation for introducing it and motivation for constructing it, and asks for as many routes as possible (inside the subject / external applications / aesthetic structure).',
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md ·「动机溯源」（with body text, including the example of how indefinite integration is introduced）; the “independent exercise” layer is the site’s own compilation.',
  },
  {
    id: 'stage-connections',
    title: 'An application at the next stage ≠ the specific link at this stage',
    gist: 'Do not let a beautiful application from a later stage stand in for the link that has to be made inside the current stage.',
    tag: 'Advanced distinction',
    problem:
      'When explaining a concept, the easiest thing to say is usually its later use (“tensors are useful in general relativity”). '
      + 'That sounds deep while skipping the link the learner actually needs right now — '
      + 'what exactly connects this concept to the previous one inside this stage. The result is a jump from “I remember the use” straight to “I can compute”, with the bridge never built.',
    how: [
      'First separate two things: which already-learned content this object must connect to **at the current stage**, and which applications it has **at later stages**.',
      'The current-stage link comes first: write down “without it, which conclusion of this stage cannot be stated”.',
      'Later applications exist only as a distant view — one sentence about where it goes is enough; do not use them as the reason for introducing it.',
      'Check your own notes: if a concept’s reasons for being introduced all come from later chapters, add one current-stage link.',
    ],
    boundary: [
      'This does not forbid mentioning applications, it forbids **using an application in place of the link**: an application can be the second line of motivation.',
      'Stage boundaries are a learner’s division, not a mathematical layering; the same content may sit at different stages for different people.',
      'Some concepts really did have the tool first and the use later (as history shows); say so honestly rather than forcing a link.',
    ],
    example: 'Tensors are the standard case: the current-stage link is “invariance under coordinate changes / tensoriality”, and the later application is general relativity; putting the latter in place of the former turns tensors into “an array of indices” — the ontology’s misconception pattern “every array of indices is a tensor” comes from exactly that.',
    links: [
      { label: 'Counterexample to tensoriality: the Christoffel symbols are not a tensor', to: '/nodes/tensor:non-tensor-gamma' },
      { label: 'Method node: seeking invariants', to: '/nodes/tensor:method-invariant' },
    ],
    source: 'The site’s own compilation (no corresponding document in the vault).',
  },
];

/** 成对的方法库：页面用 `useI18n().pick(METHOD_LIBRARY_BY_LOCALE)` 取。 */
export const METHOD_LIBRARY_BY_LOCALE: { zh: MethodEntry[]; en: MethodEntry[] } = {
  zh: METHOD_LIBRARY,
  en: METHOD_LIBRARY_EN,
};

/** 取某一条方法（按语种）；未登记的 id 返回 `undefined`，与中文那份的行为一致。 */
export function methodEntryFor(id: string | undefined, locale: Locale = 'zh'): MethodEntry | undefined {
  const library = locale === 'en' ? METHOD_LIBRARY_EN : METHOD_LIBRARY;
  return library.find((entry) => entry.id === id);
}
