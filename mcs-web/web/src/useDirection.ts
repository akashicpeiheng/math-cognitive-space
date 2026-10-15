/**
 * 学习方向的读写与派生接线（2026-10 加）。
 *
 * ## 三样东西存在哪儿（边界写在代码里，也写在界面上）
 *
 * | 东西 | 存在哪 | 为什么 |
 * |---|---|---|
 * | **方向声明**（「我要去哪」） | E 层（`learning_directions` 表 + 一条 `kind: 'goal'` 事件） | 它是学习状态：跟着档案走、随导出带走、跨浏览器。接口见 `server/api.mjs` |
 * | **决策账本**（「我选了先学这个」） | 本机 `localStorage`，**按档案分开** | 它是**会话上的打算**，不是学习事实。写成事件会污染事件流，也会与「确认可用」抢同一块语义 |
 * | **已确认** | E 层（既有 θ） | 唯一能把节点判成「可用前置」的东西。决策永远不写 θ |
 *
 * 于是「走了五步」= 五条决策 + 零到五条确认，`position.confirmedUnits` 与
 * `position.adoptedSteps` 分开显示——「选择了」从不冒充「会了」。
 *
 * ## 账本怎么用
 *
 * 账本只记「我选了哪个节点」，**不记坐标、不记前因**：路径是每次从 θ + 方向 + 账本
 * 重新算出来的（`deriveDirection` 逐步复算）。因此：
 * - 学习者在别处确认了某个节点，路径自己会把它标成「confirmed」而不是「仍在打算」；
 * - 本体换了版本、某个节点不可解析，标成「stale」并如实说出来，不静默丢行；
 * - 撤回一步 = 删掉那一步之后的所有条目（后面的步骤本来就是在那一状态上选的）。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, formatError, type Attempt } from './api';
import {
  deriveDirection, optionBasis,
  type DirectionInput, type DirectionReport, type RankedOption,
} from './direction';
import type { LearningData } from './useLearningData';
import type { LearningDirectionView } from './types';

/** 账本在 localStorage 里的键前缀；后面接档案 id。 */
export const DECISIONS_KEY_PREFIX = 'mcs-direction-decisions-v1:';

/** 账本的一条：只有一个节点 id 与它被选择的时刻。 */
export interface DecisionEntry {
  node: string;
  at: string;
}

/** 路径上的一步：账本里的条目 + 它现在的状态。 */
export interface DirectionPathStep {
  node: string;
  title: string;
  at: string;
  /**
   * - `adopted`：还只是打算（θ 里没有它）——这一步是「我选了」；
   * - `confirmed`：θ 里已经有它（你自己确认过）——这一步已经落地；
   * - `stale`：这个节点在当前本体版本里不可解析，或者现在已不再是可开始的节点。
   */
  status: 'adopted' | 'confirmed' | 'stale';
  /** 是不是当前方向核心里的一步。 */
  inCore: boolean;
}

export interface DirectionState {
  /** 派生结果：位置、选项表、推荐、核心、预览。图为空时为 null。 */
  report: DirectionReport | null;
  /** 账本里的原始条目（按加入顺序）。 */
  decisions: DecisionEntry[];
  /** 路径（账本按当前状态解释之后的样子）。 */
  path: DirectionPathStep[];
  /** 界面上要显示的失败（取数、声明、撤回）。 */
  error: string | null;
  /** 正在提交（按钮据此禁用，不重复点）。 */
  busy: boolean;
  /** 声明一个方向（幂等：同一个节点重复声明不会新增）。 */
  declare: (nodeId: string, note?: string) => Promise<boolean>;
  /** 撤回一个方向（按 directionId）。 */
  withdraw: (directionId: string) => Promise<boolean>;
  /**
   * 某个节点当前声明的 `directionId`（没有则 null）。
   *
   * 界面上的「撤掉这个方向」按**节点**表达，而接口按 directionId 撤回——
   * 这层映射放在这里而不是组件里，免得每个调用点自己去找列表。
   */
  directionIdFor: (nodeId: string) => string | null;
  /** 记一步：把某个可用节点加入账本（**不**写确认）。 */
  adopt: (nodeId: string) => void;
  /** 撤回第 index 步之后的所有步骤（重选）。 */
  rewind: (index: number) => void;
  /** 清空账本（不影响 θ，也不影响方向）。 */
  clear: () => void;
}

