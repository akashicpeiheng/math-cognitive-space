import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useMasterMode } from '../master-mode';
import { Markdown } from './Markdown';
import type { MasterExpression, MasterView } from '../../../shared/master-view.mjs';

export function ReadingModeSwitch() {
  const { mode, setMode } = useMasterMode(), { pick } = useI18n();
  return <div className="reading-mode-picker"><label htmlFor="reading-mode-select">{pick({ zh:'阅读', en:'Reading' })}</label>
    <select id="reading-mode-select" value={mode} onChange={event => setMode(event.target.value === 'master' ? 'master' : 'normal')}>
      <option value="normal">{pick({ zh:'普通', en:'Normal' })}</option><option value="master">Master</option>
    </select>
  </div>;
}

export function IntuitionTip({ text, contentLocale }: { text:string; contentLocale?:string }) {
  const { pick, locale } = useI18n(), id = useId(), button = useRef<HTMLButtonElement>(null), popup = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false), [position, setPosition] = useState({ left:8, top:8 });
  const cancelClose = () => { if (timer.current) clearTimeout(timer.current); };
  const closeLater = () => { cancelClose(); timer.current = setTimeout(() => setOpen(false), 150); };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const place = () => {
      const box = button.current!.getBoundingClientRect(), width = Math.min(340, window.innerWidth - 16), height = popup.current?.offsetHeight ?? 80;
      const top = box.bottom + height + 12 <= window.innerHeight ? box.bottom + 6 : Math.max(8, box.top - height - 6);
      setPosition({ left:Math.max(8, Math.min(box.left, window.innerWidth - width - 8)), top });
    };
    place(); window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, text]);
  useEffect(() => {
    if (!open) return;
    const key = (event:KeyboardEvent) => { if (event.key === 'Escape') { cancelClose(); setOpen(false); } };
    const outside = (event:PointerEvent) => { if (!button.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('keydown', key); document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', outside); };
  }, [open]);
  if (!text) return null;
  return <>
    <button ref={button} type="button" className="master-intuition-trigger" aria-label={pick({ zh:'一句直觉', en:'One-line intuition' })} aria-expanded={open} aria-describedby={open ? id : undefined}
      onPointerEnter={event => { if (event.pointerType !== 'touch') { cancelClose(); setOpen(true); } }} onPointerLeave={closeLater}
      onFocus={event => { if (event.currentTarget.matches(':focus-visible')) { cancelClose(); setOpen(true); } }} onBlur={closeLater}
      onClick={event => { event.preventDefault(); event.stopPropagation(); cancelClose(); setOpen(value => !value); }}>i</button>
    {open && createPortal(<div ref={popup} id={id} role="tooltip" className="master-intuition-tooltip" style={position} onPointerEnter={cancelClose} onPointerLeave={closeLater}>
      {locale === 'en' && contentLocale === 'zh' && <small>{pick({ zh:'尚未翻译', en:'Not yet translated' })}</small>}<Markdown>{text}</Markdown>
    </div>, document.body)}
  </>;
}

function Expression({ item, prefix, parentStatus }: { item:MasterExpression; prefix:string; parentStatus?:string }) {
  const { locale, pick } = useI18n();
  const pending = locale === 'en' && (item.locale === 'zh' || /[\u3400-\u9fff]/u.test(item.markdown));
  return <div className={`master-expression${pending ? ' i18n-pending' : ''}`} id={item.id ? `${prefix}${item.id}` : undefined}>
    {item.conditions?.length ? <div className="master-expression-conditions">{item.conditions.map(condition => <Markdown key={condition}>{condition}</Markdown>)}</div> : null}
    {item.title ? <span className="master-expression-title">{item.title}</span> : null}
    <Markdown>{item.markdown}</Markdown>
    {item.status && item.status !== parentStatus ? <small className="master-evidence" title={pending ? pick({ zh:'尚未翻译', en:'Not yet translated' }) : undefined}>{item.status}</small> : null}
  </div>;
}

/** The same renderer serves details, list previews and network hover panels. */
export function MasterContent({ view, compact = false, nested = false }: { view:MasterView; compact?:boolean; nested?:boolean }) {
  const { pick, hrefFor, locale } = useI18n(), id = useId();
  const pending = locale === 'en' && view.contentLocale === 'zh';
  return <div className={`master-content${compact ? ' is-compact' : ''}`} data-master-content={view.id}>
    <div className="master-content-meta"><small className="master-evidence">{view.status}</small>
      {view.completeness === 'partial' ? <small className="master-gap" title={view.gaps.join('\n')}>{pick({ zh:'登记摘要 · 待核验', en:'Registered summary · review pending' })}</small> : null}
      {pending ? <small className="i18n-pending-note">{pick({ zh:'尚未翻译', en:'Not yet translated' })}</small> : null}
      <IntuitionTip text={view.intuition} contentLocale={view.intuitionLocale}/>
    </div>
    {view.context.length ? <div className="master-context">{view.context.map((line, index) => <Markdown key={`${index}:${line}`}>{line}</Markdown>)}</div> : null}
    {view.expressions.map((item, index) => <Expression key={`${index}:${item.markdown}`} item={item} parentStatus={view.status} prefix={nested || compact ? `${id}-` : ''}/>)}
    {!compact && view.equivalents.length ? <div className="master-equivalents"><h2>{pick({ zh:'等价表达', en:'Equivalent forms' })}</h2>{view.equivalents.map((item, index) => <Expression key={index} item={item} parentStatus={view.status} prefix={`${id}-eq-`}/>)}</div> : null}
    {!compact && view.variants.length ? <div className="master-variants">{view.variants.map(variant => <section key={`${variant.id}:${variant.anchor ?? '$'}`} className="master-variant">
      <h2>{variant.title} <small>{variant.id}{variant.anchor && variant.anchor !== '$' ? `#${variant.anchor}` : ''}</small></h2><MasterContent view={variant} nested/>
    </section>)}</div> : null}
    {!compact && view.gaps.some(gap => !/^(登记摘要；|Registered specification;)/.test(gap)) ? <p className="master-gap">{view.gaps.filter(gap => !/^(登记摘要；|Registered specification;)/.test(gap)).join(' · ')}</p> : null}
    {!compact && view.references.length ? <nav className="master-reference-links" aria-label={pick({ zh:'对象跳转', en:'Object links' })}>{view.references.map((ref, index) => <Link key={`${ref.id}:${ref.anchor}:${index}`} to={hrefFor(ref.href)}>{ref.title}{ref.anchor && ref.anchor !== '$' ? ` · ${ref.anchor}` : ''}</Link>)}</nav> : null}
    {!compact && view.sources.length ? <details className="master-sources"><summary>{pick({ zh:'来源', en:'Sources' })}</summary><ul>{view.sources.map((source, index) => <li key={index}>{source}</li>)}</ul></details> : null}
  </div>;
}
