$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Join-Path $PSScriptRoot '..')
$pidFile = Join-Path $PWD 'runtime/server.pid'
if (-not (Test-Path -LiteralPath $pidFile)) { Write-Output '没有发现运行中的 MCS Web。'; exit 0 }
$processId = [int](Get-Content -LiteralPath $pidFile -Raw)
$process = Get-Process -Id $processId -ErrorAction SilentlyContinue
if ($process) {
    $details = Get-CimInstance Win32_Process -Filter "ProcessId=$processId"
    if ($details.Name -ne 'node.exe' -or $details.CommandLine -notmatch 'server[/\\]index\.mjs') { throw 'PID 记录不再指向 MCS 服务，停止操作已取消。' }
    & taskkill.exe /PID $processId /T /F | Out-Null
    if ($LASTEXITCODE -ne 0 -and (Get-Process -Id $processId -ErrorAction SilentlyContinue)) { throw '无法终止 MCS 服务进程树。' }
    Write-Output "已停止 MCS Web 及其检查进程树（PID $processId）。"
} else { Write-Output '记录的进程已不存在。' }
Remove-Item -LiteralPath $pidFile -Force
