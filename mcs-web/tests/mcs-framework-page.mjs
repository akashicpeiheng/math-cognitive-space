import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { startTestServer } from './helpers.mjs';
import { CHROME_PATH, PLAYWRIGHT_SPECIFIER } from './browser-runtime.mjs';

const app = await startTestServer({ lean: { enabled: false } });
const { chromium } = await import(PLAYWRIGHT_SPECIFIER);
const browser = await chromium.launch({ executablePath: CHROME_PATH ?? undefined, headless: true });
const errors = [], checks = [], directory = 'runtime/mcs-framework-qa';
mkdirSync(directory, { recursive: true });
let active;
const watch = page => { active = page; page.on('pageerror', error => errors.push(error.message)); };
const ready = async page => {
  await page.locator('[data-mcs-atlas]').waitFor();
  await page.waitForFunction(() => document.querySelectorAll('[data-atlas-node]').length > 0);
};
const camera = page => page.locator('[data-mcs-atlas]').evaluate(el => ({
  x: Number(el.dataset.cameraX), y: Number(el.dataset.cameraY), scale: Number(el.dataset.zoom),
}));
const openFrameworks = async (page, name = '框架') => {
  await page.getByRole('button', { name, exact: true }).click();
  await page.locator('[data-framework-panel]').waitFor();
};
const closeFrameworks = async page => {
  await page.getByRole('button', { name: '关闭框架面板', exact: true }).click();
  await page.locator('[data-framework-panel]').waitFor({ state: 'detached' });
};

