# MCS × Lean 首版验收记录

首版核验日期：2026-10-12；检查运行方式修订：2026-10-13。范围：新版 `mcs-web`、独立 `mcs-foundations/lean` 工程及理论修订源。实施保留工作区既有修改；运行数据与依赖缓存不进入公开包。下列首版数据与部署描述是 10 月 12 日的历史记录，当前源码报告见末尾的续验记录；本次未部署公网运行副本。

## 已证实的结果

**PROOF / backend=lean4 / passed：** 固定 Lean 4.34.1 与 mathlib 提交 `d13f23b723b8a846827a245b89c10fc7d3f11612`，实际编译并重放了八个登记目标。没有用模拟结果替代数学验收。

| 登记 | 目标 | 最终维护重放用时 | 当前报告 |
|---|---|---|---|
| `lean-group-injective` | 右单位结构中的左乘单射、群特例、删右单位律与删映射相等条件的反例 | 109726 ms | `mcs-foundations/lean/reports/lean-group-injective.json` |
| `lean-closure-8-8` | 广延性、单调性、幂等性、有限性 | 114127 ms | `mcs-foundations/lean/reports/lean-closure-8-8.json` |

群登记输入摘要为 `9d46117510be37743fee0f5d52a0df79e1567806f88118159185b9f32f49b3c1`，报告摘要为 `0711f4dbeceaf73bdffb708b9e1748af2dc64924a5baa95b34b644be1902eb09`。

闭包登记输入摘要为 `5fa742d8813cfb6076f36d2e07dbb64f7327f77aaf99307e2dd716c603f7f4a6`，报告摘要为 `d756b8131615caf8fe48b580a8f1c7ff04c41f7fe9876b8d80fc642122276348`。

闭包定义允许无限载体、无限规则族与零前提规则，只限制每条规则的正向前提有限。目标模块独立于证明模块，没有预设闭包性质。一般证明保留 PROOF 标签，不降格为有限枚举。

每次网页任务构建源码，顺序重放五个项目模块，再检查包装声明的固定目标与传递公理依赖。维护阶段另实际完成了 `lake env leanchecker --fresh MCS.Verified`，从空环境重放传递导入，退出码为零。网页重放以已预热的固定 mathlib 导入环境为基础；报告没有把工具链自带检查器标成已形式验证的外部独立内核。

## 工程与浏览器检查

| 检查入口 | 实际结果与范围 |
|---|---|
| `npm test`，设置 REQUIRE_LEAN、REQUIRE_BROWSER、REQUIRE_TLS 为 1 | 70 个验收步骤全部通过，真实 Lean 正例、七组真实负例、HTTPS 登录流程和网站回归均未跳过 |
| `node --test tests/lean.test.mjs` | 最终 15 项通过；覆盖严格版本号、缺工具链、输入封存、报告损坏、双驱动往返、队列配额、取消与超时杀进程树、服务关闭、Windows 停止脚本与输出限额 |
| `node --test --test-name-pattern="cancellation, malformed" tests/lean-live.test.mjs` | 最终真实 HTTP 服务检查通过：取消、非法请求体、关闭重放与工具链缺失时只读展示 |
| `node tests/lean-page.mjs`，要求真实 Lean | 最终构建的中文和英文节点页均按新任务 ID 等到真实完成、下载本次报告；研究页包含无知识节点的理论登记；窄屏无横向溢出 |
| `node tests/lean-cancel-page.mjs`，要求真实 Lean | 中英页面在真实构建阶段取消任务，下载取消诊断；没有伪造成功报告，学习记录与本体不变 |
| `node --test tests/api.test.mjs tests/release-export.test.mjs tests/maintenance-cli.test.mjs` | 最终 33 项通过 |
| `npm run check`，要求真实 Lean；`node scripts/lean.mjs ready` | 通过，两份报告对应当前封存输入 |
| `npm run build`、`npm run check:i18n` | 通过；保留已有大包提示及已有译文覆盖欠账，不把全站称为全部译完 |
| `python validation/verify_finite_models.py` | FINITE：16 项、26 份修订源、224 条索引陈述、36 个局部化方案通过 |
| 原 `validation/certification/test_kernel.py` | FINITE：28 项、19 个负证书、175 次独立语义比较通过 |
| `python validation/build_monograph.py` | 整合稿重建完成，26 份源文件、356226 字节 |

