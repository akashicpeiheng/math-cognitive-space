import { normalizeNetworkExtras } from '../../shared/network-workspace.mjs';
import type { NetworkExtras } from '../../shared/network-workspace.mjs';
/**
 * 网络视图的「本次学习」暂存（2026-10-13 加）。
 *
 * ## 它解决什么
 *
 * 网络视图的状态几乎全在 URL 上：`?nodes=` 是已加入的节点集合，`play/entry/path/goal/route`
 * 是结构回放。侧栏导航、浏览器历史、书签、直接输入地址**都不带查询串**，于是
 * 「搭好一张图 → 去别的页看一眼 → 点回知识网络」面对的是**空画布**，只能从头再搭一遍。
 *
 * 节点坐标、面板位置、排法这些早有本机存储（`mcs-network-positions-v1` 等），
 * 唯独「这一张图是什么」会丢。这里把「这一张图」按**一次学习的上下文**暂存下来，
 * 回到网络页且 URL 没有显式给出节点时自动放回去。
 *
 * ## 存在哪，为什么
 *
 * | 存什么 | 存在哪 | 理由 |
 * |---|---|---|
 * | 已加入节点 id、可见边源、相机 | `sessionStorage` 的 `mcs-network-draft-v1` | 它是**一次浏览会话的上下文**，不是学习记录也不是长期偏好：关掉标签页/窗口就该结束。写进 URL 会让每次拖动的地址栏都在变；写进 E（学习者档案）会污染学习事件；写进 `localStorage` 会让「上一次学习」跨天冒出来 |
 *
 * 与 `network-return.ts`（来路上下文）同一套取舍，两者都存会话、都不进 URL。
 * 但用途不同：那边回答「这个节点是从哪张图点进来的」（按节点 id 分开、给返回链接用），
 * 这边回答「我上次离开时画的是什么」（全局一条、给回访恢复用）。**两套的键不许混用**。
 *
 * ## 与「保存的视图」的边界（`network-views.ts`）
 *
 * 保存的视图是用户**手动命名**的长期快照（写 E 层或本机 `localStorage`，可导出、跨浏览器）；
 * 这里是**自动**的会话暂存，不进视图列表、不写 E、不产生学习事件。载入一张命名视图时
 * 会顺手清掉暂存 —— 显式动作胜过隐式恢复。
 *
 * ## 边界（如实说明，不假装知道）
 *
 * - 存储不可用（隐私模式、服务端渲染）时**读成「没有暂存」**，写与删静默无操作，绝不抛错：
 *   恢复能力降级，页面照常。
 * - 坏数据一律当「没有暂存」，且**不删原记录**（与 `readLocalViews` 同一条纪律：
 *   读不出来的列表不是空列表）。
 * - 未知的边源值在读取时丢掉：渲染期用 `EDGE_FAMILY_LABELS[family]` 取文案，留着未知值
 *   会让它落空。
 * - 空节点集合读成 `null`：空集合不是「一张图」。
 */

/*
 * 带 `.ts` 后缀：这个文件被 node 测试直接 import（`tests/network-draft.test.mjs`），
 * 而 node 的类型剥离不做扩展名补全（与 `network-return.ts` / `network-views.ts` 同一条理由）。
 */

export const NETWORK_DRAFT_KEY = 'mcs-network-draft-v1';

/**
 * 合法的边源键（七类边）。
 *
 * 这里**显式重列**而不是从 `network.ts` 的 `EDGE_FAMILY_LABELS` 推：本模块要能被 node 侧
 * 单独加载做单元测试，而 `network.ts` 是整张网络的派生层（不该为了七个字符串把它拖进来）。
 * 两处漂开的代价是「恢复了未知边源 → 渲染取不到文案」，因此
 * `tests/network-draft.test.mjs` 有一条断言逐字核对这两份列表。
 */
export const EDGE_FAMILY_KEYS = [
  'contract', 'relation', 'topic', 'pattern', 'sharedInput', 'evidence', 'support',
] as const;

export interface DraftCamera {
  x: number;
  y: number;
  scale: number;
}

export interface DraftScale {
  levels: string[];
  added: string[];
  split: string[];
  autoMerge: boolean;
  positions?: Record<string, { x: number; y: number }>;
  version: string | null;
}

export interface NetworkDraft extends NetworkExtras {
  /** 已加入的节点 id，按写入时的次序原样保留。 */
  added: string[];
  /** 可见边源；无法识别的值已在读取时丢掉。 */
  families: string[];
  /** 离开时的相机（平移 + 缩放）；形状不合法时为 `null`，调用方按「没有相机」处理。 */
  camera: DraftCamera | null;
  /** 尺度视图状态；没有用尺度视图时不写。 */
  scale?: DraftScale;
  /** 写入时刻（ISO 字符串），供调试与界面说明用。 */
  at: string;
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try { return window.sessionStorage; } catch { return null; }
}

