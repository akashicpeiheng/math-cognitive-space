/**
 * 按关系种类收集「与某节点直接相连的对象」（2026-10-23 加）。
 *
 * ## 为什么单独一个模块
 *
 * 硬前置闭包回答的是「学它之前必须先会什么」，只沿 `to → from` 走；而这里回答的是
 * 另一个问题：**「跟它登记了某一类关系的都有谁」**——对偶、放缩、应用、跨域等。
 * 这些关系的另一端没有「必须先会」的方向含义，两个方向都是相关对象：
 *
 * - `scaling`：一般端连着特化端，站在任一端都该能找到另一端；
 * - `duality`：对偶是配对关系，从哪一端看都成立；
 * - `application`：从工具看是「它应用在哪」，从例子看是「它是谁的应用」。
 *
 * 因此这里**双向收集**，与硬前置的**单向 + 传递**明确分开。算法要能被单元测试直接调用，
 * 所以放在这个叶子模块（不 import React，也不碰界面状态）。
 *
 * ## 三条约定
 *
 * 1. **直接相连**：只走一跳，不做传递闭包——「放缩对象」不是「放缩对象的放缩对象」；
 * 2. **去重且确定**：同一节点经同一关系的两个方向、或多条同类关系连进来，只出现一次；
 *    组内顺序按关系登记顺序，同一份数据两次调用逐字相同；
 * 3. **不猜种类**：数据里登记了哪种 `kind` 就返回哪种，未登记的种类名由界面按回退规则显示；
 *    `hardPrereq` 也照常返回（界面自己决定是否另用「一阶 / 全部」两项，而不是在这里特判）。
 */

/** 关系的最小形状：这里只用到种类与两端。 */
export interface RelationLink {
  kind: string;
  from: string;
  to: string;
}

/** 某一种关系下与起点直接相连的对象。 */
export interface RelationKindObjects {
  kind: string;
  /** 与 root 通过该种类关系直接相连的节点，去重、按关系登记顺序。root 自己不会出现在这里。 */
  nodes: string[];
}

/**
 * 按关系种类分组收集与 `root` 直接相连的节点。
 *
 * @param relations 全部登记关系（只用到 kind / from / to）
 * @param root      起点节点 id
 * @returns 每种关系一组；没有关系时返回空数组。组按首次出现的登记顺序排列。
 */
export function relationObjectsByKind(
  relations: readonly RelationLink[],
  root: string,
): RelationKindObjects[] {
  const groups = new Map<string, string[]>();
  for (const relation of relations) {
    if (!relation.kind || !relation.from || !relation.to) continue;
    if (relation.from === relation.to) continue;
    if (relation.from !== root && relation.to !== root) continue;
    const other = relation.from === root ? relation.to : relation.from;
    if (other === root) continue;
    const nodes = groups.get(relation.kind);
    if (!nodes) groups.set(relation.kind, [other]);
    else if (!nodes.includes(other)) nodes.push(other);
  }
  return [...groups].map(([kind, nodes]) => ({ kind, nodes }));
}
