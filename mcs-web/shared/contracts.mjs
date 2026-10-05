import { McsError, CODES } from './errors.mjs';

export const PROTOCOL = 'mcs-web/1';
export const PLANNER_VERSION = 'mcs-planner/1';
export const LOCALIZER_VERSION = 'mcs-loc/1';

export const CONSTRUCTS = Object.freeze([
  'Symbol', 'Term', 'Concept', 'Definition', 'Claim', 'Proof', 'Example',
  'Counterexample', 'Problem', 'Theory', 'Construction', 'Method',
  'Representation', 'MisconceptionPattern',
]);

export const ROLES = Object.freeze([
  'Concept', 'Definition', 'Axiom', 'Theorem', 'Property', 'Proof', 'Example',
  'Counterexample', 'Problem', 'Theory', 'Construction', 'GlobalMethod', 'LocalMethod',
]);

export const CLAIM_ROLES = Object.freeze(['Axiom', 'Theorem', 'Property']);

export const RESOURCE_KINDS = Object.freeze([
  'statement', 'definition', 'proof', 'certificate', 'construction',
  'task', 'method', 'representation', 'condition', 'competence',
]);

export const EVIDENCE_STATUS = Object.freeze([
  'DEF', 'PROOF', 'REF', 'FINITE', 'ILLUSTRATION', 'NOT-CLAIMED',
]);

export const CHECK_STATUS = Object.freeze([
  'not_run', 'passed', 'failed', 'unsupported', 'resource_exhausted', 'corrupt',
]);

export const SUPPORT_USES = Object.freeze(['expression', 'proof', 'route']);

export const EVENT_KINDS = Object.freeze([
  'view', 'hint', 'answer', 'evaluation', 'mastery_estimate', 'confirmation',
  'misconception', 'goal', 'note', 'tutor_message',
]);

export const PLAN_STATUS = Object.freeze([
  'Found', 'Conditional', 'InfeasibleWithinBound', 'Unknown',
]);

export function assert(condition, code, message, details = undefined, retryable = false) {
  if (!condition) throw new McsError(code, message, statusFor(code), details, retryable);
}

