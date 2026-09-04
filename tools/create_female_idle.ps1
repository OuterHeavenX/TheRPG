param(
  [string]$Source = "assets/characters/swordsman_lvl1/idle.png",
  [string]$Output = "assets/characters/arcane_ranger/idle.png"
)

Add-Type -AssemblyName System.Drawing

$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$outputPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $Output))
$outputDir = [System.IO.Path]::GetDirectoryName($outputPath)
[System.IO.Directory]::CreateDirectory($outputDir) | Out-Null

$sourceImage = [System.Drawing.Bitmap]::new($sourcePath)
$result = [System.Drawing.Bitmap]::new(768, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$canvas = [System.Drawing.Graphics]::FromImage($result)
$canvas.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$canvas.DrawImageUnscaled($sourceImage, 0, 0)
$canvas.Dispose()
$sourceImage.Dispose()

$hairPalette = @{
  '28293F' = [System.Drawing.Color]::FromArgb(255, 54, 25, 24)
  '4D3945' = [System.Drawing.Color]::FromArgb(255, 100, 43, 32)
  '684F5A' = [System.Drawing.Color]::FromArgb(255, 139, 61, 39)
  '3B2C33' = [System.Drawing.Color]::FromArgb(255, 76, 31, 27)
  '876C7D' = [System.Drawing.Color]::FromArgb(255, 178, 83, 47)
  '2B2023' = [System.Drawing.Color]::FromArgb(255, 47, 22, 22)
}

$clothPalette = @{
  '3F433D' = [System.Drawing.Color]::FromArgb(255, 28, 75, 72)
  '5E615A' = [System.Drawing.Color]::FromArgb(255, 42, 101, 94)
  '6F736A' = [System.Drawing.Color]::FromArgb(255, 55, 119, 107)
  '868B7C' = [System.Drawing.Color]::FromArgb(255, 75, 139, 121)
  '2D312B' = [System.Drawing.Color]::FromArgb(255, 22, 55, 55)
}

function Color-Key([System.Drawing.Color]$color) {
  return '{0:X2}{1:X2}{2:X2}' -f $color.R, $color.G, $color.B
}

function Is-Sword-Pixel([int]$row, [int]$x, [int]$y) {
  if ($row -lt 3) {
    $sum = $x + $y
    return ($y -ge 34 -and $x -lt 31 -and $sum -ge 58 -and $sum -le 70)
  }
  $delta = $x - $y
  return ($x -ge 37 -and $y -ge 34 -and $delta -ge -4 -and $delta -le 8)
}

$transparent = [System.Drawing.Color]::FromArgb(0, 0, 0, 0)

for ($row = 0; $row -lt 4; $row++) {
  $frameCount = if ($row -eq 3) { 4 } else { 12 }
  for ($frame = 0; $frame -lt $frameCount; $frame++) {
    $originX = $frame * 64
    $originY = $row * 64
    $hairXs = [System.Collections.Generic.List[int]]::new()
    $hairYs = [System.Collections.Generic.List[int]]::new()

    for ($y = 0; $y -lt 64; $y++) {
      for ($x = 0; $x -lt 64; $x++) {
        $pixel = $result.GetPixel($originX + $x, $originY + $y)
        if ($pixel.A -eq 0) { continue }

        if (Is-Sword-Pixel $row $x $y) {
          $result.SetPixel($originX + $x, $originY + $y, $transparent)
          continue
        }

        $key = Color-Key $pixel
        if ($hairPalette.ContainsKey($key)) {
          $result.SetPixel($originX + $x, $originY + $y, $hairPalette[$key])
          if ($y -le 34) {
            [void]$hairXs.Add($x)
            [void]$hairYs.Add($y)
          }
        } elseif ($clothPalette.ContainsKey($key)) {
          $result.SetPixel($originX + $x, $originY + $y, $clothPalette[$key])
        }
      }
    }

    if ($hairXs.Count -eq 0) { continue }
    $minX = [int](($hairXs | Measure-Object -Minimum).Minimum)
    $maxX = [int](($hairXs | Measure-Object -Maximum).Maximum)
    $maxY = [int](($hairYs | Measure-Object -Maximum).Maximum)
    $dark = [System.Drawing.Color]::FromArgb(255, 54, 25, 24)
    $mid = [System.Drawing.Color]::FromArgb(255, 100, 43, 32)
    $light = [System.Drawing.Color]::FromArgb(255, 139, 61, 39)

    $centerX = [int](($minX + $maxX) / 2)
    $tail = switch ($row) {
      0 { ,@([int]$minX, [int]($maxY-1)); ,@([int]($minX-1), [int]$maxY); ,@([int]($minX-1), [int]($maxY+1)); ,@([int]$minX, [int]($maxY+2)) }
      1 { ,@([int]$maxX, [int]($maxY-2)); ,@([int]($maxX+1), [int]($maxY-1)); ,@([int]($maxX+2), [int]$maxY); ,@([int]($maxX+1), [int]($maxY+1)) }
      2 { ,@([int]$minX, [int]($maxY-2)); ,@([int]($minX-1), [int]($maxY-1)); ,@([int]($minX-2), [int]$maxY); ,@([int]($minX-1), [int]($maxY+1)) }
      3 { ,@([int]$centerX, [int]$maxY); ,@([int]($centerX-1), [int]($maxY+1)); ,@([int]$centerX, [int]($maxY+2)); ,@([int]($centerX+1), [int]($maxY+1)) }
    }
    for ($i = 0; $i -lt $tail.Count; $i++) {
      $tx = [int]$tail[$i][0]
      $ty = [int]$tail[$i][1]
      if ($tx -lt 0 -or $tx -ge 64 -or $ty -lt 0 -or $ty -ge 64) { continue }
      $color = if ($i -eq 2) { $light } elseif ($i -eq 1) { $mid } else { $dark }
      $result.SetPixel($originX + $tx, $originY + $ty, $color)
    }
  }
}

$result.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$result.Dispose()
Write-Output $outputPath
