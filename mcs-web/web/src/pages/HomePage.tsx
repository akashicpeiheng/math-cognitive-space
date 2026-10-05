import { HomeNarrative } from '../components/HomeNarrative';

/**
 * 首页：只有六幕动画。
 *
 * 这一页负责「为什么」——把现状、路径、方法、体验与愿景讲一遍；具体的入口、
 * 筛选与学习闭环全部搬到「开始学习」页（`/start`）。首页因此不再承载任何
 * 需要现场派生数据的区块：它只读动画文案，不依赖本体、档案或事件。
 * 想改入口请去 `pages/StartPage.tsx`，想改文案请去 `home-narrative.ts`。
 */
export function HomePage() {
  return (
    <div className="page home-page">
      <HomeNarrative startHref="/start" />
    </div>
  );
}
