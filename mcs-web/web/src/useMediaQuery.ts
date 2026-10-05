import { useEffect, useState } from 'react';

/**
 * 只读浏览器媒体查询的极小钩子。
 *
 * 首页叙事（固定舞台 ↔ 自然滚动）与「数学对象」列表（筛选栏展开 ↔ 收进折叠区）
 * 都要按窗口尺寸切换结构，因此抽到一处：两边的阈值语义不同，但「跟随 resize 重算」
 * 这件事只需要一份实现。SSR 不执行到这里，但仍保留安全回退。
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia(query).matches
  ));

  useEffect(() => {
    const media = window.matchMedia(query);
    const sync = () => setMatches(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [query]);

  return matches;
}

/** 与首页叙事同一套判断：窄窗或矮窗都算「放不下两栏」，列表页用它收起筛选栏。 */
export const COMPACT_QUERY = '(max-width: 700px)';
