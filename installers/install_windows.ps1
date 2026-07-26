function Install-RwthonlineHelper {
  param([Parameter(Mandatory=$true)][string]$ExtensionId)
  $installDir = Join-Path $env:LOCALAPPDATA 'RWTHonlineAutoLogin'
  $helperPath = Join-Path $installDir 'rwthonline_native_host.exe'
  $manifestPath = Join-Path $installDir 'com.rwthonline.auto_login.json'
  New-Item -ItemType Directory -Force -Path $installDir | Out-Null
  Invoke-WebRequest 'https://github.com/leonhartkun/rwthonline-auto-login/releases/latest/download/rwthonline_native_host_windows.exe' -OutFile $helperPath
  @{name='com.rwthonline.auto_login';description='RWTHonline Auto Login credential helper';path=$helperPath;type='stdio';allowed_origins=@("chrome-extension://$ExtensionId/")} | ConvertTo-Json -Compress | Set-Content -NoNewline $manifestPath
  New-Item -Path 'HKCU:\Software\Google\Chrome\NativeMessagingHosts' -Force | Out-Null
  New-ItemProperty -Path 'HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.rwthonline.auto_login' -Name '(default)' -Value $manifestPath -PropertyType String -Force | Out-Null
  Write-Host 'RWTHonline helper installed. Return to the extension settings page.'
}
