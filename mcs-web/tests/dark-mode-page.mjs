import { resolve } from 'node:path';
import { startTestServer } from './helpers.mjs';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';

import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/**
 * 暗色模式的浏览器验收（2026-10-16 加，第一百零九轮）。
 *
 * 单元断言（`tests/theme-tokens.test.mjs`）只能证明**取值成对、对比度达标**；
 * 它们证明不了「切过去之后页面真的变暗了」。这一套盯的就是后者，四件事：
 *
 * 1. **三态与持久化**：选深色 → 根元素属性、`color-scheme`、`theme-color` 都跟着变，
 *    写进 localStorage，刷新与换页后仍然是深色；
 * 2. **跟随系统**：偏好为 `system` 时，模拟系统深色就变深、系统浅色就变浅（`emulateMedia`）；
 *    而**显式选过浅色之后，系统再深也不跟随**——这是三态最容易做错的一条；
 * 3. **首帧**：深色系统下第一次进入就带 `data-theme="dark"`（引导脚本在 React 之前跑完，
 *    因此没有「先亮一下再变暗」）；
 * 4. **真的变暗了**：对页面与画布上几处关键底色取**计算值**，断言深色下不再是浅色；
 *    浅色与深色两次取值必须不同。这一条是整套里唯一能抓到「令牌写了但没人用」的断言。
 *
 * 另外核对深色下知识网络画布的节点文字与底色对比（抽点 ≥4.5:1）以及无控制台错误。
 */