function storageKey(profileId: string): string {
  return DECISIONS_KEY_PREFIX + profileId;
}

function readDecisions(profileId: string | null): DecisionEntry[] {
  if (!profileId || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(profileId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is DecisionEntry => Boolean(item) && typeof (item as DecisionEntry).node === 'string')
      .map((item) => ({ node: item.node, at: typeof item.at === 'string' ? item.at : new Date().toISOString() }));
  } catch {
    // 坏数据一律退回空账本，不让页面白屏（与 start-preferences 的取舍一致）。
    return [];
  }
}

function writeDecisions(profileId: string, entries: DecisionEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  if (!entries.length) localStorage.removeItem(storageKey(profileId));
  else localStorage.setItem(storageKey(profileId), JSON.stringify(entries));
}

/**
 * 把账本按**当前状态**解释成路径。
 *
 * 三条解释规则（都在界面上写出来）：
 * 1. 节点已确认 → `confirmed`（这一步已经落地）；
 * 2. 节点在本体里查不到，或它**现在**已不再是可开始的节点 → `stale`（如实标出来，不删行）；
 * 3. 其余 → `adopted`（还在打算）。
 *
 * 判「现在还能不能开始」时，只做**一次**推导（把前面仍然有效的步骤当作已采纳），
 * 而不是每一步各推一次：账本可能有几十条，逐步重推会让页面在长路径上变慢，
 * 而两者的结论在「顺序解释」这个语义下是同一个。
 */
function explainPath(
  entries: DecisionEntry[],
  input: DirectionInput,
  known: ReadonlySet<string>,
  titles: Map<string, string>,
  coreNodes: Set<string>,
): DirectionPathStep[] {
  const adopted: string[] = [];
  const steps: DirectionPathStep[] = [];
  // 先把「还打算着的」那些挑出来，一次推导出它们各自的可用性。
  const tentative: string[] = [];
  for (const entry of entries) {
    if (known.has(entry.node)) continue;
    if (!titles.has(entry.node)) continue;
    tentative.push(entry.node);
  }
  const startableByPrefix = new Map<number, Set<string>>();
  for (let index = 0; index < tentative.length; index += 1) {
    const probe = deriveDirection({ ...input, adopted: tentative.slice(0, index), steps: 0 });
    startableByPrefix.set(index, new Set(probe.options.map((option) => option.node)));
  }

  let cursor = 0;
  for (const entry of entries) {
    const title = titles.get(entry.node) ?? entry.node;
    const inCore = coreNodes.has(entry.node);
    if (known.has(entry.node)) {
      steps.push({ node: entry.node, title, at: entry.at, status: 'confirmed', inCore });
      continue;
    }
    if (!titles.has(entry.node)) {
      steps.push({ node: entry.node, title, at: entry.at, status: 'stale', inCore });
      continue;
    }
    const ok = startableByPrefix.get(cursor)?.has(entry.node) === true;
    cursor += 1;
    if (!ok) {
      steps.push({ node: entry.node, title, at: entry.at, status: 'stale', inCore });
      continue;
    }
    adopted.push(entry.node);
    steps.push({ node: entry.node, title, at: entry.at, status: 'adopted', inCore });
  }
  return steps;
}

/**
 * 学习方向的读写与派生。
 *
 * `learning` 来自 `useLearningData()`（本体图 + θ + 方向）；本 hook 不再单独取数，
 * 因此「位置 / 下一步」与页面其它计数永远来自同一帧的同一份 E 层状态。
 *
 * 旧账本继续保留为计划历史；当前可学集合只从已确认的 θ 推导。
 * `extraAdopted` 参数为旧调用兼容保留，浏览节点不会解锁真实后续节点。
 */
/**
 * 空数组常量：作为 `extraAdopted` 的默认值时**必须是同一个引用**。
 *
 * 写成 `= []` 每次调用都会新建一个数组，`useMemo` 的依赖跟着每次变，
 * 于是每渲染一次都要重算整张选项表（231 节点上这是实打实的开销）。
 */
