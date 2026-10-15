import type { WritingLocale, WritingSettings, WritingDepth } from './writing-template.mjs';
export interface SectionRange { id: string; name: string; start: number; contentStart: number; headingEnd: number; end: number; content: string }
export interface WritingCheckResult { sectionId: string; category: 'structure' | 'coverage' | 'verification' | 'evidence' | 'template' | 'scope' | 'mathematical'; message: string }
export interface DocumentMetadata extends WritingSettings { templateId: string; templateVersion: string; locale: WritingLocale; audience: string; source: string }
export function documentMetadata(markdown: string): DocumentMetadata;
export function updateDocumentMetadata(markdown: string, values: Record<string, string>): string;
export function createWritingDocument(opts?: { title?: string; type?: string; roles?: string[]; depth?: WritingDepth; locale?: WritingLocale; audience?: string }): string;
export function locateWritingSections(markdown: string): { sections: Record<string, SectionRange | null>; issues: WritingCheckResult[] };
export function replaceWritingSection(markdown: string, sectionId: string, body: string): string;
export function addWritingSection(markdown: string, sectionId: string): string;
export function supplementWritingDocument(markdown: string, opts?: { type?: string; roles?: string[]; depth?: WritingDepth; locale?: WritingLocale }): string;
export function writingChecks(markdown: string): WritingCheckResult[];
export function writingCoverage(markdown: string, checks?: WritingCheckResult[]): { total: number; addressed: number; reviewed: number; core: { total: number; addressed: number }; expansion: { total: number; addressed: number }; unresolved: number };
export function invalidateChangedReviews(previous: string, next: string): string;
