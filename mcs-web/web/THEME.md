# MCS Web 主题

本目录的主题由站点标志（`design/mcs-logo-v6/mcs-logo-square.png`）推出。
改配色前先读这一页，避免三处颜色各说各话。

## 三处颜色，各自的职责

| 位置 | 内容 | 谁说了算 |
| --- | --- | --- |
| `src/styles.css` 的 `:root` | 全部 CSS 令牌：纸面、墨色、主色、语义色、渐变、阴影 | **唯一权威源** |
| `src/theme.ts` | 少量颜色的 JS 镜像 | 必须与 `:root` 成对修改 |
| `src/labels.ts` | `RELATION_COLOR`（8 种关系）、`CONSTRUCT_COLOR`（12 种构造） | 数据可视化语义色，独立成套 |

为什么需要 `src/theme.ts`：SVG 的表现属性（`stroke=`、`fill=`）不接受 `var()`，
而节点画布上的关系线与行动契约线恰恰是 SVG 属性，只能在 JS 里给字面色值。
其余组件一律走 CSS 令牌，不要再写死颜色字面量。

## 令牌一览（`src/styles.css`）

- **纸面与墨色**：`--bg` `--surface` `--surface-2` `--canvas`
  （原表里还写着 `--surface-3`，它**不存在**——这样列出来会让人以为改一层卡片底有令牌可用；
  第一百零九轮核对时删掉。）
  `--ink` `--ink-soft` `--ink-faint` `--line` `--line-strong`。
  纸面是冷调紫罗兰，墨色是深靛；`--canvas` 比纸面更亮，专给 SVG 画布垫底。
- **品牌主色**：`--accent`（电光紫，正文链接在白底上要可读，故取深一档）、
  `--accent-strong` `--accent-deep` `--accent-soft` `--accent-line` `--accent-glow`；
  点缀色 `--magenta`（品红丝线）、`--cyan` / `--cyan-soft`（青色闪光）、
  `--ember`（暖珊瑚丝线）与 `--teal`（几何曲面）。这些辅助色也用于首页五张
  原型问题 SVG 缩略图；缩略图仍只从本文件所述令牌取色。
- **语义色**：`--green*` 通过、`--amber*` 条件与待办、`--red*` 失败与警示、
  `--blue*` 角色标签。这一组要能和紫色主调拉开距离，不要一起变紫。
- **渐变**：`--grad-brand`（主按钮、选中态、首屏顶边）、`--grad-hero`（首屏底）、
  `--grad-brand-soft` `--grad-glint`。
- **实心底（第一百零九轮加）**：`--accent-fill` / `--accent-fill-strong` / `--green-fill`。
  主题色与语义色兼任**两种角色**——「文字色」要压得住底，「实心底」要托得住白字——
  两者对明暗的要求相反，所以拆开：凡是「实心色块 + 白字」的地方走 `-fill`，
  其余（链接、描边、发光）走 `--accent`。**`-fill` 的取值在两种外观下相同。**
- **玻璃与舞台（第一百零九轮加）**：`--glass` / `--glass-strong` / `--glass-opaque`
  （吸顶栏、目录条与触屏降级用的近不透明档，三档必须分开——合并会把浅色下的取值悄悄改掉）、
  `--edge-label-halo`（边标签的描边光晕，深色下必须等于画布底）、
  `--stage-surface` / `--stage-glow` / `--stage-ink` / `--stage-scrim-rgb` /
  `--stage-base` / `--stage-base-flow`（首页五幕的「舞台纸」与两层雾）。

## 暗色主题（第一百零九轮，2026-10-16）

浅色与深色不是两套设计，而是同一套紫色语言的两面：浅色是「冷调紫罗兰纸 + 深靛墨」，
深色是「深靛纸 + 近白墨」，色相仍锁在紫族。

- **三态，不是两态**：偏好 ∈ `light | dark | system`（默认 `system`），
  存在本机 `localStorage['mcs-theme-v1']`。解析结果写 `<html data-theme="light|dark">`
  （另写 `data-theme-preference` 供调试与断言）；**CSS 只认 `[data-theme='dark']`**，
  不写 `prefers-color-scheme` 媒体查询——否则「用户显式选浅色」与「系统是深色」会互相打架。
- **首帧**：`web/public/theme-boot.js` 在 `<head>` 里同步跑（外链、非模块）。
  生产 CSP 是 `script-src 'self'`（`server/deployment.mjs`），**内联脚本会被拒绝执行**，
  所以不能把这段逻辑内联。它与 `src/theme-mode.ts` 是同一套规则的两份实现，
  由 `tests/theme-tokens.test.mjs` 断言（存储键、媒体查询、属性名、theme-color 取值）。
- **深色块写在哪**：`styles.css` 末尾那一节（项目惯例：新一轮追加在末尾并写明理由），
  选择器是 `html[data-theme='dark']`。**只覆盖已存在的令牌名**——写错的令牌名不会报错，
  只会静默失效，因此 `tests/theme-tokens.test.mjs` 断言「深色块里的每个名字都在 `:root` 里存在」，
  且核心组（纸面 / 墨色 / 线 / 品牌 / 语义 / 代码块 / 阴影 / 玻璃 / 舞台 / 首屏渐变）一个不漏。
