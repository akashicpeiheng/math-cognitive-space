import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';

/**
 * 「标签表当选项表」的全站扫描（2026-10 加，TODO A5-34）。
 *
 * 第二十八轮的问题：知识网络的面板把 `Object.keys(CONSTRUCT_LABELS)`（模板 14 类）
 * 直接铺成下拉选项，而本体里只登记了 11 类——三个选项**选中永远是 0 个节点**。
 * 当时的断言只覆盖了两处（「全部节点」面板与「数学对象」列表页），
 * 验收要求是「全站搜一遍 `Object.keys(XXX_LABELS)` 用作选项的地方，逐个确认数据驱动或加断言」。
 *
 * 这一套就是那次全站搜索的固化版本：扫描 `web/src` 里所有 `Object.keys/entries(..._LABELS)`
 * 的用法，每个都必须落在下面这张**带理由的白名单**里。新增一处而不登记就会红——
 * 这正是「以后别再写出死选项」这条要求的可执行形式。
 *
 * 三类理由：
 * - `universe-filtered`：只作为「模板里声明过哪些值」传给 `buildFacet` 的 `declared`，
 *   选项本身来自真实数据（`present`），因此不会出现空选项；扫描会核对它确实出现在
 *   `buildFacet(...)`/`buildStartPlan(...)` 的调用里；
 * - `vocabulary-display`：展示**一整套词汇**（连接类型开关、契约 mode 条款），
 *   每一行都必须带当前视图的计数（0 也照实显示），不是「选项」；
 * - `lookup`：只用来查表（`find`/`[key]`），不产生可点条目。
 *
 * ## 2026-10 中英双语改造：扫描模式为什么变宽
 *
 * 标签表现在常按语种取用，写法扩成三种：`Object.entries(X_LABELS)`、
 * `Object.entries(pick(X_LABELS_BY_LOCALE))`（`pick` 从 `useI18n()` 来）、
 * `Object.entries(labels.tables.x)`（`useLabels()` 摊平后的表）。
 *
 * 第三种**在代码里看不到表名**，扫描不到——这是这套检查的已知边界，写在这里而不是
 * 假装它还在覆盖：`tables.*` 的值全部来自 `makeLabels()`，是同一个 `labels.ts` 的
 * 机械摊平，所以「表里有没有多余的值」仍由 `tests/granularity-fields.mjs` 与
 * `tests/construct-registry.test.mjs` 从数据侧管。
 *
 * 前两种都扫得到，且**必须是内联写法**：`const x = pick(...)` 再 `Object.entries(x)`
 * 会让这处用法从扫描里消失（白名单随即报「过期条目」），而这里要核对的
 * 「附近真的渲染了计数、取不到显示 — 而不是 0」正是那六项指标不伪造数字的保证。
 */
const ALLOWLIST = [
  {
    file: 'web/src/pages/NodeListPage.tsx',
    symbol: 'Object.keys(CASE_LABELS)',
    reason: 'universe-filtered',
    note: '案例分面：传给 buildFacet 的 declared，选项只来自真实数据',
  },
  {
    file: 'web/src/pages/NodeListPage.tsx',
    symbol: 'Object.keys(CONSTRUCT_LABELS)',
    reason: 'universe-filtered',
    note: '构造分面同上（这一处正是第二十八轮那个死选项的来源）',
  },
  {
    file: 'web/src/pages/NodeListPage.tsx',
    symbol: 'Object.keys(ROLE_LABELS)',
    reason: 'universe-filtered',
    note: '角色分面同上',
  },
  {
    file: 'web/src/pages/NetworkPage.tsx',
    symbol: 'Object.keys(CONSTRUCT_LABELS)',
    reason: 'universe-filtered',
    note: '网络面板的构造分面同上',
  },
  {
    file: 'web/src/pages/NetworkPage.tsx',
    symbol: 'Object.keys(CASE_LABELS)',
    reason: 'universe-filtered',
    note: '网络面板的案例分面同上',
  },
  {
    file: 'web/src/pages/NetworkPage.tsx',
    symbol: 'Object.keys(EDGE_FAMILY_LABELS)',
    reason: 'vocabulary-display',
    note: '连接类型开关：七类全列出，每类带当前视图计数（0 也显示）',
  },
  {
    file: 'web/src/pages/NetworkPage.tsx',
    symbol: 'Object.entries(CONTRACT_MODE_LABELS)',
    reason: 'vocabulary-display',
    note: '契约 mode 条款：七档全列出，每档带权重与当前视图条数',
  },
  {
    file: 'web/src/pages/IntroPage.tsx',
    symbol: 'Object.entries(pick(INTRO_COUNT_LABELS_BY_LOCALE))',
    reason: 'vocabulary-display',
    note: '站内规模：固定的六项指标，取不到值显示「—」而不是 0；'
      + '中英双语改造后标签表按语种取（`pick` 来自 `useI18n()`），'
      + '并**保持内联**以便这处用法仍在扫描范围内',
  },
  {
    file: 'web/src/facets.ts',
    symbol: 'Object.keys(RELATION_LABELS)',
    reason: 'lookup',
    note: '把搜索词认成关系种类（find），不产生可点条目',
  },
];

/** 遍历 web/src 下的 .ts/.tsx 文件。 */
function sourceFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const absolute = join(dir, name);
    if (statSync(absolute).isDirectory()) { out.push(...sourceFiles(absolute)); continue; }
    if (/\.tsx?$/.test(name)) out.push(absolute);
  }
  return out;
}

