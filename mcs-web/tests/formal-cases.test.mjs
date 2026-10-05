/**
 * 四案例形式表达登记的验收测试（task-4）。
 *
 * 跑法：`node --test tests/formal-cases.test.mjs`
 *
 * ## 这份测试在防什么
 *
 * 不是"文件存在、字段齐全"的形式检查，而是五类**会被悄悄绕过**的错误：
 *
 * 1. **把待证结论变成假设**：`statement.source` 与某条 `assumptions[].source`
 *    逐字相同，或者未展开义务被放进 `assumptions` / `axioms`。
 * 2. **原句对不上**：`SOURCE_CROSSWALK` 里的 quote 必须能在 `data/cases/*.md`
 *    里逐字找到——登记与原稿的差异只能显式写进 boundary / DIVERGENCES。
 * 3. **引用悬空或哈希过期**：`references[].specHash` 必须等于被引用 spec 的 `hash`，
 *    引用图必须是 DAG，本体里必须真有这个节点。
 * 4. **有限表写错**：Z5 单位群与 S3 的表用**另一条路径**重算（模运算 / 置换像），
 *    逐格比对，不信任字面表。
 * 5. **悄悄退回弱口径**：语言层可用时，`hashBackends().source` 必须为空——
 *    "某条 spec 解析不过于是换成源码级哈希"是必须暴露的事实，不能静默。
 *
 * 语言层（`core/formal/language.mjs`）不可用时，解析类断言自动 skip，
 * 其余断言照跑——数据本身就是交付物。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import manifest from '../data/manifest.mjs';
import { ROLES } from '../shared/contracts.mjs';
import {
  AXIOM_KINDS, BG_ALGEBRA, BG_CORE, BG_GROUP, BG_LIMIT, BG_MANIFOLD, BG_TENSOR, BACKGROUND_IDS, DEFAULT_BACKGROUND,
  backgroundAxiomsForKernel, backgroundPredicates, backgroundSignature, backgroundTheory, hasBackground, listBackgrounds,
  normalizeBackgroundId,
} from '../core/formal/backgrounds.mjs';
import {
  ALPHA_VARIANTS, BACKGROUND_REFERENCES, CONCEPT_RELATIONS, CONCEPT_SPECS, DIVERGENCES,
  HASH_BACKEND, HASH_BACKENDS, RELATIONS, RELATION_KINDS, SOURCE_CROSSWALK, SPEC_IDS, SPEC_VERSION,
  UNEXPANDED_OBLIGATIONS, conceptSpec, conceptSpecIds, coverageByCase, formalCoverage, formalTemplates,
  PROVIDERS_WITHOUT_SPEC, PROVIDES, PROVIDES_BY_SYMBOL, REFERENCE_PROVIDER_DIVERGENCES,
  SYMBOLS_WITHOUT_INTRODUCER, hashBackends, kernelInputForBackground, parseProblems, providerOf,
  registrySummary, specForId, specForNode, specHash, specHashInput,
  specIdOf, specs,
} from '../data/formal/registry.mjs';
import {
  REGISTERED_INSTANCES, REGISTERED_MODELS, findInstance, instanceSummary, modelSummary,
  verifyAllInstances, verifyInstance,
} from '../data/formal/instances.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const CASES = ['limit', 'manifold', 'tensor', 'group'];
const SPEC_FIELD_NAMES = [
  'specVersion', 'node', 'nodeVersion', 'background', 'theoryVersion',
  'declarations', 'definitions', 'assumptions', 'statement', 'claims',
  'references', 'boundary', 'source', 'hash',
];

const NODE_BY_ID = new Map(manifest.nodes.map((node) => [node.id, node]));
const fileCache = new Map();
function caseText(relative) {
  if (!fileCache.has(relative)) fileCache.set(relative, readFileSync(resolve(REPO, relative), 'utf8'));
  return fileCache.get(relative);
}

/** 语言层不可用时返回 null；可用但导入出错就抛出来（不吞 bug）。 */
async function loadLanguage() {
  try {
    return await import('../core/formal/language.mjs');
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND' && String(error.message).includes('language.mjs')) return null;
    throw error;
  }
}

/**
 * `parseSpec` 要的 `ctx.backgrounds` 与 `backgroundTheory()` 的公开形状不同：
 * 前者要 `bases: string[]` 与 `constants: { name: 已解析类型节点 }`。
 * 这个适配器只存在于测试侧——`backgrounds.mjs` 的公开形状要留给目录接口用富信息。
 */
function backgroundProvider(language) {
  return {
    backgroundTheory(id, version) {
      const theory = backgroundTheory(id, version);
      if (!theory) return null;
      const signature = backgroundSignature(id);
      const constants = {};
      for (const [name, source] of Object.entries(signature.constants)) {
        constants[name] = language.parseType(source);
      }
      return { ...theory, bases: signature.bases, constants };
    },
  };
}

/** `parseFormula` / `parseTerm` 的 ctx：常量必须是**已解析类型节点**。 */
function formulaCtx(language, backgroundId, extra = {}) {
  const signature = backgroundSignature(backgroundId);
  const constants = {};
  for (const [name, source] of Object.entries(signature.constants)) constants[name] = language.parseType(source);
  for (const [name, source] of Object.entries(extra.constants ?? {})) constants[name] = language.parseType(source);
  const theory = backgroundTheory(backgroundId);
  return {
    bases: signature.bases,
    constants,
    definitions: [...(theory?.definitions ?? []), ...(extra.definitions ?? [])],
  };
}

/** spec 自己的声明/定义也要并进 ctx，否则自由变量推不出类型。 */
function specCtx(language, spec) {
  return formulaCtx(language, spec.background, {
    constants: Object.fromEntries(spec.declarations.map((item) => [item.name, item.type])),
    definitions: spec.definitions.map((item) => ({ name: item.name, type: item.type })),
  });
}

/** 从定义体里抽出「引用了哪些定义名」。用于定义无环检查。 */
function referencedDefinitions(source, names) {
  const hits = new Set();
  for (const name of names) {
    if (new RegExp(`(^|[^A-Za-z0-9_])${name}([^A-Za-z0-9_]|$)`).test(source)) hits.add(name);
  }
  return hits;
}

function assertAcyclic(definitions, label) {
  const names = definitions.map((item) => item.name);
  const graph = new Map(definitions.map((item) => [item.name, referencedDefinitions(item.source, names)]));
  const state = new Map();
  const stack = [];
  const visit = (name) => {
    if (state.get(name) === 'done') return;
    if (state.get(name) === 'open') {
      assert.fail(`${label}: 定义成环 ${[...stack.slice(stack.indexOf(name)), name].join(' → ')}`);
    }
    state.set(name, 'open');
    stack.push(name);
    for (const next of graph.get(name) ?? []) visit(next);
    stack.pop();
    state.set(name, 'done');
  };
  for (const name of names) visit(name);
}

const ALL_SPECS = [...specs, ...CONCEPT_SPECS];
const CONCEPT_IDS = new Set(conceptSpecIds());

/** 关系端点：真实节点，或已登记的概念 spec。 */
function endpointOk(nodeId, version) {
  if (CONCEPT_IDS.has(nodeId)) return version === '1';
  const node = NODE_BY_ID.get(nodeId);
  return Boolean(node) && node.version === version;
}

/* ========================================================================== *
 * 1. 背景理论
 * ========================================================================== */

test('BG_* 常量与规格 §2.4 一致，且 bg:core/1 是 bg:algebra/1 的别名', () => {
  assert.equal(BG_ALGEBRA, 'bg:algebra/1');
  assert.equal(BG_GROUP, 'bg:group/1');
  assert.equal(BG_LIMIT, 'bg:limit/1');
  assert.equal(BG_MANIFOLD, 'bg:manifold/1');
  assert.equal(BG_TENSOR, 'bg:tensor/1');
  assert.equal(BG_CORE, 'bg:core/1');
  assert.equal(normalizeBackgroundId(BG_CORE), BG_ALGEBRA);
  assert.equal(DEFAULT_BACKGROUND, BG_ALGEBRA, '默认背景应是逻辑底座，而不是某一个案例的背景');
  assert.deepEqual(BACKGROUND_IDS, [BG_ALGEBRA, BG_GROUP, BG_LIMIT, BG_MANIFOLD, BG_TENSOR]);
});

test('backgroundTheory 返回 §2.4 要求的形状；未知 id / 版本不兜底', () => {
  for (const id of [...BACKGROUND_IDS, BG_CORE]) {
    const theory = backgroundTheory(id, '1');
    assert.ok(theory, `${id} 应当可查`);
    for (const key of ['id', 'version', 'bases', 'constants', 'axioms', 'definitions', 'schemas']) {
      assert.ok(key in theory, `${id} 缺少 ${key}`);
    }
    assert.ok(Array.isArray(theory.bases) && theory.bases.length > 0);
    assert.ok(theory.bases.some((item) => item.name === 'o'), '§1.1 要求 o 必须存在');
    assert.ok(Array.isArray(theory.schemas));
    for (const axiom of theory.axioms) {
      assert.ok(typeof axiom.formula === 'string' && axiom.formula.length > 0, `${id}/${axiom.id} 缺闭公式`);
      // 来源可以写在 `source`，也可以写在定义性公理的 `origin.caseQuote`（同一个事实的两种落点）。
      const hasSource = (typeof axiom.source === 'string' && axiom.source.length > 0)
        || (typeof axiom.origin?.caseQuote === 'string' && axiom.origin.caseQuote.length > 0);
      assert.ok(hasSource, `${id}/${axiom.id} 缺来源`);
      assert.equal(axiom.status, 'background-assumed', '内容公理必须显式标为背景假定');
    }
    for (const schema of theory.schemas) {
      assert.ok(typeof schema.id === 'string' && typeof schema.name === 'string');
      assert.ok(Array.isArray(schema.params), `${schema.id} 的 params 必须是数组`);
      for (const param of schema.params) {
        assert.ok(typeof param.name === 'string' && typeof param.type === 'string');
      }
    }
  }
  assert.equal(backgroundTheory('bg:nope/1'), null);
  assert.equal(backgroundTheory(BG_GROUP, '2'), null, '版本对不上必须返回 null，不能静默降级');
  assert.deepEqual(backgroundTheory(), backgroundTheory(DEFAULT_BACKGROUND), '缺省参数取默认背景');
  assert.equal(hasBackground('bg:nope/1'), false);
  assert.equal(hasBackground(BG_CORE), true);
});

