import { fromMarkdown } from 'mdast-util-from-markdown';
import { math } from 'micromark-extension-math';
import { mathFromMarkdown } from 'mdast-util-math';
import { gfm } from 'micromark-extension-gfm';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { parseVaultNote } from './vault.mjs';

export const fmPattern = /^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;
const markerPattern = /^<!-- mcs-section:([a-z-]+) -->$/;
const flatten = node => node.value ?? node.children?.map(flatten).join('') ?? '';
const lineAfter = (text, offset) => { const n = text.indexOf('\n', offset); return n < 0 ? text.length : n + 1; };

export function readWritingProperties(markdown) {
  const frontmatter = markdown.match(fmPattern)?.[0] ?? '';
  const p = parseVaultNote(frontmatter).properties;
  for (const line of frontmatter.split(/\r?\n/)) {
    const entry = line.match(/^(mcs-[a-z-]+):\s*(".*")\s*$/);
    if (entry) try { p[entry[1]] = JSON.parse(entry[2]); } catch { /* Preserve unrecognized metadata. */ }
  }
  return p;
}

/** Scan original ranges, including legacy titles; never reserialize a user's Markdown. */
export function scanWritingSections(markdown, definitions) {
  const offset = (markdown.match(fmPattern)?.[0] ?? '').length;
  const tree = fromMarkdown(markdown.slice(offset), { extensions: [math(), gfm()], mdastExtensions: [mathFromMarkdown(), gfmFromMarkdown()] });
  const nodes = tree.children;
  const titles = new Map(definitions.flatMap(s => [s.title.zh, s.title.en, ...(s.aliases ?? [])].map(t => [t, s.id])));
  const boundaries = [], issues = [], known = new Set(definitions.map(s => s.id));
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type !== 'heading' || node.depth > 2) continue;
    const previous = nodes[i - 1], marker = previous?.type === 'html' ? previous.value.trim().match(markerPattern) : null;
    const name = flatten(node), id = marker?.[1] ?? (node.depth === 2 ? titles.get(name) : null);
    const start = offset + (marker ? previous.position.start.offset : node.position.start.offset);
    boundaries.push({ id, name, start, contentStart: lineAfter(markdown, offset + node.position.end.offset), headingEnd: offset + node.position.end.offset });
    if (marker && !known.has(id)) issues.push({ sectionId: id, category: 'scope', message: 'unknown-section' });
  }
  const sections = {};
  for (let i = 0; i < boundaries.length; i++) {
    const b = boundaries[i], end = boundaries[i + 1]?.start ?? markdown.length;
    if (!known.has(b.id)) continue;
    if (Object.hasOwn(sections, b.id)) { issues.push({ sectionId: b.id, category: 'structure', message: 'duplicate' }); sections[b.id] = null; continue; }
    sections[b.id] = { ...b, end, content: markdown.slice(b.contentStart, end) };
  }
  return { sections, issues };
}

export const substantiveText = text => text.replace(/<!--[^]*?-->/g, '').replace(/^#{1,6}\s.*$/gm, '').replace(/^\s*\|[\s|:-]+\|\s*$/gm, '').trim();

/** One section may satisfy several obligations; reject missing targets and cycles. */
export function resolveCoveredSection(id, coveredBy, sections) {
  const seen = new Set();
  while (Object.hasOwn(coveredBy, id) && coveredBy[id]) {
    if (seen.has(id)) return null;
    seen.add(id); id = coveredBy[id];
  }
  return Object.hasOwn(sections, id) ? sections[id] ?? null : null;
}
