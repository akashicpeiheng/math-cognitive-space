import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatError, useApi } from '../api';
import { useProfileContext } from '../state';
import { useLearningData } from '../useLearningData';
import { Markdown } from '../components/Markdown';
import { ProgressBar } from '../components/ProgressBar';
import { StatusBadge } from '../components/StatusBadge';
import { ContinueNetwork } from '../components/ContinueNetwork';
import {
  EMPTY_PREFERENCES,
  ENTRY_OPTIONS,
  GOAL_OPTIONS,
  PACE_OPTIONS,
  StartChooser,
  type StartPreferences,
} from '../components/StartChooser';
import {
  consumeFirstVisit,
  isGuideCollapsed,
  readPreferences,
  writeGuideCollapsed,
  writePreferences,
} from '../start-preferences';
import { CaseThumbnail } from '../components/CaseThumbnail';
import { CASE_SECTION_TITLES, describeCase, groupByDiscipline, type CaseMeta } from '../case-catalog';
import { CASE_MATH, mathify, plainMathText } from '../labels';
import { useI18n } from '../i18n';
// `useLabels` 住在 `i18n/useLabels.tsx`：`labels.ts` 是纯数据表，不准 import React。
import { useLabels } from '../i18n/useLabels';
import type { EventView, NodeSummary } from '../types';

/** 成对文案：中文是源语言（**逐字不变**），英文是译文。取用走 `useI18n().pick`。 */
interface Pair<T = string> { zh: T; en: T }

/**
 * 「开始学习」页：首页（六幕动画）之后的第一个落脚点。
 *
 * 首页只讲为什么与愿景；真正开始学需要**切入口**。这一页把入口按角度摊开：
 *
 * - 接着上次（回访者）/ 从原型问题进入（新访客）——沿用原首页的两块；
 * - **按领域 / 按对象类型 / 按角色 / 按案例**：四组筛选入口，全部由本体现场派生，
 *   数字不写死（与 `data/` 脱节时这里会立刻显形）；
 * - **按方式**：路线、结构、回看、方法论、证据五条固定入口；
 * - **冷启动**：没有任何行动能产出的背景节点，只能由学习者先确认，是真正的最小起点。
 *
 * 与首页的分工：首页负责「为什么」，这一页负责「从哪儿进」；学习闭环本身仍在
 * 节点页 / 路线页 / 我的学习里。
 */

/** 一个原型问题的文案（四条：标题、问题、说明、胚子）。 */
interface CaseCopy {
  title: string;
  question: string;
  note: string;
  embryo: string;
}

/**
 * 五个原型问题：`id` / `entry` / `goal` 是**结构**（节点 id，不翻译），
 * 其余文案成对写。中文逐字保留改造前的写法。
 */
const CASES: Array<{ id: string; entry: string; goal: string; copy: Pair<CaseCopy> }> = [
  {
    id: 'limit',
    entry: 'limit:limit-ed',
    goal: 'limit:bridge',
    copy: {
      zh: {
        title: '极限与连续',
        question: '函数极限的定义为什么要先去掉 x=a 这一点？',
        note: '两条入口：ε–δ 直接定义与序列式定义，汇合于 Bridge 定理。',
        embryo: '想算「无限接近时函数值趋向谁」，但代入 x=a 会得到 0/0。',
      },
      en: {
        title: 'Limits and continuity',
        question: 'Why does the definition of a function limit first remove the point x = a?',
        note: 'Two entries — the direct ε–δ definition and the sequential one — meeting at the Bridge theorem.',
        embryo: 'You want to compute “what value the function approaches”, but substituting x = a gives 0/0.',
      },
    },
  },
  {
    id: 'manifold',
    entry: 'manifold:top-manifold',
    goal: 'manifold:claim-max',
    copy: {
      zh: {
        title: 'C^k 与光滑流形',
        question: '什么样的空间才能在上面做微积分？',
        note: '局部坐标、过渡映射与两种泛化方向；C¹ 非 C² 的反例守住边界。',
        embryo: '球面上没有全局坐标，可是每个小片看起来都像平面。',
      },
      en: {
        title: 'C^k and smooth manifolds',
        question: 'What kind of space allows calculus on it?',
        note: 'Local coordinates, transition maps and two directions of generalization; a C¹-but-not-C² counterexample guards the boundary.',
        embryo: 'A sphere has no global coordinates, yet every small patch looks like a plane.',
      },
    },
  },
  {
    id: 'tensor',
    entry: 'tensor:tensor-rs',
    goal: 'tensor:end-iso',
    copy: {
      zh: {
        title: '张量与张量场',
        question: '为什么同一个量换一组基以后，上下指标要按相反方向变换？',
        note: '通用性质、换基规律与 Christoffel 反例；有限维条件不可静默删去。',
        embryo: '换基之后分量变了，但「向量」本身没变——那到底什么没变？',
      },
      en: {
        title: 'Tensors and tensor fields',
        question: 'Why do upper and lower indices transform in opposite directions when the basis changes?',
        note: 'Universal properties, the change-of-basis rule and the Christoffel counterexample; the finite-dimensional condition cannot be silently dropped.',
        embryo: 'After a change of basis the components change, but the “vector” itself does not — so what exactly stays the same?',
      },
    },
  },
  {
    id: 'group',
    entry: 'group:group-concept',
    goal: 'group:cayley',
    copy: {
      zh: {
        title: '群的多来源',
        question: '同一个群为什么可以有完全不同的入口？',
        note: '几何对称、置换与模乘法汇合到公理模板；S₃ 修正交换性过度推广。',
        embryo: '正方形的对称、三个元素的排列、模 5 乘法，看起来毫无关系。',
      },
      en: {
        title: 'Many sources for a group',
        question: 'Why can the same group have completely different entry points?',
        note: 'Geometric symmetry, permutations and modular multiplication meet at the axiom template; S₃ corrects the over-generalization of commutativity.',
        embryo: 'The symmetries of a square, the permutations of three elements, multiplication mod 5 — they look unrelated.',
      },
    },
  },
  {
    id: 'dg',
    entry: 'dg:smooth-manifold',
    goal: 'dg:generalized-stokes-theorem',
    copy: {
      zh: {
        title: '微分几何',
        question: '弯曲空间上怎么才能做微积分？',
        note: '从开集公理到 Stokes 定理的 30 个核心节点；切向量有曲线与导子两种等价定义。',
        embryo: '在弯曲的面上，「方向」和「面积」都失去了平面上的直观。',
      },
      en: {
        title: 'Differential geometry',
        question: 'How can calculus be done on a curved space?',
        note: '30 core nodes from the open-set axioms to Stokes’ theorem; tangent vectors have two equivalent definitions, via curves and via derivations.',
        embryo: 'On a curved surface, “direction” and “area” both lose their flat-plane intuition.',
      },
    },
  },
];

