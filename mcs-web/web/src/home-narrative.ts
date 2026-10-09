/**
 * 首页六幕叙事的文案与图形语义。
 *
 * 文案放在这里而不是写死在组件里：六幕的信息边界是本页最重要的设计约束，
 * 集中保存后可以逐幕核对，也避免以后改一句话时误伤别的幕。
 *
 * 阅读顺序：**主题 → 现状 → 路径 → 方法 → 体验 → 愿景**。
 * 第一幕「主题」是开场点题（本站是什么、按哪三条主线做事），只陈述设计意图与当前形态，
 * 不声称任何教学效果；第二幕「现状」是对当下学习方式的观察与判断（作者的诊断），
 * 不是实证研究结论；其后四幕逐条回应它提出的问题。两处边界分别由各幕的
 * `boundary` 字段显式写在幕内。
 *
 * 这里的「方法论」指帮助人理解具体数学内容的教学技巧与组织方式，
 * 不等同于本体里的 Method 节点类型，也不评价任何一本教材。
 */

import type { Locale } from './i18n/locales';

export type HomeNarrativeScene = 'theme' | 'pain' | 'path' | 'methods' | 'human' | 'infrastructure';

/** 幕内的条目：图标 + 短名 + 一句说明，整幕在固定舞台里不许溢出。 */
export interface HomeNarrativePoint {
  id: string;
  /** 图标语义，对应 `HomeNarrative.tsx` 里的一组内联线描图。 */
  icon: string;
  /** 配色档：品牌紫、青、琥珀、橙、青绿、蓝，用于图标底色与描边。 */
  tone: 'accent' | 'cyan' | 'amber' | 'ember' | 'teal' | 'blue';
  label: string;
  detail: string;
}

export interface HomeNarrativeAct {
  id: string;
  number: string;
  kicker: string;
  title: string;
  paragraphs: string[];
  scene: HomeNarrativeScene;
  sceneLabel: string;
  /**
   * 四周带里的标签（2026-10 加，TODO A3-19）。
   *
   * 为什么单独列一份而不是继续用场景自带的 SVG 文字：场景是固定画布的插图，
   * 它的文字位置在 1440 下选出来，换到 1240 / 1280 就有一部分落进正文列（实测：
   * 「体验」幕 3 条压正文、3 条被屏幕切掉）。这四个字一组的关键词由**带宽**定位——
   * 带宽由「舞台宽 − 正文列宽」算出来，因此任何宽度下都不会进正文列，
   * 每幕也就能保证 3–5 条清晰可见的动画文字。
   *
   * 取值只用本幕自己说过的话（`paragraphs` / `points`），不引入新主张：
   * 它们是这一幕的关键词，不是结论。
   */
  sceneLabels: string[];
  /** 可选：幕内的条目清单（「主题」幕的三条主线与「现状」幕的六条现状使用）。 */
  points?: HomeNarrativePoint[];
  /**
   * 可选：这一幕在**四周带**里用的图记，代替默认的「编号 + 幕名」大字词（2026-10-04 加）。
   *
   * 目前只有「主题」幕用：那一幕是开场点题，带里放站点字标比放「01 主题」更像封面。
   * 幕名与编号**没有丢**——报头的幕导航、正文上方的 kicker、以及 `aria-label` 都写着；
   * 这块视觉舞台本身是 `aria-hidden` 的装饰，所以 `alt` 一律为空。
   * 显示尺寸由带宽在 CSS 里反推（而且要保证**实心那一段**不进正文列，见 styles.css 的
   * `--mark-solid`），宽高只用于占位。`src` 是 `web/public/` 下的路径。
   */
  bandMark?: { src: string; width: number; height: number };
  /**
   * 可选：这一幕在舞台**左上角**的角标（2026-10-04 加）。
   *
   * 目前只有「主题」幕用：紫色徽记从带里挪到左上角当封面记号，带里那一格让给站点字标。
   * 同样是 `aria-hidden` 装饰、`alt` 为空；尺寸与位置由 CSS 按带宽/视口高给定。
   */
  cornerMark?: { src: string; width: number; height: number };
  /** 可选：本幕的证据边界；凡涉及「目标 / 判断」的幕都要写。 */
  boundary?: string;
}

export interface HomeNarrativeAction {
  label: string;
  to: string;
  primary?: boolean;
  ghost?: boolean;
}

