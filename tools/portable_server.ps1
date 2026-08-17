$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$WebRoot = $ProjectRoot
$IndexFile = Join-Path $WebRoot 'index.html'
$DataDir = Join-Path $ProjectRoot 'data'
$StateFile = Join-Path $DataDir 'localStorage.json'

if (-not (Test-Path -LiteralPath $IndexFile -PathType Leaf)) {
    Write-Host 'HATA: index.html bulunamadi.' -ForegroundColor Red
    Write-Host "Beklenen dosya: $IndexFile"
    Read-Host 'Devam etmek icin Enter'
    exit 1
}
if (-not (Test-Path $DataDir)) { New-Item -ItemType Directory -Force -Path $DataDir | Out-Null }
if (-not (Test-Path $StateFile)) { [IO.File]::WriteAllText($StateFile, '{}', (New-Object Text.UTF8Encoding($false))) }

function Send-Bytes($stream, [string]$status, [string]$contentType, [byte[]]$bytes, [bool]$headOnly=$false) {
    $bodyLength = if ($headOnly) { 0 } else { $bytes.Length }
    $header = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $bodyLength`r`nCache-Control: no-store, no-cache, must-revalidate`r`nPragma: no-cache`r`nConnection: close`r`nX-Content-Type-Options: nosniff`r`n`r`n"
    $headerBytes = [Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    if (-not $headOnly -and $bytes.Length -gt 0) { $stream.Write($bytes, 0, $bytes.Length) }
    $stream.Flush()
}

function Mime-Type([string]$file) {
    switch ([IO.Path]::GetExtension($file).ToLowerInvariant()) {
        '.html' { return 'text/html; charset=utf-8' }
        '.js'   { return 'application/javascript; charset=utf-8' }
        '.css'  { return 'text/css; charset=utf-8' }
        '.json' { return 'application/json; charset=utf-8' }
        '.png'  { return 'image/png' }
        '.jpg'  { return 'image/jpeg' }
        '.jpeg' { return 'image/jpeg' }
        '.webp' { return 'image/webp' }
        '.wav'  { return 'audio/wav' }
        '.mp3'  { return 'audio/mpeg' }
        '.ico'  { return 'image/x-icon' }
        default { return 'application/octet-stream' }
    }
}

function Get-RequestPath([string]$target) {
    # Chrome / kurumsal proxy bazen origin-form (/...) yerine absolute-form
    # (http://127.0.0.1:PORT/...) gonderebilir. Her ikisini de kabul et.
    $path = $target
    if ($target -match '^https?://') {
        try {
            $u = [Uri]$target
            $path = $u.AbsolutePath
        } catch {
            $path = '/'
        }
    } else {
        $q = $target.IndexOf('?')
        if ($q -ge 0) { $path = $target.Substring(0,$q) }
    }
    if ([string]::IsNullOrWhiteSpace($path)) { $path = '/' }
    try { $path = [Uri]::UnescapeDataString($path) } catch {}
    return $path
}

$listener = $null
$port = $null
foreach ($candidate in 51731..51739) {
    $tryListener = $null
    try {
        $tryListener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, $candidate)
        $tryListener.Start()
        $listener = $tryListener
        $port = $candidate
        break
    } catch {
        try { if ($tryListener) { $tryListener.Stop() } } catch {}
    }
}

if ($null -eq $listener) {
    Write-Host 'HATA: 51731-51739 portlarinda uygun port bulunamadi.' -ForegroundColor Red
    Read-Host 'Devam etmek icin Enter'
    exit 1
}

$webRootFull = [IO.Path]::GetFullPath($WebRoot).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)
$webRootPrefix = $webRootFull + [IO.Path]::DirectorySeparatorChar

Write-Host ''
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host '       METINBALL - SEVDIGIMIZ OYUN CALISIYOR' -ForegroundColor Yellow
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host ''
Write-Host "Adres: http://127.0.0.1:$port/"
Write-Host 'Node.js / npm kurulumu gerekmiyor. Phaser icin internet baglantisi gerekir.' -ForegroundColor Green
Write-Host 'Kayitlar data\localStorage.json dosyasina yazilir.' -ForegroundColor Green
Write-Host 'Bu pencereyi kapatirsan oyun sunucusu durur.'
Write-Host ''

