/**
 * 网站介绍与方法论的**纯文本内容**。
 *
 * 为什么放在这里而不是写死在 JSX 里，也不放进本体 `data/`：
 *
 * - 不放进 `data/`：本体 M 记录的是**数学对象**及其证据。站点自我介绍与学习
 *   方法论是元层内容，混进本体会让「M 是数学资源」这条边界失效，也会污染
 *   版本哈希——改一句介绍文案不该改变数学本体的版本号。
 * - 不写死在 JSX：这些段落要能被测试逐条核对（见 `tests/browser.mjs` 的介绍页断言），
 *   也需要集中一处便于修订。做成数据后，页面只负责渲染。
 *
 * 内容来源与证据边界写在每段的 `evidence` 字段里：研究专稿取自
 * `mcs-foundations/`（分章 Markdown 为修订源），论文取自
 * `mcs-foundations/arxiv/`（本地准备稿，未投稿），方法论取自
 * `MCS_vault/MCS/methodology/` 与 `MCS_vault/MCS/template/`。
 */

export interface IntroFact {
  label: string;
  value: string;
  note?: string;
}

export interface IntroSection {
  id: string;
  title: string;
  /** 一段话的结论先行。 */
  lead: string;
  /** 正文段落。 */
  paragraphs: string[];
  /** 可选的项目列表。 */
  bullets?: string[];
  /** 可选的表格。 */
  facts?: IntroFact[];
  /** 这条内容取自哪里、边界是什么。 */
  evidence?: string;
}

/** 对外总题（取自 `mcs-foundations/publication/发布总纲.md` 第 1 节）。 */
export const SITE_INTRO_TITLE = '数学认知空间 MCS：数学资源、证据与学习路线';

/**
 * 一段式介绍原文。**逐字取自**发布总纲的定位段落，不做改写——
 * 这是对外口径，改写会让站内说法与专稿不一致。
 */
export const SITE_INTRO_SUMMARY
  = '同一个数学对象，可以从不同问题进入，也可以用不同方式表达。MCS 研究如何记录这些资源之间的条件、证据与来源，并据此构造可检查的学习路线。它将公共数学资源、外部学习者状态和派生视图分开，使不同入口共享数学依据，同时保留各自的未知与限制。当前成果包括形式规范、附条件的数学论证和有限实现；实际教学收益仍是待检验的问题。';

