/**
 * 受限形式语言的词法 / 语法 / 规范化（`core/formal/language.mjs`）。
 *
 * **为什么要有这一层**：自动关系发现要产出「能被检查器接受的证书」，而证书里的
 * 每一个字节都必须落在 `mcs-foundations/validation/certification/kernel.py` 认识的
 * 形状里。人工登记的数学表达（`∀a b. mul a b = mul b a`）与内核形状（`['all', …]`）
 * 之间必须有一座**唯一**的桥：所有解析、别名归一、类型推断、α 规范都在这里做，
 * 下游模块只搬运结果，不自己拼公式。规格见 `docs/自动关系发现-接口与语言规格.md`
 * §1（语言）与 §2.1（签名）。
 *
 * 三种「语言」在同一个文件里各就各位，别混：
 * - **类型语言**：`G -> G -> o`，右结合，落到内核的类型树（`'G'` 或 `['->',a,b]`）；
 * - **项语言（对象语言）**：λ 项，落到内核的**规范形状**：绑定变量用 de Bruijn
 *   `['b', i, ty]`，自由变量 `['v', name, ty]`，常量 `['c', name]`，逻辑常元
 *   `['logic', op]` / `['logic', op, ty]`。因此 λ 绑定改名在项上是**恒等**的；
 * - **公式语言（认证语言）**：`true/false/=/∧/⇒/⇔/∀/∃/¬`，量词绑定**保留名字**
 *   （内核的 `formula_ok` 就长这样），`¬a` 展开为 `a ⇒ false`，`⇔` 展开为两个蕴含，
 *   `let` 在解析期直接代入消去。
 *
 * 三条硬边界（写死在实现里，不靠调用方自觉）：
 * 1. **不接受析取**：内核没有 `or_i`/`or_e`，`or` 可表示但无规则；`∨`/`or` 一律报
 *    `unsupported`，不假装能证。
 * 2. **不新增基本公理**：本层只解析与规范化，公理只能来自 `theory.mjs` 的
 *    `H_SCHEMAS` 白名单。
 * 3. **错误一律 `McsError(CODES.BAD_REQUEST, …, 400, {line, column, token})`**；
 *    规格里那些更细的子原因（`undeclared-type`、`cyclic-definition`、`type-mismatch`…）
 *    放在 `details.reason`，不挤掉三件套。
 *
 * 证据状态：本文件是 `DEF`（语法与接口是定义）；能被 `kernel.py` 接受这一条由
 * `tests/formal-language.test.mjs` 的真实子进程调用核验（`FINITE`）。
 */
import { McsError, CODES } from '../../shared/errors.mjs';
import { digest } from './codec.mjs';

/** 本层实现的规格版本；写进 `formalSpec.specVersion`，与 `docs/…规格.md` §1 对应。 */
export const FORMAL_LANGUAGE_VERSION = 'mcs-formal/1';

/**
 * 类型别名表（§1.1）。键是**书写形式**，值是**规范原子**。
 *
 * 恒等映射（`o: 'o'`、`Set: 'Set'`…）也列进来，这样 `Object.keys(TYPE_ALIASES)`
 * 就是一份「已登记载体」清单，前端符号选择器可以直接用。
 */
export const TYPE_ALIASES = Object.freeze({
  o: 'o', bool: 'o', Bool: 'o', Prop: 'o', prop: 'o', 命题: 'o', 真值: 'o',
  N: 'N', Nat: 'N', ℕ: 'N', 自然数: 'N',
  R: 'R', Real: 'R', ℝ: 'R', 实数: 'R',
  Set: 'Set', 集合: 'Set',
  Group: 'Group', 群: 'Group',
  Ring: 'Ring', 环: 'Ring',
  Field: 'Field', 域: 'Field',
  Top: 'Top', 拓扑空间: 'Top',
  Manifold: 'Manifold', 流形: 'Manifold',
  Tensor: 'Tensor', 张量: 'Tensor',
  I: 'I', 区间: 'I',
  V: 'V', 'V*': 'V*',
});

/**
 * 语言接受的算子清单（目录接口 `GET /api/v2/formal/catalog` 的 `operators`）。
 *
 * `note` 是给编辑页显示的人话；**被拒绝的记号单独标出来**，不然符号选择器会
 * 诱导用户写出内核没有规则的东西。
 */
export const FORMAL_OPERATORS = Object.freeze([
  { token: '=', alias: [], note: '相等：对象语言里是逻辑常元 eq（要带类型参数），公式里写作 x = y。' },
  { token: '∧', alias: ['/\\', 'and'], note: '合取。规范形式**不重排**：a ∧ b ∧ c 右结合，换序要另出证书。' },
  { token: '⇒', alias: ['->', '=>', 'imp'], note: '蕴含，右结合。' },
  { token: '⇔', alias: ['<=>', 'iff'], note: '等价，展开为两个方向的蕴含的合取。' },
  { token: '¬', alias: ['not'], note: '否定，展开为 a ⇒ false。' },
  { token: '∀', alias: ['forall'], note: '全称量词。证书里绑定变量按出现次序 α 规范为 z0, z1, …。' },
  { token: '∃', alias: ['exists'], note: '存在量词。' },
  { token: 'λ', alias: ['lam'], note: '抽象；内核形状里绑定变量用 de Bruijn，改名不改变规范形式。' },
  { token: 'let', alias: [], note: '局部缩写，解析期直接代入消去，不产生 β 步。' },
  { token: 'true', alias: [], note: '真值常元（对象语言，类型 o）。公式里的 ⊤ 写成 t = true，即 B(t)。' },
  { token: 'false', alias: [], note: '公式语言的假；内核没有 false_e，因此 false 只能作为结论以外的位置出现。' },
  { token: '∨', alias: ['or'], note: '**不接受**：内核没有析取规则，报 unsupported，不假装能证。', rejected: true },
]);

/**
 * 已登记的类型载体（目录接口的 `boundedTypes`）。
 *
 * 「有限」二字的含义是**首版只保证这些载体的解析与展示**；`N`/`R` 这类无限结构
 * 不做自动模型搜索，有限反例只反驳「该背景下的蕴含」，不冒充完整数学结论（§2.12）。
 */
export const FORMAL_BOUNDED_TYPES = Object.freeze([
  { name: 'o', note: '真值类型，必须存在。' },
  { name: 'Set', note: '对象集/载体，可作类型原子使用。' },
  { name: 'I', note: '个体/指标类型，代数背景里的默认基底。' },
  { name: 'G', note: '群载体；群背景 `bg:group/1` 预置。' },
  { name: 'N', note: '自然数：只做符号推理，不以有限样本冒充完整模型。' },
  { name: 'R', note: '实数：同上，有限反模型不推翻实数结论。' },
  { name: 'V', note: '向量空间载体；张量背景预置。' },
  { name: 'M', note: '流形载体；流形背景预置。' },
]);

/** 发现运行的预算（§3）。整批到点返回部分结果，不 silently 丢弃已完成项。 */
export const FORMAL_BUDGETS = Object.freeze({
  maxCandidates: 100,
  perCandidateMs: 2000,
  totalMs: 30000,
  depth: 8,
  maxStates: 10000,
});

/* ==========================================================================
 * 一、记号与词法
 * ======================================================================== */

