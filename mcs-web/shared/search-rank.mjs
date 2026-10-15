/**
 * 节点检索的**相关性排序**（2026-10-12 加）。
 *
 * ## 它修的是什么
 *
 * 用户报的：在知识网络的「全部节点」面板里搜「紧」，前几条是
 * 「广义 Stokes 定理」「单位分解」，真正相关的「连续性与紧致性」排到后面去。
 *
 * 原因不是筛选错，是**排序错**：检索在四个字段上做子串匹配
 * （`id` / `title` / `summary` / 别名），命中之后却按 `id` 的字典序排。
 * 于是「紧」字出现在**摘要**里的节点（`dg:generalized-stokes-theorem`，
 * 摘要讲紧支撑）会排在标题就叫「连续性与紧致性」的节点前面——
 * 用户看到的是「搜出来的东西好像不相关」。
 *
 * ## 排序规则（一个打分函数，特征都是**可复述**的）
 *
 * | 顺序 | 特征 | 记号 | 为什么这样定 |
 * |---|---|---|---|
 * | 1 | **命中字段** | 标题 +1000 > 别名 +700 > id +400 > 只有摘要命中 −350 | 标题是「这个对象叫什么」；摘要是解释，用户按名字搜 |
 * | 2 | **命中的完整度** | 整串相等 +100 > 从头匹配 +50 > 子串 +0 | 搜「紧」时「紧致性」比「不紧致」更像答案 |
 * | 3 | **命中位置** | −min(位置, 60)，另 **id 命中每次 −30** | 位置越靠前越可能是词首；id 是记号线，命中它通常是巧合 |
 * | 4 | **连续性** | 逐字相邻命中 +每对 16（上限 48） | 搜「紧致」时「紧致性」应当赢过「紧…致」这种散开命中 |
 * | 5 | 并列 | 按 id 字典序 | **确定性**：同一份数据两次调用逐字相同（界面不会因为重算而抖） |
 *
 * **为什么用「先字段、再加减分」而不是逐条 if 排序**：字段是**类别**，类别之间不该被位置或连续性翻盘
 * （标题匹配永远该赢过摘要匹配）；而类别**之内**的差别（整串 / 前缀 / 位置 / 连续）用可加的分数表达最清楚。
 * 界面上给出的理由与这里的分档一一对应（见 `hitLabel`）。
 *
 * ## 一处实现，两端共用
 *
 * 服务端（`server/api.mjs` 的 `/ontology/nodes`）与前端（知识网络「全部节点」面板）都走这一条规则：
 * - 服务端用的是这个文件；
 * - 前端不能用它（`web/src` 不引 `shared/*.mjs`，见 `web/src/i18n/locales.ts` 文件头的说明），
 *   因此有一份**等价实现** `web/src/search-rank.ts`，由
 *   `tests/search-rank.test.mjs` 的「两处逐字一致」断言钉住。
 *
 * 与「筛出来的东西不能变」这条既有纪律的关系：排序**只改次序，不改集合**——
 * 命中集合仍然由原来的四字段子串匹配给出（前后端各一份，同样由 parity 测试钉住）。
 */

/** 命中字段的权重（字段是类别，类别之间不互相翻盘）。 */
export const HIT_FIELD_BONUS = Object.freeze({
  /** 标题整串或子串命中。 */
  title: 1000,
  /** 别名（被合并登记里的旧名字）命中——仍然是「名字」。 */
  alias: 700,
  /** id 命中（`dg:generalized-stokes-theorem` 这类记号线）。 */
  id: 400,
  /** 只有摘要命中：**负分**——它不是名字，只是解释里出现过这个词。 */
  summary: -350,
});

/** 命中完整度的权重。 */
export const HIT_SHAPE_BONUS = Object.freeze({
  exact: 100,
  prefix: 50,
  substring: 0,
});

/** id 命中时的每次扣分：记号线上的巧合应当让位。 */
export const HIT_ID_PENALTY = 30;
/** 位置扣分的上限（位置 60 之后不再更差）。 */
export const HIT_POSITION_CAP = 60;
/** 相邻命中的每对加分与上限。 */
export const HIT_ADJACENT_BONUS = 16;
export const HIT_ADJACENT_CAP = 48;

const scalar = (value) => String(value ?? '').toLowerCase();

/**
 * 在单个字段里找一个子串的**最好**一次命中。
 *
 * 返回 `null`（没命中）或 `{ index, adjacent }`：`index` 是命中位置，
 * `adjacent` 是「逐字相邻的对数」（散开命中少、连续命中多）。
 * 取**所有**出现里分数最高的那一次（不是第一次）——第一次出现可能在很后面，
 * 而最后一次出现可能正好是词首。
 */