export const SITE_INTRO_SECTIONS: IntroSection[] = [
  {
    id: 'problem',
    title: '它要解决什么问题',
    lead: '两个具体的失效：把「提到了某个概念」当成「证明依赖它」；把「换了一种表达」当成「条件没有丢」。',
    paragraphs: [
      '数学材料里的连线往往同时承担好几种意思——联合必需、可替代的入口、证明依赖、仅仅是讲法不同。这些意思在纸面上常常长得一样，于是一旦要按图选路、或者把图缩小一档隐藏部分上下文，含义就混掉了。',
      '学习实践上的失效在另一头：不同背景的人想进入同一个目标，需要的入口不同；而任何一条「建议你这样学」的路线，都应该说清它用了哪些假设。大多数路线推荐不说，或者说了也没法核对。',
      'MCS 把这两件事放在同一个框架里处理，构造链是：条目与连线 → 成组输入和替代行动 → 带证据与来源的资源 → 外置个人评价的事件路线 → 针对具体模型的独立检验。这是设计动机，不是历史发生或心理发展规律的实证描述。',
    ],
    evidence: '取自 mcs-foundations/publication/发布总纲.md 第 1 节。构造链是设计动机（DEF）。',
  },
  {
    id: 'boundary',
    title: '三层分离：M / E / D',
    lead: '公共数学资源、外部学习者状态、派生结果各占一层，只有 E 接受写入。',
    paragraphs: [
      '这是整个项目最基础的一条分界，也是站内每个页面都遵守的约束。它同时解决了两个问题：学习者数据不会污染公共知识，公共知识的修订也不会悄悄改掉某个人的学习记录。',
    ],
    facts: [
      { label: 'M · 公共本体', value: '数学对象、关系、行动契约、证据记录', note: '随版本公开修订，用内容哈希固定；本机产品里是只读的' },
      { label: 'E · 外部模型', value: '你的确认、作答、笔记、误区记录、学习事件', note: '唯一接受写入的一层；换档案即换一套 E，M 不动' },
      { label: 'D · 派生', value: '视图、路线、推荐、继续学习网络', note: '由 M + E 现算，不落库；刷新后由同样的输入得到同样的输出' },
    ],
    evidence: '论文第 4 节（Public resources and external evaluation）给出只读不变性命题 prop:readonly（PROOF）；本站把它实现为「学习者写入只落 E」。',
  },
  {
    id: 'relations',
    title: '关系是分类型的，不是一种「连线」',
    lead: '七种关系各自带权重与见证状态；越硬的数学断言，画得越重、在布局里吸得越紧。',
    paragraphs: [
      '把关系一律画成同样的线，等于把「必须先用它」和「讲法不同」混为一谈。MCS 为每种关系记下见证类型与证据状态，并按认知成本分档：严格推导最硬，类比最软。',
      '同一条权重表同时决定四件事——线宽、颜色饱和度、推荐理由的强弱顺序、力导向布局里的吸引强度。四者出自同一个数，因此不会出现「画得很粗却几乎不吸」这类自相矛盾。',
    ],
    facts: [
      { label: '硬前置 hardPrereq', value: '权重 1.00', note: '不用它就推不下去' },
      { label: '硬泛化 hardGeneralization', value: '权重 0.95', note: '一方是另一方的特例；见证多为 PROOF' },
      { label: '特化 specialization', value: '权重 0.90', note: '硬泛化的反方向，成对登记，不算两条独立断言' },
      { label: '应用 application', value: '权重 0.72', note: '概念被用到具体对象上' },
      { label: '跨域 crossDomain', value: '权重 0.68', note: '两条理论线之间的接口' },
      { label: '对偶 duality', value: '权重 0.62', note: '两个空间按配对互相确定' },
      { label: '桥梁 bridge', value: '权重 0.56', note: '两种表述之间的等价' },
      { label: '类比 analogy', value: '权重 0.40', note: '启发用，先让步、不充当证明' },
    ],
    evidence: '权重表在 web/src/relation-visual.ts（RELATION_WEIGHT）；「越硬越明显」是一条可视化条款，由 tests/relation-visual.test.mjs 核对层级不反转。',
  },
  {
    id: 'evidence',
    title: '每个断言都标证据状态',
    lead: '「觉得自然」不是证明；暂时证明不了就退成例子，并如实标注。',
    paragraphs: [
      '站内每个数学断言都带一个证据状态标签，取值来自专稿的验证标准。标签不是装饰：正文证明与机器证书分开列，机器证书只覆盖它实际检查过的那一小段。',
      '这一条直接决定了界面的措辞。比如微分几何案例的 36 条证据全部是「正文级」，检查状态是「未运行」——语料没有机器证书，因此界面不写「已核验」，只写义务清单。',
    ],
    facts: [
      { label: 'DEF', value: '定义或约定', note: '不声称真值，只固定用法' },
      { label: 'PROOF', value: '有正文证明', note: '未机器核验；证明在专稿对应章节' },
      { label: 'REF', value: '引用来源', note: '核验范围写在证据记录里，不等于读完全文' },
      { label: 'FINITE', value: '有限检查', note: '只覆盖列明的有限片段，不推广' },
      { label: 'ILLUSTRATION', value: '示例说明', note: '用来建立直觉，不承担证明' },
      { label: 'NOT-CLAIMED', value: '明确不声称', note: '把范围边界写出来，而不是留空' },
    ],
    evidence: '标签与检查状态来自 mcs-foundations/15-验证与完成标准.md；站内证据记录在 data/cases/*.mjs。',
  },
  {
    id: 'research',
    title: '研究基础与论文',
    lead: '完整理论专稿是修订源；独立英文论文承担对同行的研究主张，目前是本地准备稿。',
    paragraphs: [
      '理论专稿与论文分工明确：中文分章是完整项目的权威来源，论文只收束一个中心问题、按目标场合的篇幅裁切。论文的题名、PDF 与投稿包都是本地准备件，没有投稿，也没有经过同行审阅。',
      '同一份材料按读者—交付物配对拆成五种交付物：问题导读给初读者，研究正文给想理解整体设计的读者，形式基础与核验给审阅者，独立论文给研究同行，复现材料给复核者。这个配对是编辑决策，读者效果尚未试读。',
    ],
    facts: [
      { label: '论文题名', value: 'MCS: A Formal Framework for Mathematical Knowledge and Learning Routes with External Learner Models' },
      { label: '主结果一', value: '组合保持（thm:preservation）', note: 'PROOF，相对于局部有效性等假设' },
      { label: '主结果二', value: '界内搜索（thm:search）', note: 'PROOF；实现只覆盖列明片段' },
      { label: '主结果三', value: '条件饱和（thm:saturation）', note: 'PROOF；作为失败案例，说明无约束聚合会退化为全集' },
      { label: '表示边界', value: '等信息增强图编码（prop:encoding）', note: 'PROOF；保留同等结果，不以删去对照信息制造优势' },
      { label: '贯穿案例', value: '极限的两种表述', note: 'prop:limit（PROOF）；正文证明与局部机器证书分开' },
      { label: '复现材料', value: 'Python 标准库脚本 + 输入哈希 + 运行报告', note: 'ancillary 附件；环境为 Python 3.14.7，未声称覆盖所有中间版本' },
      { label: '投稿状态', value: '本地准备，未投稿', note: '分类建议 cs.AI，交叉列表 cs.LO 待定' },
    ],
    evidence: '取自 mcs-foundations/arxiv/（main.tex、submission-metadata.txt、README.md）与 publication/发布总纲.md 第 4 节。',
  },
  {
    id: 'limits',
    title: '明确不声称什么',
    lead: '成果是接口整合、条件可审查与有限复现；不是「首创知识网络」，也不是「提升学习效率」。',
    paragraphs: [
      '这一节放在介绍里而不是藏进附录，因为它决定了前面每一段该怎么读。',
    ],
    bullets: [
      '不断言唯一图表达力：论文给出了等信息编码，同一片段上类型化动作图、标注二部图与 MCS 得到相同分类——这是「不更差」，不是「更强」。',
      '不断言实际教学收益：没有做过对照实验，也没有测量过学习效果。任何「学得更快」的说法都超出当前证据。',
      '不声称完整机器认证：Python 证明检查器的一般正确性、以及全部数学案例的机器认证，都是论文列明的开放问题。',
      '不声称外文文献已全文审查：核验范围记在 anc/source-audit.json 里，「查过目录」不写成「读完全文」。',
      '本站是案例演示入口：单独报告软件版本与测试范围，不承担论文证明，也不要求读者先配置服务才能读懂专稿。',
    ],
    evidence: '取自 publication/发布总纲.md 第 4 节「关于新颖性」与论文第 10 节 Limits and research questions。',
  },
];

