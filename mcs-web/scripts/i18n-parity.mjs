/**
 * 中英结构对等检查（i18n parity）。
 *
 * ## 它保证什么、不保证什么（先说边界）
 *
 * 它保证**结构**：覆盖里的 id 都存在、数组长度与中文源一致、受控词表值没被改、
 * LaTeX 命令与公式定界符数量不差、数字与量词符号没丢、证据标签没被翻译。
 *
 * 它**不保证数学正确性**——把「不收敛」译成「收敛」这类错误，工具看不出来，
 * 只能靠抽样人工复核。这条边界必须写在工具的输出里，否则「parity 通过」会被
 * 读成「译文已核对」，那正是仓库纪律不允许的（不把有限测试说成一般证明）。
 *
 * 用法：
 *   node scripts/i18n-parity.mjs            # 检查全部已装载语种
 *   node scripts/i18n-parity.mjs --locale en
 *   node scripts/i18n-parity.mjs --todo     # 额外打印尚未翻译的条目清单
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadOntology, MCS_WEB_ROOT } from '../core/ontology.mjs';
import { coverage, overlayFor } from '../data/i18n/index.mjs';
import { localizeOntologyRaw, keyOf } from '../data/i18n/overlay.mjs';
import { LOCALES, DEFAULT_LOCALE, normalizeLocale } from '../shared/locales.mjs';

const OWN_KEYS = new Set([
  'id', 'version', 'construct', 'roles', 'discipline', 'case', 'mode', 'granularity',
  'contentRef', 'status', 'checkStatus', 'kind', 'type', 'theory', 'signatureVersion', 'node',
  'evidenceStatus', 'from', 'to', 'accepts', 'provides',
]);

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/;

/**
 * 「残留中文」判定的**豁免**：行内代码与 HTML 注释里的中文不算残留。
 *
 * 与 `scripts/i18n-block-check.mjs` 同一条规则、同一个理由：真实源文件路径
 * （`` `…/微分形式的外积.md` ``）与中文文献书名是**标识符**，翻了就是谎报来源。
 * 散文里的中文才是漏译。
 */
