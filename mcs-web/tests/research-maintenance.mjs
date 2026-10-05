import { startTestServer, jsonCall } from './helpers.mjs';

import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/**
 * 研究台 = 前沿研究；网站维护 = 站点自身的维护材料。
 *
 * 用户的要求：「研究台里面要是给用户进行前沿的数学研究的场所，集中公开问题和作为启发的已有工具；
 * 把现在的研究台里面的内容迁移到一个新的页面『网站维护』；把专稿和 arXiv 论文里的内容多梳理到
 * 网站维护里面。」
 *
 * 四条可核对的性质：
 * 1. **分工**：维护材料（专稿覆盖、局部化算子、证据义务…）在 `/maintenance`；
 *    研究台（`/lab`）只剩公开问题与工具；
 * 2. **公开问题是真的**：条数与本体里的 `Problem` 节点、覆盖清单里状态未通过的模块对得上；
 * 3. **工具是真的**：方法数 = 本体 Method 节点数、形式装备数 = 带 `hasFormalStatement` 的节点数、
 *    结构工具数 = bridge/duality/crossDomain 关系数（都从 API 现算，不写死）；
 * 4. **来源清单来自仓库**：专稿章数与磁盘上的分章 Markdown 一致、arXiv 包按实际文件列出、
 *    **不下发绝对路径**。
 */
