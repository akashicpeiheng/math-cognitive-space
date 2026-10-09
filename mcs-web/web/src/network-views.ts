import { api } from './api';

export const LOCAL_VIEWS_KEY = 'mcs-network-views-local-v1';

export interface SavedNetworkView {
  viewId: string;
  name: string;
  payload: {
    added?: string[];
    families?: string[];
    positions?: Record<string, { x: number; y: number }>;
    camera?: { x: number; y: number; scale: number } | null;
  };
  updatedAt: string;
  local?: boolean;
}

/** Invalid storage must remain untouched: an unreadable list is not an empty list. */
export function readLocalViews(): SavedNetworkView[] {
  const raw = localStorage.getItem(LOCAL_VIEWS_KEY);
  const views: unknown = raw === null ? [] : JSON.parse(raw);
  if (!Array.isArray(views) || views.some((view) =>
    !view || typeof view !== 'object' || typeof view.viewId !== 'string'
    || typeof view.name !== 'string' || !view.payload || typeof view.payload !== 'object'
    || Array.isArray(view.payload))) throw new Error('Invalid saved views');
  return views;
}

export function writeLocalViews(views: SavedNetworkView[]) {
  localStorage.setItem(LOCAL_VIEWS_KEY, JSON.stringify(views));
}

/** Compare all four snapshot fields, allowing only the server's documented normalization. */
function snapshotKey(view: SavedNetworkView): string {
  const { added = [], families = [], positions = {}, camera = null } = view.payload;
  return JSON.stringify({
    name: view.name.trim().slice(0, 80),
    added: [...new Set(added)].sort(),
    families: [...new Set(families)].sort(),
    positions: Object.entries(positions).sort(([a], [b]) => a.localeCompare(b)).map(([id, point]) =>
      [id, Math.round(point.x * 100) / 100, Math.round(point.y * 100) / 100]),
    camera: camera && { x: camera.x, y: camera.y, scale: camera.scale },
  });
}

/**
 * Copy → read back → remove only the unchanged local source.
 * Matching remote snapshots make a retry safe even if a POST reply was lost.
 * The profile revision also rejects competing writes from another tab.
 */
export async function migrateLocalViews(
  profileId: string,
  signal: AbortSignal,
  onProgress: (completed: number) => void,
) {
  const path = `/profiles/${encodeURIComponent(profileId)}`;
  const source = readLocalViews();
  let completed = 0;
  for (const entry of source) {
    signal.throwIfAborted();
    const { profile } = await api<{ profile: { revision: number } }>(path, { signal });
    const { views } = await api<{ views: SavedNetworkView[] }>(`${path}/network-views`, { signal });
    const key = snapshotKey(entry);
    let target = views.find((view) => snapshotKey(view) === key);
    if (!target) {
      ({ view: target } = await api<{ view: SavedNetworkView }>(`${path}/network-views`, {
        method: 'POST', body: { name: entry.name, payload: entry.payload, baseRevision: profile.revision }, signal,
      }));
    }
    const readBack = await api<{ views: SavedNetworkView[] }>(`${path}/network-views`, { signal });
    signal.throwIfAborted();
    if (!readBack.views.some((view) => view.viewId === target.viewId && snapshotKey(view) === key)) {
      throw new Error('Saved view could not be verified');
    }
    // Re-read: another tab may have saved or renamed a local view during the request.
    const current = readLocalViews();
    writeLocalViews(current.filter((view) =>
      view.viewId !== entry.viewId || JSON.stringify(view) !== JSON.stringify(entry)));
    onProgress(++completed);
  }
  return completed;
}