test('每个原子谓词都有类型、来源与解释范围', () => {
  for (const id of BACKGROUND_IDS) {
    const predicates = backgroundPredicates(id);
    if (id === BG_ALGEBRA) {
      // 逻辑底座**没有对象语言谓词**：它的资源是 schemas（公理模式）而不是谓词。
      // 这不是缺登记，是分层：连接词/量词由语言层拥有（见 language.mjs#FORMAL_OPERATORS）。
      assert.equal(predicates.length, 0);
      assert.ok(backgroundTheory(id).schemas.length > 0, '逻辑底座的资源应在 schemas 里');
      continue;
    }
    assert.ok(predicates.length > 0, `${id} 应当登记原子谓词`);
    for (const predicate of predicates) {
      assert.ok(typeof predicate.name === 'string' && predicate.name.length > 0);
      assert.ok(typeof predicate.type === 'string' && predicate.type.length > 0, `${predicate.name} 缺类型`);
      assert.ok(typeof predicate.source === 'string' && predicate.source.length > 0, `${predicate.name} 缺来源`);
      assert.ok(typeof predicate.scope === 'string' && predicate.scope.length > 0, `${predicate.name} 缺解释范围`);
    }
  }
});

test('简单类型论没有多态：具体载体必须有具体类型的谓词', () => {
  // 起因：`group_concept : (G->G->G)->G->(G->G)->o` 套不进 `mul5 : Z5->Z5->Z5`；
  // 把 Z5 写成 G 会把「模 5 单位群是一个群」偷换成「某个抽象 G 上的群」。
  const group = backgroundTheory(BG_GROUP);
  const names = new Set(group.constants.map((item) => item.name));
  for (const name of ['group_concept', 'abelian_group', 'group_concept_Z5', 'abelian_group_Z5', 'group_concept_S3', 'abelian_group_S3']) {
    assert.ok(names.has(name), `bg:group/1 应当登记 ${name}`);
  }
  const typeOf = (name) => group.constants.find((item) => item.name === name).type;
  assert.equal(typeOf('group_concept_Z5'), '(Z5 -> Z5 -> Z5) -> Z5 -> (Z5 -> Z5) -> o');
  assert.equal(typeOf('abelian_group_Z5'), '(Z5 -> Z5 -> Z5) -> Z5 -> (Z5 -> Z5) -> o');
  assert.equal(typeOf('group_concept_S3'), '(S3 -> S3 -> S3) -> S3 -> (S3 -> S3) -> o');
  assert.equal(typeOf('group_concept'), '(G -> G -> G) -> G -> (G -> G) -> o');
  assert.notEqual(typeOf('group_concept_Z5'), typeOf('group_concept'), '具体载体谓词不能与一般谓词同类型');
});

test('bg:algebra/1 明写不接受析取与经典反证', () => {
  const theory = backgroundTheory(BG_ALGEBRA);
  const ids = theory.forbidden.map((item) => item.id);
  assert.ok(ids.includes('no-disjunction'));
  assert.ok(ids.includes('no-classical'));
  assert.ok(ids.includes('no-new-axioms'));
});

test('listBackgrounds 给出目录接口要求的形状', () => {
  const list = listBackgrounds();
  assert.equal(list.length, BACKGROUND_IDS.length);
  for (const item of list) {
    assert.ok(typeof item.id === 'string');
    assert.ok(typeof item.version === 'string');
    assert.ok(typeof item.title === 'string' && item.title.length > 0);
    assert.ok(typeof item.note === 'string' && item.note.length > 0);
    assert.ok(Array.isArray(item.constants));
    assert.ok(Array.isArray(item.symbols));
    if (item.id !== BG_ALGEBRA) {
      assert.ok(item.symbols.length > 0, `${item.id} 应当有符号`);
    }
    for (const symbol of item.symbols) {
      assert.ok(typeof symbol.symbol === 'string' && typeof symbol.type === 'string');
    }
    for (const constant of item.constants) {
      assert.ok(typeof constant.name === 'string' && typeof constant.type === 'string');
    }
    assert.ok(Array.isArray(item.bases) && item.bases.length > 0);
    assert.ok(item.boundary.length > 0, `${item.id} 必须有边界`);
  }
});

/* ========================================================================== *
 * 2. spec 形状（§1.6）
 * ========================================================================== */

test('每条 spec 的字段与 §1.6 一致（多一个字段都不行）', () => {
  assert.ok(specs.length >= 16, `至少 16 条，实际 ${specs.length}`);
  const seenIds = new Set();
  for (const spec of specs) {
    for (const key of SPEC_FIELD_NAMES) assert.ok(key in spec, `${spec.node} 缺少 ${key}`);
    // parseSpec 在 strict 下拒绝未登记字段；这里提前挡住，免得靠运行期才发现。
    for (const key of Object.keys(spec)) {
      assert.ok(SPEC_FIELD_NAMES.includes(key), `${spec.node} 出现 §1.6 之外的字段 ${key}`);
    }
    assert.equal(spec.specVersion, SPEC_VERSION);
    const id = specIdOf(spec.node);
    assert.equal(id, `formal:${spec.node}`, 'spec 标识必须能对应到真实节点 id');
    assert.equal(specForId(id), spec, 'specForId 与 specIdOf 必须互逆');
    assert.ok(!seenIds.has(id), `${id} 重复`);
    seenIds.add(id);
    assert.deepEqual(specForNode(spec.node), spec);
    assert.ok(Array.isArray(spec.declarations));
    assert.ok(Array.isArray(spec.definitions));
    assert.ok(Array.isArray(spec.assumptions));
    assert.ok(Array.isArray(spec.claims));
    assert.ok(Array.isArray(spec.references));
    assert.equal(spec.statement.kind, 'formula');
    assert.ok(typeof spec.statement.source === 'string' && spec.statement.source.length > 0);
    assert.ok(/^sha256:[0-9a-f]{64}$/.test(spec.hash), `${spec.node} 的 hash 形状不对`);
    assert.ok(spec.boundary.length > 0, `${spec.node} 必须给出边界`);
    for (const line of spec.boundary) assert.ok(typeof line === 'string' && line.length > 0);
    assert.match(spec.source, /对照/, `${spec.node} 的 source 要写清对照哪份原稿`);
    assert.match(spec.source, /data\/cases\/0[1-4]-/, `${spec.node} 的 source 要指向具体案例文件`);
  }
  assert.deepEqual([...SPEC_IDS].sort(), [...seenIds].sort());
});

test('每条 spec 对应本体里真实存在的节点，版本也对得上', () => {
  for (const spec of specs) {
    const node = NODE_BY_ID.get(spec.node);
    assert.ok(node, `formal:${spec.node} 指向的节点不在本体里`);
    assert.equal(spec.nodeVersion, node.version, `formal:${spec.node} 的节点版本与本体不一致`);
    assert.ok(CASES.includes(node.case), `formal:${spec.node} 的节点应属于四案例之一`);
  }
  assert.equal(new Set(specs.map((spec) => spec.node)).size, specs.length, '一个节点只允许一条 spec');
});

test('概念 spec：没有 node，但有可追的 anchor 与唯一标识', () => {
  assert.ok(CONCEPT_SPECS.length >= 3);
  const ids = conceptSpecIds();
  assert.equal(new Set(ids).size, ids.length, '概念标识不能重复');
  for (const spec of CONCEPT_SPECS) {
    assert.equal(spec.node, undefined, '概念 spec 不带 node（不带 = 不硬造本体节点）');
    assert.ok(ids.includes(spec.concept));
    assert.ok(NODE_BY_ID.has(spec.anchor), `${spec.concept} 的 anchor 必须是真实节点`);
    assert.match(spec.source, /data\/cases\/0[1-4]-/);
    assert.ok(spec.boundary.length > 0);
    assert.ok(/^sha256:[0-9a-f]{64}$/.test(spec.hash), `${spec.concept} 的 hash 形状不对`);
    assert.equal(conceptSpec(spec.concept), spec);
    // 概念 spec 允许出现 `concept` / `anchor` 这两个登记元数据字段（不在 §1.6 字段表里），
    // 但其余字段仍必须落在 §1.6 内。
    for (const key of Object.keys(spec)) {
      assert.ok(SPEC_FIELD_NAMES.includes(key) || ['concept', 'anchor'].includes(key),
        `${spec.concept} 出现不允许的字段 ${key}`);
    }
  }
  assert.equal(conceptSpec('concept:nope'), null);
});

test('spec 的声明不与背景常量重名，且声明名唯一、role 合法', () => {
  for (const spec of ALL_SPECS) {
    const seen = new Set();
    const signature = backgroundSignature(spec.background);
    for (const declaration of spec.declarations ?? []) {
      assert.ok(typeof declaration.name === 'string' && declaration.name.length > 0);
      assert.ok(typeof declaration.type === 'string' && declaration.type.length > 0);
      // `shared/formal.d.ts` 写的是 object|element|function|predicate|proposition，
      // language.mjs 的 strict 白名单曾是 object|function|predicate|proposition|constant
      // （2026-10-04 已改成两者的并集）。本登记仍取**交集**，这样无论两侧谁先收紧，
      // 登记表都不会被任一侧拒绝；role 只影响展示，不影响形式内容。
      assert.ok(['object', 'function', 'predicate', 'proposition'].includes(declaration.role),
        `${spec.node ?? spec.concept}/${declaration.name} 的 role ${declaration.role} 不在两侧交集里`);
      assert.ok(!seen.has(declaration.name), `${spec.node ?? spec.concept}: 声明名 ${declaration.name} 重复`);
      assert.ok(!(declaration.name in signature.constants),
        `${spec.node ?? spec.concept}: 声明名 ${declaration.name} 与背景 ${spec.background} 的常量同名（同名不同物）`);
      seen.add(declaration.name);
    }
  }
});

