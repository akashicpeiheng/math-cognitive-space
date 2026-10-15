/**
 * 「开始学习」页的方向派生：把学习方向讲成**次级学科 + 待学骨架 + 当前入口**（2026-10-11 加）。
 *
 * ## 它回答的那个问题
 *
 * 用户的要求：**「以优化目的重新设计开始学习界面开头的引导部分，主要从次级学科、
 * 已有的目标入手，结合学习者的兴趣引导式地为学习者清晰展示学习方向。」**
 *
 * 这一页已经有两块东西回答「学到哪儿去」：`components/DirectionPanel.tsx`（声明方向、
 * 声明后给「现在能开始」的排序选项表）与 `direction-presets.ts`（六条现成的方向入口）。
 * 它们回答的是**「选哪条、下一步点哪个」**。本模块补的是它们都没回答的那一层：
 *
 * > 这条方向**涉及哪些次级学科、每支要学几个节点、现在从哪个节点进、为什么是它**。
 *
 * 于是「清晰展示学习方向」= 把本体里**已经算得出来**的代价摊开，让学习者在选之前
 * 就能比较，而不是选完才知道要学 27 个节点。
 *
 * ## 三个概念（先给自然语言，再给判据）
 *
 * 1. **次级学科** = 节点自己的 `discipline` 字段（受控词表见 `data/fields.mjs`）。
 *    它是本体里唯一「一支数学分支」的综合粒度，且**每个节点恰有一个**，因此可以计数。
 *
 *    为什么不用 `graph.aggregates` 里那 6 条 `kind === 'discipline'` 的聚合做父级：
 *    它们**不是覆盖全库的划分**（合计约 75/231 个节点），而且与 `discipline` 重名
 *    （「拓扑」既是一条聚合又是一个学科值）。拿它当父级会重新引出第五十二轮刚拆掉的
 *    「教材式合并标签」问题——一个聚合标签说明不了这个对象**本身**属于哪一支数学。
 *    因此这里不建父子层级：次级学科一律取 `node.discipline`，在界面上一层平铺。
 *
 * 2. **已有的目标** = `direction-presets.ts` 登记的六个方向入口（每条贯通案例的终点）。
 *    **本模块不另存一份岗位清单**：目标 id 由调用方给（`buildGoalCards` / `rankGoalCards`），
 *    候选顺序也由调用方的数组顺序决定。两处各存一份名单，迟早会漂开。
 *    本模块只持有一样自己的东西：每个目标对应的**方向性质**（`GOAL_INTENTS`），
 *    它决定结论卡沿用哪一支既有文案（「补一个具体缺口」还是「按顺序推进」）。
 *
 * 3. **方向骨架** = 这个目标在本体里算得出来的全部代价。判据一律复用
 *    `direction.ts` 的 `deriveDirection`，**不另写一套**：核心（要哪些节点）、
 *    未决（还没学的）、层次（按行动依赖）、成环（拆不开的）、可用（现在就能开始的核心节点）。
 *    界面上每个数字都能回溯到同一次派生。
 *
 * ## 四条纪律
 *
 * 1. **只读**：输入是本体图（M 的投影）与 θ.known（E 的派生），本模块不写任何东西，
 *    也不产生难度、学时或掌握度——本体里没有校准过的这类数据，伪造一个会误导学习者。
 *    「声明方向」是另一条线（`useDirection().declare` 写 E），不在这里做。
 * 2. **背景接口与内容分开**：判据只有一条——**该节点没有任何产出行动**
 *    （与 `starting-nodes.ts` 的 `root` 完全同源）。这不是排版偏好：实测每一个目标方向
 *    的未决核心都含 `bg:set:function`（其 `discipline` 恰好登记为「集合论」），
 *    混进学科分布会让每张卡都写着「集合论」，读起来像结论而其实是背景接口。
 * 3. **兴趣只排序**：选中的次级学科只改变卡片的**顺序与标注**，不隐藏任何目标、
 *    不改本体、不改规划算法、压不过「有没有东西可解锁」。
 * 4. **排序是可数的整数，不是加权分数**：`interestMatch` 只做计数（详见它的注释）。
 *    加权分数会变成第二个「看起来科学但没有校准过」的东西。
 *
 * ## 边界（如实登记，不静默）
 *
 * - **成环**：核心在「行动输入 + 硬前置」口径下可能成环（实测 manifold 6 / tensor 8 /
 *   dg 16 / top 3 个）。这时 `skeleton.unresolved` 列出拆不开的那几个，`levels` 不覆盖它们，
 *   `truncated` 为 true——不伪造层号，也不假装一条通顺的路。
 * - **截断**：核心超过 `direction.ts` 的上限时 `limited` 为 true，界面据此说明「没有全算」。
 * - **判据就是已登记的数据，不补常识**：某条行动契约漏登记输入时，这个节点会**过早**
 *   变成可用（`starting-nodes.ts` 的文件头已写明这条已知边界）。本模块继承它，不在这里修。
 * - **悬空引用**：契约里指向本体中已不存在节点的输入视为已满足，与 `learning.ts` /
 *   `direction.ts` / `starting-nodes.ts` 三处同源。
 * - **目标 id 不存在（或不是单元级）时不给卡**：登记出了问题就不假装有方向
 *   （`buildGoalCard` 返回 null，界面据此不渲染那张卡）。
 *
 * ## 本模块不做的事
 *
 * **不做「按次级学科筛出现在可学的节点」。** 冷启动下这条路走不通：没有选定档案时
 * 可用节点恒为同样的 8 个背景接口（`deriveDirection` 现场算出），声明单个背景接口
 * 只能把可用集扩到 7–11 个。因此任何「按学科给你一批候选」的清单在冷启动时都是假的；
 * 诚实的做法是先用本体自己算出的「这条方向要什么」把方向讲清楚，再给出现在真正能走的那一步。
 *
 * 纯函数模块，**不 import React**：`tests/start-direction.test.mjs` 用
 * `import(pathToFileURL(...))` 直接加载（与 `tests/direction.test.mjs` 同一条路）。
 * 因此这里只 import `./direction.ts`、`./learning.ts`、`./types`、`./start-preferences.ts`
 * 四个叶子模块，不引组件目录、不引 i18n 目录（`./i18n` 是目录导入，node 侧会报
 * `ERR_UNSUPPORTED_DIR_IMPORT`——见 `web/src/i18n/useLabels.tsx` 的文件头）。
 */

