import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Markdown } from './Markdown';
import { useI18n } from '../i18n';
import { EXAMPLE_SETS_BY_LOCALE, type ExamplePath, type ExampleSet } from '../example-paths';
import { combineStages, combinedRouteSearch } from '../example-combined';
import { disciplineOfSet, groupByDiscipline } from '../example-paths-grouping';
import { SECTION_ORDER, caseSectionTitle } from '../case-catalog';
import type { NodeSummary } from '../types';

/**
 * 路径规划页的「范例路径」栏目。
 *
 * 为什么要有它：规划器本身只有「目标 + 背景 + 事件界」三个输入，第一次来的人
 * 既不知道该填哪个目标，也不知道背景该声明什么。范例把一份**已经凝练好、
 * 并且在本站跑得通**的样本直接交出去：起点、目标、事件界都是现成的。
 *
 * ## 压缩态 → 悬浮简介 → 点击展开（2026-10-13 第二版）
 *
 * 用户的要求：「这一栏太臃肿了，改成最初是压缩状态，让用户按学科选书，
 * 鼠标悬浮在书名的时候显示这个路径的介绍，点击后展开具体路径。」
 *
 * 因此现在只有三层，默认只占几行：
 *
 * | 层 | 状态 | 内容 |
 * |---|---|---|
 * | 学科分组 | 一直显示 | 「分析」「线性代数」「相对论与宇宙论」各一行 |
 * | 选书按钮 | 压缩态 | 书名（`shortTitle`）+ 规模 + 「展开这 7 程」 |
 * | 路径简介 | **悬浮或键盘聚焦**才出现 | 教材全名、这套路径怎么走、学科分布、出处、边界说明 |
 * | 各程卡片 | **点击书名**后在本栏内展开 | 一程一张卡（特色简介、目标、起点、实测事件数、里程碑） |
 *
 * 上一版把「入口条」和「21 张卡片」分成页面里两处渲染，仍然太占地方；这一版把卡片收进
 * 「点开才出现」的那一层，页面默认只剩学科与书名。展开是**就地**的（不再跳到页面另一处），
 * 同一时刻只开一本。
 *
 * ## 按学科分门别类**不写死分类**
 *
 * 每套样本的学科由它自己那些**里程碑节点**的 `discipline` 现场统计得到（`nodes` 就是本体
 * 下发的清单），取里程碑最多的那一支作为分组。这样「梁灿彬上册」分到「相对论与宇宙论」
 * （31 条里程碑）而不是望文生义的「微分几何」，而它同时覆盖的微分几何 21、拓扑 3
 * 写在悬浮简介里——分类是**量出来的**，可核。学科显示名与分组次序取自 `case-catalog.ts`
 * 的 `caseSectionTitle` / `SECTION_ORDER`，不在这里复制第三份中文名单。
 *
 * ## 数字取自哪里
 *
 * - 节点标题取自只读本体（`nodes`），本体里没有的引用显示成 id，并标注「未登记」；
 * - 事件数、事件界、里程碑数来自 `example-paths.ts`，由 `tests/example-paths.test.mjs`
 *   按声明的 horizon 真跑规划器核对过；压缩态摘要上的规模从数据算，不写死在文案里。
 *
 * ## 双语（2026-10）
 *
 * 壳层文案成对写在 `COPY` 里；卡片正文（书名、简介、特色、起点说明、里程碑清单）来自
 * `example-paths.ts` 的 `EXAMPLE_SETS_BY_LOCALE`，本组件只按语种取，不复制正文。
 * `tests/browser.mjs` 按 `/实测最短\s*(\d+)\s*个事件/` 与 `/事件界\s*h\s*=\s*(\d+)/`
 * 核对 `.example-facts`，并按「载入并规划这一程」点按钮——这两处文字保持逐字不变。
 */