export const HOME_NARRATIVE_ACTS: HomeNarrativeAct[] = [
  {
    id: 'theme',
    number: '01',
    kicker: '主题',
    title: '数学知识连成网络，学习沿着思路展开。',
    paragraphs: [
      'MCS 是一个把数学知识组织成网络的学习空间：每个数学对象独立成节，节点之间按前置与认知关系相连，方法、直觉与反例挂在具体对象上。学习顺序因此不必由某一本教材单独决定——从你已经理解的地方出发，沿一条说得清理由的路径，走到自己想弄懂的问题。',
    ],
    points: [
      { id: 'nodes', icon: 'node', tone: 'accent', label: '知识节点化', detail: '每个数学对象独立成节，概念、定理与方法各归其位。' },
      { id: 'network', icon: 'network', tone: 'cyan', label: '关系网络化', detail: '节点按前置与认知成本相连，依赖排成有向无环图。' },
      { id: 'notes', icon: 'notebook', tone: 'ember', label: '笔记人性化', detail: '先讲清为什么需要，再给定义；条件配反例，保留试错。' },
    ],
    scene: 'theme',
    sceneLabel: '一个从单个数学对象长出来的知识网络，以及一条从已理解处出发、通向问题目标的路径',
    /*
     * 取本幕自己说过的话：三条主线的名字 + 正文里的「从你已经理解的地方出发」。
     * 它们是这一幕的关键词，不是结论。
     */
    sceneLabels: ['知识节点化', '关系网络化', '笔记人性化', '从理解处出发'],
    /*
     * 两处图记（2026-10-04 加，按用户要求）：
     * - **左上角**放紫色徽记（v6 徽记的 256px 导出，与 favicon / 应用图标同一个文件）；
     * - **右侧带内**放站点字标（彩虹 MCS 一笔字，与侧栏品牌同一个文件），
     *   尺寸比原来那枚徽记大，左端用遮罩渐隐、「往中间靠」。
     * 两份都用 256 的导出而不是 1.4MB 的 `logo.png`：显示尺寸只有一两百像素。
     */
    cornerMark: { src: '/logo-256.png', width: 256, height: 256 },
    bandMark: { src: '/wordmark-256.png', width: 256, height: 79 },
    boundary: '以上是本站的设计意图与当前形态，不是教学效果的实证结论。',
  },
  {
    id: 'pain',
    number: '02',
    kicker: '现状',
    title: '从头到尾跟着一本教材走。',
    paragraphs: [
      '这是当前最普遍的学习方式：挑一本主流教材，从第一章读到最后，按它的顺序推进。它有效，也留下了几处长期没有被处理的问题：同一个学科的内容被反复组织；想尽早弄懂的知识点被排在后面，换一本讲得早的书，前置又常常一带而过；教材也不清楚你已经会了什么。',
    ],
    points: [
      { id: 'overlap', icon: 'stack', tone: 'accent', label: '内容重合', detail: '同一学科教材高度重合，去掉重复部分后新增不多。' },
      { id: 'fixed-path', icon: 'sequence', tone: 'cyan', label: '路径既定', detail: '知识顺序由教材决定，想先弄懂的内容常在后半段。' },
      { id: 'prereq', icon: 'mismatch', tone: 'amber', label: '前置未对齐', detail: '教材不知道你已经会了什么，只有粗略的画像。' },
      { id: 'methods', icon: 'scatter', tone: 'ember', label: '方法分散', detail: '好讲法散落在不同教材、不同章节，难以一次集齐。' },
      { id: 'labor', icon: 'duplicate', tone: 'teal', label: '重复劳动', detail: '重写一门已有课程，大部分是把知识点再组织一遍。' },
      { id: 'gap', icon: 'search', tone: 'blue', label: '信息差', detail: '搜寻与甄别材料耗时，起点常由外部条件决定。' },
    ],
    scene: 'pain',
    sceneLabel: '三本教材的章节高度重合；知识点固定在既定顺序中；学习者的已有知识与教材假设的前置互不重合',
    // 取「现状」幕自己列出的六条里的四条：它们在正文里逐个展开，标签只做提示。
    sceneLabels: ['内容重合', '路径既定', '前置未对齐', '方法分散'],
    boundary: '以上是作者对现状的观察与判断，不是实证研究结论；本站没有测量过教学收益。',
  },
  {
    id: 'path',
    number: '03',
    kicker: '路径',
    title: '教材的顺序，未必是你的学习顺序。',
    paragraphs: [
      '现代数学学习，通常沿着教材展开。章节如何排列、概念何时引入、理论怎样逐层铺垫，往往在翻开书之前就已确定。一本接着一本，一门接着一门，教材体系层层堆叠，学习规划也随之固定。',
      '但每个人已有的知识、想解决的问题和希望抵达的目标，都不相同。教材不知道你已经会了什么，这个判断只能由你自己给出——你会什么、还不会什么由你声明，而不是由材料替你假设。如果从你已经理解的地方出发，围绕你真正关心的问题，在必要的数学前置关系之上重新组织，学习可以有怎样的路径？',
    ],
    scene: 'path',
    sceneLabel: '多本教材首尾衔接，章节沿既定顺序排列；个人位置与学习目标分布在不同位置',
    // 关键词来自本幕正文：教材顺序（既定）、你会什么（自己声明）、从理解处出发、围绕问题重组。
    sceneLabels: ['教材既定顺序', '你会什么由你声明', '从理解处出发', '围绕问题重组'],
  },
  {
    id: 'methods',
    number: '04',
    kicker: '方法',
    title: '让散落的教学智慧，在每个知识点相遇。',
    paragraphs: [
      '同一个学科，这本教材可能把某一章的动机讲得透彻，那本教材可能在另一章给出绝妙的直觉、反例或证明思路。这些帮助人理解数学的技术与技巧，我们统称为“方法论”。',
      '它们丰富，却分散；学习者很难在一次学习中，集齐每个具体内容上那些出色的教学方法。MCS 希望围绕每个数学对象，汇集不同材料中的好讲法，保留来源、条件与各自的长处，让你在学习它时，就能更充分地接上人类为理解它已经积累的智慧。',
    ],
    scene: 'methods',
    sceneLabel: '不同教材的不同章节亮起动机、直觉、反例与证明思路，并汇集到同一个数学对象周围',
    // 关键词来自本幕正文：好讲法分散、一次学习里集齐、围绕对象汇集、保留来源与条件。
    sceneLabels: ['好讲法分散', '一次集齐', '围绕对象汇集', '保留来源与条件'],
  },
  {
    id: 'human',
    number: '05',
    kicker: '体验',
    title: '让理解，顺着人的思维生长。',
    paragraphs: [
      '先知道为什么需要一个概念，再看它如何从朴素想法长成严谨定义；先看清证明的整体思路，再进入细节；面对定理的条件，试着问一句“删掉它会怎样”，让反例解释条件的作用。',
      '必备知识刚好够用，辅助与拓展按需展开；相似对象彼此联动，常见误解说明缘由。也为“我当时以为……”的试错、自己的启发和日后的回看留出位置。MCS 将这些设计融入笔记与学习流程，让好奇、困惑和发现都能成为理解的起点。',
    ],
    scene: 'human',
    sceneLabel: '学习结构从为什么需要、朴素想法展开到规范形式，并连接证明总览、细节、条件、反例与辅助知识',
    // 关键词来自本幕正文的「为什么需要 → 朴素想法 → 严谨定义」与「删掉条件会怎样」。
    sceneLabels: ['动机先于形式', '总览再细节', '条件即反例', '按需展开'],
  },
  {
    id: 'infrastructure',
    number: '06',
    kicker: '愿景',
    title: '新时代的数学教育基础设施。',
    paragraphs: [
      '让知识按对象连接，让优秀的教学方法持续汇集，让学习路径围绕具体的人和问题展开。这是 MCS 正在推进的工作。',
      '我们希望，将人类积累的数学教学智慧建设为学习者、教师与智能工具能够共同使用、持续完善的公共基础。每个人都可以从自己的起点进入，选择适合的理解方式，留下新的思路与发现。',
      '重写一门已有课程的教材，大部分工作是把既有的知识点重新组织一遍。把这种重复的组织沉淀为可复用、可检索的结构，教材与教师才可以把力气留给真正独有的部分：以自己的方式讲述一条学习路径。',
      '资源分布的差异，最先消耗的是搜寻与甄别的时间。公开、可检索、能从自己的起点进入，是缩小这种差距的一条实际路径。',
      '让一次学习，更充分地受益于已有的智慧；让每一份新的理解，成为后来者继续出发的起点。',
    ],
    scene: 'infrastructure',
    sceneLabel: '多个知识节点形成公共知识空间，紫色与青色两条学习路线通往同一目标',
    // 关键词来自本幕正文：按对象连接、方法持续汇集、路径围绕人与问题、公共基础可复用。
    sceneLabels: ['知识按对象连接', '方法持续汇集', '路径因人而异', '可复用可检索'],
    boundary: '以上是正在推进的目标，不是已完成的成果；本站不声称已经提升学习效率。',
  },
];

