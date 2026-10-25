$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$resRoot = Join-Path $repoRoot "android\app\src\main\res"
$logoPath = Join-Path $repoRoot "branding\nic16-logo-source.png"
if (!(Test-Path -LiteralPath $logoPath)) {
  throw "NIC16 logo source is missing from branding/nic16-logo-source.png."
}

Add-Type -AssemblyName System.Drawing
$logo = [System.Drawing.Bitmap]::FromFile($logoPath)

function Write-LogoCanvas {
  param(
    [Parameter(Mandatory)] [string] $Path,
    [Parameter(Mandatory)] [int] $Size,
    [Parameter(Mandatory)] [double] $MaxWidthFraction,
    [Parameter(Mandatory)] [double] $MaxHeightFraction,
    [Parameter(Mandatory)] [bool] $WhiteBackground
  )

  $canvas = [System.Drawing.Bitmap]::new(
    $Size,
    $Size,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  try {
    if ($WhiteBackground) {
      $graphics.Clear([System.Drawing.Color]::White)
    } else {
      $graphics.Clear([System.Drawing.Color]::Transparent)
    }
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $scale = [Math]::Min(
      ($Size * $MaxWidthFraction / $logo.Width),
      ($Size * $MaxHeightFraction / $logo.Height)
    )
    $width = [int][Math]::Round($logo.Width * $scale)
    $height = [int][Math]::Round($logo.Height * $scale)
    $x = [int][Math]::Floor(($Size - $width) / 2)
    $y = [int][Math]::Floor(($Size - $height) / 2)
    $graphics.DrawImage($logo, $x, $y, $width, $height)
    $canvas.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $canvas.Dispose()
  }
}

try {
  foreach ($density in @(
    @{ Name = "mdpi"; Pixels = 48 },
    @{ Name = "hdpi"; Pixels = 72 },
    @{ Name = "xhdpi"; Pixels = 96 },
    @{ Name = "xxhdpi"; Pixels = 144 },
    @{ Name = "xxxhdpi"; Pixels = 192 }
  )) {
    $directory = Join-Path $resRoot ("mipmap-" + $density.Name)
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    $pixels = [int]$density.Pixels
    Write-LogoCanvas (Join-Path $directory "ic_launcher.png") $pixels 0.86 0.86 $true
    Write-LogoCanvas (Join-Path $directory "ic_launcher_round.png") $pixels 0.86 0.86 $true
    Write-LogoCanvas (Join-Path $directory "ic_launcher_foreground.png") ($pixels * 2) 0.74 0.66 $false
  }

  # Android's system splash crops the animated icon to a central safe area.
  # Keep the entire wordmark inside that area so it remains intact on Android 10+.
  $drawableNoDensity = Join-Path $resRoot "drawable-nodpi"
  New-Item -ItemType Directory -Path $drawableNoDensity -Force | Out-Null
  Write-LogoCanvas (Join-Path $drawableNoDensity "splash_logo.png") 512 0.58 0.58 $false
} finally {
  $logo.Dispose()
}

Write-Output "Generated Android launcher and splash assets from branding/nic16-logo-source.png."
