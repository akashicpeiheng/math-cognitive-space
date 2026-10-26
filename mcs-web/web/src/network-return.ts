/**
 * 「从网络视图打开这个节点」的返回上下文（2026-10 加）。
 *
 * ## 它解决什么
 *
 * 网络视图的状态几乎全在 URL 上：`?nodes=` 是已加入的节点，`play/entry/path/goal/route`
 * 是结构回放。从网络点进节点页之后那条查询串就丢了——用户走完一圈回来，
 * 面对的是**另一张图**（回到 `/network` 的空网络，而不是他刚拼好的那张）。
 *
 * 因此点进节点时把「我是从哪张图来的」记下来，节点页据此给一个**确定能回到同一张图**的入口。
 *
 * ## 存在哪，为什么
 *
 * | 存什么 | 存在哪 | 理由 |
 * |---|---|---|
 * | 网络视图的 URL 快照（去掉了 `from` 与 `locale` 这类与图无关的参数） | `sessionStorage`，按节点 id 分开 | 它是**一次浏览会话的上下文**，不是学习记录：关掉标签页就该结束。写进 URL 会让节点链接长得无法分享，写进 E 会污染学习事件 |
 * | 「从哪来」这一个事实 | URL 上的 `?from=network` | 它必须能分享、能在刷新后保留（刷新后仍然应该看到「回到网络视图」） |
 *
 * 与 `route-reading.ts` 同一套取舍（那边也存 sessionStorage、URL 只带短 id）。
 *
 * ## 边界（如实说明，不假装知道）
 *
 * - URL 里**只有 `?from=network`、没有会话记录**时（换设备、分享链接、清了会话），
 *   返回链接**不编一个假地址**：它退成「在网络视图里打开这个节点」（`/network?nodes=<id>`），
 *   并把这件事写在界面上。这正是「如实登记」而不是「装作知道」。
 * - 只保存**与图有关**的参数（`nodes` 与回放六件套），其余一律不进快照。
 * - 快照按节点 id 分开（换一个节点就有它自己的来路），最多留 `KEEP` 条，先进先出。
 */

/*
 * 带 `.ts` 后缀：这个文件被 node 测试直接 import（`tests/network-return.test.mjs`），
 * 而 node 的类型剥离不做扩展名补全（与 `starting-nodes.ts` / `network.ts` 同一条理由）。
 */
import { stripLocale, withLocale } from './i18n/paths.ts';
import { networkUrlParts } from './network-url.ts';
import type { Locale } from './i18n/locales.ts';
import type { NetworkExtras } from '../../shared/network-workspace.mjs';
export interface NetworkReturnSnapshot extends NetworkExtras { added: string[]; families: string[]; positions: Record<string, { x: number; y: number }>; camera: { x: number; y: number; scale: number } }

/**
 * 网络视图 URL 上**与图有关**的参数：`nodes` 与结构回放的六件套。
 *
 * `stages` 是 2026-10-15 随「多程合一图」加的：它记「第几步属于哪一程」，
 * 与 `path` 是一件事的两半——点进某个节点再回来时，程名与程的起点标记要跟着回来。
 */
export const NETWORK_PARAM_KEYS = ['nodes', 'play', 'entry', 'path', 'goal', 'route', 'stages','contentCase','layer','preset','relation'] as const;

/** 节点页 URL 上标记来路的参数：`?from=network`。 */
export const FROM_PARAM = 'from';
export const FROM_NETWORK = 'network';

const STORAGE_KEY = 'mcs-network-return-v1';
const KEEP = 10;

export interface NetworkReturnContext {
  snapshot?: NetworkReturnSnapshot;
  /** 发起跳转时所在的网络视图 URL（含查询串）。 */
  href: string;
  /** 是不是用**另一种语种**存的（存的是 `/en/network…`、当前却在中文站）。 */
  locale: Locale;
  at: string;
}

type Store = Record<string, NetworkReturnContext>;

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try { return window.sessionStorage; } catch { return null; }
}

function readAll(): Store {
  const store = storage();
  if (!store) return {};
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Store = {};
    for (const [node, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const entry = value as Partial<NetworkReturnContext>;
      if (typeof entry.href !== 'string' || !entry.href) continue;
      out[node] = { href: entry.href, locale: entry.locale === 'en' ? 'en' : 'zh', at: typeof entry.at === 'string' ? entry.at : '', ...(entry.snapshot ? { snapshot: entry.snapshot } : {}) };
    }
    return out;
  } catch { return {}; }
}