/** 站内实际规模。数字来自只读接口，页面运行时现取，不写死。 */
export const INTRO_COUNT_LABELS: Record<string, string> = {
  nodes: '登记节点',
  actions: '行动契约',
  relations: '成对关系',
  evidence: '证据记录',
  support: '支持族条目',
  claims: '可核验断言',
  localizations: '局部化方案',
  templates: '笔记模板',
};

export const INTRO_ENTRIES = [
  { to: '/nodes', label: '按对象读：数学对象', note: '112 个节点，可按案例、学科、构造类型筛' },
  { to: '/network', label: '按结构读：组建网络', note: '力导向图，关系按硬度加权；右键可移出节点' },
  { to: '/plan', label: '按路线读：学习路线', note: '给出候选路线与它用的假设' },
  { to: '/lab', label: '按证据读：研究台', note: '覆盖清单、局部化算子与证据重放；给复核用' },
];

/* ------------------------------------------------------------------ */
/* 方法论                                                              */
/* ------------------------------------------------------------------ */

export interface MethodItem {
  id: string;
  title: string;
  /** 一句话结论。 */
  gist: string;
  /** 怎么做。 */
  how: string[];
  /** 为什么有效——不给理由的原则只会变成口号。 */
  why: string;
  /** 出处。 */
  source: string;
}

/**
 * 数学学习方法论。
 *
 * **收录范围**：只收方法论文档里已经写出完整论述的条目。原文档中若干小节
 * （《类比中的让步》《为什么要这样做》等待补）目前是空标题，这里不替它编内容；
 * 《构造反例的方法》《内省》《直觉的建立与失效》三份文件在生产目录里是 0 字节，
 * 因此本页不含这三份的内容。空的地方就空着——这比补一段听起来合理的话诚实。
 */
export const METHOD_CORE: MethodItem[] = [
  {
    id: 'endogenous',
    title: '全然内源：用自己的话重写',
    gist: '无论资料与自己的想法重合多少，都要用自己生成的话表达一遍。',
    how: [
      '读完一节教材，合上书，写。',
      '卡住了就回到原文找一个词，再合上书，继续写。',
      '直到能独立走完这一段为止。',
    ],
    why: '大脑默认走最便宜的通路。读到一段精妙的论述，你以为自己理解了——其实只是别人的文字在你脑子里流畅地过了一遍，没有和你的神经元发生足够深的纠缠。用自己的话重写，等于强迫大脑重走那条思考路径，这次没有原文替你铺路。',
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md · 全然内源',
  },
  {
    id: 'evidence',
    title: '要有证据',
    gist: '内容要有具体证据；暂时给不出严谨证明，就退行成例子并标注。',
    how: [
      '每个关键断言写清它凭什么成立。',
      '证明不了就找一个具体例子或反例，并明确它是例子而不是证明。',
      '区分「我真的信这个」和「我只是觉得有道理」。',
    ],
    why: '「觉得有道理」是一种模糊的舒适感；写出具体证据，是让那个舒适感经受物理检验。一旦开始在笔记里塞证据，很多原本「感觉对了」的东西会自己倒塌。',
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md · 要有证据',
  },
  {
    id: 'condition-removal',
    title: '删掉某个条件会怎样？',
    gist: '对定理的每个条件做一次删除实验，找出让结论崩溃的具体反例。',
    how: [
      '列出定理的全部条件。',
      '逐个删掉一个条件，找一个结论不成立的具体例子。',
      '把反例和「结论怎么塌的」一起写下来，不只丢一个式子。',
    ],
    why: '这是一项极其廉价的探索练习：不需要做任何新证明，只需要找反例。反例本身比十遍「因为定理要求光滑所以需要光滑」更能让你记住条件的作用，也会让条件从记忆负担变成从反例中生长出来的保护栏。',
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md · 删掉某个条件会怎样；模板的「逐条件反例」一节',
  },
  {
    id: 'motivation',
    title: '动机溯源',
    gist: '对不够朴素自然的引入，补上自然动机；对过于发散的文本，补上战略远瞩。',
    how: [
      '先问：这个对象为什么必须存在？',
      '分三条线索找动机——学科内部（不引入它，理论在哪里卡住）、外部应用、审美与结构。',
      '再找它的「胚子」：最早的粗糙形态长什么样，怎么一步步走到今天的规范形式。',
    ],
    why: '写在纸上的内容是凝练的，相对于脑海里的内容省去了很多自然而不必要的想法。很多教材用「过来人视角」引入概念，读者不容易体会到动机——这正是很多人吐槽的「防自学」。平衡易读性与战略上的长远考虑，需要对两种极端都有包容度。',
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md · 动机溯源；模板的 Motivation 一节',
  },
  {
    id: 'error-path',
    title: '保留试错途径',
    gist: '记下「我当时以为是这样的，其实不对，因为……」，那是你思维的地图。',
    how: [
      '在笔记里留一段错误路径，不要只留正确答案。',
      '写清两件事：当时被什么惯性牵着走；用什么检验手段发现了错误。',
      '下次见到同类运算环境，先检查那条惯性是否又出现了。',
    ],
    why: '正确的最终答案只是答案；你当初走错的那几条路，才是你思维的地图。记录错误能装上一个可复用的警报器——作者记下「把等价当作相等随意迁移」这个惯性之后，凡遇到等价代换都会自动检查所在运算环境是否允许代换。诚实地写下「我没能走到那里」，比假装「我走到了」分量更重：你画出了理解的边界，而边界画清楚之后，下一次就有可能往外推。',
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md · 保留试错途径以便对思维惯性自省',
  },
  {
    id: 'synthesis',
    title: '总结、命名与再加工',
    gist: '阶段性样本够了以后，跳出具体问题凝练共性：先总结思想，再总结方法。',
    how: [
      '总结思想：这一类问题的核心推进思路是什么（放大法？不动点？反证？）——给思想命名，就是给未来的自己留一个检索标签。',
      '总结方法：在特定理论框架下凝练出可复用的步骤。',
      '再加工四步：凝练（压成一句话）、类比（找同构）、深化（追问条件为什么是这些）、不断压缩（隔段时间用更经济的话重写）。',
    ],
    why: '总结使思维携带信息的压力变小，并有利于迁移应用，因为压缩之后信息的携带成本变低了。例如定积分里一堆技巧（换元、分部、有理化）背后有共同的朴素思想：把被积表达式逐步变形为容易找到原函数的形式，每一步变形都需要「等价」或可控制误差。这个思想比记住一百个公式更轻便，也更容易迁移到微分方程与级数求和上去。',
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md · 总结 / 对思想方法再加工',
  },
  {
    id: 'strategy',
    title: '积极构建策略',
    gist: '把一类问题的应对方式写成决策流程，而不是每次从零开始。',
    how: [
      '问四个问题：这类问题可供识别的特征是什么？识别出来后优先考虑什么？有没有保底手段？能不能把「这类问题」的类扩大？',
      '把答案写成有顺序的决策树，可视化为流程图更好。',
    ],
    why: '策略把「做不出来」的恐慌转化成一个顺序决策过程，每一次卡住都变成优化策略的契机。作者以不定积分为例给出了一套完整流程：先识别被积函数结构（有理函数→部分分式；根式→三角换元；两类函数乘积→分部积分，选 u 循「反对幂指三」；三角幂次→奇次拆凑微分、偶次降幂），最后保留保底手段（万能代换、查表、符号工具），并要求手动求导验证。',
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md · 积极构建策略',
  },
  {
    id: 'analogy',
    title: '类比：先让步，再节制',
    gist: '类比可以帮助凝练与迁移，但它只在一个小点上有效，不要把它扩成一整个场景。',
    how: [
      '在两件事之间找出同构的那个抽象内核，给它一个名字。',
      '明确写出这个类比**在哪里停止**成立。',
      '迁移之前先检查：这次要用的，是不是正是那个内核。',
    ],
    why: '类比接近神经元的行为模式：想一个概念时唤醒的是携带凝练意义的神经元，因此自然地能想到与它密切联系的其他概念。作者举例：楞次定律（物理）、勒夏特列原理（化学）、稳态调节（生物）都体现系统对扰动的负反馈，类比之后被凝练成一个更抽象的主题。但滥用会让类比沦为形式主义——原文《类比中的让步》一节待补，本页只收已写出的部分。',
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md · 类比 / 类比不能滥用',
  },
];

