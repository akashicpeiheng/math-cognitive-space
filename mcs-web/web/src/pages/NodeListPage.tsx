import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { formatError, useApi } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import { CASE_LABELS, CONSTRUCT_LABELS, ROLE_LABELS, constructLabel, plainMathText, roleLabel } from '../labels';
import { useScrollMemory } from '../scroll-memory';
import { useLearningData } from '../useLearningData';
import { useMediaQuery, COMPACT_QUERY } from '../useMediaQuery';
import { buildFacet, relationKindHint } from '../facets';
import type { NodeSummary } from '../types';

/** 一页显示多少张卡：先给一屏半，往下走再手动加载，避免一次渲染几百张。 */
const PAGE = 60;
/** 接口一次最多返回多少条（`server/api.mjs` 的硬上限）；返回条数正好等于它就是被截断了。 */
const SERVER_LIMIT = 500;

type SortId = 'content' | 'registered' | 'title';

const SORTS: Array<{ id: SortId; label: string; note: string }> = [
  { id: 'content', label: '有正文优先', note: '把已经写好正文的对象排在前面；正文待写的排在后面，仍然可以看。' },
  { id: 'registered', label: '登记顺序', note: '本体里的登记顺序：先背景与基础，再具体内容。' },
  { id: 'title', label: '按标题', note: '按标题排序，适合已经知道要找哪个对象时。' },
];

/**
 * 数学对象列表。
 *
 * 这一页的目标是「让学习者找到现在能读的那个对象」，不是「把本体表格铺出来」。因此：
 *
 * - **五类筛选**（关键词、案例、学科、构造、角色）全部保存在 URL 里，刷新、分享与返回都回到同一视角；
 *   学科选项来自完整目录而不是当前结果，否则选完「分析」就再也切不回去。
 * - **默认按「有正文优先」排序**：登记顺序的开头是九张背景脚手架节点（0 行动、0 证据、无正文），
 *   让它们占满首屏是拿学习者的第一印象换资料完整性。排序依据写在页面上，可切换（也可以切回登记顺序）。
 * - **学习状态来自 E**：已确认、已读、还不懂、现在可学都标在卡片上；这些状态只读，页面不写任何 E。
 * - **一次取全、按页渲染**：接口默认上限 200 条，而本体已有 232 个节点——照默认值调用会让
 *   32 个节点在界面上永远不可达。这里显式请求上限，并用「显示更多」分页；真的触到接口上限时如实说明。
 */
