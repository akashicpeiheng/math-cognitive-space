/**
 * 学习方向与并行节点的排序（2026-10 加）。
 *
 * ## 它回答的那个问题
 *
 * 「现在可以开始」的节点在本体里是**一大片平权选项**：空白档案下 18 个，声明两条背景之后 22 个
 * （`GET /ontology/graph` 现场派生，见 `npm run check`）。挨个看这 22 个绿色徽标，
 * 等于没有方向——这不是内容缺失，是**排序依据缺失**。本模块补的就是这一层：
 *
 * > 把逻辑上可以并行的待学节点，按「我现在的方向」排成一个可以照做的次序，
 * > 并且每一步都说得清「凭什么先学它」。
 *
 * ## 三个概念（先给定义，再给判据）
 *
 * 1. **可用（startable）**：一份档案 θ 下的单元级节点 n 可用，当且仅当
 *    - n 没有被确认（θ.known 里没有它）；且
 *    - 每条指向它的 `hardPrereq` 关系的**来源**都已被确认（硬前置是 AND：不用它就定义不出来）；且
 *    - 要么**没有任何行动能产出 n**（背景接口只能由学习者自己声明），
 *      要么**存在一个**能产出 n 的行动，其**全部输入**都已被确认（同一节点常有多条引入路径，OR）。
 *
 *    这三条与 `starting-nodes.ts` 的起始节点判据**是同一份实现**（`isStartableUnit`）——
 *    本模块调用它，不另写一份。两处一旦漂开，界面就会对同一个学习者说两套话。
 *
 * 2. **前进层（level）**：把 θ.known 加上 n 之后，**新变成可用**的节点集合。
 *    只做一步，不做传递闭包。
 *    （为什么不看传递闭包：「确认它最终能让你学到多少」在本体上**没有区分度**——
 *    231 节点、118 条硬前置下，每个可用节点算出来的传递闭包都是 108。一步计数才有信息量。）
 *
 * 3. **方向核心（core）**：声明方向 g 的必需集合。从 g 出发，沿
 *    「指向它的硬前置」与「产出它的那条行动的最佳输入」（缺得最少的那条）反向收集到不动点。
 *    「最佳输入」与 `starting-nodes.ts` 挑产出路径的取舍一致（满足优先、再看缺失条数）。
 *
 * ## 排序判据（五条，逐条可复述；不用加权分数）
 *
 * 按**字典序**比较，不引入权重——权重会变成第二个「看起来科学但没有校准过」的东西：
 *
 * 1. **方向内优先**：`n ∈ core` 排在 `n ∉ core` 之前。这一条就是「按自己的需求和兴趣」的落点。
 * 2. **只能由你声明的优先**：没有产出行动的背景接口排在有产出行动的内容之前——
 *    它现在就能确认，而且实测常常是最高杠杆的一步。
 * 3. **学法偏好**（第四问，可选）：同在上一档时，先给「按你选的方式能走得更顺」的那一类
 *    （名单见 `MOOD_CONSTRUCTS`）。
 * 4. **新解锁多者优先**：确认 n 之后本体的**可用集合**扩大了几个（整数，只做一步）。
 * 5. **登记顺序**：前四项完全并列时按本体 `nodes` 数组序，保证两次调用逐字相同。
 *
 * 条款 4 的措辞纪律：它说的是「现在能用上它做出什么」，**不是「更重要」**，也不是难度。
 * 界面照抄 `optionBasis()` 生成的那句话，不许各写一句。
 *
 * ## 被迫 / 可选（让学习者知道自己在哪里真的能选）
 *
 * 记 `m = |core ∩ 可用|`（方向核心里有几个现在就能学）：
 *
 * | 档 | 判据 | 含义 |
 * |---|---|---|
 * | 被迫 | m ≤ 1 | 现在只有这一条通向方向；其余选项都不在这条路上。**照着做就对了**，这正是起点处的常态 |
 * | 可选 | m ≥ 2 | 这几条都能走，先走哪条不影响「能不能到」，只影响路上会顺手拿到什么 |
 *
 * 只有在「可选」档才谈得上「按兴趣分配」；「被迫」档如实说出来，比给一张假的选择表诚实。
 *
 * ## 边界（如实登记，不静默）
 *
 * - **判据就是已登记的数据，不补常识**。某条行动契约漏登记输入时，这个节点会**过早**变成可用
 *   （`starting-nodes.ts` 的文件头已写明这条已知边界，本模块继承它，不在这里修）。
 * - **契约里的悬空输入**（指向本体中不存在的节点）视为已满足，与 `learning.ts` 的过滤同源。
 * - **方向核心可能成环**。实测：`tensor:end-iso` 的核心在「行动输入 + 硬前置」口径下有环
 *   （`t-univ` 的输出同时又是它自己的输入）。这时 `core.unresolved` 列出拆不开的那几个，
 *   `core.levels` 里**不出现**它们，`truncated` 如实为 true —— 不伪造层号，也不假装一条通顺的路。
 * - **不给掌握度、不给难度、不给时长、不给百分比**。排序需要的东西只有上面四条。
 */

