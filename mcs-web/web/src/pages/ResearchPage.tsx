import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatError, useApi } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import { Markdown } from '../components/Markdown';
import { RELATION_COLOR, relationLabel, plainMathText } from '../labels';
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
 */

const TOOL_GROUPS = [
  { id: 'method', label: '方法论', hint: '别人怎么讲、怎么构造、怎么找反例' },
  { id: 'formal', label: '形式语言装备', hint: '已经被写成式子的概念，可以直接拿来推' },
  { id: 'structure', label: '结构工具', hint: '桥接、对偶、跨域：把两个领域接起来' },
  { id: 'theory', label: '理论工具', hint: '专稿里的局部化算子与合法本体条件' },
] as const;

type ToolGroup = (typeof TOOL_GROUPS)[number]['id'];

export function ResearchPage() {
  const [group, setGroup] = useState<ToolGroup>('method');
  const nodes = useApi<{ nodes: NodeSummary[] }>('/ontology/nodes?limit=500');
  const graph = useApi<{ relations: ResearchRelation[] }>('/ontology/graph');
  const evidence = useApi<{ evidence: EvidenceRecord[] }>('/evidence');
  const coverage = useApi<{ coverage: Array<{ module: string; chapter: string; status: string; boundary: string }> }>('/ontology/coverage');

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

  if (nodes.loading || graph.loading) return <div className="page"><p>加载本体…</p></div>;
  if (nodes.error) return <div className="page"><p className="error">{formatError(nodes.error)}</p></div>;

  const titleOf = (id: string) => nodes.data?.nodes.find((node) => node.id === id)?.title ?? id;
  const groupInfo = TOOL_GROUPS.find((item) => item.id === group)!;

  return (
    <div className="page research-page">
      <div className="section-heading">
        <h1>研究台</h1>
        <p>
          这里放的是<strong>可以往下做的数学</strong>：本体里登记过、但还没有被推进到底的公开问题，
          以及一批<strong>作为启发的已有工具</strong>——方法论、形式语言装备、结构工具与理论工具。
          每条都能点回它在本体里的位置自己核。
        </p>
        <p className="muted">
          本站不声称这些问题是新的，也不声称工具有效：工具是启发，不是定理；
          这一页不写学习者档案（E），研究笔记不在这里产生。
        </p>
      </div>

      {/* ---------- 公开问题 ---------- */}
      <section className="card research-open" id="open">
        <div className="research-open-head">
          <h2>公开问题与未声称的边界<span className="family-count">{openProblems.problems.length + openProblems.gaps.length} 条</span></h2>
          <p className="muted">
            三类来源分开列：本体里登记的练习型问题、明说未声称的证据、覆盖清单里状态还没通过的模块边界。
            「公开」在这里只意味着**本站没有把它做完**，不意味着数学界没有答案。
          </p>
        </div>

        {openProblems.problems.length > 0 && (
          <div className="research-block">
            <h3>登记的问题节点</h3>
            <ul className="research-list">
              {openProblems.problems.map((node) => (
                <li key={node.id}>
                  <Link to={`/nodes/${encodeURIComponent(node.id)}`}>{node.title}</Link>
                  <span className="muted">　{node.id}</span>
                  <p className="muted">{plainMathText(node.summary)}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {openProblems.gaps.length > 0 && (
          <div className="research-block">
            <h3>覆盖清单里的边界</h3>
            <ul className="research-list">
              {openProblems.gaps.map((entry) => (
                <li key={entry.module}>
                  <strong>{entry.module}</strong>
                  <span className="muted">　专稿 {entry.chapter}　</span>
                  <StatusBadge status={entry.status} />
                  <p className="muted">{entry.boundary}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {openProblems.openEvidence.length > 0 && (
          <details className="case-details research-evidence">
            <summary>未声称或仅作引用的证据（{openProblems.openEvidence.length} 条）</summary>
            <ul className="research-list">
              {openProblems.openEvidence.slice(0, 40).map((record) => (
                <li key={record.id}>
                  <code>{record.id}</code>
                  <span className="muted">　{record.kind}　</span>
                  <StatusBadge status={record.status} />
                  <p className="muted">{record.title}</p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* ---------- 作为启发的已有工具 ---------- */}
      <section className="card" id="tools">
        <div className="section-heading">
          <h2>作为启发的已有工具</h2>
          <p>
            做研究不必从零开始：这里有别人讲同一个对象的方法、已经被写成式子的概念、
            把两个领域接起来的结构关系，以及专稿给出的理论工具。选一类看。
          </p>
        </div>
        <nav className="tabs research-tabs" aria-label="工具类别">
          {TOOL_GROUPS.map((item) => (
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
                <p className="muted">{plainMathText(node.summary)}</p>
                <Link className="link-button" to={`/method`}>看方法库里的细致解析</Link>
              </li>
            ))}
          </ul>
        )}

        {group === 'formal' && (
          <>
            {tools.formal.length === 0 && <p className="muted">本体里还没有登记形式表达。</p>}
            <ul className="research-tools">
              {tools.formal.map((node) => (
                <li key={node.id}>
                  <Link to={`/nodes/${encodeURIComponent(node.id)}`}>{node.title}</Link>
                  <p className="muted">节点页的「形式表达」一节给出式子和读法，可直接拿去推。</p>
                </li>
              ))}
            </ul>
          </>
        )}

        {group === 'structure' && (
          <>
            {tools.structure.length === 0 && <p className="muted">本体里还没有登记桥接、对偶或跨域关系。</p>}
            <ul className="research-tools">
              {tools.structure.map((relation) => (
                <li key={relation.id}>
                  <span className="research-relation-kind" style={{ color: RELATION_COLOR[relation.kind] ?? undefined }}>
                    {relationLabel(relation.kind)}
                  </span>
                  <span>
                    <Link to={`/nodes/${encodeURIComponent(relation.from)}`}>{titleOf(relation.from)}</Link>
                    <span className="muted"> → </span>
                    <Link to={`/nodes/${encodeURIComponent(relation.to)}`}>{titleOf(relation.to)}</Link>
                  </span>
                  {relation.scope && <p className="muted">{relation.scope}</p>}
                  {relation.task && <p className="muted">用途：{relation.task}</p>}
                </li>
              ))}
            </ul>
          </>
        )}

        {group === 'theory' && (
          <div className="research-tools">
            <p>
              专稿用 36 个局部化算子把「同一条数学内容在不同视角下长什么样」写成可计算的东西；
              另有合法本体条件与十二坐标。这些是理论的**工具面**，完整定义与实现入口在
              <Link to="/maintenance"> 网站维护 → 局部化 LC01–36 </Link>里逐条给出。
            </p>
            <div className="card-actions">
              <Link className="button" to="/maintenance">打开网站维护</Link>
              <Link className="button ghost" to="/method">看方法论总览</Link>
            </div>
          </div>
        )}
      </section>

      {/* ---------- 怎么把问题推进下去 ---------- */}
      <section className="card">
        <h2>把一个问题推进下去</h2>
        <ol className="research-steps">
          <li><strong>先在网络里看它连着谁</strong>：<Link to="/network">知识网络</Link>里按住节点能取出强关联前置；硬前置与登记关联分开显示。</li>
          <li><strong>再看它现在被写成了什么</strong>：节点页的「形式表达」给出式子、记号与读法；没有登记形式表达的节点会如实说明没有。</li>
          <li><strong>找同类问题已经用过的手段</strong>：方法论标签里的 21 条工具，大多来自具体对象上的实战（反例、降维、桥接、邻域估计…）。</li>
          <li><strong>把结论写成可核的</strong>：本站的证据标签分 `DEF / PROOF / REF / FINITE / ILLUSTRATION / NOT-CLAIMED`；写不出证明就退成例子并标注。</li>
          <li><strong>要改站点本身</strong>：覆盖对照、局部化算子、证据义务在<Link to="/maintenance">网站维护</Link>里。</li>
        </ol>
      </section>

      {graph.error && <p className="error">{formatError(graph.error)}</p>}
      {evidence.error && <p className="muted">证据清单读取失败：{formatError(evidence.error)}</p>}
      {coverage.error && <p className="muted">覆盖清单读取失败：{formatError(coverage.error)}</p>}
    </div>
  );
}

/** 关系边里的 `scope` 是 Markdown 源（含 LaTeX），统一走 Markdown 渲染。 */
export function RelationScope({ scope }: { scope: string }) {
  return <Markdown className="inline-markdown">{scope}</Markdown>;
}
