# 发布准备状态（2026-10-05）

这份记录只写**已经验证过的事实**与**还缺什么**，不写计划口吻的承诺。

## 〇、当前发布进程（2026-10-05 12:5x 更新）

| 环节 | 状态 | 证据 |
|---|---|---|
| 源码公开 | **已完成** | <https://github.com/akashicpeiheng/math-cognitive-space>（public，默认分支 `main`） |
| 公开历史 | 已重整（2026-10-05） | 远程 `main` 只有一个提交 `d6f3cfe chore: 数学认知空间 MCS 开源版本`；此前那 6 个提交保留在本地 `E:\MCS-publish` 的 `backup-before-scrub` 分支，不再随仓库分发 |
| 仓库更新 | 已推送，与远程同步 | 工作区干净；`git ls-remote origin main` = `d6f3cfe` |
| Supabase 项目 | 待用户操作 | 步骤见 `mcs-web/docs/部署清单.md` 第 1 节 |
| GitHub OAuth App | 待用户操作 | 同上第 1.2 节（回调地址取 Supabase 里的 Callback URL） |
| Render 部署 | 待用户操作 | `render.yaml` 已在仓库根，Blueprint 可直接用 |
| 公网上线验收 | 待部署后执行 | 部署清单第 3 节的 9 条 |

本地克隆 `E:\MCS-publish` 的这一个提交，相对最初那次公开的内容：**新增 9 个文件**（`render.yaml`、`Dockerfile`、`.dockerignore`、
`mcs-web/docs/部署清单.md`、`GITHUB-VERCEL.md`、`tests/https-public.mjs`、`tls-runtime.mjs`、
`maintenance-cli.test.mjs`、`release-export.test.mjs`）、**修改 16 个**（含 PostgreSQL 存储层、
账号层、权限表、README 部署一节）、**移除 125 个**（全是 `mcs-foundations/arxiv/output/`、
`package-staging/` 的构建产物与 `edition/` 的 LaTeX 中间文件——导出脚本现在按规则排除它们）。

推送前的要求已经满足：`npm test` **全部通过**（2026-10-05 重整公开历史前复核：`全部 mcs-web 验收通过`）、
`npm run check` 通过、导出审计通过（必需文件齐全、禁用路径 0、密钥 0、用户目录路径 0、本地禁用词表 0）。

## 一、已完成的发布阻断修复（2026-10-04，回归测试钉住）

| # | 问题 | 复现方式 | 修复 |
|---|---|---|---|
| 1 | 证书重放**伪报通过** | 指定一个不存在的 Python 解释器，接口仍返回 `passed` | `exitCode` 不再把字符串错误码（`ENOENT`/`EACCES`）当成退出码 0；环境故障抛 `EVIDENCE_UNSUPPORTED`，超时判 `resource_exhausted` |
| 2 | 事件超过 2000 条时**导出丢记录、状态重建丢确认** | 写入 2001 条事件后导出，最早的 `confirmation` 消失 | 分页（`listEvents` + `before` 游标）与全量读取（`listAllEvents`）分开；导出、状态重建、证据核对走全量 |
| 3 | 导入**留下半份档案** | 提交含冲突事件 ID 的导入包，仍生成一个缺内容的档案 | 导入改为全有或全无：任一条写不进去就回滚并报 422；导入路径与在线写入共用 `normalizeEvent`，并补上此前被忽略的网络视图 |
| 4 | 全新克隆下证书重放**直接崩溃** | 删掉 `mcs-web/tmp/` 后调用重放 | 重放临时目录先 `mkdir`，仓库内不可写时退回系统临时目录 |
| 5 | 19 个浏览器验收脚本**写死作者机器路径** | 换目录克隆后 `Cannot find module` | 统一走 `tests/browser-runtime.mjs`；`playwright-core` 正式登记为开发依赖；找不到浏览器时打印装法并跳过，CI 用 `MCS_WEB_REQUIRE_BROWSER=1` 把跳过变成失败 |
| 6 | 跨盘用例在**单盘/非 Windows 环境必然红** | 仓库克隆到 C: 后 `relative()` 不再跨盘 | 主动寻找第二个可写盘位；找不到就明确跳过并说明原因，其余断言照跑 |
| 7 | 依赖本机才有的目录（DeepTutor 检出、`reference/` 文献、`mcs-bridge` 的 `node_modules`） | 干净克隆后相关用例报红 | 各自改为「有就真跑、没有就明确跳过」，并核对界面是否**如实**呈现缺失 |

## 二、本轮完成的账号体系与权限边界（2026-10-05）

新增 `server/auth.mjs`、`server/auth-provider.mjs`、`server/security-store.mjs`，并把它接进
`server/index.mjs` 与 `server/api.mjs`。**不是登录页，是每一次请求上的身份判定。**

