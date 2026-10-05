/**
 * core/formal/finite.mjs —— 独立有限语义求值器（规格《自动关系发现-接口与语言规格》§2.12）
 *
 * ## 这个模块回答什么问题
 *
 * 给定一张**写死的有限运算表**与一条**已解析的规范公式树**，完整枚举量词，算出真假；并据此
 * 回答两件事：某个概念（一组公理）在这张表上是否成立；某个候选蕴含是否有反例。
 *
 * ## 为什么必须独立
 *
 * 它是 ND 检查器之外的**第二条证据链**：检查器说「这份证书按推理规则通过」，本模块说
 * 「这张有限运算表上这条命题成立」。两条证据只有互相独立才有交叉核对的价值。因此本文件：
 *
 * - 不引用内核检查器的任何代码，也不读它的源码（不 import、不复制其求值函数）；
 * - 不起外部解释器子进程，不调用命令行；
 * - 不 import 理论库目录下的任何东西；
 * - 除错误类型（`shared/errors.mjs`，纯常量与一个 Error 子类）外没有任何依赖。
 *
 * `tests/finite-models.test.mjs` 里有一条源码扫描断言把上面四条钉死。
 *
 * ## 接口（规格 §2.12）
 *
 * - `evaluateFormula(f, model, sig)` → boolean；`evaluateFormulaWithWitness` 另给否证见证；
 * - `checkStructure(model, conceptSpec, sig)` → `{ holds, table, violations, axioms, … }`；
 * - `findCounterexample(candidate, models, sig)` → `{ found, model, assignment, reason, … }`；
 * - `REGISTERED_MODELS` / `getModel(id)` / `modelSummary(model)` / `validateModel(model)`；
 * - `GROUP_AXIOMS` / `COMMUTATIVE_LAW`：群公理与交换律的登记清单（交换律**不在**群公理里）。
 *
 * `sig` 与内核的签名同形：`{ bases: ['G'], constants: { mul: 'G -> G -> G', e: 'G' } }`
 * （类型写字符串或结点都行）。缺省时从模型自身推。`sig` 里不要放真值类型 `o` 的谓词与逻辑符号：
 * 有限语义没有真值载体，碰到就报 `unsupported`，不猜。
 *
 * ## 两份数据与一份交叉核对
 *
 * 本模块自带**冻结的**预置表（`REGISTERED_MODELS`；§2.12 要求登记在求值器一侧）；
 * 界面登记 `data/formal/instances.mjs` 另有一份面向展示的记录（记号、元素阶、未登记范围、
 * 逐格重算）。两者是同一批对象的两种表示：`instanceToModel()` 把后者翻成本模块的模型形状，
 * `tests/finite-models.test.mjs` 逐格交叉核对两张表 —— **允许两份表示，不允许两份事实**。
 *
 * ## 数学约定（写清楚，避免两套口径）
 *
 * **类型**：原子类型（本模块只用载体名，如 `'G'`）与 `['->', a, b]`（右结合）。字符串写法
 * `'G -> G -> G'` 会被归一成结点写法，两种写法都接受。
 *
 * **项**（内核认证语言的规范形状）：
 *
 * | 形状 | 含义 |
 * |---|---|
 * | `['v', 名, 类型]` | 自由变量（由量词绑定） |
 * | `['b', 序号, 类型]` | 绑定变量（de Bruijn 序号，0 = 最内层抽象） |
 * | `['c', 名]` | 常元（0 元元素或运算符号，类型查签名） |
 * | `['app', f, x]` | 应用（左结合，逐次吸收一个实参） |
 * | `['lam', 参数类型, 体]` | 抽象，体内用 `['b', 0, 参数类型]` 指参数 |
 * | `['lift', ['lam', …], [实参, …]]` | 抽象通道：把抽象的**自由变量**（参数）按顺序代成实参，结果仍是「绑定变量的函数」 |
 *
 * **公式**：`['true']`、`['false']`、`['eq', t, u]`、`['and', a, b]`、`['imp', a, b]`、
 * `['iff', a, b]`（= `(a⇒b) ∧ (b⇒a)`；规范形式应当在解析期就展开，这里容忍它以防调用方漏展开）、
 * `['all', ['v', 名, 类型], 体]`、`['ex', ['v', 名, 类型], 体]`。
 * 析取 `or`、否定 `not`、旧语言的 `logic` 一律**拒绝**（规格 §1.3：首版语言不接受析取，
 * 否定在解析期展开为 `⇒ false`）；拒绝是为了不让「内核无规则可用的公式」在这一层被悄悄判真。
 *
 * **量词**只枚举**单一载体**（模型的 `carrier`）里的元素：函数类型上的量化超出本模块边界，
 * 报 `unsupported` 而不是偷偷跳过。
 *
 * **lift 的实参顺序**：与内核 `parameters()` 的顺序一致 —— 抽象的自由变量按**变量结点的规范
 * 序列化**字典序排列（`json.dumps(ensure_ascii=True, separators=(',',':'), sort_keys=True)`，
 * 即 `codec.pyStableString` 的口径）。本文件自带一份 `stableKey` 复刻该排序，因为顺序错了
 * 就会把实参代进错误的参数槽，而错误会以「看似合理的假结论」形式出现。
 *
 * **S₃ 约定**（与案例 `data/cases/group.mjs` 的 `group:noncomm` 一致）：元素是 `{1,2,3}` 上
 * 的全部 6 个双射，乘法 `mul(a, b) = a ∘ b` 表示**先作用 b 再作用 a**，即 `(a·b)(i) = a(b(i))`。
 * 于是 `(12)(23) = (123)`（1 的像是 2），`(23)(12) = (132)`（1 的像是 3），两者不等。
 *
 * **Z/5Z 单位群约定**：元素 `{1,2,3,4}`，`mul` 是模 5 乘法，单位元 `e = 1`。
 *
 * ## 边界（同时写进每一个返回值，界面直接显示）
 *
 * 1. 只检查**预置**有限对象（`REGISTERED_MODELS`）；不搜索任意模型、不生成模型、不做归纳；
 * 2. 找不到反例 → `undecided`，**绝不**等于「已证明」，也不升级为一般定理；
 * 3. ℝ、ℕ、一般群等无限结构**不以有限样本冒充完整模型**：这里通过只说明「在这张表上成立」；
 * 4. 有限反模型只反驳「该背景与该组前提下的蕴含」，不宣称推翻实数或流形中的结论。
 *
 * 证据状态：本文件的表格是人工登记的有限数据（`FINITE`），求值器本身是定义（`DEF`）。
 */

import { McsError, CODES } from '../../shared/errors.mjs';

export const FINITE_SEMANTICS_VERSION = 'mcs-finite/1';

/** 每条见证最多收集多少个失败实例（防止大表上见证列表爆炸；够用即可，不做穷尽枚举展示）。 */
export const MAX_WITNESSES = 24;

// ---------------------------------------------------------------------------
// 0. 边界文本：返回值里逐字带上，别让调用方自己组织措辞
// ---------------------------------------------------------------------------

export const FINITE_SEMANTICS_SCOPE =
  '有限语义：只在本模块预置的有限对象（REGISTERED_MODELS）上求值，量词遍历整个载体，值域只有写死的运算表；不搜索任意模型，也不生成新模型。';

export const FINITE_RESULT_SCOPE =
  '有限表上成立不等于一般定理：结论只对这张载体与这张运算表负责，不推广到其他阶数、其他运算，也不能代替对一般群、实数或自然数等无限结构的证明。';

export const UNDECIDED_SCOPE =
  '没找到反例只记为 undecided：有限枚举通过不等于命题已证明，这不构成证明（本模块不搜索任意模型，也不做归纳或极限论证）。';

export const FINITE_COUNTEREXAMPLE_SCOPE =
  '有限反模型只反驳「该背景与该组前提下的蕴含」，不宣称推翻实数、流形或一般群论中的结论。';

export const INFINITE_STRUCTURE_BOUNDARY =
  'ℝ、ℕ、一般群等无限结构不能用有限样本冒充完整模型：这里通过的检查只说明「在这张有限运算表上成立」。';

function scopeText(...parts) {
  return parts.filter(Boolean).join('');
}

// ---------------------------------------------------------------------------
// 1. 错误与类型工具
// ---------------------------------------------------------------------------

const bad = (message, details) => new McsError(CODES.BAD_REQUEST, message, 400, details);
const unsupported = (message, details) => new McsError(CODES.EVIDENCE_UNSUPPORTED, message, 400, details);

const ARROW = '->';

function isArrow(type) {
  return Array.isArray(type) && type.length === 3 && type[0] === ARROW;
}

