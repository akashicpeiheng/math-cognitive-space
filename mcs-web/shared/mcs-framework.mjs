/**
 * MSC 2020 / arXiv 分类对照与对象结构摘要（D 层）。
 *
 * 这里的数据只服务 `/mcs` 的检索与展示：
 * - 分类号不是本站的数学分类，不生成对象、成员关系或数学关系；
 * - 中文名是显示译名，官方标题以英文为准；
 * - 领域/分支到分类号的关联是可调整的编辑对照，不声称穷尽或唯一；
 * - 所有计数都从 `McsViewData` 与 `createMcsAtlas()` 的只读结果派生。
 *
 * 源：
 * - AMS, 2020 Mathematics Subject Classification
 *   https://mathscinet.ams.org/mathscinet/msc/msc2020.html
 * - arXiv, Mathematics categories
 *   https://arxiv.org/archive/math
 * 两处均在 2026-11-15 核对。
 */
import { MCS_CROSS_FIELDS } from './mcs-crossfields.mjs';

export const MCS_FRAMEWORK_SCHEMA = 'mcs-framework/1';

export const MSC_2020_SOURCE = Object.freeze({
  id: 'msc2020',
  title: Object.freeze({ zh: 'MSC 2020 数学主题分类', en: 'Mathematics Subject Classification 2020' }),
  url: 'https://mathscinet.ams.org/mathscinet/msc/msc2020.html',
  checked: '2026-11-15',
});

export const ARXIV_MATH_SOURCE = Object.freeze({
  id: 'arxiv-math',
  title: Object.freeze({ zh: 'arXiv 数学分类', en: 'arXiv Mathematics categories' }),
  url: 'https://arxiv.org/archive/math',
  checked: '2026-11-15',
});

const msc = (code, en, zh, primaryField) => Object.freeze({
  code,
  title: Object.freeze({ en, zh }),
  primaryField,
});

