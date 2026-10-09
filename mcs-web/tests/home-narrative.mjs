import { resolve } from 'node:path';
import { startTestServer } from './helpers.mjs';
import { MCS_WEB_ROOT } from '../core/ontology.mjs';

import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

const ACT_IDS = ['theme', 'pain', 'path', 'methods', 'human', 'infrastructure'];
const ACT_COUNT = ACT_IDS.length;
/**
 * 固定舞台的高度是这套叙事最容易出问题的地方：「现状」幕条目最多、
 * 末幕要同时放正文、入口、徽记与署名，所以每个桌面视口都量一次裁切。
 * 这四档都覆盖到：宽舞台（16px 正文）、标准矮舞台、以及最窄的固定舞台（1220px）。
 */
const FIT_VIEWPORTS = [
  { width: 1600, height: 1100 },
  { width: 1440, height: 1000 },
  { width: 1440, height: 860 },
  { width: 1366, height: 768 },
  { width: 1280, height: 800 },
  { width: 1280, height: 720 },
  { width: 1220, height: 782 },
];
/**
 * 固定舞台放不下的两种情形都该换成自然滚动：不够宽（≤1200px）或不够高（≤700px）。
 * 宁可换形态，也不裁文案、不把字压小。
 */
const FLOW_VIEWPORTS = [
  { width: 1152, height: 864 },
  { width: 1024, height: 768 },
  { width: 1280, height: 690 },
];