- **身份**：Supabase Auth（GitHub OAuth 带 state + PKCE；邮箱密码注册 / 验证 / 找回 / 改密 / 退出）。
  本机模式没有账号，身份固定为本机管理员，行为与从前完全一致。
- **会话**：服务端会话表（`runtime/auth.sqlite3`，与学习者 E 库分开）+ `__Host-mcs_session` Cookie
  （HttpOnly、Secure、SameSite=Lax），载荷 AES-256-GCM 封装；过期前 30 秒自动刷新，刷新与退出并发时不复活会话。
- **写请求两层防护**：公网模式下每个写请求都要带 `x-mcs-csrf` 令牌，且 `Origin` 必须等于 `publicOrigin`。
  此前只有少数写入口有来源校验，其余只靠 Cookie 的 `SameSite`；现在统一在路由分派处判定。
- **权限表默认最严**：`server/api.mjs` 的 `POLICY` 逐条列出谁能调用；未登记的路由按 `admin` 处理。
- **归属**：档案、任务、辅导会话按服务端认证身份判定归属；越权访问返回 **404**（与"不存在"同形），
  而不是 403——403 会变成对象 id 的存在性探针。`body.profileId` 也纳入归属判定（`localizations/compute`、`plans` 这类接口只看路径会漏）。
- **管理员**按认证服务用户 id 显式配置，不采用"首位注册者即管理员"。
- **有界任务队列**：全站并发 1、队列 20、每账号 1 运行 + 1 排队、单任务 60 秒（超时**真的终止线程**）；
  超限当场报 `RESOURCE_EXHAUSTED`(429)，不接收一个永远排不到的号。
- **验收**：`tests/auth.test.mjs` 7 组（未登录 401、两账号互不可见且越权 404、管理员 403、
  CSRF 与会话 Cookie 属性、未验证邮箱拒绝建会话、本机模式行为不变、队列配额），
  `tests/deployment.test.mjs` 补了「账号配置不完整时拒绝启动」三条。

## 三、本轮代码审计与修复（逐文件审计的结论）

两位独立审计员分别逐行读完 `core/**` + `shared/**`（41 个文件）与 `web/**`（全部源码），
报告按「阻断 / 高 / 中 / 低」分级。已修（都带复现说明）：

| 严重度 | 问题 | 修复 |
|---|---|---|
| 阻断 | 证书输出文件 `JSON.parse` 无保护：被 SIGTERM 截断的 `result.json` 让异常冒到请求层成 500，并回显 python 与证书绝对路径；同一文件对 stdout 却有保护 | 两条路共用一个 `tryParse`；文件在而解析不出 → `corrupt`，**不回退退出码**（退出码 0 映射"通过"） |
| 阻断 | `replayCandidate` 把"判定还在异步跑"（`pending`）报成 `ok: true` | `ok` 增加前置条件并写入 `problems`；"没跑完"既不是 true 也不是 false |
| 阻断 | `instanceOf` 把"求值器没给出判定"当反驳，可发布成 `FINITE` 反例证据 | 三态：只有 `holds === false` 才算反驳，`holds` 缺席判 undecided |
| 阻断 | 条件推导在**没有共同前提**时退回"目标节点自己的假设"当条件；查该证书发现 `open_hypotheses` 是空集——声明的前提一条都没用上 | 无共同前提不再生成带条件的候选；声明了但未被用到的前提**收窄剔除**并在 reason 里写明 |
| 阻断 | 前向饱和达工程上限（2500 条）时 `scope.capped` 全仓库无人读取，"被限额截断"与"空间穷尽"都报 `undecided` | 饱和截断在搜索结束翻成 `timeout`；判定器保留 `timeout`/`undecided` 的区别 |
| 高 | `verify.mjs` 缺 `check.theorySha256` 时理论身份核对整段跳过（fail-open） | 期望哈希存在而证书没给 → 记一条 problem |
| 高 | 未提供背景白名单时 `T:` 依赖核对被整段跳过 | 无法核对时记 problem |
| 高 | `unify` 的 `catch { ok = false }` 把合一深度超限（`resource_exhausted`）吞成"这条事实不匹配" | 只吞形状不匹配，预算类错误上抛 |
| 高 | 解析器递归无深度上限：`"(".repeat(2000)+"P(x)"+")".repeat(2000)`（约 4 KB）稳定 `RangeError` → 请求层 500 | 解析器加嵌套上限 256 层，超出报 400 且 `reason: resource_exhausted`（实测两类输入都已转成可恢复错误） |
| 中 | `judgment` 把"没有检查结果"（`null`）与"检查过无开放假设"（`{}`）都说成 `unconditional` | 三态：`null → unknown` |
| 中 | `parseSpec` 的 hash 不一致只进 warning，`validateDraft` 仍 `ok: true` | `validateDraft` 把 `hash-mismatch` 提升为 problem（源文本被改过要拦住校验） |
| 中 | `reachableNodes` 的 `truncated` 被 `LC28` 忽略，"没算完"当"不可达"并输出瓶颈结论 | 截断一律 `unknown`；逐个禁用探测也跳过截断结果 |
| 前端高 | `/nodes/100%` 这类深链在渲染期抛 `URIError`，全站无错误边界 → 白屏 | 解码回退原串 + 新增 `ErrorBoundary`（显示原因 + 回首页 / 重新加载） |
| 前端高 | 删除已保存视图单击即永久删除，无确认 | 删除前确认，文案带视图名 |
| 前端中 | 任何 404 都判成"服务端还没有这个接口"，把"节点不存在"说成"版本落后" | 只有 `NOT_FOUND`/405 算路由缺失 |
| 前端中 | 档案与健康检查失败被 `.catch(() => {})` 吞掉，界面永远"正在连接…" | 失败存进 context 并可显示，`ProfileProvider` 暴露 `profilesError`/`healthError` |
| 前端中 | 辅导页轮询无终止条件、失败永远静默 | 全部回合终态即停；连续 3 次失败停止并报出原因 |
| 前端中 | 笔记保存撞 409 后无法自愈（不刷新修订号，一直存不上） | 409 时自动刷新档案修订号并提示重试 |
| 前端中 | "复制当前链接"其实是个指向当前 URL 的链接（不复制、可能整页重载） | 真调用剪贴板并给反馈，不可用时显示可手动复制的地址 |

