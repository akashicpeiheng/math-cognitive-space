/**
 * 有限对象登记（`data/formal/instances.mjs`）。
 *
 * ## 为什么单独一份
 *
 * §2.12 的有限语义求值器要求「只检查**预置有限对象**」。预置对象如果散在
 * 求值器代码里，"登记了什么"就不可见；这里把它们集中成数据，包含
 * **完整运算表**与**完整逆元表**，并附带一份可以独立重算的校验。
 *
 * ## 两条纪律
 *
 * 1. **表是全的，不是抽样。** 两个对象都是有限群，运算表逐格写出来；
 *    测试用另一条路径（模运算 / 置换像）重算全表并逐格比对。
 * 2. **记号写死在数据里。** 复合顺序换一个约定，非交换反例的计算就会反转
 *    （原稿 `data/cases/04-group.md「置换群」` 明确说「复合顺序约定必须随节点保存」）。
 *    因此 `notation` 是数据字段，不是注释。
 *
 * ## 与 §2.12 的口径关系
 *
 * `REGISTERED_MODELS` 与 `modelSummary` 的签名按 §2.12 写在**这里**，
 * 求值器（`core/formal/finite.mjs`，task-3）从本文件取模型，不要另存一份表。
 */

/** §2.12 的预置模型清单。 */
export const REGISTERED_MODELS = ['finite:z5-units', 'finite:s3'];

/* -------------------------------------------------------------------------- *
 * 有限:z5-units —— 模 5 乘法单位群
 * -------------------------------------------------------------------------- */

const Z5_UNITS = {
  id: 'finite:z5-units',
  title: '模 5 乘法单位群',
  case: 'group',
  nodes: ['group:units5'],
  kind: 'group',

  carrier: ['u1', 'u2', 'u3', 'u4'],
  carrierNote: '载体是 {1,2,3,4}；元素名 u_k 表示剩余类 k mod 5。0 不在载体里（它没有乘法逆元）。',
  /** 元素名 → 它代表的整数剩余类。校验与求值都从这里还原语义。 */
  values: { u1: 1, u2: 2, u3: 3, u4: 4 },
  modulus: 5,

  ops: [
    {
      name: 'mul5',
      symbol: '·',
      read: '模 5 乘法',
      arity: 2,
      /** 行 = 左因子，列 = 右因子，格 = 乘积。与 carrier 同序。 */
      table: [
        ['u1', 'u2', 'u3', 'u4'],
        ['u2', 'u4', 'u1', 'u3'],
        ['u3', 'u1', 'u4', 'u2'],
        ['u4', 'u3', 'u2', 'u1'],
      ],
    },
  ],

  identity: 'u1',
  /** 逆元全表：每个元素都列出，不留空。 */
  inverses: { u1: 'u1', u2: 'u3', u3: 'u2', u4: 'u4' },
  /**
   * 运算名映射：把本记录的记号接到求值器的规范名上。
   * 有限求值器（`core/formal/finite.mjs`，task-3）读它做适配，不必猜名字。
   */
  opNames: { mul: 'mul5', identity: 'one5', inverse: 'inv5' },
  /** 每个元素的阶（反复运算回到单位的最小正次数）。 */
  elementOrders: { u1: 1, u2: 4, u3: 4, u4: 2 },
  isCommutative: true,
  /** 生成元：2 的幂依次为 1,2,4,3（原稿「模 5 乘法单位群」原文）。 */
  generators: ['u2', 'u3'],
  generatorTrace: { u2: ['u1', 'u2', 'u4', 'u3'], u3: ['u1', 'u3', 'u4', 'u2'] },

  conceptSpec: {
    predicates: [
      { symbol: 'group_concept', holds: true, note: '四条公理逐格核对通过。' },
      { symbol: 'abelian_group', holds: true, note: '表格对称。' },
    ],
  },

  /** 注册进有限求值器的登记范围：只回答这些，不回答别的。 */
  registeredClaims: [
    'group_concept(mul5)(one5)(inv5)：闭合、结合、单位、逆，四条的有限核对。',
    'abelian_group(mul5)(one5)(inv5)：表格对称。',
  ],
  notRegistered: [
    '「所有群都交换」——本模型的交换性是偶然特征（原稿「关键边界」），不是可以外推的全称命题。',
    '模 6 的乘法：3 在模 6 下没有逆元，那里的「单位」集是 {1,5}，不是本模型。',
  ],

  note: '四阶循环群；与加性 Z/4 同构，但本站不登记这条同构（需要另造映射并验证）。',
  boundary: [
    '交换性是这个例子的偶然特征，不是群公理（data/cases/04-group.md「模 5 乘法单位群」关键边界）。',
    '有限表只给出逐例结论：表格对称推不出「所有群都交换」（同一个方法的失效范围）。',
    '模数换成 6 时 3 没有逆元，群条件失败；本表不覆盖那种情形。',
  ],
  source: 'data/cases/04-group.md「模 5 乘法单位群」（第 27–33 行）与「练习：在 Units5 中求逆」（第 108–114 行）',
};

