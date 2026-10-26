import assert from 'node:assert/strict';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { startTestServer, jsonCall, zoomToCardShape } from './helpers.mjs';
import { PLAYWRIGHT_SPECIFIER, CHROME_PATH } from './browser-runtime.mjs';
import { buildEdges, DEFAULT_FAMILIES, edgeFamilyLabel } from '../web/src/network.ts';
import { connectionKeyOf } from '../web/src/connection-display.ts';

const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT_SPECIFIER);
  browser = await chromium.launch({ executablePath: CHROME_PATH ?? undefined, headless: true });
  const context = await browser.newContext({ viewport: { width: 1450, height: 940 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const call = (path, options) => jsonCall(server.origin, '/api/v2' + path, options);
  const graph = (await call('/ontology/graph')).payload.data;
  const profiles = [];
  for (const name of ['备注档案一', '备注档案二']) profiles.push((await call('/profiles', { method: 'POST', body: { name } })).payload.data.profile.id);
  const relation = graph.relations.find(r => r.id === 'rel-manifold-generalization');
  const key = relation.connectionKey;
  const nodeIds = 'manifold:ck-atlas,dg:smooth-atlas,manifold:transition,group:group-concept,group:units5';
  const url = '/network?nodes=' + encodeURIComponent(nodeIds);
  // Avoid first-visit floating panels covering the line under test.
  await page.addInitScript(() => { localStorage.setItem('mcs-network-visited-v1', '1'); });
  await page.goto(server.origin + url, { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-edge-hit');
  await page.waitForTimeout(700);
  async function openMenu() {
    const point = await page.evaluate(() => {
      const path = [...document.querySelectorAll('.network-edge')].find(edge =>
        [edge.getAttribute('data-from'), edge.getAttribute('data-to')].sort().join('|') === ['manifold:ck-atlas', 'dg:smooth-atlas'].sort().join('|'));
      if (!path) throw new Error('atlas edge is missing');
      const hit = path.parentElement.querySelector('.network-edge-hit');
      // A third node can cross the middle of a short edge; inspect the exposed ends too.
      for (const fraction of [0.5, 0.3, 0.7, 0.2, 0.8, 0.4, 0.6, 0.1, 0.9, 0.05, 0.95]) {
        const local = path.getPointAtLength(path.getTotalLength() * fraction);
        const screen = new DOMPoint(local.x, local.y).matrixTransform(path.getScreenCTM());
        const top = document.elementFromPoint(screen.x, screen.y);
        if (top === hit || top === path || top?.classList.contains('network-edge-taper')) return { x: screen.x, y: screen.y };
      }
      throw new Error('no visible atlas edge hit point');
    });
    await page.mouse.click(point.x, point.y, { button: 'right' });
    await page.waitForSelector('.connection-menu');
  }
  await openMenu();
  assert.equal(await page.locator('.connection-menu section').count(), 2, 'shared readings and the separate forgetful relation');
  const target = '.connection-menu .connection-note[data-connection-key=' + JSON.stringify(key) + ']';
  await page.locator(target).getByRole('button', { name: '添加备注', exact: true }).click();
  const lead = '第一行：所有阶条件放宽为有限阶。\n第二行：仍是同一图册。\n第三行：个人的回看问题。';
  const body = lead + '长'.repeat(4000 - lead.length);
  await page.locator('.connection-note-dialog textarea').fill(body);
  await page.keyboard.press('ArrowDown');
  assert.ok(await page.locator('.connection-note-dialog textarea').evaluate(element => element === document.activeElement), 'menu shortcuts do not capture editor keys');
  await page.locator('.connection-note-dialog').getByRole('button', { name: '保存备注', exact: true }).click();
  await page.waitForSelector('.connection-note-dialog', { state: 'detached' });
  await page.keyboard.press('Escape');
  const canvasNote = '.network-note-summary[data-connection-key=' + JSON.stringify(key) + ']';
  await page.waitForSelector(canvasNote);
  assert.ok(await page.getByRole('button', { name: /我的备注 · 放缩/ }).count(), 'interactive canvas annotations remain in the accessibility tree');
  assert.equal(await page.locator(canvasNote).count(), 1, 'two readings share a single canvas note');
  assert.equal(await page.locator(canvasNote + ' span').evaluate(el => getComputedStyle(el).webkitLineClamp), '2');
  await page.locator(canvasNote).click();
  await page.waitForSelector('.connection-note-dialog .markdown');
  assert.ok((await page.locator('.connection-note-dialog').innerText()).includes('第三行：个人的回看问题。'));
  await page.keyboard.press('Escape');
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForSelector(canvasNote);
  for (const profile of profiles) {
    await page.locator('#profile-select').selectOption(profile);
    await page.waitForSelector(canvasNote);
    assert.ok((await page.locator(canvasNote).innerText()).includes('第一行'), 'learner profiles share the user note');
  }
  await call(`/profiles/${profiles[1]}/network-views`, { method: 'POST', body: { name: '备注的另一视图', payload: { added: ['dg:smooth-atlas', 'manifold:ck-atlas'], families: ['relation'], positions: {}, camera: null } } });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByLabel('显示保存的视图面板').check();
  await page.locator('.saved-view-list li').filter({ hasText: '备注的另一视图' }).getByRole('button', { name: '载入', exact: true }).click();
  await page.waitForSelector(canvasNote);
  assert.equal(await page.locator('.network-node').count(), 2);
  assert.ok((await page.locator(canvasNote).innerText()).includes('第一行'), 'a different saved view retains the same specific note');
  await page.getByLabel('显示保存的视图面板').uncheck();
  await page.locator(canvasNote).click();
  assert.equal((await page.locator('.connection-note-dialog .markdown').innerText()).length, 4000, 'long notes remain clickable at the two-node auto zoom');
  await page.keyboard.press('Escape');
  await page.goto(server.origin + url, { waitUntil: 'networkidle' }); await page.waitForSelector(canvasNote);
  const card = await page.locator('.network-node[data-node="manifold:ck-atlas"] rect').first().boundingBox();
  await page.mouse.move(card.x + 10, card.y + 10); await page.mouse.down();
  await page.mouse.move(card.x + 130, card.y + 65, { steps: 5 }); await page.mouse.up();
  await page.waitForTimeout(150);
  assert.ok(await page.locator(canvasNote).isVisible(), 'dragging an endpoint preserves its annotation');
  // A fresh browser context reads the same local-user data from the server.
  const second = await (await browser.newContext({ viewport: { width: 1450, height: 940 } })).newPage();
  await second.goto(server.origin + url, { waitUntil: 'networkidle' }); await second.waitForSelector(canvasNote);
  await second.close();
  // Existing line labels disappear below 85%, but personal notes retain readable screen size.
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: '缩小', exact: true }).click();
  await page.waitForTimeout(350);
  assert.ok(Number(await page.locator('.network-canvas-full').getAttribute('data-zoom')) < 0.85);
  assert.ok(await page.locator(canvasNote).isVisible());
  assert.ok((await page.locator(canvasNote).boundingBox()).width > 200);
  await page.goto(server.origin + '/nodes/' + encodeURIComponent('manifold:ck-atlas'), { waitUntil: 'networkidle' });
  const detailsNote = '.relation-list .connection-note[data-connection-key=' + JSON.stringify(key) + ']';
  await page.waitForSelector(detailsNote + ' summary');
  assert.ok((await page.locator(detailsNote).first().innerText()).includes('第一行'));
  await page.goto(server.origin + '/en' + url, { waitUntil: 'networkidle' }); await page.waitForSelector(canvasNote);
  assert.ok((await page.locator(canvasNote).innerText()).includes('My note'));
  assert.ok((await page.locator(canvasNote).innerText()).includes('第一行'));
  // Editing a stale revision retains the draft and exposes an explicit reload.
  await page.locator(canvasNote).click();
  await page.locator('.connection-note-dialog').getByRole('button', { name: 'Edit note', exact: true }).click();
  await page.locator('.connection-note-dialog textarea').fill('保留我的未保存输入');
  const old = (await call('/me/connection-notes')).payload.data.notes.find(note => note.key === key);
  await call('/me/connection-notes/' + encodeURIComponent(key), { method: 'PUT', body: { body: '其他页面的更新', baseRevision: old.revision } });
  await page.locator('.connection-note-dialog').getByRole('button', { name: 'Save note', exact: true }).click();
  await page.waitForSelector('.connection-note-dialog [role=alert]');
  assert.equal(await page.locator('.connection-note-dialog textarea').inputValue(), '保留我的未保存输入');
  await page.locator('.connection-note-dialog').getByRole('button', { name: 'Reload notes', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.connection-note-dialog details')?.textContent.includes('其他页面的更新'));
  await page.locator('.connection-note-dialog').getByRole('button', { name: 'Save note', exact: true }).click();
  await page.waitForSelector('.connection-note-dialog', { state: 'detached' });
  await page.locator(canvasNote).click();
  await page.locator('.connection-note-dialog').getByRole('button', { name: 'Edit note', exact: true }).click();
  await page.locator('.connection-note-dialog textarea').fill('保存失败也保留输入');
  let failOnce = true;
  await page.route('**/api/v2/me/connection-notes/*', async route => {
    if (route.request().method() !== 'PUT' || !failOnce) return route.continue();
    failOnce = false;
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, error: { code: 'SERVICE_UNAVAILABLE', message: '暂时不可用' } }) });
  });
  await page.locator('.connection-note-dialog').getByRole('button', { name: 'Save note', exact: true }).click();
  await page.waitForSelector('.connection-note-dialog [role=alert]');
  assert.equal(await page.locator('.connection-note-dialog textarea').inputValue(), '保存失败也保留输入');
  await page.locator('.connection-note-dialog').getByRole('button', { name: 'Save note', exact: true }).click();
  await page.waitForSelector('.connection-note-dialog', { state: 'detached' });
  await page.unroute('**/api/v2/me/connection-notes/*');
  await page.locator(canvasNote).click();
  await page.locator('.connection-note-dialog').getByRole('button', { name: 'Remove note', exact: true }).click();
  await page.waitForSelector(canvasNote, { state: 'detached' });
  await page.locator('.connection-note-undo').getByRole('button', { name: 'Undo', exact: true }).click();
  await page.waitForSelector(canvasNote);
  const otherKey = graph.relations.find(r => r.id === 'rel-manifold-forget').connectionKey;
  await call('/me/connection-notes/' + encodeURIComponent(otherKey), { method: 'PUT', body: { body: '合并线的另一份个人备注', baseRevision: 0 } });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForSelector('.network-note-summary[data-connection-key=' + JSON.stringify(otherKey) + ']');
  assert.equal(await page.locator('.network-note-summary').count(), 2, 'merged connections retain separate notes');
  await page.locator('.network-node[data-node="group:units5"] rect').first().click();
  assert.equal(await page.locator('.network-note-summary').count(), 2, 'selecting an unrelated node does not hide notes');
  // Keep a visual record using only the isolated test user's data.
  const out = join(import.meta.dirname, '..', 'tmp', 'connection-notes'); mkdirSync(out, { recursive: true });
  await page.screenshot({ path: join(out, 'network-en.png') });
  await page.goto(server.origin + '/research', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /结构工具/ }).click();
  await page.waitForSelector('.connection-note[data-connection-key=' + JSON.stringify(otherKey) + '] summary');
  assert.ok((await page.locator('.connection-note[data-connection-key=' + JSON.stringify(otherKey) + ']').innerText()).includes('合并线的另一份个人备注'));
  // Every connection family is editable through the same real pointer and keyboard entry points.
  const edges = buildEdges(graph, new Set(graph.nodes.map(node => node.id)), DEFAULT_FAMILIES);
  for (const family of DEFAULT_FAMILIES) {
    const edge = edges.find(candidate => candidate.source === family && candidate.from !== candidate.to);
    const familyKey = connectionKeyOf(edge);
    await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(edge.from + ',' + edge.to), { waitUntil: 'networkidle' });
    await page.getByLabel('显示连接类型面板').check();
    for (const name of DEFAULT_FAMILIES) {
      const checkbox = page.locator('.family-list li').filter({ has: page.getByText(edgeFamilyLabel(name), { exact: true }) }).locator('input');
      await checkbox.setChecked(name === family);
    }
    await page.getByLabel('显示连接类型面板').uncheck();
    await page.waitForTimeout(350);
    const selector = `.network-edge[data-source="${family}"]`;
    const point = await page.locator(selector).first().evaluate(path => {
      const local = path.getPointAtLength(path.getTotalLength() / 2);
      const screen = new DOMPoint(local.x, local.y).matrixTransform(path.getScreenCTM());
      return { x: screen.x, y: screen.y };
    });
    await page.mouse.click(point.x, point.y, { button: 'right' });
    const row = '.connection-menu .connection-note[data-connection-key=' + JSON.stringify(familyKey) + ']';
    await page.locator(row).getByRole('button', { name: '添加备注', exact: true }).click();
    await page.locator('.connection-note-dialog textarea').fill(`${family} 的个人备注`);
    await page.locator('.connection-note-dialog').getByRole('button', { name: '保存备注', exact: true }).click();
    await page.waitForSelector('.connection-note-dialog', { state: 'detached' });
    await page.keyboard.press('Escape');
    const summary = '.network-note-summary[data-connection-key=' + JSON.stringify(familyKey) + ']';
    await page.waitForSelector(summary);
    const hit = page.locator(selector).first().locator('..').locator('.network-edge-hit');
    await hit.focus(); await page.keyboard.press('Shift+F10');
    await page.locator(row).getByRole('button', { name: '编辑备注', exact: true }).click();
    await page.locator('.connection-note-dialog textarea').fill(`${family} 的修订备注`);
    await page.locator('.connection-note-dialog').getByRole('button', { name: '保存备注', exact: true }).click();
    await page.waitForSelector('.connection-note-dialog', { state: 'detached' });
    await page.keyboard.press('Escape');
    await hit.focus(); await page.keyboard.press('Enter');
    await page.locator(row).getByRole('button', { name: '取消备注', exact: true }).click();
    await page.waitForSelector(summary, { state: 'detached' });
    await page.locator('.connection-note-undo').getByRole('button', { name: '撤销', exact: true }).click();
    await page.waitForSelector(summary);
    assert.ok((await page.locator(summary).innerText()).includes(`${family} 的修订备注`));
    await page.keyboard.press('Escape');
  }
  const supportEdge = edges.find(edge => edge.source === 'support' && edge.from !== edge.to);
  const supportKey = connectionKeyOf(supportEdge);
  const supportSummary = '.network-note-summary[data-connection-key=' + JSON.stringify(supportKey) + ']';
  await page.locator(supportSummary).click();
  await page.locator('.connection-note-dialog').getByRole('button', { name: '取消备注', exact: true }).click();
  await page.waitForSelector(supportSummary, { state: 'detached' });
  await call('/me/connection-notes/' + encodeURIComponent(supportKey), { method: 'PUT', body: { body: '其他页面重新建立的备注', baseRevision: 0 } });
  await page.locator('.connection-note-undo').getByRole('button', { name: '撤销', exact: true }).click();
  await page.waitForSelector('.connection-note-undo [role=alert]');
  await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await page.waitForSelector(supportSummary);
  assert.ok((await page.locator(supportSummary).innerText()).includes('其他页面重新建立的备注'), 'stale undo cannot overwrite another page');
  await page.locator('.connection-note-undo').waitFor({ state: 'detached', timeout: 15_000 });
  // A routed arc uses exactly the same hit curve, including weak dashed lines.
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent('top:homeomorphism,top:topological-manifold,top:space,top:differentiable-manifold,dg:smooth-atlas,top:coordinate-chart,dg:tangent-bundle,dg:tangent-vector-curve,top:atlas,top:compactness,top:continuous-map,dg:metric-space'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  /*
   * 弧线只在方块档出现（2026-10-16 起方块 = 120% 以上，见 `network-workspace.ts` 的阈值表）：
   * 路由器把卡片矩形当障碍，圆点档下不画弧。这条用例要测的是「弧线的命中区跟着曲线走」，
   * 因此必须先放大到方块档，否则 `no exposed routed arc` 报的是「没有弧线」而不是命中区的问题。
   */
  assert.ok(await zoomToCardShape(page), 'zoomed to the card shape');
  const arcPoint = await page.evaluate(() => {
    for (const path of document.querySelectorAll('.network-edge.curved')) {
      const hit = path.parentElement.querySelector('.network-edge-hit');
      if (path.getAttribute('d') !== hit.getAttribute('d')) throw new Error('arc hit region does not follow the curve');
      for (const fraction of [.2, .4, .5, .6, .8]) {
        const local = path.getPointAtLength(path.getTotalLength() * fraction);
        const screen = new DOMPoint(local.x, local.y).matrixTransform(path.getScreenCTM());
        const top = document.elementFromPoint(screen.x, screen.y);
        if (top === hit || top === path) return { x: screen.x, y: screen.y };
      }
    }
    throw new Error('no exposed routed arc');
  });
  await page.mouse.click(arcPoint.x, arcPoint.y, { button: 'right' });
  await page.waitForSelector('.connection-menu');
  await page.mouse.click(300, 700); await page.waitForSelector('.connection-menu', { state: 'detached' });
  assert.deepEqual(errors, []);
  console.log('✓ all seven families: right-click, keyboard, arcs, merged notes, persistence, zoom, selection, language, conflict reload and undo');
} finally { if (browser) await browser.close(); await server.cleanup(); }
