import type { ObjectScale, ObjectRef, LeanBinding, MathObjectRecord } from './content-documents.mjs';
export const FORMAL_TEMPLATE_ID: string;
export const FORMAL_TEMPLATE_VERSION: string;
export const FORMAL_TEMPLATE_SCALES: readonly ObjectScale[];
export interface MathObjectTemplateData {
  schema?: 'mcs-object/1'; id?: string; version?: string; title?: string;
  language?: string; grammar?: string; scale?: ObjectScale;
  context?: MathObjectRecord['normalizedContext'];
  definitions?: Array<{ name: string; type: string; source: string }>;
  assumptions?: string[];
  declarations?: Array<{ id: string; kind: 'term' | 'formula'; type?: string; source: string; status: string }>;
  references?: ObjectRef[]; imports?: ObjectRef[]; members?: ObjectRef[];
  exports?: MathObjectRecord['exports']; links?: MathObjectRecord['links']; lean?: LeanBinding[];
}
export function renderMathObjectTemplate(options?: { scale?: ObjectScale; data?: MathObjectTemplateData; body?: string; locale?: 'zh' | 'en' }): string;
export function buildFormalObjectPrompt(options?: { scale?: ObjectScale; data?: MathObjectTemplateData; materials?: string; locale?: 'zh' | 'en' }): string;
export function renderFormalHumanGuide(): string;
export function renderFormalAiGuide(): string;
