import { NODE_W, NODE_H, type NetworkEdge } from './network.ts';

/**
 * 尺度视图的**纯派生层**（2026-10-17）。
 *
 * 这个模块不 import React、不读 DOM、不写存储：输入本体节点位置 + 尺度计划 + 视图状态，
 * 输出「哪些对象可见、合拢了哪些、边投影到谁、卡片画在哪」。`NetworkPage` 只做渲染与交互。
 *
 * ## 四层与两类对象
 *
 * - `node` 是本体现有节点，位置由力导向给出，**不在这里移动**；
 * - `molecule` / `unit` / `topic` 是尺度对象：卡片尺寸是**屏幕像素**，位置由成员包围盒/
 *   码头给出；不参与力导向，也不可单独拖动。
 *
 * ## 三条硬规则
 *
 * 1. **不编造父对象**：自动合拢只合并计划里登记过的父对象下的全部成员；
 *    成员不全、成员分散、只有一个成员，都不合并。
 * 2. **显示只读**：合拢只隐藏子对象，不删除 `added`/`expanded`，放大后原样恢复。
 * 3. **确定性**：所有遍历按 id 排序，同一输入 + 同一缩放桶得到同一结果。
 */

export type ScaleLevelId = 'molecule' | 'node' | 'unit' | 'topic';

export interface ScaleAtomView {
  label: string;
  meaning: string;
}

export interface ScaleUnitView {
  id: string;
  scale: 'unit';
  sigma: 3;
  title: string;
  titleSource: 'aggregate' | 'derived' | 'manual';
  members: string[];
  organization: string;
  source: string;
  sourceAggregate: string;
  sourceBlock: number | null;
  pathId: string | null;
  provisional: boolean;
  evidenceStatus: string;
}

export interface ScaleTopicView {
  id: string;
  scale: 'topic';
  sigma: 4;
  title: string;
  titleSource: 'manual';
  members: string[];
  organization: string;
  source: string;
  provisional: boolean;
  evidenceStatus: string;
  unitCount: number;
}

export interface ScaleMoleculeView {
  id: string;
  scale: 'molecule';
  sigma: 1;
  title: string;
  expression: string;
  construct: string;
  atoms: ScaleAtomView[];
  node: string;
  parent: 'node';
  source: string;
  formulaStatus: string;
  evidenceStatus: string;
  provisional: boolean;
}

export interface ScalePathView {
  id: string;
  title: string;
  aggregateId: string;
  unitIds: string[];
  note: string;
  provisional: boolean;
}

export interface ScaleLevelView {
  id: ScaleLevelId;
  sigma: number;
  title: string;
  titleEn: string;
  parent: ScaleLevelId | null;
}

export interface ScalePlan {
  schema: string;
  status: string;
  version?: string;
  levels: ScaleLevelView[];
  units: ScaleUnitView[];
  topics: ScaleTopicView[];
  paths: ScalePathView[];
  molecules: ScaleMoleculeView[];
  counts: {
    levels: number;
    units: number;
    topics: number;
    paths: number;
    molecules: number;
    aggregateUnits: number;
    blockUnits: number;
    nodes: number;
    nodesCovered: number;
    nodesUncovered: number;
    unfinishedNodeIds: string[];
  };
  notes: string[];
}

export interface ScalePlanResponse {
  ontologyVersion: string;
  version: string;
  scale: ScalePlan;
}

export const SCALE_ORDER: ScaleLevelId[] = ['molecule', 'node', 'unit', 'topic'];
export const SCALE_INDEX: Record<ScaleLevelId, number> = { molecule: 1, node: 2, unit: 3, topic: 4 };

/**
 * 自动合拢的缩放阈值（设计取值，不是实测结论）。
 *
 * 读法：
 * - 分子在 90% 以下并回节点——它只是节点的中心对象明细，更早收起；
 * - 节点在 55% 以下并回单元——此时节点已是圆点，单元标题仍可读；
 * - 单元在 30% 以下并回话题——再小的单元卡片已无法承载成员计数。
 *
 * `nearPx` 是「临近」的判据：一组成员在**当前缩放下的屏幕包围盒**两个方向都不超过
 * 320px 才合并。成员分散时不合并，界面会如实写「成员分散，未合拢」。
 * `hysteresis` 是滞后带：已合拢的要放大到阈值 + 0.06 才解开，防止边界抖动。
 */
export const SCALE_LOD = {
  molecule: 0.9,
  node: 0.55,
  unit: 0.3,
  nearPx: 320,
  hysteresis: 0.06,
} as const;

/** 尺度卡片的**屏幕**尺寸（px）。渲染时用 `scale(1/zoom)` 反缩放，25% 下仍可读。 */
export const SCALE_CARD_PX: Record<Exclude<ScaleLevelId, 'node'>, { w: number; h: number }> = {
  molecule: { w: 160, h: 42 },
  unit: { w: 196, h: 52 },
  topic: { w: 224, h: 56 },
};

