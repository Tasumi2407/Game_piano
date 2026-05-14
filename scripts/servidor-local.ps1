$ScriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Split-Path -Parent $ScriptFolder
$Port = 4173
$Address = [System.Net.IPAddress]::Parse("127.0.0.1")
$Listener = [System.Net.Sockets.TcpListener]::new($Address, $Port)

$ContentTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".js" = "text/javascript; charset=utf-8"
    ".css" = "text/css; charset=utf-8"
    ".mp3" = "audio/mpeg"
    ".png" = "image/png"
    ".svg" = "image/svg+xml"
    ".ico" = "image/x-icon"
}

function Send-Response {
    param (
        [System.Net.Sockets.NetworkStream]$Stream,
        [int]$StatusCode,
        [string]$StatusText,
        [string]$ContentType,
        [byte[]]$Body
    )

    $Header = "HTTP/1.1 $StatusCode $StatusText`r`nContent-Length: $($Body.Length)`r`nContent-Type: $ContentType`r`nConnection: close`r`n`r`n"
    $HeaderBytes = [System.Text.Encoding]::UTF8.GetBytes($Header)
    $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)

    if ($Body.Length -gt 0) {
        $Stream.Write($Body, 0, $Body.Length)
    }
}

try {
    $Listener.Start()
    Write-Host "Servidor listo en http://127.0.0.1:$Port"
    Write-Host "Abre esa direccion en Chrome. Presiona Ctrl+C para cerrar."
    Write-Host ""

    while ($true) {
        $Client = $Listener.AcceptTcpClient()
        $Stream = $Client.GetStream()

        try {
            $Buffer = New-Object byte[] 4096
            $BytesRead = $Stream.Read($Buffer, 0, $Buffer.Length)
            $RequestText = [System.Text.Encoding]::UTF8.GetString($Buffer, 0, $BytesRead)
            $FirstLine = ($RequestText -split "`r?`n")[0]

            if ($FirstLine -notmatch "^GET\s+([^\s]+)\s+HTTP/") {
                $Body = [System.Text.Encoding]::UTF8.GetBytes("Bad request")
                Send-Response $Stream 400 "Bad Request" "text/plain; charset=utf-8" $Body
                continue
            }

            $UrlPath = [Uri]::UnescapeDataString($Matches[1].Split("?")[0])

            if ($UrlPath -eq "/") {
                $UrlPath = "/index.html"
            }

            $RelativePath = $UrlPath.TrimStart("/") -replace "/", [System.IO.Path]::DirectorySeparatorChar
            $FilePath = [System.IO.Path]::GetFullPath((Join-Path $Root $RelativePath))
            $RootPath = [System.IO.Path]::GetFullPath($Root)

            if (-not $FilePath.StartsWith($RootPath)) {
                $Body = [System.Text.Encoding]::UTF8.GetBytes("Forbidden")
                Send-Response $Stream 403 "Forbidden" "text/plain; charset=utf-8" $Body
                continue
            }

            if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf)) {
                $Body = [System.Text.Encoding]::UTF8.GetBytes("Not found")
                Send-Response $Stream 404 "Not Found" "text/plain; charset=utf-8" $Body
                continue
            }

            $Extension = [System.IO.Path]::GetExtension($FilePath).ToLowerInvariant()
            $ContentType = $ContentTypes[$Extension]

            if (-not $ContentType) {
                $ContentType = "application/octet-stream"
            }

            $Body = [System.IO.File]::ReadAllBytes($FilePath)
            Send-Response $Stream 200 "OK" $ContentType $Body
        } finally {
            $Stream.Close()
            $Client.Close()
        }
    }
} finally {
    $Listener.Stop()
}
