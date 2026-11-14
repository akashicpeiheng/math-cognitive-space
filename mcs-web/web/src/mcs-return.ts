import type { McsViewState } from '../../shared/mcs-view.mjs';

const key = 'mcs:note-return/1';
interface McsReturn { href: string; state: McsViewState }
export function rememberMcsReturn(state: McsViewState) {
  try { sessionStorage.setItem(key, JSON.stringify({ href: location.pathname + location.search + location.hash, state })); }
  catch { /* Normal browser Back and the locally saved graph remain available. */ }
}
export function readMcsReturn(): McsReturn | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    return value?.state?.schema === 'mcs-view-state/2' && typeof value.href === 'string' && /^\/(?:en\/)?mcs(?:[?#]|$)/.test(value.href) ? value : null;
  } catch { return null; }
}
