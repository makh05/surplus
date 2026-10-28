# Builds the installable iPhone version of Surplus from src\app.html:
# index.html (with home-screen and offline tags) and the PNG icons.
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$utf8 = New-Object System.Text.UTF8Encoding $false

# --- index.html: the app page wrapped in a full document ---
$body = [IO.File]::ReadAllText((Join-Path $here "src\app.html"), $utf8)
$head = @'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#050506">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Surplus">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" type="image/png" href="icon-192.png">
<link rel="manifest" href="manifest.webmanifest">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
'@
$tail = @'

<script>if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});</script>
</body>
</html>
'@
[IO.File]::WriteAllText((Join-Path $here "index.html"), $head + $body + $tail, $utf8)

# --- icons: the red dot-matrix plus on black, no glow ---
Add-Type -AssemblyName System.Drawing
function New-Icon([int]$size, [string]$name) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(255, 11, 11, 13))
  $red = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 59, 48))
  $dim = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 38, 38, 43))
  # 9 x 9 dots centred on the icon (dot 4 sits exactly in the middle)
  $step = $size / 11.0; $mid = $size / 2.0
  for ($r = 0; $r -lt 9; $r++) {
    for ($c = 0; $c -lt 9; $c++) {
      $on = ($r -ge 1 -and $r -le 7 -and $c -ge 1 -and $c -le 7) -and (($c -ge 3 -and $c -le 5) -or ($r -ge 3 -and $r -le 5))
      $cx = $mid + ($c - 4) * $step; $cy = $mid + ($r - 4) * $step
      $rad = if ($on) { $step * 0.43 } else { $step * 0.23 }
      $g.FillEllipse($(if ($on) { $red } else { $dim }), [float]($cx - $rad), [float]($cy - $rad), [float]($rad * 2), [float]($rad * 2))
    }
  }
  $bmp.Save((Join-Path $here $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
New-Icon 180 "apple-touch-icon.png"
New-Icon 192 "icon-192.png"
New-Icon 512 "icon-512.png"
"built"
