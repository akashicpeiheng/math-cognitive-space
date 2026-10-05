/**
 * 设计取值登记表（2026-10 加，TODO B）。
 *
 * `TODO.md` 的 B 节列了「有意选定、但不是实验结论」的取值，并明确写着**不是待办**。
 * 但那张表有个已知风险：它是手写的散文表格，**代码改了它不会跟着改**。
 * 本轮核对时确实抓到 5 处漂移（触屏阈值、白雾半径、文字让位、领域词表支数、色相间隔），
 * 每一处都已经悄悄说谎了一段时间。
 *
 * 这一份是它的**可核对版本**：每个取值登记一处「代码里住在哪」与一条**检查**，
 * `tests/design-values.test.mjs` 会逐条执行，并核对 `TODO.md` 的 B 节确实写着同一批取值。
 *
 * 四种检查类型（选哪一种取决于取值住在哪）：
 * - `module`：能 import 的常量（如 `RELATION_WEIGHT.hardPrereq`）——**最强**，直接比数值；
 * - `css`：住在样式表里的取值（用带分组名的正则取值，比数值或字符串）；
 * - `source`：住在 `.tsx` 组件里、node 侧 import 不了的取值（只做源码匹配，**最弱**，
 *   因此每一条都写明「为什么没能导出」，能被导出的一律导出——本轮已经导出了 4 组）；
 * - `computed`：**算出来的观测量**（如色相间隔、分支数），由测试按名字执行对应计算。
 *
 * `kind` 说明这个取值的性质，与 B 节的口径一致：
 * - `design`：手感 / 构图 / 取舍定的，不是实验结论；
 * - `measured`：实测得到的观测量（可能随数据变化，改数据就要重测并更新这里）；
 * - `derived`：由其它取值推出来的（如锚点散开 = 间距 × 0.8）。
 */

/** 检查类型的一览（测试与文档都用它，避免三处各写一遍）。 */
export const DESIGN_CHECK_TYPES = ['module', 'css', 'source', 'computed'];