import type { GraphAction, GraphRelation } from './learning.ts';
import { isThreadEntry } from './learning.ts';
import { isStartableUnit, type StartableContext, type ThetaKnownLike } from './starting-nodes.ts';
import type { NodeSummary } from './types';

/**
 * 方向预览的步数上限（登记在 `data/design-values.mjs` 的 `direction-bounds`）。
 *
 * 预览不是承诺：它只是「如果一直按推荐走，接下来几步长什么样」。5 步是「一次坐下」的尺度，
 * 不是「这条路线一共多长」——路线的长度由学习者自己走（并写进决策账本）。
 */
export const DIRECTION_BOUNDED_STEPS = 5;

/**
 * 「有选择」的门槛（登记在 `data/design-values.mjs` 的 `direction-bounds`）。
 *
 * 方向核心里有几个节点现在就能学。1 个 = 被迫（只有这一条通向方向）；2 个以上 = 真能选。
 * 定成 2 而不是 3 的理由：只要存在第二条通向方向的路，「按自己的兴趣分配」才有意义，
 * 门槛再高会把「二选一」这种真实场景说成「没得选」。
 */
export const PARALLEL_THRESHOLD = 2;

/** 核心规模上限：超过它就停下并置 `limited`，不静默算一个可能不完整的层号表。 */
const MAX_CORE = 400;

/**
 * 第四问「想以什么方式学」→ 节点的构造类型偏好（2026-10 加）。
 *
 * 这一条只在**方向之后、其余判据之前**参与排序：方向永远第一（「按自己的需求」优先于
 * 「按自己的口味」）。它带来的效果是：同在方向上、解锁数一样时，先给那些
 * 「按你选的方式能走得更顺」的节点。
 *
 * 四种方式的依据：
 * - `base`「先把定义与条件理清」→ 概念 / 定义 / 理论 / 断言；
 * - `example`「先看具体例子与反例」→ 例子 / 反例 / 误区模式；
 * - `apply`「先把它用起来」→ 方法 / 问题 / 构造 / 表征；
 * - `any`「没什么偏好」→ 空表（不改变任何顺序）。
 *
 * 这里**不引入任何权重**：偏好只是一张「优先的类型名单」，同一档内仍按原来的判据排。
 */
export const MOOD_CONSTRUCTS: Record<string, readonly string[]> = {
  base: ['Concept', 'Definition', 'Theory', 'Claim'],
  example: ['Example', 'Counterexample', 'MisconceptionPattern'],
  apply: ['Method', 'Problem', 'Construction', 'Representation'],
  any: [],
};

/** 第五条的档位：0 = 在偏好名单里（排前），1 = 不在或没有偏好。 */
function moodRankOf(construct: string | undefined, mood: string | null | undefined): number {
  const preferred = mood ? MOOD_CONSTRUCTS[mood] : undefined;
  if (!preferred || preferred.length === 0) return 1;
  return construct && preferred.includes(construct) ? 0 : 1;
}

/** 选项自带的依据：界面直接照抄，不另写一句话。 */
export interface OptionReason {
  kind: 'in-core' | 'mood' | 'unlocks' | 'root' | 'order';
  /** 依据的种类名（页面按语种取整套文案）。 */
  text: string;
  /** 量化依据里的数字（`unlocks` 用）。 */
  count?: number;
}

export interface RankedOption {
  node: string;
  title: string;
  /** 构造类型（概念 / 断言 / 例子 / 方法…）：第四问的偏好按它比对。 */
  construct?: string;
  /** 产出它的那个行动；`null` = 没有任何行动能产出它（背景接口）。 */
  actionId: string | null;
  actionTitle: string | null;
  /** 引入它的行动的全部输入（都已被确认）——「已学过的前置」。 */
  requires: string[];
  /** 是否在声明的方向核心里。 */
  inCore: boolean;
  /** 它在方向核心里的层（1 起）；不在核心或核心未定层时为 null。 */
  coreLevel: number | null;
  /** 确认它之后，本体里**新变成可用**的节点数（只做一步）。 */
  newlyUnlocked: number;
  /** 其中落在方向核心里的数量。 */
  coreAdvanced: number;
  /** 新解锁节点的 id（按登记顺序），界面用来点开看「解锁了什么」。 */
  unlockedNodes: string[];
  /** 本条为什么排在这里（一定非空）。 */
  reasons: OptionReason[];
  /** 是否就是推荐的那一条。 */
  recommended: boolean;
}