/* -------------------------------------------------------------------------- *
 * 有限:s3 —— 三个字母上的对称群
 * -------------------------------------------------------------------------- */

/**
 * S3 的记号约定（写进数据，因为它会改变反例的结论）：
 *
 * - **轮换记号**：`(12)` 交换 1 与 2 固定 3；`(123)` 把 1→2→3→1。
 * - **复合顺序：右侧先作用**，`(a∘b)(x) = a(b(x))`。
 *   这与 `data/cases/04-group.md「S₃ 非交换反例」` 一致：那里写「按右侧先作用的约定，
 *   (12)(23) 与 (23)(12) 对 1 的像分别为 2 与 3」。
 *   `images` 字段给出每个元素对 (1,2,3) 的像，任何一格都能手算复核。
 */
const S3 = {
  id: 'finite:s3',
  title: '三个字母上的对称群 S3',
  case: 'group',
  nodes: ['group:noncomm', 'group:triangle-sym', 'group:perm'],
  kind: 'group',

  carrier: ['e3', 'g12', 'g13', 'g23', 'g123', 'g132'],
  carrierNote: '三个字母 {1,2,3} 上的全部 6 个双射。',
  notation: '轮换记号；复合顺序为**右侧先作用**：(a∘b)(x) = a(b(x))。',
  elements: [
    { name: 'e3', cycle: '()', images: [1, 2, 3], note: '恒等置换' },
    { name: 'g12', cycle: '(12)', images: [2, 1, 3], note: '对换，不动点 3' },
    { name: 'g13', cycle: '(13)', images: [3, 2, 1], note: '对换，不动点 2' },
    { name: 'g23', cycle: '(23)', images: [1, 3, 2], note: '对换，不动点 1' },
    { name: 'g123', cycle: '(123)', images: [2, 3, 1], note: '三轮换 1→2→3→1' },
    { name: 'g132', cycle: '(132)', images: [3, 1, 2], note: '三轮换 1→3→2→1' },
  ],

  ops: [
    {
      name: 'comp3',
      symbol: '∘',
      read: '置换复合（右侧先作用）',
      arity: 2,
      /** 行 = 左因子 a，列 = 右因子 b，格 = a∘b（先做 b，再做 a）。与 carrier 同序。 */
      table: [
        ['e3', 'g12', 'g13', 'g23', 'g123', 'g132'],
        ['g12', 'e3', 'g132', 'g123', 'g23', 'g13'],
        ['g13', 'g123', 'e3', 'g132', 'g12', 'g23'],
        ['g23', 'g132', 'g123', 'e3', 'g13', 'g12'],
        ['g123', 'g13', 'g23', 'g12', 'g132', 'e3'],
        ['g132', 'g23', 'g12', 'g13', 'e3', 'g123'],
      ],
    },
  ],

  identity: 'e3',
  /** 逆元全表：对换自逆，两个三轮换互换。 */
  inverses: { e3: 'e3', g12: 'g12', g13: 'g13', g23: 'g23', g123: 'g132', g132: 'g123' },
  /** 运算名映射：见 z5-units 的同名字段。 */
  opNames: { mul: 'comp3', identity: 'e3', inverse: 'inv3' },
  elementOrders: { e3: 1, g12: 2, g13: 2, g23: 2, g123: 3, g132: 3 },
  isCommutative: false,
  generators: ['g12', 'g123'],

  /** 非交换性的最小见证：原稿点名的两个复合。 */
  nonCommutativeWitness: {
    left: 'g12',
    right: 'g23',
    /** comp3(g12)(g23)：先做 (23) 再做 (12)，把 1 送到 2。 */
    product: 'g123',
    /** comp3(g23)(g12)：先做 (12) 再做 (23)，把 1 送到 3。 */
    reversed: 'g132',
    imageOfOne: { product: 2, reversed: 3 },
    source: 'data/cases/04-group.md「S₃ 非交换反例」：对 1 的像分别为 2 与 3',
  },

  conceptSpec: {
    predicates: [
      { symbol: 'group_concept', holds: true, note: '四条公理逐格核对通过。' },
      { symbol: 'abelian_group', holds: false, note: '表格不对称；见证见 nonCommutativeWitness。' },
    ],
  },

  registeredClaims: [
    'group_concept(comp3)(e3)(inv3)：四条公理的有限核对。',
    '非交换：comp3(g12)(g23) ≠ comp3(g23)(g12)。',
    '元素阶分布 {1:1, 2:3, 3:2}：可用来与其它 6 阶群做必要条件的比对。',
  ],
  notRegistered: [
    'S3 与「等边三角形的刚性对称」同构：原稿只把几何图像当动机（「几何图像提供动机，但不替代群公理检查」）。',
    'S3 与 Z6 不同构：本站登记的元素阶分布可以排除，但**不产生**同构或不异构的机器证书。',
    '任何「群分类」结论。',
  ],

  note: '最小非交换群；也是 Cayley 定理把抽象群嵌进置换群时那一端的样板。',
  boundary: [
    '只反驳「所有群都交换」：交换群仍然是群，模 5 乘法的交换性不受影响（原稿「否定范围」）。',
    '不否定 Cayley 定理：S3 本身就是置换群（原稿原话）。',
    '表格给出的是逐例结论，不能推广成对所有群的断言。',
    '复合顺序约定写死在 notation 里；改用左侧先作用会让 nonCommutativeWitness 的计算反转。',
  ],
  source: 'data/cases/04-group.md「S₃ 非交换反例」（第 47–53 行）、「等边三角形的刚性对称」（第 19–25 行）与「局部方法：用元素阶数比对两个群」（第 130–141 行）',
};

