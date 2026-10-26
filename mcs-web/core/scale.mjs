import { sha256 } from './hash.mjs';
import {
  SCALE_SCHEMA, SCALE_STATUS, SCALE_LEVELS, UNIT_SOURCES, PATH_GROUPS, TOPICS, MOLECULES, SCALE_NOTES,
} from '../data/scale.mjs';

/**
 * 尺度登记的构建与校验（2026-10-17）。
 *
 * 输入只有本体现有的 `nodes` 与 `aggregates`，加上 `data/scale.mjs` 里逐条写下的映射；
 * 输出是一份**只读派生计划**，供 `/api/v2/ontology/scale` 与 `npm run check` 使用。
 *
 * 三条纪律：
 *
 * 1. **不把没登记的东西补出来**：每个 `kind:'topic'` 聚合必须在 `UNIT_SOURCES` 里恰好出现一次；
 *    缺一条或多一条都报错。这样数据新增聚合时不会悄悄落进「未分类」。
 * 2. **生成标题必须标 derived**：聚合整体单元的标题来自聚合标题（`aggregate`），
 *    教材块单元的标题才可能是成员标题拼出的（`derived`）；人工覆盖标 `manual`。
 *    界面据此提示「标题待审」，不把脚本产物说成人写的。
 * 3. **确定性**：所有数组按 id 排序，版本号由规范化 JSON 的 sha256 得到；
 *    同一份输入两次构建必须得到同一版本。
 */

const SCALE_SCHEMA_VERSION = SCALE_SCHEMA;
const LEVEL_IDS = SCALE_LEVELS.map((level) => level.id);
const LEVEL_BY_ID = new Map(SCALE_LEVELS.map((level) => [level.id, level]));

const unique = (values) => [...new Set(values)];
const byId = (left, right) => String(left.id).localeCompare(String(right.id), 'en');

/** 生成教材块单元的标题：前 3 个成员标题 + 「等 N 项」；方法块加前缀。 */
export function deriveUnitTitle(memberIds, nodeById) {
  const titles = memberIds.map((id) => nodeById.get(id)?.title ?? id);
  if (titles.length === 0) return '未命名单元';
  const allMethods = memberIds.every((id) => nodeById.get(id)?.construct === 'Method');
  const head = titles.slice(0, 3).join('、');
  const suffix = titles.length > 3 ? ` 等 ${titles.length} 项` : '';
  const value = `${allMethods ? '方法：' : ''}${head}${suffix}`;
  return value.length > 48 ? `${value.slice(0, 47)}…` : value;
}

/** 计划的核心内容（不含 version）：版本号按它计算，避免自指。 */
export function planCore(plan) {
  return {
    schema: plan.schema,
    status: plan.status,
    levels: plan.levels,
    units: plan.units,
    topics: plan.topics,
    paths: plan.paths,
    molecules: plan.molecules,
    counts: plan.counts,
    notes: plan.notes,
  };
}

export function planVersion(plan) {
  return `scale:${sha256(planCore(plan))}`;
}

/**
 * 构建尺度计划。事件顺序固定：聚合按 id、块按原顺序、话题/分子/路径按 id。
 *
 * @param {{nodes: Array, aggregates: Array}} ontology
 * @param {{sources?: object, pathGroups?: Array, topics?: Array, molecules?: Array, notes?: string[], schema?: string, status?: string}} [options]
 *   测试可注入坏 fixture；生产调用不传。
 */
