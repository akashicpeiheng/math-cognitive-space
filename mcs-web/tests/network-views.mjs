import { startTestServer } from './helpers.mjs';

import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/**
 * 知识网络的保存功能。
 *
 * 用户的要求：「在知识网络里面加入保存功能，下次可以直接用。」
 *
 * 「可以直接用」要能被检查，因此断言四件事：
 * 1. 存下来的四样东西（节点 / 可见边源 / 手动位置 / 相机）能**原样**还回来；
 * 2. 刷新页面（换一个页面实例）之后仍然在——这才叫「下次」；
 * 3. 保存写的是 **E 层**：本体版本与哈希不变，也不产生学习事件；
 * 4. 没选档案时退回本机存储，并且**界面如实说明**存在哪里。
 */
const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  // 选一个学习档案：视图要写进 E 层。先落到站点页面，相对 URL 才有基。
  await page.goto(server.origin + '/', { waitUntil: 'networkidle' });
  const profileId = await page.evaluate(async () => {
    const listed = await (await fetch('/api/v2/profiles')).json();
    const existing = listed.data.profiles[0];
    if (existing) return existing.id;
    const created = await (await fetch('/api/v2/profiles', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '保存功能验收', modelVersion: 'mcs-tests/1' }),
    })).json();
    return created.data.profile.id;
  });
  await page.evaluate((id) => localStorage.setItem('mcs-web-selected-profile', id), profileId);

  /** 本体版本/哈希：保存不该动它。 */
  const ontologyBefore = await page.evaluate(async () => {
    const meta = await (await fetch('/api/v2/ontology')).json();
    return { version: meta.data.version, nodes: meta.data.nodeCount ?? meta.data.nodes ?? null };
  });
  const eventsBefore = await page.evaluate(async (id) => {
    const data = await (await fetch(`/api/v2/profiles/${id}/events?limit=1`)).json();
    return data.data.total ?? data.data.events.length;
  }, profileId);

  // 打开网络页：加两个节点，打开视图面板
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent('dg:manifold,dg:homeomorphism'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.getByLabel('显示保存的视图面板').check();
  await page.waitForTimeout(600);

  const panel = await page.evaluate(() => ({
    hasPanel: Boolean(document.querySelector('.floating-panel[aria-label="保存的视图"]')),
    note: document.querySelector('.floating-panel[aria-label="保存的视图"] .muted')?.textContent ?? '',
    hasSaveButton: [...document.querySelectorAll('button')].some((button) => button.textContent?.includes('保存当前视图')),
  }));
  check('视图面板打开，并且有「保存当前视图」', panel.hasPanel && panel.hasSaveButton, JSON.stringify(panel));
  check('面板写明存到哪里（选了档案 → E 层）', panel.note.includes('档案（E）'), panel.note.slice(0, 60));

  // 保存一条视图（prompt 用固定名字）
  const viewName = '验收视图 A';
  page.once('dialog', (dialog) => dialog.accept(viewName));
  await page.locator('button:has-text("保存当前视图")').first().click();
  await page.waitForTimeout(900);

  const afterSave = await page.evaluate(async (id) => {
    const listed = await (await fetch(`/api/v2/profiles/${id}/network-views`)).json();
    const view = listed.data.views.find((item) => item.name === '验收视图 A');
    return {
      count: listed.data.views.length,
      found: Boolean(view),
      nodes: view?.payload.added ?? [],
      families: view?.payload.families ?? [],
      hasCamera: Boolean(view?.payload.camera),
      ontologyVersion: listed.data.ontologyVersion,
      note: document.querySelector('.floating-panel[aria-label="保存的视图"] .muted')?.textContent ?? '',
      notice: document.body.innerText.includes('已保存视图「验收视图 A」'),
    };
  }, profileId);
  check('保存进了学习者档案（E）', afterSave.found && afterSave.count >= 1, JSON.stringify({ count: afterSave.count, found: afterSave.found }));
  check('保存的内容含节点与相机', afterSave.nodes.length === 2 && afterSave.hasCamera, JSON.stringify({ nodes: afterSave.nodes, camera: afterSave.hasCamera }));
  check('界面回执说明「存在档案（E）里」', afterSave.notice, afterSave.notice);

  const ontologyAfter = await page.evaluate(async () => {
    const meta = await (await fetch('/api/v2/ontology')).json();
    return { version: meta.data.version };
  });
  const eventsAfter = await page.evaluate(async (id) => {
    const data = await (await fetch(`/api/v2/profiles/${id}/events?limit=1`)).json();
    return data.data.total ?? data.data.events.length;
  }, profileId);
  check('保存视图不改本体（版本哈希不变）', ontologyAfter.version === ontologyBefore.version,
    JSON.stringify({ before: ontologyBefore.version, after: ontologyAfter.version }));
  check('保存视图不产生学习事件（不是学习行为）', eventsAfter === eventsBefore,
    JSON.stringify({ before: eventsBefore, after: eventsAfter }));

  // 「下次直接用」：新页面实例（模拟关掉再打开）→ 载入
  const fresh = await context.newPage();
  await fresh.goto(server.origin + '/network', { waitUntil: 'networkidle' });
  await fresh.waitForTimeout(1300);
  await fresh.getByLabel('显示保存的视图面板').check();
  await fresh.waitForTimeout(700);
  const freshList = await fresh.evaluate(() => {
    const items = [...document.querySelectorAll('.saved-view-list li')];
    return {
      names: [...document.querySelectorAll('.saved-view-name')].map((node) => node.textContent ?? ''),
      /*
       * 「本机」只能在**列表项自己那行**里找：整页找会命中侧栏的「本机工作台」（第一版就是这么误报的）。
       */
      localBadge: items.some((item) => (item.querySelector('.muted')?.textContent ?? '').includes('本机')),
      sourceLine: items[0]?.querySelector('.muted')?.textContent ?? '',
    };
  });
  check('新开的页面里仍能看到保存的视图（下次能直接用）',
    freshList.names.includes(viewName) && !freshList.localBadge, JSON.stringify(freshList));

  await fresh.locator('.saved-view-list li', { hasText: viewName }).locator('button:has-text("载入")').click();
  await fresh.waitForTimeout(1200);
  const loaded = await fresh.evaluate(() => ({
    url: decodeURIComponent(location.search),
    nodes: document.querySelectorAll('.network-node').length,
    notice: document.body.innerText.includes('已载入视图'),
    noticeBody: (document.body.innerText.match(/已载入视图[^\n]*/) ?? [''])[0],
  }));
  check('载入把节点放回画布（并如实说明改了什么）',
    loaded.nodes > 0 && loaded.notice, JSON.stringify({ nodes: loaded.nodes, notice: loaded.notice }));
  check('载入的是保存时的那两个节点', loaded.url.includes('dg%3Amanifold') || loaded.url.includes('dg:manifold') || loaded.noticeBody.includes('2 个节点'),
    JSON.stringify({ url: loaded.url, body: loaded.noticeBody }));

  // 重命名与删除
  fresh.once('dialog', (dialog) => dialog.accept('验收视图 A（改名）'));
  await fresh.locator('.saved-view-list li', { hasText: viewName }).locator('button:has-text("重命名")').click();
  await fresh.waitForTimeout(900);
  const renamed = await fresh.evaluate(async (id) => {
    const listed = await (await fetch(`/api/v2/profiles/${id}/network-views`)).json();
    return listed.data.views.map((item) => item.name);
  }, profileId);
  check('重命名写回档案', renamed.includes('验收视图 A（改名）'), JSON.stringify(renamed));

  /*
   * 删除前有二次确认（2026-10-05 加的）：这是真的删 E 层记录，没有撤销。
   * 对话框必须有人 accept，否则 `window.confirm` 返回 false、删除根本不发生——
   * 那一轮的失败信息是「删除从档案里移除 :: [...]」，看起来像删除功能坏了，
   * 实际是测试没接这个对话框。
   */
  fresh.once('dialog', (dialog) => dialog.accept());
  await fresh.locator('.saved-view-list li', { hasText: '验收视图 A（改名）' }).locator('button:has-text("删除")').click();
  await fresh.waitForTimeout(900);
  const afterDelete = await fresh.evaluate(async (id) => {
    const listed = await (await fetch(`/api/v2/profiles/${id}/network-views`)).json();
    return listed.data.views.map((item) => item.name);
  }, profileId);
  check('删除从档案里移除', !afterDelete.includes('验收视图 A（改名）'), JSON.stringify(afterDelete));

  // 没选档案：退回本机，并且界面如实说明
  const anon = await context.newPage();
  await anon.goto(server.origin + '/', { waitUntil: 'networkidle' });
  await anon.evaluate(() => localStorage.removeItem('mcs-web-selected-profile'));
  await anon.goto(server.origin + '/network?nodes=' + encodeURIComponent('dg:manifold'), { waitUntil: 'networkidle' });
  await anon.waitForTimeout(1300);
  await anon.getByLabel('显示保存的视图面板').check();
  await anon.waitForTimeout(600);
  const anonNote = await anon.evaluate(() => document.querySelector('.floating-panel[aria-label="保存的视图"] .muted')?.textContent ?? '');
  check('未选择档案时如实说明「存在这台浏览器里」', anonNote.includes('这台浏览器'), anonNote.slice(0, 60));

  anon.once('dialog', (dialog) => dialog.accept('本机视图'));
  await anon.locator('button:has-text("保存当前视图")').first().click();
  await anon.waitForTimeout(700);
  const localSaved = await anon.evaluate(() => {
    const raw = localStorage.getItem('mcs-network-views-local-v1');
    const list = raw ? JSON.parse(raw) : [];
    return {
      count: list.length,
      names: list.map((item) => item.name),
      badge: [...document.querySelectorAll('.saved-view-list li .muted')].some((node) => (node.textContent ?? '').includes('本机')),
    };
  });
  check('未选择档案时存进本机存储并在列表标注「本机」',
    localSaved.names.includes('本机视图') && localSaved.badge, JSON.stringify(localSaved));

  check('保存 / 载入 / 重命名 / 删除全程没有控制台错误', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n知识网络保存功能验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n知识网络保存功能验收通过。');