export interface CoreLevelEntry {
  /** 层号，1 起。层 1 = 现在就能开始的方向前置。 */
  level: number;
  nodes: string[];
}

export interface DirectionCore {
  /** 采纳的方向目标；没有方向时为 null。 */
  goal: string | null;
  /** 核心里的全部节点（含已确认的与目标自身），按登记顺序。 */
  nodes: string[];
  /** 已确认的核心节点（不必再学）。 */
  confirmed: string[];
  /** 还没确认的核心节点（要学的就是这些）。 */
  pending: string[];
  /** 按行动依赖分好层的未确认部分。 */
  levels: CoreLevelEntry[];
  /**
   * 分不出层的核心节点（互相要求，拆不开）。非空即说明这个目标在当前登记下
   * 不能靠一条通顺的次序走到——界面必须如实说出来。
   */
  unresolved: string[];
  /** 层号是否只覆盖了核心的一部分（`unresolved` 非空时为 true）。 */
  truncated: boolean;
  /** 是否因为撞上限而截断（核心过大时）。 */
  limited: boolean;
}

export interface DirectionPosition {
  /** 档案（θ）里已确认的单元级节点数。 */
  confirmedUnits: number;
  /** 本次会话已采纳、尚未确认的步骤数（决策账本里还没变成确认的那些）。 */
  adoptedSteps: number;
  /** 已确认 **或** 已采纳、但不在方向核心里的节点数（旁路：方向之外学过的东西）。 */
  sideRoads: number;
  /** 现在就能开始的节点数（= 选项表的条数）。 */
  startable: number;
  /** θ 与这些行动合起来够得着的节点数（含已确认、已采纳与现在就能开始的）。 */
  reachable: number;
  /** 本体的单元级节点总数。 */
  units: number;
}

export interface DirectionReport {
  /** 采纳的方向（可能为空：还没声明）。 */
  focus: string | null;
  focusTitle: string | null;
  /** 排序后的选项（全部可用节点，按五条判据排好，不截断）。 */
  options: RankedOption[];
  /** 推荐的那一条（选项为空时为 null）。 */
  recommended: RankedOption | null;
  /** 方向核心里有几个现在就能学。 */
  parallelNow: number;
  /** `parallelNow ≤ 1`：现在只有一条通向方向的路，照着做就对了。 */
  forced: boolean;
  /** 算不算「有方向」：声明了且核心非空。 */
  directed: boolean;
  core: DirectionCore;
  /** 按推荐走的预览（含第一步），最多 `DIRECTION_BOUNDED_STEPS` 步。 */
  preview: RankedOption[];
  /** 预览是否因为步数上限而停止。 */
  previewTruncated: boolean;
  position: DirectionPosition;
  /** 被排除在可用集合外的话题级条目数（如实报告，不静默丢弃）。 */
  threadExcluded: number;
}

export interface DirectionInput {
  interests?: string[];
  nodes: NodeSummary[];
  actions: GraphAction[];
  relations: GraphRelation[];
  /** θ：只用到 `known`。为 null 时按「从未指定」处理。 */
  theta: ThetaKnownLike | null;
  /** 已声明的方向（0–3 个目标节点 id；只取第一个作为当前方向）。 */
  directions?: string[];
  /**
   * 第四问「想以什么方式学」（`base` / `example` / `apply` / `any`）。
   *
   * 它是**排序偏好**，不是能力或水平：只决定「同在方向上、解锁数一样时先给哪一类」。
   * 取值见 `MOOD_CONSTRUCTS`；未知值按「没有偏好」处理（不改动顺序）。
   */
  mood?: string | null;
  /**
   * 本次会话已采纳、但尚未确认为「已确认可用」的节点。
   *
   * 它们是**这条会话上已经做过的决定**，用来算「当前位置」与「下一步」：
   * 裁决同 `known`，但不写进 θ —— 选择一步不等于承认自己会了
   * （选择写 `payload.context = 'decision'` 的 view 事件，确认仍要单独做）。
   */
  adopted?: string[];
  /** 预览步数上限，默认 `DIRECTION_BOUNDED_STEPS`。 */
  steps?: number;
}

/** 从节点 id 到编号的视图：判据只认 id，不认整个节点。 */