/** 63 个 MSC2020 有效二位组；英文标题照录 AMS，中文为本站显示译名。 */
export const MSC_2020 = Object.freeze([
  msc('00', 'General and overarching topics; collections', '总论与综述', 'atlas:foundations-computation'),
  msc('01', 'History and biography', '数学史与人物传记', 'atlas:foundations-computation'),
  msc('03', 'Mathematical logic and foundations', '数理逻辑与数学基础', 'atlas:foundations-computation'),
  msc('05', 'Combinatorics', '组合数学', 'atlas:discrete'),
  msc('06', 'Order, lattices, ordered algebraic structures', '序、格与序代数结构', 'atlas:discrete'),
  msc('08', 'General algebraic systems', '一般代数系统', 'atlas:algebra'),
  msc('11', 'Number theory', '数论', 'atlas:number-theory'),
  msc('12', 'Field theory and polynomials', '域论与多项式', 'atlas:algebra'),
  msc('13', 'Commutative algebra', '交换代数', 'atlas:algebra'),
  msc('14', 'Algebraic geometry', '代数几何', 'atlas:geometry'),
  msc('15', 'Linear and multilinear algebra; matrix theory', '线性与多重线性代数、矩阵论', 'atlas:algebra'),
  msc('16', 'Associative rings and algebras', '结合环与结合代数', 'atlas:algebra'),
  msc('17', 'Nonassociative rings and algebras', '非结合环与非结合代数', 'atlas:algebra'),
  msc('18', 'Category theory; homological algebra', '范畴论与同调代数', 'atlas:foundations-computation'),
  msc('19', 'K-theory', 'K 理论', 'atlas:algebra'),
  msc('20', 'Group theory and generalizations', '群论及其推广', 'atlas:algebra'),
  msc('22', 'Topological groups, Lie groups', '拓扑群、李群', 'atlas:topology'),
  msc('26', 'Real functions', '实函数', 'atlas:analysis'),
  msc('28', 'Measure and integration', '测度与积分', 'atlas:analysis'),
  msc('30', 'Functions of a complex variable', '单复变函数', 'atlas:analysis'),
  msc('31', 'Potential theory', '位势论', 'atlas:analysis'),
  msc('32', 'Several complex variables and analytic spaces', '多复变与解析空间', 'atlas:analysis'),
  msc('33', 'Special functions', '特殊函数', 'atlas:analysis'),
  msc('34', 'Ordinary differential equations', '常微分方程', 'atlas:analysis'),
  msc('35', 'Partial differential equations', '偏微分方程', 'atlas:analysis'),
  msc('37', 'Dynamical systems and ergodic theory', '动力系统与遍历理论', 'atlas:analysis'),
  msc('39', 'Difference and functional equations', '差分方程与函数方程', 'atlas:analysis'),
  msc('40', 'Sequences, series, summability', '序列、级数、可和性', 'atlas:analysis'),
  msc('41', 'Approximations and expansions', '逼近与展开', 'atlas:analysis'),
  msc('42', 'Harmonic analysis on Euclidean spaces', '欧氏空间上的调和分析', 'atlas:analysis'),
  msc('43', 'Abstract harmonic analysis', '抽象调和分析', 'atlas:analysis'),
  msc('44', 'Integral transforms, operational calculus', '积分变换、算子演算', 'atlas:analysis'),
  msc('45', 'Integral equations', '积分方程', 'atlas:analysis'),
  msc('46', 'Functional analysis', '泛函分析', 'atlas:analysis'),
  msc('47', 'Operator theory', '算子理论', 'atlas:analysis'),
  msc('49', 'Calculus of variations and optimal control; optimization', '变分法、最优控制与优化', 'atlas:analysis'),
  msc('51', 'Geometry', '几何', 'atlas:geometry'),
  msc('52', 'Convex and discrete geometry', '凸几何与离散几何', 'atlas:geometry'),
  msc('53', 'Differential geometry', '微分几何', 'atlas:geometry'),
  msc('54', 'General topology', '一般拓扑', 'atlas:topology'),
  msc('55', 'Algebraic topology', '代数拓扑', 'atlas:topology'),
  msc('57', 'Manifolds and cell complexes', '流形与胞腔复形', 'atlas:geometry'),
  msc('58', 'Global analysis, analysis on manifolds', '整体分析、流形上的分析', 'atlas:geometry'),
  msc('60', 'Probability theory and stochastic processes', '概率论与随机过程', 'atlas:probability-statistics'),
  msc('62', 'Statistics', '统计学', 'atlas:probability-statistics'),
  msc('65', 'Numerical analysis', '数值分析', 'atlas:foundations-computation'),
  msc('68', 'Computer science', '计算机科学', 'atlas:foundations-computation'),
  msc('70', 'Mechanics of particles and systems', '质点与系统力学', 'unmapped'),
  msc('74', 'Mechanics of deformable solids', '变形固体力学', 'unmapped'),
  msc('76', 'Fluid mechanics', '流体力学', 'unmapped'),
  msc('78', 'Optics, electromagnetic theory', '光学、电磁理论', 'unmapped'),
  msc('80', 'Classical thermodynamics, heat transfer', '经典热力学、传热', 'unmapped'),
  msc('81', 'Quantum theory', '量子理论', 'unmapped'),
  msc('82', 'Statistical mechanics, structure of matter', '统计力学、物质结构', 'unmapped'),
  msc('83', 'Relativity and gravitational theory', '相对论与引力理论', 'unmapped'),
  msc('85', 'Astronomy and astrophysics', '天文学与天体物理', 'unmapped'),
  msc('86', 'Geophysics', '地球物理', 'unmapped'),
  msc('90', 'Operations research, mathematical programming', '运筹学、数学规划', 'atlas:discrete'),
  msc('91', 'Game theory, economics, finance, and other social and behavioral sciences', '博弈论、经济学、金融及其他社会科学', 'atlas:probability-statistics'),
  msc('92', 'Biology and other natural sciences', '生物学及其他自然科学', 'unmapped'),
  msc('93', 'Systems theory; control', '系统论、控制', 'unmapped'),
  msc('94', 'Information and communication theory, circuits', '信息与通信理论、电路', 'atlas:probability-statistics'),
  msc('97', 'Mathematics education', '数学教育', 'atlas:foundations-computation'),
]);

const arxiv = (code, en, zh) => Object.freeze({ code, title: Object.freeze({ en, zh }) });

