import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { MCS_WEB_ROOT, loadOntology } from '../core/ontology.mjs';

const { buildEdges, layout, edgeAnchor, mergeParallelEdges, NODE_W, NODE_H } = await import(
  pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/network.ts')).href
);
const { routeEdges, sampleCurve } = await import(pathToFileURL(resolve(MCS_WEB_ROOT, 'web/src/edge-routing.ts')).href);

/**
 * 压力场景的实测数据（2026-10 加，TODO A2-15）。
 *
 * 第三十七轮的边界写得很清楚：**自动摆位只保证不重叠，不保证好看**——
 * 「交叉 4000 / 边长 1 / 位移 0.6」那组权重是设计取值，不是实验结论。
 * 这一套把「好看」这一侧能测的东西测出来并留档，供以后调参时对照：
 *
 * - **重叠数**：必须是 0（这是布局的硬保证，不是期望）；
 * - **交叉数**：边与边在画布上交叉的对数（几何量，无阈值——它只用于对照）；
 * - **平均/中位边长**：卡片锚点之间的弦长；
 * - **弯曲与压卡的条数**：弧线策略的现状（绕不开的会如实计入残余）。
 *
 * 数字随数据与布局变化，因此**不写死在断言里**：断言只钉「不重叠」与「数值可用」，
 * 实测值打印出来，并核对 VALIDATION.md 的「压力场景」一节确实记着当前数字
 * （改了布局却忘了更新留档时，这条会红）。
 */
const DEFAULT_FAMILIES = ['contract', 'relation'];

function overlapsOf(placed) {
  const pairs = [];
  let minGap = Number.POSITIVE_INFINITY;
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      const dx = Math.abs(placed[i].x - placed[j].x);
      const dy = Math.abs(placed[i].y - placed[j].y);
      const gapX = dx - NODE_W;
      const gapY = dy - NODE_H;
      const gap = Math.max(gapX, gapY);
      if (gap < minGap) minGap = gap;
      if (gapX < 0 && gapY < 0) pairs.push(`${placed[i].id}~${placed[j].id}`);
    }
  }
  return { pairs, minGap: Number.isFinite(minGap) ? minGap : 0 };
}

