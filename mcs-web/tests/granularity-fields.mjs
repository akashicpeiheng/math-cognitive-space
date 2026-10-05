import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { startTestServer } from './helpers.mjs';
import { MCS_WEB_ROOT, loadOntology } from '../core/ontology.mjs';
import { FIELDS, FIELD_IDS } from '../data/fields.mjs';
import {
  TOPIC_REASONS, UNIT_REASONS, GRANULARITY_VALUES, granularityGaps, isTopicTitle,
} from '../data/granularity.mjs';

import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/**
 * 条目粒度（单元 / 话题）与学科（本质领域）。
 *
 * 用户的两条要求：
 * 1. 「节点是最小的可独立认知单元，这些是话题范畴下的内容，要去分开」；
 * 2. 「不要按教材分类节点，按知识的本质领域去分类」。
 *
 * 第五十二轮只判过 `liang` 一个案例（36 条话题），判据写在代码里、标记写在数据里，
 * 但「其余案例是否也混着话题」与「学科词表要不要再细分」留成了两处欠账。
 * 2026-10 这一轮把两处都补上，并把判定结果集中成**一张可核对的登记表**：
 *
 * - 数据层：每个节点的学科都在受控词表里（12 支，代数已按对象拆开）；粒度只有两个值；
 *   标题命中并列词的条目**必须**有判定记录（话题清单或判为单元的例外，各带理由）；
 * - 接口层：默认只给单元，`granularity=all|topic` 才给话题，未知值按 unit 并如实回报；
 * - 页面层：默认档显示单元、计数行说明还有多少条话题没进这一列；
 *   切到「话题」能看到被点名的那些条目；「来源」与「学科（本质领域）」是两个独立筛选；
 * - 文档层：README 的接口小节写明 `granularity` 参数、默认值与迁移示例。
 */
const ontology = await loadOntology();
const nodes = ontology.raw.nodes;

// ---- 数据层：粒度判定的完备性 ----
const topics = nodes.filter((node) => node.granularity === 'topic');
const units = nodes.filter((node) => (node.granularity ?? 'unit') === 'unit');
const gapProblems = granularityGaps(nodes);
check('粒度只有 unit / topic 两个值', nodes.every((node) => GRANULARITY_VALUES.includes(node.granularity ?? 'unit')));
check('话题清单里的节点在原数据里都真的是 topic',
  Object.keys(TOPIC_REASONS).every((id) => nodes.find((node) => node.id === id)?.granularity === 'topic'),
  Object.keys(TOPIC_REASONS).filter((id) => nodes.find((node) => node.id === id)?.granularity !== 'topic').join('、'));
check('标题命中并列词的条目全部判过（话题清单或「判为单元」的例外）', gapProblems.length === 0, gapProblems.join('；'));
const unjudged = nodes.filter((node) => isTopicTitle(node.title)
  && !TOPIC_REASONS[node.id] && !UNIT_REASONS[node.id]
  && ['Concept', 'Claim', 'Construction'].includes(node.construct));
check('没有漏判的并列式标题', unjudged.length === 0, unjudged.map((node) => node.id).join('、'));
check('判为单元的例外都写了理由（不是一句「不算」）',
  Object.values(UNIT_REASONS).every((reason) => typeof reason === 'string' && reason.length >= 8));
check('话题覆盖到多个案例（不再只有 liang）',
  new Set(topics.map((node) => node.case)).size >= 2,
  JSON.stringify([...new Set(topics.map((node) => node.case))]));

// ---- 数据层：学科词表细分 ----
const disciplineCounts = {};
for (const node of nodes) disciplineCounts[node.discipline] = (disciplineCounts[node.discipline] ?? 0) + 1;
check('学科全部落在受控词表里（12 支）',
  nodes.every((node) => FIELD_IDS.includes(node.discipline)) && FIELDS.length === 12,
  JSON.stringify({ fields: FIELDS.length, unknown: [...new Set(nodes.map((n) => n.discipline))].filter((d) => !FIELD_IDS.includes(d)) }));
