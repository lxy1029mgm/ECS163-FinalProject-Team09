@echo off

start "" /b powershell -WindowStyle Hidden -Command "$s = New-Object Net.HttpListener; $s.Prefixes.Add('http://127.0.0.1:8000/'); $s.Start(); while ($s.IsListening) { $c = $s.GetContext(); $q = $c.Request.Url.LocalPath.TrimStart('/'); $f = Join-Path $pwd (if ($q -eq '') { 'index.html' } else { $q }); if (Test-Path $f) { $b = [IO.File]::ReadAllBytes($f); $c.Response.OutputStream.Write($b, 0, $b.Length) }; $c.Response.Close() }"

timeout /t 1 >nul
start http://127.0.0.1:8000/index.html