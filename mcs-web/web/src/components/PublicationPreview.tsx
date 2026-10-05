import { useMemo, useState } from 'react';
import { StatusBadge } from './StatusBadge';
import type { UnavailableInfo } from '../api';
import {
  buildOverlay, isJointDerivation, jointInputs, pending, relationKindLabel,
  type CandidateView, type DraftFields, type ExclusionNote, type PublicationDiff, type PublicationRevision,
  type ReviewDecision,
} from '../authoring';

/**
 * 入库预览与确认（含版本与回滚）。
 *
 * 这个组件的全部职责是「把即将发生的事说清楚」：
 *
 * 1. **网络预览只叠加草稿与结果**：图上的每个点、每条线都来自当前草稿与本次候选；
 *    它不读公共本体图，也不改它——公共图在「确认入库」之前一动不动。
 * 2. **变更清单要完整**：节点、关系、证据、定义、契约逐项列出；服务端预览不可用时
 *    显示界面自算的**本地预演**并标明它不是承诺，而不是装作「没有变更」。
 * 3. **可以只采纳一部分**：每条已验证关系单独勾选；一条都没有的合法节点也能独立入库，
 *    未证命题保留「待证」状态。
 *
 * 回滚写成新的一条版本记录，不删除历史：这里只说这件事，不做别的。
 */

export interface PublishOutcome {
  revisionId: string | null;
  ontologyVersion: string | null;
  summary: string;
}

export interface PublicationPreviewProps {
  part: 'preview' | 'publish';
  fields: DraftFields;
  nodeRef: { node: string; version: string } | null;
  candidates: CandidateView[];
  decisions: Record<string, ReviewDecision>;
  includeIds: string[];
  onToggleInclude: (candidateId: string, include: boolean) => void;

  preview: PublicationDiff | null;
  previewLoading: boolean;
  previewUnavailable: UnavailableInfo | null;
  previewError: string | null;
  onPreview: () => void;

  draftId: string | null;
  draftRevision: number | null;
  ontologyVersion: string | null;
  reviewDigestValue: string;
  idempotencyKey: string;
  acceptedCount: number;
  dismissedCount: number;
  /** 最近一次解析检查的状态：未跑 / 通过 / 过期。入库前必须看得见这一条。 */
  validation: { ok: boolean; stale: boolean } | null;
  /** 本地改动还没保存到服务端：入库用的是服务端那份草稿，所以这时不让入库。 */
  unsavedChanges: boolean;
  /**
   * 服务端预览判定的「不入库」名单（候选 id → 原因）。
   * 勾选清单据此把这类候选标出来并置灰——它们进不了公共图，勾上也发不出去。
   */
  exclusionNotes?: Record<string, ExclusionNote>;

  publishing: boolean;
  publishUnavailable: UnavailableInfo | null;
  publishError: string | null;
  publishOutcome: PublishOutcome | null;
  onPublish: () => void;

  revisions: PublicationRevision[];
  revisionsLoading: boolean;
  revisionsUnavailable: UnavailableInfo | null;
  revisionsProblems: string[];
  revisionsRaw: unknown;
  /** 当前生效的扩展包版本（服务端的 `active` 指针）。 */
  activeRevision: string | null;
  /** 本体快照自检报出的「待复核」项：失效的自动关系不算当前已认证推导。 */
  revisionIntegrity: string[];
  onRollback: (revisionId: string) => void;
  rollbackPending: string | null;
  rollbackError: string | null;
  rollbackOutcome: PublishOutcome | null;

  onGoReview: () => void;
}