check('「代数」这一支已经按对象拆开（群论 / 线性代数 / 多重线性与张量代数 / 域与数系）',
  !disciplineCounts['代数'] && ['群论', '线性代数', '多重线性与张量代数', '域与数系'].every((id) => disciplineCounts[id] > 0),
  JSON.stringify(disciplineCounts));
check('每支都有对象（词表里不留空支）',
  FIELDS.every((field) => (disciplineCounts[field.id] ?? 0) > 0),
  FIELDS.filter((field) => !disciplineCounts[field.id]).map((field) => field.id).join('、'));
console.log('  · 学科对象数：' + FIELDS.map((field) => `${field.id} ${disciplineCounts[field.id] ?? 0}`).join('，'));
console.log(`  · 粒度：单元 ${units.length}，话题 ${topics.length}（`
  + Object.entries(topics.reduce((acc, node) => ({ ...acc, [node.case]: (acc[node.case] ?? 0) + 1 }), {}))
    .map(([caseId, count]) => `${caseId} ${count}`).join('，') + '）');

// ---- 文档层：接口参数的兼容说明（第五十二轮留下的欠账）----
const readme = readFileSync(resolve(MCS_WEB_ROOT, 'README.md'), 'utf8');
check('README 的接口小节写明 granularity 参数、默认值与迁移示例',
  /granularity/.test(readme) && /默认值/.test(readme) && /迁移示例/.test(readme) && /granularityCounts/.test(readme),
  'README 缺少参数说明或迁移示例');