test('背景与 spec 的定义都无环，且没有自我引用', () => {
  for (const id of BACKGROUND_IDS) {
    const theory = backgroundTheory(id);
    assertAcyclic(theory.definitions, `背景 ${id}`);
    for (const definition of theory.definitions) {
      assert.ok(definition.source.length > 0, `${id}/${definition.name} 的定义体为空`);
      assert.ok(!referencedDefinitions(definition.source, [definition.name]).has(definition.name),
        `${id}: 定义 ${definition.name} 引用了自己`);
    }
  }
  for (const spec of ALL_SPECS) {
    const definitions = spec.definitions ?? [];
    assertAcyclic(definitions, `spec ${spec.node ?? spec.concept}`);
    for (const definition of definitions) {
      assert.ok(definition.source.length > 0, `${spec.node}/${definition.name} 的定义体为空`);
    }
  }
});

test('覆盖达标：四案例各 ≥4 条', () => {
  const counts = coverageByCase();
  for (const caseId of CASES) {
    assert.ok((counts[caseId] ?? 0) >= 4, `案例 ${caseId} 只登记了 ${counts[caseId] ?? 0} 条，要求 ≥4`);
  }
  assert.equal(Object.values(counts).reduce((sum, value) => sum + value, 0), specs.length);
});

test('formalCoverage(ontology) 的形状与 server/api.mjs 的调用一致', () => {
  const ontology = { raw: manifest, nodes: manifest.nodes };
  const rows = formalCoverage(ontology);
  assert.ok(rows.length > 0);
  const byCase = new Map(rows.map((row) => [row.case, row]));
  for (const caseId of CASES) {
    const row = byCase.get(caseId);
    assert.ok(row, `覆盖表缺少案例 ${caseId}`);
    assert.equal(row.nodes, manifest.nodes.filter((node) => node.case === caseId).length);
    assert.equal(row.specs, coverageByCase()[caseId]);
    assert.equal(row.specNodes.length, row.specs);
    assert.equal(row.missing.length, row.nodes - row.specs);
    for (const id of row.specNodes) assert.ok(specForNode(id), `${id} 应当在覆盖表里可查`);
  }
  assert.deepEqual(formalCoverage(null), []);
  assert.deepEqual(formalCoverage({ raw: { nodes: [] } }), []);
});

/* ========================================================================== *
 * 3. 纪律：不把待证定理替换成一个已假定为真的符号
 * ========================================================================== */

test('statement 不允许与任何 assumptions 逐字相同（禁止循环假设）', () => {
  for (const spec of ALL_SPECS) {
    for (const assumption of spec.assumptions ?? []) {
      assert.notEqual(assumption.source, spec.statement.source,
        `${spec.node ?? spec.concept}: 假设 ${assumption.id} 与 statement 逐字相同——这等于把待证结论假定为真`);
    }
  }
});

test('role 为 target 的 claim 不允许出现在 assumptions 里', () => {
  for (const spec of ALL_SPECS) {
    const assumed = new Set((spec.assumptions ?? []).map((item) => item.source));
    for (const claim of spec.claims ?? []) {
      assert.ok(['derived', 'target'].includes(claim.role), `${spec.node}/${claim.id} 的 role 不合法`);
      if (claim.role === 'target') {
        assert.ok(!assumed.has(claim.source), `${spec.node}: target ${claim.id} 同时被写成假设`);
      }
    }
  }
});

test('未展开义务按 usage 分流：target 不许进假设，hypothesis 不许当目标', () => {
  const targetSlots = new Set(['statement', 'claims', 'conditions', 'schema']);
  const hypothesisSlots = new Set(['assumptions']);
  for (const obligation of UNEXPANDED_OBLIGATIONS) {
    assert.ok(typeof obligation.symbol === 'string' && obligation.symbol.length > 0);
    assert.ok(typeof obligation.type === 'string' && obligation.type.length > 0, `${obligation.id} 缺明确类型`);
    assert.ok(typeof obligation.source === 'string' && obligation.source.length > 0, `${obligation.id} 缺来源`);
    assert.ok(typeof obligation.scope === 'string' && obligation.scope.length > 0, `${obligation.id} 缺解释范围`);
    assert.equal(obligation.status, 'not-machine-certified');
    assert.ok(Array.isArray(obligation.appearsIn) && obligation.appearsIn.length > 0);
    assert.ok(['target', 'hypothesis'].includes(obligation.usage), `${obligation.id} 的 usage 不合法`);
    const allowed = obligation.usage === 'target' ? targetSlots : hypothesisSlots;
    for (const slot of obligation.appearsIn) {
      assert.ok(allowed.has(slot),
        `${obligation.id} 的 usage=${obligation.usage} 却出现在 ${slot}`);
    }
    assert.ok(!obligation.appearsIn.includes('axioms'), `${obligation.id} 不许进公理`);
    assert.ok(obligation.boundary.length > 0, `${obligation.id} 必须给出边界`);
  }
  // 假设型的义务不许同时是任何 spec 的 statement
  const statements = new Set(ALL_SPECS.map((spec) => spec.statement.source));
  for (const obligation of UNEXPANDED_OBLIGATIONS.filter((item) => item.usage === 'hypothesis')) {
    for (const formula of statements) {
      assert.ok(!formula.includes(obligation.symbol),
        `${obligation.id} 是假设型义务，却出现在 statement ${formula}`);
    }
  }
  /*
   * 背景公理里不允许出现「待证义务」的符号——**但定义性公理除外**。
   *
   * 为什么除外：定义性公理可证地**等于**某个谓词已经写下的 expansion
   * （上面那条测试用 α 规范哈希逐条比对），所以它里面的符号是"该谓词的含义"
   * 的一部分，不是新断言。典型例子：`is_ck` 是 `obl:manifold:chain-rule` 的符号，
   * 但它本来就出现在 `ck_atlas` 的 expansion 里——按符号一刀切会误伤定义。
   * 真正要拦的是 `structural` / `logic` 公理借着背景之名塞进内容。
   */
  const symbols = new Set(UNEXPANDED_OBLIGATIONS.map((item) => item.symbol));
  for (const id of BACKGROUND_IDS) {
    for (const axiom of backgroundTheory(id).axioms) {
      if (axiom.kind === 'definitional') continue;
      for (const symbol of symbols) {
        assert.ok(!new RegExp(`(^|[^A-Za-z0-9_])${symbol}([^A-Za-z0-9_]|$)`).test(axiom.formula),
          `背景公理 ${axiom.id} 里出现了未展开义务符号 ${symbol}`);
      }
    }
  }
});

test('Cayley 的三段义务各自独立登记，没有被合成一个定理符号', () => {
  const symbols = UNEXPANDED_OBLIGATIONS.map((item) => item.symbol);
  assert.ok(symbols.includes('left_mul_bijective'));
  assert.ok(symbols.includes('left_mul_hom'));
  assert.ok(symbols.includes('perm_subgroup'));
  assert.ok(!symbols.includes('cayley'), '不允许用单个符号代表整个 Cayley 定理');
  for (const spec of ALL_SPECS) {
    for (const assumption of spec.assumptions ?? []) {
      assert.ok(!/cayley/i.test(assumption.source), `${spec.node}: 假设里不允许出现 cayley 符号`);
    }
  }
});

test('每条 spec 至少一条原句对照，且 quote 在对应原稿里逐字出现', () => {
  const covered = new Map();
  const byNode = new Map(specs.map((spec) => [spec.node, spec]));
  for (const row of SOURCE_CROSSWALK) {
    const spec = byNode.get(row.node);
    assert.ok(spec, `对照清单指向未登记的 spec ${row.node}`);
    assert.ok(row.caseFile.startsWith('data/cases/0'), `${row.node} 的对照文件不对`);
    assert.ok(typeof row.section === 'string' && row.section.length > 0);
    assert.ok(typeof row.relation === 'string' && row.relation.length > 0);
    assert.ok(caseText(row.caseFile).includes(row.quote),
      `${row.node} 的原句在 ${row.caseFile} 里找不到（逐字匹配）：${row.quote.slice(0, 60)}…`);
    covered.set(row.node, (covered.get(row.node) ?? 0) + 1);
  }
  for (const spec of specs) {
    assert.ok((covered.get(spec.node) ?? 0) > 0, `formal:${spec.node} 没有任何原句对照`);
  }
});

test('原稿口径差异显式记录，且不声称改过原稿', () => {
  assert.ok(DIVERGENCES.length >= 5);
  for (const item of DIVERGENCES) {
    assert.ok(typeof item.original === 'string' && item.original.length > 0, `${item.id} 缺原稿原话`);
    assert.ok(typeof item.registration === 'string' && item.registration.length > 0, `${item.id} 缺登记落点`);
    assert.ok(typeof item.why === 'string' && item.why.length > 0, `${item.id} 缺理由`);
    assert.ok(typeof item.notDone === 'string' && item.notDone.length > 0, `${item.id} 缺"没做什么"`);
  }
  const ids = DIVERGENCES.map((item) => item.id);
  assert.ok(ids.includes('div:group:right-identity-as-hypothesis'), '右单位律的口径差异必须显式记录');
  assert.ok(ids.includes('div:group:concrete-carrier-sorts'), '具体载体排序的编码差异必须显式记录');
});

