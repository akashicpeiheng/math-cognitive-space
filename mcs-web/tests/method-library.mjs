import { startTestServer } from './helpers.mjs';

import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/**
 * 方法库：带简介的栏目 + 点进去的细致解析。
 *
 * 用户给的十条（内省、认知发展笔记、构造反例、从特例切入、找不变量、逆向分析、
 * 直觉的建立与失效、不轻易诉诸「显然」、独立的动机溯源练习、次阶段的应用 ≠ 本阶段的特定联系）
 * 要全部落在 `/method` 的栏目里，每条有简介，点进去是细致解析。
 *
 * 两条**取材纪律**必须一起守住（这是本站的底线，也是这一页最容易翻车的地方）：
 * 1. 没有文档依据的条目，出处必须写「站点自己的整理」，不能伪装成对既有文档的转述；
 *    vault 里《构造反例的方法》《内省》《直觉的建立与失效》三份文件是 0 字节，页面必须说明这一点。
 * 2. 排序是本站判定的，页面上要写明排序依据，而不是给一个没有理由的顺序。
 */
const EXPECTED = [
  '内省',
  '认知发展笔记',
  '构造反例',
  '从特例切入',
  '找不变量',
  '逆向分析',
  '直觉的建立与失效',
  '不轻易诉诸「显然」',
  '独立的动机溯源练习',
  '次阶段的应用 ≠ 本阶段的特定联系',
];

