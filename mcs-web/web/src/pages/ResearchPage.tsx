import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatError, useApi } from '../api';
import { useI18n, useLabels } from '../i18n';
import { StatusBadge } from '../components/StatusBadge';
import { Markdown } from '../components/Markdown';
import { RELATION_COLOR, plainMathText } from '../labels';
/** 本体里的一条登记关系（与 /ontology/graph 的返回一致）。 */
interface ResearchRelation {
  id: string;
  kind: string;
  from: string;
  to: string;
  scope?: string;
  task?: string;
  candidateNote?: string;
}
import type { EvidenceRecord, NodeSummary } from '../types';

/**
 * 研究台：**做前沿数学研究的地方**。
 *
 * 用户的要求：「研究台里面要是给用户进行前沿的数学研究的场所，集中公开问题和作为启发的已有工具；
 * 把现在的研究台里面的内容迁移到一个新的页面『网站维护』。」
 *
 * 因此这一页只放两类东西，都从本体现场派生（不写死清单）：
 *
 * 1. **公开问题**——本体里登记的 `Problem` 节点、没有证明义务被关掉的证据、以及覆盖清单里
 *    明说「还没声称」的边界。每条都链回节点或证据，让人能自己核。
 * 2. **作为启发的已有工具**——分四类：
 *    - 方法论节点（21 条 Method）：别人怎么讲、怎么构造、怎么找反例；
 *    - 形式语言装备（带 `formalStatement` 的节点）：概念已经被写成什么式子，可以直接拿来推；
 *    - 结构工具：桥接 / 对偶 / 跨域关系——把两个领域接起来的既有手段；
 *    - 理论工具：36 个局部化算子（在「网站维护」里有完整定义，这里只给入口与用途）。
 *
 * 三条纪律：**不编研究问题**（只列本体里登记过的）；**不把工具说成结论**（工具是启发，不是定理）；
 * **不在这一页做学习记录**（研究与学习是两件事，这一页不写档案 E）。
 *
 * 中英双语（2026-10）：界面文案走下面的成对表；**本体与覆盖清单下发的文字仍是中文**
 * （节点摘要、覆盖边界、证据标题），英文语境用 `isPending()` 标注「尚未翻译」。
 */

interface ToolGroupText { id: 'method' | 'formal' | 'structure' | 'theory'; label: string; hint: string }

interface ResearchText {
  toolGroups: ToolGroupText[];
  loading: string;
  heading: string;
  leadPrefix: string;
  leadStrongA: string;
  leadMid: string;
  leadStrongB: string;
  leadSuffix: string;
  boundary: string;
  openTitle: string;
  countLabel: (count: number) => string;
  openNote: string;
  blockProblems: string;
  blockGaps: string;
  chapter: (chapter: string) => string;
  evidenceSummary: (count: number) => string;
  toolsTitle: string;
  toolsLead: string;
  tabsAria: string;
  methodLink: string;
  noFormal: string;
  formalNote: string;
  noStructure: string;
  usage: (task: string) => string;
  theoryBodyPrefix: string;
  theoryBodyLink: string;
  theoryBodySuffix: string;
  openMaintenance: string;
  methodOverview: string;
  stepsTitle: string;
  steps: Array<{ strong: string; before: string; link?: string; linkTo?: string; after: string }>;
  evidenceError: string;
  coverageError: string;
}