const CJK_EXEMPT = /`[^`\n]*`|<!--[\s\S]*?-->/g;
const proseOf = (text) => String(text ?? '').replace(CJK_EXEMPT, '');
const hasResidualCjk = (text) => CJK.test(proseOf(text));

/**
 * 允许保留中文的字段路径。
 *
 * 只放**路径与专名**这类本来就不该翻译的东西：
 * - `provenance.sources[]`：修订源的文件名（`mcs-foundations/cases/01-极限与连续.md`）。
 *   把文件名翻译成英文会让「这一条取自哪份文件」变成假话——那份文件就叫这个名字。
 * - `witness.ref` / `reference`：同上，是文件与锚点。
 * - `formal.parameters[]`：与 `formal.symbols[]` / `typeEnv` 同类的**形式负载标识符**
 *   （`["g_{ab}","自由粒子"]`）。混着符号与中文名，是本体的元数据而不是给读者的散文；
 *   界面上没有任何地方渲染它（`web/src` 里 `.parameters` 零命中），
 *   与 `scripts/i18n-extract.mjs` 的 SKIP_PATH 口径一致。
 *
 * 白名单是**精确路径**，不是模式：放宽成 `provenance.*` 会把 `provenance.note`
 * （真正需要翻译的说明）一起放过去。
 */
const CJK_ALLOWED_PATHS = new Set([
  'provenance.sources[0]',
  'provenance.sources[1]',
  'provenance.sources[2]',
]);

function cjkAllowed(path) {
  if (CJK_ALLOWED_PATHS.has(path)) return true;
  if (/(?:^|\.)provenance\.sources\[\d+\]$/.test(path)) return true;
  if (/(?:^|\.)formal\.parameters\[\d+\]$/.test(path)) return true;
  return /(?:^|\.)(?:reference|ref)$/.test(path);
}

function latexCommands(text) {
  const found = new Map();
  for (const match of String(text).matchAll(/\\[A-Za-z]+/g)) {
    found.set(match[0], (found.get(match[0]) ?? 0) + 1);
  }
  return found;
}

/** 从译文里抽出「必须与中文源同构」的记号：LaTeX、公式定界符、数字、量词。 */
function signatureOf(text) {
  const source = String(text ?? '');
  /*
   * 证据标签与检查状态按**词边界**计数，不按子串。
   *
   * 子串计数会对正常的英文散文误报：`passed` 出现在 "not to be passed off as a proof"
   * 里就被算成一个证据标签，于是「标签计数不一致」——而那句话与证据标签毫无关系。
   * 本轮真的撞上过一次（译者只好把动词换掉）。加词边界之后，`DEF`、`passed`、
   * `not_run` 这类记号只在**作为独立词**出现时才计入。
   */
  const countWord = (label) => (source.match(new RegExp(`(?<![A-Za-z0-9_-])${label.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(?![A-Za-z0-9_-])`, 'g')) ?? []).length;
  return {
    latex: [...latexCommands(source)].sort(([a], [b]) => a.localeCompare(b)).map(([cmd, count]) => `${cmd}×${count}`).join(' '),
    dollars: (source.match(/\$\$/g) ?? []).length,
    inline: (source.match(/(?<!\$)\$(?!\$)/g) ?? []).length,
    numbers: (source.match(/\d+(?:\.\d+)?/g) ?? []).sort().join(','),
    quantifiers: ['∀', '∃', 'ε', 'δ', '→', '⇔', '⇒', '⊢', '∈', '⊂', '≤', '≥', '≠'].map((symbol) => `${symbol}${(source.split(symbol).length - 1)}`).join(' '),
    labels: ['DEF', 'PROOF', 'REF', 'FINITE', 'ILLUSTRATION', 'NOT-CLAIMED', 'passed', 'not_run', 'failed', 'unsupported']
      .map((label) => `${label}${countWord(label)}`).join(' '),
  };
}

const problems = [];
const warnings = [];

function walk(value, path, ctx) {
  if (typeof value === 'string') {
    /*
     * 字段级译文里也允许出现**反引号包起来的标识符**（路径、书名、代码）：
     * 与正文块同一条规则，详见 `CJK_EXEMPT` 的说明。
     */
    if (hasResidualCjk(value) && !cjkAllowed(path)) {
      const prose = proseOf(value);
      problems.push(`${ctx} → ${path}：译文中仍含中文「${prose.slice(0, 40)}」`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${path}[${index}]`, ctx));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key === '__meta' || key === 'id') continue;
      walk(item, path ? `${path}.${key}` : key, ctx);
    }
  }
}

/** 逐字段对照：译文里出现的字段必须在中文源里存在，且形状一致。 */
function compareShape(base, translated, path, ctx) {
  if (translated === undefined || translated === null) return;
  if (Array.isArray(translated)) {
    if (!Array.isArray(base)) { problems.push(`${ctx} → ${path}：译文是数组，中文源不是`); return; }
    if (base.length !== translated.length) {
      problems.push(`${ctx} → ${path}：数组长度不一致（中文 ${base.length}，英文 ${translated.length}）`);
      return;
    }
    translated.forEach((item, index) => compareShape(base[index], item, `${path}[${index}]`, ctx));
    return;
  }
  if (typeof translated === 'object') {
    if (base === null || typeof base !== 'object' || Array.isArray(base)) {
      problems.push(`${ctx} → ${path}：译文是对象，中文源不是`);
      return;
    }
    for (const [key, item] of Object.entries(translated)) {
      if (key === '__meta') continue;
      if (!(key in base)) { problems.push(`${ctx} → ${path}.${key}：中文源里没有这个字段`); continue; }
      compareShape(base[key], item, `${path}.${key}`, ctx);
    }
    return;
  }
  /* 标量：核对「必须同构的记号」。受控词表键的白名单字段跳过。 */
  if (OWN_KEYS.has(path.split('.').pop())) {
    if (typeof base === 'string' && typeof translated === 'string' && base !== translated) {
      problems.push(`${ctx} → ${path}：受控值被改写（中文「${base}」→ 英文「${translated}」）`);
    }
    return;
  }
  if (typeof base !== 'string' || typeof translated !== 'string') return;
  const left = signatureOf(base);
  const right = signatureOf(translated);
  for (const key of ['latex', 'dollars', 'numbers', 'quantifiers', 'labels']) {
    if (left[key] !== right[key]) {
      problems.push(`${ctx} → ${path}：${key} 不一致\n      中文：${left[key] || '(空)'}\n      英文：${right[key] || '(空)'}`);
    }
  }
  /* 行内 `$` 的**奇偶**必须一致：`$x$` 少一个美元号会让 KaTeX 把后半段正文吃掉。 */
  if ((left.inline % 2) !== (right.inline % 2)) {
    problems.push(`${ctx} → ${path}：行内公式定界符 $ 的奇偶不一致（中文 ${left.inline}，英文 ${right.inline}）`);
  }
}

