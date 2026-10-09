import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { formatError, useApi, useLocaleKey, type UnavailableInfo } from '../api';
import { FormalSpecEditor } from '../components/FormalSpecEditor';
import { RelationReviewPanel, type ReplayRecord } from '../components/RelationReviewPanel';
import { PublicationPreview, type PublishOutcome } from '../components/PublicationPreview';
import { useI18n } from '../i18n';
import { useLabels } from '../i18n/useLabels';
import {
  AUTHORING_CASES, DEFAULT_BUDGET, FALLBACK_TEMPLATES, FLOW_BOUNDARIES, PENDING_TEXT,
  buildLocalPreview, cancelRun, caseDiscipline, clearLocalDraft, createDraft, describeFailure,
  draftNodeId, draftSignature, draftToFields, emptyFields, excludedReasonsFrom, fetchCatalog, fetchDraft,
  fieldsToPatch, fieldsToSpecSource,
  isBlankFields, isPublishable, isValidationStale, listRevisions, localDraftKey, newIdempotencyKey, pending,
  previewPublication, commitPublication, readLocalDraft, replayCandidates, reviewDigest, rollbackPublication,
  startDiscoveryJob, updateDraft, useDebounced, useDiscoveryRun, validateDraft, writeLocalDraft,
  type AuthoringDraft, type AuthoringTemplate, type CandidateView, type DeclarationRole, type DiscoveryBudget,
  type DraftFields, type DraftPatch, type ExclusionNote, type FormalCatalogView, type LocalDraftRecord,
  type PublicationDiff, type PublicationRevision, type ReviewDecision, type SpecSourceKey, type ValidateResult,
} from '../authoring';
import type { NodeDetailResponse } from '../types';

/**
 * 「自动关联」主流程：填写节点 → 检查表达 → 自动发现 → 审阅结果 → 入库预览 → 确认入库（含回滚）。
 *
 * 这一页的三条底线：
 *
 * 1. **不依赖学习者档案**：草稿只在浏览器本地与编写库里，和 `localStorage` 里的学习草稿
 *    是两套东西（键也不同），切换档案不影响这一页。
 * 2. **未就绪要说清是哪一件没就绪**：解析器、发现引擎、编写库、发布服务都在服务端按需装载；
 *    缺哪个就在对应的动作上写出模块名与原因，**不假装成功、也不静默当空结果**。
 * 3. **未验证不画成已成立**：已反驳与未决只在审阅视图；网络预览只叠加草稿与已验证结果。
 *
 * URL 参数（节点页的两个入口）：
 * - `?node=<id>`：以此节点为基础创建（`mode=new`）或检查它已有的形式表达（`mode=check`）。
 */

/** 成对文案：漏写一边编译不过，取用时走 `useI18n().pick`。 */
interface Pair { zh: string; en: string }

/**
 * 本页自己的界面文案（中英成对）。
 *
 * 为什么不往 `i18n/messages.ts` 堆：手册 §1 规定那张表只放**通用壳层**文案
 * （导航、通用按钮、无障碍标签），页面自己的长文案留在页面模块里。
 *
 * 两条写法约定：
 * - `{name}` 是占位符，由 `fill()` 按当前语种填值：中文说「还有 3 条」，
 *   英文说「3 more」，语序不同，不能靠拼字符串硬凑。
 * - 中文是源语言，**逐字不变**。原文里跨行的句子，JSX 会把换行折成一个空格
 *   （例如 `unsavedB` 开头的那个空格），这里照抄进字符串；否则中文渲染会少一个空格。
 */
