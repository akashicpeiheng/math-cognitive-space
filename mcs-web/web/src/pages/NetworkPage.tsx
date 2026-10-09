import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, formatError, useApi } from '../api';
import { LOCAL_VIEWS_KEY, migrateLocalViews, readLocalViews, writeLocalViews, type SavedNetworkView } from '../network-views';
import { StatusBadge } from '../components/StatusBadge';
import { useDraggablePanel, type PanelPosition } from '../useDraggablePanel';
import { THEME } from '../theme';
import {
  CASE_LABELS, CONSTRUCT_COLOR, CONSTRUCT_LABELS, RELATION_COLOR, contractModeColor, plainMathText,
} from '../labels';
import { useI18n, useLabels } from '../i18n';
import type { Locale } from '../i18n/locales';
import { buildFacet, relationKindHint } from '../facets';
import {
  DEFAULT_FAMILIES, EDGE_FAMILY_LABELS, NODE_GROUP_ORDER,
  applyOverrides, autoAddCandidates, avoidOverlaps, buildEdges, degreeMap, edgeAnchor, edgeFamilyLabel,
  edgeFamilyNote, groupOfNode, layout, nodeGroupLabel, nodeGroupNote,
  reasonText, recommend, relationKindsPresent, topicAssignment, TOPIC_NONE_COLOR, TOPIC_PALETTE,
  mergeParallelEdges, visualWeightOf, CAMERA_TWEEN_MS, CAMERA_HUD_SPACE,
  NODE_H, NODE_W,
  type EdgeFamily, type MergedEdge, type NetworkEdge, type NetworkGraph, type NodeGroup, type PlacedNode, type PositionOverrides, type ReasonKind, type Recommendation,
} from '../network';
import type { NodeSummary } from '../types';

/**
 * 长按阈值与容差从 `web/src/pointer.ts` 取（2026-10 提出去，TODO B 的登记表要核对它）：
 * 鼠标 / 笔 250ms / 4px，触摸 500ms / 12px。理由与依据都写在那个模块里——
 * 放在组件里 node 侧 import 不了（JSX），「设计取值」那一节就只能靠正则猜，那正是漂移的来源。
 */
import { holdThresholdFor, moveToleranceFor } from '../pointer';

/** 强关联候选最多摊开几个（太多就成一圈字了）。 */
const PICK_MAX = 6;
/** 候选卡片围着源节点摊开的半径（世界单位）。 */
const PICK_RING_RADIUS = 190;
const PICK_CARD_W = 232;
const PICK_CARD_H = 64;
import { parseRouteSearch, planFromSearch, routeFrame } from '../route-replay';
import { stageArrowGeometry } from '../stage-arrow';
import { relatedCandidates, relatedBasisLabel, type RelatedCandidate } from '../node-related';
import { placeNewNodes } from '../node-placement';
import { routeEdges, ROUTE_DEFAULTS } from '../edge-routing';
import { useMediaQuery } from '../useMediaQuery';
import { useProfileContext } from '../state';
import {
  CONTRACT_MODE_LABELS, CONTRACT_MODE_WEIGHT, SEMANTIC_CONTRACT_MODES,
  TIER_SAMPLE_COLOR, TIER_STYLE,
  contractModeLabel, edgeKindLabel, edgeVisual, tierLabel, tierNote,
  type EdgeVisual, type RelationTier,
} from '../relation-visual';

/**
 * 节点网络：整屏画布 + 可拖动悬浮框 + 全屏 + 平移缩放。
 *
 * 本页已与旧的「探索结构」(/graph) 合并：原页的价值（全体浏览、聚合话题、列表检索、
 * 关系图例）都在这里以悬浮框与边源开关的形式保留，旧路由重定向到本页。
 *
 * 边源分成七个家族，每个都能追到已登记数据，并可在 HUD 里单独开关；
 * 默认全开，因为稀疏的连接会让网络读起来没有信息。
 */

/**
 * 推荐理由的徽标文案：按语种在组件里取（见 `PAGE_TEXT` 的 `reason*` 键）。
 * 这里只留下**状态记号**——它不是文案，是 `StatusBadge` 的配色档，两种语种逐字相同。
 */
const REASON_TONE: Record<ReasonKind, string> = {
  ready: 'known',
  relation: 'ILLUSTRATION',
  'shares-input': 'not_run',
  thread: 'Unknown',
  background: 'DEF',
  'same-topic': 'REF',
  pattern: 'Unknown',
};

type PanelId = 'list' | 'recommend' | 'detail' | 'families' | 'spec' | 'views';
const PANEL_IDS: PanelId[] = ['list', 'recommend', 'detail', 'families', 'spec', 'views'];
/** 面板分属画布左右两侧：同一侧一次只开一个，避免两块浮窗吃掉半个画布。 */
const PANEL_SIDE: Record<PanelId, 'left' | 'right'> = {
  list: 'left', recommend: 'right', detail: 'left', families: 'right', spec: 'left', views: 'right',
};

/**
 * 默认只画两类边。
 *
 * 「行动契约 + 登记关系」是本体里真正声明过的依赖与语义关系；其余五类（同话题、误区锚点、
 * 共用前提、同一份证据、支持族）是辅助线索。七类全开时连边会把节点卡片压成小字，
 * 因此默认关闭，需要时在「连接类型」里逐类打开，开关上会显示当前条数。
 */
const DEFAULT_VISIBLE_FAMILIES: EdgeFamily[] = ['contract', 'relation'];

/**
 * 本页自己的文案：**中英成对**写在同一张表里（手册 §1）。
 *
 * 为什么不塞进 `i18n/messages.ts`：那里是**通用壳层**（导航、按钮、无障碍标签），
 * 这一页有上百条画布提示、面板说明与条款正文，堆进去会把通用表变成垃圾场。
 *
 * 三条纪律：
 * 1. **中文是源语言，逐字不变**——`tests/network-*.mjs`、`tests/browser.mjs` 里有大量断言
 *    直接比对中文渲染（面板的 `aria-label`、HUD 计数、图例文字都在内）；
 * 2. 带占位符的写 `{name}`，由 `fill()` 填；占位符之外的字符一个字都不许动；
 * 3. 漏一个键就编译不过（下面 `PageText` 的类型由中文表推出）。
 */
const PAGE_TEXT = {
  /* —— 悬浮面板的标题（同时是面板的 `aria-label`，验收按它选元素） —— */
  panelList: { zh: '全部节点', en: 'All nodes' },
  panelRecommend: { zh: '推荐加入', en: 'Suggested additions' },
  panelDetail: { zh: '节点详情', en: 'Node details' },
  panelFamilies: { zh: '连接类型', en: 'Connection types' },
  panelSpec: { zh: '关系可视化条款', en: 'Visualisation clause' },
  panelViews: { zh: '保存的视图', en: 'Saved views' },
  panelRestore: { zh: '恢复默认位置', en: 'Reset position' },
  panelClose: { zh: '关闭{title}', en: 'Close {title}' },
  panelToggle: { zh: '显示{title}面板', en: 'Show the {title} panel' },

  /* —— 推荐理由的徽标 —— */
  reasonReady: { zh: '图中前提已加入', en: 'Prerequisites in the graph' },
  reasonRelation: { zh: '已有登记关系', en: 'Registered relation' },
  reasonSharesInput: { zh: '共用前提', en: 'Shared prerequisites' },
  reasonThread: { zh: '线索（不参与前置计算）', en: 'Thread (not a prerequisite)' },
  reasonBackground: { zh: '背景起点', en: 'Background entry point' },
  reasonSameTopic: { zh: '同一话题', en: 'Same topic' },
  reasonPattern: { zh: '误区锚点', en: 'Misconception anchor' },

  /* —— 通用词 —— */
  allCases: { zh: '全部案例', en: 'All cases' },
  allConstructs: { zh: '全部构造类型', en: 'All construct types' },
  undo: { zh: '撤销', en: 'Undo' },
  gotIt: { zh: '知道了', en: 'Got it' },
  clear: { zh: '清空', en: 'Clear' },
  joinSeparator: { zh: '、', en: ', ' },

  /* —— 画布与边 —— */
  loading: { zh: '加载本体…', en: 'Loading the ontology…' },
  canvasAria: { zh: '节点网络，已加入 {nodes} 个节点、{edges} 条边', en: 'Node network with {nodes} nodes and {edges} edges' },
  emptyHint: { zh: '网络还是空的 · 用右侧「推荐加入」或左侧「全部节点」开始', en: 'The network is empty · start from “Suggested additions” on the right or “All nodes” on the left' },
  threadBadge: { zh: '线索', en: 'Thread' },
  nextStepBadge: { zh: '下一步', en: 'Next' },
  edgeTitleRelation: { zh: '{kind}（见证 {witness}）· 视觉权重 {weight} · {tier}', en: '{kind} (witness {witness}) · visual weight {weight} · {tier}' },
  edgeTitleFamily: { zh: '{family} · 视觉权重 {weight} · {tier}', en: '{family} · visual weight {weight} · {tier}' },
  edgeTitleMerged: { zh: '\n同一对节点上还合并了 {count} 条（只画最强的一条）：\n', en: '\n{count} more edge(s) on the same pair are merged here (only the strongest is drawn):\n' },
  edgeTitleMergedItem: { zh: '　· {desc}（权重 {weight}）', en: '  · {desc} (weight {weight})' },
  describeRelation: { zh: '{kind}（关系 {id}）', en: '{kind} (relation {id})' },
  describeContract: { zh: '{label}：{title}（契约 {id}）', en: '{label}: {title} (contract {id})' },
  describeFamily: { zh: '{family}（{id}）', en: '{family} ({id})' },
  edgeLabelContract: { zh: '{label}：{title}', en: '{label}: {title}' },
  nodeTitle: { zh: '{title}（{id}）· {degree} 条连接 · {group}', en: '{title} ({id}) · {degree} connections · {group}' },
  nodeTitleThread: { zh: ' · 线索层：话题级条目，不参与前置计算', en: ' · Thread layer: a topic-level entry, not counted as a prerequisite' },
  nodeTitleDragged: { zh: ' · 已手动摆放，双击复位', en: ' · Manually placed; double-click to reset' },
  nodeTitleAuto: { zh: ' · 由「局部技巧自动加入」规则加入', en: ' · Added by the “local techniques” rule' },
  nodeTitleHint: { zh: ' · 左键按住看强关联节点 · 右键移出视图', en: ' · Hold the left button for strongly related nodes · right-click to remove from the view' },
  pickerAria: { zh: '「{title}」的强关联节点', en: 'Nodes strongly related to “{title}”' },
  pickerHint: { zh: '按住左键 —— 把鼠标移到要加入的节点上，松开即加入视图；松在别处或按 Esc 取消。', en: 'Keep holding the left button — move onto the node you want, then release to add it to the view; release elsewhere or press Esc to cancel.' },
  pickerNote: { zh: '　候选来自已登记关系与行动契约，只摊开还没进视图的那些。标着「线索」的是话题级条目：它们是学习线索的名字，不参与前置计算。', en: ' Candidates come from registered relations and action contracts, and only those not yet in the view are laid out. Entries marked “Thread” are topic-level: they name a study thread and are not counted as prerequisites.' },

  /* —— 回放控制台 —— */
  replayAria: { zh: '路线回放', en: 'Route replay' },
  replayEyebrow: { zh: '路线回放', en: 'Route replay' },
  replayExit: { zh: '退出手势回放，自由浏览', en: 'Leave the replay and browse freely' },
  // 步标题拆成「前缀 + <strong>数</strong> + 后缀」三段：中文的「第 <strong>2</strong> / 5 步」里
  // 数被强调，英文同样保留这个结构，因此不能用一整条模板替换掉 <strong>。
  replayStepLead: { zh: '第 ', en: 'Step ' },
  replayStepTail: { zh: ' / {total} 步：{title}', en: ' / {total}: {title}' },
  replayStartLead: { zh: '起点：', en: 'Start: ' },
  replayStartTail: { zh: ' 个背景入口已在场，共 {total} 步', en: ' background entries are in place, {total} steps in total' },
  replayToStart: { zh: '回到起点', en: 'Back to the start' },
  replayPrev: { zh: '上一步', en: 'Previous step' },
  replayNext: { zh: '下一步', en: 'Next step' },
  replayToEnd: { zh: '到终点', en: 'To the end' },
  replayStartShort: { zh: '⏮ 起点', en: '⏮ Start' },
  replayPrevShort: { zh: '◀ 上一步', en: '◀ Previous' },
  replayNextShort: { zh: '下一步 ▶', en: 'Next ▶' },
  replayEndShort: { zh: '终点 ⏭', en: 'End ⏭' },
  replayPause: { zh: '暂停', en: 'Pause' },
  replayPlay: { zh: '播放', en: 'Play' },
  replayPauseShort: { zh: '⏸ 暂停', en: '⏸ Pause' },
  replayPlayShort: { zh: '▶ 播放', en: '▶ Play' },
  replaySpeed: { zh: '倍速', en: 'Speed' },
  replaySpeedAria: { zh: '播放倍速', en: 'Playback speed' },
  replayProgressAria: { zh: '回放进度', en: 'Replay progress' },
  replayProgressText: { zh: '第 {step} 步，共 {total} 步', en: 'Step {step} of {total}' },
  replayAdded: { zh: '这一步加入：', en: 'Added by this step:' },
  replayAddedNone: { zh: '（只消费，没有新节点）', en: '(consumes only, no new node)' },
  replayUses: { zh: '用到的已有节点：{list}{more}', en: 'Existing nodes used: {list}{more}' },
  replayMore: { zh: ' 等 {count} 个', en: ' and {count} more' },
  replayEntry: { zh: '起点节点：{list}', en: 'Starting nodes: {list}' },
  replayEntryNone: { zh: '（无背景入口）', en: '(no background entry)' },
  replayNote: { zh: '动画只显示这条路线上的节点，但布局按全部 {total} 个节点一次算定—— 因此步骤切换时位置不会跳动。回放不写入学习档案。', en: 'The animation shows only the nodes on this route, but the layout is computed once for all {total} nodes, so positions do not jump between steps. The replay writes nothing to the learner profile.' },

  /* —— HUD —— */
  // 英文要分单复数（`1 nodes` 读起来是错的）；中文两支写成同一个词，渲染逐字不变。
  hudNodeOne: { zh: '个节点', en: 'node' },
  hudNodes: { zh: '个节点', en: 'nodes' },
  hudEdgeOne: { zh: '条边', en: 'edge' },
  hudEdges: { zh: '条边', en: 'edges' },
  hudMergedTitle: { zh: '同一对节点之间只画最强的一条；其余在边的标签与提示里标明', en: 'Only the strongest edge is drawn between a pair; the rest are named in edge labels and tooltips' },
  hudMerged: { zh: '（另有 {count} 条同对边并进这些线里）', en: '({count} more edges on the same pairs are merged into these lines)' },
  hudMergedOne: { zh: '（另有 {count} 条同对边并进这些线里）', en: '({count} more edge on the same pair is merged into these lines)' },
  hudAverage: { zh: '平均 {average} 条/节点', en: '{average} edges per node on average' },
  hudIsolated: { zh: ' · {count} 个未连接', en: ' · {count} unconnected' },
  hudResidual: { zh: ' · {count} 条边仍压着卡片（弓高上限 {max}px 内无解）', en: ' · {count} edges still cross a card (no solution within the {max}px bow limit)' },
  zoomOut: { zh: '缩小', en: 'Zoom out' },
  zoomIn: { zh: '放大', en: 'Zoom in' },
  resetView: { zh: '重置', en: 'Reset view' },
  resetViewTitle: { zh: '重置视角：只把整张网络重新适配进可见区，节点位置一个都不动', en: 'Reset the camera only: re-fit the whole network into the visible area, moving no node' },
  relayout: { zh: '重新布局', en: 'Re-layout' },
  relayoutTitle: { zh: '重新布局：清掉自动摆位并重算；你手动拖过的节点保持原位（与「重置」不同，那个只动相机）', en: 'Re-layout: clear the automatic placements and recompute; nodes you dragged stay where they are (unlike “Reset view”, which only moves the camera)' },
  saveView: { zh: '保存视图', en: 'Save view' },
  saveViewTitle: { zh: '把当前视图存进学习者档案（E），下次按名字载入', en: 'Store the current view in the learner profile (E) and load it by name next time' },
  viewsToggleOpen: { zh: '收起视图列表', en: 'Hide the view list' },
  viewsToggleClosed: { zh: '视图列表', en: 'View list' },
  viewsToggleCount: { zh: '视图列表（{count}）', en: 'View list ({count})' },
  fullscreenEnter: { zh: '全屏', en: 'Full screen' },
  fullscreenExit: { zh: '退出全屏', en: 'Exit full screen' },
  unresolved: { zh: 'URL 里有 {count} 个节点引用在当前本体版本无法解析，已忽略：', en: '{count} node references in the URL cannot be resolved in the current ontology version and were ignored: ' },
  removedNotice: { zh: '已把「{title}」移出视图。这只改本页显示，本体节点仍在。', en: '“{title}” was removed from the view. This only changes what this page shows; the ontology node is still there.' },
  autoAddNotice: { zh: '可以在当前视图旁边补上 {count} 个方法节点（判据：与当前视图及其一跳邻域连接超过 3 条）：', en: 'You can add {count} method nodes next to the current view (criterion: more than 3 links to the view and its one-hop neighbourhood):' },
  autoAddItem: { zh: '{title}（{inView} 条）', en: '{title} ({inView} rows)' },
  autoAddMore: { zh: ' 等', en: ', and more' },
  autoAddApply: { zh: '加入这 {count} 个', en: 'Add these {count}' },
  autoAddLater: { zh: '暂不', en: 'Not now' },
  clearedNotice: { zh: '已清空画布里的 {count} 个节点；本体与学习记录都没有变化。', en: 'Cleared {count} nodes from the canvas; neither the ontology nor the learning records changed.' },
  clearedUndo: { zh: '撤销清空', en: 'Undo the clear' },
  autoAddedApplied: { zh: '已加入 {count} 个方法节点：{list}{more}。判据是「直接邻域 ∩（视图 ∪ 视图一跳邻域）> 3」。', en: 'Added {count} method nodes: {list}{more}. The criterion is “direct neighbourhood ∩ (view ∪ one-hop neighbourhood of the view) > 3”.' },
  autoAddedItem: { zh: '{title}（与视图 {inView} 条连接）', en: '{title} ({inView} links to the view)' },
  autoAddedMore: { zh: ' 等 {count} 个', en: ' and {count} more' },

  /* —— 保存的视图：提示与消息 —— */
  viewsNoteProfile: { zh: '存在学习者档案（E）里：跟着档案走，可随档案导出。', en: 'Stored in the learner profile (E): it travels with the profile and can be exported with it.' },
  viewsNoteLocal: { zh: '未选择学习档案：视图存在这台浏览器里（选了档案之后会存进档案 E）。', en: 'No learner profile selected: views are stored in this browser (once you pick a profile they go into profile E).' },
  viewsNoteNoStorage: { zh: '未选择学习档案，且本机存储不可用（隐私模式）。', en: 'No learner profile selected, and local storage is unavailable (private mode).' },
  viewsReadFailed: { zh: '读取失败：{message}', en: 'Could not read: {message}' },
  viewsSaveFailed: { zh: '保存失败：{message}', en: 'Could not save: {message}' },
  viewsRenameFailed: { zh: '重命名失败：{message}', en: 'Could not rename: {message}' },
  viewsDeleteFailed: { zh: '删除失败：{message}', en: 'Could not delete: {message}' },
  viewsReadFailedShort: { zh: '读取失败', en: 'read failed' },
  viewsSaveFailedShort: { zh: '保存失败', en: 'save failed' },
  viewsRenameFailedShort: { zh: '重命名失败', en: 'rename failed' },
  viewsDeleteFailedShort: { zh: '删除失败', en: 'delete failed' },
  viewsNameRequired: { zh: '给这个视图起个名字再保存。', en: 'Give this view a name before saving.' },
  viewsSavedProfile: { zh: '已保存视图「{name}」到学习者档案（E）：{nodes} 个节点、{families} 类边、{positions} 个手动位置。本体没有改变。', en: 'Saved the view “{name}” to the learner profile (E): {nodes} nodes, {families} edge kinds, {positions} manual positions. The ontology did not change.' },
  viewsSavedLocal: { zh: '已保存视图「{name}」到这台浏览器（未选择档案）：{nodes} 个节点、{families} 类边。选了档案之后会存进档案（E）。', en: 'Saved the view “{name}” in this browser (no profile selected): {nodes} nodes, {families} edge kinds. With a profile it will be stored in profile E.' },
  viewsLoaded: { zh: '已载入视图「{name}」：{nodes} 个节点、{positions} 个手动位置。{missing}载入只改本页显示，不写本体。', en: 'Loaded the view “{name}”: {nodes} nodes, {positions} manual positions. {missing}Loading only changes what this page shows; it writes nothing to the ontology.' },
  viewsLoadedMissing: { zh: '有 {count} 个节点已不在当前本体里，已跳过。', en: '{count} nodes are no longer in the ontology and were skipped. ' },
  viewsPromptRename: { zh: '新的视图名', en: 'New view name' },
  viewsPromptSave: { zh: '给这个视图起个名字（下次按名字载入）', en: 'Name this view (you will load it by name next time)' },
  viewsDefaultName: { zh: '视图 {stamp}', en: 'View {stamp}' },
  viewsConfirmDelete: { zh: '删除视图「{name}」？此操作立即生效，不能撤销。', en: 'Delete the view “{name}”? This takes effect immediately and cannot be undone.' },
  viewsSaveNow: { zh: '保存当前视图', en: 'Save the current view' },
  viewsCopyLink: { zh: '复制当前链接', en: 'Copy the current link' },
  viewsCopied: { zh: '已复制当前链接到剪贴板。', en: 'Copied the current link to the clipboard.' },
  viewsCopyBlocked: { zh: '浏览器不允许访问剪贴板，请手动复制：{url}', en: 'The browser does not allow clipboard access; please copy it manually: {url}' },
  viewsEmptyCanvas: { zh: '画布上还没有节点：先从「全部节点」或「推荐加入」加几个，再保存。', en: 'The canvas is still empty: add a few nodes from “All nodes” or “Suggested additions” first, then save.' },
  viewsNone: { zh: '还没有保存过视图。', en: 'No view has been saved yet.' },
  viewsEntryNodes: { zh: '{count} 节点', en: '{count} nodes' },
  viewsEntryMeta: { zh: '{families} 类边 · {positions} 个手动位置', en: '{families} edge kinds · {positions} manual positions' },
  viewsEntryLocal: { zh: ' · 本机', en: ' · this browser' },
  viewsEntryProfile: { zh: ' · 档案（E）', en: ' · profile (E)' },
  viewsLoad: { zh: '载入', en: 'Load' },
  viewsRename: { zh: '重命名', en: 'Rename' },
  viewsDelete: { zh: '删除', en: 'Delete' },
  viewsSearch: { zh: '搜索已保存的视图', en: 'Search saved views' },
  viewsSearchPlaceholder: { zh: '输入视图名称', en: 'Enter a view name' },
  viewsSort: { zh: '视图排序', en: 'Sort saved views' },
  viewsSortRecent: { zh: '最近更新', en: 'Recently updated' },
  viewsSortOldest: { zh: '最早更新', en: 'Oldest updated' },
  viewsSortNodes: { zh: '节点最多', en: 'Most nodes' },
  viewsSortName: { zh: '按名称', en: 'By name' },
  viewsFound: { zh: '显示 {shown} / {total} 个视图', en: 'Showing {shown} of {total} views' },
  viewsNoMatch: { zh: '没有匹配的视图，试试更短的名称。', en: 'No matching views. Try a shorter name.' },
  viewsClearSearch: { zh: '清除视图搜索', en: 'Clear view search' },
  viewsDuplicate: { zh: '同名 {index}/{total}', en: 'Same name {index}/{total}' },
  viewsDuplicateHint: { zh: '这些视图各自保存，请结合节点数和更新时间选择。', en: 'These are separate saved views. Use their node counts and update times to choose.' },
  viewsSnapshotNote: { zh: '每条视图是独立快照，载入会替换当前画布，不自动合并。保存时视角已固定，继续拖动或缩放不会改写它；再次保存会增加一份快照。', en: 'Each view is a separate snapshot. Loading replaces the current canvas without merging. Its camera is fixed when saved; later dragging or zooming does not change it. Saving again creates another snapshot.' },
  viewsSnapshotSaved: { zh: '视角已固定，后续拖动或缩放不会改写这份快照。', en: 'The camera is fixed in this snapshot; later dragging or zooming will not change it.' },
  viewsMigrateTitle: { zh: '把本机视图带进学习档案', en: 'Bring browser views into your profile' },
  viewsMigrateNote: { zh: '这台浏览器还有 {count} 个视图。存入「{name}」后可随档案导出；每个视图确认保存后才移除本机副本，同名但不同内容的视图会分别保留。', en: 'Saved views in this browser: {count}. Move them into “{name}” to include them in profile exports. Each browser copy is removed only after saving is verified. Different views with the same name are kept separately.' },
  viewsMigrateAction: { zh: '存入当前档案（{count}）', en: 'Move to this profile ({count})' },
  viewsMigrating: { zh: '正在存入…', en: 'Moving views…' },
  viewsMigrated: { zh: '已确认 {count} 个本机视图存入「{name}」，可以随档案导出。', en: 'Verified {count} browser views in “{name}”. They can now be exported with the profile.' },
  viewsMigrateFailed: { zh: '已确认 {count} 个；其余本机视图已保留，可重试。原因：{message}', en: '{count} verified; the remaining browser views are kept for retry. Reason: {message}' },
  viewsLocalReadFailed: { zh: '本机视图暂时无法读取，原记录已保留。', en: 'Browser views could not be read. The original records are kept.' },

  /* —— 全部节点面板 —— */
  listHint: { zh: '勾选即加入网络。只改变本页视图，不写公共本体，也不写学习档案。', en: 'Tick to add to the network. This changes this page’s view only; it writes neither the public ontology nor the learner profile.' },
  listSearchPlaceholder: { zh: '搜索标题、ID 或摘要', en: 'Search title, ID or summary' },
  listSearchAria: { zh: '搜索节点', en: 'Search nodes' },
  listCaseAria: { zh: '按案例筛选', en: 'Filter by case' },
  listConstructAria: { zh: '按构造类型筛选', en: 'Filter by construct type' },
  listOptionCount: { zh: '{label}（{count}）', en: '{label} ({count})' },
  listResultCount: { zh: '显示 {shown} / {total} 个登记节点', en: 'Showing {shown} / {total} registered nodes' },
  evidenceLevelTitle: { zh: '证据等级：{status}', en: 'Evidence level: {status}' },

  /* —— 连接类型面板 —— */
  familiesHint: { zh: '每一类都来自已登记的数据，可单独开关。默认全开：只留契约与关系会让网络过于稀疏。', en: 'Every kind comes from registered data and can be toggled separately. By default all are on: keeping only contracts and relations makes the network too sparse.' },
  familiesCount: { zh: '{count} 条', en: '{count} rows' },

  /* —— 推荐面板 —— */
  recommendTitleStart: { zh: '起点推荐', en: 'Suggested starting points' },
  recommendHintStart: { zh: '网络为空，先给出可以当起点的背景节点。', en: 'The network is empty; here are the background nodes that can serve as starting points.' },
  recommendHint: { zh: '按节点分类分组；方法节点单独列出，局部技巧与全局方法分开。组内理由按强弱排序。', en: 'Grouped by node category; method nodes are listed separately, local techniques apart from global methods. Reasons inside a group are ordered by strength.' },
  recommendEmpty: { zh: '没有更多可推荐的节点了。可在左侧列表直接勾选，或清空网络重新开始。', en: 'There is nothing left to suggest. Tick nodes in the list on the left, or clear the network and start again.' },
  recommendFilterAria: { zh: '按分类筛选推荐', en: 'Filter suggestions by category' },
  recommendAll: { zh: '全部 {count}', en: 'All {count}' },
  recommendAdd: { zh: '加入网络', en: 'Add to the network' },

  /* —— 节点详情面板 —— */
  detailEmpty: { zh: '在网络里点一个节点即可查看它的连接。', en: 'Click a node in the network to see its connections.' },
  detailMetaTail: { zh: '连接 {degree} 条', en: '{degree} connections' },
  detailOpenNode: { zh: '打开节点页', en: 'Open the node page' },
  detailRemove: { zh: '移出网络', en: 'Remove from the network' },
  detailAdd: { zh: '加入网络', en: 'Add to the network' },
  detailEdges: { zh: '与当前网络的连接（{count}）', en: 'Connections to the current network ({count})' },
  witnessTitle: { zh: '见证状态：{status}', en: 'Witness status: {status}' },
  detailSupports: { zh: '支撑', en: 'Supports' },
  detailDepends: { zh: '依赖', en: 'Depends on' },
  detailRelated: { zh: '相关', en: 'Related' },
  noticeNoRelated: { zh: '「{title}」没有还没进视图的强关联节点：与它相关的节点都已经在画布上了。', en: '“{title}” has no strongly related node left outside the view: everything related to it is already on the canvas.' },
  noticePicked: { zh: '已把「{title}」加入视图（{basis}）。{note}只改本页显示，本体与学习记录都没变。', en: 'Added “{title}” to the view ({basis}). {note}This only changes what this page shows; neither the ontology nor the learning records changed.' },
  pickerBasisFallback: { zh: '强关联', en: 'strongly related' },
  relayoutDoneManual: { zh: '已重新布局：自动摆位清空重算；你手动拖过的 {count} 个节点保持原位。', en: 'Re-laid out: automatic placements were cleared and recomputed; the {count} nodes you dragged stay where they are.' },
  relayoutDonePlain: { zh: '已重新布局：自动摆位清空重算（当前没有手动摆放的节点）。', en: 'Re-laid out: automatic placements were cleared and recomputed (no manually placed node at the moment).' },

  /* —— 条款面板：带内联标记（<strong>/<code>）的长段落直接写在 JSX 里，
   *    中文那一支**保持原样**（多行 JSX 文本的换行会被折叠成空格，改写成模板串会引入
   *    看不见的差异），英文在同一处另起一支。下面只放能整条替换的短句。 —— */
  specRowCount: { zh: '{count} 条', en: '{count} rows' },
  specParams: { zh: '线宽 {width} · 不透明度 {opacity} · {dash}', en: 'width {width} · opacity {opacity} · {dash}' },
  specDashed: { zh: '虚线', en: 'dashed' },
  specSolid: { zh: '实线', en: 'solid' },
  specLabelled: { zh: ' · 标注名称', en: ' · labelled' },
  specKindsTitle: { zh: '这一档里有哪些关系', en: 'Which relations fall in each tier' },
  specKindsEmpty: { zh: '当前网络里没有登记关系。它们不是每条连接都有——只有本体里明确登记过的才有。', en: 'The current network has no registered relations. Not every connection has one — only those explicitly registered in the ontology do.' },
  specKindMeta: { zh: '{tier} · 权重 {weight} · {count} 条', en: '{tier} · weight {weight} · {count} rows' },
  specArrows: { zh: '硬关系的箭头更粗更大。若画布上几乎看不到硬关系，是因为本体里就登记了很少——不是画漏了。', en: 'Harder relations get thicker, larger arrowheads. If you hardly see any hard relation on the canvas, it is because the ontology registers few of them — not because they were left out.' },
  specModeTitle: { zh: '行动契约按 mode 分档', en: 'Action contracts tiered by mode' },
  specModeMeta: { zh: '{tier} · 权重 {weight} · 当前视图 {count} 条边', en: '{tier} · weight {weight} · {count} edges in the current view' },
  specModeLabelled: { zh: ' · 标出名称', en: ' · labelled' },
  specMergeTitle: { zh: '同一对节点只画一条（合并显示）', en: 'One edge per pair of nodes (merged display)' },
  specArcTitle: { zh: '弧线：绕不开才弯，绕不开就如实说', en: 'Arcs: bend only when there is no way around, and say so when there is none' },
  specThreadTitle: { zh: '线索层：话题级条目不参与前置计算', en: 'Thread layer: topic-level entries are not counted as prerequisites' },

  /* —— 图例条 —— */
  legendHarder: { zh: '越硬越重', en: 'Harder is heavier' },
  legendThreadTitle: { zh: '话题级条目（一节或一章的范围）：它们是学习线索的名字，不是可独立认知的单元，因此不参与前置计算。', en: 'Topic-level entries (the scope of a section or a chapter): they name study threads, not units one can cognise on its own, so they are not counted as prerequisites.' },
  legendThread: { zh: '线索层', en: 'Thread layer' },
  legendTopicTitle: { zh: '{title}（{count} 个节点）', en: '{title} ({count} nodes)' },
  legendHint: { zh: '拖动空白处平移 · 滚轮缩放 · 按住左键看强关联 · 右键移出节点 · 「重置」只复位视角，「重新布局」才重排卡片（手动摆放保留）', en: 'Drag empty space to pan · scroll to zoom · hold the left button for strongly related nodes · right-click to remove a node · “Reset view” only resets the camera, “Re-layout” re-arranges the cards (manual placements are kept)' },
} as const;

