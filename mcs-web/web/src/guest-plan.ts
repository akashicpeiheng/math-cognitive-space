export interface GuestPlanDraft { goals: string[]; entries: Record<string, { kind: 'confirmed' | 'assumption' | 'unknown' }>; horizon: number; maxCandidates: number; strategyText: string; budgetMax: string }
const KEY = 'mcs-guest-path-plan-v1';
export function readGuestPlan(): Partial<GuestPlanDraft> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    const entries: GuestPlanDraft['entries'] = {};
    for (const [id, v] of Object.entries(raw.entries ?? {})) if (v && typeof v === 'object' && 'kind' in v && ['confirmed', 'assumption', 'unknown'].includes(String(v.kind))) entries[id] = { kind: v.kind as 'confirmed' | 'assumption' | 'unknown' };
    return { goals: Array.isArray(raw.goals) ? raw.goals.filter((s: unknown) => typeof s === 'string').slice(0, 100) : undefined, entries, horizon: Number.isInteger(raw.horizon) && raw.horizon >= 0 && raw.horizon <= 32 ? raw.horizon : undefined, maxCandidates: Number.isInteger(raw.maxCandidates) && raw.maxCandidates > 0 ? raw.maxCandidates : undefined, strategyText: typeof raw.strategyText === 'string' ? raw.strategyText : undefined, budgetMax: typeof raw.budgetMax === 'string' ? raw.budgetMax : undefined };
  } catch { return {}; }
}
export function saveGuestPlan(draft: GuestPlanDraft) { try { localStorage.setItem(KEY, JSON.stringify(draft)); } catch { /* Planning works without browser storage. */ } }
