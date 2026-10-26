import { MASTER_CONTENT_VERSION, MASTER_OVERRIDES, MASTER_INTUITIONS, MASTER_BOUNDARY_SELECTIONS, MASTER_CONTEXT_ADDITIONS, MASTER_REDUNDANT_REGISTRATIONS, MASTER_OBJECT_PRESENTATIONS, MASTER_OBJECT_INTUITIONS, MASTER_SECTION_SELECTIONS } from '../data/master-content.mjs';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { math } from 'micromark-extension-math';
import { mathFromMarkdown } from 'mdast-util-math';
export { MASTER_CONTENT_VERSION };
const uniq = values => [...new Set(values.filter(v => typeof v === 'string' && v.trim()).map(v => v.trim()))];
const list = value => Array.isArray(value) ? value : value ? [value] : [];
const text = value => typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value);
const lines = value => list(value).map(text).filter(Boolean);
const pair = (value, locale) => typeof value === 'string' ? value : value?.[locale] ?? value?.zh ?? '';
const lang = text => /[\u3400-\u9fff]/u.test(text) ? 'zh' : 'en';
const nodeHref = id => `/nodes/${encodeURIComponent(id)}`;
const objectHref = (id, anchor = '$') => `/objects/${encodeURIComponent(id)}${anchor === '$' ? '' : `#${encodeURIComponent(anchor)}`}`;
const expression = (markdown, source, extra = {}) => ({ markdown, source, ...extra });
const formula = statement => expression(`$$\n${statement.tex}\n$$`, 'formalStatement.tex', { status: statement.label });
const astText = node => node.value ?? node.children?.map(astText).join('') ?? '';
function intuitionSentence(value) {
  if (!value) return '';
  const tree = fromMarkdown(value, { extensions:[math()], mdastExtensions:[mathFromMarkdown()] }), protectedRanges = [];
  const visit = node => {
    if (['inlineMath','math','inlineCode','code'].includes(node.type)) protectedRanges.push([node.position.start.offset, node.position.end.offset]);
    else node.children?.forEach(visit);
  };
  visit(tree);
  // Keep a whole sentence, including all math delimiters. No character quota.
  for (let i = 0; i < value.length; i++) {
    if (protectedRanges.some(([start,end]) => start <= i && i < end)) continue;
    if (/[。！？]/u.test(value[i]) || (/[.!?]/u.test(value[i]) && (i + 1 === value.length || /\s/u.test(value[i+1])))) return value.slice(0, i + 1).trim();
  }
  return value.trim();
}
function selectedSections(node) {
  const selection = MASTER_SECTION_SELECTIONS[node.id], markdown = node.contentMarkdown;
  if (!selection || !markdown) return { formal: [], equivalents: [] };
  // Find heading boundaries before enabling math. Some legacy display equations
  // have a closing $$ on the same line as TeX: the math parser can otherwise
  // swallow later teaching headings into an unterminated equation.
  const tree = fromMarkdown(markdown);
  const sections = [];
  for (let i = 0; i < tree.children.length; i++) {
    const heading = tree.children[i];
    if (heading.type !== 'heading') continue;
    let end = i + 1;
    while (end < tree.children.length && tree.children[end].type !== 'heading') end++;
    const body = markdown.slice(heading.position.end.offset, tree.children[end]?.position.start.offset ?? markdown.length);
    const parsed = fromMarkdown(body, { extensions:[math()], mdastExtensions:[mathFromMarkdown()] });
    sections.push({ title:astText(heading), body, blocks:parsed.children });
  }
  const source = (section, block) => section.body.slice(block.position.start.offset, block.position.end.offset);
  const formal = sections.filter(s => selection.formal.includes(s.title)).flatMap(s => s.blocks
    .filter(b => b.type !== 'paragraph' || !/^一句自然语言重述/.test(astText(b)))
    .map(b => ({ text:source(s, b), heading:s.title })));
  // Only explicitly labelled equivalent list items are taken from the mixed
  // "equivalents and category" section; category/analogy bullets stay out.
  const equivalents = sections.filter(s => selection.equivalents.includes(s.title)).flatMap(s => s.blocks
    .filter(b => b.type === 'list').flatMap(b => b.children)
    .filter(b => /^等价表达[：:]/.test(astText(b)))
    .map(b => ({ text:source(s, b).replace(/^[-*+]\s*/, ''), heading:s.title })));
  return { formal, equivalents };
}
function base(record, options) {
  const locale = options.locale ?? 'zh';
  return { schema: 'mcs-master-view/1', version: MASTER_CONTENT_VERSION, sourceVersion: options.sourceVersion ?? record.version ?? '', locale, contentLocale: locale,
    id: record.id, title: record.title, context: [], expressions: [], equivalents: [], intuition: '', intuitionLocale: locale,
    status: record.teaching?.evidenceStatus ?? record.formalStatement?.label ?? 'NOT-CLAIMED', sources: [...(record.provenance?.sources ?? [])],
    completeness: 'registered', gaps: [], references: [], variants: [] };
}
function finish(view) {
  view.context = uniq(view.context);
  view.sources = uniq(view.sources);
  const seen = new Set();
  view.expressions = view.expressions.filter(e => e.markdown?.trim() && !seen.has(e.markdown) && seen.add(e.markdown));
  view.contentLocale = lang([view.title, ...view.context, ...view.expressions.map(e => e.markdown), ...view.equivalents.map(e => e.markdown), ...view.gaps].join(' '));
  view.intuitionLocale = lang(view.intuition);
  return view;
}
function applyOverride(view, override, locale) {
  if (!override) return;
  for (const key of ['context', 'expressions', 'equivalents', 'completeness']) if (override[key] !== undefined) view[key] = structuredClone(override[key]);
  if (override.expressions) view.expressions = view.expressions.map(e => ({ source:`${view.id}/registered-content`, status:view.status, ...e }));
  if (override.intuition) view.intuition = pair(override.intuition, locale);
  if (override.gaps) view.gaps.push(...(override.gaps[locale] ?? override.gaps.zh ?? []));
}
function registeredStatement(node, view) {
  const f = node.formal ?? {}, statement = node.formalStatement;
  view.context.push(...lines(f.assumptions), ...lines(f.openAssumptions));
  if (statement?.tex) {
    view.expressions.push(formula(statement));
    // Symbol scope and domain restrictions sometimes exist only in this table/note.
    // Free-form notes are reading prose; exact scope additions live in the registry.
    view.context.push(...(statement.notation ?? []).map(n => `${n.symbol}: ${n.means}`));
    return;
  }
  switch (node.construct) {
    case 'Concept': view.expressions.push(expression(text(f.predicate), 'formal.predicate')); break;
    case 'Definition': view.expressions.push(expression(`${f.newSymbol ?? node.title} := ${text(f.oldTerm)}`, 'formal.oldTerm')); break;
    case 'Claim': view.expressions.push(expression(text(f.formula), 'formal.formula')); break;
    case 'Symbol': view.expressions.push(expression(`${f.declaration ?? node.title}${f.type ? ` : ${f.type}` : ''}`, 'formal.declaration')); break;
    case 'Term': view.expressions.push(expression(`${text(f.term)} : ${f.type ?? '?'}`, 'formal.term')); break;
    case 'Theory':
      view.context.push(...lines(f.language));
      view.expressions.push(...(f.axioms ?? []).map(a => expression(a.statement ?? text(a), 'formal.axioms', { id: a.id, status: a.kind === '定义' ? 'DEF' : view.status })));
      break;
    case 'Method':
      view.context.push(...lines(f.Pre));
      if (f.In || f.Out) view.expressions.push(expression(`${text(f.In)} → ${text(f.Out)}`, 'formal.In/Out'));
      view.expressions.push(...lines(f.body).map(v => expression(v, 'formal.body')));
      view.context.push(...lines(f.Fail ?? f.fail));
      break;
    case 'Construction':
      view.context.push(...lines(f.inputs));
      view.expressions.push(expression(text(f.verificationTarget), 'formal.verificationTarget'));
      // An unfinished step list is not an algorithm. The registered target is enough.
      break;
    case 'Example':
    case 'Counterexample':
      view.expressions.push(...Object.entries(f.objectSpec ?? {}).map(([k, v]) => expression(`${k}: ${text(v)}`, 'formal.objectSpec')));
      view.expressions.push(expression(text(node.construct === 'Example' ? f.satisfaction : f.failureWitness), node.construct === 'Example' ? 'formal.satisfaction' : 'formal.failureWitness'));
      if (node.construct === 'Counterexample' && f.target) view.context.push(`¬ (${text(f.target)})`);
      break;
    case 'MisconceptionPattern':
      view.expressions.push(expression(`**${view.locale === 'en' ? 'False rule' : '错误断言'}**: ${text(f.wrongRule)}`, 'formal.wrongRule'));
      view.expressions.push(expression(text(f.counterexample), 'formal.counterexample'));
      view.context.push(...lines(f.scope));
      break;
    case 'Problem':
      view.context.push(...lines(f.inputs), ...lines(f.constraints));
      view.expressions.push(expression(text(f.goal), 'formal.goal'));
      break;
  }
}

