import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { FIELD_IDS } from '../data/fields.mjs';
import { GRANULARITY_VALUES, granularityGaps } from '../data/granularity.mjs';
import { resolve, dirname, join, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { McsError, CODES } from '../shared/errors.mjs';
import {
  CONSTRUCTS, ROLES, CLAIM_ROLES, EVIDENCE_STATUS, CHECK_STATUS, SUPPORT_USES,
  canonicalString, assert,
} from '../shared/contracts.mjs';
import { sha256 } from './hash.mjs';
import { scalingEndpoints } from '../shared/scaling.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const MCS_WEB_ROOT = resolve(HERE, '..');
export const REPO_ROOT = resolve(MCS_WEB_ROOT, '..');

const PERSONAL_KEYS = new Set([
  'profileId', 'learnerId', 'studentId', 'mastery', 'masteryEstimates',
  'attempts', 'answerEvents', 'personalNotes', 'confirmed',
]);

const MODES = ['definition', 'deduction', 'representation', 'task', 'method', 'construction', 'evidence'];
const AGGREGATE_KINDS = ['topic', 'domain', 'discipline', 'theory', 'metaTheory'];
const NODE_BLOCK = /<!--\s*node:([A-Za-z0-9:._-]+)\s*-->([\s\S]*?)<!--\s*\/node\s*-->/g;

export function parseCaseMarkdown(text, file) {
  const blocks = {};
  let match;
  NODE_BLOCK.lastIndex = 0;
  while ((match = NODE_BLOCK.exec(text)) !== null) {
    const id = match[1];
    const body = match[2].trim();
    if (blocks[id]) throw new McsError(CODES.ONTOLOGY_INVALID, `内容块重复：${id}（${file}）`);
    blocks[id] = body;
  }
  return blocks;
}

function readCaseBlocks(dataDir) {
  const dir = join(dataDir, 'cases');
  const blocks = {};
  const files = existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith('.md')).sort() : [];
  for (const name of files) {
    const text = readFileSync(join(dir, name), 'utf8');
    Object.assign(blocks, parseCaseMarkdown(text, name));
  }
  return blocks;
}

async function loadModule(path) {
  const url = pathToFileURL(path).href;
  return (await import(url)).default;
}

export async function buildOntology({ dataDir = join(MCS_WEB_ROOT, 'data') } = {}) {
  const manifest = await loadModule(join(dataDir, 'manifest.mjs'));
  const blocks = readCaseBlocks(dataDir);
  const coverage = await loadModule(join(dataDir, 'coverage.mjs'));
  const localizations = await loadModule(join(dataDir, 'localizations.mjs'));
  /*
   * 正文块按 `contentRef ?? id` 取。合并登记（`node.registrations`）走同一条规则：
   * 被合并的登记保留自己的正文块，节点页因此能把「另一处登记」的正文一并显示，
   * 而不是只留一行标题。背景接口那类 `contentRef === false` 的条目保持空正文。
   */
  const withContent = (record) => ({
    ...record,
    contentMarkdown: record.contentRef === false
      ? (record.contentMarkdown ?? '')
      : (blocks[record.contentRef ?? record.id] ?? record.contentMarkdown ?? ''),
  });
  const nodes = manifest.nodes.map((node) => ({
    ...withContent(node),
    ...(Array.isArray(node.registrations) ? { registrations: node.registrations.map(withContent) } : {}),
  }));
  const ontology = {
    schema: 'mcs-web-ontology/1',
    signature: manifest.signature,
    theory: manifest.theory,
    nodes,
    /*
     * 形式负载按 id 索引。被合并的登记也进这张表：编写台与形式检查仍要按**原来的 id**
     * 找到它们的负载（它们在被合并之前是正常节点），少这一条会让旧链接悄无声息地失效。
     */
    payload: Object.fromEntries([
      ...nodes.map((node) => [node.id, node.formal ?? node.payload ?? {}]),
      ...nodes.flatMap((node) => (node.registrations ?? []).map((record) => [record.id, record.formal ?? {}])),
    ]),
    /*
     * 表征一节：规范节点自己的表征，加上**各合并登记**带进来的表征。
     * 后者标 `registrationOf`（这条表征原本属于哪一处登记），节点页据此分组显示；
     * 归属改写为规范节点，是因为 `node` 字段是这一节的索引键，不指规范节点就悬空了。
     */
    representations: nodes.flatMap((node) => [
      ...(node.representations ?? []).map((rep) => ({ ...rep, node: node.id })),
      ...(node.registrations ?? []).flatMap((record) => (record.representations ?? [])
        .map((rep) => ({ ...rep, node: node.id, registrationOf: record.id }))),
    ]),
    evidence: manifest.evidence,
    support: manifest.support,
    actions: manifest.actions,
    relationDescriptions: manifest.relations,
    aggregates: manifest.aggregates,
    templates: manifest.templates,
    environmentBoundary: manifest.environmentBoundary,
    claims: manifest.claims ?? [],
    patterns: manifest.patterns ?? [],
    // 合并表随本体一起发布：别名、理由、差异与「明确不合并」的清单都在其中（见 data/merges.mjs）。
    merges: manifest.merges ?? null,
    coverage,
    localizations,
  };
  return ontology;
}

