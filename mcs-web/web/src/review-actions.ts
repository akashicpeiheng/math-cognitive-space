import { api } from './api';

/**
 * 记录一次复习：写 kind=view + payload.context='review'。
 *
 * 语义边界：这只增加复习次数，不表示理解或掌握，也不写公共本体 M；
 * 站点没有到期日与间隔重复模型，因此文案一律用「回看」，不用「该复习了」。
 */
export async function recordReview(profileId: string, nodeId: string, ref = 'profile-review'): Promise<void> {
  await api(`/profiles/${profileId}/events`, {
    method: 'POST',
    body: {
      event: {
        eventId: `mcs:review:${nodeId}:${new Date().toISOString()}`,
        kind: 'view',
        nodeId,
        payload: { context: 'review', note: '学习者记录了一次回看；不表示理解或掌握。', evidence_status: 'ILLUSTRATION' },
        source: { kind: 'browser', ref },
      },
    },
  });
}
