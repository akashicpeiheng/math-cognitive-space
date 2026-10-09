import { useI18n } from '../i18n';
import { StatusBadge } from './StatusBadge';
import {
  MATH_JUDGMENT_MARK, MATH_JUDGMENT_TONE, groupByJointInputs, groupCandidates,
  isJointDerivation, jointInputs, mathJudgmentBoundary, mathJudgmentLabel, pending,
  relationKindLabel, reviewStatusLabel, runStatusLabel,
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
 *
 * 双语（2026-10）：面板自己的文案成对写在下面 `COPY`；显示词表（数学判断、运行状态、审阅状态、
 * 关系种类、边界说明）**只有一份**，在 `authoring.ts` 里成对给出，按语种由 `locale` 参数取。
 * 中文一侧逐字保留：`tests/authoring-page.mjs` 断言展开一条候选能看到「精确条件」与「重放」，
 * 并点「采纳」按钮。
 */
/* ========================================================================== */

const COPY = {
  zh: {
    heading: '审阅结果',
    candidateCount: (count: number) => `${count} 条候选`,
    empty: '还没有运行结果。先在上一步启动一次自动发现。',
    hint: (
      <>
        这一节是<strong>审阅视图</strong>：已反驳与未决项只在这里出现，不会被画进网络预览。
        采纳只对「已通过检查」的候选开放——其余两档可以被驳回，但不能被采纳。
      </>
    ),
    excludedLead: (count: number) => `服务端判定「不入库」的有 ${count} 条`,
    excludedNote: '这不是系统出错，也不是命题不成立：这类候选（例如端点只存在于登记表里的**概念锚点**）在发布模型里没有位置。它们不阻断其余内容入库，也已经从「本次入库范围」里移除。',
    noReason: '（服务端未给出原因）',
    runId: (id: string) => `运行 ${id}`,
    polling: '后台运行中，页面可以继续操作',
    facts: {
      candidates: '候选',
      candidateDetail: (count: number, nodes: number) => `${count} 条（覆盖 ${nodes} 个节点）`,
      distribution: '判断分布',
      distributionDetail: (verified: number, refuted: number, undecided: number) => `已验证 ${verified} · 已反驳 ${refuted} · 未决 ${undecided}`,
      unprocessed: '未处理',
      unprocessedDetail: (count: number) => `${count} 条`,
      unprocessedOverflow: '（超出候选上限，已完成结果保留）',
      duration: '耗时',
      budget: '预算',
      budgetDetail: (budget: { maxCandidates: number; perCandidateMs: number; totalMs: number; depth: number; maxStates: number }) => `候选上限 ${budget.maxCandidates} · 单候选 ${budget.perCandidateMs} ms · 整批 ${budget.totalMs} ms · 深度 ${budget.depth} · 状态上限 ${budget.maxStates}`,
      ontology: '背景 / 本体',
      notReturned: '（未返回）',
    },
    interrupted: '任务被中断（服务重启）：已核验的结果保留，中断不等于数学反驳。',
    runFailed: '任务执行出错；出错不是数学判断，候选的数学状态仍是「未决」。',
    noCandidates: '这次运行没有产生候选。没有候选不等于「这些概念之间没有关系」——只表示在本次背景、预算与首版证明能力（§4）之内没有找到可判的东西。',
    groupCount: (count: number) => `${count} 条`,
    groupEmpty: {
      verified: '本次没有通过检查的候选。',
      refuted: '本次没有已反驳项；「没有反例」不等于命题为真。',
      undecided: '本次没有未决项。',
    },
    jointGroup: (edges: number, inputs: number) => `联合推导组：${edges} 条连线共用同一组 ${inputs} 项输入`,
    jointDetail: (inputs: string) => `（${inputs}）——它们不是彼此独立的蕴含，缺任何一项都不成立。`,
    replaying: '重放中…',
    replayAll: (count: number) => `重放全部已验证候选（${count} 条）`,
    replayNote: <>重放从<strong>当前</strong>本体快照重新生成目标并重跑检查器；相关输入变了，旧结果即失效。</>,
    jointBadge: (count: number) => `联合 ${count} 项输入`,
    singleBadge: '无附加条件',
    evidenceTitle: (status: string) => `证据等级：${status}`,
    excludedBadge: '不在入库范围',
    excludedInline: (code: string) => <>服务端判定这条<strong>不入库</strong>（{code}）：</>,
    excludedBoundary: '这不是系统出错，也不是命题不成立；它不影响本次其余内容入库。采纳/驳回仍可记录你的审阅意见。',
    detailsSummary: '展开：方向、精确条件、理由、证据范围、证明或反例、重放',
    direction: '关系方向',
    generalToSpecial: (general: string, special: string) => <>一般概念 <code>{general}</code> → 特殊概念 <code>{special}</code></>,
    directionNote: '证据证明的是「特殊 ⇒ 一般」；反向只作为读法，不重复产生第二份证据。',
    conditions: '精确条件（共同输入）',
    noConditions: '没有附加条件：这条候选在给定背景下是无条件的蕴含。',
    jointWarning: (count: number, from: string, to: string) => (
      <>这是一条<strong>联合推导</strong>：下面 {count} 项输入必须<strong>一起</strong>成立。
        请勿把这条连线读成「{from} 单独蕴含 {to}」。</>
    ),
    readablePending: '读法待补充',
    reason: '概括理由',
    reasonPending: '待补充：这次运行没有给出概括理由。',
    scope: '证据范围',
    scopePending: '待补充：候选没有给出范围。',
    runReason: '运行理由：',
    evidenceScope: '证据范围：',
    proofGoal: '实际证明的目标',
    goalHash: '目标哈希：',
    proofDetail: '证明详情',
    checkerStatus: (status: string) => `证书检查：${status}`,
    checker: '检查器：',
    checkerVerified: '检查器本身是否获形式验证：',
    yes: '是',
    no: '否（首版恒为否）',
    certificate: '证书：',
    openAssumptions: '开放假设：',
    obligations: '仍缺：',
    counterexample: '反例详情',
    counterexampleModel: (model: string) => <>预置有限对象 <code>{model}</code></>,
    assignment: '赋值：',
    counterexampleBoundary: '边界：这只反驳「该背景下的这条蕴含」，不宣称推翻实数或流形中的数学结论；有限样本也不冒充完整模型。',
    replay: '重放',
    lastReplay: (status: string, at: string, durationMs: number) => <>上次重放：{status} · {at} · {durationMs} ms</>,
    timeNotReturned: '（未返回时间）',
    neverReplayed: '这次候选还没有重放过。重放会重新生成目标并重跑检查器，不是把上次的结论再念一遍。',
    replayFailed: '重放失败：',
    replayResult: '重放结果：',
    replayPassed: '通过',
    replayFailedShort: '未通过',
    replayCheckStatus: (status: string) => `（检查器状态 ${status}）`,
    replayProblems: '问题：',
    replayThis: '重放这一条',
    shapeProblems: '形状问题',
    shapeNote: '这些是协议形状对不上，不是数学结论；出现形状问题时该候选按保守方向处理。',
    acceptTitle: '采纳这条已验证关系',
    acceptDisabledTitle: '只有已通过检查的候选可以被采纳',
    accept: '采纳',
    dismiss: '驳回',
    undo: '撤销审阅',
    cannotPublish: (label: string, boundary: string) => <>{label}的候选不能入库：{boundary}</>,
  },
  en: {
    heading: 'Review results',
    candidateCount: (count: number) => `${count} candidate${count === 1 ? '' : 's'}`,
    empty: 'No run results yet. Start a discovery run in the previous step.',
    hint: (
      <>
        This section is the <strong>review view</strong>: refuted and undecided items appear only here and are
        never drawn into the network preview. Accepting is open only to “check passed” candidates — the other
        two groups can be dismissed, but not accepted.
      </>
    ),
    excludedLead: (count: number) => `${count} candidate${count === 1 ? '' : 's'} judged “not publishable” by the server`,
    excludedNote: 'This is not a system error and not a false claim: such candidates (for example concept anchors whose endpoints exist only in the registry) have no place in the publication model. They do not block the rest from being published, and they have been removed from “this publication’s scope”.',
    noReason: '(the server gave no reason)',
    runId: (id: string) => `Run ${id}`,
    polling: 'Running in the background; you can keep working on the page',
    facts: {
      candidates: 'Candidates',
      candidateDetail: (count: number, nodes: number) => `${count} (covering ${nodes} nodes)`,
      distribution: 'Judgment split',
      distributionDetail: (verified: number, refuted: number, undecided: number) => `verified ${verified} · refuted ${refuted} · undecided ${undecided}`,
      unprocessed: 'Unprocessed',
      unprocessedDetail: (count: number) => `${count}`,
      unprocessedOverflow: '(beyond the candidate limit; completed results are kept)',
      duration: 'Duration',
      budget: 'Budget',
      budgetDetail: (budget: { maxCandidates: number; perCandidateMs: number; totalMs: number; depth: number; maxStates: number }) => `candidate limit ${budget.maxCandidates} · per candidate ${budget.perCandidateMs} ms · whole batch ${budget.totalMs} ms · depth ${budget.depth} · state limit ${budget.maxStates}`,
      ontology: 'Background / ontology',
      notReturned: '(not returned)',
    },
    interrupted: 'The job was interrupted (server restarted): verified results are kept; an interruption is not a mathematical refutation.',
    runFailed: 'The job failed; a failure is not a mathematical judgment, and the candidates’ mathematical status stays “undecided”.',
    noCandidates: 'This run produced no candidates. No candidates does not mean “there is no relation between these concepts” — it only means nothing decidable was found within this background, budget and first-version proving power (§4).',
    groupCount: (count: number) => `${count}`,
    groupEmpty: {
      verified: 'No candidate passed the check in this run.',
      refuted: 'Nothing was refuted in this run; “no counterexample” does not mean the claim is true.',
      undecided: 'Nothing is left undecided in this run.',
    },
    jointGroup: (edges: number, inputs: number) => `Joint derivation group: ${edges} edges share the same ${inputs} inputs`,
    jointDetail: (inputs: string) => ` (${inputs}) — these are not independent implications; if any one input fails, none of them holds.`,
    replaying: 'Replaying…',
    replayAll: (count: number) => `Replay all verified candidates (${count})`,
    replayNote: <>A replay regenerates the goal from the <strong>current</strong> ontology snapshot and reruns the checker; if the relevant inputs changed, the old result is void.</>,
    jointBadge: (count: number) => `joint: ${count} inputs`,
    singleBadge: 'no extra conditions',
    evidenceTitle: (status: string) => `Evidence level: ${status}`,
    excludedBadge: 'outside the publication scope',
    excludedInline: (code: string) => <>The server judged this one <strong>not publishable</strong> ({code}): </>,
    excludedBoundary: 'This is not a system error and not a false claim; it does not block the rest from being published. Accepting or dismissing still records your review opinion.',
    detailsSummary: 'Expand: direction, exact conditions, reason, evidence scope, proof or counterexample, replay',
    direction: 'Relation direction',
    generalToSpecial: (general: string, special: string) => <>General concept <code>{general}</code> → special concept <code>{special}</code></>,
    directionNote: 'The evidence proves “special ⇒ general”; the other direction is only a reading and does not produce a second piece of evidence.',
    conditions: 'Exact conditions (shared inputs)',
    noConditions: 'No extra conditions: in the given background this candidate is an unconditional implication.',
    jointWarning: (count: number, from: string, to: string) => (
      <>This is a <strong>joint derivation</strong>: the {count} inputs below must hold <strong>together</strong>.
        Do not read this edge as “{from} alone implies {to}”.</>
    ),
    readablePending: 'reading pending',
    reason: 'Summary reason',
    reasonPending: 'To be supplied: this run gave no summary reason.',
    scope: 'Evidence scope',
    scopePending: 'To be supplied: the candidate gave no scope.',
    runReason: 'Run reason: ',
    evidenceScope: 'Evidence scope: ',
    proofGoal: 'Goal actually proved',
    goalHash: 'Goal hash: ',
    proofDetail: 'Proof details',
    checkerStatus: (status: string) => `Certificate check: ${status}`,
    checker: 'Checker: ',
    checkerVerified: 'Is the checker itself formally verified? ',
    yes: 'yes',
    no: 'no (always no in the first version)',
    certificate: 'Certificate: ',
    openAssumptions: 'Open assumptions: ',
    obligations: 'Still missing: ',
    counterexample: 'Counterexample details',
    counterexampleModel: (model: string) => <>Predefined finite object <code>{model}</code></>,
    assignment: 'Assignment: ',
    counterexampleBoundary: 'Boundary: this only refutes “this implication in this background”; it does not claim to overturn mathematical results about the reals or manifolds, and a finite sample does not pretend to be a complete model.',
    replay: 'Replay',
    lastReplay: (status: string, at: string, durationMs: number) => <>Last replay: {status} · {at} · {durationMs} ms</>,
    timeNotReturned: '(no time returned)',
    neverReplayed: 'This candidate has not been replayed yet. A replay regenerates the goal and reruns the checker — it does not just repeat the previous conclusion.',
    replayFailed: 'Replay failed: ',
    replayResult: 'Replay result: ',
    replayPassed: 'passed',
    replayFailedShort: 'did not pass',
    replayCheckStatus: (status: string) => ` (checker status ${status})`,
    replayProblems: 'Problems: ',
    replayThis: 'Replay this one',
    shapeProblems: 'Shape problems',
    shapeNote: 'These are protocol shape mismatches, not mathematical conclusions; when shape problems appear the candidate is handled conservatively.',
    acceptTitle: 'Accept this verified relation',
    acceptDisabledTitle: 'Only candidates that passed the check can be accepted',
    accept: 'Accept',
    dismiss: 'Dismiss',
    undo: 'Undo review',
    cannotPublish: (label: string, boundary: string) => <>A candidate that is {label} cannot be published: {boundary}</>,
  },
} as const;

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
  const { locale, fmtDate } = useI18n();
  const text = COPY[locale];
  const groups = groupCandidates(candidates, locale);
  const kindLabel = (kind: string) => relationKindLabel(kind, locale);
  const judgmentLabel = (status: string) => mathJudgmentLabel(status, locale);
  const runStatusText = (status: string) => runStatusLabel(status, locale);
  const reviewLabel = (status: string) => reviewStatusLabel(status, locale);

  if (!run && candidates.length === 0) {
    return (
      <section className="card review-panel">
        <h2>{text.heading}</h2>
        <p className="muted">{text.empty}</p>
        {runError && <p className="error">{runError}</p>}
      </section>
    );
  }

  const verifiedCandidates = candidates.filter((candidate) => candidate.math.status === 'verified');
  const excludedEntries = Object.entries(exclusionNotes);

  return (
    <section className="card review-panel">
      <h2>{text.heading}<span className="family-count">{text.candidateCount(candidates.length)}</span></h2>
      <p className="hint">{text.hint}</p>
      {excludedEntries.length > 0 && (
        <div className="review-excluded">
          <strong>{text.excludedLead(excludedEntries.length)}</strong>
          <p className="muted">{text.excludedNote}</p>
          <ul>
            {excludedEntries.map(([candidateId, note]) => (
              <li key={candidateId}>
                <code>{candidateId}</code>
                <span className="muted">{note.reasonCode}</span>
                {note.reason || text.noReason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {run && (
        <div className="review-run">
          <div className="review-run-head">
            <strong>{text.runId(run.id)}</strong>
            <span className={`run-status run-${run.status}`} data-status={run.status}>{runStatusText(run.status)}</span>
            {polling && <span className="muted">{text.polling}</span>}
          </div>
          <dl className="facts compact">
            <div><dt>{text.facts.candidates}</dt><dd>{text.facts.candidateDetail(run.stats.candidates, run.stats.coveredNodes)}</dd></div>
            <div><dt>{text.facts.distribution}</dt><dd>{text.facts.distributionDetail(run.stats.verified, run.stats.refuted, run.stats.undecided)}</dd></div>
            <div><dt>{text.facts.unprocessed}</dt><dd>{text.facts.unprocessedDetail(run.stats.unprocessed)}{run.stats.unprocessed > 0 ? text.facts.unprocessedOverflow : ''}</dd></div>
            <div><dt>{text.facts.duration}</dt><dd>{run.stats.durationMs} ms</dd></div>
            <div><dt>{text.facts.budget}</dt><dd>{text.facts.budgetDetail(run.budget)}</dd></div>
            <div><dt>{text.facts.ontology}</dt><dd><code>{run.background || text.facts.notReturned}</code> · {run.ontologyVersion || text.facts.notReturned}</dd></div>
          </dl>
          {run.interrupted && (
            <p className="error">{text.interrupted}</p>
          )}
          {run.status === 'error' && <p className="error">{text.runFailed}</p>}
        </div>
      )}

      {runError && <p className="error">{runError}</p>}

      {candidates.length === 0 && (
        <p className="muted">{text.noCandidates}</p>
      )}

      {groups.map((group) => (
        <div className={`review-group review-${group.tone}`} key={group.status}>
          <div className="review-group-head">
            <span className={`review-mark review-mark-${group.tone}`} aria-hidden="true">{group.mark}</span>
            <h3>{judgmentLabel(group.status)}<span className="family-count">{text.groupCount(group.candidates.length)}</span></h3>
          </div>
          <p className="muted">{mathJudgmentBoundary(group.status, locale)}</p>
          {group.candidates.length === 0 && (
            <p className="muted">{text.groupEmpty[group.status]}</p>
          )}

          {/* 同一组共同输入下的连线成组显示：让「联合推导」一眼看得出来。 */}
          {group.status === 'verified' && group.candidates.length > 0 && (
            <div className="review-joint-groups">
              {groupByJointInputs(group.candidates).filter((joint) => joint.inputs.length > 1).map((joint) => (
                <p className="review-joint-summary" key={joint.key}>
                  <strong>{text.jointGroup(joint.items.length, joint.inputs.length)}</strong>
                  <span className="muted">
                    {text.jointDetail(joint.inputs.map((input) => input.id || input.source).join(' + '))}
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
                kindLabel={kindLabel}
                judgmentLabel={judgmentLabel}
                reviewLabel={reviewLabel}
                fmtDate={fmtDate}
              />
            ))}
          </ul>
        </div>
      ))}

      {verifiedCandidates.length > 0 && (
        <div className="card-actions">
          <button type="button" className="button small" disabled={replaying} onClick={() => onReplay(verifiedCandidates.map((candidate) => candidate.id))}>
            {replaying ? text.replaying : text.replayAll(verifiedCandidates.length)}
          </button>
          <span className="muted">{text.replayNote}</span>
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
  kindLabel: (kind: string) => string;
  judgmentLabel: (status: string) => string;
  reviewLabel: (status: string) => string;
  fmtDate: (value: string | number | Date | null | undefined, options?: Intl.DateTimeFormatOptions) => string;
}) {
  const { candidate, decision, exclusionNote, onDecide, onReplay, replaying, replayRecord, kindLabel, judgmentLabel, reviewLabel, fmtDate } = props;
  const { locale } = useI18n();
  const text = COPY[locale];
  const inputs = jointInputs(candidate);
  const joint = isJointDerivation(candidate);
  const tone = MATH_JUDGMENT_TONE[candidate.math.status];
  const reason = pending(candidate.reason, locale);
  const boundary = mathJudgmentBoundary(candidate.math.status, locale);

  return (
    <li className={`review-item review-${tone}${exclusionNote ? ' review-item-excluded' : ''}`} data-status={candidate.math.status} data-publishable={exclusionNote ? 'false' : 'true'}>
      <div className="review-item-head">
        <span className={`review-mark review-mark-${tone}`} aria-hidden="true">{MATH_JUDGMENT_MARK[candidate.math.status]}</span>
        <span className={`review-status review-status-${tone}`}>{judgmentLabel(candidate.math.status)}</span>
        <span className="review-kind">{kindLabel(candidate.kind)}</span>
        <code className="review-endpoints">{candidate.from.node} → {candidate.to.node}</code>
        {joint
          ? <span className="review-joint-badge">{text.jointBadge(inputs.length)}</span>
          : <span className="review-single-badge">{text.singleBadge}</span>}
        {candidate.evidence && <StatusBadge status={candidate.evidence.status} title={text.evidenceTitle(candidate.evidence.status)} />}
        {/* 「不入库」是一个独立标签：与「不成立」分开，也和"系统出错"分开。 */}
        {exclusionNote && <span className="review-excluded-badge">{text.excludedBadge}</span>}
        {decision && <span className={`review-decision review-decision-${decision}`}>{reviewLabel(decision)}</span>}
      </div>

      {exclusionNote && (
        <p className="review-excluded-note">
          {text.excludedInline(exclusionNote.reasonCode)}{exclusionNote.reason || text.noReason}
          <br />
          <span className="muted">{text.excludedBoundary}</span>
        </p>
      )}

      <details className="review-details">
        <summary>{text.detailsSummary}</summary>

        <dl className="facts compact">
          <div>
            <dt>{text.direction}</dt>
            <dd>
              <code>{candidate.from.node}</code> → <code>{candidate.to.node}</code>
              {candidate.direction && (
                <>
                  <br />
                  {text.generalToSpecial(candidate.direction.general, candidate.direction.special)}
                  <br />
                  <span className="muted">{text.directionNote}</span>
                </>
              )}
            </dd>
          </div>

          <div>
            <dt>{text.conditions}</dt>
            <dd>
              {inputs.length === 0
                ? <span className="muted">{text.noConditions}</span>
                : (
                  <>
                    {joint && (
                      <p className="review-joint-warning">
                        {text.jointWarning(inputs.length, candidate.from.node, candidate.to.node)}
                      </p>
                    )}
                    <ul className="review-conditions">
                      {inputs.map((input) => (
                        <li key={input.id}>
                          <code>{input.id}</code>
                          <span>{pending(input.readable, locale).pending ? <span className="muted">{text.readablePending}</span> : input.readable}</span>
                          {input.source && <code className="review-cond-source">{input.source}</code>}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
            </dd>
          </div>

          <div>
            <dt>{text.reason}</dt>
            <dd>{reason.pending ? <span className="muted">{text.reasonPending}</span> : reason.text}</dd>
          </div>

          <div>
            <dt>{text.scope}</dt>
            <dd>
              {candidate.math.scope || <span className="muted">{text.scopePending}</span>}
              {candidate.run.reason && <><br /><span className="muted">{text.runReason}{candidate.run.reason}</span></>}
              {candidate.evidence?.scope && <><br /><span className="muted">{text.evidenceScope}{candidate.evidence.scope}</span></>}
            </dd>
          </div>

          {candidate.goal && (
            <div>
              <dt>{text.proofGoal}</dt>
              <dd>
                <code>{candidate.goal.source}</code>
                {candidate.goal.hash && <><br /><span className="muted">{text.goalHash}<code>{candidate.goal.hash}</code></span></>}
              </dd>
            </div>
          )}

          {candidate.evidence && (
            <div>
              <dt>{text.proofDetail}</dt>
              <dd>
                <strong>{candidate.evidence.title || candidate.evidence.id}</strong>
                <StatusBadge status={candidate.evidence.status} />
                <StatusBadge status={candidate.evidence.checkStatus} title={text.checkerStatus(candidate.evidence.checkStatus)} />
                <br />
                <span className="muted">
                  {text.checker}<code>{candidate.evidence.checker ?? text.facts.notReturned}</code>
                  {' · '}
                  {text.checkerVerified}{candidate.evidence.checkerVerified ? text.yes : text.no}
                </span>
                {candidate.evidence.certificate && <><br /><span className="muted">{text.certificate}<code>{candidate.evidence.certificate}</code></span></>}
                {candidate.evidence.openAssumptions.length > 0 && (
                  <p className="assumptions">{text.openAssumptions}{candidate.evidence.openAssumptions.join(locale === 'en' ? '; ' : '；')}</p>
                )}
                {candidate.evidence.obligations.length > 0 && (
                  <p className="obligations">{text.obligations}{candidate.evidence.obligations.join(locale === 'en' ? '; ' : '；')}</p>
                )}
              </dd>
            </div>
          )}

          {candidate.counterexample && (
            <div>
              <dt>{text.counterexample}</dt>
              <dd>
                {text.counterexampleModel(candidate.counterexample.model)}
                {candidate.counterexample.note && <><br />{candidate.counterexample.note}</>}
                <br />
                <span className="muted">{text.assignment}</span>
                <pre className="review-assignment">{JSON.stringify(candidate.counterexample.assignment, null, 2)}</pre>
                <span className="muted">{text.counterexampleBoundary}</span>
              </dd>
            </div>
          )}

          <div>
            <dt>{text.replay}</dt>
            <dd>
              {candidate.replay
                ? <span>{text.lastReplay(candidate.replay.status, candidate.replay.at ? fmtDate(candidate.replay.at) : text.timeNotReturned, candidate.replay.durationMs)}</span>
                : <span className="muted">{text.neverReplayed}</span>}
              {replayRecord && (
                isReplayError(replayRecord)
                  ? <p className="error">{text.replayFailed}{replayRecord.error}</p>
                  : (
                    <p className={replayRecord.ok ? 'notice' : 'error'}>
                      {text.replayResult}{replayRecord.ok ? text.replayPassed : text.replayFailedShort}
                      {replayRecord.checkStatus ? text.replayCheckStatus(replayRecord.checkStatus) : ''}
                      {replayRecord.durationMs !== null ? ` · ${replayRecord.durationMs} ms` : ''}
                      {replayRecord.problems.length > 0 && <><br />{text.replayProblems}{replayRecord.problems.join(locale === 'en' ? '; ' : '；')}</>}
                      {replayRecord.note && <><br /><span className="muted">{replayRecord.note}</span></>}
                    </p>
                  )
              )}
              <button type="button" className="button small" disabled={replaying} onClick={() => onReplay([candidate.id])}>{text.replayThis}</button>
            </dd>
          </div>

          {candidate.problems.length > 0 && (
            <div>
              <dt>{text.shapeProblems}</dt>
              <dd>
                <ul>{candidate.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
                <span className="muted">{text.shapeNote}</span>
              </dd>
            </div>
          )}
        </dl>

        <div className="review-actions">
          <button
            type="button"
            className="button small primary"
            disabled={candidate.math.status !== 'verified' || decision === 'accepted'}
            title={candidate.math.status === 'verified' ? text.acceptTitle : text.acceptDisabledTitle}
            onClick={() => onDecide(candidate.id, 'accepted')}
          >
            {text.accept}
          </button>
          <button type="button" className="button small" disabled={decision === 'dismissed'} onClick={() => onDecide(candidate.id, 'dismissed')}>
            {text.dismiss}
          </button>
          <button type="button" className="link-button" disabled={decision === null} onClick={() => onDecide(candidate.id, null)}>
            {text.undo}
          </button>
          {candidate.math.status !== 'verified' && (
            <span className="muted">
              {text.cannotPublish(judgmentLabel(candidate.math.status), boundary)}
            </span>
          )}
        </div>
      </details>
    </li>
  );
}
