/**
 * 界面文案表：**中英成对**写在同一个字面量里。
 *
 * ## 为什么成对而不是两份文件
 *
 * 两份文件（`zh.ts` / `en.ts`）在改动时最容易出现「加了中文忘了英文」——编译器
 * 不会说话，界面在英文下显示空白或中文。成对写法让**漏一个键就编译不过**
 * （`Messages` 的类型由中文表推出，英文表必须逐键齐全），这是能自动抓到的错误。
 *
 * ## 命名
 *
 * `域.用途`：`nav.*` 导航、`topbar.*` 顶栏、`common.*` 通用动作、`a11y.*` 无障碍标签、
 * `evidence.*` 证据标签、`status.*` 状态词。页面自己的长文案不放这里，
 * 放各自的模块（例如 `intro-content.ts` 的英文版），否则这个文件会变成垃圾场。
 *
 * ## 与后端文案的分工
 *
 * **本体里的文本**（节点标题、摘要、正文、证据说明）走 `mcs-web/data/i18n/`，
 * 由服务端按 `?locale=` 下发；这里只放**界面壳层**与少量派生显示词。
 * 两套东西的更新节奏不同：界面文案跟着前端改版走，本体文本跟着数学内容走。
 */

import type { Locale } from './locales';

export const MESSAGES = {
  'site.name': { zh: '数学认知空间 MCS', en: 'Mathematical Cognitive Space (MCS)' },
  'site.shortName': { zh: '数学认知空间', en: 'Mathematical Cognitive Space' },
  'site.tagline': { zh: 'M / E / D 分离 · 本机工作台', en: 'M / E / D separated · local workbench' },
  'site.author': { zh: '作者', en: 'Author' },
  'site.contact': { zh: '联系邮箱', en: 'Contact' },
  'site.footerNote': { zh: '公共本体 M、外部学习者模型 E 与派生结果 D 分离', en: 'Public ontology M, external learner model E and derived results D are kept separate' },

  'locale.switch': { zh: '语言', en: 'Language' },
  'locale.zh': { zh: '中文', en: '中文' },
  'locale.en': { zh: 'EN', en: 'EN' },
  'locale.zhTitle': { zh: '切换到中文', en: 'Switch to Chinese' },
  'locale.enTitle': { zh: '切换到英文', en: 'Switch to English' },

  'nav.start': { zh: '开始学习', en: 'Start learning' },
  'nav.nodes': { zh: '数学对象', en: 'Objects' },
  'nav.network': { zh: '知识网络', en: 'Knowledge network' },
  'nav.plan': { zh: '学习路线', en: 'Learning route' },
  'nav.profile': { zh: '我的学习', en: 'My learning' },
  'nav.intro': { zh: '网站介绍', en: 'About' },
  'nav.method': { zh: '学习方法论', en: 'Methodology' },
  'nav.tutor': { zh: '辅导', en: 'Tutor' },
  'nav.lab': { zh: '前沿研究', en: 'Research' },
  'nav.maintenance': { zh: '网站维护', en: 'Maintenance' },
  'nav.authoring': { zh: '自动关联', en: 'Relation discovery' },
  'nav.secondaryTitle': { zh: '按需查阅', en: 'Look up as needed' },
  'nav.secondaryNote': {
    zh: '介绍、方法论、辅导（已接入 DeepTutor）、前沿研究，以及站点自身的维护材料与「自动关联」（把对象写成形式表达并自动找关系）。',
    en: 'About, methodology, tutoring (connected to DeepTutor), research, together with the site’s own maintenance material and “relation discovery” (writing objects as formal expressions and finding relations automatically).',
  },
  'nav.tutorBadgeTitle': {
    zh: '辅导已接入 DeepTutor：本机可选入口，导通状态在辅导页按证据显示',
    en: 'Tutoring is connected to DeepTutor: an optional local entry; the tutoring page reports connectivity as evidence',
  },

  'topbar.home': { zh: '首页', en: 'Home' },
  'topbar.site': { zh: '数学认知空间', en: 'Mathematical Cognitive Space' },
  'topbar.location': { zh: '当前位置', en: 'Current location' },
  'topbar.brandTitle': { zh: '回到首页动画（六幕叙事）', en: 'Back to the home animation (six acts)' },
  'topbar.brandAria': { zh: '回到首页动画', en: 'Back to the home animation' },
  'topbar.sidebarAria': { zh: '站点侧栏', en: 'Site sidebar' },
  'topbar.primaryNavAria': { zh: '主导航', en: 'Primary navigation' },
  'topbar.expandNav': { zh: '展开导航', en: 'Expand navigation' },
  'topbar.collapseNav': { zh: '收起导航', en: 'Collapse navigation' },
  'topbar.expandSidebar': { zh: '展开侧栏', en: 'Expand sidebar' },
  'topbar.collapseSidebar': { zh: '收起侧栏', en: 'Collapse sidebar' },

  'profile.pickerLabel': { zh: '学习者档案（E）', en: 'Learner profile (E)' },
  'profile.none': { zh: '未选择档案', en: 'No profile selected' },
  'profile.revisionTitle': { zh: '修订号 rev', en: 'revision rev' },

  'common.loading': { zh: '读取中…', en: 'Loading…' },
  'common.retry': { zh: '重试', en: 'Retry' },
  'common.close': { zh: '关闭', en: 'Close' },
  'common.cancel': { zh: '取消', en: 'Cancel' },
  'common.confirm': { zh: '确认', en: 'Confirm' },
  'common.save': { zh: '保存', en: 'Save' },
  'common.delete': { zh: '删除', en: 'Delete' },
  'common.copy': { zh: '复制', en: 'Copy' },
  'common.copied': { zh: '已复制', en: 'Copied' },
  'common.more': { zh: '更多', en: 'More' },
  'common.less': { zh: '收起', en: 'Show less' },
  'common.expand': { zh: '展开', en: 'Show more' },
  'common.none': { zh: '（未返回）', en: '(not returned)' },
  'common.dash': { zh: '—', en: '—' },
  'common.notSelected': { zh: '未选择', en: 'Not selected' },
  'common.unknown': { zh: '未知', en: 'Unknown' },
  'common.uncategorized': { zh: '未分类', en: 'Uncategorized' },

  'error.boundaryTitle': { zh: '页面渲染出错', en: 'This page failed to render' },
  'error.reload': { zh: '重新加载', en: 'Reload' },
  'error.backHome': { zh: '回首页', en: 'Back to home' },

  'a11y.skipToContent': { zh: '跳到正文', en: 'Skip to content' },
  /* 规划页步骤轨道的 aria-label（`PlanPage` 的 `<ol className="step-rail">`）。 */
  'a11y.planSteps': { zh: '规划步骤', en: 'Planning steps' },

  /* —— 学习动作与状态（与 E 层事件一一对应，措辞必须与 README 的语义表一致） —— */
  'action.markRead': { zh: '标记已读', en: 'Mark as read' },
  'action.notUnderstood': { zh: '我还不懂', en: 'I don’t get it yet' },
  'action.confirmUsable': { zh: '确认已掌握', en: 'Confirm usable' },
  'action.reviewed': { zh: '记一次复习', en: 'Record a review' },
  'action.selfCheckAnswer': { zh: '自检作答', en: 'Self-check answer' },
  'action.openNode': { zh: '打开节点', en: 'Open node' },

  'status.known': { zh: '已知', en: 'Known' },
  'status.unknown': { zh: '未知', en: 'Unknown' },
  'status.unspecified': { zh: '未指定', en: 'Unspecified' },
  'status.viewed': { zh: '已读', en: 'Read' },
  'status.read': { zh: '已读', en: 'Read' },

  /*
   * 派生状态里几个固定说法的英文。
   *
   * 「确认可用」在动作按钮上是 `Confirm usable`（祈使句），在徽章上是 `Confirmed usable`
   * （状态）。两处**故意不同**：徽章说「这个节点现在处于什么状态」，按钮说「按下去会发生什么」。
   * 中文里两者都写成「确认可用」，所以这层差别只体现在英文上——记在这里，免得以后
   * 被当成不一致而改掉。
   */
  'status.confirmedUsable': { zh: '确认可用', en: 'Confirmed usable' },
  /*
   * 列表卡的**状态芯片**用的是另一个中文串「已确认」（`NodeListPage` 的 `stateConfirmed`）。
   * 中文逐字不变是硬约束，所以这里为它单独登记一个键；英文与前一条**统一**成
   * `Confirmed usable`——中文里的两种写法是历史用词差异，英文里不该跟着分成两个说法
   * （读者会以为它们是两个状态）。
   */
  'status.confirmed': { zh: '已确认', en: 'Confirmed usable' },
  'status.notConfirmed': { zh: '未确认', en: 'Not confirmed' },
  'status.readyToLearn': { zh: '现在可学', en: 'Ready to learn' },
  'status.bodyNotWritten': { zh: '正文待写', en: 'Body not written yet' },
  /*
   * 本体坐标与术语的固定说法。**译法以 `data/i18n/glossary.mjs` 为准**（那是全站术语的
   * 唯一来源）：`形式负载 → Formal payload`、`形式表达 → Formal statement`、
   * `支持族 → Support family`。这里只登记界面常用的几个，方便组件统一取用；
   * 与术语表冲突时**改这里**，不要各自在页面里写一份。
   */
  'concept.formalPayload': { zh: '形式负载', en: 'Formal payload' },
  'concept.formalStatement': { zh: '形式表达', en: 'Formal statement' },
  'concept.supportFamily': { zh: '支持族', en: 'Support family' },

  /* —— 证据标签：这是**不翻译**的固定记号，这里列出来是为了界面能统一取用 —— */
  'evidence.DEF': { zh: 'DEF', en: 'DEF' },
  'evidence.PROOF': { zh: 'PROOF', en: 'PROOF' },
  'evidence.REF': { zh: 'REF', en: 'REF' },
  'evidence.FINITE': { zh: 'FINITE', en: 'FINITE' },
  'evidence.ILLUSTRATION': { zh: 'ILLUSTRATION', en: 'ILLUSTRATION' },
  'evidence.NOT-CLAIMED': { zh: 'NOT-CLAIMED', en: 'NOT-CLAIMED' },

  /* —— 「你搜的词是关系种类」提示（`facets.ts` 的 `relationKindHint` 用）——
   *
   * 这几条是**带占位符的模板**，由 `facets.ts` 替换 `{label}` / `{count}` / `{tail}` / `{where}`。
   * 放在这里是因为它是全站文案的唯一来源：纯函数模块直接读 `MESSAGES[key][locale]`，
   * 不引入 React（`translate()` 不做插值，所以模板留在值里、替换留在调用处）。 */
  'facets.relationHint': {
    zh: '「{label}」是关系种类，不是节点类型，所以按节点筛只会是 0。{tail}：{where}',
    en: '“{label}” is a relation kind, not an object type, so filtering by object can only return 0. {tail}: {where}',
  },
  'facets.relationHintCounted': {
    zh: '本体里登记了 {count} 条这种关系',
    en: 'The ontology registers {count} relation(s) of this kind',
  },
  'facets.relationHintPresent': {
    zh: '本体里有这种关系',
    en: 'The ontology has relations of this kind',
  },
  'facets.relationHintWhere': {
    zh: '去「知识网络」的「连接类型」面板打开它，或在研究台按关系复核。',
    en: 'Open it in the “Knowledge network” → “Connection types” panel, or re-check it by relation on the research bench.',
  },

  /* —— 双语状态提示：英文站上「这一条还没有英文」必须说出来，不能留空白 ——
   *
   * 中文侧**故意留空**：中文是源语言，永远有内容，这条提示不会出现。留空比编一句
   * 「本条尚未翻译」诚实——它只在英文出现，而中文接上它就是噪音。 */
  'i18n.pendingItem': { zh: '', en: 'Not yet translated — showing the Chinese original.' },
  'i18n.pendingTitle': { zh: '', en: 'This item has no English translation yet; the Chinese original is shown.' },
  'i18n.partialBanner': {
    zh: '',
    en: 'Parts of this site are not translated yet; those items show the Chinese original.',
  },
} as const;

export type MessageKey = keyof typeof MESSAGES;
type Catalog = Record<MessageKey, string>;

/** 中文表：源语言，永远是兜底。 */
export const ZH: Catalog = Object.fromEntries(
  Object.entries(MESSAGES).map(([key, value]) => [key, value.zh]),
) as Catalog;

/** 英文表。 */
export const EN: Catalog = Object.fromEntries(
  Object.entries(MESSAGES).map(([key, value]) => [key, value.en]),
) as Catalog;

export const CATALOGS: Record<Locale, Catalog> = { zh: ZH, en: EN };

/**
 * 取文案：未登记的键**原样返回键名**，不返回空白。
 *
 * 空白会被读成「这里本来就没事」，而 `nav.start` 这种键名一眼就能看出是漏登记，
 * 与 `web/src/labels.ts` 的 `labelOf` 同一条纪律。
 */
export function translate(locale: Locale, key: MessageKey): string {
  return CATALOGS[locale]?.[key] ?? CATALOGS.zh[key] ?? key;
}
