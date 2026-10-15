/**
 * 用户手册的正文（中英成对，纯数据模块）。
 *
 * 与 `intro-content.ts` / `method-library.ts` 同一条纪律：长文案集中在数据模块里，
 * 页面组件只负责渲染——测试因此可以逐条核对标题、按钮文字与链接目标。
 * **本文件不引入 React**，也不读任何接口：手册正文静态可读，不等待业务数据加载。
 *
 * 取材纪律（2026-10-13）：
 * - 操作名称、按钮文字与边界说明按当前界面与 `docs/` 下的功能文档逐条核对
 *   （例如节点菜单里的按钮叫「从视图移出」，路线页的按钮叫「沿此路线阅读」）；
 * - **不写数量、配额与服务在线状态**：那些随配置与部署变化，手册只描述
 *   「在哪里看、怎么用」，具体数字以页面上的现场提示为准；
 * - 链接一律写站内路径，由页面用 `hrefFor()` 套语种前缀（英文站在 `/en` 下）。
 */

export interface ManualLink {
  /** 站内路径（可带查询串）。页面用 `hrefFor()` 处理语种前缀。 */
  to: string;
  label: string;
  note?: string;
}

export interface ManualStep {
  text: string;
  /** 该步骤的操作落点（可选）。 */
  link?: ManualLink;
}

export interface ManualSection {
  /** 锚点后缀：实际 id 是 `manual-<id>`。 */
  id: string;
  title: string;
  /** 解决什么问题。 */
  problem?: string;
  /** 从哪里进入。 */
  entry?: string;
  entryLinks?: ManualLink[];
  /** 怎样操作。 */
  steps?: ManualStep[];
  /** 会得到什么。 */
  result?: string;
  /** 容易误解什么。 */
  misreads?: string[];
}

export interface ManualAdvancedEntry {
  title: string;
  what: string;
  /** 使用条件：账号、权限或外部服务。 */
  condition: string;
  to: string;
  label: string;
}

export interface ManualFaqItem {
  q: string;
  a: string;
}

export interface ManualGestureRow {
  action: string;
  mouse: string;
  touch: string;
  keyboard: string;
}

export interface ManualContent {
  eyebrow: string;
  title: string;
  lede: string;
  note: string;
  ctaTutorial: string;
  ctaBrowse: string;
  flowTitle: string;
  flowLead: string;
  flow: string[];
  functionsTitle: string;
  functionsLead: string;
  tocTitle: string;
  tocAria: string;
  tocOpen: string;
  labelProblem: string;
  labelEntry: string;
  labelSteps: string;
  labelResult: string;
  labelMisread: string;
  evidenceTitle: string;
  evidenceLead: string;
  evidence: Array<{ tag: string; meaning: string }>;
  gesturesTitle: string;
  gesturesLead: string;
  gestureColumns: { action: string; mouse: string; touch: string; keyboard: string };
  gestures: ManualGestureRow[];
  planEntriesTitle: string;
  planEntriesLead: string;
  planEntries: Array<{ label: string; meaning: string }>;
  advancedConditionPrefix: string;
  advanced: ManualAdvancedEntry[];
  faq: ManualFaqItem[];
  sections: ManualSection[];
}

