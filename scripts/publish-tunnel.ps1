$ErrorActionPreference = "Continue"
$site = "C:\Users\MADAM ENIOLA\Desktop\asthespiritlead\site"
$cf = Join-Path $site "tools\cloudflared.exe"
$log = Join-Path $site "tools\tunnel.log"
if (Test-Path $log) { Remove-Item $log -Force }
Write-Output "Starting public tunnel to http://127.0.0.1:3000 ..."
$args = @("tunnel", "--url", "http://127.0.0.1:3000", "--no-autoupdate", "--logfile", $log, "--loglevel", "info")
$p = Start-Process -FilePath $cf -ArgumentList $args -NoNewWindow -PassThru
Write-Output ("tunnel pid " + $p.Id)
$url = $null
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Seconds 2
  if (Test-Path $log) {
    $m = Select-String -Path $log -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" -AllMatches | Select-Object -First 1
    if ($m) { $url = $m.Matches[0].Value; break }
  }
}
if ($url) {
  Write-Output ("PUBLIC_URL=" + $url)
  Set-Content -Path (Join-Path $site "tools\public-url.txt") -Value $url
} else {
  Write-Output "No URL found yet; check tunnel.log"
}
Write-Output "Tunnel running in background. Press Ctrl+C or close this window to stop publishing."
Wait-Process -Id $p.Id
