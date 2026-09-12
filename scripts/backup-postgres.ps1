# Manual / scheduled PostgreSQL backup for the vocabulary platform.
# Usage: pwsh -File scripts/backup-postgres.ps1
# Restore:
#   docker exec -i vocabulary-postgres pg_restore --clean --if-exists -U vocab -d vocabulary < backups/vocab-YYYYMMDD.dump

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "backups"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outFile = Join-Path $outDir "vocab-$stamp.dump"

docker exec vocabulary-postgres pg_dump -U vocab -d vocabulary -Fc -f "/tmp/vocab.dump"
docker cp vocabulary-postgres:/tmp/vocab.dump $outFile
Write-Host "Wrote $outFile"
