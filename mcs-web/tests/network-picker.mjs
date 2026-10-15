import { startTestServer, toggleInAnimatedPage } from './helpers.mjs';

import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/**
 * 右键打开某个节点的菜单，并把菜单上的读数取回来。
 *
 * 两处都踩过坑，所以写在这里：
 * 1. **找得到那个点**：悬浮框浮在画布上层，节点中心可能被面板盖住。与拖动那一段同一条
 *    判据：用 `elementFromPoint` 找一个真能落在节点上的点；一个都找不到时把面板收起来再试，
 *    而不是让测试随机红；
 * 2. **等位置稳定**：往视图里加节点会触发重新摆位，卡片在动画期间会移动——
 *    先量坐标再点，点到的可能已经是空白（第一版就是这样假失败的）。
 */
async function openNodeMenu(page, id) {
  const node = page.locator(`.network-node[data-node="${id}"]`);
  await node.waitFor();
  const hitPoint = () => page.evaluate((nodeId) => {
    const element = document.querySelector(`.network-node[data-node="${nodeId}"]`);
    if (!element) return null;
    const rect = element.querySelector('rect').getBoundingClientRect();
    const spots = [
      [rect.left + rect.width / 2, rect.top + rect.height / 2],
      [rect.left + rect.width * 0.3, rect.top + rect.height / 2],
      [rect.left + rect.width * 0.7, rect.top + rect.height / 2],
      [rect.left + rect.width / 2, rect.top + 4],
      [rect.left + rect.width / 2, rect.bottom - 4],
    ];
    for (const [x, y] of spots) {
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;
      const top = document.elementFromPoint(x, y);
      if (top && element.contains(top)) return { x, y };
    }
    return null;
  }, id);

  let point = await hitPoint();
  if (!point) {
    for (const label of ['显示全部节点面板', '显示推荐加入面板', '显示保存的视图面板', '显示连接类型面板', '显示关系可视化条款面板']) {
      const toggle = page.locator(`input[aria-label="${label}"]`);
      if (await toggle.count() && await toggle.isChecked()) await toggle.uncheck();
    }
    await page.waitForTimeout(300);
    point = await hitPoint();
  }
  /*
   * 还是点不中：多半是节点被排到了视口外（2026-10 起节点数是 231，同样的视图在不同构建下
   * 会被摆到不同位置——根节点一度落在 y≈1183、而视口高 950）。这里把视野平移一次再试，
   * 而不是直接报错：报「点不中」会让人以为是选择器的 bug，与要核验的东西无关。
   */
  if (!point) {
    const offscreen = await page.evaluate((nodeId) => {
      const element = document.querySelector(`.network-node[data-node="${nodeId}"]`);
      const rect = element?.querySelector('rect')?.getBoundingClientRect();
      if (!rect) return null;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const top = document.elementFromPoint(cx, cy);
      return {
        dy: rect.top + rect.height / 2 - window.innerHeight / 2,
        rect: [Math.round(rect.left), Math.round(rect.top), Math.round(rect.width), Math.round(rect.height)],
        blocker: top ? `${top.tagName}.${typeof top.className === 'string' ? top.className : ''}`.slice(0, 80) : 'null',
      };
    }, id);
    if (offscreen && Math.abs(offscreen.dy) > 40) {
      /*
       * 平移的起点必须落在**画布空白处**：画布的平移处理会忽略起点在节点/按钮/输入上的手势
       * （见 `onCanvasPointerDown` 的第一行判断）。这里扫几个候选点，挑一个 elementFromPoint
       * 确实命中 `.network-stage` 自己的位置再拖——不然拖动会被静默忽略（第一版就是这样）。
       */
      const grab = await page.evaluate(() => {
        const stage = document.querySelector('.network-stage');
        const candidates = [[120, 480], [120, 300], [120, 700], [1400, 480], [750, 880], [750, 80]];
        for (const [x, y] of candidates) {
          const top = document.elementFromPoint(x, y);
          if (top && (top === stage || stage?.contains(top))) {
            if (top.closest('.network-node, button, a, input, select, textarea, label')) continue;
            return { x, y };
          }
        }
        return null;
      });
      if (grab) {
        const target = Math.max(60, Math.min(880, grab.y - offscreen.dy));
        await page.mouse.move(grab.x, grab.y);
        await page.mouse.down();
        await page.mouse.move(grab.x, target, { steps: 14 });
        await page.mouse.up();
        await page.waitForTimeout(400);
        point = await hitPoint();
      }
    }
  }
  /*
   * 找不到能点中的位置：把现场信息一起抛出来（节点矩形、视口、画布上的节点数）。
   * 只写「被悬浮框盖住？」会让人反复猜——2026-10 真的猜了一轮。
   */
  if (!point) {
    const diag = await page.evaluate((nid) => {
      const el = document.querySelector(`.network-node[data-node="${nid}"]`);
      const rect = el?.getBoundingClientRect();
      return {
        found: Boolean(el),
        rect: rect ? [Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)] : null,
        viewport: [window.innerWidth, window.innerHeight],
        nodes: document.querySelectorAll('.network-node').length,
      };
    }, id);
    throw new Error(`找不到能点中 ${id} 的位置：${JSON.stringify(diag)}`);
  }
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.up({ button: 'right' });
  await page.locator('.node-menu').waitFor({ timeout: 4000 });
  return page.evaluate(() => {
    const menu = document.querySelector('.node-menu');
    const item = menu?.querySelector('.node-menu-item[data-action="add-hard-prereqs"]');
    return {
      node: menu?.getAttribute('data-node') ?? null,
      total: Number(menu?.getAttribute('data-prereq-total') ?? -1),
      missing: Number(menu?.getAttribute('data-prereq-missing') ?? -1),
      depth: Number(menu?.getAttribute('data-prereq-depth') ?? -1),
      text: item?.textContent?.trim() ?? '',
      disabled: item?.disabled ?? null,
      note: menu?.querySelector('.node-menu-note')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    };
  });
}

