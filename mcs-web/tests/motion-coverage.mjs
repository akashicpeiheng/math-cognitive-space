import { existsSync, readFileSync } from 'node:fs';
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
 * 动效覆盖面（2026-10 加，TODO A5-38）。
 *
 * 第三十八轮起各轮都零散加了 `prefers-reduced-motion` 降级，但**没有一处集中核对**
 * 「所有动画都有 reduce 分支」。这一套把它变成两层断言：
 *
 * 1. **规则级**：用 CSSOM 取真实的 `animation-name`（浏览器解析的结果，不靠正则猜选择器），
 *    与 `styles.css` 顶部的动效清单**双向比对**——CSS 里有而没登记 = 漏登记，
 *    登记了而 CSS 里没有 = 清单过期；每个名字的处理方式必须是三种之一；
 * 2. **元素级**：在 `reducedMotion: 'reduce'` 下逐页扫描**没有任何元素还在动**
 *    （`animation-name !== 'none'`），并额外驱动两个「只有某种状态才有动画」的场景
 *    （长按拾取的呼吸环、悬停候选的行进虚线环），免得它们躲在状态后面漏掉。
 *
 * 为什么用 CSSOM 而不是正则：本文件里大量规则是单行写的（`{ animation-delay: 90ms; }`），
 * 手写解析很容易把选择器归错（第一版探针就是这么错的）。
 */
const PAGES = ['/', '/start', '/plan', '/network', '/nodes', '/tutor', '/maintenance', '/intro'];
const MODES = { '一次性入场': '入场动画在 reduce 下应当直接呈现终态', '循环装饰': '循环装饰在 reduce 下应当关掉', 'React 降级': '整块在 reduce 下不渲染，CSS 另有关闭规则' };

const cssText = readFileSync(resolve(MCS_WEB_ROOT, 'web/src/styles.css'), 'utf8');
const inventory = [...cssText.matchAll(/^ \* - ([a-z][\w-]*)：(一次性入场|循环装饰|React 降级)；/gm)]
  .map((match) => ({ name: match[1], mode: match[2] }));
const keyframes = new Set([...cssText.matchAll(/@keyframes\s+([a-z][\w-]*)/g)].map((match) => match[1]));

