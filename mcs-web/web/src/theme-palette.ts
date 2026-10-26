/**
 * 画布用色板（2026-10-16 加，第一百零九轮）。
 *
 * ## 为什么需要一个「一次取全套」的钩子
 *
 * 知识网络上的颜色有四个来源：`theme.ts`（节点底、描边、中性线）、`labels.ts`
 * （8 种关系色、8 种契约色、12 种构造浅底）、`relation-visual.ts`（图例的五档示意色）、
 * `network.ts`（10 色话题底）。它们必须**同时**切到深色：只切一半就会出现
 * 「深色画布上配浅色话题底」这种半截状态，而那种缺陷在浅色外观下完全看不见。
 *
 * 因此这里把「当前外观 → 一整套颜色」收成一个钩子：`resolved` 只有两种取值，
 * 选表只发生在本文件一处，组件里不再出现 `resolved === 'dark' ? … : …` 的散落判断。
 *
 * ## 为什么表是模块级常量而不是每次现算
 *
 * 这些对象是**冻结的数据**，不是状态；常量让 React 的依赖比较稳定（引用不变），
 * 也让纯函数（例如 `paletteFor`）可以被 node 侧测试直接调用。
 */

import {
  CONSTRUCT_COLOR,
  CONSTRUCT_COLOR_DARK,
  CONTRACT_MODE_COLOR,
  CONTRACT_MODE_COLOR_DARK,
  CONTRACT_UNKNOWN_COLOR,
  CONTRACT_UNKNOWN_COLOR_DARK,
  RELATION_COLOR,
  RELATION_COLOR_DARK,
} from './labels';
import { TOPIC_NONE_COLOR, TOPIC_NONE_COLOR_DARK, TOPIC_NONE_COLOR_DOT_DARK, TOPIC_PALETTE, TOPIC_PALETTE_DARK, TOPIC_PALETTE_DOT_DARK } from './network';
import { TIER_SAMPLE_COLOR, TIER_SAMPLE_COLOR_DARK } from './relation-visual';
import { THEME, THEME_DARK, type ThemeColors } from './theme';
import { useTheme } from './theme-context';
import type { ResolvedTheme } from './theme-mode';

export interface ThemePalette {
  /** 基础色：节点底、节点描边、中性线、方法色带、自动加入标记、幕内插图渐变。 */
  colors: ThemeColors;
  /** 关系色：色相说「哪一种关系」。 */
  relation: Record<string, string>;
  /** 契约色：按 mode 上色，整体弱于关系色。 */
  contract: Record<string, string>;
  /** 未登记的契约 mode。 */
  contractUnknown: string;
  /** 构造浅底：节点卡片底与类型徽标底。 */
  construct: Record<string, string>;
  /** 话题配色：按话题自动分配（顺序即话题顺序，两张表一一对应）。 */
  topicPalette: readonly string[];
  /** 未归入任何话题的节点底。 */
  topicNone: string;
  /**
   * **圆点档**用的话题配色（2026-10-17 加）。
   *
   * 与 `topicPalette` 分开是因为两者的约束不同：卡片底要「够深」以托住浅墨字，
   * 圆点上没有字、只要「够亮」才能在深画布上看清（见 `network.ts` 里两张表的说明）。
   * 浅色外观没有这一档：浅色圆点靠近白填充 + 描边 + 投影成形，与卡片共用一张表即可。
   */
  topicPaletteDot: readonly string[];
  /** 圆点档「未归入任何话题」的填充。 */
  topicNoneDot: string;
  /** 图例里每档的示意色。 */
  tierSample: Record<string, string>;
}

const LIGHT: ThemePalette = {
  colors: THEME,
  relation: RELATION_COLOR,
  contract: CONTRACT_MODE_COLOR,
  contractUnknown: CONTRACT_UNKNOWN_COLOR,
  construct: CONSTRUCT_COLOR,
  topicPalette: TOPIC_PALETTE,
  topicNone: TOPIC_NONE_COLOR,
  // 浅色圆点与卡片共用一张表（圆点的可见性来自描边与投影，不靠填充）。
  topicPaletteDot: TOPIC_PALETTE,
  topicNoneDot: TOPIC_NONE_COLOR,
  tierSample: TIER_SAMPLE_COLOR,
};

const DARK: ThemePalette = {
  colors: THEME_DARK,
  relation: RELATION_COLOR_DARK,
  contract: CONTRACT_MODE_COLOR_DARK,
  contractUnknown: CONTRACT_UNKNOWN_COLOR_DARK,
  construct: CONSTRUCT_COLOR_DARK,
  topicPalette: TOPIC_PALETTE_DARK,
  topicNone: TOPIC_NONE_COLOR_DARK,
  // 深色圆点单独提亮（卡片底仍用上面那张「够深」的表）。
  topicPaletteDot: TOPIC_PALETTE_DOT_DARK,
  topicNoneDot: TOPIC_NONE_COLOR_DOT_DARK,
  tierSample: TIER_SAMPLE_COLOR_DARK,
};

/** 纯函数取色板：给不依赖 React 的地方（或测试）用。 */
export function paletteFor(resolved: ResolvedTheme): ThemePalette {
  return resolved === 'dark' ? DARK : LIGHT;
}

/** 组件取色板：按当前外观返回上面两张之一。 */
export function useThemePalette(): ThemePalette {
  const { resolved } = useTheme();
  return paletteFor(resolved);
}