const SECTIONS_ZH: ManualSection[] = [
  {
    id: 'first-run',
    title: '第一次使用：跟着一个案例走一遍',
    problem:
      '常见的两种起点：有想学的目标，却不知道需要哪些前置知识；或者手里已经有一批笔记，想看清它们之间的知识联系。这一节用「群论 → 子群」走完整条链路——找对象、看网络、看路线、记记录。',
    entry: '从「开始学习」进入。前面四步在游客状态下就能走完；需要保存进度时再建档案。',
    steps: [
      {
        text: '打开「开始学习」，在学科导读里选中「群论」，先读它的研究对象、动机与推动理论的问题。',
        link: { to: '/start?field=群论', label: '打开群论导读' },
      },
      {
        text: '在右侧「核心节点网络」里点「子群」，再点「阅读节点」，看它的直觉、定义与逐条件反例。',
        link: { to: '/nodes/group:subgroup', label: '打开「子群」节点' },
      },
      {
        text: '换到网络里看它的位置：在导读底部点「在完整网络中探索」，或直接打开知识网络。',
        link: { to: '/network', label: '打开知识网络' },
      },
      {
        text: '把「子群」设为近期主目标后，到「学习路线」里核对背景、比较候选路线。',
        link: { to: '/plan?goal=group%3Asubgroup', label: '带着目标打开学习路线' },
      },
      {
        text: '想保存进度、写笔记、留待回看时，到「我的学习」新建一份档案（可以先选「空白档案」模板）。',
        link: { to: '/profile', label: '打开我的学习' },
      },
    ],
    result:
      '走完这条链路，你会同时知道三层信息：这个对象是什么、它在结构里的位置、从你现在的背景到它还差什么。',
    misreads: [
      '「加入兴趣」「标记已读」只影响排序或记录阅读事实，不会把节点变成已掌握；只有「确认已掌握」会作为背景进入后续规划。',
      '「设为近期主目标」只是给规划一个默认目标，规划时仍可以换成别的目标。',
      '在导读里切换学科只是浏览，不会写入任何学习记录。',
    ],
  },
  {
    id: 'start',
    title: '开始学习：从学科或问题进入',
    problem: '面对一整张知识网络，难的是找到入口。这一页把入口按学科、原型问题与不同角度分组。',
    entry: '主导航第一项「开始学习」。',
    entryLinks: [{ to: '/start', label: '打开开始学习' }],
    steps: [
      { text: '在学科导读里选一门学科，读「研究对象 / 为什么研究 / 推动理论的问题 / 从哪里开始」。' },
      { text: '点一个「推动理论的问题」，右侧网络会把相关节点高亮，方便先看这一小簇。' },
      { text: '「加入兴趣」让学习方案参考兴趣顺序；「设为近期主目标」给路线一个默认目标。' },
      { text: '也可以走「从原型问题进入」的案例卡，或按领域 / 对象类型 / 角色 / 案例的角度列表筛入口。' },
      { text: '有档案时，页面顶部给出「继续学习」：上次读到的节点、下一个可学节点与待回看。' },
    ],
    result: '一个明确的起点，以及围绕它的第一段阅读顺序。',
    misreads: [
      '切换学科只浏览导读；只有「加入兴趣」才会影响学习方案的顺序。',
      '未指定的背景不等于已经掌握，也不等于没有——规划页会把它标成「未知入口」。',
    ],
  },
  {
    id: 'nodes',
    title: '数学对象：按对象系统读',
    problem: '想按名字、领域或条件找到某个数学对象，并系统地读它，而不是只搜一段文字。',
    entry: '主导航「数学对象」。',
    entryLinks: [{ to: '/nodes', label: '打开数学对象列表' }],
    steps: [
      { text: '用搜索框找关键词；结果按命中字段、完整度与位置排序。' },
      { text: '用筛选限定领域、构造类型、角色、案例、来源与条目粒度；「话题」粒度看一节或一章范围的大条目。' },
      { text: '打开节点卡片进入详情：动机与生长链、形式表达、逐条件反例、概括证明、应用、推广、常见误解、总结与回看提问。' },
      { text: '页面底部有「相关概念」与「在网络视图里打开这个节点」；关联过笔记的节点会显示「我的相关笔记」。' },
      { text: '每个关键断言带证据标签；标签的含义见下表。' },
    ],
    result: '一个对象的完整读法，以及它在关系网络中的位置。',
    misreads: [
      '证据标签是如实标注，不是评分；「有正文证明」不等于机器核验过。',
      '「标记已读」只记录你确实读到了这里，不代表理解或掌握。',
    ],
  },
  {
    id: 'network',
    title: '知识网络：看结构、拖动与保存视图',
    problem:
      '关系不都是一样的：有的必须先用，有的只是讲法不同。网络把这些联系按认知成本加权画出来——越硬的数学断言，线画得越重。',
    entry: '主导航「知识网络」。从对象页、学科导读或学习路线都能带着节点进来。',
    entryLinks: [{ to: '/network', label: '打开知识网络' }],
    steps: [
      { text: '用搜索或在画布左侧「全部节点」面板把对象加进画布；同一边上压着多条关系时只画最强的一条，其余在提示里列全。' },
      { text: '按住左键停在某个节点上，先看它的强关联邻居；移到想加入的节点上松开即加入视图，松在别处或按 Esc 取消。' },
      { text: '右键节点打开菜单：「加入全部硬前置」一次补齐必须先学的背景（含间接前置）；「从视图移出」只把它从当前画布拿开。' },
      { text: '拖动空白处平移画布，滚轮缩放；拖动单个节点手动摆放，双击复位。把它拖到别的卡片上时，**被压住的那张会让开**——斥力在拖动过程中就生效，不是松手时才跳开；放手后它停在你的落点上。窄屏网络页仍是普通卡片，不占满全屏。' },
      { text: '缩到 55% 以下时卡片变成圆点：圆点正下方仍写着节点名（挤的地方会省成短名或干脆不写，优先保留选中的、悬停的和起始节点）；悬停圆点可以看到完整的信息卡。' },
      { text: '「重新布局」按「学习顺序」或「逻辑核心」重排卡片：手动摆放默认保留，取消勾选则一起重算（可撤销）。' },
      { text: '「保存视图」把当前画布存成快照；每份视图是独立快照，载入会替换当前画布，不自动合并。' },
      { text: '切到别的页面再回来，本次学习里搭好的图会自动恢复（节点、可见边源与视角）；顶部提示条里的「丢弃暂存，重新开始」才是明确的从新开始。暂存只属于当前会话，关掉标签页就结束，不是「保存的视图」。' },
      { text: '右键连接线可以添加「我的备注」，说明这条关系对你的意义；取消后有短时间的撤销入口。' },
      { text: '从路线页点「看结构回放」进入回放：每一步在画布上留一支细箭头，箭头上的编号就是学习顺序（悬停可看「第几步 → 节点名」）；最新那一支正在长出来，源节点加一圈高亮。' },
    ],
    result:
      '一张按关系硬度分层的结构图；你可以保存视图、加个人备注，并从这里直接跳到任何一个节点。',
    misreads: [
      '「从视图移出」只改本页显示：不删节点、不改公共本体、不写学习档案。',
      '个人备注属于账号（本机模式归属本机），与公共数学关系分开存放；它不参与路线规划。',
      '学生档案、视图快照与手动摆放保存在本机；个人备注按账号保存。',
      '切页回来图还在，不代表它已经存成视图：自动恢复只存在于这一次会话，关掉标签页就结束。要长期保留请点「保存视图」。',
    ],
  },
  {
    id: 'plan',
    title: '学习路线：目标、背景与候选方案',
    problem: '给定一个目标和一份背景，找出可行的事件顺序——先学什么、再学什么，以及每条路线用了哪些假设。',
    entry: '主导航「学习路线」。从节点页或学科导读可以带着目标直接进来。',
    entryLinks: [
      { to: '/plan', label: '打开学习路线' },
      { to: '/plan?goal=group%3Asubgroup', label: '用「子群」做一次预览', note: '上一节案例的目标' },
    ],
    steps: [
      { text: '第一步选目标：从下拉框选节点，或沿用从别处带进来的目标。' },
      { text: '第二步核对背景：在网格里把每个入口标成「已确认可用」「声明假设（条件性）」或「未知入口」。' },
      { text: '点「开始规划」：按钮随即变成「规划中…」，页面自动跳到「③ 比较路线」，在那里比较候选路线的事件数、成本（没有声明成本模型时保持未知）、证据与搜索完整性；算完按钮显示「重新规划」，可以再算一次。' },
      { text: '点「沿此路线阅读」从第一步开始读；点「看结构回放」把路线交给网络页按事件顺序逐步扩张。' },
      { text: '在范例路径那一栏展开一本教材后，可以勾选**几程**再点「放进一张网络视图」：这几程会接成同一条回放（起点取所选中最早那一程的起点，同一节点只出现一次），控制台写明现在在第几程，每程的第一支箭头上有一圈环。' },
      { text: '没有头绪时可以用「范例路径」：它写入一组示范假设并立刻规划一次，示范假设不会写进你的档案。' },
    ],
    result: '若干条候选路线，每条都写清它用到的假设与覆盖范围；你可以选一条开始读，或回去调整背景再试。',
    misreads: [
      '结构可行不等于真实学习有效：规划器只检查行动契约与依赖，不预测学习效果。',
      '没有声明成本模型时，成本显示为「未知」，规划器不会静默假设一个成本。',
      '「声明域内完整」是搜索结论，不是数学定理；未完成时页面会列出原因。',
    ],
  },
  {
    id: 'library',
    title: '我的笔记库：创作新笔记与带入 Obsidian 笔记',
    problem: '已经写了笔记，想在学习时随手查阅，并把笔记挂到相关的数学对象上。',
    entry: '主导航「我的笔记库」。选择本地目录需要浏览器支持目录访问接口；不支持时页面会改用文件夹选择。',
    entryLinks: [{ to: '/library', label: '打开我的笔记库' }],
    steps: [
      { text: '点「新建笔记」，选择标题、对象类型和读者基础；从节点页点「围绕此节点写笔记」可预填关联。' },
      { text: '创作台左侧选章节，中间写作，右侧查看本节问题、示例和自检要求；可切换完整 Markdown 与阅读预览。历史动机与可操作的直觉各有独立章节。' },
      { text: '输入自动暂存在当前浏览器；点「保存笔记版本」生成历史修订，再主动上传账号或下载 Markdown。复制提示词不会调用模型或上传正文。' },
      { text: '已有笔记可「复制为创作稿」，原文与引用附件保留；账号创作库可取回本机继续写。类型变更与模板升级先预览，再补充缺失框架。' },
      { text: '点「选择 Obsidian 库」，选中 vault 根目录；页面先扫描，列出目录与文件、附件数量和大小、跳过原因。' },
      { text: '在「导入预览」里勾选要带入的笔记——只导入这些笔记实际引用的附件——再点「导入到当前浏览器」。' },
      { text: '导入后可以全文搜索、按目录树阅读；Markdown、公式、内链与反向链接都能用（插件与脚本不执行）。' },
      { text: '在笔记页「关联数学节点」把笔记挂到对象上；节点页会显示「我的相关笔记」。关联只是私人参考资料。' },
      { text: '源文件改过以后点「重新扫描」：页面按相对路径与内容哈希比较，列出新增、修改、缺失与改名。' },
      { text: '「上传到我的账号」把本地副本传到账号（需要登录）；「导出笔记库」单独导出笔记库数据。' },
    ],
    result: '两层副本：当前浏览器里的本地副本，以及（主动上传后的）账号私有副本；两者都保留历史版本。',
    misreads: [
      '默认只存在当前浏览器；换设备或清理浏览器数据前，请先上传到账号或导出。',
      '上传是独立操作，导入和创作不会自动上传；Obsidian 源文件只读，网站内复制改写不会回写源文件。',
      '写作覆盖与作者自检不等于数学或史料已核验；结构不完整的草稿也可以保存。',
      '笔记库导出与「我的学习」里的档案导出是两件事，各自导出各自的数据。',
    ],
  },
  {
    id: 'profile',
    title: '我的学习：档案与学习记录',
    problem: '记录「我读到哪、什么还不懂、什么已确认」，让下次打开时能接着走。',
    entry: '主导航「我的学习」。公网模式下需要登录；本机模式只有这一台机器上的身份。',
    entryLinks: [{ to: '/profile', label: '打开我的学习' }],
    steps: [
      { text: '「新建档案」建一份记录；模板可选「空白档案」「高一」「大一新生」，模板只声明背景接口节点。' },
      { text: '在节点页用这些动作记录状态：「标记已读」「我还不懂」「确认已掌握」「记一次复习」。' },
      { text: '「待回看」收集已读与尚未理解的节点；回看完成后记录次数，次数累加但不会自动改成已掌握。' },
      { text: '「学习概览」显示已读、已确认、现在可以新学的节点；这里不给掌握百分比——掌握程度没有被校准过。' },
      { text: '「高级设置」里可以导出/导入当前档案 JSON、查看数据库与本体哈希等维护信息。' },
    ],
    result: '一份可以长期维护的学习记录；切换档案即切换整套记录，公共本体不受影响。',
    misreads: [
      '已读不等于已掌握；只有你自己按下的「确认已掌握」会作为背景进入规划。',
      '学习数据只写外部模型 E，不回写公共本体 M：换档案、失败、遗忘都不会改变本体哈希。',
    ],
  },
  {
    id: 'advanced',
    title: '进阶入口：方法、辅导、研究与维护',
    problem: '学习主线之外还有几类入口：它们不属于日常学习，需要时再打开。',
    entry: '侧栏「按需查阅」分组。',
  },
  {
    id: 'faq',
    title: '常见问题',
    problem: '几个最容易被问到、也最容易误解的问题。',
  },
];