/** 全部预置有限对象。 */
export const REGISTERED_INSTANCES = [Z5_UNITS, S3];

const BY_ID = new Map(REGISTERED_INSTANCES.map((instance) => [instance.id, instance]));

/** 按 id 取模型；找不到返回 `null`（与 §2.12「只检查预置对象」一致，不兜底造模型）。 */
export function findInstance(id) {
  return BY_ID.get(id) ?? null;
}

/** §2.12 的 `modelSummary(model)`：`{ id, carrier, ops, isCommutative, note }`。 */
export function modelSummary(model) {
  if (!model) return null;
  return {
    id: model.id,
    title: model.title,
    carrier: [...model.carrier],
    order: model.carrier.length,
    ops: model.ops.map((op) => ({ name: op.name, symbol: op.symbol, read: op.read, arity: op.arity })),
    identity: model.identity,
    isCommutative: model.isCommutative,
    note: model.note,
  };
}

/**
 * `server/api.mjs` 的目录接口读这个函数。
 *
 * 返回的是**摘要**：它明确带上 `tables: true` 与两表的规模，
 * 让界面能说清「表是全的」，而不是只报一个元素个数。
 */
export function instanceSummary() {
  return REGISTERED_INSTANCES.map((instance) => ({
    ...modelSummary(instance),
    case: instance.case,
    nodes: [...instance.nodes],
    tables: true,
    tableSize: instance.ops.map((op) => `${instance.carrier.length}x${instance.carrier.length}`),
    inverses: Object.keys(instance.inverses).length,
    elementOrders: { ...instance.elementOrders },
    notation: instance.notation ?? null,
    registeredClaims: [...instance.registeredClaims],
    notRegistered: [...instance.notRegistered],
    boundary: [...instance.boundary],
    source: instance.source,
  }));
}

/* -------------------------------------------------------------------------- *
 * 独立重算校验
 * -------------------------------------------------------------------------- */

function imagesOf(instance, name) {
  const element = (instance.elements ?? []).find((item) => item.name === name);
  return element ? element.images : null;
}

/**
 * 从**另一条路径**重算全表与逆元表，与写死的字面表逐格比对。
 *
 * - `finite:z5-units`：用 `(a*b) mod 5` 重算；
 * - `finite:s3`：用置换像的复合 `(a∘b)(x) = a(b(x))` 重算。
 *
 * 返回 `{ ok, problems, checks }`；测试与求值器都可以调它。
 * 这份校验**不**依赖 `core/formal/` 的任何模块。
 */
