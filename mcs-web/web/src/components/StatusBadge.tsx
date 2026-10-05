import { EVENT_KIND_LABELS, ACTION_MODE_LABELS } from '../labels';

const LABELS: Record<string, string> = {
  DEF: '定义',
  PROOF: '正文证明',
  REF: '引用',
  FINITE: '有限核验',
  ILLUSTRATION: '示例说明',
  'NOT-CLAIMED': '未声称',
  passed: '通过',
  failed: '失败',
  not_run: '未运行',
  unsupported: '不支持',
  resource_exhausted: '资源不足',
  corrupt: '损坏',
  Found: '可行',
  Conditional: '条件可行',
  InfeasibleWithinBound: '界内不可行',
  Unknown: '未知',
  known: '已知',
  unknown: '未知',
  computed: '已计算',
  incomplete: '形成条件未齐',
  rejected: '被拒绝',
  'well-formed': '良构',
  kept: '保持',
  conditional: '条件性',
  'not-claimed': '未声称',
  implemented: '已实现',
  partial: '部分实现',
  'interface-only': '仅接口',
  // 事件类型与行动模式混在 <StatusBadge> 里使用时，同样显示中文，避免出现
  // 与状态徽章同色的英文原值（例如 confirmation 与 passed 都渲染成绿色）。
  ...EVENT_KIND_LABELS,
  ...ACTION_MODE_LABELS,
};

function tone(status: string): string {
  if (['PROOF', 'FINITE', 'passed', 'Found', 'known', 'computed', 'well-formed', 'kept', 'implemented'].includes(status)) return 'ok';
  if (['failed', 'rejected', 'InfeasibleWithinBound', 'corrupt', 'unknown', 'Unknown', 'not-claimed', 'NOT-CLAIMED', 'unsupported', 'resource_exhausted', 'interface-only'].includes(status)) return 'warn';
  // not_run 是「尚未检查」而非「检查失败」；用红色会误导学习者以为出了问题。
  if (['Conditional', 'incomplete', 'partial', 'conditional', 'not_run', 'REF', 'ILLUSTRATION'].includes(status)) return 'mid';
  return 'neutral';
}

export function StatusBadge({ status, label, title }: { status: string; label?: string; title?: string }) {
  // 空白标签会让徽章只剩一个小圆点，学习者无法判断它表示什么；一律回退到原始状态值。
  const text = (label ?? LABELS[status] ?? status ?? '').trim() || status;
  return (
    <span className={`badge badge-${tone(status)}`} title={title ?? status} data-status={status}>
      <span className="badge-mark" aria-hidden="true" />
      {text}
    </span>
  );
}
