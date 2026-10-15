import { useMemo } from 'react';
import { useI18n } from '../i18n';
import { connectionTargets, connectionsBetween } from '../connection-display';
import { ConnectionNote } from '../connection-notes';
import type { NetworkEdge, NetworkGraph } from '../network';
import { ScalingExplanationView } from './ScalingExplanation';

/** Preserve every specific connection even when a preview chose one strongest reason. */
export function ConnectionPairNotes({ graph, from, to, connections, scaling = true }:
  ({ graph: NetworkGraph; from: string; to: string; connections?: never } | { connections: NetworkEdge[]; graph?: never; from?: never; to?: never }) & { scaling?: boolean }) {
  const { locale } = useI18n();
  const edges = useMemo(() => connections ?? connectionsBetween(graph!, from!, to!), [connections, graph, from, to]);
  const targets = connectionTargets(edges, locale);
  return <div className="connection-pair-notes">
    {scaling && [...new Map(edges.filter(edge => edge.source === 'relation' && edge.kind === 'scaling')
      .map(edge => [edge.source === 'relation' ? edge.connectionKey ?? edge.id : edge.id, edge])).values()]
      .map(edge => edge.source === 'relation' && <ScalingExplanationView key={edge.connectionKey ?? edge.id} relation={edge} compact />)}
    {targets.map(target => <ConnectionNote key={target.key} target={target} />)}
  </div>;
}
