<#
.SYNOPSIS
  注册 GUET WiFi 守卫计划任务（需以管理员身份运行一次）。

.DESCRIPTION
  监听系统 WLAN-AutoConfig 日志的"连接成功"事件(8001)。
  任何 WiFi 连上后 1 秒内触发 Guard-GuetWifi.ps1；
  脚本自己会判断 SSID，不是 GUET-WiFi 就直接退出，零开销。

.USAGE
  右键"以管理员身份运行 PowerShell"，然后：
  powershell -NoProfile -ExecutionPolicy Bypass -File .\Register-GuetWifiGuard.ps1

  # 验证：任务计划程序 -> WifiGuard-Guet 或
  Get-ScheduledTask -TaskName 'WifiGuard-Guet'
#>
[CmdletBinding()]
param(
    [string]$ScriptPath = (Join-Path $PSScriptRoot 'Guard-GuetWifi.ps1')
)

#Requires -RunAsAdministrator

if (-not (Test-Path $ScriptPath)) {
    throw "找不到脚本: $ScriptPath"
}

$action    = New-ScheduledTaskAction `
    -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`""

# WLAN 连接成功事件：Microsoft-Windows-WLAN-AutoConfig/Operational, ID 8001
$cimTrigger = Get-CimClass -ClassName MSFT_TaskEventTrigger -Namespace Root/Microsoft/Windows/TaskScheduler
$eventTrigger = New-CimInstance -CimClass $cimTrigger -ClientOnly -Property @{
    Enabled       = $true
    Delay         = 'PT1S'
    Subscription  = @"
<QueryList><Query Id="0" Path="Microsoft-Windows-WLAN-AutoConfig/Operational">
  <Select Path="Microsoft-Windows-WLAN-AutoConfig/Operational">
    *[System[(EventID=8001)]]
  </Select>
</Query></QueryList>
"@
}

$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
$settings  = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -MultipleInstances IgnoreNew

Register-ScheduledTask `
    -TaskName  'WifiGuard-Guet' `
    -Description '连上 GUET-WiFi 时强制关闭梯子软件并恢复系统代理默认设置' `
    -Action    $action `
    -Trigger   $eventTrigger `
    -Principal $principal `
    -Settings  $settings -Force | Out-Null

Write-Host "已注册计划任务 WifiGuard-Guet（WLAN 连接事件触发，延迟 1 秒）" -ForegroundColor Green
Write-Host "日志: $env:LOCALAPPDATA\WifiGuard\guard.log"
Write-Host ""
Write-Host "想立即测试一次清理效果（即使不在校园网也强制执行）："
Write-Host "  powershell -File `"$ScriptPath`" -Force"
Write-Host "卸载："
Write-Host "  Unregister-ScheduledTask -TaskName 'WifiGuard-Guet' -Confirm:`$false"
