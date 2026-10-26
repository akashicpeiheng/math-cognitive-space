/**
 * /api/v2 的路由与处理器。
 *
 * ## 三条写在最前面的约定（第五十二轮各踩过一次，先看这里再看路由）
 *
 * 1. **`query` 是 `URLSearchParams`，一律用 `.get(name)`**。属性访问（`query.granularity`）
 *    永远返回 `undefined`，而且不会报错——那一次 `granularity=topic` 就是这样静默降级成
 *    `unit` 的（返回 200，内容不对）。参数名清单见 README 的「`GET /ontology/nodes` 的查询参数」。
 * 2. **`scope` 与 `granularity` 不能混用**：前者是方法的适用范围（`Method.formal.scope`）
 *    或这条关系说的是什么（`relation.scope`）；后者才是**条目粒度**（`unit` / `topic`）。
 *    查询参数只有 `granularity`。
 * 3. **未知取值不静默改语义**：`granularity` 的未知值回退成 `unit`，并在响应里如实回报实际档位；
 *    其它筛选参数遇到未知值是「筛出 0 条」，不是「当作没筛」。
 */
import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { McsError, CODES, isMcsError } from '../shared/errors.mjs';
import {
  PROTOCOL, normalizePlanRequest, normalizeLocalizationRequest, normalizeEvent,
  normalizeNote, normalizeProfileDraft, normalizeTutorTurn, validateImportBundle,
  envelope, errorEnvelope, assert, canonicalString,
  // 保存视图要用：边源清单（与前端 DEFAULT_FAMILIES 同名同序的权威副本）。
  EDGE_FAMILIES,
} from '../shared/contracts.mjs';
import { makePlanner, explainPlanner } from '../core/planner.mjs';
import {bindContentRequest,selectContentOntology} from '../core/content-case.mjs';
import { normalizeLearningPlan } from '../shared/learning-plan.mjs';
import { personalizePlanResult } from '../core/learning-plan.mjs';
import { makeLocalizer, explainLocalizationFamilies } from '../core/localization.mjs';
import { DEFAULT_LOCALE, normalizeLocale } from '../shared/locales.mjs';
import { fieldGuidesFor } from '../data/field-guides/index.mjs';
/*
 * 放缩关系（`scaling`）的**已验证方向**：图接口要把「一般端 / 特殊端」下发给前端，
 * 网络视图才能画出「一般端粗、特殊端细」的渐变箭头（2026-10-11）。
 *
 * 为什么由服务端解析而不是把 `direction` 原样发过去：`from`/`to` 与
 * `direction.reading`（`contract` = 一般→特殊、`expand` = 特殊→一般）的对应关系是一条**判据**
 * （见 `shared/scaling.mjs` 的 `scalingEndpoints`）。前端不引 `shared/*.mjs`，
 * 两边各写一份迟早会漂——这里直接发解析结果：**能对上就是一对端点，对不上就是 null**
 * （11 条旧记录没有明确方向，渲染因此不做粗细变化，不假装知道谁是「泛化」那一端）。
 */
import { scalingEndpoints } from '../shared/scaling.mjs';
import { relationConnectionKey, connectionExists } from '../shared/connection-keys.mjs';
/*
 * 节点检索的相关性排序（2026-10-12 加）：命中集合与排序规则都在这一处，
 * 前端「全部节点」面板用等价实现（`web/src/search-rank.ts`），由 parity 测试钉住两处一致。
 */
import { matchesQuery, rankNodes } from '../shared/search-rank.mjs';
import { checkFormation, checkOntologyLegality, roleSummary } from '../core/formation.mjs';
import { querySupport, supportSummary } from '../core/support.mjs';
import { relationSummary, composeRelations } from '../core/relations.mjs';
import { maintenanceSources } from './maintenance.mjs';
import { checkWriteOrigin } from './deployment.mjs';
import { replayCertificate, evidenceSummary, evidenceView } from '../core/evidence.mjs';
import { leanCapabilities, leanRegistrationView, captureLeanSnapshot } from '../core/lean.mjs';
import { adaptWithOntology, adapt, deriveExternalState } from '../core/adaptation.mjs';
import { claimsIndex, obligationsIndex, notationIndex, researchSummary } from '../core/research.mjs';
import {
  PROFILE_TEMPLATES, PROFILE_TEMPLATE_IDS, DEFAULT_PROFILE_TEMPLATE_ID,
  profileTemplate,
} from '../data/profile-templates.mjs';
import { applyProfileTemplate } from './profile-templates.mjs';
import { registerVaultApi } from './vault-api.mjs';
import { registerContentApi, legacyContentProjection } from './content-api.mjs';
import { legacyMaster } from './master-view.mjs';
import { registerNetworkApi, checkNetworkRefs } from './network-api.mjs';
import { buildScalePlan } from '../core/scale.mjs';
import { normalizeNetworkExtras, decodeNoteKey, nodeRefKey } from '../shared/network-workspace.mjs';

const MAX_BODY = 2 * 1024 * 1024;

function readJson(req) {
  return new Promise((resolvePromise, rejectPromise) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) { rejectPromise(new McsError(CODES.BAD_REQUEST, '请求体超过 2MB 限制', 413)); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) { resolvePromise({}); return; }
      try { resolvePromise(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (error) { rejectPromise(new McsError(CODES.BAD_REQUEST, `请求体不是合法 JSON：${error.message}`)); }
    });
    req.on('error', rejectPromise);
  });
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store' });
  res.end(body);
}

function compactNode(ontology, node) {
  return {
    master: legacyMaster(ontology, node, true),
    id: node.id,
    version: node.version,
    title: node.title,
    construct: node.construct,
    roles: node.roles,
    discipline: node.discipline,
    case: node.case,
    summary: node.summary,
    // 证据等级登记在 teaching.evidenceStatus（53/66 节点已有）；provenance 只保留来源信息。
    evidenceStatus: node.teaching?.evidenceStatus ?? node.provenance?.evidenceStatus ?? null,
    hasContent: Boolean(node.contentMarkdown),
    /*
     * 是否登记了形式表达（式子和读法）。
     *
     * 列表接口只给标记、不给内容：研究台的「形式语言装备」要按这个筛，
     * 而把 16 条 LaTeX 塞进 232 个节点的列表里没有意义（详情接口才给全文）。
     */
    hasFormalStatement: Boolean(node.formalStatement),
    /*
     * 条目层级：'unit' = 最小的可独立认知单元，'topic' = 话题级条目（用户要求分开）。
     * 列表接口如实下发，由前端决定默认显示哪些；服务端不替调用方做取舍。
     */
    granularity: node.granularity ?? 'unit',
    /*
     * 合并口径（2026-10 加，见 `data/merges.mjs`）：
     * - `cases` 是「自身案例 + 各被合并登记的案例」，界面按它筛案例、按它显示「同时属于哪几条线」；
     * - `mergeCount` 是被收口进来的登记数（0 = 没有合并），列表用它挂一枚「含 N 处登记」的徽标；
     * - `alsoKnownAs` 是那些登记的标题（别名），检索也认它们——合并后仍搜得到「坐标图」「连通集」。
     */
    cases: node.cases ?? [node.case],
    mergeCount: (node.registrations ?? []).length,
    alsoKnownAs: node.alsoKnownAs ?? [],
    actionCount: ontology.actionsFor(node.id).length,
    relationCount: ontology.relationsFor(node.id).length,
    evidenceCount: ontology.evidenceFor(node.id).length,
  };
}

function compactAction(action) {
  return { id: action.id, mode: action.mode, title: action.title, inputs: action.inputs, outputs: action.outputs, witness: action.witness, openAssumptions: action.openAssumptions ?? [] };
}

/**
 * 动态装载「自动关系发现」相关模块。
 *
 * 这些模块与本站其它部分分开演进；用懒加载而不是顶层 import，有两个好处：
 * 1. 某个可选模块暂时不可用时，**其余接口照常工作**，错误只落在相关接口上；
 * 2. 启动时不付加载代价。
 *
 * 装载失败会抛 `ONTOLOGY_INVALID`（不可恢复）：这不是「换个请求就好」的错，
 * 而是服务端文件本身缺了或坏了。
 */
const optionalModules = new Map();
async function optionalModule(specifier) {
  if (optionalModules.has(specifier)) {
    const cached = optionalModules.get(specifier);
    if (cached instanceof Error) throw cached;
    return cached;
  }
  try {
    const loaded = await import(specifier);
    optionalModules.set(specifier, loaded);
    return loaded;
  } catch (error) {
    const wrapped = new McsError(
      CODES.ONTOLOGY_INVALID,
      `自动关系发现模块未就绪：${specifier}（${error.message}）`,
      500,
      { specifier, reason: error.message },
    );
    optionalModules.set(specifier, wrapped);
    throw wrapped;
  }
}

/**
 * 与 `optionalModule` 同一套缓存，但**缺失时返回 null**。
 *
 * 用于「有它更好、没有也不该让别处红」的装饰性模块（例如四案例登记表尚未装配时的
 * `formal/catalog`）。它绝不会把「模块坏了」伪装成「没有这个模块」——两者都返回 null，
 * 但会在响应里如实写明走的是哪一条分支。
 */
async function tryModule(specifier) {
  try { return await optionalModule(specifier); } catch { return null; }
}