/** 32 个 arXiv math 分类；中文名同样是显示译名。 */
export const ARXIV_MATH = Object.freeze([
  arxiv('math.AC', 'Commutative Algebra', '交换代数'),
  arxiv('math.AG', 'Algebraic Geometry', '代数几何'),
  arxiv('math.AP', 'Analysis of PDEs', '偏微分方程分析'),
  arxiv('math.AT', 'Algebraic Topology', '代数拓扑'),
  arxiv('math.CA', 'Classical Analysis and ODEs', '经典分析与常微分方程'),
  arxiv('math.CO', 'Combinatorics', '组合数学'),
  arxiv('math.CT', 'Category Theory', '范畴论'),
  arxiv('math.CV', 'Complex Variables', '复分析'),
  arxiv('math.DG', 'Differential Geometry', '微分几何'),
  arxiv('math.DS', 'Dynamical Systems', '动力系统'),
  arxiv('math.FA', 'Functional Analysis', '泛函分析'),
  arxiv('math.GM', 'General Mathematics', '一般数学'),
  arxiv('math.GN', 'General Topology', '一般拓扑'),
  arxiv('math.GR', 'Group Theory', '群论'),
  arxiv('math.GT', 'Geometric Topology', '几何拓扑'),
  arxiv('math.HO', 'History and Overview', '数学史与综述'),
  arxiv('math.IT', 'Information Theory', '信息论'),
  arxiv('math.KT', 'K-Theory and Homology', 'K 理论与同调'),
  arxiv('math.LO', 'Logic', '逻辑'),
  arxiv('math.MG', 'Metric Geometry', '度量几何'),
  arxiv('math.MP', 'Mathematical Physics', '数学物理'),
  arxiv('math.NA', 'Numerical Analysis', '数值分析'),
  arxiv('math.NT', 'Number Theory', '数论'),
  arxiv('math.OA', 'Operator Algebras', '算子代数'),
  arxiv('math.OC', 'Optimization and Control', '优化与控制'),
  arxiv('math.PR', 'Probability', '概率'),
  arxiv('math.QA', 'Quantum Algebra', '量子代数'),
  arxiv('math.RA', 'Rings and Algebras', '环与代数'),
  arxiv('math.RT', 'Representation Theory', '表示论'),
  arxiv('math.SG', 'Symplectic Geometry', '辛几何'),
  arxiv('math.SP', 'Spectral Theory', '谱理论'),
  arxiv('math.ST', 'Statistics Theory', '统计理论'),
]);

export const MSC_PRIMARY_FIELD = Object.freeze(Object.fromEntries(
  MSC_2020.map(entry => [entry.code, entry.primaryField]),
));

export const UNMAPPED_MSC = Object.freeze(MSC_2020
  .filter(entry => entry.primaryField === 'unmapped')
  .map(entry => entry.code));

const field = (mscCodes, arxivCodes) => Object.freeze({
  msc: Object.freeze(mscCodes),
  arxiv: Object.freeze(arxivCodes),
});

/** 八个导航领域的主归属分类。跨领域码在分支层另行关联。 */
export const MCS_FIELD_FRAMEWORK = Object.freeze({
  'atlas:analysis': field(
    ['26', '28', '30', '31', '32', '33', '34', '35', '37', '39', '40', '41', '42', '43', '44', '45', '46', '47', '49'],
    ['math.CA', 'math.CV', 'math.AP', 'math.FA', 'math.SP', 'math.DS'],
  ),
  'atlas:algebra': field(
    ['08', '12', '13', '15', '16', '17', '19', '20'],
    ['math.RA', 'math.AC', 'math.GR', 'math.RT', 'math.KT', 'math.OA', 'math.QA'],
  ),
  'atlas:geometry': field(
    ['14', '51', '52', '53', '57', '58'],
    ['math.AG', 'math.DG', 'math.MG', 'math.GT', 'math.SG'],
  ),
  'atlas:topology': field(
    ['22', '54', '55'],
    ['math.GN', 'math.AT', 'math.GT'],
  ),
  'atlas:number-theory': field(
    ['11'],
    ['math.NT'],
  ),
  'atlas:discrete': field(
    ['05', '06', '90'],
    ['math.CO', 'math.OC', 'math.RA'],
  ),
  'atlas:probability-statistics': field(
    ['60', '62', '91', '94'],
    ['math.PR', 'math.ST', 'math.IT', 'math.OC'],
  ),
  'atlas:foundations-computation': field(
    ['00', '01', '03', '18', '65', '68', '97'],
    ['math.LO', 'math.CT', 'math.HO', 'math.NA', 'math.GM'],
  ),
});

