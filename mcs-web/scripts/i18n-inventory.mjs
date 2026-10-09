/**
 * i18n 盘点工具（只读）：把公共本体里**所有含中文的字符串字段**逐路径列出来。
 *
 * 为什么需要它，而不是人工列一份字段清单：
 *
 * `data/authoring.mjs` 的每个构造器都会**自动补默认值**（例如 `concept()` 的
 * `formal.formationWitness` 默认是「参数与谓词已按声明类型闭合。」）。也就是说
 * 「哪个字段有中文」不是由案例文件决定的，而是由「构造器默认值 + 案例显式覆写」
 * 共同决定的。人工抄一份字段清单，下一次改构造器就过期了；这里按实际装配结果枚举，
 * 覆盖范围由数据本身说话。
 *
 * 用法：
 *   node scripts/i18n-inventory.mjs            # 汇总（按字段路径分组）
 *   node scripts/i18n-inventory.mjs --json     # 逐条明细（JSON）
 *   node scripts/i18n-inventory.mjs --field formal.formationWitness
 */

import { loadOntology } from '../core/ontology.mjs';

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const onlyField = args.includes('--field') ? args[args.indexOf('--field') + 1] : null;

/** 结构化 id 与受控词表值：它们**不是**待译文本。 */
const ID_PATTERNS = [
  /^[a-z]+:/,                       // limit:distance
  /^a-[a-z]+:/,                     // a-limit:distance
  /^ev-/,                           // ev-limit-bridge-proof
  /^rel-/, /^rep-/, /^sc-/, /^bg:/,
  /^T_/, /^ax-/, /^LC\d+$/,
  /^sha256:[0-9a-f]+$/,
];

function looksLikeId(value) {
  return ID_PATTERNS.some((pattern) => pattern.test(value));
}

const COUNTER = new Map();
const SAMPLES = new Map();
let totalChars = 0;

function record(path, value, ctx) {
  if (typeof value !== 'string' || !CJK.test(value)) return;
  totalChars += [...value].filter((ch) => CJK.test(ch)).length;
  const bucket = COUNTER.get(path) ?? { count: 0, chars: 0 };
  bucket.count += 1;
  bucket.chars += [...value].filter((ch) => CJK.test(ch)).length;
  COUNTER.set(path, bucket);
  if (!SAMPLES.has(path)) SAMPLES.set(path, []);
  if (SAMPLES.get(path).length < 2) SAMPLES.get(path).push({ id: ctx, value: value.slice(0, 90) });
}

function walk(value, path, ctx) {
  if (typeof value === 'string') { record(path, value, ctx); return; }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${path}[]`, ctx));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (['id', 'version', 'contentRef'].includes(key)) continue;
      walk(item, path ? `${path}.${key}` : key, ctx);
    }
  }
}

const loaded = await loadOntology();
const ontology = loaded.raw;

const SECTIONS = {
  nodes: ontology.nodes,
  actions: ontology.actions,
  evidence: ontology.evidence,
  relations: ontology.relationDescriptions,
  representations: ontology.representations,
  support: ontology.support,
  aggregates: ontology.aggregates,
  templates: ontology.templates,
  patterns: ontology.patterns,
  claims: ontology.claims,
  localizations: ontology.localizations,
  coverage: ontology.coverage,
  environmentBoundary: ontology.environmentBoundary,
  signature: ontology.signature,
  theory: ontology.theory,
};

for (const [section, list] of Object.entries(SECTIONS)) {
  if (!list) continue;
  if (Array.isArray(list)) {
    for (const item of list) walk(item, section, item?.id ?? section);
  } else {
    walk(list, section, section);
  }
}

/* 正文 Markdown 单独统计：它是按 node 块索引的，不走上面的字段遍历。 */
const CONTENT = [];
for (const node of ontology.nodes) {
  const text = node.contentMarkdown ?? '';
  if (!CJK.test(text)) continue;
  CONTENT.push({
    id: node.id,
    chars: [...text].filter((ch) => CJK.test(ch)).length,
    bytes: Buffer.byteLength(text, 'utf8'),
  });
}
const contentChars = CONTENT.reduce((sum, item) => sum + item.chars, 0);

if (asJson) {
  console.log(JSON.stringify({
    fields: Object.fromEntries([...COUNTER.entries()].map(([path, bucket]) => [path, bucket.count])),
    content: CONTENT,
  }, null, 2));
  process.exit(0);
}

const rows = [...COUNTER.entries()]
  .filter(([path]) => !onlyField || path === onlyField)
  .map(([path, bucket]) => ({ path, ...bucket }))
  .sort((a, b) => b.chars - a.chars);

console.log(`本体字段里的中文字符总数：${totalChars}`);
console.log(`正文（contentMarkdown）中文字符总数：${contentChars}（${CONTENT.length} 个节点有正文）`);
console.log('');
console.log('字段路径'.padEnd(46) + '条数'.padStart(6) + '汉字数'.padStart(9));
console.log('-'.repeat(64));
for (const row of rows) {
  console.log(row.path.padEnd(46) + String(row.count).padStart(6) + String(row.chars).padStart(9));
  if (onlyField) for (const sample of SAMPLES.get(row.path) ?? []) console.log(`    · ${sample.id}: ${sample.value}`);
}
console.log('');
console.log(`共 ${rows.length} 个字段路径含中文。`);
