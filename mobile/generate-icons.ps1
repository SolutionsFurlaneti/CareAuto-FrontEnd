# Generate the same spade as the Android vector at the sizes required by Safari/manifests.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$icons = Join-Path $PSScriptRoot '../public/icons'
New-Item -ItemType Directory -Path $icons -Force | Out-Null
foreach ($entry in @(@(180, 'apple-touch-icon.png'), @(192, 'icon-192.png'), @(512, 'icon-512.png'))) {
    $size = [int]$entry[0]
    $bitmap = [System.Drawing.Bitmap]::new($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#F4D18A'))
    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#091A15'))
        $graphics.ScaleTransform($size / 108.0, $size / 108.0)
        $spade = [System.Drawing.Drawing2D.GraphicsPath]::new()
        try {
            $spade.AddBezier(54,25,48,37,29,44,29,58)
            $spade.AddBezier(29,58,29,72,46,75,52,63)
            $spade.AddBezier(52,63,52,72,47,77,43,80)
            $spade.AddLine(43,80,65,80)
            $spade.AddBezier(65,80,61,77,56,72,56,63)
            $spade.AddBezier(56,63,62,75,79,72,79,58)
            $spade.AddBezier(79,58,79,44,60,37,54,25)
            $spade.CloseFigure()
            $graphics.FillPath($brush, $spade)
        } finally { $spade.Dispose() }
        $bitmap.Save((Join-Path $icons $entry[1]), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $brush.Dispose(); $graphics.Dispose(); $bitmap.Dispose() }
}