export function verifyInstance(instance) {
  const problems = [];
  const checks = [];
  if (!instance) return { ok: false, problems: ['未知模型'], checks };

  const table = instance.ops[0]?.table;
  if (!Array.isArray(table)) {
    return { ok: false, problems: [`${instance.id}: 缺少运算表`], checks };
  }
  const index = new Map(instance.carrier.map((name, i) => [name, i]));

  const recompute = (left, right) => {
    if (instance.id === 'finite:z5-units') {
      const a = instance.values[left];
      const b = instance.values[right];
      const product = (a * b) % instance.modulus;
      const found = Object.entries(instance.values).find(([, value]) => value === product);
      return found ? found[0] : null;
    }
    // S3：像的复合（右侧先作用）
    const ai = imagesOf(instance, left);
    const bi = imagesOf(instance, right);
    if (!ai || !bi) return null;
    const composed = bi.map((image) => ai[image - 1]);
    const found = (instance.elements ?? []).find(
      (element) => element.images.join(',') === composed.join(','),
    );
    return found ? found.name : null;
  };

  // 1. 表形状
  if (table.length !== instance.carrier.length) {
    problems.push(`${instance.id}: 表有 ${table.length} 行，载体有 ${instance.carrier.length} 个元素`);
  }
  for (const [rowIndex, row] of table.entries()) {
    if (row.length !== instance.carrier.length) {
      problems.push(`${instance.id}: 第 ${rowIndex} 行有 ${row.length} 格，应为 ${instance.carrier.length}`);
    }
    for (const cell of row) {
      if (!index.has(cell)) problems.push(`${instance.id}: 表中出现载体外的元素 ${cell}`);
    }
  }

  // 2. 逐格重算
  let cells = 0;
  for (const [rowIndex, left] of instance.carrier.entries()) {
    for (const [colIndex, right] of instance.carrier.entries()) {
      const expected = recompute(left, right);
      const actual = table[rowIndex]?.[colIndex];
      cells += 1;
      if (expected !== actual) {
        problems.push(`${instance.id}: 表[${left}][${right}] = ${actual}，独立重算得 ${expected}`);
      }
    }
  }
  checks.push({ name: 'operationTable', cells, ok: problems.length === 0 });

  // 3. 拉丁方（每行每列恰有一次单位元 ⇒ 单位与逆都在）
  for (const name of instance.carrier) {
    const rowHits = table[index.get(name)].filter((cell) => cell === instance.identity).length;
    const colHits = table.filter((row) => row[index.get(name)] === instance.identity).length;
    if (rowHits !== 1) problems.push(`${instance.id}: ${name} 所在行出现 ${rowHits} 次单位元`);
    if (colHits !== 1) problems.push(`${instance.id}: ${name} 所在列出现 ${colHits} 次单位元`);
  }

  // 4. 逆元表逐条核对
  for (const name of instance.carrier) {
    const inverse = instance.inverses[name];
    if (!inverse) {
      problems.push(`${instance.id}: ${name} 没有登记逆元`);
      continue;
    }
    const left = table[index.get(name)][index.get(inverse)];
    const right = table[index.get(inverse)][index.get(name)];
    if (left !== instance.identity || right !== instance.identity) {
      problems.push(`${instance.id}: ${name} 与 ${inverse} 的乘积是 ${left}/${right}，不是 ${instance.identity}`);
    }
  }

  // 5. 交换性标注与表格一致
  let symmetric = true;
  for (const [i, left] of instance.carrier.entries()) {
    for (const [j, right] of instance.carrier.entries()) {
      if (table[i][j] !== table[j][i]) symmetric = false;
    }
  }
  if (symmetric !== instance.isCommutative) {
    problems.push(`${instance.id}: 表格对称性为 ${symmetric}，但 isCommutative 登记为 ${instance.isCommutative}`);
  }

  // 6. 元素阶
  for (const [name, order] of Object.entries(instance.elementOrders)) {
    let current = instance.identity;
    let steps = 0;
    do {
      current = table[index.get(current)][index.get(name)];
      steps += 1;
      if (steps > instance.carrier.length + 1) break;
    } while (current !== instance.identity);
    if (steps !== order) problems.push(`${instance.id}: ${name} 的阶登记为 ${order}，重算得 ${steps}`);
  }

  // 7. 非交换见证
  const witness = instance.nonCommutativeWitness;
  if (witness) {
    const product = table[index.get(witness.left)][index.get(witness.right)];
    const reversed = table[index.get(witness.right)][index.get(witness.left)];
    if (product !== witness.product) {
      problems.push(`${instance.id}: 见证复合 ${witness.left}∘${witness.right} = ${product}，登记为 ${witness.product}`);
    }
    if (reversed !== witness.reversed) {
      problems.push(`${instance.id}: 见证复合 ${witness.right}∘${witness.left} = ${reversed}，登记为 ${witness.reversed}`);
    }
    const imageOf = (name) => imagesOf(instance, name)?.[0];
    if (imageOf(witness.product) !== witness.imageOfOne.product) {
      problems.push(`${instance.id}: ${witness.product} 把 1 送到 ${imageOf(witness.product)}，登记为 ${witness.imageOfOne.product}`);
    }
    if (imageOf(witness.reversed) !== witness.imageOfOne.reversed) {
      problems.push(`${instance.id}: ${witness.reversed} 把 1 送到 ${imageOf(witness.reversed)}，登记为 ${witness.imageOfOne.reversed}`);
    }
  }

  checks.push({ name: 'inverses', cells: instance.carrier.length, ok: problems.length === 0 });
  return { ok: problems.length === 0, problems, checks };
}

/** 全部预置对象的校验结果；测试一次跑完。 */
export function verifyAllInstances() {
  return REGISTERED_INSTANCES.map((instance) => ({
    id: instance.id,
    ...verifyInstance(instance),
  }));
}