真实 Lean 负例依次为直接 sorry、经中间引理传递的 sorry、额外公理、native 公理依赖、加强包装目标的前提、缺声明、退出码零但没有审计报告。前四组确实编译成功，然后被传递公理白名单拒绝；不是只做关键词搜索。另检查了源代码、原文、锁文件、对应说明与登记变动后的封存失效，以及损坏报告不能保留有效通过状态。

SQLite 与 PostgreSQL 共用验证任务存储接口。PostgreSQL 回归通过 PGlite 的 PostgreSQL 引擎执行真实 SQL；不是对远程生产 PostgreSQL 的运维验收。任务重启恢复将未完成项标为 interrupted，取消和超时在真实子进程及孙进程心跳上核验，没有遗留继续写入的后代进程。

浏览器重放前后对七组学习记录逐项比较，本体版本与全部学习记录相同；验证历史单独存储。公网模式测试还覆盖匿名限制、跨账号 404、来源与 CSRF 拒绝、每账号配额。HTTPS 登录浏览器使用隔离的身份提供者测试桩，但重放运行真实 Lean。

## 实际运行与发布

已按现有自托管方式更新本机 3784 与公网 3785 服务，切换前执行 Lean 就绪门禁并作一致性 SQLite 备份。实际公网 `https://mathcognitivespace.com` 的中英研究页匿名浏览通过，登记与能力接口返回当前通过报告，匿名创建、查询及取消任务均返回 401。维护操作前后的受保护学习数据摘要相同。本机停止脚本与公网守护的停止、健康失败重启路径使用整棵进程树终止；守护已重新加载，现有服务继续健康运行。

公开包包括源码、工具链文件、依赖锁文件、登记及当前审核报告；维护过程的时间戳报告在源工作区保留，但不复制进公开包。排除 `.lake/`、`.lean-tools/`、任务临时目录、用户验证历史和运行数据库。导出命令保留旧包，不覆盖既有发布快照；导出规则审计和隔离包 doctor 另留本机运行日志。`MCS_WEB_LEAN_ENABLED=0` 的只读回退已测试。

## 仍需区分的边界

**未验证：** 原文对应关系仍待独立人工审阅，没有填写虚构的审阅人或审阅日期。真实生产 GitHub/Supabase 账号登录后的域名端到端重放没有代用户操作；已核验的是真实 HTTPS 服务的登录授权链、真实 Lean 重放，以及生产域名的公开读取与匿名拒绝。Linux 原生工具链尚未实际验收。

**NOT-CLAIMED：** 完整 Cayley 定理、一般 HOL—Lean 翻译正确性、全部数学笔记自动形式化、学习效果及全站实现正确性。无限前提规则和负向规则的闭包失败例只是边界说明，未登记为已通过的 Lean 反例。输入与报告摘要用于追踪版本和检测损坏，不是数字签名。

思想：把“机器通过、原文对应、覆盖完整”分成三个可复核判断。方法：独立目标包装、实际编译与内核重放、传递公理审计、版本摘要和数据非干扰检查；入口见 [Lean 运维说明](LEAN.md) 与 [形式化工程说明](../../mcs-foundations/lean/README.md)。回看问题：引用的报告是否仍对应当前命题、条件和源文件？

## 2026-10-13：降低重放开销的续验

创作环境完整回归时，原检查链出现既有缓存文件的读取失败及重放超时。现场观察到较低的可用内存，读取失败位置随重试变化；这支持资源压力的解释，但不构成确定的操作系统故障归因。未替换或删除工具链与 mathlib 缓存，也未修改数学源文件、登记目标、允许公理或网页 120 秒限额。