/** Pure reading projection. No source mutation, proof search, or formula harvesting. */
export function legacyMasterView(node, options = {}) {
  const view = base(node, options), f = node.formal ?? {}, locale = view.locale;
  view.intuition = intuitionSentence(MASTER_INTUITIONS[node.id] ?? (node.representations ?? []).find(r => r.kind === 'intuition' && r.note)?.note ?? node.summary ?? '');
  if (node.construct === 'Proof') {
    const target = (options.nodes ?? []).find(n => n.id === f.target);
    if (target && target.id !== node.id && target.construct !== 'Proof') {
      const projected = legacyMasterView({ ...target, registrations: [] }, options);
      view.context = [...projected.context, ...lines(f.openAssumptions), ...lines(f.boundary)];
      view.expressions = projected.expressions;
      view.equivalents = projected.equivalents;
      view.references.push({ id: target.id, title: target.title, href: nodeHref(target.id) });
      view.completeness = projected.completeness;
      view.gaps = [...projected.gaps];
    } else {
      view.completeness = 'partial';
      view.gaps.push(locale === 'en' ? 'The proof target is not available.' : '证明目标尚未完整登记。');
      if (f.target) view.expressions.push(expression(text(f.target), 'formal.target'));
    }
    // This is the certificate's existing state, not an assertion about a new check.
    view.context.push(`${locale === 'en' ? 'Recorded certificate' : '已登记证书'}: ${f.checkStatus ?? 'not_run'}`);
  } else {
    registeredStatement(node, view);
    view.context.push(...(MASTER_BOUNDARY_SELECTIONS[node.id] ?? []).flatMap(index => list(f.boundary?.[index])), ...(MASTER_CONTEXT_ADDITIONS[node.id] ?? []));
    const selected = MASTER_OVERRIDES[node.id]?.expressions ? { formal: [], equivalents: [] } : selectedSections(node);
    if (!node.formalStatement && selected.formal.length) {
      view.expressions = [expression(selected.formal.map(s => s.text).join('\n\n'), `contentMarkdown#${selected.formal[0].heading}`, { status:view.status })];
      // It is a registered formal section, not a claim of independent review.
      view.completeness = 'registered';
    }
    view.equivalents.push(...selected.equivalents.map(s => expression(s.text, `contentMarkdown#${s.heading}`, { status:view.status })));
  }
  applyOverride(view, MASTER_OVERRIDES[node.id], locale);
  if (!node.formalStatement && node.construct !== 'Proof' && !MASTER_OVERRIDES[node.id]?.expressions && !view.expressions.some(e => e.source?.startsWith('contentMarkdown#'))) {
    view.completeness = 'partial';
    view.gaps.push(locale === 'en' ? 'Registered specification; a complete formal summary is not supplied.' : '登记摘要；完整形式摘要尚未补齐。');
  }
  if (!view.expressions.some(e => e.markdown?.trim())) {
    view.expressions = [expression(node.summary || node.title, 'summary')];
    view.completeness = 'partial';
  }
  // Variants remain labelled registrations, never inferred equivalences.
  const seen = new Set([JSON.stringify([view.context, view.expressions.map(e => e.markdown)])]);
  for (const record of node.registrations ?? []) {
    if (MASTER_REDUNDANT_REGISTRATIONS[node.id]?.includes(record.id)) {
      view.sources.push(...(record.provenance?.sources ?? []));
      continue;
    }
    const variant = legacyMasterView({ ...record, registrations: [] }, options);
    const key = JSON.stringify([variant.context, variant.expressions.map(e => e.markdown)]);
    if (!seen.has(key)) { seen.add(key); view.variants.push(variant); }
  }
  return finish(view);
}

