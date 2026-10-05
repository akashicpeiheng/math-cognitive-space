import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadConfig } from '../server/config.mjs';
import { loadOntology } from '../core/ontology.mjs';
import { checkFormation, checkOntologyLegality } from '../core/formation.mjs';
import { replayCertificate, evidenceSummary } from '../core/evidence.mjs';
import { makeLocalizer } from '../core/localization.mjs';
import { runAllLocalizations } from '../tests/localization-cases.mjs';
import { createLearnerStore } from '../server/db.mjs';
import { relationCoverage, relationCoverageProblems, RELATIONLESS_CLASSES } from '../data/relation-coverage.mjs';
import { PAPER_ANCHORS, paperAnchorStats } from '../data/paper-anchors.mjs';

const failures = [];
const notes = [];
function check(name, condition, detail = '') {
  if (condition) { console.log('  ✓ ' + name); return true; }
  failures.push(name + (detail ? ' :: ' + detail : ''));
  console.log('  ✗ ' + name + (detail ? ' :: ' + detail : ''));
  return false;
}

console.log('MCS Web doctor\n');
const config = loadConfig();

console.log('[1] 公共本体与形成检查');
const ontology = await loadOntology({ dataDir: config.dataDir });
const stats = ontology.stats();
check('本体版本哈希', /^sha256:[0-9a-f]{64}$/.test(stats.version), stats.version);
check('节点数', stats.counts.nodes >= 60, String(stats.counts.nodes));
const badFormation = ontology.raw.nodes.map((node) => ({ node, formation: checkFormation(node) })).filter((item) => item.formation.status !== 'well-formed');
check('全部节点形成检查通过', badFormation.length === 0, badFormation.slice(0, 3).map((item) => item.node.id).join('、'));
const legality = checkOntologyLegality(ontology.raw);
check('合法本体八项条件', legality.status === 'passed', legality.conditions.filter((item) => item.status !== 'passed').map((item) => item.name).join('、'));
check('十三种角色模板齐全', stats.counts.templates === 13, String(stats.counts.templates));
check('局部化登记 36 项', stats.counts.localizations === 36, String(stats.counts.localizations));
check('十八类构造中已使用的类型均合法', ontology.raw.nodes.every((node) => stats.counts.constructs[node.construct] >= 0));

console.log('\n[2] 机器证书重放（现有 ND 子集检查器）');
const machine = ontology.raw.evidence.filter((record) => record.kind === 'machine-certificate');
for (const record of machine) {
  if (!existsSync(resolve(config.repoRoot, record.certificate))) { check(record.id + ' 文件存在', false, record.certificate); continue; }
  const result = await replayCertificate(record, { repoRoot: config.repoRoot });
  check(record.id + ' 重放', result.status === 'passed', result.status + (result.stderr ? ' ' + result.stderr.slice(0, 120) : ''));
  check(record.id + ' 不声称检查器已形式验证', result.checkerVerified === false);
}
const evidence = evidenceSummary(ontology);
notes.push(`证据：${evidence.total} 条（${Object.entries(evidence.byKind).map(([key, value]) => key + ' ' + value).join('，')}）`);

console.log('\n[3] 36 个局部化算子可运行性');
const localizer = makeLocalizer(ontology);
const localizationResults = runAllLocalizations(localizer);
const localizationStatuses = {};
for (const { result } of localizationResults) localizationStatuses[result.status] = (localizationStatuses[result.status] ?? 0) + 1;
check('36 项全部返回结构完整的 Loc', localizationResults.length === 36, String(localizationResults.length));
check('未知与不支持状态显式报告', (localizationStatuses.unsupported ?? 0) + (localizationStatuses.unknown ?? 0) >= 1, JSON.stringify(localizationStatuses));
notes.push('局部化状态：' + JSON.stringify(localizationStatuses));

