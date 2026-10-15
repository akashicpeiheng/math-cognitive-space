/**
 * 起始节点的派生层（2026-10 加）。
 *
 * ## 定义（先给自然语言，再给判据）
 *
 * **起始节点**是「按已登记的前置关系看，现在已经可以直接开始」的节点。
 * 一份档案下的单元级节点 n 是起始节点，当且仅当三条同时成立：
 *
 * 1. **尚未确认**：n 不在 θ.known 里（已经确认过的节点不需要「开始」）；
 * 2. **登记的前置都已确认**：
 *    - 每条指向 n 的 `hardPrereq` 关系的**来源**都在 θ.known 里（硬前置是「不用它就定义不出来 /
 *      推不下去」，因此必须逐条满足，不能任选）；
 *    - 并且要么**没有任何行动能产出 n**（背景接口就是这一类：它只能由学习者自己声明），
 *      要么**存在一个**能产出 n 的行动，其**全部输入**都在 θ.known 里。
 *      取「存在」是因为同一节点常有多条引入路径（OR），任一条走得通就够；
 * 3. **不是话题级条目**：`granularity !== 'topic'`。话题是一条学习线索的名字，不是可独立认知的
 *    单元，本来就不参与前置计算（见 `network.ts` 的 `THREAD_LAYER`）。
 *
 * ## 三条纪律
 *
 * 1. **只读**：输入是本体的投影（节点 / 行动 / 关系）与 θ（E 的派生），本模块不写任何东西，
 *    也不产生百分比或「可学度」——判据只有「已确认 / 未确认」这一条可追溯的事实。
 * 2. **每条都要能说出依据**：返回值带 `actionId` / `actionTitle` / `requires` / `hardPrereqs`，
 *    界面据此写明「为什么它是起始节点」，而不是丢一个高亮。
 * 3. **判据就是已登记的数据**，不额外补常识。因此若某条行动契约漏登记了输入，
 *    这个节点会**过早**成为起始节点（`README.md`「如实登记的边界」里记着
 *    `a-dg:inverse` 那条漏登记的实例）。这不是本模块能修的错，但必须能被看见：
 *    界面与文档都如实写明这条边界。
 *
 * ## 与 `learning.ts` 的 `ready` 的关系
 *
 * `ready`（「现在可以新学」）是**只看行动契约**的宽松口径，用在学习概览；
 * 本模块是**契约 + 硬前置**的严格口径，用在网络视图的起始节点。
 * 两者的差集不是噪声：它正是「契约齐了，但硬前置还差」的节点——`blocked` 里逐条给出。
 *
 * ## 判据的唯一实现与一处修好的边界（2026-10）
 *
 * 判据本体是下面导出的 `isStartableUnit`：本模块与 `direction.ts`（学习方向的选项表）都调它。
 * 修掉的一处错误是**把「输入能不能在本体里解析」误用成「输入是不是单元级」**：
 * 以**话题级条目**为输入的契约因此被判成「输入为空」，那 10 个节点（`rudin:set-function` 等）
 * 会在空白档案下冒充起点。现在两个集合分开：`resolvable`（全部节点）管「算不算数」，
 * `unitIds`（单元）管「它自己是不是可独立认知的单元」；修好后空白档案下的起始节点仍是 8 个
 * （它们恰好都不是那一类），但 `blocked` 的名单因此更准。
 */

import type { GraphAction, GraphRelation } from './learning';
import type { NodeSummary } from './types';
/*
 * 硬前置关系的种类名收在 `hard-prereq-closure.ts` 一处（同一条关系的另一处用法：从某个节点
 * 往回收集它的全部硬前置）。这里 import 进来自己用，并**再导出**保持既有调用方的 import 路径
 * 不变——两处各写一个字面量才是真正会漂的东西。
 *
 * 带 `.ts` 后缀：这个文件被 node 测试直接 import（`tests/starting-nodes.test.mjs`），
 * 而 node 的类型剥离不做扩展名补全（与 `network.ts` 的 `./relation-visual.ts` 同一条理由）。
 */
import { HARD_PREREQ_KIND } from './hard-prereq-closure.ts';
export { HARD_PREREQ_KIND };

