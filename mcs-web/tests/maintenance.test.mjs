import test from 'node:test';
import assert from 'node:assert/strict';
import { maintenanceSources, resetMaintenanceCache } from '../server/maintenance.mjs';
import { PAPER_ANCHORS, paperAnchorStats, PAPER_ANCHOR_SOURCE } from '../data/paper-anchors.mjs';
import { loadOntology } from '../core/ontology.mjs';

/**
 * 网站维护的只读清单：正文锚点、发布版本与读盘缓存（2026-10 加，TODO A4-31 / A4-32 / A4-33）。
 *
 * 三件事各有一层断言：
 * 1. **锚点**：登记表里的 label 必须真的在论文里（对不上就是登记过期），
 *    挂的节点必须真的在本体里（对不上就是编的），且至少打通一条；
 * 2. **发布记录**：版本与日期从目录名解析，解析不出来的如实留空；排序按日期倒序、
 *    同一天正式发布排在历史快照之前；
 * 3. **缓存**：第二次调用命中缓存（不重新读盘），超时之后重新读——并且把读盘耗时报出来。
 */

test('论文锚点：登记的 label 都在正文里，挂的节点都在本体里', async () => {
  resetMaintenanceCache();
  const sources = maintenanceSources({ force: true });
  const anchors = sources.arxiv.anchors;
  assert.equal(anchors.source, PAPER_ANCHOR_SOURCE);
  assert.ok(anchors.available, '没有读到 arXiv 正文（' + anchors.source + '）');
  assert.ok(anchors.labelCount > 0, '正文里一个 label 都没解析到');
  assert.deepEqual(anchors.missingInPaper, [], '登记表里有 label 在论文里找不到：' + anchors.missingInPaper.join('、'));
  assert.ok(anchors.linkedCount >= 1, '至少要打通一条锚点：' + JSON.stringify(anchors.stats));

  const ontology = await loadOntology();
  for (const entry of anchors.entries) {
    if (entry.nodeId === null) {
      assert.ok(entry.kind && entry.note.length > 0, `${entry.anchor} 没有节点，就要写清它讲的是什么`);
      continue;
    }
    assert.ok(ontology.node(entry.nodeId), `锚点 ${entry.anchor} 挂到了不存在的节点 ${entry.nodeId}`);
    assert.notEqual(entry.relation, 'none', `${entry.anchor} 挂了节点，却把关系写成 none`);
  }
  // 未登记的 label 也要报出来（说明覆盖到哪），不是静默忽略。
  assert.ok(Array.isArray(anchors.unregistered));
  console.log(`  · 论文锚点：正文 ${anchors.labelCount} 个 label，登记 ${anchors.stats.total} 条`
    + `（挂节点 ${anchors.stats.mapped} 条，打通 ${anchors.linkedCount} 条），未登记 ${anchors.unregistered.length} 个`);
});

test('发布记录：版本与日期从目录名解析，解析不出来就留空', () => {
  resetMaintenanceCache();
  const releases = maintenanceSources({ force: true }).releases;
  assert.ok(releases.available, '没有读到 ' + releases.path);
  assert.ok(releases.records.length > 0, '一个发布/历史目录都没有');
  for (const record of releases.records) {
    assert.ok(record.path.startsWith('mcs-foundations/publication/'), '路径必须是仓库相对路径：' + record.path);
    assert.ok(typeof record.fileCount === 'number' && record.fileCount >= 0);
    // 版本号只在名字像版本时才填：`before` 这类阶段标签不该被说成版本。
    if (record.version !== null) assert.match(record.version, /^(?:v?\d+(?:\.\d+)*|r\d+)$/);
    if (record.date !== null) assert.match(record.date, /^\d{4}-\d{2}-\d{2}$/);
  }
  const dates = releases.records.filter((record) => record.date !== null).map((record) => record.date);
  assert.deepEqual([...dates].sort((left, right) => right.localeCompare(left)), dates, '日期没有按倒序排');
  // 同一天：正式发布（releases）排在历史快照（history）之前。
  for (let index = 0; index + 1 < releases.records.length; index += 1) {
    const current = releases.records[index]; const next = releases.records[index + 1];
    if (current.date && next.date && current.date === next.date) {
      const rank = { releases: 0, history: 1 };
      assert.ok((rank[current.group] ?? 9) <= (rank[next.group] ?? 9),
        `${current.name} 与 ${next.name} 同一天，但顺序不对`);
    }
  }
  assert.equal(releases.parsedCount, dates.length);
  assert.equal(releases.latest?.name, releases.records.find((record) => record.date !== null)?.name);
  console.log('  · 发布记录：' + releases.records
    .map((record) => `${record.date ?? '未解析'} ${record.version ?? record.label ?? record.name}（${record.group}，${record.fileCount} 个文件）`)
    .join('；'));
});

test('读盘缓存：第二次命中缓存，超时之后重新读，并把耗时报出来', () => {
  resetMaintenanceCache();
  const first = maintenanceSources({ force: true });
  assert.equal(first.cached, false, '第一次必须是实时读盘');
  assert.ok(Number.isFinite(first.readMs) && first.readMs >= 0);

  const second = maintenanceSources();
  assert.equal(second.cached, true, '30 秒内的第二次应当命中缓存');
  assert.equal(second.generatedAt, first.generatedAt, '命中缓存时读盘时间不该变（否则就是在假装新数据）');
  assert.equal(second.readMs, first.readMs, '缓存命中时不该重新计时');

  // 时间往前推过一个 TTL：必须重新读（用注入的 now 模拟，不真等 30 秒）。
  const later = maintenanceSources({ now: () => Date.now() + 31 * 1000 });
  assert.equal(later.cached, false, '超过 TTL 之后必须重新读盘');
  assert.notEqual(later.generatedAt, first.generatedAt);

  // 读盘开销本身也留个数字：这一层缓存值不值得，看它。
  console.log(`  · 读盘耗时：实时 ${first.readMs} ms（缓存命中时不再读盘）；`
    + `清单规模：${first.thesis.chapters.length} 章 + ${first.arxiv.files.length} 个 arXiv 文件 + `
    + `${first.thesis.docs.reduce((sum, group) => sum + group.entries.length, 0)} 份文档 + ${first.references.files?.length ?? 0} 份参考文献`);
});

test('锚点统计与登记表一致（doctor 与页面读的是同一份数据）', () => {
  const stats = paperAnchorStats();
  assert.equal(stats.total, PAPER_ANCHORS.length);
  assert.equal(stats.mapped + stats.unmapped, stats.total);
  const anchors = new Set(PAPER_ANCHORS.map((entry) => entry.anchor));
  assert.equal(stats.anchors, anchors.size);
  // 每条都要有依据：这是「只登记能核对的对照」这条约定的最小检查。
  for (const entry of PAPER_ANCHORS) {
    assert.ok(entry.note.length >= 10, `${entry.anchor} 的依据太短：${entry.note}`);
  }
});