const branch = (mscCodes, arxivCodes) => Object.freeze({
  msc: Object.freeze(mscCodes),
  arxiv: Object.freeze(arxivCodes),
});

/**
 * 普通导航分支的直接关联。交叉入口不在这里：它们由双方领域并集派生。
 * 未列出的普通分支会继承父领域，并在 `source` 标为 inherited。
 */
export const MCS_BRANCH_FRAMEWORK = Object.freeze({
  'atlas:calculus': branch(['26'], ['math.CA']),
  'atlas:real-analysis': branch(['26', '28', '40'], ['math.CA', 'math.FA']),
  'atlas:complex-analysis': branch(['30', '31', '32'], ['math.CV']),
  'atlas:functional-analysis': branch(['46', '47'], ['math.FA', 'math.SP']),
  'atlas:differential-equations': branch(['34', '35', '37'], ['math.AP', 'math.CA', 'math.DS']),

  'atlas:linear-algebra': branch(['15'], ['math.RA']),
  'atlas:group-theory': branch(['20'], ['math.GR']),
  'atlas:rings-fields': branch(['12', '13', '16', '17'], ['math.AC', 'math.RA']),
  'atlas:representation-theory': branch(['20'], ['math.RT', 'math.GR']),

  'atlas:euclidean-geometry': branch(['51'], ['math.MG']),
  'atlas:differential-geometry': branch(['53', '58'], ['math.DG']),
  'atlas:algebraic-geometry': branch(['14'], ['math.AG']),
  'atlas:convex-geometry': branch(['52'], ['math.MG']),

  'atlas:point-set-topology': branch(['54'], ['math.GN']),
  'atlas:algebraic-topology': branch(['55'], ['math.AT']),
  'atlas:geometric-topology': branch(['57'], ['math.GT']),

  'atlas:elementary-number-theory': branch(['11'], ['math.NT']),
  'atlas:analytic-number-theory': branch(['11'], ['math.NT']),
  'atlas:algebraic-number-theory': branch(['11'], ['math.NT']),
  'atlas:arithmetic-geometry': branch(['11', '14'], ['math.NT', 'math.AG']),

  'atlas:combinatorics': branch(['05'], ['math.CO']),
  'atlas:graph-theory': branch(['05'], ['math.CO']),
  'atlas:discrete-optimization': branch(['90'], ['math.OC', 'math.CO']),

  'atlas:probability': branch(['60'], ['math.PR']),
  'atlas:statistics': branch(['62'], ['math.ST']),
  'atlas:stochastic-processes': branch(['60'], ['math.PR']),

  'atlas:logic': branch(['03'], ['math.LO']),
  'atlas:set-theory': branch(['03'], ['math.LO']),
  'atlas:category-theory': branch(['18'], ['math.CT']),
  'atlas:computability': branch(['03', '68'], ['math.LO']),
  'atlas:numerical-analysis': branch(['65'], ['math.NA']),
});

const MSC_BY_CODE = new Map(MSC_2020.map(entry => [entry.code, entry]));
const ARXIV_BY_CODE = new Map(ARXIV_MATH.map(entry => [entry.code, entry]));

const compareCode = (a, b) => a < b ? -1 : a > b ? 1 : 0;

function resolveMsc(codes) {
  return [...new Set(codes)]
    .map(code => MSC_BY_CODE.get(code))
    .filter(Boolean)
    .sort((a, b) => compareCode(a.code, b.code));
}

function resolveArxiv(codes) {
  return [...new Set(codes)]
    .map(code => ARXIV_BY_CODE.get(code))
    .filter(Boolean)
    .sort((a, b) => compareCode(a.code, b.code));
}

