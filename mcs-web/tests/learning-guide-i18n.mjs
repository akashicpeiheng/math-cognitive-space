import assert from 'node:assert/strict';
import { startTestServer } from './helpers.mjs';
import { PLAYWRIGHT_SPECIFIER, CHROME_PATH } from './browser-runtime.mjs';

const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT_SPECIFIER);
  browser = await chromium.launch({ executablePath: CHROME_PATH ?? undefined, headless: true });
  const page = await browser.newPage();
  await page.goto(server.origin + '/en/start', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'I already have a learning goal', exact: true }).click();
  await page.getByRole('searchbox').fill('dg:');
  assert.equal(await page.locator('.learning-goal-card').count(), 8);
  assert.equal(await page.getByRole('link', { name: 'View all results', exact: true }).count(), 1);
  const fallback = await page.evaluate(async () => {
    const graph = await fetch('/api/v2/ontology/graph?locale=en').then(response => response.json());
    return graph.data.nodes.find(node => node.granularity !== 'topic' && /[\u3400-\u9fff]/.test(node.title))?.id;
  });
  assert.ok(fallback);
  await page.getByRole('searchbox').fill(fallback);
  assert.ok(await page.locator('.learning-goal-card .i18n-pending').count() > 0);
  await page.locator('.learning-goal-card button').first().click();
  await page.waitForSelector('.learning-plan-card .i18n-pending');
  await page.waitForFunction(() => !document.querySelector('.learning-plan-card')?.textContent.includes('Checking dependencies'));
  const unmarked = await page.locator('.learning-guide').evaluate(guide => [...guide.querySelectorAll('*')].filter(element =>
    element.getClientRects().length && !element.closest('.i18n-pending')
    && [...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && /[\u3400-\u9fff]/.test(node.textContent ?? '')),
  ).map(element => element.textContent?.slice(0, 100)));
  assert.deepEqual(unmarked, []);
  console.log('  ✓ 搜索截断有完整结果入口；未译标题、背景和依赖在英文引导中明确标注');
} finally { if (browser) await browser.close(); await server.cleanup(); }
