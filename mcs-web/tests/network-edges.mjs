import { startTestServer } from './helpers.mjs';

import { PLAYWRIGHT_SPECIFIER as PLAYWRIGHT, CHROME_PATH as CHROME } from './browser-runtime.mjs';

const failures = [];
function check(name, condition, detail = '') {
  if (condition) console.log('  ✓ ' + name);
  else { failures.push(name + (detail ? ' :: ' + detail : '')); console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

/**
 * 边的颜色与遮挡关系。
 *
 * 用户的原话：「全都是大黑箭头丑死了，根据关系类型设计颜色，考虑到颜色饱和度等做视觉优化，
 * 根据逻辑强弱设计遮挡关系。」
 *
 * 黑箭头是**渲染缺陷**，不是配色问题：三个共享 `<marker>` 里的 `<path>` 没写 `fill`，
 * 于是继承默认填充 = 纯黑；又因为 `markerUnits` 默认按 `strokeWidth` 缩放，
 * 4.97px 的粗线配 9 单位箭头就是约 45px 的大黑三角。这一套把两侧都钉住：
 *
 * 1. **没有黑箭头**：每个 marker 的 `fill` 必须等于它自己的颜色，且 id 里带着这个颜色；
 * 2. **尺寸有界**：`userSpaceOnUse` + ≤16px，不随线宽膨胀；
 * 3. **颜色按关系类型**：不同 kind / mode 的边颜色互不相同；
 * 4. **遮挡按逻辑强弱**：画序按视觉权重升序，最强的边最后画（压在最上面）；
 *    选中某节点时，与它相连的边再压到最上面。
 */
const NODES = 'dg:homeomorphism,dg:manifold,dg:topological-manifold,dg:topological-space,dg:smooth-manifold,dg:smooth-atlas,dg:coordinate-chart,dg:tangent-bundle';

const server = await startTestServer();
let browser;
try {
  const { chromium } = await import(PLAYWRIGHT);
  browser = await chromium.launch({ executablePath: CHROME ?? undefined, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(NODES), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-edge');
  await page.waitForTimeout(1200);

  const paint = await page.evaluate(() => {
    const edges = [...document.querySelectorAll('.network-edge')].map((element) => ({
      weight: Number(element.getAttribute('data-weight')),
      tier: element.getAttribute('data-tier'),
      width: Number(element.getAttribute('stroke-width')),
      stroke: (element.getAttribute('stroke') ?? '').toLowerCase(),
      source: element.getAttribute('data-source'),
      kind: element.getAttribute('data-kind'),
      mode: element.getAttribute('data-mode'),
      marker: (element.getAttribute('marker-end') ?? '').replace('url(#', '').replace(')', ''),
    }));
    const markers = [...document.querySelectorAll('marker')].map((marker) => ({
      id: marker.id,
      fill: (marker.querySelector('path')?.getAttribute('fill') ?? '').toLowerCase(),
      units: marker.getAttribute('markerUnits'),
      width: Number(marker.getAttribute('markerWidth')),
    }));
    return { edges, markers };
  });

  check('画布上有边，且多数带方向箭头', paint.edges.length >= 8 && paint.edges.filter((edge) => edge.marker).length >= 5,
    JSON.stringify({ edges: paint.edges.length, withMarker: paint.edges.filter((edge) => edge.marker).length }));
  check('没有任何黑色箭头（marker 的 fill 必须显式给出）',
    paint.markers.length > 0 && paint.markers.every((marker) => marker.fill && !/^#(000|000000)$/.test(marker.fill) && marker.fill !== 'black'),
    JSON.stringify(paint.markers.map((marker) => marker.fill)));
  check('箭头颜色与它所属的边颜色一致（id 里带着自己的颜色）',
    paint.markers.every((marker) => marker.id.includes(marker.fill.replace('#', ''))),
    JSON.stringify(paint.markers.map((marker) => [marker.id, marker.fill])));
  check('每条带箭头的边都指向同色的 marker',
    paint.edges.filter((edge) => edge.marker).every((edge) => edge.marker.includes(edge.stroke.replace('#', ''))),
    JSON.stringify(paint.edges.filter((edge) => edge.marker).map((edge) => [edge.stroke, edge.marker])));
  check('箭头尺寸有界且不随线宽缩放（userSpaceOnUse，≤16px）',
    paint.markers.every((marker) => marker.units === 'userSpaceOnUse' && marker.width <= 16 && marker.width >= 6),
    JSON.stringify(paint.markers.map((marker) => [marker.units, marker.width])));

  const kinds = new Set(paint.edges.filter((edge) => edge.source === 'relation').map((edge) => edge.kind));
  const modes = new Set(paint.edges.filter((edge) => edge.source === 'contract').map((edge) => edge.mode));
  const strokesOf = (predicate) => new Set(paint.edges.filter(predicate).map((edge) => edge.stroke));
  check('不同关系种类的颜色互不相同',
    strokesOf((edge) => edge.source === 'relation').size === kinds.size && kinds.size >= 2,
    JSON.stringify({ kinds: [...kinds], strokes: [...strokesOf((edge) => edge.source === 'relation')] }));
  check('不同契约 mode 的颜色互不相同',
    strokesOf((edge) => edge.source === 'contract').size === modes.size && modes.size >= 2,
    JSON.stringify({ modes: [...modes], strokes: [...strokesOf((edge) => edge.source === 'contract')] }));
  check('整张画布至少三种边色（不是一团灰）', new Set(paint.edges.map((edge) => edge.stroke)).size >= 3,
    JSON.stringify([...new Set(paint.edges.map((edge) => edge.stroke))]));

  // 硬前置：2026-10 起本体里真的登记了（此前 0 条），视图里必须看得见它们在最高一档。
  check('画布上出现硬前置关系，并且落在最高一档「核心断言」',
    paint.edges.some((edge) => edge.kind === 'hardPrereq' && edge.tier === 'core'),
    JSON.stringify(paint.edges.filter((edge) => edge.kind === 'hardPrereq').map((edge) => [edge.kind, edge.tier, edge.weight])));
  check('硬前置比定义性前置契约不更细',
    (() => {
      const hardWidths = paint.edges.filter((edge) => edge.kind === 'hardPrereq').map((edge) => edge.width);
      const contractWidths = paint.edges.filter((edge) => edge.mode === 'definition').map((edge) => edge.width);
      return hardWidths.length === 0 || contractWidths.length === 0 || Math.min(...hardWidths) >= Math.min(...contractWidths);
    })(),
    JSON.stringify(paint.edges.filter((edge) => edge.kind === 'hardPrereq' || edge.mode === 'definition').map((edge) => [edge.kind ?? edge.mode, edge.width])));

  // 遮挡：画序按权重升序，最强的边最后画（最上面）。
  const ascending = paint.edges.every((edge, index) => index === 0 || paint.edges[index - 1].weight <= edge.weight);
  check('画序按逻辑强弱升序（强的后画 = 压在上面）', ascending,
    JSON.stringify(paint.edges.map((edge) => edge.weight)));
  check('最弱的边先画、最强的边最后画',
    paint.edges[0].weight <= paint.edges.at(-1).weight && paint.edges.at(-1).weight >= 0.85,
    JSON.stringify({ weakest: paint.edges[0], strongest: paint.edges.at(-1) }));

  // 选中节点后：与它相连的边压到最上面（否则选中了也看不清它连着谁）。
  const nodeId = 'dg:homeomorphism';
  await page.locator(`.network-node[data-node="${nodeId}"]`).click();
  await page.waitForTimeout(700);
  const afterSelect = await page.evaluate((selected) => {
    const edges = [...document.querySelectorAll('.network-edge')].map((element) => ({
      from: element.getAttribute('data-from'),
      to: element.getAttribute('data-to'),
      weight: Number(element.getAttribute('data-weight')),
    }));
    const incident = edges.filter((edge) => edge.from === selected || edge.to === selected);
    // 末尾 incident.length 条应当正好都是相连的边。
    const tail = edges.slice(-Math.max(1, incident.length));
    return {
      total: edges.length,
      incident: incident.length,
      tailAllIncident: tail.every((edge) => edge.from === selected || edge.to === selected),
      tail: tail.map((edge) => `${edge.from}→${edge.to}`),
    };
  }, nodeId);
  check('选中节点后，与它相连的边被提到最后画（压在最上面）',
    afterSelect.incident > 0 && afterSelect.tailAllIncident,
    JSON.stringify(afterSelect));

  /*
   * 合并显示：同一对节点只画一条（2026-10 加，TODO A2-14）。
   *
   * 第二十九轮报的问题：本体里同一对节点常同时有「行动契约」与「登记关系」，
   * 画出来两条线叠在一起（`拓扑空间 → 流形` 既有 definition 契约又有 hardPrereq），
   * 读者看不出那是两种关系还是画重了。规则与理由见 `network.ts` 的 `mergeParallelEdges`；
   * 这一档核对的是**界面真的照规则画**：每对只出现一次、被合并的如实标注、数量对得上。
   *
   * 重新进一次这个视图：上面点过节点，选中态会把非相连的边压暗、标签不渲染。
   */
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(NODES), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-edge');
  await page.waitForTimeout(1200);
  const merge = await page.evaluate(() => {
    const edges = [...document.querySelectorAll('.network-edge')].map((element) => ({
      from: element.getAttribute('data-from'),
      to: element.getAttribute('data-to'),
      merged: Number(element.getAttribute('data-merged') ?? 0),
      mergedIds: (element.getAttribute('data-merged-ids') ?? '').split(',').filter(Boolean),
      weight: Number(element.getAttribute('data-weight')),
      source: element.getAttribute('data-source'),
      kind: element.getAttribute('data-kind'),
      label: element.parentElement?.querySelector('.network-edge-label')?.textContent ?? '',
      title: element.parentElement?.querySelector('title')?.textContent ?? '',
    }));
    const pairs = edges.map((edge) => [edge.from, edge.to].sort().join('~'));
    return {
      edges,
      pairCount: pairs.length,
      distinctPairs: new Set(pairs).size,
      merge: window.__mcsEdgeMerge ?? null,
      mergedEdges: edges.filter((edge) => edge.merged > 0),
      allTitles: edges.map((edge) => edge.title),
    };
  });
  check('同一对节点之间只画一条边（不再叠线）',
    merge.pairCount > 0 && merge.distinctPairs === merge.pairCount,
    JSON.stringify({ pairs: merge.pairCount, distinct: merge.distinctPairs }));
  check('画出的条数 + 被合并的条数 = 登记的边数（一条都没丢）',
    merge.merge !== null && merge.merge.drawn + merge.merge.mergedAway === merge.merge.registered
      && merge.merge.drawn === merge.pairCount,
    JSON.stringify(merge.merge));
  check('被合并的边如实标注（标签带 +N，提示里列出它们是什么）',
    merge.mergedEdges.length > 0
      && merge.mergedEdges.every((edge) => edge.mergedIds.length === edge.merged
        && edge.label.includes(`+${edge.merged}`)
        && edge.title.includes('合并了')),
    JSON.stringify(merge.mergedEdges.map((edge) => ({ pair: `${edge.from}→${edge.to}`, merged: edge.merged, label: edge.label }))));
  check('留下的那条不比被合并的弱（按数据里的权重核对）',
    merge.mergedEdges.every((edge) => edge.weight >= 0.5),
    JSON.stringify(merge.mergedEdges.map((edge) => ({ kept: `${edge.source}:${edge.kind ?? ''}`, weight: edge.weight }))));
  check('HUD 如实说明合并了多少条',
    /另有 \d+ 条同对边/.test(await page.locator('.network-hud-count').innerText()),
    (await page.locator('.network-hud-count').innerText()).replace(/\s+/g, ' '));

  /*
   * 弧线策略：绕不开的边才弯，并且弯完要真的不再压住卡片。
   *
   * 用 8 节点那套视图量：合并之后它仍有 8 条弧、8 条直线（实测），
   * 因此「弧线是补救、不是风格」这句话在这张图上可直接核对。
   * （原来的 4 节点 group 视图合并后只剩 3 条直线，不再适合用来演示弧线。）
   */
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(NODES), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-edge');
  await page.waitForTimeout(1200);
  const arcs = await page.evaluate(() => {
    const edges = [...document.querySelectorAll('.network-edge')].map((element) => ({
      from: element.getAttribute('data-from'),
      to: element.getAttribute('data-to'),
      bow: Number(element.getAttribute('data-bow')),
      curved: element.classList.contains('curved'),
      d: element.getAttribute('d') ?? '',
      // 锚点也写进了 DOM：用来核对平行边是否沿卡片边缘散开（否则几条弧线挤成一个点）。
      anchor: [
        element.getAttribute('data-x1'), element.getAttribute('data-y1'),
        element.getAttribute('data-x2'), element.getAttribute('data-y2'),
      ].join(','),
    }));
    const routes = window.__mcsRoutes ?? null;
    const byPair = new Map();
    for (const edge of edges) {
      const key = [edge.from, edge.to].sort().join('~');
      byPair.set(key, [...(byPair.get(key) ?? []), edge.bow]);
    }
    return {
      edges,
      routes,
      // 合并之后同对边只剩一条，因此这里应当为空；留着这一项是为了让「合并」与「弯开」
      // 两种策略的边界在断言里可见（若哪天不合并了，这里会立刻报出来）。
      parallelPairs: [...byPair.entries()].filter(([, bows]) => bows.length > 1).map(([key, bows]) => ({ key, bows })),
      curvedCount: edges.filter((edge) => edge.curved).length,
      straightCount: edges.filter((edge) => !edge.curved).length,
    };
  });
  check('同对边已合并，因此画布上不再有「平行边」需要弯开',
    arcs.parallelPairs.length === 0 && arcs.routes?.stats?.parallel === 0,
    JSON.stringify({ parallelPairs: arcs.parallelPairs, stats: arcs.routes?.stats }));
  check('有弧线也有直线（弧线是补救，不是风格）',
    arcs.curvedCount >= 1 && arcs.straightCount >= 1,
    JSON.stringify({ curved: arcs.curvedCount, straight: arcs.straightCount }));
  check('页面上能读到弧线统计', arcs.routes !== null && typeof arcs.routes.stats?.throughCard === 'number',
    JSON.stringify(arcs.routes?.stats));
  check('曲线用二次贝塞尔路径渲染（Q 指令）',
    arcs.edges.filter((edge) => edge.curved).every((edge) => edge.d.includes('Q')),
    JSON.stringify(arcs.edges.filter((edge) => edge.curved).map((edge) => edge.d.slice(0, 40))));

  // 每对只画一条之后锚点自然各不相同；若还出现重复的组，说明合并没生效。
  const anchorSpread = await page.evaluate(() => {
    const byPair = new Map();
    for (const element of document.querySelectorAll('.network-edge')) {
      const key = [element.getAttribute('data-from'), element.getAttribute('data-to')].sort().join('~');
      const anchor = `${element.getAttribute('data-x1')},${element.getAttribute('data-y1')},${element.getAttribute('data-x2')},${element.getAttribute('data-y2')}`;
      byPair.set(key, [...(byPair.get(key) ?? []), anchor]);
    }
    const groups = [...byPair.entries()].filter(([, anchors]) => anchors.length > 1);
    return {
      groups: groups.length,
      bunched: groups.filter(([, anchors]) => new Set(anchors).size !== anchors.length).map(([key]) => key),
    };
  });
  check('每对节点只有一条边，不存在挤在一个点上的同组锚点',
    anchorSpread.groups === 0 && anchorSpread.bunched.length === 0,
    JSON.stringify(anchorSpread));

  // 弯完不能还压着卡片：沿曲线采样，检查没有落在任何节点卡片里。
  /*
   * 穿卡的两种情形分开验（2026-10 重写，TODO A2-13）。
   *
   * 旧断言只在 4 节点视图上跑过，那里本来就没有遮挡——「都不穿卡」是**碰巧**成立的。
   * 换到真实密集视图上量之后，事实是：弧线能把绝大多数压卡绕开，但密排视图里存在
   * **任何弓高都绕不开**的边（弓高上限 96px，见 edge-routing.ts 的穿卡一节）。
   * 因此这里分开断言：
   *   A. 有解的视图（dg 定义链 5 节点）——弯了的边真的不再压卡；
   *   B. 密集视图（8 节点）——残余压卡不假装修好，页面必须如实报出来，且实测不超过它报的数。
   */
  const measureOcclusion = () => page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.network-node')].map((element) => {
      const match = /translate\(([-\d.]+),([-\d.]+)\)/.exec(element.getAttribute('transform') ?? '');
      return match ? { id: element.getAttribute('data-node'), x: Number(match[1]), y: Number(match[2]) } : null;
    }).filter(Boolean);
    const edges = [...document.querySelectorAll('.network-edge')].map((element) => ({
      from: element.getAttribute('data-from'),
      to: element.getAttribute('data-to'),
      bow: Number(element.getAttribute('data-bow') ?? 0),
      d: element.getAttribute('d') ?? '',
    }));
    const curvePoints = (d) => {
      const quad = /^M ([-\d.]+) ([-\d.]+) Q ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)$/.exec(d);
      if (quad) {
        const [, x1, y1, cx, cy, x2, y2] = quad.map(Number);
        return Array.from({ length: 13 }, (_unused, index) => {
          const t = index / 12; const u = 1 - t;
          return { x: u * u * x1 + 2 * u * t * cx + t * t * x2, y: u * u * y1 + 2 * u * t * cy + t * t * y2 };
        });
      }
      const line = /^M ([-\d.]+) ([-\d.]+) L ([-\d.]+) ([-\d.]+)$/.exec(d);
      if (!line) return [];
      const [, x1, y1, x2, y2] = line.map(Number);
      return Array.from({ length: 13 }, (_unused, index) => ({ x: x1 + ((x2 - x1) * index) / 12, y: y1 + ((y2 - y1) * index) / 12 }));
    };
    const hits = [];
    const hitEdges = new Set();
    for (const edge of edges) {
      for (const point of curvePoints(edge.d)) {
        for (const node of nodes) {
          if (node.id === edge.from || node.id === edge.to) continue;
          if (Math.abs(point.x - (node.x + 86)) < 86 && Math.abs(point.y - (node.y + 29)) < 29) {
            hits.push(`${edge.from}→${edge.to} 压住 ${node.id}`);
            hitEdges.add(`${edge.from}→${edge.to}`);
          }
        }
      }
    }
    return {
      hits: [...new Set(hits)],
      hitEdges: [...hitEdges],
      edgeCount: edges.length,
      nodeCount: nodes.length,
      bowed: edges.filter((edge) => Math.abs(edge.bow) >= 0.5).length,
      routes: window.__mcsRoutes?.stats ?? null,
      hud: document.querySelector('.network-hud-sub')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    };
  });

  // A. 有解：dg 的定义链（拓扑空间 → 同胚 → 流形 → 坐标图 → 光滑图册）里有一条边压住卡片，
  //    弧线把它绕开了，因此画布上不该再看到压卡。
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent('dg:topological-space,dg:homeomorphism,dg:manifold,dg:coordinate-chart,dg:smooth-atlas'), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-edge');
  await page.waitForTimeout(1200);
  const sparse = await measureOcclusion();
  check('有解的视图上：穿卡规则生效（确实有边被弯），且画布上不再有边压卡',
    sparse.routes?.throughCard >= 1 && sparse.hits.length === 0 && sparse.edgeCount > 0,
    JSON.stringify(sparse));

  // B. 密集视图：残余压卡如实报告，且实测不超过报告值。
  await page.goto(server.origin + '/network?nodes=' + encodeURIComponent(NODES), { waitUntil: 'networkidle' });
  await page.waitForSelector('.network-edge');
  await page.waitForTimeout(1200);
  const dense = await measureOcclusion();
  check('密集视图上：残余压卡不超过页面报告的数（页面不假装绕干净了）',
    dense.routes !== null && dense.hitEdges.length <= dense.routes.throughCardResidual,
    JSON.stringify({ measured: dense.hitEdges.length, reported: dense.routes?.throughCardResidual, hits: dense.hits }));
  check('残余压卡写进了 HUD（有残余时必须说明「弓高上限内无解」）',
    dense.routes?.throughCardResidual === 0 || /仍压着卡片/.test(dense.hud),
    JSON.stringify({ reported: dense.routes?.throughCardResidual, hud: dense.hud }));
  /*
   * 弯过的边一定比直线压得少：这一条由 `tests/edge-routing.test.mjs` 的单元测试直接钉住
   * （构造两张挡路卡分居两侧的场景，断言「弯完压得更少」与「绕不开时保持直线」）。
   * 页面上能核对的是**画出来的**与**统计报的**对得上：被弯的边数 ≥ 因压卡而弯的条数
   * （另有「共线重叠」也会让边变弯，因此不是相等）。
   */
  check('因压卡而弯的条数落在实际弯曲的边里（统计与画布对得上）',
    dense.routes?.throughCard >= 1 && dense.bowed >= dense.routes.throughCard,
    JSON.stringify({ bowed: dense.bowed, throughCard: dense.routes?.throughCard, routes: dense.routes }));

  check('弧线策略没有控制台错误', consoleErrors.length === 0, consoleErrors.join(' | '));
} finally {
  await browser?.close();
  await server.cleanup();
}

if (failures.length > 0) {
  console.error('\n边的颜色与遮挡验收失败：\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('\n边的颜色与遮挡验收通过。');