export function NodeListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const read = (key: string, fallback = '全部') => searchParams.get(key) ?? fallback;
  const caseFilter = read('case');
  /*
   * 条目粒度（2026-10 加）：默认只看**单元**（最小的可独立认知单元）。
   *
   * 用户的原话：「节点是最小的可独立认知单元，这些是话题范畴下的内容，要去分开。」
   * 接口默认就是 unit，这里把选择放进 URL：刷新、分享、返回都回到同一个视角。
   */
  const granularity = read('show') === 'topics' ? 'topic' : read('show') === 'all' ? 'all' : 'unit';
  const discipline = read('discipline');
  const construct = read('construct');
  const role = read('role');
  const sortId = read('sort', 'content') as SortId;
  const onlyWithContent = searchParams.get('content') === '1';
  const onlyUnread = searchParams.get('unread') === '1';
  const compact = useMediaQuery(COMPACT_QUERY);
  const [shown, setShown] = useState(PAGE);

  /**
   * 关键词输入与 URL 同步，但不为每次按键写一条历史：返回时仍然回到同一个筛选视角。
   * 只有「不在输入状态」时才把 URL 回灌到输入框——否则输入过程中的中间 URL 会把
   * 刚敲进去的字覆盖掉（中文输入法下尤其明显）。
   */
  const searchKey = searchParams.toString();
  useEffect(() => {
    if (document.activeElement === searchInputRef.current) return;
    const urlQuery = searchParams.get('q') ?? '';
    setQuery((current) => (current.trim() === urlQuery ? current : urlQuery));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);
  // 换筛选条件就从第一页看起，否则「显示更多」的页数会留在上一个查询上。
  useEffect(() => { setShown(PAGE); }, [searchKey]);

  function update(patch: Record<string, string | null>, options: { replace?: boolean } = {}) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '' || value === '全部') next.delete(key);
      else next.set(key, value);
    }
    setSearchParams(next, { replace: options.replace ?? true });
  }

  function clearAll() {
    setQuery('');
    setSearchParams(new URLSearchParams(), { replace: false });
  }

  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  if (discipline !== '全部') params.set('discipline', discipline);
  if (construct !== '全部') params.set('construct', construct);
  if (role !== '全部') params.set('role', role);
  if (caseFilter !== '全部') params.set('case', caseFilter);
  if (granularity !== 'unit') params.set('granularity', granularity);
  // 显式请求接口上限：默认 200 会让排在后面的节点永远看不到。
  params.set('limit', '500');
  const path = `/ontology/nodes?${params.toString()}`;
  const result = useApi<{ nodes: NodeSummary[]; total: number; returned: number; limitCap?: number }>(path, [path]);
  /** 完整目录只用来生成筛选选项；筛选本身仍走服务端查询。 */
  // 目录取**全量**（含话题级）：筛选选项与「另有 N 条话题」的计数都要如实。
  const catalog = useApi<{ nodes: NodeSummary[]; granularityCounts?: { unit: number; topic: number } }>('/ontology/nodes?limit=500&granularity=all');
  const catalogNodes = useMemo(() => catalog.data?.nodes ?? [], [catalog.data]);
  /** 两种粒度的条数：接口给的是**全库**统计（切到「话题」时列表变短，计数不该跟着变）。 */
  const topicCounts = useMemo(() => {
    const counts = catalog.data?.granularityCounts;
    if (counts) return counts;
    const unit = catalogNodes.filter((node) => (node.granularity ?? 'unit') === 'unit').length;
    return { unit, topic: catalogNodes.length - unit };
  }, [catalog.data, catalogNodes]);
  /*
   * 分面（学科 / 来源 / 构造 / 角色）的取数**跟随当前粒度档**。
   *
   * 不跟随的话会出现「选项标称 126、筛选结果 100」这种自相矛盾：选项按全量（含话题）统计，
   * 而筛选结果默认只列单元（2026-10 起话题是另一层）。同一页面上两个口径，用户只会觉得数字错了。
   */
  const facetNodes = useMemo(() => {
    if (granularity === 'all') return catalogNodes;
    return catalogNodes.filter((node) => (node.granularity ?? 'unit') === granularity);
  }, [catalogNodes, granularity]);
  const disciplines = useMemo(
    () => ['全部', ...new Set(facetNodes.map((node) => node.discipline))],
    [facetNodes],
  );
  /**
   * 构造与角色的筛选选项**只从真有的节点里长**（并带计数）。
   *
   * 这里原先直接用 `Object.keys(CONSTRUCT_LABELS)`：模板 14 类全铺出来，
   * 而本体只登记了 11 类——「项 / 定义 / 表征」选中后永远是 0 个节点
   * （本体里既没有 `construct=Definition` 也没有 `role=Definition`）。
   * 空类别不放进下拉，只在下方如实说明。
   */
  const caseFacet = useMemo(
    () => buildFacet(facetNodes, (node) => [node.case], (value) => plainMathText(CASE_LABELS[value] ?? value), Object.keys(CASE_LABELS)),
    [facetNodes],
  );
  const constructFacet = useMemo(
    () => buildFacet(facetNodes, (node) => [node.construct], constructLabel, Object.keys(CONSTRUCT_LABELS)),
    [facetNodes],
  );
  const roleFacet = useMemo(
    () => buildFacet(facetNodes, (node) => node.roles ?? [], roleLabel, Object.keys(ROLE_LABELS)),
    [facetNodes],
  );
  /** 「类比」这类词是关系种类，不是节点类型：命中时给出条数与去处。 */
  const relations = useApi<{ summary: { total: number; byKind: Record<string, number> } }>('/ontology/relations');
  const relationHint = useMemo(
    () => relationKindHint(query, relations.data?.summary.byKind ?? null),
    [query, relations.data],
  );

  /** 学习状态（只读 E）：确认、已读、还不懂与「现在可学」。 */
  const { progress } = useLearningData();
  const readyIds = useMemo(() => new Set((progress?.ready ?? []).map((item) => item.node)), [progress]);
  const stateOf = (node: NodeSummary): { key: string; label: string } | null => {
    if (!progress) return null;
    if (progress.confirmedNodes.has(node.id)) return { key: 'confirmed', label: '已确认' };
    if (progress.unknownNodes.has(node.id)) return { key: 'unknown', label: '还不懂' };
    if (readyIds.has(node.id)) return { key: 'ready', label: '现在可学' };
    if (progress.readNodes.has(node.id)) return { key: 'read', label: '已读' };
    return null;
  };

  const activeFilters: Array<[string, string]> = [];
  if (query.trim()) activeFilters.push(['q', `搜索：${query.trim()}`]);
  if (caseFilter !== '全部') activeFilters.push(['case', `案例：${CASE_LABELS[caseFilter] ?? caseFilter}`]);
  if (discipline !== '全部') activeFilters.push(['discipline', `学科：${discipline}`]);
  if (construct !== '全部') activeFilters.push(['construct', `构造：${constructLabel(construct)}`]);
  if (role !== '全部') activeFilters.push(['role', `角色：${roleLabel(role)}`]);
  if (granularity !== 'unit') activeFilters.push(['show', granularity === 'topic' ? '只看话题级条目' : '话题 + 单元']);
  if (onlyWithContent) activeFilters.push(['content', '只看有正文的']);
  if (onlyUnread) activeFilters.push(['unread', '只看我没读过的']);

  /** 排序与两个本地开关都在前端算：数据已经全在手里，不需要再问服务端一遍。 */
  const nodes = useMemo(() => {
    const list = [...(result.data?.nodes ?? [])];
    const sort = SORTS.find((item) => item.id === sortId) ?? SORTS[0];
    if (sort.id === 'title') list.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'));
    else if (sort.id === 'content') list.sort((a, b) => Number(b.hasContent) - Number(a.hasContent));
    return list;
  }, [result.data, sortId]);

  const filtered = useMemo(() => nodes.filter((node) => {
    if (onlyWithContent && !node.hasContent) return false;
    if (onlyUnread && progress?.readNodes.has(node.id)) return false;
    return true;
  }), [nodes, onlyWithContent, onlyUnread, progress]);

  const total = result.data?.total ?? 0;
  const fetched = result.data?.returned ?? 0;
  const hiddenByUnread = onlyUnread && progress ? nodes.length - filtered.length : 0;
  const visible = filtered.slice(0, shown);
  /**
   * 接口上限只有一种可判定的情况：返回条数**正好等于**请求上限。
   * 用 total 去比 returned 是错的——returned 是「筛选之后」的条数，
   * 加了条件以后两者本来就不等（这一点写错过一次，记在这里）。
   */
  const cappedByServer = fetched >= SERVER_LIMIT;
  const filteredByAnything = activeFilters.length > 0;
  useScrollMemory(`/nodes?${searchParams.toString()}`, Boolean(result.data));

  return (
    <div className="page nodes-page">
      <div className="section-heading">
        <h1>数学对象</h1>
        <p>
          这里是一个个可以读的数学对象：概念、定义、命题、证明、例子、反例、方法。
          每张卡上标着它的构造类型、承担的角色，以及你在它上面的学习状态；点开就是它的页面。
        </p>
        <details className="glossary">
          <summary>这些标签是什么意思？</summary>
          <dl>
            <div>
              <dt>构造类型</dt>
              <dd>这个对象<b>在数学上是什么</b>：{CONSTRUCT_LABELS.Concept}、{CONSTRUCT_LABELS.Claim}、{CONSTRUCT_LABELS.Proof}、{CONSTRUCT_LABELS.Counterexample}……</dd>
            </div>
            <div>
              <dt>角色</dt>
              <dd>它<b>被用来做什么</b>（可以同时有几个）：{ROLE_LABELS.Axiom}、{ROLE_LABELS.Theorem}、{ROLE_LABELS.Property}、{ROLE_LABELS.LocalMethod}……</dd>
            </div>
            <div>
              <dt>证据等级</dt>
              <dd>它的论证到了哪一步：正文证明、有限检查、引用来源、示例，或明确不声称。</dd>
            </div>
            <div>
              <dt>学习状态</dt>
              <dd>只属于你的那份记录：已确认（你说过会用）、已读（读过，不等于会）、还不懂、现在可学（引入它的条件都齐了）。</dd>
            </div>
          </dl>
        </details>
      </div>

      {/* 窄屏把四个下拉收进折叠区：390×844 下筛选栏曾把第一张卡挤到 913px（整屏无内容）。 */}
      <details className="filters-card" open={!compact}>
        <summary>
          筛选{activeFilters.length > 0 ? ` · ${activeFilters.length} 个条件` : ''}
        </summary>
        <div className="filters card">
          <label className="filters-search">
            搜索
            <input
              ref={searchInputRef}
              value={query}
              onChange={(event) => { setQuery(event.target.value); update({ q: event.target.value || null }); }}
              placeholder="标题、ID 或摘要"
            />
          </label>
          <label>
            {/*
              「来源」而不是「案例」：这一栏筛的是**出身**（哪本教材 / 哪个案例），
              与「学科」是两件事——用户的要求正是「不要按教材分类节点，按知识的本质领域去分类」。
              两个筛选并列放在这里，出身与领域分得清清楚楚。
            */}
            来源
            <select value={caseFilter} onChange={(event) => update({ case: event.target.value })}>
              {/* `<option>` 不能走 Markdown：C^k 用 Unicode 上标，别在下拉框里留脱字符。
                  选项同样只列真有的案例（带计数）。 */}
              <option value="全部">全部</option>
              {caseFacet.present.map((item) => (
                <option key={item.value} value={item.value}>{item.label}（{item.count}）</option>
              ))}
            </select>
          </label>
          <label>
            学科（本质领域）
            <select value={discipline} onChange={(event) => update({ discipline: event.target.value })}>
              {disciplines.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            {/*
              条目粒度：默认只看**单元**。话题级条目是「一节/一章的范围」，不是可独立认知的对象，
              因此默认不混进列表；想连话题一起看就切到「话题 + 单元」，计数如实写出来。
            */}
            条目粒度
            <select
              value={granularity}
              onChange={(event) => update({
                show: event.target.value === 'unit' ? null : event.target.value === 'topic' ? 'topics' : 'all',
              })}
            >
              <option value="unit">单元（{topicCounts.unit}）</option>
              <option value="topic">话题（{topicCounts.topic}）</option>
              <option value="all">话题 + 单元（{topicCounts.unit + topicCounts.topic}）</option>
            </select>
          </label>
          <label>
            构造类型
            <select value={construct} onChange={(event) => update({ construct: event.target.value })}>
              <option value="全部">全部</option>
              {constructFacet.present.map((item) => (
                <option key={item.value} value={item.value}>{item.label}（{item.count}）</option>
              ))}
            </select>
          </label>
          <label>
            角色
            <select value={role} onChange={(event) => update({ role: event.target.value })}>
              <option value="全部">全部</option>
              {roleFacet.present.map((item) => (
                <option key={item.value} value={item.value}>{item.label}（{item.count}）</option>
              ))}
            </select>
          </label>
          <label>
            排序
            <select value={sortId} onChange={(event) => update({ sort: event.target.value === 'content' ? null : event.target.value })}>
              {SORTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
        </div>
      </details>

      {/*
        空类别的说明（2026-10 改口径 + 改成可展开）。
        原来是一段常驻的长说明，把手机端第一张卡推到 847px（390×844 首屏看不到内容）。
        现在一句话说明**结论**（那些词必须留在可见文字里，测试与读者都靠它），
        登记去处收进可展开部分——「术语收进可展开的说明」这条本来就写在页面里。
      */}
      {(constructFacet.absent.length > 0 || roleFacet.absent.length > 0) && (
        <details className="facet-absent">
          <summary>
            本体不把「{constructFacet.absent.join('、') || '（无）'}」登记成独立节点，因此<strong>不放进筛选</strong>
            （选中只会得到 0 个）。点开看它们登记在哪里。
          </summary>
          <p>
            这是本站的登记约定，不是缺数据：定义写在概念节点的负载与正文里（模板支持 Definition，但定义不单独成节点）；
            表征写成节点内的 <code>representations</code> 子记录（研究台的「形式语言装备」与节点页都能看到）；
            项写在签名的常元与各节点的类型环境里。约定全文见 README 的「构造类型的登记约定」。
            {roleFacet.absent.length > 0 && <>　这几种角色也没有节点承担：{roleFacet.absent.join('、')}。</>}
          </p>
        </details>
      )}
      {relationHint && <p className="notice">{relationHint}</p>}

      <div className="list-controls">
        <label className="toggle checkbox">
          <input
            type="checkbox"
            checked={onlyWithContent}
            onChange={(event) => update({ content: event.target.checked ? '1' : null }, { replace: false })}
          />
          只看有正文的
        </label>
        <label className="toggle checkbox">
          <input
            type="checkbox"
            checked={onlyUnread}
            disabled={!progress}
            onChange={(event) => update({ unread: event.target.checked ? '1' : null }, { replace: false })}
          />
          只看我没读过的
        </label>
        {!progress && <span className="muted">（选择档案后才能按学习状态筛选）</span>}
      </div>

      {result.loading && <p>加载中…</p>}
      {result.error && <p className="error">{formatError(result.error)}</p>}
      {result.data && (
        <p className="result-count">
          {filteredByAnything
            ? `符合当前条件 ${filtered.length} 个`
            : `显示 ${visible.length} / ${filtered.length} 个登记节点`}
          {filteredByAnything && ` · 全部登记 ${total} 个`}
          {hiddenByUnread > 0 && `，已按你的阅读状态排除 ${hiddenByUnread} 个读过的`}
          {/*
            如实说明默认没显示什么：话题级条目不在这一列里，它不是被过滤掉的噪声，
            而是**另一层**（一节/一章的范围）。不给这句话，用户会以为本库只有这么多对象。
          */}
          {granularity === 'unit' && topicCounts.topic > 0
            && `；另有 ${topicCounts.topic} 条话题级条目（一节或一章的范围，不是可独立认知的单元），把「条目粒度」切到「话题」即可看到`}
          {granularity === 'topic' && `；这里只列话题级条目，${topicCounts.unit} 个单元在「单元」一档`}
          {cappedByServer && `。接口一次最多返回 ${SERVER_LIMIT} 条，请用筛选或搜索缩小范围`}
        </p>
      )}
      {result.data && filtered.length === 0 && (
        <section className="card empty-state">
          <h2>没有符合条件的节点</h2>
          <p className="muted">当前筛选条件：</p>
          <ul className="filter-chips">
            {activeFilters.map(([key, label]) => (
              <li key={key}>
                {label}
                <button
                  className="chip-clear"
                  aria-label={`清除筛选：${label}`}
                  onClick={() => update(key === 'q' ? { q: null } : { [key]: null }, { replace: false })}
                >✕</button>
              </li>
            ))}
          </ul>
          <div className="card-actions">
            <button className="button primary" onClick={clearAll}>清除全部筛选</button>
            <Link className="button" to="/network">到知识网络里按关系找</Link>
          </div>
        </section>
      )}
      <div className="node-grid">
        {visible.map((node) => {
          const state = stateOf(node);
          return (
            <Link className="card node-card" key={node.id} to={`/nodes/${encodeURIComponent(node.id)}`} data-state={state?.key ?? 'none'}>
              <div className="node-card-head">
                <span className="construct" title={node.construct}>{constructLabel(node.construct)}</span>
                {node.roles.slice(0, 3).map((item) => <span className="role" key={item} title={item}>{roleLabel(item)}</span>)}
                {node.evidenceStatus && <StatusBadge status={node.evidenceStatus} title={`证据等级：${node.evidenceStatus}`} />}
                {state && <span className={`node-state is-${state.key}`}>{state.label}</span>}
              </div>
              {/* 卡片是纯文本上下文：C^k 这类记号要走 Unicode 上标，不能留脱字符。 */}
              <h3>{plainMathText(node.title)}</h3>
              <p>{plainMathText(node.summary)}</p>
              <footer>
                <span>{node.discipline}</span>
                {node.hasContent
                  ? <span>{node.relationCount > 0 ? `${node.relationCount} 条登记关系` : '暂无登记关系'}</span>
                  : <span className="node-pending">正文待写</span>}
                {node.actionCount > 0 && <span>{node.actionCount} 种引入方式</span>}
                {node.evidenceCount > 0 && <span>{node.evidenceCount} 条证据</span>}
              </footer>
            </Link>
          );
        })}
      </div>
      {shown < filtered.length && (
        <div className="load-more">
          <button className="button" onClick={() => setShown((current) => current + PAGE)}>
            显示更多（还有 {filtered.length - shown} 个）
          </button>
        </div>
      )}
    </div>
  );
}