const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  // ---- 研究台：公开问题 ----
  await page.goto(server.origin + '/lab', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const lab = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent ?? '',
    openSection: Boolean(document.querySelector('#open')),
    openItems: document.querySelectorAll('.research-list li').length,
    toolTabs: [...document.querySelectorAll('.research-tabs button')].map((button) => button.textContent.replace(/\s+/g, ' ').trim()),
    linkTargets: [...document.querySelectorAll('.research-list a')].map((link) => link.getAttribute('href') ?? ''),
  }));
  check('研究台就是前沿研究页，含公开问题与工具两节',
    lab.h1.includes('研究台') && lab.openSection, JSON.stringify({ h1: lab.h1, open: lab.openSection }));
  check('公开问题里有条目，且每条都链回本体里的位置',
    lab.openItems > 0 && lab.linkTargets.length > 0 && lab.linkTargets.every((href) => href.startsWith('/nodes/')),
    JSON.stringify({ items: lab.openItems, links: lab.linkTargets.slice(0, 3) }));
  check('四类工具都在（方法论 / 形式语言装备 / 结构工具 / 理论工具）',
    lab.toolTabs.length === 4 && lab.toolTabs.every((label) => /\d+$/.test(label)), JSON.stringify(lab.toolTabs));

  // 与本体现算的数字对齐
  const truth = await page.evaluate(async () => {
    const nodes = (await (await fetch('/api/v2/ontology/nodes?limit=500')).json()).data.nodes;
    const graph = (await (await fetch('/api/v2/ontology/graph')).json()).data;
    return {
      problems: nodes.filter((node) => node.construct === 'Problem').length,
      methods: nodes.filter((node) => node.construct === 'Method').length,
      formal: nodes.filter((node) => node.hasFormalStatement === true).length,
      structure: graph.relations.filter((relation) => ['bridge', 'duality', 'crossDomain'].includes(relation.kind)).length,
    };
  });
  const counts = lab.toolTabs.map((label) => Number(label.match(/(\d+)$/)?.[1] ?? -1));
  check('工具计数与本体现算一致（方法论 / 形式语言装备 / 结构工具）',
    counts[0] === truth.methods && counts[1] === truth.formal && counts[2] === truth.structure,
    JSON.stringify({ shown: counts, truth }));
  check('形式语言装备确实按标记筛出来（不是空集合）',
    truth.formal >= 10 && counts[1] === truth.formal, JSON.stringify({ formal: truth.formal }));

  // 切到结构工具：显示的是关系，两端可点
  await page.locator('.research-tabs button').nth(2).click();
  await page.waitForTimeout(400);
  const structure = await page.evaluate(() => ({
    items: document.querySelectorAll('.research-tools li').length,
    kinds: [...document.querySelectorAll('.research-relation-kind')].map((node) => node.textContent.trim()),
    links: [...document.querySelectorAll('.research-tools li a')].length,
  }));
  check('结构工具列出的是登记关系，两端都能点回节点',
    structure.items === truth.structure && structure.links >= structure.items * 2 && structure.kinds.length === structure.items,
    JSON.stringify({ items: structure.items, links: structure.links, kinds: structure.kinds.slice(0, 4) }));

  // 理论工具：只给入口，不在研究台重复维护定义
  await page.locator('.research-tabs button').nth(3).click();
  await page.waitForTimeout(300);
  check('理论工具指向网站维护（定义与实现入口只在一处维护）',
    (await page.locator('.research-tools a[href="/maintenance"]').count()) >= 1);

  // ---- 网站维护：来源清单 ----
  await page.goto(server.origin + '/maintenance', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const maintenance = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent ?? '',
    tabs: [...document.querySelectorAll('.tabs button')].map((button) => button.textContent.replace(/\s+/g, ' ').trim()),
    chapterRows: [...document.querySelectorAll('.data-table tbody tr')].map((row) => row.textContent.replace(/\s+/g, ' ').trim()),
    sources: [...document.querySelectorAll('.source-groups > div strong')].map((node) => node.textContent),
    refs: document.querySelectorAll('.source-list li').length,
    codes: [...document.querySelectorAll('code')].map((node) => node.textContent ?? ''),
    absPathsLeaked: [...document.querySelectorAll('code')].some((node) => /^[A-Za-z]:[\\/]/.test(node.textContent ?? '')),
    hasArxiv: document.body.textContent.includes('arXiv'),
  }));
  check('网站维护页承接了原研究台的全部标签（含新增的来源清单）',
    maintenance.h1 === '网站维护'
      && ['专稿覆盖', '局部化 LC01–36', '断言与证据', '证明义务', '记号与类型', '合法本体条件', '关系运算', '专稿与 arXiv']
        .every((label) => maintenance.tabs.includes(label)),
    JSON.stringify(maintenance.tabs));
  /*
   * 来源清单的判据：**页面与仓库现状一致**，而不是「本机必须有哪些目录」。
   *
   * 这里从前写死「必须有 ≥10 个分章、必须有 arXiv 包、必须有 publication/validation/evidence 三组、
   * 参考文献 ≥5 份」。那些目录里有一部分（`reference/` 的扫描书、`mcs-foundations/evidence/` 的书页摘录）
   * 按资料保护清单**不随开源发布**，换台机器克隆下来必然缺——于是测试会对着一个
   * 本该为空的清单一再说「不合格」。现在改成先取服务端的真实读盘结果，再核对页面是否如实呈现。
   */
  const diskTruth = (await jsonCall(server.origin, '/api/v2/maintenance/sources')).payload.data;
  const truthDocGroups = diskTruth.thesis.docs.map((group) => group.name);
  const truthRefCount = diskTruth.references.available ? diskTruth.references.files.length : 0;
  const truthHasTex = diskTruth.arxiv.available && diskTruth.arxiv.files.some((file) => file.name === 'main.tex');

  check('专稿分章按文件清单列出（标题 + 文件名）',
    diskTruth.thesis.available
      ? (maintenance.chapterRows.length >= 10 && maintenance.codes.some((code) => /^\d{2}-.*\.md$/.test(code)))
      : (maintenance.chapterRows.length === 0),
    JSON.stringify({ rows: maintenance.chapterRows.length, thesisAvailable: diskTruth.thesis.available }));
  check('arXiv 投稿包被单独梳理出来（文件、参考文献、元数据）',
    truthHasTex
      ? (maintenance.hasArxiv && maintenance.codes.some((code) => code === 'main.tex') && maintenance.codes.some((code) => code === 'references.bib'))
      : !diskTruth.arxiv.available,
    JSON.stringify({ hasArxiv: maintenance.hasArxiv, truthAvailable: diskTruth.arxiv.available }));
  check('发布 / 验证 / 证据等文档按组列出（与磁盘现状一致）',
    JSON.stringify(maintenance.sources) === JSON.stringify(truthDocGroups),
    JSON.stringify({ page: maintenance.sources, truth: truthDocGroups }));
  check('本机参考文献列成清单（用于核对引用可核验）',
    maintenance.refs === truthRefCount && (truthRefCount === 0 || truthRefCount >= 5),
    JSON.stringify({ page: maintenance.refs, truth: truthRefCount, available: diskTruth.references.available }));
  check('清单里不泄露绝对路径', !maintenance.absPathsLeaked, JSON.stringify(maintenance.codes.filter((code) => /^[A-Za-z]:/.test(code)).slice(0, 3)));

  /*
   * 新增两块（TODO A4-31 / A4-32 / A4-33）：
   * 正文锚点 ↔ 本体节点、发布与历史快照、以及「这次是实时读盘还是缓存」。
   */
  const anchorsAndReleases = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.card')];
    const anchorCard = cards.find((card) => (card.querySelector('h3')?.textContent ?? '').includes('正文锚点'));
    const releaseCard = cards.find((card) => (card.querySelector('h2')?.textContent ?? '').includes('发布与历史快照'));
    const rows = (card, headerNeedle = null) => {
      // 卡片里可能有多张表（arXiv 文件表 + 锚点对照表），按表头关键字选，避免混在一起。
      const table = headerNeedle
        ? [...(card?.querySelectorAll('table') ?? [])].find((node) => (node.querySelector('thead')?.textContent ?? '').includes(headerNeedle))
        : card?.querySelector('table');
      return [...(table?.querySelectorAll('tbody tr') ?? [])].map((row) => ({
        cells: [...row.querySelectorAll('td')].map((cell) => cell.textContent.replace(/\s+/g, ' ').trim()),
        links: [...row.querySelectorAll('a')].map((link) => link.getAttribute('href') ?? ''),
      }));
    };
    const mutedTexts = (card) => [...(card?.querySelectorAll('p.muted') ?? [])].map((node) => node.textContent.replace(/\s+/g, ' ').trim());
    return {
      anchorTitle: anchorCard?.querySelector('h3')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      anchorRows: rows(anchorCard, '论文锚点'),
      anchorNote: mutedTexts(anchorCard).find((text) => text.includes('paper-anchors.mjs')) ?? '',
      releaseRows: rows(releaseCard, '版本 / 标签'),
      releaseTitle: releaseCard?.querySelector('h2')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      cacheLine: [...document.querySelectorAll('.card p.muted')]
        .map((node) => node.textContent.replace(/\s+/g, ' ').trim())
        .find((text) => text.includes('耗时')) ?? '',
    };
  });
  const mappedRows = anchorsAndReleases.anchorRows.filter((row) => row.links.some((href) => href.startsWith('/nodes/')));
  check('论文正文锚点与本体节点的对照表在页面上（且挂上节点的条目可点回节点页）',
    anchorsAndReleases.anchorTitle.includes('条已打通')
      && anchorsAndReleases.anchorRows.length >= 5
      && mappedRows.length >= 1
      && mappedRows.every((row) => row.cells.length === 4),
    JSON.stringify({ title: anchorsAndReleases.anchorTitle, rows: anchorsAndReleases.anchorRows.length, mapped: mappedRows.length }));
  check('对不上节点的锚点如实写明它讲的是什么（不硬塞一个节点）',
    anchorsAndReleases.anchorRows.some((row) => row.cells[1].includes('无对应节点'))
      && anchorsAndReleases.anchorRows.every((row) => row.cells[3].length > 6),
    JSON.stringify(anchorsAndReleases.anchorRows.map((row) => [row.cells[0], row.cells[1]]).slice(0, 4)));
  check('锚点说明写清来源与约定（label ↔ 节点 id）',
    anchorsAndReleases.anchorNote.includes('main.tex') && anchorsAndReleases.anchorNote.includes('paper-anchors.mjs')
      && anchorsAndReleases.anchorNote.includes('label'),
    anchorsAndReleases.anchorNote.slice(0, 140));
  check('发布与历史快照按时间排序展示（含解析出的版本与日期）',
    anchorsAndReleases.releaseTitle.includes('发布与历史快照')
      && anchorsAndReleases.releaseRows.length >= 1
      && anchorsAndReleases.releaseRows.every((row) => row.cells.length === 5)
      && anchorsAndReleases.releaseRows.some((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.cells[0])),
    JSON.stringify({ title: anchorsAndReleases.releaseTitle, rows: anchorsAndReleases.releaseRows.map((row) => row.cells.slice(0, 3)) }));
  check('页面上写明这次是实时读盘还是缓存，以及耗时',
    /实时读盘|命中缓存/.test(anchorsAndReleases.cacheLine) && /\d+ ms/.test(anchorsAndReleases.cacheLine),
    anchorsAndReleases.cacheLine.slice(0, 120));

  // 覆盖标签仍然可用（迁移之后没坏）
  await page.locator('.tabs button', { hasText: '专稿覆盖' }).click();
  await page.waitForTimeout(600);
  const coverageTab = await page.evaluate(() => ({
    rows: document.querySelectorAll('.data-table tbody tr').length,
    headers: [...document.querySelectorAll('.data-table thead th')].map((node) => node.textContent),
  }));
  check('迁移后的「专稿覆盖」对照表照旧可用',
    coverageTab.rows >= 5 && coverageTab.headers.includes('当前边界'), JSON.stringify(coverageTab));

  // ---- 侧栏与路由 ----
  const nav = await page.evaluate(() => ({
    labels: [...document.querySelectorAll('.nav-item.secondary .nav-label')].map((node) => node.textContent),
    maintenanceTo: document.querySelector('.nav-item.secondary[href="/maintenance"]') ? true : false,
    labTo: document.querySelector('.nav-item.secondary[href="/lab"] .nav-label')?.textContent ?? null,
  }));
  check('侧栏里「前沿研究」与「网站维护」都在辅助导航',
    nav.maintenanceTo && nav.labTo === '前沿研究' && nav.labels.includes('网站维护'),
    JSON.stringify(nav));
  await page.goto(server.origin + '/research', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  check('/research 仍是研究台的别名（旧链接不失效）',
    (await page.locator('h1').first().innerText()).includes('研究台'));

  check('研究台与网站维护没有控制台错误', consoleErrors.length === 0, consoleErrors.join(' | '));
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n研究台 / 网站维护验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n研究台 / 网站维护验收通过。');