function writeAll(next: Store): void {
  const store = storage();
  if (!store) return;
  try {
    /* 只留最近 KEEP 条：这是浏览上下文，不是档案（先进先出，不做 LRU 统计）。 */
    const entries = Object.entries(next).sort((a, b) => a[1].at.localeCompare(b[1].at));
    while (entries.length > KEEP) {
      const dropped = entries.shift();
      if (dropped) delete next[dropped[0]];
    }
    store.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch { /* 隐私模式：返回链接退成「在网络视图里打开」那一档 */ }
}

/**
 * 从一份 URLSearchParams 里挑出**与图有关**的参数，拼成可保存的查询串。
 *
 * 不保存 `from`（那是来路标记本身）与 `locale`（语种由页面决定，见 `networkReturnHref`）。
 */
export function networkSearchOf(params: URLSearchParams | null): string {
  if (!params) return '';
  const kept = new URLSearchParams();
  for (const key of NETWORK_PARAM_KEYS) {
    const value = params.get(key);
    if (value !== null && value !== '') kept.set(key, value);
  }
  return kept.toString();
}

/** 记住「这个节点是从网络视图的这张图里打开的」。 */
export function rememberNetworkReturn(nodeId: string, params: URLSearchParams | null, locale: Locale = 'zh', snapshot?: NetworkReturnSnapshot): void {
  if (!nodeId) return;
  const search = networkSearchOf(params);
  const parts = networkUrlParts(new URLSearchParams(search));
  const all = readAll();
  all[nodeId] = {
    href: withLocale(`/network${parts.search}${parts.hash}`, locale),
    locale,
    at: new Date().toISOString(),
    ...(snapshot ? { snapshot } : {}),
  };
  writeAll(all);
}

export function restoreNetworkReturn(nodeId: string) {
  const entry = readNetworkReturn(nodeId);
  if (entry?.snapshot) try { storage()?.setItem('mcs-network-pending-return-v2', JSON.stringify(entry)); } catch { /* unavailable session storage */ }
}
export function consumeNetworkReturn(nodes: string[]): NetworkReturnSnapshot | null {
  const store = storage();
  try {
    const raw = store?.getItem('mcs-network-pending-return-v2'); if (!raw) return null;
    store?.removeItem('mcs-network-pending-return-v2');
    const entry = JSON.parse(raw) as NetworkReturnContext, snapshot = entry.snapshot;
    return snapshot && JSON.stringify([...snapshot.added].sort()) === JSON.stringify([...nodes].sort()) ? snapshot : null;
  } catch { return null; }
}

/**
 * 构造「从网络视图点进节点」的站内路径：`/nodes/<id>?from=network`。
 *
 * 只带一个短标记（`?from=network`），不带图的快照——快照在会话里。
 * 节点页原有的查询参数（例如路线阅读的 `route`/`step`）会保留：它们是**节点页自己的状态**。
 */
export function networkNodeHref(nodeId: string, currentSearch?: string): string {
  const own = new URLSearchParams(currentSearch ?? '');
  own.delete(FROM_PARAM);
  own.set(FROM_PARAM, FROM_NETWORK);
  const section=nodeId.startsWith('obj:')?'objects':nodeId.startsWith('learn:')?'learning-nodes':'nodes';
  return `/${section}/${encodeURIComponent(nodeId)}?${own.toString()}`;
}

/** 读回某个节点的来路；没有（或坏数据）时返回 null，**不编一个**。 */
export function readNetworkReturn(nodeId: string): NetworkReturnContext | null {
  if (!nodeId) return null;
  const entry = readAll()[nodeId];
  return entry ?? null;
}

/** 快照是不是另一种语种的（返回链接要跟着当前语种走，否则英文站上会跳回中文图）。 */
export function localeOfNetworkHref(href: string): Locale {
  const path = href.split(/[?#]/)[0];
  return /^\/en(\/|$)/.test(path) ? 'en' : 'zh';
}

/**
 * 节点页上「回到网络视图」的最终地址。
 *
 * 三条规则：
 * 1. 有快照且语种一致 → 用快照（**同一张图**，含 `nodes` 与回放参数）；
 * 2. 有快照但语种不同 → 用同一个查询串重建当前语种的地址（中文存、英文看时不能跳回中文页）；
 * 3. 没有快照 → 返回 null，调用方退成「在网络视图里打开这个节点」。
 */
export function networkReturnHref(nodeId: string, locale: Locale): string | null {
  const entry = readNetworkReturn(nodeId);
  if (!entry) return null;
  const index = entry.href.search(/[?#]/);
  const search = index === -1 ? '' : entry.href.slice(index);
  if (localeOfNetworkHref(entry.href) === locale) {
    return withLocale(`${stripLocale(entry.href.split(/[?#]/)[0])}${search}`, locale);
  }
  return withLocale(`/network${search}`, locale);
}

/** 「在网络视图里打开这个节点」：不假装知道来路时用的降级入口。 */
export function openInNetworkHref(nodeId: string): string {
  return `/network?nodes=${encodeURIComponent(nodeId)}`;
}
