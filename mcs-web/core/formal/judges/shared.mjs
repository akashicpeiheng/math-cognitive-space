/**
 * 六类判定器的公共零件。
 *
 * ## 为什么判定器要「依赖注入」
 *
 * 判定器要用的东西分成两类：
 * - **登记数据**（节点、形式表达、有限对象）——查表就有；
 * - **引擎**（证明搜索、证书装配、检查器、有限求值）——由别人实现。
 *
 * 第二类全部经 `deps` 传入，模块本身不 import 任何引擎。这样判定器的**候选生成**
 * 可以独立测试（只吃登记数据），而**确认**在没有引擎时如实返回 `unsupported`
 * ——不是「断言成立」，也不是「断言不成立」，而是「本轮拿不出判定」。
 */

import { sha256 } from '../../hash.mjs';

/**
 * 给概念级 spec 补一个**稳定 id**。
 *
 * `CONCEPT_SPECS` 的条目没有 `node`（它不是节点），端点写的是 `concept:group:abelian`。
 * 判定器与 `ctx.specs` 都按 id 查表，所以这里按 `node ?? concept ?? anchor` 补齐——
 * 与登记表 `specForId()` 的口径一致。补的是**副本**，不改登记表本身。
 */
export function withStableNodeId(spec) {
  if (!spec || typeof spec !== 'object') return spec;
  if (typeof spec.node === 'string' && spec.node) return spec;
  const id = spec.concept ?? spec.anchor ?? null;
  return id ? { ...spec, node: id } : spec;
}

/** 从 ctx 里取形式表达清单：`ctx.specs` 优先，其次登记表的 `specs` + `CONCEPT_SPECS`。 */
export function listSpecs(ctx = {}) {
  if (Array.isArray(ctx.specs) && ctx.specs.length) {
    return ctx.specs.map(withStableNodeId).filter((spec) => typeof spec?.node === 'string');
  }
  const registry = ctx.registry ?? null;
  const declared = typeof registry?.list === 'function' ? registry.list() : null;
  const raw = declared ?? [
    ...(Array.isArray(registry?.specs) ? registry.specs : []),
    ...(Array.isArray(registry?.CONCEPT_SPECS) ? registry.CONCEPT_SPECS : []),
  ];
  return (Array.isArray(raw) ? raw : []).map(withStableNodeId).filter((spec) => typeof spec?.node === 'string');
}

/** 按 id 找 spec：节点 id、概念 id、anchor 都算（登记表里三者都出现过）。 */
export function specForId(ctx = {}, id) {
  if (typeof id !== 'string' || !id) return null;
  return listSpecs(ctx).find((spec) => spec.node === id || spec.concept === id || spec.anchor === id) ?? null;
}

/**
 * 解析判定器自己拼出来的目标源码。
 *
 * 目标**必须是认证公式**：`search` 收到字符串会把它当对象项、再包一层 `B(·)`，
 * 于是报 `invalid certification term`——看起来"跑了"，其实一步都没走。
 * 所以判定器一律先解析、再交给搜索。
 */
export function parseGoal(source, ctx = {}) {
  const language = ctx.deps?.language ?? ctx.language ?? null;
  if (typeof source !== 'string' || !source.trim()) throw new Error('目标源码为空');
  if (typeof language?.parseFormula !== 'function') throw new Error('语言层未装配：无法把目标源码解析成认证公式');
  return language.parseFormula(source, ctx.parseCtx ?? { bases: ctx.sig?.bases ?? [], constants: ctx.sig?.constants ?? {}, strict: false });
}

/**
 * 搜索程序：`{ hypotheses, clauses }`（§2.8）。
 *
 * `ctx.clauses` 里既有背景条目（公理、定义），也有各 spec 的**局部假设**。
 * 这里只取背景那两类：局部假设必须由每个候选自己带进来——把别的 spec 的假设
 * 也塞进程序，会让「特殊 ⇒ 一般」在无关条件下被"证"出来。
 */
export function programFor(ctx = {}, hypotheses = []) {
  const clauses = (ctx.clauses ?? []).filter((entry) => entry && (entry.kind === 'axiom' || entry.kind === 'definition'));
  return { hypotheses, clauses: clauses.map((entry) => ({ ...entry })) };
}

/** 假设条目：把 spec 的 assumptions 变成程序里的 hypothesis。 */
export function hypothesesFor(spec, ctx = {}) {
  const out = [];
  for (const item of spec?.assumptions ?? []) {
    if (typeof item?.source !== 'string') continue;
    try {
      out.push({ id: String(item.id ?? `H${out.length + 1}`), formula: parseGoal(item.source, ctx) });
    } catch {
      // 局部假设解析不了就不进程序：宁可不带它，也不带一条解析失败的式子。
    }
  }
  return out;
}