/**
 * 末幕入口。
 *
 * 首页只负责讲为什么，入口都在「开始学习」页（`/start`）：
 * 第一项就是那一页，其余沿用站内既有路由，不新增页面。
 */
export const HOME_NARRATIVE_FINAL_ACTIONS: HomeNarrativeAction[] = [
  { label: '开始学习', to: '/start', primary: true },
  { label: '打开学习路线', to: '/plan' },
  { label: '了解学习方法论', to: '/method' },
  { label: '这个网站是什么', to: '/intro', ghost: true },
];

/* ======================================================================
 * 英文文案（2026-10 中英双语，task-8 / task-10）
 *
 * 中文那份是**源语言**，上面的 `HOME_NARRATIVE_ACTS` 与
 * `HOME_NARRATIVE_FINAL_ACTIONS` 逐字不动，测试逐字对它们。
 * 这里新增的是同一份叙事的英文版，逐字上严格与中文一一对应：
 * - 幕的 `id` / `number` / `scene` / `icon` / `tone` 属于结构，两版必须相同；
 * - 只翻正文、标题、幕名、四周带关键词、条目名与说明、证据边界。
 *
 * 边界声明照中文原样还给读者（「不是实证结论」「不声称已经提升学习效率」），
 * 不因为换成英文就说得更满。
 * ==================================================================== */

