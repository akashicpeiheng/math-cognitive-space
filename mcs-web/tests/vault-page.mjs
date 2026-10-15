import assert from 'node:assert/strict';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { startTestServer } from './helpers.mjs';
import { CHROME_PATH, PLAYWRIGHT_SPECIFIER } from './browser-runtime.mjs';
import { exerciseVaultPage } from './vault-page-flow.mjs';

const server = await startTestServer(); let browser;
try {
  const { chromium } = await import(PLAYWRIGHT_SPECIFIER);
  browser = await chromium.launch({ executablePath: CHROME_PATH ?? undefined, headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } }), page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  try { await exerciseVaultPage(page, server.origin, server.dir, { upload: true }); }
  catch (e) { console.error(page.url(), await page.locator('main').first().innerText()); throw e; }
  const screenshots = join('runtime', 'vault-qa'); mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: join(screenshots, 'desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: join(screenshots, 'mobile.png'), fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'mobile layout does not overflow');
  await page.goto(server.origin + '/en/library', { waitUntil: 'networkidle' });
  assert.ok(await page.getByRole('heading', { name: 'My note libraries', exact: true }).count());
  assert.ok(await page.getByRole('button', { name: 'Choose Obsidian vault', exact: true }).count());
  assert.deepEqual(errors, []);
  console.log('✓ browser folder import, formulas, media, backlinks, cycles, node links, refresh history, upload, mobile and English');
} finally { await browser?.close(); await server.cleanup(); }
