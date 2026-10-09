import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { formatError, useApi } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import { useI18n } from '../i18n';
import { useLabels } from '../i18n/useLabels';
import { CASE_LABELS, CONSTRUCT_LABELS, ROLE_LABELS, plainMathText } from '../labels';
import { useScrollMemory } from '../scroll-memory';
import { useLearningData } from '../useLearningData';
import { useMediaQuery, COMPACT_QUERY } from '../useMediaQuery';
import { buildFacet, relationKindHint } from '../facets';
import type { NodeSummary } from '../types';

/** 一页显示多少张卡：先给一屏半，往下走再手动加载，避免一次渲染几百张。 */
const PAGE = 60;
/** 接口一次最多返回多少条（`server/api.mjs` 的硬上限）；返回条数正好等于它就是被截断了。 */
const SERVER_LIMIT = 500;
/**
 * 筛选里的「全部」哨兵值。
 *
 * 它是**控制值**，不是显示文案：`update()` 靠它判断要不要把这个查询参数删掉，
 * 中英两版共用同一个值（换语种不该换 URL 语义）。下拉里显示的那个「全部 / All」
 * 才是要翻译的东西。
 */
const FILTER_ALL = '全部';

type SortId = 'content' | 'registered' | 'title';

/** 排序档位的 id 顺序＝下拉里的显示顺序；中文渲染顺序与从前逐字相同。 */
const SORT_IDS: SortId[] = ['content', 'registered', 'title'];

/** 成对文案：漏写一边编译不过，取用时走 `useI18n().pick`。 */
interface Pair { zh: string; en: string }

/**
 * 本页自己的界面文案（中英成对）。
 *
 * 为什么不往 `i18n/messages.ts` 堆：手册 §1 规定那张表只放**通用壳层**文案，
 * 页面自己的长文案留在页面模块里，否则它很快会变成垃圾场。这里只有本页用得到的词。
 *
 * `{name}` 是占位符，由 `fill()` 按当前语种填数——中文说「符合当前条件 3 个」，
 * 英文说「3 match the current filters」，语序不同，不能靠拼字符串硬凑。
 */
