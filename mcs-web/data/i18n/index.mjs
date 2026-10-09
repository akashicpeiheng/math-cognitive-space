/**
 * 语言覆盖目录的入口。
 *
 * 目录形状（与 `data/i18n/overlay.mjs` 的合并规则一一对应）：
 *
 *   en/nodes.mjs         按节点 id 的译文（标题、摘要、谓词、动机、教学字段…）
 *   en/actions.mjs       按行动 id 的标题（与 witness 的说明）
 *   en/evidence.mjs      按证据 id 的标题 / scope / obligations / reference
 *   en/relations.mjs     按关系 id 的 scope / task / candidateNote
 *   en/localizations.mjs 36 个局部化算子的名称与定义
 *   en/meta.mjs          段落级（signature / theory / 覆盖表 / 模板 / 聚合 / 正文块…）
 *   en/cases/<id>.mjs    案例正文的**按块**译文（键是 `<!-- node:id -->` 的 id）
 *
 * 中文是源语言：`zh` 不读任何覆盖目录，`overlayFor('zh')` 返回 `null`，
 * 因此中文路径与从前逐字一致（这也是现有 50 步验收的回归网）。
 */

import { DEFAULT_LOCALE, LOCALES, normalizeLocale } from '../../shared/locales.mjs';
import { keyOf } from './overlay.mjs';
import { GLOSSARY, CASE_TITLES_EN, CONSTRUCTS_EN, ROLES_EN, RELATIONS_EN } from './glossary.mjs';

/**
 * 语种 → 覆盖模块清单。懒加载：没请求过英文就不付英文的装载代价。
 *
 * ## 为什么按**文件**列，而不是只写聚合模块
 *
 * 覆盖文件是多人（多轮）分批交付的：某个案例的文件可能还没建、可能正被写坏。
 * 如果只 import 一个聚合模块，那个模块里的 `import './manifold.mjs'` 一旦失败，
 * **整块 nodes 全部丢失**——已经翻好的 56 个节点会静默消失，覆盖率掉到 0，
 * 而失败原因只是一个还没建的文件的 `ERR_MODULE_NOT_FOUND`。这在本轮真的发生了。
 *
 * 所以注册表按**单个文件**列：一个文件缺失或坏掉只影响它自己，其余照常生效；
 * 缺的那部分由 `coverage()` 如实记为缺口。
 */
const REGISTRY = {
  en: {
    nodes: [
      './en/limit.mjs', './en/rudin.mjs', './en/dg.mjs', './en/liang.mjs',
      './en/manifold.mjs', './en/tensor.mjs', './en/group.mjs', './en/background.mjs',
    ].map((specifier) => ({ specifier, pick: (module) => module.default?.nodes })),
    representations: [
      './en/limit.mjs', './en/rudin.mjs', './en/dg.mjs', './en/liang.mjs',
      './en/manifold.mjs', './en/tensor.mjs', './en/group.mjs', './en/background.mjs',
    ].map((specifier) => ({ specifier, pick: (module) => module.default?.representations })),
    actions: [{ specifier: './en/actions.mjs', pick: (module) => module.default }],
    evidence: [{ specifier: './en/evidence.mjs', pick: (module) => module.default }],
    relations: [{ specifier: './en/relations.mjs', pick: (module) => module.default }],
    localizations: [{ specifier: './en/localizations.mjs', pick: (module) => module.default }],
    meta: [{ specifier: './en/meta.mjs', pick: (module) => module.default }],
    cases: ['./en/cases.mjs', './en/cases-dg.mjs', './en/cases-limit.mjs', './en/cases-liang.mjs'],
    /*
     * 剩下六节没有按案例拆分的需要（它们本身就不是案例的字段，而是站点级的登记表）：
     * `patterns` 误区模式、`claims` 形式陈述、`support` 支持族、`aggregates` 话题聚合、
     * `templates` 十三种角色模板、`coverage` 专稿覆盖表。
     *
     * **这一条是补上的**：注册表原先只挂了八节，于是这六节即使翻译了也**没有任何装配入口**
     * ——写进去等于白写（译者会看到文件存在、parity 却永远报 0/45）。这类「工具静默不接受」
     * 的缺口比译错更隐蔽，所以这里显式列全，并由 `scripts/i18n-parity.mjs` 逐节核对。
     */
    patterns: [{ specifier: './en/objects.mjs', pick: (module) => module.default?.patterns }],
    claims: [{ specifier: './en/objects.mjs', pick: (module) => module.default?.claims }],
    support: [{ specifier: './en/objects.mjs', pick: (module) => module.default?.support }],
    aggregates: [{ specifier: './en/objects.mjs', pick: (module) => module.default?.aggregates }],
    templates: [{ specifier: './en/objects.mjs', pick: (module) => module.default?.templates }],
    coverage: [{ specifier: './en/objects.mjs', pick: (module) => module.default?.coverage }],
  },
};

