import { startTestServer } from './helpers.mjs';

import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/**
 * 形式表达：把挑出来的重要节点用形式语言写出来。
 *
 * 三件事必须同时成立，否则这一项就是装饰：
 * 1. **挑中的节点真有形式陈述**：tex 非空、不含 `$` 定界符（渲染层补）、有中文读法、有记号表、证据标签合法；
 * 2. **没挑的节点保持 null**：不能给 216 个节点编公式，页面也不该出现「暂无」占位；
 * 3. **页面上真的排版出来**：KaTeX 渲染（不是把 LaTeX 源码当文本显示），且长公式不会把窄屏撑宽。
 *
 * 另外钉一条**内容一致性**：`dg:manifold` 按本站登记是「Hausdorff + 局部欧氏」（不含第二可数），
 * `dg:smooth-manifold` 才加第二可数。两份陈述的差别是有意的，断言防止以后被"统一"掉。
 */
const EXPECTED = [
  'bg:linear:vector', 'limit:limit-ed', 'limit:seq-conv', 'rudin:continuous-function', 'rudin:metric-space',
  'rudin:compact-set', 'rudin:least-upper-bound', 'dg:manifold', 'dg:topological-manifold', 'dg:homeomorphism',
  'dg:coordinate-chart', 'dg:smooth-manifold', 'dg:smooth-atlas', 'dg:differential-form', 'tensor:tensor-rs',
  'group:group-concept',
];
const LABELS = ['DEF', 'PROOF', 'REF', 'FINITE', 'ILLUSTRATION', 'NOT-CLAIMED'];