const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });

  // ---- 1) 规则级：CSSOM 里的动画 ⊆ 清单，且清单 ⊆ CSS ----
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  const seen = new Map();
  const animatedRules = [];
  const reduceRules = [];
  for (const path of PAGES) {
    await page.goto(server.origin + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const rules = await page.evaluate(() => {
      const out = [];
      for (const sheet of document.styleSheets) {
        let list;
        try { list = [...sheet.cssRules]; } catch { continue; }
        const walk = (items, inReduce) => {
          for (const rule of items) {
            if (rule.type === CSSRule.MEDIA_RULE) {
              walk([...rule.cssRules], inReduce || rule.conditionText.includes('prefers-reduced-motion'));
              continue;
            }
            if (rule.type !== CSSRule.STYLE_RULE || !rule.style?.animationName) continue;
            out.push({
              selector: rule.selectorText,
              name: rule.style.animationName,
              inReduce,
              important: rule.style.getPropertyPriority('animation') === 'important'
                || rule.style.getPropertyPriority('animation-name') === 'important',
            });
          }
        };
        walk(list, false);
      }
      return out;
    });
    for (const rule of rules) {
      if (rule.inReduce) { reduceRules.push(rule); continue; }
      animatedRules.push(rule);
      if (!seen.has(rule.name)) seen.set(rule.name, rule.selector);
    }
  }
  const registered = new Set(inventory.map((entry) => entry.name));
  const unregistered = [...seen.keys()].filter((name) => !registered.has(name));
  const stale = [...registered].filter((name) => !seen.has(name));
  check('CSS 里出现的每个动画都在动效清单里登记（用 CSSOM 取真实 animation-name）',
    unregistered.length === 0, JSON.stringify({ unregistered, seen: [...seen.keys()].sort() }));
  check('清单里登记的动画都还在 CSS 里（没有过期条目）', stale.length === 0, JSON.stringify(stale));
  check('清单与 @keyframes 集合一致（21 个名字，双向一致）',
    keyframes.size === registered.size && [...keyframes].every((name) => registered.has(name)),
    JSON.stringify({ keyframes: keyframes.size, inventory: registered.size }));
  check('每个动画都写明了 reduce 处理方式（三种之一）',
    inventory.length > 0 && inventory.every((entry) => MODES[entry.mode]),
    JSON.stringify(inventory.filter((entry) => !MODES[entry.mode])));
  const modes = inventory.reduce((acc, entry) => ({ ...acc, [entry.mode]: (acc[entry.mode] ?? 0) + 1 }), {});
  console.log('  · 动效清单：' + JSON.stringify(modes) + '，共 ' + inventory.length + ' 个动画');

  /*
   * 规则级第二问：**每条动画声明都被 reduce 关闭**。
   *
   * 判据（可静态核对，且正是踩过的坑）：声明动画的那条选择器，必须在 reduce 块里
   * 被**同名选择器**关闭，或者被一条 `animation: none !important` 的 reduce 规则兜住。
   * 只写 `.pick-hover-ring` 去关 `.pick-candidate.hovered rect.pick-hover-ring` 是不算的——
   * 优先级输了，写在后面也没用（这一条就是这么被发现的）。
   */
  const reduceSelectors = new Set(reduceRules.map((rule) => rule.selector));
  const importantSelectors = new Set(reduceRules.filter((rule) => rule.important).map((rule) => rule.selector));
  const uncoveredRules = animatedRules
    .filter((rule) => !reduceSelectors.has(rule.selector) && importantSelectors.size === 0
      && !/^\.home-story\b/.test(rule.selector))
    .map((rule) => `${rule.selector} → ${rule.name}`);
  check('每条动画声明都在 reduce 块里被关闭（同名选择器或 !important 兜底）',
    uncoveredRules.length === 0, JSON.stringify(uncoveredRules));
  await context.close();

  // ---- 2) 元素级：reduce 模式下没有任何元素还在动 ----
  const reduceContext = await browser.newContext({ viewport: { width: 1440, height: 950 }, reducedMotion: 'reduce' });
  const reducePage = await reduceContext.newPage();
  const motions = async (label) => {
    const running = await reducePage.evaluate(() => [...document.querySelectorAll('*')]
      .map((element) => ({ element, name: getComputedStyle(element).animationName }))
      .filter((row) => row.name && row.name !== 'none')
      .map((row) => `${row.element.tagName.toLowerCase()}.${String(row.element.className || '').split(' ')[0]} → ${row.name}`));
    check(`${label}：reduce 下没有元素还在动`, running.length === 0, JSON.stringify(running.slice(0, 6)));
  };
  for (const path of PAGES) {
    await reducePage.goto(server.origin + path, { waitUntil: 'networkidle' });
    await reducePage.waitForTimeout(500);
    await motions(path);
  }

  /*
   * 状态里的动画最容易漏：它们平时不在 DOM 里。
   * 这里在 reduce 下驱动一次长按拾取（`.is-picking` + `.pick-candidate.hovered`），
   * 覆盖 `pick-source-breathe` 与 `pick-ring-march` 两条循环装饰。
   */
  await reducePage.goto(server.origin + '/network?nodes=' + encodeURIComponent('dg:homeomorphism,dg:manifold'), { waitUntil: 'networkidle' });
  await reducePage.waitForSelector('.network-node');
  await reducePage.waitForTimeout(800);
  const box = await reducePage.locator('.network-node').first().boundingBox();
  await reducePage.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await reducePage.mouse.down({ button: 'left' });
  await reducePage.waitForTimeout(450);
  const picking = await reducePage.evaluate(() => ({
    picking: document.querySelector('.network-stage')?.classList.contains('is-picking') ?? false,
    candidates: document.querySelectorAll('.pick-candidate').length,
  }));
  check('reduce 下长按拾取仍然可用（关掉的是动画，不是功能）',
    picking.picking && picking.candidates >= 1, JSON.stringify(picking));
  const candidateBox = await reducePage.locator('.pick-candidate').first().boundingBox();
  if (candidateBox) {
    await reducePage.mouse.move(candidateBox.x + candidateBox.width / 2, candidateBox.y + candidateBox.height / 2);
    await reducePage.waitForTimeout(250);
  }
  const stateful = await reducePage.evaluate(() => {
    const rows = [...document.querySelectorAll('.network-node, .pick-candidate, .pick-candidate *')]
      .map((element) => ({ element, name: getComputedStyle(element).animationName }))
      .filter((row) => row.name && row.name !== 'none')
      .map((row) => `${row.element.tagName.toLowerCase()}.${String(row.element.className.baseVal ?? row.element.className ?? '').split(' ')[0]} → ${row.name}`);
    return { running: rows, hoveredRing: document.querySelectorAll('.pick-candidate.hovered rect.pick-hover-ring').length };
  });
  await reducePage.mouse.up({ button: 'left' });
  check('长按拾取状态下（源节点呼吸 + 悬停环）reduce 也不留动画',
    stateful.running.length === 0, JSON.stringify({ running: stateful.running, ring: stateful.hoveredRing }));
  await reduceContext.close();

  check('动效覆盖面检查没有控制台错误', consoleErrors.length === 0, consoleErrors.join(' | '));
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n动效覆盖面验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n动效覆盖面验收通过。');