export function PublicationPreview(props: PublicationPreviewProps) {
  const {
    part, fields, nodeRef, candidates, decisions, includeIds, onToggleInclude,
    preview, previewLoading, previewUnavailable, previewError, onPreview,
    draftId, draftRevision, ontologyVersion, reviewDigestValue, idempotencyKey,
    acceptedCount, dismissedCount, validation, unsavedChanges, exclusionNotes = {}, publishing, publishUnavailable, publishError, publishOutcome, onPublish,
    revisions, revisionsLoading, revisionsUnavailable, revisionsProblems, revisionsRaw,
    activeRevision, revisionIntegrity,
    onRollback, rollbackPending, rollbackError, rollbackOutcome, onGoReview,
  } = props;

  const verified = candidates.filter((candidate) => candidate.math.status === 'verified');
  const overlay = useMemo(
    () => buildOverlay({ fields, nodeRef, candidates, decisions, includeIds }),
    [fields, nodeRef, candidates, decisions, includeIds],
  );
  const pendingStatement = pending(fields.statement);

  return (
    <>
      {part === 'preview' && (
        <>
          <section className="card pub-overlay">
            <h2>网络预览<span className="family-count">只叠加当前草稿与结果</span></h2>
            <p className="hint">{overlay.note}</p>
            <OverlayGraph overlay={overlay} />
            <ul className="pub-excluded">
              <li>未画出的已反驳项：<strong>{overlay.excluded.refuted}</strong> 条（只在审阅视图出现）</li>
              <li>未画出的未决项：<strong>{overlay.excluded.undecided}</strong> 条（既没证成也没反驳）</li>
              <li>已驳回：<strong>{overlay.excluded.dismissed}</strong> 条 · 本次未纳入：<strong>{overlay.excluded.notIncluded}</strong> 条</li>
              <li>还没审阅的已验证项：<strong>{overlay.excluded.pendingDecision}</strong> 条（未勾选时不会入库）</li>
            </ul>
            {overlay.groups.some((group) => group.inputs.length > 1) && (
              <div className="pub-joint">
                <h3>联合推导（在这些节点之间，连线不是各自独立的蕴含）</h3>
                <ul>
                  {overlay.groups.filter((group) => group.inputs.length > 1).map((group) => (
                    <li key={group.key}>
                      <strong>{group.edges.length} 条连线共用 {group.inputs.length} 项输入</strong>：
                      {group.inputs.map((input) => (
                        <span key={input.id} className="pub-joint-input">
                          <code>{input.id}</code>
                          {pending(input.readable).pending ? <em className="muted">读法待补充</em> : input.readable}
                          {input.source && <code className="pub-joint-source">{input.source}</code>}
                        </span>
                      ))}
                      <span className="muted">
                        涉及：{group.edges.map((edge) => `${edge.from} → ${edge.to}`).join('；')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="card pub-selection">
            <h2>本次入库纳入哪些关系<span className="family-count">{includeIds.length} / {verified.length} 条已验证</span></h2>
            <p className="hint">
              可以只采纳一部分已验证关系。没有已验证关系的合法节点也能独立入库——
              这时它的未证命题保留「待证」状态，不会被写成已成立。
            </p>
            {verified.length === 0 && (
              <p className="muted">
                本次没有已验证关系。节点仍可作为骨架入库：关系清单为空，陈述按「待证」登记。
              </p>
            )}
            <ul className="pub-include-list">
              {verified.map((candidate) => {
                const exclusion = exclusionNotes[candidate.id] ?? null;
                const included = includeIds.includes(candidate.id) && !exclusion;
                const inputs = jointInputs(candidate);
                return (
                  <li key={candidate.id} className={exclusion ? 'pub-include-excluded' : undefined}>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={included}
                        disabled={Boolean(exclusion)}
                        onChange={(event) => onToggleInclude(candidate.id, event.target.checked)}
                      />
                      <span>
                        {relationKindLabel(candidate.kind)}：<code>{candidate.from.node} → {candidate.to.node}</code>
                        {isJointDerivation(candidate)
                          ? <span className="pub-joint-badge">联合 {inputs.length} 项输入</span>
                          : <span className="muted">（无附加条件）</span>}
                        {exclusion
                          ? <span className="review-excluded-badge">不在入库范围</span>
                          : decisions[candidate.id] !== 'accepted' && <span className="muted"> · 尚未在审阅里采纳，勾选即视为采纳</span>}
                      </span>
                    </label>
                    {exclusion && (
                      <p className="muted">
                        服务端判定不入库（{exclusion.reasonCode}）：{exclusion.reason || '（服务端未给出原因）'}
                        ——不是系统出错，也不影响其余内容入库。
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="card-actions">
              <button type="button" className="button" onClick={onGoReview}>回到审阅视图调整采纳</button>
            </div>
          </section>

          <section className="card pub-diff">
            <h2>入库前的完整变更清单</h2>
            <div className="card-actions">
              <button type="button" className="button primary" disabled={previewLoading} onClick={onPreview}>
                {previewLoading ? '正在计算差异…' : '计算服务端差异（零写入）'}
              </button>
              <span className="muted">服务端预览与真正入库共用同一段差异计算；本地预演只用于服务端不可用时自查。</span>
            </div>

            {previewUnavailable && (
              <p className="error">
                服务端预览不可用：{previewUnavailable.kind === 'module' ? '功能尚未就绪' : previewUnavailable.message}
                {previewUnavailable.specifier ? ` · 模块 ${previewUnavailable.specifier}` : ''}
                {previewUnavailable.reason ? ` · 原因：${previewUnavailable.reason}` : ''}
                <br />
                下面显示的是<strong>本地预演</strong>：由界面按草稿与候选自算，定义与契约一项都不生成，也不代表服务端会接受这次入库。
              </p>
            )}
            {previewError && !previewUnavailable && <p className="error">{previewError}</p>}

            {preview && (
              <DiffView diff={preview} fields={fields} pendingStatement={pendingStatement} candidates={candidates} />
            )}
            {!preview && !previewLoading && (
              <p className="muted">还没有差异。点上面的按钮算一次；本地预演会在服务端不可用时自动顶上。</p>
            )}
          </section>
        </>
      )}

      {part === 'publish' && (
        <>
          <section className="card pub-commit">
            <h2>确认入库</h2>
            <p className="hint">
              入库走六步事务：固定清单 → 重放证据并重核假设 → 隔离区合成与检查 → 写不可变内容包 →
              单写入锁下原子切换 → 刷新本体快照。任一步失败，原版本继续生效。
            </p>
            <dl className="facts compact">
              <div><dt>草稿</dt><dd>{draftId ? <code>{draftId}</code> : <span className="muted">尚未保存到服务端</span>}</dd></div>
              <div><dt>草稿修订</dt><dd>{draftRevision ?? <span className="muted">（无）</span>}</dd></div>
              <div><dt>本体版本</dt><dd>{ontologyVersion ? <code>{ontologyVersion}</code> : <span className="muted">（未取到）</span>}</dd></div>
              <div><dt>采纳 / 驳回</dt><dd>{acceptedCount} / {dismissedCount}</dd></div>
              <div><dt>本次纳入</dt><dd>{includeIds.length} 条已验证关系</dd></div>
              <div><dt>审阅摘要</dt><dd><code>{reviewDigestValue}</code><br /><span className="muted">摘要只用于幂等与一致性核对，不是密码学承诺。</span></dd></div>
              <div><dt>幂等键</dt><dd><code>{idempotencyKey}</code><br /><span className="muted">同一批内容重复提交会返回同一条版本记录。</span></dd></div>
            </dl>

            <div className="card-actions">
              <button
                type="button"
                className="button primary"
                disabled={publishing || !draftId || unsavedChanges}
                title={!draftId ? '入库需要服务端草稿；编写库未就绪时无法入库，本地草稿仍保留' : unsavedChanges ? '先把本地改动保存到服务端草稿：入库用的是服务端那一份' : '重新重放证据并写入内容包'}
                onClick={onPublish}
              >
                {publishing ? '正在入库…' : '确认入库（新建一条版本记录）'}
              </button>
            </div>

            {unsavedChanges && (
              <p className="error">
                本地改动还没有保存到服务端草稿。入库用的是<strong>服务端那一份</strong>，与屏幕上看到的可能不同，
                所以这里把入库挡住了——先按「保存到服务端」，再回来确认。
              </p>
            )}

            {/*
              入库前必须能一眼看出「这份表达检查过没有、结果是不是过期的」。
              三种情况分开写，不用一个含糊的黄色提示糊过去。
            */}
            {!validation && (
              <p className="error">
                这份草稿还没有跑过解析检查（第 2 步「检查表达」）。入库前建议先检查一次：
                表达式没被解析过时，很多关系判定根本无从进行。
              </p>
            )}
            {validation && validation.stale && (
              <p className="error">
                最近一次检查之后又改过源码，那份结果已经过期。入库前请回到第 2 步重新检查。
              </p>
            )}
            {validation && !validation.stale && validation.ok && (
              <p className="notice">当前源码已通过解析与类型检查（通过只说明表达可读、良类型，不表示命题成立）。</p>
            )}
            {validation && !validation.stale && !validation.ok && (
              <p className="error">当前源码未通过解析检查；请先修好表达再入库。</p>
            )}
            {!draftId && (
              <p className="error">
                还不能入库：这次编写只存在于浏览器本地草稿里。入库请求必须带服务端草稿 id 与修订号
                （乐观锁），否则「预期修订 + 本体版本」这套保护就失效了。
              </p>
            )}
            {publishUnavailable && (
              <p className="error">
                入库未能执行：{publishUnavailable.kind === 'module' ? '功能尚未就绪' : publishUnavailable.message}
                {publishUnavailable.specifier ? ` · 模块 ${publishUnavailable.specifier}` : ''}
                {publishUnavailable.reason ? ` · 原因：${publishUnavailable.reason}` : ''}
                <br />这不是「入库失败所以内容有问题」——是入库这件事本身还没法做；公共本体没有变化。
              </p>
            )}
            {publishError && !publishUnavailable && <p className="error">入库失败：{publishError}</p>}
            {publishOutcome && (
              <div className="pub-outcome">
                <p className="notice">
                  已入库：版本 <code>{publishOutcome.revisionId ?? '（服务端未返回 id）'}</code>
                  {' · '}本体版本 <code>{publishOutcome.ontologyVersion ?? '（未返回）'}</code>
                </p>
                <p className="muted">{publishOutcome.summary}</p>
              </div>
            )}
          </section>

          <section className="card pub-revisions">
            <h2>版本与回滚<span className="family-count">{revisions.length} 条版本记录</span></h2>
            <p className="hint">
              回滚会<strong>新建</strong>一条 <code>kind:&apos;rollback&apos;</code> 的版本记录，恢复选定历史内容状态；
              不删除历史包、证据或学习者记录，并同时处理其后依赖新增节点的关系与契约，
              保证当前公共网络没有悬空引用。
            </p>
            <p className="muted">
              当前生效版本：{activeRevision ? <code>{activeRevision}</code> : '（没有扩展包：公共图还是基础数据）'}
            </p>
            {revisionIntegrity.length > 0 && (
              <div className="pub-boundary-box">
                <strong>本体快照自检报出的待复核项（{revisionIntegrity.length}）</strong>
                <p className="muted">失效的自动关系标为待复核，<strong>不作为</strong>当前已认证推导。</p>
                <ul className="pub-boundary">{revisionIntegrity.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            )}
            {revisionsLoading && <p className="muted">正在读取版本清单…</p>}
            {revisionsUnavailable && (
              <p className="error">
                版本清单不可用：{revisionsUnavailable.kind === 'module' ? '功能尚未就绪' : revisionsUnavailable.message}
                {revisionsUnavailable.specifier ? ` · 模块 ${revisionsUnavailable.specifier}` : ''}
                {revisionsUnavailable.reason ? ` · 原因：${revisionsUnavailable.reason}` : ''}
              </p>
            )}
            {revisionsProblems.map((problem) => <p className="muted" key={problem}>{problem}</p>)}
            {!revisionsLoading && !revisionsUnavailable && revisions.length === 0 && (
              <p className="muted">还没有任何版本记录：这个站点还没有通过本流程入库过内容包。</p>
            )}
            {revisions.length > 0 && (
              <div className="pub-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th scope="col">版本</th><th scope="col">类型</th><th scope="col">时间</th><th scope="col">内容</th><th scope="col">审阅</th><th scope="col">操作</th></tr>
                  </thead>
                  <tbody>
                    {revisions.map((revision) => (
                      <RevisionRow
                        key={revision.id}
                        revision={revision}
                        onRollback={onRollback}
                        pending={rollbackPending === revision.id}
                        busy={Boolean(rollbackPending)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!revisionsUnavailable && revisions.length === 0 && revisionsProblems.length > 0 && revisionsRaw !== null && (
              <pre className="pub-raw">{JSON.stringify(revisionsRaw, null, 2)}</pre>
            )}
            {rollbackError && <p className="error">回滚失败：{rollbackError}</p>}
            {rollbackOutcome && (
              <p className="notice">
                回滚完成：新版本 <code>{rollbackOutcome.revisionId ?? '（未返回）'}</code>
                {' · '}本体版本 <code>{rollbackOutcome.ontologyVersion ?? '（未返回）'}</code>
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
}

interface BucketSummaryProps { added: number; changed: number; removed: number; unchanged: number }

/** 「新增 / 变更 / 移除 / 未变」四个数一起给：只报新增会让人以为整个网络都要重写。 */
function BucketSummary({ added, changed, removed, unchanged }: BucketSummaryProps) {
  return (
    <span className="pub-bucket-summary">
      <span className="pub-bucket pub-bucket-added">新增 {added}</span>
      <span className="pub-bucket">变更 {changed}</span>
      <span className="pub-bucket">移除 {removed}</span>
      <span className="pub-bucket muted">未变 {unchanged}</span>
    </span>
  );
}

function DiffView({ diff, fields, pendingStatement, candidates }: {
  diff: PublicationDiff;
  fields: DraftFields;
  pendingStatement: { text: string; pending: boolean };
  candidates: CandidateView[];
}) {
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const jointFor = (candidateId: string | null) => {
    const candidate = candidateId ? candidateById.get(candidateId) : undefined;
    return candidate ? jointInputs(candidate) : [];
  };

  return (
    <div className="pub-diff-body">
      <p className={diff.origin === 'server' ? 'notice' : 'error'}>
        {diff.origin === 'server'
          ? '这份差异来自服务端，与真正入库共用同一段计算。'
          : '这份差异是界面自算的本地预演，不是服务端的承诺。'}
      </p>
      {diff.origin === 'server' && !diff.sealed && (
        <p className="error">服务端把这份内容标为<strong>未封口</strong>：有阻断项，现在提交会返回 409（见下面的「阻断项」）。</p>
      )}

      <h3>节点<BucketSummary added={diff.nodes.added.length} changed={diff.nodes.changed.length} removed={diff.nodes.removed.length} unchanged={diff.nodes.unchanged} /></h3>
      {diff.nodes.added.length + diff.nodes.changed.length + diff.nodes.removed.length === 0
        ? <p className="muted">节点清单没有变化。</p>
        : (
          <ul className="pub-list">
            {diff.nodes.added.map((node) => (
              <li key={`add-${node.id}`}>
                <span className="pub-change pub-change-added">新增</span>
                <code>{node.id}</code> <strong>{node.title}</strong>
                {node.construct && <span className="muted"> · {node.construct}</span>}
                {node.note && <p className="muted">{node.note}</p>}
                <p className="muted">
                  陈述：{pendingStatement.pending
                    ? <span>待补充（未填写形式陈述）——登记为「待证」骨架。</span>
                    : <code className="pub-statement">{pendingStatement.text.split('\n')[0]}</code>}
                </p>
              </li>
            ))}
            {diff.nodes.changed.map((node) => (
              <li key={`chg-${node.id}`}><span className="pub-change">变更</span><code>{node.id}</code> {node.title}</li>
            ))}
            {diff.nodes.removed.map((node) => (
              <li key={`rm-${node.id}`}><span className="pub-change pub-change-removed">移除</span><code>{node.id}</code> {node.title}</li>
            ))}
          </ul>
        )}

      <h3>关系<BucketSummary added={diff.relations.added.length} changed={diff.relations.changed.length} removed={diff.relations.removed.length} unchanged={diff.relations.unchanged} /></h3>
      {diff.relations.added.length === 0
        ? <p className="muted">没有已验证关系被纳入；未证命题保留「待证」状态。</p>
        : (
          <ul className="pub-list">
            {diff.relations.added.map((relation) => {
              const inputs = jointFor(relation.candidateId);
              return (
                <li key={relation.id}>
                  <span className="pub-change pub-change-added">新增</span>
                  <span className="review-kind">{relationKindLabel(String(relation.kind))}</span>
                  <code>{relation.from} → {relation.to}</code>
                  {isJointDerivation({ conditions: inputs }) && <span className="pub-joint-badge">联合 {inputs.length} 项输入</span>}
                  {relation.verificationStatus && <StatusBadge status={relation.verificationStatus} />}
                  {relation.candidateId && <span className="muted"> · 候选 <code>{relation.candidateId}</code></span>}
                  {relation.evidenceRef && <span className="muted"> · 证据 <code>{relation.evidenceRef}</code></span>}
                  {inputs.length > 0 && (
                    <ul className="pub-relation-inputs">
                      {inputs.map((input) => (
                        <li key={input.id}>
                          <code>{input.id}</code>
                          {pending(input.readable).pending ? <span className="muted">读法待补充</span> : input.readable}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            {diff.relations.changed.map((relation) => (
              <li key={`chg-${relation.id}`}><span className="pub-change">变更</span><code>{relation.id}</code> {relationKindLabel(String(relation.kind))}</li>
            ))}
            {diff.relations.removed.map((relation) => (
              <li key={`rm-${relation.id}`}><span className="pub-change pub-change-removed">移除</span><code>{relation.from} → {relation.to}</code> {relationKindLabel(String(relation.kind))}</li>
            ))}
          </ul>
        )}

      <h3>证据<BucketSummary added={diff.evidence.added.length} changed={diff.evidence.changed.length} removed={diff.evidence.removed.length} unchanged={diff.evidence.unchanged} /></h3>
      {diff.evidence.added.length + diff.evidence.changed.length + diff.evidence.removed.length === 0
        ? <p className="muted">证据清单没有变化。</p>
        : (
          <ul className="pub-list">
            {diff.evidence.added.map((record) => (
              <li key={`add-${record.id}`}>
                <span className="pub-change pub-change-added">新增</span>
                <code>{record.id}</code>
                {record.kind && <span className="muted"> · {record.kind}</span>}
                {record.label && <StatusBadge status={record.label} title={`证据等级：${record.label}`} />}
                {record.checkStatus && <StatusBadge status={record.checkStatus} />}
                {record.nodes.length > 0 && <span className="muted"> · 覆盖 {record.nodes.join('、')}</span>}
              </li>
            ))}
            {diff.evidence.changed.map((record) => (
              <li key={`chg-${record.id}`}><span className="pub-change">变更</span><code>{record.id}</code></li>
            ))}
            {diff.evidence.removed.map((record) => (
              <li key={`rm-${record.id}`}><span className="pub-change pub-change-removed">移除</span><code>{record.id}</code></li>
            ))}
          </ul>
        )}

      <h3>定义与行动契约<BucketSummary
        added={diff.definitions.added.length + diff.contracts.added.length}
        changed={diff.definitions.changed.length + diff.contracts.changed.length}
        removed={diff.definitions.removed.length + diff.contracts.removed.length}
        unchanged={diff.definitions.unchanged + diff.contracts.unchanged}
      /></h3>
      {diff.definitions.added.length === 0 && diff.contracts.added.length === 0 && <p className="muted">（清单里没有新增定义或契约）</p>}
      {diff.definitions.added.length > 0 && (
        <ul className="pub-list">
          {diff.definitions.added.map((item) => (
            <li key={`def-${item.id}`}><span className="pub-change pub-change-added">新增</span><code>{item.name || item.id}</code>{item.node && <span className="muted"> · 节点 <code>{item.node}</code></span>}</li>
          ))}
        </ul>
      )}
      {diff.contracts.added.length > 0 && (
        <ul className="pub-list">
          {diff.contracts.added.map((item) => (
            <li key={`con-${item.id}`}><span className="pub-change pub-change-added">新增</span><code>{item.id}</code> {item.title}{item.mode && <span className="muted"> · {item.mode}</span>}</li>
          ))}
        </ul>
      )}

      {/*
        入库三分法（服务端稳定字段）：publishable / pending / excluded。
        三者分开显示，措辞与行为对齐：
        · pending 是「记为待证」——**不阻断**；
        · excluded 是「不入库」——**不阻断**，且**不是**系统出错、**不是**命题不成立。
      */}
      {diff.origin === 'server' && (
        <p className="muted">
          服务端三分类：可入库 <strong>{diff.publishable.length}</strong> 条 ·
          记为待证 <strong>{diff.pending.length}</strong> 条 ·
          不入库 <strong>{diff.excluded.length}</strong> 条
          {diff.nothingToPublish && <strong>（选中的内容一条也进不了库）</strong>}
        </p>
      )}

      {diff.pending.length > 0 && (
        <>
          <h3>记为待证（不阻断）<span className="family-count">{diff.pending.length}</span></h3>
          <p className="hint">
            这些候选<strong>不进入本次变更</strong>，也不会挡住其余内容；它们各自写明原因。
            「记为待证」不是失败，也不是「已成立的关系」。
          </p>
          <ul className="pub-list">
            {diff.pending.map((item) => (
              <li key={item.id}>
                <span className="pub-change">待证</span>
                <code>{item.from} → {item.to}</code>
                {item.kind && <span className="muted"> · {relationKindLabel(String(item.kind))}</span>}
                {item.reasonCode && <span className="muted"> · {item.reasonCode}</span>}
                <p className="muted">{item.reason || '（服务端未给出原因）'}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {diff.excluded.length > 0 && (
        <>
          <h3>不在入库范围（不阻断）<span className="family-count">{diff.excluded.length}</span></h3>
          <p className="hint">
            这类候选**不进公共图**，但**不**影响其余内容入库。它不是系统出错，也不是命题不成立：
            常见原因是端点只存在于登记表里（概念锚点），发布模型里没有它的位置。
          </p>
          <ul className="pub-list">
            {diff.excluded.map((item) => (
              <li key={`${item.candidateId}-${item.reasonCode}`}>
                <span className="pub-change">{item.reasonCode === 'refuted' ? '已反驳' : '不入库'}</span>
                <code>{item.from} → {item.to}</code>
                {item.kind && <span className="muted"> · {relationKindLabel(String(item.kind))}</span>}
                {item.reasonCode && <span className="muted"> · {item.reasonCode}</span>}
                <p className="muted">{item.reason || '（服务端未给出原因）'}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {diff.problems.length > 0 && (
        <div className="error">
          <strong>阻断项（提交会返回 409）</strong>
          <ul>{diff.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
        </div>
      )}
      {diff.warnings.length > 0 && (
        <div className="pub-boundary-box">
          <strong>需要看一眼的项</strong>
          <ul className="pub-boundary">{diff.warnings.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      )}
      {diff.steps.length > 0 && (
        <details className="case-details">
          <summary>发布事务的六步（服务端下发）</summary>
          <ol className="pub-steps">{diff.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        </details>
      )}
      {!diff.recognized && (
        <>
          <p className="error">
            服务端返回了未识别的差异形状：下面原样列出，<strong>不能</strong>读成「没有变更」。
          </p>
          <pre className="pub-raw">{JSON.stringify(diff.raw, null, 2)}</pre>
        </>
      )}
      <p className="muted">草稿背景：<code>{fields.background || '（尚未选择）'}</code> · 草稿名称：{fields.name || '（待补充）'}</p>
    </div>
  );
}

/** 只画草稿与本次已验证关系的局部图：不读公共本体图，也不写它。 */
function OverlayGraph({ overlay }: { overlay: ReturnType<typeof buildOverlay> }) {
  const width = 720;
  const height = 260;
  const centerX = width / 2;
  const centerY = height / 2;
  const others = overlay.nodes.filter((node) => node.role !== 'draft');
  const radius = Math.min(110, 50 + others.length * 10);
  const positions = new Map<string, { x: number; y: number }>();
  positions.set(overlay.nodes[0]?.id ?? '', { x: centerX, y: centerY });
  others.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, others.length) - Math.PI / 2;
    positions.set(node.id, { x: centerX + Math.cos(angle) * (width / 2 - radius), y: centerY + Math.sin(angle) * (height / 2 - 34) });
  });

  return (
    <div className="pub-graph">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="只叠加当前草稿与本次已验证关系的局部网络预览">
        {overlay.edges.map((edge) => {
          const from = positions.get(edge.from) ?? { x: centerX, y: centerY };
          const to = positions.get(edge.to) ?? { x: centerX, y: centerY };
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          return (
            <g key={edge.id} className={edge.joint ? 'pub-edge-group pub-edge-joint' : 'pub-edge-group'}>
              <line className="pub-edge" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
              {edge.joint && <line className="pub-edge pub-edge-second" x1={from.x} y1={from.y + 3} x2={to.x} y2={to.y + 3} />}
              <text className="pub-edge-label" x={midX} y={midY - 6} textAnchor="middle">
                {relationKindLabel(String(edge.kind))}{edge.joint ? ` · 联合 ${edge.jointInputs.length} 项` : ''}
              </text>
              {edge.evidenceLabel && <text className="pub-edge-evidence" x={midX} y={midY + 12} textAnchor="middle">{edge.evidenceLabel}</text>}
            </g>
          );
        })}
        {overlay.nodes.map((node) => {
          const point = positions.get(node.id) ?? { x: centerX, y: centerY };
          const draft = node.role === 'draft';
          const boxWidth = draft ? 220 : 168;
          return (
            <g key={node.id} className={draft ? 'pub-node pub-node-draft' : 'pub-node'}>
              <rect x={point.x - boxWidth / 2} y={point.y - 22} width={boxWidth} height={44} rx={10} />
              <text className="pub-node-title" x={point.x} y={point.y - 3} textAnchor="middle">{node.label}</text>
              <text className="pub-node-sub" x={point.x} y={point.y + 14} textAnchor="middle">{draft ? '当前草稿（未入库）' : '已登记节点（只读）'}</text>
            </g>
          );
        })}
      </svg>
      {overlay.edges.length === 0 && (
        <p className="muted">图上还没有连线：本次没有纳入任何已验证关系。公共本体图同样没有变化。</p>
      )}
    </div>
  );
}

function RevisionRow(props: { revision: PublicationRevision; onRollback: (id: string) => void; pending: boolean; busy: boolean }) {
  const { revision, onRollback, pending, busy } = props;
  const [confirming, setConfirming] = useState(false);
  const summary = revision.summary;
  return (
    <tr>
      <td>
        <code>{revision.id}</code>
        {revision.parent && <div className="muted">父版本 <code>{revision.parent}</code></div>}
        {revision.restores && <div className="muted">恢复自 <code>{revision.restores}</code></div>}
      </td>
      <td>{revision.kind === 'rollback' ? '回滚' : '发布'}</td>
      <td>{revision.createdAt ? new Date(revision.createdAt).toLocaleString('zh-CN') : '（未返回）'}</td>
      <td className="muted">
        节点 {summary.nodes} · 关系 {summary.relations} · 证据 {summary.evidence} · 定义 {summary.definitions} · 契约 {summary.contracts}
        <div>采纳 {revision.acceptedCandidateIds.length} · 驳回 {revision.dismissedCandidateIds.length}</div>
        {revision.packagePath && <div><code>{revision.packagePath}</code></div>}
      </td>
      <td className="muted"><code>{revision.reviewDigest || '（无）'}</code>{revision.notes && <div>{revision.notes}</div>}</td>
      <td>
        {!confirming && (
          <button type="button" className="button small" disabled={busy} onClick={() => setConfirming(true)}>回滚到此版本</button>
        )}
        {confirming && (
          <div className="pub-rollback-confirm">
            <p className="muted">确认恢复 <code>{revision.id}</code>？这会新建一条回滚版本记录。</p>
            <div className="card-actions">
              <button type="button" className="button small primary" disabled={busy} onClick={() => { setConfirming(false); onRollback(revision.id); }}>
                {pending ? '正在回滚…' : '确认回滚'}
              </button>
              <button type="button" className="button small" onClick={() => setConfirming(false)}>取消</button>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}