/** 标识符：字母（含中日韩与数学字母数字符号）+ 下划线开头。 */
const IDENT_RE = /[\p{L}_][\p{L}\p{N}_'′₀-₉]*/uy;

/** 多字符记号必须放在单字符前面，按长度从长到短匹配。 */
const SYMBOLS = Object.freeze(['<=>', '->', '=>', '/\\', '∧', '∨', '⇒', '⇔', '∀', '∃', '¬', 'λ', '(', ')', ',', '.', ':', '=', '·']);

/** 公式语言里的关键字（在项位置出现时多半是写错了）。 */
const FORMULA_KEYWORDS = new Set(['forall', 'exists', 'iff', 'or', 'in', 'def']);

/**
 * 逻辑常元（内核 `['logic', op]` / `['logic', op, ty]`）。
 *
 * `null` 表示「需要一个类型参数」——`eq`/`all`/`ex` 的类型参数由类型推断补，
 * 补不出来就报 `undeclared-type`（例如孤零零一个 `eq` 不构成一个项）。
 */
const LOGIC_CONSTANTS = Object.freeze({ true: null, false: null, not: null, and: null, imp: null, eq: true, all: true, ex: true });

/** 在项位置直接拒绝的记号：内核没有对应规则，与其给出似是而非的形状，不如明说。 */
const REJECTED_IN_TERM = Object.freeze({
  or: '首版不接受析取：内核没有 or 的引入/消去规则。',
  iff: '项语言里没有 ⇔；请在公式里写 ⇔，或直接用 and(imp(a,b), imp(b,a))。',
  forall: '项语言里没有 ∀；请用 all(T)(P) 或改用公式。',
  exists: '项语言里没有 ∃；请用 ex(T)(P) 或改用公式。',
});

/** 抛出规格约定的错误：三件套 + 子原因。 */
function failAt(message, position, reason, extra = undefined) {
  throw new McsError(CODES.BAD_REQUEST, message, 400, {
    line: position?.line ?? null,
    column: position?.column ?? null,
    token: position?.token ?? null,
    ...(reason ? { reason } : {}),
    ...(extra ?? {}),
  });
}

function tokenPosition(tok) {
  return { line: tok?.line ?? null, column: tok?.column ?? null, token: tok?.token ?? null };
}

function describeToken(tok) {
  if (!tok || tok.kind === 'eof') return '输入结束';
  return `“${tok.token}”`;
}

/** 把子串内的行列平移到整份文本的坐标系（`parseType(source, position)` 用）。 */
function shiftPosition(pos, base) {
  if (!base || typeof base !== 'object') return pos;
  const line = (base.line ?? 1) + pos.line - 1;
  const column = pos.line === 1 ? (base.column ?? 1) + pos.column - 1 : pos.column;
  return { line, column, token: pos.token };
}

function tokenize(source) {
  const tokens = [];
  let index = 0;
  let line = 1;
  let column = 1;
  const bump = (text) => {
    for (const ch of text) {
      if (ch === '\n') { line += 1; column = 1; } else { column += 1; }
    }
  };
  while (index < source.length) {
    const ch = source[index];
    if (ch === '\n' || ch === ' ' || ch === '\t' || ch === '\r') {
      index += 1;
      if (ch === '\n') { line += 1; column = 1; } else { column += 1; }
      continue;
    }
    const symbol = SYMBOLS.find((candidate) => source.startsWith(candidate, index));
    if (symbol) {
      tokens.push({ kind: 'symbol', value: symbol, token: symbol, line, column });
      index += symbol.length;
      bump(symbol);
      continue;
    }
    IDENT_RE.lastIndex = index;
    const match = IDENT_RE.exec(source);
    if (match && match.index === index) {
      tokens.push({ kind: 'ident', value: match[0], token: match[0], line, column });
      index += match[0].length;
      bump(match[0]);
      continue;
    }
    failAt(`无法识别的字符 ${JSON.stringify(ch)}`, { line, column, token: ch }, 'unexpected-token');
  }
  // 结尾记号没有「文本」，token 记为 null（而不是空串），免得调用方把 '' 当成一个真记号。
  tokens.push({ kind: 'eof', value: '', token: null, line, column });
  return tokens;
}

/** 递归下降的嵌套上限。合法数学表达式的嵌套远低于此；超过它的输入只会是攻击或笔误。 */
const MAX_NESTING = 256;

function makeParser(source, base) {
  let raw;
  try {
    raw = tokenize(String(source ?? ''));
  } catch (error) {
    // 词法错误也要落在调用方给的坐标系里（`parseType(src, {line, column})`）。
    if (base && error instanceof McsError && error.details) {
      throw new McsError(CODES.BAD_REQUEST, error.message, 400, { ...error.details, ...shiftPosition(error.details, base) });
    }
    throw error;
  }
  // 记号的行列一次平移到调用方坐标系，之后所有报错都不用再管偏移。
  const tokens = base ? raw.map((tok) => ({ ...tok, ...shiftPosition(tok, base) })) : raw;
  let cursor = 0;
  const api = {
    get index() { return cursor; },
    set index(value) { cursor = value; },
    peek(offset = 0) { return tokens[Math.min(cursor + offset, tokens.length - 1)]; },
    next() { const tok = tokens[cursor]; if (cursor < tokens.length - 1) cursor += 1; return tok; },
    atSymbol(value) { const tok = api.peek(); return tok.kind === 'symbol' && tok.value === value; },
    atIdent(value) { const tok = api.peek(); return tok.kind === 'ident' && tok.value === value; },
    atEof() { return api.peek().kind === 'eof'; },
    expectSymbol(value, why) {
      const tok = api.peek();
      if (!(tok.kind === 'symbol' && tok.value === value)) failAt(`${why}（应为 “${value}”，实际是 ${describeToken(tok)}）`, tokenPosition(tok), 'syntax');
      return api.next();
    },
    expectEof(what) {
      const tok = api.peek();
      if (tok.kind === 'eof') return;
      const reason = tok.value === '∨' || tok.value === 'or' ? 'unsupported' : 'syntax';
      failAt(`${what}：多余的记号 ${describeToken(tok)}${reason === 'unsupported' ? '——首版不接受析取（内核没有 or 规则）' : ''}`, tokenPosition(tok), reason);
    },
    /*
     * 嵌套深度守卫（2026-10 加）。
     *
     * 递归下降的每一层括号都要占栈：`"(".repeat(2000) + "P(x)" + ")".repeat(2000)`
     * 只有约 4 KB，远低于 2 MB 的请求体上限，却能稳定打出 `RangeError: Maximum call
     * stack size exceeded`——请求层把它包成 500「服务器内部错误」，用户看到的是
     * 「服务器坏了」，而不是「你写的表达式太深」。这里给一个软上限，
     * 超过就报 `resource_exhausted`（可恢复：少嵌几层再来）。
     */
    depth: 0,
    enter() {
      if (api.depth >= MAX_NESTING) failAt(`表达式嵌套过深（超过 ${MAX_NESTING} 层）`, tokenPosition(api.peek()), 'resource_exhausted');
      api.depth += 1;
    },
    leave() { api.depth = Math.max(0, api.depth - 1); },
  };
  return api;
}

/* ==========================================================================
 * 二、类型
 * ======================================================================== */

function normalizeTypeAtom(name) {
  return Object.prototype.hasOwnProperty.call(TYPE_ALIASES, name) ? TYPE_ALIASES[name] : name;
}

/** 类型原子/箭头树的深比较。 */
export function typeEquals(a, b) {
  if (typeof a === 'string' || typeof b === 'string') return a === b;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  return a[0] === b[0] && typeEquals(a[1], b[1]) && typeEquals(a[2], b[2]);
}

/** 内核口径的类型树 -> 书写形式；左嵌套加括号，右结合不加。未解出的元变量写作 `?n`。 */
export function typeToString(typeNode) {
  if (typeof typeNode === 'string') return typeNode;
  if (isMetaType(typeNode)) return `?${typeNode.meta}`;
  if (!Array.isArray(typeNode) || typeNode[0] !== '->') return String(typeNode);
  const left = typeof typeNode[1] === 'string' ? typeNode[1] : `(${typeToString(typeNode[1])})`;
  return `${left} -> ${typeToString(typeNode[2])}`;
}

/** 收集类型树里的类型原子（`buildKernelTheory` 用它登记 `bases`）。 */
export function typeAtomsOf(typeNode, into = new Set()) {
  if (typeof typeNode === 'string') { into.add(typeNode); return into; }
  if (Array.isArray(typeNode)) { typeAtomsOf(typeNode[1], into); typeAtomsOf(typeNode[2], into); }
  return into;
}

/** 收集类型树里出现的箭头类型本身（外延性公理实例按它物化）。 */
export function arrowTypesOf(typeNode, into = []) {
  if (Array.isArray(typeNode)) {
    into.push(typeNode);
    arrowTypesOf(typeNode[1], into);
    arrowTypesOf(typeNode[2], into);
  }
  return into;
}

function parseTypeExpr(p) {
  p.enter();
  try {
    const left = parseTypeAtom(p);
    if (p.atSymbol('->')) {
      p.next();
      return ['->', left, parseTypeExpr(p)];
    }
    return left;
  } finally { p.leave(); }
}

function parseTypeAtom(p) {
  const tok = p.peek();
  if (tok.kind === 'symbol' && tok.value === '(') {
    p.enter();
    try {
      p.next();
      const inner = parseTypeExpr(p);
      p.expectSymbol(')', '类型缺少右括号');
      return inner;
    } finally { p.leave(); }
  }
  if (tok.kind === 'ident') {
    p.next();
    return normalizeTypeAtom(tok.value);
  }
  failAt(`类型解析：意外的记号 ${describeToken(tok)}`, tokenPosition(tok), 'syntax');
  return null;
}

/**
 * 解析类型（§1.1）：`type := ATOM | type '->' type`，右结合，`->` 优先级最低。
 *
 * `position` 可给 `{line, column}`，此时报错的行列会平移到整份文本的坐标系；
 * 不给就按 `source` 自身的第 1 行第 1 列计数。
 */
export function parseType(source, position) {
  const p = makeParser(source, position);
  const node = parseTypeExpr(p);
  p.expectEof('类型解析');
  return node;
}

/* ==========================================================================
 * 三、解析作用域：元变量、合一、位置
 * ======================================================================== */

const isMetaType = (t) => Boolean(t) && typeof t === 'object' && !Array.isArray(t) && Number.isInteger(t.meta);

/**
 * 类型元变量的编号**全局唯一**。
 *
 * 为什么不能用「每个作用域从 0 开始」：合一的替换表只认 id，一旦两棵在不同作用域里
 * 推断过的树碰到一起（例如 `formulaToTerm` 要把公式里的项重新推一遍类型），
 * 两个不同来源的 `{meta: 0}` 会被当成同一个变量，于是本该绑定的地方直接跳过、
 * 报出一条莫名其妙的「G -> G ≠ G」。全局序号把这类错误从根上消掉。
 */
let META_SEQUENCE = 0;

function isArrow(t) { return Array.isArray(t) && t[0] === '->'; }

/**
 * 类型输入的宽容归一：**输入侧**允许写字符串（`'G -> G -> o'`、`'G'`），
 * 落地一律是 kernel 口径的类型树。这样调用方不必记住「哪一层要哪种形状」。
 */
export function coerceTypeNode(value) {
  if (typeof value !== 'string') return value;
  return /[->()]/.test(value) ? parseType(value) : value;
}

function makeScope(ctx = {}) {
  const constants = new Map();
  const definitions = new Map();
  for (const [name, type] of Object.entries(ctx.constants ?? {})) constants.set(name, coerceTypeNode(type));
  for (const def of ctx.definitions ?? []) {
    if (!def || typeof def.name !== 'string') continue;
    const type = coerceTypeNode(def.type);
    if (type) definitions.set(def.name, type);
  }
  return {
    bases: [...(ctx.bases ?? [])],
    constants,
    definitions,
    strict: ctx.strict === true,
    /** 元变量位置表：id -> {line, column, token, why}（全局唯一 id，回退时无需清理）。 */
    metaPos: new Map(),
    constraints: [],
    /** 自由变量表：name -> { term, pos }，同名共用同一个 `['v',…]` 节点。 */
    free: new Map(),
    /** λ/let 绑定栈（de Bruijn 只数这一栈）。 */
    bound: [],
    /** 公式量词绑定栈（具名，内核的公式语言就是这么存的）。 */
    named: [],
    usedNames: new Set([...constants.keys(), ...definitions.keys()]),
    /** 节点 -> 记号位置。WeakMap 不参与序列化，也不影响哈希。 */
    pos: new WeakMap(),
  };
}

function freshMetaType(scope, position, why) {
  const id = META_SEQUENCE;
  META_SEQUENCE += 1;
  scope.metaPos.set(id, { ...(position ?? {}), why });
  return { meta: id };
}

function positionOf(scope, node) {
  return scope.pos.get(node) ?? null;
}

function snapshotState(p, scope) {
  return {
    index: p.index,
    constraints: scope.constraints.length,
    bound: scope.bound.length,
    named: scope.named.length,
    free: new Map(scope.free),
    usedNames: new Set(scope.usedNames),
  };
}

function restoreState(p, scope, snap) {
  p.index = snap.index;
  // 回退期间新建的元变量不会再被引用（id 全局唯一、不复用），因此不必回收，只需截断约束。
  scope.constraints.length = snap.constraints;
  scope.bound.length = snap.bound;
  scope.named.length = snap.named;
  scope.free = snap.free;
  scope.usedNames = snap.usedNames;
}

function resolveTypeTree(type, subst) {
  if (isMetaType(type)) {
    const bound = subst.get(type.meta);
    return bound === undefined ? type : resolveTypeTree(bound, subst);
  }
  if (isArrow(type)) return ['->', resolveTypeTree(type[1], subst), resolveTypeTree(type[2], subst)];
  return type;
}

function occursIn(meta, type, subst) {
  const resolved = resolveTypeTree(type, subst);
  if (isMetaType(resolved)) return resolved.meta === meta.meta;
  if (isArrow(resolved)) return occursIn(meta, resolved[1], subst) || occursIn(meta, resolved[2], subst);
  return false;
}

/** 一阶合一（只对类型）：失败即抛出带位置的类型错误。 */
function unifyTypes(left, right, subst, position, context) {
  const a = resolveTypeTree(left, subst);
  const b = resolveTypeTree(right, subst);
  if (isMetaType(a) && isMetaType(b) && a.meta === b.meta) return;
  if (isMetaType(a)) {
    if (occursIn(a, b, subst)) failAt(`类型方程无解（自指）：${typeToString(a)} = ${typeToString(b)}`, position, 'type-mismatch', { context });
    subst.set(a.meta, b);
    return;
  }
  if (isMetaType(b)) {
    if (occursIn(b, a, subst)) failAt(`类型方程无解（自指）：${typeToString(a)} = ${typeToString(b)}`, position, 'type-mismatch', { context });
    subst.set(b.meta, a);
    return;
  }
  if (typeof a === 'string' || typeof b === 'string') {
    if (a !== b) failAt(`类型不匹配：${typeToString(a)} ≠ ${typeToString(b)}`, position, 'type-mismatch', { context });
    return;
  }
  unifyTypes(a[1], b[1], subst, position, context);
  unifyTypes(a[2], b[2], subst, position, context);
}

function solveConstraints(scope) {
  const subst = new Map();
  for (const constraint of scope.constraints) {
    try {
      unifyTypes(constraint.left, constraint.right, subst, constraint.position, constraint.context);
    } catch (error) {
      // 「同一自由语境里同名异类型」在实现上就是一次合一失败；这里把它翻译回人话，
      // 否则用户只会看到「H ≠ G」而不知道是哪个名字被用了两次。
      if (constraint.variableName && error instanceof McsError) {
        throw new McsError(CODES.BAD_REQUEST, `同一自由语境里同名异类型：${constraint.variableName}（${error.message}）`, 400, {
          ...error.details, reason: 'type-mismatch', variable: constraint.variableName,
        });
      }
      throw error;
    }
  }
  return subst;
}

/** 内核 `logical_type` 的 Node 版：逻辑常元的类型。 */
function logicalTypeOf(node) {
  const op = node[1];
  if (['true', 'false', 'not', 'and', 'or', 'imp'].includes(op)) {
    return {
      true: 'o', false: 'o', not: ['->', 'o', 'o'],
      and: ['->', 'o', ['->', 'o', 'o']],
      or: ['->', 'o', ['->', 'o', 'o']],
      imp: ['->', 'o', ['->', 'o', 'o']],
    }[op];
  }
  const atom = node[2];
  if (op === 'eq') return ['->', atom, ['->', atom, 'o']];
  return ['->', ['->', atom, 'o'], 'o'];
}

/**
 * 内核 `infer` 的 Node 版（对象项的类型推断）。
 *
 * 与 `kernel.infer` 的唯一区别：类型原子可以是**未解出的元变量**，此时
 * 把「必须相等」记成约束，等解析完整棵树再一次性合一——这样
 * `∀a b. mul a b = mul b a` 这种不写注释的写法也能推断出来。
 */
function inferTermType(node, scope, constraints) {
  if (!Array.isArray(node)) failAt('类型推断：不是合法的项', null, 'syntax');
  switch (node[0]) {
    case 'v': return node[2];
    case 'b': return node[2];
    case 'c': {
      const type = scope.constants.get(node[1]) ?? scope.definitions.get(node[1]);
      if (!type) failAt(`未声明的常量 ${node[1]}`, positionOf(scope, node), 'unknown-symbol');
      return type;
    }
    case 'logic': return logicalTypeOf(node);
    case 'lam': return ['->', node[1], inferTermType(node[2], scope, constraints)];
    case 'app': {
      const head = inferTermType(node[1], scope, constraints);
      const arg = inferTermType(node[2], scope, constraints);
      const result = freshMetaType(scope, positionOf(scope, node), '应用的结果类型');
      const argumentName = node[2]?.[0] === 'v' && scope.free.has(node[2][1]) ? node[2][1] : null;
      constraints.push({ left: head, right: ['->', arg, result], position: positionOf(scope, node), context: '应用', variableName: argumentName });
      return result;
    }
    case 'lift': {
      // 只有 `term_type` 才该碰到 lift；这里保守处理：lift 的类型就是它抽象体的类型。
      if (node[1] && node[1][0] === 'lam') return inferTermType(node[1], scope, constraints);
      failAt('lift 的第一个分量必须是 λ 抽象', positionOf(scope, node), 'type-mismatch');
      return null;
    }
    default:
      failAt(`不支持的项构造子 ${String(node[0])}`, positionOf(scope, node), 'unsupported');
      return null;
  }
}

/** 把解出的类型回填进整棵树；仍有未解出的元变量就报 `undeclared-type`。 */
function applyTypes(node, subst, scope) {
  if (!Array.isArray(node)) return node;
  const resolve = (type, node_) => {
    const out = resolveTypeTree(type, subst);
    const pending = firstPendingMeta(out);
    if (pending !== null) {
      const where = scope.metaPos.get(pending) ?? positionOf(scope, node_);
      failAt(`无法推断类型${where?.why ? `（${where.why}）` : ''}：请写类型注释，例如 “x : G”`, where, 'undeclared-type');
    }
    return out;
  };
  switch (node[0]) {
    case 'v': case 'b': return [node[0], node[1], resolve(node[2], node)];
    case 'c': return node;
    case 'logic': return node.length > 2 ? ['logic', node[1], resolve(node[2], node)] : node;
    case 'lam': return ['lam', resolve(node[1], node), applyTypes(node[2], subst, scope)];
    case 'app': return ['app', applyTypes(node[1], subst, scope), applyTypes(node[2], subst, scope)];
    case 'lift': return ['lift', applyTypes(node[1], subst, scope), node[2].map((param) => applyTypes(param, subst, scope))];
    case 'eq': return ['eq', applyTypes(node[1], subst, scope), applyTypes(node[2], subst, scope)];
    case 'and': case 'or': case 'imp': return [node[0], applyTypes(node[1], subst, scope), applyTypes(node[2], subst, scope)];
    case 'all': case 'ex': return [node[0], [node[1][0], node[1][1], resolve(node[1][2], node[1])], applyTypes(node[2], subst, scope)];
    case 'false': return node;
    default: return node;
  }
}

function firstPendingMeta(type) {
  if (isMetaType(type)) return type.meta;
  if (isArrow(type)) return firstPendingMeta(type[1]) ?? firstPendingMeta(type[2]);
  return null;
}

/* ==========================================================================
 * 四、项语言
 * ======================================================================== */

/** λ 绑定名的「提示」：de Bruijn 形状不存名字，但可读预览要名字。WeakMap 不进序列化。 */
const LAM_NAME_HINTS = new WeakMap();

function isFormulaKeyword(name) { return FORMULA_KEYWORDS.has(name); }

function startsAtom(p) {
  const tok = p.peek();
  if (tok.kind === 'symbol') return tok.value === '(' || tok.value === 'λ';
  if (tok.kind !== 'ident') return false;
  const name = tok.value;
  if (name === 'lam' || name === 'let') return true;
  if (name === 'and' || name === 'imp' || name === 'not') {
    const after = p.peek(1);
    return after.kind === 'symbol' && after.value === '(';
  }
  if (isFormulaKeyword(name) || name === 'or') return false;
  return true;
}

/** 判断紧跟的 `(` 是「逗号参数表」还是「普通括号项」。 */
function hasTopLevelComma(p) {
  let depth = 0;
  for (let offset = 0; offset < 4096; offset += 1) {
    const tok = p.peek(offset);
    if (tok.kind === 'eof') return false;
    if (tok.kind === 'symbol') {
      if (tok.value === '(') depth += 1;
      else if (tok.value === ')') { depth -= 1; if (depth === 0) return false; }
      else if (tok.value === ',' && depth === 1) return true;
    }
  }
  return false;
}

function makeApp(head, arg, scope, position) {
  const node = ['app', head, arg];
  if (position) scope.pos.set(node, position);
  return node;
}

function resolveIdentifier(tok, scope) {
  const name = tok.value;
  for (let i = scope.bound.length - 1; i >= 0; i -= 1) {
    if (scope.bound[i].name === name) return ['b', scope.bound.length - 1 - i, scope.bound[i].type];
  }
  // 量词绑定可能被改过名（避开常量与同名遮蔽），所以按「源名」也要认——
  // 否则 `∀a0. P(a0) ∧ ∀a0. Q(a0)` 里第二个 a0 的绑定量词被改名为 a0_1，
  // 而它体里的 a0 找不到绑定，悄悄变成自由变量，最后报成「不是闭公式」这种指不到原因的错误。
  for (let i = scope.named.length - 1; i >= 0; i -= 1) {
    const entry = scope.named[i];
    if (entry.name === name || entry.source === name) return ['v', entry.name, entry.type];
  }
  if (Object.prototype.hasOwnProperty.call(REJECTED_IN_TERM, name)) {
    failAt(`项语言不接受 “${name}”：${REJECTED_IN_TERM[name]}`, tokenPosition(tok), 'unsupported');
  }
  if (Object.prototype.hasOwnProperty.call(LOGIC_CONSTANTS, name)) {
    if (LOGIC_CONSTANTS[name] === true) {
      const node = ['logic', name, freshMetaType(scope, tokenPosition(tok), `逻辑常元 ${name} 的类型参数`)];
      scope.pos.set(node, tokenPosition(tok));
      return node;
    }
    return ['logic', name];
  }
  if (scope.constants.has(name)) return ['c', name];
  if (scope.definitions.has(name)) return ['c', name];
  const existing = scope.free.get(name);
  if (existing) return existing.term;
  const node = ['v', name, freshMetaType(scope, tokenPosition(tok), `自由变量 ${name}`)];
  scope.free.set(name, { term: node, pos: tokenPosition(tok) });
  scope.usedNames.add(name);
  scope.pos.set(node, tokenPosition(tok));
  return node;
}

/** 公式语法的起始记号（项位置只有在期望 `o` 型项时才接受，见 `parseTermAtom`）。 */
function isFormulaStart(p) {
  const tok = p.peek();
  if (tok.kind === 'symbol') return tok.value === '∀' || tok.value === '∃' || tok.value === '¬';
  if (tok.kind !== 'ident') return false;
  if (tok.value === 'forall' || tok.value === 'exists') return true;
  // `not(...)` 是对象语言的逻辑常元，`not P(x)` 才是公式写法——用不用括号把它区分开。
  if (tok.value === 'not') return !(p.peek(1).kind === 'symbol' && p.peek(1).value === '(');
  return false;
}

function parseTermAtom(p, scope, expected) {
  const tok = p.peek();
  // §1.6 的定义示例写法：期望一个 o 型项时，允许直接写公式，再嵌入成对象项。
  // 只在「上下文明确要 o」时开放，避免和项语言的同名记号打架。
  if (expected === 'o' && isFormulaStart(p)) {
    const formula = parseFormulaExpr(p, scope);
    return formulaToTerm(formula, { bases: scope.bases, constants: Object.fromEntries(scope.constants) });
  }
  if (tok.kind === 'symbol' && tok.value === '(') {
    p.enter();
    try {
      p.next();
      const inner = parseTermExpr(p, scope, expected);
      p.expectSymbol(')', '项缺少右括号');
      return inner;
    } finally { p.leave(); }
  }
  if (tok.kind === 'symbol' && tok.value === 'λ') return parseAbstraction(p, scope, expected);
  if (tok.kind === 'ident') {
    if (tok.value === 'let') return parseLet(p, scope, expected);
    if (tok.value === 'lam') return parseAbstraction(p, scope, expected);
    if ((tok.value === 'and' || tok.value === 'imp' || tok.value === 'not') && !(p.peek(1).kind === 'symbol' && p.peek(1).value === '(')) {
      failAt(`逻辑常元 “${tok.value}” 需要参数，写成 ${tok.value}(…)`, tokenPosition(tok), 'syntax');
    }
    p.next();
    const node = resolveIdentifier(tok, scope);
    if (node[0] === 'b' || node[0] === 'c') return node;
    return node;
  }
  failAt(`项解析：意外的记号 ${describeToken(tok)}`, tokenPosition(tok), 'syntax');
  return null;
}

function parseTermExpr(p, scope, expected) {
  p.enter();
  try {
    let head = parseTermAtom(p, scope, expected);
    for (;;) {
      const tok = p.peek();
      if (tok.kind === 'symbol' && tok.value === '(' && hasTopLevelComma(p)) {
        const at = tokenPosition(tok);
        p.next();
        while (!p.atSymbol(')')) {
          const arg = parseTermExpr(p, scope, null);
          head = makeApp(head, arg, scope, at);
          if (p.atSymbol(',')) { p.next(); continue; }
          break;
        }
        p.expectSymbol(')', '参数表缺少右括号');
        continue;
      }
      if (startsAtom(p)) {
        const at = tokenPosition(p.peek());
        const arg = parseTermAtom(p, scope, null);
        head = makeApp(head, arg, scope, at);
        continue;
      }
      break;
    }
    return head;
  } finally { p.leave(); }
}

function parseBinders(p, scope, what) {
  const binders = [];
  for (;;) {
    const tok = p.peek();
    if (tok.kind === 'symbol' && tok.value === '(') {
      p.next();
      const nameTok = p.peek();
      if (nameTok.kind !== 'ident') failAt(`${what}：括号里需要变量名`, tokenPosition(nameTok), 'syntax');
      p.next();
      let type = null;
      if (p.atSymbol(':')) { p.next(); type = parseTypeExpr(p); }
      p.expectSymbol(')', `${what}的绑定缺少右括号`);
      binders.push({ name: nameTok.value, type, pos: tokenPosition(nameTok) });
      continue;
    }
    if (tok.kind === 'ident' && !isFormulaKeyword(tok.value) && tok.value !== 'let' && tok.value !== 'lam') {
      p.next();
      let type = null;
      if (p.atSymbol(':')) { p.next(); type = parseTypeExpr(p); }
      binders.push({ name: tok.value, type, pos: tokenPosition(tok) });
      continue;
    }
    break;
  }
  if (binders.length === 0) failAt(`${what}需要至少一个绑定变量`, tokenPosition(p.peek()), 'syntax');
  return binders;
}

function parseAbstraction(p, scope, expected) {
  p.next(); // λ / lam
  const binders = parseBinders(p, scope, 'λ 抽象');
  p.expectSymbol('.', 'λ 绑定之后需要 “.”');
  const pushed = [];
  binders.forEach((binder, offset) => {
    let type = binder.type;
    if (!type) {
      // 无注释时按上下文推断：期望类型是箭头就用它的定义域；多绑定时逐层剥。
      let hint = expected;
      for (let i = 0; i <= offset && isArrow(hint); i += 1) hint = i === offset ? hint[1] : hint[2];
      type = isArrow(hint) || typeof hint === 'string' ? hint : freshMetaType(scope, binder.pos, `λ 绑定 ${binder.name}`);
    }
    scope.bound.push({ name: binder.name, type });
    pushed.push({ name: binder.name, type, pos: binder.pos });
  });
  let body;
  try {
    body = parseTermExpr(p, scope, isArrow(expected) ? expected[2] : null);
  } finally {
    scope.bound.length -= pushed.length;
  }
  let out = body;
  for (let i = pushed.length - 1; i >= 0; i -= 1) {
    const node = ['lam', pushed[i].type, out];
    LAM_NAME_HINTS.set(node, pushed[i].name);
    out = node;
  }
  return out;
}

function parseLet(p, scope, expected) {
  p.next(); // let
  const nameTok = p.peek();
  if (nameTok.kind !== 'ident') failAt('let 需要一个变量名', tokenPosition(nameTok), 'syntax');
  p.next();
  p.expectSymbol('=', 'let 需要 “=”');
  const value = parseTermExpr(p, scope, null);
  if (!p.atIdent('in')) failAt(`let 需要 “in”（实际是 ${describeToken(p.peek())}）`, tokenPosition(p.peek()), 'syntax');
  p.next();
  const type = inferTermType(value, scope, scope.constraints);
  scope.bound.push({ name: nameTok.value, type });
  let body;
  try {
    body = parseTermExpr(p, scope, expected);
  } finally {
    scope.bound.length -= 1;
  }
  // §1.2：let 在解析期展开为 (λx. u) t 的**替换结果**，不做 β 步。
  return openBodyLocal(body, value, 0);
}

/** 内核 `open_body` 的 Node 版（逐分支照抄，包括「不进入 lift 内部」这条）。 */
export function openBodyLocal(body, value, depth = 0) {
  if (!Array.isArray(body)) return body;
  if (body[0] === 'b') {
    if (body[1] === depth) return shiftLocal(value, depth);
    return ['b', body[1] > depth ? body[1] - 1 : body[1], body[2]];
  }
  if (body[0] === 'app') return ['app', openBodyLocal(body[1], value, depth), openBodyLocal(body[2], value, depth)];
  if (body[0] === 'lam') return ['lam', body[1], openBodyLocal(body[2], value, depth + 1)];
  return body;
}

/** 内核 `shift` 的 Node 版。 */
export function shiftLocal(node, amount, cutoff = 0) {
  if (!Array.isArray(node)) return node;
  if (node[0] === 'b') return ['b', node[1] >= cutoff ? node[1] + amount : node[1], node[2]];
  if (node[0] === 'app') return ['app', shiftLocal(node[1], amount, cutoff), shiftLocal(node[2], amount, cutoff)];
  if (node[0] === 'lam') return ['lam', node[1], shiftLocal(node[2], amount, cutoff + 1)];
  return node;
}

/* ==========================================================================
 * 五、公式语言
 * ======================================================================== */

const L = (name, type) => (type === undefined ? ['logic', name] : ['logic', name, type]);
const B = (term) => ['eq', term, L('true')];

/**
 * α 规范时「已用的名字」只算**自由变量名与常量名**，不算绑定名。
 *
 * 为什么：绑定名正是要被改掉的东西，如果它们也进 used 集合，那么
 * `alphaCanonical` 就不再幂等——已经规范成 `∀z0. …` 的公式会被再次改名成
 * `∀z2. …`，`formulaHash` 也就不是 α 类上的函数了。内核的 `fresh()` 同样
 * 只看自由变量与常量（`object_fv(a) | set(sig['constants'])`），口径一致。
 */
function collectSignificantNames(node, bound, into = new Set()) {
  if (!Array.isArray(node)) return into;
  const head = node[0];
  if (head === 'v') {
    if (!bound.has(node[1])) into.add(node[1]);
    return into;
  }
  if (head === 'c') { into.add(node[1]); return into; }
  if (head === 'all' || head === 'ex') {
    // 同名嵌套时内层遮蔽外层：只在没有内层绑定时才算自由。
    const inner = new Set(bound);
    inner.add(node[1][1]);
    return collectSignificantNames(node[2], inner, into);
  }
  if (head === 'eq') {
    collectSignificantNames(node[1], bound, into);
    return collectSignificantNames(node[2], bound, into);
  }
  if (head === 'and' || head === 'or' || head === 'imp') {
    collectSignificantNames(node[1], bound, into);
    return collectSignificantNames(node[2], bound, into);
  }
  for (const child of node) collectSignificantNames(child, bound, into);
  return into;
}

function freshZ(used, counter) {
  for (;;) {
    const name = `z${counter.value}`;
    counter.value += 1;
    if (!used.has(name)) return name;
  }
}

/** 量词绑定改名：名字要避开常量、外层绑定与已登记的自由变量（内核 `infer` 拒绝与常量同名的自由变元）。 */
function freshenBinder(name, scope) {
  let candidate = name;
  let suffix = 1;
  const taken = (value) => scope.constants.has(value) || scope.definitions.has(value)
    || scope.named.some((entry) => entry.name === value)
    || scope.free.has(value)
    || Object.prototype.hasOwnProperty.call(LOGIC_CONSTANTS, value);
  while (taken(candidate) || scope.usedNames.has(candidate)) {
    candidate = `${name}_${suffix}`;
    suffix += 1;
    if (suffix > 1000) break;
  }
  return candidate;
}

function parseQuantifier(p, scope, kind) {
  p.next(); // ∀ / ∃ / forall / exists
  const binders = parseBinders(p, scope, kind === 'all' ? '全称量词' : '存在量词');
  p.expectSymbol('.', '量词绑定之后需要 “.”');
  const pushed = [];
  for (const binder of binders) {
    const name = freshenBinder(binder.name, scope);
    const type = binder.type ?? freshMetaType(scope, binder.pos, `量词绑定 ${binder.name}`);
    // 同时记住**源名**：改名之后体里的书写形式仍是源名，靠它把出现指回这个绑定。
    scope.named.push({ name, type, source: binder.name });
    scope.usedNames.add(name);
    pushed.push({ name, type, pos: binder.pos });
  }
  let body;
  try {
    body = parseFormulaExpr(p, scope);
  } finally {
    scope.named.length -= pushed.length;
  }
  let out = body;
  for (let i = pushed.length - 1; i >= 0; i -= 1) {
    out = [kind, ['v', pushed[i].name, pushed[i].type], out];
  }
  return out;
}

function parseNot(p, scope) {
  if (p.atSymbol('¬') || p.atIdent('not')) {
    p.next();
    // §1.3：¬a 展开为 a ⇒ false（不引入内核没有的 not 规则）。
    return ['imp', parseNot(p, scope), ['false']];
  }
  if (p.atSymbol('∀') || p.atIdent('forall')) return parseQuantifier(p, scope, 'all');
  if (p.atSymbol('∃') || p.atIdent('exists')) return parseQuantifier(p, scope, 'ex');
  return parseFormulaAtom(p, scope);
}

function parseConjunction(p, scope) {
  const left = parseNot(p, scope);
  if (p.atSymbol('∧') || p.atSymbol('/\\') || p.atIdent('and')) {
    p.next();
    // §1.4：合取**右结合**且不重排——a ∧ b ∧ c 的规范形式是 a ∧ (b ∧ c)。
    return ['and', left, parseConjunction(p, scope)];
  }
  return left;
}

function parseImplication(p, scope) {
  const left = parseConjunction(p, scope);
  if (p.atSymbol('⇒') || p.atSymbol('->') || p.atSymbol('=>') || p.atIdent('imp')) {
    p.next();
    return ['imp', left, parseImplication(p, scope)];
  }
  return left;
}

function parseEquivalence(p, scope) {
  let left = parseImplication(p, scope);
  while (p.atSymbol('⇔') || p.atSymbol('<=>') || p.atIdent('iff')) {
    p.next();
    const right = parseImplication(p, scope);
    left = ['and', ['imp', left, right], ['imp', right, left]];
  }
  return left;
}

function parseFormulaAtom(p, scope) {
  const tok = p.peek();
  if (tok.kind === 'symbol' && tok.value === '∨') {
    failAt('首版不接受析取：内核没有 or 的引入/消去规则。', tokenPosition(tok), 'unsupported');
  }
  if (tok.kind === 'ident' && tok.value === 'or') {
    failAt('首版不接受析取：内核没有 or 的引入/消去规则。', tokenPosition(tok), 'unsupported');
  }
  if (tok.kind === 'ident' && (tok.value === 'true' || tok.value === 'false')) {
    p.next();
    // 公式语言的原生真假：false 就是内核的 ['false']；⊤ 写成 true = true（refl 可证）。
    return tok.value === 'false' ? ['false'] : ['eq', L('true'), L('true')];
  }
  if (tok.kind === 'symbol' && tok.value === '(') {
    // 括号里可能是一个公式（(a ∧ b)），也可能是一个项（(f x) = y）。先按公式试，失败回退。
    const snap = snapshotState(p, scope);
    p.enter();
    try {
      p.next();
      const inner = parseFormulaExpr(p, scope);
      p.expectSymbol(')', '公式缺少右括号');
      return inner;
    } catch (error) {
      if (!(error instanceof McsError)) throw error;
      // 嵌套过深是可恢复的输入问题（`reason` 标了 resource_exhausted），不在这里被"回退成项"掩盖。
      if (error.details?.reason === 'resource_exhausted' || /嵌套过深/.test(error.message)) throw error;
      restoreState(p, scope, snap);
    } finally { p.leave(); }
  }
  const leftTerm = parseTermExpr(p, scope, null);
  if (p.atSymbol('=')) {
    p.next();
    const rightTerm = parseTermExpr(p, scope, null);
    return ['eq', leftTerm, rightTerm];
  }
  // §0 事实 3 / §2.7：公式位置上的 o 型项记作 B(t) = (t = true)。
  // 这一步在**解析期**做，因为内核的 `formula_ok` 根本没有「裸项」这种公式；
  // 把 B() 留到证书装配再包，等于允许一个内核不认识的形状流到下游。
  // `t` 与 `t = true` 因此解析成同一条公式、同一个哈希——这是刻意的，不是丢失信息。
  const type = inferTermType(leftTerm, scope, scope.constraints);
  const resolved = resolveTypeTree(type, solveConstraints(scope));
  if (resolved === 'o') return B(leftTerm);
  const at = positionOf(scope, leftTerm) ?? tokenPosition(tok);
  if (isMetaType(resolved)) {
    failAt('公式位置需要一个真值项（o）；这里推断不出类型，请为相关符号声明类型，或写成 “t = u” 的等式。', at, 'undeclared-type');
  }
  failAt(`公式位置需要一个真值项（o），这里得到 ${typeToString(resolved)}；等式请写成 “t = u”。`, at, 'type-mismatch');
  return null;
}

function parseFormulaExpr(p, scope) {
  return parseEquivalence(p, scope);
}

/* ==========================================================================
 * 六、对外解析接口
 * ======================================================================== */

/**
 * 认证公式的类型检查（返回恒为 `o`；顺带把「两边类型必须一致」记成约束）。
 *
 * 公式与项是两层语言：项的推断走 `inferTermType`，公式必须走这里——
 * 内核的 `formula_ok` 也是两套（`term_type` / `formula_ok`），不能混用。
 */
function inferCertType(node, scope, constraints) {
  if (!Array.isArray(node)) failAt('公式类型推断：不是合法的公式', null, 'type-mismatch');
  const at = positionOf(scope, node);
  switch (node[0]) {
    case 'false': return 'o';
    case 'eq': {
      const left = inferTermType(node[1], scope, constraints);
      const right = inferTermType(node[2], scope, constraints);
      constraints.push({ left, right, position: at, context: '等式的两边' });
      return 'o';
    }
    case 'and': case 'or': case 'imp': {
      constraints.push({ left: inferCertType(node[1], scope, constraints), right: 'o', position: at, context: node[0] });
      constraints.push({ left: inferCertType(node[2], scope, constraints), right: 'o', position: at, context: node[0] });
      return 'o';
    }
    case 'all': case 'ex': {
      constraints.push({ left: inferCertType(node[2], scope, constraints), right: 'o', position: at, context: '量词体' });
      return 'o';
    }
    default:
      failAt(`不支持的公式构造子 ${String(node[0])}`, at, 'unsupported');
      return null;
  }
}

function finishTerm(node, scope, expected = null) {
  const type = inferTermType(node, scope, scope.constraints);
  // `expected`（调用方给的期望类型）也当成一条约束：既是推断提示，也是事后核对。
  if (expected) scope.constraints.push({ left: type, right: expected, position: null, context: '期望类型' });
  const subst = solveConstraints(scope);
  return applyTypes(node, subst, scope);
}

function finishFormula(node, scope) {
  inferCertType(node, scope, scope.constraints);
  const subst = solveConstraints(scope);
  return applyTypes(node, subst, scope);
}

/** 解析对象项（§1.2），返回内核规范形状。 */
export function parseTerm(source, ctx = {}) {
  const scope = makeScope(ctx);
  const p = makeParser(source, ctx.position);
  const node = parseTermExpr(p, scope, ctx.expected ?? null);
  p.expectEof('项解析');
  return finishTerm(node, scope, ctx.expected ?? null);
}

/** 解析认证公式（§1.3），返回规范化后的公式（`⇔`/`¬` 已展开）。 */
export function parseFormula(source, ctx = {}) {
  const scope = makeScope(ctx);
  const p = makeParser(source, ctx.position);
  const node = parseFormulaExpr(p, scope);
  p.expectEof('公式解析');
  return finishFormula(node, scope);
}

/* ==========================================================================
 * 七、α 规范、哈希、人话与 TeX
 * ======================================================================== */

/** 内核 `canonical` 的 Node 版：命名项 -> de Bruijn 规范形状。 */
export function canonicalizeNamedTerm(node, env = []) {
  if (!Array.isArray(node) || typeof node[0] !== 'string') failAt('不是合法的对象项', null, 'syntax');
  switch (node[0]) {
    case 'lambda': {
      if (node.length !== 4 || typeof node[1] !== 'string') failAt('命名抽象形状错误', null, 'syntax');
      return ['lam', node[2], canonicalizeNamedTerm(node[3], [[node[1], node[2]], ...env])];
    }
    case 'v': {
      if (node.length !== 3 || typeof node[1] !== 'string') failAt('命名变量形状错误', null, 'syntax');
      for (let i = 0; i < env.length; i += 1) {
        if (env[i][0] === node[1]) {
          if (env[i][1] !== node[2]) failAt(`绑定变量 ${node[1]} 的类型不一致`, null, 'type-mismatch');
          return ['b', i, node[2]];
        }
      }
      return node;
    }
    case 'lam': return ['lam', node[1], canonicalizeNamedTerm(node[2], [[null, node[1]], ...env])];
    case 'app': return ['app', canonicalizeNamedTerm(node[1], env), canonicalizeNamedTerm(node[2], env)];
    default: return node;
  }
}

function renameTermBinders(node, env, used, counter) {
  if (!Array.isArray(node)) return node;
  switch (node[0]) {
    case 'v': {
      const renamed = env.get(node[1]);
      return renamed ? ['v', renamed, node[2]] : node;
    }
    case 'app': return ['app', renameTermBinders(node[1], env, used, counter), renameTermBinders(node[2], env, used, counter)];
    case 'lam': return ['lam', node[1], renameTermBinders(node[2], env, used, counter)];
    case 'lift': return ['lift', renameTermBinders(node[1], env, used, counter), node[2].map((param) => renameTermBinders(param, env, used, counter))];
    default: return node;
  }
}

function renameFormulaBinders(node, env, used, counter) {
  if (!Array.isArray(node)) return node;
  switch (node[0]) {
    case 'all': case 'ex': {
      const binder = node[1];
      const name = freshZ(used, counter);
      used.add(name);
      const inner = new Map(env);
      inner.set(binder[1], name);
      return [node[0], ['v', name, binder[2]], renameFormulaBinders(node[2], inner, used, counter)];
    }
    case 'eq': return ['eq', renameTermBinders(node[1], env, used, counter), renameTermBinders(node[2], env, used, counter)];
    case 'and': case 'or': case 'imp':
      return [node[0], renameFormulaBinders(node[1], env, used, counter), renameFormulaBinders(node[2], env, used, counter)];
    case 'false': return node;
    default: return renameTermBinders(node, env, used, counter);
  }
}

/**
 * α 规范（§1.4 第 3 条）：绑定量词/λ 的变量按出现次序改名为 `z0, z1, …`，
 * 避开表达式中已用的名字；自由变量保留原名与类型。
 *
 * 项语言本来就是 de Bruijn，λ 改名是恒等；**量词顺序改变则规范形式改变**，
 * 因此「∀x∀y. P x y」与「∀y∀x. P x y」不是同一个命题（可判为不同）。
 */
export function alphaCanonical(node) {
  if (!Array.isArray(node)) return node;
  if (node[0] === 'lambda') return canonicalizeNamedTerm(node);
  const used = collectSignificantNames(node, new Set());
  return renameFormulaBinders(node, new Map(), used, { value: 0 });
}

/** 规范化表达树的哈希，带 `sha256:` 前缀（§1.6 的 `formalSpec.hash` 口径）。 */
export function formulaHash(node) {
  return `sha256:${digest(alphaCanonical(node))}`;
}

/**
 * 把认证公式**嵌入**成对象项（类型 `o`）——「命题即 o 型项」的读法。
 *
 * 为什么需要它：内核里两套语言是分开的（`formula_ok` 管认证公式，`infer` 管对象项），
 * 但对象语言本身就带 `and / imp / eq_a / all_a / ex_a` 这些逻辑常元，因此每条公式都能
 * 机械地翻成一条 o 型项。§1.6 的定义示例（`λmul e inv. … ∧ ∀a b. …`）用的正是这个读法；
 * 证书里的 `object_conclusion` 也要求一个 o 型项，配 `B(lift(p))` 与结论对接。
 *
 * 翻译规则（与内核 H_Schema 的 `equality`/`quantifier` 公理互为逆）：
 * `t = u ↦ eq_T(t)(u)`；`a ∧ b ↦ and(⌜a⌝)(⌜b⌝)`；`a ⇒ b ↦ imp(⌜a⌝)(⌜b⌝)`；
 * `false ↦ false`；`∀x:T.φ ↦ all_T(λx:T.⌜φ⌝)`；`∃x:T.φ ↦ ex_T(λx:T.⌜φ⌝)`。
 * 量词绑定变成 λ 绑定（de Bruijn），λ 深度按路径累加——这一步错了不会报语法错，
 * 只会让嵌入的项对不上原公式，所以由测试逐条核对。
 *
 * `sig` 只需给 `{bases, constants}`（常量的类型要用来定 `eq`/`all`/`ex` 的类型参数）。
 */
export function formulaToTerm(formula, sig = { bases: ['o'], constants: {} }) {
  const scope = makeScope({ bases: sig.bases ?? ['o'], constants: sig.constants ?? {} });
  const typeOfTerm = (term) => {
    const constraints = [];
    const type = inferTermType(term, scope, constraints);
    return resolveTypeTree(type, solveConstraints({ constraints }));
  };
  /**
   * 把公式里的项搬进嵌入后的对象项。两个偏移必须分开算，合起来会算错：
   * - `added`：该项之上由**量词嵌入**新增的 λ 层数（每嵌一个 `∀`/`∃` 加一层）；
   * - `leafLambda`：项**自身**已有的 λ 层数。
   *
   * 出现位置离原上下文越远，外层绑定变量的 de Bruijn 下标就越大：
   * `['b', i]` 在 `i >= leafLambda` 时指的是项外的绑定，要加 `added`；
   * 量词绑定变量 `['v', name]` 的下标是 `leafLambda + added - 该量词的公式深度 - 1`。
   */
  const substTerm = (term, leafLambda, added, binders) => {
    if (!Array.isArray(term)) return term;
    switch (term[0]) {
      case 'b':
        return term[1] >= leafLambda ? ['b', term[1] + added, term[2]] : term;
      case 'v': {
        const declared = binders.get(term[1]);
        if (declared === undefined) return term;
        return ['b', leafLambda + added - declared - 1, term[2]];
      }
      case 'app': return ['app', substTerm(term[1], leafLambda, added, binders), substTerm(term[2], leafLambda, added, binders)];
      case 'lam': return ['lam', term[1], substTerm(term[2], leafLambda + 1, added, binders)];
      case 'lift': return ['lift', substTerm(term[1], leafLambda, added, binders), term[2].map((param) => substTerm(param, leafLambda, added, binders))];
      default: return term;
    }
  };
  const encode = (node, depth, binders) => {
    if (!Array.isArray(node)) failAt('嵌入：不是合法的公式', null, 'type-mismatch');
    const app = (head, arg) => ['app', head, arg];
    switch (node[0]) {
      case 'false': return L('false');
      case 'eq': return app(app(L('eq', typeOfTerm(node[1])), substTerm(node[1], 0, depth, binders)), substTerm(node[2], 0, depth, binders));
      case 'and': case 'imp': case 'or':
        return app(app(L(node[0]), encode(node[1], depth, binders)), encode(node[2], depth, binders));
      case 'all': case 'ex': {
        const type = node[1][2];
        const inner = new Map(binders);
        inner.set(node[1][1], depth);
        return app(L(node[0], type), ['lam', type, encode(node[2], depth + 1, inner)]);
      }
      default:
        failAt(`嵌入：不支持的公式构造子 ${String(node[0])}`, null, 'unsupported');
        return null;
    }
  };
  return encode(formula, 0, new Map());
}

const TYPE_TEX = (type) => typeToString(type).replace(/->/g, '\\to ').replace(/[A-Za-z_][A-Za-z0-9_']*/g, (name) => `\\mathrm{${name}}`);

function labelOf(name, env) {
  return env?.labels?.[name] ?? env?.names?.[name] ?? name;
}

function lamBinderName(node, depth) {
  return LAM_NAME_HINTS.get(node) ?? `x${depth}`;
}

/** 项 -> 中文结构读法（纯函数；`env.labels` 可给显示名）。 */
export function termToReadable(node, env = {}, depth = 0, binders = []) {
  if (!Array.isArray(node)) return String(node);
  switch (node[0]) {
    case 'v': return labelOf(node[1], env);
    case 'c': return labelOf(node[1], env);
    case 'b': {
      const index = binders.length - 1 - node[1];
      return index >= 0 ? binders[index] : `#${node[1]}`;
    }
    case 'logic': return node.length > 2 ? `${node[1]}⟨${typeToString(node[2])}⟩` : node[1];
    case 'lam': {
      const name = lamBinderName(node, depth);
      const body = termToReadable(node[2], env, depth + 1, [...binders, name]);
      return `λ${name} : ${typeToString(node[1])}. ${body}`;
    }
    case 'app': {
      const spine = [];
      let head = node;
      while (Array.isArray(head) && head[0] === 'app') { spine.unshift(head[2]); head = head[1]; }
      const headText = termToReadable(head, env, depth, binders);
      const args = spine.map((arg) => termToReadable(arg, env, depth, binders));
      return `${headText}(${args.join(', ')})`;
    }
    case 'lift': {
      const inner = termToReadable(node[1], env, depth, binders);
      const params = node[2].map((param) => termToReadable(param, env, depth, binders));
      return `lift(${inner})[${params.join(', ')}]`;
    }
    default: return JSON.stringify(node);
  }
}

/** 公式 -> 中文结构读法（纯函数）。 */
export function formulaToReadable(node, env = {}) {
  if (!Array.isArray(node)) return String(node);
  switch (node[0]) {
    case 'false': return '假';
    case 'eq': {
      if (node[2]?.[0] === 'logic' && node[2][1] === 'true') return `${termToReadable(node[1], env)} 成立`;
      return `${termToReadable(node[1], env)} = ${termToReadable(node[2], env)}`;
    }
    case 'and': return `（${formulaToReadable(node[1], env)} 且 ${formulaToReadable(node[2], env)}）`;
    case 'or': return `（${formulaToReadable(node[1], env)} 或 ${formulaToReadable(node[2], env)}）`;
    case 'imp': return `（${formulaToReadable(node[1], env)} 推出 ${formulaToReadable(node[2], env)}）`;
    case 'all': return `对所有 ${node[1][1]} : ${typeToString(node[1][2])}，${formulaToReadable(node[2], env)}`;
    case 'ex': return `存在 ${node[1][1]} : ${typeToString(node[1][2])}，${formulaToReadable(node[2], env)}`;
    default: return termToReadable(node, env);
  }
}

function termToTex(node, depth = 0, binders = []) {
  if (!Array.isArray(node)) return String(node);
  switch (node[0]) {
    case 'v': case 'c': return `\\mathrm{${node[1]}}`;
    case 'b': {
      const index = binders.length - 1 - node[1];
      return index >= 0 ? binders[index] : `\\#${node[1]}`;
    }
    case 'logic': return node.length > 2 ? `\\mathrm{${node[1]}}_{${TYPE_TEX(node[2])}}` : `\\mathrm{${node[1]}}`;
    case 'lam': {
      const name = lamBinderName(node, depth);
      return `\\lambda ${name} : ${TYPE_TEX(node[1])}.\\; ${termToTex(node[2], depth + 1, [...binders, name])}`;
    }
    case 'app': {
      const spine = [];
      let head = node;
      while (Array.isArray(head) && head[0] === 'app') { spine.unshift(head[2]); head = head[1]; }
      return `${termToTex(head, depth, binders)}\\left(${spine.map((arg) => termToTex(arg, depth, binders)).join(', ')}\\right)`;
    }
    case 'lift': return `\\operatorname{lift}\\left(${termToTex(node[1], depth, binders)}\\right)`;
    default: return '\\text{?}';
  }
}

/** 公式 -> KaTeX 片段（纯函数）。 */
export function formulaToTex(node) {
  if (!Array.isArray(node)) return String(node);
  switch (node[0]) {
    case 'false': return '\\bot';
    case 'eq': {
      if (node[2]?.[0] === 'logic' && node[2][1] === 'true') return `${termToTex(node[1])}`;
      return `${termToTex(node[1])} = ${termToTex(node[2])}`;
    }
    case 'and': return `\\left(${formulaToTex(node[1])} \\land ${formulaToTex(node[2])}\\right)`;
    case 'or': return `\\left(${formulaToTex(node[1])} \\lor ${formulaToTex(node[2])}\\right)`;
    case 'imp': return `\\left(${formulaToTex(node[1])} \\Rightarrow ${formulaToTex(node[2])}\\right)`;
    case 'all': return `\\forall ${node[1][1]} : ${TYPE_TEX(node[1][2])}.\\; ${formulaToTex(node[2])}`;
    case 'ex': return `\\exists ${node[1][1]} : ${TYPE_TEX(node[1][2])}.\\; ${formulaToTex(node[2])}`;
    default: return termToTex(node);
  }
}

/* ==========================================================================
 * 八、formalSpec 归一（§1.4–§1.6）
 * ======================================================================== */

function requirePlainObject(value, what, reason = 'missing-field') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failAt(`${what} 必须是对象`, null, reason, { field: what });
  }
  return value;
}

function requireString(value, what, reason = 'missing-field') {
  if (typeof value !== 'string' || value.trim() === '') {
    failAt(`${what} 必须是非空字符串`, null, reason, { field: what });
  }
  return value;
}

function optionalString(value, what) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') failAt(`${what} 必须是字符串`, null, 'invalid-field', { field: what });
  return value;
}

