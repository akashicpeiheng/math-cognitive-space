export class McsError extends Error {
  constructor(code, message, status = 400, details = undefined, retryable = false, recoverable = undefined) {
    super(message);
    this.name = 'McsError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.retryable = retryable;
    // 显式传入优先；否则按码查表（未登记的码**默认不可恢复**——不假装知道它能不能救）。
    this.recoverable = recoverable ?? isRecoverableCode(code);
  }
}

export const CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNKNOWN_NODE: 'UNKNOWN_NODE',
  UNKNOWN_ACTION: 'UNKNOWN_ACTION',
  UNKNOWN_EVIDENCE: 'UNKNOWN_EVIDENCE',
  UNKNOWN_PROFILE: 'UNKNOWN_PROFILE',
  UNKNOWN_SESSION: 'UNKNOWN_SESSION',
  UNKNOWN_LOCALIZATION: 'UNKNOWN_LOCALIZATION',
  CONFLICT: 'REVISION_CONFLICT',
  EVENT_ID_CONFLICT: 'EVENT_ID_CONFLICT',
  VERSION_CONFLICT: 'ONTOLOGY_VERSION_CONFLICT',
  ONTOLOGY_INVALID: 'ONTOLOGY_INVALID',
  /*
   * 扩展包完整性 / 合成失败（2026-10 加，P1-2）。
   *
   * 与 `ONTOLOGY_INVALID` 是两件事，不能合用一个码：
   * - `ONTOLOGY_INVALID` = **基础本体**坏了（仓库里的公共数据本身有问题）；
   * - `EXTENSION_INVALID` = 基础数据没问题，是**某个已发布内容包**对不上账
   *   （哈希不符、证书文件丢失、与基础数据冲突、合成后校验不过），或者它本该生效却没有生效。
   *
   * 分开的理由是可操作性：前者要修仓库数据，后者只要把包修好或换一份（回滚）；
   * 混成一个码，维护界面只能说「本体有问题」，说不到点子上。
   */
  EXTENSION_INVALID: 'EXTENSION_INVALID',
  EVIDENCE_UNSUPPORTED: 'EVIDENCE_UNSUPPORTED',
  EVIDENCE_FAILED: 'EVIDENCE_FAILED',
  EVIDENCE_RESOURCE: 'EVIDENCE_RESOURCE_EXHAUSTED',
  SEARCH_LIMIT: 'SEARCH_LIMIT',
  JOB_CANCELLED: 'JOB_CANCELLED',
  TUTOR_UNAVAILABLE: 'DEEPTUTOR_UNAVAILABLE',
  /*
   * 回合进行中连接断开：与「连不上」是两件事。
   *
   * 「连不上」= 请求根本没送出去，可以重试；「中途断了」= 模型可能已经在跑，
   * 正确处置是到原会话核对，而不是重发。旧版把两者都报成 DEEPTUTOR_UNAVAILABLE，
   * 等于把「不要重发」的情形说成「检查后端再试一次」。
   */
  TUTOR_INTERRUPTED: 'DEEPTUTOR_INTERRUPTED',
  TUTOR_AUTH_REQUIRED: 'DEEPTUTOR_AUTH_REQUIRED',
  TUTOR_LIVE_UNVERIFIED: 'DEEPTUTOR_LIVE_UNVERIFIED',
  IMPORT_INVALID: 'IMPORT_INVALID',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL: 'INTERNAL',
  /*
   * 账号与权限（2026-10 公网发布前加）。
   *
   * 分成五个码而不是一个「没权限」，因为它们要求用户做的事完全不同：
   * - `AUTH_REQUIRED`：去登录；
   * - `AUTH_REJECTED`：登录信息或验证链接不对，重新来一次；
   * - `FORBIDDEN`：身份没问题，但这个身份不该做这件事（登录也没用）；
   * - `CSRF_REJECTED`：页面状态过期，刷新重试；
   * - `RATE_LIMITED` / `RESOURCE_EXHAUSTED`：现在不行，等一会儿或等队排完。
   *
   * 「对象不存在」与「不属于你」一律返回 `NOT_FOUND`（404），见 `security-store.mjs`：
   * 用 403 区分「存在但不是你的」会变成档案 ID 的存在性探针。
   */
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_REJECTED: 'AUTH_REJECTED',
  AUTH_UNAVAILABLE: 'AUTH_UNAVAILABLE',
  FORBIDDEN: 'FORBIDDEN',
  CSRF_REJECTED: 'CSRF_REJECTED',
  RATE_LIMITED: 'RATE_LIMITED',
  RESOURCE_EXHAUSTED: 'RESOURCE_EXHAUSTED',
};


