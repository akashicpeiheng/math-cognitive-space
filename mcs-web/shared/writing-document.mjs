import { WRITING_SECTIONS, CORE_SECTIONS, TEMPLATE_ID, TEMPLATE_VERSION, chooseText, writingSettings, resolveWritingPlan } from './writing-template.mjs';
import { fmPattern, readWritingProperties, scanWritingSections, substantiveText, resolveCoveredSection } from './writing-markdown.mjs';
const chapter = (s, locale) => `<!-- mcs-section:${s.id} -->\n## ${chooseText(s.title, locale)}\n\n`;
function insertChapters(markdown, definitions, locale) {
  if (!definitions.length) return markdown;
  const ref = scanWritingSections(markdown, WRITING_SECTIONS).sections.references;
  const at = ref?.start ?? markdown.length;
  const before = markdown.slice(0, at), after = markdown.slice(at);
  return before + (before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n') + definitions.map(s => chapter(s, locale)).join('\n') + after;
}

export function documentMetadata(markdown) {
  const p = readWritingProperties(markdown);
  return { ...writingSettings(markdown), templateId: String(p['mcs-template'] ?? ''), templateVersion: String(p['mcs-template-version'] ?? ''),
    locale: p['mcs-language'] === 'en' ? 'en' : 'zh', audience: String(p['mcs-audience'] ?? ''), source: String(p['mcs-source'] ?? '') };
}

/** Edit only MCS-owned scalar keys; preserve unknown frontmatter bytes. */
export function updateDocumentMetadata(markdown, values) {
  const current = markdown.match(fmPattern), eol = markdown.includes('\r\n') ? '\r\n' : '\n';
  const safe = Object.entries(values).filter(([key]) => /^mcs-[a-z-]+$/.test(key));
  const lines = current ? current[0].replace(/^\uFEFF/, '').split(/\r?\n/).slice(1, -1) : [];
  // Split leaves the closing delimiter before the final empty line.
  if (lines.at(-1) === '---') lines.pop();
  for (const [key, value] of safe) {
    const next = `${key}: ${JSON.stringify(String(value))}`;
    const index = lines.findIndex(line => line.startsWith(key + ':'));
    if (index >= 0) lines[index] = next; else lines.push(next);
  }
  const bom = current?.[0].startsWith('\uFEFF') ? '\uFEFF' : '';
  return `${bom}---${eol}${lines.join(eol)}${eol}---${eol}` + (current ? markdown.slice(current[0].length) : markdown);
}


export function createWritingDocument({ title = '', type = 'generic', roles = [], depth = 'core', locale = 'zh', audience = '' } = {}) {
  const plan = resolveWritingPlan({ type, roles, depth });
  const body = `# ${title.replace(/[\r\n]/g, ' ').trim() || (locale === 'en' ? 'Untitled note' : '未命名笔记')}\n\n` + plan.sections.map(s => chapter(s, locale)).join('\n');
  return updateDocumentMetadata(body, { 'mcs-template': TEMPLATE_ID, 'mcs-template-version': TEMPLATE_VERSION, 'mcs-type': type,
    'mcs-roles': plan.roles.join(','), 'mcs-depth': depth, 'mcs-language': locale, 'mcs-audience': audience });
}

/** Only required/selected absent chapters are reported, never the entire resource bank. */
export function locateWritingSections(markdown) {
  const found = scanWritingSections(markdown, WRITING_SECTIONS), settings = writingSettings(markdown);
  for (const s of settings.sections) if (!Object.hasOwn(found.sections, s.id) && !settings.coveredBy[s.id]) found.issues.push({ sectionId: s.id, category: 'structure', message: 'missing' });
  return found;
}

export function replaceWritingSection(markdown, sectionId, body) {
  const found = scanWritingSections(markdown, WRITING_SECTIONS).sections[sectionId];
  if (!found) throw new Error('Section is missing or ambiguous; use full Markdown or explicitly add the chapter.');
  return markdown.slice(0, found.contentStart) + body + '\n\n' + markdown.slice(found.end);
}

/** Explicit addition never rewrites existing content or pulls in unrelated resources. */
export function addWritingSection(markdown, sectionId) {
  const definition = WRITING_SECTIONS.find(s => s.id === sectionId);
  if (!definition) throw new Error('Unknown writing section');
  const { sections } = scanWritingSections(markdown, WRITING_SECTIONS), metadata = documentMetadata(markdown);
  const body = Object.hasOwn(sections, sectionId) ? markdown : insertChapters(markdown, [definition], metadata.locale);
  return updateDocumentMetadata(body, { [`mcs-applicability-${sectionId}`]: 'applicable', [`mcs-covered-${sectionId}`]: '' });
}

export function supplementWritingDocument(markdown, options = {}) {
  const old = documentMetadata(markdown), values = { 'mcs-template': TEMPLATE_ID, 'mcs-template-version': TEMPLATE_VERSION,
    'mcs-type': options.type ?? old.type, 'mcs-language': options.locale ?? old.locale, 'mcs-depth': options.depth ?? old.depth,
    'mcs-roles': (options.roles ?? old.roles.filter(r => r !== old.type)).join(',') };
  let next = updateDocumentMetadata(markdown, values);
  const settings = writingSettings(next), { sections } = scanWritingSections(next, WRITING_SECTIONS);
  const missing = settings.sections.filter(s => !Object.hasOwn(sections, s.id) && !settings.coveredBy[s.id]);
  next = insertChapters(next, missing, options.locale ?? old.locale);
  return next;
}

export function writingChecks(markdown) {
  const { sections, issues } = locateWritingSections(markdown), m = documentMetadata(markdown), results = [...issues];
  for (const s of WRITING_SECTIONS) {
    const applicability = m.applicability[s.id], core = CORE_SECTIONS.includes(s.id), selected = core || applicability === 'applicable';
    const range = resolveCoveredSection(s.id, m.coveredBy, sections), text = range ? substantiveText(range.content) : '';
    if (core && applicability !== 'applicable') results.push({ sectionId: s.id, category: 'mathematical', message: 'core-required' });
    if (applicability === 'unknown') results.push({ sectionId: s.id, category: 'scope', message: 'applicability-unknown' });
    if (applicability === 'na' && !m.reasons[s.id].trim()) results.push({ sectionId: s.id, category: 'scope', message: 'na-reason' });
    if (!selected) continue;
    if (m.coveredBy[s.id] && !range) results.push({ sectionId: s.id, category: 'structure', message: 'coverage-reference' });
    if (!text) results.push({ sectionId: s.id, category: 'coverage', message: 'empty' });
    if (m.statuses[s.id] === 'pending') results.push({ sectionId: s.id, category: 'verification', message: 'pending' });
  }
  // A tag in metadata or a disabled resource is not evidence for the selected content.
  const body = m.sections.map(s => substantiveText(resolveCoveredSection(s.id, m.coveredBy, sections)?.content ?? '')).join('\n');
  if (!/\b(?:DEF|PROOF|REF|FINITE|ILLUSTRATION|NOT-CLAIMED)\b/.test(body)) results.push({ sectionId: 'evidence', category: 'evidence', message: 'labels' });
  if (m.unknownRoles.length) results.push({ sectionId: '', category: 'scope', message: 'unknown-role' });
  if (m.templateVersion !== TEMPLATE_VERSION) results.push({ sectionId: '', category: 'template', message: 'version' });
  return results;
}

export function writingCoverage(markdown, checks = writingChecks(markdown)) {
  const m = documentMetadata(markdown);
  const done = s => !checks.some(c => c.sectionId === s.id && ['empty', 'na-reason', 'missing', 'duplicate', 'coverage-reference', 'core-required', 'applicability-unknown'].includes(c.message));
  const core = m.sections.filter(s => CORE_SECTIONS.includes(s.id)), expansion = m.sections.filter(s => !CORE_SECTIONS.includes(s.id));
  return { total: m.sections.length, addressed: m.sections.filter(done).length,
    reviewed: m.sections.filter(s => done(s) && m.statuses[s.id] === 'reviewed').length,
    core: { total: core.length, addressed: core.filter(done).length }, expansion: { total: expansion.length, addressed: expansion.filter(done).length },
    unresolved: Object.values(m.applicability).filter(a => a === 'unknown').length };
}

export function invalidateChangedReviews(previous, next) {
  const oldMeta = documentMetadata(previous), nextMeta = documentMetadata(next), values = {};
  if (!Object.values(oldMeta.statuses).includes('reviewed')) return next;
  const before = scanWritingSections(previous, WRITING_SECTIONS).sections, after = scanWritingSections(next, WRITING_SECTIONS).sections;
  // Context/role changes invalidate all self-reviews, including sections sharing another passage.
  const contextChanged = ['type', 'roles', 'customChecks'].some(k => JSON.stringify(oldMeta[k]) !== JSON.stringify(nextMeta[k])) ||
    ['background', 'form'].some(id => resolveCoveredSection(id, oldMeta.coveredBy, before)?.content !== resolveCoveredSection(id, nextMeta.coveredBy, after)?.content);
  for (const s of WRITING_SECTIONS) if (oldMeta.statuses[s.id] === 'reviewed' && nextMeta.statuses[s.id] === 'reviewed' &&
    (contextChanged || oldMeta.applicability[s.id] !== nextMeta.applicability[s.id] || oldMeta.coveredBy[s.id] !== nextMeta.coveredBy[s.id] ||
      resolveCoveredSection(s.id, oldMeta.coveredBy, before)?.content !== resolveCoveredSection(s.id, nextMeta.coveredBy, after)?.content)) values[`mcs-status-${s.id}`] = 'writing';
  return Object.keys(values).length ? updateDocumentMetadata(next, values) : next;
}