export interface StartingNode {
  node: string;
  title: string;
  /**
   * 它是哪一类起始节点：
   * - `root`：没有任何行动能产出它（背景接口），只能由学习者自己声明；
   * - `satisfied`：有产出行动，且它的前置已全部确认。
   */
  kind: 'root' | 'satisfied';
  /** 产出它的那个行动；`root` 为 null。 */
  actionId: string | null;
  actionTitle: string | null;
  /** 引入它的行动的全部输入（都已确认）——这就是「已学过的前置」。 */
  requires: string[];
  /** 指向它的硬前置关系的来源节点（都已确认）。 */
  hardPrereqs: string[];
}

export interface BlockedStartingNode {
  node: string;
  title: string;
  /** 硬前置里尚未确认的来源。 */
  missingHardPrereqs: string[];
  /** 最好的那条引入路径所缺的输入（按缺失最少挑；没有产出行动则为空数组）。 */
  missingInputs: string[];
  actionId: string | null;
}

export interface StartingNodeReport {
  /** 起始节点，按本体里的登记顺序（`nodes` 数组序）排列，因此两次调用结果逐字相同。 */
  entries: StartingNode[];
  byId: Map<string, StartingNode>;
  /** 只差前置的节点：用来回答「为什么它还不是起始节点」，不当作起始节点。 */
  blocked: BlockedStartingNode[];
  /** θ.known 的条数（同一节点确认两次算一条）。 */
  knownCount: number;
  /** 因为「话题级条目不参与前置计算」而被排除的数量，如实体现在界面上。 */
  threadExcluded: number;
  /** 本体里的节点总数。 */
  total: number;
}

export interface StartingNodeInput {
  nodes: NodeSummary[];
  actions: GraphAction[];
  relations: GraphRelation[];
  /** θ：只用到 `known`（已确认可用的节点）。为 null 时按「从未指定」处理。 */
  theta: { known: Array<{ node: string }> } | null;
}

/** 硬前置关系的种类名。见文件顶部：常量与再导出的说明。 */

const isThread = (node: NodeSummary) => node.granularity === 'topic';

/** 只用到「节点 id」的视图：`direction.ts` 用同一份判据跑上千次，不需要完整节点。 */
export interface NodeLike { id: string; granularity?: 'unit' | 'topic' }

/** θ 的最小形状：判据只看 `known`。 */
export interface ThetaKnownLike { known: Array<{ node: string }> }

/**
 * 「学它需要什么」的判据上下文。
 *
 * - `resolvable` 是**能在本体里解析**的节点集合（全部节点，含话题级条目）：
 *   它决定「一条契约输入算不算数」。悬空引用（契约里写了已不存在的节点）不算数。
 *   **不要把「可解析」与「是单元」混起来**：输入可以是一条话题级条目——那仍然是一个
 *   本体里真实存在的节点，缺了它这条契约就跑不起来。这里曾经错用 `unitIds`，后果是
 *   以话题为输入的契约被判成「输入为空」，那些节点从空白档案起就变成起始节点（实测 10 个）。
 * - `unitIds` 只回答「它是不是可独立认知的单元」，用来排除话题级条目本身。
 * - `hardIn` 是「指向某节点的硬前置来源」（AND，按登记顺序）；
 *   `producers` 是「产出某节点的行动」（OR，任一条走得通即可）。
 */
export interface StartableContext {
  /** 能在本体里解析的节点（含话题级条目）。 */
  resolvable: ReadonlySet<string>;
  /** 单元级节点（不含话题级条目）。 */
  unitIds: ReadonlySet<string>;
  hardIn: ReadonlyMap<string, readonly string[]>;
  producers: ReadonlyMap<string, readonly GraphAction[]>;
}

/**
 * 单元级节点 n 在状态 `state` 下是否**可用**（= 已经是起始节点）。
 *
 * **这是判据的唯一实现**：`deriveStartingNodes`（起始节点徽标、网络推荐）与
 * `direction.ts`（学习方向的选项表与排序）都调用它。两处各写一份的话，
 * 「我的学习」与「知识网络」迟早会对同一个学习者说两套话。
 *
 * 三条同时成立：
 * 1. n 是单元级节点、且不在 `state` 里（已经确认的不需要「开始」）；
 * 2. 指向 n 的每条硬前置的来源都在 `state` 里（AND）；
 * 3. n 要么没有任何产出行动，要么存在一条产出行动，其**全部可解析的输入**都在 `state` 里。
 *    输入以**节点**为单位，不是「某个节点的某个资源」。
 */
