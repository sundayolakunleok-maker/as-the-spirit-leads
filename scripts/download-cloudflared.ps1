$ErrorActionPreference = "Stop"
$dir = "C:\Users\MADAM ENIOLA\Desktop\asthespiritlead\site\tools"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$out = Join-Path $dir "cloudflared.exe"
if (-not (Test-Path $out)) {
  $url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
  Write-Output "Downloading cloudflared..."
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $out -TimeoutSec 180
}
Write-Output ("Size: " + (Get-Item $out).Length)
$ver = cmd /c "`"$out`" --version 2>&1"
Write-Output $ver
