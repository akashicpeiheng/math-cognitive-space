/**
 * 网站流程的浏览器核对：自动关联页（六步）与节点详情页的两个入口。
 *
 * ## 这份测试与 `relation-discovery-e2e.mjs` 的分工
 *
 * 后者验的是**数学与事务**：候选生成、证书、重放、发布、回滚。
 * 这一份验的是**界面真的把那些东西摆出来了**：六个步骤在页面上、公式检查的
 * 错误能定位、结果按三维状态分组、入库预览给出变更清单、撤出入口存在，
 * 而且窄屏与键盘都能走。
 *
 * ## 第二版：把恒真断言换成真流程
 *
 * 上一版有两条断言把计数与 0 作比较——恒真，容器不存在也能通过（验收第 8 条点了名）。
 * 现在改成**真的走一遍**：套用「群」骨架（连点两次，守住一个真缺陷）→ 填名称
 * （断言界面显示出派生的 node id）→ 检查表达（断言服务端 `POST /formal/validate`
 * 真的返回 `ok:true`、请求体带上背景与 node id、页面上没有 `.spec-problems li`）→
 * 创建服务端草稿 → 启动自动发现（断言按钮可用、且真的发出 `POST /relation-discovery/jobs`）→
 * 轮询到任务终态 → 审阅（断言分组存在，且「有条目」或「明说没有候选的原因」二者必居其一）→
 * 入库预览（断言预览请求发出，且「有变更清单」或「明说为什么没有」必居其一）。
 *
 * 宁可慢也不要空断言：一次完整流程约 30–60 秒。
 *
 * 只断言"看得见的东西"，不做截图比对——本项目的浏览器验收一直用元素级断言
 * （见 `tests/browser.mjs` 的取向），截图留给人工。
 */
import { resolve } from 'node:path';
import { startTestServer } from './helpers.mjs';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';

