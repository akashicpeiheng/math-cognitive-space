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
export const DESIGN_CHECK_TYPES = ['module', 'css', 'css-block', 'source', 'computed'];

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
    display: '关系色最小色相间隔 6°（analogy→scaling）· 契约色最小 18°（method→construction）',
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
    label: '相机补间 460ms、ease-out cubic、中心留白至少 64px（HUD 更高时按实测）',
    display: '补间 460ms · ease-out cubic（1-(1-t)³）· 居中 / 适配时顶部留白 = **max(64px, 实测 HUD 高度 + 8px)**',
    kind: 'design',
    source: '第四十轮；实测留白见第一百零一轮（2026-10-11）',
    where: 'web/src/network.ts 的 CAMERA_TWEEN_MS / CAMERA_HUD_SPACE；缓动在 NetworkPage 的 animateCamera，'
      + '顶部留白在 NetworkPage 的 hudSpace（HUD 高度用 ResizeObserver 量）',
    note: '采样核对（tests/network-camera.mjs）。2026-10 提出两个常量；缓动函数仍在组件里，只能做源码检查。'
      + '第一百零一轮把「中心留白 64px」降级成**下界**：HUD 是压在画布上的浮层，实测 1500px 下已 114px、'
      + '1024px 下 159px，固定 64px 意味着内容顶部一直被压着（往 HUD 里加两个控件就当场压住了一张卡片）。'
      + '现在按量到的高度 + 8px 间隙算，首帧仍用 64px 兜底；窄屏 HUD 在画布下面排着，留白照样是 0。',
    docKeyword: '中心留白至少 64px',
    docForbidden: ['中心留白 64px'],
    checks: [
      { type: 'module', file: 'web/src/network.ts', export: 'CAMERA_TWEEN_MS', equals: 460 },
      { type: 'module', file: 'web/src/network.ts', export: 'CAMERA_HUD_SPACE', equals: 64 },
      { type: 'source', file: 'web/src/pages/NetworkPage.tsx', pattern: 'const easeOutCubic = \\(t: number\\) => 1 - \\(1 - t\\) \\*\\* 3;' },
      { type: 'source', file: 'web/src/pages/NetworkPage.tsx', pattern: 'Math\\.max\\(CAMERA_HUD_SPACE, hudHeight > 0 \\? hudHeight \\+ HUD_SPACE_GAP : 0\\)' },
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
    note: '原表写 58%×52%，实测样式是 60%×56%（A3 那一轮改过），2026-10 更正为实测值。'
      + '2026-10-12：第二条检查从「定长窗口」改成 `css-block`（在规则的声明块里匹配）——'
      + '原先往规则里加一段注释就会让它失败，实测选择器到声明之间长到 423 字、窗口只有 400。',
    docKeyword: '白雾 60% × 56%',
    docForbidden: ['58%×52%'],
    checks: [
      { type: 'css', file: 'web/src/styles.css', pattern: 'radial-gradient\\((\\d+)% (\\d+)% at 50% 46%', equals: '60x56' },
      { type: 'css-block', file: 'web/src/styles.css', selector: '.home-story-act-copy', pattern: 'animation: home-copy-emerge (\\d+)ms', equals: '720' },
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
  {
    id: 'direction-bounds',
    label: '方向预览 5 步、并行门槛 2 条',
    display: '方向预览最多 **5 步**（`DIRECTION_BOUNDED_STEPS`）· 「有选择」的门槛是**方向核心里有 2 条现在就能学**（`PARALLEL_THRESHOLD`）',
    kind: 'design',
    source: '第九十七轮（2026-10-11，学习方向与并行节点排序）',
    where: 'web/src/direction.ts 的 DIRECTION_BOUNDED_STEPS / PARALLEL_THRESHOLD',
    note: '两个数都是**尺度**，不是结论：5 步是「一次坐下」的预览上限（不是路线长度）；'
      + '门槛取 2 的理由是「只要存在第二条通向方向的路，按兴趣分配才有意义」——'
      + '取 3 会把「二选一」这种真实场面说成「没得选」。两个常量都从代码导出，改一处表就红。',
    docKeyword: '方向预览 5 步',
    checks: [
      { type: 'module', file: 'web/src/direction.ts', export: 'DIRECTION_BOUNDED_STEPS', equals: 5 },
      { type: 'module', file: 'web/src/direction.ts', export: 'PARALLEL_THRESHOLD', equals: 2 },
    ],
  },
  {
    id: 'network-order-layout',
    label: '摆位模式：行距 46px / 列距 36px / 一层最多 10 列（超出折行）/ 圈距 210px / 每卡最小弦长 200px',
    display: '学习顺序：行距 46px、列距 36px、**一层最多 10 列**（超出折到下一行）、左上留白 28px；'
      + '逻辑核心：圈距 210px、同一圈相邻卡片的最小弦长 200px（弦长 > √(172²+58²) ≈ 182，构造上不压卡片）',
    kind: 'design',
    source: '第一百零一轮（2026-10-11，网络视图的两种重排模式）',
    where: 'web/src/network-order.ts 的 ORDER_LAYOUT',
    note: '都按「读得出来」定，不是实验结论：'
      + '① 最小弦长取 200 而不是刚好不压的 182，是因为容量公式用反正弦（小圈上弦长与半径非线性），留 10% 余量；'
      + '② 一层最多 10 列是**视口约束**：不折行时一层能铺到两万像素宽，在 `ZOOM_MIN`（0.25）下无论怎么适配都看不全；'
      + '③ PageRank 的 0.85 / 40 轮按惯例取定，固定轮数（不是「收敛就停」）是为了同一输入必得同一串浮点运算。',
    docKeyword: '摆位模式：行距 46px',
    checks: [
      { type: 'module', file: 'web/src/network-order.ts', export: 'ORDER_LAYOUT', path: ['rowGap'], equals: 46 },
      { type: 'module', file: 'web/src/network-order.ts', export: 'ORDER_LAYOUT', path: ['columnGap'], equals: 36 },
      { type: 'module', file: 'web/src/network-order.ts', export: 'ORDER_LAYOUT', path: ['maxColumns'], equals: 10 },
      { type: 'module', file: 'web/src/network-order.ts', export: 'ORDER_LAYOUT', path: ['ringStep'], equals: 210 },
      { type: 'module', file: 'web/src/network-order.ts', export: 'ORDER_LAYOUT', path: ['minChord'], equals: 200 },
      { type: 'module', file: 'web/src/network-order.ts', export: 'ORDER_LAYOUT', path: ['margin'], equals: 28 },
    ],
  },
  {
    id: 'scaling-taper',
    label: '放缩关系的粗细变化：一般端 ×2.2、特殊端 ×0.5（相对本档线宽）+ 细端小箭头',
    display: '放缩关系（`scaling`）的箭头一头粗一头细：**一般端 ×2.2、特殊端 ×0.5**'
      + '（倍数是相对该边所属档位的线宽，实测 core 5.01px → 一般端 11.02px、特殊端 2.51px），'
      + '细端再换一支**更细长的专用箭头**（`markerWidth` 6、横向 2.04px；档位箭头是横向 10.14px）',
    kind: 'design',
    source: '第一百零二轮（2026-10-11，放缩箭头的视觉优化；同日按用户反馈「还是两头一样粗」改过一次）',
    where: 'web/src/relation-visual.ts 的 SCALING_TAPER / scalingTaperArrowWidth / TAPER_ARROW_PATH；'
      + '几何在 web/src/edge-routing.ts 的 taperedOutline',
    note: '用户的要求：「增加粗细变化，泛化方向变粗，特化方向变细」。'
      + '用**倍数**而不是绝对像素：线宽已经由「关系强度 × 见证状态」决定，粗细变化只该是这条边内部的第二层信息（方向），'
      + '不该覆盖第一层（强弱）——两条不同档位的放缩边因此仍保持原有的强弱差（由 tests/relation-visual.test.mjs 断言）。'
      + '**第一版取 1.6 / 0.6，用户当场否掉（「还是两头一样粗」）**：箭头是固定像素的，core 档箭头的横向宽度 10.14px '
      + '比粗端（8.02px）还宽，细端被箭头重新撑粗。现在两头一起改：一般端 ×2.2（11.0px）明显宽于箭头，'
      + '细端换成横向只有 2.04px 的细长箭头——两端**看得见的**宽度比因此有 4.4:1（有断言，'
      + '`tests/relation-visual.test.mjs` 与 `tests/network-edges.mjs` 各一条）。'
      + '倍数上界取 2.2 是「不抢最硬层级注意力」的界限：core 档放缩边的粗端 11.0px ≈ 硬前置（5.06px）的两倍，'
      + '再粗就会盖过「核心断言」那一档。细端下界 0.5 是「不细到看不见」的界限。'
      + '方向未核验的旧记录（11 条）不做变化——不知道哪端是一般端就不假装知道。',
    docKeyword: '一般端 ×2.2、特殊端 ×0.5',
    checks: [
      { type: 'module', file: 'web/src/relation-visual.ts', export: 'SCALING_TAPER', path: ['general'], equals: 2.2 },
      { type: 'module', file: 'web/src/relation-visual.ts', export: 'SCALING_TAPER', path: ['special'], equals: 0.5 },
      { type: 'source', file: 'web/src/relation-visual.ts', pattern: 'Math\\.min\\(9, Math\\.max\\(6, Math\\.round\\(thinWidth \\* 2\\.4\\)\\)\\)' },
      { type: 'source', file: 'web/src/relation-visual.ts', pattern: "TAPER_ARROW_PATH = 'M 0\\.6 3\\.3 L 9\\.4 5 L 0\\.6 6\\.7 z'" },
    ],
  },
  {
    id: 'dark-theme-surfaces',
    label: '暗色纸面与墨色：深底浅字，判据与浅色同一套',
    display: '深色纸面 #14101f · 卡片 #1e1830 · 画布 #191331 · 墨色 #f2eefb · 弱化墨 #a79fc4 · '
      + '实心底（--accent-fill #6d28d9 / --green-fill #0f7a52）两种外观共用',
    kind: 'design',
    source: '第一百零九轮（2026-10-16，暗色主题）',
    where: "web/src/styles.css 的 html[data-theme='dark']；镜像在 web/src/theme.ts 的 THEME_DARK",
    note: '深色不是「把浅色涂黑」：色相仍锁在紫族（深靛纸 + 近白墨），只是明暗关系反过来。'
      + '取值按与浅色**同一套**判据选，不是凭手感：文字令牌对四种深色底 ≥4.5:1（`--ink-faint` 实测 5.48–7.48）、'
      + '关系色/契约色对深色画布 ≥3:1（最低 3.55）、卡片文字对 10 色话题底与 12 色构造底 ≥4.5:1（最低 7.05）。'
      + '凡是「当实心底、上面压白字」的令牌（`--accent-fill`、`--green-fill`）**两种外观取值相同**：'
      + '主题色同时兼任「文字色」与「实心底」两种角色，而两者对明暗的要求相反，混用会让深色下的白字掉到 4.5:1 以下。'
      + '判据由 `tests/a11y-contrast.test.mjs` 对两套外观各跑一遍，令牌成对与镜像一致由 `tests/theme-tokens.test.mjs` 断言。',
    docKeyword: '深色纸面 #14101f',
    checks: [
      { type: 'css-block', file: 'web/src/styles.css', selector: "html[data-theme='dark']", pattern: '--bg:\\s*(#[0-9a-f]{6})', equals: '#14101f' },
      { type: 'css-block', file: 'web/src/styles.css', selector: "html[data-theme='dark']", pattern: '--canvas:\\s*(#[0-9a-f]{6})', equals: '#191331' },
      { type: 'css-block', file: 'web/src/styles.css', selector: "html[data-theme='dark']", pattern: '--ink:\\s*(#[0-9a-f]{6})', equals: '#f2eefb' },
      { type: 'css-block', file: 'web/src/styles.css', selector: "html[data-theme='dark']", pattern: '--ink-faint:\\s*(#[0-9a-f]{6})', equals: '#a79fc4' },
      { type: 'css-block', file: 'web/src/styles.css', selector: ":root", pattern: '--accent-fill:\\s*(#[0-9a-f]{6})', equals: '#6d28d9' },
      { type: 'module', file: 'web/src/theme.ts', export: 'THEME_DARK', path: ['surface'], equals: '#1e1830' },
    ],
  },
  {
    id: 'scale-lod',
    label: '尺度视图：90% / 55% / 30%、320px 邻近、0.06 滞后、卡片 160/196/224',
    display: '分子 ≤90% → 节点 · 节点 ≤55% → 单元 · 单元 ≤30% → 话题 · 同屏包围盒 ≤320px · 滞后 0.06',
    kind: 'design',
    source: '第一百一十轮（2026-10-17，四层尺度视图）',
    where: 'web/src/scale-network.ts 的 SCALE_LOD / SCALE_CARD_PX / SCALE_DOCK',
    note: '阈值按「卡片上的字还读不读得出来」定：分子是明细，最早收；节点到 55% 已是圆点而单元标题仍可读；'
      + '单元到 30% 再收进话题。`nearPx` 是「临近」的唯一判据——成员在当前缩放下的屏幕包围盒两个方向都 ≤320px 才合并，'
      + '成员分散时如实保留、不强行并。0.06 的滞后带防止阈值附近来回抖。卡片宽高是**屏幕像素**，'
      + '外层反缩放后 25% 下仍可读。判据由 `tests/scale-network.test.mjs` 与 `tests/network-scale.mjs` 核对。',
    docKeyword: '尺度视图：90% / 55% / 30%',
    checks: [
      { type: 'module', file: 'web/src/scale-network.ts', export: 'SCALE_LOD', path: ['molecule'], equals: 0.9 },
      { type: 'module', file: 'web/src/scale-network.ts', export: 'SCALE_LOD', path: ['node'], equals: 0.55 },
      { type: 'module', file: 'web/src/scale-network.ts', export: 'SCALE_LOD', path: ['unit'], equals: 0.3 },
      { type: 'module', file: 'web/src/scale-network.ts', export: 'SCALE_LOD', path: ['nearPx'], equals: 320 },
      { type: 'module', file: 'web/src/scale-network.ts', export: 'SCALE_LOD', path: ['hysteresis'], equals: 0.06 },
      { type: 'module', file: 'web/src/scale-network.ts', export: 'SCALE_CARD_PX', path: ['molecule', 'w'], equals: 160 },
      { type: 'module', file: 'web/src/scale-network.ts', export: 'SCALE_CARD_PX', path: ['unit', 'w'], equals: 196 },
      { type: 'module', file: 'web/src/scale-network.ts', export: 'SCALE_CARD_PX', path: ['topic', 'w'], equals: 224 },
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
