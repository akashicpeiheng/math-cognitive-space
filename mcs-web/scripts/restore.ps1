param([Parameter(Mandatory = $true)][string]$Backup)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Join-Path $PSScriptRoot '..')
node scripts/restore.mjs $Backup