interface Indexes extends StartableContext {
  nodes: NodeSummary[];
  /** 单元级节点（话题级条目不在其中）：只有它们会出现在选项表与分层里。 */
  units: NodeSummary[];
  /**
   * 「能在本体里解析」的节点集合 —— **全部**节点，含话题级条目。
   *
   * 它承担两件事，都与「能不能解析」有关，而不是「算不算单元」：
   * 1. 契约输入是否算数（悬空引用不算数）；
   * 2. 硬前置的两端是否都在本体里。
   *
   * 必须与 `starting-nodes.ts` 的口径一致（那里用的是「全部节点」的 order 表）。
   * 曾经错把 `unitIds`（只有单元）用在这里，后果是：**输入是话题级条目的契约被判成输入为空**
   * ——实测 `rudin:set-function` 因此从空白档案起就变成「现在就能开始」。
   */
  resolvable: Set<string>;
  /** 登记顺序：`nodes` 数组序（背景 → 各案例 → 教材）。 */
  order: Map<string, number>;
  titles: Map<string, string>;
  /** 节点本身（第四问的偏好要比对 `construct`）。 */
  nodeById: Map<string, NodeSummary>;
  /** 产出某节点的行动，按行动 id 排序（确定性）。 */
  producers: Map<string, GraphAction[]>;
  /** 指向某节点的硬前置来源，按登记顺序。未登记硬前置的节点不进这个表。 */
  hardIn: Map<string, string[]>;
  threadExcluded: number;
  unitIds: ReadonlySet<string>;
}

function buildIndexes(nodes: NodeSummary[], actions: GraphAction[], relations: GraphRelation[]): Indexes {
  const order = new Map(nodes.map((node, index) => [node.id, index]));
  const titles = new Map(nodes.map((node) => [node.id, node.title]));
  const resolvable = new Set(nodes.map((node) => node.id));
  const units = nodes.filter((node) => !isThreadEntry(node));
  const unitIds = new Set(units.map((node) => node.id));

  /*
   * 产出索引对**全部**节点建（含话题级条目）。
   *
   * 两点都要，缺一不可：
   * 1. 话题本身**不做选项**（`startableList` 只走 `ctx.units`）——它是一条学习线索的名字，
   *    不是可独立认知的单元，与 `starting-nodes.ts` 同口径；
   * 2. 但它的**契约要留着**：某个单元以话题为输入时，它必须如实被挡住。
   *    曾经漏掉第 2 点，后果是「以话题为输入的契约」被当成「输入为空」——
   *    实测 10 个节点（`rudin:set-function` 等）从空白档案起就冒充起点。
   */
  const producers = new Map<string, GraphAction[]>();
  for (const action of actions) {
    for (const output of action.outputs) {
      if (!resolvable.has(output.node)) continue;
      const list = producers.get(output.node);
      if (list) list.push(action);
      else producers.set(output.node, [action]);
    }
  }
  for (const list of producers.values()) list.sort((a, b) => a.id.localeCompare(b.id, 'en'));

  const hardIn = new Map<string, string[]>();
  for (const relation of relations) {
    if (relation.kind !== 'hardPrereq') continue;
    if (!resolvable.has(relation.to) || !resolvable.has(relation.from)) continue;
    const list = hardIn.get(relation.to);
    if (list) list.push(relation.from);
    else hardIn.set(relation.to, [relation.from]);
  }

  return {
    nodes,
    units,
    unitIds,
    resolvable,
    order,
    titles,
    nodeById: new Map(nodes.map((node) => [node.id, node])),
    producers,
    hardIn,
    threadExcluded: nodes.length - units.length,
  };
}

/**
 * 一条行动的输入节点名单（去重，保持契约里的次序；悬空引用不算数）。
 *
 * 与 `starting-nodes.ts` / `learning.ts` 的过滤同一口径：契约里指向已不存在节点的输入，
 * 不该在界面上被念成「还没确认的前置」。注意「能解析」不等于「是单元」——
 * 输入可以是话题级条目（它仍然是一个本体里真实存在的节点）。
 */
function pathInputs(action: GraphAction, resolvable: ReadonlySet<string>): string[] {
  return [...new Set(action.inputs.map((input) => input.node).filter((id) => resolvable.has(id)))];
}

/**
 * 挑「缺得最少」的那条产出行动。
 *
 * 取舍与 `starting-nodes.ts` 逐条一致（先看输入个数，再按行动 id 的确定性次序），
 * 所以「这个节点的引入路径」在网络视图、起始节点徽标与方向选项表三处说的是同一件事。
 */
function pickBestProducer(ctx: Indexes, nodeId: string): { action: GraphAction; requires: string[] } | null {
  const list = ctx.producers.get(nodeId) ?? [];
  let best: { action: GraphAction; requires: string[] } | null = null;
  for (const action of list) {
    const requires = pathInputs(action, ctx.resolvable);
    if (!best || requires.length < best.requires.length) best = { action, requires };
  }
  return best;
}

