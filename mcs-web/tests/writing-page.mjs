import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { startTestServer } from './helpers.mjs';
import { CHROME_PATH, PLAYWRIGHT_SPECIFIER } from './browser-runtime.mjs';
import { exerciseVaultPage } from './vault-page-flow.mjs';

const server = await startTestServer(); let browser;
const screenshots = join('runtime', 'writing-qa'); mkdirSync(screenshots, { recursive: true });
try {
  const { chromium } = await import(PLAYWRIGHT_SPECIFIER);
  browser = await chromium.launch({ executablePath: CHROME_PATH ?? undefined, headless: true });
  const context = await browser.newContext({ viewport: { width: 1500, height: 950 } }), page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const quiet = async p => { await p.waitForFunction(() => document.querySelector('.writing-autosave')?.textContent.includes('草稿已暂存') || document.querySelector('.writing-autosave')?.textContent.includes('Draft kept')); };
  const dbRead = (p, store, key) => p.evaluate(async ({ store, key }) => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('mcs-private-vaults-v1'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    try { return await new Promise((resolve, reject) => { const r = db.transaction(store).objectStore(store).get(key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); } finally { db.close(); }
  }, { store, key });

  // Adaptive authoring: a small node, independent scope/progress, shared coverage and mixed roles.
  const adaptiveContext = await browser.newContext({ viewport: { width: 1500, height: 950 } }), adaptive = await adaptiveContext.newPage();
  adaptive.on('pageerror', e => errors.push(e.message));
  await adaptive.goto(server.origin + '/library/write/new', { waitUntil: 'networkidle' });
  await adaptive.getByLabel('笔记标题', { exact: true }).fill('记号约定的最小笔记');
  await adaptive.getByLabel('对象类型', { exact: true }).selectOption('notation');
  await adaptive.getByRole('button', { name: '开始创作', exact: true }).click();
  await adaptive.waitForURL(/\/library\/write\/[a-f0-9-]+$/); await quiet(adaptive);
  assert.equal(await adaptive.locator('.writing-contents > nav .writing-chapter-button').count(), 4);
  await adaptive.locator('.writing-resources > summary').click();
  await adaptive.locator('.writing-resources').getByRole('button', { name: /^应用/ }).click();
  await adaptive.getByLabel('本节适用性', { exact: true }).selectOption('na');
  await adaptive.getByLabel('理由、范围或待确认问题', { exact: true }).fill('只固定本篇记号，无独立应用任务。'); await quiet(adaptive);
  await adaptive.getByRole('button', { name: '审校提示词', exact: true }).click();
  const excludedPrompt = await adaptive.getByLabel('提示词预览与手动复制', { exact: true }).inputValue();
  assert.ok(!excludedPrompt.split('<reference-data>')[0].includes('## 应用'));
  assert.ok(excludedPrompt.includes('只固定本篇记号'));
  await adaptive.locator('.writing-prompt-preview').getByRole('button', { name: '取消', exact: true }).click();
  await adaptive.locator('.writing-contents').getByRole('button', { name: /^精确内容/ }).click();
  await adaptive.locator('.writing-textarea').fill('在整数背景下，本篇记 N 为含零自然数。DEF。'); await quiet(adaptive);
  await adaptive.locator('.writing-contents').getByRole('button', { name: /^背景与约定/ }).click();
  await adaptive.getByLabel('本节内容由哪里承担', { exact: true }).selectOption('form'); await quiet(adaptive);
  await adaptive.reload({ waitUntil: 'networkidle' }); await quiet(adaptive);
  assert.equal(await adaptive.getByLabel('本节内容由哪里承担', { exact: true }).inputValue(), 'form');
  await adaptive.locator('.writing-contents .writing-role-choices > summary').click();
  await adaptive.getByRole('checkbox', { name: '反例', exact: true }).check();
  await adaptive.getByRole('button', { name: '预览类型变更或模板升级', exact: true }).click();
  await adaptive.getByRole('button', { name: '采纳补充框架', exact: true }).click(); await quiet(adaptive);
  const adaptiveId = adaptive.url().split('/').at(-1), adaptiveDraft = await dbRead(adaptive, 'writing-drafts', adaptiveId);
  assert.ok(adaptiveDraft.markdown.includes('counterexample')); assert.ok(adaptiveDraft.markdown.includes('mcs-section:argument'));
  assert.ok(!adaptiveDraft.markdown.includes('mcs-section:applications'));
  await adaptive.getByRole('button', { name: '完整 Markdown', exact: true }).click();
  await adaptive.locator('.writing-textarea').fill(adaptiveDraft.markdown.replace('mcs-type: "notation"', 'mcs-type: "unfamiliar-role"')); await quiet(adaptive);
  await adaptive.locator('.writing-scope-warning').waitFor();
  assert.equal(await adaptive.getByLabel('对象类型', { exact: true }).inputValue(), 'unfamiliar-role');
  await adaptive.locator('.writing-contents .writing-role-choices > summary').click();
  await adaptive.locator('.writing-contents').evaluate(el => { el.scrollTop = 0; });
  await adaptive.screenshot({ path: join(screenshots, 'adaptive-desktop.png'), fullPage: true });
  await adaptive.setViewportSize({ width: 390, height: 844 });
  await adaptive.locator('.writing-mobile-tools').getByRole('button', { name: '章节目录' }).click();
  assert.ok(await adaptive.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await adaptive.screenshot({ path: join(screenshots, 'adaptive-mobile.png'), fullPage: true });
  await adaptiveContext.close();

  await page.goto(server.origin + '/nodes/group%3Asubgroup', { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: '围绕此节点写笔记' }).click();
  assert.ok((await page.getByLabel('笔记标题', { exact: true }).inputValue()).length);
  await page.getByLabel('对象类型', { exact: true }).selectOption('theorem');
  await page.getByLabel('展开方式', { exact: true }).selectOption('deep');
  await page.getByLabel('笔记标题', { exact: true }).fill('创作验收：中值定理');
  await page.getByLabel('读者基础', { exact: true }).fill('学过导数与连续');
  await page.getByRole('button', { name: '开始创作', exact: true }).click();
  await page.waitForURL(/\/library\/write\/[a-f0-9-]+$/); await quiet(page);
  const draftUrl = page.url(), draftId = draftUrl.split('/').at(-1);
  await page.locator('.writing-contents').getByRole('button', { name: /^直觉/ }).click();
  const intuition = '局部线性图景。\n\n$$f(a+h)=f(a)+f\prime(a)h+o(h)$$\n\n## 自定义观察\n\n[[旧笔记]]\n\n```md\n## 形式与条件\n<!-- mcs-section:form -->\n```';
  await page.locator('.writing-textarea').fill(intuition); await quiet(page);
  await page.getByLabel('章节状态', { exact: true }).selectOption('reviewed'); await quiet(page);
  await page.getByRole('button', { name: '完整 Markdown', exact: true }).click();
  const raw = await page.locator('.writing-textarea').inputValue();
  assert.ok(raw.includes(intuition)); assert.ok(raw.includes('mcs-status-intuition: "reviewed"'));
  await page.locator('.writing-textarea').fill(raw.replace('局部线性图景。', '局部线性图景，检查余项。')); await quiet(page);
  assert.ok((await page.locator('.writing-textarea').inputValue()).includes('mcs-status-intuition: "writing"'));
  await page.reload({ waitUntil: 'networkidle' }); await quiet(page);
  await page.getByRole('button', { name: '完整 Markdown', exact: true }).click();
  assert.ok((await page.locator('.writing-textarea').inputValue()).includes('检查余项'));
  await page.getByRole('button', { name: '阅读预览', exact: true }).click();
  assert.ok(await page.locator('.writing-editor .katex').count());
  const requests = []; page.on('request', request => { if (request.method() !== 'GET' && request.method() !== 'HEAD') requests.push(request.url()); });
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new DOMException('Permission denied', 'NotAllowedError'); } } }));
  await page.getByRole('button', { name: '当前章节提示词', exact: true }).click();
  const prompt = await page.getByLabel('提示词预览与手动复制', { exact: true }).inputValue();
  assert.ok(prompt.includes('心智图景')); assert.ok(!prompt.split('<reference-data>')[0].includes('## 应用')); assert.equal(requests.length, 0);
  await page.getByLabel('提示词预览与手动复制', { exact: true }).focus();
  assert.equal(await page.evaluate(() => document.activeElement.selectionStart), 0);
  await page.getByRole('button', { name: '保存笔记版本', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.writing-page .notice')?.textContent.includes('笔记版本已保存'));
  const saved = await dbRead(page, 'writing-drafts', draftId), library = await dbRead(page, 'vaults', saved.vaultId);
  assert.equal(library.id, 'browser-mcs-writing'); assert.equal(library.revision, 1);
  assert.deepEqual(library.files.find(f => f.id === saved.fileId).nodeIds, ['group:subgroup']);
  await page.locator('.writing-contents').getByRole('button', { name: /^直觉/ }).click();
  await page.locator('.writing-textarea').fill('修订二：$x^2$ 的局部线性化。'); await quiet(page);
  await page.getByRole('button', { name: '保存笔记版本', exact: true }).click(); await quiet(page);
  await page.waitForFunction(() => !document.querySelector('.writing-header button')?.disabled);
  assert.equal((await dbRead(page, 'vaults', saved.vaultId)).revision, 2);
  await page.getByRole('button', { name: '上传到我的账号', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.notice')?.textContent.includes('已主动上传'));
  assert.ok(requests.some(u => u.includes('/imports/')));

  // Two tabs start with the same CAS revision: stale autosave retains its live text.
  const second = await context.newPage(); await second.goto(draftUrl, { waitUntil: 'networkidle' }); await quiet(second);
  await page.locator('.writing-textarea').fill('第一标签页的新文字'); await quiet(page);
  await second.locator('.writing-textarea').fill('第二标签页待保全的文字');
  await second.getByRole('alert').filter({ hasText: '另一处已修改' }).waitFor();
  assert.ok((await second.locator('.writing-textarea').inputValue()).includes('待保全'));
  await second.getByRole('button', { name: '保留当前文字，另存一份', exact: true }).click();
  await second.waitForURL(url => url.pathname.includes('/library/write/') && !url.href.endsWith(draftId)); await quiet(second);
  await second.getByRole('button', { name: '完整 Markdown', exact: true }).click(); assert.ok((await second.locator('.writing-textarea').inputValue()).includes('待保全'));
  assert.ok((await dbRead(page, 'writing-drafts', draftId)).markdown.includes('第一标签页'));
  await second.close();

  // UI language changes do not rewrite an existing note's language or bytes.
  const beforeLocale = (await dbRead(page, 'writing-drafts', draftId)).markdown;
  await page.goto(server.origin + '/en/library/write/' + draftId, { waitUntil: 'networkidle' }); await quiet(page);
  await page.getByRole('button', { name: 'Full Markdown', exact: true }).click();
  assert.equal(await page.locator('.writing-textarea').inputValue(), beforeLocale);
  await page.screenshot({ path: join(screenshots, 'desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.writing-mobile-tools').getByRole('button', { name: 'Chapter guidance' }).click();
  assert.ok(await page.locator('.writing-guidance').isVisible());
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: join(screenshots, 'mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1500, height: 950 });

  // Fetch to a separate browser context preserves the whole cloud manifest and upload baseline.
  const remoteContext = await browser.newContext({ viewport: { width: 1400, height: 900 } }), remote = await remoteContext.newPage();
  await remote.goto(server.origin + '/library', { waitUntil: 'networkidle' });
  await remote.locator('.library-index').getByRole('button', { name: /MCS 创作/ }).last().click();
  await remote.getByRole('button', { name: '取回本机继续写', exact: true }).click(); await remote.waitForURL(/\/library\/write\//); await quiet(remote);
  const retrieved = await dbRead(remote, 'writing-drafts', remote.url().split('/').at(-1));
  const remoteLibrary = await dbRead(remote, 'vaults', retrieved.vaultId);
  assert.equal(remoteLibrary.files.length, library.files.length);
  await remote.locator('.writing-contents').getByRole('button', { name: /^直觉/ }).click();
  await remote.locator('.writing-textarea').fill('来自另一设备的修订'); await quiet(remote);
  await remote.getByRole('button', { name: '保存笔记版本', exact: true }).click(); await quiet(remote); await remote.waitForFunction(() => !document.querySelector('.writing-header button')?.disabled);
  // A failed chunk upload retains a resumable batch and does not switch the cloud revision.
  const chunksRoute = '**/imports/*/chunks/**';
  await remote.route(chunksRoute, route => route.abort('failed'));
  await remote.getByRole('button', { name: '上传到我的账号', exact: true }).click(); await remote.getByRole('alert').waitFor();
  assert.ok(await dbRead(remote, 'pending', ['upload', 'local', retrieved.vaultId]));
  await remote.unroute(chunksRoute);
  await remote.getByRole('button', { name: '上传到我的账号', exact: true }).click(); await remote.waitForFunction(() => document.querySelector('.notice')?.textContent.includes('已主动上传'));
  assert.equal(await dbRead(remote, 'pending', ['upload', 'local', retrieved.vaultId]), undefined);
  await remoteContext.close();
  // Local original upload sees that its mapped account revision has changed.
  await page.goto(draftUrl, { waitUntil: 'networkidle' }); await quiet(page);
  await page.getByRole('button', { name: '保存笔记版本', exact: true }).click(); await quiet(page); await page.waitForFunction(() => !document.querySelector('.writing-header button')?.disabled);
  await page.getByRole('button', { name: '上传到我的账号', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: /changed elsewhere|conflict|别处|修订/ }).waitFor();
  assert.ok((await dbRead(page, 'writing-drafts', draftId)).markdown.includes('第一标签页'));

  // Existing Obsidian import is copied with attachments, not edited in its source library.
  const importedContext = await browser.newContext({ viewport: { width: 1500, height: 950 } }), imported = await importedContext.newPage();
  const { libraryUrl } = await exerciseVaultPage(imported, server.origin, server.dir, { upload: false });
  const importedVaultId = new URL(libraryUrl, server.origin).searchParams.get('vault'), sourceBeforeCopy = await dbRead(imported, 'vaults', importedVaultId);
  await imported.goto(libraryUrl + '&revision=1', { waitUntil: 'networkidle' });
  await imported.getByRole('button', { name: '复制为创作稿', exact: true }).click(); await imported.waitForURL(/\/library\/write\//); await quiet(imported);
  const copiedId = imported.url().split('/').at(-1), copied = await dbRead(imported, 'writing-drafts', copiedId);
  assert.ok(copied.source); assert.ok(copied.assets.length >= 4); assert.ok(copied.warnings.length);
  await imported.getByRole('button', { name: '阅读预览', exact: true }).click();
  await imported.locator('.writing-editor .vault-attachment img').first().waitFor();
  await imported.locator('.writing-editor .vault-attachment audio').first().waitFor();
  await imported.locator('.writing-editor .vault-attachment video').first().waitFor();
  assert.ok(!(await imported.locator('.writing-editor .vault-document').innerText()).includes('mcs-template:'));
  await imported.getByRole('button', { name: '预览类型变更或模板升级' }).click();
  await imported.getByRole('button', { name: '采纳补充框架' }).click(); await quiet(imported);
  await imported.getByRole('button', { name: '完整 Markdown', exact: true }).click();
  assert.ok((await imported.locator('.writing-textarea').inputValue()).includes('正文独有检索词'));
  await imported.getByRole('button', { name: '保存笔记版本', exact: true }).click(); await quiet(imported); await imported.waitForFunction(() => !document.querySelector('.writing-header button')?.disabled);
  const copiedLibrary = await dbRead(imported, 'vaults', 'browser-mcs-writing');
  assert.ok(copiedLibrary.files.some(f => f.kind === 'attachment')); assert.ok(copiedLibrary.files.some(f => f.id === copied.fileId));
  assert.deepEqual(await dbRead(imported, 'vaults', importedVaultId), sourceBeforeCopy);
  await imported.goto(server.origin + `/library?vault=${copiedLibrary.id}&note=${copied.fileId}&storage=browser`, { waitUntil: 'networkidle' });
  await imported.locator('.vault-document .vault-attachment img').first().waitFor();
  await imported.locator('.vault-document .vault-attachment audio').first().waitFor();
  await imported.locator('.vault-document .vault-attachment video').first().waitFor();
  // Fetching a copied library must retain its whole attachment manifest too.
  await imported.getByRole('button', { name: '上传到我的账号', exact: true }).click();
  try { await imported.locator('.success').filter({ hasText: '已上传到账号' }).waitFor(); }
  catch (e) { console.error('Attachment upload messages:', await imported.locator('.error, .success').allTextContents()); throw e; }
  const copyMapping = await dbRead(imported, 'pending', ['local', copiedLibrary.id]);
  const attachmentContext = await browser.newContext(), attachmentPage = await attachmentContext.newPage();
  await attachmentPage.goto(server.origin + `/library?vault=${copyMapping.cloudId}&note=${copied.fileId}&storage=account`, { waitUntil: 'networkidle' });
  await attachmentPage.getByRole('button', { name: '取回本机继续写', exact: true }).click(); await attachmentPage.waitForURL(/\/library\/write\//); await quiet(attachmentPage);
  const attachmentDraft = await dbRead(attachmentPage, 'writing-drafts', attachmentPage.url().split('/').at(-1));
  const attachmentLibrary = await dbRead(attachmentPage, 'vaults', attachmentDraft.vaultId);
  const manifest = vault => vault.files.map(f => [f.id, f.path, f.size, f.sha256]).sort((a, b) => a[1].localeCompare(b[1]));
  assert.deepEqual(manifest(attachmentLibrary), manifest(copiedLibrary));
  await attachmentPage.getByRole('button', { name: '阅读预览', exact: true }).click();
  await attachmentPage.locator('.writing-editor .vault-attachment img').first().waitFor();
  await attachmentContext.close();
  await importedContext.close();

  // Keyboard editing, composition events, stale template previews and storage failures.
  const failureContext = await browser.newContext({ viewport: { width: 1500, height: 950 } }), failure = await failureContext.newPage();
  await failure.goto(server.origin + '/api/v2/health', { waitUntil: 'domcontentloaded' });
  await failure.evaluate(async () => {
    const db = await new Promise(resolve => {
      const r = indexedDB.open('mcs-private-vaults-v1', 1);
      r.onupgradeneeded = () => ['vaults', 'revisions', 'chunks', 'handles', 'pending'].forEach(name => r.result.createObjectStore(name));
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['vaults', 'revisions', 'pending'], 'readwrite');
      tx.objectStore('vaults').put({ id: 'browser-legacy', name: '旧库保留', revision: 5, storage: 'browser', files: [], createdAt: '2026-10-01', updatedAt: '2026-10-01' }, 'browser-legacy');
      tx.objectStore('revisions').put({ vaultId: 'browser-legacy', revision: 5, files: [] }, ['browser-legacy', 5]);
      tx.objectStore('pending').put({ cloudId: 'legacy-cloud', revision: 3 }, ['legacy-owner', 'browser-legacy']);
      tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
    }); db.close();
  });
  await failure.goto(server.origin + '/library/write/new', { waitUntil: 'networkidle' });
  await failure.getByLabel('笔记标题', { exact: true }).fill('恢复与输入验收');
  await failure.getByRole('button', { name: '开始创作', exact: true }).focus(); await failure.keyboard.press('Enter');
  await failure.waitForURL(/\/library\/write\/[a-f0-9-]+$/); await quiet(failure);
  assert.equal((await dbRead(failure, 'vaults', 'browser-legacy')).revision, 5);
  assert.equal((await dbRead(failure, 'revisions', ['browser-legacy', 5])).revision, 5);
  assert.deepEqual(await dbRead(failure, 'pending', ['legacy-owner', 'browser-legacy']), { cloudId: 'legacy-cloud', revision: 3 });
  const failureId = failure.url().split('/').at(-1);
  await failure.locator('.writing-textarea').focus(); await failure.keyboard.insertText('输入第一行');
  await failure.keyboard.press('End'); await failure.keyboard.press('Enter'); await failure.keyboard.insertText('第二行'); await quiet(failure);
  assert.ok((await failure.locator('.writing-textarea').inputValue()).includes('输入第一行\n第二行'));
  await failure.locator('.writing-textarea').dispatchEvent('compositionstart', { data: '' });
  await failure.keyboard.insertText('，中文组合输入');
  await failure.locator('.writing-textarea').dispatchEvent('compositionend', { data: '，中文组合输入' }); await quiet(failure);
  const composed = await failure.locator('.writing-textarea').inputValue(); assert.ok(composed.includes('中文组合输入'));
  await failure.getByLabel('对象类型', { exact: true }).selectOption('property');
  await failure.getByRole('button', { name: '预览类型变更或模板升级' }).click();
  await failure.locator('.writing-textarea').fill(composed + '\n预览期间的新文字'); await quiet(failure);
  await failure.getByRole('button', { name: '采纳补充框架' }).click();
  assert.ok(await failure.locator('.writing-proposal').isVisible());
  assert.ok((await failure.locator('.writing-textarea').inputValue()).includes('预览期间的新文字'));
  await failure.getByRole('button', { name: '采纳补充框架' }).click(); await quiet(failure);
  assert.ok((await dbRead(failure, 'writing-drafts', failureId)).markdown.includes('mcs-type: "property"'));

  // Delay the real save path, type while it commits, then verify snapshot and draft separately.
  await failure.evaluate(() => {
    window.originalEstimate = navigator.storage.estimate.bind(navigator.storage);
    navigator.storage.estimate = () => new Promise(resolve => { window.releaseEstimate = async () => resolve(await window.originalEstimate()); });
  });
  await failure.getByRole('button', { name: '保存笔记版本', exact: true }).click();
  await failure.waitForFunction(() => Boolean(window.releaseEstimate));
  await failure.locator('.writing-textarea').fill('保存进行时的新文字');
  await failure.evaluate(() => { navigator.storage.estimate = window.originalEstimate; void window.releaseEstimate(); }); await quiet(failure);
  await failure.waitForFunction(() => !document.querySelector('.writing-header button')?.disabled);
  const duringSave = await dbRead(failure, 'writing-drafts', failureId), snapshotVault = await dbRead(failure, 'vaults', duringSave.vaultId);
  assert.ok(duringSave.markdown.includes('保存进行时的新文字'));
  const snapshotFile = snapshotVault.files.find(f => f.id === duringSave.fileId);
  const snapshotBlob = await dbRead(failure, 'chunks', [snapshotFile.sha256, 0]);
  // Playwright cannot serialize Blob bytes directly through dbRead, so read in the page.
  assert.ok(snapshotBlob !== undefined);
  const snapshotText = await failure.evaluate(async hash => {
    const db = await new Promise(resolve => { const r = indexedDB.open('mcs-private-vaults-v1'); r.onsuccess = () => resolve(r.result); });
    const blob = await new Promise(resolve => { const r = db.transaction('chunks').objectStore('chunks').get([hash, 0]); r.onsuccess = () => resolve(r.result); }); db.close(); return blob.text();
  }, snapshotFile.sha256);
  assert.ok(snapshotText.includes('预览期间的新文字')); assert.ok(!snapshotText.includes('保存进行时的新文字'));

  // Quota failure rolls back the revision; the saved draft and live editor survive.
  await failure.evaluate(() => { navigator.storage.estimate = async () => ({ quota: 1, usage: 1 }); });
  await failure.getByRole('button', { name: '保存笔记版本', exact: true }).click(); await failure.getByRole('alert').waitFor();
  assert.equal((await dbRead(failure, 'vaults', duringSave.vaultId)).revision, snapshotVault.revision);
  assert.ok((await failure.locator('.writing-textarea').inputValue()).includes('保存进行时的新文字'));
  await failure.evaluate(() => { navigator.storage.estimate = window.originalEstimate; });

  // Failed IndexedDB writes never display a successful autosave receipt.
  const beforeFailure = await dbRead(failure, 'writing-drafts', failureId);
  await failure.evaluate(() => {
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'writing-drafts' && window.failDraftWrite) throw new DOMException('Full', 'QuotaExceededError');
      return originalPut.apply(this, args);
    }; window.failDraftWrite = true;
  });
  await failure.locator('.writing-textarea').fill('空间不足时也要保全的文字');
  await failure.getByRole('alert').filter({ hasText: '草稿暂存失败' }).waitFor();
  assert.equal((await dbRead(failure, 'writing-drafts', failureId)).markdown, beforeFailure.markdown);
  assert.ok((await failure.locator('.writing-autosave').textContent()).includes('失败'));
  const downloadEvent = failure.waitForEvent('download'); await failure.getByRole('button', { name: '下载 Markdown' }).click();
  const downloaded = await downloadEvent; const downloadPath = join(server.dir, 'recovered.md'); await downloaded.saveAs(downloadPath);
  assert.ok(readFileSync(downloadPath, 'utf8').includes('空间不足时也要保全的文字'));
  await failure.evaluate(() => { window.failDraftWrite = false; });
  await failure.getByRole('button', { name: '保留当前文字，另存一份' }).click(); await failure.waitForURL(url => !url.href.endsWith(failureId)); await quiet(failure);
  assert.ok((await failure.locator('.writing-textarea').inputValue()).includes('空间不足时也要保全的文字'));
  await failure.getByRole('button', { name: '保存笔记版本', exact: true }).click(); await quiet(failure); await failure.waitForFunction(() => !document.querySelector('.writing-header button')?.disabled);
  const branchedDraft = await dbRead(failure, 'writing-drafts', failure.url().split('/').at(-1));
  // A different operation saves a competing target note (rather than merely a draft).
  await failure.evaluate(async ({ vaultId, fileId }) => {
    const db = await new Promise(resolve => { const r = indexedDB.open('mcs-private-vaults-v1'); r.onsuccess = () => resolve(r.result); });
    const vault = await new Promise(resolve => { const r = db.transaction('vaults').objectStore('vaults').get(vaultId); r.onsuccess = () => resolve(r.result); });
    const bytes = new TextEncoder().encode('# 外部操作保存的新笔记\n'), hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
    vault.revision++; const file = vault.files.find(f => f.id === fileId); file.sha256 = hash; file.size = bytes.length; file.sourceRevision = vault.revision;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['vaults', 'revisions', 'chunks'], 'readwrite');
      tx.objectStore('chunks').put(new Blob([bytes]), [hash, 0]); tx.objectStore('vaults').put(vault, vaultId);
      tx.objectStore('revisions').put({ vaultId, revision: vault.revision, createdAt: new Date().toISOString(), files: vault.files }, [vaultId, vault.revision]);
      tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
    }); db.close();
  }, branchedDraft);
  const competingVault = await dbRead(failure, 'vaults', branchedDraft.vaultId);
  await failure.getByRole('button', { name: '保存笔记版本', exact: true }).click(); await failure.getByRole('alert').filter({ hasText: '已保存的笔记在别处改变' }).waitFor();
  await failure.getByRole('button', { name: '上传到我的账号', exact: true }).click(); await failure.getByRole('alert').filter({ hasText: '已保存的笔记在别处改变' }).waitFor();
  assert.deepEqual(await dbRead(failure, 'vaults', branchedDraft.vaultId), competingVault);
  assert.ok((await failure.locator('.writing-textarea').inputValue()).includes('空间不足时也要保全的文字'));
  await failureContext.close();

  // Frontend session stub: logout during upload preflight cancels it before any
  // account write, and a second identity receives its own upload mapping.
  // Real backend ownership and CSRF are exercised in auth.test.mjs / https-public.mjs.
  const identityContext = await browser.newContext(), identityPage = await identityContext.newPage();
  let identityUser = { id: 'writer-a', email: 'writer-a@example.test', role: 'learner' };
  await identityPage.route('**/api/v2/auth/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/session')) return route.fulfill({ json: { ok: true, data: { mode: 'supabase', user: identityUser, csrfToken: identityUser ? 'test-csrf' : null } } });
    if (pathname.endsWith('/logout')) { identityUser = null; return route.fulfill({ json: { ok: true, data: { signedOut: true } } }); }
    if (pathname.endsWith('/login')) { identityUser = { id: 'writer-b', email: 'writer-b@example.test', role: 'learner' }; return route.fulfill({ json: { ok: true, data: { signedIn: true } } }); }
    return route.continue();
  });
  // This local test server normally returns owner "local"; keep the frontend
  // identity fixture consistent so unrelated owner checks do not refresh it.
  await identityPage.route('**/api/v2/me/connection-notes**', route => route.fulfill({ json: { ok: true, data: { ownerId: identityUser?.id ?? 'guest', notes: [] } } }));
  await identityPage.goto(server.origin + '/library/write/new', { waitUntil: 'domcontentloaded' });
  await identityPage.locator('.auth-email').filter({ hasText: 'writer-a@example.test' }).waitFor();
  await identityPage.getByLabel('笔记标题', { exact: true }).fill('账号请求隔离');
  await identityPage.getByRole('button', { name: '开始创作', exact: true }).click(); await identityPage.waitForURL(/\/library\/write\/[a-f0-9-]+$/); await quiet(identityPage);
  const identityUrl = identityPage.url(), identityId = identityUrl.split('/').at(-1);
  await identityPage.locator('.writing-textarea').fill('切换账号时保留本机文字'); await quiet(identityPage);
  await identityPage.getByRole('button', { name: '保存笔记版本', exact: true }).click(); await quiet(identityPage); await identityPage.waitForFunction(() => !document.querySelector('.writing-header button')?.disabled);
  const identityWrites = []; identityPage.on('request', r => { if (r.method() !== 'GET' && r.url().includes('/me/vaults')) identityWrites.push(r.url()); });
  await identityPage.evaluate(() => {
    window.realDigest = crypto.subtle.digest.bind(crypto.subtle);
    crypto.subtle.digest = (...args) => new Promise(resolve => { window.releaseDigest = async () => resolve(await window.realDigest(...args)); });
  });
  await identityPage.getByRole('button', { name: '上传到我的账号', exact: true }).click();
  try { await identityPage.waitForFunction(() => Boolean(window.releaseDigest)); }
  catch (e) { console.error('Identity preflight state:', await identityPage.locator('.writing-page').innerText()); throw e; }
  await identityPage.locator('.auth-status-bar').getByRole('button', { name: '退出', exact: true }).click();
  await identityPage.locator('.auth-status-bar').getByRole('link', { name: '登录', exact: true }).waitFor();
  await identityPage.evaluate(() => { crypto.subtle.digest = window.realDigest; void window.releaseDigest(); });
  assert.deepEqual(identityWrites, []);
  const identityDraft = await dbRead(identityPage, 'writing-drafts', identityId);
  assert.equal(await dbRead(identityPage, 'pending', ['writer-a', identityDraft.vaultId]), undefined);
  assert.ok((await identityPage.locator('.writing-textarea').inputValue()).includes('保留本机文字'));
  await identityPage.locator('.auth-status-bar').getByRole('link', { name: '登录', exact: true }).click();
  await identityPage.getByLabel('邮箱', { exact: true }).fill('writer-b@example.test');
  await identityPage.getByLabel('密码', { exact: true }).fill('testing-password-long');
  await identityPage.getByRole('button', { name: '登录', exact: true }).click(); await identityPage.waitForURL(url => !url.pathname.endsWith('/login'));
  // Auth is stubbed only in this context: wait for the semantic ready state,
  // rather than requiring all unrelated profile polling to become idle.
  await identityPage.goto(identityUrl, { waitUntil: 'domcontentloaded' }); await quiet(identityPage);
  await identityPage.locator('.auth-email').filter({ hasText: 'writer-b@example.test' }).waitFor();
  await identityPage.getByRole('button', { name: '上传到我的账号', exact: true }).click();
  try { await identityPage.locator('.writing-page .notice').filter({ hasText: '已主动上传' }).waitFor(); }
  catch (e) { console.error('Identity upload messages:', await identityPage.locator('[role="alert"], .notice').allTextContents()); throw e; }
  assert.ok(await dbRead(identityPage, 'pending', ['writer-b', identityDraft.vaultId]));
  assert.equal(await dbRead(identityPage, 'pending', ['writer-a', identityDraft.vaultId]), undefined);
  await identityContext.close();
  assert.deepEqual(errors, []);
  console.log('✓ 创作：节点入口、正文/公式保全、恢复、审校状态、剪贴板回退、历史、主动上传/断点恢复、双标签与云端冲突、账号取回、旧稿附件、预览并发、保存期间输入、空间不足/暂存失败/下载恢复、账号切换取消与映射隔离、组合输入事件、键盘、双语和窄屏');
} finally { await browser?.close(); await server.cleanup(); }