function isAtom(type) {
  return typeof type === 'string' && type.length > 0 && !type.includes(ARROW) && !/\s/.test(type);
}

/** 字符串写法 `'G -> G -> G'` 或结点写法 `['->','G',['->','G','G']]` → 统一成结点（右结合）。 */
function normalizeType(type) {
  if (typeof type === 'string') {
    const text = type.trim();
    if (!text) throw bad('类型不能为空');
    const parts = text.split(ARROW).map((part) => part.trim());
    if (parts.some((part) => part.length === 0)) throw bad(`类型写法非法：${type}`);
    if (parts.length === 1) {
      if (!isAtom(parts[0])) throw bad(`类型里的原子类型名非法：${parts[0]}`);
      return parts[0];
    }
    let node = parts[parts.length - 1];
    for (let i = parts.length - 2; i >= 0; i -= 1) node = [ARROW, parts[i], node];
    return normalizeType(node);
  }
  if (isArrow(type)) return [ARROW, normalizeType(type[1]), normalizeType(type[2])];
  if (isAtom(type)) return type;
  throw bad(`类型必须是原子类型名或 ['->', a, b]：${JSON.stringify(type)}`);
}

function typeToText(type) {
  const node = normalizeType(type);
  if (isArrow(node)) {
    const left = isArrow(node[1]) ? `(${typeToText(node[1])})` : typeToText(node[1]);
    return `${left} ${ARROW} ${typeToText(node[2])}`;
  }
  return node;
}

function typeEquals(a, b) {
  const left = normalizeType(a);
  const right = normalizeType(b);
  if (isArrow(left) !== isArrow(right)) return false;
  if (!isArrow(left)) return left === right;
  return typeEquals(left[1], right[1]) && typeEquals(left[2], right[2]);
}

function arrowArity(type) {
  let node = normalizeType(type);
  let count = 0;
  while (isArrow(node)) {
    count += 1;
    node = node[2];
  }
  return count;
}

function typeAfterArgs(type, applied) {
  let node = normalizeType(type);
  for (let i = 0; i < applied; i += 1) node = node[2];
  return node;
}

function typeInputs(type) {
  const inputs = [];
  let node = normalizeType(type);
  while (isArrow(node)) {
    inputs.push(node[1]);
    node = node[2];
  }
  return inputs;
}

function typeCodomain(type) {
  let node = normalizeType(type);
  while (isArrow(node)) node = node[2];
  return node;
}

function typeAtoms(type, into = []) {
  const node = normalizeType(type);
  if (isArrow(node)) {
    typeAtoms(node[1], into);
    typeAtoms(node[2], into);
  } else {
    into.push(node);
  }
  return into;
}

// ---------------------------------------------------------------------------
// 2. 规范序列化（只用于 lift 参数排序）与自由变量
// ---------------------------------------------------------------------------

function jsonString(text) {
  let out = '"';
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (ch === '"') out += '\\"';
    else if (ch === '\\') out += '\\\\';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (code < 0x20 || code > 0x7e) {
      if (code > 0xffff) {
        // 与内核检查器稳定序列化的口径一致：非 ASCII 用 \uXXXX 转义，补星面用代理对写两个转义
        const rest = code - 0x10000;
        const high = 0xd800 + (rest >> 10);
        const low = 0xdc00 + (rest & 0x3ff);
        out += `\\u${high.toString(16).padStart(4, '0')}\\u${low.toString(16).padStart(4, '0')}`;
      } else {
        out += `\\u${code.toString(16).padStart(4, '0')}`;
      }
    } else out += ch;
  }
  return `${out}"`;
}

/**
 * 规范序列化：与 `json.dumps(x, ensure_ascii=True, separators=(',',':'), sort_keys=True)` 同口径。
 * 本模块只在 `parameters()` 的排序里用它，但口径必须与内核逐字符一致 —— 否则同一个 lift 项
 * 在两边把实参代进不同的参数槽。
 */
function stableKey(value) {
  if (value === null) return 'null';
  if (typeof value === 'string') return jsonString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableKey(item)).join(',')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${jsonString(key)}:${stableKey(value[key])}`).join(',')}}`;
  }
  throw bad(`无法规范序列化的值：${String(value)}`);
}