const SECTIONS_EN: ManualSection[] = [
  {
    id: 'first-run',
    title: 'First run: follow one case from start to finish',
    problem:
      'There are two common starting points: you have a goal but do not know which prerequisites it needs, or you already have notes and want to see how they connect to the material. This section follows one thread — from group theory to subgroups — covering objects, the network, a route preview and saved records.',
    entry:
      'Start from “Start learning”. The first four steps work as a guest; create a profile only when you want to save your progress.',
    steps: [
      {
        text: 'Open “Start learning”, pick the “Group theory” guide and read what it studies, why, and which questions drive it.',
        link: { to: '/start?field=群论', label: 'Open the group-theory guide' },
      },
      {
        text: 'In the “Core node network” on the right, select “Subgroup” and click “Read node” to see its intuition, definition and condition-by-condition counterexamples.',
        link: { to: '/nodes/group:subgroup', label: 'Open the “Subgroup” node' },
      },
      {
        text: 'See where it sits in the whole picture: use “Explore in the full network” at the bottom of the guide, or open the knowledge network directly.',
        link: { to: '/network', label: 'Open the knowledge network' },
      },
      {
        text: 'Set “Subgroup” as your primary goal, then check the background and compare candidate routes on the learning-route page.',
        link: { to: '/plan?goal=group%3Asubgroup', label: 'Open the route page with that goal' },
      },
      {
        text: 'When you want to save progress, write notes or keep a review queue, create a profile in “My learning” (the “Blank profile” template is a fine start).',
        link: { to: '/profile', label: 'Open My learning' },
      },
    ],
    result:
      'After this short loop you know three things about the object: what it is, where it sits structurally, and what stands between your current background and it.',
    misreads: [
      '“Add interest” and “Mark as read” only affect ordering or record that you read something; they never turn a node into “mastered”. Only “Confirm usable” enters later planning as background.',
      '“Set as primary goal” only supplies a default goal for planning; you can still change the goal on the route page.',
      'Switching fields inside a guide is browsing only; it writes no learning record.',
    ],
  },
  {
    id: 'start',
    title: 'Start learning: enter from a field or a question',
    problem:
      'The hard part of a large knowledge network is finding a way in. This page groups entry points by field, prototype question and other angles.',
    entry: 'The first item in the main navigation, “Start learning”.',
    entryLinks: [{ to: '/start', label: 'Open Start learning' }],
    steps: [
      { text: 'Pick a field in the guides and read “what it studies / why / questions driving it / where to begin”.' },
      { text: 'Click one of the driving questions: the network on the right highlights the nodes involved, so you can start with that small cluster.' },
      { text: '“Add interest” makes study plans respect the order of your interests; “Set as primary goal” gives a route a default goal.' },
      { text: 'You can also enter through the “prototype question” cards, or filter by field, object type, role or case.' },
      { text: 'With a profile selected, the top of the page offers “Keep going”: the node you read last, the next learnable node and what is due for review.' },
    ],
    result: 'A definite starting point, plus the first stretch of reading around it.',
    misreads: [
      'Switching fields only browses guides; only “Add interest” affects the order used by study plans.',
      'An undeclared background is neither “mastered” nor “absent” — the route page marks it as an undecided entry.',
    ],
  },
  {
    id: 'nodes',
    title: 'Mathematical objects: read one object at a time',
    problem:
      'Find an object by name, field or condition, and read it in a structured way instead of searching a loose paragraph.',
    entry: 'The “Objects” item in the main navigation.',
    entryLinks: [{ to: '/nodes', label: 'Open the object list' }],
    steps: [
      { text: 'Search by keyword; results are ranked by which field matched, completeness and position.' },
      { text: 'Filter by field, construct type, role, case, source and granularity; the “topic” granularity shows section- or chapter-sized entries.' },
      { text: 'Open a node card for the full note: motivation and growth chain, formal statement, condition-by-condition counterexamples, proof overview, applications, generalisations, common misconceptions, summary and review questions.' },
      { text: 'At the bottom you find “related concepts” and “open this node in the network”; nodes linked to your notes show “my related notes”.' },
      { text: 'Every key claim carries an evidence label; see the table below.' },
    ],
    result: 'A complete reading of one object, plus its position in the relation network.',
    misreads: [
      'Evidence labels state what a claim rests on; they are not a score, and “prose proof” does not mean machine-checked.',
      '“Mark as read” records that you got there; it does not mean you understood or mastered it.',
    ],
  },
  {
    id: 'network',
    title: 'Knowledge network: structure, dragging and saved views',
    problem:
      'Relations are not all alike: some are prerequisites, others are different ways of saying the same thing. The network draws these links weighted by cognitive cost — the harder the mathematical claim, the heavier the line.',
    entry: 'The “Knowledge network” item in the main navigation. Node pages, field guides and routes can all bring nodes in with you.',
    entryLinks: [{ to: '/network', label: 'Open the knowledge network' }],
    steps: [
      { text: 'Add objects with search or the “All nodes” panel on the left; when several relations share one pair of nodes, only the strongest line is drawn and the rest are named in its tooltip.' },
      { text: 'Hold the left button on a node to see its strongly related neighbours; move onto the node you want and release to add it to the view — release elsewhere or press Esc to cancel.' },
      { text: 'Right-click a node for its menu: “Add all hard prerequisites” fills in what must come first (including indirect ones); “Remove from the view” only takes it off the current canvas.' },
      { text: 'Drag empty space to pan, scroll to zoom; drag a single node to place it by hand, double-click to reset it. Drag a card onto another and **the card underneath yields** — the repulsion acts during the drag, not as a jump on release, so the card you hold stays at your drop point. On narrow screens the canvas becomes a normal card rather than filling the viewport.' },
      { text: 'Below 55% zoom the cards become dots, and each node’s name is still written directly under its dot (in crowded places the name is shortened or skipped — the selected, hovered and starting nodes keep theirs); hover a dot for the full information card.' },
      { text: '“Re-layout” rearranges the cards by “study order” or “logical core”: manual placements are kept by default, and you can tick them off to recompute everything (undoable).' },
      { text: '“Save view” stores the current canvas as a snapshot; each view is independent, and loading one replaces the canvas instead of merging.' },
      { text: 'Switch to another page and come back: the graph you built in this session is restored automatically (nodes, visible edge kinds and camera). The bar at the top offers “Discard and start over” as the explicit fresh start. The draft belongs to this session only — it ends when the tab closes, and it is not a saved view.' },
      { text: 'Right-click a connection line to add “my note” explaining what that relation means to you; after removing one you get a short window to undo.' },
      { text: '“View the structure replay” on a route page plays it here: every step leaves a thin arrow on the canvas, and the number on the arrow is the study order (hover for “step k → node”). The newest arrow is still growing and its source node is ringed.' },
    ],
    result:
      'A structure diagram layered by how hard each relation is; you can save views, annotate connections and jump straight into any node.',
    misreads: [
      '“Remove from the view” changes only what this page shows: no node is deleted, the public ontology is untouched and no learning record is written.',
      'Personal notes belong to your account (the local identity in local mode) and are stored separately from the public mathematical relations; they do not feed route planning.',
      'Profiles, saved views and manual placements live on this machine; personal notes follow the account.',
      'A graph that comes back when you switch pages is not a saved view: the automatic restore lives in this session only and ends when the tab closes. Use “Save view” to keep it.',
    ],
  },
  {
    id: 'plan',
    title: 'Learning routes: goal, background and candidates',
    problem:
      'Given a goal and a background, find a feasible sequence of events — what to study first and what follows — with the assumptions each route uses written out.',
    entry: 'The “Learning route” item in the main navigation. Node pages and field guides can bring a goal in with you.',
    entryLinks: [
      { to: '/plan', label: 'Open the learning route page' },
      { to: '/plan?goal=group%3Asubgroup', label: 'Preview a route for “Subgroup”', note: 'the goal from the previous section' },
    ],
    steps: [
      { text: 'Step one is the goal: choose a node from the dropdown, or keep the goal you arrived with.' },
      { text: 'Step two checks the background: mark each entry as “confirmed usable”, “declared assumption (conditional)” or “undecided entry”.' },
      { text: 'Press “Start planning”: the button turns into “Planning…” and the page jumps to “③ Compare routes”, where you compare candidates by number of events, cost (unknown until you declare a cost model), evidence and search completeness; once it finishes the button reads “Plan again”.' },
      { text: '“Read along this route” starts from the first step; “view the structure replay” hands the route to the network page so you can grow the graph event by event.' },
      { text: 'In the example-paths block, unfold a textbook, tick **several routes** and press “put them into one network view”: they become a single replay (the start is the earliest ticked route’s start, and a node appears only once). The console names the current route, and each route’s first arrow carries a ring.' },
      { text: 'With no idea where to start, use “example paths”: they write a set of demonstration assumptions and plan once; those assumptions never enter your profile.' },
    ],
    result:
      'A set of candidate routes, each stating the assumptions and coverage it relies on; pick one and start reading, or adjust the background and plan again.',
    misreads: [
      'Feasible structure is not real learning effectiveness: the planner checks action contracts and dependencies only.',
      'Without a declared cost model the cost stays “unknown”; the planner does not silently invent one.',
      '“Complete within the declared domain” is a search conclusion, not a theorem; when it fails, the page lists the reasons.',
    ],
  },
  {
    id: 'library',
    title: 'My note libraries: write new notes and bring in Obsidian notes',
    problem: 'You already keep notes and want to read them while studying, attached to the relevant mathematical objects.',
    entry:
      'The “My note libraries” item in the main navigation. Choosing a local folder needs a browser with the directory-access API; when unavailable the page falls back to folder selection.',
    entryLinks: [{ to: '/library', label: 'Open My note libraries' }],
    steps: [
      { text: 'Choose “New note”, enter a title, object type and reader background. “Write a note about this node” preselects a node link.' },
      { text: 'Choose a chapter on the left, write in the middle and consult questions, examples and checks on the right. Switch to full Markdown or reading preview. Historical motivation and operational intuition have dedicated chapters.' },
      { text: 'Typing keeps a draft in this browser. “Save note revision” adds history; upload explicitly or download Markdown. Copying a prompt does not call a model or upload content.' },
      { text: '“Copy as a writing draft” retains the original and referenced attachments. Fetch an account working library to continue locally. Preview type changes and template upgrades before adding missing chapters.' },
      { text: 'Click “Choose Obsidian library” and pick the vault root; the page scans first and lists directories, files, attachment counts and sizes, and what it skipped.' },
      { text: 'In the import preview, tick the notes to bring in — only the attachments those notes actually reference — then click “Import into this browser”.' },
      { text: 'After importing you can search full text and read by the folder tree; Markdown, formulas, wikilinks and backlinks work (plugins and scripts are not executed).' },
      { text: 'On a note, “relate mathematics nodes” attaches it to objects; node pages then show “my related notes”. A link is private reference material only.' },
      { text: 'After editing the source files, press “Rescan”: the page compares relative paths and content hashes and lists additions, edits, missing files and renames.' },
      { text: '“Upload to my account” sends the local copy to your account (sign-in required); “export the note library” exports the library data on its own.' },
    ],
    result:
      'Two layers of copies: a local copy in this browser, and after you upload, a private account copy; both keep revision history.',
    misreads: [
      'By default everything stays in this browser; before switching machines or clearing browser data, upload to your account or export.',
      'Uploading is explicit; import and writing do not upload automatically. Obsidian source files remain read-only; copies edited on this site do not write back.',
      'Writing coverage and author self-review do not verify mathematics or history. Unfinished drafts can still be saved.',
      'Exporting a note library and exporting a learning profile are two different exports.',
    ],
  },
  {
    id: 'profile',
    title: 'My learning: profiles and records',
    problem: 'Record where you stopped, what you do not understand yet and what you have confirmed, so the next visit continues rather than restarts.',
    entry:
      'The “My learning” item in the main navigation. In public mode you sign in first; in local mode there is only the identity of this machine.',
    entryLinks: [{ to: '/profile', label: 'Open My learning' }],
    steps: [
      { text: '“Create profile” starts a record; templates offer “blank profile”, “Grade 10” and “first-year undergraduate”, and templates only declare background interface nodes.' },
      { text: 'On a node page these actions record state: “Mark as read”, “I don’t get it yet”, “Confirm usable” and “Record a review”.' },
      { text: '“To review” collects nodes you read or did not understand; completing a review adds to a counter, and the counter never flips a node to “mastered” on its own.' },
      { text: 'The overview shows what is read, what is confirmed and what is learnable next; there is no mastery percentage — mastery has not been calibrated.' },
      { text: '“Advanced” lets you export or import the current profile as JSON and inspect maintenance data such as the ontology hash.' },
    ],
    result: 'A learning record you can keep for a long time; switching profiles switches the whole record, and the public ontology stays untouched.',
    misreads: [
      'Read is not mastered; only the “Confirm usable” action you press yourself enters planning as background.',
      'Learning data is written to the external model E only and never back into the public ontology M: switching profiles, failing or forgetting never changes the ontology hash.',
    ],
  },
  {
    id: 'advanced',
    title: 'Further entries: methods, tutoring, research and maintenance',
    problem: 'Beyond the study line there are a few other entries; they are not part of daily study, so open them when you need them.',
    entry: 'The “Look up as needed” group in the sidebar.',
  },
  {
    id: 'faq',
    title: 'Frequently asked questions',
    problem: 'The questions that come up most often, and the misreadings behind them.',
  },
];

