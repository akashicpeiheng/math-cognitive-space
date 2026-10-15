import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { startTestServer } from './helpers.mjs';
import { PLAYWRIGHT_SPECIFIER, CHROME_PATH } from './browser-runtime.mjs';
const server = await startTestServer(); let browser;
try {
  const { chromium } = await import(PLAYWRIGHT_SPECIFIER);
  browser = await chromium.launch({ executablePath: CHROME_PATH ?? undefined, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 950 }, reducedMotion: 'reduce' })).newPage();
  page.setDefaultTimeout(45000); const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(server.origin + '/network', { waitUntil: 'networkidle' });
  const keys = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const request = indexedDB.open('mcs-private-vaults-v1'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const notes = [], libraries = [];
    for (let lib = 0; lib < 2; lib++) {
      const files = [];
      for (let i = 0; i < 450; i++) {
        const text = `# 同名 ${i}\n\n库 ${lib} 的节点。\n\n## 数学意义\n\n已明确摘录的动机 ${i}。\n\n## 形式\n\n[[N${(i + 1) % 450}]]\n`;
        const bytes = new TextEncoder().encode(text), sha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
        const file = { id: `f${i}`, path: `N${i}.md`, title: `同名 ${i}`, kind: 'note', sha256: sha, size: bytes.length, mime: 'text/markdown', nodeIds: i === 0 ? ['top:space'] : [] };
        files.push(file); notes.push({ sha, blob: new Blob([bytes]) });
      }
      libraries.push({ id: `fixture-${lib}`, storage: 'browser', revision: 1, name: `Library ${lib}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), files });
    }
    await new Promise((resolve, reject) => { const tx = db.transaction(['vaults', 'chunks'], 'readwrite'); for (const vault of libraries) tx.objectStore('vaults').put(vault, vault.id); for (const note of notes) tx.objectStore('chunks').put(note.blob, [note.sha, 0]); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); db.close();
    return libraries.flatMap(v => v.files.map(f => `note:browser:${v.id}:${f.id}`));
  });
  const graph = (await (await fetch(server.origin + '/api/v2/ontology/graph')).json()).data;
  const ids = [...graph.nodes.slice(0, 100).map(n => n.id), ...keys];
  await page.addInitScript(() => { window.__longTasks = []; const observer = new PerformanceObserver(entries => { window.__longTasks.push(...entries.getEntries().map(e => Math.round(e.duration))); }); observer.observe({ type: 'longtask', buffered: false }); });
  const started = Date.now();
  await page.goto(server.origin + '/network#nodes=' + encodeURIComponent(ids.join(',')), { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(count => document.querySelectorAll('.network-node').length === count, ids.length);
  try { await page.waitForFunction(() => document.querySelectorAll('.network-edge[data-kind="noteReference"]').length >= 898); }
  catch (error) { console.log(await page.evaluate(() => ({ edges: document.querySelectorAll('.network-edge').length, notes: document.querySelectorAll('.network-edge[data-kind="noteReference"]').length, messages: [...document.querySelectorAll('[role="status"],.network-sources')].map(e => e.textContent) }))); throw error; }
  const layoutMs = Date.now() - started;
  const canvas = await page.locator('.network-canvas-full').boundingBox();
  await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  const zoomStart = Date.now(); await page.mouse.wheel(0, -600); await page.mouse.wheel(0, 600);
  await page.waitForFunction(() => document.querySelector('.network-node')?.dataset.nodeShape === 'dot'); const zoomMs = Date.now() - zoomStart;
  const hoverStart = Date.now(); await page.locator('.network-node[data-node-source="vault"]').first().focus(); await page.locator('.network-hover-info').waitFor();
  const hoverMs = Date.now() - hoverStart;
  assert.match(await page.locator('.network-hover-info').innerText(), /已明确摘录的动机/);
  await page.screenshot({ path: join(process.cwd(), 'tmp', 'network-mixed-preview.png') });
  await page.keyboard.press('Escape'); await page.waitForTimeout(800);
  const before = await page.locator('.network-node').evaluateAll(nodes => nodes.map(n => n.getAttribute('transform')));
  await page.evaluate(() => { window.__longTasks = []; });
  await page.waitForTimeout(1200);
  assert.deepEqual(await page.locator('.network-node').evaluateAll(nodes => nodes.map(n => n.getAttribute('transform'))), before, 'mixed graph stops moving after interaction');
  assert.deepEqual(errors, []);
  assert.ok(layoutMs < 30000, `mixed layout exceeded budget: ${layoutMs}ms`); assert.ok(hoverMs < 2500, `hover exceeded budget: ${hoverMs}ms`);
  const idleLongTasks = await page.evaluate(() => window.__longTasks.length);
  assert.equal(idleLongTasks, 0);
  const result = { nodes: ids.length, localLibraries: 2, notes: keys.length, layoutAndIndexMs: layoutMs, zoomMs, hoverMs, idleCoordinatesStable: true, idleLongTasks, checkedAt: new Date().toISOString() };
  writeFileSync(join(process.cwd(), 'tmp', 'network-mixed-perf.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser?.close(); await server.cleanup(); }
