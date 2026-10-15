import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { basisOf, type DirectionState } from '../useDirection';
import type { DirectionReport, RankedOption } from '../direction';
import type { NodeSummary } from '../types';

/** 成对文案：中文是源语言，英文是译文（手册 §1：页面自己的长文案放本模块）。 */
interface Pair<T = string> { zh: T; en: T }

const TEXT = {
  title: { zh: '学习方向', en: 'Learning direction' },
  lead: {
    zh: '方向是你自己声明的：一个目标。选它之后，下面「现在能开始」的节点会按「离这个目标有多近」排序，'
      + '而不是按登记顺序铺开——这就是把并行的节点排成一条可以照做的次序。',
    en: 'A direction is something you declare yourself: one goal. Once chosen, the nodes you can start now are '
      + 'ordered by how close they are to that goal instead of by registration order — that is what turns parallel '
      + 'nodes into an order you can actually follow.',
  },
  noProfile: { zh: '先在学习者档案（E）里选一份档案，方向才有地方存。', en: 'Select a profile (E) first — a direction needs somewhere to live.' },
  pickTitle: { zh: '还没有方向：先挑一个', en: 'No direction yet: pick one' },
  pickLead: {
    zh: '随便挑一个最像你此刻问题的。挑错也没关系——方向随时可以撤，撤回之后一切照旧。',
    en: 'Pick whichever is closest to your current question. Picking wrong is fine — a direction can be withdrawn at any time, and everything returns to how it was.',
  },
  pickCase: { zh: '按案例', en: 'By case' },
  pickCaseLead: { zh: '每条贯通案例的终点，是一组现成的方向。', en: 'Each end-to-end case ends at a ready-made goal.' },
  pickNode: { zh: '按对象自己找', en: 'Find an object yourself' },
  pickNodeLead: { zh: '想自己去哪个对象上，就把它设成方向。', en: 'If you already know which object you are heading for, set it as the direction.' },
  setAsDirection: { zh: '就学这个方向', en: 'Set this as my direction' },
  nodePickerLabel: { zh: '选一个目标节点', en: 'Pick a goal node' },
  searchPlaceholder: { zh: '按名称或 id 搜（至少两个字符）', en: 'Search by title or id (at least two characters)' },
  searchEmpty: { zh: '没有匹配的单元级节点。', en: 'No matching unit-level node.' },
  focusHint: {
    zh: (title: string) => `当前方向：${title}。`,
    en: (title: string) => `Current direction: ${title}.`,
  },
  focusMeta: {
    zh: (core: number, wanted: number) => `方向核心 ${core} 个节点，其中 ${wanted} 个还没确认。`,
    en: (core: number, wanted: number) => `The core has ${core} node(s), ${wanted} of them not confirmed yet.`,
  },
  withdraw: { zh: '撤掉这个方向', en: 'Withdraw this direction' },
  threadNote: {
    zh: '（话题级线索：它是学习线索的名字，不是可独立认知的单元。核心按它登记的形状走。）',
    en: '(topic-level thread: it names a study thread, not an independently knowable unit. The core follows its registered shape.)',
  },
  positionTitle: { zh: '你现在在哪儿', en: 'Where you are now' },
  posConfirmed: { zh: '已确认', en: 'Confirmed' },
  posAdopted: { zh: '本次已选（还没确认）', en: 'Chosen in this session (not confirmed)' },
  posStartable: { zh: '现在能开始', en: 'Can start now' },
  posReachable: { zh: '够得着的那一片', en: 'Within reach' },
  posUnits: { zh: '本体的单元总数', en: 'Total units in the ontology' },
  posSideRoads: { zh: '其中在方向之外', en: 'Of those, outside the direction' },
  stepsTitle: { zh: '下一步', en: 'Next step' },
  forcedLead: {
    zh: (count: number) => `现在只有这一条通向你的方向；另有 ${count} 个选项不在这个方向上（见下面的完整选项表）。`,
    en: (count: number) => `Only this one leads to your direction right now; ${count} other option(s) are outside it (see the full option list below).`,
  },
  chooseLead: {
    zh: (count: number) => `方向上有 ${count} 条可以走。先走哪条不影响「能不能到」，只影响路上会顺手拿到什么。`,
    en: (count: number) => `${count} option(s) lie on your direction. Which one you take first does not change whether you arrive — only what you pick up on the way.`,
  },
  recommendedTag: { zh: '推荐先走这条', en: 'Recommended first' },
  inCoreTag: { zh: '在方向上', en: 'On your direction' },
  outsideTag: { zh: '不在这个方向上', en: 'Outside this direction' },
  unlocksTag: { zh: (count: number) => `解锁 ${count} 个`, en: (count: number) => `unlocks ${count}` },
  coreLevelTag: { zh: (level: number) => `核心第 ${level} 层`, en: (level: number) => `core level ${level}` },
  adopt: { zh: '就学这个', en: 'Study this next' },
  openNode: { zh: '打开节点', en: 'Open the node' },
  optionsTitle: { zh: '现在能开始的全部选项', en: 'Every option you can start now' },
  optionsLead: {
    zh: (total: number, shown: number) => `一共 ${total} 个，这里按排序显示前 ${shown} 个。排序判据共五条，逐条写在每一项上：`
      + '① 在不在你的方向上；② 能不能由你直接声明（没有任何行动能产出它）；③ 与你选的学法是否一致；'
      + '④ 确认它之后能新开始几个；⑤ 前四条完全相同才按登记顺序。',
    en: (total: number, shown: number) => `${total} in total; the first ${shown} are shown in order. There are five ordering criteria, each written on the item: `
      + '1) whether it is on your direction; 2) whether only you can declare it (no action produces it); 3) whether it matches the way you chose to learn; '
      + '4) how many new nodes it lets start; 5) registration order, only when everything above ties.',
  },
  showAll: { zh: '展开其余选项', en: 'Show the remaining options' },
  showMore: { zh: (count: number) => `还有 ${count} 个`, en: (count: number) => `${count} more` },
  previewTitle: { zh: '如果一直按推荐走', en: 'If you keep taking the recommendation' },
  previewLead: {
    zh: (steps: number) => `接下来 ${steps} 步长这样。它只是预览，不是承诺：每一步都会从你当时的真实状态重算。`,
    en: (steps: number) => `The next ${steps} step(s) look like this. It is a preview, not a promise: every step is recomputed from your real state at that time.`,
  },
  previewTruncated: { zh: '（预览到步数上限为止，不是路线的长度）', en: ' (the preview stops at its step limit; that is not the length of the route)' },
  pathTitle: { zh: '我的路径', en: 'My path' },
  pathLead: {
    zh: '这是你选过的步骤（存在这台浏览器里，按档案分开）。「已选」不等于「已确认」——确认仍然只能在节点页自己做。',
    en: 'These are the steps you chose (stored in this browser, per profile). “Chosen” is not “confirmed” — confirmation is still only done by you on the node page.',
  },
  pathEmpty: { zh: '还没有选过任何一步。选一步之后这里会长成一条线。', en: 'No step chosen yet. Once you choose one, this grows into a line.' },
  pathStatusAdopted: { zh: '已选，还没确认', en: 'chosen, not confirmed' },
  pathStatusConfirmed: { zh: '已确认', en: 'confirmed' },
  pathStatusStale: {
    zh: '这一步现在对不上了（节点不在当前本体里，或它现在不再是可开始的节点）',
    en: 'this step no longer lines up (the node is not in the current ontology, or it is not a startable node any more)',
  },
  rewind: { zh: '从这里重选', en: 'Re-choose from here' },
  clearPath: { zh: '清空路径记录', en: 'Clear the path record' },
  clearPathConfirm: {
    zh: '清空只删掉这台浏览器上的选择记录；不会改动你的确认，也不会撤掉方向。继续？',
    en: 'Clearing removes only the choices recorded in this browser; it does not change your confirmations or withdraw the direction. Continue?',
  },
  coreTitle: { zh: '方向核心：绕不开的节点', en: 'The core: nodes you cannot go around' },
  coreLead: {
    zh: '从目标出发，沿「产出它的行动的最佳输入」与「指向它的硬前置」收出来的必需集合。已经确认的标灰；'
      + '层号 = 依赖深度（第 1 层现在就能开始）。',
    en: 'Collected backwards from the goal along the best inputs of its producing action and its registered hard prerequisites. '
      + 'Confirmed ones are dimmed; the level is dependency depth (level 1 can start now).',
  },
  coreUnresolved: {
    zh: (nodes: string) => `这几个核心节点互相要求，拆不开：${nodes}。因此下面没有它们的层号——这不是「先学哪一个都行」，`
      + '而是「按当前登记，这个目标不能靠一条通顺的次序走到」。可以到学习路线页让规划器在同一份登记上做一次可行性判定。',
    en: (nodes: string) => `These core nodes require each other and cannot be untangled: ${nodes}. They therefore have no level below — this is not “either order works”, `
      + 'but “under the current registration this goal cannot be reached by a smooth order”. The learning-route page can run a feasibility check on the same registration.',
  },
  coreLimited: {
    zh: '核心过大，这里只收集到上限为止——层号因此可能不完整。',
    en: 'The core is large; collection stopped at the limit, so the levels may be incomplete.',
  },
  threadExcluded: {
    zh: (count: number) => `另有 ${count} 条话题级线索没有出现在选项里：它们是学习线索的名字，不是可独立认知的单元。`,
    en: (count: number) => `${count} topic-level thread(s) are not listed as options: they name study threads, not independently knowable units.`,
  },
  noOptionsTitle: { zh: '现在没有可以开始的节点', en: 'Nothing can start right now' },
  noOptionsLead: {
    zh: '这不是「没有内容可学」，而是「已登记的前置还没确认」。下面按「差得最少」列出最接近的那几个。',
    en: 'This is not “nothing to study” but “the registered prerequisites are not confirmed yet”. Below are the closest ones, fewest missing first.',
  },
  missingLead: { zh: '还差：', en: 'Missing: ' },
  confirmFirst: { zh: '先确认它', en: 'Confirm it first' },
  planLink: { zh: '到学习路线页比较候选路线', en: 'Compare candidate routes on the learning-route page' },
  loadError: { zh: (message: string) => `方向读取失败：${message}`, en: (message: string) => `Reading directions failed: ${message}` },
} as const;