function collectKeys(value, keys = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      keys.push(key);
      collectKeys(item, keys);
    }
  }
  return keys;
}

export function validateOntologyShape(ontology, { repoRoot = REPO_ROOT, contentProjection = false } = {}) {
  const problems = [];
  const boundary = new Set(ontology.environmentBoundary?.refs ?? []);
  const resolves = (id) => ontology.nodes.some((node) => node.id === id) || boundary.has(id);
  const ids = new Map();
  const duplicate = (kind, id) => {
    const key = `${kind}:${id}`;
    if (ids.has(key)) problems.push(`${kind} 引用重复：${id}`);
    ids.set(key, true);
  };

  if (ontology.schema !== 'mcs-web-ontology/1') problems.push(`本体 schema 无效：${ontology.schema}`);
  if (!Array.isArray(ontology.nodes) || ontology.nodes.length === 0) problems.push('本体没有任何节点');

  for (const node of ontology.nodes) {
    duplicate('node', node.id);
    if (!CONSTRUCTS.includes(node.construct)) problems.push(`节点 ${node.id} 的构造类型无效：${node.construct}`);
    for (const role of node.roles ?? []) {
      if (!ROLES.includes(role)) problems.push(`节点 ${node.id} 的角色无效：${role}`);
    }
    for (const role of node.roles ?? []) {
      if (CLAIM_ROLES.includes(role) && node.construct !== 'Claim') {
        problems.push(`节点 ${node.id} 的角色 ${role} 只能标注在 Claim 上`);
      }
    }
    if (!node.version || typeof node.version !== 'string') problems.push(`节点 ${node.id} 缺少版本`);
    if (!node.title || typeof node.title !== 'string') problems.push(`节点 ${node.id} 缺少标题`);
    if (!node.discipline) problems.push(`节点 ${node.id} 缺少学科`);
    /*
     * 学科必须是受控词表里的一支（2026-10 加）。
     *
     * 本体的学科原先混进了教材章节式的合并标签（几何与拓扑、代数与几何）与「方法论」，
     * 于是「按学科筛」筛出来的其实是教材的分章方式。这条断言防止再混回来。
     */
    if (node.discipline && !FIELD_IDS.includes(node.discipline)) {
      problems.push(`节点 ${node.id} 的学科「${node.discipline}」不在受控词表里`);
    }
    /*
     * 条目粒度只能是 unit / topic（2026-10 加）：话题级条目在列表与筛选里默认不出现，
     * 因此这个字段必须可控、可校验。
     */
    if (node.granularity && !GRANULARITY_VALUES.includes(node.granularity)) {
      problems.push(`节点 ${node.id} 的 granularity「${node.granularity}」非法`);
    }
    /*
     * 证据等级必须**显式写出**（2026-10 加）。
     *
     * 关键断言应标证据等级；原先有 20 个节点两个字段都没有，界面于是显示成「没有标签」——
     * 读者分不清那是「本站不声称」还是「忘了标」。不声称也要写出来（`NOT-CLAIMED`）。
     * 等级登记在 `teaching.evidenceStatus`（节点的教学字段），`provenance.evidenceStatus` 兼容保留。
     */
    const evidenceStatus = node.teaching?.evidenceStatus ?? node.provenance?.evidenceStatus;
    if (!evidenceStatus) problems.push(`节点 ${node.id} 没有证据等级：不声称也要显式写 NOT-CLAIMED`);
    else if (!EVIDENCE_STATUS.includes(evidenceStatus)) problems.push(`节点 ${node.id} 的证据等级非法：${evidenceStatus}`);
    if (node.contentRef && node.contentRef !== false && !node.contentMarkdown) problems.push(`节点 ${node.id} 的内容块未找到：${node.contentRef}`);
  }

  for (const action of ontology.actions) {
    duplicate('action', action.id);
    if (!MODES.includes(action.mode)) problems.push(`行动 ${action.id} 的模式无效：${action.mode}`);
    if (!Array.isArray(action.inputs)) problems.push(`行动 ${action.id} 的 inputs 不是数组`);
    if (!Array.isArray(action.outputs) || action.outputs.length === 0) problems.push(`行动 ${action.id} 没有输出`);
    for (const input of action.inputs ?? []) {
      if (!resolves(input.node)) problems.push(`行动 ${action.id} 的输入 ${input.node} 无法解析`);
      if (!Array.isArray(input.accepts) || input.accepts.length === 0) problems.push(`行动 ${action.id} 的输入 ${input.node} 未声明可用资源`);
    }
    for (const output of action.outputs ?? []) {
      if (!resolves(output.node)) problems.push(`行动 ${action.id} 的输出 ${output.node} 无法解析`);
      if (!Array.isArray(output.provides) || output.provides.length === 0) problems.push(`行动 ${action.id} 的输出 ${output.node} 未声明提供资源`);
    }
    if (!EVIDENCE_STATUS.includes(action.witness?.status)) problems.push(`行动 ${action.id} 的见证状态无效`);
    if (!action.version) problems.push(`行动 ${action.id} 缺少版本`);
  }

  for (const relation of ontology.relationDescriptions) {
    duplicate('relation', relation.id);
    if (relation.kind === 'scaling' && relation.direction && !scalingEndpoints(relation)) problems.push(`放缩关系 ${relation.id} 的方向与端点或模式不一致`);
    if (relation.scalingExplanation !== undefined) {
      const explanation = relation.scalingExplanation;
      if (relation.kind !== 'scaling' || typeof explanation?.summary !== 'string' || !explanation.summary.trim()
        || !Array.isArray(explanation.changes) || explanation.changes.some(change =>
          ['condition', 'special', 'general'].some(key => typeof change?.[key] !== 'string' || !change[key].trim()))) {
        problems.push(`关系 ${relation.id} 的放缩条件说明格式无效`);
      }
    }
    if (!resolves(relation.from)) problems.push(`关系 ${relation.id} 的起点 ${relation.from} 无法解析`);
    if (!resolves(relation.to)) problems.push(`关系 ${relation.id} 的终点 ${relation.to} 无法解析`);
    if (!EVIDENCE_STATUS.includes(relation.witness?.status)) problems.push(`关系 ${relation.id} 的见证状态无效`);
    /*
     * 见证类型的登记格式（2026-10 加）。两类依赖必须**从数据上就能分开**：
     *
     * - `definitional-dependency` + `DEF`：不用它，目标节点的定义就写不出来；
     * - `proof-dependency` + `PROOF` + `ref`：目标的**论证**用到它，`ref` 指向一条
     *   同时列出两端节点的证据记录——「某定理用到另一条定理」因此是可核的，
     *   而不是只写在 scope 里的一句话（第五十二轮把这条记账留了下来）。
     */
    const witness = relation.witness ?? {};
    if (witness.type === 'definitional-dependency' && witness.status !== 'DEF') {
      problems.push(`关系 ${relation.id} 是定义性依赖，见证状态应为 DEF：${witness.status}`);
    }
    if (witness.type === 'proof-dependency') {
      if (!witness.ref) problems.push(`关系 ${relation.id} 是证明依赖，必须用 ref 指向证据条目`);
      else {
        const record = ontology.evidence.find((item) => item.id === witness.ref);
        if (!record) problems.push(`关系 ${relation.id} 的证明依赖指向未知证据：${witness.ref}`);
        else {
          // 状态必须与证据一致：证书片段就是 FINITE，正文推导才是 PROOF——关系的强弱由证据决定，
          // 不由写关系的人自己挑（否则「有证明」这句话可以随手升级）。
          if (witness.status !== record.status) {
            problems.push(`关系 ${relation.id} 的见证状态 ${witness.status} 与证据 ${record.id} 的状态 ${record.status} 不一致`);
          }
          for (const end of [relation.from, relation.to]) {
            if (!(record.nodes ?? []).includes(end)) {
              problems.push(`关系 ${relation.id} 引用的证据 ${record.id} 没有列出端点 ${end}（证明依赖必须可核到两端）`);
            }
          }
        }
      }
    }
  }

  for (const record of ontology.evidence) {
    duplicate('evidence', record.id);
    if (!EVIDENCE_STATUS.includes(record.status)) problems.push(`证据 ${record.id} 的 status 无效`);
    if (!CHECK_STATUS.includes(record.checkStatus)) problems.push(`证据 ${record.id} 的 checkStatus 无效`);
    for (const nodeId of record.nodes ?? []) {
      if (!resolves(nodeId)) problems.push(`证据 ${record.id} 引用未知节点 ${nodeId}`);
    }
    if (record.kind === 'machine-certificate') {
      if (!record.certificate) problems.push(`机器证书 ${record.id} 缺少文件引用`);
      if (!record.checker) problems.push(`机器证书 ${record.id} 缺少检查器版本`);
      if (record.checkerVerified) problems.push(`机器证书 ${record.id} 不得声称检查器本身已获形式验证，除非另有证明记录`);
      if (record.certificate && !existsSync(resolve(repoRoot, record.certificate))) {
        problems.push(`机器证书 ${record.id} 的文件不存在：${record.certificate}`);
      }
    }
  }

  for (const record of ontology.support) {
    duplicate('support', record.id);
    if (!resolves(record.node)) problems.push(`支持记录 ${record.id} 引用未知节点 ${record.node}`);
    if (!SUPPORT_USES.includes(record.use)) problems.push(`支持记录 ${record.id} 的用途无效：${record.use}`);
    if (record.status === 'known' && !Array.isArray(record.set)) problems.push(`支持记录 ${record.id} 标为 Known 但没有集合`);
    if (record.status === 'unknown' && record.set !== undefined) problems.push(`支持记录 ${record.id} 是 Unknown，不能写入集合；未知不等于空集`);
    if (record.partial && record.status === 'known') problems.push(`支持记录 ${record.id} 不能把部分界与精确 Known 混为一条记录`);
  }

  for (const claim of ontology.claims) {
    duplicate('claim', claim.id);
    const node = ontology.nodes.find((item) => item.id === claim.node);
    if (!node) problems.push(`断言 ${claim.id} 引用未知节点 ${claim.node}`);
    else if (node.construct !== 'Claim') problems.push(`断言 ${claim.id} 的节点不是 Claim：${claim.node}`);
    for (const evidenceId of claim.evidence ?? []) {
      if (!ontology.evidence.some((item) => item.id === evidenceId)) problems.push(`断言 ${claim.id} 引用未知证据 ${evidenceId}`);
    }
  }

  for (const aggregate of ontology.aggregates) {
    duplicate('aggregate', aggregate.id);
    if (!AGGREGATE_KINDS.includes(aggregate.kind)) problems.push(`聚合 ${aggregate.id} 的类型无效：${aggregate.kind}`);
    if (!Array.isArray(aggregate.blocks) || aggregate.blocks.length === 0) problems.push(`聚合 ${aggregate.id} 没有成员块`);
    for (const member of aggregate.blocks.flat()) {
      if (!resolves(member)) problems.push(`聚合 ${aggregate.id} 的成员 ${member} 无法解析`);
    }
  }

  const templateRoles = new Set(ontology.templates.map((template) => template.role));
  for (const role of contentProjection ? [] : ROLES) {
    if (!templateRoles.has(role)) problems.push(`模板缺少角色：${role}`);
  }

  for (const node of ontology.nodes) {
    const keys = collectKeys(node.formal ?? {});
    for (const key of keys) {
      if (PERSONAL_KEYS.has(key)) problems.push(`节点 ${node.id} 的公共负载含个人字段：${key}`);
    }
  }

  /*
   * 粒度判定必须**判完**（2026-10 加）：标题命中并列词、或已标成 topic 的条目，
   * 必须在 `data/granularity.mjs` 的登记表里有记录——要么在话题清单里，要么在
   * 「判为单元」的例外表里，两者都要写理由。这条断言把「逐案例复核过」
   * 从一句承诺变成可核对的检查：漏判一条就红。
   */
  /*
   * 合并表（2026-10 加，见 `data/merges.mjs`）。
   *
   * 装配期已经把所有引用改写过了，这里只钉三件事：被合并的 id **不再**是顶层节点、
   * 别名必须指向存在的规范节点、每个规范节点的 `registrations` 与别名表**逐条对得上**。
   * 第三条是关键：它让「节点页显示的其它登记」与「旧链接解析到的规范节点」不可能各说各话。
   */
  const merges = ontology.merges ?? null;
  if (merges) {
    if (!Array.isArray(merges.groups) || merges.groups.length === 0) problems.push('合并表没有任何合并组');
    const nodeIds = new Set(ontology.nodes.map((node) => node.id));
    const aliasEntries = Object.entries(merges.aliases ?? {});
    if (aliasEntries.length === 0) problems.push('合并表没有别名');
    for (const [from, to] of aliasEntries) {
      if (nodeIds.has(from)) problems.push(`被合并的 id 仍在节点表里：${from}`);
      if (!nodeIds.has(to)) problems.push(`合并别名指向未知节点：${from} → ${to}`);
    }
    for (const group of merges.groups ?? []) {
      if (!nodeIds.has(group.canonical)) problems.push(`合并组 ${group.id} 的规范节点不存在：${group.canonical}`);
      for (const id of group.absorbed ?? []) {
        if (merges.aliases?.[id] !== group.canonical) problems.push(`合并组 ${group.id} 的 ${id} 不在别名表里或指向别处`);
      }
    }
    for (const node of ontology.nodes) {
      const registrations = node.registrations ?? [];
      if (!registrations.length) {
        if (node.mergeGroup) problems.push(`节点 ${node.id} 标了合并组却没有登记：${node.mergeGroup}`);
        continue;
      }
      const seen = new Set();
      for (const record of registrations) {
        if (seen.has(record.id)) problems.push(`节点 ${node.id} 的合并登记重复：${record.id}`);
        seen.add(record.id);
        if (merges.aliases?.[record.id] !== node.id) problems.push(`节点 ${node.id} 的合并登记 ${record.id} 与别名表不一致`);
        if (record.mergedInto !== node.id) problems.push(`节点 ${node.id} 的合并登记 ${record.id} 的 mergedInto 不是它`);
        if (record.contentRef && record.contentRef !== false && !record.contentMarkdown) {
          problems.push(`合并登记 ${record.id} 的内容块未找到：${record.contentRef}`);
        }
      }
      if (!(node.cases ?? []).includes(node.case)) problems.push(`节点 ${node.id} 的 cases 没有包含自己的案例 ${node.case}`);
      for (const record of registrations) {
        if (record.case && !node.cases.includes(record.case)) problems.push(`节点 ${node.id} 的 cases 缺少登记案例 ${record.case}`);
      }
    }
  }

  if(!contentProjection)for (const problem of granularityGaps(ontology.nodes, { mergedIds: new Set(Object.keys(merges?.aliases ?? {})) })) problems.push(problem);

  if (!contentProjection && (!Array.isArray(ontology.localizations) || ontology.localizations.length !== 36)) {
    problems.push(`局部化算子应登记 36 项，实际 ${ontology.localizations?.length ?? 0}`);
  }
  return problems;
}

