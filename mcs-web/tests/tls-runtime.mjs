import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 本地 TLS 运行时：给「公网模式跑在 https 上」这件事做真机验收的准备。
 *
 * ## 为什么需要它
 *
 * 公网模式的会话 Cookie 是 `__Host-` + `Secure`，而浏览器**拒收** http 页面下发的
 * `Secure` Cookie。也就是说：http 下不是"不够安全"，而是**登录根本走不通**。
 * 这条结论不能只靠读文档——要在真浏览器里、真的走一次 https 才算数。
 *
 * 证书按「有就真生成、没有就明确跳过」处理（与 `browser-runtime.mjs` 同一套纪律）：
 * 先试 openssl（Linux/macOS 与装了它的 Windows），再试 Windows 自带的
 * `New-SelfSignedCertificate`。都没有就返回 `null`，调用方打印跳过原因，
 * **不把"没验"说成"验过了"**。
 *
 * 证书只用于本机回环、只活两天，且**不落进仓库**（生成在调用方给的临时目录里）。
 */

function run(command, args, options = {}) {
  return execFileSync(command, args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', ...options });
}

function has(command) {
  try {
    const probe = process.platform === 'win32' ? 'where.exe' : 'which';
    run(probe, [command]);
    return true;
  } catch {
    return false;
  }
}

/** openssl 能生成 IP SAN 的证书，跨平台且最快。 */
function viaOpenSsl(dir) {
  if (!has('openssl')) return null;
  const key = join(dir, 'tls-key.pem');
  const cert = join(dir, 'tls-cert.pem');
  try {
    run('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
      '-keyout', key, '-out', cert, '-days', '2',
      '-subj', '/CN=127.0.0.1',
      '-addext', 'subjectAltName=IP:127.0.0.1,DNS:localhost',
    ]);
  } catch {
    return null;
  }
  return existsSync(key) && existsSync(cert) ? { kind: 'pem', key, cert } : null;
}

/** Windows 自带的路子：证书存进「当前用户」存储再导出 pfx，随后把存储里那条删掉。 */
function viaWindowsStore(dir) {
  if (process.platform !== 'win32') return null;
  const pfx = join(dir, 'tls-cert.pfx');
  const passphrase = 'mcs-local-tls-test';
  const script = [
    '$ErrorActionPreference = "Stop"',
    '$cert = New-SelfSignedCertificate -DnsName "127.0.0.1","localhost" -CertStoreLocation "Cert:\\CurrentUser\\My" -NotAfter (Get-Date).AddDays(2)',
    `$pw = ConvertTo-SecureString -String "${passphrase}" -Force -AsPlainText`,
    `Export-PfxCertificate -Cert $cert -FilePath "${pfx}" -Password $pw | Out-Null`,
    'Remove-Item -Path ("Cert:\\CurrentUser\\My\\" + $cert.Thumbprint) -Force',
  ].join('; ');
  try {
    run('pwsh', ['-NoProfile', '-NonInteractive', '-Command', script], { timeout: 60000 });
  } catch {
    return null;
  }
  return existsSync(pfx) ? { kind: 'pfx', pfx, passphrase } : null;
}

/**
 * 生成本机 TLS 证书。返回 `null` 表示这台机器上两种办法都不可用——
 * 调用方据此**跳过** https 验收并说明原因。
 */
export function ensureCertificate(dir) {
  mkdirSync(dir, { recursive: true });
  return viaOpenSsl(dir) ?? viaWindowsStore(dir);
}

/** 把 `ensureCertificate` 的结果翻成 `https.createServer` 需要的选项。 */
export function credentialsFor(material, readFileSync) {
  if (!material) return null;
  if (material.kind === 'pem') return { cert: readFileSync(material.cert), key: readFileSync(material.key) };
  return { pfx: readFileSync(material.pfx), passphrase: material.passphrase };
}
