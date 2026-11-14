import assert from 'node:assert/strict';
import { startTestServer } from './helpers.mjs';
import { CHROME_PATH, PLAYWRIGHT_SPECIFIER } from './browser-runtime.mjs';

const app = await startTestServer({ lean: { enabled: false } });
const { chromium } = await import(PLAYWRIGHT_SPECIFIER);
const browser = await chromium.launch({ executablePath: CHROME_PATH ?? undefined, headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${app.origin}/mcs?view=objects&object=${encodeURIComponent('obj:tdg:derivative')}`);
  await page.locator('[data-mcs-canvas]').waitFor();
  await page.waitForFunction(() => document.querySelector('.mcs-inspector')?.textContent.includes('导数'));
  const search = page.getByRole('searchbox', { name: '搜索对象与公式' });
  await search.fill('obj:group:left-mul');
  await page.locator('.mcs-search-results button').first().click();
  await page.locator('.mcs-inspector').getByRole('button', { name: '聚焦对象', exact: true }).click();
  await page.locator('[data-mcs-box="obj:group:left-mul#definition"]').waitFor();
  await page.locator('.mcs-inspector').getByRole('link', { name: '完整对象与证据 ↗' }).click();
  await page.getByRole('link', { name: '← 返回 MCS 视图' }).click();
  await page.locator('[data-mcs-canvas]').waitFor();
  await page.locator('[data-mcs-box="obj:group:left-mul#definition"]').waitFor();
  assert.equal(new URL(page.url()).searchParams.get('view'), 'objects');
  await page.locator('.mcs-inspector h2').filter({ hasText: '左乘映射' }).waitFor();
  await page.getByRole('button', { name: '分享视图', exact: true }).click();
  const link = await page.getByRole('textbox', { name: '公共视图链接' }).inputValue();
  assert(new URL(link).hash.startsWith('#mcs='));
  assert.deepEqual(errors, []);
  console.log('MCS published-library workspace: object selection, search, focus, reading return and sharing passed');
} finally { await browser.close(); await app.cleanup(); }
