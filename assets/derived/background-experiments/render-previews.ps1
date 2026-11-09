Add-Type -AssemblyName System.Drawing
$root = Join-Path (Get-Location) 'assets/derived/background-experiments'
$data = Get-Content -LiteralPath (Join-Path $root 'experiment-data.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$detailRows = @()
foreach ($name in @('short-720', 'long-1440')) {
    $obj = if ($name -eq 'short-720') { $data.short } else { $data.longer }
    foreach ($mode in @('clean', 'marked')) {
        $suffix = if ($mode -eq 'marked') { '-marked' } else { '' }
        $source = [Drawing.Bitmap]::new((Join-Path $root "$name-three-repeat$suffix.png"))
        foreach ($vw in @(1440, 1024, 768, 390)) {
            $tileWidth = if ($vw -eq 390) { 512 } else { $vw }
            $h = [int][math]::Round($source.Height * $tileWidth / 1024)
            $canvas = [Drawing.Bitmap]::new($vw, $h)
            $g = [Drawing.Graphics]::FromImage($canvas)
            $g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $g.DrawImage($source, 0, 0, $tileWidth, $h)
            $canvas.Save((Join-Path $root "$name-viewport-$vw-$mode.png"))
            $g.Dispose()
            $canvas.Dispose()
        }
        $join = ([int]$obj.path[200] - [int]$obj.origin + [int]$obj.period) % [int]$obj.period
        $start = [math]::Max(0, [math]::Min([int]$obj.period - 320, $join - 160))
        $detail = $source.Clone([Drawing.Rectangle]::new(0, $start, 512, 320), $source.PixelFormat)
        $detail.Save((Join-Path $root "$name-stair-detail-$mode.png"))
        $detail.Dispose()
        $source.Dispose()
        $detailRows += [pscustomobject]@{ Candidate=$name; Mode=$mode; StartY=$start; Width=512; Height=320 }
    }
}
$detailRows | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $root 'detail-crops.json') -Encoding UTF8
# Review sheet only: labels do not alter the experimental tiles.
$sheet = [Drawing.Bitmap]::new(1054, 4400)
$g = [Drawing.Graphics]::FromImage($sheet)
$g.Clear([Drawing.Color]::FromArgb(235, 230, 220))
$font = [Drawing.Font]::new('Arial', 17)
$labels = @('720px - clean', '1440px - clean', '720px - seam markers', '1440px - seam markers')
$files = @('short-720-overview.png', 'long-1440-overview.png', 'short-720-three-repeat-marked.png', 'long-1440-three-repeat-marked.png')
for ($i=0; $i -lt 4; $i++) {
    $x = 12 + ($i % 2) * 527
    $y = 10 + [int][math]::Floor($i / 2) * 2200
    $g.DrawString($labels[$i], $font, [Drawing.Brushes]::Black, $x, $y)
    $im = [Drawing.Bitmap]::new((Join-Path $root $files[$i]))
    $g.DrawImage($im, $x, $y+35, 500, [int][math]::Round($im.Height * 500 / $im.Width))
    $im.Dispose()
}
$sheet.Save((Join-Path $root 'comparison-overview.png'))
$g.Dispose()
$sheet.Dispose()
$font.Dispose()