export function isStartableUnit(nodeId: string, ctx: StartableContext, state: ReadonlySet<string>): boolean {
  if (!ctx.unitIds.has(nodeId)) return false;
  if (state.has(nodeId)) return false;
  for (const source of ctx.hardIn.get(nodeId) ?? []) if (!state.has(source)) return false;
  const produced = ctx.producers.get(nodeId) ?? [];
  if (produced.length === 0) return true;
  for (const action of produced) {
    let ok = true;
    for (const input of action.inputs) {
      // 悬空输入（指向本体里不存在的节点）视为已满足：与 `learning.ts` 的过滤同源。
      if (!ctx.resolvable.has(input.node) || state.has(input.node)) continue;
      ok = false;
      break;
    }
    if (ok) return true;
  }
  return false;
}

/**
 * 派生起始节点。
 *
 * 复杂度：一次遍历行动建索引 + 一次遍历节点，O(|行动| + |节点|·每条节点的入边)。
 * 232 节点 / 216 行动下是常数级开销，可以随渲染同步算（调用方仍应 memo）。
 */
export function deriveStartingNodes({ nodes, actions, relations, theta }: StartingNodeInput): StartingNodeReport {
  const known = new Set(theta?.known.map((entry) => entry.node) ?? []);
  const order = new Map(nodes.map((node, index) => [node.id, index]));
  const titles = new Map(nodes.map((node) => [node.id, node.title]));

  // 产出某节点的行动（一个节点可能有多条引入路径）。
  const producers = new Map<string, GraphAction[]>();
  for (const action of actions) {
    for (const output of action.outputs) {
      if (!order.has(output.node)) continue;
      const list = producers.get(output.node);
      if (list) list.push(action);
      else producers.set(output.node, [action]);
    }
  }

  // 指向某节点的硬前置来源（AND：全部都要确认）。
  const hardIn = new Map<string, string[]>();
  for (const relation of relations) {
    if (relation.kind !== HARD_PREREQ_KIND) continue;
    if (!order.has(relation.to) || !order.has(relation.from)) continue;
    const list = hardIn.get(relation.to);
    if (list) list.push(relation.from);
    else hardIn.set(relation.to, [relation.from]);
  }

  const entries: StartingNode[] = [];
  const blocked: BlockedStartingNode[] = [];
  let threadExcluded = 0;

  /*
   * 判据的上下文只建一次。下面每个节点的**裁决**一律走 `isStartableUnit`
   * （判据的唯一实现），这里算的 `hard` / `missing*` / `best` 只是**给界面看的依据**——
   * 「缺谁」这类细节不能反过来变成第二套判据，否则两处迟早漂开。
   *
   * 两个集合各司其职，**不能混**：
   * - `resolvable` = 全部节点（含话题级条目）：回答「一条契约输入算不算数」；
   * - `unitIds` = 单元级节点：回答「它自己算不算可独立认知的单元」。
   * 混淆的后果是把「以话题为输入的契约」判成「输入为空」，那些节点会从空白档案起
   * 就变成起始节点。与 `direction.ts`、`learning.ts` 三处同源。
   */
  const resolvable = new Set(order.keys());
  const unitIds = new Set(nodes.filter((node) => !isThread(node)).map((node) => node.id));
  const ctx: StartableContext = { resolvable, unitIds, hardIn, producers };

  for (const node of nodes) {
    if (isThread(node)) {
      // 话题级条目连「是不是起始节点」都不判：它不参与前置计算。
      if (!known.has(node.id)) threadExcluded += 1;
      continue;
    }
    if (known.has(node.id)) continue;

    const hard = hardIn.get(node.id) ?? [];
    const missingHardPrereqs = hard.filter((id) => !known.has(id));
    const produced = producers.get(node.id) ?? [];
    const startable = isStartableUnit(node.id, ctx, known);

    if (produced.length === 0) {
      // 没有任何行动能产出它：只能由学习者自己声明（背景接口即此类）。
      if (!startable) {
        blocked.push({
          node: node.id,
          title: node.title,
          missingHardPrereqs,
          missingInputs: [],
          actionId: null,
        });
        continue;
      }
      entries.push({
        node: node.id,
        title: node.title,
        kind: 'root',
        actionId: null,
        actionTitle: null,
        requires: [],
        hardPrereqs: hard,
      });
      continue;
    }

    /*
     * 有产出行动：挑**缺得最少**的那条路径。
     * 与 `learning.ts` 的 `ready` 同一套取舍（满足优先、再看缺失条数），
     * 这样界面上「还差什么」两处说的是同一件事。
     */
    let best: { action: GraphAction; missing: string[] } | null = null;
    for (const action of produced) {
      const requires = action.inputs.map((input) => input.node).filter((id) => order.has(id));
      const missing = requires.filter((id) => !known.has(id));
      if (!best || missing.length < best.missing.length) best = { action, missing };
      if (missing.length === 0) break;
    }

    if (startable) {
      entries.push({
        node: node.id,
        title: node.title,
        kind: 'satisfied',
        actionId: best?.action.id ?? produced[0].id,
        actionTitle: best?.action.title ?? produced[0].title,
        /*
         * `requires` 只保留**能在本体里解析**的输入：与 `learning.ts` 的 `ready` 同一口径。
         * 悬空引用（契约里写了一个已不存在的节点）不该出现在「已确认的前置」这句话里，
         * 否则依据文本会把一个查不到的 id 当成已学过的前置念出来。
         */
        requires: (best?.action ?? produced[0]).inputs.map((input) => input.node).filter((id) => order.has(id)),
        hardPrereqs: hard,
      });
      continue;
    }

    blocked.push({
      node: node.id,
      title: node.title,
      missingHardPrereqs,
      missingInputs: best?.missing ?? [],
      actionId: best?.action.id ?? null,
    });
  }

  /*
   * 顺序按本体里的登记顺序（`nodes` 的数组序 = manifest 的装配序：背景 → 四案例 → dg → 教材）。
   * 不用字典序：`bg:` 会排到最前、案例之间打散，读起来与站点的案例编排不一致；
   * 也不用「度数」之类会随视图变化的量——起始节点是**相对档案**的属性，不该随视图抖动。
   */
  entries.sort((a, b) => (order.get(a.node) ?? 0) - (order.get(b.node) ?? 0));
  blocked.sort((a, b) => (order.get(a.node) ?? 0) - (order.get(b.node) ?? 0));

  return {
    entries,
    byId: new Map(entries.map((entry) => [entry.node, entry])),
    blocked,
    knownCount: known.size,
    threadExcluded,
    total: nodes.length,
  };
}

