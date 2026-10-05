import { useEffect, useRef } from 'react';

/**
 * 列表页的滚动位置记忆（按 URL 键）。
 *
 * 为什么需要：节点列表是数据驱动的，浏览器原生的滚动恢复常常在数据到达前就执行，
 * 结果是「打开一个节点再返回，列表回到顶部、搜索词还在但位置丢了」。
 * 这里在列表就绪后恢复一次，并在离开该 URL 时把最后位置写回 sessionStorage。
 * 只存本机会话，不进 URL、不进 E。
 */

const PREFIX = 'mcs-scroll-v1';

export function useScrollMemory(key: string, ready: boolean): void {
  const restored = useRef(false);
  const latest = useRef(0);

  useEffect(() => { restored.current = false; }, [key]);

  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    let saved = 0;
    try { saved = Number(sessionStorage.getItem(PREFIX + key) ?? 0); } catch { saved = 0; }
    if (Number.isFinite(saved) && saved > 0) {
      window.requestAnimationFrame(() => window.scrollTo({ top: saved }));
    }
  }, [ready, key]);

  useEffect(() => {
    const onScroll = () => { latest.current = window.scrollY; };
    latest.current = window.scrollY;
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      try { sessionStorage.setItem(PREFIX + key, String(latest.current)); } catch { /* 隐私模式：忽略 */ }
    };
  }, [key]);
}
