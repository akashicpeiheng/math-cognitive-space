import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { startTestServer, jsonCall } from './helpers.mjs';
import { PLAYWRIGHT_SPECIFIER, CHROME_PATH } from './browser-runtime.mjs';

const server = await startTestServer();
let browser;
const artifacts = resolve('runtime', 'learning-plan-qa');
mkdirSync(artifacts, { recursive: true });
try {
  const { chromium } = await import(PLAYWRIGHT_SPECIFIER);
  browser = await chromium.launch({ executablePath: CHROME_PATH ?? undefined, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const call = async (path, options) => (await jsonCall(server.origin, '/api/v2' + path, options)).payload.data;
  const beforeHash = (await call('/health')).ontology.contentHash;
  await page.goto(server.origin + '/start', { waitUntil: 'networkidle' });
  assert.equal(await page.locator('.learning-entry').count(), 2);
  assert.equal(await page.locator('.learning-plan-card').count(), 0);
  await page.screenshot({ path: resolve(artifacts, 'start-desktop.png'), fullPage: false });
  await page.getByRole('button', { name: '从感兴趣的次级学科探索', exact: true }).click();
  await page.locator('.learning-interest-list button').filter({ hasText: /^群论$/ }).click();
  await page.locator('[data-interest-toggle="群论"]').click();
  assert.equal(await page.locator('[data-guide-node]').count(), 9);
  await page.locator('[data-guide-list-node="group:cayley"]').click();
  await page.locator('.field-guide-selection').getByRole('button', { name: '设为近期主目标', exact: true }).click();
  await page.waitForSelector('.learning-step-list li', { timeout: 15000 });
  assert.ok(await page.locator('.learning-step-list li').count() <= 5);
  assert.ok(await page.locator('.learning-background a').count() > 0);
  assert.equal(await page.locator('.learning-readiness.ready').count(), 0);
  await page.locator('.learning-roadmap summary').click();
  assert.ok(await page.locator('.learning-roadmap-edge').count() > 0);
  assert.ok(await page.locator('.learning-roadmap-node.highlighted').count() > 0);
  await page.locator('.learning-roadmap-canvas').screenshot({ path: resolve(artifacts, 'direction-graph.png') });
  await page.locator('.learning-roadmap summary').click();
  console.log('  ✓ 学科入口收束到主目标、背景核对和近期步骤；访客不冒充已有知识');

  const profile = (await call('/profiles', { method: 'POST', body: { name: '学习引导验收', template: 'blank' } })).profile;
  await page.evaluate(id => localStorage.setItem('mcs-web-selected-profile', id), profile.id);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '采用浏览器中的方案', exact: true }).click();
  await page.waitForSelector('.learning-step-list li');
  let saved = (await call(`/profiles/${profile.id}/learning-plan`)).plan;
  assert.equal(saved.primaryGoal, 'group:cayley'); assert.deepEqual(saved.interests, ['群论']);
  let events = (await call(`/profiles/${profile.id}/events`)).events;
  assert.equal(events.filter(event => event.kind === 'confirmation').length, 0);
  console.log('  ✓ 访客草稿可以采用到档案，写入主目标但没有写入知识确认');

  for (const nodeId of ['bg:set:function', 'bg:group:binary', 'bg:real:metric']) {
    await call(`/profiles/${profile.id}/events`, { method: 'POST', body: { merge: true, event: {
      eventId: `qa-${nodeId}`, kind: 'confirmation', nodeId, source: { kind: 'system', ref: 'learning-qa' }, payload: { confirmed: true },
    } } });
  }
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForSelector('.learning-readiness.ready');
  await page.locator('.learning-step-list li[data-step="group:cayley"]').getByRole('button', { name: '选为下一步', exact: true }).click();
  await page.waitForSelector('.learning-plan-card .error');
  assert.match(await page.locator('.learning-plan-card .error').innerText(), /先完成/);
  assert.equal((await call(`/profiles/${profile.id}/learning-plan`)).plan.manualOrder, null);
  console.log('  ✓ 依赖未完成时拒绝把汇合目标提前，保存的顺序没有改变');

  await page.locator('.learning-branch').filter({ hasText: '极限与连续' }).getByRole('button', { name: '加入支线', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.learning-branch') && [...document.querySelectorAll('.learning-branch button')].some(button => button.textContent === '移出支线'));
  await page.waitForSelector('.learning-step-list li');
  saved = (await call(`/profiles/${profile.id}/learning-plan`)).plan;
  assert.deepEqual(saved.branches, ['limit:bridge']);
  const branchStep = page.locator('.learning-step-list li').filter({ has: page.locator('.badge', { hasText: '兴趣支线' }) }).first();
  await branchStep.waitFor();
  const branchNode = await branchStep.getAttribute('data-step');
  await branchStep.getByRole('button', { name: '选为下一步', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('.learning-plan-card')?.textContent.includes('正在核对'));
  saved = (await call(`/profiles/${profile.id}/learning-plan`)).plan;
  assert.ok(saved.manualOrder);
  assert.equal(await page.locator('.learning-step-list li').first().getAttribute('data-step'), branchNode);
  console.log('  ✓ 可以把依赖满足的并行支线选为下一步，手动顺序随档案保存');
  const eventsBeforeRead = (await call(`/profiles/${profile.id}/events`)).events.length;
  await page.locator('.learning-plan-summary').getByRole('button', { name: '进入这一步', exact: true }).click();
  await page.waitForURL(/\/nodes\/.*route=/);
  await page.waitForSelector('.learning-plan-card');
  assert.ok((new URL(page.url())).searchParams.has('route'));
  assert.ok(await page.locator('.learning-plan-card').count() === 1);
  events = (await call(`/profiles/${profile.id}/events`)).events;
  assert.equal(events.filter(event => event.kind === 'confirmation').length, 3);
  assert.ok(events.length >= eventsBeforeRead);
  console.log('  ✓ 支线由主动操作加入；沿路线阅读使用方案顺序，阅读没有增加知识确认');

  const other = await context.newPage();
  await other.goto(server.origin + '/profile', { waitUntil: 'networkidle' });
  await other.waitForSelector('.learning-plan-card');
  assert.equal(await other.locator('.learning-plan-card').getAttribute('data-goal'), 'group:cayley');
  await other.goto(server.origin + '/plan', { waitUntil: 'networkidle' });
  await other.waitForSelector('.learning-plan-card');
  assert.equal(await other.locator('.learning-plan-card').getAttribute('data-goal'), 'group:cayley');
  console.log('  ✓ 我的学习、路线页与节点页共享档案主目标');

  const secondContext = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  await secondContext.addInitScript(id => {
    if (!localStorage.getItem('mcs-web-selected-profile')) localStorage.setItem('mcs-web-selected-profile', id);
  }, profile.id);
  const tablet = await secondContext.newPage();
  await tablet.goto(server.origin + '/start', { waitUntil: 'networkidle' });
  await tablet.waitForSelector('.learning-step-list li');
  assert.equal(await tablet.locator('.learning-plan-card').getAttribute('data-goal'), 'group:cayley');
  assert.equal(await tablet.getByRole('button', { name: '移出支线', exact: true }).count(), 1);
  assert.equal(await tablet.locator('.learning-step-list li').first().getAttribute('data-step'), branchNode);
  await tablet.screenshot({ path: resolve(artifacts, 'plan-tablet.png'), fullPage: false });
  assert.ok(await tablet.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await tablet.setViewportSize({ width: 390, height: 844 });
  await tablet.screenshot({ path: resolve(artifacts, 'plan-phone.png'), fullPage: false });
  assert.ok(await tablet.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  console.log('  ✓ 新浏览器从服务端恢复方案，平板与手机没有横向溢出');

  // Another device changes the revision while this browser still has the old plan.
  const concurrent = (await call(`/profiles/${profile.id}/learning-plan`)).plan;
  await call(`/profiles/${profile.id}/learning-plan`, { method: 'PUT', body: { ...concurrent, pace: 'block', baseRevision: concurrent.revision } });
  await tablet.locator('.learning-personalize details summary').click();
  await tablet.locator('.learning-option-grid select').last().selectOption('small');
  await tablet.waitForSelector('.learning-plan-card .error');
  await tablet.waitForFunction(() => !document.querySelector('.learning-plan-card')?.textContent.includes('正在核对'));
  assert.match(await tablet.locator('.learning-plan-card .error').innerText(), /其他页面|重新载入/);
  assert.match(await tablet.locator('.learning-plan-storage').innerText(), /尚未保存/);
  assert.equal((await call(`/profiles/${profile.id}/learning-plan`)).plan.pace, 'block');
  await tablet.getByRole('button', { name: '重新载入档案', exact: true }).click();
  await tablet.waitForSelector('.learning-step-list li');
  assert.equal(await tablet.locator('.learning-plan-card .error').count(), 0);
  console.log('  ✓ 跨设备修订冲突保留错误和未保存提示；重新载入可恢复服务端方案');

  const secondProfile = (await call('/profiles', { method: 'POST', body: { name: '隔离档案', template: 'blank' } })).profile;
  await tablet.reload({ waitUntil: 'networkidle' });
  await tablet.locator('#profile-select').selectOption(secondProfile.id);
  await tablet.waitForFunction(() => !document.querySelector('.learning-plan-card'));
  assert.equal(await tablet.locator('.learning-plan-card').count(), 0);
  assert.equal((await call(`/profiles/${secondProfile.id}/learning-plan`)).plan.primaryGoal, null);
  console.log('  ✓ 切换空白档案不会沿用另一档案的主目标与确认状态');
  await call(`/profiles/${secondProfile.id}/directions`, { method: 'POST', body: { nodeId: 'bg:set:function' } });
  await call(`/profiles/${secondProfile.id}/directions`, { method: 'POST', body: { nodeId: 'group:group-concept' } });
  await tablet.reload({ waitUntil: 'networkidle' });
  assert.equal(await tablet.locator('.learning-plan-card').getAttribute('data-goal'), 'bg:set:function');
  await tablet.getByRole('button', { name: '重新探索方向', exact: true }).click();
  await tablet.getByRole('button', { name: '我已有学习目标', exact: true }).click();
  await tablet.locator('[data-existing-goal="group:group-concept"]').click();
  await tablet.waitForSelector('.learning-step-list li');
  assert.equal((await call(`/profiles/${secondProfile.id}/learning-plan`)).plan.primaryGoal, 'group:group-concept');
  console.log('  ✓ 旧档案采用最早有效方向，其余已声明的具体目标仍可直接选择');

  const englishContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const english = await englishContext.newPage();
  await english.goto(server.origin + '/en/start', { waitUntil: 'networkidle' });
  await english.getByRole('button', { name: 'I already have a learning goal', exact: true }).click();
  await english.getByRole('searchbox').fill('Cayley');
  assert.ok(await english.locator('.learning-goal-card').count() > 0);
  await english.locator('.learning-goal-card button').first().click();
  await english.waitForSelector('.learning-step-list li');
  const englishText = await english.locator('.learning-guide').innerText();
  assert.equal(/[\u3400-\u9fff]/.test(englishText), false, englishText);
  assert.ok((await english.locator('.learning-background a').evaluateAll(links => links.map(link => link.getAttribute('href')))).every(href => href.startsWith('/en/')));
  await english.screenshot({ path: resolve(artifacts, 'plan-english.png'), fullPage: false });
  console.log('  ✓ 已有目标入口支持搜索，英文引导与方案没有中文残留或语种跳转');
  assert.equal((await call('/health')).ontology.contentHash, beforeHash);
  assert.deepEqual(errors, []);
  console.log('  ✓ 公共本体哈希保持一致，没有浏览器运行错误');
} finally { if (browser) await browser.close(); await server.cleanup(); }
