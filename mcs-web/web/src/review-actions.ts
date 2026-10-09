import { api } from './api';
import type { Locale } from './i18n/locales';

/**
 * 记录一次复习：写 kind=view + payload.context='review'。
 *
 * 语义边界：这只增加复习次数，不表示理解或掌握，也不写公共本体 M；
 * 站点没有到期日与间隔重复模型，因此文案一律用「回看」，不用「该复习了」。
 *
 * 语种（2026-10）：`payload.note` 是**自由文本注解**，读者就是当时当地的操作者，
 * 所以随界面语种；`eventId`、`kind`、`occurredAt`、`context`、`evidence_status`
 * 这些标识符与时刻**与语言无关**（中英档案因此可以互通）。`locale` 默认 `'zh'`，
 * 既有调用与中文站逐字不变。
 */
export async function recordReview(profileId: string, nodeId: string, ref = 'profile-review', locale: Locale = 'zh'): Promise<void> {
  const note = locale === 'en'
    ? 'The learner recorded one review; it does not mean understanding or mastery.'
    : '学习者记录了一次回看；不表示理解或掌握。';
  await api(`/profiles/${profileId}/events`, {
    method: 'POST',
    body: {
      event: {
        eventId: `mcs:review:${nodeId}:${new Date().toISOString()}`,
        kind: 'view',
        nodeId,
        payload: { context: 'review', note, evidence_status: 'ILLUSTRATION' },
        source: { kind: 'browser', ref },
      },
    },
  });
}