/**
 * 由 raw 本体装配实例。
 *
 * `contentHash` 可以**显式传入**，这是给语言视图用的（`data/i18n/overlay.mjs`）：
 * 语言视图的 raw 已经是「结构相同、文本不同」的副本，再算一次哈希会得到另一个版本号，
 * 于是换语言等于换本体——档案里的 `ontologyVersion` 对不上，两套证据互不可见。
 * 传进来的哈希因此必须是**中文源**在覆盖之前算出的那一个。这是唯一允许绕开自算哈希的
 * 调用点；其它调用方一律不传，哈希继续由结构决定。
 */
export function createOntology(ontology, { validate = true, repoRoot = REPO_ROOT, contentHash: hashOverride = null, contentProjection = false } = {}) {
  if (validate) {
    const problems = validateOntologyShape(ontology, { repoRoot, contentProjection });
    if (problems.length) {
      throw new McsError(CODES.ONTOLOGY_INVALID, `公共本体未通过检查（${problems.length} 项）`, 500, { problems });
    }
  }
  const contentHash = typeof hashOverride === 'string' && hashOverride ? hashOverride : sha256(ontology);
  const nodesById = new Map(ontology.nodes.map((node) => [node.id, node]));
  const actionsById = new Map(ontology.actions.map((action) => [action.id, action]));
  const evidenceById = new Map(ontology.evidence.map((record) => [record.id, record]));
  const claimsById = new Map(ontology.claims.map((claim) => [claim.id, claim]));
  const aggregatesById = new Map(ontology.aggregates.map((aggregate) => [aggregate.id, aggregate]));
  const boundaryRefs = new Set(ontology.environmentBoundary?.refs ?? []);
  /*
   * 别名表：被合并 id → 规范 id。**只有解析走别名**——`nodesById` 不含被合并的 id，
   * 因此列表、计数、网络视图里一个对象只出现一次；而 `/nodes/dg:topological-space`
   * 这类旧链接仍然解析得到，页面据此提示「已合并到 top:space」。
   */
  const aliasOf = new Map(Object.entries(ontology.merges?.aliases ?? {}));
  return {
    raw: ontology,
    version: `sha256:${contentHash}`,
    contentHash,
    builtAt: new Date().toISOString(),
    nodesById,
    actionsById,
    evidenceById,
    claimsById,
    aggregatesById,
    boundaryRefs,
    aliasOf,
    alias(id) { return aliasOf.get(id) ?? null; },
    canonicalId(id) { return aliasOf.get(id) ?? id; },
    node(id) {
      const canonical = aliasOf.get(id) ?? id;
      const node = nodesById.get(canonical);
      if (!node) throw new McsError(CODES.UNKNOWN_NODE, `无法解析节点：${id}`, 404, { node_id: id });
      return node;
    },
    maybeNode(id) { return nodesById.get(aliasOf.get(id) ?? id) ?? null; },
    action(id) {
      const action = actionsById.get(id);
      if (!action) throw new McsError(CODES.UNKNOWN_ACTION, `无法解析行动：${id}`, 404, { action_id: id });
      return action;
    },
    evidence(id) {
      const record = evidenceById.get(id);
      if (!record) throw new McsError(CODES.UNKNOWN_EVIDENCE, `无法解析证据：${id}`, 404, { evidence_id: id });
      return record;
    },
    relationsFor(nodeId) { return ontology.relationDescriptions.filter((item) => item.from === nodeId || item.to === nodeId); },
    actionsFor(nodeId) { return ontology.actions.filter((action) => action.outputs.some((output) => output.node === nodeId)); },
    supportsFor(nodeId) { return ontology.support.filter((record) => record.node === nodeId); },
    evidenceFor(nodeId) { return ontology.evidence.filter((record) => record.nodes.includes(nodeId)); },
    stats() {
      return {
        version: `sha256:${contentHash}`,
        contentHash,
        counts: {
          signatureTypes: ontology.signature?.baseTypes?.length ?? 0,
          theoryAxioms: ontology.theory?.axioms?.length ?? 0,
          nodes: ontology.nodes.length,
          constructs: Object.fromEntries(CONSTRUCTS.map((construct) => [construct, ontology.nodes.filter((node) => node.construct === construct).length])),
          roles: Object.fromEntries(ROLES.map((role) => [role, ontology.nodes.filter((node) => node.roles.includes(role)).length])),
          actions: ontology.actions.length,
          relations: ontology.relationDescriptions.length,
          evidence: ontology.evidence.length,
          claims: ontology.claims.length,
          support: ontology.support.length,
          aggregates: ontology.aggregates.length,
          templates: ontology.templates.length,
          patterns: ontology.patterns.length,
          localizations: ontology.localizations.length,
          coverage: ontology.coverage.length,
          /*
           * 合并口径：`absorbed` 是**已经不在节点表里**的登记数，`merges.nodes` 是收口前的
           * 节点数（= 现有节点 + 被吸收登记）。写出来是为了让「站点上到底少了几个重复节点」
           * 有一个可核对的口径，而不是靠记忆。
           */
          merges: ontology.merges
            ? {
              groups: ontology.merges.groups.length,
              absorbed: Object.keys(ontology.merges.aliases).length,
              keptSeparate: ontology.merges.keptSeparate.length,
            }
            : null,
        },
      };
    },
  };
}