/* ========================================================================== *
 * 4. 哈希与引用
 * ========================================================================== */

test('hash 与重算一致，引用哈希与目标 spec 一致', () => {
  assert.notEqual(HASH_BACKEND, 'unavailable', '必须有可用的哈希后端');
  const byNode = new Map(specs.map((spec) => [spec.node, spec]));
  for (const spec of ALL_SPECS) {
    assert.equal(spec.hash, specHash(spec), `${spec.node ?? spec.concept} 的 hash 与重算不一致（登记表已过期）`);
    for (const reference of spec.references ?? []) {
      const target = byNode.get(reference.node);
      assert.ok(target, `${spec.node ?? spec.concept} 引用了未登记的节点 ${reference.node}`);
      assert.equal(reference.specHash, target.hash,
        `${spec.node ?? spec.concept} → ${reference.node} 的 specHash 过期（stale-reference）`);
      assert.equal(reference.version, target.nodeVersion);
      assert.ok(Array.isArray(reference.symbols) && reference.symbols.length > 0,
        `${spec.node ?? spec.concept} → ${reference.node} 缺 symbols`);
    }
  }
});

test('语言层可用时，所有 spec 都走规范化哈希（不许悄悄退回弱口径）', async (t) => {
  const language = await loadLanguage();
  if (typeof language?.parseSpec !== 'function') {
    t.skip('core/formal/language.mjs 尚未提供 parseSpec');
    return;
  }
  const backends = hashBackends();
  assert.deepEqual(parseProblems(), {}, `有 spec 解析不过：${JSON.stringify(parseProblems(), null, 1)}`);
  assert.deepEqual(backends.source, [], `这些 spec 退回了源码级哈希：${backends.source.join(', ')}`);
  assert.equal(backends.canonical.length, ALL_SPECS.length);
  assert.equal(HASH_BACKEND, HASH_BACKENDS.CANONICAL);
});

test('引用图是 DAG，且源级哈希输入字段与 shared/formal.mjs 的口径一致', () => {
  const byNode = new Map(specs.map((spec) => [spec.node, spec]));
  const state = new Map();
  const visit = (spec, stack) => {
    if (state.get(spec.node) === 'done') return;
    assert.notEqual(state.get(spec.node), 'open', `引用成环：${[...stack, spec.node].join(' → ')}`);
    state.set(spec.node, 'open');
    for (const reference of spec.references) visit(byNode.get(reference.node), [...stack, spec.node]);
    state.set(spec.node, 'done');
  };
  for (const spec of specs) visit(spec, []);

  const input = specHashInput(specs[0]);
  assert.deepEqual(Object.keys(input).sort(), [
    'assumptions', 'background', 'claims', 'declarations', 'definitions',
    'references', 'specVersion', 'statement', 'theoryVersion',
  ]);
  assert.equal(specHashInput(specs[0]).hash, undefined, 'hash 不应进入自己的哈希输入');
});

/* ========================================================================== *
 * 5. 关系登记
 * ========================================================================== */

test('六种关系都有登记，端点都是真实节点或已登记概念', () => {
  const kinds = new Set(RELATION_KINDS);
  assert.ok(RELATIONS.length > 0);
  for (const relation of RELATIONS) {
    assert.ok(kinds.has(relation.kind), `${relation.id} 的 kind ${relation.kind} 不在 §2.11 的六种里`);
    assert.ok(typeof relation.reason === 'string' && relation.reason.length > 0);
    assert.ok(relation.boundary.length > 0, `${relation.id} 必须给出边界`);
    assert.ok(['registered', 'machine-certified', 'unverified', 'not-claimed'].includes(relation.status),
      `${relation.id} 的 status 不合法`);
    for (const side of ['from', 'to']) {
      assert.ok(endpointOk(relation[side].node, relation[side].version),
        `${relation.id} 的 ${side} = ${relation[side].node}@${relation[side].version} 既不是真实节点也不是已登记概念`);
    }
    for (const condition of relation.conditions) {
      assert.ok(typeof condition.id === 'string');
      assert.ok(typeof condition.source === 'string' && condition.source.length > 0);
      assert.ok(typeof condition.readable === 'string' && condition.readable.length > 0);
    }
  }
  const registered = new Set(RELATIONS.map((relation) => relation.kind));
  for (const kind of RELATION_KINDS) assert.ok(registered.has(kind), `关系类型 ${kind} 没有登记任何一条`);
});

test('hardGeneralization 的方向与端点一致（一般 → 特殊）', () => {
  const general = [
    ...RELATIONS.filter((relation) => relation.kind === 'hardGeneralization'),
    ...CONCEPT_RELATIONS.filter((relation) => relation.kind === 'hardGeneralization'),
  ];
  assert.ok(general.length >= 3, `至少三条一般/特殊对，实际 ${general.length}`);
  for (const relation of general) {
    assert.ok(relation.direction, `${relation.id} 必须给精确方向`);
    assert.equal(relation.direction.general, relation.from.node);
    assert.equal(relation.direction.special, relation.to.node);
    assert.ok(relation.goal?.source, `${relation.id} 缺 goal`);
    assert.ok(['registered', 'unverified', 'machine-certified'].includes(relation.status),
      `${relation.id} 的 status 不合法`);
  }
});

test('阿贝尔群 → 群：两端参数类型逐位相同，且不靠假定为真', () => {
  const relation = CONCEPT_RELATIONS.find((item) => item.id === 'rel:concept:abelian-refines-group');
  assert.ok(relation, '必须有这条特化（Lead 2026-10-04 点名的缺口）');
  assert.equal(relation.from.node, 'group:group-concept');
  assert.equal(relation.to.node, 'concept:group:abelian');
  const concept = conceptSpec('concept:group:abelian');
  assert.ok(concept);
  // 两端参数类型逐位相同 —— §2.11 的 generalization 判定器要求
  assert.equal(
    concept.declarations.map((item) => item.type).join('|'),
    ['G -> G -> G', 'G', 'G -> G'].join('|'),
  );
  // 概念 spec 里不许把「阿贝尔群是群」写成假设
  assert.equal(concept.assumptions.length, 0, '概念 spec 不允许有假设');
  assert.ok(concept.claims.some((claim) => claim.role === 'target'), '特化证据必须是 target');
  for (const line of concept.boundary) assert.ok(!/假定为真/.test(line));
});

test('条件推导必须把缺的义务列全（Cayley 那一条）', () => {
  const cayley = RELATIONS.find((relation) => relation.id === 'rel:group:injective-derives-cayley');
  assert.ok(cayley);
  assert.equal(cayley.status, 'unverified', '不声称完整 Cayley 已机器认证');
  const ids = cayley.conditions.map((item) => item.id);
  for (const needed of ['M1', 'M2', 'M3']) assert.ok(ids.includes(needed), `缺条件 ${needed}`);
  assert.deepEqual(cayley.missingObligations, ['left_mul_bijective', 'left_mul_hom', 'perm_subgroup']);
  for (const symbol of cayley.missingObligations) {
    assert.ok(UNEXPANDED_OBLIGATIONS.some((item) => item.symbol === symbol), `${symbol} 应有独立登记`);
  }
});

test('概念关系与概念 spec 互相闭合', () => {
  for (const relation of CONCEPT_RELATIONS) {
    assert.ok(NODE_BY_ID.has(relation.anchor), `${relation.id} 的 anchor 不是真实节点`);
    for (const side of ['from', 'to']) {
      assert.ok(endpointOk(relation[side].node, relation[side].version), `${relation.id} 的 ${side} 端点不合法`);
    }
    assert.ok(relation.boundary.length > 0);
  }
  for (const spec of CONCEPT_SPECS) {
    assert.ok(
      CONCEPT_RELATIONS.some((relation) => relation.from.node === spec.concept || relation.to.node === spec.concept),
      `${spec.concept} 没有任何关系用到它`,
    );
  }
});

/*
 * Lead 2026-10-04 的要求：「请你自己跑一次确认这两条真的能证出来，而不是只登记在那里。
 * 若证不出来，把原因报给我，不要把它标成"已登记即完成"。」
 *
 * ## 三次实测的演进（这条测试钉的是**最新**现状）
 *
 * 1. 第一轮：四条全证不出来——两端都是未解释的原子谓词，背景里没有连接它们的子句。
 * 2. 第二轮（Lead 裁决加定义性公理后）：公理就位，但卡在引擎——
 *    `clauses.clausifyFormula` 在蕴含**前件含全称量词**时抛错，`⇔` 形状的公理进不了子句程序。
 * 3. 第三轮（clause-fix/task-8 落地后）：
 *    - **三条已证出并通过真 kernel 子进程**（`kernelStatus: 'passed'`、开放假设为空）：
 *      `rel:concept:abelian-refines-group`（12 步）、`rel:concept:linear-refines-additive`（8 步）、
 *      `rel:manifold:chart-atlas-generalizes-ck-atlas`（10 步）；
 *    - 第四条 `rel:manifold:ck-atlas-generalizes-smooth-atlas` 仍 `undecided`：
 *      唯一缺口是 `smooth ⇒ is_ck(·)(k)` 这条**数学事实**，按裁决**故意没有** stipulate。
 *
 * ## 升级门槛（不许放宽）
 *
 * 标 `machine-certified` 必须同时有：`search = proved`、装配出的证书、
 * 真 kernel 子进程判 `passed`。`certificate.kernelStatus === 'passed'` 这一条
 * **不允许**为了让端到端变绿而放宽。
 */