/**
 * 左键按住节点 → 强关联节点选择器（2026-10 从右键改到左键）；
 * 右键节点 → 节点菜单（2026-10 加：一键加入全部硬前置 / 从视图移出）。
 *
 * 用户要的手势：「长按节点：强调这个节点、虚化其它节点，并在它附近临时摊开与它强关联的节点；
 * 保持按住把鼠标移到某个候选上，松手就把它放进视图。」（2026-10 由右键长按改为**左键长按**。）
 *
 * 另一条要求是「右键点击节点可选择一键添加所有硬前置」——右键因此从「点一下即移出视图」
 * 改成**打开菜单**：菜单里既有新的「加入全部硬前置」（传递闭包，含间接前置），
 * 也有原来的「从视图移出」（旧行为换了个入口，没有丢）。
 *
 * 这一套按手势的每一步断言：强调与虚化 → 候选从已登记关系/契约来 → 悬停高亮 → 松手加入并落在摊开的位置；
 * 右键菜单按「与本体独立重算的闭包」核对；另外守住四条边界：**右键不再直接改视图**、
 * **左键拖动优先于长按**（拖到一半不弹选择器）、**左键短按仍然打开详情面板**、Esc 取消不加节点。
 */
const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  // 挑一个既有登记关系、又有定义性契约的节点：同胚（零关系但两条契约输入）。
  const source = 'top:homeomorphism';
  const second = 'top:topological-manifold';
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(`${source},${second}`), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-node');
  await page.waitForTimeout(1200);

  const truth = await page.evaluate(async () => {
    const graph = await (await fetch('/api/v2/ontology/graph')).json();
    const ids = new Set(['top:homeomorphism', 'top:topological-manifold']);
    const related = new Set();
    for (const relation of graph.data.relations) {
      if (ids.has(relation.from)) related.add(relation.to);
      if (ids.has(relation.to)) related.add(relation.from);
    }
    for (const action of graph.data.actions) {
      const touches = action.inputs.some((i) => ids.has(i.node)) || action.outputs.some((o) => ids.has(o.node));
      if (!touches) continue;
      for (const input of action.inputs) related.add(input.node);
      for (const output of action.outputs) related.add(output.node);
    }
    for (const id of ids) related.delete(id);
    const titles = Object.fromEntries(graph.data.nodes.map((node) => [node.id, node.title]));
    return { related: [...related].map((id) => ({ id, title: titles[id] ?? id })) };
  });

  // ---- 按住右键：选择器打开 ----
  const sourceBox = await page.locator('.network-node').first().boundingBox();
  const sourceId = await page.locator('.network-node').first().getAttribute('data-node');
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down({ button: 'left' });
  await page.waitForTimeout(420);

  const opened = await page.evaluate(() => {
    const stage = document.querySelector('.network-stage');
    const nodes = [...document.querySelectorAll('.network-node')];
    const source = document.querySelector('.network-node.pick-source');
    const others = nodes.filter((node) => node !== source);
    return {
      picking: stage?.classList.contains('is-picking') ?? false,
      source: source?.getAttribute('data-node') ?? null,
      candidates: [...document.querySelectorAll('.pick-candidate')].map((card) => ({
        node: card.getAttribute('data-node'),
        basis: card.getAttribute('data-basis'),
        strength: Number(card.getAttribute('data-strength')),
        title: card.querySelector('.pick-title')?.textContent ?? '',
      })),
      dimmed: others.map((node) => Number(getComputedStyle(node).opacity)),
      hint: document.querySelector('.pick-hint')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      contextMenuShown: false,
    };
  });
  check('按住左键打开了强关联选择器', opened.picking && Boolean(opened.source), JSON.stringify({ picking: opened.picking, source: opened.source, sourceId }));
  check('被按住的节点被强调、其它节点被虚化',
    opened.source === sourceId && opened.dimmed.length > 0 && opened.dimmed.every((value) => value <= 0.2),
    JSON.stringify({ source: opened.source, dimmed: opened.dimmed }));
  check('候选摊开在节点的周围（至少一个）', opened.candidates.length >= 1, JSON.stringify(opened.candidates));
  check('候选全部来自已登记关系或行动契约',
    opened.candidates.every((candidate) => truth.related.some((item) => item.id === candidate.node)),
    JSON.stringify({ candidates: opened.candidates.map((c) => c.node), related: truth.related.map((r) => r.id) }));
  check('候选带依据与强度（越硬越靠前）',
    /*
     * 允许的依据与 `web/src/node-related.ts` 的 `basis` 取值一一对应，**包含 `thread`**：
     * 话题级条目（线索层）也是一种候选（强度最低一档，排在最后，并标「不参与前置计算」）。
     * 原先这里漏了 `thread`，一直没红只是因为被按住的那些节点恰好没有话题级邻居；
     * 2026-10 的节点合并改了邻域构成，这条脆弱性因此暴露出来。
     */
    opened.candidates.every((candidate) => ['relation', 'produces', 'consumes', 'shared-input', 'thread'].includes(candidate.basis) && candidate.strength > 0)
      && opened.candidates.every((candidate, index) => index === 0 || opened.candidates[index - 1].strength >= candidate.strength),
    JSON.stringify(opened.candidates));
  check('画布上给出操作提示', opened.hint.includes('松开即加入'), opened.hint);

  // ---- 保持按住，把鼠标移到第一个候选上 ----
  const firstCandidate = page.locator('.pick-candidate').first();
  const candidateNode = await firstCandidate.getAttribute('data-node');
  const candidateBox = await firstCandidate.boundingBox();
  await page.mouse.move(candidateBox.x + candidateBox.width / 2, candidateBox.y + candidateBox.height / 2);
  await page.waitForTimeout(260);
  const hovered = await page.evaluate((node) => {
    const card = document.querySelector(`.pick-candidate[data-node="${node}"]`);
    return {
      classes: card?.getAttribute('class') ?? '',
      ring: Boolean(card?.querySelector('.pick-hover-ring')),
      stillPicking: document.querySelector('.network-stage')?.classList.contains('is-picking') ?? false,
    };
  }, candidateNode);
  check('鼠标移到候选上会高亮它', hovered.classes.includes('hovered') && hovered.ring && hovered.stillPicking, JSON.stringify(hovered));

  /*
   * 高亮的**视觉质量**：不许用实心色块盖住节点内容。
   *
   * 用户报的原话：「手势添加节点的时候，节点高亮的视觉效果是直接一个实心颜色遮盖住。」
   * 根因是两个：源节点自己的标题被 `.network-node-label` 的一刀切规则淡到了 0.1（只剩底块 + 描边），
   * 以及悬停候选的呼吸环被更具体的 `.pick-candidate.hovered rect` 覆盖成实心填充。
   * 这几条断言把「强调必须保留内容」写成不变量：文字不透明度、卡面亮度、环只有描边。
   */
  const highlight = await page.evaluate(() => {
    const luminance = (color) => {
      const [r, g, b] = color.match(/[\d.]+/g).slice(0, 3).map(Number).map((value) => {
        const channel = value / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const source = document.querySelector('.network-node.pick-source');
    const others = [...document.querySelectorAll('.network-node')].filter((node) => node !== source);
    const candidate = document.querySelector('.pick-candidate.hovered');
    const ring = candidate?.querySelector('rect.pick-hover-ring') ?? null;
    const style = (element) => (element ? getComputedStyle(element) : null);
    return {
      sourceTitleOpacity: Number(style(source?.querySelector('.network-node-label'))?.opacity ?? 0),
      sourceIdOpacity: Number(style(source?.querySelector('.network-node-id'))?.opacity ?? 0),
      sourceFill: style(source?.querySelector('rect'))?.fill ?? '',
      sourceLuminance: source ? luminance(style(source.querySelector('rect')).fill) : 0,
      otherTitleOpacity: others.map((node) => Number(style(node.querySelector('.network-node-label'))?.opacity ?? 1)),
      candidateFill: style(candidate?.querySelector('rect'))?.fill ?? '',
      candidateLuminance: candidate ? luminance(style(candidate.querySelector('rect')).fill) : 0,
      candidateTitleOpacity: Number(style(candidate?.querySelector('.pick-title'))?.opacity ?? 0),
      ringFill: ring ? style(ring).fill : 'missing',
      ringStrokeWidth: ring ? Number.parseFloat(style(ring).strokeWidth) : 0,
      incidentOpacity: Number(style(document.querySelector('.network-edge.pick-incident'))?.opacity ?? 0),
      plainOpacity: Number(style(document.querySelector('.network-edge:not(.pick-incident)'))?.opacity ?? 0),
    };
  });
  check('强调源节点时**不擦掉它自己的文字**（标题与 ID 都是满不透明）',
    highlight.sourceTitleOpacity >= 0.95 && highlight.sourceIdOpacity >= 0.95,
    JSON.stringify({ title: highlight.sourceTitleOpacity, id: highlight.sourceIdOpacity }));
  check('其它节点仍然虚化（文字不透明度 ≤ 0.25）',
    highlight.otherTitleOpacity.length > 0 && highlight.otherTitleOpacity.every((value) => value <= 0.25),
    JSON.stringify(highlight.otherTitleOpacity));
  check('源节点卡面是浅色水洗，不是实心饱和色块（相对亮度 ≥ 0.85）',
    highlight.sourceLuminance >= 0.85, JSON.stringify({ fill: highlight.sourceFill, luminance: highlight.sourceLuminance }));
  check('悬停候选卡面同样是浅色，文字可读',
    highlight.candidateLuminance >= 0.85 && highlight.candidateTitleOpacity >= 0.95,
    JSON.stringify({ fill: highlight.candidateFill, luminance: highlight.candidateLuminance, title: highlight.candidateTitleOpacity }));
  check('悬停环只有描边（fill: none），不会盖住卡片内容',
    highlight.ringFill === 'none' && highlight.ringStrokeWidth > 0,
    JSON.stringify({ fill: highlight.ringFill, strokeWidth: highlight.ringStrokeWidth }));
  check('与源节点相连的边保持可见，其它边虚化',
    highlight.incidentOpacity > highlight.plainOpacity && highlight.incidentOpacity >= 0.4,
    JSON.stringify({ incident: highlight.incidentOpacity, plain: highlight.plainOpacity }));

  // ---- 松手：候选进入视图，并落在它被摊开的位置附近 ----
  const before = await page.locator('.network-node').count();
  /*
   * 用**世界坐标**比较，不用屏幕坐标。
   *
   * 候选卡画在相机变换里，它的 `transform="translate(x,y)"` 就是世界坐标；
   * 加入后节点落在哪，读 `__mcsPlacementInfo.placed`（同一套世界坐标）。
   * 不再比屏幕位置的原因：加节点之后相机会**平滑居中到新节点**（2026-10 加的行为），
   * 松手前后的屏幕位置不再可比。
   */
  const candidateWorld = await page.evaluate((node) => {
    const card = document.querySelector(`.pick-candidate[data-node="${node}"]`);
    if (!card) return null;
    const match = /translate\(([-\d.]+),([-\d.]+)\)/.exec(card.getAttribute('transform') ?? '');
    return match ? { x: Number(match[1]), y: Number(match[2]) } : null;
  }, candidateNode);
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(900);
  const after = await page.evaluate((node) => {
    const placed = (window.__mcsPlacementInfo?.placed ?? []).find((item) => item.id === node) ?? null;
    return {
      world: placed ? { x: placed.x, y: placed.y } : null,
      nodes: document.querySelectorAll('.network-node').length,
      picking: document.querySelector('.network-stage')?.classList.contains('is-picking') ?? false,
      url: decodeURIComponent(location.search),
      notice: document.querySelector('.network-notice')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      added: [...document.querySelectorAll('.network-node')].map((el) => el.getAttribute('data-node')),
    };
  }, candidateNode);
  check('松手把候选加入视图', after.nodes === before + 1 && after.added.includes(candidateNode) && !after.picking,
    JSON.stringify({ before, after: after.nodes, candidateNode, picking: after.picking }));
  check('新节点写进 URL（可分享、可刷新）', after.url.includes(candidateNode), after.url);
  check('新节点落在它被摊开的位置附近（世界坐标距离 < 260）',
    after.world !== null && candidateWorld !== null
      && Math.hypot(after.world.x - candidateWorld.x, after.world.y - candidateWorld.y) < 260,
    JSON.stringify({ placed: after.world, candidateWorld: candidateWorld }));
  check('加入后有说明（依据 + 只改本页显示）', after.notice.includes('加入视图') && after.notice.includes('本体'), after.notice);

  /*
   * ---- 边界一：右键**打开节点菜单**（2026-10 起；原先右键点一下直接移出视图）----
   *
   * 用户的要求是「右键点击节点可选择一键添加所有硬前置」。一个含义的位置放不下第二件事，
   * 因此右键改成打开菜单：菜单里既有新的「加入全部硬前置」，也有原来的「从视图移出」。
   * 这里核对三件事：右键不再直接动视图、菜单里有那两项、选「移出」仍然真的移出。
   */
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(`${source},${second}`), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-node');
  await page.waitForTimeout(900);
  const quickBox = await page.locator('.network-node').first().boundingBox();
  const quickTarget = await page.locator('.network-node').first().getAttribute('data-node');
  const countBeforeQuick = await page.locator('.network-node').count();
  await page.mouse.move(quickBox.x + quickBox.width / 2, quickBox.y + quickBox.height / 2);
  await page.mouse.down({ button: 'right' });
  await page.waitForTimeout(80);
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(400);
  const quick = await page.evaluate(() => ({
    nodes: document.querySelectorAll('.network-node').length,
    picking: document.querySelector('.network-stage')?.classList.contains('is-picking') ?? false,
    menu: document.querySelector('.node-menu')?.getAttribute('data-node') ?? null,
    menuItems: [...document.querySelectorAll('.node-menu-item')].map((item) => item.getAttribute('data-action')),
    notice: document.querySelector('.network-notice')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  }));
  check('右键点一下打开节点菜单，而不是直接改视图',
    quick.menu === quickTarget && quick.nodes === countBeforeQuick && !quick.picking,
    JSON.stringify({ before: countBeforeQuick, after: quick.nodes, menu: quick.menu, target: quickTarget }));
  check('菜单里有「加入全部硬前置」与「从视图移出」两项',
    quick.menuItems.includes('add-hard-prereqs') && quick.menuItems.includes('remove-from-view'),
    JSON.stringify(quick.menuItems));
  await page.locator('.node-menu-item[data-action="remove-from-view"]').click();
  await page.waitForTimeout(500);
  const quickRemoved = await page.evaluate(() => ({
    nodes: document.querySelectorAll('.network-node').length,
    menu: Boolean(document.querySelector('.node-menu')),
    notice: document.querySelector('.network-notice')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  }));
  check('菜单里的「从视图移出」仍然真的移出（旧行为换了个入口，没有丢）',
    quickRemoved.nodes === countBeforeQuick - 1 && !quickRemoved.menu && quickRemoved.notice.includes('移出视图'),
    JSON.stringify({ ...quickRemoved, before: countBeforeQuick }));

  /*
   * ---- 新功能（2026-10）：右键 →「加入全部硬前置」 ----
   *
   * 期望值由**测试自己**从本体的关系里算一遍（不 import 被测模块的同一个实现），
   * 逐条核对：菜单报的数量、真正加进来的集合、以及「已经全在视图里」时的禁用文案。
   */
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent('top:topological-manifold'), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-node');
  await page.waitForTimeout(900);
  const expectedClosure = await page.evaluate(async () => {
    const graph = await (await fetch('/api/v2/ontology/graph')).json();
    const root = 'top:topological-manifold';
    const found = new Set();
    let frontier = [root];
    while (frontier.length) {
      const next = [];
      for (const node of frontier) {
        for (const relation of graph.data.relations) {
          if (relation.kind !== 'hardPrereq' || relation.to !== node) continue;
          if (found.has(relation.from) || relation.from === root) continue;
          found.add(relation.from);
          next.push(relation.from);
        }
      }
      frontier = next;
    }
    return [...found].sort();
  });
  const prereqMenu = await openNodeMenu(page, 'top:topological-manifold');
  check('菜单报的硬前置数量与本体一致（含间接前置）',
    prereqMenu.total === expectedClosure.length && prereqMenu.missing === expectedClosure.length && prereqMenu.depth >= 2,
    JSON.stringify({ ...prereqMenu, expected: expectedClosure.length }));
  check('按钮文案写清「还差几个」，并说明含间接前置与不写本体',
    prereqMenu.text.includes(`（${expectedClosure.length} 个）`) && prereqMenu.disabled === false
      && prereqMenu.note.includes('间接') && prereqMenu.note.includes('不写本体'),
    JSON.stringify(prereqMenu));

  const addedByMenu = page.locator('.node-menu-item[data-action="add-hard-prereqs"]');
  await addedByMenu.click();
  await page.waitForTimeout(1200);
  const afterAdd = await page.evaluate(() => ({
    ids: (new URLSearchParams(location.search).get('nodes') ?? '').split(',').filter(Boolean).sort(),
    canvas: [...document.querySelectorAll('.network-node')].map((node) => node.getAttribute('data-node')).sort(),
    menu: Boolean(document.querySelector('.node-menu')),
    notice: document.querySelector('.network-notice')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  }));
  check('一键加入的正是本体的硬前置闭包（一个不多、一个不少）',
    JSON.stringify(afterAdd.ids) === JSON.stringify([...expectedClosure, 'top:topological-manifold'].sort())
      && JSON.stringify(afterAdd.canvas) === JSON.stringify(afterAdd.ids),
    JSON.stringify({ got: afterAdd.ids, expected: expectedClosure.length }));
  check('加入后有关闭菜单与说明（数量 + 只改本页显示）',
    !afterAdd.menu && afterAdd.notice.includes(`${expectedClosure.length} 个硬前置`) && afterAdd.notice.includes('只改本页显示'),
    afterAdd.notice.slice(0, 160));

  // 已经全在视图里：菜单项禁用并说明，而不是点了没反应。
  const allPresent = await openNodeMenu(page, 'top:topological-manifold');
  check('硬前置都已在视图里时该项禁用并说明',
    allPresent.disabled === true && allPresent.missing === 0 && allPresent.text.includes('都已在本视图里'),
    JSON.stringify(allPresent));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check('Esc 关闭节点菜单', (await page.locator('.node-menu').count()) === 0);

  /*
   * 2026-10 加：用户报过「长按**紧致性**，圈里怎么没有**仿紧**和 **σ-紧**」。
   *
   * 那一次看到的是合并前的旧构建（卡片还显示 `dg:compactness`），但这件事值一条永久断言：
   * 紧致性到 σ-紧 / 仿紧的两条 `scaling` 必须真的出现在摊开的候选里
   * （强度 = 放缩 1.0 × PROOF 0.95），且当候选多于一圈能画下的数量时，
   * 提示里必须**如实写出还有几个**，不静默截断。
   *
   * 位置说明：本块必须放在「硬前置闭包」那一段**之后**。它要把视图换成只有紧致性，
   * 而前面那些断言依赖的正是刚点过「加入全部硬前置」之后的视图；插在中间会让
   * 后面的 helper 在错误的画布上找节点。
   */
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent('top:compactness'), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-node');
  await page.waitForTimeout(900);
  const compactBox = await page.locator('.network-node').first().boundingBox();
  await page.mouse.move(compactBox.x + compactBox.width / 2, compactBox.y + compactBox.height / 2);
  await page.mouse.down({ button: 'left' });
  await page.waitForTimeout(420);
  const compactPick = await page.evaluate(() => ({
    source: document.querySelector('.network-node.pick-source')?.getAttribute('data-node') ?? null,
    candidates: [...document.querySelectorAll('.pick-candidate')].map((card) => ({
      node: card.getAttribute('data-node'),
      basis: card.getAttribute('data-basis'),
      strength: Number(card.getAttribute('data-strength')),
    })),
    hidden: document.querySelector('[data-hidden-count]')?.getAttribute('data-hidden-count') ?? null,
    hint: document.querySelector('.pick-hint')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  }));
  check('长按紧致性摊开的圈里，放缩到 σ-紧与仿紧的两条都在',
    compactPick.source === 'top:compactness'
      && compactPick.candidates.some((c) => c.node === 'top:sigma-compact' && c.basis === 'relation')
      && compactPick.candidates.some((c) => c.node === 'top:paracompactness' && c.basis === 'relation'),
    JSON.stringify(compactPick));
  check('这两条以「登记关系」为依据，强度高于共用前提档（0.14）',
    compactPick.candidates.filter((c) => ['top:sigma-compact', 'top:paracompactness'].includes(c.node))
      .every((c) => c.basis === 'relation' && c.strength > 0.14),
    JSON.stringify(compactPick.candidates));
  check('候选超过一圈能画下的数量时，提示如实写出还剩几个',
    compactPick.hidden === null || (Number(compactPick.hidden) > 0 && compactPick.hint.includes(String(compactPick.hidden))),
    JSON.stringify({ hidden: compactPick.hidden, hint: compactPick.hint }));
  await page.mouse.up({ button: 'left' });

  // 没有登记硬前置的节点：菜单项禁用，并如实说明「没有登记」，不假装可点。
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent('bg:set:function'), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-node');
  await page.waitForTimeout(800);
  const bare = await openNodeMenu(page, 'bg:set:function');
  check('没有硬前置的节点：禁用并如实说明',
    bare.total === 0 && bare.disabled === true && bare.text.includes('没有登记硬前置'),
    JSON.stringify(bare));
  // 点画布空白处关闭（不是只有 Esc 一条路）。
  const bareBox = await page.locator('.network-node[data-node="bg:set:function"]').boundingBox();
  await page.mouse.click(bareBox.x + 4, bareBox.y + bareBox.height + 120);
  await page.waitForTimeout(250);
  check('点空白处也关闭节点菜单', (await page.locator('.node-menu').count()) === 0);

  // ---- 边界三：左键**拖动**不会打开选择器（拖动优先于长按） ----
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(`${source},${second}`), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-node');
  await page.waitForTimeout(900);
  const dragBox = await page.locator('.network-node').first().boundingBox();
  const dragId = await page.locator('.network-node').first().getAttribute('data-node');
  await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2);
  await page.mouse.down({ button: 'left' });
  // 先小幅移动（超过 4px 阈值）再按住不动超过长按时长：仍然是拖动，不该弹出选择器。
  await page.mouse.move(dragBox.x + dragBox.width / 2 + 40, dragBox.y + dragBox.height / 2 + 30, { steps: 6 });
  await page.waitForTimeout(500);
  const duringDrag = await page.evaluate(() => ({
    picking: document.querySelector('.network-stage')?.classList.contains('is-picking') ?? false,
    candidates: document.querySelectorAll('.pick-candidate').length,
  }));
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(500);
  const afterDrag = await page.evaluate((id) => {
    const placed = (window.__mcsPlacementInfo?.placed ?? []).find((item) => item.id === id) ?? null;
    return {
      picking: document.querySelector('.network-stage')?.classList.contains('is-picking') ?? false,
      placed,
      detailOpen: Boolean(document.querySelector('.node-detail, .floating-panel[aria-label="节点详情"]')),
    };
  }, dragId);
  check('拖动超过阈值后即使继续按住，也不会弹出选择器',
    !duringDrag.picking && duringDrag.candidates === 0 && !afterDrag.picking,
    JSON.stringify({ duringDrag, afterDrag: afterDrag.picking }));
  check('拖动确实移动了节点，且不误开详情面板',
    afterDrag.placed !== null && !afterDrag.detailOpen,
    JSON.stringify({ placed: afterDrag.placed, detailOpen: afterDrag.detailOpen }));

  // ---- 边界四：左键短按 = 打开详情面板（旧行为） ----
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(`${source},${second}`), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-node');
  await page.waitForTimeout(900);
  const clickBox = await page.locator('.network-node').first().boundingBox();
  const clickId = await page.locator('.network-node').first().getAttribute('data-node');
  await page.mouse.move(clickBox.x + clickBox.width / 2, clickBox.y + clickBox.height / 2);
  await page.mouse.down({ button: 'left' });
  await page.waitForTimeout(90);
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(700);
  const clicked = await page.evaluate(() => ({
    picking: document.querySelector('.network-stage')?.classList.contains('is-picking') ?? false,
    detail: document.querySelector('.floating-panel[aria-label="节点详情"]')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  }));
  check('左键短按仍然打开详情面板（不被长按手势吃掉）',
    !clicked.picking && clicked.detail.length > 0,
    JSON.stringify({ id: clickId, picking: clicked.picking, detail: clicked.detail.slice(0, 60) }));

  // ---- 边界二：Esc 取消，不加入任何节点 ----
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(`${source},${second}`), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-node');
  await page.waitForTimeout(900);
  const escBox = await page.locator('.network-node').first().boundingBox();
  const countBeforeEsc = await page.locator('.network-node').count();
  await page.mouse.move(escBox.x + escBox.width / 2, escBox.y + escBox.height / 2);
  await page.mouse.down({ button: 'left' });
  await page.waitForTimeout(420);
  check('长按期间可以取消（选择器在）', (await page.locator('.pick-candidate').count()) >= 1);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(500);
  const escaped = await page.evaluate(() => ({
    nodes: document.querySelectorAll('.network-node').length,
    picking: document.querySelector('.network-stage')?.classList.contains('is-picking') ?? false,
    candidates: document.querySelectorAll('.pick-candidate').length,
  }));
  check('Esc 取消后不加入任何节点',
    escaped.nodes === countBeforeEsc && !escaped.picking && escaped.candidates === 0,
    JSON.stringify({ before: countBeforeEsc, ...escaped }));

  /*
   * ---- 触摸：长按阈值与容差单独一档（2026-10 加，TODO A2-11）----
   *
   * 第四十一轮的边界：「选择器按左键触发，触摸设备走同一路径，但阈值（250ms / 4px）是按鼠标定的。」
   * 手指没有「按住不动」这回事（按压必然抖动），而且系统本身把 ~500ms 当长按语义，
   * 于是 250ms/4px 的结果是**轻点被判成长按、长按又被判成拖动**，触屏用户取关联节点这条主路径用不了。
   *
   * 这里用真实的触摸事件（CDP `Input.dispatchTouchEvent`，pointerType 就是 touch，
   * 不是合成一个 MouseEvent 假装）分四种情形核对：
   *   1. 按住 700ms（> 触摸档 500ms）→ 选择器打开，能选候选、松手加入；
   *   2. 按住 300ms（> 鼠标档 250ms、< 触摸档 500ms）→ **不打开**——这正说明触摸走的是自己那一档；
   *   3. 短点 120ms → 打开详情面板，不打开选择器；
   *   4. 触摸拖动（位移 > 12px 容差）→ 移动节点，不打开选择器。
   */
  const touchContext = await browser.newContext({ viewport: { width: 1500, height: 950 }, hasTouch: true });
  const touchPage = await touchContext.newPage();
  const touchErrors = [];
  touchPage.on('console', (message) => { if (message.type() === 'error') touchErrors.push(message.text()); });
  touchPage.on('pageerror', (error) => touchErrors.push(error.message));
  const cdp = await touchContext.newCDPSession(touchPage);
  const touchStart = (x, y) => cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  const touchMove = (x, y) => cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
  const touchEnd = () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const nodeCenter = async (target) => {
    const box = await target.boundingBox();
    return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
  };
  const openPickerState = () => touchPage.evaluate(() => ({
    picking: document.querySelector('.network-stage')?.classList.contains('is-picking') ?? false,
    candidates: document.querySelectorAll('.pick-candidate').length,
  }));

  const touchUrl = server.origin + '/network?nodes=' + encodeURIComponent(`${source},${second}`);

  // 情形 2：300ms（鼠标档会开，触摸档不该开）
  await touchPage.goto(touchUrl, { waitUntil: 'networkidle' });
  await touchPage.waitForSelector('.network-node');
  await touchPage.waitForTimeout(1000);
  const midHoldPoint = await nodeCenter(touchPage.locator('.network-node').first());
  await touchStart(midHoldPoint.x, midHoldPoint.y);
  await touchPage.waitForTimeout(300);
  const afterMidHold = await openPickerState();
  await touchEnd();
  await touchPage.waitForTimeout(400);
  check('触摸按住 300ms 不打开选择器（触摸档比鼠标档长，轻点不会误判成长按）',
    !afterMidHold.picking && afterMidHold.candidates === 0,
    JSON.stringify(afterMidHold));

  // 情形 1：700ms → 选择器打开，移动到候选，松手加入
  await touchPage.goto(touchUrl, { waitUntil: 'networkidle' });
  await touchPage.waitForSelector('.network-node');
  await touchPage.waitForTimeout(1000);
  const touchNodeId = await touchPage.locator('.network-node').first().getAttribute('data-node');
  const holdPoint = await nodeCenter(touchPage.locator('.network-node').first());
  const beforeTouchAdd = await touchPage.locator('.network-node').count();
  await touchStart(holdPoint.x, holdPoint.y);
  await touchPage.waitForTimeout(700);
  const touchOpened = await openPickerState();
  check('触摸按住 700ms 打开选择器（触摸档 500ms 生效）',
    touchOpened.picking && touchOpened.candidates >= 1,
    JSON.stringify({ source: touchNodeId, ...touchOpened }));

  const touchCandidateBox = await touchPage.locator('.pick-candidate').first().boundingBox();
  const touchCandidateNode = await touchPage.locator('.pick-candidate').first().getAttribute('data-node');
  await touchMove(Math.round(touchCandidateBox.x + touchCandidateBox.width / 2), Math.round(touchCandidateBox.y + touchCandidateBox.height / 2));
  await touchPage.waitForTimeout(260);
  const touchHovered = await touchPage.evaluate((node) => ({
    hovered: document.querySelector(`.pick-candidate[data-node="${node}"]`)?.classList.contains('hovered') ?? false,
    picking: document.querySelector('.network-stage')?.classList.contains('is-picking') ?? false,
  }), touchCandidateNode);
  check('手指移到候选上会高亮它（触摸也能选中候选）',
    touchHovered.hovered && touchHovered.picking,
    JSON.stringify(touchHovered));

  await touchEnd();
  await touchPage.waitForTimeout(900);
  const afterTouchAdd = await touchPage.evaluate(() => ({
    nodes: document.querySelectorAll('.network-node').length,
    ids: [...document.querySelectorAll('.network-node')].map((element) => element.getAttribute('data-node')),
    picking: document.querySelector('.network-stage')?.classList.contains('is-picking') ?? false,
  }));
  check('触摸松手把候选加入视图（触屏上这条主路径可用）',
    afterTouchAdd.nodes === beforeTouchAdd + 1 && afterTouchAdd.ids.includes(touchCandidateNode) && !afterTouchAdd.picking,
    JSON.stringify({ before: beforeTouchAdd, after: afterTouchAdd.nodes, candidate: touchCandidateNode }));

  // 情形 3：短点 120ms → 详情面板
  await touchPage.goto(touchUrl, { waitUntil: 'networkidle' });
  await touchPage.waitForSelector('.network-node');
  await touchPage.waitForTimeout(1000);
  const tapPoint = await nodeCenter(touchPage.locator('.network-node').first());
  await touchStart(tapPoint.x, tapPoint.y);
  await touchPage.waitForTimeout(120);
  await touchEnd();
  await touchPage.waitForTimeout(700);
  const touchTap = await touchPage.evaluate(() => ({
    picking: document.querySelector('.network-stage')?.classList.contains('is-picking') ?? false,
    detail: document.querySelector('.floating-panel[aria-label="节点详情"]')?.textContent?.trim() ?? '',
  }));
  check('触摸短点打开详情面板，不打开选择器',
    !touchTap.picking && touchTap.detail.length > 0,
    JSON.stringify({ picking: touchTap.picking, detail: touchTap.detail.slice(0, 40) }));

  // 情形 4：触摸拖动（位移超过 12px 容差）→ 移动节点
  await touchPage.goto(touchUrl, { waitUntil: 'networkidle' });
  await touchPage.waitForSelector('.network-node');
  await touchPage.waitForTimeout(1000);
  const dragStart = await nodeCenter(touchPage.locator('.network-node').first());
  const dragNode = await touchPage.locator('.network-node').first().getAttribute('data-node');
  await touchStart(dragStart.x, dragStart.y);
  await touchMove(dragStart.x + 60, dragStart.y + 40);
  await touchPage.waitForTimeout(500);
  const duringTouchDrag = await openPickerState();
  await touchEnd();
  await touchPage.waitForTimeout(500);
  const afterTouchDrag = await touchPage.evaluate((id) => ({
    placed: (window.__mcsPlacementInfo?.placed ?? []).find((item) => item.id === id) ?? null,
    picking: document.querySelector('.network-stage')?.classList.contains('is-picking') ?? false,
  }), dragNode);
  check('触摸拖动移动节点，不打开选择器',
    !duringTouchDrag.picking && duringTouchDrag.candidates === 0 && !afterTouchDrag.picking
      && afterTouchDrag.placed !== null,
    JSON.stringify({ during: duringTouchDrag, after: afterTouchDrag }));

  check('触摸路径没有控制台错误', touchErrors.length === 0, touchErrors.join(' | '));
  await touchContext.close();

  /*
   * ---- 面板与画布用**同一套**分层强调（2026-10 加，TODO A3-22）----
   *
   * 第四十三轮把画布上的节点与候选卡改成了「浅底 + 描边 + 发光 + 文字变色」四层强调，
   * 但面板里的同类状态（已加入 / 当前选中）还是旧的一个淡紫底，两处不成套。
   * 现在两边都从 `--emphasis-*` 令牌取值；这一节核对**取值真的同源**（不是各自写死的相近色）。
   */
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(`${source},${second}`), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-node');
  await page.waitForTimeout(900);
  await page.locator('input[aria-label="显示全部节点面板"]').check();
  await page.waitForTimeout(500);
  // 挑一个还没进视图的节点：先问索引，再用共享帮助函数点它（TODO A5-35）。
  const firstUnchecked = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('.floating-panel[aria-label="全部节点"] input[type="checkbox"]')];
    return boxes.findIndex((box) => !box.checked);
  });
  const addedPanel = firstUnchecked >= 0
    ? await toggleInAnimatedPage(page, '.floating-panel[aria-label="全部节点"] input[type="checkbox"]', { index: firstUnchecked, expect: true })
    : false;
  await page.waitForTimeout(700);
  const tokenStyles = await page.evaluate(() => {
    const resolve = (name) => {
      const probeElement = document.createElement('span');
      probeElement.style.color = `var(${name})`;
      document.body.append(probeElement);
      const value = getComputedStyle(probeElement).color;
      probeElement.remove();
      return value;
    };
    const added = document.querySelector('.network-node-list li.added');
    const addedTitle = added?.querySelector('.network-node-title');
    return {
      // 令牌解析成具体颜色（比较用）：这样核的是「两边解析到同一个颜色」，不是「字符串长得像」。
      emphasisBg: resolve('--emphasis-bg'),
      emphasisRing: resolve('--emphasis-ring'),
      emphasisInk: resolve('--emphasis-ink'),
      accentWash: resolve('--accent-wash'),
      accent: resolve('--accent'),
      accentStrong: resolve('--accent-strong'),
      addedBackground: added ? getComputedStyle(added).backgroundColor : null,
      addedShadow: added ? getComputedStyle(added).boxShadow : null,
      addedColor: addedTitle ? getComputedStyle(addedTitle).color : null,
    };
  });
  check('面板的「已加入」条目用画布同一套令牌（浅底 + 描边）',
    addedPanel === true && tokenStyles.addedBackground === tokenStyles.accentWash
      && tokenStyles.addedShadow.includes(tokenStyles.accent) && tokenStyles.addedShadow.includes('inset')
      && tokenStyles.emphasisBg === tokenStyles.accentWash
      && tokenStyles.emphasisRing === tokenStyles.accent,
    JSON.stringify(tokenStyles));
  check('面板条目的文字跟着令牌变色',
    tokenStyles.addedColor === tokenStyles.accentStrong && tokenStyles.emphasisInk === tokenStyles.accentStrong,
    JSON.stringify({ color: tokenStyles.addedColor, token: tokenStyles.emphasisInk }));

  // 画布上的悬停候选必须解析到**同一个**底色与描边色（同一套令牌，不是写死的相近色）。
  const canvasStyleSource = await page.evaluate(() => [...document.styleSheets]
    .flatMap((sheet) => { try { return [...sheet.cssRules]; } catch { return []; } })
    .filter((rule) => rule.selectorText?.includes('.pick-candidate.hovered'))
    .map((rule) => rule.style.cssText)
    .join(' '));
  check('画布候选的强调同样取自令牌',
    canvasStyleSource.includes('var(--accent-wash)') && canvasStyleSource.includes('var(--accent)'),
    canvasStyleSource.slice(0, 160));

  check('选择器交互没有控制台错误', consoleErrors.length === 0, consoleErrors.join(' | '));
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n强关联选择器验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n强关联选择器验收通过。');
