#!/usr/bin/env node
/**
 * 从零走一遍某套范例路径（默认《简明高等代数》`jiang-jdga`）。
 *
 * ## 它做什么（不是仿真，全部走真接口）
 *
 * 1. 建一份**空白档案**（模板 `blank`：一个已确认节点都不预设）；
 * 2. 只确认范例声明的**基础背景**（`JIANG_BASE_ENTRIES`）——第零步；
 * 3. 逐程调用 `POST /api/v2/plans?sync=1`，**背景由服务端从档案的确认记录派生**
 *    （`adaptWithOntology`），不手写一份背景清单，因此「起点 = 基础背景 + 前几程里程碑」
 *    这条规则是被**档案状态**验证的，不是被脚本假设的；
 * 4. 每程跑完，把这一程实际产出的节点逐条确认（`confirmation` 事件），进入下一程；
 * 5. 顺带量一次「一条路线最多能走多远」：`horizon` 的上限是 32，一本书不可能一次走完——
 *    按「倒数第三程 / 倒数第二程 / 全部 N 程」各试一次（N 从数据取，不写死），
 *    把结论写成实测而不是猜测；
 * 6. 生成 Markdown 走通记录（默认 `docs/从零走一遍-<套名>.md`）。
 *
 * ## 用法
 *
 * ```bash
 * # 需要本机服务已在运行（默认 127.0.0.1:3784；见 scripts/start.ps1）
 * node scripts/walk-example-path.mjs
 * node scripts/walk-example-path.mjs --set rudin-pma --out docs/从零走一遍-Rudin.md
 * node scripts/walk-example-path.mjs --set axler-ladr      # 九程那套（2026-10-14 加）
 * node scripts/walk-example-path.mjs --no-profile      # 不建档案，背景显式传（对照用）
 * ```
 *
 * 参数：`--set <id>`（默认 `jiang-jdga`）、`--base <url>`、`--profile-name <名字>`、
 * `--profile <已有档案 id>`、`--out <文件>`、`--no-profile`。
 *
 * ## 边界
 *
 * - 它写的是 **E 层**（一份新档案的确认事件），不碰公共本体 M；脚本结束时会打印档案 id
 *   与删除命令，不想要这份档案就删掉。
 * - 它验证的是**结构**：这些节点有没有正文，脚本不管也管不了——范例里没有正文的节点，
 *   走通了也仍然只是「名字与依赖」。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  EXAMPLE_SETS, JIANG_BASE_ENTRIES, LIANG_BASE_ENTRIES, RUDIN_BASE_ENTRIES, AXLER_BASE_ENTRIES,
} from '../web/src/example-paths.ts';
import { buildReadingSteps, readingOrder } from '../web/src/route-reading.ts';

const BASE_ENTRIES = {
  'jiang-jdga': JIANG_BASE_ENTRIES,
  'rudin-pma': RUDIN_BASE_ENTRIES,
  'liang-volume-1': LIANG_BASE_ENTRIES,
  'axler-ladr': AXLER_BASE_ENTRIES,
};

/** 档案名与文档里用的短书名（自动从标题裁出来的话，中文书名号会嵌套）。 */
const SHORT_TITLE = {
  'jiang-jdga': '《简明高等代数》',
  'rudin-pma': 'Rudin《数学分析原理》第三版',
  'liang-volume-1': '梁灿彬《微分几何入门与广义相对论》上册',
  'axler-ladr': 'Axler《Linear Algebra Done Right》第 4 版',
};