Start-Sleep -Milliseconds 200
Start-Process "http://127.0.0.1:$port/?v=0195"

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $reader = New-Object IO.StreamReader($stream, [Text.Encoding]::ASCII, $false, 8192, $true)
            $requestLine = $reader.ReadLine()
            if ([string]::IsNullOrWhiteSpace($requestLine)) { continue }

            $parts = $requestLine.Split(' ')
            if ($parts.Length -lt 2) { continue }
            $method = $parts[0].ToUpperInvariant()
            $target = $parts[1]
            $pathOnly = Get-RequestPath $target

            $headers = @{}
            while ($true) {
                $line = $reader.ReadLine()
                if ($null -eq $line -or $line -eq '') { break }
                $idx = $line.IndexOf(':')
                if ($idx -gt 0) {
                    $headers[$line.Substring(0,$idx).Trim().ToLowerInvariant()] = $line.Substring($idx+1).Trim()
                }
            }

            if ($pathOnly -eq '/api/state') {
                if ($method -eq 'GET') {
                    try { $json = Get-Content -Raw -LiteralPath $StateFile -Encoding UTF8 } catch { $json = '{}' }
                    if ([string]::IsNullOrWhiteSpace($json)) { $json = '{}' }
                    Send-Bytes $stream '200 OK' 'application/json; charset=utf-8' ([Text.Encoding]::UTF8.GetBytes($json))
                    continue
                }

                if ($method -eq 'POST') {
                    $length = 0
                    if ($headers.ContainsKey('content-length')) { [void][int]::TryParse($headers['content-length'], [ref]$length) }
                    if ($length -lt 0 -or $length -gt 33554432) {
                        Send-Bytes $stream '413 Payload Too Large' 'application/json; charset=utf-8' ([Text.Encoding]::UTF8.GetBytes('{"ok":false}'))
                        continue
                    }
                    # StreamReader headerlari okurken govdeyi de kendi buffer'ina alabilir.
                    # Bu nedenle POST govdesini ham network stream'den okumak bazi PC'lerde
                    # sonsuza kadar bekliyordu. Base64 govde ASCII oldugu icin ayni reader
                    # uzerinden content-length kadar karakter okuyarak bu kilitlenmeyi onluyoruz.
                    $chars = New-Object char[] $length
                    $read = 0
                    while ($read -lt $length) {
                        $n = $reader.Read($chars, $read, $length-$read)
                        if ($n -le 0) { break }
                        $read += $n
                    }
                    try {
                        $body = if ($read -gt 0) { New-Object string($chars, 0, $read) } else { '' }
                        $decoded = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($body))
                        $null = $decoded | ConvertFrom-Json
                        [IO.File]::WriteAllText($StateFile, $decoded, (New-Object Text.UTF8Encoding($false)))
                        Send-Bytes $stream '200 OK' 'application/json; charset=utf-8' ([Text.Encoding]::UTF8.GetBytes('{"ok":true}'))
                    } catch {
                        Send-Bytes $stream '400 Bad Request' 'application/json; charset=utf-8' ([Text.Encoding]::UTF8.GetBytes('{"ok":false}'))
                    }
                    continue
                }
            }

            if ($method -ne 'GET' -and $method -ne 'HEAD') {
                Send-Bytes $stream '405 Method Not Allowed' 'text/plain; charset=utf-8' ([Text.Encoding]::UTF8.GetBytes('Method Not Allowed'))
                continue
            }

            # Ana sayfayi kesin olarak index.html'e esle. Bu, v0.19.1'deki 404'u duzeltir.
            if ($pathOnly -eq '/' -or $pathOnly -eq '/index.html') {
                $candidatePath = $IndexFile
            } else {
                $relative = $pathOnly.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
                if ($relative -match '(^|[\\/])\.\.([\\/]|$)') {
                    Send-Bytes $stream '403 Forbidden' 'text/plain; charset=utf-8' ([Text.Encoding]::UTF8.GetBytes('403'))
                    continue
                }
                $candidatePath = [IO.Path]::GetFullPath((Join-Path $WebRoot $relative))
            }

            $candidateFull = [IO.Path]::GetFullPath($candidatePath)
            if (-not $candidateFull.StartsWith($webRootPrefix, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $candidateFull -PathType Leaf)) {
                Send-Bytes $stream '404 Not Found' 'text/plain; charset=utf-8' ([Text.Encoding]::UTF8.GetBytes('404'))
                continue
            }

            $bytes = [IO.File]::ReadAllBytes($candidateFull)
            Send-Bytes $stream '200 OK' (Mime-Type $candidateFull) $bytes ($method -eq 'HEAD')
        } catch {
            # Bir istek hatasi tum sunucuyu kapatmasin.
        } finally {
            try { $client.Close() } catch {}
        }
    }
} finally {
    try { $listener.Stop() } catch {}
}
