/**
 * 四案例形式表达登记（`data/formal/registry.mjs`）。
 *
 * ## 与 `data/formal-statements.mjs` 的分工（两者互不覆盖）
 *
 * | | `data/formal-statements.mjs` | 本文件 |
 * |---|---|---|
 * | 给谁读 | **人**（`tex` / `reading` / `notation`） | **机器**（`statement.source` 等可解析源串） |
 * | 挂在哪 | 节点对象的 `formalStatement` 字段 | 独立的 `specs` 数组，按 `node` 索引 |
 * | 覆盖 | 14 条挑选过的核心定义 | 四案例各 ≥4 条，共 31 条（limit 8 / manifold 8 / tensor 7 / group 8） |
 *
 * 两份表**不互相写入**：本文件不 import 那份表，也不改它的任何条目。
 * 口径冲突时以原稿 `data/cases/*.md` 为准，并把差异写进 `DIVERGENCES`。
 *
 * ## 一条贯穿全表的纪律
 *
 * **不把待证定理替换成一个已假定为真的符号。**
 * 具体做法有三条，测试逐条核对：
 * 1. 目标命题只出现在 `statement` / `claims`（`role:'target'`）里，
 *    **绝不**出现在 `assumptions` 或背景 `axioms` 里；`statement.source` 也不允许
 *    与任何一条 `assumptions[].source` 逐字相同；
 * 2. 写不成公式的部分（Cayley 的三段义务、最大图册的存在性、Φ 的满射性……）
 *    登记在 `UNEXPANDED_OBLIGATIONS` 里，每条都带**类型、来源、解释范围**，
 *    并且不合成一个"定理符号"；
 * 3. 背景里的原子谓词（`bg:*` 的 `expansion` / `source` / `scope`）与 spec 之间
 *    靠 `BACKGROUND_REFERENCES`（谁**用到**）与 `PROVIDES`（谁**引入**）两份表显式连线，
 *    谁没被展开、谁没有引入方，一眼可见。
 *
 * ## 哈希口径
 *
 * `shared/formal.mjs#formalSpecHash` 目前**不可用**（它 import 的
 * `shared/core/hash.mjs` 不存在，且引用了一个未导出的 `canonicalString`）。
 * 本文件因此自己算：字段子集与那份实现**逐字相同**（见 `specHashInput`），
 * 序列化走 `core/formal/codec.mjs#digest`（与 `kernel.py` 的
 * `json.dumps(..., ensure_ascii=True, separators=(',',':'), sort_keys=True)` 同口径）。
 * 这让 `references[].specHash` 现在就能核对，而不是等语言层落地。
 */

import {
  BG_ALGEBRA, BG_GROUP, BG_LIMIT, BG_MANIFOLD, BG_TENSOR,
  backgroundAxiomsForKernel, backgroundSignature, backgroundTheory, hasBackground, normalizeBackgroundId,
} from '../../core/formal/backgrounds.mjs';
import { REGISTERED_INSTANCES } from './instances.mjs';

/* -------------------------------------------------------------------------- *
 * 0. 哈希后端
 * -------------------------------------------------------------------------- */

/**
 * 哈希口径分两级，**首选** §1.6 字面要求的那一级：
 *
 * 1. `mcs-formal-canonical`：`core/formal/language.mjs#parseSpec` 返回的
 *    `hash`——"规范化表达树的哈希"（每处 source 用 α 规范树参与哈希，
 *    所以绑定改名不改哈希、量词换序改哈希）。这是**首选**，
 *    因为它就是引擎侧 `references[].specHash` 要对着核的那个值。
 * 2. `mcs-formal-source`：语言层不可用时的兜底——按
 *    `shared/formal.mjs#formalSpecHash` 的字段子集（源码串）走
 *    `core/formal/codec.mjs#digest`（与 `kernel.py` 的 json 口径逐字节一致）。
 *
 * 兜底存在的原因：本文件是**数据交付物**，不该因为语言层还在改就不能 import。
 * 两级口径都写进 `HASH_BACKEND`，不静默换算法。
 */
export const HASH_BACKENDS = Object.freeze({
  CANONICAL: 'mcs-formal-canonical',
  SOURCE: 'mcs-formal-source',
});

let canonicalHasher = null;
let sourceDigester = null;
let HASH_BACKEND = HASH_BACKENDS.SOURCE;

/** §1.6 登记的字段表；`parseSpec` 在 strict 下只认这些。 */
const SPEC_FIELDS = new Set([
  'specVersion', 'node', 'nodeVersion', 'background', 'theoryVersion',
  'declarations', 'definitions', 'assumptions', 'statement', 'claims',
  'references', 'boundary', 'source', 'hash',
]);

try {
  const codec = await import('../../core/formal/codec.mjs');
  if (typeof codec.digest === 'function') sourceDigester = codec.digest;
} catch {
  // 见下面的 core/hash.mjs 兜底。
}
if (!sourceDigester) {
  const { sha256 } = await import('../../core/hash.mjs');
  sourceDigester = sha256;
}

try {
  const language = await import('../../core/formal/language.mjs');
  if (typeof language.parseSpec === 'function') {
    /*
     * `ctx.backgrounds` 直接给 `backgroundTheory` 即可：语言层的 `normalizeBackground()`
     * 收两种形状（`bases` 收 `string[]` 或 `[{name,note}]`；`constants` 收
     * `{name: 类型树}` 或富数组 `[{name,type,note,…}]`），所以本模块按 §2.4/目录接口
     * 返回的**富形状**不用再适配一次（2026-10-04 lang-layer 确认并加了回归测试）。
     *
     * 这里仍然只传一个 `{ backgroundTheory }` 包装而不是整个模块命名空间：
     * `parseSpec` 只应该从这里拿背景。
     */
    const ctx = { backgrounds: { backgroundTheory }, strict: true };
    canonicalHasher = (raw) => {
      // parseSpec 在 strict 下拒绝一切未登记字段（§1.6 的字段表里没有 `concept` / `anchor`
      // 这类登记元数据），所以喂进去之前先裁一遍；裁完的形状就是 §1.6。
      const parseable = {};
      for (const [key, value] of Object.entries(raw)) {
        if (SPEC_FIELDS.has(key)) parseable[key] = value;
      }
      return language.parseSpec(parseable, ctx).hash;
    };
    HASH_BACKEND = HASH_BACKENDS.CANONICAL;
  }
} catch {
  // 语言层不可用：保持 source 级口径，HASH_BACKEND 已经写明。
}

export { HASH_BACKEND };

/**
 * 每条 spec 实际用了哪个哈希后端，以及没走规范化口径时的原因。
 *
 * 为什么要这张表：本文件是**数据交付物**，不该因为语言层正在改就 import 不了；
 * 但"某条 spec 解析不过、于是悄悄退回源码级哈希"是必须暴露的事实——
 * 否则 `references[].specHash` 会在两套口径之间漂移。
 * 测试里有一条断言：语言层可用时，这张表里不允许出现 `mcs-formal-source`。
 */
const HASH_BACKEND_BY_NODE = new Map();
const PARSE_PROBLEMS = new Map();

/** spec 的登记键：有节点用节点 id，概念 spec 用 `concept:` 标识。 */
function registryKey(spec) {
  return spec.node ?? spec.concept ?? '<anonymous>';
}

/** 按当前后端算一条 spec 的哈希：`sha256:<hex>`。 */
export function specHash(spec) {
  const key = registryKey(spec);
  if (canonicalHasher) {
    try {
      const hash = canonicalHasher(spec);
      HASH_BACKEND_BY_NODE.set(key, HASH_BACKENDS.CANONICAL);
      return hash;
    } catch (error) {
      HASH_BACKEND_BY_NODE.set(key, HASH_BACKENDS.SOURCE);
      PARSE_PROBLEMS.set(key, error?.message ?? String(error));
    }
  } else {
    HASH_BACKEND_BY_NODE.set(key, HASH_BACKENDS.SOURCE);
    PARSE_PROBLEMS.set(key, 'core/formal/language.mjs#parseSpec 不可用');
  }
  return `sha256:${sourceDigester(specHashInput(spec))}`;
}

/** 每条 spec 的哈希后端：`{ canonical: [...], source: [...] }`。 */
export function hashBackends() {
  const out = { canonical: [], source: [] };
  for (const spec of [...specs, ...CONCEPT_SPECS]) {
    const key = registryKey(spec);
    if (HASH_BACKEND_BY_NODE.get(key) === HASH_BACKENDS.CANONICAL) out.canonical.push(key);
    else out.source.push(key);
  }
  return out;
}

/** 没能走规范化口径的原因：`node → 错误信息`。 */
export function parseProblems() {
  return Object.fromEntries(PARSE_PROBLEMS);
}

/**
 * source 级哈希输入：与 `shared/formal.mjs#formalSpecHash` **逐字相同**的字段子集。
 * `node` / `nodeVersion` / `boundary` / `source` 不进哈希——它们是登记元数据，
 * 改了它们不该让引用的 `specHash` 失效。
 *
 * 只在兜底口径下使用；规范化口径下哈希由 `parseSpec` 自己算。
 */
export function specHashInput(spec) {
  return {
    specVersion: spec.specVersion,
    background: spec.background,
    theoryVersion: spec.theoryVersion,
    declarations: spec.declarations,
    definitions: spec.definitions,
    assumptions: spec.assumptions,
    statement: spec.statement,
    claims: spec.claims,
    references: (spec.references ?? []).map((ref) => ({
      node: ref.node, version: ref.version, specHash: ref.specHash ?? null, kind: ref.kind, symbols: ref.symbols,
    })),
  };
}

/** §1.6 的规范版本号。 */
export const SPEC_VERSION = 'mcs-formal/1';

/** §2.11 的六种关系；与 `shared/formal.mjs#RELATION_KINDS` 同序同值（那份模块当前不可 import）。 */
export const RELATION_KINDS = Object.freeze([
  'definitionReference', 'hardGeneralization', 'equivalentTo',
  'conditionalDerivation', 'instanceOf', 'counterexampleTo',
]);

/* -------------------------------------------------------------------------- *
 * 1. specs —— 30 条形式表达
 * -------------------------------------------------------------------------- */

