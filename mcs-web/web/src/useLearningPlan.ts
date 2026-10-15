import { useEffect, useMemo, useRef, useState } from 'react';
import { api, formatError } from './api';
import { useProfileContext } from './state';
import type { LearningData } from './useLearningData';
import { readPreferences } from './start-preferences';
import {
  EMPTY_LEARNING_PLAN, normalizeLearningPlan, scheduleLearningSteps,
  type LearningPlanPreview, type LearningPlanState, type LearningPlanView,
} from '../../shared/learning-plan.mjs';

const GUEST_KEY = 'mcs-learning-plan-guest-v1';
function guestPlan(): LearningPlanState {
  try {
    const saved = localStorage.getItem(GUEST_KEY);
    if (saved) return normalizeLearningPlan(JSON.parse(saved));
  } catch { /* storage may be unavailable */ }
  const legacy = readPreferences();
  return { ...EMPTY_LEARNING_PLAN, interests: legacy.interests, primaryGoal: legacy.aim, mood: legacy.mood, pace: legacy.pace };
}

export function useLearningPlan(learning: LearningData) {
  const { profileId, refreshProfiles } = useProfileContext();
  const [state, setState] = useState<LearningPlanState>(guestPlan);
  const [result, setResult] = useState<LearningPlanPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState(false);
  const generation = useRef(0);
  const profileRef = useRef(profileId);
  profileRef.current = profileId;
  const loadedProfile = useRef<string | null | undefined>(undefined);
  const savedRevision = useRef(-1);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!profileId) {
      if (loadedProfile.current !== null) { setState(guestPlan()); setResult(null); setError(null); setPreviewError(null); setPendingChanges(false); }
      loadedProfile.current = null; savedRevision.current = -1; savingRef.current = false; setSaving(false);
      return;
    }
    const saved = learning.learningPlan;
    if (!saved || learning.loading) return;
    if (loadedProfile.current !== profileId || savedRevision.current !== saved.revision) {
      if (loadedProfile.current !== profileId) { savingRef.current = false; setSaving(false); setResult(null); }
      const legacy = readPreferences();
      setState(saved.revision > 0 ? normalizeLearningPlan(saved) : {
        ...EMPTY_LEARNING_PLAN, primaryGoal: saved.primaryGoal, interests: legacy.interests, mood: legacy.mood, pace: legacy.pace,
      });
      loadedProfile.current = profileId; savedRevision.current = saved.revision; setError(null); setPreviewError(null); setPendingChanges(false);
    }
  }, [profileId, learning.learningPlan, learning.loading]);

  const knownKey = JSON.stringify(learning.theta?.known.map(entry => entry.node).sort() ?? []);
  const preferenceKey = JSON.stringify({ ...state, manualOrder: null });
  useEffect(() => {
    const current = ++generation.current;
    setResult(null);
    setPreviewError(null);
    if (!state.primaryGoal || !learning.graph || (profileId && (learning.loading || loadedProfile.current !== profileId))) { setLoading(false); return; }
    const controller = new AbortController();
    let jobId: string | null = null;
    let timer: ReturnType<typeof setTimeout>;
    setLoading(true);
    const run = async () => {
      try {
        const started = await api<{ job: { id: string } }>('/learning-plan-preview', {
          method: 'POST', body: { preferences: JSON.parse(preferenceKey), profileId: profileId ?? undefined, ontologyVersion: learning.graph?.version }, signal: controller.signal,
        });
        jobId = started.job.id;
        const deadline = Date.now() + 65000;
        while (!controller.signal.aborted) {
          const response = await api<{ job: { status: string; result: LearningPlanPreview; error?: { message: string } } }>(`/learning-plan-preview/${jobId}`, { signal: controller.signal });
          if (response.job.status === 'done') {
            if (current === generation.current) { setResult(response.job.result); setPreviewError(null); }
            break;
          }
          if (['error', 'cancelled'].includes(response.job.status)) throw new Error(response.job.error?.message ?? 'Learning plan calculation stopped');
          if (Date.now() > deadline) throw new Error('Learning plan calculation timed out');
          await new Promise<void>(resolve => {
            const stop = () => { clearTimeout(timer); resolve(); };
            timer = setTimeout(() => { controller.signal.removeEventListener('abort', stop); resolve(); }, 350);
            controller.signal.addEventListener('abort', stop, { once: true });
          });
        }
      } catch (reason) {
        if (!controller.signal.aborted && current === generation.current) setPreviewError(formatError(reason));
      } finally { if (current === generation.current) setLoading(false); }
    };
    timer = setTimeout(() => { void run(); }, 160);
    return () => {
      controller.abort(); clearTimeout(timer);
      if (jobId) void api(`/learning-plan-preview/${jobId}`, { method: 'DELETE' }).catch(() => {});
    };
  }, [preferenceKey, knownKey, profileId, learning.graph?.version, Boolean(learning.graph), learning.loading]);

  const preview = useMemo(() => result ? {
    ...result, ...scheduleLearningSteps(result.steps, result.edges, state, result),
  } : null, [result, state]);

  const update = async (patch: Partial<LearningPlanState>) => {
    if (savingRef.current) return false;
    if (profileId && (learning.loading || !learning.learningPlan || loadedProfile.current !== profileId)) return false;
    const baseRevision = learning.learningPlan?.revision ?? 0;
    const next = normalizeLearningPlan({ ...state, ...patch });
    const targetProfile = profileId;
    setState(next); setError(null);
    if (!targetProfile) {
      try { localStorage.setItem(GUEST_KEY, JSON.stringify(next)); } catch { /* visible preview still works */ }
      return true;
    }
    setPendingChanges(true);
    setSaving(true);
    savingRef.current = true;
    try {
      const saved = await api<{ plan: LearningPlanView }>(`/profiles/${targetProfile}/learning-plan`, {
        method: 'PUT', body: { ...next, baseRevision, ontologyVersion: learning.graph?.version },
      });
      if (profileRef.current !== targetProfile) return true;
      savedRevision.current = saved.plan.revision;
      setPendingChanges(false);
      await learning.reload(); await refreshProfiles();
      return true;
    } catch (reason) {
      if (profileRef.current === targetProfile) setError(formatError(reason));
      return false;
    } finally { if (profileRef.current === targetProfile) { savingRef.current = false; setSaving(false); } }
  };
  const guestDraft = guestPlan();
  const profilePending = Boolean(profileId && loadedProfile.current !== profileId);
  return { state: profilePending ? EMPTY_LEARNING_PLAN : state, preview: profilePending ? null : preview, loading,
    saving: saving || Boolean(profileId && learning.loading), pendingChanges,
    error: error ?? previewError ?? learning.error, update, profileId, reload: learning.reload,
    guestDraft: guestDraft.primaryGoal ? guestDraft : null };
}
export type LearningPlanController = ReturnType<typeof useLearningPlan>;
