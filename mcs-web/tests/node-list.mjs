import { resolve } from 'node:path';
import { startTestServer, jsonCall } from './helpers.mjs';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';

import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/**
 * 「数学对象」列表页的验收。
 *
 * 这一套是**批判性复核之后立的规矩**：每一条都对应一处实测出来的缺陷，
 * 断言写在这里是为了不让它们悄悄回来。
 *
 * 1. 可达性：接口默认只返回 200 条而本体有 232 个节点，页面必须能翻到全部；
 * 2. 首屏：登记顺序开头是九张「0 行动 0 证据」的背景脚手架卡，默认排序必须让有正文的先出现；
 * 3. 诚实：正文待写的节点要在卡片上标出来，不能装成能读；
 * 4. 学习状态：列表要读 E（已确认/已读/还不懂/现在可学），否则页面等于不认识学习者；
 * 5. 排版：C^k 这类记号不能以脱字符形式出现（卡片是纯文本上下文）；
 * 6. 手机：390×844 下第一张卡必须在首屏内（改前第一张卡在 913px，整屏无内容）。
 */
const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });

  // 先造一个档案并标记一个节点已读：学习状态芯片要有东西可显示。
  const profile = await jsonCall(server.origin, '/api/v2/profiles', { method: 'POST', body: { name: '列表页验收档案', kind: 'test' } });
  const profileId = profile.payload?.data?.profile?.id;
  // 来源类型只接受 browser / deeptutor / import / system / user（shared/contracts.mjs）。
  const readEvent = await jsonCall(server.origin, `/api/v2/profiles/${profileId}/events`, {
    method: 'POST',
    body: { eventId: 'nl-read-1', kind: 'view', nodeId: 'limit:limit-ed', payload: { context: 'read' }, source: { kind: 'user', ref: 'node-list-test' } },
  });
  const confirmEvent = await jsonCall(server.origin, `/api/v2/profiles/${profileId}/events`, {
    method: 'POST',
    body: { eventId: 'nl-confirm-1', kind: 'confirmation', nodeId: 'bg:linear:vector', payload: { confirmed: true }, source: { kind: 'user', ref: 'node-list-test' } },
  });
  check('造出的 E 事件被接受（形状合法）', readEvent.status === 200 && confirmEvent.status === 200,
    JSON.stringify({ read: readEvent.status, confirm: confirmEvent.status, error: readEvent.payload?.error?.message }));

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  await page.goto(server.origin + '/nodes', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  // 选中刚建的档案，让页面拿到 E（选择器要精确到 #profile-select，用 `select,` 会在严格模式下匹配到多个）。
  await page.selectOption('#profile-select', { label: '列表页验收档案' });
  await page.waitForTimeout(700);
  const picked = await page.evaluate(() => document.querySelector('#profile-select')?.value ?? '');
  check('列表页能选中档案（学习状态的前提）', Boolean(picked), picked);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  const shape = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.node-card')];
    return {
      heading: document.querySelector('.section-heading h1')?.textContent ?? '',
      lead: document.querySelector('.section-heading p')?.textContent?.trim() ?? '',
      hasGlossary: Boolean(document.querySelector('.glossary')),
      countLine: document.querySelector('.result-count')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      cards: cards.length,
      hasLoadMore: Boolean(document.querySelector('.load-more button')),
      firstCardTitle: cards[0]?.querySelector('h3')?.textContent ?? '',
      firstCardPending: Boolean(cards[0]?.querySelector('.node-pending')),
      states: cards.map((card) => card.getAttribute('data-state')).filter((state) => state && state !== 'none'),
      pending: document.querySelectorAll('.node-card .node-pending').length,
      literalCaret: document.body.innerText.includes('C^'),
      footerZeros: [...document.querySelectorAll('.node-card footer')].filter((f) => /0 个行动|0 条证据/.test(f.textContent ?? '')).length,
    };
  });

  check('页首用学习者语言，不再讲本体登记规则',
    shape.heading === '数学对象' && shape.lead.includes('可以读的数学对象') && !shape.lead.includes('Claim'),
    JSON.stringify({ heading: shape.heading, lead: shape.lead.slice(0, 40) }));
  check('术语收进可展开的说明', shape.hasGlossary);
  check('默认把有正文的对象排在前面', !shape.firstCardPending && shape.firstCardTitle.length > 0, JSON.stringify({ title: shape.firstCardTitle, pending: shape.firstCardPending }));
  check('卡片不再出现「0 个行动 / 0 条证据」', shape.footerZeros === 0, String(shape.footerZeros));
  check('卡片上没有字面 C^', shape.literalCaret === false);
  check('列表读到了学习状态', shape.states.length >= 2, JSON.stringify(shape.states.slice(0, 6)));
  check('首屏就是分页的，可继续加载', shape.cards === 60 && shape.hasLoadMore, JSON.stringify({ cards: shape.cards, more: shape.hasLoadMore }));

  // 可达性：一路点「显示更多」，直到全部 232 个节点都能看见。
  let guard = 0;
  while ((await page.locator('.load-more button').count()) > 0 && guard < 12) {
    await page.locator('.load-more button').click();
    await page.waitForTimeout(260);
    guard += 1;
  }
  const afterPaging = await page.evaluate(() => ({
    cards: document.querySelectorAll('.node-card').length,
    countLine: document.querySelector('.result-count')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    more: Boolean(document.querySelector('.load-more button')),
    pending: document.querySelectorAll('.node-card .node-pending').length,
  }));
  /*
   * 默认档（单元）能翻完，且**恰好是单元数**——顺手把「默认不含话题」这件事断言掉；
   * 全部 232 个（含 36 条话题）属于「话题 + 单元」那一档，下面切过去再验一次。
   */
  const totals = await page.evaluate(async () => {
    const all = (await (await fetch('/api/v2/ontology/nodes?limit=500&granularity=all')).json()).data;
    return { total: all.total, unit: all.granularityCounts.unit, topic: all.granularityCounts.topic };
  });
  check('默认档只列单元，翻完就是单元数',
    afterPaging.cards === totals.unit && !afterPaging.more,
    JSON.stringify({ cards: afterPaging.cards, unit: totals.unit, more: afterPaging.more }));
  check('计数行如实说明还有多少条话题级条目没进这一列',
    new RegExp(`另有 ${totals.topic} 条话题级条目`).test(afterPaging.countLine),
    afterPaging.countLine);
  await page.selectOption('select:has(option[value="all"])', 'all');
  await page.waitForTimeout(600);
  let guard2 = 0;
  while ((await page.locator('.load-more button').count()) > 0 && guard2 < 12) {
    await page.locator('.load-more button').click();
    await page.waitForTimeout(240);
    guard2 += 1;
  }
  const allCount = await page.locator(".node-card").count();
  check('切到「话题 + 单元」后两层都能翻完', allCount === totals.total, JSON.stringify({ cards: allCount, total: totals.total }));
  check('计数行说清显示了多少 / 一共多少', /显示 \d+ \/ \d+ 个登记节点/.test(afterPaging.countLine), afterPaging.countLine);
  check('正文待写的节点翻到后面如实标出', afterPaging.pending > 0, String(afterPaging.pending));

  // 只看有正文的：数量应与 isContent 真值一致。
  await page.goto(server.origin + '/nodes?content=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const withContent = await page.evaluate(async () => {
    const graph = await (await fetch('/api/v2/ontology/nodes?limit=500')).json();
    const truth = graph.data.nodes.filter((node) => node.hasContent).length;
    const countLine = document.querySelector('.result-count')?.textContent ?? '';
    return { truth, countLine, cards: document.querySelectorAll('.node-card').length };
  });
  check('「只看有正文的」数量与本体一致', withContent.countLine.includes(`符合当前条件 ${withContent.truth} 个`), JSON.stringify(withContent));

  // 只看我没读过的：刚标记已读的那个节点必须从列表里消失。
  await page.goto(server.origin + '/nodes?unread=1&q=' + encodeURIComponent('极限'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const unread = await page.evaluate(() => ({
    readings: [...document.querySelectorAll('.node-card h3')].map((h) => h.textContent ?? ''),
    countLine: document.querySelector('.result-count')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    excludedNote: /按你的阅读状态排除/.test(document.querySelector('.result-count')?.textContent ?? ''),
  }));
  check('「只看我没读过的」会排掉读过的节点',
    unread.excludedNote && !unread.readings.includes('函数极限的 ε–δ 定义'),
    JSON.stringify({ note: unread.excludedNote, first: unread.readings.slice(0, 3), count: unread.readings.length }));

  // 手机：第一张卡必须在首屏内，筛选栏默认收起。
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(server.origin + '/nodes', { waitUntil: 'networkidle' });
  /*
   * 同一路由的 goto 在 SPA 里不重新加载，上一步「翻到最后一页」的滚动位置会留着——
   * 首屏断言量的是**布局**，所以先回到顶部（第一版忘了这步，读到 -9626 的负值）。
   */
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  const mobile = await page.evaluate(() => {
    const first = document.querySelector('.node-card');
    const filters = document.querySelector('.filters-card');
    return {
      firstCardTop: Math.round(first?.getBoundingClientRect().top ?? -1),
      filtersOpen: filters?.hasAttribute('open') ?? true,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      cards: document.querySelectorAll('.node-card').length,
    };
  });
  check('手机首屏就能看到第一张卡', mobile.firstCardTop > 0 && mobile.firstCardTop < 780, JSON.stringify(mobile));
  check('手机筛选栏默认收起', mobile.filtersOpen === false, JSON.stringify(mobile));
  check('手机无横向溢出', mobile.overflow <= 2, 'overflow=' + mobile.overflow);
  await page.screenshot({ path: resolve(MCS_WEB_ROOT, 'tmp', 'node-list-mobile.png') });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(server.origin + '/nodes', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: resolve(MCS_WEB_ROOT, 'tmp', 'node-list-desktop.png') });

  check('列表页没有控制台错误', consoleErrors.length === 0, consoleErrors.join(' | '));
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n数学对象列表页验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n数学对象列表页验收通过。');
