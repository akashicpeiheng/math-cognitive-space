import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { entryNotes } from '../data/field-entry.mjs';
import { renderEntryNote } from '../data/field-entry-support.mjs';
const target=fileURLToPath(new URL('../data/cases/10-field-entry.md',import.meta.url));
const text='# 学科入口节点正文\n\n编写源：data/field-entry-*.mjs；本文件由 scripts/build-field-entry.mjs 装配。\n\n'+entryNotes.map(spec=>'<!-- node:'+spec.id+' -->\n'+renderEntryNote(spec)+'\n<!-- /node -->').join('\n\n')+'\n';
if(process.argv.includes('--check')){
  if(readFileSync(target,'utf8')!==text)throw new Error('学科入口正文产物与编写源不一致');
}else writeFileSync(target,text,'utf8');
console.log('Field-entry bodies: '+entryNotes.length);
