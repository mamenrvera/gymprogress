Add-Type -AssemblyName System.Drawing

function New-GymIcon([int]$size, [string]$outPath) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  $s = $size / 512.0

  # Fondo redondeado
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $r = 116 * $s
  $w = $size
  $path.AddArc(0, 0, $r, $r, 180, 90)
  $path.AddArc($w - $r, 0, $r, $r, 270, 90)
  $path.AddArc($w - $r, $w - $r, $r, $r, 0, 90)
  $path.AddArc(0, $w - $r, $r, $r, 90, 90)
  $path.CloseFigure()
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point($size, $size)),
    [System.Drawing.Color]::FromArgb(22, 28, 40),
    [System.Drawing.Color]::FromArgb(7, 9, 13)
  )
  $g.FillPath($brush, $path)

  # Borde interior sutil
  $penBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(34, 41, 56), [float](2 * $s))
  $inner = New-Object System.Drawing.Drawing2D.GraphicsPath
  $ir = 94 * $s; $ix = 28 * $s; $iw = 456 * $s
  $inner.AddArc($ix, $ix, $ir, $ir, 180, 90)
  $inner.AddArc($ix + $iw - $ir, $ix, $ir, $ir, 270, 90)
  $inner.AddArc($ix + $iw - $ir, $ix + $iw - $ir, $ir, $ir, 0, 90)
  $inner.AddArc($ix, $ix + $iw - $ir, $ir, $ir, 90, 90)
  $inner.CloseFigure()
  $g.DrawPath($penBorder, $inner)

  # Barra / mancuerna en lima
  $lime = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(90, 90)),
    (New-Object System.Drawing.Point(420, 420)),
    [System.Drawing.Color]::FromArgb(226, 251, 154),
    [System.Drawing.Color]::FromArgb(132, 204, 22)
  )
  $limeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(190, 242, 100))

  function Fill-RoundRect([double]$x, [double]$y, [double]$ww, [double]$hh, [double]$rr) {
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $p.AddArc([float]($x * $s), [float]($y * $s), [float]($rr * 2 * $s), [float]($rr * 2 * $s), 180, 90)
    $p.AddArc([float](($x + $ww - $rr * 2) * $s), [float]($y * $s), [float]($rr * 2 * $s), [float]($rr * 2 * $s), 270, 90)
    $p.AddArc([float](($x + $ww - $rr * 2) * $s), [float](($y + $hh - $rr * 2) * $s), [float]($rr * 2 * $s), [float]($rr * 2 * $s), 0, 90)
    $p.AddArc([float]($x * $s), [float](($y + $hh - $rr * 2) * $s), [float]($rr * 2 * $s), [float]($rr * 2 * $s), 90, 90)
    $p.CloseFigure()
    $g.FillPath($limeBrush, $p)
  }

  Fill-RoundRect 96 214 54 150 22
  Fill-RoundRect 362 214 54 150 22
  Fill-RoundRect 166 238 38 102 16
  Fill-RoundRect 308 238 38 102 16
  Fill-RoundRect 196 276 120 26 13

  # Flecha de progreso
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(190, 242, 100), [float](30 * $s))
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $g.DrawLines($pen, @(
    (New-Object System.Drawing.PointF([float](190 * $s), [float](154 * $s))),
    (New-Object System.Drawing.PointF([float](256 * $s), [float](88 * $s))),
    (New-Object System.Drawing.PointF([float](322 * $s), [float](154 * $s)))
  ))
  $g.DrawLine($pen, [float](256 * $s), [float](96 * $s), [float](256 * $s), [float](196 * $s))

  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

New-GymIcon 192 "C:\Users\Mamen\Documents\Proyecto predeterminado\gymprogress\public\icon-192.png"
New-GymIcon 512 "C:\Users\Mamen\Documents\Proyecto predeterminado\gymprogress\public\icon-512.png"
Write-Output "Icons generated"