const TEXT = {
  /* —— 页头 —— */
  pageTitle: { zh: '自动关联', en: 'Relation discovery' },
  leadA: { zh: '把一个数学对象写成', en: 'Write a mathematical object as an expression in the ' },
  leadStrong: { zh: '受限形式语言', en: 'restricted formal language' },
  leadB: {
    zh: '的表达，让站点在登记过的背景理论里自动找关系， 再逐条审阅、预览变更、入库或回滚。四个案例（',
    en: ', let the site look for relations inside registered background theories, then review them one by one, preview the changes and publish or roll back. The four cases (',
  },
  leadC: { zh: '） 各有一套骨架模板。', en: ') each come with a skeleton template.' },
  listSeparator: { zh: '、', en: ', ' },
  leadNoteA: { zh: '这一步写的是', en: 'What you write here is the ' },
  leadNoteStrong: { zh: '机器表达层', en: 'machine-expression layer' },
  leadNoteB: {
    zh: '，与节点页给人读的「形式表达」分开保存、互不覆盖； 学习者档案（E）不参与，草稿也不进公共本体。',
    en: ', stored separately from the human-readable “formal statement” on object pages, and neither overwrites the other; the learner profile (E) takes no part, and drafts do not enter the public ontology.',
  },

  /* —— 未就绪提示 —— */
  notReadyTitle: { zh: '功能尚未就绪的部分', en: 'Parts that are not ready yet' },
  notReadyBodyA: { zh: '这一页依赖的模块由服务端按需装载，当前有 ', en: 'The modules this page depends on are loaded by the server on demand; ' },
  notReadyBodyB: { zh: ' 处没有就绪：', en: ' of them are not ready:' },
  notReadyNoteA: { zh: '页面仍然可以填写草稿并在本地自动保存；每个动作都会在', en: 'You can still fill in a draft and it is autosaved locally; each action reports why it did not run ' },
  notReadyNoteStrong: { zh: '它自己那一步', en: 'in its own step' },
  notReadyNoteB: { zh: '报告为什么没有执行。 未就绪不等于命题未决，也不等于命题为假。', en: '. “Not ready” does not mean the claim is undecided, and it does not mean the claim is false.' },

  /* —— 步骤栏 —— */
  stepsAria: { zh: '自动关联流程', en: 'Relation discovery flow' },

  /* —— 草稿栏 —— */
  draftbarAria: { zh: '草稿状态', en: 'Draft status' },
  sourceNodeLabel: { zh: '来源节点 ', en: 'Source object ' },
  /* 括号也按语种给：英文里落一个全角「（）」就是中文标点串进英文句子。 */
  parenTitle: { zh: '（{title}）', en: ' ({title})' },
  newDraftLabel: { zh: '新建节点草稿（未挂在既有节点上）', en: 'New object draft (not attached to an existing object)' },
  draftKeyLabel: { zh: '本地草稿键 ', en: 'Local draft key ' },
  autosavedAt: { zh: ' · 自动保存于 {time}', en: ' · autosaved at {time}' },
  notSavedYet: { zh: ' · 尚未保存', en: ' · not saved yet' },
  restoredAt: { zh: ' · 已恢复自 {time}', en: ' · restored from {time}' },
  saving: { zh: '保存中…', en: 'Saving…' },
  saveToServer: { zh: '保存到服务端（当前修订 {revision}）', en: 'Save to the server (current revision {revision})' },
  createServerDraft: { zh: '创建服务端草稿', en: 'Create a server draft' },
  clearLocalDraft: { zh: '清空本地草稿', en: 'Clear the local draft' },
  unsavedA: { zh: '本地改动还没有保存到服务端。', en: 'Local changes have not been saved to the server yet. ' },
  unsavedStrong: { zh: '入库用的是服务端那一份草稿', en: 'Publishing uses the server-side draft' },
  unsavedB: {
    zh: '：在保存之前，预览与入库都会 反映旧内容，所以这里先把入库挡住。',
    en: ': until you save, both the preview and publishing reflect the old content, so publishing is blocked here.',
  },

  /* —— 第 1 步：骨架模板 —— */
  skeletonTitle: { zh: '四案例骨架模板', en: 'Skeleton templates for the four cases' },
  skeletonHintA: { zh: '模板只填', en: 'A template fills in the ' },
  skeletonHintStrong: { zh: '骨架', en: 'skeleton' },
  /*
   * `PENDING_TEXT` 是 `authoring.ts` 里的中文数据（task-17 之后才会成对）：它必须以 `<Pending>`
   * 渲染，所以这里把句子拆在它两侧——整句塞进一个 `{pending}` 占位符，中文就会**不带标注**
   * 地混进英文句子（`scripts/i18n-ui-scan.mjs` 就是这么抓到的）。
   */
  skeletonHintB: {
    zh: '：案例、背景、参数类型表。陈述、假设、定义与中文解释留空，界面显示「',
    en: ': case, background and parameter type table. The statement, assumptions, definitions and the Chinese explanation are left empty and the interface shows “',
  },
  skeletonHintC: { zh: '」——站点不替你写数学内容。', en: '” — the site does not write mathematical content for you.' },
  templateNoNote: { zh: '（模板没有给出说明）', en: '(this template has no description)' },
  armed: { zh: '再点一次会', en: 'Clicking again will ' },
  armedStrong: { zh: '覆盖', en: 'overwrite' },
  armedTail: { zh: '当前草稿的名称、背景与全部源码块。取消请改动任一字段。', en: ' the current draft’s name, background and all source blocks. To cancel, change any field.' },
  applySkeleton: { zh: '套用这个骨架', en: 'Apply this skeleton' },
  confirmOverwrite: { zh: '再点一次确认覆盖', en: 'Click again to confirm overwriting' },
  registeredTitle: { zh: '按已登记的形式表达起稿', en: 'Start from a registered formal expression' },
  registeredCount: { zh: '{n} 条', en: '{n} entries' },
  registeredHintA: { zh: '这些不是骨架：它们来自登记表里', en: 'These are not skeletons: they come from ' },
  registeredHintStrong: { zh: '已经写好的形式表达', en: 'formal expressions that are already written' },
  registeredHintB: { zh: '，含陈述、定义与假设。 套用之后请自己核对，站点不保证它与你的意图一致。', en: ' in the registry and include the statement, definitions and assumptions. Check them yourself after applying: the site does not guarantee that they match your intent.' },
  pickOne: { zh: '选择一条', en: 'Choose one' },
  notSelected: { zh: '（未选择）', en: '(none selected)' },
  applyRegistered: { zh: '套用选中的登记模板', en: 'Apply the selected registered template' },
  confirmApplyRegistered: { zh: '再点一次确认套用', en: 'Click again to confirm applying' },
  templateNoNoteShort: { zh: '（这条模板没有给出说明）', en: '(this template has no description)' },

  /* —— 第 1 步：基础信息 —— */
  basicsTitle: { zh: '基础信息', en: 'Basic information' },
  nameLabel: { zh: '名称', en: 'Name' },
  namePlaceholder: { zh: '例如：群：交换性', en: 'for example: group: commutativity' },
  disciplineLabel: { zh: '学科（入库要求）', en: 'Discipline (required for publishing)' },
  disciplinePlaceholder: { zh: '例如：群论', en: 'for example: group theory' },
  nodeIdLabel: { zh: '将要发布的节点 id', en: 'Object id to be published' },
  nodeIdHintA: { zh: '先填名称（名称里带 ', en: 'Fill in a name first (a name containing ' },
  nodeIdHintB: { zh: ' 时按显式 id 处理，否则补 ', en: ' is treated as an explicit id; otherwise a ' },
  nodeIdHintC: { zh: ' 前缀）', en: ' prefix is added)' },
  nodeIdRuleA: { zh: '规则：名称里含 ', en: 'Rule: a name containing ' },
  nodeIdRuleB: { zh: ' 时原样当 id；否则把空白折成 ', en: ' is used as the id as it stands; otherwise whitespace is folded to ' },
  nodeIdRuleC: { zh: '、去掉会破坏 id 的字符，再加 ', en: ', characters that would break the id are removed, and a ' },
  nodeIdRuleD: { zh: ' 前缀。', en: ' prefix is added.' },
  nodeIdChangedA: { zh: 'id 已变化：', en: 'The id changed: ' },
  nodeIdChangedB: { zh: '；上次检查的结果已过期，请回第 2 步重新检查。', en: '; the previous check result is now stale — go back to step 2 and check again.' },
  constructLabel: { zh: '构造类型', en: 'Construct type' },
  constructOutside: { zh: '（不在协议列表里）', en: ' (not in the protocol list)' },
  caseLabel: { zh: '案例', en: 'Case' },
  caseOutside: { zh: '（不在四案例里）', en: ' (not one of the four cases)' },
  summaryLabel: { zh: '摘要（给人读的一句话）', en: 'Summary (one sentence for people to read)' },
  readingLabel: { zh: '中文解释 / 读法', en: 'Explanation / how to read it' },
  readingPlaceholder: { zh: '留空时界面显示「{pending}」，不自动生成', en: 'If left empty the interface shows “{pending}” — nothing is generated automatically' },

  /* —— 第 1 步：来自节点页的登记内容 —— */
  sourceSectionTitle: { zh: '来自节点页的登记内容（只读）', en: 'Registered content from the object page (read-only)' },
  loadingNode: { zh: '读取节点…', en: 'Loading the object…' },
  registeredFormalStatement: { zh: '已登记形式表达', en: 'Registered formal statement' },
  readingTerm: { zh: '读法', en: 'How to read it' },
  evidenceLabelTerm: { zh: '证据标签', en: 'Evidence label' },
  sourceVersion: { zh: '版本 {version}', en: 'version {version}' },
  noHumanStatementA: { zh: '该节点没有登记给人读的形式表达（', en: 'This object has no human-readable formal statement registered (' },
  noHumanStatementB: { zh: '）。这不是错误，只是没有登记。', en: '); this is not an error, it is simply not registered.' },
  existingSpecA: { zh: '该节点已有一份机器表达（', en: 'This object already has a machine expression (' },
  existingSpecB: { zh: '，specVersion {version}， 背景 ', en: ', specVersion {version}, background ' },
  existingSpecC: { zh: '）。', en: ').' },
  notReturned: { zh: '（未返回）', en: '(not returned)' },
  copySpec: { zh: '抄进草稿（拷贝，不是引用）', en: 'Copy into the draft (a copy, not a reference)' },
  noMachineSpecA: { zh: '该节点没有登记机器表达（', en: 'This object has no machine expression registered (' },
  noMachineSpecB: { zh: '）；「检查已有形式表达」这一步因此没有可检查的对象。', en: '); the step “check an existing formal expression” therefore has nothing to check.' },

  /* —— 第 2 步：检查表达 —— */
  formalTitle: { zh: '形式表达', en: 'Formal expression' },
  nextCheck: { zh: '下一步：检查表达', en: 'Next: check the expression' },
  checkTitle: { zh: '检查表达', en: 'Check the expression' },
  checkHintA: { zh: '交给解析器做词法/语法、别名归一、α 规范与类型检查（', en: 'Hand it to the parser for lexing/parsing, alias normalisation, α-canonicalisation and type checking (' },
  checkHintB: { zh: '，零写入）。 通过只说明', en: ', no writes). Passing only means the ' },
  checkHintStrong: { zh: '表达可读且良类型', en: 'expression is readable and well typed' },
  checkHintC: { zh: '，不表示命题成立。', en: '; it does not mean the claim holds.' },
  checking: { zh: '检查中…', en: 'Checking…' },
  lastCheck: { zh: '上次检查：{result}', en: 'Last check: {result}' },
  passed: { zh: '通过', en: 'passed' },
  problemCount: { zh: '{n} 处问题', en: '{n} problems' },
  readingNode: { zh: ' · 读取中…', en: ' · loading…' },
  checkSourceSpecA: { zh: ' · 已登记机器表达（', en: ' · a machine expression is registered (' },
  checkSourceSpecB: { zh: '，specVersion {version}，背景 ', en: ', specVersion {version}, background ' },
  checkSourceSpecC: { zh: '）。下面检查的是草稿里的', en: '). What is checked below is the ' },
  copyStrong: { zh: '拷贝', en: 'copy' },
  checkSourceSpecD: { zh: '，改动不会回写该节点。', en: ' in the draft; changes are not written back to that object.' },
  checkSourceNoSpecA: { zh: ' · 该节点没有登记机器表达（', en: ' · this object has no machine expression registered (' },
  checkSourceNoSpecB: { zh: '），因此没有可检查的既有对象：下面检查的是你写进草稿的这份。', en: '), so there is no existing object to check: what is checked below is the one you wrote into the draft.' },
  statementEmpty: { zh: '陈述还是空的：先在上面写一条认证公式，再检查。', en: 'The statement is still empty: write a formula to be checked above, then run the check.' },
  formalWithErrors: { zh: '形式表达（含错误位置）', en: 'Formal expression (with error locations)' },
  boundaryTitle: { zh: '首版能力的诚实边界', en: 'Honest boundaries of what this first version can do' },
  abilityYes: {
    zh: '能做：定义展开、λ 应用化简、假设引入/蕴含、合取、全称/存在、等式自反与替换、引用已重放通过的局部引理。',
    en: 'It can: unfold definitions, simplify λ-applications, introduce assumptions and implications, handle conjunction, universal/existential quantifiers, reflexivity and substitution of equality, and cite local lemmas that have already replayed successfully.',
  },
  abilityNo: {
    zh: '不做：析取与经典反证（内核无规则）、一般高阶合一、跨载体遗忘映射、任意模型搜索。',
    en: 'It does not: disjunction or classical proof by contradiction (the kernel has no rule for them), general higher-order unification, forgetful maps across carriers, or arbitrary model search.',
  },
  abilityKernelA: { zh: '检查器本身未获形式验证（', en: 'The checker itself is not formally verified (' },
  abilityKernelB: { zh: ' 恒为 false）：「跑通了」不等于「数学上已证明」。', en: ' is always false): “it ran through” is not the same as “it is proved mathematically”.' },
  prev: { zh: '上一步', en: 'Back' },
  nextDiscover: { zh: '下一步：自动发现', en: 'Next: relation discovery' },

  /* —— 第 3 步：自动发现 —— */
  runSettingsTitle: { zh: '运行参数', en: 'Run parameters' },
  runSettingsHintA: { zh: '发现任务在服务端运行，页面只是按间隔取状态——这就是「后台搜索不阻塞页面」的做法。 超出候选上限或整批时限后，', en: 'The discovery job runs on the server and the page only polls its status — that is how “background search without blocking the page” is done. Once the candidate limit or the batch time limit is exceeded, ' },
  runSettingsHintStrong: { zh: '已完成并核验的结果照样保留', en: 'results that are already finished and checked are kept' },
  runSettingsHintB: { zh: '，并列出未处理数量。', en: ', and the number left unprocessed is listed.' },
  draftTerm: { zh: '草稿', en: 'Draft' },
  nodeIdTerm: { zh: '节点 id', en: 'Object id' },
  backgroundTerm: { zh: '背景', en: 'Background' },
  ontologyVersionTerm: { zh: '本体版本', en: 'Ontology version' },
  notSavedToServer: { zh: '尚未保存到服务端', en: 'not saved to the server yet' },
  noNameNoId: { zh: '还没填名称，因此还没有 id', en: 'no name yet, so no id yet' },
  noBackground: { zh: '尚未选择（先在第 1 步选背景）', en: 'not chosen yet (choose a background in step 1)' },
  notFetched: { zh: '（未取到）', en: '(not fetched)' },
  revisionInline: { zh: '修订 {revision}', en: 'revision {revision}' },
  maxCandidates: { zh: '候选上限', en: 'Candidate limit' },
  perCandidateMs: { zh: '单候选时限（ms）', en: 'Per-candidate limit (ms)' },
  totalMs: { zh: '整批时限（ms）', en: 'Batch limit (ms)' },
  depth: { zh: '搜索深度', en: 'Search depth' },
  maxStates: { zh: '搜索状态数', en: 'Search states' },
  blockersTitle: { zh: '还不能启动自动发现，缺这几样：', en: 'Relation discovery cannot start yet; these are missing:' },
  needMore: { zh: '还需要：{list}', en: 'Still needed: {list}' },
  blockerSeparator: { zh: '；', en: '; ' },
  startTitle: { zh: '启动一次自动发现', en: 'Start one relation-discovery run' },
  starting: { zh: '正在启动…', en: 'Starting…' },
  taskRunning: { zh: '任务运行中…', en: 'Job running…' },
  startDiscovery: { zh: '启动自动发现', en: 'Start relation discovery' },
  requestCancel: { zh: '请求取消', en: 'Request cancellation' },
  unsavedRunA: { zh: '本地改动还没有保存到服务端草稿。发现任务读的是', en: 'Local changes have not been saved to the server draft. The discovery job reads the ' },
  unsavedRunStrong: { zh: '服务端那一份', en: 'server-side copy' },
  unsavedRunB: { zh: '， 不先保存就会对着旧表达找关系——所以这里把启动挡住了。', en: ', so without saving first it would look for relations against the old expression — that is why starting is blocked here.' },
  localOnlyHint: { zh: '也可以只保存本地草稿继续填写：本地草稿不依赖服务端编写库。', en: 'You can also keep working with only a local draft: local drafts do not depend on the server-side authoring store.' },
  runLabel: { zh: '运行 ', en: 'Run ' },
  statusLabel: { zh: ' · 状态 ', en: ' · status ' },
  backgroundPolling: { zh: '（后台运行中，页面每 2.5 秒取一次状态）', en: '(running in the background; the page polls its status every 2.5 seconds)' },
  startFailed: { zh: '启动失败：', en: 'Failed to start: ' },
  notReadyShort: { zh: '功能尚未就绪', en: 'not ready yet' },
  moduleInline: { zh: ' · 模块 {specifier}', en: ' · module {specifier}' },
  reasonInline: { zh: ' · 原因：{reason}', en: ' · reason: {reason}' },
  startFailedTail: { zh: '这不是「没有找到关系」——是发现这件事本身还没法做。本地草稿与审阅记录都还在。', en: 'This is not “no relations were found” — relation discovery itself cannot be done yet. Your local draft and review records are still here.' },
  pollingNote: { zh: '轮询提示：{message}', en: 'Polling note: {message}' },
  taskStatusTitle: { zh: '任务状态', en: 'Job status' },
  taskLabel: { zh: '任务 ', en: 'Job ' },
  interruptedNote: { zh: '（服务重启中断；已核验结果保留）', en: '(interrupted by a server restart; checked results are kept)' },
  runStats: {
    zh: '候选 {candidates} · 覆盖节点 {covered} · 已验证 {verified} · 已反驳 {refuted} · 未决 {undecided} · 未处理 {unprocessed} · 耗时 {duration} ms',
    en: 'Candidates {candidates} · objects covered {covered} · verified {verified} · refuted {refuted} · undecided {undecided} · unprocessed {unprocessed} · elapsed {duration} ms',
  },
  refreshRun: { zh: '刷新任务状态', en: 'Refresh job status' },
  goReviewCount: { zh: '去审阅 {n} 条候选', en: 'Review {n} candidates' },
  nextReview: { zh: '下一步：审阅结果', en: 'Next: review the results' },

  /* —— 第 4 步：审阅结果 —— */
  staleDecisions: {
    zh: '还有 {n} 条审阅决策属于更早的运行结果，本次不计入入库范围 （它们没有被删掉：换回那次运行的结果仍然能看到）。',
    en: '{n} review decisions belong to an earlier run and are not counted in this publish range (they have not been deleted: switch back to that run’s results and they are still visible).',
  },
  nextPreview: { zh: '下一步：入库预览', en: 'Next: publish preview' },

  /* —— 第 6 步 —— */
  nextPublish: { zh: '下一步：确认入库', en: 'Next: confirm publishing' },
  toNetwork: { zh: '去知识网络看公共图（入库前它不会变）', en: 'See the public graph in the knowledge network (it does not change before you publish)' },

  /* —— 页脚边界 —— */
  boundariesTitle: { zh: '这一页写死的东西', en: 'What is fixed in this page' },

  /* —— 提示（存键，不存字符串：切语种后提示跟着换语言） —— */
  msgRestoredLocal: { zh: '已从浏览器本地的草稿恢复（草稿只在本机，未进入公共本体）。', en: 'Restored from the browser-local draft (the draft stays on this machine and does not enter the public ontology).' },
  msgTemplateAlreadyApplied: { zh: '「{title}」已经套用过了：当前草稿字段与它一致，没有改动。', en: '“{title}” has already been applied: the draft fields match it, so nothing changed.' },
  msgTemplateApplied: { zh: '已套用模板「{title}」，替换了草稿字段。', en: 'Applied the template “{title}”; the draft fields were replaced.' },
  msgCopiedSpecForCheck: { zh: '已把该节点登记的机器表达抄进草稿用于检查：这是拷贝，不是引用；在这里改动不会回写该节点。', en: 'The machine expression registered for this object was copied into the draft for checking: it is a copy, not a reference; changes here are not written back to that object.' },
  msgCopiedSpec: { zh: '已把该节点的机器表达抄进草稿：这是「拷贝」，不是引用；改动不会回写原节点。', en: 'The machine expression of this object was copied into the draft: a copy, not a reference; changes are not written back to the original object.' },
  msgDraftNameRequired: { zh: '先给草稿起个名字再保存到服务端（本地草稿不需要名字，已经在自动保存）。', en: 'Give the draft a name before saving it to the server (a local draft needs no name and is already autosaved).' },
  msgDraftUpdateFailed: { zh: '服务端草稿没有更新成功；本地草稿仍然保留，改动不会丢。', en: 'The server draft was not updated; the local draft is kept, so nothing is lost.' },
  msgDraftCreateFailed: { zh: '服务端草稿没有建成；本地草稿仍然保留，可以继续填写。', en: 'The server draft was not created; the local draft is kept and you can carry on.' },
  msgDraftSaved: { zh: '服务端草稿已保存：{id}（修订 {revision}）。', en: 'Server draft saved: {id} (revision {revision}).' },
  msgDraftShapeUnknown: { zh: '服务端返回了未识别的草稿形状：已保留本地草稿，未当作保存成功。', en: 'The server returned an unrecognised draft shape: the local draft is kept, and this is not treated as a successful save.' },
  msgRunShapeUnknown: { zh: '服务端返回了未识别的任务形状：没有 id 的任务无法查看结果，未当作启动成功。', en: 'The server returned an unrecognised job shape: a job without an id has no results to show, so this is not treated as a successful start.' },
  msgDiscoveryStarted: { zh: '发现任务已启动：{id}。任务在服务端跑，页面可以继续操作或用其它步骤。', en: 'Discovery job started: {id}. The job runs on the server; you can keep working in the page or use other steps.' },
  msgCancelRequested: { zh: '已请求取消：已完成并核验过的候选结果保留；中断不等于数学反驳。', en: 'Cancellation requested: candidates that were already finished and checked are kept; an interruption is not a mathematical refutation.' },
  msgExcludedRemoved: { zh: '服务端判定有 {n} 条候选不入库（原因见下面「不在入库范围」一栏），已从本次入库范围移除；其余内容照常入库。', en: 'The server ruled that {n} candidates are not to be published (see the “outside the publish range” section below); they were removed from this publish range and the rest is published as usual.' },
  msgPublished: { zh: '入库完成；回滚会另建一条版本记录，历史包与证据都还在。已刷新本体版本。', en: 'Publishing finished; a rollback creates another revision record, and the historical bundles and evidence are still there. The ontology version has been refreshed.' },
  msgRolledBack: { zh: '恢复到 {id}', en: 'Rolled back to {id}' },
  msgClearedLocal: { zh: '已清空本地草稿（服务端草稿不受影响）。', en: 'The local draft was cleared (the server draft is not affected).' },
  msgCatalogNoLanguage: { zh: '形式目录装上了，但解析器没就绪：语言版本与符号清单可能为空。', en: 'The formal catalogue is loaded, but the parser is not ready: the language version and the symbol list may be empty.' },
  msgPublishSummary: { zh: '新增 节点 {nodes} · 关系 {relations} · 证据 {evidence} · 定义 {definitions} · 契约 {contracts}', en: 'Added: objects {nodes} · relations {relations} · evidence {evidence} · definitions {definitions} · contracts {contracts}' },
  msgPublishSummaryMissing: { zh: '服务端未返回版本摘要。', en: 'The server did not return a revision summary.' },

  /* —— 「还不能启动」的逐条原因（与按钮 disabled 用同一个数组） —— */
  blockerName: { zh: '先在「基础信息」里填节点名称（它决定将要发布的节点 id）', en: 'Fill in the object name under “Basic information” first (it determines the object id to be published)' },
  blockerBackground: { zh: '先在「形式表达」里选择背景理论（蕴含必须在某个背景下才可判）', en: 'Choose a background theory under “Formal expression” first (an implication can only be judged inside some background)' },
  blockerDraft: { zh: '先把草稿保存到服务端（草稿栏的「创建服务端草稿」），或从节点页「以此为基础创建」进入', en: 'Save the draft to the server first (“Create a server draft” in the draft bar), or come in from the object page via “create based on this”' },
  blockerUnsaved: { zh: '先把本地改动保存到服务端草稿（发现任务读的是服务端那一份）', en: 'Save the local changes to the server draft first (the discovery job reads the server-side copy)' },
  blockerValidation: { zh: '先在「检查表达」里检查一次（关系要挂在草稿的形式表达上）', en: 'Run the check under “Check the expression” first (relations have to hang on the draft’s formal expression)' },
  blockerStale: { zh: '草稿又改过（或节点 id 变了），先去「检查表达」重新检查一次', en: 'The draft changed again (or the object id changed); go back and re-run the check under “Check the expression”' },
  blockerNotOk: { zh: '当前表达没通过解析检查，先修好再启动', en: 'The current expression does not pass the parse check; fix it before starting' },

  /* —— 未就绪模块清单 —— */
  reasonParser: { zh: '解析器 / 类型检查（core/formal/language.mjs）', en: 'Parser / type checker (core/formal/language.mjs)' },
  reasonDiscovery: { zh: '发现引擎（{specifier}）', en: 'Discovery engine ({specifier})' },
  reasonPublish: { zh: '发布服务（{specifier}）', en: 'Publication service ({specifier})' },
  reasonRevisions: { zh: '版本清单（{specifier}）', en: 'Revision list ({specifier})' },
  reasonDraftStore: { zh: '编写库（server/authoring-db.mjs）', en: 'Authoring store (server/authoring-db.mjs)' },
  moduleNotLoaded: { zh: '模块未装载', en: 'module not loaded' },
};