const TEXT = {
  lead: {
    zh: '这里是一个个可以读的数学对象：概念、定义、命题、证明、例子、反例、方法。 每张卡上标着它的构造类型、承担的角色，以及你在它上面的学习状态；点开就是它的页面。',
    en: 'These are mathematical objects you can actually read: concepts, definitions, claims, proofs, examples, counterexamples, methods. Each card shows its construct type, the roles it plays, and your learning state on it; open a card to read that object’s page.',
  },
  glossarySummary: { zh: '这些标签是什么意思？', en: 'What do these labels mean?' },
  glossaryConstructTerm: { zh: '构造类型', en: 'Construct type' },
  glossaryConstructLead: { zh: '这个对象', en: 'What this object ' },
  glossaryConstructStrong: { zh: '在数学上是什么', en: 'is, mathematically' },
  glossaryConstructTail: { zh: '：', en: ': ' },
  glossaryRoleTerm: { zh: '角色', en: 'Role' },
  glossaryRoleLead: { zh: '它', en: 'What it ' },
  glossaryRoleStrong: { zh: '被用来做什么', en: 'is used for' },
  glossaryRoleTail: { zh: '（可以同时有几个）：', en: ' (it can have several at once): ' },
  glossaryEvidenceTerm: { zh: '证据等级', en: 'Evidence level' },
  glossaryEvidenceBody: {
    zh: '它的论证到了哪一步：正文证明、有限检查、引用来源、示例，或明确不声称。',
    en: 'How far its justification goes: a proof in the body, a finite check, a cited source, an illustration, or an explicit “not claimed”.',
  },
  glossaryStateTerm: { zh: '学习状态', en: 'Learning state' },
  glossaryStateBody: {
    zh: '只属于你的那份记录：已确认（你说过会用）、已读（读过，不等于会）、还不懂、现在可学（引入它的条件都齐了）。',
    en: 'Your own record only: confirmed (you said you can use it), read (read is not the same as known), not understood yet, and ready to learn (everything that introduces it is in place).',
  },
  ellipsis: { zh: '……', en: '…' },

  filtersSummary: { zh: '筛选', en: 'Filters' },
  filtersCount: { zh: ' · {n} 个条件', en: ' · {n} active' },
  searchLabel: { zh: '搜索', en: 'Search' },
  searchPlaceholder: { zh: '标题、ID 或摘要', en: 'Title, ID or summary' },
  sourceLabel: { zh: '来源', en: 'Source' },
  disciplineLabel: { zh: '学科（本质领域）', en: 'Discipline (essential field)' },
  granularityLabel: { zh: '条目粒度', en: 'Item granularity' },
  granularityUnit: { zh: '单元（{n}）', en: 'Units ({n})' },
  granularityTopic: { zh: '话题（{n}）', en: 'Topics ({n})' },
  granularityAll: { zh: '话题 + 单元（{n}）', en: 'Topics + units ({n})' },
  constructLabel: { zh: '构造类型', en: 'Construct type' },
  roleLabel: { zh: '角色', en: 'Role' },
  sortLabel: { zh: '排序', en: 'Sort' },
  all: { zh: '全部', en: 'All' },
  /* 分面选项的计数后缀：中文用全角括号，英文用半角——括号也是壳层文案的一部分。 */
  facetOption: { zh: '{label}（{n}）', en: '{label} ({n})' },

  absentLead: { zh: '本体不把「', en: 'The ontology does not register ' },
  absentNone: { zh: '（无）', en: '(none)' },
  absentMid: { zh: '」登记成独立节点，因此', en: ' as standalone nodes, so it ' },
  absentStrong: { zh: '不放进筛选', en: 'leaves them out of the filters' },
  absentTail: { zh: '（选中只会得到 0 个）。点开看它们登记在哪里。', en: ' (selecting one would always return 0). Open this to see where they are registered.' },
  absentBodyLead: {
    zh: '这是本站的登记约定，不是缺数据：定义写在概念节点的负载与正文里（模板支持 Definition，但定义不单独成节点）； 表征写成节点内的 ',
    en: 'This is a registration convention of this site, not missing data: definitions live in the payload and body of concept nodes (the template supports Definition, but a definition is never a standalone node); representations are written as ',
  },
  absentBodyTail: {
    zh: ' 子记录（研究台的「形式语言装备」与节点页都能看到）； 项写在签名的常元与各节点的类型环境里。约定全文见 README 的「构造类型的登记约定」。',
    en: ' sub-records inside a node (visible both in the research bench’s “formal-language equipment” and on the node page); terms live in the signature’s constants and in each node’s type environment. The full convention is in the README section “构造类型的登记约定”.',
  },
  absentRoleLead: { zh: '　这几种角色也没有节点承担：', en: ' No node carries these roles either: ' },
  /* 句末标点也要按语种给：英文里落一个「。」是中文标点串进英文句子。 */
  sentenceEnd: { zh: '。', en: '.' },

  onlyContent: { zh: '只看有正文的', en: 'Only objects with a body' },
  onlyUnread: { zh: '只看我没读过的', en: 'Only ones I have not read' },
  needProfile: { zh: '（选择档案后才能按学习状态筛选）', en: '(choose a profile to filter by learning state)' },

  loading: { zh: '加载中…', en: 'Loading…' },
  countMatched: { zh: '符合当前条件 {n} 个', en: '{n} match the current filters' },
  countShown: { zh: '显示 {shown} / {total} 个登记节点', en: 'Showing {shown} / {total} registered objects' },
  countAll: { zh: ' · 全部登记 {n} 个', en: ' · {n} registered in total' },
  countUnreadExcluded: { zh: '，已按你的阅读状态排除 {n} 个读过的', en: ', {n} already read excluded by your reading state' },
  countTopicNote: {
    zh: '；另有 {n} 条话题级条目（一节或一章的范围，不是可独立认知的单元），把「条目粒度」切到「话题」即可看到',
    en: '; {n} more topic-level entries (the scope of a section or a chapter, not an independently learnable unit) — switch “Item granularity” to “Topics” to see them',
  },
  countUnitNote: {
    zh: '；这里只列话题级条目，{n} 个单元在「单元」一档',
    en: '; only topic-level entries are listed here; {n} units are under “Units”',
  },
  countCapped: {
    zh: '。接口一次最多返回 {n} 条，请用筛选或搜索缩小范围',
    en: '. The API returns at most {n} rows at a time; narrow the range with filters or search',
  },

  emptyTitle: { zh: '没有符合条件的节点', en: 'No objects match these filters' },
  emptyFilters: { zh: '当前筛选条件：', en: 'Current filters:' },
  clearFilterAria: { zh: '清除筛选：{label}', en: 'Clear filter: {label}' },
  clearAll: { zh: '清除全部筛选', en: 'Clear all filters' },
  toNetwork: { zh: '到知识网络里按关系找', en: 'Find it by relation in the knowledge network' },

  evidenceLevel: { zh: '证据等级：{status}', en: 'Evidence level: {status}' },
  relationCount: { zh: '{n} 条登记关系', en: '{n} registered relations' },
  noRelations: { zh: '暂无登记关系', en: 'No registered relations yet' },
  bodyPending: { zh: '正文待写', en: 'Body not written yet' },
  actionCount: { zh: '{n} 种引入方式', en: '{n} ways to introduce it' },
  evidenceCount: { zh: '{n} 条证据', en: '{n} evidence records' },
  loadMore: { zh: '显示更多（还有 {n} 个）', en: 'Show more ({n} left)' },

  stateUnknown: { zh: '还不懂', en: 'Not understood yet' },
  /* 状态芯片的词直接取 `messages.ts`：`status.confirmed`（中文「已确认」，英文 `Confirmed usable`——
     英文侧与详情页的 `status.confirmedUsable` 统一，中文侧各自保留原词，见那里的说明）、
     `status.readyToLearn`、`status.read`。这里不再本地重复一份。 */

  chipSearch: { zh: '搜索：{value}', en: 'Search: {value}' },
  chipCase: { zh: '案例：{value}', en: 'Case: {value}' },
  chipDiscipline: { zh: '学科：{value}', en: 'Discipline: {value}' },
  chipConstruct: { zh: '构造：{value}', en: 'Construct: {value}' },
  chipRole: { zh: '角色：{value}', en: 'Role: {value}' },
  chipTopicOnly: { zh: '只看话题级条目', en: 'Only topic-level entries' },
  chipTopicAndUnit: { zh: '话题 + 单元', en: 'Topics + units' },
} satisfies Record<string, Pair>;