export function objectMasterView(object, options = {}) {
  const view = base(object, options), anchor = options.anchor ?? '$', context = object.normalizedContext;
  view.anchor = anchor;
  view.sources = [object.path];
  view.status = 'NOT-CLAIMED';
  if (context) {
    view.context.push(`${context.bases.join(', ')} · ${context.signature}`);
    view.context.push(...context.constants.map(c => `${c.name}: ${c.type} · ${c.background}`));
  }
  view.context.push(...lines(object.assumptions));
  const declarations = object.declarations.filter(d => anchor === '$' || d.id === anchor);
  view.expressions = declarations.map(d => ({ ...expression(`\u0060${d.source}\u0060`, `${object.path}#${d.id}`), ...(MASTER_OBJECT_PRESENTATIONS[object.id]?.[d.id] ?? {}), id: d.id, status: d.status, source: `${object.path}#${d.id}` }));
  const refs = anchor === '$' ? [...object.members, ...object.imports, ...object.references, ...object.exports.map(e => e.ref)] : [];
  const seen = new Set();
  for (const ref of refs) {
    const key = `${ref.id}#${ref.anchor}`;
    if (seen.has(key)) continue;
    seen.add(key);
    view.references.push({ id: ref.id, anchor: ref.anchor, title: options.objects?.find(o => o.id === ref.id)?.title ?? ref.id, href: objectHref(ref.id, ref.anchor) });
  }
  view.intuition = MASTER_OBJECT_INTUITIONS[object.id] ?? '';
  if (anchor !== '$' && !declarations.length) {
    view.completeness = 'partial'; view.gaps.push(view.locale === 'en' ? 'Declaration anchor unavailable.' : '声明锚点不可用。');
  }
  return finish(view);
}

