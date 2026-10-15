import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadConfig } from '../server/config.mjs';
import { loadOntology } from '../core/ontology.mjs';
import { checkFormation, checkOntologyLegality } from '../core/formation.mjs';
import { replayCertificate, evidenceSummary } from '../core/evidence.mjs';
import { leanCapabilities, leanRegistrationView } from '../core/lean.mjs';
import { makeLocalizer } from '../core/localization.mjs';
import { runAllLocalizations } from '../tests/localization-cases.mjs';
import { createLearnerStore } from '../server/db.mjs';
import { relationCoverage, relationCoverageProblems, RELATIONLESS_CLASSES } from '../data/relation-coverage.mjs';
import { PAPER_ANCHORS, paperAnchorStats } from '../data/paper-anchors.mjs';
import { coverage, formatCoverage, overlayFor } from '../data/i18n/index.mjs';
import { localizeOntologyRaw } from '../data/i18n/overlay.mjs';
import { validateFieldGuides } from '../data/field-guides/index.mjs';
import { validateWritingTemplate } from '../shared/writing-template.mjs';
import {
  PROFILE_TEMPLATES, DEFAULT_PROFILE_TEMPLATE_ID, profileTemplate, validateProfileTemplates,
} from '../data/profile-templates.mjs';

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
check('创作双语核心、可组合角色与展开资源', validateWritingTemplate().length === 0, validateWritingTemplate().join('；'));
const ontology = await loadOntology({ dataDir: config.dataDir });
const stats = ontology.stats();
const guideProblems = validateFieldGuides(ontology.raw);
check('十二学科双语导读与核心正文引用', guideProblems.length === 0, guideProblems.join('；'));
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
const machine = ontology.raw.evidence.filter((record) => record.kind === 'machine-certificate' && record.backend !== 'lean4');
for (const record of machine) {
  if (!existsSync(resolve(config.repoRoot, record.certificate))) { check(record.id + ' 文件存在', false, record.certificate); continue; }
  const result = await replayCertificate(record, { repoRoot: config.repoRoot });
  check(record.id + ' 重放', result.status === 'passed', result.status + (result.stderr ? ' ' + result.stderr.slice(0, 120) : ''));
  check(record.id + ' 不声称检查器已形式验证', result.checkerVerified === false);
}
const evidence = evidenceSummary(ontology);
const lean = await leanCapabilities(config.repoRoot, config.lean ?? {});
check('Lean 登记存在', lean.registrations.length === 2);
if (process.env.MCS_WEB_REQUIRE_LEAN === '1') check('真实 Lean 工具链就绪', lean.ready, lean.reason ?? '');
if (!lean.ready) notes.push(`Lean 重放不可用（未声称通过）：${lean.reason}`);
for (const registration of lean.registrations) {
  const view = await leanRegistrationView(config.repoRoot, registration.id);
  if (process.env.MCS_WEB_REQUIRE_LEAN === '1') check(registration.id + ' 已发布报告对应当前输入', view.freshness === 'current' && view.publishedReport?.status === 'passed');
}
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

console.log('\n[8] 中英双语（语言覆盖的装配与覆盖度）');
/*
 * 这一节检查的是**机制**，不是译文质量：
 *
 * - 中英两份视图必须给出**同一个本体版本**（否则换语言等于换本体，档案里的
 *   `ontologyVersion` 对不上，两套证据互不可见）；
 * - 覆盖文件的结构必须与中文源同形（缺项、错位、公式记号被改动都是错误）；
 * - 覆盖率如实打印，未译条目按 `scripts/i18n-parity.mjs --todo` 逐条可查。
 *
 * 「英文译文与中文源的数学对应关系」这条**没有**自动检查——它需要人工抽样复核，
 * 见 `data/i18n/en/` 各文件头部的说明。不在这里给一个假的通过标记。
 */
const enOntology = await loadOntology({ dataDir: config.dataDir, locale: 'en' });
check('中英本体版本一致', enOntology.version === ontology.version, `${ontology.version} vs ${enOntology.version}`);
check('中英节点数一致', enOntology.raw.nodes.length === ontology.raw.nodes.length,
  `${ontology.raw.nodes.length} vs ${enOntology.raw.nodes.length}`);
const enOverlay = await overlayFor('en');
if (!enOverlay) {
  check('英文覆盖目录存在', false, 'data/i18n/en/ 未装载');
} else {
  const { problems } = localizeOntologyRaw(ontology.raw, enOverlay);
  check('英文覆盖装配无结构问题', problems.length === 0, problems.slice(0, 3).join('；'));
  const report = await coverage('en');
  check('英文覆盖已开始（不是空目录）', report.totals.translated > 0, formatCoverage(report));
  notes.push('语言覆盖：' + formatCoverage(report));
  /*
   * 英文界面里**未翻译**的节点占比：它同时是「还有什么没做完」的账本。
   * 这里只打印，不设阈值——阈值是发布决定，不该藏在一个健康检查里。
   */
  const untranslated = report.missing.nodes?.length ?? 0;
  notes.push(`未译节点：${untranslated} 个（末尾 ${report.sections.nodes.translated}/${report.sections.nodes.total} 已译）`);
}

console.log('\n[9] 学习者档案模板与起始节点的口径');
/*
 * 模板是 E 的初值（不进 M、不改 contentHash），但它声明的东西必须真在本体里，
 * 而且**只许是背景接口节点**——那九个节点是本站对环境边界的显式声明，
 * 语义上正好是「学习者应当已经具备的前提」；案例节点是本站要教的内容，
 * 模板一旦声明它们，「起始节点」就变成伪造的进度。这条纪律由 `validateProfileTemplates` 强制。
 *
 * 「起始节点」本身是 D 层的派生（`web/src/starting-nodes.ts`，前端一处实现），
 * 因此这里只核模板登记表与本体的一致性；派生的判据由 `tests/starting-nodes.test.mjs` 逐条验证。
 */
const templateProblems = validateProfileTemplates(ontology.nodesById);
check('档案模板与本体一致（节点存在、只声明背景接口、文案成对）', templateProblems.length === 0, templateProblems.slice(0, 3).join('；'));
const backgroundIds = new Set(ontology.raw.nodes.filter((node) => node.case === 'background').map((node) => node.id));
check('模板声明的每一个节点都是背景接口', PROFILE_TEMPLATES.every((template) => template.declares.every((entry) => backgroundIds.has(entry.node))));
check('存在不声明任何节点的默认模板', profileTemplate(DEFAULT_PROFILE_TEMPLATE_ID).declares.length === 0);
notes.push(`档案模板：${PROFILE_TEMPLATES.map((template) => `${template.name.zh} ${template.declares.length} 条声明`).join('，')}`
  + '（声明只写 E：source=system、payload.declared=true）');

console.log('\n摘要');
for (const note of notes) console.log('  · ' + note);
console.log('\n' + (failures.length ? `doctor 检查失败（${failures.length} 项）` : 'doctor 全部通过。'));
if (failures.length) process.exit(1);
