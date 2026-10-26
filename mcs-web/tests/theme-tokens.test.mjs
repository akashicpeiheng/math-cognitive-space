import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';

/**
 * 外观层的机器校验（2026-10-16 加，第一百零九轮）。
 *
 * 暗色主题最容易坏在**没人看得见的地方**：令牌名写错一个字母不会报错（`var()` 静默失效，
 * 界面上只是那一处颜色没跟着变），深色取值漏写一个则在浅色下完全看不出来。
 * 这一套把三件事变成可以反复跑的断言：
 *
 * 1. **令牌成对**：深色块只覆盖 `:root` 里**已经存在**的令牌名（拼错即红），
 *    且核心组（纸面 / 墨色 / 线 / 语义 / 阴影 / 玻璃 / 舞台）一个不漏；
 * 2. **两处颜色不分家**：`theme.ts` 的镜像常量与两套 CSS 取值逐键一致——
 *    `web/THEME.md` 里那句「必须成对修改」从此由断言保证，而不是靠记性；
 * 3. **首帧脚本与模块同规则**：`web/public/theme-boot.js` 与 `theme-mode.ts` 的存储键、
 *    媒体查询、属性名必须一致，且 `index.html` 里它排在模块脚本**之前**（否则首帧会闪浅色）；
 *    它必须是**外链同步脚本**——生产 CSP 是 `script-src 'self'`，内联脚本会被拒绝执行。
 *
 * 另有一条**扫描断言**：令牌层之外不许再出现「会随外观出错」的字面色（白玻璃 / 白底 / 纯白文字
 * 之外的黑白混用）。允许清单逐条写明理由，且**双向核对**：清单里有而样式里已经没有了也算过期。
 */

const read = (...parts) => readFileSync(resolve(MCS_WEB_ROOT, ...parts), 'utf8');
const styles = read('web/src/styles.css');
const html = read('web/index.html');
const boot = read('web/public/theme-boot.js');

