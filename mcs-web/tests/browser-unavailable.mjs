/*
 * 「本机没有可用的浏览器运行时」时被导入的替身模块。
 *
 * 它做两件事：把**怎么装**说清楚，然后决定这次跑是跳过还是失败。
 * 之所以用「导入即退出」而不是让每个测试各自 try/catch：20 个浏览器验收脚本
 * 共用同一套 `const { chromium } = await import(PLAYWRIGHT)` 开头，
 * 一处说清楚比二十处各写一遍更不容易走样。
 *
 * - 默认（开发机）：打印说明，退出码 0 —— 新克隆的仓库 `npm test` 不该因为没装浏览器而红。
 * - `MCS_WEB_REQUIRE_BROWSER=1`（CI）：退出码 1 —— 绿必须是真跑过。
 */
const strict = process.env.MCS_WEB_REQUIRE_BROWSER === '1';

console.error(`
[跳过] 没有找到可用的浏览器测试运行时。

装法（二选一）：
  1. 在 mcs-web 目录执行  npm install   （会装上 playwright-core），
     并确保本机装有 Chrome / Edge / Chromium；
  2. 或安装完整 Playwright：  npm install --no-save playwright
     && npx playwright install chromium

也可以显式指定：
  MCS_WEB_PLAYWRIGHT=<包名或路径>  MCS_WEB_CHROME=<浏览器可执行文件>

本机解析结果：${process.env.MCS_WEB_PLAYWRIGHT ?? '(未指定)'}
`);

process.exit(strict ? 1 : 0);

export const chromium = null;