const RAW_SPECS = [
  /* ======================== 案例 01：极限 ======================== */

  {
    node: 'limit:seq-conv',
    background: BG_LIMIT,
    declarations: [
      { name: 'xx', type: 'N -> R', role: 'function', label: '序列（指标到实数的映射）' },
      { name: 'aa', type: 'R', role: 'object', label: '极限候选' },
    ],
    definitions: [],
    assumptions: [],
    statement: { source: 'seq_conv(xx)(aa)', kind: 'formula' },
    claims: [],
    references: [],
    boundary: [
      '`seq_conv` 是 bg:limit/1 的**原子谓词**：本 spec 不把 ε–N 量词式写成公式（它登记在 expansion 里）。',
      '引用的是符号与类型，**不是**已证明的收敛：本 spec 一条收敛都没认证。',
      '量词次序（N 可依赖 ε、不可依赖 n）与原稿「把 ∀n≥N 读成"每一项"会遗漏有限初始段」都只在文字边界里。',
    ],
    source: '人工登记：对照 data/cases/01-limit.md「序列收敛」（第 11–19 行）的定义式与量词次序段',
  },
  {
    node: 'limit:limit-ed',
    background: BG_LIMIT,
    declarations: [
      { name: 'ff', type: 'R -> R', role: 'function', label: '定义域上的函数' },
      { name: 'aa', type: 'R', role: 'object', label: '趋近的位置' },
      { name: 'LL', type: 'R', role: 'object', label: '极限候选' },
    ],
    definitions: [],
    assumptions: [],
    statement: { source: 'limit_ed(ff)(aa)(LL)', kind: 'formula' },
    claims: [],
    references: [],
    boundary: [
      '`limit_ed` 是原子谓词：去心条件 0<|x−a|、定义域 D 与聚点概念都**没有**被类型编码（见 expansion 与 scope）。',
      '原稿三条逐条件反例（删去 0<|x−a|、允许 a 为孤立点、交换量词次序）在本 spec 里只作为边界文字保留。',
      '本 spec 不声称任何函数极限存在或唯一。',
    ],
    source: '人工登记：对照 data/cases/01-limit.md「函数极限的 ε–δ 定义」（第 21–33 行）的定义式与逐条件反例段',
  },
  {
    node: 'limit:limit-seq',
    background: BG_LIMIT,
    declarations: [
      { name: 'ff', type: 'R -> R', role: 'function', label: '定义域上的函数' },
      { name: 'aa', type: 'R', role: 'object', label: '趋近的位置' },
      { name: 'LL', type: 'R', role: 'object', label: '极限候选' },
    ],
    definitions: [],
    assumptions: [],
    statement: { source: 'limit_seq(ff)(aa)(LL)', kind: 'formula' },
    claims: [],
    references: [],
    boundary: [
      '`limit_seq` 是原子谓词：它借用的 `seq_conv` 同样是原子的，两层都没有展开。',
      '原稿「只检验一条序列不够；允许 x_n=a 会把 f(a) 拉进条件」保持为边界文字。',
      '反向证明依赖的选择条件登记为独立的 `choice_principle`，只当显式假设用（见 formal:limit:bridge）。',
    ],
    source: '人工登记：对照 data/cases/01-limit.md「序列式极限定义」（第 35–43 行）的定义式与边界段',
  },
  {
    node: 'limit:bridge',
    background: BG_LIMIT,
    declarations: [
      { name: 'ff', type: 'R -> R', role: 'function', label: '定义域上的函数' },
      { name: 'aa', type: 'R', role: 'object', label: '趋近的位置；原稿要求它是聚点' },
      { name: 'LL', type: 'R', role: 'object', label: '极限候选' },
    ],
    definitions: [],
    assumptions: [
      {
        id: 'A1',
        source: 'cluster_point(aa)',
        note: 'a 是定义域的聚点。删去它等价式单侧退化（原稿「条件即反例」）。',
      },
      {
        id: 'A2',
        source: 'choice_principle',
        note: '反向证明用的选择条件（对 δ=1/n 取出反例序列）。删去它，反例序列的存在性停止。',
      },
    ],
    statement: { source: 'limit_ed(ff)(aa)(LL) ⇔ limit_seq(ff)(aa)(LL)', kind: 'formula' },
    claims: [
      {
        id: 'C1',
        source: 'limit_ed(ff)(aa)(LL) ⇔ limit_seq(ff)(aa)(LL)',
        role: 'target',
        note: '目标（未认证）：原稿只给出自然语言证明，机器证书不覆盖它。',
      },
    ],
    references: [
      { node: 'limit:limit-ed', version: '1', kind: 'equivalentTo', symbols: ['limit_ed'] },
      { node: 'limit:limit-seq', version: '1', kind: 'equivalentTo', symbols: ['limit_seq', 'seq_conv'] },
    ],
    boundary: [
      '**未认证**：原稿「两种定义的等价」明言「本页给出完整自然语言证明；机器证书只覆盖其中"常值取值"这一小步」。',
      'A1、A2 是**局部假设**（→ hypotheses），不会进 theory.axioms；它们各自有类型与解释范围（bg:limit/1）。',
      '「证明存在反例序列不等于给出一个可执行算法」——原稿这条边界照录。',
    ],
    source: '人工登记：对照 data/cases/01-limit.md「两种定义的等价」（第 45–53 行）的概括证明、条件即反例与精确边界三段',
  },
  {
    node: 'limit:constant-seq',
    background: BG_LIMIT,
    declarations: [
      { name: 'aa', type: 'R', role: 'object', label: '常值序列取的那个常数，也是极限' },
    ],
    definitions: [],
    assumptions: [
      {
        id: 'A1',
        source: '∀(bb:R)(nn:N). const_seq(bb)(nn) = bb',
        note: '常值取值：每一项都等于 a。它由 formal:limit:claim-eval-constant 认证（无开放假设）。',
      },
    ],
    statement: { source: 'seq_conv(const_seq(aa))(aa)', kind: 'formula' },
    claims: [
      {
        id: 'C1',
        source: 'seq_conv(const_seq(aa))(aa)',
        role: 'target',
        note: '目标（未认证）：还缺 seq_conv 的 ε–N 展开，见 boundary 与 UNEXPANDED_OBLIGATIONS。',
      },
    ],
    references: [
      { node: 'limit:claim-eval-constant', version: '1', kind: 'conditionalDerivation', symbols: ['const_seq'] },
    ],
    boundary: [
      '**不把取值等式说成已证明收敛**：A1 只是 `const_seq` 的取值恒等式；`seq_conv` 是原子谓词，ε–N 展开未编码。',
      '原稿的论证是「取 N=1，|x_n−a|=0<ε，故 x_n→a」——那一步用掉了 seq_conv 的展开，本站没有它。',
      '原稿「否定范围」：这个例子只作用于序列收敛，函数极限的去心条件（x≠a）不被它否定。',
    ],
    source: '人工登记：对照 data/cases/01-limit.md「常值序列」（第 75–83 行）的验证段与否定范围段',
  },
  {
    node: 'limit:claim-eval-constant',
    background: BG_LIMIT,
    declarations: [],
    definitions: [],
    assumptions: [],
    statement: { source: '∀(aa:R)(nn:N). (λ(mm:N). aa)(nn) = aa', kind: 'formula' },
    claims: [
      {
        id: 'C1',
        source: '∀(aa:R)(nn:N). (λ(mm:N). aa)(nn) = aa',
        role: 'derived',
        note: '这一条是原稿点名的**机器认证片段**：展开一次 λ 抽象并把实参代入，没有开放假设。',
      },
    ],
    references: [],
    boundary: [
      'N 与 R 在这份证书里只是排序名：实数度量、序列收敛、ε–δ 与序列定义的桥梁都没编码。',
      '反向证明所需的选择条件也不在这份证书范围内（原稿「机器认证的范围」末句）。',
      '「展示一份证明、检查一份证书、说某人已经掌握，是三件不同的事」——本 spec 只对应第二件。',
    ],
    source: '人工登记：对照 data/cases/01-limit.md「常值取值片段」（第 95–103 行）的公式与范围说明',
  },
  {
    node: 'limit:proof-eval-constant',
    background: BG_LIMIT,
    declarations: [],
    definitions: [],
    assumptions: [],
    statement: { source: '∀(aa:R)(nn:N). (λ(mm:N). aa)(nn) = aa', kind: 'formula' },
    claims: [
      {
        id: 'C1',
        source: '∀(aa:R)(nn:N). (λ(mm:N). aa)(nn) = aa',
        role: 'derived',
        note: '与 formal:limit:claim-eval-constant 同一条命题；本节点登记的是它的**证书状态**。',
      },
    ],
    references: [
      { node: 'limit:claim-eval-constant', version: '1', kind: 'equivalentTo', symbols: ['const_seq'] },
    ],
    boundary: [
      '**检查器本身没有经过形式验证**：原稿明写「不能写成"已机器证明检查器正确"」，本 spec 也不这么写。',
      '「仍缺的义务」照录：实数度量背景、序列收敛、两种极限定义的完整桥梁、反向证明的选择条件、真实学习效果。',
    ],
    source: '人工登记：对照 data/cases/01-limit.md「常值取值证书」（第 105–111 行）的状态与仍缺义务两段',
  },
  {
    node: 'limit:pattern-never-equal',
    background: BG_LIMIT,
    declarations: [],
    definitions: [],
    assumptions: [],
    statement: {
      source: '∀(xx:N -> R)(aa:R). (seq_conv(xx)(aa) ⇒ ∀(nn:N). ¬(xx(nn) = aa))',
      kind: 'formula',
    },
    claims: [
      {
        id: 'C1',
        source: '∃(xx:N -> R)(aa:R)(nn:N). (seq_conv(xx)(aa) ∧ xx(nn) = aa)',
        role: 'target',
        note: '被反驳规则的否定式：反例见证是 xx := const_seq(aa)。',
      },
    ],
    references: [
      { node: 'limit:constant-seq', version: '1', kind: 'counterexampleTo', symbols: ['seq_conv', 'const_seq'] },
    ],
    boundary: [
      '本 spec 登记的是**被反驳的过度推广**，不是定理；`statement` 是要被打掉的规则。',
      '反例的收敛性来自 formal:limit:constant-seq，而那条在本登记里是 `target` 而非已认证结论，'
        + '因此这条反例的机器状态是**未认证**（自然语言论证成立）。',
      '否定范围照录原稿：它不否定函数极限定义中的去心条件，两者量化对象不同。',
    ],
    source: '人工登记：对照 data/cases/01-limit.md「误区：收敛序列各项都不等于极限」（第 121–129 行）的错误规则、反例与否定的范围',
  },

  /* ======================== 案例 02：流形 ======================== */

  {
    node: 'manifold:chart-atlas',
    background: BG_MANIFOLD,
    declarations: [
      { name: 'AA', type: 'Atlas', role: 'object', label: '图册' },
      { name: 'MM', type: 'Set', role: 'object', label: '被覆盖的空间载体' },
    ],
    definitions: [],
    assumptions: [],
    statement: { source: 'is_atlas(AA)(MM)', kind: 'formula' },
    claims: [],
    references: [],
    boundary: [
      '`is_atlas` 与它依赖的 `covers` 都是原子谓词：覆盖条件「每一点至少落在一张图里」没有被写成量词式。',
      '原稿两条边界照录：图册不要求有限、不要求图互不相交；「最大图册」不是"图最多"的任意集合。',
      'Hausdorff、第二可数、维数唯一性都不在本 spec 内。',
    ],
    source: '人工登记：对照 data/cases/02-manifold.md「图、图册与覆盖」（第 11–17 行）的直觉段与边界段',
  },
  {
    node: 'manifold:transition',
    background: BG_MANIFOLD,
    declarations: [
      { name: 'phi', type: 'Chart', role: 'object', label: '第一张图 (U,φ)' },
      { name: 'psi', type: 'Chart', role: 'object', label: '第二张图 (V,ψ)' },
      { name: 'kk', type: 'N', role: 'object', label: '正则性阶数 k' },
    ],
    definitions: [],
    assumptions: [],
    statement: { source: 'is_ck(trans(phi)(psi))(kk)', kind: 'formula' },
    claims: [],
    references: [],
    boundary: [
      '`trans` 是原子常量：不展开为 `comp(inv(phi))(psi)`；定义域 φ(U∩V) 与开集结构都没有被类型编码。',
      'C^k 条件要求**所有有序图对、两个方向**；本 spec 只登记一对一个方向，不声称全部图对已检查。',
      '原稿「同胚不一定自动是 C^k」保持为边界文字。',
    ],
    source: '人工登记：对照 data/cases/02-manifold.md「过渡映射」（第 19–29 行）的复合式、定义域陷阱与反例意识三段',
  },
  {
    node: 'manifold:ck-atlas',
    background: BG_MANIFOLD,
    declarations: [
      { name: 'kk', type: 'N', role: 'object', label: '正则性阶数 k' },
    ],
    definitions: [],
    assumptions: [],
    statement: {
      source: '∀(phi:Chart)(psi:Chart). is_ck(trans(phi)(psi))(kk)',
      kind: 'formula',
    },
    claims: [],
    references: [
      { node: 'manifold:transition', version: '1', kind: 'definitionReference', symbols: ['trans', 'is_ck'] },
    ],
    boundary: [
      '这一条写成了**可解析的展开**（所有有序图对），没有把 `ck_atlas` 当成一个假定的符号。',
      '原稿条件 `k≥1` 未编码：bg:manifold/1 没有实数序结构，因此它只作为文字条件保留。',
      '原稿边界照录：「一个拓扑流形可以有多个互不兼容的 C^k 结构；本站不展开光滑化定理」。',
    ],
    source: '人工登记：对照 data/cases/02-manifold.md「C^k 图册」（第 31–39 行）的条件段与边界段',
  },
  {
    node: 'manifold:smooth-atlas',
    background: BG_MANIFOLD,
    declarations: [],
    definitions: [],
    assumptions: [],
    statement: {
      source: '∀(phi:Chart)(psi:Chart). smooth(trans(phi)(psi))',
      kind: 'formula',
    },
    claims: [],
    references: [
      { node: 'manifold:transition', version: '1', kind: 'definitionReference', symbols: ['trans', 'smooth'] },
    ],
    boundary: [
      '`smooth` 与 `is_ck(·)(k)` **不是同一个条件**：原稿 C¹ 非 C² 的例子专门纠正这一点。',
      '原稿反例 h(x)=x+x|x| 只否定「该图册是 C²」，不证明 R 不能另取光滑图册——本 spec 不含任何底空间存在性结论。',
      '「图册性质与底空间性质必须分开」照录为边界。',
    ],
    source: '人工登记：对照 data/cases/02-manifold.md「光滑图册」（第 41–49 行）的直觉、反例与否定范围三段',
  },
  {
    node: 'manifold:compatible-k',
    background: BG_MANIFOLD,
    declarations: [
      { name: 'AA', type: 'Atlas', role: 'object', label: '第一份图册' },
      { name: 'BB', type: 'Atlas', role: 'object', label: '第二份图册' },
      { name: 'kk', type: 'N', role: 'object', label: '正则性阶数 k' },
    ],
    definitions: [],
    assumptions: [],
    statement: { source: 'compatible_k(AA)(BB)(kk)', kind: 'formula' },
    claims: [],
    references: [],
    boundary: [
      '`compatible_k` 是原子谓词：「并仍是 C^k 图册」没有被展开。',
      '原稿检查清单照录：册内过渡、跨图册过渡、两个方向、全部重叠域；只检查册内过渡会漏掉真正的兼容性问题。',
      '相容关系不是图册相等。',
    ],
    source: '人工登记：对照 data/cases/02-manifold.md「C^k 兼容」（第 51–57 行）的直觉与检查清单两段',
  },
  {
    node: 'manifold:claim-transition-eval',
    background: BG_MANIFOLD,
    declarations: [
      { name: 'cmap', type: 'S -> T', role: 'function', label: '一张已固定图的坐标映射（原稿的 φ）' },
      { name: 'cinv', type: 'T -> S', role: 'function', label: '它的候选右逆（原稿的 φ⁻¹）' },
      { name: 'y0', type: 'T', role: 'object', label: '指定点 y' },
    ],
    definitions: [],
    assumptions: [
      {
        id: 'A1',
        source: '∀(yy:T). cmap(cinv(yy)) = yy',
        note: '指定点的右逆等式（原稿明写「带一个开放假设」）。它是局部假设，不进 theory.axioms。',
      },
    ],
    statement: { source: 'cmap(cinv(y0)) = y0', kind: 'formula' },
    claims: [
      {
        id: 'C1',
        source: 'cmap(cinv(y0)) = y0',
        role: 'derived',
        note: '原稿「机器认证范围」点名的片段；两个排序上的总函数模拟一张已固定图的两个载体。',
      },
    ],
    references: [
      { node: 'manifold:transition', version: '1', kind: 'conditionalDerivation', symbols: ['trans'] },
    ],
    boundary: [
      '原稿「边界」逐条照录：不含开集、限制域、图册、覆盖、正则性、链式法则与最大扩张；这不是整个流形结构已机器认证。',
      '原稿「删条件反例」照录：去掉右逆假设，令 φ 恒为 0、φ⁻¹ 为恒等，在 y=1 处复合值不为 1。',
      'A1 是**开放假设**；证书里它进 hypotheses，不被写进 theory.axioms。',
      /*
       * 改名说明（Lead 2026-10-04 点名的真实冲突）：
       * `manifold:transition` 里的 `phi : Chart` 是**坐标图**，本 spec 的坐标映射是
       * `S -> T` 的**函数**——两处同名不同类型。按 §1.1「同一自由语境里同名异类型必须拒绝」，
       * 一旦把多个 spec 的声明并进同一个类型环境（`buildKernelTheory` 就会这么做，
       * 且它会**明确抛错**而不是静默取一个），这条冲突会让整个背景装配失败。
       * 因此把本 spec 的自由参数改名为 `cmap` / `cinv`（原稿的 φ / φ⁻¹），
       * statement / assumptions / claims / α 变体 / 关系登记同步改名；**原稿文字未改**。
       */
      '**改名记录**：本 spec 的坐标映射登记为 `cmap` / `cinv`（原稿的 φ / φ⁻¹），'
        + '以免与 manifold:transition 的 `phi : Chart` 同名不同类型——'
        + '两者是不同对象（一个是坐标图，一个是排序间的函数），不是同一对象的两种写法。',
    ],
    source: '人工登记：对照 data/cases/02-manifold.md「同图过渡在指定点的取值」（第 99–107 行）的三段',
  },
  {
    node: 'manifold:claim-max',
    background: BG_MANIFOLD,
    declarations: [
      { name: 'AA', type: 'Atlas', role: 'object', label: '起始 C^k 图册' },
      { name: 'kk', type: 'N', role: 'object', label: '正则性阶数 k' },
    ],
    definitions: [],
    assumptions: [],
    statement: {
      source: 'ck_atlas(max_ext(AA))(kk) ∧ maximal_ck(max_ext(AA))(AA)',
      kind: 'formula',
    },
    claims: [
      {
        id: 'C1',
        source: 'ck_atlas(max_ext(AA))(kk) ∧ maximal_ck(max_ext(AA))(AA)',
        role: 'target',
        note: '目标（未认证）：原稿给的是自然语言概括证明，机器证书不覆盖它。',
      },
    ],
    references: [
      { node: 'manifold:ck-atlas', version: '1', kind: 'hardGeneralization', symbols: ['ck_atlas', 'max_ext'] },
    ],
    boundary: [
      '**未认证**：`max_ext` 是原子常量，它的**存在性**都没有被认证；`ck_atlas`、`maximal_ck` 都是原子谓词。',
      '证明结构里依赖的链式法则与 C^k 复合封闭性在 data/cases/background.mjs 的 bg:manifold:calc 中是 background-assumed。',
      '原稿「误解」照录：A_max 的成员关系不等于 A 的成员关系；它也不宣称与 A 无关的另一个结构。',
    ],
    source: '人工登记：对照 data/cases/02-manifold.md「最大 C^k 兼容扩张」（第 59–67 行）与「最大扩张是 C^k 图册且最大」（第 79–87 行）',
  },
  {
    node: 'manifold:claim-generalization',
    background: BG_MANIFOLD,
    declarations: [],
    definitions: [],
    assumptions: [],
    statement: {
      source: '∀(AA:Atlas)(kk:N). (smooth_atlas(AA) ⇒ ck_atlas(AA)(kk))',
      kind: 'formula',
    },
    claims: [
      {
        id: 'C1',
        source: '∀(AA:Atlas)(kk:N). (smooth_atlas(AA) ⇒ ck_atlas(AA)(kk))',
        role: 'target',
        note: '目标（未认证）：原稿的「同载体蕴含」，`ck_atlas` 那一侧是原子谓词。',
      },
    ],
    references: [
      { node: 'manifold:smooth-atlas', version: '1', kind: 'hardGeneralization', symbols: ['smooth_atlas'] },
      { node: 'manifold:ck-atlas', version: '1', kind: 'hardGeneralization', symbols: ['ck_atlas'] },
    ],
    boundary: [
      '**只覆盖同载体蕴含**：原稿明写「在同一图册编码下，P_∞(A) ⇒ P_k(A)」。',
      '跨载体映射（把光滑结构映到最大 C^k 扩张）**不在本 spec 内**：它需要证明不依赖代表图册的选取。',
      '原稿「误解」照录：不能把 P_∞ ⇒ P_k 读成两种结构同一。',
    ],
    source: '人工登记：对照 data/cases/02-manifold.md「光滑图册是 C^k 图册」（第 89–97 行）的同载体蕴含、跨载体映射与误解三段',
  },

  /* ======================== 案例 03：张量 ======================== */

  {
    node: 'tensor:tensor-rs',
    background: BG_TENSOR,
    declarations: [
      { name: 'rr', type: 'N', role: 'object', label: '反变阶数 r' },
      { name: 'ss', type: 'N', role: 'object', label: '协变阶数 s' },
    ],
    definitions: [],
    assumptions: [],
    statement: {
      source: 'ts(vt)(rr)(ss) = tprod(tpow(vt)(rr))(tpow(tstar(vt))(ss))',
      kind: 'formula',
    },
    claims: [],
    references: [],
    boundary: [
      'r、s 有限；**零重张量积约定为基域 F 没有编码**（bg:tensor/1 里没有把 F 当 VS 元素的常量）。',
      '上下指标的顺序按本站登记：先 r 个 V、再 s 个 V*，与 data/formal-statements.mjs#tensor:tensor-rs 的 note 一致。',
      '`ts`、`tpow`、`tprod`、`tstar` 都是原子常量：张量积的通用性质没有被编码。',
    ],
    source: '人工登记：对照 data/cases/03-tensor.md「(r,s) 型张量空间」（第 21–28 行）的定义式与边界段',
  },
  {
    node: 'tensor:multilinear',
    background: BG_TENSOR,
    declarations: [
      { name: 'phi0', type: 'V -> V -> F', role: 'function', label: '二元函数（多重线性的候选）' },
    ],
    definitions: [],
    assumptions: [],
    statement: {
      source: '∀(p0:V)(q0:V)(w0:V). phi0(add(p0)(q0))(w0) = addF(phi0(p0)(w0))(phi0(q0)(w0))',
      kind: 'formula',
    },
    claims: [
      {
        id: 'C1',
        source: 'multilinear(phi0)',
        role: 'target',
        note: '目标（未认证）：多线性比上面那条（只对第一个变量可加）强，本 spec 不声称它成立。',
      },
    ],
    references: [],
    boundary: [
      '**只登记第一个变量的可加性片段**：原稿原话「只对第一个变量线性不足以推出多线性」是本 spec 的核心边界。',
      '`multilinear` 是 bg:tensor/1 的原子谓词，没有展开为「每个变量分别 additive 且标量齐性」。',
      '原稿「与张量的接口」中的「这条对应不是把任意多重函数都叫张量」保持为边界文字。',
    ],
    source: '人工登记：对照 data/cases/03-tensor.md「多重线性函数」（第 30–36 行）的直觉与接口段',
  },
  {
    node: 'tensor:rank1-additive',
    background: BG_TENSOR,
    declarations: [
      { name: 'alpha0', type: 'V -> F', role: 'function', label: '保持加法的线性泛函候选 α' },
      { name: 'v0', type: 'V', role: 'object', label: '固定向量 v' },
    ],
    definitions: [
      {
        name: 'R1',
        type: 'V -> V',
        source: 'λ(z0:V). smul(alpha0(z0))(v0)',
        note: '秩一映射 R(x) = α(x)v 的透明缩写（原稿「令 R(x)=α(x)v」）。',
      },
    ],
    assumptions: [
      {
        id: 'A1',
        source: '∀(p0:V)(q0:V). alpha0(add(p0)(q0)) = addF(alpha0(p0))(alpha0(q0))',
        note: 'α 保持加法（原稿「在 α 保持加法…的声明条件下」）。开放假设。',
      },
      {
        id: 'A2',
        source: '∀(cc:F)(p0:V)(q0:V). smul(cc)(add(p0)(q0)) = add(smul(cc)(p0))(smul(cc)(q0))',
        note: '标量对加法分配。原稿说它是「闭理论公理」，本登记同样在 bg:tensor/1#bg-smul-distributive-add 里登记；此处再列一次是为了让本 spec 自足可读。',
      },
    ],
    statement: {
      source: '∀(x0:V)(y0:V). R1(add(x0)(y0)) = add(R1(x0))(R1(y0))',
      kind: 'formula',
    },
    claims: [
      {
        id: 'C1',
        source: '∀(x0:V)(y0:V). R1(add(x0)(y0)) = add(R1(x0))(R1(y0))',
        role: 'derived',
        note: '原稿「机器认证范围」点名的片段：α 可加 + 标量分配。',
      },
    ],
    references: [],
    boundary: [
      '**不升级为完整线性**：标量齐性没有认证，也没有被假定。',
      '**不等于完整张量同构已认证**（原稿「边界」原话）。',
      '原稿「本片段不需要域的全部公理；其余向量空间公理不被宣称独立必要」照录。',
      '原稿两条删条件反例（删 α 可加性、删标量分配律，都在 F₂ 上）保持为边界文字。',
    ],
    source: '人工登记：对照 data/cases/03-tensor.md「秩一映射保持加法」（第 58–67 行）的认证范围、逐条件反例与边界三段',
  },
  {
    node: 'tensor:proof-rank1-additive',
    background: BG_TENSOR,
    declarations: [
      { name: 'alpha0', type: 'V -> F', role: 'function', label: '保持加法的线性泛函候选 α' },
      { name: 'v0', type: 'V', role: 'object', label: '固定向量 v' },
    ],
    definitions: [
      {
        name: 'R1',
        type: 'V -> V',
        source: 'λ(z0:V). smul(alpha0(z0))(v0)',
        note: '与 formal:tensor:rank1-additive 的 R1 定义逐字相同：两份 spec 可以独立解析，合并时可去重。',
      },
    ],
    assumptions: [
      {
        id: 'A1',
        source: '∀(p0:V)(q0:V). alpha0(add(p0)(q0)) = addF(alpha0(p0))(alpha0(q0))',
        note: '与原稿一致：证书「带一个开放假设：α 保持加法」。',
      },
      {
        id: 'A2',
        source: '∀(cc:F)(p0:V)(q0:V). smul(cc)(add(p0)(q0)) = add(smul(cc)(p0))(smul(cc)(q0))',
        note: '原稿「标量分配律作为闭理论公理」。',
      },
    ],
    statement: {
      source: '∀(x0:V)(y0:V). R1(add(x0)(y0)) = add(R1(x0))(R1(y0))',
      kind: 'formula',
    },
    claims: [
      {
        id: 'C1',
        source: '∀(x0:V)(y0:V). R1(add(x0)(y0)) = add(R1(x0))(R1(y0))',
        role: 'derived',
        note: '与 formal:tensor:rank1-additive 同一条命题；本节点登记的是它的**证书状态**。',
      },
    ],
    references: [
      { node: 'tensor:rank1-additive', version: '1', kind: 'equivalentTo', symbols: ['R1'] },
    ],
    boundary: [
      '「有限域与步数界由检查器给出」照录；本 spec 不重复声明检查器结论。',
      '「剩余义务」照录：标量线性、张量积通用性质、基、有限维双射、丛与截面都未编码。',
    ],
    source: '人工登记：对照 data/cases/03-tensor.md「秩一加法证书」（第 69–75 行）的状态与剩余义务两段',
  },
  {
    node: 'tensor:end-iso',
    background: BG_TENSOR,
    declarations: [
      { name: 'v0', type: 'V', role: 'object', label: '向量 v' },
      { name: 'alpha0', type: 'V -> F', role: 'function', label: '对偶向量 α' },
    ],
    definitions: [],
    assumptions: [],
    statement: {
      source: '∀(w0:V). Phi(tensor_of(v0)(alpha0))(w0) = smul(alpha0(w0))(v0)',
      kind: 'formula',
    },
    claims: [
      {
        id: 'C1',
        source: 'is_iso(Phi)',
        role: 'target',
        note: '目标（未认证）：同构结论需要有限维、基与双射，三者都不在本站背景里。',
      },
    ],
    references: [],
    boundary: [
      '**有限维条件未编码**：`is_iso`、`finite_dim` 都是原子谓词，维数与基没有形式化。',
      '原稿「删条件反例」照录：无限维时代数张量的每个元素都是有限和，像是有限秩算子；恒等算子不在像中。',
      '原稿「Φ 的定义没有选基，基只用于证明双射」保持为边界文字。',
    ],
    source: '人工登记：对照 data/cases/03-tensor.md「张量与线性算子的同构」（第 48–56 行）的定义、证明与删条件反例三段',
  },
  {
    node: 'tensor:infinite-rank',
    background: BG_TENSOR,
    declarations: [],
    definitions: [],
    assumptions: [],
    statement: {
      source: '¬(∀(T0:V -> V). ∃(tt:Vt). Phi(tt) = T0)',
      kind: 'formula',
    },
    claims: [
      {
        id: 'C1',
        source: '¬(∀(T0:V -> V). ∃(tt:Vt). Phi(tt) = T0)',
        role: 'target',
        note: '被反驳的推广的否定式；见证是恒等算子（不是有限秩）。',
      },
    ],
    references: [],
    boundary: [
      '本 spec 登记的是**反例**，不是定理：它是自然语言论证，本站不生成机器证书。',
      '原稿「否定范围」照录：只反驳无限维满射推广；单射与有限维同构不受影响。',
      '「恒等算子不是有限秩」这一条本身没有编码：`finite_dim` 与秩概念都是原子谓词。',
    ],
    source: '人工登记：对照 data/cases/03-tensor.md「无限维恒等算子反例」（第 103–109 行）的反例与否定范围两段',
  },
  {
    node: 'tensor:non-tensor-gamma',
    background: BG_TENSOR,
    declarations: [],
    definitions: [],
    assumptions: [],
    statement: {
      source: '∀(arr:Arr). (indexed(arr) ⇒ transforms_as_tensor(arr))',
      kind: 'formula',
    },
    claims: [
      {
        id: 'C1',
        source: '∃(arr:Arr). (indexed(arr) ∧ ¬transforms_as_tensor(arr))',
        role: 'target',
        note: '被反驳规则「所有指标数组都是张量」的否定式；见证是 Christoffel 系数 Γ。',
      },
    ],
    references: [],
    boundary: [
      '本 spec 登记的是**被反驳的过度推广**，不是定理。',
      '原稿「否定范围」照录：它只反驳"所有带上下指标的数组都是张量"，不否定个别数组确实满足变换律，也不否定更丰富的几何对象。',
      '非齐次项 −1/(2y) 的具体计算没有编码为公式；本 spec 只登记否定范围。',
    ],
    source: '人工登记：对照 data/cases/03-tensor.md「Christoffel 系数不是张量」（第 95–101 行）与「误区：所有指标数组都是张量」（第 119–125 行）',
  },

  /* ======================== 案例 04：群 ======================== */

  {
    node: 'group:group-concept',
    background: BG_GROUP,
    declarations: [
      { name: 'mul0', type: 'G -> G -> G', role: 'function', label: '候选群运算' },
      { name: 'e0', type: 'G', role: 'object', label: '候选单位元' },
      { name: 'inv0', type: 'G -> G', role: 'function', label: '候选逆元映射' },
    ],
    definitions: [],
    assumptions: [],
    statement: { source: 'group_concept(mul0)(e0)(inv0)', kind: 'formula' },
    claims: [],
    references: [],
    boundary: [
      '`group_concept` 是 bg:group/1 的**原子谓词**：结合、单位、逆三条**没有**被展开为公式（它们登记在 schemas 的四条模板里）。',
      '本 spec 是**概念锚点**，不是已认证定理：它既不假定这个三件套构成群，也不否定。',
      '交换律**不在**群定义内：阿贝尔群另有原子谓词 `abelian_group`（原稿逐条件反例段）。',
    ],
    source: '人工登记：对照 data/cases/04-group.md「群」（第 1–9 行）的直觉、动机与逐条件反例段',
  },
  {
    node: 'group:left-mul',
    background: BG_GROUP,
    declarations: [],
    definitions: [],
    assumptions: [
      {
        id: 'A1',
        source: '∀(a0:G)(b0:G)(c0:G). mul(mul(a0)(b0))(c0) = mul(a0)(mul(b0)(c0))',
        note: '结合律（原稿「用结合律验证 L_g∘L_h=L_{gh}」）。开放假设，不进 theory.axioms。',
      },
    ],
    statement: {
      source: '∀(g0:G)(h0:G)(x0:G). left_mul(mul)(g0)(left_mul(mul)(h0)(x0)) = left_mul(mul)(mul(g0)(h0))(x0)',
      kind: 'formula',
    },
    claims: [
      {
        id: 'C1',
        source: '∀(g0:G)(h0:G)(x0:G). left_mul(mul)(g0)(left_mul(mul)(h0)(x0)) = left_mul(mul)(mul(g0)(h0))(x0)',
        role: 'derived',
        note: '复合等式的**逐点形式**：展开 left_mul 后正好是结合律的实例。',
      },
    ],
    references: [],
    boundary: [
      '**只登记复合等式**：原稿「用逆元给出 L_g 的逆 L_{g^{-1}}，从而得到双射」那一段不在这里。',
      '原稿「边界」照录：完整的双射与同态论证依赖完整群公理；机器证书目前只覆盖单射步骤。',
      '`left_mul` 是 bg:group/1 的项级透明缩写（不是新公理），展开规则见 §1.5。',
      '`left_mul_bijective` 与 `left_mul_hom` 作为**未展开义务**另行登记（见 UNEXPANDED_OBLIGATIONS）。',
    ],
    source: '人工登记：对照 data/cases/04-group.md「左乘映射」（第 74–80 行）的构造与边界两段',
  },
  {
    node: 'group:claim-injective',
    background: BG_GROUP,
    declarations: [
      { name: 'g0', type: 'G', role: 'object', label: '自由参数 g（原稿：自由参数 g,h 不是新公理）' },
      { name: 'h0', type: 'G', role: 'object', label: '自由参数 h' },
    ],
    definitions: [],
    assumptions: [
      {
        id: 'A1',
        source: 'right_identity(mul)(e)',
        note: '右单位律。登记口径差异见 boundary 第一条与 DIVERGENCES。',
      },
      {
        id: 'A2',
        source: 'left_mul(mul)(g0) = left_mul(mul)(h0)',
        note: '开放假设：两个左乘映射作为对象相等（原稿「开放假设 L_g=L_h」）。',
      },
    ],
    statement: { source: 'g0 = h0', kind: 'formula' },
    claims: [
      {
        id: 'C1',
        source: 'g0 = h0',
        role: 'derived',
        note: '原稿的等式链 g = ge = L_g(e) = L_h(e) = he = h。',
      },
    ],
    references: [
      { node: 'group:left-mul', version: '1', kind: 'definitionReference', symbols: ['left_mul'] },
    ],
    boundary: [
      '**登记口径差异（显式记录，未改原稿）**：原稿说「理论仅含右单位律」，即右单位律是**理论公理**；'
        + '本登记把它放进 spec 的 `assumptions`（→ 证书的 hypotheses）。原因见 DIVERGENCES 第 1 条。'
        + '两者在证书里的作用相同（都是可用前提），差别只在"谁被当成背景"。',
      '原稿「边界」照录：这一步只需要右单位，不需要结合律、逆元或有限性；它不是完整 Cayley 定理。',
      '原稿「逐条件反例」两条照录：删去右单位（{0,1} 上所有乘积为 0，所有左乘映射相等而 0≠1）；删去 L_g=L_h。',
      '自由参数 g0、h0 是 spec 的声明，**不是**新公理。',
    ],
    source: '人工登记：对照 data/cases/04-group.md「左乘映射相等推出元素相等」（第 55–64 行）的认证范围、逐条件反例与边界三段',
  },
  {
    node: 'group:proof-injective',
    background: BG_GROUP,
    declarations: [
      { name: 'g0', type: 'G', role: 'object', label: '自由参数 g' },
      { name: 'h0', type: 'G', role: 'object', label: '自由参数 h' },
    ],
    definitions: [],
    assumptions: [
      { id: 'A1', source: 'right_identity(mul)(e)', note: '右单位律（同上，登记为显式假设）。' },
      {
        id: 'A2',
        source: 'left_mul(mul)(g0) = left_mul(mul)(h0)',
        note: '开放假设：对象等式 L_g=L_h 的认证翻译。',
      },
    ],
    statement: { source: 'g0 = h0', kind: 'formula' },
    claims: [
      {
        id: 'C1',
        source: 'g0 = h0',
        role: 'derived',
        note: '与 formal:group:claim-injective 同一条命题；本节点登记的是它的**证书状态**。',
      },
    ],
    references: [
      { node: 'group:claim-injective', version: '1', kind: 'equivalentTo', symbols: ['left_mul'] },
    ],
    boundary: [
      '「证书已由现有检查器接受」照录；检查器本身未经过形式验证。',
      '「剩余义务」照录：左乘双射、复合同态、置换群与像子群仍是后续机器认证任务。',
      '**不声称完整 Cayley 定理已机器认证**：本 spec 只覆盖单射步骤。',
    ],
    source: '人工登记：对照 data/cases/04-group.md「Cayley 单射片段证书」（第 66–72 行）的状态与剩余义务两段',
  },
  {
    node: 'group:cayley',
    background: BG_GROUP,
    declarations: [],
    definitions: [],
    assumptions: [],
    statement: {
      source: '∀(g0:G)(h0:G). (left_mul(mul)(g0) = left_mul(mul)(h0) ⇒ g0 = h0)',
      kind: 'formula',
    },
    claims: [
      {
        id: 'C1',
        source: '∀(g0:G)(h0:G). (left_mul(mul)(g0) = left_mul(mul)(h0) ⇒ g0 = h0)',
        role: 'target',
        note: '目标（只在**单射这一步**上与原稿一致）：它是 Cayley 三段里被机器覆盖的那一段。',
      },
    ],
    references: [
      { node: 'group:proof-injective', version: '1', kind: 'conditionalDerivation', symbols: ['left_mul'] },
      { node: 'group:left-mul', version: '1', kind: 'definitionReference', symbols: ['left_mul'] },
    ],
    boundary: [
      '**不声称完整 Cayley 定理已机器认证**：原稿的三段论证里，只有单射这一步有证书。',
      '另外两段（L_g 是双射、g ↦ L_g 是同态、像是 Perm(G) 的子群）登记在 UNEXPANDED_OBLIGATIONS，'
        + '各自有独立类型与来源，**没有**被合成一个"Cayley 定理"符号。',
      '原稿「删条件」照录：删去结合律，复合等式无法证明；删去单位元，单射证明缺少取值点。',
      '原稿「误解」照录：结论不是"每个群都是有限对称群"，也不是"每个群与某个完整的 S_n 同构"。',
    ],
    source: '人工登记：对照 data/cases/04-group.md「Cayley 定理」（第 35–45 行）的概括证明、删条件与误解三段',
  },
  {
    node: 'group:units5',
    background: BG_GROUP,
    declarations: [
      { name: 'mul5', type: 'Z5 -> Z5 -> Z5', role: 'function', label: '模 5 乘法' },
      { name: 'one5', type: 'Z5', role: 'object', label: '单位元 1' },
      { name: 'inv5', type: 'Z5 -> Z5', role: 'function', label: '逆元映射' },
    ],
    definitions: [],
    assumptions: [],
    statement: {
      source: 'group_concept_Z5(mul5)(one5)(inv5) ∧ abelian_group_Z5(mul5)(one5)(inv5)',
      kind: 'formula',
    },
    claims: [
      {
        id: 'C1',
        source: 'group_concept_Z5(mul5)(one5)(inv5) ∧ abelian_group_Z5(mul5)(one5)(inv5)',
        role: 'derived',
        note: '由有限求值器对 finite:z5-units 的完整 4×4 表逐格核对（§2.12）。',
      },
    ],
    references: [],
    boundary: [
      '**交换性是偶然特征**：原稿「关键边界」原话「这个例子的交换性是偶然特征，不是群公理」。',
      '**载体排序是 Z5，不是一般的 G**：简单类型论没有类型变量（§1.1），所以具体载体要用具体类型的谓词 '
        + '`group_concept_Z5` / `abelian_group_Z5`。写成 `group_concept(mul5)(…)` 会把「模 5 单位群是一个群」'
        + '偷换成「某个抽象 G 上的群」，那恰好丢掉这条实例登记的意义。',
      '完整运算表与逆元表在 data/formal/instances.mjs（finite:z5-units）；本 spec 只登记概念与结构常量。',
      '「表格对称 ⇒ 所有群交换」是被反驳的过度推广，见 formal:group:pattern-all-commutative。',
      '模数换成 6 时 3 没有逆元，本 spec 不覆盖那种情形（原稿回看问题）。',
    ],
    source: '人工登记：对照 data/cases/04-group.md「模 5 乘法单位群」（第 27–33 行）与「练习：在 Units5 中求逆」（第 108–114 行）',
  },
  {
    node: 'group:noncomm',
    background: BG_GROUP,
    declarations: [
      { name: 'comp3', type: 'S3 -> S3 -> S3', role: 'function', label: '置换复合（右侧先作用）' },
      { name: 'g12', type: 'S3', role: 'object', label: '对换 (12)' },
      { name: 'g23', type: 'S3', role: 'object', label: '对换 (23)' },
    ],
    definitions: [],
    assumptions: [],
    statement: { source: '¬(comp3(g12)(g23) = comp3(g23)(g12))', kind: 'formula' },
    claims: [
      {
        id: 'C1',
        source: '¬(comp3(g12)(g23) = comp3(g23)(g12))',
        role: 'derived',
        note: '由 finite:s3 的完整 6×6 表逐格核对；对 1 的像分别是 2 与 3。',
      },
    ],
    references: [],
    boundary: [
      '**复合顺序写死在登记里**：右侧先作用，(a∘b)(x)=a(b(x))；换约定会让本反例的计算反转（原稿「置换群」提醒）。',
      '原稿「否定范围」照录：只反驳"所有群都交换"；交换群仍然是群，模 5 乘法的交换性不受影响。',
      '这个反例也不否定 Cayley 定理：S₃ 本身就是置换群（原稿原话）。',
    ],
    source: '人工登记：对照 data/cases/04-group.md「S₃ 非交换反例」（第 47–53 行）的计算与否定范围两段',
  },
  {
    node: 'group:pattern-all-commutative',
    background: BG_GROUP,
    declarations: [],
    definitions: [],
    assumptions: [],
    statement: { source: '∀(g0:G)(h0:G). mul(g0)(h0) = mul(h0)(g0)', kind: 'formula' },
    claims: [
      {
        id: 'C1',
        source: '∃(g0:G)(h0:G). ¬(mul(g0)(h0) = mul(h0)(g0))',
        role: 'target',
        note: '被反驳规则「所有群都交换」的否定式；见证在 finite:s3 里。',
      },
    ],
    references: [
      { node: 'group:noncomm', version: '1', kind: 'counterexampleTo', symbols: ['mul'] },
    ],
    boundary: [
      '本 spec 登记的是**被反驳的过度推广**，不是定理；`statement` 是要被打掉的规则。',
      '原稿「否定范围」照录：交换群仍然是群；这个反例只排除把交换律写进群定义或从个别例子推广到全称。',
      '`mul` 是 bg:group/1 的一般运算符号，本 spec **没有**断言它来自哪个结构；反例对象由 finite:s3 提供。',
    ],
    source: '人工登记：对照 data/cases/04-group.md「误区：所有群都交换」（第 98–106 行）的错误规则、反例与否定范围三段',
  },
];