import {
  DIRECTION_BOUNDED_STEPS,
  deriveDirection,
  optionBasis,
  type RankedOption,
} from './direction.ts';
import type { StartGoal } from './start-preferences.ts';
import type { GraphAction, GraphRelation } from './learning.ts';
import type { NodeSummary } from './types';

/**
 * 本模块自己收一份语种常量，**不 import `./i18n`**（理由见文件头末段）。
 *
 * `web/src/i18n/locales.ts` 的 `Locale` 与它同名同义；本模块只要**最小形状**，
 * 语种清单的唯一事实仍在 `i18n/locales.ts` 与 `shared/locales.mjs`（两处一致由
 * `tests/i18n-core.test.mjs` 钉住），这里不新增第三份。
 */
export type DirectionLocale = 'zh' | 'en';

/**
 * 每个目标对应的**方向性质**（决定结论卡沿用哪一支既有文案）。
 *
 * 只有一处与其它目标不同，如实写出来而不是假装它们一样：
 * `limit:bridge`（ε–δ 与序列定义的等价）回应的是「我知道自己卡在哪」——它是补一个
 * 具体缺口；其余五条都是「按顺序推进」。未登记的目标按 `route` 处理。
 */
export const GOAL_INTENTS: Record<string, StartGoal> = {
  'limit:bridge': 'gap',
  'manifold:claim-max': 'route',
  'tensor:end-iso': 'route',
  'group:cayley': 'route',
  'dg:generalized-stokes-theorem': 'route',
  'top:atlas': 'route',
};