/**
 * 装配缓存：键是 `dataDir ?? '(默认)'`，值是首次装载时的那一份实例。
 *
 * 为什么按 `dataDir` 分开而不是只留一份：测试夹具、`doctor`、快照源会各自传自己的
 * 目录，只留一份会让「谁先装载谁生效」——那是随测试顺序漂移的隐性状态。
 */
const baseCache = new Map();
/** 语言视图缓存：键是 `version::locale`。同一份数据在不同目录下重复装配也共用。 */
const localeCache = new Map();

/**
 * 装载公共本体。
 *
 * `locale` 只影响**呈现层的文本**：装配（`buildOntology`）→ 校验 → 哈希都在基础数据上做，
 * 之后才套语言覆盖。因此 `zh` 与 `en` 的 `version` / `contentHash` 逐字相同——
 * 档案与事件挂在 `ontologyVersion` 上，两个哈希等于两套互不可见的证据。
 *
 * 语言覆盖走 `data/i18n/`：它是**内容目录**，由它反过来依赖内核，而不是内核依赖它，
 * 这样 `core/` 不必知道有哪些语种存在（新增语种只改 `data/i18n/index.mjs` 的注册表）。
 */
export async function loadOntology(options = {}) {
  const { locale, dataDir = null, ...rest } = options;
  const localization = await import('../data/i18n/index.mjs');
  const target = localization.normalizeLocale(locale ?? 'zh');
  const cacheKey = dataDir ?? '(默认)';

  let base = baseCache.get(cacheKey);
  if (!base) {
    /*
     * `dataDir` 只在**显式给出**时才传下去：`buildOntology` 的缺省是仓库内的 `data/`，
     * 传 `null` 会让它去 `join(null, ...)` 而崩掉。默认值与「显式空值」必须分开。
     */
    const buildOptions = dataDir === null ? { ...rest } : { dataDir, ...rest };
    base = createOntology(await buildOntology(buildOptions), rest);
    baseCache.set(cacheKey, base);
  }
  if (target === 'zh') return base;

  const viewKey = `${base.version}::${target}`;
  const hit = localeCache.get(viewKey);
  if (hit) return hit;
  const overlay = await localization.overlayFor(target);
  if (!overlay) return base;
  const { localizedOntology } = await import('../data/i18n/overlay.mjs');
  const view = localizedOntology(base, target, () => overlay);
  localeCache.set(viewKey, view);
  while (localeCache.size > 8) localeCache.delete(localeCache.keys().next().value);
  return view;
}

export function resetOntologyCache() {
  baseCache.clear();
  localeCache.clear();
}

export function relativeToRepo(path, repoRoot = REPO_ROOT) {
  const absolute = isAbsolute(path) ? path : resolve(repoRoot, path);
  return relative(repoRoot, absolute).replaceAll('\\', '/');
}
