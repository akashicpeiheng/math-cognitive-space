import type { ContentLibrary, ContentRelation, FormalDeclaration, MathObjectRecord, ObjectScale } from './content-documents.mjs';

export type { ObjectRef, ObjectScale } from './content-documents.mjs';

/** Public M payload; declaration syntax trees and personal state are excluded. */
export interface McsViewObject extends Pick<MathObjectRecord,
  'id' | 'version' | 'title' | 'scale' | 'formalHash' | 'path' |
  'members' | 'references' | 'imports' | 'exports' | 'assumptions' | 'normalizedContext'> {
  declarations: Array<Pick<FormalDeclaration,
    'id' | 'kind' | 'source' | 'type' | 'status' | 'constructionCount' | 'formalHash'>>;
}

/** Complete compiled M relation, including its public source and evidence. */
export interface McsViewRelation extends Omit<ContentRelation, 'layer'> {
  layer: 'M';
  path: string;
  documentHash: string;
  structuralStatus: 'valid';
  direction?: { special: string; general: string };
}

/** Navigation groups are not mathematical objects or membership relations. */
export interface McsViewGroup {
  id: string;
  title: { zh: string; en: string };
  objectIds: string[];
}

export interface McsViewData {
  schema: 'mcs-view/1';
  objectVersion: string;
  contentLocale: 'zh';
  levels: ContentLibrary['scale']['levels'];
  objects: McsViewObject[];
  relations: McsViewRelation[];
  groups: McsViewGroup[];
}

/** Personal view state belongs to E and is never part of the public M response. */
export interface McsViewState {
  schema: 'mcs-view-state/1';
  objectVersion: string;
  filters: {
    groups: string[];
    scales: ObjectScale[];
    relations: string[];
    evidence: string[];
    query: string;
  };
  camera: { x: number; y: number; scale: number };
  expanded: string[];
  manual: Record<string, 'open' | 'closed'>;
  selected: string | null;
  positions: Record<string, { x: number; y: number }>;
}