/** 该文件是不是「还没建」——这不算错误，只算缺口。 */
function isMissingModule(error) {
  return error?.code === 'ERR_MODULE_NOT_FOUND' && /Cannot find module/.test(String(error?.message ?? ''));
}

/**
 * 按文件清单装载一节：逐文件容错，**同名 id 冲突要报错**（静默覆盖意味着一个译文白写）。
 *
 * `entry` 有两种写法：
 * - 字符串：模块的 `default` 就是该节的映射（按案例拆分的文件，例如 `./en/dg.mjs`）；
 * - `{ specifier, pick }`：模块把多节合并导出，用 `pick` 明确取哪一节
 *   （聚合文件 `en/actions.mjs` 等）。**不做形状嗅探**——猜错的结果是整节静默不生效。
 */
async function loadSection(entries) {
  const merged = {};
  let loadedAny = false;
  for (const entry of entries) {
    const specifier = typeof entry === 'string' ? entry : entry.specifier;
    let module;
    try {
      module = await import(specifier);
    } catch (error) {
      if (isMissingModule(error)) continue;
      throw error;
    }
    const value = typeof entry === 'string' ? module.default : entry.pick(module);
    if (!value || typeof value !== 'object') continue;
    loadedAny = true;
    for (const [id, item] of Object.entries(value)) {
      if (merged[id] !== undefined) {
        throw new Error(`语言覆盖里 id 重复登记：${specifier} 的「${id}」（两份译文会静默覆盖一份，必须显式合并）`);
      }
      merged[id] = item;
    }
  }
  return loadedAny ? merged : null;
}

const cache = new Map();
const failures = new Map();

/**
 * 装载某语种的覆盖树；`zh` 或没有登记的语种返回 `null`（= 用基础数据，即中文）。
 *
 * 一个覆盖模块缺失**不是**致命错误：它只是「这一块还没翻译」，其余块照常生效，
 * 缺口由 `coverage()` 如实清点。这是有意的——否则翻译到一半时整站会打不开。
 * 但模块存在却**语法/形状错误**会抛错（那是数据坏了，不是没写完）。
 */
export async function overlayFor(locale) {
  const target = normalizeLocale(locale, DEFAULT_LOCALE);
  if (target === DEFAULT_LOCALE) return null;
  if (cache.has(target)) return cache.get(target);
  if (failures.has(target)) throw failures.get(target);
  const registry = REGISTRY[target];
  if (!registry) return null;

  const overlay = { __locale: target };
  for (const [section, entries] of Object.entries(registry)) {
    try {
      const value = await loadSection(entries);
      if (value && Object.keys(value).length > 0) overlay[section] = value;
    } catch (error) {
      /*
       * 模块**存在但坏了**（语法错误、id 重复）不是「还没翻译」，必须让调用方看见：
       * 静默跳过会让译者以为自己的文件生效了，而页面仍是中文。
       */
      failures.set(target, error);
      throw error;
    }
  }
  cache.set(target, overlay);
  return overlay;
}

export function resetOverlayCache() {
  cache.clear();
  failures.clear();
}

