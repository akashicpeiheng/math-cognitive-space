/** Long node lists belong in a fragment: fragments never enter an HTTP request. */
export function networkNodeIds(search: URLSearchParams, hash = ''): string {
  return new URLSearchParams(hash.replace(/^#/, '')).get('nodes') ?? search.get('nodes') ?? '';
}
export function networkUrlParts(params: URLSearchParams): { search: string; hash: string } {
  const next = new URLSearchParams(params);
  if (next.toString().length <= 7000) return { search: next.toString() ? `?${next}` : '', hash: '' };
  const fragment = new URLSearchParams();
  const nodes = next.get('nodes');
  if (nodes) { fragment.set('nodes', nodes); next.delete('nodes'); }
  return { search: next.toString() ? `?${next}` : '', hash: fragment.toString() ? `#${fragment}` : '' };
}
