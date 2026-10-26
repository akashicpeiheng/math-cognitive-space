/**
 * 首帧外观引导脚本（2026-10-16 加，第一百零九轮）。
 *
 * ## 为什么是**外链同步脚本**而不是内联脚本
 *
 * 它必须在第一帧之前跑完，所以要么内联、要么同步外链。生产模式的安全头把 CSP 收紧到
 * `script-src 'self'`（见 `server/deployment.mjs`），内联脚本会被浏览器直接拒绝执行，
 * 于是站点的深色用户每次首帧都会看到一闪的浅色。这里是外链的普通脚本（不是 module：
 * module 默认延迟到解析之后，来不及）。
 *
 * ## 它与 `web/src/theme-mode.ts` 是同一套规则的两份实现
 *
 * 原因同上：这里是浏览器在 React 之前跑的第一段代码，不能 import TypeScript。
 * 两份实现必须一致的三件事——存储键、媒体查询、解析规则——由
 * `tests/theme-tokens.test.mjs` 逐条断言（键名与查询串做源码匹配，规则用同一组用例比对），
 * 因此「改了 TS 忘了改这里」会被测试抓住，而不是靠记忆。
 */
(function bootTheme() {
  var KEY = 'mcs-theme-v1';
  var QUERY = '(prefers-color-scheme: dark)';
  var root = document.documentElement;

  var preference = 'system';
  try {
    var raw = window.localStorage.getItem(KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') preference = raw;
  } catch (error) {
    /* 存储被禁用：按跟随系统处理。 */
  }

  var prefersDark = false;
  try {
    prefersDark = window.matchMedia(QUERY).matches;
  } catch (error) {
    /* 拿不到 matchMedia：按浅色处理。 */
  }

  var resolved = preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;
  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-theme-preference', preference);

  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#14101f' : '#6d28d9');
})();
