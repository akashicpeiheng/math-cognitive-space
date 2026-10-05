import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

export function Markdown({ children, className = '' }: { children: string; className?: string }) {
  if (!children?.trim()) return null;
  return (
    <div className={`markdown ${className}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{
        children
      }</ReactMarkdown>
    </div>
  );
}
