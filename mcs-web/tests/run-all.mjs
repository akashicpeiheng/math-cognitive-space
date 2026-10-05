import { spawn } from 'node:child_process';

const steps = [
  ['维护命令（异步存储、演示去重与备份恢复）', ['node', '--test', 'tests/maintenance-cli.test.mjs']],
  ['公开导出边界（缓存、凭据、必需文件与目录联接）', ['node', '--test', 'tests/release-export.test.mjs']],
  /*
   * 形式层与自动发现：这三组是「自动关系发现」首版的验收面。
   * 与其它步骤分开列，是因为它们的失败语义不同——形式层失败说明语法/类型口径有问题，
   * 引擎失败说明证明生成或核对有问题，有限语义失败说明独立求值器与被检查的内核不一致。
   * 都不该被"别处还绿着"掩盖。
   */
  ['形式语言层（语法、类型、α 规范、证书桥）', ['node', '--test', 'tests/formal-language.test.mjs']],
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
  ['领域内核与理论边界', ['node', '--test', 'tests/core.test.mjs', 'tests/planner.test.mjs', 'tests/localization.test.mjs', 'tests/tutor.test.mjs', 'tests/relation-visual.test.mjs', 'tests/example-paths.test.mjs', 'tests/stage-arrow.test.mjs', 'tests/node-groups.test.mjs', 'tests/tutor-critique.test.mjs', 'tests/node-placement.test.mjs', 'tests/edge-routing.test.mjs', 'tests/edge-merge.test.mjs', 'tests/network-stress.test.mjs', 'tests/a11y-contrast.test.mjs', 'tests/context-budget.test.mjs', 'tests/maintenance.test.mjs', 'tests/label-option-scan.test.mjs', 'tests/design-values.test.mjs', 'tests/thread-layer.test.mjs', 'tests/relation-coverage.test.mjs', 'tests/construct-registry.test.mjs']],
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
  ['方法库（带简介的栏目与细致解析）', ['node', 'tests/method-library.mjs']],
  ['重要节点的形式表达（LaTeX 与记号）', ['node', 'tests/formal-statements.mjs']],
  ['知识网络：新增节点的自动摆位', ['node', 'tests/network-placement.mjs']],
  ['知识网络：边的颜色与遮挡关系', ['node', 'tests/network-edges.mjs']],
  ['知识网络：加节点后相机平滑居中', ['node', 'tests/network-camera.mjs']],
  ['知识网络：保存 / 载入视图（写 E，不改本体）', ['node', 'tests/network-views.mjs']],
  ['本体：硬前置关系（只覆盖两个案例的核心）', ['node', 'tests/hard-prereq.mjs']],
  ['辅导页：DeepTutor 提示、介绍与三步引导', ['node', 'tests/tutor-page.mjs']],
  ['开始学习页：偏好引导（三问 → 你的起点）', ['node', 'tests/start-chooser.mjs']],
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

for (const [name, command] of steps) await run(name, command);
console.log('\n全部 mcs-web 验收通过。');