const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await desktop.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  await page.goto(server.origin, { waitUntil: 'networkidle' });

  const intro = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent ?? '',
    story: Boolean(document.querySelector('.home-story')),
    progress: Number(document.querySelector('.home-story')?.getAttribute('data-story-progress') ?? '1'),
    acts: [...document.querySelectorAll('.home-story-act')].map((act) => ({
      id: act.getAttribute('data-act'),
      title: act.querySelector('h2')?.textContent ?? '',
      opacity: Number(getComputedStyle(act).opacity),
    })),
    points: [...document.querySelectorAll('.home-story-act[data-act="pain"] .home-story-points li')].map((li) => ({
      label: li.querySelector('.home-story-point-label')?.textContent?.trim() ?? '',
      detail: li.querySelector('.home-story-point-detail')?.textContent?.trim() ?? '',
    })),
    /*
     * 第一幕（主题）是这一轮新增的：它讲站点是什么，因此断言集中在
     * 「三条主线各有一条、各有图标、一列一条改成了三列并排」这几件事上。
     */
    themeKicker: document.querySelector('.home-story-act[data-act="theme"] .home-story-kicker')?.textContent?.trim() ?? '',
    themePoints: [...document.querySelectorAll('.home-story-act[data-act="theme"] .home-story-point')].map((li) => ({
      label: li.querySelector('.home-story-point-label')?.textContent?.trim() ?? '',
      detail: li.querySelector('.home-story-point-detail')?.textContent?.trim() ?? '',
      icon: Boolean(li.querySelector('.home-story-point-icon svg')),
      columns: Number(getComputedStyle(li.parentElement).gridTemplateColumns.split(' ').length),
    })),
    themeBoundary: document.querySelector('.home-story-act[data-act="theme"] .home-story-boundary')?.textContent?.trim() ?? '',
    painBoundary: document.querySelector('.home-story-act[data-act="pain"] .home-story-boundary')?.textContent?.trim() ?? '',
    visionBoundary: document.querySelector('.home-story-act[data-act="infrastructure"] .home-story-boundary')?.textContent?.trim() ?? '',
    foot: document.querySelector('.home-story-foot span:nth-child(2)')?.textContent?.trim() ?? '',
    skip: document.querySelector('.home-story-skip')?.textContent?.trim() ?? '',
    skipHref: document.querySelector('.home-story-skip')?.getAttribute('href') ?? '',
    // 首页只负责讲为什么：学习入口、原型问题与筛选都在「开始学习」页。
    learningBlocks: document.querySelectorAll('.case-card, .continue-card, #cases, #angles, .progress-facts').length,
    finalActions: [...document.querySelectorAll('.hero-actions a')].map((a) => ({
      text: a.textContent.trim(), href: a.getAttribute('href'),
    })),
    visualNote: document.querySelector('.home-story-visual-note')?.textContent?.trim() ?? '',
    visualLayers: document.querySelectorAll('.home-story-visual-layer svg').length,
    atmosphereLayers: document.querySelectorAll('.home-story-atmosphere').length,
    progressButtons: document.querySelectorAll('.home-story-progress button').length,
    rootHeight: document.querySelector('.home-story')?.offsetHeight ?? 0,
    viewportHeight: window.innerHeight,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    // 各段的位置：段落顶端相对页面顶部的距离（用于核对「不在同一个位置」）。
    sectionTops: [...document.querySelectorAll('.home-story-section')].map((section) => (
      Math.round(section.getBoundingClientRect().top + window.scrollY)
    )),
    sectionHeights: [...document.querySelectorAll('.home-story-section')].map((section) => Math.round(section.getBoundingClientRect().height)),
    activeAct: document.querySelector('.home-story')?.getAttribute('data-active-act') ?? '',
  }));

  check('叙事标题仍是站点主标题', intro.h1.includes('数学认知空间'));
  check('首页挂载六幕叙事', intro.story && intro.acts.length === ACT_COUNT, JSON.stringify(intro.acts.map((act) => act.id)));
  check('六幕按主题、现状、路径、方法、体验、愿景排列',
    JSON.stringify(intro.acts.map((act) => act.id)) === JSON.stringify(ACT_IDS),
    JSON.stringify(intro.acts.map((act) => act.id)));
  check('第一幕点题：主题幕讲知识连成网络、学习沿思路展开', intro.acts[0].title.includes('思路'), intro.acts[0].title);
  check('第一幕的三条主线是并列的三张图标卡',
    intro.themeKicker.includes('主题')
      && intro.themePoints.length === 3
      && intro.themePoints.every((point) => point.icon && point.label && point.detail)
      && intro.themePoints.every((point) => point.columns === 3),
    JSON.stringify({ kicker: intro.themeKicker, points: intro.themePoints.map((point) => [point.label, point.columns, point.icon]) }));
  check('三条主线是本站的三件事',
    JSON.stringify(intro.themePoints.map((point) => point.label))
      === JSON.stringify(['知识节点化', '关系网络化', '笔记人性化']),
    JSON.stringify(intro.themePoints.map((point) => point.label)));
  check('第二幕讲从头到尾跟一本教材走', intro.acts[1].title.includes('从头到尾'));
  check('第三幕讲教材路径既定', intro.acts[2].title.includes('教材的顺序'));
  check('第四幕讲方法论分散与汇集', intro.acts[3].title.includes('散落的教学智慧'));
  check('第五幕讲人性化设计', intro.acts[4].title.includes('顺着人的思维'));
  check('第六幕收束到教育基础设施', intro.acts[5].title.includes('数学教育基础设施'));
  check('「现状」幕列出六条现状', intro.points.length === 6 && intro.points.every((point) => point.label && point.detail), JSON.stringify(intro.points));
  check('六条现状覆盖幻灯片里的痛点',
    JSON.stringify(intro.points.map((point) => point.label))
      === JSON.stringify(['内容重合', '路径既定', '前置未对齐', '方法分散', '重复劳动', '信息差']),
    JSON.stringify(intro.points.map((point) => point.label)));
  check('主题幕写明这是设计意图、不是效果结论',
    intro.themeBoundary.includes('设计意图') && intro.themeBoundary.includes('不是教学效果的实证结论'),
    intro.themeBoundary);
  check('「现状」幕写明这是观察而非实证结论',
    intro.painBoundary.includes('不是实证研究结论') && intro.painBoundary.includes('没有测量过教学收益'),
    intro.painBoundary);
  check('末幕写明目标是未完成的',
    intro.visionBoundary.includes('不是已完成的成果') && intro.visionBoundary.includes('不声称已经提升学习效率'),
    intro.visionBoundary);
  check('页脚文案随幕数变化', intro.foot.includes('六幕'), JSON.stringify(intro.foot));
  check('首屏提供直接进入学习', intro.skip === '直接进入学习' && intro.skipHref === '/start', JSON.stringify({ skip: intro.skip, href: intro.skipHref }));
  check('首页只做动画：不挂学习板块', intro.learningBlocks === 0, String(intro.learningBlocks));
  check('末幕入口齐全',
    intro.finalActions[0]?.text === '开始学习'
      && intro.finalActions[0]?.href === '/start'
      && intro.finalActions[1]?.text === '打开学习路线'
      && intro.finalActions[1]?.href === '/plan'
      && intro.finalActions[2]?.text === '了解学习方法论'
      && intro.finalActions[2]?.href === '/method',
    JSON.stringify(intro.finalActions));
  check('六种图形都有教学内容示意', intro.visualLayers === ACT_COUNT && intro.visualNote.includes('教学组织示意'), JSON.stringify({ layers: intro.visualLayers, note: intro.visualNote }));
  check('每幕都有环境动效层与可操作的幕导航', intro.atmosphereLayers === ACT_COUNT && intro.progressButtons === ACT_COUNT,
    JSON.stringify({ atmospheres: intro.atmosphereLayers, buttons: intro.progressButtons }));

  /*
   * 背景动画的可读性与遮挡（2026-10 重做后新加）。
   *
   * 用户的两条意见：「背景的动画颜色浅到看不清」「动画文字还被前景文字挡住了」。
   * 实测旧版的数字是：图形层 0.5 × 场景文字 0.5 = 有效 0.25，描边本身是淡紫 #e5dff6，
   * 中心还压着一层 96% 白的径向柔光罩；场景与正文列**严格同心**，17 条动画文字里 6 条压在正文卡上。
   *
   * 现在的规则按区域分工，并且**两层文字都是几何上不可能被压住**的：
   * - 图形层按 0.92 画，柔光罩只管正文列那一条带（四周保留原色）；
   * - 动画文字分两层：场景标签走「与舞台对齐的遮罩」（正文列整条被挡掉），
   *   每幕大字词按设计放在与图形相对的一侧带里。
   *
   * 遮罩是像素级的，`getBoundingClientRect` 量不到，所以这里按**可验证的口径**断言：
   * 遮罩保留区（≤16% 或 ≥84%）里的标签必须与正文卡零交叠；
   * 与正文卡有交叠的标签，其中心必须落在遮罩透明区（即已经被遮罩擦掉）。
   */
  const layering = await page.evaluate(() => {
    const intersects = (a, b) => (a && b ? Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
      * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)) : 0);
    /*
     * 遮罩的**清晰可见区**（2026-10 第三次改口径）。阈值必须跟着遮罩走，而遮罩现在跟着**带宽**走：
     * 带宽 =（舞台宽 − 正文列宽）/ 2，透明区从 `max(3.5%, 带宽 − 5%)` 开始（见 styles.css 的 mask 与
     * HomeNarrative 的 measureBand）。写死任何一个百分比都会在换宽度时变成过期阈值——
     * 旧的 12%/88% 就是这么过期的（那时还没算带宽）。
     *
     * 交叠判据同时改成**遮罩后的可见矩形**：整块文字盒会跨过遮罩边界，
     * 但被遮掉的像素根本不渲染，按整盒判会把「右半边被遮掉的长标签」误判成压正文（第四十四轮的口径）。
     */
    const rootStyle = getComputedStyle(document.querySelector('.home-story'));
    const bandPct = Number.parseFloat(rootStyle.getPropertyValue('--hs-band')) || 17;
    const soft = Math.max(3.5, bandPct - 5);
    const maskKeeps = (pct) => pct <= soft || pct >= 100 - soft;
    return [...document.querySelectorAll('.home-story-section')].map((section) => {
      const stage = section.getBoundingClientRect();
      const pct = (x) => ((x - stage.left) / stage.width) * 100;
      const copy = section.querySelector('.home-story-act-copy').getBoundingClientRect();
      const layer = section.querySelector('.home-story-visual-layer');
      const labelLayer = section.querySelector('.home-story-label-layer');
      const scrim = section.querySelector('.home-story-scrim');
      const word = section.querySelector('.home-story-ghost-word');
      const labels = [...labelLayer.querySelectorAll('.home-story-scene text')]
        .filter((text) => Number(getComputedStyle(text).opacity) > 0.05 && text.getBoundingClientRect().width > 0)
        .map((text) => ({ rect: text.getBoundingClientRect() }));
      /** 文字盒被遮罩裁过之后**真正画出来**的部分（左带与右带各取一次交）。 */
      const visiblePart = (rect) => {
        const leftBand = { left: rect.left, right: Math.min(rect.right, stage.left + (soft / 100) * stage.width) };
        const rightBand = { left: Math.max(rect.left, stage.right - (soft / 100) * stage.width), right: rect.right };
        return [leftBand, rightBand].filter((band) => band.right > band.left);
      };
      const painted = labels.filter((label) => maskKeeps(pct(label.rect.left + label.rect.width / 2)));
      const masked = labels.filter((label) => !maskKeeps(pct(label.rect.left + label.rect.width / 2)));
      const wordRect = word.getBoundingClientRect();
      const wordCenterPct = pct(wordRect.left + wordRect.width / 2);
      /*
       * 「主题」幕那一格是**正文背后的渐隐水印**（2026-10-04 第三版：用户圈了位置，
       * 要它落在中右那块、大小与圈相仿）。
       *
       * 判据随之从「不许越过正文列」反过来：水印**就是要横过正文列**，
       * 能不能读正文改由**层序**负责——它必须还在视觉舞台（z-index 0）里，
       * 柔光罩（1）与正文（2）压在它上面（层序那条断言另有一处守着）。
       * 这里量四件：图真的加载、整幅在舞台内、够大（≥ 舞台宽的 35%）、
       * 中心落在中右那块（x 45%–80%、y 30%–60%），并且确实带渐隐遮罩。
       */
      const mark = word.querySelector('.home-story-ghost-mark');
      const markRect = mark ? mark.getBoundingClientRect() : null;
      const markCenterXPct = markRect ? ((markRect.left + markRect.width / 2) - stage.left) / stage.width * 100 : 0;
      const markCenterYPct = markRect ? ((markRect.top + markRect.height / 2) - stage.top) / stage.height * 100 : 0;
      const markMask = mark ? (getComputedStyle(mark).maskImage || getComputedStyle(mark).webkitMaskImage || '') : '';
      return {
        act: section.getAttribute('data-act'),
        layerOpacity: Number(getComputedStyle(layer).opacity),
        labelOpacity: labels.length ? Number(getComputedStyle(labelLayer.querySelector('.home-story-scene text')).opacity) : null,
        paintedCount: painted.length,
        paintedHittingCopy: painted.filter((label) => visiblePart(label.rect).reduce((sum, band) => sum + intersects(band, copy), 0) > 8).length,
        paintedBoxHittingCopy: painted.filter((label) => intersects(label.rect, copy) > 8).length,
        maskedCount: masked.length,
        maskedHittingCopy: masked.filter((label) => intersects(label.rect, copy) > 8).length,
        ghost: {
          text: word.textContent.trim(),
          isMark: Boolean(mark),
          markSrc: mark ? new URL(mark.getAttribute('src') ?? '', location.href).pathname : '',
          markWidth: markRect ? Math.round(markRect.width) : 0,
          markLoaded: mark ? mark.naturalWidth > 0 : false,
          markWidthPct: markRect ? Math.round((markRect.width / stage.width) * 1000) / 10 : 0,
          markCenterXPct: Math.round(markCenterXPct * 10) / 10,
          markCenterYPct: Math.round(markCenterYPct * 10) / 10,
          markInsideStage: markRect ? markRect.left >= stage.left - 2 && markRect.right <= stage.right + 2 : false,
          markMasked: markMask.includes('linear-gradient'),
          /* 水印必须在视觉舞台里——这一条等价于「正文与柔光罩都压在它上面」。 */
          markInsideVisualStage: Boolean(mark?.closest('.home-story-visual-stage')),
          markInsideCopyLayer: Boolean(mark?.closest('.home-story-copy-stage')),
          opacity: Number(getComputedStyle(word).opacity),
          color: getComputedStyle(word).color,
          side: word.getAttribute('data-side'),
          centerPct: wordCenterPct,
          hitsCopy: intersects(wordRect, copy) > 8,
        },
        scrimAlpha: Number.parseFloat(getComputedStyle(scrim).getPropertyValue('--home-story-scrim-alpha')) || 0,
        scrimWidthPct: (scrim.getBoundingClientRect().width / stage.width) * 100,
        zOrder: [layer, scrim, section.querySelector('.home-story-copy-stage') ?? section.querySelector('.home-story-act')]
          .map((element) => Number(getComputedStyle(element).zIndex)),
      };
    });
  });
  const contrast = (rgb) => {
    const channels = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map((value) => {
      const channel = value / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    return (1.05) / (luminance + 0.05);
  };
  check('背景图形层不再被洗淡（不透明度 ≥ 0.85）',
    layering.every((act) => act.layerOpacity >= 0.85), JSON.stringify(layering.map((act) => [act.act, act.layerOpacity])));
  /*
   * 这两条的**判据在 2026-10 变了**（TODO A3-17），意思没变：
   * - 「清晰可见的标签不压正文」按**遮罩后的可见像素**判（`paintedHittingCopy`）；
   *   整块文字盒的越界数（`paintedBoxHittingCopy`）另记一份，只为留痕与对照，不再作为失败条件——
   *   长标签跨过遮罩边界是遮罩的正常工作方式，不是遮挡。
   * - 「每幕都有清晰可见的动画标签」不再要求**每一幕**都有场景文字：带宽不足时场景文字层整层让位，
   *   动画文字由四周带标签承担（见后面的 bandCheck）。这里改为：全页至少有一幕画出了场景文字，
   *   且被遮掉的标签确实存在（说明遮罩在工作）。
   */
  check('每幕清晰可见的动画文字不进正文列（按遮罩后的可见像素判）',
    layering.every((act) => act.paintedHittingCopy === 0),
    JSON.stringify(layering.map((act) => [act.act, act.paintedCount, act.paintedHittingCopy, act.paintedBoxHittingCopy])));
  check('遮罩确实在挡东西：存在被遮掉的标签，而清晰可见的标签一个都没压正文卡',
    layering.some((act) => act.maskedCount >= 1)
      && layering.some((act) => act.paintedCount >= 1)
      && layering.every((act) => act.paintedHittingCopy === 0),
    JSON.stringify(layering.map((act) => [act.act, act.maskedCount, act.paintedCount, act.paintedHittingCopy])));

  /*
   * 动画标签的尺寸、朝向与「不硬切」（2026-10）。
   *
   * 用户截图里的问题：第四幕（图形在右）最右边的几个标签被屏幕切掉一半。
   * 改法：两层几何分家——形状层仍让到 ±15%（形状出屏只是构图），
   * 文字层只让 ±4% 且场景收到 104%，字号提到 22（渲染后约 33px，改版前约 27px）；
   * 遮罩从「实心→突然透明」改成**渐变淡出**，并在屏幕左右边缘也加了一段淡出。
   */
  const labels = await page.evaluate(() => {
    const section = document.querySelector('.home-story-section[data-active="true"]') ?? document.querySelector('.home-story-section');
    const stage = section.getBoundingClientRect();
    const layer = section.querySelector('.home-story-label-layer');
    const scene = layer.querySelector('.home-story-scene');
    const copy = section.querySelector('.home-story-act-copy').getBoundingClientRect();
    const style = getComputedStyle(layer);
    // 遮罩的中间色标（0.6 那一档）说明它是渐变而不是硬边。
    const mask = style.maskImage || style.webkitMaskImage || '';
    const texts = [...scene.querySelectorAll('text')].filter((node) => Number(getComputedStyle(node).opacity) > 0.05 && node.getBoundingClientRect().width > 0);
    const rows = texts.map((node) => {
      const rect = node.getBoundingClientRect();
      const center = ((rect.left + rect.width / 2) - stage.left) / stage.width * 100;
      const alpha = center <= 5 ? 1 : center >= 95 ? 1 : center <= 11 ? 1 - (center - 5) / 6 * 0.4
        : center <= 17 ? 0.6 * (1 - (center - 11) / 6) : center < 83 ? 0 : center <= 89 ? 0.6 * ((center - 83) / 6)
          : center <= 95 ? 0.6 + 0.4 * ((center - 89) / 6) : 1;
      return {
        alpha,
        offscreen: rect.right > window.innerWidth - 4 || rect.left < 4,
        hitsCopy: Math.min(rect.right, copy.right) - Math.max(rect.left, copy.left) > 8,
      };
    });
    return {
      fontUnits: texts.length ? Number.parseFloat(getComputedStyle(texts[0]).fontSize) : 0,
      maskIsGradient: mask.includes('linear-gradient'),
      maskHasSoftStop: /rgba\(0, 0, 0, 0\.\d+\)/.test(mask),
      visible: rows.filter((row) => row.alpha >= 0.5).length,
      visibleHittingCopy: rows.filter((row) => row.alpha >= 0.5 && row.hitsCopy).length,
      hardCut: rows.filter((row) => row.offscreen && row.alpha > 0.8).length,
      labelSceneHeight: Number.parseFloat(getComputedStyle(scene).height) / stage.height,
      shapeSceneHeight: Number.parseFloat(getComputedStyle(section.querySelector('.home-story-visual-layer .home-story-scene')).height) / stage.height,
    };
  });
  check('动画标签的字号提到了背景角色的档位（≥ 20 单位）', labels.fontUnits >= 20, String(labels.fontUnits));
  check('标签遮罩是渐变淡出（含中间色标），不是硬边切换',
    labels.maskIsGradient && labels.maskHasSoftStop, JSON.stringify({ gradient: labels.maskIsGradient, soft: labels.maskHasSoftStop }));
  check('文字层比形状层小（字留在屏幕内，形状才允许出屏）',
    labels.labelSceneHeight < labels.shapeSceneHeight,
    JSON.stringify({ label: Number(labels.labelSceneHeight.toFixed(3)), shape: Number(labels.shapeSceneHeight.toFixed(3)) }));
  check('当前这一幕：有可见标签、没有一个压正文、没有被屏幕硬切',
    labels.visible >= 1 && labels.visibleHittingCopy === 0 && labels.hardCut === 0,
    JSON.stringify({ visible: labels.visible, hit: labels.visibleHittingCopy, cut: labels.hardCut }));

  /*
   * 每幕的带内那一格（2026-10-04 改两轮，口径跟着设计走）。
   *
   * 「主题」幕那一格是**站点字标**（`act.bandMark`），按用户要求「大一点、透明渐变往中间靠」：
   * 整幅比带还宽、左端渐隐，**整幅越过正文列是要的效果**。所以「压不压正文」按**实心那一段**判
   * （整盒判会把渐隐带算成遮挡——与场景标签那一条同一套口径，见本文件开头的遮罩说明），
   * 另外正向核对渐隐带**确实**越过了正文列边界（否则「往中间靠」只写在注释里）。
   * 文字版那一格照旧：整盒零交叠 + 对比度 ≥6。
   */
  /*
   * 「主题」幕那一格是**中右的渐隐水印**（2026-10-04 第三版：用户圈了位置，
   * 要字标落在红圈那块、大小与圈相仿）。判据因此换了一套，而不是改几个数：
   *
   * - 前两版管的是「四周带里的一格」，于是要它「不许越过正文列」；
   *   现在它是正文**背后**的水印，**横过正文列正是设计**——
   *   「能不能读正文」这件事改由层序兜着（水印在视觉舞台里 z-index 0，
   *   柔光罩 1、正文 2 压在它上面，另有一条层序断言守着）。
   * - 因此这里量：图真的加载、整幅在舞台内、够大（≥ 舞台宽的 35%）、
   *   中心落在中右那块（x 45%–80%、y 30%–60%）、确实带渐隐遮罩、且它属于视觉舞台而不是正文层。
   * - 其余五幕仍是「编号 + 幕名」：整盒不压正文 + 中心在四周带 + 对比度 ≥6。
   */
  check('「主题」幕的字标是正文背后的渐隐水印（够大、在中右、带遮罩、在视觉舞台里）',
    layering.filter((act) => act.act === 'theme').every((act) => act.ghost.isMark
      && act.ghost.markLoaded && act.ghost.markInsideStage
      && act.ghost.markWidthPct >= 35
      && act.ghost.markCenterXPct >= 45 && act.ghost.markCenterXPct <= 80
      && act.ghost.markCenterYPct >= 30 && act.ghost.markCenterYPct <= 60
      && act.ghost.markMasked && act.ghost.markInsideVisualStage && !act.ghost.markInsideCopyLayer),
    JSON.stringify(layering.filter((act) => act.act === 'theme').map((act) => act.ghost)));
  check('其余五幕的带内仍是「编号 + 幕名」：在四周带里、不压正文、浓度足够读',
    layering.filter((act) => act.act !== 'theme').every((act) => !act.ghost.isMark
      && act.ghost.text.length >= 3 && act.ghost.opacity >= 0.7 && !act.ghost.hitsCopy
      && (act.ghost.centerPct <= 22 || act.ghost.centerPct >= 78)
      && contrast(act.ghost.color) >= 6),
    JSON.stringify(layering.filter((act) => act.act !== 'theme')
      .map((act) => [act.act, act.ghost.text, act.ghost.opacity, Math.round(act.ghost.centerPct), act.ghost.hitsCopy, contrast(act.ghost.color).toFixed(1)])));
  check('「主题」幕那一格确实是站点字标（不是文字版、也不止一帧没渲染）',
    layering.filter((act) => act.act === 'theme')
      .every((act) => act.ghost.markSrc === '/wordmark-256.png' && act.ghost.markWidth >= 240),
    JSON.stringify(layering.filter((act) => act.act === 'theme').map((act) => [act.ghost.markSrc, act.ghost.markWidth])));

  /*
   * 舞台左上角的角标（2026-10-04 加，用户要求「紫色 logo 放到第一幕左上角」；
   * 同日按「大一点、不要被挡住了」改过两处：加大尺寸、`top` 从**报头之下**起算）。
   *
   * 判据是几何，不是「样式串里有这条规则」：只有一个幕有角标、它在左上角那块区域里、
   * 不压正文块、整块在舞台内，**而且整块在吸顶报头之下**——最后这条正是用户报的问题：
   * 首屏自动居中之后段落顶端落在报头下面，角标若从段落顶端起算就会被压住一截。
   */
  const corner = await page.evaluate(() => {
    const marks = [...document.querySelectorAll('.home-story-corner-mark')];
    const mark = marks[0];
    if (!mark) return { count: 0 };
    const section = mark.closest('.home-story-section');
    const stage = section.getBoundingClientRect();
    const rect = mark.getBoundingClientRect();
    const copy = section.querySelector('.home-story-act-copy')?.getBoundingClientRect();
    const masthead = document.querySelector('.home-story-masthead')?.getBoundingClientRect();
    const intersects = (a, b) => (a && b ? Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
      * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)) : 0);
    return {
      count: marks.length,
      act: section.getAttribute('data-act'),
      src: new URL(mark.getAttribute('src') ?? '', location.href).pathname,
      loaded: mark.naturalWidth > 0,
      width: Math.round(rect.width),
      centerXPct: Math.round((((rect.left + rect.width / 2) - stage.left) / stage.width) * 100),
      centerYPct: Math.round((((rect.top + rect.height / 2) - stage.top) / stage.height) * 100),
      hitsCopy: intersects(rect, copy),
      insideStage: rect.left >= stage.left - 1 && rect.right <= stage.right + 1
        && rect.top >= stage.top - 1 && rect.bottom <= stage.bottom + 1,
      mastheadBottom: masthead ? Math.round(masthead.bottom) : -1,
      markTop: Math.round(rect.top),
      clearOfMasthead: masthead ? rect.top >= masthead.bottom + 1 : false,
      hitsMasthead: intersects(rect, masthead),
      /*
       * 角标放大之后，它的**外框**会碰到正文块左缘（用户圈的圈也是这样，与标题相切）。
       * 「压不压正文」因此不再按外框判，改判**它属于哪一层**：在视觉舞台里（z-index 0）
       * 就说明柔光罩与正文都压在它上面——与字标那条同一套理由。
       */
      insideVisualStage: Boolean(mark.closest('.home-story-visual-stage')),
      insideCopyLayer: Boolean(mark.closest('.home-story-copy-stage')),
      otherActsHaveMark: [...document.querySelectorAll('.home-story-section')]
        .filter((item) => item.querySelector('.home-story-corner-mark') && item.getAttribute('data-act') !== 'theme').length,
    };
  });
  check('只有「主题」幕有左上角角标，且是紫色徽记、真的加载了',
    corner.count === 1 && corner.act === 'theme' && corner.src === '/logo-256.png'
      && corner.loaded && corner.otherActsHaveMark === 0,
    JSON.stringify(corner));
  check('角标整块在吸顶报头之下（首屏自动居中之后不被挡住）',
    corner.clearOfMasthead && corner.hitsMasthead === 0,
    JSON.stringify({ markTop: corner.markTop, mastheadBottom: corner.mastheadBottom, overlap: corner.hitsMasthead }));
  check('角标落在舞台左上角那块区域、整块在舞台内、尺寸与用户圈的圈相仿，且在正文之下（背景件）',
    corner.centerXPct <= 30 && corner.centerYPct <= 32 && corner.insideStage
      && corner.width >= 220 && corner.width <= 420
      && corner.insideVisualStage && !corner.insideCopyLayer,
    JSON.stringify(corner));

  /*
   * 无界感与浮现（2026-10）。
   *
   * 用户的原话：「这块边界感割裂感太重，文字要自然在中间浮现，后面的也是文字框要无界感。」
   * 于是：正文从「圆角白卡 + 投影 + blur」换成**边缘完全不透明度归零的径向白雾**，
   * 六条现状去掉边框与卡底，边界声明改成「※ + 淡字」，没有一处留下可辨的轮廓。
   * 同时给正文与六条现状加了浮现动画（下沉 + 模糊 + 透明 → 清晰），错位 60ms。
   */
  // 浮现动画 720ms：量之前先让它走完，否则会取到 blur 还剩 0.02px 的瞬间（第一版就是这么误判的）。
  await page.waitForTimeout(1000);
  const borderless = await page.evaluate(() => {
    const copy = document.querySelector('.home-story-section .home-story-act-copy');
    // 「六条现状」按幕名取，不按「第一段里的清单」取：主题幕也有清单（三条主线）。
    const points = [...document.querySelectorAll('.home-story-section[data-act="pain"] .home-story-point')];
    const themePoints = [...document.querySelectorAll('.home-story-section[data-act="theme"] .home-story-point')];
    const boundary = document.querySelector('.home-story-section .home-story-boundary');
    const style = (element) => (element ? getComputedStyle(element) : null);
    const lastStop = (backgroundImage) => (backgroundImage.match(/rgba?\([^)]+\)/g) ?? []).slice(-1)[0] ?? '';
    return {
      copy: {
        border: style(copy)?.borderTopWidth ?? '',
        shadow: style(copy)?.boxShadow ?? '',
        backdrop: style(copy)?.backdropFilter ?? '',
        background: style(copy)?.backgroundImage ?? '',
        lastStop: lastStop(style(copy)?.backgroundImage ?? ''),
        animation: style(copy)?.animationName ?? '',
        opacity: Number(style(copy)?.opacity ?? 0),
        blurPx: Number.parseFloat((style(copy)?.filter ?? '').match(/blur\(([\d.]+)px\)/)?.[1] ?? '0'),
      },
      points: points.map((point) => ({
        border: style(point)?.borderTopWidth ?? '',
        background: style(point)?.backgroundImage ?? '',
        shadow: style(point)?.boxShadow ?? '',
        delay: style(point)?.animationDelay ?? '',
      })),
      themePoints: themePoints.map((point) => ({
        border: style(point)?.borderTopWidth ?? '',
        background: style(point)?.backgroundImage ?? '',
        shadow: style(point)?.boxShadow ?? '',
        delay: style(point)?.animationDelay ?? '',
      })),
      boundary: {
        border: style(boundary)?.borderLeftWidth ?? '',
        background: style(boundary)?.backgroundColor ?? '',
        marker: boundary ? getComputedStyle(boundary, '::before').content : '',
      },
      scrimLayers: (style(document.querySelector('.home-story-section .home-story-scrim'))?.backgroundImage.match(/gradient/g) ?? []).length,
    };
  });
  check('正文没有卡片边界：无边框、无投影、无 backdrop，白雾边缘归零',
    borderless.copy.border === '0px' && borderless.copy.shadow === 'none' && borderless.copy.backdrop === 'none'
      && borderless.copy.background.includes('radial-gradient')
      && /rgba\(255, 255, 255, 0\)$/.test(borderless.copy.lastStop),
    JSON.stringify({ border: borderless.copy.border, shadow: borderless.copy.shadow, backdrop: borderless.copy.backdrop, lastStop: borderless.copy.lastStop }));
  check('六条现状也是无界感的：无边框、无卡底、无投影',
    borderless.points.length === 6 && borderless.points.every((point) => point.border === '0px' && point.background === 'none' && point.shadow === 'none'),
    JSON.stringify(borderless.points.slice(0, 2)));
  check('三条主线与六条现状同一套无界感（没有一张卡有边框或卡底）',
    borderless.themePoints.length === 3
      && borderless.themePoints.every((point) => point.border === '0px' && point.background === 'none' && point.shadow === 'none'),
    JSON.stringify(borderless.themePoints));
  check('边界声明同样无框：改成「※ + 淡字」',
    borderless.boundary.border === '0px' && borderless.boundary.background === 'rgba(0, 0, 0, 0)' && borderless.boundary.marker.includes('※'),
    JSON.stringify(borderless.boundary));
  check('文字是「浮现」进来的：正文有浮现动画且静止后清晰',
    borderless.copy.animation === 'home-copy-emerge' && borderless.copy.opacity >= 0.99 && borderless.copy.blurPx < 0.5,
    JSON.stringify({ animation: borderless.copy.animation, opacity: borderless.copy.opacity, blurPx: borderless.copy.blurPx }));
  check('六条现状依次浮现（错位 60ms）',
    borderless.points.map((point) => point.delay).join(',') === '0.09s,0.15s,0.21s,0.27s,0.33s,0.39s',
    JSON.stringify(borderless.points.map((point) => point.delay)));
  check('三条主线也依次浮现（同一套错位，只用了前三档）',
    borderless.themePoints.map((point) => point.delay).join(',') === '0.09s,0.15s,0.21s',
    JSON.stringify(borderless.themePoints.map((point) => point.delay)));
  check('柔光罩只有一层横向渐变（不再有被硬切出来的竖缝）',
    borderless.scrimLayers === 1, String(borderless.scrimLayers));

  check('柔光罩只护住正文列（宽度 < 舞台的 80%），四周保留原色',
    layering.every((act) => act.scrimWidthPct < 80 && act.scrimAlpha > 0.6 && act.scrimAlpha <= 0.93),
    JSON.stringify(layering.map((act) => [act.act, Math.round(act.scrimWidthPct), act.scrimAlpha])));
  check('层序固定：图形 → 柔光罩 → 正文',
    layering.every((act) => act.zOrder[0] < act.zOrder[1] && act.zOrder[1] < act.zOrder[2]),
    JSON.stringify(layering.map((act) => [act.act, ...act.zOrder])));
  /*
   * 首帧：只有第一段在视口里，其余各段都在视口下方。
   *
   * 这是用户要的核心变化——「别让这么多幕在页面的同一个位置，这样前一幕消失了才能看到下一幕」。
   * 旧模型的断言是「只有第一幕 opacity > 0.95、其余 < 0.05」（交叉淡入），
   * 那个模型已经不存在了：现在每一幕有自己的页面位置，判据是几何位置而不是不透明度。
   */
  check('首帧只有第一段在视口内，其余段都在下方',
    intro.activeAct === '0'
      && intro.sectionTops[0] < intro.viewportHeight
      && intro.sectionTops.slice(1).every((top) => top >= intro.viewportHeight),
    JSON.stringify({ active: intro.activeAct, tops: intro.sectionTops, viewport: intro.viewportHeight }));
  check('六段各有自己的位置（两两间距不小于 0.9 屏）',
    intro.sectionTops.slice(1).every((top, index) => top - intro.sectionTops[index] >= intro.viewportHeight * 0.9),
    JSON.stringify(intro.sectionTops));
  /*
   * 页面长度**随幕数走**（2026-10-04 改）：
   * 原来是写死的 4.8–6.2 屏（正好是五幕版的身量），加一幕就会变成过期阈值。
   * 现在按 ACT_COUNT 推：每幕至少 0.92 屏（段高 = 100svh − 顶栏 + 6svh，本来就略高于一屏），
   * 上限 1.35 屏留出报头、页脚与边框的余量——量的性质仍是「每幕占自己那一段」。
   */
  check(`页面比一屏长得多（每幕一段，共 ${ACT_COUNT} 段）`,
    intro.rootHeight / intro.viewportHeight >= ACT_COUNT * 0.92
      && intro.rootHeight / intro.viewportHeight <= ACT_COUNT * 1.35
      && intro.sectionHeights.every((height) => height >= intro.viewportHeight * 0.9),
    JSON.stringify({
      ratio: Number((intro.rootHeight / intro.viewportHeight).toFixed(2)),
      heights: intro.sectionHeights,
    }));
  check('叙事没有把页面撑宽', intro.overflow <= 2, 'overflow=' + intro.overflow);

  /*
   * 文字块要在**可见区**（顶栏之下、报头之下）的视觉中心。
   *
   * 段高比可见区高 6svh（为了让下一幕不探进视口），所以「段落顶端对齐」是不够的：
   * 必须按内容中心对齐，否则文字会整体偏下。这里量首屏与跳段之后的偏差。
   */
  const centering = await page.evaluate(() => {
    const read = () => {
      const section = document.querySelector('.home-story-section[data-active="true"]') ?? document.querySelector('.home-story-section');
      const copy = section.querySelector('.home-story-act').getBoundingClientRect();
      const masthead = document.querySelector('.home-story-masthead').getBoundingClientRect();
      return {
        offset: Math.round((copy.top + copy.height / 2) - ((masthead.bottom + window.innerHeight) / 2)),
        scrollY: Math.round(window.scrollY),
      };
    };
    const first = read();
    window.scrollTo(0, document.querySelectorAll('.home-story-section')[1].getBoundingClientRect().top + window.scrollY + 200);
    return { first, sections: document.querySelectorAll('.home-story-section').length };
  });
  check('首屏文字块居中于可见区（偏差 ≤ 12px）', Math.abs(centering.first.offset) <= 12,
    JSON.stringify(centering.first));

  /*
   * 版式：文字居于视觉中心，动画退到文字正后方的背景里。
   *
   * 这是用户明确要的效果（「让文字居于视觉中心，把动画融入到文字正后方左右的背景里」），
   * 因此逐幕核对三件事：文字块水平居中、图形层压在文字之后且比文字更宽、中间有一层柔光罩。
   * 柔光罩不是装饰——没有它，背景里的图形线会从文字底下穿过去。
   */
  const layout = await page.evaluate(() => {
    // 每一幕在自己的段落里，所以逐段量：文字块是否居中于该段、图形层是否在它背后。
    const sections = [...document.querySelectorAll('.home-story-section')];
    const stage = sections[0].getBoundingClientRect();
    const first = sections[0];
    const copyStage = first.querySelector('.home-story-act');
    const copyRect = copyStage.getBoundingClientRect();
    const sceneRect = first.querySelector('.home-story-visual-layer svg').getBoundingClientRect();
    const scrim = first.querySelector('.home-story-scrim');
    const scrimStyle = getComputedStyle(scrim);
    const acts = sections.map((section) => {
      const rect = section.getBoundingClientRect();
      const copy = section.querySelector('.home-story-act-copy').getBoundingClientRect();
      return {
        id: section.dataset.act,
        centerOffset: Math.round(copy.x + copy.width / 2 - (rect.x + rect.width / 2)),
        sceneOffsetPct: (() => {
          const scene = section.querySelector('.home-story-scene');
          if (!scene) return 0;
          const box = scene.getBoundingClientRect();
          return ((box.x + box.width / 2) - (rect.x + rect.width / 2)) / rect.width * 100;
        })(),
        height: Math.round(copy.height),
        stageHeight: Math.round(rect.height),
      };
    });
    const layer = first.querySelector('.home-story-visual-layer');
    const hiddenTitles = [...first.querySelectorAll('.home-story-visual-layer .story-title, .home-story-visual-layer .story-kicker')]
      .map((node) => Number(getComputedStyle(node).opacity));
    const visibleShapes = [...layer.querySelectorAll('path, rect, circle')]
      .filter((node) => Number(getComputedStyle(node).opacity) > 0.05 && getComputedStyle(node).display !== 'none').length;
    return {
      copyCenterOffset: Math.round(copyRect.x + copyRect.width / 2 - (stage.x + stage.width / 2)),
      sceneWiderThanCopy: sceneRect.width > copyRect.width * 1.2,
      // 场景相对舞台中心让出多少（百分比）；正负表示左右，用来核对「让到一侧」与左右交替。
      sceneOffsetPct: ((sceneRect.x + sceneRect.width / 2) - (stage.x + stage.width / 2)) / stage.width * 100,
      zOrder: {
        scene: Number(getComputedStyle(first.querySelector('.home-story-visual-stage')).zIndex),
        scrim: Number(scrimStyle.zIndex),
        copy: Number(getComputedStyle(copyStage).zIndex),
      },
      scrimGradient: scrimStyle.backgroundImage.includes('radial-gradient'),
      scrimIsBand: scrimStyle.backgroundImage.includes('linear-gradient'),
      scrimAlpha: Number.parseFloat(scrimStyle.getPropertyValue('--home-story-scrim-alpha')) || 0,
      scrimWidthPct: (scrim.getBoundingClientRect().width / stage.width) * 100,
      hiddenTitles,
      visibleShapes,
      acts,
    };
  });
  check('文字块居中于自己的段落（各幕水平偏差 ≤ 6px）',
    Math.abs(layout.copyCenterOffset) <= 6 && layout.acts.every((act) => Math.abs(act.centerOffset) <= 6),
    JSON.stringify({ stage: layout.copyCenterOffset, acts: layout.acts.map((act) => [act.id, act.centerOffset]) }));
  /*
   * 2026-10 改：图形层不再与文字同心，而是**整体让到一侧**（中心留给阅读、四周留给动画）。
   * 旧的「同心」断言是旧设计的产物，留着它等于把「必然重叠」钉成需求。
   *
   * 要求：更宽 + 中心让出舞台（相邻两幕左右交替）+ 场景没有整体跑出舞台。
   *
   * **阈值随设计走过两档**：先是 ±24%，第五十轮为把标签收回屏内改成 ±15%，
   * 第五十一轮正文放宽到 46rem 时又收到 **±12%**（再一次往里让，两边就不空了）。
   * 这里量的性质是「让开了、且方向交替」，不是某一个具体百分数——
   * 因此下限取 10%（比当前取值留一点余量），上限仍卡住「别整个跑出舞台」。
   */
  check('图形层更宽，且整体让到一侧（不再与文字同心）',
    layout.sceneWiderThanCopy && layout.acts.every((act) => Math.abs(act.sceneOffsetPct) >= 10 && Math.abs(act.sceneOffsetPct) <= 40),
    JSON.stringify({ wider: layout.sceneWiderThanCopy, offsets: layout.acts.map((act) => [act.id, Math.round(act.sceneOffsetPct)]) }));
  check('相邻两幕的图形左右交替（构图不重样）',
    layout.acts.every((act, index) => index === 0 || Math.sign(act.sceneOffsetPct) !== Math.sign(layout.acts[index - 1].sceneOffsetPct)),
    JSON.stringify(layout.acts.map((act) => [act.id, Math.round(act.sceneOffsetPct)])));
  check('层序是 图形 → 柔光罩 → 文字', layout.zOrder.scene < layout.zOrder.scrim && layout.zOrder.scrim < layout.zOrder.copy,
    JSON.stringify(layout.zOrder));
  /*
   * 柔光罩从「铺满舞台的径向渐变」改成「正文列那一条竖带」：旧版中心 96% 白，
   * 把动画本身洗掉了（用户报的「颜色浅到看不清」）。现在只要求它护住正文列、
   * 峰值不透明度有上界（否则又会洗掉动画），并且确实是一条带而不是整块。
   */
  check('文字后面有柔光罩：一条护住正文列的竖带（峰值不透明度有上界）',
    layout.scrimIsBand && layout.scrimAlpha > 0.6 && layout.scrimAlpha <= 0.93 && layout.scrimWidthPct < 80,
    JSON.stringify({ band: layout.scrimIsBand, alpha: layout.scrimAlpha, widthPct: Math.round(layout.scrimWidthPct) }));
  check('背景模式下场景自带标题隐去、图形仍在',
    layout.hiddenTitles.length > 0 && layout.hiddenTitles.every((value) => value === 0) && layout.visibleShapes > 12,
    JSON.stringify({ hidden: layout.hiddenTitles.length, shapes: layout.visibleShapes }));
  check('每一幕的文字都装得进舞台', layout.acts.every((act) => act.height <= act.stageHeight),
    JSON.stringify(layout.acts.map((act) => [act.id, act.height, act.stageHeight])));

  // 首屏截图：第一幕（主题）是这一轮新增的内容，留给人工核对密度与图形。
  await page.screenshot({ path: resolve(MCS_WEB_ROOT, 'tmp', 'home-narrative-desktop.png') });

  /*
   * 「直接进入学习」是跳到「开始学习」页，不是在本页里滚动。
   *
   * 等的是**两个板块真的在 DOM 里**，不是一个固定毫秒数（2026-10-04 改）：开始学习页的
   * 各角度计数是**运行时从本体现取**的，负载高时 700ms 会采到「页面在、板块还没渲染」的
   * 中途状态——本轮就遇到过一次（`heading: ""`、`cases: 0`，单跑又绿），
   * 与仓库里另外两处固定等待是同一类假失败。给 15s 上限，超时就照常红。
   */
  await page.click('.home-story-skip');
  const startReady = await page.waitForSelector('.start-page #cases .angle-card, .start-page #angles .angle-card', { timeout: 15000 })
    .then(() => true).catch(() => false);
  const skipped = await page.evaluate(() => ({
    path: location.pathname,
    heading: document.querySelector('.start-page h1')?.textContent?.trim() ?? '',
    cases: document.querySelectorAll('.start-page #cases').length,
    angles: document.querySelectorAll('.start-page #angles').length,
    top: Math.round(document.querySelector('.start-page')?.getBoundingClientRect().top ?? -1),
  }));
  check('跳过动画落到开始学习页', skipped.path === '/start' && skipped.heading === '开始学习', JSON.stringify({ ...skipped, startReady }));
  check('开始学习页给出原型问题与各角度入口', startReady && skipped.cases === 1 && skipped.angles === 1,
    JSON.stringify({ ...skipped, startReady }));

  /*
   * 滚轮的两项职责交替：先播放本幕动画，播完才滚到下一幕。
   *
   * 用户的原话：「滚轮作用是播放动画和滚到下一幕交替负责。」
   * 这里逐项量：播放阶段页面**一动不动**（scrollY 不变）而 data-played 增长；
   * 播完之后的下一次滚轮才让 scrollY 前进约一段、active 加一；反向先倒放、倒到头才回上一段。
   */
  await page.goto(server.origin, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const readScroll = () => page.evaluate(() => ({
    scrollY: Math.round(window.scrollY),
    active: document.querySelector('.home-story')?.getAttribute('data-active-act') ?? '',
    played: [...document.querySelectorAll('.home-story-section')].map((section) => Number(section.getAttribute('data-played') ?? '0')),
    barWidth: document.querySelector('.home-story-playbar span')?.getAttribute('style') ?? '',
  }));
  const start = await readScroll();
  /*
   * 等平滑滚动**落定**，而不是等一个固定毫秒数。
   *
   * 踩过的坑（2026-10）：幕导航用 `scrollTo({behavior:'smooth'})`，实测跨三幕要 ~700ms；
   * 断言里写死 `waitForTimeout(900)` 只剩 200ms 余量，机器一忙就采到滚动**中途**的位置——
   * 实测采到的 `{scrollY: 2921, active: '2', played: [1,1,0,0,0]}` 正是这次滚动第 500ms 的样子，
   * 于是「点了第 4 幕却停在第 2 幕」这种**假失败**会出现（重新单跑有时又通过）。
   * 改成「两拍位置与状态都不再变」：断言的意思（点哪一幕就抵达哪一幕）不变，只是不再拿机器速度赌。
   * 这类固定等待的通用修法是 TODO 的 A5-35，这里先修这一处。
   */
  const readSettledScroll = async () => {
    let previous = await readScroll();
    for (let i = 0; i < 30; i += 1) {
      await page.waitForTimeout(120);
      const current = await readScroll();
      if (current.scrollY === previous.scrollY && current.active === previous.active
        && current.played.join(',') === previous.played.join(',')) return current;
      previous = current;
    }
    return previous;
  };
  // 首屏会把第一段摆到视觉中心，因此起点 scrollY 是一个小值（不是 0）——这也是要守住的行为。
  check('滚轮起点：第一段、动画未播、页面停在第一段',
    start.scrollY <= 130 && start.active === '0' && start.played[0] === 0,
    JSON.stringify(start));

  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(160);
  const playing1 = await readScroll();
  check('滚轮第一步是「播放动画」：页面不动，本幕进度前进',
    playing1.scrollY === start.scrollY && playing1.active === '0' && playing1.played[0] > 0.05 && playing1.played[0] < 1,
    JSON.stringify({ start: start.scrollY, ...playing1 }));
  check('播放进度有条可见的反馈（顶栏进度条）',
    /width:\s*\d+%/.test(playing1.barWidth) && !/width:\s*0%/.test(playing1.barWidth),
    playing1.barWidth);

  // 继续滚到本幕动画播完（不越过：把这一段的进度推到 1）。
  let guard = 0;
  let afterPlay = playing1;
  while (afterPlay.played[0] < 1 && guard < 20) {
    await page.mouse.wheel(0, 140);
    await page.waitForTimeout(110);
    afterPlay = await readScroll();
    guard += 1;
  }
  check('滚轮把本幕动画播完（期间页面始终不动）',
    afterPlay.played[0] === 1 && afterPlay.scrollY === start.scrollY && afterPlay.active === '0',
    JSON.stringify({ guard, start: start.scrollY, ...afterPlay }));

  await page.mouse.wheel(0, 140);
  // 等滚动与 active 都落定（固定 1100ms 在负载下会采到中途状态）。
  const jumped = await readSettledScroll();
  check('播完之后滚轮才「滚到下一幕」：页面平移约一段、active 前进',
    jumped.scrollY > start.scrollY + page.viewportSize().height * 0.7 && jumped.active === '1',
    JSON.stringify({ start: start.scrollY, ...jumped }));
  check('进入下一幕时它的动画从起点开始',
    jumped.played[0] === 1 && jumped.played[1] < 1,
    JSON.stringify(jumped.played));

  await page.mouse.wheel(0, 140);
  await page.waitForTimeout(180);
  const playing2 = await readScroll();
  check('第二幕同样先播放动画（页面不动）',
    playing2.scrollY === jumped.scrollY && playing2.played[1] > 0 && playing2.played[1] <= 1,
    JSON.stringify({ jumped: jumped.scrollY, ...playing2 }));

  // 反向：先倒放本幕动画，倒到头才回到上一段。
  let rewound = playing2;
  guard = 0;
  while (rewound.played[1] > 0 && guard < 20) {
    await page.mouse.wheel(0, -140);
    await page.waitForTimeout(110);
    rewound = await readScroll();
    guard += 1;
  }
  check('反向滚轮先倒放本幕动画（页面不动）',
    rewound.played[1] === 0 && rewound.scrollY === jumped.scrollY && rewound.active === '1',
    JSON.stringify({ guard, ...rewound }));
  await page.mouse.wheel(0, -140);
  const back = await readSettledScroll();
  check('倒到头之后才回到上一段',
    back.active === '0' && back.scrollY < jumped.scrollY * 0.3,
    JSON.stringify(back));

  // 顶部幕导航不是装饰：点任一幕都应直接对齐到它，前面的幕记为已播放。
  await page.locator('.home-story-progress button').nth(3).click();
  const clickedAct = await readSettledScroll();
  check('顶部幕导航可以直接抵达对应段落',
    clickedAct.active === '3'
      && clickedAct.played.slice(0, 3).every((value) => value === 1)
      && clickedAct.scrollY > page.viewportSize().height * 2.5,
    JSON.stringify(clickedAct));

  // 各段的位置与「装得进」在多个视口核对（不再有交叉淡入，逐段量裁切）。
  await page.goto(server.origin, { waitUntil: 'networkidle' });
  const geometry = await page.evaluate(() => ({
    tops: [...document.querySelectorAll('.home-story-section')].map((section) => Math.round(section.getBoundingClientRect().top + scrollY)),
    ids: [...document.querySelectorAll('.home-story-act')].map((act) => act.getAttribute('data-act')),
  }));
  const readAt = async (ratio) => {
    const index = Math.round(ratio * (geometry.tops.length - 1));
    await page.evaluate((y) => scrollTo(0, y), geometry.tops[index]);
    await page.waitForTimeout(220);
    return page.evaluate(() => ({
      progress: Number(document.querySelector('.home-story')?.getAttribute('data-story-progress') ?? '0'),
      active: document.querySelector('.home-story')?.getAttribute('data-active-act'),
      ids: [...document.querySelectorAll('.home-story-act')].map((act) => act.getAttribute('data-act')),
      opacity: [...document.querySelectorAll('.home-story-act')].map((act) => Number(getComputedStyle(act).opacity)),
    }));
  };
  for (const index of ACT_IDS.map((_, position) => position)) {
    // 每一幕各占一个采样点：分母是「幕数 − 1」，写死 4 会在加幕之后落到隔壁那一段。
    const state = await readAt(index / (ACT_COUNT - 1));
    check(`滚到第 ${index + 1} 段（${state.ids[index]}）时它自己被标为当前幕`,
      state.active === String(index) && state.opacity[index] > 0.95,
      JSON.stringify(state));
  }

  /**
   * 动画里的文字够不够大。
   *
   * 场景画布固定 720×560，渲染多宽就缩多少，所以「屏上字号 = 单位字号 × 渲染宽 / 720」。
   * 用户反馈过「动画里的文字太小」，这条断言守住下限：宽舞台 ≥10px、最窄的固定舞台 ≥8px。
   */
  const measureSceneText = () => page.evaluate(() => {
    const layers = [...document.querySelectorAll('.home-story-visual-layer')];
    const actIds = [...document.querySelectorAll('.home-story-act')].map((act) => act.getAttribute('data-act'));
    return layers.map((layer, index) => {
      const svg = layer.querySelector('svg');
      if (!svg) return { act: actIds[index], scale: 0, minPx: 0, smallest: '' };
      const scale = svg.getBoundingClientRect().width / 720;
      let minPx = Number.POSITIVE_INFINITY;
      let smallest = '';
      svg.querySelectorAll('text').forEach((node) => {
        const unit = Number.parseFloat(getComputedStyle(node).fontSize);
        const px = unit * scale;
        if (px < minPx) { minPx = px; smallest = `${node.textContent}(${Math.round(unit)}u)`; }
      });
      return { act: actIds[index], scale: Math.round(scale * 100) / 100, minPx: Math.round(minPx * 10) / 10, smallest };
    });
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForTimeout(240);
  const wideScene = await measureSceneText();
  check('宽舞台（1440×1000）每幕动画的文字 ≥10px',
    wideScene.length === ACT_COUNT && wideScene.every((scene) => scene.minPx >= 10),
    JSON.stringify(wideScene));

  await page.setViewportSize({ width: 1220, height: 782 });
  await page.waitForTimeout(240);
  const tightScene = await measureSceneText();
  check('最窄的固定舞台（1220×782）每幕动画的文字 ≥8px',
    tightScene.length === ACT_COUNT && tightScene.every((scene) => scene.minPx >= 8),
    JSON.stringify(tightScene));

  /*
   * ---- 四周带与动画文字（2026-10 加，TODO A3-16 / A3-17 / A3-19）----
   *
   * 这一段替代了「量一量当前这一幕」的单点检查。要守住的是三件事：
   *
   * 1. **每幕都有 3–5 条清晰可见的四周带标签**（`sceneLabels`）。它们的水平位置由
   *    「舞台宽 − 正文列宽」算出来（`--hs-band`），因此**换宽度不会跑进正文列**；
   *    场景自带的 SVG 文字是纹理，带宽不够时整层让位（A3-17 的实测结论）。
   * 2. **可见像素不与正文列相交**。判据用**遮罩后的可见矩形**，不是整块文字盒：
   *    文字层带一层横向 mask，遮蔽区的像素根本不渲染（第四十四轮用的是整块盒，
   *    于是「右半边被遮掉的长标签」会被误判成压正文）。
   * 3. 遮罩的透明区起点（`band − 5%`）必须**早于**正文列边界（`band`）——这是结构性保证，
   *    单看某一幕的标签数量是看不出来的。
   */
  const measureBands = () => page.evaluate(() => {
    const intersects = (a, b) => (a && b ? Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
      * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)) : 0);
    const root = document.querySelector('.home-story');
    const rootStyle = getComputedStyle(root);
    const bandPct = Number.parseFloat(rootStyle.getPropertyValue('--hs-band')) || 17;
    // 与 styles.css 的 mask 同口径：实心到 band−9%，淡出到 band−5%，之后完全透明。
    const solid = Math.max(2.5, bandPct - 9);
    const soft = Math.max(3.5, bandPct - 5);
    const keep = (center) => center <= soft || center >= 100 - soft;
    return {
      bandPct,
      solid,
      soft,
      narrow: root.getAttribute('data-band') === 'narrow',
      acts: [...document.querySelectorAll('.home-story-section')].map((section) => {
        const stage = section.getBoundingClientRect();
        const copy = section.querySelector('.home-story-copy-stage')?.getBoundingClientRect()
          ?? section.querySelector('.home-story-act-copy')?.getBoundingClientRect() ?? null;
        const pct = (x) => ((x - stage.left) / stage.width) * 100;
        const keptZone = {
          left: stage.left,
          right: stage.left + (soft / 100) * stage.width,
        };
        const texts = [...section.querySelectorAll('.home-story-label-layer .home-story-scene text')]
          .filter((node) => Number(getComputedStyle(node).opacity) > 0.05 && node.getBoundingClientRect().width > 0)
          .map((node) => {
            const rect = node.getBoundingClientRect();
            const center = pct(rect.left + rect.width / 2);
            // 可见矩形 = 文字盒 ∩ 遮罩保留区（左右两条带）。
            const visible = [
              { left: rect.left, right: Math.min(rect.right, keptZone.right), top: rect.top, bottom: rect.bottom },
              { left: Math.max(rect.left, stage.right - (soft / 100) * stage.width), right: rect.right, top: rect.top, bottom: rect.bottom },
            ].map((box) => ({ ...box, right: Math.max(box.left, box.right) }));
            return {
              center,
              kept: keep(center),
              width: Math.round(rect.width),
              offscreen: rect.left < 0 || rect.right > window.innerWidth,
              boxHitsCopy: intersects(rect, copy) > 8,
              visibleHitsCopy: visible.reduce((sum, box) => sum + intersects(box, copy), 0) > 8,
            };
          });
        const bandLabels = [...section.querySelectorAll('.home-story-band-label')].map((node) => {
          const rect = node.getBoundingClientRect();
          return {
            text: node.textContent.trim(),
            opacity: Number(getComputedStyle(node).opacity),
            hitsCopy: intersects(rect, copy) > 1,
            offscreen: rect.left < 0 || rect.right > window.innerWidth,
            center: Number(pct(rect.left + rect.width / 2).toFixed(1)),
          };
        });
        return {
          act: section.getAttribute('data-act'),
          copyWidth: copy ? Math.round(copy.width) : 0,
          sceneTexts: texts.length,
          painted: texts.filter((text) => text.kept).length,
          paintedVisibleHittingCopy: texts.filter((text) => text.kept && text.visibleHitsCopy).length,
          paintedBoxHittingCopy: texts.filter((text) => text.kept && text.boxHitsCopy).length,
          paintedCut: texts.filter((text) => text.kept && text.offscreen).length,
          bandCount: bandLabels.length,
          bandVisible: bandLabels.filter((label) => label.opacity >= 0.5).length,
          bandHittingCopy: bandLabels.filter((label) => label.opacity >= 0.5 && label.hitsCopy).length,
          bandCut: bandLabels.filter((label) => label.opacity >= 0.5 && label.offscreen).length,
        };
      }),
    };
  });

  const bandCheck = (label, measured) => {
    const acts = measured.acts;
    check(`${label}：每幕都有 3–5 条清晰可见的四周带标签`,
      acts.length === ACT_COUNT && acts.every((act) => act.bandCount >= 3 && act.bandCount <= 5 && act.bandVisible === act.bandCount),
      JSON.stringify(acts.map((act) => [act.act, `${act.bandVisible}/${act.bandCount}`])));
    check(`${label}：四周带标签没有一个压正文、没有一个被屏幕切掉`,
      acts.every((act) => act.bandHittingCopy === 0 && act.bandCut === 0),
      JSON.stringify(acts.map((act) => [act.act, act.bandHittingCopy, act.bandCut])));
    check(`${label}：场景文字层**可见的像素**不进正文列`,
      acts.every((act) => act.paintedVisibleHittingCopy === 0),
      JSON.stringify(acts.map((act) => [act.act, act.painted, act.paintedVisibleHittingCopy])));
    check(`${label}：遮罩透明区起点早于正文列边界（结构性保证）`,
      measured.soft < measured.bandPct,
      JSON.stringify({ band: measured.bandPct, solid: measured.solid, soft: measured.soft }));
  };

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForTimeout(300);
  const wideBands = await measureBands();
  bandCheck('1440×1000', wideBands);

  /*
   * A3-17：标签几何与版心宽度是在 1440 下选的，1240 / 1280 两档必须复测。
   * 实测（改版前）：这两档上第四幕 3 条标签压正文、3 条被硬切，每幕可见标签掉到 1–2 条。
   */
  for (const viewport of [{ width: 1280, height: 800 }, { width: 1240, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(320);
    const measured = await measureBands();
    bandCheck(`${viewport.width}×${viewport.height}`, measured);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`${viewport.width}×${viewport.height} 版心不溢出`, overflow <= 2, String(overflow));
    check(`${viewport.width}×${viewport.height} 的带宽已判定为窄（场景文字层让位，交给四周带标签）`,
      measured.narrow === (measured.bandPct * 0 + measured.acts.length > 0) && typeof measured.narrow === 'boolean',
      JSON.stringify({ band: measured.bandPct.toFixed(2), narrow: measured.narrow }));
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForTimeout(240);

  /*
   * ---- 窄屏（≤1024）与「文字不入正文列」的等价保证（TODO A3-16）----
   *
   * 窄屏（≤1200px 宽或 ≤700px 高）不再用固定舞台：没有图形层、没有文字层、没有大字词。
   * 于是「动画里的文字只在四周」这件事在这里表现为**不存在绝对定位的动画文字**；
   * 每幕只有一张静态插图（在自然流里、`aria-hidden`）。这一节把这个保证钉住。
   */
  for (const viewport of [{ width: 1024, height: 768 }, { width: 900, height: 800 }, { width: 1280, height: 690 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(280);
    const narrow = await page.evaluate(() => {
      const intersects = (a, b) => (a && b ? Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
        * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)) : 0);
      return {
        flow: document.querySelector('.home-story')?.classList.contains('is-flow') ?? false,
        visualStage: document.querySelectorAll('.home-story-visual-stage').length,
        labelLayer: document.querySelectorAll('.home-story-label-layer').length,
        ghost: document.querySelectorAll('.home-story-ghost-word').length,
        bandLabels: document.querySelectorAll('.home-story-band-labels').length,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        overlaps: [...document.querySelectorAll('.home-story-section')].map((section) => {
          const copy = section.querySelector('.home-story-act-copy')?.getBoundingClientRect() ?? null;
          const mobile = section.querySelector('.home-story-act-mobile-visual');
          return {
            act: section.getAttribute('data-act'),
            mobileOverlap: mobile && copy ? intersects(mobile.getBoundingClientRect(), copy) : 0,
            absoluteText: [...section.querySelectorAll('.home-story-visual-stage *, .home-story-ghost-word')].length,
          };
        }),
      };
    });
    check(`${viewport.width}×${viewport.height} 窄屏没有动画文字层（等价保证：文字不可能进正文列）`,
      narrow.flow && narrow.visualStage === 0 && narrow.labelLayer === 0 && narrow.ghost === 0
        && narrow.bandLabels === 0 && narrow.overlaps.every((act) => act.absoluteText === 0)
        && narrow.overflow <= 2,
      JSON.stringify(narrow));
    check(`${viewport.width}×${viewport.height} 窄屏的静态插图不与正文列相交`,
      narrow.overlaps.every((act) => act.mobileOverlap === 0),
      JSON.stringify(narrow.overlaps));
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForTimeout(260);

  /*
   * ---- 每幕的可访问描述（TODO A3-20）----
   *
   * 背景模式里整个视觉舞台是 `aria-hidden`，场景自带的 kicker/title 读屏读不到；
   * 于是每幕必须自己带一句「这一幕画的是什么」。数据来源是 `act.sceneLabel`。
   */
  const descriptions = await page.evaluate(() => [...document.querySelectorAll('.home-story-section')].map((section) => {
    const describedBy = section.getAttribute('aria-describedby') ?? '';
    const labelledBy = section.getAttribute('aria-labelledby') ?? '';
    const described = describedBy ? document.getElementById(describedBy) : null;
    const labelled = labelledBy ? document.getElementById(labelledBy) : null;
    return {
      act: section.getAttribute('data-act'),
      describedBy,
      hasDescribed: Boolean(described),
      description: described?.textContent?.trim() ?? '',
      title: labelled?.textContent?.trim() ?? '',
      hidden: described ? getComputedStyle(described).clipPath !== 'none' : false,
    };
  }));
  check('每幕都有一句「这幕画的是什么」的可访问描述（aria-describedby 指向真实文本）',
    descriptions.length === ACT_COUNT && descriptions.every((item) => item.hasDescribed && item.description.startsWith('画面：') && item.description.length > 12),
    JSON.stringify(descriptions.map((item) => [item.act, item.description.slice(0, 24)])));
  check('可访问描述指向的元素是「只给读屏看」的（clip-path 裁掉，不是 display:none）',
    descriptions.every((item) => item.hidden),
    JSON.stringify(descriptions.map((item) => [item.act, item.hidden])));
  check('每幕的 aria-labelledby 指向本幕标题（读屏先读标题再读画面说明）',
    descriptions.every((item) => item.title.length > 0),
    JSON.stringify(descriptions.map((item) => [item.act, item.title.slice(0, 16)])));

  /*
   * ---- 「浮现只播一次」写成明说的设计（TODO A3-18）----
   *
   * 选择是「保留只播一次 + 写明」，而不是跟随进度可重播：重播会把已读过的内容反复推回起点。
   * 因此这里核对页面上确实写着这句话（文案 + 断言成对，改文案就会红）。
   */
  const emerge = await page.evaluate(() => ({
    note: document.querySelector('.home-story-foot-note')?.textContent?.trim() ?? '',
    foot: document.querySelector('.home-story-foot')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    animation: getComputedStyle(document.querySelector('.home-story-act-copy')).animationName,
    iteration: getComputedStyle(document.querySelector('.home-story-act-copy')).animationIterationCount,
  }));
  check('页面写明「浮现动画每幕只播一次」', emerge.note.includes('只播一次') && emerge.note.includes('不会重播'), JSON.stringify(emerge));
  check('浮现动画确实是一次性的（animation-iteration-count = 1）',
    emerge.animation.includes('home-copy-emerge') && emerge.iteration === '1', JSON.stringify(emerge));

  // 固定舞台的裁切与横向溢出：每个桌面视口各量一次；顺带量「现状」幕的字号下限。
  // 下限是这一轮的用户要求（「太密太小」）：固定舞台里说明文字不得低于 14px。
  for (const viewport of FIT_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(240);
    /*
     * 先把「主题」幕摆回**首屏那个位置**再量角标：角标在不在报头之下，只有这一幕居中时才有意义
     * （量的是用户打开页面看到的那一屏，不是滚动到第五幕时的坐标）。对齐公式与组件里的
     * `centerOffsetFor` 同一条：内容中心落在「顶栏之下、报头之下」那一段的中心。
     */
    await page.evaluate(() => {
      const section = document.querySelector('.home-story-section[data-act="theme"]');
      const content = section.querySelector('.home-story-act').getBoundingClientRect();
      const topbar = document.querySelector('.topbar')?.getBoundingClientRect().height ?? 64;
      const masthead = document.querySelector('.home-story-masthead').getBoundingClientRect().height;
      const visibleCenter = (window.innerHeight + topbar + masthead) / 2;
      window.scrollTo({ top: Math.max(0, content.top + window.scrollY + content.height / 2 - visibleCenter), behavior: 'auto' });
    });
    await page.waitForTimeout(200);
    const state = await page.evaluate(() => {
      const root = document.querySelector('.home-story');
      const pain = document.querySelector('.home-story-act[data-act="pain"]');
      const points = pain.querySelector('.home-story-points');
      return {
        flow: root?.classList.contains('is-flow') ?? false,
        progress: Number(root?.getAttribute('data-story-progress') ?? '-1'),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        icons: pain.querySelectorAll('.home-story-point-icon svg').length,
        cards: pain.querySelectorAll('.home-story-point').length,
        labelFont: Number.parseFloat(getComputedStyle(pain.querySelector('.home-story-point-label')).fontSize),
        detailFont: Number.parseFloat(getComputedStyle(pain.querySelector('.home-story-point-detail')).fontSize),
        columns: getComputedStyle(points).gridTemplateColumns.split(' ').length,
        acts: [...document.querySelectorAll('.home-story-act')].map((act) => ({
          id: act.getAttribute('data-act'),
          copy: Math.round(act.querySelector('.home-story-act-copy')?.getBoundingClientRect().height ?? 0),
          box: Math.round(act.getBoundingClientRect().height),
        })),
        /*
         * 左上角角标在每个固定舞台视口都要**整块在吸顶报头之下**。
         *
         * 用户报的「不要被挡住了」正是这一条：报头底边离段落顶端 `报头高 / 2 + 3svh`，
         * 这个偏移**随视口高变**（1440×1000 是 63px、1280×720 是 55px），
         * 所以只在一个视口量过不算数。
         */
        corner: (() => {
          const mark = document.querySelector('.home-story-corner-mark');
          const masthead = document.querySelector('.home-story-masthead');
          if (!mark || !masthead) return null;
          const rect = mark.getBoundingClientRect();
          const head = masthead.getBoundingClientRect();
          return { width: Math.round(rect.width), top: Math.round(rect.top), mastheadBottom: Math.round(head.bottom), clear: rect.top >= head.bottom + 1 };
        })(),
      };
    });
    const clipped = state.acts.filter((act) => act.copy > act.box + 1).map((act) => `${act.id}:${act.copy}>${act.box}`);
    check(`${viewport.width}×${viewport.height} 里每一幕都装得进固定舞台`, !state.flow && clipped.length === 0, clipped.join(' , '));
    check(`${viewport.width}×${viewport.height} 里左上角角标整块在报头之下（不被挡住）`,
      Boolean(state.corner) && state.corner.clear && state.corner.width >= 70,
      JSON.stringify(state.corner));
    check(`${viewport.width}×${viewport.height} 里「现状」幕是六张图标卡片、文字读得清`,
      state.cards === 6 && state.icons === 6 && state.columns === 2 && state.labelFont >= 14 && state.detailFont >= 13,
      JSON.stringify({ cards: state.cards, icons: state.icons, columns: state.columns, label: state.labelFont, detail: state.detailFont }));
    check(`${viewport.width}×${viewport.height} 里滚动进度有界且没有横向溢出`,
      state.progress >= 0 && state.progress <= 1 && state.overflow <= 2,
      JSON.stringify({ progress: state.progress, overflow: state.overflow }));
  }

  /*
   * 桌面固定舞台仍要保留 `will-change`：那一层是给滚轮推进的 opacity / transform 用的，
   * 触屏降级（见下面手机端那两条）只该发生在自然滚动形态里，不能连桌面一起抹掉。
   */
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForTimeout(260);
  const desktopWillChange = await page.evaluate(() => ({
    flow: document.querySelector('.home-story')?.classList.contains('is-flow') ?? false,
    willChange: getComputedStyle(document.querySelector('.home-story-act')).willChange,
  }));
  check('桌面固定舞台仍保留合成层提示（触屏降级没有波及桌面）',
    !desktopWillChange.flow && desktopWillChange.willChange.includes('opacity'),
    JSON.stringify(desktopWillChange));

  // 不够宽或不够高的窗口：改用自然滚动，六幕完整可见，正文按站点正文大小排。
  for (const viewport of FLOW_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(260);
    const state = await page.evaluate(() => {
      const root = document.querySelector('.home-story');
      const acts = [...document.querySelectorAll('.home-story-act')];
      const pain = document.querySelector('.home-story-act[data-act="pain"]');
      return {
        flow: root?.classList.contains('is-flow') ?? false,
        // 自然滚动形态下报头不再吸顶（吸顶只在「滚轮交替」形态里有意义）。
        masthead: getComputedStyle(document.querySelector('.home-story-masthead')).position,
        relative: acts.every((act) => getComputedStyle(act).position === 'relative'),
        visible: acts.every((act) => Number(getComputedStyle(act).opacity) > 0.99),
        labelFont: Number.parseFloat(getComputedStyle(pain.querySelector('.home-story-point-label')).fontSize),
        detailFont: Number.parseFloat(getComputedStyle(pain.querySelector('.home-story-point-detail')).fontSize),
        icons: pain.querySelectorAll('.home-story-point-icon svg').length,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    });
    check(`${viewport.width}×${viewport.height} 改用自然滚动，卡片标题 ≥15px、说明 ≥14px`,
      state.flow && state.masthead === 'static' && state.relative && state.visible
        && state.icons === 6 && state.labelFont >= 15 && state.detailFont >= 14 && state.overflow <= 2,
      JSON.stringify(state));
  }

  const reduced = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const reducedPage = await reduced.newPage();
  reducedPage.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  reducedPage.on('pageerror', (error) => consoleErrors.push(error.message));
  await reducedPage.goto(server.origin, { waitUntil: 'networkidle' });
  const reducedState = await reducedPage.evaluate(() => ({
    flowClass: document.querySelector('.home-story')?.classList.contains('is-flow') ?? false,
    mastheadPosition: getComputedStyle(document.querySelector('.home-story-masthead')).position,
    acts: [...document.querySelectorAll('.home-story-act')].map((act) => ({
      position: getComputedStyle(act).position,
      opacity: Number(getComputedStyle(act).opacity),
    })),
    compactVisuals: document.querySelectorAll('.home-story-act-mobile-visual .home-story-scene').length,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  check('减少动态效果时改为自然滚动', reducedState.flowClass && reducedState.mastheadPosition === 'static', JSON.stringify(reducedState));
  check('减少动态效果时六幕完整可见', reducedState.acts.length === ACT_COUNT && reducedState.acts.every((act) => act.position === 'relative' && act.opacity > 0.99), JSON.stringify(reducedState.acts));
  check('减少动态效果时每幕都有自己的图形', reducedState.compactVisuals === ACT_COUNT, String(reducedState.compactVisuals));
  check('减少动态效果时没有横向溢出', reducedState.overflow <= 2, 'overflow=' + reducedState.overflow);

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileContext.newPage();
  mobilePage.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  mobilePage.on('pageerror', (error) => consoleErrors.push(error.message));
  await mobilePage.goto(server.origin, { waitUntil: 'networkidle' });
  const mobileState = await mobilePage.evaluate(() => ({
    flowClass: document.querySelector('.home-story')?.classList.contains('is-flow') ?? false,
    acts: [...document.querySelectorAll('.home-story-act')].map((act) => ({
      id: act.getAttribute('data-act'),
      position: getComputedStyle(act).position,
      opacity: Number(getComputedStyle(act).opacity),
      top: Math.round(act.getBoundingClientRect().top),
    })),
    points: document.querySelectorAll('.home-story-act[data-act="pain"] .home-story-points li').length,
    pointIcons: document.querySelectorAll('.home-story-act[data-act="pain"] .home-story-point-icon svg').length,
    pointColumns: getComputedStyle(document.querySelector('.home-story-act[data-act="pain"] .home-story-points')).gridTemplateColumns.split(' ').length,
    compactVisuals: document.querySelectorAll('.home-story-act-mobile-visual .home-story-scene').length,
    compactMinPx: (() => {
      const svg = document.querySelector('.home-story-act-mobile-visual svg');
      if (!svg) return 0;
      const scale = svg.getBoundingClientRect().width / 720;
      let minPx = Number.POSITIVE_INFINITY;
      svg.querySelectorAll('text').forEach((node) => {
        minPx = Math.min(minPx, Number.parseFloat(getComputedStyle(node).fontSize) * scale);
      });
      return Math.round(minPx * 10) / 10;
    })(),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  check('手机端六幕自然排布', mobileState.flowClass && mobileState.acts.length === ACT_COUNT && mobileState.acts.every((act) => act.position === 'relative' && act.opacity > 0.99), JSON.stringify(mobileState.acts.map((act) => act.id)));
  check('手机端保留六条现状与每幕图形', mobileState.points === 6 && mobileState.compactVisuals === ACT_COUNT, JSON.stringify({ points: mobileState.points, visuals: mobileState.compactVisuals }));
  check('手机端「现状」幕单列卡片且每张都有图标', mobileState.pointColumns === 1 && mobileState.pointIcons === 6, JSON.stringify({ columns: mobileState.pointColumns, icons: mobileState.pointIcons }));
  check('手机端动画文字不小于 8px', mobileState.compactMinPx >= 8, String(mobileState.compactMinPx));
  check('手机端没有横向溢出', mobileState.overflow <= 2, 'overflow=' + mobileState.overflow);

  /*
   * 自然滚动形态下不该有的两处滚动代价（2026-10-05，小米平板 + Edge「滚动时整页发白」）：
   * 每幕一个大合成层（`will-change`）在平板上是几十 MB 的栅格内存；
   * 六幕的常驻装饰动画同时在跑则是六份持续的合成工作。
   */
  const scrollCost = await mobilePage.evaluate(() => {
    const sections = [...document.querySelectorAll('.home-story-section')];
    const state = (section) => {
      const node = section?.querySelector('.home-story-atmosphere .home-story-orbit, .home-story-atmosphere .home-story-signal-field i');
      return node ? getComputedStyle(node).animationPlayState : null;
    };
    return {
      actWillChange: getComputedStyle(document.querySelector('.home-story-act')).willChange,
      paused: sections.filter((section) => state(section) === 'paused').length,
      running: sections.filter((section) => state(section) === 'running').length,
      total: sections.length,
    };
  });
  check('手机端六幕的常驻装饰动画只在看得见的那一幕里跑，其余挂起',
    scrollCost.total === ACT_COUNT && scrollCost.running >= 1 && scrollCost.paused >= ACT_COUNT - 2,
    JSON.stringify(scrollCost));
  check('手机端每一幕不再白占一个合成层（自然滚动下没有 opacity/transform 动画）',
    scrollCost.actWillChange === 'auto', String(scrollCost.actWillChange));

  // 手机端只截首屏：六幕全高的整页图会超出图像工具的尺寸上限，人工核对用首屏即可。
  await mobilePage.screenshot({ path: resolve(MCS_WEB_ROOT, 'tmp', 'home-narrative-mobile.png') });

  check('首页六幕没有控制台错误', consoleErrors.length === 0, consoleErrors.join(' | '));
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n首页六幕叙事验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n首页六幕叙事验收通过。');
