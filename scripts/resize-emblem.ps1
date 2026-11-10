Add-Type -AssemblyName System.Drawing
$dir = "C:\Users\MADAM ENIOLA\Desktop\asthespiritlead\site\public\assets"
$inPath = Join-Path $dir "emblem.png"
$tmpPath = Join-Path $dir "emblem-web.png"
$bytes = [System.IO.File]::ReadAllBytes($inPath)
$ms = New-Object System.IO.MemoryStream(,$bytes)
$src = [System.Drawing.Image]::FromStream($ms)
$w = 420
$h = [int]($src.Height * $w / $src.Width)
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = 'HighQualityBicubic'
$g.DrawImage($src, 0, 0, $w, $h)
$bmp.Save($tmpPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
$src.Dispose()
$ms.Dispose()
Move-Item -LiteralPath $tmpPath -Destination $inPath -Force
Write-Output ("emblem resized to " + $w + "x" + $h + " bytes=" + (Get-Item $inPath).Length)
