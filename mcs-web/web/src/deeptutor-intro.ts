/**
 * DeepTutor 的介绍与外部链接（2026-10 从 TutorPage 提出来，TODO A4-26 / A4-27）。
 *
 * 为什么单独成文件：外链的**可达性检查**要在 node 侧跑（可跳过、离线标 not_run），
 * 而 `TutorPage.tsx` 是 JSX 组件，node 直接 import 不了。数据与渲染分开之后，
 * 页面与测试读的是同一份清单——链接改了不会两边不一致。
 *
 * 版本号不在这里写死：运行期由服务端只读本机检出（见 server/upstream.mjs），
 * 这里只保留一份**记录值**，仅在没有读到检出时显示，并标明「手工核对，可能滞后」。
 */

export const DEEPTUTOR_INTRO = {
  what: 'DeepTutor 是香港大学数据智能实验室（HKUDS）开源的 AI 学习工作台，Apache-2.0 许可，独立进程运行、不在本站里。它自称 agent-native：把辅导、解题、出题、检索研究、可视化与掌握度练习放进同一套可扩展运行时，十来个模式（对话 / 提问 / 测验 / 研究 / 可视化 / 解题 / 课程学习 / 掌握路径 / 沉浸阅读 / 沉浸观看）共用同一份会话上下文。知识侧可接 LlamaIndex、PageIndex、GraphRAG、LightRAG、WeKnora、IMA、MarginNote 4、Kiwix、Obsidian 等引擎；工具侧支持 MCP server 与社区技能（EduHub）。本站把「数学认知空间」的本体与规划器接过去，让它在**你选定的那个数学对象**的上下文里讲解、提问与出题。',
  how: [
    { title: '同一版本体', detail: '辅导读的是与页面同一版本的本体（M）：节点、关系、证据边界都一致，不会另讲一套。' },
    { title: '同一套规划器', detail: '学习路线由本站的规划器算，辅导不另算一份；它只在你选的节点上下文中工作。' },
    { title: '反馈只写 E', detail: '模型的讲解与评价只能追加学习者档案（E）里的事件；不改本体（M），也不会自动确认「已掌握」。' },
  ],
  paths: [
    { title: '站内适配器', detail: '辅导页直接调 DeepTutor 后端：注入节点上下文、把回合落成本机事件。' },
    { title: '桥接服务', detail: '另一条路径（本机 3783）带 MCP 工具与事件登记，是经过核查的那一套；两条路径必须分别看状态。' },
  ],
  /* 外部链接：每条都写清指向什么，方便自己核。 */
  links: [
    { label: 'GitHub 仓库', href: 'https://github.com/HKUDS/DeepTutor', detail: 'HKUDS/DeepTutor · 源码、发行说明与路线图' },
    { label: '官方文档', href: 'https://deeptutor.info', detail: 'deeptutor.info · 安装、配置与各模式说明' },
    { label: '论文', href: 'https://arxiv.org/abs/2604.26962', detail: 'arXiv:2604.26962 — DeepTutor: Towards Agentic Personalized Tutoring（Bingxi Zhao 等，2026）' },
  ],
  /*
   * 版本号的**记录值**：手工核对过一次的结果，只在「没读到本机检出」时显示，
   * 并且旁边必须写着「手工核对，可能滞后」。运行期读得到时以状态里的值为准（TODO A4-26）。
   */
  recorded: {
    version: 'v1.6.12',
    basis: '读自本机检出 .bridge-research/DeepTutor-ef2d9e5c/deeptutor/__version__.py（release v1.6.12, 2026-09-27）',
    license: 'Apache-2.0',
  },
  boundary: '本站没有测量过辅导带来的教学收益；「已连通」只说明进程与一次真实回环跑通了，不代表回答正确，也不代表你掌握了。断开期间页面不会伪造模型回复。',
};

/* ======================================================================
 * 英文版（2026-10 中英双语）
 *
 * 与中文那份**同结构、同外链、同数字**：`links[].href`、`recorded.version`、
 * `recorded.license`（Apache-2.0）与 `recorded.basis` 里的本机检出路径一字不改
 * ——它们是可核验的事实，不是文案。只译「说了什么」。
 * ==================================================================== */

export const DEEPTUTOR_INTRO_EN = {
  what: 'DeepTutor is an open-source AI learning workbench from the HKUDS Data Intelligence Lab at the University of Hong Kong, licensed under Apache-2.0. It runs as a separate process, outside this site. It calls itself agent-native: tutoring, problem solving, question generation, retrieval-based research, visualisation and mastery practice live in one extensible runtime, with about a dozen modes (chat / ask / quiz / research / visualise / solve / course learning / mastery path / immersive reading / immersive viewing) sharing one session context. On the knowledge side it can connect engines such as LlamaIndex, PageIndex, GraphRAG, LightRAG, WeKnora, IMA, MarginNote 4, Kiwix and Obsidian; on the tool side it supports MCP servers and community skills (EduHub). This site connects its own “mathematical cognitive space” ontology and planner so that DeepTutor explains, asks and sets problems inside the context of **the mathematical object you chose**.',
  how: [
    { title: 'Same ontology version', detail: 'Tutoring reads the same version of the ontology (M) as the pages: nodes, relations and evidence boundaries agree; it does not tell a second story.' },
    { title: 'Same planner', detail: 'Learning routes are computed by this site’s planner; tutoring does not compute its own. It works only in the context of the node you selected.' },
    { title: 'Feedback writes only to E', detail: 'Model explanations and evaluations can only append events to the learner profile (E); they do not change the ontology (M) and never confirm “mastered” automatically.' },
  ],
  paths: [
    { title: 'In-site adapter', detail: 'The tutoring page calls the DeepTutor backend directly: it injects node context and records turns as local events.' },
    { title: 'Bridge service', detail: 'The other path (local port 3783) carries MCP tools and event registration and is the one that has been verified; the two paths must be read separately.' },
  ],
  /* 外部链接：与中文版逐条对应，`href` 完全相同。 */
  links: [
    { label: 'GitHub repository', href: 'https://github.com/HKUDS/DeepTutor', detail: 'HKUDS/DeepTutor · source, release notes and roadmap' },
    { label: 'Official documentation', href: 'https://deeptutor.info', detail: 'deeptutor.info · installation, configuration and the individual modes' },
    { label: 'Paper', href: 'https://arxiv.org/abs/2604.26962', detail: 'arXiv:2604.26962 — DeepTutor: Towards Agentic Personalized Tutoring (Bingxi Zhao et al., 2026)' },
  ],
  recorded: {
    version: 'v1.6.12',
    basis: 'Read from the local checkout .bridge-research/DeepTutor-ef2d9e5c/deeptutor/__version__.py（release v1.6.12, 2026-09-27）',
    license: 'Apache-2.0',
  },
  boundary: 'This site has not measured any teaching benefit from tutoring; “connected” only means that the process and one real round trip ran through — it does not mean the answers are correct, and it does not mean you have mastered anything. While it is disconnected, the page does not fabricate model replies.',
};

/** 成对的两份介绍：页面用 `useI18n().pick(DEEPTUTOR_INTRO_BY_LOCALE)` 取。 */
export const DEEPTUTOR_INTRO_BY_LOCALE: { zh: typeof DEEPTUTOR_INTRO; en: typeof DEEPTUTOR_INTRO_EN } = {
  zh: DEEPTUTOR_INTRO,
  en: DEEPTUTOR_INTRO_EN,
};