/** 没有成员位置的尺度对象放在画布顶部的「码头」，按 3 列排。 */
export const SCALE_DOCK = { gapPx: 12, maxColumns: 3, originPx: 40 } as const;

export interface ScaleObject {
  id: string;
  scale: ScaleLevelId;
  sigma: number;
  title: string;
  titleSource?: string;
  members: string[];
  memberNodeIds: string[];
  parentIds: string[];
  organization?: string;
  source?: string;
  evidenceStatus?: string;
  provisional?: boolean;
  expression?: string;
  atoms?: ScaleAtomView[];
  node?: string;
}

export interface ScaleCatalogue {
  byId: Map<string, ScaleObject>;
  units: ScaleObject[];
  topics: ScaleObject[];
  molecules: ScaleObject[];
  roots: ScaleObject[];
  nodeToUnits: Map<string, string[]>;
  unitToTopics: Map<string, string[]>;
  moleculeOfNode: Map<string, string[]>;
  primaryParentOfNode: Map<string, string | null>;
  primaryParentOfUnit: Map<string, string | null>;
  descendantNodeIds: Map<string, string[]>;
}

const sorted = (values: Iterable<string>) => [...values].sort((left, right) => left.localeCompare(right, 'en'));

/** 从接口下发的计划建索引；只读，不改计划。 */
export function buildScaleCatalogue(plan: ScalePlan | null | undefined): ScaleCatalogue {
  const byId = new Map<string, ScaleObject>();
  if (!plan) {
    return {
      byId, units: [], topics: [], molecules: [], roots: [],
      nodeToUnits: new Map(), unitToTopics: new Map(), moleculeOfNode: new Map(),
      primaryParentOfNode: new Map(), primaryParentOfUnit: new Map(), descendantNodeIds: new Map(),
    };
  }
  const units: ScaleObject[] = (plan.units ?? []).map((unit) => ({
    id: unit.id, scale: 'unit', sigma: unit.sigma, title: unit.title, titleSource: unit.titleSource,
    members: [...unit.members], memberNodeIds: [...unit.members], parentIds: [],
    organization: unit.organization, source: unit.source, evidenceStatus: unit.evidenceStatus,
    provisional: unit.provisional,
  }));
  const topics: ScaleObject[] = (plan.topics ?? []).map((topic) => ({
    id: topic.id, scale: 'topic', sigma: topic.sigma, title: topic.title, titleSource: topic.titleSource,
    members: [...topic.members], memberNodeIds: [], parentIds: [],
    organization: topic.organization, source: topic.source, evidenceStatus: topic.evidenceStatus,
    provisional: topic.provisional,
  }));
  const molecules: ScaleObject[] = (plan.molecules ?? []).map((molecule) => ({
    id: molecule.id, scale: 'molecule', sigma: molecule.sigma, title: molecule.title,
    members: [], memberNodeIds: [], parentIds: [molecule.node],
    organization: molecule.expression, source: molecule.source, evidenceStatus: molecule.evidenceStatus,
    provisional: molecule.provisional, expression: molecule.expression, atoms: molecule.atoms,
    node: molecule.node,
  }));
  for (const object of [...topics, ...units, ...molecules]) byId.set(object.id, object);

  const nodeToUnits = new Map<string, string[]>();
  for (const unit of units) for (const nodeId of unit.members) {
    if (!nodeToUnits.has(nodeId)) nodeToUnits.set(nodeId, []);
    nodeToUnits.get(nodeId)!.push(unit.id);
  }
  for (const [id, list] of nodeToUnits) nodeToUnits.set(id, sorted(list));

  const unitToTopics = new Map<string, string[]>();
  for (const topic of topics) for (const unitId of topic.members) {
    if (!unitToTopics.has(unitId)) unitToTopics.set(unitId, []);
    unitToTopics.get(unitId)!.push(topic.id);
    const unit = byId.get(unitId);
    if (unit) unit.parentIds.push(topic.id);
  }
  for (const [id, list] of unitToTopics) unitToTopics.set(id, sorted(list));

  const descendantNodeIds = new Map<string, string[]>();
  for (const unit of units) descendantNodeIds.set(unit.id, sorted(unit.members));
  for (const topic of topics) {
    const nodes = new Set<string>();
    for (const unitId of topic.members) for (const id of descendantNodeIds.get(unitId) ?? []) nodes.add(id);
    topic.memberNodeIds = sorted(nodes);
    descendantNodeIds.set(topic.id, sorted(nodes));
  }

  const moleculeOfNode = new Map<string, string[]>();
  for (const molecule of molecules) {
    if (!molecule.node) continue;
    if (!moleculeOfNode.has(molecule.node)) moleculeOfNode.set(molecule.node, []);
    moleculeOfNode.get(molecule.node)!.push(molecule.id);
  }
  for (const [id, list] of moleculeOfNode) moleculeOfNode.set(id, sorted(list));

  const primaryParentOfNode = new Map<string, string | null>();
  for (const [nodeId, list] of nodeToUnits) primaryParentOfNode.set(nodeId, list[0] ?? null);
  const primaryParentOfUnit = new Map<string, string | null>();
  for (const unit of units) primaryParentOfUnit.set(unit.id, (unitToTopics.get(unit.id) ?? [])[0] ?? null);

  const roots = [...topics.filter((topic) => topic.parentIds.length === 0), ...units.filter((unit) => unit.parentIds.length === 0)]
    .sort((left, right) => SCALE_INDEX[right.scale] - SCALE_INDEX[left.scale] || left.id.localeCompare(right.id, 'en'));

  return {
    byId, units, topics, molecules, roots,
    nodeToUnits, unitToTopics, moleculeOfNode, primaryParentOfNode, primaryParentOfUnit, descendantNodeIds,
  };
}