/**
 * 「可恢复」判据（2026-10 加，TODO A4-30）。
 *
 * 第三十四轮的边界：失败信封只有 `retryable`，而它回答的是「同一个请求再发一次会不会成功」，
 * 回答不了「我改点什么就能过」。两套集成（站内适配器与 mcs-bridge）都需要后者，
 * 否则调用方只能把一切当成同一类失败：`DEEPTUTOR_UNAVAILABLE` 与
 * 「预算给小了」在信封上长得一模一样。
 *
 * 这里把语义定死：
 * - `recoverable = true`：**换一个请求**（改参数、换节点、稍后再试）可能成功；
 * - `recoverable = false`：服务端状态或本体坏了，同一类请求都会失败，得先修数据/配置；
 * - `retryable` 保持原义：**同一请求**稍后重试可能成功（与 recoverable 正交）。
 *
 * 判据按错误码逐条给出（不靠前缀猜），桥接侧有一份同样的表，两边由测试对齐。
 */
export const RECOVERABLE_CODES = new Set([
  CODES.BAD_REQUEST,
  CODES.UNKNOWN_NODE,
  CODES.UNKNOWN_ACTION,
  CODES.UNKNOWN_EVIDENCE,
  CODES.UNKNOWN_PROFILE,
  CODES.UNKNOWN_SESSION,
  CODES.UNKNOWN_LOCALIZATION,
  CODES.CONFLICT,
  CODES.EVENT_ID_CONFLICT,
  CODES.VERSION_CONFLICT,
  CODES.EVIDENCE_RESOURCE,
  CODES.EVIDENCE_UNSUPPORTED,
  CODES.EVIDENCE_FAILED,
  CODES.SEARCH_LIMIT,
  CODES.JOB_CANCELLED,
  CODES.TUTOR_UNAVAILABLE,
  CODES.TUTOR_INTERRUPTED,
  CODES.TUTOR_AUTH_REQUIRED,
  CODES.TUTOR_LIVE_UNVERIFIED,
  CODES.IMPORT_INVALID,
  CODES.NOT_FOUND,
  /*
   * 账号类的「可恢复」按「换一个请求能不能过」判，不按「要不要重试」判：
   * 登录之后 `AUTH_REQUIRED` 就不再出现，刷新页面后 `CSRF_REJECTED` 就不再出现，
   * 等一会儿 `RATE_LIMITED` / `RESOURCE_EXHAUSTED` 就不再出现——都算可恢复。
   * `AUTH_REJECTED` 要换的是凭据或链接，也算换请求；只有 `FORBIDDEN` 换什么都没用。
   */
  CODES.AUTH_REQUIRED,
  CODES.AUTH_REJECTED,
  CODES.AUTH_UNAVAILABLE,
  CODES.CSRF_REJECTED,
  CODES.RATE_LIMITED,
  CODES.RESOURCE_EXHAUSTED,
]);

/**
 * 不可恢复的码：本体或证据链本身有问题，改请求没有用。
 * `EVIDENCE_UNSUPPORTED` / `EVIDENCE_FAILED` 说的是这份材料在当前状态下拿不出证据，
 * 换请求（换节点、换用法）确实可能拿到别的结果——因此它们**算可恢复**，放在上面那张表里。
 * 只有下面三条是「先修好服务端/数据再说」。
 */
export const UNRECOVERABLE_CODES = new Set([CODES.ONTOLOGY_INVALID, CODES.EXTENSION_INVALID, CODES.INTERNAL]);

export function isRecoverableCode(code) {
  if (UNRECOVERABLE_CODES.has(code)) return false;
  return RECOVERABLE_CODES.has(code);
}

export function isMcsError(value) {
  return value instanceof McsError;
}