/* -------------------------------------------------------------------------- *
 * 2. 装配：拓扑序补 specHash
 * -------------------------------------------------------------------------- */

/**
 * 只保留 §1.6 登记的字段。
 *
 * 为什么这么严：`parseSpec` 在 `strict` 下会把任何未登记字段当成错误
 * （"formalSpec 出现未登记字段"），而 §1.6 的字段表里**没有** `id`。
 * 所以 spec 的身份用 `node`（这正是"节点 → formalSpec"的键），
 * 想拿 `formal:<node>` 形式的显示名用 `specIdOf()`——两者一一对应，没有第二份真相。
 */
function materializeSpec(raw) {
  return {
    specVersion: SPEC_VERSION,
    node: raw.node,
    nodeVersion: raw.nodeVersion ?? '1',
    background: raw.background,
    theoryVersion: raw.theoryVersion ?? '1',
    declarations: raw.declarations,
    definitions: raw.definitions,
    assumptions: raw.assumptions,
    statement: raw.statement,
    claims: raw.claims,
    references: raw.references,
    boundary: raw.boundary,
    source: raw.source,
  };
}

/**
 * 按引用关系拓扑排序后补 `references[].specHash` 与 `hash`。
 *
 * 为什么需要拓扑序：`hash` 覆盖 `references`，而 `references[].specHash` 又是被引用
 * spec 的 `hash`——先算谁不是风格问题，算错了 `stale-reference` 会一直报。
 * 引用成环直接抛错（登记表本身就该是 DAG）。
 */
function buildSpecs(rawSpecs) {
  const byNode = new Map(rawSpecs.map((spec) => [spec.node, spec]));
  const resolvedHash = new Map();
  const built = new Map();
  const visiting = new Set();

  function resolve(spec) {
    if (built.has(spec.node)) return resolvedHash.get(spec.node);
    if (visiting.has(spec.node)) {
      throw new Error(`formalSpec 引用成环：${[...visiting].join(' → ')} → ${spec.node}`);
    }
    visiting.add(spec.node);
    const references = spec.references.map((ref) => {
      const target = byNode.get(ref.node);
      if (!target) return { ...ref, specHash: null };
      return { ...ref, specHash: resolve(target) };
    });
    const filled = { ...materializeSpec(spec), references };
    filled.hash = specHash(filled);
    visiting.delete(spec.node);
    resolvedHash.set(spec.node, filled.hash);
    built.set(spec.node, filled);
    return filled.hash;
  }

  for (const spec of rawSpecs) resolve(spec);
  return rawSpecs.map((spec) => built.get(spec.node));
}

/** 登记顺序与 §1.6 形状一致的全部 spec（`hash` 与 `references[].specHash` 已填好）。 */
export const specs = buildSpecs(RAW_SPECS);

const SPEC_BY_NODE = new Map(specs.map((spec) => [spec.node, spec]));

/** 全部 spec id（`formal:<node>`）；它是**显示名**，不是 §1.6 的字段。 */
export const SPEC_IDS = specs.map((spec) => `formal:${spec.node}`);

/** 节点 id → 显示用 spec id。 */
export function specIdOf(nodeId) {
  return SPEC_BY_NODE.has(nodeId) ? `formal:${nodeId}` : null;
}

/** 显示用 spec id → spec；前缀不是 `formal:` 或查不到都返回 `null`。 */
export function specForId(id) {
  if (typeof id !== 'string' || !id.startsWith('formal:')) return null;
  return SPEC_BY_NODE.get(id.slice('formal:'.length)) ?? null;
}

/** 节点 id → spec；没登记返回 `null`（不造默认值：未登记就是未登记）。 */
export function specForNode(nodeId, version) {
  const spec = SPEC_BY_NODE.get(nodeId);
  if (!spec) return null;
  if (version !== undefined && version !== null && spec.nodeVersion !== String(version)) return null;
  return spec;
}

/** 全部 spec 的节点 id。 */
export function registeredNodes() {
  return specs.map((spec) => spec.node);
}

/**
 * 把登记表交给 `theory.buildKernelTheory` 的**唯一正确入口**。
 *
 * 为什么必须有这个函数：`buildKernelTheory` 要的是**归一后的 spec**
 * （`parseSpec` 的输出，定义带 `term` / `canonical`）。直接喂本文件的原始 spec，
 * 会在 `definitions[].term` 上炸出「定义 R1 缺少规范项」「不是合法的项」这类
 * 与真正原因无关的报错——Lead 2026-10-04 端到端时正是这么撞上的。
 *
 * 所以这里把「原始 spec → parseSpec → 可用输入」这一步固化下来，
 * 调用方**不需要**自己拼 ctx，也不会各写一份（§2.4 的 `buildKernelTheory` 消费面）。
 *
 * @param {string} backgroundId 背景 id（如 `bg:tensor/1`）
 * @param {{ language?: object }} [options] 语言层模块；缺省自行动态 import
 * @returns {Promise<{ specs: object[], axioms: object[], background: object, notes: string[] } | null>}
 *          语言层不可用时返回 `null`（不假装能装配）
 */
export async function kernelInputForBackground(backgroundId, options = {}) {
  const language = options.language ?? await (async () => {
    try {
      return await import('../../core/formal/language.mjs');
    } catch {
      return null;
    }
  })();
  if (typeof language?.parseSpec !== 'function') return null;
  const selected = [
    ...specs.filter((spec) => normalizeBackgroundId(spec.background) === normalizeBackgroundId(backgroundId)),
    ...CONCEPT_SPECS.filter((spec) => normalizeBackgroundId(spec.background) === normalizeBackgroundId(backgroundId)),
  ];
  const ctx = { backgrounds: { backgroundTheory }, strict: true };
  const parsed = selected.map((spec) => {
    const parseable = {};
    for (const [key, value] of Object.entries(spec)) {
      if (SPEC_FIELDS.has(key)) parseable[key] = value;
    }
    return language.parseSpec(parseable, ctx);
  });

  const notes = [];
  const background = backgroundTheory(backgroundId);

  /*
   * 两条曾经必须绕过、现已被上游修好的缺口（保留记录，别让后来人以为还需要绕）：
   *
   * 1. `language.mjs#normalizeBackground` 曾把背景 `definitions` 收成 `{ name, type }`
   *    （丢 `term`、不解析 `source`），导致 `bg:limit/1` / `bg:group/1` 装配失败。
   *    2026-10-04 已修：现在保留 `term`/`source`，`buildKernelTheory` 遇到只有 `source`
   *    的背景定义会就地 `parseTerm`。所以**不再需要**把它预解析成合成 spec，
   *    背景对象可以原样交给 `buildKernelTheory`。
   * 2. `theory` 层曾把**兄弟作用域的同名绑定**（`∀x.P(x) ∧ ∀x.Q(x)`）判成有自由变量
   *    （根因在 `parseQuantifier`：第二个同名绑定改名后，体里的引用没跟着指回去）。
   *    2026-10-04 已修。`backgrounds.mjs` 里群概念展开的三个合取支用的是
   *    `a0/b0/c0`、`e1`、`i1`——**那只是历史写法，保留即可**（α 等价、含义不变）；
   *    不要据此推断登记时的绑定名必须互不相同。
   */
  notes.push(
    '旁注：背景公理里互不相同的绑定名（a0/b0/c0、e1、i1）源于「兄弟作用域同名绑定」'
    + '曾被误判的那段历史；语言层已修，该写法保留（α 等价），不是命名规范。',
  );
  return { specs: parsed, axioms: backgroundAxiomsForKernel(backgroundId), background, notes };
}

/** 把背景定义的 `source`（λ 源码）解析成归一 spec 要的 `{name, type, typeNode, term, canonical}`。 */
function kernelDefinitionsOf(language, backgroundId, constants, signature) {
  const out = [];
  for (const definition of backgroundTheory(backgroundId).definitions) {
    const term = language.parseTerm(definition.source, {
      bases: signature.bases,
      constants,
      definitions: out.map((item) => ({ name: item.name, type: item.typeNode })),
    });
    out.push({
      name: definition.name,
      type: definition.type,
      typeNode: language.parseType(definition.type),
      term,
      canonical: typeof language.alphaCanonical === 'function' ? language.alphaCanonical(term) : null,
    });
  }
  return out;
}

/**
 * 直接可解析的核输入（`kernelInputForBackground` 的轻量版，**不依赖语言层**）。
 *
 * 用途：调用方只想核对「背景的定义能不能被解析成规范项」时用；
 * 真正装配 theory 请用 `kernelInputForBackground`（背景定义现已由 `buildKernelTheory`
 * 自己按 `source` 解析，这里保留这个导出只是给测试与排障一个独立路径）。
 */
export { kernelDefinitionsOf };

