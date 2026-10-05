import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { formatError, useApi, type UnavailableInfo } from '../api';
import { FormalSpecEditor } from '../components/FormalSpecEditor';
import { RelationReviewPanel, type ReplayRecord } from '../components/RelationReviewPanel';
import { PublicationPreview, type PublishOutcome } from '../components/PublicationPreview';
import {
  AUTHORING_CASES, DEFAULT_BUDGET, FALLBACK_TEMPLATES, FLOW_BOUNDARIES, PENDING_TEXT,
  buildLocalPreview, cancelRun, caseDiscipline, caseLabel, clearLocalDraft, createDraft, describeFailure,
  draftNodeId, draftSignature, draftToFields, emptyFields, excludedReasonsFrom, fetchCatalog, fetchDraft,
  fieldsToPatch, fieldsToSpecSource,
  isBlankFields, isPublishable, isValidationStale, listRevisions, localDraftKey, newIdempotencyKey, pending,
  previewPublication, commitPublication, readLocalDraft, replayCandidates, reviewDigest, rollbackPublication,
  startDiscoveryJob, updateDraft, useDebounced, useDiscoveryRun, validateDraft, writeLocalDraft,
  type AuthoringDraft, type AuthoringTemplate, type CandidateView, type DeclarationRole, type DiscoveryBudget,
  type DraftFields, type DraftPatch, type ExclusionNote, type FormalCatalogView, type LocalDraftRecord,
  type PublicationDiff, type PublicationRevision, type ReviewDecision, type SpecSourceKey, type ValidateResult,
} from '../authoring';
import type { NodeDetailResponse } from '../types';

/**
 * 「自动关联」主流程：填写节点 → 检查表达 → 自动发现 → 审阅结果 → 入库预览 → 确认入库（含回滚）。
 *
 * 这一页的三条底线：
 *
 * 1. **不依赖学习者档案**：草稿只在浏览器本地与编写库里，和 `localStorage` 里的学习草稿
 *    是两套东西（键也不同），切换档案不影响这一页。
 * 2. **未就绪要说清是哪一件没就绪**：解析器、发现引擎、编写库、发布服务都在服务端按需装载；
 *    缺哪个就在对应的动作上写出模块名与原因，**不假装成功、也不静默当空结果**。
 * 3. **未验证不画成已成立**：已反驳与未决只在审阅视图；网络预览只叠加草稿与已验证结果。
 *
 * URL 参数（节点页的两个入口）：
 * - `?node=<id>`：以此节点为基础创建（`mode=new`）或检查它已有的形式表达（`mode=check`）。
 */

