import { spawn } from 'node:child_process';

const steps = [
  ['简明高等代数第一程：内容、依赖与独立有限语义', ['node', '--test', 'tests/jiang-first-stage.test.mjs']],
  ['简明高等代数第一程：桌面与手机阅读、公式与后续链接', ['node', 'tests/jiang-first-stage-page.mjs']],
  ['混合网络：身份、语义缩放、私人验证与双驱动隔离', ['node', '--test', 'tests/network-workspace.test.mjs', 'tests/network-check.test.mjs', 'tests/network-store.test.mjs', 'tests/network-api.test.mjs', 'tests/network-jobs.test.mjs']],
  ['混合网络：浏览器缩放、悬停、笔记与投稿', ['node', 'tests/network-workspace-page.mjs']],
  ['混合网络：千级双库布局、缩放、悬停与静置', ['node', 'tests/network-mixed-perf.mjs']],
  ['双模板与 Markdown 创作正文保全', ['node', '--test', 'tests/writing.test.mjs', 'tests/writing-adaptive.test.mjs']],
  ['笔记创作闭环（暂存、历史、冲突、复制与上传）', ['node', 'tests/writing-page.mjs']],
  ['私人笔记库（Obsidian、修订、分块、双驱动与恢复）', ['node', '--test', 'tests/vault.test.mjs']],
  ['私人笔记库浏览器（导入、附件、关联、刷新与上传）', ['node', 'tests/vault-page.mjs']],
  ['Lean 登记、真实证明、持久化任务与进程树取消', ['node', '--test', '--test-concurrency=1', 'tests/lean.test.mjs', 'tests/lean-live.test.mjs']],
  ['Lean 中英双语浏览器：查看断言 → 重放 → 下载报告', ['node', 'tests/lean-page.mjs']],
  ['连接条件与个人备注（身份、原子修订、撤销、双驱动与备份）', ['node', '--test', 'tests/connection-notes.test.mjs']],
  ['连接备注交互（右键、合并线、缩放与跨页面）', ['node', 'tests/connection-notes-page.mjs']],
  ['Sites 接入：GitHub 回到原浏览器、一次性凭证与账号隔离', ['node', '--test', 'tests/sites-bridge.test.mjs']],
  ['维护命令（异步存储、演示去重与备份恢复）', ['node', '--test', 'tests/maintenance-cli.test.mjs']],
  ['公开导出边界（缓存、凭据、必需文件与目录联接）', ['node', '--test', 'tests/release-export.test.mjs']],
  /*
   * 形式层与自动发现：这三组是「自动关系发现」首版的验收面。
   * 与其它步骤分开列，是因为它们的失败语义不同——形式层失败说明语法/类型口径有问题，
   * 引擎失败说明证明生成或核对有问题，有限语义失败说明独立求值器与被检查的内核不一致。
   * 都不该被"别处还绿着"掩盖。
   */
  ['形式语言层（语法、类型、α 规范、证书桥）', ['node', '--test', 'tests/formal-language.test.mjs']],
  ['放缩关系合并（方向、原证据、旧记录兼容与逆命题）', ['node', '--test', 'tests/scaling.test.mjs']],
  ['定义引用的可信性（局部变量不得生成跨节点依赖）', ['node', '--test', 'tests/definition-reference.test.mjs']],
  ['独立有限语义（模 5 单位群 / S₃，不导入检查器）', ['node', '--test', 'tests/finite-models.test.mjs']],
  ['四案例形式表达登记', ['node', '--test', 'tests/formal-cases.test.mjs']],
  ['发现引擎（合一、有界搜索、证书装配、目标核对）', ['node', '--test', 'tests/relation-engine.test.mjs']],
  ['自动关联：存储、发布事务与回滚', ['node', '--test', 'tests/formal-authoring-api.test.mjs']],
  ['新节点闭环：草稿 → 任务 → 后台结算（P1-3/4/5）', ['node', '--test', 'tests/relation-cycle.mjs']],
  ['证书交接与发布：采纳一条真实关系（P1-6）', ['node', '--test', 'tests/publication-cycle.mjs']],
  ['快照完整性：失败即拒绝生效（P1-2/7）', ['node', '--test', 'tests/snapshot-integrity.mjs']],
  ['四案例端到端：输入 → 发现 → 重放 → 入库 → 撤出', ['node', '--test', 'tests/relation-discovery-e2e.mjs']],
  ['自动关联页（六步、窄屏、键盘、节点页入口）', ['node', 'tests/authoring-page.mjs']],
  ['领域内核与理论边界', ['node', '--test', 'tests/core.test.mjs', 'tests/planner.test.mjs', 'tests/localization.test.mjs', 'tests/tutor.test.mjs', 'tests/relation-visual.test.mjs', 'tests/example-paths.test.mjs', 'tests/example-combined.test.mjs', 'tests/stage-arrow.test.mjs', 'tests/dot-labels.test.mjs', 'tests/node-groups.test.mjs', 'tests/tutor-critique.test.mjs', 'tests/node-placement.test.mjs', 'tests/network-repel.test.mjs', 'tests/edge-routing.test.mjs', 'tests/edge-merge.test.mjs', 'tests/network-stress.test.mjs', 'tests/a11y-contrast.test.mjs', 'tests/context-budget.test.mjs', 'tests/maintenance.test.mjs', 'tests/label-option-scan.test.mjs', 'tests/design-values.test.mjs', 'tests/thread-layer.test.mjs', 'tests/relation-coverage.test.mjs', 'tests/construct-registry.test.mjs']],
  /*
   * 从零走一遍范例路径（2026-10-13 加）：单独一步，失败语义与「领域内核」那一步不同。
   *
   * 那一步直接调内核函数核对每一程能不能规划；这一步走的是**真 HTTP 接口 + 档案事件**：
   * 建空白档案 → 只确认起点 → 逐程规划（背景由服务端从档案的确认记录派生）→ 逐条确认产出 → 下一程，
   * 并把走通记录写成 Markdown 再逐项核对。它红了说明**这条路走不通了**——
   * 某一程不再 Found、起点累进不对、事件数与范例声明漂开，或「走完之后主目标已达成」不再成立。
   */
  ['从零走一遍范例路径（真接口：七程规划 + 档案确认 + 走通记录）', ['node', '--test', 'tests/walk-example-path.test.mjs']],
  /*
   * 中英双语：语言覆盖的机制与接口。
   *
   * 与其它步骤分开列，是因为失败语义不同——这一步红说明**语言层**有问题
   * （中英本体版本不一致、覆盖写错、语种没有贯穿到接口），而不是数学内容或界面样式。
   * 译文质量不在这一步检查（人工作业，见 `data/i18n/` 各文件的说明）。
   */
  ['中英双语：语言覆盖与接口语种', ['node', '--test', 'tests/i18n-core.test.mjs', 'tests/i18n-api.test.mjs']],
  ['中英双语：结构对等与覆盖率', ['node', 'scripts/i18n-parity.mjs', '--locale', 'en']],
  ['中英双语：正文块公式逐字核对', ['node', 'scripts/i18n-block-check.mjs', '--locale', 'en']],
  ['本机 API 与数据库', ['node', 'tests/api.test.mjs']],
  ['部署边界（公网模式缺账号体系必须拒绝启动、Host 白名单、写来源、安全头）', ['node', '--test', 'tests/deployment.test.mjs']],
  ['账号与权限（公网模式：登录、越权 404、管理员 403、CSRF、任务配额）', ['node', '--test', 'tests/auth.test.mjs']],
  ['账号入口（本机模式不加登录墙：登录页说明、页头无入口、档案列表照常加载）', ['node', 'tests/auth-page.mjs']],
  ['公网 HTTPS 端到端（自签证书 + 真浏览器：Secure Cookie、CSRF、退出、http 走不通）', ['node', 'tests/https-public.mjs']],
  ['PostgreSQL 存储层（去重、乐观锁、分页、导出完整、备份恢复、事务隔离）', ['node', '--test', 'tests/postgres-store.test.mjs']],
  ['浏览器交互与响应式', ['node', 'tests/browser.mjs']],
  ['动效覆盖面（prefers-reduced-motion 全站核对）', ['node', 'tests/motion-coverage.mjs']],
  ['性能观测（227 节点视图的耗时与长任务）', ['node', 'tests/network-perf.mjs']],
  ['首页六幕叙事（主题 → 愿景）', ['node', 'tests/home-narrative.mjs']],
  ['开始学习页（各角度入口）', ['node', 'tests/start-page.mjs']],
  ['数学对象列表页（可达性与学习状态）', ['node', 'tests/node-list.mjs']],
  ['分面选项（不许有筛不出东西的选项）', ['node', 'tests/facets.mjs']],
  ['单元 / 话题分层与本质领域分类', ['node', 'tests/granularity-fields.mjs']],
  ['知识网络：左键按住取强关联节点（含高亮视觉）', ['node', 'tests/network-picker.mjs']],
  ['知识网络：移动端双指缩放（触屏手势与窄屏坐标系）', ['node', 'tests/network-pinch.mjs']],
  ['方法库（带简介的栏目与细致解析）', ['node', 'tests/method-library.mjs']],
  ['用户手册（入口、章节锚点、双语与响应式）', ['node', 'tests/manual-page.mjs']],
  ['重要节点的形式表达（LaTeX 与记号）', ['node', 'tests/formal-statements.mjs']],
  ['知识网络：新增节点的自动摆位', ['node', 'tests/network-placement.mjs']],
  /*
   * 摆位模式（2026-10-11 加）：学习顺序 / 逻辑核心两种重排规则。两步分开列，失败语义不同——
   * 纯函数那一步红了说明**判据**算错（层号、核心程度、分圈、让位、确定性），
   * 真浏览器那一步红了说明**用户看得见的那条链**断了一环（下拉没渲染、切了没重排、
   * 锚点选了不生效、手动位置被规则覆盖、刷新不记得、英文站没换措辞）。
   */
  ['知识网络：摆位模式的两条规则（分层 / 分圈、让位与确定性）', ['node', '--test', 'tests/network-order.test.mjs']],
  ['知识网络：摆位模式的界面（切换、选锚点、手动优先、刷新记得）', ['node', 'tests/network-order-page.mjs']],
  ['知识网络：边的颜色与遮挡关系', ['node', 'tests/network-edges.mjs']],
  ['知识网络：加节点后相机平滑居中', ['node', 'tests/network-camera.mjs']],
  ['知识网络：保存 / 载入视图（写 E，不改本体）', ['node', 'tests/network-views.mjs']],
  ['知识网络：视图搜索、排序、同名提示与快照边界', ['node', 'tests/network-view-library.mjs']],
  /*
   * 右键节点菜单（2026-10 加）：一键加入全部硬前置 / 从视图移出。
   * 单独一步，失败语义与手势那几步不同——它红了说明**从节点出发做事**这条交互坏了
   * （菜单没开、闭包算错、加进去的集合与本体不一致），而不是候选排序或拖动。
   */
  ['知识网络：右键节点菜单（一键加入全部硬前置）', ['node', 'tests/network-node-menu.mjs']],
  /*
   * 网络页占满工作区（2026-10-12 加）：用户要求画布吃掉「除边栏以外的全部空间」。
   * 它红了说明这一页又多出滚动条（画布之外冒出了别的内容），或窄屏那一档的卡片版式被改坏。
   */
  ['知识网络：画布占满工作区（桌面不滚动 / 窄屏仍是卡片）', ['node', 'tests/network-fullbleed.mjs']],
  /*
   * 「回到网络视图」（2026-10 加）：单独两步。
   *
   * 纯函数那一步（`network-return.test.mjs`）红了说明来路上下文的**取舍**算错了
   * （该存的没存、没来路时编了一个假地址、语种没跟着走）；
   * 真浏览器那一步（`network-return-page.mjs`）红了说明用户看得见的那条链断了一环
   * （网络里的链接没带来路标记、点回去到了另一张图、英文站跳回中文页）。
   * 两步的失败语义不同，因此分开列。
   */
  ['知识网络：回到网络视图的来路上下文（该存的存、该退的退、语种跟着走）', ['node', '--test', 'tests/network-return.test.mjs']],
  ['知识网络：从节点页回到同一张图（真浏览器）', ['node', 'tests/network-return-page.mjs']],
  /*
   * 本次学习的暂存与自动恢复（2026-10-13 加）：用户要求「一次学习中搭建的网络视图要暂时
   * 保存下来，不能有切到另外一个页面之后就需要重新搭建的情况」。两步分开列，失败语义不同——
   * 纯函数那一步红了说明**存储边界**算错了（该退的没退、坏数据没兜住、边源键与渲染表漂开），
   * 真浏览器那一步红了说明**用户看得见的那条链**断了一环（切页回来变空画布、相机没回来、
   * 显式链接被暂存劫持、丢弃之后又自己长回来、「清空」把暂存一起带走）。
   */
  ['知识网络：本次学习的暂存（存储边界、坏数据、键与边源表一致）', ['node', '--test', 'tests/network-draft.test.mjs']],
  ['知识网络：切页回来自动恢复同一张图（真浏览器）', ['node', 'tests/network-draft-page.mjs']],
  /*
   * 检索的相关性排序（2026-10-12 加）：单独一步。
   *
   * 它红了说明「搜出来的东西为什么是这个次序」这条判据出了问题——判据被改动、
   * 或**服务端与前端两份实现漂开**（前端不能引 `shared/*.mjs`，等价性只能靠断言守），
   * 而不是页面样式或渲染的问题。
   */
  ['检索：相关性排序与两处实现一致（命中字段 / 完整度 / 位置 / 连续性）', ['node', '--test', 'tests/search-rank.test.mjs']],
  /*
   * 检索次序的**界面**那一侧：红了说明分类面板里搜出来的次序不对，或命中理由没写出来
   * （用户报的就是这一处：「搜『紧』时前几条是广义 Stokes 定理、单位分解」）。
   */
  ['检索：「全部节点」面板的次序与命中理由（真浏览器）', ['node', 'tests/search-order.mjs']],
  ['本体：硬前置关系（覆盖各案例核心的定义依赖与证明依赖）', ['node', 'tests/hard-prereq.mjs']],
  /*
   * 硬前置闭包（2026-10 加）：右键菜单那一项的算法本体。与上一条（关系本身的登记口径）
   * 分开列：一条红了说明「哪些边算硬前置」这件事有争议，另一条红了说明「从节点往回收集」算错了。
   */
  ['本体：硬前置闭包（传递、方向、确定性、成环与上限）', ['node', '--test', 'tests/hard-prereq-closure.test.mjs']],
  /*
   * 节点合并（2026-10）：同一对象在多处登记过，装配期收口成一个规范节点。
   * 单独一步，是因为它的失败语义不同——它红了说明**身份、内容或改写**有一处不对
   * （被合并的 id 还在当引用、正文块丢了、差别没写、或者该分开的节点被并了），
   * 而不是某个案例的内容写错了。
   */
  ['本体：同一对象的多处登记合并（身份、内容与改写）', ['node', '--test', 'tests/merge-consistency.mjs']],
  ['本体：点集拓扑案例（12 项点名单 → 节点）', ['node', '--test', 'tests/topology-case.mjs']],
  /*
   * 强关联圈的候选判据（2026-10 加）：单独一步。
   *
   * 它红了说明「长按节点摊开的邻居」与本体登记脱节（用户报过「长按紧致性怎么没有 σ-紧和仿紧」）。
   * 只查判据与权重，不开浏览器——真浏览器那一条在 `tests/network-picker.mjs` 里。
   */
  ['本体：强关联圈的候选判据（长按节点摊开哪些邻居）', ['node', '--test', 'tests/node-related.test.mjs']],
  /*
   * 起始节点与档案模板（2026-10 加）：单独一步，失败语义与别处不同——
   * 它红了说明「保证前置已学过」这句话在某条模板或某条契约上不成立，
   * 而不是界面样式或渲染的问题。
   */
  ['起始节点与档案模板（前置已确认的判据）', ['node', '--test', 'tests/starting-nodes.test.mjs']],
  /*
   * 学习方向与并行节点的排序（2026-10 加）：单独一步，失败语义与别处不同——
   * 它红了说明「下一步该学什么」这句话的依据出了问题（判据与起始节点漂开、排序判据算错、
   * 依据句的数字与派生数量不符），而不是页面样式或渲染的问题。
   */
  ['学习方向与并行节点排序（可用集合、排序判据与分档）', ['node', '--test', 'tests/direction.test.mjs']],
  ['学习方案（AND/OR、硬前置、兴趣排序与有效调整）', ['node', '--test', 'tests/learning-plan.test.mjs']],
  ['学习方案保存（SQLite / PostgreSQL、冲突与备份往返）', ['node', '--test', 'tests/learning-plan-store.test.mjs']],
  ['辅导页：DeepTutor 提示、介绍与三步引导', ['node', 'tests/tutor-page.mjs']],
  ['学习引导（双入口 → 方案 → 阅读，跨设备与双语）', ['node', 'tests/learning-guide.mjs']],
  ['十二学科导读：数据、API 与纯函数网络', ['node', '--test', 'tests/field-guides.test.mjs']],
  ['十二学科导读：浏览、兴趣与目标，双语和响应布局', ['node', 'tests/field-guides-page.mjs']],
  ['学习引导：搜索截断与英文未译标注', ['node', 'tests/learning-guide-i18n.mjs']],
  /*
   * 方向派生（兼容保留）：单独一步，失败语义与双入口引导不同——
   * 它红了说明**方向卡片上的数字与本体脱节**（学科分布把背景接口算进内容、
   * 兴趣没参与排序、成环时伪造了次序、目标 id 与本体漂开），而不是引导交互坏了。
   * 纯函数，node 直接加载 `web/src/start-direction.ts`，不开浏览器。
   */
  ['开始学习页：方向派生（次级学科、已有目标与兴趣排序）', ['node', '--test', 'tests/start-direction.test.mjs']],
  /*
   * 同一模块的**自足夹具**验收（2026-10-11 加）：不读任何 `data/`，因此
   * 装配链上有文件暂时坏掉时它照样能跑，用来区分「判据本身错了」与「数据坏了」。
   * 与上一步的分工：上一步在真实本体上核对数字；这一步用最小夹具核对判据。
   */
  ['开始学习页：方向派生（自足夹具，不依赖语料）', ['node', '--test', 'tests/start-direction-fixture.test.mjs']],
  /*
   * 中英双语浏览器验收：`/en` 深链、切换按键、切过去内容真的变、查询串保住、无控制台错误。
   * 它**需要先 `npm run build`**（服务端跑的是构建产物）；构建失败时它看到的是旧界面，
   * 会报「顶栏没有切换按键」——那是构建的问题，不是语言层的问题。
   */
  ['中英双语：英文站与切换按键（真浏览器）', ['node', 'tests/i18n-en.mjs']],
  ['研究台（前沿研究）与网站维护（专稿 / arXiv 梳理）', ['node', 'tests/research-maintenance.mjs']],
];

function run(name, command) {
  return new Promise((resolvePromise, rejectPromise) => {
    console.log(`\n=== ${name} ===`);
    const child = spawn(command[0], command.slice(1), { stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('exit', (code) => (code === 0 ? resolvePromise() : rejectPromise(new Error(`${name} 失败，退出码 ${code}`))));
    child.on('error', rejectPromise);
  });
}

// Resume only at an exact, named stage; retained earlier logs are part of the evidence.
const from = process.env.MCS_WEB_TEST_FROM;
const start = from ? steps.findIndex(([name]) => name === from) : 0;
if (start < 0) throw new Error('Unknown MCS_WEB_TEST_FROM stage: ' + from);
if (start) console.log(`从「${steps[start][0]}」继续验收；前 ${start} 组需保留先前通过日志。`);
for (const [name, command] of steps.slice(start)) await run(name, command);
console.log(start ? '\n本段 mcs-web 验收通过（前段结果见保留日志）。' : '\n全部 mcs-web 验收通过。');
