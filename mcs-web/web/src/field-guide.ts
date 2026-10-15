import { buildEdges, mergeParallelEdges, type NetworkGraph } from './network.ts';
import { coreRingArrangement } from './network-order.ts';
import type { NodeSummary } from './types';

export interface FieldGuide {
  id: string; title: string; anchor: string; status: string;
  object: string; motivations: string[];
  questions: Array<{ id: string; title: string; explanation: string; nodes: string[] }>;
  growth: string; entry: string; misconceptions: string[]; review: string;
  core: Array<{ id: string; reason: string; bridge: boolean }>;
  sources: Array<{ id: string; title: string; url: string; location: string }>;
}
export interface FieldGuidesResponse { version: string; ontologyVersion: string; locale: 'zh' | 'en'; guides: FieldGuide[] }
export function defaultField(guides: readonly FieldGuide[], requested: string | null, interests: readonly string[]): string {
  if (requested && guides.some(g=>g.id===requested)) return requested;
  return interests.find(id=>guides.some(g=>g.id===id)) ?? guides.find(g=>g.id==='分析')?.id ?? guides[0]?.id ?? '';
}
/** D only: fixed editorial membership, ontology titles/edges, no M or E mutations. */
export function deriveFieldGuide(guide: FieldGuide, graph: NetworkGraph) {
  const index=new Map(graph.nodes.map(n=>[n.id,n]));
  const nodes=guide.core.map(core=>({ ...core,node:index.get(core.id) }));
  const valid=nodes.filter((n): n is typeof n & {node:NodeSummary}=>Boolean(n.node && n.node.granularity!=='topic'));
  const ids=valid.map(n=>n.id);
  const edges=buildEdges(graph,new Set(ids),['contract','relation']);
  const arrangement=coreRingArrangement({ids,titles:new Map(valid.map(n=>[n.id,n.node.title])),edges,core:guide.anchor});
  return {nodes,missing:nodes.filter(n=>!n.node||n.node.granularity==='topic').map(n=>n.id),edges,merged:mergeParallelEdges(edges),layout:arrangement.layout};
}
