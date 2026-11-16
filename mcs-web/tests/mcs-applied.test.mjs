import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadContentLibrary } from '../core/content-library.mjs';
import { mcsPresentation } from '../shared/mcs-presentation.mjs';
import { createMcsAtlas } from '../shared/mcs-atlas.mjs';
import { MSC_2020, UNMAPPED_MSC } from '../shared/mcs-framework.mjs';
import {
  APPLIED_BRANCHES,
  APPLIED_PARTS,
  MCS_APPLIED_ENTRIES,
  appliedCitation,
  appliedCounts,
  appliedEntry,
  appliedForBranch,
  appliedForMsc,
  appliedRelated,
  filterApplied,
  normalizeAppliedQuery,
  validateAppliedIndex,
} from '../shared/mcs-applied.mjs';

const objects = loadContentLibrary().objects;
const atlas = createMcsAtlas({ objects, presentation: mcsPresentation(objects) });
const mscCodes = new Set(MSC_2020.map(entry => entry.code));

test('the index contains the book’s 186 numbered sections with the printed part counts', () => {
  assert.equal(MCS_APPLIED_ENTRIES.length, 186);
  assert.deepEqual(appliedCounts().parts, { I: 6, II: 36, III: 31, IV: 40, V: 21, VI: 18, VII: 25, VIII: 9 });
  const total = APPLIED_PARTS.reduce((sum, part) => sum + part.count, 0);
  assert.equal(total, 186);
  for (const part of APPLIED_PARTS) {
    const entries = MCS_APPLIED_ENTRIES.filter(entry => entry.part === part.id);
    assert.equal(entries.length, part.count, part.id);
    assert.deepEqual(entries.map(entry => entry.number), Array.from({ length: part.count }, (_, i) => i + 1), part.id);
    assert.equal(entries[0].page, part.firstPage, `${part.id} starts at the printed page`);
  }
});

test('printed pages are monotonic and stay inside the section range', () => {
  let previous = 0;
  for (const entry of MCS_APPLIED_ENTRIES) {
    assert.ok(Number.isInteger(entry.page) && entry.page >= 1 && entry.page <= 953, entry.id);
    assert.ok(entry.page >= previous, `${entry.id} page ${entry.page} must not decrease`);
    previous = entry.page;
  }
  assert.equal(MCS_APPLIED_ENTRIES.at(-1).id, 'VIII.9');
  assert.equal(MCS_APPLIED_ENTRIES.at(-1).page, 953);
});

test('every entry is bilingual and English fields contain no Han characters', () => {
  for (const entry of MCS_APPLIED_ENTRIES) {
    assert.ok(entry.title.zh.trim() && entry.title.en.trim(), `title ${entry.id}`);
    assert.ok(entry.note.zh.trim() && entry.note.en.trim(), `note ${entry.id}`);
    assert.doesNotMatch(entry.title.en, /[\u3400-\u9fff]/, `English title ${entry.id}`);
    assert.doesNotMatch(entry.note.en, /[\u3400-\u9fff]/, `English note ${entry.id}`);
    assert.ok(!('objectId' in entry), `${entry.id} must not claim a formal object`);
  }
});

test('MSC tags exist in MSC 2020 and each entry carries at most three', () => {
  for (const entry of MCS_APPLIED_ENTRIES) {
    assert.ok(entry.msc.length <= 3, entry.id);
    for (const code of entry.msc) assert.ok(mscCodes.has(code), `${entry.id} uses unknown MSC ${code}`);
  }
});

test('all map links resolve to leaf navigation branches (no objects, crossings or children)', () => {
  const branchIds = new Set(atlas.nodes.map(node => node.id));
  for (const entry of MCS_APPLIED_ENTRIES) {
    for (const id of entry.branches) {
      const node = atlas.byId[id];
      assert.ok(branchIds.has(id), `${entry.id} links an unknown branch ${id}`);
      assert.equal(node.objectId, undefined, `${entry.id} links an object branch ${id}`);
      assert.equal(node.crossingId, undefined, `${entry.id} links a crossing ${id}`);
      assert.equal(node.children.length, 0, `${entry.id} links a non-leaf branch ${id}`);
      assert.ok(APPLIED_BRANCHES[id], `${entry.id} branch ${id} needs a display label`);
      assert.deepEqual(APPLIED_BRANCHES[id], { zh: node.title.zh, en: node.title.en }, `${id} label must match the atlas`);
    }
  }
});

