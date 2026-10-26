# 对象本体与学习节点分离：交付核验

日期：2026-10-18。本次是局部贯通试点：8 个数学对象、3 篇公共阅读节点，同一份 Markdown 通过网站与 Obsidian 共享实现识别。五级判定只读取形式表达、签名、类型和模块接口，不读取教学目标或个人状态。

## 已核验

| 项目 | 结果与入口 |
|---|---|
| 共享协议与 API | 15 项测试通过；类型错误、未知符号/类型、展开、循环、成员、交叉归属、精确引用、文件移动、重复 ID、版本、M/L/E 隔离、审阅过期与只读 API；tests/content-documents.test.mjs、content-api.test.mjs |
| 网站构建与检查 | npm run build、npm run check 通过；原有资源分块提示仍存在 |
| 网站完整回归 | npm test 的 93 个阶段均通过；保留已通过前段并在修复后从准确阶段续跑，覆盖记录在 mcs-web/runtime/content-qa/regression.json；最终解析器另重跑 32 项协议、API、Lean 输入测试 |
| 公网发布 | Vercel 生产部署 `dpl_4intchuS68DmZUSSZxFpdGmxm51y` 已别名到 https://mathcognitivespace.com；对象 API 返回 8 个对象、三个阅读节点与五级尺度，单射对象详情返回三篇讲解、准确 Lean 目标、当前报告和 pending 人工审阅 |
| 公网浏览器 | 真实 Chromium 通过 `/objects` 五级目录、对象详情、准确 Lean 目标、三篇阅读跳转、390px 窄屏与 `/en/objects`；记录见 mcs-web/runtime/content-qa/public-object-browser.json |
| 网站新流程 | tests/content-page.mjs 通过：五级目录→对象→准确 Lean 目标→多篇阅读→对象；中文、英文导航与 390px 窄屏 |
| Obsidian 工程 | npm run build、npm run check、npm test 通过；47 项测试，原内容包身份保持 |
| Obsidian 桌面 | scripts/content-desktop-check.mjs 通过：独立测试库、内置/本地 Markdown、两个原生接口面板、相互跳转、摘要一致、错误拒绝与修复后重读；未操作真实个人库 |
| 五级理论有限检查 | [9 组检查](../mcs-foundations/validation/REPORT-scale-model.md)通过，独立穷举 734 个 1–3 元右单位运算及一个删条件反例；有限检查不替代一般证明 |
| 理论正文与旧结构回归 | [16 组检查](../mcs-foundations/validation/REPORT.md)通过；237 个声明索引、36 个局部化方案、4 个案例；旧夹具明确保留旧兼容语义 |
| Lean 真实重放 | 两组八目标通过构建、独立目标匹配、公理白名单与内核重放；当前报告见 [单射性](../mcs-foundations/lean/reports/lean-group-injective.json)、[闭包性质](../mcs-foundations/lean/reports/lean-closure-8-8.json) |

本机图像与运行记录分别在 mcs-web/runtime/content-qa/、mcs-obsidian/runtime/content-desktop-report.json；它们是派生验收材料，不是 Markdown 修订源。

## 版本与证据边界

- 数学库版本：`sha256:01ba0726a4caafa546287630ea2bb2a7999e83970a029699fe6a279ca9b98f5d`。
- 阅读库版本：`sha256:21bf143be9bcf0764ab8f6acc014eba6e7989944d29e6312323222e6d4250075`。
- 单射对象形式摘要：`sha256:2d24c91e5ddcf4023449e20726f3c3ed115d9b0d2b3228410288df4a754c3f6d`。
- 精确目标：`MCS.Expected.rightUnitInjective`，登记 `lean-group-injective`。当前报告中的 objectBindings 与上述对象摘要相同。
- 机器报告和文字对应审阅独立。形式摘要、目标、假设、依赖变化使旧机器封印过期；L 正文变化不会改变机器输入，但会使绑定旧文字摘要的审阅过期。现有人工对应账本为空，状态均 pending。

未声称：一般 HOL—Lean 翻译正确性、完整群论分类、教学效果、全站与规划器的全面迁移。新版公共页面只读；旧 NodeRecord、mcs-node-id、笔记、学习记录、快照和证据历史保留。本次只更新网站 Vercel 部署，未改写 ima 生产目录或真实个人笔记库。协议、精确跨表与回滚入口见 [README](README.md)；发布明细见 `_ops/records/vercel-20261018-01.deploy-record.md`。

网站回归日志保存在 `tmp/content-web-tests.log`、`content-web-tests-resume.log`、`content-web-tests-resume2.log`、`content-web-tests-resume3.log`。本次修复了动效清单遗漏、新入口对手册导航顺序的影响，以及旧浏览器测试误选新增尺度控件的问题；修复后的对应阶段均通过。共享解析器补充了公式显式类型校验，错误的 G、G → o 与未知类型均被拒绝；网站与插件使用同一修订。