function parseArgs(argv) {
  const args = { base: 'http://127.0.0.1:3784', set: 'jiang-jdga', out: null, profileName: null, profileId: null, noProfile: false, reuse: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--no-profile') { args.noProfile = true; continue; }
    if (token === '--reuse') { args.reuse = true; continue; }
    const value = argv[index + 1];
    if (token === '--set') { args.set = value; index += 1; continue; }
    if (token === '--base') { args.base = value; index += 1; continue; }
    if (token === '--out') { args.out = value; index += 1; continue; }
    if (token === '--profile-name') { args.profileName = value; index += 1; continue; }
    if (token === '--profile') { args.profileId = value; index += 1; continue; }
    throw new Error(`未知参数：${token}`);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const set = EXAMPLE_SETS.find((item) => item.id === args.set);
if (!set) throw new Error(`范例集不存在：${args.set}（可选：${EXAMPLE_SETS.map((item) => item.id).join('、')}）`);
const baseEntries = BASE_ENTRIES[set.id] ?? [];
const outPath = resolve(args.out ?? `docs/从零走一遍-${set.id}.md`);

/** 中文数字：程数最多到十（范例里最大的是 Axler 的九程）。文档里的「七程 / 九程」都从这里取。 */
const CN_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const stageCount = set.paths.length;
const cnStages = CN_NUM[stageCount] ?? String(stageCount);

/**
 * 每套样本「第零步」的那一句说明：**为什么这套的起点只有共享背景**。
 *
 * 它是编辑判断（哪些内容这本书自带），数据里没有这个字段，所以写在这张表里；
 * 表里没有的样本就如实不写这一句，而不是套用别的书的话。
 */
const BASE_NOTE = {
  'jiang-jdga': '这本书自带域的公理（§1.1）与向量空间的公理化定义（§7.1），因此**不**把「有限维线性代数」声明为背景。',
  'axler-ladr': '这本书自带域的公理与多项式（第 1 章的域、第 4 章的多项式），因此**不**把「有限维线性代数」声明为背景。',
};
const baseNote = BASE_NOTE[set.id] ?? null;

async function api(path, init = {}) {
  const response = await fetch(args.base + path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { /* 非 JSON：下面按状态码报错 */ }
  if (!response.ok) {
    const message = payload?.error?.message ?? payload?.message ?? text.slice(0, 200);
    throw new Error(`${init.method ?? 'GET'} ${path} → ${response.status}：${message}`);
  }
  return payload?.data ?? payload;
}

const health = await api('/api/v2/health');
const graph = await api('/api/v2/ontology/graph');
const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
const actionsPayload = await api('/api/v2/ontology/actions');
const actions = new Map(actionsPayload.actions.map((action) => [action.id, action]));
const titleOf = (id) => nodes.get(id)?.title ?? id;
const disciplineOf = (id) => nodes.get(id)?.discipline ?? '—';
const actionTitle = (id) => actions.get(id)?.title ?? id;

let profileId = args.profileId;
let createdProfile = null;
const profileName = args.profileName ?? `从零走一遍·${SHORT_TITLE[set.id] ?? set.title.replace(/\s*·\s*凝练路径$/, '')}`;
if (!args.noProfile && !profileId) {
  if (args.reuse) {
    /*
     * 复用同名档案：确认事件的 id 是 `walk-<set>-<序号>`，同一份档案里重复 append 会被
     * **事件去重**挡掉，因此重跑是幂等的——不会把同一批节点记第二遍账。
     */
    const list = await api('/api/v2/profiles');
    const existing = (list.profiles ?? []).find((item) => item.name === profileName);
    if (existing) profileId = existing.id;
  }
  if (!profileId) {
    const created = await api('/api/v2/profiles', { method: 'POST', body: JSON.stringify({ name: profileName, template: 'blank' }) });
    profileId = created.profile.id;
    createdProfile = created.profile;
  } else {
    /* 复用到别人的/旧档案时也要把名字取回来——文档里不该出现 `null（profile-…）`。 */
    const existing = await api(`/api/v2/profiles/${profileId}`);
    createdProfile = existing.profile;
  }
}

let sequence = 0;
async function confirm(nodeId, note) {
  if (!profileId) return;
  sequence += 1;
  await api(`/api/v2/profiles/${profileId}/events`, {
    method: 'POST',
    body: JSON.stringify({
      eventId: `walk-${set.id}-${sequence}`,
      kind: 'confirmation',
      nodeId,
      occurredAt: new Date().toISOString(),
      source: { kind: 'system', ref: 'scripts/walk-example-path.mjs' },
      payload: { confirmed: true, note },
    }),
  });
}

/** 从档案读回「已确认节点」——用它核对累进规则，而不是相信脚本自己的账。 */
async function knownNodes() {
  const payload = await api(`/api/v2/profiles/${profileId}`);
  return (payload.theta?.known ?? []).map((entry) => (typeof entry === 'string' ? entry : entry.node)).filter(Boolean);
}

async function plan(goals, horizon, { useProfile = true, background = null } = {}) {
  const body = {
    goalId: goals[0],
    goalIds: goals.slice(1),
    horizon,
    maxCandidates: 1000000,
  };
  /*
   * `useProfile: false` 是给「一条路线能走多远」那组探针用的：它们量的是**从零出发**，
   * 不能带那份已经走完全书的档案——否则目标早就成了背景，路线会是 0 个事件。
   *
   * `--no-profile` 模式走这一支：背景由脚本显式传，且**逐程累进**（基础背景 + 前几程的里程碑），
   * 与档案模式同一条规则——否则第二程就得从头造第一程的东西，事件数自然对不上。
   */
  if (useProfile && profileId) body.profileId = profileId;
  else body.background = (background ?? baseEntries).map((node) => ({ entryId: `walk:${node}`, node, provides: ['statement', 'definition'], kind: 'confirmed', confirmed: true }));
  return api('/api/v2/plans?sync=1', { method: 'POST', body: JSON.stringify(body) });
}

/** 把一次规划结果压成可写进文档的形状。 */
function digest(result) {
  const route = result.routes?.[0] ?? null;
  if (!route) return { status: result.status, events: 0, steps: [] };
  const order = readingOrder(route);
  const steps = buildReadingSteps(route, order, new Map([...actions].map(([id, action]) => [id, action.title])));
  const eventById = new Map(route.events.map((event) => [event.id, event]));
  return {
    status: result.status,
    complete: result.search?.complete ?? null,
    events: route.events.length,
    entry: route.entry ?? [],
    steps: steps.map((step) => {
      const event = eventById.get(step.eventId);
      const dependencies = Object.keys(event?.sources ?? {}).sort((a, b) => a.localeCompare(b, 'en'));
      return {
        node: step.node,
        actionId: step.actionId,
        actionTitle: step.actionTitle,
        kind: event?.kind ?? 'deduction',
        dependencies: dependencies.map((id) => ({
          node: id,
          from: event.sources[id]?.kind ?? 'unknown',
        })),
      };
    }),
  };
}

// ---- 第零步：从零开始，只确认范例声明的两个共享背景 -------------------------------
for (const node of baseEntries) await confirm(node, '从零走一遍：起点背景');

const stageRecords = [];
const allGoals = [];
/** `--no-profile` 模式下显式累进的背景：基础背景 + 前面各程的全部里程碑。 */
const explicitBackground = [...baseEntries];

for (const [index, path] of set.paths.entries()) {
  const beforeKnown = profileId ? await knownNodes() : explicitBackground;
  const knownSet = new Set(beforeKnown ?? baseEntries);
  /*
   * `--reuse` 复用到一份**已经走完**的档案时，这一程的目标早就成了背景，
   * 规划器会如实给出 0 个事件。那不是「走不通」，是「已经走过了」——
   * 区分开记录，而不是把它当成事件数不符而失败。
   */
  const alreadyWalked = path.goals.every((goal) => knownSet.has(goal));
  const result = await plan(path.goals, path.horizon, { background: explicitBackground });
  const record = {
    ordinal: path.ordinal,
    title: path.title,
    chapters: path.chapters,
    pages: path.pages,
    goals: path.goals,
    entriesDeclared: path.entries.length,
    horizon: path.horizon,
    declaredEvents: path.events,
    ...digest(result),
    knownBefore: beforeKnown ? beforeKnown.length : baseEntries.length,
    alreadyWalked,
  };
  if (record.status !== 'Found') throw new Error(`${path.id} 未能规划出路线：${record.status}`);
  if (record.entry.length > 0) throw new Error(`${path.id} 还有待决入口：${record.entry.join('、')}`);
  if (!alreadyWalked && record.events !== path.events) {
    throw new Error(`${path.id} 实测事件 ${record.events} 与范例声明的 ${path.events} 不一致`);
  }
  if (alreadyWalked && record.events !== 0) {
    throw new Error(`${path.id} 的目标都已确认，规划器却仍给出 ${record.events} 个事件——起点派生可能出了问题`);
  }

  // 走完这一程：把这一次实际产出的节点逐条确认（`provides` 就是「这一步产出了什么」）。
  for (const event of result.routes[0].events) {
    for (const output of event.provides) await confirm(output.node, `${path.ordinal}：${path.title}`);
  }
  record.knownAfter = profileId
    ? (await knownNodes()).length
    : (() => {
      for (const goal of path.goals) if (!explicitBackground.includes(goal)) explicitBackground.push(goal);
      return explicitBackground.length;
    })();
  allGoals.push(...path.goals);
  stageRecords.push(record);
  console.log(`${path.ordinal} ${path.title}：${record.events} 个事件（事件界 ${record.horizon}），已确认 ${record.knownAfter} 个节点${alreadyWalked ? '（档案里已走完，无新增）' : ''}`);
}

// ---- 一条路线最多能走多远：horizon 上限 32，一本书不可能一次走完 ---------------------
const cumulative = [];
let running = 0;
for (const stage of set.paths) { running += stage.goals.length; cumulative.push(running); }
/*
 * 探针取三档：**一次能走完的最后一程 / 第一次走不完的那一程 / 全部 N 程**。
 *
 * 这里从前是写死的 5/6/7——Axler 那套是九程，写死会把「全部七程」当成全书，
 * 表里的结论跟着错，而错的那个数字看起来和真的一样。三档都从数据算：
 * `cumulative` 是各程里程碑的累进数，`PROBE_HORIZON` 是规划器 `horizon` 的上限。
 */
const PROBE_HORIZON = 32; // `shared/contracts.mjs` 的 `normalizePlanRequest`：horizon 上限 32
const passingStages = cumulative.filter((total) => total <= PROBE_HORIZON).length;
const probeStages = [...new Set([
  Math.max(passingStages, 1),
  Math.min(passingStages + 1, stageCount),
  stageCount,
])];
const reachProbes = [];
for (const stages of probeStages) {
  const label = stages === stageCount ? `全部${cnStages}程` : `前${CN_NUM[stages]}程`;
  const goals = set.paths.slice(0, stages).flatMap((path) => path.goals);
  const result = await plan(goals, PROBE_HORIZON, { useProfile: false });
  reachProbes.push({
    label,
    goals: goals.length,
    expectedEvents: cumulative[stages - 1],
    status: result.status,
    events: result.routes?.[0]?.events.length ?? 0,
    complete: result.search?.complete ?? null,
  });
  console.log(`h=${PROBE_HORIZON} 试 ${label}（${goals.length} 个目标）：${result.status}${result.routes?.[0] ? `，${result.routes[0].events.length} 个事件` : ''}`);
}

// ---- 第二个视角：站点的「学习方案」（目标闭包 + 分层路线图），也从零跑 -------------
/*
 * 范例路径给的是**书的结构**（分好的各程与全部里程碑）；「学习方案」给的是**目标的闭包**——
 * 以「这本书的终点」为主目标时，站点会算出一条最小的必修链与一张分层路线图。
 * 两者是不同的东西，放在一起才看得出「按书走」与「按目标走」的差别。
 *
 * 这里不带 `profileId`：匿名预览的背景是站点的默认逻辑底座（`bg:set:function` +
 * `bg:logic:quantifier`），也就是真正的「从零」。
 */
const lastStage = set.paths[set.paths.length - 1];
const learningPlanGoal = lastStage.goals[lastStage.goals.length - 1];
const learningPlanBranches = [set.paths[4]?.goals.at(-1), set.paths[5]?.goals.at(-1)].filter(Boolean);
const learningPlanInterests = [...new Set(allGoals.map((id) => disciplineOf(id)))].filter((name) => name !== '—');

async function previewLearningPlan(extra = {}) {
  const created = await api('/api/v2/learning-plan-preview', {
    method: 'POST',
    body: JSON.stringify({
      preferences: { primaryGoal: learningPlanGoal, branches: learningPlanBranches, interests: learningPlanInterests },
      ...extra,
    }),
  });
  const jobId = created.job?.id;
  for (let attempt = 0; attempt < 60 && jobId; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const job = (await api(`/api/v2/learning-plan-preview/${jobId}`)).job;
    if (job.status === 'done' || job.status === 'failed' || job.status === 'cancelled') return job;
  }
  return null;
}

/* 从零（匿名：背景是站点的默认逻辑底座）与走完全书之后，同一份偏好的两次结果。 */
const learningPlanFromZero = await previewLearningPlan();
const learningPlanAfterWalk = profileId ? await previewLearningPlan({ profileId }) : null;
if (learningPlanFromZero) {
  console.log(`学习方案预览（从零，主目标 ${titleOf(learningPlanGoal)}）：${learningPlanFromZero.status}，${learningPlanFromZero.result?.steps?.length ?? 0} 步`);
}
if (learningPlanAfterWalk) {
  console.log(`学习方案预览（走完全书后）：${learningPlanAfterWalk.status}，主目标已达成 ${learningPlanAfterWalk.result?.primaryComplete}`);
}

// ---- 生成走通记录 ---------------------------------------------------------------
const localNow = new Date().toLocaleString('zh-CN', { hour12: false });
const totals = {
  milestones: allGoals.length,
  events: stageRecords.reduce((sum, record) => sum + record.events, 0),
  confirmed: profileId ? (await knownNodes()).length : baseEntries.length + allGoals.length,
};
const disciplines = {};
for (const id of [...baseEntries, ...allGoals]) disciplines[disciplineOf(id)] = (disciplines[disciplineOf(id)] ?? 0) + 1;
const disciplineLine = Object.entries(disciplines).sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name} ${count}`).join(' · ');

const lines = [];
lines.push(`# 从零走一遍：${set.title.replace(/\s*·\s*凝练路径$/, '')}`);
lines.push('');
lines.push(`> 实测生成：\`node scripts/walk-example-path.mjs --set ${set.id}\`（${localNow}，本机时区）`);
lines.push(`> 服务：${args.base} ｜ 本体版本：\`${health.ontology.version.slice(0, 26)}…\`（${health.ontology.counts.nodes} 个节点）`);
if (profileId) {
  lines.push(`> 档案：**${createdProfile?.name ?? args.profileName ?? args.profileId}**（\`${profileId}\`，模板 \`blank\`，从零开始）`);
}
lines.push('');
lines.push('这是一次**结构上的走通**：每一程都用站内规划器真跑，背景由服务端从档案的确认记录派生。'
  + '范例里的节点**没有正文**（见各节点的「正文尚未撰写」边界），所以走通的是「先学什么、再学什么」的依赖链，不是内容本身。');
lines.push('');
lines.push('## 第零步：起点');
lines.push('');
lines.push(`从零出发时，只有 ${baseEntries.length} 个**共享背景**节点先被确认——它们没有任何行动能产出，只能由学习者声明「这些我已经会了」：`);
lines.push('');
for (const id of baseEntries) lines.push(`- \`${id}\` **${titleOf(id)}**（${disciplineOf(id)}）`);
lines.push('');
if (baseNote) {
  lines.push(baseNote);
  lines.push('');
}
lines.push(`## ${cnStages}程逐程记录`);
lines.push('');
for (const record of stageRecords) {
  lines.push(`### ${record.ordinal}　${record.title}`);
  lines.push('');
  lines.push(`${record.chapters}　·　${record.pages}`);
  lines.push('');
  lines.push(`- 这一程要拿下的里程碑：**${record.goals.length}** 个（${record.goals.map((id) => titleOf(id)).join('、')}）`);
  lines.push(`- 声明的事件界 \`h = ${record.horizon}\`；起手时档案里已确认 **${record.knownBefore}** 个节点（服务端派生，不是脚本传的）`);
  lines.push(`- 实测：状态 \`${record.status}\`${record.complete === false ? '（搜索被截断）' : '（搜索完整）'}，**${record.events} 个事件**，待决入口 ${record.entry.length} 个${record.alreadyWalked ? '　—— **这一程在档案里已经走完**（目标都已确认，规划器如实给出 0 个事件）' : ''}`);
  lines.push('');
  lines.push('按依赖排出的实际顺序：');
  lines.push('');
  for (const [index, step] of record.steps.entries()) {
    const deps = step.dependencies.length === 0
      ? '（无前置）'
      : step.dependencies.map((dep) => `${titleOf(dep.node)}${dep.from === 'background' ? '（背景）' : ''}`).join('、');
    lines.push(`${index + 1}. **${titleOf(step.node)}**（${disciplineOf(step.node)}）— ${step.actionTitle}　← ${deps}`);
  }
  lines.push('');
  lines.push(`这一程结束时，档案里已确认 **${record.knownAfter}** 个节点。`);
  lines.push('');
}
lines.push('## 合计');
lines.push('');
lines.push('| 程 | 里程碑 | 事件界 | 实测事件 | 结束时累计已确认 |');
lines.push('|---|---|---|---|---|');
for (const record of stageRecords) {
  lines.push(`| ${record.ordinal} ${record.title} | ${record.goals.length} | ${record.horizon} | ${record.events} | ${record.knownAfter} |`);
}
lines.push(`| **合计** | **${totals.milestones}** | — | **${totals.events}** | **${totals.confirmed}** |`);
lines.push('');
lines.push(`- 走完全书${cnStages}程：**${totals.milestones} 个里程碑、${totals.events} 个事件**，档案里 ${totals.confirmed} 个已确认节点（含 ${baseEntries.length} 个起点背景）。`);
lines.push(`- 覆盖的学科：${disciplineLine}。`);
lines.push('');
lines.push(`### 为什么必须分${cnStages}程：一条路线走不完`);
lines.push('');
lines.push('规划器的 `horizon` 上限是 **32**（`shared/contracts.mjs` 的 `normalizePlanRequest`），而全书从零到终点是 ' + totals.events + ' 步。实测：');
lines.push('');
lines.push(`| 一次路线的目标 | 目标数 | 需要的事件 | h=${PROBE_HORIZON} 的实测结果 |`);
lines.push('|---|---|---|---|');
for (const probe of reachProbes) {
  lines.push(`| ${probe.label} | ${probe.goals} | ${probe.expectedEvents} | \`${probe.status}\`${probe.events ? `（${probe.events} 个事件）` : ''} |`);
}
/*
 * 结论句按实测算，不写死「前五程 29 步 / 第六程 37 步 / 47 个里程碑 / 每程 4–13 步」：
 * 通过的探针里目标最多的那一条 = 一次能走多远；比它更大的第一条失败探针 = 在哪里撞上事件界。
 */
const widestProbe = reachProbes.filter((probe) => probe.status === 'Found')
  .reduce((best, probe) => (best === null || probe.goals > best.goals ? probe : best), null);
const firstFailingProbe = reachProbes.find((probe) => probe.goals > (widestProbe?.goals ?? 0)) ?? null;
const goalsPerStage = set.paths.map((path) => path.goals.length);
lines.push('');
lines.push(`也就是说：**从零出发、h 取上限 ${PROBE_HORIZON}，一次最多走完${widestProbe ? `${widestProbe.label}（${widestProbe.goals} 步）` : '（本次探针没有一档走通）'}**`
  + `${firstFailingProbe ? `；到${firstFailingProbe.label}（${firstFailingProbe.goals} 步）就判为界内不可行` : '（本次探针里没有撞上事件界的一档）'}。`
  + `范例把 ${totals.milestones} 个里程碑切成${cnStages}程，每程 ${Math.min(...goalsPerStage)}–${Math.max(...goalsPerStage)} 个里程碑，`
  + '正是为了让每一程都能在事件界内被规划器当场判定为 `Found`。');
lines.push('');
lines.push('## 另一个视角：站点的「学习方案」怎么排这条路');
lines.push('');
if (!learningPlanFromZero || learningPlanFromZero.status !== 'done' || !learningPlanFromZero.result) {
  lines.push(`学习方案预览没有拿到结果（状态：${learningPlanFromZero?.status ?? '未创建'}），本节留白——不编一个结果补上。`);
} else {
  const plan = learningPlanFromZero.result;
  const stepByKey = new Map(plan.steps.map((step) => [step.key, step]));
  const ordered = plan.order.map((key) => stepByKey.get(key)).filter(Boolean);
  lines.push('「学习方案」不是按书分程，而是**按目标算闭包**：给它一个主目标，它只排「走到那里必须经过的那些节点」，'
    + '而且**分段给**——一次只排到它选定的里程碑，走到那儿再用同一份偏好重算下一段。从零（背景是站点的默认逻辑底座）实测：');
  lines.push('');
  lines.push(`- 主目标：**${titleOf(plan.primaryGoal)}**（\`${plan.primaryGoal}\`）｜主目标已达成：${plan.primaryComplete ? '是' : '**否**'}`);
  lines.push(`- 这一次排到的里程碑：**${plan.milestone ? titleOf(plan.milestone) : '—'}**`
    + `${plan.truncated ? '（`truncated: true` 的含义是「还没到主目标，后面还有段」，不是数据缺失）' : ''}`);
  lines.push(`- 状态：\`${plan.status}\`（从零出发时它要求先确认背景，因此不是「已就绪」）｜搜索完整：${plan.search?.complete ? '是' : '否'}`);
  lines.push(`- 背景：${plan.background.map((id) => `\`${id}\``).join('、') || '（无）'}`);
  lines.push(`- 分支目标：${(plan.branches ?? learningPlanBranches).map((id) => titleOf(id)).join('、') || '（无）'}`);
  lines.push('');
  lines.push(`它给出的这一段（${ordered.length} 步；\`lane\` 是它自己标的「主干 / 分支」）：`);
  lines.push('');
  for (const [index, step] of ordered.entries()) {
    const lane = step.lane === 'main' ? '主干' : '分支';
    const needs = step.requires.length > 0 ? step.requires.map((id) => titleOf(id)).join('、') : '（无前置）';
    lines.push(`${index + 1}. **${titleOf(step.node)}**（${lane}）← ${needs}`);
  }
  lines.push('');
  const levels = plan.roadmap ?? [];
  const byLevel = new Map();
  for (const item of levels) byLevel.set(item.level, (byLevel.get(item.level) ?? 0) + 1);
  if (levels.length > 0) {
    lines.push(`分层路线图（到主目标为止）：共 **${levels.length}** 个节点、**${byLevel.size}** 层，`
      + `最深层是第 ${Math.max(...levels.map((item) => item.level))} 层（= 至少要先走完几层）。`);
    lines.push('');
  }
  if (learningPlanAfterWalk?.result) {
    const after = learningPlanAfterWalk.result;
    lines.push(`**走完全书之后再算一次同一份偏好**：主目标已达成 = **${after.primaryComplete ? '是' : '否'}**，`
      + `状态 \`${after.status}\`，剩下 ${after.steps?.length ?? 0} 步。`
      + `这正好说明${cnStages}程走完之后，站内那份档案与「学习方案」的判据是对上的——不是脚本自己说走完了。`);
    lines.push('');
  }
  lines.push('两份视角的差别一句话：**范例路径回答「照这本书该怎么走」'
    + `（${cnStages}程 ${totals.milestones} 步，含不在主目标链上的内容）；`
    + '学习方案回答「要拿下这个目标，接下来这一段要经过什么」（只排闭包，分主干与分支，分段给）。**');
}
lines.push('');
lines.push('## 边界与未声称');
lines.push('');
lines.push('- 这一遍走通的是**依赖结构**：节点没有正文，走完不等于学会了内容。');
lines.push('- 里程碑的一句话谓词与「哪条定理在哪一节」都是编辑判断，未逐条核对教材原文（见 `data/cases/` 的文件头）。');
lines.push('- 事件数是**规划器的最少事件数**，不是学习时长的估计；本站不预测学习成功率。');
lines.push('- 脚本写入的是一份**新的 E 层档案**（确认事件）。不想要就在「我的学习」里删掉，或：');
lines.push('');
lines.push('```bash');
if (profileId) lines.push(`curl -X DELETE ${args.base}/api/v2/profiles/${profileId}`);
lines.push('```');
lines.push('');

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, lines.join('\n'), 'utf8');

console.log('');
console.log(`走通记录已写入：${outPath}`);
console.log(`合计：${totals.milestones} 个里程碑、${totals.events} 个事件、${totals.confirmed} 个已确认节点`);
if (profileId) console.log(`档案：${createdProfile?.name ?? args.profileName ?? args.profileId}（${profileId}）`);
