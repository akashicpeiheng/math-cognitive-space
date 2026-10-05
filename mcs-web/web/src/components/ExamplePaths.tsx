import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Markdown } from './Markdown';
import { EXAMPLE_SETS, type ExamplePath } from '../example-paths';
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
 */

/** 把节点 id 批量转成标题；未登记的保留 id 并标记。 */
function titlesOf(nodes: Map<string, string>, ids: string[]) {
  return ids.map((id) => ({ id, title: nodes.get(id) ?? null }));
}

export interface ExamplePathsProps {
  /** 本体里的节点清单，用来把 id 显示成标题；未加载完成时传空数组。 */
  nodes: NodeSummary[];
  /** 当前是否已经载入某个范例，用来在卡片上显示状态。 */
  loadedId: string | null;
  /** 载入并规划：由 PlanPage 负责写入目标、背景与事件界。 */
  onLoad: (path: ExamplePath) => void;
}

export function ExamplePaths({ nodes, loadedId, onLoad }: ExamplePathsProps) {
  const titles = new Map(nodes.map((node) => [node.id, node.title]));
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="example-paths" id="example-paths">
      <div className="section-heading">
        <h2>范例路径</h2>
        <p>
          下面是已经凝练好、并且在本站规划器里<strong>跑得通</strong>的现成样本：起点、目标节点与事件界都配好了，
          点一下就能看到路线。卡片上的事件数是实测值，由 <code>tests/example-paths.test.mjs</code> 按声明的
          事件界真跑一遍规划器核对，不是估算。目前有 {EXAMPLE_SETS.length} 套教材样本。
        </p>
      </div>

      {EXAMPLE_SETS.map((set) => (
        <div className="example-set" key={set.id}>
          <div className="card example-source">
            <h3>{set.title}</h3>
            <p className="example-lead">{set.lead}</p>
            <dl className="facts compact">
              <div><dt>出处</dt><dd>{set.source}</dd></div>
              <div><dt>样本</dt><dd>{set.paths.length} 程 · 共 {set.paths.reduce((sum, path) => sum + path.goals.length, 0)} 个里程碑节点</dd></div>
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
                      <dt>目标</dt>
                      <dd>
                        <strong>{goalTitle}</strong>
                        <code>{path.goal}</code>
                        {path.goals.length > 1 && <span className="muted">等 {path.goals.length} 个里程碑</span>}
                      </dd>
                    </div>
                    <div><dt>起点</dt><dd>{path.entries.length} 项 · {path.entryNote}</dd></div>
                    <div><dt>规模</dt><dd>实测最短 {path.events} 个事件 · 事件界 h = {path.horizon}</dd></div>
                  </dl>

                  <ul className="example-highlights">
                    {path.highlights.map((item) => <li key={item}>{item}</li>)}
                  </ul>

                  <div className="card-actions">
                    <button className="button primary" onClick={() => onLoad(path)}>
                      {loaded ? '重新载入并规划' : '载入并规划这一程'}
                    </button>
                    <button className="button ghost" onClick={() => setOpenId(open ? null : path.id)}>
                      {open ? '收起目标清单' : `看全部 ${path.goals.length} 个目标`}
                    </button>
                    {loaded && <span className="example-loaded-tag">已载入</span>}
                  </div>

                  {open && (
                    <div className="example-goal-list">
                      <p className="muted">这一程要拿下的里程碑（顺序不是学习顺序；实际次序由依赖决定）：</p>
                      <ul>
                        {titlesOf(titles, path.goals).map(({ id, title }) => (
                          <li key={id}>
                            {title
                              ? <Link to={`/nodes/${encodeURIComponent(id)}`}>{title}</Link>
                              : <><code>{id}</code><span className="muted">（当前本体未登记）</span></>}
                          </li>
                        ))}
                      </ul>
                      <p className="muted">起点（载入时会自动声明为「已确认可用」）：</p>
                      <ul>
                        {titlesOf(titles, path.entries).map(({ id, title }) => (
                          <li key={id}>
                            {title
                              ? <Link to={`/nodes/${encodeURIComponent(id)}`}>{title}</Link>
                              : <><code>{id}</code><span className="muted">（当前本体未登记）</span></>}
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