/** 只留合法边源，丢重复；保持传入次序。 */
export function normalizeDraftFamilies(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const allowed = new Set<string>(EDGE_FAMILY_KEYS);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string' || !allowed.has(value) || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

/** 相机形状核对：三个数都必须是有限数，缩放必须为正。 */
export function normalizeDraftCamera(value: unknown): DraftCamera | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const camera = value as Partial<DraftCamera>;
  if (typeof camera.x !== 'number' || !Number.isFinite(camera.x)) return null;
  if (typeof camera.y !== 'number' || !Number.isFinite(camera.y)) return null;
  if (typeof camera.scale !== 'number' || !Number.isFinite(camera.scale) || camera.scale <= 0) return null;
  return { x: camera.x, y: camera.y, scale: camera.scale };
}

const SCALE_LEVELS = ['molecule', 'node', 'unit', 'topic'];
const idList = (value: unknown, limit: number) => Array.isArray(value)
  ? [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 300))].slice(0, limit)
  : [];

/** 只留合法尺度层级与 id 列表；不是对象或缺层级时当作「没有尺度状态」。 */
export function normalizeDraftScale(value: unknown): DraftScale | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Partial<DraftScale>;
  const levels = Array.isArray(record.levels) ? SCALE_LEVELS.filter((level) => record.levels!.includes(level)) : [];
  if (levels.length === 0) return null;
  const positions: Record<string, { x: number; y: number }> = {};
  const rawPositions = record.positions && typeof record.positions === 'object' && !Array.isArray(record.positions) ? record.positions : {};
  for (const [id, point] of Object.entries(rawPositions).slice(0, 500)) {
    if (!point || typeof point !== 'object' || Array.isArray(point)) continue;
    const x = Number((point as { x?: unknown }).x); const y = Number((point as { y?: unknown }).y);
    if (Number.isFinite(x) && Number.isFinite(y)) positions[id] = { x, y };
  }
  return {
    levels,
    added: idList(record.added, 500),
    split: idList(record.split, 500),
    autoMerge: record.autoMerge !== false,
    ...(Object.keys(positions).length ? { positions } : {}),
    version: typeof record.version === 'string' ? record.version.slice(0, 120) : null,
  };
}

/**
 * 读回暂存。没有、读不出来、形状不对、或节点集合为空时返回 `null`。
 *
 * **不删除坏记录**：读不出来的暂存不是「没有暂存」，删掉就没法排查了。
 */
export function readNetworkDraft(): NetworkDraft | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(NETWORK_DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const record = parsed as Partial<NetworkDraft>;
    if (!Array.isArray(record.added)) return null;
    const added = record.added.filter((id): id is string => typeof id === 'string' && id.length > 0);
    if (added.length === 0) return null;
    return {
      ...normalizeNetworkExtras(record),
      added,
      families: normalizeDraftFamilies(record.families),
      camera: normalizeDraftCamera(record.camera),
      ...(normalizeDraftScale(record.scale) ? { scale: normalizeDraftScale(record.scale)! } : {}),
      at: typeof record.at === 'string' ? record.at : '',
    };
  } catch {
    return null;
  }
}

/** 写入暂存。存储不可用或配额满时静默放弃（恢复能力降级，页面照常）。 */
export function writeNetworkDraft(draft: NetworkExtras & {
  added: readonly string[];
  families: readonly string[];
  camera?: DraftCamera | null;
  scale?: DraftScale | null;
}): void {
  const store = storage();
  if (!store) return;
  try {
    const payload: NetworkDraft = {
      ...normalizeNetworkExtras(draft as unknown as Record<string, unknown>),
      added: draft.added.filter((id) => typeof id === 'string' && id.length > 0),
      families: normalizeDraftFamilies(draft.families),
      camera: normalizeDraftCamera(draft.camera ?? null),
      ...(normalizeDraftScale(draft.scale) ? { scale: normalizeDraftScale(draft.scale)! } : {}),
      at: new Date().toISOString(),
    };
    store.setItem(NETWORK_DRAFT_KEY, JSON.stringify(payload));
  } catch { /* 隐私模式或配额满：这一次没有暂存，不影响画布 */ }
}

/** 丢掉暂存（「丢弃暂存，重新开始」，或载入一张命名的视图）。 */
export function clearNetworkDraft(): void {
  const store = storage();
  if (!store) return;
  try { store.removeItem(NETWORK_DRAFT_KEY); } catch { /* 隐私模式：忽略 */ }
}
