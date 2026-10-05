import type { LearningCounts } from '../learning';

/**
 * 进度展示：只给可追溯的计数，不给百分比。
 *
 * 为什么不用进度条百分比：M 与 E 里没有校准过的认知模型，任何「你已经掌握 62%」
 * 都是编造。分段计数（已确认 / 已读未懂 / 只读过 / 没碰过）每一项都能追到具体事件。
 */
export function ProgressBar({ counts }: { counts: LearningCounts }) {
  return (
    <div className="progress">
      <dl className="progress-facts">
        <div><dt>已确认可用</dt><dd>{counts.confirmed}</dd></div>
        <div><dt>只读过</dt><dd>{counts.read - counts.readNotUnderstood}</dd></div>
        <div><dt>读过但没懂</dt><dd>{counts.readNotUnderstood}</dd></div>
        <div><dt>还没碰过</dt><dd>{counts.untouched}</dd></div>
      </dl>
      <p className="muted">
        登记节点共 {counts.total} 个。已读不等于已掌握；这里不给百分比，因为掌握程度没有被校准过。
      </p>
    </div>
  );
}