const STEPS = [
  { id: 'node', label: '填写节点', hint: '基础信息与形式表达骨架' },
  { id: 'check', label: '检查表达', hint: '解析、类型检查、错误位置' },
  { id: 'discover', label: '自动发现', hint: '后台运行，不阻塞页面' },
  { id: 'review', label: '审阅结果', hint: '已验证 / 已反驳 / 未决' },
  { id: 'preview', label: '入库预览', hint: '只叠加草稿与结果' },
  { id: 'publish', label: '确认入库', hint: '版本与回滚' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

/** 节点详情里可能带上的形式表达负载（§7：新字段是可选的，旧客户端忽略即可）。 */
interface NodeFormalSpecView {
  specVersion?: string;
  background?: string;
  hash?: string;
  statement?: { source?: string };
  declarations?: Array<{ name?: string; type?: string; role?: string; label?: string }>;
  boundary?: string[];
}

/** 参数类型表的角色：只认 §1.6 的五个值，其余一律归到「对象集」，不猜测语义。 */
function toDeclarationRole(value: string | undefined): DeclarationRole {
  const roles: DeclarationRole[] = ['object', 'element', 'function', 'predicate', 'proposition'];
  return roles.includes(value as DeclarationRole) ? value as DeclarationRole : 'object';
}

/**
 * 把一份已登记的机器表达（`formalSpec`）变成草稿字段的补丁。
 *
 * 只搬「背景、陈述、参数类型表」三样：其余项（定义、假设、断言）在详情接口里
 * 未必齐全，少搬比搬错好——缺的部分由用户自己写，界面照旧显示「待补充」。
 */
function specToFieldPatch(spec: NodeFormalSpecView): Partial<DraftFields> {
  const patch: Partial<DraftFields> = {};
  if (spec.background) patch.background = spec.background;
  if (spec.statement?.source) patch.statement = spec.statement.source;
  if ((spec.declarations ?? []).length) {
    patch.declarations = (spec.declarations ?? []).map((row) => ({
      name: row.name ?? '',
      type: row.type ?? '',
      role: toDeclarationRole(row.role),
      label: row.label ?? '',
    }));
  }
  return patch;
}

/**
 * 可登记的对象构造类型，取自 `shared/types.d.ts` 的 `Construct` 联合。
 *
 * 这里写成显式数组，而不是把标签表的键直接铺成选项：编写入口的「全集」是协议允许的
 * 构造类型，与列表页分面的「本体里实际有哪些」不是一回事；而且「标签表当选项表」这种写法
 * 在 `tests/label-option-scan.test.mjs` 里必须逐处登记理由（它专门防「选不中任何东西的死选项」）。
 */
const CONSTRUCT_OPTIONS = ['Symbol', 'Term', 'Concept', 'Definition', 'Claim', 'Proof', 'Example', 'Counterexample', 'Problem', 'Theory', 'Construction', 'Method', 'Representation', 'MisconceptionPattern'] as const;

export function AuthoringPage() {
  const [searchParams] = useSearchParams();
  /** 来源节点（`?node=`）：只说清「从哪个节点进来的」，**不等于**草稿将要发布的节点 id。 */
  const sourceNodeId = searchParams.get('node');
  const mode = searchParams.get('mode') === 'check' ? 'check' : 'new';
  const nodeRef = useMemo(() => (sourceNodeId ? { node: sourceNodeId, version: '1' } : null), [sourceNodeId]);
  const storageKey = useMemo(() => localDraftKey(sourceNodeId), [sourceNodeId]);

  const ontology = useApi<{ version: string; contentHash: string }>('/ontology');
  const nodeDetail = useApi<NodeDetailResponse>(sourceNodeId ? `/ontology/nodes/${encodeURIComponent(sourceNodeId)}` : null, [sourceNodeId]);
  const ontologyNodes = useApi<{ nodes: Array<{ discipline?: string }> }>('/ontology/nodes?limit=500');
  /**
   * 学科候选值：取自本体里已经用过的学科。它们正是 `data/fields.mjs` 的受控词表
   * （FIELD_IDS），所以给出来的都是发布时会通过的值；用户仍可输入别的，预览会如实报错。
   */
  const disciplineOptions = useMemo(() => {
    const nodes = (ontologyNodes.data as { nodes?: Array<{ discipline?: string }> } | null)?.nodes ?? [];
    return [...new Set(nodes.map((node) => node.discipline).filter((item): item is string => Boolean(item)))].sort((a, b) => a.localeCompare(b, 'zh'));
  }, [ontologyNodes.data]);

  const [step, setStep] = useState<StepId>(mode === 'check' ? 'check' : 'node');
  const [fields, setFields] = useState<DraftFields>(emptyFields);
  const [decisions, setDecisions] = useState<Record<string, ReviewDecision>>({});
  const [includeIds, setIncludeIds] = useState<string[]>([]);
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const [localSavedAt, setLocalSavedAt] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftRevision, setDraftRevision] = useState<number | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  /** 上一次检查对应的源码快照：用来判断「检查之后又改过」这件事实。 */
  const [validatedSource, setValidatedSource] = useState<Record<SpecSourceKey, string> | null>(null);
  /** 服务端那份草稿的签名：用来判断「本地改动还没保存」这件事实（入库用的是服务端那份）。 */
  const [savedSignature, setSavedSignature] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<FormalCatalogView | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogUnavailable, setCatalogUnavailable] = useState<UnavailableInfo | null>(null);
  const [catalogProblems, setCatalogProblems] = useState<string[]>([]);

  const [budget, setBudget] = useState<DiscoveryBudget>(DEFAULT_BUDGET);
  const [starting, setStarting] = useState(false);
  const [runUnavailable, setRunUnavailable] = useState<UnavailableInfo | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [replayResults, setReplayResults] = useState<Record<string, ReplayRecord>>({});
  const [replaying, setReplaying] = useState(false);
  const discovery = useDiscoveryRun();
  const run = discovery.run;

  const [validation, setValidation] = useState<ValidateResult | null>(null);
  const [validateUnavailable, setValidateUnavailable] = useState<UnavailableInfo | null>(null);
  const [validateError, setValidateError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  /** 服务端预览的差异（含三分法）；本地预演只在服务端不可用时顶上。 */
  const [localPreview, setLocalPreview] = useState<PublicationDiff | null>(null);
  const [serverPreview, setServerPreview] = useState<PublicationDiff | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUnavailable, setPreviewUnavailable] = useState<UnavailableInfo | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  /**
   * 「哪些候选不入库、为什么」——**只从服务端预览的 `excluded` 名单来**（含 reasonCode）。
   * 用来做两件事：默认勾选把它们排除掉；在审阅面板上单独标出来并写明原因
   * （让用户知道不是系统出错、也不是它不成立）。
   */
  const [exclusionNotes, setExclusionNotes] = useState<Record<string, ExclusionNote>>({});

  const [publishing, setPublishing] = useState(false);
  const [publishUnavailable, setPublishUnavailable] = useState<UnavailableInfo | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishOutcome, setPublishOutcome] = useState<PublishOutcome | null>(null);

  const [revisions, setRevisions] = useState<PublicationRevision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(true);
  const [revisionsUnavailable, setRevisionsUnavailable] = useState<UnavailableInfo | null>(null);
  const [revisionsProblems, setRevisionsProblems] = useState<string[]>([]);
  const [revisionsRaw, setRevisionsRaw] = useState<unknown>(null);
  /** 当前生效的扩展包版本，以及本体快照自检报出的「待复核」项。 */
  const [activeRevision, setActiveRevision] = useState<string | null>(null);
  const [revisionIntegrity, setRevisionIntegrity] = useState<string[]>([]);
  const [rollbackPending, setRollbackPending] = useState<string | null>(null);
  const [rollbackError, setRollbackError] = useState<string | null>(null);
  const [rollbackOutcome, setRollbackOutcome] = useState<PublishOutcome | null>(null);

  const idempotency = useRef<string>(newIdempotencyKey());
  const restoredRef = useRef(false);

  /* ---------------- 草稿：从本地恢复（不依赖学习者档案） ---------------- */

  useEffect(() => {
    restoredRef.current = false;
    const record = readLocalDraft(storageKey);
    if (record) {
      setFields(record.fields);
      setDecisions(record.decisions ?? {});
      setDraftId(record.draftId);
      setDraftRevision(record.draftRevision);
      setValidation(record.validation);
      setValidatedSource(record.validatedSource);
      setRestoredAt(record.savedAt || null);
      setMessage('已从浏览器本地的草稿恢复（草稿只在本机，未进入公共本体）。');
      /*
       * 本地草稿里带着服务端草稿 id 时，顺手把服务端那一份取回来核对修订号与内容：
       * 入库用的是服务端那份，两边不一致必须让用户看见。
       */
      if (record.draftId) {
        const serverDraftId = record.draftId;
        void fetchDraft(serverDraftId).then((server) => {
          if (!server.ok || !server.data) return;
          const serverFields = draftToFields(server.data);
          setDraftRevision(typeof server.data.revision === 'number' ? server.data.revision : null);
          setSavedSignature(draftSignature(serverFields));
        });
      }
    } else {
      setFields(emptyFields());
      setDecisions({});
      setDraftId(null);
      setDraftRevision(null);
      setValidation(null);
      setValidatedSource(null);
      setSavedSignature(null);
      setRestoredAt(null);
    }
    restoredRef.current = true;
  }, [storageKey]);

  // 自动保存：本地草稿始终保存；服务端草稿只在用户按「保存到服务端」时写。
  const debouncedFields = useDebounced(fields, 600);
  const debouncedDecisions = useDebounced(decisions, 600);
  useEffect(() => {
    if (!restoredRef.current) return;
    if (isBlankFields(debouncedFields) && Object.keys(debouncedDecisions).length === 0) return;
    const savedAt = new Date().toISOString();
    const record: LocalDraftRecord = {
      schema: 1,
      key: storageKey,
      fields: debouncedFields,
      draftId,
      draftRevision,
      decisions: debouncedDecisions,
      validation,
      validatedSource,
      savedAt,
    };
    writeLocalDraft(record);
    setLocalSavedAt(savedAt);
  }, [debouncedFields, debouncedDecisions, draftId, draftRevision, storageKey, validation, validatedSource]);

  const patchFields = useCallback((patch: Partial<DraftFields>) => {
    setFields((current) => ({ ...current, ...patch }));
    // 用户一动草稿，待确认的「覆盖」就不再是一次明确的确认（内容已经变了）→ 撤销待确认态。
    setArmedTemplate(null);
  }, []);

  /**
   * 将要发布的节点 id：由名称派生（规则在 `draftNodeId` 里写死）。
   *
   * 为什么必须有它：`draft.spec.node` 为空时关系无处挂靠（入库会被挡下，服务端原话是
   * 「请求里没有节点标识…关系无处挂靠」），发现任务也失去「这份表达属于谁」的依据。
   */
  const nodeId = useMemo(() => draftNodeId(fields.name), [fields.name]);
  /** 上一次**通过检查**时用的节点 id：拿它和当前 id 比，才能说清「id 变了、结果过期了」。 */
  const [checkedNodeId, setCheckedNodeId] = useState<string | null>(null);
  const nodeIdChanged = Boolean(checkedNodeId && nodeId !== checkedNodeId);

  /**
   * 检查之后又改过源码、或节点 id 变了 → 这份结果不再对应当前草稿。
   * 界面要显式说明，并且**不拿它入库**（入库读的是它）。
   */
  const validationStale = useMemo(
    () => isValidationStale(validatedSource, fields) || Boolean(checkedNodeId && checkedNodeId !== nodeId),
    [validatedSource, fields, checkedNodeId, nodeId],
  );

  /**
   * 本地改动还没保存到服务端。
   *
   * 只有「已知服务端那一份长什么样」时才判定（`savedSignature` 非空）：否则无法证明两边不一致，
   * 也就不该给一个可能是假的警告。判为 true 时入库被挡住——入库用的是服务端那份草稿。
   */
  const unsavedChanges = useMemo(
    () => Boolean(draftId && savedSignature !== null && savedSignature !== draftSignature(fields)),
    [draftId, savedSignature, fields],
  );

  /* ---------------- 目录与版本清单 ---------------- */

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    fetchCatalog().then((result) => {
      if (cancelled) return;
      setCatalogLoading(false);
      if (result.ok) {
        setCatalog(result.data);
        setCatalogUnavailable(null);
        setCatalogProblems([]);
        if (result.data.budgets) setBudget(result.data.budgets);
        if (!result.data.languageReady) {
          setCatalogProblems(['形式目录装上了，但解析器没就绪：语言版本与符号清单可能为空。']);
        }
      } else {
        setCatalogUnavailable(result.unavailable);
        setCatalogProblems([describeFailure(result.error, result.unavailable)]);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const reloadRevisions = useCallback(async () => {
    setRevisionsLoading(true);
    const result = await listRevisions();
    setRevisions(result.revisions);
    setRevisionsUnavailable(result.unavailable);
    setRevisionsProblems(result.problems);
    setRevisionsRaw(result.raw);
    setActiveRevision(result.active);
    setRevisionIntegrity(result.integrityProblems);
    setRevisionsLoading(false);
  }, []);

  useEffect(() => { void reloadRevisions(); }, [reloadRevisions]);

  /* ---------------- 模板 ---------------- */

  /**
   * 服务端登记表里的模板：**一条对应一个已登记的形式表达**（不是四案例骨架）。
   * 它带的是真实登记过的内容（含陈述与定义），所以单独一块、用下拉选择，
   * 不与「四案例骨架」混在一起——两者的可信程度不一样。
   */
  const catalogTemplates: AuthoringTemplate[] = useMemo(() => (catalog?.templates ?? [])
    .filter((template) => template.id)
    .map((template) => {
      const draft = template.draft as Partial<AuthoringDraft> | undefined;
      const converted = draft ? draftToFields({
        ...(draft as AuthoringDraft),
        specSource: (draft.specSource ?? { declarations: '', definitions: '', assumptions: '', statement: '', claims: '' }),
      }) : emptyFields();
      return {
        id: template.id,
        case: template.case || converted.case,
        title: template.title || template.id,
        note: template.note,
        fields: converted,
      };
    }), [catalog]);

  const [armedTemplate, setArmedTemplate] = useState<string | null>(null);
  const [pickedTemplateId, setPickedTemplateId] = useState<string>('');

  /**
   * 套用模板。
   *
   * 三种情形分开处理，**提示文字与真实状态必须一致**（上一版的毛病：第一次点击已经套用了，
   * 第二次点击却把「再点一次确认覆盖」写进全局提示，页面上于是留着一条与实际状态矛盾的话）：
   *
   * 1. 草稿字段已经与这套模板一致 → 什么都不做，明说「已经套用过了」；
   * 2. 草稿里有别的内容 → 进入待确认态，确认提示**只画在按钮旁边**（`.authoring-armed`），
   *    不写进全局提示；再点一次才真的覆盖；
   * 3. 草稿是空的 → 直接套用（没什么可覆盖的）。
   */
  function applyTemplate(template: AuthoringTemplate) {
    if (draftSignature(fields) === draftSignature(template.fields)) {
      setArmedTemplate(null);
      setMessage(`「${template.title}」已经套用过了：当前草稿字段与它一致，没有改动。`);
      return;
    }
    if (!isBlankFields(fields) && armedTemplate !== template.id) {
      setArmedTemplate(template.id);
      return;
    }
    setArmedTemplate(null);
    setFields({
      ...template.fields,
      // 学科空着会让「入库预览」永远多一条阻断项（`buildNodeRecord` 要求受控词表里的值）。
      // 案例能推出学科，这里补默认值；用户在表单里随时可以改。
      discipline: template.fields.discipline || caseDiscipline(template.fields.case),
    });
    setMessage(`已套用模板「${template.title}」，替换了草稿字段。`);
  }

  /* ---------------- 节点页入口带来的上下文 ---------------- */

  const nodeFormalSpec = useMemo(() => {
    const node = nodeDetail.data?.node as (NodeDetailResponse['node'] & { formalSpec?: NodeFormalSpecView | null; hasFormalSpec?: boolean; formalSpecVersion?: string | null }) | undefined;
    return node?.formalSpec ?? null;
  }, [nodeDetail.data]);

  useEffect(() => {
    /*
     * 从节点页进来时把已登记的内容带到草稿里。
     *
     * - `mode=new`（以此为基础创建）：只带名称/摘要/案例；形式表达留空，由用户自己写。
     * - `mode=check`（检查已有形式表达）：**把该节点登记的机器表达抄进草稿**再检查——
     *   这正是这个入口的用途。带 `#` 的说明：抄进草稿是拷贝，不是引用，改动不回写节点。
     * - 本地已有草稿时不覆盖：用户写的东西优先。
     */
    if (!nodeDetail.data || !restoredRef.current) return;
    if (readLocalDraft(storageKey)) return;
    const node = nodeDetail.data.node;
    if (mode === 'check') {
      if (!nodeFormalSpec) return; // 没有既有表达：留在这一步如实说明「没有可检查的对象」。
      setFields((current) => ({ ...current, ...specToFieldPatch(nodeFormalSpec), name: current.name || `${node.title}（检查既有表达）` }));
      setMessage('已把该节点登记的机器表达抄进草稿用于检查：这是拷贝，不是引用；在这里改动不会回写该节点。');
      return;
    }
    setFields((current) => ({
      ...current,
      name: current.name || `${node.title}（草稿）`,
      summary: current.summary || node.summary || '',
      case: current.case || node.case || 'group',
    }));
    // 只做一次：之后用户改什么都不该被覆盖。
  }, [mode, nodeDetail.data, nodeFormalSpec, storageKey]);

  /* ---------------- 服务端草稿 ---------------- */

  const saveDraft = useCallback(async () => {
    if (!fields.name.trim()) {
      // 编写库要求 name 非空（`草稿需要 name`）：与其等 400，不如在这里说清楚。
      setDraftError('先给草稿起个名字再保存到服务端（本地草稿不需要名字，已经在自动保存）。');
      return;
    }
    setSavingDraft(true);
    setDraftError(null);
    const version = ontology.data?.version ?? null;
    // 归一 spec 只在它与当前源码一致时随草稿保存：检查之后又改过，就不把过期表达存进去。
    const patch: DraftPatch = { ...fieldsToPatch(fields) };
    if (validation && !validationStale) {
      patch.spec = validation.spec;
      patch.validation = validation;
    }
    const result = draftId
      ? await updateDraft(draftId, patch, draftRevision ?? 1, version)
      : await createDraft(fields, version, patch);
    setSavingDraft(false);
    if (!result.ok) {
      setDraftError(describeFailure(result.error, result.unavailable));
      setMessage(draftId
        ? '服务端草稿没有更新成功；本地草稿仍然保留，改动不会丢。'
        : '服务端草稿没有建成；本地草稿仍然保留，可以继续填写。');
      return;
    }
    const draft = result.data;
    if (draft && typeof draft.id === 'string') {
      setDraftId(draft.id);
      setDraftRevision(typeof draft.revision === 'number' ? draft.revision : null);
      setSavedSignature(draftSignature(fields));
      setMessage(`服务端草稿已保存：${draft.id}（修订 ${draft.revision ?? '?'}）。`);
    } else {
      setMessage('服务端返回了未识别的草稿形状：已保留本地草稿，未当作保存成功。');
    }
  }, [draftId, draftRevision, fields, ontology.data, validation, validationStale]);

  /* ---------------- 检查表达 ---------------- */

  const checkExpression = useCallback(async () => {
    setValidating(true);
    setValidateError(null);
    const result = await validateDraft(fields, { draftId, draftRevision, nodeRef, nodeId });
    setValidating(false);
    if (!result.ok) {
      setValidation(null);
      setValidatedSource(null);
      setCheckedNodeId(null);
      setValidateUnavailable(result.unavailable);
      setValidateError(describeFailure(result.error, result.unavailable));
      return;
    }
    setValidateUnavailable(null);
    setValidation(result.data);
    setValidatedSource(fieldsToSpecSource(fields));
    setCheckedNodeId(nodeId || null);
    setStep('check');
  }, [draftId, draftRevision, fields, nodeId, nodeRef]);

  /* ---------------- 自动发现 ---------------- */

  /**
   * 「现在还不能启动」的**可见**原因清单。
   *
   * 上一版只把这些写在 `title` 里：窄屏和键盘用户看不到 tooltip，于是按钮为什么禁用成了谜。
   * 这里逐条给出来，并且与 `disabled` 用的是同一个数组——不允许「按钮禁用了但页面不解释」。
   */
  const discoveryBlockers = useMemo(() => {
    const blockers: string[] = [];
    if (!fields.name.trim()) blockers.push('先在「基础信息」里填节点名称（它决定将要发布的节点 id）');
    if (!fields.background.trim()) blockers.push('先在「形式表达」里选择背景理论（蕴含必须在某个背景下才可判）');
    if (!draftId) blockers.push('先把草稿保存到服务端（草稿栏的「创建服务端草稿」），或从节点页「以此为基础创建」进入');
    if (unsavedChanges) blockers.push('先把本地改动保存到服务端草稿（发现任务读的是服务端那一份）');
    if (!validation) blockers.push('先在「检查表达」里检查一次（关系要挂在草稿的形式表达上）');
    else if (validationStale) blockers.push('草稿又改过（或节点 id 变了），先去「检查表达」重新检查一次');
    else if (!validation.ok) blockers.push('当前表达没通过解析检查，先修好再启动');
    return blockers;
  }, [draftId, fields.background, fields.name, unsavedChanges, validation, validationStale]);

  const startDiscovery = useCallback(async () => {
    setStarting(true);
    setRunError(null);
    setRunUnavailable(null);
    setReplayResults({});
    // 新的一次运行会有新的候选 id：上一轮预览留下的「不入库」名单不再适用，清掉。
    setExclusionNotes({});
    const result = await startDiscoveryJob({
      draftId,
      draftRevision,
      node: draftId ? null : nodeRef?.node ?? null,
      nodeVersion: draftId ? null : nodeRef?.version ?? null,
      background: fields.background,
      budget,
      ontologyVersion: ontology.data?.version ?? null,
    });
    setStarting(false);
    if (!result.ok) {
      setRunUnavailable(result.unavailable);
      setRunError(describeFailure(result.error, result.unavailable));
      return;
    }
    if (!result.data) {
      setRunError('服务端返回了未识别的任务形状：没有 id 的任务无法查看结果，未当作启动成功。');
      return;
    }
    discovery.setRun(result.data);
    setIncludeIds([]);
    setMessage(`发现任务已启动：${result.data.id}。任务在服务端跑，页面可以继续操作或用其它步骤。`);
  }, [budget, draftId, draftRevision, discovery, fields.background, nodeRef, ontology.data]);

  const stopDiscovery = useCallback(async () => {
    if (!run) return;
    const result = await cancelRun(run.id);
    if (!result.ok) { setRunError(describeFailure(result.error, result.unavailable)); return; }
    if (result.data) discovery.setRun(result.data);
    setMessage('已请求取消：已完成并核验过的候选结果保留；中断不等于数学反驳。');
  }, [discovery, run]);

  const replay = useCallback(async (candidateIds: string[]) => {
    if (!run) return;
    setReplaying(true);
    const result = await replayCandidates(run.id, candidateIds);
    setReplaying(false);
    if (!result.ok) {
      setReplayResults((current) => {
        const next = { ...current };
        for (const id of candidateIds) next[id] = { error: describeFailure(result.error, result.unavailable) };
        return next;
      });
      return;
    }
    setReplayResults((current) => {
      const next = { ...current };
      for (const outcome of result.data?.results ?? []) next[outcome.candidateId] = outcome;
      return next;
    });
    // 重放会改写候选的 replay/math 字段：重新取一次任务，别用旧结论糊过去。
    discovery.refresh();
  }, [discovery, run]);

  /* ---------------- 审阅决策与纳入 ---------------- */

  const candidates: CandidateView[] = run?.candidates ?? [];

  const decide = useCallback((candidateId: string, decision: ReviewDecision) => {
    setDecisions((current) => {
      const next = { ...current };
      if (decision === null) delete next[candidateId];
      else next[candidateId] = decision;
      return next;
    });
    if (decision === 'accepted') {
      setIncludeIds((current) => (current.includes(candidateId) ? current : [...current, candidateId]));
    }
    if (decision === 'dismissed') {
      setIncludeIds((current) => current.filter((id) => id !== candidateId));
    }
  }, []);

  /** 服务端已经判过「不入库」的候选 id：默认勾选与采纳范围都要排除它们。 */
  const excludedIds = useMemo(() => new Set(Object.keys(exclusionNotes)), [exclusionNotes]);

  // 新的一批结果到达时，把**可入库**的已验证候选默认勾进「本次入库范围」——用户仍可逐条取消。
  // 判据集中在 `isPublishable()`：不可入库的候选（例如只存在于登记表里的概念锚点）默认不勾，
  // 免得整批提交被服务端挡下。
  useEffect(() => {
    const publishable = candidates.filter((candidate) => isPublishable(candidate, excludedIds)).map((candidate) => candidate.id);
    setIncludeIds((current) => {
      const kept = current.filter((id) => publishable.includes(id));
      const added = publishable.filter((id) => !kept.includes(id));
      return added.length === 0 && kept.length === current.length ? current : [...kept, ...added];
    });
  }, [candidates, excludedIds]);

  const toggleInclude = useCallback((candidateId: string, include: boolean) => {
    setIncludeIds((current) => (include ? (current.includes(candidateId) ? current : [...current, candidateId]) : current.filter((id) => id !== candidateId)));
  }, []);

  /* ---------------- 入库预览 ---------------- */

  const acceptedIds = useMemo(
    () => candidates
      .filter((candidate) => isPublishable(candidate, excludedIds) && (decisions[candidate.id] === 'accepted' || includeIds.includes(candidate.id)))
      .map((candidate) => candidate.id),
    [candidates, decisions, includeIds, excludedIds],
  );
  /**
   * 驳回清单只收**当前这次运行**里的候选：换过一次运行之后，旧决策的 id 不在新结果里，
   * 提交时会被服务端判 409（候选不在该任务的结果里）。旧决策不删，只是不计入这一次。
   */
  const dismissedIds = useMemo(() => {
    const inRun = new Set(candidates.map((candidate) => candidate.id));
    return Object.entries(decisions).filter(([id, value]) => value === 'dismissed' && inRun.has(id)).map(([id]) => id);
  }, [candidates, decisions]);

  /** 属于更早运行结果的审阅决策条数：会显示出来，不静默丢弃。 */
  const staleDecisionCount = useMemo(() => {
    const inRun = new Set(candidates.map((candidate) => candidate.id));
    return Object.keys(decisions).filter((id) => !inRun.has(id)).length;
  }, [candidates, decisions]);

  const digest = useMemo(() => reviewDigest(acceptedIds, dismissedIds, draftRevision), [acceptedIds, dismissedIds, draftRevision]);

  const runPreview = useCallback(async () => {
    setPreviewError(null);
    setPreviewUnavailable(null);
    setPreviewLoading(true);
    const result = await previewPublication({
      draftId,
      draftRevision,
      runId: run?.id ?? null,
      acceptedCandidateIds: acceptedIds,
      dismissedCandidateIds: dismissedIds,
      reviewDigest: digest,
      idempotencyKey: idempotency.current,
      notes: null,
      ontologyVersion: ontology.data?.version ?? null,
    });
    setPreviewLoading(false);
    if (!result.ok) {
      setServerPreview(null);
      setPreviewUnavailable(result.unavailable);
      setPreviewError(describeFailure(result.error, result.unavailable));
      // 服务端预览不可用不是「没有变更」：用本地预演顶上，并明确标出它不是承诺。
      setLocalPreview(buildLocalPreview({ fields, nodeRef, candidates, includeIds: acceptedIds }));
      return;
    }
    const diff = result.data?.diff ?? null;
    setServerPreview(diff);
    setLocalPreview(null);
    /*
     * 服务端的三分法里，`excluded` 是**明确不入库**的一类（概念锚点等）。
     * 拿到它之后：① 记下原因，审阅面板与勾选清单都据此标注；② 把它从「本次入库范围」里去掉，
     * 免得用户下一次提交又撞上同一批（它们不会阻断其余内容，但留着只会让人以为能发出去）。
     * 判据全部来自服务端字段，前端不猜 id 前缀。
     */
    if (diff) {
      const notes = excludedReasonsFrom(diff);
      setExclusionNotes(notes);
      const removed = Object.keys(notes).filter((id) => includeIds.includes(id));
      if (removed.length > 0) {
        setIncludeIds((current) => current.filter((id) => !notes[id]));
        setMessage(`服务端判定有 ${removed.length} 条候选不入库（原因见下面「不在入库范围」一栏），已从本次入库范围移除；其余内容照常入库。`);
      }
    }
  }, [acceptedIds, candidates, digest, dismissedIds, draftId, draftRevision, fields, includeIds, nodeRef, ontology.data, run]);

  const activePreview = serverPreview ?? localPreview;

  /* ---------------- 入库与回滚 ---------------- */

  const publish = useCallback(async () => {
    setPublishing(true);
    setPublishError(null);
    setPublishUnavailable(null);
    const result = await commitPublication({
      draftId,
      draftRevision,
      runId: run?.id ?? null,
      acceptedCandidateIds: acceptedIds,
      dismissedCandidateIds: dismissedIds,
      reviewDigest: digest,
      idempotencyKey: idempotency.current,
      notes: null,
      ontologyVersion: ontology.data?.version ?? null,
    });
    setPublishing(false);
    if (!result.ok) {
      setPublishUnavailable(result.unavailable);
      setPublishError(describeFailure(result.error, result.unavailable));
      return;
    }
    const data = result.data;
    setPublishOutcome({
      revisionId: data?.revision?.id ?? null,
      ontologyVersion: data?.ontologyVersion ?? null,
      summary: data?.revision
        ? `新增 节点 ${data.revision.summary.nodes} · 关系 ${data.revision.summary.relations} · 证据 ${data.revision.summary.evidence} · 定义 ${data.revision.summary.definitions} · 契约 ${data.revision.summary.contracts}`
        : '服务端未返回版本摘要。',
    });
    idempotency.current = newIdempotencyKey();
    void reloadRevisions();
    /*
     * 入库切了本体版本：不刷新的话，页面上那个「本体版本」是旧的，
     * 下一次写操作（保存草稿、再预览）会被服务端判 409（版本冲突）——那是**对的行为**，
     * 但对用户来说像是"刚入库完就坏了"。所以这里把快照重新取一次。
     */
    ontology.reload();
    setMessage('入库完成；回滚会另建一条版本记录，历史包与证据都还在。已刷新本体版本。');
  }, [acceptedIds, digest, dismissedIds, draftId, draftRevision, ontology, reloadRevisions, run]);

  const rollback = useCallback(async (revisionId: string) => {
    setRollbackPending(revisionId);
    setRollbackError(null);
    const result = await rollbackPublication(revisionId, { idempotencyKey: newIdempotencyKey(), ontologyVersion: ontology.data?.version ?? null });
    setRollbackPending(null);
    if (!result.ok) { setRollbackError(describeFailure(result.error, result.unavailable)); return; }
    setRollbackOutcome({
      revisionId: result.data?.revision?.id ?? null,
      ontologyVersion: result.data?.ontologyVersion ?? null,
      summary: `恢复到 ${revisionId}`,
    });
    void reloadRevisions();
  }, [ontology.data, reloadRevisions]);

  /* ---------------- 顶部状态 ---------------- */

  const notReadyReasons = useMemo(() => {
    const reasons: string[] = [];
    if (catalog && !catalog.languageReady) reasons.push('解析器 / 类型检查（core/formal/language.mjs）');
    if (runUnavailable) reasons.push(`发现引擎（${runUnavailable.specifier ?? '模块未装载'}）`);
    if (previewUnavailable || publishUnavailable) reasons.push(`发布服务（${(previewUnavailable ?? publishUnavailable)?.specifier ?? '模块未装载'}）`);
    if (revisionsUnavailable) reasons.push(`版本清单（${revisionsUnavailable.specifier ?? '模块未装载'}）`);
    if (draftError) reasons.push('编写库（server/authoring-db.mjs）');
    return reasons;
  }, [catalog, draftError, previewUnavailable, publishUnavailable, revisionsUnavailable, runUnavailable]);

  const statementState = pending(fields.statement);

  return (
    <div className="page authoring-page">
      <div className="section-heading">
        <h1>自动关联</h1>
        <p>
          把一个数学对象写成<strong>受限形式语言</strong>的表达，让站点在登记过的背景理论里自动找关系，
          再逐条审阅、预览变更、入库或回滚。四个案例（{AUTHORING_CASES.map((item) => caseLabel(item)).join('、')}）
          各有一套骨架模板。
        </p>
        <p className="muted">
          这一步写的是<strong>机器表达层</strong>，与节点页给人读的「形式表达」分开保存、互不覆盖；
          学习者档案（E）不参与，草稿也不进公共本体。
        </p>
      </div>

      {notReadyReasons.length > 0 && (
        <section className="card authoring-notready">
          <h2>功能尚未就绪的部分</h2>
          <p>
            这一页依赖的模块由服务端按需装载，当前有 {notReadyReasons.length} 处没有就绪：
            {notReadyReasons.map((reason) => <code key={reason}>{reason}</code>)}
          </p>
          <p className="muted">
            页面仍然可以填写草稿并在本地自动保存；每个动作都会在<strong>它自己那一步</strong>报告为什么没有执行。
            未就绪不等于命题未决，也不等于命题为假。
          </p>
        </section>
      )}

      <nav className="step-rail authoring-steps" aria-label="自动关联流程">
        {STEPS.map((item, index) => (
          <li key={item.id} className={step === item.id ? 'active' : ''}>
            <button
              type="button"
              className="authoring-step-button"
              aria-current={step === item.id ? 'step' : undefined}
              onClick={() => setStep(item.id)}
            >
              <span className="authoring-step-index">{index + 1}</span>
              <span className="authoring-step-text">
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
            </button>
          </li>
        ))}
      </nav>

      <section className="card authoring-draftbar" aria-label="草稿状态">
        <div className="authoring-draftbar-main">
          {nodeRef
            ? <span>来源节点 <code>{nodeRef.node}</code>{nodeDetail.data?.node.title ? `（${nodeDetail.data.node.title}）` : ''}</span>
            : <span>新建节点草稿（未挂在既有节点上）</span>}
          <span className="muted">
            本地草稿键 <code>{storageKey}</code>
            {localSavedAt ? ` · 自动保存于 ${new Date(localSavedAt).toLocaleTimeString('zh-CN')}` : ' · 尚未保存'}
            {restoredAt ? ` · 已恢复自 ${new Date(restoredAt).toLocaleString('zh-CN')}` : ''}
          </span>
        </div>
        <div className="card-actions">
          <button type="button" className="button small" disabled={savingDraft} onClick={saveDraft}>
            {savingDraft ? '保存中…' : draftId ? `保存到服务端（当前修订 ${draftRevision ?? '?'}）` : '创建服务端草稿'}
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              clearLocalDraft(storageKey);
              setFields(emptyFields());
              setDecisions({});
              setLocalSavedAt(null);
              setRestoredAt(null);
              setMessage('已清空本地草稿（服务端草稿不受影响）。');
            }}
          >
            清空本地草稿
          </button>
        </div>
        {unsavedChanges && (
          <p className="error">
            本地改动还没有保存到服务端。<strong>入库用的是服务端那一份草稿</strong>：在保存之前，预览与入库都会
            反映旧内容，所以这里先把入库挡住。
          </p>
        )}
        {draftError && <p className="error">{draftError}</p>}
      </section>

      {message && <p className="notice" role="status">{message}</p>}

      {/* ---------------- 第 1 步：填写节点 ---------------- */}
      {step === 'node' && (
        <>
          <section className="card">
            <h2>四案例骨架模板</h2>
            <p className="hint">
              模板只填<strong>骨架</strong>：案例、背景、参数类型表。陈述、假设、定义与中文解释留空，
              界面显示「{PENDING_TEXT}」——站点不替你写数学内容。
            </p>
            <ul className="authoring-templates">
              {FALLBACK_TEMPLATES.map((template) => (
                <li key={template.id}>
                  <article>
                    <header>
                      <span className="construct">{caseLabel(template.case)}</span>
                      <strong>{template.title}</strong>
                    </header>
                    <p className="muted">{template.note || '（模板没有给出说明）'}</p>
                    {/*
                      待确认提示**只画在这里**，不写进全局提示：全局提示说的是「已经发生了什么」，
                      而这条说的是「再点一次会发生什么」。混在一起就会出现「已经套用了、
                      页面上却还留着再点一次确认」的矛盾状态。
                    */}
                    {armedTemplate === template.id && (
                      <p className="authoring-armed" role="status">再点一次会<strong>覆盖</strong>当前草稿的名称、背景与全部源码块。取消请改动任一字段。</p>
                    )}
                    <div className="card-actions">
                      <button type="button" className={`button small${armedTemplate === template.id ? ' primary' : ''}`} onClick={() => applyTemplate(template)}>
                        {armedTemplate === template.id ? '再点一次确认覆盖' : '套用这个骨架'}
                      </button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>

            {catalogTemplates.length > 0 && (
              <div className="authoring-registered-templates">
                <h3>按已登记的形式表达起稿<span className="family-count">{catalogTemplates.length} 条</span></h3>
                <p className="hint">
                  这些不是骨架：它们来自登记表里<strong>已经写好的形式表达</strong>，含陈述、定义与假设。
                  套用之后请自己核对，站点不保证它与你的意图一致。
                </p>
                <div className="authoring-template-picker">
                  <label>
                    选择一条
                    <select value={pickedTemplateId} onChange={(event) => setPickedTemplateId(event.target.value)}>
                      <option value="">（未选择）</option>
                      {catalogTemplates.map((template) => (
                        <option key={template.id} value={template.id}>{caseLabel(template.case)} · {template.title}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="button small"
                    disabled={!pickedTemplateId}
                    onClick={() => {
                      const picked = catalogTemplates.find((template) => template.id === pickedTemplateId);
                      if (picked) applyTemplate(picked);
                    }}
                  >
                    {armedTemplate === pickedTemplateId && pickedTemplateId ? '再点一次确认套用' : '套用选中的登记模板'}
                  </button>
                </div>
                {pickedTemplateId && (
                  <p className="muted">{catalogTemplates.find((template) => template.id === pickedTemplateId)?.note || '（这条模板没有给出说明）'}</p>
                )}
                {pickedTemplateId && armedTemplate === pickedTemplateId && (
                  <p className="authoring-armed" role="status">再点一次会<strong>覆盖</strong>当前草稿的名称、背景与全部源码块。</p>
                )}
              </div>
            )}
          </section>

          <section className="card">
            <h2>基础信息</h2>
            <div className="authoring-form">
              <label>
                名称
                <input value={fields.name} onChange={(event) => patchFields({ name: event.target.value })} placeholder="例如：群：交换性" />
              </label>
              {/*
                学科：入库的硬要求（`buildNodeRecord`：非空且在受控词表里），所以必须能在这里填。
                候选值取自本体里**已经用过**的学科（它们就是 data/fields.mjs 的 FIELD_IDS），
                再用 datalist 提供——不是写死的下拉，输入别的值也允许，预览会如实报错。
              */}
              <label>
                学科（入库要求）
                <input
                  list="authoring-disciplines"
                  value={fields.discipline}
                  onChange={(event) => patchFields({ discipline: event.target.value })}
                  placeholder="例如：群论"
                />
                <datalist id="authoring-disciplines">
                  {disciplineOptions.map((item) => <option key={item} value={item} />)}
                </datalist>
              </label>
              {/*
                将要发布的节点 id：由名称派生，**显示出来**，让用户知道自己在发布成什么。
                名称改了 id 跟着改；如果已经检查过，这里会说明那次检查的结果因此过期。
              */}
              <div className="authoring-node-id">
                <span className="authoring-node-id-label">将要发布的节点 id</span>
                {nodeId
                  ? <code data-testid="derived-node-id">{nodeId}</code>
                  : <span className="muted">先填名称（名称里带 <code>:</code> 时按显式 id 处理，否则补 <code>draft:</code> 前缀）</span>}
                <span className="muted">
                  规则：名称里含 <code>:</code> 时原样当 id；否则把空白折成 <code>-</code>、去掉会破坏 id 的字符，再加 <code>draft:</code> 前缀。
                </span>
                {nodeIdChanged && (
                  <span className="authoring-node-id-changed">
                    id 已变化：<code>{checkedNodeId}</code> → <code>{nodeId}</code>；上次检查的结果已过期，请回第 2 步重新检查。
                  </span>
                )}
              </div>
              <label>
                构造类型
                <select value={fields.construct} onChange={(event) => patchFields({ construct: event.target.value })}>
                  {CONSTRUCT_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                  {fields.construct && !(CONSTRUCT_OPTIONS as readonly string[]).includes(fields.construct) && (
                    <option value={fields.construct}>{fields.construct}（不在协议列表里）</option>
                  )}
                </select>
              </label>
              <label>
                案例
                {/*
                  只列四案例（§2.4 的四个背景对应它们）。
                  这里刻意<strong>不</strong>把案例标签表的键铺成选项：那张表是全站词汇表
                  （含 dg/liang/rudin 等未形式化的案例），铺出来就会出现「选得中却没有对应背景」的死选项。
                  草稿里已经写着其它案例时，单独把它列出来，不静默改写。
                */}
                <select value={fields.case} onChange={(event) => patchFields({ case: event.target.value })}>
                  {AUTHORING_CASES.map((id) => <option key={id} value={id}>{caseLabel(id)}</option>)}
                  {fields.case && !(AUTHORING_CASES as readonly string[]).includes(fields.case) && (
                    <option value={fields.case}>{caseLabel(fields.case)}（不在四案例里）</option>
                  )}
                </select>
              </label>
              <label className="authoring-wide">
                摘要（给人读的一句话）
                <textarea rows={2} value={fields.summary} onChange={(event) => patchFields({ summary: event.target.value })} />
              </label>
              <label className="authoring-wide">
                中文解释 / 读法
                <textarea rows={2} value={fields.reading} onChange={(event) => patchFields({ reading: event.target.value })} placeholder={`留空时界面显示「${PENDING_TEXT}」，不自动生成`} />
              </label>
            </div>
            {sourceNodeId && (
              <div className="authoring-node-source">
                <h3>来自节点页的登记内容（只读）</h3>
                {nodeDetail.loading && <p className="muted">读取节点…</p>}
                {nodeDetail.error && <p className="error">{formatError(nodeDetail.error)}</p>}
                {nodeDetail.data && (
                  <>
                    <p>
                      <Link to={`/nodes/${encodeURIComponent(sourceNodeId)}`}>{nodeDetail.data.node.title}</Link>
                      <span className="muted"> · {nodeDetail.data.node.id} · 版本 {nodeDetail.data.node.version}</span>
                    </p>
                    {nodeDetail.data.node.formalStatement
                      ? (
                        <dl className="facts compact">
                          <div><dt>已登记形式表达</dt><dd><code>{nodeDetail.data.node.formalStatement.tex}</code></dd></div>
                          <div><dt>读法</dt><dd>{nodeDetail.data.node.formalStatement.reading || PENDING_TEXT}</dd></div>
                          <div><dt>证据标签</dt><dd>{nodeDetail.data.node.formalStatement.label}</dd></div>
                        </dl>
                      )
                      : <p className="muted">该节点没有登记给人读的形式表达（<code>formalStatement</code>）。这不是错误，只是没有登记。</p>}
                    {nodeFormalSpec
                      ? (
                        <div className="authoring-existingspec">
                          <p className="notice">
                            该节点已有一份机器表达（<code>formalSpec</code>，specVersion {nodeFormalSpec.specVersion ?? '（未返回）'}，
                            背景 <code>{nodeFormalSpec.background ?? '（未返回）'}</code>）。
                          </p>
                          <pre className="pub-raw">{JSON.stringify(nodeFormalSpec, null, 2)}</pre>
                          <div className="card-actions">
                            <button
                              type="button"
                              className="button small"
                              onClick={() => {
                                const spec = nodeFormalSpec;
                                patchFields(specToFieldPatch(spec));
                                setMessage('已把该节点的机器表达抄进草稿：这是「拷贝」，不是引用；改动不会回写原节点。');
                              }}
                            >
                              抄进草稿（拷贝，不是引用）
                            </button>
                          </div>
                        </div>
                      )
                      : <p className="muted">该节点没有登记机器表达（<code>formalSpec</code>）；「检查已有形式表达」这一步因此没有可检查的对象。</p>}
                  </>
                )}
              </div>
            )}
          </section>

          <section className="card">
            <h2>形式表达</h2>
            <FormalSpecEditor
              fields={fields}
              onChange={patchFields}
              catalog={catalog}
              catalogLoading={catalogLoading}
              catalogProblems={catalogProblems}
              catalogUnavailable={catalogUnavailable}
              problems={validation?.problems ?? []}
              validation={validation}
              validationStale={validationStale}
              validateUnavailable={validateUnavailable}
              showProblems={false}
            />
          </section>

          <div className="authoring-nav">
            <button type="button" className="button primary" onClick={() => setStep('check')}>下一步：检查表达</button>
          </div>
        </>
      )}

      {/* ---------------- 第 2 步：检查表达 ---------------- */}
      {step === 'check' && (
        <>
          <section className="card">
            <h2>检查表达</h2>
            <p className="hint">
              交给解析器做词法/语法、别名归一、α 规范与类型检查（<code>POST /formal/validate</code>，零写入）。
              通过只说明<strong>表达可读且良类型</strong>，不表示命题成立。
            </p>
            <div className="card-actions">
              <button type="button" className="button primary" disabled={validating} onClick={checkExpression}>
                {validating ? '检查中…' : '检查表达'}
              </button>
              {validation && <span className="muted">上次检查：{validation.ok ? '通过' : `${validation.problems.length} 处问题`}</span>}
            </div>
            {/*
              「检查已有形式表达」这个入口进来的用户，最想先知道的是「这个节点到底有没有既有表达」。
              有就列出它的版本与背景；没有就明说没有——不拿草稿冒充「已有表达」。
            */}
            {sourceNodeId && (
              <p className="muted">
                来源节点 <Link to={`/nodes/${encodeURIComponent(sourceNodeId)}`}><code>{sourceNodeId}</code></Link>
                {nodeDetail.loading && ' · 读取中…'}
                {nodeDetail.data && (
                  nodeFormalSpec
                    ? <> · 已登记机器表达（<code>formalSpec</code>，specVersion {nodeFormalSpec.specVersion ?? '（未返回）'}，背景 {nodeFormalSpec.background ?? '（未返回）'}）。下面检查的是草稿里的<strong>拷贝</strong>，改动不会回写该节点。</>
                    : <> · 该节点没有登记机器表达（<code>formalSpec</code>），因此没有可检查的既有对象：下面检查的是你写进草稿的这份。</>
                )}
              </p>
            )}
            {validateError && <p className="error">{validateError}</p>}
            {statementState.pending && <p className="muted">陈述还是空的：先在上面写一条认证公式，再检查。</p>}
          </section>

          <section className="card">
            <h2>形式表达（含错误位置）</h2>
            <FormalSpecEditor
              fields={fields}
              onChange={patchFields}
              catalog={catalog}
              catalogLoading={catalogLoading}
              catalogProblems={catalogProblems}
              catalogUnavailable={catalogUnavailable}
              problems={validation?.problems ?? []}
              validation={validation}
              validationStale={validationStale}
              validateUnavailable={validateUnavailable}
              showProblems
            />
          </section>

          <section className="card authoring-boundary">
            <h2>首版能力的诚实边界</h2>
            <ul>
              <li>能做：定义展开、λ 应用化简、假设引入/蕴含、合取、全称/存在、等式自反与替换、引用已重放通过的局部引理。</li>
              <li>不做：析取与经典反证（内核无规则）、一般高阶合一、跨载体遗忘映射、任意模型搜索。</li>
              <li>检查器本身未获形式验证（<code>kernelFormallyVerified</code> 恒为 false）：「跑通了」不等于「数学上已证明」。</li>
            </ul>
          </section>

          <div className="authoring-nav">
            <button type="button" className="button" onClick={() => setStep('node')}>上一步</button>
            <button type="button" className="button primary" onClick={() => setStep('discover')}>下一步：自动发现</button>
          </div>
        </>
      )}

      {/* ---------------- 第 3 步：自动发现 ---------------- */}
      {step === 'discover' && (
        <>
          <section className="card">
            <h2>运行参数</h2>
            <p className="hint">
              发现任务在服务端运行，页面只是按间隔取状态——这就是「后台搜索不阻塞页面」的做法。
              超出候选上限或整批时限后，<strong>已完成并核验的结果照样保留</strong>，并列出未处理数量。
            </p>
            <dl className="facts compact">
              <div><dt>草稿</dt><dd>{draftId ? <><code>{draftId}</code> · 修订 {draftRevision ?? '?'}</> : <span className="muted">尚未保存到服务端</span>}</dd></div>
              <div><dt>节点 id</dt><dd>{nodeId ? <code>{nodeId}</code> : <span className="muted">还没填名称，因此还没有 id</span>}</dd></div>
              <div><dt>背景</dt><dd>{fields.background ? <code>{fields.background}</code> : <span className="muted">尚未选择（先在第 1 步选背景）</span>}</dd></div>
              <div><dt>本体版本</dt><dd>{ontology.data?.version ? <code>{ontology.data.version}</code> : <span className="muted">（未取到）</span>}</dd></div>
            </dl>
            <div className="authoring-budget">
              <label>候选上限<input type="number" min={1} value={budget.maxCandidates} onChange={(event) => setBudget({ ...budget, maxCandidates: Number(event.target.value) || 1 })} /></label>
              <label>单候选时限（ms）<input type="number" min={1} value={budget.perCandidateMs} onChange={(event) => setBudget({ ...budget, perCandidateMs: Number(event.target.value) || 1 })} /></label>
              <label>整批时限（ms）<input type="number" min={1} value={budget.totalMs} onChange={(event) => setBudget({ ...budget, totalMs: Number(event.target.value) || 1 })} /></label>
              <label>搜索深度<input type="number" min={1} value={budget.depth} onChange={(event) => setBudget({ ...budget, depth: Number(event.target.value) || 1 })} /></label>
              <label>搜索状态数<input type="number" min={1} value={budget.maxStates} onChange={(event) => setBudget({ ...budget, maxStates: Number(event.target.value) || 1 })} /></label>
            </div>
            {/* 禁用原因写成可见文字：窄屏与键盘用户看不到 title 里的 tooltip。 */}
            {discoveryBlockers.length > 0 && (
              <div className="authoring-blockers">
                <strong>还不能启动自动发现，缺这几样：</strong>
                <ul>{discoveryBlockers.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            )}
            <div className="card-actions">
              <button
                type="button"
                className="button primary"
                disabled={starting || discovery.polling || discoveryBlockers.length > 0}
                title={discoveryBlockers.length > 0 ? `还需要：${discoveryBlockers.join('；')}` : '启动一次自动发现'}
                onClick={startDiscovery}
              >
                {starting ? '正在启动…' : discovery.polling ? '任务运行中…' : '启动自动发现'}
              </button>
              {discovery.polling && <button type="button" className="button" onClick={stopDiscovery}>请求取消</button>}
            </div>
            {unsavedChanges && (
              <p className="error">
                本地改动还没有保存到服务端草稿。发现任务读的是<strong>服务端那一份</strong>，
                不先保存就会对着旧表达找关系——所以这里把启动挡住了。
              </p>
            )}
            {!draftId && <p className="muted">也可以只保存本地草稿继续填写：本地草稿不依赖服务端编写库。</p>}
            {run && (
              <p className="muted">
                运行 <code>{run.id}</code> · 状态 <strong>{run.status}</strong>
                {run.status === 'running' || run.status === 'queued' ? '（后台运行中，页面每 2.5 秒取一次状态）' : ''}
              </p>
            )}
            {runUnavailable && (
              <p className="error">
                启动失败：{runUnavailable.kind === 'module' ? '功能尚未就绪' : runUnavailable.message}
                {runUnavailable.specifier ? ` · 模块 ${runUnavailable.specifier}` : ''}
                {runUnavailable.reason ? ` · 原因：${runUnavailable.reason}` : ''}
                <br />这不是「没有找到关系」——是发现这件事本身还没法做。本地草稿与审阅记录都还在。
              </p>
            )}
            {runError && !runUnavailable && <p className="error">{runError}</p>}
            {discovery.error && <p className="muted">轮询提示：{discovery.error}</p>}
          </section>

          {run && (
            <section className="card">
              <h2>任务状态</h2>
              <p>
                任务 <code>{run.id}</code> · 状态 <strong>{run.status}</strong>
                {run.interrupted && <span className="muted">（服务重启中断；已核验结果保留）</span>}
              </p>
              <p className="muted">
                候选 {run.stats.candidates} · 覆盖节点 {run.stats.coveredNodes} · 已验证 {run.stats.verified} ·
                已反驳 {run.stats.refuted} · 未决 {run.stats.undecided} · 未处理 {run.stats.unprocessed} · 耗时 {run.stats.durationMs} ms
              </p>
              <div className="card-actions">
                <button type="button" className="button small" onClick={() => discovery.refresh()}>刷新任务状态</button>
                {run.candidates.length > 0 && <button type="button" className="button small primary" onClick={() => setStep('review')}>去审阅 {run.candidates.length} 条候选</button>}
              </div>
            </section>
          )}

          <div className="authoring-nav">
            <button type="button" className="button" onClick={() => setStep('check')}>上一步</button>
            <button type="button" className="button primary" onClick={() => setStep('review')}>下一步：审阅结果</button>
          </div>
        </>
      )}

      {/* ---------------- 第 4 步：审阅结果 ---------------- */}
      {step === 'review' && (
        <>
          <RelationReviewPanel
            run={run}
            candidates={candidates}
            decisions={decisions}
            onDecide={decide}
            onReplay={replay}
            replaying={replaying}
            replayResults={replayResults}
            runError={runError}
            polling={discovery.polling}
            exclusionNotes={exclusionNotes}
          />
          {staleDecisionCount > 0 && (
            <p className="muted">
              还有 {staleDecisionCount} 条审阅决策属于更早的运行结果，本次不计入入库范围
              （它们没有被删掉：换回那次运行的结果仍然能看到）。
            </p>
          )}
          <div className="authoring-nav">
            <button type="button" className="button" onClick={() => setStep('discover')}>上一步</button>
            <button type="button" className="button primary" onClick={() => setStep('preview')}>下一步：入库预览</button>
          </div>
        </>
      )}

      {/* ---------------- 第 5 步：入库预览 ---------------- */}
      {step === 'preview' && (
        <>
          <PublicationPreview
            part="preview"
            fields={fields}
            nodeRef={nodeRef}
            candidates={candidates}
            decisions={decisions}
            includeIds={includeIds}
            onToggleInclude={toggleInclude}
            preview={activePreview}
            previewLoading={previewLoading}
            previewUnavailable={previewUnavailable}
            previewError={previewError}
            onPreview={runPreview}
            draftId={draftId}
            draftRevision={draftRevision}
            ontologyVersion={ontology.data?.version ?? null}
            reviewDigestValue={digest}
            idempotencyKey={idempotency.current}
            acceptedCount={acceptedIds.length}
            dismissedCount={dismissedIds.length}
            validation={validation ? { ok: validation.ok, stale: validationStale } : null}
            unsavedChanges={unsavedChanges}
            exclusionNotes={exclusionNotes}
            publishing={publishing}
            publishUnavailable={publishUnavailable}
            publishError={publishError}
            publishOutcome={publishOutcome}
            onPublish={publish}
            revisions={revisions}
            revisionsLoading={revisionsLoading}
            revisionsUnavailable={revisionsUnavailable}
            revisionsProblems={revisionsProblems}
            revisionsRaw={revisionsRaw}
            activeRevision={activeRevision}
            revisionIntegrity={revisionIntegrity}
            onRollback={rollback}
            rollbackPending={rollbackPending}
            rollbackError={rollbackError}
            rollbackOutcome={rollbackOutcome}
            onGoReview={() => setStep('review')}
          />
          <div className="authoring-nav">
            <button type="button" className="button" onClick={() => setStep('review')}>上一步</button>
            <button type="button" className="button primary" onClick={() => setStep('publish')}>下一步：确认入库</button>
          </div>
        </>
      )}

      {/* ---------------- 第 6 步：确认入库与回滚 ---------------- */}
      {step === 'publish' && (
        <>
          <PublicationPreview
            part="publish"
            fields={fields}
            nodeRef={nodeRef}
            candidates={candidates}
            decisions={decisions}
            includeIds={includeIds}
            onToggleInclude={toggleInclude}
            preview={activePreview}
            previewLoading={previewLoading}
            previewUnavailable={previewUnavailable}
            previewError={previewError}
            onPreview={runPreview}
            draftId={draftId}
            draftRevision={draftRevision}
            ontologyVersion={ontology.data?.version ?? null}
            reviewDigestValue={digest}
            idempotencyKey={idempotency.current}
            acceptedCount={acceptedIds.length}
            dismissedCount={dismissedIds.length}
            validation={validation ? { ok: validation.ok, stale: validationStale } : null}
            unsavedChanges={unsavedChanges}
            exclusionNotes={exclusionNotes}
            publishing={publishing}
            publishUnavailable={publishUnavailable}
            publishError={publishError}
            publishOutcome={publishOutcome}
            onPublish={publish}
            revisions={revisions}
            revisionsLoading={revisionsLoading}
            revisionsUnavailable={revisionsUnavailable}
            revisionsProblems={revisionsProblems}
            revisionsRaw={revisionsRaw}
            activeRevision={activeRevision}
            revisionIntegrity={revisionIntegrity}
            onRollback={rollback}
            rollbackPending={rollbackPending}
            rollbackError={rollbackError}
            rollbackOutcome={rollbackOutcome}
            onGoReview={() => setStep('review')}
          />
          <div className="authoring-nav">
            <button type="button" className="button" onClick={() => setStep('preview')}>上一步</button>
            <Link className="button ghost" to="/network">去知识网络看公共图（入库前它不会变）</Link>
          </div>
        </>
      )}

      <section className="card authoring-boundaries">
        <h2>这一页写死的东西</h2>
        <ul>{FLOW_BOUNDARIES.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
    </div>
  );
}
