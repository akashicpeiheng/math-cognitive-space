import { StatusBadge } from './StatusBadge';
import {
  MATH_JUDGMENT_BOUNDARY, MATH_JUDGMENT_LABEL, MATH_JUDGMENT_MARK, MATH_JUDGMENT_TONE,
  REVIEW_LABEL, RUN_STATUS_LABEL, groupByJointInputs, groupCandidates, isJointDerivation, jointInputs,
  pending, relationKindLabel,
  type CandidateView, type ExclusionNote, type ReplayOutcome, type ReviewDecision, type RunView,
} from '../authoring';

/**
 * 结果审阅面板。
 *
 * 四件必须做到的事：
 *
 * 1. **按数学判断分组**：已通过检查 / 已被有限反例反驳 / 未决。每一组都给出中文短语与
 *    非颜色记号（✓ / ✗ / ?），并写明该档的边界；只有第一组允许被采纳。
 * 2. **联合推导露出共同输入**：逐条列出 `conditions`，并在标题上标出「联合 N 项输入」。
 *    只要条件多于一条，这条连线**不能**被读成 `from` 单独蕴含 `to`。
 * 3. **已反驳与未决只在这里出现**：这一节是审阅视图；网络预览不画它们。
 * 4. **「不入库」与「不成立」分开说**：服务端判定不入库的候选（概念锚点等）单独标出来，
 *    附上服务端给的原因；它**不是**系统出错，也**不是**命题不成立。
 *
 * 面板不做任何数学判断：状态、原因、范围全部原样来自服务端返回的候选与预览三分法。
 */

export type ReplayRecord = ReplayOutcome | { error: string };

function isReplayError(record: ReplayRecord): record is { error: string } {
  return (record as { error?: string }).error !== undefined;
}

export interface RelationReviewPanelProps {
  run: RunView | null;
  candidates: CandidateView[];
  decisions: Record<string, ReviewDecision>;
  onDecide: (candidateId: string, decision: ReviewDecision) => void;
  onReplay: (candidateIds: string[]) => void;
  replaying: boolean;
  replayResults: Record<string, ReplayRecord>;
  runError: string | null;
  polling: boolean;
  /**
   * 服务端预览判定的「不入库」名单（候选 id → 原因）。
   * 由 `excludedReasonsFrom(previewDiff)` 喂进来；为空表示还没预览过（或全部可入库）。
   */
  exclusionNotes?: Record<string, ExclusionNote>;
}

