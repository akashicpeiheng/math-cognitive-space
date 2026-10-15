export type WritingLocale = 'zh' | 'en';
export type WritingType = 'generic' | 'definition' | 'theorem' | 'axiom' | 'property' | 'corollary' | 'exercise' | 'technique' | 'object' | 'notation' | 'construction' | 'proof' | 'example' | 'counterexample' | 'algorithm' | 'conjecture' | 'problem' | 'representation' | 'theory';
export type WritingStatus = 'empty' | 'writing' | 'pending' | 'reviewed';
export type Applicability = 'applicable' | 'na' | 'deferred' | 'unknown';
export type WritingDepth = 'core' | 'deep';
export interface LocalizedText { zh: string; en: string }
export interface TemplateSection { id: string; title: LocalizedText; purpose: LocalizedText; questions: LocalizedText[]; starter: LocalizedText; example: LocalizedText; pitfall: LocalizedText; checks: LocalizedText[]; aliases?: string[] }
export interface TemplateDefinition { id: string; version: string; sections: TemplateSection[]; variants: typeof WRITING_TYPES; rules: LocalizedText; coreSections: string[] }
export const TEMPLATE_ID: string;
export const TEMPLATE_VERSION: string;
export const WRITING_TYPES: Array<{ id: WritingType; title: LocalizedText; focus: LocalizedText; checks: LocalizedText }>;
export const WRITING_SECTIONS: TemplateSection[];
export const WRITING_STATUSES: WritingStatus[];
export const CORE_SECTIONS: string[];
export const APPLICABILITIES: Applicability[];
export const APPLICABILITY_LABELS: Record<Applicability, LocalizedText>;
export const DEPTH_LABELS: Record<WritingDepth, LocalizedText>;
export const UNKNOWN_ROLE_WARNING: LocalizedText;
export const STATUS_LABELS: Record<WritingStatus, LocalizedText>;
export const COMMON_RULES: LocalizedText;
export const WRITING_TEMPLATE: TemplateDefinition;
export function chooseText(value: LocalizedText | string, locale?: WritingLocale): string;
export function writingType(id: string): { id: string; title: LocalizedText; focus: LocalizedText; checks: LocalizedText };
export interface WritingPlanOptions { type?: string; roles?: string[]; depth?: WritingDepth; applicability?: Record<string, Applicability>; presentSections?: string[] }
export interface WritingPlan { roles: string[]; depth: WritingDepth; applicability: Record<string, Applicability>; sections: TemplateSection[]; unknownRoles: string[] }
export interface WritingSettings extends WritingPlan { type: string; explicitApplicability: Record<string, Applicability>; presentSections: string[]; reasons: Record<string, string>; coveredBy: Record<string, string>; statuses: Record<string, WritingStatus>; customChecks: string }
export function writingRoles(type?: string, roles?: string[]): string[];
export function resolveWritingPlan(options?: WritingPlanOptions): WritingPlan;
export function writingSettings(markdown?: string): WritingSettings;
export function buildWritingPrompt(options?: WritingPlanOptions & { task?: 'whole' | 'section' | 'review'; title?: string; audience?: string; markdown?: string; sectionId?: string; materials?: string; locale?: WritingLocale; reasons?: Record<string, string>; coveredBy?: Record<string, string>; customChecks?: string }): string;
export function renderHumanGuide(locale?: WritingLocale): string;
export function renderAiGuide(locale?: WritingLocale): string;
export function validateWritingTemplate(): string[];
