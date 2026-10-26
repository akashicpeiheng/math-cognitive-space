import { legacyMasterView, objectMasterView, learningMasterView, masterPreview, MASTER_CONTENT_VERSION } from '../shared/master-view.mjs';
const legacyCache = new WeakMap(), libraryCache = new WeakMap();
export function legacyMaster(ontology, node, preview = false) {
  let cache = legacyCache.get(ontology);
  if (!cache) { cache = new Map(); legacyCache.set(ontology, cache); }
  const locale = ontology.locale ?? 'zh', key = `${ontology.version}:${locale}:${MASTER_CONTENT_VERSION}:${node.id}`;
  if (!cache.has(key)) cache.set(key, legacyMasterView(node, { nodes: ontology.raw.nodes, sourceVersion: ontology.version, locale }));
  const view = cache.get(key);
  return preview ? masterPreview(view) : view;
}
export function contentMaster(library, record, locale = 'zh', preview = false) {
  let cache = libraryCache.get(library);
  if (!cache) { cache = new Map(); libraryCache.set(library, cache); }
  locale = locale === 'en' ? 'en' : 'zh';
  const sourceVersion = record.kind === 'object' ? library.objectVersion : `${library.objectVersion}:${library.learningVersion}`;
  const key = `${sourceVersion}:${locale}:${MASTER_CONTENT_VERSION}:${record.id}`;
  if (!cache.has(key)) cache.set(key, record.kind === 'object'
    ? objectMasterView(record, { objects: library.objects, locale, sourceVersion })
    : learningMasterView(record, library.objects, { locale, sourceVersion }));
  const view = cache.get(key);
  return preview ? masterPreview(view) : view;
}
