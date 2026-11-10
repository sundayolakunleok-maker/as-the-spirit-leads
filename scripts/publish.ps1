# Starts the website (if needed) and opens a public Cloudflare quick tunnel.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts\publish.ps1
$ErrorActionPreference = "Continue"

$site = Split-Path -Parent $PSScriptRoot
$cf = Join-Path $site "tools\cloudflared.exe"
$errLog = Join-Path $site "tools\tunnel.err.log"
$outLog = Join-Path $site "tools\tunnel.out.log"
$urlFile = Join-Path $site "tools\public-url.txt"

if (-not (Test-Path $cf)) {
  Write-Output "cloudflared.exe not found at $cf"
  Write-Output "Run scripts\download-cloudflared.ps1 first."
  exit 1
}

# 1. Make sure the website is listening on port 3000
$listening = $false
try {
  $r = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:3000/" -TimeoutSec 5
  if ($r.StatusCode -eq 200) { $listening = $true }
} catch { $listening = $false }

if (-not $listening) {
  Write-Output "Starting website server..."
  Start-Process -FilePath "node" -ArgumentList "scripts\start.js" -WorkingDirectory $site -WindowStyle Hidden
  for ($i = 0; $i -lt 25; $i++) {
    Start-Sleep -Seconds 1
    try {
      $r = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:3000/" -TimeoutSec 3
      if ($r.StatusCode -eq 200) { $listening = $true; break }
    } catch { }
  }
}
Write-Output ("website listening: " + $listening)
if (-not $listening) { exit 1 }

# 2. Fresh logs
foreach ($f in @($errLog, $outLog, $urlFile)) {
  if (Test-Path $f) { Remove-Item $f -Force }
}

# 3. Open the public tunnel. http2 over TCP/443 survives networks that block QUIC/UDP 7844.
Write-Output "Opening public tunnel..."
$p = Start-Process -FilePath $cf `
  -ArgumentList 'tunnel --url http://127.0.0.1:3000 --no-autoupdate --protocol http2' `
  -NoNewWindow -PassThru -RedirectStandardError $errLog -RedirectStandardOutput $outLog
Write-Output ("tunnel pid " + $p.Id)
Set-Content -Path (Join-Path $site "tools\tunnel.pid") -Value $p.Id

$url = $null
for ($i = 0; $i -lt 45; $i++) {
  Start-Sleep -Seconds 2
  if (Test-Path $errLog) {
    $text = [string](Get-Content $errLog -Raw -ErrorAction SilentlyContinue)
    foreach ($m in [regex]::Matches($text, "https://[a-z0-9-]+\.trycloudflare\.com")) {
      if ($m.Value -ne "https://api.trycloudflare.com") { $url = $m.Value; break }
    }
    if ($url) { break }
  }
}

if (-not $url) {
  Write-Output "No tunnel URL found. Last log lines:"
  if (Test-Path $errLog) { Get-Content $errLog -Tail 10 }
  exit 1
}

Set-Content -Path $urlFile -Value $url
Write-Output ("PUBLIC_URL=" + $url)

# 4. Verify the public URL actually serves the site
for ($i = 0; $i -lt 10; $i++) {
  try {
    $test = Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 20
    Write-Output ("public check: " + $test.StatusCode)
    if ($test.StatusCode -eq 200) { break }
  } catch {
    Write-Output ("public check retry: " + $_.Exception.Message)
    Start-Sleep -Seconds 5
  }
}