const { THEME, THEME_DARK } = await import(pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/theme.ts')).href);
const {
  THEME_PREFERENCE_KEY, THEME_ATTRIBUTE, THEME_PREFERENCE_ATTRIBUTE, DARK_QUERY,
  THEME_COLOR_LIGHT, THEME_COLOR_DARK, isThemePreference, readThemePreference,
  writeThemePreference, resolveTheme, themeColorOf, applyTheme,
} = await import(pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/theme-mode.ts')).href);

/* ---------- 取样式表里的声明块 ---------- */

/** 去掉注释但保留行号：扫描断言要报行号。 */
const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '));

/** 取某个选择器的声明块内容；同名选择器可能有多条，全部返回。 */
function blocksOf(text, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...text.matchAll(new RegExp(`^${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`, 'gm'))].map((match) => match[1]);
}

/** 声明块里的令牌：名字 → 取值。 */
function tokensIn(block) {
  const out = new Map();
  for (const match of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) out.set(match[1], match[2].trim());
  return out;
}

const source = withoutComments(styles);
const rootTokens = new Map();
for (const block of blocksOf(source, ':root')) for (const [name, value] of tokensIn(block)) rootTokens.set(name, value);
const darkBlocks = blocksOf(source, "html[data-theme='dark']");
const darkTokens = new Map();
for (const block of darkBlocks) for (const [name, value] of tokensIn(block)) darkTokens.set(name, value);

/*
 * 深色必须覆盖的核心组。
 *
 * 这里列的是「不覆盖就会在深色下明显出错」的那些：纸面、墨色、线、品牌主色、
 * 语义四色、代码块、阴影、玻璃、舞台（首页五幕的纸与雾）、以及首屏渐变。
 * 其余令牌（圆角、字体族、品牌渐变、`--on-accent`）**有意不覆盖**，理由写在 styles.css 那一节里。
 */
const MUST_OVERRIDE = [
  '--bg', '--bg-veil-a', '--bg-veil-b', '--surface', '--surface-2', '--canvas',
  '--ink', '--ink-soft', '--ink-faint', '--line', '--line-strong',
  '--accent', '--accent-strong', '--accent-deep', '--accent-soft', '--accent-wash', '--accent-line', '--accent-glow',
  '--emphasis-glow',
  '--cyan', '--cyan-soft', '--magenta', '--ember', '--teal', '--warm-soft',
  '--blue', '--blue-soft', '--amber', '--amber-soft', '--amber-line',
  '--red', '--red-soft', '--red-line', '--green', '--green-soft', '--green-line',
  '--code-bg', '--code-ink', '--shadow', '--shadow-lift',
  '--glass', '--glass-strong', '--glass-opaque', '--edge-label-halo',
  '--stage-surface', '--stage-glow', '--stage-glow-strong', '--stage-ink', '--stage-scrim-rgb', '--stage-base', '--stage-base-flow', '--grad-hero',
];

/** 深色取值必须与浅色不同的一批（相同就等于没换色）。 */
const MUST_DIFFER = [
  '--bg', '--surface', '--surface-2', '--canvas', '--ink', '--ink-soft', '--ink-faint',
  '--line', '--line-strong', '--accent', '--shadow', '--glass', '--glass-strong', '--glass-opaque',
  '--edge-label-halo', '--stage-surface', '--stage-glow', '--stage-glow-strong', '--stage-ink', '--stage-scrim-rgb', '--stage-base', '--grad-hero',
];

test('深色令牌块只覆盖已存在的令牌名（拼错的令牌不会静默失效）', () => {
  assert.ok(darkBlocks.length > 0, 'styles.css 里找不到 html[data-theme=\'dark\'] 规则');
  const unknown = [...darkTokens.keys()].filter((name) => !rootTokens.has(name));
  assert.deepEqual(unknown, [],
    `深色块里写了 :root 没有的令牌名（会静默失效）：${unknown.join('、')}`);
  console.log(`  · 令牌：:root ${rootTokens.size} 个，深色覆盖 ${darkTokens.size} 个`);
});

test('深色覆盖了全部必须先换的令牌', () => {
  const missing = MUST_OVERRIDE.filter((name) => !darkTokens.has(name));
  assert.deepEqual(missing, [], `深色块缺少这些令牌：${missing.join('、')}`);
  const same = MUST_DIFFER.filter((name) => rootTokens.get(name) === darkTokens.get(name));
  assert.deepEqual(same, [], `这些令牌的深浅取值相同，等于没换色：${same.join('、')}`);
});

test('深色取值都是合法取值（颜色 / 渐变 / 颜色通道）', () => {
  const legal = /^(#[0-9a-f]{3,8}|rgba?\(|color-mix\(|linear-gradient\(|var\(|\d+(\.\d+)?%?(\s+\d+(\.\d+)?%?){0,2})/i;
  const bad = [...darkTokens.entries()].filter(([, value]) => !legal.test(value)).map(([name, value]) => `${name}: ${value}`);
  assert.deepEqual(bad, [], `深色取值看不懂：\n  ${bad.join('\n  ')}`);
});

/**
 * 镜像 ↔ 令牌：`theme.ts` 里与 CSS 同名的那些键必须逐字相同。
 *
 * 只核**同名对应**的键：`nodeFill`、`neutral`、`methodLocal` 等是画布专用的派生色，
 * 在 CSS 里没有对应令牌（`THEME.md` 说明了分工），因此不在这条断言里。
 */
test('theme.ts 的两套镜像与 CSS 两套取值逐字一致', () => {
  const pairs = [
    ['ink', '--ink'], ['inkSoft', '--ink-soft'], ['inkFaint', '--ink-faint'],
    ['surface', '--surface'], ['surface2', '--surface-2'], ['canvas', '--canvas'],
  ];
  const problems = [];
  for (const [key, token] of pairs) {
    if (THEME[key] !== rootTokens.get(token)) problems.push(`浅色 ${key}(${THEME[key]}) ≠ ${token}(${rootTokens.get(token)})`);
    if (THEME_DARK[key] !== darkTokens.get(token)) problems.push(`深色 ${key}(${THEME_DARK[key]}) ≠ ${token}(${darkTokens.get(token)})`);
  }
  assert.deepEqual(problems, [], `镜像与 CSS 分家了：\n  ${problems.join('\n  ')}`);
});

test('两张镜像表的键完全相同（组件按外观选表，键不同就会缺色）', () => {
  const lightKeys = Object.keys(THEME).sort();
  const darkKeys = Object.keys(THEME_DARK).sort();
  assert.deepEqual(darkKeys, lightKeys, 'THEME 与 THEME_DARK 的键集合不一致');
  for (const key of lightKeys) {
    assert.match(THEME[key], /^#[0-9a-f]{6}$/i, `THEME.${key} 不是六位十六进制色值`);
    assert.match(THEME_DARK[key], /^#[0-9a-f]{6}$/i, `THEME_DARK.${key} 不是六位十六进制色值`);
  }
  console.log(`  · 镜像键：${lightKeys.length} 个，两张表一致`);
});

/* ---------- 首帧脚本 ---------- */

test('首帧脚本与 theme-mode.ts 同规则（存储键 / 媒体查询 / 属性名）', () => {
  assert.ok(boot.includes(THEME_PREFERENCE_KEY), `theme-boot.js 里没有存储键 ${THEME_PREFERENCE_KEY}`);
  assert.ok(boot.includes(DARK_QUERY), `theme-boot.js 里没有媒体查询 ${DARK_QUERY}`);
  assert.ok(boot.includes(THEME_ATTRIBUTE), `theme-boot.js 里没有写 ${THEME_ATTRIBUTE}`);
  assert.ok(boot.includes(THEME_PREFERENCE_ATTRIBUTE), `theme-boot.js 里没有写 ${THEME_PREFERENCE_ATTRIBUTE}`);
  assert.ok(boot.includes(THEME_COLOR_LIGHT) && boot.includes(THEME_COLOR_DARK),
    'theme-boot.js 里的 theme-color 取值与 theme-mode.ts 不一致');
  // 引导脚本必须在 React 之前跑完：它不能是 module（module 默认延迟）。
  assert.ok(!/<script[^>]*type="module"[^>]*theme-boot/.test(html), 'theme-boot.js 不能作为 module 引入');
});

test('index.html 里首帧脚本排在模块脚本之前，且在 theme-color 之后', () => {
  const bootAt = html.indexOf('theme-boot.js');
  const moduleAt = html.indexOf('type="module"');
  const metaAt = html.indexOf('name="theme-color"');
  assert.ok(bootAt > 0, 'index.html 没有引入 /theme-boot.js');
  assert.ok(metaAt > 0 && metaAt < bootAt, '首帧脚本要排在 theme-color 之后（它要改写那个 meta）');
  assert.ok(moduleAt > bootAt, '首帧脚本必须排在模块脚本之前，否则第一帧会闪浅色');
});

/* ---------- 状态机 ---------- */

test('偏好读写：不认识的值与不可用的存储都退到「跟随系统」', () => {
  const store = (value) => ({ getItem: () => value });
  assert.equal(readThemePreference(store('dark')), 'dark');
  assert.equal(readThemePreference(store('light')), 'light');
  assert.equal(readThemePreference(store('system')), 'system');
  assert.equal(readThemePreference(store('midnight')), 'system', '不认识的旧值不许猜');
  assert.equal(readThemePreference(store(null)), 'system');
  assert.equal(readThemePreference({ getItem: () => { throw new Error('禁用存储'); } }), 'system');
  assert.ok(isThemePreference('dark') && !isThemePreference('DARK'));
});

test('写偏好：存储不可用时不抛错（本次会话照常切换）', () => {
  const seen = [];
  writeThemePreference('dark', { setItem: (key, value) => seen.push([key, value]) });
  assert.deepEqual(seen, [[THEME_PREFERENCE_KEY, 'dark']]);
  assert.doesNotThrow(() => writeThemePreference('dark', { setItem: () => { throw new Error('禁用存储'); } }));
});

test('解析规则：选了浅色/深色就不跟随系统，选了 system 才跟随', () => {
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('light', false), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('dark', true), 'dark');
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
  assert.equal(themeColorOf('dark'), THEME_COLOR_DARK);
  assert.equal(themeColorOf('light'), THEME_COLOR_LIGHT);
});

test('applyTheme 把结果与偏好都写到根元素上', () => {
  const attributes = new Map();
  const root = { setAttribute: (name, value) => attributes.set(name, value) };
  applyTheme('dark', 'system', root);
  assert.equal(attributes.get(THEME_ATTRIBUTE), 'dark');
  assert.equal(attributes.get(THEME_PREFERENCE_ATTRIBUTE), 'system');
});

/* ---------- 令牌层之外不许留会随外观出错的字面色 ---------- */

/**
 * 允许清单：选择器 → 理由。
 *
 * 判据是「这处字面色在两种外观下**都对**」，而不是「它不重要」：
 * - 压品牌渐变/实心底上的白字（`--accent-fill`、`--grad-brand`）：底不变，白字仍然达标；
 * - 报头（`.home-story-masthead` 及其进度、跳过按钮）：本来就是深色玻璃，两种外观共用；
 * - 遮罩（`.home-story-label-layer`）里的 `rgba(0,0,0,α)`：那是 **mask 的 alpha**，不是颜色；
 * - 纯黑阴影与 `::backdrop`：深色下变淡但仍然成立（阴影只是加深层次，不承担可读性）；
 * - `.home-story-act-copy` 的浅色雾：它有一条专门的深色改写规则（下面单独断言）。
 */
const ALLOWED_LITERALS = new Map([
  ['.brand-cta', '主题色实心底上的白字（底是 --accent-fill 渐变）'],
  ['.nav-badge', '品牌渐变上的白字'],
  [".start-question[data-current='true'] .start-question-index", '品牌渐变上的白字'],
  ['.tutor-brand', '品牌渐变上的白字'],
  ['.tutor-guide li.is-current .tutor-guide-index', '品牌渐变上的白字'],
  ['.recommend-filter .chip.on', '主题色实心底上的白字'],
  ['.recommend-filter .chip.method.on', '方法色实心底上的白字'],
  ['.locale-option.active', '主题色实心底上的白字'],
  ['.nav-badge-dot', '彩色圆点外的白色光圈（装饰性高光）'],
  ['.start-chooser', '渐变的最后一段是 alpha 0（全透明），颜色本身不起作用'],
  ['button.primary::after', '主按钮上的高光层（叠在品牌渐变上）'],
  ['button.primary:active::after', '主按钮按下时的内阴影与高光（叠在品牌渐变上）'],
  ['.home-story-masthead', '首页报头：本来就是深色玻璃，两种外观共用'],
  ['.home-story-playbar', '报头里的播放进度条轨道（深色玻璃上）'],
  ['.home-story-brand h1', '报头里的站名（深色玻璃上）'],
  ['.home-story-skip', '报头里的跳过按钮（深色玻璃上）'],
  ['.home-story-skip:hover', '跳过按钮悬停态：白底 + 深字，两种外观都对'],
  ['.home-story-progress::before', '报头里的幕导航轨道'],
  ['.home-story-progress li span', '幕导航的圆点描边（深色玻璃上）'],
  ['.home-story-progress li:hover', '幕导航悬停字色（深色玻璃上）'],
  ['.home-story-progress li.is-active', '幕导航当前项字色（深色玻璃上）'],
  ['.home-story-progress li.is-active span', '幕导航当前项圆点（深色玻璃上）'],
  ['.home-story-label-layer', 'mask 的 alpha 值，不是颜色'],
  ['.home-story-act-copy', '浅色雾保持原样（深色有一条同名改写规则，见下一条断言）'],
  ['.home-story.is-flow .home-story-masthead', '窄屏报头下边框（深色玻璃上）'],
  ['.network-scaling-summary', '纯黑阴影与半透明遮罩'],
  ['.network-note-summary', '纯黑阴影'],
  ['.connection-menu', '浮层投影'],
  ['.connection-note-dialog::backdrop', '对话框遮罩'],
  ['.connection-note-undo', '撤销条投影'],
]);

/** 逐行扫描：维护「当前选择器」，报出令牌层之外仍在用黑白字面色的位置。 */
function literalOffenders(text) {
  const lines = text.split('\n');
  const out = [];
  let selector = '(规则之外)';
  let inTokens = false;
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (/^(html\[data-theme='dark'\]|:root)\s*\{/.test(trimmed)) inTokens = true;
    if (trimmed === '}') {
      if (inTokens) inTokens = false;
      selector = '(规则之外)';
      return;
    }
    const head = /^(.*?)\s*\{/.exec(trimmed);
    if (head && head[1] && !trimmed.startsWith('@')) selector = head[1];
    else if (trimmed.startsWith('@')) selector = trimmed;
    if (inTokens) return;
    const sensitive = /rgba?\(\s*(255,\s*255,\s*255|0,\s*0,\s*0|0\s+0\s+0)/.test(line) || /:\s*#(fff|ffffff)\b/.test(line);
    if (sensitive) out.push({ line: index + 1, selector, text: trimmed.slice(0, 120) });
  });
  return out;
}

test('令牌层之外没有「没登记在允许清单里的」黑白字面色', () => {
  const offenders = literalOffenders(withoutComments(styles));
  const unknown = offenders.filter((item) => !ALLOWED_LITERALS.has(item.selector));
  assert.deepEqual(unknown.map((item) => `${item.selector}:${item.line} ${item.text}`), [],
    '这些地方在深色下会出错，或者应当登记进允许清单并写明理由');
  const seen = new Set(offenders.map((item) => item.selector));
  const stale = [...ALLOWED_LITERALS.keys()].filter((selector) => !seen.has(selector));
  assert.deepEqual(stale, [], `允许清单里的这些选择器已经不再有字面色了，请删掉：${stale.join('、')}`);
  console.log(`  · 字面色扫描：${offenders.length} 处、${seen.size} 个选择器，全部在允许清单上`);
});

test('首页正文的浅色雾有对应的深色改写规则', () => {
  assert.ok(/html\[data-theme='dark'\]\s+\.home-story-act-copy\s*\{/.test(source),
    '深色块里缺少 .home-story-act-copy 的改写规则：浅色那层白雾在深色下会把文字埋掉');
});