/**
 * 把背景理论对象归一成解析层要的形状：`bases: string[]`、`constants: {name: typeNode}`。
 *
 * **为什么需要容忍两种形状**：目录接口的背景登记表（`core/formal/backgrounds.mjs`）
 * 把 `bases`/`constants` 写成**带说明的对象数组**（`[{name, note}]`、`[{name, type, note}]`），
 * 而解析层只要名字与类型。两边都是「同一份事实的两种排布」，入口处归一一次，
 * 好过让调用方记住「哪个模块用哪种形状」。
 */
export function normalizeBackground(background) {
  if (!background || typeof background !== 'object') return null;
  const bases = [];
  for (const base of background.bases ?? []) {
    const name = typeof base === 'string' ? base : base?.name;
    if (typeof name === 'string' && name && !bases.includes(name)) bases.push(name);
  }
  const constants = {};
  const rawConstants = background.constants;
  if (Array.isArray(rawConstants)) {
    for (const entry of rawConstants) {
      if (!entry || typeof entry.name !== 'string') continue;
      constants[entry.name] = coerceTypeNode(entry.type);
    }
  } else if (rawConstants && typeof rawConstants === 'object') {
    for (const [name, type] of Object.entries(rawConstants)) constants[name] = coerceTypeNode(type);
  }
  // 定义要把 `term`（已解析的规范项）与 `source`（登记表的文本形式）都带上：
  // 装配 kernel theory 时后者要就地解析，丢了就只能一路飘到 `inferLocal` 才炸。
  const definitions = (background.definitions ?? []).map((entry) => {
    if (!entry || typeof entry.name !== 'string' || !entry.name) return null;
    return {
      name: entry.name,
      type: coerceTypeNode(entry.type),
      term: Array.isArray(entry.term) ? entry.term : null,
      source: typeof entry.source === 'string' ? entry.source : null,
    };
  }).filter(Boolean);
  return {
    id: background.id,
    version: String(background.version ?? '1'),
    bases,
    constants,
    definitions,
    source: background,
  };
}

