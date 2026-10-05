/**
 * 数据库连通性自检（部署前跑一次，省掉一轮「Render 起不来、日志里只有一句英文错误」的来回）。
 *
 * 用法（**推荐**：URL 里不带密码，脚本会交互式问你，密码不必做百分号编码）：
 *     cd mcs-web
 *     node scripts/check-db.mjs 'postgresql://postgres.<ref>@aws-0-<区域>.pooler.supabase.com:5432/postgres'
 *
 * 也接受把密码写进 URL（`…:密码@…`）或放进环境变量 `DATABASE_URL` / `MCS_WEB_DB_URL`。
 *
 * 它按**最容易出错的那几件事**逐条核对，并把数据库给的英文错误码翻成人话：
 * 密码还留着占位符、主机名是直连（IPv6，托管平台连不上）、ref 写错、密码错、缺 TLS、
 * 以及最关键的——这个账号有没有建表权限（我们的迁移要建 profiles/events/notes/network_views
 * 与认证用的两张表；没有权限的话，服务会在启动时迁移那一步失败）。
 *
 * 只读 + 一次权限查询，**不改动任何数据**。
 */

import { createInterface } from 'node:readline';

const input = process.env.DATABASE_URL ?? process.env.MCS_WEB_DB_URL ?? process.argv[2] ?? '';
if (!input) {
  console.error('用法：node scripts/check-db.mjs \'postgresql://postgres.<ref>@<pooler 主机>:5432/postgres\'');
  console.error('（URL 里不带密码也行，脚本会问你；也可以设置在环境变量 DATABASE_URL 里）');
  process.exit(2);
}

function fail(headline, advice) {
  console.error(`\n✗ ${headline}`);
  if (advice) console.error(`  → ${advice}`);
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(input);
} catch {
  /*
   * 走到这里几乎总是同一个原因：**把密码塞进 URL 时带了特殊字符**。
   * `@ / ? #` 在 URL 里有结构含义，`/?#` 甚至会让它解析失败（空格也会让 shell 拆参数）。
   * 与其教人逐个百分号编码，不如让他把密码留空——下面会交互式问。
   */
  fail('连接串不是一个合法的 URL。', [
    '最常见的原因：密码里含 @ / ? # 或空格，它们会破坏 URL 结构。',
    '省事的做法——URL 里**不写密码**，让脚本问你要：',
    "  node scripts/check-db.mjs 'postgresql://postgres.<ref>@<pooler 主机>:5432/postgres'",
  ].join('\n     '));
}
if (!/^postgres(ql)?:$/.test(parsed.protocol)) fail(`协议是 ${parsed.protocol}，不是 postgres。`, '复制 Supabase 里的 "Session pooler" 那一行。');

