import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, formatError, useApi } from '../api';
import { useProfileContext } from '../state';
import { Markdown } from '../components/Markdown';
import { FormalLoad } from '../components/FormalLoad';
import { StatusBadge } from '../components/StatusBadge';
import { LearnerActions } from '../components/LearnerActions';
import { NoteEditor } from '../components/NoteEditor';
import { SelfCheckTasks } from '../components/SelfCheckTasks';
import { recordReview } from '../review-actions';
import { readReadingProgress, readReadingRoute, readingNodeAt, saveReadingProgress } from '../route-reading';
import { useLearningData } from '../useLearningData';
import { constructLabel, roleLabel, representationKindLabel, supportUseLabel, relationLabel, resourceLabel, plainMathText } from '../labels';
import type { EvidenceRecord, LocalizationResultView, NodeDetailResponse, NoteView, ProfileDetailResponse } from '../types';

export function NodePage() {
  const { nodeId = '' } = useParams();
  /*
   * 深链里的节点 id 要做百分号解码，但它**不保证合法**：`/nodes/100%` 这种地址会让
   * `decodeURIComponent` 抛 `URIError`，而这里在渲染期，全站从前没有错误边界——
   * 结果是纯白页。现在解不开就按原文处理，让接口去回答「这个节点不存在」（404），
   * 用户看到的是正常页面 + 一句人话。
   */
  const decoded = useMemo(() => {
    try { return decodeURIComponent(nodeId); } catch { return nodeId; }
  }, [nodeId]);
  const detail = useApi<NodeDetailResponse>(`/ontology/nodes/${encodeURIComponent(decoded)}`, [decoded]);
  const { profileId, profile, refreshProfiles } = useProfileContext();
  const { graph, events, progress: learning, reload: reloadLearning } = useLearningData();
  const [replay, setReplay] = useState<Record<string, LocalizationResultView | { status: string; note?: string; obligations?: string[] }>>({});
  const [message, setMessage] = useState('');
  const [searchParams] = useSearchParams();
  const routeId = searchParams.get('route');
  /** 路线阅读上下文（若有）：来自学习路线的「沿此路线阅读」。 */
  const readingRoute = useMemo(() => readReadingRoute(routeId), [routeId]);
  const stepParam = Number(searchParams.get('step') ?? '');
  const currentStep = readingRoute ? readingNodeAt(readingRoute, Number.isFinite(stepParam) && stepParam > 0 ? stepParam : readReadingProgress(routeId)) : null;
  const [reviewDone, setReviewDone] = useState(false);

  // 走到哪一步就记到哪一步：刷新后继续，而不是回到第一步。
  useEffect(() => {
    if (routeId && currentStep) saveReadingProgress(routeId, currentStep.index);
  }, [routeId, currentStep]);

  /**
   * 自由浏览时的「相关概念」与「可选下一步」。
   *
   * 上一版按节点 id 排序给「上一节点／下一节点」——那个顺序既不是先修关系也不是路线顺序，
   * 容易让人以为站点在暗示学习次序。这里改成两条有依据的线索：
   * 已登记的语义关系（相关概念），以及「以本节点为输入」的行动产出（可选下一步）。
   *
   * 注意：必须放在下面的提前返回之前——hook 数量在加载态与就绪态必须一致，
   * 否则 React 会抛 #310 把整页打白。
   */
  const related = useMemo(() => {
    if (!graph) return [] as Array<{ id: string; label: string }>;
    const seen = new Set<string>();
    const out: Array<{ id: string; label: string }> = [];
    for (const relation of graph.relations) {
      const other = relation.from === decoded ? relation.to : relation.to === decoded ? relation.from : null;
      if (!other || seen.has(other)) continue;
      seen.add(other);
      out.push({ id: other, label: relationLabel(relation.kind) });
    }
    return out.slice(0, 6);
  }, [graph, decoded]);

  const nextOptions = useMemo(() => {
    if (!graph) return [] as string[];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const action of graph.actions) {
      if (!action.inputs.some((input) => input.node === decoded)) continue;
      for (const output of action.outputs) {
        if (output.node === decoded || seen.has(output.node)) continue;
        seen.add(output.node);
        out.push(output.node);
      }
    }
    return out.slice(0, 6);
  }, [graph, decoded]);

  useEffect(() => { setMessage(''); }, [decoded]);
  useEffect(() => { setReviewDone(false); }, [decoded]);

  if (detail.loading) return <div className="page"><p>加载节点…</p></div>;
  if (detail.error) return <div className="page"><p className="error">{formatError(detail.error)}</p></div>;
  if (!detail.data) return null;
  const { node, formation, roles, actions, relations, evidence, support, claims, patterns, boundary } = detail.data;
  const teaching = node.teaching ?? {};
  const conditions = teaching.conditions ?? [];
  const selfCheck = teaching.selfCheck ?? [];
  const reviewQuestions = teaching.reviewQuestions ?? [];
  const misconceptions = teaching.commonMisconceptions ?? [];
  const representations = node.representations ?? [];

  /*
   * 机器表达层（`formalSpec`）与给人读的「形式表达」（`formalStatement`）是两件事：
   * 前者是自动关系发现的输入，后者是正文里的数学陈述。§7 的兼容约定是节点摘要**新增**
   * `hasFormalSpec` / `formalSpecVersion` 两个可选字段，旧客户端忽略即可——所以这里按
   * 可选字段读取，缺失时如实显示「未登记」，不假装已登记。
   */
  const machineSpec = node as NodeDetailResponse['node'] & { formalSpec?: unknown; hasFormalSpec?: boolean; formalSpecVersion?: string | null };
  const hasMachineSpec = Boolean(machineSpec.formalSpec) || machineSpec.hasFormalSpec === true;
  const machineSpecVersion = typeof machineSpec.formalSpecVersion === 'string' ? machineSpec.formalSpecVersion : null;

  // 分组依据只来自已登记数据；未登记 kind 归入「其他表征」，不丢弃任何条目。
  const representationGroups = representations.reduce<Record<string, typeof representations>>((groups, item) => {
    const key = representationKindLabel(item.kind);
    (groups[key] ??= []).push(item);
    return groups;
  }, {});

  const titleOf = (id: string) => graph?.nodes.find((node) => node.id === id)?.title ?? id;

  function routeHref(step: number): string {
    const target = readingRoute ? readingNodeAt(readingRoute, step) : null;
    if (!readingRoute || !target) return `/nodes/${encodeURIComponent(decoded)}`;
    return `/nodes/${encodeURIComponent(target.node)}?route=${readingRoute.id}&step=${target.index}`;
  }

  const isConfirmed = Boolean(learning?.knowledge.get(decoded)?.alreadyConfirmed);
  const isUnknown = Boolean(learning?.unknownNodes.has(decoded));
  const isRead = Boolean(learning?.readNodes.has(decoded));

  // 已登记的自检作答（按事件 id 去重后按时间排序）。
  const answerHistory = events
    .filter((event) => event.kind === 'answer' && typeof event.payload?.check_id === 'string' && String(event.payload.check_id).startsWith(`sc-${decoded.split(':')[1] ?? ''}`))
    .concat(events.filter((event) => event.kind === 'answer' && event.nodeId === decoded && typeof event.payload?.check_id === 'string'))
    .filter((event, position, list) => list.findIndex((item) => item.eventId === event.eventId) === position)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  const learnerActions = (
    <LearnerActions
      nodeId={decoded}
      profileId={profileId}
      flags={{ isRead, isConfirmed, isUnknown, canWrite: Boolean(profileId) }}
      onChanged={async () => { await reloadLearning(); }}
    />
  );

  async function runReplay(record: EvidenceRecord) {
    setMessage(`正在重放 ${record.id}…`);
    try {
      const result = await api<{ status: string; note: string; obligations: string[] }>('/evidence/replay', { method: 'POST', body: { evidenceId: record.id } });
      setReplay((current) => ({ ...current, [record.id]: result }));
      setMessage(`重放结束：${result.status}`);
    } catch (error) {
      setMessage(formatError(error));
    }
  }

  return (
    <div className="page node-page">
      <nav className="breadcrumb"><Link to="/nodes">数学对象</Link><span>/</span><span>{node.id}</span></nav>

      {/* 路线阅读条：按规划器给出的事件顺序走，重复的回看事件也保留在序列里。 */}
      {readingRoute && currentStep && (
        <section className="card route-strip" aria-label="路线阅读进度">
          <div className="route-strip-head">
            <StatusBadge status={currentStep.review ? 'review' : 'known'} label={currentStep.review ? '回看' : '学习事件'} />
            <strong>第 {currentStep.index} / {readingRoute.steps.length} 步</strong>
            <span className="muted">{currentStep.actionTitle}</span>
          </div>
          {currentStep.node !== decoded && (
            <p className="notice">当前打开的不是这条路线的第 {currentStep.index} 步（那一步是 {titleOf(currentStep.node)}）。</p>
          )}
          <div className="route-strip-actions">
            {currentStep.index > 1
              ? <Link className="button small" to={routeHref(currentStep.index - 1)}>← 上一步</Link>
              : <span className="button small" aria-disabled="true">已是第一步</span>}
            {currentStep.index < readingRoute.steps.length
              ? <Link className="button small primary" to={routeHref(currentStep.index + 1)}>下一步：{titleOf(readingRoute.steps[currentStep.index].node)} →</Link>
              : <Link className="button small primary" to={`/plan?goal=${encodeURIComponent(readingRoute.goal)}`}>这一步是终点 · 回到路线</Link>}
            <Link className="link-button" to={`/nodes/${encodeURIComponent(decoded)}`}>退出路线阅读</Link>
          </div>
        </section>
      )}

      {/* 从「开始回看」进来时的提示：完成动作写的是回看事件，不自动确认掌握。 */}
      {searchParams.get('from') === 'review' && (
        <section className="card review-strip" aria-label="回看提示">
          <p>
            本次是回看：读完以后可以登记一次回看。它只增加回看次数，不表示理解或掌握，也不改写公共本体。
          </p>
          <div className="card-actions">
            {reviewDone ? <span className="muted">已记录本次回看。</span> : (
              <button
                className="button small primary"
                disabled={!profileId}
                onClick={async () => {
                  if (!profileId) return;
                  try { await recordReview(profileId, decoded, 'node-review-strip'); setReviewDone(true); setMessage('已记录一次回看；它不表示理解或掌握。'); await reloadLearning(); }
                  catch (error) { setMessage(formatError(error)); }
                }}
              >完成本次回看</button>
            )}
            <Link className="button small" to="/profile?tab=review">回到待回看列表</Link>
          </div>
        </section>
      )}
      <header className="node-header card">
        <div className="node-header-top">
          <span className="construct" title={node.construct}>{constructLabel(node.construct)}</span>
          {roles.roles.map((role) => <span className="role" key={role} title={role}>{roleLabel(role)}</span>)}
          {teaching.evidenceStatus && <StatusBadge status={teaching.evidenceStatus} title={`证据等级：${teaching.evidenceStatus}`} />}
          <StatusBadge status={formation.status} title="形成检查状态" />
        </div>
        <h1>{node.title}</h1>
        <p className="lede">{node.summary}</p>
        <div className="node-meta">
          <span>{node.discipline}</span>
          <span>版本 {node.version}</span>
          <span>节点 ID <code>{node.id}</code></span>
        </div>
        <div className="card-actions">
          <Link className="button" to={`/plan?goal=${encodeURIComponent(node.id)}`}>以此为目标规划</Link>
          <Link className="button ghost" to={`/tutor?node=${encodeURIComponent(node.id)}`}>用 DeepTutor 学习</Link>
          {/*
            自动关联的两个入口。它们进的是**维护动作**：写在草稿里、不由这一页改动公共本体。
            「检查已有形式表达」对没有登记机器表达的节点同样可用——那一步会如实说明没有可检查的对象。
          */}
          <Link className="button ghost" to={`/authoring?node=${encodeURIComponent(node.id)}&mode=new`}>以此为基础创建</Link>
          <Link className="button ghost" to={`/authoring?node=${encodeURIComponent(node.id)}&mode=check`}>检查已有形式表达</Link>
        </div>
        {learnerActions}
      </header>

      {message && <p className="notice">{message}</p>}

      <div className="node-layout">
        <article className="node-main">
          {/* 本页内容：长文页的轻量目录。锚点必须真的落到元素上，测试会核对。 */}
          <nav className="node-toc card" aria-label="本页内容">
            <span className="node-toc-title">本页内容</span>
            <ul>
              {node.motivation && <li><a href="#node-motivation">动机与生长链</a></li>}
              {node.contentMarkdown && <li><a href="#node-reading">正文</a></li>}
              {conditions.length > 0 && <li><a href="#node-conditions">条件即反例</a></li>}
              {teaching.proofOverview && <li><a href="#node-proof">概括证明</a></li>}
              <li><a href="#node-formal">形式负载</a></li>
              {representations.length > 0 && <li><a href="#node-representations">表征</a></li>}
              {selfCheck.length > 0 && <li><a href="#node-selfcheck">自检任务</a></li>}
              <li><a href="#node-notes">个人笔记</a></li>
            </ul>
          </nav>
          {/*
            形式表达：把对象用形式语言写出来，放在正文之前。
            为什么排这么前：读一个数学对象，最先要知道的是「它到底是什么」——
            而定义的形式陈述比一段自然语言更不容易走样。只有挑出来的重要节点登记了这一项
            （见 data/formal-statements.mjs），其余节点不出这一块，不用一句「暂无」占位。
          */}
          {node.formalStatement && (
            <section className="card formal-statement" id="node-formal-statement">
              <div className="formal-statement-head">
                <h2>形式表达</h2>
                <span className="formal-statement-label" title={`证据状态：${node.formalStatement.label}`}>
                  {node.formalStatement.label}
                </span>
              </div>
              {/*
                `tex` 里不含 $ 定界符（登记时就校验过）：这里补成**独占一行**的行间公式。
                必须带换行与空行——`$$x$$` 夹在文本里会被 micromark 当成行内公式，
                渲染出来是挤在一行的小字号，而不是行间大公式（实测过）。
              */}
              <div className="formal-statement-math">
                <Markdown>{`\n$$\n${node.formalStatement.tex}\n$$\n`}</Markdown>
              </div>
              {node.formalStatement.reading && (
                // 中文读法是纯文本上下文：R^n 这类记号走 plainMathText 换成上标，不留脱字符。
                <p className="formal-statement-reading">{plainMathText(node.formalStatement.reading)}</p>
              )}
              {(node.formalStatement.notation ?? []).length > 0 && (
                <dl className="formal-statement-notation">
                  {(node.formalStatement.notation ?? []).map((row) => (
                    <div key={row.symbol}>
                      <dt><code>{row.symbol}</code></dt>
                      <dd>{plainMathText(row.means)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {node.formalStatement.note && (
                // 补充说明是 Markdown 上下文：里面会有 **强调**、`代码` 与 $公式$。
                <div className="formal-statement-note">
                  <Markdown>{node.formalStatement.note}</Markdown>
                </div>
              )}
            </section>
          )}

          {node.motivation && (
            <section className="card" id="node-motivation">
              <h2>动机与生长链</h2>
              <div className="motivation-grid">
                <div><h3>学科内部</h3><ul>{(node.motivation.internal ?? []).map((item) => <li key={item}>{item}</li>)}</ul></div>
                <div><h3>外部应用</h3><ul>{(node.motivation.external ?? []).map((item) => <li key={item}>{item}</li>)}</ul></div>
                <div><h3>结构审美</h3><ul>{(node.motivation.aesthetic ?? []).map((item) => <li key={item}>{item}</li>)}</ul></div>
              </div>
              {(node.motivation.growthChain ?? []).length > 0 && (
                <ol className="growth-chain">{(node.motivation.growthChain ?? []).map((item) => <li key={item}>{item}</li>)}</ol>
              )}
            </section>
          )}

          {node.contentMarkdown && (
            <section className="card reading" id="node-reading">
              <Markdown>{node.contentMarkdown}</Markdown>
            </section>
          )}

          {conditions.length > 0 && (
            <section className="card" id="node-conditions">
              <h2>条件即反例：删掉会怎样</h2>
              <table className="data-table">
                <thead><tr><th>条件</th><th>删去或削弱</th><th>反例</th><th>结论如何崩溃</th></tr></thead>
                <tbody>
                  {conditions.map((item) => (
                    <tr key={item.condition}><td>{item.condition}</td><td>{item.remove}</td><td>{item.counterexample}</td><td>{item.effect}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {teaching.proofOverview && (
            <section className="card" id="node-proof">
              <h2>概括证明先行</h2>
              <p>{teaching.proofOverview}</p>
            </section>
          )}

          <section className="card" id="node-formal">
            <h2>形式负载</h2>
            <p className="hint">核心定义与公式在此按数学排版显示；未登记中文名的字段保留原始键名。</p>
            <FormalLoad formal={node.formal} />
            {/* 机器表达层的入口：写的是草稿，落库要另走「自动关联」的最后一步。 */}
            <div className="node-machine-spec">
              <p className="muted">
                机器表达（`formalSpec`）：
                {hasMachineSpec
                  ? <>已登记{machineSpecVersion ? `（版本 ${machineSpecVersion}）` : ''}——它是自动关系发现的输入，与上面的形式负载分开保存。</>
                  : <>未登记。没有登记不等于对象不能形式化，只表示本站还没写。</>}
              </p>
              <div className="card-actions">
                <Link className="button small ghost" to={`/authoring?node=${encodeURIComponent(node.id)}&mode=new`}>以此为基础创建</Link>
                <Link className="button small ghost" to={`/authoring?node=${encodeURIComponent(node.id)}&mode=check`}>检查已有形式表达</Link>
              </div>
            </div>
            <p className="boundary-note">形成检查：<StatusBadge status={formation.status} /> {formation.note}</p>
            {formation.checks.length > 0 && (
              <details className="formation-details">
                <summary>展开逐项形成检查（{formation.checks.length} 项）</summary>
                <ul className="formation-checks">
                  {formation.checks.map((check) => (
                    <li key={check.name}>
                      <StatusBadge status={check.status} />
                      <strong>{check.name}</strong>
                      <span className="muted">{check.detail}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          {representations.length > 0 && (
            <section className="card" id="node-representations">
              <h2>表征</h2>
              <p className="hint">同一对象的不同呈现方式；每条表征各自带登记状态，不互相代替。</p>
              {Object.entries(representationGroups).map(([group, items]) => (
                <div className="representation-group" key={group}>
                  <h3>{group}</h3>
                  <ul className="representation-list">
                    {items.map((item) => (
                      <li key={item.id}>
                        <div className="representation-head">
                          <strong>{item.title}</strong>
                          <StatusBadge status={item.status} />
                          {item.medium && <span className="muted">{item.medium}</span>}
                        </div>
                        {item.note && <Markdown>{item.note}</Markdown>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}

          {(misconceptions.length > 0 || reviewQuestions.length > 0 || selfCheck.length > 0) && (
            <section className="card" id="node-selfcheck">
              <h2>误区、自检与回看</h2>
              {misconceptions.length > 0 && <><h3>常见误解</h3><ul>{misconceptions.map((item) => <li key={item}>{item}</li>)}</ul></>}
              {selfCheck.length > 0 && (
                profileId ? (
                  /* key 绑定「档案 + 节点」：切换任一项都会重挂载，草稿与提交上下文不会串到别的节点。 */
                  <SelfCheckTasks
                    key={`${profileId}:${decoded}`}
                    profileId={profileId}
                    nodeId={decoded}
                    items={selfCheck}
                    history={answerHistory}
                    onChanged={reloadLearning}
                    onNotice={setMessage}
                  />
                ) : (
                  <>
                    <h3>自检任务</h3>
                    <p className="hint">选择或新建档案后可以写下作答；作答只写入你的档案 E，不会自动确认掌握。</p>
                    <ul className="self-check">
                      {selfCheck.map((item) => (
                        <li key={item.id}>
                          <strong>{item.competence}</strong>：{item.prompt}
                          <em>评分依据：{item.criterion}</em>
                        </li>
                      ))}
                    </ul>
                  </>
                )
              )}
              {reviewQuestions.length > 0 && <><h3>保留的回看问题</h3><ul>{reviewQuestions.map((item) => <li key={item}>{item}</li>)}</ul></>}
            </section>
          )}

          <section className="card" id="node-notes">
            <h2>个人笔记（写入 E）</h2>
            {profileId ? (
              /* key 绑定「档案 + 节点」：未保存的草稿不会跟着切到下一个节点，也不会写到下一个节点名下。 */
              <NoteEditor
                key={`${profileId}:${decoded}`}
                profileId={profileId}
                nodeId={decoded}
                baseRevision={profile?.revision ?? null}
                onSaved={refreshProfiles}
                onNotice={setMessage}
              />
            ) : <p>先在顶部选择或新建档案。学习记录不会写入公共本体。</p>}
            <NodeNotes nodeId={decoded} />
          </section>

          <section className="card node-footer-actions">
            <h2>读完了</h2>
            {learnerActions}
            {/*
              这里不再按节点 id 给「上一节点／下一节点」：那个顺序既不是先修关系也不是路线顺序。
              沿路线阅读时给出路线的下一步；自由浏览时给出有依据的两条线索。
            */}
            {readingRoute && currentStep ? (
              <nav className="node-next" aria-label="路线下一步">
                <h3>路线进度：第 {currentStep.index} / {readingRoute.steps.length} 步</h3>
                <div className="card-actions">
                  {currentStep.index > 1 && <Link className="button" to={routeHref(currentStep.index - 1)}>← 上一步</Link>}
                  {currentStep.index < readingRoute.steps.length
                    ? <Link className="button primary" to={routeHref(currentStep.index + 1)}>下一步：{titleOf(readingRoute.steps[currentStep.index].node)} →</Link>
                    : <Link className="button primary" to={`/plan?goal=${encodeURIComponent(readingRoute.goal)}`}>已完成最后一步 · 回到路线</Link>}
                </div>
              </nav>
            ) : (
              <>
                {nextOptions.length > 0 && (
                  <nav className="node-next" aria-label="可选下一步">
                    <h3>可选下一步</h3>
                    <p className="hint">这些节点由「以本节点为输入」的登记行动产出；先学哪一个由你决定，不是站点指定的顺序。</p>
                    <ul className="link-list">
                      {nextOptions.map((id) => (
                        <li key={id}><Link to={`/nodes/${encodeURIComponent(id)}`}>{titleOf(id)}</Link></li>
                      ))}
                    </ul>
                  </nav>
                )}
                {related.length > 0 && (
                  <nav className="node-next" aria-label="相关概念">
                    <h3>相关概念</h3>
                    <ul className="link-list">
                      {related.map((item) => (
                        <li key={item.id}>
                          <Link to={`/nodes/${encodeURIComponent(item.id)}`}>{titleOf(item.id)}</Link>
                          <span className="muted">{item.label}</span>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
                <p className="hint">
                  想看完整的结构关系，可以打开<Link to="/network">知识网络</Link>，或为这个节点<Link to={`/plan?goal=${encodeURIComponent(node.id)}`}>规划一条路线</Link>。
                </p>
              </>
            )}
          </section>
        </article>

        <aside className="node-aside">
          <section className="card">
            <h2>证据与检查</h2>
            {evidence.length === 0 && <p>没有登记证据。未登记不等于命题为假。</p>}
            <ul className="evidence-list">
              {evidence.map((record) => (
                <li key={record.id}>
                  <div className="evidence-head">
                    <strong>{record.title}</strong>
                    <StatusBadge status={record.status} title={`证据等级：${record.status}`} />
                    {/* checkStatus 只描述「这一份有限证书」的检查结果；没有证书时显示它会把
                        REF/正文证明误标成红色「未运行」。 */}
                    {record.certificate && <StatusBadge status={record.checkStatus} title={`证书检查：${record.checkStatus}`} />}
                  </div>
                  <p>{record.scope}</p>
                  {record.openAssumptions.length > 0 && <p className="assumptions">开放假设：{record.openAssumptions.join('；')}</p>}
                  {record.obligations.length > 0 && <p className="obligations">仍缺：{record.obligations.join('；')}</p>}
                  {record.certificate && (
                    <button className="button small" onClick={() => runReplay(record)}>重放证书</button>
                  )}
                  {replay[record.id] && <p className="replay-result">重放：{replay[record.id].status}</p>}
                </li>
              ))}
            </ul>
          </section>

          {node.provenance?.sources?.length ? (
            <section className="card">
              <h2>来源</h2>
              <ul className="provenance-list">
                {node.provenance.sources.map((source) => <li key={source}>{source}</li>)}
              </ul>
              {node.provenance.note && <p className="muted">{node.provenance.note}</p>}
            </section>
          ) : null}

          <section className="card">
            <h2>支持族</h2>
            {/* 支持族是复核用的细节，默认折叠；证据状态与检查仍在上面直接可见。 */}
            <details className="support-details">
              <summary>展开支持族（{support.length} 项）</summary>
              {support.map((item) => (
                <div className="support-row" key={item.use}>
                  <StatusBadge status={item.status} />
                  <span className="support-use" title={item.use}>{supportUseLabel(item.use)}</span>
                  {item.status === 'Known' ? <span>{item.set?.join('、') || '∅（已查明空支持）'}{item.minimal ? '（极小）' : ''}</span> : <span>{item.reason}</span>}
                </div>
              ))}
            </details>
          </section>

          <section className="card">
            <h2>公开行动</h2>
            {actions.length === 0 && <p>没有产出该节点的登记行动。</p>}
            {actions.map((action) => (
              <div className="action-card" key={action.id}>
                <div><strong>{action.title}</strong><StatusBadge status={action.witness.status} /></div>
                <p><span className="label">I_a（AND）</span> {action.inputs.map((input) => `${input.node} [${input.accepts.map(resourceLabel).join('/')}]`).join(' + ')}</p>
                <p><span className="label">O_a（OR 候选）</span> {action.outputs.map((output) => `${output.node} [${output.provides.map(resourceLabel).join('/')}]`).join(' + ')}</p>
                {action.openAssumptions.length > 0 && <p className="assumptions">开放假设：{action.openAssumptions.join('；')}</p>}
              </div>
            ))}
          </section>

          <section className="card">
            <h2>关系</h2>
            {relations.length === 0 && <p>没有登记关系。</p>}
            <ul className="relation-list">
              {relations.map((relation) => (
                <li key={relation.id}>
                  <StatusBadge status={relation.witness.status} />
                  <span title={relation.kind}>{relationLabel(relation.kind)}</span>
                  <code>{relation.from} → {relation.to}</code>
                  {relation.scope && <p>{relation.scope}</p>}
                </li>
              ))}
            </ul>
          </section>

          {claims.length > 0 && (
            <section className="card">
              <h2>关联断言</h2>
              {claims.map((claim) => (
                <div key={claim.id}><strong>{claim.statement}</strong><p>{claim.evidence.map((item) => `${item.title}（${item.status}）`).join('；')}</p></div>
              ))}
            </section>
          )}

          {patterns.length > 0 && (
            <section className="card">
              <h2>相关误区模式</h2>
              {patterns.map((pattern) => <Link key={pattern.id} to={`/nodes/${encodeURIComponent(pattern.node)}`}>{pattern.title}</Link>)}
            </section>
          )}

          {boundary.length > 0 && (
            <section className="card boundary">
              <h2>节点边界</h2>
              <p className="hint">该节点自身的适用边界（<code>formal.boundary</code>），与局部化算子输出的边界 ∂V 不同。</p>
              <ul>{boundary.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function NodeNotes({ nodeId }: { nodeId: string }) {
  const { profileId } = useProfileContext();
  const notes = useApi<{ notes: NoteView[] }>(profileId ? `/profiles/${profileId}/notes?nodeId=${encodeURIComponent(nodeId)}` : null, [profileId, nodeId]);
  if (!profileId || !notes.data?.notes.length) return null;
  return (
    <div className="existing-notes">
      <h3>该节点的笔记</h3>
      {notes.data.notes.map((note) => (
        <article key={note.noteId}>
          <header><strong>{note.title}</strong><time>{new Date(note.updatedAt).toLocaleString('zh-CN')}</time></header>
          <p>{note.body}</p>
        </article>
      ))}
    </div>
  );
}