/** 笔记模板里与「怎么组织一个对象的笔记」直接相关的骨架，按原文顺序。 */
export const METHOD_TEMPLATE_SKELETON = [
  { title: '前置知识分三层', detail: '必备（刚好够用）／辅助（更好理解）／拓展（加强与其它分支的联系）' },
  { title: '动机分两段', detail: '为什么需要它存在（内部线索／外部应用／审美结构三条线索）→ 它怎样从胚子长成今天的形式' },
  { title: '形式含七问', detail: '通用形式、逐条件反例、等价表达、形式类别、自然语言表达、降维表述、升维视角、相似对象联动' },
  { title: '证明概括先行', detail: '先用一句话从全局俯瞰整个证明，再逐步细化——先全局后局部也是更舒服的阅读节奏' },
  { title: '应用分直接与间接', detail: '直接应用要突出新工具如何简化旧的痛苦；间接应用让人感到「这真有用」即可' },
  { title: '推广三问', detail: '哪些条件可以减弱？哪些结论可以泛化？有哪些重要公开问题与它强相关？' },
  { title: '常见误解与个人启发', detail: '列经典误解、解释它为什么发生、学习者可能忽略了哪个条件；启发一节鼓励记真实的思维波动' },
  { title: '总结与回看', detail: '思想凝练成一两句；方法列具体技巧并注明用在笔记的哪一处；最后留回看提问' },
];

/** 本页没有收录什么，以及为什么。 */
export const METHOD_NOT_INCLUDED = [
  '《构造反例的方法》《内省》《直觉的建立与失效》三份文件在生产目录中仍然是 0 字节：方法库里那三条（构造反例 / 内省 / 直觉的建立与失效）是站点自己的整理，不是对这三份文档的转述——它们的出处一栏逐条写明了这一点。',
  '《认知发展笔记》中的《类比中的让步》与《为什么要这样做？》目前是空标题（只有「这样做的好处是什么 / 不这样做的坏处是什么」两问），本页不替它补写。',
  '方法库里有五条在 vault 中没有对应文档（从特例切入、找不变量、逆向分析、不轻易诉诸「显然」、次阶段的应用 ≠ 本阶段的特定联系），它们的出处一律写成「站点自己的整理」。',
  '本页整理自 MCS_vault/MCS/methodology/ 与 MCS_vault/MCS/template/ 的现有文本，未改动原文；原文中英文版与中文版并存，这里以中文版为准。',
];

/* ======================================================================
 * 英文版（2026-10 中英双语，task-8）
 *
 * 中文那份是**源语言**：上面的导出逐字不动（测试逐条比对它们）。
 * 这里给的是同一份内容的英文版，`id`、锚点、顺序、条数一一对应；
 * `evidence` 里引用的**文件名与路径**保持原样（那是可核验的来源，不翻译），
 * 只译它周围的话。出处栏同样如实：REF 就是引用，未声称就是 `not claimed`。
 * ==================================================================== */