/**
 * 可用集合（least fixed point）。
 *
 * 从 `state` 出发反复加进「现在就可以开始」的节点，直到不动点。
 * 不动点是算法的固有保证（每次只增不减），因此**不需要**额外的迭代上限：
 * 每轮至少加一个节点，最多加 |units| 次。
 */
function closureOf(ctx: Indexes, seed: ReadonlySet<string>): Set<string> {
  const state = new Set(seed);
  let grew = true;
  while (grew) {
    grew = false;
    for (const node of ctx.units) {
      if (state.has(node.id)) continue;
      if (!isStartableUnit(node.id, ctx, state)) continue;
      state.add(node.id);
      grew = true;
    }
  }
  return state;
}

/** 可用节点的名单，按登记顺序（本体 `nodes` 数组序）。 */
function startableList(ctx: Indexes, state: ReadonlySet<string>): string[] {
  return ctx.units
    .filter((node) => !state.has(node.id) && isStartableUnit(node.id, ctx, state))
    .map((node) => node.id);
}

/**
 * 起始状态：**θ.known ∪ 本次已采纳**。
 *
 * 话题级条目**不放进去**：它不参与前置计算（`starting-nodes.ts` 的既定口径）。
 * 把 θ 里的 46 条话题也塞进状态，会让「确认过一条线索」意外地当作确认过它底下的所有内容
 * ——那是一条静默的越权。会话已采纳的条目（`adopted`）来自决策账本，可以进状态，
 * 但仍然只接受单元级节点。
 */
function seededState(ctx: Indexes, input: DirectionInput): Set<string> {
  const state = new Set<string>();
  for (const entry of input.theta?.known ?? []) if (ctx.unitIds.has(entry.node)) state.add(entry.node);
  for (const node of input.adopted ?? []) if (ctx.unitIds.has(node)) state.add(node);
  return state;
}

/**
 * 派生「现在就能开始的那一批」：**没有任何登记前置还没确认**的单元级节点。
 *
 * 与 `deriveDirection().options` **是同一个集合**（选项表就是它的排序结果，逐条带依据）。
 * 导出的目的是让测试与界面都能**独立重算**同一件事，而不是信任上一层的缓存。
 *
 * 三条界线写在这里，免得被当成缺陷：
 * - **不含已确认的节点**：它们不需要「开始」（`starting-nodes.ts` 的 entries 同样不含）。
 * - **不含话题级条目**：话题不做选项；但若某个单元以它为输入，那个单元会被如实挡住。
 * - **不含闭包扩展**：够得着的那一片用 `reachableSet`。两个数字差得很远
 *   （实测起点处 8 vs 72），混用会把「迟早能到」说成「现在能做」。
 */
export function startableSet(input: DirectionInput): Set<string> {
  const ctx = buildIndexes(input.nodes, input.actions, input.relations);
  return new Set(startableList(ctx, seededState(ctx, input)));
}

/**
 * 派生「够得着的那一片」：θ ∪ adopted ∪ 现在就能开始的，再**闭包到不动点**。
 *
 * 它是「按这些声明，最终能走到哪些节点」的上界（一步一批地往外扩，直到不动点）——
 * 用来回答「这个方向一共要多少步才够得着」，不是「现在该学哪个」。
 * 这个名字与 `startableSet` 分开是刻意的：两个数字差得很远（实测起点处 8 vs 72），
 * 混用会直接把「现在就能开始」说成「已经能到」。
 */
export function reachableSet(input: DirectionInput): Set<string> {
  const ctx = buildIndexes(input.nodes, input.actions, input.relations);
  const seed = seededState(ctx, input);
  const state = new Set([...seed, ...startableList(ctx, seed)]);
  return closureOf(ctx, state);
}

/** 方向核心：沿硬前置与最佳输入反向收集到不动点。 */
function coreNodes(ctx: Indexes, goal: string, limit = MAX_CORE): { nodes: Set<string>; limited: boolean } {
  const need = new Set<string>();
  const stack = [goal];
  let limited = false;
  while (stack.length) {
    const current = stack.pop() as string;
    if (need.has(current)) continue;
    if (need.size >= limit) { limited = true; continue; }
    need.add(current);
    for (const source of ctx.hardIn.get(current) ?? []) if (!need.has(source)) stack.push(source);
    const best = pickBestProducer(ctx, current);
    if (best) for (const input of best.requires) if (!need.has(input)) stack.push(input);
  }
  return { nodes: need, limited };
}