- **两套镜像**：`src/theme.ts` 的 `THEME` 与 `THEME_DARK` 键完全相同，
  组件经 `src/theme-palette.ts` 的 `useThemePalette()` 一次取齐当前外观的整套颜色
  （基础色 + 关系色 + 契约色 + 构造底 + 话题底 + 图例色）。深色版本是
  `labels.ts` 的 `RELATION_COLOR_DARK` / `CONTRACT_MODE_COLOR_DARK` / `CONSTRUCT_COLOR_DARK`、
  `relation-visual.ts` 的 `TIER_SAMPLE_COLOR_DARK`、`network.ts` 的 `TOPIC_PALETTE_DARK`。
- **判据对两套外观各跑一遍**：文字 ≥4.5:1、边色对画布 ≥3:1、正常视觉两两 ΔE ≥15、
  色盲模拟下 ΔE ≥12 或另有冗余通道、卡片文字对 10 色话题底与 12 色构造底 ≥4.5:1
  （`tests/a11y-contrast.test.mjs`）。**深色遇到不达标是调色值，不是放宽阈值**：
  例如表示性契约色第一版取 `#f9a8d4`，deuteranopia 下与 `method` 只差 5.3，当场被抓后改成 `#ec4899`。
- **一处修复（顺手）**：`src/theme.ts` 的 `inkFaint` 从前写着 `#6b6389`，而样式表里
  生效的 `--ink-faint` 是 `#6a6292`（该令牌在 `:root` 里声明过两次，后一处才生效）。
  新的镜像一致性断言当场抓到这处分家，现在以 CSS 为权威、`theme.ts` 逐字对齐，
  第一个 `:root` 里那份重复声明已删掉。
- **已知限制**：`web/public/site.webmanifest` 的 `background_color` / `theme_color` 是静态值，
  不跟随用户选择（文件本身不知道当前外观）；移动端地址栏那一圈颜色由运行时的
  `theme-color` meta 负责（引导脚本与 `ThemeProvider` 都会改它）。

## 应用点

- `web/index.html`：favicon / apple-touch-icon / manifest / `theme-color`。
  `theme-color` 取 `--accent`，改主色时两处要一起改。
- `web/public/site.webmanifest`：`theme_color` 与 `background_color` 同步同上两值。
- `src/components/Layout.tsx`：侧栏品牌位用小 logo `wordmark-256.png`（一笔彩虹字标，
  由 `design/mcs-logo-v13` 导出；折叠态缩到 62 px，窄屏横条 132 px）；
  首屏大 logo 仍是 v6 紫色徽记。
- `src/components/HomeNarrative.tsx`：首页五幕共用一套“认知星图”视觉层：深靛玻璃报头、
  分幕色彩气氛、指针视差光场、轨道与星点环境动画，以及由滚轮控制的 SVG 教学场景；
  颜色仍取本页令牌，不把教学示意伪装成真实学习数据。
- `src/components/CaseThumbnail.tsx`：五个原型问题各自的概念缩略图；图形表达
  「趋近 / 坐标片 / 换基 / 对称 / 切空间」，不用外部图片。
- `src/components/Layout.tsx`：桌面侧栏可收成图标栏，状态保存在本机；窄屏变成
  默认收起的顶部导航。

## 重新生成图标

源图换版或要改尺寸时：

```
node design/mcs-logo-v6/build-web-assets.mjs
node design/mcs-logo-v13/build-web-assets.mjs   # 小 logo（一笔彩虹字标）
npm run build          # 把 public/ 拷进 dist/
```

脚本对每个输出文件打印字节数与 SHA-256 前 16 位，便于比对。

## 验收

## 2026-10 的层级调整

保留紫色品牌与全部令牌名，只调整用途与几个取值，目的写在 `styles.css` 末尾的「2026-10 交互与视觉整改」一节：

- `--ink-faint` 由 `#7d75a0` 加深为 `#6a6292`：原值在白底上只有 4.26:1、在紫调纸面上 3.79:1，
  低于 WCAG AA 对普通文字的 4.5:1；新值在四种底色上分别为 5.56 / 5.06 / 4.95 / 5.36:1。
- 阴影只留给浮层与主按钮，卡片改用描边分层——「每块都像浮层」会让正文失去层级。
- 正文桌面 17px、手机 16px，行高 1.75；连续正文限宽 72ch；窄屏主要控件 44px。
- 侧栏不再展示本体哈希与运行时版本（移到「我的学习 · 高级设置」）；顶栏显示当前位置与档案，不再显示版本号。
- 手机宽度下首页隐藏大幅徽记（`.hero-mark`），品牌由导航里的字标承担。

```
npm run check   # 本体、证据重放、局部化、数据库
npm test        # 含浏览器验收：标志已加载、主题令牌、图标与 manifest 的可达性与 MIME
```

外观相关的断言（第一百零九轮起）单独列在这里：

```powershell
node --test tests/theme-tokens.test.mjs   # 令牌成对、镜像一致、首帧脚本与 CSP 相容、没有漏登记的字面色
node --test tests/a11y-contrast.test.mjs  # 两套外观各跑一遍的对比度与色觉断言
node tests/dark-mode-page.mjs             # 三态切换、持久化、跟随系统、深色画布（真浏览器）
```

浏览器验收会断言侧栏与首屏标志、`--accent` 取值、冷调纸面、主按钮渐变，
以及全部图标与 manifest 返回 200 且不是 `application/octet-stream`。
**服务端的 MIME 表在 `server/index.mjs`**：新增静态资源后缀时要一并登记，
否则浏览器会拒绝 manifest。

首页另外由 `tests/home-narrative.mjs` 核对五幕顺序、滚轮分幕、正文与动画层序、
多个桌面视口、手机自然滚动和 `prefers-reduced-motion`。环境层只做抽象氛围；
正文语义、证据边界和真实入口仍由叙事数据与页面组件承担。
