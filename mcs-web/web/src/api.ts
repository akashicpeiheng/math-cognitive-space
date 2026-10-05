import { useCallback, useEffect, useRef, useState } from 'react';

const BASE = '/api/v2';

/**
 * 写请求的 CSRF 令牌（2026-10 加，公网模式的账号层）。
 *
 * `server/auth.mjs` 的 `checkCsrf` 要求**每一个**写请求带 `x-mcs-csrf`，
 * 值取自 `GET /api/v2/auth/session` 的 `csrfToken`；漏了就是 403 `CSRF_REJECTED`。
 * 令牌必须能被所有调用方共用到，所以它只能住在这里——逐个调用点传令牌
 * 迟早会漏（漏的那一处报的是「页面验证已失效」，与真正的原因对不上）。
 *
 * **本机模式令牌恒为 `null`，此时一个头也不多发**：本机模式没有账号，
 * `server/api.mjs` 走的是 `checkWriteOrigin` 那条分支，收不到的多余头毫无意义，
 * 而「本机模式行为完全不变」正是这一层最硬的约束。
 *
 * 模块级可变状态是有意为之：`api()` 被几十处直接调用，把令牌做成参数
 * 就要改所有调用点。写入只有 `AuthProvider` 一处（见 `auth.tsx`）。
 */
let csrfToken: string | null = null;

/** 由 `AuthProvider` 在拿到/失去会话时调用；传 `null` 即恢复「不带令牌」。 */
export function setCsrfToken(value: string | null) {
  csrfToken = value && value.trim() ? value : null;
}

/** 只读出口（调试与测试用）：当前是否处于「会带 CSRF 令牌」的状态。 */
export function getCsrfToken(): string | null {
  return csrfToken;
}

/** 只读方法：这些方法不带 CSRF 令牌（与 `server/api.mjs` 的 `WRITE_METHODS` 互补）。 */
const READ_METHODS = new Set(['GET', 'HEAD']);

export class ApiError extends Error {
  code: string;
  details?: unknown;
  status: number;

  constructor(message: string, code = 'INTERNAL', status = 500, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface ApiOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  /*
   * 非 GET/HEAD 一律带上 CSRF 令牌（公网模式）；本机模式 `csrfToken` 是 null，
   * 这里一个键都不加——`fetch` 收到的头与从前逐字相同。
   */
  if (!READ_METHODS.has(method.toUpperCase()) && csrfToken) headers['x-mcs-csrf'] = csrfToken;
  const response = await fetch(BASE + path, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    throw new ApiError(payload?.error?.message ?? `请求失败（${response.status}）`, payload?.error?.code ?? 'INTERNAL', response.status, payload?.error?.details);
  }
  return payload.data as T;
}

/**
 * 「功能尚未就绪」与其它失败的区分。
 *
 * `server/api.mjs` 用懒加载装载自动关系发现的模块：模块缺失或损坏时抛
 * `ONTOLOGY_INVALID`，并把 `{ specifier, reason }` 放进 `error.details`；
 * 路由本身没登记则是 404/405；服务没起来则是连不上。这三种**都不是**「换个请求就好」，
 * 页面必须如实显示成「功能尚未就绪 + 具体原因」，既不能假装成功，也不能把失败
 * 静默当成「没有结果」——那样读者会以为「没找到关系」是数学结论。
 *
 * 这个判定只描述**可用性**，不描述数学：未就绪不等于命题未决，也不等于命题为假。
 */
export interface UnavailableInfo {
  kind: 'module' | 'route' | 'offline';
  code: string;
  message: string;
  /** 服务端指明是哪个模块没装载（例如 `../core/formal/language.mjs`）。 */
  specifier: string | null;
  /** 装载失败的原始原因（读不到文件、语法错误…）。 */
  reason: string | null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) if (typeof value === 'string' && value.trim()) return value;
  return null;
}

/** 未就绪时给出一句话说明；就绪或无法归类时返回 null。 */
export function unavailableInfo(error: unknown): UnavailableInfo | null {
  if (error instanceof ApiError) {
    const details = (error.details && typeof error.details === 'object' ? error.details : {}) as Record<string, unknown>;
    const specifier = firstString(details.specifier, details.module);
    const reason = firstString(details.reason, details.cause);
    if (error.code === 'ONTOLOGY_INVALID') {
      return { kind: 'module', code: error.code, message: error.message, specifier, reason };
    }
    /*
     * 「路由没登记」与「资源不存在」要分开说（2026-10 修）。
     *
     * 后端未知路径返回 `NOT_FOUND`(404)，而 `UNKNOWN_NODE` / `UNKNOWN_PROFILE` /
     * `UNKNOWN_SESSION` **同样是 404**——它们是业务结果，不是版本不匹配。
     * 从前一律按状态码判 route，于是「这个节点不存在」被显示成
     * 「服务端还没有这个接口（UNKNOWN_NODE）：本机服务版本可能落后于页面」，
     * 把用户引向完全错误的方向。
     */
    if (error.code === 'NOT_FOUND' || error.status === 405) {
      return { kind: 'route', code: error.code, message: error.message, specifier, reason };
    }
    return null;
  }
  if (error instanceof TypeError) {
    return { kind: 'offline', code: 'OFFLINE', message: '请求没有到达服务器：本机服务可能未启动。', specifier: null, reason: error.message };
  }
  return null;
}

/** 一次请求的结果信封：调用方必须显式处理失败分支，避免「失败」被渲染成「空结果」。 */
export type Attempt<T> = { ok: true; data: T } | { ok: false; error: unknown; unavailable: UnavailableInfo | null };

export async function attempt<T>(path: string, options: ApiOptions = {}): Promise<Attempt<T>> {
  try {
    return { ok: true, data: await api<T>(path, options) };
  } catch (error) {
    return { ok: false, error, unavailable: unavailableInfo(error) };
  }
}

export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<ApiError | null>(null);
  const counter = useRef(0);
  const reload = useCallback(() => {
    counter.current += 1;
    const current = counter.current;
    if (!path) { setData(null); setLoading(false); setError(null); return () => {}; }
    const controller = new AbortController();
    setLoading(true);
    api<T>(path, { signal: controller.signal })
      .then((value) => { if (current === counter.current) { setData(value); setError(null); } })
      .catch((reason) => { if (current === counter.current && reason.name !== 'AbortError') setError(reason instanceof ApiError ? reason : new ApiError(String(reason))); })
      .finally(() => { if (current === counter.current) setLoading(false); });
    return () => controller.abort();
  }, [path, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => reload(), [reload]);
  return { data, loading, error, reload };
}

export function formatError(error: unknown): string {
  if (error instanceof ApiError) return `${error.message}${error.code ? `（${error.code}）` : ''}`;
  return String(error);
}
