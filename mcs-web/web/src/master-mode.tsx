import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
export type ReadingMode = 'normal' | 'master';
export const READING_MODE_KEY = 'mcs-reading-mode-v1';
function readMode(): ReadingMode {
  try { return localStorage.getItem(READING_MODE_KEY) === 'master' ? 'master' : 'normal'; } catch { return 'normal'; }
}
const MasterModeContext = createContext<{ mode:ReadingMode; isMaster:boolean; setMode:(mode:ReadingMode)=>void }>({ mode:'normal', isMaster:false, setMode:()=>{} });
export function MasterModeProvider({ children }: { children:ReactNode }) {
  const [mode, setState] = useState<ReadingMode>(readMode);
  const setMode = useCallback((next:ReadingMode) => {
    try { localStorage.setItem(READING_MODE_KEY, next); } catch { /* The current view still works without storage. */ }
    setState(next);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.readingMode = mode;
  }, [mode]);
  useEffect(() => {
    const sync = (event:StorageEvent) => { if (event.key === READING_MODE_KEY || event.key === null) setState(readMode()); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const value = useMemo(() => ({ mode, isMaster:mode === 'master', setMode }), [mode, setMode]);
  return <MasterModeContext.Provider value={value}>{children}</MasterModeContext.Provider>;
}
export function useMasterMode() { return useContext(MasterModeContext); }
