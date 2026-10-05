import type { NodeSummary } from './types';
import { RELATION_LABELS, relationLabel } from './labels';

/**
 * 分面选项只从**实际存在的节点**里长出来，不从标签表里长。
 *
 * 这一条是被用户骂出来的：知识网络的「全部节点」悬浮框把 `CONSTRUCT_LABELS` 的 14 个键
 * 直接铺成下拉选项，而本体里只登记了 11 类构造——「项 / 定义 / 表征」三项**永远筛出 0 个节点**
 * （本体里既没有 `construct=Definition`，也没有 `role=Definition`；模板支持、数据没登记）。
 * 一个筛选选项只要可能给出空结果，就已经在骗人了。
 *
 * 因此这里分两份：
 * - `present`：真有的类别 + 计数，按数量降序，直接给筛选用；
 * - `absent`：模板里有、本体里空着的类别，**只用于如实说明**，绝不当作可选项。
 */
export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

export interface Facet {
  present: FacetOption[];
  absent: string[];
}

export function buildFacet(
  nodes: NodeSummary[],
  valuesOf: (node: NodeSummary) => string[],
  labelOf: (value: string) => string,
  declared: string[],
): Facet {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    for (const value of valuesOf(node)) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return {
    present: [...counts.entries()]
      .map(([value, count]) => ({ value, count, label: labelOf(value) }))
      .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value)),
    // 按标签表里声明的顺序列出空类别，便于和模板文档对照。
    absent: declared.filter((value) => !counts.has(value)).map((value) => labelOf(value)),
  };
}

/**
 * 「你搜的词是关系种类，不是节点类型」。
 *
 * 本体里 `analogy`（类比）只有 1 条关系、0 个节点；用户在节点列表里搜「类比」只会看到空列表，
 * 却看不出原因。命中关系种类时要给出条数与去处，而不是留一个 0。
 */
export function relationKindHint(keyword: string, byKind: Record<string, number> | null): string | null {
  const trimmed = keyword.trim();
  if (!trimmed) return null;
  const hit = Object.keys(RELATION_LABELS).find((kind) => (
    kind === trimmed || RELATION_LABELS[kind] === trimmed || kind.toLowerCase() === trimmed.toLowerCase()
  ));
  if (!hit) return null;
  const count = byKind?.[hit];
  const tail = typeof count === 'number'
    ? `本体里登记了 ${count} 条这种关系`
    : '本体里有这种关系';
  return `「${relationLabel(hit)}」是关系种类，不是节点类型，所以按节点筛只会是 0。${tail}：`
    + '去「知识网络」的「连接类型」面板打开它，或在研究台按关系复核。';
}
