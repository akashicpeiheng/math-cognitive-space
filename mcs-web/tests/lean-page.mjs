import assert from 'node:assert/strict';
import { startTestServer } from './helpers.mjs';
import { leanCapabilities } from '../core/lean.mjs';
import { REPO_ROOT } from '../core/ontology.mjs';
import { TEST_LEAN_TIMEOUT_MS } from './lean-test-budget.mjs';
import { PLAYWRIGHT_SPECIFIER, CHROME_PATH } from './browser-runtime.mjs';

const ready = await leanCapabilities(REPO_ROOT);
if (process.env.MCS_WEB_REQUIRE_LEAN === '1') assert.equal(ready.ready, true, ready.reason);
const server = await startTestServer(); let browser;
try {
  const { chromium } = await import(PLAYWRIGHT_SPECIFIER);
  browser = await chromium.launch({ executablePath: CHROME_PATH ?? undefined, headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 } }); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const before = await server.db.dumpAll(); const version = server.getOntology().version;
  for (const locale of ['zh', 'en']) {
    const prefix = locale === 'en' ? '/en' : '';
    await page.goto(`${server.origin}${prefix}/nodes/${encodeURIComponent('group:claim-injective')}`, { waitUntil: 'networkidle' });
    const card = page.locator('[data-lean-registration="lean-group-injective"]'); await card.waitFor();
    assert.match(await card.innerText(), locale === 'en' ? /Awaiting human review/ : /待人工复核/);
    await card.getByText(locale === 'en' ? 'Prose–Lean correspondence (Chinese source)' : '原文与 Lean 的逐项对照', { exact: true }).click();
    assert.ok(await card.locator('.lean-correspondence table').isVisible());
    await card.getByText(locale === 'en' ? 'Lean source and versions' : '查看 Lean 源码与版本', { exact: true }).click();
    await card.getByText('MCS/Expected.lean', { exact: true }).click();
    assert.ok(await card.locator('pre', { hasText: 'def rightUnitInjective' }).isVisible());
    if (ready.ready) {
      const submitted = page.waitForResponse(response => response.url().includes('/api/v2/lean/jobs') && response.request().method() === 'POST');
      await card.getByRole('button', { name: locale === 'en' ? 'Check again' : '重新检验', exact: true }).click();
      const response = await submitted; assert.equal(response.status(), 200); const id = (await response.json()).data.id;
      await page.waitForFunction(({ locale, id }) => {
        const status = document.querySelector('[data-lean-registration="lean-group-injective"] .lean-job-status');
        return status?.getAttribute('data-lean-job-id') === id && status.textContent?.includes(locale === 'en' ? 'Check finished' : '检查结束');
      }, { locale, id }, { timeout: TEST_LEAN_TIMEOUT_MS + 10000 });
      assert.match(await card.locator('.lean-job-status').innerText(), locale === 'en' ? /Passed/ : /通过/);
      const download = page.waitForEvent('download');
      await card.getByRole('button', { name: locale === 'en' ? 'Download report · This check' : '下载报告 · 本次检查', exact: true }).click();
      assert.ok((await download).suggestedFilename().endsWith('.json'));
    } else console.log('真实重放未执行：' + ready.reason);
    await page.goto(`${server.origin}${prefix}/research`, { waitUntil: 'networkidle' });
    await page.locator('[data-lean-registration="lean-closure-8-8"]').waitFor();
    assert.equal(await page.locator('[data-lean-registration]').count(), 2);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Lean cards overflow on mobile');
    await page.setViewportSize({ width: 1280, height: 960 });
  }
  const after = await server.db.dumpAll();
  for (const key of ['profiles', 'events', 'notes', 'networkViews', 'directions', 'learningPlans', 'connectionNotes']) assert.deepEqual(after[key], before[key], key);
  assert.equal(server.getOntology().version, version); assert.deepEqual(errors, []);
  console.log('Lean 中英双语节点/研究页、报告下载、窄屏与 M/E 非干扰通过。');
} finally { await browser?.close(); await server.cleanup(); }

await import('./lean-cancel-page.mjs');