/** 英文六幕：与中文版同 id、同幕数、同图形语义，只换文字。 */
export const HOME_NARRATIVE_ACTS_EN: HomeNarrativeAct[] = [
  {
    id: 'theme',
    number: '01',
    kicker: 'Theme',
    title: 'Mathematical knowledge forms a network; learning unfolds along a line of thought.',
    paragraphs: [
      'MCS is a learning space that organises mathematical knowledge as a network: every mathematical object has a section of its own, nodes are linked by prerequisite and cognitive relations, and methods, intuitions and counterexamples hang on the specific objects they belong to. The order of study therefore need not be decided by one textbook alone — start from what you already understand, follow a path whose reasons can be stated, and arrive at the question you want to make sense of.',
    ],
    points: [
      { id: 'nodes', icon: 'node', tone: 'accent', label: 'Knowledge as nodes', detail: 'Every mathematical object has its own section; concepts, theorems and methods each have their place.' },
      { id: 'network', icon: 'network', tone: 'cyan', label: 'Relations as a network', detail: 'Nodes are linked by prerequisite and cognitive cost; dependencies form a directed acyclic graph.' },
      { id: 'notes', icon: 'notebook', tone: 'ember', label: 'Notes written for humans', detail: 'Why it is needed comes before the definition; conditions come with counterexamples, and false starts are kept.' },
    ],
    scene: 'theme',
    sceneLabel: 'A knowledge network growing out of a single mathematical object, and a route that starts from what is already understood and leads to the goal of one’s question',
    sceneLabels: ['Knowledge as nodes', 'Relations as a network', 'Notes for humans', 'Start from what you understand'],
    cornerMark: { src: '/logo-256.png', width: 256, height: 256 },
    bandMark: { src: '/wordmark-256.png', width: 256, height: 79 },
    boundary: 'The above states this site’s design intent and its current shape; it is not an empirical conclusion about teaching effectiveness.',
  },
  {
    id: 'pain',
    number: '02',
    kicker: 'The status quo',
    title: 'Following one textbook from cover to cover.',
    paragraphs: [
      'This is the most common way to study today: pick a mainstream textbook, read from the first chapter to the last, and advance in its order. It works, and it leaves several problems that have gone unaddressed for a long time: the same subject matter is organised again and again; the point you want to understand early is placed late, and if you switch to a book that introduces it earlier, its prerequisites are often passed over; and the textbook does not know what you already know.',
    ],
    points: [
      { id: 'overlap', icon: 'stack', tone: 'accent', label: 'Overlapping content', detail: 'Textbooks in the same subject overlap heavily; once the repeats are removed, little is genuinely new.' },
      { id: 'fixed-path', icon: 'sequence', tone: 'cyan', label: 'A preset path', detail: 'The textbook decides the order of knowledge; what you want to understand first often sits in the second half.' },
      { id: 'prereq', icon: 'mismatch', tone: 'amber', label: 'Prerequisites unaligned', detail: 'The textbook does not know what you already know; it has only a rough picture.' },
      { id: 'methods', icon: 'scatter', tone: 'ember', label: 'Methods scattered', detail: 'Good explanations lie in different textbooks and different chapters, hard to gather in one pass.' },
      { id: 'labor', icon: 'duplicate', tone: 'teal', label: 'Duplicated effort', detail: 'Rewriting an existing course is mostly reorganising the same knowledge points once more.' },
      { id: 'gap', icon: 'search', tone: 'blue', label: 'Information gap', detail: 'Finding and vetting material takes time, and where you start is often set by outside circumstances.' },
    ],
    scene: 'pain',
    sceneLabel: 'Three textbooks whose chapters overlap heavily; knowledge points fixed in a preset order; what the learner already knows and the prerequisites the textbook assumes do not coincide',
    sceneLabels: ['Overlapping content', 'A preset path', 'Prerequisites unaligned', 'Methods scattered'],
    boundary: 'The above is the author’s observation and judgement about the status quo, not an empirical research finding; this site has not measured any teaching benefit.',
  },
  {
    id: 'path',
    number: '03',
    kicker: 'Path',
    title: 'The order of a textbook is not necessarily your order of study.',
    paragraphs: [
      'Studying modern mathematics usually unfolds along textbooks. How the chapters are arranged, when a concept is introduced, how the theory is layered — all of this is settled before you open the book. One book after another, one subject after another; textbook systems pile up layer upon layer, and the study plan hardens with them.',
      'But each person’s existing knowledge, the problems they want to solve and the goals they hope to reach all differ. A textbook does not know what you already know; that judgement can only come from you — you declare what you know and what you do not, rather than letting the material assume it for you. If study began from what you already understand, was organised around the question you actually care about, and was rebuilt on top of the prerequisite relations mathematics genuinely requires — what paths could learning take?',
    ],
    scene: 'path',
    sceneLabel: 'Several textbooks joined end to end, chapters laid out in a preset order; personal positions and learning goals sit in different places',
    sceneLabels: ['Textbook order, preset', 'You declare what you know', 'Start from what you understand', 'Reorganise around the question'],
  },
  {
    id: 'methods',
    number: '04',
    kicker: 'Methods',
    title: 'Let scattered teaching wisdom meet at every knowledge point.',
    paragraphs: [
      'In one subject, this textbook may explain the motivation of a chapter thoroughly, while another may offer a superb intuition, counterexample or proof idea in a different chapter. We call these techniques and devices that help people understand mathematics “methodology”.',
      'They are rich, yet scattered; in a single course of study a learner can hardly gather all the excellent ways of teaching each specific piece of content. MCS aims to gather, around each mathematical object, the good explanations found in different materials — keeping their sources, their conditions and their respective strengths — so that when you study it you can connect more fully with the wisdom humanity has already accumulated for understanding it.',
    ],
    scene: 'methods',
    sceneLabel: 'Different chapters of different textbooks light up with motivation, intuition, counterexamples and proof ideas, and converge around one mathematical object',
    sceneLabels: ['Good explanations scattered', 'Gathered in one pass', 'Converging on the object', 'Sources and conditions kept'],
  },
  {
    id: 'human',
    number: '05',
    kicker: 'Experience',
    title: 'Let understanding grow along human thought.',
    paragraphs: [
      'First see why a concept is needed, then watch it grow from a plain idea into a rigorous definition; first see the overall shape of a proof, then enter the details; facing the conditions of a theorem, ask “what if we delete it?”, and let a counterexample explain what the condition does.',
      'The essentials are just enough, while supporting and extended material unfolds on demand; similar objects are linked to one another, and common misconceptions come with their reasons. There is also room for the false starts of “I thought it was …”, for your own insights, and for looking back later. MCS builds these choices into its notes and study flow, so that curiosity, confusion and discovery can all become starting points for understanding.',
    ],
    scene: 'human',
    sceneLabel: 'The study structure unfolds from why it is needed and the plain idea to the canonical form, and connects the proof overview, the details, the conditions, the counterexamples and the supporting knowledge',
    sceneLabels: ['Motivation before form', 'Overview, then detail', 'Conditions as counterexamples', 'Unfold on demand'],
  },
  {
    id: 'infrastructure',
    number: '06',
    kicker: 'Vision',
    title: 'Mathematical education infrastructure for a new era.',
    paragraphs: [
      'Connecting knowledge object by object, letting excellent teaching methods keep gathering, and letting learning paths unfold around specific people and their questions. This is the work MCS is pursuing.',
      'Our hope is to build the mathematical teaching wisdom humanity has accumulated into a public foundation that learners, teachers and intelligent tools can use together and keep improving. Everyone can enter from their own starting point, choose the way of understanding that suits them, and leave behind new ideas and findings.',
      'Rewriting a textbook for an existing course is largely a matter of reorganising knowledge points that already exist. Once that repeated organisation settles into a reusable, searchable structure, textbooks and teachers can spend their efforts on what is genuinely theirs alone: telling a learning path in their own way.',
      'Where resources are unevenly distributed, the first thing consumed is the time spent searching and vetting. Making them public, searchable and enterable from one’s own starting point is one practical way to narrow that gap.',
      'Let one course of study benefit more fully from wisdom already accumulated; let every new piece of understanding become a starting point for those who come later.',
    ],
    scene: 'infrastructure',
    sceneLabel: 'Many knowledge nodes form a public knowledge space; a purple and a cyan learning route lead to the same goal',
    sceneLabels: ['Knowledge linked by object', 'Methods keep gathering', 'Paths differ by person', 'Reusable and searchable'],
    boundary: 'The above are goals being pursued, not finished results; this site does not claim to have improved learning efficiency.',
  },
];

