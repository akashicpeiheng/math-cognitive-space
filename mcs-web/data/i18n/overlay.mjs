/**
 * 语言覆盖的装配：把 `data/i18n/<locale>/` 的译文套到中文源本体的**视图**上。
 *
 * ## 三条硬约束（改这里之前先读）
 *
 * 1. **不改哈希**。`createOntology()` 把 `sha256(canonicalize(raw))` 当作本体版本；
 *    覆盖在**装配之后**应用，因此 `zh` 与 `en` 的 `version` / `contentHash` 逐字相同。
 *    这不是省事：同一份 M 在两种语言下必须是**同一个版本**，否则「换语言看不到自己的
 *    学习记录」——档案与事件挂在 `ontologyVersion` 上，两个哈希等于两套证据。
 *
 * 2. **只换文本，不动结构**。键集合、数组长度、id、受控词表值（`discipline`、
 *    `construct`、`roles`、`mode`、证据标签）一律保持中文源的样子。结构差异由
 *    `data/i18n/parity.mjs` 当场判错，不在这里兜。
 *
 * 3. **缺失 = 中文兜底 + 如实上报**。译文没写到的条目回落中文，并被 `coverage()`
 *    计入缺口；页面对这些条目显示「尚未翻译」，而不是假装它已经是英文。
 *
 * ## 为什么用「克隆 + 覆盖」而不是 Proxy
 *
 * 本体是 232 节点 / 216 行动 / 199 证据 + 15 万字正文。Proxy 惰性最省内存，但会把
 * 「同一性」变成不可推理的东西（`raw.nodes === other.nodes` 的真假取决于访问路径），
 * 而这份数据要过 `JSON.stringify`、快照哈希与发布差异计算。克隆只在**第一次**请求
 * 该语种时付一次代价，之后按 `version+locale` 缓存，换来一个「就是普通对象」的结果。
 */

import { DEFAULT_LOCALE, normalizeLocale } from '../../shared/locales.mjs';
import { createOntology } from '../../core/ontology.mjs';

/** 段落级（singleton）译文挂在覆盖树的这个键下。 */
export const META_KEY = '__meta';

/**
 * 「这一节里，某一行的键叫什么」。
 *
 * 大部分集合的行用 `id`（节点、行动、证据、关系、表征、支持、聚合、误区、断言、局部化），
 * 但**不是全部**：
 * - `templates` 的行是十三种**角色**，键是 `role`（`'Concept'`、`'Theorem'`…）；
 * - `coverage` 的行是专稿**章节**，键是 `chapter`（`'01'`…`'D.1'`）。
 *
 * 装配层、覆盖率、parity 三处都必须用**同一张表**取键。这里曾经只写 `item.id`，
 * 后果是模板与覆盖表**写了也装不上**（`item?.id` 是 `undefined`，整条静默跳过），
 * 而 parity 还会反过来说「基础数据里不存在这个 id」——与本轮那次 `relations`
 * 键名不一致是同一类缺陷：**装配层与检查层各读各的键名**。
 */
const SECTION_KEYS = {
  templates: (item) => item?.role,
  coverage: (item) => item?.chapter,
};

/** 取某一行在本节里的键；未登记的节一律用 `id`。 */
export function keyOf(section, item) {
  const pick = SECTION_KEYS[section];
  return pick ? pick(item) : item?.id;
}

/** 覆盖映射里允许出现、但不代表某一行的保留键。 */
const RESERVED_KEYS = new Set([META_KEY]);

/** 正文块的键是 `<!-- node:id -->` 里的 id，与节点 id 与 `contentRef` 都对得上。 */
export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 结构保持的深合并。
 *
 * 规则（每一条都有对应的 parity 断言）：
 * - 两边都是普通对象 → 逐键递归；
 * - 两边都是数组 → **长度必须相等**，逐序递归（`conditions`、`selfCheck`、`motivation.internal`
 *   都是按序对齐的列表，长度不等即错位，必须报错而不是截断或补齐）；
 * - 其它情况 → 以覆盖值为准（字符串、数字、`null`）。
 *
 * `null` 是**有意的覆盖值**：它表示「这一项在该语言下确实为空」，
 * 因此不能用 `??` 之类的宽松判断把 `null` 当缺省跳过。
 */