export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

export interface ScalePlacement {
  id: string;
  scale: ScaleLevelId;
  title: string;
  form: 'card' | 'header' | 'molecule';
  /** 世界坐标的左上角。 */
  anchor: Point;
  widthPx: number;
  heightPx: number;
  widthWorld: number;
  heightWorld: number;
  /** 合拢了多少个成员；未合拢时为空。 */
  merged: { count: number; total: number } | null;
  /** 可见成员 / 全部成员（头/卡片上显示）。 */
  membersVisible: number;
  membersTotal: number;
  parentId: string | null;
  provisional: boolean;
  titleSource?: string;
}

export interface ScaleCounts {
  nodesVisible: number;
  nodesHidden: number;
  byScale: Record<ScaleLevelId, number>;
  merged: number;
}

export interface ScaleDisplay {
  visibleNodes: Set<string>;
  hiddenNodes: Set<string>;
  visibleScale: Map<string, ScalePlacement>;
  displayOfNode: Map<string, string | null>;
  mergedChildren: Map<string, string[]>;
  autoMerged: Set<string>;
  anchors: Map<string, Point>;
  counts: ScaleCounts;
}

export interface ScaleDisplayOptions {
  catalogue: ScaleCatalogue;
  enabled: Set<ScaleLevelId>;
  addedNodes: Set<string>;
  addedScale: Set<string>;
  expanded: Set<string>;
  autoMerge: boolean;
  zoom: number;
  /** 所有已加入节点的静态位置（含正在被隐藏的节点）。 */
  nodePositions: Map<string, Point>;
  /** 上一轮放过的锚点：合拢/隐藏时让卡片留在原地，不跳到码头。 */
  lastAnchors?: Map<string, Point>;
  /** 上一轮自动合拢的父对象：用于滞后带。 */
  previousMerged?: Set<string>;
  /** 刚被用户手动展开的对象：本轮不允许自动合拢（否则「分裂」会被同一帧的 LOD 立刻收回去）。 */
  exemptMerges?: Set<string>;
  /** 手动拖动后的卡片左上角（世界坐标）；没有的仍按成员包围盒/码头。 */
  manualPositions?: Map<string, Point>;
}

const levelSize = (scale: ScaleLevelId): { w: number; h: number } =>
  scale === 'node' ? { w: NODE_W, h: NODE_H } : SCALE_CARD_PX[scale];

const worldSize = (scale: ScaleLevelId, zoom: number) => {
  const size = levelSize(scale);
  const safeZoom = Math.max(zoom, 0.01);
  return { w: size.w / safeZoom, h: size.h / safeZoom };
};

function bboxOf(points: Array<{ x: number; y: number; w?: number; h?: number }>) {
  if (points.length === 0) return null;
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x + (point.w ?? 0));
    maxY = Math.max(maxY, point.y + (point.h ?? 0));
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/**
 * 计算这一帧的可见性、合拢与卡片位置。
 *
 * 顺序：先按 `added`/`expanded` 建可见集，再自下而上合拢分子→节点→单元→话题，
 * 最后放置卡片。合拢只从可见集里删除子对象，不动 `added`/`expanded`。
 */