export function RelationReviewPanel(props: RelationReviewPanelProps) {
  const { run, candidates, decisions, onDecide, onReplay, replaying, replayResults, runError, polling, exclusionNotes = {} } = props;
  const groups = groupCandidates(candidates);

  if (!run && candidates.length === 0) {
    return (
      <section className="card review-panel">
        <h2>审阅结果</h2>
        <p className="muted">还没有运行结果。先在上一步启动一次自动发现。</p>
        {runError && <p className="error">{runError}</p>}
      </section>
    );
  }

  const verifiedCandidates = candidates.filter((candidate) => candidate.math.status === 'verified');
  const excludedEntries = Object.entries(exclusionNotes);

  return (
    <section className="card review-panel">
      <h2>审阅结果<span className="family-count">{candidates.length} 条候选</span></h2>
      <p className="hint">
        这一节是<strong>审阅视图</strong>：已反驳与未决项只在这里出现，不会被画进网络预览。
        采纳只对「已通过检查」的候选开放——其余两档可以被驳回，但不能被采纳。
      </p>
      {excludedEntries.length > 0 && (
        <div className="review-excluded">
          <strong>服务端判定「不入库」的有 {excludedEntries.length} 条</strong>
          <p className="muted">
            这不是系统出错，也不是命题不成立：这类候选（例如端点只存在于登记表里的**概念锚点**）
            在发布模型里没有位置。它们不阻断其余内容入库，也已经从「本次入库范围」里移除。
          </p>
          <ul>
            {excludedEntries.map(([candidateId, note]) => (
              <li key={candidateId}>
                <code>{candidateId}</code>
                <span className="muted">{note.reasonCode}</span>
                {note.reason || '（服务端未给出原因）'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {run && (
        <div className="review-run">
          <div className="review-run-head">
            <strong>运行 {run.id}</strong>
            <span className={`run-status run-${run.status}`} data-status={run.status}>{RUN_STATUS_LABEL[run.status] ?? run.status}</span>
            {polling && <span className="muted">后台运行中，页面可以继续操作</span>}
          </div>
          <dl className="facts compact">
            <div><dt>候选</dt><dd>{run.stats.candidates} 条（覆盖 {run.stats.coveredNodes} 个节点）</dd></div>
            <div><dt>判断分布</dt><dd>已验证 {run.stats.verified} · 已反驳 {run.stats.refuted} · 未决 {run.stats.undecided}</dd></div>
            <div><dt>未处理</dt><dd>{run.stats.unprocessed} 条{run.stats.unprocessed > 0 ? '（超出候选上限，已完成结果保留）' : ''}</dd></div>
            <div><dt>耗时</dt><dd>{run.stats.durationMs} ms</dd></div>
            <div><dt>预算</dt><dd>候选上限 {run.budget.maxCandidates} · 单候选 {run.budget.perCandidateMs} ms · 整批 {run.budget.totalMs} ms · 深度 {run.budget.depth} · 状态上限 {run.budget.maxStates}</dd></div>
            <div><dt>背景 / 本体</dt><dd><code>{run.background || '（未返回）'}</code> · 本体 {run.ontologyVersion || '（未返回）'}</dd></div>
          </dl>
          {run.interrupted && (
            <p className="error">任务被中断（服务重启）：已核验的结果保留，中断不等于数学反驳。</p>
          )}
          {run.status === 'error' && <p className="error">任务执行出错；出错不是数学判断，候选的数学状态仍是「未决」。</p>}
        </div>
      )}

      {runError && <p className="error">{runError}</p>}

      {candidates.length === 0 && (
        <p className="muted">
          这次运行没有产生候选。没有候选不等于「这些概念之间没有关系」——只表示在本次背景、
          预算与首版证明能力（§4）之内没有找到可判的东西。
        </p>
      )}

      {groups.map((group) => (
        <div className={`review-group review-${group.tone}`} key={group.status}>
          <div className="review-group-head">
            <span className={`review-mark review-mark-${group.tone}`} aria-hidden="true">{group.mark}</span>
            <h3>{group.label}<span className="family-count">{group.candidates.length} 条</span></h3>
          </div>
          <p className="muted">{group.boundary}</p>
          {group.candidates.length === 0 && (
            <p className="muted">
              {group.status === 'verified' ? '本次没有通过检查的候选。'
                : group.status === 'refuted' ? '本次没有已反驳项；「没有反例」不等于命题为真。'
                  : '本次没有未决项。'}
            </p>
          )}

          {/* 同一组共同输入下的连线成组显示：让「联合推导」一眼看得出来。 */}
          {group.status === 'verified' && group.candidates.length > 0 && (
            <div className="review-joint-groups">
              {groupByJointInputs(group.candidates).filter((joint) => joint.inputs.length > 1).map((joint) => (
                <p className="review-joint-summary" key={joint.key}>
                  <strong>联合推导组：{joint.items.length} 条连线共用同一组 {joint.inputs.length} 项输入</strong>
                  <span className="muted">
                    （{joint.inputs.map((input) => input.id || input.source).join(' + ')}）
                    ——它们不是彼此独立的蕴含，缺任何一项都不成立。
                  </span>
                </p>
              ))}
            </div>
          )}

          <ul className="review-list">
            {group.candidates.map((candidate) => (
              <CandidateRow
                key={candidate.id}
                candidate={candidate}
                decision={decisions[candidate.id] ?? null}
                exclusionNote={exclusionNotes[candidate.id] ?? null}
                onDecide={onDecide}
                onReplay={onReplay}
                replaying={replaying}
                replayRecord={replayResults[candidate.id] ?? null}
              />
            ))}
          </ul>
        </div>
      ))}

      {verifiedCandidates.length > 0 && (
        <div className="card-actions">
          <button type="button" className="button small" disabled={replaying} onClick={() => onReplay(verifiedCandidates.map((candidate) => candidate.id))}>
            {replaying ? '重放中…' : `重放全部已验证候选（${verifiedCandidates.length} 条）`}
          </button>
          <span className="muted">重放从<strong>当前</strong>本体快照重新生成目标并重跑检查器；相关输入变了，旧结果即失效。</span>
        </div>
      )}
    </section>
  );
}

function CandidateRow(props: {
  candidate: CandidateView;
  decision: ReviewDecision;
  /** 服务端预览判定的「不入库」原因（如果有）。 */
  exclusionNote: ExclusionNote | null;
  onDecide: (candidateId: string, decision: ReviewDecision) => void;
  onReplay: (candidateIds: string[]) => void;
  replaying: boolean;
  replayRecord: ReplayRecord | null;
}) {
  const { candidate, decision, exclusionNote, onDecide, onReplay, replaying, replayRecord } = props;
  const inputs = jointInputs(candidate);
  const joint = isJointDerivation(candidate);
  const tone = MATH_JUDGMENT_TONE[candidate.math.status];
  const reason = pending(candidate.reason);

  return (
    <li className={`review-item review-${tone}${exclusionNote ? ' review-item-excluded' : ''}`} data-status={candidate.math.status} data-publishable={exclusionNote ? 'false' : 'true'}>
      <div className="review-item-head">
        <span className={`review-mark review-mark-${tone}`} aria-hidden="true">{MATH_JUDGMENT_MARK[candidate.math.status]}</span>
        <span className={`review-status review-status-${tone}`}>{MATH_JUDGMENT_LABEL[candidate.math.status]}</span>
        <span className="review-kind">{relationKindLabel(candidate.kind)}</span>
        <code className="review-endpoints">{candidate.from.node} → {candidate.to.node}</code>
        {joint
          ? <span className="review-joint-badge">联合 {inputs.length} 项输入</span>
          : <span className="review-single-badge">无附加条件</span>}
        {candidate.evidence && <StatusBadge status={candidate.evidence.status} title={`证据等级：${candidate.evidence.status}`} />}
        {/* 「不入库」是一个独立标签：与「不成立」分开，也和"系统出错"分开。 */}
        {exclusionNote && <span className="review-excluded-badge">不在入库范围</span>}
        {decision && <span className={`review-decision review-decision-${decision}`}>{REVIEW_LABEL[decision]}</span>}
      </div>

      {exclusionNote && (
        <p className="review-excluded-note">
          服务端判定这条<strong>不入库</strong>（{exclusionNote.reasonCode}）：{exclusionNote.reason || '（服务端未给出原因）'}
          <br />
          <span className="muted">这不是系统出错，也不是命题不成立；它不影响本次其余内容入库。采纳/驳回仍可记录你的审阅意见。</span>
        </p>
      )}

      <details className="review-details">
        <summary>展开：方向、精确条件、理由、证据范围、证明或反例、重放</summary>

        <dl className="facts compact">
          <div>
            <dt>关系方向</dt>
            <dd>
              <code>{candidate.from.node}</code> → <code>{candidate.to.node}</code>
              {candidate.direction && (
                <>
                  <br />
                  一般概念 <code>{candidate.direction.general}</code> → 特殊概念 <code>{candidate.direction.special}</code>
                  <br />
                  <span className="muted">证据证明的是「特殊 ⇒ 一般」；反向只作为读法，不重复产生第二份证据。</span>
                </>
              )}
            </dd>
          </div>

          <div>
            <dt>精确条件（共同输入）</dt>
            <dd>
              {inputs.length === 0
                ? <span className="muted">没有附加条件：这条候选在给定背景下是无条件的蕴含。</span>
                : (
                  <>
                    {joint && (
                      <p className="review-joint-warning">
                        这是一条<strong>联合推导</strong>：下面 {inputs.length} 项输入必须<strong>一起</strong>成立。
                        请勿把这条连线读成「{candidate.from.node} 单独蕴含 {candidate.to.node}」。
                      </p>
                    )}
                    <ul className="review-conditions">
                      {inputs.map((input) => (
                        <li key={input.id}>
                          <code>{input.id}</code>
                          <span>{pending(input.readable).pending ? <span className="muted">读法待补充</span> : input.readable}</span>
                          {input.source && <code className="review-cond-source">{input.source}</code>}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
            </dd>
          </div>

          <div>
            <dt>概括理由</dt>
            <dd>{reason.pending ? <span className="muted">待补充：这次运行没有给出概括理由。</span> : reason.text}</dd>
          </div>

          <div>
            <dt>证据范围</dt>
            <dd>
              {candidate.math.scope || <span className="muted">待补充：候选没有给出范围。</span>}
              {candidate.run.reason && <><br /><span className="muted">运行理由：{candidate.run.reason}</span></>}
              {candidate.evidence?.scope && <><br /><span className="muted">证据范围：{candidate.evidence.scope}</span></>}
            </dd>
          </div>

          {candidate.goal && (
            <div>
              <dt>实际证明的目标</dt>
              <dd>
                <code>{candidate.goal.source}</code>
                {candidate.goal.hash && <><br /><span className="muted">目标哈希：<code>{candidate.goal.hash}</code></span></>}
              </dd>
            </div>
          )}

          {candidate.evidence && (
            <div>
              <dt>证明详情</dt>
              <dd>
                <strong>{candidate.evidence.title || candidate.evidence.id}</strong>
                <StatusBadge status={candidate.evidence.status} />
                <StatusBadge status={candidate.evidence.checkStatus} title={`证书检查：${candidate.evidence.checkStatus}`} />
                <br />
                <span className="muted">
                  检查器：<code>{candidate.evidence.checker ?? '（未返回）'}</code>
                  {' · '}
                  检查器本身是否获形式验证：{candidate.evidence.checkerVerified ? '是' : '否（首版恒为否）'}
                </span>
                {candidate.evidence.certificate && <><br /><span className="muted">证书：<code>{candidate.evidence.certificate}</code></span></>}
                {candidate.evidence.openAssumptions.length > 0 && (
                  <p className="assumptions">开放假设：{candidate.evidence.openAssumptions.join('；')}</p>
                )}
                {candidate.evidence.obligations.length > 0 && (
                  <p className="obligations">仍缺：{candidate.evidence.obligations.join('；')}</p>
                )}
              </dd>
            </div>
          )}

          {candidate.counterexample && (
            <div>
              <dt>反例详情</dt>
              <dd>
                预置有限对象 <code>{candidate.counterexample.model}</code>
                {candidate.counterexample.note && <><br />{candidate.counterexample.note}</>}
                <br />
                <span className="muted">赋值：</span>
                <pre className="review-assignment">{JSON.stringify(candidate.counterexample.assignment, null, 2)}</pre>
                <span className="muted">
                  边界：这只反驳「该背景下的这条蕴含」，不宣称推翻实数或流形中的数学结论；
                  有限样本也不冒充完整模型。
                </span>
              </dd>
            </div>
          )}

          <div>
            <dt>重放</dt>
            <dd>
              {candidate.replay
                ? <span>上次重放：{candidate.replay.status} · {candidate.replay.at ? new Date(candidate.replay.at).toLocaleString('zh-CN') : '（未返回时间）'} · {candidate.replay.durationMs} ms</span>
                : <span className="muted">这次候选还没有重放过。重放会重新生成目标并重跑检查器，不是把上次的结论再念一遍。</span>}
              {replayRecord && (
                isReplayError(replayRecord)
                  ? <p className="error">重放失败：{replayRecord.error}</p>
                  : (
                    <p className={replayRecord.ok ? 'notice' : 'error'}>
                      重放结果：{replayRecord.ok ? '通过' : '未通过'}
                      {replayRecord.checkStatus ? `（检查器状态 ${replayRecord.checkStatus}）` : ''}
                      {replayRecord.durationMs !== null ? ` · ${replayRecord.durationMs} ms` : ''}
                      {replayRecord.problems.length > 0 && <><br />问题：{replayRecord.problems.join('；')}</>}
                      {replayRecord.note && <><br /><span className="muted">{replayRecord.note}</span></>}
                    </p>
                  )
              )}
              <button type="button" className="button small" disabled={replaying} onClick={() => onReplay([candidate.id])}>重放这一条</button>
            </dd>
          </div>

          {candidate.problems.length > 0 && (
            <div>
              <dt>形状问题</dt>
              <dd>
                <ul>{candidate.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
                <span className="muted">这些是协议形状对不上，不是数学结论；出现形状问题时该候选按保守方向处理。</span>
              </dd>
            </div>
          )}
        </dl>

        <div className="review-actions">
          <button
            type="button"
            className="button small primary"
            disabled={candidate.math.status !== 'verified' || decision === 'accepted'}
            title={candidate.math.status === 'verified' ? '采纳这条已验证关系' : '只有已通过检查的候选可以被采纳'}
            onClick={() => onDecide(candidate.id, 'accepted')}
          >
            采纳
          </button>
          <button type="button" className="button small" disabled={decision === 'dismissed'} onClick={() => onDecide(candidate.id, 'dismissed')}>
            驳回
          </button>
          <button type="button" className="link-button" disabled={decision === null} onClick={() => onDecide(candidate.id, null)}>
            撤销审阅
          </button>
          {candidate.math.status !== 'verified' && (
            <span className="muted">
              {MATH_JUDGMENT_LABEL[candidate.math.status]}的候选不能入库：{MATH_JUDGMENT_BOUNDARY[candidate.math.status]}
            </span>
          )}
        </div>
      </details>
    </li>
  );
}