/**
 * 起始节点集合的纯 id 视图：推荐逻辑、画布标记、图例计数都用它。
 * 单独导出是为了让调用方不必到处 `.map((entry) => entry.node)`。
 */
export function startingNodeIds(report: StartingNodeReport): Set<string> {
  return new Set(report.entries.map((entry) => entry.node));
}

/**
 * 一句话依据（给提示与验收读）：说清「凭什么说它现在可以开始」。
 *
 * 中文逐字固定，验收直接比对；英文只换措辞，不动依据本身。
 * 这里刻意**不出现「掌握」**：判据是「已确认可用」这条外部声明，不是本站测出来的能力。
 *
 * `lead`（默认 true）控制要不要带「起始节点：」这个前缀：
 * - 卡片 `<title>`、列表项的 `title` 用带前缀的版本——它是独立的一句话，必须自己说明身份；
 * - 详情面板里**已经有**一枚「起始节点」徽标，再念一遍前缀就是重复，那里传 `lead: false`。
 */
export function startingNodeBasis(
  entry: StartingNode,
  titleOf: (id: string) => string,
  locale: 'zh' | 'en' = 'zh',
  { lead = true }: { lead?: boolean } = {},
): string {
  const requires = entry.requires.map(titleOf).join(locale === 'en' ? ', ' : '、');
  const hard = entry.hardPrereqs.map(titleOf).join(locale === 'en' ? ', ' : '、');
  if (locale === 'en') {
    const prefix = lead ? 'Starting node: ' : '';
    if (entry.kind === 'root') {
      return `${prefix}no action produces it, so it is declared by you directly — there is no registered prerequisite to wait for.`;
    }
    const parts = [`every input of the action “${entry.actionTitle}”${requires ? ` (${requires})` : ''} is confirmed`];
    if (hard) parts.push(`and all registered hard prerequisites (${hard}) are confirmed`);
    return `${prefix}${parts.join(', ')}. This says the registered prerequisites are already in your profile — not that the site measured your ability.`;
  }
  const prefix = lead ? '起始节点：' : '';
  if (entry.kind === 'root') {
    return `${prefix}没有任何行动能产出它，只能由你直接声明；没有需要等待的登记前置。`;
  }
  const head = `${prefix}行动「${entry.actionTitle}」的全部输入${requires ? `（${requires}）` : ''}都已确认`;
  const tail = hard ? `，指向它的硬前置（${hard}）也已全部确认。` : '。';
  return `${head}${tail}依据是你档案里的确认记录，不是本站测出的能力。`;
}
