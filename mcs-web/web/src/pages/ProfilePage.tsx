import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, formatError, useApi } from '../api';
import { useProfileContext } from '../state';
import { useLearningData } from '../useLearningData';
import { LearningGuide } from '../components/LearningGuide';
import { StatusBadge } from '../components/StatusBadge';
import { ProgressBar } from '../components/ProgressBar';
import { ReviewQueue } from '../components/ReviewQueue';
import { ReviewPanel } from './ReviewPage';
import { useI18n } from '../i18n';
// `useLabels` 住在 `i18n/useLabels.tsx`：`labels.ts` 是纯数据表，不准 import React
// （它被纯 Node 测试直接 import，目录导入会让那些测试整体失败）。
import { useLabels } from '../i18n/useLabels';
import { deriveStartingNodes, startingNodeBasis } from '../starting-nodes';
import type { EventView, NodeSummary, NoteView, ProfileTemplateView, ProfileTemplatesResponse, ProfileView } from '../types';

/** 成对文案：中文是源语言（**逐字不变**），英文是译文。取用走 `useI18n().pick`。 */
interface Pair<T = string> { zh: T; en: T }

/**
 * 事件类型选项。
 *
 * `unknown` 不是合法事件类型（EVENT_KINDS 里没有它），服务端会返回
 * BAD_REQUEST「未知事件类型 unknown」；「标为尚未确认」的正确写法是
 * kind=confirmation 且 payload.confirmed=false。
 */
const KINDS: Array<{ value: string; label: Pair }> = [
  { value: 'confirmation', label: { zh: '确认可用', en: 'Confirm usable' } },
  { value: 'not-confirmed', label: { zh: '标为尚未确认', en: 'Mark as not yet confirmed' } },
  { value: 'answer', label: { zh: '记录一次作答', en: 'Record an answer' } },
  { value: 'misconception', label: { zh: '登记误区实例', en: 'Record a misconception instance' } },
  { value: 'mastery_estimate', label: { zh: '登记能力估计', en: 'Record an ability estimate' } },
];

/** 分区标签。`id` 是查询串里的键，**不翻译**；只翻显示名。 */
const TABS: Array<{ id: string; label: Pair }> = [
  { id: 'overview', label: { zh: '学习概览', en: 'Overview' } },
  { id: 'review', label: { zh: '待回看', en: 'To review' } },
  { id: 'notes', label: { zh: '我的笔记', en: 'My notes' } },
  { id: 'advanced', label: { zh: '高级设置', en: 'Advanced' } },
];

/**
 * 误区模式的显示名。
 *
 * 这些 id 是**本体节点**，界面优先用本体里的标题（服务端按 `?locale=` 下发）——
 * 这里的中文是本体还没取回来时的回落值，与节点标题逐字一致；英文同样优先用本体译文。
 */
const PATTERNS: Array<{ id: string; label: Pair }> = [
  { id: 'limit:pattern-never-equal', label: { zh: '收敛序列各项都不等于极限', en: 'Every term of a convergent sequence differs from its limit' } },
  { id: 'tensor:pattern-index-array', label: { zh: '所有指标数组都是张量', en: 'Every array of indices is a tensor' } },
  { id: 'group:pattern-all-commutative', label: { zh: '所有群都交换', en: 'Every group is commutative' } },
];

/**
 * 页面自己的长文案（手册 §1：页面文案放本页，不往 `messages.ts` 堆）。
 *
 * 需要插值的写成成对函数（两边同签名）。中文值都等于改造前的字面量，
 * 因此中文渲染逐字不变；英文缺哪一句就会在类型上露出来（`pick` 要求两边同型）。
 */
