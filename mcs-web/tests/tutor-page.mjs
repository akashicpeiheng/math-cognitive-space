import { startTestServer } from './helpers.mjs';

import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/**
 * 辅导页的 DeepTutor 提示、介绍与三步引导。
 *
 * 用户的要求：「侧栏的辅导那里添加显眼的提示表明接入了 DeepTutor；辅导页面里添加对 DeepTutor 的
 * 介绍说明；适当做一些引导式的视角效果。」
 *
 * 三条要求分别量：
 * 1. **显眼**：侧栏徽标存在、有底色、足够宽、文字与背景对比度够；
 * 2. **介绍**：是什么、怎么接（同一版本体 / 同一规划器 / 反馈只写 E）、两条接入路径、以及边界声明
 *    （没有测量过教学收益、断开时不伪造回复）——先核对内容，再核对它真的渲染出来；
 * 3. **引导**：三步里恰好一个「当前步」，只有**一个**区块被点亮（否则等于没有焦点），
 *    被点亮的区块只在装饰上变化（**不改透明度**，仍然可读可点），可跳过且本机记住，
 *    「减少动态效果」下没有呼吸动画。
 */
/**
 * 一段颜色与另一段颜色之间的对比度（WCAG 相对亮度）。
 *
 * 徽标是**白字 + 渐变底**：要量的是「文字 vs 底色」，不是「文字 vs 页面白」。
 * 第一版就是拿白字去比白底，算出 1.0 把自己的断言判失败（记在这里免得再犯）。
 */
