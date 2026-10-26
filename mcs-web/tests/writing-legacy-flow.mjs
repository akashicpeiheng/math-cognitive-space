import assert from 'node:assert/strict';
import { createWritingDocument, updateDocumentMetadata, documentMetadata } from '../shared/writing-document.mjs';
import { TEMPLATE_ID } from '../shared/writing-template.mjs';

/** Exercise the real edit/copy routes; an old template must not force a new note. */
export async function exerciseLegacyTemplate(browser, origin) {
  const context = await browser.newContext(), page = await context.newPage();
  const quiet = () => page.waitForFunction(() => document.querySelector('.writing-autosave')?.textContent.includes('草稿已暂存'));
  const store = (action, key) => page.evaluate(async ({ action, key }) => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('mcs-private-vaults-v1'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('writing-drafts', action === 'delete' ? 'readwrite' : 'readonly');
        const request = tx.objectStore('writing-drafts')[action](key);
        tx.oncomplete = () => resolve(request.result); tx.onerror = () => reject(tx.error);
      });
    } finally { db.close(); }
  }, { action, key });
  try {
    await page.goto(origin + '/library/write/new');
    await page.getByLabel('笔记标题', { exact: true }).fill('旧模板兼容检查');
    await page.getByRole('button', { name: '开始创作', exact: true }).click();
    await page.waitForURL(/\/library\/write\/(?!new)/); await quiet();
    const id = page.url().split('/').at(-1);
    const legacy = updateDocumentMetadata(createWritingDocument({ title: '旧模板兼容检查', type: 'notation' }), {
      'mcs-template': 'mcs-object-note', 'mcs-template-version': '2026-10-15.1',
    }) + '\n## 自定义段落\n\n保留 $x$ 与 [[旧链接]]。\n';
    await page.getByRole('button', { name: '完整 Markdown', exact: true }).click();
    await page.locator('.writing-textarea').fill(legacy); await quiet();
    await page.getByRole('button', { name: '保存笔记版本', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.notice')?.textContent.includes('笔记版本已保存'));
    const saved = await store('get', id);
    await page.goto(origin + `/library?vault=${saved.vaultId}&note=${saved.fileId}`);
    await store('delete', id); // Remove the draft cache, so reopening must read the saved file.
    await page.getByRole('button', { name: '继续创作', exact: true }).click();
    await page.waitForURL(/\/library\/write\//); await quiet();
    const reopened = await store('get', page.url().split('/').at(-1));
    assert.equal(reopened.fileId, saved.fileId); assert.equal(reopened.path, saved.path);
    assert.equal(reopened.markdown, legacy); assert.equal(reopened.source, undefined);
    await page.getByRole('button', { name: '保存笔记版本', exact: true }).click(); await quiet();
    assert.equal(documentMetadata((await store('get', reopened.id)).markdown).templateId, 'mcs-object-note');
    await page.getByRole('button', { name: '预览类型变更或模板升级', exact: true }).click();
    assert.equal((await store('get', reopened.id)).markdown, legacy);
    await page.getByRole('button', { name: '采纳补充框架', exact: true }).click(); await quiet();
    const upgraded = await store('get', reopened.id);
    assert.equal(documentMetadata(upgraded.markdown).templateId, TEMPLATE_ID);
    assert(upgraded.markdown.includes('保留 $x$ 与 [[旧链接]]。'));
    assert(!upgraded.markdown.includes('```mcs-node'));
    // Copying is an explicit new private file, but does not silently upgrade its template.
    await page.goto(origin + `/library?vault=${saved.vaultId}&note=${saved.fileId}`);
    await page.getByRole('button', { name: '复制为创作稿', exact: true }).click();
    await page.waitForURL(/\/library\/write\//); await quiet();
    const copied = await store('get', page.url().split('/').at(-1));
    assert.notEqual(copied.fileId, saved.fileId); assert(copied.source);
    assert.equal(documentMetadata(copied.markdown).templateId, 'mcs-object-note');
    assert.equal(documentMetadata(copied.markdown).templateVersion, '2026-10-15.1');
    assert(copied.markdown.includes('保留 $x$ 与 [[旧链接]]。'));
    console.log('✓ 旧模板：读取同一笔记、保存/复制不升级、显式预览升级、私人格式保留');
  } finally { await context.close(); }
}