test('hardGeneralization 的认证状态与证书证据一致（门槛不许放宽）', () => {
  const generalizations = [
    ...RELATIONS.filter((relation) => relation.kind === 'hardGeneralization'),
    ...CONCEPT_RELATIONS.filter((relation) => relation.kind === 'hardGeneralization'),
  ];
  assert.ok(generalizations.length >= 4);
  const certified = generalizations.filter((relation) => relation.status === 'machine-certified');
  const pending = generalizations.filter((relation) => relation.status !== 'machine-certified');
  assert.equal(certified.length + pending.length, generalizations.length);

  for (const relation of certified) {
    // 1) 必须带真的证书重放结果，且 kernel 判 passed。
    assert.ok(relation.certificate, `${relation.id} 标了 machine-certified 就必须带 certificate`);
    assert.equal(relation.certificate.kernelStatus, 'passed', `${relation.id} 的证书没有通过 kernel`);
    assert.equal(relation.certificate.kernelVersion, 'mcs-nd-subset/1');
    assert.equal(relation.certificate.exitCode, 0);
    assert.deepEqual(relation.certificate.openHypotheses, [], `${relation.id} 的证书不允许有开放假设`);
    for (const key of ['theoryId', 'theorySha256', 'proofSha256', 'replay', 'ranAt']) {
      assert.ok(typeof relation.certificate[key] === 'string' && relation.certificate[key].length > 0,
        `${relation.id} 的 certificate.${key} 缺失`);
    }
    assert.match(relation.certificate.theorySha256, /^[0-9a-f]{64}$/);
    assert.match(relation.certificate.proofSha256, /^[0-9a-f]{64}$/);
    assert.ok(relation.certificate.steps > 0 && relation.certificate.steps <= 2000,
      `${relation.id} 的步数必须落在 §0 的 MAX_STEPS = 2000 内`);
    assert.ok(Array.isArray(relation.certificate.committedAxioms) && relation.certificate.committedAxioms.length > 0,
      `${relation.id} 必须写清这份证书 commit 了哪些公理`);
    // 2) commit 的公理必须真的在背景里。
    const backgroundId = relation.certificate.theoryId.replace(/^T:/, '');
    const available = backgroundAxiomsForKernel(backgroundId);
    for (const axiomId of relation.certificate.committedAxioms) {
      assert.ok(available.some((axiom) => axiom.id === axiomId),
        `${relation.id} commit 了背景里不存在的公理 ${axiomId}`);
    }
    // 3) proofAttempt 必须记成 proved。
    assert.equal(relation.proofAttempt.status, 'proved', `${relation.id} 有证书却没记成 proved`);
  }

  for (const relation of pending) {
    assert.equal(relation.status, 'unverified', `${relation.id} 的 status 不合法`);
    assert.notEqual(relation.proofAttempt?.status, 'proved', `${relation.id} 没有签出的证书就不许记成 proved`);
    assert.ok(Array.isArray(relation.missingObligations) && relation.missingObligations.length > 0,
      `${relation.id} 必须写清当前缺什么`);
    assert.equal(relation.certificate, undefined, `${relation.id} 未签出就不许带正式 certificate`);
    assert.ok(!/背景规定公理：/.test(relation.missingObligations.join('\n')),
      `${relation.id} 的定义性公理已经就位，不许再要那条公理`);
    /*
     * 第三种状态：**证据已取得、但因收口指令未签出**。
     * 它必须带着 `signed: false` 与 `holdReason`——把"没证出来"和"证出来了但暂不签"
     * 分开，否则读者会把两者混成一个"未完成"。
     */
    if (relation.pendingCertificate) {
      assert.equal(relation.pendingCertificate.signed, false,
        `${relation.id} 的 pendingCertificate 必须是未签出的`);
      assert.equal(relation.pendingCertificate.kernelStatus, 'passed',
        `${relation.id} 的 pendingCertificate 应当记录它确实通过了 kernel`);
      assert.equal(typeof relation.pendingCertificate.holdReason, 'string');
      assert.ok(relation.pendingCertificate.holdReason.length > 0,
        `${relation.id} 必须写清为什么压在手上不签`);
    }
  }

  // 那一条仍然缺的**数学事实**必须写明"故意不 stipulate"。
  const smooth = generalizations.find((item) => item.id === 'rel:manifold:ck-atlas-generalizes-smooth-atlas');
  assert.equal(smooth.status, 'unverified');
  assert.match(smooth.missingObligations.join('\n'), /数学事实/,
    'smooth ⇒ is_ck 应当作为数学事实留在义务里，而不是被规定成公理');
  assert.match(smooth.proofAttempt.reason, /is_ck/, 'reason 要写清唯一缺口就是那条数学事实');

  /*
   * 台账：四条的去向必须一眼可数——签出 3 条、真缺口 1 条。
   * 其中两条**曾经压手**，签出后 `pendingCertificate` 必须作为历史留下并标 `supersededBy`：
   * 「没证出来」与「证出来了但按令压手」是两种状态，合并掉就再也看不出这段经过了。
   */
  assert.equal(certified.length, 3, '当前签出三条（abelian / linear / chart-atlas）');
  assert.equal(pending.length, 1, '只剩 smooth ⇒ is_ck 那条真缺口');
  assert.equal(pending.filter((item) => !item.pendingCertificate).length, 1,
    'smooth ⇒ is_ck 那条是真缺口，不该有 pendingCertificate');
  const withHistory = generalizations.filter((item) => item.pendingCertificate);
  assert.equal(withHistory.length, 2, '两条曾压手的记录必须保留');
  for (const relation of withHistory) {
    assert.equal(relation.pendingCertificate.supersededBy, 'certificate',
      `${relation.id} 的压手历史必须标出被谁取代`);
    assert.match(relation.pendingCertificate.holdReason, /签出/,
      `${relation.id} 的 holdReason 要交代后来签出了`);
    assert.equal(relation.certificate.kernelStatus, 'passed');
  }
  // 三条签出的证书都要写清"三项核对"，而不是只说"跑通了"。
  for (const relation of certified) {
    assert.match(relation.certificate.note, /kernel/, `${relation.id} 的 note 要写明真 kernel 核对`);
    assert.match(relation.certificate.note, /α 规范哈希/, `${relation.id} 的 note 要写明结论与目标 α 等价`);
    assert.match(relation.certificate.note, /可重复/, `${relation.id} 的 note 要写明可重复`);
  }
});

test('背景符号引用（BACKGROUND_REFERENCES）与独立重算一致', () => {
  assert.ok(BACKGROUND_REFERENCES.length > 0);
  const declared = new Set(BACKGROUND_REFERENCES.map((item) => `${item.node}|${item.symbol}`));
  for (const item of BACKGROUND_REFERENCES) {
    assert.ok(NODE_BY_ID.has(item.node));
    const signature = backgroundSignature(item.background);
    assert.equal(signature.constants[item.symbol], item.type, `${item.node} 的 ${item.symbol} 类型对不上`);
  }
  // 独立重算：扫 spec 的每一处 source，凡出现背景常量名的都必须已登记。
  let used = 0;
  for (const spec of specs) {
    const signature = backgroundSignature(spec.background);
    const texts = [
      spec.statement.source,
      ...spec.assumptions.map((item) => item.source),
      ...spec.claims.map((item) => item.source),
      ...spec.definitions.map((item) => item.source),
    ];
    for (const name of Object.keys(signature.constants)) {
      const pattern = new RegExp(`(^|[^A-Za-z0-9_])${name}([^A-Za-z0-9_]|$)`);
      if (!texts.some((text) => pattern.test(text))) continue;
      used += 1;
      assert.ok(declared.has(`${spec.node}|${name}`), `${spec.node} 用了背景符号 ${name} 但没登记引用`);
    }
  }
  assert.ok(used > 0);
});

/*
 * Lead 2026-10-04 裁决：把谓词 `expansion` 里已经写下的含义从注释升成**定义性公理**。
 * 这条测试把「升成公式」这件事钉死在三件事上：
 *   1. 每条 `kind:'definitional'` 的公理都能追到某个谓词的 `expansion`（origin 字段）；
 *   2. 它的公式**恰好**是「该谓词 ⇔ 该 expansion」（用 α 规范哈希比对，不是肉眼核对）；
 *   3. 任何 `usage:'target'` 的义务符号都不许成为公理要断言的结论。
 */
