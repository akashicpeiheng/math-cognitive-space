import type { AtlasNode, McsAtlas } from './mcs-atlas.mjs';
import type { McsViewData } from './mcs-view.mjs';

export interface FrameworkTitle { zh: string; en: string }
export interface FrameworkCode { code: string; title: FrameworkTitle }
export interface FrameworkSourceEntry extends FrameworkCode { primaryField: string }
export interface FrameworkBranchTitle { id: string; title: FrameworkTitle }
export type FrameworkSource = 'branch' | 'crossing' | 'field' | 'inherited' | 'none';
export interface FrameworkFor {
  msc: readonly FrameworkCode[];
  arxiv: readonly FrameworkCode[];
  source: FrameworkSource;
}
export interface FrameworkRow {
  code: string;
  title: FrameworkTitle;
  primaryField: string;
  fieldIds: string[];
  branchIds: string[];
  branchTitles: FrameworkBranchTitle[];
  arxiv: readonly FrameworkCode[];
  objectIds: Set<string>;
  objectCount: number;
  targetId: string | null;
  scope: 'branch' | 'field' | 'unmapped';
}
export interface FrameworkGroup {
  id: string;
  title: FrameworkTitle;
  rows: FrameworkRow[];
}
export interface FrameworkIndex {
  schema: string;
  groups: FrameworkGroup[];
  rows: FrameworkRow[];
  counts: { total: number; visible: number; collected: number; unmapped: number };
}
export interface ObjectStructure {
  id: string;
  title: string;
  scale: string;
  scaleTitle: string;
  scaleIndex: number | null;
  parents: Array<{ id: string; title: string; primary: boolean }>;
  declarations: { total: number; kinds: Record<string, number>; status: Record<string, number> };
  relations: {
    total: number;
    ids: string[];
    from: number;
    to: number;
    premise: number;
    byKind: Record<string, number>;
  };
  evidence: Record<string, number>;
  assumptions: number;
  members: number;
}
export interface ClassificationSummary {
  objects: number;
  relations: number;
  scales: Array<{ id: string; title: string; sigma: number; count: number }>;
  relationKinds: Record<string, number>;
  declarationKinds: Record<string, number>;
  declarationStatus: Record<string, number>;
  relationEvidence: Record<string, number>;
}

export const MCS_FRAMEWORK_SCHEMA: string;
export const MSC_2020_SOURCE: { id: string; title: FrameworkTitle; url: string; checked: string };
export const ARXIV_MATH_SOURCE: { id: string; title: FrameworkTitle; url: string; checked: string };
export const MSC_2020: readonly FrameworkSourceEntry[];
export const ARXIV_MATH: readonly FrameworkCode[];
export const MSC_PRIMARY_FIELD: Readonly<Record<string, string>>;
export const UNMAPPED_MSC: readonly string[];
export const MCS_FIELD_FRAMEWORK: Readonly<Record<string, { msc: readonly string[]; arxiv: readonly string[] }>>;
export const MCS_BRANCH_FRAMEWORK: Readonly<Record<string, { msc: readonly string[]; arxiv: readonly string[] }>>;

export function frameworkFor(node: AtlasNode | undefined, atlas: McsAtlas): FrameworkFor;
export function frameworkRows(atlas: McsAtlas, options?: { onlyCollected?: boolean }): FrameworkIndex;
export function frameworkSearch(rows: FrameworkRow[] | FrameworkIndex, query: string, limit?: number): FrameworkRow[];
export function frameworkObjectIds(rows: FrameworkRow[] | FrameworkIndex, code: string): string[];
export function frameworkCode(rows: FrameworkRow[] | FrameworkIndex, code: string): FrameworkRow | null;
export function frameworkFilterIds(atlas: McsAtlas, code: string): Set<string>;
export function objectStructure(data: McsViewData, objectId: string, options?: { primaryParentId?: string }): ObjectStructure | null;
export function validateFrameworkRegistry(atlas: McsAtlas): string[];
export function classificationSummary(data: McsViewData): ClassificationSummary;