/** 英文末幕入口：`to` 与中文版逐字相同（站内相对路径，前缀由路由负责）。 */
export const HOME_NARRATIVE_FINAL_ACTIONS_EN: HomeNarrativeAction[] = [
  { label: 'Start learning', to: '/start', primary: true },
  { label: 'Open the learning route', to: '/plan' },
  { label: 'About the methodology', to: '/method' },
  { label: 'What is this site', to: '/intro', ghost: true },
];

/** 成对的两份叙事：页面用 `useI18n().pick(HOME_NARRATIVE_BY_LOCALE)` 取。 */
export const HOME_NARRATIVE_BY_LOCALE: { zh: HomeNarrativeAct[]; en: HomeNarrativeAct[] } = {
  zh: HOME_NARRATIVE_ACTS,
  en: HOME_NARRATIVE_ACTS_EN,
};

export const HOME_NARRATIVE_FINAL_ACTIONS_BY_LOCALE: { zh: HomeNarrativeAction[]; en: HomeNarrativeAction[] } = {
  zh: HOME_NARRATIVE_FINAL_ACTIONS,
  en: HOME_NARRATIVE_FINAL_ACTIONS_EN,
};

/**
 * 幕内 SVG 场景自带的文字。
 *
 * 这些文字画在 `aria-hidden` 的装饰舞台里，但**眼睛看得见**——英文站上留中文
 * 就是没翻完。它们与幕正文分开列，因为定位方式不同：正文进阅读列，场景文字只在四周带上出现。
 */