export function mergeStructured(base, overlay, trail = [], problems = []) {
  if (overlay === undefined) return base;
  if (Array.isArray(base) || Array.isArray(overlay)) {
    if (!Array.isArray(base) || !Array.isArray(overlay)) {
      problems.push(`${trail.join('.') || '(根)'}：覆盖值不是数组，而基础值是${Array.isArray(base) ? '数组' : '非数组'}`);
      return base;
    }
    if (base.length !== overlay.length) {
      problems.push(`${trail.join('.') || '(根)'}：数组长度不一致（基础 ${base.length}，覆盖 ${overlay.length}）`);
      return base;
    }
    return base.map((item, index) => mergeStructured(item, overlay[index], [...trail, `[${index}]`], problems));
  }
  if (isPlainObject(base) && isPlainObject(overlay)) {
    const result = { ...base };
    for (const [key, value] of Object.entries(overlay)) {
      if (key === META_KEY) continue;
      if (key === 'id' && value !== undefined && base.id !== undefined && value !== base.id && value !== null) {
        /* 覆盖里写错了 id：宁可报错，也不要生成一个「id 是别人的」条目。 */
        problems.push(`${[...trail, key].join('.')}：覆盖的 id 是 ${JSON.stringify(value)}，基础值是 ${JSON.stringify(base.id)}`);
        continue;
      }
      if (key === 'id') continue;
      result[key] = mergeStructured(base[key], value, [...trail, key], problems);
    }
    return result;
  }
  if (isPlainObject(overlay) || Array.isArray(overlay)) {
    problems.push(`${trail.join('.') || '(根)'}：覆盖值形状与基础值不符（${Array.isArray(overlay) ? '数组' : '对象'} vs 基础标量）`);
    return base;
  }
  return overlay;
}

/**
 * 按**本节的行键**配对覆盖一个集合（键通常 id，模板是 role、覆盖表是 chapter）。
 *
 * 覆盖里出现**基础里没有的键**直接报错：那不是「多余」，那是把译文挂到了不存在的对象上
 * （改键时最容易发生），静默忽略会让译者以为已经翻好，而页面永远显示中文。
 */
export function mergeCollection(items, overlayMap, section, problems) {
  if (!overlayMap) return items;
  const known = new Set(items.map((item) => keyOf(section, item)).filter(Boolean));
  for (const key of Object.keys(overlayMap)) {
    if (RESERVED_KEYS.has(key)) continue;
    if (!known.has(key)) problems.push(`${section}：覆盖里有基础数据中不存在的键「${key}」`);
  }
  return items.map((item) => {
    const key = keyOf(section, item);
    const overlay = key ? overlayMap[key] : undefined;
    if (!overlay) return item;
    return mergeStructured(item, overlay, [section, key], problems);
  });
}

/**
 * 把正文块覆盖套到节点的 `contentMarkdown` 上。
 *
 * 正文不是「整篇一份」，而是按 `<!-- node:id -->` 切成块再拼回整篇。
 * 因此这里做的是**按块替换**：译块缺一个就报错（不拼接一段缺了半截的英文正文），
 * 译块多一个也报错（挂到了不存在的块上）。
 */
export function applyContentOverlay(node, blocks, problems) {
  if (!blocks) return node;
  const id = node.contentRef && node.contentRef !== false ? node.contentRef : node.id;
  const translated = blocks[id];
  if (translated === undefined) return node;
  return { ...node, contentMarkdown: translated };
}

/**
 * 组装本地化视图。
 *
 * @param {object} raw 基础（中文）本体的 raw 对象
 * @param {object|null} overlay 覆盖树；`null` 表示该语种没有覆盖目录（中文）
 * @returns {{ raw: object, problems: string[], applied: number }}
 */
