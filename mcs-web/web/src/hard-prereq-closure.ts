/**
 * 硬前置闭包（2026-10 加）：从一个节点出发，收集它**全部硬前置**——直接的和间接的。
 *
 * ## 为什么单独一层
 *
 * 「硬前置」在数据里是一条有方向的登记关系（`kind = 'hardPrereq'`，`from` 是前置、
 * `to` 是依赖它的节点）。网络上「这个节点需要先会什么」的答案因此是一张**子图**，
 * 不是一条边：`top:topological-manifold` 的直接前置是同胚与坐标卡，而坐标卡的前置里
 * 又有拓扑空间。要把「一键加入全部硬前置」做得可核对，闭包算法必须能被单元测试直接调用，
 * 而不是写在组件的回调里——因此它落在这个叶子模块（只 import 类型，不碰 React）。
 *
 * ## 三条约定
 *
 * 1. **方向**：只沿 `to → from` 走（谁指向它，谁就是它的前置）。反向的边（一般化、应用、
 *    跨域接口）不进来——那些是「由它出发能到哪」，不是「学它之前要先会什么」。
 * 2. **确定性**：按关系的登记顺序做广度优先，同一层的顺序等于它们在数据里出现的顺序。
 *    同一份数据两次调用结果逐字相同（有测试钉住），视图不会因为重算而抖。
 * 3. **不静默截断**：节点很多时按 `limit` 停下，并在返回值里把 `truncated` 标出来，
 *    界面据此如实说明「只加了前 N 个」，而不是假装加全了。
 */

/** 关系的最小形状：这里只用到方向与种类。 */
export interface HardPrereqRelation {
  kind: string;
  from: string;
  to: string;
}

/** 闭包里的一个节点。 */
export interface PrereqClosureEntry {
  node: string;
  /** 1 = 直接硬前置，2 = 前置的前置…… */
  depth: number;
  /** 直接把它当前置的那些节点（同一节点可能有多条来源）。 */
  via: string[];
}

export interface PrereqClosure {
  /** 起点：它不是自己的前置，因此不出现在 `entries` 里。 */
  root: string;
  /** 全部硬前置，按深度、再按登记顺序排列。 */
  entries: PrereqClosureEntry[];
  /** 硬前置总深度（最远的一层）；没有硬前置时为 0。 */
  maxDepth: number;
  /** 撞到上限时为 true——界面必须如实说明，不假装加全了。 */
  truncated: boolean;
}

/** 硬前置关系的种类名。与 `starting-nodes.ts` 的同名常量指同一件事，收在这里免得散着写。 */
export const HARD_PREREQ_KIND = 'hardPrereq';

const DEFAULT_LIMIT = 500;

/**
 * 求一个节点的硬前置闭包。
 *
 * @param relations 全部语义关系（只用到 kind / from / to）
 * @param root      起点节点 id（它不是自己的前置，因此不出现在结果里）
 * @param options   `limit` 上限（默认 500；撞上限时 `truncated` 为 true，不静默截断）
 */
export function hardPrereqClosure(
  relations: readonly HardPrereqRelation[],
  root: string,
  options: { limit?: number } = {},
): PrereqClosure {
  const limit = options.limit ?? DEFAULT_LIMIT;

  /** 指向某节点的全部硬前置来源，按登记顺序。 */
  const parentsOf = new Map<string, string[]>();
  for (const relation of relations) {
    if (relation.kind !== HARD_PREREQ_KIND) continue;
    if (!relation.from || !relation.to || relation.from === relation.to) continue;
    const list = parentsOf.get(relation.to);
    if (list) list.push(relation.from);
    else parentsOf.set(relation.to, [relation.from]);
  }

  const depthOf = new Map<string, number>([[root, 0]]);
  const viaOf = new Map<string, string[]>();
  const entries: PrereqClosureEntry[] = [];
  let frontier = [root];
  let depth = 0;
  let truncated = false;

  while (frontier.length) {
    depth += 1;
    const next: string[] = [];
    for (const node of frontier) {
      for (const parent of parentsOf.get(node) ?? []) {
        const seen = depthOf.get(parent);
        if (seen !== undefined) {
          /*
           * 同一个节点在**同一层**里被第二次发现：把来源并进去。
           * `via` 的含义是「谁把它当前置」，不是唯一路径——两条来源都写下来，
           * 界面才能说清「它是从哪两条路一起要来的」。
           */
          const via = viaOf.get(parent);
          if (seen === depth && via && !via.includes(node)) via.push(node);
          continue;
        }
        if (entries.length >= limit) { truncated = true; continue; }
        depthOf.set(parent, depth);
        viaOf.set(parent, [node]);
        entries.push({ node: parent, depth, via: viaOf.get(parent) ?? [] });
        next.push(parent);
      }
    }
    frontier = next;
  }

  return {
    root,
    entries,
    maxDepth: entries.reduce((max, entry) => Math.max(max, entry.depth), 0),
    truncated,
  };
}

/**
 * 闭包里**还不在视图里**的那些（保持闭包的顺序）。
 *
 * 界面上的按钮要回答两个数字：一共有几个硬前置、其中还差几个没进视图。
 * 后者才是「一键加入」真正会加的数量——按钮文案写它，避免点下去发现什么都没变。
 */
export function missingFromClosure(closure: PrereqClosure, present: ReadonlySet<string>): string[] {
  return closure.entries.map((entry) => entry.node).filter((node) => !present.has(node));
}