export interface HomeNarrativeSceneText {
  themeKicker: string;
  themeTitle: string;
  object: string;
  understood: string;
  goalTitle: string;
  /** 「你的问题」：主题幕的目标注解与愿景幕的路线起点用的是同一句话。 */
  yourQuestion: string;

  painKicker: string;
  painTitle: string;
  overlapCardTitle: string;
  overlapCardLine: string;
  overlapCardNote: string;
  knownMarker: string;
  assumedMarker: string;
  noOverlap: string;
  wantedFirst: string;
  presetOrder: string;
  painBottomNote: string;

  pathKicker: string;
  pathTitle: string;
  /** 书本序号：`{n}` 由组件替换（中英词序不同）。 */
  bookLabel: string;
  pathMarkers: [string, string, string];
  pathBottomNote: string;

  methodsKicker: string;
  methodsTitle: string;
  bookNames: [string, string, string];
  highlights: [string, string, string, string];
  meetHere: string;
  methodsBottomNote: string;

  humanKicker: string;
  humanTitle: string;
  chain: [string, string, string];
  proofCard: string;
  overview: string;
  details: string;
  conditionCard: string;
  deleteIt: string;
  keyCounterexample: string;
  collapseNote: string;
  supportCard: string;
  supportNote: string;
  trialNote: string;

