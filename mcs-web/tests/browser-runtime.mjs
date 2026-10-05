/*
 * 浏览器测试的运行时解析（2026-10，发布前改造）。
 *
 * ## 为什么单独一层
 *
 * 从前 19 个浏览器验收脚本各自写死两行常量：一行指向某台开发机的
 * Playwright 缓存（`.../codex-runtimes/.../node_modules/playwright/index.mjs`），
 * 一行指向该机器的 Chrome 安装路径。那是一台机器的布局：
 *
 * 别人克隆仓库后这两条必然失效——测试不是「跑不过」，
 * 而是根本没进入测试就报模块找不到，失败信息还指向一个陌生人电脑上的目录。
 *
 * 现在解析顺序统一在这里：
 *
 * 1. 环境变量 `MCS_WEB_PLAYWRIGHT`（包名或文件路径）——CI 与特殊环境用；
 * 2. `node_modules` 里的 `playwright` / `playwright-core`；
 * 3. 都找不到时，指到 `browser-unavailable.mjs`：它会打印**怎么装**并退出，
 *    而不是抛一个 `Cannot find module` 的栈。
 *
 * 浏览器（Chromium）解析顺序：`MCS_WEB_CHROME` → 各平台常见安装位置 →
 * 交给 Playwright 自带的浏览器（完整 `playwright` 包才有）。
 *
 * ## 严格模式
 *
 * 默认「找不到浏览器 = 跳过（退出码 0）并明确打印」，这样新克隆的仓库
 * `npm test` 不会因为本机没装浏览器而失败。CI 设 `MCS_WEB_REQUIRE_BROWSER=1`
 * 之后跳过变成失败——绿必须是真跑过。
 */
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

const UNAVAILABLE_MODULE = new URL('./browser-unavailable.mjs', import.meta.url).href;

function resolvePlaywrightPackage() {
  const override = process.env.MCS_WEB_PLAYWRIGHT;
  if (override) {
    // 既接受包名（`playwright`），也接受文件路径与 file: URL。
    if (/^[a-zA-Z@][^\\/]*$/.test(override) && !override.includes(':')) return override;
    return override.startsWith('file:') ? override : pathToFileURL(override).href;
  }
  for (const candidate of ['playwright', 'playwright-core']) {
    try {
      require.resolve(candidate);
      return candidate;
    } catch { /* 未安装，继续找下一个 */ }
  }
  return null;
}

function candidateChromePaths() {
  const explicit = process.env.MCS_WEB_CHROME;
  if (explicit) return [explicit];
  if (process.platform === 'win32') {
    const roots = [
      [process.env.ProgramFiles, ['Google', 'Chrome', 'Application', 'chrome.exe']],
      [process.env.ProgramFiles, ['Microsoft', 'Edge', 'Application', 'msedge.exe']],
      [process.env['ProgramFiles(x86)'], ['Google', 'Chrome', 'Application', 'chrome.exe']],
      [process.env['ProgramFiles(x86)'], ['Microsoft', 'Edge', 'Application', 'msedge.exe']],
      [process.env.LOCALAPPDATA, ['Google', 'Chrome', 'Application', 'chrome.exe']],
    ];
    return roots.filter(([base]) => Boolean(base)).map(([base, segments]) => join(base, ...segments));
  }
  if (process.platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ];
  }
  return [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ];
}

export function resolveChromePath() {
  for (const path of candidateChromePaths()) {
    if (path && existsSync(path)) return path;
  }
  return null;
}

function resolveSpecifier() {
  const pkg = resolvePlaywrightPackage();
  if (!pkg) return UNAVAILABLE_MODULE;
  /*
   * 完整 `playwright` 自带浏览器，缺系统 Chrome 也能跑；
   * `playwright-core` 不自带，必须找到系统里的 Chromium 内核。
   */
  if (pkg === 'playwright-core' && !resolveChromePath()) return UNAVAILABLE_MODULE;
  return pkg;
}

/** `await import(PLAYWRIGHT)` 的模块说明符；永远是合法的，失败信息由它自己给。 */
export const PLAYWRIGHT_SPECIFIER = resolveSpecifier();

/** 传给 `chromium.launch({ executablePath })` 的路径；null = 用 Playwright 自带的。 */
export const CHROME_PATH = resolveChromePath();

/** 调试用：把解析结果打印成人能读的一行。 */
export function describeBrowserRuntime() {
  const parts = [
    `platform=${process.platform}`,
    `playwright=${resolvePlaywrightPackage() ?? '(未安装)'}`,
    `chrome=${CHROME_PATH ?? '(未找到，使用 Playwright 自带浏览器)'}`,
    `strict=${process.env.MCS_WEB_REQUIRE_BROWSER === '1' ? 'yes' : 'no'}`,
  ];
  return parts.join(' ');
}