function bestMatch(field, needle) {
  if (!field || !needle) return null;
  let best = null;
  let from = 0;
  for (;;) {
    const index = field.indexOf(needle, from);
    if (index === -1) break;
    const adjacent = needle.length - 1;
    const score = -Math.min(index, HIT_POSITION_CAP) + Math.min(adjacent, HIT_ADJACENT_CAP / HIT_ADJACENT_BONUS) * HIT_ADJACENT_BONUS;
    if (!best || score > best.score) best = { index, adjacent, score };
    from = index + 1;
  }
  return best;
}

/**
 * 给一个节点与一个检索词打分。
 *
 * 字段顺序就是优先级：标题 → 别名 → id → 摘要。**前一个字段命中就不再往后看**
 * （标题命中时摘要里的位置与连续性都不该参与比较）。
 */
export function scoreNode(node, rawQuery) {
  const query = scalar(rawQuery).trim();
  if (!query) return { score: 0, hit: null, index: 0, adjacent: 0 };
  if (!node) return { score: 0, hit: null, index: 0, adjacent: 0 };

  const title = scalar(node.title);
  const aliases = Array.isArray(node.alsoKnownAs) ? node.alsoKnownAs.map(scalar) : [];
  const id = scalar(node.id);
  const summary = scalar(node.summary);

  const titleMatch = bestMatch(title, query);
  if (titleMatch) {
    const shape = title === query ? 'exact' : title.startsWith(query) ? 'prefix' : 'substring';
    return {
      score: HIT_FIELD_BONUS.title + HIT_SHAPE_BONUS[shape] - Math.min(titleMatch.index, HIT_POSITION_CAP),
      hit: 'title',
      index: titleMatch.index,
      adjacent: titleMatch.adjacent,
    };
  }

  let aliasBest = null;
  for (const alias of aliases) {
    const match = bestMatch(alias, query);
    if (!match) continue;
    if (!aliasBest || match.score > aliasBest.score) aliasBest = { ...match, alias };
  }
  if (aliasBest) {
    const shape = aliasBest.alias === query ? 'exact' : aliasBest.alias.startsWith(query) ? 'prefix' : 'substring';
    return {
      score: HIT_FIELD_BONUS.alias + HIT_SHAPE_BONUS[shape] - Math.min(aliasBest.index, HIT_POSITION_CAP),
      hit: 'alias',
      index: aliasBest.index,
      adjacent: aliasBest.adjacent,
    };
  }

  const idMatch = bestMatch(id, query);
  if (idMatch) {
    const shape = id === query ? 'exact' : id.startsWith(query) ? 'prefix' : 'substring';
    return {
      score: HIT_FIELD_BONUS.id + HIT_SHAPE_BONUS[shape] - Math.min(idMatch.index, HIT_POSITION_CAP)
        - (idMatch.index + idMatch.adjacent) * HIT_ID_PENALTY,
      hit: 'id',
      index: idMatch.index,
      adjacent: idMatch.adjacent,
    };
  }

  const summaryMatch = bestMatch(summary, query);
  if (summaryMatch) {
    return {
      score: HIT_FIELD_BONUS.summary - Math.min(summaryMatch.index, HIT_POSITION_CAP),
      hit: 'summary',
      index: summaryMatch.index,
      adjacent: summaryMatch.adjacent,
    };
  }

  return { score: 0, hit: null, index: 0, adjacent: 0 };
}

/**
 * 一个节点是否命中检索词（**集合**由这里决定，排序不改它）。
 *
 * 与 `server/api.mjs` 的筛选条件逐字一致：id / 标题 / 摘要 / 别名四个字段的子串匹配。
 */
export function matchesQuery(node, rawQuery) {
  const query = scalar(rawQuery).trim();
  if (!query) return true;
  if (!node) return false;
  const haystack = `${node.id} ${node.title} ${node.summary} ${(node.alsoKnownAs ?? []).join(' ')}`;
  return scalar(haystack).includes(query);
}

/**
 * 排序：分数降序，并列时按 id 字典序（**确定性**）。
 *
 * 返回新数组，不改输入；每个条目带上 `score` 与 `hit`（界面据此把「为什么它在这里」写出来）。
 */
export function rankNodes(nodes, rawQuery) {
  const query = scalar(rawQuery).trim();
  if (!query) return [...nodes];
  return nodes
    .map((node) => ({ node, ...scoreNode(node, query) }))
    .sort((a, b) => b.score - a.score || String(a.node?.id ?? '').localeCompare(String(b.node?.id ?? ''), 'en'))
    .map((entry) => entry.node);
}
