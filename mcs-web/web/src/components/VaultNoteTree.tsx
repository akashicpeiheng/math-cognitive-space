import { useMemo } from 'react';
import { useI18n } from '../i18n';
import type { VaultFile } from '../../../shared/vault.mjs';

interface Folder { folders: Map<string, Folder>; files: VaultFile[] }
export function VaultNoteTree({ files, selectedId, onOpen }: { files: VaultFile[]; selectedId?: string; onOpen: (file: VaultFile) => void }) {
  const { pick } = useI18n();
  const root = useMemo(() => {
    const tree: Folder = { folders: new Map(), files: [] };
    for (const file of files) {
      let folder = tree;
      for (const name of file.path.split('/').slice(0, -1)) {
        if (!folder.folders.has(name)) folder.folders.set(name, { folders: new Map(), files: [] });
        folder = folder.folders.get(name)!;
      }
      folder.files.push(file);
    }
    return tree;
  }, [files]);
  const render = (folder: Folder) => <>
    {[...folder.folders].sort(([a], [b]) => a.localeCompare(b)).map(([name, child]) => <details className="library-folder" key={name} open><summary>{name}</summary><div>{render(child)}</div></details>)}
    {folder.files.map(file => <button key={file.id} className={`library-note-button ${selectedId === file.id ? 'selected' : ''}`} onClick={() => onOpen(file)} title={file.path} aria-pressed={selectedId === file.id}>{file.path}<small>{file.missing ? pick({ zh: '源文件缺失 · 已保留', en: 'Source missing · retained' }) : file.tags?.map(tag => '#' + tag).join(' ')}</small></button>)}
  </>;
  return <div className="library-note-tree" aria-label={pick({ zh: '笔记目录', en: 'Note folders' })}>{render(root)}</div>;
}
