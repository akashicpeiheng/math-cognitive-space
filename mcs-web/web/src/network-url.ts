/**
 * URL 参数读取与「长参数进 fragment」的唯一实现。
 *
 * 为什么 `nodes`/`scaleNodes`/`split` 可能进 fragment：它们在「整张图 + 多个尺度对象」
 * 的情况下可以很长，而 fragment 不会进入 HTTP 请求行/头；服务端与静态托管的 7KB 限制
 * 因此碰不到它们。读取时 search 与 hash 都认，写入时按同一阈值搬家。
 */
export function networkParam(search: URLSearchParams, hash: string, name: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, '')).get(name) ?? search.get(name);
}

/** Long node lists belong in a fragment: fragments never enter an HTTP request. */
export function networkNodeIds(search: URLSearchParams, hash = ''): string {
  return networkParam(search, hash, 'nodes') ?? '';
}

const FRAGMENT_KEYS = ['nodes', 'scaleNodes', 'split'] as const;

export function networkUrlParts(params: URLSearchParams): { search: string; hash: string } {
  const next = new URLSearchParams(params);
  if (next.toString().length <= 7000) return { search: next.toString() ? `?${next}` : '', hash: '' };
  const fragment = new URLSearchParams();
  for (const key of FRAGMENT_KEYS) {
    const value = next.get(key);
    if (!value) continue;
    fragment.set(key, value);
    next.delete(key);
  }
  return { search: next.toString() ? `?${next}` : '', hash: fragment.toString() ? `#${fragment}` : '' };
}