/** 给纯同步调用方用的入口：已经装载过才有值（否则返回 null = 中文兜底）。 */
export function overlayForSync(locale) {
  const target = normalizeLocale(locale, DEFAULT_LOCALE);
  if (target === DEFAULT_LOCALE) return null;
  return cache.get(target) ?? null;
}

/**
 * 覆盖率盘点：把「已经翻了多少」变成可以打印、可以进 `npm run check` 的数字。
 *
 * 分母直接取自中文源本体（`nodes.length` 等），不写死数字——写死的分母会在加节点后
 * 悄悄变成「覆盖率虚高」。
 */
export async function coverage(locale = 'en') {
  const { loadOntology } = await import('../../core/ontology.mjs');
  const instance = await loadOntology();
  const raw = instance.raw;
  const overlay = await overlayFor(locale);
  if (!overlay) {
    return { locale, overlay: false, sections: {}, content: null, totals: { units: 0, translated: 0, ratio: 1 }, missing: {} };
  }
  const sections = {};
  const missing = {};
  const pairs = [
    ['nodes', raw.nodes],
    ['actions', raw.actions],
    ['evidence', raw.evidence],
    ['relations', raw.relationDescriptions],
    ['representations', raw.representations],
    ['support', raw.support],
    ['aggregates', raw.aggregates],
    ['templates', raw.templates],
    ['patterns', raw.patterns],
    ['claims', raw.claims],
    ['localizations', raw.localizations],
    ['coverage', raw.coverage],
  ];
  for (const [section, items] of pairs) {
    const map = overlay[section] ?? {};
    /*
     * 行的键**不是一律 id**：模板的键是 `role`、覆盖表的键是 `chapter`（见 `overlay.mjs`
     * 的 `keyOf`）。这里必须用同一个函数取键，否则那两节会永远算成「0/N 已译」——
     * 覆盖率报缺口，而实际上译文写好了却不生效。
     */
    const keyed = items.map((item) => ({ item, key: keyOf(section, item) }));
    const covered = keyed.filter(({ key }) => key && map[key]).length;
    sections[section] = { total: items.length, translated: covered };
    if (covered < items.length) {
      missing[section] = keyed.filter(({ key }) => !key || !map[key]).map(({ item, key }) => key ?? item?.title ?? '(无键)');
    }
  }
  const blocks = overlay.meta?.__meta?.contentBlocks ?? overlay.meta?.contentBlocks ?? overlay.cases ?? {};
  const withContent = raw.nodes.filter((node) => node.contentMarkdown);
  const translatedBlocks = withContent.filter((node) => blocks[node.contentRef ?? node.id]).length;
  const content = { total: withContent.length, translated: translatedBlocks };
  if (translatedBlocks < withContent.length) {
    missing.content = withContent.filter((node) => !blocks[node.contentRef ?? node.id]).map((node) => node.id);
  }

  const totalUnits = Object.values(sections).reduce((sum, item) => sum + item.total, 0) + content.total;
  const translatedUnits = Object.values(sections).reduce((sum, item) => sum + item.translated, 0) + content.translated;
  return {
    locale: normalizeLocale(locale),
    overlay: true,
    sections,
    content,
    totals: { units: totalUnits, translated: translatedUnits, ratio: totalUnits ? translatedUnits / totalUnits : 1 },
    missing,
  };
}

/** 覆盖率的一行人话（doctor 与 /api/v2/health 都用同一份措辞）。 */
export function formatCoverage(report) {
  if (!report.overlay) return `${report.locale}（源语言，无需覆盖）`;
  const parts = Object.entries(report.sections).map(([name, item]) => `${name} ${item.translated}/${item.total}`);
  parts.push(`正文 ${report.content.translated}/${report.content.total}`);
  return `${report.locale}：${parts.join('，')}（整体 ${(report.totals.ratio * 100).toFixed(1)}%）`;
}

export { GLOSSARY, CASE_TITLES_EN, CONSTRUCTS_EN, ROLES_EN, RELATIONS_EN };
export { LOCALES, DEFAULT_LOCALE, normalizeLocale };
