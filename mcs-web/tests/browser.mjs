import { resolve } from 'node:path';
import { startTestServer, jsonCall, clickInAnimatedPage } from './helpers.mjs';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';
import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

const server = await startTestServer({ staticDir: resolve(MCS_WEB_ROOT, 'web', 'dist') });
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('response', response => { if (response.status() === 404) consoleErrors.push('HTTP 404: ' + response.url()); });

  // 首页只有六幕动画；学习入口、原型问题与档案信息都在紧接着它的「开始学习」页（/start）。
  await page.goto(server.origin, { waitUntil: 'networkidle' });
  check('首页标题', (await page.locator('h1').first().innerText()).includes('数学认知空间'));
  check('首页不再挂学习板块', (await page.locator('.case-card, .continue-card, #cases, #angles').count()) === 0);

  await page.goto(server.origin + '/start', { waitUntil: 'networkidle' });
  /*
   * 卡片由本体派生（`describeCase` 现场统计每个案例的节点数与学科分布），
   * `networkidle` 之后还要等 React 把这一批算完——2026-10-13 本体涨到 340 个节点（2026-10-14 已到 405）后，
   * 这一拍不再稳（同一次运行里红过一次、重跑即绿）。因此先等卡片出现再数，
   * 断言本身不变，仍然是「恰好 6 张原型问题卡片」。
   */
  await page.waitForSelector('.case-card', { timeout: 15000 });
  check('开始学习页原型问题卡片齐全', (await page.locator('.case-card').count()) === 6);
  check('侧栏不再用本体哈希占位', (await page.locator('.sidebar-note').count()) === 0);
  // 本体哈希与运行时版本搬到了「我的学习 · 高级设置」，仍然可查。
  await page.goto(server.origin + '/profile?tab=advanced', { waitUntil: 'networkidle' });
  check('设置页显示本体哈希', (await page.locator('.facts code').first().innerText()).length >= 16);
  await page.goto(server.origin, { waitUntil: 'networkidle' });

  // ---- 原型问题缩略图（在开始学习页） ----
  await page.goto(server.origin + '/start', { waitUntil: 'networkidle' });
  await page.waitForSelector('.case-thumbnail svg[role="img"][aria-label]');
  const thumbnailCases = await page.evaluate(() =>
    [...document.querySelectorAll('.case-thumbnail')].map((item) => item.getAttribute('data-case')));
  check('六个原型问题都有专属缩略图', thumbnailCases.length === 6 && new Set(thumbnailCases).size === 6, JSON.stringify(thumbnailCases));
  check('缩略图带可访问说明', await page.locator('.case-thumbnail svg[role="img"][aria-label]').count() === 6);

  await page.goto(server.origin, { waitUntil: 'networkidle' });

  // ---- 可收缩侧栏 ----

  const sidebarBefore = await page.locator('.sidebar').evaluate((element) => Math.round(element.getBoundingClientRect().width));
  await page.locator('.sidebar-toggle').click();
  await page.waitForTimeout(280);
  const sidebarCompact = await page.evaluate(() => ({
    width: Math.round(document.querySelector('.sidebar')?.getBoundingClientRect().width ?? 0),
    collapsed: document.querySelector('.app-shell')?.classList.contains('sidebar-collapsed') ?? false,
    expanded: document.querySelector('.sidebar-toggle')?.getAttribute('aria-expanded'),
    saved: localStorage.getItem('mcs-sidebar-collapsed-v1'),
    titledLinks: [...document.querySelectorAll('.sidebar .nav-item')].filter((item) => item.getAttribute('title')).length,
  }));
  check('侧栏可收成图标栏', sidebarCompact.collapsed && sidebarCompact.width < sidebarBefore * 0.5, JSON.stringify({ sidebarBefore, ...sidebarCompact }));
  check('收缩状态可访问且会记住', sidebarCompact.expanded === 'false' && sidebarCompact.saved === 'true' && sidebarCompact.titledLinks >= 9, JSON.stringify(sidebarCompact));
  await page.locator('.sidebar-toggle').click();
  await page.waitForTimeout(280);
  check('侧栏可以恢复展开', !(await page.locator('.app-shell').evaluate((element) => element.classList.contains('sidebar-collapsed'))));

  /*
   * 侧栏品牌位必须**读起来像按钮**，不是一段站名文本。
   *
   * 用户的原话：「让人一眼看见就知道『数学认知空间』是个可以点击的按钮，不是文本」。
   * 所以这里不只断言「它是个链接」，而是逐条量按钮该有的东西：面板（边框 + 底色 + 圆角）、
   * 显式的「首页」胶囊、悬停有可量的变化、键盘聚焦有描边、点了真的回首页。
   */
  const brandAffordance = await page.evaluate(() => {
    const brand = document.querySelector('.brand');
    const style = getComputedStyle(brand);
    const cta = document.querySelector('.brand-cta');
    const label = document.querySelector('.brand-cta-label');
    const alpha = (value) => {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) return value === 'transparent' ? 0 : 1;
      const parts = match[1].split(',').map((item) => Number.parseFloat(item));
      return parts.length > 3 ? parts[3] : 1;
    };
    return {
      tag: brand.tagName,
      href: brand.getAttribute('href'),
      ariaLabel: brand.getAttribute('aria-label'),
      cursor: style.cursor,
      radius: Number.parseFloat(style.borderTopLeftRadius),
      borderWidth: Number.parseFloat(style.borderTopWidth),
      backgroundAlpha: alpha(style.backgroundColor),
      ctaText: label?.textContent?.trim() ?? '',
      ctaWidth: cta ? Math.round(cta.getBoundingClientRect().width) : 0,
      ctaBackground: cta ? getComputedStyle(cta).backgroundImage : '',
      hasHomeIcon: Boolean(document.querySelector('.brand-cta-icon path')),
    };
  });
  check('品牌位是回到首页的链接（href + 可访问名）',
    brandAffordance.tag === 'A' && brandAffordance.href === '/' && brandAffordance.ariaLabel.includes('首页'),
    JSON.stringify(brandAffordance));
  check('品牌位有按钮面板：圆角 + 边框 + 不透明底色 + 手型光标',
    brandAffordance.radius >= 10 && brandAffordance.borderWidth >= 1
      && brandAffordance.backgroundAlpha > 0.5 && brandAffordance.cursor === 'pointer',
    JSON.stringify(brandAffordance));
  check('品牌位带显式的「首页」胶囊（实心底 + 房子图标）',
    brandAffordance.ctaText === '首页' && brandAffordance.ctaWidth > 20
      && brandAffordance.ctaBackground.includes('gradient') && brandAffordance.hasHomeIcon,
    JSON.stringify(brandAffordance));

  // 先把鼠标挪开：它初始停在 (0,0)，正好压在侧栏上，会把「静止态」量成悬停态。
  await page.mouse.move(1100, 700);
  await page.waitForTimeout(220);
  const restingStyle = await page.locator('.brand').evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, border: style.borderTopColor, transform: style.transform };
  });
  await page.locator('.brand').hover();
  await page.waitForTimeout(220);
  const hoverStyle = await page.locator('.brand').evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, border: style.borderTopColor, transform: style.transform };
  });
  check('悬停有可量的变化（底色或边框或抬升）',
    hoverStyle.background !== restingStyle.background || hoverStyle.border !== restingStyle.border || hoverStyle.transform !== restingStyle.transform,
    JSON.stringify({ resting: restingStyle, hover: hoverStyle }));

  /*
   * 键盘用户：**重新加载一次页面**，再按一次 Tab——品牌位应当是刚打开页面时的第一个 Tab 停留点，
   * 且此时有可见描边。
   *
   * 三个坑都踩过（每一个都会把真事测成假失败）：
   * 1. 不能 `element.focus()`——程序化聚焦不满足 `:focus-visible`，量出来永远是 none；
   * 2. 不能从当前状态直接按 Tab——Chrome 会记住上一次的「顺序聚焦起点」，Tab 从中后段继续；
   * 3. `blur()` 只把 activeElement 变成 body，**不会**重置那个起点（实测仍落到 nav-item）。
   */
  await page.goto(server.origin + '/nodes', { waitUntil: 'networkidle' });
  await page.mouse.move(1100, 700);
  await page.keyboard.press('Tab');
  const focusRing = await page.locator('.brand').evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      focused: document.activeElement === element,
      active: (document.activeElement?.className || document.activeElement?.tagName || '?').toString().slice(0, 60),
      width: Number.parseFloat(style.outlineWidth),
      style: style.outlineStyle,
    };
  });
  check('刚打开页面时 Tab 一下就到品牌位，且有可见描边',
    focusRing.focused && focusRing.width >= 2 && focusRing.style !== 'none',
    JSON.stringify(focusRing));

  // 点它必须真的回首页动画（而不是只换个高亮）。
  await page.goto(server.origin + '/nodes', { waitUntil: 'networkidle' });
  await page.locator('.brand').click();
  await page.waitForTimeout(600);
  check('点品牌位回到首页六幕叙事',
    new URL(page.url()).pathname === '/' && (await page.locator('.home-story').count()) === 1,
    page.url());

  // ---- 站点标志与主题 ----
  // 大 logo 来自 design/mcs-logo-v6（首屏），小 logo 来自 design/mcs-logo-v13（侧栏品牌位）；
  // 这里锁住接入点，避免以后换主题时把标志或 favicon 悄悄弄丢。
  const branding = await page.evaluate(() => {
    const brand = document.querySelector('.brand-wordmark');
    const hero = document.querySelector('.hero-mark img');
    const parse = (value) => (value.match(/\d+/g) ?? []).map(Number);
    return {
      brandSrc: brand?.getAttribute('src') ?? null,
      brandLoaded: Boolean(brand && brand.naturalWidth > 0),
      heroSrc: hero?.getAttribute('src') ?? null,
      heroLoaded: Boolean(hero && hero.naturalWidth > 0),
      accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
      paper: parse(getComputedStyle(document.body).backgroundColor),
      /*
       * 辅助文字的可读性：`--ink-faint` 要同时落在纸面与白色卡片上。
       * 早先的 #7d75a0 对纸面只有 3.79:1，低于 WCAG AA 对普通文字的 4.5:1——
       * 这是算得出来的，因此写成断言，避免以后调色时又悄悄跌破。
       */
      faintContrast: (() => {
        const hexToRgb = (hex) => {
          const value = hex.trim().replace('#', '');
          const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
          return [0, 2, 4].map((index) => parseInt(full.slice(index, index + 2), 16));
        };
        const rgbOf = (value) => (value.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map(Number);
        const luminance = (channels) => {
          const [r, g, b] = channels.map((v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const ratio = (a, b) => {
          const la = luminance(a); const lb = luminance(b);
          return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
        };
        const faint = hexToRgb(getComputedStyle(document.documentElement).getPropertyValue('--ink-faint'));
        return {
          onPaper: Number(ratio(faint, rgbOf(getComputedStyle(document.body).backgroundColor)).toFixed(2)),
          onWhite: Number(ratio(faint, [255, 255, 255]).toFixed(2)),
        };
      })(),
      primaryGradient: getComputedStyle(document.querySelector('.button.primary')).backgroundImage,
      iconLinks: [...document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]')].map((link) => link.getAttribute('href')),
    };
  });
  check('侧栏使用小 logo（一笔彩虹字标）', branding.brandSrc === '/wordmark-256.png' && branding.brandLoaded, String(branding.brandSrc));
  check('首屏使用大 logo（紫色徽记）', branding.heroSrc === '/logo.png' && branding.heroLoaded, String(branding.heroSrc));
  check('主题主色令牌为品牌紫', branding.accent === '#6d28d9', branding.accent);
  // 纸面只断言「冷调紫罗兰」这一族，不锁死具体色值：调色不该让测试红。
  check('纸面底色为冷调紫罗兰', branding.paper[2] >= branding.paper[0] && branding.paper[0] > branding.paper[1], JSON.stringify(branding.paper));
  check('主按钮使用品牌渐变', branding.primaryGradient.includes('gradient'), branding.primaryGradient.slice(0, 60));
  check('辅助文字对比度达标（≥4.5:1）', branding.faintContrast.onPaper >= 4.5 && branding.faintContrast.onWhite >= 4.5, JSON.stringify(branding.faintContrast));
  const assetStatus = await page.evaluate(async (hrefs) => {
    const out = [];
    for (const href of hrefs) {
      const response = await fetch(href);
      out.push({ href, status: response.status, type: response.headers.get('content-type') ?? '' });
    }
    return out;
  }, branding.iconLinks);
  check('图标与 manifest 可访问', assetStatus.length >= 6 && assetStatus.every((item) => item.status === 200), JSON.stringify(assetStatus.filter((item) => item.status !== 200)));
  // MIME 写错时浏览器会拒绝 manifest；旧版服务端就把它当 octet-stream 发。
  check('图标与 manifest 的 MIME 正确', assetStatus.every((item) => !item.type.includes('octet-stream')), JSON.stringify(assetStatus.filter((item) => item.type.includes('octet-stream'))));

  /*
   * 末幕收束处的人像序列。
   *
   * 四件事一起守：素材的 MIME（`.webp` 曾经不在静态服务的 MIME 表里，会以
   * application/octet-stream 发出，浏览器只能靠魔数嗅探——理由与上面的图标完全一致）、
   * **末幕就位时它不可见**（界面不留提示）、**只有被触发才出现**、
   * 以及**它不许压到正文列**（设计硬要求，靠 CSS 把右缘钉在正文列左侧实现）。
   */
  const atlasAsset = await page.evaluate(async () => {
    const response = await fetch('/portrait/atlas.webp');
    const bytes = (await response.arrayBuffer()).byteLength;
    return { status: response.status, type: response.headers.get('content-type') ?? '', bytes };
  });
  check('人像雪碧图可访问且 MIME 为 image/webp',
    atlasAsset.status === 200 && atlasAsset.type.startsWith('image/webp') && atlasAsset.bytes > 100000,
    JSON.stringify(atlasAsset));

  const readPortrait = () => page.evaluate(() => {
    const el = document.querySelector('.story-portrait');
    const copy = document.querySelector('.home-story-section[data-act="infrastructure"] .home-story-act-copy');
    const box = el?.getBoundingClientRect();
    const copyBox = copy?.getBoundingClientRect();
    const overlap = box && copyBox
      ? Math.max(0, Math.min(box.right, copyBox.right) - Math.max(box.left, copyBox.left))
        * Math.max(0, Math.min(box.bottom, copyBox.bottom) - Math.max(box.top, copyBox.top))
      : -1;
    return {
      count: document.querySelectorAll('.story-portrait').length,
      frame: Number(el?.getAttribute('data-frame') ?? -1),
      visible: el?.getAttribute('data-visible') ?? null,
      opacity: el ? Number(getComputedStyle(el).opacity) : 0,
      overlap: Math.round(overlap),
      usesAtlas: Boolean(el?.querySelector('image')),
      ribbonCount: el?.querySelectorAll('.story-portrait-ribbon').length ?? 0,
      ribbonProgress: el?.getAttribute('data-ribbon-progress') ?? null,
      atlasClipped: el?.querySelector('image')?.getAttribute('clip-path')?.startsWith('url(') ?? false,
      width: box ? Math.round(box.width) : 0,
      atBottom: window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4,
    };
  });

  /*
   * 站到末幕（第六幕）上。两个坑都在这里：
   * 1. 点导航之后页面是**平滑滚动**过去的（约 1.2 s），中途 `active` 会依次经过各幕；
   * 2. 所以必须先等滚动**停下来**（连续两次采样 scrollY 不变），再断言。
   */
  await page.locator('.home-story-progress button').nth(5).click();
  let previousY = -1;
  for (let sample = 0; sample < 60; sample += 1) {
    const y = await page.evaluate(() => window.scrollY);
    if (y === previousY) break;
    previousY = y;
    await page.waitForTimeout(100);
  }
  const portraitIdle = await readPortrait();
  // 平滑滚动停下来之后，还要确认**真的落到末幕**：否则 active 还停在上一幕，
  // 人像根本没挂上（`count: 0`），这条断言会红在一个与它无关的原因上。
  await page
    .waitForFunction(() => document.querySelector('.home-story')?.getAttribute('data-active-act') === '5',
      { timeout: 5000 })
    .catch(() => {});
  const portraitArmed = await readPortrait();
  check('末幕就位时人像不可见（界面不留提示）',
    portraitArmed.count === 1 && portraitArmed.visible === 'false' && portraitArmed.opacity === 0,
    JSON.stringify({ portraitIdle, portraitArmed }));

  /*
   * 末幕人像序列的入口：署名里的作者名按钮
   * （2026-10-04 第四次改口径，见 HomeNarrative.tsx 的 firePortrait）。
   *
   * 触发器从"滚动"彻底换成"点击"，所以这里不再滚轮、也不再判"滑够多久"。
   * 两件事要一起守：**它必须是真的按钮**（键盘能聚焦、读屏念得出），
   * 以及**外观与原来的 `<strong>` 逐项一致**——后者用"文字盒是否完全相同"来判，
   * 比比对一串 computed style 更硬：把真 `<strong>` 换进去量一次、再换回来。
   */
  const authorEntry = await page.evaluate(() => {
    const btn = document.querySelector('.byline-author');
    if (!btn) return { found: false };
    const textRect = (el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const r = range.getBoundingClientRect();
      return { l: +r.left.toFixed(2), t: +r.top.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) };
    };
    const cs = getComputedStyle(btn);
    const before = textRect(btn);
    const bylineBefore = btn.closest('.byline').getBoundingClientRect().height;
    const probe = document.createElement('strong');
    probe.textContent = btn.textContent;
    btn.replaceWith(probe);
    const after = textRect(probe);
    const bylineWithStrong = probe.closest('.byline').getBoundingClientRect().height;
    probe.replaceWith(btn);
    const clean = (r) => JSON.stringify(r);
    return {
      found: true,
      tag: btn.tagName,
      text: btn.textContent,
      background: cs.backgroundColor,
      borderWidth: cs.borderTopWidth,
      minHeight: cs.minHeight,
      cursor: cs.cursor,
      sameText: clean(before) === clean(after),
      textRect: before,
      strongRect: after,
      sameLineHeight: Math.abs(bylineBefore - bylineWithStrong) < 0.5,
      bylineHeight: bylineBefore,
    };
  });
  check('末幕署名的作者名是真的按钮', authorEntry.found && authorEntry.tag === 'BUTTON', JSON.stringify(authorEntry));
  check('按钮外观与 `<strong>` 逐项一致（文字盒相同、没有按钮样式、行高没被撑开）',
    authorEntry.sameText && authorEntry.sameLineHeight
    && authorEntry.background === 'rgba(0, 0, 0, 0)' && authorEntry.borderWidth === '0px'
    && authorEntry.minHeight === '0px' && authorEntry.cursor !== 'pointer',
    JSON.stringify(authorEntry));

  // 点它才出现。
  await page.click('.byline-author');
  let portraitRevealed = false;
  const revealDeadline = Date.now() + 8000;
  while (!portraitRevealed && Date.now() < revealDeadline) {
    await page.waitForTimeout(120);
    portraitRevealed = await page.evaluate(() => {
      const el = document.querySelector('.story-portrait');
      return el?.getAttribute('data-visible') === 'true' && Number(getComputedStyle(el).opacity) > 0.9;
    });
  }
  const portraitAfter = await readPortrait();
  check('点作者名触发末幕人像序列', portraitRevealed && portraitAfter.visible === 'true', JSON.stringify({ portraitRevealed, portraitAfter }));

  // 出现之后自己往下播（不是靠继续滚动推进）：再等一会儿，帧号应该更大。
  await page.waitForTimeout(420);
  const portraitLater = await readPortrait();
  check('人像出现后自己往下播', portraitLater.frame > portraitAfter.frame, JSON.stringify(portraitLater));
  /*
   * 丝绸窗口的采样必须**在同一次 `waitForFunction` 的轮询里完成**。
   *
   * 原来的写法是「先等窗口出现，命中之后再 `readPortrait()` 读一遍」，而 wink 的那段窗口
   * 只有约 100–300ms；机器繁忙时第二次读取到达时窗口已经关了，于是断言看到
   * `ribbonCount: 0 / ribbonProgress: "no"` 而报红——**是采样竞态，不是功能回归**
   * （复现证据：详情里 `frame: 127` 已是序列末尾，说明第一次轮询确实命中过；
   * 把采样放进页面内的 rAF 循环后，同一份构建稳定抓到 `ribbons=6, progress=0.09, frame=75`）。
   *
   * 现在把「命中」与「读出当时的状态」合成一件事：轮询函数在命中那一刻把当时的状态
   * 写进 `window.__ribbonMoment`，断言读那一份。这与「验收依赖一个会自己关掉的窗口」
   * 是同一类问题，修法就是**不要在窗外再读一次**。
   */
  const ribbonMoment = await page.waitForFunction(() => {
    const el = document.querySelector('.story-portrait');
    const progress = el?.getAttribute('data-ribbon-progress');
    const hit = progress !== null && progress !== 'no'
      && Number(progress) > 0.08
      && el?.querySelectorAll('.story-portrait-ribbon').length === 6;
    if (!hit) return false;
    window.__ribbonMoment = {
      ribbonCount: el.querySelectorAll('.story-portrait-ribbon').length,
      ribbonProgress: progress,
      frame: Number(el.getAttribute('data-frame') ?? -1),
      visible: el.getAttribute('data-visible') ?? null,
    };
    return true;
  }, { timeout: 2500 }).then(() => page.evaluate(() => window.__ribbonMoment ?? null)).catch(() => null);
  check('wink 时六缕主题色丝绸与人像共用帧时钟',
    ribbonMoment?.ribbonCount === 6 && ribbonMoment.ribbonProgress !== 'no',
    JSON.stringify(ribbonMoment));

  /*
   * **播完立刻收，不停留**（2026-10-04）。
   *
   * 原来在最后一帧之后还有一个 2.6 秒的「停一拍」再退场，所以这条按"最后一帧 → 不可见"
   * 的间隔来判：现在应当只剩 CSS 淡出的那一下（约 200ms）与采样粒度。阈值取 700ms——
   * 它同时排除"没有停留"（< 700）与"停留一拍"（≈2600）两种实现，改回去就会红。
   */
  let lastFrameAt = null;
  let hiddenAt = null;
  const hideWatch = Date.now();
  while (Date.now() - hideWatch < 5000) {
    const now = await page.evaluate(() => {
      const el = document.querySelector('.story-portrait');
      return { frame: el?.getAttribute('data-frame') ?? null, visible: el?.getAttribute('data-visible') ?? null };
    });
    const elapsed = Date.now() - hideWatch;
    if (now.frame === '127' && lastFrameAt === null) lastFrameAt = elapsed;
    if (lastFrameAt !== null && now.visible === 'false') { hiddenAt = elapsed; break; }
    await page.waitForTimeout(60);
  }
  check('播完立刻收（不停留）',
    lastFrameAt !== null && hiddenAt !== null && hiddenAt - lastFrameAt < 700,
    JSON.stringify({ lastFrameAt, hiddenAt, gap: hiddenAt === null ? null : hiddenAt - lastFrameAt }));
  check('人像与正文列零相交（不挡文本）',
    portraitAfter.overlap === 0 && portraitAfter.width > 60,
    JSON.stringify(portraitAfter));
  check('人像画的是雪碧图，且越界光效不会露出相邻帧',
    portraitAfter.usesAtlas && portraitAfter.atlasClipped,
    JSON.stringify(portraitAfter));

  /*
   * 窄屏（手机）也要能看到末幕人像（2026-10-05）。
   *
   * 窄屏曾缺少末幕人像。原因是 portraitArmed 的开启条件排除了 flowMode。
   * 窄屏整块视觉舞台不渲染，于是**署名里的作者名是个点了没反应的按钮**——
   * 入口在、序列永远不挂载（390×844 / 844×390 / 834×1112 三种视口实测都是 count: 0）。
   *
   * 现在窄屏把人像挂在署名正下方（`.home-story-portrait-slot`，高 0、不推版面）。
   * 这一组守四条：首屏不取那 1 MB 的雪碧图、走到末幕才挂且挂着时不可见、
   * 点署名出得来并自己往下播、**与正文零相交**（与桌面那条同一个不变量）。
   */
  const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const phonePage = await phoneContext.newPage();
  phonePage.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  phonePage.on('pageerror', (error) => consoleErrors.push(error.message));
  await phonePage.goto(server.origin, { waitUntil: 'networkidle' });

  const phoneIntro = await phonePage.evaluate(() => ({
    flow: document.querySelector('.home-story')?.classList.contains('is-flow') ?? false,
    atlasFetched: performance.getEntriesByType('resource').some((entry) => entry.name.includes('/portrait/atlas.webp')),
    portraits: document.querySelectorAll('.story-portrait').length,
    authorTag: document.querySelector('.byline-author')?.tagName ?? null,
  }));
  check('手机端首屏不取人像雪碧图，也没有挂着的人像',
    phoneIntro.flow && !phoneIntro.atlasFetched && phoneIntro.portraits === 0,
    JSON.stringify(phoneIntro));

  await phonePage.evaluate(() => document.querySelector('.home-story-act.is-final')?.scrollIntoView({ block: 'center' }));
  const phoneArmed = await phonePage.waitForFunction(() => {
    const element = document.querySelector('.story-portrait');
    return Boolean(element) && element.getAttribute('data-visible') === 'false';
  }, { timeout: 8000 }).then(() => true).catch(() => false);
  const phoneIdle = await phonePage.evaluate(() => ({
    frames: document.querySelectorAll('.story-portrait').length,
    visible: document.querySelector('.story-portrait')?.getAttribute('data-visible') ?? null,
    opacity: document.querySelector('.story-portrait') ? Number(getComputedStyle(document.querySelector('.story-portrait')).opacity) : null,
  }));
  check('手机端走到末幕才挂上人像，挂着的时候不可见（界面不留提示）',
    phoneArmed && phoneIdle.frames === 1 && phoneIdle.visible === 'false' && phoneIdle.opacity === 0,
    JSON.stringify({ phoneArmed, ...phoneIdle }));

  await phonePage.locator('.byline-author').first().click();
  const phoneRevealed = await phonePage.waitForFunction(() => {
    const element = document.querySelector('.story-portrait');
    return element?.getAttribute('data-visible') === 'true' && Number(getComputedStyle(element).opacity) > 0.9;
  }, { timeout: 8000 }).then(() => true).catch(() => false);
  const phoneFirst = await phonePage.evaluate(() => Number(document.querySelector('.story-portrait')?.getAttribute('data-frame') ?? -1));
  await phonePage.waitForTimeout(420);
  const phoneLater = await phonePage.evaluate(() => Number(document.querySelector('.story-portrait')?.getAttribute('data-frame') ?? -1));
  check('手机端点署名里的作者名触发人像，且出现后自己往下播',
    phoneRevealed && phoneLater > phoneFirst, JSON.stringify({ phoneRevealed, phoneFirst, phoneLater }));

  /*
   * 「不挡文本」在手机上用更硬的方式量：不是量整块正文的盒子，而是把末幕**每一个**
   * 文字节点（正文段落、条目、入口按钮、署名那一行）逐个与它求相交面积——
   * 人像压在插图上是设计（插图是 aria-hidden 的装饰），压在字上就是缺陷。
   */
  const phoneOverlap = await phonePage.evaluate(() => {
    const portrait = document.querySelector('.story-portrait');
    if (!portrait) return { found: false };
    const box = portrait.getBoundingClientRect();
    const overlapArea = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
      * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const texts = [...document.querySelectorAll(
      '.home-story-act.is-final .home-story-body p, .home-story-act.is-final .byline, .home-story-act.is-final .home-story-kicker, .home-story-act.is-final h2, .home-story-act.is-final .button',
    )];
    let overlap = 0;
    texts.forEach((node) => { overlap += overlapArea(box, node.getBoundingClientRect()); });
    return {
      found: true,
      texts: texts.length,
      overlap: Math.round(overlap),
      width: Math.round(box.width),
      height: Math.round(box.height),
      // 挂点跟着署名走：人像顶端应当在视口内（否则「点了没反应」会伪装成「位置错了」）。
      topInViewport: box.top >= 0 && box.top < window.innerHeight,
    };
  });
  check('手机端人像与末幕的每一处文字零相交，且落在视口内',
    phoneOverlap.found && phoneOverlap.texts >= 6 && phoneOverlap.overlap === 0
    && phoneOverlap.width > 60 && phoneOverlap.topInViewport,
    JSON.stringify(phoneOverlap));

  /*
   * 触屏上的三处滚动降级（2026-10-05）。
   *
   * 用户报的是「小米平板 + Edge，滚动时整页发白」。那是 Android Chromium 滚动时
   * 来不及重新栅格化、露出还没画好的底（checkerboard），三处代价叠在一起：
   * 底图 `background-attachment: fixed`（每滚一帧重栅格化整张底图）、吸顶栏
   * `backdrop-filter`（逐帧读回并模糊身后内容）、以及自然滚动下白占的六个大合成层。
   * **三条都只在触屏上生效**，所以桌面端要一起量，防止把桌面也一起降级了。
   */
  const scrollCost = {
    phone: await phonePage.evaluate(() => ({
      bodyAttachment: getComputedStyle(document.body).backgroundAttachment,
      topbarBlur: getComputedStyle(document.querySelector('.topbar')).backdropFilter,
      actWillChange: getComputedStyle(document.querySelector('.home-story-act')).willChange,
    })),
    desktop: await page.evaluate(() => ({
      bodyAttachment: getComputedStyle(document.body).backgroundAttachment,
      topbarBlur: getComputedStyle(document.querySelector('.topbar')).backdropFilter,
      actWillChange: getComputedStyle(document.querySelector('.home-story-act')).willChange,
    })),
  };
  /*
   * 计算值里的 `background-attachment` 是**按图层逐个**给的（这里两层底图，
   * 于是是 `"scroll, scroll"`），所以按前缀判而不是等值判。
   */
  check('触屏撤掉三处滚动重绘开销（固定底图 / 吸顶模糊 / 白占的合成层），桌面端保持原样',
    scrollCost.phone.bodyAttachment.startsWith('scroll') && scrollCost.phone.topbarBlur === 'none'
    && scrollCost.phone.actWillChange === 'auto'
    && scrollCost.desktop.bodyAttachment.startsWith('fixed') && scrollCost.desktop.topbarBlur !== 'none'
    && scrollCost.desktop.actWillChange.includes('opacity'),
    JSON.stringify(scrollCost));

  await phoneContext.close();

  // 「减少动态效果」下这条路本来就不通，那就**不留一个按下去没有反应的按钮**。
  const phoneReduceContext = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce',
  });
  const phoneReducePage = await phoneReduceContext.newPage();
  await phoneReducePage.goto(server.origin, { waitUntil: 'networkidle' });
  await phoneReducePage.evaluate(() => document.querySelector('.home-story-act.is-final')?.scrollIntoView({ block: 'center' }));
  await phoneReducePage.waitForTimeout(400);
  const phoneReduce = await phoneReducePage.evaluate(() => ({
    flow: document.querySelector('.home-story')?.classList.contains('is-flow') ?? false,
    authorButtons: document.querySelectorAll('.byline-author').length,
    portraits: document.querySelectorAll('.story-portrait').length,
    byline: document.querySelector('.home-story-act.is-final .byline')?.innerText ?? '',
  }));
  check('减少动态效果时不留死按钮：署名里的作者名退回普通文字，人像也不挂',
    phoneReduce.flow && phoneReduce.authorButtons === 0 && phoneReduce.portraits === 0
    && phoneReduce.byline.includes('沛恒'),
    JSON.stringify(phoneReduce));
  await phoneReduceContext.close();


  // ---- 署名 ----
  // 作者与邮箱在首屏、侧栏与（非首页的）页脚出现，数据同源于 web/src/site.ts。
  const EMAIL = 'peihengmath@gmail.com';
  const credit = await page.evaluate(() => ({
    hero: document.querySelector('.byline')?.innerText ?? '',
    sidebar: document.querySelector('.sidebar-author')?.innerText ?? '',
    footer: document.querySelector('.site-footer')?.innerText ?? '',
    metaAuthor: document.querySelector('meta[name="author"]')?.getAttribute('content') ?? '',
    mailto: [...document.querySelectorAll('a[href^="mailto:"]')].map((anchor) => anchor.getAttribute('href')),
  }));
  /*
   * 首页**故意没有**全站页脚：末幕的幕内署名已经写了同一份「作者 · 联系邮箱」，
   * 底部再来一条整宽的同款署名是重复的（用户按截图指出要删掉，且只删首页）。
   * 所以这里分两问：首页必须没有，别的页面必须有——只删一边不算数。
   */
  check('首页没有全站页脚（署名在末幕里，不重复一遍）', credit.footer === '', JSON.stringify(credit.footer));
  /*
   * 首页底部不留空白：末幕底部那行滚轮提示就是页面最后一行。
   * 通用规则给正文区留了 `4rem` 下内边距，首页会因此在那一行之下再撑出 64px——
   * 用户按截图指出「蓝色线就是最底部」，所以要核对内容底边与文档底边对齐。
   */
  const homeBottom = await page.evaluate(() => {
    const story = document.querySelector('.home-story');
    return {
      docH: document.documentElement.scrollHeight,
      contentBottom: Math.round((story?.getBoundingClientRect().bottom ?? 0) + window.scrollY),
      workspacePadBottom: getComputedStyle(document.querySelector('main.workspace')).paddingBottom,
    };
  });
  check('首页底部不留空白（内容底边就是文档底边）',
    Math.abs(homeBottom.docH - homeBottom.contentBottom) <= 1 && homeBottom.workspacePadBottom === '0px',
    JSON.stringify(homeBottom));
  check('首屏署名含作者与邮箱', credit.hero.includes('沛恒') && credit.hero.includes(EMAIL), credit.hero);
  check('侧栏署名含作者与邮箱', credit.sidebar.includes('沛恒') && credit.sidebar.includes(EMAIL), credit.sidebar);
  // 首页可点的邮箱有两处：侧栏署名、末幕幕内署名（页脚那条已按用户要求去掉）；
  // 别的页面上页脚那条还在，下一段会在 /start 上核对。
  check('首页可点的邮箱链接仍在（侧栏 + 末幕署名）',
    credit.mailto.filter((href) => href === 'mailto:' + EMAIL).length >= 2, credit.mailto.join(' '));
  check('文档元数据声明作者', credit.metaAuthor === '沛恒', credit.metaAuthor);

  await page.goto(server.origin + '/start', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const otherCredit = await page.evaluate(() => ({
    footer: document.querySelector('.site-footer')?.innerText ?? '',
    mailto: [...document.querySelectorAll('a[href^="mailto:"]')].map((anchor) => anchor.getAttribute('href')),
  }));
  check('别的页面仍有全站页脚', otherCredit.footer.includes('沛恒') && otherCredit.footer.includes(EMAIL), JSON.stringify(otherCredit.footer));
  check('别的页面的页脚邮箱仍可点',
    otherCredit.mailto.filter((href) => href === 'mailto:' + EMAIL).length >= 2, otherCredit.mailto.join(' '));
  await page.goto(server.origin + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  /*
   * 首页六幕叙事的末幕入口。
   *
   * 第一屏的「直接进入学习」与滚动行为由 tests/home-narrative.mjs 专门核对；
   * 这里保留原有 DOM 入口断言，避免末幕按钮在改版中被误删。
   */
  const heroButtons = await page.evaluate(() =>
    [...document.querySelectorAll('.hero-actions a')].map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href') })));
  check('末幕主入口进入开始学习页', heroButtons[0]?.text === '开始学习' && heroButtons[0]?.href === '/start', JSON.stringify(heroButtons));
  check('末幕入口包含学习路线', heroButtons[1]?.text === '打开学习路线' && heroButtons[1]?.href === '/plan', JSON.stringify(heroButtons));
  check('末幕入口包含学习方法论', heroButtons.some((b) => b.text === '了解学习方法论' && b.href === '/method'), JSON.stringify(heroButtons));
  check('网站介绍仍在末幕可及', heroButtons.some((b) => b.text === '这个网站是什么' && b.href === '/intro'), JSON.stringify(heroButtons));
  await page.goto(server.origin + '/start', { waitUntil: 'networkidle' });
  check('原型问题锚点在开始学习页落地', (await page.locator('#cases').count()) === 1);
  await page.goto(server.origin, { waitUntil: 'networkidle' });

  await page.goto(server.origin + '/intro', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  check('介绍页可访问并给出总题', (await page.locator('h1').first().textContent())?.includes('数学认知空间 MCS'));
  // 规模数字必须是活数据：与本体 counts 一致，不是文案里写死的。
  const healthCounts = await page.evaluate(async () => (await (await fetch('/api/v2/health')).json()).data.ontology.counts);
  const introScale = await page.evaluate(() =>
    Object.fromEntries([...document.querySelectorAll('.intro-scale-grid div')].map((d) => [d.querySelector('dt').textContent, d.querySelector('dd').textContent])));
  check('介绍页规模与本体一致', introScale['登记节点'] === String(healthCounts.nodes), JSON.stringify(introScale));
  check('介绍页写明不声称教学收益', (await page.locator('.intro-page').textContent()).includes('没有做过对照实验'));
  check('介绍页给出论文主结果', (await page.locator('.intro-page').textContent()).includes('thm:preservation'));
  /*
   * 站内锚点必须都指向真实存在的元素。
   *
   * 写这一页时踩过一次：底部的阅读顺序链接原本指向 `#intro-entries`，而那个 id 从没被
   * 渲染出来（「从哪进」一节是手写的 section，没有 id），点上去什么都不发生。
   * 锚点是静默失败的东西，因此需要一条断言守着。
   */
  const brokenAnchors = await page.evaluate(() =>
    [...document.querySelectorAll('.intro-page a[href^="#"]')]
      .map((a) => a.getAttribute('href').slice(1))
      .filter((id) => !document.getElementById(id)));
  check('介绍页的站内锚点都能落地', brokenAnchors.length === 0, JSON.stringify(brokenAnchors));

  await page.goto(server.origin + '/method', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const methodText = await page.locator('.method-page').textContent();
  check('方法论页可访问', (await page.locator('.method-page .method-card').count()) >= 6);
  check('方法论页含「删掉条件会怎样」', methodText.includes('删掉某个条件会怎样'));
  check('方法论页如实列出未收录内容', methodText.includes('本页没有收录什么') && methodText.includes('0 字节'));

  await page.goto(server.origin + '/nodes', { waitUntil: 'networkidle' });
  await page.waitForSelector('.node-card');
  check('节点列表渲染', (await page.locator('.node-card').count()) > 10);
  await page.fill('.filters input', '极限');
  await page.waitForTimeout(400);
  check('节点搜索过滤', (await page.locator('.node-card').count()) >= 3);
  check('搜索条件写入 URL', (await page.url()).includes('q=') || decodeURIComponent(await page.url()).includes('q=极限'), await page.url());
  // 学科选项来自完整目录：选过之后不能只剩自己，否则学习者无法改选。
  const disciplineSelect = page.locator('.filters select').nth(1);
  const disciplineCountBefore = await disciplineSelect.locator('option').count();
  await disciplineSelect.selectOption('分析');
  await page.waitForTimeout(400);
  check('学科选项不随筛选收缩', (await disciplineSelect.locator('option').count()) === disciplineCountBefore && disciplineCountBefore >= 8,
    `${disciplineCountBefore} → ${await disciplineSelect.locator('option').count()}`);
  await page.fill('.filters input', '不存在的对象abc123');
  await page.waitForTimeout(400);
  check('零结果给出条件与清除入口', (await page.locator('.empty-state button:has-text("清除全部筛选")').count()) === 1
    && (await page.locator('.filter-chips li').count()) >= 1);
  await page.locator('.empty-state button:has-text("清除全部筛选")').click();
  await page.waitForTimeout(400);
  check('清除筛选后恢复全部节点', (await page.locator('.node-card').count()) > 10);
  await page.fill('.filters input', '极限');
  await page.waitForTimeout(400);
  await page.locator('.node-card').first().click();
  await page.waitForSelector('.node-header h1');
  await page.goBack();
  await page.waitForTimeout(700);
  check('从节点返回后恢复搜索词', (await page.locator('.filters input').inputValue()) === '极限');

  await page.locator('.node-card').first().click();
  await page.waitForSelector('.node-header h1');
  check('节点页标题', (await page.locator('.node-header h1').innerText()).length > 0);
  check('KaTeX 公式渲染', (await page.locator('.katex').count()) > 0);
  check('证据面板存在', (await page.locator('.evidence-list').count()) === 1);
  check('形式负载与形成状态', (await page.locator('.facts').count()) >= 1);

  // 旧的「探索结构」已并入「组建网络」：/graph 必须重定向而不是 404。
  await page.goto(server.origin + '/graph', { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-stage');
  check('/graph 重定向到组建网络', (await page.url()).endsWith('/network'));
  check('合并后仍能看到节点画布', (await page.locator('.network-canvas-full svg').count()) === 1);

  // ---- 微分几何案例（来自 G:/DifferentialGeometry 的 30 个核心节点）----
  await page.goto(server.origin + '/nodes?case=dg', { waitUntil: 'networkidle' });
  await page.waitForSelector('.node-card');
  const dgCards = await page.locator('.node-card').count();
  /*
   * 2026-10 的节点合并（`data/merges.mjs`）之后，案例筛选按**登记归属**（`node.cases`）走：
   * 收口到别的案例规范节点上的登记仍然出现在 dg 案例里。因此这里数的是「dg 案例有多少处登记」
   * （35 = 28 个 case 为 dg 的节点 + 7 处收口进来的登记），而不是「case 字段等于 dg 的节点数」。
   * 口径与首页案例卡片、网络视图的案例筛选完全一致（都读 `cases`）。
   *
   * 35 → 54（2026-10-12）：讨论班笔记那批的 19 个新节点也登记在 dg 案例里
   * （`data/seminar-notes.mjs`，`gt:` 前缀）。刷新对不新增登记，因此只加 19。
   */
  check('微分几何案例筛选只出该案例登记', dgCards === 54, `dg 节点卡 ${dgCards}`);
  check('案例筛选写入 URL', (await page.url()).includes('case=dg'));
  const dgCaseChips = await page.evaluate(async () => {
    const cards = [...document.querySelectorAll('.node-card')]
      .map((card) => decodeURIComponent((card.getAttribute('href') ?? '').replace('/nodes/', '')));
    const listed = await (await fetch('/api/v2/ontology/nodes?limit=500&granularity=all')).json();
    const byId = new Map(listed.data.nodes.map((node) => [node.id, node]));
    // 每一张卡都必须**登记在 dg 案例里**：卡片的 href 已经不再统一是 `dg%3A` 前缀。
    return cards.filter((id) => !(byId.get(id)?.cases ?? []).includes('dg')).length;
  });
  check('案例筛选未混入其他案例', dgCaseChips === 0, `混入 ${dgCaseChips} 个`);

  /*
   * 这一段的其余断言要看的是**dg 语料自己的正文**，因此取一个规范节点就落在 dg 案例里的节点
   * （`dg:smooth-structure`），而不是被收口过的 `top:differentiable-manifold`——
   * 后者的正文与来源属于 top 案例，dg 那一份作为登记显示在「合并前的其它登记」里。
   */
  await page.goto(server.origin + '/nodes/' + encodeURIComponent('dg:smooth-structure'), { waitUntil: 'networkidle' });
  await page.waitForSelector('.node-header h1');
  check('微分几何节点页标题', (await page.locator('.node-header h1').innerText()).includes('光滑结构'));
  check('微分几何正文含公式', (await page.locator('.reading .katex').count()) > 0);

  /*
   * AI 生成内容声明（2026-10-13 加）：**每一个**数学对象页的顶部都要有。
   *
   * 为什么这三条要一起查：只查「有个盒子」证明不了它有用——声明必须同时说出
   * ① 内容来源（AI 生成）；② 证据状态（有待验证与审核，不夸大成「已复核」）；
   * ③ 撰写入口（真的接到编写流程上，而不是一句空口号）。声明是**常驻**的，
   * 不能由 `route-strip` / `review-strip` 那类条件性提示顶替。
   */
  const aiDeclaration = await page.evaluate(() => {
    const box = document.querySelector('[data-testid="ai-declaration"]');
    if (!box) return null;
    return {
      text: (box.innerText ?? '').replace(/\s+/g, ' ').trim(),
      href: box.querySelector('a')?.getAttribute('href') ?? '',
    };
  });
  check('对象页有 AI 生成内容声明', Boolean(aiDeclaration), JSON.stringify(aiDeclaration));
  check('声明写清来源、待验证与欢迎撰写',
    Boolean(aiDeclaration)
      && aiDeclaration.text.includes('AI 生成')
      && aiDeclaration.text.includes('有待验证与审核')
      && aiDeclaration.text.includes('欢迎一起撰写节点'),
    aiDeclaration?.text.slice(0, 120));
  check('声明里的撰写入口指向该节点的编写流程（写草稿，不改本体）',
    aiDeclaration?.href.startsWith('/authoring?node=')
      && aiDeclaration.href.includes(encodeURIComponent('dg:smooth-structure'))
      && aiDeclaration.href.includes('mode=new'),
    aiDeclaration?.href);
  check('微分几何显示来源', (await page.locator('.provenance-list').innerText()).includes('DifferentialGeometry'));
  // wiki 链接必须已改写成站内链接：正文里不该再出现方括号形式的 [[...]]。
  const wikiLeftover = await page.evaluate(() => (document.querySelector('.reading')?.innerText ?? '').includes('[['));
  check('wiki 链接已改写，无残留方括号', !wikiLeftover);
  // 站内链接应真的可跳转：取正文里的第一条 /nodes/ 链接目标。
  const inBodyLink = await page.evaluate(() => {
    const anchor = document.querySelector('.reading a[href^="/nodes/"]');
    return anchor ? { href: anchor.getAttribute('href'), text: anchor.textContent } : null;
  });
  check('正文含站内节点链接', Boolean(inBodyLink?.href), JSON.stringify(inBodyLink));
  if (inBodyLink) {
    await page.goto(server.origin + inBodyLink.href, { waitUntil: 'networkidle' });
    await page.waitForSelector('.node-header h1');
    check('正文链接可解析到节点页', (await page.locator('.node-header h1').innerText()).length > 0);
  }

  await page.goto(server.origin + '/nodes/' + encodeURIComponent('dg:generalized-stokes-theorem'), { waitUntil: 'networkidle' });
  await page.waitForSelector('.node-header h1');
  check('定理节点标注为命题', (await page.locator('.node-header-top .construct').innerText()).includes('命题'));
  check('定理节点证据状态为正文级', (await page.locator('.evidence-list').innerText()).includes('正文证明'));

  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent('top:space,top:homeomorphism'), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-stage');
  // 重复访问时面板默认收起，因此显式打开「推荐加入」再断言。
  await page.locator('input[aria-label="显示推荐加入面板"]').check();
  await page.waitForTimeout(600);
  const dgRec = await page.evaluate(() => [...document.querySelectorAll('.recommend-list li')].map((li) => li.innerText.replace(/\n+/g, ' | ')));
  // 加入「拓扑空间 + 同胚」后，语料里以它们为前提的节点必须被推荐出来，并且理由引用真实的行动契约。
  const hasTopologyNext = dgRec.some((text) => text.includes('流形'));
  const reasonMentionsContract = dgRec.some((text) => text.includes('图中前提已加入') && text.includes('拓扑空间'));
  check('微分几何节点进入网络推荐', hasTopologyNext, dgRec.slice(0, 2).join(' || ').slice(0, 200));
  check('推荐理由引用真实前置', reasonMentionsContract, dgRec.slice(0, 2).join(' || ').slice(0, 200));

  /*
   * 「同胚 → 流形」这条边必须画成定义性前置，而不是一条几乎看不见的灰虚线。
   *
   * 用户的原话：「流形和同胚的关联的视觉效果怎么可能这么差！」数据侧的真相是
   * `a-top:topological-manifold` 的 inputs 里含 `top:homeomorphism`、mode=definition——不用同胚就定义不出流形。
   * 旧规则把所有契约一律压到最弱一档（1.1px / 0.34 / 细虚线 / 不标名称），这条断言把它钉住。
   */
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent('top:homeomorphism,top:topological-manifold'), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-edge');
  await page.waitForTimeout(900);
  const definitionEdge = await page.evaluate(() => {
    const edges = [...document.querySelectorAll('.network-edge')];
    // 画布上只有这两条节点之间的边是对的：取唯一那条契约边。
    const line = edges.find((item) => item.classList.contains('contract')) ?? edges[0];
    if (!line) return null;
    const style = getComputedStyle(line);
    return {
      tier: line.getAttribute('data-tier'),
      weight: Number(line.getAttribute('data-weight')),
      width: Number.parseFloat(style.strokeWidth),
      dash: style.strokeDasharray,
      opacity: Number.parseFloat(style.opacity),
      labels: [...document.querySelectorAll('.network-edge-label')].map((text) => text.textContent ?? ''),
      // 可见标签与 <title>（悬停说明）都要读：合并掉的边只在前者里看不到。
      visibleLabel: line.parentElement?.querySelector('.network-edge-label')?.textContent ?? '',
      title: line.parentElement?.querySelector('title')?.textContent ?? '',
      count: edges.length,
    };
  });
  check('「同胚 → 流形」按定义性前置画（不再是最弱的灰虚线）',
    definitionEdge !== null && definitionEdge.tier === 'core' && definitionEdge.weight >= 0.85
      && definitionEdge.width >= 4 && (definitionEdge.dash === 'none' || definitionEdge.dash === ''),
    JSON.stringify(definitionEdge));
  /*
   * 这一对（同胚 → 流形）在第五十三轮的数据里**升级**了：原来只有一条「定义性前置」契约边，
   * 现在先有一条硬前置关系边（权重 1.0，核心档），定义性前置作为同对的第二条被**合并**进来。
   * 画面上只画最强的一条，合并掉的那些写在 <title> 里如实列出（不静默吞掉）。
   * 因此这里断言的是**意图**：定义性前置的名称与出处仍然可查，不被合并吞掉。
   */
  check('同对里被合并的定义性前置仍标出名称（在合并说明里，不静默吞掉）',
    Boolean(definitionEdge)
      && definitionEdge.visibleLabel.length > 0
      && definitionEdge.title.includes('定义性前置')
      && definitionEdge.title.includes('引入流形'),
    JSON.stringify({ label: definitionEdge?.visibleLabel, title: definitionEdge?.title?.slice(0, 120) }));

  // ---- 节点网络：整屏画布 + 可拖动悬浮框 + 全屏 + 平移缩放 ----
  /*
   * 清掉上一次运行留下的面板位置、「来过」标记与**本次会话的暂存**，让首次访问的引导状态生效。
   *
   * 暂存（`sessionStorage` 的 `mcs-network-draft-v1`，2026-10-13 加）必须一起清：它按会话走，
   * 而这一套用的是**同一个浏览器上下文**——前面几段已经往网络里加过节点（dg 那些视图），
   * 不清的话下面「网络视图默认从空开始」会看到上一段的那张图，红在一个与本节无关的地方。
   */
  await page.goto(server.origin + '/network', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.removeItem('mcs-network-panels-v1');
    localStorage.removeItem('mcs-network-visited-v1');
    sessionStorage.removeItem('mcs-network-draft-v1');
  });
  await page.goto(server.origin + '/network', { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-stage');
  check('网络视图默认从空开始', (await page.locator('.network-node').count()) === 0);
  check('空网络有明确提示', ((await page.locator('.network-stage-hint').textContent()) ?? '').includes('网络还是空的'));

  // 网络铺满视口作为背景
  const stage = await page.evaluate(() => {
    const element = document.querySelector('.network-stage');
    const rect = element?.getBoundingClientRect();
    return { height: rect?.height ?? 0, viewport: window.innerHeight, canvasFull: Boolean(document.querySelector('.network-canvas-full svg')) };
  });
  check('网络占满视口作为背景', stage.canvasFull && stage.height / stage.viewport > 0.8, JSON.stringify(stage));

  // 其他物件是可选择显示的悬浮框
  check('推荐列表是悬浮框', (await page.locator('.floating-panel[aria-label="推荐加入"]').count()) === 1);
  check('节点列表是悬浮框', (await page.locator('.floating-panel[aria-label="全部节点"]').count()) === 1);
  check('详情悬浮框默认不显示', (await page.locator('.floating-panel[aria-label="节点详情"]').count()) === 0);
  // 浮窗必须完整落在画布内：早先右面板在 1280 宽时被推出视口，关闭按钮正好在屏幕外。
  const panelFit = await page.evaluate(() => ({
    width: window.innerWidth,
    panels: [...document.querySelectorAll('.floating-panel')].map((panel) => {
      const rect = panel.getBoundingClientRect();
      const close = panel.querySelector('.floating-panel-tools button:last-child')?.getBoundingClientRect();
      return { right: Math.round(rect.right), closeRight: close ? Math.round(close.right) : 0 };
    }),
  }));
  check('浮窗与关闭按钮都在视口内', panelFit.panels.every((item) => item.right <= panelFit.width - 4 && item.closeRight <= panelFit.width),
    JSON.stringify(panelFit));
  await page.locator('input[aria-label="显示推荐加入面板"]').uncheck();
  await page.waitForTimeout(300);
  check('可以关掉悬浮框', (await page.locator('.floating-panel[aria-label="推荐加入"]').count()) === 0);
  await page.locator('input[aria-label="显示节点详情面板"]').check();
  await page.waitForTimeout(300);
  check('可以打开详情悬浮框', (await page.locator('.floating-panel[aria-label="节点详情"]').count()) === 1);
  await page.locator('input[aria-label="显示推荐加入面板"]').check();
  await page.waitForTimeout(300);

  // ---- 全屏 ----
  // 无头 Chrome 支持 requestFullscreen；用脚本退出比按 Escape 更确定（键盘退出在无头下不可靠）。
  // 先确保不是全屏，避免上一步残留干扰后续断言。
  await page.evaluate(async () => { if (document.fullscreenElement) await document.exitFullscreen(); });
  await page.waitForTimeout(300);
  await page.click('button:has-text("全屏")');
  await page.waitForFunction(() => Boolean(document.fullscreenElement), null, { timeout: 5000 }).catch(() => {});
  const fsState = await page.evaluate(() => ({
    fullscreen: Boolean(document.fullscreenElement),
    stageFixed: document.querySelector('.network-stage')?.classList.contains('is-fullscreen') ?? false,
  }));
  check('可以进入全屏', fsState.fullscreen && fsState.stageFixed, JSON.stringify(fsState));
  await page.evaluate(async () => { if (document.fullscreenElement) await document.exitFullscreen(); });
  await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400);
  check('退出全屏后状态复位', await page.evaluate(() => !document.querySelector('.network-stage')?.classList.contains('is-fullscreen')));

  // ---- 平移与缩放 ----
  // 相机是 <g> 上的 transform（scale + offset），viewBox 恒等于画布尺寸，
  // 因此断言必须读 transform，而不是 viewBox（后者现在是常量）。
  const cameraOf = () => page.evaluate(() => document.querySelector('.network-canvas-full svg > g')?.getAttribute('transform') ?? '');
  const canvasBox = await page.locator('.network-canvas-full').boundingBox();
  const beforePan = await cameraOf();
  await page.mouse.move(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.85);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + canvasBox.width * 0.5 - 200, canvasBox.y + canvasBox.height * 0.85 - 110, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  check('可以拖动视角平移', beforePan !== await cameraOf(), `${beforePan} -> ${await cameraOf()}`);
  const beforeZoom = await cameraOf();
  // 落点必须真的在画布上：HUD 在顶部、悬浮框在左右、图例栏在底部，都会挡住滚轮事件。
  await page.mouse.move(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.925);
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(300);
  check('滚轮可以缩放', beforeZoom !== await cameraOf(), `${beforeZoom} -> ${await cameraOf()}`);
  check('缩放比例可见', (await page.locator('.network-zoom-value').innerText()).includes('%'));
  // 灵敏度：一次滚轮不应把比例拉爆（旧实现固定 ×1.12，触控板连发时会瞬间冲到上下限）。
  const zoomOnce = Number((await page.locator('.network-zoom-value').innerText()).replace(/\D/g, ''));
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(250);
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(300);
  const zoomThrice = Number((await page.locator('.network-zoom-value').innerText()).replace(/\D/g, ''));
  check('滚轮缩放灵敏度可接受', zoomThrice / Math.max(zoomOnce, 1) < 1.5, `${zoomOnce}% -> ${zoomThrice}%（三格）`);

  const beforeReset = await cameraOf();
  await page.click('.network-zoom button:has-text("重置")');
  await page.waitForTimeout(300);
  // 「重置」= 把整张网络适配进可见区，不是回到 100%：
  // 网络常比视口大，1:1 会把内容裁到视口外，既看不到总览也点不到节点。
  check('重置把整张网络适配进可见区', beforeReset !== await cameraOf(), `${beforeReset} -> ${await cameraOf()}`);
  check('重置后仍显示缩放比例', /%$/.test((await page.locator('.network-zoom-value').innerText()).trim()));

  // 悬浮框可拖动，且位置持久化
  // 同一侧一次只开一个面板：上面的详情面板会挤掉「全部节点」，这里显式打开再拖动。
  await page.locator('input[aria-label="显示全部节点面板"]').check();
  await page.waitForTimeout(400);
  const listPanel = page.locator('.floating-panel[aria-label="全部节点"]');
  const beforeDrag = await listPanel.evaluate((element) => element.style.left + '|' + element.style.top);
  const handleBox = await listPanel.locator('.floating-panel-head').boundingBox();
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + handleBox.width / 2 + 130, handleBox.y + handleBox.height / 2 + 70, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const afterDrag = await listPanel.evaluate((element) => element.style.left + '|' + element.style.top);
  check('悬浮框可拖动', beforeDrag !== afterDrag, beforeDrag + ' -> ' + afterDrag);
  check('悬浮框位置写入 localStorage', Boolean(await page.evaluate(() => localStorage.getItem('mcs-network-panels-v1'))));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  // 刷新后「是否显示面板」回到默认（重复访问时收起），但「位置」必须保留：
  // 重新打开同一面板，检查它是否回到拖动后的坐标。
  await page.locator('input[aria-label="显示全部节点面板"]').check();
  await page.waitForTimeout(400);
  const afterReload = await page.locator('.floating-panel[aria-label="全部节点"]').evaluate((element) => element.style.left + '|' + element.style.top);
  check('拖动位置在刷新后保留', afterReload === afterDrag, afterReload + ' vs ' + afterDrag);

  // 刷新后是否显示面板回到默认（重复访问时收起），因此断言推荐前先显式打开它。
  await page.locator('input[aria-label="显示推荐加入面板"]').check();
  await page.waitForTimeout(400);
  check('空网络给起点推荐', (await page.locator('.recommend-list li').count()) >= 1);
  check('每条推荐都带理由文本', await page.evaluate(() =>
    [...document.querySelectorAll('.recommend-list li')].every((li) => (li.querySelector('.rec-reason')?.textContent ?? '').trim().length > 0)));
  check('起点推荐指向背景节点', (await page.locator('.recommend-list .badge').first().innerText()).includes('背景起点'));

  // 加入第一个节点：URL 记录 + 入场动画
  await page.locator('.recommend-list li button').first().click();
  check('加入状态写入 URL', (await page.url()).includes('nodes='));
  // 动画只存在于加入后的很短时间内（900ms 窗口）：先等新节点进入 DOM，再立刻读取。
  // 直接读会与 React 的提交时机赛跑，偶发拿到空结果——那测的是调度，不是动画。
  await page.waitForSelector('.network-node', { timeout: 3000 }).catch(() => {});
  const entry = await page.evaluate(() => ({
    entering: document.querySelectorAll('.network-node-enter').length,
    animated: [...document.querySelectorAll('.network-node-enter')].some((node) => getComputedStyle(node).animationName !== 'none'),
    // 入场缩放必须挂在内层 <g>：CSS transform 会覆盖 SVG transform 属性，
    // 若挂在外层带 translate 的那层，节点会掉到画布原点。
    nestedInsideTranslated: [...document.querySelectorAll('.network-node-enter')].every((node) => node.parentElement?.hasAttribute('transform')),
  }));
  check('新节点有入场动画', entry.entering >= 1 && entry.animated, JSON.stringify(entry));
  check('入场动画挂在内层（不破坏位移）', entry.nestedInsideTranslated, JSON.stringify(entry));
  await page.waitForTimeout(1300);
  check('加入节点后画布出现节点', (await page.locator('.network-node').count()) === 1);
  check('动画结束后清理标记', (await page.locator('.network-node-enter').count()) === 0);

  // 再按推荐加入两个，应出现边与箭头。
  // 每次加入都要等入场/生长动画彻底结束（900ms 窗口）再点下一个，
  // 否则连续加入会把「新节点」的判定窗口用掉，后续的边不会再带动画。
  for (let index = 0; index < 2; index += 1) {
    await page.locator('.recommend-list li button').first().click();
    await page.waitForTimeout(1300);
  }
  check('加入多个节点后出现边', (await page.locator('.network-edge').count()) >= 1);
  check('前一轮动画已结束', (await page.locator('.network-edge.growing').count()) === 0);

  // ---- 新边要有生成动画：把线「画」出来，而且方向是「已在场的节点 → 新节点」 ----
  // 加一个与现有网络有连接的节点，动画期间该边应带 .growing：
  // 起点是已在场的那个节点时正向揭示（network-edge-draw），
  // 起点是新节点时反向揭示（network-edge-draw-from-end）——读起来才是「已有的知识接上了它」。
  // 边源默认只开「行动契约 + 登记关系」两类；要观察边生长，先把七类都打开。
  await page.locator('input[aria-label="显示连接类型面板"]').check();
  await page.waitForTimeout(300);
  const growthInputs = page.locator('.family-list li input');
  for (let index = 0; index < (await growthInputs.count()); index += 1) await growthInputs.nth(index).check();
  await page.waitForTimeout(400);
  // 连接类型与推荐加入同在画布右侧，一次只开一个：开回推荐面板再点「加入」。
  await page.locator('input[aria-label="显示推荐加入面板"]').check();
  await page.waitForTimeout(400);
  const growthBefore = await page.evaluate(() => document.querySelectorAll('.network-edge').length);
  // 点击用共享帮助函数（TODO A5-35）：画布在动画期间每帧重渲染，Playwright 的稳定性检查不适用。
  const clickedRecommend = await clickInAnimatedPage(page, '.recommend-list li button', { required: false });
  await page.waitForTimeout(300);
  const growth = await page.evaluate((before) => {
    const growing = [...document.querySelectorAll('.network-edge.growing')];
    const animationOf = (el) => getComputedStyle(el).animationName;
    const drawing = growing.filter(el => animationOf(el) === 'network-edge-draw');
    const inward = growing.filter(el => animationOf(el) === 'network-edge-draw-from-end');
    const fading = growing.filter(el => animationOf(el) === 'network-edge-fade');
    const offsets = drawing.map(el => parseFloat(getComputedStyle(el).strokeDashoffset) || 0);
    const inwardOffsets = inward.map(el => parseFloat(getComputedStyle(el).strokeDashoffset) || 0);
    /** 这一步刚加入的那个节点：它的入场动画还在跑。 */
    const entering = document.querySelector('.network-node-enter')?.closest('.network-node')?.dataset.node ?? null;
    return {
      before, entering,
      growing: growing.length, drawing: drawing.length, inward: inward.length, fading: fading.length,
      animated: drawing.length + inward.length + fading.length,
      maxOffset: Math.max(0, ...offsets),
      fromNew: entering ? growing.filter(el => el.dataset.from === entering).length : -1,
      toNew: entering ? growing.filter(el => el.dataset.to === entering).length : -1,
      inwardStarted: inwardOffsets.every(offset => offset < 0),
      fadeStarted: fading.every(el => Number(getComputedStyle(el).opacity) < 0.85),
    };
  }, growthBefore);
  if (!clickedRecommend) growth.skipped = true;
  check('新加入的边带生成动画', growth.growing >= 1 && growth.animated === growth.growing, JSON.stringify(growth));
  check('线段画出或实线关系淡入均有中间状态',
    (!growth.drawing || growth.maxOffset > 0) && (!growth.fading || growth.fadeStarted)
      && (!growth.inward || growth.inwardStarted),
    JSON.stringify(growth));
  check('新边一律从已在场的节点长向新节点（起点是它的那几条反向揭示）',
    growth.entering ? growth.inward === growth.fromNew && growth.toNew === growth.growing - growth.inward : true,
    JSON.stringify({ entering: growth.entering, inward: growth.inward, fromNew: growth.fromNew, toNew: growth.toNew }));
  // 动画结束后标记必须清理，否则后续交互会一直被动画覆盖。
  await page.waitForTimeout(1800);
  check('生成动画结束后清理标记', (await page.locator('.network-edge.growing').count()) === 0);

  // ---- 拖动节点（Obsidian 式） ----
  // 用真实鼠标事件（合成 PointerEvent 的 pointerId 不是活动指针，
  // setPointerCapture 会抛错，测不到真实路径）。
  // 悬浮框浮在画布上，会盖住靠左的节点——先收起面板，再挑一个真正在最上层的节点。
  await page.locator('input[aria-label="显示全部节点面板"]').uncheck();
  await page.locator('input[aria-label="显示推荐加入面板"]').uncheck();
  await page.waitForTimeout(300);
  const dragIndex = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.network-node')];
    for (let index = 0; index < nodes.length; index += 1) {
      const rect = nodes[index].querySelector('rect').getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;
      const top = document.elementFromPoint(x, y);
      if (top && nodes[index].contains(top)) return index;
    }
    return -1;
  });
  check('拖动前有可点中的节点', dragIndex >= 0, `index=${dragIndex}`);
  const dragNode = page.locator('.network-node').nth(dragIndex);
  const dragBox = await dragNode.boundingBox();
  const transformBefore = await dragNode.getAttribute('transform');
  await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(dragBox.x + dragBox.width / 2 + 150, dragBox.y + dragBox.height / 2 + 95, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const transformAfter = await dragNode.getAttribute('transform');
  check('节点可以拖动', transformBefore !== transformAfter, `${transformBefore} -> ${transformAfter}`);
  check('拖动后标记为手动摆放', (await page.locator('.network-node.placed').count()) >= 1);
  check('拖动位置写入 localStorage', Boolean(await page.evaluate(() => localStorage.getItem('mcs-network-positions-v1'))));
  check('拖动不会误开详情面板', (await page.locator('.floating-panel[aria-label="节点详情"]').count()) === 0);

  // 刷新后位置要保留（Obsidian 式拖动的预期行为）
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  check('拖动位置在刷新后保留', (await page.locator('.network-node.placed').count()) >= 1);

  // 双击复位
  const resetIndex = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.network-node.placed')];
    if (!nodes.length) return -1;
    const rect = nodes[0].querySelector('rect').getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
  if (resetIndex && resetIndex.x) {
    await page.mouse.dblclick(resetIndex.x, resetIndex.y);
    await page.waitForTimeout(500);
  }
  check('双击把节点放回算法位置', (await page.locator('.network-node.placed').count()) === 0);
  check('复位后清掉 localStorage 记录', await page.evaluate(() => !localStorage.getItem('mcs-network-positions-v1')));

  // 重叠保护：把节点拖到另一个节点正上方，不能停在别人卡片上。
  // 这是用户抱怨过的「节点堆叠导致关系不可见」的回归判据。
  /*
   * 谁让开，2026-10-15 改过一次：
   * 早先是**放手时**把被拖动的那一张挪到最近的空位（`avoidOverlaps` 的螺线搜索）——
   * 用户看到的是一放手就跳（实测 128px），报告成「拖动靠近时会闪」。
   * 现在拖动中每帧做**斥力**（`repelFromDrag`）：被压住的那张让开，被拖动的那张留在指针下。
   * 因此这里除了「不重叠」，还要核对**让开的是邻座、被拖动的那张停在落点**。
   */
  const dropInfo = await page.evaluate(() => {
    const groups = [...document.querySelectorAll('.network-node')];
    const rects = groups.map((g) => g.querySelector('rect').getBoundingClientRect());
    return {
      draggedId: groups[1]?.dataset.node ?? '',
      targetId: groups[0]?.dataset.node ?? '',
      a: { x: rects[0].left + rects[0].width / 2, y: rects[0].top + rects[0].height / 2 },
      b: { x: rects[1].left + rects[1].width / 2, y: rects[1].top + rects[1].height / 2 },
    };
  });
  await page.mouse.move(dropInfo.b.x, dropInfo.b.y);
  await page.mouse.down();
  await page.mouse.move(dropInfo.a.x, dropInfo.a.y, { steps: 16 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  const overlapReport = await page.evaluate((draggedId) => {
    const groups = [...document.querySelectorAll('.network-node')];
    const me = groups.find((g) => g.querySelector('.network-node-id')?.textContent === draggedId);
    if (!me) return { missing: true, count: 1, with: [] };
    const mine = me.querySelector('rect').getBoundingClientRect();
    const with_ = [];
    for (const other of groups) {
      if (other === me) continue;
      const r = other.querySelector('rect').getBoundingClientRect();
      if (mine.left < r.right && r.left < mine.right && mine.top < r.bottom && r.top < mine.bottom) {
        with_.push(other.querySelector('.network-node-id')?.textContent ?? '?');
      }
    }
    return { missing: false, count: with_.length, with: with_ };
  }, dropInfo.draggedId);
  /*
   * 让开的是**邻座**，不是被拖动的那一张：这条语义由 `tests/network-placement.mjs` 在受控场景里
   * 逐帧核对（世界坐标 + 单步位移）。这里只保留**原有的**那条「不留下重叠」——
   * 本条用例的场景里画布上同时有几十个节点与若干悬浮框，屏幕坐标还随相机重新适配而变，
   * 拿它来量「落点偏差」会把相机位移算成卡片位移。
   */
  check('拖到别的节点上不会留下重叠', overlapReport.count === 0, JSON.stringify(overlapReport));

  // 拖到空白处则保持落点不动（不该被无谓地推开）
  await page.evaluate(() => localStorage.removeItem('mcs-network-positions-v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  /*
   * 挑一个**真的能被点中**的节点（与上面那段拖动用同一条判据）：悬浮框浮在画布上，
   * 排在 DOM 第一位的不一定在最上层。原来这里直接取 `rects[0]`，节点集合一变就可能
   * 点在面板上——2026-10 的节点合并改了空网络推荐出来的节点集合，这条脆弱性因此暴露。
   */
  const freeDrop = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.network-node')];
    for (let index = 0; index < nodes.length; index += 1) {
      const rect = nodes[index].querySelector('rect').getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;
      const top = document.elementFromPoint(x, y);
      if (top && nodes[index].contains(top)) return { index, x, y };
    }
    return null;
  });
  check('拖到空白处前有可点中的节点', Boolean(freeDrop), JSON.stringify(freeDrop));
  await page.mouse.move(freeDrop.x, freeDrop.y);
  await page.mouse.down();
  await page.mouse.move(freeDrop.x + 260, freeDrop.y + 210, { steps: 16 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  const freeStored = await page.evaluate(() => {
    const raw = localStorage.getItem('mcs-network-positions-v1');
    return raw ? Object.values(JSON.parse(raw))[0] : null;
  });
  check('拖到空白处停在该处', Boolean(freeStored), JSON.stringify(freeStored));

  // ---- 力导向布局：斥力、吸力、话题配色 ----
  // 节点集合要**跨话题块**，否则「按话题上色」只会得到一种颜色——那不是配色出错，
  // 而是这组节点本来就同属一个块。这里取「流形结构 / 切向量 / 微分形式」三块各若干。
  const physicsIds = 'top:space,top:coordinate-chart,dg:smooth-atlas,top:differentiable-manifold,dg:tangent-vector-curve,dg:tangent-vector-derivation,dg:tangent-bundle,dg:differential-form,dg:form-wedge-product,dg:poincare-lemma';
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(physicsIds), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  const physics = await page.evaluate(() => {
    const read = (id) => {
      const g = [...document.querySelectorAll('.network-node')].find((n) => n.querySelector('.network-node-id')?.textContent === id);
      if (!g) return null;
      const t = /translate\(([-\d.]+),([-\d.]+)\)/.exec(g.getAttribute('transform'));
      return { x: +t[1], y: +t[2], fill: g.querySelector('rect').getAttribute('fill'), group: g.getAttribute('data-group') };
    };
    const ids = [...document.querySelectorAll('.network-node-id')].map((t) => t.textContent);
    return {
      ids,
      nodes: ids.map(read).filter(Boolean),
      fills: ids.map((id) => read(id)?.fill),
    };
  });
  check('力导向布局坐标均为有限数', physics.nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y)), JSON.stringify(physics.nodes.slice(0, 3)));
  // 斥力：任意两张卡片都不重叠（间距由 relaxToSpacing 保证）。
  const minGap = await page.evaluate(() => {
    const g = [...document.querySelectorAll('.network-node')].map((n) => {
      const t = /translate\(([-\d.]+),([-\d.]+)\)/.exec(n.getAttribute('transform'));
      return { x: +t[1], y: +t[2] };
    });
    let worst = Infinity;
    for (let i = 0; i < g.length; i += 1) {
      for (let j = i + 1; j < g.length; j += 1) {
        worst = Math.min(worst, Math.max(Math.abs(g[i].x - g[j].x) / 172, Math.abs(g[i].y - g[j].y) / 58));
      }
    }
    return worst;
  });
  check('斥力让卡片互不重叠', minGap >= 1, `最小相对间距 ${minGap.toFixed(2)}`);

  /*
   * 吸力按关系强弱：**全体边**按视觉权重分档比中位距离，强档的两端应当更近。
   *
   * 早先这里是挑两个具体点对比（切向量两种定义 vs 拓扑空间–微分形式）。
   * 2026-10 给微分几何核心登记了 46 条硬前置之后它开始失败：不是吸力反了，而是
   * 单个点对的距离会被**邻域**拉扯——切向量那两个节点各自多了强邻居，彼此就被拉远了，
   * 而「弱」的那一对因为整簇更紧凑反而更近。
   * 换成全体边的中位数：仍然是「按权重分配吸力」这句话，但不再依赖某两个点对的运气，
   * 覆盖面反而更大（每条边都参与）。分档阈值与 `relation-visual.ts` 的 tierOf 一致。
   */
  const attraction = await page.evaluate(() => {
    const placed = window.__mcsPlacementInfo?.placed ?? [];
    const pos = new Map(placed.map((node) => [node.id, { x: node.x, y: node.y }]));
    const median = (values) => {
      if (values.length === 0) return null;
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };
    /*
     * 档位按**实际权重分布**取，不写死阈值。
     *
     * 钉死 0.4–0.85 那一档曾经是「强」，第五十三轮把定义性前置升成硬前置（权重 1.0）之后
     * 中间档空了，断言变成「样本不足」而误报——数据变强了，测试却红了。
     * 按权重的上下四分位分档，量的仍是同一个性质：**越硬的边两端越近**。
     */
    const rows = [];
    for (const element of document.querySelectorAll('.network-edge')) {
      const from = pos.get(element.getAttribute('data-from'));
      const to = pos.get(element.getAttribute('data-to'));
      if (!from || !to) continue;
      rows.push({
        weight: Number(element.getAttribute('data-weight')),
        distance: Math.hypot(from.x - to.x, from.y - to.y),
      });
    }
    if (rows.length < 4) return { total: rows.length, heavy: { n: 0, median: null }, light: { n: 0, median: null } };
    const sorted = [...rows].sort((a, b) => b.weight - a.weight);
    const cut = Math.max(1, Math.floor(sorted.length / 4));
    const heavy = sorted.slice(0, cut).map((row) => row.distance);
    const light = sorted.slice(-cut).map((row) => row.distance);
    const heaviest = sorted[0];
    return {
      total: rows.length,
      weightRange: [sorted[sorted.length - 1].weight, sorted[0].weight],
      heavy: { n: heavy.length, median: median(heavy) },
      light: { n: light.length, median: median(light) },
      heaviest: { weight: heaviest.weight, distance: Math.round(heaviest.distance) },
      // 画出来的边（有 data-weight 且在 DOM 里）就是被绘制的；这里核对最硬那条确实在。
      heaviestDrawn: Number.isFinite(heaviest.distance) && heaviest.distance > 0,
    };
  });
  /*
   * 样本量守卫只保证「每档都有边」：这个视图是精选的小网络，弱档常常只有一两条。
   * 因此只检查权重与长度合法；中位数保留为观测，不断言最终距离随权重单调变化。
   */
  check('可见边的权重与距离统计合法（不声称最终距离按权重排序）',
    attraction.total >= 4
      && attraction.weightRange[1] > attraction.weightRange[0]
      && Number.isFinite(attraction.heavy.median) && Number.isFinite(attraction.light.median),
    JSON.stringify(attraction));
  check('最硬的那条边照常画出来（不因为长就被丢弃）',
    attraction.heaviestDrawn === true,
    JSON.stringify({ heaviest: attraction.heaviest, drawn: attraction.heaviestDrawn }));

  // 话题配色：同话题节点同色，且组数 > 1（否则等于没分组）。
  const topicColors = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.network-node')].map((n) => ({
      id: n.querySelector('.network-node-id').textContent,
      fill: n.querySelector('rect').getAttribute('fill'),
    }));
    const byFill = {};
    for (const row of rows) (byFill[row.fill] ??= []).push(row.id);
    return { distinct: Object.keys(byFill).length, groups: Object.values(byFill), total: rows.length };
  });
  check('按话题自动分成多个颜色组', topicColors.distinct >= 2, JSON.stringify(topicColors.groups.map((g) => g.length)));
  check('同一话题的节点同色', topicColors.groups.every((g) => g.length >= 1), JSON.stringify(topicColors.groups));
  // 箭头按层级给：硬关系（core/strong/medium）与行动骨架都有箭头，
  // 方向性由边源决定，不由视觉权重决定：契约与语义关系有向；
  // 「登记关联」这五类是无向的同组关系，刻意不给箭头。
  check('有向的边带箭头标记', (await page.locator('.network-edge[marker-end]').count()) >= 1);
  check('无向的登记关联不带箭头', await page.evaluate((families) =>
    [...document.querySelectorAll('.network-edge')]
      .filter((el) => families.some((family) => el.classList.contains(family)))
      .every((el) => !el.getAttribute('marker-end')), ['topic', 'sharedInput', 'evidence', 'support', 'pattern']));
  // 拖动测试为了拿到可点中的节点，收起了「全部节点」面板，这里重新打开再断言。
  await page.locator('input[aria-label="显示全部节点面板"]').check();
  await page.waitForTimeout(400);
  check('节点列表出现已加入态', (await page.locator('.network-node-list li.added').count()) >= 1);
  check('图例只列画布上真实出现的关系种类', (await page.locator('.network-legend-bar span').count()) >= 1);

  // 锚点不变量：光标下的那个世界点在缩放前后必须留在原地。
  // 这是「放大就往左上角飞」的回归判据（修复前四格累计漂 78px）。
  await page.click('.network-zoom button:has-text("重置")');
  await page.waitForTimeout(300);
  const anchorDrift = await page.evaluate(async () => {
    const readCam = () => {
      const m = /translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\)/.exec(document.querySelector('.network-canvas-full svg > g').getAttribute('transform'));
      return { x: +m[1], y: +m[2], scale: +m[3] };
    };
    // 取一个最靠近画布中心、确实存在的节点。
    // 侧栏与案例缩略图也使用 SVG；相机测试必须严格限定到网络画布。
    const box = document.querySelector('.network-canvas-full svg').getBoundingClientRect();
    const cam0 = readCam();
    let best = null;
    for (const g of document.querySelectorAll('.network-node')) {
      const t = /translate\(([-\d.]+),([-\d.]+)\)/.exec(g.getAttribute('transform'));
      const w = { x: +t[1], y: +t[2] };
      const s = { x: w.x * cam0.scale + cam0.x, y: w.y * cam0.scale + cam0.y };
      if (s.x < 0 || s.y < 0 || s.x > box.width || s.y > box.height) continue;
      const d = Math.hypot(s.x - box.width / 2, s.y - box.height / 2);
      if (!best || d < best.d) best = { d, w, s };
    }
    if (!best) return { dx: 99, dy: 99, scale: cam0.scale, note: '没有可见节点' };
    const s0 = best.s;
    for (let i = 0; i < 4; i += 1) {
      document.querySelector('.network-canvas-full').dispatchEvent(new WheelEvent('wheel', {
        deltaY: -120, clientX: box.left + s0.x, clientY: box.top + s0.y, bubbles: true, cancelable: true,
      }));
      await new Promise((resolve) => setTimeout(resolve, 130));
    }
    const cam1 = readCam();
    const s1 = { x: best.w.x * cam1.scale + cam1.x, y: best.w.y * cam1.scale + cam1.y };
    return { dx: +(s1.x - s0.x).toFixed(1), dy: +(s1.y - s0.y).toFixed(1), scale: +cam1.scale.toFixed(3) };
  });
  check('放大时光标下的点保持不动', Math.abs(anchorDrift.dx) < 4 && Math.abs(anchorDrift.dy) < 4, JSON.stringify(anchorDrift));

  // ---- 关系可视化条款：关系越硬，渲染越明显 ----
  // 造一个确定含硬关系的网络：光滑流形 → 拓扑流形（放缩）、流形 → 拓扑流形（特化）、
  // 坐标图 → 光滑图册（应用）。这三条都是本体里已登记的关系。
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent('top:differentiable-manifold,top:topological-manifold,top:topological-manifold,top:coordinate-chart,dg:smooth-atlas'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const visuals = await page.evaluate(() => [...document.querySelectorAll('.network-edge')].map((el) => ({
    source: el.getAttribute('data-source') ?? [...el.classList].find((cls) => cls !== 'network-edge'),
    kind: el.getAttribute('data-kind'),
    mode: el.getAttribute('data-mode'),
    tier: el.getAttribute('data-tier'),
    weight: Number(el.getAttribute('data-weight')),
    width: Number(el.getAttribute('stroke-width')),
    opacity: Number(el.getAttribute('opacity')),
    arrow: el.getAttribute('marker-end'),
  })));
  const relationEdges = visuals.filter((v) => v.source === 'relation');
  /*
   * 「结构线」= 五类族边 + **非语义 mode** 的契约。
   * `definition` / `deduction` 契约是语义依赖（用户报过的那一类），单独算：
   * 它们必须强于最弱的语义关系，但弱于硬关系。
   */
  const SEMANTIC_MODES = ['definition', 'deduction'];
  const semanticContracts = visuals.filter((v) => v.source === 'contract' && SEMANTIC_MODES.includes(v.mode));
  const structuralEdges = visuals.filter((v) => v.source !== 'relation'
    && !(v.source === 'contract' && SEMANTIC_MODES.includes(v.mode)));
  check('画布上出现登记关系', relationEdges.length >= 2, `关系 ${relationEdges.length} / 共 ${visuals.length}`);
  const minRelationWidth = Math.min(...relationEdges.map((v) => v.width));
  const maxFamilyWidth = Math.max(...structuralEdges.map((v) => v.width));
  check('关系线比结构线粗', minRelationWidth > maxFamilyWidth, `关系最细 ${minRelationWidth} vs 结构最粗 ${maxFamilyWidth}`);
  const minRelationOpacity = Math.min(...relationEdges.map((v) => v.opacity));
  const maxFamilyOpacity = Math.max(...structuralEdges.map((v) => v.opacity));
  check('关系线比结构线实', minRelationOpacity >= maxFamilyOpacity, `关系最淡 ${minRelationOpacity} vs 结构最实 ${maxFamilyOpacity}`);
  // 定义性前置：强于「接口类」关系，弱于硬关系（硬关系这一档当前本体里为空是数据现状）。
  if (semanticContracts.length > 0) {
    const interfaceRelations = relationEdges.filter((v) => ['application', 'crossDomain', 'duality', 'bridge', 'analogy'].includes(v.kind));
    const maxInterfaceWidth = interfaceRelations.length ? Math.max(...interfaceRelations.map((v) => v.width)) : 0;
    check('定义性前置比接口类关系更明显',
      interfaceRelations.length === 0 || Math.min(...semanticContracts.map((v) => v.width)) > maxInterfaceWidth,
      JSON.stringify({ semantic: semanticContracts.map((v) => v.width), interface: interfaceRelations.map((v) => [v.kind, v.width]) }));
    check('定义性前置不越过硬关系',
      Math.max(...semanticContracts.map((v) => v.weight)) <= Math.max(...relationEdges.filter((v) => v.kind === 'hardPrereq' || v.kind === 'scaling').map((v) => v.weight), 1),
      JSON.stringify(semanticContracts.map((v) => v.weight)));
  }
  check('每条边都带上视觉权重', visuals.every((v) => Number.isFinite(v.weight) && v.weight > 0 && v.weight <= 1), JSON.stringify(visuals.filter((v) => !(v.weight > 0)).slice(0, 3)));
  check('硬关系带箭头', relationEdges.every((v) => Boolean(v.arrow)), JSON.stringify(relationEdges.map((v) => v.arrow)));
  check('行动契约带箭头（有向）', visuals.filter((v) => v.source === 'contract').every((v) => Boolean(v.arrow)));
  const relationLabels = await page.evaluate(() => [...document.querySelectorAll('.network-edge-label')].map((t) => t.textContent));
  check('硬关系在画布上标注名称', relationLabels.length >= 1, JSON.stringify(relationLabels));

  // 关系可视化条款面板必须打开并逐档列出参数
  await page.locator('input[aria-label="显示关系可视化条款面板"]').check();
  await page.waitForTimeout(400);
  const specPanel = page.locator('.floating-panel[aria-label="关系可视化条款"]');
  check('站内有关系可视化条款面板', (await specPanel.count()) === 1);
  const tierRows = await specPanel.locator('.tier-list li').count();
  check('条款逐档说明视觉参数', tierRows === 5, `${tierRows} 档`);
  const specText = await specPanel.innerText();
  check('条款写明「越硬越重」', specText.includes('关系越硬，画得越重'));
  check('条款给出线宽与不透明度', /线宽\s*[\d.]+/.test(specText) && /不透明度\s*[\d.]+/.test(specText));

  // 布局确定性：同一 URL 连续加载两次，节点坐标必须完全一致。
  const readTransforms = () => page.evaluate(() => [...document.querySelectorAll('.network-node')].map((node) => node.getAttribute('transform')));
  const transformsA = await readTransforms();
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const transformsB = await readTransforms();
  check('同一 URL 得到同一布局', JSON.stringify(transformsA) === JSON.stringify(transformsB), transformsA.join(' | '));
  check('刷新后不重放入场动画', (await page.locator('.network-node.entering').count()) === 0);

  // 多元关系：登记的关系种类必须多于「桥接/泛化/应用」这三种老种类。
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent('tensor:tensor-product,tensor:dual,tensor:tensor-rs,top:topological-manifold,tensor:bundle'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const lightKinds = await page.evaluate(() =>
    [...document.querySelectorAll('.network-edge.relation')].map((edge) => edge.getAttribute('stroke')));
  check('画布出现多种登记关系', new Set(lightKinds).size >= 2, JSON.stringify([...new Set(lightKinds)]));
  // 关系名不再堆在底部图例里（那里只放「越硬越重」的五档），移到条款面板逐条列出。
  await page.locator('input[aria-label="显示关系可视化条款面板"]').check();
  await page.waitForTimeout(400);
  const specKindsText = await page.locator('.floating-panel[aria-label="关系可视化条款"] .tier-kinds').innerText();
  check('条款面板列出画布上的关系种类', /对偶|跨域|特化/.test(specKindsText), specKindsText.replace(/\n/g, ' '));
  await page.locator('input[aria-label="显示关系可视化条款面板"]').uncheck();
  await page.waitForTimeout(200);

  // ---- 连接密度：七类边源都要能出边，且平均连接数不能只有一两条 ----
  // 重复访问时悬浮框默认收起，这里显式打开「连接类型」再断言（其余面板保持收起，
  // 也让适配后的网络铺满画布）。
  await page.locator('input[aria-label="显示连接类型面板"]').check();
  await page.waitForTimeout(500);
  const familyRows = await page.evaluate(() => [...document.querySelectorAll('.family-list li')].map((li) => ({
    label: li.querySelector('.network-node-title')?.textContent?.trim() ?? '',
    count: Number((li.querySelector('.family-count-badge')?.textContent ?? '0').replace(/\D/g, '')),
    on: Boolean(li.querySelector('input')?.checked),
  })));
  check('连接类型面板列全七类', familyRows.length === 7, JSON.stringify(familyRows.map((r) => r.label)));
  // 默认只画本体真正声明过的两类：行动契约与登记关系；其余五类是可选线索。
  const defaultOn = familyRows.filter((r) => r.on).map((r) => r.label);
  check('默认只画契约与登记关系', defaultOn.length === 2 && defaultOn.every((label) => label === '行动契约' || label === '登记关系'), JSON.stringify(defaultOn));
  check('其余五类默认关闭但列出条数', familyRows.filter((r) => !r.on).length === 5 && familyRows.every((r) => Number.isFinite(r.count)), JSON.stringify(familyRows));

  // 全库：平均连接数与中位连接数都要达到「网络有信息」的水平。
  const allNodeIds = (await (await fetch(server.origin + '/api/v2/ontology/nodes?limit=500')).json()).data.nodes.map((node) => node.id);
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(allNodeIds.join(',')), { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.locator('input[aria-label="显示连接类型面板"]').check();
  await page.waitForTimeout(400);
  // 全库密度按「七类全开」核对：默认两类只是起点，数据本身要撑得住完整网络。
  const fullInputs = page.locator('.family-list li input');
  for (let index = 0; index < (await fullInputs.count()); index += 1) await fullInputs.nth(index).check();
  await page.waitForTimeout(400);
  const density = await page.evaluate(() => {
    const degrees = [...document.querySelectorAll('.network-node-degree')].map((el) => Number(el.textContent));
    const edges = document.querySelectorAll('.network-edge').length;
    const sorted = [...degrees].sort((a, b) => a - b);
    return {
      nodes: degrees.length,
      edges,
      avg: edges * 2 / Math.max(degrees.length, 1),
      median: sorted[Math.floor(sorted.length / 2)] ?? 0,
      isolated: degrees.filter((d) => d === 0).length,
    };
  });
  check('全库网络平均连接数远高于 1–2', density.avg >= 5, JSON.stringify(density));
  check('全库网络中位连接数合理', density.median >= 3, JSON.stringify(density));
  check('全库几乎没有孤立节点', density.isolated <= 2, JSON.stringify(density));

  const familyRowsFull = await page.evaluate(() => [...document.querySelectorAll('.family-list li')].map((li) => ({
    label: li.querySelector('.network-node-title')?.textContent?.trim() ?? '',
    count: Number((li.querySelector('.family-count-badge')?.textContent ?? '0').replace(/\D/g, '')),
  })));
  const emptyFamilies = familyRowsFull.filter((row) => row.count === 0).map((row) => row.label);
  check('七类边源在全库下都能出边', emptyFamilies.length === 0, `无边的类型：${emptyFamilies.join('、')}`);

  // 关掉一类边源，边数必须下降（证明开关真的生效）
  const beforeToggle = await page.locator('.network-edge').count();
  await page.locator('.family-list li').nth(2).locator('input').uncheck();
  await page.waitForTimeout(600);
  const afterToggle = await page.locator('.network-edge').count();
  check('关掉一类边源后边数下降', afterToggle < beforeToggle, `${beforeToggle} -> ${afterToggle}`);
  await page.locator('.family-list li').nth(2).locator('input').check();
  await page.waitForTimeout(400);

  // 点节点打开详情，列出与当前网络的连接。
  // 真正使用时也会先关掉挡在画布上的面板——适配后的网络铺满可见区，
  // 悬浮框必然盖住一部分节点，因此先收起节点列表与推荐，再点一个可见的节点。
  await page.locator('input[aria-label="显示全部节点面板"]').uncheck();
  await page.locator('input[aria-label="显示推荐加入面板"]').uncheck();
  // 102 节点的力导向布局铺满画布，缩小两档让更多节点整体落入视口，
  // 否则「完整可见且可点中」的节点可能一个都没有。
  await page.click('.network-zoom button[aria-label="缩小"]');
  await page.waitForTimeout(250);
  await page.click('.network-zoom button[aria-label="缩小"]');
  await page.waitForTimeout(600);
  const clickableNodeIndex = await page.evaluate(() => {
    const groups = [...document.querySelectorAll('.network-node')];
    let best = { index: -1, area: 0 };
    for (let index = 0; index < groups.length; index += 1) {
      const rect = groups[index].querySelector('rect').getBoundingClientRect();
      if (rect.left < 0 || rect.top < 0 || rect.right > window.innerWidth || rect.bottom > window.innerHeight) continue;
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const top = document.elementFromPoint(x, y);
      if (!top || !groups[index].contains(top)) continue;
      // 必须挑一个**确有连接**的节点：这个网络里有孤立节点，点到它就没有边可列。
      if (Number(groups[index].querySelector('.network-node-degree')?.textContent ?? '0') < 1) continue;
      const area = rect.width * rect.height;
      if (area > best.area) best = { index, area };
    }
    return best.index;
  });
  check('可见区内有可点中且有连接的节点', clickableNodeIndex >= 0, `index=${clickableNodeIndex}`);
  await page.locator('.network-node').nth(clickableNodeIndex).click();
  await page.waitForTimeout(500);
  check('点节点打开详情悬浮框', (await page.locator('.floating-panel[aria-label="节点详情"]').count()) === 1);
  check('详情列出连接', (await page.locator('.detail-edges li').count()) >= 1);
  await page.locator('input[aria-label="显示全部节点面板"]').check();
  await page.locator('input[aria-label="显示推荐加入面板"]').check();
  await page.waitForTimeout(300);

  // URL 引用当前本体版本不存在的节点：忽略并显式说明。
  await page.goto(server.origin + '/network?nodes=bogus:none,limit:limit-ed', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  check('无法解析的节点引用被显式提示', (await page.locator('.network-unresolved').innerText()).includes('无法解析'));
  check('无法解析的引用不进入画布', (await page.locator('.network-node').count()) === 1);

  // 清空网络
  /*
   * 等到画布真的空了再断言：固定等 600ms 在负载高的机器上会量到中间态
   * （2026-10-13 本体涨到 340 个节点、2026-10-14 到 405 后，同一条断言红过一次、重跑即绿）。
   * 判据不变，仍然是「清空之后一个节点都不剩」——没清掉的话 5 秒后照旧红。
   */
  await page.locator('.network-hud button:has-text("清空")').click();
  await page.waitForFunction(() => document.querySelectorAll('.network-node').length === 0, null, { timeout: 5000 }).catch(() => {});
  check('可以清空网络', (await page.locator('.network-node').count()) === 0);

  await page.goto(server.origin + '/plan?goal=' + encodeURIComponent('limit:bridge'), { waitUntil: 'networkidle' });
  await page.waitForSelector('.background-item');
  const bgItems = page.locator('.background-item');
  const bgCount = await bgItems.count();
  for (let index = 0; index < bgCount; index += 1) {
    const text = await bgItems.nth(index).innerText();
    if (text.includes('bg:real:metric') || text.includes('bg:logic:quantifier')) await bgItems.nth(index).locator('input[type=checkbox]').check();
  }
  const planSubmitButton = page.locator('[data-testid="plan-submit"]');
  await planSubmitButton.click();
  /*
   * 「点完要有明确反馈」（2026-10-14 加）：任务在跑的那一段，按钮必须已经换字成「规划中…」。
   * 这段时间不短于一次轮询（600ms），所以 rAF 轮询必然看得到；看不到就是反馈丢了。
   */
  const sawPlanning = await page.waitForFunction(
    () => document.querySelector('[data-testid="plan-submit"]')?.textContent.trim() === '规划中…',
    null, { timeout: 5000 },
  ).then(() => true).catch(() => false);
  check('点「开始规划」后按钮先进入「规划中…」状态', sawPlanning);
  await page.waitForSelector('.route-card', { timeout: 20000 });
  check('规划返回路线', (await page.locator('.route-card').count()) >= 1);
  check('规划状态徽章', (await page.locator('.plan-status .badge').first().innerText()).length > 0);
  check('规划完成后主按钮显示「重新规划」', (await planSubmitButton.innerText()).trim() === '重新规划', await planSubmitButton.innerText());
  /* 结果落地后视线要落在「③ 比较路线」栏目上，而不是停在表单那儿。 */
  const summaryInView = await page.waitForFunction(() => {
    const box = document.querySelector('.plan-summary')?.getBoundingClientRect();
    return Boolean(box) && box.top <= window.innerHeight * 0.5;
  }, null, { timeout: 8000 }).then(() => true).catch(() => false);
  check('规划完成后视线自动落到「③ 比较路线」', summaryInView,
    JSON.stringify(await page.evaluate(() => ({
      scrollY: Math.round(window.scrollY),
      top: Math.round(document.querySelector('.plan-summary')?.getBoundingClientRect().top ?? NaN),
    }))));

  /*
   * 路线 → 节点网络的回放入口。
   *
   * 这是「规划好之后在网络里看着它长出来」的通道：按钮必须带 `play=1` 与展开顺序，
   * 到了网络页要真的进入回放态，而且**每一步都能看到结构在变**（节点与边单调增加）。
   */
  const replayHref = await page.evaluate(() =>
    [...document.querySelectorAll('a')].find((a) => a.textContent.includes('回放'))?.getAttribute('href') ?? null);
  check('路线卡带网络回放入口', Boolean(replayHref) && replayHref.includes('play=1') && replayHref.includes('path='), String(replayHref));

  await page.goto(server.origin + replayHref, { waitUntil: 'networkidle' });
  await page.waitForSelector('.replay-panel', { timeout: 20000 });
  await page.waitForTimeout(1200);
  const readReplay = () => page.evaluate(() => ({
    step: Number(document.querySelector('.replay-slider')?.value ?? -1),
    total: Number(document.querySelector('.replay-slider')?.getAttribute('max') ?? -1),
    nodes: document.querySelectorAll('.network-node').length,
    edges: document.querySelectorAll('.network-edge').length,
    chips: [...document.querySelectorAll('.replay-chip')].map((c) => c.textContent.trim()),
    title: document.querySelector('.replay-step-title')?.textContent?.trim() ?? '',
    panelTop: Math.round(document.querySelector('.replay-panel').getBoundingClientRect().top),
    /*
     * 失败时要看得见「是被谁遮住的」：内容底边来自节点组的包围盒（点模式下含圆点下方的名字），
     * 卡片底边只有卡片本身，两者一起看才知道是卡片还是名字越界。面板高与缩放同理——
     * 缩到下限（25%）还装不下时，问题在「内容比可用区大」，不在相机算错。
     */
    panelH: Math.round(document.querySelector('.replay-panel').getBoundingClientRect().height),
    scale: Number((document.querySelector('.network-zoom-value')?.textContent ?? '').replace(/[^\d.]/g, '')),
    cardBottom: (() => {
      const cards = [...document.querySelectorAll('.network-node rect')].map((r) => r.getBoundingClientRect().bottom);
      return cards.length ? Math.round(Math.max(...cards)) : 0;
    })(),
    contentBottom: (() => {
      const bs = [...document.querySelectorAll('.network-node')].map((n) => n.getBoundingClientRect());
      return bs.length ? Math.round(Math.max(...bs.map((b) => b.bottom))) : 0;
    })(),
  }));
  const atStart = await readReplay();
  check('回放起点只有种子节点', atStart.step === 0 && atStart.nodes >= 1, JSON.stringify({ nodes: atStart.nodes, step: atStart.step, total: atStart.total }));

  /*
   * 路径箭头（2026-10-15 改版）：从刚立住的卡片，一支细箭头指向下一步的目标。
   *
   * 这一段不只检查「画出来一支箭头」，而是检查四件容易做砸的事：
   * 1. 它**指对了地方**——把目的地卡片的布局坐标记下来，走一步，再看那里是不是真的长出节点；
   *    这样「箭头只是装饰」的实现会直接红。
   * 2. 它**很细**——一条 1.6px 的主干 + 12px 的小箭镞，而不是上一版那束中段 11–30 世界单位宽的丝带
   *    （`.stage-silk` 必须一个都不剩，否则说明旧形状还在）；
   * 3. 它**记得住顺序**——走过的每一步各留一支，步号就是学习顺序（数字挂在曲线上）；
   * 4. 它**在长**——最新那一支从源头画出来（`stage-arrow-grow`），箭镞比主干晚一步落下。
   */
  const readArrows = () => page.evaluate(() => {
    const arrows = [...document.querySelectorAll('.stage-arrow')];
    const target = document.querySelector('.network-stage-target');
    const match = /translate\((-?[\d.]+),\s*(-?[\d.]+)\)/.exec(target?.getAttribute('transform') ?? '');
    const scale = Number(document.querySelector('[data-zoom]')?.dataset.zoom ?? 0);
    const current = document.querySelector('.stage-arrow.is-current');
    const currentLine = current?.querySelector('.stage-arrow-line');
    const currentHead = current?.querySelector('.stage-arrow-head');
    return {
      count: arrows.length,
      steps: arrows.map((arrow) => Number(arrow.dataset.step)),
      previewSteps: arrows.filter((arrow) => arrow.dataset.preview === '1').map((arrow) => Number(arrow.dataset.step)),
      badgeText: arrows.map((arrow) => arrow.querySelector('.stage-arrow-badge text')?.textContent ?? ''),
      bindings: arrows.map((arrow) => [arrow.dataset.source, arrow.dataset.target]),
      /** 主干在**屏幕上**的粗细：几何按 1/scale 换算，因此这里应当恒为 1.6px 上下。 */
      lineWidthsPx: arrows.map((arrow) => Number(arrow.querySelector('.stage-arrow-line')?.getAttribute('stroke-width') ?? 0) * scale),
      headLenPx: arrows.map((arrow) => {
        const line = arrow.querySelector('.stage-arrow-line');
        const head = arrow.querySelector('.stage-arrow-head');
        if (!line || !head) return 0;
        const box = head.getBBox();
        return Math.max(box.width, box.height) * scale;
      }),
      headClosed: arrows.every((arrow) => /^M .+ Z$/.test(arrow.querySelector('.stage-arrow-head')?.getAttribute('d') ?? '')),
      silkCount: document.querySelectorAll('.stage-silk, .stage-silk-strand').length,
      currentAnimation: currentLine ? getComputedStyle(currentLine).animationName : null,
      currentDashOffset: currentLine ? parseFloat(getComputedStyle(currentLine).strokeDashoffset) || 0 : null,
      currentLength: currentLine ? parseFloat(getComputedStyle(currentLine).getPropertyValue('--arrow-len')) || 0 : 0,
      headAnimation: currentHead ? getComputedStyle(currentHead).animationName : null,
      flowAnimation: current ? getComputedStyle(current.querySelector('.stage-arrow-flow')).animationName : null,
      /** 目的地卡片自带「下一步」徽标与节点名。 */
      targetBadge: target?.querySelector('.network-stage-target-badge')?.textContent?.trim() ?? '',
      targetTitle: target?.querySelector('.network-stage-target-title')?.textContent?.trim() ?? '',
      targetPos: match ? { x: Number(match[1]), y: Number(match[2]) } : null,
      /** 当前这一支的源头卡片：高亮圈数应当恰好是 1。 */
      sourceRings: document.querySelectorAll('.network-node.path-source').length,
      /** 已经画出来的节点的布局位置，用来核对「箭头指的下一步真的在那儿长出来」。 */
      nodePositions: [...document.querySelectorAll('.network-node')].map((node) => node.getAttribute('transform')),
    };
  });

  const startArrows = await readArrows();
  check('回放出现路径箭头，且旧的多股丝带已经不存在',
    startArrows.count >= 1 && startArrows.silkCount === 0,
    JSON.stringify({ arrows: startArrows.count, silk: startArrows.silkCount }));
  check('箭头很细：主干在屏幕上 1.6px 上下、箭镞 12px 上下',
    startArrows.lineWidthsPx.length > 0 && startArrows.lineWidthsPx.every((width) => width > 1 && width <= 2.2)
      && startArrows.headLenPx.every((length) => length > 6 && length <= 16),
    JSON.stringify({ widths: startArrows.lineWidthsPx, heads: startArrows.headLenPx }));
  check('箭镞是闭合的小轮廓（不是一团填充）', startArrows.headClosed);
  check('起点上只有一支箭头，步号从 1 开始', startArrows.steps[0] === 1 && startArrows.badgeText[0] === '1',
    JSON.stringify({ steps: startArrows.steps, badges: startArrows.badgeText }));
  check('最新那一支在生长（主干按长度画出来 + 箭镞随后落下 + 一道高光在跑）',
    startArrows.currentAnimation === 'stage-arrow-grow' && startArrows.headAnimation === 'stage-arrow-head-in'
      && startArrows.flowAnimation === 'stage-arrow-flow',
    JSON.stringify({ line: startArrows.currentAnimation, head: startArrows.headAnimation, flow: startArrows.flowAnimation }));
  check('目的地卡片带「下一步」徽标与节点名',
    startArrows.targetBadge === '下一步' && startArrows.targetTitle.length > 0,
    JSON.stringify({ badge: startArrows.targetBadge, title: startArrows.targetTitle }));
  check('源卡片被高亮（这一步从哪张卡片来）', startArrows.sourceRings === 1, String(startArrows.sourceRings));

  // 走一步：箭头预告的那个位置必须真的长出节点来，而且走过的箭头要**留住**。
  await page.click('.replay-controls button[aria-label="下一步"]');
  /*
   * 生长动画只有 720ms，所以中间态必须在**刚走完这一步**的那一小段里采：
   * 等页面静下来再读，dashoffset 早已是 0——那时「有没有动画」这件事已经无从分辨。
   */
  await page.waitForTimeout(140);
  const midGrowth = await readArrows();
  check('生长动画有时间中间态（不是一步到位）',
    midGrowth.currentDashOffset > 0 && midGrowth.currentDashOffset <= midGrowth.currentLength + 1,
    JSON.stringify({ offset: midGrowth.currentDashOffset, length: midGrowth.currentLength }));
  await page.waitForTimeout(700);
  const afterStep = await readArrows();
  const promised = `translate(${startArrows.targetPos.x},${startArrows.targetPos.y})`;
  const laidDown = afterStep.nodePositions.some((transform) => transform?.replace(/\s+/g, '') === promised.replace(/\s+/g, ''));
  check('箭头预告的下一步真的在那个位置长出了节点', laidDown, JSON.stringify({ promised, positions: afterStep.nodePositions.length }));
  check('来源与目标随状态推进改换',
    afterStep.targetPos && (afterStep.targetPos.x !== startArrows.targetPos.x || afterStep.targetPos.y !== startArrows.targetPos.y),
    JSON.stringify({ from: startArrows.targetPos, to: afterStep.targetPos }));
  check('走过的那一支被留住（第 1 步的箭头没被后一支顶掉）',
    afterStep.steps[0] === 1 && afterStep.steps.length === startArrows.steps.length + 1,
    JSON.stringify({ before: startArrows.steps, after: afterStep.steps }));
  check('步号按学习顺序编号，只有末尾那一支是预告',
    afterStep.steps.every((step, index) => step === index + 1)
      && afterStep.previewSteps.length === 1 && afterStep.previewSteps[0] === afterStep.steps.at(-1),
    JSON.stringify({ steps: afterStep.steps, previews: afterStep.previewSteps }));
  check('留下的那一支不再是「正在长」的那一支（生长动画跟着最新那支走）',
    afterStep.badgeText.includes('1'), JSON.stringify(afterStep.badgeText));

  /*
   * 路径箭头要**绕开关系边**（2026-10-15，用户截图里的问题）。
   *
   * 判据是「中段并行重叠」：把箭头与每条边都采样成折线，数箭头中段（25%–75%）
   * 有多少采样点落在某条边的 3px 之内——这正是「路径箭头和逻辑关系挤在同一条走廊里」的量。
   * 同一支箭头的**直线走法**作为基线：新规则至少不能比它差，而且要真的更松。
   * 另外量一下弓高：一条笔直的箭头说明「往外扩散」根本没生效。
   */
  const readArrowEdgeOverlap = () => page.evaluate(() => {
    const scale = Number(document.querySelector('[data-zoom]')?.dataset.zoom ?? 0);
    const sample = (path, count) => {
      const length = path.getTotalLength();
      return Array.from({ length: count + 1 }, (_, index) => {
        const point = path.getPointAtLength((length * index) / count);
        return { x: point.x, y: point.y, t: index / count };
      });
    };
    const segmentDistance = (point, a, b) => {
      const dx = b.x - a.x; const dy = b.y - a.y;
      const squared = dx * dx + dy * dy;
      const t = squared > 1e-9 ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / squared)) : 0;
      return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
    };
    const edges = [...document.querySelectorAll('.network-edge')].map((edge) => sample(edge, 30));
    const arrows = [...document.querySelectorAll('.stage-arrow-line')].map((line) => sample(line, 40));
    const overlapRatio = (points) => {
      const middle = points.filter((point) => point.t >= 0.25 && point.t <= 0.75);
      let hit = 0;
      for (const point of middle) {
        let near = Infinity;
        for (const edge of edges) {
          for (let index = 0; index < edge.length - 1; index += 1) near = Math.min(near, segmentDistance(point, edge[index], edge[index + 1]));
        }
        if (near * scale < 3) hit += 1;
      }
      return middle.length ? hit / middle.length : 0;
    };
    let bowPx = 0;
    const rows = arrows.map((arrow) => {
      const first = arrow[0]; const last = arrow[arrow.length - 1];
      const straight = arrow.map((_, index) => {
        const t = index / (arrow.length - 1);
        return { x: first.x + (last.x - first.x) * t, y: first.y + (last.y - first.y) * t, t };
      });
      bowPx = Math.max(bowPx, segmentDistance(arrow[Math.floor(arrow.length / 2)], first, last) * scale);
      return { overlap: overlapRatio(arrow), straight: overlapRatio(straight) };
    });
    const mean = (key) => (rows.length ? rows.reduce((sum, row) => sum + row[key], 0) / rows.length : 0);
    return { arrows: rows.length, edges: edges.length, overlap: +mean('overlap').toFixed(3), straight: +mean('straight').toFixed(3), maxBowPx: Math.round(bowPx) };
  });
  await page.click('.replay-controls button[aria-label="到终点"]');
  await page.waitForTimeout(900);
  const avoidance = await readArrowEdgeOverlap();
  check('路径箭头不再与关系边并排挤在同一条走廊里（中段重叠率低于直线走法）',
    avoidance.arrows >= 2 && avoidance.overlap < avoidance.straight,
    JSON.stringify(avoidance));
  check('箭头确实往外扩散（存在明显弓高）', avoidance.maxBowPx >= 16, JSON.stringify(avoidance));

  await page.click('.replay-controls button[aria-label="回到起点"]');
  await page.waitForTimeout(400);

  // 逐步推进：节点与边必须单调不减，且至少在某一步真的增加（否则不叫「扩张」）。
  const walk = [];
  const arrowCounts = [];
  for (let index = 0; index < atStart.total; index += 1) {
    await page.click('.replay-controls button[aria-label="下一步"]');
    await page.waitForTimeout(420);
    walk.push(await readReplay());
    arrowCounts.push((await readArrows()).steps);
  }
  const monotone = walk.every((frame, index) => index === 0
    || (frame.nodes >= walk[index - 1].nodes && frame.edges >= walk[index - 1].edges));
  check('回放逐步向外扩张且不回头', monotone && walk[walk.length - 1].nodes > walk[0].nodes,
    JSON.stringify(walk.map((f) => `${f.step}:${f.nodes}/${f.edges}`)));
  check('回放每一步说明加入了什么', walk.every((frame) => frame.chips.length >= 1 || frame.nodes === walk[0].nodes),
    JSON.stringify(walk.map((f) => f.chips)));
  check('回放内容不被控制台遮住', walk.every((frame) => frame.contentBottom <= frame.panelTop + 1),
    JSON.stringify(walk.map((f) => ({ 内容底: f.contentBottom, 卡片底: f.cardBottom, 面板顶: f.panelTop, 面板高: f.panelH, 缩放: f.scale }))));
  check('箭头随步数单调增加（每一步都留下一支，走过的不会被顶掉）',
    arrowCounts.every((steps, index) => steps.length >= (arrowCounts[index - 1]?.length ?? 0)
      && steps.every((step, position) => step === position + 1)),
    JSON.stringify(arrowCounts.map((steps) => steps.length)));

  // 走到最后一步就没有「下一阶段」了：预告箭头与目的地卡片都必须消失，而不是指着不存在的节点。
  // 高亮跟着最后那一支走（它标记的是「最后这一步从哪儿来」），因此这里仍然是 1 圈而不是 0。
  const endArrows = await readArrows();
  check('最后一步不再有预告箭头，但走过的全部留着',
    endArrows.previewSteps.length === 0 && endArrows.sourceRings === 1
      && endArrows.count === endArrows.steps.length && endArrows.steps.every((step, index) => step === index + 1),
    JSON.stringify({ steps: endArrows.steps, previews: endArrows.previewSteps, rings: endArrows.sourceRings }));

  // 进度条可以直接跳步：这才是「可调状态」的判据，而不是只能顺序播放。
  await page.locator('.replay-slider').evaluate((element) => {
    element.value = '1';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(450);
  const jumped = await readReplay();
  check('进度条可直接跳到任意步', jumped.step === 1, JSON.stringify({ step: jumped.step }));

  // 回到起点与退出回放
  await page.click('.replay-controls button[aria-label="回到起点"]');
  await page.waitForTimeout(400);
  check('可回到起点', (await readReplay()).step === 0);
  await page.click('text=退出手势回放，自由浏览');
  await page.waitForTimeout(700);
  check('退出回放后回到自由浏览', (await page.locator('.replay-panel').count()) === 0);
  check('退出回放不残留回放参数', !(await page.url()).includes('play=1'));

  await page.goto(server.origin + '/profile?tab=advanced', { waitUntil: 'networkidle' });
  await page.fill('.inline-form input', '浏览器测试档案');
  await page.click('text=新建档案');
  await page.waitForTimeout(700);
  check('档案创建并选中', (await page.locator('.profile-list li.selected').count()) === 1);
  await page.click('text=追加事件');
  await page.waitForTimeout(700);
  check('事件写入时间线', (await page.locator('.data-table tbody tr').count()) >= 1);

  /*
   * 草稿归属：笔记与作答按「档案 + 节点」隔离。
   *
   * 这一步抓的是真实缺陷：早期实现的编辑器状态留在组件里，切换节点后旧文字仍在，
   * 点保存就会把上一个节点的内容写到新节点名下。断言既查界面隔离，也查提交请求里的 nodeId。
   */
  const draftNodeA = 'limit:limit-ed';
  const draftNodeB = 'limit:limit-seq';
  const profileBefore = await page.evaluate(async () => (await (await fetch('/api/v2/profiles')).json()).data.profiles.map((p) => ({ id: p.id, name: p.name })));
  const otherProfile = await jsonCall(server.origin, '/api/v2/profiles', { method: 'POST', body: { name: '草稿隔离档案', kind: 'personal' } });
  await page.goto(server.origin + '/nodes/' + encodeURIComponent(draftNodeA), { waitUntil: 'networkidle' });
  await page.waitForSelector('.note-editor textarea');
  await page.fill('.note-editor textarea', 'A 节点未保存草稿');
  await page.goto(server.origin + '/nodes/' + encodeURIComponent(draftNodeB), { waitUntil: 'networkidle' });
  await page.waitForSelector('.note-editor textarea');
  const leakedDraft = await page.inputValue('.note-editor textarea');
  check('切换节点后不带着上一节点的笔记草稿', leakedDraft === '', JSON.stringify(leakedDraft));
  await page.fill('.note-editor textarea', 'B 节点草稿');
  await page.goto(server.origin + '/nodes/' + encodeURIComponent(draftNodeA), { waitUntil: 'networkidle' });
  await page.waitForSelector('.note-editor textarea');
  check('回到原节点恢复自己的草稿', (await page.inputValue('.note-editor textarea')) === 'A 节点未保存草稿');
  await page.selectOption('#profile-select', otherProfile.payload.data.profile.id);
  await page.waitForTimeout(300);
  check('切换档案后草稿不跟随', (await page.inputValue('.note-editor textarea')) === '');
  await page.selectOption('#profile-select', profileBefore[0].id);
  await page.waitForTimeout(300);
  check('切回档案恢复自己的草稿', (await page.inputValue('.note-editor textarea')) === 'A 节点未保存草稿');
  let savedNoteBody = null;
  const noteRoute = async (route) => { savedNoteBody = JSON.parse(route.request().postData()); await route.continue(); };
  await page.route('**/api/v2/profiles/*/notes', noteRoute);
  await page.click('.note-editor button:has-text("保存笔记")');
  await page.waitForTimeout(700);
  check('保存请求携带当前节点而非上一个节点', savedNoteBody?.nodeId === draftNodeA, JSON.stringify(savedNoteBody));
  check('保存后编辑框清空', (await page.inputValue('.note-editor textarea')) === '');
  await page.unroute('**/api/v2/profiles/*/notes', noteRoute);

  /*
   * 维护材料现在在「网站维护」（用户要求把原研究台的内容迁走）。
   * 这里跟着搬迁改路径，并且先切到「专稿覆盖」标签——默认标签是新的「专稿与 arXiv」清单。
   */
  await page.goto(server.origin + '/maintenance', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.click('.tabs button:has-text("专稿覆盖")');
  await page.waitForSelector('.data-table tbody tr');
  check('覆盖清单渲染', (await page.locator('.data-table tbody tr').count()) >= 10);
  await page.click('text=局部化 LC01–36');
  await page.waitForSelector('.lc-card');
  check('36 个局部化算子卡片', (await page.locator('.lc-card').count()) === 36);
  await page.locator('.lc-card').first().locator('button').click();
  await page.waitForTimeout(800);
  check('局部化运行结果', (await page.locator('.lc-result').count()) >= 1);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(server.origin + '/', { waitUntil: 'networkidle' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('窄屏无横向溢出', overflow <= 2, 'overflow=' + overflow);
  // 规划页曾经在 390px 下被目标下拉框撑到 545px：核心表单必须能整屏放下。
  await page.goto(server.origin + '/plan?goal=' + encodeURIComponent('limit:bridge'), { waitUntil: 'networkidle' });
  await page.waitForSelector('.plan-form');
  const planOverflow = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    widestControl: Math.max(...[...document.querySelectorAll('.plan-form select, .plan-form input')].map((e) => Math.round(e.getBoundingClientRect().width))),
    formWidth: Math.round(document.querySelector('.plan-form').getBoundingClientRect().width),
  }));
  check('窄屏规划表单不撑宽页面', planOverflow.overflow <= 2 && planOverflow.widestControl <= planOverflow.formWidth,
    JSON.stringify(planOverflow));
  check('窄屏规划页目标在首屏附近', (await page.evaluate(() => document.querySelector('.plan-form').getBoundingClientRect().top + scrollY)) < 1200);
  check('窄屏保留主导航', (await page.locator('.nav-item:not(.secondary)').count()) === 6);
  // 主导航顺序是产品决定：知识网络在学习路线之前（先看清结构，再定路线）。
  const navOrder = await page.locator('.nav-item:not(.secondary) .nav-label').allInnerTexts();
  check('主导航順序包含我的笔记库，知识网络仍先于学习路线',
    JSON.stringify(navOrder.map((label) => label.trim())) === JSON.stringify(['开始学习', '数学对象', '知识网络', '学习路线', '我的笔记库', '我的学习']),
    JSON.stringify(navOrder));

  // ---- 学习闭环 ----
  // 档案已在上面创建并选中（存在 localStorage 里，整页跳转后仍然有效）。
  await page.setViewportSize({ width: 1440, height: 1000 });

  // 形式负载：核心定义必须按数学排版，而不是塞在 <code> 里。
  await page.goto(server.origin + '/nodes/' + encodeURIComponent('limit:limit-ed'), { waitUntil: 'networkidle' });
  await page.waitForSelector('.formal-load');
  const formalMath = await page.evaluate(() => {
    const row = [...document.querySelectorAll('.formal-load > div')].find((item) => item.querySelector('dt')?.innerText === '谓词');
    return { found: Boolean(row), katex: row?.querySelectorAll('.katex').length ?? 0 };
  });
  check('形式负载的谓词按公式排版', formalMath.found && formalMath.katex > 0, JSON.stringify(formalMath));
  check('节点页显示证据等级', (await page.locator('.node-header .badge').count()) >= 2);
  check('节点页显示来源', (await page.locator('.provenance-list li').count()) >= 1);
  check('表征内容已渲染', (await page.locator('.representation-list li').count()) >= 1);

  await page.goto(server.origin + '/start', { waitUntil: 'networkidle' });
  await page.waitForSelector('.continue-card');
  check('开始学习页出现继续学习区块', (await page.locator('.continue-card').count()) === 1);
  const continueHref = await page.locator('.continue-card a.button').first().getAttribute('href');
  check('继续学习给出具体下一步链接', Boolean(continueHref && continueHref.startsWith('/nodes/')), String(continueHref));
  // 回访者的顺序：继续学习在原型问题之前；邻域网络默认折叠。
  const homeOrder = await page.evaluate(() => ({
    continueTop: document.querySelector('.continue-card')?.getBoundingClientRect().top ?? 1e9,
    casesTop: document.querySelector('#cases')?.getBoundingClientRect().top ?? 1e9,
    networkOpen: document.querySelector('.continue-network-details')?.open ?? null,
  }));
  check('回访时先给下一步', homeOrder.continueTop < homeOrder.casesTop, JSON.stringify(homeOrder));
  check('邻域网络默认折叠', homeOrder.networkOpen === false, JSON.stringify(homeOrder));
  await page.locator('.continue-network-details > summary').click();
  await page.waitForTimeout(500);

  // ---- 「继续学习」升级为局部网络视图：中心 + 按话题分方向 ----
  const continueView = await page.evaluate(() => {
    const svg = document.querySelector('.continue-network svg');
    if (!svg) return { present: false };
    const vb = (svg.getAttribute('viewBox') ?? '').split(' ').map(Number);
    const rects = [...document.querySelectorAll('.continue-neighbor rect')].map((r) => ({
      x: +r.getAttribute('x'), y: +r.getAttribute('y'), w: +r.getAttribute('width'), h: +r.getAttribute('height'),
    }));
    let inside = 0;
    let overlap = 0;
    for (const b of rects) if (b.x >= 0 && b.y >= 0 && b.x + b.w <= vb[2] && b.y + b.h <= vb[3]) inside += 1;
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const a = rects[i];
        const c = rects[j];
        if (a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h) overlap += 1;
      }
    }
    const dirs = [...document.querySelectorAll('.continue-direction-label')].map((t) => t.textContent);
    const usedDirections = [...new Set([...document.querySelectorAll('.continue-neighbor')].map((g) => g.getAttribute('data-direction')))];
    return {
      present: true,
      center: document.querySelector('.continue-center-node title')?.textContent ?? '',
      neighbors: rects.length,
      inside,
      overlap,
      dirs,
      usedDirections,
      bases: [...new Set([...document.querySelectorAll('.continue-neighbor')].map((g) => g.getAttribute('data-basis')))],
      links: document.querySelectorAll('.continue-network-list li').length,
      vb: [Math.round(vb[2]), Math.round(vb[3])],
    };
  });
  check('继续学习有局部网络视图', continueView.present, JSON.stringify(continueView));
  check('中心是上次学习的节点', /上次学习：/.test(continueView.center), continueView.center);
  check('画出强关联邻居', continueView.neighbors >= 1, JSON.stringify(continueView));
  check('邻居卡片全部在画布内', continueView.inside === continueView.neighbors, JSON.stringify(continueView));
  check('邻居卡片不重叠', continueView.overlap === 0, JSON.stringify(continueView));
  /*
   * 方向标签：**每个话题组一条**，方向只取上/右/下/左。
   *
   * 话题数超过 4 时方向会环形复用（`continue-network.ts` 的方向分配规则 3），
   * 因此标签条数**大于**不同方向数——2026-10 加入第八个案例「点集拓扑」的 4 个话题块之后，
   * 这个中心的话题数从 3 变成 7，第一版断言（标签数 === 不同方向数）就不成立了。
   * 断言改成设计实际保证的两件事：标签方向合法，且每条标签都是「方向 · 话题」形式。
   */
  check('方向标签只用上右下左，且每个话题组一条',
    continueView.dirs.length >= continueView.usedDirections.length
      && continueView.dirs.every((d) => /^[上右下左] · .+/.test(d)),
    JSON.stringify(continueView.dirs));
  check('关联依据来自本体（关系或契约）', continueView.bases.some((b) => b === 'relation' || b === 'contract'), JSON.stringify(continueView.bases));
  check('视图配有可点的节点列表', continueView.links === continueView.neighbors, JSON.stringify(continueView));

  // 列表里的每个邻居都是可达的节点页入口。
  // 注意：点它会导航离开首页，因此「切换中心」这一交互在导航下不可观察——
  // 这里只断言链接指向正确的节点页（这是学习者实际要用到的行为）。
  const firstNeighbor = page.locator('.continue-network-list li a').first();
  const neighborHref = await firstNeighbor.getAttribute('href');
  check('邻居列表指向节点页', Boolean(neighborHref && neighborHref.startsWith('/nodes/')), String(neighborHref));
  await firstNeighbor.click();
  await page.waitForLoadState('networkidle');
  check('点邻居能到达该节点页', decodeURIComponent(page.url()).includes(decodeURIComponent(neighborHref)), `${neighborHref} → ${page.url()}`);

  // ---- 原型问题：按领域归类 + 卡片内容由本体派生（在开始学习页） ----
  await page.goto(server.origin + '/start', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  const prototype = await page.evaluate(() => {
    const sections = [...document.querySelectorAll('.discipline-section')].map((section) => ({
      title: section.querySelector('.discipline-head h3')?.textContent ?? '',
      meta: section.querySelector('.discipline-meta')?.textContent ?? '',
      cases: [...section.querySelectorAll('.case-card')].map((card) => ({
        title: card.querySelector('.case-eyebrow')?.textContent ?? '',
        countText: card.querySelector('.case-node-count')?.textContent ?? '',
        embryo: card.querySelector('.case-embryo')?.textContent ?? '',
        disciplines: [...card.querySelectorAll('.case-disciplines li')].map((li) => li.textContent ?? ''),
        constructs: [...card.querySelectorAll('.case-constructs li')].length,
        stats: card.querySelector('.case-stats')?.textContent ?? '',
        actions: [...card.querySelectorAll('.card-actions a')].map((a) => a.getAttribute('href') ?? ''),
      })),
    }));
    const cards = sections.flatMap((section) => section.cases);
    return {
      headings: [...document.querySelectorAll('.section-heading h2')].map((h) => h.textContent),
      sections,
      cardCount: cards.length,
      allHaveEmbryo: cards.every((card) => card.embryo.includes('胚子')),
      allHaveDisciplines: cards.every((card) => card.disciplines.length >= 1),
      allHaveConstructs: cards.every((card) => card.constructs >= 3),
      allHaveStats: cards.every((card) => /行动契约/.test(card.stats) && /登记关系/.test(card.stats)),
      allHaveThreeActions: cards.every((card) => card.actions.length === 3),
      // 节点数是活的：卡片上的数字必须与本体里该 case 的节点数一致。
      counts: cards.map((card) => Number((card.countText.match(/\d+/) ?? ['0'])[0])),
      literalCaret: document.body.innerText.includes('C^'),
      katex: document.querySelectorAll('.case-eyebrow .katex').length,
    };
  });
  check('原型问题栏目存在', prototype.headings.includes('从原型问题进入'), JSON.stringify(prototype.headings));
  check('原型问题按领域分组', prototype.sections.length >= 3, JSON.stringify(prototype.sections.map((s) => s.title)));
  check('每组标出思路数与节点数', prototype.sections.every((s) => /\d+\s*条思路/.test(s.meta) && /\d+\s*个节点/.test(s.meta)), JSON.stringify(prototype.sections.map((s) => s.meta)));
  check('六个案例都在且只出现一次', prototype.cardCount === 6, `实际 ${prototype.cardCount} 张卡`);
  check('每张卡给出「胚子」', prototype.allHaveEmbryo);
  check('每张卡列出学科分布', prototype.allHaveDisciplines);
  check('每张卡列出构造分布', prototype.allHaveConstructs);
  check('每张卡给出行动与关系计数', prototype.allHaveStats);
  check('每张卡有三个入口（阅读/路线/全部节点）', prototype.allHaveThreeActions);
  // 节点数必须与本体一致：从接口取真值比对，防止卡片写死数字后与数据脱节。
  const caseCounts = await page.evaluate(async () => {
    const graph = await (await fetch('/api/v2/ontology/graph')).json();
    /*
     * 按**登记归属**计数：合并后的规范节点可能登记在多个案例里（`cases`，见 `data/merges.mjs`），
     * 首页案例卡片走的是同一条口径（`describeCase` 用 `cases` 筛）。按 `case` 数会让
     * 微分几何卡片比本体少 7 —— 那不是卡片写错，是两边口径不一致。
     */
    const tally = {};
    for (const node of graph.data.nodes) {
      for (const caseId of node.cases ?? [node.case]) tally[caseId] = (tally[caseId] ?? 0) + 1;
    }
    return tally;
  });
  const expectedCounts = ['limit', 'manifold', 'tensor', 'group', 'dg', 'top'].map((id) => caseCounts[id]).sort((a, b) => a - b);
  check('卡片节点数与本体一致', JSON.stringify([...prototype.counts].sort((a, b) => a - b)) === JSON.stringify(expectedCounts),
    `卡片 ${JSON.stringify([...prototype.counts].sort((a, b) => a - b))} vs 本体 ${JSON.stringify(expectedCounts)}`);
  check('含数学记号的标题按公式排版', prototype.katex >= 1, `katex ${prototype.katex}`);
  check('页面上没有字面 C^', prototype.literalCaret === false);

  // 标记已读：写入 E，且明确不表示理解或掌握。
  const readNode = 'limit:limit-ed';
  await page.goto(server.origin + '/nodes/' + encodeURIComponent(readNode), { waitUntil: 'networkidle' });
  await page.waitForSelector('.learner-actions');
  check('节点页有学习者操作区', (await page.locator('.learner-actions').count()) >= 1);
  check('自检任务可作答', (await page.locator('.self-check textarea').count()) >= 1);
  // 节点页顶部与底部各有一处操作区（长页面两端可达），断言统一限定到第一处。
  const actionsTop = page.locator('.learner-actions').first();
  await actionsTop.locator('button:has-text("标记已读")').click();
  await page.waitForTimeout(1200);
  check('标记已读后状态可见', (await actionsTop.locator('.learner-action-state .badge').count()) >= 1);
  check('标记已读给出不表示掌握的说明', (await actionsTop.locator('.notice').innerText()).includes('不表示理解或掌握'));

  // 幂等：重复标记不应使计数增长。（进度条现在在「开始学习」页。）
  const readCountOnHome = async () => {
    await page.goto(server.origin + '/start', { waitUntil: 'networkidle' });
    await page.waitForSelector('.progress-facts');
    const text = await page.locator('.progress-facts').innerText();
    return Number(text.split('\n')[1]);
  };
  const readOnce = await readCountOnHome();
  await page.goto(server.origin + '/nodes/' + encodeURIComponent(readNode), { waitUntil: 'networkidle' });
  await page.waitForSelector('.learner-actions');
  check('已读节点不能重复标记', await page.locator('.learner-actions').first().locator('button:has-text("已标记已读")').isDisabled());
  const readTwice = await readCountOnHome();
  check('重复标记不重复计数', readOnce === readTwice, readOnce + ' -> ' + readTwice);

  // 我还不懂：修复前会报「未知事件类型 unknown」。
  const notUnderstoodNode = 'limit:bridge';
  await page.goto(server.origin + '/nodes/' + encodeURIComponent(notUnderstoodNode), { waitUntil: 'networkidle' });
  await page.waitForSelector('.learner-actions');
  await page.locator('.learner-actions').first().locator('button:has-text("我还不懂")').click();
  await page.waitForTimeout(1300);
  const notUnderstoodError = await page.locator('.learner-actions .error').count();
  check('标记尚未理解不再报错', notUnderstoodError === 0, await page.locator('.learner-actions .error').first().innerText().catch(() => ''));

  // 回看队列：/review 是「我的学习 · 待回看」的旧地址，必须仍然可用。
  await page.goto(server.origin + '/review', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  check('/review 定位到我的学习', (await page.locator('h1').first().innerText()).includes('我的学习'));
  check('待回看标签被选中', (await page.locator('.tab[aria-selected="true"]').innerText()).includes('待回看'));
  check('待回看列出已读未懂节点', (await page.locator('.review-list li').count()) >= 1);
  check('回看动作分为开始回看与完成', (await page.locator('.review-list li a:has-text("开始回看")').count()) >= 1
    && (await page.locator('.review-list li button:has-text("完成本次回看")').count()) >= 1);
  await page.locator('.review-list li button:has-text("完成本次回看")').first().click();
  await page.waitForTimeout(1300);
  check('完成回看后次数增加', (await page.locator('.review-list').innerText()).includes('已回看 1 次'));

  // 研究台移出主导航但仍可达
  await page.goto(server.origin + '/lab', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  check('研究台仍在 /lab 可达（辅助导航里现在叫「前沿研究」）',
    (await page.locator('h1').first().innerText()).includes('研究台'));
  check('研究条目未进入主导航', (await page.locator('.nav-item:not(.secondary)[href$="/lab"], .nav-item:not(.secondary)[href$="/maintenance"]').count()) === 0);
  await page.goto(server.origin + '/maintenance', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  check('原研究台的维护材料搬到 /maintenance（网站维护）',
    (await page.locator('h1').first().innerText()).includes('网站维护'));

  await page.goto(server.origin + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('闭环改动后窄屏仍无横向溢出', mobileOverflow <= 2, 'overflow=' + mobileOverflow);

  await page.screenshot({ path: resolve(MCS_WEB_ROOT, 'tmp', 'browser-home.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });

  /*
   * 路径规划页的「范例路径」栏目（2026-10-13 第二版：压缩态 → 悬浮简介 → 点击展开）。
   *
   * 用户的要求是「这一栏太臃肿，改成压缩态、按学科选书、悬浮书名看简介、点击展开具体路径」。
   * 因此这一段按**用户真的会做的三步**来验收，而不是只看 DOM 里有没有元素：
   *
   * 1. 落地是压缩态：一程卡片一张都不渲染，只有学科行与书名按钮，且这一栏在规划表单之前；
   * 2. 鼠标悬浮书名，**这套路径的简介**出现（`page.hover()` 是真的移指针，能触发 `:hover`）；
   * 3. 点书名，**只有这一本的七程**就地展开；再点一次收起。
   *
   * 之后照旧端到端跑一遍：点「载入并规划这一程」，核对表单里的目标/事件界与服务端路线，
   * 并数一遍时间线上的事件数——卡片上写的事件数如果是假的，这里就会露馅。
   */
  await page.goto(server.origin + '/plan', { waitUntil: 'networkidle' });
  await page.waitForSelector('.example-hub');
  /* 学科分组要等本体到位（本体未到时组件如实显示「正在从本体读取学科分布……」）。 */
  await page.waitForFunction(() => document.querySelectorAll('.example-book').length >= 2, null, { timeout: 15000 });

  const compact = await page.evaluate(() => {
    const hub = document.querySelector('.example-hub');
    const form = document.querySelector('#plan-form');
    return {
      hubTop: hub?.getBoundingClientRect().top ?? null,
      formTop: form?.getBoundingClientRect().top ?? null,
      hubHeight: Math.round(hub?.getBoundingClientRect().height ?? 0),
      cards: document.querySelectorAll('.example-card').length,
      books: [...document.querySelectorAll('.example-book')].map((el) => el.textContent.replace(/\s+/g, ' ').trim()),
      disciplines: [...document.querySelectorAll('.example-discipline-head')].map((el) => el.textContent.replace(/\s+/g, ' ').trim()),
      expanded: document.querySelectorAll('.example-book[aria-expanded="true"]').length,
      introsVisible: [...document.querySelectorAll('.example-book-intro')].filter((el) => getComputedStyle(el).display !== 'none').length,
    };
  });
  check('范例路径在规划表单之前，且落地是压缩态（一张程卡片都不渲染）',
    Number.isFinite(compact.hubTop) && Number.isFinite(compact.formTop) && compact.hubTop < compact.formTop
      && compact.cards === 0 && compact.expanded === 0 && compact.introsVisible === 0,
    JSON.stringify(compact));
  check('压缩态按学科列出书名（不是把每条路径的程卡片平铺）',
    /*
     * 一个学科下可以有**不止一本**书：2026-10-14 起「线性代数」下并排站着
     * 《简明高等代数》与 Axler《Linear Algebra Done Right》。因此这里是
     * 「书 ≮ 学科」而不是「书 = 学科」——原来的等式在第四套进来的当天就红了。
     */
    compact.disciplines.length >= 2 && compact.books.length >= compact.disciplines.length
      && compact.books.every((book) => book.length > 0),
    JSON.stringify({ disciplines: compact.disciplines, books: compact.books }));

  /*
   * 每一本书归在哪个学科下：**《简明高等代数》必须是「线性代数」**。
   * 2026-10-13 用户截图里它被归到了「其他」——书单来自数据文件、分组名却只在
   * 本体节点里查得到，两边不同步时就会那样。现在统计拿不到东西时用声明主学科兜底。
   */
  const bookGroups = await page.evaluate(() => [...document.querySelectorAll('.example-discipline')].map((el) => ({
    heading: el.querySelector('.example-discipline-head')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
    books: [...el.querySelectorAll('.example-book-name')].map((book) => book.textContent.trim()),
  })));
  const jiangGroup = bookGroups.find((group) => group.books.some((name) => name.includes('简明高等代数')));
  check('《简明高等代数》归在「线性代数」下（不是「其他」）',
    Boolean(jiangGroup) && jiangGroup.heading.startsWith('线性代数'),
    JSON.stringify(bookGroups));

  // 悬浮书名 → 这套路径的简介**与它的取舍**出现（导语、学科分布、规模、特色/优点/代价）。
  const firstBook = page.locator('.example-book').first();
  await firstBook.hover();
  const intro = page.locator('.example-book-intro').first();
  await intro.waitFor({ state: 'visible', timeout: 5000 });
  const introText = (await intro.innerText()).replace(/\s+/g, ' ').trim();
  check('悬浮书名显示这套路径的简介（导语 + 学科分布 + 规模）',
    introText.length >= 60 && /学科分布/.test(introText) && /里程碑/.test(introText),
    introText.slice(0, 120));
  /*
   * 用户 2026-10-13 的要求：「悬停不要只显示路径的介绍，要把这样规划的优缺点和特色也写出来」。
   * 三块都要在、都要有真内容（各 ≥2 条），并且缩进里的 `**强调**` 要被渲染，不能漏出星号。
   */
  const introNotes = await intro.evaluate((el) => ({
    titles: [...el.querySelectorAll('.example-plan-note-title')].map((item) => item.textContent.trim()),
    bullets: [...el.querySelectorAll('.example-plan-note')].map((item) => item.querySelectorAll('li').length),
    texts: [...el.querySelectorAll('.example-plan-note li')].map((item) => item.textContent.trim()),
    rawAsterisks: el.textContent.includes('**'),
  }));
  check('悬浮卡里写出特色 / 优点 / 代价三块，且各有内容',
    introNotes.titles.length === 3
      && introNotes.titles.join('/') === '特色/优点/代价与局限'
      && introNotes.bullets.every((count) => count >= 2)
      && introNotes.texts.every((text) => text.length >= 10),
    JSON.stringify({ titles: introNotes.titles, bullets: introNotes.bullets }));
  check('利弊里的强调走 Markdown 渲染（不漏出星号）', introNotes.rawAsterisks === false);

  // 点书名 → 只有这一本的七程就地展开；再点一次收起。
  await firstBook.click();
  await page.waitForSelector('.example-book-paths .example-card');
  const expanded = await page.evaluate(() => {
    const open = document.querySelector('.example-book[aria-expanded="true"]');
    const paths = document.querySelector('.example-book-paths');
    const cards = [...(paths?.querySelectorAll('.example-card') ?? [])];
    return {
      openBook: open?.textContent.replace(/\s+/g, ' ').trim() ?? null,
      cards: cards.length,
      ids: cards.map((card) => card.getAttribute('data-example-id')),
      otherBooksOpen: document.querySelectorAll('.example-book[aria-expanded="true"]').length,
      hasSource: Boolean(paths?.querySelector('.example-source')),
      hasNote: Boolean(paths?.querySelector('.example-note')),
    };
  });
  check('点书名就地展开这一本的七程（同一时刻只开一本，并给出出处与边界说明）',
    expanded.cards === 7 && expanded.otherBooksOpen === 1 && expanded.hasSource && expanded.hasNote
      && expanded.ids.every((id) => typeof id === 'string' && id.length > 0),
    JSON.stringify({ openBook: expanded.openBook, cards: expanded.cards, hasSource: expanded.hasSource }));

  await firstBook.click();
  await page.waitForFunction(() => document.querySelectorAll('.example-card').length === 0, null, { timeout: 5000 }).catch(() => {});
  check('再点一次收起，回到压缩态', (await page.locator('.example-card').count()) === 0);

  /*
   * 展开要检查的那一本（《简明高等代数》），后面的端到端流程在它的卡片上跑。
   *
   * 定位到**书名元素**（`.example-book-name`），不按整张卡片 `hasText` 找：
   * 2026-10-14 起 Axler 那本的特色/局限里也写着「与《简明高等代数》同一口径」
   * 「SVD 与《简明高等代数》第七程登记为接口」，按卡片全文匹配会同时命中两本，
   * Playwright 的 strict 模式当场报「resolved to 2 elements」。书名是唯一的锚。
   */
  const bookByName = (name) => page.locator('.example-book-wrap')
    .filter({ has: page.locator('.example-book-name', { hasText: name }) });
  const targetBook = bookByName('简明高等代数').locator('.example-book');
  await targetBook.click();
  await page.waitForSelector('.example-book-paths .example-card');
  const exampleCards = page.locator('.example-book-paths .example-card');
  const exampleCount = await exampleCards.count();
  check('展开后这一本的七程都在', exampleCount === 7, String(exampleCount));
  const cardIds = await page.evaluate(() => [...document.querySelectorAll('.example-book-paths .example-card')]
    .map((card) => card.getAttribute('data-example-id')));
  check('展开的卡片都属于这一本（没有混进别的教材）',
    cardIds.every((id) => id.startsWith('jiang-jdga-')), JSON.stringify(cardIds));

  const firstCard = exampleCards.first();
  const firstFeature = await firstCard.locator('.example-feature').innerText();
  check('范例卡带特色简介', firstFeature.length >= 40, firstFeature.slice(0, 40));
  const firstFactText = await firstCard.locator('.example-facts').innerText();
  const declaredEvents = Number((firstFactText.match(/实测最短\s*(\d+)\s*个事件/) ?? [])[1] ?? NaN);
  const declaredHorizon = Number((firstFactText.match(/事件界\s*h\s*=\s*(\d+)/) ?? [])[1] ?? NaN);
  check('范例卡写明实测事件数与事件界', Number.isFinite(declaredEvents) && Number.isFinite(declaredHorizon), firstFactText.replace(/\n/g, ' '));
  check('范例卡列出里程碑', (await firstCard.locator('.example-highlights li').count()) >= 3);
  /*
   * 目标 id 从卡片上读，不写死某一本的 id：展开的是哪一本由这段流程决定，
   * 写死前缀会让「换一本验收」一改就红。要守的是「表单里的目标 = 卡片上的目标」。
   */
  const firstCardGoal = (await firstCard.locator('.example-facts code').first().innerText()).trim();

  await firstCard.locator('button:has-text("载入并规划这一程")').click();
  // 载入后事件界应当换成范例声明的值；这一步同时说明「载入」不是只改了个标题。
  await page.waitForFunction(
    (expected) => Number(document.querySelector('.plan-advanced input[type=number]')?.value) === expected,
    declaredHorizon,
    { timeout: 15000 },
  );
  check('载入范例写入了声明的事件界', true);
  const goalValue = await page.locator('.plan-form select').first().inputValue();
  check('载入范例改写了目标节点', goalValue === firstCardGoal, `${goalValue} vs ${firstCardGoal}`);
  const multiGoalNotice = await page.locator('.plan-form .notice').first().innerText().catch(() => '');
  check('多目标规划如实说明目标个数', /共\s*\d+\s*个目标/.test(multiGoalNotice), multiGoalNotice.slice(0, 60));
  // 起点里含前几程的成果，它们不在「可用背景」网格里，必须单独列全。
  check('起点清单列出了前几程的成果', (await page.locator('.example-entry-list li').count()) >= 1);
  await page.waitForSelector('.route-card', { timeout: 30000 });
  const exampleSteps = await page.locator('.route-card').first().locator('.event-timeline > li').count();
  check('范例载入后真的规划出了路线', exampleSteps === declaredEvents, `steps=${exampleSteps} declared=${declaredEvents}`);
  const summaryFacts = await page.locator('.plan-summary .facts').first().innerText();
  check('结果摘要显示目标个数', /（\d+ 个）/.test(summaryFacts), summaryFacts.replace(/\n/g, ' ').slice(0, 80));
  await page.screenshot({ path: resolve(MCS_WEB_ROOT, 'tmp', 'example-paths.png'), fullPage: false });

  /*
   * ---- 一键导入**整条**路径（2026-10-13 加）----
   *
   * 用户要的是「导入范例的**整体**路径」，不是一程一程自己接。这里按用户会做的动作验：
   *
   * 1. 在展开的那一本上点「一键导入整条路径」；
   * 2. 表单下面出现七程进度轨：第一程是「当前」，其余「未开始」；
   * 3. 点「下一程」：第二程变「当前」、第一程变「本次已载入」，表单里的目标跟着换；
   * 4. 结束整条路径 → 进度轨消失。
   */
  await page.evaluate(() => window.sessionStorage.removeItem('mcs-example-walk-v1'));
  /*
   * 七程各自的目标 id 从卡片上读（第一程就是上面那一段已经载入过的那一程）。
   * 写死 `jiang:field-axioms` 会让「换一本书验收」一改就红。
   */
  const stageGoals = await page.evaluate(() => [...document.querySelectorAll('.example-book-paths .example-card')]
    .map((card) => card.querySelector('.example-facts code')?.textContent.trim() ?? ''));
  /*
   * 「一键」= **不用先展开**：压缩态的选书行上每本书都有一个「整条路径」按钮。
   * 展开块里另有带说明的完整入口（`一键导入整条路径（七程）`）。
   *
   * 条数不写死：书从 3 本涨到 4 本（2026-10-14，Axler）时，写死的 3 会红，
   * 而要守的其实是「**每一本**都有入口」——因此拿书行数当基准。
   */
  const rowImports = page.locator('.example-book-import');
  const bookRows = await page.locator('.example-book').count();
  check('压缩态的每本书都有「整条路径」一键入口（不用先展开）',
    bookRows >= 3 && (await rowImports.count()) === bookRows
      && (await rowImports.first().innerText()).trim() === '整条路径',
    `${await rowImports.count()} 个入口 / ${bookRows} 本书`);
  check('展开的那一本另有带说明的完整入口',
    (await page.locator('.example-book-paths button', { hasText: '一键导入整条路径' }).count()) === 1
      && /从第一程开始/.test(await page.locator('.example-book-paths-hint').first().innerText()));
  const walkButton = bookByName('简明高等代数').locator('.example-book-import');
  await walkButton.click();
  await page.waitForSelector('.example-walk');
  const walkStart = await page.evaluate(() => ({
    heading: document.querySelector('.example-walk h2')?.textContent.trim() ?? '',
    stages: [...document.querySelectorAll('.example-walk-stage')].map((el) => el.className.replace('example-walk-stage ', '')),
    ordinals: [...document.querySelectorAll('.example-walk-ordinal')].map((el) => el.textContent.trim()),
    current: document.querySelector('.example-walk-stage.current .example-walk-state')?.textContent.trim() ?? '',
    metaRows: [...document.querySelectorAll('.example-walk-meta')].length,
    goal: document.querySelector('.plan-form select')?.value ?? '',
    session: JSON.parse(window.sessionStorage.getItem('mcs-example-walk-v1') ?? 'null'),
  }));
  check('一键导入整条路径：七程进度轨出现，第一程是「当前」',
    walkStart.stages.length === 7 && walkStart.stages[0] === 'current'
      && walkStart.stages.slice(1).every((state) => state === 'todo')
      && walkStart.ordinals[0] === '第一程' && walkStart.current === '当前'
      && walkStart.metaRows === 7,
    JSON.stringify({ stages: walkStart.stages, current: walkStart.current }));
  check('导入之后表单里是**第一程**的目标，并且本次会话记住了这一本',
    walkStart.goal === stageGoals[0] && walkStart.session?.setId === 'jiang-jdga'
      && walkStart.session?.visited?.length === 1,
    JSON.stringify({ goal: walkStart.goal, expected: stageGoals[0], session: walkStart.session }));

  const nextLabel = await page.locator('.example-walk .button.primary').innerText();
  check('「下一程」写清是哪一程', /下一程：第二程/.test(nextLabel), nextLabel);
  await page.locator('.example-walk .button.primary').click();
  await page.waitForFunction(
    () => document.querySelector('.example-walk-stage.current .example-walk-state')?.textContent.trim() !== '当前'
      || document.querySelectorAll('.example-walk-stage.visited').length >= 1,
    null,
    { timeout: 10000 },
  ).catch(() => {});
  await page.waitForTimeout(800);
  const walkNext = await page.evaluate(() => ({
    stages: [...document.querySelectorAll('.example-walk-stage')].map((el) => el.className.replace('example-walk-stage ', '')),
    labels: [...document.querySelectorAll('.example-walk-state')].map((el) => el.textContent.trim()),
    goal: document.querySelector('.plan-form select')?.value ?? '',
    session: JSON.parse(window.sessionStorage.getItem('mcs-example-walk-v1') ?? 'null'),
  }));
  check('点「下一程」推进到第二程，第一程记为「本次已载入」',
    walkNext.stages[0] === 'visited' && walkNext.stages[1] === 'current'
      && walkNext.labels[0] === '本次已载入' && walkNext.labels[1] === '当前'
      && walkNext.goal === stageGoals[1] && walkNext.session?.visited?.length === 2,
    JSON.stringify({ stages: walkNext.stages, labels: walkNext.labels, goal: walkNext.goal }));

  /*
   * ---- 多程合一图（2026-10-15 加）----
   *
   * 用户要求：「设置可以选择把一条范例路径的好多程放进一张节点网络视图里面」。
   * 按用户会做的动作验：勾两程 → 点「放进一张网络视图」→ 网络页里真的把两程接起来，
   * 控制台写明「这一步属于哪一程」，每一程的第一支箭头上有一圈环。
   *
   * 这一段在「整条路径」那一节**之后**跑：它要跳去网络页，跳走之后就回不到那次会话的进度轨了。
   */
  const stagePick = page.locator('.example-pick input');
  await stagePick.nth(0).check();
  await stagePick.nth(1).check();
  await page.waitForTimeout(150);
  const combineState = await page.evaluate(() => ({
    count: document.querySelector('.example-combine-count')?.textContent.trim() ?? '',
    picks: document.querySelectorAll('.example-pick input:checked').length,
    href: document.querySelector('.example-combine-go')?.getAttribute('href') ?? '',
    /*
     * 比**程名**而不是序数：卡片上写「第一程」（汉字），控制台里写「第 1 程」（阿拉伯数字），
     * 两者都对，但字符串不相等——按序数比会把一个正确的实现判红。
     */
    titles: [...document.querySelectorAll('.example-book-paths .example-card')]
      .map((card) => card.querySelector('h4, h5')?.textContent.trim() ?? ''),
  }));
  const combinePath = new URLSearchParams(combineState.href.split('?')[1] ?? '').get('path')?.split(',').filter(Boolean) ?? [];
  const combineEntry = new URLSearchParams(combineState.href.split('?')[1] ?? '').get('entry')?.split(',').filter(Boolean).length ?? 0;
  check('勾选两程后如实显示已选几程', combineState.picks === 2 && /2/.test(combineState.count), JSON.stringify(combineState.count));
  check('「放进一张网络视图」给出一条带程边界的回放链接',
    combineState.href.includes('play=1') && combineState.href.includes('stages=') && combinePath.length > 1
      && combineState.href.split('?')[1].includes('entry='),
    combineState.href.slice(0, 120));
  check('链接里的程边界是「两程」而不是凑出来的一程',
    (new URLSearchParams(combineState.href.split('?')[1] ?? '').get('stages') ?? '').split(',').length === 2,
    combineState.href.slice(0, 160));

  await page.locator('.example-combine-go').click();
  await page.waitForSelector('.replay-panel', { timeout: 20000 });
  await page.waitForTimeout(900);
  const combined = await page.evaluate(() => ({
    total: Number(document.querySelector('.replay-slider')?.getAttribute('max') ?? -1),
    stageItems: [...document.querySelectorAll('.replay-stage-item')].map((el) => el.textContent.replace(/\s+/g, ' ').trim()),
    arrows: document.querySelectorAll('.stage-arrow').length,
  }));
  check('网络页把两程接成一条回放（步数 = 链接里的节点数）',
    combined.total === combinePath.length && combined.total > 1,
    JSON.stringify({ total: combined.total, path: combinePath.length }));
  check('控制台列全这张视图里的各程', combined.stageItems.length === 2
    && combined.stageItems[0].includes(combineState.titles[0]) && combined.stageItems[1].includes(combineState.titles[1]),
    JSON.stringify({ items: combined.stageItems, titles: combineState.titles }));

  // 走到终点：每一程的第一支箭头上有一圈环，当前程写着第二程。
  await page.evaluate(() => {
    const slider = document.querySelector('.replay-slider');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(slider, slider.getAttribute('max'));
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(900);
  const combinedEnd = await page.evaluate(() => ({
    rings: document.querySelectorAll('.stage-arrow-stage-mark').length,
    chip: document.querySelector('.replay-stage-chip')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
    currentStage: document.querySelector('.replay-stage-item.is-current')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
    nodes: document.querySelectorAll('.network-node').length,
  }));
  check('每一程的第一支箭头都带一圈环（看得出程在哪儿断开）', combinedEnd.rings === 2, JSON.stringify(combinedEnd));
  check('走到最后一步写着「当前在第几程」',
    combinedEnd.chip.includes(combineState.titles[1]) && combinedEnd.currentStage.includes(combineState.titles[1]),
    JSON.stringify({ chip: combinedEnd.chip, current: combinedEnd.currentStage, title: combineState.titles[1] }));
  check('两程的节点都在同一张画布上（= 起点 + 两程的新节点）',
    combinedEnd.nodes === combineEntry + combinePath.length,
    JSON.stringify({ nodes: combinedEnd.nodes, entry: combineEntry, path: combinePath.length }));
  await page.screenshot({ path: resolve(MCS_WEB_ROOT, 'tmp', 'example-combined.png'), fullPage: false });

  /*
   * ---- 目标可选（2026-10-13 用户要求「确定目标设置为可选项」）----
   *
   * 规划器契约里目标仍然是必填（没有目标就没有「要走到哪」），所以「可选」不是把空目标
   * 塞给规划器，而是：目标留空时**不发规划请求**，改列**可学前沿**（与「我的学习」的
   * 下一步表同源），再由用户一键把候选变成目标或标记为已有。
   *
   * 三条都要验：① 有空选项且点了不报错；② 候选带依据句；③ 两条候选动作都能走通
   * （有产出行动的 → 当目标并规划；没有产出行动的 → 标记为已有，前沿当场重算）。
   */
  await page.goto(server.origin + '/plan', { waitUntil: 'networkidle' });
  await page.waitForSelector('.plan-form select');
  const emptyOption = await page.locator('.plan-form select option[value=""]').first().innerText();
  check('目标下拉框里有「不选目标」这一项', /不选目标/.test(emptyOption), emptyOption);
  await page.locator('.plan-form select').selectOption('');
  /*
   * 主按钮按 `data-testid` 取，不按文案取（2026-10-14 改）：
   * 点过之后按钮就叫「重新规划」，同一段会话里第二次再按「开始规划」去找它就找不到了。
   */
  const planSubmit = page.locator('[data-testid="plan-submit"]');
  check('主按钮初始文案是「开始规划」', (await planSubmit.innerText()).trim() === '开始规划', await planSubmit.innerText());
  await planSubmit.click();
  await page.waitForSelector('.plan-frontier', { timeout: 15000 });
  check('点过之后主按钮换成「重新规划」', (await planSubmit.innerText()).trim() === '重新规划', await planSubmit.innerText());
  /*
   * 反馈不只是一行字：页面还要把**已经在那儿的那一份**带进视野。
   * 用 waitForFunction 而不是固定等待——平滑滚动在负载高的机器上会明显变慢。
   */
  const frontierInView = await page.waitForFunction(() => {
    const box = document.querySelector('.plan-frontier')?.getBoundingClientRect();
    return Boolean(box) && box.top <= window.innerHeight * 0.5;
  }, null, { timeout: 8000 }).then(() => true).catch(() => false);
  check('点「开始规划」后视线自动落到结果栏目', frontierInView,
    JSON.stringify(await page.evaluate(() => ({
      scrollY: Math.round(window.scrollY),
      top: Math.round(document.querySelector('.plan-frontier')?.getBoundingClientRect().top ?? NaN),
    }))));
  const frontier = await page.evaluate(() => ({
    title: document.querySelector('.plan-frontier h2')?.textContent.trim() ?? '',
    facts: [...document.querySelectorAll('.plan-frontier .facts div')].map((d) => d.textContent.replace(/\s+/g, ' ').trim()),
    options: document.querySelectorAll('.frontier-option').length,
    basis: document.querySelector('.frontier-option .frontier-basis')?.textContent.trim() ?? '',
    routes: document.querySelectorAll('.route-card').length,
    error: document.querySelector('.error')?.textContent ?? null,
  }));
  check('不选目标也能「开始规划」：如实给出可学前沿，不报错也不硬给空结果',
    frontier.options >= 3 && /可学前沿/.test(frontier.title) && !frontier.error
      && frontier.routes === 0 && frontier.facts.some((item) => /现在就能开始/.test(item)),
    JSON.stringify({ title: frontier.title, options: frontier.options, error: frontier.error }));
  check('每条候选都带依据句（与方向面板同一句 `optionBasis`）', frontier.basis.length >= 20, frontier.basis.slice(0, 60));

  /*
   * 再点一次（仍在无目标模式）：这一下状态没有任何变化，不能因此退化成「点了没反应」——
   * 视线要照样被带回结果栏目。
   */
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForFunction(() => window.scrollY === 0, null, { timeout: 5000 }).catch(() => {});
  await planSubmit.click();
  const backInView = await page.waitForFunction(() => {
    const box = document.querySelector('.plan-frontier')?.getBoundingClientRect();
    return Boolean(box) && box.top <= window.innerHeight * 0.5;
  }, null, { timeout: 8000 }).then(() => true).catch(() => false);
  check('无目标模式下再点一次（按钮此时是「重新规划」），视线仍回到结果栏目', backInView,
    JSON.stringify(await page.evaluate(() => ({
      scrollY: Math.round(window.scrollY),
      top: Math.round(document.querySelector('.plan-frontier')?.getBoundingClientRect().top ?? NaN),
    }))));

  // ① 有产出行动的候选 → 「用它当目标」：写进下拉框并真的规划一次
  const goalCandidate = page.locator('.frontier-option')
    .filter({ has: page.getByRole('button', { name: '用它当目标' }) }).first();
  const candidateNode = await goalCandidate.getAttribute('data-node');
  await goalCandidate.getByRole('button', { name: '用它当目标' }).click();
  await page.waitForFunction((node) => document.querySelector('.plan-form select')?.value === node, candidateNode, { timeout: 15000 });
  await page.waitForSelector('.plan-summary', { timeout: 30000 });
  const afterUseAsGoal = await page.evaluate(() => ({
    goal: document.querySelector('.plan-form select')?.value ?? '',
    frontierGone: !document.querySelector('.plan-frontier'),
    status: document.querySelector('.plan-status')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
  }));
  check('「用它当目标」把候选写进下拉框、离开无目标模式并给出规划结果',
    afterUseAsGoal.goal === candidateNode && afterUseAsGoal.frontierGone
      && afterUseAsGoal.status.length > 0 && !/失败/.test(afterUseAsGoal.status),
    JSON.stringify(afterUseAsGoal));

  // ② 没有产出行动的候选（符号类）→ 只能「标记为已有」；标记后前沿与背景计数当场重算
  await page.locator('.plan-form select').selectOption('');
  await planSubmit.click();
  await page.waitForSelector('.plan-frontier', { timeout: 15000 });
  const declareCandidate = page.locator('.frontier-option')
    .filter({ has: page.getByRole('button', { name: '标记为已有' }) }).first();
  const declareNode = await declareCandidate.getAttribute('data-node');
  const beforeDeclare = await page.evaluate(() => {
    const facts = [...document.querySelectorAll('.plan-frontier .facts div')].map((d) => d.textContent.replace(/\s+/g, ' ').trim());
    const background = Number((facts.find((item) => /背景声明/.test(item))?.match(/(\d+)\s*项/) ?? [])[1] ?? NaN);
    return { background, options: document.querySelectorAll('.frontier-option').length };
  });
  await declareCandidate.getByRole('button', { name: '标记为已有' }).click();
  await page.waitForTimeout(600);
  const afterDeclare = await page.evaluate((node) => {
    const facts = [...document.querySelectorAll('.plan-frontier .facts div')].map((d) => d.textContent.replace(/\s+/g, ' ').trim());
    const background = Number((facts.find((item) => /背景声明/.test(item))?.match(/(\d+)\s*项/) ?? [])[1] ?? NaN);
    return {
      background,
      options: document.querySelectorAll('.frontier-option').length,
      stillListed: Boolean(document.querySelector(`.frontier-option[data-node="${node}"]`)),
    };
  }, declareNode);
  check('没有产出行动的候选只能「标记为已有」：标记后它离开前沿、背景计数 +1、前沿当场重算',
    afterDeclare.background === beforeDeclare.background + 1 && afterDeclare.stillListed === false,
    JSON.stringify({ node: declareNode, before: beforeDeclare, after: afterDeclare }));

  /*
   * 进度轨只记「本次会话载入过哪几程」——**不是学习进度**：刷新之后仍然记着（两程都记为已载入，
   * 但没有任何一程是「当前」，因为刷新后表单里什么都没载入），而且**不落 localStorage**。
   */
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.example-walk');
  const walkReloaded = await page.evaluate(() => ({
    visited: document.querySelectorAll('.example-walk-stage.visited').length,
    current: document.querySelectorAll('.example-walk-stage.current').length,
    labels: [...document.querySelectorAll('.example-walk-state')].map((el) => el.textContent.trim()),
    inLocalStorage: Boolean(window.localStorage.getItem('mcs-example-walk-v1')),
  }));
  check('刷新后进度轨仍记得本次载入过的两程（会话级，不落 localStorage）',
    walkReloaded.visited === 2 && walkReloaded.current === 0
      && walkReloaded.labels.filter((label) => label === '本次已载入').length === 2
      && walkReloaded.inLocalStorage === false,
    JSON.stringify(walkReloaded));
  await page.locator('.example-walk .link-button', { hasText: '结束整条路径' }).click();
  await page.waitForTimeout(300);
  check('结束整条路径后进度轨消失（并清掉会话状态）',
    (await page.locator('.example-walk').count()) === 0
      && (await page.evaluate(() => window.sessionStorage.getItem('mcs-example-walk-v1'))) === null);

  /*
   * ---- 主要按键的「按下」反馈（2026-10-04 加）----
   *
   * 这一段**真的把鼠标按下去**（`mouse.down()` 制造真实的 `:active`），量按下与松开两态，
   * 而不是在样式表里找关键字。要守住的四件事：
   *
   * 1. 按下用长写属性 `translate` / `scale`——它们与悬停规则写的 `transform` 是两个属性，
   *    所以「悬停抬 2px」与「按下沉 1px」能同时成立（用 `transform` 就会被 (0,3,0) 的悬停规则压掉）；
   * 2. 高光落在**指针落点**上（`--press-x/--press-y` 由 PressFeedback 写入），不是永远居中；
   * 3. 高光是「画在按键内部」的径向渐变 + 内阴影（不靠 `overflow: hidden`），松开后归零；
   * 4. `prefers-reduced-motion: reduce` 下**关掉的是过渡，不是状态**：仍然沉 1px、仍然亮起。
   *
   * 取元素的两条纪律（写错过一次）：**只挑与档案状态无关就一定存在的元素**
   * （`/plan` 的「开始规划」是真 `<button>`，与有没有学习者档案无关；`.button.primary` 在
   * `/start` 上要回访者形态才有，新 context 里根本没有），并且**先查存在性、给短超时**，
   * 缺元素要立刻红在断言上，不是 30 秒后抛一个不带选择器的超时。
   */
  const armClickGuard = (selector) => page.evaluate((value) => {
    // 按下会触发跳转或动作；这里把这一次 click 拦掉（含 React 的 onClick：capture 阶段 stopPropagation
    // 之后事件到不了根节点上的 React 委托），但 pointerdown 已经发生，反馈照测。
    document.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest(value)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, { capture: true, once: true });
  }, selector);

  await page.goto(server.origin + '/plan', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const pressTarget = page.locator('button.button.primary').first();
  const pressFound = (await pressTarget.count()) > 0;
  check('规划页的「开始规划」是真 <button> 且可按下', pressFound,
    JSON.stringify({ path: await page.evaluate(() => location.pathname) }));
  if (pressFound) {
    await pressTarget.scrollIntoViewIfNeeded({ timeout: 8000 });
    await armClickGuard('button.button.primary');
    const pressBox = await pressTarget.boundingBox();
    const readPress = () => pressTarget.evaluate((element) => {
      const style = getComputedStyle(element);
      const glow = getComputedStyle(element, '::after');
      return {
        translate: style.translate,
        scale: style.scale,
        transform: style.transform,
        pressX: style.getPropertyValue('--press-x').trim(),
        pressY: style.getPropertyValue('--press-y').trim(),
        glowOpacity: Number(glow.opacity),
        glowGradient: glow.backgroundImage.includes('radial-gradient'),
        glowShadow: glow.boxShadow,
      };
    });
    const resting = await readPress();
    // 落在按键宽度 1/4、高度正中：落点值应当跟着走（居中的话这里会是 50）。
    await page.mouse.move(pressBox.x + pressBox.width * 0.25, pressBox.y + pressBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(140);
    const pressed = await readPress();
    await page.mouse.up();
    await page.waitForTimeout(420);
    const released = await readPress();
    check('按下时按键下沉并轻微缩小（translate / scale 长写属性，不动悬停的 transform）',
      pressed.translate === '0px 1px' && Number.parseFloat(pressed.scale) > 0.9 && Number.parseFloat(pressed.scale) < 1
        && resting.translate === 'none' && resting.scale === 'none',
      JSON.stringify({ resting: [resting.translate, resting.scale], pressed: [pressed.translate, pressed.scale], hoverTransform: pressed.transform }));
    check('高光落在指针落点上（不是永远 50%）',
      Math.abs(Number.parseFloat(pressed.pressX) - 25) <= 8 && Math.abs(Number.parseFloat(pressed.pressY) - 50) <= 8,
      JSON.stringify({ x: pressed.pressX, y: pressed.pressY }));
    check('按下时亮起：伪元素是不溢出的径向渐变 + 内阴影；松开后归零',
      pressed.glowOpacity >= 0.9 && pressed.glowGradient && pressed.glowShadow.includes('inset')
        && resting.glowOpacity <= 0.05 && released.glowOpacity <= 0.05,
      JSON.stringify({ resting: resting.glowOpacity, pressed: pressed.glowOpacity, released: released.glowOpacity, gradient: pressed.glowGradient, shadow: pressed.glowShadow.slice(0, 48) }));
    check('松开后位移与缩放都归位',
      released.translate === 'none' && released.scale === 'none',
      JSON.stringify([released.translate, released.scale]));
  }

  /*
   * 形式不是 `<button>` 的「主要按键」：侧栏导航项、品牌位、角度 chip。
   * 这三处都常驻在 `/start` 上（`.angle-chip` 由本体现场派生，与档案状态无关）。
   */
  await page.goto(server.origin + '/start', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  for (const selector of ['.nav-item', '.brand', '.angle-chip']) {
    const target = page.locator(selector).first();
    const found = (await target.count()) > 0;
    if (!found) {
      check(`「${selector}」存在且带按下反馈`, false, JSON.stringify({ path: await page.evaluate(() => location.pathname) }));
      continue;
    }
    await target.scrollIntoViewIfNeeded({ timeout: 8000 });
    await armClickGuard(selector);
    const box = await target.boundingBox();
    if (!box) {
      check(`「${selector}」存在且带按下反馈`, false, '拿不到几何框（可能被遮挡或不可见）');
      continue;
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    /*
     * 按下反馈是**过渡**出来的：写死 sleep 120ms 在高负载下会量到中间值——
     * 实测 `::after` 的 opacity 停在 0.85（终点是 1），于是这条断言假失败过两次
     * （同一次提交重跑就绿）。这里等它真的到位再读；等不到也照读，
     * 真坏了仍然会以同样的消息红，只是不再因为机器忙而红。
     */
    const pressedHandle = await target.elementHandle();
    await page
      .waitForFunction((element) => Number(getComputedStyle(element, '::after').opacity) >= 0.9, pressedHandle, { timeout: 2000 })
      .catch(() => {});
    const state = await target.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        translate: style.translate,
        scale: style.scale,
        glow: Number(getComputedStyle(element, '::after').opacity),
        pressX: style.getPropertyValue('--press-x').trim(),
      };
    });
    await page.mouse.up();
    await page.waitForTimeout(260);
    check(`「${selector}」按下时也有反馈（下沉 + 落点高光）`,
      state.translate === '0px 1px' && Number.parseFloat(state.scale) < 1 && state.glow >= 0.9
        && Math.abs(Number.parseFloat(state.pressX) - 50) <= 10,
      JSON.stringify(state));
  }

  const reduceContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const reducePage = await reduceContext.newPage();
  await reducePage.goto(server.origin + '/plan', { waitUntil: 'networkidle' });
  await reducePage.waitForTimeout(400);
  const reduceTarget = reducePage.locator('button.button.primary').first();
  const reduceFound = (await reduceTarget.count()) > 0;
  let reducePressed = null;
  if (reduceFound) {
    await reduceTarget.scrollIntoViewIfNeeded({ timeout: 8000 });
    const reduceBox = await reduceTarget.boundingBox();
    await reducePage.mouse.move(reduceBox.x + reduceBox.width / 2, reduceBox.y + reduceBox.height / 2);
    await reducePage.mouse.down();
    await reducePage.waitForTimeout(120);
    reducePressed = await reduceTarget.evaluate((element) => ({
      translate: getComputedStyle(element).translate,
      glow: Number(getComputedStyle(element, '::after').opacity),
      duration: getComputedStyle(element, '::after').transitionDuration,
    }));
    await reducePage.mouse.up();
  }
  await reduceContext.close();
  check('reduce 下按下反馈仍在，但已无过渡（关掉的是动画，不是状态）',
    Boolean(reducePressed) && reducePressed.translate === '0px 1px' && reducePressed.glow >= 0.9
      && reducePressed.duration.split(',').every((value) => Number.parseFloat(value) === 0),
    JSON.stringify(reducePressed));

  await page.goto(server.origin + '/nodes/' + encodeURIComponent('limit:bridge'), { waitUntil: 'networkidle' });
  await page.screenshot({ path: resolve(MCS_WEB_ROOT, 'tmp', 'browser-node.png'), fullPage: true });
  check('浏览器控制台无错误', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
} catch (error) {
  failures.push('EXCEPTION ' + error.message);
  console.error(error);
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length) {
  console.error('\n浏览器验收失败：');
  for (const failure of failures) console.error(' - ' + failure);
  process.exit(1);
}
console.log('\n浏览器验收全部通过。');