export function resolveScaleDisplay(options: ScaleDisplayOptions): ScaleDisplay {
  const {
    catalogue, enabled, addedNodes, addedScale, expanded, autoMerge, zoom, nodePositions,
    lastAnchors = new Map(), previousMerged = new Set(), exemptMerges = new Set(),
    manualPositions = new Map(),
  } = options;
  const safeZoom = Math.max(zoom, 0.01);
  const visibleScaleIds = new Set<string>();
  const allScale = catalogue.byId;

  const canShowScale = (object: ScaleObject | undefined): object is ScaleObject =>
    Boolean(object && enabled.has(object.scale));

  const showScale = (id: string) => {
    const object = allScale.get(id);
    if (!canShowScale(object)) return false;
    visibleScaleIds.add(id);
    return true;
  };

  // 1) 显式加入的尺度对象；展开时递归显示其尺度子对象（话题→单元）。
  for (const id of sorted(addedScale)) {
    const object = allScale.get(id);
    if (!canShowScale(object)) continue;
    showScale(id);
    if (!expanded.has(id)) continue;
    for (const childId of object.members) if (allScale.has(childId)) showScale(childId);
  }
  /*
   * 展开一个「由父对象派生出来」的话题时，父话题可能没有被显式加入：
   * 这里把展开集合里可见对象的子对象补上，保证 URL 直接写 split 也能恢复。
   */
  for (const id of sorted(expanded)) {
    const object = allScale.get(id);
    if (!object || object.scale !== 'topic') continue;
    if (!visibleScaleIds.has(id) && addedScale.has(id)) showScale(id);
    if (!visibleScaleIds.has(id)) continue;
    for (const childId of object.members) if (allScale.has(childId)) showScale(childId);
  }

  // 2) 节点可见性：主父单元/话题可见且未展开时隐藏；没有可见祖先时作为根显示。
  /*
   * 「主父对象」在**显示时**优先取当前可见的父对象，而不是全库按 id 排序的第一个。
   * 跨归属节点（例如「坐标卡」同时属于 agg-dg 与 agg-top-manifold）只有被当前视图
   * 真正显示的那个单元才能作为合拢/隐藏的归属；否则「展开单元 A 却只合拢了一半成员」
   * 会出现——那不是数据错，是显示归属选错了。
   */
  const displayUnitOf = new Map<string, string | null>();
  for (const nodeId of addedNodes) {
    const visibleUnits = (catalogue.nodeToUnits.get(nodeId) ?? []).filter((id) => visibleScaleIds.has(id));
    displayUnitOf.set(nodeId, visibleUnits[0] ?? null);
  }
  const displayTopicOf = new Map<string, string | null>();
  for (const unit of catalogue.units) {
    const visibleTopics = (catalogue.unitToTopics.get(unit.id) ?? []).filter((id) => visibleScaleIds.has(id));
    displayTopicOf.set(unit.id, visibleTopics[0] ?? null);
  }
  const isScaleExpanded = (id: string | null | undefined) => Boolean(id && expanded.has(id));
  const visibleNodes = new Set<string>();
  for (const nodeId of addedNodes) {
    /*
     * 节点可见性按**可见祖先的最高层**判：话题卡片可见且未展开 → 整支隐藏；
     * 话题已展开但单元未展开 → 单元成员隐藏；没有可见祖先才作为节点根显示。
     * 这样「加入一个话题」不会让它的节点还摊在卡片外面，折叠话题也能把整支收回。
     */
    const allUnits = catalogue.nodeToUnits.get(nodeId) ?? [];
    const units = allUnits.filter((id) => visibleScaleIds.has(id));
    const topics = [...new Set(allUnits.flatMap((unitId) => catalogue.unitToTopics.get(unitId) ?? []))]
      .filter((id) => visibleScaleIds.has(id));
    if (topics.some((id) => !isScaleExpanded(id))) continue;
    if (units.some((id) => !isScaleExpanded(id))) continue;
    visibleNodes.add(nodeId);
  }

  // 3) 分子：显式加入的总是候选；其余只在父节点可见且展开时出现。
  const visibleMolecules = new Set<string>();
  for (const molecule of catalogue.molecules) {
    if (!enabled.has('molecule')) continue;
    if (addedScale.has(molecule.id)) {
      // 显式加入的分子也要父节点可见：分子是节点明细，不单独漂在画布上。
      if (molecule.node && visibleNodes.has(molecule.node)) visibleMolecules.add(molecule.id);
      continue;
    }
    if (molecule.node && visibleNodes.has(molecule.node) && expanded.has(molecule.node)) visibleMolecules.add(molecule.id);
  }

  const mergedChildren = new Map<string, string[]>();
  const mergedMeta = new Map<string, { count: number; total: number; anchor: Point }>();
  const autoMerged = new Set<string>();
  const thresholdFor = (parentId: string, mergeScale: 'molecule' | 'node' | 'unit') => {
    const base = SCALE_LOD[mergeScale];
    return previousMerged.has(parentId) ? base + SCALE_LOD.hysteresis : base;
  };
  const screenBBox = (ids: string[], positionOf: (id: string) => Point | null, size: { w: number; h: number }) => {
    const points: Array<{ x: number; y: number; w: number; h: number }> = [];
    for (const id of ids) {
      const point = positionOf(id);
      if (!point) return null;
      points.push({ x: point.x, y: point.y, w: size.w, h: size.h });
    }
    const box = bboxOf(points);
    if (!box) return null;
    return { ...box, screenW: box.w * safeZoom, screenH: box.h * safeZoom };
  };
  const tryMerge = (
    parentId: string,
    parentScale: 'molecule' | 'node' | 'unit',
    mergeScale: 'molecule' | 'node' | 'unit',
    allMembers: string[],
    childIds: string[],
    positionOf: (id: string) => Point | null,
    childSize: { w: number; h: number },
    apply: (hidden: string[], anchor: Point) => void,
  ) => {
    if (!autoMerge) return false;
    if (exemptMerges.has(parentId)) return false;
    if (!enabled.has(parentScale)) return false;
    if (childIds.length < (mergeScale === 'molecule' ? 1 : 2)) return false;
    if (childIds.length !== allMembers.length) return false;
    if (!allMembers.every((id) => childIds.includes(id))) return false;
    if (safeZoom > thresholdFor(parentId, mergeScale)) return false;
    const box = screenBBox(childIds, positionOf, childSize);
    if (!box || box.screenW > SCALE_LOD.nearPx || box.screenH > SCALE_LOD.nearPx) return false;
    const anchor = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
    apply(childIds, anchor);
    autoMerged.add(parentId);
    mergedChildren.set(parentId, [...childIds]);
    mergedMeta.set(parentId, { count: childIds.length, total: allMembers.length, anchor });
    return true;
  };

  // 3a) 分子并回节点（节点卡片本身已经存在，不再生成父卡片）。
  const moleculesByNode = new Map<string, string[]>();
  for (const id of visibleMolecules) {
    const nodeId = allScale.get(id)?.node;
    if (!nodeId) continue;
    if (!moleculesByNode.has(nodeId)) moleculesByNode.set(nodeId, []);
    moleculesByNode.get(nodeId)!.push(id);
  }
  for (const [nodeId, ids] of moleculesByNode) {
    const all = catalogue.moleculeOfNode.get(nodeId) ?? [];
    tryMerge(nodeId, 'node', 'molecule', all, ids,
      (id) => nodePositions.get(nodeId) ?? null,
      { w: SCALE_CARD_PX.molecule.w / safeZoom, h: SCALE_CARD_PX.molecule.h / safeZoom },
      (hidden) => { for (const id of hidden) visibleMolecules.delete(id); });
  }

  // 3b) 节点并回单元。单元可以此前不可见——合拢把它作为卡片带出来。
  for (const unit of catalogue.units) {
    if (!enabled.has('unit')) continue;
    const childNodes = unit.members.filter((id) => visibleNodes.has(id) && (displayUnitOf.get(id) ?? null) === unit.id);
    /*
     * `all` 必须是**登记的全体成员**，不能只看已加入节点：只看已加入集合的话，
     * 「单元有 6 个成员、视图里只加了 2 个」会被误判成「6 个都齐了」而合拢。
     * 成员不全时保持展开/逐层展开，不用一张卡片冒充整个单元。
     */
    const all = unit.members;
    tryMerge(unit.id, 'node', 'node', all, childNodes,
      (id) => nodePositions.get(id) ?? null,
      { w: levelSize('node').w, h: levelSize('node').h },
      (hidden) => {
        for (const id of hidden) visibleNodes.delete(id);
        visibleScaleIds.add(unit.id);
      });
  }

  /*
   * 节点被合拢进单元后，它的分子也不该继续浮在画布上：分子是节点的中心对象明细，
   * 父节点已经不可见时单独留一张分子卡片会指向一个看不见的父对象。
   */
  for (const moleculeId of [...visibleMolecules]) {
    const nodeId = allScale.get(moleculeId)?.node;
    if (!nodeId || !visibleNodes.has(nodeId)) visibleMolecules.delete(moleculeId);
  }

  // 3c) 单元并回话题。单元的锚点：有可见节点用节点包围盒，否则用上一轮锚点。
  const unitAnchor = (unitId: string): Point | null => {
    const manual = manualPositions.get(unitId);
    if (manual) return manual;
    const unit = allScale.get(unitId);
    if (!unit) return null;
    const merged = mergedMeta.get(unitId);
    if (merged) {
      const world = worldSize('unit', safeZoom);
      return { x: merged.anchor.x - world.w / 2, y: merged.anchor.y - world.h / 2 };
    }
    const nodes = unit.members.filter((id) => visibleNodes.has(id));
    const box = bboxOf(nodes.map((id) => {
      const point = nodePositions.get(id);
      return point ? { ...point, w: NODE_W, h: NODE_H } : null;
    }).filter((item): item is { x: number; y: number; w: number; h: number } => Boolean(item)));
    if (box) {
      const size = worldSize('unit', safeZoom);
      return { x: box.x + box.w / 2 - size.w / 2, y: box.y - size.h - 12 / safeZoom };
    }
    return lastAnchors.get(unitId) ?? null;
  };
  for (const topic of catalogue.topics) {
    if (!enabled.has('topic')) continue;
    const childUnits = topic.members.filter((id) => visibleScaleIds.has(id) && (displayTopicOf.get(id) ?? null) === topic.id);
    const all = topic.members;
    /*
     * 还有可见节点的单元不并进话题：话题卡片不能替一个「成员节点还摊在外面」的单元
     * 说「它们已经合拢了」。等节点先并进单元（≤55%）之后，话题才有资格在 ≤30% 时合并。
     */
    const hasVisibleDescendant = childUnits.some((unitId) =>
      (allScale.get(unitId)?.members ?? []).some((nodeId) => visibleNodes.has(nodeId)));
    if (hasVisibleDescendant) continue;
    const positionOf = (id: string) => unitAnchor(id);
    const size = worldSize('unit', safeZoom);
    tryMerge(topic.id, 'unit', 'unit', all, childUnits,
      positionOf,
      size,
      (hidden) => {
        for (const id of hidden) visibleScaleIds.delete(id);
        visibleScaleIds.add(topic.id);
      });
  }

  // 4) 节点 → 最近可见祖先的显示映射。
  const displayOfNode = new Map<string, string | null>();
  for (const nodeId of addedNodes) {
    if (visibleNodes.has(nodeId)) { displayOfNode.set(nodeId, nodeId); continue; }
    const allUnits = catalogue.nodeToUnits.get(nodeId) ?? [];
    const visibleTopic = allUnits
      .flatMap((id) => catalogue.unitToTopics.get(id) ?? [])
      .find((id) => visibleScaleIds.has(id) && !expanded.has(id)) ?? null;
    if (visibleTopic) { displayOfNode.set(nodeId, visibleTopic); continue; }
    const unitId = displayUnitOf.get(nodeId) ?? null;
    if (unitId && visibleScaleIds.has(unitId) && allScale.get(unitId)?.scale === 'unit') {
      displayOfNode.set(nodeId, unitId);
      continue;
    }
    const topicId = unitId ? displayTopicOf.get(unitId) ?? null : null;
    if (topicId && visibleScaleIds.has(topicId)) { displayOfNode.set(nodeId, topicId); continue; }
    // 单元本身不在可见集里时，仍可能有一个可见的话题祖先：节点边应归到那张话题卡片。
    const fallbackTopic = allUnits
      .flatMap((id) => catalogue.unitToTopics.get(id) ?? [])
      .find((id) => visibleScaleIds.has(id)) ?? null;
    displayOfNode.set(nodeId, fallbackTopic);
  }

  // 5) 放置：分子 → 单元 → 话题；没有成员位置的放码头。
  const placements = new Map<string, ScalePlacement>();
  const anchors = new Map<string, Point>();
  const put = (object: ScaleObject, anchor: Point, form: 'card' | 'header' | 'molecule', merged: { count: number; total: number } | null) => {
    const size = levelSize(object.scale);
    const world = worldSize(object.scale, safeZoom);
    const finalAnchor = manualPositions.get(object.id) ?? anchor;
    const membersTotal = object.scale === 'topic' ? object.members.length : object.memberNodeIds.length;
    const membersVisible = object.scale === 'topic'
      ? object.members.filter((id) => visibleScaleIds.has(id)).length
      : object.memberNodeIds.filter((id) => visibleNodes.has(id)).length;
    placements.set(object.id, {
      id: object.id, scale: object.scale, title: object.title, form,
      anchor: { x: finalAnchor.x, y: finalAnchor.y }, widthPx: size.w, heightPx: size.h,
      widthWorld: world.w, heightWorld: world.h,
      merged, membersVisible, membersTotal, parentId: object.parentIds[0] ?? null,
      provisional: Boolean(object.provisional), titleSource: object.titleSource,
    });
    anchors.set(object.id, { x: finalAnchor.x, y: finalAnchor.y });
  };

  for (const id of visibleMolecules) {
    const molecule = allScale.get(id);
    if (!molecule?.node) continue;
    const parent = nodePositions.get(molecule.node);
    if (!parent) continue;
    const siblings = (catalogue.moleculeOfNode.get(molecule.node) ?? []).filter((mid) => visibleMolecules.has(mid));
    const index = Math.max(0, siblings.indexOf(id));
    const world = worldSize('molecule', safeZoom);
    const gap = 8 / safeZoom;
    const anchor = { x: parent.x + NODE_W + 16 / safeZoom, y: parent.y + index * (world.h + gap) };
    put(molecule, anchor, 'molecule', null);
  }

  const dock: ScaleObject[] = [];
  const placeUnit = (unit: ScaleObject) => {
    const merged = mergedMeta.get(unit.id);
    if (merged) {
      const world = worldSize('unit', safeZoom);
      put(unit, { x: merged.anchor.x - world.w / 2, y: merged.anchor.y - world.h / 2 }, 'card', { count: merged.count, total: merged.total });
      return;
    }
    const nodeIds = unit.members.filter((id) => visibleNodes.has(id));
    const box = bboxOf(nodeIds.map((id) => {
      const point = nodePositions.get(id);
      return point ? { ...point, w: NODE_W, h: NODE_H } : null;
    }).filter((item): item is { x: number; y: number; w: number; h: number } => Boolean(item)));
    if (box) {
      const world = worldSize('unit', safeZoom);
      const gap = 12 / safeZoom;
      put(unit, { x: box.x + box.w / 2 - world.w / 2, y: box.y - world.h - gap }, 'header', null);
      return;
    }
    const last = lastAnchors.get(unit.id);
    if (last) { put(unit, last, 'card', null); return; }
    dock.push(unit);
  };
  for (const unit of catalogue.units) if (visibleScaleIds.has(unit.id)) placeUnit(unit);

  for (const topic of catalogue.topics) {
    if (!visibleScaleIds.has(topic.id)) continue;
    const merged = mergedMeta.get(topic.id);
    if (merged) {
      const world = worldSize('topic', safeZoom);
      put(topic, { x: merged.anchor.x - world.w / 2, y: merged.anchor.y - world.h / 2 }, 'card', { count: merged.count, total: merged.total });
      continue;
    }
    const childUnits = topic.members.filter((id) => visibleScaleIds.has(id)).map((id) => placements.get(id)).filter((item): item is ScalePlacement => Boolean(item));
    const box = bboxOf(childUnits.map((item) => ({ x: item.anchor.x, y: item.anchor.y, w: item.widthWorld, h: item.heightWorld })));
    if (box) {
      const world = worldSize('topic', safeZoom);
      const gap = 12 / safeZoom;
      put(topic, { x: box.x + box.w / 2 - world.w / 2, y: box.y - world.h - gap }, 'header', null);
      continue;
    }
    const last = lastAnchors.get(topic.id);
    if (last) { put(topic, last, 'card', null); continue; }
    dock.push(topic);
  }

  if (dock.length > 0) {
    const columns = SCALE_DOCK.maxColumns;
    const ordered = dock.sort((left, right) => SCALE_INDEX[right.scale] - SCALE_INDEX[left.scale] || left.id.localeCompare(right.id, 'en'));
    const cellW = Math.max(...ordered.map((object) => SCALE_CARD_PX[object.scale as 'molecule' | 'unit' | 'topic'].w)) / safeZoom + SCALE_DOCK.gapPx / safeZoom;
    const cellH = Math.max(...ordered.map((object) => SCALE_CARD_PX[object.scale as 'molecule' | 'unit' | 'topic'].h)) / safeZoom + SCALE_DOCK.gapPx / safeZoom;
    const rows = Math.ceil(ordered.length / columns);
    /*
     * 码头必须在**所有已落位对象与节点**的上方：只按节点 minY 算的话，
     * 单元 header（本来就在节点上方）会与第二排卡片撞在一起。
     */
    const occupiedTop = [
      ...[...nodePositions.values()].map((point) => point.y),
      ...[...placements.values()].map((placement) => placement.anchor.y),
    ];
    const minY = occupiedTop.length > 0 ? Math.min(...occupiedTop) : 0;
    const originY = nodePositions.size > 0 || placements.size > 0
      ? minY - rows * cellH - 140 / safeZoom
      : SCALE_DOCK.originPx / safeZoom;
    ordered.forEach((object, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      put(object, { x: SCALE_DOCK.originPx / safeZoom + column * cellW, y: originY + row * cellH }, 'card', null);
    });
  }

  /*
   * 第二遍话题放置（2026-10-17）：话题的子单元可能刚刚才被放进码头，
   * 第一遍算 header 时还看不到它们的位置。码头落位后再把话题抬到子单元上方；
   * 没有子单元的才留在码头。
   */
  for (const topic of catalogue.topics) {
    if (!visibleScaleIds.has(topic.id)) continue;
    if (mergedMeta.has(topic.id)) continue;
    const childUnits = topic.members.filter((id) => visibleScaleIds.has(id)).map((id) => placements.get(id)).filter((item): item is ScalePlacement => Boolean(item));
    if (childUnits.length === 0) continue;
    const box = bboxOf(childUnits.map((item) => ({ x: item.anchor.x, y: item.anchor.y, w: item.widthWorld, h: item.heightWorld })));
    if (!box) continue;
    const world = worldSize('topic', safeZoom);
    const gap = 12 / safeZoom;
    put(topic, { x: box.x + box.w / 2 - world.w / 2, y: box.y - world.h - gap }, 'header', null);
  }

  // 6) 计数。
  const byScale: Record<ScaleLevelId, number> = { molecule: 0, node: visibleNodes.size, unit: 0, topic: 0 };
  for (const placement of placements.values()) byScale[placement.scale] += 1;
  const counts: ScaleCounts = {
    nodesVisible: visibleNodes.size,
    nodesHidden: [...addedNodes].filter((id) => !visibleNodes.has(id)).length,
    byScale,
    merged: mergedChildren.size,
  };

  return {
    visibleNodes,
    hiddenNodes: new Set([...addedNodes].filter((id) => !visibleNodes.has(id))),
    visibleScale: placements,
    displayOfNode,
    mergedChildren,
    autoMerged,
    anchors,
    counts,
  };
}