function compareStable(a, b) {
  const left = stableKey(a);
  const right = stableKey(b);
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

/**
 * 抽象的自由变量表，按规范序列化字典序排序 —— 与内核 `parameters()` 同序。
 * 与内核 `object_fv` 一致：**不进入 `lift` 内部**（lift 不计自由变量），`['b', …]` 也不是自由变量。
 */
function parameters(term) {
  const found = new Map();
  const walk = (node) => {
    if (!Array.isArray(node) || node.length === 0) return;
    if (node[0] === 'v') {
      const type = normalizeType(node[2]);
      const prior = found.get(node[1]);
      if (prior && !typeEquals(prior, type)) throw bad(`自由变量 ${node[1]} 出现两种类型`);
      found.set(node[1], type);
      return;
    }
    if (node[0] === 'app') {
      walk(node[1]);
      walk(node[2]);
      return;
    }
    if (node[0] === 'lam') walk(node[2]);
  };
  walk(term);
  return [...found.entries()]
    .map(([name, type]) => ['v', name, type])
    .sort(compareStable);
}

/** 公式里的自由变量（量词按名字绑定）。用于要求「只求值闭公式」。 */
function formulaFreeVars(formula, bound = new Set(), into = new Set()) {
  const termVars = (term, boundNames) => {
    if (!Array.isArray(term) || term.length === 0) return;
    if (term[0] === 'v') {
      if (!boundNames.has(term[1])) into.add(term[1]);
      return;
    }
    if (term[0] === 'app') {
      termVars(term[1], boundNames);
      termVars(term[2], boundNames);
      return;
    }
    if (term[0] === 'lam') termVars(term[2], boundNames);
    if (term[0] === 'lift') {
      // lift 按位置绑定了抽象的全部自由变量（实参即取值），因此只有实参带来自由变量。
      for (const arg of term[2] ?? []) termVars(arg, boundNames);
    }
  };
  const walk = (node, boundNames) => {
    if (!Array.isArray(node) || node.length === 0) return;
    if (node[0] === 'eq') {
      termVars(node[1], boundNames);
      termVars(node[2], boundNames);
      return;
    }
    if (node[0] === 'and' || node[0] === 'imp' || node[0] === 'iff') {
      walk(node[1], boundNames);
      walk(node[2], boundNames);
      return;
    }
    if (node[0] === 'all' || node[0] === 'ex') {
      const next = new Set(boundNames);
      if (Array.isArray(node[1]) && node[1][0] === 'v') next.add(node[1][1]);
      walk(node[2], next);
    }
  };
  walk(formula, bound);
  return into;
}

// ---------------------------------------------------------------------------
// 3. 预置有限对象：完整运算表与逆元表**写死**在下面（人工登记，FINITE）
// ---------------------------------------------------------------------------

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/**
 * Z/5Z 的单位群：`({1,2,3,4}, × mod 5, 1)`。
 * `mul` 是完整的 4×4 表，`inv` 是完整的逆元表（1↦1，2↦3，3↦2，4↦4）。
 */
const Z5_UNITS = deepFreeze({
  id: 'finite:z5-units',
  label: '模 5 乘法单位群 Z/5Z^×',
  nodeRef: 'group:units5',
  carrier: 'G',
  elements: ['1', '2', '3', '4'],
  ops: {
    mul: {
      type: 'G -> G -> G',
      // 行 = 左因子，列 = 右因子；表项即 (a×b) mod 5
      table: [
        ['1', '2', '3', '4'],
        ['2', '4', '1', '3'],
        ['3', '1', '4', '2'],
        ['4', '3', '2', '1'],
      ],
    },
    inv: { type: 'G -> G', table: ['1', '3', '2', '4'] },
  },
  consts: { e: '1' },
  note: '2 的幂依次为 1,2,4,3，给出四元循环群；交换性是该例的偶然特征，不是群公理。',
});

/**
 * S₃ = {1,2,3} 上全部双射（6 元非交换群）。
 *
 * 乘法约定：`mul(a, b) = a ∘ b`，**先作用 b 再作用 a**，`(a·b)(i) = a(b(i))`。
 * 于是 `(12)(23) = (123)`（1 的像是 2），`(23)(12) = (132)`（1 的像是 3），二者不等。
 *
 * `elementMaps` 记录每个元素的像（像 1、像 2、像 3），**不参与求值**：它只是约定的文字化，
 * 由测试用来从像表重新算出乘法表，与上面写死的表逐格交叉核对（防止手抄错一格）。
 */
const S3 = deepFreeze({
  id: 'finite:s3',
  label: 'S₃（{1,2,3} 上全部双射的对称群）',
  nodeRef: 'group:noncomm',
  carrier: 'G',
  elements: ['e', '(12)', '(13)', '(23)', '(123)', '(132)'],
  elementMaps: {
    'e': [1, 2, 3],
    '(12)': [2, 1, 3],
    '(13)': [3, 2, 1],
    '(23)': [1, 3, 2],
    '(123)': [2, 3, 1],
    '(132)': [3, 1, 2],
  },
  ops: {
    mul: {
      type: 'G -> G -> G',
      table: [
        ['e', '(12)', '(13)', '(23)', '(123)', '(132)'],
        ['(12)', 'e', '(132)', '(123)', '(23)', '(13)'],
        ['(13)', '(123)', 'e', '(132)', '(12)', '(23)'],
        ['(23)', '(132)', '(123)', 'e', '(13)', '(12)'],
        ['(123)', '(13)', '(23)', '(12)', '(132)', 'e'],
        ['(132)', '(23)', '(12)', '(13)', 'e', '(123)'],
      ],
    },
    inv: { type: 'G -> G', table: ['e', '(12)', '(13)', '(23)', '(132)', '(123)'] },
  },
  consts: { e: 'e' },
  note: '按「先作用右边」的复合约定，(12)(23)=(123) 而 (23)(12)=(132)，故非交换；六个元素仍满足群公理。',
});

const MODELS = new Map([
  [Z5_UNITS.id, Z5_UNITS],
  [S3.id, S3],
]);

/** 本模块认得（且只认得）的有限对象。其他 id 一律 `unsupported`，不做任何搜索。 */
export const REGISTERED_MODELS = Object.freeze([...MODELS.keys()]);

export function isRegisteredModel(id) {
  return MODELS.has(id);
}

/** 按 id 取预置模型（冻结对象，不可被调用方改坏）。未知 id → unsupported。 */
export function getModel(id) {
  const model = MODELS.get(id);
  if (!model) {
    throw unsupported(`未知的有限模型：${String(id)}（本模块只认 ${REGISTERED_MODELS.join('、')}，不搜索任意模型）`);
  }
  return model;
}

/**
 * 结构自检：运算表是否闭合、形状是否与类型相符、常元是否落在载体里。
 * 返回问题清单（空数组 = 通过）。**不做数学检查**（结合律之类要跑求值器）。
 */
export function validateModel(model) {
  const problems = [];
  if (!model || typeof model !== 'object') return ['模型必须是对象'];
  if (typeof model.id !== 'string' || model.id.length === 0) problems.push('缺少模型 id');
  if (typeof model.carrier !== 'string' || model.carrier.length === 0) problems.push('缺少载体类型名 carrier');

  const elements = model.elements;
  if (!Array.isArray(elements) || elements.length === 0) {
    problems.push('载体 elements 必须是非空数组');
  } else {
    const seen = new Set();
    for (const name of elements) {
      if (typeof name !== 'string' || name.length === 0) {
        problems.push('载体元素必须是非空字符串');
        break;
      }
      if (seen.has(name)) {
        problems.push(`载体元素重复：${name}`);
        break;
      }
      seen.add(name);
    }
  }
  const carrierElements = Array.isArray(elements) ? elements : [];
  const size = carrierElements.length;

  const ops = model.ops && typeof model.ops === 'object' ? model.ops : {};
  for (const [name, op] of Object.entries(ops)) {
    if (!op || typeof op !== 'object') {
      problems.push(`运算 ${name} 缺少定义`);
      continue;
    }
    let type;
    try {
      type = normalizeType(op.type);
    } catch (error) {
      problems.push(`运算 ${name} 的类型非法：${error.message}`);
      continue;
    }
    const arity = arrowArity(type);
    if (arity < 1 || arity > 2) {
      problems.push(`运算 ${name} 的表格式只支持一元与二元（现在是 ${arity} 元）`);
      continue;
    }
    if ([...typeInputs(type), typeCodomain(type)].some((part) => !typeEquals(part, model.carrier))) {
      problems.push(`运算 ${name} 的类型 ${typeToText(type)} 不是单一载体 ${model.carrier} 上的运算`);
      continue;
    }
    const closed = (value) => typeof value === 'string' && carrierElements.includes(value);
    if (arity === 1) {
      if (!Array.isArray(op.table) || op.table.length !== size) {
        problems.push(`运算 ${name} 的逆元表长度应为 ${size}`);
      } else if (!op.table.every(closed)) {
        problems.push(`运算 ${name} 的表里有不在载体中的取值`);
      }
    } else if (!Array.isArray(op.table) || op.table.length !== size) {
      problems.push(`运算 ${name} 的乘法表应有 ${size} 行`);
    } else if (!op.table.every((row) => Array.isArray(row) && row.length === size)) {
      problems.push(`运算 ${name} 的乘法表每行应有 ${size} 格`);
    } else if (!op.table.every((row) => row.every(closed))) {
      problems.push(`运算 ${name} 的表里有不在载体中的取值`);
    }
  }

  const consts = model.consts && typeof model.consts === 'object' ? model.consts : {};
  for (const [name, value] of Object.entries(consts)) {
    if (Object.prototype.hasOwnProperty.call(ops, name)) problems.push(`常元 ${name} 与运算重名`);
    if (!carrierElements.includes(value)) problems.push(`常元 ${name} 的取值 ${String(value)} 不在载体中`);
  }
  return problems;
}

/**
 * 签名：`{ bases: ['G'], constants: { mul: 'G -> G -> G', inv: 'G -> G', e: 'G' } }`。
 * 缺省时从模型自己推（模型的运算与常元默认可用）。`o` 与谓词不在有限语义范围内。
 */
function makeContext(model, sig) {
  const problems = validateModel(model);
  if (problems.length > 0) {
    throw bad(`有限模型结构非法（${model?.id ?? '未命名'}）：${problems[0]}`, { model: model?.id ?? null, problems });
  }
  const supplied = sig && typeof sig === 'object' ? sig : {};
  const constants = {};
  for (const [name, op] of Object.entries(model.ops ?? {})) constants[name] = normalizeType(op.type);
  for (const name of Object.keys(model.consts ?? {})) constants[name] = model.carrier;
  for (const [name, type] of Object.entries(supplied.constants ?? {})) {
    try {
      constants[name] = normalizeType(type);
    } catch (error) {
      throw bad(`签名里常量 ${name} 的类型非法：${error.message}`);
    }
  }
  const bases = Array.isArray(supplied.bases) && supplied.bases.length > 0
    ? supplied.bases.map((entry) => String(entry))
    : [model.carrier];
  if (!bases.includes(model.carrier)) {
    throw unsupported(`签名里的载体表（${bases.join('、')}）不含模型载体 ${model.carrier}：本模块不做跨载体解释`);
  }
  const requested = supplied.maxWitnesses;
  return {
    model,
    constants,
    bases,
    carrier: model.carrier,
    index: new Map(model.elements.map((name, i) => [name, i])),
    opValues: new Map(),
    maxWitnesses: Number.isInteger(requested) && requested > 0 ? requested : MAX_WITNESSES,
  };
}

function assertDeclaredType(type, ctx, what) {
  for (const atom of typeAtoms(type)) {
    if (!ctx.bases.includes(atom)) {
      throw bad(`${what} 的类型 ${typeToText(type)} 含未声明的原子类型 ${atom}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. 项：类型推断（形状校验）与求值
// ---------------------------------------------------------------------------

function needArity(node, length, what) {
  if (!Array.isArray(node) || node.length !== length) {
    throw bad(`${what} 的形状应为长度 ${length} 的数组：${JSON.stringify(node)}`);
  }
}

/** 项的类型（复刻内核 term_type 的口径，包含 lift 的参数个数/类型核对）。 */
function termTypeOf(term, ctx, bound = []) {
  if (!Array.isArray(term) || term.length === 0) throw bad('项必须是 [标签, …] 形状的规范项树');
  switch (term[0]) {
    case 'v': {
      needArity(term, 3, '变量 v');
      if (typeof term[1] !== 'string' || term[1].length === 0) throw bad('变量名必须是非空字符串');
      const type = normalizeType(term[2]);
      assertDeclaredType(type, ctx, `变量 ${term[1]}`);
      return type;
    }
    case 'b': {
      needArity(term, 3, '绑定变量 b');
      const slot = bound[term[1]];
      if (!slot) throw bad(`悬空的绑定变量 #${term[1]}（当前抽象深度 ${bound.length}）`);
      if (!typeEquals(slot, normalizeType(term[2]))) {
        throw bad(`绑定变量 #${term[1]} 的类型与所在抽象不一致：${typeToText(term[2])} ≠ ${typeToText(slot)}`);
      }
      return slot;
    }
    case 'c': {
      needArity(term, 2, '常元 c');
      const type = ctx.constants[term[1]];
      if (!type) throw bad(`未声明的常量：${String(term[1])}`, { model: ctx.model.id });
      return type;
    }
    case 'app': {
      needArity(term, 3, '应用 app');
      const fnType = termTypeOf(term[1], ctx, bound);
      if (!isArrow(fnType)) throw bad(`${describeTerm(term[1])} 的类型 ${typeToText(fnType)} 不是函数，不能应用`);
      const argType = termTypeOf(term[2], ctx, bound);
      if (!typeEquals(fnType[1], argType)) {
        throw bad(`应用类型不匹配：${typeToText(fnType)} 应用于 ${typeToText(argType)}`);
      }
      return fnType[2];
    }
    case 'lam': {
      needArity(term, 3, '抽象 lam');
      const parameterType = normalizeType(term[1]);
      assertDeclaredType(parameterType, ctx, '抽象的参数');
      return [ARROW, parameterType, termTypeOf(term[2], ctx, [parameterType, ...bound])];
    }
    case 'lift': {
      needArity(term, 3, '抽象通道 lift');
      const abstraction = term[1];
      if (!Array.isArray(abstraction) || abstraction[0] !== 'lam') {
        throw bad('lift 的第一个成分必须是规范抽象 [lam, 参数类型, 体]');
      }
      if (!Array.isArray(term[2])) throw bad('lift 的第二个成分必须是实参数组');
      const params = parameters(abstraction);
      if (params.length !== term[2].length) {
        throw bad(`lift 的实参个数（${term[2].length}）与抽象的自由变量个数（${params.length}）不一致`, {
          parameters: params.map((entry) => entry[1]),
        });
      }
      term[2].forEach((arg, i) => {
        const want = normalizeType(params[i][2]);
        const got = termTypeOf(arg, ctx, bound);
        if (!typeEquals(want, got)) {
          throw bad(`lift 第 ${i + 1} 个实参的类型不对（参数 ${params[i][1]} 要求 ${typeToText(want)}，实际 ${typeToText(got)}）`);
        }
      });
      return termTypeOf(abstraction, ctx, bound);
    }
    default:
      throw bad(`不认识的项形状：${String(term[0])}（规范项只有 v / b / c / app / lam / lift）`);
  }
}

/** 可读化（只用于见证与理由文本；语言的规范读法由 language.mjs 负责）。 */
function describeTerm(term) {
  if (!Array.isArray(term) || term.length === 0) return String(term);
  switch (term[0]) {
    case 'v':
      return String(term[1]);
    case 'b':
      return `#${term[1]}`;
    case 'c':
      return String(term[1]);
    case 'app': {
      const args = [];
      let head = term;
      while (Array.isArray(head) && head[0] === 'app') {
        args.unshift(describeTerm(head[2]));
        head = head[1];
      }
      return `${describeTerm(head)}(${args.join(', ')})`;
    }
    case 'lam':
      return `λ#0.${describeTerm(term[2])}`;
    case 'lift':
      return `lift(${describeTerm(term[1])})[${(term[2] ?? []).map((arg) => describeTerm(arg)).join(', ')}]`;
    default:
      return JSON.stringify(term);
  }
}

function describeFormula(formula) {
  if (!Array.isArray(formula) || formula.length === 0) return String(formula);
  switch (formula[0]) {
    case 'true':
      return 'true';
    case 'false':
      return 'false';
    case 'eq':
      return `${describeTerm(formula[1])} = ${describeTerm(formula[2])}`;
    case 'and':
      return `(${describeFormula(formula[1])} ∧ ${describeFormula(formula[2])})`;
    case 'imp':
      return `(${describeFormula(formula[1])} ⇒ ${describeFormula(formula[2])})`;
    case 'iff':
      return `(${describeFormula(formula[1])} ⇔ ${describeFormula(formula[2])})`;
    case 'all':
      return `∀${formula[1]?.[1]}. ${describeFormula(formula[2])}`;
    case 'ex':
      return `∃${formula[1]?.[1]}. ${describeFormula(formula[2])}`;
    default:
      return JSON.stringify(formula);
  }
}

function isFunctionValue(value) {
  return Boolean(value) && typeof value === 'object' && value.kind === 'fun';
}

function elementOf(value, ctx, what) {
  if (typeof value === 'string' && ctx.index.has(value)) return ctx.index.get(value);
  throw bad(`值 ${String(value)} 不在载体 ${ctx.carrier} 中（${what}）`, { model: ctx.model.id });
}

function lookupTable(table, idx) {
  return idx.length === 1 ? table[idx[0]] : table[idx[0]][idx[1]];
}

function tableFunction(ctx, name, op) {
  const type = normalizeType(op.type);
  const arity = arrowArity(type);
  const build = (args) => ({
    kind: 'fun',
    name,
    type: typeAfterArgs(type, args.length),
    arity: arity - args.length,
    apply: (arg) => {
      const idx = elementOf(arg, ctx, `运算 ${name} 的第 ${args.length + 1} 个实参`);
      const next = [...args, idx];
      if (next.length < arity) return build(next);
      return lookupTable(op.table, next);
    },
  });
  return build([]);
}

function constantValue(name, ctx) {
  if (!Object.prototype.hasOwnProperty.call(ctx.constants, name)) {
    throw bad(`未声明的常量：${name}`, { model: ctx.model.id });
  }
  const type = ctx.constants[name];
  if (isArrow(type)) {
    const op = (ctx.model.ops ?? {})[name];
    if (!op) {
      throw unsupported(`函数型常量 ${name} 在有限模型 ${ctx.model.id} 上没有运算表：本模块不会凭空构造运算`);
    }
    let cached = ctx.opValues.get(name);
    if (!cached) {
      cached = tableFunction(ctx, name, op);
      ctx.opValues.set(name, cached);
    }
    return cached;
  }
  if (typeEquals(type, ctx.carrier)) {
    const model = ctx.model;
    const label = Object.prototype.hasOwnProperty.call(model.consts ?? {}, name)
      ? model.consts[name]
      : (ctx.index.has(name) ? name : undefined);
    if (label === undefined) {
      throw bad(`常元 ${name}（类型 ${typeToText(type)}）在有限模型 ${model.id} 上没有取值`, { model: model.id });
    }
    return label;
  }
  throw unsupported(`常量 ${name} 的类型 ${typeToText(type)} 超出有限语义边界（只支持载体 ${ctx.carrier} 及其函数类型）`);
}

function withFree(free, name, type, value) {
  const next = new Map(free);
  next.set(name, { type: normalizeType(type), value });
  return next;
}

function abstractionValue(abstraction, env, ctx) {
  const parameterType = normalizeType(abstraction[1]);
  const bound = [parameterType, ...env.db.map((slot) => slot.type)];
  const bodyType = termTypeOf(abstraction[2], ctx, bound);
  return {
    kind: 'fun',
    name: 'λ',
    type: [ARROW, parameterType, bodyType],
    arity: 1,
    apply: (arg) => {
      if (typeEquals(parameterType, ctx.carrier)) elementOf(arg, ctx, '抽象的实参');
      else if (!isFunctionValue(arg)) throw bad('函数型参数的实参必须是函数值');
      return evalTerm(abstraction[2], { ...env, db: [{ type: parameterType, value: arg }, ...env.db] }, ctx);
    },
  };
}

function evalTerm(term, env, ctx) {
  if (!Array.isArray(term) || term.length === 0) throw bad('项必须是 [标签, …] 形状的规范项树');
  switch (term[0]) {
    case 'v': {
      const slot = env.free.get(term[1]);
      if (!slot) throw bad(`自由变量没有赋值：${term[1]}（有限语义只求值闭公式，变量必须由量词绑定）`);
      return slot.value;
    }
    case 'b': {
      const slot = env.db[term[1]];
      if (!slot) throw bad(`悬空的绑定变量 #${term[1]}`);
      return slot.value;
    }
    case 'c':
      return constantValue(term[1], ctx);
    case 'app': {
      const fn = evalTerm(term[1], env, ctx);
      if (!isFunctionValue(fn)) throw bad(`${describeTerm(term[1])} 不是可应用的函数值`);
      return fn.apply(evalTerm(term[2], env, ctx));
    }
    case 'lam':
      return abstractionValue(term, env, ctx);
    case 'lift': {
      needArity(term, 3, '抽象通道 lift');
      const abstraction = term[1];
      if (!Array.isArray(abstraction) || abstraction[0] !== 'lam') {
        throw bad('lift 的第一个成分必须是规范抽象 [lam, 参数类型, 体]');
      }
      if (!Array.isArray(term[2])) throw bad('lift 的第二个成分必须是实参数组');
      const params = parameters(abstraction);
      if (params.length !== term[2].length) {
        throw bad(`lift 的实参个数（${term[2].length}）与抽象的自由变量个数（${params.length}）不一致`);
      }
      const free = new Map(env.free);
      term[2].forEach((arg, i) => {
        free.set(params[i][1], { type: normalizeType(params[i][2]), value: evalTerm(arg, env, ctx) });
      });
      return abstractionValue(abstraction, { ...env, free }, ctx);
    }
    default:
      throw bad(`不认识的项形状：${String(term[0])}（规范项只有 v / b / c / app / lam / lift）`);
  }
}

// ---------------------------------------------------------------------------
// 5. 公式：形状校验与求值（带否证见证）
// ---------------------------------------------------------------------------

function binderDomain(binder, ctx) {
  if (!Array.isArray(binder) || binder[0] !== 'v' || binder.length !== 3) {
    throw bad(`量词绑定必须是 ['v', 名, 类型]：${JSON.stringify(binder)}`);
  }
  const type = normalizeType(binder[2]);
  if (!typeEquals(type, ctx.carrier)) {
    throw unsupported(
      `量词绑定 ${binder[1]} 的类型 ${typeToText(type)} 不是本模型的载体 ${ctx.carrier}：本模块只在单一有限载体上完整枚举`,
      { model: ctx.model.id },
    );
  }
  return ctx.model.elements;
}

function checkFormulaShape(formula, ctx) {
  if (!Array.isArray(formula) || formula.length === 0) throw bad('公式必须是 [标签, …] 形状的规范公式树');
  switch (formula[0]) {
    case 'true':
    case 'false':
      needArity(formula, 1, formula[0]);
      return;
    case 'eq': {
      needArity(formula, 3, 'eq');
      const left = termTypeOf(formula[1], ctx, []);
      const right = termTypeOf(formula[2], ctx, []);
      if (!typeEquals(left, right)) {
        throw bad(`等式两边类型不一致：${typeToText(left)} 与 ${typeToText(right)}`);
      }
      return;
    }
    case 'and':
    case 'imp':
    case 'iff':
      needArity(formula, 3, formula[0]);
      checkFormulaShape(formula[1], ctx);
      checkFormulaShape(formula[2], ctx);
      return;
    case 'all':
    case 'ex':
      needArity(formula, 3, formula[0]);
      binderDomain(formula[1], ctx);
      checkFormulaShape(formula[2], ctx);
      return;
    case 'or':
      throw unsupported('首版语言不接受析取 or（内核没有 or 规则，规格 §1.3）');
    case 'not':
      throw unsupported('首版语言不接受否定 not：解析期应展开为「⇒ false」（规格 §1.3）');
    case 'logic':
      throw unsupported('旧语言的 logic 常元不在有限语义范围内：命题型（o）变量与逻辑符号没有有限载体可枚举');
    default:
      throw bad(`不认识的公式形状：${String(formula[0])}`);
  }
}

function tagFailures(failures, wrapper) {
  return failures.map((failure) => ({ ...wrapper, child: failure }));
}

/**
 * 求值核心：返回 `{ value, failures }`。
 * `failures` 只在为假时非空，是**足以否证**的见证路径（量词给出具体取值，等式给出两侧取值）；
 * 最多收 `ctx.maxWitnesses` 条，收满即停止搜索（布尔值已定，不需要穷尽）。
 */
function evalFormulaNode(formula, env, ctx) {
  switch (formula[0]) {
    case 'true':
      return { value: true, failures: [] };
    case 'false':
      return { value: false, failures: [{ kind: 'false' }] };
    case 'eq': {
      const left = evalTerm(formula[1], env, ctx);
      const right = evalTerm(formula[2], env, ctx);
      if (left === right) return { value: true, failures: [] };
      return {
        value: false,
        failures: [{
          kind: 'eq',
          left,
          right,
          leftText: describeTerm(formula[1]),
          rightText: describeTerm(formula[2]),
        }],
      };
    }
    case 'and': {
      const left = evalFormulaNode(formula[1], env, ctx);
      if (!left.value) return { value: false, failures: tagFailures(left.failures, { kind: 'and', side: 'left' }) };
      const right = evalFormulaNode(formula[2], env, ctx);
      if (!right.value) return { value: false, failures: tagFailures(right.failures, { kind: 'and', side: 'right' }) };
      return { value: true, failures: [] };
    }
    case 'imp': {
      const left = evalFormulaNode(formula[1], env, ctx);
      if (!left.value) return { value: true, failures: [] };
      const right = evalFormulaNode(formula[2], env, ctx);
      if (!right.value) return { value: false, failures: tagFailures(right.failures, { kind: 'imp' }) };
      return { value: true, failures: [] };
    }
    case 'iff': {
      const left = evalFormulaNode(formula[1], env, ctx);
      const right = evalFormulaNode(formula[2], env, ctx);
      if (left.value === right.value) return { value: true, failures: [] };
      const failing = left.value ? right : left;
      const side = left.value ? 'forward' : 'backward';
      return { value: false, failures: tagFailures(failing.failures, { kind: 'iff', side }) };
    }
    case 'all': {
      const binder = formula[1];
      const domain = binderDomain(binder, ctx);
      const failures = [];
      for (const value of domain) {
        const child = evalFormulaNode(formula[2], { ...env, free: withFree(env.free, binder[1], binder[2], value) }, ctx);
        if (!child.value) {
          for (const failure of child.failures) {
            failures.push({ kind: 'all', binder: binder[1], type: normalizeType(binder[2]), value, child: failure });
            if (failures.length >= ctx.maxWitnesses) break;
          }
          if (failures.length >= ctx.maxWitnesses) break;
        }
      }
      return { value: failures.length === 0, failures };
    }
    case 'ex': {
      const binder = formula[1];
      const domain = binderDomain(binder, ctx);
      for (const value of domain) {
        const child = evalFormulaNode(formula[2], { ...env, free: withFree(env.free, binder[1], binder[2], value) }, ctx);
        if (child.value) return { value: true, failures: [] };
      }
      return {
        value: false,
        failures: [{
          kind: 'ex',
          binder: binder[1],
          type: normalizeType(binder[2]),
          count: domain.length,
          tried: domain.slice(0, 8),
        }],
      };
    }
    default:
      throw bad(`不认识的公式形状：${String(formula[0])}`);
  }
}

/** 把见证路径压成「赋值 + 失败的等式 + 路径」，供界面与测试直接读。 */
export function summarizeWitness(witness) {
  if (!witness) return null;
  const assignment = {};
  const path = [];
  let equation = null;
  let node = witness;
  while (node) {
    switch (node.kind) {
      case 'all':
        assignment[node.binder] = node.value;
        path.push(`∀${node.binder} = ${node.value}`);
        node = node.child;
        break;
      case 'and':
        path.push(node.side === 'left' ? '左合取支不成立' : '右合取支不成立');
        node = node.child;
        break;
      case 'imp':
        path.push('前提成立而结论不成立');
        node = node.child;
        break;
      case 'iff':
        path.push(node.side === 'forward' ? 'a⇒b 方向不成立' : 'b⇒a 方向不成立');
        node = node.child;
        break;
      case 'eq':
        equation = {
          left: node.left,
          right: node.right,
          leftText: node.leftText,
          rightText: node.rightText,
          text: `${node.leftText} = ${node.left}，而 ${node.rightText} = ${node.right}，两者不等`,
        };
        path.push(`${node.leftText} = ${node.left}，${node.rightText} = ${node.right}，两者不等`);
        node = null;
        break;
      case 'ex':
        path.push(`∃${node.binder}：载体里 ${node.count} 个元素逐个试过，都不成立`);
        node = null;
        break;
      case 'false':
        path.push('false 不成立');
        node = null;
        break;
      default:
        path.push(String(node.kind));
        node = null;
    }
  }
  return { assignment, equation, path };
}

const emptyEnv = () => ({ free: new Map(), db: [] });

function assertClosedFormula(formula, what) {
  const free = [...formulaFreeVars(formula)];
  if (free.length > 0) {
    throw bad(`${what}含未绑定的自由变量：${free.join('、')}（有限语义只求值闭公式）`);
  }
}

// ---------------------------------------------------------------------------
// 6. 公开接口（规格 §2.12）
// ---------------------------------------------------------------------------

/**
 * 在有限模型上求一条**闭**公式的值，并给出否证见证。
 *
 * @param {unknown} formula 规范公式树（见文件头「公式」一表）
 * @param {object|string} model 预置模型对象或其 id
 * @param {object} [sig] `{ bases, constants, maxWitnesses? }`；缺省从模型推
 * @returns {{ value: boolean, witness: object|null, witnessSummary: object|null,
 *             model: string, formula: string, scope: string, boundary: string[] }}
 */
export function evaluateFormulaWithWitness(formula, model, sig) {
  const resolved = typeof model === 'string' ? getModel(model) : model;
  const ctx = makeContext(resolved, sig);
  checkFormulaShape(formula, ctx);
  assertClosedFormula(formula, '待求值的公式');
  const { value, failures } = evalFormulaNode(formula, emptyEnv(), ctx);
  const witness = value ? null : (failures[0] ?? null);
  return {
    value,
    witness,
    witnessSummary: summarizeWitness(witness),
    model: ctx.model.id,
    formula: describeFormula(formula),
    scope: value
      ? scopeText(FINITE_SEMANTICS_SCOPE, FINITE_RESULT_SCOPE)
      : scopeText(FINITE_SEMANTICS_SCOPE, FINITE_COUNTEREXAMPLE_SCOPE),
    boundary: [FINITE_RESULT_SCOPE, INFINITE_STRUCTURE_BOUNDARY, FINITE_COUNTEREXAMPLE_SCOPE],
  };
}

/** 只要真假时用这个（纯函数：不改模型、不改公式、可重复调用）。 */
export function evaluateFormula(formula, model, sig) {
  return evaluateFormulaWithWitness(formula, model, sig).value;
}

/**
 * 把签名里的常量拼成 `{ bases, constants }`，供不关心类型细节的调用方使用。
 */
export function signatureOf(model) {
  const resolved = typeof model === 'string' ? getModel(model) : model;
  const problems = validateModel(resolved);
  if (problems.length > 0) throw bad(`有限模型结构非法（${resolved?.id ?? '未命名'}）：${problems[0]}`, { problems });
  const constants = {};
  for (const [name, op] of Object.entries(resolved.ops ?? {})) constants[name] = typeToText(op.type);
  for (const name of Object.keys(resolved.consts ?? {})) constants[name] = resolved.carrier;
  return { bases: [resolved.carrier], constants };
}

/**
 * 把 `data/formal/instances.mjs` 的登记记录翻成本模块的模型形状。
 *
 * **不 import 那个文件**：谁提供数据谁负责把它递进来，求值器不反向依赖界面登记
 * （这样求值器不会因为登记层还在改而被卡住；两份表由测试逐格交叉核对，不允许各自漂移）。
 *
 * 登记记录的字段：`carrier`（元素名数组）、`ops: [{ name, arity, table }]`、`identity`、
 * `inverses: { 元素: 逆元 }`。本模块需要的是：载体、乘法表、逆元表、常元。
 *
 * 常元命名：
 * - 缺省给出规范名 `mul` / `inv` / `e`（本模块登记的 `GROUP_AXIOMS`、`COMMUTATIVE_LAW`
 *   用的就是这三个名字）；
 * - 登记层自己的运算名（如 `mul5` / `comp3`）作为**别名**一并保留；
 * - 恒等元本身的元素名（如 `e3` / `u1`）也登记成常元，于是 `['c', 'e3']` 直接可用；
 * - 若调用方的公式用的是登记层的整套记号（`mul5` / `one5` / `inv5`），用
 *   `instanceToModel(instance, { names: { mul: 'mul5', inv: 'inv5', e: 'one5' } })` 改名。
 */
export function instanceToModel(instance, options = {}) {
  if (!instance || typeof instance !== 'object') throw bad('instanceToModel 需要一条登记记录');
  const label = instance.id ?? '未命名';
  const elements = Array.isArray(instance.carrier) ? [...instance.carrier] : null;
  if (!elements || elements.length === 0) throw bad(`登记记录 ${label} 缺少载体 carrier`);
  const binary = (instance.ops ?? []).find((op) => op?.arity === 2 && Array.isArray(op.table));
  if (!binary) throw bad(`登记记录 ${label} 缺少二元运算表`);
  const inverses = instance.inverses ?? {};
  const invTable = elements.map((name) => {
    const inverse = inverses[name];
    if (!inverse) throw bad(`登记记录 ${label} 里元素 ${name} 没有登记逆元`);
    return inverse;
  });

  const names = { mul: 'mul', inv: 'inv', e: 'e', ...(options.names ?? {}) };
  const ops = { [names.mul]: { type: 'G -> G -> G', table: binary.table } };
  if (names.inv !== names.mul) ops[names.inv] = { type: 'G -> G', table: invTable };
  if (typeof binary.name === 'string' && binary.name && !(binary.name in ops)) {
    ops[binary.name] = { type: 'G -> G -> G', table: binary.table };
  }
  const consts = { [names.e]: instance.identity };
  if (typeof instance.identity === 'string' && !(instance.identity in consts) && elements.includes(instance.identity)) {
    consts[instance.identity] = instance.identity;
  }

  const model = {
    id: instance.id,
    label: instance.title ?? instance.id,
    nodeRef: (instance.nodes ?? [])[0] ?? null,
    carrier: 'G',
    elements,
    ops,
    consts,
    sourceOps: (instance.ops ?? []).map((op) => ({
      name: op.name,
      symbol: op.symbol ?? null,
      read: op.read ?? null,
      arity: op.arity,
    })),
    notation: instance.notation ?? instance.carrierNote ?? null,
    note: instance.note ?? '',
  };
  const problems = validateModel(model);
  if (problems.length > 0) {
    throw bad(`登记记录 ${label} 转成有限模型后结构非法：${problems[0]}`, { model: instance.id ?? null, problems });
  }
  return model;
}

function normalizeConcept(conceptSpec) {
  const single = Array.isArray(conceptSpec) && typeof conceptSpec[0] === 'string';
  const list = single ? [conceptSpec] : (Array.isArray(conceptSpec) ? conceptSpec : conceptSpec?.axioms);
  if (!Array.isArray(list) || list.length === 0) {
    throw bad('checkStructure 需要一个概念（{ id, label, axioms: [...] }）或至少一条公理公式');
  }
  const meta = Array.isArray(conceptSpec) ? {} : (conceptSpec ?? {});
  const axioms = list.map((entry, index) => {
    if (Array.isArray(entry)) {
      if (typeof entry[0] !== 'string') throw bad(`第 ${index + 1} 条公理不是规范公式树`);
      return { id: `ax${index + 1}`, label: `公理 ${index + 1}`, source: null, formula: entry };
    }
    const formula = entry?.formula ?? entry?.canonical ?? entry?.tree;
    if (!Array.isArray(formula) || typeof formula[0] !== 'string') {
      throw bad(`第 ${index + 1} 条公理缺少规范公式树（formula / canonical / tree）`);
    }
    return {
      id: entry.id ?? `ax${index + 1}`,
      label: entry.label ?? entry.id ?? `公理 ${index + 1}`,
      source: entry.source ?? entry.readable ?? null,
      formula,
    };
  });
  return { id: meta.id ?? null, label: meta.label ?? null, nodeRef: meta.nodeRef ?? null, axioms };
}

/** 运算表的展示形状：表头 + 逐行读数（界面直接画表）。 */function structureTable(ctx) {
  const { model } = ctx;
  const ops = {};
  const opOrder = [];
  for (const [name, op] of Object.entries(model.ops ?? {})) {
    const type = normalizeType(op.type);
    const arity = arrowArity(type);
    opOrder.push(name);
    ops[name] = {
      name,
      type: typeToText(type),
      arity,
      header: [...model.elements],
      rows: arity === 1
        ? model.elements.map((element, i) => ({ args: [element], values: [op.table[i]] }))
        : model.elements.map((element, i) => ({ args: [element], values: [...op.table[i]] })),
      commutative: arity === 2
        ? model.elements.every((a, i) => model.elements.every((b, j) => op.table[i][j] === op.table[j][i]))
        : null,
    };
  }
  const binary = opOrder.filter((name) => ops[name].arity === 2);
  return {
    carrier: model.carrier,
    elements: [...model.elements],
    consts: { ...(model.consts ?? {}) },
    ops,
    opOrder,
    isCommutative: binary.length > 0 ? binary.every((name) => ops[name].commutative) : null,
  };
}

/**
 * 逐条检查一个概念的全部公理在该有限模型上是否成立，并给出违反见证。
 *
 * @param {object|string} model 预置模型对象或其 id
 * @param {object|Array} conceptSpec `{ id, label, axioms: [{ id, label, source?, formula }] }`
 *        或公式列表、或单条公式
 * @param {object} [sig] 同 evaluateFormula
 * @returns {{ holds: boolean, table: object, violations: object[], axioms: object[],
 *             model: object, concept: object, scope: string, boundary: string[] }}
 */
export function checkStructure(model, conceptSpec, sig) {
  const resolved = typeof model === 'string' ? getModel(model) : model;
  const ctx = makeContext(resolved, sig);
  const concept = normalizeConcept(conceptSpec);
  const axioms = concept.axioms.map((axiom) => {
    checkFormulaShape(axiom.formula, ctx);
    assertClosedFormula(axiom.formula, `公理「${axiom.label}」`);
    const { value, failures } = evalFormulaNode(axiom.formula, emptyEnv(), ctx);
    const witness = value ? null : (failures[0] ?? null);
    return {
      id: axiom.id,
      label: axiom.label,
      source: axiom.source,
      formula: axiom.formula,
      readable: axiom.source ?? describeFormula(axiom.formula),
      holds: value,
      witness,
      witnesses: value ? [] : failures,
      assignment: value ? null : summarizeWitness(witness)?.assignment ?? null,
    };
  });
  const violations = axioms
    .filter((axiom) => !axiom.holds)
    .map((axiom) => ({
      id: axiom.id,
      label: axiom.label,
      source: axiom.source,
      readable: axiom.readable,
      witness: axiom.witness,
      witnesses: axiom.witnesses,
      assignment: axiom.assignment,
    }));
  return {
    holds: violations.length === 0,
    table: structureTable(ctx),
    violations,
    axioms,
    model: {
      id: ctx.model.id,
      label: ctx.model.label ?? ctx.model.id,
      carrier: ctx.model.carrier,
      order: ctx.model.elements.length,
      nodeRef: ctx.model.nodeRef ?? null,
      registered: isRegisteredModel(ctx.model.id),
      note: ctx.model.note ?? '',
    },
    concept: { id: concept.id, label: concept.label, nodeRef: concept.nodeRef, axioms: concept.axioms.length },
    scope: scopeText(FINITE_SEMANTICS_SCOPE, FINITE_RESULT_SCOPE),
    boundary: [
      '只检查预置有限对象；不搜索任意模型，也不做「补一个模型」的推断。',
      INFINITE_STRUCTURE_BOUNDARY,
      '某条公理不成立时，见证只是「这条表上的一处反例」，不是对该概念本身的否定。',
    ],
  };
}

// ---------------------------------------------------------------------------
// 7. 候选蕴含的反例搜索（规格 §2.12 的 findCounterexample）
// ---------------------------------------------------------------------------

function pickFormula(value, what) {
  if (Array.isArray(value) && typeof value[0] === 'string') return value;
  const nested = value?.formula ?? value?.canonical ?? value?.tree;
  if (Array.isArray(nested) && typeof nested[0] === 'string') return nested;
  throw bad(`缺少${what}的规范公式树`);
}

function normalizeAssumptions(assumptions) {
  if (assumptions === undefined || assumptions === null) return [];
  if (Array.isArray(assumptions) && assumptions.length > 0 && typeof assumptions[0] === 'string') {
    return [{ id: 'A1', source: null, formula: assumptions }];
  }
  if (!Array.isArray(assumptions)) throw bad('assumptions 必须是公式数组或 [{ id, formula }]');
  return assumptions.map((entry, index) => {
    if (Array.isArray(entry) && typeof entry[0] === 'string') {
      return { id: `A${index + 1}`, source: null, formula: entry };
    }
    return {
      id: entry?.id ?? `A${index + 1}`,
      source: entry?.source ?? null,
      formula: pickFormula(entry, `前提 ${entry?.id ?? index + 1}`),
    };
  });
}

function resolveBackground(background, sig) {
  if (background === undefined || background === null || background === '') {
    return { id: null, formulas: [], status: 'none', reason: null };
  }
  if (typeof background === 'string') {
    const table = sig?.backgroundFormulas ?? {};
    const formulas = table[background];
    if (!Array.isArray(formulas) || formulas.length === 0) {
      return {
        id: background,
        formulas: [],
        status: 'unresolved',
        reason: `背景只给了标识 ${background}，调用方没有在 sig.backgroundFormulas 里给出它的公式：本模块不读理论注册表，无法核对背景是否成立。`,
      };
    }
    return { id: background, formulas: formulas.map((entry) => pickFormula(entry, `背景 ${background}`)), status: 'ok', reason: null };
  }
  if (Array.isArray(background)) {
    if (background.length === 0) return { id: null, formulas: [], status: 'none', reason: null };
    if (typeof background[0] === 'string') {
      return { id: null, formulas: [background], status: 'ok', reason: null };
    }
    return { id: null, formulas: background.map((entry) => pickFormula(entry, '背景')), status: 'ok', reason: null };
  }
  if (Array.isArray(background.axioms)) {
    return {
      id: background.id ?? null,
      formulas: background.axioms.map((entry) => pickFormula(entry, '背景公理')),
      status: 'ok',
      reason: null,
    };
  }
  if (Array.isArray(background.formulas)) {
    return {
      id: background.id ?? null,
      formulas: background.formulas.map((entry) => pickFormula(entry, '背景公式')),
      status: 'ok',
      reason: null,
    };
  }
  throw bad('background 只能是公式树、公式数组、概念（{ axioms }）或背景标识 + sig.backgroundFormulas');
}

function formatAssignment(assignment) {
  const entries = Object.entries(assignment ?? {});
  if (entries.length === 0) return '（无自由变量）';
  return entries.map(([name, value]) => `${name} = ${value}`).join('，');
}

/**
 * 在给出的有限模型上找反例：**背景与全部前提成立、而目标不成立**。
 *
 * 判定顺序（任一步不过就不算反例，并记进 `checked[]`）：
 * 1. 模型结构合法（`validateModel`）；
 * 2. 模型已登记（`REGISTERED_MODELS`；`sig.allowUnregistered === true` 时才放行调用方**明确列出**的模型，
 *    仍然不做任何搜索）；
 * 3. 背景公式全部成立；
 * 4. 全部前提成立；
 * 5. 目标不成立 → 记为反例。
 *
 * @param {object} candidate `{ id?, background?, assumptions?, goal }`；goal 也可以是 `{ formula }`
 * @param {Array|undefined} models 模型对象或 id 列表；缺省 = 全部预置模型
 * @param {object} [sig] 求值签名，另可带 `backgroundFormulas`、`allowUnregistered`
 * @returns {{ found: boolean, status: 'refuted'|'undecided', model: string|null, assignment: object|null,
 *             reason: string, checked: object[], refutations: object[], scope: string, boundary: string[] }}
 */
export function findCounterexample(candidate, models, sig) {
  if (!candidate || typeof candidate !== 'object') throw bad('findCounterexample 需要一个候选对象');
  const options = sig && typeof sig === 'object' ? sig : {};
  const goal = pickFormula(candidate.goal, '目标');
  const assumptions = normalizeAssumptions(candidate.assumptions);
  const background = resolveBackground(candidate.background, options);
  const list = models === undefined || models === null
    ? REGISTERED_MODELS.map((id) => getModel(id))
    : models;
  if (!Array.isArray(list)) throw bad('models 必须是模型对象或模型 id 的数组');
  if (list.length === 0) throw bad('models 不能是空数组（没有可检查的有限对象）');

  const checked = [];
  const refutations = [];

  for (const entry of list) {
    const record = {
      model: typeof entry === 'string' ? entry : entry?.id ?? null,
      registered: false,
      usable: false,
      background: null,
      assumptions: {},
      goal: null,
      reason: '',
    };
    checked.push(record);

    let resolved;
    if (typeof entry === 'string') {
      if (!isRegisteredModel(entry)) {
        record.reason = `未登记的有限模型 ${entry}：本模块只检查预置对象，不搜索任意模型。`;
        record.registered = false;
        continue;
      }
      resolved = getModel(entry);
    } else {
      resolved = entry;
    }
    record.model = resolved?.id ?? record.model;

    const problems = validateModel(resolved);
    if (problems.length > 0) {
      record.reason = `模型结构非法，不能用作反例：${problems[0]}`;
      continue;
    }

    record.registered = isRegisteredModel(resolved.id);
    if (!record.registered && options.allowUnregistered !== true) {
      record.reason = `未登记的有限模型 ${resolved.id}：本模块只检查预置对象（REGISTERED_MODELS），不搜索任意模型。`;
      continue;
    }

    let ctx;
    try {
      ctx = makeContext(resolved, options);
      checkFormulaShape(goal, ctx);
      assertClosedFormula(goal, '目标');
      for (const formula of background.formulas) {
        checkFormulaShape(formula, ctx);
        assertClosedFormula(formula, '背景公式');
      }
      for (const item of assumptions) {
        checkFormulaShape(item.formula, ctx);
        assertClosedFormula(item.formula, `前提「${item.id}」`);
      }
    } catch (error) {
      record.reason = `公式无法在该模型上求值：${error.message}`;
      continue;
    }

    if (background.status === 'unresolved') {
      record.reason = background.reason;
      continue;
    }

    let blocked = false;
    if (background.formulas.length > 0) {
      const outcomes = background.formulas.map((formula) => {
        const { value, failures } = evalFormulaNode(formula, emptyEnv(), ctx);
        return { formula: describeFormula(formula), value, witness: value ? null : summarizeWitness(failures[0] ?? null) };
      });
      record.background = { id: background.id, holds: outcomes.every((item) => item.value), outcomes };
      const failed = outcomes.find((item) => !item.value);
      if (failed) {
        record.reason = `背景不成立（${failed.formula}${failed.witness ? `，见证 ${formatAssignment(failed.witness.assignment)}` : ''}）：不满足背景的对象不能用来反驳目标。`;
        blocked = true;
      }
    } else {
      record.background = { id: background.id, holds: null, outcomes: [] };
    }

    if (!blocked) {
      for (const item of assumptions) {
        const { value, failures } = evalFormulaNode(item.formula, emptyEnv(), ctx);
        record.assumptions[item.id] = {
          holds: value,
          readable: item.source ?? describeFormula(item.formula),
          witness: value ? null : summarizeWitness(failures[0] ?? null),
        };
        if (!value) {
          record.reason = `前提 ${item.id} 不成立：前提不成立的对象不能用来反驳目标。`;
          blocked = true;
          break;
        }
      }
    }

    if (blocked) continue;

    record.usable = true;
    const { value, failures } = evalFormulaNode(goal, emptyEnv(), ctx);
    record.goal = { holds: value, readable: describeFormula(goal) };
    if (!value) {
      const summary = summarizeWitness(failures[0] ?? null);
      const refutation = {
        model: ctx.model.id,
        assignment: summary?.assignment ?? {},
        equation: summary?.equation ?? null,
        witness: failures[0] ?? null,
        readable: describeFormula(goal),
      };
      refutations.push(refutation);
      record.reason = `背景与前提成立，目标不成立：${describeFormula(goal)}，见证 ${formatAssignment(refutation.assignment)}。`;
    } else {
      record.reason = '背景与前提成立，目标也成立：这个模型不构成反例。';
    }
  }

  const boundary = [
    FINITE_SEMANTICS_SCOPE,
    FINITE_RESULT_SCOPE,
    INFINITE_STRUCTURE_BOUNDARY,
    FINITE_COUNTEREXAMPLE_SCOPE,
  ];

  if (refutations.length > 0) {
    const first = refutations[0];
    return {
      found: true,
      status: 'refuted',
      model: first.model,
      assignment: first.assignment,
      equation: first.equation,
      witness: first.witness,
      reason: `在有限模型 ${first.model} 上背景与前提成立而目标不成立，见证 ${formatAssignment(first.assignment)}。${FINITE_COUNTEREXAMPLE_SCOPE}`,
      checked,
      refutations,
      scope: scopeText(FINITE_SEMANTICS_SCOPE, FINITE_COUNTEREXAMPLE_SCOPE),
      boundary,
    };
  }

  const usable = checked.filter((record) => record.usable).length;
  return {
    found: false,
    status: 'undecided',
    model: null,
    assignment: null,
    equation: null,
    witness: null,
    reason: `在 ${checked.length} 个候选有限模型上没有找到反例（其中 ${usable} 个满足背景与前提且目标也成立，其余不可用或被拒绝）：这不构成证明，也不是「已证明」。`,
    checked,
    refutations: [],
    scope: scopeText(FINITE_SEMANTICS_SCOPE, UNDECIDED_SCOPE),
    boundary,
  };
}

/**
 * 模型摘要（界面用）：载体、运算、是否交换、注记。
 * `isCommutative` 只对**载体上的二元运算**发言；没有二元运算时为 `null`（不假装知道）。
 */
export function modelSummary(model) {
  const resolved = typeof model === 'string' ? getModel(model) : model;
  const problems = validateModel(resolved);
  if (problems.length > 0) {
    throw bad(`有限模型结构非法（${resolved?.id ?? '未命名'}）：${problems[0]}`, { model: resolved?.id ?? null, problems });
  }
  const ctx = makeContext(resolved, null);
  const table = structureTable(ctx);
  const ops = table.opOrder.map((name) => ({
    name,
    type: table.ops[name].type,
    arity: table.ops[name].arity,
    commutative: table.ops[name].commutative,
  }));
  return {
    id: resolved.id,
    label: resolved.label ?? resolved.id,
    carrier: resolved.carrier,
    elements: [...resolved.elements],
    order: resolved.elements.length,
    ops,
    consts: { ...(resolved.consts ?? {}) },
    isCommutative: table.isCommutative,
    nodeRef: resolved.nodeRef ?? null,
    registered: isRegisteredModel(resolved.id),
    note: resolved.note ?? '',
    scope: scopeText(FINITE_SEMANTICS_SCOPE, FINITE_RESULT_SCOPE),
    boundary: [INFINITE_STRUCTURE_BOUNDARY],
  };
}

// ---------------------------------------------------------------------------
// 8. 已登记的概念检查清单（群公理 / 交换律）
// ---------------------------------------------------------------------------

const vNode = (name, type) => ['v', name, type];
const cNode = (name) => ['c', name];
const app = (fn, arg) => ['app', fn, arg];
const app2 = (fn, a, b) => app(app(fn, a), b);
const eq = (left, right) => ['eq', left, right];
const and = (left, right) => ['and', left, right];
const all = (binder, body) => ['all', binder, body];

const GA = vNode('a', 'G');
const GB = vNode('b', 'G');
const GC = vNode('c', 'G');

/**
 * 群公理（规格里 `group:group-concept` 的逐条展开）。
 * 交换律**不在**这里：案例 `data/cases/group.mjs` 明确写了「交换律不属于群定义」。
 */
export const GROUP_AXIOMS = deepFreeze({
  id: 'group-axioms',
  label: '群公理（结合、单位、逆；不含交换律）',
  nodeRef: 'group:group-concept',
  axioms: [
    {
      id: 'associative',
      label: '结合律',
      source: '∀a b c. (a·b)·c = a·(b·c)',
      formula: all(GA, all(GB, all(GC, eq(
        app2(cNode('mul'), app2(cNode('mul'), GA, GB), GC),
        app2(cNode('mul'), GA, app2(cNode('mul'), GB, GC)),
      )))),
    },
    {
      id: 'identity',
      label: '单位元（左与右）',
      source: '∀a. e·a = a ∧ a·e = a',
      formula: all(GA, and(
        eq(app2(cNode('mul'), cNode('e'), GA), GA),
        eq(app2(cNode('mul'), GA, cNode('e')), GA),
      )),
    },
    {
      id: 'inverse',
      label: '逆元（左与右）',
      source: '∀a. a⁻¹·a = e ∧ a·a⁻¹ = e',
      formula: all(GA, and(
        eq(app2(cNode('mul'), app(cNode('inv'), GA), GA), cNode('e')),
        eq(app2(cNode('mul'), GA, app(cNode('inv'), GA)), cNode('e')),
      )),
    },
  ],
});

/**
 * 交换律：单独登记，**不是**群公理。
 * 它是「所有群都交换」这个过度推广要反驳的目标（案例 `group:pattern-all-commutative`）。
 */
export const COMMUTATIVE_LAW = deepFreeze({
  id: 'commutative-law',
  label: '交换律（某些群的偶然特征，不是群公理）',
  nodeRef: 'group:pattern-all-commutative',
  axioms: [
    {
      id: 'commutative',
      label: '交换律',
      source: '∀a b. a·b = b·a',
      formula: all(GA, all(GB, eq(app2(cNode('mul'), GA, GB), app2(cNode('mul'), GB, GA)))),
    },
  ],
});