**未修但已记录**（属于设计取舍或超出本轮范围，见审计报告原文）：
理论层 `theory.mjs` 与 `backgrounds.mjs` 各有一份背景定义（`backgrounds.mjs` 明文要求不要另写一份，
这条纪律已被破坏；主流程目前走"肥对象"分支所以未受影响，但回退到字符串 id 会静默丢掉背景公理）；
`state.steps` 搜索期恒为 0 使 `maxSteps` 形同虚设；若干 O(n²) 稳定序列化；
前端写死的规模数字（"215 条契约里 definition 85 条"）；SVG `role="img"` 包住可聚焦按钮等无障碍项。

## 四、本轮新增：PostgreSQL 存储层（2026-10-05）

学习数据原来只有 SQLite 一份同步实现。公网不能用容器本地 SQLite（重启即丢），
而 `pg` 只有异步 API——所以做了**统一异步存储接口 + 两个驱动**（`server/sql-driver.mjs`）：

| | 本机 | 公网 |
|---|---|---|
| 驱动 | SQLite（`node:sqlite`） | PostgreSQL（`pg.Pool`） |
| 事务 | 连接级 `BEGIN IMMEDIATE` | 连接池 + `AsyncLocalStorage` 绑调用链 |
| 备份 | 物理备份（复制文件） | 逻辑备份（整库 JSON，恢复时整库回填） |

关键决定与理由：

- **语义只留一份**（`server/db.mjs`）：事件去重、revision 乐观锁、keyset 分页、
  导入「全有或全无」都只有一处实现。两份实现漂移会导致「同一份导出，本机与公网结果不同」。
- **公网模式强制 PostgreSQL**：`dbUrl` 缺失时拒绝启动（`server/deployment.mjs`）。
- **会话表与学习者数据同库**：认证库在公网模式下也走同一个连接池——
  各用各的 SQLite 时，一次重启把所有登录状态清空，用户看到的是「刚登录就被登出」。
- **配置校验先于连库**：否则一个写错的 Supabase URL 会被「数据库连不上」盖住。

**验收**（`tests/postgres-store.test.mjs`，跑在 PGlite 上——内嵌 WASM 版**真实 PostgreSQL**，
不是假驱动）：9/9 通过，覆盖 COUNT 类型、档案生命周期与 revision、事件去重与 409、
keyset 分页不重叠、笔记/视图按归属隔离与级联删除、2001 条事件的导出完整性、
导入失败整体回滚、逻辑备份恢复往返（含格式不符时拒绝而不是清库）、
事务在异步调用链上隔离（并发请求不被卷进同一个事务）。
`tests/auth.test.mjs` 的公网模式用例也一并改到 PostgreSQL 上跑（7/7）。

## 五、本轮新增：公网 https 的第一版形态（2026-10-05，按用户决定「先不做邮箱发信」）

用户选择：**跳过邮箱发信，先上 https**。对应的产品形态是**只走 GitHub 登录**：
`auth.emailEnabled = false` 时注册与找回密码如实回 503（不假装发了信），
GitHub OAuth 不受影响；前端在注册/找回标签下**先说明**邮箱服务未开通，而不是等提交才报错。

### 5.1 HTTPS 端到端验收（`tests/https-public.mjs`）

