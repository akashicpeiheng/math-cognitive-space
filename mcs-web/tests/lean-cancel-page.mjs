import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { startTestServer } from './helpers.mjs';
import { leanCapabilities } from '../core/lean.mjs';
import { REPO_ROOT } from '../core/ontology.mjs';
import { PLAYWRIGHT_SPECIFIER, CHROME_PATH } from './browser-runtime.mjs';

const capabilities = await leanCapabilities(REPO_ROOT);
if (process.env.MCS_WEB_REQUIRE_LEAN === '1') assert.equal(capabilities.ready, true, capabilities.reason);
if (!capabilities.ready) console.log('Lean 取消浏览器未运行：' + capabilities.reason);
else {
  const app = await startTestServer(); let browser;
  try {
    const { chromium } = await import(PLAYWRIGHT_SPECIFIER);
    browser = await chromium.launch({ executablePath: CHROME_PATH ?? undefined, headless: true });
    const page = await browser.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    const before = await app.db.dumpAll(); const version = app.getOntology().version;
    for (const locale of ['zh', 'en']) {
      await page.goto(app.origin + (locale === 'en' ? '/en' : '') + '/nodes/' + encodeURIComponent('group:claim-injective'), { waitUntil: 'networkidle' });
      const card = page.locator('[data-lean-registration="lean-group-injective"]');
      const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v2/lean/jobs' && r.request().method() === 'POST');
      await card.getByRole('button', { name: locale === 'en' ? 'Check again' : '重新检验', exact: true }).click();
      const submitted = await response; assert.equal(submitted.status(), 200); const id = (await submitted.json()).data.id;
      await page.waitForFunction(({ id, locale }) => {
        const el = document.querySelector('[data-lean-registration="lean-group-injective"] .lean-job-status');
        return el?.getAttribute('data-lean-job-id') === id && el.textContent?.includes(locale === 'en' ? 'Building the proof' : '构建证明');
      }, { id, locale }, { timeout: 20000 });
      await card.getByRole('button', { name: locale === 'en' ? 'Cancel check' : '取消检查', exact: true }).click();
      await page.waitForFunction(({ id, locale }) => {
        const el = document.querySelector('[data-lean-registration="lean-group-injective"] .lean-job-status');
        return el?.getAttribute('data-lean-job-id') === id && el.textContent?.includes(locale === 'en' ? 'Cancelled' : '已取消');
      }, { id, locale }, { timeout: 20000 });
      await card.getByText(locale === 'en' ? 'Task diagnostics' : '任务诊断记录', { exact: true }).click();
      const downloaded = page.waitForEvent('download');
      await card.getByRole('button', { name: locale === 'en' ? 'Download report · This check' : '下载报告 · 本次检查', exact: true }).click();
      const file = await downloaded; const diagnostic = JSON.parse(await readFile(await file.path(), 'utf8'));
      assert.equal(diagnostic.id, id); assert.equal(diagnostic.status, 'cancelled'); assert.equal(diagnostic.result, null);
      assert.equal(diagnostic.error.reason, 'cancelled');
      assert.equal('owner' in diagnostic, false); assert.equal('snapshot' in diagnostic, false);
      assert.match(diagnostic.logSummarySha256, /^[a-f0-9]{64}$/);
    }
    const after = await app.db.dumpAll();
    for (const key of ['profiles', 'events', 'notes', 'networkViews', 'directions', 'learningPlans', 'connectionNotes']) assert.deepEqual(after[key], before[key], key);
    assert.equal(app.getOntology().version, version); assert.equal(app.leanJobs.stats().running, 0); assert.deepEqual(errors, []);
    console.log('Lean 中英浏览器实际取消、诊断下载与数据非干扰通过。');
  } finally { await browser?.close(); await app.cleanup(); }
}