/** 两条采样折线是否真的交叉（共端点的两条边不算）。 */
function polylinesCross(a, b) {
  const cross = (ox, oy, ax, ay, bx, by) => (ax - ox) * (by - oy) - (ay - oy) * (bx - ox);
  const segmentsCross = (p1, p2, p3, p4) => {
    const d1 = cross(p3.x, p3.y, p4.x, p4.y, p1.x, p1.y);
    const d2 = cross(p3.x, p3.y, p4.x, p4.y, p2.x, p2.y);
    const d3 = cross(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    const d4 = cross(p1.x, p1.y, p2.x, p2.y, p4.x, p4.y);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  };
  for (let i = 0; i + 1 < a.length; i += 1) {
    for (let j = 0; j + 1 < b.length; j += 1) {
      if (segmentsCross(a[i], a[i + 1], b[j], b[j + 1])) return true;
    }
  }
  return false;
}

function measure(graph, ids, label) {
  const added = new Set(ids);
  const registered = buildEdges(graph, added, DEFAULT_FAMILIES);
  const merged = mergeParallelEdges(registered);
  const fitted = layout(graph, added, DEFAULT_FAMILIES);
  const positioned = new Map(fitted.placed.map((node) => [node.id, node]));
  const inputs = merged.map(({ edge }) => ({ id: edge.id, from: edge.from, to: edge.to, ...edgeAnchor(positioned.get(edge.from), positioned.get(edge.to)) }));
  const routed = routeEdges(fitted.placed, inputs);

  const overlap = overlapsOf(fitted.placed);
  const samples = inputs.map((edge) => sampleCurve(edge, routed.bows.get(edge.id) ?? 0, 12));
  let crossings = 0;
  for (let i = 0; i < inputs.length; i += 1) {
    for (let j = i + 1; j < inputs.length; j += 1) {
      if (inputs[i].from === inputs[j].from || inputs[i].to === inputs[j].to
        || inputs[i].from === inputs[j].to || inputs[i].to === inputs[j].from) continue;
      if (polylinesCross(samples[i], samples[j])) crossings += 1;
    }
  }
  const lengths = inputs
    .map((edge) => Math.hypot(edge.x2 - edge.x1, edge.y2 - edge.y1))
    .sort((left, right) => left - right);
  const average = lengths.reduce((sum, value) => sum + value, 0) / Math.max(lengths.length, 1);
  const median = lengths.length ? lengths[Math.floor(lengths.length / 2)] : 0;
  return {
    label,
    nodes: fitted.placed.length,
    registeredEdges: registered.length,
    drawnEdges: inputs.length,
    mergedAway: registered.length - inputs.length,
    overlapCount: overlap.pairs.length,
    minGap: Math.round(overlap.minGap),
    crossings,
    averageLength: Math.round(average),
    medianLength: Math.round(median),
    routed: routed.stats,
  };
}

const ontology = await loadOntology();
const graph = {
  nodes: ontology.raw.nodes.map((node) => ({
    id: node.id, title: node.title, case: node.case, construct: node.construct, discipline: node.discipline,
    roles: node.roles ?? [], summary: node.summary ?? '', evidenceStatus: 'DEF', hasContent: false,
    actionCount: 0, relationCount: 0, evidenceCount: 0, granularity: node.granularity,
  })),
  relations: ontology.raw.relationDescriptions,
  actions: ontology.raw.actions,
  aggregates: ontology.raw.aggregates,
  patterns: ontology.raw.patterns,
  support: ontology.raw.support,
  evidence: [],
};

const liangIds = ontology.raw.nodes.filter((node) => node.case === 'liang').map((node) => node.id);
const allIds = ontology.raw.nodes.map((node) => node.id);
const scenarios = [measure(graph, liangIds, 'liang 整案'), measure(graph, allIds, '全库')];

test('压力场景（≥60 节点）：自动摆位不重叠这条硬保证成立', () => {
  assert.ok(scenarios.length >= 2);
  for (const scenario of scenarios) {
    assert.ok(scenario.nodes >= 60, `${scenario.label} 只有 ${scenario.nodes} 个节点，不够压力场景`);
    assert.equal(scenario.overlapCount, 0, `${scenario.label} 有 ${scenario.overlapCount} 对卡片重叠`);
    assert.ok(scenario.minGap >= 0, `${scenario.label} 最小间隙为负：${scenario.minGap}`);
  }
});

test('压力场景：交叉、边长、弯曲的实测值可用（并打印出来留档）', () => {
  for (const scenario of scenarios) {
    assert.ok(Number.isFinite(scenario.crossings) && scenario.crossings >= 0);
    assert.ok(scenario.averageLength > 0 && scenario.medianLength > 0);
    assert.ok(scenario.drawnEdges > 0 && scenario.drawnEdges <= scenario.registeredEdges);
    assert.ok(scenario.routed.throughCard >= 0 && scenario.routed.throughCardResidual >= 0);
    console.log('  · ' + scenario.label
      + `：${scenario.nodes} 节点 · 登记边 ${scenario.registeredEdges} → 画 ${scenario.drawnEdges}（并掉 ${scenario.mergedAway}）`
      + ` · 重叠 ${scenario.overlapCount}（最小间隙 ${scenario.minGap}px）`
      + ` · 交叉 ${scenario.crossings}`
      + ` · 边长 平均 ${scenario.averageLength}px / 中位 ${scenario.medianLength}px`
      + ` · 弯 ${scenario.routed.throughCard}（残余压卡 ${scenario.routed.throughCardResidual}）`);
  }
});

test('实测值写进了 VALIDATION.md 的一轮记录（留档不脱节）', () => {
  const validation = readFileSync(resolve(MCS_WEB_ROOT, 'VALIDATION.md'), 'utf8');
  // 不按编号找小节（编号会随轮次变），而是找「压力场景实测」这一节所在的整块文本。
  const marker = validation.indexOf('压力场景实测');
  assert.ok(marker >= 0, 'VALIDATION.md 里没有「压力场景实测」一节');
  const section = validation.slice(marker, marker + 2400);
  const liang = scenarios[0];
  for (const needle of [`${liang.nodes} 节点`, `交叉 ${liang.crossings}`, `平均 ${liang.averageLength}px`]) {
    assert.ok(section.includes(needle), `留档里没有当前实测值「${needle}」——改了布局就要更新这一节`);
  }
});

test('同一份数据重复测量得到同一组数字（布局是确定性的）', () => {
  const again = measure(graph, liangIds, 'liang 整案');
  assert.deepEqual(again, scenarios[0]);
});