/** 对外总题（英文）。 */
export const SITE_INTRO_TITLE_EN = 'Mathematical Cognitive Space (MCS): mathematical resources, evidence and learning routes';

export const SITE_INTRO_SUMMARY_EN
  = 'One and the same mathematical object can be entered from different questions and expressed in different ways. MCS studies how to record the conditions, evidence and provenance that hold between these resources, and how to build checkable learning routes on top of them. It keeps public mathematical resources, external learner state and derived views apart, so that different entries share the same mathematical basis while each keeps its own unknowns and limits. The current results are a formal specification, conditional mathematical arguments and limited implementations; the actual teaching benefit remains an open question.';

export const SITE_INTRO_SECTIONS_EN: IntroSection[] = [
  {
    id: 'problem',
    title: 'What problem it solves',
    lead: 'Two concrete failures: treating “this concept was mentioned” as “the proof depends on it”, and treating “said in another way” as “nothing was lost”.',
    paragraphs: [
      'The links in mathematical material often carry several meanings at once — jointly necessary, an alternative entry point, a proof dependency, or merely a different way of telling it. On paper these meanings usually look alike, so the moment you want to choose a route from the graph, or collapse it one level and hide part of the context, the meanings get mixed up.',
      'The failure in learning practice lies at the other end: people with different backgrounds who want to reach the same goal need different entry points, and any route that says “study it this way” ought to state which assumptions it used. Most route recommendations do not say, or say it in a way that cannot be checked.',
      'MCS handles both in one framework. The construction chain is: items and links → grouped inputs and alternative actions → resources with evidence and provenance → event routes with personal evaluation kept outside → independent checks against a specific model. This is the design motivation, not an empirical description of how it came about historically or of how the mind develops.',
    ],
    evidence: 'From mcs-foundations/publication/发布总纲.md §1. The construction chain is a design motivation (DEF).',
  },
  {
    id: 'boundary',
    title: 'Three layers kept apart: M / E / D',
    lead: 'Public mathematical resources, external learner state and derived results each have their own layer; only E accepts writes.',
    paragraphs: [
      'This is the most basic dividing line of the whole project, and every page on the site obeys it. It settles two things at once: learner data does not pollute public knowledge, and revisions of public knowledge do not silently rewrite someone’s learning record.',
    ],
    facts: [
      { label: 'M · public ontology', value: 'mathematical objects, relations, action contracts, evidence records', note: 'revised and published by version and fixed by a content hash; read-only in the local product' },
      { label: 'E · external model', value: 'your confirmations, answers, notes, misconception records, learning events', note: 'the only layer that accepts writes; switching profiles switches E, and M does not move' },
      { label: 'D · derived', value: 'views, routes, recommendations, the continue-learning network', note: 'computed from M + E on demand and not stored; a refresh gives the same output from the same input' },
    ],
    evidence: 'Section 4 of the paper (Public resources and external evaluation) gives the read-only invariance proposition prop:readonly (PROOF); this site implements it as “learner writes land only in E”.',
  },
  {
    id: 'relations',
    title: 'Relations have kinds; they are not a single sort of “link”',
    lead: 'Seven kinds of relation, each with its own weight and witness status; the harder the mathematical claim, the heavier it is drawn and the more strongly it pulls in the layout.',
    paragraphs: [
      'Drawing every relation as the same line amounts to confusing “you must use this first” with “this is told differently”. MCS records a witness type and an evidence status for each kind and grades them by cognitive cost: strict deduction is hardest, analogy the softest.',
      'One weight table decides four things at once — line width, colour saturation, the strength order of recommendation reasons, and the attraction in the force-directed layout. All four come from the same number, so “drawn thick but hardly attracting” cannot happen.',
    ],
    facts: [
      { label: 'Hard prerequisite hardPrereq', value: 'weight 1.00', note: 'without it the deduction cannot proceed' },
      { label: 'Hard generalization hardGeneralization', value: 'weight 0.95', note: 'one side is a special case of the other; the witness is usually PROOF' },
      { label: 'Specialization specialization', value: 'weight 0.90', note: 'the reverse direction of a hard generalization, registered in pairs, not counted as two independent claims' },
      { label: 'Application application', value: 'weight 0.72', note: 'a concept is applied to a concrete object' },
      { label: 'Cross-domain crossDomain', value: 'weight 0.68', note: 'an interface between two theoretical lines' },
      { label: 'Duality duality', value: 'weight 0.62', note: 'two spaces determine each other by pairing' },
      { label: 'Bridge bridge', value: 'weight 0.56', note: 'an equivalence between two formulations' },
      { label: 'Analogy analogy', value: 'weight 0.40', note: 'for inspiration: it concedes first and never serves as a proof' },
    ],
    evidence: 'The weight table is in web/src/relation-visual.ts (RELATION_WEIGHT); “the harder, the more visible” is a visualization clause, and tests/relation-visual.test.mjs checks that the tiers are not inverted.',
  },
  {
    id: 'evidence',
    title: 'Every claim carries an evidence status',
    lead: '“It feels natural” is not a proof; when a proof is not available yet, fall back to an example and say so.',
    paragraphs: [
      'Every mathematical claim on the site carries an evidence-status tag, with values taken from the monograph’s validation standard. The tags are not decoration: prose proofs and machine certificates are listed separately, and a machine certificate covers only the small stretch it actually checked.',
      'This decides the wording of the interface. The 36 evidence records of the differential-geometry case, for instance, are all “prose level” with check status “not run” — the corpus has no machine certificate, so the interface never says “verified” and shows the obligation list instead.',
    ],
    facts: [
      { label: 'DEF', value: 'definition or convention', note: 'claims no truth value, only fixes usage' },
      { label: 'PROOF', value: 'prose proof available', note: 'not machine-checked; the proof is in the corresponding chapter of the monograph' },
      { label: 'REF', value: 'cites a source', note: 'the scope checked is written in the evidence record; it is not the same as having read the whole text' },
      { label: 'FINITE', value: 'finite check', note: 'covers only the listed finite fragment and does not generalize' },
      { label: 'ILLUSTRATION', value: 'illustrative example', note: 'builds intuition and carries no proof' },
      { label: 'NOT-CLAIMED', value: 'explicitly not claimed', note: 'writes the boundary of the scope down instead of leaving it empty' },
    ],
    evidence: 'Tags and check status come from mcs-foundations/15-验证与完成标准.md; the site’s evidence records are in data/cases/*.mjs.',
  },
  {
    id: 'research',
    title: 'Research basis and the paper',
    lead: 'The complete theoretical monograph is the revision source; a separate English paper carries the research claim to peers and is currently a local draft.',
    paragraphs: [
      'The monograph and the paper divide the work clearly: the Chinese chapters are the authoritative source for the complete project, while the paper narrows to one central question and is cut to the length the target venue expects. The paper’s title, PDF and submission package are all local preparations: it has not been submitted and has not been peer-reviewed.',
      'The same material is split, by reader–deliverable pairing, into five deliverables: a problem-oriented introduction for first-time readers, the research text for readers who want the overall design, the formal basis and validation for reviewers, the standalone paper for research peers, and the reproduction material for those checking it. This pairing is an editorial decision; reader response has not been trialled.',
    ],
    facts: [
      { label: 'Paper title', value: 'MCS: A Formal Framework for Mathematical Knowledge and Learning Routes with External Learner Models' },
      { label: 'Main result 1', value: 'composition preservation (thm:preservation)', note: 'PROOF, relative to assumptions such as local validity' },
      { label: 'Main result 2', value: 'bounded search (thm:search)', note: 'PROOF; the implementation covers only the listed fragment' },
      { label: 'Main result 3', value: 'condition saturation (thm:saturation)', note: 'PROOF; a failure case showing that unconstrained aggregation degenerates to the whole set' },
      { label: 'Representation boundary', value: 'information-preserving enhanced graph encoding (prop:encoding)', note: 'PROOF; it keeps the same results and does not manufacture an advantage by deleting comparative information' },
      { label: 'Running example', value: 'two formulations of the limit', note: 'prop:limit (PROOF); the prose proof and the partial machine certificate are kept apart' },
      { label: 'Reproduction material', value: 'Python standard-library script + input hash + run report', note: 'ancillary attachment; the environment is Python 3.14.7, and no claim is made about every intermediate version' },
      { label: 'Submission status', value: 'prepared locally, not submitted', note: 'suggested classification cs.AI, cross-list cs.LO to be decided' },
    ],
    evidence: 'From mcs-foundations/arxiv/ (main.tex, submission-metadata.txt, README.md) and publication/发布总纲.md §4.',
  },
  {
    id: 'limits',
    title: 'What is explicitly not claimed',
    lead: 'The results are interface integration, reviewable conditions and limited reproduction; not “the first knowledge network”, and not “improved learning efficiency”.',
    paragraphs: [
      'This section sits in the introduction rather than hidden in an appendix, because it decides how every earlier paragraph should be read.',
    ],
    bullets: [
      'No claim of unique graph expressiveness: the paper gives an information-preserving encoding, and on the same fragment typed action graphs, labelled bipartite graphs and MCS receive the same classification — that is “no worse”, not “stronger”.',
      'No claim of actual teaching benefit: no controlled experiment has been run and no learning outcome has been measured. Any statement that someone “learns faster” goes beyond the current evidence.',
      'No claim of complete machine certification: the general correctness of the Python proof checker, and machine certification of all mathematical cases, are open problems listed in the paper.',
      'No claim that the foreign-language literature has been read in full: the scope checked is recorded in anc/source-audit.json, and “I looked at the table of contents” is not written as “I read the whole text”.',
      'This site is a demonstration entry for the cases: it reports its own software version and test scope, carries no part of the paper’s proof, and does not require the reader to set up a service before understanding the monograph.',
    ],
    evidence: 'From publication/发布总纲.md §4 (“关于新颖性”) and §10 of the paper, Limits and research questions.',
  },
];