export function statusFor(code) {
  if ([CODES.UNKNOWN_NODE, CODES.UNKNOWN_PROFILE, CODES.UNKNOWN_SESSION, CODES.UNKNOWN_LOCALIZATION, CODES.NOT_FOUND].includes(code)) return 404;
  if ([CODES.CONFLICT, CODES.EVENT_ID_CONFLICT, CODES.VERSION_CONFLICT].includes(code)) return 409;
  if ([CODES.INTERNAL].includes(code)) return 500;
  return 400;
}

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function canonicalString(value) {
  return JSON.stringify(canonicalize(value));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireString(value, code, message) {
  assert(typeof value === 'string' && value.trim().length > 0, code, message);
  return value.trim();
}

function optionalString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function requireInteger(value, code, message, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  assert(Number.isInteger(value) && value >= min && value <= max, code, message);
  return value;
}

function validateResourceList(value, code, message, { allowEmpty = true } = {}) {
  assert(Array.isArray(value), code, message);
  assert(allowEmpty || value.length > 0, code, message);
  for (const item of value) assert(RESOURCE_KINDS.includes(item), code, `${message}：未知资源 ${item}`);
  return [...new Set(value)];
}

export function normalizeBackgroundEntry(raw, index) {
  const code = CODES.BAD_REQUEST;
  assert(isPlainObject(raw), code, `背景项 ${index} 必须是对象`);
  const node = requireString(raw.node, code, `背景项 ${index} 缺少节点引用`);
  const provides = validateResourceList(raw.provides ?? ['statement'], code, `背景项 ${index} 的资源类型无效`, { allowEmpty: false });
  const kind = raw.kind ?? 'confirmed';
  assert(['confirmed', 'assumption', 'unknown'].includes(kind), code, `背景项 ${index} 的 kind 无效`);
  return {
    entryId: requireString(raw.entryId ?? `${node}:${kind}:${index}`, code, `背景项 ${index} 缺少 entryId`),
    node,
    provides,
    kind,
    confirmed: kind === 'confirmed',
    note: optionalString(raw.note),
    source: optionalString(raw.source),
  };
}

export function normalizePlanRequest(raw) {
  const code = CODES.BAD_REQUEST;
  assert(isPlainObject(raw), code, '规划请求必须是对象');
  const goals = [];
  if (raw.goalId !== undefined) goals.push(requireString(raw.goalId, code, 'goalId 不能为空'));
  if (raw.goalIds !== undefined) {
    assert(Array.isArray(raw.goalIds), code, 'goalIds 必须是数组');
    for (const goal of raw.goalIds) goals.push(requireString(goal, code, 'goalIds 含有空引用'));
  }
  const uniqueGoals = [...new Set(goals)];
  assert(uniqueGoals.length > 0, code, '至少需要一个目标节点');
  const background = Array.isArray(raw.background) ? raw.background.map(normalizeBackgroundEntry) : [];
  const horizon = raw.horizon === undefined ? 8 : requireInteger(raw.horizon, code, 'horizon 必须是 0 到 32 的整数', { min: 0, max: 32 });
  const maxCandidates = raw.maxCandidates === undefined ? 100000 : requireInteger(raw.maxCandidates, code, 'maxCandidates 必须是正整数', { min: 1, max: 1000000 });
  const strategy = isPlainObject(raw.strategy) ? { ...raw.strategy } : {};
  if (strategy.costs !== undefined) {
    assert(isPlainObject(strategy.costs), code, 'strategy.costs 必须是对象');
    for (const [actionId, cost] of Object.entries(strategy.costs)) {
      assert(typeof cost === 'number' && Number.isFinite(cost) && cost >= 0, code, `行动 ${actionId} 的成本必须是有限非负数`);
    }
  }
  if (strategy.orderSets !== undefined) {
    assert(Array.isArray(strategy.orderSets), code, 'strategy.orderSets 必须是数组');
    for (const orderSet of strategy.orderSets) {
      assert(Array.isArray(orderSet), code, '每个 orderSet 必须是数组');
      for (const edge of orderSet) {
        assert(isPlainObject(edge) && isPlainObject(edge.from) && isPlainObject(edge.to), code, '策略次序边必须形如 {from:{action,index},to:{action,index}}');
        requireInteger(edge.from.index, code, '策略次序缺少事件下标');
        requireInteger(edge.to.index, code, '策略次序缺少事件下标');
        requireString(edge.from.action, code, '策略次序缺少行动引用');
        requireString(edge.to.action, code, '策略次序缺少行动引用');
      }
    }
  }
  const budget = raw.budget === undefined || raw.budget === null ? null : (() => {
    assert(isPlainObject(raw.budget), code, 'budget 必须是对象或 null');
    return {
      maxCost: raw.budget.maxCost === undefined ? null : requireInteger(raw.budget.maxCost, code, 'budget.maxCost 必须是非负整数', { min: 0 }),
      currency: raw.budget.currency ?? 'declared-cost',
    };
  })();
  return {
    goals: uniqueGoals,
    background,
    horizon,
    maxCandidates,
    strategy,
    budget,
    useUnknownEntries: raw.useUnknownEntries !== false,
    requireConfirmedBackground: raw.requireConfirmedBackground !== false,
    review: isPlainObject(raw.review) ? { node: requireString(raw.review.node, code, 'review.node 不能为空'), actionId: optionalString(raw.review.actionId) } : null,
  };
}

export function normalizeLocalizationRequest(raw) {
  const code = CODES.BAD_REQUEST;
  assert(isPlainObject(raw), code, '局部化请求必须是对象');
  assert(isPlainObject(raw.params ?? {}), code, 'params 必须是对象');
  return {
    params: raw.params ?? {},
    profileId: optionalString(raw.profileId),
    goalId: optionalString(raw.goalId),
    budget: isPlainObject(raw.budget) ? raw.budget : null,
  };
}

export function normalizeEvent(raw, { profileId, ontologyVersion }) {
  const code = CODES.BAD_REQUEST;
  assert(isPlainObject(raw), code, '事件必须是对象');
  const kind = requireString(raw.kind, code, '事件缺少 kind');
  assert(EVENT_KINDS.includes(kind), code, `未知事件类型 ${kind}`);
  const occurredAt = raw.occurredAt ?? new Date().toISOString();
  assert(!Number.isNaN(Date.parse(occurredAt)), code, '事件时间无效');
  assert(Date.parse(occurredAt) <= Date.now() + 300000, code, '事件时间不能位于未来');
  const source = isPlainObject(raw.source) ? raw.source : { kind: 'browser', ref: 'ui' };
  assert(['browser', 'deeptutor', 'import', 'system', 'user'].includes(source.kind), code, '事件来源类型无效');
  return {
    eventId: requireString(raw.eventId, code, '事件缺少 eventId'),
    profileId,
    ontologyVersion,
    kind,
    nodeId: requireString(raw.nodeId, code, '事件缺少 nodeId'),
    occurredAt: new Date(occurredAt).toISOString(),
    baseRevision: raw.baseRevision === undefined || raw.baseRevision === null ? null : requireInteger(raw.baseRevision, code, 'baseRevision 必须是非负整数', { min: 0 }),
    source: { kind: source.kind, ref: requireString(source.ref ?? 'unknown', code, '事件来源缺少 ref') },
    evidenceRefs: Array.isArray(raw.evidenceRefs) ? raw.evidenceRefs.map((item) => requireString(item, code, '证据引用无效')) : [],
    payload: isPlainObject(raw.payload) ? { ...raw.payload } : {},
  };
}

export function normalizeNote(raw) {
  const code = CODES.BAD_REQUEST;
  assert(isPlainObject(raw), code, '笔记必须是对象');
  return {
    noteId: optionalString(raw.noteId),
    nodeId: optionalString(raw.nodeId) ?? null,
    title: requireString(raw.title ?? '未命名笔记', code, '笔记标题无效').slice(0, 200),
    body: typeof raw.body === 'string' ? raw.body.slice(0, 200000) : '',
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag) => typeof tag === 'string').slice(0, 30) : [],
    baseRevision: raw.baseRevision === undefined || raw.baseRevision === null ? null : requireInteger(raw.baseRevision, code, 'baseRevision 必须是非负整数', { min: 0 }),
  };
}

