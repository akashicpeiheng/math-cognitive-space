import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { useI18n } from '../i18n';

/** 站内绝对路径：`/nodes/…` 是，`//host/…` 与 `https://…` 不是。 */
const INTERNAL_PATH = /^\/(?!\/)/;

/**
 * 正文链接的语种前缀。
 *
 * 为什么必须在这里做：正文 Markdown 由服务端按 `?locale=` 下发，里面的站内链接
 * （`/nodes/<id>`，由生成器把 `[[wiki 链接]]` 改写而来）**不带语种前缀**。
 * 英文站的正文里点这样一条链接会掉回中文站——`Link` 组件管不到 Markdown 内部的原生 `<a>`。
 *
 * 只改站内绝对路径：外链、`mailto:`、`#锚点` 原样返回（`withLocale` 里也有同样的判断），
 * 中文站上 `hrefFor()` 返回的路径与从前逐字相同，所以中文渲染不受影响。
 */
function localizeHref(href: string | undefined, hrefFor: (to: string) => string): string | undefined {
  if (typeof href !== 'string' || !INTERNAL_PATH.test(href)) return href;
  return hrefFor(href);
}

/**
 * Markdown 正文渲染。
 *
 * 除了排版（GFM + KaTeX），它还负责一件与语种有关的事：把**正文里的站内链接**套上
 * 当前语种前缀。正文本身是本体文本，按 `?locale=` 由服务端下发，这一层不做翻译。
 */
export function Markdown({ children, className = '' }: { children: string; className?: string }) {
  const { hrefFor } = useI18n();
  const components = useMemo<Components>(() => ({
    a: ({ node: _node, href, children: linkChildren, ...rest }) => (
      <a {...rest} href={localizeHref(href, hrefFor)}>{linkChildren}</a>
    ),
  }), [hrefFor]);

  if (!children?.trim()) return null;
  return (
    <div className={`markdown ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >{
        children
      }</ReactMarkdown>
    </div>
  );
}
