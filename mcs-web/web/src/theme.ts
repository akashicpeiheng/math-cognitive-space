/**
 * 主题色的 JS 镜像。
 *
 * 为什么需要这一份：SVG 的表现属性（`stroke=`、`fill=`）不接受 `var()`，
 * 而节点画布上的关系线与行动契约线恰恰是 SVG 属性。所以 CSS 令牌
 * （`web/src/styles.css` 的 `:root`）与这里的常量必须成对维护：
 * 改一处就要同时改另一处，两者的取值约定写在 styles.css 顶部的注释里。
 */
export const THEME = {
  ink: '#1a1330',
  inkSoft: '#4d4470',
  /** 与 styles.css 的 `--ink-faint` 成对：2026-10 调深以满足 AA（旧值 #7d75a0 只有 4.26:1）。 */
  inkFaint: '#6b6389',
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
} as const;