/** 一个方向入口：id + 当前语种的显示名（由 `direction-presets.ts` 的成对文案给）。 */
export interface GoalPresetInput {
  id: string;
  title: string;
}

/** 前端图接口下发的形状（`GET /ontology/graph`），只声明本模块用到的字段。 */
export interface DirectionGraph {
  nodes: NodeSummary[];
  actions: GraphAction[];
  relations: GraphRelation[];
}

/** 一个次级学科在这条方向里的分布。`reached` / `locked` 是**现在**的口径，会随档案变。 */
export interface DisciplineSlice {
  id: string;
  /** 待学节点里属于这一支的个数（不随档案变：它只由核心决定）。 */
  count: number;
  /** 其中现在就能开始的个数。 */
  reached: number;
  /** 其中现在还开始不了的个数。 */
  locked: number;
}

/**
 * 一条方向的骨架：**全是算出来的事实**，没有评价。
 *
 * 数组一律按本体登记顺序（`nodes` 数组序），因此两次调用逐字相同。
 */
export interface GoalSkeleton {
  /** 方向核心的全部单元节点。 */
  all: string[];
  /** 核心里的已确认节点（θ.known，不必再学）。 */
  confirmed: string[];
  /** 核心里的未决节点——要学的就是这些。 */
  pending: string[];
  /** 未决部分按行动依赖分的层；`truncated` 为真时不覆盖全部。 */
  levels: Array<{ level: number; nodes: string[] }>;
  /** 成环、拆不开的核心节点；非空即说明这条方向当前登记下没有一条通顺次序。 */
  unresolved: string[];
  /** 层号是否只覆盖了核心的一部分。 */
  truncated: boolean;
  /** 是否因为撞上核心规模上限而截断。 */
  limited: boolean;
  /** 待学节点的次级学科分布，按 `node.discipline` 计数；**不含背景接口**。 */
  disciplines: DisciplineSlice[];
  /**
   * 只能由学习者自己声明的背景接口节点（待学部分里没有任何产出行动的那些）。
   *
   * 判据与 `starting-nodes.ts` 的 `root` 同源：**没有产出行动**。
   */
  interfaces: string[];
  /** 现在就能开始的核心节点（核心 ∩ 可用集）。 */
  frontier: string[];
  /** 还不能开始的核心节点。 */
  blockedNow: string[];
}

/** 一条方向的卡片：界面直接照抄这里的数字，不自己再算一遍。 */
export interface GoalCardView {
  /** 目标节点 id（结构，不翻译）。 */
  node: string;
  /** 显示名：调用方给的（方向入口的成对文案）优先，否则本体标题，再否则 id。 */
  title: string;
  /** 目标自身的次级学科。 */
  discipline: string;
  /** 方向性质（让结论卡沿用既有的 StartGoal 文案）。 */
  intent: StartGoal;
  skeleton: GoalSkeleton;
  /** 下一个动作；可用集为空时为 null（界面据此说「现在没有可开始的下一步」）。 */
  next: { node: string; title: string; basis: string } | null;
  /** 现在就能开始的核心节点条目（带依据），供卡片列入入口。 */
  frontierOptions: Array<{ node: string; title: string; basis: string }>;
  /** 按推荐走的预览（含第一步），最多 `DIRECTION_BOUNDED_STEPS` 步。 */
  preview: Array<{ node: string; title: string }>;
  /** 预览是否因为步数上限而停止（是预览上限，不是路线长度）。 */
  previewTruncated: boolean;
  /** 兴趣匹配得分（可数的整数；大者在前）。 */
  match: number;
}

/**
 * 本体里真的登记了节点的方向入口（过滤掉清单里已不存在的 id 与话题级条目）。
 *
 * 为什么要有它：`direction-presets.ts` 是人工登记的，本体是会变的。悬空的目标 id 不该
 * 在界面上变成一张算不出数字的空卡——那会让「每个数字都由本体现场派生」变成一句谎话。
 */