这一条补的是此前唯一没被真机验证过的环节。公网模式的会话 Cookie 是
`__Host-` + `Secure`，浏览器**拒收** http 页面下发的 `Secure` Cookie——也就是说
公网模式跑在 http 上不是"不够安全"，而是**登录根本走不通**。此前只有文档结论，
现在用真 TLS + 真浏览器走了一遍（`tests/tls-runtime.mjs` 负责生成自签证书：
先试 openssl，再试 Windows 自带的证书工具，都没有就**明确跳过**，CI 用
`MCS_WEB_REQUIRE_TLS=1` 把跳过变成失败）：

15 条断言全过，含：浏览器接受 `__Host-` 会话 Cookie、Cookie 带 Secure/HttpOnly/SameSite=Lax、
https 下写请求成功（同时穿过 Cookie + CSRF 令牌 + Origin 三道关）、
缺令牌的写请求 403 `CSRF_REJECTED`、退出后会话清空、明文 http 下拿不到可用会话。

顺带抓到并修掉一个真实体验缺陷：**公网模式下未登录的访客也会去拉 `/profiles`**，
吃一个 401 并在控制台留噪声。现在访客不拉（按定义没有档案），不把"你没登录"画成"读取失败"。

### 5.2 部署配置

| 文件 | 作用 |
|---|---|
| `render.yaml`（仓库根） | Render 蓝图：原生 Node 环境、免费档、`healthCheckPath: /api/v2/health`，标 `sync:false` 的变量在网页上填，会话密钥由平台随机生成 |
| `Dockerfile` + `.dockerignore`（仓库根） | 容器路径（Fly / Railway / 自建）：装 Python 供证书重放、构建前端、非 root 数据目录。**未在本机构建验证**（本机无 docker），用它的平台请先 `docker build` 一次 |
| `mcs-web/docs/部署清单.md` | 逐步runbook：Supabase 项目与 GitHub OAuth App 怎么建、连接串取哪个、Render 上六个变量填什么、上线后 9 条验收怎么做、备份恢复怎么用、这一版明确没有的东西 |

配套的代码改动：`config.mjs` 支持平台注入的 `PORT`（原来只认 `MCS_WEB_PORT`），
并支持 `MCS_WEB_TUTOR_ENABLED` 关掉辅导适配器。

## 六、已知缺口（必须让用户看见，不能靠放宽判据消失）

- **`limit` 案例没有证书型（非纯文本引用）已验证关系。**
  2026-10-04 起它有一条 `conditionalDerivation`，但那条关系是**前提虚报**撑起来的：
  证书的 `open_hypotheses` 是空集，即"关系写着 A∧B ⊢ C，证书实际证的是 ⊢ C"。
  修正判定器后该案例回到真实完成度：5 条 `definitionReference`（版本 + 类型核对，按 §2.2 算验证），
  0 条证书型非纯文本关系。`tests/relation-discovery-e2e.mjs` 把它记为**白名单里的唯一已知缺口**，
  任何新增缺失案例仍会让测试红。填上它需要一条真正的无条件推导通道（尚未设计）。
- 另外三案：`group` 3 条、`manifold` 2 条、`tensor` 1 条证书型关系。

## 七、还没做的（公开发布前必须完成）

1. **三个账号动作（只有你能做）**：建 Supabase 项目、建 GitHub OAuth App 并填进 Supabase、
   在 Render 用 `render.yaml` 建服务并填六个变量。步骤见 `mcs-web/docs/部署清单.md`。
   **代码与配置已经就位**，缺的是这些凭据与账号操作。
2. **推送仓库**：本会话环境没有 `gh` CLI，推送需要凭据或先装 gh。
3. **邮箱发信**：本版按用户决定先不做（注册与找回如实回 503，登录走 GitHub）；
   接进来时把 `MCS_WEB_AUTH_EMAIL_ENABLED` 改成 `1` 并配好 Supabase SMTP 即可。
4. **Dockerfile 未经构建验证**：本机没有 docker；用镜像的平台请先 `docker build` 一次。
5. **编写库仍在 SQLite**：草稿 / 发现任务 / 审阅记录（`authoringDbFile`）是本机文件，
   公网部署下只影响管理员的入库流程，不影响学习者数据。
6. **逐文件审计的覆盖**：`core/**`、`shared/**`、`web/**` 已逐行审完；
   `server/**`（api / db / index / jobs / tutor / publication / snapshot / maintenance / upstream /
   extensions / authoring-db / auth / sql-driver 系列）与 `data/**`、`tests/**` 尚未逐行走一遍。

## 八、复现命令

    cd mcs-web
    npm install
    npm run build
    npm run check
    npm test

    # 只跑账号与权限
    node --test tests/auth.test.mjs tests/deployment.test.mjs

    # 导出可开源发布包（目标目录必须为空或不存在）
    node scripts/export-open-source.mjs --out <目录>
