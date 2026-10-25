$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$secureRoot = Join-Path $env:LOCALAPPDATA "RW16\signing"
$keystore = Join-Path $secureRoot "rw16-staging-release.p12"
$passwordStore = Join-Path $secureRoot "release-password.xml"
$artifactDir = Join-Path $repoRoot "outputs\android-production"
$artifact = Join-Path $artifactDir "NIC16-Production-release.apk"
$jdkRoot = Join-Path (Join-Path $env:LOCALAPPDATA "RW16\toolchain") "temurin-jdk21"
$javaHome = Get-ChildItem -LiteralPath $jdkRoot -Directory | Where-Object { Test-Path (Join-Path $_.FullName "bin\java.exe") } | Select-Object -First 1 -ExpandProperty FullName
$sdkRoot = Join-Path $env:LOCALAPPDATA "Android\Sdk"

if (!(Test-Path -LiteralPath $keystore) -or !(Test-Path -LiteralPath $passwordStore)) {
  throw "Local release signing key is not initialized for this Windows user."
}
if (!$javaHome) { throw "The required local JDK 21 runtime is unavailable." }
$passwordSecure = Import-Clixml -LiteralPath $passwordStore
$passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordSecure)
$previousEnvironment = @{}
foreach ($name in @("JAVA_HOME", "ANDROID_HOME", "ANDROID_SDK_ROOT", "RW16_ANDROID_KEYSTORE", "RW16_ANDROID_STORE_PASSWORD", "RW16_ANDROID_KEY_PASSWORD", "RW16_ANDROID_KEY_ALIAS")) {
  $previousEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
}
try {
  $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
  $env:RW16_ANDROID_KEYSTORE = $keystore
  $env:RW16_ANDROID_STORE_PASSWORD = $password
  $env:RW16_ANDROID_KEY_PASSWORD = $password
  $env:RW16_ANDROID_KEY_ALIAS = "rw16staging"
  $env:JAVA_HOME = $javaHome
  $env:ANDROID_HOME = $sdkRoot
  $env:ANDROID_SDK_ROOT = $sdkRoot
  Push-Location (Join-Path $repoRoot "android")
  try {
    & .\gradlew.bat --no-daemon --max-workers=2 --console=plain :app:assembleRelease
    if ($LASTEXITCODE -ne 0) { throw "Gradle release build failed with exit code $LASTEXITCODE" }
    $sourceApk = Join-Path $repoRoot "android\app\build\outputs\apk\release\app-release.apk"
    if (!(Test-Path -LiteralPath $sourceApk)) { throw "Gradle reported success but the expected APK was not found." }
    $buildTools = Join-Path $sdkRoot "build-tools\36.0.0"
    & (Join-Path $buildTools "apksigner.bat") verify --verbose $sourceApk | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "APK signing verification failed." }
    $badging = & (Join-Path $buildTools "aapt.exe") dump badging $sourceApk
    $badgingText = $badging -join "`n"
    if ($LASTEXITCODE -ne 0 -or ($badgingText -notmatch "package: name='id\.nuansaindahciomas\.rw16'")) {
      throw "APK package identity verification failed."
    }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($sourceApk)
    try {
      $scanEntries = @($archive.Entries | Where-Object { $_.FullName -match "classes.*\.dex|assets/public/index\.html|assets/capacitor\.config\.json" })
      $scanText = foreach ($entry in $scanEntries) {
        $entryStream = $entry.Open()
        $memory = [System.IO.MemoryStream]::new()
        try {
          $entryStream.CopyTo($memory)
          [System.Text.Encoding]::GetEncoding(28591).GetString($memory.ToArray())
        } finally {
          $entryStream.Dispose()
          $memory.Dispose()
        }
      }
      $joined = $scanText -join "`n"
      if ($joined -notmatch "nic16\.vercel\.app" -or
          $joined -match "sb_secret_[A-Za-z0-9_-]{16,}|service_role") {
        throw "APK backend host or embedded-secret scan failed."
      }
    } finally {
      $archive.Dispose()
    }
    New-Item -ItemType Directory -Path $artifactDir -Force | Out-Null
    if (Test-Path -LiteralPath $artifact) {
      $archiveDir = Join-Path $artifactDir "archive"
      New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null
      $archiveName = "RW16-Staging-release-$(Get-Date -Format 'yyyyMMdd-HHmmss-fff').apk"
      Move-Item -LiteralPath $artifact -Destination (Join-Path $archiveDir $archiveName)
    }
    Copy-Item -LiteralPath $sourceApk -Destination $artifact
  } finally {
    Pop-Location
  }
} finally {
  $env:RW16_ANDROID_KEYSTORE = $null
  $env:RW16_ANDROID_STORE_PASSWORD = $null
  $env:RW16_ANDROID_KEY_PASSWORD = $null
  $env:RW16_ANDROID_KEY_ALIAS = $null
  foreach ($name in $previousEnvironment.Keys) {
    [Environment]::SetEnvironmentVariable($name, $previousEnvironment[$name], "Process")
  }
  if ($passwordPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr) }
  $password = $null
  $passwordSecure = $null
}

$info = Get-Item -LiteralPath $artifact
$hash = (Get-FileHash -LiteralPath $artifact -Algorithm SHA256).Hash
Write-Output "APK: $($info.FullName)"
Write-Output "SizeBytes: $($info.Length)"
Write-Output "SHA256: $hash"