function backgroundFrom(ctx, id, version) {
  const source = ctx?.backgrounds;
  if (!source) return null;
  let found = null;
  if (typeof source.backgroundTheory === 'function') found = source.backgroundTheory(id, version);
  else if (Array.isArray(source)) found = source.find((entry) => entry && entry.id === id) ?? null;
  else if (typeof source === 'object') found = source.id === id ? source : (source[id] ?? null);
  return normalizeBackground(found);
}

/**
 * 解析并归一 `formalSpec`（§1.6）。
 *
 * `ctx` 允许四种来源：`bases`、`constants`、`definitions`、`backgrounds`（theory 模块）。
 * 背景与 spec 自己的 `declarations` **同名必须同类型**，同名异类型报 `type-mismatch`
 * 而不是悄悄覆盖——「同名不同物」是本体层最贵的错误，必须在入口挡住。
 *
 * 归一的含义（对得上 §1.4）：
 * 1. 别名归一；2. `⇔`/`¬`/`let` 展开；3. α 规范另出 `canonical` 字段；
 * 4. 合取/蕴含**不重排**；5. 类型注释按上下文推断，推不出报 `undeclared-type`。
 *
 * `hash` 只覆盖**源级字段**（不含派生树），且每个 `source` 用 α 规范树参与哈希，
 * 因此绑定改名不改变哈希、量词换序会改变哈希。
 */