/** 隐藏输入（有终端时）或按行读取（管道/重定向时）。 */
function askPassword(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      const rl = createInterface({ input: stdin, output: process.stdout });
      process.stdout.write(`${question}（从管道读取）\n`);
      rl.once('line', (line) => { rl.close(); resolve(line.trim()); });
      return;
    }
    process.stdout.write(question);
    let value = '';
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    const onData = (chunk) => {
      for (const ch of chunk.toString('utf8')) {
        if (ch === '\r' || ch === '\n') {
          stdin.removeListener('data', onData);
          stdin.setRawMode(wasRaw ?? false);
          stdin.pause();
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (ch === '\u0003') { process.stdout.write('\n'); process.exit(130); } // Ctrl+C
        if (ch === '\u007f' || ch === '\b') { value = value.slice(0, -1); continue; }
        value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

/*
 * 密码的处理：URL 里给了就用（先解码，兼容已百分号编码的），没给就问。
 * 无论哪种，最后都用 `encodeURIComponent` 重新拼进连接串——**调用方永远不需要自己编码**。
 */
let password = decodeURIComponent(parsed.password ?? '');
if (!password || /your-password/i.test(password)) password = await askPassword('请输入数据库密码（输入不回显，粘贴后回车）：');
if (!password) fail('没有拿到密码。', '重跑一次，在提示处粘贴数据库密码。');

const host = parsed.hostname;
const port = parsed.port || '5432';
const user = decodeURIComponent(parsed.username);
const database = parsed.pathname.replace(/^\//, '') || 'postgres';
const isPooler = host.includes('pooler');
const refInUser = user.includes('.') ? user.split('.').slice(1).join('.') : null;
console.log(`主机：${host}:${port}`);
console.log(`用户：${user}`);
console.log(`数据库：${database}`);
console.log(`密码：${'*'.repeat(Math.min(password.length, 12))}（${password.length} 个字符）`);

if (!isPooler) {
  console.log('\n⚠ 主机名里没有 "pooler"，这看起来是 **直连** 地址。');
  console.log('  直连是 IPv6，Render 这类托管平台连不上；本机测试也许能通，但线上会失败。');
  console.log('  建议改用 Supabase → Connect → Session pooler（或 Transaction pooler，端口 6543）。');
}
if (!refInUser) {
  console.log('\n⚠ 用户名的格式应当是 postgres.<项目ref>（pooler 的连接串一定要带这个后缀）。');
  console.log('  ref 从 Project Settings → General 的 Reference ID 复制。');
}

const sslMode = String(process.env.MCS_WEB_DB_SSL ?? 'require').toLowerCase();
const ssl = sslMode === 'disable' ? false : { rejectUnauthorized: sslMode === 'verify' };
const connectionString = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;

const { Client } = await import('pg');
const client = new Client({ connectionString, ssl, connectionTimeoutMillis: 15000 });
try {
  await client.connect();
} catch (error) {
  const code = error.code ?? '';
  const message = String(error.message ?? '');
  /*
   * `XX000` + "tenant/user ... not found" 是 Supabase 池子在**项目 ref 不存在**时的报法
   * （真实踩过：ref 里 i/l 抄错一个字符）。它不是密码问题，所以单独翻译。
   */
  if (code === 'XX000' && /not found/i.test(message)) {
    fail('池子找不到这个租户/用户——**项目 ref 写错了**。', '用户名必须是 postgres.<项目ref>；ref 从 Project Settings → General 的 Reference ID 复制，别手打。');
  }
  const map = {
    ENOTFOUND: ['主机名解析不了。', isPooler ? '核对主机是否拼错（pooler 主机随项目区域变化，别手打）。' : '这是直连地址，请改用 pooler 主机。'],
    ETIMEDOUT: ['连接超时。', '端口写错或网络被拦；会话模式是 5432、事务模式是 6543。'],
    ENETUNREACH: ['网络不可达——多半是连到了 IPv6 的直连地址。', '改用 pooler 主机。'],
    EHOSTUNREACH: ['主机不可达。', '核对主机与端口。'],
    ECONNREFUSED: ['对方拒绝连接。', '端口不对，或者该地址不接受外部连接。'],
    ECONNRESET: ['连接被重置。', '两种常见原因：项目 ref 不存在（池子直接断开），或本机网络对该连接有干扰。先核对 ref，再重试一次。'],
    '28P01': ['密码错误。', '用建项目时保存的数据库密码；忘了可以在 Supabase → Project Settings → Database 里重置。'],
    '28000': ['用户或租户不存在——**项目 ref 写错了**。', '用户名必须是 postgres.<项目ref>，ref 从 Project Settings → General 的 Reference ID 复制。'],
    '3D000': ['数据库不存在。', '路径应当是 /postgres。'],
  };
  const [headline, advice] = map[code] ?? [`连接失败：${message}`, '把上面这段原文发出来即可。'];
  const extra = !isPooler && !/pooler/.test(advice) ? '（另外：当前用的是直连地址，线上会连不通。）' : '';
  fail(`${headline}${code ? `（${code}）` : ''}`, `${advice}${extra}`);
}

try {
  const info = await client.query('select current_database() as db, current_user as usr, version() as v');
  const row = info.rows[0];
  console.log(`\n✓ 连接成功：${row.db} / ${row.usr}`);
  console.log(`  ${String(row.v).split(',')[0]}`);

  const rights = await client.query(
    "select has_schema_privilege(current_user, 'public', 'CREATE') as can_create, has_schema_privilege(current_user, 'public', 'USAGE') as can_use",
  );
  if (!rights.rows[0].can_create || !rights.rows[0].can_use) {
    fail('连上了，但这个账号在 public schema 上没有建表权限。', '服务启动时会在这里失败。请用 Supabase 的 postgres 账号连接串。');
  }
  console.log('✓ 有建表权限（服务启动时的迁移能跑）');

  const existing = await client.query(
    "select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_name in ('profiles','events','notes','network_views','mcs_security','mcs_owners')",
  );
  console.log(existing.rows[0].n === 0
    ? '· 库里还没有我们的表——首次启动时会自动建（这是预期）'
    : `· 已经存在 ${existing.rows[0].n} 张我们的表（说明之前启动过）`);

  console.log('\n结论：这串可以直接填进 Render 的 DATABASE_URL。');
} finally {
  await client.end().catch(() => {});
}