export interface DirectionPanelProps {
  state: DirectionState;
  /** 本体节点（用于方向选择器与标题）。 */
  nodes: NodeSummary[];
  /** 可选的方向预设：`{ goal, title }`（来自案例目录，不新造清单）。 */
  presets: Array<{ id: string; title: string }>;
  /** 只在没有方向时显示选择器（「开始学习」页的首访场面）。 */
  compact?: boolean;
  /** 点击「就学这个」之后的回调（用来滚到下一步或提示）。 */
  onAdopt?: (node: string) => void;
}

/** 显示前几个选项（截断是实现决定，界面必须同时写出总数）。 */
const OPTION_LIMIT = 6;

function pick<T>(pair: Pair<T> | T, locale: 'zh' | 'en'): T {
  const value = pair as Pair<T>;
  return (value && typeof value === 'object' && 'zh' in value) ? value[locale] : (pair as T);
}

export function DirectionPanel({ state, nodes, presets, compact = false, onAdopt }: DirectionPanelProps) {
  const { locale, hrefFor, isPending, t } = useI18n();
  const [showAllOptions, setShowAllOptions] = useState(false);
  const [query, setQuery] = useState('');
  const titleOf = useMemo(() => {
    const titles = new Map(nodes.map((node) => [node.id, node.title]));
    return (id: string) => titles.get(id) ?? id;
  }, [nodes]);

  const report = state.report;
  const searchable = useMemo(
    () => nodes.filter((node) => (node.granularity ?? 'unit') !== 'topic'),
    [nodes],
  );
  const matches = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (text.length < 2) return [] as NodeSummary[];
    return searchable
      .filter((node) => node.title.toLowerCase().includes(text) || node.id.toLowerCase().includes(text))
      .slice(0, 8);
  }, [query, searchable]);

  if (!report) return null;

  const focus = report.focus;

  const optionCard = (option: RankedOption) => (
    <li key={option.node} className={option.recommended ? 'direction-option recommended' : 'direction-option'} data-node={option.node}>
      <div className="direction-option-head">
        <Link className={isPending(option.title) ? 'i18n-pending' : undefined} title={isPending(option.title) ? t('i18n.pendingTitle') : undefined} to={hrefFor(`/nodes/${encodeURIComponent(option.node)}`)}>
          {option.title}
        </Link>
        <code>{option.node}</code>
      </div>
      <p className="direction-option-tags">
        {option.recommended && <span className="badge badge-recommended">{pick(TEXT.recommendedTag, locale)}</span>}
        {option.inCore
          ? <span className="badge badge-core">{pick(TEXT.inCoreTag, locale)}</span>
          : <span className="badge">{pick(TEXT.outsideTag, locale)}</span>}
        {option.coreLevel !== null && <span className="badge">{pick(TEXT.coreLevelTag, locale)(option.coreLevel)}</span>}
        {option.newlyUnlocked > 0 && <span className="badge badge-unlock">{pick(TEXT.unlocksTag, locale)(option.newlyUnlocked)}</span>}
      </p>
      {/* 依据句直接来自 `direction.ts` 的 `optionBasis`：界面不自己写第二句。 */}
      <p className="direction-basis">{basisOf(option, titleOf, locale)}</p>      <div className="card-actions">
        <button className="button small primary" onClick={() => { state.adopt(option.node); onAdopt?.(option.node); }}>
          {pick(TEXT.adopt, locale)}
        </button>
        <Link className="button small" to={hrefFor(`/nodes/${encodeURIComponent(option.node)}`)}>{pick(TEXT.openNode, locale)}</Link>
      </div>
    </li>
  );

  return (
    <section className="card direction-panel" id="direction" aria-label={pick(TEXT.title, locale)}>
      <h2>{pick(TEXT.title, locale)}</h2>
      {state.error && <p className="error">{pick(TEXT.loadError, locale)(state.error)}</p>}
      <p className="hint">{pick(TEXT.lead, locale)}</p>

      {!focus && (
        <div className="direction-picker">
          <h3>{pick(TEXT.pickTitle, locale)}</h3>
          <p className="hint">{pick(TEXT.pickLead, locale)}</p>
          {presets.length > 0 && (
            <>
              <h4>{pick(TEXT.pickCase, locale)}</h4>
              <p className="muted">{pick(TEXT.pickCaseLead, locale)}</p>
              <ul className="direction-presets">
                {presets.map((preset) => (
                  <li key={preset.id}>
                    <button className="button small" disabled={state.busy} onClick={() => { void state.declare(preset.id); }}>
                      {pick(TEXT.setAsDirection, locale)} · {preset.title}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <h4>{pick(TEXT.pickNode, locale)}</h4>
          <p className="muted">{pick(TEXT.pickNodeLead, locale)}</p>
          <label className="direction-search">
            <span>{pick(TEXT.nodePickerLabel, locale)}</span>
            <input
              type="search"
              value={query}
              placeholder={pick(TEXT.searchPlaceholder, locale)}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {query.trim().length >= 2 && matches.length === 0 && <p className="muted">{pick(TEXT.searchEmpty, locale)}</p>}
          {matches.length > 0 && (
            <ul className="direction-search-results">
              {matches.map((node) => (
                <li key={node.id}>
                  <button className="button small" disabled={state.busy} onClick={() => { void state.declare(node.id); }}>
                    {node.title} <code>{node.id}</code>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="muted"><Link to={hrefFor('/plan')}>{pick(TEXT.planLink, locale)}</Link></p>
        </div>
      )}

      {focus && (
        <>
          <p className="direction-focus">
            {pick(TEXT.focusHint, locale)(titleOf(focus))}
            <code>{focus}</code>
            {report.core.nodes.length > 0 && (
              <span className="muted"> · {pick(TEXT.focusMeta, locale)(report.core.nodes.length, report.core.pending.length)}</span>
            )}
          </p>
          <div className="card-actions">
            {/* 撤回方向：撤掉之后一切照旧（方向是可撤的，不是一次性的选择）。 */}
            {(() => {
              const direction = state.directionIdFor(focus);
              if (!direction) return null;
              return (
                <button className="button small" disabled={state.busy} onClick={() => { void state.withdraw(direction); }}>
                  {pick(TEXT.withdraw, locale)}
                </button>
              );
            })()}
            {state.path.length > 0 && (
              <button className="button small" disabled={state.busy} onClick={() => { if (window.confirm(pick(TEXT.clearPathConfirm, locale))) state.clear(); }}>
                {pick(TEXT.clearPath, locale)}
              </button>
            )}
          </div>
        </>
      )}

      {focus && (
        <>
          <h3>{pick(TEXT.positionTitle, locale)}</h3>
          <dl className="facts compact direction-facts">
            <div><dt>{pick(TEXT.posConfirmed, locale)}</dt><dd>{report.position.confirmedUnits} / {report.position.units}</dd></div>
            <div><dt>{pick(TEXT.posAdopted, locale)}</dt><dd>{report.position.adoptedSteps}</dd></div>
            <div><dt>{pick(TEXT.posStartable, locale)}</dt><dd>{report.position.startable}</dd></div>
            <div><dt>{pick(TEXT.posReachable, locale)}</dt><dd>{report.position.reachable}</dd></div>
            <div><dt>{pick(TEXT.posSideRoads, locale)}</dt><dd>{report.position.sideRoads}</dd></div>
          </dl>

          {report.options.length === 0 ? (
            <div className="direction-empty">
              <h3>{pick(TEXT.noOptionsTitle, locale)}</h3>
              <p className="hint">{pick(TEXT.noOptionsLead, locale)}</p>
              <ul className="direction-missing">
                {report.core.levels[0]?.nodes.slice(0, 6).map((node) => (
                  <li key={node}>
                    <Link to={hrefFor(`/nodes/${encodeURIComponent(node)}`)}>{titleOf(node)}</Link>
                    <span className="muted"> · {pick(TEXT.confirmFirst, locale)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <h3>{pick(TEXT.stepsTitle, locale)}</h3>
              <p className="hint">
                {report.forced
                  ? pick(TEXT.forcedLead, locale)(report.options.length - report.parallelNow)
                  : pick(TEXT.chooseLead, locale)(report.parallelNow)}
              </p>
              <ul className="direction-options direction-next">
                {optionCard(report.recommended as RankedOption)}
              </ul>

              <h3>{pick(TEXT.optionsTitle, locale)}</h3>
              <p className="hint">
                {pick(TEXT.optionsLead, locale)(
                  report.options.length,
                  Math.min(report.options.length, showAllOptions ? report.options.length : OPTION_LIMIT),
                )}
              </p>
              <ul className="direction-options">
                {(showAllOptions ? report.options : report.options.slice(0, OPTION_LIMIT)).map(optionCard)}
              </ul>
              {!showAllOptions && report.options.length > OPTION_LIMIT && (
                <button className="button small" onClick={() => setShowAllOptions(true)}>
                  {pick(TEXT.showAll, locale)} · {pick(TEXT.showMore, locale)(report.options.length - OPTION_LIMIT)}
                </button>
              )}
            </>
          )}

          {report.preview.length > 1 && !compact && (
            <>
              <h3>{pick(TEXT.previewTitle, locale)}</h3>
              <p className="hint">
                {pick(TEXT.previewLead, locale)(report.preview.length)}
                {report.previewTruncated && pick(TEXT.previewTruncated, locale)}
              </p>
              <ol className="direction-preview">
                {report.preview.map((option, index) => (
                  <li key={`${option.node}-${index}`}>
                    <span className="muted">{index + 1}.</span>{' '}
                    <Link to={hrefFor(`/nodes/${encodeURIComponent(option.node)}`)}>{option.title}</Link>
                    {option.newlyUnlocked > 0 && <span className="muted"> · {pick(TEXT.unlocksTag, locale)(option.newlyUnlocked)}</span>}
                  </li>
                ))}
              </ol>
            </>
          )}

          {!compact && (
            <>
              <h3>{pick(TEXT.pathTitle, locale)}</h3>
              <p className="hint">{pick(TEXT.pathLead, locale)}</p>
              {state.path.length === 0 ? (
                <p className="muted">{pick(TEXT.pathEmpty, locale)}</p>
              ) : (
                <ol className="direction-path">
                  {state.path.map((step, index) => (
                    <li key={`${step.node}-${index}`} data-status={step.status}>
                      <Link className={isPending(step.title) ? 'i18n-pending' : undefined} title={isPending(step.title) ? t('i18n.pendingTitle') : undefined} to={hrefFor(`/nodes/${encodeURIComponent(step.node)}`)}>
                        {step.title}
                      </Link>
                      <span className={`badge badge-path badge-${step.status}`}>
                        {step.status === 'confirmed'
                          ? pick(TEXT.pathStatusConfirmed, locale)
                          : step.status === 'stale'
                            ? pick(TEXT.pathStatusStale, locale)
                            : pick(TEXT.pathStatusAdopted, locale)}
                      </span>
                      {step.status !== 'stale' && (
                        <button className="link-button" onClick={() => state.rewind(index)}>{pick(TEXT.rewind, locale)}</button>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}

          <h3>{pick(TEXT.coreTitle, locale)}</h3>
          <p className="hint">{pick(TEXT.coreLead, locale)}</p>
          {report.core.unresolved.length > 0 && (
            <p className="notice">{pick(TEXT.coreUnresolved, locale)(report.core.unresolved.map(titleOf).join('、'))}</p>
          )}
          {report.core.limited && <p className="notice">{pick(TEXT.coreLimited, locale)}</p>}
          <ol className="direction-core">
            {report.core.levels.map((entry) => (
              <li key={entry.level}>
                <span className="direction-core-level">{pick(TEXT.coreLevelTag, locale)(entry.level)}</span>
                <ul className="link-list">
                  {entry.nodes.map((node) => (
                    <li key={node}><Link to={hrefFor(`/nodes/${encodeURIComponent(node)}`)}>{titleOf(node)}</Link></li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          {report.threadExcluded > 0 && (
            <p className="muted">{pick(TEXT.threadExcluded, locale)(report.threadExcluded)}</p>
          )}
        </>
      )}

      {!focus && report.threadExcluded > 0 && (
        <p className="muted">{pick(TEXT.threadExcluded, locale)(report.threadExcluded)}</p>
      )}
    </section>
  );
}

export default DirectionPanel;