/**
 * 核心的分层：层 1 只依赖已确认的节点，层 n+1 的依赖都在层 ≤ n。
 *
 * 与「最短路」同结果但**不递归**：每轮扫描一遍，把依赖全部落在「已满足」集合里的节点定层。
 * 一轮下来一个都定不了层，就说明剩下的是环——它们进 `unresolved`，绝不伪造层号。
 */
function layerCore(
  ctx: Indexes,
  core: ReadonlySet<string>,
  known: ReadonlySet<string>,
  pending: string[],
): { levels: CoreLevelEntry[]; unresolved: string[] } {
  const level = new Map<string, number>();
  const pendingSet = new Set(pending);
  const depsOf = (id: string): string[] => {
    const hard = (ctx.hardIn.get(id) ?? []).filter((source) => core.has(source));
    const best = pickBestProducer(ctx, id);
    const inputs = (best?.requires ?? []).filter((input) => core.has(input));
    return [...new Set([...hard, ...inputs])];
  };
  /** 依赖是否已经「有着落」：已确认的算数，已定层的也算数；只有还没定层的核心节点会挡住它。 */
  const settled = (dependency: string) => known.has(dependency) || level.has(dependency);

  let remaining = [...pending].sort((a, b) => (ctx.order.get(a) ?? 0) - (ctx.order.get(b) ?? 0));
  let current = 1;
  while (remaining.length) {
    const ready: string[] = [];
    const rest: string[] = [];
    for (const id of remaining) {
      if (depsOf(id).every(settled)) ready.push(id);
      else rest.push(id);
    }
    if (ready.length === 0) break;
    for (const id of ready) level.set(id, current);
    remaining = rest;
    current += 1;
  }

  const levels: CoreLevelEntry[] = [];
  for (const [id, value] of [...level.entries()].sort(
    (a, b) => a[1] - b[1] || (ctx.order.get(a[0]) ?? 0) - (ctx.order.get(b[0]) ?? 0),
  )) {
    let group = levels.find((entry) => entry.level === value);
    if (!group) { group = { level: value, nodes: [] }; levels.push(group); }
    group.nodes.push(id);
  }
  levels.sort((a, b) => a.level - b.level);
  return { levels, unresolved: remaining.sort((a, b) => (ctx.order.get(a) ?? 0) - (ctx.order.get(b) ?? 0)) };
}

function buildCore(ctx: Indexes, goal: string | null, known: ReadonlySet<string>): DirectionCore {
  if (!goal || !ctx.unitIds.has(goal)) {
    return { goal, nodes: [], confirmed: [], pending: [], levels: [], unresolved: [], truncated: false, limited: false };
  }
  const { nodes, limited } = coreNodes(ctx, goal);
  const ordered = [...nodes].sort((a, b) => (ctx.order.get(a) ?? 0) - (ctx.order.get(b) ?? 0));
  const confirmed = ordered.filter((id) => known.has(id));
  const pending = ordered.filter((id) => !known.has(id));
  const { levels, unresolved } = layerCore(ctx, nodes, known, pending);
  return { goal, nodes: ordered, confirmed, pending, levels, unresolved, truncated: unresolved.length > 0, limited };
}

/**
 * 确认一个节点之后**新变成可用**的节点。
 *
 * 判据是「选项表之差」，不是「闭包之差」：只有**本来没得开始、确认它之后能开始**的节点才算。
 * 用闭包之差会把「本来就已经能开始、只是还没确认」的节点算进来（实测：起点处那 18 个平权选项
 * 会互相把对方算成「新解锁」），那个数字好看，但它是假的。
 */
function unlockOf(ctx: Indexes, state: ReadonlySet<string>, nodeId: string): string[] {
  if (state.has(nodeId)) return [];
  const before = new Set(startableList(ctx, state));
  const after = startableList(ctx, new Set([...state, nodeId]));
  return after.filter((id) => id !== nodeId && !before.has(id));
}

const isRootOption = (option: RankedOption) => option.actionId === null;

function reasonsOf(option: RankedOption, core: DirectionCore, mood?: string | null): OptionReason[] {
  const reasons: OptionReason[] = [];
  if (option.inCore) {
    reasons.push({
      kind: 'in-core',
      text: option.coreLevel !== null ? `在你的方向上（第 ${option.coreLevel} 层）` : '在你的方向上',
    });
  } else if (core.goal) {
    reasons.push({ kind: 'in-core', text: '不在这个方向上' });
  }
  if (mood && moodRankOf(option.construct, mood) === 0) {
    reasons.push({ kind: 'mood', text: '符合你选的学法偏好（只在同一档内影响顺序）' });
  }
  if (option.newlyUnlocked > 0) {
    reasons.push({
      kind: 'unlocks',
      text: `确认它之后，现在就能接着开始 ${option.newlyUnlocked} 个新节点`,
      count: option.newlyUnlocked,
    });
  }
  if (isRootOption(option)) {
    reasons.push({ kind: 'root', text: '没有任何行动能产出它，只能由你直接声明' });
  }
  if (!reasons.length) reasons.push({ kind: 'order', text: '按本体里的登记顺序' });
  return reasons;
}