type PageTextKey = keyof typeof PAGE_TEXT;
type PageText = Record<PageTextKey, string>;

/** 按语种把成对文案摊平成一张普通表（组件里只取一次，随语种变化）。 */
function pageText(locale: Locale): PageText {
  const out = {} as Record<string, string>;
  for (const [key, pair] of Object.entries(PAGE_TEXT)) out[key] = pair[locale];
  return out as PageText;
}

/** 把 `{name}` 占位符换成值；没给值的占位符原样保留（不静默变空白）。 */
function fill(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

/** 面板标题的取词键：标题同时是面板的 `aria-label`，验收按它选元素。 */
const PANEL_TEXT_KEYS: Record<PanelId, PageTextKey> = {
  list: 'panelList',
  recommend: 'panelRecommend',
  detail: 'panelDetail',
  families: 'panelFamilies',
  spec: 'panelSpec',
  views: 'panelViews',
};

/** 推荐理由徽标的取词键。 */
const REASON_TEXT_KEYS: Record<ReasonKind, PageTextKey> = {
  ready: 'reasonReady',
  relation: 'reasonRelation',
  'shares-input': 'reasonSharesInput',
  thread: 'reasonThread',
  background: 'reasonBackground',
  'same-topic': 'reasonSameTopic',
  pattern: 'reasonPattern',
};

/** 首次访问的引导状态：开着「全部节点」与「推荐加入」，让空网络有明确入口。 */
const FIRST_VISIT_PANELS: Record<PanelId, boolean> = { list: true, recommend: true, detail: false, families: false, spec: false, views: false };
/**
 * 之后每次访问的默认状态：面板全部收起。
 *
 * 悬浮框是浮在画布上的，左右各开一个就吃掉近一半宽度——适配后网络只能缩到三成，
 * 既看不清也没法读。默认收起，把整块画布还给网络；需要时用 HUD 的开关打开。
 */
const RETURNING_PANELS: Record<PanelId, boolean> = { list: false, recommend: false, detail: false, families: false, spec: false, views: false };
const VISITED_KEY = 'mcs-network-visited-v1';
/** 手动摆放的节点位置。按节点 id 存，刷新后仍在原处。 */
const OVERRIDES_KEY = 'mcs-network-positions-v1';
/**
 * 自动摆位结果。与手动位置分开存：
 * 手动拖动优先；「重新布局」（HUD 的按钮）只清自动摆位、不动手动位置；
 * 「重置」是另一件事——它只把相机重新适配进可见区。
 */
const PLACEMENTS_KEY = 'mcs-network-placements-v1';
/**
 * 未选择学习档案时，保存的视图存在本机（与手动位置同类）。
 *
 * 选择档案后走 E 层（服务端），视图跟着档案走、可导出、可跨浏览器；
 * 没选档案就没地方落 E，于是退回本机并在面板上如实说明。
 */
const SAVED_VIEWS_LOCAL_KEY = LOCAL_VIEWS_KEY;

/**
 * 箭头 marker 的 id：颜色 + 层级决定一个 marker。
 *
 * 颜色是十六进制，去掉 `#` 后即可安全进 id；同一颜色同一层级只生成一次。
 * 层级只影响尺寸（见 TIER_ARROW_SIZE），于是每个视图最多生成「颜色数 × 3」个 marker。
 */
const TIER_ARROW_SIZE: Record<RelationTier, number> = { core: 13, strong: 13, medium: 10.5, structural: 8.5, ambient: 8.5 };

function arrowMarkerId(color: string, tier: RelationTier): string {
  return `net-arrow-${color.replace('#', '').toLowerCase()}-${tier}`;
}

interface Viewport { x: number; y: number; scale: number }
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3;
/**
 * 双指缩放的起始跨度下限（用户单位 ≈ CSS 像素）。
 *
 * 两指若几乎落在一起，`distance / startDistance` 的分母趋零，一次轻微抖动就能把比例
 * 推到几十倍——缩放会瞬间冲到上下限。低于这个跨度就不缩放，只按「两指平移」走。
 */
const PINCH_MIN_SPAN = 12;

/**
 * 图例里的短标签：截断时必须**保留末尾的组号**。
 *
 * 多块聚合（如 dg 的五个块）共享同一段前缀「微分几何：机制与切空间」，
 * 从前往后截断会让三块变成同一个字符串，学习者分不出谁是谁。
 * 因此截断点从组号前面切，组号始终可见；完整标题在 title 提示里。
 */
function topicLegendLabel(title: string): string {
  const marker = title.lastIndexOf(' · ');
  if (marker < 0) return title.length > 12 ? `${title.slice(0, 12)}…` : title;
  const head = title.slice(0, marker);
  const tail = title.slice(marker);
  return `${head.length > 7 ? `${head.slice(0, 7)}…` : head}${tail}`;
}

/**
 * 回放时适配额外让出的高度。
 *
 * 量到的控制台高度已经让出来了，但实测内容底边仍会恰好落在控制台顶边上
 * （`contentRect` 与视觉高度差 15px 之外，还有 viewBox 与 CSS 尺寸的 2px 偏差）。
 * 与其继续追这几个像素的来源，不如按「宁可多留白，也不让卡片压在控制台上」处理——
 * 代价只是内容略小一点。
 */
const FIT_SLACK_REPLAY = 28;

export function NetworkPage() {
  /*
   * 语种与词表：本页只有这一个组件，因此在顶层取一次，往下全部走 `txt` / `labels`。
   *
   * `txt` 用 `useMemo` 锁住对象身份：下面十几个 `useCallback`（手势结算、保存视图…）
   * 都要读它，若每次渲染都是新对象，那些回调会跟着每帧重建，
   * 挂在 window 上的监听器也会反复拆装。
   */
  const { t, locale, fmtDate, isPending, hrefFor } = useI18n();
  const labels = useLabels();
  const txt = useMemo(() => pageText(locale), [locale]);
  const panelTitles = useMemo(() => {
    const out = {} as Record<PanelId, string>;
    for (const id of PANEL_IDS) out[id] = txt[PANEL_TEXT_KEYS[id]];
    return out;
  }, [txt]);
  const reasonLabels = useMemo(() => {
    const out = {} as Record<ReasonKind, string>;
    for (const [kind, key] of Object.entries(REASON_TEXT_KEYS) as Array<[ReasonKind, PageTextKey]>) out[kind] = txt[key];
    return out;
  }, [txt]);
  const graph = useApi<NetworkGraph>('/ontology/graph');
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [caseFilter, setCaseFilter] = useState('全部');
  const [constructFilter, setConstructFilter] = useState('全部');
  const [open, setOpen] = useState<Record<PanelId, boolean>>(() => {
    // 首帧就要决定开哪些面板，否则会先渲染一帧引导状态再收起，视觉上跳动。
    if (typeof localStorage === 'undefined') return FIRST_VISIT_PANELS;
    return localStorage.getItem(VISITED_KEY) ? RETURNING_PANELS : FIRST_VISIT_PANELS;
  });
  /**
   * 路线回放：从学习路线页带 `play=1&entry=…&path=…` 进来时进入回放模式。
   *
   * 回放态完全由这几个本地状态驱动，**不写 URL、不写本体、不写档案**：
   * 拖动进度条不该在浏览器历史里留下几十条记录，也不该被当成学习行为记账。
   */
  const routeSearch = useMemo(() => parseRouteSearch(params), [params]);
  const replayPlan = useMemo(() => (routeSearch ? planFromSearch(routeSearch) : null), [routeSearch]);
  const [replayStep, setReplayStep] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const routeFrameView = useMemo(
    () => (replayPlan ? routeFrame(replayPlan, replayStep) : null),
    [replayPlan, replayStep],
  );


  /** 回放模式下当前可见的节点；非回放模式返回 null，表示「全部可见」。 */
  const replayVisible = routeFrameView?.visible ?? null;

  /** 回放计时器：按状态推进，到最后一步自动停。 */
  useEffect(() => {
    if (!replayPlan || !replayPlaying) return;
    if (replayStep >= replayPlan.steps.length) { setReplayPlaying(false); return; }
    // 基准 900ms 一步，按倍速缩放；用 setTimeout 而不是 interval，避免步进与渲染竞争。
    const timer = setTimeout(() => setReplayStep((step) => step + 1), 900 / replaySpeed);
    return () => clearTimeout(timer);
  }, [replayPlan, replayPlaying, replayStep, replaySpeed]);

  /** 回放控制台的实际高度：适配要把这块让出来，写死值会随文案换行而不准。 */
  const [replayHeight, setReplayHeight] = useState(0);
  const replayRef = useCallback((element: HTMLDivElement | null) => {
    if (!element) { setReplayHeight(0); return; }
    const observer = new ResizeObserver((entries) => {
      /*
       * 量「看得见的高度」，而不是 `contentRect.height`。
       *
       * `contentRect` 不含内边距与边框——实测控制台 contentRect 高 223、
       * 实际占位 238（上下 padding 0.6/0.7rem 加 1px 边框），差的 15px 正好让内容底部
       * 又搭回控制台上。
       *
       * 为什么不直接用 `borderBoxSize`：它在不同浏览器/版本里既可能是对象也可能是数组，
       * 本机实测走了数组分支却仍给回内容高度。因此以 `contentRect` 为**可靠下界**，
       * 再用 `offsetHeight`（含 padding 与 border）取更大的那个——
       * 两个来源都在时取大值，宁可多留白也不让内容被压住。
       */
      const entry = entries[0];
      const contentH = entry?.contentRect.height ?? 0;
      const visualH = element.offsetHeight || contentH;
      const height = Math.max(contentH, visualH);
      setReplayHeight((current) => (Math.abs(current - height) < 1 ? current : height));
    });
    observer.observe(element);
    replayObserverRef.current = observer;
  }, []);
  const replayObserverRef = useRef<ResizeObserver | null>(null);
  useEffect(() => () => replayObserverRef.current?.disconnect(), []);

  /** 左右悬浮框实际占用的宽度：布局的目标宽高比与视口适配都要避开它们。 */
  const panelWidthRef = useRef({ left: 0, right: 0 });  const [panelWidths, setPanelWidths] = useState({ left: 0, right: 0 });
  /** stage 尺寸：窗口缩放时布局与适配都要跟着更新。 */
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  /**
   * 被手动拖动过的节点位置。拖动纯属视图层：不写公共本体，也不写学习档案。
   * 网格布局是算出来的，没有这份覆盖，节点会被下次重算拉回格子。
   * 位置按节点 id 存 localStorage，刷新后仍在原处——这是 Obsidian 式拖动的预期行为。
   */
  const [overrides, setOverrides] = useState<PositionOverrides>(() => {
    if (typeof localStorage === 'undefined') return {};
    try {
      const raw = localStorage.getItem(OVERRIDES_KEY);
      if (!raw) return {};
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      // 只接受形状正确的条目，坏数据不能让整页崩掉。
      const clean: PositionOverrides = {};
      for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (value && typeof value === 'object' && Number.isFinite((value as { x?: unknown }).x) && Number.isFinite((value as { y?: unknown }).y)) {
          clean[id] = { x: Number((value as { x: number }).x), y: Number((value as { y: number }).y) };
        }
      }
      return clean;
    } catch {
      return {};
    }
  });
  const persistOverrides = useCallback((next: PositionOverrides) => {
    try {
      if (Object.keys(next).length === 0) localStorage.removeItem(OVERRIDES_KEY);
      else localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
    } catch { /* 隐私模式：忽略 */ }
  }, []);

  /**
   * 自动摆位结果：新加入的节点由 `placeNewNodes` 挑一个合适的位置，之后**不再重算**。
   *
   * 为什么需要这份缓存：`layout()` 是全局力导向，每加一个节点都会把所有节点重排一遍，
   * 于是「加一个点，整个网络跳一下」，而且它既不保证与手动摆放的节点不重叠，
   * 也不显式数「新边与旧边交叉几次」。这份缓存让已摆好的节点**一个都不动**，
   * 只给真正新增的节点找位置（目标：不重叠、少交叉、贴着邻居）。
   *
   * 与 `overrides` 分开存：手动拖动优先于自动摆位；「重新布局」清掉自动摆位、手动保留。
   */
  const [placements, setPlacements] = useState<PositionOverrides>(() => {
    if (typeof localStorage === 'undefined') return {};
    try {
      const raw = localStorage.getItem(PLACEMENTS_KEY);
      if (!raw) return {};
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      const clean: PositionOverrides = {};
      for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (value && typeof value === 'object' && Number.isFinite((value as { x?: unknown }).x) && Number.isFinite((value as { y?: unknown }).y)) {
          clean[id] = { x: Number((value as { x: number }).x), y: Number((value as { y: number }).y) };
        }
      }
      return clean;
    } catch {
      return {};
    }
  });
  const placementsRef = useRef(placements);
  placementsRef.current = placements;
  /** 本轮渲染算出的新摆位，交给下面的 effect 落盘（渲染期不写状态）。 */
  const pendingPlacementsRef = useRef<PositionOverrides | null>(null);
  /** 最近一次自动优化的结果：摆位只发生在一帧里，留一份记录供调试与验收读取。 */
  const lastPlacementRef = useRef<{ pending: string[]; stats: unknown; nodeCount: number } | null>(null);
  const persistPlacements = useCallback((next: PositionOverrides) => {
    try {
      if (Object.keys(next).length === 0) localStorage.removeItem(PLACEMENTS_KEY);
      else localStorage.setItem(PLACEMENTS_KEY, JSON.stringify(next));
    } catch { /* 隐私模式：忽略 */ }
  }, []);
  /** 进入回放前暂存的手动位置；退出回放时恢复，见下面的 replay effect。 */
  const overridesSnapshotRef = useRef<PositionOverrides | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [families, setFamilies] = useState<EdgeFamily[]>(DEFAULT_VISIBLE_FAMILIES);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  /** 相机的最新值：动画补间要从「当前这一刻」出发，不能读渲染期的快照。 */
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  /** 「减少动态效果」下不做补间：直接跳到目标。 */
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [isFullscreen, setIsFullscreen] = useState(false);
  /** 窄屏（≤860px）时浮窗是纵向堆叠的普通卡片，因此把面板当成同一组，只保留一个。 */
  const [narrowPanelMode, setNarrowPanelMode] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 860px)');
    const sync = (event: MediaQueryListEvent) => setNarrowPanelMode(event.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [panning, setPanning] = useState(false);

  /*
   * 双指缩放（2026-10-05，移动端）。
   *
   * 画布以前只有单指平移：`panRef` 只记得住**一个** pointerId，第二根手指落下会把起点覆盖掉，
   * 于是「两指一捏」表现为画面乱跳；而 `.network-canvas-full` 的 `touch-action: none`
   * 又把浏览器原生缩放关掉了（那是平移必须的，否则单指拖动画布会连带滚页面）。
   * 两者相加的结果是：**移动端在画布上根本没有任何缩放手段**——
   * HUD 那两个按钮只能给固定倍率，选不到「把这一小片看清楚」。
   *
   * 现在按 pointer 事件自己实现：两指距离之比就是缩放比，
   * 中点怎么移动就怎么平移（缩放与平移是同一个式子，见 onCanvasPointerMove）。
   * 锚点走 `pointerInSvg`，与滚轮缩放共用同一套相机数学（viewBox 恒等于 stage 像素尺寸，
   * 1 用户单位 = 1 CSS 像素）。
   */
  const pinchRef = useRef<{
    ids: [number, number];
    /** 手势开始时两指的距离（用户单位）。 */
    startDistance: number;
    /** 手势开始时「两指中点」下的世界坐标；整个手势期间它必须一直待在当前中点下（不动点条件）。 */
    anchorWorld: { x: number; y: number };
    startViewport: Viewport;
  } | null>(null);
  /**
   * 画布上按下的指针（**含落在节点上的那些**，所以记录发生在捕获阶段：
   * 节点的 `onPointerDown` 会 `stopPropagation`，冒泡阶段根本看不到它）。
   */
  const canvasPointersRef = useRef(new Map<number, { x: number; y: number }>());

  const panels = {
    // 默认位置避开顶部 HUD（约 3.4rem 高）与左侧边栏，否则 HUD 会挡住面板里的控件。
    list: useDraggablePanel('list', { x: 0.015, y: 0.22 }),
    recommend: useDraggablePanel('recommend', { x: 0.755, y: 0.22 }),
    detail: useDraggablePanel('detail', { x: 0.015, y: 0.64 }),
    families: useDraggablePanel('families', { x: 0.755, y: 0.64 }),
    spec: useDraggablePanel('spec', { x: 0.015, y: 0.64 }),
    // 与「连接类型」同侧错开，避免两块浮窗完全重叠。
    views: useDraggablePanel('views', { x: 0.755, y: 0.64 }),
  } satisfies Record<PanelId, ReturnType<typeof useDraggablePanel>>;

  const [justAdded, setJustAdded] = useState<Record<string, number>>({});
  /** 上一次看到的已加入集合：用于判断这一次是「谁新加进来的」。 */
  const previousIdsRef = useRef<Set<string>>(new Set());
  const refreshKeyRef = useRef(0);
  /** 当前 URL 参数的最新值：`setAdded` 要在保留回放参数时读它，不能进依赖数组（会抖）。 */
  const currentParamsRef = useRef(params);
  useEffect(() => { currentParamsRef.current = params; }, [params]);

  const rawIds = params.get('nodes') ?? '';
  const requested = useMemo(() => new Set(rawIds.split(',').map((id) => id.trim()).filter(Boolean)), [rawIds]);
  const nodes = graph.data?.nodes ?? [];
  /*
   * 线索层（2026-10 加）：`granularity === 'topic'` 的话题级条目。
   * 它们在网络里单独标出来——**不参与前置计算**（推荐面板与强关联圈的读法见 network.ts 的 THREAD_LAYER
   * 与 node-related.ts），但仍然照常画、照常连接：改的是读法，不是把话题藏起来。
   */
  const threadIds = useMemo(
    () => new Set(nodes.filter((node) => node.granularity === 'topic').map((node) => node.id)),
    [nodes],
  );
  const knownIds = useMemo(() => new Set(nodes.map((node) => node.id)), [nodes]);
  const unresolved = useMemo(() => [...requested].filter((id) => !knownIds.has(id)).sort(), [requested, knownIds]);
  const added = useMemo(() => new Set([...requested].filter((id) => knownIds.has(id))), [requested, knownIds]);

  const setAdded = useCallback((next: Set<string>) => {
    const sorted = [...next].filter((id) => knownIds.has(id)).sort((a, b) => a.localeCompare(b, 'en'));
    /*
     * 回放参数必须原样保留。
     *
     * 踩过的坑：这里早先直接 `setParams('?nodes=…')`，把 `play/entry/path/goal/route`
     * 一并冲掉——视觉效果就是「点了回放按钮，地址栏闪一下变成 /network，回放面板从没出现」。
     * 进入回放时本页会调用 setAdded，于是刚进来的第一帧就把自己踢出了回放模式。
     */
    const params = new URLSearchParams();
    if (sorted.length) params.set('nodes', sorted.join(','));
    for (const key of ['play', 'entry', 'path', 'goal', 'route']) {
      const value = currentParamsRef.current.get(key);
      if (value !== null) params.set(key, value);
    }
    setParams(params, { replace: true });
  }, [knownIds, setParams]);

  useEffect(() => {
    if (!replayPlan) return;
    /*
     * 必须等本体图到位再写入。
     *
     * 踩过的坑：这条 effect 的原始依赖只有 `replayPlan`，在首帧（图还在加载、
     * `knownIds` 为空）就跑了；而 `setAdded` 会用 `knownIds` 过滤，于是整条路线
     * 被过滤成空集写回 URL——现象是「回放面板出现了，但画布上一个节点都没有」。
     * 依赖 `knownIds` 后，图到位时会再跑一次，这次才写得进去。
     */
    if (knownIds.size === 0) return;
    const all = new Set(replayPlan.all);
    setAdded(all);
    setReplayStep(0);
    setReplayPlaying(false);
    /*
     * 进入回放时收起全部悬浮框。
     *
     * 回放要看清「谁先出现、箭头接到谁身上」，而左侧的全部节点列表与右侧的推荐面板
     * 正好压在画布两边。这里只收起、不记住——退出回放后学习者可以自己再打开。
     */
    setOpen({ list: false, recommend: false, detail: false, families: false, spec: false, views: false });
    /*
     * 回放使用独立布局：进入时把学习者手动摆放的位置暂存到内存，回放期间用算法布局，
     * 退出回放后原样恢复。
     *
     * 早先的实现是直接删掉 localStorage 里的坐标——那等于用「回放可复现」换掉了
     * 学习者自己摆好的画布，退出回放却回不来了。现在的取舍是：回放仍从同一个形状开始，
     * 但手动位置只是暂时让位，不会被销毁。
     */
    setOverrides((current) => {
      if (overridesSnapshotRef.current === null) overridesSnapshotRef.current = current;
      return {};
    });
    // 进度由用户控制，不能被这条 effect 覆盖。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayPlan, knownIds]);

  /** 退出回放：把进入前的手动位置原样恢复（只恢复内存快照，不重写 localStorage）。 */
  useEffect(() => {
    if (replayPlan || overridesSnapshotRef.current === null) return;
    const snapshot = overridesSnapshotRef.current;
    overridesSnapshotRef.current = null;
    setOverrides(snapshot);
  }, [replayPlan]);

  /**
   * 「刚加入」的节点集合，用于入场动画与新边生成动画。
   *
   * 判定方式是「与上一次看到的 added 比较」，而不是在 setAdded 的闭包里算差异：
   * 闭包版本一旦遇到连续加入或 React 批处理就会算不出新增项，动画随机丢失
   * （实测第 4 个节点没有生长动画）。
   *
   * previousIds 只在**首次拿到本体数据**时初始化一次，之后由本 effect 维护；
   * 这样「刷新已有的 URL」不会误触发动画，只有真正的加入才会。
   */
  useEffect(() => {
    if (knownIds.size === 0) return;
    if (refreshKeyRef.current !== knownIds.size) {
      // 本体刚加载（或换了版本）：把当前集合当作基线，不播动画。
      refreshKeyRef.current = knownIds.size;
      previousIdsRef.current = new Set(added);
      return;
    }
    const previous = previousIdsRef.current;
    const fresh = [...added].filter((id) => !previous.has(id));
    previousIdsRef.current = new Set(added);
    if (fresh.length === 0) return;
    const stamp = Date.now();
    setJustAdded((current) => {
      const merged: Record<string, number> = {};
      // 仍在窗口内的保留，新加入的盖上当前时间戳。
      for (const id of added) if (current[id]) merged[id] = current[id];
      for (const id of fresh) merged[id] = stamp;
      return merged;
    });
  }, [added, knownIds.size]);

  const toggle = useCallback((id: string) => {
    const next = new Set(added);
    if (next.has(id)) {
      next.delete(id);
      // 手动删除是明确意图：记下来，别让自动规则下一轮又把它加回去。
      autoAddedRef.current.add(id);
    } else {
      next.add(id);
      autoAddedRef.current.delete(id);
    }
    setAdded(next);
  }, [added, setAdded]);

  /**
   * 右键把节点移出视图。
   *
   * 只从 URL 里的「已加入集合」移除，**不删除本体节点、也不写任何状态**：
   * 公共本体是只读的，视图里的增删都只是本页的显示选择。
   */
  const removeFromView = useCallback((id: string) => {
    if (!added.has(id)) return;
    const next = new Set(added);
    next.delete(id);
    // 记下这次删除，免得自动加入规则下一轮又把它加回来。
    autoAddedRef.current.add(id);
    setAdded(next);
    setSelected((current) => (current === id ? null : current));
    setRemovedNotice(id);
  }, [added, setAdded]);

  const [removedNotice, setRemovedNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!removedNotice) return;
    const timer = setTimeout(() => setRemovedNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [removedNotice]);

  /** 一般性提示（补齐方法节点、撤销清空等）；与「移出节点」的提示分开，避免互相覆盖。 */
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [notice]);
  /** 「清空」是可撤销的视图操作：清掉的是本页画布，不动本体，也不动学习记录。 */
  const [clearedNodes, setClearedNodes] = useState<Set<string> | null>(null);

  /**
   * 打开面板或改变窗口大小时，把浮窗夹回可见区。
   *
   * 位置按视口比例保存，右侧面板在较窄的窗口里会被推出画布——关闭按钮正好在屏幕外。
   */
  useEffect(() => {
    for (const id of PANEL_IDS) if (open[id]) panels[id].clampIntoView();
    // panels 每次渲染都是新对象，但它包着的句柄是稳定的；依赖只跟 open 与窗口尺寸有关。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const onResize = () => { for (const id of PANEL_IDS) if (open[id]) panels[id].clampIntoView(); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const titleOf = useCallback((id: string) => nodes.find((node) => node.id === id)?.title ?? id, [nodes]);

  /**
   * 刚加入的节点集合。**必须按集合判断，不能按边的方向判断**：
   * 边的 from/to 方向由 `dedupePairs` 保留「首次出现」的顺序决定，是任意的
   * （实测同一批 topic 边里，新节点有时在 from、有时在 to）。
   * 早先写成 `justAdded[edge.to] && !justAdded[edge.from]`，导致新节点当 from 时动画丢失。
   *
   * 注意：必须放在**所有提前 return 之前**。放在 `if (graph.loading) return` 之后，
   * 加载态与就绪态的 hook 数量不同，React 会直接抛 #310（Rendered more hooks than
   * during the previous render）把整页打白。
   */
  const freshIds = useMemo(() => new Set(Object.keys(justAdded)), [justAdded]);

  /**
   * 自动加入：局部技巧类方法节点与视图已有节点建立**超过三条**连接时，直接进视图。
   *
   * 只在「视图非空」时生效——空视图没有任何已加入节点，链接数必然是 0，
   * 让规则在冷启动时也跑一遍只会白算。
   *
   * 用一个 ref 记住「已经自动加过哪些」，避免把学习者手动删掉的节点反复加回来：
   * 手动删除是明确意图，自动规则不该覆盖它。
   */
  const autoAddedRef = useRef<Set<string>>(new Set());
  const autoCandidates = useMemo(() => {
    if (!graph.data || added.size === 0) return [];
    return autoAddCandidates(graph.data, added, families).filter((item) => !autoAddedRef.current.has(item.node));
  }, [graph.data, added, families]);

  /**
   * 补齐方法节点改成一次显式操作。
   *
   * 早先它在 effect 里自动执行：往视图里放几个概念，画布会自己长出新的方法节点。
   * 规则本身有依据（方法节点与视图的连接超过阈值），但「视图自己变多」会让学习者
   * 失去对画布的控制感，也说不清这些节点为什么出现。现在改成按钮：先说明有几个、为什么，
   * 由学习者决定是否加入，并且可以撤销。
   */
  const [autoDismissed, setAutoDismissed] = useState(false);
  useEffect(() => { setAutoDismissed(false); }, [added.size]);

  function applyAutoAdd() {
    if (autoCandidates.length === 0) return;
    const names = autoCandidates.map((item) => item.title);
    const next = new Set(added);
    for (const item of autoCandidates) {
      next.add(item.node);
      autoAddedRef.current.add(item.node);
    }
    setAdded(next);
    const reasons = autoCandidates.slice(0, 3).map((item) => fill(txt.autoAddedItem, { title: item.title, inView: item.inView }));
    setNotice(fill(txt.autoAddedApplied, {
      count: names.length,
      list: reasons.join(txt.joinSeparator),
      more: names.length > 3 ? fill(txt.autoAddedMore, { count: names.length }) : '',
    }));
  }

  /**
   * 推荐按节点分类分组。方法类（局部技巧 / 全局方法）单独成组，
   * 因此它们不会被一堆概念条目淹没——这是「把方法类节点区分出来」的落点。
   */
  const [recommendFilter, setRecommendFilter] = useState<NodeGroup | 'all'>('all');

  const view = useMemo(() => {
    if (!graph.data) return null;
    const edges = buildEdges(graph.data, added, families);
    /**
     * 布局**只依赖「已加入集合 + 边源」**，不依赖面板占用、窗口尺寸或任何测量结果。
     *
     * 这是为了确定性，也是踩过的坑：布局一旦依赖测量值，同一 URL 两次加载就可能得到
     * 不同坐标——面板宽度在首帧、ResizeObserver 回调、缩放过程中都可能变化，
     * 每次变化都会重排。实测同一 URL 刷新前后节点 y 坐标相差 83px（正好一行间距），
     * 而「同一 URL 得到同一布局」是这一页对用户的承诺。
     *
     * 位置由**力导向**决定（斥力 + 按关系强弱的吸力），不再走网格排布；
     * 「卡片不重叠」由 `layout` 内部的 relaxToSpacing 保证。
     */
    const raw = layout(graph.data, added, families);
    /*
     * 增量摆位：已知位置的节点**一个都不动**，只给真正新增的节点挑位置。
     *
     * 目标与用户的要求一致：新节点不与任何已有卡片重叠；新边与已有边的交错尽量少；
     * 连边尽量短（贴着邻居放）。实现见 `web/src/node-placement.ts`。
     * 优先级：手动位置 > 上次的自动摆位 > 本次新算。
     */
    const known: PositionOverrides = {};
    for (const node of raw.placed) {
      const manual = overrides[node.id];
      if (manual) { known[node.id] = manual; continue; }
      const cached = placements[node.id];
      if (cached) { known[node.id] = cached; continue; }
      // 第一次见到这个节点：先落一个「基线」位置（力导向结果），随后由下面的优化改写。
      known[node.id] = { x: node.x, y: node.y };
    }
    const pendingIds = raw.placed
      .map((node) => node.id)
      .filter((id) => !overrides[id] && !placements[id]);
    let placementStats: ReturnType<typeof placeNewNodes>['stats'] | null = null;
    if (pendingIds.length > 0 && raw.placed.length > pendingIds.length) {
      // 只有「在已有网络之上新增」才做优化：一次性铺开整张图时力导向的结果更整体。
      const byId = new Map(raw.placed.map((node) => [node.id, node]));
      const existingCards = raw.placed
        .filter((node) => !pendingIds.includes(node.id))
        .map((node) => ({ id: node.id, x: known[node.id].x, y: known[node.id].y }));
      const links = edges
        .filter((edge) => byId.has(edge.from) && byId.has(edge.to))
        .map((edge) => ({ from: edge.from, to: edge.to }));
      const result = placeNewNodes({ existing: existingCards, pending: pendingIds, links });
      placementStats = result.stats;
      for (const [id, point] of result.placements) known[id] = point;
      if (typeof window !== 'undefined') {
        (window as unknown as Record<string, unknown>).__mcsPlacement = { pending: pendingIds, stats: result.stats };
      }
    }
    const fitted = applyOverrides(raw, known);
    /*
     * 把这次算出来的摆位交给 effect 落盘——memo 里不能有副作用（写 state / localStorage 都算）。
     * 下一次加节点时它们就是「已有节点」，位置不再变。
     */
    pendingPlacementsRef.current = pendingIds.length > 0 ? known : null;
    if (placementStats) {
      // 最近一次优化的结果留在页面上：摆位只发生在一帧里，事后想查「它当时怎么选的」得靠这份记录。
      lastPlacementRef.current = { pending: pendingIds, stats: placementStats, nodeCount: fitted.placed.length };
    }
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__mcsPlacementInfo = {
        pending: pendingIds,
        stats: placementStats,
        last: lastPlacementRef.current,
        placed: fitted.placed.map((node) => ({ id: node.id, x: Math.round(node.x), y: Math.round(node.y) })),
      };
    }
    // 调试钩子：布局是纯函数，但「算出来对不对」只有把中间量摊开才好查。
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__mcsNetwork = {
        families,
        addedCount: added.size,
        edgeCount: edges.length,
        columns: fitted.placed.map((node) => ({ id: node.id, column: node.column, row: node.row, x: node.x, y: node.y })),
        maxColumn: fitted.maxColumn,
        maxRow: fitted.maxRow,
        isolated: fitted.isolated,
        panelWidths,
        layoutWidth: fitted.width,
        layoutHeight: fitted.height,
      };
    }
    return {
      edges,
      relations: relationKindsPresent(edges),
      layout: fitted,
      recommendations: recommend(graph.data, added, 30, families),
      degree: degreeMap(edges),
    };
  }, [graph.data, added, families, overrides, placements, persistPlacements]);

  /**
   * 落盘本轮新增的自动摆位，并顺手清掉已经移出视图的条目。
   *
   * 清理不只是省空间：一个被移出再重新加入的节点如果沿用旧坐标，那个位置可能已经被
   * 后来的节点占了——重新优化一次比留着一个重合格子好。
   */
  useEffect(() => {
    const next = pendingPlacementsRef.current;
    if (!next) return;
    pendingPlacementsRef.current = null;
    const pruned: PositionOverrides = {};
    for (const [id, point] of Object.entries(next)) if (added.has(id) || overrides[id]) pruned[id] = point;
    setPlacements(pruned);
    persistPlacements(pruned);
  }, [view, added, overrides, persistPlacements]);

  /** 推荐按分类分组；组序固定，组内保持 recommend 已算好的强弱排序。 */
  const groupedRecommendations = useMemo<Array<{ group: NodeGroup; items: Recommendation[] }>>(() => {
    if (!view) return [];
    const buckets = new Map<NodeGroup, Recommendation[]>();
    for (const rec of view.recommendations) {
      const node = nodes.find((item) => item.id === rec.node);
      const group = node ? groupOfNode(node) : 'other';
      const list = buckets.get(group) ?? [];
      list.push(rec);
      buckets.set(group, list);
    }
    return NODE_GROUP_ORDER
      .filter((group) => buckets.has(group))
      .map((group) => ({ group, items: buckets.get(group)! }));
  }, [view, nodes]);

  /** 已被自动加入的局部技巧：在画布上标出来，让「它怎么进来的」可核对。 */
  const autoAddedIds = useMemo(() => new Set(autoAddedRef.current), [view, added]);

  /** 话题配色：同一话题的节点同色，由本体的 topic 聚合块自动分配。 */
  const topicColors = useMemo(() => (graph.data ? topicAssignment(graph.data, locale) : null), [graph.data, locale]);

  /**
   * 图例里只列**当前画布上真有的**话题与条数，不把整张配色表铺出来——
   * 全库有 11 个话题块，列全会把图例挤满，而且大多数与眼前这张图无关。
   */
  const visibleTopics = useMemo(() => {
    if (!topicColors || !view) return [] as Array<{ title: string; color: string; count: number }>;
    const tally = new Map<string, number>();
    for (const node of view.layout.placed) {
      const title = topicColors.title.get(node.id);
      if (title) tally.set(title, (tally.get(title) ?? 0) + 1);
    }
    return [...tally.entries()]
      .map(([title, count]) => {
        const nodeId = view.layout.placed.find((n) => topicColors.title.get(n.id) === title)?.id ?? '';
        const index = topicColors.index.get(nodeId) ?? 0;
        return { title, count, color: TOPIC_PALETTE[index % TOPIC_PALETTE.length] };
      })
      .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, 'zh'));
  }, [topicColors, view]);

  // fitView 与宽高比计算需要读最新的 view 与面板占用，但两者都在渲染期产生；
  // 用 ref 承接以免依赖数组抖动。
  const viewRef = useRef<typeof view>(null);
  useEffect(() => { viewRef.current = view; }, [view]);
  const openStateRef = useRef(open);
  useEffect(() => { openStateRef.current = open; }, [open]);

  useEffect(() => {
    if (Object.keys(justAdded).length === 0) return;
    const timer = setTimeout(() => setJustAdded({}), 900);
    return () => clearTimeout(timer);
  }, [justAdded]);

  // 全屏状态跟随浏览器：按 Esc 退出时按钮文案要跟着恢复。
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // 标记「来过了」，下次默认收起面板把画布让给网络。
  useEffect(() => {
    try { localStorage.setItem(VISITED_KEY, '1'); } catch { /* 隐私模式：忽略 */ }
  }, []);

  /**
   * 相机的「可见区」= **画布元素**（`.network-canvas-full`），不是 stage（2026-10-05）。
   *
   * 桌面端两者是同一个盒子（画布 `position: absolute; inset: 0` 铺满 stage），取值完全不变；
   * 窄屏（≤860px）画布只是 stage 里的一块 `46vh` 的框，而 stage 本身有整页那么高
   * （画布下面还排着 HUD 与一堆纵向卡片）。
   *
   * 为什么必须区分：`viewBox` 是按这里量出来的尺寸写的，`preserveAspectRatio="xMinYMin meet"`
   * 再把它缩进 SVG 元素。用 stage 的高（手机实测 2597）去写 viewBox、而元素只有 388 高，
   * 结果整张网络被缩到 **0.1487 倍**、挤在画布左边一条 58px 宽的带子里（见 VALIDATION 第八十四轮）。
   * 相机几何（适配、夹取、居中）全都要以「用户真正看得到的那块」为准。
   */
  const viewportRect = useCallback((): DOMRect | null => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return rect;
    }
    return stageRef.current?.getBoundingClientRect() ?? null;
  }, []);

  /**
   * 量出画布尺寸与左右悬浮框实际占用的宽度。
   *
   * 面板宽 340px，左右各开一个就吃掉近 700px；布局与适配都必须知道这一点。
   * 用 ResizeObserver 而不是只测一次：窗口缩放、进出全屏都会改变 stage 尺寸，
   * 不跟着更新的话布局的宽高比与适配都会停在旧值。宽度不变就不 setState，因此会收敛。
   */
  const measureStage = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = viewportRect();
    if (!rect) return;
    let left = 0;
    let right = 0;
    for (const id of PANEL_IDS) {
      if (!openStateRef.current[id]) continue;
      const element = stage.querySelector(`.floating-panel[aria-label="${panelTitles[id]}"]`);
      if (!element) continue;
      // 窄屏下面板是纵向堆叠、不遮画布，此时不计入占用。
      if (getComputedStyle(element).position !== 'absolute') continue;
      const box = element.getBoundingClientRect();
      const centerX = box.left + box.width / 2 - rect.left;
      if (centerX < rect.width / 2) left = Math.max(left, box.width);
      else right = Math.max(right, box.width);
    }
    panelWidthRef.current = { left, right };
    setPanelWidths((current) => (current.left === left && current.right === right ? current : { left, right }));
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    setStageSize((current) => (current.w === w && current.h === h ? current : { w, h }));
  }, [viewportRect, panelTitles]);

  useEffect(() => {
    measureStage();
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (typeof ResizeObserver === 'undefined' || (!stage && !canvas)) return undefined;
    const observer = new ResizeObserver(() => measureStage());
    if (stage) observer.observe(stage);
    // 窄屏画布（46vh）与 stage 不是同一个盒子，两个都要盯：只盯 stage 会漏掉画布自身的高度变化。
    if (canvas && canvas !== stage) observer.observe(canvas);
    return () => observer.disconnect();
  }, [measureStage, open, view]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stageRef.current?.requestFullscreen();
    } catch {
      // 某些环境（如无用户手势或权限受限）会拒绝；静默失败不打断使用。
    }
  }, []);

  /**
   * 相机 = 「世界坐标 → 屏幕像素」的相似变换：
   *   screenX = worldX * scale + offset.x
   *   screenY = worldY * scale + offset.y
   *
   * 屏幕坐标以 stage 左上角为原点。这个模型的关键好处是 scale 就是真实比例，
   * 不再依赖 SVG 的 viewBox 与 preserveAspectRatio 是否恰好等比例
   * （旧实现把「可用区算出的比例」塞进覆盖整个 stage 的 viewBox，
   *  再由 xMidYMid meet 二次缩放，实际比例与 scale 不符，
   *  于是「以光标为锚点」的公式算错了位置——放大时内容就朝左上角飞）。
   */
  interface Camera { scale: number; x: number; y: number }

  /**
   * 把相机偏移限制在合法范围：内容不能整个被推出画布。
   *
   * 两条必须遵守的约束，都是踩过的坑：
   *
   * 1. **不能有「内容比画布小时强制居中」这类分支**：强制居中会改写 offset，
   *    直接破坏「光标下的世界点不动」这个不变量。实测每格漂 ~20px、四格累计 78px，
   *    正是用户看到的「一放大就往左上角飞」。居中只在 fitView 里做。
   * 2. **区间要留出一整屏的余量**：一旦内容放大到超出画布，夹取就会生效并改变 offset，
   *    锚点随即失效（实测四格漂 32px）。留 ±viewport 的余量后，常规缩放全程都夹不到，
   *    锚点稳定；同时仍保证内容不会被拖到完全看不见。
   */
  const clampCamera = useCallback((camera: Camera): Camera => {
    const current = viewRef.current;
    const rect = viewportRect();
    if (!rect || !current) return camera;
    const contentW = Math.max(current.layout.width, 1) * camera.scale;
    const contentH = Math.max(current.layout.height, 1) * camera.scale;
    const clampAxis = (value: number, content: number, viewport: number) => {
      // 至少保留四分之一屏的内容可见，同时允许平移出一屏的空白。
      const low = Math.min(0, viewport - content) - viewport;
      const high = Math.max(0, viewport - content) + viewport;
      return Math.min(high, Math.max(low, value));
    };
    return {
      scale: camera.scale,
      x: clampAxis(camera.x, contentW, rect.width),
      y: clampAxis(camera.y, contentH, rect.height),
    };
  }, [viewportRect]);

  /* ---------- 保存的视图（用户要求：「加入保存功能，下次可以直接用」） ---------- */
  const { profileId, profile } = useProfileContext();
  /** 视图面板是否展开（与其它面板并列，用它自己的开关）。 */
  const [viewsOpen, setViewsOpen] = useState(false);
  /**
   * 已保存的视图。
   *
   * 两条来源：选了学习者档案就读 E 层（服务端），没选就读本机 localStorage。
   * 界面上会明确写出当前用的是哪一条——不说清楚，用户会以为已经存进档案了。
   */
  const [savedViews, setSavedViews] = useState<SavedNetworkView[]>([]);
  const [viewsNote, setViewsNote] = useState('');
  const [viewQuery, setViewQuery] = useState('');
  const [viewSort, setViewSort] = useState<'recent' | 'oldest' | 'nodes' | 'name'>('recent');
  const visibleSavedViews = useMemo(() => {
    const query = viewQuery.trim().toLocaleLowerCase(locale);
    const updated = (entry: SavedNetworkView) => Date.parse(entry.updatedAt) || 0;
    return savedViews.filter((entry) => entry.name.toLocaleLowerCase(locale).includes(query)).sort((a, b) => {
      const primary = viewSort === 'oldest' ? updated(a) - updated(b)
        : viewSort === 'nodes' ? (b.payload.added?.length ?? 0) - (a.payload.added?.length ?? 0)
        : viewSort === 'name' ? a.name.localeCompare(b.name, locale)
        : updated(b) - updated(a);
      return primary || a.viewId.localeCompare(b.viewId);
    });
  }, [savedViews, viewQuery, viewSort, locale]);
  const duplicateViews = useMemo(() => {
    const byName = new Map<string, SavedNetworkView[]>();
    for (const entry of savedViews) {
      const group = byName.get(entry.name) ?? [];
      group.push(entry);
      byName.set(entry.name, group);
    }
    const result = new Map<string, { index: number; total: number }>();
    for (const group of byName.values()) {
      if (group.length < 2) continue;
      group.sort((a, b) => a.viewId.localeCompare(b.viewId));
      group.forEach((entry, index) => result.set(entry.viewId, { index: index + 1, total: group.length }));
    }
    return result;
  }, [savedViews]);
  const [localViewCount, setLocalViewCount] = useState(0);
  const [localViewsError, setLocalViewsError] = useState(false);
  const [migratingViews, setMigratingViews] = useState(false);
  const [migrationNote, setMigrationNote] = useState('');
  const migrationRequest = useRef<AbortController | null>(null);
  const viewRequest = useRef<AbortController | null>(null);

  const refreshLocalViews = useCallback(() => {
    try { setLocalViewCount(readLocalViews().length); setLocalViewsError(false); }
    catch { setLocalViewCount(0); setLocalViewsError(true); }
  }, []);

  /** 读回已保存的视图：有档案读 E 层，没有就读本机。 */
  const refreshViews = useCallback(async () => {
    viewRequest.current?.abort();
    const request = new AbortController();
    viewRequest.current = request;
    refreshLocalViews();
    if (profileId) {
      try {
        const payload = await api<{ views: SavedNetworkView[] }>(`/profiles/${encodeURIComponent(profileId)}/network-views`, { signal: request.signal });
        if (request.signal.aborted) return;
        setSavedViews(payload.views);
        setViewsNote(txt.viewsNoteProfile);
      } catch (error) {
        if (request.signal.aborted) return;
        setSavedViews([]);
        setViewsNote(fill(txt.viewsReadFailed, { message: String(error instanceof Error ? error.message : error) }));
      }
      return;
    }
    try {
      setSavedViews(readLocalViews());
      setViewsNote(txt.viewsNoteLocal);
    } catch {
      setSavedViews([]);
      setViewsNote(txt.viewsNoteNoStorage);
    }
  }, [profileId, refreshLocalViews, txt]);

  useEffect(() => {
    setSavedViews([]);
    void refreshViews();
    const storageChanged = (event: StorageEvent) => {
      if (event.key === SAVED_VIEWS_LOCAL_KEY || event.key === null) void refreshViews();
    };
    window.addEventListener('storage', storageChanged);
    return () => { viewRequest.current?.abort(); window.removeEventListener('storage', storageChanged); };
  }, [refreshViews]);

  useEffect(() => {
    setMigrationNote('');
    setMigratingViews(false);
    setViewQuery('');
    setViewSort('recent');
    return () => { migrationRequest.current?.abort(); migrationRequest.current = null; };
  }, [profileId]);

  const moveLocalViews = useCallback(async () => {
    if (!profileId || !profile || migrationRequest.current) return;
    const request = new AbortController();
    migrationRequest.current = request;
    setMigratingViews(true);
    setMigrationNote('');
    let completed = 0;
    try {
      await migrateLocalViews(profileId, request.signal, (count) => { completed = count; refreshLocalViews(); });
      if (!request.signal.aborted) setMigrationNote(fill(txt.viewsMigrated, { count: completed, name: profile.name }));
    } catch (error) {
      if (!request.signal.aborted) setMigrationNote(fill(txt.viewsMigrateFailed, { count: completed, message: formatError(error) }));
    } finally {
      if (migrationRequest.current === request) {
        migrationRequest.current = null;
        setMigratingViews(false);
        void refreshViews();
      }
    }
  }, [profileId, profile, refreshLocalViews, refreshViews, txt]);

  const localViews = useCallback((next: typeof savedViews) => {
    writeLocalViews(next);
    refreshLocalViews();
  }, [refreshLocalViews]);

  /** 当前网络状态打包成一个视图：已加入的节点、可见边源、手动位置、相机。 */
  const currentViewPayload = useCallback(() => ({
    added: [...added],
    families: [...families],
    positions: overrides,
    camera: viewport,
  }), [added, families, overrides, viewport]);

  const saveView = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) { setNotice(txt.viewsNameRequired); return; }
    const payload = currentViewPayload();
    if (profileId) {
      try {
        await api(`/profiles/${encodeURIComponent(profileId)}/network-views`, {
          method: 'POST', body: { name: trimmed, payload },
        });
        setNotice(fill(txt.viewsSavedProfile, {
          name: trimmed,
          nodes: payload.added.length,
          families: payload.families.length,
          positions: Object.keys(payload.positions).length,
        }) + ' ' + txt.viewsSnapshotSaved);
        void refreshViews();
      } catch (error) {
        setNotice(fill(txt.viewsSaveFailed, { message: String(error instanceof Error ? error.message : error) }));
      }
      return;
    }
    const entry = { viewId: `local-${crypto.randomUUID()}`, name: trimmed, payload, updatedAt: new Date().toISOString(), local: true };
    try {
      const next = [entry, ...readLocalViews()];
      localViews(next);
      setSavedViews(next);
    } catch (error) {
      setNotice(fill(txt.viewsSaveFailed, { message: formatError(error) }));
      return;
    }
    setNotice(fill(txt.viewsSavedLocal, {
      name: trimmed,
      nodes: payload.added.length,
      families: payload.families.length,
    }) + ' ' + txt.viewsSnapshotSaved);
  }, [currentViewPayload, localViews, profileId, refreshViews, savedViews, setNotice, txt]);

  /**
   * 载入：把视图里的四样东西原样放回去。
   *
   * 节点若已不在当前本体里，**如实说明缺了几个**，不静默替换成别的节点——
   * 「下次直接用」的前提是知道这次和上次差在哪。
   */
  const loadView = useCallback((entry: (typeof savedViews)[number]) => {
    const known = new Set(nodes.map((node) => node.id));
    const restored = (entry.payload.added ?? []).filter((id) => known.has(id));
    setAdded(new Set(restored));
    if (Array.isArray(entry.payload.families) && entry.payload.families.length > 0) {
      setFamilies(entry.payload.families as EdgeFamily[]);
    }
    if (entry.payload.positions) {
      setOverrides(entry.payload.positions);
      persistOverrides(entry.payload.positions);
    }
    if (entry.payload.camera) {
      const camera = entry.payload.camera;
      setViewport({ x: camera.x, y: camera.y, scale: Math.min(Math.max(camera.scale, ZOOM_MIN), ZOOM_MAX) });
    }
    const missing = (entry.payload.added ?? []).length - restored.length;
    setNotice(fill(txt.viewsLoaded, {
      name: entry.name,
      nodes: restored.length,
      positions: Object.keys(entry.payload.positions ?? {}).length,
      missing: missing > 0 ? fill(txt.viewsLoadedMissing, { count: missing }) : '',
    }));
  }, [nodes, persistOverrides, setAdded, setFamilies, setNotice, setOverrides, setViewport, txt]);

  const renameView = useCallback(async (entry: (typeof savedViews)[number]) => {
    const name = window.prompt(txt.viewsPromptRename, entry.name)?.trim();
    if (!name || name === entry.name) return;
    if (profileId && !entry.local) {
      try {
        await api(`/profiles/${encodeURIComponent(profileId)}/network-views/${encodeURIComponent(entry.viewId)}`, {
          method: 'PATCH', body: { name },
        });
        void refreshViews();
      } catch (error) {
        setNotice(fill(txt.viewsRenameFailed, { message: String(error instanceof Error ? error.message : error) }));
      }
      return;
    }
    try {
      const next = readLocalViews().map((item) => (item.viewId === entry.viewId ? { ...item, name, updatedAt: new Date().toISOString() } : item));
      localViews(next);
      setSavedViews(next);
    } catch (error) { setNotice(fill(txt.viewsRenameFailed, { message: formatError(error) })); }
  }, [localViews, profileId, refreshViews, savedViews, setNotice, txt]);

  const deleteView = useCallback(async (entry: (typeof savedViews)[number]) => {
    if (profileId && !entry.local) {
      try {
        await api(`/profiles/${encodeURIComponent(profileId)}/network-views/${encodeURIComponent(entry.viewId)}`, { method: 'DELETE' });
        void refreshViews();
      } catch (error) {
        setNotice(fill(txt.viewsDeleteFailed, { message: String(error instanceof Error ? error.message : error) }));
      }
      return;
    }
    try {
      const next = readLocalViews().filter((item) => item.viewId !== entry.viewId);
      localViews(next);
      setSavedViews(next);
    } catch (error) { setNotice(fill(txt.viewsDeleteFailed, { message: formatError(error) })); }
  }, [localViews, profileId, refreshViews, savedViews, setNotice, txt]);

  /** 「保存」按钮：用一行 prompt 收名字。名字是必须的——下次要靠它认出来。 */
  const saveCurrentView = useCallback(() => {
    const stamp = fmtDate(new Date(), { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const name = window.prompt(txt.viewsPromptSave, fill(txt.viewsDefaultName, { stamp }));
    if (name === null) return;
    void saveView(name);
  }, [saveView, fmtDate, txt]);

  /**
   * 相机动画：把视角**平滑地**挪到目标位置。
   *
   * 用户的要求：「加入一个新的节点之后，视角要平滑地转移到以新增节点为中心的视图。」
   *
   * 三条实现上的选择：
   * 1. **用 rAF 补间而不是 CSS transition**：相机是 React 状态，拖动与滚轮会直接写它，
   *    CSS 过渡会和手写状态互相打架（过渡进行中用户一拖，落点由插值决定而不是指针）。
   * 2. **用户一动就取消**：滚轮、拖动空白、拖动节点都立刻停掉动画——
   *    否则「相机自己在动，我拖不动」是最难受的一种手感。
   * 3. **尊重「减少动态效果」**：直接跳到目标，不做补间。
   */
  /**
   * 相机调试记录：**合并**写入而不是整体替换。
   *
   * 原来 finish / cancel 都用新对象覆盖 `__mcsCameraLast`，于是一旦动画结束，
   * 「居中到哪个节点」这条信息就被 `{finished:true}` 冲掉——验收读不到它（实测）。
   */
  const recordCamera = useCallback((patch: Record<string, unknown>) => {
    if (typeof window === 'undefined') return;
    const target = window as unknown as Record<string, unknown>;
    target.__mcsCameraLast = { ...(target.__mcsCameraLast as Record<string, unknown> ?? {}), ...patch };
  }, []);

  /**
   * 相机图层（`<g>`）与「把相机画到 DOM 上」的唯一入口（2026-10-05）。
   *
   * 为什么要有这条绕过 React 的路：相机补间原来是**每帧 `setViewport`**，
   * 而一次 `setViewport` 会重渲染整张网络（节点、边、标签、面板）——实测**一次 400ms 的
   * 居中动画 = 309ms 脚本 / 524ms 任务**，安卓上每一帧都超出预算，表现就是「相机动画一顿一顿」。
   * 补间期间只有 x / y 在变（`centerOnNode` 不动 scale），所以把新位置直接写进 `<g>` 的
   * `transform` 就够了：画面照常逐帧移动，React 一次都不重渲染；状态只在补间结束或取消时各提交一次。
   *
   * 属性写法与原来 JSX 里的那串**逐字一致**（`translate(x y) scale(s)`）：
   * `tests/browser.mjs` 用正则读这个属性来核对相机。
   */
  const cameraGroupRef = useRef<SVGGElement | null>(null);
  const paintCamera = useCallback((camera: Camera) => {
    const group = cameraGroupRef.current;
    if (group) group.setAttribute('transform', `translate(${camera.x} ${camera.y}) scale(${camera.scale})`);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.dataset.cameraX = camera.x.toFixed(2);
      canvas.dataset.cameraY = camera.y.toFixed(2);
      canvas.dataset.zoom = camera.scale.toFixed(4);
    }
  }, []);

  /**
   * 每次渲染之后都把相机重新画一遍，取值一律来自 `viewportRef`（「最新一刻」的那个值）。
   *
   * 补间期间 DOM 上的相机比 `viewport` 状态更新（状态只在结束时提交），
   * 这时任何一次无关的重渲染都可能把画面弹回旧位置——这条 effect 就是那道保险。
   * 用 `useLayoutEffect`：它在浏览器绘制之前跑，不会闪。
   */
  useLayoutEffect(() => { paintCamera(viewportRef.current); });

  const cameraAnimationRef = useRef<{ frame: number; cancelled: boolean } | null>(null);
  const cameraAnimationCountRef = useRef(0);
  const cancelCameraAnimation = useCallback((reason: string) => {
    const current = cameraAnimationRef.current;
    if (!current) return;
    current.cancelled = true;
    window.cancelAnimationFrame(current.frame);
    cameraAnimationRef.current = null;
    /*
     * 补间期间相机是直接画在 DOM 上的：取消时要把这笔账落回状态，
     * 否则紧接着的一次渲染会把画面弹回补间开始前的位置——用户看到的就是「一拖，视角跳回去」。
     * 传的是同一个对象时 React 会跳过更新，因此这里不会给「本来就没在补间」的情况添一次渲染。
     */
    const painted = viewportRef.current;
    setViewport((view) => (view === painted ? view : painted));
    recordCamera({ cancelled: reason, animations: cameraAnimationCountRef.current });
  }, [recordCamera]);

  const animateCamera = useCallback((target: Camera, durationMs = CAMERA_TWEEN_MS) => {
    if (reduceMotion || durationMs <= 0) { setViewport(clampCamera(target)); return; }
    cancelCameraAnimation('replaced');
    const start = viewportRef.current;
    const startedAt = performance.now();
    const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
    const record = { frame: 0, cancelled: false };
    cameraAnimationRef.current = record;
    cameraAnimationCountRef.current += 1;
    recordCamera({ animations: cameraAnimationCountRef.current, finished: false, cancelled: false });
    const tick = () => {
      if (record.cancelled) return;
      const t = Math.min(1, (performance.now() - startedAt) / durationMs);
      const k = easeOutCubic(t);
      const next = clampCamera({
        scale: start.scale + (target.scale - start.scale) * k,
        x: start.x + (target.x - start.x) * k,
        y: start.y + (target.y - start.y) * k,
      });
      /*
       * 逐帧**只画 DOM，不 setViewport**（2026-10-05，安卓流畅度）：
       * 补间期间只有 x / y 在变，所以直接写 `<g>` 的 transform 就够，React 一次都不重渲染。
       * `viewportRef` 同步跟上，取消时才能把当前这一刻落回状态（见 cancelCameraAnimation）。
       */
      viewportRef.current = next;
      paintCamera(next);
      if (t < 1) record.frame = window.requestAnimationFrame(tick);
      else {
        cameraAnimationRef.current = null;
        // 收尾提交一次状态：与 DOM 上已经画好的那一帧是同一个值，所以看不到跳变。
        setViewport(next);
        recordCamera({ finished: true, animations: cameraAnimationCountRef.current });
      }
    };
    record.frame = window.requestAnimationFrame(tick);
  }, [cancelCameraAnimation, clampCamera, paintCamera, recordCamera, reduceMotion]);

  /**
   * 把某个节点挪到「可用区」的中心（保持当前缩放）。
   *
   * 可用区与 `fitView` 用同一套算法：顶栏之下、回放控制台之上，左右让开悬浮框，
   * 因此「居中」和「适配」不会在同一个页面上给出两个不一致的中心。
   */
  const centerOnNode = useCallback((nodeId: string, { animate = true }: { animate?: boolean } = {}) => {
    const current = viewRef.current;
    const node = current?.layout.placed.find((item) => item.id === nodeId);
    const rect = viewportRect();
    if (!rect || !current || !node) return false;
    // 窄屏的 HUD 与面板都在画布**下面**排着，不压在画布上，因此不留顶部空间。
    const hudSpace = narrowPanelMode ? 0 : CAMERA_HUD_SPACE;
    const replaySpace = replayPlan ? replayHeight : 0;
    const left = panels.list.position || panels.detail.position ? 0 : 0;
    const right = panels.recommend.position || panels.families.position ? 0 : 0;
    const centerX = left + (rect.width - left - right) / 2;
    const centerY = hudSpace + (rect.height - hudSpace - replaySpace) / 2;
    // 相机在 viewportRef 里：`view` 只有图结构与布局，不含相机。
    const scale = viewportRef.current.scale;
    const target = {
      scale,
      x: centerX - (node.x + NODE_W / 2) * scale,
      y: centerY - (node.y + NODE_H / 2) * scale,
    };
    animateCamera(target, animate ? CAMERA_TWEEN_MS : 0);
    return true;
  }, [animateCamera, narrowPanelMode, replayHeight, replayPlan, viewportRect]);

  /**
   * 把鼠标事件的屏幕坐标换成 SVG 自己的用户坐标。
   *
   * 不自己算 `clientX - rect.left`：那个减法的隐含前提是「SVG 用户单位 == CSS 像素、
   * 且 SVG 左上角就是 rect 左上角」，而 viewBox / preserveAspectRatio / 边框 / 全屏
   * 任何一处不满足，锚点就会偏——偏移量还会随缩放放大（实测每格漂 ~20px）。
   * `getScreenCTM().inverse()` 是浏览器给出的权威变换，一次乘完，不留假设。
   *
   * 滚轮缩放、按钮缩放与**双指缩放**都从这里取锚点——三条路的相机数学因此只有一套。
   */
  const pointerInSvg = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = canvasRef.current?.querySelector('svg');
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const point = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: point.x, y: point.y };
  }, []);

  /** 平移：在画布空白处按下并拖动。用 pointer 事件，触摸与触控笔同样可用。 */
  const onCanvasPointerDown = useCallback((event: React.PointerEvent) => {
    const target = event.target as Element;
    // 点在节点、按钮、链接上不触发平移。
    if (target.closest('.network-node, button, a, input, select, textarea, label')) return;
    // 这个手势已经被第二根手指接管成双指缩放了（见 onCanvasPointerDownCapture）：不要再改成平移。
    if (pinchRef.current) return;
    // 用户一动手就停掉相机动画：相机自己在动、手却拖不动是最难受的手感。
    cancelCameraAnimation('user-pan');
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: viewport.x,
      originY: viewport.y,
    };
    setPanning(true);
    
    // 合成事件或指针已失效时 setPointerCapture 会抛错，不该让拖动静默失败。
    try { (event.currentTarget as Element).setPointerCapture?.(event.pointerId); } catch { /* 指针已失效：忽略，拖动仍按坐标走 */ }
  }, [cancelCameraAnimation, viewport.x, viewport.y]);

  const onCanvasPointerMove = useCallback((event: React.PointerEvent) => {
    const tracked = canvasPointersRef.current;
    if (tracked.has(event.pointerId)) tracked.set(event.pointerId, { x: event.clientX, y: event.clientY });

    /*
     * 双指：缩放与平移**同一个式子**。
     *
     * 令手势开始时两指中点为 m₀、它下面的世界点为 w（anchorWorld），当前中点为 m，
     * 缩放比为 k：只要保证 w 一直待在 m 下，就有 offset = m − w·scale。
     * 于是「两指张开」改变 scale、「两指整体移动」改变 m —— 不需要分成两条路径，
     * 也不会出现「缩放和平移互相打架、画面跟着手指漂」的经典毛病。
     */
    const pinch = pinchRef.current;
    if (pinch) {
      const first = tracked.get(pinch.ids[0]);
      const second = tracked.get(pinch.ids[1]);
      if (!first || !second) return;
      const a = pointerInSvg(first.x, first.y);
      const b = pointerInSvg(second.x, second.y);
      if (!a || !b) return;
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      // 两指几乎重合时比值会爆掉（分母趋零）：这一档不缩放，只按平移走。
      const factor = pinch.startDistance >= PINCH_MIN_SPAN ? distance / pinch.startDistance : 1;
      const scale = Math.min(Math.max(pinch.startViewport.scale * factor, ZOOM_MIN), ZOOM_MAX);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      setViewport(clampCamera({
        scale,
        x: mid.x - pinch.anchorWorld.x * scale,
        y: mid.y - pinch.anchorWorld.y * scale,
      }));
      return;
    }

    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    setViewport((current) => clampCamera({
      scale: current.scale,
      // 屏幕位移直接加到 offset 上：offset 就是屏幕像素，不需要再按 scale 折算。
      x: pan.originX + (event.clientX - pan.startX),
      y: pan.originY + (event.clientY - pan.startY),
    }));
  }, [clampCamera, pointerInSvg]);

  const endPan = useCallback((event: React.PointerEvent) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    panRef.current = null;
    setPanning(false);
    try { (event.currentTarget as Element).releasePointerCapture?.(event.pointerId); } catch { /* 指针已失效 */ }
  }, []);

  /**
   * 拖动单个节点（Obsidian 式）。
   *
   * 两个细节必须处理对，否则手感会很差：
   *
   * 1. **区分点击与拖动**。松手时若位移小于阈值就当成点击（打开详情），
   *    否则每次想点开节点都会因为它没动而失效。因此这里不用 onClick，
   *    而是在 pointerup 里按位移决定——并把这次点击「吞掉」，
   *    否则紧跟着的 click 事件会重复触发一次。
   * 2. **位移要除以缩放**。指针位移是屏幕像素，节点坐标是世界单位；
   *    不折算的话放大后拖一点点节点就飞出去。
   */
  /** 以屏幕上某点（SVG 用户坐标）为不动点缩放。 */
  const zoomAt = useCallback((factor: number, anchorX: number, anchorY: number) => {
    cancelCameraAnimation('user-zoom');
    setViewport((current) => {
      const nextScale = Math.min(Math.max(current.scale * factor, ZOOM_MIN), ZOOM_MAX);
      if (nextScale === current.scale) return current;
      const ratio = nextScale / current.scale;
      return clampCamera({
        scale: nextScale,
        // 不动点条件：world = (anchor - offset) / scale 保持不变。
        x: anchorX - (anchorX - current.x) * ratio,
        y: anchorY - (anchorY - current.y) * ratio,
      });
    });
  }, [cancelCameraAnimation, clampCamera]);

  /**
   * 滚轮缩放的监听器挂在 canvas 元素上，用 callback ref 而不是 useEffect。
   *
   * 为什么不能用 useEffect：页面在 `/ontology/graph` 返回前会提前 return「加载本体…」，
   * 那时 canvasRef.current 还是 null，`useEffect(..., [])` 只跑一次就会直接 return，
   * 等真正的画布渲染出来时监听器已经没机会挂上了——滚轮完全失效。
   * callback ref 在元素真正挂载/卸载时各触发一次，与渲染次数无关。
   *
   * 用原生监听器而不是 onWheel：React 把 wheel 挂成 passive，在 passive 监听器里
   * `preventDefault()` 会失效并在控制台报错，同时页面还会跟着滚。这里显式 `{ passive: false }`。
   *
   * 灵敏度按 deltaY 归一化，而不是「一次事件固定乘 1.12」：
   * 鼠标滚轮一格常报 100–120，触控板一次滑动会连发几十个 event，
   * 固定倍率会让缩放瞬间冲到上下限，实际不可用。
   */
  const wheelHandlerRef = useRef<((event: WheelEvent) => void) | null>(null);
  const zoomAtRef = useRef(zoomAt);
  useEffect(() => { zoomAtRef.current = zoomAt; }, [zoomAt]);
  const pointerInSvgRef = useRef(pointerInSvg);
  useEffect(() => { pointerInSvgRef.current = pointerInSvg; }, [pointerInSvg]);
  const [picker, setPicker] = useState<{
    sourceId: string;
    sourceTitle: string;
    candidates: Array<RelatedCandidate & { x: number; y: number }>;
    hovered: string | null;
  } | null>(null);
  const pickerRef = useRef<typeof picker>(null);
  pickerRef.current = picker;
  const rightPressRef = useRef<{ nodeId: string } | null>(null);
  /** 左键按下：长按选择器的计时器（位移超过阈值就取消，见 onNodePointerMove）。 */
  const leftPressRef = useRef<{ nodeId: string; timer: number | null; opened: boolean } | null>(null);

  const closePicker = useCallback(() => {
    setPicker(null);
  }, []);

  /** 在世界坐标里摊开候选卡片：围着源节点一圈，从正上方开始等分。 */
  const ringSlots = useCallback((node: PlacedNode, count: number) => (
    Array.from({ length: count }, (_unused, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / Math.max(count, 1);
      return {
        x: node.x + NODE_W / 2 + Math.cos(angle) * PICK_RING_RADIUS - PICK_CARD_W / 2,
        y: node.y + NODE_H / 2 + Math.sin(angle) * PICK_RING_RADIUS - PICK_CARD_H / 2,
      };
    })
  ), []);

  const openPicker = useCallback((node: PlacedNode) => {
    const data = graph.data;
    if (!data) return;
    const candidates = relatedCandidates(data, node.id, { exclude: added, limit: PICK_MAX, locale });
    if (candidates.length === 0) {
      setNotice(fill(txt.noticeNoRelated, { title: node.title }));
      return;
    }
    const slots = ringSlots(node, candidates.length);
    setPicker({
      sourceId: node.id,
      sourceTitle: node.title,
      candidates: candidates.map((candidate, index) => ({ ...candidate, ...slots[index] })),
      hovered: null,
    });
  }, [graph.data, added, ringSlots, locale, txt]);

  /** 屏幕坐标 → 世界坐标（相机：screen = world × scale + offset）。 */
  const worldFromClient = useCallback((clientX: number, clientY: number) => {
    const point = pointerInSvg(clientX, clientY);
    if (!point) return null;
    const scale = viewport.scale || 1;
    return { x: (point.x - viewport.x) / scale, y: (point.y - viewport.y) / scale };
  }, [pointerInSvg, viewport.scale, viewport.x, viewport.y]);

  /** 鼠标停在哪个候选卡片上（世界坐标命中判定）。 */
  const candidateAt = useCallback((clientX: number, clientY: number): string | null => {
    const current = pickerRef.current;
    if (!current) return null;
    const point = worldFromClient(clientX, clientY);
    if (!point) return null;
    const hit = current.candidates.find((candidate) => (
      point.x >= candidate.x && point.x <= candidate.x + PICK_CARD_W
      && point.y >= candidate.y && point.y <= candidate.y + PICK_CARD_H
    ));
    return hit?.node ?? null;
  }, [worldFromClient]);

  const settlePicker = useCallback((clientX: number, clientY: number): boolean => {
    const current = pickerRef.current;
    if (!current) return false;
    const target = candidateAt(clientX, clientY);
    setPicker(null);
    if (!target) return true;
    const candidate = current.candidates.find((item) => item.node === target);
    const source = viewRef.current?.layout.placed.find((item) => item.id === current.sourceId);
    setAdded(new Set([...added, target]));
    // 落在它被摊开的那个位置：手势是「从源节点那里把它拖进来」，落点要跟手。
    if (candidate && source) {
      setOverrides((previous) => {
        const next = { ...previous, [target]: { x: candidate.x + PICK_CARD_W / 2 - NODE_W / 2, y: candidate.y + PICK_CARD_H / 2 - NODE_H / 2 } };
        persistOverrides(next);
        return next;
      });
    }
    setNotice(fill(txt.noticePicked, {
      title: candidate?.title ?? target,
      basis: candidate ? relatedBasisLabel(candidate.basis, locale) : txt.pickerBasisFallback,
      note: candidate?.note ?? '',
    }));
    return true;
  }, [added, candidateAt, persistOverrides, setAdded, locale, txt]);

  // 长按与抬手都挂在 window 上：手势一旦开始，鼠标移到画布外也要能结算。
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!pickerRef.current) return;
      const target = candidateAt(event.clientX, event.clientY);
      setPicker((current) => (current && current.hovered !== target ? { ...current, hovered: target } : current));
    };
    const onUp = (event: PointerEvent) => {
      // 左键：选择器结算（或普通点击，由节点自己的 onPointerUp 处理）。
      if (event.button === 0) {
        const press = leftPressRef.current;
        if (pickerRef.current) {
          leftPressRef.current = null;
          if (press?.timer) window.clearTimeout(press.timer);
          settlePicker(event.clientX, event.clientY);
          return;
        }
        if (press?.timer) { window.clearTimeout(press.timer); leftPressRef.current = null; }
        return;
      }
      // 右键：点一下把节点移出视图（旧行为）。
      if (event.button !== 2) return;
      const press = rightPressRef.current;
      rightPressRef.current = null;
      if (press) removeFromView(press.nodeId);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && pickerRef.current) { event.preventDefault(); closePicker(); }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [candidateAt, closePicker, removeFromView, settlePicker]);

  /**
   * 右键按下：记下来，抬手时把节点移出视图（点一下即可，不看按住时长）。
   *
   * 长按选择器 2026-10 改到**左键**之后，右键就只剩这一个含义，
   * 于是不再需要计时器与「长按还是轻点」的分支。
   */
  const onNodeRightPress = useCallback((node: PlacedNode) => {
    rightPressRef.current = { nodeId: node.id };
  }, []);
  const nodeDragRef = useRef<{ id: string; pointerId: number; pointerType: string; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const suppressClickRef = useRef(false);

  const onNodePointerDown = useCallback((event: React.PointerEvent, node: PlacedNode) => {
    // 只响应主键；右键走 <g> 上的 onPointerDown 分支（点一下 = 移出视图）。
    if (event.button !== 0) return;
    // 双指手势进行中：这一下属于缩放，不属于这个节点（见 onCanvasPointerDownCapture）。
    if (pinchRef.current) return;
    event.stopPropagation();
    nodeDragRef.current = {
      id: node.id,
      pointerId: event.pointerId,
      pointerType: event.pointerType || 'mouse',
      startX: event.clientX,
      startY: event.clientY,
      originX: node.x,
      originY: node.y,
      moved: false,
    };
    /*
     * 左键长按 = 强关联选择器（2026-10 从右键改到左键）。
     *
     * 左键本来就有两个含义（点一下开详情、拖动换位置），再加上长按就是三个，
     * 因此**用位移把三件事分开**，而不是只看时间：
     * - 按住不动 ≥ 阈值 → 打开选择器；
     * - 位移超过容差 → 取消长按计时，进入拖动（拖完不回弹，也不会弹出选择器）；
     * - 不到阈值就松手 → 点击，打开详情面板。
     *
     * 阈值与容差都**按指针类型分档**（鼠标 250ms / 4px，触摸 500ms / 12px）：
     * 手指没有「按住不动」这回事，用鼠标档会把长按全判成拖动、把轻点判成长按。
     *
     * 计时器一开就挂在 `leftPressRef` 上：位移取消与抬手结算都要能找到它。
     */
    const timer = window.setTimeout(() => {
      const press = leftPressRef.current;
      if (!press || press.nodeId !== node.id) return;
      // 已经在拖了（位移超过阈值）就不开选择器——拖动优先。
      if (nodeDragRef.current?.moved) return;
      press.opened = true;
      /*
       * 开选择器时**主动释放指针捕获**：捕获期间事件都送给源节点，
       * 「把鼠标移到候选卡上」这种跨元素的悬停会变得不可靠（触屏同理：手指滑动时
       * 事件必须能落到候选卡上，否则松手永远结算在同一张卡上）。
       */
      try { (event.currentTarget as Element).releasePointerCapture?.(event.pointerId); } catch { /* 指针已失效：忽略 */ }
      openPicker(node);
    }, holdThresholdFor(event.pointerType || 'mouse'));
    leftPressRef.current = { nodeId: node.id, timer, opened: false };

    // 合成事件或指针已失效时 setPointerCapture 会抛错，不该让拖动静默失败。
    try { (event.currentTarget as Element).setPointerCapture?.(event.pointerId); } catch { /* 指针已失效：忽略，拖动仍按坐标走 */ }
  }, [openPicker]);

  const onNodePointerMove = useCallback((event: React.PointerEvent) => {
    const drag = nodeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    /*
     * 选择器开着时**不拦截事件**：悬停判定挂在 window 上，
     * 这里一旦 stopPropagation，事件就到不了 window，候选高亮会失效
     * （手势从左键触发后才暴露的问题：左键按下有指针捕获，右键那版没有）。
     */
    if (pickerRef.current) return;
    event.stopPropagation();
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    // 容差按这次按下时的指针类型取：触摸给 12px，鼠标给 4px（见 moveToleranceFor）。
    if (!drag.moved && Math.hypot(dx, dy) < moveToleranceFor(drag.pointerType)) return;
    if (!drag.moved) {
      drag.moved = true;
      setDraggingNode(drag.id);
      // 一旦成了拖动，长按就作废（否则拖到一半会突然弹出选择器）。
      const press = leftPressRef.current;
      if (press?.timer) { window.clearTimeout(press.timer); leftPressRef.current = null; }
    }
    const scale = viewport.scale || 1;
    setOverrides((current) => {
      const next = { ...current, [drag.id]: { x: drag.originX + dx / scale, y: drag.originY + dy / scale } };
      return next;
    });
  }, [viewport.scale]);

  const onNodePointerUp = useCallback((event: React.PointerEvent, node: PlacedNode) => {
    const drag = nodeDragRef.current;
    const press = leftPressRef.current;
    // 选择器开着时，抬手由 window 上的监听器统一结算（它知道鼠标在哪张候选卡上）。
    if (pickerRef.current) {
      nodeDragRef.current = null;
      setDraggingNode(null);
      try { (event.currentTarget as Element).releasePointerCapture?.(event.pointerId); } catch { /* 指针已失效 */ }
      return;
    }
    if (press?.timer) { window.clearTimeout(press.timer); leftPressRef.current = null; }
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    nodeDragRef.current = null;
    setDraggingNode(null);
    try { (event.currentTarget as Element).releasePointerCapture?.(event.pointerId); } catch { /* 指针已失效 */ }
    if (drag.moved) {
      // 拖动结束：吞掉随之而来的 click，避免误开详情面板；
      // 把落点校正到不压住其他卡片，再落到 localStorage。
      suppressClickRef.current = true;
      setTimeout(() => { suppressClickRef.current = false; }, 0);
      const scale = viewport.scale || 1;
      const dropped = { x: drag.originX + (event.clientX - drag.startX) / scale, y: drag.originY + (event.clientY - drag.startY) / scale };
      const placedNodes = viewRef.current?.layout.placed ?? [];
      const withDrop = placedNodes.map((node) => (node.id === drag.id ? { ...node, ...dropped } : node));
      const settled = avoidOverlaps(withDrop, drag.id) ?? dropped;
      const dbg = (window as unknown as Record<string, unknown>).__mcsDrop as string[] | undefined;
      if (dbg) {
        dbg.push(`id=${drag.id} layout=(${placedNodes.find((n) => n.id === drag.id)?.x.toFixed(0)},${placedNodes.find((n) => n.id === drag.id)?.y.toFixed(0)}) start=(${drag.startX.toFixed(0)},${drag.startY.toFixed(0)}) end=(${event.clientX.toFixed(0)},${event.clientY.toFixed(0)}) scale=${scale.toFixed(3)} dropped=(${dropped.x.toFixed(0)},${dropped.y.toFixed(0)}) settled=(${settled.x.toFixed(0)},${settled.y.toFixed(0)}) others=${placedNodes.filter((n) => n.id !== drag.id).map((n) => n.id + '(' + n.x.toFixed(0) + ',' + n.y.toFixed(0) + ')').join(' ')}`);
      }
      setOverrides((current) => {
        const next = { ...current, [drag.id]: settled };
        persistOverrides(next);
        return next;
      });
      return;
    }
    setSelected(node.id);
    setOpen((current) => ({ ...current, detail: true }));
  }, [persistOverrides, viewport.scale]);

  /**
   * 双指手势的起点：**第二根手指落下**就把它接管过来（2026-10-05）。
   *
   * 为什么挂在**捕获阶段**：节点的 `onPointerDown` 会 `stopPropagation`，
   * 冒泡阶段看不到「第一根手指落在节点上」这件事。而手指落在哪儿都会捏，
   * 落在节点上就捏不动是最说不通的一种半成品。
   *
   * 接管时要做三件事，少一件都会出怪现象：
   * 1. **把两根指针都改挂到画布上**（`setPointerCapture`）。第一根可能已被节点捕获，
   *    不改挂的话它的 `pointermove` 一直送去节点，两指运动的另一半永远读不到；
   * 2. **作废节点拖动与长按计时**：这一下是缩放手势，不是拖节点，也不该在捏的过程中
   *    弹出强关联选择器；
   * 3. **停掉相机动画**：与平移同一个理由——相机自己在动、手却拖不动最难受。
   *
   * 选择器已经打开时不接管：那是一个有自己结算规则的状态（抬手结算在 window 上），
   * 中途换手势语义只会让它结算到一半。
   */
  const onCanvasPointerDownCapture = useCallback((event: React.PointerEvent) => {
    canvasPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (canvasPointersRef.current.size !== 2 || pinchRef.current || pickerRef.current) return;
    const [first, second] = [...canvasPointersRef.current.entries()];
    const a = pointerInSvg(first[1].x, first[1].y);
    const b = pointerInSvg(second[1].x, second[1].y);
    if (!a || !b) return;

    cancelCameraAnimation('user-pinch');
    const press = leftPressRef.current;
    if (press?.timer) { window.clearTimeout(press.timer); leftPressRef.current = null; }
    nodeDragRef.current = null;
    setDraggingNode(null);
    panRef.current = null;
    setPanning(false);

    const current = viewportRef.current;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    pinchRef.current = {
      ids: [first[0], second[0]],
      startDistance: Math.hypot(b.x - a.x, b.y - a.y),
      anchorWorld: { x: (mid.x - current.x) / current.scale, y: (mid.y - current.y) / current.scale },
      startViewport: current,
    };
    // 两根都改挂到画布：见上面第 1 条。
    const canvas = event.currentTarget as Element;
    canvasPointersRef.current.forEach((_point, id) => {
      try { canvas.setPointerCapture?.(id); } catch { /* 指针已失效：忽略 */ }
    });
  }, [cancelCameraAnimation, pointerInSvg]);

  /**
   * 双指抬手：在 window 上收尾，因为捕获可能已经转移到别处（或压根没设上）。
   *
   * 手势结束后**若还剩一根手指，就把它接着当平移用**：捏完想继续拖是自然动作，
   * 若要求「全部抬起再重新按」，手上的感觉是画面卡住了。接手的起点按**当前**相机重设，
   * 所以交接那一瞬间不会跳。
   */
  useEffect(() => {
    const drop = (event: PointerEvent) => {
      if (!canvasPointersRef.current.delete(event.pointerId)) return;
      const pinch = pinchRef.current;
      if (!pinch || (pinch.ids[0] !== event.pointerId && pinch.ids[1] !== event.pointerId)) return;
      pinchRef.current = null;
      const rest = [...canvasPointersRef.current.entries()];
      if (rest.length !== 1) { setPanning(false); return; }
      const [id, point] = rest[0];
      panRef.current = {
        pointerId: id,
        startX: point.x,
        startY: point.y,
        originX: viewportRef.current.x,
        originY: viewportRef.current.y,
      };
      setPanning(true);
    };
    window.addEventListener('pointerup', drop);
    window.addEventListener('pointercancel', drop);
    return () => {
      window.removeEventListener('pointerup', drop);
      window.removeEventListener('pointercancel', drop);
    };
  }, []);

  /**
   * 左键按住节点 = 「强关联节点」选择器（2026-10 从右键改到左键）。
   *
   * 左键现在有三个含义，靠**位移**分开，而不是只看时间：
   * - **按住不动 ≥ PICK_HOLD_MS**：进入选择器——强调这个节点、虚化其它节点与所有边，
   *   在它周围一圈临时摊开与它强关联、且**还没进视图**的节点（依据来自 `relatedCandidates`）；
   *   保持按住、把鼠标移到某一个上面，松手就把它加入视图并落在那个位置；
   * - **位移超过 4px**：进入拖动（长按计时立刻作废，不会拖到一半突然弹出选择器）；
   * - **不到阈值就松手**：点击，打开详情面板（旧行为）。
   *
   * 三个必须处理对的细节：
   * 1. 计时器在 `pointerdown` 起，位移在 `pointermove` 里判定、抬手在 `pointerup` 结算；
   * 2. 长按期间**不做指针捕获**：捕获后所有事件都送到源节点，就收不到「鼠标移到候选节点上」了；
   * 3. 命中判定用世界坐标自己算，不靠 DOM 事件：候选卡片就画在相机变换里，
   *    给它们挂 pointerenter 会因为指针捕获与层级而漏事件。
   *
   * 右键只剩「点一下把节点移出视图」一个含义（旧行为保留）。
   */

  /** 把节点放回算法算出的位置（撤销手动摆放）。 */
  const releaseNode = useCallback((id: string) => {
    setOverrides((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      persistOverrides(next);
      return next;
    });
  }, [persistOverrides, viewport.scale]);

  if (!wheelHandlerRef.current) {
    wheelHandlerRef.current = (event: WheelEvent) => {
      event.preventDefault();
      // deltaMode: 0=像素, 1=行, 2=页；统一折算成像素量级。
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
      const delta = event.deltaY * unit;
      const factor = Math.min(Math.max(Math.exp(-delta * 0.0015), 0.87), 1.15);
      const anchor = pointerInSvgRef.current(event.clientX, event.clientY);
      if (!anchor) return;
      zoomAtRef.current(factor, anchor.x, anchor.y);
    };
  }
  const attachCanvas = useCallback((element: HTMLDivElement | null) => {
    const handler = wheelHandlerRef.current;
    if (canvasRef.current && handler) canvasRef.current.removeEventListener('wheel', handler);
    canvasRef.current = element;
    if (element && handler) element.addEventListener('wheel', handler, { passive: false });
  }, []);

  /** 按钮缩放：以画布可用区中心为锚点，符合「按 + 就是放大中间」的预期。 */
  const zoomBy = useCallback((factor: number) => {
    const svg = canvasRef.current?.querySelector('svg');
    const rect = svg?.getBoundingClientRect();
    if (!rect) return;
    const anchor = pointerInSvg(rect.left + rect.width / 2, rect.top + rect.height / 2);
    if (!anchor) return;
    zoomAt(factor, anchor.x, anchor.y);
  }, [pointerInSvg, zoomAt]);

  /** 让整张网络落在「未被悬浮框占用」的区域里，并居中。 */
  const fitView = useCallback(() => {
    const current = viewRef.current;
    const rect = viewportRect();
    if (!rect || !current) return;
    // 窄屏的 HUD 与面板都在画布下面排着，不压在画布上，因此不留顶部空间。
    const hudSpace = narrowPanelMode ? 0 : CAMERA_HUD_SPACE;
    /*
     * 回放控制台也压在画布上，占的高度要一并让出来。
     *
     * 不让的话内容会被底部控制台盖住——实测回放到最后一步时，「函数极限的 ε–δ 定义」
     * 整张卡片正好躲在控制台下面。这里用 ResizeObserver 量到的真实高度，
     * 不再估一个常数：控制台高度随文案换行变化，估错了就还是会被压住。
     */
    const replaySpace = replayPlan ? replayHeight + 16 + FIT_SLACK_REPLAY : 0;
    const padding = 20;
    // 悬浮框是浮在画布上的：不去管它们会把网络压到面板底下。
    const { left, right } = panelWidthRef.current;
    const availW = Math.max(rect.width - left - right - padding * 2, 160);
    const availH = Math.max(rect.height - hudSpace - replaySpace - padding * 2, 160);
    // 用**节点的真实包围盒**，而不是 layout.width/height（那是含外边距的盒子）。
    // 两者不相等：网格布局会在左右各留 (contentW - columns*NODE_W)/2 的空白，
    // 用盒子中心去对准可用区中心，内容就会整体偏（实测偏 47×104px）。
    const xs = current.layout.placed.map((node) => node.x);
    const ys = current.layout.placed.map((node) => node.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const contentW = Math.max(Math.max(...xs) + NODE_W - minX, 1);
    const contentH = Math.max(Math.max(...ys) + NODE_H - minY, 1);
    const centerOfContentX = minX + contentW / 2;
    const centerOfContentY = minY + contentH / 2;
    // 0.94 的留边系数：保证最外圈节点不被视口边缘切掉。
    const scale = Math.min(Math.max(Math.min(availW / contentW, availH / contentH) * 0.94, ZOOM_MIN), ZOOM_MAX);
    // 可用区的中心（屏幕坐标，以 SVG 左上角为原点）。
    const centerX = left + (rect.width - left - right) / 2;
    const centerY = hudSpace + (rect.height - hudSpace - replaySpace) / 2;
    setViewport(clampCamera({
      scale,
      // 让内容中心落在**顶栏之下的可用区**中心。
      // 早先这里用 centerY 与 scale 反推，等价于把内容对准整个 SVG 的中心，
      // 于是内容整体下移半个顶栏高度，最后一行被画布底边切掉（实测第 5 行超出底部）。
      x: centerX - centerOfContentX * scale,
      y: centerY - centerOfContentY * scale,
    }));
    const w = window as unknown as Record<string, unknown>;
    if (w.__mcsFitDebug) {
      (w.__mcsFitLog ??= [] as unknown[]);
      (w.__mcsFitLog as unknown[]).push({
        rectH: Math.round(rect.height), replayHeight: Math.round(replayHeight), replaySpace: Math.round(replaySpace),
        hudSpace, availH: Math.round(availH), contentH: Math.round(contentH), scale: Number(scale.toFixed(4)),
        centerY: Math.round(centerY), centerOfContentY: Math.round(centerOfContentY),
      });
    }
  }, [clampCamera, narrowPanelMode, replayHeight, replayPlan, viewportRect]);

  const resetViewport = useCallback(() => fitView(), [fitView]);

  /**
   * 「重新布局」（2026-10 加，TODO A2-12）：清掉**自动摆位缓存**并重算一遍，
   * **手动拖过的节点保持原位**（`overrides` 一个都不动）。
   *
   * 为什么需要：自动摆位一旦写入 `placements` 就固定下来（那是「加节点时不跳动」的代价），
   * 于是想重排只能清空画布或去删 localStorage。这两个都不该是使用者的活。
   *
   * 与「重置」的区别写在同一处：
   * - **重置**：只把相机重新适配进可见区，节点位置一个都不动；
   * - **重新布局**：重算自动摆位，手动位置保留。
   */
  const relayoutNetwork = useCallback(() => {
    const manualCount = Object.keys(overrides).length;
    setPlacements({});
    persistPlacements({});
    lastPlacementRef.current = null;
    setNotice(manualCount > 0
      ? fill(txt.relayoutDoneManual, { count: manualCount })
      : txt.relayoutDonePlain);
  }, [overrides, persistPlacements, txt]);

  /**
   * 已加入集合或面板占用变化时自动适配一次。
   *
   * 签名只取**结构量**：已加入的节点 id 集合 + 边数。**不能取节点坐标**——早先为了
   * 捕捉「gridLayout 只改坐标、不改尺寸」的情形，把前几个节点的坐标也塞进了签名，
   * 结果拖动节点时每移动一像素就重算一次适配：实测拖到一半，相机从
   * scale 1.949 跳到 3.0、offset 也整体平移，节点直接被甩到别处（松手后停在
   * (110,113) 而不是落点 (40,76)，并压住了另一个节点）。
   *
   * 拖动**只改变节点位置，不改变结构**，因此不该触发适配；布局尺寸变化由
   * `${width}x${height}` 与节点数覆盖，已经足够。
   */
  const lastFitSignature = useRef('');
  /** 相机 effect 自己的「上次见过的已加入集合」：用来判定这次新加了谁。 */
  const lastSeenIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!view || view.layout.placed.length === 0) {
      if (view && view.layout.placed.length === 0) lastFitSignature.current = '';
      return;
    }
    const ids = [...added].sort((a, b) => a.localeCompare(b, 'en')).join(',');
    /*
     * 回放态与控制台高度都算进签名。
     *
     * 踩过的坑：签名原先不含 `replayHeight`，而 ResizeObserver 的首次回调发生在这一轮
     * 之后——于是适配用的是控制台**还没测出来**的旧高度，内容底部停在 763，
     * 正好被顶边 756 的控制台压住（每一步都被压住，因为位置此后不再重算）。
     * 把高度纳入签名，测出来之后会再适配一次。
     */
    const signature = `${view.layout.placed.length}:${ids}:${view.edges.length}:${replayPlan ? `replay:${Math.round(replayHeight)}` : 'free'}`;
    if (signature === lastFitSignature.current) return;
    const previousCount = Number(lastFitSignature.current.split(':')[0] ?? 0);
    lastFitSignature.current = signature;
    /*
     * 加了新节点 → **把视角平滑地移到新节点**；其余结构变化（删节点、切边源、回放）→ 适配整张图。
     *
     * 用户的要求：「加入一个新的节点之后，视角要平滑地转移到以新增节点为中心的视图。」
     * 为什么不是所有变化都居中到一个节点：删节点时没有「新节点」可居中，回放时相机要负责
     * 让整条路线可见——那两种情况仍然是 fitView 的职责。
     */
    /*
     * 「谁是这次新加的」自己算，不用 `freshIds`。
     *
     * `freshIds` 来自另一个 effect 维护的 `justAdded`，两者的更新顺序不保证：
     * 实测第二次加节点时它还是上一次的 id，于是相机跑去居中**旧节点**。
     * 这里用本 effect 自己的「上次见过的集合」做差集，顺序上不可能错。
     */
    const seen = lastSeenIdsRef.current;
    const newIds = [...added].filter((id) => !seen.has(id));
    lastSeenIdsRef.current = new Set(added);
    const grown = view.layout.placed.length > previousCount && previousCount > 0;
    const newest = grown && newIds.length > 0
      ? [...newIds].sort((a, b) => a.localeCompare(b, 'en')).at(-1)!
      : null;
    if (newest && centerOnNode(newest, { animate: true })) {
      recordCamera({ centered: newest, animations: cameraAnimationCountRef.current });
      return;
    }
    fitView();
  }, [view, added, fitView, centerOnNode, recordCamera]);

  const listed = useMemo(() => nodes.filter((node: NodeSummary) =>
    (caseFilter === '全部' || node.case === caseFilter)
    && (constructFilter === '全部' || node.construct === constructFilter)
    && (query.trim() === '' || `${node.id} ${node.title} ${node.summary}`.toLowerCase().includes(query.trim().toLowerCase())))
    .sort((a: NodeSummary, b: NodeSummary) => a.id.localeCompare(b.id, 'en')), [nodes, caseFilter, constructFilter, query]);

  /**
   * 构造类型选项只列**本体里真有的**类别（带计数）。
   *
   * 原先这里直接用 `Object.keys(CONSTRUCT_LABELS)`：模板里 14 类全铺出来，
   * 而本体只登记了 11 类，于是「项 / 定义 / 表征」选中后永远是 0 个节点。
   * `absent` 不当作选项，只在面板里如实说明。
   */
  const constructFacet = useMemo(
    () => buildFacet(nodes, (node) => [node.construct], (value) => labels.constructLabel(value), Object.keys(CONSTRUCT_LABELS)),
    // `labels` 每次渲染都是新对象，但取值只取决于 `locale`；用 locale 当依赖，避免分面每帧重算。
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, locale],
  );

  /** 案例选项同样只列真有的（带计数）；`<option>` 不能排版，C^k 走 Unicode 上标。 */
  const caseFacet = useMemo(
    () => buildFacet(nodes, (node) => [node.case], (value) => plainMathText(labels.tables.cases[value] ?? value), Object.keys(CASE_LABELS)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, locale],
  );
  /** 「类比」这类词是关系种类：命中时说明它是关系，并给出本体里的条数与去处。 */
  const relationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const relation of graph.data?.relations ?? []) counts[relation.kind] = (counts[relation.kind] ?? 0) + 1;
    return counts;
  }, [graph.data]);
  /**
   * 硬前置的条数（条款面板要显示真实数字，不再写「0 条」）。
   * 2026-10 之前这里写死成 0——数据早就有 46 条了，界面还在说「当前是空的」：
   * 面板上的数字必须从本体现算，不许手抄。
   */
  const hardPrereqCount = relationCounts.hardPrereq ?? 0;
  /** 当前视图里有几条话题级条目（线索层图例用）。 */
  const placedThreadCount = useMemo(
    () => (view?.layout.placed ?? []).filter((node) => threadIds.has(node.id)).length,
    [view, threadIds],
  );
  const relationHint = useMemo(() => relationKindHint(query, relationCounts, locale), [query, relationCounts, locale]);
  /** 当前视图里每种契约 mode 的边数（条款面板用；不写死数字）。 */
  const contractModeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const edge of view?.edges ?? []) {
      if (edge.source !== 'contract') continue;
      counts.set(edge.mode, (counts.get(edge.mode) ?? 0) + 1);
    }
    return counts;
  }, [view]);

  /**
   * 边的视觉参数一律走 `edgeVisual`（关系可视化规范），不在这里临时调样式。
   * 规范保证「关系越硬、视觉越明显」：核心断言 4.6px 实线满不透明，登记关联 1.1px 细虚线。
   * 颜色分两路：关系按 kind（`RELATION_COLOR`），契约按 mode（`CONTRACT_MODE_COLOR`）。
   */
  /**
   * 画布上真正画出来的边：**同一对节点只画最强的一条**（2026-10 加，TODO A2-14）。
   *
   * 规则与理由见 `network.ts` 的 `mergeParallelEdges`。要点：
   * - 布局吸力、度数统计与推荐理由仍读**完整边集**（`view.edges`），合并只影响绘制，
   *   否则「合并显示」会悄悄改掉图的形状与推荐顺序；
   * - 被合并的边不丢：条数写在 HUD，内容写进边的标签与 `<title>`。
   */
  const drawnEdges = useMemo(() => mergeParallelEdges(view?.edges ?? []), [view]);
  const mergedAwayCount = useMemo(
    () => drawnEdges.reduce((sum, item) => sum + item.merged.length, 0),
    [drawnEdges],
  );

  /**
   * 弧线策略：**实在绕不开的边才弯**（穿卡、共线重叠），其余保持直线。
   *
   * 判定与几何在 `web/src/edge-routing.ts`（叶子模块，可单测）：这里只把结果喂给渲染。
   * 端点仍是 `edgeAnchor` 给的卡片边缘锚点，弯的是中间——这样卡片不会被曲线穿过。
   *
   * 2026-10 起这里只路由**合并后的边**：同对边先合并成一条，因此 `stats.parallel`
   * 在界面上恒为 0（"平行边弯开"那条分支只在直接调用路由器时才用得上，见 edge-routing.ts）。
   */
  const routes = useMemo(() => {
    const placed = view?.layout.placed ?? [];
    if (placed.length === 0) return { bows: new Map<string, number>(), controls: new Map<string, { cx: number; cy: number }>(), anchorShifts: new Map<string, { dx1: number; dy1: number; dx2: number; dy2: number }>(), stats: null };
    const byId = new Map(placed.map((node) => [node.id, node]));
    const routeEdgesInput = drawnEdges
      .map(({ edge }) => {
        const from = byId.get(edge.from); const to = byId.get(edge.to);
        if (!from || !to) return null;
        return { id: edge.id, from: edge.from, to: edge.to, ...edgeAnchor(from, to) };
      })
      .filter((item): item is { id: string; from: string; to: string; x1: number; y1: number; x2: number; y2: number } => item !== null);
    const result = routeEdges(placed.map((node) => ({ id: node.id, x: node.x, y: node.y })), routeEdgesInput);
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__mcsRoutes = { stats: result.stats, bows: [...result.bows] };
      (window as unknown as Record<string, unknown>).__mcsEdgeMerge = {
        drawn: drawnEdges.length,
        registered: (view?.edges ?? []).length,
        mergedAway: mergedAwayCount,
        mergedPairs: drawnEdges.filter((item) => item.merged.length > 0)
          .map((item) => ({ kept: item.edge.id, merged: item.merged.map((edge) => edge.id) })),
      };
    }
    return { bows: result.bows, controls: result.controls, anchorShifts: result.anchorShifts, stats: result.stats };
  }, [view, drawnEdges, mergedAwayCount]);

  const visualOf = useCallback((edge: NetworkEdge): EdgeVisual => {
    if (edge.source === 'relation') {
      return edgeVisual('relation', edge.kind, edge.witnessStatus ?? null, RELATION_COLOR[edge.kind] ?? THEME.neutral);
    }
    if (edge.source === 'contract') {
      return edgeVisual('contract', null, null, contractModeColor(edge.mode, THEME.contractEdge), edge.mode);
    }
    return edgeVisual(edge.source, null, null, THEME.line);
  }, []);

  /**
   * 一条边的**可读描述**：用在「同一对节点上还合并了哪些边」的提示里。
   * 被合并的边不能只报一个数字——读者要能看出被藏起来的是哪一种关系。
   */
  const describeEdge = useCallback((edge: NetworkEdge): string => {
    if (edge.source === 'relation') return fill(txt.describeRelation, { kind: labels.relationLabel(edge.kind), id: edge.id });
    if (edge.source === 'contract') {
      const label = edgeKindLabel('contract', null, edge.mode, locale) ?? edgeFamilyLabel('contract', locale);
      return fill(txt.describeContract, { label, title: edge.actionTitle, id: edge.id });
    }
    return fill(txt.describeFamily, { family: edgeFamilyLabel(edge.source, locale), id: edge.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, txt]);

  /**
   * 画序：**逻辑越强越后画**，于是硬关系压住软关系。
   *
   * 旧版算了一个三档的 `order` 变量，却只把它写进 `<desc>`，从未参与排序——
   * 「硬关系在上面」这句话在代码里是假的（用户看到的正是被一堆灰线盖住）。
   * 现在按视觉权重升序排（同权重按 id 稳定），并让**与选中节点相连的边**最后画。
   * 输入是**合并后的边**：同一对节点只会出现一次。
   */
  const paintedEdges = useMemo(() => {
    return [...drawnEdges].sort((left, right) => {
      const leftSelected = selected !== null && (left.edge.from === selected || left.edge.to === selected);
      const rightSelected = selected !== null && (right.edge.from === selected || right.edge.to === selected);
      if (leftSelected !== rightSelected) return leftSelected ? 1 : -1;
      return visualOf(left.edge).weight - visualOf(right.edge).weight || left.edge.id.localeCompare(right.edge.id, 'en');
    });
  }, [drawnEdges, selected, visualOf]);

  /**
   * 箭头 marker 按**实际用到的颜色 × 层级**生成，不预先铺满色板。
   *
   * 旧版是三个共享 marker，`<path>` 没写 `fill` → 继承默认填充 = 纯黑；
   * 且 `markerUnits` 默认按 `strokeWidth` 缩放 → 4.97px 的线配 9 单位箭头约 45px。
   * 这就是「全都是大黑箭头」的成因（见下面 `<defs>` 里的说明）。
   */
  const arrowMarkerKeys = useMemo(() => {
    const seen = new Map<string, { id: string; color: string; size: number }>();
    for (const edge of view?.edges ?? []) {
      if (edge.source === 'topic' || edge.source === 'sharedInput'
        || edge.source === 'evidence' || edge.source === 'support' || edge.source === 'pattern') continue;
      const visual = visualOf(edge);
      const id = arrowMarkerId(visual.color, visual.tier);
      if (!seen.has(id)) seen.set(id, { id, color: visual.color, size: TIER_ARROW_SIZE[visual.tier] });
    }
    return [...seen.values()].sort((left, right) => left.id.localeCompare(right.id, 'en'));
  }, [view, visualOf]);

  if (graph.loading) return <div className="page"><p>{txt.loading}</p></div>;
  if (graph.error) return <div className="page"><p className="error">{formatError(graph.error)}</p></div>;
  if (!graph.data || !view) return null;

  const positionById = new Map(view.layout.placed.map((node) => [node.id, node]));

  /*
   * 回放动画里「刚立住的节点 → 下一阶段的目标」的那支半透明箭头。
   *
   * 为什么需要它：回放的每一步只是让一张卡片淡入，帧与帧之间没有任何连线，
   * 看的人只能看到「又多了一个节点」，看不出这一步是**朝哪儿去**的。
   *
   * 三个刻意的选择（前两条是踩过坑之后改的）：
   *
   * 1. **不放在 useMemo 里**。它要读 `positionById`，而后者在提前返回之后才能算；
   *    把 hook 放在提前返回之后是违反 Hooks 规则的。这点算术很便宜，直接算。
   * 2. **两端都必须落在真实卡片上**。第一版把尾巴放在「当前可见节点的质心」上，
   *    光束确实更长更显眼，但尾巴悬在一堆卡片中间的空地上——看的人根本认不出箭头
   *    是从哪个节点出发的。现在源取「这一步刚立住的那张卡片」（第 0 帧取起点集合），
   *    尾巴放到那张卡片的**背面**，于是光束从卡片底下穿出来、在前面露头，
   *    两端分别贴在源卡片与目标卡片上。
   * 3. **终点在布局里查得到，但节点还没画出来**——回放只渲染已加入的节点。因此箭头
   *    指过去本来是一片空白，这里额外画一张可读的预告卡片当目的地，
   *    见下面的 `.network-stage-target`（它带「下一步」徽标与节点名，与真卡片同样清楚）。
   */
  const stageArrow = (() => {
    if (!replayPlan || !routeFrameView) return null;
    const step = routeFrameView.step;
    // steps 是 0 基数组，而 step 是「已完成的步数」：下标 step 正是下一步。
    const next = replayPlan.steps[step];
    if (!next) return null;
    const targetId = next.added[0] ?? next.focus;
    const targetNode = targetId ? positionById.get(targetId) : undefined;
    if (!targetNode) return null;
    /*
     * 源 = 上一步刚立住的那批节点；第 0 帧还没有「上一步」，退化成起点集合。
     * 回放的 URL 只记节点顺序，因此每一步恰好一个新节点；起点集合则可能有很多个。
     */
    const sourceIds = step === 0
      ? replayPlan.entry
      : (replayPlan.steps[step - 1]?.added ?? []);
    const from: Array<{ x: number; y: number }> = [];
    const sourceNodeIds: string[] = [];
    for (const id of sourceIds) {
      const node = positionById.get(id);
      if (!node) continue;
      from.push({ x: node.x + NODE_W / 2, y: node.y + NODE_H / 2 });
      sourceNodeIds.push(id);
    }
    const geometry = stageArrowGeometry({
      from,
      to: { x: targetNode.x + NODE_W / 2, y: targetNode.y + NODE_H / 2 },
      sourceW: NODE_W,
      sourceH: NODE_H,
      targetW: NODE_W,
      targetH: NODE_H,
      /*
       * 把画布上所有卡片的中心交给几何：丝带要绕开它们走空白处。
       * 两张相邻的卡片几乎贴在一起，直着连的丝带会被源卡片整个盖住
       * （实测第 5 步 182 长的丝带只有 44 露在外面），两侧的空白才是丝该走的地方。
       */
      avoid: view.layout.placed.map((node) => ({ x: node.x + NODE_W / 2, y: node.y + NODE_H / 2 })),
    });
    // geometry 为 null = 两站贴得太近，画出来只是一坨色块；这时不画是更好的选择。
    if (!geometry) return null;
    return {
      geometry,
      targetId,
      title: targetNode.title,
      step,
      // 光束实际从哪张卡片出发（多源时是前沿的那一张），用来给它加一圈高亮。
      sourceId: sourceNodeIds[geometry.sourceIndex] ?? null,
    };
  })();

  const selectedNode = selected ? nodes.find((node) => node.id === selected) ?? null : null;
  const selectedEdges = selected ? view.edges.filter((edge) => edge.from === selected || edge.to === selected) : [];
  const contentW = Math.max(view.layout.width, 600);
  const contentH = Math.max(view.layout.height, 400);
  const visibleW = contentW / viewport.scale;
  const visibleH = contentH / viewport.scale;
  const connectedCount = view.layout.placed.filter((node) => view.degree.has(node.id)).length;
  const isolatedCount = view.layout.placed.length - connectedCount;

  const styleOf = (id: PanelId) => {
    const panel = panels[id];
    return panel.position ? { left: `${panel.position.x * 100}%`, top: `${panel.position.y * 100}%` } : undefined;
  };

  const headOf = (id: PanelId, title: string) => (
    <header className="floating-panel-head" onPointerDown={panels[id].onPointerDown}>
      <h2>{title}</h2>
      <div className="floating-panel-tools">
        <button className="link-button" onClick={panels[id].reset} title={txt.panelRestore}>{txt.panelRestore}</button>
        <button className="link-button" onClick={() => setOpen((current) => ({ ...current, [id]: false }))} aria-label={fill(txt.panelClose, { title })}>✕</button>
      </div>
    </header>
  );

  /** 话题底色：同话题同色；未归入任何话题的用中性色，不硬塞进某个话题。 */
  const topicFillOf = (nodeId: string) => {
    const index = topicColors?.index.get(nodeId);
    return index === undefined ? TOPIC_NONE_COLOR : TOPIC_PALETTE[index % TOPIC_PALETTE.length];
  };


  /** 只有「硬关系」在放大到一定程度后直接标注名字，避免密网里文字糊成一片。 */
  const showEdgeLabels = viewport.scale >= 0.85;
  /**
   * 箭头表示**方向性**，与视觉权重是两件事：
   * 契约（前提 → 产出）与语义关系都有方向，必须给箭头；
   * 只有「登记关联」这一类是无向的同组关系（同话题、共用前提…），刻意不给箭头。
   *
   * 箭头**按边的颜色生成**（见下面的 `arrowMarkerId` 与 `<defs>`）：
   * 旧版是三个共享 marker，里面的 `<path>` 没写 `fill`，于是继承默认填充 = **纯黑**，
   * 而且 `markerUnits` 默认按 `strokeWidth` 缩放——4.97px 的定义性前置配 9 单位箭头
   * 就是约 45px 的黑三角。用户看到的就是「全都是大黑箭头」。现在：颜色跟着线走、
   * 尺寸用 `userSpaceOnUse` 固定像素。
   */
  const arrowFor = (edge: NetworkEdge, visual: EdgeVisual) => {
    if (edge.source === 'topic' || edge.source === 'sharedInput'
      || edge.source === 'evidence' || edge.source === 'support' || edge.source === 'pattern') return undefined;
    return `url(#${arrowMarkerId(visual.color, visual.tier)})`;
  };

  return (
    <div ref={stageRef} className={`network-stage${isFullscreen ? ' is-fullscreen' : ''}${panning ? ' panning' : ''}${picker ? ' is-picking' : ''}`}>
      <div
        ref={attachCanvas}
        className="network-canvas-full"
        /*
         * 相机摊在 `data-*` 上，给验收当读数口（与 `.home-story` 的 `data-active-act`
         * 同一套做法）：双指缩放要守的是「中点下的那个世界点没动」，
         * 那需要拿到 x / y / scale 三个真实值，而不是从百分比反推。
         */
        data-zoom={viewport.scale.toFixed(4)}
        data-camera-x={viewport.x.toFixed(2)}
        data-camera-y={viewport.y.toFixed(2)}
        onPointerDownCapture={onCanvasPointerDownCapture}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <svg
          // viewBox 恒等于 stage 的像素尺寸：1 用户单位 = 1 CSS 像素，
          // 于是相机变换就是纯粹的屏幕像素变换，滚轮锚点、按钮缩放、平移三者共用同一套数学。
          // 不再用 preserveAspectRatio 做二次缩放（那正是「放大往左上角飞」的根因）。
          viewBox={`0 0 ${Math.max(stageSize.w, 1)} ${Math.max(stageSize.h, 1)}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMinYMin meet"
          role="img"
          aria-label={fill(txt.canvasAria, { nodes: view.layout.placed.length, edges: view.edges.length })}
        >
          <defs>
            {/*
              箭头：**一种颜色一个 marker**，`fill` 跟着线走。

              两个必须写对的地方（旧版都错了，于是满屏大黑箭头）：
              1. `fill` 必须显式给出。共享 marker 里的 `<path>` 不写 fill 会继承默认填充 = 黑，
                 线的颜色再漂亮，箭头仍是黑的；
              2. `markerUnits="userSpaceOnUse"` + 绝对尺寸。默认按 `strokeWidth` 缩放，
                 4.97px 的粗线会得到约 45px 的大三角；固定像素才能让箭头与线宽解耦。

              尺寸仍按层级分三档（核心/强 13、结构性关系 10.5、骨架 8.5），
              细线配小箭头，粗线配大箭头，但不随线宽线性放大。
            */}
            {arrowMarkerKeys.map(({ id, color, size }) => (
              <marker
                key={id}
                id={id}
                viewBox="0 0 10 10"
                refX="8.6"
                refY="5"
                markerWidth={size}
                markerHeight={size}
                markerUnits="userSpaceOnUse"
                orient="auto-start-reverse"
              >
                {/* 略瘦的三角：同宽下比原来的 0–10 等腰三角更轻，不至于压住线本身。 */}
                <path d="M 0.6 1.1 L 9.4 5 L 0.6 8.9 z" fill={color} />
              </marker>
            ))}
            {/*
              丝的光泽来自「沿程浓淡」而不是纯色填充：根部透明、中段最浓、临近箭镞再淡下去，
              五股丝带交叠时浓淡错开，才有丝绸那种一段亮一段暗的层次。
              坐标用 userSpaceOnUse 并且跟着当前这一帧的根部与尖端走，
              于是光泽永远顺着箭头的方向铺开。
            */}
            {stageArrow && (
              <linearGradient
                id="stage-silk-sheen"
                gradientUnits="userSpaceOnUse"
                x1={stageArrow.geometry.origin.x} y1={stageArrow.geometry.origin.y}
                x2={stageArrow.geometry.tip.x} y2={stageArrow.geometry.tip.y}
              >
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.05" />
                <stop offset="42%" stopColor="var(--accent)" stopOpacity="0.95" />
                <stop offset="78%" stopColor="var(--accent)" stopOpacity="0.7" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.25" />
              </linearGradient>
            )}
          </defs>

          <g
            ref={cameraGroupRef}
            /*
             * JSX 里这一份是「已提交状态」的相机，保证首帧与无 JS 场景下也正确；
             * 补间期间 DOM 上的真实位置由 `paintCamera` 逐帧改写（见那里的说明）。
             */
            transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}
          >
            {view.layout.placed.length === 0 && (
              <text className="network-stage-hint" x={Math.max(stageSize.w, 1) / 2} y={Math.max(stageSize.h, 1) * 0.46} textAnchor="middle">
                {txt.emptyHint}
              </text>
            )}

            {paintedEdges.map(({ edge, merged }) => {
              const from = positionById.get(edge.from);
              const to = positionById.get(edge.to);
              if (!from || !to) return null;
              /*
               * 回放模式：两端都可见才画这条边。只可见一端时边会指向一片空白，
               * 读起来像是「连到了一个不存在的东西」。
               */
              if (replayVisible && !(replayVisible.has(edge.from) && replayVisible.has(edge.to))) return null;
              const anchor = edgeAnchor(from, to);
              /*
               * 平行边沿卡片边缘散开锚点：同组几条弧线若都从卡片中点进出，
               * 会在边缘挤成一个点、箭头叠在一起（实测就是这么难看的）。
               */
              const shift = routes.anchorShifts.get(edge.id);
              if (shift) {
                anchor.x1 += shift.dx1; anchor.y1 += shift.dy1;
                anchor.x2 += shift.dx2; anchor.y2 += shift.dy2;
              }
              // 回放时「新」的含义与普通模式不同：本步两端里至少有一个是这一步刚出现的。
              const isNew = replayVisible
                ? (routeFrameView?.added ?? []).some((id) => id === edge.from || id === edge.to)
                : freshIds.has(edge.to) || freshIds.has(edge.from);
              const dim = selected !== null && edge.from !== selected && edge.to !== selected;
              const visual = visualOf(edge);
              /*
               * 长按拾取期间，与源节点直接相连的边**不跟着虚化**：候选正是从这些关系里挑出来的，
               * 把它们一起淡掉等于把选择的依据也擦掉（CSS 里 `.pick-incident` 负责这一条）。
               */
              const incident = picker !== null && (edge.from === picker.sourceId || edge.to === picker.sourceId);
              /*
               * 绕不开的边画成弧线：`bow` 是弓高（正负表示弯向哪一侧），`control` 是二次贝塞尔控制点。
               * 顶点（标签位置）在中点法线方向偏 `bow`，控制点则在两倍处——见 edge-routing.ts。
               */
              const bow = routes.bows.get(edge.id) ?? 0;
              const control = routes.controls.get(edge.id) ?? null;
              const curved = control !== null && Math.abs(bow) >= 0.5;
              const midX = curved ? (anchor.x1 + 2 * control.cx + anchor.x2) / 4 : (anchor.x1 + anchor.x2) / 2;
              const midY = curved ? (anchor.y1 + 2 * control.cy + anchor.y2) / 4 : (anchor.y1 + anchor.y2) / 2;
              // 动画期间用实线把线「画出来」：虚线与描边动画会互相打架。
              const growing = isNew;
              // 曲线比直线长：长度用弦长加弓高的二阶修正估算，够动画用。
              const length = curved
                ? Math.hypot(anchor.x2 - anchor.x1, anchor.y2 - anchor.y1) * (1 + (8 / 3) * (bow / Math.max(Math.hypot(anchor.x2 - anchor.x1, anchor.y2 - anchor.y1), 1)) ** 2)
                : Math.hypot(anchor.x2 - anchor.x1, anchor.y2 - anchor.y1);
              const pathData = curved
                ? `M ${anchor.x1} ${anchor.y1} Q ${control!.cx} ${control!.cy} ${anchor.x2} ${anchor.y2}`
                : `M ${anchor.x1} ${anchor.y1} L ${anchor.x2} ${anchor.y2}`;
              return (
                <g key={edge.id} className={`network-edge-group tier-${visual.tier}`} data-weight={visual.weight.toFixed(3)}>
                  <path
                    className={`network-edge ${edge.source}${growing ? ' growing' : ''}${curved ? ' curved' : ''}${incident ? ' pick-incident' : ''}`}
                    data-new={isNew ? 'true' : undefined}
                    data-tier={visual.tier}
                    data-weight={visual.weight.toFixed(3)}
                    /* 边源与语义种类也写进 DOM：验收要能精确分类边，而不是靠推测。 */
                    data-source={edge.source}
                    data-kind={edge.source === 'relation' ? edge.kind : undefined}
                    data-mode={edge.source === 'contract' ? edge.mode : undefined}
                    data-from={edge.from}
                    data-to={edge.to}
                    /* 被合并的同对边：条数与 id 都写进 DOM，验收据此核对合并规则。 */
                    data-merged={merged.length > 0 ? String(merged.length) : undefined}
                    data-merged-ids={merged.length > 0 ? merged.map((item) => item.id).join(',') : undefined}
                    /* 弓高写进 DOM：验收据此核对「该弯的弯了、不该弯的是直线」。 */
                    data-bow={bow.toFixed(1)}
                    data-x1={Math.round(anchor.x1)} data-y1={Math.round(anchor.y1)}
                    data-x2={Math.round(anchor.x2)} data-y2={Math.round(anchor.y2)}
                    d={pathData}
                    fill="none"
                    stroke={visual.color}
                    strokeWidth={visual.width}
                    // 生成动画：把路径长度喂给 CSS 变量，动画从「整段未画出」走到 0。
                    style={growing ? { ['--edge-len' as string]: `${length}` } : undefined}
                    strokeDasharray={growing ? undefined : visual.dash}
                    strokeLinecap="round"
                    markerEnd={arrowFor(edge, visual)}
                    opacity={dim ? 0.08 : visual.opacity}
                  />
                  {visual.label && showEdgeLabels && !dim && (
                    <text
                      className="network-edge-label"
                      x={midX}
                      y={midY - 6}
                      textAnchor="middle"
                      fill={visual.color}
                      fontSize={12}
                    >
                      {edge.source === 'relation'
                        ? labels.relationLabel(edge.kind)
                        : edge.source === 'contract' && edgeKindLabel('contract', null, edge.mode, locale)
                          ? fill(txt.edgeLabelContract, { label: edgeKindLabel('contract', null, edge.mode, locale) ?? '', title: edge.actionTitle })
                          : ''}
                      {/* 被合并的同对边：在标签后面如实标注条数，不悄悄吞掉。 */}
                      {merged.length > 0 && (
                        <tspan className="network-edge-merged-badge" dx="4">+{merged.length}</tspan>
                      )}
                    </text>
                  )}
                  {/* 供测试与可访问性核对：把「这条边多重、为什么」写进 DOM */}
                  <title>
                    {edge.source === 'relation'
                      ? fill(txt.edgeTitleRelation, {
                        kind: labels.relationLabel(edge.kind),
                        witness: edge.witnessStatus ?? '',
                        weight: visual.weight.toFixed(2),
                        tier: tierLabel(visual.tier, locale),
                      })
                      : fill(txt.edgeTitleFamily, {
                        family: edgeFamilyLabel(edge.source, locale),
                        weight: visual.weight.toFixed(2),
                        tier: tierLabel(visual.tier, locale),
                      })}
                    {merged.length > 0 && fill(txt.edgeTitleMerged, { count: merged.length })
                      + merged.map((item) => fill(txt.edgeTitleMergedItem, { desc: describeEdge(item), weight: visualOf(item).weight.toFixed(2) })).join('\n')}
                  </title>
                </g>
              );
            })}

            {/*
              丝质箭头：从「上一步刚立住的那张卡片」绵延到「下一步要立住的那个节点」，
              画在**节点之上**。
              
              为什么压在卡片上而不是藏在卡片下：卡片是 172×58 的大块，而相邻两步的中心距
              只有 97–190，实测「从源卡片连到目标卡片」的丝带有九成落在源卡片自己的轮廓里——
              藏在下层就等于没画。几何那边仍然会优先绕开卡片（`avoid` 与弧线搜索），
              绕不开时靠半透明叠在卡片上，卡片依旧读得清，丝也不会整束消失。
              目的地预告卡片更靠上：它是「下一步」的落点，必须始终是干净的一张卡。
              key 带上步号：换一步就重新挂载，入场动画才会重播，读起来是状态在推进。
            */}
            {/*
              下一步的目标节点：回放只渲染已加入的节点，所以箭头指过去本来是一片空白。
              这里按布局坐标补一张**能看清**的预告卡片：与真卡片同样的底色与字号，
              外加一枚「下一步」徽标——第一版做成淡虚线小卡，看的人根本读不出那是谁。
              它是预告而不是已加入的节点，因此用独立的 class，不计入 `.network-node`。
              它排在丝带之前，因此丝带压不到它：目的地必须始终是干净的一张卡。
            */}
            {stageArrow && (() => {
              const target = positionById.get(stageArrow.targetId);
              if (!target) return null;
              return (
                <g
                  className="network-stage-target"
                  key={`stage-target-${stageArrow.step}-${stageArrow.targetId}`}
                  transform={`translate(${target.x},${target.y})`}
                  aria-hidden="true"
                >
                  <rect width={NODE_W} height={NODE_H} rx="10" />
                  {/* 徽标放在卡片上沿之外：卡内空间只够放节点名，塞进去两行都读不清。 */}
                  <g className="network-stage-target-badge" transform="translate(0,-11)">
                    <rect width="64" height="20" rx="10" />
                    <text x="32" y="14" fontSize="11.5" textAnchor="middle">{txt.nextStepBadge}</text>
                  </g>
                  <text className="network-stage-target-title" x="10" y="38" fontSize="13">
                    {target.title.length > 14 ? `${target.title.slice(0, 14)}…` : target.title}
                  </text>
                </g>
              );
            })()}

            {view.layout.placed.filter((node) => !replayVisible || replayVisible.has(node.id)).map((node) => {
            const degree = view.degree.get(node.id) ?? 0;
            const isDragged = Boolean(overrides[node.id]);
            const nodeSummary = nodes.find((item) => item.id === node.id);
            const group = nodeSummary ? groupOfNode(nodeSummary) : 'other';
            // 丝带根部所在的那张卡片：加一圈高亮，让「箭头从哪儿来」一眼可见。
            const isSilkSource = stageArrow?.sourceId === node.id;
            return (
              <g
                key={node.id}
                className={`network-node${node.connected ? '' : ' isolated'}${selected === node.id ? ' focused' : ''}${isDragged ? ' placed' : ''}${draggingNode === node.id ? ' dragging-node' : ''}${isSilkSource ? ' silk-source' : ''}${picker?.sourceId === node.id ? ' pick-source' : ''}`}
                data-group={group}
                data-node={node.id}
                transform={`translate(${node.x},${node.y})`}
                onPointerDown={(event) => {
                  /*
                   * 右键两条路：按住 ≥ PICK_HOLD_MS 打开强关联选择器；在那之前松手就是轻点，
                   * 仍然按旧行为把节点移出视图（结算在 window 的 pointerup 上，见上面的 effect）。
                   */
                  if (event.button === 2) {
                    event.stopPropagation();
                    onNodeRightPress(node);
                    return;
                  }
                  onNodePointerDown(event, node);
                }}
                onPointerMove={onNodePointerMove}
                onPointerUp={(event) => onNodePointerUp(event, node)}
                onPointerCancel={(event) => onNodePointerUp(event, node)}
                onClick={(event) => {
                  // 拖动结束时吞掉这一下 click。
                  if (suppressClickRef.current) { event.stopPropagation(); return; }
                }}
                onDoubleClick={() => releaseNode(node.id)}
                onContextMenu={(event) => {
                  // 右键菜单一律不弹：轻点 = 移出视图，按住 = 打开强关联选择器（见 onNodeRightPress）。
                  event.preventDefault();
                  event.stopPropagation();
                }}
                tabIndex={0}
                role="button"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') { setSelected(node.id); setOpen((current) => ({ ...current, detail: true })); }
                  // Delete / Backspace 与右键同义，键盘用户也能移除。
                  if (event.key === 'Delete' || event.key === 'Backspace') {
                    event.preventDefault();
                    removeFromView(node.id);
                  }
                }}
              >
                {/* 内层承载入场缩放：CSS transform 会覆盖 SVG transform 属性，
                    两者必须分层，否则位移被 scale 覆盖、节点掉到画布原点。 */}
                <g className={
                  replayVisible
                    // 回放模式下由「这一步刚加入」决定动画，与 justAdded 无关：
                    // justAdded 是「加进视图」的瞬间，而回放里全部节点从第一帧起就在视图中，
                    // 只有可见性在变。用错判据会导致回放时完全没有入场动画。
                    ? ((routeFrameView?.added ?? []).includes(node.id) ? 'network-node-enter' : undefined)
                    : (justAdded[node.id] ? 'network-node-enter' : undefined)
                }>
                <rect
                  width={NODE_W} height={NODE_H} rx="10"
                  fill={topicFillOf(node.id)}
                  stroke={isDragged ? THEME.inkSoft : node.connected ? THEME.line : THEME.lineIsolated}
                  strokeDasharray={isDragged ? '4 3' : undefined}
                />
                <text className="network-node-label" x="10" y="24" fontSize="12.5">
                  {node.title.length > 15 ? `${node.title.slice(0, 15)}…` : node.title}
                </text>
                <text className="network-node-id" x="10" y="43" fontSize="10.5">{node.id}</text>
                {/* 连接数写在卡片右侧：让「这个点连了几条边」一眼可见。 */}
                <text className="network-node-degree" x={NODE_W - 10} y="24" fontSize="11" textAnchor="end">{degree}</text>
                {/* 方法类节点加一条左侧色带：一眼可分出「这是方法」而不是概念。 */}
                {(group === 'method-local' || group === 'method-global') && (
                  <rect
                    x="0" y="0" width="4" height={NODE_H} rx="2"
                    fill={group === 'method-local' ? THEME.methodLocal : THEME.methodGlobal}
                  />
                )}
                {/* 线索层徽标：话题级条目在卡片上直接标出来（不参与前置计算）。 */}
                {threadIds.has(node.id) && (
                  <>
                    <rect
                      className="network-node-thread"
                      x={NODE_W - 48} y={NODE_H - 17} width="38" height="13" rx="6.5"
                    />
                    <text className="network-node-thread-label" x={NODE_W - 29} y={NODE_H - 7} fontSize="9.5" textAnchor="middle">{txt.threadBadge}</text>
                  </>
                )}
                {/* 被自动加入的节点标一个小圆点，并在 title 里写明原因，便于核对规则。 */}
                {autoAddedIds.has(node.id) && (
                  <circle cx={NODE_W - 10} cy={NODE_H - 9} r="4" fill={THEME.autoAdded} />
                )}
                <title>
                  {fill(txt.nodeTitle, { title: node.title, id: node.id, degree, group: nodeGroupLabel(group, locale) })
                    + (threadIds.has(node.id) ? txt.nodeTitleThread : '')
                    + (isDragged ? txt.nodeTitleDragged : '')
                    + (autoAddedIds.has(node.id) ? txt.nodeTitleAuto : '')
                    + txt.nodeTitleHint}
                </title>
                </g>
              </g>
            );
          })}

            {/*
              丝带排在节点之后，因此压在卡片之上。
              卡片是 172×58 的大块，而相邻两步的中心距只有 97–190——藏在卡片下层，
              丝带有九成落在源卡片自己的轮廓里，等于没画。几何那边仍然优先绕开卡片，
              绕不开时靠半透明叠在卡片上：卡片依旧读得清，丝也不会整束消失。
            */}
            {stageArrow && (
              <g className="stage-silk" key={`stage-silk-${stageArrow.step}-${stageArrow.targetId}`} aria-hidden="true">
                {stageArrow.geometry.strands.map((strand, index) => (
                  <path
                    key={index}
                    className="stage-silk-strand"
                    d={strand.body}
                    // 外侧的丝带更淡：五股叠在一起才有丝的光泽，各股等浓就成一块色块了。
                    fillOpacity={0.3 - Math.abs(strand.offset) / Math.max(stageArrow.geometry.forkWidth / 2, 1) * 0.14}
                  />
                ))}
                <path className="stage-silk-flow" d={stageArrow.geometry.flow} />
                <path className="stage-silk-head" d={stageArrow.geometry.head} />
              </g>
            )}

            {/*
              强关联候选圈：右键按住某个节点时临时摊开的一圈卡片。
              画在相机变换里（跟着平移缩放走），命中判定用世界坐标自己算——见 candidateAt。
            */}
            {picker && (
              <g className="pick-ring" data-source={picker.sourceId} aria-label={fill(txt.pickerAria, { title: picker.sourceTitle })}>
                {picker.candidates.map((candidate) => {
                  const hovered = picker.hovered === candidate.node;
                  return (
                    <g
                      key={candidate.node}
                      className={`pick-candidate${hovered ? ' hovered' : ''}${candidate.thread ? ' thread' : ''}`}
                      data-node={candidate.node}
                      data-basis={candidate.basis}
                      data-thread={candidate.thread ? '1' : undefined}
                      data-strength={candidate.strength}
                      transform={`translate(${candidate.x},${candidate.y})`}
                    >
                      <rect width={PICK_CARD_W} height={PICK_CARD_H} rx="12" />
                      {/* 强度条：越硬越长的竖条，与画布上「越硬越重」同一套读法。 */}
                      <rect className="pick-strength" x="0" y="0" width="5" height={PICK_CARD_H} rx="2.5" />
                      <text className="pick-title" x="16" y="26" fontSize="13.5">{candidate.title}</text>
                      <text className="pick-basis" x="16" y="47" fontSize="11">
                        {relatedBasisLabel(candidate.basis, locale)} · {candidate.strength.toFixed(2)}
                      </text>
                      {hovered && <rect className="pick-hover-ring" width={PICK_CARD_W} height={PICK_CARD_H} rx="12" />}
                    </g>
                  );
                })}
              </g>
            )}
          </g>
        </svg>
      </div>

      {picker && (
        <p className="network-notice pick-hint" role="status">
          {txt.pickerHint}
          <span className="muted">{txt.pickerNote}</span>
        </p>
      )}

      {/*
        路线回放控制台：把动画当成一个**可调状态的动态系统**，而不是一段只能看完的视频。
        学习者可以用进度条任意跳步、单步前进后退、改倍速，随时停在某一步仔细看结构。
      */}
      {replayPlan && routeFrameView && (
        <section className="replay-panel" aria-label={txt.replayAria} ref={replayRef}>
          <div className="replay-head">
            <div>
              <p className="replay-eyebrow">{txt.replayEyebrow}{replayPlan.routeId ? ` · ${replayPlan.routeId}` : ''}</p>
              <p className="replay-step-title">
                {routeFrameView.current
                  ? <>{txt.replayStepLead}<strong>{routeFrameView.step}</strong>{fill(txt.replayStepTail, { total: routeFrameView.total, title: routeFrameView.current.actionTitle || routeFrameView.current.focus })}</>
                  : <>{txt.replayStartLead}<strong>{replayPlan.entry.length}</strong>{fill(txt.replayStartTail, { total: routeFrameView.total })}</>}
              </p>
            </div>
            {/* 回放不写 URL、不写档案：退出只是回到普通的自由浏览。 */}
            <button
              className="link-button"
              onClick={() => {
                const next = new URLSearchParams(params);
                for (const key of ['play', 'entry', 'path', 'goal', 'route']) next.delete(key);
                setParams(next, { replace: true });
                setReplayPlaying(false);
              }}
            >
              {txt.replayExit}
            </button>
          </div>

          <div className="replay-controls">
            <button className="button small" onClick={() => { setReplayPlaying(false); setReplayStep(0); }} aria-label={txt.replayToStart}>{txt.replayStartShort}</button>
            <button className="button small" onClick={() => { setReplayPlaying(false); setReplayStep((s) => Math.max(0, s - 1)); }} aria-label={txt.replayPrev}>{txt.replayPrevShort}</button>
            <button
              className="button small primary"
              onClick={() => {
                // 已经在末尾时按播放，从头再放一遍——否则按钮看起来没反应。
                if (replayStep >= replayPlan.steps.length) setReplayStep(0);
                setReplayPlaying((playing) => !playing);
              }}
              aria-label={replayPlaying ? txt.replayPause : txt.replayPlay}
            >
              {replayPlaying ? txt.replayPauseShort : txt.replayPlayShort}
            </button>
            <button className="button small" onClick={() => { setReplayPlaying(false); setReplayStep((s) => Math.min(replayPlan.steps.length, s + 1)); }} aria-label={txt.replayNext}>{txt.replayNextShort}</button>
            <button className="button small" onClick={() => { setReplayPlaying(false); setReplayStep(replayPlan.steps.length); }} aria-label={txt.replayToEnd}>{txt.replayEndShort}</button>
            <label className="replay-speed">
              {txt.replaySpeed}
              <select value={replaySpeed} onChange={(event) => setReplaySpeed(Number(event.target.value))} aria-label={txt.replaySpeedAria}>
                {[0.5, 1, 2, 4].map((value) => <option key={value} value={value}>{value}×</option>)}
              </select>
            </label>
          </div>

          {/* 进度条：这才是「可调状态」的主体，播放按钮只是它的自动推进器。 */}
          <input
            className="replay-slider"
            type="range"
            min={0}
            max={replayPlan.steps.length}
            value={replayStep}
            onChange={(event) => { setReplayPlaying(false); setReplayStep(Number(event.target.value)); }}
            aria-label={txt.replayProgressAria}
            aria-valuetext={fill(txt.replayProgressText, { step: replayStep, total: replayPlan.steps.length })}
          />

          <div className="replay-detail">
            {routeFrameView.current ? (
              <>
                <p className="replay-added">
                  {txt.replayAdded}
                  {routeFrameView.added.length === 0
                    ? <span className="muted">{txt.replayAddedNone}</span>
                    : routeFrameView.added.map((id) => (
                      <Link key={id} className="replay-chip" to={hrefFor(`/nodes/${encodeURIComponent(id)}`)}>{titleOf(id)}</Link>
                    ))}
                </p>
                {routeFrameView.current.uses.length > 0 && (
                  <p className="muted replay-uses">
                    {fill(txt.replayUses, {
                      list: routeFrameView.current.uses.slice(0, 8).map((id) => titleOf(id)).join(txt.joinSeparator),
                      more: routeFrameView.current.uses.length > 8 ? fill(txt.replayMore, { count: routeFrameView.current.uses.length }) : '',
                    })}
                  </p>
                )}
              </>
            ) : (
              <p className="muted replay-uses">
                {fill(txt.replayEntry, { list: replayPlan.entry.map((id) => titleOf(id)).join(txt.joinSeparator) || txt.replayEntryNone })}
              </p>
            )}
            {/* 动画只覆盖这条路线上的节点；其他节点是布局的一部分但不显示。 */}
            <p className="replay-note">
              {fill(txt.replayNote, { total: replayPlan.all.length })}
            </p>
          </div>
        </section>
      )}

      <div className="network-hud">
        <div className="network-hud-count">
          <strong>{view.layout.placed.length}</strong> {view.layout.placed.length === 1 ? txt.hudNodeOne : txt.hudNodes} · <strong>{drawnEdges.length}</strong> {drawnEdges.length === 1 ? txt.hudEdgeOne : txt.hudEdges}
          {/* 登记边数与被合并的条数如实写出来：画布上少画的线必须有交代（见 mergeParallelEdges）。 */}
          {mergedAwayCount > 0 && (
            <span className="network-hud-merged" title={txt.hudMergedTitle}>
              {fill(mergedAwayCount === 1 ? txt.hudMergedOne : txt.hudMerged, { count: mergedAwayCount })}
            </span>
          )}
          {view.layout.placed.length > 0 && (
            <span className="network-hud-sub">
              {fill(txt.hudAverage, { average: (view.edges.length * 2 / Math.max(view.layout.placed.length, 1)).toFixed(1) })}
              {isolatedCount > 0 ? fill(txt.hudIsolated, { count: isolatedCount }) : ''}
              {/* 绕不开的遮挡如实写出来：弧线是补救手段，密排时可能真的没有解（见 edge-routing.ts）。 */}
              {(routes.stats?.throughCardResidual ?? 0) > 0
                ? fill(txt.hudResidual, { count: routes.stats?.throughCardResidual ?? 0, max: ROUTE_DEFAULTS.maxBow })
                : ''}
            </span>
          )}
        </div>
        <div className="network-hud-actions">
          <div className="network-zoom">
            <button className="button small" onClick={() => zoomBy(1 / 1.25)} aria-label={txt.zoomOut}>−</button>
            <span className="network-zoom-value">{Math.round(viewport.scale * 100)}%</span>
            <button className="button small" onClick={() => zoomBy(1.25)} aria-label={txt.zoomIn}>＋</button>
            <button className="button small" onClick={resetViewport} title={txt.resetViewTitle}>{txt.resetView}</button>
            {/*
              「重新布局」与「重置」是两件事，因此并排放在一起、各自写明作用：
              前者重算自动摆位（手动拖着的位置保留），后者只动相机。
              同一句话也写在底部图例提示里（见 network-legend-bar）。
            */}
            <button
              className="button small"
              onClick={relayoutNetwork}
              disabled={added.size === 0}
              title={txt.relayoutTitle}
            >{txt.relayout}</button>
          </div>
          {/*
            「保存」放在最显眼的一排：用户要的是「下次可以直接用」，
            所以除按钮本身，也把入口写进 HUD 提示（见上面的 network-hud-sub）。
          */}
          <button className="button small" onClick={saveCurrentView} disabled={added.size === 0} title={txt.saveViewTitle}>{txt.saveView}</button>
          {/* 文案不能叫「视图」：它会和「保存视图」互相包含，人和测试都会点错（踩过）。 */}
          <button className="button small" onClick={() => setOpen((current) => ({ ...current, views: !current.views }))}>
            {open.views ? txt.viewsToggleOpen : (savedViews.length > 0 ? fill(txt.viewsToggleCount, { count: savedViews.length }) : txt.viewsToggleClosed)}
          </button>
          <button className="button small" onClick={toggleFullscreen}>{isFullscreen ? txt.fullscreenExit : txt.fullscreenEnter}</button>
          {PANEL_IDS.map((id) => (
            <label key={id} className="network-hud-toggle">
              <input
                type="checkbox"
                checked={open[id]}
                aria-label={fill(txt.panelToggle, { title: panelTitles[id] })}
                onChange={(event) => setOpen((current) => {
                  const next = { ...current, [id]: event.target.checked };
                  /*
                   * 同一侧一次只留一个面板：左右各开一个已经吃掉近一半画布。
                   * 窄屏下浮窗是纵向堆叠的普通卡片，所以把所有面板当成同一组——
                   * 手机上只保留一个，避免画布被一串面板推到看不见。
                   */
                  if (event.target.checked) {
                    for (const other of PANEL_IDS) {
                      if (other === id) continue;
                      if (narrowPanelMode || PANEL_SIDE[other] === PANEL_SIDE[id]) next[other] = false;
                    }
                  }
                  return next;
                })}
              />
              {panelTitles[id]}
            </label>
          ))}
          <button
            className="button small"
            disabled={added.size === 0}
            onClick={() => { setClearedNodes(new Set(added)); setAdded(new Set()); }}
          >{txt.clear}</button>
        </div>
      </div>

      {unresolved.length > 0 && (
        <div className="network-unresolved">
          {fill(txt.unresolved, { count: unresolved.length })}<code>{unresolved.join(txt.joinSeparator)}</code>
        </div>
      )}

      {/* 回放时不提供「补齐方法节点」：回放要按路线本身展开，不被额外节点打扰。 */}
      {(removedNotice || (autoCandidates.length > 0 && !autoDismissed && !replayPlan)) && (
        <div className="network-notice" role="status">
          {removedNotice
            ? <>{fill(txt.removedNotice, { title: titleOf(removedNotice) })}
                <button className="link-button" onClick={() => toggle(removedNotice)}>{txt.undo}</button>
              </>
            : (
              <>{fill(txt.autoAddNotice, { count: autoCandidates.length })}
                {autoCandidates.slice(0, 3).map((item) => fill(txt.autoAddItem, { title: item.title, inView: item.inView })).join(txt.joinSeparator)}{autoCandidates.length > 3 ? txt.autoAddMore : ''}。
                <button className="button small primary" onClick={applyAutoAdd}>{fill(txt.autoAddApply, { count: autoCandidates.length })}</button>
                <button className="link-button" onClick={() => setAutoDismissed(true)}>{txt.autoAddLater}</button>
              </>
            )}
        </div>
      )}

      {clearedNodes && clearedNodes.size > 0 && (
        <div className="network-notice" role="status">
          {fill(txt.clearedNotice, { count: clearedNodes.size })}
          <button className="link-button" onClick={() => { setAdded(clearedNodes); setClearedNodes(null); }}>{txt.clearedUndo}</button>
        </div>
      )}

      {notice && (
        <div className="network-notice" role="status">
          {notice}
          <button className="link-button" onClick={() => setNotice(null)}>{txt.gotIt}</button>
        </div>
      )}

      {open.list && (
        <section ref={panels.list.handleRef} className={`floating-panel${panels.list.dragging ? ' dragging' : ''}`} style={styleOf('list')} aria-label={txt.panelList}>
          {headOf('list', txt.panelList)}
          <div className="floating-panel-body">
            <p className="hint">{txt.listHint}</p>
            <div className="network-filters">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={txt.listSearchPlaceholder} aria-label={txt.listSearchAria} />
              <select value={caseFilter} onChange={(event) => setCaseFilter(event.target.value)} aria-label={txt.listCaseAria}>
                <option value="全部">{txt.allCases}</option>
                {caseFacet.present.map((item) => (
                  <option key={item.value} value={item.value}>{fill(txt.listOptionCount, { label: item.label, count: item.count })}</option>
                ))}
              </select>
              <select value={constructFilter} onChange={(event) => setConstructFilter(event.target.value)} aria-label={txt.listConstructAria}>
                <option value="全部">{txt.allConstructs}</option>
                {constructFacet.present.map((item) => (
                  <option key={item.value} value={item.value}>{fill(txt.listOptionCount, { label: item.label, count: item.count })}</option>
                ))}
              </select>
            </div>
            {/*
              「缺失的构造类型」这段带 `<strong>` / `<code>`，中文这一支**保持原样不动**：
              JSX 会把多行文本里的换行折叠成单个空格，改写成模板串就会引入看不见的差异
              （渲染出来的中文必须逐字不变）。英文另起一支，结构相同、用词对应。
            */}
            {constructFacet.absent.length > 0 && (
              <details className="facet-absent">
                {locale === 'en' ? (
                  <>
                    <summary>
                      The ontology does not register “{constructFacet.absent.join(', ')}” as separate nodes, so they are <strong>left out of the filters</strong>
                      {' '}(selecting them would return 0). Open this to see where they are registered.
                    </summary>
                    <p>
                      This is this site’s registration convention, not missing data: definitions live in the payload and body of concept nodes,
                      representations are written as <code>representations</code> sub-records inside a node,
                      and terms live in the constants and type environment of a signature. The full convention is in the README section “construct registration conventions”.
                    </p>
                  </>
                ) : (
                  <>
                <summary>
                  本体不把「{constructFacet.absent.join('、')}」登记成独立节点，因此<strong>不放进筛选</strong>
                  （选中只会得到 0 个）。点开看它们登记在哪里。
                </summary>
                <p>
                  这是本站的登记约定，不是缺数据：定义写在概念节点的负载与正文里，
                  表征写成节点内的 <code>representations</code> 子记录，
                  项写在签名的常元与类型环境里。约定全文见 README 的「构造类型的登记约定」。
                </p>
                  </>
                )}
              </details>
            )}
            <p className="result-count">{fill(txt.listResultCount, { shown: listed.length, total: nodes.length })}</p>
            {relationHint && <p className="notice">{relationHint}</p>}
            <ul className="network-node-list">
              {listed.map((node) => (
                <li
                  key={node.id}
                  className={added.has(node.id) ? 'added' : ''}
                  /*
                   * 面板与画布**共用同一套分层强调**（2026-10，TODO A3-22）：
                   * 画布上的节点与候选卡已经是「浅底 + 描边 + 发光 + 文字变色」四层，
                   * 面板里同一状态（已加入 / 当前选中）以前只有一个淡紫底。这里把状态写成属性，
                   * 样式统一走 --emphasis-* 令牌（见 styles.css 顶部的令牌说明与同一处注释）。
                   */
                  data-selected={selected === node.id ? 'true' : undefined}
                  data-added={added.has(node.id) ? 'true' : undefined}
                >
                  <label className="network-toggle">
                    <input type="checkbox" checked={added.has(node.id)} onChange={() => toggle(node.id)} />
                    <span className={`network-node-title${isPending(node.title) ? ' i18n-pending' : ''}`} title={isPending(node.title) ? t('i18n.pendingTitle') : undefined}>{node.title}</span>
                  </label>
                  <div className="network-node-meta">
                    <span className="construct" title={node.construct} style={{ background: CONSTRUCT_COLOR[node.construct] ?? undefined }}>{labels.constructLabel(node.construct)}</span>
                    {node.evidenceStatus && <StatusBadge status={node.evidenceStatus} title={fill(txt.evidenceLevelTitle, { status: node.evidenceStatus })} />}
                    <code>{node.id}</code>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {open.families && (
        <section ref={panels.families.handleRef} className={`floating-panel${panels.families.dragging ? ' dragging' : ''}`} style={styleOf('families')} aria-label={txt.panelFamilies}>
          {headOf('families', txt.panelFamilies)}
          <div className="floating-panel-body">
            <p className="hint">
              {txt.familiesHint}
            </p>
            <ul className="family-list">
              {(Object.keys(EDGE_FAMILY_LABELS) as EdgeFamily[]).map((family) => {
                const on = families.includes(family);
                const count = view.edges.filter((edge) => edge.source === family).length;
                return (
                  <li key={family} className={on ? 'on' : ''}>
                    <label className="network-toggle">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => setFamilies((current) => on ? current.filter((item) => item !== family) : [...current, family])}
                      />
                      <span className="network-node-title">{edgeFamilyLabel(family, locale)}</span>
                      <span className="family-count-badge">{fill(txt.familiesCount, { count })}</span>
                    </label>
                    <p className="muted">{edgeFamilyNote(family, locale)}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {open.views && (
        <section ref={panels.views.handleRef} className={`floating-panel${panels.views.dragging ? ' dragging' : ''}`} style={styleOf('views')} aria-label={txt.panelViews}>
          {headOf('views', txt.panelViews)}
          <div className="floating-panel-body">
            {/*
              用户的要求是「加入保存功能，下次可以直接用」。
              保存的是**视图状态**：已加入的节点、可见边源、手动位置、相机——四样一起存、一起还。
            */}
            {/* 这段夹着 `<strong>`：中文一支原样保留（多行 JSX 文本的换行会折叠成空格），英文另起一支。 */}
            {locale === 'en' ? (
              <p className="hint">
                Store the current network state (<strong>{added.size}</strong> nodes, <strong>{families.length}</strong> edge kinds,
                {' '}<strong>{Object.keys(overrides).length}</strong> manual positions, the current camera) as a named view and load it back
                {' '}by name next time. Saving writes learner state only and <strong>does not change the ontology</strong>.
              </p>
            ) : (
            <p className="hint">
              把当前的网络状态（<strong>{added.size}</strong> 个节点、<strong>{families.length}</strong> 类边、
              <strong>{Object.keys(overrides).length}</strong> 个手动位置、当前相机）存成一条带名字的视图，
              下次直接按名字载回来。保存只写学习者状态，<strong>不改本体</strong>。
            </p>
            )}
            <div className="card-actions">
              <button className="button small primary" onClick={saveCurrentView} disabled={added.size === 0}>
                {txt.viewsSaveNow}
              </button>
              {/*
                真的复制，不是导航（2026-10 修）。
                从前这里是一个指向当前 URL 的 `<Link>`：文案说「复制当前链接」，
                点下去却不进剪贴板（同 URL 跳转），用户以为已经复制好了。
              */}
              <button
                className="button small"
                onClick={async () => {
                  const url = window.location.href;
                  try {
                    await navigator.clipboard.writeText(url);
                    setNotice(txt.viewsCopied);
                  } catch {
                    setNotice(fill(txt.viewsCopyBlocked, { url }));
                  }
                }}
              >
                {txt.viewsCopyLink}
              </button>
            </div>
            {added.size === 0 && <p className="muted">{txt.viewsEmptyCanvas}</p>}
            {/*
              来源要写清楚：选了档案存 E 层（跟着档案走、可导出），没选就只在这台浏览器里。
              不写这句，用户会以为已经存进档案了。
            */}
            {viewsNote && <p className="muted">{viewsNote}</p>}
            <p className="muted saved-view-snapshot-note">{txt.viewsSnapshotNote}</p>
            {profile && localViewCount > 0 && (
              <div className="saved-view-migration" aria-busy={migratingViews}>
                <strong>{txt.viewsMigrateTitle}</strong>
                <p>{fill(txt.viewsMigrateNote, { count: localViewCount, name: profile.name })}</p>
                <button className="button small primary" disabled={migratingViews} onClick={() => void moveLocalViews()}>
                  {migratingViews ? txt.viewsMigrating : fill(txt.viewsMigrateAction, { count: localViewCount })}
                </button>
              </div>
            )}
            {localViewsError && <p role="status" className="muted">{txt.viewsLocalReadFailed}</p>}
            <p role="status" aria-live="polite" className="saved-view-migration-status">{migrationNote}</p>
            {savedViews.length > 0 && (
              <div className="saved-view-tools">
                <label htmlFor="saved-view-search">{txt.viewsSearch}
                  <input id="saved-view-search" type="search" value={viewQuery} placeholder={txt.viewsSearchPlaceholder}
                    onChange={(event) => setViewQuery(event.target.value)} />
                </label>
                <label htmlFor="saved-view-sort">{txt.viewsSort}
                  <select id="saved-view-sort" aria-label={txt.viewsSort} value={viewSort} onChange={(event) => setViewSort(event.target.value as typeof viewSort)}>
                    <option value="recent">{txt.viewsSortRecent}</option>
                    <option value="oldest">{txt.viewsSortOldest}</option>
                    <option value="nodes">{txt.viewsSortNodes}</option>
                    <option value="name">{txt.viewsSortName}</option>
                  </select>
                </label>
                <div className="saved-view-search-result">
                  <span role="status">{fill(txt.viewsFound, { shown: visibleSavedViews.length, total: savedViews.length })}</span>
                  {viewQuery && <button className="button small" onClick={() => setViewQuery('')}>{txt.viewsClearSearch}</button>}
                </div>
              </div>
            )}
            {savedViews.length === 0
              ? <p className="muted">{txt.viewsNone}</p>
              : visibleSavedViews.length === 0 ? <p className="muted">{txt.viewsNoMatch}</p>
              : (
                <ul className="saved-view-list">
                  {visibleSavedViews.map((entry) => (
                    <li key={entry.viewId}>
                      <div className="saved-view-head">
                        <span className={`saved-view-name${isPending(entry.name) ? ' i18n-pending' : ''}`}>{entry.name}</span>
                        {duplicateViews.has(entry.viewId) && (
                          <span className="saved-view-duplicate" title={txt.viewsDuplicateHint}>
                            {fill(txt.viewsDuplicate, duplicateViews.get(entry.viewId)!)}
                          </span>
                        )}
                        <span className="family-count-badge">{fill(txt.viewsEntryNodes, { count: (entry.payload.added ?? []).length })}</span>
                      </div>
                      <p className="muted">
                        {fill(txt.viewsEntryMeta, {
                          families: (entry.payload.families ?? []).length,
                          positions: (Object.keys(entry.payload.positions ?? {})).length,
                        })}
                        {' · '}
                        {fmtDate(entry.updatedAt, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {entry.local ? txt.viewsEntryLocal : txt.viewsEntryProfile}
                      </p>
                      <div className="card-actions">
                        <button className="button small" onClick={() => loadView(entry)}>{txt.viewsLoad}</button>
                        <button className="button small" onClick={() => void renameView(entry)}>{txt.viewsRename}</button>
                        <button
                          className="button small"
                          /*
                           * 删除前问一次（2026-10 修）。这是**真的删**（E 层记录），
                           * 没有回收站也没有撤销；同页的入库与回滚都有两步确认，
                           * 唯独删除原来点一下就没。确认文案里带上名字，避免删错另一个。
                           */
                          onClick={() => {
                            if (!window.confirm(fill(txt.viewsConfirmDelete, { name: entry.name }))) return;
                            void deleteView(entry);
                          }}
                        >
                          {txt.viewsDelete}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </section>
      )}

      {open.recommend && (
        <section ref={panels.recommend.handleRef} className={`floating-panel${panels.recommend.dragging ? ' dragging' : ''}`} style={styleOf('recommend')} aria-label={txt.panelRecommend}>
          {headOf('recommend', added.size === 0 ? txt.recommendTitleStart : txt.panelRecommend)}
          <div className="floating-panel-body">
            <p className="hint">
              {added.size === 0
                ? txt.recommendHintStart
                : txt.recommendHint}
            </p>
            {view.recommendations.length === 0 ? (
              <p className="muted">{txt.recommendEmpty}</p>
            ) : (
              <>
                {/* 分类筛选：只影响本面板的显示，不改视图内容。 */}
                <div className="recommend-filter" role="group" aria-label={txt.recommendFilterAria}>
                  <button
                    className={`chip${recommendFilter === 'all' ? ' on' : ''}`}
                    onClick={() => setRecommendFilter('all')}
                  >
                    {fill(txt.recommendAll, { count: view.recommendations.length })}
                  </button>
                  {groupedRecommendations.map((bucket) => (
                    <button
                      key={bucket.group}
                      className={`chip${recommendFilter === bucket.group ? ' on' : ''}${bucket.group.startsWith('method') ? ' method' : ''}`}
                      onClick={() => setRecommendFilter(bucket.group)}
                      title={nodeGroupNote(bucket.group, locale)}
                    >
                      {nodeGroupLabel(bucket.group, locale)} {bucket.items.length}
                    </button>
                  ))}
                </div>

                {groupedRecommendations
                  .filter((bucket) => recommendFilter === 'all' || recommendFilter === bucket.group)
                  .map((bucket) => (
                    <div className="recommend-group" key={bucket.group} data-group={bucket.group}>
                      <div className="recommend-group-head">
                        <h3>{nodeGroupLabel(bucket.group, locale)}</h3>
                        <span className="recommend-group-count">{bucket.items.length}</span>
                      </div>
                      <p className="recommend-group-note">{nodeGroupNote(bucket.group, locale)}</p>
                      <ul className="recommend-list">
                        {bucket.items.map((rec) => (
                          <li key={rec.node} data-group={bucket.group}>
                            <div className="recommend-head">
                              <StatusBadge status={REASON_TONE[rec.kind]} label={reasonLabels[rec.kind]} title={rec.kind} />
                              <Link className={`recommend-title${isPending(rec.title) ? ' i18n-pending' : ''}`} title={isPending(rec.title) ? t('i18n.pendingTitle') : undefined} to={hrefFor(`/nodes/${encodeURIComponent(rec.node)}`)}>{rec.title}</Link>
                            </div>
                            <p className="rec-reason">{reasonText(rec, titleOf, locale)}</p>
                            <div className="card-actions">
                              <button className="button small primary" onClick={() => toggle(rec.node)}>{txt.recommendAdd}</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </>
            )}
          </div>
        </section>
      )}

      {open.detail && (
        <section ref={panels.detail.handleRef} className={`floating-panel${panels.detail.dragging ? ' dragging' : ''}`} style={styleOf('detail')} aria-label={txt.panelDetail}>
          {headOf('detail', txt.panelDetail)}
          <div className="floating-panel-body">
            {!selectedNode ? (
              <p className="muted">{txt.detailEmpty}</p>
            ) : (
              <>
                <p className={`detail-title${isPending(selectedNode.title) ? ' i18n-pending' : ''}`} title={isPending(selectedNode.title) ? t('i18n.pendingTitle') : undefined}>{selectedNode.title}</p>
                <p className="muted">
                  <code>{selectedNode.id}</code> · {labels.constructLabel(selectedNode.construct)} · {labels.tables.cases[selectedNode.case] ?? selectedNode.case}
                  {' · '}{fill(txt.detailMetaTail, { degree: view.degree.get(selectedNode.id) ?? 0 })}
                </p>
                <p>{selectedNode.summary}</p>
                <div className="card-actions">
                  <Link className="button small" to={hrefFor(`/nodes/${encodeURIComponent(selectedNode.id)}`)}>{txt.detailOpenNode}</Link>
                  <button className="button small" onClick={() => toggle(selectedNode.id)}>
                    {added.has(selectedNode.id) ? txt.detailRemove : txt.detailAdd}
                  </button>
                </div>
                <h3>{fill(txt.detailEdges, { count: selectedEdges.length })}</h3>
                {/* 空态这段是多行 JSX 文本（换行会被折叠成空格）：中文原样保留，英文另起一支。 */}
                {selectedEdges.length === 0 && (
                  locale === 'en' ? (
                    <p className="muted">
                      Under the connection types currently enabled it has no link to the other added nodes.
                      {' '}Open more types in “Connection types”, or add its prerequisites / related nodes.
                    </p>
                  ) : (
                  <p className="muted">
                    在当前启用的连接类型下，它与其他已加入节点没有连接。
                    可以到「连接类型」里打开更多类型，或把它的前提 / 相关节点加进来。
                  </p>
                  )
                )}
                <ul className="detail-edges">
                  {selectedEdges.map((edge) => {
                    const other = edge.from === selectedNode.id ? edge.to : edge.from;
                    const familySource = edge.source;
                    return (
                      <li key={edge.id}>
                        {familySource === 'relation' ? (
                          <>
                            <StatusBadge status={edge.witnessStatus} title={fill(txt.witnessTitle, { status: edge.witnessStatus })} />
                            <span>{labels.relationLabel(edge.kind)}</span>
                            <Link to={hrefFor(`/nodes/${encodeURIComponent(other)}`)}>{titleOf(other)}</Link>
                            {edge.scope && <span className="muted">{edge.scope}</span>}
                          </>
                        ) : familySource === 'contract' ? (
                          <>
                            <StatusBadge status="not_run" label={edgeFamilyLabel('contract', locale)} title={edgeFamilyNote('contract', locale)} />
                            <span>{edge.from === selectedNode.id ? txt.detailSupports : txt.detailDepends}</span>
                            <Link to={hrefFor(`/nodes/${encodeURIComponent(other)}`)}>{titleOf(other)}</Link>
                            <span className="muted">{edge.actionTitle}</span>
                          </>
                        ) : (
                          <>
                            <StatusBadge status="not_run" label={edgeFamilyLabel(familySource, locale)} title={edgeFamilyNote(familySource, locale)} />
                            <span>{txt.detailRelated}</span>
                            <Link to={hrefFor(`/nodes/${encodeURIComponent(other)}`)}>{titleOf(other)}</Link>
                            <span className="muted">{edge.note}</span>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </section>
      )}

      {open.spec && (
        <section ref={panels.spec.handleRef} className={`floating-panel${panels.spec.dragging ? ' dragging' : ''}`} style={styleOf('spec')} aria-label={txt.panelSpec}>
          {headOf('spec', txt.panelSpec)}
          <div className="floating-panel-body">
            {/* 带 `<strong>` 的段落：中文一支原样保留（多行 JSX 文本的换行折叠成空格），英文另起一支。 */}
            {locale === 'en' ? (
              <p className="hint">
                The rule in one sentence: <strong>the harder the relation, the heavier it is drawn</strong>.
                {' '}The width, opacity, colour saturation and whether a label is drawn all follow from the weight,
                {' '}and the weight can be traced back to the relation kind and witness status — it is not tuned by feel.
              </p>
            ) : (
            <p className="hint">
              规则一句话：<strong>关系越硬，画得越重</strong>。
              每一档的线宽、不透明度、颜色饱和度和是否标注文字都由权重推出，
              权重可反查到关系种类与见证状态，不是凭手感调的。
            </p>
            )}
            <ul className="tier-list">
              {(Object.keys(TIER_STYLE) as RelationTier[]).map((tier) => {
                const style = TIER_STYLE[tier];
                const sample = view.edges.map((edge) => visualOf(edge)).filter((visual) => visual.tier === tier);
                const color = sample[0]?.color ?? THEME.neutral;
                return (
                  <li key={tier} data-tier={tier}>
                    <div className="tier-head">
                      <svg className="tier-sample" width="46" height="14" aria-hidden="true">
                        <line
                          x1="2" y1="7" x2="44" y2="7"
                          stroke={color}
                          strokeWidth={style.width}
                          strokeDasharray={style.dash}
                          strokeLinecap="round"
                          opacity={style.opacity}
                        />
                      </svg>
                      <strong>{tierLabel(tier, locale)}</strong>
                      <span className="tier-count">{fill(txt.specRowCount, { count: sample.length })}</span>
                    </div>
                    <p className="muted">{tierNote(tier, locale)}</p>
                    <p className="tier-params">
                      {fill(txt.specParams, {
                        width: style.width,
                        opacity: style.opacity,
                        dash: style.dash ? txt.specDashed : txt.specSolid,
                      })}
                      {style.label ? txt.specLabelled : ''}
                    </p>
                  </li>
                );
              })}
            </ul>
            <h3>{txt.specKindsTitle}</h3>
            <ul className="tier-kinds">
              {view.relations.length === 0 && <li className="muted">{txt.specKindsEmpty}</li>}
              {view.relations.map((kind) => {
                const visual = edgeVisual('relation', kind, 'PROOF', RELATION_COLOR[kind] ?? THEME.neutral);
                const count = view.edges.filter((edge) => edge.source === 'relation' && edge.kind === kind).length;
                return (
                  <li key={kind}>
                    <i style={{ background: visual.color }} />
                    <span>{labels.relationLabel(kind)}</span>
                    <span className="muted">{fill(txt.specKindMeta, { tier: tierLabel(visual.tier, locale), weight: visual.weight.toFixed(2), count })}</span>
                  </li>
                );
              })}
            </ul>
            <p className="muted">
              {txt.specArrows}
            </p>

            {/*
             * 行动契约按 mode 分档的依据。
             *
             * 用户报的正是这里：「同胚 → 流形」在本体里是 `a-dg:manifold` 的 definition 输入，
             * 却被画成一条几乎看不见的灰虚线。条款把 mode 与档位的关系摊开写；
             * 硬前置（hardPrereq）已按定义登记，条数从本体现算（2026-10 前这里写死成「0 条」）。
             */}
            <h3>{txt.specModeTitle}</h3>
            {/* 多行长文本：中文原样保留（换行折成空格），英文另起一支。下同。 */}
            {locale === 'en' ? (
              <p className="muted">
                The mode says what the input is for, and therefore how heavily it is drawn. Of the 215 contracts
                {' '}in the library, 85 are definition and 61 deduction — the dependencies of the “you cannot define it without this” kind all live here,
                {' '}and they used to be flattened into the weakest grey dashed line.
              </p>
            ) : (
            <p className="muted">
              mode 说明这条输入是干什么用的，因此决定它画多重。全库 215 条契约里
              definition 85 条、deduction 61 条——「不用它就定义不出来」这类依赖全在这里，
              以前被一律压成最弱的灰虚线。
            </p>
            )}
            <ul className="mode-kinds">
              {Object.entries(CONTRACT_MODE_LABELS).map(([mode]) => {
                const weight = CONTRACT_MODE_WEIGHT[mode] ?? 0.18;
                // 色块与画布同源：契约颜色按 mode 走，条款面板因此和画布一一对应。
                const visual = edgeVisual('contract', null, null, contractModeColor(mode, THEME.contractEdge), mode);
                const count = contractModeCounts.get(mode) ?? 0;
                return (
                  <li key={mode}>
                    <i style={{ background: visual.color }} />
                    <span>{contractModeLabel(mode, locale)}</span>
                    <span className="muted">
                      {fill(txt.specModeMeta, { tier: tierLabel(visual.tier, locale), weight: weight.toFixed(2), count })}
                      {SEMANTIC_CONTRACT_MODES.includes(mode) ? txt.specModeLabelled : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
            {locale === 'en' ? (
              <p className="muted">
                The ontology registers {hardPrereqCount} hardPrereq relations (no longer empty since 2026-10: the definition
                {' '}chains of five cases — introductory mathematical analysis, differential geometry, manifolds, tensors and groups — plus deduction
                {' '}dependencies such as inverse function → implicit function). They say “you cannot deduce it without this”,
                {' '}so they are drawn in the top tier; definition contracts say the other half of the same thing — “this node is defined through it”.
                {' '}Both land in the same tier, their width follows from the weight, and both are therefore visible on the canvas.
              </p>
            ) : (
            <p className="muted">
              本体里登记了 {hardPrereqCount} 条 hardPrereq 关系（2026-10 起不再是空的：数学分析初步、微分几何、
              流形、张量与群五个案例的定义链，以及反函数 → 隐函数这类推导依赖）。它们说的是「不用它就推不下去」，
              所以按最高一档画；契约里的 definition 说的是同一件事的另一半——「这个节点靠它定义出来」。
              两者落在同一档，宽度由权重决定，画布上因此都能看到。
            </p>
            )}
            <h3>{txt.specMergeTitle}</h3>
            {locale === 'en' ? (
              <p className="muted">
                In the ontology a pair of nodes often has both an action contract and a registered relation (for example <code>topological space → manifold</code>
                {' '}has both a definition contract and a hardPrereq), which used to be drawn as two overlapping lines. Now <strong>only the edge with the
                {' '}greatest visual weight is drawn for each pair</strong>, and at equal weight a semantic relation wins over the structural skeleton; the number
                {' '}merged away is written after the label as <code>+N</code>, and hovering an edge shows what each of them is. Current view:
                {' '}{drawnEdges.length} drawn, {mergedAwayCount} merged away ({view.edges.length} registered edges).
                {' '}Layout attraction and degree counts still use the full edge set — merging only affects drawing and never silently reshapes the graph.
              </p>
            ) : (
            <p className="muted">
              本体里同一对节点常同时有「行动契约」与「登记关系」（例如 <code>拓扑空间 → 流形</code> 既有 definition
              契约、又有 hardPrereq），以前会叠两条线。现在<strong>每组只画视觉权重最大的那条</strong>，
              同权重时语义关系优先于结构骨架；被并掉的条数写在标签后的 <code>+N</code> 里，
              鼠标停在边上能看到它们分别是什么。当前视图：
              画出 {drawnEdges.length} 条，并掉 {mergedAwayCount} 条（登记边共 {view.edges.length} 条）。
              布局的吸力与度数统计仍按完整边集算——合并只影响画，不偷偷改图的形状。
            </p>
            )}
            <h3>{txt.specArcTitle}</h3>
            {locale === 'en' ? (
              <p className="muted">
                An edge bends only when the straight line runs over a third card (<code>web/src/edge-routing.ts</code>). How much it bends is not
                {' '}guesswork: candidate bow heights are solved back from the blocking cards, each is checked for “how many cards does this curve still
                {' '}cross”, and the one that crosses <strong>the fewest</strong> is taken, with a bent edge guaranteed to cross fewer cards than the straight one;
                {' '}the bow limit is {ROUTE_DEFAULTS.maxBow}px (bending further would scramble the graph). In a dense view no bow height may get around the cards —
                {' '}that case is not pretended away but written out: {routes.stats?.throughCard ?? 0} edges in the current view bend because of a card, and
                {' '}{routes.stats?.throughCardResidual ?? 0} of them still cross a card within {ROUTE_DEFAULTS.maxBow}px.
              </p>
            ) : (
            <p className="muted">
              直线从第三张卡片身上压过去时才弯（<code>web/src/edge-routing.ts</code>）。弯多少不是拍脑袋：
              由挡路的卡片反解出候选弓高，逐个验「这条曲线还压着几张卡」，取<strong>压得最少</strong>的那个，
              并且保证弯过的边一定比直线压得少；弓高上限 {ROUTE_DEFAULTS.maxBow}px（再弯就把图搅乱了）。
              密排视图里可能任何弓高都绕不开——那种情形不假装解决，直接写出来：
              当前视图有 {routes.stats?.throughCard ?? 0} 条边因压卡而弯，
              其中 {routes.stats?.throughCardResidual ?? 0} 条在 {ROUTE_DEFAULTS.maxBow}px 内仍压着卡片。
            </p>
            )}
            <h3>{txt.specThreadTitle}</h3>
            {locale === 'en' ? (
              <p className="muted">
                Entries marked “Thread” are topic-level (the scope of a section or a chapter; the criterion is in <code>data/granularity.mjs</code>):
                {' '}they name a study thread, not a unit one can cognise on its own. Therefore
                {' '}(1) “Suggested additions” never calls them “prerequisites already in the graph”;
                {' '}(2) when you hold the left button for strongly related nodes they are listed as “Threads” rather than as “prerequisites for introducing it”.
                {' '}They are still drawn on the canvas and still have connections — what changed is how they are read, not whether topics are hidden.
                {' '}The current view has {placedThreadCount} of them.
              </p>
            ) : (
            <p className="muted">
              标着「线索」的条目是话题级条目（一节或一章的范围，判据见 <code>data/granularity.mjs</code>）：
              它们是一条学习线索的名字，不是可独立认知的单元。因此
              （1）「推荐加入」不会把它们说成「图中前提已加入」；
              （2）按住左键取强关联时，它们以「线索」列出，而不是以「引入它的前提」列出。
              它们照常画在画布上、照常有连接——改的是读法，不是把话题藏起来。
              当前视图里有 {placedThreadCount} 条。
            </p>
            )}
          </div>
        </section>
      )}

      <div className="network-legend-bar">
        <span className="legend-group">{txt.legendHarder}</span>
        {(Object.keys(TIER_STYLE) as RelationTier[]).map((tier) => (
          <span key={tier} title={tierNote(tier, locale)}>
            <svg className="tier-sample-legend" width="26" height="10" aria-hidden="true">
              <line
                x1="1" y1="5" x2="25" y2="5"
                stroke={TIER_SAMPLE_COLOR[tier]}
                strokeWidth={Math.min(TIER_STYLE[tier].width * 0.8, 4)}
                strokeDasharray={TIER_STYLE[tier].dash}
                strokeLinecap="round"
                opacity={TIER_STYLE[tier].opacity}
              />
            </svg>
            {tierLabel(tier, locale)}
          </span>
        ))}
        {/* 话题配色：只列**当前画布上真有的**话题，不把整张表铺出来。 */}
        {visibleTopics.length > 0 && <span className="legend-divider" aria-hidden="true" />}
        {visibleTopics.map((item) => (
          <span key={item.title} title={fill(txt.legendTopicTitle, { title: item.title, count: item.count })}>
            <i className="topic-swatch" style={{ background: item.color }} />
            {/* 话题名来自本体（聚合块标题）：英文站上还没有译文时如实标出来，不留一截中文不吭声。 */}
            <span className={isPending(item.title) ? 'i18n-pending' : undefined} title={isPending(item.title) ? t('i18n.pendingTitle') : undefined}>
              {topicLegendLabel(item.title)}
            </span>
            <span className="legend-count">{item.count}</span>
          </span>
        ))}
        {/*
          线索层：只在该视图**真有**话题级条目时出现（2026-10 加）。
          它与上面的「话题配色」不是一回事：配色按聚合块分组，线索层按条目粒度分级。
        */}
        {placedThreadCount > 0 && (
          <span
            className="legend-thread"
            title={txt.legendThreadTitle}
          >
            <i className="thread-swatch" />
            {txt.legendThread}
            <span className="legend-count">{placedThreadCount}</span>
          </span>
        )}
        <span className="legend-hint">
          {txt.legendHint}
        </span>
      </div>
    </div>
  );
}




