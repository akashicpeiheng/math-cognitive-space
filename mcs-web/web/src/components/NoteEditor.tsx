import { useState } from 'react';
import { ApiError, api, formatError } from '../api';
import { clearNoteDraft, readNoteDraft, writeNoteDraft } from '../drafts';

/**
 * 个人笔记编辑器。
 *
 * 归属安全：本组件由父级用 `key={档案 + 节点}` 强制重挂载，因此状态天然属于一个档案的一个节点；
 * 提交时携带的 nodeId / profileId 也是重挂载时捕获的 props，不会被之后切换的节点改写。
 * 内容在每次输入时写入按「档案 + 节点」隔离的本机草稿，切换节点或档案后回来仍能看到未提交的文字。
 * 草稿不是 E 事件：只有点「保存笔记」才写入外部模型。
 */
export function NoteEditor({
  profileId,
  nodeId,
  baseRevision,
  onSaved,
  onNotice,
}: {
  profileId: string;
  nodeId: string;
  baseRevision: number | null;
  onSaved: () => Promise<void> | void;
  onNotice: (message: string) => void;
}) {
  const restored = readNoteDraft(profileId, nodeId);
  const [title, setTitle] = useState(restored?.title ?? '回看问题');
  const [body, setBody] = useState(restored?.body ?? '');
  const [draftAt, setDraftAt] = useState(restored?.updatedAt ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function update(next: { title?: string; body?: string }) {
    const nextTitle = next.title ?? title;
    const nextBody = next.body ?? body;
    setTitle(nextTitle);
    setBody(nextBody);
    const stamp = new Date().toISOString();
    setDraftAt(stamp);
    writeNoteDraft(profileId, nodeId, { title: nextTitle, body: nextBody, updatedAt: stamp });
  }

  async function save() {
    if (!body.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await api(`/profiles/${profileId}/notes`, {
        method: 'POST',
        body: { title, body, nodeId, baseRevision: baseRevision ?? null },
      });
      // 只有写在同一「档案 + 节点」下的草稿才随保存清掉；组件重挂载后不会碰到别的节点。
      clearNoteDraft(profileId, nodeId);
      setBody('');
      setDraftAt('');
      onNotice('个人笔记已写入外部模型 E；公共本体 M 未改变。');
      await onSaved();
    } catch (reason) {
      /*
       * 修订冲突（409）要能自愈（2026-10 修）。
       *
       * `baseRevision` 来自父级捕获的 `profile.revision`：另一个标签页写入事件之后
       * 它就成了旧值，于是保存一直 409；而 `refreshProfiles()` 从前只在**成功**后调用，
       * 失败路径不刷新修订号——用户不手动刷新页面就永远存不上。
       */
      const conflict = reason instanceof ApiError && (reason.status === 409 || reason.code === 'REVISION_CONFLICT');
      if (conflict) {
        try { await onSaved(); } catch { /* 刷新失败不掩盖原始冲突 */ }
        setError(`${formatError(reason)}　已重新读取档案修订号，请再点一次「保存笔记」。`);
      } else {
        setError(formatError(reason));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="note-editor">
      <input value={title} onChange={(event) => update({ title: event.target.value })} placeholder="标题" />
      <textarea
        value={body}
        onChange={(event) => update({ body: event.target.value })}
        placeholder="用自己的话重写；记录当时的错误路径与检验手段。"
        rows={5}
      />
      <div className="note-editor-actions">
        <button className="button primary" disabled={busy || !body.trim()} onClick={save}>
          {busy ? '保存中…' : '保存笔记'}
        </button>
        <span className="draft-note" role="status">
          {draftAt
            ? `草稿已自动存在本机（${new Date(draftAt).toLocaleTimeString('zh-CN')}），保存后才写入 E。`
            : '输入时自动暂存在本机，点保存才写入 E。'}
        </span>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
