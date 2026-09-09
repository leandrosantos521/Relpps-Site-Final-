param(
  [int]$Port = 5500
)
$ErrorActionPreference = 'Stop'
$Root = (Get-Location).Path
$EnvFile = Join-Path $Root '.env'
$TokenFile = Join-Path $Root '.bling-tokens.json'
$StateFile = Join-Path $Root '.bling-oauth-state.json'
$BlingBase = 'https://api.bling.com.br/Api/v3'

function Load-Env {
  if (-not (Test-Path $EnvFile)) { return }
  Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
      $name=$Matches[1]; $value=$Matches[2].Trim()
      if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) { $value=$value.Substring(1,$value.Length-2) }
      [Environment]::SetEnvironmentVariable($name,$value,'Process')
    }
  }
}
Load-Env
$ClientId=[Environment]::GetEnvironmentVariable('BLING_CLIENT_ID','Process')
$ClientSecret=[Environment]::GetEnvironmentVariable('BLING_CLIENT_SECRET','Process')
$Redirect=[Environment]::GetEnvironmentVariable('BLING_REDIRECT_URI','Process')
if ([string]::IsNullOrWhiteSpace($Redirect)) { $Redirect="http://127.0.0.1:$Port/bling-callback.html" }
if ([string]::IsNullOrWhiteSpace($ClientId) -or [string]::IsNullOrWhiteSpace($ClientSecret)) { Write-Host 'ERRO: preencha BLING_CLIENT_ID e BLING_CLIENT_SECRET no .env' -ForegroundColor Red; exit 1 }