/*
 * 扫描模式：`Object.keys/entries( [pick(] TABLE [)] )`。
 *
 * 三种写法都要认：
 *   `Object.entries(INTRO_COUNT_LABELS)`                  —— 老写法（表名直接给）
 *   `Object.entries(pick(INTRO_COUNT_LABELS_BY_LOCALE))` —— 双语写法（表按语种取）
 *
 * 收尾的括号写成**可选且不吞多余的**（`(\))?`）：写成 `\)*` 会把外层调用
 * （`buildFacet(…, Object.keys(CASE_LABELS))`）的括号一起吞进来，捕获文字与白名单
 * 对不上，一律报「过期条目」（本轮踩过）。捕获到的文字再经 `canonicalSymbol()`
 * 归一化后比较，就不必让正则去猜到底有几个闭括号。
 */
const LABEL_KEYS = /Object\.(?:keys|entries)\(\s*(pick\(\s*)?([A-Z][A-Z0-9_]*_LABELS[A-Z0-9_]*)\s*(\))?\s*\)/g;

/** 归一到「调用开始 + 表名 + 一个右括号」，去掉外层调用多吃的括号与空白。 */
function canonicalSymbol(match) {
  const table = match[2];
  const wrapped = Boolean(match[1]);
  return wrapped ? `Object.entries(pick(${table}))` : `Object.${/^Object\.(\w+)/.exec(match[0])[1]}(${table})`;
}

/**
 * 只扫**代码行**，跳过注释行。
 *
 * 为什么必须跳过：这些文件里正好有几条注释在**解释**这类写法
 * （「原先这里直接用 `Object.keys(CONSTRUCT_LABELS)`：模板里 14 类全铺出来…」）。
 * 被它们计入的后果不是误报「未登记」，而是更隐蔽的一种：白名单里的 `symbol`
 * 必须与捕获文字逐字相同，注释里的写法与代码里的不同（注释里末尾只有一个 `)`），
 * 于是一律匹配不上、白名单全成「过期条目」。
 *
 * 判据按行首：`//`、`/*`、`*` 开头的行是注释。这是文本层面的近似——不用 AST
 * 是因为本测试的目的就是「扫源码文本里的写法」，而它自己的注释不该参与。
 */
function codeLines(text) {
  return String(text).split('\n').filter((line) => {
    const trimmed = line.trim();
    return !(trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*'));
  }).join('\n');
}

test('全站扫描：每个「标签表当选项表」的用法都在白名单里，且理由成立', () => {
  const root = join(MCS_WEB_ROOT, 'web/src');
  const hits = [];
  for (const file of sourceFiles(root)) {
    const text = codeLines(readFileSync(file, 'utf8'));
    const relativePath = relative(MCS_WEB_ROOT, file).replaceAll('\\', '/');
    for (const match of text.matchAll(LABEL_KEYS)) {
      hits.push({ file: relativePath, symbol: canonicalSymbol(match), table: match[2], text });
    }
  }
  assert.ok(hits.length >= 8, '扫描没找到任何用法，扫描本身可能失效了：' + hits.length);

  // ① 每一处都必须在白名单里（同文件 + 同写法）。
  const undocumented = hits.filter((hit) => !ALLOWLIST.some((entry) => entry.file === hit.file && entry.symbol === hit.symbol));
  assert.deepEqual(undocumented.map((hit) => `${hit.file}: ${hit.symbol}`), [],
    '有未登记的「标签表当选项表」用法：新增这种写法要么改成数据驱动，要么登记理由');

  // ② 白名单里的条目必须真的还在源码里（否则是过期条目，会掩盖新写法）。
  const stale = ALLOWLIST.filter((entry) => !hits.some((hit) => hit.file === entry.file && hit.symbol === entry.symbol));
  assert.deepEqual(stale.map((entry) => `${entry.file}: ${entry.symbol}`), [], '白名单里有已经不在源码里的条目');

  // ③ universe-filtered 的用法必须真的把标签表当作 buildFacet 的 declared 参数：
  //    这样选项只可能来自数据（present），空类别只会进 absent 列表。
  for (const hit of hits) {
    const entry = ALLOWLIST.find((item) => item.file === hit.file && item.symbol === hit.symbol);
    if (entry.reason !== 'universe-filtered') continue;
    const callSite = new RegExp(`buildFacet\\([\\s\\S]{0,400}?${hit.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    assert.ok(callSite.test(hit.text), `${hit.file} 的 ${hit.symbol} 不在 buildFacet 调用里，可能被当成了选项来源`);
  }

  // ④ vocabulary-display 的用法必须在附近真的渲染了计数（`count`）。
  for (const hit of hits) {
    const entry = ALLOWLIST.find((item) => item.file === hit.file && item.symbol === hit.symbol);
    if (entry.reason !== 'vocabulary-display') continue;
    const index = hit.text.indexOf(hit.symbol);
    const neighbourhood = hit.text.slice(index, index + 900);
    assert.ok(/count/.test(neighbourhood), `${hit.file} 的 ${hit.symbol} 附近没有计数：词汇表要带计数才不误导`);
  }

  const byReason = ALLOWLIST.reduce((acc, entry) => ({ ...acc, [entry.reason]: (acc[entry.reason] ?? 0) + 1 }), {});
  console.log('  · 用法分布：' + JSON.stringify(byReason) + `，共扫到 ${hits.length} 处`);
});

test('三张标签表都是「值 → 标签」的纯映射，没有把选项顺序藏进对象键顺序', () => {
  // 分面选项的排序由 buildFacet 按计数降序给出；标签表的键顺序只用于 absent 的展示顺序。
  const facets = readFileSync(join(MCS_WEB_ROOT, 'web/src/facets.ts'), 'utf8');
  assert.ok(facets.includes('present'), 'buildFacet 必须返回 present（真有的值）');
  assert.ok(facets.includes('absent'), 'buildFacet 必须返回 absent（空类别，只用于说明）');
  assert.ok(/\.sort\(/.test(facets), '选项要显式排序，而不是依赖对象键顺序');
});
