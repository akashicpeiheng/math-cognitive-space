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
import { describeCase, groupByDiscipline, type CaseMeta } from '../case-catalog';
import {
  CASE_LABELS,
  CASE_MATH,
  constructLabel,
  eventKindLabel,
  mathify,
  plainMathText,
  roleLabel,
} from '../labels';
import type { EventView, NodeSummary } from '../types';

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
const CASES: CaseMeta[] = [
  {
    id: 'limit',
    title: '极限与连续',
    question: '函数极限的定义为什么要先去掉 x=a 这一点？',
    entry: 'limit:limit-ed',
    goal: 'limit:bridge',
    note: '两条入口：ε–δ 直接定义与序列式定义，汇合于 Bridge 定理。',
    embryo: '想算「无限接近时函数值趋向谁」，但代入 x=a 会得到 0/0。',
  },
  {
    id: 'manifold',
    title: 'C^k 与光滑流形',
    question: '什么样的空间才能在上面做微积分？',
    entry: 'manifold:top-manifold',
    goal: 'manifold:claim-max',
    note: '局部坐标、过渡映射与两种泛化方向；C¹ 非 C² 的反例守住边界。',
    embryo: '球面上没有全局坐标，可是每个小片看起来都像平面。',
  },
  {
    id: 'tensor',
    title: '张量与张量场',
    question: '为什么同一个量换一组基以后，上下指标要按相反方向变换？',
    entry: 'tensor:tensor-rs',
    goal: 'tensor:end-iso',
    note: '通用性质、换基规律与 Christoffel 反例；有限维条件不可静默删去。',
    embryo: '换基之后分量变了，但「向量」本身没变——那到底什么没变？',
  },
  {
    id: 'group',
    title: '群的多来源',
    question: '同一个群为什么可以有完全不同的入口？',
    entry: 'group:group-concept',
    goal: 'group:cayley',
    note: '几何对称、置换与模乘法汇合到公理模板；S₃ 修正交换性过度推广。',
    embryo: '正方形的对称、三个元素的排列、模 5 乘法，看起来毫无关系。',
  },
  {
    id: 'dg',
    title: '微分几何',
    question: '弯曲空间上怎么才能做微积分？',
    entry: 'dg:smooth-manifold',
    goal: 'dg:generalized-stokes-theorem',
    note: '从开集公理到 Stokes 定理的 30 个核心节点；切向量有曲线与导子两种等价定义。',
    embryo: '在弯曲的面上，「方向」和「面积」都失去了平面上的直观。',
  },
];

/** 构造类型的中文名（卡片上的分布条用）。 */
const CONSTRUCT_NAMES: Record<string, string> = {
  Concept: '概念', Definition: '定义', Claim: '命题', Proof: '证明', Example: '例子',
  Counterexample: '反例', Construction: '构造', Problem: '问题', Method: '方法',
  Representation: '表征', MisconceptionPattern: '误区', Theory: '理论',
};