/** 只取可见节点的矩形，供相机适配与边锚点使用。 */
export function scaleFitBounds(
  display: ScaleDisplay,
  nodePositions: Map<string, Point>,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  let any = false;
  for (const id of display.visibleNodes) {
    const point = nodePositions.get(id);
    if (!point) continue;
    any = true;
    minX = Math.min(minX, point.x); minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x + NODE_W); maxY = Math.max(maxY, point.y + NODE_H);
  }
  for (const placement of display.visibleScale.values()) {
    any = true;
    minX = Math.min(minX, placement.anchor.x); minY = Math.min(minY, placement.anchor.y);
    maxX = Math.max(maxX, placement.anchor.x + placement.widthWorld); maxY = Math.max(maxY, placement.anchor.y + placement.heightWorld);
  }
  return any ? { minX, minY, maxX, maxY } : null;
}

export interface ProjectedEdge {
  id: string;
  from: string;
  to: string;
  count: number;
  representative: NetworkEdge;
  members: NetworkEdge[];
}

/**
 * 把节点边投影到可见显示对象：
 * - 两端都可见的节点保持原样；
 * - 隐藏节点映射到最近可见祖先（合拢卡片）；
 * - 两端落到同一对象时丢掉（记入 internal）；
 * - 同一对显示对象只留一条代表边（按 `visualWeightOf` 最强），并带 `count`。
 *
 * 读法：这是存在联系（R∃）的聚合，**不是整体先修**；界面必须写清楚。
 */
