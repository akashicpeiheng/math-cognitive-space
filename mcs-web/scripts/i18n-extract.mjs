/**
 * 翻译工作台：按**案例**（或按节）导出待译字段的 JSON。
 *
 * 它不属于站点运行链路，是给译者（人或模型）用的：一次拿一个案例的全部待译字段，
 * 结构化输出，避免「从 5000 行的案例文件里挑中文」这种手工活。
 *
 * 用法：
 *   node scripts/i18n-extract.mjs --case limit            # limit 案例的全部节点
 *   node scripts/i18n-extract.mjs --case dg --ids-only    # 只看 id 清单与体量
 *   node scripts/i18n-extract.mjs --section actions --case limit
 *   node scripts/i18n-extract.mjs --case limit --out tmp/i18n/limit.zh.json
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadOntology, MCS_WEB_ROOT } from '../core/ontology.mjs';

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const SKIP_KEYS = new Set(['id', 'version', 'contentRef', 'discipline', 'construct', 'roles', 'mode', 'checkStatus', 'status', 'kind', 'node', 'type', 'theory', 'signatureVersion', 'evidenceStatus', 'from', 'to', 'accepts', 'provides', 'contentMarkdown']);
const SKIP_PATH = /(?:^|\.)(?:witness\.(?:ref|type|status)|provenance\.sources\[\]|formal\.(?:typeEnv|symbols|parameters)|references?\b)/;

const args = process.argv.slice(2);
const value = (flag, fallback = null) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback);
const caseId = value('--case');
const section = value('--section');
const idsOnly = args.includes('--ids-only');
const out = value('--out');

/** 摘出含中文的叶子字段（结构与 `data/i18n/overlay.mjs` 的合并规则同形）。 */
function pick(value, path, target) {
  if (typeof value === 'string') {
    if (CJK.test(value) && !SKIP_PATH.test(path)) target[path] = value;
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => pick(item, `${path}[${index}]`, target));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (SKIP_KEYS.has(key)) continue;
      pick(item, path ? `${path}.${key}` : key, target);
    }
  }
}

const instance = await loadOntology();
const raw = instance.raw;

const sections = {
  nodes: raw.nodes,
  actions: raw.actions,
  evidence: raw.evidence,
  relations: raw.relationDescriptions,
  support: raw.support,
  aggregates: raw.aggregates,
  templates: raw.templates,
  patterns: raw.patterns,
  claims: raw.claims,
  localizations: raw.localizations,
  coverage: raw.coverage,
  representations: raw.representations,
};

function inCase(item) {
  if (!caseId) return true;
  return item.case === caseId;
}

/*
 * 案例 id → 节点 id 前缀。`relations` / `templates` / `aggregates` / `localizations`
 * 这几节没有 `case` 字段，只能按 id 前缀筛，所以这张表必须覆盖全部案例：
 * 表里缺一个（例如 2026-10 之后的 `jiang` / `axler` / `top` / `vault`），
 * `startsWith(undefined)` 会一条都匹配不上，工具**静默抽出一份空清单**——
 * 比报错难发现得多。因此下面查不到就直接抛错，并列出可选值。
 *
 * 注意前缀与案例**不是一一对应**：节点合并之后，一个 `dg:` 前缀的规范节点
 * 可能同时登记在 dg / liang / top 等案例里（见 `data/merges.mjs`）。
 * 这张表只用于「大致按案例切一份待译清单」，不用于判定归属。
 */
const CASE_PREFIX = {
  limit: 'limit', manifold: 'manifold', tensor: 'tensor', group: 'group', dg: 'dg',
  liang: 'liang', rudin: 'rudin', jiang: 'jiang', axler: 'axler', top: 'top',
  vault: 'vault', background: 'bg', 'field-entry': 'bg',
};

const result = {};
for (const [name, items] of Object.entries(sections)) {
  if (section && name !== section) continue;
  const rows = [];
  for (const item of items) {
    if (name === 'relations' || name === 'coverage' || name === 'templates' || name === 'aggregates' || name === 'localizations') {
      /* 这些没有 `case`：先全部列出，由调用方按 id 前缀筛选。 */
      if (caseId && name !== 'coverage') {
        const prefix = CASE_PREFIX[caseId];
        if (!prefix) {
          throw new Error(`未知案例：${caseId}（可选：${Object.keys(CASE_PREFIX).join('、')}）。`
            + '新增案例时在 CASE_PREFIX 里补一行——缺一行会让这一节静默抽成空清单。');
        }
        if (!String(item.id).startsWith(prefix)) continue;
      }
    } else if (!inCase(item) && name !== 'actions' && name !== 'evidence' && name !== 'representations') {
      continue;
    } else if (caseId && !inCase(item) && !String(item.id).includes(caseId)) {
      continue;
    }
    const fields = {};
    pick(item, '', fields);
    if (Object.keys(fields).length === 0) continue;
    const chars = Object.values(fields).reduce((sum, text) => sum + [...text].filter((ch) => CJK.test(ch)).length, 0);
    rows.push(idsOnly ? { id: item.id, fields: Object.keys(fields).length, chars } : { id: item.id, fields });
  }
  if (rows.length) result[name] = rows;
}

const summary = Object.fromEntries(Object.entries(result).map(([name, rows]) => [name, { count: rows.length, chars: rows.reduce((sum, row) => sum + (row.chars ?? 0), 0) }]));
console.log(JSON.stringify(summary, null, 2));

if (out) {
  const target = resolve(MCS_WEB_ROOT, out);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`\n已写出：${target}`);
}
