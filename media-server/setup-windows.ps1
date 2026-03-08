# MediaMTX Setup Script for Windows
# Run in PowerShell as Administrator

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "MediaMTX Media Server Setup for Windows" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$MediaMTXVersion = "1.5.1"
$InstallDir = "$env:LOCALAPPDATA\mediamtx"

# Create install directory
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Download MediaMTX
Write-Host "`nDownloading MediaMTX..." -ForegroundColor Yellow
$Arch = if ([Environment]::Is64BitOperatingSystem) { "amd64" } else { "386" }
$DownloadUrl = "https://github.com/bluenviron/mediamtx/releases/download/v$MediaMTXVersion/mediamtx_v${MediaMTXVersion}_windows_$Arch.zip"
$ZipPath = "$InstallDir\mediamtx.zip"

Invoke-WebRequest -Uri $DownloadUrl -OutFile $ZipPath
Expand-Archive -Path $ZipPath -DestinationPath $InstallDir -Force
Remove-Item $ZipPath

Write-Host "MediaMTX downloaded to $InstallDir" -ForegroundColor Green

# Copy configuration
Write-Host "`nCopying configuration..." -ForegroundColor Yellow
Copy-Item "mediamtx.yml" -Destination "$InstallDir\mediamtx.yml" -Force

# Configure camera URL
Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "Camera Configuration" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$CameraUrl = Read-Host "Enter your camera RTSP URL [rtsp://192.168.0.203:554/stream]"
if ([string]::IsNullOrWhiteSpace($CameraUrl)) {
    $CameraUrl = "rtsp://192.168.0.203:554/stream"
}

# Update config with camera URL
$ConfigPath = "$InstallDir\mediamtx.yml"
$Config = Get-Content $ConfigPath -Raw
$Config = $Config -replace "source: rtsp://192.168.0.203:554/stream", "source: $CameraUrl"
Set-Content -Path $ConfigPath -Value $Config

Write-Host "Camera URL configured: $CameraUrl" -ForegroundColor Green

# Create start script
$StartScript = @"
@echo off
cd /d "$InstallDir"
mediamtx.exe
pause
"@
Set-Content -Path "$InstallDir\start-mediamtx.bat" -Value $StartScript

# Create Windows service (optional)
Write-Host "`nDo you want to install MediaMTX as a Windows service? (y/n)" -ForegroundColor Yellow
$InstallService = Read-Host

if ($InstallService -eq "y") {
    # Using NSSM or sc.exe
    $ServiceName = "MediaMTX"
    $ExePath = "$InstallDir\mediamtx.exe"
    
    # Stop and remove existing service
    $existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($existingService) {
        Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
        sc.exe delete $ServiceName | Out-Null
        Start-Sleep -Seconds 2
    }
    
    # Create new service
    New-Service -Name $ServiceName -BinaryPathName $ExePath -DisplayName "MediaMTX Media Server" -StartupType Automatic -Description "RTSP/HLS/WebRTC media server for IP cameras"
    Start-Service -Name $ServiceName
    
    Write-Host "MediaMTX service installed and started" -ForegroundColor Green
} else {
    # Start manually
    Write-Host "`nStarting MediaMTX..." -ForegroundColor Yellow
    Start-Process -FilePath "$InstallDir\mediamtx.exe" -WorkingDirectory $InstallDir
}

# Get local IP
$LocalIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.*" } | Select-Object -First 1).IPAddress

# Print URLs
Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "MediaMTX is running!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access your camera stream at:" -ForegroundColor White
Write-Host ""
Write-Host "  HLS (for browser):" -ForegroundColor Yellow
Write-Host "    http://${LocalIP}:8888/camera1/index.m3u8"
Write-Host ""
Write-Host "  WebRTC (low latency):" -ForegroundColor Yellow
Write-Host "    http://${LocalIP}:8889/camera1"
Write-Host ""
Write-Host "  RTSP (for VLC/other apps):" -ForegroundColor Yellow
Write-Host "    rtsp://${LocalIP}:8554/camera1"
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "In your AI Cam app settings, use:" -ForegroundColor White
Write-Host "  URL: " -NoNewline
Write-Host "http://${LocalIP}:8888/camera1/index.m3u8" -ForegroundColor Green
Write-Host "  Type: " -NoNewline
Write-Host "HLS" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
