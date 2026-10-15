import { contractConnectionKey, familyConnectionKey } from '../../shared/connection-keys.mjs';
import { buildEdges, edgeFamilyLabel } from './network.ts';
import type { NetworkEdge, NetworkGraph } from './network.ts';
import { relationKindLabel } from './relation-visual.ts';
import { plainMathText } from './labels.ts';
import type { Locale } from './i18n/locales.ts';
import type { ScalingExplanation } from './types.ts';

export interface ConnectionTarget { key: string; label: string; detail?: string }

export function connectionKeyOf(edge: NetworkEdge): string {
  if (edge.source === 'relation') return edge.connectionKey ?? JSON.stringify(['relation', edge.id]);
  if (edge.source === 'contract') return contractConnectionKey(edge.actionId, edge.from, edge.to);
  return familyConnectionKey(edge.source, edge.from, edge.to);
}

export function connectionTarget(edge: NetworkEdge, locale: Locale): ConnectionTarget {
  return { key: connectionKeyOf(edge), label: plainMathText(edge.source === 'relation' ? relationKindLabel(edge.kind, locale)
    : `${edgeFamilyLabel(edge.source, locale)} · ${edge.source === 'contract' ? edge.actionTitle : edge.note}`),
    detail: edge.source === 'relation' ? `${edge.id}${edge.scope ? ` · ${plainMathText(edge.scope)}` : ''}` : edge.id };
}

export function connectionTargets(edges: NetworkEdge[], locale: Locale): ConnectionTarget[] {
  return [...new Map(edges.map(edge => { const target = connectionTarget(edge, locale); return [target.key, target] as const; })).values()];
}

export function connectionsBetween(graph: NetworkGraph, from: string, to: string): NetworkEdge[] {
  return buildEdges(graph, new Set([from, to])).filter(edge => edge.from !== edge.to);
}

export function scalingSummary(relation: { kind: string; scaling?: unknown; direction?: unknown; scalingExplanation?: ScalingExplanation | null }, locale: Locale): string | null {
  if (relation.kind !== 'scaling') return null;
  if (!(relation.scaling ?? relation.direction)) return locale === 'en' ? 'Scaling conditions awaiting verification' : '放缩条件待核验';
  return relation.scalingExplanation?.summary ?? (locale === 'en' ? 'Condition explanation not registered' : '条件说明未登记');
}
