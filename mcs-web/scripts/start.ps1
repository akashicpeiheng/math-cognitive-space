# 后台启动 MCS Web 并等待就绪。幂等保护：PID 记在 runtime/server.pid，已在运行则拒绝重复启动。
# 用法：pwsh -File scripts/start.ps1 [-Port 3784] [-NoBrowser]
# 日常一键入口是 scripts/open.ps1：已在运行时它只打开浏览器，不重复启动。
[CmdletBinding()]
param(
    # 服务端口：默认取 MCS_WEB_PORT，否则 3784（与 server/config.mjs 的默认值一致）
    [int]$Port = $(if ($env:MCS_WEB_PORT) { [int]$env:MCS_WEB_PORT } else { 3784 }),
    # 只启动并等待就绪，不打开浏览器（供 open.ps1 与自动化使用）
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Join-Path $PSScriptRoot '..')
# 让子进程 node 与本脚本的等待循环用同一个端口
$env:MCS_WEB_PORT = "$Port"

if (-not (Test-Path -LiteralPath 'node_modules')) { throw '请先运行 npm install。' }
if (-not (Test-Path -LiteralPath 'web/dist/index.html')) { npm run build }

$runtime = Join-Path $PWD 'runtime'
New-Item -ItemType Directory -Force -Path $runtime | Out-Null
$pidFile = Join-Path $runtime 'server.pid'

$existing = $null
if (Test-Path -LiteralPath $pidFile) { $existing = Get-Content -LiteralPath $pidFile -Raw }
if ($existing) {
    $process = Get-Process -Id ([int]$existing) -ErrorAction SilentlyContinue
    if ($process) { throw "MCS Web 已在运行（PID $existing）。" }
    Remove-Item -LiteralPath $pidFile -Force
}

$origin = "http://127.0.0.1:$Port"
$stdout = Join-Path $runtime 'server.out.log'
$stderr = Join-Path $runtime 'server.err.log'
$process = Start-Process -FilePath 'node' -ArgumentList 'server/index.mjs' -WorkingDirectory $PWD -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru -WindowStyle Hidden
$process.Id | Set-Content -LiteralPath $pidFile -Encoding ascii

$deadline = (Get-Date).AddSeconds(25)
$ready = $false
while ((Get-Date) -lt $deadline) {
    try {
        $health = Invoke-RestMethod -Uri "$origin/api/v2/health" -TimeoutSec 2
        if ($health.ok) { $ready = $true; break }
    } catch { Start-Sleep -Milliseconds 300 }
}
if (-not $ready) {
    $detail = if (Test-Path -LiteralPath $stderr) { Get-Content -LiteralPath $stderr -Tail 12 | Out-String } else { '无错误日志。' }
    throw "MCS Web 未能在 25 秒内就绪。`n$detail"
}

Write-Output "MCS Web 已就绪：$origin"
if (-not $NoBrowser) {
    # 打开可见浏览器是本脚本的明确目的。
    Start-Process $origin
}