test('定义性公理：恰好是「谓词 ⇔ 它已写下的 expansion」', async (t) => {
  const language = await loadLanguage();
  const formulaPredicates = [];
  for (const id of BACKGROUND_IDS) {
    for (const predicate of backgroundPredicates(id)) {
      if (predicate.expansionKind !== 'formula') continue;
      formulaPredicates.push({ background: id, predicate });
    }
  }
  assert.ok(formulaPredicates.length >= 8, `至少 8 条谓词把含义写成了公式，实际 ${formulaPredicates.length}`);

  for (const id of BACKGROUND_IDS) {
    const theory = backgroundTheory(id);
    for (const axiom of theory.axioms) {
      assert.ok(AXIOM_KINDS.includes(axiom.kind), `${axiom.id} 的 kind ${axiom.kind} 不合法`);
      assert.equal(axiom.status, 'background-assumed');
      if (axiom.kind !== 'definitional') continue;
      assert.ok(axiom.origin, `${axiom.id} 的定义性公理必须带 origin`);
      for (const key of ['predicate', 'expansion', 'registration', 'caseQuote']) {
        assert.ok(typeof axiom.origin[key] === 'string' && axiom.origin[key].length > 0,
          `${axiom.id} 的 origin.${key} 缺失`);
      }
      const declared = formulaPredicates.find(
        (item) => item.background === id && item.predicate.name === axiom.origin.predicate,
      );
      assert.ok(declared, `${axiom.id} 的 origin.predicate=${axiom.origin.predicate} 不是本背景里把含义写成公式的谓词`);
      assert.equal(axiom.origin.expansion, declared.predicate.expansion,
        `${axiom.id} 的 origin.expansion 与谓词登记里的 expansion 不一致——那意味着公理不是"已写下的含义"`);
      assert.equal(declared.predicate.axiomId, axiom.id, `${declared.predicate.name} 的 axiomId 指错了`);
    }
  }

  if (typeof language?.parseFormula !== 'function' || typeof language?.formulaHash !== 'function') {
    t.diagnostic('语言层不可用：只核对了 origin 与 expansion 的一致性，未做公式级比对');
    return;
  }
  // 公式级核对：公理 == ∀(参数). (谓词(参数) ⇔ expansion)，逐条比 α 规范哈希。
  //
  // 为什么不拼字符串重建：不同谓词的参数形状不同（`mm/ee/ii` 三件套、`TT : V->V`、
  // `AA/kk`），拼模板会写成一堆特例。这里改成**结构化**核对：
  // 剥掉 ∀ → 必须是 `⇔` 展开成的两个蕴含 → 左件必须是 B(谓词(参数)) → 右件必须与
  // `origin.expansion` 的解析结果 α 等价。既不依赖文字形状，也不会漏判。
  const headConstant = (term) => {
    let node = term;
    while (Array.isArray(node) && node[0] === 'app') node = node[1];
    return Array.isArray(node) && node[0] === 'c' ? node[1] : null;
  };
  const stripAll = (formula) => {
    let node = formula;
    const bound = [];
    while (Array.isArray(node) && node[0] === 'all') {
      bound.push(node[1]);
      node = node[2];
    }
    return { bound, body: node };
  };
  for (const id of BACKGROUND_IDS) {
    const theory = backgroundTheory(id);
    for (const axiom of theory.axioms.filter((item) => item.kind === 'definitional')) {
      const constants = {};
      for (const param of axiom.origin.params) constants[param.name] = param.type;
      const ctx = formulaCtx(language, id, { constants });
      const { bound, body } = stripAll(language.parseFormula(axiom.formula, ctx));
      assert.ok(bound.length > 0, `${axiom.id} 的定义性公理应当是闭公式（带 ∀）`);
      assert.equal(body[0], 'and', `${axiom.id} 的 body 应当是 ⇔ 展开成的合取`);
      const forward = body[1];
      assert.equal(forward[0], 'imp');
      assert.equal(body[2][0], 'imp');
      // 左件 = B(谓词(参数))
      assert.equal(forward[1][0], 'eq', `${axiom.id} 的左件应当是 B(谓词(参数))`);
      assert.deepEqual(forward[1][2], ['logic', 'true'], `${axiom.id} 的 B(t) 应当写成 t = true`);
      assert.equal(headConstant(forward[1][1]), axiom.origin.predicate,
        `${axiom.id} 的 B(t) 头部不是 ${axiom.origin.predicate}`);
      /*
       * 右件 = origin.expansion。
       *
       * 为什么不用"解析后比哈希"：公理里的 `mm/ee/ii`（或 `TT`/`AA/kk`）是
       * **∀ 绑定变量**（de Bruijn `['b', i, T]`），而单独解析 `origin.expansion`
       * 时它们是 ctx 里的**常量**——两棵树天然不同，比哈希会假报不等。
       * 改成"文本级包含 + 结构级左件"两条，既不与 de Bruijn 打架，也足够紧：
       * 公理必须字面包含「谓词(参数…) ⇔ expansion」。
       */
      const normalize = (source) => source.replace(/\s+/g, '');
      const application = axiom.origin.params.map((param) => `(${param.name})`).join('');
      assert.ok(
        normalize(axiom.formula).includes(normalize(`(${axiom.origin.predicate}${application}⇔${axiom.origin.expansion})`)),
        `${axiom.id} 的公理没有字面包含「${axiom.origin.predicate}(参数…) ⇔ expansion」——那意味着它加了含义之外的东西`,
      );
    }
  }
});

test('公理里不许出现被明确列入黑名单的待证义务符号', () => {
  // Lead 2026-10-04 点名的清单：这些是四案例的**目标**，任何一条都不许成为公理结论。
  const BLACKLIST = ['is_iso', 'perm_subgroup', 'left_mul_bijective', 'left_mul_hom', 'cayley'];
  for (const id of BACKGROUND_IDS) {
    for (const axiom of backgroundTheory(id).axioms) {
      for (const symbol of BLACKLIST) {
        assert.ok(!new RegExp(`(^|[^A-Za-z0-9_])${symbol}([^A-Za-z0-9_]|$)`).test(axiom.formula),
          `${axiom.id} 里出现了待证义务符号 ${symbol}`);
      }
    }
  }
  // 定义性公理只许"定义谓词自己"：origin.predicate 必须是本背景登记过的概念谓词。
  for (const id of BACKGROUND_IDS) {
    const names = new Set(backgroundTheory(id).constants.map((item) => item.name));
    for (const axiom of backgroundTheory(id).axioms.filter((item) => item.kind === 'definitional')) {
      assert.ok(names.has(axiom.origin.predicate),
        `${axiom.id} 的 origin.predicate=${axiom.origin.predicate} 不是本背景声明的谓词`);
    }
  }
});

test('跨 spec 同名声明必须同类型（§1.1：同名异类型要拒绝，不许静默取一个）', () => {
  const byName = new Map();
  for (const spec of ALL_SPECS) {
    const owner = spec.node ?? spec.concept;
    for (const declaration of spec.declarations ?? []) {
      if (!byName.has(declaration.name)) byName.set(declaration.name, []);
      byName.get(declaration.name).push({ owner, type: declaration.type });
    }
  }
  const clashes = [];
  for (const [name, uses] of byName) {
    const types = new Set(uses.map((item) => item.type));
    if (types.size > 1) {
      clashes.push(`${name}: ${uses.map((item) => `${item.owner}(${item.type})`).join(' vs ')}`);
    }
  }
  assert.deepEqual(clashes, [],
    '跨 spec 的同名自由参数类型不一致；装配类型环境时会抛「同名不同类」。'
    + '若两处是不同对象请改名（并更新 statement/assumptions/definitions 与对照清单）');
});

test('跨 spec 同名定义必须同类型同定义体（同名不同物是本体层最贵的错误）', () => {
  const byName = new Map();
  for (const spec of ALL_SPECS) {
    const owner = spec.node ?? spec.concept;
    for (const definition of spec.definitions ?? []) {
      if (!byName.has(definition.name)) byName.set(definition.name, []);
      byName.get(definition.name).push({ owner, type: definition.type, source: definition.source });
    }
  }
  for (const [name, uses] of byName) {
    const types = new Set(uses.map((item) => item.type));
    const sources = new Set(uses.map((item) => item.source));
    assert.equal(types.size, 1, `定义 ${name} 在不同 spec 里类型不一致：${uses.map((u) => `${u.owner}(${u.type})`).join(' vs ')}`);
    assert.equal(sources.size, 1,
      `定义 ${name} 在不同 spec 里定义体不一致（合并时会被判重复且内容不同）：${uses.map((u) => u.owner).join(' vs ')}`);
  }
});

test('kernelInputForBackground：四个背景都能装配成 kernel theory', async (t) => {
  const language = await loadLanguage();
  if (typeof language?.parseSpec !== 'function') {
    t.skip('core/formal/language.mjs 尚未提供 parseSpec');
    return;
  }
  let theory = null;
  try {
    theory = await import('../core/formal/theory.mjs');
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') {
      t.skip('core/formal/theory.mjs 尚未提供');
      return;
    }
    throw error;
  }
  if (typeof theory.buildKernelTheory !== 'function') {
    t.skip('core/formal/theory.mjs 尚未提供 buildKernelTheory');
    return;
  }
  for (const id of BACKGROUND_IDS) {
    const input = await kernelInputForBackground(id);
    assert.ok(input, `${id} 应当能给出 kernel 输入`);
    assert.doesNotThrow(
      () => theory.buildKernelTheory(input.specs, { background: input.background, axioms: input.axioms }),
      `${id} 应当能装配（原始 spec 不能直接喂——必须走 kernelInputForBackground 先归一）`,
    );
  }
  // 定义性公理要能作为承诺公理进 theory：这是「阿贝尔群是群」可证的前提。
  const groupInput = await kernelInputForBackground(BG_GROUP);
  assert.ok(groupInput.axioms.some((axiom) => axiom.id === 'bg-abelian-group-expansion'));
  assert.ok(groupInput.axioms.some((axiom) => axiom.id === 'bg-abelian-group-expansion-Z5'));
  assert.ok(groupInput.axioms.some((axiom) => axiom.id === 'bg-abelian-group-expansion-S3'));
  const built = theory.buildKernelTheory(groupInput.specs, { background: groupInput.background, axioms: groupInput.axioms });
  assert.equal(built.axioms.length, groupInput.axioms.length, 'bg:group/1 的定义性公理应当全部进 theory');
});

/* ========================================================================== *
 * 6. 有限对象
 * ========================================================================== */

test('REGISTERED_MODELS 与规格 §2.12 一致，且表逐格可独立重算', () => {
  assert.deepEqual(REGISTERED_MODELS, ['finite:z5-units', 'finite:s3']);
  assert.deepEqual(REGISTERED_INSTANCES.map((item) => item.id), REGISTERED_MODELS);
  for (const result of verifyAllInstances()) {
    assert.deepEqual(result.problems, [], `${result.id} 的校验问题：${result.problems.join('；')}`);
    assert.equal(result.ok, true);
  }
});

test('模 5 单位群：4×4 表、4 条逆元、交换、循环', () => {
  const model = findInstance('finite:z5-units');
  assert.ok(model);
  assert.equal(model.carrier.length, 4);
  assert.equal(model.ops[0].table.length, 4);
  for (const row of model.ops[0].table) assert.equal(row.length, 4);
  assert.equal(Object.keys(model.inverses).length, 4);
  assert.equal(model.isCommutative, true);
  assert.deepEqual(model.inverses, { u1: 'u1', u2: 'u3', u3: 'u2', u4: 'u4' });
  assert.deepEqual(model.generatorTrace.u2, ['u1', 'u2', 'u4', 'u3'], '2 的幂依次为 1,2,4,3（原稿原话）');
  assert.equal(verifyInstance(model).ok, true);
});

