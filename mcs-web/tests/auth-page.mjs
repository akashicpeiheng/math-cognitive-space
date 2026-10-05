import { startTestServer } from './helpers.mjs';

import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/**
 * 账号入口的定点验收（2026-10-05 加）。
 *
 * ## 为什么单独一条
 *
 * 账号层最容易犯的错不是"登录不好用"，而是**给本机工作台加了一道登录墙**：
 * 本机模式没有账号（身份固定为本机管理员），一旦界面在这里也画登录入口或门禁，
 * 使用者会被要求登录一个根本不存在的账号。
 *
 * 所以这一条盯的是**本机模式下的行为不变**：
 * 1. `/login` 能打开，并明确说"本机模式没有在线账号"，且给回首页的入口；
 * 2. 页头不出现「登录」或「退出」；
 * 3. 个人页面（`/profile`）**不被**门禁拦住——照常显示本机档案那套界面；
 * 4. 全程无控制台错误（渲染期异常会被错误边界接住，但那也是失败）。
 *
 * 公网模式那半边（真登录、越权 404、CSRF）由 `tests/auth.test.mjs` 在 HTTP 层验收——
 * 那需要身份服务凭据，不适合放进浏览器验收。
 */
const server = await startTestServer();

let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  // ---- 1) 登录页：说清本机模式没有账号 -------------------------------------
  await page.goto(server.origin + '/login', { waitUntil: 'networkidle' });
  const loginText = await page.locator('main').innerText();
  check('本机模式下 /login 能打开并说明没有在线账号',
    /本机模式没有在线账号/.test(loginText), loginText.slice(0, 160));
  check('登录页给出回首页的入口（不是一个死胡同）',
    await page.locator('main a[href="/"]').count() > 0);
  check('登录页不出现邮箱 / 密码表单（本机模式不该要凭据）',
    await page.locator('input[type="password"]').count() === 0);

  // ---- 2) 页头没有登录入口 -------------------------------------------------
  await page.goto(server.origin + '/', { waitUntil: 'networkidle' });
  const headerText = await page.locator('header').innerText().catch(() => '');
  check('本机模式页头不出现「登录」', !/登录/.test(headerText), headerText.slice(0, 120));
  check('本机模式页头不出现「退出」', !/退出/.test(headerText));

  // ---- 3) 个人页面不被门禁拦住 ---------------------------------------------
  await page.goto(server.origin + '/profile', { waitUntil: 'networkidle' });
  const profileText = await page.locator('main').innerText();
  check('本机模式下 /profile 不被"请先登录"拦住',
    !/请先登录/.test(profileText), profileText.slice(0, 160));
  check('本机模式下 /profile 是本机那套界面（有档案选择或新建入口）',
    /档案/.test(profileText));

  // ---- 4) 档案列表真的加载出来了（接线顺序的回归点） -----------------------
  /*
   * 这一条是实测抓到的缺陷：`AuthProvider` 与 `ProfileProvider` 嵌套顺序反了时，
   * 档案加载的 effect 读到默认上下文（`ready: false`）就永远提前返回，
   * 页面上档案下拉框一个选项都没有。断言直接盯**下拉框里有没有选项**。
   */
  const options = await page.locator('#profile-select option').count();
  check('档案选择器里真的装进了选项（认证层与档案层的接线顺序正确）', options > 0, `options=${options}`);

  check('账号相关页面没有控制台错误', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
} catch (error) {
  failures.push('EXCEPTION ' + (error?.message ?? String(error)));
  console.error(error);
} finally {
  if (browser) await browser.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n账号入口验收失败：\n - ' + failures.join('\n - '));
  process.exit(1);
}
console.log('\n账号入口验收通过。');
