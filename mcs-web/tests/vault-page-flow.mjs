import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export async function exerciseVaultPage(page, origin, directory, { upload = false } = {}) {
  const root = join(directory, 'TestVault'); mkdirSync(join(root, '数学'), { recursive: true }); mkdirSync(join(root, '.obsidian'), { recursive: true });
  writeFileSync(join(root, '.obsidian', 'private.md'), '# must not import');
  writeFileSync(join(root, '数学', '极限.md'), '---\naliases: [我的极限]\ntags: [analysis]\n---\n# 我的极限\n$\\lim_{n\\to\\infty} a_n$\n[[群#性质]]\n![[群]]\n![[pixel.png]]\n[PDF](paper.pdf)\n![[audio.wav]]\n![[clip.mp4]]\n正文独有检索词\n');
  writeFileSync(join(root, '数学', '群.md'), '# 群\n## 性质\n群的说明 ^group-block\n[[极限]]\n![[极限]]\n');
  writeFileSync(join(root, 'pixel.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aHiEAAAAASUVORK5CYII=', 'base64'));
  writeFileSync(join(root, 'paper.pdf'), '%PDF-1.4\n%%EOF\n');
  const wav = Buffer.alloc(46); wav.write('RIFF', 0); wav.writeUInt32LE(38, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(2, 40); writeFileSync(join(root, 'audio.wav'), wav);
  writeFileSync(join(root, 'clip.mp4'), Buffer.from('test unsupported codec'));
  let uploaded = 0;
  const watch = request => { if (/\/api\/v2\/me\/vaults/.test(request.url()) && ['POST', 'PUT'].includes(request.method())) uploaded++; };
  page.on('request', watch);
  await page.goto(origin + '/library', { waitUntil: 'networkidle' });
  await page.evaluate(() => { window.showDirectoryPicker = undefined; });
  await page.locator('input[webkitdirectory]').setInputFiles(root);
  await page.getByRole('button', { name: '预览变更', exact: true }).waitFor();
  assert.equal(await page.locator('.library-file-choice').count(), 2);
  await page.getByRole('button', { name: '预览变更', exact: true }).click();
  await page.locator('.library-diff').waitFor();
  await page.getByRole('button', { name: '导入到当前浏览器', exact: true }).click();
  await page.locator('.library-reader article').waitFor();
  await page.getByRole('button', { name: /数学\/极限.md/ }).click();
  await page.locator('.vault-document .katex').first().waitFor();
  // Attachment blobs load after the Markdown/KaTeX frame has rendered.
  await page.locator('.vault-document img').first().waitFor();
  await page.locator('.vault-document audio').first().waitFor(); await page.locator('.vault-document video').first().waitFor();
  await page.locator('.vault-document').getByRole('link', { name: 'paper.pdf', exact: true }).first().waitFor();
  await page.locator('#block-group-block').first().waitFor();
  await page.locator('.library-reader section').filter({ has: page.getByRole('heading', { name: '反向链接', exact: true }) }).getByRole('button', { name: '数学/群.md', exact: true }).waitFor();
  assert.ok((await page.locator('.vault-document').first().innerText()).includes('循环引用'));
  assert.equal(uploaded, 0, 'browser import never uploads notes or attachments');
  await page.getByLabel('查找要关联的节点', { exact: true }).fill('group:cayley');
  await page.locator('.library-related').getByRole('button').first().click();
  await page.locator('.library-related').getByRole('link').first().waitFor();
  const nodeHref = await page.locator('.library-related').getByRole('link').first().getAttribute('href');
  const libraryUrl = page.url();
  await page.goto(origin + nodeHref, { waitUntil: 'networkidle' });
  await page.locator('.related-vault-notes').getByRole('link', { name: '我的极限', exact: true }).waitFor();
  await page.goto(libraryUrl, { waitUntil: 'networkidle' });
  await page.getByLabel('搜索笔记与正文', { exact: true }).fill('正文独有检索词');
  await page.waitForFunction(() => document.querySelectorAll('.library-note-button').length === 1);
  await page.getByLabel('搜索笔记与正文', { exact: true }).fill('');
  await page.getByRole('button', { name: '重新扫描', exact: true }).click();
  writeFileSync(join(root, '数学', '极限.md'), '# 我的极限\n更新后的正文\n[[群]]\n');
  await page.locator('input[webkitdirectory]').setInputFiles(root);
  await page.getByRole('button', { name: '预览变更', exact: true }).click(); await page.locator('.library-diff').waitFor();
  await page.evaluate(() => {
    window.__vaultEstimate = navigator.storage.estimate.bind(navigator.storage);
    navigator.storage.estimate = async () => ({ quota: 1, usage: 1 });
  });
  await page.getByRole('button', { name: '导入到当前浏览器', exact: true }).click();
  await page.locator('.error').filter({ hasText: 'Browser storage is full' }).waitFor();
  assert.ok((await page.locator('.library-reader').innerText()).includes('正文独有检索词'), 'quota failure retains the current copy');
  await page.evaluate(() => { navigator.storage.estimate = window.__vaultEstimate; delete window.__vaultEstimate; });
  await page.getByRole('button', { name: '导入到当前浏览器', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.library-reader')?.textContent.includes('更新后的正文'));
  await page.getByLabel('历史版本', { exact: true }).selectOption('1');
  await page.waitForFunction(() => document.querySelector('.library-reader')?.textContent.includes('正文独有检索词'));
  await page.getByLabel('历史版本', { exact: true }).selectOption('');
  await page.waitForFunction(() => document.querySelector('.library-reader')?.textContent.includes('更新后的正文'));
  if (upload) {
    await page.getByRole('button', { name: '上传到我的账号', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.success')?.textContent.includes('已上传到账号'));
    await page.locator('.library-index').getByRole('button', { name: /TestVault/ }).last().click();
    await page.waitForFunction(() => document.querySelector('.library-reader')?.textContent.includes('账号私有副本'));
    await page.waitForFunction(() => document.querySelector('.library-reader')?.textContent.includes('更新后的正文'));
    assert.ok(uploaded > 0);
  }
  page.off('request', watch);
  return { libraryUrl, nodeHref };
}
