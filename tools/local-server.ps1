# FORMANTA local-only static server. Binds 127.0.0.1; no installation or admin rights.
param([int]$Port = 0, [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent))
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
$listener.Start()
$actualPort = $listener.LocalEndpoint.Port
$url = "http://127.0.0.1:$actualPort/"
Write-Host "FORMANTA laboratory: $url"
Write-Host 'Keep this window open. Ctrl+C stops the local server.'
if (-not $NoBrowser) { Start-Process $url }
$mime = @{'.html'='text/html; charset=utf-8';'.js'='text/javascript; charset=utf-8';'.css'='text/css; charset=utf-8';'.json'='application/json; charset=utf-8';'.wasm'='application/wasm';'.woff'='font/woff';'.mid'='audio/midi';'.png'='image/png';'.svg'='image/svg+xml'}
try {
 while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
   $client.ReceiveTimeout = 4000; $client.SendTimeout = 4000
   $stream = $client.GetStream(); $reader = [IO.StreamReader]::new($stream, [Text.Encoding]::ASCII, $false, 1024, $true)
   $request = $reader.ReadLine()
   while (($line = $reader.ReadLine()) -and $line.Length -gt 0) { }
   $parts = $request -split ' '
   $method = $parts[0]
   if ($method -ne 'GET' -and $method -ne 'HEAD') { throw 'Unsupported method' }
   $relative = [Uri]::UnescapeDataString(($parts[1] -split '\?')[0]).TrimStart('/')
   if (-not $relative) { $relative = 'index.html' }
   $path = [IO.Path]::GetFullPath((Join-Path $root $relative))
   if (-not $path.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid path' }
   if (-not [IO.File]::Exists($path)) {
    $body = [Text.Encoding]::UTF8.GetBytes('404 - Not found'); $status = '404 Not Found'; $type='text/plain'
   } else {
    $body = [IO.File]::ReadAllBytes($path); $status = '200 OK'; $type = $mime[[IO.Path]::GetExtension($path).ToLowerInvariant()]
    if (-not $type) { $type = 'application/octet-stream' }
   }
   $head = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 $status`r`nContent-Type: $type`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n")
   $stream.Write($head,0,$head.Length)
   if ($method -eq 'GET') { $stream.Write($body,0,$body.Length) }
   $stream.Flush()
  } catch {
   try { $data=[Text.Encoding]::ASCII.GetBytes("HTTP/1.1 400 Bad Request`r`nContent-Length: 0`r`nConnection: close`r`n`r`n");$stream.Write($data,0,$data.Length) } catch { }
  } finally { $client.Close() }
 }
} finally { $listener.Stop() }