/**
 * 案例标题里的数学记号（LaTeX 源，交给 Markdown 排版）。
 *
 * `labels.ts` 的 `CASE_MATH` 只有中文那一份（纯文本上下文另有 `CASE_LABELS`）；
 * 页面自己的英文标题在这里补齐，避免为了一个字符串去动共享词表。
 */
const CASE_MATH_EN: Record<string, string> = {
  manifold: '$C^k$ and smooth manifolds',
};

/**
 * 卡片上构造类型的显示名。
 *
 * 这里**故意不复用** `labels.ts` 的 `CONSTRUCT_LABELS`：页面的短写法（「误区」「理论」）
 * 与词表的全称（「误区模式」「背景理论」）不同，改成词表会动到中文渲染。
 * 英文则直接取词表的译名，不另写一份。
 */
const CONSTRUCT_NAMES: Record<string, string> = {
  Concept: '概念', Definition: '定义', Claim: '命题', Proof: '证明', Example: '例子',
  Counterexample: '反例', Construction: '构造', Problem: '问题', Method: '方法',
  Representation: '表征', MisconceptionPattern: '误区', Theory: '理论',
};

/**
 * 领域分组的显示名来自 `case-catalog.ts` 的 `CASE_SECTION_TITLES`（单一来源，2026-10 已就位）；
 * `labels.ts` 的 `DISCIPLINE_LABELS` 只登记了 4 个键，作为第二来源兜底；
 * 两边都查不到就**原样显示**，绝不显示空标签。受控词表的值本身不翻译。
 */

/**
 * 页面文案（手册 §1：页面自己的长文案放页面文件里，成对写）。
 *
 * 中文值等于改造前的字面量：多行 JSX 文本在渲染时会把换行折叠成**一个空格**，
 * 因此这里保留了那些空格（例如「…那一条， 点「阅读这条思路」…」）。
 */