function mergeFrameworks(entries) {
  return {
    msc: resolveMsc(entries.flatMap(entry => entry.msc)),
    arxiv: resolveArxiv(entries.flatMap(entry => entry.arxiv)),
  };
}

const EMPTY_FRAMEWORK = Object.freeze({
  msc: Object.freeze([]),
  arxiv: Object.freeze([]),
  source: 'none',
});

/**
 * Resolve a node's classification. Direct branch mapping wins, then a named
 * crossing's two fields, then the field itself, then the parent's display.
 * Object nodes therefore show the framework of their navigation context.
 */
export function frameworkFor(node, atlas) {
  if (!node || !atlas?.byId) return EMPTY_FRAMEWORK;
  const direct = MCS_BRANCH_FRAMEWORK[node.id];
  if (direct) return { ...mergeFrameworks([direct]), source: 'branch' };
  if (node.crossingId) {
    const crossing = MCS_CROSS_FIELDS.find(item => item.id === node.crossingId);
    const fields = crossing?.domains.map(id => MCS_FIELD_FRAMEWORK[id]).filter(Boolean) ?? [];
    if (fields.length) return { ...mergeFrameworks(fields), source: 'crossing' };
  }
  const fieldEntry = MCS_FIELD_FRAMEWORK[node.id];
  if (fieldEntry) return { ...mergeFrameworks([fieldEntry]), source: 'field' };
  if (node.parentId && atlas.byId[node.parentId]) {
    const inherited = frameworkFor(atlas.byId[node.parentId], atlas);
    if (inherited.source !== 'none') return { ...inherited, source: 'inherited' };
  }
  return EMPTY_FRAMEWORK;
}

function fieldIdOf(node, atlas) {
  for (let current = node; current; current = current.parentId ? atlas.byId[current.parentId] : undefined) {
    if (MCS_FIELD_FRAMEWORK[current.id]) return current.id;
  }
  return null;
}

function subtreeObjects(node, cache) {
  if (cache.has(node.id)) return cache.get(node.id);
  const objectIds = new Set();
  if (node.objectId) objectIds.add(node.objectId);
  for (const child of node.children) {
    for (const id of subtreeObjects(child, cache)) objectIds.add(id);
  }
  cache.set(node.id, objectIds);
  return objectIds;
}

function branchIndex(atlas) {
  const byCode = new Map();
  for (const [branchId, entry] of Object.entries(MCS_BRANCH_FRAMEWORK)) {
    if (!atlas.byId[branchId]) continue;
    for (const code of entry.msc) {
      if (!byCode.has(code)) byCode.set(code, []);
      byCode.get(code).push(branchId);
    }
  }
  return byCode;
}

/**
 * Build the classification index. Each MSC code appears once, grouped by its
 * primary field; branch and object counts are derived from the current atlas.
 */
