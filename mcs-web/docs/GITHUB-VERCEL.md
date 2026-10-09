# GitHub 与 Vercel 发布说明

## 当前状态（2026-10-05）

- **用户确认 / 本次复核**：域名在阿里云购买；当前权威 DNS 已为 Cloudflare，根域解析与 HTTPS 匿名访问已通过，上一版“未解析”结论过时。
- **已证实（本次只读核对）**：GitHub `main` 为 `248508a`；主分支未保护，rulesets 为空，远程未见 `.github` 目录。
- **当前连接可见范围**：Vercel 本次项目列表为空，尚未建立该平台部署的证据。
- **已证实**：源码公开在 [math-cognitive-space](https://github.com/akashicpeiheng/math-cognitive-space)。
- **本次已证实**：命名隧道 `mcs` + 本机后端；正式根域首页、登录、健康为 200，匿名个人档案为 401；www 仍直接返回页面，没有统一跳转。
- **未验证**：连续可用性；一次不同客户端健康请求返回 403，同探测方式复核为 200，原因未确定。
- **引用实测**：`../VALIDATION.md` 第七十九轮记载 Supabase GitHub OAuth 登录成功；本轮未重新登录。
- **实现存在**：本机 SQLite；常规公网 PostgreSQL 学习数据及会话存储；显式自托管例外允许独立 SQLite。
- **未验证**：真实云端 PostgreSQL、Vercel 托管、长期可用性、完整双账号流程及公网数据灾难恢复。
- **待适配**：当前后端不能仅靠将 Vercel Root Directory 设为 `mcs-web` 完成可靠部署。

近期沿已经接通的命名隧道完善可靠性；Vercel 前端及全后端适配都改为后续可选工作。
阿里云管注册/续费，当前 DNS 记录在 Cloudflare 管理。按成果调整的工作批次见 [后续工作规划](后续工作规划.md)，
日常发布、备份与回退见 [维护与更新](维护与更新.md)。

## 为什么还需要部署适配

| 当前实现 | 对 Vercel 部署的影响 |
| --- | --- |
| `server/jobs.mjs` 用进程内 Map 保存队列和任务结果 | 发起任务与轮询可能落到不同实例；任务状态和执行需要外置及持久化 |
| `server/authoring-db.mjs` 使用本地 SQLite | 草稿、审阅等必须接持久化存储，或明确限制为本机维护功能 |
| `server/extensions.mjs` 将发布结果写回磁盘 | 公共内容发布需要持久化、版本同步及回滚方案 |
| `core/evidence.mjs` 调用 Python 重放证书 | 部署环境必须提供 Python 与证书源，且实际测试进程调用 |
| Vite 产物依赖同源 `/api/v2` | 仅托管 `web/dist` 会缺失业务 API，不能据此声称整站可用 |

这些是对当前源码的检查结果，不是“Vercel 不能运行 Node.js”的平台断言。
[Vercel 支持 Node.js HTTP 服务](https://vercel.com/docs/functions/runtimes/node-js)。
后台任务须满足平台的请求生命周期约束；[`waitUntil`](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package)
只延长当前请求生命周期，不会把本项目的 Map 自动变成共享数据库。

可选实现方向：Vercel 托管前端，同源代理到具备持久卷的常驻后端；
或将任务、编写库与发布存储全部适配为外置服务，再在 Vercel 承载后端。
选定后端方案并验证后，才添加正式的 Vercel 部署入口。

## 上线需要的账号与配置

Vercel 需要可访问的个人工作区/团队以及对应 GitHub 仓库的导入权限。
GitHub 插件的仓库权限不等于 Vercel 的 GitHub 集成权限。

常规云端部署需要以下环境变量（值只填托管平台的配置，不提交到 Git）：

| 变量 | 用途 |
| --- | --- |
| `MCS_WEB_PUBLIC_MODE=1` | 开启公网认证和权限检查 |
| `MCS_WEB_PUBLIC_ORIGIN` | 经过验证的 HTTPS 站点根地址 |
| `MCS_WEB_ALLOWED_HOSTS` | 显式允许的站点域名 |
| `MCS_WEB_DB_URL` 或 `DATABASE_URL` | PostgreSQL 连接串 |
| `MCS_WEB_AUTH_MODE=supabase` | 选择现有身份服务 |
| `MCS_WEB_AUTH_URL` | Supabase 项目 HTTPS 根地址 |
| `MCS_WEB_AUTH_PUBLISHABLE_KEY` | Supabase publishable key |
| `MCS_WEB_AUTH_SESSION_KEY` | 32 字节随机值的标准 Base64 编码 |
| `MCS_WEB_AUTH_ADMIN_IDS` | Supabase 用户 ID，至少一个管理员 |
| `MCS_WEB_AUTH_EMAIL_ENABLED=0` | 未提供发信服务时关闭注册/找回发信能力 |

数据库连接串、会话密钥不应放入聊天、README 或前端环境变量。
管理员 ID 取自 Supabase 用户记录，不能用 GitHub 数字用户 ID 替代。
本机自托管使用 SQLite 的例外见 [部署清单第 7 节](部署清单.md)；
不要将 `MCS_WEB_ALLOW_LOCAL_DB=1` 用于没有持久卷的临时实例。

## 开源包维护

开发工作区运行：

    node mcs-web/scripts/export-open-source.mjs --out <新的空目录>

公开仓库也支持同一命令：根目录的 README、许可证与安全说明作为再次导出的来源。
导出失败（包括必需文件缺失）时不要上传产物。报告保存在产物目录之外。

导出排除论文 `arxiv/output/`、`arxiv/package-staging/` 和编译辅助文件；
正式 `arxiv/submission/`、原创论文 PDF、正文与证书继续保留。
公开历史此前另行重整，不能再用最早那次推送的提交数或体积描述现状；
当前版本以远程 `main` 为准，普通更新不得从旧导出副本强推或擅自改写历史。

检查使用有限的路径和密钥模式；检查通过不代表完整安全审计或数学正确性证明。

## 验收入口

    cd mcs-web
    npm ci
    node --test tests/release-export.test.mjs
    npm run build
    npm run check
    npm test

浏览器验收应设置 `MCS_WEB_REQUIRE_BROWSER=1`，避免把缺浏览器的跳过当成通过。
公网验收另需覆盖：HTTPS、GitHub 登录/退出、两账号数据隔离、管理员权限、
规划提交和轮询、重启后数据恢复、发布与撤回。此清单尚不表示上述公网验收已通过。
