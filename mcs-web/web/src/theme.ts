/**
 * 主题色的 JS 镜像。
 *
 * 为什么需要这一份：SVG 的表现属性（`stroke=`、`fill=`、`stopColor=`）不接受 `var()`，
 * 而节点画布上的关系线、行动契约线，以及首页幕内插图的两条渐变恰恰是 SVG 属性。
 * 所以 CSS 令牌（`web/src/styles.css` 的 `:root`）与这里的常量必须成对维护：
 * 改一处就要同时改另一处，两者的取值约定写在 styles.css 顶部的注释里。
 *
 * 两份表（浅色 `THEME` / 深色 `THEME_DARK`，2026-10-16 加，第一百零九轮）：
 * 键**完全相同**，由 `tests/theme-tokens.test.mjs` 断言；组件不再自己判断明暗，
 * 一律经 `useThemePalette()` 取表（判断散在各处时总有一处会漏，而漏掉的地方在浅色下看不出问题）。
 * 深色的取值不是「把浅色调亮一档」手调的，而是按与浅色同一套判据选的：
 * 文字 ≥4.5:1、边色对画布 ≥3:1，判据在 `tests/a11y-contrast.test.mjs` 里对两套表各跑一遍。
 *
 * 类型写成「同键、值为字符串」，而不是用 `as const` 把取值的字面量类型定死：
 * 后者会让深色表「不可能是别的颜色」，两张表也就没法各自成立。
 */

export type ThemeColors = {
  [Key in keyof typeof LIGHT_THEME]: string;
};

const LIGHT_THEME = {
  ink: '#1a1330',
  inkSoft: '#4d4470',
  /**
   * 与 styles.css 的 `--ink-faint` 成对。**取 CSS 的生效值**：样式表里这个令牌有两个
   * `:root` 声明，后一处（2026-10 交互与视觉整改）的 `#6a6292` 才是生效值——
   * 这里曾经写着 `#6b6389`，即两处颜色各说各话，2026-10-16 由
   * `tests/theme-tokens.test.mjs` 的镜像一致性断言当场抓到。
   */
  inkFaint: '#6a6292',
  surface: '#ffffff',
  surface2: '#f3f0fc',
  /** 画布底：比纸面更亮一点，让 SVG 上的节点浮起来。 */
  canvas: '#fbfaff',
  /** 已连接节点底色（淡紫）。 */
  nodeFill: '#f7f4ff',
  /** 未连接节点底色：用暖色，和「还没接上」的语义一致。 */
  nodeFillIsolated: '#fdf3ea',
  line: '#d8d0ef',
  lineIsolated: '#e5cfae',
  /** 兜底与契约线：中性紫灰，不与任何关系色抢注意力。 */
  neutral: '#8d85ae',
  /**
   * 行动契约线的专用色。
   *
   * 契约是「产出该节点需要哪些输入」，是结构骨架而**不是数学断言**，
   * 因此颜色必须明显弱于语义关系色。用 `ink` 当基色会画出近黑的线，
   * 在浅色画布上反而比关系线更抢眼——与「关系越硬越明显」的规范冲突。
   */
  contractEdge: '#8d85ae',
  /** 方法类节点的左侧色带：局部技巧与全局方法分开取色，与关系色系相容。 */
  methodLocal: '#0d9488',
  methodGlobal: '#7c3aed',
  /** 由自动规则加入的节点标记色。 */
  autoAdded: '#ea580c',
  /*
   * 首页幕内插图的两条渐变（第一百零九轮）。它们住在 HomeNarrative 的 `<defs>` 里，
   * 是 `stopColor` 属性，同样不吃 `var()`；深色舞台上 `#4c1d95` 这种深紫几乎看不见，
   * 因此按外观给两组。品牌那条与 `--grad-brand` 同族（深紫 → 亮紫 → 品红），
   * 青色那条与标志里的青色闪光同族。
   */
  storyBrandFrom: '#4c1d95',
  storyBrandVia: '#7c3aed',
  storyBrandTo: '#c026d3',
  storyCyanFrom: '#0284c7',
  storyCyanTo: '#67e8f9',
} as const;

export const THEME: ThemeColors = LIGHT_THEME;

/**
 * 深色外观的同名镜像（第一百零九轮）。
 *
 * 与 `styles.css` 的 `html[data-theme='dark']` 成对：纸面变深、墨色变浅，节点底改用深紫/深暖色，
 * 描边与中性线提亮到在深画布上看得见（`line` 对画布 2.39:1，浅色下同一条线是 1.6:1 量级——
 * 两者都是「卡片轮廓」而不是「内容线条」，因此这一档本来就不按 3:1 要求）。
 */
export const THEME_DARK: ThemeColors = {
  ink: '#f2eefb',
  inkSoft: '#c8c0e0',
  inkFaint: '#a79fc4',
  surface: '#1e1830',
  surface2: '#272040',
  canvas: '#191331',
  nodeFill: '#241c3d',
  nodeFillIsolated: '#33241c',
  line: '#5b4d80',
  lineIsolated: '#7a5c2a',
  neutral: '#a79fc4',
  contractEdge: '#a79fc4',
  methodLocal: '#2dd4bf',
  methodGlobal: '#a78bfa',
  autoAdded: '#fb923c',
  storyBrandFrom: '#a78bfa',
  storyBrandVia: '#c4b5fd',
  storyBrandTo: '#f0abfc',
  storyCyanFrom: '#67e8f9',
  storyCyanTo: '#a5f3fc',
};