export function frameworkRows(atlas, { onlyCollected = false } = {}) {
  const cache = new Map();
  const byCode = branchIndex(atlas);
  const fieldOrder = atlas.root.children
    .filter(node => MCS_FIELD_FRAMEWORK[node.id])
    .map(node => node.id);
  const groups = new Map(fieldOrder.map(id => [id, {
    id,
    title: atlas.byId[id].title,
    rows: [],
  }]));
  groups.set('unmapped', {
    id: 'unmapped',
    title: { zh: '未映射到本图', en: 'Not mapped to this map' },
    rows: [],
  });

  const rows = [];
  for (const entry of MSC_2020) {
    const branchIds = (byCode.get(entry.code) ?? [])
      .filter(id => atlas.byId[id])
      .sort((a, b) => atlas.nodes.indexOf(atlas.byId[a]) - atlas.nodes.indexOf(atlas.byId[b]));
    const branchFields = [...new Set(branchIds.map(id => fieldIdOf(atlas.byId[id], atlas)).filter(Boolean))];
    const primaryField = entry.primaryField;
    const fieldIds = [...new Set([primaryField, ...branchFields].filter(id => MCS_FIELD_FRAMEWORK[id]))];
    const objectIds = new Set();
    for (const branchId of branchIds) {
      for (const objectId of subtreeObjects(atlas.byId[branchId], cache)) objectIds.add(objectId);
    }
    const targetId = branchIds.find(id => subtreeObjects(atlas.byId[id], cache).size > 0)
      ?? branchIds[0]
      ?? (MCS_FIELD_FRAMEWORK[primaryField] ? primaryField : null);
    const arxivCodes = branchIds.length
      ? branchIds.flatMap(id => MCS_BRANCH_FRAMEWORK[id]?.arxiv ?? [])
      : (MCS_FIELD_FRAMEWORK[primaryField]?.arxiv ?? []);
    const row = {
      code: entry.code,
      title: entry.title,
      primaryField,
      fieldIds,
      branchIds,
      branchTitles: branchIds.map(id => ({ id, title: atlas.byId[id].title })),
      arxiv: resolveArxiv(arxivCodes),
      objectIds,
      objectCount: objectIds.size,
      targetId,
      scope: branchIds.length ? 'branch' : MCS_FIELD_FRAMEWORK[primaryField] ? 'field' : 'unmapped',
    };
    rows.push(row);
    const groupId = groups.has(primaryField) ? primaryField : 'unmapped';
    groups.get(groupId).rows.push(row);
  }

  const filteredGroups = [...groups.values()]
    .map(group => ({
      ...group,
      rows: onlyCollected ? group.rows.filter(row => row.objectCount > 0) : group.rows,
    }))
    .filter(group => group.rows.length > 0 || (!onlyCollected && group.id !== 'unmapped'));

  const visibleRows = filteredGroups.flatMap(group => group.rows);
  return {
    schema: MCS_FRAMEWORK_SCHEMA,
    groups: filteredGroups,
    rows: visibleRows,
    counts: {
      total: rows.length,
      visible: visibleRows.length,
      collected: rows.filter(row => row.objectCount > 0).length,
      unmapped: rows.filter(row => row.scope === 'unmapped').length,
    },
  };
}

const searchable = row => [
  row.code,
  row.title.en,
  row.title.zh,
  ...row.arxiv.map(entry => entry.code),
  ...row.arxiv.map(entry => entry.title.en),
  ...row.arxiv.map(entry => entry.title.zh),
  ...row.branchTitles.flatMap(branch => [branch.title.zh, branch.title.en]),
].join(' ').toLocaleLowerCase();

/** Search by MSC/arXiv code, official English title, or Chinese display name. */
export function frameworkSearch(rows, query, limit = 16) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [];
  const source = Array.isArray(rows) ? rows : rows.rows;
  const score = row => {
    if (row.code === needle) return 0;
    if (row.arxiv.some(entry => entry.code.toLocaleLowerCase() === needle)) return 0;
    if (row.code.startsWith(needle)) return 1;
    if (row.arxiv.some(entry => entry.code.toLocaleLowerCase().startsWith(needle))) return 1;
    return 2;
  };
  return source
    .filter(row => searchable(row).includes(needle))
    .sort((a, b) => score(a) - score(b) || compareCode(a.code, b.code))
    .slice(0, limit);
}

export function frameworkObjectIds(rows, code) {
  const source = Array.isArray(rows) ? rows : rows.rows;
  const row = source.find(entry => entry.code === code);
  return row ? [...row.objectIds] : [];
}

export function frameworkCode(rows, code) {
  const source = Array.isArray(rows) ? rows : rows.rows;
  return source.find(entry => entry.code === code) ?? null;
}

/**
 * IDs kept bright when a code filter is active: every matched branch, its
 * whole subtree, its primary field, and the ancestors that give it context.
 */
export function frameworkFilterIds(atlas, code) {
  const index = frameworkRows(atlas);
  const row = frameworkCode(index, code);
  if (!row) return new Set();
  const targets = [...new Set([...row.branchIds, ...row.fieldIds])];
  if (!targets.length) return new Set();
  const active = new Set([atlas.root.id]);
  const addAncestors = node => {
    for (let parentId = node.parentId; parentId; parentId = atlas.byId[parentId]?.parentId) {
      active.add(parentId);
    }
  };
  const addSubtree = node => {
    active.add(node.id);
    for (const child of node.children) addSubtree(child);
  };
  if (row.branchIds.length) {
    for (const id of row.branchIds) {
      const node = atlas.byId[id];
      if (!node) continue;
      addSubtree(node);
      addAncestors(node);
    }
    // A primary field stays visible as orientation, but its other branches
    // are not silently promoted into the filter result.
    for (const id of row.fieldIds) {
      const node = atlas.byId[id];
      if (!node) continue;
      active.add(node.id);
      addAncestors(node);
    }
  } else {
    for (const id of row.fieldIds) {
      const node = atlas.byId[id];
      if (!node) continue;
      addSubtree(node);
      addAncestors(node);
    }
  }
  return active;
}

