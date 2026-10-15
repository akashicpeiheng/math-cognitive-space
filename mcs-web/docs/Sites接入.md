# Sites 界面接入

Sites 托管最新版 React 界面，`/api/v2/` 由同源代理连接现有正式后端，学习数据继续写 E。
独立部署源在仓库的 `sites/mcs-workbench/`。Sites 网站默认私有；它的访问身份不自动变成 MCS 的学习账号。

## 配置与边界

后端新增两个可选配置：`MCS_WEB_SITES_ORIGIN`（精确 HTTPS origin，无末尾斜杠）和 `MCS_WEB_SITES_SECRET`（32 字节随机数的 base64url 表示）。
Sites 对应设置为 `MCS_BACKEND_ORIGIN` 和秘密 `MCS_SITES_SECRET`。秘密仅保存在受保护的运行配置与 Sites 运行环境。
不配置时原登录行为不变；部分配置或格式错误会在启动前报错。

代理检查浏览器写请求的 Origin 与跨站来源，只转发 MCS 的 Cookie 与 CSRF 头，不转发 Sites 身份 Cookie。
后端仍执行既有会话验证、CSRF 与账号归属检查；同源代理不授予额外的 MCS 权限。

GitHub 登录的第一跳回正式域名，在该浏览器设置原有 OAuth Cookie；Supabase 的回调地址不变。
回调通过原有 state/Cookie、PKCE 与一次性 OAuth 中间态验证后，返回 Sites 的短时一次性票据。
只有持有初始 Sites nonce、通过接入密钥验证的 Sites 代理能兑换它；兑换后由原有 establish 建立 MCS 会话。
票据有效期 2 分钟，OAuth 中间态有效期 10 分钟；过期或重复使用如实拒绝。

## 验证与回退

新增 `tests/sites-bridge.test.mjs` 验证登录回跳、其它浏览器/代理拒绝、票据重放拒绝及原登录与 CSRF；已接入 `npm test`。
Sites 源中的 `tests/proxy.test.mjs` 验证凭据转发边界、跨站写入拒绝、后端错误与 SPA 深链。
真实 GitHub 授权需要真实用户浏览器验收，桩测试不声称完成这一步。

关闭接入时删除后端两个 Sites 配置并重启；原有 MCS 账号、学习数据与正式域名继续使用原服务。
源码版本与 Sites 版本可分别回退；代码回退不恢复或覆盖学习数据。
