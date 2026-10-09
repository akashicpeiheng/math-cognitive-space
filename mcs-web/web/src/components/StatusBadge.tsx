import { useI18n, useLabels } from '../i18n';
import { ACTION_MODE_LABELS, EVENT_KIND_LABELS } from '../labels';

/**
 * 徽章的显示名：**中英成对**，键是受控词表里的状态值（键本身永不翻译）。
 *
 * 2026-10 双语改造时这里修掉一个运行时缺陷：原来是
 * `const LABELS: Record<string, string> = { …状态…, ...EVENT_KIND_LABELS, ...ACTION_MODE_LABELS }`，
 * 而 `labels.ts` 的两张表已改成 `Record<string, { zh, en }>`——对象展开会丢掉索引签名，
 * 于是 `tsc` 不报错，运行时却把 `{ zh, en }` 整个对象交给 React 渲染（直接崩）。
 * 现在按语种显式取文本，中文一侧逐字与改造前相同。
 */
const STATUS_TEXT: Record<string, { zh: string; en: string }> = {
  DEF: { zh: '定义', en: 'Definition' },
  PROOF: { zh: '正文证明', en: 'Proof in the main text' },
  REF: { zh: '引用', en: 'Reference' },
  FINITE: { zh: '有限核验', en: 'Finite check' },
  ILLUSTRATION: { zh: '示例说明', en: 'Illustration' },
  'NOT-CLAIMED': { zh: '未声称', en: 'Not claimed' },
  passed: { zh: '通过', en: 'Passed' },
  failed: { zh: '失败', en: 'Failed' },
  not_run: { zh: '未运行', en: 'Not run' },
  unsupported: { zh: '不支持', en: 'Unsupported' },
  resource_exhausted: { zh: '资源不足', en: 'Resources exhausted' },
  corrupt: { zh: '损坏', en: 'Corrupt' },
  Found: { zh: '可行', en: 'Found' },
  Conditional: { zh: '条件可行', en: 'Conditional' },
  InfeasibleWithinBound: { zh: '界内不可行', en: 'Infeasible within bound' },
  Unknown: { zh: '未知', en: 'Unknown' },
  known: { zh: '已知', en: 'Known' },
  unknown: { zh: '未知', en: 'Unknown' },
  computed: { zh: '已计算', en: 'Computed' },
  incomplete: { zh: '形成条件未齐', en: 'Formation conditions not all met' },
  rejected: { zh: '被拒绝', en: 'Rejected' },
  'well-formed': { zh: '良构', en: 'Well formed' },
  kept: { zh: '保持', en: 'Kept' },
  conditional: { zh: '条件性', en: 'Conditional' },
  'not-claimed': { zh: '未声称', en: 'Not claimed' },
  implemented: { zh: '已实现', en: 'Implemented' },
  partial: { zh: '部分实现', en: 'Partially implemented' },
  'interface-only': { zh: '仅接口', en: 'Interface only' },
};

function tone(status: string): string {
  if (['PROOF', 'FINITE', 'passed', 'Found', 'known', 'computed', 'well-formed', 'kept', 'implemented'].includes(status)) return 'ok';
  if (['failed', 'rejected', 'InfeasibleWithinBound', 'corrupt', 'unknown', 'Unknown', 'not-claimed', 'NOT-CLAIMED', 'unsupported', 'resource_exhausted', 'interface-only'].includes(status)) return 'warn';
  // not_run 是「尚未检查」而非「检查失败」；用红色会误导学习者以为出了问题。
  if (['Conditional', 'incomplete', 'partial', 'conditional', 'not_run', 'REF', 'ILLUSTRATION'].includes(status)) return 'mid';
  return 'neutral';
}

export function StatusBadge({ status, label, title }: { status: string; label?: string; title?: string }) {
  const { locale } = useI18n();
  const labels = useLabels();
  /*
   * 事件类型与行动模式混在 <StatusBadge> 里使用时，同样按当前语种显示，
   * 避免出现与状态徽章同色的英文原值（例如 confirmation 与 passed 都渲染成绿色）。
   */
  const own = STATUS_TEXT[status];
  const known = own
    ? (own[locale] ?? own.zh)
    : status in EVENT_KIND_LABELS
      ? labels.eventKindLabel(status)
      : status in ACTION_MODE_LABELS
        ? labels.actionModeLabel(status)
        : '';
  // 空白标签会让徽章只剩一个小圆点，学习者无法判断它表示什么；一律回退到原始状态值。
  const text = (label ?? known ?? status ?? '').trim() || status;
  return (
    <span className={`badge badge-${tone(status)}`} title={title ?? status} data-status={status}>
      <span className="badge-mark" aria-hidden="true" />
      {text}
    </span>
  );
}
