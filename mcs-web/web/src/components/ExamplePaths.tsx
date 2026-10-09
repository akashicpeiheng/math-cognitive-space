import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Markdown } from './Markdown';
import { useI18n } from '../i18n';
import { EXAMPLE_SETS_BY_LOCALE, type ExamplePath } from '../example-paths';
import type { NodeSummary } from '../types';

/**
 * 路径规划页的「范例路径」栏目。
 *
 * 为什么要有它：规划器本身只有「目标 + 背景 + 事件界」三个输入，第一次来的人
 * 既不知道该填哪个目标，也不知道背景该声明什么。范例把一份**已经凝练好、
 * 并且在本站跑得通**的样本直接交出去：起点、目标、事件界都是现成的。
 *
 * 数字取自哪里：
 * - 节点标题取自只读本体（`nodes`），本体里没有的引用显示成 id，并标注「未登记」，
 *   而不是静默丢掉——那样会让人以为卡片上的节点都不存在。
 * - 事件数、事件界、里程碑数来自 `example-paths.ts`，由 `tests/example-paths.test.mjs`
 *   按声明的 horizon 真跑规划器核对过。
 *
 * 双语（2026-10）：
 * - 本组件的壳层文案成对写在下面；中文一侧逐字保留（`tests/browser.mjs` 按
 *   `/实测最短\s*(\d+)\s*个事件/` 与 `/事件界\s*h\s*=\s*(\d+)/` 核对 `.example-facts`，
 *   并按「载入并规划这一程」点按钮）。
 * - **卡片正文**（教材名、简介、特色、起点说明、里程碑清单）来自 `example-paths.ts`，
 *   中英各一份由该模块提供（`EXAMPLE_SETS_BY_LOCALE`），本组件只按语种取，不复制正文。
 */

const COPY = {
  zh: {
    heading: '范例路径',
    lead: (count: number) => (
      <>
        下面是已经凝练好、并且在本站规划器里<strong>跑得通</strong>的现成样本：起点、目标节点与事件界都配好了，
        点一下就能看到路线。卡片上的事件数是实测值，由 <code>tests/example-paths.test.mjs</code> 按声明的
        事件界真跑一遍规划器核对，不是估算。目前有 {count} 套教材样本。
      </>
    ),
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
  },
  en: {
    heading: 'Example paths',
    lead: (count: number) => (
      <>
        These samples are already distilled and <strong>run</strong> in this site’s planner: start, goal nodes
        and event horizon are all filled in, so one click shows you the route. The event counts on the cards
        are measured values — <code>tests/example-paths.test.mjs</code> really runs the planner at the declared
        horizon to check them, they are not estimates. There are {count} textbook samples.
      </>
    ),
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
  },
} as const;

/** 把节点 id 批量转成标题；未登记的保留 id 并标记。 */
function titlesOf(nodes: Map<string, string>, ids: string[]) {
  return ids.map((id) => ({ id, title: nodes.get(id) ?? null }));
}

/**
 * 取当前语种的范例集。
 *
 * 英文数据由 `example-paths.ts` 提供（`EXAMPLE_SETS_BY_LOCALE`，id / 事件数 / 目标与起点
 * 两侧逐字对齐，只有正文与序数不同）。
 */

export interface ExamplePathsProps {
  /** 本体里的节点清单，用来把 id 显示成标题；未加载完成时传空数组。 */
  nodes: NodeSummary[];
  /** 当前是否已经载入某个范例，用来在卡片上显示状态。 */
  loadedId: string | null;
  /** 载入并规划：由 PlanPage 负责写入目标、背景与事件界。 */
  onLoad: (path: ExamplePath) => void;
}

export function ExamplePaths({ nodes, loadedId, onLoad }: ExamplePathsProps) {
  const { locale, pick, hrefFor } = useI18n();
  const text = COPY[locale];
  const sets = pick(EXAMPLE_SETS_BY_LOCALE);
  const titles = new Map(nodes.map((node) => [node.id, node.title]));
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="example-paths" id="example-paths">
      <div className="section-heading">
        <h2>{text.heading}</h2>
        <p>{text.lead(sets.length)}</p>
      </div>

      {sets.map((set) => (
        <div className="example-set" key={set.id}>
          <div className="card example-source">
            <h3>{set.title}</h3>
            <p className="example-lead">{set.lead}</p>
            <dl className="facts compact">
              <div><dt>{text.source}</dt><dd>{set.source}</dd></div>
              <div><dt>{text.samplesLabel}</dt><dd>{text.samples(set.paths.length, set.paths.reduce((sum, path) => sum + path.goals.length, 0))}</dd></div>
            </dl>
            {/* 边界说明里带 Markdown（加粗与行内代码）；按纯文本渲染会把 ** 与反引号直接漏出来。 */}
            <Markdown className="example-note">{set.note}</Markdown>
          </div>

          <div className="example-grid">
            {set.paths.map((path) => {
              const loaded = loadedId === path.id;
              const open = openId === path.id;
              const goalTitle = titles.get(path.goal) ?? path.goal;
              return (
                <article className={`card example-card${loaded ? ' loaded' : ''}`} key={path.id}>
                  <header className="example-head">
                    <span className="example-ordinal">{path.ordinal}</span>
                    <span className="example-chapters">{path.chapters}</span>
                    <span className="example-pages">{path.pages}</span>
                  </header>
                  <h3>{path.title}</h3>

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
        </div>
      ))}
    </section>
  );
}
