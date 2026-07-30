function Install-RwthonlineHelper {
  param([Parameter(Mandatory=$true)][string]$ExtensionId)
  $ErrorActionPreference = 'Stop'
  $installDir = Join-Path $env:LOCALAPPDATA 'RWTHonlineAutoLogin'
  $helperPath = Join-Path $installDir 'rwthonline_native_host.exe'
  $manifestPath = Join-Path $installDir 'com.rwthonline.auto_login.json'
  New-Item -ItemType Directory -Force -Path $installDir | Out-Null
  $downloader = New-Object System.Net.WebClient
  $releaseTag = if ($env:RWTH_RELEASE_TAG) { $env:RWTH_RELEASE_TAG } else { 'latest' }
  $downloader.DownloadFile(
    "https://github.com/leonhartkun/rwthonline-auto-login/releases/download/$releaseTag/rwthonline_native_host_windows.exe",
    $helperPath
  )
  if (-not (Test-Path $helperPath)) {
    throw 'RWTHonline helper download did not produce an executable.'
  }
  @{name='com.rwthonline.auto_login';description='RWTHonline Auto Login credential helper';path=$helperPath;type='stdio';allowed_origins=@("chrome-extension://$ExtensionId/")} | ConvertTo-Json -Compress | Set-Content -NoNewline $manifestPath
  reg.exe add 'HKCU\Software\Google\Chrome\NativeMessagingHosts\com.rwthonline.auto_login' /ve /t REG_SZ /d $manifestPath /f | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw 'Chrome Native Messaging registration failed.'
  }
  Write-Host 'RWTHonline helper installed. Return to the extension settings page.'
}