export function parseSpec(raw, ctx = {}) {
  const spec = requirePlainObject(raw, 'formalSpec');
  const strict = ctx.strict !== false;
  const specVersion = spec.specVersion ?? FORMAL_LANGUAGE_VERSION;
  if (specVersion !== FORMAL_LANGUAGE_VERSION) {
    failAt(`不支持的规格版本 ${String(specVersion)}（本层只实现 ${FORMAL_LANGUAGE_VERSION}）`, null, 'unsupported-version', { field: 'specVersion', found: specVersion });
  }

  // ---- 背景理论：bases/constants/definitions 三样都要并进来，冲突即报 ----
  const backgroundId = optionalString(spec.background, 'background');
  const theoryVersion = spec.theoryVersion === undefined || spec.theoryVersion === null ? '1' : String(spec.theoryVersion);
  const bases = ['o', ...(ctx.bases ?? [])].filter((base, index, list) => list.indexOf(base) === index);
  const constants = {};
  for (const [name, type] of Object.entries(ctx.constants ?? {})) constants[name] = coerceTypeNode(type);
  const definitions = [...(ctx.definitions ?? [])];
  const warnings = [];
  let background = null;
  if (backgroundId) {
    background = backgroundFrom(ctx, backgroundId, theoryVersion);
    if (!background && ctx.backgrounds) {
      failAt(`未登记的背景理论 ${backgroundId}@${theoryVersion}`, null, 'unknown-background', { field: 'background' });
    }
    if (background) {
      for (const base of background.bases ?? []) if (!bases.includes(base)) bases.push(base);
      for (const [name, type] of Object.entries(background.constants ?? {})) {
        if (Object.prototype.hasOwnProperty.call(constants, name) && !typeEquals(constants[name], type)) {
          failAt(`常量 ${name} 与背景 ${backgroundId} 同名不同类：${typeToString(constants[name])} ≠ ${typeToString(type)}`, null, 'type-mismatch', { field: `constants.${name}` });
        }
        constants[name] = type;
      }
      for (const def of background.definitions ?? []) definitions.push(def);
    } else {
      warnings.push({ code: 'background-unresolved', message: `背景 ${backgroundId} 未在本地登记，按无背景处理。` });
    }
  }

  // ---- 声明 ----
  const declarations = [];
  const seen = new Set();
  for (const [index, entry] of (spec.declarations ?? []).entries()) {
    const item = requirePlainObject(entry, `declarations[${index}]`);
    const name = requireString(item.name, `declarations[${index}].name`);
    if (seen.has(name)) failAt(`声明名重复：${name}`, null, 'duplicate-declaration', { field: 'declarations', name });
    seen.add(name);
    const typeNode = parseType(requireString(item.type, `declarations[${index}].type`));
    if (Object.prototype.hasOwnProperty.call(constants, name) && !typeEquals(constants[name], typeNode)) {
      failAt(`声明 ${name} 与已有常量同名不同类：${typeToString(constants[name])} ≠ ${typeToString(typeNode)}`, null, 'type-mismatch', { field: 'declarations', name });
    }
    for (const atom of typeAtomsOf(typeNode)) if (!bases.includes(atom)) bases.push(atom);
    const role = item.role ?? 'constant';
    // 角色的白名单取 §1.6 与 `shared/formal.d.ts` 的**并集**：两处写法不一致时，
    // 不该由解析层替它们做裁决（role 只影响展示，不进 kernel theory）。
    // 取并集能同时接受两边已登记的草稿，等协议面统一后再收紧。
    if (strict && !['object', 'element', 'function', 'predicate', 'proposition', 'constant'].includes(role)) {
      failAt(`declarations[${index}].role 取值不合法：${String(role)}`, null, 'invalid-field', { field: 'declarations.role' });
    }
    constants[name] = typeNode;
    declarations.push({ name, type: typeToString(typeNode), typeNode, role, label: optionalString(item.label, `declarations[${index}].label`) });
  }

  // ---- 定义：先看成图（能引用同 spec 里任何一条），再判环，最后按依赖序解析 ----
  const rawDefinitions = (spec.definitions ?? []).map((entry, index) => {
    const item = requirePlainObject(entry, `definitions[${index}]`);
    const name = requireString(item.name, `definitions[${index}].name`);
    const source = requireString(item.source, `definitions[${index}].source`);
    const declaredType = item.type === undefined || item.type === null ? null : parseType(String(item.type));
    // `def name : ty = body` 与直接给项两种写法都收；图与解析都用同一个 body。
    return { name, source, body: definitionBodySource(source, name), declaredType, index };
  });
  const definitionNames = new Set(rawDefinitions.map((def) => def.name));
  if (definitionNames.size !== rawDefinitions.length) failAt('定义名重复', null, 'duplicate-definition', { field: 'definitions' });
  for (const name of definitionNames) {
    if (constants[name] !== undefined) failAt(`定义 ${name} 与已有常量同名`, null, 'duplicate-definition', { field: 'definitions', name });
  }

  // 环检测：把定义体按「引用了哪些定义名」建成有向图。
  const graph = new Map();
  for (const def of rawDefinitions) {
    const referenced = [...definitionNames].filter((other) => bodyMentions(def.body, other));
    graph.set(def.name, referenced);
  }
  const cycle = findCycle(graph);
  if (cycle) {
    failAt(`循环定义：${cycle.join(' → ')}`, null, 'cyclic-definition', { cycle, field: 'definitions' });
  }

  const resolvedDefinitions = new Map();
  for (const name of topologicalOrder(graph)) {
    const def = rawDefinitions.find((entry) => entry.name === name);
    const localCtx = {
      bases,
      constants: { ...constants },
      definitions: [...definitions, ...[...resolvedDefinitions.values()].map((entry) => ({ name: entry.name, type: entry.typeNode }))],
      strict,
    };
    const term = parseTerm(def.body, { ...localCtx, expected: def.declaredType });
    const inferred = inferClosedType(term, localCtx);
    if (def.declaredType && !typeEquals(inferred, def.declaredType)) {
      failAt(`定义 ${name} 的推断类型 ${typeToString(inferred)} 与声明类型 ${typeToString(def.declaredType)} 不一致`, null, 'type-mismatch', { field: `definitions.${name}.type` });
    }
    const finalType = def.declaredType ?? inferred;
    resolvedDefinitions.set(name, { name, typeNode: finalType, source: def.source, term, index: def.index });
    constants[name] = finalType;
  }

  const definitionsOut = rawDefinitions.map((def) => {
    const resolved = resolvedDefinitions.get(def.name);
    return {
      name: def.name,
      type: typeToString(resolved.typeNode),
      typeNode: resolved.typeNode,
      source: def.source,
      term: resolved.term,
      canonical: alphaCanonical(resolved.term),
    };
  });

  // ---- 公式：statement / assumptions / claims ----
  const formulaCtx = () => ({
    bases,
    constants: Object.fromEntries(Object.entries(constants)),
    definitions: [...definitions, ...definitionsOut.map((entry) => ({ name: entry.name, type: entry.typeNode }))],
    strict,
  });
  const statementRaw = requirePlainObject(spec.statement, 'statement');
  const statementSource = requireString(statementRaw.source, 'statement.source');
  const statementKind = statementRaw.kind ?? 'formula';
  if (statementKind !== 'formula') failAt(`statement.kind 只支持 formula（收到 ${String(statementKind)}）`, null, 'unsupported', { field: 'statement.kind' });
  const statementFormula = parseFormula(statementSource, formulaCtx());

  const parseFormulaEntries = (entries, what) => (entries ?? []).map((entry, index) => {
    const item = requirePlainObject(entry, `${what}[${index}]`);
    const source = requireString(item.source, `${what}[${index}].source`);
    const formula = parseFormula(source, formulaCtx());
    const out = { id: optionalString(item.id, `${what}[${index}].id`) ?? `${what}${index + 1}`, source, formula, canonical: alphaCanonical(formula) };
    if (item.role !== undefined) out.role = String(item.role);
    return out;
  });
  const assumptions = parseFormulaEntries(spec.assumptions, 'assumptions');
  const claims = parseFormulaEntries(spec.claims, 'claims');

  // ---- 引用：版本/哈希对不上记 stale，不做静默通过 ----
  const references = (spec.references ?? []).map((entry, index) => {
    const item = requirePlainObject(entry, `references[${index}]`);
    const node = requireString(item.node, `references[${index}].node`);
    const version = String(item.version ?? '1');
    const specHash = optionalString(item.specHash, `references[${index}].specHash`);
    const symbols = Array.isArray(item.symbols) ? item.symbols.filter((symbol) => typeof symbol === 'string') : [];
    let status = 'unchecked';
    let note = '未提供引用索引，版本/哈希未核对。';
    const index_ = ctx.referenceIndex;
    if (index_) {
      const expected = typeof index_ === 'function' ? index_(node, version) : index_[`${node}@${version}`];
      if (expected === undefined || expected === null) {
        status = 'unresolved';
        note = `引用索引里没有 ${node}@${version}。`;
      } else if (specHash && expected !== specHash) {
        status = 'stale';
        note = `specHash 对不上：登记 ${expected}，引用 ${specHash}。`;
      } else {
        status = 'resolved';
        note = '版本与哈希一致。';
      }
    }
    return { node, version, specHash, kind: item.kind ?? 'definitionReference', symbols, status, note };
  });

  const boundary = Array.isArray(spec.boundary) ? spec.boundary.filter((line) => typeof line === 'string') : [];
  const source = optionalString(spec.source, 'source');
  const node = optionalString(spec.node, 'node');
  const nodeVersion = spec.nodeVersion === undefined || spec.nodeVersion === null ? null : String(spec.nodeVersion);

  // 哈希输入：只覆盖**形式内容**（表达式树 + 标识 + 引用），不覆盖人写的说明文字
  // （label / boundary / source）。改说明不该让下游引用的 specHash 失效；
  // 而每处 source 都用 α 规范树参与哈希，所以绑定改名不改哈希、量词换序改哈希。
  const hashInput = {
    specVersion,
    node,
    nodeVersion,
    background: backgroundId,
    theoryVersion,
    declarations: declarations.map(({ name, typeNode, role }) => ({ name, typeNode, role })),
    definitions: definitionsOut.map(({ name, typeNode, canonical }) => ({ name, typeNode, canonical })),
    assumptions: assumptions.map(({ id, canonical }) => ({ id, canonical })),
    statement: { kind: statementKind, canonical: alphaCanonical(statementFormula) },
    claims: claims.map(({ id, role, canonical }) => ({ id, role: role ?? null, canonical })),
    references: references.map(({ node: refNode, version, specHash, kind, symbols }) => ({ node: refNode, version, specHash, kind, symbols })),
  };
  /*
   * 登记的 hash 与重算不一致是 **problem**，不是 warning（2026-10 修）。
   *
   * `parseSpec` 只能记进自己的 `warnings`（`problems` 在 `validateDraft` 里），
   * 所以这里标记 `code: 'hash-mismatch'`，由 `validateDraft` 把它提升为 problem——
   * 否则「源文本被改过、下游全部 specHash 引用失效」在接口层表现为**校验通过**。
   */
  const hash = formulaHash(hashInput);
  const declaredHash = optionalString(spec.hash, 'hash');
  if (declaredHash && declaredHash !== hash) {
    warnings.push({
      code: 'hash-mismatch',
      message: `登记的 hash ${declaredHash} 与重算结果 ${hash} 不一致：源文本可能被改过（以重算结果为准，下游引用会因此失效）。`,
    });
  }

  if (strict) {
    const known = new Set(['specVersion', 'node', 'nodeVersion', 'background', 'theoryVersion', 'declarations', 'definitions', 'assumptions', 'statement', 'claims', 'references', 'boundary', 'source', 'hash']);
    for (const key of Object.keys(spec)) {
      if (!known.has(key)) failAt(`formalSpec 出现未登记字段 ${key}`, null, 'invalid-field', { field: key });
    }
  }

  return {
    specVersion,
    node,
    nodeVersion,
    background: backgroundId,
    theoryVersion,
    bases,
    declarations,
    definitions: definitionsOut,
    assumptions,
    statement: { source: statementSource, kind: statementKind, formula: statementFormula, canonical: alphaCanonical(statementFormula) },
    claims,
    references,
    boundary,
    source,
    hash,
    warnings,
  };
}