export function presentPresets(
  presets: readonly GoalPresetInput[],
  graph: { nodes: NodeSummary[] } | null | undefined,
): GoalPresetInput[] {
  if (!graph) return [];
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  return presets.filter((preset) => {
    const node = byId.get(preset.id);
    return node !== undefined && (node.granularity ?? 'unit') === 'unit';
  });
}

/** 本体里真的登记了节点的次级学科（按节点数降序，并列按 id 排序）。 */
export function presentDisciplines(graph: { nodes: NodeSummary[] } | null | undefined): string[] {
  return disciplineTotals(graph).map((item) => item.id);
}

/**
 * 每个次级学科在本体里的节点数。
 *
 * `granularity` 默认 `'unit'`：只有单元级节点是「可独立认知的对象」，
 * 因此列表页与这里数出来的数一致（话题级条目是另一层，混进来会得到两个口径）。
 */
export function disciplineTotals(
  graph: { nodes: NodeSummary[] } | null | undefined,
  granularity: 'unit' | 'all' = 'unit',
): Array<{ id: string; count: number }> {
  if (!graph) return [];
  const counts = new Map<string, number>();
  for (const node of graph.nodes) {
    if (!node.discipline) continue;
    if (granularity === 'unit' && (node.granularity ?? 'unit') !== 'unit') continue;
    counts.set(node.discipline, (counts.get(node.discipline) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((left, right) => right.count - left.count || left.id.localeCompare(right.id, 'en'));
}

/**
 * 现在**没有任何行动能产出**的节点集合。
 *
 * 判据与 `starting-nodes.ts` 的 `root` 完全同源：产出行动按「输出能在本体里解析」建表，
 * 因此 `bg:set:function` 这类背景接口不在表里。两处各写一份的话，同一个节点会在
 * 起始节点徽标上是「背景接口」、在方向卡上被算进内容学科。
 */
function unproducible(graph: DirectionGraph): Set<string> {
  const resolvable = new Set(graph.nodes.map((node) => node.id));
  const produced = new Set<string>();
  for (const action of graph.actions) {
    for (const output of action.outputs) {
      if (resolvable.has(output.node)) produced.add(output.node);
    }
  }
  const out = new Set<string>();
  for (const id of resolvable) if (!produced.has(id)) out.add(id);
  return out;
}

/**
 * 兴趣匹配得分。
 *
 * **只做计数，不做加权分数**——加权会变成第二个「看起来科学但没有校准过」的东西。
 *
 * 计分规则两条：
 * 1. 目标节点**自身**的次级学科被选中：+2。它是「你要抵达的地方」，比路上的节点更贴身，
 *    但仍然是整数计数，不是系数。
 * 2. 待学节点的次级学科**每出现一个**被选中的学科：+1（按节点数计，也就是说一条
 *    有 9 个微分几何节点的方向，对选了微分几何的人得 +9）。
 *
 * `interests` 为空时得 0——那时排序由「待学节点数」与候选清单顺序决定，
 * 这是**默认顺序**，不是「兴趣不起作用」。
 */
export function interestMatch(
  card: Pick<GoalCardView, 'discipline' | 'skeleton'>,
  interests: readonly string[],
): number {
  if (interests.length === 0) return 0;
  const wanted = new Set(interests);
  let score = wanted.has(card.discipline) ? 2 : 0;
  for (const slice of card.skeleton.disciplines) {
    if (wanted.has(slice.id)) score += slice.count;
  }
  return score;
}

/**
 * 派生一条方向的卡片。
 *
 * 返回 null 的两种情况（都不假装有方向）：
 * - 目标 id 不在本体里（登记漂了）；
 * - 目标不是单元级条目（话题级条目不参与前置计算，当不了方向落点）。
 */
export function buildGoalCard(
  goalId: string,
  graph: DirectionGraph | null | undefined,
  options: {
    /** θ.known：只用到节点 id。为 null 时按「从未指定」处理。 */
    theta?: { known: Array<{ node: string }> } | null;
    interests?: readonly string[];
    /** 显示名（方向入口的成对文案）。不给时用本体标题。 */
    title?: string;
    /** 预览步数上限，默认 `DIRECTION_BOUNDED_STEPS`（5）。 */
    steps?: number;
    /** 依据句的语种（`optionBasis` 的措辞）。默认中文——既有调用与中文站逐字不变。 */
    locale?: DirectionLocale;
  } = {},
): GoalCardView | null {
  if (!graph) return null;
  const target = graph.nodes.find((node) => node.id === goalId);
  if (!target) return null;
  if ((target.granularity ?? 'unit') !== 'unit') return null;

  const intent: StartGoal = GOAL_INTENTS[goalId] ?? 'route';
  const theta = options.theta ?? null;
  const interests = options.interests ?? [];
  const steps = Math.max(0, options.steps ?? DIRECTION_BOUNDED_STEPS);
  const locale: DirectionLocale = options.locale ?? 'zh';

  /*
   * 一次派生给出全部事实：核心、层次、成环、可用集与预览。
   * 界面上的每个数字都来自这一个对象，因此「卡片之间对不上」这种错不可能发生。
   */
  const report = deriveDirection({
    nodes: graph.nodes,
    actions: graph.actions,
    relations: graph.relations,
    theta,
    directions: [goalId],
    steps,
  });

  const unitIds = new Set(graph.nodes.filter((node) => (node.granularity ?? 'unit') === 'unit').map((node) => node.id));
  const titles = new Map(graph.nodes.map((node) => [node.id, node.title]));
  const disciplines = new Map(graph.nodes.map((node) => [node.id, node.discipline]));
  const interfaces = unproducible(graph);

  const titleOf = (id: string) => titles.get(id) ?? id;
  const toEntry = (option: RankedOption) => ({
    node: option.node,
    title: option.title,
    basis: optionBasis(option, titleOf, locale),
  });

  const frontierOptions = report.options.filter((option) => option.inCore).map(toEntry);
  const frontier = frontierOptions.map((item) => item.node);

  const core = report.core;
  /*
   * 次级学科分布只算**待学的内容节点**：
   * - 已确认的不算（不必再学，算进去会夸大代价）；
   * - 背景接口不算（它们只能由学习者自己声明，是前提不是内容；混进去会让每张卡都写「集合论」）。
   * 两者相减后才是「这条方向要学的数学内容」，界面据此画横条。
   */
  const pendingContent = core.pending.filter((id) => !interfaces.has(id));
  const frontierSet = new Set(frontier);
  const tally = new Map<string, { count: number; reached: number }>();
  for (const id of pendingContent) {
    const key = disciplines.get(id) ?? '未分类';
    const slice = tally.get(key) ?? { count: 0, reached: 0 };
    slice.count += 1;
    if (frontierSet.has(id)) slice.reached += 1;
    tally.set(key, slice);
  }
  const slices: DisciplineSlice[] = [...tally.entries()]
    .map(([id, slice]) => ({ id, count: slice.count, reached: slice.reached, locked: slice.count - slice.reached }))
    .sort((left, right) => right.count - left.count || left.id.localeCompare(right.id, 'en'));

  const skeleton: GoalSkeleton = {
    all: core.nodes,
    confirmed: core.confirmed,
    pending: core.pending,
    // 层次只保留未决节点的层（`direction.ts` 的 `levels` 已经只覆盖未决部分）。
    levels: core.levels.map((level) => ({ level: level.level, nodes: level.nodes.filter((id) => unitIds.has(id)) })),
    unresolved: core.unresolved,
    truncated: core.truncated,
    limited: core.limited,
    disciplines: slices,
    // 背景接口按核心顺序给（不排序：本体登记顺序即界面次序，确定且可复现）。
    interfaces: core.pending.filter((id) => interfaces.has(id)),
    frontier,
    blockedNow: core.pending.filter((id) => !frontierSet.has(id)),
  };

  const card: GoalCardView = {
    node: goalId,
    title: options.title ?? target.title,
    discipline: target.discipline,
    intent,
    skeleton,
    next: report.recommended ? toEntry(report.recommended) : null,
    frontierOptions,
    preview: report.preview.map((option) => ({
      node: option.node,
      title: titles.get(option.node) ?? option.node,
    })),
    previewTruncated: report.previewTruncated,
    match: 0,
  };
  card.match = interestMatch(card, interests);
  return card;
}

/**
 * 按三条判据排序（**字典序**，不引入权重）：
 *
 * 1. **兴趣匹配**（`interestMatch`，大者在前）——「结合学习者的兴趣」的落点；
 * 2. **待学节点数**降序——同样合兴趣时，先给内容更厚的那条；
 * 3. **候选清单的次序**——由调用方给（`direction-presets.ts` 的登记顺序），
 *    保证两次调用逐字相同。
 *
 * 排序**只改顺序**：没有一条方向会因为「不合兴趣」被删掉。
 */
export function rankGoalCards(cards: GoalCardView[], presets: readonly GoalPresetInput[]): GoalCardView[] {
  const order = new Map(presets.map((preset, index) => [preset.id, index]));
  return [...cards].sort((left, right) => (
    right.match - left.match
    || right.skeleton.pending.length - left.skeleton.pending.length
    || (order.get(left.node) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.node) ?? Number.MAX_SAFE_INTEGER)
  ));
}

/**
 * 一次性派生全部方向卡片（已按兴趣排好序）。
 *
 * `steps` 固定为 0：列表里**不需要**预览（那是唯一昂贵的部分，预览要逐步重算）。
 * 界面只为**当前选中的**那条方向再算一次带预览的卡，见 `previewOf`。
 * 实测 6 条 × `steps: 0` 约 4 ms，可以随渲染算。
 */
export function buildGoalCards(
  graph: DirectionGraph | null | undefined,
  presets: readonly GoalPresetInput[],
  options: {
    theta?: { known: Array<{ node: string }> } | null;
    interests?: readonly string[];
    locale?: DirectionLocale;
  } = {},
): GoalCardView[] {
  const usable = presentPresets(presets, graph);
  if (usable.length === 0 || !graph) return [];
  const cards: GoalCardView[] = [];
  for (const preset of usable) {
    const card = buildGoalCard(preset.id, graph, {
      theta: options.theta,
      interests: options.interests,
      title: preset.title,
      locale: options.locale,
      steps: 0,
    });
    if (card) cards.push(card);
  }
  return rankGoalCards(cards, usable);
}

/**
 * 为选中的方向补上预览（列表用的是 `steps: 0`，省掉这一步重算）。
 *
 * 拿不到卡（id 不存在 / 不是单元）时返回 null，界面据此不渲染方向段。
 */
export function previewOf(
  goalId: string,
  graph: DirectionGraph | null | undefined,
  options: {
    theta?: { known: Array<{ node: string }> } | null;
    interests?: readonly string[];
    title?: string;
    steps?: number;
    locale?: DirectionLocale;
  } = {},
): GoalCardView | null {
  return buildGoalCard(goalId, graph, {
    theta: options.theta,
    interests: options.interests,
    title: options.title,
    steps: options.steps ?? DIRECTION_BOUNDED_STEPS,
    locale: options.locale,
  });
}

/**
 * 方向摘要里的数字（界面按语种套文案）。
 *
 * 只给**可数的事实**：要学几个节点、其中几个现在能开始、涉及几支次级学科、
 * 几个拆不开、几个只能由学习者自己声明。刻意不给难度、时长与百分比。
 */
export interface DirectionSummary {
  pending: number;
  nowStartable: number;
  disciplines: number;
  unresolved: number;
  interfaces: number;
  confirmed: number;
}

export function summarizeDirection(card: GoalCardView): DirectionSummary {
  return {
    pending: card.skeleton.pending.length,
    nowStartable: card.skeleton.frontier.length,
    disciplines: card.skeleton.disciplines.length,
    unresolved: card.skeleton.unresolved.length,
    interfaces: card.skeleton.interfaces.length,
    confirmed: card.skeleton.confirmed.length,
  };
}