export function projectScaleEdges(
  edges: NetworkEdge[],
  display: ScaleDisplay,
  weightOf: (edge: NetworkEdge) => number,
): { edges: ProjectedEdge[]; internal: number; hidden: number } {
  const groups = new Map<string, { from: string; to: string; members: NetworkEdge[] }>();
  let internal = 0; let hidden = 0;
  for (const edge of edges) {
    const from = display.displayOfNode.get(edge.from) ?? null;
    const to = display.displayOfNode.get(edge.to) ?? null;
    if (!from || !to) { hidden += 1; continue; }
    if (from === to) { internal += 1; continue; }
    const key = from < to ? `${from}~${to}` : `${to}~${from}`;
    if (!groups.has(key)) groups.set(key, { from, to, members: [] });
    groups.get(key)!.members.push(edge);
  }
  const projected: ProjectedEdge[] = [];
  for (const [key, group] of groups) {
    const sorted = [...group.members].sort((left, right) => weightOf(right) - weightOf(left) || left.id.localeCompare(right.id, 'en'));
    projected.push({
      id: `scale-edge:${key}`,
      from: group.from,
      to: group.to,
      count: group.members.length,
      representative: sorted[0],
      members: sorted,
    });
  }
  projected.sort((left, right) => left.id.localeCompare(right.id, 'en'));
  return { edges: projected, internal, hidden };
}