/**
 * One object's formal position. This is a read-only summary; it does not
 * infer composition, transitive closure, or learner state.
 */
export function objectStructure(data, objectId, { primaryParentId } = {}) {
  const object = data.objects.find(item => item.id === objectId);
  if (!object) return null;
  const parents = data.objects
    .filter(parent => parent.id !== object.id && parent.members.some(ref =>
      ref.id === object.id && ref.anchor === '$' &&
      ref.version === object.version && ref.formalHash === object.formalHash))
    .map(parent => ({ id: parent.id, title: parent.title, primary: parent.id === primaryParentId }))
    .sort((a, b) => Number(b.primary) - Number(a.primary) || a.id.localeCompare(b.id, 'en'));
  const related = data.relations.filter(relation =>
    relation.from.id === object.id ||
    relation.to.id === object.id ||
    relation.premises.some(ref => ref.id === object.id));
  const byKind = {};
  for (const relation of related) byKind[relation.kind] = (byKind[relation.kind] ?? 0) + 1;
  const evidenceStatus = {};
  for (const relation of related) {
    evidenceStatus[relation.evidence.status] = (evidenceStatus[relation.evidence.status] ?? 0) + 1;
  }
  const declarationKinds = {};
  const declarationStatus = {};
  for (const declaration of object.declarations) {
    declarationKinds[declaration.kind] = (declarationKinds[declaration.kind] ?? 0) + 1;
    declarationStatus[declaration.status] = (declarationStatus[declaration.status] ?? 0) + 1;
  }
  const scale = data.levels.find(level => level.id === object.scale);
  return {
    id: object.id,
    title: object.title,
    scale: object.scale,
    scaleTitle: scale?.title ?? object.scale,
    scaleIndex: scale?.sigma ?? null,
    parents,
    declarations: {
      total: object.declarations.length,
      kinds: declarationKinds,
      status: declarationStatus,
    },
    relations: {
      total: related.length,
      ids: related.map(relation => relation.id),
      from: related.filter(relation => relation.from.id === object.id).length,
      to: related.filter(relation => relation.to.id === object.id).length,
      premise: related.filter(relation => relation.premises.some(ref => ref.id === object.id)).length,
      byKind,
    },
    evidence: evidenceStatus,
    assumptions: object.assumptions.length,
    members: object.members.length,
  };
}

const MSC_CODE = /^\d{2}$/;
const ARXIV_CODE = /^math\.[A-Z]{2}$/;
const https = value => typeof value === 'string' && value.startsWith('https://');

