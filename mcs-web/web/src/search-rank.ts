/**
 * 节点检索的相关性排序 —— **前端这一份与 `shared/search-rank.mjs` 等价**。
 *
 * ## 为什么有两份
 *
 * 规则只有一条，但两个调用方在不同的运行环境里：
 * - 服务端（`/ontology/nodes` 的 `q=`）直接用 `shared/search-rank.mjs`；
 * - 前端用这一份。**不能**让前端引 `shared/*.mjs`：`web/src/i18n/locales.ts` 的文件头
 *   记着这条踩过的坑——`tsconfig.include` 只有 `src` 与 `shared/types.d.ts`，
 *   引 `.mjs` 会同时绕开类型检查与打包器的依赖图约定（`tsc --noEmit` 把它当无类型模块）。
 *
 * 两份的差异由 `tests/search-rank.test.mjs` 的「两处逐字一致」断言钉住：
 * 同一批节点 + 同一批检索词，两边给出的**次序**必须逐字相同。规则改了只改一处就会红。
 *
 * ## 规则（与 `shared/search-rank.mjs` 的表逐条对应）
 *
 * 1. **命中字段**：标题 +1000 > 别名 +700 > id +400 > 只有摘要命中 −350
 *    （标题是「这个对象叫什么」，摘要是解释——用户按名字搜）；
 * 2. **命中完整度**：整串相等 +100 > 从头匹配 +50 > 子串 +0；
 * 3. **命中位置**：−min(位置, 60)；**id 命中每次都另扣 30**（记号线上的巧合该让位）；
 * 4. **连续性**：逐字相邻命中 +每对 16（上限 48）——「紧致性」该赢过「紧…致」；
 * 5. **并列**：按 id 字典序（确定性：同一份数据两次调用逐字相同）。
 *
 * 排序**只改次序，不改集合**：命中集合仍由四个字段的子串匹配决定，
 * 与服务端逐字一致（见 `tests/api.test.mjs` 的相关条目）。
 */

import type { NodeSummary } from './types';

/** 命中字段的权重（字段是类别，类别之间不互相翻盘）。 */
export const HIT_FIELD_BONUS = {
  title: 1000,
  alias: 700,
  id: 400,
  summary: -350,
} as const;

/** 命中完整度的权重。 */
export const HIT_SHAPE_BONUS = { exact: 100, prefix: 50, substring: 0 } as const;

/** id 命中时的每次扣分：记号线上的巧合应当让位。 */
export const HIT_ID_PENALTY = 30;
/** 位置扣分的上限（位置 60 之后不再更差）。 */
export const HIT_POSITION_CAP = 60;
/** 相邻命中的每对加分与上限。 */
export const HIT_ADJACENT_BONUS = 16;
export const HIT_ADJACENT_CAP = 48;

/** 命中的字段：界面据此写出「为什么它在这里」。 */
export type SearchHit = 'title' | 'alias' | 'id' | 'summary' | null;

export interface NodeScore {
  score: number;
  hit: SearchHit;
  /** 命中位置（0 起）。 */
  index: number;
  /** 逐字相邻的命中对数。 */
  adjacent: number;
}

const scalar = (value: unknown): string => String(value ?? '').toLowerCase();

/**
 * 在单个字段里找一个子串的**最好**一次命中（取所有出现里分数最高的那一次，
 * 不是第一次——第一次出现可能在很后面，而最后一次出现可能正好是词首）。
 */
function bestMatch(field: string, needle: string): { index: number; adjacent: number; score: number } | null {
  if (!field || !needle) return null;
  let best: { index: number; adjacent: number; score: number } | null = null;
  let from = 0;
  for (;;) {
    const index = field.indexOf(needle, from);
    if (index === -1) break;
    const adjacent = needle.length - 1;
    const score = -Math.min(index, HIT_POSITION_CAP)
      + Math.min(adjacent, HIT_ADJACENT_CAP / HIT_ADJACENT_BONUS) * HIT_ADJACENT_BONUS;
    if (!best || score > best.score) best = { index, adjacent, score };
    from = index + 1;
  }
  return best;
}

/** 命中字段的判定顺序：标题 → 别名 → id → 摘要（前一个命中就不再往后看）。 */
export function scoreNode(node: Pick<NodeSummary, 'id' | 'title' | 'summary' | 'alsoKnownAs'> | null | undefined, rawQuery: string): NodeScore {
  const query = scalar(rawQuery).trim();
  if (!query || !node) return { score: 0, hit: null, index: 0, adjacent: 0 };

  const title = scalar(node.title);
  const aliases = (node.alsoKnownAs ?? []).map(scalar);
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

  let aliasBest: { index: number; adjacent: number; score: number; alias: string } | null = null;
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

/** 一个节点是否命中检索词（与服务端筛选条件逐字一致）。 */
export function matchesQuery(node: Pick<NodeSummary, 'id' | 'title' | 'summary' | 'alsoKnownAs'> | null | undefined, rawQuery: string): boolean {
  const query = scalar(rawQuery).trim();
  if (!query) return true;
  if (!node) return false;
  return scalar(`${node.id} ${node.title} ${node.summary} ${(node.alsoKnownAs ?? []).join(' ')}`).includes(query);
}

/**
 * 命中理由的显示名（成对；中文是源语言）。
 *
 * 放在这里而不是页面里：理由是**排序规则的一部分**，两处（网络面板与对象列表）要说同一句话。
 */
export const HIT_LABELS: Record<Exclude<SearchHit, null>, { zh: string; en: string }> = {
  title: { zh: '标题命中', en: 'title match' },
  alias: { zh: '旧名命中（合并前的登记标题）', en: 'match on an earlier name (pre-merge registration title)' },
  id: { zh: 'id 命中', en: 'id match' },
  summary: { zh: '仅摘要命中（不是名字，只是解释里出现过）', en: 'summary only (not its name — the word merely appears in the explanation)' },
};

/** 一句话理由：界面把它写在条目上，用户不必猜「它为什么在这里」。 */
export function hitLabel(hit: SearchHit, locale: 'zh' | 'en' = 'zh'): string {
  if (!hit) return '';
  return HIT_LABELS[hit][locale];
}

/**
 * 排序：分数降序，并列时按 id 字典序（确定性）。返回新数组，不改输入。
 *
 * `hits` 取第一次出现的位置：界面用它把「命中的是哪个字段」写出来，
 * 不让用户对着一个「看起来不相关」的条目猜为什么它在列表里。
 */
export function rankNodes<T extends Pick<NodeSummary, 'id' | 'title' | 'summary' | 'alsoKnownAs'>>(
  nodes: T[],
  rawQuery: string,
): T[] {
  const query = scalar(rawQuery).trim();
  if (!query) return [...nodes];
  return nodes
    .map((node) => ({ node, ...scoreNode(node, query) }))
    .sort((a, b) => b.score - a.score || String(a.node?.id ?? '').localeCompare(String(b.node?.id ?? ''), 'en'))
    .map((entry) => entry.node);
}