const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto(server.origin + '/method', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const library = await page.evaluate(() => ({
    heading: document.querySelector('.method-library h2')?.textContent?.trim() ?? '',
    entries: [...document.querySelectorAll('.method-entry')].map((entry) => ({
      title: entry.querySelector('.method-entry-title')?.textContent?.trim() ?? '',
      gist: entry.querySelector('.method-entry-gist')?.textContent?.trim() ?? '',
      tag: entry.querySelector('.method-entry-tag')?.textContent?.trim() ?? '',
      href: entry.querySelector('a')?.getAttribute('href') ?? '',
      more: entry.querySelector('.method-entry-more')?.textContent?.trim() ?? '',
    })),
    orderNote: document.querySelector('.method-library-head .muted')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    gaps: [...document.querySelectorAll('.method-gaps li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim() ?? ''),
    coreCards: document.querySelectorAll('.method-card').length,
    literalCaret: /[\^]\{|\$/.test(document.querySelector('.method-library')?.textContent ?? ''),
  }));

  check('方法库栏目挂在学习方法论页上', library.heading.includes('方法库') && library.heading.includes('10'), library.heading);
  check('十条都在，且顺序就是声明的顺序',
    JSON.stringify(library.entries.map((entry) => entry.title)) === JSON.stringify(EXPECTED),
    JSON.stringify(library.entries.map((entry) => entry.title)));
  check('每条都有简介、分类标签与「读细致解析」入口',
    library.entries.every((entry) => entry.gist.length >= 12 && entry.tag.length > 0 && entry.href.startsWith('/method/') && entry.more.includes('细致解析')),
    JSON.stringify(library.entries.map((entry) => [entry.title, entry.gist.length, entry.href])));
  check('页面上写明排序依据（不是没理由的顺序）',
    library.orderNote.includes('排序依据') && library.orderNote.includes('元方法') && library.orderNote.includes('进阶分辨'),
    library.orderNote.slice(0, 90));
  check('方法库十条 + 笔记原则八条都渲染出来了', library.entries.length === 10 && library.coreCards === 8,
    JSON.stringify({ entries: library.entries.length, core: library.coreCards }));
  check('栏目里没有漏排的数学记号（不在纯文本里留 $ 或 ^{）', !library.literalCaret);
  check('如实说明三份 0 字节文档与站点整理的关系',
    library.gaps.some((text) => text.includes('0 字节') && text.includes('站点自己的整理')),
    JSON.stringify(library.gaps.slice(0, 2)));

  // 逐条点进细致解析：四段结构必须在，出处必须如实。
  const details = [];
  for (const entry of library.entries) {
    await page.goto(server.origin + entry.href, { waitUntil: 'networkidle' });
    await page.waitForTimeout(160);
    details.push(await page.evaluate(() => ({
      h1: document.querySelector('.intro-hero h1')?.textContent?.trim() ?? '',
      eyebrows: document.querySelector('.intro-hero .eyebrow')?.textContent?.trim() ?? '',
      headings: [...document.querySelectorAll('.card h2')].map((h) => h.textContent?.trim() ?? ''),
      steps: document.querySelectorAll('.method-how li').length,
      boundary: document.querySelectorAll('.intro-bullets li').length,
      source: document.querySelector('.intro-evidence')?.textContent?.trim() ?? '',
      back: Boolean(document.querySelector('.intro-hero a[href="/method"]')),
      body: document.querySelector('.method-page')?.textContent?.length ?? 0,
    })));
  }
  check('十条细致解析都能打开，标题与卡片一致',
    details.every((detail, index) => detail.h1 === EXPECTED[index]),
    JSON.stringify(details.map((detail) => detail.h1)));
  check('每条解析都有「解决什么问题 / 怎么做 / 什么时候会失效」四段',
    details.every((detail) => ['它解决什么问题', '怎么做', '什么时候会失效', '出处'].every((head) => detail.headings.includes(head))),
    JSON.stringify(details.map((detail) => detail.headings)));
  check('每条解析都给了可执行步骤与失效边界',
    details.every((detail) => detail.steps >= 3 && detail.boundary >= 2),
    JSON.stringify(details.map((detail) => [detail.steps, detail.boundary])));
  check('每条解析都标了出处，且区分「整理自文档」与「站点自己的整理」',
    details.every((detail) => detail.source.length > 8)
      && details.some((detail) => detail.source.includes('站点自己的整理'))
      && details.some((detail) => detail.source.includes('认知发展笔记')),
    JSON.stringify(details.map((detail) => detail.source.slice(0, 18))));
  check('每条解析都能回到方法库', details.every((detail) => detail.back));
  check('每条解析的正文都不是占位（≥600 字）', details.every((detail) => detail.body >= 600),
    JSON.stringify(details.map((detail) => detail.body)));

  // 解析页里指向本体节点的链接必须真的能打开（死链比没有链接更糟）。
  const nodeLinks = [...new Set(details.flatMap(() => []))];
  await page.goto(server.origin + '/method/counterexample', { waitUntil: 'networkidle' });
  const linkTargets = await page.evaluate(() => [...document.querySelectorAll('.card a[href^="/nodes/"]')].map((a) => a.getAttribute('href')));
  for (const href of linkTargets) {
    await page.goto(server.origin + href, { waitUntil: 'networkidle' });
    const node = await page.evaluate(() => ({
      title: document.querySelector('.node-header h1')?.textContent?.trim() ?? '',
      notFound: document.body.textContent?.includes('找不到') ?? false,
    }));
    nodeLinks.push(`${href} → ${node.title || (node.notFound ? '找不到' : '(空)')}`);
    check(`本体链接可打开：${href}`, node.title.length > 0 && !node.notFound, JSON.stringify(node));
  }

  // 相邻导航 + 未知 id 的处理。
  await page.goto(server.origin + '/method/counterexample', { waitUntil: 'networkidle' });
  const neighbors = await page.evaluate(() => [...document.querySelectorAll('.method-neighbors a')].map((a) => a.getAttribute('href')));
  check('细致解析有上一条 / 下一条', neighbors.includes('/method/cognitive-notes') && neighbors.includes('/method/special-case'),
    JSON.stringify(neighbors));
  await page.goto(server.origin + '/method/no-such-method', { waitUntil: 'networkidle' });
  const missing = await page.evaluate(() => ({
    h1: document.querySelector('.intro-hero h1')?.textContent?.trim() ?? '',
    back: Boolean(document.querySelector('a[href="/method"]')),
  }));
  check('未知方法 id 给出明确提示并留回去的路', missing.h1.includes('没有这一条方法') && missing.back, JSON.stringify(missing));

  check('方法库没有控制台错误', consoleErrors.length === 0, consoleErrors.join(' | '));
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n方法库验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n方法库验收通过。');