/** 排序档位的标签与说明（说明当前只在词表里备着，与从前一样不出现在界面上）。 */
const SORT_TEXT: Record<SortId, { label: Pair; note: Pair }> = {
  content: {
    label: { zh: '有正文优先', en: 'With a body first' },
    note: { zh: '把已经写好正文的对象排在前面；正文待写的排在后面，仍然可以看。', en: 'Objects that already have a body come first; those whose body is still to be written come after and remain readable.' },
  },
  registered: {
    label: { zh: '登记顺序', en: 'Registration order' },
    note: { zh: '本体里的登记顺序：先背景与基础，再具体内容。', en: 'The registration order in the ontology: background and foundations first, then concrete content.' },
  },
  title: {
    label: { zh: '按标题', en: 'By title' },
    note: { zh: '按标题排序，适合已经知道要找哪个对象时。', en: 'Sort by title — useful when you already know which object you are looking for.' },
  },
};

/** 把 `{name}` 占位符换成实际数字或文字；未登记的键原样保留，不静默变成空白。 */
function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

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
  /** 界面文案与语种相关的三件事：取词、标注未译条目、拼带语种前缀的站内链接。 */
  const { t, locale, pick, isPending, hrefFor } = useI18n();
  /** 受控词表的显示名（构造、角色、案例…）：跟着语种走，必须用 useLabels 才会重渲染。 */
  const labels = useLabels();
  /**
   * 学科的显示名。
   *
   * 受控词表键本身**不翻译**（`discipline` 还是 `分析`，筛选参数与接口口径都不动），
   * 只有显示名走 `labels.ts` 的成对表；表里没登记的学科如实回退原值，不显示空白。
   */
  const disciplineText = (value: string) => labels.tables.disciplines[value] ?? value;
  const read = (key: string, fallback = FILTER_ALL) => searchParams.get(key) ?? fallback;
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
  /** 未登记或拼错的排序值回落到默认档，与从前 `SORTS.find(...) ?? SORTS[0]` 的行为一致。 */
  const activeSort: SortId = SORT_IDS.includes(sortId) ? sortId : 'content';
  /** 标题排序的排序规则跟着语种走：中文保持原来的 `zh-Hans-CN`，英文用 `en`。 */
  const collation = locale === 'en' ? 'en' : 'zh-Hans-CN';
  const onlyWithContent = searchParams.get('content') === '1';
  const onlyUnread = searchParams.get('unread') === '1';
  const compact = useMediaQuery(COMPACT_QUERY);
  const [shown, setShown] = useState(PAGE);

  /** 排序下拉的选项：随语种重建（`pick` 随语种变化，见 i18n Provider 的 useMemo）。 */
  const sorts = useMemo(
    () => SORT_IDS.map((id) => ({ id, label: pick(SORT_TEXT[id].label), note: pick(SORT_TEXT[id].note) })),
    [pick],
  );

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
      if (value === null || value === '' || value === FILTER_ALL) next.delete(key);
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
  if (discipline !== FILTER_ALL) params.set('discipline', discipline);
  if (construct !== FILTER_ALL) params.set('construct', construct);
  if (role !== FILTER_ALL) params.set('role', role);
  if (caseFilter !== FILTER_ALL) params.set('case', caseFilter);
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
    () => [FILTER_ALL, ...new Set(facetNodes.map((node) => node.discipline))],
    [facetNodes],
  );
  /**
   * 构造与角色的筛选选项**只从真有的节点里长**（并带计数）。
   *
   * 这里原先直接用 `Object.keys(CONSTRUCT_LABELS)`：模板 14 类全铺出来，
   * 而本体只登记了 11 类——「项 / 定义 / 表征」选中后永远是 0 个节点
   * （本体里既没有 `construct=Definition` 也没有 `role=Definition`）。
   * 空类别不放进下拉，只在下方如实说明。
   *
   * `labels` 每次渲染都是新对象（`useLabels()` 不缓存），所以这三处 memo 实际上是
   * 「跟着语种重算」——分面只有几百个节点，这点开销换「英文站上选项不会留着中文」是值得的。
   */
  const caseFacet = useMemo(
    () => buildFacet(facetNodes, (node) => [node.case], (value) => plainMathText(labels.caseLabel(value)), Object.keys(CASE_LABELS)),
    [facetNodes, labels],
  );
  const constructFacet = useMemo(
    () => buildFacet(facetNodes, (node) => [node.construct], labels.constructLabel, Object.keys(CONSTRUCT_LABELS)),
    [facetNodes, labels],
  );
  const roleFacet = useMemo(
    () => buildFacet(facetNodes, (node) => node.roles ?? [], labels.roleLabel, Object.keys(ROLE_LABELS)),
    [facetNodes, labels],
  );
  /** 「类比」这类词是关系种类，不是节点类型：命中时给出条数与去处（按当前语种给文案）。 */
  const relations = useApi<{ summary: { total: number; byKind: Record<string, number> } }>('/ontology/relations');
  const relationHint = useMemo(
    () => relationKindHint(query, relations.data?.summary.byKind ?? null, locale),
    [query, relations.data, locale],
  );

  /** 学习状态（只读 E）：确认、已读、还不懂与「现在可学」。 */
  const { progress } = useLearningData();
  const readyIds = useMemo(() => new Set((progress?.ready ?? []).map((item) => item.node)), [progress]);
  const stateOf = (node: NodeSummary): { key: string; label: string } | null => {
    if (!progress) return null;
    if (progress.confirmedNodes.has(node.id)) return { key: 'confirmed', label: t('status.confirmed') };
    if (progress.unknownNodes.has(node.id)) return { key: 'unknown', label: pick(TEXT.stateUnknown) };
    if (readyIds.has(node.id)) return { key: 'ready', label: t('status.readyToLearn') };
    if (progress.readNodes.has(node.id)) return { key: 'read', label: t('status.read') };
    return null;
  };

  const activeFilters: Array<[string, string]> = [];
  if (query.trim()) activeFilters.push(['q', fill(pick(TEXT.chipSearch), { value: query.trim() })]);
  if (caseFilter !== FILTER_ALL) activeFilters.push(['case', fill(pick(TEXT.chipCase), { value: labels.caseLabel(caseFilter) })]);
  if (discipline !== FILTER_ALL) activeFilters.push(['discipline', fill(pick(TEXT.chipDiscipline), { value: disciplineText(discipline) })]);
  if (construct !== FILTER_ALL) activeFilters.push(['construct', fill(pick(TEXT.chipConstruct), { value: labels.constructLabel(construct) })]);
  if (role !== FILTER_ALL) activeFilters.push(['role', fill(pick(TEXT.chipRole), { value: labels.roleLabel(role) })]);
  if (granularity !== 'unit') activeFilters.push(['show', pick(granularity === 'topic' ? TEXT.chipTopicOnly : TEXT.chipTopicAndUnit)]);
  if (onlyWithContent) activeFilters.push(['content', pick(TEXT.onlyContent)]);
  if (onlyUnread) activeFilters.push(['unread', pick(TEXT.onlyUnread)]);

  /** 排序与两个本地开关都在前端算：数据已经全在手里，不需要再问服务端一遍。 */
  const nodes = useMemo(() => {
    const list = [...(result.data?.nodes ?? [])];
    if (activeSort === 'title') list.sort((a, b) => a.title.localeCompare(b.title, collation));
    else if (activeSort === 'content') list.sort((a, b) => Number(b.hasContent) - Number(a.hasContent));
    return list;
  }, [result.data, activeSort, collation]);

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
        <h1>{t('nav.nodes')}</h1>
        <p>{pick(TEXT.lead)}</p>
        <details className="glossary">
          <summary>{pick(TEXT.glossarySummary)}</summary>
          <dl>
            <div>
              <dt>{pick(TEXT.glossaryConstructTerm)}</dt>
              <dd>
                {pick(TEXT.glossaryConstructLead)}<b>{pick(TEXT.glossaryConstructStrong)}</b>
                {pick(TEXT.glossaryConstructTail)}
                {['Concept', 'Claim', 'Proof', 'Counterexample'].map((item) => labels.constructLabel(item)).join(pick({ zh: '、', en: ', ' }))}
                {pick(TEXT.ellipsis)}
              </dd>
            </div>
            <div>
              <dt>{pick(TEXT.glossaryRoleTerm)}</dt>
              <dd>
                {pick(TEXT.glossaryRoleLead)}<b>{pick(TEXT.glossaryRoleStrong)}</b>
                {pick(TEXT.glossaryRoleTail)}
                {['Axiom', 'Theorem', 'Property', 'LocalMethod'].map((item) => labels.roleLabel(item)).join(pick({ zh: '、', en: ', ' }))}
                {pick(TEXT.ellipsis)}
              </dd>
            </div>
            <div>
              <dt>{pick(TEXT.glossaryEvidenceTerm)}</dt>
              <dd>{pick(TEXT.glossaryEvidenceBody)}</dd>
            </div>
            <div>
              <dt>{pick(TEXT.glossaryStateTerm)}</dt>
              <dd>{pick(TEXT.glossaryStateBody)}</dd>
            </div>
          </dl>
        </details>
      </div>

      {/* 窄屏把四个下拉收进折叠区：390×844 下筛选栏曾把第一张卡挤到 913px（整屏无内容）。 */}
      <details className="filters-card" open={!compact}>
        <summary>
          {pick(TEXT.filtersSummary)}{activeFilters.length > 0 ? fill(pick(TEXT.filtersCount), { n: activeFilters.length }) : ''}
        </summary>
        <div className="filters card">
          <label className="filters-search">
            {pick(TEXT.searchLabel)}
            <input
              ref={searchInputRef}
              value={query}
              onChange={(event) => { setQuery(event.target.value); update({ q: event.target.value || null }); }}
              placeholder={pick(TEXT.searchPlaceholder)}
            />
          </label>
          <label>
            {/*
              「来源」而不是「案例」：这一栏筛的是**出身**（哪本教材 / 哪个案例），
              与「学科」是两件事——用户的要求正是「不要按教材分类节点，按知识的本质领域去分类」。
              两个筛选并列放在这里，出身与领域分得清清楚楚。
            */}
            {pick(TEXT.sourceLabel)}
            <select value={caseFilter} onChange={(event) => update({ case: event.target.value })}>
              {/* `<option>` 不能走 Markdown：C^k 用 Unicode 上标，别在下拉框里留脱字符。
                  选项同样只列真有的案例（带计数）。 */}
              <option value={FILTER_ALL}>{pick(TEXT.all)}</option>
              {caseFacet.present.map((item) => (
                <option key={item.value} value={item.value}>{fill(pick(TEXT.facetOption), { label: item.label, n: item.count })}</option>
              ))}
            </select>
          </label>
          <label>
            {pick(TEXT.disciplineLabel)}
            <select value={discipline} onChange={(event) => update({ discipline: event.target.value })}>
              {disciplines.map((item) => <option key={item} value={item}>{item === FILTER_ALL ? pick(TEXT.all) : disciplineText(item)}</option>)}
            </select>
          </label>
          <label>
            {/*
              条目粒度：默认只看**单元**。话题级条目是「一节/一章的范围」，不是可独立认知的对象，
              因此默认不混进列表；想连话题一起看就切到「话题 + 单元」，计数如实写出来。
            */}
            {pick(TEXT.granularityLabel)}
            <select
              value={granularity}
              onChange={(event) => update({
                show: event.target.value === 'unit' ? null : event.target.value === 'topic' ? 'topics' : 'all',
              })}
            >
              <option value="unit">{fill(pick(TEXT.granularityUnit), { n: topicCounts.unit })}</option>
              <option value="topic">{fill(pick(TEXT.granularityTopic), { n: topicCounts.topic })}</option>
              <option value="all">{fill(pick(TEXT.granularityAll), { n: topicCounts.unit + topicCounts.topic })}</option>
            </select>
          </label>
          <label>
            {pick(TEXT.constructLabel)}
            <select value={construct} onChange={(event) => update({ construct: event.target.value })}>
              <option value={FILTER_ALL}>{pick(TEXT.all)}</option>
              {constructFacet.present.map((item) => (
                <option key={item.value} value={item.value}>{fill(pick(TEXT.facetOption), { label: item.label, n: item.count })}</option>
              ))}
            </select>
          </label>
          <label>
            {pick(TEXT.roleLabel)}
            <select value={role} onChange={(event) => update({ role: event.target.value })}>
              <option value={FILTER_ALL}>{pick(TEXT.all)}</option>
              {roleFacet.present.map((item) => (
                <option key={item.value} value={item.value}>{fill(pick(TEXT.facetOption), { label: item.label, n: item.count })}</option>
              ))}
            </select>
          </label>
          <label>
            {pick(TEXT.sortLabel)}
            <select value={sortId} onChange={(event) => update({ sort: event.target.value === 'content' ? null : event.target.value })}>
              {sorts.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
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
            {pick(TEXT.absentLead)}{constructFacet.absent.join(pick({ zh: '、', en: ', ' })) || pick(TEXT.absentNone)}{pick(TEXT.absentMid)}<strong>{pick(TEXT.absentStrong)}</strong>{pick(TEXT.absentTail)}
          </summary>
          <p>
            {pick(TEXT.absentBodyLead)}<code>representations</code>{pick(TEXT.absentBodyTail)}
            {roleFacet.absent.length > 0 && <>{pick(TEXT.absentRoleLead)}{roleFacet.absent.join(pick({ zh: '、', en: ', ' }))}{pick(TEXT.sentenceEnd)}</>}
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
          {pick(TEXT.onlyContent)}
        </label>
        <label className="toggle checkbox">
          <input
            type="checkbox"
            checked={onlyUnread}
            disabled={!progress}
            onChange={(event) => update({ unread: event.target.checked ? '1' : null }, { replace: false })}
          />
          {pick(TEXT.onlyUnread)}
        </label>
        {!progress && <span className="muted">{pick(TEXT.needProfile)}</span>}
      </div>

      {result.loading && <p>{pick(TEXT.loading)}</p>}
      {result.error && <p className="error">{formatError(result.error)}</p>}
      {result.data && (
        <p className="result-count">
          {filteredByAnything
            ? fill(pick(TEXT.countMatched), { n: filtered.length })
            : fill(pick(TEXT.countShown), { shown: visible.length, total: filtered.length })}
          {filteredByAnything && fill(pick(TEXT.countAll), { n: total })}
          {hiddenByUnread > 0 && fill(pick(TEXT.countUnreadExcluded), { n: hiddenByUnread })}
          {/*
            如实说明默认没显示什么：话题级条目不在这一列里，它不是被过滤掉的噪声，
            而是**另一层**（一节/一章的范围）。不给这句话，用户会以为本库只有这么多对象。
          */}
          {granularity === 'unit' && topicCounts.topic > 0
            && fill(pick(TEXT.countTopicNote), { n: topicCounts.topic })}
          {granularity === 'topic' && fill(pick(TEXT.countUnitNote), { n: topicCounts.unit })}
          {cappedByServer && fill(pick(TEXT.countCapped), { n: SERVER_LIMIT })}
        </p>
      )}
      {result.data && filtered.length === 0 && (
        <section className="card empty-state">
          <h2>{pick(TEXT.emptyTitle)}</h2>
          <p className="muted">{pick(TEXT.emptyFilters)}</p>
          <ul className="filter-chips">
            {activeFilters.map(([key, label]) => (
              <li key={key}>
                {label}
                <button
                  className="chip-clear"
                  aria-label={fill(pick(TEXT.clearFilterAria), { label })}
                  onClick={() => update(key === 'q' ? { q: null } : { [key]: null }, { replace: false })}
                >✕</button>
              </li>
            ))}
          </ul>
          <div className="card-actions">
            <button className="button primary" onClick={clearAll}>{pick(TEXT.clearAll)}</button>
            <Link className="button" to={hrefFor('/network')}>{pick(TEXT.toNetwork)}</Link>
          </div>
        </section>
      )}
      <div className="node-grid">
        {visible.map((node) => {
          const state = stateOf(node);
          /*
           * 英文站上服务端按 `?locale=en` 下发英文标题；**没译的条目回落中文原文**，
           * 这里如实标出来（`i18n-pending` + title），不让读者以为站点混着两种语言。
           */
          const pending = isPending(node.title);
          return (
            <Link className="card node-card" key={node.id} to={hrefFor(`/nodes/${encodeURIComponent(node.id)}`)} data-state={state?.key ?? 'none'}>
              <div className="node-card-head">
                <span className="construct" title={node.construct}>{labels.constructLabel(node.construct)}</span>
                {node.roles.slice(0, 3).map((item) => <span className="role" key={item} title={item}>{labels.roleLabel(item)}</span>)}
                {node.evidenceStatus && <StatusBadge status={node.evidenceStatus} title={fill(pick(TEXT.evidenceLevel), { status: node.evidenceStatus })} />}
                {state && <span className={`node-state is-${state.key}`}>{state.label}</span>}
              </div>
              {/* 卡片是纯文本上下文：C^k 这类记号要走 Unicode 上标，不能留脱字符。 */}
              <h3 className={pending ? 'i18n-pending' : undefined} title={pending ? t('i18n.pendingTitle') : undefined}>{plainMathText(node.title)}</h3>
              <p>{plainMathText(node.summary)}</p>
              <footer>
                <span>{disciplineText(node.discipline)}</span>
                {node.hasContent
                  ? <span>{node.relationCount > 0 ? fill(pick(TEXT.relationCount), { n: node.relationCount }) : pick(TEXT.noRelations)}</span>
                  : <span className="node-pending">{pick(TEXT.bodyPending)}</span>}
                {node.actionCount > 0 && <span>{fill(pick(TEXT.actionCount), { n: node.actionCount })}</span>}
                {node.evidenceCount > 0 && <span>{fill(pick(TEXT.evidenceCount), { n: node.evidenceCount })}</span>}
              </footer>
            </Link>
          );
        })}
      </div>
      {shown < filtered.length && (
        <div className="load-more">
          <button className="button" onClick={() => setShown((current) => current + PAGE)}>
            {fill(pick(TEXT.loadMore), { n: filtered.length - shown })}
          </button>
        </div>
      )}
    </div>
  );
}
