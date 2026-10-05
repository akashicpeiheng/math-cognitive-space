import { Markdown } from './Markdown';
import { formalFieldLabel } from '../labels';

/**
 * 形式负载的结构化渲染。
 *
 * 为什么要专门做这件事：`formal.predicate` 与 `formal.formula` 承载每个节点的核心数学
 * 定义（例如 ε–δ 的完整量词链），此前被 `JSON.stringify` 塞进 <code>，公式完全没有排版。
 * 这里改为：字符串走 Markdown（KaTeX），数组逐项渲染，对象逐键渲染；键名换成中文标签，
 * 未登记的键回退显示原键名，不隐藏、不合并。
 */

function hasContent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
}

/** 需要按数学排版的字段：这些字段的值本身就是公式。 */
const MATH_FIELDS = new Set(['predicate', 'formula']);

const CJK = /[\u4e00-\u9fff\u3400-\u4dbf]/;

/**
 * 判定一个字段值能否安全地整体包成 `$…$`。
 *
 * 已登记数据里 29 个 predicate/formula 全部没有写 `$…$` 分隔符，其中 21 个是纯公式。
 * 纯公式可以安全包裹；含中文的 8 个（例如「∀群 G ∃单同态 G→Perm(G)」）整体包裹会破坏
 * KaTeX 解析，因此保持普通文本，不猜测如何切分——那需要改公共内容，属另一项决定。
 */
export function mathWrappable(key: string, value: string): boolean {
  if (!MATH_FIELDS.has(key)) return false;
  if (value.includes('$')) return false;
  if (CJK.test(value)) return false;
  return /[=⇒⇔→∈∀∃∧⊂]/.test(value);
}

function mathSource(key: string, value: string): string {
  return mathWrappable(key, value) ? `$${value}$` : value;
}

function Scalar({ value, mathKey }: { value: unknown; mathKey?: string }) {
  if (typeof value === 'string') return <Markdown>{mathKey ? mathSource(mathKey, value) : value}</Markdown>;
  if (typeof value === 'number' || typeof value === 'boolean') return <code>{String(value)}</code>;
  // 无法安全排版的结构保留原始形式，但缩进后仍可读。
  return <pre className="formal-raw">{JSON.stringify(value, null, 2)}</pre>;
}

function EntryValue({ value, depth, mathKey }: { value: unknown; depth: number; mathKey?: string }) {
  if (Array.isArray(value)) {
    return (
      <ul className="formal-list">
        {value.map((item, index) => (
          <li key={index}>
            {depth >= 2 && item !== null && typeof item === 'object' ? (
              <NestedObject value={item as Record<string, unknown>} depth={depth} />
            ) : (
              <Scalar value={item} mathKey={mathKey} />
            )}
          </li>
        ))}
      </ul>
    );
  }
  if (value !== null && typeof value === 'object') {
    return <NestedObject value={value as Record<string, unknown>} depth={depth + 1} />;
  }
  return <Scalar value={value} mathKey={mathKey} />;
}

function NestedObject({ value, depth }: { value: Record<string, unknown>; depth: number }) {
  const entries = Object.entries(value).filter(([, item]) => hasContent(item));
  if (entries.length === 0) return <span className="muted">（空）</span>;
  return (
    <dl className="formal-nested">
      {entries.map(([key, item]) => (
        <div key={key}>
          <dt>{formalFieldLabel(key)}</dt>
          <dd><EntryValue value={item} depth={depth} mathKey={key} /></dd>
        </div>
      ))}
    </dl>
  );
}

export function FormalLoad({ formal }: { formal: Record<string, unknown> | undefined }) {
  const entries = Object.entries(formal ?? {}).filter(([, value]) => hasContent(value));
  if (entries.length === 0) return <p className="muted">本节点未登记形式负载。</p>;
  return (
    <dl className="facts formal-load">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt title={key}>{formalFieldLabel(key)}</dt>
          <dd><EntryValue value={value} depth={0} mathKey={key} /></dd>
        </div>
      ))}
    </dl>
  );
}