const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  // ---- 接口层：登记表与节点对得上 ----
  // 先落到本站页面上：相对路径的 fetch 需要有同源页面。
  await page.goto(server.origin + '/nodes', { waitUntil: 'networkidle' });
  const api2 = await page.evaluate(async (ids) => {
    const expected = new Set(ids);
    const list = await (await fetch('/api/v2/ontology/nodes?limit=500')).json();
    const registered = [];
    for (const id of ids) {
      const detail = await (await fetch(`/api/v2/ontology/nodes/${encodeURIComponent(id)}`)).json();
      const statement = detail.data.node.formalStatement;
      registered.push({
        id,
        title: detail.data.node.title,
        hasStatement: Boolean(statement),
        tex: statement?.tex ?? '',
        reading: statement?.reading ?? '',
        label: statement?.label ?? '',
        notation: (statement?.notation ?? []).length,
        note: statement?.note ?? '',
      });
    }
    const notRegistered = list.data.nodes.filter((node) => !expected.has(node.id));
    const nullCount = (await Promise.all(notRegistered.slice(0, 12).map(async (node) => {
      const detail = await (await fetch(`/api/v2/ontology/nodes/${encodeURIComponent(node.id)}`)).json();
      return detail.data.node.formalStatement;
    }))).filter((value) => value === null).length;
    return { registered, total: list.data.total, candidateUnregistered: notRegistered.length, nullCount, checkedUnregistered: Math.min(12, notRegistered.length) };
  }, EXPECTED);

  const entries = api2.registered;
  check('挑中的 16 个节点都登记了形式表达',
    entries.every((entry) => entry.hasStatement),
    JSON.stringify(entries.filter((entry) => !entry.hasStatement).map((entry) => entry.id)));
  check('tex 非空且不含 $ 定界符（定界符由渲染层补）',
    entries.every((entry) => entry.tex.trim().length > 20 && !entry.tex.includes('$')),
    JSON.stringify(entries.filter((entry) => entry.tex.includes('$') || entry.tex.trim().length <= 20).map((entry) => entry.id)));
  check('每条都有中文读法与至少两条记号约定',
    entries.every((entry) => entry.reading.trim().length > 10 && entry.notation >= 2),
    JSON.stringify(entries.map((entry) => [entry.id, entry.reading.length, entry.notation])));
  check('证据标签都在允许集合内', entries.every((entry) => LABELS.includes(entry.label)),
    JSON.stringify(entries.map((entry) => [entry.id, entry.label])));
  /*
   * 未登记数按**单元**口径算（列表默认档）：196 个单元 − 16 条已登记 = 180。
   * 这里只要求「未登记的占绝大多数」，不写死数字——数字随本体增删而变，写死会变成绊脚石。
   */
  check('没有登记的节点保持 null（不编公式、不留占位）',
    api2.nullCount === api2.checkedUnregistered && api2.candidateUnregistered > 100,
    JSON.stringify({ checked: api2.checkedUnregistered, nulls: api2.nullCount, unregistered: api2.candidateUnregistered }));

  // ---- 内容一致性：两条流形定义的差别是有意的 ----
  const manifold = entries.find((entry) => entry.id === 'dg:manifold');
  const smoothManifold = entries.find((entry) => entry.id === 'dg:smooth-manifold');
  check('dg:manifold 按本站登记不含第二可数，且 note 写明差别',
    manifold && !/second countable/i.test(manifold.tex) && manifold.note.includes('第二可数'),
    JSON.stringify({ tex: manifold?.tex.slice(0, 60), note: manifold?.note.slice(0, 60) }));
  check('dg:smooth-manifold 含第二可数（与上一条不同，不是复制粘贴）',
    smoothManifold && /second countable/i.test(smoothManifold.tex),
    JSON.stringify({ tex: smoothManifold?.tex.slice(0, 60) }));

  // ---- 渲染层：真的排版出来，而不是把 LaTeX 当文本 ----
  await page.goto(server.origin + '/nodes/' + encodeURIComponent('limit:limit-ed'), { waitUntil: 'networkidle' });
  await page.waitForSelector('#node-formal-statement');
  const rendered = await page.evaluate(() => {
    const section = document.querySelector('#node-formal-statement');
    const math = section.querySelector('.formal-statement-math');
    /*
     * 可见文本要去掉 KaTeX 的 MathML `<annotation>`：那里**故意**保留 LaTeX 源码
     * （无障碍与复制用，屏幕上看不见）。直接读 textContent 会把这份源码当成
     * 「LaTeX 没被渲染」——第一版就是这么假失败的。
     */
    const visible = math.cloneNode(true);
    visible.querySelectorAll('annotation').forEach((node) => node.remove());
    return {
      heading: section.querySelector('h2')?.textContent?.trim() ?? '',
      label: section.querySelector('.formal-statement-label')?.textContent?.trim() ?? '',
      katex: section.querySelectorAll('.katex').length,
      displayMath: section.querySelectorAll('.katex-display').length,
      visibleText: visible.textContent?.trim() ?? '',
      annotationCount: math.querySelectorAll('annotation').length,
      reading: section.querySelector('.formal-statement-reading')?.textContent?.trim() ?? '',
      notationRows: section.querySelectorAll('.formal-statement-notation > div').length,
      note: section.querySelector('.formal-statement-note')?.textContent?.trim() ?? '',
      raw: section.textContent ?? '',
    };
  });
  check('节点页有「形式表达」块，证据标签显示出来',
    rendered.heading === '形式表达' && rendered.label === 'DEF', JSON.stringify(rendered.heading));
  check('公式按行间公式排版（katex-display，不是挤在行内的小字号）',
    rendered.katex > 0 && rendered.displayMath >= 1,
    JSON.stringify({ katex: rendered.katex, display: rendered.displayMath }));
  check('可见文本是排好版的公式，不是 LaTeX 源码',
    !rendered.visibleText.includes('\\forall') && !rendered.visibleText.includes('\\varepsilon')
      && !rendered.visibleText.includes('$$') && rendered.visibleText.includes('∀'),
    rendered.visibleText.slice(0, 90));
  check('LaTeX 源码只留在 MathML annotation 里（无障碍/复制用）',
    rendered.annotationCount >= 1 && rendered.raw.includes('\\forall'),
    JSON.stringify({ annotations: rendered.annotationCount }));
  check('中文读法与记号表都在页面上',
    rendered.reading.includes('ε') && rendered.notationRows >= 2 && rendered.note.length > 10,
    JSON.stringify({ reading: rendered.reading.slice(0, 40), rows: rendered.notationRows, note: rendered.note.length }));

  // ---- 其它重要节点也能打开（挑几条跨案例的）----
  for (const id of ['dg:manifold', 'tensor:tensor-rs', 'group:group-concept', 'rudin:compact-set']) {
    await page.goto(server.origin + '/nodes/' + encodeURIComponent(id), { waitUntil: 'networkidle' });
    const present = await page.locator('#node-formal-statement .katex').count();
    check(`${id} 的形式表达也能排版出来`, present > 0, String(present));
  }

  /*
   * 桌面宽度下公式必须**整条看得见**。
   *
   * 第一版把长公式塞在一行里：卡片 516px 而公式 700+px，于是右半截被切掉，
   * 只能横向拖着看——「形式表达」是这一段最该一眼读完的东西，被截断就失去意义。
   * 修法是在语义连接处（⟺、公理之间、定义与维数之间）断行，而不是缩小字号。
   *
   * 量的是 **KaTeX 自己的 `.katex-display`**：行间公式的 `overflow-x: auto` 在它身上，
   * 量外层 `.formal-statement-math` 会永远得到「没溢出」（第一版就是这么假通过的）。
   */
  const overflows = [];
  for (const id of EXPECTED) {
    await page.goto(server.origin + '/nodes/' + encodeURIComponent(id), { waitUntil: 'networkidle' });
    await page.waitForSelector('#node-formal-statement');
    const state = await page.evaluate((nodeId) => {
      const display = document.querySelector('.formal-statement-math .katex-display');
      return { id: nodeId, client: display?.clientWidth ?? 0, scroll: display?.scrollWidth ?? 0 };
    }, id);
    if (state.scroll > state.client + 1) overflows.push(`${state.id} 溢出 ${state.scroll - state.client}px`);
  }
  check('桌面宽度下 16 条公式都完整可见（不需要横向拖）', overflows.length === 0, JSON.stringify(overflows));

  // ---- 未登记的节点不出这一块 ----
  await page.goto(server.origin + '/nodes/' + encodeURIComponent('dg:smooth-vector-field'), { waitUntil: 'networkidle' });
  check('未登记形式表达的节点不出现这一块（也没有占位）',
    (await page.locator('#node-formal-statement').count()) === 0);

  // ---- 窄屏：长公式不能把页面撑宽 ----
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(server.origin + '/nodes/' + encodeURIComponent('rudin:continuous-function'), { waitUntil: 'networkidle' });
  await page.waitForSelector('#node-formal-statement');
  const narrow = await page.evaluate(() => {
    const section = document.querySelector('#node-formal-statement');
    const math = section.querySelector('.formal-statement-math');
    return {
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      mathScrolls: math.scrollWidth > math.clientWidth,
      mathOverflowX: getComputedStyle(math).overflowX,
    };
  });
  check('手机上没有横向溢出（长公式自己滚动）',
    narrow.overflow <= 2 && ['auto', 'scroll'].includes(narrow.mathOverflowX),
    JSON.stringify(narrow));

  check('形式表达没有控制台错误', consoleErrors.length === 0, consoleErrors.join(' | '));
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n形式表达验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n形式表达验收通过。');
