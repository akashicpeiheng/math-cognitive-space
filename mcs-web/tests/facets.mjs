import { startTestServer } from './helpers.mjs';

import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/**
 * 分面选项的规矩（用户报错之后立的）：**选项只能从真有的数据里长出来**。
 *
 * 起因：知识网络「全部节点」悬浮框把 `CONSTRUCT_LABELS` 的 14 个键直接铺成下拉，
 * 而本体只登记了 11 类构造——「项 / 定义 / 表征」选中后永远 0 个节点
 * （本体里既没有 `construct=Definition` 也没有 `role=Definition`：模板支持、数据没登记）。
 * 同一处错误也出现在「数学对象」列表页的构造 / 角色下拉里（那是我自己上一轮写下的）。
 *
 * 这一套同时盯两个页面：
 * 1. 下拉里不再有筛不出东西的选项；
 * 2. 每个选项标注的计数与该选项真正筛出的条数一致；
 * 3. 空类别必须**如实说明**，不能假装它不存在；
 * 4. 搜「类比」这类**关系种类**时，要给出去处，而不是一个空列表。
 */
const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  const truth = await page.goto(server.origin + '/network', { waitUntil: 'networkidle' })
    .then(() => page.evaluate(async () => {
      const graph = await (await fetch('/api/v2/ontology/graph')).json();
      /*
       * 真值只统计**单元**：节点列表默认档就是单元（2026-10 起话题级条目是另一层）。
       * 用含话题的全量去比会误报「标称 126、页面 100」——那是口径不一致，不是缺选项。
       */
      const units = graph.data.nodes.filter((node) => (node.granularity ?? 'unit') === 'unit');
      const byConstruct = {};
      for (const node of units) byConstruct[node.construct] = (byConstruct[node.construct] ?? 0) + 1;
      return { byConstruct, nodes: units.length, topics: graph.data.nodes.length - units.length };
    }));

  // ---- 知识网络：「全部节点」悬浮框 ----
  await page.waitForTimeout(1200);
  if (await page.locator('.floating-panel[aria-label="全部节点"]').count() === 0) {
    await page.locator('button:has-text("全部节点")').first().click();
    await page.waitForTimeout(500);
  }
  const panel = '.floating-panel[aria-label="全部节点"]';
  const options = await page.evaluate((selector) => {
    const select = document.querySelector(`${selector} select[aria-label="按构造类型筛选"]`);
    return select ? [...select.options].map((option) => ({ value: option.value, label: option.textContent ?? '' })) : [];
  }, panel);

  const deadOptions = [];
  const countMismatch = [];
  for (const option of options.filter((item) => item.value !== '全部')) {
    await page.selectOption(`${panel} select[aria-label="按构造类型筛选"]`, option.value);
    await page.waitForTimeout(200);
    const result = await page.evaluate((selector) => ({
      items: document.querySelectorAll(`${selector} .network-node-list li`).length,
      count: document.querySelector(`${selector} .result-count`)?.textContent ?? '',
    }), panel);
    const claimed = Number((option.label.match(/（(\d+)）/) ?? [])[1] ?? -1);
    if (result.items === 0) deadOptions.push(option.label);
    if (claimed !== result.items) countMismatch.push(`${option.label} 标称 ${claimed}，实际 ${result.items}`);
  }
  check('网络面板：构造下拉里没有「选中就是 0 个」的死选项', deadOptions.length === 0, JSON.stringify(deadOptions));
  check('网络面板：每个构造选项标注的计数与实际筛选结果一致', countMismatch.length === 0, JSON.stringify(countMismatch));
  check('网络面板：选项数与本体真实构造数一致',
    options.filter((item) => item.value !== '全部').length === Object.keys(truth.byConstruct).length,
    JSON.stringify({ options: options.length - 1, truth: Object.keys(truth.byConstruct).length }));

  const absentNote = await page.locator(`${panel} .facet-absent`).innerText().catch(() => '');
  check('网络面板：空类别如实说明（项 / 定义 / 表征）',
    ['项', '定义', '表征'].every((word) => absentNote.includes(word)) && absentNote.includes('不放进筛选'),
    absentNote.replace(/\s+/g, ' ').slice(0, 120));

  // 搜「类比」：它是关系种类，本体里只有 1 条关系、0 个节点——必须给出处。
  await page.selectOption(`${panel} select[aria-label="按构造类型筛选"]`, '全部');
  await page.fill(`${panel} input[aria-label="搜索节点"]`, '类比');
  await page.waitForTimeout(400);
  const analogy = await page.evaluate((selector) => ({
    items: document.querySelectorAll(`${selector} .network-node-list li`).length,
    notice: document.querySelector(`${selector} .notice`)?.textContent ?? '',
  }), panel);
  check('网络面板：搜「类比」给的是关系种类的去处，而不是空列表',
    analogy.items === 0 && analogy.notice.includes('关系种类') && /1 条这种关系/.test(analogy.notice),
    JSON.stringify(analogy));

  /*
   * 词汇表（不是筛选项）也要带计数（TODO A5-34）。
   *
   * 「连接类型」开关与「契约 mode」条款列的是**整套词汇**：七类边源、七档 mode 全都在，
   * 包括当前视图里 0 条的那些。这是有意的（关掉一类是合法操作、条款要能对照权重），
   * 但每一行都必须写出计数，否则读者会以为「列出来就代表存在」。
   * 全站扫描断言在 `tests/label-option-scan.test.mjs`，这里核对它在页面上真的做到了。
   */
  await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('input[aria-label="显示连接类型面板"], input[aria-label="显示关系可视化条款面板"]')];
    boxes.forEach((box) => { if (!box.checked) box.click(); });
  });
  await page.waitForTimeout(500);
  const legend = await page.evaluate(() => {
    const familyRows = [...document.querySelectorAll('.floating-panel[aria-label="连接类型"] .family-list li')]
      .map((li) => li.textContent.replace(/\s+/g, ' ').trim());
    const specPanel = document.querySelector('.floating-panel[aria-label="关系可视化条款"]');
    const modeRows = [...(specPanel?.querySelectorAll('.mode-kinds li') ?? [])].map((li) => li.textContent.replace(/\s+/g, ' ').trim());
    return { familyRows, modeRows, specFound: Boolean(specPanel) };
  });
  check('连接类型面板：七类边源全列出，且每行都带计数（0 也写出来）',
    legend.familyRows.length === 7 && legend.familyRows.every((row) => /\d/.test(row)),
    JSON.stringify(legend.familyRows.slice(0, 3)));
  check('契约 mode 条款：每档都带权重与当前视图条数',
    legend.specFound && legend.modeRows.length >= 5 && legend.modeRows.every((row) => /当前视图 \d+ 条边/.test(row)),
    JSON.stringify({ specFound: legend.specFound, rows: legend.modeRows.slice(0, 2) }));

  // ---- 数学对象列表页：构造与角色下拉 ----
  await page.goto(server.origin + '/nodes', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const listFacets = await page.evaluate(() => {
    // 按 label 文本定位，别按下标：下拉顺序变了（案例 / 学科 / 构造类型 / 角色 / 排序）就会取错。
    const byLabel = (text) => {
      const label = [...document.querySelectorAll('.filters label')]
        .find((item) => item.textContent?.trim().startsWith(text));
      return label?.querySelector('select') ?? null;
    };
    const toOptions = (select) => select ? [...select.options].map((option) => ({ value: option.value, label: option.textContent ?? '' })) : [];
    return { construct: toOptions(byLabel('构造类型')), role: toOptions(byLabel('角色')) };
  });
  const deadLabels = [...listFacets.construct, ...listFacets.role]
    .filter((item) => /（0）/.test(item.label) || ['Definition', 'Term', 'Representation'].includes(item.value))
    .map((item) => item.label);
  check('列表页：构造 / 角色下拉里没有死选项', deadLabels.length === 0 && listFacets.construct.length > 1 && listFacets.role.length > 1,
    JSON.stringify({ dead: deadLabels, constructs: listFacets.construct.length, roles: listFacets.role.length }));

  // 案例下拉同样只列真有的（本体 8 个案例都有节点；这里防的是「模板声明了新案例但没数据」）。
  const caseOptions = await page.evaluate(() => {
    const label = [...document.querySelectorAll('.filters label')].find((item) => item.textContent?.trim().startsWith('案例'));
    const select = label?.querySelector('select');
    return select ? [...select.options].map((option) => ({ value: option.value, label: option.textContent ?? '' })) : [];
  });
  const deadCases = [];
  for (const option of caseOptions.filter((item) => item.value !== '全部')) {
    await page.goto(server.origin + `/nodes?case=${encodeURIComponent(option.value)}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    // 注意比的是**计数行**而不是屏幕上的卡片数：超过一页（60 张）时卡片数会少于总数。
    const state = await page.evaluate(() => ({
      cards: document.querySelectorAll('.node-card').length,
      count: document.querySelector('.result-count')?.textContent ?? '',
    }));
    const claimed = Number((option.label.match(/（(\d+)）/) ?? [])[1] ?? -1);
    const shown = Number((state.count.match(/符合当前条件 (\d+) 个/) ?? [])[1] ?? -1);
    if (state.cards === 0 || claimed !== shown) deadCases.push(`${option.label} → 卡片 ${state.cards}，计数行 ${state.count.trim()}`);
  }
  check('列表页：案例选项都能筛出东西且计数一致', deadCases.length === 0, JSON.stringify(deadCases));

  const listAbsent = await page.locator('.nodes-page .facet-absent').innerText().catch(() => '');
  check('列表页：空类别如实说明', listAbsent.includes('定义') && listAbsent.includes('不放进筛选'), listAbsent.replace(/\s+/g, ' ').slice(0, 120));

  // 每个选项都要真筛出东西，且数量与标注一致。
  const listMismatch = [];
  for (const option of listFacets.construct.filter((item) => item.value !== '全部')) {
    await page.goto(server.origin + `/nodes?construct=${encodeURIComponent(option.value)}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const state = await page.evaluate(() => ({
      cards: document.querySelectorAll('.node-card').length,
      count: document.querySelector('.result-count')?.textContent ?? '',
    }));
    const claimed = Number((option.label.match(/（(\d+)）/) ?? [])[1] ?? -1);
    if (state.cards === 0) listMismatch.push(`${option.label} → 0 张卡`);
    else if (claimed !== Number((state.count.match(/符合当前条件 (\d+) 个/) ?? [])[1] ?? -1)) {
      listMismatch.push(`${option.label} 标称 ${claimed}，页面 ${state.count.trim()}`);
    }
  }
  check('列表页：每个构造选项都能筛出东西且计数一致', listMismatch.length === 0, JSON.stringify(listMismatch));

  // 列表页搜「类比」同样给出去处。
  await page.goto(server.origin + '/nodes?q=' + encodeURIComponent('类比'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const listAnalogy = await page.evaluate(() => ({
    notice: document.querySelector('.nodes-page .notice')?.textContent ?? '',
    cards: document.querySelectorAll('.node-card').length,
  }));
  check('列表页：搜「类比」也给关系种类的去处',
    listAnalogy.cards === 0 && listAnalogy.notice.includes('关系种类') && listAnalogy.notice.includes('知识网络'),
    JSON.stringify(listAnalogy));

  check('两个页面都没有控制台错误', consoleErrors.length === 0, consoleErrors.join(' | '));
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n分面选项验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n分面选项验收通过。');
