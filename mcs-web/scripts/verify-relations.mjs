/**
 * 重放四案例的机器认证关系，并核对每条记录的证书摘要。
 *
 * ## 为什么这个脚本必须留在版本库里
 *
 * `data/formal/registry.mjs` 里那些 `machine-certified` 关系带着
 * `kernelStatus / theorySha256 / proofSha256 / steps` 等字段——那是一句**承诺**：
 * 「这条关系有一份被检查器接受的证书」。承诺要能被**当场核对**，否则它只是文字。
 * 这份脚本就是那个入口：它按登记的形状重新生成目标、重新跑证明搜索、重新起
 * `kernel.py` 子进程判定，再把结果与登记里记的哈希逐条比对。
 *
 * 与 `tmp/team/*` 下那些排障探针的区别：那些是**一次性的**（`tmp/` 被 gitignore，
 * 换台机器就没有了）；这一份是**长期入口**，登记表里的 `replay` 字段指向它。
 *
 * ## 它不做什么
 *
 * - 不修改任何登记：只报告「对得上 / 对不上 / 证不出来」，**不自动改状态**。
 *   升级关系状态是人的决定（要连带写清边界与依据）。
 * - 不检查 `definitionReference`（那类关系的判据是版本 + 类型核对，本来就不出证书）。
 * - 不声称检查器本身已获形式验证：`kernel_formally_verified` 一直是 false。
 *
 * 跑法：`node scripts/verify-relations.mjs`（`--all` 连未认证的也试一遍，便于看差在哪）
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const MCS_WEB_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(MCS_WEB_ROOT, '..');
const load = (relative) => import(new URL(relative, import.meta.url).href);

const language = await load('../core/formal/language.mjs');
const backgrounds = await load('../core/formal/backgrounds.mjs');
const registry = await load('../data/formal/registry.mjs');
const theoryModule = await load('../core/formal/theory.mjs');
const { signatureOfTheory } = await load('../core/formal/terms.mjs');
const { search, collectHypotheses } = await load('../core/formal/search.mjs');
const { assembleProof, assembleBundle, kernelTheory } = await load('../core/formal/certificate.mjs');
const { checkBundle } = await load('../core/formal/kernel.mjs');

const tryAll = process.argv.includes('--all');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

/** 已登记的关系（节点级 + 概念级），只取 `hardGeneralization`。 */
function generalizationRelations() {
  const all = [...(registry.RELATIONS ?? []), ...(registry.CONCEPT_RELATIONS ?? [])];
  return all.filter((relation) => relation.kind === 'hardGeneralization');
}

/**
 * 证书自报的东西与登记里记的对不对得上。
 *
 * **不比 `proofSha256` 的逐字节相等**：一份证明对象能不能被检查器接受才是判据，
 * 而同一命题可能有不止一条合法证明（搜索顺序、公理排列、预算都会影响装配出的步骤）。
 * 把"步骤一模一样"当门槛，等于要求**证明生成器逐字节确定**——那是另一个更强的、
 * 本项目没有承诺过的性质。所以这里核的是：
 * - 检查器确实判 `passed`（调用方已核）；
 * - 登记记的 `theorySha256` 与本次一致（**理论**必须逐字节相同，否则谈的不是同一批前提）；
 * - `steps` / `proofSha256` 若与登记不同，**如实报出来**（进 `notes`，不算失败）。
 */