export function learningMasterView(node, objects, options = {}) {
  const view = base(node, options), seen = new Set();
  view.sources = [node.path];
  for (const ref of node.objects) {
    const key = `${ref.id}#${ref.anchor}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const object = objects.find(o => o.id === ref.id);
    view.references.push({ id: ref.id, anchor: ref.anchor, title: object?.title ?? ref.id, href: objectHref(ref.id, ref.anchor) });
    if (object) view.variants.push(objectMasterView(object, { ...options, objects, anchor: ref.anchor }));
    else { view.completeness = 'partial'; view.gaps.push(`${ref.id}#${ref.anchor}`); }
  }
  if (!node.objects.length) {
    view.expressions = (node.goals ?? []).map(g => expression(g, 'goals'));
    view.completeness = 'partial';
    view.gaps.push(view.locale === 'en' ? 'No formal object is referenced.' : '尚未引用形式对象；仅有登记目标。');
  }
  view.intuition = view.variants.find(v => v.intuition)?.intuition ?? node.goals?.[0] ?? '';
  // Hoist only context shared verbatim by every reference; local assumptions stay local.
  if (view.variants.length) {
    view.context = view.variants[0].context.filter(line => view.variants.every(v => v.context.includes(line)));
    for (const variant of view.variants) variant.context = variant.context.filter(line => !view.context.includes(line));
  }
  return finish(view);
}

export function masterPreview(view) {
  const first = view.expressions.length ? view : view.variants.find(v => v.expressions.length);
  const expressions = first?.expressions.slice(0, 1) ?? view.references.map(ref => expression(`[${ref.title}](${ref.href})`, 'members'));
  return { ...view, expressions, context: uniq([...view.context, ...(first?.context ?? [])]),
    equivalents: [], variants: [], references: [], sources: [] };
}
