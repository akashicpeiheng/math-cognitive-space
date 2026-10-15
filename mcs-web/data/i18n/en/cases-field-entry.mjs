import { entryNotes } from '../../field-entry.mjs';
import { renderEntryNote } from '../../field-entry-support.mjs';
export default Object.fromEntries(entryNotes.map(spec=>[spec.id,renderEntryNote(spec,'en')]));