/* -------------------------------------------------------------------------- *
 * 3. 原句对照清单（逐条可核：quote 必须在对应 .md 里逐字出现）
 * -------------------------------------------------------------------------- */

/**
 * 每条 spec 至少一条对照；`quote` 是从 `data/cases/*.md` **逐字复制**的原句，
 * 测试直接读文件做子串匹配。`relation` 说明这条原句在 spec 里被用作什么。
 */
export const SOURCE_CROSSWALK = [
  {
    node: 'limit:seq-conv',
    caseFile: 'data/cases/01-limit.md',
    section: '序列收敛 · 直觉',
    quote: 'ε 管前者，N 管后者。定义把无限过程折成一个有限条件：给定 ε 后只需找到一个 N。',
    relation: 'statement 的 ε–N 语义来源；本 spec 只用原子谓词 seq_conv 承载它。',
  },
  {
    node: 'limit:seq-conv',
    caseFile: 'data/cases/01-limit.md',
    section: '序列收敛 · 量词次序',
    quote: 'N 可以依赖 ε，不能依赖 n',
    relation: 'boundary：量词次序没有被类型编码，只在文字边界里。',
  },
  {
    node: 'limit:limit-ed',
    caseFile: 'data/cases/01-limit.md',
    section: '函数极限的 ε–δ 定义 · 逐条件反例',
    quote: '把极限值当作 f(a)；让 δ 依赖具体的 x；把“存在 δ”读成“对所有 δ”。',
    relation: 'boundary：三条常见误解原样保留。',
  },
  {
    node: 'limit:limit-seq',
    caseFile: 'data/cases/01-limit.md',
    section: '序列式极限定义 · 边界',
    quote: '只检验一条序列不够；允许 $x_n=a$ 会把 f(a) 拉进条件',
    relation: 'boundary：这两个陷阱没有被编码成条件，只能由登记文字承担。',
  },
  {
    node: 'limit:bridge',
    caseFile: 'data/cases/01-limit.md',
    section: '两种定义的等价 · 精确边界',
    quote: '本页给出完整自然语言证明；机器证书只覆盖其中“常值取值”这一小步。',
    relation: 'claims.role = target 的直接依据：这一条**不能**登记为已验证等价。',
  },
  {
    node: 'limit:constant-seq',
    caseFile: 'data/cases/01-limit.md',
    section: '常值序列 · 验证',
    quote: '对任意 ε>0，取 N=1，则 $n\\ge1$ 时 $|x_n-a|=0<\\varepsilon$，故 $x_n\\to a$。',
    relation: 'statement 的目标；证明用到的 seq_conv 展开正是本站缺失的那一步。',
  },
  {
    node: 'limit:constant-seq',
    caseFile: 'data/cases/01-limit.md',
    section: '常值序列 · 否定范围',
    quote: '这个例子只作用于序列收敛；函数极限定义中的去心条件讨论的是 $x\\ne a$，两者量化对象不同，不能被这个反例否定。',
    relation: 'boundary：本 spec 的否定范围。',
  },
  {
    node: 'limit:claim-eval-constant',
    caseFile: 'data/cases/01-limit.md',
    section: '常值取值片段',
    quote: '它展开一次 λ 抽象并把实参代入，没有任何开放假设。',
    relation: 'statement + assumptions 为空（无开放假设）的直接依据。',
  },
  {
    node: 'limit:claim-eval-constant',
    caseFile: 'data/cases/01-limit.md',
    section: '常值取值片段',
    quote: 'N 与 R 在这份证书里只是排序名，尚未编码实数度量、收敛定义、ε–δ 与序列定义的桥梁，也没有编码反向证明所需的选择。',
    relation: 'boundary：证书范围之外的义务清单。',
  },
  {
    node: 'limit:proof-eval-constant',
    caseFile: 'data/cases/01-limit.md',
    section: '常值取值证书 · 状态',
    quote: '检查器本身没有经过形式验证，这一栏不能写成“已机器证明检查器正确”。',
    relation: 'boundary 第一条：不允许把"检查通过"写成"检查器正确"。',
  },
  {
    node: 'limit:pattern-never-equal',
    caseFile: 'data/cases/01-limit.md',
    section: '误区：收敛序列各项都不等于极限 · 错误规则',
    quote: '$x_n\\to a$ 被加强为对所有 n 都有 $x_n\\ne a$。',
    relation: 'statement 就是这条被反驳的规则。',
  },
  {
    node: 'limit:pattern-never-equal',
    caseFile: 'data/cases/01-limit.md',
    section: '误区：收敛序列各项都不等于极限 · 否定范围',
    quote: '这个反例不否定函数极限定义中的去心条件。序列收敛允许取到极限点，函数极限讨论的是 $x\\ne a$ 时的行为，两者不能互换。',
    relation: 'boundary：反例的否定范围。',
  },

  {
    node: 'manifold:chart-atlas',
    caseFile: 'data/cases/02-manifold.md',
    section: '图、图册与覆盖 · 直觉',
    quote: '一张图是局部坐标，图册是覆盖整个空间的一组局部坐标。',
    relation: 'statement 里 is_atlas(A)(M) 两个参数的来源（图册 + 被覆盖的空间）。',
  },
  {
    node: 'manifold:chart-atlas',
    caseFile: 'data/cases/02-manifold.md',
    section: '图、图册与覆盖 · 边界',
    quote: '图册不要求有限，也不要求图之间互不相交。',
    relation: 'boundary：覆盖条件里**没有**有限性。',
  },
  {
    node: 'manifold:transition',
    caseFile: 'data/cases/02-manifold.md',
    section: '过渡映射 · 定义域陷阱',
    quote: 'C^k 条件要求对所有有序图对成立，不能只检查单向。',
    relation: 'formal:manifold:ck-atlas 的 statement 写成 ∀phi∀psi（有序对）的依据。',
  },
  {
    node: 'manifold:ck-atlas',
    caseFile: 'data/cases/02-manifold.md',
    section: 'C^k 图册 · 条件',
    quote: '$k\\ge1$，并且每个重叠域上的两个方向过渡映射都 C^k。',
    relation: 'statement 的 "两个方向"；k≥1 **未编码**，写进 boundary。',
  },
  {
    node: 'manifold:ck-atlas',
    caseFile: 'data/cases/02-manifold.md',
    section: 'C^k 图册 · 边界',
    quote: '一个拓扑流形可以有多个互不兼容的 C^k 结构；本站不展开光滑化定理。',
    relation: 'boundary：本 spec 不含光滑化定理。',
  },
  {
    node: 'manifold:smooth-atlas',
    caseFile: 'data/cases/02-manifold.md',
    section: '光滑图册 · 否定范围',
    quote: '这个反例只否定“该图册是 C²”，不证明 $\\mathbb R$ 不能另取光滑图册。图册性质与底空间性质必须分开。',
    relation: 'boundary：本 spec 只说图册，不说底空间。',
  },
  {
    node: 'manifold:compatible-k',
    caseFile: 'data/cases/02-manifold.md',
    section: 'C^k 兼容 · 检查清单',
    quote: '册内过渡、跨图册过渡、两个方向、全部重叠域。只检查册内过渡会漏掉真正的兼容性问题；相容关系不是图册相等。',
    relation: 'boundary：相容的四项检查清单与"不是相等"。',
  },
  {
    node: 'manifold:claim-transition-eval',
    caseFile: 'data/cases/02-manifold.md',
    section: '同图过渡在指定点的取值 · 机器认证范围',
    quote: '在指定点 y 的右逆等式假设下，认证 $\\varphi(\\varphi^{-1}(y))=y$。两个排序上的总函数模拟一张已固定图的两个载体。',
    relation: 'statement、declarations（两个排序 S/T）与 A1 的直接来源。',
  },
  {
    node: 'manifold:claim-transition-eval',
    caseFile: 'data/cases/02-manifold.md',
    section: '同图过渡在指定点的取值 · 边界',
    quote: '不含开集、限制域、图册、覆盖、正则性、链式法则与最大扩张；这不是整个流形结构已机器认证。',
    relation: 'boundary：逐条照录。',
  },
  {
    node: 'manifold:claim-max',
    caseFile: 'data/cases/02-manifold.md',
    section: '最大扩张是 C^k 图册且最大 · 命题',
    quote: '对任意 C^k 图册 A，其最大兼容扩张 $A_{\\max}$ 是 C^k 图册且按包含关系最大。',
    relation: 'statement 就是这条命题；claims.role = target。',
  },
  {
    node: 'manifold:claim-max',
    caseFile: 'data/cases/02-manifold.md',
    section: '最大 C^k 兼容扩张 · 删条件',
    quote: '若 A 本身不是 C^k 图册，覆盖与局部复合都失去依据，最大性证明无法开始。',
    relation: 'boundary：本 spec 不覆盖 A 非 C^k 的情形。',
  },
  {
    node: 'manifold:claim-generalization',
    caseFile: 'data/cases/02-manifold.md',
    section: '光滑图册是 C^k 图册 · 同载体蕴含',
    quote: '在同一图册编码下，$P_\\infty(A)\\Rightarrow P_k(A)$：所有阶导数存在且连续，特别地前 k 阶满足 C^k。',
    relation: 'statement 的直接来源。',
  },
  {
    node: 'manifold:claim-generalization',
    caseFile: 'data/cases/02-manifold.md',
    section: '光滑图册是 C^k 图册 · 跨载体映射',
    quote: '把光滑结构 $(X,[A]_\\infty)$ 映到最大 C^k 扩张，需要证明不依赖代表图册的选取；这条遗忘映射不宣称光滑极大图册与 C^k 极大图册字面相等，也不宣称存在典范逆函数。',
    relation: 'boundary：跨载体映射被明确排除在本 spec 之外。',
  },

  {
    node: 'tensor:tensor-rs',
    caseFile: 'data/cases/03-tensor.md',
    section: '(r,s) 型张量空间 · 边界',
    quote: 'r、s 有限；零重张量积约定为基域 F。上下指标的顺序与约定必须随节点保存，不能把名称当作已知。',
    relation: 'boundary：有限性与指标顺序。',
  },
  {
    node: 'tensor:multilinear',
    caseFile: 'data/cases/03-tensor.md',
    section: '多重线性函数 · 与张量的接口',
    quote: '只对第一个变量线性不足以推出多线性。',
    relation: 'boundary 第一条：statement 只写第一个变量可加，不能升级。',
  },
  {
    node: 'tensor:rank1-additive',
    caseFile: 'data/cases/03-tensor.md',
    section: '秩一映射保持加法 · 机器认证范围',
    quote: '令 $R(x)=\\alpha(x)v$。在 α 保持加法、标量对加法分配的声明条件下，认证',
    relation: 'definitions 里 R1 的 λ 项与 A1、A2 两条前提的直接来源。',
  },
  {
    node: 'tensor:rank1-additive',
    caseFile: 'data/cases/03-tensor.md',
    section: '秩一映射保持加法 · 边界',
    quote: '本片段不需要域的全部公理；其余向量空间公理不被宣称独立必要，更不等于完整张量同构已认证。',
    relation: 'boundary：两条"不升级"的口径照录。',
  },
  {
    node: 'tensor:proof-rank1-additive',
    caseFile: 'data/cases/03-tensor.md',
    section: '秩一加法证书 · 状态',
    quote: '证书已由现有检查器接受，带一个开放假设：α 保持加法；标量分配律作为闭理论公理。',
    relation: 'A1（开放假设）与 A2（闭理论公理）的登记依据。',
  },
  {
    node: 'tensor:end-iso',
    caseFile: 'data/cases/03-tensor.md',
    section: '张量与线性算子的同构 · 删条件反例',
    quote: '有限维在满射性处实质使用。',
    relation: 'boundary 第一条：有限维是本 spec 覆盖不到的前提。',
  },
  {
    node: 'tensor:end-iso',
    caseFile: 'data/cases/03-tensor.md',
    section: '张量与线性算子的同构 · 定义',
    quote: '$\\Phi(v\\otimes\\alpha)(w)=\\alpha(w)v$。',
    relation: 'statement 的等式形状来源。',
  },
  {
    node: 'tensor:infinite-rank',
    caseFile: 'data/cases/03-tensor.md',
    section: '无限维恒等算子反例 · 否定范围',
    quote: '只反驳无限维满射推广；单射与有限维同构不受影响。',
    relation: 'boundary：本 spec 的否定范围。',
  },
  {
    node: 'tensor:non-tensor-gamma',
    caseFile: 'data/cases/03-tensor.md',
    section: 'Christoffel 系数不是张量 · 否定范围',
    quote: '它只反驳“所有带上下指标的数组都是张量”，不否定个别数组确实满足变换律，也不否定更丰富的几何对象。',
    relation: 'boundary：本 spec 的否定范围。',
  },

  {
    node: 'group:group-concept',
    caseFile: 'data/cases/04-group.md',
    section: '群 · 直觉',
    quote: '群是把“可以互相抵消的对称操作”压缩成四条规则：闭合、结合、单位、逆。',
    relation: 'group_concept 这个原子谓词要承载的四条。',
  },
  {
    node: 'group:group-concept',
    caseFile: 'data/cases/04-group.md',
    section: '群 · 逐条件反例',
    quote: '交换律不属于群定义：模 5 乘法交换，但 $S_3$ 不交换。',
    relation: 'boundary：交换律不在群定义内，阿贝尔群另设谓词。',
  },
  {
    node: 'group:left-mul',
    caseFile: 'data/cases/04-group.md',
    section: '左乘映射 · 构造',
    quote: '用结合律验证 $L_g\\circ L_h=L_{gh}$；用逆元给出 $L_g$ 的逆 $L_{g^{-1}}$，从而得到双射。',
    relation: 'statement 取前半句（复合等式）；后半句作为未展开义务另行登记。',
  },
  {
    node: 'group:left-mul',
    caseFile: 'data/cases/04-group.md',
    section: '左乘映射 · 边界',
    quote: '完整的双射与同态论证依赖完整群公理；机器证书目前只覆盖单射步骤。',
    relation: 'boundary：本 spec 不含双射与同态结论。',
  },
  {
    node: 'group:claim-injective',
    caseFile: 'data/cases/04-group.md',
    section: '左乘映射相等推出元素相等 · 机器认证范围',
    quote: '在右单位律与开放假设 $L_g=L_h$ 下，认证',
    relation: 'A1（右单位律）与 A2（L_g=L_h）的直接来源。',
  },
  {
    node: 'group:claim-injective',
    caseFile: 'data/cases/04-group.md',
    section: '左乘映射相等推出元素相等 · 边界',
    quote: '这一步只需要右单位，不需要结合律、逆元或有限性；它不是完整 Cayley 定理。',
    relation: 'boundary：本 spec 的最小性声明。',
  },
  {
    node: 'group:proof-injective',
    caseFile: 'data/cases/04-group.md',
    section: 'Cayley 单射片段证书 · 状态',
    quote: '理论仅含右单位律；开放假设是对象等式 $L_g=L_h$ 的认证翻译；结论是对象等式回接后的 g=h。',
    relation: '口径差异的原文出处：见 DIVERGENCES 第 1 条。',
  },
  {
    node: 'group:cayley',
    caseFile: 'data/cases/04-group.md',
    section: 'Cayley 定理 · 概括证明',
    quote: '像是 $\\mathrm{Perm}(G)$ 的一个子群，因此每个群同构于某个置换群的子群。',
    relation: '未被机器覆盖的那一段；登记在 UNEXPANDED_OBLIGATIONS。',
  },
  {
    node: 'group:cayley',
    caseFile: 'data/cases/04-group.md',
    section: 'Cayley 定理 · 误解',
    quote: '结论不是“每个群都是有限对称群”，也不是“每个群与某个完整的 $S_n$ 同构”；G 无限时置换群也相应无限。',
    relation: 'boundary：结论范围照录。',
  },
  {
    node: 'group:units5',
    caseFile: 'data/cases/04-group.md',
    section: '模 5 乘法单位群 · 验证',
    quote: '2 的幂依次为 1,2,4,3，给出循环四元群；单位元为 1，每个元素的逆由指数取负给出。',
    relation: 'finite:z5-units 的 generatorTrace 与 inverses 表的来源。',
  },
  {
    node: 'group:units5',
    caseFile: 'data/cases/04-group.md',
    section: '模 5 乘法单位群 · 关键边界',
    quote: '这个例子的交换性是偶然特征，不是群公理。',
    relation: 'boundary 第一条。',
  },
  {
    node: 'group:noncomm',
    caseFile: 'data/cases/04-group.md',
    section: 'S₃ 非交换反例 · 计算',
    quote: '按右侧先作用的约定，$(12)(23)$ 与 $(23)(12)$ 对 1 的像分别为 2 与 3，故两个复合不相等。',
    relation: 'finite:s3 的 notation 与 nonCommutativeWitness 的直接来源。',
  },
  {
    node: 'group:noncomm',
    caseFile: 'data/cases/04-group.md',
    section: 'S₃ 非交换反例 · 否定范围',
    quote: '这个反例也不否定 Cayley 定理：$S_3$ 本身是置换群。',
    relation: 'boundary：与 formal:group:cayley 的关系说明。',
  },
  {
    node: 'group:pattern-all-commutative',
    caseFile: 'data/cases/04-group.md',
    section: '误区：所有群都交换 · 错误规则',
    quote: '把模 5 乘法的交换性写成对所有群成立。',
    relation: 'statement 就是这条被反驳的规则。',
  },
  {
    node: 'group:pattern-all-commutative',
    caseFile: 'data/cases/04-group.md',
    section: '误区：所有群都交换 · 否定范围',
    quote: '交换群仍然是群；这个反例只排除把交换律写进群定义或从个别例子推广到全称。',
    relation: 'boundary：否定范围照录。',
  },
];

/* -------------------------------------------------------------------------- *
 * 4. 关系登记
 * -------------------------------------------------------------------------- */

/**
 * 每条 = 一个关系意图。`status` 取值与含义：
 *
 * - `registered`：登记即可成立（定义引用、α 改名等价、有限表核对）；
 * - `machine-certified`：原稿说证书已被检查器接受（本站只是登记该状态）；
 * - `unverified`：有自然语言论证或候选，**机器未认证**；
 * - `not-claimed`：明确不声称。
 */