type TextKey = keyof typeof TEXT;

/**
 * 一段面向读者的说明。
 *
 * - `key`：页面自己写的文案，存「键 + 变量」而不是成品字符串——切换语种后它跟着换语言；
 * - `raw`：后端 / 工具链返回的原文（检查结论、失败原因），英文语境下如实标注「尚未翻译」，
 *   不编一句英文假装已经翻过。
 */
type Note = { key: TextKey; values?: Record<string, string | number> } | { raw: string };

/** 把 `{name}` 占位符换成实际值；未登记的键原样保留，不静默变成空白。 */
function fill(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

/**
 * 未译数据的标注。
 *
 * `authoring.ts` 与后端返回的条目（模板标题、边界清单、检查结论）目前只有中文；
 * 英文语境下**照原样显示并标出来**，让读者知道那是尚未翻译，而不是站点混着两种语言。
 */
function Pending({ text }: { text: string }) {
  const { isPending, t } = useI18n();
  const on = isPending(text);
  return (
    <span className={on ? 'i18n-pending' : undefined} title={on ? t('i18n.pendingTitle') : undefined}>{text}</span>
  );
}

/** 渲染一段 `Note`：`key` 走本文件的成对表，`raw` 原样显示（英文站上标「尚未翻译」）。 */
function NoteText({ note }: { note: Note }) {
  const { pick, isPending, t } = useI18n();
  const text = 'raw' in note ? note.raw : fill(pick(TEXT[note.key]), note.values);
  const on = isPending(text);
  return (
    <span className={on ? 'i18n-pending' : undefined} title={on ? t('i18n.pendingTitle') : undefined}>{text}</span>
  );
}

const STEPS = [
  { id: 'node', label: { zh: '填写节点', en: 'Fill in the object' }, hint: { zh: '基础信息与形式表达骨架', en: 'Basic information and the formal-expression skeleton' } },
  { id: 'check', label: { zh: '检查表达', en: 'Check the expression' }, hint: { zh: '解析、类型检查、错误位置', en: 'Parsing, type checking, error locations' } },
  { id: 'discover', label: { zh: '自动发现', en: 'Relation discovery' }, hint: { zh: '后台运行，不阻塞页面', en: 'Runs in the background without blocking the page' } },
  { id: 'review', label: { zh: '审阅结果', en: 'Review results' }, hint: { zh: '已验证 / 已反驳 / 未决', en: 'Verified / refuted / undecided' } },
  { id: 'preview', label: { zh: '入库预览', en: 'Publish preview' }, hint: { zh: '只叠加草稿与结果', en: 'Only the draft and the results are overlaid' } },
  { id: 'publish', label: { zh: '确认入库', en: 'Confirm publishing' }, hint: { zh: '版本与回滚', en: 'Revisions and rollback' } },
] as const;

type StepId = (typeof STEPS)[number]['id'];

/** 节点详情里可能带上的形式表达负载（§7：新字段是可选的，旧客户端忽略即可）。 */
interface NodeFormalSpecView {
  specVersion?: string;
  background?: string;
  hash?: string;
  statement?: { source?: string };
  declarations?: Array<{ name?: string; type?: string; role?: string; label?: string }>;
  boundary?: string[];
}

/** 参数类型表的角色：只认 §1.6 的五个值，其余一律归到「对象集」，不猜测语义。 */
function toDeclarationRole(value: string | undefined): DeclarationRole {
  const roles: DeclarationRole[] = ['object', 'element', 'function', 'predicate', 'proposition'];
  return roles.includes(value as DeclarationRole) ? value as DeclarationRole : 'object';
}

/**
 * 把一份已登记的机器表达（`formalSpec`）变成草稿字段的补丁。
 *
 * 只搬「背景、陈述、参数类型表」三样：其余项（定义、假设、断言）在详情接口里
 * 未必齐全，少搬比搬错好——缺的部分由用户自己写，界面照旧显示「待补充」。
 */
function specToFieldPatch(spec: NodeFormalSpecView): Partial<DraftFields> {
  const patch: Partial<DraftFields> = {};
  if (spec.background) patch.background = spec.background;
  if (spec.statement?.source) patch.statement = spec.statement.source;
  if ((spec.declarations ?? []).length) {
    patch.declarations = (spec.declarations ?? []).map((row) => ({
      name: row.name ?? '',
      type: row.type ?? '',
      role: toDeclarationRole(row.role),
      label: row.label ?? '',
    }));
  }
  return patch;
}

/**
 * 可登记的对象构造类型，取自 `shared/types.d.ts` 的 `Construct` 联合。
 *
 * 这里写成显式数组，而不是把标签表的键直接铺成选项：编写入口的「全集」是协议允许的
 * 构造类型，与列表页分面的「本体里实际有哪些」不是一回事；而且「标签表当选项表」这种写法
 * 在 `tests/label-option-scan.test.mjs` 里必须逐处登记理由（它专门防「选不中任何东西的死选项」）。
 */
const CONSTRUCT_OPTIONS = ['Symbol', 'Term', 'Concept', 'Definition', 'Claim', 'Proof', 'Example', 'Counterexample', 'Problem', 'Theory', 'Construction', 'Method', 'Representation', 'MisconceptionPattern'] as const;

export function AuthoringPage() {
  /**
   * 界面文案与语种相关的三件事：取词（`pick` + 本文件的 `TEXT`）、时间格式化、
   * 以及拼带语种前缀的站内链接（`hrefFor`）。未译标注由 `Pending` / `NoteText` 自己做。
   */
  const { pick, fmtDate, hrefFor, isPending } = useI18n();
  /** 受控词表的显示名（案例名等）跟着语种走，必须用 `useLabels()` 才会重渲染。 */
  const labels = useLabels();
  /** 直接调 `api()` 的 effect 要把它写进依赖：`useApi()` 已内置，其它调用点得自己加。 */
  const localeKey = useLocaleKey();

  const tr = useCallback(
    (key: TextKey, values?: Record<string, string | number>) => fill(pick(TEXT[key]), values),
    [pick],
  );
  /** 页面自己写的提示：存键而不是成品字符串，切语种后提示跟着换语言。 */
  const note = useCallback(
    (key: TextKey, values?: Record<string, string | number>): Note => ({ key, values }),
    [],
  );
  /** 后端 / 工具链的原文：英文语境下由 `NoteText` 标注「尚未翻译」。 */
  const rawNote = useCallback((text: string): Note => ({ raw: text }), []);
  /** 把一段 `Note` 渲染成当前语种的文字（给 `title`、拼接串这类非 JSX 位置用）。 */
  const noteText = useCallback(
    (item: Note) => ('raw' in item ? item.raw : tr(item.key, item.values)),
    [tr],
  );

  const [searchParams] = useSearchParams();
  /** 来源节点（`?node=`）：只说清「从哪个节点进来的」，**不等于**草稿将要发布的节点 id。 */
  const sourceNodeId = searchParams.get('node');
  const mode = searchParams.get('mode') === 'check' ? 'check' : 'new';
  const nodeRef = useMemo(() => (sourceNodeId ? { node: sourceNodeId, version: '1' } : null), [sourceNodeId]);
  const storageKey = useMemo(() => localDraftKey(sourceNodeId), [sourceNodeId]);

  const ontology = useApi<{ version: string; contentHash: string }>('/ontology');
  const nodeDetail = useApi<NodeDetailResponse>(sourceNodeId ? `/ontology/nodes/${encodeURIComponent(sourceNodeId)}` : null, [sourceNodeId]);
  const ontologyNodes = useApi<{ nodes: Array<{ discipline?: string }> }>('/ontology/nodes?limit=500');
  /**
   * 学科候选值：取自本体里已经用过的学科。它们正是 `data/fields.mjs` 的受控词表
   * （FIELD_IDS），所以给出来的都是发布时会通过的值；用户仍可输入别的，预览会如实报错。
   */
  const disciplineOptions = useMemo(() => {
    const nodes = (ontologyNodes.data as { nodes?: Array<{ discipline?: string }> } | null)?.nodes ?? [];
    return [...new Set(nodes.map((node) => node.discipline).filter((item): item is string => Boolean(item)))].sort((a, b) => a.localeCompare(b, 'zh'));
  }, [ontologyNodes.data]);

  const [step, setStep] = useState<StepId>(mode === 'check' ? 'check' : 'node');
  const [fields, setFields] = useState<DraftFields>(emptyFields);
  const [decisions, setDecisions] = useState<Record<string, ReviewDecision>>({});
  const [includeIds, setIncludeIds] = useState<string[]>([]);
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const [localSavedAt, setLocalSavedAt] = useState<string | null>(null);
  const [message, setMessage] = useState<Note | null>(null);

  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftRevision, setDraftRevision] = useState<number | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftError, setDraftError] = useState<Note | null>(null);
  /** 上一次检查对应的源码快照：用来判断「检查之后又改过」这件事实。 */
  const [validatedSource, setValidatedSource] = useState<Record<SpecSourceKey, string> | null>(null);
  /** 服务端那份草稿的签名：用来判断「本地改动还没保存」这件事实（入库用的是服务端那份）。 */
  const [savedSignature, setSavedSignature] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<FormalCatalogView | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogUnavailable, setCatalogUnavailable] = useState<UnavailableInfo | null>(null);
  const [catalogProblems, setCatalogProblems] = useState<string[]>([]);

  const [budget, setBudget] = useState<DiscoveryBudget>(DEFAULT_BUDGET);
  const [starting, setStarting] = useState(false);
  const [runUnavailable, setRunUnavailable] = useState<UnavailableInfo | null>(null);
  const [runError, setRunError] = useState<Note | null>(null);
  const [replayResults, setReplayResults] = useState<Record<string, ReplayRecord>>({});
  const [replaying, setReplaying] = useState(false);
  const discovery = useDiscoveryRun();
  const run = discovery.run;

  const [validation, setValidation] = useState<ValidateResult | null>(null);
  const [validateUnavailable, setValidateUnavailable] = useState<UnavailableInfo | null>(null);
  const [validateError, setValidateError] = useState<Note | null>(null);
  const [validating, setValidating] = useState(false);

  /** 服务端预览的差异（含三分法）；本地预演只在服务端不可用时顶上。 */
  const [localPreview, setLocalPreview] = useState<PublicationDiff | null>(null);
  const [serverPreview, setServerPreview] = useState<PublicationDiff | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUnavailable, setPreviewUnavailable] = useState<UnavailableInfo | null>(null);
  const [previewError, setPreviewError] = useState<Note | null>(null);
  /**
   * 「哪些候选不入库、为什么」——**只从服务端预览的 `excluded` 名单来**（含 reasonCode）。
   * 用来做两件事：默认勾选把它们排除掉；在审阅面板上单独标出来并写明原因
   * （让用户知道不是系统出错、也不是它不成立）。
   */
  const [exclusionNotes, setExclusionNotes] = useState<Record<string, ExclusionNote>>({});

  const [publishing, setPublishing] = useState(false);
  const [publishUnavailable, setPublishUnavailable] = useState<UnavailableInfo | null>(null);
  const [publishError, setPublishError] = useState<Note | null>(null);
  const [publishOutcome, setPublishOutcome] = useState<PublishOutcome | null>(null);

  const [revisions, setRevisions] = useState<PublicationRevision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(true);
  const [revisionsUnavailable, setRevisionsUnavailable] = useState<UnavailableInfo | null>(null);
  const [revisionsProblems, setRevisionsProblems] = useState<string[]>([]);
  const [revisionsRaw, setRevisionsRaw] = useState<unknown>(null);
  /** 当前生效的扩展包版本，以及本体快照自检报出的「待复核」项。 */
  const [activeRevision, setActiveRevision] = useState<string | null>(null);
  const [revisionIntegrity, setRevisionIntegrity] = useState<string[]>([]);
  const [rollbackPending, setRollbackPending] = useState<string | null>(null);
  const [rollbackError, setRollbackError] = useState<Note | null>(null);
  const [rollbackOutcome, setRollbackOutcome] = useState<PublishOutcome | null>(null);

  const idempotency = useRef<string>(newIdempotencyKey());
  const restoredRef = useRef(false);

  /* ---------------- 草稿：从本地恢复（不依赖学习者档案） ---------------- */

  useEffect(() => {
    restoredRef.current = false;
    const record = readLocalDraft(storageKey);
    if (record) {
      setFields(record.fields);
      setDecisions(record.decisions ?? {});
      setDraftId(record.draftId);
      setDraftRevision(record.draftRevision);
      setValidation(record.validation);
      setValidatedSource(record.validatedSource);
      setRestoredAt(record.savedAt || null);
      setMessage(note('msgRestoredLocal'));
      /*
       * 本地草稿里带着服务端草稿 id 时，顺手把服务端那一份取回来核对修订号与内容：
       * 入库用的是服务端那份，两边不一致必须让用户看见。
       */
      if (record.draftId) {
        const serverDraftId = record.draftId;
        void fetchDraft(serverDraftId).then((server) => {
          if (!server.ok || !server.data) return;
          const serverFields = draftToFields(server.data);
          setDraftRevision(typeof server.data.revision === 'number' ? server.data.revision : null);
          setSavedSignature(draftSignature(serverFields));
        });
      }
    } else {
      setFields(emptyFields());
      setDecisions({});
      setDraftId(null);
      setDraftRevision(null);
      setValidation(null);
      setValidatedSource(null);
      setSavedSignature(null);
      setRestoredAt(null);
    }
    restoredRef.current = true;
    /*
     * 这里**不**把 `localeKey` 写进依赖：本段唯一的取数（`fetchDraft`）拿回来的草稿字段是数据，
     * 与语种无关；而提示文字存的是「键」，切语种时会自己换语言。
     * 反过来把它写进依赖，会让「切语言」重放一次「从本地草稿盖回表单」——刚敲进去、
     * 还没到 600ms 自动保存的那几个字会被吞掉。
     */
  }, [storageKey]);

  // 自动保存：本地草稿始终保存；服务端草稿只在用户按「保存到服务端」时写。
  const debouncedFields = useDebounced(fields, 600);
  const debouncedDecisions = useDebounced(decisions, 600);
  useEffect(() => {
    if (!restoredRef.current) return;
    if (isBlankFields(debouncedFields) && Object.keys(debouncedDecisions).length === 0) return;
    const savedAt = new Date().toISOString();
    const record: LocalDraftRecord = {
      schema: 1,
      key: storageKey,
      fields: debouncedFields,
      draftId,
      draftRevision,
      decisions: debouncedDecisions,
      validation,
      validatedSource,
      savedAt,
    };
    writeLocalDraft(record);
    setLocalSavedAt(savedAt);
  }, [debouncedFields, debouncedDecisions, draftId, draftRevision, storageKey, validation, validatedSource]);

  const patchFields = useCallback((patch: Partial<DraftFields>) => {
    setFields((current) => ({ ...current, ...patch }));
    // 用户一动草稿，待确认的「覆盖」就不再是一次明确的确认（内容已经变了）→ 撤销待确认态。
    setArmedTemplate(null);
  }, []);

  /**
   * 将要发布的节点 id：由名称派生（规则在 `draftNodeId` 里写死）。
   *
   * 为什么必须有它：`draft.spec.node` 为空时关系无处挂靠（入库会被挡下，服务端原话是
   * 「请求里没有节点标识…关系无处挂靠」），发现任务也失去「这份表达属于谁」的依据。
   */
  const nodeId = useMemo(() => draftNodeId(fields.name), [fields.name]);
  /** 上一次**通过检查**时用的节点 id：拿它和当前 id 比，才能说清「id 变了、结果过期了」。 */
  const [checkedNodeId, setCheckedNodeId] = useState<string | null>(null);
  const nodeIdChanged = Boolean(checkedNodeId && nodeId !== checkedNodeId);

  /**
   * 检查之后又改过源码、或节点 id 变了 → 这份结果不再对应当前草稿。
   * 界面要显式说明，并且**不拿它入库**（入库读的是它）。
   */
  const validationStale = useMemo(
    () => isValidationStale(validatedSource, fields) || Boolean(checkedNodeId && checkedNodeId !== nodeId),
    [validatedSource, fields, checkedNodeId, nodeId],
  );

  /**
   * 本地改动还没保存到服务端。
   *
   * 只有「已知服务端那一份长什么样」时才判定（`savedSignature` 非空）：否则无法证明两边不一致，
   * 也就不该给一个可能是假的警告。判为 true 时入库被挡住——入库用的是服务端那份草稿。
   */
  const unsavedChanges = useMemo(
    () => Boolean(draftId && savedSignature !== null && savedSignature !== draftSignature(fields)),
    [draftId, savedSignature, fields],
  );

  /* ---------------- 目录与版本清单 ---------------- */

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    fetchCatalog().then((result) => {
      if (cancelled) return;
      setCatalogLoading(false);
      if (result.ok) {
        setCatalog(result.data);
        setCatalogUnavailable(null);
        setCatalogProblems([]);
        if (result.data.budgets) setBudget(result.data.budgets);
        if (!result.data.languageReady) {
          setCatalogProblems([tr('msgCatalogNoLanguage')]);
        }
      } else {
        setCatalogUnavailable(result.unavailable);
        setCatalogProblems([describeFailure(result.error, result.unavailable)]);
      }
    });
    return () => { cancelled = true; };
    /*
     * `localeKey` 是依赖：目录里的模板标题来自本体，服务端按语种返回，
     * 不把语种写进依赖就会「切到英文后目录还是中文」——不报错，只是静默不对。
     */
  }, [localeKey, tr]);

  const reloadRevisions = useCallback(async () => {
    setRevisionsLoading(true);
    const result = await listRevisions();
    setRevisions(result.revisions);
    setRevisionsUnavailable(result.unavailable);
    setRevisionsProblems(result.problems);
    setRevisionsRaw(result.raw);
    setActiveRevision(result.active);
    setRevisionIntegrity(result.integrityProblems);
    setRevisionsLoading(false);
  }, [localeKey]);

  useEffect(() => { void reloadRevisions(); }, [reloadRevisions]);

  /* ---------------- 模板 ---------------- */

  /**
   * 服务端登记表里的模板：**一条对应一个已登记的形式表达**（不是四案例骨架）。
   * 它带的是真实登记过的内容（含陈述与定义），所以单独一块、用下拉选择，
   * 不与「四案例骨架」混在一起——两者的可信程度不一样。
   */
  const catalogTemplates: AuthoringTemplate[] = useMemo(() => (catalog?.templates ?? [])
    .filter((template) => template.id)
    .map((template) => {
      const draft = template.draft as Partial<AuthoringDraft> | undefined;
      const converted = draft ? draftToFields({
        ...(draft as AuthoringDraft),
        specSource: (draft.specSource ?? { declarations: '', definitions: '', assumptions: '', statement: '', claims: '' }),
      }) : emptyFields();
      return {
        id: template.id,
        case: template.case || converted.case,
        title: template.title || template.id,
        note: template.note,
        fields: converted,
      };
    }), [catalog]);

  const [armedTemplate, setArmedTemplate] = useState<string | null>(null);
  const [pickedTemplateId, setPickedTemplateId] = useState<string>('');

  /**
   * 套用模板。
   *
   * 三种情形分开处理，**提示文字与真实状态必须一致**（上一版的毛病：第一次点击已经套用了，
   * 第二次点击却把「再点一次确认覆盖」写进全局提示，页面上于是留着一条与实际状态矛盾的话）：
   *
   * 1. 草稿字段已经与这套模板一致 → 什么都不做，明说「已经套用过了」；
   * 2. 草稿里有别的内容 → 进入待确认态，确认提示**只画在按钮旁边**（`.authoring-armed`），
   *    不写进全局提示；再点一次才真的覆盖；
   * 3. 草稿是空的 → 直接套用（没什么可覆盖的）。
   */
  function applyTemplate(template: AuthoringTemplate) {
    if (draftSignature(fields) === draftSignature(template.fields)) {
      setArmedTemplate(null);
      setMessage(note('msgTemplateAlreadyApplied', { title: template.title }));
      return;
    }
    if (!isBlankFields(fields) && armedTemplate !== template.id) {
      setArmedTemplate(template.id);
      return;
    }
    setArmedTemplate(null);
    setFields({
      ...template.fields,
      // 学科空着会让「入库预览」永远多一条阻断项（`buildNodeRecord` 要求受控词表里的值）。
      // 案例能推出学科，这里补默认值；用户在表单里随时可以改。
      discipline: template.fields.discipline || caseDiscipline(template.fields.case),
    });
    setMessage(note('msgTemplateApplied', { title: template.title }));
  }

  /* ---------------- 节点页入口带来的上下文 ---------------- */

  const nodeFormalSpec = useMemo(() => {
    const node = nodeDetail.data?.node as (NodeDetailResponse['node'] & { formalSpec?: NodeFormalSpecView | null; hasFormalSpec?: boolean; formalSpecVersion?: string | null }) | undefined;
    return node?.formalSpec ?? null;
  }, [nodeDetail.data]);

  useEffect(() => {
    /*
     * 从节点页进来时把已登记的内容带到草稿里。
     *
     * - `mode=new`（以此为基础创建）：只带名称/摘要/案例；形式表达留空，由用户自己写。
     * - `mode=check`（检查已有形式表达）：**把该节点登记的机器表达抄进草稿**再检查——
     *   这正是这个入口的用途。带 `#` 的说明：抄进草稿是拷贝，不是引用，改动不回写节点。
     * - 本地已有草稿时不覆盖：用户写的东西优先。
     */
    if (!nodeDetail.data || !restoredRef.current) return;
    if (readLocalDraft(storageKey)) return;
    const node = nodeDetail.data.node;
    if (mode === 'check') {
      if (!nodeFormalSpec) return; // 没有既有表达：留在这一步如实说明「没有可检查的对象」。
      /*
       * 后缀「（检查既有表达）」是**数据**不是界面文案，**故意不翻**：它进 `fields.name`，
       * 而 `draftNodeId(name)` 据此派生将要发布的 node id（中文原样保留、不转义）。
       * 按语种给不同后缀，中英两版会对同一个节点产出**不同的 id**，
       * 破坏「中英是同一份本体、同一个版本」这条不变量。
       */
      setFields((current) => ({ ...current, ...specToFieldPatch(nodeFormalSpec), name: current.name || `${node.title}（检查既有表达）` }));
      setMessage(note('msgCopiedSpecForCheck'));
      return;
    }
    setFields((current) => ({
      ...current,
      // 同上一处：`（草稿）` 是数据不是文案，翻了会让中英对同一节点产出不同的 node id。
      name: current.name || `${node.title}（草稿）`,
      summary: current.summary || node.summary || '',
      case: current.case || node.case || 'group',
    }));
    // 只做一次：之后用户改什么都不该被覆盖。
  }, [mode, nodeDetail.data, nodeFormalSpec, storageKey]);

  /* ---------------- 服务端草稿 ---------------- */

  const saveDraft = useCallback(async () => {
    if (!fields.name.trim()) {
      // 编写库要求 name 非空（`草稿需要 name`）：与其等 400，不如在这里说清楚。
      setDraftError(note('msgDraftNameRequired'));
      return;
    }
    setSavingDraft(true);
    setDraftError(null);
    const version = ontology.data?.version ?? null;
    // 归一 spec 只在它与当前源码一致时随草稿保存：检查之后又改过，就不把过期表达存进去。
    const patch: DraftPatch = { ...fieldsToPatch(fields) };
    if (validation && !validationStale) {
      patch.spec = validation.spec;
      patch.validation = validation;
    }
    const result = draftId
      ? await updateDraft(draftId, patch, draftRevision ?? 1, version)
      : await createDraft(fields, version, patch);
    setSavingDraft(false);
    if (!result.ok) {
      setDraftError(rawNote(describeFailure(result.error, result.unavailable)));
      setMessage(draftId
        ? note('msgDraftUpdateFailed')
        : note('msgDraftCreateFailed'));
      return;
    }
    const draft = result.data;
    if (draft && typeof draft.id === 'string') {
      setDraftId(draft.id);
      setDraftRevision(typeof draft.revision === 'number' ? draft.revision : null);
      setSavedSignature(draftSignature(fields));
      setMessage(note('msgDraftSaved', { id: draft.id, revision: draft.revision ?? '?' }));
    } else {
      setMessage(note('msgDraftShapeUnknown'));
    }
  }, [draftId, draftRevision, fields, ontology.data, validation, validationStale]);

  /* ---------------- 检查表达 ---------------- */

  const checkExpression = useCallback(async () => {
    setValidating(true);
    setValidateError(null);
    const result = await validateDraft(fields, { draftId, draftRevision, nodeRef, nodeId });
    setValidating(false);
    if (!result.ok) {
      setValidation(null);
      setValidatedSource(null);
      setCheckedNodeId(null);
      setValidateUnavailable(result.unavailable);
      setValidateError(rawNote(describeFailure(result.error, result.unavailable)));
      return;
    }
    setValidateUnavailable(null);
    setValidation(result.data);
    setValidatedSource(fieldsToSpecSource(fields));
    setCheckedNodeId(nodeId || null);
    setStep('check');
  }, [draftId, draftRevision, fields, nodeId, nodeRef]);

  /* ---------------- 自动发现 ---------------- */

  /**
   * 「现在还不能启动」的**可见**原因清单。
   *
   * 上一版只把这些写在 `title` 里：窄屏和键盘用户看不到 tooltip，于是按钮为什么禁用成了谜。
   * 这里逐条给出来，并且与 `disabled` 用的是同一个数组——不允许「按钮禁用了但页面不解释」。
   */
  const discoveryBlockers = useMemo(() => {
    const blockers: Note[] = [];
    if (!fields.name.trim()) blockers.push(note('blockerName'));
    if (!fields.background.trim()) blockers.push(note('blockerBackground'));
    if (!draftId) blockers.push(note('blockerDraft'));
    if (unsavedChanges) blockers.push(note('blockerUnsaved'));
    if (!validation) blockers.push(note('blockerValidation'));
    else if (validationStale) blockers.push(note('blockerStale'));
    else if (!validation.ok) blockers.push(note('blockerNotOk'));
    return blockers;
  }, [draftId, fields.background, fields.name, note, unsavedChanges, validation, validationStale]);

  const startDiscovery = useCallback(async () => {
    setStarting(true);
    setRunError(null);
    setRunUnavailable(null);
    setReplayResults({});
    // 新的一次运行会有新的候选 id：上一轮预览留下的「不入库」名单不再适用，清掉。
    setExclusionNotes({});
    const result = await startDiscoveryJob({
      draftId,
      draftRevision,
      node: draftId ? null : nodeRef?.node ?? null,
      nodeVersion: draftId ? null : nodeRef?.version ?? null,
      background: fields.background,
      budget,
      ontologyVersion: ontology.data?.version ?? null,
    });
    setStarting(false);
    if (!result.ok) {
      setRunUnavailable(result.unavailable);
      setRunError(rawNote(describeFailure(result.error, result.unavailable)));
      return;
    }
    if (!result.data) {
      setRunError(note('msgRunShapeUnknown'));
      return;
    }
    discovery.setRun(result.data);
    setIncludeIds([]);
    setMessage(note('msgDiscoveryStarted', { id: result.data.id }));
  }, [budget, draftId, draftRevision, discovery, fields.background, nodeRef, note, ontology.data, rawNote]);

  const stopDiscovery = useCallback(async () => {
    if (!run) return;
    const result = await cancelRun(run.id);
    if (!result.ok) { setRunError(rawNote(describeFailure(result.error, result.unavailable))); return; }
    if (result.data) discovery.setRun(result.data);
    setMessage(note('msgCancelRequested'));
  }, [discovery, note, rawNote, run]);

  const replay = useCallback(async (candidateIds: string[]) => {
    if (!run) return;
    setReplaying(true);
    const result = await replayCandidates(run.id, candidateIds);
    setReplaying(false);
    if (!result.ok) {
      setReplayResults((current) => {
        const next = { ...current };
        for (const id of candidateIds) next[id] = { error: describeFailure(result.error, result.unavailable) };
        return next;
      });
      return;
    }
    setReplayResults((current) => {
      const next = { ...current };
      for (const outcome of result.data?.results ?? []) next[outcome.candidateId] = outcome;
      return next;
    });
    // 重放会改写候选的 replay/math 字段：重新取一次任务，别用旧结论糊过去。
    discovery.refresh();
  }, [discovery, run]);

  /* ---------------- 审阅决策与纳入 ---------------- */

  const candidates: CandidateView[] = run?.candidates ?? [];

  const decide = useCallback((candidateId: string, decision: ReviewDecision) => {
    setDecisions((current) => {
      const next = { ...current };
      if (decision === null) delete next[candidateId];
      else next[candidateId] = decision;
      return next;
    });
    if (decision === 'accepted') {
      setIncludeIds((current) => (current.includes(candidateId) ? current : [...current, candidateId]));
    }
    if (decision === 'dismissed') {
      setIncludeIds((current) => current.filter((id) => id !== candidateId));
    }
  }, []);

  /** 服务端已经判过「不入库」的候选 id：默认勾选与采纳范围都要排除它们。 */
  const excludedIds = useMemo(() => new Set(Object.keys(exclusionNotes)), [exclusionNotes]);

  // 新的一批结果到达时，把**可入库**的已验证候选默认勾进「本次入库范围」——用户仍可逐条取消。
  // 判据集中在 `isPublishable()`：不可入库的候选（例如只存在于登记表里的概念锚点）默认不勾，
  // 免得整批提交被服务端挡下。
  useEffect(() => {
    const publishable = candidates.filter((candidate) => isPublishable(candidate, excludedIds)).map((candidate) => candidate.id);
    setIncludeIds((current) => {
      const kept = current.filter((id) => publishable.includes(id));
      const added = publishable.filter((id) => !kept.includes(id));
      return added.length === 0 && kept.length === current.length ? current : [...kept, ...added];
    });
  }, [candidates, excludedIds]);

  const toggleInclude = useCallback((candidateId: string, include: boolean) => {
    setIncludeIds((current) => (include ? (current.includes(candidateId) ? current : [...current, candidateId]) : current.filter((id) => id !== candidateId)));
  }, []);

  /* ---------------- 入库预览 ---------------- */

  const acceptedIds = useMemo(
    () => candidates
      .filter((candidate) => isPublishable(candidate, excludedIds) && (decisions[candidate.id] === 'accepted' || includeIds.includes(candidate.id)))
      .map((candidate) => candidate.id),
    [candidates, decisions, includeIds, excludedIds],
  );
  /**
   * 驳回清单只收**当前这次运行**里的候选：换过一次运行之后，旧决策的 id 不在新结果里，
   * 提交时会被服务端判 409（候选不在该任务的结果里）。旧决策不删，只是不计入这一次。
   */
  const dismissedIds = useMemo(() => {
    const inRun = new Set(candidates.map((candidate) => candidate.id));
    return Object.entries(decisions).filter(([id, value]) => value === 'dismissed' && inRun.has(id)).map(([id]) => id);
  }, [candidates, decisions]);

  /** 属于更早运行结果的审阅决策条数：会显示出来，不静默丢弃。 */
  const staleDecisionCount = useMemo(() => {
    const inRun = new Set(candidates.map((candidate) => candidate.id));
    return Object.keys(decisions).filter((id) => !inRun.has(id)).length;
  }, [candidates, decisions]);

  const digest = useMemo(() => reviewDigest(acceptedIds, dismissedIds, draftRevision), [acceptedIds, dismissedIds, draftRevision]);

  const runPreview = useCallback(async () => {
    setPreviewError(null);
    setPreviewUnavailable(null);
    setPreviewLoading(true);
    const result = await previewPublication({
      draftId,
      draftRevision,
      runId: run?.id ?? null,
      acceptedCandidateIds: acceptedIds,
      dismissedCandidateIds: dismissedIds,
      reviewDigest: digest,
      idempotencyKey: idempotency.current,
      notes: null,
      ontologyVersion: ontology.data?.version ?? null,
    });
    setPreviewLoading(false);
    if (!result.ok) {
      setServerPreview(null);
      setPreviewUnavailable(result.unavailable);
      setPreviewError(rawNote(describeFailure(result.error, result.unavailable)));
      // 服务端预览不可用不是「没有变更」：用本地预演顶上，并明确标出它不是承诺。
      setLocalPreview(buildLocalPreview({ fields, nodeRef, candidates, includeIds: acceptedIds }));
      return;
    }
    const diff = result.data?.diff ?? null;
    setServerPreview(diff);
    setLocalPreview(null);
    /*
     * 服务端的三分法里，`excluded` 是**明确不入库**的一类（概念锚点等）。
     * 拿到它之后：① 记下原因，审阅面板与勾选清单都据此标注；② 把它从「本次入库范围」里去掉，
     * 免得用户下一次提交又撞上同一批（它们不会阻断其余内容，但留着只会让人以为能发出去）。
     * 判据全部来自服务端字段，前端不猜 id 前缀。
     */
    if (diff) {
      const notes = excludedReasonsFrom(diff);
      setExclusionNotes(notes);
      const removed = Object.keys(notes).filter((id) => includeIds.includes(id));
      if (removed.length > 0) {
        setIncludeIds((current) => current.filter((id) => !notes[id]));
        setMessage(note('msgExcludedRemoved', { n: removed.length }));
      }
    }
  }, [acceptedIds, candidates, digest, dismissedIds, draftId, draftRevision, fields, includeIds, nodeRef, note, ontology.data, rawNote, run]);

  const activePreview = serverPreview ?? localPreview;

  /* ---------------- 入库与回滚 ---------------- */

  const publish = useCallback(async () => {
    setPublishing(true);
    setPublishError(null);
    setPublishUnavailable(null);
    const result = await commitPublication({
      draftId,
      draftRevision,
      runId: run?.id ?? null,
      acceptedCandidateIds: acceptedIds,
      dismissedCandidateIds: dismissedIds,
      reviewDigest: digest,
      idempotencyKey: idempotency.current,
      notes: null,
      ontologyVersion: ontology.data?.version ?? null,
    });
    setPublishing(false);
    if (!result.ok) {
      setPublishUnavailable(result.unavailable);
      setPublishError(rawNote(describeFailure(result.error, result.unavailable)));
      return;
    }
    const data = result.data;
    setPublishOutcome({
      revisionId: data?.revision?.id ?? null,
      ontologyVersion: data?.ontologyVersion ?? null,
      summary: data?.revision
        ? tr('msgPublishSummary', {
          nodes: data.revision.summary.nodes,
          relations: data.revision.summary.relations,
          evidence: data.revision.summary.evidence,
          definitions: data.revision.summary.definitions,
          contracts: data.revision.summary.contracts,
        })
        : tr('msgPublishSummaryMissing'),
    });
    idempotency.current = newIdempotencyKey();
    void reloadRevisions();
    /*
     * 入库切了本体版本：不刷新的话，页面上那个「本体版本」是旧的，
     * 下一次写操作（保存草稿、再预览）会被服务端判 409（版本冲突）——那是**对的行为**，
     * 但对用户来说像是"刚入库完就坏了"。所以这里把快照重新取一次。
     */
    ontology.reload();
    setMessage(note('msgPublished'));
  }, [acceptedIds, digest, dismissedIds, draftId, draftRevision, note, ontology, reloadRevisions, run, tr]);

  const rollback = useCallback(async (revisionId: string) => {
    setRollbackPending(revisionId);
    setRollbackError(null);
    const result = await rollbackPublication(revisionId, { idempotencyKey: newIdempotencyKey(), ontologyVersion: ontology.data?.version ?? null });
    setRollbackPending(null);
    if (!result.ok) { setRollbackError(rawNote(describeFailure(result.error, result.unavailable))); return; }
    setRollbackOutcome({
      revisionId: result.data?.revision?.id ?? null,
      ontologyVersion: result.data?.ontologyVersion ?? null,
      summary: tr('msgRolledBack', { id: revisionId }),
    });
    void reloadRevisions();
  }, [ontology.data, rawNote, reloadRevisions, tr]);

  /* ---------------- 顶部状态 ---------------- */

  const notReadyReasons = useMemo(() => {
    const reasons: string[] = [];
    if (catalog && !catalog.languageReady) reasons.push(tr('reasonParser'));
    if (runUnavailable) reasons.push(tr('reasonDiscovery', { specifier: runUnavailable.specifier ?? tr('moduleNotLoaded') }));
    if (previewUnavailable || publishUnavailable) reasons.push(tr('reasonPublish', { specifier: (previewUnavailable ?? publishUnavailable)?.specifier ?? tr('moduleNotLoaded') }));
    if (revisionsUnavailable) reasons.push(tr('reasonRevisions', { specifier: revisionsUnavailable.specifier ?? tr('moduleNotLoaded') }));
    if (draftError) reasons.push(tr('reasonDraftStore'));
    return reasons;
  }, [catalog, draftError, previewUnavailable, publishUnavailable, revisionsUnavailable, runUnavailable, tr]);

  const statementState = pending(fields.statement);
  /** 下拉里选中的已登记模板：说明与「有没有说明」都按它判断。 */
  const pickedTemplate = catalogTemplates.find((template) => template.id === pickedTemplateId);

  return (
    <div className="page authoring-page">
      <div className="section-heading">
        <h1>{tr('pageTitle')}</h1>
        <p>
          {tr('leadA')}<strong>{tr('leadStrong')}</strong>{tr('leadB')}
          {AUTHORING_CASES.map((item) => labels.caseLabel(item)).join(tr('listSeparator'))}
          {tr('leadC')}
        </p>
        <p className="muted">
          {tr('leadNoteA')}<strong>{tr('leadNoteStrong')}</strong>{tr('leadNoteB')}
        </p>
      </div>

      {notReadyReasons.length > 0 && (
        <section className="card authoring-notready">
          <h2>{tr('notReadyTitle')}</h2>
          <p>
            {tr('notReadyBodyA')}{notReadyReasons.length}{tr('notReadyBodyB')}
            {notReadyReasons.map((reason) => <code key={reason}>{reason}</code>)}
          </p>
          <p className="muted">
            {tr('notReadyNoteA')}<strong>{tr('notReadyNoteStrong')}</strong>{tr('notReadyNoteB')}
          </p>
        </section>
      )}

      <nav className="step-rail authoring-steps" aria-label={tr('stepsAria')}>
        {STEPS.map((item, index) => (
          <li key={item.id} className={step === item.id ? 'active' : ''}>
            <button
              type="button"
              className="authoring-step-button"
              aria-current={step === item.id ? 'step' : undefined}
              onClick={() => setStep(item.id)}
            >
              <span className="authoring-step-index">{index + 1}</span>
              <span className="authoring-step-text">
                <strong>{pick(item.label)}</strong>
                <small>{pick(item.hint)}</small>
              </span>
            </button>
          </li>
        ))}
      </nav>

      <section className="card authoring-draftbar" aria-label={tr('draftbarAria')}>
        <div className="authoring-draftbar-main">
          {nodeRef
            ? <span>{tr('sourceNodeLabel')}<code>{nodeRef.node}</code>{nodeDetail.data?.node.title ? tr('parenTitle', { title: nodeDetail.data.node.title }) : ''}</span>
            : <span>{tr('newDraftLabel')}</span>}
          <span className="muted">
            {tr('draftKeyLabel')}<code>{storageKey}</code>
            {localSavedAt ? tr('autosavedAt', { time: fmtDate(localSavedAt, { timeStyle: 'medium' }) }) : tr('notSavedYet')}
            {restoredAt ? tr('restoredAt', { time: fmtDate(restoredAt) }) : ''}
          </span>
        </div>
        <div className="card-actions">
          <button type="button" className="button small" disabled={savingDraft} onClick={saveDraft}>
            {savingDraft ? tr('saving') : draftId ? tr('saveToServer', { revision: draftRevision ?? '?' }) : tr('createServerDraft')}
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              clearLocalDraft(storageKey);
              setFields(emptyFields());
              setDecisions({});
              setLocalSavedAt(null);
              setRestoredAt(null);
              setMessage(note('msgClearedLocal'));
            }}
          >
            {tr('clearLocalDraft')}
          </button>
        </div>
        {unsavedChanges && (
          <p className="error">
            {tr('unsavedA')}<strong>{tr('unsavedStrong')}</strong>{tr('unsavedB')}
          </p>
        )}
        {draftError && <p className="error"><NoteText note={draftError} /></p>}
      </section>

      {message && <p className="notice" role="status"><NoteText note={message} /></p>}

      {/* ---------------- 第 1 步：填写节点 ---------------- */}
      {step === 'node' && (
        <>
          <section className="card">
            <h2>{tr('skeletonTitle')}</h2>
            <p className="hint">
              {tr('skeletonHintA')}<strong>{tr('skeletonHintStrong')}</strong>{tr('skeletonHintB')}<Pending text={PENDING_TEXT} />{tr('skeletonHintC')}
            </p>
            <ul className="authoring-templates">
              {FALLBACK_TEMPLATES.map((template) => (
                <li key={template.id}>
                  <article>
                    <header>
                      <span className="construct">{labels.caseLabel(template.case)}</span>
                      <strong><Pending text={template.title} /></strong>
                    </header>
                    <p className="muted">{template.note ? <Pending text={template.note} /> : tr('templateNoNote')}</p>
                    {/*
                      待确认提示**只画在这里**，不写进全局提示：全局提示说的是「已经发生了什么」，
                      而这条说的是「再点一次会发生什么」。混在一起就会出现「已经套用了、
                      页面上却还留着再点一次确认」的矛盾状态。
                    */}
                    {armedTemplate === template.id && (
                      <p className="authoring-armed" role="status">{tr('armed')}<strong>{tr('armedStrong')}</strong>{tr('armedTail')}</p>
                    )}
                    <div className="card-actions">
                      <button type="button" className={`button small${armedTemplate === template.id ? ' primary' : ''}`} onClick={() => applyTemplate(template)}>
                        {armedTemplate === template.id ? tr('confirmOverwrite') : tr('applySkeleton')}
                      </button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>

            {catalogTemplates.length > 0 && (
              <div className="authoring-registered-templates">
                <h3>{tr('registeredTitle')}<span className="family-count">{tr('registeredCount', { n: catalogTemplates.length })}</span></h3>
                <p className="hint">
                  {tr('registeredHintA')}<strong>{tr('registeredHintStrong')}</strong>{tr('registeredHintB')}
                </p>
                <div className="authoring-template-picker">
                  <label>
                    {tr('pickOne')}
                    <select value={pickedTemplateId} onChange={(event) => setPickedTemplateId(event.target.value)}>
                      <option value="">{tr('notSelected')}</option>
                      {catalogTemplates.map((template) => (
                        /*
                         * 登记模板的标题来自本体登记表（中文数据，不在本文件里）：
                         * `<option>` 里放不下 `<Pending>`（HTML 只允许纯文本），所以用类名标注，
                         * 让英文读者看得出这一条还没有英文标题。
                         */
                        <option
                          key={template.id}
                          value={template.id}
                          className={isPending(template.title) ? 'i18n-pending' : undefined}
                        >
                          {labels.caseLabel(template.case)} · {template.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="button small"
                    disabled={!pickedTemplateId}
                    onClick={() => {
                      const picked = catalogTemplates.find((template) => template.id === pickedTemplateId);
                      if (picked) applyTemplate(picked);
                    }}
                  >
                    {armedTemplate === pickedTemplateId && pickedTemplateId ? tr('confirmApplyRegistered') : tr('applyRegistered')}
                  </button>
                </div>
                {pickedTemplate && (
                  <p className="muted">{pickedTemplate.note ? <Pending text={pickedTemplate.note} /> : tr('templateNoNoteShort')}</p>
                )}
                {pickedTemplateId && armedTemplate === pickedTemplateId && (
                  <p className="authoring-armed" role="status">{tr('armed')}<strong>{tr('armedStrong')}</strong>{tr('armedTail')}</p>
                )}
              </div>
            )}
          </section>

          <section className="card">
            <h2>{tr('basicsTitle')}</h2>
            <div className="authoring-form">
              <label>
                {tr('nameLabel')}
                <input value={fields.name} onChange={(event) => patchFields({ name: event.target.value })} placeholder={tr('namePlaceholder')} />
              </label>
              {/*
                学科：入库的硬要求（`buildNodeRecord`：非空且在受控词表里），所以必须能在这里填。
                候选值取自本体里**已经用过**的学科（它们就是 data/fields.mjs 的 FIELD_IDS），
                再用 datalist 提供——不是写死的下拉，输入别的值也允许，预览会如实报错。
              */}
              <label>
                {tr('disciplineLabel')}
                <input
                  list="authoring-disciplines"
                  value={fields.discipline}
                  onChange={(event) => patchFields({ discipline: event.target.value })}
                  placeholder={tr('disciplinePlaceholder')}
                />
                <datalist id="authoring-disciplines">
                  {disciplineOptions.map((item) => <option key={item} value={item} />)}
                </datalist>
              </label>
              {/*
                将要发布的节点 id：由名称派生，**显示出来**，让用户知道自己在发布成什么。
                名称改了 id 跟着改；如果已经检查过，这里会说明那次检查的结果因此过期。
              */}
              <div className="authoring-node-id">
                <span className="authoring-node-id-label">{tr('nodeIdLabel')}</span>
                {nodeId
                  ? <code data-testid="derived-node-id">{nodeId}</code>
                  : <span className="muted">{tr('nodeIdHintA')}<code>:</code>{tr('nodeIdHintB')}<code>draft:</code>{tr('nodeIdHintC')}</span>}
                <span className="muted">
                  {tr('nodeIdRuleA')}<code>:</code>{tr('nodeIdRuleB')}<code>-</code>{tr('nodeIdRuleC')}<code>draft:</code>{tr('nodeIdRuleD')}
                </span>
                {nodeIdChanged && (
                  <span className="authoring-node-id-changed">
                    {tr('nodeIdChangedA')}<code>{checkedNodeId}</code> → <code>{nodeId}</code>{tr('nodeIdChangedB')}
                  </span>
                )}
              </div>
              <label>
                {tr('constructLabel')}
                <select value={fields.construct} onChange={(event) => patchFields({ construct: event.target.value })}>
                  {CONSTRUCT_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                  {fields.construct && !(CONSTRUCT_OPTIONS as readonly string[]).includes(fields.construct) && (
                    <option value={fields.construct}>{fields.construct}{tr('constructOutside')}</option>
                  )}
                </select>
              </label>
              <label>
                {tr('caseLabel')}
                {/*
                  只列四案例（§2.4 的四个背景对应它们）。
                  这里刻意<strong>不</strong>把案例标签表的键铺成选项：那张表是全站词汇表
                  （含 dg/liang/rudin 等未形式化的案例），铺出来就会出现「选得中却没有对应背景」的死选项。
                  草稿里已经写着其它案例时，单独把它列出来，不静默改写。
                */}
                <select value={fields.case} onChange={(event) => patchFields({ case: event.target.value })}>
                  {AUTHORING_CASES.map((id) => <option key={id} value={id}>{labels.caseLabel(id)}</option>)}
                  {fields.case && !(AUTHORING_CASES as readonly string[]).includes(fields.case) && (
                    <option value={fields.case}>{labels.caseLabel(fields.case)}{tr('caseOutside')}</option>
                  )}
                </select>
              </label>
              <label className="authoring-wide">
                {tr('summaryLabel')}
                <textarea rows={2} value={fields.summary} onChange={(event) => patchFields({ summary: event.target.value })} />
              </label>
              <label className="authoring-wide">
                {tr('readingLabel')}
                <textarea rows={2} value={fields.reading} onChange={(event) => patchFields({ reading: event.target.value })} placeholder={tr('readingPlaceholder', { pending: PENDING_TEXT })} />
              </label>
            </div>
            {sourceNodeId && (
              <div className="authoring-node-source">
                <h3>{tr('sourceSectionTitle')}</h3>
                {nodeDetail.loading && <p className="muted">{tr('loadingNode')}</p>}
                {nodeDetail.error && <p className="error"><NoteText note={rawNote(formatError(nodeDetail.error))} /></p>}
                {nodeDetail.data && (
                  <>
                    <p>
                      <Link to={hrefFor(`/nodes/${encodeURIComponent(sourceNodeId)}`)}>{nodeDetail.data.node.title}</Link>
                      <span className="muted"> · {nodeDetail.data.node.id} · {tr('sourceVersion', { version: nodeDetail.data.node.version })}</span>
                    </p>
                    {nodeDetail.data.node.formalStatement
                      ? (
                        <dl className="facts compact">
                          <div><dt>{tr('registeredFormalStatement')}</dt><dd><code>{nodeDetail.data.node.formalStatement.tex}</code></dd></div>
                          <div><dt>{tr('readingTerm')}</dt><dd>{nodeDetail.data.node.formalStatement.reading ? <Pending text={nodeDetail.data.node.formalStatement.reading} /> : PENDING_TEXT}</dd></div>
                          <div><dt>{tr('evidenceLabelTerm')}</dt><dd>{nodeDetail.data.node.formalStatement.label}</dd></div>
                        </dl>
                      )
                      : <p className="muted">{tr('noHumanStatementA')}<code>formalStatement</code>{tr('noHumanStatementB')}</p>}
                    {nodeFormalSpec
                      ? (
                        <div className="authoring-existingspec">
                          <p className="notice">
                            {tr('existingSpecA')}<code>formalSpec</code>{tr('existingSpecB', { version: nodeFormalSpec.specVersion ?? tr('notReturned') })}
                            <code>{nodeFormalSpec.background ?? tr('notReturned')}</code>{tr('existingSpecC')}
                          </p>
                          <pre className="pub-raw">{JSON.stringify(nodeFormalSpec, null, 2)}</pre>
                          <div className="card-actions">
                            <button
                              type="button"
                              className="button small"
                              onClick={() => {
                                const spec = nodeFormalSpec;
                                patchFields(specToFieldPatch(spec));
                                setMessage(note('msgCopiedSpec'));
                              }}
                            >
                              {tr('copySpec')}
                            </button>
                          </div>
                        </div>
                      )
                      : <p className="muted">{tr('noMachineSpecA')}<code>formalSpec</code>{tr('noMachineSpecB')}</p>}
                  </>
                )}
              </div>
            )}
          </section>

          <section className="card">
            <h2>{tr('formalTitle')}</h2>
            <FormalSpecEditor
              fields={fields}
              onChange={patchFields}
              catalog={catalog}
              catalogLoading={catalogLoading}
              catalogProblems={catalogProblems}
              catalogUnavailable={catalogUnavailable}
              problems={validation?.problems ?? []}
              validation={validation}
              validationStale={validationStale}
              validateUnavailable={validateUnavailable}
              showProblems={false}
            />
          </section>

          <div className="authoring-nav">
            <button type="button" className="button primary" onClick={() => setStep('check')}>{tr('nextCheck')}</button>
          </div>
        </>
      )}

      {/* ---------------- 第 2 步：检查表达 ---------------- */}
      {step === 'check' && (
        <>
          <section className="card">
            <h2>{tr('checkTitle')}</h2>
            <p className="hint">
              {tr('checkHintA')}<code>POST /formal/validate</code>{tr('checkHintB')}<strong>{tr('checkHintStrong')}</strong>{tr('checkHintC')}
            </p>
            <div className="card-actions">
              <button type="button" className="button primary" disabled={validating} onClick={checkExpression}>
                {validating ? tr('checking') : tr('checkTitle')}
              </button>
              {validation && <span className="muted">{tr('lastCheck', { result: validation.ok ? tr('passed') : tr('problemCount', { n: validation.problems.length }) })}</span>}
            </div>
            {/*
              「检查已有形式表达」这个入口进来的用户，最想先知道的是「这个节点到底有没有既有表达」。
              有就列出它的版本与背景；没有就明说没有——不拿草稿冒充「已有表达」。
            */}
            {sourceNodeId && (
              <p className="muted">
                {tr('sourceNodeLabel')}<Link to={hrefFor(`/nodes/${encodeURIComponent(sourceNodeId)}`)}><code>{sourceNodeId}</code></Link>
                {nodeDetail.loading && tr('readingNode')}
                {nodeDetail.data && (
                  nodeFormalSpec
                    ? <>{tr('checkSourceSpecA')}<code>formalSpec</code>{tr('checkSourceSpecB', { version: nodeFormalSpec.specVersion ?? tr('notReturned') })}<code>{nodeFormalSpec.background ?? tr('notReturned')}</code>{tr('checkSourceSpecC')}<strong>{tr('copyStrong')}</strong>{tr('checkSourceSpecD')}</>
                    : <>{tr('checkSourceNoSpecA')}<code>formalSpec</code>{tr('checkSourceNoSpecB')}</>
                )}
              </p>
            )}
            {validateError && <p className="error"><NoteText note={validateError} /></p>}
            {statementState.pending && <p className="muted">{tr('statementEmpty')}</p>}
          </section>

          <section className="card">
            <h2>{tr('formalWithErrors')}</h2>
            <FormalSpecEditor
              fields={fields}
              onChange={patchFields}
              catalog={catalog}
              catalogLoading={catalogLoading}
              catalogProblems={catalogProblems}
              catalogUnavailable={catalogUnavailable}
              problems={validation?.problems ?? []}
              validation={validation}
              validationStale={validationStale}
              validateUnavailable={validateUnavailable}
              showProblems
            />
          </section>

          <section className="card authoring-boundary">
            <h2>{tr('boundaryTitle')}</h2>
            <ul>
              <li>{tr('abilityYes')}</li>
              <li>{tr('abilityNo')}</li>
              <li>{tr('abilityKernelA')}<code>kernelFormallyVerified</code>{tr('abilityKernelB')}</li>
            </ul>
          </section>

          <div className="authoring-nav">
            <button type="button" className="button" onClick={() => setStep('node')}>{tr('prev')}</button>
            <button type="button" className="button primary" onClick={() => setStep('discover')}>{tr('nextDiscover')}</button>
          </div>
        </>
      )}

      {/* ---------------- 第 3 步：自动发现 ---------------- */}
      {step === 'discover' && (
        <>
          <section className="card">
            <h2>{tr('runSettingsTitle')}</h2>
            <p className="hint">
              {tr('runSettingsHintA')}<strong>{tr('runSettingsHintStrong')}</strong>{tr('runSettingsHintB')}
            </p>
            <dl className="facts compact">
              <div><dt>{tr('draftTerm')}</dt><dd>{draftId ? <><code>{draftId}</code> · {tr('revisionInline', { revision: draftRevision ?? '?' })}</> : <span className="muted">{tr('notSavedToServer')}</span>}</dd></div>
              <div><dt>{tr('nodeIdTerm')}</dt><dd>{nodeId ? <code>{nodeId}</code> : <span className="muted">{tr('noNameNoId')}</span>}</dd></div>
              <div><dt>{tr('backgroundTerm')}</dt><dd>{fields.background ? <code>{fields.background}</code> : <span className="muted">{tr('noBackground')}</span>}</dd></div>
              <div><dt>{tr('ontologyVersionTerm')}</dt><dd>{ontology.data?.version ? <code>{ontology.data.version}</code> : <span className="muted">{tr('notFetched')}</span>}</dd></div>
            </dl>
            <div className="authoring-budget">
              <label>{tr('maxCandidates')}<input type="number" min={1} value={budget.maxCandidates} onChange={(event) => setBudget({ ...budget, maxCandidates: Number(event.target.value) || 1 })} /></label>
              <label>{tr('perCandidateMs')}<input type="number" min={1} value={budget.perCandidateMs} onChange={(event) => setBudget({ ...budget, perCandidateMs: Number(event.target.value) || 1 })} /></label>
              <label>{tr('totalMs')}<input type="number" min={1} value={budget.totalMs} onChange={(event) => setBudget({ ...budget, totalMs: Number(event.target.value) || 1 })} /></label>
              <label>{tr('depth')}<input type="number" min={1} value={budget.depth} onChange={(event) => setBudget({ ...budget, depth: Number(event.target.value) || 1 })} /></label>
              <label>{tr('maxStates')}<input type="number" min={1} value={budget.maxStates} onChange={(event) => setBudget({ ...budget, maxStates: Number(event.target.value) || 1 })} /></label>
            </div>
            {/* 禁用原因写成可见文字：窄屏与键盘用户看不到 title 里的 tooltip。 */}
            {discoveryBlockers.length > 0 && (
              <div className="authoring-blockers">
                <strong>{tr('blockersTitle')}</strong>
                <ul>{discoveryBlockers.map((item) => <li key={noteText(item)}><NoteText note={item} /></li>)}</ul>
              </div>
            )}
            <div className="card-actions">
              <button
                type="button"
                className="button primary"
                disabled={starting || discovery.polling || discoveryBlockers.length > 0}
                title={discoveryBlockers.length > 0
                  ? tr('needMore', { list: discoveryBlockers.map((item) => noteText(item)).join(tr('blockerSeparator')) })
                  : tr('startTitle')}
                onClick={startDiscovery}
              >
                {starting ? tr('starting') : discovery.polling ? tr('taskRunning') : tr('startDiscovery')}
              </button>
              {discovery.polling && <button type="button" className="button" onClick={stopDiscovery}>{tr('requestCancel')}</button>}
            </div>
            {unsavedChanges && (
              <p className="error">
                {tr('unsavedRunA')}<strong>{tr('unsavedRunStrong')}</strong>{tr('unsavedRunB')}
              </p>
            )}
            {!draftId && <p className="muted">{tr('localOnlyHint')}</p>}
            {run && (
              <p className="muted">
                {tr('runLabel')}<code>{run.id}</code>{tr('statusLabel')}<strong>{run.status}</strong>
                {run.status === 'running' || run.status === 'queued' ? tr('backgroundPolling') : ''}
              </p>
            )}
            {runUnavailable && (
              <p className="error">
                {tr('startFailed')}{runUnavailable.kind === 'module' ? tr('notReadyShort') : runUnavailable.message}
                {runUnavailable.specifier ? tr('moduleInline', { specifier: runUnavailable.specifier }) : ''}
                {runUnavailable.reason ? tr('reasonInline', { reason: runUnavailable.reason }) : ''}
                <br />{tr('startFailedTail')}
              </p>
            )}
            {runError && !runUnavailable && <p className="error"><NoteText note={runError} /></p>}
            {discovery.error && <p className="muted">{tr('pollingNote', { message: discovery.error })}</p>}
          </section>

          {run && (
            <section className="card">
              <h2>{tr('taskStatusTitle')}</h2>
              <p>
                {tr('taskLabel')}<code>{run.id}</code>{tr('statusLabel')}<strong>{run.status}</strong>
                {run.interrupted && <span className="muted">{tr('interruptedNote')}</span>}
              </p>
              <p className="muted">
                {tr('runStats', {
                  candidates: run.stats.candidates,
                  covered: run.stats.coveredNodes,
                  verified: run.stats.verified,
                  refuted: run.stats.refuted,
                  undecided: run.stats.undecided,
                  unprocessed: run.stats.unprocessed,
                  duration: run.stats.durationMs,
                })}
              </p>
              <div className="card-actions">
                <button type="button" className="button small" onClick={() => discovery.refresh()}>{tr('refreshRun')}</button>
                {run.candidates.length > 0 && <button type="button" className="button small primary" onClick={() => setStep('review')}>{tr('goReviewCount', { n: run.candidates.length })}</button>}
              </div>
            </section>
          )}

          <div className="authoring-nav">
            <button type="button" className="button" onClick={() => setStep('check')}>{tr('prev')}</button>
            <button type="button" className="button primary" onClick={() => setStep('review')}>{tr('nextReview')}</button>
          </div>
        </>
      )}

      {/* ---------------- 第 4 步：审阅结果 ---------------- */}
      {step === 'review' && (
        <>
          <RelationReviewPanel
            run={run}
            candidates={candidates}
            decisions={decisions}
            onDecide={decide}
            onReplay={replay}
            replaying={replaying}
            replayResults={replayResults}
            runError={runError ? noteText(runError) : null}
            polling={discovery.polling}
            exclusionNotes={exclusionNotes}
          />
          {staleDecisionCount > 0 && (
            <p className="muted">
              {tr('staleDecisions', { n: staleDecisionCount })}
            </p>
          )}
          <div className="authoring-nav">
            <button type="button" className="button" onClick={() => setStep('discover')}>{tr('prev')}</button>
            <button type="button" className="button primary" onClick={() => setStep('preview')}>{tr('nextPreview')}</button>
          </div>
        </>
      )}

      {/* ---------------- 第 5 步：入库预览 ---------------- */}
      {step === 'preview' && (
        <>
          <PublicationPreview
            part="preview"
            fields={fields}
            nodeRef={nodeRef}
            candidates={candidates}
            decisions={decisions}
            includeIds={includeIds}
            onToggleInclude={toggleInclude}
            preview={activePreview}
            previewLoading={previewLoading}
            previewUnavailable={previewUnavailable}
            previewError={previewError ? noteText(previewError) : null}
            onPreview={runPreview}
            draftId={draftId}
            draftRevision={draftRevision}
            ontologyVersion={ontology.data?.version ?? null}
            reviewDigestValue={digest}
            idempotencyKey={idempotency.current}
            acceptedCount={acceptedIds.length}
            dismissedCount={dismissedIds.length}
            validation={validation ? { ok: validation.ok, stale: validationStale } : null}
            unsavedChanges={unsavedChanges}
            exclusionNotes={exclusionNotes}
            publishing={publishing}
            publishUnavailable={publishUnavailable}
            publishError={publishError ? noteText(publishError) : null}
            publishOutcome={publishOutcome}
            onPublish={publish}
            revisions={revisions}
            revisionsLoading={revisionsLoading}
            revisionsUnavailable={revisionsUnavailable}
            revisionsProblems={revisionsProblems}
            revisionsRaw={revisionsRaw}
            activeRevision={activeRevision}
            revisionIntegrity={revisionIntegrity}
            onRollback={rollback}
            rollbackPending={rollbackPending}
            rollbackError={rollbackError ? noteText(rollbackError) : null}
            rollbackOutcome={rollbackOutcome}
            onGoReview={() => setStep('review')}
          />
          <div className="authoring-nav">
            <button type="button" className="button" onClick={() => setStep('review')}>{tr('prev')}</button>
            <button type="button" className="button primary" onClick={() => setStep('publish')}>{tr('nextPublish')}</button>
          </div>
        </>
      )}

      {/* ---------------- 第 6 步：确认入库与回滚 ---------------- */}
      {step === 'publish' && (
        <>
          <PublicationPreview
            part="publish"
            fields={fields}
            nodeRef={nodeRef}
            candidates={candidates}
            decisions={decisions}
            includeIds={includeIds}
            onToggleInclude={toggleInclude}
            preview={activePreview}
            previewLoading={previewLoading}
            previewUnavailable={previewUnavailable}
            previewError={previewError ? noteText(previewError) : null}
            onPreview={runPreview}
            draftId={draftId}
            draftRevision={draftRevision}
            ontologyVersion={ontology.data?.version ?? null}
            reviewDigestValue={digest}
            idempotencyKey={idempotency.current}
            acceptedCount={acceptedIds.length}
            dismissedCount={dismissedIds.length}
            validation={validation ? { ok: validation.ok, stale: validationStale } : null}
            unsavedChanges={unsavedChanges}
            exclusionNotes={exclusionNotes}
            publishing={publishing}
            publishUnavailable={publishUnavailable}
            publishError={publishError ? noteText(publishError) : null}
            publishOutcome={publishOutcome}
            onPublish={publish}
            revisions={revisions}
            revisionsLoading={revisionsLoading}
            revisionsUnavailable={revisionsUnavailable}
            revisionsProblems={revisionsProblems}
            revisionsRaw={revisionsRaw}
            activeRevision={activeRevision}
            revisionIntegrity={revisionIntegrity}
            onRollback={rollback}
            rollbackPending={rollbackPending}
            rollbackError={rollbackError ? noteText(rollbackError) : null}
            rollbackOutcome={rollbackOutcome}
            onGoReview={() => setStep('review')}
          />
          <div className="authoring-nav">
            <button type="button" className="button" onClick={() => setStep('preview')}>{tr('prev')}</button>
            <Link className="button ghost" to={hrefFor('/network')}>{tr('toNetwork')}</Link>
          </div>
        </>
      )}

      <section className="card authoring-boundaries">
        <h2>{tr('boundariesTitle')}</h2>
        <ul>{FLOW_BOUNDARIES.map((item) => <li key={item}><Pending text={item} /></li>)}</ul>
      </section>
    </div>
  );
}
