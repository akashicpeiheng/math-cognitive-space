import { startTestServer } from './helpers.mjs';

import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/**
 * 开始学习页的偏好引导。
 *
 * 用户的要求：「不要让用户一开始就学，让用户先去从大的视角选择学习的偏好，设置几个引导性的问题，
 * 优化交互逻辑，让用户真实地感到自己在主导自己的学习。」
 *
 * 拆成可核对的性质：
 * 1. **引导在前**：进页面先看到问题，且一次只问一个（渐进披露）；
 * 2. **每问都有依据**：写明「为什么问这个」，而不是把人当问卷填；
 * 3. **选了就有后果**：答案立刻变成站内真实链接 + 依据说明；
 * 4. **随时能退**：能改、能一键默认、原有入口一个都没删（引导只排序，不设门禁）；
 * 5. **只写本机**：偏好进 localStorage，**没有任何写档案 E 的请求**（用请求拦截核对）。
 */
const PREFS_KEY = 'mcs-start-preferences-v1';

const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  // 记下所有写请求：整个引导过程里不该出现任何一次。
  const writes = [];
  page.on('request', (request) => {
    const method = request.method();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) writes.push(`${method} ${new URL(request.url()).pathname}`);
  });

  await page.goto(server.origin + '/start', { waitUntil: 'networkidle' });
  // 清掉偏好**与「来过」标记**：这才是「第一次来」——只清偏好会让页面按回访者渲染
  // （回访者直接看结论，不再展开三问，见 TODO A4-25）。
  await page.evaluate((key) => { localStorage.removeItem(key); localStorage.removeItem('mcs-start-visited-v1'); localStorage.removeItem('mcs-start-guide-collapsed-v1'); }, PREFS_KEY);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // ---- 1) 引导在前 + 渐进披露 ----
  const initial = await page.evaluate(() => ({
    chooserTop: document.querySelector('.start-chooser')?.getBoundingClientRect().top ?? null,
    casesTop: document.querySelector('#cases')?.getBoundingClientRect().top ?? null,
    questions: [...document.querySelectorAll('.start-question')].map((item) => item.getAttribute('data-question')),
    plan: document.querySelectorAll('.start-plan').length,
    heading: document.querySelector('#start-chooser-title')?.textContent ?? '',
  }));
  check('偏好引导在案例区之前（先定方向再看材料）',
    initial.chooserTop !== null && initial.casesTop !== null && initial.chooserTop < initial.casesTop,
    JSON.stringify({ chooser: Math.round(initial.chooserTop), cases: Math.round(initial.casesTop) }));
  check('一开始只问第一个问题，不给结论',
    initial.questions.length === 1 && initial.questions[0] === 'goal' && initial.plan === 0,
    JSON.stringify({ questions: initial.questions, plan: initial.plan }));
  check('引导卡有明确标题', initial.heading.includes('先定方向'), initial.heading);

  // ---- 2) 每问都写明「为什么问这个」 ----
  await page.locator('.start-question[data-question="goal"] .start-option[data-option="gap"]').click();
  await page.waitForTimeout(200);
  const afterGoal = await page.evaluate(() => ({
    questions: [...document.querySelectorAll('.start-question')].map((item) => item.getAttribute('data-question')),
    why: [...document.querySelectorAll('.start-question-head small')].map((node) => node.textContent),
    current: document.querySelector('.start-question[data-current="true"]')?.getAttribute('data-question') ?? null,
    pressed: document.querySelector('.start-option[data-option="gap"]')?.getAttribute('aria-pressed'),
  }));
  check('答完第 1 问才出现第 2 问', afterGoal.questions.join(',') === 'goal,entry', JSON.stringify(afterGoal.questions));
  check('每个问题都写明「为什么问这个」',
    afterGoal.why.length >= 2 && afterGoal.why.every((line) => line.includes('为什么问这个')),
    JSON.stringify(afterGoal.why));
  check('当前轮到的问题被标出，已选选项有 aria-pressed',
    afterGoal.current === 'entry' && afterGoal.pressed === 'true',
    JSON.stringify({ current: afterGoal.current, pressed: afterGoal.pressed }));

  await page.locator('.start-question[data-question="entry"] .start-option[data-option="method"]').click();
  await page.waitForTimeout(200);
  const afterEntry = await page.evaluate(() => [...document.querySelectorAll('.start-question')].map((item) => item.getAttribute('data-question')));
  check('答完第 2 问才出现第 3 问', afterEntry.join(',') === 'goal,entry,pace', JSON.stringify(afterEntry));

  // ---- 3) 选了就有后果：真实链接 + 依据 ----
  await page.locator('.start-question[data-question="pace"] .start-option[data-option="small"]').click();
  await page.waitForTimeout(300);
  const plan = await page.evaluate(() => ({
    hiddenQuestions: document.querySelectorAll('.start-question').length,
    actions: [...document.querySelectorAll('.start-plan-actions a')].map((link) => ({ text: link.textContent, href: link.getAttribute('href') })),
    basis: [...document.querySelectorAll('.start-plan-basis li')].map((node) => node.textContent),
    why: [...document.querySelectorAll('.start-plan-why li')].map((node) => node.textContent),
    note: document.querySelector('.start-plan-note')?.textContent?.replace(/\s+/g, ' ') ?? '',
    title: document.querySelector('.start-plan h3')?.textContent ?? '',
  }));
  check('三问答完后收起问题、给出「你的起点」',
    plan.hiddenQuestions === 0 && plan.title === '你的起点', JSON.stringify({ questions: plan.hiddenQuestions, title: plan.title }));
  check('结论是站内真实链接（不是装饰按钮）',
    plan.actions.length >= 3 && plan.actions.every((action) => action.href?.startsWith('/')) && plan.actions.some((action) => action.href === '/network'),
    JSON.stringify(plan.actions));
  check('结论写明依据（选了什么就得到什么）',
    plan.basis.length >= 1 && plan.basis[0].includes('缺口'), JSON.stringify(plan.basis));
  check('每个入口都说明为什么给它',
    plan.why.length === plan.actions.length && plan.why.every((line) => line.includes('：')),
    JSON.stringify(plan.why));
  check('写明只写本机、不写档案、不设门禁',
    plan.note.includes('不写学习者档案') && plan.note.includes('不设门禁') && plan.note.includes('只负责排序'),
    plan.note.slice(0, 80));

  // ---- 5) 只写本机：localStorage 有值，且整个过程没有一次写请求 ----
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), PREFS_KEY);
  check('偏好写进本机 localStorage',
    stored?.goal === 'gap' && stored?.entry === 'method' && stored?.pace === 'small', JSON.stringify(stored));
  check('整个引导过程没有向服务端写任何东西（不写档案 E）', writes.length === 0, JSON.stringify(writes));

  // 刷新：回访者直接看到结论，仍能改
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const returning = await page.evaluate(() => ({
    planTitle: document.querySelector('.start-plan h3')?.textContent ?? '',
    questions: document.querySelectorAll('.start-question').length,
    edit: document.querySelector('.start-chooser-head button')?.textContent ?? '',
  }));
  check('刷新后直接看到上次的结论（回访者不必重答）',
    returning.planTitle === '你的起点' && returning.questions === 0, JSON.stringify(returning));

  // 「改一改」：问题重新展开，选项保留
  await page.locator('.start-chooser-head button').click();
  await page.waitForTimeout(250);
  const editing = await page.evaluate(() => ({
    questions: [...document.querySelectorAll('.start-question')].map((item) => item.getAttribute('data-question')),
    chosen: [...document.querySelectorAll('.start-option.is-chosen')].map((option) => option.getAttribute('data-option')),
  }));
  check('「改一改」重新展开三问，且原来的选择还在',
    editing.questions.join(',') === 'goal,entry,pace' && editing.chosen.includes('gap') && editing.chosen.includes('method'),
    JSON.stringify(editing));

  // 「全部用默认」：清空偏好、给出保守起点
  await page.locator('.start-chooser-head button', { hasText: '全部用默认' }).click();
  await page.waitForTimeout(300);
  const defaults = await page.evaluate((key) => ({
    stored: localStorage.getItem(key),
    title: document.querySelector('.start-plan h3')?.textContent ?? '',
    actions: [...document.querySelectorAll('.start-plan-actions a')].map((link) => link.getAttribute('href')),
  }), PREFS_KEY);
  check('「全部用默认」清掉本机偏好，并给出保守起点',
    // 这一页是**回访者**（本机有来过标记），因此清空偏好后看到的默认起点是「回访默认」
    // ——先接上次的进度，而不是首访者的「先看全局」。两种默认的判据见 TODO A4-25 那一节。
    defaults.stored === null && defaults.title.includes('默认起点') && defaults.actions.includes('/profile'),
    JSON.stringify(defaults));

  // ---- 4) 不设门禁：原有入口一个都没删 ----
  const direct = await page.evaluate(() => ({
    hint: document.querySelector('.start-direct-hint')?.textContent ?? '',
    sections: ['continue', 'cases', 'angles'].filter((id) => document.getElementById(id)).length,
    angleGroups: document.querySelectorAll('.angle-card').length,
    angleChips: document.querySelectorAll('.angle-chip').length,
  }));
  check('原有入口全部保留（引导只排序，不设门禁）',
    direct.sections === 3 && direct.angleChips > 10 && direct.hint.includes('想自己挑'),
    JSON.stringify({ sections: direct.sections, chips: direct.angleChips, hint: direct.hint.slice(0, 24) }));

  /*
   * ---- 5) 「先收起引导」与「重新显示引导」（TODO A4-24）----
   *
   * 第四十五、四十六轮的边界：跳过引导是**永久记忆**，想重看只能点「全部用默认」——
   * 而那个动作会把已经答过的三问清掉。现在两个动作分开：
   * 收起 = 暂时不看（本机记一个标记），重新显示 = 再把三问摊开，**答案原样都在**。
   */
  await page.goto(server.origin + '/start', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  /*
   * 这一页在同一个上下文里已经来过（有来过标记），因此引导默认是收起的——
   * 这也正是 A4-25 的行为。要测「收起」就得先点「改一改」把它摊开。
   */
  await page.locator('.start-chooser-actions button', { hasText: '改一改' }).click();
  await page.waitForTimeout(250);
  // 答两问（第三问还没答）——此时仍在「编辑中」，正是「不想答了，先收起来」的那一刻。
  await page.locator('.start-question[data-question="goal"] .start-option[data-option="route"]').click();
  await page.waitForTimeout(150);
  await page.locator('.start-question[data-question="entry"] .start-option[data-option="case"]').click();
  await page.waitForTimeout(250);
  const beforeCollapse = await page.evaluate((key) => ({
    stored: JSON.parse(localStorage.getItem(key) ?? 'null'),
    questions: document.querySelectorAll('.start-question').length,
  }), PREFS_KEY);

  await page.locator('.start-chooser-actions button', { hasText: '先收起引导' }).click();
  await page.waitForTimeout(300);
  const collapsed = await page.evaluate((key) => ({
    stored: JSON.parse(localStorage.getItem(key) ?? 'null'),
    collapsedFlag: localStorage.getItem('mcs-start-guide-collapsed-v1'),
    dataCollapsed: document.querySelector('.start-chooser')?.getAttribute('data-collapsed'),
    questions: document.querySelectorAll('.start-question').length,
    planTitle: document.querySelector('.start-plan h3')?.textContent ?? '',
    buttons: [...document.querySelectorAll('.start-chooser-actions button')].map((button) => button.textContent?.trim() ?? ''),
  }), PREFS_KEY);
  check('「先收起引导」只收起：三问收起、结论仍在、偏好一个字段都没动',
    beforeCollapse.questions === 3 && collapsed.questions === 0 && collapsed.collapsedFlag === '1'
      && collapsed.dataCollapsed === 'true'
      && JSON.stringify(collapsed.stored) === JSON.stringify(beforeCollapse.stored),
    JSON.stringify({ before: beforeCollapse.stored, after: collapsed.stored, flag: collapsed.collapsedFlag }));

  // 刷新之后仍然是收起的（收起状态被记住），并且能一键回来。
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const afterReload = await page.evaluate((key) => ({
    questions: document.querySelectorAll('.start-question').length,
    stored: JSON.parse(localStorage.getItem(key) ?? 'null'),
    hasExpand: [...document.querySelectorAll('.start-chooser-actions button')].some((button) => (button.textContent ?? '').includes('重新显示引导')),
  }), PREFS_KEY);
  check('刷新后仍保持收起，且偏好没丢（下次不必重答）',
    afterReload.questions === 0 && JSON.stringify(afterReload.stored) === JSON.stringify(beforeCollapse.stored),
    JSON.stringify(afterReload));
  check('收起状态下有「重新显示引导」入口（不是只能靠「全部用默认」回来）', afterReload.hasExpand);

  await page.locator('.start-chooser-actions button', { hasText: '重新显示引导' }).click();
  await page.waitForTimeout(300);
  const expanded = await page.evaluate(() => ({
    questions: [...document.querySelectorAll('.start-question')].map((item) => item.getAttribute('data-question')),
    chosen: [...document.querySelectorAll('.start-option.is-chosen')].map((option) => option.getAttribute('data-option')),
    collapsedFlag: localStorage.getItem('mcs-start-guide-collapsed-v1'),
  }));
  check('「重新显示引导」把三问摊开，原来的选择还在，收起标记被清掉',
    expanded.questions.join(',') === 'goal,entry,pace' && expanded.chosen.includes('route')
      && expanded.chosen.includes('case') && expanded.collapsedFlag === null,
    JSON.stringify(expanded));

  /*
   * ---- 6) 默认起点分首访 / 回访（TODO A4-25）----
   *
   * 第四十六轮的边界：默认值是保守的三项（看全局 + 按案例 + 不设节奏）。
   * 现在按「以前来过没有」分开：首访先给结构，回访先给继续与复习。
   * 判据是本机标记（`mcs-start-visited-v1`），与有没有学习记录无关。
   */
  const visitContext = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const visitPage = await visitContext.newPage();
  await visitPage.goto(server.origin + '/start', { waitUntil: 'networkidle' });
  await visitPage.evaluate(() => { localStorage.removeItem('mcs-start-preferences-v1'); localStorage.removeItem('mcs-start-visited-v1'); });
  await visitPage.reload({ waitUntil: 'networkidle' });
  await visitPage.waitForTimeout(700);
  const firstVisit = await visitPage.evaluate(() => ({
    kind: document.querySelector('.start-chooser')?.getAttribute('data-default-plan'),
    title: document.querySelector('.start-plan h3')?.textContent ?? '',
    actions: [...document.querySelectorAll('.start-plan-actions a')].map((link) => link.getAttribute('href')),
    basis: [...document.querySelectorAll('.start-plan-basis li')].map((item) => item.textContent ?? ''),
    questions: document.querySelectorAll('.start-question').length,
  }));
  check('首访（本机没有来过标记）：三问从头开始问（渐进披露，先只出现第 1 问）',
    firstVisit.kind === 'first-visit' && firstVisit.questions === 1, JSON.stringify(firstVisit));

  // 首访者不想答：点「直接给我默认起点」收起（**不清偏好**），起点卡于是显示出来。
  await visitPage.locator('.start-plan-skip button').click();
  await visitPage.waitForTimeout(300);
  const firstDefault = await visitPage.evaluate(() => ({
    title: document.querySelector('.start-plan h3')?.textContent ?? '',
    actions: [...document.querySelectorAll('.start-plan-actions a')].map((link) => link.getAttribute('href')),
    basis: [...document.querySelectorAll('.start-plan-basis li')].map((item) => item.textContent ?? ''),
  }));
  check('首访的默认起点：先看全局，并写明这是默认值（不是他选过）',
    firstDefault.title.includes('首访') && firstDefault.actions.includes('/network')
      && firstDefault.basis.some((line) => line.includes('第一次来')),
    JSON.stringify(firstDefault));

  await visitPage.reload({ waitUntil: 'networkidle' });
  await visitPage.waitForTimeout(700);
  const returningVisit = await visitPage.evaluate(() => ({
    kind: document.querySelector('.start-chooser')?.getAttribute('data-default-plan'),
    title: document.querySelector('.start-plan h3')?.textContent ?? '',
    actions: [...document.querySelectorAll('.start-plan-actions a')].map((link) => link.getAttribute('href')),
    basis: [...document.querySelectorAll('.start-plan-basis li')].map((item) => item.textContent ?? ''),
    questions: document.querySelectorAll('.start-question').length,
  }));
  check('回访（本机已有来过标记）：直接看结论，默认起点先接上次的进度',
    returningVisit.kind === 'returning' && returningVisit.title.includes('回访')
      && returningVisit.actions.includes('/profile') && returningVisit.basis.some((line) => line.includes('回访者'))
      && returningVisit.questions === 0,
    JSON.stringify(returningVisit));
  check('两种默认起点确实不同（不是换个标题）',
    JSON.stringify(firstDefault.actions) !== JSON.stringify(returningVisit.actions),
    JSON.stringify({ first: firstDefault.actions, returning: returningVisit.actions }));

  /*
   * ---- 7) 节奏偏好参与 /plan 的默认（TODO A4-23）----
   *
   * 第四十六轮的边界：「三问的答案只影响开始页的入口排序，`/plan` 不套用。」
   * 这一条把「一次一小步」接到规划页的事件界上，并在页面上写明它只改默认值、不改算法。
   */
  await visitPage.evaluate(() => {
    localStorage.setItem('mcs-start-preferences-v1', JSON.stringify({ goal: 'route', entry: 'case', pace: 'small' }));
  });
  await visitPage.goto(server.origin + '/plan', { waitUntil: 'networkidle' });
  await visitPage.waitForTimeout(900);
  const planWithPace = await visitPage.evaluate(() => ({
    horizon: Number(document.querySelector('.plan-advanced input[type="number"]')?.value ?? '-1'),
    note: document.querySelector('.plan-pace-note')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    source: document.querySelector('.plan-pace-note')?.getAttribute('data-pace-source') ?? '',
  }));
  check('「一次一小步」把 /plan 的事件界默认改到 3，并写明依据',
    planWithPace.horizon === 3 && planWithPace.source === 'small' && planWithPace.note.includes('一次一小步'),
    JSON.stringify(planWithPace));
  check('说明里写清「只改默认值」——算法与本体不变，改输入即覆盖',
    planWithPace.note.includes('只改这个默认值') && planWithPace.note.includes('规划算法'),
    planWithPace.note.slice(0, 140));

  await visitPage.evaluate(() => {
    localStorage.setItem('mcs-start-preferences-v1', JSON.stringify({ goal: null, entry: null, pace: null }));
  });
  await visitPage.reload({ waitUntil: 'networkidle' });
  await visitPage.waitForTimeout(900);
  const planWithoutPace = await visitPage.evaluate(() => ({
    horizon: Number(document.querySelector('.plan-advanced input[type="number"]')?.value ?? '-1'),
    note: document.querySelectorAll('.plan-pace-note').length,
  }));
  check('没有节奏偏好时不动默认值（事件界回到 8，页面上没有偏好说明）',
    planWithoutPace.horizon === 8 && planWithoutPace.note === 0, JSON.stringify(planWithoutPace));
  await visitContext.close();

  // 窄屏
  await page.setViewportSize({ width: 720, height: 900 });
  await page.waitForTimeout(400);
  const narrow = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    optionWidth: document.querySelector('.start-option')?.getBoundingClientRect().width ?? 0,
    viewport: window.innerWidth,
  }));
  check('窄屏选项竖排且没有横向溢出',
    narrow.overflow <= 2 && narrow.optionWidth <= narrow.viewport,
    JSON.stringify({ overflow: narrow.overflow, option: Math.round(narrow.optionWidth) }));

  check('开始学习页引导没有控制台错误', consoleErrors.length === 0, consoleErrors.join(' | '));
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n开始学习页偏好引导验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n开始学习页偏好引导验收通过。');