/**
 * 启发式候选的目标源码：`∀(参数:类型)…. 一端 ⇒ 另一端`。
 *
 * 参数类型从 `ctx.variables`（登记表里全部 spec 的声明）取。**取不到类型就不生成**：
 * 一条 `∀aa. …`（没有类型注释）在解析期就会失败，而失败原因是「没装配」而不是
 * 「这条关系不成立」——那正是最该避免的那类假未决。
 */
export function openGoalSource(left, right, ctx = {}, { arrow = '⇒' } = {}) {
  const params = specParams(left);
  for (const param of params) {
    if (!param.name) return null;
    const type = ctx.variables?.[param.name];
    if (!type) return null;
  }
  const types = {
    // 类型节点 → 源码文本：解析器要的是带注释的绑定，而不是类型节点对象。
    text: (node) => {
      try { return ctx.deps?.language?.typeToString?.(node) ?? String(node); } catch { return String(node); }
    },
  };
  const binders = params.map((param) => `(${param.name}:${types.text(ctx.variables[param.name])})`).join('');
  return `∀${binders}. ${statementSource(left)} ${arrow} ${statementSource(right)}`;
}

/**
 * 从搜索出来的证明里补齐**全部**假设声明。
 *
 * 只把调用方给的假设表递给 `assembleProof` 是不够的：搜索为了证 `A ⇒ B` 会自己
 * assume 一个前提（label 由它生成，如 `h1`），`ex_e` 也会引入。缺了这些，
 * 装配会以「assume 引用了未声明的假设标签」失败——那不是数学问题，是装配漏项。
 * `search.collectHypotheses` 正是为此导出的；拿不到它就退回种子表。
 */
export function hypothesesFromProof(ctx = {}, proof, seed = new Map()) {
  const collect = ctx.deps?.searchModule?.collectHypotheses ?? null;
  if (typeof collect !== 'function' || !proof) return seed;
  try {
    return collect(proof, seed, new Set());
  } catch {
    return seed;
  }
}

/* ------------------------------------------------- 证书装配的公共上下文 */
/**
 * `assembleProof` / `assembleBundle` 需要的完整 ctx。
 *
 * 三样东西容易漏，漏了 `theorem` 规则一定失败：
 * - `theorySha256`：`theorem` 步骤的 reference 里要写它，且必须与 bundle 的 `theory_sha256` 相同；
 * - `proofDigests`：引理证明的摘要（同一 bundle 里必须真有那份 proof）；
 * - `lemmas`：**闭合**过的引理（开放假设非空的引理进不来，kernel 会拒）。
 */
export function certificateContext(ctx = {}, hypotheses = new Map()) {
  const engine = ctx.deps ?? {};
  const theory = ctx.theory ?? null;
  const theorySha256 = theory
    ? (typeof engine.codec?.digest === 'function' ? engine.codec.digest(theory)
      : (typeof engine.theory?.theoryDigest === 'function' ? engine.theory.theoryDigest(theory) : null))
    : null;
  const lemmas = Array.isArray(ctx.lemmas) ? ctx.lemmas : [];
  const proofDigests = new Map();
  for (const lemma of lemmas) {
    if (!lemma?.proof || !lemma?.proofId) continue;
    const certificate = engine.certificate;
    if (typeof certificate?.proofDigest !== 'function' || typeof certificate?.assembleBundle !== 'function') continue;
    /*
     * 摘要要算在**打包后**的那份证明上。
     *
     * `theorem` 步骤让内核比对 `reference.proof_sha256` 与 bundle 里那份 proof 的摘要，
     * 而 bundle 里的 proof 已经被 `assembleBundle` 填过 `checker` / `theory_sha256`。
     * 拿未填的原始证明去算，摘要必然对不上——所以这里用**同一个函数**先打一次包再取摘要。
     */
    const packed = certificate.assembleBundle({ theory: ctx.theory, proof: lemma.proof, targetId: lemma.proofId });
    const filled = packed?.proofs?.[lemma.proofId];
    const digest = filled ? certificate.proofDigest(filled) : null;
    if (digest) proofDigests.set(lemma.proofId, digest);
  }
  return {
    sig: ctx.sig ?? null,
    hypotheses,
    theoryAxioms: ctx.theoryAxioms ?? [],
    definitions: ctx.definitions ?? new Map(),
    lemmas,
    theorySha256,
    proofDigests,
  };
}

/**
 * 打包 bundle：把主证明与**引理证明**放进同一个 `proofs`。
 *
 * `theorem` 规则要求同一 bundle 里存在被引用那份 proof、且 `proof_sha256` 对得上；
 * 只装主证明的话，检查器会说引理不存在。
 */