检查策略更新为 `mcs-lean-check/2`：Lake 捕获必要编译变量后退出，原生 Lean 在独立目录依次重编译六个项目模块。一个原生 Lean 进程顺序调用同一官方 `LeanChecker.replayFromImports`，每个模块通过后留下成功标记；完整且顺序一致的五个标记是通过的必要条件。实际导入的 `LeanChecker.olean` 与检查入口、工具链均记录摘要，结束前再次检测工具链与依赖变化。逐目标匹配及传递公理白名单审计仍覆盖八个目标。旧报告保留为历史，策略或检查入口变化使其过期。

| 首轮策略 2 维护重放（尚未限制工作线程） | 实际结果 |
| --- | --- |
| `lean-group-injective` | passed，76680 ms；UTC `2026-10-13T14:43:55.158Z` |
| `lean-closure-8-8` | passed，66466 ms；UTC `2026-10-13T14:45:01.642Z` |
| `node scripts/lean.mjs ready` | 两份报告均为 current，工具链、依赖及封存就绪 |
| `node --test tests/lean.test.mjs` | 16/16 通过；新增遗漏、重复、乱序标记与导入检查模块摘要缺失的拒绝测试；重算普通摘要后仍拒绝不完整重放 |

群登记输入摘要：`f3453a58f0360970223c09a19a6994358d4b9386f352b94a2b93c2fc67357ba7`；报告摘要：`6e24be40e0ad088facdc44df74f01646c912cd66107b97843e25e9b732a0fc18`。

闭包登记输入摘要：`c68e020d726cfb1449a64b740c770400b51085f8e04c544e3ae1d03e488235e2`；报告摘要：`7225bd9f77b218a711a6ffa89f775a1604eee7b9eab784f0c73fc18c6608d108`。

本机诊断日志保留于 `tmp/writing-lean-batch-probe.log`、`tmp/writing-lean-batch-details.json`；正式报告与阶段日志为 `tmp/writing-followup-lean-reports.json`、`tmp/writing-followup-lean-report-stages.log`。临时诊断不作为通过报告；维护报告只由正式检查函数生成。完整回归结果续记于[创作交付记录](writing/交付与验收记录.md)，独立原文对应审阅仍为 pending。

此后从头执行完整回归，前四组创作/笔记库通过；Lean 组 19 项中 18 项通过，七类真实负例全部拒绝，HTTP 正例在审计阶段读取标准库 `Lean/Elab/DocString/Builtin/Keywords.olean.private` 失败。编译与五个模块重放均为零退出，失败如实保留在 `tmp/writing-followup-full-test.log`，不能据前面的命令行通过把该次 HTTP 检查标为通过。

再将全部原生 Lean 命令限制为 `-j 1`，并让 Lean 单元与真实检查文件顺序执行，减少同机并发资源占用；不改变任何证明断言。两份登记的真实 HTTP 正例随后通过，两个任务合计 131647 ms，每个仍在 120 秒限额内，日志为 `tmp/writing-followup-lean-http-single-thread.log`。本轮未增加自动重试、未提高任务时限，最终维护报告与续验结果在[创作交付记录](writing/交付与验收记录.md)保存。

最终单工作线程维护报告（替代当前指针，历史收据仍保留）：

| 登记 | 耗时、输入与报告摘要 |
| --- | --- |
| 群 | 64000 ms，UTC `2026-10-13T15:00:13.913Z`；输入 `e8ce12426ed1316fff6bd7eaca71c601492bcbd7a3553b50551d25dacf421fa3`；报告 `c7d36895e5f4354075370ff53c935d606ec1b3b1a905a217813921ffe9816ce1` |
| 闭包 | 64460 ms，UTC `2026-10-13T15:01:18.393Z`；输入 `7edcd56250b14f0fc36f8afa0719bdc2b90664252b9fa68ab3051f0d33192a36`；报告 `f84c346d457fc12f1a803e81f7aa4ae59b05aa23d0bb00b310caff7d7c3986d0` |

报告原始输出与阶段日志：`tmp/writing-followup-lean-single-thread-reports.json`、`tmp/writing-followup-lean-single-thread-stages.log`。最终续验的 Lean 单元与真实 HTTP/负例组 19/19 通过、0 跳过，日志为 `tmp/writing-followup-resumed-test.log`。就绪与 doctor 再次通过。本机 3784 已重启加载当前策略，公网运行副本未更新。