try {
  const view = (await (await fetch(app.origin + '/api/v2/ontology/mcs-view')).json()).data;
  assert(view.objects.length > 0);
  assert(view.relations.length > 0);

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'light' });
  const page = await context.newPage(); watch(page);
  await page.goto(app.origin + '/mcs'); await ready(page);
  assert.equal(await page.getByRole('button', { name: '框架', exact: true }).count(), 1, 'toolbar has a frameworks entry');
  await page.screenshot({ path: directory + '/overview.png', fullPage: true });

  await openFrameworks(page);
  const dialog = page.getByRole('dialog', { name: '数学框架' });
  assert.equal(await dialog.count(), 1);
  assert((await dialog.innerText()).includes('MSC 2020'), 'panel names the external classification');
  assert(await dialog.locator('a[href^="https://"]').count() >= 2, 'both classification sources are linked');
  assert.equal(await page.locator('[data-framework-code]').count(), 63, 'all MSC 2020 groups are rendered once');
  assert.equal(await page.locator('[data-framework-scope="unmapped"]').count(), 12, 'applied groups have an honest unmapped state');
  assert.equal(await page.locator('[data-applied-link]').count(), 12, 'unmapped groups link to the applied index');
  await page.screenshot({ path: directory + '/panel-classification.png', fullPage: true });

  const search = dialog.getByRole('searchbox', { name: '搜索分类号或名称' });
  await search.fill('46');
  assert.equal(await page.locator('[data-framework-code="46"]').count(), 1, 'code search narrows to one row');
  assert((await page.locator('[data-framework-code="46"]').innerText()).includes('Functional analysis'));
  const beforeFly = await camera(page);
  await page.locator('[data-framework-code="46"] .mcs-framework-row-main').click();
  await page.waitForTimeout(650);
  assert.notDeepEqual(await camera(page), beforeFly, 'a zero-content classification navigates to its field/branch');
  assert((await page.locator('.mcs-atlas-detail').innerText()).includes('泛函分析') || (await page.locator('.mcs-atlas-detail').innerText()).includes('此分支尚无已收录对象'));
  await page.locator('.mcs-atlas-tools button').first().click();
  await page.waitForTimeout(500);

  await search.fill('');
  await page.locator('[data-framework-code="53"] .mcs-framework-row-main').click();
  await page.waitForTimeout(650);
  const chip = page.locator('.mcs-atlas-filter-chip');
  await chip.waitFor();
  assert((await chip.innerText()).includes('MSC 53'));
  const analysisOpacity = Number(await page.locator('[data-atlas-node="atlas:analysis"]').getAttribute('opacity'));
  const geometryOpacity = Number(await page.locator('[data-atlas-node="atlas:geometry"]').getAttribute('opacity'));
  assert(analysisOpacity < .5, 'unrelated fields dim under the classification lens');
  assert(geometryOpacity > .9, 'the matched field stays bright');
  await page.screenshot({ path: directory + '/filter-53.png', fullPage: true });
  await page.getByRole('button', { name: '分享地图', exact: true }).click();
  const shareInput = page.getByRole('textbox', { name: '地图分享链接' });
  const shareValue = await shareInput.inputValue();
  const shareState = JSON.parse(decodeURIComponent(new URL(shareValue).hash.slice(7)));
  assert.equal(shareState.framework, '53', 'share links retain the classification lens');
  assert.equal(shareState.layout, 'field/4');
  await page.getByRole('button', { name: '关闭提示', exact: true }).click();
  await chip.getByRole('button').click();
  await page.locator('.mcs-atlas-filter-chip').waitFor({ state: 'detached' });

  await search.fill('53');
  await page.locator('[data-framework-code="53"] .mcs-framework-row-main').click();
  await page.waitForTimeout(300);
  await closeFrameworks(page);
  await openFrameworks(page);
  await page.getByLabel('只看已收录').check();
  const collectedRows = await page.locator('[data-framework-code]').count();
  assert(collectedRows > 0 && collectedRows < 63, 'collected-only hides zero-content codes');
  await page.getByLabel('只看已收录').uncheck();
  await page.getByLabel('在图上显示分类号').check();
  await closeFrameworks(page);
  assert.equal(await page.locator('.mcs-atlas-code').count() > 0, true, 'codes appear on field labels');
  const codeText = await page.locator('.mcs-atlas-code').first().innerText();
  assert(codeText.includes('MSC'), `code label includes MSC (${codeText})`);
  await page.screenshot({ path: directory + '/codes-on-map.png', fullPage: true });
  await page.getByRole('button', { name: '分享地图', exact: true }).click();
  const codesShare = await page.getByRole('textbox', { name: '地图分享链接' }).inputValue();
  const codesState = JSON.parse(decodeURIComponent(new URL(codesShare).hash.slice(7)));
  assert.equal(codesState.codes, true, 'share links retain the code-display preference');
  assert.equal(codesState.framework, '53');
  await page.getByRole('button', { name: '关闭提示', exact: true }).click();
  await openFrameworks(page);
  await page.getByLabel('在图上显示分类号').uncheck();
  await closeFrameworks(page);
  assert.equal(await page.locator('.mcs-atlas-code').count(), 0, 'turning codes off restores the plain map');

  await openFrameworks(page);
  await page.getByRole('tab', { name: '形式结构', exact: true }).click();
  const formal = await dialog.innerText();
  assert(formal.includes('五级尺度'));
  assert(formal.includes('M 层关系'));
  assert(formal.includes('证据状态'));
  assert(formal.includes(String(view.objects.length)), 'formal tab reports the current object total');
  assert(formal.includes(String(view.relations.length)), 'formal tab reports the current M relation total');
  await page.screenshot({ path: directory + '/panel-formal.png', fullPage: true });
  await closeFrameworks(page);
  await page.getByRole('searchbox', { name: '搜索数学地图' }).fill('46');
  const codeSearchResults = await page.locator('.mcs-atlas-results').innerText();
  assert(codeSearchResults.includes('MSC 46'), 'map search matches a classification code');
  assert(codeSearchResults.includes('泛函分析'));
  await page.getByRole('searchbox', { name: '搜索数学地图' }).fill('');

  const gradientId = 'obj:tdg:gradient';
  const gradientRelations = view.relations.filter(relation =>
    relation.from.id === gradientId || relation.to.id === gradientId || relation.premises.some(ref => ref.id === gradientId));
  assert(gradientRelations.length > 0);
  await page.getByRole('searchbox', { name: '搜索数学地图' }).fill(gradientId);
  await page.locator('.mcs-atlas-results button').first().click();
  await page.locator('.mcs-atlas-structure').waitFor();
  const structureText = await page.locator('.mcs-atlas-structure').innerText();
  assert(structureText.includes('尺度'));
  assert(structureText.includes(String(gradientRelations.length)), 'object card reports the real M relation count');
  assert(structureText.includes('M 关系'));
  await page.screenshot({ path: directory + '/object-structure.png', fullPage: true });
  checks.push('desktop classification index, code search, filter lens, map codes, formal tab and object structure');

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce', colorScheme: 'dark' });
  const phone = await mobile.newPage(); watch(phone);
  await phone.goto(app.origin + '/en/mcs'); await ready(phone);
  await openFrameworks(phone, 'Frameworks');
  const phoneDialog = phone.getByRole('dialog', { name: 'Mathematical frameworks' });
  assert.equal(await phoneDialog.count(), 1);
  assert((await phoneDialog.innerText()).includes('Subject classification'));
  assert(!(await phoneDialog.innerText()).includes('泛函分析'), 'English panel does not leak Chinese display names');
  assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no horizontal overflow');
  await phoneDialog.getByRole('searchbox', { name: 'Search classification codes or names' }).fill('46');
  assert.equal(await phone.locator('[data-framework-code="46"]').count(), 1);
  await phone.screenshot({ path: directory + '/mobile-panel.png', fullPage: true });
  await phone.locator('[data-framework-code="46"] .mcs-framework-row-main').click();
  await phone.waitForTimeout(500);
  await phone.keyboard.press('Escape');
  await phone.locator('[data-framework-panel]').waitFor({ state: 'detached' });
  const focused = await phone.evaluate(() => document.activeElement?.textContent?.trim() ?? '');
  assert(focused.includes('Frameworks'), `focus returns to the trigger (${focused})`);
  await phone.screenshot({ path: directory + '/mobile-en.png', fullPage: true });
  checks.push('390px English dark sheet, English-only display titles, Escape close and focus restore');

  assert.deepEqual(errors, [], 'no page errors');
  writeFileSync(directory + '/framework-acceptance.json', JSON.stringify({
    status: 'passed', checks, objects: view.objects.length, relations: view.relations.length, errors,
  }, null, 2));
  console.log('MCS framework page: passed', checks);
} catch (error) {
  if (active && !active.isClosed()) await active.screenshot({ path: directory + '/framework-failure.png', fullPage: true }).catch(() => {});
  throw error;
} finally {
  await browser.close();
  await app.cleanup();
}
