/**
 * Type declarations for the applied-mathematics index (D navigation only).
 * The runtime module is `mcs-applied.mjs`; no formal M/L objects are created.
 */
export interface AppliedText {
  zh: string;
  en: string;
}

export interface AppliedBook {
  title: string;
  editor: string;
  associateEditors: readonly string[];
  publisher: string;
  year: number;
  isbn: string;
  url: string;
}

export interface AppliedPart {
  id: string;
  title: AppliedText;
  count: number;
  firstPage: number;
  summary: AppliedText;
}

export interface AppliedStep {
  id: string;
  title: AppliedText;
  note: AppliedText;
}

export interface AppliedEntry {
  id: string;
  part: string;
  number: number;
  title: AppliedText;
  note: AppliedText;
  page: number;
  msc: readonly string[];
  branches: readonly string[];
  aliases: readonly string[];
}

export interface AppliedFilter {
  part?: string | null;
  msc?: string | null;
  branch?: string | null;
  query?: string;
  mappedOnly?: boolean;
}

export interface AppliedRelated {
  prev: AppliedEntry | null;
  next: AppliedEntry | null;
  sameMsc: AppliedEntry[];
  sameBranch: AppliedEntry[];
}

export interface AppliedCounts {
  total: number;
  parts: Record<string, number>;
  mapped: number;
  msc: Record<string, number>;
}

export const MCS_APPLIED_SCHEMA: string;
export const APPLIED_BOOK: Readonly<AppliedBook>;
export const APPLIED_PARTS: readonly AppliedPart[];
export const APPLIED_BRANCHES: Readonly<Record<string, AppliedText>>;
export const APPLIED_WORKFLOW: readonly AppliedStep[];
export const APPLIED_WORKFLOW_SOURCE: Readonly<{ part: string; page: number; title: AppliedText }>;
export const MCS_APPLIED_ENTRIES: readonly AppliedEntry[];

export function appliedEntry(id: string): AppliedEntry | null;
export function appliedPart(id: string): AppliedPart | null;
export function normalizeAppliedQuery(value: unknown): string;
export function filterApplied(filter?: AppliedFilter): AppliedEntry[];
export function appliedForBranch(branchId: string): AppliedEntry[];
export function appliedForMsc(code: string): AppliedEntry[];
export function appliedRelated(entry: AppliedEntry | null, limit?: number): AppliedRelated;
export function appliedCitation(entry: AppliedEntry | null, locale?: string): string;
export function appliedCounts(): AppliedCounts;
export function validateAppliedIndex(options?: {
  branchIds?: ReadonlySet<string> | null;
  mscCodes?: ReadonlySet<string> | null;
}): string[];