const args = process.argv.slice(2);
const only = args.includes('--locale') ? normalizeLocale(args[args.indexOf('--locale') + 1]) : null;
const showTodo = args.includes('--todo');

const instance = await loadOntology();
const raw = instance.raw;
const targets = only ? [only] : LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);

let checked = 0;
for (const locale of targets) {
  const overlay = await overlayFor(locale);
  if (!overlay) {
    console.log(`[${locale}] 没有覆盖目录（源语言或尚未开始翻译）。`);
    continue;
  }
  const sections = [
    ['nodes', raw.nodes],
    ['actions', raw.actions],
    ['evidence', raw.evidence],
    ['relations', raw.relationDescriptions],
    ['representations', raw.representations],
    ['support', raw.support],
    ['aggregates', raw.aggregates],
    ['templates', raw.templates],
    ['patterns', raw.patterns],
    ['claims', raw.claims],
    ['localizations', raw.localizations],
    ['coverage', raw.coverage],
  ];
  for (const [section, items] of sections) {
    const map = overlay[section];
    if (!map) continue;
    /*
     * 行的键由 `data/i18n/overlay.mjs` 的 `keyOf` 决定，**与装配层、覆盖率同一张表**：
     * 大多数节是 `id`，而 `templates` 是 `role`、`coverage` 是 `chapter`。
     * 这里曾经写死 `item.id`，于是那两节的译文即使装配成功也会被判成
     * 「中文源里不存在这个 id」——装配层与检查层各读各的键名，正是本轮反复出现的缺陷。
     */
    const byKey = new Map(items.map((item) => [keyOf(section, item), item]));
    for (const [id, translated] of Object.entries(map)) {
      if (id === '__meta') continue;
      const base = byKey.get(id);
      if (!base) { problems.push(`${section}.${id}：中文源里不存在这个键（本节的行键见 overlay.mjs 的 keyOf）`); continue; }
      checked += 1;
      compareShape(base, translated, id, `${locale}/${section}`);
      walk(translated, id, `${locale}/${section}`);
    }
  }
  /*
   * 正文块：两个来源都要看——`meta.__meta.contentBlocks`（段落级登记）
   * 与 `overlay.cases`（按案例拆分的 `en/cases*.mjs`）。装配层认这两个键，
   * 检查层必须认同一套，否则会出现「装配生效了但检查看不见」的假通过。
   */
  const blockSets = [
    overlay.meta?.__meta?.contentBlocks,
    overlay.meta?.contentBlocks,
    overlay.cases,
  ].filter(Boolean);
  for (const blocks of blockSets) {
    for (const [id, text] of Object.entries(blocks)) {
      const node = raw.nodes.find((item) => (item.contentRef ?? item.id) === id);
      if (!node) { problems.push(`${locale}/cases.${id}：中文源里不存在这个正文块`); continue; }
      checked += 1;
      const base = node.contentMarkdown ?? '';
      const left = signatureOf(base);
      const right = signatureOf(text);
      if (left.dollars !== right.dollars) problems.push(`${locale}/cases.${id}：行间公式 $$ 数量不一致（中文 ${left.dollars / 2} 对，英文 ${right.dollars / 2} 对）`);
      /*
       * **这里刻意不比 LaTeX 命令集**——那一层由 `scripts/i18n-block-check.mjs` 负责，而且
       * 它做得更严（公式内容逐字、行内按多重集）且更准（扣掉「含中文的源侧公式」贡献的命令）。
       *
       * 从前两处都数一遍命令集，结果是同一个约束被检查两次，而第二处**必然误报**：
       * 源侧 `$f^{-1}(开集)$`（中文写在 `\text{}` 外面）在英文里只能改写成
       * `$f^{-1}(\text{open set})$`，于是整块 `\text` 命令数 中 2 / 英 3 —— 内容比对照样
       * 会（正确地）把它判成源侧缺陷并从两侧剔除，命令集却还在数它（实测：
       * `dg:topological-space` 因此挂在唯一一项上，而译文并没有错）。
       *
       * 判据重复不是「更保险」，是「更容易误伤」：一处放宽了豁免，另一处没跟着放宽，
       * 就会长期挂着一个假红。**一个约束只在一个地方检查**，这条同样适用于工具本身。
       */
      if (!existsSync(join(MCS_WEB_ROOT, 'scripts', 'i18n-block-check.mjs'))) {
        problems.push(`${locale}/cases.${id}：公式层检查缺失——scripts/i18n-block-check.mjs 不在，正文的公式逐字核对没有执行`);
      }
      if (hasResidualCjk(text)) problems.push(`${locale}/cases.${id}：正文译块的散文里仍有中文（反引号里的路径/书名不算）`);
      /* 标题层级与列表结构：正文靠 Markdown 结构渲染，层级掉了会改变阅读顺序。 */
      const headings = (value) => (String(value).match(/^#{1,6}\s/gm) ?? []).join(',');
      if (headings(base) !== headings(text)) {
        problems.push(`${locale}/cases.${id}：Markdown 标题层级不一致（中文 ${headings(base) || '(无)'}，英文 ${headings(text) || '(无)'}）`);
      }
    }
  }
  /* 段落级（不含正文块）：那几段是单例对象，逐键对照中文源。 */
  const metaOnly = overlay.meta?.__meta ?? overlay.meta ?? {};
  for (const [key, value] of Object.entries(metaOnly)) {
    if (key === 'contentBlocks') continue;
    if (!(key in raw)) { problems.push(`${locale}/meta.${key}：中文源里没有这一段`); continue; }
    checked += 1;
    compareShape(raw[key], value, key, `${locale}/meta`);
    walk(value, key, `${locale}/meta`);
  }
  const report = await coverage(locale);
  console.log(`[${locale}] 已检查 ${checked} 个覆盖单元；覆盖率见下。`);
  console.log('  ' + Object.entries(report.sections).map(([name, item]) => `${name} ${item.translated}/${item.total}`).join('，'));
  console.log(`  正文 ${report.content.translated}/${report.content.total}`);

  /*
   * 端到端抽查：**覆盖真的改变了装配结果吗**。
   *
   * 这一条是补上一个「假通过」之后加的，那个 bug 值得写下来：
   * 156 条关系译文写好了、覆盖率报 156/156、本工具也全绿——但装配层的键名写成
   * `relations` 而运行时的键叫 `relationDescriptions`，于是 `raw['relations']` 是
   * `undefined`，**整节静默跳过**，英文站上关系说明永远显示中文。
   *
   * 根因不是某一处笔误，而是「检查层与装配层各读各的键名」。所以这里改成**跑一遍真实的
   * 装配函数** `localizeOntologyRaw()`，再核对「覆盖里出现的那些字段，在装配结果里真的变了吗」。
   *
   * 判定是**通用**的，不写死字段清单：拿覆盖条目**自己写下的**字段路径去比中文源与装配结果。
   * 写死清单会漏（`relations` 只有 `candidateNote`、`claims` 只有 `statement`…每一种记录形状
   * 都不同），而漏掉的那一条恰好是最需要被看见的。
   */
  const { raw: assembled, problems: mergeProblems } = localizeOntologyRaw(raw, overlay);
  if (mergeProblems.length) {
    for (const problem of mergeProblems.slice(0, 10)) problems.push(`装配层：${problem}`);
  }
  const SECTIONS = [
    ['nodes', 'nodes'], ['actions', 'actions'], ['evidence', 'evidence'],
    ['relationDescriptions', 'relations'], ['representations', 'representations'],
    ['support', 'support'], ['aggregates', 'aggregates'], ['templates', 'templates'],
    ['patterns', 'patterns'], ['claims', 'claims'], ['localizations', 'localizations'],
    ['coverage', 'coverage'],
  ];
  /* 覆盖树里出现过的字段路径（相对条目根，例如 `scope`、`witness.scope`、`teaching.conditions[0].remove`）。 */
  function fieldPaths(value, trail = []) {
    if (typeof value === 'string' || typeof value === 'number' || value === null) return [trail.join('.')];
    if (Array.isArray(value)) return value.flatMap((item, index) => fieldPaths(item, [...trail, `[${index}]`]));
    if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, item]) => fieldPaths(item, [...trail, key]));
    return [];
  }
  /* 按路径取值，支持 `a.b[0].c` 这种写法。 */
  function at(object, path) {
    return path.split(/\.|\[|\]/).filter(Boolean).reduce((value, key) => {
      if (value === undefined || value === null) return undefined;
      return Array.isArray(value) ? value[Number(key)] : value[key];
    }, object);
  }
  let effective = 0;
  let ineffective = 0;
  for (const [rawKey, overlayKey] of SECTIONS) {
    const overlayMap = overlay[overlayKey];
    if (!overlayMap) continue;
    /* 同样的行键表：否则 templates / coverage 会被静默跳过，抽查数字偏小却看不出问题。 */
    const before = new Map((raw[rawKey] ?? []).map((item) => [keyOf(overlayKey, item), item]));
    const after = new Map((assembled[rawKey] ?? []).map((item) => [keyOf(overlayKey, item), item]));
    for (const [id, entry] of Object.entries(overlayMap)) {
      if (id === '__meta') continue;
      const source = before.get(id);
      const result = after.get(id);
      if (!source || !result) continue;
      const paths = [...new Set(fieldPaths(entry))];
      const changed = paths.some((path) => JSON.stringify(at(source, path)) !== JSON.stringify(at(result, path)));
      if (changed) effective += 1;
      else {
        ineffective += 1;
        if (ineffective <= 5) {
          problems.push(`装配未生效：${overlayKey}.${id} 有译文（字段 ${paths.slice(0, 3).join(', ')}），但装配结果与中文源逐字相同——该节是否被跳过，或键名与运行时不一致？`);
        }
      }
    }
  }
  console.log(`  端到端抽查：${effective} 条覆盖确实改变了装配结果${ineffective ? `，${ineffective} 条**没有生效**` : ''}`);

  if (showTodo) {
    for (const [section, ids] of Object.entries(report.missing ?? {})) {
      console.log(`  未译 ${section}（${ids.length}）：${ids.slice(0, 12).join(', ')}${ids.length > 12 ? ' …' : ''}`);
    }
  }
}

if (warnings.length) {
  console.log('');
  for (const warning of warnings) console.log(`警告：${warning}`);
}

if (problems.length) {
  console.error(`\ni18n 结构对等检查失败：${problems.length} 项\n`);
  for (const problem of problems.slice(0, 40)) console.error(`- ${problem}`);
  if (problems.length > 40) console.error(`… 其余 ${problems.length - 40} 项省略`);
  console.error('\n这些是**结构**问题（缺项、错位、公式记号被改动）。它不检查数学正确性——'
    + '英文译文与中文源的数学对应关系仍需人工抽样复核。');
  process.exit(1);
}
console.log('\ni18n 结构对等检查通过（结构层；不含数学正确性）。');
