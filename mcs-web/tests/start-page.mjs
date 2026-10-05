import { resolve } from 'node:path';
import { startTestServer } from './helpers.mjs';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';

import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/**
 * 「开始学习」页（/start）：首页六幕动画之后的落脚点。
 *
 * 这一页的职责是把入口按角度摊开，所以验收盯四件事：
 * 1. 与首页的分工（首页不挂学习板块、品牌位回首页、导航指向这一页）；
 * 2. 各角度板块齐全（领域 / 对象类型 / 角色 / 案例 + 五条固定方式）；
 * 3. **角度卡片上的数字与本体一致**，并且点进去真的筛出了东西；
 * 4. 窄屏不溢出、无控制台错误。
 */
const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  // 首页的主入口就是这一页。
  await page.goto(server.origin, { waitUntil: 'networkidle' });
  const heroPrimary = await page.locator('.hero-actions a').first().getAttribute('href');
  check('末幕主入口指向开始学习页', heroPrimary === '/start', String(heroPrimary));
  await page.goto(server.origin + '/start', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const pageShape = await page.evaluate(() => ({
    title: document.querySelector('.start-page h1')?.textContent?.trim() ?? '',
    homeLink: document.querySelector('.start-head-links a')?.getAttribute('href') ?? '',
    navStart: document.querySelector('.nav-primary .nav-item')?.getAttribute('href') ?? '',
    navActive: document.querySelector('.nav-primary .nav-item.active')?.textContent?.trim() ?? '',
    crumb: document.querySelector('.topbar-crumbs')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    sectionIds: [...document.querySelectorAll('.start-page section[id]')].map((section) => section.id),
  }));
  check('开始学习页可用且标题正确', pageShape.title === '开始学习', JSON.stringify(pageShape));
  check('导航「开始学习」指向这一页并高亮', pageShape.navStart === '/start' && pageShape.navActive.includes('开始学习'), JSON.stringify(pageShape));
  check('顶栏显示当前位置', pageShape.crumb.includes('开始学习'), pageShape.crumb);
  check('页首给出回首页动画的入口', pageShape.homeLink === '/', pageShape.homeLink);
  check('页内给出锚点：继续学习 / 原型问题 / 各角度', ['continue', 'cases', 'angles'].every((id) => pageShape.sectionIds.includes(id)), JSON.stringify(pageShape.sectionIds));

  // 各角度板块：四组筛选 + 五条固定方式，全部由本体现场派生。
  const angles = await page.evaluate(() => {
    const groups = [...document.querySelectorAll('.angle-card[data-angle]')].map((card) => ({
      id: card.getAttribute('data-angle'),
      chips: [...card.querySelectorAll('.angle-chip')].map((chip) => ({
        label: chip.querySelector('.angle-chip-label')?.textContent?.trim() ?? '',
        count: Number(chip.querySelector('.angle-chip-count')?.textContent ?? '0'),
        href: chip.getAttribute('href') ?? '',
      })),
    }));
    return {
      groups,
      modes: [...document.querySelectorAll('.angle-mode')].map((card) => ({
        id: card.getAttribute('data-mode'),
        href: card.querySelector('a.button')?.getAttribute('href') ?? '',
      })),
      coldStart: Boolean(document.querySelector('#cold-start')),
    };
  });
  check('四个角度分组齐全', JSON.stringify(angles.groups.map((group) => group.id)) === JSON.stringify(['discipline', 'construct', 'role', 'case']),
    JSON.stringify(angles.groups.map((group) => group.id)));
  const groupsHaveChips = angles.groups.every((group) => group.chips.length >= 2
    && group.chips.every((chip) => chip.label && chip.count > 0 && chip.href.startsWith('/nodes?')));
  check('每组都有可点的入口且带计数', groupsHaveChips, JSON.stringify(angles.groups.map((group) => group.chips.length)));
  check('五条「按方式」入口齐全且指向站内页面',
    JSON.stringify(angles.modes.map((mode) => mode.id)) === JSON.stringify(['plan', 'network', 'review', 'method', 'evidence'])
      && angles.modes.every((mode) => mode.href.startsWith('/')),
    JSON.stringify(angles.modes));

  /*
   * 数字是活的：与本体现场统计比对，防止写死。
   *
   * **口径必须与页面一致**：这些 chip 通向列表页，而列表默认只列单元
   * （2026-10 起话题级条目是另一层），所以基线也只统计 unit。
   */
  const live = await page.evaluate(async () => {
    const graph = await (await fetch('/api/v2/ontology/graph')).json();
    const units = graph.data.nodes.filter((node) => (node.granularity ?? 'unit') === 'unit');
    const tally = (pick) => {
      const counts = {};
      for (const node of units) for (const key of pick(node)) counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    };
    return {
      discipline: tally((node) => [node.discipline]),
      construct: tally((node) => [node.construct]),
      nodes: graph.data.nodes.length,
    };
  });
  const disciplineCard = angles.groups.find((group) => group.id === 'discipline');
  const disciplineOk = disciplineCard.chips.every((chip) => live.discipline[chip.label] === chip.count);
  check('按领域的计数与本体一致', disciplineOk, JSON.stringify({ chips: disciplineCard.chips, live: live.discipline }));
  const constructCard = angles.groups.find((group) => group.id === 'construct');
  const constructOk = constructCard.chips.every((chip) => live.construct[chip.href.split('construct=')[1].split('&')[0]] === chip.count);
  check('按对象类型的计数与本体一致', constructOk, JSON.stringify({ chips: constructCard.chips, live: live.construct }));
  check('全库节点数在页面上可见', (await page.locator('.angle-more a').first().innerText()).includes(String(live.nodes)), String(live.nodes));

  // 角度入口真的能筛出东西：点第一个学科 chip，落到带筛选的列表页。
  const firstChip = disciplineCard.chips[0];
  await page.locator('.angle-card[data-angle="discipline"] .angle-chip').first().click();
  await page.waitForTimeout(700);
  /*
   * 先翻完再比：列表首屏只画 60 张卡，而「微分几何」这一支现在有 74 个单元
   * （学科按本质领域重分之后，它成了最大的一支）。旧断言直接比首屏卡片数，会误报 60 ≠ 74。
   */
  let pagingGuard = 0;
  while ((await page.locator('.load-more button').count()) > 0 && pagingGuard < 12) {
    await page.locator('.load-more button').click();
    await page.waitForTimeout(220);
    pagingGuard += 1;
  }
  const filtered = await page.evaluate(() => ({
    url: decodeURIComponent(location.pathname + location.search),
    cards: document.querySelectorAll('.node-grid .card, .node-card').length,
    activeFilters: [...document.querySelectorAll('.active-filter, .filter-chip, .chip')].map((chip) => chip.textContent ?? ''),
    body: document.body.innerText,
  }));
  check('点学科入口进入带筛选的对象列表', filtered.url.startsWith('/nodes?discipline='), filtered.url);
  check('筛选后列表数量与计数一致', filtered.cards === firstChip.count, JSON.stringify({ shown: filtered.cards, chip: firstChip.count }));
  check('列表页显示当前筛选条件', filtered.body.includes(firstChip.label), firstChip.label);

  // 冷启动：没有前置的起点直接给节点链接。
  await page.goto(server.origin + '/start', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const cold = await page.evaluate(() => {
    const box = document.querySelector('#cold-start');
    if (!box) return null;
    return {
      hrefs: [...box.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? ''),
      heading: box.querySelector('h3')?.textContent ?? '',
    };
  });
  check('冷启动板块列出无前置的背景节点',
    cold !== null && cold.hrefs.length >= 1 && cold.hrefs.every((href) => href.startsWith('/nodes/')),
    JSON.stringify(cold));

  // 品牌位回首页（首页不占导航项）。
  await page.locator('.brand').click();
  await page.waitForTimeout(700);
  const home = await page.evaluate(() => ({
    path: location.pathname,
    story: Boolean(document.querySelector('.home-story')),
    learningBlocks: document.querySelectorAll('.case-card, .continue-card').length,
  }));
  check('点侧栏品牌回到首页动画', home.path === '/' && home.story, JSON.stringify(home));
  check('首页仍然只有动画', home.learningBlocks === 0, String(home.learningBlocks));

  // 窄屏：各角度卡片不能把页面撑宽。
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(server.origin + '/start', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const mobile = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    chips: document.querySelectorAll('.angle-chip').length,
    chipOverflow: [...document.querySelectorAll('.angle-chip')].filter((chip) => chip.getBoundingClientRect().right > window.innerWidth + 1).length,
  }));
  check('窄屏开始学习页无横向溢出', mobile.overflow <= 2 && mobile.chipOverflow === 0, JSON.stringify(mobile));
  await page.screenshot({ path: resolve(MCS_WEB_ROOT, 'tmp', 'start-page-mobile.png') });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(server.origin + '/start', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: resolve(MCS_WEB_ROOT, 'tmp', 'start-page-desktop.png'), fullPage: true });

  check('开始学习页没有控制台错误', consoleErrors.length === 0, consoleErrors.join(' | '));
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n开始学习页验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n开始学习页验收通过。');
