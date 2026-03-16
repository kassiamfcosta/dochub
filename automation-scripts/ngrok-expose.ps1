param(
  [int]$FrontendPort = 5173,
  [int]$BackendPort = 3001,
  [string]$AuthToken = $env:NGROK_AUTHTOKEN,
  [string]$BasicAuthUser = "",
  [string]$BasicAuthPass = "",
  [string]$ReservedFrontendDomain = "",
  [string]$ReservedBackendDomain = "",
  [switch]$StartDockerCompose,
  [switch]$UpdateEnv
)

function Ensure-Ngrok {
  $cmd = Get-Command ngrok -ErrorAction SilentlyContinue
  $ngrokPath = $null
  if ($cmd) { $ngrokPath = $cmd.Path }
  if (-not $ngrokPath) {
    try {
      winget install --id Ngrok.Ngrok -e --silent | Out-Null
    } catch {
      $zipUrl = "https://bin.equinox.io/c/bNyj1mQY7YX/ngrok-v3-stable-windows-amd64.zip"
      $tempZip = Join-Path $env:TEMP "ngrok.zip"
      Invoke-WebRequest -Uri $zipUrl -OutFile $tempZip
      Expand-Archive -Path $tempZip -DestinationPath $env:LOCALAPPDATA -Force
      $ngrokExe = Join-Path $env:LOCALAPPDATA "ngrok.exe"
      if (Test-Path $ngrokExe) {
        $env:Path = "$env:LOCALAPPDATA;$env:Path"
      }
    }
  }
}

function Ensure-AuthToken {
  if ($AuthToken -and $AuthToken.Trim().Length -gt 0) {
    & ngrok config add-authtoken $AuthToken | Out-Null
  }
}

function Test-Service {
  param([int]$Port, [string]$Path = "/")
  try {
    $url = "http://localhost:$Port$Path"
    Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3 | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Start-ComposeIfRequested {
  if ($StartDockerCompose) {
    $root = "c:\Users\User\workspace\Doc Hub"
    Push-Location $root
    docker-compose up -d
    Pop-Location
  }
}

function Build-ConfigContent {
  param(
    [int]$FPort,
    [int]$BPort,
    [string]$BAUser,
    [string]$BAPass,
    [string]$FDom,
    [string]$BDom
  )
  $frontendAuth = ""
  $backendAuth = ""
  if ($BAUser -and $BAPass) {
    $frontendAuth = "    basic_auth: `"$BAUser`:$BAPass`""
    $backendAuth = "    basic_auth: `"$BAUser`:$BAPass`""
  }
  $frontendDomain = ""
  $backendDomain = ""
  if ($FDom) { $frontendDomain = "    domain: `"$FDom`"" }
  if ($BDom) { $backendDomain = "    domain: `"$BDom`"" }

  @"
tunnels:
  dochub-frontend:
    proto: http
    addr: $FPort
$frontendAuth
$frontendDomain
  dochub-backend:
    proto: http
    addr: $BPort
$backendAuth
$backendDomain
"@
}

function Start-Ngrok {
  param([string]$ConfigPath)
  $logsDir = "c:\Users\User\workspace\Doc Hub\logs"
  if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }
  $logFile = Join-Path $logsDir "ngrok.log"
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "ngrok"
  $psi.Arguments = "start --all --config `"$ConfigPath`" --log `"$logFile`""
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $p = [System.Diagnostics.Process]::Start($psi)
  Start-Sleep -Seconds 3
  return $p
}

function Get-TunnelUrls {
  try {
    $api = "http://127.0.0.1:4040/api/tunnels"
    $res = Invoke-RestMethod -Uri $api -TimeoutSec 5
    $urls = @{}
    foreach ($t in $res.tunnels) {
      $name = $t.name
      $urls[$name] = $t.public_url
    }
    return $urls
  } catch {
    return @{}
  }
}

Ensure-Ngrok
Ensure-AuthToken
Start-ComposeIfRequested

$frontendOk = Test-Service -Port $FrontendPort -Path "/"
$backendOk = Test-Service -Port $BackendPort -Path "/health"

$cfgContent = Build-ConfigContent -FPort $FrontendPort -BPort $BackendPort -BAUser $BasicAuthUser -BAPass $BasicAuthPass -FDom $ReservedFrontendDomain -BDom $ReservedBackendDomain
$tempCfg = Join-Path $env:TEMP "ngrok-dochub.yml"
Set-Content -Path $tempCfg -Value $cfgContent -Encoding UTF8

$proc = Start-Ngrok -ConfigPath $tempCfg

for ($i=0; $i -lt 20; $i++) {
  $urls = Get-TunnelUrls
  if ($urls.Count -gt 0) { break }
  Start-Sleep -Milliseconds 500
}

$outPath = "c:\Users\User\workspace\Doc Hub\automation-scripts\ngrok-urls.json"
if ($urls.Count -gt 0) {
  $json = $urls | ConvertTo-Json -Depth 3
  Set-Content -Path $outPath -Value $json -Encoding UTF8
  Write-Output $json

  if ($UpdateEnv) {
    $frontendUrl = $urls["dochub-frontend"]
    $backendUrl = $urls["dochub-backend"]
    if ($frontendUrl) {
      $backendEnvPath = "c:\Users\User\workspace\Doc Hub\backend\.env"
      if (-not (Test-Path $backendEnvPath)) { New-Item -ItemType File -Path $backendEnvPath | Out-Null }
      $envLines = Get-Content -Path $backendEnvPath -ErrorAction SilentlyContinue
      $envMap = @{}
      foreach ($line in $envLines) {
        if ($line -match "^\s*#") { continue }
        if ($line -match "^\s*$") { continue }
        $kv = $line.Split("=",2)
        if ($kv.Length -eq 2) { $envMap[$kv[0]] = $kv[1] }
      }
      $envMap["FRONTEND_URL"] = $frontendUrl
      if (-not $envMap.ContainsKey("JWT_SECRET")) { $envMap["JWT_SECRET"] = "change_this_development_secret_key_with_30_chars_minimum_123" }
      if (-not $envMap.ContainsKey("ZELLO_API_KEY")) { $envMap["ZELLO_API_KEY"] = "change_me_for_real_usage" }
      $out = ""
      foreach ($k in $envMap.Keys) { $out += "$k=$($envMap[$k])`n" }
      Set-Content -Path $backendEnvPath -Value $out -Encoding UTF8
    }
    if ($backendUrl) {
      $frontendEnvPath = "c:\Users\User\workspace\Doc Hub\frontend\.env"
      if (-not (Test-Path $frontendEnvPath)) { New-Item -ItemType File -Path $frontendEnvPath | Out-Null }
      $fLines = Get-Content -Path $frontendEnvPath -ErrorAction SilentlyContinue
      $fMap = @{}
      foreach ($line in $fLines) {
        if ($line -match "^\s*#") { continue }
        if ($line -match "^\s*$") { continue }
        $kv = $line.Split("=",2)
        if ($kv.Length -eq 2) { $fMap[$kv[0]] = $kv[1] }
      }
      $fMap["VITE_API_URL"] = "$backendUrl/api"
      $outF = ""
      foreach ($k in $fMap.Keys) { $outF += "$k=$($fMap[$k])`n" }
      Set-Content -Path $frontendEnvPath -Value $outF -Encoding UTF8
    }
  }
} else {
  Write-Output "{}"
}