export function bundleFor(ctx = {}, mainProof) {
  const engine = ctx.deps ?? {};
  const certificate = engine.certificate;
  if (typeof certificate?.assembleBundle !== 'function') throw new Error('证书层未装配：assembleBundle 不可用');
  const bundle = certificate.assembleBundle({ theory: ctx.theory, proof: mainProof, targetId: 'main' });
  /*
   * 只装**这份证明真的引用到**的引理证明。
   *
   * 一个 bundle 只有一份理论。把手里所有引理都塞进去，会让另一套背景的证明
   * （比如限案例的证书用到基类型 `R`）在本背景下被检查，于是报
   * `undeclared base type: R`——看起来像证明错了，其实是「不相关的材料被一起送检」。
   */
  const needed = new Set();
  for (const step of mainProof?.steps ?? []) {
    const id = step?.reference?.id;
    if (typeof id === 'string') needed.add(id);
  }
  for (const lemma of Array.isArray(ctx.lemmas) ? ctx.lemmas : []) {
    if (!lemma?.proof || !lemma?.proofId || !needed.has(lemma.proofId)) continue;
    const extra = certificate.assembleBundle({ theory: ctx.theory, proof: lemma.proof, targetId: lemma.proofId });
    Object.assign(bundle.proofs, extra.proofs);
  }
  return bundle;
}

export function specVersion(spec) {
  return String(spec?.nodeVersion ?? spec?.theoryVersion ?? '1');
}

/** 一个 spec 里出现过的全部表达式源码（用于找已登记符号）。 */
export function specSources(spec) {
  const out = [];
  const push = (value) => { if (typeof value === 'string' && value.trim()) out.push(value); };
  push(spec?.statement?.source);
  for (const item of spec?.assumptions ?? []) push(item?.source);
  for (const item of spec?.claims ?? []) push(item?.source);
  for (const item of spec?.definitions ?? []) push(item?.source);
  return out;
}