/**
 * 排序：五条判据，字典序。
 *
 * 导出的目的是让「为什么是这个顺序」可以被单独检验（`tests/direction.test.mjs`），
 * 而不是埋在 `deriveDirection` 里只能整体观察。
 */
export function rankOptions(
  input: DirectionInput,
  frontier: string[],
  core: DirectionCore,
  state: ReadonlySet<string>,
): RankedOption[] {
  const ctx = buildIndexes(input.nodes, input.actions, input.relations);
  return rankWithin(ctx, input, frontier, core, state);
}

/**
 * 排序的内部实现：**复用已经建好的索引**。
 *
 * 预览要逐步重算 `DIRECTION_BOUNDED_STEPS` 次；每次 `rankOptions` 都重建一遍索引的话，
 * 231 节点 / 252 行动 × 6 次是白付的开销。索引只读，复用它不改变结果
 * （`tests/direction.test.mjs` 的整体比对与确定性用例会保证这一点）。
 */
function rankWithin(
  ctx: Indexes,
  input: DirectionInput,
  frontier: string[],
  core: DirectionCore,
  state: ReadonlySet<string>,
): RankedOption[] {
  const coreSet = new Set(core.nodes);
  const corePending = new Set(core.pending);
  const levelOfNode = new Map<string, number>();
  for (const entry of core.levels) for (const id of entry.nodes) levelOfNode.set(id, entry.level);

  const options: RankedOption[] = frontier.map((nodeId) => {
    const best = pickBestProducer(ctx, nodeId);
    const unlocked = unlockOf(ctx, state, nodeId);
    const inCore = coreSet.has(nodeId);
    return {
      node: nodeId,
      title: ctx.titles.get(nodeId) ?? nodeId,
      construct: ctx.nodeById.get(nodeId)?.construct,
      actionId: best?.action.id ?? null,
      actionTitle: best?.action.title ?? null,
      requires: best?.requires ?? [],
      inCore,
      coreLevel: levelOfNode.get(nodeId) ?? null,
      newlyUnlocked: unlocked.length,
      coreAdvanced: unlocked.filter((id) => corePending.has(id) || coreSet.has(id)).length,
      unlockedNodes: unlocked,
      reasons: [],
      recommended: false,
    };
  });

  options.sort((a, b) => (
    Number(b.inCore) - Number(a.inCore)
    || Number(isRootOption(b)) - Number(isRootOption(a))
    || interestRank(ctx.nodeById.get(a.node)?.discipline, input.interests) - interestRank(ctx.nodeById.get(b.node)?.discipline, input.interests)
    // 第四问的学法偏好：只在**前面几档完全并列**的选项之间决定先后（见下面 `moodRankOf` 的说明）。
    || moodRankOf(a.construct, input.mood) - moodRankOf(b.construct, input.mood)
    || b.newlyUnlocked - a.newlyUnlocked
    || (ctx.order.get(a.node) ?? 0) - (ctx.order.get(b.node) ?? 0)
  ));
  if (options.length) options[0].recommended = true;
  for (const option of options) option.reasons = reasonsOf(option, core, input.mood);
  return options;
}

function interestRank(discipline: string | undefined, interests: string[] = []): number {
  const index = discipline ? interests.indexOf(discipline) : -1;
  return index < 0 ? interests.length : index;
}

function positionOf(ctx: Indexes, state: ReadonlySet<string>, core: DirectionCore, adoptedCount: number): DirectionPosition {
  const coreSet = new Set(core.nodes);
  const startable = startableList(ctx, state);
  const reachable = new Set(state);
  for (const id of startable) reachable.add(id);
  return {
    confirmedUnits: state.size - adoptedCount,
    adoptedSteps: adoptedCount,
    sideRoads: [...state].filter((id) => !coreSet.has(id)).length,
    startable: startable.length,
    reachable: closureOf(ctx, reachable).size,
    units: ctx.units.length,
  };
}

/**
 * 派生「我现在在哪儿、下一步学什么、凭什么」。
 *
 * 返回的 `options` 覆盖**全部**可用节点（不截断）：界面自己决定显示几条，
 * 并如实写出总数——截断是实现决定，不该变成「站点只给了这些」的错觉。
 */