const RESEARCH_TEXT: { zh: ResearchText; en: ResearchText } = {
  zh: {
    toolGroups: [
      { id: 'method', label: '方法论', hint: '别人怎么讲、怎么构造、怎么找反例' },
      { id: 'formal', label: '形式语言装备', hint: '已经被写成式子的概念，可以直接拿来推' },
      { id: 'structure', label: '结构工具', hint: '桥接、对偶、跨域：把两个领域接起来' },
      { id: 'theory', label: '理论工具', hint: '专稿里的局部化算子与合法本体条件' },
    ],
    loading: '加载本体…',
    heading: '研究台',
    leadPrefix: '这里放的是',
    leadStrongA: '可以往下做的数学',
    leadMid: '：本体里登记过、但还没有被推进到底的公开问题，以及一批',
    leadStrongB: '作为启发的已有工具',
    leadSuffix: '——方法论、形式语言装备、结构工具与理论工具。每条都能点回它在本体里的位置自己核。',
    boundary: '本站不声称这些问题是新的，也不声称工具有效：工具是启发，不是定理；这一页不写学习者档案（E），研究笔记不在这里产生。',
    openTitle: '公开问题与未声称的边界',
    countLabel: (count) => `${count} 条`,
    openNote: '三类来源分开列：本体里登记的练习型问题、明说未声称的证据、覆盖清单里状态还没通过的模块边界。「公开」在这里只意味着**本站没有把它做完**，不意味着数学界没有答案。',
    blockProblems: '登记的问题节点',
    blockGaps: '覆盖清单里的边界',
    chapter: (chapter) => `　专稿 ${chapter}　`,
    evidenceSummary: (count) => `未声称或仅作引用的证据（${count} 条）`,
    toolsTitle: '作为启发的已有工具',
    toolsLead: '做研究不必从零开始：这里有别人讲同一个对象的方法、已经被写成式子的概念、把两个领域接起来的结构关系，以及专稿给出的理论工具。选一类看。',
    tabsAria: '工具类别',
    methodLink: '看方法库里的细致解析',
    noFormal: '本体里还没有登记形式表达。',
    formalNote: '节点页的「形式表达」一节给出式子和读法，可直接拿去推。',
    noStructure: '本体里还没有登记桥接、对偶或跨域关系。',
    usage: (task) => `用途：${task}`,
    theoryBodyPrefix: '专稿用 36 个局部化算子把「同一条数学内容在不同视角下长什么样」写成可计算的东西；另有合法本体条件与十二坐标。这些是理论的**工具面**，完整定义与实现入口在',
    theoryBodyLink: ' 网站维护 → 局部化 LC01–36 ',
    theoryBodySuffix: '里逐条给出。',
    openMaintenance: '打开网站维护',
    methodOverview: '看方法论总览',
    stepsTitle: '把一个问题推进下去',
    steps: [
      { strong: '先在网络里看它连着谁', before: '：', link: '知识网络', linkTo: '/network', after: '里按住节点能取出强关联前置；硬前置与登记关联分开显示。' },
      { strong: '再看它现在被写成了什么', before: '：节点页的「形式表达」给出式子、记号与读法；没有登记形式表达的节点会如实说明没有。', after: '' },
      { strong: '找同类问题已经用过的手段', before: '：方法论标签里的 21 条工具，大多来自具体对象上的实战（反例、降维、桥接、邻域估计…）。', after: '' },
      { strong: '把结论写成可核的', before: '：本站的证据标签分 `DEF / PROOF / REF / FINITE / ILLUSTRATION / NOT-CLAIMED`；写不出证明就退成例子并标注。', after: '' },
      { strong: '要改站点本身', before: '：覆盖对照、局部化算子、证据义务在', link: '网站维护', linkTo: '/maintenance', after: '里。' },
    ],
    evidenceError: '证据清单读取失败：',
    coverageError: '覆盖清单读取失败：',
  },
  en: {
    toolGroups: [
      { id: 'method', label: 'Methodology', hint: 'How others explain it, construct it, or look for counterexamples' },
      { id: 'formal', label: 'Formal-language equipment', hint: 'Concepts already written as formulas, ready to reason with' },
      { id: 'structure', label: 'Structural tools', hint: 'Bridge, duality, cross-domain: joining two fields' },
      { id: 'theory', label: 'Theoretical tools', hint: 'The localization operators and legal-ontology conditions of the monograph' },
    ],
    loading: 'Loading the ontology…',
    heading: 'Research workbench',
    leadPrefix: 'What lives here is ',
    leadStrongA: 'mathematics you can carry further',
    leadMid: ': open problems registered in the ontology that have not been pushed all the way, and a set of ',
    leadStrongB: 'existing tools that serve as inspiration',
    leadSuffix: ' — methodology, formal-language equipment, structural tools and theoretical tools. Each one links back to its place in the ontology so you can check it yourself.',
    boundary: 'This site does not claim these problems are new, and does not claim the tools work: a tool is inspiration, not a theorem. No learner profile (E) is written on this page, and research notes are not produced here.',
    openTitle: 'Open problems and boundaries not claimed',
    countLabel: (count) => `${count} items`,
    openNote: 'Three sources are listed separately: exercise-type problems registered in the ontology, evidence explicitly marked as not claimed, and module boundaries whose coverage status has not passed. “Open” here only means **this site has not finished it**, not that mathematics has no answer.',
    blockProblems: 'Registered problem nodes',
    blockGaps: 'Boundaries from the coverage list',
    chapter: (chapter) => ` · monograph ${chapter} · `,
    evidenceSummary: (count) => `Evidence not claimed, or cited only (${count} items)`,
    toolsTitle: 'Existing tools, as inspiration',
    toolsLead: 'Research need not start from nothing: here are other people’s ways of explaining the same object, concepts already written as formulas, structural relations that join two fields, and the theoretical tools the monograph provides. Pick a category.',
    tabsAria: 'Tool categories',
    methodLink: 'Read the detailed treatment in the method library',
    noFormal: 'No formal expressions are registered in the ontology yet.',
    formalNote: 'The “formal expression” section of the node page gives the formula and how to read it; take it and reason with it directly.',
    noStructure: 'No bridge, duality or cross-domain relations are registered in the ontology yet.',
    usage: (task) => `Used for: ${task}`,
    theoryBodyPrefix: 'The monograph uses 36 localization operators to make “what the same piece of mathematics looks like from different viewpoints” computable; there are also the legal-ontology conditions and twelve coordinates. These are the **tool side** of the theory; the full definitions and implementation entries are given one by one in',
    theoryBodyLink: ' Maintenance → localization LC01–36 ',
    theoryBodySuffix: '.',
    openMaintenance: 'Open the maintenance page',
    methodOverview: 'See the methodology overview',
    stepsTitle: 'Pushing a problem forward',
    steps: [
      { strong: 'First see what it connects to in the network', before: ': on the ', link: 'knowledge network', linkTo: '/network', after: ', holding a node brings out its strongly related prerequisites; hard prerequisites and registered relations are shown separately.' },
      { strong: 'Then see what it is written as now', before: ': the “formal expression” section of the node page gives the formula, the notation and how to read it; nodes with no registered formal expression say so honestly.', after: '' },
      { strong: 'Find the means already used on similar problems', before: ': most of the 21 tools in the methodology tag come from real work on specific objects (counterexamples, reduction, bridging, neighbourhood estimates…).', after: '' },
      { strong: 'Write the conclusion so it can be checked', before: ': this site’s evidence tags are `DEF / PROOF / REF / FINITE / ILLUSTRATION / NOT-CLAIMED`; when a proof cannot be written, fall back to an example and say so.', after: '' },
      { strong: 'To change the site itself', before: ': coverage comparison, localization operators and evidence obligations live in', link: 'maintenance', linkTo: '/maintenance', after: '.', },
    ],
    evidenceError: 'Reading the evidence list failed: ',
    coverageError: 'Reading the coverage list failed: ',
  },
};