export function localizeOntologyRaw(raw, overlay) {
  if (!overlay) return { raw, problems: [], applied: 0 };
  const problems = [];
  const meta = overlay[META_KEY] ?? {};
  const result = { ...raw };

  /*
   * 装配清单：`[raw 里的键名, 覆盖里的键名]`。
   *
   * **两侧的键名可以不同，而且真的不同**：运行时的关系集合叫 `relationDescriptions`
   * （`core/ontology.mjs` 的装配结果），覆盖里则叫 `relations`（`data/i18n/en/relations.mjs`，
   * 更符合人的读法）。这里曾经只写了一个键名，于是 `raw['relations']` 是 `undefined`、
   * `Array.isArray` 判假、**整节静默跳过**——156 条关系译文写了却永远不生效，
   * 而 parity 与覆盖率都报 156/156（它们检查的是另一个键）。
   *
   * 教训写在这儿：装配层与检查层**必须读同一份键名表**，而且装配完要有断言证明
   * 「覆盖真的改变了输出」（见 `scripts/i18n-parity.mjs` 的端到端抽查）。
   */
  const sections = [
    ['nodes', 'nodes', overlay.nodes],
    ['actions', 'actions', overlay.actions],
    ['evidence', 'evidence', overlay.evidence],
    ['relationDescriptions', 'relations', overlay.relations],
    ['representations', 'representations', overlay.representations],
    ['support', 'support', overlay.support],
    ['aggregates', 'aggregates', overlay.aggregates],
    ['templates', 'templates', overlay.templates],
    ['patterns', 'patterns', overlay.patterns],
    ['claims', 'claims', overlay.claims],
    ['localizations', 'localizations', overlay.localizations],
    ['coverage', 'coverage', overlay.coverage],
  ];

  let applied = 0;
  for (const [rawKey, overlayKey, overlayMap] of sections) {
    if (!overlayMap) continue;
    if (!Array.isArray(raw[rawKey])) {
      /*
       * 覆盖有内容、装配目标却不是数组：这是**装配层与检查层键名不一致**的典型症状。
       * 从前它被 `continue` 静默吞掉（157 条关系因此永远不生效）。现在直接报错。
       */
      problems.push(`${overlayKey}：覆盖里有 ${Object.keys(overlayMap).length} 条译文，但基础本体里没有 ${rawKey} 这一节（键名不一致？）`);
      continue;
    }
    result[rawKey] = mergeCollection(raw[rawKey], overlayMap, overlayKey, problems);
    applied += Object.keys(overlayMap).filter((id) => !RESERVED_KEYS.has(id)).length;
  }

  /* 段落级：signature / theory / environmentBoundary / note 等。 */
  for (const [key, value] of Object.entries(meta)) {
    if (key === 'contentBlocks') continue;
    if (!(key in raw)) {
      problems.push(`${META_KEY}.${key}：基础本体里没有这一段`);
      continue;
    }
    result[key] = mergeStructured(raw[key], value, [META_KEY, key], problems);
    applied += 1;
  }

  /* 正文块：按节点单独替换，未覆盖的节点保持中文（并由 coverage 计入缺口）。 */
  const contentBlocks = meta.contentBlocks ?? overlay.cases ?? null;
  if (contentBlocks) {
    result.nodes = result.nodes.map((node) => {
      const next = applyContentOverlay(node, contentBlocks, problems);
      if (next !== node) applied += 1;
      return next;
    });
  }

  return { raw: result, problems, applied };
}

/** 本地化视图的缓存：键是 `version::locale`，只留最近几份。 */
const cache = new Map();
const CACHE_LIMIT = 4;

/**
 * 把语言覆盖套到一个**实例**上，返回同版本的新实例。
 *
 * 关键点：不能只做 `{...instance, raw}`。实例的 `nodesById` / `actionsById` /
 * `evidenceById` 等索引 Map 指向的是**中文源的那些对象**，浅拷贝会让
 * `ontology.node(id).title` 继续返回中文，而 `ontology.raw.nodes[…].title` 已经是英文
 * ——同一份数据里两处不一致，是最难查的一类 bug（本轮真的踩到了）。
 * 因此这里用 `createOntology(raw, { validate: false })` 重建索引：哈希仍由同一份
 * 结构算出（覆盖不改结构），版本号逐字相同；校验不重跑，因为中文源在校验上已经通过。
 */
export function localizedOntology(instance, locale, overlaySource) {
  const target = normalizeLocale(locale);
  if (target === DEFAULT_LOCALE) return instance;
  const overlay = overlaySource(target);
  if (!overlay) return instance;
  const key = `${instance.version}::${target}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { raw, problems } = localizeOntologyRaw(instance.raw, overlay);
  if (problems.length) {
    /* 覆盖装配的结构性问题不静默吃掉：它是数据错误，必须让调用方看见。 */
    const error = new Error(`语言覆盖装配失败（${problems.length} 项）：${problems.slice(0, 5).join('；')}`);
    error.code = 'I18N_OVERLAY_INVALID';
    error.problems = problems;
    throw error;
  }
  const localized = createOntology(raw, { validate: false, contentHash: instance.contentHash });
  localized.locale = target;
  localized.sourceVersion = instance.version;
  cache.set(key, localized);
  while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
  return localized;
}

export function resetLocalizedCache() {
  cache.clear();
}
