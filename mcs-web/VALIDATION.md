# MCS Web 验收记录

## 第八十一轮：R0 —— 公开包验收与 mcs-bridge 解耦（2026-10-05）

第八十轮把「公开包独立验收」列为 R0：`tests/tutor-critique.test.mjs` 的
「两套集成的失败语言一致（跨仓库不变量）」无条件读取不随公开包分发的
`mcs-bridge/deeptutor.mjs`，公开包里必然 ENOENT（在 `E:\MCS-publish` 复现为 3 过 / 1 失败）。
本轮把它拆成两半：

- `本站错误码表保留跨仓库失败码（公开包内必须可核对）`：只读 `shared/errors.mjs`，任何环境都执行；
- `两套集成的失败语言一致（跨仓库不变量）`：桥接源码存在才核对；缺材料时 `t.skip` 并写明缺的文件与原因，
  不把「无法核对」判成失败，也不静默通过。

### 命令与结果

| 命令 | 环境 | 结果 |
|---|---|---|
| `node --test tests/tutor-critique.test.mjs` | 开发工作区（有 `mcs-bridge`） | 5/5 通过，0 跳过；跨仓库一侧真实执行 |
| `node mcs-web/scripts/export-open-source.mjs --out E:\MCS\tmp\github-release-20261005-r0` | 开发工作区 | 审计通过（必需文件齐全；禁用路径 0、密钥 0、用户目录路径 0、本地禁用词表 0） |
| `npm ci` + `npm run build` + `npm run check` | 干净导出包 | 全部通过；doctor 全部通过 |
| `MCS_WEB_REQUIRE_BROWSER=1` + `MCS_WEB_REQUIRE_TLS=1` + `npm test` | 干净导出包 | **全部 mcs-web 验收通过**（退出码 0；浏览器与 TLS 的跳过都会判失败） |
| `node --test tests/tutor-critique.test.mjs` | 干净导出包 | 4 通过 / 1 带原因跳过：本站错误码表通过；跨仓库一项写明「mcs-bridge 不随公开包分发」 |

导出包内该用例一条通过、一条带原因跳过，与「本项目断言始终执行、可选跨仓库检查缺材料时明确报告」一致。
测试文件在开发源与导出包的 SHA-256 相同（`5DE80946…`），排除「改了没导出」的可能。

### 边界

- 严格全量验收跑在导出包上；公网服务、备份恢复与双账号闭环尚未验收（R1、R2）。
- 跨仓库不变量的桥接一侧在公开包内无法核对：公开包只保证本站错误码表；完整核对保留在带
  `mcs-bridge` 检出的开发环境。
- 第八十轮更新的文档（Vercel 状态、发布 README 模板、TODO 优先级等）随本轮发布提交一并进入公开仓库。

## 第八十轮：进度对齐与下一阶段安排（2026-10-05）

本轮响应“更新现有的工作，给出之后的工作方向”，以只读核对和文档更新为主；
没有登录用户账号、重启公网服务、改部署配置、迁移数据或推送新的提交。

### 已证实

- GitHub API 与 `git ls-remote` 均返回 `main = 284e1ba26b6ddfa836d54e5a98a81c082d9255b1`；
  当前发布副本 `E:\MCS-publish` 与其一致，核对时工作区干净。
  `E:\MCS-open-source` 停留在旧历史，不再作为推送源；未尝试覆盖远程。
- 从现有隧道日志提取当前地址，只发匿名 GET：首页、`/login`、`/api/v2/health` 为 200，
  `/api/v2/profiles` 为 401。临时随机域名不写进长期文档；检查不包含真实登录或有状态写入。
- 当前开发源运行 `node --test tests/release-export.test.mjs tests/maintenance-cli.test.mjs`：
  **8/8 通过，0 跳过**；随后 `npm run check` 全部通过。

### 新发现：公开包验收未完全独立

旧导出包独立安装、构建和自检通过，但严格 `npm test` 在领域内核套件失败：
`tests/tutor-critique.test.mjs` 的“跨仓库不变量”直接读取不随发布分发的
`mcs-bridge/deeptutor.mjs`，报 ENOENT。

为排除“只是旧包”的可能，在**当前发布副本**安装锁定依赖后再次执行
`node --test tests/tutor-critique.test.mjs`，结果 **3 过 / 1 失败**，同一路径缺失。
该测试源码与当前开发源哈希一致。安装仅产生被忽略的依赖，未修改公开仓库跟踪文件。

结论：不能宣称最新公开包全量验收通过；需要保留本项目自身断言，并为可选跨仓库材料建立明确边界。
列为 TODO R0。本轮按用户当前要求收束到进度更新，未实施这项修复。

### 更新与边界

- 更新 `RELEASE-READINESS.md` 当前状态，撤下“尚未推送 / 尚未建身份服务”等过时阻塞项；
  第七十九轮的 OAuth 完成记录只作引用，不冒充本轮复验。
- 更新 `TODO.md`：增加 R0–R8 优先级与验收标准；删除确认已有实现，40/45 合并排期；
  历史条目和研究证据边界仍保留。
- 同步修订 Vercel 说明、发布 README 模板和维护文档。维护文档指出现有 SQLite 备份是
  checkpoint + 文件复制，尚未证明并发写入一致性；整站恢复还需账号归属库、编写库和扩展包。
- 下一步：公开包独立验收 → 公网备份/隔离恢复 → 两账号完整流程 → 固定地址与长期运行。
  邮件、DeepTutor、Vercel 迁移暂不作为当前上线阻塞；域名购买、停机、账号操作需另行确认。

这些工作记录先保存在开发源，尚未导入当前发布副本或推送 GitHub。

## 第七十八轮：仓库更新前的验证与一处测试 fixture 修复（2026-10-05）

用户把 GitHub 仓库公开后，核对发现**仓库落后本地两个轮次**（缺 PostgreSQL 存储层之后、
HTTPS 验收与部署配置）。推送更新之前先跑了一遍全量回归，**抓出一条一直红的测试**：

- `tests/maintenance-cli.test.mjs` 的 fixture 把 `core/`、`shared/`、`data/` **平铺**在临时目录下，
  而 `core/ontology.mjs` 用「自身所在目录的父目录」当 `REPO_ROOT` 去解析
  `mcs-foundations/validation/certification/certificates/*.json`。平铺之后 `REPO_ROOT` 落到
  **系统临时目录**，那 4 份机器证书必然找不到，`loadOntology` 直接抛
  「公共本体未通过检查（4 项）」——这条测试从写出来就是红的，不是回归。
  修法：fixture 按**真仓库布局**摆（`<dir>/mcs-web/…` + `<dir>/mcs-foundations/…`），
  只带 `certification` 这一层（约 1.7 MB），不带 `mcs-foundations/evidence` 那类不随发布分发的材料。

修好后 `npm test` **全部通过**（退出码 0），随后才生成发布包并提交到本地克隆
（`E:\MCS-publish`），推送留给用户（本环境没有凭据助手）。

发布包相对最初那次公开的内容：新增 9、修改 16、移除 125（全部是 arXiv 构建产物与 LaTeX 中间文件）。

## 第七十七轮：公网 https 的第一版形态（只走 GitHub 登录，不发邮件）（2026-10-05）

用户决定：跳过邮箱发信，直接上 https。

### 1. HTTPS 端到端验收（此前唯一没被真机验证的环节）

公网模式的会话 Cookie 是 `__Host-` + `Secure`，浏览器**拒收** http 页面下发的 `Secure` Cookie——
也就是说 http 下登录**根本走不通**，不只是"不够安全"。此前这条只有文档结论。

新增 `tests/https-public.mjs`：本机生成自签证书（`tests/tls-runtime.mjs`，先 openssl、
再 Windows 证书工具，都没有就明确跳过、CI 用 `MCS_WEB_REQUIRE_TLS=1` 把跳过变成失败），
起一个 TLS 终结器转发到应用（与托管平台同一形态），用真浏览器走完整流程。
**15 条断言全过**，关键几条：浏览器接受 `__Host-` 会话 Cookie；Cookie 带
Secure/HttpOnly/SameSite=Lax；https 下写请求成功（同时穿过 Cookie + CSRF + Origin 三道关）；
缺令牌的写请求 403 `CSRF_REJECTED`；退出后会话清空；明文 http 下拿不到可用会话。

### 2. 顺带修掉的真实缺陷

公网模式下**未登录的访客也会去拉 `/profiles`**，吃一个 401 并在控制台留噪声，
界面上还可能冒出一句"读取失败"——而真实情况是"你还没登录"。现在访客不拉
（访客按定义没有档案），这条是 https 验收里那两条 401/403 噪声引出来的。

### 3. 部署配置

| 文件 | 作用 |
|---|---|
| `render.yaml`（仓库根） | Render 蓝图：原生 Node、免费档、`healthCheckPath: /api/v2/health`；会话密钥由平台随机生成，其余敏感值在网页上填 |
| `Dockerfile` + `.dockerignore`（仓库根） | 容器路径：装 Python（证书重放要用）、构建前端、`tini` 转发信号。**本机无 docker，未经构建验证** |
| `mcs-web/docs/部署清单.md` | 逐步 runbook：Supabase 与 GitHub OAuth App 怎么建、连接串取哪个、六个变量填什么、上线后 9 条验收、备份恢复、这一版没有的东西 |

代码侧：`config.mjs` 支持平台注入的 `PORT`，并支持 `MCS_WEB_TUTOR_ENABLED` 关掉辅导适配器；
`scripts/export-open-source.mjs` 把这三个部署文件也放进发布包根目录。

### 4. 命令与结果

| 命令 | 结果 |
|---|---|
| `node tests/https-public.mjs` | 15/15 通过（真 TLS + 真浏览器） |
| `npm test` | **全部 mcs-web 验收通过** |
| `npm run check` / `npm run build` / `npx tsc --noEmit` | 通过 / 通过 / 0 错误 |
| 发布包独立实测 | `npm install`（0 漏洞）→ `check` → `build` → 本机模式起服务（232 节点）→ **公网模式缺配置时拒绝启动**（在发布包里实测到那句拒绝启动的错误） |
| 导出审计 | 通过（禁用路径 0、密钥 0、用户目录路径 0） |

### 5. 还需要用户账号的三步（代码这边已就位）

建 Supabase 项目（拿 URL + publishable key）→ 建 GitHub OAuth App 并填进 Supabase →
在 Render 用 `render.yaml` 建服务并填六个变量。之后按 `docs/部署清单.md` 的 9 条验收逐条做。

## 第七十六轮：PostgreSQL 存储层 + 前端登录入口（2026-10-05）

用户要求：接 PostgreSQL 持久化 + 做前端登录页。

### 1. 统一异步存储接口（`server/sql-driver.mjs` + 重写的 `server/db.mjs`）

学习数据原来只有 SQLite 一份**同步**实现。公网不能用容器本地 SQLite，
而 `pg` 只有异步 API——所以把「SQL 怎么执行」抽成驱动，语义只留一份：

| | 本机 | 公网 |
|---|---|---|
| 驱动 | SQLite（`node:sqlite`，语句包成异步） | PostgreSQL（`pg.Pool`，或测试用 PGlite） |
| 事务 | 连接级 `BEGIN IMMEDIATE` | 连接池 + `AsyncLocalStorage` 绑异步调用链 |
| 备份 | 物理备份（复制数据库文件） | 逻辑备份（整库 JSON，恢复时整库回填） |
| 自增主键 | `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL`（由驱动给出 DDL 片段） |

不另写一份 `PostgresDatabase` 的理由：事件去重、revision 乐观锁、导入「全有或全无」
这些判据一旦出现两份实现，就会有「同一份导出，本机与公网结果不同」——那是数据事故。

改动：`api.mjs` 的 28 处、`tutor.mjs` 的 4 处、`index.mjs` 的建库/关库全部改为 `await`；
`config.mjs` 增加 `dbUrl`/`dbSsl`/`dbPoolMax`（`MCS_WEB_DB_URL` 或 `DATABASE_URL`）。

顺带修掉一个顺序缺陷：配置校验原先在建库**之后**，于是一个写错的 Supabase URL
会被「数据库连不上」盖住。现在 `validateAuthConfig` 在连库之前。

### 2. 公网模式强制 PostgreSQL

`server/deployment.mjs`：公网模式缺 `dbUrl` → **拒绝启动**（容器本地 SQLite 重启即丢）。
会话表与学习者数据共用同一个连接池——各用各的 SQLite 时，一次重启把所有登录状态清空，
用户看到的是「刚登录就被登出」。

### 3. 前端登录入口（`web/src/auth.tsx` 等）

新增 `AuthProvider`/`useAuth`、`/login` 页、`/auth/confirm` 页、`AuthGuard` 与页头登录状态；
`api.ts` 增加 CSRF 令牌注入（`setCsrfToken` + 非 GET 请求自动带 `x-mcs-csrf`）。
**本机模式不出现任何登录入口**：所有新分支都以 `mode === 'supabase'` 为前提。

### 4. 命令与结果

| 命令 | 结果 |
|---|---|
| `node --test tests/postgres-store.test.mjs` | 9/9 通过（PGlite：真实 PostgreSQL 的 WASM 版） |
| `node --test tests/auth.test.mjs` | 7/7 通过（公网模式已改到 PostgreSQL 上跑） |
| `node --test tests/deployment.test.mjs` | 10/10 通过（新增「缺连接串拒绝启动」） |
| `node tests/api.test.mjs` | 16/16 通过（SQLite 路径经异步接口后语义不变） |
| `node --test tests/core.test.mjs tests/tutor.test.mjs` | 31/31 通过 |
| `npx tsc -p web/tsconfig.json --noEmit` | 0 错误 |
| 本机模式冒烟（起服务 + 建档） | health `dialect: sqlite`、建档 revision=1 |

### 5. 还没做的

邮箱发信服务（验证邮件）、编写库是否一并接 PostgreSQL、托管与仓库推送；
`server/**` 与 `data/**` 的逐行审计。

## 第七十五轮：账号体系落地 + 逐文件审计后的修复（2026-10-05）

用户要求：发布前把网站检查到「每一条代码、每一条逻辑」，做到可直接用网页链接访问并开源到 GitHub。

### 1. 账号体系（不是登录页，是每一次请求上的身份判定）

新增 `server/auth.mjs`、`server/auth-provider.mjs`、`server/security-store.mjs`，接进
`server/index.mjs`（认证入口在业务 API 之前）与 `server/api.mjs`（权限表 + 归属判定）。

- 身份：Supabase Auth（GitHub OAuth 带 state/PKCE；邮箱密码注册 / 验证 / 找回 / 改密 / 退出）；
  本机模式没有账号，身份固定为本机管理员，行为与从前一致。
- 会话：服务端会话表（`runtime/auth.sqlite3`，与 E 库分开）+ `__Host-mcs_session`
  （HttpOnly、Secure、SameSite=Lax），载荷 AES-256-GCM 封装；过期前 30 秒自动刷新。
- 写请求：公网模式要求 `x-mcs-csrf` 令牌**且** `Origin === publicOrigin`；
  统一在路由分派处判定（此前只有少数写入口有来源校验）。
- 归属：档案 / 任务 / 辅导会话按认证身份判定；越权返回 404（与"不存在"同形）；
  `body.profileId` 也纳入判定。
- 权限表默认最严：未登记的路由按管理员处理。
- 任务队列有界：并发 1、队列 20、每账号 1 运行 + 1 排队、单任务 60 秒（超时真终止线程）。

**验收**：`tests/auth.test.mjs` 7 组全过（未登录 401、两账号互不可见且越权 404、管理员 403、
CSRF 与会话 Cookie 属性、未验证邮箱拒绝建会话、本机模式行为不变、队列配额）；
`tests/deployment.test.mjs` 9 组全过（含新增的「账号配置不完整时拒绝启动」三条）。

### 2. 逐文件审计（core/shared 41 个文件 + web 全部源码）后的修复

已修并复现：证书输出截断时 `JSON.parse` 冒到请求层（改为 `corrupt`，不回退退出码）；
重放把 `pending` 报成 `ok: true`；`instanceOf` 把"没有判定"当反驳；
条件推导退回"目标自身假设"当条件（查证书发现 `open_hypotheses` 是空集）；
饱和截断只报 `undecided`；`verify` 缺理论哈希 / 缺白名单时两处 fail-open；
`unify` 吞掉深度超限；解析器无深度上限（4 KB 输入即栈溢出）；
`judgment` 把"没有检查结果"说成"无条件"；`hash-mismatch` 只进 warning；
`LC28` 把"没算完"当"不可达"。
前端：深链裸 `%` 白屏（加解码兜底 + 全站错误边界）、删除视图无确认、任意 404 说成"版本落后"、
加载失败被吞成"正在连接…"、辅导轮询不终止、笔记 409 无法自愈、"复制链接"其实不复制。

**未修但已记录**：`theory.mjs` 与 `backgrounds.mjs` 各有一份背景定义（主流程未受影响，
但回退到字符串 id 会静默丢背景公理）；`maxSteps` 搜索期形同虚设；前端若干写死的规模数字。

### 3. 已知缺口（如实记录，不用放宽判据掩盖）

`limit` 案例没有证书型非纯文本关系。此前那条 `conditionalDerivation` 是**前提虚报**：
证书的 `open_hypotheses` 为空集，即关系写着 A∧B ⊢ C 而证书实际证的是 ⊢ C。
修正后它回到真实完成度（5 条定义引用、0 条证书型），
`tests/relation-discovery-e2e.mjs` 把它记为白名单里的唯一缺口，新增缺失仍会让测试红。
其余三案：group 3 条、manifold 2 条、tensor 1 条。

### 4. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run check` | 通过 |
| `npm test` | 见下方日志 |
| `npx tsc -p web/tsconfig.json --noEmit` | 通过（0 错误） |
| `node --test tests/auth.test.mjs` | 7/7 通过 |
| `node --test tests/deployment.test.mjs` | 9/9 通过 |
| `node --test tests/relation-discovery-e2e.mjs` | 10/10 通过（limit 记为已知缺口） |
| 解析器深度守卫实测 | 2000 层括号、20000 层箭头：均从 `RangeError`/500 变为 400 + `resource_exhausted` |

### 5. 还没做的

公网持久化（PostgreSQL）、前端登录界面、验证邮件发信、托管与仓库推送；
`server/**` 与 `data/**`、`tests/**` 尚未逐行审计（`core/**`、`shared/**`、`web/**` 已审完）。

## 第七十四轮：末幕人像播完立刻收，不停留（2026-10-04）

用户要求：「播完人像后，动画立马消失不停留。」

### 1. 改了什么

`StoryPortrait.tsx` 的播放循环里，最后一帧之后原本还有一个
`hold = setTimeout(() => setVisible(false), HOLD_MS)`（`HOLD_MS = 2600`）——
留那一拍是为了让人看清最后那个手势，但它也让画面在末幕正中间多挂了两秒多。
现在改成**到达最后一帧就直接 `setVisible(false)`**，`HOLD_MS` 随之下线。

退场仍走 CSS 的 `transition: opacity 200ms`：那只是过渡，不是停留。

### 2. 冷却跟着缩回 3 秒

`HomeNarrative.tsx` 的 `PORTRAIT_COOLDOWN_MS` 原来按「播一遍 2.56s + 停一拍 2.6s + 淡出」
取 6000；停一拍没了之后它必须跟着回落，否则人像早就播完了、再触发却没有反应。
现在取 **3000**（略长于 2.56s 的播放），语义仍是「演着的时候再触发不重启，演完再触发可以再看一次」。

### 3. 实测

点末幕署名里的作者名之后逐 60ms 采样：

| | 到达最后一帧（127） | 变不可见 |
|---|---|---|
| 第一次 | 2500ms | 紧接着（只剩采样粒度与 200ms 淡出） |
| 第三次（冷却过后） | 2607ms | 紧接着 |

改之前是「最后帧 + 2600ms」才收；现在这一拍没有了。

### 4. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node tests/browser.mjs` | **通过**；新增一条「播完立刻收（不停留）」 |
| `npm test` | **40/40 组全部通过**（日志 `tmp/test-all11.log`） |

### 5. 定向验收覆盖（`tests/browser.mjs`）

新增的那条按「最后一帧 → 不可见」的间隔判，**阈值 700ms**：
它同时排除「立刻收」（< 700）与「停一拍」（≈ 2600）两种实现，把停留改回来就会红。
另外同时读 `data-frame` 与 `data-visible`，避免与那条「人像出现后自己往下播」互相遮挡。

### 6. 一次自己造成的假象（如实记录）

第一版验证脚本在点幕导航后只等 900ms 就触发。但导航是**平滑滚动**（约 1.5s 才落到末幕），
人像那时还没挂上；Playwright 又会把还没滚到的按钮自己滚进视口、打断叙事滚动，
于是 `active` 到不了末幕，量出来整段都是 `frame=null`。**这是脚本的问题，不是组件的问题**：
改成先 `waitForSelector('.story-portrait')` 再点，时序就正常了。

## 第七十三轮：末幕人像的入口收束到署名里的作者名按钮（2026-10-04）

用户要求：「把最后一幕中下方作者和联系邮箱那里的『沛恒』字样做成按钮，点击触发人像，外观不变。」

### 1. 第四次改口径

前四版入口都挂在滚动上，共同的毛病是
**门槛要么太轻易、要么与花的力气不成比例**；这一版把入口放进末幕署名：
一个真 `<button>`，外观与原来的 `<strong>` 逐项一致。

滚动那条路上的特殊分支**整段删掉**（到底判定、滚动计时与配套的两个 ref 一并移除），
`next === index` 恢复成一句 `return`——滚动回到"只负责翻幕"。
冷却时间保留：它还在演的时候再触发不重启，演完再触发可以再看一次。

### 2. 「外观不变」是怎么做到的（也是怎么验的）

用**真 `<button>`**（而不是给 `<strong>` 挂 onClick）：键盘能 Tab 到、读屏会念出「按钮」，
这是可访问性；外观则靠 `.byline-author` 逐项抹平：

- 抄 `.byline strong` 的三项（`--serif` / `1rem` / `--ink-soft`）**再加字重 700**
  （`strong` 默认加粗，按钮默认不加粗）；
- 去掉背景、边框、内边距；`cursor: inherit`（**不改成 pointer**，鼠标移上去不变手型）；
- **`min-height: 0` 是必须的**：全站有 `button, .button { min-height: 40px }`（触摸目标），
  不抹掉的话按钮高 40px 而 `<strong>` 只有 19px，署名那一行会被撑高——
  实测 byline 高度 40 → 抹掉后 28，与只有 `<strong>` 时一致。

验收不比对一串 computed style，而是**把真 `<strong>` 换进去量一次、再换回来**：
文字盒（`Range.getBoundingClientRect()`）四个数完全相同（743.69 / 816.17 / 34 / 19，差值全 0），
byline 高度也不变。

### 3. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node tests/browser.mjs` | **通过**；入口与触发共 3 条（见下） |
| `npm test` | **40/40 组全部通过**（日志 `tmp/test-all10.log`） |

### 4. 定向验收覆盖（`tests/browser.mjs`）

1. **末幕署名里的「沛恒」是真的按钮**（`tagName === 'BUTTON'`）；
2. **外观与 `<strong>` 逐项一致**：文字盒四个数完全相同、byline 高度不变、背景透明、
   边框 `0px`、`min-height: 0px`、`cursor` 不是 `pointer`；
3. 点它之后 `data-visible` 变 `true` 且 opacity > 0.9（人像出现）。

原来那两条按滚动时长判的断言（"滑两秒不出现 / 滑满四秒出现"）随触发方式一起删除。

### 5. 记录在案的边界（本轮不改）

- 矮窗口（`max-height: 780px`）下 `.home-story-act.is-final .byline { display: none }`
  （既有设计：那一档把空间让给入口按钮与正文），所以**那一档点不到这个入口**；
- 极窄/降低动效时 `flowMode` 为真，视觉舞台整体不渲染，人像与光效都不出现（既有设计）；
- 按钮保留全站统一的 `:focus-visible` 描边：鼠标用户看不见，键盘用户必须有。

## 第七十二轮（已撤销）：末幕人像的滚动触发（2026-10-04）

那一版给末幕人像换了一套滚动计时闸门，并为此引入单次封顶与清零规则。
下一轮把这条路径整体撤掉：入口换成署名里的作者名按钮，滚动不再参与人像的任何判定。
本轮的命令与结果（`npm run build`、`node tests/browser.mjs`、`npm test` 40/40 组通过）当时成立，
对应的断言已随触发器一起删除；这里只留结论，不再保留已作废的实现细节。

## 第七十一轮：丝绸从左手指尖向外生长（2026-10-04）

用户反馈第七十轮像固定尖叶，要求「从中心向外延伸，从人物左手指尖附近出发，有层次感和流动感」。

- 发射点改为画面右侧举起的左手食指尖；抽查雪碧图并登记六个定位帧，帧间插值跟随动作。
- 六缕共用一个起点，每帧重算增长中的带面：带头延伸 → 波动翻面 → 带尾脱离 → 飘散淡出。
  旧版的固定形状与描边裁切揭示方式已移除；`clipPath` 不按 stroke/dash 裁切是旧效果未真正生长的原因。
- 三缕在前、三缕在后，宽度／透明度／曲率不同，窄高光沿翻折位置移动；紫色为主，品红及少量青色点缀。
- 指尖柔光与两道细涟漪给出可见的共同中心；光效两侧渐隐，雪碧图单帧裁切保留。

**FINITE / 视觉检查**：在真实浏览器中触发后，于 1440×950 截取七个时间点，
确认 wink 前无条带、六缕从同一点起步、带头向外延长、后半段尾部离开指尖、前后三缕均存在。
允许光效的最右缘为 477.49px，正文左缘 481px；无页面脚本错误。
复现脚本 `tmp/verify-fingertip-silk.mjs`，连续帧 `tmp/fingertip-silk-sequence.png`。

构建与 `npm run check` 已通过；完整回归结果在本轮结束后补记。
边界：指尖跟踪来自抽帧人工估计；未进行不同刷新率设备上的主观观感评测。

## 第六十九轮：首页底部收尾（删掉全站页脚 + 末尾不留空白）（2026-10-04）

用户先发来一张首页截图，用蓝色圈出页面最下方那一条，要求「首页里面，最下面的那个框删掉，
只删首页的不删别的页面的这个框框」；看到结果后又补了一句「我想要的效果是：蓝色线就是最底部」。

### 1. 先确认圈的是哪一条

底带上有**两条**独立的东西，先按几何量清楚（1440×950，滚到底，`scrollY=5018`）：

| 元素 | 位置 | 别的页面有没有 |
|---|---|---|
| `div.home-story-foot`（「滚轮先播放本幕动画… 浮现动画每幕只播一次… 知识 · 方法 · 路径」） | y 780–816 | **只有首页** |
| `footer.site-footer`（一条整宽横线 ＋「数学认知空间 MCS · 作者 沛恒」「联系邮箱 …」） | y 881–950 | **全站每页都有** |

把截图底部放大后可以看见：蓝圈的**上沿正压在那条横线上**，而「滚轮先播放本幕动画…」
那一行在圈**外侧（上方）**。再结合用户限定语「只删首页的不删别的页面的」——
`home-story-foot` 只有首页才有，这个限定语对它没有意义；所以圈的是**全站页脚**
`footer.site-footer`，只是要求只在首页隐藏。

### 2. 改法

`web/src/components/Layout.tsx` 里把页脚改成按路由渲染：`location.pathname !== '/'` 才渲染。
**首页不是"少一处署名"**——末幕的幕内署名（`HomeNarrative.tsx`）本来就写着同一份
「作者 沛恒 · 联系邮箱 peihengmath@gmail.com」，页脚那条是重复的整宽横条，
也是首页最后一屏里唯一与叙事无关的东西。别的页面没有幕内署名，页脚仍然是署名与联系方式的落点。

### 3. 第二步：让页面在那一行就结束

删掉页脚之后底部还剩一段空白。量下来是**通用规则给的**：`main.workspace` 有
`padding: 1.8rem 2rem 4rem`，而首页的内容（`.home-story-foot` 那行滚轮提示）到文档 5835 就结束了，
页面却被撑到 5899——**多出来的正好是那 64px**。

于是加一条 `.workspace.is-home { padding-bottom: 0 }`，由 Layout 按路由挂 `is-home` 类。
改完实测：文档高 5899 → **5835**，滚到底时内容底边 = 视口底边（就差 0 px），
末幕底部那行提示就是页面最后一行。别的页面照旧（正文与页脚之间仍需要那段留白）。

### 4. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node tests/browser.mjs` | **通过**；署名与底部收尾一组共 6 条（见下） |
| `node tests/home-narrative.mjs` | 通过（首页高度变了，这一步必须复跑） |
| `npm test` | **40/40 组全部通过**（日志 `tmp/test-all8.log`） |

实测：首页 `document.querySelectorAll('.site-footer').length === 0`、
`main.workspace` 的 `padding-bottom` 为 `0px`、文档高 5835 且内容底边与文档底边对齐；
`/start` 上页脚仍是 1。

**一次负载导致的假红（如实记录）**：中间有一轮 `npm test` 红在 `network-perf.mjs` 的两条
时间预算上（重新布局 3925ms / 预算 2500ms，单次阻塞 1225ms / 预算 800ms）。
单独复跑该步 **通过**，同一时段本机还跑着另一个会话的构建，且有一个从 09:30 起
累计 2000 秒 CPU 的 node 进程常驻。清静下来重跑全量即 40/40 全绿。

### 5. 定向验收覆盖（`tests/browser.mjs`）

原来只有一条「页脚署名含作者与邮箱」，且跑在首页上。现在拆成六问，**只删一边不算数**：

1. **首页没有全站页脚**（`.site-footer` 的 innerText 为空串）；
2. **首页底部不留空白**——内容底边（`.home-story` 的 `rect.bottom + scrollY`）与文档高相差 ≤ 1px，
   且 `main.workspace` 的 `padding-bottom` 是 `0px`；
3. 首屏署名（`.byline`）含作者与邮箱；
4. 侧栏署名含作者与邮箱；
5. 首页可点的邮箱链接仍在（侧栏 + 末幕幕内署名，共 2 条 mailto）；
6. 导航到 `/start`：**别的页面仍有全站页脚**，且页脚邮箱仍可点。

原第 4 条断言写的是「mailto 链接 ≥ 3」——首页少了页脚那一条就只剩 2，所以按新事实重算，
并补上「别的页面」那一侧，避免以后有人把页脚从全站删掉却仍然通过。

## 第七十轮：wink 同帧的徽记丝绸条带（2026-10-04）

用户要求增强首页末幕的人像：跟随 wink 向外迸发数缕丝绸般条带，沿用网站紫色 logo 配色，
并融入原有光效。实现保持触发、位置与退场规则不变，只扩展 `StoryPortrait.tsx` 的同帧 SVG 合成：

- 第 70 帧仍是唯一爆点；六条贝塞尔路径按 0 / 1 / 3 / 4 / 6 / 7 帧错峰出发，
  由 `frame - WINK_FRAME` 直接计算揭开与淡出，不新增 CSS 时间轴；
- 每缕由「深紫包边 + 紫／品红／青渐变缎面 + 沿路径外移的近白亮边」三层组成，
  颜色取 `--accent-deep`、`--accent`、`--accent-strong`、`--magenta`、`--cyan` 与徽记近白高光；
- 条带在人像之后、原有微粒之前，脸与手势仍是主角；六个方向的曲率、宽度、时长不同，
  避免机械对称；原有柔光、双环与微粒保留，组成「柔光 → wink 爆点 → 丝绸外展 → 微粒收束」；
- 根 SVG 允许丝绸尖端略微越出人像框，但雪碧图 `<image>` 单独裁在当前 `200×163` 帧内；
  浏览器验收同时检查 `clip-path`，避免越界光效把雪碧图的相邻帧一起露出来；
- `data-ribbon-progress` 与六个 `.story-portrait-ribbon` 作为可复现检查入口；浏览器验收新增
  「wink 时六缕主题色丝绸与人像共用帧时钟」。

验证结果：`npm run build`、`npm run check`、`npm test` 全部通过；完整浏览器验收确认
wink 时六缕条带同帧出现、与正文列零相交、控制台零错误，
并在 1440×950 实际截图复核了条带展开与雪碧图裁切。

## 第六十八轮：末幕收束处的作者人像（2026-10-04）

用户先要求：「把人像放到最后一幕的末端的左下角，不要挡住文本，动画随滚轮播放。」
看到成品后判定「有点出戏」，于是第二轮改成：**走到末幕、且页面真的到底之后才出现**，
并且**加入结合 wink 动作的主题色光效**。

### 1. 形态为什么换了

第一版是「连点侧栏作者名三次 → 右下角固定浮层播一段动图 WebP」。要「随滚轮播放」，
那个形态**做不到**：动图 WebP 由浏览器按时序自播，**外部无法指定"现在放第几帧"**。
可行做法只剩「每一帧都可寻址」：

- 128 帧拼成一张 **16×8 雪碧图**（格子 200×163、格子间 8px 透明沟、图幅 3336×1376、**0.98 MB**），
  比原先整段自播的动图 WebP（720×587×128 帧，3.81 MB）还小一个量级；
- 前端用 `<svg viewBox="0 0 200 163">` + `<image x={-格子x} y={-格子y}>` 取格子。
  不走 `background-position` 是因为显示宽度是响应式的：那条路要同时伺候 `background-size`
  与按比例换算的偏移，两处一旦不同步就错位；viewBox 让 SVG 自己把这一格缩放到元素大小，
  **不需要 JS 量任何尺寸**；
- 沟的理由：有损 WebP 在内容边缘几个像素内会有块状溢出，8px 透明沟把它挡在隔壁格子之外。

### 2. 出现时机（这一版的滚动闸门已在第七十三轮整体撤销）

第二版最初把动画挂在末幕进度上（滚到末幕就一直可见），被判定出戏——
**它会自己决定什么时候出现，等于替读者决定"现在该看这个"**。于是改成只在
`末幕已播完 && 页面真的到底 && 再往下操作几下` 时出现，且**界面上没有按钮、文字或提示**。

那一版的闸门按 wheel 事件的**间隔**合并计数（触控板一次滑动会连发几十个事件，
按事件数会变成"一次滑动即触发"），计数在往回倒放本幕、离开末幕、触发过之后清零。
这些规则的细节随入口改到署名按钮而整体删除：滚动不再参与人像的任何判定。

- 加了冷却（= 播一遍 2.56s + 停一拍 2.6s + 淡出）：
  冷却期内继续操作只让动画继续往前，**不会把它从头重启**；
- 出现后自己按 50fps 播一遍（与源片同帧率），停一拍淡出；Esc / 点一下 / 往上滚立即退场。

### 3. 光效：与 wink 同一条时间轴，取站点自己的颜色

- **wink 在第 70 帧**，逐帧量出来的：左眼竖直梯度从 15.6（第 68 帧）掉到 13.4（第 70 帧）
  并持续下降，而右眼要到第 78 帧才变——那是转头，不是眨眼。第 70 帧 ÷ 50fps = 1.40 s。
- 光效**不另起时间轴**：涟漪的进度由同一个帧号算出（`frame - WINK_FRAME`），
  因此与画面严格同帧，不会漂移。用 CSS `@keyframes` 就多一条会漂移的轴。
- 三层：常驻**品牌紫柔光**（垫在人像底下，把照片与整站紫／青体系接上）→ wink 时
  绽开**紫→青→琥珀渐变的环**（`stroke` 用 `var(--accent)` / `var(--cyan)` / `var(--amber)`，
  就是站点自己的颜色令牌）→ 六点微粒向外散开。
- 环画在 `<image>` **之前**（人像后面）。第一版画在前面，那一圈线横过脸，像给照片画了个圈；
  放到后面之后光环从肩后向外散开，只从轮廓外面露出来。
- 没有新增任何 `@keyframes`，所以**动效清单无需增删**，`tests/motion-coverage.mjs` 照旧通过。

### 4. 位置：按正文列与带宽算，不写死像素

| | 取值 | 1440×950 实测 |
|---|---|---|
| 水平 | `right: calc(50% + var(--hs-copy-half) + 1.1rem)`——右缘钉在**正文列左侧**，与「大字词」同一套基准 | 盒 x 287–463；与正文列（x 481–1217）**相交面积 0** |
| 垂直 | `bottom: clamp(1.1rem, 5.5vh, 3.2rem)` | 盒 y 585–728 |
| 尺寸 | `min(calc(var(--hs-band-px) - 1.6rem), 11rem, 20vh)` | 176×143 |

层序取 `z-index: 2`：在舞台遮罩（1）之上；正文的 `.home-story-act` 也是 2 且 DOM 排在后面，
因此正文永远压在人像之上——**即使哪天位置算错，也不会出现字被人像盖住**。

### 5. 实现边界

- 只在**走到末幕**时才挂载（`armed = 当前幕是末幕 或 末幕已有进度`）：近 1 MB 不该占首屏请求；
- `opacity` 用 CSS 过渡（进出场各一次）；不加 `drop-shadow`（每帧重新合成，得不偿失）；
- 降低动效**不需要另写分支**：`flowMode = reduceMotion || narrow` 时整个视觉舞台不渲染，
  人像与光效自然都不出现——这也是光效可以不走 CSS 动画清单的理由；
- 旧形态整套撤掉：删除早期那个浮层组件与随它下线的静态素材（`public/` 下的旧 author 图）。
  整段自播的动图 WebP 各档仍在管线
  `encode` 里留档。

### 6. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node tests/browser.mjs` | **通过**；本轮新增 7 条（见下） |
| `node tests/home-narrative.mjs` | 通过（人像就挂在末幕里，改布局必须复跑） |
| `node tests/motion-coverage.mjs` | 通过（没有新增动画） |
| `npm run check` | doctor 全部通过 |
| `npm test` | **40/40 组全部通过**（日志 `tmp/test-all3.log`） |

### 7. 定向验收覆盖（`tests/browser.mjs` 新增 7 条）

1. 雪碧图 `/portrait/atlas.webp` 返回 200 且 `content-type: image/webp`；
2. **末幕就位时人像不可见**（`data-visible="false"`、`opacity: 0`）——守「界面不留提示」；
3. 该出现之前**不出现**——守「触发不该太轻易」；
4. **满足触发条件之后才出现**（等 `data-visible="true"` 且 `opacity > 0.9`）；
5. 出现之后**自己往下播**（等 420ms 后帧号更大，不是靠继续滚动推进）；
6. 人像与**正文列零相交**（用户原话「不要挡住文本」，用两块 boundingRect 的相交面积守）；
7. 画的确实是雪碧图（`<image>` 在）。

### 8. 顺带补掉的服务端缺口

`server/index.mjs` 的 MIME 表里**没有 `.webp`**，会落到 `?? 'application/octet-stream'`
（本机实测：`.webp` 确实以 octet-stream 发出）。这与记录在 `tests/browser.mjs` 里
「图标与 manifest 的 MIME」是同一条老问题，因此并进同一处核对。已补 `.webp`、
重启本机服务并复测（`image/webp`）。

### 9. 踩坑记录

- **点幕导航之后是平滑滚动**（约 1.2 s 才落到末幕）。中途 `active` 会依次经过各幕，
  人像因此会短暂挂上又被摘下——`waitForSelector` 会抓到那一瞬间的假象（实测
  `portraitShown: true` 与紧随其后的 `count: 0` 同时出现）。改成「先等滚动停下来
  （连续两次采样 `scrollY` 不变）、**再等 `data-active-act` 变成 5**，然后断言」。
- **末幕播完时页面还没有到最底**：还要再走约 230px（约 2–3 格）才到页尾。所以
  当时那个滚动入口的真实体感是「末幕演完 → 再滚几下到页尾 → 再操作几下」。
  第一版没加冷却，末幕刚播完、后续每一下下滚都把它重启一遍。
- **「滚几下」不能按 wheel 事件数算**：触控板一次滑动会连发几十个事件，
  按事件数就变成「一次滑动即触发」；那一版改成按事件**间隔**合并。
- 截图本身有约 250ms 开销：按「目标帧 × 20ms」直接等待会晚 12 帧左右，
  出预览图时按「目标 − 250ms」给才掐得准 wink。
- **验收里等状态，不要等固定时长**：Playwright 派发 `mouse.wheel` 有延迟，
  淡入本身还有 200ms 过渡——那条「触发后才出现」的断言第一版用 `waitForTimeout(260)` 就红在
  一个与设计无关的时序上（`visible: true` 但 `opacity: 0`、`frame: 0`）。
  改成 `waitForFunction` 等 `data-visible` 与 `opacity` 同时到位。
- 雪碧图缩放必须走**预乘 alpha**（仓库里 `design/mcs-logo-*/build-web-assets.mjs` 早有这条约定）：
  1080 压到 200 的比例很大，不预乘的话人像轮廓一圈会发灰。
- **本轮工作期间同一工作区有另一个会话在并发改文件**（它改过 `tests/home-narrative.mjs`、
  `styles.css` 等）。有一次 `home-narrative.mjs` 的两条断言失败，复跑即通过，
  属于撞上对方改到一半；`styles.css` 也遇到过写入被版本守卫拦下、重读后重试。

### 10. 未验证

- 抠像质量靠抽点合成图与 1:1 头部放大对照判断，**没有逐帧人工检查全部 128 帧**；
- 位置只实测 1440×950；中间宽度靠「按带宽与正文列算」的公式，没有逐档量过；
- 光效的观感来自 1440×950 下的连拍截图，**没有在多分辨率、多刷新率下逐一看过**；
- 末幕插画里的「你」字在人像右侧：末端状态完整可见，但手部动作经过时可能与之重叠——
  这是装饰层之间正常的前后关系，正文一列不受影响。

素材来源、哈希、管线与全部取值见工作区素材目录下的设计笔记（不随发布包分发）。


## 第六十七轮：两处 logo 按用户圈定的区域重排（2026-10-04）

用户在一张首屏截图上圈了两处：「把渐隐的 MCS logo 放到红色圈内的位置，紫色的 logo 放到蓝色圈位置，
大小和圈的大小相仿。」——紫徽记原地放大并往内挪，MCS 字标从右侧带挪到**中右**，且从「封面字」
变成**正文背后的渐隐水印**。

### 1. 量出来的坐标（全部按舞台宽/高的比例，不写死像素）

| | 用户圈的位置 | 落到的取值 |
|---|---|---|
| 紫色徽记 | 左上，中心约 (20%, 30%)，直径约 27% 舞台宽 | `left: 7%`、中心 (20.5%, 26.7%)、宽 `min(27%, 20rem, 38vh − 5rem)` = 1440 下 **300px**（第六十六轮是 167px） |
| MCS 字标 | 中右，约舞台宽的 39%–80% | `left: 46%`、宽 `min(50%, 60rem)` = 1440 下 **591×182px**、中心 (73%, 45%)（原来贴右缘、264px） |

- 徽记的第三项上限 `38vh − 5rem` 是**为矮窗口算的**：它保证角标下缘停在左侧那摞关键词
  （垂直居中）之上，1280×720 / 1440×780 这类窗口里不会盖住「知识节点化」几条。
- 字标右端伸到**柔光罩之外**（柔光罩只护住舞台的 16%–84%）：所以「CS」收笔那一段是清楚的，
  左边大半落在白 0.9 的柔光罩下、只剩约一成颜色——「渐隐」的浓淡递进就是这么来的。
  它同时是正文**背后**的水印（仍在视觉舞台 z-index 0，柔光罩 1、正文 2 压在它上面）。

### 2. 实现边界

- 样式 `web/src/styles.css`：`.home-story-ghost-word.is-mark` 从「贴右缘 + 宽度反推」改成
  「`left: 46%` + 宽度按舞台宽 + 保留左端渐隐」。选择器必须带 `[data-side='right']`——
  基础规则那条是 (0,2,1)，比 `.is-mark`（0,2,0) 更具体，不带就把 `left` 让回去了（本轮记一笔）。
  角标改为 `left: 7%` + 上面那三档尺寸。
- 渲染层 `web/src/components/HomeNarrative.tsx`：水印那一格的底色从 0.72 提到 **0.9**
  （只对带图记的幕）：它大半压在柔光罩之下，按文字版那一档会淡到认不出——这是量出来的。
- 测试 `tests/home-narrative.mjs`：字标那两条断言**换了一套判据**，不是改几个数——
  前两版管的是「四周带里的一格」，于是要它「不许越过正文列」；现在它是正文背后的水印，
  **横过正文列正是设计**，「能不能读正文」改由**层序**兜着（断言 `markInsideVisualStage`
  且 `!markInsideCopyLayer`，配合既有的 zOrder 那条）。新判据：图加载、整幅在舞台内、
  ≥ 舞台宽的 35%、中心落在中右（x 45–80%、y 30–60%）、确实带 `mask-image`。
  角标那条也把「不压正文」换成「在视觉舞台里」（放大后它的外框本来就会与正文块相切，
  与用户圈的圈一致），尺寸区间改到 220–420px。
- 顺带修掉一处**负载下的假失败**：「跳过动画落到开始学习页」原来是点了之后固定等 700ms，
  本轮负载高时采到过「页面在、板块还没渲染」的中途状态（`heading: ""`、`cases: 0`，单跑又绿）。
  改成 `waitForSelector('.start-page #cases .angle-card, #angles .angle-card')` 等**板块真的在 DOM 里**
  （15s 上限），与仓库里另外两处固定等待是同一类修法。
- **不改**文案、其余五幕、服务端与本体；不新增依赖；不新增 `@keyframes`。

### 3. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node tests/home-narrative.mjs` | 通过（**145 项**：本轮把字标 2 条换成 3 条新判据、角标 1 条改口径） |
| `node tests/browser.mjs` | 通过 |
| `node tests/motion-coverage.mjs` | 通过（没有新增动画） |

人工核对（本机临时产物）：`tmp/theme-act-1000.png`、`tmp/theme-act-780.png`（两档首屏）、
`tmp/zoom-mark.png`（水印放大：右端清楚、左端渐隐）、`tmp/zoom-corner.png`（徽记放大）。

### 4. 未验证 / 未声称

- 「大小和圈相仿」是按用户截图里的比例量出来的（截图与测试视口的比例换算见第一版记录），
  没有做用户测试；圈是手画的，本身不带精确尺寸。
- 水印压在正文列上（这正是「渐隐」的效果），读正文由柔光罩兜着；**没有测过**它对阅读的影响。
- 只覆盖 Chrome 与测试视口；`mask-image` 与 `drop-shadow` 在其它浏览器的表现未实测。

## 第六十六轮：左上角角标加大 + 让开吸顶报头（2026-10-04）

用户要求：「左上角的 logo 大一点，不要被挡住了。」两句分别对应一个改动。

### 1. 「被挡住」是怎么发生的（先说根因）

第一幕首屏会自动**居中**（组件把内容中心对齐到「顶栏之下、报头之下」那一段的中心）。
居中的代价是：**段落顶端落在吸顶报头下面**。把两个高度代进去可以算出偏移量——

```
段落顶端相对视口 = 顶栏高 + 报头高 / 2 − 3svh
⇒ 报头底边离段落顶端 = 报头高 / 2 + 3svh
```

实测：1440×1000 是 **63px**、1280×720 是 **55px**。角标原先从段落顶端起算 `clamp(1.6rem, 5vh, 3.4rem)`
（≈50px），于是最上面那十几像素正好压在报头底下——这就是「被挡住」。

### 2. 实现边界

- 渲染层 `web/src/components/HomeNarrative.tsx`：原来只量顶栏（`--home-story-top`）的那个 effect
  扩成**同时量顶栏与报头**，新增 `--home-story-masthead`（`ResizeObserver` 两个都观察，
  报头换行变高时也跟着走）。
- 样式 `web/src/styles.css`：`.home-story-corner-mark`
  - `top: calc(var(--home-story-masthead, 66px) / 2 + 3svh + 0.9rem)`——与上面那条根因式子同源，
    再加 0.9rem 余量：任何视口高下都落在报头之下（实测各档间隙 13–15px）；
  - `width: min(带宽 × 0.75, 11rem, 17vh)`——**加大**（1440×1000：102 → 167px；1220×782：51 → 85px；
    1600×1100：176px）。三档上限各有理由：带宽那条不让它横向压到正文列，
    `11rem` 防超宽屏变招牌，`17vh` 防矮窗口顶到正文头上；
  - 柔影改成**两层**：先一圈白色柔光再投紫影，让徽记从经过它的图形线里跳出来。
- 测试 `tests/home-narrative.mjs`：
  1. 首屏那条角标断言里新增 `clearOfMasthead`（`rect.top >= 报头底边 + 1`）与 `hitsMasthead`（面积 0）；
  2. **每个固定舞台视口各量一次**（7 档）——根因式子里的偏移随视口高变，只在一个视口量过不算数；
     量之前先把「主题」幕**摆回首屏位置**（对齐公式与组件的 `centerOffsetFor` 同一条）。
- 尺寸断言从 56–170px 提到 120–220px（1440×1000 实测 167px）。
- **不改**文案、其余五幕、服务端与本体；不新增依赖；不新增 `@keyframes`。

### 3. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node tests/home-narrative.mjs` | 通过（**144 项**：本轮新增 7 条「各视口不被报头挡住」+ 1 条首屏清空判据） |
| `node tests/browser.mjs` | 通过 |
| `node tests/motion-coverage.mjs` | 通过（没有新增动画） |

人工核对（本机临时产物）：`tmp/theme-act-desktop.png`（1440×1000 首屏，167px）、
`tmp/corner-1220.png` / `tmp/corner-1280.png`（最窄两档，85 / 107px，与报头间隙 15px）。

### 4. 写这段测试时踩到的坑（记下来）

第一版直接把角标量进了原来的「7 个固定舞台视口」循环，结果**七条全红**：那些循环点是在
别的幕上量的（实测角标 `top: -3825`——页面早滚走了）。角标在不在报头之下，**只有第一幕居中时才有意义**，
所以循环里要先摆回首屏位置再量。这条修正是本轮测试的主要工作，也写进了断言上方的注释。

### 5. 未验证 / 未声称

- 「大一点」到什么程度算好是编辑判断：167px 是照着左上角留白（约一个带宽 223px）取的，
  没有做用户测试；各档上限（带宽 / 11rem / 17vh）里 17vh 只在 1280×720 一类矮窗口真正生效。
- 报头在**滚动到别的幕**之后仍会盖住上一幕的左上角——那是吸顶报头的固有行为（内容从它下面滑过），
  本轮只保证**首屏**不被挡，没有改吸顶行为。
- 白色柔光是在浅底上做的观感选择，未做对比度实验（第六十三 / 六十五轮的浏览器边界同样适用）。

## 第六十五轮：徽记挪到左上角、带内换站点字标（2026-10-04）

> 编号说明：本轮是首页那条线（第六十一至六十三轮）的后续；第六十四轮是并行的形式层收尾。

用户要求：「这个紫色的 logo 放到首页第一幕的左上角，右侧居中的位置放 MCS 那个 logo：大一点，
透明渐变往中间靠。」——即第六十三轮那枚带内徽记**换位置**，带内那一格改成站点字标。

### 1. 实现边界

- 内容层 `web/src/home-narrative.ts`：`HomeNarrativeAct` 增加 `cornerMark?: { src; width; height }`；
  「主题」幕改为 `cornerMark: /logo-256.png`（紫色徽记，与 favicon / 应用图标同一份导出）+
  `bandMark: /wordmark-256.png`（彩虹 MCS 一笔字，与侧栏品牌同一份）。两份都用 256 导出。
- 渲染层 `web/src/components/HomeNarrative.tsx`：视觉舞台里新增 `<img className="home-story-corner-mark">`
  （只在 `act.cornerMark` 存在时渲染），带内那一格照旧按 `act.bandMark` 渲染图片。
  两处都在 `aria-hidden` 的视觉舞台里，`alt=""`；窄屏（整块舞台不渲染）照旧没有它们。
- 样式 `web/src/styles.css`：带内图记从「按 `max-width` 夹住」改成**按右缘定位 + 宽度反推 + 左端渐隐**——
  `width = (带宽 − 右缘留白 − 间隔) / --mark-solid`，保证**实心那一段**落在带宽里，
  再用 `mask-image` 从 `--mark-solid` 渐隐到 `--mark-fade`（=1）让左端「往中间靠」。
  `--mark-solid` 取 **0.70**：同一页上试了 0.55 / 0.62 / 0.70 / 0.78 四档，
  0.55 时「M」淡到认不出标志、0.78 时渐隐带短到看不出方向。新增 `.home-story-corner-mark`
  （左上角、`min(带宽 × 0.5, 6.4rem, 11vh)`）。左带镜像规则也写了（目前没有幕用到）。
- 测试 `tests/home-narrative.mjs`：带内那一格的判据从「整盒不越正文列」改成**按实心段判**
  （新增 `markSolidHitsCopy` 面积判据、`markFadeTowardsCopy` 正向核对渐隐带确实越界、
  `markInsideStage`），实心比例从 CSS 的 `--mark-solid` **原样读回来**（不另抄一份数）；
  新增 2 条角标断言（只有「主题」幕有、是紫色徽记且加载成功；落在左上角 30% 区域里、
  不压正文、整块在舞台内、宽 56–170px）。
- **不改**服务端、本体、其余五幕；不新增依赖；不新增 `@keyframes`。

### 2. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node tests/home-narrative.mjs` | 通过（**136 项**：上轮 134 + 本轮新增 2 条角标断言，带内那条改写口径） |
| `node tests/browser.mjs` | 通过（首页首屏、末幕入口与全站交互未受影响） |
| `node tests/motion-coverage.mjs` | 通过（本轮没有新增动画） |

人工核对（本机临时产物）：`tmp/theme-act-desktop.png`（1440×1000 首屏）、
`tmp/mark-solid-055/062/07/078.png`（四档渐隐比例对照，选 0.70）、
`tmp/theme-mark-1220.png` 系列（最窄固定舞台）。

### 3. 定向验收覆盖

- 带内字标：`/wordmark-256.png` 加载成功、整幅 264px（1440×1000，比第六十三轮那枚 138px 的徽记大）、
  整幅在舞台内、**实心段 185px 与正文块零交叠**（面积 ≤8px²）、渐隐带确实越过正文列边界、
  中心仍在四周带（≥78%）；其余五幕仍是「编号 + 幕名」且对比度 ≥6。
- 左上角角标：只有「主题」幕有；`/logo-256.png` 加载成功；中心落在舞台左上 30%×30% 区域内；
  与正文块零交叠；整块在舞台内；宽 56–170px（实测 102px）。
- 两处都随本幕进度淡入（`opacity ≥ 0.7`），窄屏形态下整块舞台不渲染（旧断言仍然守着）。

### 4. 未验证 / 未声称

- 「大一点」「往中间靠」到什么程度算好，是编辑判断：本轮用**同一页四档对照**选的一档，
  没有做用户测试；四张对照图留在 `tmp/`。
- 渐隐带压在正文列右缘那一小条上（这正是「往中间靠」），读正文由柔光罩兜着；
  **没有测过**它对阅读速度或专注度的影响。
- 只覆盖 Chrome 与测试视口；`mask-image` 在其它浏览器的表现未实测（第六十三轮的边界同样适用）。
- 触摸/窄屏看不到这两处图记——与改版前「01 主题」文字一样，属既有形态，不是本轮引入。

## 第六十四轮：三条遗留问题收口 + 极限案例拿到真证书 + 全套首次干净通过（2026-10-04）

> 编号说明：第六十一至六十三轮是并行的首页改动，本条目承接**第六十轮**（七条 P1）的验收收尾。

**本轮入口是上一轮留下的三条**（极限 0 条证书型关系、概念锚点挡住默认入库、扩展目录跨盘崩溃），
另加验收方点名的"界面测试只验到入口存在"。四条全部落地，**全套 `npm test` 首次干净通过（exit code 0）**。

### 1. 完成判据：四案例各自一条证书型关系（**已达成**）

```
node --test tests/relation-discovery-e2e.mjs → 10/10
  ✔ 强形式：四个案例各自都要有一条证书型已验证关系
  group proved=3 | limit proved=1 | manifold proved=2 | tensor proved=1   （上一轮 limit=0）
```

极限那条证书：**35 步、904 状态、456–731 ms、真 kernel `passed`**，规则链贯穿
`theory`(ε–N 展开) → `definition`(`const_seq ≜ λa.λn.a`) → `h_axiom`(abstraction β)
→ `theory`(距离公理) → 四次 `eq_e` 化简 → `imp_i`/`all_i`/`ex_i` 收口。
走**真实入口**（`discoverRelations`）也通：`[limit:constant-seq] 候选 4 | verified 2 | 证书型 1`。

三个卡点的最终状态：

| 卡点 | 修法（都不是放宽） |
|---|---|
| λ 项作函数参数被 `theory.mjs` 拒收 | **先确认 kernel 自己也拒收**（拿一份含 `['app',['lam',…],x]` 的最小 `refl` 证书直接喂 `kernel.py` → `failed: object/certification language confusion`）。所以正确解法是**补上 kernel 唯一承认的那条通道**：装配时把项位置的裸 λ 提升成 `lift(λ, 自由变量表)`（`certifyTerm`/`certifyFormula`/`hasRawLambda`），与 `abstraction` 公理同一条路。含义不变、形状可检 |
| 背景项定义（`const_seq`）用不起来 | 定义等式进程序 + 允许**定义名**的展开/折叠让目标变大（其它等式仍只许化简） |
| `⇔` 公理让搜索爆炸 | ① 按目标方向剪枝的 ∀-实例（`⇔` 用 `and_l`/`and_r` 取需要的一边）；② **饱和里 `all_e` 优先在目标项上实例化**（最有效的一刀）；③ 后向重写按化简幅度排序、不许越换越大；④ 结构化等式公理当**定向重写**用 |

**顺带修掉一类假阳性（值得单独记）**：`unify` 内部的 `whnf` 会展开定义，于是
`seq_conv(const_seq(aa))(aa)` 会在合一过程中变成 `seq_conv(lift(λa.λn.a)(aa))(aa)`，
搜索交出**"证了展开后那个命题"的树**并报 `proved`。修法是**刚性匹配**
（只允许公理形状一侧绑定元变量、两边都不做 whnf）+「实例结论必须精确等于目标」的核对。
这类 bug **不报错，只让你证出另一个命题**——凡"归一化发生在合一里"的证明器都有这个坑。

### 2. 概念锚点：明确"只在登记表内、不入库"，且不再阻断整批

用群骨架新建节点时会发现一条指向 `concept:group:abelian` 的已验证泛化关系——**数学上是对的**
（阿贝尔群细化群），但**概念锚点不是本体节点，发布模型里没有它的位置**。原先它同时进
`pending` 与 `problems`，于是"记为待证"变成整批 500，提示与行为矛盾。

现在**入库语义三分**（`diff.publishable` / `diff.pending` / `diff.excluded`，后两者各带
`reason` + 稳定 `reasonCode`：`concept-anchor` / `refuted` / `not-verified` /
`endpoints-not-published` / `certificate-unavailable`）：

- **`problems` 是唯一的阻断清单**，非空即 **409**（不再 500）；只选锚点提交 → 409 且提示写明
  「需要取消勾选或驳回」；
- 概念锚点只认 `concept:` 前缀与登记表 `CONCEPT_SPECS` 的 `node`/`concept`，**不含 `anchor`**
  （`anchor` 是真实节点，误收会把 `group:group-concept` 这种正常端点判成不可入库——第一版就踩到了）；
- 界面**默认勾选只按 `diff.publishable`**，并在审阅面板单列"不入库"一栏、写明
  「这不是系统出错，也不是命题不成立」；前端**不猜**前缀（冒烟里专门断言：没有服务端判据时，
  长得像概念锚点的已验证候选**不会**被自行排除）。

### 3. 跨盘：暂存布局与真实加载**同一条规则**

根因（探针实测）：`relative(repoRoot, extensionsDir)` 在**跨盘**时返回绝对路径，
被 join 进暂存根 → 第 3 步 500。而**更隐蔽的一处**是：证书路径字符串**参与本体版本哈希**，
于是"只有位置差异"也会让"切换后必须真的接管新版本"这条检查判失败——
这正是上一轮 C.3/C.4 转红的原因（`sha256:7e3cf8dc… ≠ sha256:d3e7c45b…`）。

修法是**两支但同一函数**：同盘（生产默认）照抄真实相对位置 → 路径字符串逐字相同 →
仍走最严格的 `version-equal`；跨盘走自包含布局 `staged-repo/data/extensions/`，
绝不把绝对路径 join 进暂存根。**检查没有放宽**：`verifyTakeover`（发布与回滚共用）三条缺一不可——
① 包已生效；② **激活指针确实指向本次写入的 rev**（这条以前反而没有，它才是"发布了却读不到"的直接判据）；
③ 内容同一（哈希相等用最强形式；哈希必然不等时逐条核对本包贡献的节点/关系/证据/契约）。
`commit` 结果新增 `takeover` 字段便于排障。

### 4. 界面测试：真的点完"确认入库"

```
✓ 点「确认入库」真的发出了 POST /api/v2/authoring/publications（与 /preview 分开记）
✓ 入库返回 200，且页面显示新版本号
✓ 版本列表里出现了这条新版本（不是只在提示里说了一句）
✓ 版本列表的条数比入库前增加了
✓ 入库预览显示服务端三分类计数；「待证」与「不入库」都没有被写成阻断项
```
自动关联页共 **69–72 个 check，无任何 `>= 0` 形式的断言**。
（"不入库"那一栏在本轮真实数据里走的是零分支——那两条候选是 `undecided`；为了不留空断言，
用**服务端真实形状的桩响应**在一个真浏览器里补了两条，跑完即 `unroute`。）

### 5. 命令与结果（**全套干净通过**）

```
npm run build   → 通过
npm run check   → doctor 全部通过（四份既有证书重放通过）
npm test        → 全部 mcs-web 验收通过（exit code 0）
```

| 套件 | tests | 结果 |
|---|---|---|
| 形式语言层 / 定义引用可信性 / 独立有限语义 | 36 / 7 / 17 | ✅ |
| 四案例形式表达登记 | 53 | ✅ |
| 发现引擎（合一、有界搜索、证书装配、目标核对） | 34 | ✅ |
| 自动关联：存储、发布事务与回滚 | 24 | ✅ |
| 新节点闭环（P1-3/4/5） | 3 | ✅ |
| 证书交接与发布（P1-6，含概念锚点 409 与跨盘） | 8 | ✅ |
| 快照完整性（P1-2/7，含跨盘"证书路径只有一个算法"） | 10 | ✅ |
| **四案例端到端（含强形式判据）** | **10** | **✅** |
| 自动关联页（无头 Chrome 真流程） | 69 check | ✅ |
| 领域内核与理论边界 / 本机 API / 浏览器 / 动效 / 性能 / 各页面 | 全部 | ✅ |

### 6. 本轮修掉的**别的东西**（"不报错、只是不对"那一类）

| # | 缺陷 | 后果 |
|---|---|---|
| 1 | `judges/shared.mjs#specParams` 只取 `element`/`object` 角色的声明 | `mul0 : G→G→G` 这种**函数角色**参数被漏掉，启发式拼出**欠量化**目标（`∀(e0:G). abelian_group(mul0)(e0)(inv0) ⇒ …`，`mul0`/`inv0` 仍自由）→ 搜索在带自由变量的命题上白烧预算，**看起来像"这条关系证不出来"**。角色是给人读的分类，不该决定量词包住谁 |
| 2 | `tests/relation-discovery-e2e.mjs` 自己手装 `ctx` | 与真实入口用的公理集**不同**（手装走 `kernelInputForBackground`，真实入口走重写后的 `backgroundAxiomsForKernel`）→ 同一条目标在探针里 `proved`、在真实入口里 `undecided`，而测试报的是后者，**谁也不知道差在哪**。现在改为走 `assembleEngineContext`，"测的就是跑的那条路" |
| 3 | `relation-engine.test.mjs` 的 ㉜ 钉的是**旧默认预算**（2000ms/10000 状态/depth 8） | 引擎现行 `DISCOVERY_BUDGET` 是 `perCandidateMs 8000 / depth 12 / maxStates 200000`。测试自己写错一个数字，于是在**整套连着跑**时偶发 `timeout`（实测 1179 状态 / 2004 ms）→ 拦住的是噪声、不是回归。现在硬断言挂在**引擎自己的常量**上，旧档只作诊断打印（时钟测量不当通过条件） |
| 4 | 原子目标的规则顺序（proof-engine 自述的回归） | 把"目标导向的公理实例"排在饱和**之前**，等于用一条更贵的路替换掉唯一能凑出目标的那条路 → 群的关键目标从 `proved`（12 步）变 `undecided`。这类"启发式把正确通道挤掉"的 bug **不报错，只变成 undecided** |
| 5 | `server/tutor.mjs` 用 `this.ontology.version` 写事件版本 | 老会话的后续事件会被盖上**新**版本号 = 往学习者数据写错标签 |
| 6 | `tests/helpers.mjs` 的测试服务器用**真实** `data/extensions` | 会读到你本机发布过的东西，还会往仓库里写内容包 |
| 7 | `POST /authoring/drafts` 调 `checkVersion(body)` 少传第三个参数 | 带 `ontologyVersion` 就 500——"创建服务端草稿"是死路，主流程根本走不到发现 |
| 8 | `definition-reference.mjs` 漏比候选自带的 `to.version` | 过期候选在重放时仍判成立；三处版本（登记 / 当前 / 候选）现在都要对得上 |
| 9 | 自动关联页三个缺陷 | 待确认提示与实际状态矛盾；草稿 `node` 一直为空导致主流程走不下去；禁用原因只写在 `title` 里 |

### 7. 一次工具误用与恢复（如实记录）

`tests/relation-engine.test.mjs` 被一次**行号截断**误删尾部（㉗ 的收尾 + ㉘ + 一条 atoms-only 断言）。
根因是拿 `Measure-Object -Line` 的计数当行号去 `Get-Content -TotalCount`——**两者对空行与结尾的口径不同**；
事后又拿"套件报的 tests 数"去反推顶层测试个数，而那个数**含子测试**。两次都错在
**用一个不等价的计数器推断文件状态**。恢复由原作者用**锚点定点替换**逐字贴回
（编号冲突处改记 `㉘′` 并注明原因，正文未改），现 34/34 通过。

**方法（这一条比事故本身重要）**：追加与回滚**只用追加式操作**；行号只认
`(Get-Content file).Count`；动手前先留副本；恢复只做**定点替换**，不做行号截断。

### 8. 未决（如实保留，不放宽断言）

1. `rel:limit:constant-seq-refutes-never-equal`（反例型）仍 `undecided`，判定器的理由是
   **「有限对象 null 不在登记表里」**——反例判定器要的具体序列/取值表在 `bg:limit/1` 里没有登记。
   这不是搜索能力问题，是**登记侧缺一份有限对象**。
2. `rel:limit:ed-equiv-seq` / `limit:bridge` 一组等价关系仍超预算 `undecided`
   （要 `limit_seq` 与 `limit_ed` 两个 ε–δ 公式互推，其中一向依赖 `choice_principle`）。
   完成判据不依赖它们。
3. 搜索里仍有工程限额（`candidatesOfType` 的 24–32、`SATURATION_CAP`）：到顶就不再展开、
   由目标导向规则继续收口。它们在注释里写明是**工程限额，不是数学结论**。
4. `/health` 的 `data.version` 是服务版本 `'0.1.0'`（历史同名不同物，非本次引入），未改。

**回看问题（这一轮的）：** 三次卡住都是同一个形状——**两个都"看起来对"的东西其实不等价**：
`Measure-Object` 的行数 ≠ 文件行号；暂存路径 ≠ 真实路径（于是版本哈希不等）；
`declarations` 的"角色" ≠ "这条陈述的自由参数"；测试手装的 `ctx` ≠ 引擎装的 `ctx`。
下次再遇到"明明应该一样却对不上"，先问：**我是不是在用两个不同口径的同一个名字？**

## 第六十三轮：「主题」幕的带内大字词换成站点徽记（2026-10-04）

用户要求：「把首页主题那一幕正文旁边的『01 主题』文字替换成网站 logo。」

指的是一幕正文**旁边**那一格（四周带里的「带内大字词」，`.home-story-ghost-word`），
不是标题上方那枚 kicker——kicker 是这一幕的语义标签（`aria-labelledby` 指向它），不动。

### 1. 实现边界

- 内容层 `web/src/home-narrative.ts`：`HomeNarrativeAct` 增加可选字段
  `bandMark?: { src; width; height }`（**只有「主题」幕**填：`/logo-256.png`，即 favicon / 应用图标同一份
  256px 导出；不用 1.4MB 的 `logo.png`——这里显示尺寸只有一百多像素）。
- 渲染层 `web/src/components/HomeNarrative.tsx`：带内那一格有 `bandMark` 时渲染 `<img alt="">`，
  否则照旧渲染「编号 + 幕名」。定位、`opacity` / `translateX` 的进度动画、`data-side` 左右交替**完全共用**，
  换的只是这一格里的内容；`alt` 为空是因为整块视觉舞台是 `aria-hidden` 装饰。
- 样式 `web/src/styles.css`：`.home-story-ghost-word.is-mark`（宽度取代字号：`min(带宽 × 0.62, 10rem)`，
  去掉字距与文字阴影）+ `.home-story-ghost-mark`（`width: 100%`、与末幕徽记同一套柔影）。
  那条「不许越过正文列」的 `max-width` 保险**继承不变**，因此三档固定舞台都整块落在带里。
- 幕名与编号没有丢：报头的幕导航、正文上方的 kicker、`aria-label` 都还写着；
  窄屏自然滚动形态下整块视觉舞台本来就不渲染（与改版前一致）。
- 测试 `tests/home-narrative.mjs`：`layering` 那一处增加图片几何（渲染宽、是否真的加载、
  是否整块在正文列外侧、有没有被 `overflow` 裁掉），并把原来那条断言拆成两条——
  几何断言（文字幕量对比度 ≥6，图记幕量尺寸与让位）与「只有『主题』幕是图记、其余五幕仍是编号 + 幕名」。
  **不解析 `max-width`**：它算出来是 `calc(50% - …)` 这种带百分比的表达式，`parseFloat` 只会得到 NaN
  （第一版就是这么误判成 0 的，被断言红出来），改为直接量正文列边缘的几何关系。
- **不改**服务端、本体与其它五幕的文案 / 图形；不新增依赖；不新增 `@keyframes`。

### 2. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node tests/home-narrative.mjs` | 通过（**134 项**：本轮把 1 条拆成 2 条，新增 1 条） |
| `node tests/browser.mjs` | 通过（首页首屏、末幕入口与全站交互未受影响） |
| `node tests/motion-coverage.mjs` | 通过（本轮没有新增动画） |

人工核对（本机临时产物）：`tmp/theme-act-desktop.png`（1440×1000 首屏）、
`tmp/theme-mark-1220.png`（最窄固定舞台 1220×782，徽记 70px）、`tmp/theme-mark-1600.png`（1600×1100，徽记 160px 触上限）。

### 3. 定向验收覆盖

- 图记：`/logo-256.png` 真的加载（`naturalWidth > 0`）、渲染宽 138px（1440×1000）、
  整块在正文列**右侧**（`left ≥ copy.right`）、没有被 `overflow: hidden` 裁到（图片宽 ≤ 外框宽）；
  1220×782 下 70px、1600×1100 下 160px，两档同样整块在带里（手动量的，不进断言）。
- 与文字版共用：`data-side` 左右交替（本幕在右）、中心落在四周带（≥78%）、与本幕正文卡零交叠、
  随本幕进度淡入（`opacity ≥ 0.7`，首屏 0.72）。
- 其余五幕：`!isMark` 且 `textContent` 仍是「编号 + 幕名」（`02 现状` … `06 愿景`），对比度仍 ≥6。

### 4. 未验证 / 未声称

- 只覆盖 Chrome 与测试视口；徽记在不同 DPI 下的观感（本次用 2× 设备像素核对过放大版）未逐档量。
- 「更像封面」是编辑判断，不是读者实验结论：没有做 A/B 或用户测试。
- 窄屏（≤1200px 宽或 ≤700px 高）不渲染四周带，因此**窄屏看不到这枚徽记**——与「01 主题」文字版一样，
  不是本轮引入的行为；若要在窄屏也露徽记，那属于改窄屏形态，需另立一轮。

## 第六十二轮：主要按键的「按下」反馈（2026-10-04）

用户要求：「给网站的主要按键设置点击效果。」做法是给主要按键加**按下反馈**（沉 1px + 缩放 0.98 +
指针落点高光 + 内阴影），不新增依赖、不改任何按键的行为与尺寸。

### 1. 实现边界

- 样式 `web/src/styles.css`：新增「主要按键的按下反馈」一块（挨着全站 `button, .button` 基础规则放），
  覆盖 `.button`（含 primary / ghost / small）、原生 `button`、`.nav-item`、`.brand`、`.angle-chip`、
  `.chip-clear`。其中三处实现选择是这一轮的主要决定，都写在同一块注释里：
  1. **按下用长写属性 `translate` / `scale`，不用 `transform`**：全站十来处悬停抬升写的是 `transform`
     （如 `.home-story-actions .button:hover { transform: translateY(-2px) }` 是 (0,3,0)），
     而 `translate` / `scale` 与 `transform` 是并列的独立属性，两者同时成立且不必比优先级；
     `:active { transform: … }` 那种写法在 (0,1,1) 上根本压不过悬停规则，写了也白写。
  2. **高光与内阴影放在自有伪元素 `::after`**（`inset: 0` + `border-radius: inherit` + 按按键尺寸取的
     椭圆径向渐变）：全站没有别的规则在按键上写 `::before/::after`，因此不打架；
     也**不需要 `overflow: hidden`**——高光画在按键内部，不会溢到邻居身上。
  3. **落点由 `--press-x/--press-y` 给**：新增 `web/src/components/PressFeedback.tsx`，在 `document`
     捕获阶段挂**一个** `pointerdown` 监听，把落点百分比写进 CSS 变量（不触发 React 重渲染）。
     缺省 50% / 50%，所以键盘激活（Enter / 空格）与没有这段 JS 时反馈照样有。
- 挂载点：`web/src/components/Layout.tsx`（全部路由都经过它）挂一次 `<PressFeedback />`。
- 降级：`prefers-reduced-motion: reduce` 下**只关过渡、保留状态**（仍然沉、仍然亮）。
  reduce 块里的选择器**连 `:active` 一起写**——按下时那条 `transition-duration: 80ms` 是 (0,2,1)，
  只写 `::after`（(0,1,1)）压不过，这正是 `.pick-hover-ring` 那次踩过的坑（本轮第一版就复现了一次，
  被 `tests/browser.mjs` 的新断言红出来）。
- 顺手修掉上一轮留下的过期文案：`App.tsx` / `HomePage.tsx` / `StartPage.tsx` / `Layout.tsx` 里
  6 处「五幕」改成「六幕」（其中 `Layout.tsx` 的 `title="回到首页动画（五幕叙事）"` 是**用户可见**的提示）。
- **不改**按键的行为、尺寸、层级与可访问性（不加 ARIA、不改 tab 顺序）；不改服务端与本体；
  不新增依赖；**没有新增任何 `@keyframes`**，因此动效清单无需增删。

### 2. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node tests/browser.mjs` | **通过**；本轮新增 10 条按下反馈断言（见下） |
| `node tests/motion-coverage.mjs` | 通过（本轮没有新增动画；reduce 下「没有任何元素还在动」仍成立） |
| `node tests/home-narrative.mjs` | 通过（133 项：按键所在的首屏与末幕入口未受影响） |
| `node tests/start-page.mjs` | 通过（按下反馈涉及的 chip / 按钮都在这一页） |
| `node tmp/run-all-report.mjs`（全量逐条、不中途退出；跳过两条先于本轮红的步骤） | 16:00 那一轮 **30/30 通过**；16:33 那一轮 28/30（日志 `tmp/run-all-report.log`），见下面的归属说明 |
| `npm run check` | doctor 全部通过（与本轮无关，仍复跑一次） |

**关于 16:33 那一轮的两条红（如实记录归属）**：`发现引擎（relation-engine.test.mjs）` 与本轮无关——
它单独跑是 **31 pass / 0 fail**（其中 ㉙「阿贝尔群 ⇒ 群」单独跑 787ms 通过），
那一轮是**并发负载**下撞上 120s 的墙钟预算（该轮 120066ms 超时；同一时段本轮在跑构建与浏览器套件）。
`证书交接与发布（publication-cycle.mjs）` 也**不是本轮引入**：失败的是 `C.2/C.3/C.4/C.6`，
而 `server/publication.mjs`、`tests/publication-cycle.mjs`、`core/formal/search.mjs`、`core/formal/backgrounds.mjs`
在 16:15–16:47 之间被**另一个并发任务**改动过（本工作区是共享的；同批改动还包括新增
`web/src/components/` 下那个浮层组件、`web/src/pages/AuthoringPage.tsx` 等本轮没有碰过的文件）。
本轮只改 `web/src/`（样式 + 一个仅写 CSS 变量的组件 + Layout 挂载点）、`tests/browser.mjs` 与文档，
不涉及 `core/formal/*` 与 `server/publication.mjs`。

`npm test` 仍然红在**先于本轮存在**的那一步（`tests/formal-cases.test.mjs` 的 `kernelInputForBackground`，
`bg:limit/1` 装配报「对象项/认证项混淆」），`run-all.mjs` 因此在该步退出——理由与证据见第六十一轮第 2 节，
本轮未触碰 `core/formal/*`、`data/cases/limit.mjs` 与那条测试。

### 3. 定向验收覆盖（`tests/browser.mjs` 新增 10 条）

这一段**真的按下鼠标**（`mouse.down()` 制造真实 `:active`），不是在样式表里找关键字：

1. `/plan` 的「开始规划」是真 `<button>` 且可按下（先查存在性、给 8s 短超时，缺元素要立刻红在断言上）；
2. 按下时 `translate: 0px 1px` 且 `scale < 1`，静止态两者都是 `none`；
3. 悬停的 `transform` 仍在（两种属性各管各的，互不覆盖）；
4. 高光落在**指针落点**：按在宽度 1/4 处，`--press-x` 量到 25%±8；
5. 按下时伪元素 `opacity ≥ 0.9`、背景是 `radial-gradient`、`box-shadow` 含 `inset`；
6. 松开后伪元素归零、位移与缩放归位；
7. `.nav-item`（侧栏导航项）按下同样有反馈；
8. `.brand`（品牌位）同上；
9. `.angle-chip`（角度 chip）同上；
10. reduce 上下文里：仍然沉 1px、仍然亮起，但 `transition-duration` 全为 0。

写这一段时踩到并修掉的两个测试问题，一并记下：① 目标不能挑依赖档案状态的元素
（`.button.primary` 在 `/start` 上要「回访者」形态才有，新 context 里根本没有 → 30 秒超时），
改成与档案无关就一定存在的「开始规划」按钮；② 按下会触发跳转/动作，用一次性 click 拦截
（capture 阶段 `preventDefault + stopPropagation`，后者让 React 的 `onClick` 也收不到）。

人工核对（本机临时产物，2× 设备像素、裁剪到按键附近）：`tmp/press-rest.png`（静止）、
`tmp/press-hover.png`（悬停，用于对照——悬停本身有 `brightness(1.08)`，拿静止态比会把悬停算成按下）、
`tmp/press-down.png`（按下）、`tmp/press-nav.png`、`tmp/press-brand.png`。

### 4. 未验证 / 未声称

- 只覆盖 Chrome 与测试视口：`translate` / `scale` 长写属性在其它浏览器（Firefox / Safari）未实测，
  代码里也没有写降级分支——旧浏览器只会丢掉这一层反馈，不影响功能。
- 「点击效果」只做了**按下反馈**（位移 + 缩放 + 落点高光），没有做「扩散涟漪」「音效」等更强的效果：
  前者需要 `overflow: hidden`（会裁掉按钮里的东西）或额外的 DOM，本轮按最小改动取舍。
- 触摸设备上的手感（手指按住时高光是否被手指挡住、`pointerdown` 到 `:active` 的时延）未测。
- 反馈是纯装饰：没有量过它对点击成功率或误触率的影响，也没有做用户测试。

## 第六十一轮：首页开头加一幕「主题」（五幕改六幕）（2026-10-04）

用户要求：「在 MCS 网站首页最开头再加一幕，简明扼要地大方展示网站主题。」
做法：在原有五幕**之前**插入一幕开场点题，不新增页面、不改其余五幕的文案与图形。

### 1. 实现边界

- 内容层 `web/src/home-narrative.ts`：`HomeNarrativeScene` 增加 `'theme'`；`HOME_NARRATIVE_ACTS` 首位插入
  「主题」幕（`id: 'theme'`、`number: '01'`、kicker「主题」、标题「数学知识连成网络，学习沿着思路展开。」），
  正文一段 + 三条主线条目（知识节点化 / 关系网络化 / 笔记人性化，各一句说明）；原五幕 `number` 顺延为
  02–06，`id`、标题与顺序不变。新幕带 `boundary`：「以上是本站的设计意图与当前形态，不是教学效果的实证结论」。
  文件头与两处按「第四幕」写的历史注释改成按**幕名**指称——加一幕之后编号会失真，幕名不会。
- 渲染层 `web/src/components/HomeNarrative.tsx`：新增 `ThemeScene`（从单个「数学对象」原点长出的知识网络 +
  一条从「已经理解」节点通向目标盘的路径；**首帧就画到四成**，滚轮推进的是「边补齐、路径走完」）；
  `PainIcon` 改名 `PointIcon` 并补三枚主线图标（节点 / 网络 / 笔记）。幕数、进度、左右交替、遮罩与大字词
  本来就按 `ACT_COUNT` 推导，本轮未改算法。
- 样式 `web/src/styles.css`：新增 `[data-act='theme']` 配色档（品牌紫 + 青，与「现状」幕靠第二色区分）；
  三条主线从默认两列改成**一行三列**（三条是并列关系，竖排会被读成先后顺序）；新增场景自己的三个类
  （`.story-theme-edge / -node / -origin`），其余复用既有 `story-*` 令牌；滚动区注释里「约 5.3 屏」按实测
  改成「约 6.4 屏」。
- 测试 `tests/home-narrative.mjs`：幕数断言改成按 `ACT_IDS.length` 推导（不再写死 5）；按新幕序改写顺序与
  标题断言；新增 6 条（主题幕点题、三条主线是三张图标卡且三列、三条主线的名字、主题幕的证据边界、
  「主题」与「现状」同一套无界感、三条主线的浮现错位）；页面高度断言改成按幕数推导（写死的 4.8–6.2 屏
  在加幕之后就是过期阈值）。`tests/browser.mjs`、`tests/start-page.mjs`、`tests/run-all.mjs` 的文案同步改成「六幕」。
- 文档：`README.md`（六幕叙事与版式约定两节）、`docs/网站介绍文案.md`（首页关系补注：`pain` 已是第二幕，
  其前另有 `theme` 幕）。
- **不改**服务端 API、公共本体 `data/`、数据库与学习者数据；不新增依赖。

### 2. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node tests/home-narrative.mjs` | **133 项全部通过**（含本轮新增 6 项） |
| `npm run check` | doctor 全部通过（本体形成检查、四份证书重放、36 算子、覆盖清单、无关系节点分类、论文锚点） |
| `npm test` | **红，但红在先于本轮存在的那一条**：`tests/formal-cases.test.mjs` 的「kernelInputForBackground：四个背景都能装配成 kernel theory」失败（`bg:limit/1` 报「对象项/认证项混淆」），`tests/run-all.mjs` 因此在这一步退出，其后的套件不再运行 |
| `node tmp/run-all-report.mjs`（逐条跑、不中途退出；跳过两条先于本轮红的步骤） | **30/30 通过**：形式语言层、定义引用、有限语义、发现引擎、自动关联存储、新节点闭环、证书交接、快照完整性、自动关联页、领域内核、API、浏览器交互与响应式、动效覆盖面、性能观测、首页六幕叙事、开始学习页、列表页、分面、分层、网络拾取/摆位/边/相机/视图、硬前置、辅导页、偏好引导、研究台与维护。日志：`tmp/run-all-report.log` |

**为什么说这两条红与本轮无关**：失败断言落在 `tests/formal-cases.test.mjs`、`core/formal/*` 与
`data/cases/limit.mjs` 上，本轮只改 `web/src/`（首页文案、组件、样式）、首页相关测试与文档；
第六十轮的记录里已写明 `bg:limit/1` 与 `limit_seq` 的登记待修，`relation-discovery-e2e.mjs` 里那条
「四个案例各自都要有一条证书型已验证关系」是**刻意留红**的（理由见该轮第 3 节）。

### 3. 定向验收覆盖

- 幕序与幕数：六幕顺序（主题 → 现状 → 路径 → 方法 → 体验 → 愿景）、六个幕导航按钮、六个图形层、
  六条大字词、页脚幕数、每段各自占位（两两间距 ≥0.9 屏）、页面总高随幕数变化。
- 主题幕本身：kicker 是「主题」；标题讲「知识连成网络、学习沿思路展开」；三条主线 = 知识节点化 /
  关系网络化 / 笔记人性化，三条都有图标、都是三列并排；边界句含「设计意图」与「不是教学效果的实证结论」；
  与六条现状共用同一套无界感（无边框、无卡底、无投影）与 60ms 错位浮现。
- 版式与既有保证：7 个固定舞台视口逐幕量裁切（含最窄的 1220×782）、窄屏与减动效的形态切换与横向溢出、
  1440/1280/1240 三档带宽下的四周带标签（每幕 3–5 条、不压正文、不出屏）、每幕可访问描述、
  层序与柔光罩、场景标题隐去而图形仍在、场景动画文字的屏上字号下限。
- 人工核对（本机临时产物）：`tmp/theme-act-desktop.png`（1440×1000 首屏）、`tmp/theme-act-second.png`
  （第二幕，核对左右交替整体翻转后的构图）、`tmp/theme-act-mobile.png`（390×844，三条主线单列）。

### 4. 未验证 / 未声称

- 「简明扼要」「大方」是编辑判断，不是读者实验结论：本轮只做了人工截图核对（上列三张），
  没有做用户测试，也没有测量理解率或阅读速度。
- 教学效果与学习收益仍未测量——与首页既有边界一致；主题幕自己也把这条边界写在幕内。
- 只覆盖 Chrome 与测试视口；其它浏览器的字形回退与 `mask-image` 表现未测（与 A3-17 的既有边界相同）。
- 主题幕新加的 `ThemeScene` 只有浏览器测试与截图核对，没有独立的图形语义单测：它的语义由
  `sceneLabel`（可访问描述）与 `tests/home-narrative.mjs` 的「每幕都有可访问描述」一条兜住。

## 第六十轮：首轮验收不通过的七条 P1 修复（2026-10-04）

**首轮验收结论：暂不通过。** 七条 P1 全部在代码里复现过，逐条修完后**只剩一条未达成**，
且它被写成一条**会红**的验收断言（不是"已知问题"清单里的一句话）。

### 1. 逐条状态

| # | 问题 | 状态 | 证据 |
|---|---|---|---|
| 1 | 定义引用因变量同名而错误成立 | **已修** | `tests/definition-reference.test.mjs` 7/7；假引用 0 候选、真引用 `proved` 且证据指向具体登记条目 |
| 2 | 内容完整性失败仍保持「已验证」 | **已修** | `tests/snapshot-integrity.mjs` 9/9：改坏端点 → 拒绝生效、保留上一份有效实例、坏内容不进 `current()`、`suspect` 供审查 |
| 3 | 新草稿的形式表达没参与发现 | **已修** | `tests/relation-cycle.mjs` 3/3：全新 node id → 候选 > 0、端点带 `origin:'draft'`、背景取自草稿声明 |
| 4 | 网站检查与引擎用了不同背景登记 | **已修** | 同上 D5：四案例各一条现成登记过 `/formal/validate` 全部 `ok:true` |
| 5 | 任务显示完成但异步结果没保存 | **已修** | 同上：POST 立即返回含 `pendingCheck` 的 run，结算逐条写回，**全部有结论才 `completed`**；DELETE 真的在候选边界停 |
| 6 | 已验证关系无法入库、证书交接不完整 | **已修** | `tests/publication-cycle.mjs` 6/6：**真的采纳并发布了一条已验证关系**，读回、重放、反例（改一字节即拒）全过 |
| 7 | 发布成功后网站仍读旧本体 | **已修** | `tests/snapshot-integrity.mjs` 的 C-3 硬判据（曾**故意红**）转绿：发布新节点后 `GET /ontology/nodes/:id` 200 且信封与 `data.version` 一致 |
| 8 | 验收测试没守住原定目标（P2） | **已修** | 详见下节 |

### 2. 第 8 条（测试强度）具体改了什么

- **定义引用的假通过**：新增 7 条断言，同时守住两个方向——"假的必须不成立"**与**"真的必须仍成立"。
  只守一边的实现可以靠"一律拒绝"蒙混过去。
- **四案例的强形式**：`relation-discovery-e2e.mjs` 新增一条**会红**的断言
  「四个案例各自都要有一条**证书型**已验证关系」，并**点出缺哪个案例**。
  首轮验收实测"极限 0 条"正是靠允许定义引用满足通过条件溜过去的。
- **恒真断言**：`tests/authoring-page.mjs` 里两处 `数量 >= 0` 已删除；整套重写成
  **52 条真流程断言**（套骨架 → 填字段 → 检查表达 → 建草稿 → 启动发现 → 轮询终态 →
  审阅 → 入库预览），每一步断言"真的发出了请求 / 页面上真的出现了什么 /
  或者明确写出了为什么没有"。全文件不再出现与 0 比较的断言。
  实测：**52 ✓ / 0 ✗**。
- **空采纳列表的发布测试**：`publication-cycle.mjs` 的 C.1–C.6 现在**必须**采纳并发布
  至少一条已验证关系，并读回、重放；另加"改一个字节即拒"的反例。

### 3. 唯一未达成的一条（**如实记录**）

**`limit`（极限）案例还没有证书型已验证关系。** `relation-discovery-e2e.mjs` 的
「强形式：四个案例各自都要有一条证书型已验证关系」因此**红着**——这是刻意的：
一条绿色测试掩盖"极限案例其实没证出来"，正是上一轮能溜过去的原因。

这一轮为它做的、已落地的部分：

1. `bg:limit/1` 现在有**两条定义性公理**（`bg-seq-conv-expansion`、`bg-limit-ed-expansion`），
   把 `seq_conv` 的 ε–N 展开与 `limit_ed` 的 ε–δ 展开升成公式——另外三个背景早就有这一层，
   极限漏了，所以它的谓词在证书里只是**未解释的原子谓词**，没有任何推理起点。
   `tests/formal-cases.test.mjs` 的 53 条里包含对这两条公理的**结构化核对**
   （剥 ∀ → 必须是 `⇔` → 左件必须是 `B(谓词)` → 右件与登记的 `expansion` 逐字一致）。
2. 仍然证不出来的确切卡点（两个探针都留在 `tmp/probe/`）：
   - `rel:limit:eval-derives-constant-seq`（`seq_conv(const_seq(aa))(aa)`）需要把
     `const_seq` 这个**背景项定义**（`λ(a:R).λ(n:N). a`）展开成 `const_seq(bb)(nn) = bb`。
     那是 kernel 的 `definition` 步骤，子句化路径目前不为它产出原子；临时补一条同名公理
     再试仍是 `timeout`/`undecided`。
   - `rel:limit:ed-equiv-seq` 的 `limit_seq` 展开式本身有问题：它写的是
     `∀(xx:N -> R). (…) ⇒ seq_conv(λ(n:N). f(xx(n)))(L)`，而 `limit_seq` 的类型是
     `(R -> R) -> R -> R -> o`，展开式里的 `f`/`L` 与 `xx` 都不在题设里——**这条登记要先修**。
   - 实测（`tmp/probe/limit-axioms.mjs`、`limit-lemma.mjs`）：
     `limit_ed ⇔ expansion` 这类**合取式的 `⇔`** 会让搜索爆炸（60 s / 30 万状态仍是
     `timeout`/`undecided`）。这是**有界搜索的能力边界**，不是"命题为假"。

**下一步要做的**（不在本轮范围内，已写成可执行的方向）：
① 让子句化/装配为 kernel 的 `definition` 步骤产出原子（`const_seq` 这类背景项定义）；
② 修 `limit_seq` 的展开式登记；③ 给"合取式 `⇔`"的公理的可用方向做剪枝，
而不是把它整条丢给通用搜索。

### 4. 命令与结果

```
npm run build   → 通过
npm run check   → doctor 全部通过（四份既有证书重放通过）
npm test        → 除上述「强形式」那一条外全绿
```

| 套件 | tests | 结果 |
|---|---|---|
| 形式语言层 | 36 | ✅ |
| 定义引用的可信性（新增） | 7 | ✅ |
| 独立有限语义 | 17 | ✅ |
| 四案例形式表达登记 | 53 | ✅ |
| 发现引擎 | 31 | ✅ |
| 自动关联：存储、发布事务与回滚 | 24 | ✅ |
| 新节点闭环：草稿 → 任务 → 后台结算（新增） | 3 | ✅ |
| 证书交接与发布：采纳一条真实关系（新增） | 6 | ✅ |
| 快照完整性：失败即拒绝生效（新增） | 9 | ✅ |
| 四案例端到端 | 10 | 8 ✅ / **1 条验收断言红**（极限缺证书型关系） |
| 自动关联页（无头 Chrome，52 条真流程断言） | — | ✅ |
| 领域内核 / API / 浏览器 / 动效 / 性能 / 各页面 | 全部 | ✅ |

### 5. 本轮修掉的**别的东西**（都是"不报错、只是不对"那一类）

| # | 缺陷 | 后果 |
|---|---|---|
| 1 | `judges/derivation.mjs` 用 `new Set(check.openHypotheses ?? [])`，而它是**对象** | **所有条件推导候选在确认阶段抛 `object is not iterable`**——不只是"没结论"，是整类关系永远验不出来。`equivalence.mjs` / `generalization.mjs` 同源，一并统一成取标签 |
| 2 | `snapshot.mjs` 拼证书路径用原始版本 id（含 `:`）且相对 `repoRoot` | Windows 上 `mkdir 'rev:abc'` 直接 ENOENT，**任何机器证书都发布不出去**；两条约定（`dirNameFor` + 相对 repoRoot）现在只有一处实现 |
| 3 | `server/tutor.mjs` 用 `this.ontology.version` 写事件版本 | 老会话的后续事件会被盖上**新**版本号 = 往学习者数据写错标签；改成用会话自己那份 |
| 4 | `tests/helpers.mjs` 的测试服务器用**真实** `data/extensions` | 测试会读到你本机发布过的东西，还会往仓库里写内容包；已隔离到临时目录 |
| 5 | `POST /authoring/drafts` 调 `checkVersion(body)` 少传第三个参数 | 带 `ontologyVersion` 就 500——"创建服务端草稿"这条路是死的，主流程根本走不到发现 |
| 6 | `definition-reference.mjs` 漏比候选自带的 `to.version` | 过期候选在重放时仍判成立；三处版本（登记 / 当前 / 候选）现在都要对得上 |
| 7 | 自动关联页三个缺陷 | 待确认提示与实际状态矛盾（第一次点击其实已套用）；草稿 `node` 一直为空导致主流程走不下去；禁用原因只写在 `title` 里（窄屏与键盘用户看不到） |

**思想（与上一轮同一条，但这次是从失败里学到的）：测试的强度本身就是交付物。**
上一轮 156 项专项测试全绿，却让"极限案例其实一条都没证出来"和"新节点生不出候选"
一起溜过去——原因不是没测，而是**断言写得比承诺松**：允许定义引用满足通过条件、
`数量 >= 0`、采纳列表为空也算发布成功。这一轮把这些断言逐个换成
"真的走一遍并断言看得见的结果"，于是**红的那一条正好指出真实缺口**。

**回看问题：** 如果下一次验收只能看一条信号，看哪条？
答案是 `npm test` 里那条**会红的强形式断言**——它同时说明了"哪三个案例真的通了"
与"哪一个还没通、卡在哪"。一条全绿的测试如果连"缺一个案例"都照不出来，
那它的绿色本身就不是证据。

## 第五十九轮：自动关系发现与验证（首版）（2026-10-04）

**这一轮要回答一个问题**：用户从网站输入一份新的受限形式表达之后，系统能不能
**自动发现**候选关系、**验证**其中一部分、把**依据**摆出来，并让用户把选定结果
可靠地**加入**和**撤出**公共知识网络。

完成判据（逐字引自实施计划）：**四个案例都能至少发现并验证一类非纯文本引用关系；
用户能看懂成立条件、重放依据，并将选定结果可靠地加入和撤出公共网络。**

施工图与接口定义：[`docs/自动关系发现-接口与语言规格.md`](docs/自动关系发现-接口与语言规格.md)。
操作说明与覆盖报告：[`docs/自动关系发现-操作说明与覆盖报告.md`](docs/自动关系发现-操作说明与覆盖报告.md)。

### 1. 交付物

| 层 | 文件 |
|---|---|
| 受限形式语言 | `core/formal/language.mjs`（解析/类型/α 规范/哈希/读法/`parseSpec`/`validateDraft`）、`codec.mjs`（内核口径序列化）、`theory.mjs`（背景登记 + H_Schema + `buildKernelTheory`）、`kernel.mjs`（检查器调用） |
| 发现引擎 | `core/formal/terms.mjs`（kernel 同名函数逐条移植）、`unify.mjs`、`clauses.mjs`（定子句化 + `toProgram`）、`search.mjs`（有界搜索，收源码目标）、`certificate.mjs`（16 条规则全装配）、`lemmas.mjs`（`closeCertificate`）、`judgment.mjs`、`verify.mjs`（§2.10 目标核对） |
| 独立语义 | `core/formal/finite.mjs`（**不导入 kernel** 的有限求值器） |
| 背景与登记 | `core/formal/backgrounds.mjs`（6 个背景、16 条公理，其中 10 条定义性）、`data/formal/registry.mjs`（34 条 spec、24 条关系、49 条原句对照）、`data/formal/instances.mjs`（Z5 / S₃ 完整表） |
| 编排与判定 | `core/formal/discovery.mjs`、`judges.mjs`、`judges/*.mjs`（六类判定器） |
| 服务层 | `server/snapshot.mjs`、`authoring-db.mjs`、`publication.mjs`、`extensions.mjs` |
| 接口 | `server/api.mjs` 的 `formal/*`、`authoring/*`、`relation-discovery/*` 三族；`server/index.mjs` 支持运行期切本体快照 |
| 界面 | `web/src/pages/AuthoringPage.tsx`、`authoring.ts`、`FormalSpecEditor.tsx`、`RelationReviewPanel.tsx`、`PublicationPreview.tsx` + 导航/路由/节点页/维护页入口 |
| 测试 | `tests/formal-language.test.mjs`、`finite-models.test.mjs`、`formal-cases.test.mjs`、`relation-engine.test.mjs`、`formal-authoring-api.test.mjs`、`relation-discovery-e2e.mjs`、`authoring-page.mjs` |

### 2. 命令与结果

```
npm run build   → 通过（tsc --noEmit 无输出 + vite build）
npm run check   → doctor 全部通过（四份既有证书重放通过）
npm test        → 全部 mcs-web 验收通过
```

新测试逐套（全部 `fail 0`）：

| 套件 | tests | 说明 |
|---|---|---|
| `formal-language.test.mjs` | 36 | 含 5 组**真实 python 子进程**：H_Schema 七类模式（含 4 种 λ 项的 `abstraction`）与 `kernel.axiom()` 逐条对拍、证书 `passed`/`failed` 各一例、`h_axiom`/`definition`/`object_conclusion` 真跑、5 组样例 `digest` 与 kernel **逐字节一致** |
| `finite-models.test.mjs` | 17 | 独立性扫描（无 kernel import、无子进程）；坏表不能反驳；有限通过不升级为定理 |
| `formal-cases.test.mjs` | 48 | 34 条 spec 逐条解析/类型/无环；49 条原句对照读原稿做子串匹配；认证门槛不许放宽 |
| `relation-engine.test.mjs` | 31 | 自动生成的证书真跑 kernel：合取交换、定义展开、全称/蕴含消去、`abstraction` β、存在规则、闭引理引用、**删条件后不再认证**、伪造 `passed`/目标错配/隐藏假设/错误理论/改一字全被拒 |
| `formal-authoring-api.test.mjs` | 24 | 内容包不可变、快照 = 基础 + 激活包、乐观锁 409、预览与提交共用差异计算、只发布选中结果、重复发布幂等、任一步失败原版本继续生效、重启后 `interrupted` 保留已核验结果、回滚不删历史 |
| `relation-discovery-e2e.mjs` | 9 | 见第 3 节 |
| `authoring-page.mjs` | 18 项断言 | 真无头 Chrome：六步、错误定位、结果分组容器、节点页两入口、窄屏无横向溢出、无 `tabIndex<0` 暗坑、零 JS 报错 |

### 3. 四案例端到端（`relation-discovery-e2e.mjs`）

| 案例 | 候选 | 确认 | 证书型已验证 | 备注 |
|---|---|---|---|---|
| group | 16 | 16 | 1（阿贝尔群 ⇒ 群） | 另有定义引用、有限实例、非交换反例 |
| limit | 22 | 22 | 0 | 只有定义引用与常值取值证书（后者未走判定器这条链） |
| manifold | 12 | 12 | 1（C^k 图册 ⇒ 图册） | 另有同图过渡条件推导 |
| tensor | 16 | 16 | 1（线性 ⇒ 可加） | 另有秩一可加性条件推导 |

**每个案例都至少有一条非纯文本引用关系通过核对**——`definitionReference` 的
"版本 + 类型核对"单独计数（§2.2 的判据本来就不出证书），证书型另计。测试同时断言：
预览**零写入**、提交后包真的落盘且**未采纳的候选一条都不在公共内容里**、
同一 `idempotencyKey` 重复提交返回同一版本、回滚不删历史包、
以及**测试前后 `kernel.py` 文件哈希不变**。

### 4. 六条机器认证的关系

每条都真跑 `kernel.py`：`status: passed`、`exit_code: 0`、开放假设为空。

| 关系 | 步数 | 依据 |
|---|---|---|
| `rel:concept:abelian-refines-group` | 12 | 背景定义性公理 + 合取消去 + 蕴含引入 |
| `rel:concept:linear-refines-additive` | 8 | 线性 ≜ 可加 ∧ 标量齐性 |
| `rel:manifold:chart-atlas-generalizes-ck-atlas` | 10 | C^k 图册 ≜ 图册 ∧ 过渡正则 |
| `rel:manifold:transition-derives-eval` | — | 同图过渡片段（开放假设 `right_inverse_at_y` 已闭合） |
| `rel:group:left-mul-derives-injective` | — | Cayley 单射片段（开放假设 `equal_left_translations` 已闭合） |
| `rel:tensor:multilinear-derives-rank1` | — | 秩一可加性（开放假设 `alpha_additive` 已闭合） |

**既有四份证书的闭合**（`lemmas.mjs`）：四份都闭成 `∀自由变量. 开放假设 ⇒ 结论`，
kernel `passed`、`open_hypotheses = {}`；**只追加** `imp_i` / `all_i` 步骤，原步骤一字未改。
`object_conclusion` 被去掉（留着会被判 `HOL/FOL translation mismatch`），理由写在 `notes` 里。

**长期重放入口**：`npm run verify:relations`（`scripts/verify-relations.mjs`）——
按登记的形状重新生成目标、重新跑搜索、重新起 `kernel.py` 判定。实测三条已认证关系全部
`passed`、开放假设 0 条，未认证那条如实跳过。
**它能证明的**是「目标可由声明的那几条公理证明」；**它不能证明**的是「与当初那份证书
逐字节相同」——登记里记的 `theorySha256` / `proofSha256` 与本次重算的不同，
因为理论装配路径与搜索顺序都影响结果（同一命题可以有多条合法证明）。
这个区别写在脚本输出里，不藏起来。

### 5. 本轮抓到并修掉的真缺陷（按发现顺序）

这一节是这一轮**最该留下来的东西**——每一条都是"不报错、只是结论不对"或"看起来跑了、其实没跑"。

| # | 缺陷 | 症状 | 影响面 |
|---|---|---|---|
| 1 | `registry.mjs` 漏 import `backgroundTheory` | 模块加载期 `ReferenceError` | 整份登记表拿不到 |
| 2 | 简单类型论无多态：`group_concept : (G→G→G)→…` 套在 `Z5` 上 | `类型不匹配：G ≠ Z5`，加载期抛错 | 有限对象全部登记不上（新增 `_Z5`/`_S3` 具体载体谓词） |
| 3 | `parseQuantifier` 不认被改名的绑定 | 兄弟作用域 `∀x.P(x) ∧ ∀x.Q(x)` 的第二份量词体退化成**自由变量**；公式**照常解析成功**，只在装配时判"非闭"整条丢弃 | **定义性公理静默失效**；`⇔` 展开必然触发。更坏的一面：绑定名与常量同名时体里会解析成那个**常量**，产出形状合法但含义变了的闭公式 |
| 4 | `normalizeBackground` 丢 `definitions[].term` | 任何带背景定义的背景装配失败 | `bg:limit/1` 的 `const_seq`、`bg:group/1` 的 `left_mul` |
| 5 | `clauses.mjs#factOf` 把子句上下文当 `sig` 传 | 前件含全称量词的蕴含：先是 TypeError，后来被 `ensureSig` 归一成空签名 → **静默**把量词前件拆成丢掉量词结构、带自由本征变量的 body 原子 | **"少了前提的公理"进搜索程序**，会把错误的关系判成成立。`⇔` 形状的定义性公理必有一条前件含量词，所以全部中招 |
| 6 | 解析层签名（常量是**源码文本**）被当成 kernel 口径 sig | kernel 对常量只查名字不做类型检查，错误在很远处以 `sorted app mismatch` / TypeError 爆出 | 装配链路整段不通；加了 `normalizeSig` / `ensureSig` / `signatureOfTheory` |
| 7 | `publication.mjs` 两条分支互相矛盾 | 「节点已在基础数据 → 只追加」与「内容包里找不到节点 → 阻断」 | 对**已有节点**补登记形式表达必然发布失败 |
| 8 | `rollbackPublication` 把空回滚当错误抛 | 回滚到当前生效版本报"无需回滚" | 安全的空操作表现成失败 |
| 9 | `.spec-editor { display: grid }` 未给列宽 | 那一列取 `auto` = max-content = **34rem**（表格 `min-width` 撑出），窄屏横向溢出 161px | 窄屏下整个页面横向滚动；`overflow-x: auto` 因此失效（滚动条落在页面上）。同批 31 处 grid 容器一并补 `minmax(0, 1fr)` |

**第 5 条是本轮最值得记的一条**：它演示了「崩溃被上一层的宽容归一成静默错语义」有多危险——
`ensureSig` 本意是给出可读错误，实际把 TypeError 变成了"公理进了程序但少了前提"。
clause-fix 的修法里加了一条**回归测试**：6 条定义性公理逐条子句化后，**每条子句还原都必须是闭公式**；
另有行为探针确认「前件未被满足时目标仍是 `undecided` 而非 `proved`」。

### 6. 未落实 / 边界（如实记录）

1. **`smooth ⇒ C^k 图册` 那条泛化证不出来**：差的是一条约数学事实 `smooth ⇒ is_ck(·)(k)`，
   它不是定义展开。按"只把背景谓词**已写下的含义**升成公式"这条界线，**故意没有** stipulate 它，
   留在 `missingObligations` 里。
2. **`ε–δ 极限 ↔ 序列收敛` 的直接等价没有证书**：需要去心邻域/聚点那一层展开，超出首版原子谓词。
3. **`group_concept_Z5` / `abelian_group_Z5` 仍未声明** → `instanceOf` 的有限判定停在
   "未声明的常量"。有限求值器本身已按契约接线（模型 id、规范公式树、`backgroundFormulas` 都在传），
   缺的是这两个谓词在背景里的登记。
4. **同步路径无法中断单个候选**：整批时限只在候选之间检查，`stats` 里如实报
   `timedOut` / `budget.interruptible: false` / `overBudget`，并带一条说明。
   四案例串行跑一次约 130 秒（tensor 那次 100 秒里大部分是 `kernel.checkBundle`
   的子进程开销，**不是** search 超预算——已用计时探针分别量过 search 与 kernel）。
5. **默认预算按实测调过**：`depth 8 → 12`、`maxStates 10000 → 200000`、`perCandidateMs 2000 → 8000`。
   依据是同一条目标的实测（2000ms/10000 状态 → timeout；40000 状态/depth 12 → proved，7.7 秒）。
   这是**工程限制的调整，不是数学条件的放宽**，依据写进规格 §3。
6. **`finite.mjs` 与 `instances.mjs` 各存一份表**：这是**有意**保留的独立表示，
   两份表**逐格交叉核对**（允许两份表示，不允许两份事实）。让求值器的数据来源与登记表合流，
   它的独立性就只剩一句声明。
7. **本机没有可用的 Electron 二进制**：内置浏览器 provider 自报不可用，交互式浏览由
   无头 Chrome + Playwright 承担。两者是不同路径，不混为一谈。
8. **`api.mjs` 的发现接口是"两段式"**：`discoverRelations` 返回混合对象——
   同步取用得到候选（`pendingCheck: true`），`await` 则等到机器检查跑完就地补结论。
   两条路共用同一个 `applyConfirmation`；测试同时守住"发现阶段不冒充已验证"与
   "已验证必须带真检查器记录"。

### 7. 思想与方法

**思想：条件随证据行走，而"静默"是最贵的失败模式。**
本轮九个缺陷里有四个（第 3、5、6 条，以及第 4 条的后果）都不报错——
公式照常解析、接口照常返回 200，只是结论变成了另一个命题。
所以每一处"归一""兜底""兼容"都要问一句：**它把一个错误变成了什么？**

**方法：**
- 「节点可解析 = 在本体里**或**在形式表达登记表里」——形式化是后到的，只认本体会让入口在最需要它的节点上 404；
- 「预览与提交共用同一段差异计算」——否则预览不再是承诺；
- 「空回滚幂等返回并写明理由」——安全的空操作不该表现成失败；
- 「未采纳的候选不得出现在公共内容里」——可核形式是**读一遍包**，不是读一遍代码；
- 「登记表自己的装配入口（`kernelInputForBackground`）」——把"先归一、再装配"固化成一次调用；
- 「独立表示 + 交叉核对」——两份表各自冻结、由绊线绑定。

**回看问题：** 如果换一个证明生成器，哪些保证仍由检查器承担？
如果换一个检查器实现，哪些已接受证书必须重放？
本轮把这两个问题的答案写进了证据记录（检查器文件哈希 + 目标 α 规范哈希 + 开放假设），
但**没有**做检查器自身的机器元证明——那条边界没有变。

## 第五十八轮：B 节「设计取值」全表核对（13 条）（2026-10-04）

`TODO.md` 的 B 节列的是「有意选定、但不是实验结论」的取值，并明确写着**不是待办**。
它不是待办，但它会**腐烂**：那是一张手写的散文表格，代码改了它不会跟着改。
本轮把 12 行取值逐条对到代码上，**抓到 5 处漂移**，并把整张表变成可执行的。

### 1. 核对结果（原值 → 实际值）

| 取值 | 表里原写 | 代码实际 | 判定 |
|---|---|---|---|
| 硬前置 / 定义性前置权重 | 1.0 / 0.9 | `RELATION_WEIGHT.hardPrereq = 1`、`CONTRACT_MODE_WEIGHT.definition = 0.9`（另有 `deduction 0.5`） | ✓ 一致 |
| 关系色相 | 「同族 ≥8°」 | **关系色最小 6°**（`analogy → hardGeneralization`）、契约色最小 18° | **✗ 漂移**：改成实测值。15 色塞不进 360° 这件事不变，跨族仍靠线型 / 线宽 / 标签区分（可分辨性由 `tests/a11y-contrast.test.mjs` 断言） |
| 饱和度分层 | 1.5 / 1.2 / 1.0 | `saturateFactor = relation ? 1.5 : semantic ? 1.2 : 1` | ✓ 一致 |
| 箭头尺寸 | 13 / 10.5 / 8.5 | `TIER_ARROW_SIZE = { core 13, strong 13, medium 10.5, structural 8.5, ambient 8 }` | ✓ 一致，补记第五档（登记关联 8） |
| 自动摆位权重 | 交叉 4000 / 边长 1 / 位移 0.6 | `PLACEMENT_SCORE`（同一组数） | ✓ 一致 |
| 弧线常量 | 弓高 96 / 间距 18 / 锚点 14.4 / 容差 10 | `ROUTE_DEFAULTS`：96 / 18 / 18×0.8=14.4 / 10（另有让开留白 10） | ✓ 一致；**条款面板原先自己写着 `96px`**，已改为引用同一常量 |
| 相机 | 460ms / ease-out cubic / 留白 64px | 460ms、`1-(1-t)³`、居中与适配时顶部留 64px 给 HUD | ✓ 一致 |
| 长按阈值 | 「250ms / 4px」 | 鼠标 / 笔 250ms / 4px，**触摸 500ms / 12px**（A2-11 加的） | **✗ 漂移**：表没跟着 A2-11 改，已补 |
| 首页白雾与浮现 | 「58%×52%、78% 归零；720ms / 错位 60ms」 | `radial-gradient(60% 56% … 78%)`、`home-copy-emerge 720ms`、条目错位步长 60ms | **✗ 漂移**：半径实测 60%×56%，已更正 |
| 首页版式 | 46rem / 形状 ±12% / **文字 ±4%** / 标签 22 单位 | 46rem ✓、形状 ±12% ✓、**文字层 ±2%**（A3-17 收到 108%）、标签 22px ✓ | **✗ 漂移**：文字让位已更正 |
| 漂移与呼吸 | 26s / 1.5s / 2.8s / 2.4s | `story-drift-*` 26s、`pick-source-breathe` 1.5s、`tutor-guide-breathe` 2.8s、`nav-badge-pulse` 2.4s | ✓ 一致 |
| 引导步进依据 | 有会话→2、有回合→3 | `guideStep = turns.length > 0 ? 3 : sessionId ? 2 : 1` | ✓ 一致 |
| 领域词表 | 「9 支」 | `FIELD_IDS` 共 **12 支**（A1-4 把代数拆成四支） | **✗ 漂移**：已更正 |

### 2. 把表变成可执行的

新增 `data/design-values.mjs`（登记表）与 `tests/design-values.test.mjs`。每条登记四样东西：
**住在代码哪一处**、**一条检查**、**性质**（`design` / `measured` / `derived`）、**出处**（哪一轮定的）。
实测规模：**13 条登记、35 条检查**（`module` 16、`css` 9、`source` 6、`computed` 4）。

检查强度分四层，能强的不用弱的：

| 类型 | 含义 | 条数 |
|---|---|---|
| `module` | `import` 真常量后比数值（如 `RELATION_WEIGHT.hardPrereq === 1`） | 16 |
| `computed` | 按名字算观测量（色相最小间隔、`18 × 0.8 = 14.4`、`FIELD_IDS.length`） | 4 |
| `css` | 样式表里的取值（带分组名的正则） | 9 |
| `source` | 组件里的字面量，node 侧 import 不了，只能源码匹配（**最弱**） | 6 |

为了让「最弱的一层」尽量少，本轮把 4 组数从组件里提到可 import 的叶子模块：

- `web/src/edge-routing.ts` → `ROUTE_DEFAULTS`（弓高 / 间距 / 容差 / 留白 / 锚点系数）；
- `web/src/node-placement.ts` → `PLACEMENT_SCORE`（交叉 / 边长 / 位移）；
- `web/src/network.ts` → `CAMERA_TWEEN_MS`、`CAMERA_HUD_SPACE`；
- `web/src/pointer.ts`（新文件）→ 四档指针阈值与两个取值函数（原先在 `NetworkPage.tsx` 里）。

测试里另有一条**质量约束**：`source` 检查不得超过全部检查的 1/3（当前 6/35），
超了就说明又该把常量提出来导出了。

### 3. 文档同步断言

`TODO.md` 的 B 节同步也被断言了：13 条取值的**关键词必须都在**，且**取值列里不得再出现被更正的旧值**
（说明列里可以写「原写 X，实测是 Y」——第一版把整节当检查范围，于是「如实写明改过什么」反而让断言失败）。
B 节还必须继续写着「不是待办」。

### 4. 命令与结果

| 命令 | 结果 |
|---|---|
| `node --test tests/design-values.test.mjs` | **通过（16 项）**：登记表完整性 1 + 逐条与代码一致 13 + 文档同步 1 + 检查强度 1 |
| `npm run check` | 通过 |
| `npm run build` | 通过（把 4 组常量提出去之后仍然通过） |
| `node --test tests/edge-routing.test.mjs tests/node-placement.test.mjs` | 通过（16 项，常量提取未改变行为） |
| `npm test` | 见下（含另一会话正在开发的形式语言组） |

### 5. 未落实 / 边界

- **`source` 检查仍然是最弱的一层**（6 条）：它们只能证明「那行字还在」，证明不了「运行期用的是它」。
  剩下的是 `TIER_ARROW_SIZE`（在 `.tsx` 里，导出需要把常量搬到叶子模块——留待需要时做）、
  `saturateFactor`（函数内的三元表达式）、`easeOutCubic`、`guideStep`。
- **`computed` 检查依赖观测量**：色相间隔与 `FIELD_IDS.length` 会随数据变化，
  改色板或改词表就要重测并更新登记表（这正是 `measured` 这个性质的意思）。
- **B 节的「出处」只到轮次**：没有更细的提交或行号，因此「哪一轮定的」在轮次记录被改写时会失准。
  本轮不引入 git 依赖（仓库的提交历史不是验收依据）。
- **触屏阈值仍然只是设计取值**：500ms / 12px 是按系统语义定的，真机手感属 C 类待证据事项
  （见 C 节「触屏手势」），本轮没有把它升级成「已验证」。

## 第五十七轮：A5 工程与测试（4 项）（2026-10-04）

`TODO.md` 的 A5 一节原有 5 条，其中 36（接口/组件的口头约定固化）已在第五十三轮完成。
本轮做剩下的 4 条：全站扫描「标签表当选项表」、把动画页面的点击固化成帮助函数、
227 节点视图的性能观测（**顺带把最慢的一段优化了 9 倍**）、`prefers-reduced-motion` 的全站核对。

### 1. 全站扫描「标签表当选项表」（A5-34）

第二十八轮的边界：「当时的断言只覆盖『全部节点』面板与『数学对象』列表页。」
本轮把那次全站搜索固化成 `tests/label-option-scan.test.mjs`：扫描 `web/src` 下所有
`Object.keys/entries(..._LABELS)` 的用法，**每一处都必须落在带理由的白名单里**。
实测扫到 **11 处**，分三类：

| 类别 | 处数 | 说明 |
|---|---|---|
| `universe-filtered` | 5 | 只把标签表当作「模板里声明过哪些值」传给 `buildFacet` 的 `declared`；选项本身来自真实数据（`present`），空类别只进 `absent` 列表如实说明。断言会核对它确实出现在 `buildFacet(...)` 调用里 |
| `vocabulary-display` | 3 | 展示**整套词汇**：连接类型开关（7 类）、契约 mode 条款（7 档）、站内规模六项。断言要求每一行附近渲染了计数 |
| `lookup` | 1 | `relationKindHint` 用 `Object.keys(RELATION_LABELS).find(...)` 认关系种类，不产生可点条目 |

扫描是**双向**的：新增一处用法而不登记会红；白名单里有已经不在源码里的条目也会红（防止过期条目掩盖新写法）。
行为层另加两条断言（`tests/facets.mjs`）：连接类型面板七类全列出且**每行带计数**（0 也写出来）、
契约 mode 条款每档带「当前视图 N 条边」。

### 2. 动画页面里的点击固化成帮助函数（A5-35）

第四十轮、第五十二轮的边界：「相机动画/每帧重渲染会让 Playwright 的稳定性检查与 `check()` 失效；
本轮改成派发原生 click。*验收*：把这类写法固化进测试工具（一个 `clickInAnimatedPage` 帮助函数），
新套件不再各自绕。」

`tests/helpers.mjs` 新增两个帮助函数：

- `clickInAnimatedPage(page, selector, { index, scroll, required })`：先 `scrollIntoView`
  （原生 click 不会自动滚动），再派发原生 click；`SVGElement` 没有 `click()`（知识网络的节点与边都是 SVG），
  因此退回派发会冒泡的 `MouseEvent`；找不到元素时**抛错**而不是静默返回 false——
  「没点到」伪装成「点了没反应」是最费时间的假失败；
- `toggleInAnimatedPage(page, selector, { index, expect })`：语义化的复选框版本，
  用原生 click 而不是直接改 `checked`（React 受控组件看 `change` 事件），
  并在给了 `expect` 时用 `waitForFunction` 核对**状态真的变了**。

四个套件改用它（原来各自抄了一遍绕法）：`network-placement`、`network-camera`、`network-picker`、`browser`。

### 3. 227 节点视图的性能观测（A5-37）

第四十轮的边界：「相机动画期间每帧重渲染整页；节点上百时的开销未测。」

新增 `tests/network-perf.mjs`：在 **227 个节点**的视图（全库 232 减去 5 个，用来测增量加入）上量五件事，
每次都记录**端到端耗时**与**长任务**（`PerformanceObserver` 的 `longtask`，>50ms 的主线程阻塞）。

**优化前的实测**（首次运行，就是这一项要的证据）：

| 操作 | 端到端 | 长任务 |
|---|---|---|
| 铺开 227 节点（网络 + 首帧 + 布局） | 3322 ms | 0 |
| **重新布局（力导向重算）** | 2219 ms | 2 个，**最大 1129 ms** |
| **加一个节点（增量摆位 + 相机动画）** | 2466 ms | 3 个，**最大 1321 ms** |
| 打开面板 | 25 ms | 0 |

主线程被阻塞 1.1–1.3 秒，远超任何合理阈值 → 按验收要求**优化**。热点定位（node 侧分段计时，
232 节点/436 条合并边）：`buildEdges` 1ms、`mergeParallelEdges` 3ms、**`layout()` 1474ms**、
`routeEdges` 87ms。也就是说，钱全花在力导向的 O(n²) 迭代上（232² / 2 × 600 次迭代 ≈ 1600 万次内层计算）。

两处**等价**改动（`web/src/network.ts`）：

1. **热循环改用 `Float64Array`**：位置、位移、枢纽权重都按序号索引存放，取代每次内层循环里的
   `Map.get(id)`（字符串哈希）与每步新建的位移对象；每条边的吸力 `attractionOf(edge)` 只算一次
   （原先每个 step 对 545 条边重算，约 32 万次调用）。**数学一字未改**（迭代顺序、公式、温度衰减同上），
   实测 `layout()` **1474 → 531 ms**，且压力场景的交叉数/边长/间隙**逐项相同**；
2. **`Math.hypot` → `Math.sqrt(dx*dx + dy*dy)`**：hypot 为防溢出要做缩放与分支，在这个热循环里慢 3 倍多。
   坐标量级 1e2–1e4，平方不会溢出，因此等价——但**不是逐位相同**：力导向是混沌系统，
   最后一位的差别会被放大到另一个同样合法的局部最优，因此留档数字跟着重测（见下面「压力场景实测（重测）」）。
   实测 `layout()` **531 → 162 ms**。

**优化后**（同一套测试、同一台机器）：

| 操作 | 优化前 | 优化后 | 倍数 |
|---|---|---|---|
| 铺开 227 节点 | 3322 ms | **1516 ms** | 2.2× |
| 重新布局 | 2219 ms（长任务 1129 ms） | **483 ms**（长任务 **238 ms**） | 4.6× / 4.7× |
| 加一个节点 | 2466 ms（长任务 1321 ms） | **643 ms**（长任务 **393 ms**） | 3.8× / 3.4× |
| 打开面板 | 25 ms | 68 ms（0 长任务） | — |

`layout()` 本体从 **1474 ms → 162 ms（9.1×）**。验收阈值取实测值的 3–5 倍作回归网：
铺开 ≤ 8000ms、重新布局 ≤ 2500ms、加节点 ≤ 3000ms、单次阻塞 ≤ 800ms、静态停留无长任务（≤120ms）。
帧间隔在 headless 里是空转时钟（约 6.1ms 一条，实测 329 帧 / 2000ms），**不作为断言**，只记录。

### 4. `prefers-reduced-motion` 的全站核对（A5-38）

第三十八轮起的边界：「各轮都加了降级，但没有一处集中核对『所有动画都有 reduce 分支』。」

新增 `tests/motion-coverage.mjs`，两层断言：

1. **规则级**（用 CSSOM，不靠正则猜选择器——本文件里大量规则是单行写的）：
   CSS 里出现的每个 `animation-name` 都必须在 `styles.css` 顶部的**动效清单**里登记，
   且清单与 `@keyframes` 集合双向一致；每个动画都要写明 reduce 处理方式（三种之一）。
   实测 **21 个动画**：一次性入场 5、循环装饰 7、React 降级 9。
   另有「每条动画声明都在 reduce 块里被关闭」的断言：声明动画的那条选择器必须在 reduce 块里
   **同名**关闭，或被一条 `animation: none !important` 兜住；
2. **元素级**：在 `reducedMotion: 'reduce'` 下逐页扫描（8 个页面）**没有任何元素还在动**
   （`animation-name !== 'none'`），并额外驱动两个「只有某种状态才有动画」的场景
   （长按拾取的源节点呼吸 + 悬停候选的行进虚线环），确认它们也没漏。

**这一层抓到并修掉了一个真 bug**：reduce 块里写的是 `.pick-hover-ring { animation: none; }`，
而声明动画的选择器是 `.pick-candidate.hovered rect.pick-hover-ring`（优先级 0,3,1 > 0,1,0）——
写在后面也没用，**reduce 下悬停环仍在行进**。现在按同名选择器关闭，并在样式里写明原因。

### 5. 压力场景实测（重测）

`layout()` 的 `Math.hypot → Math.sqrt` 让布局落到另一个同样合法的局部最优，
因此 `tests/network-stress.test.mjs` 的留档数字**重测如下**（同一套断言、同一份数据）：

| 场景 | 节点 | 登记边 → 画出 | 重叠数 | 最小间隙 | 交叉数 | 平均边长 | 中位边长 | 弯 / 残余压卡 |
|---|---|---|---|---|---|---|---|---|
| liang 整案（默认边源） | 63 | 130 → 110 | **0** | 92px | 126 | 303px | 259px | 29 / 32 |
| 全库（默认边源） | 232 | 545 → 436 | **0** | 71px | 631 | 353px | 287px | 124 / 156 |

与优化前（第五十五轮，交叉 131 / 720）相比：**交叉数下降**（720 → 631），
liang 的残余压卡上升（16 → 32）、全库下降（162 → 156）——这些是同一量级内的重排，
没有「变好」或「变坏」的方向性结论，如实记录两组数字。
基线数字写成一便于引用的一句话：**liang 整案 63 节点、交叉 126、平均 303px**；
全库 232 节点、交叉 631、平均 353px。

### 6. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run check` | 通过 |
| `npm run build` | 通过 |
| `node --test tests/label-option-scan.test.mjs` | 通过（2 项：11 处用法全部登记 + 白名单无过期条目） |
| `node --test tests/network-stress.test.mjs` | 通过（4 项，数字已按重测更新） |
| `node tests/motion-coverage.mjs` | 通过（21 个动画登记齐全 + 8 页 reduce 无动画 + 状态场景） |
| `node tests/network-perf.mjs` | 通过（7 项，含阈值回归网） |
| `node tests/facets.mjs` | 通过（含词汇表带计数的 2 项） |
| `node tests/network-placement.mjs` / `network-camera.mjs` / `network-picker.mjs` / `browser.mjs` | 通过（改用共享帮助函数后） |
| `npm test` | 全部套件通过 |

### 7. 未落实 / 边界

- **长任务仍高于 50ms 阈值**：优化后「加一个节点」的单次阻塞是 393ms、「重新布局」238ms。
  要真正压到 100ms 以内需要动算法（Barnes–Hut 或把布局放进 Worker 分片），
  那是**另一轮**的工作量，本轮只做了等价替换，没有换算法。
- **A5-36 仍留一半**：「接口/组件的口头约定固化」里，前端**组件**一侧（props/回调约定）
  还没有扫描断言，只有服务端读参数的三条约定（第五十三轮）。这一条留在 A5 里没动。
- **帧间隔数字不可比**：headless Chrome 的 rAF 是空转时钟（稳定 6.1ms），
  真实设备上的帧时间需要浏览器 profiling，本轮没有做，也不拿它当结论。
- **性能阈值是回归网不是目标**：取实测值的 3–5 倍，只用于发现「有人写出了平方级路径」，
  不代表 483ms 的重排是可接受的目标。

## 第五十六轮：A3 首页动画（7 项）与 A4 开始学习 / 辅导 / 研究台（11 项）（2026-10-04）

这一轮做的是 `TODO.md` 的 A3 与 A4 两节，共 18 条。**A4-29 没有完成**（本机没有可用的模型后端，
见 §4），其余 17 条逐条落实。数字现场量，读不出来就写读不出来。

### 1. A3：首页动画的版式与可访问性

#### 1.1 四周带的边界改成「算出来的」（A3-16 / A3-17 / A3-19）

三条缺口是同一个根因：**「文字只在四周」这条规则以前是用固定百分比凑的**。
遮罩写死 17%–83%、大字词写死 4vw 偏移、标签几何在 1440×900 下选定——
换到 1240 / 1280 就失效。实测（改版前，逐幕、`played=1`）：

| 视口 | 舞台宽 | 正文列 | 带宽 | 每幕清晰可见标签 | 压正文 | 被硬切 | 大字词压正文 |
|---|---|---|---|---|---|---|---|
| 1440×1000 | 1182 | 736 | 223px（18.9%） | 3 / 1 / 3 / 6 / 1 | 0 | 2（第四幕） | 否 |
| 1280×800 | 1022 | 736 | 143px（14.0%） | 2 / 1 / 2 / 1 / 1 | 2 | 1 | **5 幕全中** |
| 1240×900 | 982 | 736 | 123px（12.5%） | 3 / 2 / 3 / 7 / 2 | 4 | 3 | **5 幕全中** |

改法（一处定义、四处取用）：

1. 组件量出 `--hs-band =（舞台宽 − 正文列宽）/ 2`（`ResizeObserver`，见 `HomeNarrative` 的 `measureBand`）；
2. **遮罩的透明区从 `band − 5%` 开始**（`styles.css` 的 `mask-image`）——因此可见像素永远进不了正文列；
3. **大字词的位置与字号都从带宽取**（`left/right: 50% + 半列宽`；`font-size: clamp(1rem, band × 0.25, 3.4rem)`），
   1280 下从 174px 缩到 117px、1240 下 97px，不再压正文；
4. **每幕 3–5 条「四周带标签」**（`home-narrative.ts` 的 `sceneLabels`，取自该幕自己说过的话）：
   位置与宽度都由带宽决定，因此在任何宽度都放得进——这是「每幕 3–5 条清晰可见」这条验收的承担者；
5. **场景自带的 SVG 文字是纹理**：带宽 < 200px（1280 及以下）时整层让位（`data-band="narrow"`），
   另把第四幕「条件」卡的三条标签改成右对齐（`textAnchor="end"`），文字向左生长、不再越界。

改版后实测（`tests/home-narrative.mjs` 的断言口径，逐幕在 1440 / 1280 / 1240 三档都跑）：

| 视口 | 四周带标签（每幕） | 压正文 | 被硬切 | 版心溢出 |
|---|---|---|---|---|
| 1440×1000 | **4 / 4 / 4 / 4 / 4** | 0 | 0 | 0 |
| 1280×800 | **4 / 4 / 4 / 4 / 4** | 0 | 0 | 0 |
| 1240×900 | **4 / 4 / 4 / 4 / 4** | 0 | 0 | 0 |

1440 下场景自带文字的可见条数为 2 / 2 / 1 / 6 / 1（纹理，随进度与视口变化，不作为 3–5 的判据）。

**一条口径的修改要说明**：「清晰可见的标签不压正文」这条断言，判据从**整块文字盒**改成
**遮罩后的可见矩形**。原因是长标签会跨过遮罩边界，被遮掉的那部分根本不渲染；
按整盒判会把「右半边被遮掉的长标签」算成压正文（1440 下第四幕就有 1 条，实测其可见部分距正文列还有 60px）。
改成可见矩形之后结论与肉眼一致；同时新增一条**结构性断言**：遮罩透明区起点（`band − 5%`）
必须早于正文列边界（`band`）——单看某一幕的标签数量看不出这件事。

#### 1.2 窄屏的等价保证（A3-16）

窄屏（宽 ≤1200px 或高 ≤700px）**根本没有动画文字层**：整块视觉舞台不渲染，
每幕只有一张静态插图（自然流、`aria-hidden`），那条给大字词单独缩小字号的媒体查询已经是死代码，本轮删除。
验收逐条核对 1024×768 / 900×800 / 1280×690：视觉舞台 0 个、文字层 0 个、大字词 0 个、四周带标签 0 个、
绝对定位文字压正文 0 处、静态插图与正文列交叠 0、横向溢出 0。**「文字不入正文列」在窄屏是结构性成立的**，
不是靠缩小字号凑出来的。

#### 1.3 「浮现只播一次」写成设计（A3-18）

第四十九轮的边界是「浮现按『进入这一幕』触发，不随滚轮推进重播」，两条路选一条。
本轮选**保留只浮现一次并写明**：页脚加一句「浮现动画每幕只播一次（往回滚不会重播）」，
代码里写清取舍（重播会把已读过的内容反复推回起点，五幕连读时是干扰），
验收同时核对文案与 `animation-iteration-count: 1`。

#### 1.4 每幕的可访问描述（A3-20）

背景模式下整个视觉舞台是 `aria-hidden`，场景自带的 kicker/title 读屏读不到——
于是只有图形的一幕在读屏里等于空白。现在每幕用 `aria-labelledby` 指向标题、
`aria-describedby` 指向一句 `visually-hidden` 的「画面：<sceneLabel>」（数据里本来就有 `sceneLabel`）。
验收核对：五幕都有描述、文本非空、指向的元素确实只给读屏看（`clip-path` 裁掉，不是 `display:none`）。

#### 1.5 对比度与色觉（A3-21）

新增 `tests/a11y-contrast.test.mjs`（6 项），把第三十八、四十三轮那句「没有做 WCAG 比值与色盲模拟」变成断言：

| 检查 | 判据 | 结果 |
|---|---|---|
| 文字令牌 | 对白底 / 浅紫底 / 画布底 / 暖底 ≥ 4.5:1 | 通过（`ink 17.80`、`inkSoft 8.84`、`inkFaint` **从 4.26 调深到 5.57**） |
| 边色（8 关系色 + 7 契约色 + 未知 mode） | 对画布底 ≥ 3:1（WCAG 1.4.11） | 通过（最小 `未知 mode 3.32`、`bridge 3.43`） |
| 正常视觉两两可分 | ΔE ≥ 15 | 通过（最小 23.1） |
| deuteranopia / protanopia | ΔE ≥ 12 **或**另有冗余通道 | 通过；两组「只靠冗余通道」的对子照实记录：关系色 `duality\|crossDomain`（ΔE 3.0，靠**名字**：两条边都写出自己的关系名）、契约色 `definition\|deduction`（ΔE 1.2，靠**线型**：4.6px 实线 vs 3.2px 实线） |

色觉模拟用 Machado 2009 severity 1.0 矩阵（线性 RGB 空间），色差用 CIE76 ΔE（Lab）。
另有一条**判据自检**：模拟矩阵不改变中性灰（白/黑/中灰的通道差 ≤ 2）——
不然「可分」可能是模拟本身把颜色染歪了。

#### 1.6 面板与画布共用强调令牌（A3-22）

画布上的强调是四层（浅底 + 描边 + 发光 + 文字变色），面板里的同类状态以前只有一个淡紫底。
现在抽出 `--emphasis-bg / --emphasis-ring / --emphasis-glow / --emphasis-ink` 四个令牌，
画布候选卡（`.pick-candidate.hovered`）与面板条目（`.network-node-list li.added` /
`li[data-selected="true"]`、`.recommend-list li:hover`）都从这里取。
验收核对**取值同源**：面板条目的 `background-color` 等于 `--accent-wash` 的解析值、
`box-shadow` 里含 `--accent` 的解析值且是 `inset`；画布那条规则的 `cssText` 里出现同样的 `var()`。

### 2. A4：开始学习、辅导、研究台

#### 2.1 节奏偏好参与规划的默认值（A4-23）

第四十六轮的边界：「三问的答案只影响开始页的入口排序，`/plan`、`/nodes` 不套用。」
选择的落点是**让「节奏」这一问接上 `/plan` 的事件界**（它本来就是在说「一次走多远」），
映射表写在 `web/src/start-preferences.ts` 的 `paceHorizon`：

| 节奏偏好 | 事件界默认 | 依据 |
|---|---|---|
| 一次一小步 | **3** | 15 分钟档：三个事件大约就是一小步 |
| 先做检查点 | 4 | 先走一小段再自检 |
| 一次走一段 | 8 | 规划页原本的默认值（一整条路线） |
| 先不设节奏 | 不动（8） | 不干预 |

三条纪律写进代码与页面：**只改默认值**、算法与本体一律不变、用户一改就不再覆盖。
页面上有一句「因为你选过……所以默认给……」，并链回开始页改偏好；改过输入之后这句消失。
实测：留了 `pace: 'small'` 时事件界为 3 且说明在；清空偏好后回到 8 且没有说明。

#### 2.2 「先收起引导」（A4-24）

第四十五、四十六轮的边界：「跳过引导是永久记忆，想重看只能『全部用默认』——而那个动作会重置偏好。」
现在两个动作分开：

- **先收起引导**：只收起（本机写一个独立标记 `mcs-start-guide-collapsed-v1`），**不动偏好**；
- **重新显示引导**：把三问重新摊开，原答案原样还在；
- **全部用默认**：仍然是唯一会清空偏好的动作。

实测：答完两问后收起 → 三问收起、结论仍在、`mcs-start-preferences-v1` 逐字段未变、标记为 `1`；
刷新后仍收起且偏好没丢；点「重新显示引导」→ 三问回来、两个已答选项仍选中、标记被清掉。

#### 2.3 默认起点分首访 / 回访（A4-25）

判据是**本机的「来过」标记**（`mcs-start-visited-v1`，与有没有学习记录无关），
在开始页挂载时消费一次；同时把「已经有学习记录」也算作回访（换机器/清过数据的老学习者不会被当成首访）。
两种默认起点因此不同：

| | 首访 | 回访 |
|---|---|---|
| 标题 | 默认起点（首访） | 默认起点（回访） |
| 第一个入口 | 打开知识网络（`/network`） | 接着上次：学习记录与复习队列（`/profile`） |
| 依据句 | 「第一次来：没有偏好时默认起点先看全局」 | 「你是回访者：没有偏好时默认起点先接上次的进度」 |
| 引导形态 | 三问从头问（渐进披露） | 直接看结论，想答再点「改一改」 |

验收同时核对「两种默认起点确实不同」（动作列表逐项比较，而不是只比标题）。

#### 2.4 上游版本号改成运行期只读（A4-26）

第四十八轮的边界：「版本号是我核对后写死的 `v1.6.12`。」现在服务端只读本机检出
（`server/upstream.mjs`，缓存 5 分钟），把版本、**来源路径**、**读取时间**与检出文件时间一起下发：

```
{ available: true, version: '1.6.12', source: '.bridge-research/DeepTutor-ef2d9e5c/deeptutor/__version__.py',
  sourceKind: 'runtime-read', fileModifiedAt: '2026-09-30T02:10:46.205Z', readAt: '2026-10-04T02:02:34.728Z' }
```

界面据 `upstream.available` 分两种显示：读到了 → 「版本（运行期读自本机检出）」+ 来源 + 读取时间；
读不到 → 「手工核对，可能滞后」+ 记录值与读不到的原因（`data-version-source` 区分两种情形）。
验收：解析出的版本与**盘上文件重新解析的结果**逐字相等；来源里没有绝对路径/盘符；
注入一个空目录时返回 `available: false` 且形状与可用时完全一致（调用方不必分两种分支）。

#### 2.5 外链可达性（A4-27）

第四十八轮的边界：「测试只核对 href 与 rel，不联网验证。」现在 `tests/tutor.test.mjs` 对三条外链
各发一次 HEAD（6 秒超时，`redirect: 'follow'`）：能连就报状态码，连不上标 `not_run` 并写出原因，
**网络不可用不当作验收失败**，但「没验证过」必须留在输出里。
最近一次实测：GitHub 仓库 **200**、arXiv 论文 **200**、官方文档 **not_run（超时）**。

#### 2.6 两套集成：明确保持双轨（A4-28）

第三十四轮的边界：「站内适配器与桥接服务各自演化，只对齐了失败码与状态披露。」
本轮选择**保持双轨**（调用方向相反：一个是本站前端功能，一个是给外部工具用的服务），
分工与差异写进 README 的「两套集成的分工」一节（谁调谁、上下文来源、账本形状、工具面），
并把**已经归一的部分**写成可核对的条目：

1. 失败语言：两边都是 `code + retryable + recoverable`，同名码的取值由 `tests/tutor.test.mjs` 逐条核对；
   已知码名分歧只有一处（本站 `BAD_REQUEST` ↔ 桥接 `INVALID_ARGUMENT`，判定一致，改名需动协议）；
2. 上下文预算：同口径三档（compact 8000 / standard 16000 / extended 24000），
   预算不足的信封都带 `minimum_chars / tier / suggested_chars`；
3. 证据纪律：都不把「配置齐全」说成「已验证」（`liveVerified` 由本进程完成过的回合数决定）。

#### 2.7 契约的 `max_chars` 与失败信封（A4-30）

第四十八轮的边界：「下限 3000 而部分节点需要一万多字符；失败信封没有机器可读的『可恢复』字段。」
两件事都做了，数字是量出来的（232 个节点全量测量）：

| 统计 | 值 |
|---|---|
| 中位 / p95 / 最大 | 3036 / 16705 / **22543**（`dg:partition-of-unity`） |
| ≤ 8000（compact） | **202** 个节点 |
| 8001–16000（standard） | **15** 个 |
| > 16000（extended） | **15** 个——**默认 16000 建不出上下文** |

落地：`core/context.mjs` 新增 `CONTEXT_TIERS` 与 `contextBudget(ontology, nodeId)`；
会话未指定预算时按节点档位给（不再一律 16000），指定了更小的值就报可恢复的失败
（带差额、档位、建议值）；桥接侧的 `CONTEXT_BUDGET_TOO_SMALL` 同样补齐这三项，
两边信封都加 `recoverable`（语义：换个请求能不能成功，与「同一请求重发」的 `retryable` 正交）。
`tests/context-budget.test.mjs`（4 项）核对：每个节点都能在自己的档位内**不截断**地构建上下文、
档位边界与观测分布一致、预算不足的信封字段齐全、未登记的码默认不可恢复。

#### 2.8 论文正文锚点 ↔ 本体节点（A4-31）

第四十七轮的边界：「只梳理了包内材料（标题/摘要开头/bib/元数据），没解析正文，也没和本体节点挂上。」
约定与结果：

- **锚点取 `\label{...}`**（`def:` / `prop:` / `thm:` / `sec:` 前缀天然区分类型），解析自 `main.tex`；
- 登记表 `data/paper-anchors.mjs`：**9 条**（8 个 label）；
- **打通 3 条**（都能在本体里点回节点页）：
  `def:limits → limit:limit-ed`、`def:limits → limit:seq-conv`、`prop:limit → limit:bridge`；
- 其余 **6 条如实写明「无对应节点」**（站内接口 3、工程不变量 1、理论结论 1、规划器性质 1）——
  它们讲的是 D 层实现，不硬塞一个「看起来像」的数学对象；
- 论文里还有 **21 个 label 未登记**（章节、图表、接口），维护页把这个数字与样例列出来；
- `npm run check` 新增第 [7] 节：登记表里的节点必须真的存在、至少打通一条、没挂节点的条目必须写清是什么。

#### 2.9 发布版本与日期（A4-32）

目录名解析出日期与标签，**版本号只在名字像版本时才填**（`20261002-before` 的 `before` 是阶段标签，
不算版本）。实测两条：

| 日期 | 版本 / 标签 | 目录 | 组 | 文件数 |
|---|---|---|---|---|
| 2026-10-02 | `r1` | `2026-10-02-r1` | 正式发布 | 6 |
| 2026-10-02 | `before`（不是版本号） | `20261002-before` | 历史快照 | 3 |

排序：日期倒序 → 同一天正式发布排在历史快照之前 → 名字倒序；解析不出来的排最后并显示「未解析」。
维护页新增「发布与历史快照」表（日期 / 版本 / 目录 / 文件数 / 目录修改时间）。

#### 2.10 读盘缓存（A4-33）

第四十七轮的边界：「每次切到『专稿与 arXiv』都重新 readdir/stat。」
现在 `maintenanceSources()` 加 **30 秒时间戳缓存**，并把 `cached` 与 `readMs` 一起返回，
页面上写明「这次实时读盘 / 命中缓存，耗时 N ms」。实测：清单规模 17 章 + 9 个 arXiv 文件 +
73 份文档 + 14 份参考文献，**一次实时读盘 6–26 ms**（缓存命中时不再读盘，读盘时间也不变——
不然就是在假装新数据）。`tests/maintenance.test.mjs` 用注入的 `now` 模拟超过 TTL，验证会重新读。

### 3. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run check` | 通过（新增第 [7] 节：论文锚点 9 条登记、3 条打通、6 条写明是什么） |
| `npm run build` | 通过（tsc + Vite） |
| `node --test tests/a11y-contrast.test.mjs` | 通过（6 项：对比度 2 + 色觉 3 + 判据自检 1） |
| `node --test tests/context-budget.test.mjs` | 通过（4 项） |
| `node --test tests/maintenance.test.mjs` | 通过（4 项：锚点 / 发布 / 缓存 / 统计一致） |
| `node --test tests/tutor.test.mjs` | 通过（10 项，新增上游版本、外链可达性、跨仓库码对齐） |
| `node tests/home-narrative.mjs` | 通过（含四周带、窄屏、可访问描述、只播一次共 20+ 项） |
| `node tests/start-chooser.mjs` | 通过（含收起 / 重新显示、首访 / 回访默认、节奏 → /plan 共 12 项） |
| `node tests/network-picker.mjs` | 通过（含面板与画布令牌同源的 3 项） |
| `node tests/research-maintenance.mjs` | 通过（含锚点表、发布表、缓存说明共 5 项） |
| `npm test` | **全部 20 个套件通过** |
| `cd ../mcs-bridge && npm test` | 通过（12 项，新增失败信封的 `recoverable` 对齐） |

### 4. 未落实 / 边界

- **A4-29（真实模型回环）没有做**：本机既没有 DeepTutor 后端（相关端口无监听），
  也没有 `mcs-bridge`（3783 拒绝连接），因此无法跑「提问 → 模型回复 → 评价落 E」。
  这一项**保持未完成**，`liveVerified` 仍为 false，界面显示「未验证」；
  要推进需要本机起这两个进程之一，并把回合 id 与时间记进本文件。
- **A3 每幕「清晰可见的标签」口径**：3–5 条由**四周带标签**承担（4 条/幕，任何宽度成立）；
  场景自带的 SVG 文字是纹理（1440 下 2/2/1/6/1），带宽不足时整层让位。
  这不是「每幕都有 3–5 条场景文字」——按那个口径在 1240/1280 上几何上做不到（带宽 123–143px，
  而文字块 165–285px 宽）。
- **A4-27 的外链检查依赖网络**：官方文档这一次超时（`not_run`）。它是**可跳过**的设计，
  因此离线环境下这项等于没验证——输出里会写明，不会被当成通过。
- **A4-33 的缓存是 30 秒**：按「页面切换频率」定的，没有做命中率统计；
  本机规模下读盘本身只有 6–26 ms，缓存主要是省掉重复的 readdir/stat，不是性能瓶颈。
- **A3-21 的色觉判据含「冗余通道」**：`duality|crossDomain` 在 deuteranopia 下 ΔE 只有 3.0，
  靠的是两条边都写出自己的关系名。**关掉边标签时这条通道就没了**——已知边界，
  没有为此改色（改色会动「色相说明是什么关系」的既有约定）。
- **A4-25 的「回访」判据含学习记录**：本机标记与学习记录取并集，因此换机器但建了档案的学习者
  也会被当成回访者。这是一条**有意的宽松**（宁可给「接着上次」也不给「第一次来」），依据写在代码里。

## 第五十五轮：A2「知识网络」的五项欠账（2026-10-03）

`TODO.md` 的 **A2. 知识网络** 一节列了五条缺口。这一轮逐条落实；沿用的规矩不变：
每条都留下**可核对的入口**（数据、代码位置或测试套件），实测数字现场量、写进这一节，
不把「应该没问题」当成结论。

### 1. 触屏上的长按手势（A2-11）

第四十一轮的边界：选择器按左键触发，触摸设备走同一路径，但阈值（250ms / 4px）是按鼠标定的。
手指没有「按住不动」这回事（按压必然抖动），而系统本身把 ~500ms 当作长按语义——
沿用鼠标档的结果是**轻点被判成长按、长按又被判成拖动**，触屏用户取关联节点这条主路径用不了。

现在**按指针类型分档**（`web/src/pages/NetworkPage.tsx` 顶部，一处定义、两处取用）：

| 指针类型 | 长按阈值 | 位移容差 | 依据 |
|---|---|---|---|
| 鼠标 / 笔 | 250ms | 4px | 沿用旧手感（第三十、四十一轮调过） |
| **触摸** | **500ms** | **12px** | 与系统长按语义对齐；手指按压的抖动必须容忍，否则「按住不动」几乎不可能成立 |

触摸路径本身（`touch-action: none`、指针捕获的释放、pointerup 结算）此前已经就位，
这次补的是阈值分档与**真实触摸事件下的验收**：`tests/network-picker.mjs` 新增一节，
用 CDP `Input.dispatchTouchEvent`（真 touch 事件，pointerType 就是 touch，不是合成 MouseEvent 假装）
分四种情形核对：700ms 按住 → 选择器打开、手指移到候选高亮、松手加入视图；
300ms 按住（> 鼠标档 250ms 而 < 触摸档 500ms）→ **不打开**（这一条正是「触摸走自己那一档」的证据）；
120ms 短点 → 打开详情面板；触摸拖动（位移 > 12px）→ 移动节点、不打开选择器。

### 2. 「重新布局」按钮（A2-12）

第三十七轮的边界：自动摆位一旦写入 `placements` 就固定下来，想重排只能清空画布或删 localStorage。
现在 HUD 的缩放控件旁多了一个 **「重新布局」**：清掉自动摆位缓存并重算一遍，
**手动拖过的节点一个都不动**，并在提示里说明与「重置」的分工
（「重置」只把相机重新适配进可见区）。底部图例提示也写明了两者的区别。

顺手改掉两处**过期的注释**：`PLACEMENTS_KEY` 与 `placements` 上方原本写着「『重置』只清自动摆位」——
那句话在代码里是假的（`resetViewport` 就是 `fitView`，只动相机）。

验收在 `tests/network-placement.mjs` 里新增四问：重算确实发生了（至少一个自动摆放的节点换了位置）、
手动位置保留、重算后仍不重叠、提示里写清与「重置」的区别；另加一问反向核对
**「重置」点完节点坐标一个都不变**——两个动作的分工在断言里是分开的。

### 3. 穿卡规则：从「取最苛刻的一张」到「挑压得最少的」（A2-13）

第三十九轮的边界：弧线策略的「穿卡」一档在真实数据里没触发过（`throughCard = 0`）。
现在它**在真实数据里大量触发**（第五十三轮补了 103 条硬前置，边变多；这一轮又把同对边合并成最强的一条，
留下的都是硬关系）。但真实数据也暴露了第一版算法的两个毛病，都用可复现的场景钉住了：

1. **按「最苛刻的一张卡」弯过去，会撞进另一侧的卡**——实测弯了还是压卡，甚至压得更多；
2. **弓高被 96px 上限截断后没有第二次机会**。

第二版的做法（`web/src/edge-routing.ts` 的穿卡一节）：由每张挡路卡反解出候选弓高（正负两侧、
再加几档余量与大弓高），逐个验「这条曲线还压着几张卡」，只在**压卡数严格更少**时采用；
一样多就保持直线（弧线是补救，不是风格）。这保证「弯过的边一定比直线压得少」，
但**不保证清空**——密排视图里可能任何弓高都绕不开，那种情形如实计入
`stats.throughCardResidual`，HUD 与条款面板都写出来（「N 条边仍压着卡片（弓高上限 96px 内无解）」）。

回归用例分两层：

- `tests/edge-routing.test.mjs`（8 项，新增 2 项）：单元层面构造三种场景——
  单张挡路卡（必须清空）、两张卡分居两侧且上限内无解（必须压得更少、残余如实计数）、
  上限内绕不开（必须保持直线，不许留一条没用的弧线）；
- `tests/network-edges.mjs`：真实场景两层——**有解的视图**（dg 定义链 5 节点：穿卡规则生效且画布上
  0 条压卡）与**密集视图**（8 节点：残余压卡不超过页面报告的数，且必须写进 HUD）。

### 4. 同一对节点只画一条（A2-14）

第二十九轮的边界：契约边与关系边并存时会叠两条线（`拓扑空间 → 流形` 既有 definition 契约、
又有 hardPrereq），读者看不出那是两种关系还是画重了。规则写在 `web/src/network.ts` 的
`mergeParallelEdges`，**可核对、可复现**：

1. 按**无序对**分组（A→B 与 B→A 算同一对）；
2. 组内留下**视觉权重最大**的那条（越硬越该被看见）；权重用与线宽/吸力同一把尺子的 `visualWeightOf`；
3. 权重相同看边源：`relation` > `contract` > 族边；
4. 再相同按 `id` 字典序——结果与输入顺序无关；
5. 其余边**不丢**：进 `merged`，在边的标签后标 `+N`、在提示（`<title>`）里逐条列出它们是什么。

画布上的效果（实测）：dg 整案 97 → 63 条、liang 整案 130 → 110 条、全库 545 → 436 条；
HUD 改成「63 条边（另有 34 条同对边并进这些线里）」，条款面板新增一节写清规则与当前条数。
**布局的吸力、度数统计与推荐理由仍按完整边集算**——合并只影响画，不偷偷改图的形状；
`tests/edge-merge.test.mjs`（6 项）钉住规则本身与「一条都没丢」，`tests/network-edges.mjs` 钉住界面照做。

顺带修掉一处**同一把尺子没对齐**的问题：`attractionOf()` 计算契约边的吸力时没把 `mode` 传进
`edgeVisual`，于是 `definition`（0.9）与 `task`（0.17）吸得一样紧——线画得很粗、吸力却与任务输入同级。
现在两处都走 `visualWeightOf(edge)`。

### 5. 压力场景实测（A2-15）

第三十七轮的边界：「自动摆位在密集图上只保证不重叠，不保证好看」；「交叉 4000 / 边长 1 / 位移 0.6」
是设计取值而不是实验结论。这一轮把可测的那一侧测出来（`tests/network-stress.test.mjs`，
只读数据 + 布局函数，不依赖浏览器；每次 `npm test` 都会重算并打印）：

| 场景 | 节点 | 登记边 → 画出 | 重叠数 | 最小间隙 | 交叉数 | 平均边长 | 中位边长 | 弯 / 残余压卡 |
|---|---|---|---|---|---|---|---|---|
| liang 整案（默认边源） | 63 | 130 → 110 | **0** | 99px | 131 | 302px | 276px | 31 / 16 |
| 全库（默认边源） | 232 | 545 → 436 | **0** | 71px | 720 | 361px | 297px | 133 / 162 |

读数说明：**「不重叠」是硬保证**（两张 172×58 的卡片既不叠、也留出间隙）；
交叉数与边长是**观测量**，没有阈值——它们的作用是以后调参时能对照（同一份数据重测必须得到同一组数字，
这条也写成了断言）。全库视图里 162 条边仍压着卡片，这是「只保证不重叠」的直接后果，已如实登记。
基线数字写成一句便于引用的话：**liang 整案 63 节点、交叉 131、平均 302px**；
全库 232 节点、交叉 720、平均 361px。
实测值同时要求留在本文件里：`tests/network-stress.test.mjs` 会核对这一节确实记着当前数字，
改了布局却忘了更新留档时会红。

### 6. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run check` | 通过 |
| `npm run build` | 通过（tsc + Vite） |
| `node --test tests/edge-routing.test.mjs` | 通过（8 项，新增 2 项穿卡场景） |
| `node --test tests/edge-merge.test.mjs` | 通过（6 项：规则五条 + 真实数据） |
| `node --test tests/network-stress.test.mjs` | 通过（4 项：硬保证、实测值、留档一致、确定性） |
| `node tests/network-picker.mjs` | 通过（含 7 项真实触摸事件断言） |
| `node tests/network-placement.mjs` | 通过（含 5 项「重新布局 / 重置」分工断言） |
| `node tests/network-edges.mjs` | 通过（含 5 项合并显示 + 4 项穿卡断言） |
| `npm test` | 全部套件通过 |

### 7. 未落实 / 边界

- **弧线不能保证清空遮挡**：全库视图里 162 条边仍压着卡片（liang 16 条）。弓高上限 96px 是
  第三十九轮定的设计取值，这一轮没有动它；要真正清空，得让布局本身把「边不穿卡」当成约束
  （现在是力导向 + 不重叠，没有卡片障碍项）。这一条已写进界面与文档，不假装解决。
- **合并显示只做到「最强的一条 + 计数」**：被并掉的边不参与绘制、也不参与弧线布局，
  因此同一对节点上的两条同类关系在画布上只剩一条线加一个 `+1`；逐条查看要靠提示文字。
  没有做「展开某一对」的交互。
- **触摸档 500ms / 12px 是按系统语义与手感定的，不是实测出来的**：真实设备上的手感仍属
  待证据事项（TODO 的 C 类「触屏手势」），CDP 触摸事件只能证明路径通、阈值分档生效。
- **压力场景只测「一次铺开」**：增量摆位（已有网络之上加节点）的规模是测试里那 10 个节点，
  没有在 200+ 节点的网络上加过节点；`placeNewNodes` 的开销随已有节点数增长，这一档没量。
- **合并之后 `stats.parallel` 在界面上恒为 0**：平行边弯开的代码还在（`edge-routing.ts` 的 ①，
  单元测试仍然覆盖），但界面这条路径不会再产生平行边——它是为「不合并」的调用方留的。

## 第五十四轮：知识网络加保存功能（写 E、不改本体）（2026-10-03）

用户的要求：**「在知识网络里面加入保存功能，下次可以直接用。」**

> 编号说明：写这一轮时发现 `VALIDATION.md` 已被另一路并发写入「第五十三轮」（TODO 的 A1 十项欠账），
> 因此本轮记为第五十四，不改动那一轮的编号与内容。

### 1. 保存的是什么

一条带名字的**视图** = 四样一起存、一起还：已加入的节点、可见边源（七类里开了哪几类）、
手动位置（拖过的坐标）、相机（中心 + 缩放）。少存任何一样，「下次直接用」都会变成「下次还得再调一遍」。

| 层 | 改动 |
|---|---|
| E（`server/db.mjs`） | 新表 `network_views(view_id, profile_id, name, payload_json, created_at, updated_at, revision)` + 索引；`list/create/update/deleteNetworkView` 四个方法；导出档案时带上 `networkViews` |
| 契约（`shared/contracts.mjs`） | `normalizeNetworkView`（形状与范围）+ `EDGE_FAMILIES`（边源权威清单——前端那份是 TS，服务端不能 import） |
| 接口（`server/api.mjs`） | `GET/POST /api/v2/profiles/:id/network-views`、`PATCH/DELETE …/:viewId`；`checkViewPayload` 用本体核对节点 id 与边源 |
| 页面（`web/src/pages/NetworkPage.tsx`） | HUD 加「保存视图」与「视图列表」；视图面板复用已有的浮窗机制（拖拽、单侧互斥、`aria-label`）；载入把四样东西放回去 |

### 2. 三条守住的性质（都写进断言）

1. **只写 E，不碰 M**：保存前后取 `/api/v2/ontology` 的版本哈希比对，必须**一模一样**。
2. **保存不是学习行为**：档案的事件总数在保存前后**不变**——视图不进事件流。
3. **不知道就说不知道**：没选档案时退回本机 `localStorage`，面板上写明「未选择学习档案：视图存在这台浏览器里」；
   列表项标「档案（E）／本机」。载入时若节点已不在本体里，说明跳过了几个，不静默替换。

校验分两层：形状与范围在 `normalizeNetworkView`，**节点与边源是否真在本体里**在 API 层核对
（未知节点直接 400 拒绝）。理由写在代码注释里：静默丢弃会让「下次直接用」变成
「下次少两个节点却没人告诉你」。

### 3. 四处踩坑（都在实现过程中）

1. **`SCHEMA_VERSION` 不能升**：它在 `db.mjs` 里被严格比对，升号会把已有数据库判成「不兼容」。
   新增一张表用**附加式 DDL**（`CREATE TABLE IF NOT EXISTS`）即可——这条写进了代码注释。
2. **批量改写的脚本报了成功、文件却没改**：第一版给 `db.mjs` 加表与方法的脚本在第三个断言处退出，
   而它只打了「✓ 找到插入点」就往下走，写盘发生在最后——于是「成功」是假的，接口 500。
   重做时把复核放在**写盘之后**（逐项断言 DDL、行映射、四个方法、导出字段都在文件里）。
3. **面板开关叫「视图」，与「保存视图」互相包含**：测试先点到「保存视图」，弹出 prompt 却没人接，
   于是超时。开关改名「视图列表」——人和测试都会看错的名字就该改。
4. **两个测试误报**：①「本机」二字整页查找会命中侧栏的「本机工作台」，改成只看列表项自己那行；
   ②画布节点的类名是 `.network-node`（第一版数的两个类都不存在），计数恒为 0。

### 4. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run check` | 通过 |
| `node tests/network-views.mjs` | **新增 15 项**全部通过 |
| `npm test` | **二十个**套件全部通过 |

新套件覆盖：面板与保存按钮、面板写明来源（E）、保存进档案、内容含节点与相机、界面回执、
不改本体、不产生事件、新页面仍能看到、载入回画布、载入的是那两个节点、重命名写回、删除移除、
未选档案时如实说明、本机保存并标「本机」、全程无控制台错误。

截图：`tmp/network-views.png`（面板）、`tmp/network-views-full.png`（整页）。

### 5. 未落实 / 边界

- **删除不可撤销**：`DELETE` 直接删，面板上没有二次确认、也没有回收站——这是本轮最该补的一条。
- **视图之间不能复制/合并**：只能整条载入，「把 A 的两个节点并进当前视图」没做。
- **没有自动保存与版本链**：只存用户显式命名的快照；改名覆盖旧名，不留历史。
- **同档案内重名不拦**：两条视图可以同名（列表按更新时间排序，靠时间与节点数区分），没有唯一性约束或覆盖提示。
- **相机只在载入时应用一次**：载入后用户再缩放，视图里存的相机不会跟着更新（要更新得重新保存）。
- **本机存储不参与档案导出**：没选档案时存的视图只在 `localStorage` 里，导出带不上；
  也没有「选档案后把本机视图搬进档案」的一次性迁移。
- **`positions` 只做形状校验**：坐标不检查是否落在合理范围（画布外也存得下），
  也没有「载入后自动 fitView 到视图内容」的兜底。
- **面板没有搜索/排序**：视图多了只能滚；按名字筛选、按时间/大小排序未做。

## 第五十三轮：A1「本体与数据层」的十项欠账（2026-10-03）

`TODO.md` 的 **A1. 本体与数据层** 一节列了十条缺口（由各轮验收记录的「未落实 / 边界」汇总而来）。
这一轮逐条落实。数字都是现场量出来的，`npm run check` 的摘要里能再看一遍；
每条都留了可核对的入口（数据文件、校验器断言或测试套件）。

### 1. 其余案例的粒度复核（A1-2）

第五十二轮只逐条判过 `liang`（36 条话题 / 27 个单元），其余六个案例默认全是 `unit`。
这一轮按**同一判据**（标题并列两个以上可独立定义的对象，或本身是一节/一章的范围）把全库过了一遍，
并把判据与判定结果集中到 [`data/granularity.mjs`](data/granularity.mjs)：

- **52 条话题**（liang 36、rudin 15、manifold 1）、**180 个单元**；
- **19 条「判为单元的例外」也逐条写了理由**。三条例外规则是可核的：任务与方法不判
  （「用维数计数区分同构与同构的具体实现」是一个方法，不是两个对象）、背景接口不判
  （`bg:` 是环境边界，按设计就把若干基础概念收在一个接口里）、同一条命题的两个名字不算并列
  （「ε–δ 与序列定义的等价」是一条等价命题）；
- 校验器加了**完备性断言**：标题命中并列词的条目必须出现在话题清单或例外表里，各带理由——
  漏判一条 `npm run check` 就红。这条把「逐案例复核过」从一句承诺变成可核对的检查；
- `data/cases/liang.mjs` 里的局部 `TOPIC_SLUGS` 随之删除，由 `data/manifest.mjs` 装配时统一套用
  （一份登记表管全库，案例文件不再各写一份粒度）。

判过之后 `rudin` 的默认列表少 15 条里程碑（它们落进「话题」档）——这正是判据的意思：
「有限集、可数集与不可数集」不是可独立认知的单个对象。里程碑仍可当**目标**（见第 3 条）。

### 2. 学科词表细分（A1-4）

「代数」一支（39 个节点）里混着三类对象。按**节点的核心对象**拆成四支，判据逐条写在
[`data/fields.mjs`](data/fields.mjs)：

| 支 | 对象数 | 判据（摘要） |
|---|---|---|
| 群论 | 16 | 对象是群、群元素与群作用（含置换群与 Cayley 定理） |
| 线性代数 | 6 | 对象本身是线性结构：向量空间、线性映射、对偶、维数与算子范数；`V⊗V* ≅ End(V)` 归这里（它讲的是算子与矩阵） |
| 多重线性与张量代数 | 15 | 对象由多重线性结构构成：多重线性映射、张量积、(r,s) 型张量、换基规律、张量丛与张量场 |
| 域与数系 | 3 | 域结构本身：有序域的公理、复数域、复数域的代数完备性 |

两处边界写进了注释：`rudin:least-upper-bound`（实数域与最小上界性）留在 `分析`，
因为它登记的是**完备性**，是本站极限与连续的基础；`tensor:dual`（对偶空间）归 `线性代数`，
它的定义 `V* = Hom(V,F)` 只用到线性映射。分析 66 → 65（`rudin:ordered-field` 移到域与数系）。
十二支全部有对象、全部节点都能归入，校验器与 `tests/granularity-fields.mjs` 各自核对。

顺带修掉一处**第五十二轮遗留的界面退化**：`web/src/case-catalog.ts` 的领域分组名单还停在
旧词表（几何与拓扑 / 代数与几何 / 代数 / 方法论），学科改名后一个都不再匹配，
开始学习页的「原型问题按领域分组」退化成「分析 + 其他」两组。
本轮把名单与 `data/fields.mjs` 对齐（现在 4 组：分析 / 微分几何 / 群论 / 多重线性与张量代数），
`scripts/build-dg-case.mjs` 里那份过期的学科表也一并同步（23 处）。

### 3. 话题在网络上以「线索」层区分（A1-3）

网络与规划页原先都只把话题当普通节点。这一轮给它一个**线索层**身份：

- `web/src/network.ts` 新增 `THREAD_LAYER` 与 `isThreadNode()`：推荐面板里话题**不再走
  「图中前提已加入」这一档**（那是单元之间的话），而是标成「线索」并给出说明；
- `web/src/node-related.ts`：长按取强关联时，**候选是话题的一律改标「线索」**
  （`basis = 'thread'`，原依据附在后面），不再以「引入它的前提 / 共用前提」出现；
- 界面：话题卡片右下角一枚虚线「线索」徽标、图例多一项「线索层 N」、条款面板新增一节
  说明它不参与前置计算；候选圈的线索卡片用虚线描边区分。**话题照常画、照常连接、照常能当目标**
  ——改的是读法，不是把话题藏起来；
- 规划页（`/plan`）：背景网格只列单元（话题**不能**被声明成「已经会的背景」），
  过滤掉的话题如实列出数量与去处；目标下拉里的话题标成【线索】，并说明它只能当里程碑。

### 4. 构造类型的登记约定（A1-5）

`Definition` / `Term` / `Representation` 仍是 0 个节点。这一轮把**约定**写清楚
（README 的「构造类型的登记约定」），并撤掉界面上「本体里还没有登记这几种构造」的说法——
那句话把两件事混成一件：界面上没有这一类**节点**，不等于本站没有登记这类**内容**。

| 构造 | 登记在哪里 |
|---|---|
| `Definition` | 概念节点的负载与正文里（`formal.predicate` 就是定义式）；定义性依赖由 96 条 `definitional-dependency` 见证指名「依据在定义哪一处」 |
| `Term` | `signature.constants`（8 个常元）与各节点的 `formal.typeEnv`（17 个节点），由 `core/typecheck.mjs` 核验 |
| `Representation` | 节点内的 `representations` 子记录（31 条，分布在 29 个节点上） |

为什么不拆成节点：这三类内容都不可独立认知，拆开会让节点数翻倍，与「节点是最小的可独立认知单元」
直接冲突。将来若要登记，形成检查已就绪（`core/formation.mjs` 的字段要求都在）。
`tests/construct-registry.test.mjs` 把这条约定钉住。

### 5. 无关系节点的清单与原因分类（A1-6）

更早的记录说「136 个节点没有任何关系」。这个数字本身没有信息量：要能分清**设计如此**与**欠账**。
新增 [`data/relation-coverage.mjs`](data/relation-coverage.mjs)，用规则 + 一份显式待办清单分类：

| 类 | 现在有多少 | 处理 |
|---|---|---|
| 背景接口（`bg:`） | 5 | 设计如此：环境边界只在契约与边界引用里出现（其中 4 个另有「背景 → 案例核心」的硬前置） |
| 线索层（话题级条目） | 37 | 设计如此：不参与前置计算（见第 3 条） |
| 由契约引入 | 38 | 设计如此：方法、练习、例子、反例、误区与证书片段由契约引入 |
| **尚待登记** | 33 | **欠账**：清单逐条写明欠什么（`PENDING_RELATION_REGISTRATION`），本轮已把五个案例的定义链补上 |
| **完全孤立** | **0** | 缺陷类：唯一的那个（`bg:misc:counterexample-method`，既无关系也无契约，在网络里无法被引入）本轮补了 `mode=method` 的引入契约 |

无关系节点从 146 降到 113，且**每一个都有分类与说明**；`npm run check` 新增一节现场打印分类计数，
`tests/relation-coverage.test.mjs` 断言「孤立类必须为空」「待办清单与数据一致」。

### 6. 二十个节点补上证据等级（A1-7）

`evidenceStatus` 为空 20 个（3 个 `Symbol`、5 个 `Theory`、1 个 `Method`、4 个 `Proof`、
7 个 `MisconceptionPattern`）。补的口径按**节点在做什么**取值：

- 符号与背景理论是**声明** → `DEF`；全局方法是操作步骤 → `ILLUSTRATION`；
- 四个证书片段是能重放的有限证书（`machine-certificate` / `passed`）→ `FINITE`；
- 误区模式登记的是「一条错误规则连同反例」，不是待证命题 → `ILLUSTRATION`（与其它案例的误区同档）。

校验器新增断言：**每个节点都必须有证据等级**——「不声称」也要显式写 `NOT-CLAIMED`，
不能留空让读者分不清。`core/context.mjs` 与 `/ontology/nodes` 的读取口径也统一成
「先读 `teaching.evidenceStatus`，`provenance` 只作兼容保留」。

### 7. 硬前置扩到七个案例（A1-8）与两种见证类型（A1-9 / A1-10）

第四十二轮只覆盖 `limit` / `dg` 两案共 46 条，且「某定理用到另一条定理」这类依赖没有表达——
反函数 → 隐函数那一条还混在同一批 `DEF` 见证里，从数据上看不出区别。这一轮两处都补上：

**条数：46 → 103**（`limit` 12、`dg` 36、`manifold` 9、`tensor` 10、`group` 5、`liang` 18、`rudin` 13）。
新增的每一条都按同一口径写两层依据（`witness.scope` 指名依据在定义/陈述的哪一处，`scope` 说明这条依赖
说的是什么）。背景节点（`bg:`）可以当前置的**来源**——背景存在的意义就是当前置，
它不能当目标（校验器与测试各断一条）。

**两类见证从数据上分得开**：

| 见证类型 | 条数 | 登记要求（校验器强制） |
|---|---|---|
| `definitional-dependency` + `DEF` | 96 | `witness.scope` 必须写明依据在定义的哪一处 |
| `proof-dependency` + `PROOF`/`FINITE` + `ref` | 7 | `ref` 指向一条**同时列出两端节点**的证据记录，且见证状态必须与证据的 `status` 一致 |

证明依赖的七个实例：`dg:inverse-function-theorem → dg:implicit-function-theorem`（第五十二轮
点名的那一条，现在指向新的 `ev-dg-inverse-implicit`）、`rudin` 的两条
（压缩映射 → 反函数、反函数 → 隐函数，指向 `ev-rudin-inverse-from-contraction`
与 `ev-rudin-implicit-from-inverse`），以及四个证书片段 → 它们证明的断言
（`limit` / `manifold` / `tensor` / `group` 各一条，指向各自已有的机器证书记录，状态 `FINITE`）。

顺带修掉条款面板上一处**写死的过期数字**：硬前置早已不是 0 条，界面还在说「本体里当前没有登记
hardPrereq 关系（0 条）」——现在从本体现算。

### 8. `granularity` 语义变更的兼容说明（A1-1）

第五十二轮新增的 `granularity` 参数把「不带参数」的语义从「全部」改成「只单元」，
外部脚本会少看到 52 条话题级条目，但当时只写了验收记录，没写进 README。这一轮：

- README 的「API 概览」新增两节：**两条读参数的约定**（`query` 是 `URLSearchParams`，必须 `.get()`；
  `scope` 与 `granularity` 不是一回事）与 **`GET /ontology/nodes` 的查询参数**表（含默认值、
  响应里的 `granularity` / `granularityCounts`、以及旧调用 → 新调用的**迁移示例**）；
- `server/api.mjs` 顶部补上同样的三条约定，并修掉路由注释里 `?scope=unit` 的过期写法
  （第五十二轮改名前的残留，照着读会写出错参数）。

### 9. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run check` | 通过（含新的粒度完备性、证据等级、无关系分类三组断言；摘要打印分类计数与硬前置条数） |
| `npm run build` | 通过（tsc + Vite） |
| `node tests/granularity-fields.mjs` | 通过（数据层 10 项 + 接口层 7 项 + 页面层 6 项） |
| `node tests/hard-prereq.mjs` | 通过（11 项：条数、案例范围、见证两类、证明依赖两端可核、不变量 D） |
| `node --test tests/thread-layer.test.mjs` | 通过（5 项） |
| `node --test tests/relation-coverage.test.mjs` | 通过（7 项） |
| `node --test tests/construct-registry.test.mjs` | 通过（4 项） |
| `npm test` | **十九个套件全部通过** |

顺手修掉一处**测试自身的假失败**：`tests/home-narrative.mjs` 的「顶部幕导航可以直接抵达对应段落」
原先点完按钮等固定 900ms，而实测跨三幕的平滑滚动要 ~700ms——只剩 200ms 余量，
机器一忙就采到滚动中途（实测 `{scrollY: 2921, active: '2'}` 正是第 500ms 的位置），
于是「点了第 4 幕却停在第 2 幕」这种假失败会出现（单跑有时又通过）。
改成「等位置与状态两拍都不再变」：断言的意思不变，只是不再赌机器速度。
通用修法（把这类等待固化成测试工具）仍是 TODO 的 A5-35。

### 10. 未落实 / 边界

- **判据是启发式的**（标题并列词 + 一节的范围），52 条话题是逐条判过的结果，不是脚本产物。
  边界情形仍可能判得不一致（如「完全集与 Cantor 集」算话题、「Cauchy 序列与完备性」算单元——
  后者的两个名字由同一条等价命题连起来），这类判断写在登记表的理由里，可以逐条复核。
- **`rudin` 的话题最多（15 条）**：它的节点本来就是教材小节的凝练，判成话题后默认列表少 15 条里程碑。
  里程碑仍能当规划目标，但「默认列表」这一档确实变薄了——这是判据的直接后果，不是失误。
- **「尚待登记」还有 33 条**：清单逐条写着欠什么（大多在 `rudin` 的第 5–11 章与 `liang` 的次级里程碑）。
  本轮优先补主干（定义链与推导依赖），其余留成可执行的待办，而不是「大概还缺一些」。
- **`proof-dependency` 只登记了 7 条**：本站没有转录教材证明，`rudin` 那两条的依据是**教材的证明顺序**
  （与行动契约的输入一致），义务里写明「未逐页核对教材证明文本」；四个证书片段指向的证据是能重放的
  机器证书，但证书本身只覆盖局部片段。
- **线索层只做到「读法」层面**：规划器（`core/planner.mjs`）仍然按契约计算路线，话题可以当目标，
  因此「线索不参与前置计算」目前只落在网络视图与规划页的背景声明上，不是规划算法里的约束。
  要让它成为算法约束，得先决定「一条线索被算作满足」是什么意思——那是另一个决定。
- **`Definition` / `Term` / `Representation` 仍不是节点**：这一轮选了「写明约定 + 撤掉失实说明」，
  没有把内容拆成节点。界面文案与 README 现在给出去处，但研究台没有专门的「表征清单」页面，
  只靠 `/ontology` 的坐标与节点页的 `representations` 区块。
- **80 条「背景接口 / 线索层 / 由契约引入」的无关系节点**是设计取值而不是验证过的结论：
  分类规则假定「契约已经把依赖说清楚了」，而契约的 `mode` 是人工登记的；背景接口与线索层
  则是明确的设计（前者是环境边界，后者是条目粒度）。
- **测试稳定性**：`tests/home-narrative.mjs` 里那处固定等待本轮修掉了，但同类的「动画期间采样」
  写法还散在各套件里（TODO A5-35），机器负载高时仍可能假失败——这一轮遇到过两次
  （一次是导航落点，一次是首屏文字的浮现动画）。

## 第五十二轮：单元与话题分层、学科按本质领域分类（2026-10-03）


用户报错（配节点列表截图：`liang:continuous-map`「连续映射与同胚」、`liang:cosmological-principle`「宇宙学原理与空间几何」）：
**「节点是最小的可独立认知单元，这些是话题范畴下的内容，要去分开；还有，不要按教材分类节点，按知识的本质领域去分类。」**

### 1. 学科：拆掉教材式的合并标签

改动前 `discipline` 里混着三种东西：真正的领域（分析、代数、测度论、集合论、数理逻辑）、
**教材章节式的合并标签**（`几何与拓扑` 59 条、`代数与几何` 35 条）、以及把「是不是方法」
也塞进学科的 `方法论`。合并标签看着像领域，其实说明不了这个对象**本身**属于哪一支数学。

新增受控词表 `data/fields.mjs`（9 支：分析 / 测度论 / 拓扑 / 微分几何 / 代数 / 集合论 / 数理逻辑 /
相对论与宇宙论 / 数学方法），逐节点重判：

| | 改前 | 改后 |
|---|---|---|
| 微分几何 | 几何与拓扑（部分） | **74** |
| 分析 | 60 | **66**（吸收 Rudin 的形式积分一章：可求长曲线、单形与链、Stokes…） |
| 代数 | 20 | **39**（吸收张量代数：多重线性、(r,s) 型张量空间、张量积、换基规律…） |
| 拓扑 | 15 | **14** |
| 相对论与宇宙论 | 32 | **31** |
| 测度论 / 数理逻辑 / 集合论 / 数学方法 | 4 / 2 / 1 / 0 | 4 / 2 / 1 / 1（跨领域方法论节点） |
| 几何与拓扑 / 代数与几何 / 方法论 | 59 / 35 / 4 | **0 / 0 / 0** |

校验器加了断言：学科必须在词表内（防止合并标签再混回来）；「出身」由 `case` 承担，
列表页的筛选因此改名为 **「来源」**，与 **「学科（本质领域）」** 并列——这就是「不按教材分类」。

### 2. 粒度：话题与单元分开

新增字段 **`granularity`（`unit` / `topic`）**，判据写在 `data/fields.mjs`：
标题把两个以上独立对象并列（含「、」「与」「及」），或本身就是一节/一章的范围。
按判据逐条判过 `liang` 案例，**36 条话题 / 27 个单元**（全库 232 = 196 单元 + 36 话题）：

- 话题：连续映射与同胚、张量场与缩并、里奇张量、标量曲率与爱因斯坦张量、宇宙学原理与空间几何…
- 单元：拓扑空间、紧致性、微分流形、切矢量、施瓦西真空解、Birkhoff 定理…

接口默认只给单元（`?granularity=unit|topic|all`，未知值按 unit 并如实回报），
响应里带 `granularityCounts`；列表页默认档只列单元，计数行**如实说明**「另有 36 条话题级条目
（一节或一章的范围，不是可独立认知的单元）」，切到「话题」档才看它们。

> 命名踩坑：这个字段起初叫 `scope`，但 `method()` 已经用 `scope` 表示「局部方法 / 全局方法」、
> `relation()` 的 `scope` 是关系适用范围——同名会把三件事搅在一起。改名为 `granularity`。

### 3. 过程中修掉的三处自己的错误

1. **批量改学科时匹配错了花括号**：脚本用「id 之后的第一个 `{`」定位选项对象，结果把
   `g_{μν}` 里的 `{` 当成了对象开头，往 LaTeX 字符串里插了 `discipline: '微分几何',`（10 处）。
   清除误插 + 逐行修复后改用**按调用行匹配**（`C('slug', …)` 的第 5 个位置参数）才安全。
2. **接口读查询参数读错**：`query?.granularity` 对 `URLSearchParams` 永远返回 `undefined`，
   于是 `granularity=topic` 悄悄退化成 unit（实测 topic 档返回的却是单元）。改成 `query.get(...)`。
3. **断言写成了恒真**：中途有一次用 `includes('topicCounts')` 验证「代码块已插入」，
   而那个字符串本来就出现在 JSX 里——插入其实失败了却报成功。改成断言**插入位置**本身。

### 4. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run check` | 通过（含新的词表与粒度断言） |
| `node tests/granularity-fields.mjs` | **新增 12 项**全部通过 |
| `node tests/node-list.mjs` | 通过（翻页断言改成「默认档=单元数」，并新增话题计数与两层可翻完） |
| `npm test` | 十九个套件全部通过 |

新套件断言：粒度只有两个值、默认只给单元、单元+话题=全部、未知值回退并如实回报、
学科只剩本质领域（无合并标签）、计数行说明话题数、默认列表不含话题、来源与学科是两个独立筛选、
话题档能看到被点名的条目且不混单元、按领域筛选结果只含该领域、无控制台错误。

### 5. 未落实 / 边界

- **只有 `liang` 案例判过粒度**：其余案例（dg / manifold / tensor / rudin / group / limit）默认全是 `unit`，
  我没有逐条复核它们里是否也混着话题级条目——例如 `dg:generalized-stokes-theorem` 这类是单元，
  但别的地方可能有「A 与 B」式的合并条目。
- **话题尚未参与路径规划与知识网络**：本轮只做了「列表与接口分层」；话题在 `/plan` 与 `/network` 里
  仍按节点出现（它们有真实关系），没有单独的表达方式。
- **领域词表是 9 支**：更细的分支（如把「代数」拆成群论 / 线性代数 / 多重线性代数）没有做，
  因为本体登记的对象还撑不起那么细的划分。
- **判据是启发式**（标题里的并列词）：36 条是我逐条判过的结果，不是脚本产物；
  但同一本书里语义平行的条目仍可能被判成不同粒度（如「惯性观者与惯性系」算话题、
  「闵氏时空」算单元），这类边界没有二次复核。
- **接口的 `granularity` 是新增参数**，旧调用（不带参数）语义从「全部」变成「只单元」——
  站内调用点已全部核对，但**外部脚本若依赖旧行为会少看到 36 条**。

## 第五十一轮：首页正文往两边铺开（2026-10-03）

用户报错（配第一幕截图）：**「主要内容太居中显得紧凑且两边空，往两边扩散大点。」**

### 1. 真凶是两处限宽，其中一处藏得深

| 规则 | 旧 | 新 |
|---|---|---|
| `.home-story-section > .home-story-act` | `min(100%, 42rem)` | **`min(100%, 46rem)`** |
| `.home-story-copy-stage` | `min(100%, 42rem)` | **`min(100%, 46rem)`** |
| `.home-story-act[data-act="pain"] .home-story-act-copy` | **`max-width: 35rem`** ← 第一幕被单独限得更窄 | **`46rem`** |
| 柔光罩竖带 | `calc(42rem + 5.2rem)` | `calc(46rem + 4rem)` |
| 形状层位移 | ±15% | **±12%**（图形也往中间靠一点，两边不那么空） |
| 第一幕标题 / 正文 | `clamp(1.5rem, 3.1vw, 2.9rem)` / 1.02rem | `clamp(1.6rem, 3.3vw, 3.15rem)` / 1.06rem |

**第一次改错了地方**：只改了 `.home-story-copy-stage`，量出来正文还是 672px——真正限宽的是
`.home-story-section > .home-story-act`。第二处（第一幕的 35rem）是「第一幕看起来比别的幕更窄」的原因。

实测（1440×900，内容区 1182px）：五幕版心 **736px（62%）**，左右各留 223px；改版前第一幕是 560px（47%）。

### 2. 连锁：遮罩的保护区要跟着正文重算

遮罩原来把 20%–80% 整条护住（对应 42rem 的正文）。正文放宽到 46rem 后，
在 1182px 的内容区里占 **18.9%–81.1%**，比保护区还宽——标签又可能压到正文边缘。
于是把保护区改成 **17%–83%**，渐变淡出区相应变成「0–5% 实、11% 处 0.6、17% 起完全透明」（右侧对称）。

两条旧断言里的阈值（`pct <= 16 || pct >= 84`）也一并同步成 **`pct <= 12 || pct >= 88`**，
新断言里的 alpha 近似函数按新色标重写——阈值必须跟着遮罩走，否则会把半淡的边缘标签算成清晰可见。

### 3. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过 |
| `node tests/home-narrative.mjs` | 通过（阈值同步后仍守住「无标签压正文 / 无硬切」） |
| `npm test` | 十八个套件全部通过 |

截图：`tmp/home-act1-wide.png`。

### 4. 未落实 / 边界

- **只按 1440×900（内容区 1182px）调过**：46rem 在更窄的窗口里会顶到 `min(100%, …)` 的上限，
  窄屏走的是自然滚动（flow）形态，另有排版，本轮没重扫。
- **±12% 的位移与 46rem 的正文是一组取值**：两者共同决定「两边留多少」，
  改其中一个都要重量标签的可见数（遮罩保护区是按正文算的）。
- **正文每行更长了**（段落宽度从约 560px 增到 592–736px）：中文长行的可读性通常偏好 30–40 字，
  这里接近上限；没有做阅读测试，只保证不溢出舞台。
- **动画侧的可读标签仍受遮罩约束**：正文越宽，留给标签的两侧带越窄（现在各约 12%），
  这与「往两边扩散」是同一枚硬币的两面。

## 第五十轮：动画标签放大、往中间挪，并做渐变淡出（2026-10-03）

用户报错（配第四幕截图）：**「最右边的文字卡屏幕外面一半看着难受，第二幕也是这样，
把动画里的字搞大一点往中间放放，同时做好透明渐变以防遮住主要文字。」**

### 1. 根因：两层共用同一个位移

形状层与文字层原来都让 ±24%。场景总宽 ≈1283px，加上 24% 的位移之后最外侧的标签必然出屏
（实测第四幕有 3 条：「删掉会怎样」「关键反例」「解释结论怎么塌」）。

### 2. 改法

| 项 | 旧 | 新 |
|---|---|---|
| 形状层位移 | ±24%（漂移 ±5%） | **±15%**（漂移 ±5%）——形状出屏只是构图，不影响阅读 |
| 文字层位移 | 与形状层相同 | **±4%**（漂移 ±1%）：标签留在屏幕内，也更靠中间 |
| 文字层场景尺寸 | 128%（与形状层同） | **104%**：整幅留在屏幕内，留出约 80px 余量 |
| 标签字号 | 场景自带的 17px（渲染约 27px） | **22 单位**（渲染约 33px），`.story-small` 20 / `.story-caption` 21 |
| 标签遮罩 | 「10% 实 → 16% 起全透明」的硬边带 | **渐变淡出**：0–6% 实、13% 处 0.6、20% 处完全透明（右侧对称），**并在屏幕左右边缘各加一段淡出**（1–6% 与 94–99%） |

最后一条是用户点名的「做好透明渐变以防遮住主要文字」：标签接近正文列时是渐渐淡掉的，
既不会突然消失，也不可能压住正文；万一仍有标签探到屏幕边缘，也是淡出而不是被硬切。

### 3. 参数不是拍脑袋：做了一次扫描

在真浏览器里把「文字层场景尺寸 × 位移」扫了 12 组（4 个尺寸 × 3 个位移），量每幕的
清晰可见标签数、压正文数、被硬切数：

| 配置 | 可见标签合计（各幕） | 压正文 | 硬切 |
|---|---|---|---|
| **104% / ±4%** | **13（3/3/1/1/5）** | 0 | 0 |
| 104% / ±7%、±10% | 5（1/1/1/1/1） | 0 | 0 |
| 112% / ±4%~7% | 5（1/1/1/1/1） | 0 | 0 |
| 120% / ±4% | 10（2/2/2/2/2） | **5** ✗ | 0 |
| 120%~128% / ±7%、±10% | **0** | 0 | 0 |

选了 104% / ±4%。带漂移复测一遍五幕：可见 3/1/2–3/5/1，压正文 0，硬切 0。

### 4. 顺带修掉两条**过期阈值**的旧断言

第四十四轮写的两条断言用 `pct <= 16 || pct >= 84` 判定「这条标签画出来了」。
遮罩这轮改成 6/13/20…80/87/94 之后，16% 处其实只剩约 0.5 不透明度——
按旧阈值它会把**半淡的边缘标签**算成清晰可见，于是误报「有标签压正文」（第二幕、第五幕各 1 条）。
改成跟随遮罩的清晰可见区（≤13% 或 ≥87%），断言名也从「画出来的」改成「清晰可见的」。

### 5. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过 |
| `node tests/home-narrative.mjs` | 通过（**新增 4 项**标签尺寸/遮罩/两层尺寸/不硬切） |
| `npm test` | 十八个套件全部通过 |

新增断言：标签字号 ≥20 单位、遮罩是含中间色标的渐变（不是硬边）、文字层场景比形状层小、
当前幕「有可见标签 + 压正文 0 + 被硬切 0」。

截图：`tmp/home-act4.png`。

### 6. 未落实 / 边界

- **每幕清晰可见的标签数不均**（3/1/2–3/5/1）：标签在场景里的疏密本来就不同，
  加上遮罩的淡出区，落在正文列里的那些会被淡掉。要每幕都「够热闹」得重新安排场景里标签的位置，
  本轮只调了几何与尺寸。
- **漂移让可见数在 1–5 之间浮动**：标签穿越淡出边界时会慢慢显隐（这正是渐变的目的），
  但没有做「停在一个稳定位置」的档位。
- **字号只对背景角色生效**：`.home-story-label-layer` 里的 22 单位是覆盖值，
  窄屏「自然滚动」形态（`.is-flow`）用的是另一套紧凑排版，本轮没动。
- **104% / ±4% 是在 1440×900 下选出来的**：更窄的窗口（1240–1280 档）没有重扫，
  那里 s 参数可能偏大；窄屏走的是 flow 形态，不受这套几何影响。

## 第四十九轮：首页正文去掉「卡片边界」，文字自然浮现（2026-10-03）

用户报错（配了第一幕截图）：**「这块边界感割裂感太重，文字要自然在中间浮现，后面的也是文字框要无界感。」**

### 1. 三处「框」全部去掉

| 元素 | 旧 | 新 |
|---|---|---|
| 正文块 `.home-story-act-copy` | 圆角白卡：`linear-gradient` 底 + `0 18px 46px` 投影 + `backdrop-filter: blur(2.5px)` | **无边框、无投影、无 backdrop**；可读性交给一层**边缘完全不透明度归零**的径向白雾（`radial-gradient(…, rgba(255,255,255,0) 78%)`）。归零意味着看不到任何轮廓 |
| 六条现状 `.home-story-point` | 每张一张白卡（边框 + 渐变底 + 投影），六张连起来像表格 | **无边框、无卡底、无投影**；只剩图标色档 + 文字，靠留白与字重分层；悬停给一层极淡水洗 |
| 边界声明 `.home-story-boundary` | 左侧 2px 竖线 + 淡底 | **无边框无底色**，改成「※ + 淡字」（`::before` 的琥珀色标记） |
| 图标块 | 圆角方块（11–12px） | 圆形（`50%`，小屏覆写也一并改） |

### 2. 顺带修掉一道竖缝

柔光罩原来叠了**两层**背景：横向渐变的带 + 一层「上下渐变」（0.5→0.14→0.5 白）。
第二层在横向上是常数，被带的宽度**硬切**——截图里正文右侧那道竖线就是它。
现在只留横向那一层，左右边缘各自归零，没有可辨的接缝。

### 3. 「自然浮现」怎么做的

- 正文整块：`home-copy-emerge` 720ms —— `translateY(14px) + blur(7px) + opacity 0` → 清晰；
- 六条现状**依次**浮现（90/150/210/270/330/390ms，间隔 60ms），边界声明与末幕按钮跟在 450ms；
- 只动 `opacity / transform / filter`，不动布局（固定舞台的高度约束不受影响）；
- `prefers-reduced-motion` 下不做浮现，直接是终态。

### 4. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过 |
| `node tests/home-narrative.mjs` | 通过（**新增 6 项**无界感 / 浮现断言） |
| `npm test` | 十八个套件全部通过 |

新增断言：正文无边框/无投影/无 backdrop 且**白雾最后一个色标 alpha 为 0**、
六条现状全部无边框无卡底无投影、边界声明无框且标记为「※」、
正文有浮现动画且静止后 `opacity ≥ 0.99` 与 `blur < 0.5px`、
六条现状的 `animation-delay` 恰好是 0.09→0.39s、柔光罩只有一层渐变。

写这组断言时自己踩了一次：在动画收尾的瞬间取样，`blur` 还剩 0.018px，字符串匹配 `blur(0px)` 判失败。
改成「等动画走完 + 按数值判定（< 0.5px）」。

截图：`tmp/home-act1-borderless.png`。

### 5. 未落实 / 边界

- **只改了第一幕的实际观感验证**：样式是全局的（`.home-story-act-copy` / `.home-story-point` / `.home-story-boundary`
  对五幕都生效），但截图与肉眼核对集中在第一幕。
- **白雾的半径是设计取值**（58% × 52%、78% 处归零）：更窄会让长段落压到背景线上，更宽又会重新出现「一片白」的感觉；
  没有做逐幕的段落长度核对。
- **浮现动画与动画进度无关**：它按「进入这一幕」触发，不随滚轮推进重播；回看某一幕时不会重复浮现
  （固定舞台下每一幕只挂载一次）。
- **无界感带来一个代价**：六条现状失去卡片后，靠留白分层，密集段落下的分组感比卡片弱——
  窄屏（自然滚动形态）里是否还清楚，只做了「不溢出 / 字号」层面的验收，没有做可读性评估。

## 第四十八轮：DeepTutor 介绍写细，并贴上外部链接（2026-10-03）

用户的要求：**「关于什么是 deeptutor，介绍的再细一点，把对应的 GitHub 链接贴上。」**

### 1. 先把事实核对出来（每条留出处）

介绍里的每一条都来自**本机检出**，不是凭印象写的：

| 事实 | 出处 |
|---|---|
| 仓库 `github.com/HKUDS/DeepTutor`、文档 `deeptutor.info` | `.bridge-research/DeepTutor-ef2d9e5c/README.md` 的链接与徽章 |
| 定位「agent-native learning workspace」，十来个模式共用一套运行时 | 同上，`## ✨ Key Features` 首段与首条 |
| 知识引擎清单（LlamaIndex / PageIndex / GraphRAG / LightRAG / WeKnora / IMA / MarginNote 4 / Kiwix / Obsidian）、MCP 与 EduHub 技能 | 同上，「Multi-engine knowledge」「Extensible tools and skills」两条 |
| 许可 Apache-2.0 | `LICENSE` 与 README 徽章 |
| 论文 arXiv:2604.26962《DeepTutor: Towards Agentic Personalized Tutoring》（Bingxi Zhao 等，2026） | `CITATION.cff` 的 `preferred-citation` |
| 本站核对到的版本 **v1.6.12**（release 2026-09-27） | `deeptutor/__version__.py` |

版本号是**核对之后写下的结果**，界面写的是「本站核对到的版本…依据：读自本机检出 …/__version__.py」——
站点不会在运行时去读那边的源码目录，所以不假装实时探测。

### 2. 界面上加了什么

- 「关于 DeepTutor」正文从一句话扩成一段可核查的介绍（HKUDS、Apache-2.0、agent-native、
  模式清单、知识引擎清单），末尾保留「本站把本体与规划器接过去，让它在**你选定的那个数学对象**
  的上下文里讲解、提问与出题」这句集成口径；
- 新增**外部链接**三张卡片：GitHub 仓库、官方文档、论文——外链一律
  `target="_blank"` + `rel="noreferrer"`；
- 新增「本站核对到的版本 / 许可 / 依据」一行；
- 原有的三条接入口径、两条接入路径、琥珀色边界声明一条都没删。

### 3. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过 |
| `node tests/tutor-page.mjs` | 21 项全部通过（**新增 4 项**） |
| `npm test` | 十八个套件全部通过 |

新增断言：GitHub 链接的 **href 精确匹配**且带 `target="_blank"` 与 `rel` 含 `noreferrer`、
官方文档与 arXiv 两条外链都在、介绍细到可核对的外部事实（HKUDS / Apache-2.0 / agent-native /
LlamaIndex / Obsidian）、写明核对到的版本与依据（含 `__version__.py`）。

过程中旧断言「介绍讲了『是什么』：外部项目、独立进程、围绕学习对象工作」失败了一次：
我重写正文时把「围绕你选定的那个数学对象」这句删了。那句话是真的（站内适配器确实注入节点上下文），
所以**补回正文**而不是改断言——断言在这里起到的正是它该起的作用。

截图：`tmp/tutor-intro.png`。

### 4. 未落实 / 边界

- **版本号是静态文本**：升级本地检出后需要手工改这一行；没有做「读 `__version__.py` 自动显示」
  （那要求服务端去读 `.bridge-research/`，那是外部源码检出，不入站点数据边界）。
- **没写 DeepTutor 的全部功能**：只写了与「辅导」相关的定位、模式与知识引擎；
  Task Board、沉浸视频、子代理/伙伴、记忆 L1/L2/L3 等没有展开——介绍服务于「这里能做什么」，
  不是项目说明书。
- **没有做外链可用性检查**：三个链接是按检出内容写的，测试只核对 href 与安全属性，
  不联网验证可达性。
- **README 的中文版内容没有引用**：本次事实取自英文 README 与元数据文件。

## 第四十七轮：研究台改成前沿研究，维护材料迁到「网站维护」（2026-10-03）

用户的要求：**「研究台里面要是给用户进行前沿的数学研究的场所，集中公开问题和作为启发的已有工具；
把现在的研究台里面的内容迁移到一个新的页面『网站维护』；把专稿和 arXiv 论文里的内容多梳理到网站维护里面。」**

### 1. 分工拆开

| 页面 | 放什么 |
|---|---|
| **研究台** `/lab`（辅助导航里改名「前沿研究」） | **公开问题**：登记的问题节点、状态未通过的覆盖边界、未声称/仅引用的证据；**作为启发的已有工具**：方法论 21、形式语言装备 16、结构工具 24、理论工具 36（局部化算子，指回维护页） |
| **网站维护** `/maintenance` | 原研究台的全部标签（专稿覆盖 / 局部化 LC01–36 / 断言与证据 / 证明义务 / 记号与类型 / 合法本体条件 / 关系运算）＋ **新增「专稿与 arXiv」** |

研究台每一条都能点回本体里的位置：问题节点 → `/nodes/<id>`、结构工具两端 → 两个节点页、
理论工具 → 网站维护。工具计数**从 API 现算**（Method 节点数、`hasFormalStatement` 节点数、
bridge/duality/crossDomain 关系数），不写死——数据一变，页面立刻跟着变，写错会当场显形。

### 2. 专稿与 arXiv 的梳理方式：读盘，不写死

新增**只读**服务端模块 `server/maintenance.mjs` 与接口 `/api/v2/maintenance/sources`：

- **专稿分章**：17 章（`00-README` … ），标题取自分章文件名，带字节数；页面注明「标题取自分章文件名，
  与本体内登记的章节引用是两套口径」，覆盖对照仍在「专稿覆盖」标签里；
- **arXiv 投稿包**（`mcs-foundations/arxiv/`）：9 个文件、子目录、`submission-metadata.txt` 逐行、
  `references.bib` 的 5 条条目、`main.tex` 里的标题与摘要开头；
- **发布 / 验证 / 证据 / 笔记 / 版本 / 案例** 六组文档：各组文件数与总体积，列出前 12 个文件名；
- **本机参考文献**：`reference/` 下 14 份 PDF 的清单（只列名与大小，用于核对引用是否可核验）。

三条纪律写进代码并验收：**只读**（只用 readdir/stat/readFile）、**不下发绝对路径**（一律仓库相对路径，
验收专门查有没有 `C:\` 之类泄漏）、**读不到就说读不到**（目录缺失返回 `available:false` 与空清单，不编条目）。

### 3. 顺带修掉的两处

1. **节点列表接口补 `hasFormalStatement` 标记**：原来只有节点详情才有形式表达，研究台的
   「形式语言装备」筛出 **0 条**（实测）。列表接口现在给标记、不给内容（16 条 LaTeX 塞进 232 个节点的
   列表里没有意义）。
2. **`/maintenance` 路由一开始没生效**：脚本用固定缩进匹配 JSX 没命中，`/maintenance` 落到了
   通配路由（显示首页）——探针读到 `h1 = 数学认知空间 MCS` 才发现。改成按内容插入后核实。

### 4. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过 |
| `node tests/research-maintenance.mjs` | **新增 17 项**全部通过 |
| `npm test` | 十八个套件全部通过 |

验收覆盖：研究台含公开问题与工具两节、每条问题链回 `/nodes/<id>`、四类工具齐全、
**工具计数与本体现算一致**（方法论 / 形式装备 / 结构工具）、形式装备不是空集合、
结构工具两端可点、理论工具指回维护页、网站维护承接全部旧标签 + 新的「专稿与 arXiv」、
专稿分章按文件列出、arXiv 包（`main.tex` / `references.bib` / 元数据）被单独梳理、
六组文档列出、参考文献清单、**无绝对路径泄漏**、迁移后「专稿覆盖」对照表照旧可用、
侧栏两项都在辅助导航、`/research` 别名不失效、无控制台错误。
`browser.mjs` 里那三条关于 `/lab` 的旧断言也一并改成新分工（并补一条 `/maintenance` 可达）。

截图：`tmp/research.png`、`tmp/maintenance.png`。

### 5. 未落实 / 边界

- **「公开问题」的口径是「本站没做完」**：条目来自登记的问题节点、状态未通过的覆盖边界与未声称的证据，
  **不是数学界的公开问题清单**；页面上写明了这一点，但没有做「哪些是真开问题」的区分。
- **arXiv 只梳理包内材料**：`main.tex` 的标题与摘要开头、bib 条目、元数据行；**没有解析正文**，
  也没有把论文内容与本体节点对应起来（要做对应得先有稳定的锚点约定）。
- **不显示发布时间/版本**：`publication/releases` 与 `history` 只列了文件名，没有解析版本号与日期。
- **读盘接口没有缓存**：每次切到「专稿与 arXiv」都重新 readdir/stat（本机规模下无感，未测量）。
- **研究台不做研究记录**：这一页只读（不写 E），「把问题推进下去」给的是站内步骤，
  没有做笔记区或问题认领。

## 第四十六轮：开始学习页改成「先定方向，再看材料」（2026-10-03）

用户的要求：**「不要让用户一开始就学，让用户先去从大的视角选择学习的偏好，设置几个引导性的问题，
优化交互逻辑，让用户真实地感到自己在主导自己的学习。」**

### 1. 三问在前，材料在后

新组件 `web/src/components/StartChooser.tsx` 放在 `/start` 最上方，**在案例区之前**：

| 问 | 大视角的选择 | 为什么问（写在界面上） |
|---|---|---|
| ① 你现在想解决什么 | 知道自己卡在哪 / 想按顺序推进 / 先看全局 / 只想弄懂一个概念 | 目标不同，入口顺序就该不同——补缺口和看全局不该拿到同一张清单 |
| ② 你更想从哪儿进 | 按案例 / 按学科 / 按对象类型 / 按方法 / 按练习 | 同一内容从案例进、从方法进、从练习进是三种学法 |
| ③ 你希望它怎么陪你 | 一次一小步 / 一次走一段 / 先做检查点 / 先不设节奏 | 节奏决定给你的是「十五分钟能走完的一步」还是「一整段路线」 |

**交互逻辑上的四个决定**：

1. **渐进披露**：答完 ① 才出现 ②，答完 ② 才出现 ③。进入页面时只面对一个问题，
   而不是一张问卷或一屏内容（实测初始 DOM 里只有一个 `.start-question`）。
2. **选了就有后果**：答案由 `buildStartPlan()` 翻成 **2–4 个站内真实链接**（`/network`、`/plan`、
   `/nodes`、`/method`、`/profile`、`/start#angles`…），并逐条写出「为什么给你这个」。
   依据写不出来就不列——这里只做排序与取舍，不做内容推荐。
3. **随时能退**：能改（「改一改」重新展开三问且保留原选）、能一键「全部用默认」（给出保守起点）、
   原来的案例区、四组角度入口、五条「按方式」入口**一条都没删**，并加了一行
   「下面是不经引导的全部入口——想自己挑就直接往下看」。
4. **只写本机**：偏好进 `localStorage`（`mcs-start-preferences-v1`），
   界面与验收都写明**不写学习者档案 E、不改本体 M**；回访者直接看到上次结论，不必重答。

### 2. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过 |
| `node tests/start-chooser.mjs` | **新增 20 项**全部通过 |
| `npm test` | 十七个套件全部通过 |

验收覆盖：引导在案例区之前、初始只问一个问题且没有结论卡、每问都写「为什么问这个」、
当前问题被标出且选项带 `aria-pressed`、**渐进披露的顺序**（goal → entry → pace）、
三问答完收起问题并给出「你的起点」、**结论是站内真实链接**、依据与逐条理由都在、
写明「只写本机 / 不写档案 / 不设门禁」、偏好确实进 localStorage、
**整个过程零写请求**（用请求拦截核对，等于「不写 E」的直接证据）、
刷新后直接显示结论、「改一改」保留原选、「全部用默认」清空偏好并给默认起点、
原有入口全在、窄屏无横向溢出、无控制台错误。

截图：`tmp/start-chooser.png`。

### 3. 未落实 / 边界

- **没有做「按学习记录推荐偏好」**：三问的答案不会因为你的历史事件而变——本轮只做了「你说了算」。
  要让偏好与档案联动，必须先想清楚「推荐」与「主导」的边界，这是设计问题而不是实现问题。
- **偏好不参与规划**：选完只影响这一页的入口排序；`/plan` 与 `/nodes` 不会自动套用这些偏好
  （例如「一次一小步」不会真的把路线切小）。界面上没有暗示它会影响那边。
- **没有「重新显示引导」的显式入口**：清空要按「全部用默认」（会把偏好重置），
  没有一个只收起、不重置的动作。
- **默认起点是保守值**（看全局 + 按案例 + 不设节奏），没有按访客是不是第一次来做过区分。
- **没有做可用性测试**：三问的文案、选项划分、依据句式都是我按现有内容结构定的；
  实测只能证明「交互按设计走通」，不能证明「用户真的更有主导感」。

## 第四十五轮：侧栏的 DeepTutor 提示、辅导页介绍与三步引导（2026-10-03）

用户的要求：**「侧栏的辅导那里添加显眼的提示表明接入了 DeepTutor；辅导页面里添加对 DeepTutor 的介绍说明；
适当做一些引导式的视角效果。」**

### 1. 侧栏提示

「辅导」这一项右侧挂一枚**实心渐变胶囊**（`#6d28d9 → #c026d3`）+ 一枚呼吸的青色圆点，
在整列灰字里一眼跳出来；折叠成图标轨时只留那枚点，链接 `title` 仍带说明。

措辞守住证据口径：徽标只断言**「已接入」**这一件可核对的事（`DeepTutor` + `title` 里的
「本机可选入口，导通状态在辅导页按证据显示」），不断言「随时可用」，也不掺任何教学效果。

### 2. 辅导页的介绍说明

新增「关于 DeepTutor」区块（`DEEPTUTOR_INTRO`），四段内容都从**已有的集成事实**里取，不新编：

- **是什么**：外部 AI 辅导项目，独立进程、不在本站运行；本站把本体与规划器接过去；
- **三条接入口径**：同一版本体（M）、同一套规划器、模型反馈只写 E；
- **两条接入路径**：站内适配器（`server/tutor.mjs`）与桥接服务（本机 3783、带 MCP 工具与事件登记，
  是经过核查的那一套）——两条必须分别看状态；
- **边界声明**（琥珀色条）：没有测量过教学收益；「已连通」只说明进程与一次真实回环跑通了，
  不代表回答正确、不代表你掌握了；断开期间不伪造模型回复。

页标题旁加了 `DeepTutor` 品牌胶囊，状态卡补了「接入状态」标题（原来是无标题的状态块）。

### 3. 引导式视角

- **三步导览条**：看状态 → 选对象建会话 → 提问与评价，当前步实心 + 主题描边 + 投影，
  已过的打勾，未到的留白；带 `aria-current="step"` 与「跳过引导」；
- **当前步的区块被点亮**：主题色描边 + 左侧渐变导轨 + 2.8s 呼吸光。**同一时刻只点亮一个区块**
  （第一版把「关于 DeepTutor」和状态卡同时点亮了，等于没有焦点——已改）；
- **只加装饰、不改透明度**：被引导的区块与其他区块一样可读、可点，引导是视角提示而不是禁用状态
  （验收里专门断这一条：`opacity ≥ 0.99`）；
- **跳过硬性记在本机**（`mcs-tutor-guide-v1`）：刷新后不再出现。它是界面偏好，
  **不写学习者档案 E**（与侧栏折叠同类）；
- 步号写在 DOM 上（`data-guide-step`），验收直接读；步进依据是三件可核对的事：
  有会话 → 第 2 步，有回合 → 第 3 步；
- 「减少动态效果」下呼吸与徽标圆点都静止，但高亮仍在。

### 4. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过 |
| `node tests/tutor-page.mjs` | **新增 17 项**全部通过 |
| `npm test` | 十六个套件全部通过 |

验收覆盖：徽标存在且够宽、**白字对渐变底色的每个色标都达到 AA 对比度**、`title` 说明可选入口、
侧栏说明提到 DeepTutor；介绍区块含「独立进程」「数学对象」「同一版本体 / 同一套规划器 / 反馈只写 E」、
两条路径、边界三条声明；导览条三步恰好一个当前步、第一步指向「看状态」且状态卡有对应标题、
**只点亮一个区块**、被点亮区块 `opacity ≥ 0.99`（只加装饰）、可跳过且刷新后不再出现、
减少动态效果下不动、窄屏竖排且无横向溢出。

写这条对比度断言时自己踩了一次：第一版拿**白字去比页面白底**，算出 1.0 把断言判失败；
改成「白字 vs 徽标渐变底色的每一个色标」才对（现在是 4.5:1 以上的硬门槛）。

截图：`tmp/tutor-guide.png`。

### 5. 未落实 / 边界

- **引导的推进只在页内生效**：第 2、3 步要靠真的建会话/发回合才会前进，而 DeepTutor 不在测试环境里，
  所以验收只覆盖「初始停在第一步」与「跳过」两条；步进逻辑本身没有端到端跑过。
- **徽标不做连通状态**：它只说「接入」。这样侧栏不会因为 DeepTutor 没开而变色——但反过来，
  用户也不会从侧栏看出「现在能不能用」，得进页面看状态区。这是有意的（避免用界面颜色暗示可用性）。
- **引导只覆盖辅导页**：其他页面没有类似的视角引导；也没有做「按学习进度自动推荐下一步」。
- 呼吸周期 2.8s、渐变配色、徽标圆点的 2.4s 周期都是**设计取值**，靠截图与断言核对。
- 「跳过引导」是永久记忆：没有做「重新显示引导」的入口（要恢复得清 localStorage）。

## 第四十四轮：首页动画的可见性与遮挡重做（2026-10-03）

用户报错：**「背景的动画颜色浅到看不清，动画文字还被前景文字挡住了……动画里的文字要细致考虑其位置，
可以考虑在背景动画里做中心与四周之间的交互以避免烦人的遮挡。」**

### 1. 先把「浅」和「挡」量成数字

| 量 | 旧值 | 说明 |
|---|---|---|
| 图形层不透明度 | 0.5 | 再乘场景文字自己的 0.5，**有效只有 0.25** |
| 场景描边色 | `rgb(229,223,246)` | 本身就是淡紫，浅底上几乎不可见 |
| 柔光罩 | 铺满舞台的径向渐变，**中心 96% 白** | 中心恰好是动画所在，等于把动画洗掉 |
| 场景与正文列中心偏移 | **0px**（严格同心） | 必然重叠 |
| 17 条动画文字中压在正文卡上的 | **6 条**（其余幕 4 / 1 / 4 / 2） | 用户看到的「被前景文字挡住」 |

### 2. 新协议：中心留给阅读，四周留给动画

- **图形层**：不透明度 0.5 → **0.92**；场景 `saturate(1.08) contrast(1.06)` 把淡紫描边提起来
  （只动饱和度与对比度，不改色相——色相承载语义）；
- **柔光罩改成一条竖带**：宽度 `42rem + 5.2rem`、居中于正文列，峰值不透明度写在
  `--home-story-scrim-alpha`（0.9）里供测试读。**四周不再被罩住**，动画在原色下呈现；
- **图形让到一侧**：每幕整体偏移 ±24%（相邻两幕左右交替），并且**在中心与四周之间缓慢往返**
  （±5%、26s 的漂移）——图形擦过中心是短暂的、有意的遮挡，而不是长期压在文字下面；
- **动画文字拆成两层**：场景画两遍，一层只画形状（可穿过正文列，被柔光罩洗淡＝有意遮挡），
  一层只画文字，用**与舞台对齐的遮罩**把正文列那条带整条挡掉（保留区 ≤16% 与 ≥84%）。
  于 是「动画文字被前景文字压住」在几何上不可能发生；
- **每幕一个大字词**（01 现状 / 02 路径 / …）：按设计放在与图形**相对**的那一侧带里，
  字号 clamp(1.9rem, 4.4vw, 3.4rem)、颜色 `#4c1d95`（对比度 11:1），随本幕进度淡入并横向移入。
  它不是水印，是这一幕的幕名——「动画里的文字」终于有一处是稳稳读得清的；
- **正文自己有一层极浅的底**（0.72→0.42 白 + `backdrop-filter: blur(2.5px)`）：
  「适量遮挡」因此成为一条明确规则——图形可以从文字**背后**经过，文字始终落在自己的表面上；
- 层序写死并可测：图形 0 → 柔光罩 1 → 正文 2。

### 3. 过程中改掉的两条**旧断言**

它们把旧设计钉成了需求，正是这一轮要推翻的东西：

1. 「图形层在文字正后方：更宽、**同心**」→ 改成「更宽 + 让出一侧 ≥15% + 相邻两幕左右交替」；
   留着旧断言等于要求「必然重叠」。
2. 「文字后面有柔光罩（**径向渐变**）」→ 改成「一条护住正文列的竖带 + 峰值不透明度有上界（≤0.93）」；
   旧断言会把「中心 96% 白、动画被洗掉」重新锁回去。

另外补了一条**自己写坏的断言**：「与正文卡有交叠的标签都落在遮罩透明区」被写成了
`maskedHittingCopy === 0 || > 0`——恒真。改成「遮罩确实在挡东西（存在被擦掉的标签）**且**
绘制出来的标签一个都没压正文卡」。

### 4. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过 |
| `node tests/home-narrative.mjs` | 通过（新增 7 条分层/可见性断言，改写 2 条旧断言） |
| `npm test` | 十五个套件全部通过 |

新增断言：图形层 ≥0.85；每幕都有画出来的动画标签且**没有一个压在正文卡上**；
遮罩确实在挡东西；每幕大字词在四周带里（≤22% 或 ≥78%）、零交叠、对比度 ≥6:1；
柔光罩宽度 <80%、峰值 0.6–0.93；层序 0 < 1 < 2。

实测（1440×900）：每幕绘制出来的标签 7 / 4 / 5 / 4 / 1 条，**压正文卡 0 条**；
大字词对比度 11:1。截图：`tmp/home-act1.png`。

### 5. 未落实 / 边界

- **窄屏（≤1024px）只把大字词收小**，没有为窄屏重新排「四周带」——那里两侧带本就被正文挤没，
  动画文字主要靠遮罩规则保证不压正文，可读性没有专门验证。
- **遮罩保留区的 16%/84% 是设计取值**：它比正文列（实测 22%–78%）更宽，留出的余量约 115px；
  标签宽度超过这个余量时仍可能「中心在保留区、右端探进正文列」——本轮实测未出现，但没有做成硬约束。
- **场景标签被遮罩擦掉后，它与所指图形的关系就断了**（标签在正文列里、图形在外面）。
  这是「文字只在四周」这条规则的代价，如实记在这里。
- 漂移周期 26s、偏移 ±24%、竖带宽度都是**设计取值**，靠截图与断言核对，没做用户测试。
- **动画本身没有重新设计**：这一轮改的是可见性、位置与层次，五个场景的形状语言没动。

## 第四十三轮：手势加节点时的高亮不能盖住节点内容（2026-10-03）

用户报错：**「手势添加节点的时候，节点高亮的视觉效果是直接一个实心颜色遮盖住。」**

### 1. 先量，再改：两个真实缺陷

在浏览器里读计算样式（不是看代码猜），拿到两组数字：

| 量 | 实测 | 说明 |
|---|---|---|
| 源节点**标题**不透明度 | **0.1** | 旧规则 `.network-stage.is-picking .network-node-label { opacity: 0.1 }` 一刀切，把被强调节点自己的标题也擦了——于是「强调」表现为一块底色 + 一圈描边，内容全没了 |
| 源节点 ID 不透明度 | 1 | 同一条规则没管到 ID，于是标题没了、ID 还在，读起来更像「一块被盖住的色块」 |
| 悬停候选卡的呼吸环 fill | 水洗色（**实心**） | `.pick-candidate.hovered rect`（0,2,1）比 `.pick-hover-ring`（0,1,0）更具体，把只该有描边的环填成了实心，直接压住卡片文字 |
| 与源节点相连的边 | 0.1 | 和别的边一起被淡掉——候选正是从这些关系里挑出来的，等于把**选择依据**也擦了 |

### 2. 改成分层强调（不靠遮内容）

- **源节点**：极浅主题色水洗（新增 `--accent-wash: #f6f2fe`）+ 2.5px 主题色描边 + 呼吸外发光
  （`@keyframes pick-source-breathe`，0.22→0.42 的 drop-shadow 深浅变化）+ 标题换成主题深色加粗；
  **标题 / ID / 连接数一律保持满不透明**；
- **虚化只作用于非源节点**：`.network-node:not(.pick-source)` 及其三个文字类各自限定，
  再叠一层 `filter: saturate(0.35)`——用对比而不是用色块来突出；
- **悬停候选**：卡面浅水洗 + 主题色描边 + 柔和外发光 + 强度条从 5px 加粗到 7px，
  呼吸环改成「只有描边」的滚动虚线（`pick-ring-march`）；
- **与源节点相连的边**加 `.pick-incident` 类，保持 0.5 不透明度，其余边仍是 0.1；
- 两处动画都在 `prefers-reduced-motion: reduce` 下换成静止状态。

选择器本身也修了两处（都是「选择器写得比想当然更宽/更窄」）：
卡片 rect 在**内层** `<g>`（入场动画层）里，`> rect:first-of-type` 匹配不到，去掉 `>`；
悬停环要用 `rect.pick-hover-ring` 提高特异性才能压过 `.pick-candidate.hovered rect`。

### 3. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过 |
| `node tests/network-picker.mjs` | **24 项**全部通过（新增 6 项高亮视觉断言） |
| `npm test` | 十五个套件全部通过 |

新增断言（把「强调必须保留内容」写成不变量，而不是靠肉眼）：
源节点标题与 ID 满不透明、其它节点文字 ≤ 0.25、**源节点卡面相对亮度 ≥ 0.85**（浅色水洗而非饱和色块）、
悬停候选卡面同样 ≥ 0.85 且文字满不透明、**悬停环 `fill: none` 且描边 > 0**、
相连边比其它边更实（0.5 vs 0.1）。亮度用 WCAG 的相对亮度公式算，不是「看着挺浅」。

截图：`tmp/picker-highlight.png`。

### 4. 未落实 / 边界

- **没有做对比度（WCAG AA）逐项校验**：只校验了「卡面亮」与「文字不透明」，没有算
  文字色与底色的对比度比值；浅水洗底 + 主题深色字看起来够，但没量过。
- **没有色盲/弱视视角的检查**：强调靠「浅底 + 描边 + 发光 + 呼吸」四层，理论上不依赖单一通道，
  但没有实际模拟。
- 呼吸动画的时长（1.5s）与发光强度是**设计取值**，靠截图判断。
- 高亮只覆盖画布上的节点/候选；**节点列表面板、推荐面板里的同类「选中/悬停」态没有一起改**。

## 第四十二轮：给两个案例的核心内容登记硬前置关系（2026-10-03）

用户决定：**把「数学分析初步」与「微分几何」两案核心内容的关键定义性依赖登记成 `hardPrereq` 关系**
（此前全库 0 条，最高一档「核心断言」只能靠契约的 `mode=definition` 进入）。

### 1. 写了什么

| 案例 | 条数 | 主干 |
|---|---|---|
| 数学分析初步（`limit:`） | 10 | 实数距离 → 序列收敛/ε–δ 极限 → 序列式定义 → 等价桥梁；ε–δ → 连续 → 连续与极限的关系；常值序列 → 「收敛序列某项可以等于极限」 |
| 微分几何（`dg:`） | 36 | 拓扑空间 → 同胚/（拓扑）流形/紧致 → 坐标图 → 图册 → 光滑结构/光滑流形 → 切向量两种定义 → 等价性 → 坐标基 → 切丛 → 向量场/切分布/张量 → 微分形式 → 拉回、外积、d²=0 → Poincaré、Stokes；另含单位分解、光滑嵌入、反函数 → 隐函数 |

共 **46 条**，方向一律「前置 → 依赖它的对象」（与用户给的例子一致：拓扑空间 → 同胚、同胚 → 流形、坐标图 → 光滑图册）。
**只**出现在这两个案例，两端同案，无自环、无重复三元组。

每条都写了两层说明：`witness.scope`（依据出现在目标节点定义的**哪一处**）与 `scope`（这条依赖说的是什么）。
见证一律 `DEF` + `definitional-dependency`：这些是**定义材料的依赖**，不是定理，
所以不写 `PROOF`（不冒充证明）。唯一例外是「反函数定理 → 隐函数定理」，它是**推出来**的；
见证仍记 `DEF`，并且在 `scope` 里如实写明「依据是两处定理陈述与站内推导文本，尚未编码成证书」。

### 2. 规则层同步改了一处（否则新关系会被画得比契约还轻）

`hardPrereq` 的 DEF 见证原本要乘 0.82 的折扣 → 渲染权重 0.82，而定义性前置契约是 0.9：
**一条显式登记的「不满足就不成立」会比从行动接口推出来的契约还轻**，最高一档里依旧只看得到契约。
新增 `witnessFactorOf(kind, status)`：只对 `hardPrereq + DEF` 取消折扣（权重 1.0 → 最高档、线宽 5.06px），
其它种类、其它见证照旧打折，并在代码里写清为什么。
`assertHierarchyHolds()` 增加**不变量 D**：以定义为见证的硬前置必须 ≥ 定义性前置，且必须落在 `core` 档——
以后再动权重表也不会把关系一侧悄悄压回去。

### 3. 顺带修掉一条脆弱的断言

`tests/browser.mjs` 的「强关系两端比弱关系更近」原来是**挑两个具体点对**比距离
（切向量两种定义 vs 拓扑空间–微分形式）。加了 46 条硬边之后它失败了：
不是吸力反了，而是**单个点对的距离会被邻域拉扯**——那两个切向量节点各自多了强邻居，彼此被拉远；
而「弱」的那一对因为整簇更紧凑反而更近。
改成**全体边按视觉权重分档比中位距离**（核心档 / 强档 / 弱档），阈值与 `relation-visual.ts` 的 `tierOf` 一致：
仍然是「按权重分配吸力」这句话，但每条边都参与、不再依赖两个点对的运气。
实测中位距离：核心档 275、弱档 352。

### 4. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run check` | 通过（doctor 全绿） |
| `node tests/hard-prereq.mjs` | **新增 8 项**全部通过 |
| `node tests/network-edges.mjs` | 19 项（新增 2 项：视图里出现硬前置且落在最高档、不比起定义性前置细） |
| `npm test` | 十五个套件全部通过 |

数据层断言：条数 ≥40（实测 46）、**只出现在 `limit`/`dg` 两个案例**、端点都在本体里、非自环、
见证都是 `DEF` + `definitional-dependency` 且写了依据、无重复同向三元组、
`hardPrereq + DEF` 的渲染权重为 1.0 且 tier 为 `core`、不变量 D 成立。
浏览器层：8 节点 24 条边的视图里 **10 条硬前置全部落在「核心断言」**（权重 1.0、线宽 5.06px）。

本体版本已更新；站点服务已重启加载新本体。截图：`tmp/hard-prereq.png`。

### 5. 未落实 / 边界

- **其余案例（流形、张量、群、Rudin 背景等）一条都没写**：本轮按用户要求只覆盖两个案例的核心，
  这些案例里「必须先有」的关系仍只隐含在契约的 `mode=definition` 里。
- **只写「定义材料」这一类依赖**：同一条链上还有「证明依赖」（例如某定理论证时用到另一条定理），
  那类依赖若也要显式登记，见证应是 `PROOF` 并指向证据条目——本轮没做。
- **反函数 → 隐函数那条是推导依赖**，与其余 45 条不同类，混在同一批 `DEF` 见证里；
  它已在 scope 里注明，但从数据上看不出区别（没有单独的 witness.type 区分）。
- **46 条是我按定义文本逐条写的**，不是从笔记正文自动抽取的；每条的 `scope` 都指名了依据位置，
  但**没有逐条人工复核过**（写完之后靠 doctor 与不变量校验，属于结构性检查，不是数学复核）。

## 第四十一轮：强关联选择器由右键长按改为左键长按（2026-10-03）

用户要求：**网络视图中那个长按移动光标增加节点的方式改为左键触发。**

### 1. 左键现在有三个含义，靠**位移**分开而不是只看时间

| 手势 | 结果 |
|---|---|
| 按住不动 ≥ `PICK_HOLD_MS`（250ms） | 打开强关联选择器（强调该节点、虚化其它、周围摊开候选卡） |
| 位移超过 4px | 进入拖动；**长按计时立刻作废**（拖到一半不会突然弹选择器） |
| 不到阈值就松手 | 点击 → 打开节点详情（旧行为） |
| 右键点一下 | 移出视图（旧行为，保留） |

长按选择器挪到左键之后，右键只剩「移出视图」一个含义，于是 `onNodeRightPress` 里的计时器与
「长按还是轻点」的分支都删掉了——少一个分支就少一处会出错的状态。

### 2. 改手势暴露出的一个真问题（原来被「右键没有指针捕获」掩盖了）

左键按下会 `setPointerCapture`（拖动需要），而 `onNodePointerMove` 里有 `stopPropagation`。
选择器打开后，**悬停判定挂在 window 上**，事件被 `stopPropagation` 拦在源节点就到不了 window，
候选高亮因此失效（实测 `pick-candidate` 没有 `hovered` 类、也没有 hover 环）。
两步修掉：选择器打开时**主动释放指针捕获**；`onNodePointerMove` 在 `pickerRef.current` 存在时
**直接返回且不拦截事件**。这正是「右键那版为什么没这个问题」的原因——右键路径从来不做捕获。

### 3. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node tests/network-picker.mjs` | **18 项**全部通过（原 14 项 + 新增 4 项） |
| `npm test` | 十四个套件全部通过 |

新增断言：**左键拖动优先于长按**（拖过阈值后继续按住 500ms 也不弹选择器，且节点确实移动、
不误开详情面板）、**左键短按仍打开详情面板**、右键点一下仍是移出视图、悬停高亮仍然生效。

三处文案同步改掉：节点 `<title>`（「左键按住看强关联节点 · 右键移出视图」）、
选择器提示条（「按住左键 —— 把鼠标移到要加入的节点上…」）、底部图例
（「拖动空白处平移 · 滚轮缩放 · 按住左键看强关联 · 右键移出节点」）。

### 4. 未落实 / 边界

- **触屏没有区分长按与拖动的手感验证**：`event.button === 0` 对触摸也成立，因此触摸长按会走同一路径，
  但手指按住的抖动比鼠标大，4px 阈值在触屏上可能偏紧；本轮只测了鼠标。
- **长按阈值 250ms 与位移阈值 4px 是设计取值**，靠测试与手感判断，没有做可用性测试。
- 左键长按期间若用户想平移画布，必须先松手（空白处拖动才平移）；节点上按住不动只开选择器。

## 第四十轮：加入新节点后相机平滑居中到它（2026-10-03）

用户要求：**加入一个新的节点之后，视角要平滑地转移到以新增节点为中心的视图。**

### 1. 做法

- 新增 `centerOnNode(id)`：把该节点的中心挪到**可用区中心**（顶栏 64px 之下、回放控制台之上，
  与 `fitView` 用同一套中心算法），**保持当前缩放**；
- 新增 `animateCamera(target, 460ms)`：rAF 补间 + ease-out cubic，每帧 `clampCamera` 后写相机状态；
- **结构变化的两种走法**：节点数增加 → 居中到新节点；其余（删节点、切边源、回放）→ `fitView` 适配整张图。
  删节点时没有「新节点」可居中，回放时相机要负责让整条路线可见，那两种情况仍是 fitView 的职责；
- **用户一动就取消**：滚轮（`zoomAt`）、拖动空白（`onCanvasPointerDown`）都立刻停掉动画——
  「相机自己在动、手却拖不动」是最难受的一种手感；
- **尊重「减少动态效果」**：`prefers-reduced-motion: reduce` 下直接跳到目标，不做补间。

为什么不用 CSS transition：相机是 React 状态，拖动与滚轮会直接写它；过渡进行中用户一拖，
落点会由插值决定而不是指针位置。

### 2. 过程中修掉的三个问题（两个是时序）

1. **`freshIds` 的更新顺序不保证**：它来自另一个 effect 维护的 `justAdded`，第二次加节点时
   读到的还是上一次的 id，相机于是跑去居中**旧节点**（实测 `centered` 没变、新节点停在 [1122,407]）。
   改为在相机 effect 里用**自己的**「上次见过的集合」做差集，顺序上不可能错。
2. **调试记录被覆盖**：`finished` / `cancelled` 用新对象整体替换 `__mcsCameraLast`，
   动画一结束「居中到哪个节点」就丢了（验收读不到）。改成合并字段写入。
3. **测试在动画期间点不动复选框**：相机每帧重渲染整页，Playwright 等「元素稳定」等到超时；
   加 `force` 又会因为重渲染把勾选状态冲掉（报 `Clicking the checkbox did not change its state`）。
   最终改为在页面里派发原生 `click`（React 照样收到 onChange，且不必等稳定性）。

另外，把「相机动画块」从一个位置搬到另一个位置时，我的脚本切片顺序写反（`slice(end)` 的 end 在 start 之前），
把中间一大段代码**复制成了两份**。靠 `tsc` 的 `Cannot redeclare` 报错发现，按行号精确切除一份并补回被切掉的
注释开头后恢复。教训记在这里：搬代码要用「先算区间、断言 start < end」的方式，不能先切片再检查。

### 3. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node tests/network-camera.mjs` | **新增 8 项**全部通过 |
| `npm test` | 十四个套件全部通过 |

新套件的断言：页面记录「居中到哪个新节点」、**动画结束后新节点落在可用区中心 ≤30px**、
**途中采样严格落在起点与终点之间**（不是一步跳过去）、动画计数增加、
**每加一个节点都居中到那一个**（不是只居中第一次）、用户滚轮后动画被取消、
「减少动态效果」下 160ms 内已就位、无控制台错误。

实测的平滑轨迹（新节点屏幕中心，目标 [829,499]）：
`[1309,226] → [1090,351] → [941,435] → [867,477] → [835,496] → [829,499]`。

### 4. 未落实 / 边界

- **缩放不变**：居中只平移，不放大。若新节点离得很远，虽然会平滑过去，但比例可能偏小；
  要不要在远距离时顺带放大一档，是产品判断，本轮没做。
- **一次加多个节点只居中最后一个**（按 id 排序取末位）：批量导入时不会把视角挪到「多个新节点的中心」。
- 补间时长 460ms、缓动 ease-out cubic、中心留白 64px 都是**设计取值**，靠截图与采样核对，没做用户测试。
- 相机动画期间每帧重渲染整页：节点上百时会有可感的开销（本轮视图规模下未测量）。

### 4. 顺带修掉的两处测试竞态（都是新行为带出来的）

相机动画每帧重渲染整页，于是两处旧写法集体失效：

- **Playwright 的 `check()`**：等「元素稳定」会一直超时；加 `force` 又会被下一帧重渲染把勾选冲掉
  （`Clicking the checkbox did not change its state`）。「自动摆位」与「相机居中」两套都改为
  在页面里派发**原生 click**（React 照样收到 onChange，且不必等稳定性）。
- **右键选择器套件的「落点」断言**：原本比**屏幕坐标**（松手前后各量一次），而相机现在会在加节点后移动，
  两次量的不是同一个坐标系 → 改成比**世界坐标**（候选卡的 `transform` vs `__mcsPlacementInfo.placed`），
  实测落点 = 候选位置 + (30, 3)，正是 `PICK_CARD_W/2 − NODE_W/2` 与 `PICK_CARD_H/2 − NODE_H/2`。

### 5. 未落实 / 边界

- **缩放不变**：居中只平移，不放大。若新节点离得很远，虽然会平滑过去，但比例可能偏小；
- **一次加多个节点只居中最后一个**（按 id 排序取末位）：批量导入时不会把视角挪到「多个新节点的中心」；
- 补间时长 460ms、缓动 ease-out cubic、中心留白 64px 都是**设计取值**，靠截图与采样核对，没做用户测试；
- 相机动画期间每帧重渲染整页：节点上百时会有可感的开销（本轮视图规模下未测量）。

## 第三十九轮：绕不开的关系改走弧线（2026-10-03）

用户要求：**给那些实在绕不开的关系设置弧线策略，减少遮挡的影响。**

### 1. 「绕不开」被拆成三种可判定的情形（不做感觉判断）

新模块 `web/src/edge-routing.ts`（叶子模块，可单测）只在这三种情况下给边一个弓高，其余**保持直线**：

| 情形 | 判据 | 处理 |
|---|---|---|
| **平行边** | 同一对节点（无序）之间有多条边——直线必然完全重合 | 一组对称弓高（n=3 → −18 / 0 / +18，中间那条保持直线），并**沿卡片边缘散开进出锚点** |
| **穿卡** | 直线段在 t∈[0.15, 0.85] 区间内压住第三张卡片 | 弯到最近的一侧：所需弓高 ≈ 卡片中心到直线的横向距离 + 该方向半宽 + 留白，上限 96px |
| **共线重叠** | 与前面的边夹角 |cos| ≥ 0.97 且中点横向距离 < 10px | 往离对方更远的一侧挪，挪完复验，最多八次 |

渲染：`<line>` 改成 `<path d="M … Q …">`（直线也走 path，统一几何），标签放到曲线顶点
（二次贝塞尔在 t=0.5 处，顶点偏移 = 控制点偏移的一半），生成动画的路径长度按弓高做二阶修正。

### 2. 过程中被测试抓出来的两个真问题

1. **同一对节点的两条边拿到相同弓高**（实测 `[18, 0, 18]`，两条仍重合）：弓高是沿**这条边自己的法线**
   量的，而同一对节点的边可能一条写成 A→B、另一条写成 B→A，法线方向相反；各按自己的方向翻符号后，
   两个**不同的**对称值落到了**同一侧**。修法是取组内参考法线，把每条的弓高统一折算到同一个世界侧。
2. **平行边的锚点挤成一个点**：同组边共用卡片中点作为锚点，三条弧线在卡片边缘叠在一起，
   箭头也叠在一起——比直线更乱。现在按序号沿卡片边缘散开（水平进出挪 y、竖直进出挪 x），
   实测三组平行边的进出端点两两不同。

还有一处是**测试自己的前提错了**：共线重叠那条用例原本用卡片错开 20px 构造，
而卡片锚点天然会把两条线错开一个卡高，根本触发不了规则。改成直接给两条相距 4px 的线段。

### 3. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node --test tests/edge-routing.test.mjs` | **新增 6 项**全部通过 |
| `node tests/network-edges.mjs` | **新增 5 项**（原 12 项继续通过） |
| `npm test` | 十三个套件全部通过 |

单元测试：平行边得到互不相同的对称弓高且中点两两分开 ≥10px、穿卡的边弯后**不再压卡**
（沿曲线采样核对）、无冲突的边 bow 恒为 0、共线重叠被分开、弓高有上限且确定性、
曲线几何（顶点偏移 = 弓高 = 控制点偏移的一半）。
浏览器测试：平行边弓高互不相同、**有弧线也有直线**、页面能读到弧线统计、曲线确有 `Q` 指令、
**平行边锚点两两不同**、**所有边（直线与曲线）都不从别的卡片上穿过**。

实测一次（5 节点 12 条边）：`parallel 11, throughCard 0, overlapping 3, straight 3`。
截图：`tmp/edges-arced-2.png`（三组平行边各自扇形展开）。

### 4. 未落实 / 边界

- **穿卡那一档没有在真实数据里触发过**（实测 throughCard = 0）：本轮视图的节点间距都不覆盖卡片，
  它是按几何写出来的规则、由单元测试覆盖；真实场景要等布局更密（或用户手工把卡片拖到一起）才用得上。
- **弧线只处理两两关系**：一条边最多让开一张最苛刻的卡片，不做「连续绕开三张卡」的路径规划；
  多张卡同时挡路时取最苛刻的那张，可能仍擦过另一张。
- **共线重叠是有序贪心**（与前面的边比对一次，最多挪八步）：这是为了确定性，不是全局最优；
  极端情况下三条以上共线边可能仍有轻微重叠。
- 弓高上限 96px、平行间距 18px、锚点散开 14.4px、重叠容差 10px 都是**设计取值**，靠单测与截图核对。

### 4. 顺带修掉的测试可靠性问题

批量跑时「自动摆位」套件偶发失败、单跑却通过：原因是它用**固定 sleep**（勾选后等 320ms）等布局落地，
机器负载高时不够。已改成轮询画布节点数（`waitForCount`）。这类偶发失败比断言失败更值得修——
它会让人怀疑被测代码，而实际上是测试自己不稳。

## 第三十八轮：边的颜色按关系类型、遮挡按逻辑强弱（2026-10-03）

用户报错：**「全都是大黑箭头丑死了，根据关系类型设计颜色，考虑到颜色饱和度等做视觉优化，
根据逻辑强弱设计遮挡关系。」**

### 1. 先把「黑箭头」当缺陷查，而不是当配色问题

只读渲染结果（`/network?nodes=…` 之后量 DOM）之后，根因有两层，**都是实现错误**：

1. 三个共享 `<marker>` 里的 `<path>` **没写 `fill`** → 继承 SVG 默认填充 = **纯黑**。
   线的颜色再讲究，箭头永远是黑的；
2. `markerUnits` 默认按 `strokeWidth` 缩放 → 定义性前置的线宽 4.97px × 9 单位箭头 ≈ **45px 的大三角**。
   这就是「大黑箭头」。

修法：**一种颜色一个 marker**（颜色 + 层级决定 id，`fill` 显式给出，验收断言 id 里带着自己的颜色），
尺寸改用 `markerUnits="userSpaceOnUse"` 固定像素（核心/强 13、结构性关系 10.5、骨架 8.5），
箭头形状也略瘦一点（`M 0.6 1.1 L 9.4 5 L 0.6 8.9 z`）。

### 2. 颜色按关系类型分两路

| 维度 | 旧 | 新 |
|---|---|---|
| 语义关系 | 按 `kind` 有色，但 `specialization` 与 `hardPrereq` 色相只差 5°、`analogy` 与 `hardGeneralization` 差 5° | 重挑：色相同族内间隔 ≥8°，明度落在 0.2–0.6，饱和度 ≥0.25（`analogy` 是**故意的中性灰**，单独豁免） |
| 行动契约 | **全部共用中性灰**（`THEME.contractEdge`）——而契约是全库最多的一类边（386 条），于是画布上绝大多数线是同一团灰 | 按 `mode` 上色（`CONTRACT_MODE_COLOR`）：定义性前置紫、推导前置蓝、构造输入青、方法输入墨绿、任务输入琥珀、证据输入深棕、表征输入玫红 |
| 饱和度 | 语义边统一提 1.55 档（契约也一样，于是定义性前置变成电紫，而它全库有 85 条） | 分层：**语义关系 1.5、语义契约 1.2、结构骨架 1.0**——契约数量多，再往上提会把整块画布染成一种颜色，它的「硬」由线宽与实线表达 |

条款面板（「关系可视化条款」）里契约 mode 的色块改用同一函数取色，图例与画布一一对应。

### 3. 遮挡按逻辑强弱（这里原来有一句假话）

旧代码算了 `const order = tier === 'ambient' ? 0 : …`，注释写着「硬关系压在软关系上面」，
但 `order` **只被写进 `<desc>`，从未参与排序**——画序就是数组顺序，等于没有遮挡规则。

现在按**视觉权重升序**排序后渲染（同权重按 id 稳定）：最强的边最后画、压在最上面；
**与选中节点相连的边**再提到最后（选中了却看不清它连着谁，是更实际的痛点）。
同时补 `data-from` / `data-to`，验收才能精确判定「末尾那几条是不是相连的边」。

### 4. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node --test tests/relation-visual.test.mjs` | **10 项**（新增 3 项：颜色齐全不撞色、明度区间、饱和度分层） |
| `node tests/network-edges.mjs` | **新增 12 项**全部通过 |
| `npm test` | 十三个套件全部通过 |

新断言：没有黑色箭头、箭头颜色与边一致（id 自证）、箭头 `userSpaceOnUse` 且 ≤16px、
不同 kind / mode 颜色互不相同、整张画布 ≥3 种边色、**画序按权重升序**、
最弱先画最强最后画、**选中节点后相连的边压到最上面**、无色觉相关的控制台错误。
调色板侧另有：种类齐全、颜色不重复、**同族色相 ≥8°**、明度 0.2–0.6、饱和度 ≥0.25（`analogy` 豁免）、
饱和度分层（关系 ≥ 语义契约 ≥ 结构骨架）。

实测（8 节点 15 条边）：5 种边色、5 个 marker、**黑箭头 0 个**、marker 与边颜色不匹配 0 个、
最大箭头 13px、画序严格升序。

截图：`tmp/edges-colored-2.png`。

### 5. 未落实 / 边界

- **色相间距规则分两层**：同族（关系 vs 关系、契约 vs 契约）要求 ≥8°，**跨族允许接近甚至同色**——
  关系与契约已经由线型、线宽、标签与图例分开，把 15 种颜色强行塞进 360° 只会让每个色相都失去名字。
  这是设计判断，不是可证的性质。
- **没有做色盲友好的校验**（没有模拟 deuteranopia/protanopia 检查这 15 色是否仍可区分）。
  红绿色盲下 `crossDomain`（绿 161°）与 `duality`（玫红 333°）之类仍可分辨，但 `bridge`（橙 21°）
  与 `application`（琥珀 32°）只差 11°，需要时应当加线型或标签冗余。
- 饱和度分层（1.5 / 1.2 / 1.0）与箭头三档尺寸是**设计取值**，靠截图与断言核对，没有做用户测试。
- 边仍是**直线**，「擦着卡片过去」不算交错（与上一轮的放置算法同一口径）。

## 第三十七轮：新增节点时的自动摆位（不重叠 + 少交错）（2026-10-03）

用户要求：**往知识网络里添加节点时自动做视觉优化，选合适的位置把新节点放进去，
使新节点不与原有节点重叠，新增的关系尽可能少与已有关系交错。**

### 1. 为什么不能沿用原来的做法

原来每次改变已加入集合都会重跑 `layout()`——**全局力导向**。它有三个不合要求的地方：

1. 加一个节点会把整张网络重排一遍（用户要的是「放进去」，不是「重排」）；
2. 它靠弹簧力近似避让，**不保证**与手动摆放（`overrides`）的节点不重叠——手动位置是在布局之后才贴上去的；
3. 它不显式地数「新边与旧边交叉了几次」，而交叉正是用户点名的指标。

### 2. 新做法：增量摆位（`web/src/node-placement.ts`）

- **已有节点一个都不动**（手动位置 > 上次的自动摆位 > 本次新算，三级优先）；
- 新节点的候选位置 = **邻居质心**周围的极坐标网格（7 个半径 × 24 个方位，含半径 0 的质心本身），
  方位相位由节点 id 派生——**确定性，不用随机数**；
- **硬约束**：与任何已摆卡片不得重叠（水平 172+24px、垂直 58+16px），且不越出左上留白；
- **软目标打分**：`交叉数 × 4000 + 新边总长 × 1 + 离质心位移 × 0.6`。交叉的权重远大于边长与位移：
  宁可连边略长，也不要与已有关系缠在一起；
- **度数高的新节点先放**：枢纽先落位，其邻居随后能贴着它摆；
- 极端情况下（候选全被拒绝）退化为绕质心的螺线搜索，再不行就放到已有卡片右侧扩展出去——**任何情况都不重叠**。

交叉只数**真交叉**：真穿越算、共线重叠算、端点相碰（T 形相接、共享端点）**不算**——
共享端点的两条边只是「接上」，把它算成交错会让指标失真。

放置结果缓存在 `mcs-network-placements-v1`（与手动位置 `mcs-network-positions-v1` 分开）：
已摆好的节点下次直接沿用，移出视图的条目顺手清掉（一个被移出再加回来的节点如果沿用旧坐标，
那个位置可能已经被后来的节点占了）。

### 3. 过程中修掉的三个真问题

1. **候选环把质心排除在外**：第一版半径从 1.6 倍卡宽起步，于是「就放在两个邻居中间」这个
   往往交叉最少的自然位置从不被考虑——单测里优化后的交叉数（2）反而多于朴素摆放（1）。
   加上半径 0（质心本身）与 0.45 倍半径后恢复正常。
2. **渲染期写状态**：摆位结果一开始是在 `useMemo` 里直接 `setState` + 写 localStorage 的，
   这违反 React 的渲染纯度要求。改为把结果放进 ref，由 `useEffect` 落盘（渲染期不写状态）。
3. **统计只在「刚优化」那一帧存在**：加完节点后的下一次渲染里 `pending` 已经空了，
   验收读不到交叉数。改为在页面上保留「最近一次优化」的记录（`__mcsPlacementInfo.last`），
   调试时也能回答「它当时怎么选的」。

### 4. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `npm run check` | 通过 |
| `node --test tests/node-placement.test.mjs` | **新增 8 项**全部通过 |
| `node tests/network-placement.mjs` | **新增 12 项**全部通过 |
| `npm test` | 十二个套件全部通过 |

**单元测试**（算法层，喂真实几何）：真交叉/共线/相接三种判定、交叉计数跳过共享端点、
5 个新节点连续摆放后零重叠且不越界、**优化后的交叉数不多于「放在邻居质心」**、
同输入同输出（确定性）、枢纽先落位（相连的新节点挨在一起 <400px）、空图/孤立节点、
20 张卡片铺满时的兜底路径仍然不重叠。

**浏览器测试**（真实页面）：先铺 4 个节点作基线 → 再加 3 个走增量摆位（有统计）→
**零重叠**、最小间隙非负、交叉数不多于新节点数、**原有节点一个都没动** → 再加 2 个仍不重叠且都不动 →
**同一 URL 重新加载得到同一套坐标** → 手动拖动一个节点后再加节点，**它保持不动**且仍不重叠。

实测一次（8 个节点，`__mcsPlacementInfo.last`）：`crossings 0, minGap 19px, rejected 107`。

截图：`tmp/placement-before.png`（5 个）、`tmp/placement-after.png`（8 个，无重叠）。

### 5. 未落实 / 边界

- **浏览器测试里那 8 个节点恰好都是未连接的背景节点**（列表前几个就是它们），
  所以「减少交错」这一半在浏览器里只是平凡通过；**真几何的交叉优化由单元测试覆盖**（含构造出来的密集交叉场面）。
  要让浏览器测试也覆盖，需要按关系挑节点（例如从「流形」出发加两个邻居），本轮没做。
- **没有「重新布局」按钮**：一旦摆好，位置就固定（除非拖动或换 URL）。
  「重置」仍然只是把整张网络适配进可见区（README 里的既有定义），不清自动摆位；
  想重排只能清空画布或清 localStorage。这一点界面上没有说明。
- 软目标的权重（交叉 4000 / 边长 1 / 位移 0.6）是**设计取值**，靠单测里的构造场面核对，
  没有做用户手感测试。
- 交叉判定按**直线段**算，而画布上的边是直线 ✓ 一致；但卡片是有面积的矩形，
  边从卡片中心连出，因此「擦着卡片过去」的边不会被计入交错（只算线线交叉）。

## 第三十六轮：给重要节点刻上形式语言的表达（2026-10-03）

用户要求：**挑选出来已有的重要的节点，把形式语言的表达刻进去。**

### 1. 挑选依据（不是「重要的都写了」）

1. 按本体里的**关联度**排序（登记关系 + 行动契约参与次数）——`group:group-concept` 13、`bg:linear:vector` 13、
   `dg:smooth-manifold` 13、`limit:limit-ed` 10…；
2. 补上四个案例（极限 / 流形 / 张量 / 群）的**概念核心**；
3. 只保留**能写出无争议形式陈述**的节点：12 条定义 + 1 条教材陈述（实数最小上界性），
   外加 3 条拓扑/代数核心。

最后登记 **16 个节点**（`data/formal-statements.mjs`）：
`limit:limit-ed`、`limit:seq-conv`、`rudin:continuous-function`、`rudin:metric-space`、`rudin:compact-set`、
`rudin:least-upper-bound`、`dg:manifold`、`dg:topological-manifold`、`dg:homeomorphism`、`dg:coordinate-chart`、
`dg:smooth-manifold`、`dg:smooth-atlas`、`dg:differential-form`、`tensor:tensor-rs`、`group:group-concept`、
`bg:linear:vector`。

**其余 216 个节点保持 `formalStatement: null`**——方法、误区、证明与练习类对象的形式内容是步骤与失效条件，
硬套一个公式等于编造；页面也不为它们留「暂无」占位。

### 2. 数据结构与分工

新增字段 `formalStatement = { tex, reading, notation[], label, note }`：

| 字段 | 内容 | 纪律 |
|---|---|---|
| `tex` | 纯 LaTeX，**不含 `$` 定界符** | 写进 `authoring.mjs` 的 `formalStatement()` 里校验，含 `$` 直接报错（否则 KaTeX 会解析失败，纯文本上下文还会露出裸美元号） |
| `reading` | 把符号读回中文 | 纯文本上下文，页面走 `plainMathText`（`R^n` → `Rⁿ`） |
| `notation` | 每个符号是什么 | 至少两条；不写「显然」 |
| `label` | 证据状态 | 必须是 `DEF/PROOF/REF/FINITE/ILLUSTRATION/NOT-CLAIMED` 之一，否则登记时就抛错 |
| `note` | 条件次序、与相邻节点的差别、未证明的部分 | Markdown 上下文 |

与既有的 `formal`（形式**负载**：theory / type / symbols / boundary）**分开**：那是喂形成检查器的元数据，
这是给人读的陈述。集中成一份表而不是散在各案例文件里，因为挑选是一次编辑决定，要能一眼看清挑了哪些、
没挑哪些，也便于测试整体遍历。

### 3. 内容上的一条硬纪律（本轮最值得记的）

`dg:manifold` 按本站已登记的措辞是「Hausdorff + 局部欧氏」，**不含第二可数**；而 `dg:smooth-manifold`
那一版另加第二可数。两份陈述因此写得不一模一样，差别写进 `note`：

> 本站这一条按「Hausdorff + 局部欧氏」登记，**不含第二可数**；`dg:smooth-manifold` 那一版另加第二可数与光滑图册。
> 两者不是同一条定义的繁简，是两份不同的登记，差别写在这里而不是悄悄统一。

测试里有两条断言专门钉这件事（`dg:manifold` 的 tex **不得**出现 second countable，`dg:smooth-manifold` **必须**出现），
防止以后有人把两者「统一」成更常见的那一种而与本体的登记冲突。

### 4. 渲染：一行公式被切掉，改成在语义连接处断行

第一版把整条公式塞在一行里：卡片 516px，而 `dg:manifold` 的公式 752px、`limit:limit-ed` 590px——
右半截被切掉，只能横向拖。**「形式表达」是这一段最该一眼读完的东西，被截断就失去意义。**
修法是在语义连接处（⟺ 之后、公理之间、定义与维数之间、覆盖条件与相容条件之间）插入 `\\[4pt]` 断行，
而不是缩小字号。实测后 16 条在 1280 宽下全部完整可见。

顺带记两个**测量陷阱**（都会让测试假通过/假失败）：

1. 量溢出要量 **KaTeX 自己的 `.katex-display`**（`overflow-x: auto` 在它身上）。量外层容器会永远得到「没溢出」——第一版就是这么假通过的。
2. 读「可见文本」要**先删掉 MathML 的 `<annotation>`**：那里故意保留 LaTeX 源码（无障碍与复制用，屏幕上看不见），不删就会把 `\forall` 当成「LaTeX 没渲染」。

另外 `$$…$$` 必须**独占一行**才是行间公式：夹在文本里会被 micromark 当成行内公式，渲染成挤在一行的小字号（实测）。

### 5. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `npm run check` | 通过（本体哈希变化、216+16 节点形成检查全过） |
| `node tests/formal-statements.mjs` | **新增 19 项**全部通过 |
| `npm test` | 十一个套件全部通过 |

新套件的断言：16 个节点都登记了、tex 非空且无 `$`、都有中文读法与 ≥2 条记号、标签合法、
**未登记的节点保持 null**（抽查 12 个 + 计数 >200）、两条流形陈述的差别、
页面有「形式表达」块与标签、**按行间公式排版**（`.katex-display` ≥1）、可见文本是排好版的公式、
LaTeX 源码只留在 annotation 里、中文读法与记号表都在、跨案例四条也能渲染、
未登记节点不出这一块、手机无横向溢出、**桌面 16 条公式都完整可见**。

本体版本：`sha256:8c1c857d170ff5248a75ec944e60d54754b97bdff80561b859cb7198e0747520`（含新增字段）。
站点服务已按新本体重启（旧进程内存里是旧本体，改 M 内容必须重启才生效）。

截图：`tmp/formal-limit.png`（ε–δ）、`tmp/formal-manifold.png`（流形 + 两份登记的差别）、`tmp/formal-vector.png`。

### 6. 未落实 / 边界

- **只登记了 16 个节点**：其余 216 个仍是 `null`。挑选规则写在 `data/formal-statements.mjs` 的注释里，
  但「哪些该补」没有客观标准，是编辑判断。
- **`tex` 是本站自己写的陈述**：`label: DEF` 表示这是定义（按节点正文的口径），
  `REF` 表示只是按教材陈述（`rudin:least-upper-bound`、`rudin:compact-set` 两条）；
  **没有任何一条经过机器证明**，页面也没有这样声称。
- `rudin` 案例的节点本身 `contentRef: false`（正文尚未撰写），所以那几条形式陈述目前是页面上唯一的数学内容；
  正文补写后需要回头核对两者是否一致。
- 没有做「公式复制为 LaTeX」的按钮，也没有 MathJax 式的右键菜单；KaTeX 的 MathML annotation 已经可供读屏与复制。

## 第三十五轮：侧栏品牌位重做成「一眼看出能点」的入口（2026-10-03）

用户要求：**把侧栏上面首页的入口做好视觉优化，让人一眼看见就知道「数学认知空间」是个可以点击的按钮，不是文本。**

### 1. 改法（把按钮的样子做出来，而不是加一句说明）

| 项 | 旧 | 新 |
|---|---|---|
| 面板 | 无（纯文字 + 图片，只有 hover 变一下标题颜色） | 边框 + 底色 + 14px 圆角 + 轻投影，悬停抬升 1px 并加深、按下回落、手型光标 |
| 显式标签 | 无 | 实心紫色**「⌂ 首页 ›」胶囊**（渐变底 + 房子图标 + 悬停右移的箭头） |
| 键盘 | `:focus-visible` 描边（已有） | 保留，并实测：**重新加载后 Tab 一下就到它**（整页第一个停留点） |
| 折叠态（84px） | 只剩字标 | 胶囊退成**实心图标按钮**（仍是胶囊），字标 54px——可点性不因变窄而消失 |
| 手机（≤860px） | 竖排，占高约 150px | **压成一行**（胶囊 + 92px 字标 + 站名），副标题让位，头部约 69px |

### 2. 过程中修掉的一个真副作用

品牌面板变高后，**手机首屏被推下去了**：`tests/node-list.mjs` 的「手机首屏就能看到第一张卡」
立刻变红（390×844 下第一张卡从首屏内掉到 807px）。这说明那条断言是有用的——它挡住了一次
「为了桌面好看而牺牲手机」的改动。修法是窄屏改单行布局，而不是放宽断言。

### 3. 新增断言（`tests/browser.mjs`，6 项）

品牌位是 `<a href="/">` 且可访问名含「首页」；有按钮面板（圆角 ≥10px、边框 ≥1px、底色不透明、`cursor: pointer`）；
有显式「首页」胶囊（文本 + 实心底 + 房子图标 + 宽度 >20px）；**悬停有可量的变化**（底色/边框/位移三者之一）；
**刚打开页面时 Tab 一下就到品牌位且有可见描边**；点击后 `pathname === '/'` 且五幕叙事挂载。

三条**测试自身的坑**也记在这里（每一个都会把真事测成假失败）：

1. 不能用 `element.focus()` 测 `:focus-visible`——程序化聚焦不满足该启发式，量出来永远是 `none`；
2. Chrome 会记住上一次的「顺序聚焦起点」，直接按 Tab 会从文档中后段继续（实测落到 `nav-item`）；
3. `blur()` 只把 `activeElement` 变回 `body`，**不重置那个起点**——所以键盘断言前要重新加载页面。

### 4. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node tests/browser.mjs` | 通过（新增 6 项） |
| `node tests/node-list.mjs` | 通过（手机首屏那条恢复绿色） |
| `npm test` | 十个套件全部通过 |

截图：`tmp/brand-rest.png`（静止）、`tmp/brand-hover.png`（悬停）、`tmp/brand-phone.png`（手机单行）。

### 5. 未落实 / 边界

- **没有做真实用户测试**：「一眼看出能点」是设计判断，靠截图与断言核对，没有测量点击率或识别率。
- 悬停效果在触屏上不存在（没有 hover）；手机端靠的是面板 + 实心胶囊这两个静态信号。
- 副标题「M / E / D 分离 · 本机工作台」在 ≤860px 被隐藏（让首屏），手机上看不到这行定位说明；
  需要的话可以挪到「网站介绍」页首屏。
- 折叠态胶囊是纯图标（文字被隐藏），可访问名仍来自 `aria-label="回到首页动画"`，图标本身 `aria-hidden`。

## 第三十四轮：批评性复核 DeepTutor 接口（并落实反思）（2026-10-03）

以「实际跑一遍、读代码」为准，复核了两处接口：`mcs-bridge`（3783，经核查的那一套）与
`mcs-web/server/tutor.mjs`（本站内适配器）。**两套并行实现**这件事本身就是最大的问题，见第 4 节。

### 1. 复核方法（先说清楚是怎么得出结论的）

不看 README 的宣称，只做三件事：读实现、跑测试、**把服务真的启起来打一次**。
复核中确有若干怀疑被证据否掉，也照样记下来（第 3 节），否则下一轮还会重复怀疑。

### 2. 实测出来的缺陷与修复

| # | 缺陷 | 证据 | 修复 |
|---|---|---|---|
| 1 | **评价正文可以是模板占位语**（桥接） | 指令与校验各自写死同一字符串；模型原样抄回占位语即算「已评价」，`server.mjs` 随后把 `feedback_recorded` 置真 → 回合被报成完整成功 | 拒收占位语与 <12 字正文（`EVALUATION_PLACEHOLDER` / `EVALUATION_TOO_SHORT`）；占位语常量单一出处 `contracts.mjs` |
| 2 | **未验证的 `liveVerified`**（本站） | `MCS_WEB_TUTOR_LIVE_VERIFIED=1` 就能让界面显示「已连通并完成真实验证」，还把这个布尔值写进事件载荷持久化到 E | 改为**证据判定**：配置开关 + 本进程内真的跑完过回合（`completedTurns`）；事件里记 `completed_turns_in_process`，界面文案改成「已完成真实回环 / 本进程还没跑完过真实回环」 |
| 3 | **流中断被报成「后端不可用」**（两套都有） | 两边的 `ws.on('error')` 都不分类，且 `err` 被丢弃：401 / ECONNREFUSED / 中途断线现场一模一样；中途断线的回合可能已在跑，却被指向「检查后端」 | 两边都改为：已建立连接 → `DEEPTUTOR_INTERRUPTED`（带 `turn_id`）；握手阶段 → `UNAVAILABLE` / `AUTH_REQUIRED`；都带**脱敏** `details.cause`；本站新增错误码并让 `turnView` 把 `details` 传到页面 |
| 4 | **长驻会话凭证写进模型指令**（桥接） | 指令里是 `s.session_token`，那段文本会离开本机进入模型提供方上下文 | 改用 15 分钟**轮次凭证**（同会话、最多两枚）；会话凭证不出本机；事件里夹带任何凭证都被拒 |
| 5 | **单实例锁只看 PID**（桥接） | 现场 `runtime/instance.lock`=14364 而该 PID 不存在；Windows PID 复用会让 Bridge 永久拒绝启动且无法自查 | 判据改为「PID 活着 **且** 端口上确实是本协议 health」；`acquireInstanceLock` 可注入探针、可单测；`stop.ps1` 增加等进程退出后清锁（实测 `Stop-Process` 后立即删文件会失败，且被 `SilentlyContinue` 吞掉） |
| 6 | **启动日志里躺着浏览器能力凭据**（桥接） | `start-background.ps1` 重定向 stdout，旧版无条件打印 `#bridge-token=…`；实测 `runtime/bridge.stdout.log` 里就有 2026-09-30 那次的 token | 只在交互式终端打印凭据；**已轮换浏览器凭据**（保留 mcp 凭据以免打断 DeepTutor 的 MCP 注册）并清除日志里的旧值 |

### 3. 复核中确认「没问题」的（记下来免得重复怀疑）

`state.json` 已是 `0o600` + 临时文件 + `fsync` + `rename` 原子写；MCP 与浏览器凭据分开；Host/Origin 白名单在；
预算不足显式报 `CONTEXT_BUDGET_TOO_SMALL` 并给 `minimum_chars`；`TURN_IN_PROGRESS` 挡并发重发；
重启把 `pending` 标 `interrupted` 而不重发；`stop.ps1` 杀进程前核对命令行含 `server.mjs`；
桥接 README/COMPATIBILITY 对 1.5.16 的版本边界与未验证项写得比实现还细（这点值得保持）。

### 4. 最大的问题：两套并行实现

`mcs-bridge`（MCP 工具 + 事件登记 + 轮次凭证 + 契约校验，有 `tests/` 与 COMPATIBILITY 记录）
与 `mcs-web/server/tutor.mjs`（上下文注入 + 事件落 E，自建一套）**同时存在、同时连同一个 DeepTutor**，
而界面此前完全不提桥接。使用者会以为只有一套，甚至把两边的结论混着用。

本轮**没有合并**（合并要动 E 的写入路径与档案模型，不是一轮能安全完成的事），做的是：
本站 `/api/v2/tutor/status` 增加 `bridge` 字段（本机回环探测桥接的公开 health），辅导页同时显示两套状态，
并写明「桥接是经过核查的那一套；两者不要混用同一档案的结论」；
另加一条**跨仓库不变量**断言：两套实现必须说同一套失败码（`DEEPTUTOR_INTERRUPTED/UNAVAILABLE/AUTH_REQUIRED`）。

### 5. 命令与结果

| 命令 | 结果 |
|---|---|
| `cd mcs-bridge; node --test tests/*.test.mjs` | **11 项通过**（原 7 + `tests/critique.test.mjs` 4） |
| `cd mcs-web; node --test tests/tutor-critique.test.mjs` | **4 项通过**（新增） |
| `cd mcs-web; npm run build / npm run check / npm test` | 全部通过（十个套件） |
| 真实启动冒烟（桥接） | `start-background.ps1` → health 返回 `configured:true, identity:"local-admin"` → `stop.ps1` → 端口关闭、锁清理、日志无凭据 |

**新断言的有效性验证过**：把占位语校验与轮次凭证两处修复撤掉，对应测试立即变红（2 项失败），
恢复后重新全绿。这一步是必要的——否则「新增测试」可能什么都没钉住。

### 6. 未落实 / 明确不声称

- **没有合并两套实现**，只做了失败码对齐与状态披露；两套仍会各自演化。
- **没有做真实模型回环**（要调用配置的模型）：本轮的端到端只到「桥接起来了、health 正确、锁与日志行为正确」；
  `liveVerified` 的语义改动有单测覆盖（模拟 WS），但没有真模型验证。
- 桥接契约 `max_chars` 下限 3000 而部分节点实际需要一万多字符；失败信封没有机器可读的「可恢复」维度；
  `health` 仍返回 DeepTutor `user_id`（多租户前必须去掉）。这三条都是**看清楚了但没改**。
- 轮换浏览器凭据会让旧标签页里的凭据失效（这是泄漏处置的代价）；MCP 凭据未动，DeepTutor 里的注册不受影响。

## 第三十三轮：方法库——十条可单独练的方法（带简介的栏目 + 细致解析）（2026-10-03）

用户给了一份十条的清单（内省、认知发展笔记、构造反例、从特例切入、找不变量、逆向分析、
直觉的建立与失效、不轻易诉诸「显然」、独立的动机溯源练习、次阶段的应用 ≠ 本阶段的特定联系），
要求：**统统加到学习方法论里，排序按重要性由我定夺，做成带简介的栏目，点击通往更细致的解析。**

### 1. 交付形态

- **栏目**：`/method` 页面新增「方法库 · 10 条可单独练的方法」，卡片带序号（顺序即重要性）、
  分类标签（元方法 / 容器 / 练习 / 入口 / 抽象 / 找证明 / 判断 / 纪律 / 进阶练习 / 进阶分辨）、
  一句简介、「读细致解析 →」。
- **细致解析**：新增路由 `/method/:methodId`（`MethodDetailPage`），每条四段固定结构：
  **它解决什么问题 → 怎么做（可执行步骤）→ 什么时候会失效（边界与误用）→ 本站哪里能看到它**
  （带可点的本体节点链接），末尾单独一行出处，另有上一条 / 下一条。
  未知 id 给明确提示与回程链接。
- **排序依据写在页面上**（重要性由本站判定）：先元方法与容器（内省、认知发展笔记）→
  收益最高也最廉价的两个动作（构造反例、从特例切入）→ 抽象与找证明的核心动作（找不变量、逆向分析）→
  判断「什么时候不该信直觉」与表达纪律（直觉的建立与失效、不轻易诉诸「显然」）→
  两条进阶分辨（独立的动机溯源练习、次阶段的应用 ≠ 本阶段的特定联系）。
- **与原有内容的关系**：页面保留原来的「记在笔记里的八条原则」（`METHOD_CORE`，来自认知发展笔记里
  已写出完整论述的小节），并在卡片区前说明重叠对应关系（「删掉某个条件会怎样」↔「构造反例」、
  「动机溯源」↔「独立的动机溯源练习」——前者是笔记里的原则，后者是可单独练的动作）。

### 2. 取材纪律（这一页最容易翻车的地方）

`MCS_vault/MCS/methodology/` 里 `构造反例的方法.md`、`内省.md`、`直觉的建立与失效.md`
**都是 0 字节**（实测），只有 `认知发展笔记.md`（13.5 KB）有正文。因此：

- 有文档依据的条目，出处写「整理自 `认知发展笔记.md` · 某节」；
- 没有依据的五条（从特例切入、找不变量、逆向分析、不轻易诉诸「显然」、次阶段的应用 ≠ 本阶段的特定联系）
  一律写「站点自己的整理」；
- 三条 0 字节文档对应的条目（内省 / 构造反例 / 直觉的建立与失效）出处里**明确写出该文件是 0 字节**，
  并说明本条目是站点整理而非对它的转述；
- 「本页没有收录什么」一节同步改写，把这件事再说一遍。

### 3. 与本站内容的挂接

每条解析都尽量给一个点得进去的具体去处，而不是停在抽象层：
构造反例 → 反例节点「Christoffel 系数不是张量」与误区「收敛序列各项都不等于极限」；
找不变量 → 方法论节点「寻找不变量」；逆向分析 → 正文级证明节点「常值取值证书」；
直觉的建立与失效 → 两个误区模式；次阶段的应用 ≠ 本阶段的特定联系 → 张量性反例 + 寻找不变量。

### 4. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node tests/method-library.mjs` | **新增 18 项**全部通过 |
| `npm test` | 十个套件全部通过 |

新套件的断言：十条都在且顺序等于声明顺序、每条都有简介/标签/解析入口、页面写明排序依据、
十条解析都能打开且标题与卡片一致、每条含四段结构、每条步骤 ≥3 与边界 ≥2、
每条标出处且区分「整理自文档」与「站点自己的整理」、正文 ≥600 字（不是占位）、
**解析页里指向本体节点的链接逐个打开核对**（死链比没有链接更糟）、上一条/下一条、
未知 id 有提示与回程、无控制台错误。

截图：`tmp/method-library.png`（栏目十张卡）、`tmp/method-detail.png`（构造反例的细致解析）。

### 5. 未落实 / 边界

- **十条内容是本站整理**：其中五条在 vault 里没有任何文档依据，写作依据是本站自身的工程与内容纪律；
  这不是对既有方法论文献的综述，也没有引用外部研究。
- **排序是判断，不是结论**：依据写在页面上，但没有做任何验证（例如「构造反例比找不变量更重要」
  没有测量支持），换一个人完全可能排出不同顺序。
- 细致解析目前是**纯文本 + 站内链接**，没有配图与例子演算；「本站哪里能看到它」一节点到的本体节点
  都还只是链接过去，没有把该节点的具体内容摘一段到方法页里。
- `构造反例的方法.md` 等三份文档一旦写出，这三条应当改为「整理自该文档」，届时需要重写出处。

## 第三十二轮：五幕各占自己的段落，滚轮在「播放动画」与「滚到下一幕」之间交替（2026-10-03）

用户要求：**别让这么多幕在页面的同一个位置（前一幕消失了才能看到下一幕）；把页面设置得长一点；
滚轮作用是播放动画和滚到下一幕交替负责。**

### 1. 机制改动

旧模型是「一块 5.5 屏长的滚动区 + 一个固定舞台交叉淡入」——五幕叠在同一个屏幕位置上。
新模型：

| 项 | 旧 | 新 |
|---|---|---|
| 幕的位置 | 五幕叠在同一个固定舞台，靠不透明度交叉淡入 | **五段各自成段**，顺序排在页面上；滚过去就是滚过去 |
| 段高 | 整块滚动区 5.5 屏 | 每段 `calc(100svh − 顶栏 + 6svh)`（略高于可见区，下一幕不探进视口） |
| 滚轮 | 纯滚动，滚动位置换算成进度 | **交替两项职责**：本幕进度没走完时吃掉滚动只推进动画；到端点后下一次滚轮才平移到下一段 |
| 动画驱动 | 全局滚动进度 | 每段自己的 `data-played`（反向滚轮先倒放，倒到头才回上一段） |
| 报头 | 随舞台固定 | 吸顶（进度点 + 本幕播放进度条） |
| 对齐 | 舞台固定 | 每段按**内容中心 = 可见区中心**对齐（段落比可见区高，按顶端对齐会让文字偏下） |

参数：`PLAY_DISTANCE = 560`（约 6 格滚轮播完一幕）、`JUMP_LOCK_MS = 620`（一次手势不连跳两段）。
首屏会把第一段摆正（只在「页面本来就在顶端」时补，且用瞬时定位——用户没操作，不该看到页面自己滑）。

### 2. 实测（1440×1000）

```
初始      scrollY=0    active=0  played=[0,0,0,0,0]
滚 3 格   scrollY=0    active=0  played=[0.643,0,0,0,0]   ← 页面一动不动，只在播动画
继续滚    scrollY=949  active=1  played=[1.000,0.643,0,0,0] ← 播完之后才跳段
再滚一格  scrollY=949  active=1  played=[1.000,0.857,0,0,0] ← 第二幕同样先播放
```

另测三档窗口的首屏与跳段后对齐偏差：1440×1000 → 6px / 0px；1600×1100 → 6px / 6px；1280×800 → 6px / 6px
（6px 是顶栏取整）。页面总高 ≈ 5.3 屏，每段高度 ≥ 0.9 屏。

### 3. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `npm run check` | 通过 |
| `node tests/home-narrative.mjs` | 通过；本轮**新增 8 项**、改写 6 项断言 |
| `npm test` | 九个套件全部通过 |

新增/改写的断言（要点）：首帧只有第一段在视口内且其余段都在下方、五段两两间距 ≥0.9 屏、
页面 ≥4.8 屏且每段 ≥0.9 屏、**滚轮第一步页面不动而进度前进**、播放进度有可见反馈（顶栏进度条）、
**播完之后滚轮才平移约一段且 active 前进**、进入下一段时它的进度从起点开始、**反向先倒放（页面不动）**、
倒到头才回上一段、首屏文字块居中于可见区（≤12px）。

顺带修掉一个真实缺陷：图形层比容器宽时，网格的 `center` 对齐在溢出方向按**起点**对齐，
场景因此整体偏右 127px（背景不再与文字同心）。改成绝对定位 + `translate(-50%,-50%)`，实测偏差 0。

### 4. 未落实 / 边界

- **只在「滚轮」上做交替**：键盘（PgDn/方向键）、滚动条拖动、触屏滑动都不拦，直接滚过去；
  滚过去的段落会被记为「已播完」（显示完成态），不会卡在半途。因此键盘用户看不到逐幕动画。
- **段高 +6svh 是设计取值**：靠截图与断言核对，没有做手感测试；触控板的连续小增量会让
  「播放」与「跳段」的边界感觉略软（`PLAY_DISTANCE` 因此是估计值）。
- 首屏瞬时定位会让 `scrollY` 从 0 变成约 70：深链与浏览器恢复位置有保护（`scrollY > 8` 就不动），
  但「用户自己刚滚到 0 再刷新」这种情况也会被重新摆正。
- 窄窗与「减少动态效果」下不做交替：五段自然滚动、滚轮不拦、图形直接给完成态。

## 第三十一轮：首页动画退到文字正后方，文字居于视觉中心（2026-10-03）

用户要求：**让文字居于视觉中心，把动画融入到文字正后方左右的背景里，做好视觉优化。**

### 1. 版式改动

原来是两栏（正文栏 0.92fr / 图形栏 0.9fr），动画是右侧的一张插图。现在改成**单列居中 + 背景层**：

| 层 | 角色 | 实现 |
|---|---|---|
| 图形层 `.home-story-visual-stage` | 文字正后方的背景 | 绝对定位铺满舞台、`place-items: center`、按高度撑到 112% 并允许横向溢出（1440 宽下场景约 1191px，比 560px 的正文栏宽一倍多），不接指针 |
| 柔光罩 `.home-story-scrim` | 保证可读性 | 文字正后方的径向浅色渐变 + 上下线性渐隐，`z-index: 1` |
| 文字层 `.home-story-copy-stage` | 视觉中心 | 一列 `min(100%, 42rem)` 居中，`z-index: 2`，幕内文字居中（kicker/标题/正文/入口/署名） |

图层不透明度 0.5（`SCENE_BACKDROP_OPACITY`），场景自带的大标题与 kicker 在背景模式下**隐去**——
同一块版面上不该有两套标题；其余小字留 0.5 的痕迹当纹理。场景语义没有丢：每层的 `sceneLabel`
仍是可访问描述，正文把同一件事说清楚了。

顺带删掉了一条过期的 CSS：`@media (min-width:1201px) and (max-width:1400px)` 里的两栏比例规则，
留着会把 1366 宽打回两栏（实测验证时就是这样暴露的：1440 居中、1366 两栏）。

### 2. 实测（三档窗口）

| 窗口 | 文字块中心相对舞台 | 场景渲染宽 / 缩放 | 场景文字（×缩放） | 横向溢出 |
|---|---|---|---|---|
| 1600×1000 | 0px | 1191px / 1.65× | 28.1px | 0 |
| 1440×1000 | 0px | 1191px / 1.65× | 28.1px | 0 |
| 1366×768 | 0px | 867px / 1.20× | 20.5px | 0 |

### 3. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `npm run check` | 通过 |
| `node tests/home-narrative.mjs` | 通过；**新增 6 项版式断言**在这里 |
| `npm test` | 九个套件全部通过 |

新增断言（桌面首帧）：文字块居中于舞台（各幕水平偏差 ≤ 6px）、图形层在文字正后方（比文字宽 >1.2 倍且同心）、
层序是 图形 → 柔光罩 → 文字、柔光罩是径向渐变、背景模式下场景标题 opacity 全为 0 而图形仍有 >12 个可见元素、
每一幕的文字都装得进舞台。原有的七档窗口「装得进固定舞台」与「场景文字 ≥8/10px」全部继续通过。

截图：`tmp/home-centered-1440x1000.png`（第一幕）、`tmp/home-centered-final-1440x1000.png`（末幕）、
`tmp/home-centered-1366x768.png`。

### 4. 未落实 / 边界

- **窄窗（≤1200px 宽或 ≤700px 高）仍是自然滚动的旧版式**：图形在文字下方当插图，不做背景化——
  那种尺寸下背景动画会把文字压得没法读。这一点没有在界面上写明。
- **背景化的浓度（0.5）与柔光罩的形状是设计取值**，靠截图人工核对，没有做对比度测量
  （没有算 WCAG 对比度，也没有做用户测试）。
- 场景自带的标题在背景模式下不可见，因此「每一幕的示意画的是什么」只剩图形与正文表述；
  如果希望背景里也保留那行标题，需要把它移到不与幕标题争位置的地方（例如贴到舞台底部）。

## 第三十轮：知识网络新增「右键按住取强关联节点」的手势（2026-10-03）

用户要求：**长按右击节点 → 强调这个节点、虚化其它节点，并在它附近临时摊开与它强关联的节点；
保持按住把鼠标移到某个候选上，松手就把它放进视图。这是添加节点的一个新操作逻辑。**

### 1. 手势与旧行为的关系

原来右键只有一个意思：轻点即把节点移出视图。新交互不能把它挤掉，于是按**按住时长**分流：

| 手势 | 行为 |
|---|---|
| 右键轻点（按住 < 250ms） | **仍是「移出视图」**（旧行为，肌肉记忆不破坏） |
| 右键按住（≥ 250ms） | 打开强关联选择器：强调源节点、虚化其它节点与所有边、面板让开，围着源节点摊开候选 |
| 按住期间移动鼠标 | 命中判定 + 高亮候选（虚线强调环） |
| 在候选上松开右键 | **把该节点加入视图**并落在它被摊开的位置；URL 同步（可分享、可刷新） |
| 在别处松开 / Esc | 取消，不加任何节点 |

### 2. 候选从哪来（只读本体，不猜）

新增叶子模块 `web/src/node-related.ts` 的 `relatedCandidates()`，三条来源都能追到已登记数据：

1. **登记关系**：强度 = 关系权重 × 见证修正（与画布线宽同一把尺子）；
2. **产出**（`produces`）：源节点是某条契约的输入之一 → 那条契约能引入的节点，强度取该契约的 mode 权重；
3. **前提**（`consumes`）：源节点是产出 → 引入它需要哪些输入，同 mode 权重；
4. **共用前提**（`shared-input`，兜底）：同一行动的两条输入，固定 0.14，永远排在语义关联之后。

已在视图里的节点不再作为候选（这一圈是用来「拖进来」的）。实测（源 = 同胚）：
`光滑流形(produces 0.90) / 拓扑空间(consumes 0.90) / 拓扑流形(produces 0.90) / 光滑图册(shared-input 0.14)`
——前三条正是本体里 `a-dg:manifold`、`a-dg:smooth-manifold` 这些定义性契约的邻居。

### 3. 实现上必须处理对的三件事

1. **计时分流**：计时器在 `pointerdown` 起、在 window 的 `pointerup` 结算；右键拖动没有别的含义，
   所以按时间分而不是按位移分。
2. **长按期间不做指针捕获**：捕获后所有事件都送给源节点，就收不到「鼠标移到候选上」了。
3. **命中判定自己算世界坐标**（`screen = world × scale + offset`），不靠 DOM 事件：
   候选卡片画在相机变换里，挂 `pointerenter` 会因为层级与捕获漏事件。
   验证时也踩过一次坐标系：拿 SVG 相机坐标比世界坐标是错的，改比**屏幕坐标**才成立。
4. 长按期间悬浮面板淡到 0.22 并停掉指针事件——候选圈会摊到面板底下，
   面板还盖着就没法把鼠标移上去。

### 4. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node tests/network-picker.mjs` | **新增 15 项**全部通过 |
| `npm test` | 八个套件全部通过 |

新套件按手势每一步断言：选择器打开、源节点被强调（`pick-source`）、其它节点透明度 ≤0.2、
候选全部来自已登记关系或契约、候选带依据与强度且按强度降序、画布给出操作提示、悬停高亮、
松手加入（节点数 +1、URL 含新 id、落点与候选位置屏幕距离 <160px）、加入后有说明；
两条边界：**轻点右键仍然移出视图**、**Esc 取消不加节点**。

截图：`tmp/network-picker.png`（同胚周围摊开四个候选，其它节点与边虚化，面板让开）。

### 5. 未落实 / 边界

- **候选只取本体里的关联，不看学习状态**：不区分「你已经掌握」「还没读过」；等 E 层参与排序是下一步。
- **环上位置固定**（从正上方等分）：没有做「避开面板与已有节点」的智能摆位；
  面板现在是淡出让路，不是真的绕开。
- **触屏与触控板**：长按手势是为鼠标右键设计的；触屏上右键长按没有等价事件，
  触屏用户仍走「全部节点」面板勾选（这一点没有在界面上写出来）。
- 手势的阈值 250ms 是设计取值，没有做过手感测试。

## 第二十九轮：行动契约按 mode 分档——「同胚 → 流形」不该是一条灰虚线（2026-10-03）

用户报错：**知识网络里「流形」和「同胚」的关联视觉效果太差，好好想想他们的关系；
很多别的概念也是这样，对已有的节点进行过关系细化。**

### 1. 数据侧的真相（不是画错，是语义与视觉错位）

只读接口实测：

| 事实 | 数值 |
|---|---|
| `a-dg:manifold` 的输入 | `[dg:topological-space, dg:homeomorphism]`，产出 `[dg:manifold, dg:topological-manifold]`，**mode = definition** |
| 登记关系里 `from/to` 涉及这两个节点的 | **只有 1 条**：`dg:topological-manifold --specialization/DEF--> dg:manifold` |
| `dg:homeomorphism` 的登记关系 | **0 条** |
| 全库契约 mode 分布 | definition **85**、deduction **61**、construction 25、method 20、task 18、evidence 4、representation 2（共 215 条，展开 386 条边） |
| 全库登记关系 kind 分布 | crossDomain 19、application 10、specialization 10、hardGeneralization 8、bridge 4、analogy 1、duality 1（共 53 条） |
| **`hardPrereq` 关系** | **0 条** |

也就是说：**「不用同胚就定义不出流形」这件事实，本体是登记了的——在契约的 `mode=definition` 里**；
而渲染把**所有**契约一律压到最弱一档（`FAMILY_WEIGHT.contract = 0.18` → ambient：1.1px、0.34 不透明、
`2 5` 虚线、不标名称），于是它比 `crossDomain`（接口关系，0.68）还轻。用户看到的就是这条灰虚线。

站点原先宣称的不变量「任何语义关系都必须强于任何结构关联」**字面成立、语义是反的**：
它把契约一律算作「结构关联」，而本体的最硬依赖恰好全在契约里。

### 2. 改法

- `relation-visual.ts` 新增 `CONTRACT_MODE_WEIGHT` / `CONTRACT_MODE_LABELS` / `SEMANTIC_CONTRACT_MODES`：
  - `definition` → **0.9（核心档）**：实线 4.6×1.08 ≈ 4.97px、不透明 1、**标出名称**；
  - `deduction` → 0.5（结构性关系档）：语义依赖，强于任何结构关联；
  - `construction / method / task / evidence / representation` → 0.16–0.2（结构骨架档）：
    **必须弱于最弱的语义关系**（analogy 最低见证 0.24），这一条被不变量连同它们一起核对；
  - 未登记的 mode 回落到 0.18。
- `edgeVisual()` 增加 `mode` 参数；`edgeKindLabel()` 给语义契约中文名；契约边标注写成
  「定义性前置：引入流形」（mode 名 + 行动标题），不再是一条没有说明的线。
- **不变量重写**（`assertHierarchyHolds()`）为三条：A 任何语义关系 > 任何结构关联；
  B 任何语义依赖（definition / deduction 契约）> 任何结构关联；C 定义性前置 ≤ 硬前置 且 > 最弱语义关系。
  结构关联的上界现在**包含所有非语义 mode 的权重**——这是第一版漏掉的地方，被测试当场抓出（0.32 > 0.24）。
- 条款面板新增「行动契约按 mode 分档」表（每档给权重、档位、当前视图边数），
  并如实写明：**本体里当前没有登记 `hardPrereq` 关系（0 条），最硬的「必须先有」全部写在契约的 mode 里**，
  所以「核心断言」这一档在画布上可能看不到——是数据现状，不是渲染漏了。
- 渲染的边元素补上 `data-source` / `data-kind` / `data-mode`：验收从此能精确分类边，不靠推测。

### 3. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node --test tests/relation-visual.test.mjs` | 7 项通过（新增 1 项：契约按 mode 分档） |
| `node tests/browser.mjs` | 通过（新增 4 项与「同胚 → 流形」直接相关） |
| `npm test` | 全部通过 |

针对用户这一条的实测（`/network?nodes=dg:homeomorphism,dg:manifold`）：

```
data-tier=core  data-mode=definition  data-weight=0.900
stroke-width=4.97px  stroke-dasharray=none  opacity=1
标注文案 = 定义性前置：引入流形
```

截图：`tmp/network-definition-edge.png`（同胚 → 流形 是一条实心粗箭头，直接标着「定义性前置：引入流形」）。

新增的浏览器断言：`「同胚 → 流形」按定义性前置画（不再是最弱的灰虚线）`、`定义性前置直接标出名称与出处`、
`定义性前置比接口类关系更明显`、`定义性前置不越过硬关系`；原有的「关系线比结构线粗/实」两条也按新定义改写
（结构线 = 五类族边 + 非语义 mode 契约），并加 `data-mode` 以免再靠推测分类。

### 4. 未落实 / 需要你拍板

- **`hardPrereq` 关系仍是 0 条**：本轮只改了「渲染如实反映契约的 mode」，没有动本体数据。
  要让最高一档「核心断言」真的出现，需要在 `data/` 里把关键定义性依赖登记成 `hardPrereq` 关系
  （例如 同胚 → 流形、拓扑空间 → 同胚、坐标图 → 光滑图册…）。这是**内容决定**，等你点头再动。
- **同一对节点可能同时有契约边与关系边**（画面上会叠两条线）：本轮没做「同一对只画最强的一条」，
  因为契约（前提 → 产出）与关系（语义断言）在面板里是分开列的两个东西，合并会丢信息。
  如果叠线实际影响阅读，下一轮可以做「叠加时只画最强、另一条进详情」。
- 分档权重是**设计取值**：`definition 0.9` 是按「定义性依赖仅次于硬前置」定的，不是实验结论。

## 第二十八轮：分面选项不许筛出 0 个（用户报错）（2026-10-03）

用户报错：**知识网络「全部节点」悬浮框里，选中「定义」「类比」怎么会显示 0 个节点？**

### 1. 先量，再认账

只读接口实测（不是推测）：

- 本体 232 个节点里，构造只有 **11 类**：Concept 126、Claim 47、Method 21、MisconceptionPattern 11、
  Example 5、Theory 5、Proof 4、Problem 4、Construction 3、Counterexample 3、Symbol 3；
- **`construct=Definition` 有 0 个节点，`role=Definition` 也有 0 个节点**——
  `data/authoring.mjs` 里 `definition()` 模板存在，但当前案例数据一次都没用它；
  `Term`（项）、`Representation`（表征）同样是 0；
- 而「全部节点」面板的下拉是 `Object.keys(CONSTRUCT_LABELS)` 铺出来的 14 类，
  于是「项 / 定义 / 表征」三个选项**永远筛出 0 个节点**（逐项点过：0、0、0）；
- 「类比」是**关系种类**（`analogy`），本体里只有 **1 条关系、0 个节点**：
  它在节点维度上永远是空的，用户在节点列表里搜它却看不出原因。

**同一处错误还在「数学对象」列表页**（构造与角色下拉同样铺标签表）——那是我上一轮自己写下的，
用户这一轮骂的是网络页，账要一起算。

### 2. 改法：选项只从真有的数据里长出来

- 新增 `web/src/facets.ts`：`buildFacet(nodes, valuesOf, labelOf, declared)` 返回两份——
  `present`（真有的类别 + 计数，按数量降序，供筛选用）与 `absent`（模板声明、本体空着的类别，
  **只用于如实说明，绝不当作可选项**）。
- **知识网络「全部节点」面板**：构造下拉改为 11 个真选项，标签带计数（如「概念（126）」）；
  案例下拉同样改为真选项（8 个案例，带计数，`C^k` 走 `plainMathText`）；
  面板里新增一行说明：「本体里还没有登记这几种构造：项、定义、表征——模板支持，
  但当前 232 个节点里一个都没有，所以不放进筛选（选中只会得到 0 个）」。
- **数学对象列表页**：构造 / 角色 / 案例三个下拉同上；空类别同样如实说明。
- **「类比」这类关系词给出处**：`relationKindHint()` 命中关系种类时返回一段说明
  （「『类比』是关系种类，不是节点类型，所以按节点筛只会是 0。本体里登记了 1 条这种关系：
  去知识网络的『连接类型』面板打开它，或在研究台按关系复核。」），
  网络面板与列表页都会显示——不再是一个没有解释的空列表。

### 3. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node tests/facets.mjs` | **新增 11 项**全部通过 |
| `npm test` | 七个套件全部通过 |

`tests/facets.mjs` 把这条规矩钉住（两个页面共用）：

1. 下拉里没有「选中就是 0 个」的死选项，且**选项数 === 本体真实类别数**；
2. 每个选项标注的计数 === 该选项真正筛出的条数（网络面板比列表条数，列表页比计数行——
   案例有 63 个节点、一页只渲染 60 张卡，比卡片数会误判，这条也踩过一次）；
3. 空类别必须如实说明，不能假装它不存在；
4. 搜「类比」必须给出关系种类的去处（含本体里的关系条数）。

### 4. 追加：用户更正为「类别」之后，又改了类别划分本身

用户随后更正：报错的词是**「类别」**不是「类比」——原话是「选中『定义』类别怎么能显示 0 个节点」。
（我把「类比」当成了 `analogy` 关系种类去做，误会记在这里；那一块提示保留，因为它本身有用：
任何关系种类词都会得到解释与去处，不再是一个空列表。要撤掉说一声。）

**结论不变**：真正的问题是「类别本身划错了」，而 0 个节点只是症状。因此又改了三处划分：

1. **「概念与定义」→「概念」**：本体 232 个节点里 `construct=Definition` 与 `role=Definition`
   都是 0，定义写在概念节点的正文里（模板 `definition()` 存在但没被用）。
   组名不再暗示一个不存在的类别，说明里写清这件事：「本体里没有单独的『定义』类别——定义写在概念节点的
   正文里（模板支持 Definition，当前 0 个节点），所以这一组不叫『概念与定义』。」
2. **误区模式单独成组**：`MisconceptionPattern`（11 个节点）原先被并进「例子与反例」——
   它们既不是例子也不是反例，本站把「常见误解」当一等对象（首页原型问题卡片、节点页都要单独列反例与误区）。
   现在它有独立分组与说明，推荐面板的 chip 会显示「误区模式 N」。
3. **分类逻辑搬成可单测的叶子模块**：新增 `web/src/node-groups.ts`（只 `import type`，node 能直接 import），
   `network.ts` 转出旧名字，调用方不必改。新增 `tests/node-groups.test.mjs`（6 项）钉住：
   每个构造都有确定分组、误区模式独立、方法按角色分局部/全局、概念组不再谎称「概念与定义」、
   标签与说明齐全且不重复、分类只读 `construct` 与 `roles`。

浏览器实测（往视图里加 3 个节点后）推荐面板的分类 chip：
`全部 16 / 局部技巧 1 / 概念 10 / 断言与证明 4 / 误区模式 1`。

### 5. 遗留（未落实）

- **本体侧没补数据**：`Definition` / `Term` / `Representation` 仍是 0 个节点。界面现在如实说明，
  但要让「定义」成为可筛的类别，得在 `data/` 里真正用上 `definition()` 模板——那是内容工作，不在这一轮。
- **关系种类仍不能按节点维度浏览**：`analogy` 只有 1 条，点进网络页要自己打开「连接类型」再找节点；
  没有做「按关系种类列出节点对」的视图。
- 别的页面里若还有「拿标签表当选项表」的写法，这套断言只覆盖了「全部节点」面板与「数学对象」列表页；
  我用 grep 核过其余位置（只剩 `facets.ts` 自己的关系词匹配），但新增页面时仍需按这条规矩写。

## 第二十七轮：数学对象页的批判性复核与修复（2026-10-03）

要求：**以严厉的批判性视角审视「数学对象」页面，并落实反思**。

复核对的是 `/nodes`（列表页）与 `/nodes/:id`（节点页）。方法不是读代码下判断，而是先量：

- 只读接口 `/api/v2/ontology/nodes` 的实测：`total=232`、默认 `returned=200`、
  `hasContent=false` 43 个、`relationCount=0` **136 个**、`evidenceCount=0` 28 个、
  `actionCount=0` 9 个、`evidenceStatus` 为空 20 个；
- 无头浏览器实测：默认首屏前 9 张卡全部是背景脚手架节点（0 行动 / 0 证据 / 无正文）；
  390×844 下 `firstCardTop=913px`——**整屏看不到任何一个节点**，筛选栏高 407px；
- 截图核对（`tmp/nodes-audit-*.png`，已随本轮清理）时另发现一处：卡片标题里的 `C^K` 以脱字符原样显示。

### 1. 认定的缺陷（按严重度）

| # | 缺陷 | 证据 | 严重度 |
|---|---|---|---|
| 1 | **32 个节点在界面上永远不可达**：接口默认上限 200，页面照默认值调用，且没有分页或「显示更多」 | `显示 200 / 232`，`hasLoadMore=false` | 高：数据完整性被界面吃掉 |
| 2 | **首屏是九张空卡**：默认按登记顺序排，开头是背景脚手架节点，全部「0 个行动 0 条证据」且无正文 | 前 9 张卡实测 | 高：第一印象把站点讲成空库 |
| 3 | **手机首屏没有内容**：标题 + 五个下拉占满 844px，第一张卡在 913px | 实测 + 截图 | 高：移动端等于不可用 |
| 4 | **不读 E**：已确认、已读、还不懂、现在可学在列表上完全不可见——页面等于不认识学习者 | 列表页未引入 `useLearningData` | 高：与 M/E/D 的承诺不符 |
| 5 | **不诚实**：43 个没有正文的节点在卡片上与可读节点长得一样 | `hasContent` 接口已返回、界面未用 | 中高：点进去才发现没正文 |
| 6 | **文案面向本体作者**：「节点按构造类型与呈现角色分开登记。公理、定理、性质是 Claim 的角色……」 | 页首正文 | 中：学习者读不懂 |
| 7 | **卡面数字是行话且常为 0**：「0 个行动 0 条证据」反复出现，反而显得库是空的 | 前 9 张卡 | 中 |
| 8 | **`C^K` / `C^∞` 以脱字符显示**：卡片是纯文本上下文，未走 `plainMathText`；而该助手的上标词表本身也不全（缺大写字母与 ∞） | 截图 + 定位实测 | 中：数学记号被显示错 |
| 9 | **筛选是盲选**：15 个构造类型 / 13 个角色 / 11 个学科没有任何解释，也没有分面计数 | 下拉框实测 | 中低 |

（公平起见也记下原本做得好的地方，避免这轮改坏：筛选状态全在 URL、零结果给出逐条可清除的条件、
返回时恢复搜索词与滚动位置；节点详情页的动机 / 条件 / 反例 / 自检 / 证据 / 关系 / 可选下一步是完整的。）

### 2. 本轮落实的修复

- **可达性**：显式请求接口上限并前端分页（每页 60，「显示更多（还有 N 个）」）。
  计数行按三种情况分别说清：未筛选时「显示 60 / 232 个登记节点」；有筛选时
  「符合当前条件 N 个 · 全部登记 232 个」；只有返回条数**正好等于**接口上限时才提示被截断——
  原先用 `total ≠ returned` 判断是错的（加筛选后两者本来就不等），这条错误也被写进了代码注释。
- **默认排序**：新增排序控件（有正文优先 / 登记顺序 / 按标题），默认「有正文优先」，
  并在选项旁写明依据；这是可见可切换的排序，不是偷偷隐藏节点。
- **诚实标记**：无正文的卡片标「正文待写」（`node-pending`），并提供「只看有正文的」开关。
- **学习状态**：列表读 E，卡片标「已确认 / 已读 / 还不懂 / 现在可学」（色彩只用既有令牌），
  另给「只看我没读过的」开关；全部只读，列表不写任何 E。
- **文案改写**：页首改成学习者语言（「这里是一个个可以读的数学对象……」）；
  构造类型 / 角色 / 证据等级 / 学习状态四组术语收进可展开的「这些标签是什么意思？」。
- **卡面去行话**：`N 个行动 / N 条证据` → 有内容才显示（`N 条登记关系`、`N 种引入方式`、`N 条证据`），
  关系为 0 时写「暂无登记关系」，不再打印一串 0。
- **数学记号**：卡片标题与摘要走 `plainMathText`；同时补全这个公共助手的上标词表
  （大小写字母、`+−=()`），并为 `C^∞` 与 `C^{k,α}` 定义了退化写法，
  `mathify` 也补上 `∞` 分支——这两处是**共享助手**的问题，修一次全网受益。
- **手机**：筛选栏收进可展开的「筛选」（窄屏默认收起，宽屏默认展开），
  第一张卡从 913px 提到首屏内。

### 3. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node tests/node-list.mjs` | **新增 19 项**全部通过 |
| `npm test` | 内核 + API + 浏览器 + 首页叙事 + 开始学习页 + 数学对象列表页全部通过 |

新套件 `tests/node-list.mjs` 把上面每一条缺陷都变成断言：翻页能到全部 232 个、默认首张卡有正文、
卡面不再出现「0 个行动」、正文待写如实标出、页面上没有字面 `C^`、列表读到学习状态（造档案 + 合法来源的
E 事件）、「只看有正文的」数量与本体一致、「只看我没读过的」确实排掉读过的、手机首屏看得到卡且筛选栏收起。
截图：`tmp/node-list-desktop.png`、`tmp/node-list-mobile.png`。

### 4. 没有落实的（如实列出）

- **排序仍是权宜**：「有正文优先」不等于「按前置深度推荐学习次序」。真正的次序要把
  依赖深度 / 必备前置数带进摘要接口（`/ontology/nodes` 现在不返回），是接口层改动，本轮没做。
- **分面计数没做**：选了「学科=分析」看不到其它学科还有多少命中，筛选仍是盲选。
- **搜索仍是子串匹配**：只在 id / title / summary 上做，没有分词、别名与关系检索。
- **本体侧的缺口只能如实显示**：136 个节点没有登记关系、9 个没有任何引入方式、
  20 个没有证据等级——界面现在不粉饰它们，但补数据不在这一轮。
- **筛选与偏好不写 E**：学习者的排序偏好、常用筛选没有记录，页面每次都是全新状态。

## 第二十六轮：第一幕痛点改成图标卡片（2026-10-03）

用户要求：**把首页第一幕的痛点做好视觉效果，不要只用加粗字体罗列，
要像 iPhone 展示特色功能那样直观明了。**

### 1. 改法

- **六条痛点变成六张图标卡片**（两列三行），每张：左侧一块带色图标（38px 色块 + 24px 线描图），
  右侧短名 + 一句说明。卡片是这一幕的图形，右侧的教材场景图保留作补充。
- **六个图标各画一张**（内联 SVG，24×24 线描，统一描边参数，颜色继承卡片色档）：
  重叠的三张卡（内容重合）、等距顺序里被强调的末点（路径既定）、错开的两枚标签（前置未对齐）、
  散落的点（方法分散）、两份相同文档加回环箭头（重复劳动）、放大镜里一只表（信息差）。
  图形语义写在 `HomeNarrative.tsx` 的 `PainIcon` 里，与 `home-narrative.ts` 的 `icon` 字段一一对应。
- **六个色档只用既有令牌**：品牌紫、青、琥珀、橙、青绿、蓝（对应 `--accent/--cyan/--amber/--ember/--teal/--blue`），
  不引入新色；卡面是 `surface → surface-2` 的浅渐变，边框用 `--line`。
- 图标块比文字块矮，所以放大图标**不占额外高度**——尺寸给到了 38px 色块 / 24px 图形。
- 卡片高度受固定舞台约束，三档字号与内边距分别收敛（见 `styles.css` 的两组矮舞台块）。

### 2. 实测（固定舞台，三档）

| 视口 | 文案栏 | 卡片 | 卡片区高 | 第一幕高/可用 | 标题/说明字号 |
|---|---|---|---|---|---|
| 1600×1100 | 560px | 276×90 | 297px | 573/893 | 15.2px / 14px |
| 1440×1000 | 490px | 241×90 | 297px | 672/797 | 15.2px / 14px |
| 1366×768 | 533px | 264×75 | 246px | 463/579 | 14.1px / 13.1px |
| 1280×720 | 489px | 242×75 | 246px | 463/534 | 14.1px / 13.1px |
| 1220×702（最紧） | 459px | 227×75 | 246px | **508/517** | 14.1px / 13.1px |
| 1152×864（自然滚动） | 830px | 411×69 | 236px | 不受舞台限制 | 15.2px / 14.4px |
| 390×844（自然滚动） | 358px | 358×91 | 610px | 不受舞台限制 | 15.2px / 14.4px |

七个固定舞台视口全部装得下（最紧的一档余 9px），手机端单列、每张卡都有图标。

### 3. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node tests/home-narrative.mjs` | 64 项全部通过（含 7 个固定舞台视口 × 3 条） |
| `npm test` | 内核 + API + 浏览器 + 首页叙事 + 开始学习页全部通过 |

新增/改写的断言（都直接对应这次的要求）：

- `${视口} 里第一幕是六张图标卡片、文字读得清`：卡片 6 张、**每张都有图标 SVG**、
  固定舞台里是**两列**、标题 ≥14px、说明 ≥13px（七个视口各一条）。
- `手机端第一幕单列卡片且每张都有图标`：390×844 下 grid 塌成一列、图标 6 枚。
- 自然滚动三视口改为核对「卡片标题 ≥15px、说明 ≥14px、图标齐全、五幕可见」。

### 4. 未验证 / 未声称

- 图标是**线描示意**，不是标准化图标库：`内容重合` 用三张叠卡、`重复劳动` 用两份文档加回环箭头，
  这类比喻没有做过识别度测试（没有做用户测试，也没测图标可辨识率）。
- 卡片版式在固定舞台里靠三档字号兜底：最紧的一档说明文字 13.1px、标题 14.1px，
  比第二十三轮定的「说明 ≥14px」低 0.9px——那一条已被本轮的卡片版式取代（断言随之改写），
  换来的是图标与卡片结构；如果在小窗口下觉得偏小，可以再调 `styles.css` 的三档数值。
- 六个色档是**分类色彩**，不承载「严重程度」或其它语义；这一点没有在页面上说明。

## 第二十五轮：学习入口独立成页，首页只做动画（2026-10-03）

用户要求：**把首页「开始学习」的部分扔出去**——新建一个页面紧接着首页之后，
展示各个角度下的学习切入口；**首页专门做动画**。

### 1. 信息架构

改前：`/` = 五幕动画 + 继续学习 + 原型问题 + 给研究者 + 系统状态 + 最近事件（一页到底）。

改后：

| 路由 | 职责 |
|---|---|
| `/` 首页 | **只有五幕动画**。不读本体、不读档案、不读事件——只有文案与内联 SVG。 |
| `/start` 开始学习 | 动画之后的落脚点：**各个角度的切入口**。 |

- 侧栏主导航第一项「开始学习」改指 `/start`；首页不占导航项，**点侧栏品牌回首页**
  （品牌位从 `<div>` 改成指向 `/` 的 `<Link>`，带 hover/focus 样式与 `aria-label`）。
- 顶栏面包屑：`/` → 「首页」，`/start` → 「开始学习」。
- 首页末幕主入口 `从原型问题开始`（`#cases`）→ **`开始学习`（`/start`）**；
  首屏「直接进入学习」也从「本页内滚动 + 聚焦」改为**跳转 `/start`**。
  首页因此不再有 `#learning-entry` 锚点，也不再需要顶栏高度做滚动偏移。

### 2. 新页面有哪些角度

`web/src/pages/StartPage.tsx`，全部入口由本体现场派生，数字不写死：

- **接着上次**：可学前沿（说清为什么是它）、待回看、进度计数、以中心节点展开的局部网络（回访者优先看到）；
- **从原型问题进入**：五条贯通案例（原样搬过来，含 `#cases` 锚点与缩略图）；
- **按领域 / 按对象类型 / 按角色 / 按案例**：四组筛选 chip，链接形如
  `/nodes?discipline=分析`、`/nodes?construct=Claim`、`/nodes?role=Theorem`、`/nodes?case=dg`，
  chip 上带该组的节点数；
- **按方式**：路线（`/plan`）、结构（`/network`）、回看（`/profile?tab=review`）、
  方法论（`/method`）、证据与研究边界（`/lab`）；
- **没有前置的起点**：没有任何行动能产出的背景节点，只能由学习者先确认；
- 页尾：给研究者 + 系统状态 + 最近学习事件（原先首页的元信息，一并搬来）。

### 3. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node tests/home-narrative.mjs` | 64 项通过（含「首页只做动画」与「跳过动画落到开始学习页」） |
| `node tests/start-page.mjs` | **新增 20 项**全部通过 |
| `npm run check` | doctor 全部通过 |
| `npm test` | 内核 + API + 浏览器 + 首页叙事 + 开始学习页全部通过 |

新套件 `tests/start-page.mjs` 盯四件事：

1. **与首页的分工**：末幕主入口指向 `/start`；首页上 `.case-card / .continue-card / #cases / #angles` 均为 0；
   点侧栏品牌回到 `/`；导航「开始学习」指向 `/start` 并在该页高亮；页首有回首页动画的入口。
2. **角度齐全**：四组筛选 chip（discipline/construct/role/case）+ 五条固定方式（plan/network/review/method/evidence）。
3. **数字是活的且入口真的通**：领域与对象类型的每组计数与 `/api/v2/ontology/graph` 现场统计逐一比对；
   点第一个领域 chip 后落到 `/nodes?discipline=…`，**列表卡片数与该 chip 的计数一致**，且页面显示当前筛选条件。
4. **窄屏与控制台**：390×844 下无横向溢出、chip 不出界、无控制台错误。

截图（本机临时产物）：`tmp/start-page-desktop.png`（整页）、`tmp/start-page-mobile.png`（390×844）。

### 4. 既有断言同步

`tests/browser.mjs` 里「原型问题卡片/缩略图/继续学习/进度计数」原先都在首页断言，本轮改到 `/start`
（这些内容确实搬家了，不是放宽断言）；末幕主入口的期望值从 `#cases` 改为 `/start`。
首页仍保留 `首页标题` 与新增的 `首页不再挂学习板块`（DOM 计数为 0）两条断言，
`home-narrative.mjs` 也加了同样的负向断言，避免以后又把区块塞回首页。

### 5. 未验证 / 未声称

- 没有做可用性测试：入口按角度分组是设计判断，不是「哪种分组更有效」的实验结论。
- 「按角色」的计数按节点的 `roles` 数组逐项累加，一个节点可计入多个角色，因此该组计数之和大于节点数；
  页面上没有写「合计」口径，未逐条向学习者解释这一点（`按对象类型`是单一字段，不受影响）。
- 旧书签 `/` 仍然可用（首页动画），`#cases` 锚点换成 `/start#cases`，未做重定向。

## 第二十四轮：首页五幕动效的可读字号（2026-10-03）

用户反馈：**首页每一幕的动画里的文字太小，改进**。

### 1. 先量清楚

场景是固定 `viewBox="0 0 720 560"` 的内联 SVG，屏上字号 = **单位字号 ×（渲染宽 / 720）**。
改前的实测：

| 视口 | 场景渲染宽 | 缩放 | 最小单位字号 | 屏上 |
|---|---|---|---|---|
| 1600×1100 | 517px | 0.72 | 10px | 7.2px |
| 1440×1000 | 452px | 0.63 | 10px | 6.3px |
| 1366×768 | 294px | 0.41 | 10px | 4.1px |
| 1280×800 | 270px | 0.38 | 10px | 3.8px |
| 1220×782 | 253px | 0.35 | 10px | 3.5px |
| 1152×864（自然滚动） | 830px | 1.15 | — | 可读 |
| 390×844（自然滚动） | 358px | 0.50 | 10px | 5.0px |

一句话：五幕的示意图形在桌面端只有 250–520px 宽，字号却是按 720px 画布写的小字，
最小一档 10 单位折到屏上只有 3.5–7px——等于不可读。上一轮把图形栏收窄换文案栏，让这件事更明显。

### 2. 改法

- **按屏上可读重定场景字号**：画布内单位字号整体上调（标题 20→30、小字 12→17、
  卡片标题 12→18、条目 13→19、注释 10→17、书页标签 10→18 等）。最小一档 17 单位，
  在 0.48–0.72 的缩放下折合屏上 8–12px；标题 30 单位折合 16–21px。
- **把盒子跟着放大**：标签胶囊 88×30 → 120×40、方法亮点 88×32 → 116×40、
  末幕链条卡 280×66 → 300×78、侧卡 150×142 → 172×168、公共目标圆 r 60 → 72、
  方法中心圆 r 58 → 70、书页标签 46×18 → 94×30；`HumanScene` 的链条整体下移，
  避免 30 单位的标题压在第一张卡上。
- **还图形栏一点宽度**：两栏网格的图形栏下限 280 → **300px**（1201–1400px 档由 200 → 300px），
  文案栏相应收窄；实测 15.2px 的条目说明在 ~500px 文案栏里仍是一行一条。
- 清掉上一轮遗留的死代码：`@media (max-width: 1100px)` 里的两栏网格规则在自然滚动形态下用不到。

### 3. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node tests/home-narrative.mjs` | 64 项定向验收全部通过 |
| `npm run check` | doctor 全部通过 |
| `npm test` | 内核 + API + 浏览器 + 首页叙事套件全部通过 |

新增断言（用户反馈的正是这一点，所以直接量屏上字号）：

- `宽舞台（1440×1000）每幕动画的文字 ≥10px`：五幕逐幕取该幕 SVG 里**最小的**文字，
  按 `单位字号 × 渲染宽 / 720` 折算，实测最小 10.6px（`story-small` 17u × 0.665）。
- `最窄的固定舞台（1220×782）每幕动画的文字 ≥8px`：实测最小 8.6px（书页标签 18u × 0.48）。
- `手机端动画文字不小于 8px`：390×844 的紧凑图形实测 8.5px。
- 另有 7 个固定舞台视口的裁切/字号断言与 3 个自然滚动视口的形态断言（上一轮加入）继续生效。

逐幕目视核对（截图按真实渲染尺寸 479×373 保存）：`tmp/scene-pain.png`、`scene-path.png`、
`scene-methods.png`、`scene-human.png`、`scene-infrastructure.png`、`scene-mobile-pain.png`。

### 4. 未验证 / 未声称

- 「≥8px / ≥10px」是**排版下限**，不是可读性实验结论；没有做用户测试或视敏度测试。
- 数字是按字号与缩放算出来的，HiDPI 屏上的实际观感未逐设备核对。
- 场景仍是「教学组织示意」，不承载真实学习数据；文字放大没有改变任何数学内容或数据引用。

## 第二十三轮：首页第一幕排版可读性（2026-10-03）

用户反馈：**首页「现状」那一幕字体太密太小，不方便读**。要求优化。

### 1. 先量清楚，再改

改前实测（`getComputedStyle` 与元素盒高，非估计）：

| 视口 | 形态 | 文案栏宽 | 条目说明字号 | 第一幕高/可用 |
|---|---|---|---|---|
| 1440×1000 | 固定舞台 | 517px | 16px（但 3 条折行、间距 0.34rem） | 513/797 |
| 1440×900 | 固定舞台 | 517px | **13.1px** | 588/703（末幕同时被裁） |
| 1366×768 | 固定舞台 | 483px | **13.1px** | 481/579 |
| 1024×768 | 固定舞台 | **371px** | **13.1px** | 590/579（被裁） |

两处根因：

1. 舞台是「文案 + 图形」两栏，1024px 宽时**文案栏只剩 371px**，正文被挤成窄条；
2. 第一版为了迁就最矮的舞台，用一条 `@media (max-height: 880px)` 把所有幕压到同一个小字号，
   并且 `@media (max-width: 1100px)` 里还留着一句 `font-size: 0.82rem`（13.1px）压在第一幕上。

### 2. 改法

- **形态优先于缩字**：固定舞台只在「够宽**且**够高」时使用，两种情形换成自然滚动（单栏、16px 正文）：
  - 宽 ≤1200px（`web/src/components/HomeNarrative.tsx` 的媒体查询，原为 860px）；
  - 高 ≤700px（上一轮加的出口，保留）。
- **文案栏优先**：1201–1400px 宽时把图形栏收窄（`1.25fr : 0.6fr`），文案栏从 417px 扩到 528px。
- **分档给字号**，不再一刀切：宽 ≥1401px 且高 ≥981px 为一档（说明 16px）；
  宽 ≤1400px 或高 ≤980px 为二档（15.2px）；高 ≤780px 为三档（15.2px，标签与边界说明各降 0.02rem）。
  三档在固定舞台里都保证**每条例目恰好一行**、说明文字 ≥14px。
- **降低密度**：条目间距 0.34rem → 0.45–0.62rem，标签栏 0.78rem → 0.84–0.9rem，
  边界说明 0.74rem → 0.82–0.86rem，文案栏上限 34rem → 35rem。
- **文案瘦身**：三条最长的说明各减 2–3 字（如「同一学科教材高度重合，去掉重复部分后新增不多。」），
  在窄文案栏里不再折行——折行才是「密」的主要来源。
- 三档矮舞台下末幕的署名让位给正文与入口（署名在侧栏一直可见）。

### 3. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node tests/home-narrative.mjs` | 61 项定向验收全部通过（上一轮 44 项） |
| `npm run check` | doctor 全部通过 |
| `npm test` | 内核 + API + 浏览器 + 首页叙事套件全部通过 |

改后实测（同一批视口）：

| 视口 | 形态 | 文案栏宽 | 说明字号 | 第一幕高/可用 | 每条例目 |
|---|---|---|---|---|---|
| 1600×1100 | 固定 | 560px | 16px | 514/893 | 一行 |
| 1440×1000 | 固定 | 517px | 16px | 562/797 | 一行 |
| 1440×860 | 固定 | 517px | 15.2px | 469/666 | 一行 |
| 1366×768 | 固定 | 560px | 15.2px | 432/579 | 一行 |
| 1280×800 | 固定 | 560px | 15.2px | 469/609 | 一行 |
| 1280×720 | 固定 | 560px | 15.2px | 432/534 | 一行 |
| 1220×782 | 固定 | 528px | 15.2px | 469/593 | 一行 |
| 1152×864 / 1024×768 | 自然滚动 | 830 / 702px | 16px | 不受舞台限制 | 一行 |
| 390×844 | 自然滚动 | 358px | 16px | 不受舞台限制 | 两行 |

新增断言：每个固定舞台视口都核对**每一幕都装得进舞台**、**第一幕每条例目恰好一行且说明 ≥14px**；
每个自然滚动视口都核对形态切换、五幕可见、说明 ≥15px、无横向溢出。

### 4. 未验证 / 未声称

- 字号下限是**排版约束**，不是可读性实验：没有做用户测试、没有测量阅读速度或理解率。
- 固定舞台与自然滚动之间是**形态切换**，两种形态的视觉节奏不同；切换阈值
  （宽 1200px / 高 700px）是按实测可用高度定的，不是感知实验结论。
- 只覆盖 Chrome 与测试视口；其它浏览器与设备的字体回退未测。

## 第二十二轮：首页新增「现状」开幕幕，四幕改五幕（2026-10-03）

用户要求：把三张幻灯片（现在的普遍学法与痛点 → 重复劳动与信息差 → 价值）总结重述后**融合到首页**。
用户在两处编辑决策上选择：**并入叙事**（在「路径」之前新增开幕幕，四幕变五幕）；**改成中性陈述**
（去掉「拜拜咯」「休想阻止……修成正果」这类修辞与夸大）。来源材料是三张幻灯片截图，仓库内没有对应
文档，因此文案由本轮重述，不是搬运原文。

### 1. 实现边界

- 内容层 `web/src/home-narrative.ts`：`HomeNarrativeScene` 增加 `'pain'`；`HomeNarrativeAct` 增加
  可选字段 `points`（幕内条目）与 `boundary`（本幕的证据边界）；`HOME_NARRATIVE_ACTS` 首位插入
  「现状」幕，原四幕 `number` 顺延为 02–05，`id`/标题/顺序不变。
- 第一幕给出六条现状（内容重合 / 路径既定 / 前置未对齐 / 方法分散 / 重复劳动 / 信息差），并写明
  「以上是作者对现状的观察与判断，不是实证研究结论；本站没有测量过教学收益」；末幕写明
  「以上是正在推进的目标，不是已完成的成果；本站不声称已经提升学习效率」。第二轮起按用户要求
  全部使用中性陈述。
- 第二幕（路径）补一句把「前置未对齐」接到本站做法（你会什么由你声明，而不是由材料替你假设）；
  第五幕（愿景）补两段回应「重复劳动」与「信息差」，结尾句仍是原来的收束句。
- 渲染层 `web/src/components/HomeNarrative.tsx`：幕数、进度点、透明度、`sceneProgress`、`activeIndex`
  的公式本来就按 `ACT_COUNT` 推导，本轮未改算法；新增 `PainScene`（三本教材随进度收敛到高度重合、
  同一行内容用强调线标出、既定顺序里第 6 点标「想先弄懂」、「已经会了」与「教材假设的前置」两枚标签
  始终错开）；页脚「滚动阅读五幕」由幕数生成；`--home-story-acts` 由组件写到根节点。
- 样式 `web/src/styles.css`：滚动区高度改为 `calc(var(--home-story-acts) * 110svh)`（与原来的每幕
  110svh 节奏一致）；新增条目清单、标签、证据边界与两处 SVG 类；固定舞台里第一幕与末幕单独收敛字号。
- **新增一条形态出口**：固定舞台放不下时改用自然滚动。除原有「窄屏 ≤860px」与「减少动态效果」，
  再把**窗口高 ≤700px** 并入同一媒体查询——舞台高度是 `100svh − 顶栏`，再减报头与页脚，矮窗口里
  任何一幕都会被裁，宁可不做固定舞台，也不裁文案。
- **不改**服务端 API、公共本体 `data/`、数据库与学习者数据；不新增依赖。

### 2. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `node tests/home-narrative.mjs` | 44 项定向验收全部通过 |
| `npm run check` | doctor 全部通过（本体、证书重放、36 算子、数据库、覆盖清单） |
| `npm test` | 内核 + API + 浏览器 + 首页叙事套件全部通过 |

### 3. 定向验收覆盖

五幕顺序与标题、第一幕六条现状与标签顺序、两处证据边界、页脚幕数、首帧独显、末幕入口、
跳过入口的焦点与顶栏避让、五个滚动读点（10%/30%/50%/70%/90%）与反向倒放、五种图形、
叙事区高度随幕数变化（实测 5.5 屏），以及**固定舞台裁切**：

| 视口 | 最高的一幕（末幕） | 舞台可用高 | 结果 |
|---|---|---|---|
| 1440×1000 | 781px | 797px | 装入 |
| 1280×720 | 489px | 534px | 装入 |
| 1024×768 | 562px | 579px | 装入 |
| 1280×690 | — | — | 切到自然滚动（不裁切） |
| 390×844 | — | — | 自然滚动，六条现状与五张图形齐全 |

截图（本机临时产物）：`tmp/home-narrative-desktop.png`（1440×1000 首屏第一幕）、
`tmp/home-narrative-mobile.png`（390×844 首屏）。

### 4. 未验证 / 未声称

- 幻灯片里的六条是**作者的观察与判断**，本轮没有也不声称做过实证研究、对照实验或用户测试；
  首页已把这句话写在第一幕里。
- 「把写教材的劳动沉淀为可复用的知识基础设施」「缩小资源不均带来的搜寻成本」是正在推进的目标，
  不是已完成的成果；本站仍然**不声称提升学习效率**。
- 三幕之后四幕只做了文案级回应，没有为「方法论汇集」「跨教材来源评价」新增功能。
- 固定舞台在 900×700 一类矮窗口改用自然滚动，是本轮新定的形态边界；其它浏览器与设备的
  滚动体感仍只在现有 Chrome 与测试视口上验证过。

## 第二十一轮：首页四幕叙事（2026-10-03）

要求：把首页顶部改成参考苹果产品页节奏的四幕滚动叙事，依次讲清
「教材路径既定 → 教学方法分散与汇集 → 人性化学习设计 → 数学教育基础设施愿景」，
保留原有的原型问题与继续学习入口。

### 1. 实现边界

- 文案集中在新模块 `web/src/home-narrative.ts`，四幕各有一组独立的标题、正文与图形语义；
  第一、二幕分别强调「既定路径」与「方法论分散」，不重复叙事。
- 动画在 `web/src/components/HomeNarrative.tsx`：桌面端约 440svh 滚动区配合固定舞台，
  滚动进度用 `requestAnimationFrame` 节流，反向滚动直接倒放；四张内联 SVG 按同一进度交叉交接。
- 窄屏与 `prefers-reduced-motion: reduce` 切换为四段自然滚动，四幕全部可见并保留局部图形。
- 首屏「直接进入学习」把焦点交给 `#learning-entry`，并按实际顶栏高度把内容落在顶栏下方；
  末幕保留原型问题、学习路线、学习方法论与网站介绍入口。
- **不改**服务端 API、公共本体数据类型、数据库或学习者数据；图形全部标注「教学组织示意」。

### 2. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | 通过（tsc + Vite） |
| `npm run check` | doctor 全部通过（本体、证书重放、36 算子、数据库、覆盖清单） |
| `npm test` | 内核 61 项 + API 13 项 + 浏览器套件全部通过 |
| `node tests/home-narrative.mjs` | 新增 30 项定向验收全部通过 |

定向验收覆盖：四幕顺序与标题、首帧独显、末幕入口、跳过入口的焦点与顶栏避让、
向前/向后滚动、窗口缩放、手机四段排布、减少动态效果、四个教学示意图形，以及全程无控制台错误。

### 3. 未验证 / 未声称

- 本次没有做用户测试或教学效果实验，「更充分地接上已有教学智慧」是产品愿景，不是已测收益。
- 跨教材方法论的实际汇集、来源评价与自动推荐尚未实现；本轮只实现首页叙事与示意动画。
- 动画的滚动体感只在现有 Chrome 与既有测试视口上验证，其他浏览器与设备未做感知测试。

## 第二十轮：Rudin《数学分析原理》凝练路径（节点先挂名字、正文留空）（2026-10-02）

要求：在本机只读的参考资料目录里找资料，凝练 Rudin 教材涉及的知识点，总结路径规划，
导入到路径范例里；没有的节点先挂个名字，内容空着。

### 1. 资料是什么，怎么核对的

目录里六本（高等代数、简明高等代数、陈纪修《数学分析》上下、Rudin、Axler），
Rudin 的那一本是 `数学分析原理 英文版·原书第3版·典藏版＝PRINCIPLES OF MATHEMATICAL ANALYSIS
(THIRD EDITION).pdf`（355 页）。

**这份扫描件连文本层都没有**（DuXiu/SuperStar 扫描，`extract_text` 全空），
所以走了另一条路：pypdf 抽页面图像（DCTDecode，2005×2756 灰度，可干净解码），
再用 rapidocr 逐行 OCR 目录页（PDF 第 8–11 页）。OCR 结果完整给出第三版的
**11 章、每章的小节名与起始页码**（第 1 章 p3 … 第 11 章 p300，参考文献 p335）。

节点只引用「章 + 小节 + 页码」，**不引用扫描件的正文文字**——那需要整本 OCR，本轮没做。
OCR 脚本与中间产物在 `tmp/`（临时），结论写进了 `data/cases/rudin.mjs` 的文件头。

### 2. 本体侧登记了什么

| 项 | 数量 | 说明 |
|---|---|---|
| 概念节点 | 42 | 只写标题、`objectType`、参数与一句话 `predicate` |
| 断言节点 | 13 | 最小上界性、中值定理、Taylor、微积分基本定理、Stone–Weierstrass、代数基本定理、压缩映射原理、反函数／隐函数／秩定理、Stokes 定理等 |
| 方法节点 | 2 | ε–N/ε–δ 估算（局部）、用紧致性把局部结论整体化（全局） |
| 行动契约 | 57 | 输入取自 Rudin 自己的依赖顺序（反函数定理先用压缩映射原理、Stokes 先用单形与链） |
| 关系 | 9 | `specialization` / `crossDomain`：与 dg、limit 案例以及 `bg:real:metric`、`bg:linear:vector` 对接 |
| 证据 | 57 | **一律 `reference` / `checkStatus: not_run`**，义务写明「撰写正文」与「未编码为 ND 证书」 |

**正文一律留空**：57 个节点全部 `contentRef: false`，`data/cases/` 下没有对应的正文块。
节点页因此只显示形式负载、证据、关系与边界，并在证据的 scope 里写明「正文尚未撰写」——
不编一段填充冒充正文。这是按本轮要求做的，也是站点第一次出现「有名无实」的案例，
所以 README 与卡片导语里都写明了它现在只能用来看结构。

### 3. 路径规划：七程

| 程 | 章节 | 里程碑 | 实测事件数 |
|---|---|---|---|
| 一 | 第1–2章 实数系统与基础拓扑 | 10 | 10 |
| 二 | 第3章 数值序列与级数 | 7 | 7 |
| 三 | 第4–5章 连续与微分 | 9 | 9 |
| 四 | 第6章 Riemann–Stieltjes 积分 | 4 | 4 |
| 五 | 第7–8章 函数序列与特殊函数 | 9 | 9 |
| 六 | 第9章 多元函数 | 6 | 6 |
| 七 | 第10–11章 微分形式与 Lebesgue 理论 | 10 | 10 |

起点按与梁灿彬那套相同的累进规则算：基础背景（集合与函数、量词、有限维线性代数）
加上前面各程的全部里程碑。**线性代数必须进基础背景**：第 9 章的线性变换与第 10 章的微分形式
都以它为输入，第一版没放进去，第六、七程直接判为 `InfeasibleWithinBound`——
这是量出来的，不是猜的。

### 4. 命令与结果

| 命令 | 结果 |
|---|---|
| `npx tsc -p web/tsconfig.json --noEmit` | 通过 |
| `npm run build` | 通过 |
| `npm run check` | doctor 全部通过（证据 196 条，`reference` 从 65 涨到 122） |
| `npm test` | 内核 **61 项** + API **13 项** + 浏览器套件**全部通过** |
| 定向浏览器验收（11 项） | 通过：栏目渲染两套样本、14 张卡片、载入 Rudin 那一程真的规划出路线、无正文节点页如实说明、案例筛选出 57 个节点 |

本体规模：175 → **232 节点**，158 → **215 行动**，139 → **196 条证据**。
`tests/core.test.mjs` 与 `tests/api.test.mjs` 的硬编码计数同步更新，两个文件都写明了新数字由哪几个案例组成。
`tests/example-paths.test.mjs` 改成**逐套**核对：每套各自的起点集合、里程碑总数（梁 56 / Rudin 55）、
七程序数，以及「一程的目标不跨套」。

### 5. 顺带修掉的一处渲染缺陷

范例卡片里的「边界说明」原先按纯文本渲染，`**加粗**` 与 `` `contentRef: false` ``
会连着星号和反引号一起显示出来。改成走 Markdown 渲染（`.example-note`）。

### 6. 未验证 / 未声称

- **这批节点没有正文**，因此**不能用来学内容**，只登记了标题、所属小节与依赖。
  每个节点的 `predicate`/`formula` 是我按该小节的通行内容写的一句话，**未逐条核对教材原文**。
- **只 OCR 了目录页**（4 页），没有 OCR 正文，也没有核对任何一条定理在第三版里的确切表述与编号。
- **小节页码取自 OCR**，个别数字可能被识别错（例如 §1.23 的起始页在 OCR 里落在 11–12 之间）；
  节点引用的是「章 + 小节号 + 页码范围」，用之前建议对着纸本再核一次。
- 「凝练成 55 个里程碑」是我的取舍，不是教材官方划分；把哪几节合成一个节点属于编辑判断。
- 没有学习者试读，路径的教学合理性没有数据支撑。

---

## 第十九轮：箭头改成「丝」——绵延 + 分叉，两端都要认得出（2026-10-02）

两条反馈，依次处理：

1. 「完全看不出来箭头两端的节点是啥」；
2. 「我想要的效果是丝绸般的箭头绵延，分叉」。

### 1. 第一条反馈的根因（量出来的，不是猜的）

第一版把箭头的尾巴放在「当前可见节点的质心」上，光束确实长、也确实显眼，
但尾巴悬在一堆卡片中间的空地上——**那个位置根本没有节点**。看的人自然认不出箭头从哪儿来。

改成两端都锚在卡片上之后，撞上第二个事实：力导向布局会把有契约关系的节点拉近，
实测同一条路线上相邻两步的中心距只有 **97–190**，扣除两张卡片的半宽，**正面边到边只剩 16–110**。
直接连两张卡片的正面边缘，多数帧会退化成一个挤在卡片缝里的箭头尖。

**解法**：尾巴放到源卡片的**背面**（丝带整个从卡片底下穿过、在前面露头），
可见部分因此至少有一张卡片那么长——同一批帧的可画长度从 16–110 变成 **89–182**。
两端依然是真实卡片：根部贴着源卡片、尖端停在目标卡片边缘外 7px。
目的地再从「淡虚线小卡」改成**与真卡片同底色、同字号的预告卡片 + 一枚「下一步」徽标**
（徽标放在卡片上沿之外，卡内空间只够放节点名）。

### 2. 第二条反馈：为什么「丝」不能靠加装饰做出来

先试的是「四边形 + 三角箭头」加渐变与虚线——那不叫丝。真正的丝必须**多股、渐细、分流再收束**，
于是重写了几何：五股丝带从源卡片不同横向位置起笔，各有各的弧度（相邻两股反向绕，交叠处叠出深浅），
全部终于同一个箭镞底边；每股的粗细按 `sin` 包络在两端收细、中段最饱满；箭镞改成凹边掠形。

关键的一步是**避让搜索**：卡片是 172×58 的大块，空白的位置每帧都不一样
（实测第 5 步的空白在上方、第 2 步的空白在左下），同一个弧高不可能两头都合适。
几何因此把「两侧 × 三档弧高」六个候选中线都量一遍，选中段离所有卡片最远的那条。

这一步踩了两个坑，都记在代码注释里：

1. **遮蔽判据最初量整条中线**，包括「丝还压在源卡片底下」的前四成——
   于是六个候选的得分全是 0，搜索完全失效（现象：第 2 步仍然选错边）。
   改成只量后半段之后，候选之间才有区分度。
2. **丝藏在卡片下层**。实测第 5 步里 182 长的丝带只有 44 露在外面——源卡片自己就盖掉了大半。
   改画在节点之上：几何仍然优先绕开卡片，绕不开时靠半透明叠上去，卡片依旧读得清。

### 3. 命令与结果

| 命令 | 结果 |
|---|---|
| `npx tsc -p web/tsconfig.json --noEmit` | 通过 |
| `npm run build` | 通过 |
| `npm run check` | doctor 全部通过 |
| `npm test` | 内核 **61 项** + API **13 项** + 浏览器套件**全部通过** |

`tests/stage-arrow.test.mjs`（7 项）核对的几何不变量：根部落在源卡片背面、尖端在目标卡片之外且贴得不远、
长度 = 中心距 − 空隙、分叉对称且两侧都有丝、每股两端收细中段最宽且外侧更细、
箭镞是闭合的凹边轮廓且丝带不越过它的底边、源越分散分叉越宽、太近或重合时返回 null、坐标确定。

浏览器套件里本轮的 9 项：丝带出现且 ≥3 股、每股共用一道浓淡渐变、丝带有锥度、
分叉张开有实际高度、箭镞是闭合曲线轮廓、中央丝线是流动虚线、
目的地卡片带「下一步」徽标与节点名、源卡片恰好一个高亮圈、
**丝带预告的那个位置下一步真的长出了节点**、最后一步不再画丝带。

第 5 步的实测形状：5 股丝，分叉张开 77px，丝带宽度 11–30（外侧更细），
根部分叉总宽约 60，目标「张量场与缩并」。

### 4. 未验证 / 未声称

- **没有学习者试读**。只声明「方向正确、两端可辨认、形状是分叉的丝」，**不**声明它提升了理解。
- **只在一条路线（范例第一程，9 节点 / 8 步）上逐帧看过**。长路线与窄屏未测；
  窄屏时相机适配会整体缩小，丝也会跟着变小，是否仍「显著」没有量过。
- **丝会叠在卡片上**。这是刻意的取舍（藏在下层就等于没画），代价是丝经过的卡片会被染上一层淡紫。
  实测节点名仍然读得清，但没有做过对比度测量，也没有验过所有配色的话题卡。
- **避让只是启发式**：六个候选里挑「中段最空」的一条，不保证不压卡片，也不处理绕不开的情形
  （那时它会直接从卡片上叠过去）。
- **可画长度小于 52 时不画丝**（几股丝会挤成一团色块），因此并非每一帧都有丝。
- 丝带的 `blur(0.35px)` 与 `drop-shadow` 只在 Chrome 上确认过。

---

## 第十八轮：回放动画的「阶段箭头」（2026-10-02）

要求：学习路径的动画里要有一个显著的半透明箭头，向着下一阶段的目标节点发散，衔接 states 之间的演化。

### 1. 它解决的是什么

回放动画原本只是让卡片逐张淡入。看的人能看出「又多了一个节点」，却看不出这一步是**朝哪儿去**的——
帧与帧之间没有任何连线，整段动画读起来像一串互不相干的闪现。这一轮在画布上补了一支半透明的扇形箭头：
从当前可见的全部节点的质心出发，指向下一步要立住的那个节点；末端以虚线幽灵预告目的地，中线是一条会跑的流动虚线。

### 2. 三个先量后定的选择

1. **出发点取整片的质心，不取上一步新增的那几个。** 力导向布局会把有契约关系的节点拉近，
   实测同一条路线上相邻两步的中心距只有 110–190，扣掉卡片半宽（86/29）后只剩几十像素，
   「按固定尺寸画」在这些帧上会退化成一坨压在卡片上的色块。逐帧量测后：用「上一步新增的那批」当出发点，
   8 帧里只有 4 帧画得出来；用「当前可见的全部节点」的质心，可画长度变成 165–359，只剩开头一两帧画不出。
2. **尺寸随可画长度缩放**（头部半宽 12–34 按 0.34 比例取，再夹住；尾端半宽受长度的一半约束），
   短的时候是小箭头、长的时候是大光束，形状比例保持一致。短于 40px 干脆不画——那时扇形与箭头挤在一起，
   比不画更难看；最后一步没有下一站时同样不画。
3. **文字交给目的地幽灵，不挂在光束上。** 第一版在光束中段挂了「下一步 · <节点名>」，
   实测它总会压到某张卡片：标签只能按几何挪开固定距离，而卡片位置是力导向算出来的，两者没有协调的余地。
   改成由幽灵自带「下一步」与节点名之后，文字与图形永远在一起，也不再互相遮挡。

### 3. 实现

| 文件 | 内容 |
|---|---|
| `web/src/stage-arrow.ts` | 纯函数几何：质心、矩形出射距离、扇形四角、箭头三角形、中线。不碰 DOM、不读测量值 |
| `web/src/pages/NetworkPage.tsx` | 在相机分组内、关系边之上、节点之下画光束与箭头；另画虚线幽灵当目的地 |
| `web/src/styles.css` | `.stage-arrow*` 与 `.network-stage-target*`：主色 0.16 半透明光束、0.55 实心箭头、流动虚线、缓慢呼吸、`prefers-reduced-motion` 关闭动效 |

回放只渲染已加入的节点，所以「下一步」在画面上本来是空的——幽灵是必须的，否则箭头指过去是一片空白。

### 4. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | TypeScript 检查与 Vite 生产构建通过 |
| `node tests/stage-arrow.test.mjs` | 8 项通过（方向、停靠、发散比例、缩放、退化、确定性） |
| `npm test` | 内核 62 项 + API 13 项 + 浏览器套件全部通过（浏览器套件在并行改动收尾后重跑，见第 5 节） |

浏览器套件里属于本轮的 11 项断言：箭头出现且带「下一步」幽灵、光束半透明、尾端比箭头底边宽、
中线是流动虚线、尖端停在目标卡片之外且紧邻目标、
**箭头预告的那个位置下一步真的在那里长出了节点**、箭头随状态推进改换目标、
最后一步不再画箭头，另加控制台无错误。

其中「预告的位置真的长出节点」是这一段的核心断言：它把「箭头只是装饰」这种实现直接排除掉——
先把幽灵的布局坐标记下来，走一步，再检查那个坐标上是不是真的出现了 `.network-node`。

### 5. 与并行改动的冲突（已收尾）

本轮进行期间，工作区里**有另一处并行改动**在同时写文件：`web/src/components/Layout.tsx`、
`web/src/useDraggablePanel.ts`、`web/src/pages/NodePage.tsx`、`web/src/pages/HomePage.tsx`、
`web/src/components/ReviewQueue.tsx`、`web/src/state.tsx` 等，都不是本轮改的。

中途有一段时间浏览器套件是红的：`KaTeX 公式渲染` 与 `浮窗与关闭按钮都在视口内`
（面板 right=1474 > 视口 1440）两项失败，随后在 `tests/browser.mjs:344` 等
`[aria-label="全部节点"]` 悬浮框时超时中止。那两处牵涉的文件本轮**一行未动**，
失败点在 `browser.mjs` 的第 300 多行，而本轮新增的断言在第 894 行之后——
中止发生在到达它们之前，所以当时无法判断本轮断言是否通过。当时另用一份等价的独立脚本
先把新增的 11 项断言跑通，作为过渡证据。

**并行写入者完工后，本轮在静止的工作区上重跑了完整验收，全部通过**（见下表）。
`npm test` 的浏览器套件现在真的会执行到本轮的断言，逐条为：

```
✓ 回放出现指向下一步的阶段箭头          ✓ 光束尾端比箭头底边宽（发散而不是一条边）
✓ 阶段箭头指向的节点有带「下一步」标注的幽灵目的地   ✓ 光束中线是流动虚线
✓ 阶段箭头是半透明的发散光束            ✓ 箭头尖端停在目标卡片之外
✓ 箭头预告的下一步真的在那个位置长出了节点  ✓ 最后一步不再画阶段箭头
```

### 5.1 最终验收（静止版本，2026-10-02 21:3x）

| 命令 | 结果 |
|---|---|
| `npx tsc -p web/tsconfig.json --noEmit` | 通过 |
| `npm run build` | 通过 |
| `npm run check` | doctor 全部通过 |
| `npm test` | 内核 **62 项** + API **13 项** + 浏览器套件**全部通过** |

### 6. 未验证 / 未声称

- **没有学习者试读**：没有任何人用这支箭头判断过「它是否真的帮助理解每一步」，因此只声明
  「方向正确、位置可核对」，**不**声明它提升了理解。
- **只在一条路线的一段动画上实测**（范例第一程，9 个节点 / 8 步）。逐帧点名结果：**8 帧全部有箭头**，
  方向依次为 连续映射与同胚 → 微分流形 → 切矢量 → 矢量场 → 对偶矢量场 → 张量场与缩并 →
  抽象指标记号 → 度规张量场，与「下一步加入的那个节点」逐一吻合。长路线（例如第六程的 10 个目标）
  与窄屏下的表现**未测**；窄屏时相机适配会整体缩小，箭头也会跟着变小，是否仍「显著」没有量过。
- **相邻两站过近时箭头不画**（可画长度 < 40px）。这是刻意的取舍而不是缺陷——那时扇形与箭头会挤成
  一坨压在卡片上的色块。实测在这条路线上从未触发；触发条件是「下一步的节点就在当前状态边上」，
  例如上下相邻的两张卡片（中心距 ≈ NODE_H + 间距）。
- 光束的 `drop-shadow` 外发光只在 Chrome 上确认过；其它引擎不支持时只是少一层光晕，不影响可读性。

---

## 第十七轮：路径规划页的「范例路径」栏目 + 教材凝练路径（2026-10-02）

要求：给路径规划页增加一个栏目，放置**路径的范例样本**并附上写明其特色的简介；
把梁灿彬《微分几何入门与广义相对论》**上册**的知识点凝练成一条规划路径，做成上述范例加进网站；
路径涉及到的节点直接加进站点。

### 1. 先把教材身份与目录钉死（这一步花了最久，也最值得）

`reference/` 里的候选文件是 `foundation of modern physics Series 7_ …pdf`（464 页）。
从版权页取到 ISBN 978-7-03-016460-5、现代物理基础丛书、科学出版社、2005 年 4 月序，
对上「上册（第二版）」；目录页的章节号与印刷页码逐行抄录后，与科学出版社官网图书页公布的目录比对，
**十章的划分、小节编号、页码区间全部吻合**，因此认定它就是要处理的那一本。

**扫描件的文本层是有损的**：抽样（每 7 页取一页）只有 **111 个不同字形码**，
`latin-1 → gbk`、`cp1252 → gb18030` 等多种还原尝试全部失败。结论是这层文字无法还原成汉字，
所以本站只从它取**结构**（§ 编号与页码未受损），不引用它的任何文字。汉字内容一律自己重写。
这条实测记录写进了 `data/cases/liang.mjs` 与 `data/cases/07-liang-dg.md` 的文件头——
后来的人不必再试一遍。

### 2. 栏目：`/plan` 顶部的「范例路径」

七张卡片（`web/src/components/ExamplePaths.tsx`），每张给出：

- **特色简介**：这一程的看点与最容易错的地方（不是章节摘要）；
- 覆盖章节、印刷页码、目标、起点、**实测事件数**、事件界；
- 里程碑标签（可扫读）与「看全部 N 个目标 / 起点」的展开清单；
- **「载入并规划这一程」**：把目标组、事件界与起点声明写进表单并立刻规划。

### 3. 三条设计决定及其代价

1. **起点累进**。第 n 程的起点 = 基础背景 + 前面各程的全部里程碑，由 `buildPaths()` 代码累加，
   不手抄清单。代价是卡片上的「起点」数字会随前面几程的改动自动变（第七程从 2 项涨到 51 项），
   这是**如实反映**而非缺陷。
2. **多目标规划**。一程要拿下好几个里程碑；只给一个目标，规划器只会给一条服务那个节点的短路线。
   表单因此持有 `goals: string[]`，多目标时请求体附 `goalIds`，单目标时逐字保持原样。
   代价：`withReview`（复习事件）只针对单个节点，多目标时该按钮禁用并写明理由。
3. **起点要单独列全**。「可用背景」网格只列没有任何行动能产出的节点，
   而范例的起点大多是前几程的成果——它们有产出行动，不会出现在网格里。
   如果不额外列出，页面会呈现「背景是空的、却规划出了路线」。载入范例时这些声明单独成块，
   并标明其中多少项来自前几程。

### 4. 数字不写死：两处独立核对

- `tests/example-paths.test.mjs`（4 项）：对每一程按其声明的 `horizon` 真跑规划器，核对状态为 `Found`、
  搜索未被截断、**实测事件数与卡片一致**、无待决入口、每个目标都由某个事件产出；
  另核对起点确实按「基础背景 + 前几程成果」累进且不重复。
- `tests/browser.mjs` 新增 10 项浏览器断言：从卡片上把「实测最短 N 个事件」与「事件界 h = M」解析出来，
  点按钮，等到事件界真的变成 M，再数一遍时间线上的事件数是否等于 N。
  文案与实现一旦脱节，这里就会红。

### 5. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | TypeScript 检查与 Vite 生产构建通过（构建时 Vite 需调用带管道的子进程探测真实路径，本机需在沙箱外执行） |
| `npm run check` | doctor 全部通过（证据 139 条：`reference` 65、`prose-proof` 60、`machine-certificate` 4 等） |
| `npm test` | 内核 + API + **197 项浏览器检查**全部通过 |
| `node tests/example-paths.test.mjs` | 4 项通过（七程实测事件数：9 / 7 / 9 / 8 / 6 / 10 / 7） |

本体规模从 112 节点 / 95 行动变为 **175 节点 / 158 行动**；`tests/core.test.mjs` 与 `tests/api.test.mjs`
里的硬编码计数同步更新（两个文件都写明了这个数字由哪几个案例组成）。

### 6. 未验证 / 未声称

- **只做了上册**。下册（李群与李代数、纤维丛、Kerr–Newman、3+1 分解、拉氏与哈氏形式、共形变换等）
  只在本机节点清单里存在，**未**进入本站。
- **凝练是有损的**。57 个里程碑覆盖 442 页；教材标为选读的 §1.3、§5.7、§8.5–§8.8 只保留了一个节点或
  干脆未列，「紧致性」更是完全不在任何一程的目标里（它没有下游依赖，仍是可读的登记节点）。
- **正文是凝练笔记，不是教材原文的替代**：没有转录教材中的任何证明，
  证据等级因此取 `REF` 而不是 `PROOF`，`checkStatus` 固定 `not_run`。
- **未逐页核对**：章节号与页码与官网目录对齐过，但正文表述没有逐页比对教材原文；
  数学正确性仍需人工复核（这与笔记流水线的免责边界一致）。
- **没有学习者试读**：没有任何人用这条路径实际学过一轮，因此「分七程是否合理」「事件数是否等于学习量」
  都**没有**使用数据支撑。`范例路径` 只声明「结构上跑得通」，不声明教学有效。
- **扫描件文本层的结论限于本次抽样**：结论来自每 7 页取一页的 64 页样本，
  没有穷举 464 页；但 111 个字形码的上限足以判定它无法还原汉字。

---

## 第十六轮：学习路线 → 节点网络回放（2026-10-02）

要求：在学习路线页放一个接口通往节点网络视图，路线规划好后点按钮自动到网络页，生成「从几个节点出发按规划路径向外扩张」的动画；整个动画是可调状态的动态系统，供学习者细看每一步。

### 1. 入口

每条路线卡的头部（不是底部——它是这条路线的主要「看结构」动作，埋在时间线下面会让人以为路线只能按列表读）放一个主按钮 **「在网络里回放这条路线」**，旁边写明「从 N 个起点出发，共 M 步可调」。

URL 形如：

```
/network?play=1&entry=<起点>&path=<按展开顺序的节点>&goal=<目标>&route=<路线 id>
```

**为什么把顺序直接写进 URL 而不是只传路线 id**：规划器结果不入库，路线 id 换个档案或换个预算就失效。把「按什么顺序展开」写进 URL 之后，刷新、分享、浏览器回退都能复现同一段动画。

### 2. 回放是一个可调状态的动态系统

底部控制台提供：⏮ 起点 / ◀ 上一步 / ▶ 播放·⏸ 暂停 / 下一步 ▶ / 终点 ⏭ / 倍速 0.5–4× / **进度条可任意跳步**。切到任意一步都会显示「这一步加入：<节点>」与「用到的已有节点」。播放到最后一步再按播放会从头重放，不会看起来没反应。

控制台放在画布底部而不是做成一个可开关的悬浮框：它是**状态机**，回放期间必须一直在场。进入回放时自动收起全部悬浮框（左侧列表与右侧推荐正好压在画布两边），只收起、不记住。

### 3. 实现要点

- **布局只算一次**：进入回放把「已加入集合」设成整条路线的全部节点，可见性在渲染期过滤。这样步骤切换时节点不会跳位置——学习者可以把注意力放在「谁先出现」上。两端有一端不可见的边不画，否则箭头会指向一片空白。
- **起点为空时退化**：规划器给出的大多数路线 `entry` 是空的（背景节点由调用方临时声明）。若起点为空，第 0 帧什么都没有、第 1 步一次性冒出全部节点——那不是「向外扩张」。因此没有背景入口时用**第一个被产出的节点**当种子。这不是编造：那个节点确实是这条路线里最先立住的东西。
- **动画判据要换**：普通模式用 `justAdded`（加进视图的瞬间）触发入场动画，但回放里全部节点从第一帧起就在视图中，只有可见性在变——用错判据会导致回放完全没有入场动画。回放改用「这一步刚加入」。
- **不写任何状态**：进度、播放、倍速都是本页局部状态，不写 URL、不写本体、不写学习档案。拖动进度条不该在浏览器历史里留下几十条记录，也不该被当成学习行为记账。

### 4. 修的四个坑（都是实测出来的）

1. **回放参数被自己冲掉**。`setAdded` 原先直接写 `?nodes=…`，把 `play/entry/path/goal/route` 一并抹掉——现象是「点了回放按钮，地址栏闪一下变成 `/network`，回放面板从没出现」。进入回放时本页会调用 `setAdded`，于是刚进来的第一帧就把自己踢出了回放模式。改成写入时保留回放参数。
2. **本体图没到位就写入**。那条 effect 只依赖 `replayPlan`，在首帧（`knownIds` 为空）就跑了；而 `setAdded` 会用 `knownIds` 过滤，于是整条路线被过滤成空集——现象是「回放面板出现了，但画布上一个节点都没有」。
3. **控制台遮住节点**。适配没把控制台高度让出来，实测最后一步「函数极限的 ε–δ 定义」整张卡片躲在控制台下面。改为用 ResizeObserver 量真实高度并纳入适配签名（否则测出来之后不会重新适配）。`contentRect` 比视觉高度小 15px（不含 padding 与 border），因此取 `contentRect` 与 `offsetHeight` 的较大值，另加 28px 安全边距。
4. **`fitView` 只跑一次**。适配签名原先不含控制台高度，而首次回调发生在这一轮之后，于是用的始终是旧高度。

### 5. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | TypeScript 检查与 Vite 生产构建全部通过 |
| `npm run check` | doctor 全部通过 |
| `npm test` | 51 项内核 + 13 项 API + **187 项浏览器检查**全部通过 |

新增浏览器断言 7 项：路线卡带网络回放入口（含 `play=1` 与 `path=`）、回放起点只有种子节点、**回放逐步向外扩张且不回头**（节点与边单调不减且确实增加）、每一步说明加入了什么、**回放内容不被控制台遮住**、进度条可直接跳到任意步、退出回放不残留回放参数。

### 6. 未验证

- 回放**未做试读**：没有学习者用过它来判断「这个动画是否真的帮助构思每一步」。
- 回放**不写学习档案**，因此也无法从事件记录里看出谁用过、在哪一步停得最久；这符合 M/E/D 边界，但也就没有使用数据。
- 进度条按「节点出现顺序」切步，**不区分事件类型**（例如某个事件只消费不产出时会被跳过）。URL 里不携带事件信息，因此链接分享出去后无法还原「这一步是哪条行动」——只有从路线页点进去的那一次能看到行动标题。
- 倍速只影响自动播放，**没有做「停在某一步时高亮该步用到的已有节点」**；目前只以文字列出。
- 全库 112 节点规模的路线回放未测（本次只测了 5 节点的极限路线）。

---

## 第十五轮：网站介绍页与学习方法论页，首页最显眼入口换位（2026-10-02）

两项要求：根据工作区里的研究专稿与 arXiv 论文写一篇详细的网站介绍，把入口放到首页最显眼的位置、替代原位的「浏览数学对象」；旁边放通往最通用数学学习方法论的按钮。

### 1. 首页英雄区换位

```
[这个网站是什么]  ← 主按钮，指向 /intro（原来是「浏览数学对象」→ /nodes）
[数学学习方法论]  ← 副按钮，指向 /method
[打开学习路线]    ← 保留，降为 ghost
```

同时把两个入口加进主导航（`这是什么` / `学习方法论`）。主导航项数 7 → 9，两处断言随之更新。

### 2. 介绍页 `/intro`：六个小节

内容写在 [`web/src/intro-content.ts`](web/src/intro-content.ts)，**不放进本体 `data/`**——M 记录的是数学对象及其证据，站点自我介绍是元层内容；混进本体会让「M 是数学资源」这条边界失效，也会污染版本哈希（改一句文案不该改变数学本体的版本号）。做成数据也让内容能被测试逐条核对。

| 小节 | 内容 | 依据 |
|---|---|---|
| 它要解决什么问题 | 两个具体失效：把「提到某概念」当「证明依赖它」；把「换了表达」当「条件没丢」。给出构造链 | 发布总纲 §1 |
| 三层分离 M/E/D | 三层各存什么，为什么只有 E 接受写入 | 论文 §4，prop:readonly（PROOF） |
| 关系是分类型的 | 八种关系的权重表（1.00 → 0.40）；同一张表决定线宽、颜色、推荐顺序、布局吸力 | `web/src/relation-visual.ts` |
| 每个断言都标证据状态 | 六种标签的含义与边界 | `mcs-foundations/15-验证与完成标准.md` |
| 研究基础与论文 | 论文题名、四个主结果、复现材料、投稿状态 | `mcs-foundations/arxiv/`、发布总纲 §4 |
| 明确不声称什么 | 五条不做声称，含「不断言教学收益」「不声称完整机器认证」 | 发布总纲 §4「关于新颖性」、论文 §10 |

一段式介绍**逐字取自**发布总纲的对外定位段落，未改写——改写会让站内说法与专稿不一致。

**规模数字运行时现取**（`/api/v2/health`），不写死在文案里：本体从 102 个节点长到 112 个时，写死的介绍会立刻变成假话。测试断言「介绍页登记节点数 === 本体 counts.nodes」。

### 3. 方法论页 `/method`：八条 + 模板骨架

内容整理自 `MCS_vault/MCS/methodology/认知发展笔记.md` 与 `MCS_vault/MCS/template/Mathematical_Note_Template_for_Specific_Objects.md`，**不改写原文**。每条给「一句话结论 / 怎么做 / 为什么有效 / 出处」——不给理由的原则只会变成口号。

八条：全然内源（用自己的话重写）、要有证据、删掉某个条件会怎样、动机溯源、保留试错途径、总结与命名再加工、积极构建策略、类比先让步再节制。另附模板骨架八项（前置知识分三层、动机分两段、形式含七问、证明概括先行、应用分直接与间接、推广三问、常见误解与个人启发、总结与回看）。

**空的地方就空着**：页面明确列出没有收录什么——`构造反例的方法.md`、`内省.md`、`直觉的建立与失效.md` 三份在生产目录中是 **0 字节**；`认知发展笔记.md` 的《类比中的让步》与《为什么要这样做？》是空标题。不替它们补一段听起来合理的话，那会让「未验证」变成伪造的已验证。

### 4. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | TypeScript 检查与 Vite 生产构建通过 |
| `npm run check` | doctor 全部通过 |
| `npm test` | 51 项内核 + 13 项 API + **178 项浏览器检查**全部通过 |

新增浏览器断言 11 项：主按钮已换成网站介绍、介绍按钮旁是学习方法论、首页不再把「浏览数学对象」放在最显眼处、介绍页可访问并给出总题、**介绍页规模与本体一致**、写明不声称教学收益、给出论文主结果、**站内锚点都能落地**、方法论页可访问、含「删掉条件会怎样」、如实列出未收录内容。

「锚点都能落地」这条是补的坑：底部阅读顺序链接原本指向 `#intro-entries`，而那个 id 从没被渲染出来（「从哪进」一节是手写 section，没有 id），点上去什么都不发生。锚点是静默失败的东西。

### 5. 未验证

- 介绍页的**论文要点是我从 main.tex 与摘要转述的**，未逐条与作者确认表述；研究主张的最终口径以论文本身为准。
- 方法论页是**对现有笔记的整理，不是新的方法论主张**；八条原则的有效性未经教学实验检验。
- 介绍页列出的「论文分类建议 cs.AI、交叉列表 cs.LO 待定」是投稿字段里的建议值，**未投稿、未经同行审阅**。
- 两个新页面**未做试读**；发布总纲要求「至少一次外部试读」这一条仍未满足。

---

## 第十四轮：斥力 + 按关系强弱的吸力 + 话题配色（2026-10-02）

三项要求：给节点之间加斥力、给关系按逻辑强弱分配吸力、按节点话题自动分配颜色组。

### 1. 斥力

所有节点两两相斥，并按**度数**加权（最多 +12×0.12 倍）：枢纽节点斥得更远。不加权时枢纽会把一圈邻居压在身边，局部密到读不出来。

### 2. 吸力按逻辑强弱分配

吸力**直接取自 `relation-visual.ts` 的视觉权重**（`edgeVisual` 的 `weight`）：

```
吸力 = (0.08 + weight × 1.35) × (关系边 ? 1.6 : 1)
```

因此硬关系（`hardPrereq` 1.0、`hardGeneralization` 0.95、带 PROOF 见证）吸得最紧，行动契约 0.18 次之，同一话题 0.05 几乎不吸。加 0.08 的底是刻意的：没有底项时同话题节点会随机漂开，话题聚类就散了。

**用同一张权重表是关键**：线宽、颜色、推荐理由的强弱顺序、吸引强度四者出自同一个数，不会出现「画得很粗却几乎不吸」这类自相矛盾。

### 3. 话题配色

新增 `topicAssignment()`：按本体的 `topic` 聚合**块**分配颜色，不是整条聚合。这一条是必须的——dg 的 `agg-dg` 有五个块，把整条聚合当一个话题会让 30 个节点同色，等于没分组。同一块同色；块序按「聚合 id → 块序」固定，因此分配确定。未归入任何话题的节点用中性浅灰紫（`TOPIC_NONE_COLOR`），不硬塞进某个话题。

配色用 10 色浅底调色板（`TOPIC_PALETTE`），明度压低以保证卡片上的深色文字仍清楚。图例只列**画布上真有的**话题与条数——全库有 11 个话题块，列全会把图例挤满，且大多数与眼前这张图无关。

图例标签有一处细节：多块聚合共享同一段前缀（「微分几何：机制与切空间 · 组1/3/4」），从前往后截断会让三块变成同一个字符串。`topicLegendLabel()` 把截断点放在组号**前面**，组号始终可见，完整标题在 title 提示里。

### 4. 顺带修掉的两个缺陷

1. **移除 `gridLayout`**：力导向已直接产出最终位置，网格排布成了死代码（它当初是为了绕开「力参数压不住弹簧导致 48 对重叠」）。现在「不重叠」由新的 `relaxToSpacing` 负责，职责单一。
2. **尺度不归一化**：力导向的绝对尺度由斥力常数决定、与节点数无关。实测两个节点被拉到 **914×427**（四个方向全是空白），112 个节点摊到 **5147×6281**。现按节点数算目标面积整体等比缩放（限幅 0.05–1.6），实测：

| 规模 | 跨度 | 重叠 |
|---|---|---|
| 1 节点 | 0×0 | 0 |
| 2 节点 | 336×157 | 0 |
| 10 节点（dg 跨三话题块） | 652×464 | 0 |
| 112 节点（全库） | 3082×2853 | 0 |

### 5. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | TypeScript 检查与 Vite 生产构建通过 |
| `npm run check` | doctor 全部通过 |
| `npm test` | 51 项内核 + 13 项 API + **167 项浏览器检查**全部通过 |

新增浏览器断言 4 项：力导向给出非网格坐标、**斥力让卡片互不重叠**（最小相对间距 ≥ 1）、**强关系两端比弱关系更近**、按话题自动分成多个颜色组且同话题同色。

写第 4 条时踩了一次测试自身的坑：最初用一组「全是流形结构」的节点做样本，它们本来就同属一个话题块，只得到一种颜色——那不是配色出错，是我的样本没跨话题。改成「流形结构 / 切向量 / 微分形式」三块各取若干后才是有意义的断言。

### 6. 未验证

- 力参数（`K=260`、`REPULSION=K²×4.2`、600 轮）是按「边长稳定在两三百像素」调的，**没有做感知或可用性测试**；更密的图（数百节点）表现未测。
- 112 节点全库下单次布局约 3.4 秒（含 600 轮 O(n²) 迭代与 relax），**没有做性能优化**（如 Barnes–Hut 或空间网格）。
- 话题配色的「10 色循环」在超过 10 个话题块时会重复用色；全库 11 块已经出现一次复用，未做视觉区分度评估。
- 吸力强弱与「学习者觉得哪些节点该靠近」是否一致，未经学习者检验。

---

## 第十三轮：方法节点、推荐分类、局部技巧自动加入、右键删除（2026-10-02）

四项要求：编写方法节点、给「推荐加入」加分类并把方法类区分出来、局部技巧与视图连接数超过三条时自动加入、右键删除节点。

### 1. 方法节点：从 6 个补到 16 个

原有 6 个方法节点（`bg:misc:counterexample-method` + 五个案例各 1–2 个），其中 **dg 案例一个都没有**。本轮新增 10 个，全部是**局部技巧**（`LocalMethod`）：

| 案例 | 新增方法 |
|---|---|
| dg | 用反函数定理核验候选映射、在原点上验证闭形式是否恰当 |
| limit | 用相邻项比值判定增长量级、用邻域估计替代逐点求值 |
| manifold | 先用有限张图覆盖再逐图验证、用延拓检验判定光滑性 |
| tensor | 逐个代入上下指标验证变换律、用维数计数区分同构与同构的具体实现 |
| group | 用小阶乘法表核验公理与交换性、用元素阶数比对两个群 |

现在 16 个方法中 **13 个局部技巧 + 3 个全局方法**，五个案例各有 2–4 个。

**证据纪律**：方法不是命题，不能证明也不能反驳。因此每个方法的证据等级只写 `DEF` 或 `ILLUSTRATION`（**绝不写 `PROOF`**），`checkStatus` 固定 `not_run`，obligations 写明「未编码为 ND 证书」。测试里有一条断言专门核对这一点。

**正文**：十个方法节点各写了一段正文（什么时候用 / 步骤 / 为什么这个顺序 / 失效范围 / 回看提问），并**显式声明**它们是从源笔记的推导步骤**提炼**的、语料里没有同名条目。

dg 的两个方法写在新建的 [`data/cases/06-dg-methods.md`](data/cases/06-dg-methods.md)，**不与生成的 `05-differential-geometry.md` 混放**——后者由 `scripts/build-dg-case.mjs` 每次重跑覆盖，方法块放在那里会被冲掉。

### 2. 推荐加入：按节点分类分组

新增 `groupOfNode()`，按 `construct` + `roles` 把节点分成八类，其中**方法类单独两组**：

- **局部技巧**（`Method` + `LocalMethod`）：任务形状明确、步骤可枚举。
- **全局方法**（`Method` + `GlobalMethod`）：跨场景策略。
- 概念与定义 / 断言与证明 / 例子与反例 / 问题与练习 / 表征 / 其它。

面板顶部是分类筛选 chip（带每类条数），下面按组列出，组序固定、组内保持原来的理由强弱排序。方法类的组标题与 chip 用独立配色，画布上方法节点也有**左侧色带**（局部技巧青色、全局方法紫色），一眼可分。

### 3. 局部技巧自动加入：判据是「视图 ∪ 一跳邻域」

规则（用户指定）：局部技巧与视图建立**超过三条**链接时自动加入。

实现时踩了两次，两次都实测过：

1. **先按「与全库相连的节点数 > 3」**：往空视图里放**一个**无关背景节点就自动拉进了 **11 个**方法——每个方法在全库都有 4–5 个邻居，判据与视图无关，等于无条件加入。
2. **改成「只数视图内的直接连接」**：又太严。方法节点在设计上不直接连到它要用的概念上，它连的是引入它的那个行动契约。实测 5 节点视图、4 节点视图、单节点视图，三种情况方法都是 **0 个**。

现在判据是「它的直接邻域 ∩（视图 ∪ 视图的一跳邻域）> 3」。实测：

| 视图 | 自动加入 |
|---|---|
| 张量案例 5 个核心概念 | 2 个张量方法 |
| 极限案例核心 | 3 个极限方法 |
| 只放一个无关背景节点 | **0 个** |

自动加入的节点在画布上带橙色小圆点，`<title>` 里写明「由『局部技巧自动加入』规则加入」，可逐条核对。被手动移除过的节点不会被再次自动加入（手动删除是明确意图）。

### 4. 右键删除节点

右键任意节点 → 移出视图，只改 URL 里的已加入集合，**不删除本体节点、不写任何状态**。底部给一条 6 秒的可撤销提示（「已把「X」移出视图。这只改本页显示，本体节点仍在。」+ 撤销按钮），不弹窗打断。`Delete` / `Backspace` 与右键同义，键盘用户也能移除。

### 5. 过程中修掉的两个自身缺陷

1. **拖动节点会触发相机重新适配**（严重）。自动适配的签名里包含了节点坐标，于是拖动每移动一像素就重算一次适配——实测拖到一半，相机从 scale 1.949 跳到 3.0、offset 整体平移，节点被甩到别处，松手后停在 (110,113) 而不是落点 (40,76)。签名改为只取**结构量**（已加入的 id 集合 + 边数）。
2. **`avoidOverlaps` 不收敛**。原实现按「沿重叠较小的轴推开」迭代，但卡片是横向宽的（172×58）：水平分开要 192、垂直只要 70，两个轴代价差三倍，贪心会在两轴之间来回——垂直分开第一张卡就压到第二张，水平推开又回到第一张。实测 40 轮迭代后随机 400 例残留 **506 对**重叠；改用「螺线搜索」也不行（6 像素的候选格点够不到 70 的偏移量）。

   最终改成**直接构造**：先算「垂直一次让开所有水平相邻卡片」的目标 y（上下取位移小者，且候选必须已在正坐标区间内——事后夹到 MARGIN 会让验证过的坐标又压回别人身上），被两侧夹住时改为水平移到所有垂直冲突卡片右侧之外。**708 例压力测试（结构化网格 + 随机落点）全部通过**。

### 6. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | TypeScript 检查与 Vite 生产构建通过 |
| `npm run check` | doctor 全部通过 |
| `npm test` | 51 项内核 + 13 项 API + 162 项浏览器检查全部通过 |

新增内核断言 2 项：方法节点必须声明分类（且不能同时是局部与全局）、五个案例各有 ≥2 个方法、方法证据不得写成 `PROOF` 且每条以方法为主体的证据都要写明未编码义务。

计数随数据更新：节点 102 → **112**、行动 85 → **95**、证据 71 → **76**。

### 7. 未验证

- 十个方法节点的**正文与步骤**是从源笔记推导步骤提炼的，数学正确性留人工复核；语料里没有同名方法条目，这一点已写进 provenance。
- 「超过三条」的阈值写死在 `autoAddCandidates` 的 `threshold` 参数（默认 3），界面上没有暴露调节入口。
- 方法节点的**教学内容**（自检题、回看提问）未经学习者试用。
- 拖动后自动让开的位置可能离落点较远（被两侧夹住时改为水平让开），未做过渡动画，视觉上会跳。

---

## 第十二轮：原型问题栏目按领域归类并充实（2026-10-02）

用户要求：完善并丰富首页的「原型问题」栏目，按领域把问题归类。

### 1. 按领域归类（数据里已有的字段）

领域取自**每个节点自己的 `discipline` 字段**，而不是给案例硬贴一个标签。案例是「一条思路」，领域是「它在数学里的位置」，两者是多对多的：

| 分组 | 思路数 | 节点数 | 案例 |
|---|---|---|---|
| 分析 | 1 | 14 | 极限与连续 |
| 几何与拓扑 | 2 | 51 | 微分几何（36）、$C^k$ 与光滑流形（15） |
| 代数与几何 | 1 | 15 | 张量与张量场 |
| 代数 | 1 | 13 | 群的多来源 |

**归档用「多数学科」而不是「任意一个」**：微分几何的 36 个节点里 18 个是「几何与拓扑」、10 个「代数与几何」、6 个「拓扑」、2 个「分析」。取任意一个会随机落到四个分组之一、不稳定；取多数则稳定落在「几何与拓扑」，同时卡片上列出**完整的学科分布条**，不让「它其实也横跨分析」这件事被藏起来。

空分组不出现在页面上——不为排版好看保留空壳。

### 2. 卡片充实：全部由本体现场派生

不写死数字，因此不会与 `data/` 脱节。卡片上新增：

- **胚子**：这条思路最初的那个具体困惑（人工撰写，属于「自然动机」而非数据）。
- **学科分布条**：学科 → 节点数，带比例条。
- **构造分布**：概念 / 命题 / 证明 / 例子 / 反例 / 构造 / 问题 / 方法 / 误区，各几个。
- **反例与误区**：直接链到该节点。这是 AGENTS.md 里「条件即反例」「预见常见误解」两条要求在界面上的落点。
- **统计行**：行动契约数、登记关系数、证据等级分布。
- **第三个入口**：`全部 N 个节点` → `/nodes?case=<id>`。

新增纯函数模块 [`web/src/case-catalog.ts`](web/src/case-catalog.ts)：`describeCase` 与 `groupByDiscipline`，不读时间、不读随机数。

### 3. 顺带修掉两处数学记号渲染错误

- `C^k` 在**卡片标题**里被 GFM 当成上标语法，渲染成带脱字符的「C^K」。改为经 `CASE_MATH` 取 LaTeX 源交给 Markdown 排版。
- `CASE_LABELS` 保持纯文本（它出现在 `<option>` 与 SVG 文本里，不能排版），并新增 `plainMathText()` 把少量记号换成 Unicode 上标（`C^k` → `Cᵏ`），供 SVG `<text>` 使用。**不做通用 LaTeX 转换**——那是排版引擎的活。

修复后首页与「继续学习」网络里都不再出现字面 `C^`。

### 4. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | TypeScript 检查与 Vite 生产构建通过 |
| `npm run check` | doctor 全部通过 |
| `npm test` | 48 项内核 + 13 项 API + **160 项浏览器检查**全部通过 |

新增浏览器断言 10 项，其中最关键的一条是**卡片节点数与本体一致**：测试从 `/ontology/graph` 取各 case 的真实节点数，与卡片上显示的数字比对。这样「把数字写死」这种漂移会被立刻抓住，而不是等几个月后有人发现对不上。

其余：栏目存在、按领域分组（≥3 组）、每组标出思路数与节点数、五个案例各出现一次、每张卡给出胚子/学科分布/构造分布/行动与关系计数、三个入口、含数学记号的标题按公式排版、页面上没有字面 `C^`。

### 5. 未验证

- **学科归类用的是「多数学科」**，因此微分几何只出现在「几何与拓扑」下。它同时横跨分析、代数与拓扑这件事只体现在卡片内的分布条上，没有做跨组重复出现（那会让栏目里出现重复卡片）。
- 「胚子」文案是人工撰写的，**不是语料字段**；它是自然动机，不声称有文献依据。
- 证据等级分布直接显示 `DEF / PROOF / ILLUSTRATION / FINITE` 等原始值，未加中文解释——节点页有解释，首页没重复。
- 领域分组在窄屏下的排布未逐项核对。

---

## 第十一轮：首页「继续学习」升级为局部网络视图（2026-10-02）

用户要求：把首页的「继续学习」框升级为局部节点网络视图，**以上次学习的节点为中心**，向四周扩展强关联节点；**上下左右分别对应不同的话题**，与中心节点强关联的节点按话题归类，**话题决定这些节点与中心的相对位置**。

### 1. 空间约定（这是本功能唯一需要记住的规则）

- 中心 = 上次学习的节点（最近一条 `view` 事件）。
- **上 / 右 / 下 / 左 各对应一个话题**。中心所属话题固定放「上」；其余话题按「与本中心的强关联条数」降序排进 右 → 下 → 左；超过四个话题时环形复用方向并加大半径。
- 每个话题的节点从中心沿该方向向外排开：**离中心越近，关联越硬**。
- **没有邻居的方向不画**——不为了凑满四个方向而编造话题。

实现是纯函数 [`web/src/continue-network.ts`](web/src/continue-network.ts)：不读时间、不读随机数，同一输入必得同一布局。

### 2. 「强关联」只取已登记依据

按强弱排序，同一节点只保留最强的那条理由：

| 依据 | 来源 | 说明 |
|---|---|---|
| 登记关系 | `relations` | 有种类与见证状态，最硬 |
| 行动契约 | `actions` 的输入/输出 | 中心是产出→看它的前提；中心是前提→看它能推出什么 |
| 共用前提 | 同一行动的两个输入 | 弱于契约 |
| 同一话题 | `aggregates`（只取 `topic` 类型） | 最弱，仅登记上的同组 |

没有这四类依据的节点**不进这个视图**——它不是一个「全体近邻」面板，而是「有据可依的下一步」。已确认掌握的节点不再重复推荐。

`discipline` 类型的聚合被刻意排除：它粒度过粗（「分析」会把极限与微分几何的节点混在一起），不适合当作方位话题。

### 3. 排版按卡片几何求解，不靠试参数

同一个方向内的多个邻居必须不重叠。做法是把重叠条件写成不等式再解步长，而不是调角度：

- 两张卡片**重叠**当且仅当 `|Δx| < 卡宽` **且** `|Δy| < 卡高`；因此只要满足其中之一就不重叠。
- 径向步长取 `卡高 + 16`、切向步长取 `卡宽 + 20`，于是相邻两卡要么径向差一个卡高、要么切向差一个卡宽。

踩过两次：「按角度扇形展开」的间距与卡片尺寸无关，实测 3 个邻居重叠 1 对、5 个重叠 2 对；「按话题数估算画布尺寸」会把最外侧卡片裁掉（实测某节点 y 坐标算成 -15，卡片画到画布外）。现在画布尺寸由**实际落点包围盒**决定。

### 4. 修掉一个选错中心节点的缺陷（踩了两次）

「上次学习」的判定错了两次：

1. 先写成「比较 `occurredAt` 取最大」——同一秒内的多条事件字符串相等，会保留先遍历到的那个。
2. 再写成「取第一条匹配」——但 `server/db.mjs` 的 `listEvents` 在 `ORDER BY seq DESC` 之后又 `.reverse()` 了一次，接口实际返回**时间升序**，所以第一条是最**旧**的。实测把「上次学到光滑流形」显示成「拓扑空间」。

现在取最后一个匹配项，并在注释里写明接口的排序方向（这一点不看 `db.mjs` 是猜不到的）。

### 5. 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | TypeScript 检查与 Vite 生产构建通过 |
| `npm run check` | doctor 全部通过 |
| `npm test` | 48 项内核 + 13 项 API + **148 项浏览器检查**全部通过 |

新增浏览器断言 9 项：有局部网络视图、中心是上次学习的节点、画出强关联邻居、邻居卡片全部在画布内、邻居卡片不重叠、每个方向对应一个话题、依据来自本体（关系或契约）、视图配有可点的节点列表、邻居列表指向并可到达节点页。

实测四种中心（1 个方向 / 3 个方向 / 4 个方向 / 单话题）均无裁切、无重叠：

| 中心 | 邻居 | 方向数 | 画布 |
|---|---|---|---|
| 拓扑空间 | 3 | 1 | 上 |
| 函数极限的 ε–δ 定义 | 3 | 1 | 上 |
| (r,s) 型张量空间 | 5 | 3 | 上 / 右 / 下 |
| 群 | 3 | 1 | 上 |

### 6. 未验证

- **只画每个方向最多 3 个节点**，更多的用「还有 N 个」注明。这个 3 是排版考虑，不是数据上限；更大的取值会让首页这张图过高。
- 方向分配是**按话题的关联条数降序**填 上→右→下→左。它稳定、可核对，但**不代表任何语义上的方位含义**（不是「越难越靠下」之类）。
- 卡片点击目前只跳转到节点页。「点了邻居就把中心切过去」的交互已实现（同页内有效），但导航离开首页后会重置——未做成跨页面记忆。
- 触摸设备与小屏下的排布未逐项核对。

---

## 第十轮：动态网络视图（拖动节点 + 新边生成动画）（2026-10-02）

用户要求把网络视图做成 Obsidian 那样的动态图：可以拖动节点，新加入节点时新箭头要有生成动画。

### 1. 拖动节点

`applyOverrides()` 把手动摆放的坐标叠加到网格布局结果之上——网格是算出来的，没有这层覆盖，节点会被下一次重算拉回格子。拖动只改坐标，不改边、不改度数、不改连通性，**不写公共本体（M），也不写学习者档案（E）**。

三个必须处理对的细节：

- **区分点击与拖动**：位移小于 4px 视为点击（打开详情），否则视为拖动，并吞掉随之而来的 `click`。不这么做，每次想点开节点都会因为「它没动」而失效，或者拖完顺手弹出详情面板。
- **位移要除以缩放**：指针位移是屏幕像素，节点坐标是世界单位。不折算的话放大到 250% 时拖一点点节点就飞出去。
- **落点要消解重叠**：`avoidOverlaps()` 只推开**被拖动的那个**节点（其余节点是算法或用户先前的决定，不该被这次拖动改动）。把卡片停在另一张上面会直接遮住关系——这正是用户此前抱怨过的「节点堆叠导致关系完全不可见」。实测：把节点拖到另一张正上方，放手后被推开，重叠对数 0；拖到空白处则保持落点不动。

位置按节点 id 存 localStorage，刷新后仍在原处。**双击节点**放回算法位置（卡片边框为虚线时表示已手动摆放）。

### 2. 新边生成动画

新加入节点时，指向它的边用 `stroke-dasharray` + `stroke-dashoffset` 从「整段未画出」画到完整，620ms；新节点淡入并轻微放大，520ms。动画期间该边的虚线节奏被临时取消（虚线与描边动画会互相打架），结束后恢复。

两个技术点：

- **路径长度从渲染处传入**（`--edge-len`），因此不同长度的边动画速度一致，不会短线一闪而过、长线还在爬。
- **入场缩放必须挂在内层 `<g>` 上**。CSS 的 `transform` 会覆盖 SVG 的 `transform` 属性——直接给带 `translate` 的那层加 `scale`，节点会掉到画布原点。位移（属性）与缩放（CSS）分层，两者才能叠加。测试里专门有一条断言核对这个嵌套关系。

`prefers-reduced-motion: reduce` 时全部关闭。

### 3. 过程中修掉的三个自身缺陷

1. **连续加入时动画随机丢失**。原先在 `setAdded` 的闭包里算「新增了哪些节点」，一旦遇到连续加入或 React 批处理就算不出新增项——实测第 4 个节点没有生长动画。改为在 effect 里比较「这一轮的 added 与上一轮」，以实际变化为准。
2. **动画判定依赖了边的方向**。`dedupePairs` 保留「首次出现」的方向，是任意的（同一批 topic 边里新节点有时当 `from`、有时当 `to`）。原先写 `justAdded[edge.to] && !justAdded[edge.from]`，新节点当 `from` 时动画就丢了。改为按集合判断。
3. **React #310 把整页打白**。我把新的 `useMemo` 放在了 `if (graph.loading) return` 之后——加载态与就绪态的 hook 数量不同，React 直接抛 "Rendered more hooks than during the previous render"。已移到所有提前 return 之前，并在注释里写明原因。

另外把 `setPointerCapture` / `releasePointerCapture` 包进 try/catch：合成事件或指针已失效时它们会抛错，不该让拖动静默失败。

### 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | TypeScript 检查与 Vite 生产构建通过 |
| `npm run check` | doctor 全部通过 |
| `npm test` | 48 项内核 + 13 项 API + **138 项浏览器检查**全部通过 |

新增浏览器断言 13 项：节点可拖动、拖动后标记为手动摆放、拖动位置写入 localStorage、刷新后保留、拖动不误开详情面板、双击复位、拖到别的节点上不留重叠、拖到空白处停在该处、新边带生成动画、生成动画从「未画出」开始、动画结束后清理标记、入场动画挂在内层、可见区内有可点中且有连接的节点。

### 未验证

- 拖动**手感**（跟手程度、惯性、多选拖动）未做主观评估；只验证了坐标正确。
- 触摸屏上的拖动未测（用的是 CSS `touch-action: none` + pointer 事件，理论可用）。
- 手动摆放后再加入新节点，网格会重排未拖动的节点，视觉上会跳动——未做过渡动画。
- 动画在大量节点同时加入（如粘贴一长串 URL）时的表现未测。

---

## 第九轮：关系可视化条款（2026-10-02）

用户指出：**图例里的关系种类不少，但画布上看不到关系**；要求把关系箭头加粗、提高颜色饱和度，并在站内设计一份「关系可视化条款」，总体遵从**关系越硬、视觉越明显**。

### 1. 先确认为什么「看不到关系」

量化那 14 个已加入节点的网络（画布 73 条边）：其中 **94 条有向边属于最弱的「同一话题」**，只有 **3 条**是本体里登记的语义关系（应用 / 特化 / 硬泛化）。旧渲染给这 3 条 2.4px、给 94 条 1px/0.42 不透明度——**硬关系被淹没了**。

所以问题不是「画漏了」，而是两件事叠加：本体里语义关系本来就少（全局 32 条），而渲染没有把「硬度」变成「可见度」。

### 2. 关系可视化条款（`web/src/relation-visual.ts`）

把每一类关系映射到 **0–1 的视觉权重**，再由权重统一推出线宽、不透明度、虚线节奏、颜色饱和度与是否标注文字。三条依据都能在公共本体里核对：

1. **关系种类强度**：`hardPrereq` 1.0 > `hardGeneralization` 0.95 > `specialization` 0.9 > `application` 0.72 > `crossDomain` 0.68 > `duality` 0.62 > `bridge` 0.56 > `analogy` 0.4（类比在 `ILLUSTRATION` 下登记，明确不构成同构，故最弱）。
2. **见证状态**：`PROOF` 1.0 > `FINITE` 0.95 > `DEF` 0.82 > `REF` 0.7 > `ILLUSTRATION` 0.62 > `NOT-CLAIMED` 0.6。
3. **边源家族**：`contract` 0.18 > `sharedInput` 0.13 > `support` 0.11 > `evidence` 0.09 > `pattern` 0.08 > `topic` 0.05。

五个视觉层级与实际渲染值：

| 层级 | 含义 | 线宽 | 不透明度 | 线型 | 标注 |
|---|---|---|---|---|---|
| 核心断言 | 不满足就不成立，带 PROOF | 4.6 | 1.0 | 实线 | 是 |
| 强关系 | 特化 / 应用 / 跨域 / 对偶 | 3.2 | 0.95 | 实线 | 是 |
| 结构性关系 | 桥接 / 类比 | 2.2 | 0.85 | 虚线 | 是 |
| 行动骨架 | 行动契约 | 1.7 | 0.6 | 虚线 | 否 |
| 登记关联 | 同话题 / 共用前提 / 同一证据 / 支持依赖 | 1.1 | 0.34 | 细虚线 | 否 |

**硬性不变量**：任何语义关系都必须强于任何结构关联——用**最弱见证**去检验每种关系（`assertHierarchyHolds()`）。写这条断言时它立刻抓出一个真问题：`analogy` 在 `NOT-CLAIMED` 下只有 0.2，而当时 `contract` 是 0.34——**规范与数值自相矛盾**。修法是压低族边上界（`contract` 0.34 → 0.18）并把 `NOT-CLAIMED` 的修正从 0.5 提到 0.6，让声明成立。

### 3. 其他改动

- **颜色提饱和**：`saturate()` 只动 HSL 的饱和度，不动色相与明度——色相承载「哪一种关系」，明度承载可读性。实测三条硬关系渲染为 `#115cff`（硬泛化）、`#8753ff`（特化）、`#ce8b00`（应用）。
- **箭头按层级分四档**，与线宽同阶；细线配大箭头会显得头重脚轻。
- **修正一处方向性错误**：早先把箭头挂在权重档位上，结果契约边（低权重）丢了箭头——**方向信息被样式规则吃掉了**。现在方向性由边源决定：契约与语义关系有向，「登记关联」五类是无向同组关系，刻意不给箭头。
- **硬关系在缩放 ≥ 85% 时直接在画布上标注名称**（白描边保证压在线上也可读）；密集时只有细线，不加标注以免糊成一片。
- **站内「关系可视化条款」面板**：逐档给出线宽 / 不透明度 / 线型 / 是否标注、每档当前条数，并列出当前网络里出现的关系种类及其权重。底部图例改为「越硬越重」五档示意。
- 修正契约线颜色：原先用 `ink`（近黑）作基色，在浅色画布上**比关系线更抢眼**，与规范冲突；改用中性紫灰 `THEME.contractEdge`。

### 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | TypeScript 检查与 Vite 生产构建通过 |
| `npm run check` | doctor 全部通过 |
| `npm test` | 48 项内核测试（含新增 6 项条款不变量）+ 13 项 API + 125 项浏览器检查全部通过 |

新增测试：
- `tests/relation-visual.test.mjs`（6 项）：权重表完整合法、硬关系排序符合数学强度、**任何语义关系强于任何结构关联**、视觉参数随权重单调、`edgeVisual` 对未知种类退化为弱边而不抛错、`saturate` 只改饱和度不改色相。
- 浏览器 8 项：关系线比结构线粗/实、每条边带视觉权重、硬关系带箭头且标注名称、契约带箭头、无向关联不带箭头、条款面板存在且写明「越硬越重」并给出线宽与不透明度。

### 未验证

- 视觉权重是**设计取值**，不是从认知实验或用户测试得出的；「0.72 比 0.68 更明显」这类相邻差在屏幕上能否分辨未做感知测试。
- 条款面板与图例在窄屏下的排布未逐项核对（图例已改为单行横向滚动）。
- 画布标注只在缩放 ≥ 85% 时出现；更密的网络下标注是否仍不重叠未测试。

---

## 第八轮：重做相机模型与布局（2026-10-02）

用户报告三个缺陷：**滚轮放大时内容往左上角飞**、**节点主体不居中**、**节点堆叠导致关系不可见**。三个都复现了。

### 1. 放大往左上角飞（根因三层，逐层剥开）

**第一层：viewBox 与 preserveAspectRatio 造成实际比例 ≠ 名义比例。**
旧实现把「可用区算出的比例」塞进一个覆盖整个 stage 的 viewBox，再由 `xMidYMid meet` 二次缩放；实际比例是 min(sx, sy)，与 `scale` 不符。于是「以光标为锚点」的公式算错了位置。

**修法**：换成显式相机模型。`viewBox` 恒等于画布像素尺寸，`<g transform="translate(...) scale(...)">` 承载相机。相机 = `screen = world * scale + offset`，`scale` 就是真实比例，不再有二次缩放。

**第二层：相机夹取里有「内容比画布小时强制居中」的分支。**
它直接改写 offset，破坏「光标下的世界点不动」这个不变量——实测每格漂 ~20px。改成纯夹取，居中只留给 `fitView`。

**第三层：内容放大到超出画布后，夹取生效并再次破坏不变量。**
实测四格漂 32px。把夹取区间放宽 ±1 屏（仍保证内容不会被拖到完全看不见），常规缩放全程夹不到。

另外把锚点换算从手算 `clientX - rect.left` 换成 `svg.getScreenCTM().inverse()`：前者隐含「SVG 用户单位 == CSS 像素且左上角对齐」两个假设，任何一处不成立锚点就偏。

**结果**：连续放大 4 格（122% → 260%）的累计漂移从 **78px 降到 0.7px**。新增回归断言「放大时光标下的点保持不动」（容差 4px）。

### 2. 节点堆叠导致关系不可见

**根因**：力导向在这种密集图上压不住弹簧。实测 13 节点 78 条边时，原始输出 1724×919 里有 **48 对重叠**。随后按宽高比拉伸又制造新的重叠（「度量完备性」与「以流形上每点…」被压到 dx=172、dy=0 正好贴上）。

曾试过「二分搜索一个最小放大系数 f 把所有节点拉开」——它把坐标放大到 **45000×51800**，图完全不可用。这是治标：重叠的根源是相对位置错，等比放大只是把错误放大。

**修法**：改为**结构化网格排布**（`gridLayout`）。按力导向的 y 坐标排序后依次填格——同片区的节点落在相邻行，仍保留「谁和谁靠近」的信息，**不重叠是格子构造出来的保证**，不是迭代逼近。再按目标宽高比调整单元宽高填满可用区。

**代价照实说**：节点不再有连续的有机位置，边会画得比力导向更长。换来「任何缩放下都不会有两张卡片叠住关系」这一硬保证。

### 3. 节点主体不居中

**根因**：`fitView` 用 `layout.width/height`（含外边距的盒子）对准可用区中心，而网格布局在左右各留 `(contentW - columns*NODE_W)/2` 的空白，两者不等——实测偏 47×104px。

**修法**：改用**节点的真实包围盒**；并把内容中心对准**顶栏之下的可用区**中心，而不是整个 SVG 中心（后者会让内容下移半个顶栏高度，最后一行被画布底边切掉）。

**结果**：水平偏差 1px；13 节点与全库 102 节点均 **100% 完整可见、0 个被裁**。

### 4. 顺带修掉的确定性缺陷

测试发现「同一 URL 得到同一布局」失败：同一 URL 刷新前后节点 y 坐标相差 **83px**（正好一行间距）。原因是布局依赖了「面板占用宽度」这一**测量值**——它在首帧、ResizeObserver 回调、缩放过程中都可能变化，每次变化都重排。

**修法**：布局只依赖「已加入集合 + 边源」，网格用固定目标宽高比；「填满实际可用区」交给 `fitView` 决定缩放比例。

### 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | TypeScript 检查与 Vite 生产构建通过 |
| `npm run check` | doctor 全部通过 |
| `npm test` | 42 项内核/规划/局部化/辅导测试 + 13 项 API 测试 + 113 项浏览器检查全部通过 |

新增断言：**放大时光标下的点保持不动**（锚点不变量回归）。

### 未验证

- 力导向只用于决定网格内的排列顺序；它对密集图的原始输出仍是有重叠的（48 对），
  这一点被网格构造吸收了，但**没有从根上修好力参数**。
- 全库 102 节点在 73% 下完整可见，但边很密；更密集规模（数百节点）未测试。
- 触摸设备上的拖动平移与双指缩放未验证。

---

## 第七轮：修复布局成链与滚轮缩放过敏（2026-10-02）

用户报告两个缺陷：**网络画成一条竖直长链**、**滚轮缩放灵敏到不可用**。两个都复现了，都是真缺陷。

### 1. 布局成链（严重）

**复现**：用户给的 13 节点网络（787 条边在画布上、78 条）实测 `maxColumn: 1, maxRow: 11`——12 个有连接的节点全部落在同一列。截图里就是一条竖线。

**根因**：分层布局的锚点取「已加入集合里 id 升序的第一个」，而那个节点恰好是 `dg:claim-d-squared-zero`，**零连接**。BFS 从它出发一步都走不了，于是它自己占一列、其余 12 个节点全部被 `column.set(isolatedColumn)` 塞进同一列。同时 `isolated` 列表误把这 12 个节点标成「未连接」——它们之间其实有 47 条无向边。

**修法**：分层布局对这类数据根本不适用——实测网络是**星形主导**的（「同胚」的 38 条连接里大半直连「拓扑空间」枢纽），分层会把枢纽放第 1 列、其余 10 个邻居堆在第 2 列，仍然是长条。改为**确定性力导向**：

- 初值沿阿基米德螺线、按度数排序放置，无 `Math.random`，同集合必得同初值；
- 弹簧强度按边源硬度（契约 > PROOF 关系 > 其余关系 > 族结构边），与推荐理由、边源优先级一致；
- 迭代后做一轮防重叠校正（保证卡片不压在一起），只平移不重新压缩。

修复后同一网络的 `maxColumn: 3, maxRow: 10`，坐标散布在 1228×1416 的区域里，`isolated` 只剩真正的零连接节点。

### 2. 滚轮缩放过敏

**根因**：一次 `wheel` 事件固定乘 1.12。鼠标滚轮一格报 deltaY≈100，触控板一次滑动连发几十个 event，倍率指数叠加，瞬间冲到 300% 上限。

**修法**：改用 `exp(-delta * 0.0015)` 并按 `deltaMode` 归一化（行/页折算成像素），单次事件限幅 ±15%。实测滚一格 100%→112%，滚三格到 133%（旧实现三格已 140% 且继续飙升）。

### 3. 顺带修掉的三个自身缺陷

1. **`preventDefault` 在 passive 监听器里失效**：React 把 `onWheel` 挂成 passive，控制台报 "Unable to preventDefault inside passive event listener invocation"，且页面会跟着滚。改用原生监听器 + `{ passive: false }`。
2. **监听器根本没挂上**：`useEffect(..., [])` 在「加载本体…」那一帧运行时 `canvasRef.current` 还是 `null`，直接 return；等画布渲染出来已无机会挂载，滚轮完全失效。改用 **callback ref**，与渲染次数无关。
3. **适配比例被自己写下的 viewBox 反噬**：`fitView` 用「当前 viewBox 宽高」反推缩放，而那正是上一次 `fitView` 写下的值，形成自指循环，比例被锁在 0.446（内容只占可见区一小条）。改为直接由 stage 尺寸与目标缩放推出 viewBox。

另外补上 `ResizeObserver`：窗口缩放、进出全屏都会改变画布尺寸，此前不会重新布局与适配。

### 4. 界面调整

- **重复访问时悬浮框默认收起**。面板宽 340px，左右各开一个吃掉近 700px，适配后网络只能缩到三成左右、读不清。首次访问仍开着「全部节点」与「推荐加入」做引导。
- 左侧面板从 4 个 HUD 开关选择显示；「连接类型」默认关闭。

### 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | TypeScript 检查与 Vite 生产构建通过 |
| `npm run check` | doctor 全部通过 |
| `npm test` | 42 项内核/规划/局部化/辅导测试 + 13 项 API 测试 + 111 项浏览器检查全部通过 |

新增断言：滚轮缩放两格的总倍率 < 1.5（钉住灵敏度回归）。

### 未验证

- 力导向布局在 102 节点全库下的观感未逐一核对；已知它会铺满画布，需要缩到 25%–40% 才能总览。
- **网络内容相对画布中心仍有约 90px 的水平偏移**（面板全收时实测：簇中心 (812,471)，画布中心 (718,465)）。成因未定位到具体一处，已确认与「面板占用宽度」和「布局宽高比」两项无关（面板全收时两者分别为 0 与 1.721 vs 目标 1.69）。不影响可用性，未继续追。
- 布局的「画满可用区」程度仍有余量：13 节点实测绘出内容 1942×1128、缩放 0.542。
- 触摸设备上的拖动平移与双指缩放未验证。

---

## 第六轮：合并探索结构 + 全屏 + 平移缩放 + 修复连接密度（2026-10-02）

### 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | TypeScript 检查与 Vite 生产构建通过 |
| `npm run check` | doctor 全部通过 |
| `npm test` | 42 项内核/规划/局部化/辅导测试 + 13 项 API 测试 + **110 项浏览器检查**全部通过 |

### 1. `/graph` 并入 `/network`

「探索结构」是**从全体空间出发、靠筛选做减法**的局部化视图；「组建网络」是**从空开始做加法**。用户要求直接合并，本轮执行：`/graph` 改为 `<Navigate to="/network" replace>`，`GraphPage.tsx` 删除，主导航由 8 项回到 7 项。旧书签仍可用。

合并后没有丢失原页的价值：全体浏览 → 「全部节点」悬浮框（含案例/构造筛选与搜索）；聚合话题 → 「同一话题」边源 + 列表里的构造类型；列表索引 → 悬浮框内的节点列表；关系图例 → 底部图例栏（仍只列画布上真实出现的种类）。

**顺带修掉原页的一个真实回归**：`GraphPage` 用 `height={Math.min(layout.height, 900)}` 把 2076px 的布局压进 900px，`preserveAspectRatio` 于是把整幅画布等比缩到 0.43 倍——节点卡片实际只有 69×23px、文字约 3px，**不可读**。加入微分几何案例把行数从 14 增到 21 之后彻底失效。这不是新问题，是既有的硬截断被新内容放大；`GraphPage` 删除后该缺陷随之消失。

### 2. 全屏模式

HUD 的「全屏」按钮对画布容器调用 `requestFullscreen()`，`.network-stage.is-fullscreen` 用 `position: fixed; inset: 0; z-index: 50` 撑满视口，HUD 与悬浮框仍在最上层。监听 `fullscreenchange`，用 `Esc` 退出后按钮文案自动复位。权限被拒时静默失败，不打断使用。

### 3. 平移与缩放

- 拖动空白处平移（pointer 事件，触摸与触控笔同样可用）；按在节点、按钮、链接上不触发平移。
- 滚轮缩放 25%–300%，**以光标位置为锚点**，缩放时内容不会跑掉；平移量按缩放折算，保证「拖多少、画面走多少」一致。
- HUD 显示当前比例并提供 −/＋/重置。

**重置 = 适配整张网络，不是回到 100%**。网络通常比视口大，1:1 会把内容裁到视口外——既看不到总览也点不到节点（此前的实现就是这个行为）。适配用 0.9 留边系数并额外为 HUD 留 64px。加入节点后自动适配一次，但只在「已加入集合」变化时触发，不覆盖学习者的手动缩放。

### 4. 连接密度（用户指出的严重失误）

**用户是对的。** 改前只画「行动契约 + 登记关系」两类，全库 102 节点的实测：**平均连接数 3.43，中位 3，31 个节点度数只有 1–2，2 个孤立**。逐节点用网络时确实会看到「一个节点只连一两个」。

把已登记数据里所有能作为连接依据的结构都接上，共七类，默认全开：

| 类型 | 依据 | 全库边数 |
|---|---|---|
| 行动契约 | 产出该节点需要哪些输入 | 168 |
| 登记关系 | 语义关系（种类 + 见证状态 + scope） | 32 |
| 同一话题 | 同属一个聚合话题块 | 193 |
| 误区锚点 | 误区模式的节点与锚点 | 22 |
| 共用前提 | 同一行动的两个输入 | 59 |
| 同一份证据 | 同一份证据记录同时引用的节点 | 14 |
| 支持族依赖 | 节点在支持族里列出的依赖（含传递依赖） | 65 |

| 指标 | 改前 | 改后 |
|---|---|---|
| 平均连接数 | 3.43 | **6.49** |
| 中位连接数 | 3 | **7** |
| 度数 1–2 的节点 | 31 | **26** |
| 孤立节点 | 2 | **1** |
| 无向边总数 | 175 | **331** |

每张节点卡片右上角直接标出连接数，详情面板写明「连接 N 条」；某节点在启用的类型下无连接时，明确提示可以打开更多类型或把前提加进来，而不是留空白。

**接口变化**：`GET /ontology/graph` 新增 `support`（36 条）与 `evidence`（61 条）两个最小字段，用于生成最后两类边。形状只保留 `id/use/set` 与 `id/nodes`，不把整条证据记录塞进图接口。

### 5. 过程中修掉的两个自身缺陷

1. **契约边退化成自环**：微分几何案例里 `a-dg:claim-d-squared-zero` 的输入与输出都写成了 `dg:d-squared-zero`，`if (pair.from === pair.to) continue` 把它丢弃，导致该节点在契约层没有任何连接。改为「输入 = 概念节点 `dg:d-squared-zero`，输出 = 断言节点 `dg:claim-d-squared-zero`」。
2. **「支持族相交」定义选错**：最初按「两个节点的支持集合有公共成员」建边，实测只产出 6 条——因为支持集合主要引用背景节点，而背景节点不是支持记录的主体。改为「节点 ↔ 它在支持族里列出的依赖节点」，产出 65 条，且其中 6 条是契约边之外的传递依赖，信息量更高。

### 6. 界面细节

- 节点卡片显示连接数；`<title>` 附带「N 条连接」。
- 悬浮框默认位置下移，避开顶部 HUD（此前 HUD 会挡住面板里的控件，鼠标点不到）。
- 窄屏：拖动不适用，悬浮框改为纵向卡片，画布缩到上方 46vh。

### 未验证

- 全屏在真实浏览器窗口（非无头）下的表现未逐项核对；测试只断言 `document.fullscreenElement` 与类名同步。
- 七类边同时开启时，102 节点规模的视觉可读性靠缩放到 30% 左右才能总览；更密集规模的布局未测试。
- 拖动平移在触摸设备上的手感未验证（只有无头 Chrome 的指针事件测试）。

---

## 第五轮：加入微分几何案例（2026-10-02）

从 `G:/DifferentialGeometry/object` 选 30 个核心节点加入站点。

### 选择依据（语料自身的依赖关系，不是印象）

统计每个概念在全部 125 个文件的「必备知识」段落里被引用多少次：`流形` 87、`光滑流形` 66、`张量` 60、`黎曼度量` 30、`向量空间` 29（语料无此文件 → 改用 `bg:linear:vector`）、`微分流形` 28、`拓扑空间` 26、`微分形式` 23、`同胚` 21、`余切空间` 20。名单按机制层 / 切空间层 / 张量层 / 外形式层 / 证明工具与结构定理五层取 30 个。

### 语料实况（实测）

| 项 | 值 |
|---|---|
| 文件数 | 125（def 110 / thm 14 / prop 1 / **axiom 0**） |
| 总字数 | 1,279,380 字符；单文件 4.5k–22k |
| 含行间公式 | 119 / 125 |
| 含 wiki 链接 | 86 个文件 |
| 模板完整度 | 与 `AGENTS.md` 的对象模板逐节对应 |
| 文件格式 | 格式 A（`# 标题` + `> 摘要`）55 个；格式 B（YAML frontmatter + `## 简介`）64 个；格式 C（无标题无摘要）6 个 |
| 重复概念 | `拓扑流形`、`黎曼度量` 各有一个 `--hash` 副本，均不在名单内 |

### 两个硬约束（实测确认）

1. **节点 id 不能用中文。** `NODE_BLOCK = /<!--\s*node:([A-Za-z0-9:._-]+)\s*-->/`，`<!-- node:dg:光滑流形 -->` 直接不匹配。改用 ASCII id，中文进 `title`。
2. **`[[wiki 链接]]` 不会渲染。** `Markdown.tsx` 只挂 `remark-math` / `remark-gfm` / `rehype-katex`。生成器改写 1973 处为站内链接，232 处去方括号留文字（不制造死链）。

### 命令与结果

| 命令 | 结果 |
|---|---|
| `node scripts/build-dg-case.mjs` | 30/30 节点生成，正文 643 KB |
| `npm run build` | TypeScript 检查与 Vite 生产构建通过 |
| `npm run check` | doctor 全部通过 |
| `npm test` | 42 项内核/规划/局部化/辅导测试 + 13 项 API 测试 + **96 项浏览器检查**全部通过 |

### 本体变化

| 指标 | 之前 | 现在 |
|---|---|---|
| 节点 | 66 | **102**（30 概念 + 2 断言 + 4 误区模式 + 66） |
| 行动 | 51 | **85** |
| 关系 | 22 | **32** |
| 证据 | 27 | **61**（新增 34 条 `prose-proof`） |
| 误区模式 | 4 | **8** |
| 聚合 | 7 | **9**（新增 agg-dg、agg-topology） |

### 检查中发现并修掉的问题

1. **`thm/紧致性.md` 实际在 `prop/` 目录**——生成器首次运行即报缺失，已修正路径（正是生成器存在的意义）。
2. **`claimRecord` 只能挂在 Claim 节点上**——4 个定理节点原本登记为 Concept，合法性检查报「节点不是 Claim」。改为 `Claim` + `Theorem` 角色，符合既有约定「公理、定理、性质是 Claim 的角色，不是互斥的节点类型」。
3. **误区模式节点必须有正文块**——未声明 `contentRef` 时报「内容块未找到」。改为显式 `contentRef: false`，因为源笔记里这些误区确实没有独立正文，**不伪造正文**。
4. **摘要跨行吞段落**——正则 `^>\s*(.+)$` 的 `.` 匹配换行，把整段正文当成摘要并重复输出。改为 `[^\n]+`。
5. **行内标签行与嵌套 wiki 链接**——`#微分[[流形]]` 这类标签行既没被剥离也拆错。加了专门的标签解析与去括号。

### 证据纪律（有意为之）

语料是笔记，没有机器证书。因此 34 条证据**全部** `prose-proof` / `checkStatus: not_run`，`obligations` 写明「机器编码为第 02 章 ND 证书」。测试断言钉住这一点：不得出现 `certificate`，不得声称已核验。节点页显示的「正文证明」只声明存在正文级论证。

### 未验证 / 未声称

- **源笔记的数学内容未经本站复核**。本轮只做了格式归一化与链接重写；逐条核对定义与定理表述已登记为证据的 `obligations`。
- `axiom/` 目录为空，本案例不含公理类对象。
- 源目录约 95 个未入选概念尚未进入本站；其链接已降为纯文字。
- 快照是单向的：G 盘后续更新不会自动进站点，需重跑 `scripts/build-dg-case.mjs`。

---

## 第四轮：整屏网络 + 悬浮框 + 动画 + 多元关系（2026-10-02）

### 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | TypeScript 检查与 Vite 生产构建通过 |
| `npm run check` | doctor 全部通过 |
| `npm test` | 39 项内核/规划/局部化/辅导测试 + 13 项 API 测试 + **78 项浏览器检查**全部通过 |

### 界面的三项变化

1. **网络成为整屏背景。** `.network-stage` 高度为视口高度的 0.86（视口高度减去顶栏与工作区内边距），`.network-canvas-full` 绝对定位铺满；顶部 HUD 与底部图例常驻。
2. **其他物件是可开关、可拖动的悬浮框。** 节点列表 / 推荐加入 / 节点详情三个面板由 HUD 的复选框控制显隐，拖动标题栏可移动。位置写成**视口比例**存 localStorage（不是像素，避免换显示器后跑到屏外），刷新后保留；拖动结束才写盘。指针事件实现，同时支持触摸与触控笔；窄屏下拖动不适用，改为纵向卡片。
3. **新节点有箭头生成动画。** 新节点 `scale(0.82)→1` 淡入；指向它的边用 `stroke-dashoffset` 从 64 推进到 0，配合 `marker-end` 把箭头逐段画到新节点。动画标记 900ms 后清理，**刷新页面不重放**（首帧把 URL 里的节点登记为「已存在」）。`prefers-reduced-motion: reduce` 时全部关闭。

### 多元关系：15 → 22 条，4 → 7 种

关系是公共本体 M 的内容，因此新增的每条都登记了 `witness`（状态取自 `EVIDENCE_STATUS`）与 `scope`：

| 位移 | 内容 | 依据 |
|---|---|---|
| `specialization` ×3 | `manifold:smooth-atlas→ck-atlas`、`tensor:tensor-rs→multilinear`、`group:units5→group:group-concept` | **相对已登记的 `hardGeneralization` 有定义**（它就是反方向），不是新数学断言 |
| `duality` ×1 | `tensor:tensor-product → tensor:dual` | V⊗V* ≅ End(V)，引用同一案例的 `ev-tensor-end-iso` |
| `crossDomain` ×2 | `bg:linear:vector→manifold:chart-atlas`、`manifold:top-manifold→tensor:bundle` | 图卡的像落在 R^n；张量丛的构造同时用到底流形与线性结构 |
| `application` ×1 | `manifold:chart-atlas → manifold:transition` | 与行动契约 `m-trans` 的输入一致 |

| 指标 | 之前 | 现在 |
|---|---|---|
| 关系条数 | 15 | 22 |
| 关系种类 | 4 | 7 |
| 被关系覆盖的节点 | 17 / 66 | 23 / 66 |
| 本体版本 | `sha256:0c4b4a23…` | `sha256:692b2dfa…` |

本体版本随公共内容修订而变——这正是 M「随版本公开修订」的设计，不是回归。`doctor` 与全部测试在新版本上通过。

### 行为验收（浏览器断言，本轮新增 23 项）

覆盖：网络占满视口（高度/视口 > 0.8）、推荐与列表是悬浮框、详情默认不显示、HUD 可开关三个面板、**悬浮框可拖动且位置写入 localStorage、刷新后保留**、新节点有入场动画（`animationName !== 'none'`）、动画结束后清理标记、**刷新后不重放入场动画**、边带箭头标记、画布出现多种登记关系、图例含新增种类、点节点打开详情并列出连接。

`/graph` 的图例改为只列当前实际出现的关系种类（此前固定列 8 种，其中 4 种数据里不存在）。

### 并发改动说明

本轮期间主题层被另一轮改动重做（取自 `design/mcs-logo-v6` 的紫色令牌 + `web/src/theme.ts` 的 JS 镜像）。网络视图的 SVG 颜色已改用 `THEME` 常量（SVG 属性不支持 `var()`），CSS 仍引用令牌，两者成对。

### 未验证

- 拖动在真实触摸设备上的手感未验证（只有无头 Chrome 的指针事件测试）。
- 动画的实际观感未逐帧核对；只断言了动画被应用且会清理。
- 新增关系尚未经过数学人工复核——`witness.ref` 都指向已有的证据或声明背景，但「同一处依据支撑正反两个方向」这一登记方式仍应由领域负责人确认。

---

## 第三轮：节点网络视图（2026-10-02）

新增 `/network`「节点网络」：与 `/graph` 相反的读法——从空开始做加法，学习者自己决定加入哪些节点，右侧给出「推荐加入」与逐条推荐理由。

### 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | TypeScript 检查与 Vite 生产构建通过 |
| `npm run check` | doctor 全部通过（未涉及前端） |
| `npm test` | 39 项内核/规划/局部化/辅导测试 + 13 项 API 测试 + **55 项浏览器检查**全部通过 |

### 决定设计的关键实测数据

| 边源 | 规模 | 覆盖节点 |
|---|---|---|
| `relations` | 15 条（当轮快照；第四轮增至 22 条） | 17 / 66 |
| `actions` 输入→输出契约 | 109 条 | 65 / 66 |

- 只用关系建网，**48 个节点是孤岛**；9 个背景节点的关系度全部为 0，因此关系视图里根本没有起点。
- 数据里实际存在的只有 4 种关系：`bridge` 4、`hardGeneralization` 7、`analogy` 1、`application` 3；`hardPrereq` 等 4 种**一条都没有**。
- 15 条关系的目标节点 100% 都能被某个行动产出，两种边源相容，可叠加。
- 契约与关系在 3 条边上重合，此时两条都画（语义不同）。

### 行为验收（浏览器断言）

覆盖：默认空态与「网络还是空的」提示、起点推荐指向背景节点、每条推荐都有非空理由、加入后画布出现节点且 URL 写入 `nodes=`、连续加入多个后出现边、节点列表出现已加入态、图例只列画布上真实出现的关系种类、**同一 URL 连续加载两次节点坐标完全一致**、URL 引用不存在的节点时显式提示且不进画布、清空网络、390px 无横向溢出、控制台零错误。

`/graph` 的既有断言未被破坏：仍然 `.graph-node` 66 个、`.legend span` ≥ 5。

### 语义决定

- 推荐理由只引用已登记数据（行动契约、关系种类与见证状态、`scope`、话题聚合、误区锚点），**不产出认知成本/难度/时长**。
- 与当前网络无登记连接的节点放入「未连接」区并说明原因，不伪造边。
- 布局与推荐用同一套优先级（契约 > PROOF 关系 > 其余关系），因此「为什么推荐它」和「它画在哪里」不会互相矛盾。
- 选择状态只存在 URL，不写后端、不写 E；本视图不需要学习者档案。

### 未验证

- 布局是确定性分层展示，不是力导向图；节点很多时（>30）未做可读性实测。
- 推荐理由的实际教学价值未验证；本轮只验证了功能与语义正确性。

---

## 第二轮：学习者体验优化（2026-10-02）

本轮把网站从「读得动但学不完」改成有始有终的学习循环，并修掉三处已确证的缺陷。

### 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run build` | TypeScript 检查与 Vite 生产构建通过 |
| `npm run check` | doctor 全部通过 |
| `npm test` | 39 项内核/规划/局部化/辅导测试 + 13 项 API 测试 + 40 项浏览器检查全部通过 |
### 修复的缺陷（修复前均已实测复现）

1. **「标为尚未确认」提交即报错。** 界面发送 `kind:'unknown'`，而 `unknown` 不在 `EVENT_KINDS` 里，服务端返回 `400 BAD_REQUEST 未知事件类型 unknown`。正确写法是 `confirmation` + `payload.confirmed=false`。已修，并加了回归测试钉住两条路径。
2. **证据等级徽章永远是死的。** 接口读 `node.provenance.evidenceStatus`，而 66 个节点里没有一个带这个字段；真实位置是 `teaching.evidenceStatus`，53 个节点已有登记。修复后节点列表出现 53 个有文本的证据等级徽章。
3. **辅导回复被切成不可读。** `String(answer).replaceAll(this.token, '[会话凭证]')` 在未配置 `DEEPTUTOR_AUTH_TOKEN` 时 `token` 为空串，`replaceAll('')` 会在**每两个字符之间**插入标记。实测一次真实回合返回 9379 字符，开头为 `[会话凭证]#[会话凭证] [会话凭证]什[会话凭证]么…`。现已抽出 `redactCredential` 并显式判空；同一个问题（「什么是去心邻域？」）修复后返回 188 字符的干净回答，行内公式正常。

### 学习者体验改动

- **形式负载排版。** `formal.predicate` / `formal.formula` 此前按 `JSON.stringify` 塞进 `<code>`，核心定义完全没排版。现按字段中文标签结构化渲染：21 个纯公式字段包成行间公式（KaTeX），8 个含中文的字段按普通文本显示（整体包裹会破坏 KaTeX 解析，已在 README 记为数据侧缺口）。断言：`limit:limit-ed` 的「谓词」行含 KaTeX。
- **点亮已创作未渲染的内容。** `representations`（31 条 / 29 节点）、`provenance.sources`、`formation.checks`、`selfCheck[].anchor` 此前下发但渲染为零，现已全部呈现。
- **术语中文化。** 新增 `web/src/labels.ts`；构造类型、角色、关系种类、事件类型、行动模式、资源类型、支持族用途全部显示中文，原值保留在 `title`。空白徽章改为回退显示原值。
- **导航与信息架构。** 主标签改为「学习路线」；研究台移到次级入口 `/lab`（`/research` 保留为别名），主导航仍是 7 项。
- **学习闭环。** `view` 事件（schema 里早就有、此前从未发出）现在承载「已读」；θ 新增 `viewed`（含 `reviewCount`），`unspecified` 由计数改为「计数 + 节点名单」。新增 `learning.ts` 派生可学前沿与待复习队列；首页给「继续学习」，节点页两端各有一处操作区与相邻节点导航，自检任务可作答，新增复习页 `/review`。
- **不伪造进度。** 全站没有掌握度百分比；进度只有「已确认 / 只读过 / 读过但没懂 / 还没碰过」四项可追溯计数。复习没有到期日与间隔算法，页面上写明。
- **规划页去技术化。** 「事件界 h」「候选上限」「策略 JSON」收进高级参数；背景从当前档案自动回填，不再要求学习者手工再勾一遍。

### 语义决定（有意为之）

- 已读与已知是**两条独立轴**。已读节点仍然算「未指定」，因为读过不是可用性声明；把已读并入已知会把「浏览过」偷偷变成掌握证据。`core.test.mjs` 与 `api.test.mjs` 都断言了这一点。
- 确认掌握时同时记一条 `view`：确认意味着确实读过，否则复习队列缺「上次阅读」时间。已读的节点不会重复记。

### 未验证

- DeepTutor 真实回环只验证了「回复可读」与内容正确；认证令牌路径、会话恢复与事件回传仍未验证，`liveVerified` 保持 `false`。
- 8 个含中文的 `formal.formula` 字段仍未排版（需要改公共内容）。
- 学习闭环的实际教学效果未验证；本轮只验证了功能与语义正确性。

---

## 第一轮：重建验收（2026-10-02）

执行环境：Windows，Node.js v24.21.0，npm 11.19.0，Python 3.14.7，Google Chrome 无头模式（Playwright）。

## 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run check` | doctor 全部通过 |
| `npm test` | 32 项内核/规划/局部化/辅导测试 + 10 项 API 测试 + 21 项浏览器检查全部通过 |
| `npm run build` | TypeScript 检查与 Vite 生产构建通过 |

doctor 的关键结果：

- 66 个登记节点全部通过形成检查；合法本体八项条件通过；十三种角色模板齐全；36 个局部化算子登记齐全。
- 四份机器证书全部重放通过：`ev-limit-constant-cert`、`ev-manifold-transition-cert`、`ev-tensor-rank1-cert`、`ev-group-injective-cert`，检查器为 `mcs-nd-subset/1`，`checkerVerified=false`。
- 36 个局部化算子在测试夹具下返回：31 个 `computed`、3 个 `unknown`、2 个 `unsupported`（LC16 与 LC23 因缺少变换/阶段登记数据明确返回不支持，不伪造结果）。
- SQLite 档案、事件去重、备份写入检查通过。
- 覆盖清单 23 个模块，包含 implemented / partial / interface-only / not-claimed 四类状态。

## 行为验收

**规划器。** 32 项单元测试覆盖：AND 联合前提、OR 替代行动、缺前提的显式入口、禁用未知入口后的界内不可行、来源边与策略边合并成环、多输出行动共享、事件界限制、成本预算与未知成本、复习事件复用同一行动的另一个实例、候选上限截断返回 Unknown、固定输入可复现，以及四组贯通案例在声明背景下均找到最少事件路线。

**局部化。** 检查 36 项定义与处理器同时存在；每个算子都能返回 `Loc_λ(M)=(V,∂V,τ,Pres)`；缺参数明确拒绝；缺少适配参数包 θ 的认知算子返回 unsupported；LC28 严格禁用语义、LC14 反例锚定与 LC36 未知边界均有专门断言。

**M/E/D 非干扰。** API 测试在创建档案、追加确认事件、写入笔记、导入导出与备份恢复之后，比较 `/health` 中的本体 `contentHash`，结果保持不变。事件 ID 相同而内容不同返回 `EVENT_ID_CONFLICT`；重复相同事件返回 `duplicate:true` 且不重复计数。

**两个演示学习者。** `node scripts/seed-demo.mjs` 显式创建两个 `kind:demo` 档案：一个确认实数度量与量词背景，另一个确认函数复合与群公理模板。以 `group:cayley` 为同一目标规划时，前者返回 `InfeasibleWithinBound`（声明背景内没有可用入口），后者返回 `Found`（三条入口路线）；两次规划前后 M 的哈希相同。演示档案不代表真实学习者，也不写入任何公共内容。

**证据契约。** 展示记录（正文证明）调用重放接口返回 `EVIDENCE_UNSUPPORTED`，不能冒充机器证书；证书重放返回 `status=passed`、`exitCode=0`，并把开放假设与剩余义务原样列出。

**浏览器。** 21 项检查覆盖：首页与四个原型问题、节点检索、节点阅读页（KaTeX 公式、证据面板、形成状态）、结构图谱、路线工作台（后台规划任务返回路线与状态）、档案创建与事件时间线、覆盖清单、36 个局部化卡片与运行结果、390px 窄屏无横向溢出、控制台无错误。

截图（本机临时产物）：

- `tmp/browser-home.png`：窄屏首页。
- `tmp/browser-node.png`：`limit:bridge` 节点阅读页。
- `tmp/browser-graph.png`：探索结构图谱。
- `tmp/browser-plan.png`：路线工作台一次完整的 4 事件规划结果。

## DeepTutor 状态

本轮未启动 DeepTutor，因此只验证了断开路径：健康检查返回 `available:false`、`liveVerified:false`；创建会话被拒绝并返回 `DEEPTUTOR_UNAVAILABLE`；其余功能不依赖它。真实模型回环、认证令牌、会话恢复与事件回传在本轮**未验证**；页面与 API 始终把该路径标为未验证，不冒称联通。

## 未声称的范围

- 完整 HOL 检查器、检查器机器元证明、Henkin/标准语义自动判定：未实现。
- 四案例完整桥梁的机器形式化：未完成；正文证明与机器片段分别展示。
- 真实教学收益、群体学习规律、认知模型经验校准：未验证。
- 工业规模规划、全局最优、无限域规划：未声称；Pareto 只产生展示子集。
- 公网部署、多租户账户隔离、远程 DeepTutor 拓扑：未在本轮验证。

以上未声称项在网站的“研究工作台 → 专稿覆盖/证明义务”中逐条可见，并随覆盖清单版本化维护。

## 第七十九轮：公网自托管（Cloudflare 隧道）首次真机上线（2026-10-05）

在没有境外卡、Hugging Face 又被 WAF 拦（418）的前提下，改用「本机 + Cloudflare 隧道」把站点发布到公网。
**实测记录**（地址为 trycloudflare 随机子域，每次重启会变）：

- 隧道与站点可用：首页 / 登录页 / `/api/v2/health` 均 **200**；
- 登录链路：`POST /api/v2/auth/github` → Supabase `/auth/v1/authorize` → **302 到 `github.com/login/oauth/authorize`**，
  真实登录完成后，服务端 `mcs_security` 出现 `session` 记录，`userId` 与 Supabase 的 UID 一致，
  有效期 7 天，且**库里只存令牌指纹**；
- 权限边界（全部实测）：游客 GET `/profiles`、`/authoring/drafts`、`/authoring/revisions` 与 POST 写入均 **401**；
  伪造会话 Cookie **401**；带正确 Origin 但无会话的写入 **401**；公开本体 `/api/v2/ontology` 仍 **200**；
  上述尝试后 `profiles / events / owners` 计数仍为 **0**（没有任何写入被放行）；
- 隔离：公网实例用 `runtime/public/` 下独立文件，本机工作台 `runtime/*.sqlite3` 的时间戳未变。

**两个坑（都已写进部署清单）**：

1. **Supabase 重定向白名单**：不配 `Site URL` 与 `Redirect URLs` 时，登录会"成功"但人被丢到
   `http://localhost:3000/?code=…`——因为 `redirect_to` 未命中白名单时 Supabase 退回 Site URL。
2. **环境变量盖掉配置**：窗口里残留 `MCS_WEB_DB_URL=base` 会让站点去连一个不存在的主机
   （`getaddrinfo ENOTFOUND base`）；脚本已改为显式清除并打印。