const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });

  /*
   * 每一个场景一个**干净上下文**：外观是 localStorage 里的本机偏好，
   * 复用上下文会让上一个场景的偏好漏进下一个。
   */
  const freshPage = async ({ colorScheme = 'light', viewport = { width: 1440, height: 1000 } } = {}) => {
    const context = await browser.newContext({ viewport, colorScheme });
    const page = await context.newPage();
    const errors = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(error.message));
    return { context, page, errors };
  };

  /** 页面上的几个「底色样本」：外壳、卡片、画布、顶栏，以及解析结果。 */
  const sampleTheme = (page) => page.evaluate(() => {
    const root = document.documentElement;
    const style = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const computed = getComputedStyle(element);
      return { background: computed.backgroundColor, color: computed.color, image: computed.backgroundImage.slice(0, 120) };
    };
    const toRgb = (value) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const luminance = (value) => {
      const [r, g, b] = toRgb(value).map((channel) => {
        const c = channel / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    return {
      theme: root.getAttribute('data-theme'),
      preference: root.getAttribute('data-theme-preference'),
      colorScheme: getComputedStyle(root).colorScheme,
      themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null,
      stored: window.localStorage.getItem('mcs-theme-v1'),
      picker: document.querySelector('#theme-select')?.value ?? null,
      body: style('body'),
      topbar: style('.topbar'),
      card: style('.card'),
      paperLuminance: luminance(getComputedStyle(document.body).backgroundColor),
      shellLuminance: (() => { const value = getComputedStyle(root).getPropertyValue('--bg').trim(); return value; })(),
    };
  });

  /* ---------- 1. 显式选深色 ---------- */
  {
    const { context, page, errors } = await freshPage();
    await page.goto(server.origin + '/start', { waitUntil: 'networkidle' });
    const lightSample = await sampleTheme(page);
    check('默认（无本机存储）跟随系统：浅色系统给浅色', lightSample.theme === 'light' && lightSample.preference === 'system',
      JSON.stringify({ theme: lightSample.theme, preference: lightSample.preference }));

    await page.selectOption('#theme-select', 'dark');
    await page.waitForTimeout(160);
    const darkSample = await sampleTheme(page);
    check('选深色后根元素与解析结果都变深',
      darkSample.theme === 'dark' && darkSample.preference === 'dark',
      JSON.stringify({ theme: darkSample.theme, preference: darkSample.preference }));
    check('深色下 color-scheme 变成 dark（表单控件与滚动条跟着走）',
      darkSample.colorScheme.includes('dark'), darkSample.colorScheme);
    check('深色下 theme-color 换成深色纸面', darkSample.themeColor === '#14101f', String(darkSample.themeColor));
    check('偏好写进本机存储', darkSample.stored === 'dark', String(darkSample.stored));

    // 「真的变暗了」：外壳与卡片底色的亮度都要掉下来，且两者取值不同。
    check('深色下页面底色确实变暗（亮度下降）',
      darkSample.paperLuminance < lightSample.paperLuminance * 0.35,
      JSON.stringify({ light: lightSample.paperLuminance, dark: darkSample.paperLuminance }));
    check('深色下卡片底色与浅色不同',
      darkSample.card?.background !== lightSample.card?.background,
      JSON.stringify({ light: lightSample.card?.background, dark: darkSample.card?.background }));
    check('深色下顶栏不再是浅色玻璃',
      darkSample.topbar?.background !== lightSample.topbar?.background && darkSample.body.background !== lightSample.topbar?.background,
      JSON.stringify({ lightTopbar: lightSample.topbar?.background, darkTopbar: darkSample.topbar?.background }));

    // 刷新与换页都保持。
    await page.reload({ waitUntil: 'networkidle' });
    const afterReload = await sampleTheme(page);
    check('刷新后仍是深色', afterReload.theme === 'dark' && afterReload.stored === 'dark', JSON.stringify(afterReload.theme));
    await page.goto(server.origin + '/nodes', { waitUntil: 'networkidle' });
    const otherPage = await sampleTheme(page);
    check('换页后仍是深色，且下拉里显示的仍是「深色」',
      otherPage.theme === 'dark' && otherPage.picker === 'dark',
      JSON.stringify({ theme: otherPage.theme, picker: otherPage.picker }));

    // 三态里的第三态：切回「跟随系统」后仍按系统（浅色系统 → 浅色）。
    await page.selectOption('#theme-select', 'system');
    await page.waitForTimeout(160);
    const backToSystem = await sampleTheme(page);
    check('切回「跟随系统」时按系统解析（这里是浅色）',
      backToSystem.theme === 'light' && backToSystem.preference === 'system' && backToSystem.stored === 'system',
      JSON.stringify({ theme: backToSystem.theme, stored: backToSystem.stored }));

    check('深色切换期间没有控制台错误', errors.length === 0, errors.join(' | '));
    await context.close();
  }

  /* ---------- 2. 跟随系统（含「显式选过就不跟随」） ---------- */
  {
    const { context, page, errors } = await freshPage({ colorScheme: 'dark' });
    await page.goto(server.origin + '/start', { waitUntil: 'networkidle' });
    const dark = await sampleTheme(page);
    check('系统深色 + 无本机偏好：首帧就是深色（引导脚本在 React 之前跑完）',
      dark.theme === 'dark' && dark.preference === 'system', JSON.stringify({ theme: dark.theme, preference: dark.preference }));

    /*
     * 系统偏好**当场变化**时也要跟随：`emulateMedia` 会触发 matchMedia 的 change 事件，
     * 这正是「跟随系统」与「只在首次读一次」的区别。
     */
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(200);
    const followed = await sampleTheme(page);
    check('系统切成浅色后当场跟随（不必刷新）', followed.theme === 'light', JSON.stringify(followed.theme));

    await page.selectOption('#theme-select', 'dark');
    await page.waitForTimeout(160);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(200);
    const pinned = await sampleTheme(page);
    check('显式选过深色之后，系统变浅色也不跟随', pinned.theme === 'dark' && pinned.preference === 'dark',
      JSON.stringify({ theme: pinned.theme, preference: pinned.preference }));
    check('跟随测试没有控制台错误', errors.length === 0, errors.join(' | '));
    await context.close();
  }

  /* ---------- 3. 知识网络画布 ---------- */
  {
    const { context, page, errors } = await freshPage();
    /*
     * 画布上的颜色有四个来源（`theme.ts` / `labels.ts` / `relation-visual.ts` / `network.ts`），
     * 它们由 `theme-palette.ts` 一次切换。这里进一张**一定有节点**的视图
     * （`?nodes=` 是既有的深链写法，见 tests/network-picker.mjs）。
     */
    await page.goto(server.origin + '/network?nodes=' + encodeURIComponent('top:topological-manifold'), { waitUntil: 'networkidle' });
    await page.waitForSelector('.network-node', { timeout: 20000 });
    await page.selectOption('#theme-select', 'dark');
    await page.waitForTimeout(400);

    const canvas = await page.evaluate(() => {
      const root = document.documentElement;
      const channels = (value) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      const luminance = (value) => {
        const [r, g, b] = channels(value).map((channel) => {
          const c = channel / 255;
          return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const ratio = (a, b) => {
        const la = luminance(a); const lb = luminance(b);
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
      };
      const fills = [...document.querySelectorAll('.network-card-body > rect')].map((rect) => getComputedStyle(rect).fill);
      const labels = [...document.querySelectorAll('.network-node-label')].map((text) => getComputedStyle(text).fill);
      const edges = [...document.querySelectorAll('.network-edge')].map((line) => getComputedStyle(line).stroke);
      const stage = document.querySelector('.network-stage');
      const label = document.querySelector('.network-node-label');
      const card = document.querySelector('.network-card-body > rect');
      return {
        canvasToken: getComputedStyle(root).getPropertyValue('--canvas').trim(),
        stageBackground: stage ? getComputedStyle(stage).backgroundColor : null,
        fills,
        labels,
        edges,
        lightestFill: fills.length ? Math.max(...fills.map(luminance)) : null,
        darkestEdge: edges.length ? Math.min(...edges.map((value) => (value === 'none' ? 1 : luminance(value)))) : null,
        cardTextRatio: card && label ? Number(ratio(getComputedStyle(card).fill, getComputedStyle(label).fill).toFixed(2)) : null,
        nodeCount: document.querySelectorAll('.network-node').length,
      };
    });

    /*
     * 画布的底色走令牌（`.network-stage` 的 `background` 里含 `var(--canvas)`）；
     * 节点卡片底与关系线走 JS 侧色板。两边都要按外观切换——
     * 只切一边就是「深色画布上配浅色卡片」这种半截状态。
     */
    check('深色下画布令牌是深色', /^#(1|2)[0-9a-f]{5}$/i.test(canvas.canvasToken), canvas.canvasToken);
    check('深色下节点卡片底不是浅色（JS 侧话题色板跟着切了）',
      canvas.fills.length > 0 && canvas.lightestFill !== null && canvas.lightestFill < 0.12,
      JSON.stringify({ count: canvas.fills.length, lightest: canvas.lightestFill, sample: canvas.fills.slice(0, 3) }));
    check('深色下节点文字是浅色', canvas.labels.length > 0
      && canvas.labels.every((value) => value.startsWith('rgb') && (value.match(/\d+/g) ?? []).map(Number).every((channel) => channel > 130)),
      JSON.stringify(canvas.labels.slice(0, 3)));
    check('深色下卡片文字对卡片底仍 ≥4.5:1', canvas.cardTextRatio === null || canvas.cardTextRatio >= 4.5,
      JSON.stringify({ ratio: canvas.cardTextRatio }));
    check('深色下关系线是提亮过的一套（对深画布可见）',
      canvas.edges.length === 0 || canvas.darkestEdge > 0.15,
      JSON.stringify({ count: canvas.edges.length, darkest: canvas.darkestEdge, sample: canvas.edges.slice(0, 3) }));
    check('知识网络页在深色下没有控制台错误', errors.length === 0, errors.join(' | '));
    await page.screenshot({ path: resolve(MCS_WEB_ROOT, 'tmp', 'dark-mode-network.png'), fullPage: false });
    await context.close();
  }

  /* ---------- 4. 首页六幕（舞台纸与雾都要跟着变） ---------- */
  {
    const { context, page, errors } = await freshPage();
    await page.goto(server.origin, { waitUntil: 'networkidle' });
    await page.waitForSelector('.home-story-section', { timeout: 20000 });
    const storyLight = await page.evaluate(() => getComputedStyle(document.querySelector('.home-story')).backgroundImage.slice(0, 80));
    await page.selectOption('#theme-select', 'dark');
    await page.waitForTimeout(300);
    const storyDark = await page.evaluate(() => ({
      image: getComputedStyle(document.querySelector('.home-story')).backgroundImage.slice(0, 80),
      scrim: getComputedStyle(document.querySelector('.home-story-scrim')).backgroundImage.slice(0, 90),
      copy: getComputedStyle(document.querySelector('.home-story-act-copy')).backgroundImage.slice(0, 90),
      actInk: getComputedStyle(document.querySelector('.home-story-act h2') ?? document.body).color,
    }));
    check('首页舞台底在深色下换成暗色渐变', storyDark.image !== storyLight, JSON.stringify({ light: storyLight, dark: storyDark.image }));
    check('首页正文的柔光在深色下不是白雾',
      !/rgba?\(255,\s*255,\s*255/.test(storyDark.copy) && !/rgba?\(255,\s*255,\s*255/.test(storyDark.scrim),
      JSON.stringify({ copy: storyDark.copy, scrim: storyDark.scrim }));
    check('首页六幕在深色下没有控制台错误', errors.length === 0, errors.join(' | '));
    await page.screenshot({ path: resolve(MCS_WEB_ROOT, 'tmp', 'dark-mode-home.png'), fullPage: false });
    await context.close();
  }
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n暗色模式验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n暗色模式验收通过。');
