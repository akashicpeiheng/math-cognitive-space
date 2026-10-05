import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadOntology, createOntology, MCS_WEB_ROOT, REPO_ROOT } from '../core/ontology.mjs';
import { startServer } from '../server/index.mjs';

export async function testOntology() {
  return loadOntology();
}

export function miniOntology({ nodes, actions, relations = [], boundary = [], evidence = [], support = [] }) {
  const raw = {
    schema: 'mcs-web-ontology/1',
    signature: { version: '1', baseTypes: [{ name: 'o', note: '真值' }], constants: [] },
    theory: { id: 'T_test', title: '测试理论', calculus: 'ND 白名单', axioms: [], modules: [] },
    nodes: nodes.map((node) => ({
      id: node.id,
      version: '1',
      construct: node.construct ?? 'Claim',
      roles: node.roles ?? ['Theorem'],
      title: node.title ?? node.id,
      discipline: '测试',
      case: 'test',
      summary: '',
      formal: node.formal ?? { theory: 'T_test', typeEnv: {}, assumptions: [], formula: '⊤', type: 'o', symbols: [], boundary: [] },
      representations: [],
      provenance: { sources: [] },
      contentRef: false,
    })),
    payload: {},
    representations: [],
    evidence,
    support,
    actions,
    relations,
    aggregates: [],
    templates: [],
    environmentBoundary: { refs: boundary, note: '测试边界' },
    claims: [],
    patterns: [],
    coverage: [],
    localizations: [],
  };
  return createOntology(raw, { validate: false });
}

export function input(node, accepts = ['statement']) { return { node, accepts }; }
export function output(node, provides = ['statement']) { return { node, provides }; }

export function action(id, inputs, outputs, mode = 'deduction') {
  return { id, mode, title: id, inputs, outputs, witness: { type: 'test', status: 'DEF' }, theory: 'T_test', openAssumptions: [], version: '1' };
}

/**
 * 在「每帧重渲染的动画页面」里点一个元素（2026-10 固化，TODO A5-35）。
 *
 * 第四十轮、第五十二轮的边界：「相机动画/每帧重渲染会让 Playwright 的稳定性检查与 `check()` 失效；
 * 本轮改成派发原生 click。*验收*：把这类写法固化进测试工具（一个 `clickInAnimatedPage` 帮助函数），
 * 新套件不再各自绕。」
 *
 * 为什么 Playwright 的 `click()` / `check()` 在这些页面上不可靠：
 * 知识网络的相机会平滑居中、节点有入场动画，**整页每帧重渲染**，
 * 于是它的「元素稳定」（两帧位置一致）与「点击后状态变化」两条检查会和重渲染打架——
 * 实测报 `Clicking the checkbox did not change its state`。这不是页面坏了，是检查的前提不成立。
 *
 * 这里做的三件事：
 * 1. 先把元素 `scrollIntoView`（原生 click 不会自动滚动，元素在视口外时点击无效）；
 * 2. 在页面里派发**原生 click**——React 的合成事件照样触发（事件委托挂在根节点上）；
 * 3. 返回是否真的点到（找不到元素时**抛错**而不是静默返回 false，
 *    否则「没点到」会伪装成「点了没反应」，排查时最费时间的一类假失败）。
 *
 * @param {import('playwright').Page} page
 * @param {string} selector CSS 选择器
 * @param {{ index?: number, scroll?: boolean, required?: boolean }} [options]
 * @returns {Promise<boolean>} 点到了返回 true
 */
export async function clickInAnimatedPage(page, selector, { index = 0, scroll = true, required = true } = {}) {
  const result = await page.evaluate(({ selector: target, index: at, scroll: shouldScroll }) => {
    const elements = [...document.querySelectorAll(target)];
    const element = elements[at];
    if (!element) return { ok: false, total: elements.length };
    if (shouldScroll && typeof element.scrollIntoView === 'function') element.scrollIntoView({ block: 'center', inline: 'nearest' });
    /*
     * 知识网络的节点与边是 SVG 元素：`SVGElement` 上没有 `click()`，
     * 直接调用会抛 `element.click is not a function`。因此退回派发一个会冒泡的 MouseEvent——
     * React 的合成事件挂在根节点上，冒泡的原生事件照样触发（与 `click()` 效果一致）。
     */
    if (typeof element.click === 'function') element.click();
    else element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return { ok: true, total: elements.length };
  }, { selector, index, scroll });
  if (!result.ok && required) {
    throw new Error(`clickInAnimatedPage 找不到第 ${index} 个「${selector}」（共匹配 ${result.total} 个）`);
  }
  return result.ok;
}

/**
 * 动画页面里勾选 / 取消勾选复选框：语义化的 `clickInAnimatedPage`。
 *
 * 用原生 click 而不是直接改 `checked`：React 的受控组件要看 `change` 事件，
 * 直接改属性不会触发状态更新（那样断言会「通过」但页面没变，是最糟糕的一类假通过）。
 * `expect` 给出期望状态时，会顺带核对点击**真的生效**（与 Playwright `check()` 的语义一致）。
 */
export async function toggleInAnimatedPage(page, selector, { index = 0, expect } = {}) {
  const before = await page.evaluate(({ selector: target, index: at }) => {
    const element = [...document.querySelectorAll(target)][at];
    return element ? Boolean(element.checked) : null;
  }, { selector, index });
  await clickInAnimatedPage(page, selector, { index });
  if (expect === undefined) return before;
  const after = await page.waitForFunction(({ selector: target, index: at, want }) => {
    const element = [...document.querySelectorAll(target)][at];
    return element ? Boolean(element.checked) === want : false;
  }, { selector, index, want: expect }, { timeout: 5000 }).then(() => true).catch(() => false);
  return after;
}

export async function startTestServer({ staticDir = resolve(MCS_WEB_ROOT, 'web', 'dist') } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'mcs-web-test-'));
  const config = {
    host: '127.0.0.1',
    port: 0,
    dataDir: resolve(MCS_WEB_ROOT, 'data'),
    dbFile: join(dir, 'test.sqlite3'),
    /*
     * 编写库与**已发布内容包**都要指到临时目录。
     *
     * 生产配置里 `extensionsDir` 就是仓库的 `mcs-web/data/extensions`；测试若用它，
     * 就会出现两种坏结果：① 测试读到你本机真发布过的东西（断言随环境漂移）；
     * ② 测试**往仓库里写**内容包（污染版本库）。`dbFile` 早就隔离了，这两处以前没有。
     */
    authoringDbFile: join(dir, 'authoring.sqlite3'),
    extensionsDir: join(dir, 'extensions'),
    staticDir,
    backupDir: join(dir, 'backups'),
    repoRoot: REPO_ROOT,
    dev: true,
    tutor: {
      enabled: true,
      adapter: 'deeptutor-1.5',
      baseUrl: 'http://127.0.0.1:1',
      frontendUrl: 'http://127.0.0.1:1',
      authTokenEnv: 'MCS_WEB_TEST_MISSING_TOKEN',
      timeoutMs: 800,
      healthTimeoutMs: 300,
      liveVerified: false,
    },
  };
  const handle = await startServer({ config });
  return {
    ...handle,
    dir,
    async cleanup() {
      try { handle.jobs.close(); } catch {}
      try { await handle.db.close(); } catch {}
      try { await handle.auth?.close(); } catch {}
      await new Promise((resolvePromise) => handle.server.close(resolvePromise));
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

export async function jsonCall(origin, path, { method = 'GET', body } = {}) {
  const response = await fetch(origin + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  return { status: response.status, payload };
}