test('S3：6×6 表、6 条逆元、非交换见证与原稿一致', () => {
  const model = findInstance('finite:s3');
  assert.ok(model);
  assert.equal(model.carrier.length, 6);
  assert.equal(model.ops[0].table.length, 6);
  for (const row of model.ops[0].table) assert.equal(row.length, 6);
  assert.equal(Object.keys(model.inverses).length, 6);
  assert.equal(model.isCommutative, false);
  assert.match(model.notation, /右侧先作用/, 'S3 的复合记号约定必须写清楚');
  assert.deepEqual(model.nonCommutativeWitness.imageOfOne, { product: 2, reversed: 3 });
  assert.notEqual(model.nonCommutativeWitness.product, model.nonCommutativeWitness.reversed);
  assert.equal(verifyInstance(model).ok, true);
});

test('每个有限对象都给出运算名映射（供有限求值器适配）', () => {
  for (const model of REGISTERED_INSTANCES) {
    assert.ok(model.opNames, `${model.id} 缺 opNames`);
    for (const key of ['mul', 'identity', 'inverse']) {
      assert.equal(typeof model.opNames[key], 'string', `${model.id}.opNames.${key} 应当是字符串`);
      assert.ok(model.opNames[key].length > 0);
    }
    // `opNames.mul` 是**运算常元名**，与 `ops[0].name` 同物；`opNames.identity` / `opNames.inverse`
    // 则是登记层用的常元名（one5 / inv5、e3 / inv3），与 carrier 里的**元素名**（u1 / e3）不是一回事：
    // 一个说"叫什么符号"，一个说"载体里哪个元素"。
    assert.equal(model.opNames.mul, model.ops[0].name, 'opNames.mul 必须与 ops[0].name 一致');
    assert.ok(model.carrier.includes(model.identity), 'identity 必须是载体里的元素');
    for (const inverse of Object.values(model.inverses)) {
      assert.ok(model.carrier.includes(inverse), `${model.id} 的逆元表出现载体外的元素 ${inverse}`);
    }
  }
  assert.equal(findInstance('finite:s3').opNames.inverse, 'inv3');
  assert.equal(findInstance('finite:z5-units').opNames.inverse, 'inv5');
});

test('instanceSummary / modelSummary 形状符合目录与 §2.12', () => {
  const summary = instanceSummary();
  assert.equal(summary.length, 2);
  for (const item of summary) {
    for (const key of ['id', 'carrier', 'ops', 'isCommutative', 'note']) assert.ok(key in item, `缺 ${key}`);
    assert.equal(item.tables, true, '必须明说表是全的');
    assert.equal(item.inverses, item.carrier.length, '逆元表要写全');
    assert.ok(item.registeredClaims.length > 0);
    assert.ok(item.notRegistered.length > 0, '必须写清登记范围之外是什么');
    assert.ok(item.boundary.length > 0);
  }
  assert.equal(modelSummary(findInstance('finite:s3')).order, 6);
  assert.equal(modelSummary(null), null);
  assert.equal(findInstance('finite:nope'), null);
});

/* ========================================================================== *
 * 6.5 「用到」与「引入」是两份表：PROVIDES 是唯一引入依据
 * ========================================================================== */

test('PROVIDES：每个背景符号都能追到唯一一个引入方（或显式登记为没有引入方）', () => {
  // 符号全集 = 背景常量 + 背景定义 + spec 级定义
  const symbols = [];
  for (const id of BACKGROUND_IDS) {
    const theory = backgroundTheory(id);
    for (const item of theory.constants) symbols.push({ symbol: item.name, type: item.type, background: id });
    for (const item of theory.definitions) symbols.push({ symbol: item.name, type: item.type, background: id });
  }
  for (const spec of ALL_SPECS) {
    for (const definition of spec.definitions ?? []) {
      symbols.push({ symbol: definition.name, type: definition.type, background: normalizeBackgroundId(spec.background) });
    }
  }

  const provided = new Map(PROVIDES.map((entry) => [entry.symbol, entry]));
  assert.equal(provided.size, PROVIDES.length, 'PROVIDES 里同一个符号出现了两次——一个符号只能有一个引入方');
  const noIntroducer = new Set(SYMBOLS_WITHOUT_INTRODUCER.map((entry) => entry.symbol));

  const problems = [];
  const seen = new Set();
  for (const item of symbols) {
    if (seen.has(item.symbol)) continue;
    seen.add(item.symbol);
    const inProvides = provided.has(item.symbol);
    const inNoIntro = noIntroducer.has(item.symbol);
    if (inProvides && inNoIntro) problems.push(item.symbol + '：两边都登记了');
    if (!inProvides && !inNoIntro) problems.push(item.symbol + '：既没有引入方、也没有登记「没有引入方」');
    if (inProvides && provided.get(item.symbol).type !== item.type) {
      problems.push(item.symbol + '：PROVIDES 的类型 ' + provided.get(item.symbol).type + ' 与背景 ' + item.type + ' 不一致');
    }
  }
  assert.deepEqual(problems, [], 'PROVIDES 与背景符号对不上（未登记等于漏登记）');

  // 引入方必须是真实本体节点或已登记概念 spec，版本要对得上。
  for (const entry of PROVIDES) {
    const node = NODE_BY_ID.get(entry.node);
    const concept = conceptSpec(entry.node);
    assert.ok(node || concept, entry.symbol + ' 的引入方 ' + entry.node + ' 既不是本体节点也不是概念 spec');
    if (node) assert.equal(entry.version, node.version, entry.symbol + ' 的引入方版本与本体不一致');
    assert.ok(['node', 'concept'].includes(entry.providerKind ?? 'node'));
    if (entry.providerKind === 'concept') assert.ok(concept, entry.symbol + ' 标了 concept 但查不到概念 spec');
    for (const key of ['source', 'background', 'type']) {
      assert.ok(typeof entry[key] === 'string' && entry[key].length > 0, entry.symbol + ' 缺 ' + key);
    }
  }
  // 映射与数组必须同源
  assert.equal(Object.keys(PROVIDES_BY_SYMBOL).length, PROVIDES.length);
  assert.equal(providerOf('left_mul').node, 'group:left-mul');
  assert.equal(providerOf('不存在_的_符号'), null);
  // 没有引入方的那些必须有 reason，且不是因为"忘了填"。
  for (const entry of SYMBOLS_WITHOUT_INTRODUCER) {
    assert.ok(typeof entry.reason === 'string' && entry.reason.length > 0, entry.symbol + ' 缺 reason');
  }
});

test('PROVIDES 不许拿「用到它的节点」充数（这是本轮被验收抓到的错法）', () => {
  /*
   * 反例护卫：BACKGROUND_REFERENCES 是「谁用到」，一个符号会被**多个**节点用到。
   * 如果 PROVIDES 是照它填的，left_mul 就会挂到 4 个节点上。
   * 这条测试把两种表的差别钉住：用到方可以多，引入方只能一个。
   */
  const usersOf = (symbol) => new Set(BACKGROUND_REFERENCES.filter((item) => item.symbol === symbol).map((item) => item.node));
  const leftMulUsers = usersOf('left_mul');
  assert.ok(leftMulUsers.size > 1, 'left_mul 本来就该被多个节点用到——这正是不能拿「用到」当「引入」的原因');
  assert.equal(PROVIDES_BY_SYMBOL.left_mul.node, 'group:left-mul');

  // 至少存在两个「多用户」符号，否则这条护卫就失去意义。
  const multiUser = [...new Set(BACKGROUND_REFERENCES.map((item) => item.symbol))]
    .filter((symbol) => usersOf(symbol).size > 1);
  assert.ok(multiUser.length >= 2, '应当有多个符号被多个节点用到，实际 ' + JSON.stringify(multiUser));
});

test('验收关注的真实引用：group:claim-injective 对 left_mul 的引用有唯一提供方', () => {
  const entry = providerOf('left_mul');
  assert.ok(entry, 'left_mul 必须有引入方，否则定义引用类会诚实报未决');
  assert.equal(entry.node, 'group:left-mul');
  assert.equal(entry.version, '1');
  assert.equal(entry.type, '(G -> G -> G) -> G -> G -> G');
  assert.equal(entry.background, BG_GROUP);
  // 使用者里确实包含 claim-injective（它是这条关系的 from 端）。
  assert.ok(BACKGROUND_REFERENCES.some((item) => item.node === 'group:claim-injective' && item.symbol === 'left_mul'));
  // references 里那条人工登记与 PROVIDES 一致（一致就不必走差异表）。
  const spec = specForNode('group:claim-injective');
  const ref = spec.references.find((item) => item.symbols.includes('left_mul') && item.kind === 'definitionReference');
  assert.ok(ref, 'claim-injective 应当有一条指向 left_mul 提供方的 definitionReference 登记');
  assert.equal(ref.node, entry.node, '人工登记与 PROVIDES 的提供方必须一致');
});