export const RELATIONS = [
  /* ---- definitionReference ---- */
  {
    id: 'rel:manifold:ck-atlas-uses-transition',
    kind: 'definitionReference',
    from: { node: 'manifold:ck-atlas', version: '1' },
    to: { node: 'manifold:transition', version: '1' },
    direction: null,
    conditions: [],
    goal: null,
    reason: 'formal:manifold:ck-atlas 的 statement 里出现符号 trans 与 is_ck；它们由「过渡映射」节点引入并登记类型。',
    status: 'registered',
    evidence: '符号 + 类型核对（§2.11 definition-reference 判定器）。',
    boundary: ['只核对符号与类型，不核对任何几何事实。'],
  },
  {
    id: 'rel:manifold:smooth-atlas-uses-transition',
    kind: 'definitionReference',
    from: { node: 'manifold:smooth-atlas', version: '1' },
    to: { node: 'manifold:transition', version: '1' },
    direction: null,
    conditions: [],
    goal: null,
    reason: 'formal:manifold:smooth-atlas 的 statement 里出现 trans 与 smooth。',
    status: 'registered',
    evidence: '符号 + 类型核对。',
    boundary: ['smooth 与 is_ck 是两个不同符号：引用关系不蕴含任何正则性结论。'],
  },
  {
    id: 'rel:group:claim-injective-uses-left-mul',
    kind: 'definitionReference',
    from: { node: 'group:claim-injective', version: '1' },
    to: { node: 'group:left-mul', version: '1' },
    direction: null,
    conditions: [],
    goal: null,
    reason: 'A2 与 statement 里出现 left_mul；该符号由「左乘映射」节点引入（项级透明缩写在 bg:group/1）。',
    status: 'registered',
    evidence: '符号 + 类型核对。',
    boundary: ['只登记"用了这个符号"，不登记"左乘映射的性质已证"。'],
  },
  {
    id: 'rel:group:cayley-uses-left-mul',
    kind: 'definitionReference',
    from: { node: 'group:cayley', version: '1' },
    to: { node: 'group:left-mul', version: '1' },
    direction: null,
    conditions: [],
    goal: null,
    reason: 'Cayley 的 statement 用 left_mul 写出单射那一步。',
    status: 'registered',
    evidence: '符号 + 类型核对。',
    boundary: ['未展开义务（双射 / 同态 / 子群）不在本关系内。'],
  },
  {
    id: 'rel:limit:constant-seq-uses-eval',
    kind: 'definitionReference',
    from: { node: 'limit:constant-seq', version: '1' },
    to: { node: 'limit:claim-eval-constant', version: '1' },
    direction: null,
    conditions: [],
    goal: null,
    reason: 'A1 的公式就是「常值取值」那条已认证命题的实例化。',
    status: 'registered',
    evidence: '符号 + 类型核对；公式逐字相同（除绑定名）。',
    boundary: ['引用一条取值等式**不**给出收敛结论。'],
  },

  /* ---- hardGeneralization（一般概念 → 特殊概念；证据证的是 特殊 ⇒ 一般） ----
   *
   * **四条全部 `unverified`，而且是"结构上证不出来"，不是"还没来得及跑"。**
   * 2026-10-04 用 `core/formal/search.mjs` 实地跑过（探针 `tmp/team/C/probe-concept-proofs.mjs`）：
   * 四条 goal 全部返回 `undecided` / `error`，**没有一条 `proved`**。原因对四条是同一个：
   * 蕴含两端都是**未解释的原子谓词**（`ck_atlas`/`is_atlas`、`smooth_atlas`/`ck_atlas`、
   * `abelian_group`/`group_concept`、`linear_map`/`additive`），而 §1.5 的定义只能是
   * `kind:'term'` 的**项**，公式没法拿来命名谓词——所以背景里不可能有连接两端的子句。
   * 现场核对：bg:group/1 的公理集为空；bg:tensor/1 只有 `bg-smul-distributive-add`；
   * bg:manifold/1 为空；程序里提到上述四个谓词的子句数都是 0。
   *
   * 要让它可证，需要一条**背景规定公理**（把谓词的既定含义 stipulate 下来），
   * 例如 `∀mm ee ii. abelian_group(mm)(ee)(ii) ⇒ group_concept(mm)(ee)(ii)`。
   * 那会把该式收进 `theory_sha256`（影响所有证书的理论哈希），属于口径决定，
   * 已报 Lead 裁决；在裁决前一律保持 `unverified` + `missingObligations`，
   * **不标成"已登记即完成"**。
   */
  {
    id: 'rel:manifold:chart-atlas-generalizes-ck-atlas',
    kind: 'hardGeneralization',
    from: { node: 'manifold:chart-atlas', version: '1' },
    to: { node: 'manifold:ck-atlas', version: '1' },
    direction: { general: 'manifold:chart-atlas', special: 'manifold:ck-atlas' },
    conditions: [
      { id: 'K1', source: '∀(AA:Atlas)(kk:N). ck_atlas(AA)(kk) ⇒ is_atlas(AA)(carrier(AA))', readable: 'C^k 图册首先是图册（覆盖 + 局部坐标）。' },
    ],
    goal: { source: '∀(AA:Atlas)(kk:N). ck_atlas(AA)(kk) ⇒ is_atlas(AA)(carrier(AA))' },
    reason: 'C^k 图册在图册的基础上多要求过渡映射正则；方向是「图册（一般）→ C^k 图册（特殊）」。',
    status: 'machine-certified',
    evidence: '定义性公理 bg-ck-atlas-expansion 的定义展开 + 合取消去；证书由真 kernel 子进程判 passed（开放假设为空）。',
    /*
     * 签出记录：本条的证书在 clause-fix（task-8）落地前就已取得并通过 kernel，
     * 当时按 Lead 的收口指令**压在手上**（同一批数据不该因为书写形状不同而一部分签出、
     * 一部分压手）。task-8 完成后重跑，哈希与压手前逐字节相同，遂签出。
     */
    certificate: {
      targetId: 'main',
      kernelStatus: 'passed',
      kernelVersion: 'mcs-nd-subset/1',
      exitCode: 0,
      checkerSha256: '25130be0e90d0336af0d4505bf664ccbc0d2ca69beda02dd6c501e124a4a4e5e',
      theoryId: 'T:bg:manifold/1',
      theoryVersion: '1',
      theorySha256: '960669f8de19d6ed2c70e260e7de103db186bfe1cc018530ef70c36c3df38320',
      proofSha256: '184e6a74cb3ab8081a4759aab1b50cb9af03f1e6aacd42a58b11cfdbb3f87e85',
      steps: 10,
      openHypotheses: [],
      committedAxioms: ['bg-ck-atlas-expansion', 'bg-smooth-atlas-expansion'],
      searchBudget: { maxDepth: 8, maxStates: 10000, maxMs: 3000 },
      ranAt: '2026-10-04',
      replay: 'node tmp/team/C/probe-certify.mjs',
      note: '三项核对逐条记下：(1) 真 kernel 子进程 status=passed、exitCode=0、开放假设为 []；(2) 证书结论与关系 goal 的 α 规范哈希**相等**（是精确命题，不是"跑通了"）；(3) 可重复——重跑 node tmp/team/C/probe-certify.mjs 得到同一 theory_sha256 / proof_sha256。 签出时机：clause-fix（task-8）落地后重跑确认；压手期间的记录见 pendingCertificate.supersededBy。',
    },
    pendingCertificate: {
      signed: false,
      supersededBy: 'certificate',
      targetId: 'main',
      kernelStatus: 'passed',
      kernelVersion: 'mcs-nd-subset/1',
      exitCode: 0,
      checkerSha256: '25130be0e90d0336af0d4505bf664ccbc0d2ca69beda02dd6c501e124a4a4e5e',
      theoryId: 'T:bg:manifold/1',
      theoryVersion: '1',
      theorySha256: '960669f8de19d6ed2c70e260e7de103db186bfe1cc018530ef70c36c3df38320',
      proofSha256: '184e6a74cb3ab8081a4759aab1b50cb9af03f1e6aacd42a58b11cfdbb3f87e85',
      steps: 10,
      openHypotheses: [],
      committedAxioms: ['bg-ck-atlas-expansion', 'bg-smooth-atlas-expansion'],
      searchBudget: { maxDepth: 8, maxStates: 10000, maxMs: 3000 },
      ranAt: '2026-10-04',
      replay: 'node tmp/team/C/probe-certify.mjs',
      note: '默认预算即可。',
      holdReason: '证书已取得：真 kernel 子进程判 passed、开放假设为空、结论与目标 α 等价（我另行核过）。但本条的公理是 `⇔` 形状，其反向蕴含的**前件含量词**，属于 task-8 通报的受影响形状（蕴含前件在 fact 侧子句化时可能丢前提）；按 Lead 的收口指令**暂不签出**，等 clause-fix 落地后重跑 `node tmp/team/C/probe-certify.mjs` 并改签。 已于 2026-10-04 clause-fix 落地后重跑并签出（哈希与压手前逐字节相同）。',
    },
    proofAttempt: {
      at: '2026-10-04',
      tool: 'core/formal/search.mjs + certificate.mjs + kernel.mjs',
      status: 'proved',
      reason: 'task-8（clause-fix）落地后重跑：search 返回 proved，证书经真 kernel 子进程判 passed，哈希与压手前一致。',
    },
    boundary: ['`is_atlas` 是原子谓词：这条蕴含的"证明"在首版里只是一次登记，不是证书。'],
  },
  {
    id: 'rel:manifold:ck-atlas-generalizes-smooth-atlas',
    kind: 'hardGeneralization',
    from: { node: 'manifold:ck-atlas', version: '1' },
    to: { node: 'manifold:smooth-atlas', version: '1' },
    direction: { general: 'manifold:ck-atlas', special: 'manifold:smooth-atlas' },
    conditions: [
      { id: 'K1', source: '∀(AA:Atlas)(kk:N). (smooth_atlas(AA) ⇒ ck_atlas(AA)(kk))', readable: '同载体蕴含：所有阶导数存在且连续，特别地前 k 阶满足 C^k。' },
    ],
    goal: { source: '∀(AA:Atlas)(kk:N). (smooth_atlas(AA) ⇒ ck_atlas(AA)(kk))' },
    reason: '原稿「光滑图册是 C^k 图册」的同载体蕴含；证据证的是 特殊（光滑）⇒ 一般（C^k）。',
    status: 'unverified',
    evidence: '原稿给的是自然语言蕴含，机器未认证。',
    missingObligations: [
      '**数学事实**：smooth ⇒ is_ck(·)(k)。这不是定义展开，而是"任意阶导数存在 ⇒ 前 k 阶存在"；'
        + '把它 stipulate 成公理就超出"只许背景概念谓词之间的定义性关系"这条界线（原稿把它当命题，给出自然语言证明）。',
    ],
    proofAttempt: {
      at: '2026-10-04',
      tool: 'core/formal/search.mjs',
      status: 'undecided',
      reason: 'bg-ck-atlas-expansion / bg-smooth-atlas-expansion 已就位，引擎的前件量词缺陷也已修（clause-fix）；'
        + '现在唯一的缺口是 smooth ⇒ is_ck(·)(k) 这条**数学事实**——按裁决不 stipulate，所以 search 返回 undecided。',
    },
    boundary: [
      '只覆盖同载体蕴含；跨载体映射（依赖代表图册选取）不在本关系内。',
      '不把 P_∞ ⇒ P_k 读成两种结构同一（原稿「误解」）。',
    ],
  },

  /* ---- equivalentTo ---- */
  {
    id: 'rel:limit:ed-equiv-seq',
    kind: 'equivalentTo',
    from: { node: 'limit:limit-ed', version: '1' },
    to: { node: 'limit:limit-seq', version: '1' },
    direction: null,
    conditions: [
      { id: 'A1', source: 'cluster_point(aa)', readable: 'a 是定义域 D 的聚点。' },
      { id: 'A2', source: 'choice_principle', readable: '反向证明用的选择条件（δ=1/n 取出反例序列）。' },
    ],
    goal: { source: '∀(ff:R -> R)(aa:R)(LL:R). (limit_ed(ff)(aa)(LL) ⇔ limit_seq(ff)(aa)(LL))' },
    reason: '原稿「两种定义的等价」的概括证明；两条条件缺一不可（删去任一条等价式单侧退化或失去反例序列）。',
    status: 'unverified',
    evidence: '**无机器证书**：原稿明写机器证书只覆盖「常值取值」这一小步。',
    boundary: [
      'A1、A2 是局部假设，不进 theory.axioms。',
      '「证明存在反例序列不等于给出一个可执行算法」（原稿）。',
    ],
  },
  {
    id: 'rel:limit:eval-equiv-proof',
    kind: 'equivalentTo',
    from: { node: 'limit:claim-eval-constant', version: '1' },
    to: { node: 'limit:proof-eval-constant', version: '1' },
    direction: null,
    conditions: [],
    goal: { source: '∀(aa:R)(nn:N). (λ(mm:N). aa)(nn) = aa' },
    reason: '命题节点与证书节点登记的是同一条公式：展示一份证明与检查一份证书是两件事，但命题相同。',
    status: 'registered',
    evidence: '两份 spec 的 `statement.source` 逐字相同（测试核对）。',
    boundary: ['等价的是**命题**，不是"已经掌握"这一层（原稿「它为什么值得单独列出」）。'],
  },
  {
    id: 'rel:tensor:rank1-equiv-proof',
    kind: 'equivalentTo',
    from: { node: 'tensor:rank1-additive', version: '1' },
    to: { node: 'tensor:proof-rank1-additive', version: '1' },
    direction: null,
    conditions: [],
    goal: { source: '∀(x0:V)(y0:V). R1(add(x0)(y0)) = add(R1(x0))(R1(y0))' },
    reason: '命题节点与证书节点同一条公式；两份 spec 的 R1 定义也逐字相同（合并时可去重）。',
    status: 'registered',
    evidence: '两份 spec 的 `statement.source` 与 `definitions[0].source` 逐字相同（测试核对）。',
    boundary: ['不把"证书被接受"升级为"张量同构已认证"。'],
  },
  {
    id: 'rel:group:injective-equiv-proof',
    kind: 'equivalentTo',
    from: { node: 'group:claim-injective', version: '1' },
    to: { node: 'group:proof-injective', version: '1' },
    direction: null,
    conditions: [
      { id: 'A1', source: 'right_identity(mul)(e)', readable: '右单位律。' },
      { id: 'A2', source: 'left_mul(mul)(g0) = left_mul(mul)(h0)', readable: '对象等式 L_g=L_h。' },
    ],
    goal: { source: 'g0 = h0' },
    reason: '命题节点与证书节点同一条公式与同一组假设。',
    status: 'registered',
    evidence: '两份 spec 的 declaration/assumption/statement 源串逐字相同（测试核对）。',
    boundary: ['等价的是单射这一步；Cayley 的其余两段不在此。'],
  },

  /* ---- conditionalDerivation ---- */
  {
    id: 'rel:limit:eval-derives-constant-seq',
    kind: 'conditionalDerivation',
    from: { node: 'limit:claim-eval-constant', version: '1' },
    to: { node: 'limit:constant-seq', version: '1' },
    direction: null,
    conditions: [
      { id: 'A1', source: '∀(bb:R)(nn:N). const_seq(bb)(nn) = bb', readable: '常值取值（已认证，无开放假设）。' },
    ],
    goal: { source: 'seq_conv(const_seq(aa))(aa)' },
    reason: '原稿的常值序列论证：取值恒为零 ⇒ 取 N=1 即可。第一步有证书，第二步缺 seq_conv 的展开。',
    status: 'unverified',
    evidence: '**只有前半段有证书**（formal:limit:claim-eval-constant）；后半段见 `missingObligations`。',
    boundary: [
      '**不把取值等式说成已证明收敛**：本关系的 status 是 unverified。',
      '原稿这条自然语言证明成立；本登记只区分"自然语言证明"与"机器证书"。',
    ],
    missingObligations: ['seq_conv 的 ε–N 展开（把 bg:limit/1 的 expansion 接入证书）'],
  },
  {
    id: 'rel:manifold:transition-derives-eval',
    kind: 'conditionalDerivation',
    from: { node: 'manifold:transition', version: '1' },
    to: { node: 'manifold:claim-transition-eval', version: '1' },
    direction: null,
    conditions: [
      { id: 'A1', source: '∀(yy:T). cmap(cinv(yy)) = yy', readable: '指定点的右逆等式（开放假设）。' },
    ],
    goal: { source: 'cmap(cinv(y0)) = y0' },
    reason: '同图过渡在指定点的取值，是"过渡映射"条件在两张同图上的退化片段。',
    status: 'machine-certified',
    evidence: '原稿「同图过渡证书」：证书已由现有检查器接受，带一个开放假设。',
    boundary: [
      '理论只包含两个排序上的总函数；限制域与开集结构未编码。',
      'A1 进 hypotheses，不进 theory.axioms。',
    ],
  },
  {
    id: 'rel:group:left-mul-derives-injective',
    kind: 'conditionalDerivation',
    from: { node: 'group:left-mul', version: '1' },
    to: { node: 'group:claim-injective', version: '1' },
    direction: null,
    conditions: [
      { id: 'A1', source: 'right_identity(mul)(e)', readable: '右单位律。' },
      { id: 'A2', source: 'left_mul(mul)(g0) = left_mul(mul)(h0)', readable: '对象等式 L_g=L_h。' },
    ],
    goal: { source: 'g0 = h0' },
    reason: '原稿的等式链：g = ge = L_g(e) = L_h(e) = he = h。只在单位元一点取值即可。',
    status: 'machine-certified',
    evidence: '原稿「Cayley 单射片段证书」：证书已由现有检查器接受。',
    boundary: ['只需要右单位；不需要结合律、逆元或有限性（原稿「边界」）。'],
  },
  {
    id: 'rel:group:injective-derives-cayley',
    kind: 'conditionalDerivation',
    from: { node: 'group:proof-injective', version: '1' },
    to: { node: 'group:cayley', version: '1' },
    direction: null,
    conditions: [
      { id: 'A1', source: '∀(g0:G)(h0:G). (left_mul(mul)(g0) = left_mul(mul)(h0) ⇒ g0 = h0)', readable: '单射这一步（已认证片段）。' },
      { id: 'M1', source: 'left_mul_bijective(mul)(g0)', readable: 'L_g 是双射——**未展开义务**，见 UNEXPANDED_OBLIGATIONS。' },
      { id: 'M2', source: 'left_mul_hom(mul)', readable: 'g ↦ L_g 是同态——**未展开义务**。' },
      { id: 'M3', source: 'perm_subgroup(mul)(e)(inv)', readable: '像是 Perm(G) 的子群——**未展开义务**。' },
    ],
    goal: { source: '∀(g0:G)(h0:G). (left_mul(mul)(g0) = left_mul(mul)(h0) ⇒ g0 = h0)' },
    reason: 'Cayley 三段里只有单射这一段有证书；本关系把三段前提**全部列出**，缺的两段显式标为未展开。',
    status: 'unverified',
    evidence: '单射段有证书；双射段与同态段没有。',
    boundary: [
      '**不声称完整 Cayley 定理已机器认证**。',
      'M1/M2/M3 是原子谓词，不是"假定为真"的定理符号：它们只出现在 conditions 里，不出现在任何 assumptions 或 axioms 里。',
    ],
    missingObligations: ['left_mul_bijective', 'left_mul_hom', 'perm_subgroup'],
  },
  {
    id: 'rel:tensor:multilinear-derives-rank1',
    kind: 'conditionalDerivation',
    from: { node: 'tensor:multilinear', version: '1' },
    to: { node: 'tensor:rank1-additive', version: '1' },
    direction: null,
    conditions: [
      { id: 'A1', source: '∀(p0:V)(q0:V). alpha0(add(p0)(q0)) = addF(alpha0(p0))(alpha0(q0))', readable: 'α 保持加法（开放假设）。' },
      { id: 'A2', source: '∀(cc:F)(p0:V)(q0:V). smul(cc)(add(p0)(q0)) = add(smul(cc)(p0))(smul(cc)(q0))', readable: '标量对加法分配（bg:tensor/1 的闭理论公理）。' },
    ],
    goal: { source: '∀(x0:V)(y0:V). R1(add(x0)(y0)) = add(R1(x0))(R1(y0))' },
    reason: '秩一映射的可加性由 α 可加与标量分配推出；原稿给出了两步等式链。',
    status: 'machine-certified',
    evidence: '原稿「秩一加法证书」：证书已由现有检查器接受。',
    boundary: ['**只到可加性**：不升级为线性，更不等于张量同构（原稿「边界」）。'],
  },

  /* ---- instanceOf ---- */
  {
    id: 'rel:group:units5-instance',
    kind: 'instanceOf',
    from: { node: 'group:units5', version: '1' },
    to: { node: 'group:group-concept', version: '1' },
    direction: null,
    conditions: [
      { id: 'M1', source: 'finite:z5-units', readable: '预置有限对象：载体 {1,2,3,4} 与完整 4×4 乘法表。' },
    ],
    goal: { source: 'group_concept_Z5(mul5)(one5)(inv5) ∧ abelian_group_Z5(mul5)(one5)(inv5)' },
    reason: '有限求值器对完整表逐格核对四条公理与交换性（§2.11 instance 判定器 + §2.12 有限语义）。',
    status: 'registered',
    evidence: 'data/formal/instances.mjs 的 verifyInstance 独立重算 16 格与 4 条逆元。',
    boundary: [
      '**交换性是偶然特征**，不是群公理（原稿「关键边界」）。',
      '有限表只给逐例结论，不能推广成对所有群的断言。',
    ],
  },
  {
    id: 'rel:group:s3-instance',
    kind: 'instanceOf',
    from: { node: 'group:noncomm', version: '1' },
    to: { node: 'group:group-concept', version: '1' },
    direction: null,
    conditions: [
      { id: 'M1', source: 'finite:s3', readable: '预置有限对象：6 个置换与完整 6×6 复合表（右侧先作用）。' },
    ],
    goal: { source: 'group_concept_S3(comp3)(e3)(inv3)' },
    reason: 'S₃ 是群（逐格核对），同时它的复合不交换——两个结论用同一张表。',
    status: 'registered',
    evidence: 'data/formal/instances.mjs 的 verifyInstance 独立重算 36 格与 6 条逆元。',
    boundary: ['复合顺序写死在 notation 里；换成左侧先作用会让见证反转。'],
  },

  /* ---- counterexampleTo ---- */
  {
    id: 'rel:group:noncomm-refutes-all-commutative',
    kind: 'counterexampleTo',
    from: { node: 'group:noncomm', version: '1' },
    to: { node: 'group:pattern-all-commutative', version: '1' },
    direction: null,
    conditions: [
      { id: 'M1', source: 'finite:s3', readable: '6 阶非交换群，表逐格核对。' },
    ],
    goal: { source: '∃(g0:G)(h0:G). ¬(mul(g0)(h0) = mul(h0)(g0))' },
    reason: 'comp3(g12)(g23)=g123 与 comp3(g23)(g12)=g132 不相等；对 1 的像分别是 2 与 3。',
    status: 'registered',
    evidence: 'finite:s3 的 nonCommutativeWitness，由 verifyInstance 重算。',
    boundary: [
      '只反驳全称交换性；交换群仍然是群。',
      '不否定 Cayley 定理（S₃ 本身是置换群）。',
    ],
  },
  {
    id: 'rel:limit:constant-seq-refutes-never-equal',
    kind: 'counterexampleTo',
    from: { node: 'limit:constant-seq', version: '1' },
    to: { node: 'limit:pattern-never-equal', version: '1' },
    direction: null,
    conditions: [
      { id: 'A1', source: '∀(bb:R)(nn:N). const_seq(bb)(nn) = bb', readable: '常值取值（已认证）。' },
    ],
    goal: { source: '∃(xx:N -> R)(aa:R)(nn:N). (seq_conv(xx)(aa) ∧ xx(nn) = aa)' },
    reason: '取 x_n = a：它收敛到 a（自然语言证明），且每一项都等于 a。',
    status: 'unverified',
    evidence: '**无机器证书**：seq_conv 是原子谓词，收敛那一步没有编码。',
    boundary: [
      '不否定函数极限的去心条件：两者量化对象不同（原稿「否定范围」）。',
      '本反例的自然语言论证成立；unverified 说的是"机器未认证"，不是"数学上不成立"。',
    ],
  },
  {
    id: 'rel:tensor:gamma-refutes-all-indexed',
    kind: 'counterexampleTo',
    // 条件里出现自由符号 christoffel（Christoffel 系数）；它没有节点，
    // 所以在关系上就地声明类型，让 goal / conditions 都能被单独解析核对。
    constants: { christoffel: 'Arr' },
    from: { node: 'tensor:non-tensor-gamma', version: '1' },
    to: { node: 'tensor:pattern-index-array', version: '1' },
    direction: null,
    conditions: [
      { id: 'N1', source: 'indexed(christoffel)', readable: 'Christoffel 系数带上下指标。' },
      { id: 'N2', source: '¬transforms_as_tensor(christoffel)', readable: '在 y=x² 的坐标变换下出现非齐次项 −1/(2y)。' },
    ],
    goal: { source: '∃(arr:Arr). (indexed(arr) ∧ ¬transforms_as_tensor(arr))' },
    reason: '原稿「反例计算」：指标外形完全一样，变换时多出非齐次项。',
    status: 'unverified',
    evidence: '自然语言计算，未编码为机器证书。',
    boundary: ['只反驳"所有带上下指标的数组都是张量"；不否定个别数组满足变换律。'],
  },
  {
    id: 'rel:tensor:infinite-rank-refutes-surjectivity',
    kind: 'counterexampleTo',
    // 同上：恒等算子是反例的见证，但它没有节点，就在关系上声明类型。
    constants: { identity_map: 'V -> V' },
    from: { node: 'tensor:infinite-rank', version: '1' },
    to: { node: 'tensor:end-iso', version: '1' },
    direction: null,
    conditions: [
      { id: 'N1', source: '¬finite_dim(vt)', readable: 'V 无限维。' },
      { id: 'N2', source: '¬(∃(tt:Vt). Phi(tt) = identity_map)', readable: '恒等算子不是有限秩，不在 Φ 的像中。' },
    ],
    goal: { source: '¬(∀(T0:V -> V). ∃(tt:Vt). Phi(tt) = T0)' },
    reason: '原稿「反例」：Φ 的每个输出都是有限秩算子，恒等算子不是。',
    status: 'unverified',
    evidence: '自然语言论证，未编码为机器证书。',
    boundary: ['只反驳无限维满射推广；单射与有限维同构不受影响（原稿「否定范围」）。'],
  },
];

