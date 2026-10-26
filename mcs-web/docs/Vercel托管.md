# Vercel 托管

Vercel 版本使用同一套 API 与业务语义，将需要持久保存的状态放到 PostgreSQL。
本机启动方式继续使用 SQLite；公网实例使用 Neon，生产与预览使用独立数据库。

- 学习记录、笔记库附件、私有网络、会话和对象归属保存在 PostgreSQL。
- 编写记录使用独立的 `mcs_authoring` schema，不进入个人档案导出。
- 异步任务通过 Vercel Queues 投递，PostgreSQL 保存状态与租约。重复投递不重复提交结果；取消之后迟到的结果不能恢复任务。
- 规划、关系检查、Python 证书重放与 Lean 在 Vercel Sandbox 中运行。沙箱只接收公开程序与本次任务输入，不接收数据库或登录凭据。
- Lean 使用已核对的 Linux 预热快照；保留固定工具链、锁定依赖、原始材料与检查器封印。任务结果仍区分内核重放与人工对应审阅。
- 内容发布在临时目录验算，内容包、激活指针和编写账本在同一 PostgreSQL 事务中提交。
- 管理员备份以压缩分块持久保存，返回 `backup-…` 标识，可在另一实例恢复。范围沿用原来的学习数据备份；会话和公共内容编写库需要单独的运维备份。

## 构建与部署

先从主工作区执行白名单导出并检查报告，禁止上传整个主工作区：

```powershell
node mcs-web/scripts/export-open-source.mjs --out <新的发布目录>
```

在发布目录中运行：

```powershell
node mcs-web/scripts/prepare-vercel-deployment.mjs
vercel link
vercel deploy --target preview
```

脚本生成根目录 `vercel.json`、API 入口及 `.vercelignore`。构建同时生成浏览器资源和供沙箱使用的公开运行包。新项目的首个部署可能自动成为 Production，部署前应核对 CLI 返回的目标环境。

需要配置原认证服务、会话密钥、管理员 ID、公网来源及 `MCS_WEB_LEAN_SNAPSHOT`。
数据库连接串由 Marketplace 按环境注入；不要把它们写进代码或构建产物。
生产保留既有会话密钥；预览使用独立密钥。正式域名继续使用原 OAuth 回调地址。
本机 DeepTutor 未运行时不要配置回环代理；当前公开部署沿用原来的关闭状态。

## 验证与边界

运行 `npm run check`、`npm run build` 和 `npm test`。测试入口会先执行
`node scripts/build-vercel-runtime.mjs`，为内容持久化测试准备公开运行包。
资源受限时可设置 `MCS_WEB_TEST_CONCURRENCY=1`；只改变测试调度，不改变断言。
本机没有原生 Lean 工具链时，相关真实重放用例会明确跳过，需另外保留云端真实重放证据。

预览需验证浏览器、API、队列消费者、数据库结果、另一个访客的隔离、备份恢复和发布失败回滚。
迁移现有数据时先用 SQLite 原生备份获取一致快照，在测试库演练并核对内容哈希；正式切换期间停止旧服务写入，再迁移最终快照。旧快照和 DNS 原值应留作回退依据。

免费额度耗尽会影响服务；并发、排队长度与任务时限已有上限。不要将有限用例通过说成一般数学证明，也不要把部署构建成功当成整站验收完成。