const COPY = {
  zh: {
    badge: '不知道从哪开始？',
    heading: '范例路径',
    lead: '按学科挑一本教材：悬浮书名看简介，点开看它分好的各程。',
    assumptionNote: '载入不会写进你的档案：结果只说明「如果这些已经会了，这条路会怎么走」。',
    hubMeta: (sets: number, routes: number, milestones: number) => `${sets} 套教材 · ${routes} 程 · ${milestones} 个里程碑`,
    bookMeta: (routes: number, milestones: number) => `${routes} 程 · ${milestones} 个里程碑`,
    expandBook: (count: number) => `展开这 ${count} 程`,
    collapseBook: '收起',
    loadWholePath: (count: number) => `一键导入整条路径（${count} 程）`,
    loadWholePathShort: '整条路径',
    loadWholePathHint: '从第一程开始，逐程「下一程」；每一程的起点 = 基础背景 + 前面各程的里程碑。载入只是示范假设，不写进档案。',
    eventsRange: (min: number, max: number) => `每程 ${min}–${max} 个事件`,
    planNotesLead: '这条路径的取舍：',
    signatureLabel: '特色',
    meritsLabel: '优点',
    limitsLabel: '代价与局限',
    navLabel: '按学科跳到某一组',
    loadingDisciplines: '正在从本体读取各套样本的学科分布……',
    tallyLead: '里程碑的学科分布（按数量）：',
    tallyPartial: (resolved: number, total: number) => `（当前本体里只查到 ${resolved}/${total} 个里程碑，这一行按查到的算）`,
    groupMeta: (routes: number, milestones: number) => `${routes} 程 · ${milestones} 个里程碑`,
    source: '出处',
    samplesLabel: '样本',
    samples: (routes: number, milestones: number) => `${routes} 程 · 共 ${milestones} 个里程碑节点`,
    goal: '目标',
    goalExtra: (count: number) => `等 ${count} 个里程碑`,
    entries: '起点',
    entriesDetail: (count: number, note: string) => `${count} 项 · ${note}`,
    scale: '规模',
    scaleDetail: (events: number, horizon: number) => `实测最短 ${events} 个事件 · 事件界 h = ${horizon}`,
    reload: '重新载入并规划',
    load: '载入并规划这一程',
    collapseGoals: '收起目标清单',
    expandGoals: (count: number) => `看全部 ${count} 个目标`,
    loaded: '已载入',
    milestonesLead: '这一程要拿下的里程碑（顺序不是学习顺序；实际次序由依赖决定）：',
    unregistered: '（当前本体未登记）',
    entriesLead: '起点（载入时会自动声明为「已确认可用」）：',
    /* 「多程合一图」（2026-10-15 加）。 */
    combineLead: '也可以把几程**放进同一张网络视图**：勾选下面的程，一次看它们怎么接起来。',
    combinePick: '选这一程',
    combineSelected: (count: number) => `已选 ${count} 程`,
    combineNone: '还没选程',
    combineAll: '全选',
    combineClear: '清空',
    combineGo: (count: number) => `放进一张网络视图（${count} 程）`,
    combineGoOne: '放进一张网络视图',
    combineHint: '按各程登记的里程碑顺序展开，不重新规划：起点是所选中最早那一程的起点，'
      + '同一节点只出现一次。每程的第一支箭头上有一圈环，控制台里写着当前在第几程。',
  },
  en: {
    badge: 'Not sure where to start?',
    heading: 'Example paths',
    lead: 'Pick a textbook by discipline: hover the title for a summary, click it to unfold the routes it is cut into.',
    assumptionNote: 'Loading writes nothing to your profile: the result only says “if these were already known, this is how the route would go”.',
    hubMeta: (sets: number, routes: number, milestones: number) => `${sets} textbooks · ${routes} routes · ${milestones} milestones`,
    bookMeta: (routes: number, milestones: number) => `${routes} routes · ${milestones} milestones`,
    expandBook: (count: number) => `Unfold these ${count} routes`,
    collapseBook: 'Collapse',
    loadWholePath: (count: number) => `Import the whole path (${count} routes)`,
    loadWholePathShort: 'Whole path',
    loadWholePathHint: 'Starts at route 1 and walks on with “next route”; each route’s start is the shared background plus the previous routes’ milestones. Loading writes demonstration assumptions only — nothing goes into your profile.',
    eventsRange: (min: number, max: number) => `${min}–${max} events per route`,
    planNotesLead: 'What this route trades off:',
    signatureLabel: 'What makes it distinctive',
    meritsLabel: 'Why plan it this way',
    limitsLabel: 'What it costs / does not claim',
    navLabel: 'Jump to a discipline group',
    loadingDisciplines: 'Reading each sample’s discipline spread from the ontology…',
    tallyLead: 'Milestones by discipline:',
    tallyPartial: (resolved: number, total: number) => ` (this ontology resolves only ${resolved} of ${total} milestones, so this row counts those)`,
    groupMeta: (routes: number, milestones: number) => `${routes} routes · ${milestones} milestones`,
    source: 'Source',
    samplesLabel: 'Samples',
    samples: (routes: number, milestones: number) => `${routes} routes · ${milestones} milestone nodes in total`,
    goal: 'Goal',
    goalExtra: (count: number) => `and ${count} milestones`,
    entries: 'Start',
    entriesDetail: (count: number, note: string) => `${count} items · ${note}`,
    scale: 'Scale',
    scaleDetail: (events: number, horizon: number) => `measured shortest ${events} events · event horizon h = ${horizon}`,
    reload: 'Reload and plan again',
    load: 'Load and plan this route',
    collapseGoals: 'Hide the goal list',
    expandGoals: (count: number) => `See all ${count} goals`,
    loaded: 'Loaded',
    milestonesLead: 'Milestones this route has to reach (this is not the learning order; the actual order follows the dependencies):',
    unregistered: '(not registered in the current ontology)',
    entriesLead: 'Start (declared as “confirmed usable” when the route is loaded):',
    combineLead: 'You can also put several routes **into one network view**: tick them below and see how they join up.',
    combinePick: 'Pick this route',
    combineSelected: (count: number) => `${count} selected`,
    combineNone: 'nothing selected yet',
    combineAll: 'Select all',
    combineClear: 'Clear',
    combineGo: (count: number) => `Put ${count} routes into one network view`,
    combineGoOne: 'Put into one network view',
    combineHint: 'Expands in the milestones’ registered order — nothing is re-planned: the start is the first selected route’s start, '
      + 'and a node appears only once. Each route’s first arrow carries a ring, and the console names the current route.',
  },
} as const;