export function createApi({ getOntology, ontology: ontologyRef, db, jobs, leanJobs, tutor, config, ontologySource = null, auth = null, cloud = null }) {
  /*
   * 本体快照：请求**进入时**取一次，整个请求用同一个实例。
   *
   * 这样「入库后新请求读新版本、运行中的任务继续用原版本」不是靠自觉，
   * 而是结构上做不到中途换——`ontology` 在下面全部是局部 const。
   */
  const resolveOntology = typeof getOntology === 'function' ? getOntology : () => ontologyRef;
  // 启动时的那一份：**只**用于「有没有本体」的自检。任何路由都不许直接读它
  // ——发布之后它不仅旧，而且会让「节点查得到、证据查不到」这类不一致四处冒头。
  const startupOntology = resolveOntology();
  if (typeof startupOntology !== 'object' || startupOntology === null) {
    throw new McsError(CODES.ONTOLOGY_INVALID, 'createApi 需要 ontology 或 getOntology()', 500);
  }
  const requestOntology = () => {
    const current = resolveOntology();
    if (typeof current !== 'object' || current === null) {
      throw new McsError(CODES.ONTOLOGY_INVALID, '本体快照不可用', 500);
    }
    return current;
  };

  /* ==========================================================================
   * 语种（2026-10 中英双语）
   *
   * ## 只换文本，不换结构
   *
   * `localizedOntology()` 返回的是同一份快照的**语言视图**：`version` / `contentHash`
   * 逐字相同（覆盖在哈希之后应用），节点、行动、证据的 id 与受控词表值一律不动。
   * 于是「换语言」不会换掉学习者档案里的 `ontologyVersion`，E 层天然跨语言共享。
   *
   * ## 语种从哪来
   *
   * 只认两个地方，优先级明确：`?locale=` 查询参数 → `x-mcs-locale` 请求头 → 默认 `zh`。
   * **不读 `Accept-Language`**：浏览器每次请求都自动带它，用它做协商会让「分享出去的
   * 英文链接在中文浏览器里打开变成中文」，而链接的路径前缀（`/en/...`）已经表达了意图。
   * 未知语种回落 `zh`，并在响应头里如实回报实际使用的语种，不假装它就是请求的那一个。
   * ======================================================================== */
  const localizedCache = new Map();
  async function localizedFor(current, locale) {
    if (locale === DEFAULT_LOCALE) return current;
    const key = `${current.version}::${locale}`;
    const hit = localizedCache.get(key);
    if (hit) return hit;
    const module = await optionalModule('../data/i18n/index.mjs');
    const overlay = await module.overlayFor(locale);
    if (!overlay) {
      /*
       * 该语种没有覆盖目录（尚未开始翻译）：返回中文快照，但**不缓存**——
       * 翻译文件一落地，下一个请求就该拿到新内容，不必重启。
       */
      return current;
    }
    const { localizedOntology } = await optionalModule('../data/i18n/overlay.mjs');
    const localized = localizedOntology(current, locale, () => overlay);
    localizedCache.set(key, localized);
    while (localizedCache.size > 4) localizedCache.delete(localizedCache.keys().next().value);
    return localized;
  }
  function resolveLocale(url, req) {
    const fromQuery = url.searchParams.get('locale');
    const fromHeader = typeof req?.headers?.['x-mcs-locale'] === 'string' ? req.headers['x-mcs-locale'] : null;
    return normalizeLocale(fromQuery ?? fromHeader ?? DEFAULT_LOCALE);
  }

  /*
   * 规划器与局部化器都是 ontology 的**纯函数**（只建索引，没有副作用），
   * 所以按本体版本缓存：发布切版本后第一次用到时重建，旧版本最多留 2 份，
   * 免得每次发布都在内存里留一份全量索引。
   */
  const derivedCache = new Map();
  const derivedFor = (current) => {
    let entry = derivedCache.get(current.version);
    if (!entry) {
      entry = { planner: makePlanner(current), localizer: makeLocalizer(current) };
      derivedCache.set(current.version, entry);
      while (derivedCache.size > 2) derivedCache.delete(derivedCache.keys().next().value);
    }
    return entry;
  };
  /*
   * 尺度登记（2026-10-17 加）。
   *
   * 它是从 `aggregates` 与 `data/scale.mjs` 构建的**派生投影**，不进 contentHash；
   * 但同一本体版本下必须得到同一份计划，所以按 `ontology.version` 缓存。
   * 构建失败是数据缺陷，不是「换个请求就好」：转成 ONTOLOGY_INVALID 并带上逐条问题。
   */
  const scalePlanCache = new Map();
  const scalePlanFor = (current) => {
    let plan = scalePlanCache.get(current.version);
    if (!plan) {
      try {
        plan = buildScalePlan({ nodes: current.raw.nodes, aggregates: current.raw.aggregates });
      } catch (error) {
        throw new McsError(CODES.ONTOLOGY_INVALID, `尺度登记未通过检查：${error.message}`, 500, { problems: error.problems ?? [] });
      }
      scalePlanCache.set(current.version, plan);
      while (scalePlanCache.size > 2) scalePlanCache.delete(scalePlanCache.keys().next().value);
    }
    return plan;
  };
  const routes = [];
  const route = (method, pattern, handler) => routes.push({ method, pattern, handler });

  /*
   * 版本核对：拿**本次请求那一份**快照比。
   *
   * `ontology` 由调用方显式传入（路由参数里的那个），不再读闭包里的启动快照——
   * 发布之后启动快照的版本号是旧的，会把这个校验变成「永远冲突」或「永远不冲突」。
   */
  function checkVersion(body, query, ontology) {
    const received = body?.ontologyVersion ?? query?.get('ontologyVersion');
    if (received && received !== ontology.version) {
      throw new McsError(CODES.VERSION_CONFLICT, '本体版本不一致；请重新加载页面，旧会话保留但不混用。', 409, { expected: ontology.version, received });
    }
  }

  async function profileState(profileId) {
    const profile = await db.getProfile(profileId);
    /*
     * 状态重建读**全量**事件，不读界面分页的那一页。
     * 从前这里写 `limit: 2000`，超过 2000 条之后最早的确认事件被丢，
     * θ.known 会「凭空少几个已掌握」，界面不报错。分页是给人翻的，不是状态的定义。
     */
    const events = await db.listAllEvents(profileId);
    return { ...profile, events };
  }

  function checkNodeResolves(id, ontology) {
    if (!ontology.maybeNode(id) && !ontology.boundaryRefs.has(id)) throw new McsError(CODES.UNKNOWN_NODE, `无法解析节点：${id}`, 404, { node_id: id });
  }

  async function checkEvidenceRefs(profileId, refs) {
    for (const ref of refs) {
      if (!ref.startsWith('event:')) continue;
      const eventId = ref.slice('event:'.length);
      if (!await db.findEvent(profileId, eventId)) throw new McsError(CODES.UNKNOWN_EVIDENCE, `证据引用无法在当前档案解析：${ref}`, 422, { ref });
    }
  }

  /*
   * 写入口的来源校验。规则集中在 `server/deployment.mjs`：
   * 本机模式只认回环来源与无 Origin 的本机命令行；公网模式必须带 Origin 且与站点地址一致。
   * 从前这段逻辑写在这里、只覆盖自动关联的入口，公网模式没有对应实现——
   * 移出去之后，index.mjs 的 Host 白名单与这里的写来源校验用的是同一份配置。
   */
  const assertLocalOrigin = (req, cfg) => checkWriteOrigin(req, cfg);

  /* ==========================================================================
   * 身份与权限（2026-10 公网发布前加）
   *
   * ## 这一层解决什么问题
   *
   * 本机工作台里只有一个使用者，`db.listProfiles()` 列出全部档案是合理的。公网模式下
   * 同一个调用就是「列出所有人的学习记录」，`PATCH /profiles/:id` 就是「改别人的档案」。
   * 所以身份不能只在登录页出现，必须落在**每一个请求**上。
   *
   * ## 三条规则
   *
   * 1. **默认最严**：权限表里没登记的路由按 `admin` 处理。新增接口忘了登记时，
   *    结果是「只有管理员能用」，而不是「所有人都能用」——错在关门，不在开门。
   * 2. **归属不通过报 404，不报 403**：403 等于回答「这个 id 存在，但不是你的」，
   *    那就成了一个档案存在性探针。别人的档案在这里与「不存在」完全同形。
   * 3. **本机模式一律放行**：`auth.enabled` 为假时（单人使用、没有账号体系），
   *    行为与从前完全一致——这一层不改变本机工作台的任何语义。
   *
   * ## 与本机模式的关系
   *
   * 本机模式下 `identity` 是固定的本机管理员（`id: 'local'`），权限表照走一遍
   * 但每一条都放行。这样做的好处是：权限判定这条代码路径在本机测试里也被执行，
   * 不会出现「只有公网才跑得到、从没测过」的分支。
   * ======================================================================== */
  const AUTHENTICATED = auth?.enabled === true;
  const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
  const LOCAL_IDENTITY = Object.freeze({ user: Object.freeze({ id: 'local', role: 'admin', email: null }), local: true, sessionId: null });

  /*
   * 权限表：一条路由一行，`access` 取 `public` / `user` / `admin`。
   *
   * - `public`：无需登录。只给「公共本体与它的派生结果」这类**只读或纯计算**的接口；
   * - `user`：要登录，且只能碰自己的对象（档案、任务、辅导会话）；
   * - `admin`：要登录且身份是管理员。公共内容的入库、发布、撤回、备份恢复都在这里。
   *
   * 顺序即优先级：先匹配到的规则生效，所以具体路径写在通配路径前面。
   */
  const POLICY = [
    { method: 'GET', pattern: /^\/api\/v2\/(ontology\/(objects(\/[^/]+)?|object-scale|object-network|mcs-view)|learning\/(nodes(\/[^/]+)?|network)|content-cases|content-relations\/[^/]+)$/, access: 'public' },
    { method: 'GET', pattern: /^\/api\/v2\/lean\/(capabilities|registrations\/[^/]+)$/, access: 'public' },
    { method: 'POST', pattern: /^\/api\/v2\/lean\/jobs$/, access: 'user' },
    { method: ['GET', 'DELETE'], pattern: /^\/api\/v2\/lean\/jobs\/[^/]+$/, access: 'user' },
    { method: 'POST', pattern: /^\/api\/v2\/learning-plan-preview$/, access: 'public' },
    { method: ['GET', 'DELETE'], pattern: /^\/api\/v2\/learning-plan-preview\/[^/]+$/, access: 'public' },
    // —— 公共只读：本体、证据、研究索引、形式化目录、健康检查
    { method: 'GET', pattern: /^\/api\/v2\/(health|ontology|ontology\/[a-z]+|evidence|research\/[a-z]+|localizations|formal\/catalog)$/, access: 'public' },
    { method: 'GET', pattern: /^\/api\/v2\/ontology\/nodes\/[^/]+$/, access: 'public' },
    // —— 公共纯计算：关系合成、局部化算子、形式化校验（不读别人的档案，见 authorize 的 body.profileId 检查）
    { method: 'POST', pattern: /^\/api\/v2\/(relations\/compose|formal\/validate|localizations\/LC\d{2}\/compute)$/, access: 'public' },
    // —— 证书重放会拉起子进程，是资源入口：要登录
    { method: 'POST', pattern: /^\/api\/v2\/evidence\/replay$/, access: 'user' },
    // —— 规划任务：要登录，且只能看自己的任务
    { method: 'POST', pattern: /^\/api\/v2\/plans$/, access: 'public' },
    { method: ['GET', 'DELETE'], pattern: /^\/api\/v2\/plans\/[^/]+$/, access: 'public' },
    // —— 个人数据：档案及其全部子资源（事件、笔记、网络视图、导出）
    /*
     * 档案模板是**公共只读**的登记表（不含任何学习者数据），因此放在 profiles 的通配规则之前，
     * 走 public。它必须显式登记：权限表未登记的路由按 admin 处理。
     */
    { method: 'GET', pattern: /^\/api\/v2\/(profile-templates|field-guides)$/, access: 'public' },
    { method: 'GET', pattern: /^\/api\/v2\/profiles$/, access: 'user' },
    { method: 'POST', pattern: /^\/api\/v2\/profiles$/, access: 'user' },
    { method: '*', pattern: /^\/api\/v2\/profiles\/[^/]+(\/.*)?$/, access: 'user' },
    { method: 'POST', pattern: /^\/api\/v2\/import$/, access: 'user' },
    { method: ['GET', 'PUT', 'DELETE'], pattern: /^\/api\/v2\/me\/connection-notes(\/[^/]+)?$/, access: 'user' },
    { method: 'GET', pattern: /^\/api\/v2\/vault-capabilities$/, access: 'public' },
    { method: '*', pattern: /^\/api\/v2\/(me\/(network-relations|relation-submissions)|network-relation-checks)(\/.*)?$/, access: 'user' },
    { method: '*', pattern: /^\/api\/v2\/me\/vaults(\/.*)?$/, access: 'user' },
    // —— 辅导会话：要登录，会话按账号归属
    { method: 'POST', pattern: /^\/api\/v2\/tutor\/sessions$/, access: 'user' },
    { method: ['GET', 'POST'], pattern: /^\/api\/v2\/tutor\/(sessions|turns)\/[^/]+(\/turns)?$/, access: 'user' },
    // —— 运行状态与维护视图：运维面，只给管理员
    { method: 'GET', pattern: /^\/api\/v2\/maintenance\/[a-z]+$/, access: 'admin' },
    { method: 'GET', pattern: /^\/api\/v2\/tutor\/status$/, access: 'public' },
    // —— 全站备份与恢复：只有管理员
    { method: '*', pattern: /^\/api\/v2\/(backup|restore)$/, access: 'admin' },
    // —— 公共内容入库 / 发布 / 撤回：只有管理员
    { method: '*', pattern: /^\/api\/v2\/authoring\/.*$/, access: 'admin' },
    { method: '*', pattern: /^\/api\/v2\/relation-discovery\/.*$/, access: 'admin' },
  ];
  const DEFAULT_ACCESS = 'admin';

  function accessFor(method, pathname) {
    for (const rule of POLICY) {
      const matches = rule.method === '*' || rule.method === method
        || (Array.isArray(rule.method) && rule.method.includes(method));
      if (matches && rule.pattern.test(pathname)) return rule.access;
    }
    return DEFAULT_ACCESS;
  }

  /** 档案归属：不是自己的档案与「不存在」同形（404）。 */
  async function requireProfile(identity, profileId) {
    if (!AUTHENTICATED) return;
    if (!identity?.user) throw new McsError(CODES.AUTH_REQUIRED, '这个操作要指定账号下的档案，请先登录。', 401);
    await auth.store.requireOwner('profile', profileId, identity.user.id);
  }

  /**
   * 授权：先按权限表判级别，再按**路径与请求体里出现的档案 id** 判归属。
   *
   * 请求体也要查，是因为像 `POST /localizations/:id/compute`、`POST /plans` 这样的
   * 「公共纯计算」接口可以带 `profileId` 进去，用那个档案的状态当输入——只看路径会漏掉它。
   */
  async function authorize(identity, method, pathname, body) {
    const access = accessFor(method, pathname);
    if (!AUTHENTICATED) return access;
    if (access !== 'public') {
      if (!identity?.user) throw new McsError(CODES.AUTH_REQUIRED, '请先登录再使用此功能。', 401);
      if (access === 'admin' && identity.user.role !== 'admin') {
        throw new McsError(CODES.FORBIDDEN, '此功能仅管理员可用。', 403, { required: 'admin' });
      }
    }
    const found = pathname.match(/^\/api\/v2\/profiles\/([^/]+)/);
    if (found) await requireProfile(identity, decodeURIComponent(found[1]));
    if (body && typeof body.profileId === 'string' && body.profileId) await requireProfile(identity, body.profileId);
    return access;
  }

  /** 规划任务归属：任务表在内存里，归属直接记在任务上；不是自己的任务报 404。 */
  const planningOwner = (req, identity) => AUTHENTICATED ? auth.planningOwner(req, identity) : null;
  async function requireJob(identity, id, req) {
    const job = await jobs.get(id);
    if (!AUTHENTICATED) return job;
    if (!['plan', 'review'].includes(job.kind) || job.owner !== planningOwner(req, identity)) {
      throw new McsError(CODES.NOT_FOUND, `无法解析规划任务：${id}`, 404, { job_id: id });
    }
    return job;
  }

  /** 辅导会话归属：会话 id 由辅导适配器生成，归属记在认证库里。 */
  async function requireTutorSession(identity, id) {
    if (!AUTHENTICATED) return;
    if (!identity?.user) throw new McsError(CODES.AUTH_REQUIRED, '请先登录再使用此功能。', 401);
    await auth.store.requireOwner('tutor', id, identity.user.id);
  }

  /** 认领新对象。本机模式下不记归属（没有账号可记）。 */
  async function claimOwnership(identity, kind, id) {
    if (!AUTHENTICATED || !id) return;
    await auth.store.claim(kind, id, identity.user.id);
  }

  /*
   * 形式化覆盖情况。
   *
   * 「已覆盖 / 未覆盖 / 未验证」三类必须分开，否则一张覆盖率表会把
   * 「本轮没写」和「写了但没验证」混成同一个数字。这里只数**可数的**：
   * 本体侧按案例统计节点数，登记侧给出已登记条数与仍缺的锚点。
   */
  function reportFormalCoverage(ontology, registry) {
    const specs = registry?.specs ?? [];
    const byNode = new Map(specs.map((spec) => [spec.node, spec]));
    const cases = [...new Set(ontology.raw.nodes.map((node) => node.case))].sort();
    return cases.map((caseId) => {
      const nodes = ontology.raw.nodes.filter((node) => node.case === caseId);
      const covered = nodes.filter((node) => byNode.has(node.id));
      return {
        case: caseId,
        nodes: nodes.length,
        specs: covered.length,
        specNodes: covered.map((node) => node.id),
        missing: registry ? nodes.filter((node) => !byNode.has(node.id)).map((node) => node.id) : [],
        note: registry ? '已登记形式表达的节点；其余节点本轮未写。' : '登记表未装配，本行只有本体侧计数。',
      };
    });
  }

  route('GET', /^\/api\/v2\/health$/, async ({ ontology }) => ({
    ok: true,
    service: 'mcs-web',
    protocol: PROTOCOL,
    version: '0.1.0',
    ontology: ontology.stats(),
    db: await db.stats(),
    tutor: await tutor.health(),
    runtime: { node: process.version, platform: process.platform, pid: process.pid, uptime: Math.round(process.uptime()) },
  }));

  route('GET', /^\/api\/v2\/field-guides$/, async ({ query, req, ontology }) =>
    fieldGuidesFor(normalizeLocale(query.get('locale') ?? req.headers['x-mcs-locale'], DEFAULT_LOCALE), ontology.version));

  route('GET', /^\/api\/v2\/ontology$/, async ({ ontology }) => {
    const legality = checkOntologyLegality(ontology.raw);
    return {
      schema: ontology.raw.schema,
      version: ontology.version,
      contentHash: ontology.contentHash,
      counts: ontology.stats().counts,
      coordinates: [
        { name: 'signature', label: '签名 Σ', size: ontology.raw.signature.baseTypes.length },
        { name: 'theory', label: '背景理论 T', size: ontology.raw.theory.axioms.length },
        { name: 'nodes', label: '节点集 N_M', size: ontology.raw.nodes.length },
        { name: 'payload', label: '不可变负载 Payload', size: Object.keys(ontology.raw.payload).length },
        { name: 'representations', label: '公开表征 Rep', size: ontology.raw.representations.length },
        { name: 'certificates', label: '认证证据 Cert', size: ontology.raw.evidence.length },
        { name: 'support', label: '支持族 Supp', size: ontology.raw.support.length },
        { name: 'actions', label: '公开行动契约 Λ_M', size: ontology.raw.actions.length },
        { name: 'relations', label: '通用关系描述 R⁰_M', size: ontology.raw.relationDescriptions.length },
        { name: 'aggregates', label: '聚合 Agg', size: ontology.raw.aggregates.length },
        { name: 'templates', label: '模板 Templ', size: ontology.raw.templates.length },
        { name: 'environmentBoundary', label: '环境版本边界 ∂M', size: ontology.raw.environmentBoundary.refs.length },
      ],
      theory: { id: ontology.raw.theory.id, title: ontology.raw.theory.title, calculus: ontology.raw.theory.calculus, axioms: ontology.raw.theory.axioms, modules: ontology.raw.theory.modules },
      signature: ontology.raw.signature,
      environmentBoundary: ontology.raw.environmentBoundary,
      legality,
      relationSummary: relationSummary(ontology),
      supportSummary: supportSummary(ontology),
      evidenceSummary: evidenceSummary(ontology),
      localizationFamilies: explainLocalizationFamilies(),
      planner: explainPlanner(),
      templates: ontology.raw.templates,
    };
  });

  route('GET', /^\/api\/v2\/ontology\/scale$/, async ({ ontology }) => {
    /*
     * 四层尺度登记（分子/节点/单元/话题）。**只读派生数据**：
     * 不写 M、不写 E、不改 ontology.contentHash；`version` 是计划自身内容的哈希。
     */
    const scale = scalePlanFor(ontology);
    return {
      ontologyVersion: ontology.version,
      version: scale.version,
      scale,
    };
  });

  route('GET', /^\/api\/v2\/ontology\/graph$/, async ({ query, ontology }) => {
    const caseId = query.get('case');
    /*
     * 案例筛选按 `cases`（合并后的登记归属）而不是 `case`（节点归属）：
     * 一个规范节点可能登记在多个案例里，按登记筛才不会让某条案例线凭空少几个点。
     */
    const nodes = ontology.raw.nodes.filter((node) => !caseId || (node.cases ?? [node.case]).includes(caseId));
    const ids = new Set(nodes.map((node) => node.id));
    return {
      version: ontology.version,
      nodes: nodes.map((node) => compactNode(ontology, node)),
      relations: ontology.raw.relationDescriptions.map((relation) => {
        /*
         * `scaling`：放缩关系的**已验证**一般端 / 特殊端（见文件顶部那段 import 说明）。
         * 其余种类不带这个字段——「谁是泛化那一端」只对放缩关系有定义。
         */
        const direction = relation.kind === 'scaling' ? scalingEndpoints(relation) : null;
        return {
          id: relation.id, kind: relation.kind, from: relation.from, to: relation.to,
          witness: relation.witness, scope: relation.scope ?? null,
          scaling: direction ? { general: direction.general, special: direction.special } : null,
          scalingMode: relation.scalingMode,
          scalingExplanation: relation.scalingExplanation ?? null,
          connectionKey: relationConnectionKey(relation),
        };
      }),
      actions: ontology.raw.actions.map(compactAction),
      aggregates: ontology.raw.aggregates.map((aggregate) => ({ id: aggregate.id, kind: aggregate.kind, title: aggregate.title, blocks: aggregate.blocks, note: aggregate.note ?? null })),
      patterns: ontology.raw.patterns,
      // 支持族与证据：网络视图用来生成「支持族相交」「同一份证据」两类边。
      // 形状保持最小（只要 id/use/set 与 id/nodes），不把整个证据记录塞进图接口。
      support: ontology.raw.support.map((record) => ({
        id: record.id, node: record.node, use: record.use, status: record.status,
        ...(Array.isArray(record.set) ? { set: record.set.filter((id) => ids.has(id)) } : {}),
      })),
      evidence: ontology.raw.evidence
        .filter((record) => (record.nodes ?? []).some((id) => ids.has(id)))
        .map((record) => ({ id: record.id, kind: record.kind, status: record.status, nodes: (record.nodes ?? []).filter((id) => ids.has(id)) })),
      note: caseId ? `只显示 case=${caseId} 的节点；关系与行动保留完整引用。` : '节点、行动、聚合与事件必须按类型区分显示。',
    };
  });

  route('GET', /^\/api\/v2\/ontology\/nodes$/, async ({ query, ontology }) => {
    /*
     * 默认只给**单元**（granularity=unit）：话题级条目是学习线索的名字，不是可独立认知的对象。
     * 想连话题一起看就显式查 ?granularity=all；只看话题用 ?granularity=topic。
     * 三个值都合法，未知值按 unit 处理，并在响应的 granularity 字段里如实回报（不静默改变语义）。
     *
     * 两条读参数的约定（README 的「API 概览」也写着，第五十二轮各踩过一次）：
     * 1. `query` 是 URLSearchParams：**必须用 .get()**，属性访问（query.granularity）永远是 undefined；
     * 2. `granularity`（条目粒度）与 `scope`（方法适用范围 / 关系的适用范围）不是一回事，不要混用。
     */
    const requested = String(query.get('granularity') ?? 'unit');
    const granularity = ['unit', 'topic', 'all'].includes(requested) ? requested : 'unit';
    const q = (query.get('q') ?? '').trim().toLowerCase();
    const discipline = query.get('discipline');
    const construct = query.get('construct');
    const role = query.get('role');
    const caseId = query.get('case');
    const limit = Math.min(Number(query.get('limit') ?? 200) || 200, 500);
    const matched = ontology.raw.nodes.filter((node) => {
      if (granularity !== 'all' && (node.granularity ?? 'unit') !== granularity) return false;
      if (discipline && node.discipline !== discipline) return false;
      if (construct && node.construct !== construct) return false;
      if (role && !node.roles.includes(role)) return false;
      // 案例按**登记归属**筛（`cases`）：合并进来的登记也要在它自己的案例里看得见。
      if (caseId && !(node.cases ?? [node.case]).includes(caseId)) return false;
      // 检索也认别名标题：合并后「坐标图」「连通集」这些旧名字仍然搜得到。
      if (!matchesQuery(node, q)) return false;
      return true;
    });
    /*
     * 检索**排序**（2026-10-12 加）：命中之后按相关性排，不再按 id 字典序。
     *
     * 用户报的：搜「紧」时「广义 Stokes 定理」（摘要里讲紧支撑）排在标题就叫
     * 「连续性与紧致性」的节点前面。规则与依据见 `shared/search-rank.mjs`。
     * 排序**只改次序、不改集合**——所以先筛后排，`total` / `returned` 两个数字不受影响。
     *
     * 排序在 `slice(0, limit)` **之前**：截断的是「相关性最低的那些」，
     * 而不是「id 最靠后的那些」（这一步以前是反的，搜出来的东西会缺）。
     */
    const ordered = q ? rankNodes(matched, q) : matched;
    const nodes = ordered.slice(0, limit).map((node) => compactNode(ontology, node));
    /*
     * 三种层级各自的条数一起下发：前端要靠它说明「默认没显示什么」，
     * 而不是让用户以为本库就这么多节点（不藏数据）。
     */
    const granularityCounts = ontology.raw.nodes.reduce((counts, node) => {
      const key = node.granularity ?? 'unit';
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, { unit: 0, topic: 0 });
    return {
      version: ontology.version,
      total: ontology.raw.nodes.length,
      returned: nodes.length,
      granularity,
      granularityCounts,
      nodes,
    };
  });

  route('GET', /^\/api\/v2\/ontology\/nodes\/([^/]+)$/, async ({ params, ontology }) => {
    const requested = decodeURIComponent(params[0]);
    const node = ontology.node(requested);
    const claims = ontology.raw.claims.filter((claim) => claim.node === node.id).map((claim) => ({ ...claim, evidence: claim.evidence.map((id) => evidenceView(ontology.evidence(id))) }));
    /*
     * 合并说明（见 `data/merges.mjs`）：这一组为什么是同一个对象、各处登记的差别是什么。
     * `requestedId` 与 `node.id` 不同时表示这条链接命中了别名（旧链接重定向），
     * 界面据此如实说明，而不是让读者以为 URL 被悄悄改掉了。
     */
    const merge = (ontology.raw.merges?.groups ?? []).find((group) => group.canonical === node.id) ?? null;
    return {
      version: ontology.version,
      requestedId: requested,
      node: { ...legacyContentProjection(node), master: legacyMaster(ontology, node) },
      merge,
      formation: checkFormation(node),
      roles: roleSummary(node),
      actions: ontology.actionsFor(node.id).map(compactAction),
      relations: ontology.relationsFor(node.id).map(relation => ({ ...relation, connectionKey: relationConnectionKey(relation) })),
      evidence: ontology.evidenceFor(node.id).map(evidenceView),
      support: ['expression', 'proof', 'route'].map((use) => ({ use, ...querySupport(ontology, node.id, use) })),
      claims,
      patterns: ontology.raw.patterns.filter((pattern) => pattern.node === node.id || (ontology.maybeNode(node.id)?.formal?.anchors ?? []).includes(pattern.node)),
      provenance: node.provenance ?? { sources: [] },
      boundary: node.formal?.boundary ?? [],
    };
  });

  route('GET', /^\/api\/v2\/ontology\/actions$/, async ({ ontology }) => ({ version: ontology.version, actions: ontology.raw.actions.map(compactAction) }));
  route('GET', /^\/api\/v2\/ontology\/relations$/, async ({ ontology }) => ({ version: ontology.version, relations: ontology.raw.relationDescriptions.map(relation => ({ ...relation, connectionKey: relationConnectionKey(relation) })), summary: relationSummary(ontology) }));
  route('POST', /^\/api\/v2\/relations\/compose$/, async ({ body, ontology }) => {
    checkVersion(body, undefined, ontology);
    const pick = (ids) => (Array.isArray(ids) ? ids : []).map((id) => {
      const relation = ontology.raw.relationDescriptions.find((item) => item.id === id);
      if (!relation) throw new McsError(CODES.UNKNOWN_EVIDENCE, `无法解析关系：${id}`, 404, { relation_id: id });
      return relation;
    });
    const left = pick(body.left);
    const right = pick(body.right);
    return {
      left: left.map((relation) => relation.id),
      right: right.map((relation) => relation.id),
      composed: composeRelations(left, right),
      note: '复合只保留可达性；复合导航不自动仍是直接类比或因果关系，也不签发新的认证关系。',
    };
  });
  route('GET', /^\/api\/v2\/ontology\/aggregates$/, async ({ ontology }) => ({ version: ontology.version, aggregates: ontology.raw.aggregates }));
  route('GET', /^\/api\/v2\/ontology\/coverage$/, async ({ ontology }) => ({ version: ontology.version, coverage: ontology.raw.coverage }));
  // 网站维护：专稿分章、arXiv 投稿包、发布文档与本机参考文献的**只读**清单。
  route('GET', /^\/api\/v2\/maintenance\/sources$/, async () => maintenanceSources());
  route('GET', /^\/api\/v2\/ontology\/templates$/, async ({ ontology }) => ({ version: ontology.version, templates: ontology.raw.templates }));
  route('GET', /^\/api\/v2\/ontology\/patterns$/, async ({ ontology }) => ({ version: ontology.version, patterns: ontology.raw.patterns }));

  route('GET', /^\/api\/v2\/evidence$/, async ({ ontology }) => ({ version: ontology.version, summary: evidenceSummary(ontology), evidence: ontology.raw.evidence.map(evidenceView) }));
  route('GET', /^\/api\/v2\/lean\/capabilities$/, async () => ({ ...(await (cloud ? leanJobs.capabilities() : leanCapabilities(config.repoRoot, config.lean ?? {}))), queue: await leanJobs.stats() }));
  route('GET', /^\/api\/v2\/lean\/registrations\/([^/]+)$/, async ({ params, query, ontology }) => {
    const id = decodeURIComponent(params[0]);
    const [view, snapshot] = await Promise.all([leanRegistrationView(config.repoRoot, id, query.get('locale')), captureLeanSnapshot(config.repoRoot, id)]);
    if (view.inputSha256 !== snapshot.inputSha256) throw new McsError(CODES.VERSION_CONFLICT, 'Lean 材料正在修订，请重新读取。', 409);
    return { ...view, ontologyVersion: ontology.version, correspondenceDocument: { file: 'README.md', sha256: snapshot.hashes['README.md'], content: snapshot.files['README.md'] } };
  });
  route('POST', /^\/api\/v2\/lean\/jobs$/, async ({ body, ontology, identity }) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new McsError(CODES.BAD_REQUEST, 'Lean 请求必须是登记对象。', 400);
    const keys = Object.keys(body ?? {});
    if (keys.some(key => !['evidenceId', 'ontologyVersion'].includes(key)) || typeof body.evidenceId !== 'string' || typeof body.ontologyVersion !== 'string') throw new McsError(CODES.BAD_REQUEST, 'Lean 请求只接受 evidenceId 和 ontologyVersion。', 400);
    checkVersion(body, undefined, ontology);
    const record = ontology.evidence(body.evidenceId);
    if (record.backend !== 'lean4') throw new McsError(CODES.EVIDENCE_UNSUPPORTED, '该证据没有登记 Lean 证明。', 422);
    return leanJobs.run({ evidenceId: record.id, ontologyVersion: ontology.version, owner: identity?.user?.id ?? 'local' });
  });
  route('GET', /^\/api\/v2\/lean\/jobs\/([^/]+)$/, async ({ params, identity }) => leanJobs.get(params[0], identity?.user?.id ?? 'local'));
  route('DELETE', /^\/api\/v2\/lean\/jobs\/([^/]+)$/, async ({ params, identity }) => leanJobs.cancel(params[0], identity?.user?.id ?? 'local'));
  route('POST', /^\/api\/v2\/evidence\/replay$/, async ({ body, ontology }) => {
    checkVersion(body, undefined, ontology);
    const record = ontology.evidence(body.evidenceId);
    if (record.kind !== 'machine-certificate') throw new McsError(CODES.EVIDENCE_UNSUPPORTED, `证据 ${record.id} 不是机器证书；展示记录不能冒充证明。`, 422);
    const result = cloud ? await cloud.action('evidence-replay', { record }) : await replayCertificate(record, { repoRoot: config.repoRoot });
    return result;
  });

  route('GET', /^\/api\/v2\/research\/summary$/, async ({ ontology }) => researchSummary(ontology));
  route('GET', /^\/api\/v2\/research\/claims$/, async ({ ontology }) => ({ version: ontology.version, claims: claimsIndex(ontology) }));
  route('GET', /^\/api\/v2\/research\/obligations$/, async ({ ontology }) => ({ version: ontology.version, obligations: obligationsIndex(ontology) }));
  route('GET', /^\/api\/v2\/research\/notation$/, async ({ ontology }) => ({ version: ontology.version, notation: notationIndex(ontology) }));

  route('GET', /^\/api\/v2\/localizations$/, async ({ ontology }) => ({ version: ontology.version, families: explainLocalizationFamilies(), localizations: ontology.raw.localizations }));
  route('POST', /^\/api\/v2\/localizations\/(LC\d{2})\/compute$/, async ({ params, body, ontology }) => {
    checkVersion(body, undefined, ontology);
    const request = normalizeLocalizationRequest(body);
    const profile = request.profileId ? await profileState(request.profileId) : undefined;
    return derivedFor(ontology).localizer.compute(params[0], { params: request.params, profile, goalId: request.goalId, budget: request.budget });
  });

  const checkedLearningPlan = (raw, ontology) => {
    const draft = normalizeLearningPlan(raw);
    for (const id of [draft.primaryGoal, ...draft.branches].filter(Boolean)) {
      const node = ontology.node(id);
      assert((node.granularity ?? 'unit') === 'unit', CODES.BAD_REQUEST, '学习目标必须是可独立学习的节点');
    }
    const disciplines = new Set(ontology.raw.nodes.map(node => node.discipline));
    assert(draft.interests.every(id => disciplines.has(id)), CODES.BAD_REQUEST, '学习兴趣含有未登记学科');
    return draft;
  };
  route('POST', /^\/api\/v2\/learning-plan-preview$/, async ({ body, ontology, identity, req }) => {
    checkVersion(body, undefined, ontology);
    body=bindContentRequest(body,config.repoRoot);
    ontology=selectContentOntology(body,ontology,config.repoRoot);
    const preferences = checkedLearningPlan(body.preferences ?? {}, ontology);
    let background = [];
    if (body.profileId) {
      const state = await profileState(body.profileId);
      background = adaptWithOntology(ontology, state, { goalId: preferences.primaryGoal }).background;
    }
    // Anonymous previews contain no profile data. All calculations use the bounded worker queue.
    const job = await jobs.run({ preferences, background,...(body.contentCase?{contentCase:body.contentCase,objectVersion:body.objectVersion,learningVersion:body.learningVersion,routeChoices:body.routeChoices}:{}) }, { kind: 'learning', owner: planningOwner(req, identity) });
    return { job, statusUrl: `/api/v2/learning-plan-preview/${job.id}` };
  });
  const learningJob = async (identity, id, req) => {
    const job = await jobs.get(id);
    if (job.kind !== 'learning' || (AUTHENTICATED && job.owner !== planningOwner(req, identity))) {
      throw new McsError(CODES.NOT_FOUND, '无法解析学习方案任务', 404);
    }
    const { owner: _owner, ...view } = job;
    return view;
  };
  route('GET', /^\/api\/v2\/learning-plan-preview\/([^/]+)$/, async ({ params, identity, req }) => ({ job: await learningJob(identity, params[0], req) }));
  route('DELETE', /^\/api\/v2\/learning-plan-preview\/([^/]+)$/, async ({ params, identity, req }) => {
    await learningJob(identity, params[0], req); return jobs.cancel(params[0]);
  });

  route('POST', /^\/api\/v2\/plans$/, async ({ body, query, ontology, identity, req }) => {
    checkVersion(body, query, ontology);
    body=bindContentRequest(body,config.repoRoot);
    ontology=selectContentOntology(body,ontology,config.repoRoot);
    const raw = { ...body };
    if (body.profileId) raw.learningPreferences = await db.getLearningPlan(body.profileId);
    if (body.profileId && !(Array.isArray(body.background) && body.background.length)) {
      const state = await profileState(body.profileId);
      const { background } = adaptWithOntology(ontology, state, { goalId: body.goalId ?? body.goalIds?.[0] ?? null, budget: body.budget ?? null, strategy: body.strategy ?? {} });
      raw.background = background;
    }
    if (query.get('sync') === '1' || body.sync === true) {
      if (AUTHENTICATED && !identity?.user) throw new McsError(CODES.BAD_REQUEST, '游客规划请使用异步任务。', 400);
      normalizePlanRequest(raw);
      // 同步规划走**本请求那一份本体**建出来的规划器（按版本缓存，纯函数索引）。
      const planner = derivedFor(ontology).planner;
      let result = planner.plan(raw);
      if (body.review) result = planner.withReview(result, body.review);
      if (raw.learningPreferences) result = personalizePlanResult(ontology, result, raw.learningPreferences, raw.background);
      return {...result,...(ontology.contentVersions??{})};
    }
    const payload = body.review ? { plan: raw, review: body.review } : raw;
    /*
     * 异步任务记**归属**：公网模式下任务表是全站共用的，不记归属就等于
     * 「知道 job id 就能读别人的规划结果、还能取消它」。
     */
    normalizePlanRequest(body.review ? payload.plan : payload);
    const job = await jobs.run(payload, { kind: body.review ? 'review' : 'plan', owner: planningOwner(req, identity) });
    return { job, statusUrl: `/api/v2/plans/${job.id}` };
  });
  route('GET', /^\/api\/v2\/plans\/([^/]+)$/, async ({ params, identity, req }) => {
    const job = await requireJob(identity, params[0], req);
    return { job: { id: job.id, kind: job.kind, status: job.status, createdAt: job.createdAt, finishedAt: job.finishedAt, queuePosition: job.queuePosition ?? 0 }, result: job.result, error: job.error };
  });
  route('DELETE', /^\/api\/v2\/plans\/([^/]+)$/, async ({ params, identity, req }) => {
    await requireJob(identity, params[0], req);
    return jobs.cancel(params[0]);
  });

  /*
   * 档案清单按账号过滤（2026-10）。
   *
   * 本机模式（`AUTHENTICATED` 为假）保持原样：列出全部档案，因为那台机器只有一个操作员。
   * 公网模式下这里从前会列出**所有人**的档案——那正是发布审查里最刺眼的一条。
   */
  route('GET', /^\/api\/v2\/profiles$/, async ({ query, identity }) => {
    const profiles = await db.listProfiles({ includeArchived: query.get('archived') === '1' });
    if (!AUTHENTICATED) return { profiles };
    const owned = await auth.store.ownedIds('profile', identity.user.id);
    return { profiles: profiles.filter((profile) => owned.has(profile.id)) };
  });

  route('GET', /^\/api\/v2\/me\/connection-notes$/, async ({ identity }) => ({ ownerId: identity.user.id, notes: await db.listConnectionNotes(identity.user.id) }));
  route('PUT', /^\/api\/v2\/me\/connection-notes\/([^/]+)$/, async ({ params, body, identity, ontology }) => {
    const key = decodeURIComponent(params[0]);
    if (key.length > 4096 || !connectionExists(ontology.raw, key)) throw new McsError(CODES.NOT_FOUND, '该连接未在当前本体登记', 404);
    return { note: await db.putConnectionNote(identity.user.id, key, body) };
  });
  route('DELETE', /^\/api\/v2\/me\/connection-notes\/([^/]+)$/, async ({ params, body, identity }) =>
    db.deleteConnectionNote(identity.user.id, decodeURIComponent(params[0]), body.baseRevision));
  /*
   * 档案模板清单（2026-10 加，公共只读）。
   *
   * 文案按**成对**下发（zh / en），由界面按当前语种取：模板的说明文字是资料性文案，
   * 不是本体内容，因此不跟着 `?locale=` 换一套本体；而每个声明条目里的**节点标题**是本体内容，
   * 用这一请求语种的那一份本体（`ontology` 已经是该语种的视图）。
   *
   * 这一条不能省：模板是「建档案时选什么」的唯一来源，界面不许自己抄一份节点清单
   * （抄一份就会漂——加一个背景接口、改一条依据，界面上的清单还是旧的）。
   */
  route('GET', /^\/api\/v2\/profile-templates$/, async ({ ontology }) => ({
    version: ontology.version,
    defaultTemplateId: DEFAULT_PROFILE_TEMPLATE_ID,
    templates: PROFILE_TEMPLATES.map((template) => ({
      id: template.id,
      name: template.name,
      stage: template.stage,
      summary: template.summary,
      note: template.note,
      declares: template.declares.map((entry) => ({
        node: entry.node,
        // 模板只声明背景接口（`validateProfileTemplates` 强制），因此必定能在本体里解析；
        // 仍用 maybeNode 兜底：一个坏数据不该变成 500。
        title: ontology.maybeNode(entry.node)?.title ?? entry.node,
        case: ontology.maybeNode(entry.node)?.case ?? null,
        basis: entry.basis,
      })),
    })),
    note: '模板只声明背景接口节点（case=background）：那是本站对环境边界的显式声明，语义上正是「学习者应当已经具备的前提」。案例节点是本站要教的内容，模板不替学习者声明已经学过。',
  }));
  /*
   * 新建档案：可选带一个**档案模板**（2026-10 加）。
   *
   * 模板是 E 的初值：它把「这个阶段通常已经学过什么」写成一串 confirmation 事件
   * （`source.kind = 'system'`、`payload.declared = true`、`payload.template = <id>`），
   * 于是这份档案的 θ.known 一开始不是空的，「起始节点」（前置已确认的节点）由此扩大。
   *
   * 四条写在代码里的纪律：
   * 1. **模板不写进 profiles 行**：档案表只有名字与类型；「这份档案从哪个模板开的」由事件的
   *    `source.ref` 追。导出、备份、迁移都带着事件走，跟着行反而会在某条路径上漂掉。
   * 2. **未知模板当场拒绝**，不静默回落成空白：回落会让「我选了高一」变成「其实什么都没声明」，
   *    而界面上看不出区别。
   * 3. **模板只声明背景接口节点**（由 `validateProfileTemplates` 在 `npm run check` 里强制）。
   * 4. **部分失败如实回报**：逐条写入，失败的那几条进 `failed` 并带原因，已写入的照常保留；
   *    不假装「要么全成要么全不成」——本机 SQLite 下这本来就是多次 append。
   */
  route('POST', /^\/api\/v2\/profiles$/, async ({ body, identity, ontology }) => {
    const requested = body?.template;
    assert(requested === undefined || requested === null || typeof requested === 'string',
      CODES.BAD_REQUEST, 'template 必须是档案模板 id 字符串');
    const templateId = requested ? requested : DEFAULT_PROFILE_TEMPLATE_ID;
    const template = profileTemplate(templateId);
    if (!template) {
      throw new McsError(CODES.BAD_REQUEST, `未知的档案模板：${templateId}`, 400, { templateIds: PROFILE_TEMPLATE_IDS });
    }
    const profile = await db.createProfile(body);
    await claimOwnership(identity, 'profile', profile.id);

    /*
     * 事件的造法与写入走 `server/profile-templates.mjs` 一处：建默认档案的脚本
     * （`scripts/seed-default-profiles.mjs`）用的是同一个 `applyProfileTemplate`，
     * 两处各写一遍事件形状迟早会漂——而事件是这套东西唯一的审计依据。
     */
    const { declared, failed } = await applyProfileTemplate({ db, ontology, profileId: profile.id, templateId });
    return {
      profile: await db.getProfile(profile.id),
      template: { id: template.id, name: template.name, stage: template.stage, summary: template.summary, note: template.note },
      declared,
      failed,
      note: declared.length > 0
        ? `模板声明了 ${declared.length} 个背景节点（source=system、payload.declared=true）：这是阶段性的常见覆盖，不是本站的测评结论，可在「我的学习 → 高级设置」里逐条改。`
        : '这份档案没有预设任何已确认节点。',
    };
  });
  route('GET', /^\/api\/v2\/profiles\/([^/]+)$/, async ({ params, ontology }) => {
    const profile = await profileState(params[0]);
    const theta = adapt(ontology, profile);
    return {
      profile: await db.getProfile(params[0]),
      state: deriveExternalState(profile.events),
      theta: {
        known: theta.known,
        unknown: theta.unknown,
        // 只给计数会让前端无法判断「哪些还没碰过」；这里给节点清单，计数仍然保留。
        unspecified: { count: theta.unspecified.length, nodes: theta.unspecified },
        viewed: theta.viewed,
        misconceptions: theta.misconceptions,
        coverage: theta.coverage,
        boundary: theta.boundary,
      },
    };
  });
  route('PATCH', /^\/api\/v2\/profiles\/([^/]+)$/, async ({ params, body }) => ({ profile: await db.updateProfile(params[0], body) }));
  route('DELETE', /^\/api\/v2\/profiles\/([^/]+)$/, async ({ params }) => await db.deleteProfile(params[0]));
  /*
   * 事件分页：`before` 是 keyset 游标（上一页返回的 `nextCursor`）。
   * 响应同时给 `total` 与 `hasMore`，界面不必用「这一页不满」去猜是否到底；
   * 导出走 `/export`，拿的是全量，与此处分页解耦。
   */
  route('GET', /^\/api\/v2\/profiles\/([^/]+)\/events$/, async ({ params, query }) => {
    const nodeId = query.get('nodeId');
    const kind = query.get('kind');
    const before = query.get('before');
    const events = await db.listEvents(params[0], {
      limit: Number(query.get('limit') ?? 200),
      nodeId,
      kind,
      before,
    });
    const total = await db.countEvents(params[0], { nodeId, kind });
    const oldest = events.length ? events[0].seq ?? null : null;
    const hasMore = events.length > 0 && oldest !== null && events.length < total;
    return { events, total, nextCursor: hasMore ? String(oldest) : null, hasMore };
  });
  route('POST', /^\/api\/v2\/profiles\/([^/]+)\/events$/, async ({ params, body, ontology }) => {
    checkVersion(body, undefined, ontology);
    body=bindContentRequest(body,config.repoRoot);
    ontology=selectContentOntology(body,ontology,config.repoRoot);
    const profileId = params[0];
    await db.getProfile(profileId);
    const event = normalizeEvent(body.event ?? body, { profileId, ontologyVersion: ontology.version });
    checkNodeResolves(event.nodeId, ontology);
    await checkEvidenceRefs(profileId, event.evidenceRefs);
    if (event.kind === 'evaluation') {
      const answerRef = event.payload?.answer_event_id;
      if (answerRef && !await db.findEvent(profileId, answerRef)) {
        throw new McsError(CODES.UNKNOWN_EVIDENCE, `评价必须引用本档案的真实作答：${answerRef}`, 422);
      }
    }
    if (event.kind === 'mastery_estimate' && (!event.payload?.dimension || event.payload?.value === undefined)) {
      throw new McsError(CODES.BAD_REQUEST, '掌握估计必须带 dimension 与 value。');
    }
    const result = await db.appendEvent(profileId, event, { merge: body.merge === true });
    return { ...result, profile: await db.getProfile(profileId) };
  });
  route('GET', /^\/api\/v2\/profiles\/([^/]+)\/notes$/, async ({ params, query }) => ({ notes: await db.listNotes(params[0], { nodeId: query.get('nodeId') }) }));
  route('POST', /^\/api\/v2\/profiles\/([^/]+)\/notes$/, async ({ params, body }) => ({ note: await db.createNote(params[0], body), profile: await db.getProfile(params[0]) }));
  route('PATCH', /^\/api\/v2\/profiles\/([^/]+)\/notes\/([^/]+)$/, async ({ params, body }) => ({ note: await db.updateNote(params[0], params[1], body), profile: await db.getProfile(params[0]) }));
  route('DELETE', /^\/api\/v2\/profiles\/([^/]+)\/notes\/([^/]+)$/, async ({ params }) => await db.deleteNote(params[0], params[1]));

  /*
   * 保存的知识网络视图（E 层）。
   *
   * 用户的要求是「加入保存功能，下次可以直接用」。保存的是**视图状态**：
   * 已加入的节点、可见边源、手动位置与相机。
   *
   * 校验分两层：形状与范围在 `normalizeNetworkView`（契约层），
   * **节点与边源是否真在本体里**在这里核对——视图引用了不存在的节点，宁可拒绝也不静默丢弃，
   * 否则「下次直接用」会变成「下次少两个节点却没人告诉你」。
   */
  const checkViewPayload = async (body, ontology, identity) => {
    const payload = body?.payload ?? {};
    const extras = normalizeNetworkExtras(payload);
    await checkNetworkRefs(extras.refs ?? [], identity.user.id, ontology, db);
    const refKeys = new Set((extras.refs ?? []).map(nodeRefKey));
    const unknownNodes = (payload.added ?? []).filter((id) => !ontology.maybeNode(id) && !refKeys.has(id));
    if (unknownNodes.length > 0) throw new McsError(CODES.BAD_REQUEST, `视图里有 ${unknownNodes.length} 个节点不在本体里：${unknownNodes.slice(0, 3).join('、')}…`, 400, { unknownNodes });
    const knownFamilies = new Set(EDGE_FAMILIES);
    const unknownFamilies = (payload.families ?? []).filter((id) => !knownFamilies.has(id));
    if (unknownFamilies.length > 0) throw new McsError(CODES.BAD_REQUEST, `视图里有未知的边源：${unknownFamilies.join('、')}`, 400, { unknownFamilies });
    const strayPositions = Object.keys(payload.positions ?? {}).filter((id) => !(payload.added ?? []).includes(id));
    return { unknownNodes, unknownFamilies, strayPositions };
  };
  route('GET', /^\/api\/v2\/profiles\/([^/]+)\/network-views$/, async ({ params, ontology }) => ({
    views: await db.listNetworkViews(params[0]),
    // 本体版本一起下发：视图是「相对某一版本体」的快照，下次载入时能看出本体有没有变。
    ontologyVersion: ontology.version,
  }));
  route('POST', /^\/api\/v2\/profiles\/([^/]+)\/network-views$/, async ({ params, body, ontology, identity }) => {
    const checked = await checkViewPayload(body, ontology, identity);
    return { view: await db.createNetworkView(params[0], body), profile: await db.getProfile(params[0]), checked, ontologyVersion: ontology.version };
  });
  route('PATCH', /^\/api\/v2\/profiles\/([^/]+)\/network-views\/([^/]+)$/, async ({ params, body, ontology, identity }) => {
    const checked = await checkViewPayload(body, ontology, identity);
    return { view: await db.updateNetworkView(params[0], params[1], body), profile: await db.getProfile(params[0]), checked, ontologyVersion: ontology.version };
  });
  route('DELETE', /^\/api\/v2\/profiles\/([^/]+)\/network-views\/([^/]+)$/, async ({ params }) => await db.deleteNetworkView(params[0], params[1]));
  /*
   * 学习方向（2026-10 加）：学习者显式声明的「我现在要去哪」。
   *
   * 三条接口的分工：GET 列出（界面按第一个当当前方向）、POST 声明（幂等）、DELETE 撤回。
   * 与网络视图同一套边界：**未知节点当场 400**，不静默丢弃——
   * 存下一个指向不存在节点的方向，只会让「下一步」永远算不出来而没人知道为什么。
   */
  const checkDirectionPayload = (body, ontology) => {
    const nodeId = body?.nodeId;
    if (typeof nodeId !== 'string' || !nodeId.trim()) {
      throw new McsError(CODES.BAD_REQUEST, '方向需要一个目标节点（nodeId）。', 400);
    }
    if (!ontology.maybeNode(nodeId) && !ontology.boundaryRefs.has(nodeId)) {
      throw new McsError(CODES.UNKNOWN_NODE, `方向指向了未知节点：${nodeId}`, 404, { node: nodeId });
    }
    const node = ontology.maybeNode(nodeId);
    /*
     * 话题级条目当下方向：登记层给「【线索】」这样的标记与说明，交出去由界面如实标注。
     * 这里**不拒绝**它，只是把事实（它是话题而非可独立认知的单元）一并下发。
     */
    return { nodeId, granularity: node?.granularity ?? 'unit', isThread: (node?.granularity ?? 'unit') === 'topic' };
  };
  route('GET', /^\/api\/v2\/profiles\/([^/]+)\/learning-plan$/, async ({ params, ontology }) => {
    const plan = await db.getLearningPlan(params[0]);
    if (plan.revision === 0) {
      const directions = await db.listDirections(params[0]);
      plan.primaryGoal = directions.find(item => (ontology.maybeNode(item.nodeId)?.granularity ?? 'unit') === 'unit' && ontology.maybeNode(item.nodeId))?.nodeId ?? null;
    }
    return { plan, ontologyVersion: ontology.version };
  });
  route('PUT', /^\/api\/v2\/profiles\/([^/]+)\/learning-plan$/, async ({ params, body, ontology }) => {
    checkVersion(body, undefined, ontology);
    const draft = checkedLearningPlan(body, ontology);
    const plan = await db.driver.transaction(async () => {
      const saved = await db.putLearningPlan(params[0], { ...draft, baseRevision: body.baseRevision });
      if (draft.primaryGoal) {
        const result = await db.createDirection(params[0], { nodeId: draft.primaryGoal, sourceRef: 'ui' });
        if (result.created) await db.appendEvent(params[0], normalizeEvent({
          eventId: `direction-${result.direction.directionId}`, kind: 'goal', nodeId: draft.primaryGoal,
          source: { kind: 'browser', ref: 'ui' }, evidenceRefs: [],
          payload: { intent: 'direction', directionId: result.direction.directionId }, baseRevision: null,
        }, { profileId: params[0], ontologyVersion: ontology.version }), { merge: true });
      }
      return saved;
    });
    return { plan, profile: await db.getProfile(params[0]), ontologyVersion: ontology.version };
  });
  route('GET', /^\/api\/v2\/profiles\/([^/]+)\/directions$/, async ({ params, ontology }) => ({
    directions: await db.listDirections(params[0]),
    ontologyVersion: ontology.version,
  }));
  route('POST', /^\/api\/v2\/profiles\/([^/]+)\/directions$/, async ({ params, body, ontology }) => {
    const checked = checkDirectionPayload(body, ontology);
    const result = await db.createDirection(params[0], { ...body, sourceRef: 'ui' });
    /*
     * 事件与镜像**一起**写：镜像（`learning_directions`）是界面每次渲染都要读的快查表，
     * 事件是导出与审计的事实来源。
     *
     * 顺序是先镜像、后事件，而不是反过来：事件 id 需要引用镜像的 id，反过来会绕成环。
     * 事件写失败时把刚建的镜像删掉——宁可失败得干净，也不留下一个说不出出处的方向
     * （`deleteDirection` 会顺带清掉那条事件吗？不会，所以这里只在**镜像刚建成功**时回滚，
     * 而事件没写进去，不会留下孤儿事件）。
     *
     * `kind: 'goal'` 是既有事件类型（`shared/contracts.mjs` 的 EVENT_KINDS），不扩类型；
     * 事件的 eventId 由这里生成（`normalizeEvent` 要求必填），而不是让存储层去猜。
     */
    if (result.created) {
      try {
        const event = normalizeEvent({
          eventId: `direction-${result.direction.directionId}`,
          kind: 'goal',
          nodeId: checked.nodeId,
          source: { kind: 'browser', ref: 'ui' },
          evidenceRefs: [],
          payload: { intent: 'direction', directionId: result.direction.directionId },
          baseRevision: null,
        }, { profileId: params[0], ontologyVersion: ontology.version });
        await db.appendEvent(params[0], event, { merge: true });
      } catch (error) {
        await db.deleteDirection(params[0], result.direction.directionId).catch(() => {});
        throw error;
      }
    }
    return { direction: result.direction, created: result.created, checked, profile: await db.getProfile(params[0]) };
  });
  route('DELETE', /^\/api\/v2\/profiles\/([^/]+)\/directions\/([^/]+)$/, async ({ params }) => await db.deleteDirection(params[0], params[1]));
  route('GET', /^\/api\/v2\/profiles\/([^/]+)\/export$/, async ({ params, ontology }) => await db.exportProfile(params[0], { ontologyVersion: ontology.version }));
  route('POST', /^\/api\/v2\/import$/, async ({ body, identity }) => {
    const bundle = validateImportBundle(body.bundle ?? body);
    const result = await db.importProfile(bundle, { name: body.name });
    /*
     * 导入产生的是**新档案**，导入者即是它的主人；不认领的话这份档案
     * 在公网模式下对谁都不可见（等于导入成功但打不开）。
     */
    await claimOwnership(identity, 'profile', result.profile?.id);
    return result;
  });
  route('POST', /^\/api\/v2\/backup$/, async () => cloud ? cloud.backup() : db.backupTo(config.backupDir));
  route('POST', /^\/api\/v2\/restore$/, async ({ body }) => {
    assert(typeof body.backup === 'string', CODES.BAD_REQUEST, 'restore 需要 backup 路径');
    if (cloud) return cloud.restore(body.backup);
    const target = resolve(body.backup);
    const allowed = resolve(config.backupDir) + sep;
    if (!target.startsWith(allowed)) throw new McsError(CODES.BAD_REQUEST, '只能从本机备份目录恢复。');
    return await db.restoreFrom(target);
  });

  /*
   * 辅导状态：本站自己的适配器 + **桥接是否在跑**。
   *
   * 两套 DeepTutor 集成并存是事实（本站内适配器做上下文注入、事件落 E；
   * mcs-bridge 是经过核查的那一套，带 MCP 工具与事件登记）。状态里必须同时给出两边，
   * 否则使用者会以为只有一套，甚至把两套的结论混着用。
   */
  route('GET', /^\/api\/v2\/tutor\/status$/, async () => ({ ...(await tutor.health()), bridge: await tutor.bridgeStatus() }));
  route('POST', /^\/api\/v2\/tutor\/sessions$/, async ({ body, ontology, identity }) => {
    checkVersion(body, undefined, ontology);
    assert(typeof body.profileId === 'string', CODES.BAD_REQUEST, '需要 profileId');
    assert(typeof body.nodeId === 'string', CODES.BAD_REQUEST, '需要 nodeId');
    ontology.node(body.nodeId);
    const session = tutor.createSession({ profileId: body.profileId, nodeId: body.nodeId, mode: body.mode ?? 'explain', maxChars: body.maxChars ?? 16000 });
    await claimOwnership(identity, 'tutor', session?.session?.id ?? session?.id);
    return session;
  });
  route('GET', /^\/api\/v2\/tutor\/sessions\/([^/]+)$/, async ({ params, identity }) => {
    await requireTutorSession(identity, params[0]);
    return tutor.getSession(params[0]);
  });
  route('POST', /^\/api\/v2\/tutor\/sessions\/([^/]+)\/turns$/, async ({ params, body, identity }) => {
    await requireTutorSession(identity, params[0]);
    const turn = normalizeTutorTurn(body);
    return tutor.startTurn(params[0], turn);
  });
  route('GET', /^\/api\/v2\/tutor\/turns\/([^/]+)$/, async ({ params, identity }) => {
    /*
     * 回合归属看它属于哪个会话：回合 id 与会员 id 是两套编号，
     * 只查回合自身的归属会漏掉「拿着别人回合 id 直接读」这条路。
     */
    if (AUTHENTICATED) {
      const turn = tutor.getTurn(params[0]);
      const sessionId = turn?.turn?.sessionId ?? turn?.sessionId;
      if (sessionId) await requireTutorSession(identity, sessionId);
    }
    return tutor.getTurn(params[0]);
  });

  /* ==========================================================================
   * 自动关系发现与验证（首版）
   *
   * 接口族与语义见 docs/自动关系发现-接口与语言规格.md §3.3 与 §6–§7。
   * 两条贯穿全族的约定：
   * 1. **每个请求只取一次本体快照**（`const ontology = requestOntology()`），
   *    入库切版本不会让一个请求中途换掉本体；
   * 2. 写操作一律带「预期修订 + 本体版本」，不一致返回 409，**旧审阅不能发布到新背景**。
   * ======================================================================== */

  // 预置背景、符号、模板与形式化覆盖情况。没有它，编辑页无法给出符号选择器。
  route('GET', /^\/api\/v2\/formal\/catalog$/, async ({ ontology }) => {
    const language = await tryModule('../core/formal/language.mjs');
    const backgrounds = await tryModule('../core/formal/backgrounds.mjs');
    const registry = await tryModule('../data/formal/registry.mjs');
    const instances = await tryModule('../data/formal/instances.mjs');

    const list = typeof backgrounds?.listBackgrounds === 'function' ? backgrounds.listBackgrounds() : [];
    const registryReady = typeof registry?.formalCoverage === 'function';
    const coverage = registryReady
      ? registry.formalCoverage(ontology)
      : reportFormalCoverage(ontology, null);

    return {
      languageVersion: language?.FORMAL_LANGUAGE_VERSION ?? null,
      backgrounds: list,
      operators: language?.FORMAL_OPERATORS ?? [],
      boundedTypes: language?.FORMAL_BOUNDED_TYPES ?? [],
      templates: typeof registry?.formalTemplates === 'function' ? registry.formalTemplates() : [],
      budgets: language?.FORMAL_BUDGETS ?? null,
      instances: typeof instances?.instanceSummary === 'function' ? instances.instanceSummary() : [],
      coverage,
      // 覆盖报告不伪装成「全库已形式化」：它按案例列出已登记条数与仍缺的条目。
      coverageNote: registryReady
        ? '按案例统计形式表达登记情况；未登记不等于不重要，只表示本轮没写。'
        : '四案例形式表达登记表尚未装配；下列数字只有本体侧的可数信息。',
      languageReady: Boolean(language?.parseSpec),
      extension: ontology.raw.extension ?? { activeRevision: null, revisions: 0, nodes: 0 },
    };
  });

  // 解析、类型检查、规范化与可读预览。**不改任何状态**：草稿由编辑页自己保存。
  route('POST', /^\/api\/v2\/formal\/validate$/, async ({ body, req, ontology }) => {
    assertLocalOrigin(req, config);
    const language = await optionalModule('../core/formal/language.mjs');
    /*
     * 背景登记表必须是 `backgrounds.mjs`（**富形状**：`bases`/`constants` 是带说明的对象数组）。
     *
     * 这里曾经传的是 `theory.mjs`：两者的 `backgroundTheory()` 形状不同，于是
     * 「四案例现成表达在登记表里解析通过、经网站检查接口全部报类型推断错误」——
     * 网站与登记表用的是两份背景事实。`language.validateDraft()` 认富形状
     * （`normalizeBackground`），所以统一到登记表这一份。
     */
    const backgrounds = await optionalModule('../core/formal/backgrounds.mjs');
    return language.validateDraft(body ?? {}, { ontology, backgrounds });
  });

  /* ---------------- 草稿（编写库，不混入学习者 E 库） ---------------- */

  /** 惰性打开编写数据库：只有真正用到编写功能时才建这份文件。 */
  let authoringHandle = null;
  let authoringOpening = null;
  async function authoring() {
    if (authoringHandle) return authoringHandle;
    if (!authoringOpening) authoringOpening = (async () => {
      const mod = await optionalModule('../server/authoring-db.mjs');
      authoringHandle = await new mod.AuthoringDatabase({ file: config.authoringDbFile, driver: db.driver?.dialect === 'postgres' ? db.driver : null }).init();
      return authoringHandle;
    })().catch(error => { authoringOpening = null; throw error; });
    return authoringOpening;
  }

  route('GET', /^\/api\/v2\/authoring\/drafts$/, async ({ query }) => {
    const store = await authoring();
    return { drafts: (await store.listDrafts({ status: query.get('status') ?? 'all', limit: Number(query.get('limit') ?? 100) })) };
  });

  route('POST', /^\/api\/v2\/authoring\/drafts$/, async ({ body, req }) => {
    assertLocalOrigin(req, config);
    const store = await authoring();
    // 第三个参数是**本次请求那一份**快照（`checkVersion` 的签名要求显式传入）。
    checkVersion(body, undefined, requestOntology());
    return { draft: (await store.createDraft(body ?? {})) };
  });

  route('GET', /^\/api\/v2\/authoring\/drafts\/([^/]+)$/, async ({ params }) => {
    const store = await authoring();
    return { draft: (await store.getDraft(decodeURIComponent(params[0]))) };
  });

  /*
   * 带修订号更新草稿。
   *
   * 修订号是**乐观锁**：两个标签页同时编辑时，后提交的那个拿到 409，
   * 而不是把自己的内容盖在别人刚保存的内容上。这比"最后写入者赢"慢一点，
   * 但不会静默丢东西——丢的可能是用户刚写的一段公式。
   */
  route('PATCH', /^\/api\/v2\/authoring\/drafts\/([^/]+)$/, async ({ params, body, req, ontology }) => {
    assertLocalOrigin(req, config);
    const store = await authoring();
    const expectedRevision = body?.expectedRevision;
    if (!Number.isInteger(expectedRevision)) {
      throw new McsError(CODES.BAD_REQUEST, '更新草稿必须带 expectedRevision（整数修订号）', 400);
    }
    if (body?.ontologyVersion && body.ontologyVersion !== ontology.version) {
      throw new McsError(CODES.VERSION_CONFLICT, '本体版本不一致；请重新加载页面，旧会话保留但不混用。', 409, {
        expected: ontology.version, received: body.ontologyVersion,
      });
    }
    return { draft: (await store.updateDraft(decodeURIComponent(params[0]), body ?? {}, { expectedRevision, ontologyVersion: ontology.version })) };
  });

  /* ---------------- 自动发现任务 ---------------- */

  /*
   * 进程内的结算登记：runId -> AbortController。
   *
   * 机器检查（kernel 子进程）那一段**不能**在请求里等完：群节点的任务要跑 6 条证书，
   * 每条几百毫秒到几秒，一次请求就可能挂过客户端超时。所以 POST 只做到
   * 「同步生成候选 + 落库 + 返回」，结算在后台继续跑，逐条写回。
   *
   * 取消也走这张表：`DELETE` 拿到 controller 就 `abort()`，结算循环在**候选边界**
   * 看到它就不再往下跑——同步 JS 打断不了正在跑的那一段，但「不再往下跑」做得到。
   */
  const activeSettles = new Map();

  /** 把一条候选写回任务（逐项保存：不要等全部跑完才写，否则中途刷新页面什么都看不到）。 */
  async function persistCandidate(store, runId, candidate) {
    if (!candidate || typeof candidate !== 'object') return;
    try {
      (await store.saveCandidates(runId, [{ ...candidate, runId }]));
    } catch {
      // 落库失败不该打断结算；最终整批写回时还会再试一次，并在统计里如实反映。
    }
  }

  /**
   * 结算收尾：**只有所有候选都有结论**才允许把任务置为 completed。
   *
   * 三条终态各自说清原因：
   * - 全部有结论（且没有 `pendingCheck`）→ `completed`；
   * - 结算超时或仍留 `pendingCheck` → `interrupted` + `stats.settleTimedOut`
   *   （运行表的状态枚举里没有 `timedOut`，用 `interrupted` 表达「中断、已完成结果保留」，
   *   具体原因写在 `settleStatus` 与 warnings 里，不靠状态名暗示）；
   * - 被取消 → `cancelled`（不回写成 completed，否则「取消」就成了摆设）。
   */
  async function finalizeSettle(store, runId, settled, controller, background) {
    const candidates = Array.isArray(settled?.candidates) ? settled.candidates : [];
    try { (await store.saveCandidates(runId, candidates.map((candidate) => ({ ...candidate, runId })))); } catch { /* 单条写入已经尽力，整批失败也不再抛 */ }
    const stats = { ...(settled?.stats ?? {}), background, pendingChecks: candidates.filter((item) => item.pendingCheck).length };
    if (controller.signal.aborted || (await store.getRun(runId)).status === 'cancelled') {
      (await store.updateRun(runId, { status: 'cancelled', stats: { ...stats, settleStatus: 'cancelled' } }));
      return;
    }
    if (stats.pendingChecks > 0) {
      stats.settleTimedOut = stats.pendingChecks;
      stats.settleStatus = 'timedOut';
      const note = `结算未能在预算内收完：还有 ${stats.pendingChecks} 条候选带 pendingCheck，任务标 interrupted（不是全部有结论）。已完成的候选结果保留，未完成的可稍后重放。`;
      stats.warnings = [...new Set([...(stats.warnings ?? []), note])];
      (await store.updateRun(runId, { status: 'interrupted', stats, error: { code: CODES.EVIDENCE_RESOURCE, message: note } }));
      return;
    }
    (await store.updateRun(runId, { status: 'completed', stats: { ...stats, settleStatus: 'completed' } }));
  }

  route('POST', /^\/api\/v2\/relation-discovery\/jobs$/, async ({ body, req, ontology, identity }) => {
    assertLocalOrigin(req, config);
    const store = await authoring();
    const discovery = await optionalModule('../core/formal/discovery.mjs');
    const registry = await tryModule('../data/formal/registry.mjs');
    const backgrounds = await optionalModule('../core/formal/backgrounds.mjs');
    // 本体快照由 `handle()` 在请求进入时取一次（这里用的是那一份，不另取）。

    const draftId = typeof body?.draftId === 'string' ? body.draftId : null;
    if (draftId) checkVersion(body, undefined, ontology);
    const draft = draftId ? (await store.getDraft(draftId)) : null;
    if (draftId && Number.isInteger(body?.draftRevision) && body.draftRevision !== draft.revision) {
      throw new McsError(CODES.CONFLICT, `草稿修订已变化：期望 ${body.draftRevision}，当前 ${draft.revision}`, 409, {
        expected: draft.revision, received: body.draftRevision,
      });
    }
    const nodeRef = body?.node ? { node: String(body.node), version: String(body.nodeVersion ?? '1') } : null;
    /*
     * 节点可解析的三种方式：在本体里、在形式表达登记表里有 spec，或者是**本次草稿自己的节点**。
     *
     * 第三种不是放宽检查，而是这条功能的入口本身：新建的草稿节点在发布之前既不在本体里、
     * 也不在登记表里，只认前两种会让「新节点 → 发现关系」这条主路径直接 404。
     */
    const draftNodeId = draft?.spec?.node ?? draft?.node?.id ?? draft?.id ?? null;
    if (nodeRef && !ontology.maybeNode(nodeRef.node)
      && !(Array.isArray(registry?.specs) && registry.specs.some((spec) => spec.node === nodeRef.node))
      && nodeRef.node !== draftNodeId) {
      throw new McsError(CODES.UNKNOWN_NODE, `无法解析节点：${nodeRef.node}（既不在本体里，也没有形式表达登记，也不是本次草稿节点）`, 404, { node_id: nodeRef.node });
    }
    if (!draft && !nodeRef) throw new McsError(CODES.BAD_REQUEST, '启动发现任务需要 draftId 或 node', 400);

    const budget = { ...discovery.DISCOVERY_BUDGET, ...(body?.budget ?? {}) };
    /*
     * 背景走**同一个入口**（`discovery.resolveBackground`）：显式请求 > 草稿声明 >
     * 焦点 spec > 默认。以前 api 自己算一遍、引擎再算一遍，草稿声明的背景因此在
     * 接口层被丢掉，任务用了默认代数背景——这正是验收第 3 条里那一半现象。
     */
    const focusSpec = Array.isArray(registry?.specs)
      ? (registry.specs.find((spec) => spec.node === (nodeRef?.node ?? draftNodeId)) ?? null)
      : null;
    const resolvedBackground = discovery.resolveBackground({
      requested: body?.background ?? null,
      draft,
      focusSpec,
      backgrounds,
    });
    const run = (await store.createRun({
      draftId, nodeRef, ontologyVersion: ontology.version,
      background: resolvedBackground.id, budget,
      generatorVersion: discovery.GENERATOR_VERSION,
    }));
    if (cloud) {
      try {
        const job = await jobs.run({ runId: run.id, draft, nodeRef, budget, background: resolvedBackground.id }, { kind: 'discovery', owner: identity?.user?.id ?? 'local', ontologyVersion: ontology.version });
        await store.updateRun(run.id, { stats: { cloudJobId: job.id, background: resolvedBackground.id } });
        return { run: await store.getRun(run.id), background: resolvedBackground, settling: true, warnings: [], note: '发现任务已持久排队；离开页面后仍在云端运行，结果写入编写库。' };
      } catch (error) {
        await store.updateRun(run.id, { status: 'error', error: { code: error.code ?? CODES.INTERNAL, message: error.message } });
        throw error;
      }
    }
    (await store.updateRun(run.id, { status: 'running' }));

    let outcome;
    let candidateWrites = Promise.resolve();
    try {
      outcome = discovery.discoverRelations({
        ontology, registry, draft, nodeRef, budget,
        background: resolvedBackground.id,
        deps: { backgrounds },
        // 逐项保存：结算每完成一条就写回，`GET` 任何时刻读到的都是当前最新。
        onCandidate: (candidate) => { const snapshot = structuredClone(candidate); candidateWrites = candidateWrites.then(() => persistCandidate(store, run.id, snapshot)); },
      });
    } catch (error) {
      /*
       * 失败也要留痕：任务状态是「执行错误」而不是「没有候选」。
       * 执行错误**不是**数学判断——候选的 math 状态保持 undecided。
       */
      (await store.updateRun(run.id, { status: 'error', error: { code: error.code ?? CODES.INTERNAL, message: error.message } }));
      throw error;
    }

    const controller = new AbortController();
    activeSettles.set(run.id, controller);
    const snapshot = outcome.candidates ?? [];
    (await store.saveCandidates(run.id, snapshot.map((candidate) => ({ ...candidate, runId: run.id }))));
    (await store.updateRun(run.id, { status: 'running', stats: { ...outcome.stats, background: resolvedBackground.id } }));

    /*
     * 后台结算：**不 await**。请求立刻带着「含 pendingCheck 的 run」返回，
     * 结算完成后由 `finalizeSettle` 决定终态，并逐条写回。
     */
    Promise.resolve(outcome)
      .then(async (settled) => { await candidateWrites; return finalizeSettle(store, run.id, settled, controller, resolvedBackground.id); })
      .catch(async (error) => {
        try {
          (await store.updateRun(run.id, {
            status: 'error',
            error: { code: error.code ?? CODES.INTERNAL, message: `结算失败：${error.message}` },
          }));
        } catch { /* 落库失败：请求已经返回，只能留给下次读盘 */ }
      })
      .finally(() => activeSettles.delete(run.id));

    return {
      run: (await store.getRun(run.id)),
      background: resolvedBackground,
      settling: true,
      note: '候选已同步生成；机器检查（证书）在后台继续跑，逐条写回。任务只有在所有候选都有结论后才会是 completed。',
      warnings: outcome.stats?.warnings ?? [],
    };
  });

  route('GET', /^\/api\/v2\/relation-discovery\/jobs\/([^/]+)$/, async ({ params }) => {
    const store = await authoring();
    const id = decodeURIComponent(params[0]);
    let run = (await store.getRun(id));
    if (cloud && run.stats?.cloudJobId && ['queued', 'running'].includes(run.status)) {
      const job = await jobs.get(run.stats.cloudJobId);
      if (job.status === 'error' || job.status === 'cancelled') run = await store.updateRun(id, { status: job.status, error: job.error });
    }
    // `getRun` 读的是库里**当前最新**的候选（结算逐条写回），不是启动时的那份快照。
    return { ...run, settling: cloud ? ['queued', 'running'].includes(run.status) : activeSettles.has(id) };
  });

  route('GET', /^\/api\/v2\/relation-discovery\/jobs$/, async ({ query }) => {
    const store = await authoring();
    const runs = (await store.listRuns({ limit: Number(query.get('limit') ?? 50) }));
    return { runs: runs.map((run) => ({ ...run, settling: cloud ? ['queued', 'running'].includes(run.status) : activeSettles.has(run.id) })) };
  });

  route('DELETE', /^\/api\/v2\/relation-discovery\/jobs\/([^/]+)$/, async ({ params, req }) => {
    assertLocalOrigin(req, config);
    const store = await authoring();
    const id = decodeURIComponent(params[0]);
    // 先叫停后台结算，再改状态：顺序反了的话，结算收尾可能把 cancelled 覆盖回 completed。
    const controller = activeSettles.get(id);
    if (controller) controller.abort();
    const job = (await store.getRun(id));
    if (cloud && job.stats?.cloudJobId) await jobs.cancel(job.stats.cloudJobId);
    const updated = await store.cancelRun(job.id);
    return {
      ...updated,
      settleAborted: Boolean(controller),
      note: controller
        ? '已停止后台结算（在候选边界生效，正在跑的那一条会跑完）：已完成的候选结果保留；中断不等于数学反驳。'
        : '任务没有正在跑的结算；已完成的候选结果保留。',
    };
  });

  /*
   * 重放选定结果。
   *
   * 重放**从当前本体快照重新生成目标并重新跑检查器**，不是把上次的结论再念一遍；
   * 相关输入（本体版本、定义版本、证书、检查器文件）任一改变，旧结果即失效。
   */
  route('POST', /^\/api\/v2\/relation-discovery\/jobs\/([^/]+)\/replay$/, async ({ params, body, req, ontology }) => {
    assertLocalOrigin(req, config);
    const store = await authoring();
    const discovery = await optionalModule('../core/formal/discovery.mjs');
    const registry = await tryModule('../data/formal/registry.mjs');
    const backgrounds = await optionalModule('../core/formal/backgrounds.mjs');
    const run = (await store.getRun(decodeURIComponent(params[0])));
    const wanted = Array.isArray(body?.candidateIds) && body.candidateIds.length
      ? new Set(body.candidateIds)
      : null;
    const selected = run.candidates.filter((candidate) => !wanted || wanted.has(candidate.id));
    if (selected.length === 0) throw new McsError(CODES.BAD_REQUEST, '没有可重放的候选；candidateIds 可能不匹配本次运行', 400);
    /*
     * 重放也要带上**这份任务的草稿**：草稿端点在登记表里不存在，目标重算需要草稿的 spec。
     * 不带它，指向新节点的候选会在「重新生成目标」这一步找不到形状而报未决——
     * 那是装配缺项，不是数学上的证不出来。
     */
    const draft = run.draftId ? (await store.getDraft(run.draftId)) : null;
    const inventory = discovery.collectSpecInventory({
      registry, ontology, draft, backgrounds, warnings: [],
    });
    const results = [];
    for (const candidate of selected) {
      const args = {
        candidate, registry, ontology, repoRoot: config.repoRoot,
        deps: { specs: inventory.allSpecs, background: run.background ?? null, backgrounds },
      };
      results.push(cloud ? await cloud.action('replay-candidate', { candidate, specs: inventory.allSpecs, background: run.background ?? null }) : await discovery.replayCandidate(args));
    }
    (await store.saveCandidates(run.id, results.map((item) => item.candidate)));
    return {
      runId: run.id,
      ontologyVersion: ontology.version,
      replayed: results.length,
      results: results.map((item) => ({
        candidateId: item.candidate.id,
        ok: item.ok,
        problems: item.problems,
        check: item.check
          ? { status: item.check.status, checker: item.check.checker, checkerSha256: item.check.checkerSha256, durationMs: item.check.durationMs }
          : null,
        math: item.candidate.math,
        run: item.candidate.run,
      })),
      note: '重放只覆盖该候选实际证明的片段；检查器本身未获形式验证。',
    };
  });

  /* ---------------- 发布、版本与回滚 ---------------- */

  route('POST', /^\/api\/v2\/authoring\/publications$/, async ({ body, req, ontology }) => {
    assertLocalOrigin(req, config);
    const store = await authoring();
    const publication = await optionalModule('../server/publication.mjs');
    const ctx = { dataDir: config.dataDir, extensionsDir: config.extensionsDir, authoring: store, config, ontologySource };
    const request = { ...(body ?? {}), ontologyVersion: ontology.version };
    return cloud ? cloud.publish(ctx, request, publication.commitPublication) : publication.commitPublication(ctx, request);
  });

  // 入库预览：与提交共用同一段差异计算，**零写入**。
  route('POST', /^\/api\/v2\/authoring\/publications\/preview$/, async ({ body, req, ontology }) => {
    assertLocalOrigin(req, config);
    const store = await authoring();
    const publication = await optionalModule('../server/publication.mjs');
    const ctx = { dataDir: config.dataDir, extensionsDir: config.extensionsDir, authoring: store, config, ontologySource };
    return publication.previewPublication(ctx, { ...(body ?? {}), ontologyVersion: ontology.version });
  });

  route('GET', /^\/api\/v2\/authoring\/revisions$/, async () => {
    const store = await authoring();
    const publication = await optionalModule('../server/publication.mjs');
    return publication.listRevisions({ dataDir: config.dataDir, extensionsDir: config.extensionsDir, authoring: store, config, ontologySource });
  });

  route('POST', /^\/api\/v2\/authoring\/rollback$/, async ({ body, req, ontology }) => {
    assertLocalOrigin(req, config);
    const store = await authoring();
    const publication = await optionalModule('../server/publication.mjs');
    const ctx = { dataDir: config.dataDir, extensionsDir: config.extensionsDir, authoring: store, config, ontologySource };
    const request = { ...(body ?? {}), ontologyVersion: ontology.version };
    const result = cloud ? await cloud.publish(ctx, request, publication.rollbackPublication) : await publication.rollbackPublication(ctx, request);
    /*
     * 回滚是**新的一条版本记录**，不是把历史抹掉：历史包、证据与学习者记录都在。
     * 切换生效索引之后立刻重载快照，让后续请求读到的就是回滚后的本体。
     */
    if (ontologySource?.reload) await ontologySource.reload();
    return result;
  });

  registerVaultApi({ route, db, config });
  registerContentApi({ route, config });
  registerNetworkApi({ route, db, jobs, config, authoring, getOntology: resolveOntology });
  const handle = async function handle(req, res) {
    const url = new URL(req.url, `http://${req.headers.host ?? '127.0.0.1'}`);
    if (!url.pathname.startsWith('/api/v2/')) return false;
    const ontology = requestOntology();
    const locale = resolveLocale(url, req);
    /*
     * 语种视图在这里换一次，交给路由处理体的 `ontology` 因此已经是该语种的。
     * 处理体内部一律继续用传进来的这一份——别处再取快照会让「同一请求里
     * 节点是英文、证据是中文」这种半截状态成为可能。
     */
    const localized = await localizedFor(ontology, locale);
    res.setHeader('x-mcs-locale', locale);
    try {
      /*
       * 身份解析放在路由匹配**之前**：会话失效、Cookie 重复这类问题要在任何业务
       * 逻辑之前回答，不能先干了活再说「其实你没登录」。
       */
      const identity = auth ? await auth.identify(req) : LOCAL_IDENTITY;
      for (const entry of routes) {
        if (entry.method !== req.method) continue;
        const match = url.pathname.match(entry.pattern);
        if (!match) continue;
        const body = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) ? await readJson(req) : {};
        /*
         * 授权在**处理体之前**：权限与归属不通过时不进入业务逻辑，
         * 免得「先写了一半再报 403」。顺序也要紧：先判身份，再判写请求令牌——
         * 反过来会让「没登录」答成 403（令牌不对），把「去登录」说成「别想写」。
         */
        await authorize(identity, req.method, url.pathname, body);
        /*
         * 写请求统一做来源校验（2026-10 补）。
         *
         * 从前这条检查只长在少数几个写入口上（自动关联、入库、发布），其余写路由
         * 只靠会话 Cookie 的 `SameSite=Lax` 拦跨站请求。SameSite 确实能挡住浏览器的
         * 跨站表单 POST，但那是**一层**防护，不是「来源校验」本身：换一个客户端、
         * 或者将来某次 Cookie 属性调整，这层就没有了。这里对每个写请求都判一次：
         * 公网模式必须带 Origin 且等于站点地址，并带 CSRF 令牌；本机模式只认回环来源，
         * 无 Origin 的本机命令行调用放行。
         */
        if (WRITE_METHODS.has(req.method)) {
          if (AUTHENTICATED) auth.checkCsrf(req);
          else checkWriteOrigin(req, config);
        }
        /*
         * 每个请求**只取一次本体快照**，并把它交给路由处理体。
         *
         * 处理体用参数接收（而不是各自再 `requestOntology()`），这样「同一请求里的
         * 节点、证据、规划用的是同一份本体」由结构保证：取快照这件事在整条链上
         * 只有这一处，信封的 `ontologyVersion` 也就与 `data.version` 必然一致。
         *
         * `ontology` 是**该请求语种的那一份视图**（见上面「语种」一节）；`version`
         * 在两种语言下逐字相同，所以版本核对与发布流程不受语言影响。
         */
        const data = await entry.handler({ params: match.slice(1), query: url.searchParams, body, req, res, ontology: localized, identity });
        if (!res.headersSent) sendJson(res, 200, envelope(localized.version, data));
        return true;
      }
      sendJson(res, 404, errorEnvelope(new McsError(CODES.NOT_FOUND, `未知接口：${req.method} ${url.pathname}`, 404)));
      return true;
    } catch (error) {
      if (!isMcsError(error)) console.error('[mcs-web]', error);
      if (res.headersSent) { res.destroy(); return true; }
      sendJson(res, error.status ?? 500, errorEnvelope(error));
      return true;
    }
  };
  handle.close = () => { for (const controller of activeSettles.values()) controller.abort(); authoringHandle?.close(); authoringHandle = null; };
  return handle;
}