export const DESIGN_VALUES = [
  {
    id: 'relation-weights',
    label: '硬前置权重 1.0、定义性前置 0.9',
    display: '硬前置 1.0（DEF 见证不打折）· 定义性前置 0.9 · 推导前置 0.5',
    kind: 'design',
    source: '第四十二轮',
    where: 'web/src/relation-visual.ts 的 RELATION_WEIGHT / CONTRACT_MODE_WEIGHT',
    note: '按「定义性依赖仅次于硬前置」定，不是实验结论。',
    docKeyword: '硬前置权重 1.0',
    checks: [
      { type: 'module', file: 'web/src/relation-visual.ts', export: 'RELATION_WEIGHT', path: ['hardPrereq'], equals: 1 },
      { type: 'module', file: 'web/src/relation-visual.ts', export: 'CONTRACT_MODE_WEIGHT', path: ['definition'], equals: 0.9 },
      { type: 'module', file: 'web/src/relation-visual.ts', export: 'CONTRACT_MODE_WEIGHT', path: ['deduction'], equals: 0.5 },
    ],
  },
  {
    id: 'hue-separation',
    label: '关系色相「同族 ≥8°、跨族可接近」',
    display: '关系色最小色相间隔 6°（analogy→hardGeneralization）· 契约色最小 18°（method→construction）',
    kind: 'measured',
    source: '第三十八轮（2026-10 重测）',
    where: 'web/src/labels.ts 的 RELATION_COLOR / CONTRACT_MODE_COLOR',
    note: '原表写「同族 ≥8°」，2026-10 核对时实测关系色里有 6° 的一对，因此改成**实测值**：'
      + '15 色塞不进 360°，跨族靠线型 / 线宽 / 标签区分这一点不变（可分辨性由 tests/a11y-contrast.test.mjs 断言）。',
    docKeyword: '关系色最小色相间隔 6°',
    docForbidden: ['同族 ≥8°'],
    checks: [
      { type: 'computed', name: 'hueGap', table: 'RELATION_COLOR', equals: 6 },
      { type: 'computed', name: 'hueGap', table: 'CONTRACT_MODE_COLOR', equals: 18 },
    ],
  },
  {
    id: 'saturation-layers',
    label: '饱和度分层 1.5 / 1.2 / 1.0',
    display: '关系 1.5 · 语义契约 1.2 · 其余 1.0',
    kind: 'design',
    source: '第三十八轮',
    where: 'web/src/relation-visual.ts 的 edgeVisual（局部常量 saturateFactor）',
    note: '靠截图与断言核对。',
    docKeyword: '饱和度分层 1.5 / 1.2 / 1.0',
    checks: [
      { type: 'source', file: 'web/src/relation-visual.ts', pattern: "family === 'relation' \\? 1\\.5 : semantic \\? 1\\.2 : 1" },
    ],
  },
  {
    id: 'arrow-sizes',
    label: '箭头 13 / 10.5 / 8.5',
    display: '核心与强 13 · 结构性关系 10.5 · 行动骨架 8.5 · 登记关联 8',
    kind: 'design',
    source: '第三十八轮',
    where: 'web/src/pages/NetworkPage.tsx 的 TIER_ARROW_SIZE',
    note: '第五档（登记关联 8）原表没写，2026-10 补上；组件里未导出，因此只能做源码检查。',
    docKeyword: '箭头 13 / 10.5 / 8.5',
    checks: [
      { type: 'source', file: 'web/src/pages/NetworkPage.tsx', pattern: 'core: 13, strong: 13, medium: 10\\.5, structural: 8\\.5, ambient: 8' },
    ],
  },
  {
    id: 'placement-score',
    label: '自动摆位权重 交叉 4000 / 边长 1 / 位移 0.6',
    display: '交叉 4000 · 边长 1 · 位移 0.6',
    kind: 'design',
    source: '第三十七轮',
    where: 'web/src/node-placement.ts 的 PLACEMENT_SCORE',
    note: '单测构造场面核对（tests/node-placement.test.mjs）。2026-10 把三个数提成导出常量。',
    docKeyword: '交叉 4000 / 边长 1 / 位移 0.6',
    checks: [
      { type: 'module', file: 'web/src/node-placement.ts', export: 'PLACEMENT_SCORE', path: ['crossing'], equals: 4000 },
      { type: 'module', file: 'web/src/node-placement.ts', export: 'PLACEMENT_SCORE', path: ['length'], equals: 1 },
      { type: 'module', file: 'web/src/node-placement.ts', export: 'PLACEMENT_SCORE', path: ['pull'], equals: 0.6 },
    ],
  },
  {
    id: 'route-constants',
    label: '弓高上限 96px',
    display: '弓高上限 96px · 平行边间距 18px · 锚点散开 14.4px（= 18 × 0.8）· 重叠容差 10px · 让开留白 10px',
    kind: 'design',
    source: '第三十九轮',
    where: 'web/src/edge-routing.ts 的 ROUTE_DEFAULTS',
    note: '2026-10 提成导出常量：条款面板原先自己写着 96px，改常量就会说谎（已改为引用同一处）。',
    docKeyword: '弓高上限 96px',
    checks: [
      { type: 'module', file: 'web/src/edge-routing.ts', export: 'ROUTE_DEFAULTS', path: ['maxBow'], equals: 96 },
      { type: 'module', file: 'web/src/edge-routing.ts', export: 'ROUTE_DEFAULTS', path: ['parallelSpacing'], equals: 18 },
      { type: 'module', file: 'web/src/edge-routing.ts', export: 'ROUTE_DEFAULTS', path: ['overlapTolerance'], equals: 10 },
      { type: 'module', file: 'web/src/edge-routing.ts', export: 'ROUTE_DEFAULTS', path: ['padding'], equals: 10 },
      { type: 'computed', name: 'product', left: { file: 'web/src/edge-routing.ts', export: 'ROUTE_DEFAULTS', path: ['parallelSpacing'] }, right: { file: 'web/src/edge-routing.ts', export: 'ROUTE_DEFAULTS', path: ['anchorSpreadFactor'] }, equals: 14.4 },
    ],
  },
  {
    id: 'camera-tween',
    label: '相机补间 460ms、ease-out cubic、中心留白 64px',
    display: '补间 460ms · ease-out cubic（1-(1-t)³）· 居中 / 适配时顶部留 64px 给 HUD',
    kind: 'design',
    source: '第四十轮',
    where: 'web/src/network.ts 的 CAMERA_TWEEN_MS / CAMERA_HUD_SPACE；缓动在 NetworkPage 的 animateCamera',
    note: '采样核对（tests/network-camera.mjs）。2026-10 提出两个常量；缓动函数仍在组件里，只能做源码检查。',
    docKeyword: '相机补间 460ms',
    checks: [
      { type: 'module', file: 'web/src/network.ts', export: 'CAMERA_TWEEN_MS', equals: 460 },
      { type: 'module', file: 'web/src/network.ts', export: 'CAMERA_HUD_SPACE', equals: 64 },
      { type: 'source', file: 'web/src/pages/NetworkPage.tsx', pattern: 'const easeOutCubic = \\(t: number\\) => 1 - \\(1 - t\\) \\*\\* 3;' },
    ],
  },
  {
    id: 'pointer-thresholds',
    label: '长按阈值 250ms、位移阈值 4px',
    display: '鼠标 / 笔 250ms / 4px；**触摸 500ms / 12px**',
    kind: 'design',
    source: '第三十、四十一轮；触摸档见 A2-11（第五十五轮）',
    where: 'web/src/pointer.ts',
    note: '原表只有鼠标那一档，A2-11 为触屏加了单独一档（系统长按语义 ~500ms、手指抖动 12px），'
      + '2026-10 核对时发现表没跟着改，已补。2026-10 从组件提到叶子模块，node 侧可直接核对。',
    docKeyword: '触摸 500ms / 12px',
    docForbidden: ['长按阈值 250ms、位移阈值 4px |'],
    checks: [
      { type: 'module', file: 'web/src/pointer.ts', export: 'PICK_HOLD_MS', equals: 250 },
      { type: 'module', file: 'web/src/pointer.ts', export: 'PICK_MOVE_TOLERANCE', equals: 4 },
      { type: 'module', file: 'web/src/pointer.ts', export: 'PICK_HOLD_MS_TOUCH', equals: 500 },
      { type: 'module', file: 'web/src/pointer.ts', export: 'PICK_MOVE_TOLERANCE_TOUCH', equals: 12 },
    ],
  },
  {
    id: 'home-veil',
    label: '首页白雾半径 58%×52%、78% 归零；浮现 720ms / 错位 60ms',
    display: '白雾 60% × 56%（中心 50% 46%）→ 78% 处不透明度归零；正文浮现 720ms；条目错位步长 60ms',
    kind: 'design',
    source: '第四十九轮（2026-10 重测）',
    where: 'web/src/styles.css 的 .home-story-act-copy 与 .home-story-point 的 animation-delay',
    note: '原表写 58%×52%，实测样式是 60%×56%（A3 那一轮改过），2026-10 更正为实测值。',
    docKeyword: '白雾 60% × 56%',
    docForbidden: ['58%×52%'],
    checks: [
      { type: 'css', file: 'web/src/styles.css', pattern: 'radial-gradient\\((\\d+)% (\\d+)% at 50% 46%', equals: '60x56' },
      { type: 'css', file: 'web/src/styles.css', pattern: '\\.home-story-act-copy[\\s\\S]{0,400}?animation: home-copy-emerge (\\d+)ms', equals: '720' },
      { type: 'source', file: 'web/src/pages/NetworkPage.tsx', pattern: 'PICK_HOLD_MS' },
    ],
  },
  {
    id: 'home-layout',
    label: '首页版心 46rem、形状让位 ±12%、文字 ±4%、标签 22 单位',
    display: '版心 46rem · 形状让位 ±12%（漂移 ±7%）· 文字层让位 ±2%（漂移 ±1%）· 标签字号 22px（文字层）',
    kind: 'design',
    source: '第五十、五十一轮；文字让位与带宽见 A3-17（第五十六轮）',
    where: 'web/src/styles.css 的 .home-story-copy-stage / .home-story-visual-layer / .home-story-label-layer',
    note: '原表写「文字 ±4%」，A3-17 把文字层的场景收到 108% 并把位移压到 ±2%（1440 下 2% ≈ 23px），'
      + '2026-10 更正为实测值。版心 46rem、形状 ±12%、标签 22px 三项未变。',
    docKeyword: '文字让位 ±2%',
    docForbidden: ['文字 ±4%'],
    checks: [
      { type: 'css', file: 'web/src/styles.css', pattern: '\\.home-story-copy-stage \\{[\\s\\S]{0,200}?width: min\\(100%, (46)rem\\)', equals: '46' },
      { type: 'source', file: 'web/src/styles.css', pattern: "\\.home-story-visual-layer\\[data-scene-side='left'\\] \\.home-story-scene \\{\\s*transform: translate\\(-50%, -50%\\) translateX\\(-12%\\)" },
      { type: 'css', file: 'web/src/styles.css', pattern: "\\.home-story-label-layer\\[data-scene-side='left'\\] \\.home-story-scene \\{[\\s\\S]{0,120}?translateX\\(-(\\d+)%\\)", equals: '2' },
      { type: 'css', file: 'web/src/styles.css', pattern: '\\.home-story-label-layer \\.home-story-scene text \\{ opacity: 0\\.95; font-size: (\\d+)px', equals: '22' },
    ],
  },
  {
    id: 'ambient-motion',
    label: '漂移周期 26s、呼吸 1.5s / 2.8s、徽标点 2.4s',
    display: '图形 / 文字漂移 26s · 拾取呼吸 1.5s · 导览呼吸 2.8s · 徽标脉冲 2.4s',
    kind: 'design',
    source: '第四十四、四十五轮',
    where: 'web/src/styles.css 的 @keyframes 使用处',
    note: '装饰性取值；reduce 模式下的处理见 styles.css 顶部的动效清单。',
    docKeyword: '漂移周期 26s',
    checks: [
      { type: 'css', file: 'web/src/styles.css', pattern: 'animation: story-drift-left (\\d+)s', equals: '26' },
      { type: 'css', file: 'web/src/styles.css', pattern: 'animation: pick-source-breathe ([\\d.]+)s', equals: '1.5' },
      { type: 'css', file: 'web/src/styles.css', pattern: 'animation: tutor-guide-breathe ([\\d.]+)s', equals: '2.8' },
      { type: 'css', file: 'web/src/styles.css', pattern: 'animation: nav-badge-pulse ([\\d.]+)s', equals: '2.4' },
    ],
  },
  {
    id: 'tutor-guide-step',
    label: '引导步进依据「有会话→第 2 步、有回合→第 3 步」',
    display: 'guideStep = 有回合 ? 3 : 有会话 ? 2 : 1',
    kind: 'design',
    source: '第四十五轮',
    where: 'web/src/pages/TutorPage.tsx 的 guideStep',
    note: '界面状态，不写 E。组件里未导出，只能做源码检查。',
    docKeyword: '有会话→第 2 步',
    checks: [
      { type: 'source', file: 'web/src/pages/TutorPage.tsx', pattern: 'const guideStep = turns\\.length > 0 \\? 3 : sessionId \\? 2 : 1;' },
    ],
  },
  {
    id: 'discipline-branches',
    label: '领域词表 9 支',
    display: '领域词表 **12 支**（分析 / 测度论 / 拓扑 / 微分几何 / 群论 / 线性代数 / 多重线性与张量代数 / 域与数系 / 集合论 / 数理逻辑 / 相对论与宇宙论 / 数学方法）',
    kind: 'measured',
    source: '第五十二轮；A1-4 拆成 12 支（第五十三轮）',
    where: 'data/fields.mjs 的 FIELD_IDS',
    note: '原表写 9 支，A1-4 把代数拆成四支之后是 12 支，2026-10 核对时更正。',
    docKeyword: '领域词表 12 支',
    docForbidden: ['领域词表 9 支'],
    checks: [
      { type: 'computed', name: 'arrayLength', module: 'data/fields.mjs', export: 'FIELD_IDS', equals: 12 },
    ],
  },
];

/** 便于文档与测试引用：登记条数与各类检查的条数。 */
export function designValueStats() {
  const checks = DESIGN_VALUES.flatMap((entry) => entry.checks);
  return {
    entries: DESIGN_VALUES.length,
    checks: checks.length,
    byType: checks.reduce((acc, check) => ({ ...acc, [check.type]: (acc[check.type] ?? 0) + 1 }), {}),
    byKind: DESIGN_VALUES.reduce((acc, entry) => ({ ...acc, [entry.kind]: (acc[entry.kind] ?? 0) + 1 }), {}),
  };
}