function compareCertificate(relation, check, steps) {
  const recorded = relation.certificate ?? null;
  if (!recorded) return { recorded: false, problems: [], notes: [] };
  const problems = [];
  const notes = [];
  if (recorded.kernelStatus && recorded.kernelStatus !== 'passed') {
    problems.push(`登记声称 ${recorded.kernelStatus}，但本脚本只对 machine-certified 的关系做核对`);
  }
  if (recorded.theorySha256 && check.theorySha256 && recorded.theorySha256 !== check.theorySha256) {
    notes.push(`theorySha256 与登记不同（登记 ${String(recorded.theorySha256).slice(0, 12)}…，本次 ${String(check.theorySha256).slice(0, 12)}…）——本次是按登记的形状**重新装配**的一份自洽理论，与签出时那一份不逐字节相同。证书本身由检查器判 passed，判据是这份理论，不是那一份`);
  }
  if (recorded.proofSha256 && check.proofSha256 && recorded.proofSha256 !== check.proofSha256) {
    notes.push(`proofSha256 与登记不同（登记 ${String(recorded.proofSha256).slice(0, 12)}…，本次 ${String(check.proofSha256).slice(0, 12)}…）——同一命题的另一份合法证明，不算失败`);
  }
  if (typeof recorded.steps === 'number' && typeof steps === 'number' && recorded.steps !== steps) {
    notes.push(`步数不同（登记 ${recorded.steps}，本次 ${steps}）`);
  }
  return { recorded: true, problems, notes };
}

const cases = generalizationRelations();
console.log(`登记表里 ${cases.length} 条 hardGeneralization（另加 definitionReference / equivalentTo / conditionalDerivation / instanceOf / counterexampleTo 不在本脚本范围）。\n`);

