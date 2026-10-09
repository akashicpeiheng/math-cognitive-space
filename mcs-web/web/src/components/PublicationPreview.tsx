import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
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
 *
 * 双语（2026-10）：面板自己的文案成对写在下面；`authoring.ts` 的关系种类走临时适配层
 * （见 `RelationReviewPanel.tsx`）。中文逐字保留：`tests/authoring-page.mjs` 断言
 * 「计算服务端差异」按钮、「记为待证（不阻断）」「不在入库范围（不阻断）」两个小标题、
 * 「不是系统出错」以及「确认入库」「已入库：版本 <id>」。
 */

/** 关系种类的显示名（中文表 / 成对表两种形态都兼容）。 */
function useKindLabel() {
  const { locale } = useI18n();
  return (kind: string) => relationKindLabel(kind, locale);
}

const COPY = {
  zh: {
    overlayHeading: '网络预览',
    overlayCount: '只叠加当前草稿与结果',
    overlayNote: '此图只叠加当前草稿与本次结果：公共本体图此刻没有变化；已反驳与未决项不在图上。',
    draftNodeLabel: '（当前草稿）',
    excludedRefuted: (count: number) => <>未画出的已反驳项：<strong>{count}</strong> 条（只在审阅视图出现）</>,
    excludedUndecided: (count: number) => <>未画出的未决项：<strong>{count}</strong> 条（既没证成也没反驳）</>,
    excludedDismissed: (dismissed: number, notIncluded: number) => <>已驳回：<strong>{dismissed}</strong> 条 · 本次未纳入：<strong>{notIncluded}</strong> 条</>,
    excludedPending: (count: number) => <>还没审阅的已验证项：<strong>{count}</strong> 条（未勾选时不会入库）</>,
    jointHeading: '联合推导（在这些节点之间，连线不是各自独立的蕴含）',
    jointItem: (edges: number, inputs: number) => <><strong>{edges} 条连线共用 {inputs} 项输入</strong>：</>,
    jointInvolved: (list: string) => <>涉及：{list}</>,
    includeHeading: '本次入库纳入哪些关系',
    includeCount: (included: number, verified: number) => `${included} / ${verified} 条已验证`,
    includeHint: '可以只采纳一部分已验证关系。没有已验证关系的合法节点也能独立入库——这时它的未证命题保留「待证」状态，不会被写成已成立。',
    includeEmpty: '本次没有已验证关系。节点仍可作为骨架入库：关系清单为空，陈述按「待证」登记。',
    noExtraConditions: '（无附加条件）',
    jointBadge: (count: number) => `联合 ${count} 项输入`,
    evidenceTitle: (status: string) => `证据等级：${status}`,
    excludedBadge: '不在入库范围',
    notAcceptedYet: ' · 尚未在审阅里采纳，勾选即视为采纳',
    excludedInline: (code: string) => `服务端判定不入库（${code}）：`,
    excludedTail: '——不是系统出错，也不影响其余内容入库。',
    noReason: '（服务端未给出原因）',
    backToReview: '回到审阅视图调整采纳',
    diffHeading: '入库前的完整变更清单',
    diffLoading: '正在计算差异…',
    diffCompute: '计算服务端差异（零写入）',
    diffNote: '服务端预览与真正入库共用同一段差异计算；本地预演只用于服务端不可用时自查。',
    previewUnavailableLead: '服务端预览不可用：',
    moduleNotReady: '功能尚未就绪',
    moduleSpecifier: (specifier: string) => ` · 模块 ${specifier}`,
    reasonSuffix: (reason: string) => ` · 原因：${reason}`,
    localRehearsal: <>下面显示的是<strong>本地预演</strong>：由界面按草稿与候选自算，定义与契约一项都不生成，也不代表服务端会接受这次入库。</>,
    noDiff: '还没有差异。点上面的按钮算一次；本地预演会在服务端不可用时自动顶上。',
    commitHeading: '确认入库',
    commitHint: '入库走六步事务：固定清单 → 重放证据并重核假设 → 隔离区合成与检查 → 写不可变内容包 → 单写入锁下原子切换 → 刷新本体快照。任一步失败，原版本继续生效。',
    facts: {
      draft: '草稿',
      notSaved: '尚未保存到服务端',
      draftRevision: '草稿修订',
      none: '（无）',
      ontologyVersion: '本体版本',
      notFetched: '（未取到）',
      decisions: '采纳 / 驳回',
      included: '本次纳入',
      includedDetail: (count: number) => `${count} 条已验证关系`,
      reviewDigest: '审阅摘要',
      reviewDigestNote: '摘要只用于幂等与一致性核对，不是密码学承诺。',
      idempotencyKey: '幂等键',
      idempotencyNote: '同一批内容重复提交会返回同一条版本记录。',
    },
    publishDisabledNoDraft: '入库需要服务端草稿；编写库未就绪时无法入库，本地草稿仍保留',
    publishDisabledUnsaved: '先把本地改动保存到服务端草稿：入库用的是服务端那一份',
    publishTitle: '重新重放证据并写入内容包',
    publishing: '正在入库…',
    publish: '确认入库（新建一条版本记录）',
    unsavedChanges: <>本地改动还没有保存到服务端草稿。入库用的是<strong>服务端那一份</strong>，与屏幕上看到的可能不同，所以这里把入库挡住了——先按「保存到服务端」，再回来确认。</>,
    validationMissing: '这份草稿还没有跑过解析检查（第 2 步「检查表达」）。入库前建议先检查一次：表达式没被解析过时，很多关系判定根本无从进行。',
    validationStale: '最近一次检查之后又改过源码，那份结果已经过期。入库前请回到第 2 步重新检查。',
    validationPassed: '当前源码已通过解析与类型检查（通过只说明表达可读、良类型，不表示命题成立）。',
    validationFailed: '当前源码未通过解析检查；请先修好表达再入库。',
    noServerDraft: '还不能入库：这次编写只存在于浏览器本地草稿里。入库请求必须带服务端草稿 id 与修订号（乐观锁），否则「预期修订 + 本体版本」这套保护就失效了。',
    publishUnavailableLead: '入库未能执行：',
    publishUnavailableTail: '这不是「入库失败所以内容有问题」——是入库这件事本身还没法做；公共本体没有变化。',
    publishFailed: '入库失败：',
    published: (revisionId: string, ontologyVersion: string) => <>已入库：版本 <code>{revisionId}</code>{' · '}本体版本 <code>{ontologyVersion}</code></>,
    notReturnedId: '（服务端未返回 id）',
    notReturned: '（未返回）',
    revisionsHeading: '版本与回滚',
    revisionsCount: (count: number) => `${count} 条版本记录`,
    revisionsHint: <>回滚会<strong>新建</strong>一条 <code>kind:'rollback'</code> 的版本记录，恢复选定历史内容状态；不删除历史包、证据或学习者记录，并同时处理其后依赖新增节点的关系与契约，保证当前公共网络没有悬空引用。</>,
    activeRevision: '当前生效版本：',
    noPackage: '（没有扩展包：公共图还是基础数据）',
    integrityHeading: (count: number) => `本体快照自检报出的待复核项（${count}）`,
    integrityNote: <>失效的自动关系标为待复核，<strong>不作为</strong>当前已认证推导。</>,
    revisionsLoading: '正在读取版本清单…',
    revisionsUnavailableLead: '版本清单不可用：',
    noRevisions: '还没有任何版本记录：这个站点还没有通过本流程入库过内容包。',
    columns: { revision: '版本', kind: '类型', time: '时间', content: '内容', review: '审阅', action: '操作' },
    rollbackFailed: '回滚失败：',
    rollbackDone: (revisionId: string, ontologyVersion: string) => <>回滚完成：新版本 <code>{revisionId}</code>{' · '}本体版本 <code>{ontologyVersion}</code></>,
    buckets: { added: (count: number) => `新增 ${count}`, changed: (count: number) => `变更 ${count}`, removed: (count: number) => `移除 ${count}`, unchanged: (count: number) => `未变 ${count}` },
    serverDiff: '这份差异来自服务端，与真正入库共用同一段计算。',
    localDiff: '这份差异是界面自算的本地预演，不是服务端的承诺。',
    notSealed: <>服务端把这份内容标为<strong>未封口</strong>：有阻断项，现在提交会返回 409（见下面的「阻断项」）。</>,
    sections: { nodes: '节点', relations: '关系', evidence: '证据', definitions: '定义与行动契约' },
    noNodeChanges: '节点清单没有变化。',
    noRelationChanges: '没有已验证关系被纳入；未证命题保留「待证」状态。',
    noEvidenceChanges: '证据清单没有变化。',
    noDefinitionChanges: '（清单里没有新增定义或契约）',
    change: { added: '新增', changed: '变更', removed: '移除', pending: '待证', refuted: '已反驳', excluded: '不入库' },
    statement: '陈述：',
    statementPending: '待补充（未填写形式陈述）——登记为「待证」骨架。',
    candidateRef: ' · 候选 ',
    evidenceRef: ' · 证据 ',
    readablePending: '读法待补充',
    nodeRef: ' · 节点 ',
    coverage: ' · 覆盖 ',
    threeWay: (publishable: number, pendingCount: number, excluded: number) => <>服务端三分类：可入库 <strong>{publishable}</strong> 条 · 记为待证 <strong>{pendingCount}</strong> 条 · 不入库 <strong>{excluded}</strong> 条</>,
    nothingToPublish: '（选中的内容一条也进不了库）',
    pendingHeading: '记为待证（不阻断）',
    pendingHint: <>这些候选<strong>不进入本次变更</strong>，也不会挡住其余内容；它们各自写明原因。「记为待证」不是失败，也不是「已成立的关系」。</>,
    excludedHeading: '不在入库范围（不阻断）',
    excludedHint: <>这类候选**不进公共图**，但**不**影响其余内容入库。它不是系统出错，也不是命题不成立：常见原因是端点只存在于登记表里（概念锚点），发布模型里没有它的位置。</>,
    blockers: '阻断项（提交会返回 409）',
    warnings: '需要看一眼的项',
    steps: '发布事务的六步（服务端下发）',
    unrecognized: <>服务端返回了未识别的差异形状：下面原样列出，<strong>不能</strong>读成「没有变更」。</>,
    diffFooter: (background: string, name: string) => <>草稿背景：<code>{background}</code> · 草稿名称：{name}</>,
    notChosenYet: '（尚未选择）',
    pendingText: '（待补充）',
    overlayAria: '只叠加当前草稿与本次已验证关系的局部网络预览',
    draftNodeSub: '当前草稿（未入库）',
    existingNodeSub: '已登记节点（只读）',
    overlayEmpty: '图上还没有连线：本次没有纳入任何已验证关系。公共本体图同样没有变化。',
    parent: '父版本 ',
    restores: '恢复自 ',
    kindRollback: '回滚',
    kindPublish: '发布',
    summary: (nodes: number, relations: number, evidence: number, definitions: number, contracts: number) => `节点 ${nodes} · 关系 ${relations} · 证据 ${evidence} · 定义 ${definitions} · 契约 ${contracts}`,
    decisionsSummary: (accepted: number, dismissed: number) => `采纳 ${accepted} · 驳回 ${dismissed}`,
    rollbackTo: '回滚到此版本',
    rollbackConfirm: (id: string) => <>确认恢复 <code>{id}</code>？这会新建一条回滚版本记录。</>,
    rollingBack: '正在回滚…',
    confirmRollback: '确认回滚',
  },
  en: {
    overlayHeading: 'Network preview',
    overlayCount: 'overlays only the current draft and results',
    overlayNote: 'This graph overlays only the current draft and this run’s results: the public ontology graph is unchanged right now, and refuted or undecided items are not on it.',
    draftNodeLabel: '(current draft)',
    excludedRefuted: (count: number) => <>Refuted items not drawn: <strong>{count}</strong> (they appear only in the review view)</>,
    excludedUndecided: (count: number) => <>Undecided items not drawn: <strong>{count}</strong> (neither proved nor refuted)</>,
    excludedDismissed: (dismissed: number, notIncluded: number) => <>Dismissed: <strong>{dismissed}</strong> · not included this time: <strong>{notIncluded}</strong></>,
    excludedPending: (count: number) => <>Verified items not reviewed yet: <strong>{count}</strong> (they are not published unless ticked)</>,
    jointHeading: 'Joint derivations (among these nodes the edges are not independent implications)',
    jointItem: (edges: number, inputs: number) => <><strong>{edges} edges share {inputs} inputs</strong>: </>,
    jointInvolved: (list: string) => <>involving: {list}</>,
    includeHeading: 'Which relations go into this publication',
    includeCount: (included: number, verified: number) => `${included} / ${verified} verified`,
    includeHint: 'You may accept only some of the verified relations. A legitimate node with no verified relation can still be published on its own — its unproved claims keep the “to be proved” status and are never written as established.',
    includeEmpty: 'No verified relations this time. The node can still be published as a skeleton: the relation list is empty and the statement is registered as “to be proved”.',
    noExtraConditions: '(no extra conditions)',
    jointBadge: (count: number) => `joint: ${count} inputs`,
    evidenceTitle: (status: string) => `Evidence level: ${status}`,
    excludedBadge: 'outside the publication scope',
    notAcceptedYet: ' · not accepted in the review yet; ticking it counts as accepting',
    excludedInline: (code: string) => `The server judged this not publishable (${code}): `,
    excludedTail: ' — this is not a system error and does not block the rest from being published.',
    noReason: '(the server gave no reason)',
    backToReview: 'Back to the review view to adjust acceptance',
    diffHeading: 'Complete list of changes before publishing',
    diffLoading: 'Computing the diff…',
    diffCompute: 'Compute the server-side diff (zero writes)',
    diffNote: 'The server preview and the actual publication share the same diff computation; the local rehearsal is only for self-checking when the server is unavailable.',
    previewUnavailableLead: 'Server preview unavailable: ',
    moduleNotReady: 'feature not available yet',
    moduleSpecifier: (specifier: string) => ` · module ${specifier}`,
    reasonSuffix: (reason: string) => ` · reason: ${reason}`,
    localRehearsal: <>What follows is a <strong>local rehearsal</strong>: computed by the interface from the draft and the candidates; no definition or contract is generated, and it does not mean the server would accept this publication.</>,
    noDiff: 'No diff yet. Press the button above to compute one; the local rehearsal steps in automatically when the server is unavailable.',
    commitHeading: 'Confirm publication',
    commitHint: 'Publication runs as a six-step transaction: freeze the list → replay evidence and recheck assumptions → compose and check in the quarantine area → write the immutable content package → switch atomically under a single-writer lock → refresh the ontology snapshot. If any step fails, the previous version stays in force.',
    facts: {
      draft: 'Draft',
      notSaved: 'not saved to the server yet',
      draftRevision: 'Draft revision',
      none: '(none)',
      ontologyVersion: 'Ontology version',
      notFetched: '(not fetched)',
      decisions: 'Accepted / dismissed',
      included: 'Included this time',
      includedDetail: (count: number) => `${count} verified relation${count === 1 ? '' : 's'}`,
      reviewDigest: 'Review digest',
      reviewDigestNote: 'The digest is only for idempotency and consistency checks; it is not a cryptographic commitment.',
      idempotencyKey: 'Idempotency key',
      idempotencyNote: 'Submitting the same batch again returns the same revision record.',
    },
    publishDisabledNoDraft: 'Publishing needs a server-side draft; when the authoring store is not available you cannot publish, but the local draft is kept',
    publishDisabledUnsaved: 'Save the local changes to the server draft first: publication uses the server’s copy',
    publishTitle: 'Replay the evidence and write the content package',
    publishing: 'Publishing…',
    publish: 'Confirm publication (creates a new revision record)',
    unsavedChanges: <>The local changes are not saved to the server draft yet. Publication uses the <strong>server’s copy</strong>, which may differ from what is on screen, so publishing is blocked here — press “save to the server” first and come back.</>,
    validationMissing: 'This draft has not been through the parse check (step 2, “check the expression”). It is worth checking once before publishing: when the expression has never been parsed, many relation judgments simply cannot run.',
    validationStale: 'The source was edited after the last check, so that result is out of date. Go back to step 2 and check again before publishing.',
    validationPassed: 'The current source passed the parse and type check (passing only means the expression is readable and well typed; it does not mean the claim holds).',
    validationFailed: 'The current source did not pass the parse check; fix the expression before publishing.',
    noServerDraft: 'Cannot publish yet: this authoring session exists only as a local browser draft. A publication request must carry the server draft id and revision (optimistic locking), otherwise the “expected revision + ontology version” protection is void.',
    publishUnavailableLead: 'Publication could not run: ',
    publishUnavailableTail: 'This is not “the publication failed, so something is wrong with the content” — it is that publishing itself cannot be done yet; the public ontology is unchanged.',
    publishFailed: 'Publication failed: ',
    published: (revisionId: string, ontologyVersion: string) => <>Published: revision <code>{revisionId}</code>{' · '}ontology version <code>{ontologyVersion}</code></>,
    notReturnedId: '(the server returned no id)',
    notReturned: '(not returned)',
    revisionsHeading: 'Revisions and rollback',
    revisionsCount: (count: number) => `${count} revision record${count === 1 ? '' : 's'}`,
    revisionsHint: <>A rollback <strong>creates</strong> a new revision record with <code>kind:'rollback'</code> and restores the selected historical content state; it deletes no historical package, evidence or learner record, and it also handles the relations and contracts of nodes added after it, so the current public network has no dangling references.</>,
    activeRevision: 'Active revision: ',
    noPackage: '(no extension package: the public graph is still the base data)',
    integrityHeading: (count: number) => `Items flagged for re-check by the ontology snapshot self-test (${count})`,
    integrityNote: <>Stale automatic relations are marked for re-check and are <strong>not</strong> treated as currently certified derivations.</>,
    revisionsLoading: 'Reading the revision list…',
    revisionsUnavailableLead: 'Revision list unavailable: ',
    noRevisions: 'No revision records yet: this site has never published a content package through this flow.',
    columns: { revision: 'Revision', kind: 'Kind', time: 'Time', content: 'Content', review: 'Review', action: 'Actions' },
    rollbackFailed: 'Rollback failed: ',
    rollbackDone: (revisionId: string, ontologyVersion: string) => <>Rollback done: new revision <code>{revisionId}</code>{' · '}ontology version <code>{ontologyVersion}</code></>,
    buckets: { added: (count: number) => `added ${count}`, changed: (count: number) => `changed ${count}`, removed: (count: number) => `removed ${count}`, unchanged: (count: number) => `unchanged ${count}` },
    serverDiff: 'This diff comes from the server and shares the same computation as the actual publication.',
    localDiff: 'This diff is a local rehearsal computed by the interface; it is not a promise from the server.',
    notSealed: <>The server marks this content as <strong>not sealed</strong>: there are blockers, and submitting now returns 409 (see “blockers” below).</>,
    sections: { nodes: 'Nodes', relations: 'Relations', evidence: 'Evidence', definitions: 'Definitions and action contracts' },
    noNodeChanges: 'The node list is unchanged.',
    noRelationChanges: 'No verified relation was included; unproved claims keep the “to be proved” status.',
    noEvidenceChanges: 'The evidence list is unchanged.',
    noDefinitionChanges: '(no new definitions or contracts in the list)',
    change: { added: 'added', changed: 'changed', removed: 'removed', pending: 'to be proved', refuted: 'refuted', excluded: 'not published' },
    statement: 'Statement: ',
    statementPending: 'to be supplied (no formal statement filled in) — registered as a “to be proved” skeleton.',
    candidateRef: ' · candidate ',
    evidenceRef: ' · evidence ',
    readablePending: 'reading pending',
    nodeRef: ' · node ',
    coverage: ' · covering ',
    threeWay: (publishable: number, pendingCount: number, excluded: number) => <>Server-side three-way split: publishable <strong>{publishable}</strong> · to be proved <strong>{pendingCount}</strong> · not published <strong>{excluded}</strong></>,
    nothingToPublish: '(none of the selected content can be published)',
    pendingHeading: 'Marked “to be proved” (not blocking)',
    pendingHint: <>These candidates <strong>do not enter this change</strong> and do not block the rest; each states its own reason. “To be proved” is neither a failure nor “an established relation”.</>,
    excludedHeading: 'Outside the publication scope (not blocking)',
    excludedHint: 'These candidates do **not** enter the public graph, but they do **not** block the rest from being published. This is not a system error and not a false claim: the usual cause is that an endpoint exists only in the registry (a concept anchor), so the publication model has no place for it.',
    blockers: 'Blockers (submitting returns 409)',
    warnings: 'Worth a look',
    steps: 'The six steps of the publication transaction (sent by the server)',
    unrecognized: <>The server returned an unrecognised diff shape: it is listed verbatim below and <strong>must not</strong> be read as “no changes”.</>,
    diffFooter: (background: string, name: string) => <>Draft background: <code>{background}</code> · draft name: {name}</>,
    notChosenYet: '(not chosen yet)',
    pendingText: '(to be supplied)',
    overlayAria: 'Local network preview overlaying only the current draft and this run’s verified relations',
    draftNodeSub: 'current draft (not published)',
    existingNodeSub: 'registered node (read-only)',
    overlayEmpty: 'No edges on the graph yet: no verified relation was included this time. The public ontology graph is unchanged too.',
    parent: 'parent ',
    restores: 'restores ',
    kindRollback: 'rollback',
    kindPublish: 'publish',
    summary: (nodes: number, relations: number, evidence: number, definitions: number, contracts: number) => `nodes ${nodes} · relations ${relations} · evidence ${evidence} · definitions ${definitions} · contracts ${contracts}`,
    decisionsSummary: (accepted: number, dismissed: number) => `accepted ${accepted} · dismissed ${dismissed}`,
    rollbackTo: 'Roll back to this revision',
    rollbackConfirm: (id: string) => <>Restore <code>{id}</code>? This creates a new rollback revision record.</>,
    rollingBack: 'Rolling back…',
    confirmRollback: 'Confirm rollback',
  },
} as const;

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

  const { t, locale } = useI18n();
  const text = COPY[locale];
  const kindLabel = useKindLabel();

  const verified = candidates.filter((candidate) => candidate.math.status === 'verified');
  /* 草稿节点的占位名与图下那句说明现在由 `authoring.ts` 按 `locale` 给出（词表只有一份）。 */
  const overlay = useMemo(
    () => buildOverlay({ fields, nodeRef, candidates, decisions, includeIds, locale }),
    [fields, nodeRef, candidates, decisions, includeIds, locale],
  );
  const pendingStatement = pending(fields.statement, locale);

  return (
    <>
      {part === 'preview' && (
        <>
          <section className="card pub-overlay">
            <h2>{text.overlayHeading}<span className="family-count">{text.overlayCount}</span></h2>
            <p className="hint">{overlay.note}</p>
            <OverlayGraph overlay={overlay} text={{ aria: text.overlayAria, draft: text.draftNodeSub, existing: text.existingNodeSub, empty: text.overlayEmpty }} kindLabel={kindLabel} jointText={(count) => text.jointBadge(count)} />
            <ul className="pub-excluded">
              <li>{text.excludedRefuted(overlay.excluded.refuted)}</li>
              <li>{text.excludedUndecided(overlay.excluded.undecided)}</li>
              <li>{text.excludedDismissed(overlay.excluded.dismissed, overlay.excluded.notIncluded)}</li>
              <li>{text.excludedPending(overlay.excluded.pendingDecision)}</li>
            </ul>
            {overlay.groups.some((group) => group.inputs.length > 1) && (
              <div className="pub-joint">
                <h3>{text.jointHeading}</h3>
                <ul>
                  {overlay.groups.filter((group) => group.inputs.length > 1).map((group) => (
                    <li key={group.key}>
                      {text.jointItem(group.edges.length, group.inputs.length)}
                      {group.inputs.map((input) => (
                        <span key={input.id} className="pub-joint-input">
                          <code>{input.id}</code>
                          {pending(input.readable, locale).pending ? <em className="muted">{text.readablePending}</em> : input.readable}
                          {input.source && <code className="pub-joint-source">{input.source}</code>}
                        </span>
                      ))}
                      <span className="muted">
                        {text.jointInvolved(group.edges.map((edge) => `${edge.from} → ${edge.to}`).join(locale === 'en' ? '; ' : '；'))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="card pub-selection">
            <h2>{text.includeHeading}<span className="family-count">{text.includeCount(includeIds.length, verified.length)}</span></h2>
            <p className="hint">{text.includeHint}</p>
            {verified.length === 0 && (
              <p className="muted">{text.includeEmpty}</p>
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
                        {kindLabel(candidate.kind)}{locale === 'en' ? ': ' : '：'}<code>{candidate.from.node} → {candidate.to.node}</code>
                        {isJointDerivation(candidate)
                          ? <span className="pub-joint-badge">{text.jointBadge(inputs.length)}</span>
                          : <span className="muted">{text.noExtraConditions}</span>}
                        {exclusion
                          ? <span className="review-excluded-badge">{text.excludedBadge}</span>
                          : decisions[candidate.id] !== 'accepted' && <span className="muted">{text.notAcceptedYet}</span>}
                      </span>
                    </label>
                    {exclusion && (
                      <p className="muted">
                        {text.excludedInline(exclusion.reasonCode)}{exclusion.reason || text.noReason}{text.excludedTail}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="card-actions">
              <button type="button" className="button" onClick={onGoReview}>{text.backToReview}</button>
            </div>
          </section>

          <section className="card pub-diff">
            <h2>{text.diffHeading}</h2>
            <div className="card-actions">
              <button type="button" className="button primary" disabled={previewLoading} onClick={onPreview}>
                {previewLoading ? text.diffLoading : text.diffCompute}
              </button>
              <span className="muted">{text.diffNote}</span>
            </div>

            {previewUnavailable && (
              <p className="error">
                {text.previewUnavailableLead}{previewUnavailable.kind === 'module' ? text.moduleNotReady : previewUnavailable.message}
                {previewUnavailable.specifier ? text.moduleSpecifier(previewUnavailable.specifier) : ''}
                {previewUnavailable.reason ? text.reasonSuffix(previewUnavailable.reason) : ''}
                <br />
                {text.localRehearsal}
              </p>
            )}
            {previewError && !previewUnavailable && <p className="error">{previewError}</p>}

            {preview && (
              <DiffView diff={preview} fields={fields} pendingStatement={pendingStatement} candidates={candidates} />
            )}
            {!preview && !previewLoading && (
              <p className="muted">{text.noDiff}</p>
            )}
          </section>
        </>
      )}

      {part === 'publish' && (
        <>
          <section className="card pub-commit">
            <h2>{text.commitHeading}</h2>
            <p className="hint">{text.commitHint}</p>
            <dl className="facts compact">
              <div><dt>{text.facts.draft}</dt><dd>{draftId ? <code>{draftId}</code> : <span className="muted">{text.facts.notSaved}</span>}</dd></div>
              <div><dt>{text.facts.draftRevision}</dt><dd>{draftRevision ?? <span className="muted">{text.facts.none}</span>}</dd></div>
              <div><dt>{text.facts.ontologyVersion}</dt><dd>{ontologyVersion ? <code>{ontologyVersion}</code> : <span className="muted">{text.facts.notFetched}</span>}</dd></div>
              <div><dt>{text.facts.decisions}</dt><dd>{acceptedCount} / {dismissedCount}</dd></div>
              <div><dt>{text.facts.included}</dt><dd>{text.facts.includedDetail(includeIds.length)}</dd></div>
              <div><dt>{text.facts.reviewDigest}</dt><dd><code>{reviewDigestValue}</code><br /><span className="muted">{text.facts.reviewDigestNote}</span></dd></div>
              <div><dt>{text.facts.idempotencyKey}</dt><dd><code>{idempotencyKey}</code><br /><span className="muted">{text.facts.idempotencyNote}</span></dd></div>
            </dl>

            <div className="card-actions">
              <button
                type="button"
                className="button primary"
                disabled={publishing || !draftId || unsavedChanges}
                title={!draftId ? text.publishDisabledNoDraft : unsavedChanges ? text.publishDisabledUnsaved : text.publishTitle}
                onClick={onPublish}
              >
                {publishing ? text.publishing : text.publish}
              </button>
            </div>

            {unsavedChanges && (
              <p className="error">{text.unsavedChanges}</p>
            )}

            {/*
              入库前必须能一眼看出「这份表达检查过没有、结果是不是过期的」。
              三种情况分开写，不用一个含糊的黄色提示糊过去。
            */}
            {!validation && (
              <p className="error">{text.validationMissing}</p>
            )}
            {validation && validation.stale && (
              <p className="error">{text.validationStale}</p>
            )}
            {validation && !validation.stale && validation.ok && (
              <p className="notice">{text.validationPassed}</p>
            )}
            {validation && !validation.stale && !validation.ok && (
              <p className="error">{text.validationFailed}</p>
            )}
            {!draftId && (
              <p className="error">{text.noServerDraft}</p>
            )}
            {publishUnavailable && (
              <p className="error">
                {text.publishUnavailableLead}{publishUnavailable.kind === 'module' ? text.moduleNotReady : publishUnavailable.message}
                {publishUnavailable.specifier ? text.moduleSpecifier(publishUnavailable.specifier) : ''}
                {publishUnavailable.reason ? text.reasonSuffix(publishUnavailable.reason) : ''}
                <br />{text.publishUnavailableTail}
              </p>
            )}
            {publishError && !publishUnavailable && <p className="error">{text.publishFailed}{publishError}</p>}
            {publishOutcome && (
              <div className="pub-outcome">
                <p className="notice">
                  {text.published(publishOutcome.revisionId ?? text.notReturnedId, publishOutcome.ontologyVersion ?? text.notReturned)}
                </p>
                <p className="muted">{publishOutcome.summary}</p>
              </div>
            )}
          </section>

          <section className="card pub-revisions">
            <h2>{text.revisionsHeading}<span className="family-count">{text.revisionsCount(revisions.length)}</span></h2>
            <p className="hint">{text.revisionsHint}</p>
            <p className="muted">
              {text.activeRevision}{activeRevision ? <code>{activeRevision}</code> : text.noPackage}
            </p>
            {revisionIntegrity.length > 0 && (
              <div className="pub-boundary-box">
                <strong>{text.integrityHeading(revisionIntegrity.length)}</strong>
                <p className="muted">{text.integrityNote}</p>
                <ul className="pub-boundary">{revisionIntegrity.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            )}
            {revisionsLoading && <p className="muted">{text.revisionsLoading}</p>}
            {revisionsUnavailable && (
              <p className="error">
                {text.revisionsUnavailableLead}{revisionsUnavailable.kind === 'module' ? text.moduleNotReady : revisionsUnavailable.message}
                {revisionsUnavailable.specifier ? text.moduleSpecifier(revisionsUnavailable.specifier) : ''}
                {revisionsUnavailable.reason ? text.reasonSuffix(revisionsUnavailable.reason) : ''}
              </p>
            )}
            {revisionsProblems.map((problem) => <p className="muted" key={problem}>{problem}</p>)}
            {!revisionsLoading && !revisionsUnavailable && revisions.length === 0 && (
              <p className="muted">{text.noRevisions}</p>
            )}
            {revisions.length > 0 && (
              <div className="pub-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">{text.columns.revision}</th>
                      <th scope="col">{text.columns.kind}</th>
                      <th scope="col">{text.columns.time}</th>
                      <th scope="col">{text.columns.content}</th>
                      <th scope="col">{text.columns.review}</th>
                      <th scope="col">{text.columns.action}</th>
                    </tr>
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
            {rollbackError && <p className="error">{text.rollbackFailed}{rollbackError}</p>}
            {rollbackOutcome && (
              <p className="notice">
                {text.rollbackDone(rollbackOutcome.revisionId ?? text.notReturned, rollbackOutcome.ontologyVersion ?? text.notReturned)}
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
  const { locale } = useI18n();
  const text = COPY[locale];
  return (
    <span className="pub-bucket-summary">
      <span className="pub-bucket pub-bucket-added">{text.buckets.added(added)}</span>
      <span className="pub-bucket">{text.buckets.changed(changed)}</span>
      <span className="pub-bucket">{text.buckets.removed(removed)}</span>
      <span className="pub-bucket muted">{text.buckets.unchanged(unchanged)}</span>
    </span>
  );
}

function DiffView({ diff, fields, pendingStatement, candidates }: {
  diff: PublicationDiff;
  fields: DraftFields;
  pendingStatement: { text: string; pending: boolean };
  candidates: CandidateView[];
}) {
  const { locale } = useI18n();
  const text = COPY[locale];
  const kindLabel = useKindLabel();
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const jointFor = (candidateId: string | null) => {
    const candidate = candidateId ? candidateById.get(candidateId) : undefined;
    return candidate ? jointInputs(candidate) : [];
  };
  const listJoin = locale === 'en' ? ', ' : '、';

  return (
    <div className="pub-diff-body">
      <p className={diff.origin === 'server' ? 'notice' : 'error'}>
        {diff.origin === 'server' ? text.serverDiff : text.localDiff}
      </p>
      {diff.origin === 'server' && !diff.sealed && (
        <p className="error">{text.notSealed}</p>
      )}

      <h3>{text.sections.nodes}<BucketSummary added={diff.nodes.added.length} changed={diff.nodes.changed.length} removed={diff.nodes.removed.length} unchanged={diff.nodes.unchanged} /></h3>
      {diff.nodes.added.length + diff.nodes.changed.length + diff.nodes.removed.length === 0
        ? <p className="muted">{text.noNodeChanges}</p>
        : (
          <ul className="pub-list">
            {diff.nodes.added.map((node) => (
              <li key={`add-${node.id}`}>
                <span className="pub-change pub-change-added">{text.change.added}</span>
                <code>{node.id}</code> <strong>{node.title}</strong>
                {node.construct && <span className="muted"> · {node.construct}</span>}
                {node.note && <p className="muted">{node.note}</p>}
                <p className="muted">
                  {text.statement}{pendingStatement.pending
                    ? <span>{text.statementPending}</span>
                    : <code className="pub-statement">{pendingStatement.text.split('\n')[0]}</code>}
                </p>
              </li>
            ))}
            {diff.nodes.changed.map((node) => (
              <li key={`chg-${node.id}`}><span className="pub-change">{text.change.changed}</span><code>{node.id}</code> {node.title}</li>
            ))}
            {diff.nodes.removed.map((node) => (
              <li key={`rm-${node.id}`}><span className="pub-change pub-change-removed">{text.change.removed}</span><code>{node.id}</code> {node.title}</li>
            ))}
          </ul>
        )}

      <h3>{text.sections.relations}<BucketSummary added={diff.relations.added.length} changed={diff.relations.changed.length} removed={diff.relations.removed.length} unchanged={diff.relations.unchanged} /></h3>
      {diff.relations.added.length === 0
        ? <p className="muted">{text.noRelationChanges}</p>
        : (
          <ul className="pub-list">
            {diff.relations.added.map((relation) => {
              const inputs = jointFor(relation.candidateId);
              return (
                <li key={relation.id}>
                  <span className="pub-change pub-change-added">{text.change.added}</span>
                  <span className="review-kind">{kindLabel(String(relation.kind))}</span>
                  <code>{relation.from} → {relation.to}</code>
                  {isJointDerivation({ conditions: inputs }) && <span className="pub-joint-badge">{text.jointBadge(inputs.length)}</span>}
                  {relation.verificationStatus && <StatusBadge status={relation.verificationStatus} />}
                  {relation.candidateId && <span className="muted">{text.candidateRef}<code>{relation.candidateId}</code></span>}
                  {relation.evidenceRef && <span className="muted">{text.evidenceRef}<code>{relation.evidenceRef}</code></span>}
                  {inputs.length > 0 && (
                    <ul className="pub-relation-inputs">
                      {inputs.map((input) => (
                        <li key={input.id}>
                          <code>{input.id}</code>
                          {pending(input.readable, locale).pending ? <span className="muted">{text.readablePending}</span> : input.readable}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            {diff.relations.changed.map((relation) => (
              <li key={`chg-${relation.id}`}><span className="pub-change">{text.change.changed}</span><code>{relation.id}</code> {kindLabel(String(relation.kind))}</li>
            ))}
            {diff.relations.removed.map((relation) => (
              <li key={`rm-${relation.id}`}><span className="pub-change pub-change-removed">{text.change.removed}</span><code>{relation.from} → {relation.to}</code> {kindLabel(String(relation.kind))}</li>
            ))}
          </ul>
        )}

      <h3>{text.sections.evidence}<BucketSummary added={diff.evidence.added.length} changed={diff.evidence.changed.length} removed={diff.evidence.removed.length} unchanged={diff.evidence.unchanged} /></h3>
      {diff.evidence.added.length + diff.evidence.changed.length + diff.evidence.removed.length === 0
        ? <p className="muted">{text.noEvidenceChanges}</p>
        : (
          <ul className="pub-list">
            {diff.evidence.added.map((record) => (
              <li key={`add-${record.id}`}>
                <span className="pub-change pub-change-added">{text.change.added}</span>
                <code>{record.id}</code>
                {record.kind && <span className="muted"> · {record.kind}</span>}
                {record.label && <StatusBadge status={record.label} title={text.evidenceTitle(record.label)} />}
                {record.checkStatus && <StatusBadge status={record.checkStatus} />}
                {record.nodes.length > 0 && <span className="muted">{text.coverage}{record.nodes.join(listJoin)}</span>}
              </li>
            ))}
            {diff.evidence.changed.map((record) => (
              <li key={`chg-${record.id}`}><span className="pub-change">{text.change.changed}</span><code>{record.id}</code></li>
            ))}
            {diff.evidence.removed.map((record) => (
              <li key={`rm-${record.id}`}><span className="pub-change pub-change-removed">{text.change.removed}</span><code>{record.id}</code></li>
            ))}
          </ul>
        )}

      <h3>{text.sections.definitions}<BucketSummary
        added={diff.definitions.added.length + diff.contracts.added.length}
        changed={diff.definitions.changed.length + diff.contracts.changed.length}
        removed={diff.definitions.removed.length + diff.contracts.removed.length}
        unchanged={diff.definitions.unchanged + diff.contracts.unchanged}
      /></h3>
      {diff.definitions.added.length === 0 && diff.contracts.added.length === 0 && <p className="muted">{text.noDefinitionChanges}</p>}
      {diff.definitions.added.length > 0 && (
        <ul className="pub-list">
          {diff.definitions.added.map((item) => (
            <li key={`def-${item.id}`}><span className="pub-change pub-change-added">{text.change.added}</span><code>{item.name || item.id}</code>{item.node && <span className="muted">{text.nodeRef}<code>{item.node}</code></span>}</li>
          ))}
        </ul>
      )}
      {diff.contracts.added.length > 0 && (
        <ul className="pub-list">
          {diff.contracts.added.map((item) => (
            <li key={`con-${item.id}`}><span className="pub-change pub-change-added">{text.change.added}</span><code>{item.id}</code> {item.title}{item.mode && <span className="muted"> · {item.mode}</span>}</li>
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
          {text.threeWay(diff.publishable.length, diff.pending.length, diff.excluded.length)}
          {diff.nothingToPublish && <strong>{text.nothingToPublish}</strong>}
        </p>
      )}

      {diff.pending.length > 0 && (
        <>
          <h3>{text.pendingHeading}<span className="family-count">{diff.pending.length}</span></h3>
          <p className="hint">{text.pendingHint}</p>
          <ul className="pub-list">
            {diff.pending.map((item) => (
              <li key={item.id}>
                <span className="pub-change">{text.change.pending}</span>
                <code>{item.from} → {item.to}</code>
                {item.kind && <span className="muted"> · {kindLabel(String(item.kind))}</span>}
                {item.reasonCode && <span className="muted"> · {item.reasonCode}</span>}
                <p className="muted">{item.reason || text.noReason}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {diff.excluded.length > 0 && (
        <>
          <h3>{text.excludedHeading}<span className="family-count">{diff.excluded.length}</span></h3>
          <p className="hint">{text.excludedHint}</p>
          <ul className="pub-list">
            {diff.excluded.map((item) => (
              <li key={`${item.candidateId}-${item.reasonCode}`}>
                <span className="pub-change">{item.reasonCode === 'refuted' ? text.change.refuted : text.change.excluded}</span>
                <code>{item.from} → {item.to}</code>
                {item.kind && <span className="muted"> · {kindLabel(String(item.kind))}</span>}
                {item.reasonCode && <span className="muted"> · {item.reasonCode}</span>}
                <p className="muted">{item.reason || text.noReason}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {diff.problems.length > 0 && (
        <div className="error">
          <strong>{text.blockers}</strong>
          <ul>{diff.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
        </div>
      )}
      {diff.warnings.length > 0 && (
        <div className="pub-boundary-box">
          <strong>{text.warnings}</strong>
          <ul className="pub-boundary">{diff.warnings.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      )}
      {diff.steps.length > 0 && (
        <details className="case-details">
          <summary>{text.steps}</summary>
          <ol className="pub-steps">{diff.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        </details>
      )}
      {!diff.recognized && (
        <>
          <p className="error">{text.unrecognized}</p>
          <pre className="pub-raw">{JSON.stringify(diff.raw, null, 2)}</pre>
        </>
      )}
      <p className="muted">{text.diffFooter(fields.background || text.notChosenYet, fields.name || text.pendingText)}</p>
    </div>
  );
}

/** 只画草稿与本次已验证关系的局部图：不读公共本体图，也不写它。 */
function OverlayGraph({ overlay, text, kindLabel, jointText }: {
  overlay: ReturnType<typeof buildOverlay>;
  text: { aria: string; draft: string; existing: string; empty: string };
  kindLabel: (kind: string) => string;
  jointText: (count: number) => string;
}) {
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
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={text.aria}>
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
                {kindLabel(String(edge.kind))}{edge.joint ? ` · ${jointText(edge.jointInputs.length)}` : ''}
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
              <text className="pub-node-sub" x={point.x} y={point.y + 14} textAnchor="middle">{draft ? text.draft : text.existing}</text>
            </g>
          );
        })}
      </svg>
      {overlay.edges.length === 0 && (
        <p className="muted">{text.empty}</p>
      )}
    </div>
  );
}

function RevisionRow(props: { revision: PublicationRevision; onRollback: (id: string) => void; pending: boolean; busy: boolean }) {
  const { revision, onRollback, pending, busy } = props;
  const { t, locale, fmtDate } = useI18n();
  const text = COPY[locale];
  const [confirming, setConfirming] = useState(false);
  const summary = revision.summary;
  return (
    <tr>
      <td>
        <code>{revision.id}</code>
        {revision.parent && <div className="muted">{text.parent}<code>{revision.parent}</code></div>}
        {revision.restores && <div className="muted">{text.restores}<code>{revision.restores}</code></div>}
      </td>
      <td>{revision.kind === 'rollback' ? text.kindRollback : text.kindPublish}</td>
      <td>{revision.createdAt ? fmtDate(revision.createdAt) : text.notReturned}</td>
      <td className="muted">
        {text.summary(summary.nodes, summary.relations, summary.evidence, summary.definitions, summary.contracts)}
        <div>{text.decisionsSummary(revision.acceptedCandidateIds.length, revision.dismissedCandidateIds.length)}</div>
        {revision.packagePath && <div><code>{revision.packagePath}</code></div>}
      </td>
      <td className="muted"><code>{revision.reviewDigest || text.facts.none}</code>{revision.notes && <div>{revision.notes}</div>}</td>
      <td>
        {!confirming && (
          <button type="button" className="button small" disabled={busy} onClick={() => setConfirming(true)}>{text.rollbackTo}</button>
        )}
        {confirming && (
          <div className="pub-rollback-confirm">
            <p className="muted">{text.rollbackConfirm(revision.id)}</p>
            <div className="card-actions">
              <button type="button" className="button small primary" disabled={busy} onClick={() => { setConfirming(false); onRollback(revision.id); }}>
                {pending ? text.rollingBack : text.confirmRollback}
              </button>
              <button type="button" className="button small" onClick={() => setConfirming(false)}>{t('common.cancel')}</button>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}