/** 显示对象的矩形：节点用现有卡片尺寸，尺度对象用屏幕尺寸折回世界。 */
export function displayRect(
  id: string,
  display: ScaleDisplay,
  nodePositions: Map<string, Point>,
): Rect | null {
  if (display.visibleNodes.has(id)) {
    const point = nodePositions.get(id);
    return point ? { x: point.x, y: point.y, w: NODE_W, h: NODE_H } : null;
  }
  const placement = display.visibleScale.get(id);
  return placement
    ? { x: placement.anchor.x, y: placement.anchor.y, w: placement.widthWorld, h: placement.heightWorld }
    : null;
}

/** 两个矩形的中心连线与边框交点：边不会穿进卡片内部。 */
export function rectAnchors(from: Rect, to: Rect) {
  const fromCenter = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
  const toCenter = { x: to.x + to.w / 2, y: to.y + to.h / 2 };
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;
  const hit = (rect: Rect, center: Point, sign: number) => {
    const halfW = rect.w / 2;
    const halfH = rect.h / 2;
    const ratioX = dx === 0 ? Number.POSITIVE_INFINITY : halfW / Math.abs(dx);
    const ratioY = dy === 0 ? Number.POSITIVE_INFINITY : halfH / Math.abs(dy);
    const ratio = Math.min(ratioX, ratioY);
    return { x: center.x + dx * ratio * sign, y: center.y + dy * ratio * sign };
  };
  const start = hit(from, fromCenter, 1);
  const end = hit(to, toCenter, -1);
  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
}