/** 定义体的类型推断（供 `parseSpec` 与本地检查复用）：不写出类型注释就报 undeclared-type。 */
function inferClosedType(term, ctx) {
  const scope = makeScope(ctx);
  const type = inferTermType(term, scope, scope.constraints);
  const subst = solveConstraints(scope);
  const resolved = resolveTypeTree(type, subst);
  const pending = firstPendingMeta(resolved);
  if (pending !== null) {
    failAt('定义体的类型无法推断：请给绑定变量写类型注释。', scope.metaPos.get(pending) ?? null, 'undeclared-type');
  }
  return resolved;
}

/** `def name : ty = body` 形式取右部；否则原样返回。 */
function definitionBodySource(source, name) {
  const match = /^\s*def\s+([\p{L}_][\p{L}\p{N}_'′₀-₉]*)\s*(?::([^=]*))?=([\s\S]*)$/u.exec(source);
  if (!match) return source;
  if (match[1] !== name) failAt(`定义体里的名字 ${match[1]} 与 name 字段 ${name} 不一致`, null, 'invalid-field', { field: 'definitions.source' });
  return match[3];
}

/** 粗糙但保守的「提到了某个名字」判断：宁可多算一条边，也不漏掉一个环。 */
function bodyMentions(body, name) {
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}_'′₀-₉])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}\\p{N}_'′₀-₉]|$)`, 'u');
  return pattern.test(body);
}

function findCycle(graph) {
  const state = new Map();
  const stack = [];
  let found = null;
  const visit = (node) => {
    if (found) return;
    state.set(node, 'visiting');
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      if (found) break;
      if (state.get(next) === 'visiting') {
        found = [...stack.slice(stack.indexOf(next)), next];
        return;
      }
      if (!state.has(next)) visit(next);
    }
    stack.pop();
    state.set(node, 'done');
  };
  for (const node of graph.keys()) if (!state.has(node)) visit(node);
  return found;
}

function topologicalOrder(graph) {
  const order = [];
  const seen = new Set();
  const visit = (node) => {
    if (seen.has(node)) return;
    seen.add(node);
    for (const next of graph.get(node) ?? []) visit(next);
    order.push(node);
  };
  for (const node of graph.keys()) visit(node);
  return order;
}

/* ==========================================================================
 * 九、草稿校验入口（server/api.mjs 的 POST /formal/validate）
 * ======================================================================== */

function problemFrom(error) {
  if (error instanceof McsError) {
    return {
      code: error.details?.reason ?? error.code,
      message: error.message,
      line: error.details?.line ?? null,
      column: error.details?.column ?? null,
      token: error.details?.token ?? null,
    };
  }
  return { code: 'internal', message: `形式化草稿校验内部错误：${error?.message ?? error}`, line: null, column: null, token: null };
}

/**
 * 校验一份形式化草稿：解析、类型检查、规范化、可读预览与引用覆盖。
 *
 * **绝不改任何状态**（草稿由编辑页自己保存），也**绝不抛异常**——接口层拿它直接回包，
 * 一次没接住的异常会把「哪里写错了」变成 500。`problems` 为空才算 `ok:true`；
 * 需要人看一眼但不拦路的（背景没登记、引用哈希无从核对）进 `warnings`。
 */
export function validateDraft(raw, { ontology, backgrounds } = {}) {
  const input = raw && typeof raw === 'object' && raw.spec && typeof raw.spec === 'object' ? raw.spec : raw ?? {};
  const problems = [];
  let spec = null;
  let hash = null;
  let statementReadable = null;
  let statementTex = null;
  let assumptionsReadable = [];
  let assumptionsTex = [];
  let referencesCoverage = [];

  try {
    const referenceIndex = buildReferenceIndex(ontology);
    spec = parseSpec(input, { backgrounds, referenceIndex });
    hash = spec.hash;
    statementReadable = formulaToReadable(spec.statement.formula);
    statementTex = formulaToTex(spec.statement.formula);
    assumptionsReadable = spec.assumptions.map((entry) => formulaToReadable(entry.formula));
    assumptionsTex = spec.assumptions.map((entry) => formulaToTex(entry.formula));
    referencesCoverage = spec.references.map((entry) => ({
      node: entry.node,
      version: entry.version,
      kind: entry.kind,
      specHash: entry.specHash,
      status: entry.status,
      note: entry.note,
    }));
    for (const entry of spec.references) {
      if (entry.status === 'stale') problems.push({ code: 'stale-reference', message: entry.note, line: null, column: null, token: entry.node });
    }
  } catch (error) {
    problems.push(problemFrom(error));
  }

  const warnings = [];
  if (inputsWarnings(spec)) warnings.push(...spec.warnings);
  else if (!spec) warnings.push({ code: 'parse-failed', message: '解析未通过，未生成归一 spec。' });
  if (spec && !spec.node) warnings.push({ code: 'missing-node', message: '未绑定节点（node 为空）；草稿可以保存，但不能发布为关系证据。' });
  /*
   * `hash-mismatch` 从 warnings 提升为 problems：源文本被改过之后，
   * 所有下游 specHash 引用都指向另一份内容，这件事必须拦住校验（`ok` 只看 problems）。
   * 其余 warning（背景没登记、引用无从核对）仍然只提示，不拦路。
   */
  const keptWarnings = [];
  for (const warning of warnings) {
    if (warning?.code === 'hash-mismatch') problems.push(warning);
    else keptWarnings.push(warning);
  }
  if (spec) {
    for (const reference of spec.references) {
      if (reference.status === 'unchecked') keptWarnings.push({ code: 'reference-unchecked', message: `引用 ${reference.node}@${reference.version}：${reference.note}` });
      if (reference.status === 'unresolved') keptWarnings.push({ code: 'reference-unresolved', message: `引用 ${reference.node}@${reference.version}：${reference.note}` });
    }
  }

  return {
    ok: problems.length === 0,
    problems,
    warnings: keptWarnings,
    spec,
    readable: { statement: statementReadable, assumptions: assumptionsReadable },
    tex: { statement: statementTex, assumptions: assumptionsTex },
    hash,
    coverage: { references: referencesCoverage },
  };
}

function inputsWarnings(spec) { return Boolean(spec && Array.isArray(spec.warnings)); }

/** 从本体快照里尽力拼一份「引用 -> 登记哈希」的索引；拿不到就返回 null（不改判为错误）。 */
function buildReferenceIndex(ontology) {
  if (!ontology || typeof ontology !== 'object') return null;
  if (typeof ontology.formalSpecHash === 'function') return (node, version) => ontology.formalSpecHash(node, version);
  const table = ontology.raw?.formalSpecs ?? ontology.formalSpecs;
  if (!table || typeof table !== 'object') return null;
  const index = {};
  for (const [key, entry] of Object.entries(table)) {
    if (!entry || typeof entry !== 'object') continue;
    const node = entry.node ?? key;
    const version = String(entry.version ?? entry.nodeVersion ?? '1');
    if (typeof entry.hash === 'string') index[`${node}@${version}`] = entry.hash;
  }
  return Object.keys(index).length > 0 ? index : null;
}
