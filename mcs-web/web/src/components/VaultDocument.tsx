import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useLocation } from 'react-router-dom';
import { useI18n } from '../i18n';
import { formatError } from '../api';
import { readVaultFile } from '../vault-cloud';
import { parseVaultNote, resolveVaultLink, vaultAnchor } from '../../../shared/vault.mjs';
import type { Vault, VaultFile, VaultLink } from '../../../shared/vault.mjs';

export type VaultFileReader = (vault: Vault, file: VaultFile, signal?: AbortSignal) => Promise<Blob>;
interface Props { vault: Vault; file: VaultFile; onOpen: (file: VaultFile, fragment?: string) => void; trail?: string[]; markdown?: string; readFile?: VaultFileReader }
interface MarkdownTree { type: string; value?: string; children?: MarkdownTree[]; data?: { hProperties?: Record<string, string> } }
const nodeText = (node: MarkdownTree): string => node.value ?? node.children?.map(nodeText).join('') ?? '';
function anchors() {
  return (tree: MarkdownTree) => {
    const walk = (node: MarkdownTree) => {
      if (node.type === 'heading') node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id: vaultAnchor(nodeText(node)) } };
      if (node.type === 'paragraph' && node.children?.length) {
        for (const child of node.children) {
          if (child.type !== 'text') continue;
          const block = child.value?.match(/(?:^|[ \t])\^([\w-]+)(?=[ \t]*(?:\r?\n|$))/);
          if (block) {
            child.value = child.value!.slice(0, block.index) + child.value!.slice(block.index! + block[0].length);
            node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id: 'block-' + block[1] } }; break;
          }
        }
      }
      node.children?.forEach(walk);
    }; walk(tree);
  };
}
export function VaultAttachment({ vault, file, readFile = readVaultFile }: { vault: Vault; file: VaultFile; readFile?: VaultFileReader }) {
  const { pick } = useI18n();
  const [localUrl, setUrl] = useState<{ key: string; url: string } | null>(null), [error, setError] = useState<string | null>(null);
  const key = `${vault.storage}:${vault.id}:${vault.revision}:${file.sha256}`;
  useEffect(() => {
    if (vault.storage !== 'browser') return;
    let active = true, url: string | null = null; setError(null);
    void readFile(vault, file).then(blob => { if (!active) return; url = URL.createObjectURL(new Blob([blob], { type: file.mime })); setUrl({ key, url }); }).catch(e => { if (active) setError(formatError(e)); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [key, readFile]);
  const url = vault.storage === 'account' ? `/api/v2/me/vaults/${encodeURIComponent(vault.id)}/files/${encodeURIComponent(file.id)}?revision=${vault.revision}` : localUrl?.key === key ? localUrl.url : null;
  if (!url) return error ? <span className="error" role="alert">{error}</span> : <span role="status">{pick({ zh: '读取附件…', en: 'Loading attachment…' })}</span>;
  return <span className="vault-attachment">
    {error && <span className="error">{error}</span>}
    {file.mime.startsWith('image/') && <img src={url} alt={file.path.split('/').pop()} loading="lazy" onError={() => setError(pick({ zh: '浏览器无法显示此图片，请下载后打开。', en: 'This browser cannot display the image. Download it to open it.' }))} />}
    {file.mime.startsWith('audio/') && <audio controls preload="metadata" src={url} onError={() => setError(pick({ zh: '浏览器无法播放此音频，请下载后打开。', en: 'This browser cannot play the audio. Download it to open it.' }))} />}
    {file.mime.startsWith('video/') && <video controls preload="metadata" src={url} onError={() => setError(pick({ zh: '浏览器无法播放此视频，请下载后打开。', en: 'This browser cannot play the video. Download it to open it.' }))} />}
    <a href={url} target="_blank" rel="noreferrer">{file.path.split('/').pop()}</a>{' '}
    <a href={vault.storage === 'account' ? url + '&download=1' : url} download={file.path.split('/').pop()}>{pick({ zh: '下载', en: 'Download' })}</a>
  </span>;
}
export function VaultDocument({ vault, file, onOpen, trail = [], markdown, readFile = readVaultFile }: Props) {
  const { pick } = useI18n();
  const location = useLocation();
  const [loaded, setLoaded] = useState<{ key: string; body: string } | null>(null), [error, setError] = useState<string | null>(null);
  const key = `${vault.storage}:${vault.id}:${vault.revision}:${file.sha256}`;
  const live = markdown !== undefined;
  useEffect(() => {
    if (live) return;
    const controller = new AbortController(); let active = true; setError(null);
    void readFile(vault, file, controller.signal).then(blob => blob.text()).then(body => { if (active) setLoaded({ key, body }); }).catch(e => { if (active && !controller.signal.aborted) setError(formatError(e)); });
    return () => { active = false; controller.abort(); };
  }, [key, live, readFile]);
  const parsed = useMemo(() => markdown !== undefined ? parseVaultNote(markdown, file.path) : loaded?.key === key ? parseVaultNote(loaded.body, file.path) : null, [loaded, key, file.path, markdown]);
  useEffect(() => {
    if (!parsed || !location.hash || trail.length) return;
    let id: string; try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const frame = requestAnimationFrame(() => window.document.getElementById(id)?.scrollIntoView({ block: 'center' }));
    return () => cancelAnimationFrame(frame);
  }, [parsed, location.hash]);
  const document = useMemo(() => {
    if (!parsed) return '';
    let body = '', at = 0;
    parsed.links.forEach((link, index) => {
      body += parsed.body.slice(at, link.offset);
      const label = (link.label || link.target || link.fragment || file.title || file.path).replace(/[\[\]\\]/g, '\\$&');
      body += `[${label}](#vault-link-${index})`; at = link.offset + link.raw.length;
    });
    return body + parsed.body.slice(at);
  }, [parsed, file.title, file.path]);
  const components = useMemo<Components>(() => ({
    a: ({ node: _node, href, children, ...rest }) => {
      const token = href?.match(/^#vault-link-(\d+)$/), link = token && parsed?.links[Number(token[1])];
      if (!link) return <a {...rest} href={href} rel="noreferrer">{children}</a>;
      const matches = resolveVaultLink(vault.files, file.path, link);
      if (!matches.length) return <span className="vault-missing">{children} ({pick({ zh: '文件未导入或不存在', en: 'file missing or not imported' })})</span>;
      if (matches.length > 1) return <span className="vault-ambiguous">{children} — {pick({ zh: '请选择', en: 'choose' })}: {matches.map(f => <button className="link-button" key={f.id} onClick={() => onOpen(f, link.fragment)}>{f.path}</button>)}</span>;
      const target = matches[0];
      if (target.kind === 'attachment') return <VaultAttachment key={target.sha256} vault={vault} file={target} readFile={readFile} />;
      return <a href={`?vault=${encodeURIComponent(vault.id)}&storage=${vault.storage}&note=${encodeURIComponent(target.id)}${link.fragment ? '#' + encodeURIComponent(vaultAnchor(link.fragment)) : ''}`} onClick={event => { event.preventDefault(); onOpen(target, link.fragment); }}>{children}</a>;
    },
  }), [vault, file.path, parsed, onOpen, pick, readFile]);
  if (error && !live) return <p className="error" role="alert">{error}</p>;
  if (!parsed) return <p role="status">{pick({ zh: '读取笔记…', en: 'Loading note…' })}</p>;
  const embeds: Array<{ link: VaultLink; file: VaultFile }> = parsed.links.filter(l => l.embed).flatMap(link => { const matches = resolveVaultLink(vault.files, file.path, link); return matches.length === 1 && matches[0].kind === 'note' ? [{ link, file: matches[0] }] : []; });
  return <div className="vault-document markdown">
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath, anchors]} rehypePlugins={[rehypeKatex]} components={components}>{document}</ReactMarkdown>
    {embeds.map(({ file: target, link }, i) => <section className="vault-embed" key={`${target.id}:${i}`}>
      <button className="link-button" onClick={() => onOpen(target, link.fragment)}>{pick({ zh: '嵌入笔记：', en: 'Embedded note: ' })}{target.title ?? target.path}</button>
      {trail.includes(target.id) || target.id === file.id || trail.length >= 2
        ? <p className="muted">{pick({ zh: '循环引用或已到展开上限，可点击标题继续阅读。', en: 'Circular reference or expansion limit reached. Open the title to continue.' })}</p>
        : <VaultDocument vault={vault} file={target} onOpen={onOpen} trail={[...trail, file.id]} readFile={readFile} />}
    </section>)}
  </div>;
}