const TEXT = {
  title: { zh: '开始学习', en: 'Start learning' },
  intro: {
    zh: '首页讲的是为什么要有这个空间。这一页先不急着推内容：回答三个问题，让入口按你的处境排序； 定完方向，下面的材料按角度摊开，随时可以自己挑。',
    en: 'The home page explains why this space exists. This page does not push content at you: answer three questions and the entries are ordered around your situation;  once the direction is set, the material below is laid out by angle and you can pick at any time.',
  },
  homeLink: { zh: '回看首页动画', en: 'Replay the home animation' },
  introLink: { zh: '这个网站是什么', en: 'What this site is' },
  methodLink: { zh: '学习方法论', en: 'Learning methodology' },
  directHint: { zh: '下面是不经引导的全部入口——想自己挑就直接往下看。', en: 'Below are all the entries without the guide — if you prefer to pick for yourself, just scroll on.' },

  /* —— 接着上次 —— */
  continueTitle: { zh: '接着上次', en: 'Continue where you left off' },
  readingRecords: { zh: '正在读取你的学习记录…', en: 'Reading your learning records…' },
  readyNow: { zh: '现在可以新学', en: 'Ready to learn next' },
  readyWhy: {
    zh: (actionTitle: string, requires: string[]) => `为什么是它：引入它的行动「${actionTitle}」所需条件${requires.length ? `（${requires.join('、')}）` : ''}已全部确认可用。`,
    en: (actionTitle: string, requires: string[]) => `Why this one: every condition required by the action “${actionTitle}” that introduces it${requires.length ? ` (${requires.join(', ')})` : ''} is already confirmed usable.`,
  },
  continueReading: { zh: '继续阅读', en: 'Continue reading' },
  nearestMissing: {
    zh: (missing: string[]) => `还没有条件齐备的节点。最接近可学的是它，只差${missing.join('、')}——先把这些背景确认掉，它就会变成可学。`,
    en: (missing: string[]) => `No node has all its conditions yet. The closest one is this, missing only ${missing.join(', ')} — confirm that background first and it becomes learnable.`,
  },
  confirmFirst: { zh: (title: string) => `先确认：${title}`, en: (title: string) => `Confirm first: ${title}` },
  peekNode: { zh: '先看一眼这个节点', en: 'Take a look at this node' },
  noNextStep: {
    zh: '当前档案里没有可派生的下一步（已登记节点都已确认，或没有登记行动契约）。 可以到',
    en: 'There is no derivable next step for this profile (every registered node is confirmed, or no action contract is registered).  You can go to ',
  },
  noNextStepLink: { zh: '数学对象', en: 'Mathematical objects' },
  noNextStepTail: { zh: '里直接挑一个读。', en: ' and pick one to read.' },
  reviewTitle: { zh: '待回看', en: 'To review' },
  reviewNotUnderstood: { zh: '你标记过「还不懂」；先回看它的边界与反例。', en: 'You marked this as “I don’t get it yet”; review its boundary and counterexamples first.' },
  reviewConfirmed: { zh: '你确认过它可用；回看用来防止只记住结论。', en: 'You confirmed it is usable; reviewing keeps you from remembering only the conclusion.' },
  reviewedTimes: { zh: (count: number) => `（已回看 ${count} 次）`, en: (count: number) => ` (reviewed ${count} time${count === 1 ? '' : 's'})` },
  openReview: { zh: '打开待回看', en: 'Open the review list' },
  reviewEmpty: {
    zh: '还没有待回看的内容。读一个节点并标记「标记已读」或「我还不懂」后，它会出现在这里。',
    en: 'Nothing to review yet. Read a node and mark it “Mark as read” or “I don’t get it yet”, and it appears here.',
  },
  networkSummary: { zh: '查看相关知识（以上次学到的节点为中心）', en: 'Show related knowledge (centred on the node you last studied)' },
  centerLastView: { zh: '上次学到', en: 'Last studied' },
  centerReview: { zh: '待回看的中心', en: 'Centre of the review queue' },
  centerPicked: { zh: '你选的中心', en: 'Centre you picked' },
  centerSuggested: { zh: '建议的中心', en: 'Suggested centre' },
  centerColon: { zh: '：', en: ': ' },
  networkHint: {
    zh: (lastRead: string) => `上下左右各是一个话题；离中心越近，关联越硬。${lastRead}`,
    en: (lastRead: string) => `Each neighbour above, below, left and right is a topic; the closer to the centre, the harder the relation.${lastRead}`,
  },
  lastReadAt: { zh: (time: string) => `最近阅读时间 ${time}。`, en: (time: string) => ` Last read at ${time}.` },
  centerSwitched: { zh: '中心已切到你点的节点。', en: 'The centre is switched to the node you clicked.' },
  backToLastStudy: { zh: '回到上次学习', en: 'Back to the last studied node' },
  noProfileLead: { zh: '还没有选择档案。', en: 'No profile is selected yet.' },
  noProfileLink: { zh: '新建一个档案', en: 'Create a profile' },
  noProfileTail: {
    zh: '后，这里会记住你读到哪、下一步可以学什么； 新档案从不预设你会什么。也可以先直接读，需要保存时再建档案。',
    en: ' and this page remembers where you stopped and what you can learn next;  a new profile never presumes what you know. You can also read first and create a profile when you need to save.',
  },

  /* —— 从原型问题进入 —— */
  casesTitle: { zh: '从原型问题进入', en: 'Enter from a prototype question' },
  casesIntro: {
    zh: '每条思路都从一个具体的困惑（「胚子」）长到规范形式。选最像你此刻问题的那一条， 点「阅读这条思路」开始；节点数、反例与证据等级都收在「案例详情」里。',
    en: 'Every route grows from a concrete confusion (an “embryo”) into canonical form. Pick the one closest to your question and click “Read this route”; node counts, counterexamples and evidence levels are kept under “Case details”.',
  },
  sectionMeta: {
    zh: (cases: number, nodes: number) => `${cases} 条思路 · ${nodes} 个节点`,
    en: (cases: number, nodes: number) => `${cases} route${cases === 1 ? '' : 's'} · ${nodes} node${nodes === 1 ? '' : 's'}`,
  },
  embryoTag: { zh: '胚子', en: 'Embryo' },
  readRoute: { zh: '阅读这条思路', en: 'Read this route' },
  peekRoute: { zh: '先看路线', en: 'See the route first' },
  caseDetails: { zh: '案例详情', en: 'Case details' },
  caseNodeCount: { zh: (count: number) => `${count} 节点`, en: (count: number) => `${count} nodes` },
  caseNodeCountTitle: { zh: (count: number) => `本案例登记 ${count} 个节点`, en: (count: number) => `This case registers ${count} nodes` },
  constructsTitle: { zh: '按构造类型统计的节点数', en: 'Node count by construct type' },
  counterexampleTag: { zh: '反例', en: 'Counterexample' },
  misconceptionTag: { zh: '误区', en: 'Misconception' },
  caseStats: {
    zh: (actions: number, relations: number, evidence: Array<{ status: string; count: number }>) => `${actions} 个行动契约 · ${relations} 条登记关系${evidence.length ? ` · 证据等级 ${evidence.map((item) => `${item.status} ${item.count}`).join('、')}` : ''}`,
    en: (actions: number, relations: number, evidence: Array<{ status: string; count: number }>) => `${actions} action contract${actions === 1 ? '' : 's'} · ${relations} registered relation${relations === 1 ? '' : 's'}${evidence.length ? ` · evidence levels ${evidence.map((item) => `${item.status} ${item.count}`).join(', ')}` : ''}`,
  },
  browseAllNodes: { zh: (count: number) => `浏览全部 ${count} 个节点`, en: (count: number) => `Browse all ${count} nodes` },

  /* —— 各个角度的切入口 —— */
  anglesTitle: { zh: '各个角度的切入口', en: 'Entry points from every angle' },
  anglesIntro: {
    zh: '同一个知识库，可以从分支、对象类型、角色或来源进入，也可以按路线、结构、回看、 方法论与证据进入。下面的数字都由本体现场派生，不写死。',
    en: 'The same knowledge base can be entered by branch, object type, role or source, and also by route, structure, review,  methodology and evidence. The numbers below are all derived from the ontology on the spot, never hard-coded.',
  },
  angleDisciplineTitle: { zh: '按领域', en: 'By field' },
  angleDisciplineLead: { zh: '在某个数学分支里找一个此刻读得动的对象。', en: 'Find an object you can read right now within a branch of mathematics.' },
  angleConstructTitle: { zh: '按对象类型', en: 'By object type' },
  angleConstructLead: { zh: '想先看定义、先看反例，还是先看一条方法，进入的方式不一样。', en: 'Whether you want definitions, counterexamples or a method first, the way in differs.' },
  angleRoleTitle: { zh: '按角色', en: 'By role' },
  angleRoleLead: { zh: '同一个对象可以既是概念又是公理；按它在本体里承担的角色筛。', en: 'One object can be both a concept and an axiom; filter by the role it plays in the ontology.' },
  angleCaseTitle: { zh: '按案例', en: 'By case' },
  angleCaseLead: { zh: '每条贯通案例的完整节点清单，适合已经决定读某条思路之后。', en: 'The full node list of each end-to-end case, for once you have decided which route to read.' },
  chipTitle: { zh: (label: string, count: number) => `${label}：${count} 个节点`, en: (label: string, count: number) => `${label}: ${count} nodes` },
  browseAllObjects: { zh: (count: number) => `或直接浏览全部 ${count} 个对象`, en: (count: number) => `Or browse all ${count} objects` },
  coldStartTitle: { zh: '没有前置的起点', en: 'Starting points with no prerequisites' },
  coldStartNote: {
    zh: '这些背景节点没有任何行动能产出，因此不会被任何路线推出来——只能由你自己确认「我确实会」。 确认之后，依赖它们的内容才会变成可以学的。',
    en: 'No action can produce these background nodes, so no route can ever derive them — only you can confirm “I really know this”.  Once confirmed, the material that depends on them becomes learnable.',
  },

  /* —— 给研究者 / 系统状态 / 最近事件 —— */
  forResearchers: { zh: '给研究者', en: 'For researchers' },
  forResearchersNote: { zh: '专稿覆盖清单、36 个局部化算子与证据重放不对应学习进度，放在研究台里。', en: 'The monograph coverage list, the 36 localization operators and evidence replay do not map to learning progress and live on the research bench.' },
  openLab: { zh: '打开研究台', en: 'Open the research bench' },
  systemStatus: { zh: '系统状态', en: 'System status' },
  ontologyVersion: { zh: '本体版本', en: 'Ontology version' },
  registeredNodes: { zh: '登记节点', en: 'Registered nodes' },
  learningEvents: { zh: '学习事件', en: 'Learning events' },
  tutorEntry: { zh: '辅导入口', en: 'Tutoring entry' },
  tutorConnected: { zh: '已连通并验证', en: 'Connected and verified' },
  tutorReachable: { zh: '后端可达，未验证', en: 'Backend reachable, not verified' },
  tutorDisconnected: { zh: '未连接', en: 'Not connected' },
  connecting: { zh: '正在连接本机服务…', en: 'Connecting to the local service…' },
  recentEvents: { zh: '最近学习事件', en: 'Recent learning events' },
  currentProfile: { zh: (name: string) => `当前档案：${name}`, en: (name: string) => `Current profile: ${name}` },
  recentPickProfile: { zh: '选择或新建档案后，这里显示最近事件。新的档案从未指定开始。', en: 'Select or create a profile and recent events appear here. A new profile starts from “never specified”.' },
  loading: { zh: '加载中…', en: 'Loading…' },
  recentEmpty: { zh: '还没有事件。浏览节点不会自动把节点标记为已掌握。', en: 'No events yet. Browsing a node never marks it as mastered automatically.' },
};