/** 「按方式」的固定入口：每条对应站内一个既有页面，不新造功能。 */
const ENTRY_MODES = [
  { id: 'plan', title: '按目标与背景规划路线', detail: '给一个目标、声明你已经会的，比较候选路线各自用了哪些假设。', to: '/plan', cta: '打开学习路线' },
  { id: 'network', title: '按结构看关系', detail: '从空开始加法式组网：谁能接上谁、哪条边更硬、哪条只是类比。', to: '/network', cta: '组建网络' },
  { id: 'review', title: '按回看补没懂的地方', detail: '待回看只列你标记过「还不懂」或确认过的节点，不编造到期日。', to: '/profile?tab=review', cta: '打开待回看' },
  { id: 'method', title: '按学习方法论', detail: '跨分支通用的八条原则：动机溯源、删掉条件会怎样、保留试错。', to: '/method', cta: '看方法论' },
  { id: 'evidence', title: '按证据与研究边界', detail: '覆盖清单、36 个局部化算子与证据重放，以及明确不声称的范围。', to: '/lab', cta: '打开研究台' },
];

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
  const caseSections = useMemo(
    () => groupByDiscipline(CASES.map((meta) => describeCase(meta, graph?.nodes ?? []))),
    [graph],
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
        title: '按领域',
        lead: '在某个数学分支里找一个此刻读得动的对象。',
        items: countBy(nodes, (node) => [node.discipline]).map((item) => ({
          key: item.key,
          label: item.key,
          count: item.count,
          to: `/nodes?discipline=${encodeURIComponent(item.key)}`,
        })),
      },
      {
        id: 'construct',
        title: '按对象类型',
        lead: '想先看定义、先看反例，还是先看一条方法，进入的方式不一样。',
        items: countBy(nodes, (node) => [node.construct]).map((item) => ({
          key: item.key,
          label: constructLabel(item.key),
          count: item.count,
          to: `/nodes?construct=${encodeURIComponent(item.key)}`,
        })),
      },
      {
        id: 'role',
        title: '按角色',
        lead: '同一个对象可以既是概念又是公理；按它在本体里承担的角色筛。',
        items: countBy(nodes, (node) => node.roles).map((item) => ({
          key: item.key,
          label: roleLabel(item.key),
          count: item.count,
          to: `/nodes?role=${encodeURIComponent(item.key)}`,
        })),
      },
      {
        id: 'case',
        title: '按案例',
        lead: '每条贯通案例的完整节点清单，适合已经决定读某条思路之后。',
        items: countBy(nodes, (node) => [node.case]).map((item) => ({
          key: item.key,
          // 纯文本上下文（不是 Markdown）：用 Unicode 上标，别把 C^k 原样显示成带脱字符的样子。
          label: plainMathText(CASE_LABELS[item.key] ?? item.key),
          count: item.count,
          to: `/nodes?case=${encodeURIComponent(item.key)}`,
        })),
      },
    ];
  }, [graph]);

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
      <h2>接着上次</h2>
      {profileId && learningLoading && <p>正在读取你的学习记录…</p>}
      {profileId && learningError && <p className="error">{learningError}</p>}
      {profileId && progress && (
        <>
          <div className="continue-grid">
            <div className="continue-block">
              <h3>现在可以新学</h3>
              {firstReady ? (
                <>
                  <p>
                    <Link className="continue-title" to={`/nodes/${encodeURIComponent(firstReady.node)}`}>{titleOf(firstReady.node)}</Link>
                  </p>
                  <p className="muted">
                    为什么是它：引入它的行动「{firstReady.actionTitle}」所需条件
                    {firstReady.requires.length ? `（${firstReady.requires.map(titleOf).join('、')}）` : ''}已全部确认可用。
                  </p>
                  <Link className="button primary" to={`/nodes/${encodeURIComponent(firstReady.node)}`}>继续阅读</Link>
                </>
              ) : nearest ? (
                <>
                  <p className="muted">
                    还没有条件齐备的节点。最接近可学的是它，只差
                    {nearest.missing.map(titleOf).join('、')}——先把这些背景确认掉，它就会变成可学。
                  </p>
                  <p><Link className="continue-title" to={`/nodes/${encodeURIComponent(nearest.node)}`}>{titleOf(nearest.node)}</Link></p>
                  <div className="card-actions">
                    <Link className="button primary" to={`/nodes/${encodeURIComponent(nearest.missing[0])}`}>先确认：{titleOf(nearest.missing[0])}</Link>
                    <Link className="button" to={`/nodes/${encodeURIComponent(nearest.node)}`}>先看一眼这个节点</Link>
                  </div>
                </>
              ) : (
                <p className="muted">
                  当前档案里没有可派生的下一步（已登记节点都已确认，或没有登记行动契约）。
                  可以到<Link to="/nodes">数学对象</Link>里直接挑一个读。
                </p>
              )}
            </div>
            <div className="continue-block">
              <h3>待回看</h3>
              {nextReview ? (
                <>
                  <p>
                    <Link className="continue-title" to={`/nodes/${encodeURIComponent(nextReview.node)}`}>{nextReview.title}</Link>
                  </p>
                  <p className="muted">
                    {nextReview.reason === 'read-not-understood'
                      ? '你标记过「还不懂」；先回看它的边界与反例。'
                      : '你确认过它可用；回看用来防止只记住结论。'}
                    {nextReview.reviewCount > 0 ? `（已回看 ${nextReview.reviewCount} 次）` : ''}
                  </p>
                  <Link className="button" to="/profile?tab=review">打开待回看</Link>
                </>
              ) : (
                <p className="muted">还没有待回看的内容。读一个节点并标记「标记已读」或「我还不懂」后，它会出现在这里。</p>
              )}
            </div>
          </div>
          <ProgressBar counts={progress.counts} />

          {/* 邻域网络是参考材料，默认折叠；需要时展开。 */}
          {graph && centerId && (
            <details className="continue-network-details">
              <summary>查看相关知识（以上次学到的节点为中心）</summary>
              <div className="continue-network-block">
                <div className="continue-network-head">
                  <h3>
                    {centerSource === 'last-view' ? '上次学到'
                      : centerSource === 'review' ? '待回看的中心'
                        : centerSource === 'picked' ? '你选的中心' : '建议的中心'}
                    ：<Link to={`/nodes/${encodeURIComponent(centerId)}`}>{titleOf(centerId)}</Link>
                  </h3>
                  <p className="muted">
                    上下左右各是一个话题；离中心越近，关联越硬。
                    {lastStudied?.at ? `最近阅读时间 ${new Date(lastStudied.at).toLocaleString('zh-CN')}。` : ''}
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
                    中心已切到你点的节点。<button className="link-button" onClick={() => setCenterOverride(null)}>回到上次学习</button>
                  </p>
                )}
              </div>
            </details>
          )}
        </>
      )}
      {!profileId && (
        <p className="notice">
          还没有选择档案。<Link to="/profile">新建一个档案</Link>后，这里会记住你读到哪、下一步可以学什么；
          新档案从不预设你会什么。也可以先直接读，需要保存时再建档案。
        </p>
      )}
    </section>
  );

  const casesSection = (
    <section id="cases">
      <div className="section-heading">
        <h2>从原型问题进入</h2>
        <p>
          每条思路都从一个具体的困惑（「胚子」）长到规范形式。选最像你此刻问题的那一条，
          点「阅读这条思路」开始；节点数、反例与证据等级都收在「案例详情」里。
        </p>
      </div>
      {caseSections.map((section) => (
        <div className="discipline-section" key={section.id}>
          <div className="discipline-head">
            <h3>{section.title}</h3>
            <span className="discipline-meta">
              {section.cases.length} 条思路 · {section.nodeCount} 个节点
            </span>
          </div>
          <div className="case-grid">
            {section.cases.map((detail) => (
              <article className="card case-card" key={detail.meta.id}>
                <CaseThumbnail caseId={detail.meta.id} />
                <div className="case-head">
                  {/* 标题含 C^k 这类数学记号：不过 Markdown 会被 GFM 当成上标语法，
                      渲染成「C^K」这种带脱字符的错样子。CASE_MATH 给出 LaTeX 源。 */}
                  <Markdown className="eyebrow case-eyebrow">{`**${CASE_MATH[detail.meta.id] ?? detail.meta.title}**`}</Markdown>
                </div>
                {/* 标题与摘要含 C^k、ε–δ、S₃ 等 LaTeX 源，必须走 Markdown 才能排版。 */}
                <Markdown className="case-question">{`### ${detail.meta.question}`}</Markdown>
                <p className="case-embryo">
                  <span className="case-embryo-tag">胚子</span>
                  <Markdown className="inline-markdown">{mathify(detail.meta.embryo)}</Markdown>
                </p>
                <div className="card-actions">
                  <Link className="button primary" to={`/nodes/${encodeURIComponent(detail.meta.entry)}`}>阅读这条思路</Link>
                  <Link className="button" to={`/plan?goal=${encodeURIComponent(detail.meta.goal)}`}>先看路线</Link>
                </div>
                <details className="case-details">
                  <summary>
                    案例详情 · <span className="case-node-count" title={`本案例登记 ${detail.nodeCount} 个节点`}>{detail.nodeCount} 节点</span>
                  </summary>
                  <Markdown>{mathify(detail.meta.note)}</Markdown>

                  {/* 学科分布：一条思路可以横跨多个领域，这里如实列出全部。 */}
                  <ul className="case-disciplines">
                    {detail.disciplines.map((item) => (
                      <li key={item.name}>
                        <span className="case-discipline-name">{item.name}</span>
                        <span className="case-bar" aria-hidden="true">
                          <i style={{ width: `${Math.round((item.count / Math.max(detail.nodeCount, 1)) * 100)}%` }} />
                        </span>
                        <span className="case-count">{item.count}</span>
                      </li>
                    ))}
                  </ul>

                  {/* 构造分布：这条思路由哪些部件构成。 */}
                  <ul className="case-constructs" title="按构造类型统计的节点数">
                    {detail.constructs.map((item) => (
                      <li key={item.construct}>
                        <span className="case-chip">{CONSTRUCT_NAMES[item.construct] ?? item.construct}</span>
                        <span className="case-count">{item.count}</span>
                      </li>
                    ))}
                  </ul>

                  {/* 反例与误区：条件边界与常见误解，都是语料里已登记的。
                      节点标题本身常以「误区：」开头，而标签已经写了「误区」，
                      这里去掉重复的前缀，避免出现「误区 误区：收敛序列…」。 */}
                  {detail.counterexamples.length > 0 && (
                    <p className="case-guard">
                      <span className="case-guard-tag">反例</span>
                      {detail.counterexamples.map((item) => (
                        <Link key={item.id} to={`/nodes/${encodeURIComponent(item.id)}`} title={item.title}>
                          <Markdown className="inline-markdown">{mathify(item.title.replace(/^(误区|反例)[：:]\s*/, ''))}</Markdown>
                        </Link>
                      ))}
                    </p>
                  )}
                  {detail.misconceptions.length > 0 && (
                    <p className="case-guard">
                      <span className="case-guard-tag">误区</span>
                      {detail.misconceptions.map((item) => (
                        <Link key={item.id} to={`/nodes/${encodeURIComponent(item.id)}`} title={item.title}>
                          <Markdown className="inline-markdown">{mathify(item.title.replace(/^(误区|反例)[：:]\s*/, ''))}</Markdown>
                        </Link>
                      ))}
                    </p>
                  )}

                  <p className="case-stats">
                    {detail.actionCount} 个行动契约 · {detail.relationCount} 条登记关系
                    {detail.evidence.length > 0 && ` · 证据等级 ${detail.evidence.map((item) => `${item.status} ${item.count}`).join('、')}`}
                  </p>
                  <div className="card-actions">
                    <Link className="button ghost" to={`/nodes?case=${encodeURIComponent(detail.meta.id)}`}>浏览全部 {detail.nodeCount} 个节点</Link>
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
        <h2>各个角度的切入口</h2>
        <p>
          同一个知识库，可以从分支、对象类型、角色或来源进入，也可以按路线、结构、回看、
          方法论与证据进入。下面的数字都由本体现场派生，不写死。
        </p>
        <p className="muted">
          {/*
            计数只算单元，这句说明话题层去哪儿了——不写它，用户会以为「按领域」的 64 就是全部。
          */}
          数字按<strong>单元</strong>计（最小的可独立认知单元）；另有 {topicCount} 条话题级条目
          （一节或一章的范围），在数学对象列表里把「条目粒度」切到「话题」即可看到。
          学科按知识的本质领域分类（分析 / 拓扑 / 微分几何 / 代数…），来源（哪本教材）是另一栏筛选。
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
                  <Link className="angle-chip" to={item.to} title={`${item.label}：${item.count} 个节点`}>
                    <span className="angle-chip-label">{item.label}</span>
                    <span className="angle-chip-count">{item.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="angle-more">
              <Link to="/nodes">或直接浏览全部 {graph?.nodes.length ?? 0} 个对象</Link>
            </p>
          </article>
        ))}
      </div>

      <div className="angle-grid angle-grid-modes">
        {ENTRY_MODES.map((mode) => (
          <article className="card angle-card angle-mode" key={mode.id} data-mode={mode.id}>
            <h3>{mode.title}</h3>
            <p className="muted">{mode.detail}</p>
            <Link className="button" to={mode.to}>{mode.cta}</Link>
          </article>
        ))}
      </div>

      {/* 冷启动：没有任何行动能产出的节点，只能由学习者先确认，是真正的最小起点。 */}
      {backgroundCandidates.length > 0 && (
        <div className="card angle-cold-start" id="cold-start">
          <h3>没有前置的起点</h3>
          <p className="muted">
            这些背景节点没有任何行动能产出，因此不会被任何路线推出来——只能由你自己确认「我确实会」。
            确认之后，依赖它们的内容才会变成可以学的。
          </p>
          <ul className="angle-items">
            {backgroundCandidates.map((node) => (
              <li key={node.id}>
                <Link className="angle-chip" to={`/nodes/${encodeURIComponent(node.id)}`} title={node.discipline}>
                  <span className="angle-chip-label">{plainMathText(node.title)}</span>
                  <span className="angle-chip-count">{node.discipline}</span>
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
        <h1>开始学习</h1>
        <p className="muted">
          首页讲的是为什么要有这个空间。这一页先不急着推内容：回答三个问题，让入口按你的处境排序；
          定完方向，下面的材料按角度摊开，随时可以自己挑。
        </p>
        <p className="start-head-links">
          <Link to="/">回看首页动画</Link>
          <span className="muted"> · </span>
          <Link to="/intro">这个网站是什么</Link>
          <span className="muted"> · </span>
          <Link to="/method">学习方法论</Link>
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
        下面是不经引导的全部入口——想自己挑就直接往下看。
      </p>

      {/* 回访者先看到自己的下一步；新访客先看到「从问题进入」。 */}
      {returning && continueCard}
      {casesSection}
      {anglesSection}
      {!returning && continueCard}

      <section className="card">
        <h2>给研究者</h2>
        <p className="muted">专稿覆盖清单、36 个局部化算子与证据重放不对应学习进度，放在研究台里。</p>
        <Link className="button ghost" to="/lab">打开研究台</Link>
      </section>

      <section className="two-column">
        <div className="card">
          <h2>系统状态</h2>
          {health ? (
            <dl className="facts">
              <div><dt>本体版本</dt><dd><code>{health.ontology.contentHash.slice(0, 20)}…</code></dd></div>
              <div><dt>登记节点</dt><dd>{String((health.ontology.counts as { nodes?: number }).nodes ?? '—')}</dd></div>
              <div><dt>学习事件</dt><dd>{health.db.events}</dd></div>
              <div><dt>辅导入口</dt><dd><StatusBadge status={health.tutor.available ? 'passed' : 'not_run'} label={health.tutor.available ? (health.tutor.liveVerified ? '已连通并验证' : '后端可达，未验证') : '未连接'} /></dd></div>
            </dl>
          ) : <p>正在连接本机服务…</p>}
        </div>
        <div className="card">
          <h2>最近学习事件</h2>
          <RecentEvents profileId={profileId} />
        </div>
      </section>

      {profile && <p className="muted">当前档案：{profile.name}</p>}
    </div>
  );
}

function RecentEvents({ profileId }: { profileId: string | null }) {
  const events = useApi<{ events: EventView[] }>(profileId ? `/profiles/${profileId}/events?limit=6` : null, [profileId]);
  // 事件里只有节点 id；学习者需要看到标题。标题来自只读本体，不影响任何写入。
  const nodes = useApi<{ nodes: NodeSummary[] }>(profileId ? '/ontology/nodes?limit=500' : null, [profileId]);
  const titleOfEvent = (nodeId: string) => nodes.data?.nodes.find((node) => node.id === nodeId)?.title ?? nodeId;
  if (!profileId) return <p>选择或新建档案后，这里显示最近事件。新的档案从未指定开始。</p>;
  if (events.loading) return <p>加载中…</p>;
  if (events.error) return <p className="error">{formatError(events.error)}</p>;
  if (!events.data?.events.length) return <p>还没有事件。浏览节点不会自动把节点标记为已掌握。</p>;
  return (
    <ul className="event-list">
      {[...events.data.events].reverse().map((event) => (
        <li key={event.eventId}>
          <StatusBadge
            status={event.kind === 'confirmation' ? (event.payload?.confirmed === false ? 'unknown' : 'passed') : event.kind}
            label={eventKindLabel(event.kind)}
            title={event.kind}
          />
          <Link className="event-node" to={`/nodes/${encodeURIComponent(event.nodeId)}`} title={event.nodeId}>{titleOfEvent(event.nodeId)}</Link>
          <time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString('zh-CN')}</time>
        </li>
      ))}
    </ul>
  );
}