/** 站内规模表的标签（英文）。 */
export const INTRO_COUNT_LABELS_EN: Record<string, string> = {
  nodes: 'Registered nodes',
  actions: 'Action contracts',
  relations: 'Paired relations',
  evidence: 'Evidence records',
  support: 'Support entries',
  claims: 'Checkable claims',
  localizations: 'Localization schemes',
  templates: 'Note templates',
};

export const INTRO_ENTRIES_EN = [
  { to: '/nodes', label: 'Read by object: mathematical objects', note: '112 nodes, filterable by case, discipline and construct type' },
  { to: '/network', label: 'Read by structure: build a network', note: 'force-directed graph, relations weighted by hardness; right-click removes a node' },
  { to: '/plan', label: 'Read by route: learning routes', note: 'gives candidate routes together with the assumptions they use' },
  { to: '/lab', label: 'Read by evidence: research workbench', note: 'coverage list, localization operators and evidence replay; meant for checking' },
];

/** 数学学习方法论（英文）：条目顺序与 `METHOD_CORE` 一一对应。 */
export const METHOD_CORE_EN: MethodItem[] = [
  {
    id: 'endogenous',
    title: 'Wholly endogenous: rewrite it in your own words',
    gist: 'However much the material and your own thinking overlap, express it once in words you generated yourself.',
    how: [
      'Read a section of the textbook, close the book, write.',
      'When you get stuck, go back to the original for one word, close the book again, keep writing.',
      'Until you can walk through the passage on your own.',
    ],
    why: 'The brain takes the cheapest path by default. Reading a fine passage, you believe you have understood it — in fact someone else’s words merely flowed through your mind smoothly, without entangling deeply enough with your own neurons. Rewriting in your own words forces the brain to walk that path of thought again, this time with no original text paving the way.',
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md · 全然内源',
  },
  {
    id: 'evidence',
    title: 'Demand evidence',
    gist: 'Content needs concrete evidence; when a rigorous proof is not available yet, fall back to an example and label it as one.',
    how: [
      'For every key claim, write down what makes it hold.',
      'If you cannot prove it, find a concrete example or counterexample and state clearly that it is an example, not a proof.',
      'Tell apart “I really believe this” from “this merely sounds reasonable”.',
    ],
    why: '“It sounds reasonable” is a vague comfort; writing down concrete evidence submits that comfort to a physical test. Once you start putting evidence into your notes, much of what “felt right” collapses on its own.',
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md · 要有证据',
  },
  {
    id: 'condition-removal',
    title: 'What happens if this condition is deleted?',
    gist: 'Run a deletion experiment on every condition of the theorem and find the concrete counterexample that makes the conclusion collapse.',
    how: [
      'List all the conditions of the theorem.',
      'Delete them one at a time and find a concrete case where the conclusion fails.',
      'Write the counterexample down together with how the conclusion collapses, not just a bare formula.',
    ],
    why: 'This is an extremely cheap exploratory exercise: it needs no new proof, only a counterexample. The counterexample itself lodges the role of the condition in memory far better than ten repetitions of “the theorem requires smoothness, so smoothness is needed”, and it turns the condition from a burden to memorize into a guard rail that grew out of the counterexample.',
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md · 删掉某个条件会怎样；模板的「逐条件反例」一节',
  },
  {
    id: 'motivation',
    title: 'Tracing the motivation back',
    gist: 'For introductions that are not plain or natural enough, supply the natural motivation; for text that sprawls, supply the strategic foresight.',
    how: [
      'First ask: why must this object exist?',
      'Look for the motivation along three lines — inside the subject (where the theory gets stuck without it), external applications, and aesthetics and structure.',
      'Then look for its “embryo”: what the earliest rough form looked like, and how it walked step by step to today’s canonical form.',
    ],
    why: 'What is written on paper is condensed, and relative to what is in the mind it drops many natural and unnecessary thoughts. Many textbooks introduce concepts from the perspective of someone who already knows the way, so the reader finds it hard to feel the motivation — exactly the “blocks self-study” complaint. Balancing readability with long-range strategic thinking requires tolerance for both extremes.',
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md · 动机溯源；模板的 Motivation 一节',
  },
  {
    id: 'error-path',
    title: 'Keep the wrong turns',
    gist: 'Write down “I thought it was like this, but that is wrong, because …” — that is the map of your thinking.',
    how: [
      'Leave a wrong path in the notes, not only the correct answer.',
      'Write two things clearly: which habit was pulling you along, and which check revealed the error.',
      'Next time a similar algebraic setting appears, first check whether that habit has shown up again.',
    ],
    why: 'The correct final answer is only an answer; the wrong paths you took are the map of your thinking. Recording errors installs a reusable alarm — after noting the habit of “treating equivalence as equality and moving it about freely”, the author checks automatically whether the setting allows the substitution. Writing “I could not get there” honestly weighs more than pretending “I got there”: you have drawn the boundary of your understanding, and once the boundary is clear, the next step may push beyond it.',
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md · 保留试错途径以便对思维惯性自省',
  },
  {
    id: 'synthesis',
    title: 'Summarize, name, and work it over again',
    gist: 'Once enough samples have accumulated, step out of the concrete problems and distil what they share: first the idea, then the method.',
    how: [
      'Summarize the idea: what is the core line of advance for this kind of problem (amplification? a fixed point? contradiction?) — naming the idea leaves your future self a search tag.',
      'Summarize the method: distil reusable steps inside a specific theoretical framework.',
      'Four steps of reworking: condense (press it into one sentence), analogize (look for an isomorphism), deepen (ask why the conditions are these), and keep compressing (rewrite it in more economical words after some time).',
    ],
    why: 'Summarizing lowers the cost of carrying the information and helps it transfer, because compression makes the information cheaper to carry. A pile of integration techniques (substitution, integration by parts, rationalization), for example, share one plain idea: deform the integrand step by step into a form whose antiderivative is easy to find, where each step needs “equivalence” or a controllable error. That idea is lighter to carry than a hundred formulas, and transfers more easily to differential equations and to summing series.',
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md · 总结 / 对思想方法再加工',
  },
  {
    id: 'strategy',
    title: 'Build a strategy actively',
    gist: 'Write down how a whole class of problems is handled as a decision procedure, instead of starting from nothing each time.',
    how: [
      'Ask four questions: what features identify this class of problem? once identified, what should be tried first? is there a fallback? can the class itself be widened?',
      'Write the answers as an ordered decision tree; a flowchart is even better.',
    ],
    why: 'A strategy turns the panic of “I cannot do it” into an ordered decision process, and every place you get stuck becomes a chance to improve the strategy. Using indefinite integrals as the example, the author gives a complete procedure: first identify the structure of the integrand (rational function → partial fractions; radical → trigonometric substitution; product of two kinds of function → integration by parts, choosing u by “inverse, logarithmic, power, exponential, trigonometric”; trigonometric powers → split off an odd power for the differential, reduce an even power), and finally keep fallbacks (the universal substitution, tables, symbolic tools) while requiring the answer to be checked by differentiating by hand.',
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md · 积极构建策略',
  },
  {
    id: 'analogy',
    title: 'Analogy: concede first, then hold back',
    gist: 'An analogy helps condense and transfer, but it holds only at one small point — do not expand it into a whole scene.',
    how: [
      'Find the abstract core that is isomorphic between the two things and give it a name.',
      'Write down explicitly **where** the analogy stops holding.',
      'Before transferring, check: is what you are about to use exactly that core?',
    ],
    why: 'Analogy is close to how neurons behave: thinking of a concept wakes the neurons that carry its condensed meaning, which naturally brings up other closely connected concepts. The author’s example: Lenz’s law (physics), Le Chatelier’s principle (chemistry) and homeostasis (biology) all express negative feedback of a system against perturbation, and after the analogy they are condensed into a more abstract theme. But overuse turns analogy into formalism — the section 《类比中的让步》 in the source is still to be written, so this page includes only the parts already written out.',
    source: 'MCS_vault/MCS/methodology/认知发展笔记.md · 类比 / 类比不能滥用',
  },
];