  infraKicker: string;
  infraTitle: string;
  anotherEntry: string;
  sharedGoal: string;
  manyPaths: string;
  infraBottomNote: string;
}

export const HOME_NARRATIVE_SCENE_TEXT: { zh: HomeNarrativeSceneText; en: HomeNarrativeSceneText } = {
  zh: {
    themeKicker: '主题',
    themeTitle: '从一到网络：知识 · 关系 · 路径',
    object: '数学对象',
    understood: '已经理解',
    goalTitle: '想弄懂',
    yourQuestion: '你的问题',

    painKicker: '现状',
    painTitle: '三本教材，同一份章节',
    overlapCardTitle: '重合的章节',
    overlapCardLine: '三本各写一遍',
    overlapCardNote: '真正新增的并不多',
    knownMarker: '已经会了',
    assumedMarker: '教材假设的前置',
    noOverlap: '不重合',
    wantedFirst: '想先弄懂',
    presetOrder: '既定章节顺序',
    painBottomNote: '内容重合、顺序既定、前置不问',

    pathKicker: '教材路径既定',
    pathTitle: '章节沿着一条顺序展开',
    bookLabel: '第 {n} 本',
    pathMarkers: ['已经理解', '当前问题', '学习目标'],
    pathBottomNote: '你的位置与目标，不必落在同一条直线上',

    methodsKicker: '方法分散，再汇集',
    methodsTitle: '好讲法在不同教材的不同位置',
    bookNames: ['教材 A', '教材 B', '教材 C'],
    highlights: ['自然动机', '直觉图景', '关键反例', '证明思路'],
    meetHere: '好讲法在此相遇',
    methodsBottomNote: '保留来源、条件与各自的长处',

    humanKicker: '人性化设计',
    humanTitle: '顺着人的思维，而不是只顺着目录',
    chain: ['为什么需要', '朴素想法', '规范形式'],
    proofCard: '证明',
    overview: '总览',
    details: '细节',
    conditionCard: '条件',
    deleteIt: '删掉会怎样',
    keyCounterexample: '关键反例',
    collapseNote: '解释结论怎么塌',
    supportCard: '辅助知识 · 拓展视角',
    supportNote: '刚好够用，按需展开',
    trialNote: '试错记录 · 个人启发 · 日后回看',

    infraKicker: '公共基础',
    infraTitle: '让知识、方法与路线可以一起生长',
    anotherEntry: '另一种入口',
    sharedGoal: '共同目标',
    manyPaths: '多条路径',
    infraBottomNote: '让每一份新的理解，成为后来者的起点',
  },
  en: {
    themeKicker: 'Theme',
    themeTitle: 'From one to a network: knowledge · relations · paths',
    object: 'Mathematical object',
    understood: 'Already understood',
    goalTitle: 'Want to understand',
    yourQuestion: 'your question',

    painKicker: 'The status quo',
    painTitle: 'Three textbooks, one set of chapters',
    overlapCardTitle: 'Overlapping chapters',
    overlapCardLine: 'Written out three times',
    overlapCardNote: 'Little is genuinely new',
    knownMarker: 'Already known',
    assumedMarker: 'Prerequisites the book assumes',
    noOverlap: 'No overlap',
    wantedFirst: 'Wanted first',
    presetOrder: 'Preset chapter order',
    painBottomNote: 'Overlapping content, preset order, prerequisites never asked',

    pathKicker: 'The textbook path is preset',
    pathTitle: 'Chapters unfold in a single order',
    bookLabel: 'Book {n}',
    pathMarkers: ['Already understood', 'Current question', 'Learning goal'],
    pathBottomNote: 'Your position and your goal need not lie on the same straight line',

    methodsKicker: 'Methods scattered, then gathered',
    methodsTitle: 'Good explanations sit in different places in different books',
    bookNames: ['Textbook A', 'Textbook B', 'Textbook C'],
    highlights: ['Natural motivation', 'Intuitive picture', 'Key counterexample', 'Proof idea'],
    meetHere: 'Good explanations meet here',
    methodsBottomNote: 'Sources, conditions and respective strengths kept',

    humanKicker: 'Human-centred design',
    humanTitle: 'Along human thought, not just along the table of contents',
    chain: ['Why it is needed', 'Plain idea', 'Canonical form'],
    proofCard: 'Proof',
    overview: 'Overview',
    details: 'Details',
    conditionCard: 'Conditions',
    deleteIt: 'What if deleted',
    keyCounterexample: 'Key counterexample',
    collapseNote: 'Explains how the result collapses',
    supportCard: 'Supporting knowledge · wider views',
    supportNote: 'Just enough, unfolded on demand',
    trialNote: 'False starts · personal insights · later review',

    infraKicker: 'A public foundation',
    infraTitle: 'Let knowledge, methods and routes grow together',
    anotherEntry: 'Another entry point',
    sharedGoal: 'Shared goal',
    manyPaths: 'Many routes',
    infraBottomNote: 'Let every new understanding become a starting point for those who come later',
  },
};

