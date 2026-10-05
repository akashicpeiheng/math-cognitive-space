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
  const nodes = manifest.nodes.map((node) => ({
    ...node,
    contentMarkdown: node.contentRef === false ? (node.contentMarkdown ?? '') : (blocks[node.contentRef ?? node.id] ?? node.contentMarkdown ?? ''),
  }));
  const ontology = {
    schema: 'mcs-web-ontology/1',
    signature: manifest.signature,
    theory: manifest.theory,
    nodes,
    payload: Object.fromEntries(nodes.map((node) => [node.id, node.formal ?? node.payload ?? {}])),
    representations: nodes.flatMap((node) => (node.representations ?? []).map((rep) => ({ ...rep, node: node.id }))),
    evidence: manifest.evidence,
    support: manifest.support,
    actions: manifest.actions,
    relationDescriptions: manifest.relations,
    aggregates: manifest.aggregates,
    templates: manifest.templates,
    environmentBoundary: manifest.environmentBoundary,
    claims: manifest.claims ?? [],
    patterns: manifest.patterns ?? [],
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

export function validateOntologyShape(ontology, { repoRoot = REPO_ROOT } = {}) {
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
  for (const role of ROLES) {
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
  for (const problem of granularityGaps(ontology.nodes)) problems.push(problem);

  if (!Array.isArray(ontology.localizations) || ontology.localizations.length !== 36) {
    problems.push(`局部化算子应登记 36 项，实际 ${ontology.localizations?.length ?? 0}`);
  }
  return problems;
}

export function createOntology(ontology, { validate = true, repoRoot = REPO_ROOT } = {}) {
  if (validate) {
    const problems = validateOntologyShape(ontology, { repoRoot });
    if (problems.length) {
      throw new McsError(CODES.ONTOLOGY_INVALID, `公共本体未通过检查（${problems.length} 项）`, 500, { problems });
    }
  }
  const contentHash = sha256(ontology);
  const nodesById = new Map(ontology.nodes.map((node) => [node.id, node]));
  const actionsById = new Map(ontology.actions.map((action) => [action.id, action]));
  const evidenceById = new Map(ontology.evidence.map((record) => [record.id, record]));
  const claimsById = new Map(ontology.claims.map((claim) => [claim.id, claim]));
  const aggregatesById = new Map(ontology.aggregates.map((aggregate) => [aggregate.id, aggregate]));
  const boundaryRefs = new Set(ontology.environmentBoundary?.refs ?? []);
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
    node(id) {
      const node = nodesById.get(id);
      if (!node) throw new McsError(CODES.UNKNOWN_NODE, `无法解析节点：${id}`, 404, { node_id: id });
      return node;
    },
    maybeNode(id) { return nodesById.get(id) ?? null; },
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
        },
      };
    },
  };
}

let cached = null;
export async function loadOntology(options = {}) {
  if (cached && !options.dataDir) return cached;
  const ontology = await buildOntology(options);
  const instance = createOntology(ontology, options);
  if (!options.dataDir) cached = instance;
  return instance;
}

export function resetOntologyCache() { cached = null; }

export function relativeToRepo(path, repoRoot = REPO_ROOT) {
  const absolute = isAbsolute(path) ? path : resolve(repoRoot, path);
  return relative(repoRoot, absolute).replaceAll('\\', '/');
}