const TEXT = {
  title: { zh: '我的学习', en: 'My learning' },
  intro: {
    zh: '档案、事件与笔记保存在本机数据库；公共本体 M 的哈希不因任何学习、遗忘、答错或切换档案而改变。',
    en: 'Profiles, events and notes live in the local database; the hash of the public ontology M never changes because you study, forget, answer wrongly or switch profiles.',
  },
  noProfileLead: { zh: '还没有选择档案。', en: 'No profile is selected yet.' },
  noProfileLink: { zh: '先直接阅读', en: 'Read first' },
  noProfileTail: {
    zh: '也可以；需要保存进度、笔记或作答时，在下方新建一个档案。',
    en: ' — you can also read first and create a profile below when you want to save progress, notes or answers.',
  },
  tabsAria: { zh: '我的学习分区', en: 'Sections of My learning' },
  progress: { zh: '学习进度', en: 'Learning progress' },
  progressHint: {
    zh: '已读不等于已掌握；确认可用才进入背景下拉。这里不给百分比——掌握程度没有被校准过。',
    en: 'Read is not the same as mastered; only “confirm usable” enters the background list. No percentage is shown here — mastery has not been calibrated.',
  },
  review: { zh: '待回看', en: 'To review' },
  reviewMore: {
    zh: (count: number) => `还有 ${count} 条，去待回看全部`,
    en: (count: number) => `${count} more — open the full review list`,
  },
  reviewEmpty: {
    zh: '还没有待回看的内容。读过或确认过的节点会出现在这里。',
    en: 'Nothing to review yet. Nodes you have read or confirmed appear here.',
  },
  ready: { zh: '现在可以新学', en: 'Ready to learn next' },
  readyHint: {
    zh: '引入条件已全部确认可用；列表由已登记的行动契约派生，不预测学习效果。',
    en: 'All introducing conditions are confirmed usable; the list is derived from registered action contracts and does not predict learning outcomes.',
  },
  readyIntroducedBy: {
    zh: (actionTitle: string) => `由「${actionTitle}」引入`,
    en: (actionTitle: string) => `Introduced by “${actionTitle}”`,
  },
  recentNotes: { zh: '最近笔记', en: 'Recent notes' },
  allNotes: { zh: '全部笔记', en: 'All notes' },
  notesEmpty: {
    zh: '选择或新建档案后，这里显示你的笔记。',
    en: 'Select or create a profile and your notes appear here.',
  },
  loading: { zh: '加载中…', en: 'Loading…' },

  profileCard: { zh: '档案（E）', en: 'Profiles (E)' },
  newProfilePlaceholder: { zh: '新档案名称', en: 'New profile name' },
  createProfile: { zh: '新建档案', en: 'Create profile' },
  deleteProfile: { zh: '删除当前档案', en: 'Delete current profile' },
  newProfileNote: {
    zh: '新档案从未指定开始：没有自动的“已掌握”或“不会”。演示学习者会单独标记为 demo。',
    en: 'A new profile starts from “never specified”: nothing is automatically “mastered” or “not known”. Demo learners are marked separately as demo.',
  },

  /* —— 档案模板（2026-10 加）—— */
  templateLabel: { zh: '档案模板', en: 'Profile template' },
  /*
   * 「学习概览」上还没有档案时给的一键建档案（2026-10 加，用户反馈「没看见学习者档案」之后）。
   * 默认那两份档案也由同一个接口建出来（`node scripts/seed-default-profiles.mjs`），
   * 因此这里建出来的与下拉里直接看到的是同一种东西。
   */
  quickCreateTitle: { zh: '用默认模板建一份档案', en: 'Create a profile from a default template' },
  quickCreateHint: {
    zh: '两个默认模板各自声明了「这个阶段通常已经学过」的背景接口节点（只声明背景，不声明本站要教的内容，也不是测评）。建好之后，前置已确认的节点会在「起始节点」里列出来，网络视图上带绿色描边。也可以到「高级设置」里自己命名、逐条看依据。',
    en: 'Each default template declares the background-interface nodes that this stage normally covers (background only — nothing this site is meant to teach, and no assessment). Once created, the nodes whose prerequisites are confirmed appear under “Starting nodes”, outlined in green in the network view. You can also name your own profile and read every basis entry under “Advanced”.',
  },
  quickCreateDeclares: {
    zh: (count: number) => `声明 ${count} 个背景节点，可逐条改`,
    en: (count: number) => `Declares ${count} background node(s), each editable`,
  },
  templateHint: {
    zh: '模板只声明背景接口节点（本站对环境边界的显式声明），选完立刻写进这份档案的确认记录——「起始节点」因此扩大。它不预设任何本站要教的内容，也不是测评结论；逐条依据列在下面，建好之后可以在事件时间线里看到每一条。',
    en: 'A template declares only background-interface nodes (this site’s explicit statements about the environment boundary). Choosing one writes those confirmations into this profile right away, which widens the set of starting nodes. It assumes nothing that this site is meant to teach, and it is not an assessment; the basis for each entry is listed below, and every entry shows up in the event timeline afterwards.',
  },
  templateStage: { zh: (stage: string) => `阶段：${stage}`, en: (stage: string) => `Stage: ${stage}` },
  templateDeclares: {
    zh: (count: number) => `它会声明 ${count} 个背景节点（逐条依据）`,
    en: (count: number) => `It declares ${count} background node(s), with the basis for each`,
  },
  templateDeclaresNone: { zh: '它不声明任何节点：起始节点只剩不需要前置的那些。', en: 'It declares no node at all: starting nodes are then only those with no prerequisites.' },
  templateSource: {
    zh: (name: string, count: number) => `当前档案从模板「${name}」开出，模板写入了 ${count} 条确认声明（来源 system · profile-template）。`,
    en: (name: string, count: number) => `This profile was created from the template “${name}”, which wrote ${count} confirmation declaration(s) (source system · profile-template).`,
  },
  templateSourceManual: {
    zh: '当前档案没有模板声明：它从一个空白档案开始，所有确认都是你自己做的。',
    en: 'This profile has no template declaration: it started blank, and every confirmation is your own.',
  },
  templateCreated: {
    zh: (name: string, template: string, count: number) => `已创建档案 ${name}（模板「${template}」，写入 ${count} 条背景声明）。`,
    en: (name: string, template: string, count: number) => `Profile ${name} created (template “${template}”, ${count} background declaration(s) written).`,
  },

  /* —— 起始节点（2026-10 加）—— */
  startingTitle: { zh: '起始节点', en: 'Starting nodes' },
  startingHint: {
    zh: '按已登记的前置关系（行动契约的全部输入 + 指向它的 hardPrereq 来源）看，这些节点的前置都已经在你的档案里确认过，可以直接开始；没有任何行动能产出的背景接口也算——它只能由你自己声明。依据是你的确认记录，不是本站测出的能力，也不是难度排序。',
    en: 'Every registered prerequisite of these nodes (all inputs of an action contract, plus the sources of incoming hardPrereq relations) is already confirmed in your profile, so you can begin here; background interfaces, which no action can produce, also count, since only you can declare them. This rests on your confirmation records — it is neither a measurement of ability nor a difficulty ranking.',
  },
  startingRoot: { zh: '没有任何行动能产出它，只能由你自己声明。', en: 'No action produces it; only you can declare it.' },
  startingVia: {
    zh: (action: string) => `行动「${action}」的输入都已确认。`,
    en: (action: string) => `Every input of the action “${action}” is confirmed.`,
  },
  startingViaNone: { zh: '引入它的行动没有登记输入。', en: 'The action introducing it registers no input.' },
  startingMore: {
    zh: (count: number) => `还有 ${count} 个起始节点，去网络视图里看全部（起始节点在画布上有绿色描边与「起始」徽标）。`,
    en: (count: number) => `${count} more starting node(s) — see them all in the network view, where starting nodes carry a green outline and a “Start” badge.`,
  },
  startingNetwork: { zh: '在网络视图里看这些起始节点', en: 'See these starting nodes in the network view' },
  startingAllConfirmed: {
    zh: '当前没有起始节点：本体里的节点要么已经确认过，要么还缺前置。',
    en: 'There is no starting node right now: every node is either already confirmed or still missing a prerequisite.',
  },
  dataCard: { zh: '数据与备份', en: 'Data and backups' },
  dataHint: {
    zh: '这些是维护动作，不是学习动作。学习记录只写在本机数据库里。',
    en: 'These are maintenance actions, not learning actions. Learning records are written only to the local database.',
  },
  dbFile: { zh: '数据库', en: 'Database' },
  dbCounts: { zh: '档案 / 事件 / 笔记', en: 'Profiles / events / notes' },
  mHash: { zh: 'M 哈希（只读）', en: 'M hash (read-only)' },
  versionRuntime: { zh: '本体版本 / 运行时', en: 'Ontology version / runtime' },
  writeBoundary: {
    zh: '学习、作答、笔记与辅导反馈只写入外部模型 E，不改变公共本体。',
    en: 'Study, answers, notes and tutoring feedback are written only to the external model E; the public ontology is untouched.',
  },
  advancedSummary: { zh: '导入、导出与恢复（高级）', en: 'Import, export and restore (advanced)' },
  exportProfile: { zh: '导出当前档案 JSON', en: 'Export current profile as JSON' },
  importProfile: { zh: '导入档案 JSON', en: 'Import profile JSON' },
  backupDatabase: { zh: '备份整个数据库', en: 'Back up the whole database' },
  restoreLabel: { zh: '备份文件路径（仅允许本机备份目录）', en: 'Backup file path (local backup directory only)' },
  restore: { zh: '从该备份恢复', en: 'Restore from this backup' },

  eventsCard: { zh: '追加外部事件', en: 'Append an external event' },
  eventsHint: {
    zh: '事件是外部模型的观察或声明；确认、作答与掌握估计分开记录，答对不会自动确认整个节点。',
    en: 'Events are observations or declarations of the external model; confirmation, answers and mastery estimates are recorded separately — a correct answer does not automatically confirm the whole node.',
  },
  dimensionPlaceholder: { zh: '能力维度', en: 'Ability dimension' },
  answerPlaceholder: { zh: '作答内容', en: 'Answer text' },
  valuePlaceholder: { zh: '数值（0–1）', en: 'Value (0–1)' },
  notePlaceholder: { zh: '说明（可选）', en: 'Note (optional)' },
  addEvent: { zh: '追加事件', en: 'Append event' },
  timeline: { zh: '事件时间线', en: 'Event timeline' },
  colTime: { zh: '时间', en: 'Time' },
  colKind: { zh: '类型', en: 'Kind' },
  colNode: { zh: '节点', en: 'Node' },
  colSource: { zh: '来源', en: 'Source' },
  colContent: { zh: '内容', en: 'Content' },

  /* —— 写操作之后的状态提示 —— */
  created: {
    zh: (name: string) => `已创建档案 ${name}（从未指定开始）。`,
    en: (name: string) => `Profile ${name} created (starts from “never specified”).`,
  },
  eventAdded: {
    zh: '事件已追加到 E。浏览与作答不会自动改写 M。',
    en: 'Event appended to E. Browsing and answering never rewrite M.',
  },
  profileDeleted: { zh: '档案已删除；公共本体 M 未改变。', en: 'Profile deleted; the public ontology M is unchanged.' },
  imported: {
    zh: (skipped: number) => `导入完成；跳过 ${skipped} 项。`,
    en: (skipped: number) => `Import finished; ${skipped} item(s) skipped.`,
  },
  backupWritten: {
    zh: (path: string) => `备份已写入：${path}`,
    en: (path: string) => `Backup written to ${path}`,
  },
  restored: {
    zh: '恢复完成；页面需重新加载当前档案数据。',
    en: 'Restore finished; the page needs to reload the current profile data.',
  },
  deleteConfirm: {
    zh: '删除该档案及其事件与笔记？此操作不可撤销。',
    en: 'Delete this profile with its events and notes? This cannot be undone.',
  },
  defaultNotConfirmedReason: {
    zh: '外部记录标为尚未确认',
    en: 'Marked as not yet confirmed in an external record',
  },

  /* —— 事件内容摘要（`EventPayload`）—— */
  payloadConfirmed: { zh: '确认可用', en: 'Confirm usable' },
  payloadNotConfirmed: { zh: '尚未确认', en: 'Not yet confirmed' },
  reasonPrefix: { zh: (value: string) => `原因：${value}`, en: (value: string) => `Reason: ${value}` },
  dimensionPrefix: { zh: (value: string) => `维度：${value}`, en: (value: string) => `Dimension: ${value}` },
  valuePrefix: { zh: (value: string) => `取值：${value}`, en: (value: string) => `Value: ${value}` },
  patternPrefix: { zh: (value: string) => `误区模式：${value}`, en: (value: string) => `Misconception pattern: ${value}` },
  reviewRecord: { zh: '回看记录', en: 'Review record' },
  readRecord: { zh: '阅读记录', en: 'Reading record' },
  evidenceStatusPrefix: { zh: (value: string) => `证据状态：${value}`, en: (value: string) => `Evidence status: ${value}` },
  noTextFields: { zh: '（无文本字段）', en: '(no text fields)' },
  rawRecord: { zh: '原始记录', en: 'Raw record' },

  /* —— 笔记列表（`ProfileNotes`）—— */
  notesNoneYet: {
    zh: '还没有笔记。读完一个节点后，在节点页写下自己的话。',
    en: 'No notes yet. After reading a node, write your own words on its page.',
  },
  noLinkedNode: { zh: '未关联节点', en: 'No linked node' },
  moreNotes: {
    zh: (count: number) => `还有 ${count} 条笔记，见「我的笔记」标签。`,
    en: (count: number) => `${count} more note(s) — see the “My notes” tab.`,
  },
};

