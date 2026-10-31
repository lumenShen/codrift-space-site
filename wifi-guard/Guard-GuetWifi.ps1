<#
.SYNOPSIS
  GUET WiFi 守卫：连上校园网时自动强制关闭所有梯子/代理软件，并恢复系统代理默认设置。

.DESCRIPTION
  - 由计划任务在 WLAN 连接成功事件(8001)触发，也可用 -CheckNow 手动执行。
  - 只做两件事：杀代理进程 + 把系统代理恢复为"不开"的默认状态。
  - 绝不启动、安装或修改任何梯子软件本身。

.USAGE
  # 手动检查一次（当前 SSID 匹配才会动作）
  powershell -NoProfile -ExecutionPolicy Bypass -File .\Guard-GuetWifi.ps1 -CheckNow

  # 查看日志
  Get-Content "$env:LOCALAPPDATA\WifiGuard\guard.log" -Tail 20
#>
[CmdletBinding()]
param(
    # 匹配的 SSID（不区分大小写，正则）。GUET-WiFi / guet 都能命中
    [string]$SsidPattern = '^(GUET[-_ ]?WiFi|guet)$',

    # 忽略当前 SSID，直接执行清理（用于测试）
    [switch]$Force,

    # 手动触发模式：只看当前连接，不等事件
    [switch]$CheckNow
)

$ErrorActionPreference = 'SilentlyContinue'
$logDir  = Join-Path $env:LOCALAPPDATA 'WifiGuard'
$logFile = Join-Path $logDir 'guard.log'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

function Write-Log([string]$msg) {
    $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
    Add-Content -Path $logFile -Value $line -Encoding UTF8
}

# ---------- 1. 判断当前是否连着校园网 ----------
function Get-CurrentSsid {
    $out = netsh wlan show interfaces 2>$null
    foreach ($line in $out) {
        # 兼容中文/英文系统的 "SSID" 行（排除 BSSID）
        if ($line -match '^\s*(SSID|BSSID)' -and $line -notmatch 'BSSID') {
            if ($line -match ':\s*(.+?)\s*$') { return $Matches[1] }
        }
    }
    return $null
}

$ssid = Get-CurrentSsid

if (-not $Force) {
    if ([string]::IsNullOrWhiteSpace($ssid)) {
        Write-Log "未连接任何 WiFi（SSID 为空），跳过。"
        exit 0
    }
    if ($ssid -notmatch $SsidPattern) {
        Write-Log "当前 SSID「$ssid」不是校园网，跳过。"
        exit 0
    }
}

Write-Log "===== 触发：SSID=[$ssid] ====="

# ---------- 2. 强制关闭所有梯子类软件 ----------
# 进程名（不含 .exe），覆盖常见 Clash/V2Ray/SSR 系全家桶
$proxyProcesses = @(
    'clash-verge', 'clash-verge-service', 'clash-verge-service-',
    'verge-mihomo', 'clash-meta', 'clash', 'mihomo', 'clash-win64',
    'Clash for Windows', 'ClashCFW', 'FlClash', 'ClashN', 'GUI.for.Clash',
    'v2rayN', 'v2ray', 'xray', 'sing-box', 'Netch',
    'Shadowsocks', 'shadowsocksr', 'ssr-win', 'SSR',
    'Qv2ray', 'nekoray', 'nekobox', 'Hiddify', 'Leaf', 'Karing'
)

$killed = @()
foreach ($name in $proxyProcesses) {
    Get-Process -Name $name -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Log ("强制结束进程: {0} (PID {1})" -f $_.ProcessName, $_.Id)
        # TaskKill 比 Stop-Process 对带服务的进程更可靠
        taskkill /F /PID $_.Id /T 2>$null | Out-Null
        $killed += $_.ProcessName
    }
}

# Clash Verge 的后台服务（SYSTEM 权限，需管理员才能停）
$svc = Get-Service -Name 'clash_verge_service' -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -ne 'Stopped') {
    Write-Log "停止服务: clash_verge_service"
    Stop-Service -Name 'clash_verge_service' -Force -ErrorAction SilentlyContinue
    sc.exe delete 'clash_verge_service' 2>$null | Out-Null
}

if ($killed.Count -eq 0) { Write-Log "未发现运行中的代理软件。" }

# ---------- 3. 恢复系统代理默认设置 ----------
$inetKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'
$changed = $false

$cur = Get-ItemProperty -Path $inetKey
if ($cur.ProxyEnable -eq 1) {
    Set-ItemProperty -Path $inetKey -Name ProxyEnable -Value 0
    Write-Log "系统代理已关闭 (ProxyEnable 1 -> 0)"
    $changed = $true
}
if ($cur.ProxyServer) {
    Remove-ItemProperty -Path $inetKey -Name ProxyServer -ErrorAction SilentlyContinue
    Write-Log "已清除代理服务器地址 (ProxyServer)"
    $changed = $true
}
if ($cur.AutoConfigURL) {
    Remove-ItemProperty -Path $inetKey -Name AutoConfigURL -ErrorAction SilentlyContinue
    Write-Log "已清除 PAC 自动配置 (AutoConfigURL)"
    $changed = $true
}

# 清掉用户级代理环境变量（部分梯子会设置）
foreach ($v in 'http_proxy','https_proxy','all_proxy','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY') {
    $val = [Environment]::GetEnvironmentVariable($v, 'User')
    if ($val) {
        [Environment]::SetEnvironmentVariable($v, $null, 'User')
        Write-Log "已删除用户环境变量 $v"
        $changed = $true
    }
}

# 通知 WinINET 立即刷新设置，浏览器不用重启就生效
Add-Type -Namespace WinINET -Name Native -MemberDefinition @'
[System.Runtime.InteropServices.DllImport("wininet.dll", SetLastError = true)]
public static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int dwBufferLength);
'@
[WinINET.Native]::InternetSetOption([IntPtr]::Zero, 39, [IntPtr]::Zero, 0) | Out-Null  # SETTINGS_CHANGED
[WinINET.Native]::InternetSetOption([IntPtr]::Zero, 37, [IntPtr]::Zero, 0) | Out-Null  # REFRESH

if (-not $changed) { Write-Log "系统代理本来就是默认状态，无需恢复。" }
Write-Log "===== 清理完成 ====="