const NO_EXTRA_ADOPTED: string[] = [];

export function useDirection(
  profileId: string | null,
  learning: LearningData,
  _extraAdopted: string[] = NO_EXTRA_ADOPTED,
  /**
   * 本机旧学法偏好作为兼容回退，已保存的档案方案设置优先。
   */
  mood: string | null = null,
): DirectionState {
  const [decisions, setDecisions] = useState<DecisionEntry[]>(() => readDecisions(profileId));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 切档案换账本：账本按档案分开，不能串。
  useEffect(() => { setDecisions(readDecisions(profileId)); setError(null); }, [profileId]);

  const graph = learning.graph;
  const theta = learning.theta;
  const directions = learning.directions;

  const baseInput: DirectionInput | null = useMemo(() => (
    graph
      ? {
        nodes: graph.nodes, actions: graph.actions, relations: graph.relations,
        theta, directions: learning.learningPlan?.primaryGoal
          ? [learning.learningPlan.primaryGoal] : directions.map((item) => item.nodeId),
        mood: learning.learningPlan?.mood ?? mood,
        interests: learning.learningPlan?.interests ?? [],
      }
      : null
  ), [graph, theta, directions, mood, learning.learningPlan]);

  const report = useMemo(() => (
    baseInput ? deriveDirection(baseInput) : null
  ), [baseInput]);

  const path = useMemo(() => {
    if (!baseInput || !report) return [] as DirectionPathStep[];
    const titles = new Map(graph?.nodes.map((node) => [node.id, node.title]) ?? []);
    const known = new Set(theta?.known.map((entry) => entry.node) ?? []);
    return explainPath(decisions, { ...baseInput, steps: 0 }, known, titles, new Set(report.core.nodes));
  }, [baseInput, report, decisions, graph, theta]);

  const declare = useCallback(async (nodeId: string, note?: string) => {
    if (!profileId) return false;
    setBusy(true);
    try {
      await api(`/profiles/${profileId}/directions`, { method: 'POST', body: { nodeId, note: note ?? null } });
      setError(null);
      await learning.reload();
      return true;
    } catch (reason) {
      setError(formatError(reason));
      return false;
    } finally {
      setBusy(false);
    }
  }, [profileId, learning]);

  const withdraw = useCallback(async (directionId: string) => {
    if (!profileId) return false;
    setBusy(true);
    try {
      await api(`/profiles/${profileId}/directions/${directionId}`, { method: 'DELETE' });
      setError(null);
      await learning.reload();
      return true;
    } catch (reason) {
      setError(formatError(reason));
      return false;
    } finally {
      setBusy(false);
    }
  }, [profileId, learning]);

  const adopt = useCallback((nodeId: string) => {
    setDecisions((current) => {
      if (current.some((entry) => entry.node === nodeId)) return current;
      const next = [...current, { node: nodeId, at: new Date().toISOString() }];
      if (profileId) writeDecisions(profileId, next);
      return next;
    });
  }, [profileId]);

  const rewind = useCallback((index: number) => {
    setDecisions((current) => {
      const next = current.slice(0, Math.max(0, index));
      if (profileId) writeDecisions(profileId, next);
      return next;
    });
  }, [profileId]);

  const clear = useCallback(() => {
    setDecisions(() => {
      if (profileId) writeDecisions(profileId, []);
      return [];
    });
  }, [profileId]);

  const directionIdFor = useCallback(
    (nodeId: string) => directions.find((item) => item.nodeId === nodeId)?.directionId ?? null,
    [directions],
  );

  return { report, decisions, path, error, busy, declare, withdraw, directionIdFor, adopt, rewind, clear };
}

/** 当前方向（列表里的第一个），没有则 null。 */
export function currentDirection(directions: LearningDirectionView[]): LearningDirectionView | null {
  return directions[0] ?? null;
}

/** 选项的一句话依据：界面与验收读同一句（`direction.ts` 的 `optionBasis`）。 */
export function basisOf(option: RankedOption, titleOf: (id: string) => string, locale: 'zh' | 'en'): string {
  return optionBasis(option, titleOf, locale);
}

export type { Attempt };