/** 带标记（`<strong>` / `<Link>`）的段落：成对写成返回 JSX 的函数，中文分支逐字照抄原排版。 */
const RICH = {
  angleNote: {
    zh: (topicCount: number) => (
      <>
        数字按<strong>单元</strong>计（最小的可独立认知单元）；另有 {topicCount} 条话题级条目
        （一节或一章的范围），在数学对象列表里把「条目粒度」切到「话题」即可看到。
        学科按知识的本质领域分类（分析 / 拓扑 / 微分几何 / 代数…），来源（哪本教材）是另一栏筛选。
      </>
    ),
    en: (topicCount: number) => (
      <>
        Numbers count <strong>units</strong> (the smallest independently knowable unit); in addition there are {topicCount} topic-level
        entries (the scope of a section or chapter), visible by switching “entry granularity” to “topics” in the object list.
        Fields classify knowledge by its essential domain (analysis / topology / differential geometry / algebra …); the source (which textbook) is a separate filter.
      </>
    ),
  },
};

interface AngleItem {
  key: string;
  label: string;
  count: number;
  to: string;
}

interface AngleGroup {
  id: string;
  title: string;
  lead: string;
  items: AngleItem[];
}

/** 按某个字段统计节点数；数字全部现场派生，不写死。 */
function countBy(nodes: NodeSummary[], pick: (node: NodeSummary) => string[]): Array<{ key: string; count: number }> {
  const counts = new Map<string, number>();
  nodes.forEach((node) => {
    pick(node).forEach((key) => counts.set(key, (counts.get(key) ?? 0) + 1));
  });
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

export function StartPage() {
  const { locale, pick, fmtDate, t, hrefFor, isPending } = useI18n();
  const labels = useLabels();
  /**
   * 偏好引导的答案：只存在本机（`localStorage`），**不写学习者档案 E**。
   *
   * 回访者直接看到上次的结论（`decided=true`，仍可「改一改」）；
   * 第一次进来是空的，三问按渐进披露一次问一个。
   *
   * 2026-10（TODO A4-24 / A4-25）：读写搬到 `web/src/start-preferences.ts`，
   * 与「收起标记」「来过标记」放在一起——`/plan` 也要读同一份偏好（A4-23），
   * 逻辑留在页面里会让两处各写一遍。
   */
  const [preferences, setPreferences] = useState<StartPreferences>(() => readPreferences());
  const [guideCollapsed, setGuideCollapsed] = useState<boolean>(() => isGuideCollapsed());
  /**
   * 首访 / 回访：**在挂载时消费一次**「来过」标记。
   * 这一次渲染按「之前来过没有」决定默认起点，随后的渲染都按回访算——
   * 不用 state 存「是不是首访」，避免刷新后同一份标记被读两次得到不同结论。
   */
  const [visitedBefore] = useState<boolean>(() => !consumeFirstVisit());
  const preferencesDecided = preferences.goal !== null && preferences.entry !== null && preferences.pace !== null;
  const savePreferences = (next: StartPreferences) => {
    setPreferences(next);
    writePreferences(next);
  };
  const resetPreferences = () => savePreferences(EMPTY_PREFERENCES);
  /**
   * 「先收起引导」与「重新显示引导」（TODO A4-24）：只动本机标记，**不动偏好**。
   * 落盘与 React 状态是两件事，因此这里显式各写一次（顺序无所谓，但两个都要做）。
   */
  const collapseGuide = () => { writeGuideCollapsed(true); setGuideCollapsed(true); };
  const expandGuide = () => { writeGuideCollapsed(false); setGuideCollapsed(false); };
  const { profileId, profile, health } = useProfileContext();
  const { progress, graph, events, loading: learningLoading, error: learningError } = useLearningData();
  const titleOf = (nodeId: string) => graph?.nodes.find((node) => node.id === nodeId)?.title ?? nodeId;
  const firstReady = progress?.ready[0] ?? null;
  const nextReview = progress?.reviewQueue[0] ?? null;
  // 冷启动时 ready 为空：给出「差得最少」的节点与具体缺什么，避免只留一句抽象提示。
  const nearest = progress?.blocked[0] ?? null;
  // 背景节点没有任何行动能够产出，所以必须由学习者先确认；这是最实际的起点。
  const backgroundCandidates = (graph?.nodes ?? []).filter((node) => node.case === 'background' && !progress?.confirmedNodes.has(node.id)).slice(0, 6);
  /**
   * 上次学习的节点 = 最近一条 `view` 事件对应的节点。
   *
   * 接口返回的是**时间升序**（`server/db.mjs` 的 `listEvents` 在 `ORDER BY seq DESC`
   * 之后又 `.reverse()` 了一次），因此最近的排在**最后**，要取最后一个匹配项。
   */
  const lastStudied = useMemo(() => {
    const matches = events.filter((event) => event.kind === 'view' && event.nodeId
      && graph?.nodes.some((node) => node.id === event.nodeId));
    const latest = matches.length > 0 ? matches[matches.length - 1] : null;
    if (latest) return { node: latest.nodeId, source: 'last-view' as const, at: latest.occurredAt };
    if (nextReview) return { node: nextReview.node, source: 'review' as const, at: null };
    if (firstReady) return { node: firstReady.node, source: 'ready' as const, at: null };
    return null;
  }, [events, graph, nextReview, firstReady]);
  // 中心节点可由点击邻居切换：让学习者顺着关联走，而不必回列表里找。
  const [centerOverride, setCenterOverride] = useState<string | null>(null);
  useEffect(() => { setCenterOverride(null); }, [profileId, lastStudied?.node]);
  const centerId = centerOverride ?? lastStudied?.node ?? null;
  const centerSource = centerOverride ? 'picked' : lastStudied?.source ?? null;
  /** 原型问题的归类与充实：全部由本体现场派生，见 case-catalog.ts。 */
  const caseMetas = useMemo<CaseMeta[]>(
    () => CASES.map((item) => ({ id: item.id, entry: item.entry, goal: item.goal, ...pick(item.copy) })),
    [locale], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const caseSections = useMemo(
    () => groupByDiscipline(caseMetas.map((meta) => describeCase(meta, graph?.nodes ?? [], locale)), locale),
    [caseMetas, graph, locale],
  );
  /**
   * 学科显示名：先查 `case-catalog.ts` 的分组名成对表（单一来源），
   * 再查 `labels.ts` 的 `DISCIPLINE_LABELS`（只登记了 4 个键），最后**原样显示**——
   * 绝不显示空标签。中文侧三处逐字相同。
   */
  const disciplineName = (value: string) => (
    CASE_SECTION_TITLES[value]?.[locale] ?? labels.tables.disciplines[value] ?? value
  );
  /** 卡片上构造类型的显示名：中文用页面的短写法，英文用词表译名。 */
  const constructName = (value: string) => (
    locale === 'en' ? (labels.tables.constructs[value] ?? value) : (CONSTRUCT_NAMES[value] ?? value)
  );
  /** 各角度的筛选入口：领域、对象类型、角色、案例，全部由本体现场派生。 */
  /*
   * 角度入口的计数只算**单元**（2026-10 改）。
   *
   * 这些 chip 是「进列表」的入口，而列表默认档就是单元；用含话题的全量去计数，
   * chip 会说 74、点进去只看到 64——两个口径不一致（实测就是这么发现的）。
   * 话题层单独用一句话说明，不混进计数。
   */
  /** 话题级条目条数：全量节点数减去单元数（两者都由接口下发，不写死）。 */
  const topicCount = useMemo(
    () => (graph?.nodes ?? []).filter((node) => node.granularity === 'topic').length,
    [graph],
  );
  const angleGroups = useMemo<AngleGroup[]>(() => {
    const nodes = (graph?.nodes ?? []).filter((node) => (node.granularity ?? 'unit') === 'unit');
    return [
      {
        id: 'discipline',
        title: pick(TEXT.angleDisciplineTitle),
        lead: pick(TEXT.angleDisciplineLead),
        items: countBy(nodes, (node) => [node.discipline]).map((item) => ({
          key: item.key,
          label: disciplineName(item.key),
          count: item.count,
          to: `/nodes?discipline=${encodeURIComponent(item.key)}`,
        })),
      },
      {
        id: 'construct',
        title: pick(TEXT.angleConstructTitle),
        lead: pick(TEXT.angleConstructLead),
        items: countBy(nodes, (node) => [node.construct]).map((item) => ({
          key: item.key,
          label: labels.constructLabel(item.key),
          count: item.count,
          to: `/nodes?construct=${encodeURIComponent(item.key)}`,
        })),
      },
      {
        id: 'role',
        title: pick(TEXT.angleRoleTitle),
        lead: pick(TEXT.angleRoleLead),
        items: countBy(nodes, (node) => node.roles).map((item) => ({
          key: item.key,
          label: labels.roleLabel(item.key),
          count: item.count,
          to: `/nodes?role=${encodeURIComponent(item.key)}`,
        })),
      },
      {
        id: 'case',
        title: pick(TEXT.angleCaseTitle),
        lead: pick(TEXT.angleCaseLead),
        items: countBy(nodes, (node) => [node.case]).map((item) => ({
          key: item.key,
          // 纯文本上下文（不是 Markdown）：用 Unicode 上标，别把 C^k 原样显示成带脱字符的样子。
          label: plainMathText(labels.tables.cases[item.key] ?? item.key),
          count: item.count,
          to: `/nodes?case=${encodeURIComponent(item.key)}`,
        })),
      },
    ];
  }, [graph, locale, labels]); // eslint-disable-line react-hooks/exhaustive-deps

  const returning = Boolean(profileId && progress);
  /**
   * 「回访」对**默认起点**的口径（TODO A4-25）：本机来过，或者已经有学习记录。
   *
   * 为什么要两个条件：只看来过标记的话，换一台机器（或清过站点数据）的老学习者会拿到首访默认；
   * 只看学习记录的话，一个还没建档案但已经翻过几遍的人又会被当成首访。
   * 两个条件任一成立就按回访给默认——依据写在结论里，不藏。
   */
  const returningForPlan = visitedBefore || returning;

  const continueCard = (
    <section id="continue" className="card continue-card">
      <h2>{pick(TEXT.continueTitle)}</h2>
      {profileId && learningLoading && <p>{pick(TEXT.readingRecords)}</p>}
      {profileId && learningError && <p className="error">{learningError}</p>}
      {profileId && progress && (
        <>
          <div className="continue-grid">
            <div className="continue-block">
              <h3>{pick(TEXT.readyNow)}</h3>
              {firstReady ? (
                <>
                  <p>
                    <Link className={`continue-title${isPending(titleOf(firstReady.node)) ? ' i18n-pending' : ''}`} title={isPending(titleOf(firstReady.node)) ? t('i18n.pendingTitle') : undefined} to={hrefFor(`/nodes/${encodeURIComponent(firstReady.node)}`)}>{titleOf(firstReady.node)}</Link>
                  </p>
                  <p className="muted">
                    {pick(TEXT.readyWhy)(firstReady.actionTitle, firstReady.requires.map(titleOf))}
                  </p>
                  <Link className="button primary" to={hrefFor(`/nodes/${encodeURIComponent(firstReady.node)}`)}>{pick(TEXT.continueReading)}</Link>
                </>
              ) : nearest ? (
                <>
                  <p className="muted">
                    {pick(TEXT.nearestMissing)(nearest.missing.map(titleOf))}
                  </p>
                  <p><Link className={`continue-title${isPending(titleOf(nearest.node)) ? ' i18n-pending' : ''}`} title={isPending(titleOf(nearest.node)) ? t('i18n.pendingTitle') : undefined} to={hrefFor(`/nodes/${encodeURIComponent(nearest.node)}`)}>{titleOf(nearest.node)}</Link></p>
                  <div className="card-actions">
                    <Link className="button primary" to={hrefFor(`/nodes/${encodeURIComponent(nearest.missing[0])}`)}>{pick(TEXT.confirmFirst)(titleOf(nearest.missing[0]))}</Link>
                    <Link className="button" to={hrefFor(`/nodes/${encodeURIComponent(nearest.node)}`)}>{pick(TEXT.peekNode)}</Link>
                  </div>
                </>
              ) : (
                <p className="muted">
                  {pick(TEXT.noNextStep)}<Link to={hrefFor('/nodes')}>{pick(TEXT.noNextStepLink)}</Link>{pick(TEXT.noNextStepTail)}
                </p>
              )}
            </div>
            <div className="continue-block">
              <h3>{pick(TEXT.reviewTitle)}</h3>
              {nextReview ? (
                <>
                  <p>
                    <Link className={`continue-title${isPending(nextReview.title) ? ' i18n-pending' : ''}`} title={isPending(nextReview.title) ? t('i18n.pendingTitle') : undefined} to={hrefFor(`/nodes/${encodeURIComponent(nextReview.node)}`)}>{nextReview.title}</Link>
                  </p>
                  <p className="muted">
                    {nextReview.reason === 'read-not-understood'
                      ? pick(TEXT.reviewNotUnderstood)
                      : pick(TEXT.reviewConfirmed)}
                    {nextReview.reviewCount > 0 ? pick(TEXT.reviewedTimes)(nextReview.reviewCount) : ''}
                  </p>
                  <Link className="button" to={hrefFor('/profile?tab=review')}>{pick(TEXT.openReview)}</Link>
                </>
              ) : (
                <p className="muted">{pick(TEXT.reviewEmpty)}</p>
              )}
            </div>
          </div>
          <ProgressBar counts={progress.counts} />

          {/* 邻域网络是参考材料，默认折叠；需要时展开。 */}
          {graph && centerId && (
            <details className="continue-network-details">
              <summary>{pick(TEXT.networkSummary)}</summary>
              <div className="continue-network-block">
                <div className="continue-network-head">
                  <h3>
                    {centerSource === 'last-view' ? pick(TEXT.centerLastView)
                      : centerSource === 'review' ? pick(TEXT.centerReview)
                        : centerSource === 'picked' ? pick(TEXT.centerPicked) : pick(TEXT.centerSuggested)}
                    {pick(TEXT.centerColon)}<Link className={isPending(titleOf(centerId)) ? 'i18n-pending' : undefined} title={isPending(titleOf(centerId)) ? t('i18n.pendingTitle') : undefined} to={hrefFor(`/nodes/${encodeURIComponent(centerId)}`)}>{titleOf(centerId)}</Link>
                  </h3>
                  <p className="muted">
                    {pick(TEXT.networkHint)(lastStudied?.at ? pick(TEXT.lastReadAt)(fmtDate(lastStudied.at)) : '')}
                  </p>
                </div>
                <ContinueNetwork
                  centerId={centerId}
                  graph={graph}
                  confirmed={progress?.confirmedNodes ?? new Set<string>()}
                  onPick={(node) => setCenterOverride(node)}
                />
                {centerOverride && (
                  <p className="muted">
                    {pick(TEXT.centerSwitched)}<button className="link-button" onClick={() => setCenterOverride(null)}>{pick(TEXT.backToLastStudy)}</button>
                  </p>
                )}
              </div>
            </details>
          )}
        </>
      )}
      {!profileId && (
        <p className="notice">
          {pick(TEXT.noProfileLead)}<Link to={hrefFor('/profile')}>{pick(TEXT.noProfileLink)}</Link>{pick(TEXT.noProfileTail)}
        </p>
      )}
    </section>
  );

  const casesSection = (
    <section id="cases">
      <div className="section-heading">
        <h2>{pick(TEXT.casesTitle)}</h2>
        <p>
          {pick(TEXT.casesIntro)}
        </p>
      </div>
      {caseSections.map((section) => (
        <div className="discipline-section" key={section.id}>
          <div className="discipline-head">
            {/* `groupByDiscipline(details, locale)` 已经把分组名按语种取好，这里不再二次翻译。 */}
            <h3>{section.title}</h3>
            <span className="discipline-meta">
              {pick(TEXT.sectionMeta)(section.cases.length, section.nodeCount)}
            </span>
          </div>
          <div className="case-grid">
            {section.cases.map((detail) => (
              <article className="card case-card" key={detail.meta.id}>
                <CaseThumbnail caseId={detail.meta.id} />
                <div className="case-head">
                  {/* 标题含 C^k 这类数学记号：不过 Markdown 会被 GFM 当成上标语法，
                      渲染成「C^K」这种带脱字符的错样子。CASE_MATH 给出 LaTeX 源。 */}
                  <Markdown className="case-eyebrow">{`**${(locale === 'en' ? CASE_MATH_EN[detail.meta.id] : CASE_MATH[detail.meta.id]) ?? detail.meta.title}**`}</Markdown>
                </div>
                {/* 标题与摘要含 C^k、ε–δ、S₃ 等 LaTeX 源，必须走 Markdown 才能排版。 */}
                <Markdown className="case-question">{`### ${detail.meta.question}`}</Markdown>
                <p className="case-embryo">
                  <span className="case-embryo-tag">{pick(TEXT.embryoTag)}</span>
                  <Markdown className="inline-markdown">{mathify(detail.meta.embryo)}</Markdown>
                </p>
                <div className="card-actions">
                  <Link className="button primary" to={hrefFor(`/nodes/${encodeURIComponent(detail.meta.entry)}`)}>{pick(TEXT.readRoute)}</Link>
                  <Link className="button" to={hrefFor(`/plan?goal=${encodeURIComponent(detail.meta.goal)}`)}>{pick(TEXT.peekRoute)}</Link>
                </div>
                <details className="case-details">
                  <summary>
                    {pick(TEXT.caseDetails)} · <span className="case-node-count" title={pick(TEXT.caseNodeCountTitle)(detail.nodeCount)}>{pick(TEXT.caseNodeCount)(detail.nodeCount)}</span>
                  </summary>
                  <Markdown>{mathify(detail.meta.note)}</Markdown>

                  {/* 学科分布：一条思路可以横跨多个领域，这里如实列出全部。 */}
                  <ul className="case-disciplines">
                    {detail.disciplines.map((item) => (
                      <li key={item.name}>
                        <span className="case-discipline-name">{disciplineName(item.name)}</span>
                        <span className="case-bar" aria-hidden="true">
                          <i style={{ width: `${Math.round((item.count / Math.max(detail.nodeCount, 1)) * 100)}%` }} />
                        </span>
                        <span className="case-count">{item.count}</span>
                      </li>
                    ))}
                  </ul>

                  {/* 构造分布：这条思路由哪些部件构成。 */}
                  <ul className="case-constructs" title={pick(TEXT.constructsTitle)}>
                    {detail.constructs.map((item) => (
                      <li key={item.construct}>
                        <span className="case-chip">{constructName(item.construct)}</span>
                        <span className="case-count">{item.count}</span>
                      </li>
                    ))}
                  </ul>

                  {/* 反例与误区：条件边界与常见误解，都是语料里已登记的。
                      节点标题本身常以「误区：」开头，而标签已经写了「误区」，
                      这里去掉重复的前缀，避免出现「误区 误区：收敛序列…」。 */}
                  {detail.counterexamples.length > 0 && (
                    <p className="case-guard">
                      <span className="case-guard-tag">{pick(TEXT.counterexampleTag)}</span>
                      {detail.counterexamples.map((item) => (
                        <Link key={item.id} className={isPending(item.title) ? 'i18n-pending' : undefined} to={hrefFor(`/nodes/${encodeURIComponent(item.id)}`)} title={item.title}>
                          <Markdown className="inline-markdown">{mathify(item.title.replace(/^(误区|反例)[：:]\s*/, ''))}</Markdown>
                        </Link>
                      ))}
                    </p>
                  )}
                  {detail.misconceptions.length > 0 && (
                    <p className="case-guard">
                      <span className="case-guard-tag">{pick(TEXT.misconceptionTag)}</span>
                      {detail.misconceptions.map((item) => (
                        <Link key={item.id} className={isPending(item.title) ? 'i18n-pending' : undefined} to={hrefFor(`/nodes/${encodeURIComponent(item.id)}`)} title={item.title}>
                          <Markdown className="inline-markdown">{mathify(item.title.replace(/^(误区|反例)[：:]\s*/, ''))}</Markdown>
                        </Link>
                      ))}
                    </p>
                  )}

                  <p className="case-stats">
                    {pick(TEXT.caseStats)(detail.actionCount, detail.relationCount, detail.evidence)}
                  </p>
                  <div className="card-actions">
                    <Link className="button ghost" to={hrefFor(`/nodes?case=${encodeURIComponent(detail.meta.id)}`)}>{pick(TEXT.browseAllNodes)(detail.nodeCount)}</Link>
                  </div>
                </details>
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  );

  const anglesSection = (
    <section id="angles">
      <div className="section-heading">
        <h2>{pick(TEXT.anglesTitle)}</h2>
        <p>
          {pick(TEXT.anglesIntro)}
        </p>
        <p className="muted">
          {/*
            计数只算单元，这句说明话题层去哪儿了——不写它，用户会以为「按领域」的 64 就是全部。
          */}
          {RICH.angleNote[locale === 'en' ? 'en' : 'zh'](topicCount)}
        </p>
      </div>

      <div className="angle-grid">
        {angleGroups.map((group) => (
          <article className="card angle-card" key={group.id} data-angle={group.id}>
            <h3>{group.title}</h3>
            <p className="muted">{group.lead}</p>
            <ul className="angle-items">
              {group.items.map((item) => (
                <li key={item.key}>
                  <Link className="angle-chip" to={hrefFor(item.to)} title={pick(TEXT.chipTitle)(item.label, item.count)}>
                    <span className={`angle-chip-label${isPending(item.label) ? ' i18n-pending' : ''}`}>{item.label}</span>
                    <span className="angle-chip-count">{item.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="angle-more">
              <Link to={hrefFor('/nodes')}>{pick(TEXT.browseAllObjects)(graph?.nodes.length ?? 0)}</Link>
            </p>
          </article>
        ))}
      </div>

      <div className="angle-grid angle-grid-modes">
        {ENTRY_MODES.map((mode) => (
          <article className="card angle-card angle-mode" key={mode.id} data-mode={mode.id}>
            <h3>{pick(mode.copy).title}</h3>
            <p className="muted">{pick(mode.copy).detail}</p>
            <Link className="button" to={hrefFor(mode.to)}>{pick(mode.copy).cta}</Link>
          </article>
        ))}
      </div>

      {/* 冷启动：没有任何行动能产出的节点，只能由学习者先确认，是真正的最小起点。 */}
      {backgroundCandidates.length > 0 && (
        <div className="card angle-cold-start" id="cold-start">
          <h3>{pick(TEXT.coldStartTitle)}</h3>
          <p className="muted">
            {pick(TEXT.coldStartNote)}
          </p>
          <ul className="angle-items">
            {backgroundCandidates.map((node) => (
              <li key={node.id}>
                {/* chip 的 title 已经写了「学科」，回落中文的标记只加在文本上（不夺走那条说明）。 */}
                <Link className="angle-chip" to={hrefFor(`/nodes/${encodeURIComponent(node.id)}`)} title={disciplineName(node.discipline)}>
                  <span className={`angle-chip-label${isPending(node.title) ? ' i18n-pending' : ''}`}>{plainMathText(node.title)}</span>
                  <span className={`angle-chip-count${isPending(node.discipline) ? ' i18n-pending' : ''}`}>{disciplineName(node.discipline)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );

  return (
    <div className="page start-page">
      <header className="start-head">
        <h1>{pick(TEXT.title)}</h1>
        <p className="muted">
          {pick(TEXT.intro)}
        </p>
        <p className="start-head-links">
          <Link to={hrefFor('/')}>{pick(TEXT.homeLink)}</Link>
          <span className="muted"> · </span>
          <Link to={hrefFor('/intro')}>{pick(TEXT.introLink)}</Link>
          <span className="muted"> · </span>
          <Link to={hrefFor('/method')}>{pick(TEXT.methodLink)}</Link>
        </p>
      </header>

      {/*
        偏好引导放在最前面：先定方向，再看材料。
        它是**排序**而不是门禁——下面的案例、四组角度入口、五条「按方式」入口一条都没有删。
      */}
      <StartChooser
        preferences={preferences}
        onChange={savePreferences}
        onReset={resetPreferences}
        decided={preferencesDecided}
        returning={returningForPlan}
        collapsed={guideCollapsed}
        onCollapse={collapseGuide}
        onExpand={expandGuide}
      />

      <p className="start-direct-hint" id="direct">
        {pick(TEXT.directHint)}
      </p>

      {/* 回访者先看到自己的下一步；新访客先看到「从问题进入」。 */}
      {returning && continueCard}
      {casesSection}
      {anglesSection}
      {!returning && continueCard}

      <section className="card">
        <h2>{pick(TEXT.forResearchers)}</h2>
        <p className="muted">{pick(TEXT.forResearchersNote)}</p>
        <Link className="button ghost" to={hrefFor('/lab')}>{pick(TEXT.openLab)}</Link>
      </section>

      <section className="two-column">
        <div className="card">
          <h2>{pick(TEXT.systemStatus)}</h2>
          {health ? (
            <dl className="facts">
              <div><dt>{pick(TEXT.ontologyVersion)}</dt><dd><code>{health.ontology.contentHash.slice(0, 20)}…</code></dd></div>
              <div><dt>{pick(TEXT.registeredNodes)}</dt><dd>{String((health.ontology.counts as { nodes?: number }).nodes ?? '—')}</dd></div>
              <div><dt>{pick(TEXT.learningEvents)}</dt><dd>{health.db.events}</dd></div>
              <div><dt>{pick(TEXT.tutorEntry)}</dt><dd><StatusBadge status={health.tutor.available ? 'passed' : 'not_run'} label={health.tutor.available ? (health.tutor.liveVerified ? pick(TEXT.tutorConnected) : pick(TEXT.tutorReachable)) : pick(TEXT.tutorDisconnected)} /></dd></div>
            </dl>
          ) : <p>{pick(TEXT.connecting)}</p>}
        </div>
        <div className="card">
          <h2>{pick(TEXT.recentEvents)}</h2>
          <RecentEvents profileId={profileId} />
        </div>
      </section>

      {profile && <p className="muted">{pick(TEXT.currentProfile)(profile.name)}</p>}
    </div>
  );
}

/** 「按方式」的固定入口：每条对应站内一个既有页面，不新造功能。 */
const ENTRY_MODES: Array<{ id: string; to: string; copy: Pair<{ title: string; detail: string; cta: string }> }> = [
  {
    id: 'plan',
    to: '/plan',
    copy: {
      zh: { title: '按目标与背景规划路线', detail: '给一个目标、声明你已经会的，比较候选路线各自用了哪些假设。', cta: '打开学习路线' },
      en: {
        title: 'Plan a route from goal and background',
        detail: 'Give a goal, declare what you already know, and compare which assumptions each candidate route uses.',
        cta: 'Open the learning route',
      },
    },
  },
  {
    id: 'network',
    to: '/network',
    copy: {
      zh: { title: '按结构看关系', detail: '从空开始加法式组网：谁能接上谁、哪条边更硬、哪条只是类比。', cta: '组建网络' },
      en: {
        title: 'Look at relations by structure',
        detail: 'Build the network additively from empty: what connects to what, which edge is harder, which is only an analogy.',
        cta: 'Build the network',
      },
    },
  },
  {
    id: 'review',
    to: '/profile?tab=review',
    copy: {
      zh: { title: '按回看补没懂的地方', detail: '待回看只列你标记过「还不懂」或确认过的节点，不编造到期日。', cta: '打开待回看' },
      en: {
        title: 'Fill the gaps by reviewing',
        detail: 'The review list contains only nodes you marked “I don’t get it yet” or confirmed; no due dates are invented.',
        cta: 'Open the review list',
      },
    },
  },
  {
    id: 'method',
    to: '/method',
    copy: {
      zh: { title: '按学习方法论', detail: '跨分支通用的八条原则：动机溯源、删掉条件会怎样、保留试错。', cta: '看方法论' },
      en: {
        title: 'By learning methodology',
        detail: 'Eight principles that work across branches: trace the motivation, ask what breaks if a condition is dropped, keep the trial and error.',
        cta: 'Read the methodology',
      },
    },
  },
  {
    id: 'evidence',
    to: '/lab',
    copy: {
      zh: { title: '按证据与研究边界', detail: '覆盖清单、36 个局部化算子与证据重放，以及明确不声称的范围。', cta: '打开研究台' },
      en: {
        title: 'By evidence and research boundaries',
        detail: 'The coverage list, the 36 localization operators, evidence replay, and the scope explicitly not claimed.',
        cta: 'Open the research bench',
      },
    },
  },
];

function RecentEvents({ profileId }: { profileId: string | null }) {
  const { pick, fmtDate, t, isPending, hrefFor } = useI18n();
  const labels = useLabels();
  const events = useApi<{ events: EventView[] }>(profileId ? `/profiles/${profileId}/events?limit=6` : null, [profileId]);
  // 事件里只有节点 id；学习者需要看到标题。标题来自只读本体，不影响任何写入。
  const nodes = useApi<{ nodes: NodeSummary[] }>(profileId ? '/ontology/nodes?limit=500' : null, [profileId]);
  const titleOfEvent = (nodeId: string) => nodes.data?.nodes.find((node) => node.id === nodeId)?.title ?? nodeId;
  if (!profileId) return <p>{pick(TEXT.recentPickProfile)}</p>;
  if (events.loading) return <p>{pick(TEXT.loading)}</p>;
  if (events.error) return <p className="error">{formatError(events.error)}</p>;
  if (!events.data?.events.length) return <p>{pick(TEXT.recentEmpty)}</p>;
  return (
    <ul className="event-list">
      {[...events.data.events].reverse().map((event) => {
        const title = titleOfEvent(event.nodeId);
        return (
          <li key={event.eventId}>
            <StatusBadge
              status={event.kind === 'confirmation' ? (event.payload?.confirmed === false ? 'unknown' : 'passed') : event.kind}
              label={labels.eventKindLabel(event.kind)}
              title={event.kind}
            />
            {/* 英文站上本体标题还没译时回落中文：如实标注，不假装已翻译。 */}
            <Link
              className={`event-node${isPending(title) ? ' i18n-pending' : ''}`}
              to={hrefFor(`/nodes/${encodeURIComponent(event.nodeId)}`)}
              title={isPending(title) ? t('i18n.pendingTitle') : event.nodeId}
            >
              {title}
            </Link>
            <time dateTime={event.occurredAt}>{fmtDate(event.occurredAt)}</time>
          </li>
        );
      })}
    </ul>
  );
}