export function buildScalePlan({ nodes = [], aggregates = [] } = {}, options = {}) {
  const sources = options.sources ?? UNIT_SOURCES;
  const pathGroups = options.pathGroups ?? PATH_GROUPS;
  const topics = options.topics ?? TOPICS;
  const molecules = options.molecules ?? MOLECULES;
  const notes = options.notes ?? SCALE_NOTES;
  const schema = options.schema ?? SCALE_SCHEMA;
  const status = options.status ?? SCALE_STATUS;

  const problems = [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const aggregateById = new Map(aggregates.map((aggregate) => [aggregate.id, aggregate]));
  const topicAggregates = aggregates.filter((aggregate) => aggregate.kind === 'topic').sort(byId);
  const topicAggregateIds = new Set(topicAggregates.map((aggregate) => aggregate.id));

  for (const aggregateId of Object.keys(sources)) {
    if (!topicAggregateIds.has(aggregateId)) problems.push(`UNIT_SOURCES 里的 ${aggregateId} 不是 kind:'topic' 的聚合`);
  }
  for (const aggregate of topicAggregates) {
    if (!sources[aggregate.id]) problems.push(`聚合 ${aggregate.id} 没有 UNIT_SOURCES 映射`);
  }

  const units = [];
  const paths = [];
  for (const aggregate of topicAggregates) {
    const source = sources[aggregate.id];
    if (!source) continue;
    if (!Array.isArray(aggregate.blocks) || aggregate.blocks.length === 0) {
      problems.push(`聚合 ${aggregate.id} 没有成员块`);
      continue;
    }
    if (source.mode === 'aggregate') {
      const members = unique(aggregate.blocks.flat());
      if (members.length === 0) problems.push(`聚合 ${aggregate.id} 展平后没有成员`);
      const missing = members.filter((id) => !nodeById.has(id));
      for (const id of missing) problems.push(`单元 unit:${aggregate.id} 的成员 ${id} 无法解析`);
      units.push({
        id: `unit:${aggregate.id}`,
        scale: 'unit',
        sigma: LEVEL_BY_ID.get('unit').sigma,
        title: source.title ?? aggregate.title,
        titleSource: source.title ? 'manual' : 'aggregate',
        members,
        organization: source.organization
          ?? `${aggregate.note ?? ''}（迁移：整条聚合登记为一个单元；成员为全部 ${aggregate.blocks.length} 个块展平，共 ${members.length} 个节点。）`.trim(),
        source: `aggregate:${aggregate.id}`,
        sourceAggregate: aggregate.id,
        sourceBlock: null,
        pathId: null,
        provisional: true,
        evidenceStatus: 'ILLUSTRATION',
      });
      continue;
    }
    if (source.mode !== 'blocks') {
      problems.push(`聚合 ${aggregate.id} 的映射模式无效：${source.mode}`);
      continue;
    }
    const path = pathGroups.find((item) => item.id === source.pathId && item.aggregateId === aggregate.id);
    if (!path) problems.push(`聚合 ${aggregate.id} 的路径组 ${source.pathId ?? '（缺）'} 未登记或与聚合不符`);
    const unitIds = [];
    aggregate.blocks.forEach((block, blockIndex) => {
      const members = unique(block);
      if (members.length === 0) problems.push(`聚合 ${aggregate.id} 的第 ${blockIndex + 1} 个块没有成员`);
      for (const id of members) if (!nodeById.has(id)) problems.push(`单元 unit:${aggregate.id}:${blockIndex} 的成员 ${id} 无法解析`);
      const override = source.titleOverrides?.[blockIndex];
      const unit = {
        id: `unit:${aggregate.id}:${blockIndex}`,
        scale: 'unit',
        sigma: LEVEL_BY_ID.get('unit').sigma,
        title: override ?? source.title ?? deriveUnitTitle(members, nodeById),
        titleSource: override ? 'manual' : source.title ? 'manual' : 'derived',
        members,
        organization: source.organization
          ?? `${aggregate.note ?? ''}（迁移：教材凝练路径的第 ${blockIndex + 1} 个块登记为单元；共 ${members.length} 个节点。）`.trim(),
        source: `aggregate:${aggregate.id}#${blockIndex}`,
        sourceAggregate: aggregate.id,
        sourceBlock: blockIndex,
        pathId: source.pathId ?? null,
        provisional: true,
        evidenceStatus: 'ILLUSTRATION',
      };
      units.push(unit);
      unitIds.push(unit.id);
    });
    paths.push({
      id: source.pathId ?? `path:${aggregate.id}`,
      title: aggregate.title,
      aggregateId: aggregate.id,
      unitIds,
      note: path?.note ?? '教材凝练路径：只用于把块单元分组显示，本身不是画布尺度对象。',
      provisional: true,
    });
  }

  units.sort(byId);

  const unitIds = new Set(units.map((unit) => unit.id));
  const topicViews = [];
  for (const topic of [...topics].sort(byId)) {
    const members = unique(Array.isArray(topic.members) ? topic.members : []);
    if (members.length === 0) problems.push(`话题 ${topic.id} 没有成员`);
    for (const id of members) if (!unitIds.has(id)) problems.push(`话题 ${topic.id} 的成员 ${id} 不是已登记单元`);
    topicViews.push({
      id: topic.id,
      scale: 'topic',
      sigma: LEVEL_BY_ID.get('topic').sigma,
      title: topic.title,
      titleSource: 'manual',
      members,
      organization: topic.organization ?? '',
      source: topic.source ?? '',
      provisional: true,
      evidenceStatus: topic.evidenceStatus ?? 'ILLUSTRATION',
      unitCount: members.length,
    });
  }
  topicViews.sort(byId);

  const moleculeViews = [];
  const moleculeNodes = new Set();
  for (const molecule of [...molecules].sort(byId)) {
    if (!nodeById.has(molecule.node)) problems.push(`分子 ${molecule.id} 的父节点 ${molecule.node} 无法解析`);
    if (moleculeNodes.has(molecule.node)) problems.push(`节点 ${molecule.node} 登记了多个分子`);
    moleculeNodes.add(molecule.node);
    if (!molecule.title || !molecule.expression) problems.push(`分子 ${molecule.id} 缺少标题或表达式`);
    if (!Array.isArray(molecule.atoms) || molecule.atoms.length === 0) problems.push(`分子 ${molecule.id} 没有原子明细`);
    moleculeViews.push({
      id: molecule.id,
      scale: 'molecule',
      sigma: LEVEL_BY_ID.get('molecule').sigma,
      title: molecule.title,
      expression: molecule.expression,
      construct: molecule.construct ?? '',
      atoms: molecule.atoms ?? [],
      node: molecule.node,
      parent: 'node',
      source: molecule.source ?? '',
      formulaStatus: molecule.formulaStatus ?? 'ILLUSTRATION',
      evidenceStatus: molecule.evidenceStatus ?? 'ILLUSTRATION',
      provisional: false,
    });
  }
  moleculeViews.sort(byId);

  const covered = new Set();
  for (const unit of units) for (const id of unit.members) covered.add(id);
  const nodeIds = nodes.map((node) => node.id);
  const uncovered = nodeIds.filter((id) => !covered.has(id));
  const counts = {
    levels: LEVEL_IDS.length,
    units: units.length,
    topics: topicViews.length,
    paths: paths.length,
    molecules: moleculeViews.length,
    aggregateUnits: units.filter((unit) => unit.pathId === null).length,
    blockUnits: units.filter((unit) => unit.pathId !== null).length,
    nodes: nodes.length,
    nodesCovered: covered.size,
    nodesUncovered: uncovered.length,
    unfinishedNodeIds: uncovered,
  };

  const plan = {
    schema,
    status,
    levels: SCALE_LEVELS.map((level) => ({ ...level })),
    units,
    topics: topicViews,
    paths: paths.sort(byId),
    molecules: moleculeViews,
    counts,
    notes: [...notes],
  };

  const structural = validateScalePlan(plan, { nodes, aggregates });
  const allProblems = [...problems, ...structural];
  if (allProblems.length > 0) {
    const error = new Error(`尺度登记未通过检查（${allProblems.length} 项）：\n- ${allProblems.join('\n- ')}`);
    error.problems = allProblems;
    throw error;
  }
  plan.version = planVersion(plan);
  return plan;
}

/**
 * 校验一份已经构建好的计划。返回问题清单（空数组 = 通过）。
 *
 * 这里只查**计划内部结构**与引用；「每个聚合是否都有映射」属于构建期检查
 * （需要原始 aggregates 与 sources），由 `buildScalePlan` 负责。
 */
export function validateScalePlan(plan, { nodes = [], aggregates = [] } = {}) {
  const problems = [];
  if (!plan || typeof plan !== 'object') return ['尺度计划不是对象'];
  if (plan.schema !== SCALE_SCHEMA_VERSION) problems.push(`尺度计划 schema 无效：${plan.schema}`);
  if (plan.status !== SCALE_STATUS) problems.push(`尺度计划 status 无效：${plan.status}`);

  const levels = Array.isArray(plan.levels) ? plan.levels : [];
  if (levels.length !== 4) problems.push(`尺度层级应为 4 层，实际 ${levels.length}`);
  for (const [index, expected] of ['molecule', 'node', 'unit', 'topic'].entries()) {
    const level = levels[index];
    if (!level || level.id !== expected || level.sigma !== index + 1) problems.push(`尺度层级第 ${index + 1} 项应为 ${expected}（sigma ${index + 1}）`);
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const unitIds = new Set((plan.units ?? []).map((unit) => unit.id));
  const topicIds = new Set((plan.topics ?? []).map((topic) => topic.id));
  const allIds = new Map();
  const registerId = (kind, id) => {
    if (typeof id !== 'string' || !id) { problems.push(`${kind} 的 id 无效`); return; }
    if (nodeIds.has(id)) problems.push(`${kind} 的 id 与节点冲突：${id}`);
    if (allIds.has(id)) problems.push(`${kind} 的 id 重复：${id}（已用于 ${allIds.get(id)}）`);
    allIds.set(id, kind);
  };

  for (const unit of plan.units ?? []) {
    registerId('单元', unit.id);
    if (unit.scale !== 'unit' || unit.sigma !== 3) problems.push(`单元 ${unit.id} 的 scale/sigma 无效`);
    if (!unit.title || typeof unit.title !== 'string') problems.push(`单元 ${unit.id} 缺少标题`);
    if (!['aggregate', 'derived', 'manual'].includes(unit.titleSource)) problems.push(`单元 ${unit.id} 的 titleSource 无效：${unit.titleSource}`);
    if (!unit.organization) problems.push(`单元 ${unit.id} 缺少组织依据`);
    if (!unit.source) problems.push(`单元 ${unit.id} 缺少来源`);
    const members = Array.isArray(unit.members) ? unit.members : [];
    if (members.length === 0) problems.push(`单元 ${unit.id} 没有成员`);
    if (new Set(members).size !== members.length) problems.push(`单元 ${unit.id} 的成员有重复`);
    for (const id of members) if (!nodeIds.has(id)) problems.push(`单元 ${unit.id} 的成员 ${id} 无法解析`);
    if (unit.pathId !== null && unit.pathId !== undefined && !(plan.paths ?? []).some((path) => path.id === unit.pathId)) {
      problems.push(`单元 ${unit.id} 的路径组 ${unit.pathId} 不存在`);
    }
  }

  for (const topic of plan.topics ?? []) {
    registerId('话题', topic.id);
    if (topic.scale !== 'topic' || topic.sigma !== 4) problems.push(`话题 ${topic.id} 的 scale/sigma 无效`);
    if (!topic.title || typeof topic.title !== 'string') problems.push(`话题 ${topic.id} 缺少标题`);
    if (!topic.organization) problems.push(`话题 ${topic.id} 缺少组织依据`);
    if (!topic.source) problems.push(`话题 ${topic.id} 缺少来源`);
    const members = Array.isArray(topic.members) ? topic.members : [];
    if (members.length === 0) problems.push(`话题 ${topic.id} 没有成员`);
    if (new Set(members).size !== members.length) problems.push(`话题 ${topic.id} 的成员有重复`);
    for (const id of members) if (!unitIds.has(id)) problems.push(`话题 ${topic.id} 的成员 ${id} 不是已登记单元`);
    if (topic.unitCount !== members.length) problems.push(`话题 ${topic.id} 的 unitCount 与成员数不一致`);
  }

  for (const molecule of plan.molecules ?? []) {
    registerId('分子', molecule.id);
    if (molecule.scale !== 'molecule' || molecule.sigma !== 1) problems.push(`分子 ${molecule.id} 的 scale/sigma 无效`);
    if (!molecule.title) problems.push(`分子 ${molecule.id} 缺少标题`);
    if (!molecule.expression) problems.push(`分子 ${molecule.id} 缺少表达式`);
    if (!molecule.source) problems.push(`分子 ${molecule.id} 缺少来源`);
    if (!Array.isArray(molecule.atoms) || molecule.atoms.length === 0) problems.push(`分子 ${molecule.id} 没有原子明细`);
    if (!nodeIds.has(molecule.node)) problems.push(`分子 ${molecule.id} 的父节点 ${molecule.node} 无法解析`);
  }
  const moleculeParents = new Map();
  for (const molecule of plan.molecules ?? []) {
    if (moleculeParents.has(molecule.node)) problems.push(`节点 ${molecule.node} 登记了多个分子`);
    moleculeParents.set(molecule.node, molecule.id);
  }

  for (const path of plan.paths ?? []) {
    if (!path.id || !path.aggregateId || !Array.isArray(path.unitIds)) problems.push(`路径组 ${path.id ?? '（缺 id）'} 结构无效`);
    for (const id of path.unitIds ?? []) if (!unitIds.has(id)) problems.push(`路径组 ${path.id} 的单元 ${id} 不存在`);
  }

  const topicAggregateIds = new Set(aggregates.filter((aggregate) => aggregate.kind === 'topic').map((aggregate) => aggregate.id));
  if (topicAggregateIds.size > 0) {
    const mapped = new Set((plan.units ?? []).map((unit) => unit.sourceAggregate).filter(Boolean));
    for (const id of topicAggregateIds) if (!mapped.has(id)) problems.push(`聚合 ${id} 没有任何单元映射`);
    for (const id of mapped) if (!topicAggregateIds.has(id)) problems.push(`单元引用了不存在的聚合 ${id}`);
    for (const aggregate of aggregates.filter((item) => item.kind === 'topic')) {
      const expected = aggregate.blocks.length;
      const actual = (plan.units ?? []).filter((unit) => unit.sourceAggregate === aggregate.id).length;
      if (actual === 0) continue;
      const mode = actual === 1 && (plan.units ?? []).find((unit) => unit.sourceAggregate === aggregate.id)?.sourceBlock === null
        ? 'aggregate'
        : 'blocks';
      if (mode === 'blocks' && actual !== expected) problems.push(`聚合 ${aggregate.id} 登记了 ${actual} 个块单元，实际有 ${expected} 个块`);
      if (mode === 'aggregate') {
        const unit = (plan.units ?? []).find((item) => item.sourceAggregate === aggregate.id);
        const flattened = new Set(aggregate.blocks.flat());
        for (const id of flattened) if (!unit.members.includes(id)) problems.push(`聚合 ${aggregate.id} 的整条单元漏了成员 ${id}`);
        for (const id of unit.members) if (!flattened.has(id)) problems.push(`聚合 ${aggregate.id} 的整条单元多了成员 ${id}`);
      }
    }
  }

  // 无环：成员边一律从低尺度指向高尺度；用孩子 → 父对象做 DFS。
  const edges = new Map();
  const addEdge = (child, parent) => {
    if (!edges.has(child)) edges.set(child, []);
    edges.get(child).push(parent);
  };
  for (const unit of plan.units ?? []) for (const id of unit.members ?? []) addEdge(id, unit.id);
  for (const topic of plan.topics ?? []) for (const id of topic.members ?? []) addEdge(id, topic.id);
  for (const molecule of plan.molecules ?? []) addEdge(molecule.id, molecule.node);
  const visiting = new Set();
  const visited = new Set();
  const visit = (id) => {
    if (visiting.has(id)) { problems.push(`成员关系成环：${id}`); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const parent of edges.get(id) ?? []) visit(parent);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of [...edges.keys()]) visit(id);

  const covered = new Set();
  for (const unit of plan.units ?? []) for (const id of unit.members ?? []) covered.add(id);
  const counts = plan.counts ?? {};
  if (counts.units !== (plan.units ?? []).length) problems.push(`counts.units 与实际不一致`);
  if (counts.topics !== (plan.topics ?? []).length) problems.push(`counts.topics 与实际不一致`);
  if (counts.paths !== (plan.paths ?? []).length) problems.push(`counts.paths 与实际不一致`);
  if (counts.molecules !== (plan.molecules ?? []).length) problems.push(`counts.molecules 与实际不一致`);
  if (counts.nodesCovered !== covered.size) problems.push(`counts.nodesCovered 与实际不一致`);
  if (counts.nodesUncovered !== nodeIds.size - covered.size && nodeIds.size > 0) problems.push(`counts.nodesUncovered 与实际不一致`);

  if (plan.version && plan.version !== planVersion(plan)) problems.push('尺度计划版本号与内容不一致');
  return problems;
}

export function scalePlanStats(plan) {
  return {
    version: plan.version,
    units: plan.units.length,
    topics: plan.topics.length,
    paths: plan.paths.length,
    molecules: plan.molecules.length,
    aggregateUnits: plan.counts.aggregateUnits,
    blockUnits: plan.counts.blockUnits,
    nodesCovered: plan.counts.nodesCovered,
    nodes: plan.counts.nodes,
  };
}

/** 给服务端/测试用：节点 id → 全部分子（当前每节点至多一个）。 */
export function moleculesByNode(plan) {
  const map = new Map();
  for (const molecule of plan.molecules) {
    if (!map.has(molecule.node)) map.set(molecule.node, []);
    map.get(molecule.node).push(molecule);
  }
  return map;
}