const IDENT = /[A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5']*/g;
/** 极简标识符切分：够找出「表达式里出现的名字」。真正的词法归 `core/formal/language.mjs`。 */
export function tokenize(source) {
  return String(source ?? '').match(IDENT) ?? [];
}

/**
 * 概念参数：**全部** `declarations`，按声明顺序。
 *
 * ## 为什么不是「只取 element/object 角色」
 *
 * 早先这里只挑 `role === 'element'`（没有就退到 `'object'`），于是 `mul0 : G -> G -> G`
 * 这种**函数角色**的参数被漏掉，启发式拼出来的全称目标是**欠量化**的：
 *
 * ```
 * 实际：∀(e0:G). abelian_group(mul0)(e0)(inv0) ⇒ group_concept(mul0)(e0)(inv0)   // mul0/inv0 仍自由
 * 应为：∀(mm:G->G->G)(ee:G)(ii:G->G). abelian_group(mm)(ee)(ii) ⇒ group_concept(mm)(ee)(ii)
 * ```
 *
 * 后果不是"报错"，而是搜索在一个带自由变量的命题上白烧预算（实测 depth 12 打满仍 `undecided`），
 * 而**看起来**像"这条关系证不出来"。判定器的语义参数就是"这条陈述的自由参数"，与角色无关——
 * 角色是给人读的分类，不该决定量词包住谁。
 */
export function specParams(spec) {
  const declarations = Array.isArray(spec?.declarations) ? spec.declarations : [];
  return declarations
    .filter((item) => item && typeof item.name === 'string' && item.name)
    .map((item) => ({ name: item.name, type: String(item.type ?? ''), role: item.role ?? null }));
}

export function paramSignature(spec) {
  return specParams(spec).map((item) => item.type).join('|');
}

export function statementSource(spec) {
  return typeof spec?.statement?.source === 'string' ? spec.statement.source : null;
}

/** 精确条件清单：假设 + 定义，原样带上源码，另给一句读法。 */
export function conditionsOf(spec, { readable = null } = {}) {
  const out = [];
  for (const item of spec?.assumptions ?? []) {
    if (typeof item?.source !== 'string') continue;
    out.push({ id: String(item.id ?? `A${out.length + 1}`), source: item.source, readable: `${readable?.assumptions ?? '假设'}：${item.source}` });
  }
  return out;
}

/** 稳定的候选 id：同一对端点与同一目标必得同一个 id（重放时才对得上）。 */
export function candidateId(kind, parts) {
  return `cand:${kind}:${sha256({ kind, ...parts }).slice(0, 12)}`;
}

export function goalOf(source, { canonical = null } = {}) {
  if (typeof source !== 'string' || !source.trim()) return null;
  return { source, canonical, hash: `sha256:${sha256({ source, canonical })}` };
}

/** 「拿不出判定」的统一形状：既不冒充成立，也不冒充反驳。 */
export function undecided(reason, extra = {}) {
  return { status: 'undecided', reason, ...extra };
}

export function unsupported(reason, extra = {}) {
  return { status: 'unsupported', reason, ...extra };
}

export function refuted(reason, counterexample) {
  return { status: 'refuted', reason, counterexample };
}

export function proved(reason, extra = {}) {
  return { status: 'proved', reason, ...extra };
}

/**
 * 判定器需要的引擎是否齐备。
 *
 * 每类关系要的引擎不同（定义引用不要引擎，实例判定只要有限求值器），
 * 所以清单由调用方给——少一个就返回缺哪个，而不是笼统地说「未装配」。
 */
export function requireDeps(deps, names) {
  const missing = names.filter((name) => !deps?.[name]);
  return missing.length ? `判定器依赖未装配：${missing.join('、')}` : null;
}

/** 限定作用域的说明：证据只在什么范围内算数，界面上要显示的就是这句话。 */
export function scopeNote({ theoryId = null, theoryVersion = null, openHypotheses = [], nodeVersions = {} } = {}) {
  const hypotheses = (openHypotheses ?? []).length ? `开放假设 ${openHypotheses.join('、')}` : '开放假设为空';
  return {
    theoryId, theoryVersion, openHypotheses: openHypotheses ?? [], nodeVersions,
    certificateScope: `理论 ${theoryId ?? '未标注'}@${theoryVersion ?? '?'}；${hypotheses}`,
  };
}

/* ------------------------------------------------------------ 已登记的关系 */

/** 端点对的键：**无序**——方向由 `direction` 说，键只用来去重。 */
export function pairKey(kind, from, to) {
  const ends = [from?.node ?? '', to?.node ?? ''].sort();
  return `${kind}|${ends[0]}|${ends[1]}`;
}

/** 有限对象 id：登记表把它写在 `conditions[].source` 里（`finite:z5-units`）。 */
function modelOf(entry, from) {
  for (const condition of entry?.conditions ?? []) {
    const source = String(condition?.source ?? '').trim();
    if (source.startsWith('finite:')) return source;
  }
  const node = String(from?.node ?? '');
  return node.startsWith('finite:') ? node : null;
}

/**
 * 已登记的关系 → 候选形状（`registry.RELATIONS` + `registry.CONCEPT_RELATIONS`）。
 *
 * **登记表是权威**：这些形状是人逐条对照原稿写下来的，端点、方向、条件、目标都在里面。
 * 判定器的启发式只在登记表没覆盖的端点对上兜底——两条路都生成，就会出现
 * 「同一条关系两份候选」这种迟早对不上的账。
 *
 * 一条健全性检查：`hardGeneralization` 的端点对若同时被登记成 `counterexampleTo`，
 * 说明那条"推广"已经被反例打掉（例如「所有群都交换」），**不能**当泛化候选去证。
 */
export function registeredShapes(ctx = {}, kinds = null, warnings = []) {
  const registry = ctx.registry ?? null;
  const allowed = kinds ? new Set(kinds) : null;
  const relations = [
    ...(Array.isArray(registry?.RELATIONS) ? registry.RELATIONS : []),
    ...(Array.isArray(registry?.CONCEPT_RELATIONS) ? registry.CONCEPT_RELATIONS : []),
  ];
  const refutedPairs = new Set(relations
    .filter((entry) => entry?.kind === 'counterexampleTo')
    .map((entry) => pairKey('hardGeneralization', entry.from, entry.to)));

  const out = [];
  for (const entry of relations) {
    if (!entry || typeof entry !== 'object') continue;
    const kind = entry.kind;
    if (!kind || (allowed && !allowed.has(kind))) continue;
    if (!entry.from?.node || !entry.to?.node) continue;
    if (kind === 'hardGeneralization' && refutedPairs.has(pairKey(kind, entry.from, entry.to))) {
      warnings.push(`跳过已登记的过度推广 ${entry.id ?? ''}：同一对端点已被登记为反例（该陈述有反例，不是泛化）。`);
      continue;
    }
    out.push({
      kind,
      from: { node: entry.from.node, version: String(entry.from.version ?? '1') },
      to: { node: entry.to.node, version: String(entry.to.version ?? '1') },
      direction: entry.direction ?? null,
      conditions: Array.isArray(entry.conditions) ? entry.conditions.map((item) => ({ ...item })) : [],
      goal: entry.goal ? { ...entry.goal, canonical: entry.goal.canonical ?? null, hash: entry.goal.hash ?? null } : null,
      reason: entry.reason ?? '',
      registeredId: entry.id ?? null,
      registeredStatus: entry.status ?? null,
      boundary: entry.boundary ?? [],
      model: modelOf(entry, entry.from),
      authoritative: true,
    });
  }
  return out;
}
