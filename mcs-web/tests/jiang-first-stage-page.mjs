import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { startTestServer } from './helpers.mjs';
import { PLAYWRIGHT_SPECIFIER, CHROME_PATH } from './browser-runtime.mjs';

const server = await startTestServer();
const artifacts = resolve('tmp/jiang-first-stage-qa');
mkdirSync(artifacts, { recursive: true });
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT_SPECIFIER);
  browser = await chromium.launch({ executablePath: CHROME_PATH ?? undefined, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const results = [];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const slug of ['field-axioms', 'elementary-row-operations', 'linear-substitution', 'solution-cases', 'method-elimination']) {
      await page.goto(`${server.origin}/nodes/jiang:${slug}`, { waitUntil: 'networkidle' });
      await page.locator('#node-reading').waitFor();
      const metrics = await page.evaluate(() => ({
        mathErrors: [...document.querySelectorAll('.katex-error')].map((e) => e.textContent),
        formulas: document.querySelectorAll('#node-reading .katex').length,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        readingBeforeFormal: !document.getElementById('node-formal-statement') || Boolean(document.getElementById('node-reading').compareDocumentPosition(document.getElementById('node-formal-statement')) & Node.DOCUMENT_POSITION_FOLLOWING),
        links: [...document.querySelectorAll('#node-reading a[href^="/nodes/"]')].map((a) => a.getAttribute('href')),
      }));
      assert.deepEqual(metrics.mathErrors, [], `${width}/${slug} 公式渲染失败`);
      assert.ok(metrics.formulas > 10, `${slug} 正文公式没有渲染`);
      assert.equal(metrics.overflow, false, `${width}/${slug} 页面横向溢出`);
      assert.equal(metrics.readingBeforeFormal, true, `${width}/${slug} 入门例子应先于独立形式摘要`);
      assert.ok(metrics.links.every((href) => href.startsWith('/nodes/jiang:')));
      await page.locator('#node-reading').evaluate((element) => element.scrollIntoView({ block: 'start' }));
      await page.evaluate(() => window.scrollBy(0, -125));
      if (['field-axioms', 'solution-cases'].includes(slug)) {
        await page.screenshot({ path: resolve(artifacts, `${slug}-${width}.png`) });
      }
      results.push({ width, slug, ...metrics });
    }
  }
  await page.goto(`${server.origin}/nodes/jiang:field-axioms`, { waitUntil: 'networkidle' });
  await page.locator('#node-reading').getByRole('link', { name: '初等行变换', exact: true }).click();
  await page.waitForURL(/\/nodes\/jiang:elementary-row-operations$/);
  await page.locator('#node-reading').getByRole('link', { name: '解的情况', exact: true }).click();
  await page.waitForURL(/\/nodes\/jiang:solution-cases$/);
  await page.locator('#node-reading').getByRole('link', { name: '矩阵的基本运算', exact: true }).click();
  await page.waitForURL(/\/nodes\/jiang:matrix-operations$/);
  await page.goto(`${server.origin}/nodes/group:group-concept`, { waitUntil: 'networkidle' });
  assert.ok(await page.evaluate(() => Boolean(document.getElementById('node-formal-statement').compareDocumentPosition(document.getElementById('node-reading')) & Node.DOCUMENT_POSITION_FOLLOWING)), '没有选择先读正文的节点保持原有顺序');
  await page.goto(`${server.origin}/en/nodes/jiang:field-axioms`, { waitUntil: 'networkidle' });
  assert.ok(await page.evaluate(() => Boolean(document.getElementById('node-reading').compareDocumentPosition(document.getElementById('node-formal-statement')) & Node.DOCUMENT_POSITION_FOLLOWING)), '英文回退也应保留入门阅读顺序');
  assert.deepEqual(pageErrors, []);
  writeFileSync(resolve(artifacts, 'browser-report.json'), JSON.stringify({ results, pageErrors, linksFollowed: 3 }, null, 2));
  console.log('第一程浏览器通过：桌面/390px 五节点、全部公式、页面宽度、阅读链接与第二程入口。');
} finally {
  await browser?.close();
  await server.cleanup();
}
