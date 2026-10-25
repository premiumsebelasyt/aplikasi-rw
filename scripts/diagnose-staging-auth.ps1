param(
  [ValidateSet(
    "ketua-rt01", "ketua-rt02", "ketua-rt03", "ketua-rt04", "ketua-rt05", "ketua-rt06",
    "bendahara-rw16", "ketua-rw16", "admin-rw16"
  )]
  [string]$LoginId
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$environmentFile = Join-Path $repoRoot ".env.staging"
if (!(Test-Path -LiteralPath $environmentFile -PathType Leaf)) {
  throw "File .env.staging tidak ditemukan. Tidak ada koneksi yang dibuat."
}

$values = @{}
foreach ($line in Get-Content -LiteralPath $environmentFile) {
  if ($line -match '^\s*(?:#|$)') { continue }
  if ($line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
    throw "Format .env.staging tidak valid."
  }
  $values[$Matches[1]] = $Matches[2].Trim('"').Trim("'")
}

$expectedUrl = "https://ciaxjgbpjhdhoatvqgda.supabase.co"
$stagingUrl = $values["NEXT_PUBLIC_SUPABASE_URL"].TrimEnd('/')
$publishableKey = $values["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]
if ($stagingUrl -cne $expectedUrl) {
  throw "Target bukan Supabase staging RW16; tidak ada koneksi yang dibuat."
}
if ($publishableKey -notmatch '^sb_publishable_[A-Za-z0-9_-]+$') {
  throw "Publishable key staging tidak valid; tidak ada koneksi yang dibuat."
}

$secretSecure = Read-Host "Masukkan secret Supabase STAGING yang baru (input tersembunyi)" -AsSecureString
$secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretSecure)
$secret = $null
$passwordSecure = $null
$passwordPointer = [IntPtr]::Zero
$password = $null
$names = @(
  "SUPABASE_STAGING_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "RW16_TEST_LOGIN_ID",
  "RW16_STAGING_LOGIN_PASSWORD"
)
$previous = @{}
foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, "Process") }

try {
  $secret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
  if (!$secret.StartsWith("sb_secret_")) {
    throw "Secret tidak memakai format secret key staging yang diharapkan. Tidak ada koneksi yang dibuat."
  }

  $env:SUPABASE_STAGING_SECRET_KEY = $secret
  $env:NEXT_PUBLIC_SUPABASE_URL = $expectedUrl
  $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = $publishableKey

  if ($LoginId) {
    $passwordSecure = Read-Host "Password staging untuk $LoginId (input tersembunyi; tidak dicatat)" -AsSecureString
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordSecure)
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    if ([string]::IsNullOrEmpty($password)) { throw "Password kosong; tidak ada percobaan login." }
    $env:RW16_TEST_LOGIN_ID = $LoginId
    $env:RW16_STAGING_LOGIN_PASSWORD = $password
  }

  Push-Location $repoRoot
  try {
    & node scripts/diagnose-staging-auth.mjs
    if ($LASTEXITCODE -ne 0) { throw "Diagnostik berhenti dengan kode $LASTEXITCODE. Lihat tahap aman yang dilaporkan di atas." }
  } finally {
    Pop-Location
  }
} finally {
  foreach ($name in $names) {
    [Environment]::SetEnvironmentVariable($name, $previous[$name], "Process")
  }
  if ($secretPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer) }
  if ($passwordPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer) }
  $secret = $null
  $password = $null
  $secretSecure = $null
  $passwordSecure = $null
}
