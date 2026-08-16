$ErrorActionPreference='Stop'
$Root=Split-Path -Parent $PSScriptRoot
function Mime($p){switch([IO.Path]::GetExtension($p).ToLowerInvariant()){'.html'{'text/html; charset=utf-8'}'.js'{'application/javascript; charset=utf-8'}'.css'{'text/css; charset=utf-8'}default{'application/octet-stream'}}}
$listener=$null;$port=$null
foreach($p in 51731..51739){try{$l=New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback,$p);$l.Start();$listener=$l;$port=$p;break}catch{}}
if($null -eq $listener){Write-Host 'Uygun port bulunamadi.' -ForegroundColor Red;exit 1}
Write-Host "MetinBall 3D: http://127.0.0.1:$port/" -ForegroundColor Cyan
Start-Process "http://127.0.0.1:$port/?pc=1&v=3"
$rootFull=[IO.Path]::GetFullPath($Root).TrimEnd('\')+'\'
try{while($true){$client=$listener.AcceptTcpClient();try{$s=$client.GetStream();$r=New-Object IO.StreamReader($s,[Text.Encoding]::ASCII,$false,4096,$true);$line=$r.ReadLine();if(!$line){continue};$parts=$line.Split(' ');$path=$parts[1].Split('?')[0];while(($h=$r.ReadLine()) -ne $null -and $h -ne ''){};$rel=[Uri]::UnescapeDataString($path).TrimStart('/');if(!$rel){$rel='index.html'};$candidate=[IO.Path]::GetFullPath((Join-Path $Root ($rel.Replace('/',[IO.Path]::DirectorySeparatorChar))));if(!$candidate.StartsWith($rootFull,[StringComparison]::OrdinalIgnoreCase)-or !(Test-Path $candidate -PathType Leaf)){$body=[Text.Encoding]::UTF8.GetBytes('404');$head="HTTP/1.1 404 Not Found`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"}else{$body=[IO.File]::ReadAllBytes($candidate);$head="HTTP/1.1 200 OK`r`nContent-Type: $(Mime $candidate)`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"};$hb=[Text.Encoding]::ASCII.GetBytes($head);$s.Write($hb,0,$hb.Length);$s.Write($body,0,$body.Length);$s.Flush()}catch{}finally{try{$client.Close()}catch{}}}}finally{try{$listener.Stop()}catch{}}
