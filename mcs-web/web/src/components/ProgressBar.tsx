import { useI18n } from '../i18n';
import type { LearningCounts } from '../learning';

/**
 * 进度展示：只给可追溯的计数，不给百分比。
 *
 * 为什么不用进度条百分比：M 与 E 里没有校准过的认知模型，任何「你已经掌握 62%」
 * 都是编造。分段计数（已确认 / 已读未懂 / 只读过 / 没碰过）每一项都能追到具体事件。
 *
 * 双语（2026-10）：文案在下面 `COPY` 里成对写，中文一侧与改造前**逐字相同**
 * （`tests/browser.mjs` 直接读 `.progress-facts` 的 `innerText`，行序与文本都不能动）。
 */

const COPY = {
  zh: {
    confirmed: '已确认可用',
    readOnly: '只读过',
    readNotUnderstood: '读过但没懂',
    untouched: '还没碰过',
    note: (total: number) => `登记节点共 ${total} 个。已读不等于已掌握；这里不给百分比，因为掌握程度没有被校准过。`,
  },
  en: {
    confirmed: 'Confirmed usable',
    readOnly: 'Read only',
    readNotUnderstood: 'Read but not understood',
    untouched: 'Not touched yet',
    note: (total: number) => `${total} nodes are registered in total. Read is not the same as mastered; no percentage is shown here because the degree of mastery has not been calibrated.`,
  },
} as const;

export function ProgressBar({ counts }: { counts: LearningCounts }) {
  const { locale } = useI18n();
  const text = COPY[locale];
  return (
    <div className="progress">
      <dl className="progress-facts">
        <div><dt>{text.confirmed}</dt><dd>{counts.confirmed}</dd></div>
        <div><dt>{text.readOnly}</dt><dd>{counts.read - counts.readNotUnderstood}</dd></div>
        <div><dt>{text.readNotUnderstood}</dt><dd>{counts.readNotUnderstood}</dd></div>
        <div><dt>{text.untouched}</dt><dd>{counts.untouched}</dd></div>
      </dl>
      <p className="muted">{text.note(counts.total)}</p>
    </div>
  );
}