type ToolGroup = ToolGroupText['id'];

export function ResearchPage() {
  const [group, setGroup] = useState<ToolGroup>('method');
  const nodes = useApi<{ nodes: NodeSummary[] }>('/ontology/nodes?limit=500');
  const graph = useApi<{ relations: ResearchRelation[] }>('/ontology/graph');
  const evidence = useApi<{ evidence: EvidenceRecord[] }>('/evidence');
  const coverage = useApi<{ coverage: Array<{ module: string; chapter: string; status: string; boundary: string }> }>('/ontology/coverage');
  const { pick, isPending, t } = useI18n();
  const labels = useLabels();
  const text = pick(RESEARCH_TEXT);
  /** 本体下发的摘要与边界仍是中文：英文语境下标注「尚未翻译」。 */
  const pendingProps = (value: string | null | undefined) => (
    isPending(value) ? { className: 'i18n-pending', title: t('i18n.pendingTitle') } : {}
  );

  const openProblems = useMemo(() => {
    const all = nodes.data?.nodes ?? [];
    const problems = all.filter((node) => node.construct === 'Problem');
    // 「还没关掉」的证据：状态不是 PROOF/FINITE 的那些，以及明说未声称的。
    const openEvidence = (evidence.data?.evidence ?? []).filter((record) => (
      record.status === 'NOT-CLAIMED' || record.status === 'REF' || record.status === 'ILLUSTRATION'
    ));
    // 覆盖清单里状态不是 passed 的模块：它们各自的「当前边界」就是待推进的地方。
    const gaps = (coverage.data?.coverage ?? []).filter((entry) => entry.status !== 'passed' && entry.boundary);
    return { problems, openEvidence, gaps };
  }, [nodes.data, evidence.data, coverage.data]);

  const tools = useMemo(() => {
    const all = nodes.data?.nodes ?? [];
    const relations = graph.data?.relations ?? [];
    return {
      method: all.filter((node) => node.construct === 'Method'),
      // 列表接口只给 `hasFormalStatement` 标记（式子全文在节点详情里）。
      formal: all.filter((node) => node.hasFormalStatement === true),
      structure: relations.filter((relation) => ['bridge', 'duality', 'crossDomain'].includes(relation.kind)),
      theory: [],
    };
  }, [nodes.data, graph.data]);

  if (nodes.loading || graph.loading) return <div className="page"><p>{text.loading}</p></div>;
  if (nodes.error) return <div className="page"><p className="error">{formatError(nodes.error)}</p></div>;

  const titleOf = (id: string) => nodes.data?.nodes.find((node) => node.id === id)?.title ?? id;
  const groupInfo = text.toolGroups.find((item) => item.id === group)!;

  return (
    <div className="page research-page">
      <div className="section-heading">
        <h1>{text.heading}</h1>
        <p>
          {text.leadPrefix}<strong>{text.leadStrongA}</strong>{text.leadMid}<strong>{text.leadStrongB}</strong>{text.leadSuffix}
        </p>
        <p className="muted">
          {text.boundary}
        </p>
      </div>

      {/* ---------- 公开问题 ---------- */}
      <section className="card research-open" id="open">
        <div className="research-open-head">
          <h2>{text.openTitle}<span className="family-count">{text.countLabel(openProblems.problems.length + openProblems.gaps.length)}</span></h2>
          <p className="muted">
            {text.openNote}
          </p>
        </div>

        {openProblems.problems.length > 0 && (
          <div className="research-block">
            <h3>{text.blockProblems}</h3>
            <ul className="research-list">
              {openProblems.problems.map((node) => (
                <li key={node.id}>
                  <Link to={`/nodes/${encodeURIComponent(node.id)}`}>{node.title}</Link>
                  <span className="muted">　{node.id}</span>
                  <p className="muted"><span {...pendingProps(node.summary)}>{plainMathText(node.summary)}</span></p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {openProblems.gaps.length > 0 && (
          <div className="research-block">
            <h3>{text.blockGaps}</h3>
            <ul className="research-list">
              {openProblems.gaps.map((entry) => (
                <li key={entry.module}>
                  <strong>{entry.module}</strong>
                  <span className="muted">{text.chapter(entry.chapter)}</span>
                  <StatusBadge status={entry.status} />
                  <p className="muted"><span {...pendingProps(entry.boundary)}>{entry.boundary}</span></p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {openProblems.openEvidence.length > 0 && (
          <details className="case-details research-evidence">
            <summary>{text.evidenceSummary(openProblems.openEvidence.length)}</summary>
            <ul className="research-list">
              {openProblems.openEvidence.slice(0, 40).map((record) => (
                <li key={record.id}>
                  <code>{record.id}</code>
                  <span className="muted">　{record.kind}　</span>
                  <StatusBadge status={record.status} />
                  <p className="muted"><span {...pendingProps(record.title)}>{record.title}</span></p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* ---------- 作为启发的已有工具 ---------- */}
      <section className="card" id="tools">
        <div className="section-heading">
          <h2>{text.toolsTitle}</h2>
          <p>
            {text.toolsLead}
          </p>
        </div>
        <nav className="tabs research-tabs" aria-label={text.tabsAria}>
          {text.toolGroups.map((item) => (
            <button
              key={item.id}
              className={group === item.id ? 'active' : ''}
              aria-pressed={group === item.id}
              onClick={() => setGroup(item.id)}
            >
              {item.label}
              <span className="family-count">
                {item.id === 'method' ? tools.method.length
                  : item.id === 'formal' ? tools.formal.length
                    : item.id === 'structure' ? tools.structure.length
                      : 36}
              </span>
            </button>
          ))}
        </nav>
        <p className="muted research-group-hint">{groupInfo.hint}</p>

        {group === 'method' && (
          <ul className="research-tools">
            {tools.method.map((node) => (
              <li key={node.id}>
                <Link to={`/nodes/${encodeURIComponent(node.id)}`}>{node.title}</Link>
                <p className="muted"><span {...pendingProps(node.summary)}>{plainMathText(node.summary)}</span></p>
                <Link className="link-button" to={`/method`}>{text.methodLink}</Link>
              </li>
            ))}
          </ul>
        )}

        {group === 'formal' && (
          <>
            {tools.formal.length === 0 && <p className="muted">{text.noFormal}</p>}
            <ul className="research-tools">
              {tools.formal.map((node) => (
                <li key={node.id}>
                  <Link to={`/nodes/${encodeURIComponent(node.id)}`}>{node.title}</Link>
                  <p className="muted">{text.formalNote}</p>
                </li>
              ))}
            </ul>
          </>
        )}

        {group === 'structure' && (
          <>
            {tools.structure.length === 0 && <p className="muted">{text.noStructure}</p>}
            <ul className="research-tools">
              {tools.structure.map((relation) => (
                <li key={relation.id}>
                  <span className="research-relation-kind" style={{ color: RELATION_COLOR[relation.kind] ?? undefined }}>
                    {labels.relationLabel(relation.kind)}
                  </span>
                  <span>
                    <Link to={`/nodes/${encodeURIComponent(relation.from)}`}>{titleOf(relation.from)}</Link>
                    <span className="muted"> → </span>
                    <Link to={`/nodes/${encodeURIComponent(relation.to)}`}>{titleOf(relation.to)}</Link>
                  </span>
                  {relation.scope && <p className="muted">{relation.scope}</p>}
                  {relation.task && <p className="muted">{text.usage(relation.task)}</p>}
                </li>
              ))}
            </ul>
          </>
        )}

        {group === 'theory' && (
          <div className="research-tools">
            <p>
              {text.theoryBodyPrefix}
              <Link to="/maintenance">{text.theoryBodyLink}</Link>{text.theoryBodySuffix}
            </p>
            <div className="card-actions">
              <Link className="button" to="/maintenance">{text.openMaintenance}</Link>
              <Link className="button ghost" to="/method">{text.methodOverview}</Link>
            </div>
          </div>
        )}
      </section>

      {/* ---------- 怎么把问题推进下去 ---------- */}
      <section className="card">
        <h2>{text.stepsTitle}</h2>
        <ol className="research-steps">
          {text.steps.map((step) => (
            <li key={step.strong}>
              <strong>{step.strong}</strong>{step.before}
              {step.link && step.linkTo && <Link to={step.linkTo}>{step.link}</Link>}
              {step.after}
            </li>
          ))}
        </ol>
      </section>

      {graph.error && <p className="error">{formatError(graph.error)}</p>}
      {evidence.error && <p className="muted">{text.evidenceError}{formatError(evidence.error)}</p>}
      {coverage.error && <p className="muted">{text.coverageError}{formatError(coverage.error)}</p>}
    </div>
  );
}

/** 关系边里的 `scope` 是 Markdown 源（含 LaTeX），统一走 Markdown 渲染。 */
export function RelationScope({ scope }: { scope: string }) {
  return <Markdown className="inline-markdown">{scope}</Markdown>;
}