const contrast = (a, b) => {
  const luminance = (rgb) => {
    const channels = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map((value) => {
      const channel = value / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const [high, low] = [luminance(a), luminance(b)].sort((left, right) => right - left);
  return (high + 0.05) / (low + 0.05);
};

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

  await page.goto(server.origin + '/tutor', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  // ---- 1) 侧栏提示 ----
  const nav = await page.evaluate(() => {
    const link = document.querySelector('.nav-item.secondary[href="/tutor"]');
    const badge = link?.querySelector('.nav-badge') ?? null;
    const style = badge ? getComputedStyle(badge) : null;
    const rect = badge?.getBoundingClientRect() ?? null;
    return {
      label: link?.querySelector('.nav-label')?.textContent ?? null,
      title: link?.getAttribute('title') ?? '',
      badgeText: badge?.textContent?.trim() ?? null,
      background: style?.backgroundImage ?? '',
      color: style?.color ?? '',
      width: rect?.width ?? 0,
      height: rect?.height ?? 0,
      fontSize: style ? Number.parseFloat(style.fontSize) : 0,
      // 渐变底色的每一个色标：文字必须对**每一个**都够对比，不能只对其中一端。
      stops: (style?.backgroundImage ?? '').match(/rgb\([^)]+\)/g) ?? [],
      note: document.querySelector('.nav-secondary-note')?.textContent ?? '',
    };
  });
  check('侧栏「辅导」上挂着 DeepTutor 徽标',
    nav.label === '辅导' && nav.badgeText === 'DeepTutor' && nav.width >= 60 && nav.height >= 14,
    JSON.stringify({ label: nav.label, badge: nav.badgeText, w: Math.round(nav.width), h: Math.round(nav.height) }));
  const badgeContrast = Math.min(...(nav.stops.length ? nav.stops : ['rgb(255,255,255)']).map((stop) => contrast(nav.color, stop)));
  check('徽标是实心渐变底 + 白字，且对每个色标都达到 AA 对比度',
    nav.background.includes('gradient') && nav.stops.length >= 2 && badgeContrast >= 4.5 && nav.fontSize >= 9,
    JSON.stringify({ stops: nav.stops, color: nav.color, contrast: Number(badgeContrast.toFixed(2)), fontSize: nav.fontSize }));
  check('链接的 title 说明了这是本机可选入口',
    nav.title.includes('DeepTutor') && nav.title.includes('可选入口'), nav.title);
  check('侧栏底部说明也提到了 DeepTutor', nav.note.includes('DeepTutor'), nav.note.slice(0, 60));

  // ---- 2) 介绍说明 ----
  const intro = await page.evaluate(() => {
    const section = document.querySelector('.tutor-intro');
    const text = section?.textContent?.replace(/\s+/g, ' ') ?? '';
    return {
      exists: Boolean(section),
      text,
      how: [...section.querySelectorAll('.tutor-intro-list li strong')].map((node) => node.textContent),
      paths: [...section.querySelectorAll('.tutor-intro-paths strong')].map((node) => node.textContent),
      boundary: section.querySelector('.tutor-intro-boundary')?.textContent?.replace(/\s+/g, ' ') ?? '',
      links: [...section.querySelectorAll('.tutor-intro-link')].map((link) => ({
        label: link.querySelector('.tutor-intro-link-label')?.textContent ?? '',
        href: link.getAttribute('href') ?? '',
        target: link.getAttribute('target') ?? '',
        rel: link.getAttribute('rel') ?? '',
      })),
      verified: section.querySelector('.tutor-intro-verified')?.textContent?.replace(/\s+/g, ' ') ?? '',
      versionSource: section.querySelector('[data-version-source]')?.getAttribute('data-version-source') ?? '',
      versionText: section.querySelector('[data-version-source]')?.textContent?.trim() ?? '',
      tag: section.querySelector('.tutor-intro-tag')?.textContent ?? '',
      brand: document.querySelector('.tutor-brand')?.textContent ?? '',
    };
  });
  check('辅导页有 DeepTutor 介绍区块，标题带品牌标识',
    intro.exists && intro.brand === 'DeepTutor' && intro.tag.includes('已接入'), JSON.stringify({ brand: intro.brand, tag: intro.tag }));
  check('介绍讲了「是什么」：外部项目、独立进程、围绕学习对象工作',
    intro.text.includes('DeepTutor') && intro.text.includes('独立进程') && intro.text.includes('数学对象'), intro.text.slice(0, 80));
  check('介绍讲了三条接入口径：同一版本体 / 同一规划器 / 反馈只写 E',
    intro.how.includes('同一版本体') && intro.how.includes('同一套规划器') && intro.how.includes('反馈只写 E'),
    JSON.stringify(intro.how));
  /*
   * 详细介绍与外部链接（用户要求「介绍的再细一点，把对应的 GitHub 链接贴上」）。
   * 链接不只要能点：href 必须精确，且外链必须带 target=_blank + rel 含 noreferrer。
   */
  const github = intro.links.find((link) => link.href === 'https://github.com/HKUDS/DeepTutor');
  check('贴上了 DeepTutor 的 GitHub 仓库链接（精确 href + 新窗口 + noreferrer）',
    Boolean(github) && github.label.includes('GitHub') && github.target === '_blank' && github.rel.includes('noreferrer'),
    JSON.stringify(intro.links));
  check('另外两条外链也在：官方文档与 arXiv 论文',
    intro.links.some((link) => link.href.includes('deeptutor.info'))
      && intro.links.some((link) => link.href === 'https://arxiv.org/abs/2604.26962'),
    JSON.stringify(intro.links.map((link) => link.href)));
  check('介绍细化到可核对的外部事实：HKUDS、Apache-2.0、agent-native、知识引擎',
    intro.text.includes('HKUDS') && intro.text.includes('Apache-2.0') && intro.text.includes('agent-native')
      && intro.text.includes('LlamaIndex') && intro.text.includes('Obsidian'),
    intro.text.slice(0, 120));
  /*
   * 版本号：**运行期读到的**优先（2026-10 改，TODO A4-26）。
   *
   * 第四十八轮写的是「本站核对到的版本」——一个手抄的值。现在服务端只读本机检出，
   * 页面上必须能分辨两种情形：读到了（给出真实版本 + 来源 + 读取时间）/ 没读到（明说手工核对可能滞后）。
   */
  /*
   * 两种情形都要如实：
   * - 读到了本机检出（`.bridge-research/` 只在作者机器上）→ 显示真实版本 + 来源 + 读取时间；
   * - 没读到（换台电脑克隆的常态）→ 明说「手工核对、可能滞后」，且**不得**伪造「读取于」。
   * 从前的断言只认第一种，于是任何没有该检出的环境都必然红。
   */
  const versionRendered = intro.versionSource === 'runtime'
    ? (/^v\d/.test(intro.versionText)
      && intro.verified.includes('deeptutor/__version__.py') && intro.verified.includes('读取于'))
    : (intro.versionSource === 'recorded'
      && /^v\d/.test(intro.versionText)
      && intro.verified.includes('手工核对') && !intro.verified.includes('读取于'));
  check('版本号如实标注来源（读到了就给来源与读取时间；没读到就明说手工核对可能滞后）',
    versionRendered,
    JSON.stringify({ source: intro.versionSource, version: intro.versionText, line: intro.verified.slice(0, 120) }));
  check('版本区块写清了许可与依据（不假装运行时探测）',
    intro.verified.includes('Apache-2.0'), intro.verified.slice(0, 140));

  check('介绍区分了两条接入路径：站内适配器与桥接服务',
    intro.paths.includes('站内适配器') && intro.paths.includes('桥接服务'), JSON.stringify(intro.paths));
  check('边界声明如实：未测量教学收益、断开不伪造回复',
    intro.boundary.includes('没有测量过') && intro.boundary.includes('不会伪造') && intro.boundary.includes('不代表你掌握了'),
    intro.boundary.slice(0, 90));

  // ---- 3) 引导式视角 ----
  const guide = await page.evaluate(() => {
    const nav = document.querySelector('.tutor-guide');
    const steps = [...nav.querySelectorAll('li')];
    const guiding = [...document.querySelectorAll('.card.is-guiding')];
    return {
      exists: Boolean(nav),
      step: nav?.getAttribute('data-guide-step') ?? null,
      count: steps.length,
      current: steps.filter((step) => step.classList.contains('is-current')).length,
      ariaCurrent: steps.filter((step) => step.getAttribute('aria-current') === 'step').length,
      currentText: steps.find((step) => step.classList.contains('is-current'))?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 30) ?? '',
      guidingCount: guiding.length,
      guidingHeading: guiding[0]?.querySelector('h2')?.textContent ?? '',
      guidingOpacity: guiding[0] ? Number(getComputedStyle(guiding[0]).opacity) : 0,
      guidingBorder: guiding[0] ? getComputedStyle(guiding[0]).borderColor : '',
      overlay: guiding[0] ? getComputedStyle(guiding[0], '::before').width : '',
      dismiss: Boolean(nav?.querySelector('.tutor-guide-dismiss')),
      statusHeading: document.querySelector('.tutor-status h2')?.textContent ?? '',
    };
  });
  check('辅导页有导览条：三步、恰好一个当前步、带 aria-current',
    guide.exists && guide.count === 3 && guide.current === 1 && guide.ariaCurrent === 1,
    JSON.stringify({ count: guide.count, current: guide.current, aria: guide.ariaCurrent }));
  check('第一步指向「看状态」，状态卡有对应标题',
    guide.step === '1' && guide.currentText.includes('看状态') && guide.statusHeading === '接入状态',
    JSON.stringify({ step: guide.step, current: guide.currentText, status: guide.statusHeading }));
  check('同一时刻只有一个区块被点亮（焦点不分散）',
    guide.guidingCount === 1 && guide.guidingHeading === '接入状态',
    JSON.stringify({ count: guide.guidingCount, heading: guide.guidingHeading }));
  check('被点亮的区块只加装饰、不改透明度（仍然可读可点）',
    guide.guidingOpacity >= 0.99 && guide.guidingBorder !== '' && guide.overlay !== 'auto',
    JSON.stringify({ opacity: guide.guidingOpacity, border: guide.guidingBorder, rail: guide.overlay }));

  // 跳过引导：立刻消失，并且刷新后仍然不出现（本机偏好，不写学习档案）
  await page.locator('.tutor-guide-dismiss').click();
  await page.waitForTimeout(250);
  check('可以跳过引导', (await page.locator('.tutor-guide').count()) === 0 && (await page.locator('.card.is-guiding').count()) === 0);
  const stored = await page.evaluate(() => localStorage.getItem('mcs-tutor-guide-v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  check('跳过之后刷新也不再出现（只写本机偏好，不写档案 E）',
    stored === 'off' && (await page.locator('.tutor-guide').count()) === 0,
    JSON.stringify({ stored }));

  // 「减少动态效果」：引导高亮不呼吸
  const reduced = await browser.newContext({ viewport: { width: 1440, height: 950 }, reducedMotion: 'reduce' });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(server.origin + '/tutor', { waitUntil: 'networkidle' });
  await reducedPage.waitForTimeout(700);
  const reducedState = await reducedPage.evaluate(() => {
    const card = document.querySelector('.card.is-guiding');
    const dot = document.querySelector('.nav-badge-dot');
    return {
      cardAnimation: card ? getComputedStyle(card).animationName : null,
      dotAnimation: dot ? getComputedStyle(dot).animationName : null,
      guiding: document.querySelectorAll('.card.is-guiding').length,
    };
  });
  check('「减少动态效果」下引导与徽标都不动（但高亮仍在）',
    reducedState.guiding === 1 && reducedState.cardAnimation === 'none' && reducedState.dotAnimation === 'none',
    JSON.stringify(reducedState));

  // 窄屏：导览条竖排、不横向溢出
  const narrow = await context.newPage();
  await narrow.setViewportSize({ width: 720, height: 900 });
  await narrow.goto(server.origin + '/tutor', { waitUntil: 'networkidle' });
  await narrow.waitForTimeout(700);
  const narrowState = await narrow.evaluate(() => {
    const nav = document.querySelector('.tutor-guide');
    return {
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      columns: nav ? getComputedStyle(nav.querySelector('ol')).gridTemplateColumns.split(' ').length : 0,
      badge: document.querySelector('.nav-badge')?.getBoundingClientRect().width ?? 0,
    };
  });
  check('窄屏导览条竖排且没有横向溢出',
    narrowState.overflow <= 2 && (narrowState.columns <= 1 || narrowState.badge === 0),
    JSON.stringify(narrowState));

  check('辅导页引导没有控制台错误', consoleErrors.length === 0, consoleErrors.join(' | '));
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n辅导页 DeepTutor 提示与引导验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n辅导页 DeepTutor 提示与引导验收通过。');