export const MANUAL_BY_LOCALE: { zh: ManualContent; en: ManualContent } = {
  zh: {
    eyebrow: '跟着案例上手 · 按功能速查',
    title: '用户手册',
    lede: '这份手册面向使用网站的学习者。先跟着一个案例走完「找对象 → 看网络 → 定路线 → 记记录」，再按需要查每一处操作的入口、步骤与边界。',
    note: '所有操作名称按当前界面写；数量与限额随配置变化，以页面上的现场提示为准。手册本身不写任何学习记录。',
    ctaTutorial: '跟着案例上手',
    ctaBrowse: '按功能查阅',
    flowTitle: '一条常见的完整链路',
    flowLead: '下面的顺序不是必须的，但每一环都能独立使用；不知道从哪开始时，按这个顺序走一遍最省力。',
    flow: ['找对象', '看网络', '定路线', '记记录', '回看'],
    functionsTitle: '功能速查',
    functionsLead: '每一条都给出「解决什么问题」与直达入口；点进去就是那一步的操作说明。',
    tocTitle: '本页目录',
    tocAria: '用户手册目录',
    tocOpen: '展开目录',
    labelProblem: '解决什么问题',
    labelEntry: '从哪里进入',
    labelSteps: '怎样操作',
    labelResult: '会得到什么',
    labelMisread: '容易误解什么',
    evidenceTitle: '证据标签怎么看',
    evidenceLead: '标签回答两件事：这个断言凭什么成立、覆盖到哪。拿不准时按标签的说明读。',
    evidence: [
      { tag: 'DEF', meaning: '定义或约定：不声称真值，只固定用法。' },
      { tag: 'PROOF', meaning: '有正文证明：证明在专稿对应章节；未机器核验。' },
      { tag: 'REF', meaning: '引用来源：核验范围写在证据记录里，不等于读完全文。' },
      { tag: 'FINITE', meaning: '有限检查：只覆盖列明的有限片段，不推广。' },
      { tag: 'ILLUSTRATION', meaning: '示例说明：用来建立直觉，不承担证明。' },
      { tag: 'NOT-CLAIMED', meaning: '明确不声称：把范围边界写出来，而不是留空。' },
    ],
    gesturesTitle: '网络操作速查',
    gesturesLead: '按你手边的设备取用；键盘列只列已经支持的按键。',
    gestureColumns: { action: '操作', mouse: '鼠标', touch: '触摸', keyboard: '键盘' },
    gestures: [
      { action: '平移画布', mouse: '拖动空白处', touch: '单指拖动', keyboard: '—' },
      { action: '缩放画布', mouse: '滚轮，或「放大 / 缩小」按钮', touch: '双指捏合，或「放大 / 缩小」按钮', keyboard: 'Tab 聚焦按钮后按回车' },
      { action: '看强关联', mouse: '按住左键停在节点上', touch: '长按节点', keyboard: '—' },
      { action: '节点菜单', mouse: '右键节点', touch: '—', keyboard: '打开后按 Esc 关闭' },
      { action: '手动摆放 / 复位', mouse: '拖动节点；双击复位', touch: '拖动节点', keyboard: '—' },
      { action: '连接备注', mouse: '右键连接线', touch: '—', keyboard: '聚焦连接线后按 Shift+F10、菜单键、Enter 或空格；Esc 或点外部关闭' },
    ],
    planEntriesTitle: '背景网格里的三种入口',
    planEntriesLead: '同一个入口，声明方式不同，路线给出的假设也不同；「未指定」不会自动当成任何一边。',
    planEntries: [
      { label: '已确认可用', meaning: '你可以直接拿它当背景用；规划会省掉推出它的步骤。' },
      { label: '声明假设（条件性）', meaning: '这次规划暂定你会；结论因此带上一条条件。' },
      { label: '未知入口', meaning: '留作显式入口条件：路线会说明「如果它成立」。' },
    ],
    advancedConditionPrefix: '使用条件：',
    advanced: [
      { title: '学习方法论', what: '每条原则的细致解析，以及本站笔记模板的设计依据。', condition: '无需账号。', to: '/method', label: '打开学习方法论' },
      { title: '辅导', what: '把当前上下文交给辅导会话，追问一个节点上的问题。', condition: '需本机运行 DeepTutor（外部服务）；未连接时页面如实说明，不生成回复。', to: '/tutor', label: '打开辅导' },
      { title: '前沿研究', what: '专稿覆盖清单、局部化算子与证据重放等复核材料。', condition: '公开只读；不需要登录。', to: '/lab', label: '打开研究台' },
      { title: '网站维护', what: '专稿与 arXiv 清单、覆盖对照、合法本体条件等站点自身的维护材料。', condition: '公网模式下仅管理员；本机模式直接可用。', to: '/maintenance', label: '打开网站维护' },
      { title: '自动关联', what: '把对象写成受形式语言约束的表达，自动发现关系、审阅后入库。', condition: '维护动作；只有走到最后一步「确认入库」才会改动公共内容。', to: '/authoring', label: '打开自动关联' },
    ],
    faq: [
      {
        q: '未登录能做什么？',
        a: '游客可以浏览对象、组建网络、使用学习路线（目标与背景作为浏览器草稿保留），也可以选择本地 Obsidian 库在浏览器里阅读。登录后才有账号私有笔记库、跨设备的档案保存与辅导会话。本机模式没有登录墙，只有一个本机身份。',
      },
      {
        q: '换设备以后，记录在哪里？',
        a: '公网模式下，学习档案与账号笔记库跟着账号走；浏览器里导入的笔记副本、保存的视图与游客草稿只存在当前浏览器。换设备前先上传或导出，电脑上再导出档案 JSON。',
      },
      {
        q: '网络里「从视图移出」是什么意思？',
        a: '它只把节点从当前画布拿开，方便看清别的部分：不删节点、不改公共关系、不写学习记录。想恢复，用「全部节点」或搜索把它加回来即可。',
      },
      {
        q: '切到别的页面再回来，刚才搭好的图还在吗？',
        a: '在：本次学习里搭建的网络视图会自动恢复（节点、可见边源与视角），只属于这一次会话——关掉标签页就结束，也不产生学习记录。想开一张全新的图，点顶部提示条里的「丢弃暂存，重新开始」；想长期保留，点「保存视图」。',
      },
      {
        q: '路线页显示「当前条件下没有可行路线」怎么办？',
        a: '页面上列了三种原因，处理方式不同：没有选目标就补目标；背景不足就补背景声明，或把入口标成「声明假设（条件性）」；搜索范围不足就调大事件界再试。',
      },
      {
        q: '在 Obsidian 里改过原文，网站还是旧的？',
        a: '本地副本不会自动跟随源文件：回「我的笔记库」点「重新扫描」，先看变更预览再导入。改名经唯一哈希匹配会延续原关联；源文件删除或改名不唯一时保留旧副本并标记，不自动合并。',
      },
      {
        q: '辅导页显示未连接？',
        a: 'DeepTutor 是独立的本机服务，不在本站进程里；未连接时辅导页如实说明状态，不生成任何回复。学习、网络、路线与研究台都不依赖它。',
      },
    ],
    sections: SECTIONS_ZH,
  },
  en: {
    eyebrow: 'Follow a case once · look up features as needed',
    title: 'User manual',
    lede:
      'This manual is written for learners using the site. Follow one case through “find an object → see the network → plan a route → keep records”, then look up any single operation — its entry point, steps and limits.',
    note:
      'Operation names follow the current interface; counts and quotas depend on configuration, so check the live hints on the page. Reading this manual writes no learning record.',
    ctaTutorial: 'Follow the worked example',
    ctaBrowse: 'Look up a feature',
    flowTitle: 'One common end-to-end path',
    flowLead:
      'This order is not required — every step also works on its own — but when you do not know where to begin it is the shortest route to a first reading.',
    flow: ['Find an object', 'See the network', 'Plan a route', 'Keep records', 'Review'],
    functionsTitle: 'Feature lookup',
    functionsLead: 'Each entry states the problem it solves and links straight to the feature; open it to read how that step works.',
    tocTitle: 'On this page',
    tocAria: 'User manual contents',
    tocOpen: 'Show contents',
    labelProblem: 'Problem it solves',
    labelEntry: 'Where to enter',
    labelSteps: 'How to use it',
    labelResult: 'What you get',
    labelMisread: 'Common misreadings',
    evidenceTitle: 'How to read evidence labels',
    evidenceLead: 'A label answers two questions: what the claim rests on and how far it reaches. When unsure, read the note with the label.',
    evidence: [
      { tag: 'DEF', meaning: 'Definition or convention: no truth is claimed, only usage is fixed.' },
      { tag: 'PROOF', meaning: 'Prose proof: the proof lives in the monograph chapter; not machine-checked.' },
      { tag: 'REF', meaning: 'Reference: the audited scope is recorded; it does not mean the whole source was read.' },
      { tag: 'FINITE', meaning: 'Finite check: covers the listed finite fragment only, with no generalisation.' },
      { tag: 'ILLUSTRATION', meaning: 'Illustration: builds intuition and carries no proof obligation.' },
      { tag: 'NOT-CLAIMED', meaning: 'Explicitly not claimed: the boundary is written out instead of left blank.' },
    ],
    gesturesTitle: 'Network controls at a glance',
    gesturesLead: 'Use the column that matches your device; the keyboard column lists only what is actually supported.',
    gestureColumns: { action: 'Action', mouse: 'Mouse', touch: 'Touch', keyboard: 'Keyboard' },
    gestures: [
      { action: 'Pan the canvas', mouse: 'Drag empty space', touch: 'Drag with one finger', keyboard: '—' },
      { action: 'Zoom', mouse: 'Scroll wheel, or the zoom-in / zoom-out buttons', touch: 'Pinch with two fingers, or the zoom buttons', keyboard: 'Tab to a zoom button, then press Enter' },
      { action: 'See strong relations', mouse: 'Hold the left button on a node', touch: 'Long-press a node', keyboard: '—' },
      { action: 'Node menu', mouse: 'Right-click a node', touch: '—', keyboard: 'Esc closes it once open' },
      { action: 'Place a node by hand / reset it', mouse: 'Drag the node; double-click to reset', touch: 'Drag the node', keyboard: '—' },
      { action: 'Connection note', mouse: 'Right-click a connection line', touch: '—', keyboard: 'Focus the line, then Shift+F10, the menu key, Enter or Space; Esc or a click outside closes it' },
    ],
    planEntriesTitle: 'The three entry kinds on the background grid',
    planEntriesLead: 'The same entry can be declared in different ways, and the route carries the matching assumption; “unspecified” never counts as either side.',
    planEntries: [
      { label: 'Confirmed usable', meaning: 'You can rely on it as background; planning may skip the steps that derive it.' },
      { label: 'Declared assumption (conditional)', meaning: 'This plan assumes you have it, so the result carries that condition.' },
      { label: 'Undecided entry', meaning: 'Kept as an explicit entry condition: the route says “if this holds”.' },
    ],
    advancedConditionPrefix: 'Requirements: ',
    advanced: [
      { title: 'Methodology', what: 'A detailed treatment of each principle, and the design basis of this site’s note template.', condition: 'No account needed.', to: '/method', label: 'Open the methodology' },
      { title: 'Tutoring', what: 'Hands the current context to a tutoring session for follow-up questions on one node.', condition: 'Needs DeepTutor running locally (an external service); while it is disconnected the page says so and produces no replies.', to: '/tutor', label: 'Open tutoring' },
      { title: 'Research', what: 'Review material: the monograph coverage list, the localization operators and evidence replay.', condition: 'Public and read-only; no sign-in.', to: '/lab', label: 'Open the research bench' },
      { title: 'Maintenance', what: 'The site’s own maintenance material: monograph and arXiv lists, coverage comparisons, legal-ontology conditions.', condition: 'Admins only in public mode; available directly in local mode.', to: '/maintenance', label: 'Open maintenance' },
      { title: 'Relation discovery', what: 'Writes objects as expressions in a restricted formal language, finds relations and reviews them before anything is filed.', condition: 'A maintenance action; the public content changes only at the final “confirm and file” step.', to: '/authoring', label: 'Open relation discovery' },
    ],
    faq: [
      {
        q: 'What can I do without signing in?',
        a: 'Guests can browse objects, build networks, use learning routes (goals and background stay as a browser draft) and read a local Obsidian library in the browser. Signing in adds the private account library, profiles that follow the account across devices, and tutoring sessions. Local mode has no sign-in wall at all — just the identity of this machine.',
      },
      {
        q: 'Where do my records live after I switch machines?',
        a: 'In public mode, profiles and the account note library follow the account; note copies imported into a browser, saved views and guest drafts stay in that browser only. Before switching, upload or export, and export the profile JSON on the old machine.',
      },
      {
        q: 'What does “Remove from the view” mean in the network?',
        a: 'It only takes the node off the current canvas so the rest is easier to read: no node is deleted, no public relation changes and no learning record is written. Bring it back any time from “All nodes” or search.',
      },
      {
        q: 'If I open another page and come back, is the graph I just built still there?',
        a: 'Yes. The network view you built in this session is restored automatically (nodes, visible edge kinds and camera). It belongs to this session only — it ends when the tab closes and it writes no learning record. For a fresh start, press “Discard and start over” in the bar at the top; to keep a graph long-term, press “Save view”.',
      },
      {
        q: 'The route page says “no feasible route under the current conditions”. Now what?',
        a: 'The page lists three causes and they are handled differently: choose a goal if none is set; add background declarations, or mark an entry as “declared assumption (conditional)”; raise the event horizon and plan again if the search range was too small.',
      },
      {
        q: 'I edited the source notes in Obsidian but the site still shows the old text. Why?',
        a: 'The local copy never follows source files automatically: go back to “My note libraries”, press “Rescan”, review the change preview and import. A rename matched by unique hash keeps its links; when the source is missing or a match is ambiguous the old copy is kept and flagged, and nothing is merged automatically.',
      },
      {
        q: 'The tutoring page says it is not connected.',
        a: 'DeepTutor is a separate local service and does not live inside this site’s process; while it is disconnected the page reports that state and produces no replies. Study, networks, routes and the research bench do not depend on it.',
      },
    ],
    sections: SECTIONS_EN,
  },
};
