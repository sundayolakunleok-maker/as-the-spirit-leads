# Keeps trying to open a public Cloudflare quick tunnel until one is actually reachable.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts\tunnel-loop.ps1 [-Attempts 6]
param([int]$Attempts = 6)

$ErrorActionPreference = "Continue"
$site = Split-Path -Parent $PSScriptRoot
$cf = Join-Path $site "tools\cloudflared.exe"
$urlFile = Join-Path $site "tools\public-url.txt"
$errLog = Join-Path $site "tools\tunnel.err.log"

# make sure the app is up
$listening = $false
try { $listening = (Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:3000/" -TimeoutSec 5).StatusCode -eq 200 } catch { }
if (-not $listening) {
  Start-Process -FilePath "node" -ArgumentList "scripts\start.js" -WorkingDirectory $site -WindowStyle Hidden
  for ($i = 0; $i -lt 25; $i++) {
    Start-Sleep -Seconds 1
    try { if ((Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:3000/" -TimeoutSec 3).StatusCode -eq 200) { $listening = $true; break } } catch { }
  }
}
Write-Output ("LILY_PROGRESS " + (@{percent=2; message="website listening: $listening"} | ConvertTo-Json -Compress))
if (-not $listening) { exit 1 }

for ($a = 1; $a -le $Attempts; $a++) {
  Write-Output ("LILY_PROGRESS " + (@{percent=(10 + 15*$a); message="tunnel attempt ${a} of $Attempts"} | ConvertTo-Json -Compress))
  Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
  Start-Sleep -Seconds 2
  if (Test-Path $errLog) { Remove-Item $errLog -Force }

  Start-Process -FilePath $cf `
    -ArgumentList 'tunnel --url http://127.0.0.1:3000 --no-autoupdate --protocol http2 --edge-ip-version 4' `
    -NoNewWindow -RedirectStandardError $errLog -RedirectStandardOutput (Join-Path $site "tools\tunnel.out.log") | Out-Null

  $url = $null
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 2
    $text = [string](Get-Content $errLog -Raw -ErrorAction SilentlyContinue)
    foreach ($m in [regex]::Matches($text, "https://[a-z0-9-]+\.trycloudflare\.com")) {
      if ($m.Value -ne "https://api.trycloudflare.com") { $url = $m.Value; break }
    }
    if ($url) { break }
  }
  if (-not $url) { Write-Output "attempt ${a}: no url"; continue }

  # give the connector a moment, then verify the public URL really serves the site
  $ok = $false
  for ($i = 0; $i -lt 8; $i++) {
    Start-Sleep -Seconds 4
    try {
      $body = (Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 15).Content
      if ($body -match "As the Spirit Leads") { $ok = $true; break }
    } catch { }
  }
  if ($ok) {
    Set-Content -Path $urlFile -Value $url
    Write-Output ("LILY_PROGRESS " + (@{percent=100; message="live"} | ConvertTo-Json -Compress))
    Write-Output ("PUBLIC_URL=" + $url)
    exit 0
  }
  Write-Output "attempt ${a}: url $url not serving yet"
}

if (Test-Path $errLog) { Get-Content $errLog -Tail 8 }
Write-Output "PUBLIC_URL=none"
exit 1