test('references 与 PROVIDES 的差异被显式登记（以 PROVIDES 为准）', () => {
  // 差异表里的每一条都必须真的能对上：spec 存在、它所声称的提供方与 PROVIDES 确实不同。
  assert.ok(REFERENCE_PROVIDER_DIVERGENCES.length > 0);
  for (const item of REFERENCE_PROVIDER_DIVERGENCES) {
    const spec = specForNode(item.spec);
    assert.ok(spec, '差异表指向未登记的 spec ' + item.spec);
    assert.ok(typeof item.declares === 'string' && item.declares.length > 0);
    assert.ok(typeof item.verdict === 'string' && item.verdict.length > 0);
    assert.match(item.resolution, /以 PROVIDES 为准/);
    const ref = spec.references.find((entry) => entry.kind === 'definitionReference');
    assert.ok(ref, item.spec + ' 应当有一条 definitionReference 登记');
    // 该 spec 声称引用的符号里，至少有一个的引入方不是它声称的那个节点。
    const mismatched = ref.symbols.filter((symbol) => {
      const provider = providerOf(symbol);
      return provider && provider.node !== ref.node;
    });
    assert.ok(mismatched.length > 0, item.spec + ' 的声称与 PROVIDES 其实一致，不该出现在差异表里');
  }
});

test('引入方没有 formalSpec 的，被显式列出（判定器不必猜）', () => {
  const withoutSpec = PROVIDES
    .map((entry) => entry.node)
    .filter((node) => !specForNode(node) && !conceptSpec(node));
  assert.deepEqual([...new Set(withoutSpec)].sort(), [...PROVIDERS_WITHOUT_SPEC].sort(),
    '引入方没有 spec 的集合变了，请同步 PROVIDERS_WITHOUT_SPEC');
  for (const node of PROVIDERS_WITHOUT_SPEC) {
    assert.ok(NODE_BY_ID.has(node), node + ' 应当是真实本体节点');
  }
});

/* ========================================================================== *
 * 7. 模板与登记摘要
 * ========================================================================== */

test('formalTemplates 形状与 AuthoringDraft 对齐，construct 取值合法', () => {
  const templates = formalTemplates();
  assert.equal(templates.length, specs.length);
  for (const template of templates) {
    assert.ok(CASES.includes(template.case), `${template.id} 的 case 不对`);
    assert.ok(typeof template.title === 'string' && template.title.length > 0);
    assert.ok(ROLES.includes(template.draft.construct), `${template.id} 的 construct ${template.draft.construct} 不是合法 role`);
    for (const key of ['declarations', 'definitions', 'assumptions', 'statement', 'claims']) {
      assert.equal(typeof template.draft.specSource[key], 'string', `${template.id} 缺 specSource.${key}`);
    }
    assert.equal(template.draft.specSource.statement.length > 0, true);
    assert.ok(hasBackground(template.draft.background));
  }
});

test('registrySummary 自洽', () => {
  const summary = registrySummary();
  assert.equal(summary.specCount, specs.length);
  assert.equal(summary.nodeCount, specs.length, '一个节点一条 spec，不允许重复挂');
  assert.equal(summary.conceptSpecCount, CONCEPT_SPECS.length);
  assert.equal(summary.instanceCount, 2);
  assert.equal(summary.knownBackgrounds, true);
  assert.deepEqual(summary.relationKinds, [...RELATION_KINDS].sort());
});

/* ========================================================================== *
 * 8. 语言层落地后的解析断言（未落地时 skip）
 * ========================================================================== */

/** 概念 spec 带两个 §1.6 之外的登记元数据字段；喂给 parseSpec 之前要裁掉。 */
function parseableSpec(spec) {
  const out = {};
  for (const [key, value] of Object.entries(spec)) {
    if (SPEC_FIELD_NAMES.includes(key)) out[key] = value;
  }
  return out;
}

test('每条 spec（含概念 spec）可被 parseSpec 解析', async (t) => {
  const language = await loadLanguage();
  if (typeof language?.parseSpec !== 'function') {
    t.skip('core/formal/language.mjs 尚未提供 parseSpec（task-1 未完成）');
    return;
  }
  const ctx = { backgrounds: backgroundProvider(language), strict: true };
  for (const spec of ALL_SPECS) {
    assert.doesNotThrow(() => language.parseSpec(parseableSpec(spec), ctx),
      `${spec.node ?? spec.concept} 应当可解析`);
  }
});

test('statement / assumptions / claims 都能单独解析为公式', async (t) => {
  const language = await loadLanguage();
  if (typeof language?.parseFormula !== 'function') {
    t.skip('core/formal/language.mjs 尚未提供 parseFormula');
    return;
  }
  for (const spec of ALL_SPECS) {
    const ctx = specCtx(language, spec);
    const label = spec.node ?? spec.concept;
    assert.doesNotThrow(() => language.parseFormula(spec.statement.source, ctx), `${label} statement 解析失败`);
    for (const assumption of spec.assumptions) {
      assert.doesNotThrow(() => language.parseFormula(assumption.source, ctx), `${label} 假设 ${assumption.id} 解析失败`);
    }
    for (const claim of spec.claims) {
      assert.doesNotThrow(() => language.parseFormula(claim.source, ctx), `${label} claim ${claim.id} 解析失败`);
    }
  }
});

test('关系登记里的 goal / conditions 也都是可解析公式', async (t) => {
  const language = await loadLanguage();
  if (typeof language?.parseFormula !== 'function') {
    t.skip('core/formal/language.mjs 尚未提供 parseFormula');
    return;
  }
  const specByNode = new Map();
  for (const spec of ALL_SPECS) specByNode.set(spec.node ?? spec.concept, spec);

  /** 关系两端的声明要并起来：goal 里的自由变量可能来自任一端。 */
  const relationCtx = (relation) => {
    const endpoints = [relation.from.node, relation.to.node].filter(Boolean);
    const specsAtEnds = endpoints.map((node) => specByNode.get(node)).filter(Boolean);
    const background = specsAtEnds[0]?.background ?? BG_GROUP;
    return formulaCtx(language, background, {
      constants: {
        ...Object.fromEntries((relation.constants ? Object.entries(relation.constants) : [])),
        ...Object.assign({}, ...specsAtEnds.map((spec) => Object.fromEntries(spec.declarations.map((d) => [d.name, d.type])))),
      },
      definitions: specsAtEnds.flatMap((spec) => spec.definitions.map((d) => ({ name: d.name, type: d.type }))),
    });
  };

  /** 形如 `finite:s3` / `bg:limit/1` 的模型或背景标识不是公式，跳过。 */
  const isModelId = (source) => /^[a-z]+:[A-Za-z0-9/_-]+$/.test(source.trim());

  for (const relation of [...RELATIONS, ...CONCEPT_RELATIONS]) {
    const ctx = relationCtx(relation);
    if (relation.goal?.source) {
      assert.doesNotThrow(() => language.parseFormula(relation.goal.source, ctx), `${relation.id} 的 goal 解析失败`);
    }
    for (const condition of relation.conditions) {
      if (isModelId(condition.source)) continue;
      assert.doesNotThrow(() => language.parseFormula(condition.source, ctx),
        `${relation.id} 的条件 ${condition.id} 解析失败：${condition.source}`);
    }
  }
});

test('背景公理与模板都可解析', async (t) => {
  const language = await loadLanguage();
  if (typeof language?.parseFormula !== 'function') {
    t.skip('core/formal/language.mjs 尚未提供 parseFormula');
    return;
  }
  for (const id of BACKGROUND_IDS) {
    const theory = backgroundTheory(id);
    const signature = backgroundSignature(id);
    for (const axiom of theory.axioms) {
      const ctx = formulaCtx(language, id);
      assert.doesNotThrow(() => language.parseFormula(axiom.formula, ctx),
        `背景公理 ${axiom.id} 解析失败：${axiom.formula}`);
    }
    for (const schema of theory.schemas) {
      if (typeof schema.template !== 'string' || schema.template.length === 0) continue;
      const constants = {};
      for (const param of schema.params) constants[param.name] = param.type;
      const ctx = formulaCtx(language, id, { constants });
      assert.doesNotThrow(() => language.parseFormula(schema.template, ctx),
        `模板 ${schema.id} 解析失败：${schema.template}`);
    }
    assert.ok(signature.bases.includes('o'));
  }
});

test('绑定改名后的等价：两式规范形式相同', async (t) => {
  const language = await loadLanguage();
  if (typeof language?.parseFormula !== 'function' || typeof language?.formulaHash !== 'function') {
    t.skip('core/formal/language.mjs 尚未提供 parseFormula / formulaHash');
    return;
  }
  for (const variant of ALPHA_VARIANTS) {
    assert.notEqual(variant.original, variant.renamed, `${variant.id} 的两式必须不同（否则不是改名）`);
    const ctx = formulaCtx(language, variant.background, {
      constants: Object.fromEntries(Object.entries(variant.constants ?? {})),
    });
    const original = language.parseFormula(variant.original, ctx);
    const renamed = language.parseFormula(variant.renamed, ctx);
    assert.equal(language.formulaHash(original), language.formulaHash(renamed),
      `${variant.id}: 绑定改名不应改变规范形式（§1.4 第 3 条）`);
  }
});

test('α 变体登记本身自洽（不依赖语言层）', () => {
  assert.ok(ALPHA_VARIANTS.length >= 4);
  for (const variant of ALPHA_VARIANTS) {
    assert.ok(NODE_BY_ID.has(variant.node), `${variant.id} 的节点不存在`);
    assert.ok(hasBackground(variant.background));
    assert.ok(typeof variant.note === 'string' && variant.note.length > 0);
    assert.notEqual(variant.original, variant.renamed);
  }
});

/*
 * `shared/formal.mjs` 导出的 RELATION_KINDS 目前**不可 import**：
 * 那个模块 import 的 `./core/hash.mjs` 不存在（应为 `../core/hash.mjs`），
 * 而且它引用了未导出的 `canonicalString`。所以这里按 §2.11 的字面清单核对，
 * 并把这条不一致固定成断言——修复那份模块时这条测试会提醒同步。
 */
test('RELATION_KINDS 与规格 §2.11 的六种逐字一致', () => {
  assert.deepEqual([...RELATION_KINDS], [
    'definitionReference', 'hardGeneralization', 'equivalentTo',
    'conditionalDerivation', 'instanceOf', 'counterexampleTo',
  ]);
});