export function deriveDirection(input: DirectionInput): DirectionReport {
  const ctx = buildIndexes(input.nodes, input.actions, input.relations);
  const seed = seededState(ctx, input);
  const adoptedCount = [...new Set(input.adopted ?? [])].filter((id) => ctx.unitIds.has(id)).length;
  const declared = (input.directions ?? []).filter((id) => ctx.unitIds.has(id));
  const focus = declared[0] ?? null;
  const core = buildCore(ctx, focus, seed);

  const frontier = startableList(ctx, seed);
  const options = rankWithin(ctx, input, frontier, core, seed);

  const parallelNow = options.filter((option) => option.inCore).length;

  // 预览：从当前位置起，逐步采纳推荐并重算。步数上限只是预览上限，不是路线长度。
  const steps = Math.max(0, input.steps ?? DIRECTION_BOUNDED_STEPS);
  const preview: RankedOption[] = [];
  let cursor = new Set(seed);
  let previewTruncated = false;
  for (let step = 0; step < steps; step += 1) {
    const currentFrontier = startableList(ctx, cursor);
    if (!currentFrontier.length) break;
    const ranked = rankWithin(ctx, input, currentFrontier, core, cursor);
    preview.push(ranked[0]);
    cursor = new Set([...cursor, ranked[0].node]);
    if (step === steps - 1 && currentFrontier.length > 0) previewTruncated = true;
  }

  return {
    focus,
    focusTitle: focus ? (ctx.titles.get(focus) ?? focus) : null,
    options,
    recommended: options[0] ?? null,
    parallelNow,
    forced: parallelNow <= 1,
    directed: Boolean(focus) && core.nodes.length > 0,
    core,
    preview,
    previewTruncated,
    position: positionOf(ctx, seed, core, adoptedCount),
    threadExcluded: ctx.threadExcluded,
  };
}

export interface NextStepInput extends DirectionInput {
  /** 已经采纳过的那几步（= 决策账本里还没确认的条目）。 */
  adopted: string[];
}

/**
 * 「采纳这一步之后，下一步是什么」。
 *
 * 它与 `deriveDirection` 是同一个派生，只是种子多了已采纳的那几个：
 * 于是「路径」是从真实状态**一步步重算**出来的，而不是预先生成的一条长链。
 * 这正是「逻辑上并行 → 线性路径」的落点：并行的选项表还在（每次都重算），
 * 但每走一步，`position` 与 `recommended` 都跟着真实状态前进。
 */
export function nextStep(input: NextStepInput): DirectionReport {
  return deriveDirection(input);
}

/**
 * 一个选项的一句话依据（给卡片提示与验收读）。中文逐字固定，英文只换措辞。
 *
 * 这里刻意**不出现「掌握」「更重要」「最优」**：判据是「确认可用」这条外部声明，
 * 以及「现在能用它接着开始几个」这个可数的事实。
 */
export function optionBasis(
  option: RankedOption,
  titleOf: (id: string) => string,
  locale: 'zh' | 'en' = 'zh',
): string {
  const list = option.unlockedNodes.slice(0, 3).map(titleOf).join(locale === 'en' ? ', ' : '、');
  const ellipsis = option.unlockedNodes.length > 3 ? ' …' : '';
  const requires = option.requires.map(titleOf).join(locale === 'en' ? ', ' : '、');
  if (locale === 'en') {
    const head = option.actionId
      ? `every input of “${option.actionTitle}”${requires ? ` (${requires})` : ''} is confirmed, so it can start now`
      : 'no action produces it, so only you can declare it — there is no registered prerequisite to wait for';
    const tail = option.newlyUnlocked > 0
      ? `; confirming it lets ${option.newlyUnlocked} more node(s) start right away${list ? ` (${list}${ellipsis})` : ''}. This says what can be made next — not that it is more important.`
      : '; confirming it opens nothing new right now — a fact about the ontology, not a judgement of value.';
    return `${head}${tail}`;
  }
  const head = option.actionId
    ? `行动「${option.actionTitle}」的全部输入${requires ? `（${requires}）` : ''}都已确认，现在就能开始`
    : '没有任何行动能产出它，只能由你直接声明；没有需要等待的登记前置';
  const tail = option.newlyUnlocked > 0
    ? `；确认它之后，现在就能接着开始 ${option.newlyUnlocked} 个新节点${list ? `（${list}${ellipsis}）` : ''}。这句说的是「现在能用它做出什么」，不是「它更重要」。`
    : '；确认它之后暂时没有新东西可以开始——这是本体上的事实，不是对它的评价。';
  return `${head}${tail}`;
}

export { isStartableUnit, isThreadEntry };
export type { StartableContext, ThetaKnownLike };
