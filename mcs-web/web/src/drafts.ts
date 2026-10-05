/**
 * 本机草稿存储：笔记与自检作答按「档案 + 节点」隔离。
 *
 * 为什么需要它：
 * - 学习者在节点页写下的笔记或作答尚未提交时切换节点，旧实现把输入框状态留在组件里，
 *   切换到下一个节点后内容仍在，点保存就会把上一个节点的文字写到新节点名下。
 * - 草稿因此必须有明确的归属键（档案 + 节点），并按该键恢复与清除。
 *
 * 存储边界：草稿只留在浏览器本机（localStorage），不是 E 事件，也不进入公共本体 M；
 * 浏览、切节点、改档案都不会把草稿变成学习记录。
 * 隐私模式或配额满时写入失败，草稿功能退化为「本次会话仍可用、刷新后丢失」，不抛出。
 */

const PREFIX = 'mcs-draft-v1';

export interface NoteDraft {
  title: string;
  body: string;
  /** ISO 时间戳，仅用于让界面说明「草稿保存于…」。 */
  updatedAt: string;
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function noteKey(profileId: string, nodeId: string): string {
  return `${PREFIX}:note:${profileId}:${nodeId}`;
}

function answerKey(profileId: string, nodeId: string): string {
  return `${PREFIX}:answer:${profileId}:${nodeId}`;
}

export function readNoteDraft(profileId: string | null, nodeId: string): NoteDraft | null {
  if (!profileId) return null;
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(noteKey(profileId, nodeId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const value = parsed as Partial<NoteDraft>;
    if (typeof value.title !== 'string' || typeof value.body !== 'string') return null;
    return { title: value.title, body: value.body, updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '' };
  } catch {
    return null;
  }
}

export function writeNoteDraft(profileId: string | null, nodeId: string, draft: NoteDraft): void {
  if (!profileId) return;
  const store = storage();
  if (!store) return;
  try {
    if (!draft.body.trim() && !draft.title.trim()) store.removeItem(noteKey(profileId, nodeId));
    else store.setItem(noteKey(profileId, nodeId), JSON.stringify(draft));
  } catch { /* 隐私模式或配额满：草稿丢失不阻断写作 */ }
}

export function clearNoteDraft(profileId: string | null, nodeId: string): void {
  if (!profileId) return;
  const store = storage();
  if (!store) return;
  try { store.removeItem(noteKey(profileId, nodeId)); } catch { /* 同上 */ }
}

export function readAnswerDrafts(profileId: string | null, nodeId: string): Record<string, string> {
  if (!profileId) return {};
  const store = storage();
  if (!store) return {};
  try {
    const raw = store.getItem(answerKey(profileId, nodeId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const clean: Record<string, string> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string') clean[id] = value;
    }
    return clean;
  } catch {
    return {};
  }
}

export function writeAnswerDrafts(profileId: string | null, nodeId: string, answers: Record<string, string>): void {
  if (!profileId) return;
  const store = storage();
  if (!store) return;
  const kept: Record<string, string> = {};
  for (const [id, value] of Object.entries(answers)) if (value.trim()) kept[id] = value;
  try {
    if (Object.keys(kept).length === 0) store.removeItem(answerKey(profileId, nodeId));
    else store.setItem(answerKey(profileId, nodeId), JSON.stringify(kept));
  } catch { /* 同上 */ }
}

export function clearAnswerDraft(profileId: string | null, nodeId: string, checkId: string): void {
  const current = readAnswerDrafts(profileId, nodeId);
  delete current[checkId];
  writeAnswerDrafts(profileId, nodeId, current);
}