/** 笔记模板骨架（英文），顺序与 `METHOD_TEMPLATE_SKELETON` 一致。 */
export const METHOD_TEMPLATE_SKELETON_EN = [
  { title: 'Prerequisites in three tiers', detail: 'required (just enough) / supporting (easier to understand) / extended (stronger links to other branches)' },
  { title: 'Motivation in two parts', detail: 'why it must exist (three lines: internal, external application, aesthetic structure) → how it grew from the embryo into today’s form' },
  { title: 'Seven questions in the formal part', detail: 'general form, condition-by-condition counterexamples, equivalent expressions, formal category, natural-language statement, lower-dimensional rendering, higher viewpoint, links to similar objects' },
  { title: 'The proof overview comes first', detail: 'first overlook the whole proof in one sentence, then refine step by step — global before local is also the more comfortable reading rhythm' },
  { title: 'Applications split into direct and indirect', detail: 'a direct application should highlight how the new tool eases an old pain; an indirect one only needs to make the reader feel “this is genuinely useful”' },
  { title: 'Three questions on generalization', detail: 'which conditions can be weakened? which conclusions can be generalized? which important open problems are strongly related?' },
  { title: 'Common misconceptions and personal insights', detail: 'list the classic misconceptions, explain why they happen and which condition the learner may have missed; the insights section encourages recording real fluctuations of thought' },
  { title: 'Summary and questions to revisit', detail: 'condense the idea into one or two sentences; list the concrete techniques and note where in the notes each is used; end with questions to come back to' },
];