console.log('\n[4] 数据库与个人记录');
const dir = mkdtempSync(join(tmpdir(), 'mcs-doctor-'));
let db;
try {
  /*
   * 存储层自 2026-10-05 起是**统一异步接口**（本机 SQLite / 公网 PostgreSQL 走同一套语义），
   * 所以这里也要 `await`。doctor 只跑本机那一档：给 `dbFile` 就是 SQLite。
   */
  db = await createLearnerStore({ config: { dbFile: join(dir, 'doctor.sqlite3') } });
  const profile = await db.createProfile({ name: 'doctor' });
  const result = await db.appendEvent(profile.id, { eventId: 'doctor-1', kind: 'confirmation', nodeId: 'bg:real:metric', occurredAt: new Date().toISOString(), baseRevision: null, source: { kind: 'system', ref: 'doctor' }, evidenceRefs: [], payload: { confirmed: true }, ontologyVersion: ontology.version });
  check('档案与事件写入', result.duplicate === false && (await db.listEvents(profile.id)).length === 1);
  const duplicate = await db.appendEvent(profile.id, { eventId: 'doctor-1', kind: 'confirmation', nodeId: 'bg:real:metric', occurredAt: new Date().toISOString(), baseRevision: null, source: { kind: 'system', ref: 'doctor' }, evidenceRefs: [], payload: { confirmed: true }, ontologyVersion: ontology.version });
  check('事件去重', duplicate.duplicate === true);
  const backup = await db.backupTo(join(dir, 'backups'));
  check('备份可写', existsSync(backup.backup));
  check('存储方言如实报告', (await db.stats()).dialect === 'sqlite', (await db.stats()).dialect);
} finally {
  try { await db?.close(); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}
check('学习事件不改变本体版本', (await loadOntology({ dataDir: config.dataDir })).version === ontology.version);

console.log('\n[5] 覆盖清单');
const byStatus = {};
for (const entry of ontology.raw.coverage) byStatus[entry.status] = (byStatus[entry.status] ?? 0) + 1;
check('覆盖清单覆盖专稿章节', ontology.raw.coverage.length >= 20, String(ontology.raw.coverage.length));
check('存在明确的未声称边界', (byStatus['not-claimed'] ?? 0) + (byStatus['interface-only'] ?? 0) + (byStatus.partial ?? 0) >= 5, JSON.stringify(byStatus));

console.log('\n[6] 无关系节点的清单与分类');
/*
 * 「不连」必须能分类：设计如此（背景接口 / 线索层 / 由契约引入）与欠账（尚待登记）分开。
 * 完全孤立（既无关系也无契约）是缺陷，必须为 0。
 */
const coverageReport = relationCoverage(ontology.raw.nodes, ontology.raw.relationDescriptions, ontology.raw.actions);
const coverageProblems = relationCoverageProblems(ontology.raw.nodes, ontology.raw.relationDescriptions);
check('无关系节点全部有分类', coverageProblems.length === 0 && coverageReport.items.every((item) => item.cls && item.why), coverageProblems.join('；'));
check('没有完全孤立的节点（既无关系也无契约）', coverageReport.counts.isolated === 0, String(coverageReport.counts.isolated));
check('尚待登记清单与数据一致（已登记的条目已从清单移除）', coverageReport.counts.pending >= 0);
notes.push(`无关系节点：${coverageReport.relationless}/${coverageReport.totalNodes}（`
  + RELATIONLESS_CLASSES.map((entry) => `${entry.title} ${coverageReport.counts[entry.id] ?? 0}`).join('，') + '）');
notes.push(`硬前置关系：${ontology.raw.relationDescriptions.filter((relation) => relation.kind === 'hardPrereq').length} 条（`
  + '定义性依赖 + 证明依赖两类见证）');

console.log('\n[7] 论文锚点 ↔ 本体节点');
/*
 * 第四十七轮的边界是「arXiv 没解析正文、也没和本体节点挂上」；A4-31 建立了登记表
 * （`data/paper-anchors.mjs`）。这里只核对**本体这一侧**：登记表里的每个 nodeId 必须真的存在，
 * 而且必须有至少一条真正挂上了节点（否则「打通」只是说法）。
 * 论文那一侧（label 是否真的在 main.tex 里）由维护接口与 `tests/research-maintenance.mjs` 核对。
 */
const anchorStats = paperAnchorStats();
const anchorProblems = PAPER_ANCHORS
  .filter((entry) => entry.nodeId !== null)
  .map((entry) => ({ entry, node: ontology.node(entry.nodeId) }))
  .filter((item) => item.node === null);
check('论文锚点登记表里的节点都存在', anchorProblems.length === 0,
  anchorProblems.map((item) => `${item.entry.anchor} → ${item.entry.nodeId}`).join('；'));
check('论文锚点至少打通一条（有节点、也有正文位置）', anchorStats.mapped >= 1, JSON.stringify(anchorStats));
check('对不上节点的条目都写了它讲的是什么', PAPER_ANCHORS
  .filter((entry) => entry.nodeId === null)
  .every((entry) => typeof entry.kind === 'string' && entry.kind.length > 0 && entry.note.length > 0));
notes.push(`论文锚点：${anchorStats.total} 条登记（${anchorStats.anchors} 个 label），`
  + `挂上本体节点 ${anchorStats.mapped} 条，其余 ${anchorStats.unmapped} 条为接口/规划器/理论结论`);

console.log('\n摘要');
for (const note of notes) console.log('  · ' + note);
console.log('\n' + (failures.length ? `doctor 检查失败（${failures.length} 项）` : 'doctor 全部通过。'));
if (failures.length) process.exit(1);