/** 把节点 id 批量转成标题；未登记的保留 id 并标记。 */
function titlesOf(nodes: Map<string, string>, ids: string[]) {
  return ids.map((id) => ({ id, title: nodes.get(id) ?? null }));
}

/*
 * 学科分组（`disciplineOfSet` / `groupByDiscipline`）在
 * `web/src/example-paths-grouping.ts`：那里的判据要能被 Node 直接 import 来断言，
 * 而本文件是 `.tsx`（Node 的类型剥离不处理 JSX）。**学科次序从这边注入**，
 * 与案例页共用 `case-catalog.ts` 的同一份名单。
 */
const disciplineRank = (id: string) => {
  const index = SECTION_ORDER.indexOf(id);
  return index < 0 ? SECTION_ORDER.length : index;
};

/** 分组结果 + 两处共用的小计；本体未到之前不分组（那时每套样本都会落到「其他」）。 */
function useExampleGroups(nodes: NodeSummary[]) {
  const { locale, pick } = useI18n();
  const sets = pick(EXAMPLE_SETS_BY_LOCALE);
  const disciplineById = new Map(nodes.map((node) => [node.id, node.discipline]));
  /*
   * 依赖写 `nodes` 而不是那个每次渲染都新建的 Map：本体没变时不重算分组
   * （`useMemo` 的依赖必须稳定）。
   */
  const ready = nodes.length > 0;
  const groups = useMemo(
    () => (ready ? groupByDiscipline(sets, disciplineById, disciplineRank) : []),
    [sets, nodes, ready], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const tallies = useMemo(
    () => new Map(sets.map((set) => [set.id, ready ? disciplineOfSet(set, disciplineById, disciplineRank) : { tally: [], resolved: 0 }])),
    [sets, nodes, ready], // eslint-disable-line react-hooks/exhaustive-deps
  );
  return {
    sets,
    groups,
    ready,
    routes: sets.reduce((sum, set) => sum + set.paths.length, 0),
    milestones: sets.reduce(
      (sum, set) => sum + set.paths.reduce((count, path) => count + path.goals.length, 0),
      0,
    ),
    tallyOf: (setId: string) => tallies.get(setId) ?? { tally: [], resolved: 0 },
    disciplineName: (id: string) => caseSectionTitle(id, locale),
  };
}

export interface ExamplePathsProps {
  /** 本体里的节点清单，用来把 id 显示成标题、并按学科分组；未加载完成时传空数组。 */
  nodes: NodeSummary[];
  /** 当前是否已经载入某个范例，用来在卡片上显示状态。 */
  loadedId: string | null;
  /** 载入并规划：由 PlanPage 负责写入目标、背景与事件界。 */
  onLoad: (path: ExamplePath) => void;
  /**
   * 一键导入**整条路径**（2026-10-13 加）：由 PlanPage 把这一本的各程接成一条可走的路——
   * 载入第一程，并在表单下面挂一条各程进度轨，逐程「下一程」。
   * 不传这个回调时按钮不渲染（组件本身不假设调用方支持整条路径）。
   */
  onLoadPath?: (set: ExampleSet) => void;
}

export function ExamplePaths({ nodes, loadedId, onLoad, onLoadPath }: ExamplePathsProps) {
  const { locale, pick, hrefFor, isPending } = useI18n();
  const text = COPY[locale];
  const titles = new Map(nodes.map((node) => [node.id, node.title]));
  const { sets, groups, ready, routes, milestones, tallyOf, disciplineName } = useExampleGroups(nodes);
  /** 展开的是哪一本（同时只开一本），以及哪张卡的目标清单是展开的。 */
  const [openBookId, setOpenBookId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  /**
   * 「多程合一图」勾了哪几程（2026-10-15 加）：按**教材 id** 分别记，
   * 换一本看时不会把上一本的勾选带过去（勾选属于那一本，不属于这一栏）。
   */
  const [combined, setCombined] = useState<Record<string, number[]>>({});
  const openSet = sets.find((set) => set.id === openBookId) ?? null;
  const selectedOf = (set: ExampleSet) => combined[set.id] ?? [];
  /** 当前展开这一本里勾中的程（升序），以及它们合成出来的那条回放路线。 */
  const selectedStages = openSet ? selectedOf(openSet) : [];
  const combinedRoute = openSet ? combineStages(openSet, selectedStages) : null;
  const toggleStage = (set: ExampleSet, index: number) => setCombined((current) => {
    const selected = current[set.id] ?? [];
    const next = selected.includes(index) ? selected.filter((item) => item !== index) : [...selected, index].sort((a, b) => a - b);
    return { ...current, [set.id]: next };
  });
  const setAllStages = (set: ExampleSet, indexes: number[]) => setCombined((current) => ({ ...current, [set.id]: indexes }));
  const tallyText = (tally: Array<[string, number]>) => tally
    .map(([discipline, count]) => `${disciplineName(discipline)} ${count}`)
    .join(' · ');

  /**
   * 「这样规划的利弊」：特色 / 优点 / 代价三条。
   *
   * 悬浮卡与展开态**共用**这一块（触屏没有悬浮，只有点开才看得到），
   * 每条都走 Markdown 渲染——文案里有 `**强调**`，按纯文本渲染会把星号一起漏出来。
   */
  const planNotes = (set: typeof sets[number]) => (
    <div className="example-plan-notes">
      <p className="example-plan-notes-lead">{text.planNotesLead}</p>
      {([
        ['signature', text.signatureLabel, set.signature],
        ['merits', text.meritsLabel, set.merits],
        ['limits', text.limitsLabel, set.limits],
      ] as const).map(([key, label, items]) => (
        <div className={`example-plan-note example-plan-note-${key}`} key={key}>
          <p className="example-plan-note-title">{label}</p>
          <ul>
            {items.map((item) => (
              <li key={item}><Markdown>{item}</Markdown></li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );

  return (
    <section className="card example-hub" id="example-paths" aria-labelledby="example-paths-title">
      <header className="example-hub-head">
        <div className="example-hub-title">
          <p className="example-hub-badge">{text.badge}</p>
          <h2 id="example-paths-title">{text.heading}</h2>
          {/* 规模从数据算，不写死在文案里；压缩态只有这一行摘要。 */}
          <p className="example-hub-meta">{text.hubMeta(sets.length, routes, milestones)}</p>
        </div>
        <p className="example-hub-lead">{text.lead}</p>
        <p className="example-hub-note">{text.assumptionNote}</p>
      </header>

      {ready ? (
        <div className="example-book-groups">
          {groups.map((group) => (
            <section className="example-discipline" key={group.id} aria-label={disciplineName(group.discipline)}>
              <h3 className="example-discipline-head">
                {disciplineName(group.discipline)}
                <span className="example-discipline-meta">{text.groupMeta(group.routes, group.milestones)}</span>
              </h3>
              <div className="example-book-row">
                {group.sets.map((set) => {
                  const open = openBookId === set.id;
                  const introId = `example-book-intro-${set.id}`;
                  const setMilestones = set.paths.reduce((count, path) => count + path.goals.length, 0);
                  const stageEvents = set.paths.map((path) => path.events);
                  return (
                    <div className={`example-book-wrap${open ? ' open' : ''}`} key={set.id}>
                      <button
                        type="button"
                        className="example-book"
                        aria-expanded={open}
                        aria-describedby={introId}
                        onClick={() => { setOpenBookId(open ? null : set.id); setOpenId(null); }}
                      >
                        <span className="example-book-name">{set.shortTitle}</span>
                        <span className="example-book-meta">
                          {text.bookMeta(set.paths.length, setMilestones)}
                          {' · '}
                          {text.eventsRange(Math.min(...stageEvents), Math.max(...stageEvents))}
                        </span>
                        <span className="example-book-action">{open ? text.collapseBook : text.expandBook(set.paths.length)}</span>
                      </button>
                      {/*
                        「整条路径」：**不用先展开**就能一键导入（用户要的是「一键」）。
                        它是书名按钮的兄弟节点，不是子节点——按钮里不能再套按钮。
                      */}
                      {onLoadPath && (
                        <button
                          type="button"
                          className="example-book-import"
                          onClick={() => onLoadPath(set)}
                          title={text.loadWholePathHint}
                        >
                          {text.loadWholePathShort}
                        </button>
                      )}
                      {/*
                        路径简介：**悬浮或键盘聚焦**时出现（纯 CSS，`pointer-events: none`，
                        不抢点击）。它回答「这本要不要走」：这套路径讲什么、学科分布、多大。
                        出处与边界说明留给展开态——那里是要走进去的人才会读的。
                      */}
                      <div className="example-book-intro" role="tooltip" id={introId}>
                        <p className="example-book-intro-title">{set.title}</p>
                        <p className="example-book-intro-lead">{set.lead}</p>
                        {/*
                          学科分布只在**真的量到**的时候显示（`resolved > 0`）：
                          这一份本体里还没有这套样本的节点时，分组名是声明主学科兜底的，
                          此时不该编一行「其他 47」出来。缺什么就少说什么。
                        */}
                        {tallyOf(set.id).resolved > 0 && (
                          <p className="example-book-intro-tally">
                            {text.tallyLead}
                            {tallyText(tallyOf(set.id).tally)}
                            {tallyOf(set.id).resolved < setMilestones && (
                              <span className="muted">{text.tallyPartial(tallyOf(set.id).resolved, setMilestones)}</span>
                            )}
                          </p>
                        )}
                        {/* 规模不在这里重复：书名按钮上已经写了「7 程 · 47 个里程碑 · 每程 4–10 个事件」。 */}
                        {planNotes(set)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="muted example-hub-loading">{text.loadingDisciplines}</p>
      )}

      {/* 点开的那一本：出处与边界 + 各程卡片，就地展开（同一时刻只开一本）。 */}
      {openSet && (
        <section className="example-book-paths" aria-label={openSet.title}>
          <div className="example-book-paths-head">
            <h3>{openSet.title}</h3>
            <div className="example-book-paths-actions">
              {/*
                「一键导入整条路径」：把这一本的各程接成一条可走的路（载入第一程 + 表单下面的进度轨）。
                它是**整条**路径的入口；下面每张卡片上的「载入并规划这一程」仍然只走一程。
              */}
              {onLoadPath && (
                <button
                  type="button"
                  className="button primary"
                  onClick={() => onLoadPath(openSet)}
                  title={text.loadWholePathHint}
                >
                  {text.loadWholePath(openSet.paths.length)}
                </button>
              )}
              <button type="button" className="link-button" onClick={() => setOpenBookId(null)}>{text.collapseBook}</button>
            </div>
          </div>
          {onLoadPath && <p className="muted example-book-paths-hint">{text.loadWholePathHint}</p>}
          {/*
            「多程合一图」（2026-10-15 加）：勾选几程 → 一次把它们送进**同一张**网络视图。
            与上面那条「整条路径」的区别是**去处**不同：那条把各程接成规划表单里的进度轨（逐程规划），
            这一条直接生成一条回放链接（不重新规划，按各程登记的里程碑顺序展开）。
          */}
          <div className="example-combine">
            <div className="example-combine-head">
              <span className="example-combine-count">
                {selectedStages.length > 0 ? text.combineSelected(selectedStages.length) : text.combineNone}
              </span>
              <button type="button" className="link-button" onClick={() => setAllStages(openSet, openSet.paths.map((_, index) => index))}>{text.combineAll}</button>
              <button type="button" className="link-button" onClick={() => setAllStages(openSet, [])}>{text.combineClear}</button>
              {combinedRoute ? (
                <Link className="button primary small example-combine-go" to={hrefFor(`/network?${combinedRouteSearch(combinedRoute)}`)}>
                  {selectedStages.length > 1 ? text.combineGo(selectedStages.length) : text.combineGoOne}
                </Link>
              ) : (
                <button type="button" className="button primary small example-combine-go" disabled>
                  {selectedStages.length > 1 ? text.combineGo(selectedStages.length) : text.combineGoOne}
                </button>
              )}
            </div>
            <p className="muted example-combine-hint"><Markdown>{text.combineLead}</Markdown> {text.combineHint}</p>
          </div>
          <div className="card example-source">
            {/* 完整导语放在展开态：悬浮卡里限三行，触屏用户只有这一处能看到它。 */}
            <p className="example-lead">{openSet.lead}</p>
            <dl className="facts compact">
              <div>
                <dt>{text.source}</dt>
                <dd className={isPending(openSet.source) ? 'i18n-pending' : undefined}>{openSet.source}</dd>
              </div>
              <div><dt>{text.samplesLabel}</dt><dd>{text.samples(openSet.paths.length, openSet.paths.reduce((count, path) => count + path.goals.length, 0))}</dd></div>
            </dl>
            {/* 边界说明里带 Markdown（加粗与行内代码）；按纯文本渲染会把 ** 与反引号直接漏出来。 */}
            <Markdown className="example-note">{openSet.note}</Markdown>
          </div>
          {/* 触屏没有悬浮，因此「这样规划的利弊」在展开态里再给一次（同一份数据、同一个渲染）。 */}
          <div className="card example-plan-card">{planNotes(openSet)}</div>
          <div className="example-grid">
            {openSet.paths.map((path, index) => {
              const loaded = loadedId === path.id;
              const open = openId === path.id;
              const goalTitle = titles.get(path.goal) ?? path.goal;
              return (
                <article
                  className={`card example-card${loaded ? ' loaded' : ''}${selectedStages.includes(index) ? ' picked' : ''}`}
                  key={path.id}
                  data-example-id={path.id}
                >
                  <header className="example-head">
                    <span className="example-ordinal">{path.ordinal}</span>
                    <span className="example-chapters">{path.chapters}</span>
                    <span className="example-pages">{path.pages}</span>
                  </header>
                  {/*
                    勾选这一程（「多程合一图」用）：勾选只影响**网络视图链接**，
                    不改规划表单里的目标与背景——那是上面那颗「载入并规划这一程」的事。
                  */}
                  <label className="example-pick">
                    <input type="checkbox" checked={selectedStages.includes(index)} onChange={() => toggleStage(openSet, index)} />
                    {text.combinePick}
                  </label>
                  <h4>{path.title}</h4>

                  {/* 特色简介：这一程的看点与最容易错的地方。走 Markdown，因为里面有 r = r_s 这类公式。 */}
                  <Markdown className="example-feature">{path.feature}</Markdown>

                  <dl className="facts compact example-facts">
                    <div>
                      <dt>{text.goal}</dt>
                      <dd>
                        <strong>{goalTitle}</strong>
                        <code>{path.goal}</code>
                        {path.goals.length > 1 && <span className="muted">{text.goalExtra(path.goals.length)}</span>}
                      </dd>
                    </div>
                    <div><dt>{text.entries}</dt><dd>{text.entriesDetail(path.entries.length, path.entryNote)}</dd></div>
                    <div><dt>{text.scale}</dt><dd>{text.scaleDetail(path.events, path.horizon)}</dd></div>
                  </dl>

                  <ul className="example-highlights">
                    {path.highlights.map((item) => <li key={item}>{item}</li>)}
                  </ul>

                  <div className="card-actions">
                    <button className="button primary" onClick={() => onLoad(path)}>
                      {loaded ? text.reload : text.load}
                    </button>
                    <button className="button ghost" onClick={() => setOpenId(open ? null : path.id)}>
                      {open ? text.collapseGoals : text.expandGoals(path.goals.length)}
                    </button>
                    {loaded && <span className="example-loaded-tag">{text.loaded}</span>}
                  </div>

                  {open && (
                    <div className="example-goal-list">
                      <p className="muted">{text.milestonesLead}</p>
                      <ul>
                        {titlesOf(titles, path.goals).map(({ id, title }) => (
                          <li key={id}>
                            {title
                              ? <Link to={hrefFor(`/nodes/${encodeURIComponent(id)}`)}>{title}</Link>
                              : <><code>{id}</code><span className="muted">{text.unregistered}</span></>}
                          </li>
                        ))}
                      </ul>
                      <p className="muted">{text.entriesLead}</p>
                      <ul>
                        {titlesOf(titles, path.entries).map(({ id, title }) => (
                          <li key={id}>
                            {title
                              ? <Link to={hrefFor(`/nodes/${encodeURIComponent(id)}`)}>{title}</Link>
                              : <><code>{id}</code><span className="muted">{text.unregistered}</span></>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}