/* -------------------------------------------------------------------------- *
 * 5. 背景概念层的特化（没有对应节点的概念对）
 * -------------------------------------------------------------------------- */

/**
 * **概念 spec**：有些概念在 §2.11 的意义上需要参与关系判定（`hardGeneralization`
 * 要求"同背景、同参数类型的概念对"），但它们在案例本体里**没有节点**。
 *
 * 为什么不硬造节点：造节点会污染 M 层，且 `formalCoverage` 会把它算成"案例节点"。
 * 所以这里给它们**不带 `node` 的 formalSpec**（§1.6 的 `node` 是可选的，`parseSpec`
 * 也按可选处理），另加两个登记元数据字段：
 *
 * - `concept`：概念标识（`concept:<案例>:<名字>`），也是关系端点用的 id；
 * - `anchor`：最贴近的**真实节点 id**，让"这条概念属于哪个案例的哪一块"可追。
 *
 * 这两个字段不在 §1.6 的字段表里，`specHash()` 会在喂给 `parseSpec` 之前裁掉它们
 * （裁完就是标准 §1.6 形状）。
 *
 * ## 它们怎么回答 Lead 提的「阿贝尔群到群的特化」缺失
 *
 * `abelian_group` 与 `group_concept` 的参数类型**逐位相同**
 * （`(G -> G -> G) -> G -> (G -> G) -> o`），所以 §2.11 的 generalization 判定器
 * 能把它们配成一对；特化方向（特殊 ⇒ 一般）写在 `CONCEPT_RELATIONS` 里。
 * 具体载体（Z5 / S3）不参与这条关系——它们有自己的具体类型谓词，
 * 正因如此「模 5 单位群是一个群」才不会被偷换成「某个抽象 G 上的群」。
 */
export const CONCEPT_SPECS = [
  {
    concept: 'concept:group:abelian',
    anchor: 'group:group-concept',
    specVersion: SPEC_VERSION,
    background: BG_GROUP,
    theoryVersion: '1',
    declarations: [
      { name: 'mul0', type: 'G -> G -> G', role: 'function', label: '候选群运算' },
      { name: 'e0', type: 'G', role: 'object', label: '候选单位元' },
      { name: 'inv0', type: 'G -> G', role: 'function', label: '候选逆元映射' },
    ],
    definitions: [],
    assumptions: [],
    statement: { source: 'abelian_group(mul0)(e0)(inv0)', kind: 'formula' },
    claims: [
      {
        id: 'C1',
        source: '∀(mm:G -> G -> G)(ee:G)(ii:G -> G). (abelian_group(mm)(ee)(ii) ⇒ group_concept(mm)(ee)(ii))',
        role: 'target',
        note: '特化方向的证据：阿贝尔群是群。它是**展开层面**的蕴含（abelian_group 的本意就是 group_concept 再合上交换律），'
          + '不是从公理推出来的，因此在本登记里是 target 而不是 derived。',
      },
    ],
    references: [
      { node: 'group:group-concept', version: '1', kind: 'hardGeneralization', symbols: ['group_concept', 'abelian_group'] },
    ],
    boundary: [
      '**阿贝尔群在本体里没有节点**：本 spec 的 `anchor` 只是溯源用的真实节点 id，它本身不是节点。',
      '`abelian_group` 与 `group_concept` 都是原子谓词：上面那条蕴含没有被写成定义（§1.5 的定义只能是 term）。',
      '反向（group_concept ⇒ abelian_group）**不成立**，正是 group:pattern-all-commutative 被反驳的那条。',
      '交换律不是群公理（原稿「模 5 乘法单位群」关键边界）。',
    ],
    source: '人工登记：对照 data/cases/04-group.md「群」逐条件反例段（「交换律不属于群定义」）',
  },
  {
    concept: 'concept:tensor:additive',
    anchor: 'tensor:rank1-additive',
    specVersion: SPEC_VERSION,
    background: BG_TENSOR,
    theoryVersion: '1',
    declarations: [
      { name: 'tt0', type: 'V -> V', role: 'function', label: '候选可加映射' },
    ],
    definitions: [],
    assumptions: [],
    statement: { source: 'additive(tt0)', kind: 'formula' },
    claims: [],
    references: [],
    boundary: [
      '`additive` 是 bg:tensor/1 的原子谓词：∀x y. T(add(x)(y)) = add(T(x))(T(y)) 只在 expansion 里。',
      '**只有可加性**，不含标量齐性。原稿边界：可加性不升级为完整线性。',
    ],
    source: '人工登记：对照 data/cases/03-tensor.md「秩一映射保持加法」机器认证范围段',
  },
  {
    concept: 'concept:tensor:linear',
    anchor: 'tensor:multilinear',
    specVersion: SPEC_VERSION,
    background: BG_TENSOR,
    theoryVersion: '1',
    declarations: [
      { name: 'tt0', type: 'V -> V', role: 'function', label: '候选线性映射' },
    ],
    definitions: [],
    assumptions: [],
    statement: { source: 'linear_map(tt0)', kind: 'formula' },
    claims: [
      {
        id: 'C1',
        source: '∀(TT:V -> V). (linear_map(TT) ⇒ additive(TT))',
        role: 'target',
        note: '特化方向的证据：线性 ⇒ 可加。展开层面成立（linear_map 的本意是 additive ∧ 标量齐性），但本站没有把它写成公式。',
      },
    ],
    references: [
      { node: 'tensor:multilinear', version: '1', kind: 'hardGeneralization', symbols: ['linear_map', 'additive'] },
    ],
    boundary: [
      '`linear_map` 与 `additive` 都是原子谓词：上面那条蕴含没有被写成定义。',
      '反向不成立（可加不蕴含标量齐性），原稿在 F₂ 上的删条件反例正说明这一点。',
      '这条特化**不**被用来把 rank1-additive 的结论升级成线性。',
    ],
    source: '人工登记：对照 data/cases/03-tensor.md「多重线性函数」接口段与「秩一映射保持加法」边界段',
  },
];

// 概念 spec 也要哈希：它们的 `references` 指向真实节点，哈希口径与 `specs` 完全一致。
// 顺序不能颠倒——哈希覆盖 `references[].specHash`，所以先补引用（查已算好的节点 spec），再算自己的哈希。
for (const conceptSpec of CONCEPT_SPECS) {
  conceptSpec.references = (conceptSpec.references ?? []).map((ref) => {
    const target = SPEC_BY_NODE.get(ref.node);
    return { ...ref, specHash: target ? target.hash : null };
  });
  conceptSpec.hash = specHash(conceptSpec);
}

const CONCEPT_BY_ID = new Map(CONCEPT_SPECS.map((spec) => [spec.concept, spec]));

/** 概念标识 → 概念 spec；没登记返回 `null`。 */
export function conceptSpec(id) {
  return CONCEPT_BY_ID.get(id) ?? null;
}

/** 全部概念 spec 的标识。 */
export function conceptSpecIds() {
  return CONCEPT_SPECS.map((spec) => spec.concept);
}

/**
 * 概念层的关系登记：端点写成 `{ node: 'concept:…' }`，与节点端点用同一套形状
 * （§5 的 `RelationCandidate.from/to` 本来就只是 `{ node, version }`）。
 */
export const CONCEPT_RELATIONS = [
  {
    id: 'rel:concept:abelian-refines-group',
    kind: 'hardGeneralization',
    from: { node: 'group:group-concept', version: '1' },
    to: { node: 'concept:group:abelian', version: '1' },
    direction: { general: 'group:group-concept', special: 'concept:group:abelian' },
    conditions: [
      {
        id: 'K1',
        source: '∀(mm:G -> G -> G)(ee:G)(ii:G -> G). (abelian_group(mm)(ee)(ii) ⇒ group_concept(mm)(ee)(ii))',
        readable: '阿贝尔群是群：展开里 group_concept 是合取的一项。',
      },
    ],
    goal: { source: '∀(mm:G -> G -> G)(ee:G)(ii:G -> G). (abelian_group(mm)(ee)(ii) ⇒ group_concept(mm)(ee)(ii))' },
    reason:
      '两端参数类型逐位相同（(G -> G -> G) -> G -> (G -> G) -> o），满足 §2.11「同背景、同参数类型的概念对」；'
      + '证据证的是 特殊（阿贝尔群）⇒ 一般（群）。',
    status: 'machine-certified',
    evidence: '定义性公理 bg-abelian-group-expansion 的一次定义展开 + 合取消去；证书由真 kernel 子进程判 passed（开放假设为空）。',
    certificate: {
      targetId: 'main',
      kernelStatus: 'passed',
      kernelVersion: 'mcs-nd-subset/1',
      exitCode: 0,
      checkerSha256: '25130be0e90d0336af0d4505bf664ccbc0d2ca69beda02dd6c501e124a4a4e5e',
      theoryId: 'T:bg:group/1',
      theoryVersion: '1',
      theorySha256: '9d7fb84cbb85781af11cda8a53c64dd980e6b59898d5103574f016aed2045a25',
      proofSha256: 'c5a152513847a9e62464580d9528006ea6a27163e25209bef4625d5d09961f5f',
      steps: 12,
      openHypotheses: [],
      committedAxioms: ['bg-group-concept-expansion', 'bg-abelian-group-expansion'],
      searchBudget: { maxDepth: 12, maxStates: 200000, maxMs: 20000 },
      ranAt: '2026-10-04',
      replay: 'node tmp/team/C/probe-certify.mjs',
      note: '三项核对逐条记下：(1) 真 kernel 子进程 status=passed、exitCode=0、开放假设为 []；'
        + '(2) 证书结论与关系 goal 的 α 规范哈希**相等**（是精确命题，不是"跑通了"）；'
        + '(3) 可重复——重跑 node tmp/team/C/probe-certify.mjs 得到同一 theory_sha256 / proof_sha256。'
        + '只 commit **G 载体**那两条公理（Z5 / S3 的具体载体公理与这条 `G` 上的目标无关）。注意：这条证明需要**比规格 §3 默认预算更大**的搜索——默认（depth 8 / states 10000 / 2000ms）会 timeout，实测 depth 12 / states 200000 / 20000ms 才 proved（约 5.5 秒）。',
    },
    proofAttempt: {
      at: '2026-10-04',
      tool: 'core/formal/search.mjs + certificate.mjs + kernel.mjs',
      status: 'proved',
      reason: 'search 返回 proved，证书经真 kernel 子进程判 passed；见 certificate 字段的重放入口。',
    },
    boundary: [
      '阿贝尔群一端**不是节点**，是 CONCEPT_SPECS 里的概念 spec（anchor 指向 group:group-concept）。',
      '具体载体（Z5 / S3）不参与这条关系：它们有各自的具体类型谓词。',
      '反向不成立，见 group:pattern-all-commutative。',
      '**现状：证不出来**（不是"还没跑"）。要可证需一条背景规定公理，已报 Lead 裁决；裁决前保持 unverified。',
    ],
    anchor: 'group:group-concept',
  },
  {
    id: 'rel:concept:linear-refines-additive',
    kind: 'hardGeneralization',
    from: { node: 'concept:tensor:additive', version: '1' },
    to: { node: 'concept:tensor:linear', version: '1' },
    direction: { general: 'concept:tensor:additive', special: 'concept:tensor:linear' },
    conditions: [
      {
        id: 'K1',
        source: '∀(TT:V -> V). (linear_map(TT) ⇒ additive(TT))',
        readable: '线性 ⇒ 可加：可加性是线性展开里的合取项。',
      },
    ],
    goal: { source: '∀(TT:V -> V). (linear_map(TT) ⇒ additive(TT))' },
    reason: '两端参数类型相同（(V -> V) -> o）；证据证的是 特殊（线性）⇒ 一般（可加）。',
    status: 'machine-certified',
    evidence: '定义性公理 bg-linear-map-expansion 的合取消去；证书由真 kernel 子进程判 passed（开放假设为空）。',
    /*
     * 签出记录：本条的证书在 clause-fix（task-8）落地前就已取得并通过 kernel，
     * 当时按 Lead 的收口指令**压在手上**（同一批数据不该因为书写形状不同而一部分签出、
     * 一部分压手）。task-8 完成后重跑，哈希与压手前逐字节相同，遂签出。
     */
    certificate: {
      targetId: 'main',
      kernelStatus: 'passed',
      kernelVersion: 'mcs-nd-subset/1',
      exitCode: 0,
      checkerSha256: '25130be0e90d0336af0d4505bf664ccbc0d2ca69beda02dd6c501e124a4a4e5e',
      theoryId: 'T:bg:tensor/1',
      theoryVersion: '1',
      theorySha256: '92f83c7f8e53d9289e9aa5c5acf3e2bf3e4f9191e43d9fd14d82c6b75712150d',
      proofSha256: '3fad72c61e1cb167b5d222e3817cc9323c96b9a5af8fefb28cae3cc693c6608d',
      steps: 8,
      openHypotheses: [],
      committedAxioms: ['bg-additive-expansion', 'bg-linear-map-expansion'],
      searchBudget: { maxDepth: 8, maxStates: 10000, maxMs: 3000 },
      ranAt: '2026-10-04',
      replay: 'node tmp/team/C/probe-certify.mjs',
      note: '三项核对逐条记下：(1) 真 kernel 子进程 status=passed、exitCode=0、开放假设为 []；(2) 证书结论与关系 goal 的 α 规范哈希**相等**（是精确命题，不是"跑通了"）；(3) 可重复——重跑 node tmp/team/C/probe-certify.mjs 得到同一 theory_sha256 / proof_sha256。 签出时机：clause-fix（task-8）落地后重跑确认；压手期间的记录见 pendingCertificate.supersededBy。',
    },
    pendingCertificate: {
      signed: false,
      supersededBy: 'certificate',
      targetId: 'main',
      kernelStatus: 'passed',
      kernelVersion: 'mcs-nd-subset/1',
      exitCode: 0,
      checkerSha256: '25130be0e90d0336af0d4505bf664ccbc0d2ca69beda02dd6c501e124a4a4e5e',
      theoryId: 'T:bg:tensor/1',
      theoryVersion: '1',
      theorySha256: '92f83c7f8e53d9289e9aa5c5acf3e2bf3e4f9191e43d9fd14d82c6b75712150d',
      proofSha256: '3fad72c61e1cb167b5d222e3817cc9323c96b9a5af8fefb28cae3cc693c6608d',
      steps: 8,
      openHypotheses: [],
      committedAxioms: ['bg-additive-expansion', 'bg-linear-map-expansion'],
      searchBudget: { maxDepth: 8, maxStates: 10000, maxMs: 3000 },
      ranAt: '2026-10-04',
      replay: 'node tmp/team/C/probe-certify.mjs',
      note: '默认预算即可。',
      holdReason: '证书已取得：真 kernel 子进程判 passed、开放假设为空、结论与目标 α 等价（我另行核过）。但本条的公理是 `⇔` 形状，其反向蕴含的**前件含量词**，属于 task-8 通报的受影响形状（蕴含前件在 fact 侧子句化时可能丢前提）；按 Lead 的收口指令**暂不签出**，等 clause-fix 落地后重跑 `node tmp/team/C/probe-certify.mjs` 并改签。 已于 2026-10-04 clause-fix 落地后重跑并签出（哈希与压手前逐字节相同）。',
    },
    proofAttempt: {
      at: '2026-10-04',
      tool: 'core/formal/search.mjs + certificate.mjs + kernel.mjs',
      status: 'proved',
      reason: 'task-8（clause-fix）落地后重跑：search 返回 proved，证书经真 kernel 子进程判 passed，哈希与压手前一致。',
    },
    boundary: [
      '反向不成立：可加不蕴含标量齐性（原稿 F₂ 上的删条件反例）。',
      '两端都不是节点，是 CONCEPT_SPECS 里的概念 spec。',
      '**现状：证不出来**（不是"还没跑"）。要可证需一条背景规定公理，已报 Lead 裁决；裁决前保持 unverified。',
    ],
    anchor: 'tensor:multilinear',
  },
];

/* -------------------------------------------------------------------------- *
 * 6. 未展开义务（有明确类型、来源、解释范围的原子谓词）
 * -------------------------------------------------------------------------- */

/**
 * **这一节是"不把待证定理替换成一个已假定为真的符号"的主要落点。**
 *
 * 每条给出：`symbol` + `type`（明确类型）、`source`（来源）、`scope`（解释范围）、
 * `status`（一律 `not-machine-certified`）、`appearsIn`（只出现在哪里）。
 * 关键约束（测试核对）：`appearsIn` 只允许 `statement` / `claims` / `conditions` /
 * `schema`，**不允许** `assumptions` 或 `axioms`。
 */
