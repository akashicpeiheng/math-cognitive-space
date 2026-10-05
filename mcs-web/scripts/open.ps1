# 一键打开 MCS 网站：已在运行就只开浏览器，没运行就先后台启动、就绪后再开。
# 幂等——重复双击不会产生第二个服务进程，是否需要启动只看 /api/v2/health。
# 用法：
#   pwsh -File scripts/open.ps1            打开 MCS Web 工作台（http://127.0.0.1:3784）
#   pwsh -File scripts/open.ps1 -NoBrowser 只确保服务就绪，不开浏览器（脚本与自动化用）
#   pwsh -File scripts/open.ps1 -Legacy    打开旧单文件站点，不启动本机服务
# 仓库根目录的「打开MCS网站.cmd」与桌面快捷方式都调用本脚本。
[CmdletBinding()]
param(
    # 服务端口：默认取 MCS_WEB_PORT，否则 3784（与 server/config.mjs 的默认值一致）
    [int]$Port = $(if ($env:MCS_WEB_PORT) { [int]$env:MCS_WEB_PORT } else { 3784 }),
    # 只做启动与就绪检查，不打开浏览器
    [switch]$NoBrowser,
    # 打开仓库根目录的旧站单文件「数学认知空间.html」（若存在）
    [switch]$Legacy
)

$ErrorActionPreference = 'Stop'
$webRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$repoRoot = Split-Path -Parent $webRoot

if ($Legacy) {
    $legacyFile = Join-Path $repoRoot '数学认知空间.html'
    if (-not (Test-Path -LiteralPath $legacyFile)) { throw "找不到旧站单文件：$legacyFile" }
    if (-not $NoBrowser) { Start-Process $legacyFile }
    Write-Output "已打开旧站单文件：$legacyFile"
    exit 0
}

$origin = "http://127.0.0.1:$Port"
$healthUrl = "$origin/api/v2/health"

function Test-McsWebReady {
    try {
        $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
        return [bool]$health.ok
    }
    catch {
        return $false
    }
}

if (Test-McsWebReady) {
    Write-Output "MCS 网站已在运行：$origin"
    if (-not $NoBrowser) { Start-Process $origin }
    exit 0
}

try {
    # 复用既有启动脚本：缺 web/dist 时先构建、后台起服务、等到就绪，并由它打开浏览器。
    & (Join-Path $PSScriptRoot 'start.ps1') -Port $Port -NoBrowser:$NoBrowser
}
catch {
    Write-Output "MCS 网站未能打开：$($_.Exception.Message)"
    $pidFile = Join-Path $webRoot 'runtime/server.pid'
    $stderrLog = Join-Path $webRoot 'runtime/server.err.log'
    if (Test-Path -LiteralPath $pidFile) {
        Write-Output "提示：若 PID 记录里的进程还活着但服务不健康，先运行 scripts/stop.ps1 再重试。"
    }
    if (Test-Path -LiteralPath $stderrLog) {
        $tail = @(Get-Content -LiteralPath $stderrLog -Tail 12)
        if ($tail.Count -gt 0) {
            Write-Output ("最近的服务错误：" + [Environment]::NewLine + ($tail -join [Environment]::NewLine))
        }
    }
    exit 1
}

exit 0