/** URL 里的 `scales=` 取值：`all` 或逗号分隔；未知值丢弃。 */
export function parseScaleLevels(raw: string | null | undefined): ScaleLevelId[] {
  if (!raw) return [];
  if (raw === 'all') return [...SCALE_ORDER];
  const seen = new Set<ScaleLevelId>();
  for (const part of raw.split(',')) {
    const value = part.trim() as ScaleLevelId;
    if (SCALE_ORDER.includes(value)) seen.add(value);
  }
  return SCALE_ORDER.filter((id) => seen.has(id));
}

/** URL 里的 id 列表：去空、去重、限长；不在这里判存在性（计划加载后再过滤）。 */
export function parseScaleIds(raw: string | null | undefined, limit = 500): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(',')) {
    const value = part.trim();
    if (!value || value.length > 300) continue;
    seen.add(value);
    if (seen.size >= limit) break;
  }
  return [...seen];
}

/** 只保留计划里真实存在的 id，顺序按传入顺序。 */
export function existingScaleIds(ids: Iterable<string>, catalogue: ScaleCatalogue): string[] {
  return [...ids].filter((id) => catalogue.byId.has(id));
}

/** 把一组 id 里仍被计划认识的部分拼成 URL 参数值（空数组返回 null）。 */
export function scaleIdsParam(ids: Iterable<string>): string | null {
  const values = [...ids].filter((id) => typeof id === 'string' && id.length > 0 && id.length <= 300);
  return values.length ? values.join(',') : null;
}
