import type { McsViewData } from '../../shared/mcs-view.mjs';
import type { McsRelationProjection } from '../../shared/mcs-space.mjs';

type Point = { x: number; y: number };
type Rect = Point & { w: number; h: number };
type Edge = McsRelationProjection['edges'][number];

/** Formal membership alone determines topic context; it never creates an edge. */
export function mcsRelationTopics(data: Pick<McsViewData, 'objects' | 'relations'>) {
  const objects = new Map(data.objects.map(object => [object.id, object]));
  const topics = new Map<string, Set<string>>();
  for (const topic of data.objects.filter(object => object.scale === 'topic')) {
    const visited = new Set<string>();
    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      const memberships = topics.get(id) ?? new Set<string>();
      memberships.add(topic.id); topics.set(id, memberships);
      for (const member of objects.get(id)?.members ?? []) visit(member.id);
    };
    visit(topic.id);
  }
  return new Map(data.relations.map(relation => {
    const endpoints = [relation.from, relation.to, ...relation.premises];
    return [relation.id, [...(topics.get(relation.from.id) ?? [])]
      .filter(topic => endpoints.every(ref => topics.get(ref.id)?.has(topic))).sort()];
  }));
}

/** Different kinds and reverse readings need separate lanes too. */
export function mcsRelationLanes(edges: Edge[]) {
  const groups = new Map<string, Edge[]>();
  for (const edge of edges) {
    const key = JSON.stringify([edge.from ?? '', edge.to].sort());
    const group = groups.get(key) ?? [];
    group.push(edge); groups.set(key, group);
  }
  return new Map([...groups.values()].flatMap(group => [...group]
    .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    .map((edge, index) => [edge.id, { index, count: group.length }])));
}

export function mcsCurvePoint(start: Point, control: Point, end: Point, t: number): Point {
  return { x: (1 - t) ** 2 * start.x + 2 * (1 - t) * t * control.x + t ** 2 * end.x,
    y: (1 - t) ** 2 * start.y + 2 * (1 - t) * t * control.y + t ** 2 * end.y };
}

const overlap = (a: Rect, b: Rect) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
  * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/** Screen coordinates keep type labels readable at every zoom. */
export function placeMcsRelationLabels(
  labels: Array<{ id: string; width: number; priority: number; start: Point; control: Point; end: Point; junction?: Point }>,
  obstacles: Rect[], viewport: { width: number; height: number },
) {
  const used: Rect[] = [], placed = new Map<string, Point>();
  for (const label of [...labels].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))) {
    const candidates = (label.junction ? [label.junction] : [.5, .35, .65, .23, .77].map(t => mcsCurvePoint(label.start, label.control, label.end, t)))
      .flatMap(point => [0, 16, 32, 52, 76].flatMap(lift => (label.junction ? [0, -72, 72, -128, 128] : [0])
        .map(shift => ({ x: point.x + shift - label.width / 2, y: point.y - 32 - lift, w: label.width, h: 24 }))));
    const score = (rect: Rect) => used.reduce((sum, other) => sum + overlap(rect, other) * 4, 0)
      + obstacles.reduce((sum, other) => sum + overlap(rect, other) * 8, 0)
      + (rect.x < 4 || rect.x + rect.w > viewport.width - 4 || rect.y < 40 || rect.y + rect.h > viewport.height - 85 ? 100_000 : 0);
    const best = candidates.reduce((best, next) => score(next) < score(best) ? next : best);
    used.push({ ...best, x: best.x - 4, y: best.y - 3, w: best.w + 8, h: best.h + 6 });
    placed.set(label.id, { x: best.x + best.w / 2, y: best.y + best.h / 2 });
  }
  return placed;
}