export const UNEXPANDED_OBLIGATIONS = [
  {
    id: 'obl:group:left_mul_bijective',
    node: 'group:cayley',
    symbol: 'left_mul_bijective',
    type: '(G -> G -> G) -> G -> o',
    background: BG_GROUP,
    source: 'data/cases/04-group.md「左乘映射」边界（「完整的双射与同态论证依赖完整群公理」）',
    scope: '只回答「固定 g 的左乘是双射」；需要结合律与逆元，两者都没有被本站假定。',
    wouldNeed: ['结合律（作为显式假设或证书前提）', '逆元律（同上）', 'L_{g^{-1}} 是逆映射的两条复合等式'],
    status: 'not-machine-certified',
    usage: 'target',
    appearsIn: ['conditions', 'schema'],
    boundary: ['本站在 group:left-mul 里只登记复合等式，双射结论**没有**被认证。'],
  },
  {
    id: 'obl:group:left_mul_hom',
    node: 'group:cayley',
    symbol: 'left_mul_hom',
    type: '(G -> G -> G) -> o',
    background: BG_GROUP,
    source: 'data/cases/04-group.md「Cayley 定理」概括证明（「故 g↦L_g 是群同态」）',
    scope: '只回答「g ↦ L_g 保持运算」；本站登记的是它的逐点形式（formal:group:left-mul 的 statement）。',
    wouldNeed: ['把逐点复合等式提升为映射等式（需要函数外延性的实例）'],
    status: 'not-machine-certified',
    usage: 'target',
    appearsIn: ['conditions', 'schema'],
    boundary: ['逐点等式 ⇒ 映射等式这一步在首版里要另出证书，不能按"显然"接受（§1.4 第 4 条）。'],
  },
  {
    id: 'obl:group:perm_subgroup',
    node: 'group:cayley',
    symbol: 'perm_subgroup',
    type: '(G -> G -> G) -> G -> (G -> G) -> o',
    background: BG_GROUP,
    source: 'data/cases/04-group.md「Cayley 定理」概括证明末尾（「像是 Perm(G) 的一个子群」）',
    scope: '只回答「像落在置换群的一个子群里」；置换群与子群接口都不在 bg:group/1 里。',
    wouldNeed: ['置换群 Perm(G) 的编码', '子群接口（对运算与逆封闭）'],
    status: 'not-machine-certified',
    usage: 'target',
    appearsIn: ['conditions', 'schema'],
    boundary: [
      '三段义务各自独立，**没有**被合成一个"Cayley 定理"符号。',
      'G 无限时置换群也相应无限（原稿「误解」），本站不编码基数。',
    ],
  },
  {
    id: 'obl:limit:seq-conv-expansion',
    node: 'limit:constant-seq',
    symbol: 'seq_conv',
    type: '(N -> R) -> R -> o',
    background: BG_LIMIT,
    source: 'data/cases/01-limit.md「序列收敛」的定义式（bg:limit/1 的 expansion 字段逐字保存了它）',
    scope: '只回答「ε–N 量词式如何接进证书」；本案的收敛结论全部卡在这一步。',
    wouldNeed: ['把 expansion 写成认证公式（量词链 + lt/le/d 三个原子符号）', '实数序的传递性等算术事实（未编码）'],
    status: 'not-machine-certified',
    usage: 'target',
    appearsIn: ['statement', 'claims', 'conditions', 'schema'],
    boundary: [
      '**不把取值等式说成已证明收敛**：取值那一步有证书，收敛这一步没有。',
      '原稿「证明存在反例序列不等于给出一个可执行算法」与本条无关但同属范围边界。',
    ],
  },
  {
    id: 'obl:limit:choice-principle',
    node: 'limit:bridge',
    symbol: 'choice_principle',
    type: 'o',
    background: BG_LIMIT,
    source: 'data/cases/01-limit.md「两种定义的等价」精确边界（「反向证明的第一行是对 ε–δ 量词链的逐层否定」）',
    scope: '只用来标明反向证明需要什么元理论条件；它不是对象语言的公式，因此永远不展开。',
    wouldNeed: ['一个能表达"可数选择"的元理论接口（首版没有）'],
    status: 'not-machine-certified',
    /*
     * `usage` 区分两种"未展开"：
     * - `target`：它是**待证目标**，只许出现在 statement / claims / conditions / schema；
     * - `hypothesis`：它是**真正的局部假设**（如元理论的选择条件），只许出现在 assumptions。
     *
     * 两者都不许进 theory.axioms——§0 的机制保证「不能把待证结论偷偷塞进公理」。
     * 这条区分是测试核对的重点，避免把"待证定理"和"公认前提"混成一类。
     */
    usage: 'hypothesis',
    appearsIn: ['assumptions'],
    boundary: ['它是**局部假设**，不是公理：只进 hypotheses，不进 theory.axioms（§0 的机制保证）。'],
  },
  {
    id: 'obl:manifold:max-ext-existence',
    node: 'manifold:claim-max',
    symbol: 'max_ext',
    type: 'Atlas -> Atlas',
    background: BG_MANIFOLD,
    source: 'data/cases/02-manifold.md「最大 C^k 兼容扩张」概括证明',
    scope: '只回答「A 的最大兼容扩张这个对象存在」；原稿的证明依赖链式法则与 C^k 复合封闭性。',
    wouldNeed: ['链式法则与 C^k 复合封闭性（bg:manifold:calc 里是 background-assumed）', '开集与包含关系（未编码）'],
    status: 'not-machine-certified',
    usage: 'target',
    appearsIn: ['statement', 'claims', 'schema'],
    boundary: ['原子常量的存在性没有被认证：「A_max」这个写法本身在本站是**声明**。'],
  },
  {
    id: 'obl:manifold:chain-rule',
    node: 'manifold:claim-max',
    symbol: 'is_ck',
    type: 'Map -> N -> o',
    background: BG_MANIFOLD,
    source: 'data/cases/02-manifold.md「最大扩张是 C^k 图册且最大」证明结构（「链式法则与 C^k 复合封闭、局部性」）',
    scope: '只回答「复合保持 C^k」；本站没有编码导数，因此这条永远是背景声明。',
    wouldNeed: ['导数的编码', '链式法则的证书'],
    status: 'not-machine-certified',
    usage: 'target',
    appearsIn: ['schema'],
    boundary: ['原稿把它列在「每一步都对应明确的接口」里；本站只登记接口名，不给实现。'],
  },
  {
    id: 'obl:tensor:phi-surjective',
    node: 'tensor:end-iso',
    symbol: 'is_iso',
    type: '(Vt -> V -> V) -> o',
    background: BG_TENSOR,
    source: 'data/cases/03-tensor.md「张量与线性算子的同构」证明段',
    scope: '只回答「Φ 是双射」；有限维、基、矩阵单位三样都缺。',
    wouldNeed: ['有限维与基的存在性（M_linear 是 background-assumed）', '张量积通用性质（未编码）', '矩阵单位 E_ij 的编码'],
    status: 'not-machine-certified',
    usage: 'target',
    appearsIn: ['claims', 'schema'],
    boundary: ['**不等于张量同构已认证**（原稿「秩一映射保持加法」边界原话）。'],
  },
  {
    id: 'obl:tensor:rank1-linear',
    node: 'tensor:rank1-additive',
    symbol: 'linear_map',
    type: '(V -> V) -> o',
    background: BG_TENSOR,
    source: 'data/cases/03-tensor.md「秩一映射保持加法」边界（「更不等于完整张量同构已认证」）',
    scope: '只回答「R1 是线性的」；标量齐性那一步没有认证。',
    wouldNeed: ['标量齐性：R1(smul(c)(x)) = smul(c)(R1(x))', 'α 的标量齐性（原稿只声明了可加性）'],
    status: 'not-machine-certified',
    usage: 'target',
    appearsIn: ['claims', 'schema'],
    boundary: ['**不把可加性升级为完整线性**。'],
  },
  {
    id: 'obl:manifold:smooth-to-ck',
    node: 'manifold:claim-generalization',
    symbol: 'smooth_atlas',
    type: 'Atlas -> o',
    background: BG_MANIFOLD,
    source: 'data/cases/02-manifold.md「光滑图册是 C^k 图册」同载体蕴含',
    scope: '只回答「同一图册编码下 P_∞ ⇒ P_k」；跨载体映射不在内。',
    wouldNeed: ['把"任意阶导数存在"与"前 k 阶满足 C^k"接起来（本站没有导数）'],
    status: 'not-machine-certified',
    usage: 'target',
    appearsIn: ['statement', 'claims', 'schema'],
    boundary: ['不把 P_∞ ⇒ P_k 读成两种结构同一（原稿「误解」）。'],
  },
];

/* -------------------------------------------------------------------------- *
 * 7. α 绑定改名等价（§1.4 第 3 条）
 * -------------------------------------------------------------------------- */

/**
 * 「绑定改名不改变规范形式」是语言层的硬规则（§1.4 第 3 条）。
 * 这里登记若干对**只差绑定名**的公式：语言层落地后，测试断言
 * `formulaHash(parseFormula(original)) === formulaHash(parseFormula(renamed))`。
 *
 * 注意：这不是"两个命题碰巧相等"，而是同一命题的两种书写；量词**顺序**变化
 * 会让规范形式改变，那种情形不在本表里。
 */
export const ALPHA_VARIANTS = [
  {
    id: 'alpha:limit:seq-conv',
    node: 'limit:seq-conv',
    background: BG_LIMIT,
    standsFor: 'seq_conv',
    original: '∀(eps:R). lt(zero)(eps) ⇒ ∃(N0:N). ∀(nn:N). (le(N0)(nn) ⇒ lt(d(xx(nn))(aa))(eps))',
    renamed: '∀(ee:R). lt(zero)(ee) ⇒ ∃(MM:N). ∀(mm:N). (le(MM)(mm) ⇒ lt(d(xx(mm))(aa))(ee))',
    constants: { xx: 'N -> R', aa: 'R' },
    note: 'ε–N 展开的两种绑定名写法。量词顺序（∀ε ∃N ∀n）在两份里逐位相同。',
  },
  {
    id: 'alpha:limit:limit-ed',
    node: 'limit:limit-ed',
    background: BG_LIMIT,
    standsFor: 'limit_ed',
    original:
      '∀(eps:R). lt(zero)(eps) ⇒ ∃(del:R). (lt(zero)(del) ∧ '
      + '∀(yy:R). ((lt(zero)(d(yy)(aa)) ∧ lt(d(yy)(aa))(del)) ⇒ lt(d(ff(yy))(LL))(eps)))',
    renamed:
      '∀(ee:R). lt(zero)(ee) ⇒ ∃(dd:R). (lt(zero)(dd) ∧ '
      + '∀(zz:R). ((lt(zero)(d(zz)(aa)) ∧ lt(d(zz)(aa))(dd)) ⇒ lt(d(ff(zz))(LL))(ee)))',
    note: 'ε–δ 展开的两种绑定名写法；去心条件 0<|x−a| 在 `lt(zero)(d(...))` 里，两份都保留。',
    constants: { ff: 'R -> R', aa: 'R', LL: 'R' },
  },
  {
    id: 'alpha:manifold:transition-eval',
    node: 'manifold:claim-transition-eval',
    background: BG_MANIFOLD,
    standsFor: 'right inverse hypothesis',
    original: '∀(yy:T). cmap(cinv(yy)) = yy',
    renamed: '∀(zz:T). cmap(cinv(zz)) = zz',
    constants: { cmap: 'S -> T', cinv: 'T -> S' },
    note: '右逆假设的两种绑定名写法；自由变量 cmap、cinv 的类型不变（§1.4：自由变量保留原名与类型）。',
  },
  {
    id: 'alpha:tensor:rank1-additive',
    node: 'tensor:rank1-additive',
    background: BG_TENSOR,
    standsFor: 'R1 additivity',
    original: '∀(x0:V)(y0:V). R1(add(x0)(y0)) = add(R1(x0))(R1(y0))',
    renamed: '∀(pp:V)(qq:V). R1(add(pp)(qq)) = add(R1(pp))(R1(qq))',
    constants: { R1: 'V -> V' },
    note: '秩一可加性的两种绑定名写法。',
  },
  {
    id: 'alpha:group:cayley-injective',
    node: 'group:cayley',
    background: BG_GROUP,
    standsFor: 'injective step',
    original: '∀(g0:G)(h0:G). (left_mul(mul)(g0) = left_mul(mul)(h0) ⇒ g0 = h0)',
    renamed: '∀(aa0:G)(bb0:G). (left_mul(mul)(aa0) = left_mul(mul)(bb0) ⇒ aa0 = bb0)',
    constants: {},
    note: '单射片段的两种绑定名写法。',
  },
];

/* -------------------------------------------------------------------------- *
 * 8. 背景符号的「用到」与「引入」——两件事，两份表
 * -------------------------------------------------------------------------- */

/**
 * **用到**的登记：哪些 spec 的正文里出现了哪些背景符号。
 *
 * ⚠️ **它是"用到"的登记，不承担"引入"的语义。** 这条必须写在这里：
 * 同一个符号会被**很多**节点用到（`left_mul` 有 4 个，`seq_conv` 有 3 个），
 * 拿它当"谁引入"会让每个符号都 ambiguous，进而让定义引用判定生成**假引用**。
 * 「谁引入」的唯一依据是下面的 `PROVIDES`。
 *
 * 用途：审计"某个背景符号到底被哪些节点用了"；以及核对 spec 的 `references`
 * 有没有漏登记（见测试）。
 */
export const BACKGROUND_REFERENCES = specs.flatMap((spec) => {
  const signature = backgroundSignature(spec.background);
  const used = [];
  const seen = new Set();
  const scan = (text) => {
    if (typeof text !== 'string') return;
    for (const name of Object.keys(signature.constants)) {
      if (seen.has(name)) continue;
      if (new RegExp(`(^|[^A-Za-z0-9_])${name}([^A-Za-z0-9_]|$)`).test(text)) {
        seen.add(name);
        used.push(name);
      }
    }
  };
  scan(spec.statement.source);
  for (const item of spec.assumptions) scan(item.source);
  for (const item of spec.claims) scan(item.source);
  for (const item of spec.definitions) scan(item.source);
  return used.map((symbol) => ({
    node: spec.node,
    background: normalizeBackgroundId(spec.background),
    symbol,
    type: signature.constants[symbol],
  }));
});

/**
 * **引入**的登记：一个符号由**哪一个**登记主体引入（`PROVIDES`）。
 *
 * ## 判定规则（唯一依据，不许按"谁用到"填）
 *
 * 一个符号由登记主体 N 引入 ⟺ **N 是它的定义处**。依据是
 * `core/formal/backgrounds.mjs` 里该符号的 `expansion` / `source` / `scope`
 * （以及 spec 级 `definitions[]` 的 `source`）指向的原稿章节，落回该章节所属的节点。
 * 例：`left_mul` 的定义在 `bg:group/1` 的 `definitions`，原稿出处是
 * `data/cases/04-group.md「左乘映射」（第 74–80 行）`，所以引入方是 `group:left-mul`。
 *
 * ## 两条纪律
 *
 * 1. **一个符号只能有一个引入方**（测试核对；重复即失败）。
 * 2. **绝不把"用到它的节点"填进来**。填错的后果不是"多一条关系"，而是假引用会重新出现。
 *
 * ## 两个字段的含义
 *
 * - `node`：引入方的 id。它可能是本体节点，也可能是**概念 spec** 的 id
 *   （`concept:` 前缀）——`abelian_group` / `linear_map` 这类概念在案例本体里没有节点，
 *   它们的定义处就是那两条概念 spec。此时 `providerKind === 'concept'`，不是数据错误。
 * - `source`：判定所依据的原稿章节，便于逐条复核。
 *
 * ## 已知的重复定义（如实记录，未擅自"取一个更像的"）
 *
 * `R1` 在 `tensor:rank1-additive` 与 `tensor:proof-rank1-additive` 两条 spec 里
 * **逐字相同**地各定义了一次（这是有意的：两条 spec 要能各自独立解析）。
 * 它是**同一个符号的同一份定义**，不是两个同名异物，所以引入方只登记
 * `tensor:rank1-additive`（命题节点，也就是原稿里第一次写出 `R(x)=α(x)v` 的地方）；
 * 重复方在下面用 `duplicateDefinitions` 显式列出，不藏起来。
 */
export const PROVIDES = [
  /* ---- bg:group/1 ---- */
  { symbol: 'mul', node: 'group:group-concept', version: '1', type: 'G -> G -> G', background: BG_GROUP, source: 'data/cases/04-group.md「群」（第 1–9 行）' },
  { symbol: 'e', node: 'group:group-concept', version: '1', type: 'G', background: BG_GROUP, source: 'data/cases/04-group.md「群」（第 1–9 行）' },
  { symbol: 'inv', node: 'group:group-concept', version: '1', type: 'G -> G', background: BG_GROUP, source: 'data/cases/04-group.md「群」（第 1–9 行）' },
  { symbol: 'group_concept', node: 'group:group-concept', version: '1', type: '(G -> G -> G) -> G -> (G -> G) -> o', background: BG_GROUP, source: 'data/cases/04-group.md「群」（第 1–9 行）' },
  { symbol: 'abelian_group', node: 'concept:group:abelian', version: '1', providerKind: 'concept', type: '(G -> G -> G) -> G -> (G -> G) -> o', background: BG_GROUP, source: 'data/cases/04-group.md「群」逐条件反例段（交换律不属于群定义）' },
  { symbol: 'group_concept_Z5', node: 'group:units5', version: '1', type: '(Z5 -> Z5 -> Z5) -> Z5 -> (Z5 -> Z5) -> o', background: BG_GROUP, source: 'data/cases/04-group.md「模 5 乘法单位群」（第 27–33 行）' },
  { symbol: 'abelian_group_Z5', node: 'group:units5', version: '1', type: '(Z5 -> Z5 -> Z5) -> Z5 -> (Z5 -> Z5) -> o', background: BG_GROUP, source: 'data/cases/04-group.md「模 5 乘法单位群」关键边界段' },
  { symbol: 'group_concept_S3', node: 'group:noncomm', version: '1', type: '(S3 -> S3 -> S3) -> S3 -> (S3 -> S3) -> o', background: BG_GROUP, source: 'data/cases/04-group.md「S₃ 非交换反例」（第 47–53 行）' },
  { symbol: 'abelian_group_S3', node: 'group:noncomm', version: '1', type: '(S3 -> S3 -> S3) -> S3 -> (S3 -> S3) -> o', background: BG_GROUP, source: 'data/cases/04-group.md「S₃ 非交换反例」否定范围段' },
  { symbol: 'right_identity', node: 'group:claim-injective', version: '1', type: '(G -> G -> G) -> G -> o', background: BG_GROUP, source: 'data/cases/04-group.md「左乘映射相等推出元素相等」（在右单位律与开放假设 L_g=L_h 下）' },
  { symbol: 'left_mul_bijective', node: 'group:left-mul', version: '1', type: '(G -> G -> G) -> G -> o', background: BG_GROUP, source: 'data/cases/04-group.md「左乘映射」边界（用逆元给出 L_g 的逆，从而得到双射）' },
  { symbol: 'left_mul_hom', node: 'group:cayley', version: '1', type: '(G -> G -> G) -> o', background: BG_GROUP, source: 'data/cases/04-group.md「Cayley 定理」概括证明（故 g↦L_g 是群同态）' },
  { symbol: 'perm_subgroup', node: 'group:cayley', version: '1', type: '(G -> G -> G) -> G -> (G -> G) -> o', background: BG_GROUP, source: 'data/cases/04-group.md「Cayley 定理」概括证明（像是 Perm(G) 的一个子群）' },
  { symbol: 'left_mul', node: 'group:left-mul', version: '1', type: '(G -> G -> G) -> G -> G -> G', background: BG_GROUP, source: 'data/cases/04-group.md「左乘映射」（第 74–80 行）的定义 L_g(x)=gx' },

  /* ---- bg:limit/1 ---- */
  { symbol: 'd', node: 'limit:distance', version: '1', type: 'R -> R -> R', background: BG_LIMIT, source: 'data/cases/01-limit.md「实数距离」的定义 d(x,y)=|x−y|' },
  { symbol: 'seq_conv', node: 'limit:seq-conv', version: '1', type: '(N -> R) -> R -> o', background: BG_LIMIT, source: 'data/cases/01-limit.md「序列收敛」（第 11–19 行）' },
  { symbol: 'limit_ed', node: 'limit:limit-ed', version: '1', type: '(R -> R) -> R -> R -> o', background: BG_LIMIT, source: 'data/cases/01-limit.md「函数极限的 ε–δ 定义」（第 21–33 行）' },
  { symbol: 'limit_seq', node: 'limit:limit-seq', version: '1', type: '(R -> R) -> R -> R -> o', background: BG_LIMIT, source: 'data/cases/01-limit.md「序列式极限定义」（第 35–43 行）' },
  { symbol: 'continuous_at', node: 'limit:continuous', version: '1', type: '(R -> R) -> R -> o', background: BG_LIMIT, source: 'data/cases/01-limit.md「函数在一点连续」（第 55–65 行）' },
  { symbol: 'cluster_point', node: 'limit:bridge', version: '1', type: 'R -> o', background: BG_LIMIT, source: 'data/cases/01-limit.md「两种定义的等价」条件即反例段落' },
  { symbol: 'choice_principle', node: 'limit:bridge', version: '1', type: 'o', background: BG_LIMIT, source: 'data/cases/01-limit.md「两种定义的等价」精确边界段落' },
  { symbol: 'const_seq', node: 'limit:constant-seq', version: '1', type: 'R -> N -> R', background: BG_LIMIT, source: 'data/cases/01-limit.md「常值序列」（第 75–83 行）' },

  /* ---- bg:manifold/1 ---- */
  { symbol: 'carrier', node: 'manifold:chart-atlas', version: '1', type: 'Atlas -> Set', background: BG_MANIFOLD, source: 'data/cases/02-manifold.md「图、图册与覆盖」（图册覆盖的空间）' },
  { symbol: 'covers', node: 'manifold:chart-atlas', version: '1', type: 'Atlas -> Set -> o', background: BG_MANIFOLD, source: 'data/cases/02-manifold.md「图、图册与覆盖」（第 11–17 行）' },
  { symbol: 'is_atlas', node: 'manifold:chart-atlas', version: '1', type: 'Atlas -> Set -> o', background: BG_MANIFOLD, source: 'data/cases/02-manifold.md「图、图册与覆盖」' },
  { symbol: 'trans', node: 'manifold:transition', version: '1', type: 'Chart -> Chart -> Map', background: BG_MANIFOLD, source: 'data/cases/02-manifold.md「过渡映射」（第 19–29 行）' },
  { symbol: 'is_ck', node: 'manifold:ck-atlas', version: '1', type: 'Map -> N -> o', background: BG_MANIFOLD, source: 'data/cases/02-manifold.md「C^k 图册」（第 31–39 行）' },
  { symbol: 'ck_atlas', node: 'manifold:ck-atlas', version: '1', type: 'Atlas -> N -> o', background: BG_MANIFOLD, source: 'data/cases/02-manifold.md「C^k 图册」条件段' },
  { symbol: 'smooth', node: 'manifold:smooth-atlas', version: '1', type: 'Map -> o', background: BG_MANIFOLD, source: 'data/cases/02-manifold.md「光滑图册」（第 41–49 行）' },
  { symbol: 'smooth_atlas', node: 'manifold:smooth-atlas', version: '1', type: 'Atlas -> o', background: BG_MANIFOLD, source: 'data/cases/02-manifold.md「光滑图册」' },
  { symbol: 'compatible_k', node: 'manifold:compatible-k', version: '1', type: 'Atlas -> Atlas -> N -> o', background: BG_MANIFOLD, source: 'data/cases/02-manifold.md「C^k 兼容」（第 51–57 行）' },
  { symbol: 'max_ext', node: 'manifold:max-k', version: '1', type: 'Atlas -> Atlas', background: BG_MANIFOLD, source: 'data/cases/02-manifold.md「最大 C^k 兼容扩张」（第 59–67 行）' },
  { symbol: 'maximal_ck', node: 'manifold:claim-max', version: '1', type: 'Atlas -> Atlas -> o', background: BG_MANIFOLD, source: 'data/cases/02-manifold.md「最大扩张是 C^k 图册且最大」命题段' },

  /* ---- bg:tensor/1 ---- */
  { symbol: 'tstar', node: 'tensor:dual', version: '1', type: 'VS -> VS', background: BG_TENSOR, source: 'data/cases/03-tensor.md「对偶空间」（V*=Hom(V,F)）' },
  { symbol: 'tpow', node: 'tensor:tensor-product', version: '1', type: 'VS -> N -> VS', background: BG_TENSOR, source: 'data/cases/03-tensor.md「张量积」（第 11–19 行）' },
  { symbol: 'tprod', node: 'tensor:tensor-product', version: '1', type: 'VS -> VS -> VS', background: BG_TENSOR, source: 'data/cases/03-tensor.md「张量积」的 ⊗' },
  { symbol: 'ts', node: 'tensor:tensor-rs', version: '1', type: 'VS -> N -> N -> VS', background: BG_TENSOR, source: 'data/cases/03-tensor.md「(r,s) 型张量空间」（第 21–28 行）' },
  { symbol: 'transforms_as_tensor', node: 'tensor:basis-law', version: '1', type: 'Arr -> o', background: BG_TENSOR, source: 'data/cases/03-tensor.md「换基规律」关键区分段' },
  { symbol: 'tensor_of', node: 'tensor:end-iso', version: '1', type: 'V -> (V -> F) -> Vt', background: BG_TENSOR, source: 'data/cases/03-tensor.md「张量与线性算子的同构」定义段' },
  { symbol: 'Phi', node: 'tensor:end-iso', version: '1', type: 'Vt -> V -> V', background: BG_TENSOR, source: 'data/cases/03-tensor.md「张量与线性算子的同构」' },
  { symbol: 'is_iso', node: 'tensor:end-iso', version: '1', type: '(Vt -> V -> V) -> o', background: BG_TENSOR, source: 'data/cases/03-tensor.md「张量与线性算子的同构」证明段' },
  { symbol: 'multilinear', node: 'tensor:multilinear', version: '1', type: '(V -> V -> F) -> o', background: BG_TENSOR, source: 'data/cases/03-tensor.md「多重线性函数」（第 30–36 行）' },
  { symbol: 'linear_map', node: 'concept:tensor:linear', version: '1', providerKind: 'concept', type: '(V -> V) -> o', background: BG_TENSOR, source: 'data/cases/03-tensor.md「多重线性函数」与「秩一映射保持加法」' },
  { symbol: 'additive', node: 'tensor:rank1-additive', version: '1', type: '(V -> V) -> o', background: BG_TENSOR, source: 'data/cases/03-tensor.md「秩一映射保持加法」机器认证范围段' },
  { symbol: 'rank1', node: 'tensor:rank1-additive', version: '1', type: '(V -> V) -> o', background: BG_TENSOR, source: 'data/cases/03-tensor.md「秩一映射保持加法」机器认证范围段（R(x)=α(x)v）' },
  { symbol: 'finite_dim', node: 'tensor:infinite-rank', version: '1', type: 'VS -> o', background: BG_TENSOR, source: 'data/cases/03-tensor.md「无限维恒等算子反例」（第 103–109 行）' },
  { symbol: 'indexed', node: 'tensor:pattern-index-array', version: '1', type: 'Arr -> o', background: BG_TENSOR, source: 'data/cases/03-tensor.md「误区：所有指标数组都是张量」（第 119–125 行）' },

  /* ---- spec 级定义（不是背景常量，但同样有"谁引入"的问题） ---- */
  { symbol: 'R1', node: 'tensor:rank1-additive', version: '1', type: 'V -> V', background: BG_TENSOR, source: 'data/cases/03-tensor.md「秩一映射保持加法」：令 R(x)=α(x)v', duplicateDefinitions: ['tensor:proof-rank1-additive'] },
];