const apiSource = readFileSync(resolve(MCS_WEB_ROOT, 'server/api.mjs'), 'utf8');
check('api.mjs 顶部写明读参数的约定（URLSearchParams.get 与 scope/granularity 不混用）',
  /URLSearchParams/.test(apiSource) && /\.get\(/.test(apiSource) && /scope/.test(apiSource));
/*
 * 约定不能只写在注释里：扫一遍源码，禁止对 query 做属性访问（第五十二轮就是这样把
 * `granularity=topic` 静默降级成 unit 的——返回 200、内容不对，最难查）。
 * 这是「lint 式断言」的最小可用版本：正则扫源码，命中就红。
 *
 * 先去掉注释再扫：注释里**应该**写着反例（「query.granularity 永远是 undefined」），
 * 那不是违规，是说明。
 */
const apiCode = apiSource
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');
const queryPropertyAccess = [...apiCode.matchAll(/query\.(?!get\()([A-Za-z_$][\w$]*)/g)].map((match) => match[0]);
check('api.mjs 里没有 query 的属性访问（一律 query.get(...)）',
  queryPropertyAccess.length === 0, queryPropertyAccess.join('、'));

// ---- 接口层与页面层 ----
const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto(server.origin + '/nodes', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const api = await page.evaluate(async () => {
    const get = async (url) => (await (await fetch(url)).json()).data;
    const all = await get('/api/v2/ontology/nodes?limit=500&granularity=all');
    const unit = await get('/api/v2/ontology/nodes?limit=500');
    const topic = await get('/api/v2/ontology/nodes?limit=500&granularity=topic');
    const unknown = await get('/api/v2/ontology/nodes?limit=500&granularity=nonsense');
    const fields = [...new Set(all.nodes.map((node) => node.discipline))].sort();
    return {
      total: all.total,
      counts: all.granularityCounts,
      unitReturned: unit.returned,
      unitDefault: unit.granularity,
      topicReturned: topic.returned,
      unknownFallsBack: unknown.granularity,
      fields,
      topicValues: [...new Set(all.nodes.map((node) => node.granularity))].sort(),
    };
  });
  check('粒度只有 unit / topic 两个值（接口口径）', api.topicValues.join(',') === 'topic,unit', JSON.stringify(api.topicValues));
  check('默认只给单元（话题要显式索取）',
    api.unitDefault === 'unit' && api.unitReturned === api.counts.unit && api.topicReturned === api.counts.topic,
    JSON.stringify({ default: api.unitDefault, unit: api.unitReturned, topic: api.topicReturned, counts: api.counts }));
  check('单元 + 话题 = 全部', api.counts.unit + api.counts.topic === api.total,
    JSON.stringify({ ...api.counts, total: api.total }));
  check('接口的粒度计数与登记表一致',
    api.counts.topic === topics.length && api.counts.unit === units.length,
    JSON.stringify({ api: api.counts, registry: { unit: units.length, topic: topics.length } }));
  check('未知粒度按 unit 处理并如实回报（不静默改语义）', api.unknownFallsBack === 'unit', api.unknownFallsBack);
  check('学科只剩本质领域，没有教材式合并标签',
    !api.fields.includes('几何与拓扑') && !api.fields.includes('代数与几何') && !api.fields.includes('方法论')
      && !api.fields.includes('代数')
      && api.fields.includes('微分几何') && api.fields.includes('拓扑') && api.fields.includes('分析')
      && api.fields.includes('群论') && api.fields.includes('线性代数') && api.fields.includes('多重线性与张量代数'),
    JSON.stringify(api.fields));

  // ---- 页面层：默认档 ----
  const defaultView = await page.evaluate(() => ({
    countLine: document.querySelector('.result-count')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    labels: [...document.querySelectorAll('label')].map((label) => label.textContent.replace(/\s+/g, ' ').trim().slice(0, 12)),
    hasTopicCard: document.body.textContent.includes('连续映射与同胚'),
  }));
  check('计数行如实说明还有多少条话题级条目没进这一列',
    new RegExp(`另有 ${topics.length} 条话题级条目`).test(defaultView.countLine), defaultView.countLine);
  check('默认列表里没有话题级条目', defaultView.hasTopicCard === false);
  check('「来源」与「学科（本质领域）」是两个独立筛选',
    defaultView.labels.some((label) => label.startsWith('来源')) && defaultView.labels.some((label) => label.startsWith('学科')),
    JSON.stringify(defaultView.labels));

  // ---- 页面层：切到话题档 ----
  await page.goto(server.origin + '/nodes?case=liang&show=topics', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const topicView = await page.evaluate(() => ({
    cards: document.querySelectorAll('.node-card').length,
    hasTopic: document.body.textContent.includes('连续映射与同胚'),
    hasUnit: document.body.textContent.includes('切矢量'),
    countLine: document.querySelector('.result-count')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  }));
  check('切到话题档：被点名的那些条目出现在列表里',
    topicView.hasTopic && topicView.cards > 0, JSON.stringify({ cards: topicView.cards, topic: topicView.hasTopic }));
  check('话题档不再混入单元，并说明单元在另一档',
    topicView.hasUnit === false && /单元/.test(topicView.countLine),
    JSON.stringify({ unit: topicView.hasUnit, countLine: topicView.countLine }));

  // ---- 页面层：本轮新判的话题在 rudin 档里能看到 ----
  await page.goto(server.origin + '/nodes?case=rudin&show=topics', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const rudinTopics = await page.evaluate(() => ({
    cards: document.querySelectorAll('.node-card').length,
    hasJudged: document.body.textContent.includes('有限集、可数集与不可数集'),
  }));
  const rudinTopicCount = topics.filter((node) => node.case === 'rudin').length;
  check('本轮补判的话题（rudin）在话题档里能看到',
    rudinTopics.hasJudged && rudinTopics.cards === rudinTopicCount,
    JSON.stringify({ cards: rudinTopics.cards, expected: rudinTopicCount }));

  // ---- 页面层：按本质领域筛 ----
  await page.goto(server.origin + '/nodes?discipline=' + encodeURIComponent('拓扑'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const fieldView = await page.evaluate(async () => {
    const cards = document.querySelectorAll('.node-card').length;
    const data = (await (await fetch('/api/v2/ontology/nodes?limit=500&discipline=' + encodeURIComponent('拓扑'))).json()).data;
    return { cards, api: data.returned, fields: [...new Set(data.nodes.map((node) => node.discipline))] };
  });
  check('按本质领域筛选：条数与接口一致，且结果只含该领域',
    fieldView.cards > 0 && fieldView.cards <= fieldView.api && fieldView.fields.join(',') === '拓扑',
    JSON.stringify(fieldView));

  check('粒度与学科改动没有控制台错误', consoleErrors.length === 0, consoleErrors.join(' | '));
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n单元 / 话题与本质领域验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n单元 / 话题与本质领域验收通过。');