/**
 * 我的学习。
 *
 * 默认只给学习相关的内容（进度、可以学什么、待回看、笔记）；
 * 档案管理、事件追加、导入导出与备份这些维护动作收进「高级设置」，
 * 本体哈希与运行时版本也从侧栏搬到这里，避免占着主导航的注意力。
 */
export function ProfilePage() {
  const { t, pick, fmtDate, isPending, hrefFor, locale } = useI18n();
  const labels = useLabels();
  const { profiles, profileId, setProfileId, refreshProfiles, health } = useProfileContext();
  const learningData = useLearningData();
  const { progress, graph, theta, reload: reloadLearning } = learningData;
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';
  const events = useApi<{ events: EventView[] }>(profileId ? `/profiles/${profileId}/events?limit=200` : null, [profileId]);
  const nodes = useApi<{ nodes: NodeSummary[] }>('/ontology/nodes?limit=500');
  /*
   * 档案模板（2026-10 加）：清单来自服务端（公共只读），界面不抄一份节点清单——
   * 抄一份就会漂：加一个背景接口、改一条依据，界面上那份还是旧的。
   */
  const templates = useApi<ProfileTemplatesResponse>('/profile-templates');
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [eventType, setEventType] = useState('confirmation');
  const [eventNode, setEventNode] = useState('bg:real:metric');
  const [eventText, setEventText] = useState('');
  const [dimension, setDimension] = useState('定义陈述');
  const [patternId, setPatternId] = useState('limit:pattern-never-equal');
  const [message, setMessage] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const [restorePath, setRestorePath] = useState('');

  useEffect(() => { if (!eventNode && nodes.data?.nodes.length) setEventNode(nodes.data.nodes[0].id); }, [nodes.data, eventNode]);
  // 模板清单回来之前先不选：`defaultTemplateId` 由服务端给（缺省是「什么都不假设」那一项）。
  const templateList = templates.data?.templates ?? [];
  useEffect(() => {
    if (templateId || !templates.data) return;
    setTemplateId(templates.data.defaultTemplateId || templateList[0]?.id || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates.data, templateId]);
  const activeTemplate: ProfileTemplateView | null = templateList.find((item) => item.id === templateId) ?? null;

  /**
   * 当前档案的模板来源：从事件里读，不另存一份。
   *
   * 事件的 `source.ref` 是 `profile-template:<id>`，`payload.template` 也带着 id。
   * 用事件而不是档案行，是因为导出、备份、迁移带着事件走——跟着行反而会在某条路径上漂掉。
   */
  const templateMarks = useMemo(
    () => (events.data?.events ?? []).filter((event) => typeof event.source?.ref === 'string' && event.source.ref.startsWith('profile-template:')),
    [events.data],
  );
  const templateMarkId = templateMarks[0]?.source?.ref?.slice('profile-template:'.length) ?? null;
  const templateMarkName = templateList.find((item) => item.id === templateMarkId)?.name ?? null;

  /**
   * 起始节点（2026-10 加）：与网络页同一个派生（`web/src/starting-nodes.ts`），
   * 输入是同一份本体投影与同一份 θ。两处不各写一遍判据——那是漂移的来源。
   */
  const startingReport = useMemo(
    () => (graph ? deriveStartingNodes({ nodes: graph.nodes, actions: graph.actions, relations: graph.relations, theta }) : null),
    [graph, theta],
  );

  function selectTab(next: string) {
    const params = new URLSearchParams(window.location.search);
    if (next === 'overview') params.delete('tab'); else params.set('tab', next);
    setParams(params);
  }

  /**
   * 建档案（唯一的实现）。
   *
   * 三个调用点：高级设置里的表单（名字 + 模板下拉）、「学习概览」上没有档案时的一键建档案、
   * 以及这两处的回执——它们必须是同一套语义（选了模板却写进去 0 条，与「建了一个空档案」
   * 在界面上要长得不一样，`failed` 逐条附原因，不吞）。
   *
   * `template` 传 null 与「不选模板」等价（服务端落到 `blank`，一个确认都不预设）。
   */
  async function createProfileWith(rawName: string, template: string | null) {
    const trimmed = rawName.trim();
    if (!trimmed) return;
    try {
      const result = await api<{
        profile: ProfileView;
        template: { id: string; name: { zh: string; en: string } } | null;
        declared: Array<{ node: string }>;
        failed: Array<{ node: string; reason: string }>;
      }>('/profiles', { method: 'POST', body: { name: trimmed, template: template || undefined } });
      setName('');
      await refreshProfiles();
      setProfileId(result.profile.id);
      const templateName = result.template ? pick(result.template.name) : '';
      const base = result.declared.length > 0
        ? pick(TEXT.templateCreated)(result.profile.name, templateName, result.declared.length)
        : pick(TEXT.created)(result.profile.name);
      setMessage(result.failed.length > 0
        ? `${base} ${result.failed.map((item) => `${item.node}：${item.reason}`).join('；')}`
        : base);
    } catch (error) { setMessage(formatError(error)); }
  }

  async function createProfile() {
    await createProfileWith(name, templateId || null);
  }

  /**
   * 一键用某个模板建档案（「学习概览」上还没有档案时给的两个按钮）。
   *
   * 档案名用**模板的中文名**（数据里存的是源语言名字，与 `seed-default-profiles.mjs`
   * 建出来的那两份一致），界面上显示的才是当前语种的名字。
   */
  async function createFromTemplate(template: ProfileTemplateView) {
    await createProfileWith(template.name.zh, template.id);
  }

  async function addEvent() {
    if (!profileId) return;
    const payload: Record<string, unknown> = {};
    // 「标为尚未确认」= confirmation + confirmed:false（adaptation 据此进入 θ.unknown）。
    const kind = eventType === 'not-confirmed' ? 'confirmation' : eventType;
    if (eventType === 'confirmation') payload.confirmed = true;
    if (eventType === 'not-confirmed') { payload.confirmed = false; payload.reason = eventText || pick(TEXT.defaultNotConfirmedReason); }
    if (kind === 'answer') payload.text = eventText;
    if (kind === 'misconception') { payload.patternId = patternId; payload.uncertainty = 'unknown'; }
    if (kind === 'mastery_estimate') { payload.dimension = dimension; payload.value = Number(eventText || 0.5); }
    try {
      await api(`/profiles/${profileId}/events`, { method: 'POST', body: { event: { eventId: `ui-${Date.now()}`, kind, nodeId: eventNode, payload } } });
      setEventText('');
      events.reload();
      await refreshProfiles();
      setMessage(pick(TEXT.eventAdded));
    } catch (error) { setMessage(formatError(error)); }
  }

  async function deleteProfile() {
    if (!profileId || !window.confirm(pick(TEXT.deleteConfirm))) return;
    try {
      await api('/profiles/' + profileId, { method: 'DELETE' });
      setMessage(pick(TEXT.profileDeleted));
      setProfileId(null);
      await refreshProfiles();
    } catch (error) { setMessage(formatError(error)); }
  }

  async function exportProfile() {
    if (!profileId) return;
    try {
      const bundle = await api<Record<string, unknown>>(`/profiles/${profileId}/export`);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `mcs-profile-${profileId}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) { setMessage(formatError(error)); }
  }

  async function importProfile(file: File) {
    try {
      const bundle = JSON.parse(await file.text());
      const result = await api<{ profile: ProfileView; skipped: unknown[] }>('/import', { method: 'POST', body: { bundle } });
      await refreshProfiles();
      setProfileId(result.profile.id);
      setMessage(pick(TEXT.imported)(result.skipped.length));
    } catch (error) { setMessage(formatError(error)); }
  }

  async function backup() {
    try {
      const result = await api<{ backup: string }>('/backup', { method: 'POST', body: {} });
      setRestorePath(result.backup);
      setMessage(pick(TEXT.backupWritten)(result.backup));
    } catch (error) { setMessage(formatError(error)); }
  }

  async function restore() {
    try {
      await api('/restore', { method: 'POST', body: { backup: restorePath } });
      await refreshProfiles();
      setMessage(pick(TEXT.restored));
    } catch (error) { setMessage(formatError(error)); }
  }

  const titleOf = (nodeId: string) => graph?.nodes.find((node) => node.id === nodeId)?.title ?? nodes.data?.nodes.find((node) => node.id === nodeId)?.title ?? nodeId;

  /**
   * 误区模式的显示名：**优先用本体里的标题**（服务端按语种下发），
   * 取不到时才回落到页面文案；本体还没译时按 `isPending` 标注，不假装已翻译。
   */
  const patternLabel = (id: string) => {
    const fromOntology = graph?.nodes.find((node) => node.id === id)?.title
      ?? nodes.data?.nodes.find((node) => node.id === id)?.title;
    return fromOntology ?? pick(PATTERNS.find((item) => item.id === id)?.label ?? { zh: id, en: id });
  };

  return (
    <div className="page profile-page">
      <div className="section-heading">
        <h1>{pick(TEXT.title)}</h1>
        <p>{pick(TEXT.intro)}</p>
      </div>
      {message && <p className="notice" role="status">{message}</p>}

      {!profileId && (
        <section className="card no-profile-card">
          <p className="notice">
            {pick(TEXT.noProfileLead)}<Link to={hrefFor('/nodes')}>{pick(TEXT.noProfileLink)}</Link>{pick(TEXT.noProfileTail)}
          </p>
          {/*
            默认档案（2026-10 加）：用户找「学习者档案」时看的是下拉与这一页，
            而模板原先只在「高级设置」里——反馈正是「没看见学习者档案」。
            因此在这一页最显眼的位置直接给出一键建档案：这两个按钮建出来的档案，
            与 `scripts/seed-default-profiles.mjs` 建的是同一种（同一个接口、同一串事件）。
          */}
          <h2>{pick(TEXT.quickCreateTitle)}</h2>
          <p className="hint">{pick(TEXT.quickCreateHint)}</p>
          <div className="template-quick-list">
            {templateList.filter((item) => item.declares.length > 0).map((item) => (
              <button key={item.id} type="button" className="button template-quick" onClick={() => createFromTemplate(item)}>
                <strong>{pick(item.name)}</strong>
                <span>{pick(item.stage)}</span>
                <span className="muted">{pick(TEXT.quickCreateDeclares)(item.declares.length)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="tab-bar" role="tablist" aria-label={pick(TEXT.tabsAria)}>
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'tab active' : 'tab'}
            onClick={() => selectTab(id)}
          >
            {pick(label)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <section className="card">
            <h2>{pick(TEXT.progress)}</h2>
            {progress ? <ProgressBar counts={progress.counts} /> : <p>{pick(TEXT.loading)}</p>}
            <p className="hint">{pick(TEXT.progressHint)}</p>
          </section>

          {/* 档案级学习方案与开始学习、路线、节点页共享；近期预览带条件，真实可学只依据 θ。 */}
          <LearningGuide learning={learningData} compact />

          {/*
            起始节点（2026-10 加）：这是「我的学习」里唯一一处把**前置已确认**这件事
            直接摊开的地方。口径与网络页完全同源（同一个派生函数），因此两处不会说岔。
          */}
          <section className="card starting-card">
            <h2>{pick(TEXT.startingTitle)}</h2>
            <p className="hint">{pick(TEXT.startingHint)}</p>
            {!startingReport ? (
              <p className="muted">{pick(TEXT.loading)}</p>
            ) : startingReport.entries.length === 0 ? (
              <p className="muted">{pick(TEXT.startingAllConfirmed)}</p>
            ) : (
              <>
                <ul className="starting-list">
                  {startingReport.entries.slice(0, 8).map((entry) => (
                    <li key={entry.node} data-starting-kind={entry.kind}>
                      <Link
                        to={hrefFor(`/nodes/${encodeURIComponent(entry.node)}`)}
                        className={isPending(titleOf(entry.node)) ? 'i18n-pending' : undefined}
                        title={startingNodeBasis(entry, titleOf, locale)}
                      >
                        {titleOf(entry.node)}
                      </Link>
                      <StatusBadge status="known" label={pick(TEXT.startingTitle)} title={startingNodeBasis(entry, titleOf, locale)} />
                      <span className="muted">
                        {entry.kind === 'root'
                          ? pick(TEXT.startingRoot)
                          : entry.actionTitle
                            ? pick(TEXT.startingVia)(entry.actionTitle)
                            : pick(TEXT.startingViaNone)}
                      </span>
                    </li>
                  ))}
                </ul>
                {startingReport.entries.length > 8 && (
                  <p className="muted">{pick(TEXT.startingMore)(startingReport.entries.length - 8)}</p>
                )}
                <div className="card-actions">
                  <Link className="button small" to={hrefFor('/network')}>{pick(TEXT.startingNetwork)}</Link>
                </div>
              </>
            )}
          </section>

          <section className="card">
            <h2>{pick(TEXT.review)}</h2>
            {progress && progress.reviewQueue.length > 0 ? (
              <>
                <ReviewQueue items={progress.reviewQueue.slice(0, 3)} profileId={profileId} onChanged={reloadLearning} />
                {progress.reviewQueue.length > 3 && (
                  <button className="link-button" onClick={() => selectTab('review')}>{pick(TEXT.reviewMore)(progress.reviewQueue.length - 3)}</button>
                )}
              </>
            ) : <p className="muted">{pick(TEXT.reviewEmpty)}</p>}
          </section>

          {progress && progress.ready.length > 0 && (
            <section className="card">
              <h2>{pick(TEXT.ready)}</h2>
              <p className="hint">{pick(TEXT.readyHint)}</p>
              <ul className="ready-list">
                {progress.ready.slice(0, 5).map((entry) => (
                  <li key={entry.node}>
                    <Link
                      to={hrefFor(`/nodes/${encodeURIComponent(entry.node)}`)}
                      className={isPending(titleOf(entry.node)) ? 'i18n-pending' : undefined}
                      title={isPending(titleOf(entry.node)) ? t('i18n.pendingTitle') : undefined}
                    >
                      {titleOf(entry.node)}
                    </Link>
                    <span className={`muted${isPending(entry.actionTitle) ? ' i18n-pending' : ''}`}>{pick(TEXT.readyIntroducedBy)(entry.actionTitle)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card">
            <h2>{pick(TEXT.recentNotes)}</h2>
            {profileId ? <ProfileNotes profileId={profileId} limit={3} titleOf={titleOf} /> : <p className="muted">{pick(TEXT.notesEmpty)}</p>}
          </section>
        </>
      )}

      {tab === 'review' && <ReviewPanel />}

      {tab === 'notes' && (
        <section className="card">
          <h2>{pick(TEXT.allNotes)}</h2>
          {profileId ? <ProfileNotes profileId={profileId} titleOf={titleOf} /> : <p className="muted">{pick(TEXT.notesEmpty)}</p>}
        </section>
      )}

      {tab === 'advanced' && (
        <>
          <div className="two-column">
            <section className="card">
              <h2>{pick(TEXT.profileCard)}</h2>
              <ul className="profile-list">
                {profiles.map((profile) => (
                  <li key={profile.id} className={profile.id === profileId ? 'selected' : ''}>
                    {/* `data-i18n-keep`：档案名是学习者自己的数据（E 层），不是界面文案，不参与翻译。 */}
                    <button className="link-button" data-i18n-keep onClick={() => setProfileId(profile.id)}>{profile.name}</button>
                    <span>rev {profile.revision} · {profile.kind}</span>
                  </li>
                ))}
              </ul>
              <div className="inline-form">
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder={pick(TEXT.newProfilePlaceholder)} />
                <label className="profile-template-picker">
                  {pick(TEXT.templateLabel)}
                  <select
                    value={templateId}
                    onChange={(event) => setTemplateId(event.target.value)}
                    aria-label={pick(TEXT.templateLabel)}
                    disabled={templateList.length === 0}
                  >
                    {templateList.map((item) => (
                      <option key={item.id} value={item.id}>{pick(item.name)}</option>
                    ))}
                  </select>
                </label>
                <button className="button primary" onClick={createProfile}>{pick(TEXT.createProfile)}</button>
              </div>
              {/*
                模板的全部内容都摆在这里：它会声明哪几个背景节点、每条的依据是什么。
                用户要求「建立一份默认的学习者档案模版」，因此模板不能是一个只有名字的下拉框——
                「高一」这三个字本身不说明任何事，说明白的是它声明了什么、凭什么。
              */}
              {activeTemplate && (
                <div className="profile-template-preview">
                  <p className="hint">{pick(TEXT.templateHint)}</p>
                  <p className="muted">{pick(TEXT.templateStage)(pick(activeTemplate.stage))}</p>
                  <p>{pick(activeTemplate.summary)}</p>
                  {activeTemplate.declares.length === 0 ? (
                    <p className="muted">{pick(TEXT.templateDeclaresNone)}</p>
                  ) : (
                    <details>
                      <summary>{pick(TEXT.templateDeclares)(activeTemplate.declares.length)}</summary>
                      <ul className="template-declares">
                        {activeTemplate.declares.map((item) => (
                          <li key={item.node}>
                            <Link
                              to={hrefFor(`/nodes/${encodeURIComponent(item.node)}`)}
                              className={isPending(item.title) ? 'i18n-pending' : undefined}
                              title={isPending(item.title) ? t('i18n.pendingTitle') : undefined}
                            >
                              {item.title}
                            </Link>
                            <span className="muted">{pick(item.basis)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <p className="muted">{pick(activeTemplate.note)}</p>
                </div>
              )}
              {profileId && (
                <p className="hint template-source">
                  {templateMarkId && templateMarkName
                    ? pick(TEXT.templateSource)(pick(templateMarkName), templateMarks.length)
                    : pick(TEXT.templateSourceManual)}
                </p>
              )}
              {profileId && <div className="card-actions"><button className="button" onClick={deleteProfile}>{pick(TEXT.deleteProfile)}</button></div>}
              <p className="muted">{pick(TEXT.newProfileNote)}</p>
            </section>

            <section className="card">
              <h2>{pick(TEXT.dataCard)}</h2>
              <p className="hint">{pick(TEXT.dataHint)}</p>
              <dl className="facts compact">
                <div><dt>{pick(TEXT.dbFile)}</dt><dd>{health?.db.file ?? '—'}</dd></div>
                <div><dt>{pick(TEXT.dbCounts)}</dt><dd>{health?.db.profiles ?? 0} / {health?.db.events ?? 0} / {health?.db.notes ?? 0}</dd></div>
                <div><dt>{pick(TEXT.mHash)}</dt><dd><code>{health?.ontology.contentHash ?? '—'}</code></dd></div>
                <div><dt>{pick(TEXT.versionRuntime)}</dt><dd>{health ? `${health.ontology.version} · Node ${health.runtime.node}` : '—'}</dd></div>
              </dl>
              <p className="muted">{pick(TEXT.writeBoundary)}</p>
              <details className="plan-advanced">
                <summary>{pick(TEXT.advancedSummary)}</summary>
                <div className="card-actions advanced-actions">
                  <button className="button" disabled={!profileId} onClick={exportProfile}>{pick(TEXT.exportProfile)}</button>
                  <button className="button" onClick={() => importRef.current?.click()}>{pick(TEXT.importProfile)}</button>
                  <button className="button" onClick={backup}>{pick(TEXT.backupDatabase)}</button>
                  <input ref={importRef} type="file" accept="application/json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) importProfile(file); }} />
                </div>
                <label className="params">{pick(TEXT.restoreLabel)}<input value={restorePath} onChange={(event) => setRestorePath(event.target.value)} /></label>
                <button className="button" disabled={!restorePath} onClick={restore}>{pick(TEXT.restore)}</button>
              </details>
            </section>
          </div>

          {profileId && (
            <>
              <section className="card">
                <h2>{pick(TEXT.eventsCard)}</h2>
                <p className="muted">{pick(TEXT.eventsHint)}</p>
                <div className="inline-form">
                  <select value={eventType} onChange={(event) => setEventType(event.target.value)}>
                    {KINDS.map(({ value, label }) => <option key={value} value={value}>{pick(label)}</option>)}
                  </select>
                  <select value={eventNode} onChange={(event) => setEventNode(event.target.value)}>
                    {(nodes.data?.nodes ?? []).map((node) => (
                      <option
                        key={node.id}
                        value={node.id}
                        className={isPending(node.title) ? 'i18n-pending' : undefined}
                        title={isPending(node.title) ? t('i18n.pendingTitle') : undefined}
                      >
                        {node.title}
                      </option>
                    ))}
                  </select>
                  {eventType === 'misconception' && (
                    <select value={patternId} onChange={(event) => setPatternId(event.target.value)}>
                      {PATTERNS.map(({ id }) => {
                        const label = patternLabel(id);
                        return (
                          <option
                            key={id}
                            value={id}
                            className={isPending(label) ? 'i18n-pending' : undefined}
                            title={isPending(label) ? t('i18n.pendingTitle') : undefined}
                          >
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  )}
                  {eventType === 'mastery_estimate' && <input value={dimension} onChange={(event) => setDimension(event.target.value)} placeholder={pick(TEXT.dimensionPlaceholder)} />}
                  {eventType !== 'misconception' && <input value={eventText} onChange={(event) => setEventText(event.target.value)} placeholder={eventType === 'answer' ? pick(TEXT.answerPlaceholder) : eventType === 'mastery_estimate' ? pick(TEXT.valuePlaceholder) : pick(TEXT.notePlaceholder)} />}
                  <button className="button primary" onClick={addEvent}>{pick(TEXT.addEvent)}</button>
                </div>
              </section>

              <section className="card">
                <h2>{pick(TEXT.timeline)}</h2>
                {events.loading && <p>{pick(TEXT.loading)}</p>}
                {events.error && <p className="error">{formatError(events.error)}</p>}
                <table className="data-table">
                  <thead><tr><th>{pick(TEXT.colTime)}</th><th>{pick(TEXT.colKind)}</th><th>{pick(TEXT.colNode)}</th><th>{pick(TEXT.colSource)}</th><th>{pick(TEXT.colContent)}</th></tr></thead>
                  <tbody>
                    {[...(events.data?.events ?? [])].reverse().map((event) => (
                      <tr key={event.eventId}>
                        <td>{fmtDate(event.occurredAt)}</td>
                        <td><StatusBadge status={event.kind} label={labels.eventKindLabel(event.kind)} title={event.kind} /></td>
                        <td>
                          <Link
                            to={hrefFor(`/nodes/${encodeURIComponent(event.nodeId)}`)}
                            className={isPending(titleOf(event.nodeId)) ? 'i18n-pending' : undefined}
                            title={isPending(titleOf(event.nodeId)) ? t('i18n.pendingTitle') : event.nodeId}
                          >
                            {titleOf(event.nodeId)}
                          </Link>
                        </td>
                        <td>{event.source.kind}</td>
                        <td><EventPayload event={event} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

/** 事件内容：先给可读摘要，原始 JSON 折叠保留，便于核查而不淹没学习者。 */
function EventPayload({ event }: { event: EventView }) {
  const { pick } = useI18n();
  const payload = event.payload ?? {};
  const parts: string[] = [];
  if (typeof payload.confirmed === 'boolean') parts.push(pick(payload.confirmed ? TEXT.payloadConfirmed : TEXT.payloadNotConfirmed));
  if (typeof payload.text === 'string' && payload.text.trim()) parts.push(payload.text.trim());
  if (typeof payload.reason === 'string' && payload.reason.trim()) parts.push(pick(TEXT.reasonPrefix)(payload.reason.trim()));
  if (typeof payload.dimension === 'string') parts.push(pick(TEXT.dimensionPrefix)(payload.dimension));
  if (typeof payload.value === 'number' || typeof payload.value === 'string') parts.push(pick(TEXT.valuePrefix)(String(payload.value)));
  if (typeof payload.patternId === 'string') parts.push(pick(TEXT.patternPrefix)(payload.patternId));
  if (typeof payload.context === 'string') parts.push(payload.context === 'review' ? pick(TEXT.reviewRecord) : pick(TEXT.readRecord));
  if (typeof payload.evidence_status === 'string') parts.push(pick(TEXT.evidenceStatusPrefix)(payload.evidence_status));
  const summary = parts.join(' · ') || pick(TEXT.noTextFields);
  return (
    <div className="event-payload">
      <span>{summary.length > 140 ? `${summary.slice(0, 140)}…` : summary}</span>
      <details><summary>{pick(TEXT.rawRecord)}</summary><pre>{JSON.stringify(payload, null, 2)}</pre></details>
    </div>
  );
}

function ProfileNotes({ profileId, limit, titleOf }: { profileId: string; limit?: number; titleOf?: (id: string) => string }) {
  const { pick, fmtDate } = useI18n();
  const notes = useApi<{ notes: NoteView[] }>(`/profiles/${profileId}/notes`, [profileId]);
  if (notes.loading) return <p>{pick(TEXT.loading)}</p>;
  if (notes.error) return <p className="error">{formatError(notes.error)}</p>;
  if (!notes.data?.notes.length) return <p>{pick(TEXT.notesNoneYet)}</p>;
  const list = limit ? notes.data.notes.slice(0, limit) : notes.data.notes;
  return (
    <div className="notes-list">
      {list.map((note) => (
        <article key={note.noteId}>
          <header>
            <strong>{note.title}</strong>
            <span>{note.nodeId ? (titleOf ? titleOf(note.nodeId) : note.nodeId) : pick(TEXT.noLinkedNode)}</span>
            <time>{fmtDate(note.updatedAt)}</time>
          </header>
          <p>{note.body}</p>
        </article>
      ))}
      {limit && notes.data.notes.length > limit && <p className="muted">{pick(TEXT.moreNotes)(notes.data.notes.length - limit)}</p>}
    </div>
  );
}
