import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { startTestServer, clickInAnimatedPage } from './helpers.mjs';
import { PLAYWRIGHT_SPECIFIER, CHROME_PATH } from './browser-runtime.mjs';
import { extractSignificance } from '../web/src/network-workspace.ts';
const server = await startTestServer(); let browser, page;
const pendingRequests = new Map();
try {
  const { chromium } = await import(PLAYWRIGHT_SPECIFIER);
  browser = await chromium.launch({ executablePath: CHROME_PATH ?? undefined, headless: true });
  page = await (await browser.newContext({ viewport: { width: 1440, height: 950 }, reducedMotion: 'reduce' })).newPage();
  page.on('request', request => pendingRequests.set(request, { url: request.url(), at: Date.now() }));
  const finished = request => pendingRequests.delete(request);
  page.on('requestfinished', finished); page.on('requestfailed', finished);
  page.setDefaultTimeout(10000); page.setDefaultNavigationTimeout(20000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const root = join(server.dir, 'NetworkVault'); mkdirSync(root);
  writeFileSync(join(root, 'A.md'), '# 同名笔记\n\n简介。\n\n## 引入动机\n\n明确的数学动机。\n\n## 形式\n\n[[B]] [[缺失]]\nP\n');
  writeFileSync(join(root, 'B.md'), '# 同名笔记\n\nP\n[[A]]\n');
  await page.goto(server.origin + '/library', { waitUntil: 'networkidle' });
  await page.evaluate(() => { window.showDirectoryPicker = undefined; });
  await page.locator('input[webkitdirectory]').setInputFiles(root);
  await page.getByRole('button', { name: '预览变更', exact: true }).click();
  await page.getByRole('button', { name: '导入到当前浏览器', exact: true }).click();
  await page.locator('.library-reader article').waitFor();
  const library = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const request = indexedDB.open('mcs-private-vaults-v1'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const libraries = await new Promise(resolve => { const request = db.transaction('vaults').objectStore('vaults').getAll(); request.onsuccess = () => resolve(request.result); }); db.close(); return libraries[0];
  });
  const noteKeys = library.files.filter(f => f.kind === 'note').map(f => `note:browser:${encodeURIComponent(library.id)}:${encodeURIComponent(f.id)}`);
  const ids = ['top:space', 'jiang:field-axioms', ...noteKeys];
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(ids.join(',')), { waitUntil: 'networkidle' });
  await page.waitForFunction(count => document.querySelectorAll('.network-node').length === count, ids.length);
  await page.waitForFunction(() => [...document.querySelectorAll('.network-edge')].some(e => e.getAttribute('data-kind') === 'noteReference'));
  console.log('mixed graph ready');
  for (const id of ids.slice(0, 2)) {
    const detail = (await (await fetch(server.origin + '/api/v2/ontology/nodes/' + encodeURIComponent(id))).json()).data.node;
    const motivation = detail.motivation;
    const registered = [...(motivation?.internal ?? []), ...(motivation?.external ?? []), ...(motivation?.aesthetic ?? [])].slice(0, 2).join('\n');
    const expected = registered || extractSignificance(detail.contentMarkdown).significance;
    assert.ok(expected, 'fixture has content-backed mathematical meaning');
    await page.locator(`.network-node[data-node="${id}"]`).focus();
    await page.waitForFunction(value => document.querySelector('.network-hover-info .network-meaning')?.textContent === value, expected);
    assert.match(await page.locator('.network-hover-info small').first().innerText(), registered ? /节点登记的动机/ : /节点正文/);
    await page.keyboard.press('Escape');
  }
  const original = await page.locator('.network-node').evaluateAll(nodes => nodes.map(n => [n.dataset.node, n.getAttribute('transform')]));
  const canvas = page.locator('.network-canvas-full');
  const box = await canvas.boundingBox(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 9; i++) await page.mouse.wheel(0, 180);
  await page.waitForFunction(() => document.querySelector('.network-node')?.dataset.nodeShape === 'dot');
  assert.deepEqual(await page.locator('.network-node').evaluateAll(nodes => nodes.map(n => [n.dataset.node, n.getAttribute('transform')])), original, 'zoom changes presentation, never layout coordinates');
  console.log('dots ready');

  /*
   * 圆点下方的名称（2026-10-15 加）。
   *
   * 用户的要求：「缩小画布的时候方块变成圆点之后，节点的主题内容文字要显示在节点正下方。」
   * 四件事分别核对——挂上了、确实在**正下方**、屏幕上恒定大小、卡片档一个都不留：
   * 取舍规则（谁先占位、挤的时候写短名）在 `tests/dot-labels.test.mjs` 里单测，
   * 这里量的是「浏览器里真的画成了那样」。
   */
  const readDotLabels = () => page.evaluate(() => {
    const rows = [...document.querySelectorAll('.network-node')].map((node) => {
      const dot = node.querySelector('.network-dot')?.getBoundingClientRect();
      const text = node.querySelector('.network-dot-label-text');
      const label = text?.getBoundingClientRect();
      return {
        id: node.dataset.node,
        title: node.getAttribute('aria-label') ?? '',
        text: text?.textContent ?? null,
        shape: node.dataset.nodeShape,
        dot: dot ? { cx: dot.x + dot.width / 2, cy: dot.y + dot.height / 2, bottom: dot.bottom, r: dot.width / 2 } : null,
        label: label ? { x: label.x, y: label.y, w: label.width, h: label.height, cx: label.x + label.width / 2 } : null,
        pointerEvents: text ? getComputedStyle(text.parentElement).pointerEvents : null,
        fontSize: text ? getComputedStyle(text).fontSize : null,
      };
    });
    const labelled = rows.filter((row) => row.label);
    let overlaps = 0; let covers = 0;
    for (let i = 0; i < labelled.length; i += 1) {
      for (let j = i + 1; j < labelled.length; j += 1) {
        const a = labelled[i].label; const b = labelled[j].label;
        if (Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1) overlaps += 1;
      }
    }
    for (const row of labelled) {
      if (rows.some((other) => other.dot && other.id !== row.id
        && other.dot.cx > row.label.x && other.dot.cx < row.label.x + row.label.w
        && other.dot.cy > row.label.y && other.dot.cy < row.label.y + row.label.h)) covers += 1;
    }
    return {
      shape: rows[0]?.shape, total: rows.length, labelled: labelled.length,
      overlaps, covers,
      notBelow: labelled.filter((row) => row.label.y < row.dot.bottom - 1).map((row) => row.text),
      offCentre: labelled.filter((row) => Math.abs(row.label.cx - row.dot.cx) > 1.5).map((row) => row.text),
      empty: labelled.filter((row) => !row.text.trim()).length,
      samples: labelled.slice(0, 4).map((row) => row.text),
      fontSize: labelled[0]?.fontSize ?? null,
      pointerEvents: labelled[0]?.pointerEvents ?? null,
    };
  });

  const dotLabelsAt = await readDotLabels();
  assert.equal(dotLabelsAt.shape, 'dot');
  assert.ok(dotLabelsAt.labelled >= 1, `圆点档下应当有名称：${JSON.stringify(dotLabelsAt)}`);
  assert.equal(dotLabelsAt.overlaps, 0, `标签之间不许重叠：${JSON.stringify(dotLabelsAt.samples)}`);
  assert.equal(dotLabelsAt.covers, 0, '标签不许压到别的圆点上');
  assert.deepEqual(dotLabelsAt.notBelow, [], '名称必须在圆点正下方（不能在圆点里面或上面）');
  assert.deepEqual(dotLabelsAt.offCentre, [], '名称必须水平居中在圆点正下方');
  assert.equal(dotLabelsAt.empty, 0, '空标题不挂标签');
  assert.equal(dotLabelsAt.pointerEvents, 'none', '标签不能吃掉指针事件（否则挡住圆点自己的悬停与拖动）');
  const labelledTitles = await page.locator('.network-node').evaluateAll((nodes) => nodes
    .filter((node) => node.querySelector('.network-dot-label-text'))
    .map((node) => [node.getAttribute('aria-label'), node.querySelector('.network-dot-label-text').textContent]));
  assert.ok(labelledTitles.every(([title, text]) => title.startsWith(text.replace(/…$/, ''))),
    `标签必须是该节点标题的截断：${JSON.stringify(labelledTitles.slice(0, 3))}`);

  // 屏幕上恒定大小：再放大一档（仍在圆点档内），字号与字框不变。
  const beforeBox = await page.locator('.network-dot-label-text').first().boundingBox();
  await page.locator('.network-zoom button[aria-label="放大"]').click();
  await page.waitForTimeout(500);
  const zoomed = await readDotLabels();
  if (zoomed.shape === 'dot' && zoomed.labelled > 0) {
    const afterBox = await page.locator('.network-dot-label-text').first().boundingBox();
    assert.ok(Math.abs(afterBox.height - beforeBox.height) < 1.5,
      `标签字号应当在屏幕上恒定：${beforeBox.height} → ${afterBox.height}`);
  }
  // 回到圆点档并复位视角，后面的用例照旧。
  await page.locator('.network-zoom button[aria-label="缩小"]').click();
  await page.waitForTimeout(300);
  assert.equal((await readDotLabels()).shape, 'dot');
  const dot = page.locator('.network-node[data-node-source="vault"] .network-dot').first();
  await dot.hover({ force: true });
  await page.locator('.network-hover-info').waitFor();
  assert.match(await page.locator('.network-hover-info').innerText(), /引用|被引用/);
  await page.locator('.network-hover-info').hover(); await page.waitForTimeout(300); assert.equal(await page.locator('.network-hover-info').count(), 1);
  await page.keyboard.press('Escape'); assert.equal(await page.locator('.network-hover-info').count(), 0);
  await page.locator('.network-node[data-node-source="vault"]').first().focus(); await page.locator('.network-hover-info').waitFor();
  await page.keyboard.press('Escape');
  console.log('hover ready');
  await page.locator('.network-node[data-node-source="vault"]').first().dispatchEvent('contextmenu', { clientX: 600, clientY: 300 });
  await page.getByRole('menuitem', { name: '建立私人关系', exact: true }).click();
  console.log('editor opening');
  const dialog = page.getByRole('dialog'); await dialog.waitFor();
  const fromId = await page.locator('.network-node[data-node-source="vault"]').first().getAttribute('data-node');
  await dialog.getByLabel('关系另一端').selectOption(noteKeys.find(id => id !== fromId));
  await dialog.getByRole('button', { name: '交换关系方向', exact: true }).click();
  assert.equal(await dialog.getByLabel('关系另一端').inputValue(), fromId);
  await dialog.getByRole('button', { name: '交换关系方向', exact: true }).click();
  assert.notEqual(await dialog.getByLabel('关系另一端').inputValue(), fromId);
  await dialog.getByLabel('关系理由', { exact: true }).fill('同名笔记仍是不同节点');
  await dialog.getByRole('button', { name: '保存并检查规则', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('dialog')?.textContent.includes('结构检查通过'));
  await dialog.getByRole('button', { name: '验证数学关系', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.network-check-result')?.textContent.includes('undecided'));
  await dialog.getByRole('button', { name: '预览投稿材料', exact: true }).click();
  const excerpts = dialog.getByLabel('可公开的最小摘录', { exact: true }); await excerpts.nth(0).fill('P'); await excerpts.nth(1).fill('P');
  console.log('private check ready');
  let submitted; page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/me/relation-submissions')) submitted = request.postDataJSON(); });
  await dialog.getByRole('button', { name: '提交这些材料', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('dialog')?.textContent.includes('等待审阅'));
  assert.equal(submitted.endpoints.from.excerpt, 'P'); assert.equal(submitted.endpoints.to.excerpt, 'P');
  assert.ok(!JSON.stringify(submitted).includes('明确的数学动机'), 'unselected note content is never submitted');
  await dialog.getByRole('button', { name: '关闭', exact: true }).click();
  // Open a real note through its node-detail link; back restores the mixed snapshot.
  await page.locator('.network-node[data-node-source="vault"] .network-dot').first().click({ force: true });
  /*
   * 点击**不画方框**（2026-10-17 用户要求：「点击的时候还是会有方框，把框去掉」）。
   *
   * 那个方框是浏览器给聚焦元素加的 UA 轮廓，形状取节点组的包围盒（也就是卡片的矩形）：
   * 圆点档下卡片透明，于是只剩一个框。选中视觉仍然在——圆点拿到 `.selected` 描边、名字变主色。
   * 键盘 Tab 的那一圈描边是另一条规则（`:focus-visible`），由下面的单元测试钉住。
   */
  const focusAfterClick = await page.evaluate(() => {
    const node = document.querySelector('.network-node.focused') ?? document.querySelector('.network-node');
    const style = getComputedStyle(node);
    const dot = node?.querySelector('.network-dot');
    const label = node?.querySelector('.network-dot-label-text');
    return {
      shape: node?.dataset.nodeShape ?? null,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      dotSelected: Boolean(dot?.classList.contains('selected')),
      labelFill: label ? getComputedStyle(label).fill : null,
    };
  });
  assert.equal(focusAfterClick.outlineStyle, 'none', `点击之后不该有方框：${JSON.stringify(focusAfterClick)}`);
  assert.ok(focusAfterClick.dotSelected, `选中视觉应当在圆点自己身上：${JSON.stringify(focusAfterClick)}`);
  console.log('click draws no focus box');
  const readLink = page.locator('a[href*="/library?"][href*="from=network"]').first();
  await readLink.click(); await page.locator('.library-reader article').waitFor();
  await page.getByRole('link', { name: '回到网络视图', exact: true }).click();
  await page.waitForFunction(count => document.querySelectorAll('.network-node').length === count, ids.length);
  // Fresh navigation restores the same mixed node set from the session draft.
  await page.goto(server.origin + '/'); await page.goto(server.origin + '/network');
  await page.waitForFunction(count => document.querySelectorAll('.network-node').length === count, ids.length);
  await page.goto(server.origin + '/en/network?nodes=' + encodeURIComponent(ids.join(',')), { waitUntil: 'networkidle' });
  await page.locator('.network-node[data-node-source="vault"]').first().focus(); await page.locator('.network-hover-info').waitFor();
  assert.match(await page.locator('.network-hover-info').innerText(), /Meaning in mathematical theory|Links to/);
  assert.deepEqual(errors, []);
  console.log('✓ mixed sources, note references, dot coordinates, transferable hover, keyboard, private checks, minimal frozen submission, session restore and English');
} catch (error) {
  console.error('Mixed network failure:', { url: page?.url(), pending: [...pendingRequests.values()].map(r => ({ url: r.url, ms: Date.now() - r.at })) });
  if (page) { console.error((await page.locator('body').innerText()).slice(0, 5000)); await page.screenshot({ path: join(process.cwd(), 'tmp', 'network-workspace-failure.png') }).catch(() => {}); }
  throw error;
} finally { await browser?.close(); await server.cleanup(); }