/**
 * 组件壳层文案（报头、页脚、幕内提示与署名）。
 *
 * 与 `messages.ts` 的分工：这些句子只服务首页六幕这一处版式，放通用文案表会把它撑大；
 * 而它们又必须随语种切，所以成对写在这里。
 */
export interface HomeNarrativeChromeText {
  brandName: string;
  tagline: string;
  skip: string;
  progressAria: string;
  visualNote: string;
  scenePrefix: string;
  cuePlay: string;
  cueNext: string;
  cueEnd: string;
  footFlow: string;
  footStage: string;
  footInAll: string;
  footNote: string;
  footMotto: string;
  bylineAuthor: string;
  bylineContact: string;
}

export const HOME_NARRATIVE_CHROME: { zh: HomeNarrativeChromeText; en: HomeNarrativeChromeText } = {
  zh: {
    brandName: '数学认知空间',
    tagline: '让数学沿着思路展开',
    skip: '直接进入学习',
    progressAria: '首页叙事进度',
    visualNote: '教学组织示意 · 非真实学习记录',
    scenePrefix: '画面：',
    cuePlay: '滚动展开本幕',
    cueNext: '继续滚动进入下一幕',
    cueEnd: '从这里开始探索',
    footFlow: '向下阅读',
    footStage: '滚轮先播放本幕动画，再滚到下一幕 · 共',
    footInAll: '',
    footNote: '浮现动画每幕只播一次（往回滚不会重播）',
    footMotto: '知识 · 方法 · 路径',
    bylineAuthor: '作者',
    bylineContact: '联系邮箱',
  },
  en: {
    brandName: 'Mathematical Cognitive Space',
    tagline: 'Let mathematics unfold along your line of thought',
    skip: 'Go straight to learning',
    progressAria: 'Home narrative progress',
    visualNote: 'A schematic of teaching organisation · not a real learning record',
    scenePrefix: 'Scene: ',
    cuePlay: 'Scroll to unfold this act',
    cueNext: 'Keep scrolling into the next act',
    cueEnd: 'Start exploring from here',
    footFlow: 'Read down through ',
    footStage: 'The wheel plays this act first, then rolls on to the next · ',
    footInAll: ' in all',
    footNote: 'The emerge animation plays once per act (scrolling back does not replay it)',
    footMotto: 'Knowledge · Methods · Paths',
    bylineAuthor: 'Author',
    bylineContact: 'Contact',
  },
};

/** 幕数的写法：中文「六幕」、英文「six acts」；幕数变了不用手改文案。 */
const ACT_NUMERALS: { zh: string[]; en: string[] } = {
  zh: ['一', '二', '三', '四', '五', '六', '七'],
  en: ['one', 'two', 'three', 'four', 'five', 'six', 'seven'],
};

/** 页脚里的「共 N 幕」。 */
export function homeNarrativeSpanLabel(locale: Locale, count: number): string {
  if (locale === 'en') return `${ACT_NUMERALS.en[count - 1] ?? count} acts`;
  return `${ACT_NUMERALS.zh[count - 1] ?? count}幕`;
}

/** 页脚那一行：「往下读是第几幕」在固定舞台与自然滚动两种形态下说法不同。 */
export function homeNarrativeFootText(locale: Locale, flowMode: boolean, count: number): string {
  const chrome = HOME_NARRATIVE_CHROME[locale];
  const span = homeNarrativeSpanLabel(locale, count);
  return flowMode ? `${chrome.footFlow}${span}` : `${chrome.footStage}${span}${chrome.footInAll}`;
}

/** 幕导航按钮的可访问名：「前往第 3 幕：路径」。 */
export function homeNarrativeActAriaLabel(locale: Locale, index: number, kicker: string): string {
  return locale === 'en' ? `Go to act ${index + 1}: ${kicker}` : `前往第 ${index + 1} 幕：${kicker}`;
}