/** 本页没有收录什么（英文）。 */
export const METHOD_NOT_INCLUDED_EN = [
  'The three files 《构造反例的方法》, 《内省》 and 《直觉的建立与失效》 are still 0 bytes in the production directory: the three entries in the method library (constructing counterexamples / introspection / how intuition is built and lost) are the site’s own compilation, not a rendering of those three documents — each of their source lines says so explicitly.',
  'In 《认知发展笔记》, the sections 《类比中的让步》 and 《为什么要这样做？》 are still empty headings (only the two questions “what is the benefit of doing so / what is the harm of not doing so”), and this page does not write them on their behalf.',
  'Five entries in the method library have no corresponding document in the vault (entering from a special case, finding invariants, working backwards, not appealing to “obvious” too readily, an application at the next stage ≠ the specific link at this stage); their source is written throughout as “the site’s own compilation”.',
  'This page is compiled from the existing text in MCS_vault/MCS/methodology/ and MCS_vault/MCS/template/, without altering the original; the originals exist in both Chinese and English, and the Chinese version is taken as authoritative here.',
];

/** 成对的内容：页面用 `useI18n().pick(XXX_BY_LOCALE)` 取。 */
export const SITE_INTRO_SECTIONS_BY_LOCALE: { zh: IntroSection[]; en: IntroSection[] } = {
  zh: SITE_INTRO_SECTIONS,
  en: SITE_INTRO_SECTIONS_EN,
};

export const INTRO_COUNT_LABELS_BY_LOCALE: { zh: Record<string, string>; en: Record<string, string> } = {
  zh: INTRO_COUNT_LABELS,
  en: INTRO_COUNT_LABELS_EN,
};

export const INTRO_ENTRIES_BY_LOCALE: { zh: typeof INTRO_ENTRIES; en: typeof INTRO_ENTRIES_EN } = {
  zh: INTRO_ENTRIES,
  en: INTRO_ENTRIES_EN,
};

export const METHOD_CORE_BY_LOCALE: { zh: MethodItem[]; en: MethodItem[] } = {
  zh: METHOD_CORE,
  en: METHOD_CORE_EN,
};

export const METHOD_TEMPLATE_SKELETON_BY_LOCALE: { zh: typeof METHOD_TEMPLATE_SKELETON; en: typeof METHOD_TEMPLATE_SKELETON_EN } = {
  zh: METHOD_TEMPLATE_SKELETON,
  en: METHOD_TEMPLATE_SKELETON_EN,
};

export const METHOD_NOT_INCLUDED_BY_LOCALE: { zh: string[]; en: string[] } = {
  zh: METHOD_NOT_INCLUDED,
  en: METHOD_NOT_INCLUDED_EN,
};
