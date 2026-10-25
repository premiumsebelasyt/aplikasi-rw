param(
  [ValidateRange(1, 65535)]
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$environmentFile = Join-Path $projectRoot ".env.staging"

if (-not (Test-Path -LiteralPath $environmentFile -PathType Leaf)) {
  throw "File .env.staging tidak ditemukan. Isi URL dan publishable key staging lokal terlebih dahulu."
}

$values = @{}
foreach ($line in Get-Content -LiteralPath $environmentFile) {
  if ($line -match '^\s*(?:#|$)') { continue }
  if ($line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
    throw "Format .env.staging tidak valid."
  }
  $values[$Matches[1]] = $Matches[2].Trim('"').Trim("'")
}

$stagingUrl = $values["NEXT_PUBLIC_SUPABASE_URL"]
$stagingPublishableKey = $values["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]
if ($stagingUrl -notmatch '^https://ciaxjgbpjhdhoatvqgda\.supabase\.co/?$') {
  throw "Supabase URL bukan project staging yang diharapkan; server tidak dijalankan."
}
if ($stagingPublishableKey -notmatch '^sb_publishable_[A-Za-z0-9_-]+$') {
  throw "Publishable key staging tidak valid; server tidak dijalankan."
}

$env:NEXT_PUBLIC_SUPABASE_URL = $stagingUrl.TrimEnd('/')
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = $stagingPublishableKey
$env:NEXT_PUBLIC_SITE_URL = $values["NEXT_PUBLIC_SITE_URL"]

# Prevent Next.js from importing production privileged credentials from .env.local.
$env:SUPABASE_SECRET_KEY = ""
$env:SUPABASE_SERVICE_ROLE_KEY = ""

Set-Location -LiteralPath $projectRoot
npm run dev -- --port $Port
