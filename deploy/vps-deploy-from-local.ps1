# Déploie Natus sur le VPS : copie .env.local + lance vps-first-install.sh
# Usage : powershell -File deploy/vps-deploy-from-local.ps1
#         powershell -File deploy/vps-deploy-from-local.ps1 -Host 161.97.134.231

param(
  [string]$Host = "161.97.134.231",
  [string]$User = "root",
  [string]$AppUrl = "http://161.97.134.231:3002"
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")

$EnvLocal = Join-Path $Root ".env.local"
if (-not (Test-Path $EnvLocal)) {
  Write-Error ".env.local introuvable dans $Root"
}

$lines = Get-Content $EnvLocal
$seen = @{}
$out = New-Object System.Collections.Generic.List[string]

foreach ($line in $lines) {
  if ($line -match '^\s*#' -or $line -match '^\s*$') {
    $out.Add($line)
    continue
  }
  if ($line -match '^([^=]+)=(.*)$') {
    $key = $matches[1].Trim()
    if ($seen.ContainsKey($key)) { continue }
    $seen[$key] = $true
    if ($key -eq "NEXT_PUBLIC_APP_URL") {
      $out.Add("NEXT_PUBLIC_APP_URL=$AppUrl")
    } elseif ($key -eq "CRON_SECRET") {
      $secret = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
      $out.Add("CRON_SECRET=$secret")
    } else {
      $out.Add($line)
    }
  } else {
    $out.Add($line)
  }
}

if (-not $seen.ContainsKey("NEXT_PUBLIC_APP_URL")) {
  $out.Add("NEXT_PUBLIC_APP_URL=$AppUrl")
}

$TempEnv = Join-Path $env:TEMP "natus-vps.env"
$out | Set-Content -Path $TempEnv -Encoding UTF8

$Remote = "${User}@${Host}"
$AppDir = "/var/www/natus"

Write-Host "→ Copie .env.local vers ${Remote}:${AppDir}/.env.local"
ssh $Remote "mkdir -p $AppDir"
scp $TempEnv "${Remote}:${AppDir}/.env.local"

Write-Host "→ Clone / build / PM2 sur le VPS"
ssh $Remote @"
set -e
if [ ! -d '$AppDir/.git' ]; then
  git clone --branch master https://github.com/fleapouissal-lang/natus-sys.git '$AppDir'
fi
cd '$AppDir'
git fetch origin master
git reset --hard origin/master
bash deploy/vps-first-install.sh
"@

Write-Host ""
Write-Host "✓ Déploiement terminé : $AppUrl"