function Write-Json($ctx,$status,$obj) {
  $bytes=[Text.Encoding]::UTF8.GetBytes(($obj | ConvertTo-Json -Depth 20 -Compress))
  $ctx.Response.StatusCode=$status; $ctx.Response.ContentType='application/json; charset=utf-8'; $ctx.Response.Headers['Cache-Control']='no-store'; $ctx.Response.Headers['Access-Control-Allow-Origin']='http://127.0.0.1:5500'; $ctx.Response.Headers['Access-Control-Allow-Headers']='Content-Type'; $ctx.Response.OutputStream.Write($bytes,0,$bytes.Length); $ctx.Response.Close()
}
function Read-Json($ctx) { $sr=New-Object IO.StreamReader($ctx.Request.InputStream,$ctx.Request.ContentEncoding); $s=$sr.ReadToEnd(); $sr.Close(); if ($s) { return $s | ConvertFrom-Json } return @{} }
function Save-Json($path,$obj) { $obj | ConvertTo-Json -Depth 20 | Set-Content -Path $path -Encoding UTF8 }
function Load-Json($path) { if (Test-Path $path) { try { return Get-Content $path -Raw | ConvertFrom-Json } catch {} }; return $null }
function B64($s) { [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($s)) }
function Exchange-Code($code) {
  $basic=B64("$ClientId`:$ClientSecret")
  $body="grant_type=authorization_code&code="+[uri]::EscapeDataString($code)
  $r=Invoke-WebRequest -Uri "$BlingBase/oauth/token" -Method Post -Headers @{Authorization="Basic $basic";'enable-jwt'='1';Accept='application/json'} -ContentType 'application/x-www-form-urlencoded' -Body $body
  $d=$r.Content | ConvertFrom-Json; Save-Json $TokenFile ([pscustomobject]@{access_token=$d.access_token;refresh_token=$d.refresh_token;expires_in=$d.expires_in;token_type=$d.token_type;saved_at=(Get-Date).ToString('o')}); return $d
}
function Get-Token {
  $t=Load-Json $TokenFile; if (-not $t.access_token) { throw 'Bling ainda não está conectado.' }
  $expires=(Get-Date $t.saved_at).AddSeconds([double]$t.expires_in)
  if ((Get-Date) -lt $expires.AddSeconds(-60)) { return $t.access_token }
  if (-not $t.refresh_token) { throw 'Token expirado e sem refresh_token.' }
  $basic=B64("$ClientId`:$ClientSecret"); $body="grant_type=refresh_token&refresh_token="+[uri]::EscapeDataString($t.refresh_token)
  $r=Invoke-WebRequest -Uri "$BlingBase/oauth/token" -Method Post -Headers @{Authorization="Basic $basic";'enable-jwt'='1';Accept='application/json'} -ContentType 'application/x-www-form-urlencoded' -Body $body
  $d=$r.Content | ConvertFrom-Json; Save-Json $TokenFile ([pscustomobject]@{access_token=$d.access_token;refresh_token=$d.refresh_token;expires_in=$d.expires_in;token_type=$d.token_type;saved_at=(Get-Date).ToString('o')}); return $d.access_token
}
function Bling-Get($path) { $token=Get-Token; $r=Invoke-WebRequest -Uri "$BlingBase$path" -Headers @{Authorization="Bearer $token";'enable-jwt'='1';Accept='application/json'} -Method Get; return ($r.Content | ConvertFrom-Json) }
function Mime($ext) { switch($ext){'.html'{'text/html; charset=utf-8'}'.js'{'text/javascript; charset=utf-8'}'.css'{'text/css; charset=utf-8'}'.json'{'application/json; charset=utf-8'}'.png'{'image/png'}'.jpg'{'image/jpeg'}'.jpeg'{'image/jpeg'}'.svg'{'image/svg+xml'}default{'application/octet-stream'}} }
function Parse-QueryString($query) {
  $result=@{}
  if ([string]::IsNullOrWhiteSpace($query)) { return $result }
  $query=$query.TrimStart('?')
  foreach($part in ($query -split '&')) {
    if ([string]::IsNullOrWhiteSpace($part)) { continue }
    $pieces=$part -split '=',2
    $key=[uri]::UnescapeDataString(($pieces[0] -replace '\+',' '))
    $value=''
    if($pieces.Count -gt 1){ $value=[uri]::UnescapeDataString(($pieces[1] -replace '\+',' ')) }
    $result[$key]=$value
  }
  return $result
}
$listener=New-Object Net.HttpListener; $listener.Prefixes.Add("http://127.0.0.1:$Port/"); $listener.Start()
Write-Host "`nRELPPS + BLING LOCAL`nAbra: http://127.0.0.1:$Port/bling-connect.html`nFeche o Live Server antes de iniciar.`n" -ForegroundColor Green
Start-Process "http://127.0.0.1:$Port/bling-connect.html"
while($listener.IsListening){
  try {
    $ctx=$listener.GetContext(); $req=$ctx.Request; $res=$ctx.Response; $u=[uri]$req.Url.AbsoluteUri; $path=$req.Url.AbsolutePath; $q=Parse-QueryString $req.Url.Query; $action=$q['action']
    if($path -eq '/api/bling'){
      if($action -eq 'authorize'){
        $state=[guid]::NewGuid().ToString('N'); Save-Json $StateFile ([pscustomobject]@{state=$state;created_at=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()}); $auth="$BlingBase/oauth/authorize?response_type=code&client_id="+[uri]::EscapeDataString($ClientId)+"&state="+[uri]::EscapeDataString($state)+"&redirect_uri="+[uri]::EscapeDataString($Redirect); $res.StatusCode=302; $res.RedirectLocation=$auth; $res.Close(); continue
      }
      if($action -eq 'status'){ $t=Load-Json $TokenFile; Write-Json $ctx 200 ([pscustomobject]@{connected=($null -ne $t -and $null -ne $t.access_token);savedAt=if($t){$t.saved_at}else{$null}}); continue }
      if($action -eq 'disconnect'){ Remove-Item $TokenFile -Force -ErrorAction SilentlyContinue; Write-Json $ctx 200 @{ok=$true;connected=$false}; continue }
      if($action -eq 'callback' -and $req.HttpMethod -eq 'POST'){ $b=Read-Json $ctx; $s=Load-Json $StateFile; if(-not $b.code -or -not $b.state -or -not $s -or $s.state -ne $b.state){ Write-Json $ctx 400 @{message='State/código inválido ou expirado.'}; continue }; $d=Exchange-Code $b.code; Remove-Item $StateFile -Force -ErrorAction SilentlyContinue; Write-Json $ctx 200 @{ok=$true;connected=$true;expiresIn=$d.expires_in}; continue }
      if($action -eq 'products'){ $all=@(); for($page=1;$page -le 100;$page++){ $d=Bling-Get "/produtos?pagina=$page&limite=100"; $rows=@($d.data); $all += $rows; if($rows.Count -lt 100){break} }; Write-Json $ctx 200 @{products=$all}; continue }
      if($action -eq 'product'){ $id=$q['id']; if(-not $id){Write-Json $ctx 400 @{message='Informe id.'};continue}; Write-Json $ctx 200 (Bling-Get "/produtos/$id");continue }
      if($action -eq 'stock'){ $id=$q['id']; if(-not $id){Write-Json $ctx 400 @{message='Informe id.'};continue}; Write-Json $ctx 200 (Bling-Get "/estoques/saldos/$id");continue }
      Write-Json $ctx 404 @{message='Ação não encontrada.'}; continue
    }
    $rel=if($path -eq '/'){'index.html'}else{$path.TrimStart('/')}; $file=[IO.Path]::GetFullPath((Join-Path $Root $rel)); if(-not $file.StartsWith([IO.Path]::GetFullPath($Root))){$res.StatusCode=403;$res.Close();continue}; if(-not(Test-Path $file -PathType Leaf)){$res.StatusCode=404;$res.Close();continue}; $bytes=[IO.File]::ReadAllBytes($file);$res.ContentType=Mime ([IO.Path]::GetExtension($file).ToLower());$res.ContentLength64=$bytes.Length;$res.OutputStream.Write($bytes,0,$bytes.Length);$res.Close()
  } catch { try{ Write-Json $ctx 500 @{message=$_.Exception.Message} }catch{} }
}
$listener.Stop()