import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail) {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

let playwright = null;
try { playwright = await import(PLAYWRIGHT); } catch { playwright = null; }

if (!playwright) {
  /*
   * 没有可用的无头浏览器时**如实跳过**，不假装通过。
   * 这条路径会在交付说明里写成"本机缺浏览器运行时，界面核对未执行"。
   */
  console.log('SKIP：本机没有可用的 Playwright/Chrome，界面核对未执行（不是通过）。');
  process.exit(0);
}

const server = await startTestServer({ staticDir: resolve(MCS_WEB_ROOT, 'web', 'dist') });
let browser;
/** 未预期的异常（例如某个元素在旧构建里不存在导致定位超时）也要变成失败清单里的一条，而不是裸堆栈。 */
let unexpected = null;
try {
  const { chromium } = await playwright;
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  /* ---------------------------------------------- 请求/响应取证 */
  /*
   * 断言要看**服务端真的收到并答应了什么**，不只看页面文字。
   * 这里只记形状（状态码 + 关键字段），不落整包内容——候选里可能有很长的公式。
   */
  const seen = { validate: [], jobs: [], drafts: [], preview: [], commit: [] };
  const responses = [];
  page.on('request', (request) => {
    const url = request.url();
    const body = request.postData() ?? '';
    const parse = () => { try { return JSON.parse(body); } catch { return null; } };
    if (url.includes('/api/v2/formal/validate')) seen.validate.push({ spec: parse()?.spec ?? null });
    if (url.includes('/api/v2/relation-discovery/jobs') && request.method() === 'POST') seen.jobs.push({ body: parse() });
    if (url.includes('/api/v2/authoring/drafts') && request.method() === 'POST') seen.drafts.push({ body: parse() });
    if (url.includes('/api/v2/authoring/publications/preview')) seen.preview.push({ body: parse() });
    // 入库是 `/publications`（不带 `/preview`）：分开记，别把预览当成了入库。
    if (/\/api\/v2\/authoring\/publications$/.test(url) && request.method() === 'POST') seen.commit.push({ body: parse() });
  });
  page.on('response', async (response) => {
    const url = response.url();
    const wanted = ['/api/v2/formal/validate', '/api/v2/relation-discovery/jobs', '/api/v2/authoring/drafts', '/api/v2/authoring/publications'];
    if (!wanted.some((part) => url.includes(part))) return;
    let payload = null;
    try { payload = await response.json(); } catch { payload = null; }
    responses.push({ url: url.replace(server.origin, ''), status: response.status(), payload });
  });

  const step = async (index) => { await page.locator('.authoring-step-button').nth(index).click(); await page.waitForTimeout(200); };
  const text = () => page.locator('body').innerText();
  const waitFor = async (predicate, { timeout = 60000, interval = 300 } = {}) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await predicate()) return true;
      await page.waitForTimeout(interval);
    }
    return false;
  };

  /* ---------------------------------------------- 入口一：辅助导航 */
  await page.goto(server.origin, { waitUntil: 'networkidle' });
  check('辅助导航里有「自动关联」入口', (await page.locator('a[href="/authoring"]').count()) >= 1);

  /* ---------------------------------------------- 主流程页面 */
  await page.goto(server.origin + '/authoring', { waitUntil: 'networkidle' });
  const steps = await page.locator('.authoring-steps li, .authoring-steps > *').count();
  check('六步主流程都在页面上', steps >= 6, `steps=${steps}`);
  check('有草稿栏（自动保存与恢复的落点）', (await page.locator('.authoring-draftbar').count()) >= 1);
  check('有形式表达编辑器', (await page.locator('.spec-sources, textarea, input[type="text"]').count()) >= 1);
  const bodyText = await page.locator('body').innerText();
  for (const word of ['填写', '检查', '发现', '审阅', '入库']) {
    check(`步骤文案含「${word}」`, bodyText.includes(word));
  }

  /* ---------------------------------------------- 真流程 1：套用「群」骨架（连点两次） */
  /*
   * 连点两次是为了守住一个真缺陷：早先第二次点击会把「再点一次确认覆盖」
   * 写进全局提示，而草稿其实第一次就已经套用了 —— 页面于是留着一条与状态矛盾的话。
   * 现在：第一次套用（草稿为空，无需确认），第二次明说「已经套用过了」且不出现待确认提示。
   */
  const groupCard = page.locator('.authoring-templates li', { hasText: '群：群公理骨架' }).first();
  const groupButton = groupCard.locator('button', { hasText: '套用' }).first();
  check('四案例骨架里有「群」这一套', (await groupButton.count()) === 1);
  await groupButton.click();
  await page.waitForTimeout(300);
  const afterFirst = { background: await page.locator('.spec-grid select').first().inputValue(), text: await text() };
  check('第一次点击就套用了「群」骨架（背景变成 bg:group/1）', afterFirst.background === 'bg:group/1', JSON.stringify(afterFirst.background));
  await groupButton.click();
  await page.waitForTimeout(300);
  const afterSecond = await text();
  check('第二次点击说明「已经套用过了」，且页面上不再出现「再点一次确认」',
    afterSecond.includes('已经套用过了') && !afterSecond.includes('再点一次确认'),
    afterSecond.slice(0, 240));
  check('套用后不再残留「确认覆盖当前草稿字段」的提示', !afterSecond.includes('确认覆盖当前草稿字段'));

  /* ---------------------------------------------- 真流程 2：套用一条已登记模板（把陈述填上） */
  /*
   * 四案例骨架**故意**只填骨架（陈述与解释留空，显示「待补充」），所以它还通过不了解析检查。
   * 这里再套用一条登记表里的形式表达：它是真的可解析、可发现的表达，后面的检查与发现才有内容。
   */
  const picker = page.locator('.authoring-template-picker select');
  const pickerCount = await picker.count();
  if (pickerCount > 0) {
    const options = await picker.locator('option').allInnerTexts();
    const wanted = options.find((item) => item.includes('group:left-mul'))
      ?? options.find((item) => item.includes('group:') || item.includes('群'));
    check('登记模板下拉里有可选的模板', Boolean(wanted), JSON.stringify(options.slice(0, 3)));
    if (wanted) {
      await picker.selectOption({ label: wanted });
      await page.waitForTimeout(150);
      const applyRegistered = page.locator('.authoring-registered-templates button', { hasText: '套用' }).first();
      await applyRegistered.click();
      await page.waitForTimeout(250);
      /*
       * 草稿里已经有内容（刚套过骨架）时，第一次点击只是**进入待确认态**，
       * 再点一次才真的覆盖。这里按结果判断，而不是按某个提示元素是否存在——
       * 提示元素在旧构建里没有，测试不该因此漏掉那一击。
       */
      if ((await page.locator('#spec-statement').inputValue()).trim() === '') {
        await applyRegistered.click();
        await page.waitForTimeout(300);
      }
      check('覆盖已有草稿时待确认提示只出现在按钮旁边（不写进全局提示）',
        (await page.locator('.authoring-registered-templates .authoring-armed').count()) <= 1);
    }
  } else {
    check('登记模板下拉存在（目录里应有 31 条登记模板）', false, '没找到 .authoring-template-picker select');
  }
  const statementAfterTemplate = await page.locator('#spec-statement').inputValue();
  check('套用登记模板后陈述非空（否则检查必然失败）', statementAfterTemplate.trim().length > 0, JSON.stringify(statementAfterTemplate.slice(0, 80)));

  /* ---------------------------------------------- 真流程 3：填名称（断言派生出的 node id） */
  const nameInput = page.locator('.authoring-form input').first();
  await nameInput.fill('（验收）骨架检查');
  await page.waitForTimeout(250);
  const nodeIdText = await page.locator('[data-testid="derived-node-id"]').innerText().catch(() => '');
  check('界面显示由名称派生出的 node id', nodeIdText.startsWith('draft:') && nodeIdText.length > 'draft:'.length, nodeIdText);
  check('node id 与名称相关（可读、不是空壳）', nodeIdText.includes('骨架检查'), nodeIdText);
  /* 学科是入库的硬要求（`buildNodeRecord` 要求受控词表里的值）：套用「群」骨架时应已带上默认值。 */
  const disciplineInput = page.locator('.authoring-form input[list="authoring-disciplines"]');
  const disciplineValue = (await disciplineInput.count()) > 0 ? await disciplineInput.inputValue() : null;
  check('套用案例骨架后学科有默认值（入库要求，空着会让预览永远带阻断项）',
    typeof disciplineValue === 'string' && disciplineValue.trim().length > 0,
    JSON.stringify(disciplineValue));

  /* ---------------------------------------------- 真流程 3：检查表达（断言服务端 ok:true） */
  await step(1);
  await page.locator('section.card button.primary', { hasText: '检查表达' }).first().click();
  const checked = await waitFor(async () => responses.some((item) => item.url.includes('/formal/validate')), { timeout: 30000 });
  check('点「检查表达」真的发出了 POST /formal/validate', checked && seen.validate.length > 0, JSON.stringify(seen.validate.length));
  const validateRequest = seen.validate.at(-1)?.spec ?? null;
  check('请求体带上了背景理论', Boolean(validateRequest?.background), JSON.stringify(validateRequest?.background ?? null));
  check('请求体带上了派生的 node id（不再是空串）',
    typeof validateRequest?.node === 'string' && validateRequest.node.startsWith('draft:'),
    JSON.stringify(validateRequest?.node ?? null));
  const validateResponse = responses.filter((item) => item.url.includes('/formal/validate')).at(-1);
  check('服务端返回 ok:true（解析与类型检查通过）', validateResponse?.payload?.data?.ok === true,
    JSON.stringify({ status: validateResponse?.status, ok: validateResponse?.payload?.data?.ok, problems: validateResponse?.payload?.data?.problems }));
  await page.waitForTimeout(300);
  check('页面上没有解析问题条目（.spec-problems li 为空）', (await page.locator('.spec-problems li').count()) === 0,
    await page.locator('.spec-problems').innerText().catch(() => ''));
  check('页面上出现了「解析与类型检查通过」字样', (await text()).includes('解析与类型检查通过'));

  /* ---------------------------------------------- 缺陷回归：故意写坏的公式仍要被拦下 */
  const statementArea = page.locator('#spec-statement');
  const goodStatement = await statementArea.inputValue();
  await statementArea.fill('∀(a:G). a = ');
  await page.locator('section.card button.primary', { hasText: '检查表达' }).first().click();
  await page.waitForTimeout(2500);
  check('故意写坏的公式会被拦下并给出行列位置',
    /行|列|位置/.test(await text()) && (await page.locator('.spec-problems li').count()) > 0);
  await statementArea.fill(goodStatement);
  await page.locator('section.card button.primary', { hasText: '检查表达' }).first().click();
  await page.waitForTimeout(2500);
  check('改回正确公式后重新检查又能通过（不是一次性的）',
    responses.filter((item) => item.url.includes('/formal/validate')).at(-1)?.payload?.data?.ok === true);

  /* ---------------------------------------------- 真流程 4：保存草稿 → 启动发现 */
  await step(2);
  const blockersBefore = await page.locator('.authoring-blockers li').allInnerTexts();
  check('第 3 步把「还不能启动」的原因写成可见文字', blockersBefore.length > 0, JSON.stringify(blockersBefore));
  check('可见原因里点明要先保存服务端草稿', blockersBefore.some((item) => item.includes('保存到服务端')), JSON.stringify(blockersBefore));

  await page.locator('button', { hasText: '创建服务端草稿' }).first().click();
  const draftCreated = await waitFor(
    async () => seen.drafts.length > 0 && responses.some((item) => item.url.includes('/authoring/drafts') && item.status === 200),
    { timeout: 30000 },
  );
  check('点「创建服务端草稿」真的发出了 POST /authoring/drafts 并 200', draftCreated, JSON.stringify(seen.drafts.length));
  const draftBody = seen.drafts.at(-1)?.body ?? null;
  check('草稿请求带上了归一 spec（含 node id）', Boolean(draftBody?.spec?.node), JSON.stringify(draftBody?.spec?.node ?? null));
  check('草稿请求带上了学科（入库时按受控词表核对）', Boolean(draftBody?.discipline), JSON.stringify(draftBody?.discipline ?? null));

  const startButton = page.locator('section.card button.primary', { hasText: '启动自动发现' }).first();
  const blockersAfter = await page.locator('.authoring-blockers li').allInnerTexts();
  check('草稿建好后「启动自动发现」可用', (await startButton.isEnabled()) === true,
    JSON.stringify({ blockers: blockersAfter, disabled: await startButton.isDisabled() }));
  await startButton.click();
  const jobStarted = await waitFor(async () => seen.jobs.length > 0, { timeout: 30000 });
  check('点「启动自动发现」真的发出了 POST /relation-discovery/jobs', jobStarted, JSON.stringify(seen.jobs.length));
  const jobRequest = seen.jobs.at(-1)?.body ?? null;
  check('发现请求带上了 draftId 与背景', Boolean(jobRequest?.draftId) && Boolean(jobRequest?.background), JSON.stringify(jobRequest));

  /* 轮询到任务终态：页面自己每 2.5 秒取一次状态，这里等它把终态显示出来。 */
  const runFinished = await waitFor(async () => {
    const current = await text();
    return /状态\s*(completed|error|interrupted|cancelled)/.test(current)
      || current.includes('已完成') || current.includes('执行错误') || current.includes('已中断') || current.includes('已取消');
  }, { timeout: 90000, interval: 500 });
  check('任务能跑到结束（页面显示终态）', runFinished, (await text()).slice(0, 400));
  check('任务状态区显示候选统计', /候选\s*\d+/.test(await text()), (await text()).slice(0, 300));

  /* ---------------------------------------------- 真流程 5：审阅（分组 + 有条目或有原因） */
  await step(3);
  await page.waitForTimeout(600);
  const reviewGroups = await page.locator('.review-group').count();
  const reviewItems = await page.locator('.review-item').count();
  const statuses = await page.locator('.review-item[data-status]').evaluateAll((items) => [...new Set(items.map((item) => item.dataset.status))]);
  const reviewText = await text();
  const reviewExplainsEmpty = /没有候选|没有产生候选/.test(reviewText);
  check('审阅视图渲染出三档分组容器', reviewGroups >= 3, `groups=${reviewGroups}`);
  check('审阅面板查到候选条目，或页面明确写出「没有候选」的原因（不能两者都没有）',
    reviewItems > 0 || reviewExplainsEmpty, JSON.stringify({ items: reviewItems, explains: reviewExplainsEmpty }));
  check('候选条目带 data-status 三维状态（已验证/已反驳/未决）',
    reviewItems === 0 || (statuses.length > 0 && statuses.every((status) => ['verified', 'refuted', 'undecided'].includes(status))),
    JSON.stringify(statuses));
  check('状态同时有文字与记号（不只靠颜色）',
    reviewItems === 0 || (await page.locator('.review-mark').count()) >= reviewItems);
  if (reviewItems > 0) {
    await page.locator('.review-item').first().locator('summary').click();
    await page.waitForTimeout(200);
    const detailText = await page.locator('.review-item').first().innerText();
    check('展开一条候选能看到「精确条件」与「重放」', detailText.includes('精确条件') && detailText.includes('重放'));
    check('已验证候选能被采纳（有采纳按钮，且已纳入入库范围）',
      (await page.locator('.review-item').first().locator('button', { hasText: '采纳' }).count()) === 1);
  }

  /* ---------------------------------------------- 真流程 6：入库预览（请求发出 + 有清单或有原因） */
  await step(4);
  await page.locator('button', { hasText: '计算服务端差异' }).first().click();
  const previewIssued = await waitFor(async () => seen.preview.length > 0, { timeout: 40000 });
  check('点「计算服务端差异」真的发出了 POST /authoring/publications/preview', previewIssued, JSON.stringify(seen.preview.length));
  const previewResponse = responses.filter((item) => item.url.includes('/authoring/publications')).at(-1);
  check('预览响应是 200（或页面如实写出未就绪/失败原因）',
    previewResponse?.status === 200 || /未就绪|无法|失败|不可用/.test(await text()),
    JSON.stringify({ status: previewResponse?.status }));
  await page.waitForTimeout(500);
  const pubItems = await page.locator('.pub-list > li').count();
  const pubGraph = await page.locator('.pub-graph').count();
  const pubDiff = await page.locator('.pub-diff').count();
  const pubText = await text();
  const pubExplains = /没有.*可预览|未就绪|本地预演|没有已验证关系|阻断项/.test(pubText);
  check('入库预览渲染出变更清单容器', pubGraph > 0 || pubDiff > 0);
  check('预览里有变更条目，或页面明确写出为什么没有（不能两者都没有）',
    pubItems > 0 || pubExplains, JSON.stringify({ items: pubItems, explains: pubExplains }));
  check('入库前能看见「确认入库」入口', (await page.locator('button', { hasText: '确认入库' }).count()) >= 1);

  /* ---------------------------------------------- 入库三分法：可入库 / 待证 / 不入库 */
  /*
   * 服务端把入库语义分成三类（`publishable` / `pending` / `excluded`），界面必须照它分栏：
   * 「待证」与「不入库」都**不是**阻断项；真正阻断的只有 `problems`（提交 409）。
   * 这里断言页面确实消费了这些字段；某类为空时不硬造条目。
   */
  const taxonomyText = await text();
  const taxonomy = /服务端三分类：可入库\s*(\d+)\s*条\s*·\s*记为待证\s*(\d+)\s*条\s*·\s*不入库\s*(\d+)\s*条/.exec(taxonomyText);
  check('入库预览显示服务端三分类计数（可入库 / 记为待证 / 不入库）', Boolean(taxonomy), taxonomyText.slice(-500));
  if (taxonomy) {
    const [, publishableCount, pendingCount, excludedCount] = taxonomy.map(Number);
    console.log(`  · 三分类：可入库 ${publishableCount} · 待证 ${pendingCount} · 不入库 ${excludedCount}`);
    const pendingSection = await page.locator('h3', { hasText: '记为待证（不阻断）' }).count();
    const excludedSection = await page.locator('h3', { hasText: '不在入库范围（不阻断）' }).count();
    check('「记为待证」的条数与分栏一致（有则分栏，无则不分栏）',
      (pendingCount > 0) === (pendingSection > 0), JSON.stringify({ pendingCount, pendingSection }));
    check('「不在入库范围」的条数与分栏一致（有则分栏，无则不分栏）',
      (excludedCount > 0) === (excludedSection > 0), JSON.stringify({ excludedCount, excludedSection }));
    check('「待证」与「不入库」都没有被写成阻断项（措辞与行为一致）',
      !/阻断项[\s\S]{0,200}记为待证/.test(taxonomyText) && !/阻断项[\s\S]{0,200}不在入库范围/.test(taxonomyText));
    /* 被判「不入库」的候选在勾选清单里必须置灰、且写明原因（不是系统出错）。 */
    const excludedRows = await page.locator('.pub-include-excluded').count();
    if (excludedCount > 0) {
      check('被判不入库的候选在勾选清单里置灰且不能勾选',
        excludedRows === excludedCount && (await page.locator('.pub-include-excluded input[type="checkbox"]:disabled').count()) === excludedCount,
        JSON.stringify({ excludedRows, excludedCount }));
      check('置灰项写出了原因，并说明不是系统出错',
        (await page.locator('.pub-include-excluded p').first().innerText()).includes('不是系统出错'));
    } else {
      check('本次没有被判不入库的候选（分栏与计数都为空，不硬造条目）', excludedRows === 0);
    }
  }

  /* ---------------------------------------------- 真流程 7：真的把「确认入库」点完 */
  /*
   * 上一版只断言"入口存在"，等于没验入库。这里真的点下去，并看**服务端答应了什么**：
   *   · 必须发出 `POST /api/v2/authoring/publications`（不是 /preview，两者分开记）；
   *   · 200 → 页面要显示新版本号，且**版本列表里出现这条新版本**；
   *   · 非 200 → 页面要写出可读的失败原因（不能静默），且不能谎称已入库。
   * 两条路都算通过，但走的是哪条会打印出来——入库能不能成，不该靠"入口存在"糊过去。
   */
  await step(5);
  const revisionsBefore = await page.locator('.pub-revisions tbody tr').count();
  const publishButton = page.locator('section.pub-commit button.primary', { hasText: '确认入库' }).first();
  check('第 6 步的「确认入库」按钮可用', (await publishButton.isEnabled()) === true,
    JSON.stringify({ disabled: await publishButton.isDisabled().catch(() => null), text: (await text()).slice(-300) }));
  await publishButton.click();
  const commitIssued = await waitFor(async () => seen.commit.length > 0, { timeout: 90000, interval: 400 });
  check('点「确认入库」真的发出了 POST /api/v2/authoring/publications', commitIssued, JSON.stringify({ commit: seen.commit.length, preview: seen.preview.length }));
  const commitBody = seen.commit.at(-1)?.body ?? null;
  check('入库请求带上了草稿修订、发现任务与审阅摘要',
    Number.isInteger(commitBody?.draftRevision) && Boolean(commitBody?.runId) && Boolean(commitBody?.reviewDigest),
    JSON.stringify({ draftRevision: commitBody?.draftRevision ?? null, runId: commitBody?.runId ?? null, digest: Boolean(commitBody?.reviewDigest) }));
  const commitResponse = await waitFor(
    async () => responses.some((item) => /\/api\/v2\/authoring\/publications$/.test(item.url)),
    { timeout: 90000, interval: 400 },
  );
  const commitResult = responses.filter((item) => /\/api\/v2\/authoring\/publications$/.test(item.url)).at(-1);
  check('入库请求得到了服务端应答', commitResponse && Boolean(commitResult), JSON.stringify(commitResult?.status ?? null));
  await page.waitForTimeout(1200);
  const afterPublishText = await text();
  const revisionId = commitResult?.payload?.data?.revision?.id ?? null;

  if (commitResult?.status === 200 && revisionId) {
    console.log(`  · 入库成功分支：新版本 ${revisionId}`);
    check('入库返回 200，且页面显示新版本号', afterPublishText.includes(revisionId), revisionId);
    const revisionRows = await page.locator('.pub-revisions tbody tr').allInnerTexts();
    check('版本列表里出现了这条新版本（不是只在提示里说了一句）',
      revisionRows.some((row) => row.includes(revisionId)),
      JSON.stringify(revisionRows.slice(0, 3)));
    check('版本列表的条数比入库前增加了', (await page.locator('.pub-revisions tbody tr').count()) > revisionsBefore,
      JSON.stringify({ before: revisionsBefore, after: await page.locator('.pub-revisions tbody tr').count() }));
    check('页面没有同时显示入库失败', !/入库失败|入库未能执行/.test(afterPublishText));
  } else {
    console.log(`  · 入库被挡分支：HTTP ${commitResult?.status ?? '（没有应答）'}`);
    const failureShown = /入库失败|入库未能执行|不能入库|封锁|阻断/.test(afterPublishText);
    check('入库没有成功时，页面写出了可读的失败原因（不静默）', failureShown, afterPublishText.slice(-400));
    const message = commitResult?.payload?.error?.message ?? '';
    check('失败原因来自服务端（页面里能看到服务端的说明或错误码）',
      Boolean(message) && afterPublishText.includes(message.slice(0, Math.min(12, message.length))),
      JSON.stringify({ message: message.slice(0, 120) }));
    check('没有谎称已入库（版本列表里不出现新版本）',
      !revisionId || !afterPublishText.includes(`已入库：版本 ${revisionId}`), revisionId ?? '（无 id）');
  }

  /* ---------------------------------------------- 「不入库」分栏（服务端形状的桩响应） */
  /*
   * 为什么用桩：当前数据下发现结果里没有**已验证**的概念锚点候选（实测 id=…→concept:group:abelian
   * 那种候选这轮是 undecided，进不了「本次入库范围」），所以真实流程走不到这一栏。
   * 这里用**服务端真实形状**的响应喂一次，验证界面把 `excluded` 单独成栏、写出 reasonCode 与原因，
   * 并明确说「不是系统出错、也不是命题不成立」。桩只作用在这一条断言上，跑完立刻撤销。
   */
  await step(4);
  const stubDiff = {
    nodes: { added: [], changed: [], removed: [], unchanged: 3 },
    relations: { added: [], changed: [], removed: [], unchanged: 0 },
    evidence: { added: [], changed: [], removed: [], unchanged: 0 },
    definitions: { added: [], changed: [], removed: [], unchanged: 0 },
    contracts: { added: [], changed: [], removed: [], unchanged: 0 },
    publishable: [],
    pending: [],
    excluded: [{
      candidateId: 'cand:concept-anchor-demo',
      kind: 'hardGeneralization',
      from: 'draft:（验收）骨架检查',
      to: 'concept:group:abelian',
      reason: '端点 concept:group:abelian 是概念锚点（只在登记表里有位置，本体与发布模型里都没有它）；这条需要取消勾选或驳回，不影响本次其余内容入库。',
      reasonCode: 'concept-anchor',
    }],
    refused: [],
    dismissed: [],
    totals: { added: {}, changed: {}, unchanged: {}, pending: 0, refused: 0, dismissed: 0 },
    nothingToPublish: false,
    steps: ['固定清单'],
    problems: [],
    warnings: [],
    sealed: true,
    note: '桩响应',
  };
  await page.route('**/api/v2/authoring/publications/preview', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, protocol: 'mcs-web/1', ontologyVersion: 'stub', data: { revision: null, diff: stubDiff } }),
    });
  });
  await page.locator('button', { hasText: '计算服务端差异' }).first().click();
  await page.waitForTimeout(900);
  const stubText = await text();
  check('被判「不入库」的候选单独成栏，并写出 reasonCode 与原因（桩响应）',
    (await page.locator('h3', { hasText: '不在入库范围（不阻断）' }).count()) === 1
      && stubText.includes('concept-anchor')
      && stubText.includes('概念锚点'),
    stubText.slice(-400));
  check('「不入库」被明确写成不是系统出错、也不是命题不成立（桩响应）',
    stubText.includes('不是系统出错，也不是命题不成立'));
  await page.unroute('**/api/v2/authoring/publications/preview');

  /* ---------------------------------------------- 入口二：节点详情页 */
  await page.goto(server.origin + '/nodes/group:group-concept', { waitUntil: 'networkidle' });
  const nodeText = await page.locator('body').innerText();
  check('节点详情页有「以此为基础创建」', nodeText.includes('以此为基础创建'));
  check('节点详情页有「检查已有形式表达」', nodeText.includes('检查已有形式表达'));

  /* ---------------------------------------------- 窄屏 */
  await page.setViewportSize({ width: 420, height: 900 });
  await page.goto(server.origin + '/authoring', { waitUntil: 'networkidle' });
  const narrowSteps = await page.locator('.authoring-steps li, .authoring-steps > *').count();
  check('窄屏下六步仍在（重排而不是隐藏）', narrowSteps >= 6, `narrow steps=${narrowSteps}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('窄屏下不出现横向滚动条', overflow <= 2, `overflow=${overflow}`);

  /* ---------------------------------------------- 键盘可达 */
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(server.origin + '/authoring', { waitUntil: 'networkidle' });
  const reachable = await page.evaluate(() => {
    const focusable = [...document.querySelectorAll('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled])')];
    const hidden = focusable.filter((element) => element.tabIndex < 0 && !element.hasAttribute('tabindex'));
    return { total: focusable.length, hidden: hidden.length };
  });
  check('交互元素都在 Tab 顺序里（没有 tabIndex<0 的暗坑）', reachable.total > 0 && reachable.hidden === 0, JSON.stringify(reachable));

  check('页面没有 JS 报错', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
} catch (thrown) {
  unexpected = thrown;
} finally {
  if (browser) await browser.close().catch(() => {});
  /*
   * 清理失败（Windows 上临时目录偶尔被 sqlite 的 WAL 句柄占住 → EPERM）不该把断言结果冲掉：
   * 断言失败要能看到失败清单，而不是一个 rmSync 的堆栈。
   */
  await server.cleanup().catch((error) => console.log(`（清理临时目录失败，忽略：${error.message}）`));
}

if (unexpected) {
  failures.push(`未预期的异常：${unexpected.message}`);
  console.log(`  ✗ 未预期的异常：${unexpected.message}`);
}

if (failures.length) {
  console.log(`\n界面核对失败 ${failures.length} 项：`);
  for (const item of failures) console.log('  - ' + item);
  process.exit(1);
}
console.log('\n界面核对全部通过。');