/** Static consistency checks used by tests; never called during rendering. */
export function validateFrameworkRegistry(atlas) {
  const problems = [];
  const fieldIds = atlas.root.children
    .map(node => node.id)
    .filter(id => MCS_FIELD_FRAMEWORK[id]);
  if (fieldIds.length !== 8) problems.push(`expected 8 mapped fields, found ${fieldIds.length}`);
  if (MSC_2020.length !== 63) problems.push(`expected 63 MSC2020 groups, found ${MSC_2020.length}`);
  if (new Set(MSC_2020.map(entry => entry.code)).size !== MSC_2020.length) problems.push('duplicate MSC codes');
  if (new Set(ARXIV_MATH.map(entry => entry.code)).size !== ARXIV_MATH.length) problems.push('duplicate arXiv codes');
  if (ARXIV_MATH.length !== 32) problems.push(`expected 32 arXiv math categories, found ${ARXIV_MATH.length}`);
  if (!https(MSC_2020_SOURCE.url) || !https(ARXIV_MATH_SOURCE.url)) problems.push('classification sources must be https');
  for (const entry of MSC_2020) {
    if (!MSC_CODE.test(entry.code)) problems.push(`invalid MSC code ${entry.code}`);
    if (!entry.title?.en || !entry.title?.zh) problems.push(`MSC ${entry.code} needs paired titles`);
    if (entry.primaryField !== 'unmapped' && !MCS_FIELD_FRAMEWORK[entry.primaryField]) {
      problems.push(`MSC ${entry.code} has unknown primary field ${entry.primaryField}`);
    }
  }
  for (const entry of ARXIV_MATH) {
    if (!ARXIV_CODE.test(entry.code)) problems.push(`invalid arXiv code ${entry.code}`);
    if (!entry.title?.en || !entry.title?.zh) problems.push(`arXiv ${entry.code} needs paired titles`);
  }
  const mscCodes = new Set(MSC_2020.map(entry => entry.code));
  const arxivCodes = new Set(ARXIV_MATH.map(entry => entry.code));
  for (const [fieldId, entry] of Object.entries(MCS_FIELD_FRAMEWORK)) {
    if (!atlas.byId[fieldId]) problems.push(`unknown atlas field ${fieldId}`);
    if (!entry.msc.length) problems.push(`field ${fieldId} has no MSC groups`);
    for (const code of entry.msc) if (!mscCodes.has(code)) problems.push(`field ${fieldId} references unknown MSC ${code}`);
    for (const code of entry.arxiv) if (!arxivCodes.has(code)) problems.push(`field ${fieldId} references unknown arXiv ${code}`);
  }
  for (const [branchId, entry] of Object.entries(MCS_BRANCH_FRAMEWORK)) {
    const node = atlas.byId[branchId];
    if (!node) problems.push(`unknown atlas branch ${branchId}`);
    if (!entry.msc.length && !entry.arxiv.length) problems.push(`branch ${branchId} has no classification`);
    for (const code of entry.msc) if (!mscCodes.has(code)) problems.push(`branch ${branchId} references unknown MSC ${code}`);
    for (const code of entry.arxiv) if (!arxivCodes.has(code)) problems.push(`branch ${branchId} references unknown arXiv ${code}`);
    if (new Set(entry.msc).size !== entry.msc.length) problems.push(`branch ${branchId} repeats an MSC code`);
    if (new Set(entry.arxiv).size !== entry.arxiv.length) problems.push(`branch ${branchId} repeats an arXiv code`);
  }
  for (const node of atlas.nodes) {
    if (node.depth !== 2 || node.crossingId || node.objectId) continue;
    if (!MCS_BRANCH_FRAMEWORK[node.id]) problems.push(`ordinary branch ${node.id} has no direct classification`);
  }
  const rows = frameworkRows(atlas).rows;
  if (rows.length !== MSC_2020.length) problems.push(`framework rows ${rows.length} do not cover every MSC group`);
  if (new Set(rows.map(row => row.code)).size !== rows.length) problems.push('a classification code appears more than once');
  if (!UNMAPPED_MSC.length) problems.push('unmapped applied groups are not registered');
  for (const code of UNMAPPED_MSC) if (!rows.some(row => row.code === code && row.scope === 'unmapped')) problems.push(`unmapped code ${code} is not rendered as unmapped`);
  return problems;
}

/**
 * Display helper shared by the panel and the tests.
 * Counts are numbers, not quality; a missing group stays zero.
 */
export function classificationSummary(data) {
  const scales = data.levels.map(level => ({
    id: level.id,
    title: level.title,
    sigma: level.sigma,
    count: data.objects.filter(object => object.scale === level.id).length,
  }));
  const countBy = (items, key) => {
    const result = {};
    for (const item of items) result[key(item)] = (result[key(item)] ?? 0) + 1;
    return result;
  };
  return {
    objects: data.objects.length,
    relations: data.relations.length,
    scales,
    relationKinds: countBy(data.relations, relation => relation.kind),
    declarationKinds: countBy(data.objects.flatMap(object => object.declarations), declaration => declaration.kind),
    declarationStatus: countBy(data.objects.flatMap(object => object.declarations), declaration => declaration.status),
    relationEvidence: countBy(data.relations, relation => relation.evidence.status),
  };
}