/**
 * 规范化一个保存的知识网络视图。
 *
 * payload 的形状是固定的：`added`（节点 id）、`families`（可见边源）、
 * `positions`（手动位置）、`camera`（相机）。这里只检查**形状与范围**；
 * 「节点是否真在本体里」由 API 层用本体核对——存储与契约层不该依赖本体。
 */
/**
 * 边源（族）的权威清单。
 *
 * 前端那份在 `web/src/network.ts` 的 `DEFAULT_FAMILIES`；服务端不能 import TS，
 * 因此在这里留一份**同名同序**的副本，供接口校验「保存的视图里有没有未知边源」。
 * 两处若不一致，验收会先失败（`tests/network-views.mjs` 对着接口核对）。
 */
export const EDGE_FAMILIES = ['contract', 'relation', 'topic', 'pattern', 'sharedInput', 'evidence', 'support'];

export function normalizeNetworkView(raw) {
  const code = CODES.BAD_REQUEST;
  assert(isPlainObject(raw), code, '视图必须是对象');
  const name = requireString(raw.name ?? '', code, '视图需要一个名字').slice(0, 80);
  const payload = isPlainObject(raw.payload) ? raw.payload : {};
  const added = Array.isArray(payload.added) ? payload.added.filter((id) => typeof id === 'string' && id.length > 0).slice(0, 2000) : [];
  const families = Array.isArray(payload.families) ? payload.families.filter((id) => typeof id === 'string').slice(0, 40) : [];
  const positions = {};
  for (const [id, point] of Object.entries(isPlainObject(payload.positions) ? payload.positions : {})) {
    if (!isPlainObject(point)) continue;
    const x = Number(point.x); const y = Number(point.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    positions[id] = { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
  }
  const camera = isPlainObject(payload.camera) && Number.isFinite(Number(payload.camera.scale))
    ? { x: Number(payload.camera.x) || 0, y: Number(payload.camera.y) || 0, scale: Number(payload.camera.scale) }
    : null;
  return {
    name,
    payload: { added: [...new Set(added)], families: [...new Set(families)], positions, camera },
    baseRevision: raw.baseRevision === undefined || raw.baseRevision === null ? null : requireInteger(raw.baseRevision, code, 'baseRevision 必须是非负整数', { min: 0 }),
  };
}

export function normalizeProfileDraft(raw) {
  const code = CODES.BAD_REQUEST;
  assert(isPlainObject(raw), code, '档案必须是对象');
  return {
    name: requireString(raw.name ?? '新档案', code, '档案名称无效').slice(0, 80),
    modelVersion: optionalString(raw.modelVersion) ?? 'mcs-manual-model/1',
    kind: raw.kind === 'demo' ? 'demo' : 'personal',
  };
}

export function validateImportBundle(raw) {
  const code = CODES.IMPORT_INVALID;
  assert(isPlainObject(raw), code, '导入文件必须是 JSON 对象');
  assert(raw.schema === 'mcs-web-profile-export/1', code, '导入文件 schema 不匹配');
  assert(isPlainObject(raw.profile), code, '导入文件缺少 profile');
  assert(Array.isArray(raw.events), code, '导入文件缺少 events 数组');
  assert(Array.isArray(raw.notes ?? []), code, '导入文件 notes 必须是数组');
  return raw;
}

export function normalizeTutorTurn(raw) {
  const code = CODES.BAD_REQUEST;
  assert(isPlainObject(raw), code, '辅导回合必须是对象');
  return {
    kind: raw.kind === 'answer' ? 'answer' : 'question',
    content: requireString(raw.content, code, '辅导内容不能为空').slice(0, 20000),
    requestId: requireString(raw.requestId, code, '辅导回合缺少 requestId'),
    answerEventId: optionalString(raw.answerEventId),
  };
}

export function envelope(ontologyVersion, data) {
  return { ok: true, protocol: PROTOCOL, ontologyVersion, data };
}

export function errorEnvelope(error) {
  if (error instanceof McsError) {
    return {
      ok: false,
      protocol: PROTOCOL,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        /*
         * 两个布尔各回答一个问题（2026-10 加，TODO A4-30）：
         * `retryable` = 同一个请求稍后重发可能成功；`recoverable` = 换个请求（改参数/换节点）可能成功。
         * 站内适配器与 mcs-bridge 用同一张码表（`shared/errors.mjs` 的 RECOVERABLE_CODES 与
         * 桥接 `contracts.mjs` 的对应表），取值是否一致由两边的测试核对。
         */
        retryable: error.retryable,
        recoverable: error.recoverable,
      },
    };
  }
  return { ok: false, protocol: PROTOCOL, error: { code: CODES.INTERNAL, message: '服务器内部错误', details: undefined, retryable: false, recoverable: false } };
}