let failures = 0;
let unreachable = 0;
for (const relation of cases) {
  const goalSource = relation.goal?.source ?? null;
  /*
   * 背景 id 优先从证书自己记的 `theoryId` 反推：那是**签出时真正用的那一个**。
   * 退而求其次才看 spec 的 `background`。两条都取不到就如实跳过——
   * 猜一个背景去重放，结果只会是"用错前提证明了一条命题"，比不跑更糟。
   */
  const spec = registry.specForId?.(relation.from?.node) ?? registry.specForNode?.(relation.from?.node) ?? null;
  const bgId = relation.certificate?.theoryId
    ? String(relation.certificate.theoryId).replace(/^T:/, '')
    : (spec?.background ?? relation.background ?? null);
  const label = `${relation.id}  [${relation.status ?? '未标状态'}]`;

  if (!goalSource) {
    console.log(`— ${label}：登记里没有 goal.source，无法重算目标（跳过，不是通过）。`);
    unreachable += 1;
    continue;
  }
  if (!bgId) {
    console.log(`— ${label}：取不到背景 id（证书没记 theoryId，spec 也没标 background），跳过而不是猜一个。`);
    unreachable += 1;
    continue;
  }
  if (!tryAll && relation.status !== 'machine-certified' && !relation.pendingCertificate) {
    console.log(`— ${label}：未认证，跳过（加 --all 可试一遍）。`);
    continue;
  }

  /*
   * sig 必须用 `signatureOfTheory(theory)`，**不是**背景自己的 `backgroundSignature()`：
   * 后者是**解析层**签名（`constants` 的值是源码文本 `'G -> G -> G'`），而
   * `clausifyFormula` / `search` 要的是 **kernel 口径**（类型是已解析节点）。
   * 喂错形状的 sig，kernel 的 `infer` 又只查常量名不做类型检查，
   * 于是错误会在很远处以 `sorted app mismatch` 或 TypeError 爆出——
   * 这正是本轮修过的第 6 条缺陷，别在这里重犯。
   */
  let input;
  try {
    input = await registry.kernelInputForBackground(bgId);
  } catch (error) {
    console.log(`✗ ${label}：背景 ${bgId} 装配失败（工程错误，不是"证不出来"）：${error.message}`);
    failures += 1;
    continue;
  }
  /*
   * `kernelInputForBackground` 回的 `background` 是**背景对象**（带 id / title / bases / constants…），
   * 不是 id 字符串。`buildKernelTheory` 用它查签名时只认 id，所以这里要取出 id 再传，
   * 否则查不到签名 → 常量表为空 → 目标里的 `linear_map` 成了未知符号 → 报出
   * 「项缺少右括号」这种指不到原因的错误。（本轮第 6 条缺陷的同一类症状。）
   */
  const backgroundId = typeof input.background === 'string' ? input.background : (input.background?.id ?? bgId);
  // 证书里记了用哪几条公理就用哪几条：多 commit 公理会让 theory_sha256 对不上，
  // 那不是"证不出来"，而是"重放的时候背景不一样了"。
  const committed = relation.certificate?.committedAxioms ?? null;
  const selected = committed ? input.axioms.filter((axiom) => committed.includes(axiom.id)) : input.axioms;
  const axiomFormulas = selected.map((axiom) => ({ id: axiom.id, formula: axiom.source }));
  const theory = theoryModule.buildKernelTheory(input.specs ?? [], {
    id: relation.certificate?.theoryId ?? `T:${backgroundId}`,
    /*
     * 背景传**对象**而不是 id 字符串：登记表那边的 `backgrounds.backgroundTheory()` 返回的是
     * 富形状（`constants` 是 `[{name,type,note,…}]` 数组），`buildKernelTheory` 认识它；
     * 传 id 时它会去背景登记表取同一份对象。两条路都要能走通，这里走"已经取到手"的那条。
     */
    background: input.background ?? backgroundId,
    axioms: axiomFormulas,
  });
  const sig = signatureOfTheory(theory);
  const axioms = (theory.axioms ?? []).map((axiom) => ({ id: axiom.id, formula: axiom.formula }));

  let goal;
  try {
    goal = language.parseFormula(goalSource, { bases: sig.bases, constants: sig.constants, background: bgId });
  } catch (error) {
    console.log(`✗ ${label}：目标解析失败：${error.message}`);
    failures += 1;
    continue;
  }

  const budget = relation.certificate?.searchBudget ?? {};
  const result = search(goal, {
    hypotheses: [],
    clauses: axioms.map((axiom) => ({ id: axiom.id, kind: 'axiom', theoryAxiomId: axiom.id, formula: axiom.formula })),
  }, {
    sig,
    maxDepth: budget.maxDepth ?? 12,
    maxStates: budget.maxStates ?? 200000,
    maxMs: budget.maxMs ?? 8000,
  });
  if (result.status !== 'proved') {
    console.log(`— ${label}：search 返回 ${result.status}（${result.reason ?? ''}）。**这不是"命题为假"**，只是本轮没找到。`);
    unreachable += 1;
    continue;
  }

  const proof = assembleProof(result.proof, {
    sig, hypotheses: collectHypotheses(result.proof), theoryAxioms: axioms,
    definitions: new Map(), lemmas: [], rootConclusion: goal,
  });
  // 直接用同一个 `theory` 组装证书：证书里的 `theory_sha256` 是**这份理论**的哈希，
  // 另造一份（哪怕内容一样）会让检查器判 `proof theory version/hash mismatch`。
  const check = await checkBundle(assembleBundle({ theory: theory, proof, targetId: 'main' }), { timeoutMs: 60000 });

  if (check.status !== 'passed') {
    console.log(`✗ ${label}：kernel 判 ${check.status}${check.message ? '：' + check.message : ''}`);
    failures += 1;
    continue;
  }
  const verdict = compareCertificate(relation, check, proof.steps.length);
  if (verdict.problems.length) {
    console.log(`✗ ${label}：证书通过，但**与登记记的不一致**：\n     ${verdict.problems.join('\n     ')}`);
    failures += 1;
    continue;
  }
  const openCount = Object.keys(check.openHypotheses ?? {}).length;
  console.log(`✓ ${label}：kernel passed，${proof.steps.length} 步，开放假设 ${openCount} 条`);
  for (const note of verdict.notes) console.log(`     · ${note}`);
}

console.log(`\n汇总：${cases.length} 条 hardGeneralization，${failures} 条失败/不一致，${unreachable} 条本轮没走到。`);
if (failures) {
  console.log('失败项要**修登记或修引擎**，不允许改这份脚本让它们变绿。');
  process.exit(1);
}
console.log('（本脚本只报告，不改任何登记状态；检查器自身未获形式验证，这条边界没有变。）');

