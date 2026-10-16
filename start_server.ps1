# Ürgüp Meydanı WebAR - Yerel Test Sunucusu Başlatıcı
$Port = 8080
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Yerel IP Adresini Bul
$LocalIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -notmatch '169.254' } | Select-Object -First 1).IPAddress
if (-not $LocalIP) { $LocalIP = "localhost" }

Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host " 🏛️  URGUP MEYDANI WEBAR SUNUCUSU BASLATILDI" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host " Masaustu Tarayici: http://localhost:$Port/index.html" -ForegroundColor Green
Write-Host " Host Yonetici:     http://localhost:$Port/admin.html" -ForegroundColor Green
Write-Host " Ayni Wi-Fi Mobil:  http://$($LocalIP):$Port/index.html" -ForegroundColor Magenta
Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host " 💡 Mobil Kamera Ipuclari:" -ForegroundColor Gray
Write-Host " - Telefondan baglanirken https gerektiginde bu klasoru Vercel" -ForegroundColor Gray
Write-Host "   veya Netlify'a ucretsiz yukleyip 1 dakikada HTTPS linki alabilirsiniz." -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host " Sunucuyu durdurmak icin Ctrl + C tuslarina basin.`n" -ForegroundColor Gray

# Tarayıcıda aç
Start-Process "http://localhost:$Port/index.html"

# HTTP Dinleyici
$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add("http://*:$Port/")
try {
    $Listener.Start()
} catch {
    # Port veya yetki hatası durumunda localhost prefix'i dene
    $Listener = New-Object System.Net.HttpListener
    $Listener.Prefixes.Add("http://localhost:$Port/")
    $Listener.Start()
}

$MimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".glb"  = "model/gltf-binary"
    ".gltf" = "model/gltf+json"
    ".svg"  = "image/svg+xml"
}

while ($Listener.IsListening) {
    $Context = $Listener.GetContext()
    $Request = $Context.Request
    $Response = $Context.Response

    $Path = $Request.Url.LocalPath.TrimStart('/')
    if ([string]::IsNullOrEmpty($Path)) { $Path = "index.html" }
    
    $FilePath = Join-Path $Root $Path

    if (Test-Path $FilePath -PathType Leaf) {
        $Ext = [System.IO.Path]::GetExtension($FilePath).ToLower()
        $Mime = $MimeTypes[$Ext]
        if (-not $Mime) { $Mime = "application/octet-stream" }

        $Response.ContentType = $Mime
        $Response.AddHeader("Access-Control-Allow-Origin", "*")
        
        $Buffer = [System.IO.File]::ReadAllBytes($FilePath)
        $Response.ContentLength64 = $Buffer.Length
        $Response.OutputStream.Write($Buffer, 0, $Buffer.Length)
    } else {
        $Response.StatusCode = 404
        $ErrorBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $Response.OutputStream.Write($ErrorBytes, 0, $ErrorBytes.Length)
    }

    $Response.Close()
}
