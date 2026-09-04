param(
  [string]$Source = "assets/characters/swordsman_lvl1/idle.png",
  [string]$Output = "sprite-frame-preview.png",
  [int]$Row = 0
)

Add-Type -AssemblyName System.Drawing
$sourceImage = [System.Drawing.Bitmap]::new((Resolve-Path -LiteralPath $Source).Path)
$preview = [System.Drawing.Bitmap]::new(512, 512, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($preview)
$graphics.Clear([System.Drawing.Color]::FromArgb(255, 24, 24, 24))
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$sourceRect = [System.Drawing.Rectangle]::new(0, ($Row * 64), 64, 64)
$destRect = [System.Drawing.Rectangle]::new(0, 0, 512, 512)
$graphics.DrawImage($sourceImage, $destRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
$graphics.Dispose()
$sourceImage.Dispose()
$preview.Save((Join-Path (Get-Location) $Output), [System.Drawing.Imaging.ImageFormat]::Png)
$preview.Dispose()
