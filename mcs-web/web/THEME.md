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

- **纸面与墨色**：`--bg` `--surface` `--surface-2` `--surface-3` `--canvas`
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

浏览器验收会断言侧栏与首屏标志、`--accent` 取值、冷调纸面、主按钮渐变，
以及全部图标与 manifest 返回 200 且不是 `application/octet-stream`。
**服务端的 MIME 表在 `server/index.mjs`**：新增静态资源后缀时要一并登记，
否则浏览器会拒绝 manifest。

首页另外由 `tests/home-narrative.mjs` 核对五幕顺序、滚轮分幕、正文与动画层序、
多个桌面视口、手机自然滚动和 `prefers-reduced-motion`。环境层只做抽象氛围；
正文语义、证据边界和真实入口仍由叙事数据与页面组件承担。
