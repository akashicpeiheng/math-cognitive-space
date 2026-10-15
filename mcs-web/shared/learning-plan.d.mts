export interface LearningPlanState {
  primaryGoal: string | null;
  interests: string[];
  branches: string[];
  pace: 'small' | 'block' | 'checkpoint' | 'free' | null;
  mood: 'base' | 'example' | 'apply' | 'any' | null;
  manualOrder: { ontologyVersion: string; graphHash: string; steps: string[] } | null;
}
export interface LearningPlanView extends LearningPlanState { revision: number; updatedAt?: string; }
export interface LearningPlanStep {
  key: string; eventId: string; actionId: string; node: string; discipline: string; construct: string;
  lane: 'main' | 'branch'; requires: string[]; hardPrereqs: string[]; ready: boolean; unlocks: number;
}
export interface LearningPlanPreview {
  primaryGoal: string | null; primaryComplete: boolean; milestone: string | null; ontologyVersion: string; graphHash: string;
  status: string; steps: LearningPlanStep[]; order: string[]; edges: [string, string][];
  background: string[]; currentReady: string[]; pending: string[]; unresolved: string[];
  roadmap: { node: string; level: number; requires: string[] }[]; truncated: boolean; staleManual: boolean;
  deferredBranches: string[]; search: { complete: boolean; reasons: string[] };
}
export const EMPTY_LEARNING_PLAN: Readonly<LearningPlanState>;
export const LEARNING_PREVIEW_STEPS: number;
export function normalizeLearningPlan(raw?: unknown): LearningPlanState;
export function validateLearningOrder(steps: Pick<LearningPlanStep, 'key'>[], edges: [string, string][], order: string[]): { valid: boolean; reason: string | null; blockers: [string, string][] };
export function scheduleLearningSteps(steps: LearningPlanStep[], edges: [string, string][], preferences?: Partial<LearningPlanState>, context?: { ontologyVersion?: string; graphHash?: string }): { order: string[]; unresolved: string[]; staleManual: boolean };
export function moveLearningStep(steps: Pick<LearningPlanStep, 'key'>[], edges: [string, string][], order: string[], key: string, targetIndex: number): { valid: boolean; reason: string | null; blockers: [string, string][]; order: string[] };
