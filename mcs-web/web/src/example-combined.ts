/**
 * 把一本教材的**好几程**合成一张网络视图。
 *
 * ## 为什么需要它
 *
 * 范例路径把一本教材切成若干「程」（`ExamplePath`），每一程单独载入、单独规划、单独回放。
 * 但学习者常常想看的是**连着的好几程**：第一阶段立起来的语言，在第二阶段是怎么被接着用的。
 * 一程一张图看不到这件事——程与程之间的接口正好落在两张图的边界上。
 * 用户的要求就是：「设置可以选择把一条范例路径的好多程放进一张节点网络视图里面」。
 *
 * ## 合成规则（纯函数，可单测）
 *
 * 每一程登记的是 `entries`（起点）与 `goals`（这一程要拿下的里程碑），而
 * `buildPaths()` 保证「第 n 程的起点 = 基础背景 + 前 n−1 程的全部里程碑」。因此：
 *
 * - **起点**取**选中里最早那一程**的 `entries`。未选中的那些程的里程碑也在里面，
 *   这是对的：走到那一程时它们本来就已经在手里了；
 * - **展开序列**按选中各程的先后，把每程的 `goals` 依次接上，**去重**（后面的程可能重复登记
 *   前面已经拿下的节点）；已经作为起点在场的节点不重复出现在序列里；
 * - **目标**取最后一程的 `goal`（只用于标题与高亮）；
 * - **程边界**逐程记下「它贡献了几个新节点、从第几步开始」。这是这个功能的意义所在：
 *   一张图里要读得出「哪几步属于哪一程」。
 *
 * ## URL 里记什么、不记什么
 *
 * 记**节点序列**（沿用 `play=1&entry&path` 那一套）与**程的下标 + 步数**（`stages=2:5,3:4`），
 * 不记程的标题：标题是本地化文本，写进 URL 会把中文带进英文站，也会让链接随文案变化而失效。
 * 网络页按 `route`（教材 id）与下标回本地数据里查标题；查不到就只显示「第 N 程」。
 */
import type { ExampleSet } from './example-paths';

/** 合成之后，其中一程在展开序列里的位置。 */
export interface CombinedStage {
  /** 在 `set.paths` 里的下标（0 基）。URL 只记这个。 */
  index: number;
  /** 「第一程」这类序数（显示用；URL 不记）。 */
  ordinal: string;
  title: string;
  /** 这一程贡献了几个**新的**里程碑（去重之后）。0 = 它的目标都已在前面出现过。 */
  count: number;
  /** 它是从第几步开始的（0 基步下标）。 */
  from: number;
}

export interface CombinedRoute {
  setId: string;
  /** 第 0 帧就在场：选中里最早那一程的起点。 */
  entry: string[];
  /** 逐步展开的里程碑（去重、按程的顺序）。 */
  path: string[];
  goal: string;
  /** 显示用的路线名：`<教材 id>#<首程>-<末程>`（1 基，便于人读）。 */
  routeId: string;
  stages: CombinedStage[];
}

/**
 * 把 `indexes` 指定的几程合成一条可回放的路线。
 *
 * 下标会被去重、排序、并丢掉越界的项——用户点选顺序不影响结果（程的先后是数据决定的）。
 * 选不出任何一程、或那些程一个目标都没有时返回 `null`（调用方据此不渲染入口）。
 */
export function combineStages(set: ExampleSet, indexes: number[]): CombinedRoute | null {
  const ordered = [...new Set(indexes)]
    .filter((index) => Number.isInteger(index) && index >= 0 && index < set.paths.length)
    .sort((left, right) => left - right);
  if (ordered.length === 0) return null;

  const first = set.paths[ordered[0]];
  const entry = [...new Set(first.entries)];
  const seen = new Set(entry);
  const path: string[] = [];
  const stages: CombinedStage[] = [];
  for (const index of ordered) {
    const stage = set.paths[index];
    const from = path.length;
    for (const goal of stage.goals) {
      if (seen.has(goal)) continue;
      seen.add(goal);
      path.push(goal);
    }
    stages.push({ index, ordinal: stage.ordinal, title: stage.title, count: path.length - from, from });
  }
  if (path.length === 0) return null;

  const last = set.paths[ordered[ordered.length - 1]];
  return {
    setId: set.id,
    entry,
    path,
    goal: last.goal || path[path.length - 1],
    routeId: `${set.id}#${ordered[0] + 1}-${ordered[ordered.length - 1] + 1}`,
    stages,
  };
}

/** 把合成路线写成回放 URL 的查询串（与 `web/src/route-replay.ts` 的解析端成对）。 */
export function combinedRouteSearch(route: CombinedRoute): string {
  const params = new URLSearchParams();
  params.set('play', '1');
  params.set('entry', route.entry.join(','));
  params.set('path', route.path.join(','));
  if (route.goal) params.set('goal', route.goal);
  params.set('route', route.routeId);
  /*
   * 程边界只在**多于 1 程**时写：只勾一程时它就是普通的单程回放，
   * 写一个「0:5」既没用，也会让这一条链接与规划器生成的链接长得不一样。
   */
  if (route.stages.length > 1) params.set('stages', route.stages.map((stage) => `${stage.index}:${stage.count}`).join(','));
  return params.toString();
}

/** URL 里的程边界：`<程下标>:<这一程的步数>`，逗号分隔。 */
export interface StageSpan {
  index: number;
  count: number;
}

/**
 * 解析 `stages` 参数。
 *
 * 宽松：认不出的片段直接丢掉（链接可能是手改的、也可能是旧版本生成的），
 * 剩下的照常用——一张图少标几程，比整段回放打不开好。
 */
export function parseStageSpans(raw: string | null | undefined): StageSpan[] {
  if (!raw) return [];
  const spans: StageSpan[] = [];
  for (const piece of raw.split(',')) {
    const [index, count] = piece.split(':');
    const stageIndex = Number(index);
    const stageCount = Number(count);
    if (!Number.isInteger(stageIndex) || stageIndex < 0) continue;
    if (!Number.isInteger(stageCount) || stageCount < 0) continue;
    spans.push({ index: stageIndex, count: stageCount });
  }
  return spans;
}

/** 把程边界摊成「第几步属于哪一程」：返回每个步下标对应的程下标（没有边界信息时为空）。 */
export function stepStageIndex(spans: StageSpan[]): number[] {
  const out: number[] = [];
  for (const span of spans) {
    for (let step = 0; step < span.count; step += 1) out.push(span.index);
  }
  return out;
}
