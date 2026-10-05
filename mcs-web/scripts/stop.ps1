$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Join-Path $PSScriptRoot '..')
$pidFile = Join-Path $PWD 'runtime/server.pid'
if (-not (Test-Path -LiteralPath $pidFile)) { Write-Output '没有发现运行中的 MCS Web。'; exit 0 }
$processId = [int](Get-Content -LiteralPath $pidFile -Raw)
$process = Get-Process -Id $processId -ErrorAction SilentlyContinue
if ($process) { Stop-Process -Id $processId; Write-Output "已停止 MCS Web（PID $processId）。" } else { Write-Output '记录的进程已不存在。' }
Remove-Item -LiteralPath $pidFile -Force
