// Exercise the full current-library test when the corresponding M objects exist.
// The older published library has its own end-to-end regression instead.
import { loadContentLibrary } from '../core/content-library.mjs';
const objects = loadContentLibrary().objects;
await import(objects.some(o => o.id === 'obj:tdg:topic-local-change')
  ? './mcs-page-modern.mjs' : './mcs-page-legacy.mjs');