/** 符号 → 引入方（映射形式；判定器用哪种形状都行）。 */
export const PROVIDES_BY_SYMBOL = Object.fromEntries(
  PROVIDES.map((entry) => [entry.symbol, { ...entry, providerKind: entry.providerKind ?? 'node' }]),
);

/**
 * 没有节点的符号：它们是背景的**算术/代数原语**，四案例里没有任何节点"定义"它们。
 *
 * 显式列出来而不是沉默省略——"没有引入方"是一个**事实**，要能被审计；
 * 否则后来人会把"表里没有"读成"忘了填"。这类符号不产生 `definitionReference`。
 */
export const SYMBOLS_WITHOUT_INTRODUCER = [
  { symbol: 'lt', background: BG_LIMIT, type: 'R -> R -> o', reason: '实数严格序：背景原语，四案例没有节点定义它。' },
  { symbol: 'le', background: BG_LIMIT, type: 'N -> N -> o', reason: '自然数 ≤：背景原语（"最终"的载体），没有节点定义它。' },
  { symbol: 'zero', background: BG_LIMIT, type: 'R', reason: '实数零：背景原语。' },
  { symbol: 'one', background: BG_LIMIT, type: 'N', reason: '自然数 1：背景原语（常值序列验证里的 N=1）。' },
  { symbol: 'add', background: BG_TENSOR, type: 'V -> V -> V', reason: '向量加法：向量空间背景原语，四案例没有"向量空间"节点。' },
  { symbol: 'addF', background: BG_TENSOR, type: 'F -> F -> F', reason: '域加法：背景原语。' },
  { symbol: 'smul', background: BG_TENSOR, type: 'F -> V -> V', reason: '标量作用：背景原语。' },
  { symbol: 'zeroV', background: BG_TENSOR, type: 'V', reason: '零向量：背景原语。' },
  { symbol: 'vt', background: BG_TENSOR, type: 'VS', reason: '一般向量空间对象：用于 ts / tpow / tprod 的下标，没有节点定义它。' },
];

/** 符号 → 引入方；没有引入方返回 `null`（未登记同样是 `null`，调用方用 `SYMBOLS_WITHOUT_INTRODUCER` 区分）。 */
export function providerOf(symbol) {
  return PROVIDES_BY_SYMBOL[symbol] ?? null;
}

/**
 * 引入方**没有 formalSpec** 的那些节点。
 *
 * 这不是错误：§2.11 的 `definitionReference` 确认只需"版本 + 类型核对（不需证书）"，
 * 所以一个真实本体节点可以只引入符号、自己没有形式表达登记。
 * 显式列出来是为了让判定器不必猜"为什么这个引入方查不到 spec"。
 */
export const PROVIDERS_WITHOUT_SPEC = [
  'limit:distance',
  'limit:continuous',
  'manifold:max-k',
  'tensor:dual',
  'tensor:tensor-product',
  'tensor:basis-law',
  'tensor:pattern-index-array',
];

/**
 * `spec.references` 里 `kind: 'definitionReference'` 的条目与 `PROVIDES` 的差异。
 *
 * 2026-10-04 Lead 明确：`references` **不再是判定依据**（判定只认 `PROVIDES` / 定义），
 * 它作为给人读的登记保留。下面这些是两者**对不上**的地方，按 `PROVIDES` 为准；
 * 登记在这里是为了让"以谁为准"有据可查，而不是让两套口径悄悄并存。
 */
export const REFERENCE_PROVIDER_DIVERGENCES = [
  {
    spec: 'manifold:ck-atlas',
    declares: 'references → manifold:transition，symbols [trans, is_ck]',
    verdict: '`trans` 对得上（引入方就是 manifold:transition）；`is_ck` **对不上**——它的定义处是 manifold:ck-atlas 自己（「C^k 图册」条件段），不是过渡映射。',
    resolution: '以 PROVIDES 为准：`is_ck` 不产生指向 manifold:transition 的定义引用。',
  },
  {
    spec: 'manifold:smooth-atlas',
    declares: 'references → manifold:transition，symbols [trans, smooth]',
    verdict: '`trans` 对得上；`smooth` **对不上**——它的定义处是 manifold:smooth-atlas 自己（「光滑图册」）。',
    resolution: '以 PROVIDES 为准：`smooth` 不产生指向 manifold:transition 的定义引用。',
  },
];

/* -------------------------------------------------------------------------- *
 * 9. 原稿口径差异（显式记录，不改原稿）
 * -------------------------------------------------------------------------- */

/** 每条差异都写明：原稿怎么说的、本登记怎么落、为什么、以及**没有**做什么。 */
export const DIVERGENCES = [
  {
    id: 'div:group:right-identity-as-hypothesis',
    node: 'group:claim-injective',
    caseFile: 'data/cases/04-group.md',
    section: 'Cayley 单射片段证书 · 状态',
    original: '理论仅含右单位律；开放假设是对象等式 $L_g=L_h$ 的认证翻译。',
    registration:
      '本登记把右单位律放进 spec 的 `assumptions`（→ 证书 hypotheses），而不是 theory.axioms；'
      + '开放假设 L_g=L_h 同样登记为 assumptions。',
    why:
      '§1.6 的 FormalSpec 没有"本 spec 新增理论公理"字段（内容公理只能来自背景），'
      + '而 §0 要求 theory.axioms 每条都是闭公式并带 witness。把右单位律降为显式假设，'
      + '在证书里作用相同（都是可用前提），却不会让"谁被当成背景"变得含糊。',
    notDone: '没有改原稿，也没有改 bg:group/1 去注入一条右单位律公理。',
  },
  {
    id: 'div:limit:bridge-unverified',
    node: 'limit:bridge',
    caseFile: 'data/cases/01-limit.md',
    section: '两种定义的等价 · 精确边界',
    original: '本页给出完整自然语言证明；机器证书只覆盖其中“常值取值”这一小步。',
    registration: 'SPEC 里 statement 与 claim 都是 `target`；关系 rel:limit:ed-equiv-seq 的 status 是 `unverified`。',
    why: '把自然语言证明登记成 `verified` 会把"人写过证明"与"机器检查过证书"混成同一栏。',
    notDone: '没有生成 equivalentTo 证书，也没有把 choice_principle 写成公理。',
  },
  {
    id: 'div:manifold:atomic-predicates',
    node: 'manifold:chart-atlas / ck-atlas / smooth-atlas / compatible-k / claim-max',
    caseFile: 'data/cases/02-manifold.md',
    section: '图、图册与覆盖 · 边界',
    original: '图册不要求有限，也不要求图之间互不相交。删去一张图后要逐点检查是否仍在其他图内；最大图册指在兼容意义下不能再加入新图的图册，不是“图最多”的任意集合。',
    registration:
      '图册被拆成两半：可写的部分（C^k / C^∞ 的过渡条件）写成公式；'
      + '写不出的部分（开集、覆盖、同胚到 R^n 开集）留作原子谓词 `covers` / `is_atlas`。',
    why: '原稿把开集、限制域、覆盖条件、链式法则都标为「剩余义务」；硬写成公式等于凭空发明集合论接口。',
    notDone: '没有把「最大图册」写成一个假定的真命题符号；`max_ext` 只是原子常量，存在性登记在 UNEXPANDED_OBLIGATIONS。',
  },
  {
    id: 'div:manifold:no-second-countable',
    node: 'manifold:*',
    caseFile: 'data/cases/02-manifold.md',
    section: '拓扑流形 · 直觉',
    original: 'Hausdorff 与第二可数性保证这些局部块不会退化，并且可以整体粘合。',
    registration: '本登记的 `manifold:*` spec 都以 bg:manifold/1 为背景，该背景只有 Set/Atlas/Chart/Map 四个排序。',
    why: '案例 md 提到第二可数但没把它写进任何定义式；本站另一处登记（data/formal-statements.mjs#dg:manifold）明确按「Hausdorff + 局部欧氏」、不含第二可数。本登记不统一两者，只如实记录。',
    notDone: '没有新增第二可数谓词，也没有改 data/formal-statements.mjs。',
  },
  {
    id: 'div:tensor:phi-is-constant',
    node: 'tensor:end-iso',
    caseFile: 'data/cases/03-tensor.md',
    section: '张量与线性算子的同构 · 定义',
    original: '$\\Phi(v\\otimes\\alpha)(w)=\\alpha(w)v$。$(v,\\alpha)\\mapsto(w\\mapsto\\alpha(w)v)$ 对两个变量分别线性，由张量积通用性质唯一诱导线性映射 $\\Phi$。',
    registration: '`Phi` 登记为 bg:tensor/1 的**原子常量**，定义等式写进 statement；诱导它的通用性质没有编码。',
    why: '§1.5 的定义只能是 `kind:\'term\'` 的闭项，而"由通用性质唯一诱导"是一条存在唯一性命题，不是项。',
    notDone: '没有把 `is_iso(Phi)` 写进 assumptions；它只作为 claims 里的 target，并登记在 UNEXPANDED_OBLIGATIONS。',
  },
  {
    id: 'div:group:concrete-carrier-sorts',
    spec: 'formal:group:units5 / formal:group:noncomm',
    caseFile: 'data/cases/04-group.md',
    section: '模 5 乘法单位群 · 验证',
    original: '$\\{1,2,3,4\\}$ 在模 5 乘法下闭合。',
    registration:
      '载体登记为基本类型 `Z5`（{1,2,3,4}）与 `S3`（三个字母上的双射），'
      + '谓词写成具体类型版本 `group_concept_Z5` / `abelian_group_Z5` / `group_concept_S3`；'
      + '一般概念仍用载体排序 `G` 的 `group_concept` / `abelian_group`。',
    why:
      '§1.1 的类型里**没有类型变量**：`ATOM` 就是一个标识符。所以 `group_concept : (G->G->G)->G->(G->G)->o` '
      + '套不进 `mul5 : Z5->Z5->Z5`。把 Z5 直接写成 G 会让「模 5 单位群是一个群」变成'
      + '「某个抽象 G 上的群」，恰好丢掉这条实例登记的意义（Lead 2026-10-04 指出）。',
    notDone:
      '没有把 `Z5` / `S3` 改写成 `G`，也没有新增类型变量或参数化谓词——那要改类型系统（§1.1），不在本轮范围。',
  },
  {
    id: 'div:limit:atomic-expansion',
    node: 'limit:seq-conv / limit-ed / limit-seq',
    caseFile: 'data/cases/01-limit.md',
    section: '序列收敛 / 函数极限的 ε–δ 定义',
    original: '$x_n\\to a \\iff \\forall \\varepsilon>0\\ \\exists N\\ \\forall n\\ge N,\\ |x_n-a|<\\varepsilon.$',
    registration: '谓词 `seq_conv` 是原子的；定义式逐字保存在 bg:limit/1 对应常量的 `expansion` 字段里。',
    why: '§1.5 只允许 term 定义，公式无法命名。这是**编码层次**的差异，不是数学差异。',
    notDone: '没有弱化定义式，也没有声称已证任何收敛。',
  },
];

/* -------------------------------------------------------------------------- *
 * 10. 覆盖与模板
 * -------------------------------------------------------------------------- */

/**
 * `server/api.mjs` 的 `/api/v2/formal/catalog` 直接用这个值；
 * 形状与那份文件里的 `reportFormalCoverage` 回退实现一致：
 * `{ case, nodes, specs, specNodes, missing, note }`。
 */
export function formalCoverage(ontology) {
  const nodes = ontology?.raw?.nodes ?? ontology?.nodes ?? [];
  if (!Array.isArray(nodes) || nodes.length === 0) return [];
  const cases = new Map();
  for (const node of nodes) {
    const caseId = node.case ?? 'unknown';
    if (!cases.has(caseId)) cases.set(caseId, []);
    cases.get(caseId).push(node.id);
  }
  return [...cases.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([caseId, ids]) => {
      const specNodes = ids.filter((id) => SPEC_BY_NODE.has(id));
      return {
        case: caseId,
        nodes: ids.length,
        specs: specNodes.length,
        specNodes,
        missing: ids.filter((id) => !SPEC_BY_NODE.has(id)),
        note: '已登记形式表达的节点；其余节点本轮未写——未登记不等于不重要。',
      };
    });
}

/** 四案例各自的登记条数（不依赖本体，纯登记侧统计）。 */
export function coverageByCase() {
  const counts = {};
  for (const spec of specs) {
    const caseId = spec.node.includes(':') ? spec.node.slice(0, spec.node.indexOf(':')) : 'unknown';
    counts[caseId] = (counts[caseId] ?? 0) + 1;
  }
  return counts;
}

function joinSources(items, pick) {
  return items.map(pick).filter((text) => typeof text === 'string' && text.length > 0).join('\n');
}

/**
 * 编辑页的模板：每条 spec 一个，`draft` 是 `Partial<AuthoringDraft>`
 * （形状对齐 `shared/formal.d.ts#FormalCatalog.templates`）。
 */
export function formalTemplates() {
  return specs.map((spec) => ({
    id: `tpl:${specIdOf(spec.node)}`,
    case: spec.node.slice(0, spec.node.indexOf(':')),
    title: `${spec.node} 的形式表达`,
    note: `来源：${spec.source}`,
    draft: {
      id: `tpl:${specIdOf(spec.node)}`,
      name: `${spec.node}（形式表达模板）`,
      construct: templateConstruct(spec),
      case: spec.node.slice(0, spec.node.indexOf(':')),
      summary: spec.statement.source,
      reading: spec.boundary[0] ?? '',
      background: normalizeBackgroundId(spec.background),
      specSource: {
        declarations: joinSources(spec.declarations, (item) => `${item.name} : ${item.type}`),
        definitions: joinSources(spec.definitions, (item) => `${item.name} : ${item.type} = ${item.source}`),
        assumptions: joinSources(spec.assumptions, (item) => item.source),
        statement: spec.statement.source,
        claims: joinSources(spec.claims, (item) => item.source),
      },
    },
  }));
}

const CONSTRUCT_BY_SUFFIX = [
  ['pattern-', 'Counterexample'],
  ['proof-', 'Proof'],
  ['claim-', 'Theorem'],
  ['bridge', 'Theorem'],
  ['cayley', 'Theorem'],
  ['units5', 'Example'],
  ['noncomm', 'Counterexample'],
  ['group-concept', 'Definition'],
  ['tensor-rs', 'Definition'],
  ['multilinear', 'Definition'],
  ['seq-conv', 'Definition'],
  ['limit-ed', 'Definition'],
  ['limit-seq', 'Definition'],
  ['chart-atlas', 'Definition'],
  ['transition', 'Definition'],
  ['ck-atlas', 'Definition'],
  ['smooth-atlas', 'Definition'],
  ['compatible-k', 'Definition'],
  ['constant-seq', 'Example'],
  ['rank1-additive', 'Theorem'],
  ['end-iso', 'Theorem'],
  ['infinite-rank', 'Counterexample'],
  ['non-tensor-gamma', 'Counterexample'],
  ['left-mul', 'Definition'],
];

function templateConstruct(spec) {
  const tail = spec.node.slice(spec.node.indexOf(':') + 1);
  for (const [suffix, construct] of CONSTRUCT_BY_SUFFIX) {
    if (tail === suffix || tail.endsWith(suffix)) return construct;
  }
  return 'Concept';
}

/** 一次性拿到全部登记侧数据（测试与调试用）。 */
export function registrySummary() {
  return {
    specCount: specs.length,
    nodeCount: SPEC_BY_NODE.size,
    coverage: coverageByCase(),
    relationCount: RELATIONS.length,
    relationKinds: [...new Set(RELATIONS.map((item) => item.kind))].sort(),
    conceptSpecCount: CONCEPT_SPECS.length,
    providesCount: PROVIDES.length,
    symbolsWithoutIntroducer: SYMBOLS_WITHOUT_INTRODUCER.length,
    providersWithoutSpec: PROVIDERS_WITHOUT_SPEC.length,
    referenceDivergences: REFERENCE_PROVIDER_DIVERGENCES.length,
    conceptRelationCount: CONCEPT_RELATIONS.length,
    crosswalkCount: SOURCE_CROSSWALK.length,
    obligationCount: UNEXPANDED_OBLIGATIONS.length,
    alphaVariantCount: ALPHA_VARIANTS.length,
    instanceCount: REGISTERED_INSTANCES.length,
    hashBackend: HASH_BACKEND,
    hashBackends: hashBackends(),
    backgrounds: [...new Set(specs.map((spec) => normalizeBackgroundId(spec.background)))].sort(),
    knownBackgrounds: specs.every((spec) => hasBackground(spec.background)),
  };
}