test('all twelve previously unmapped MSC groups have at least one book section', () => {
  assert.equal(UNMAPPED_MSC.length, 12);
  for (const code of UNMAPPED_MSC) {
    assert.ok(appliedForMsc(code).length > 0, `MSC ${code} has no book entry`);
  }
});

test('search matches Chinese, English, IDs, acronyms and compact IDs', () => {
  const ids = query => filterApplied({ query }).map(entry => entry.id);
  assert.ok(ids('FFT').includes('II.10'));
  assert.ok(ids('PDE').includes('IV.3'));
  assert.ok(ids('TSP').includes('VI.18'));
  assert.ok(ids('IV.18').includes('IV.18'));
  assert.ok(ids('iv18').includes('IV.18'));
  assert.ok(ids('湍流').includes('V.21'));
  assert.ok(ids('turbulence').includes('V.21'));
  assert.ok(ids('text mining').includes('VII.24'));
  assert.equal(normalizeAppliedQuery('  IV.18  '), 'iv.18');
  assert.deepEqual(ids('nothing-matches-this'), []);
});

test('filters compose as AND and keep book order', () => {
  const part = filterApplied({ part: 'IV' });
  assert.equal(part.length, 40);
  assert.deepEqual(part.map(entry => entry.id), MCS_APPLIED_ENTRIES.filter(entry => entry.part === 'IV').map(entry => entry.id));
  const numerical = filterApplied({ part: 'IV', msc: '65' });
  assert.ok(numerical.length > 0);
  assert.ok(numerical.every(entry => entry.part === 'IV' && entry.msc.includes('65')));
  assert.equal(filterApplied({ part: 'II', msc: '99' }).length, 0);
  const complex = appliedForBranch('atlas:complex-analysis');
  assert.deepEqual(complex.map(entry => entry.id), ['II.5', 'III.6', 'IV.1']);
  const mapped = filterApplied({ mappedOnly: true });
  assert.equal(mapped.length, appliedCounts().mapped);
  assert.ok(mapped.every(entry => entry.branches.length > 0));
});

test('related entries are deterministic, bounded and never include the entry itself', () => {
  const entry = appliedEntry('IV.18');
  const related = appliedRelated(entry);
  assert.equal(related.prev?.id, 'IV.17');
  assert.equal(related.next?.id, 'IV.19');
  assert.ok(related.sameMsc.length > 0 && related.sameMsc.length <= 4);
  assert.ok(related.sameBranch.length > 0 && related.sameBranch.length <= 4);
  for (const item of [...related.sameMsc, ...related.sameBranch]) assert.notEqual(item.id, entry.id);
  assert.deepEqual(appliedRelated(entry), related);
  const first = appliedRelated(appliedEntry('I.1'));
  assert.equal(first.prev, null);
  assert.equal(first.next?.id, 'I.2');
  assert.deepEqual(first.sameBranch, []);
  assert.ok(first.sameMsc.every(item => item.msc.includes('00')));
});

test('citation names the book, section and printed page', () => {
  const citation = appliedCitation(appliedEntry('IV.18'));
  assert.match(citation, /Higham/);
  assert.match(citation, /2015/);
  assert.match(citation, /IV\.18/);
  assert.match(citation, /p\. 360/);
  assert.match(appliedCitation(appliedEntry('IV.18'), 'en'), /The Princeton Companion to Applied Mathematics/);
});

test('the structural validator accepts the checked-in index against the real atlas and MSC registry', () => {
  assert.deepEqual(validateAppliedIndex({
    branchIds: new Set(atlas.nodes.map(node => node.id)),
    mscCodes,
  }), []);
  assert.deepEqual(validateAppliedIndex(), []);
});
