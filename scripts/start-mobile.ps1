param(
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js not found. Install Node.js 20+ from https://nodejs.org/"
}

Push-Location $repoRoot

if (-not $SkipInstall -and -not (Test-Path "node_modules")) {
    Write-Host "Installing mobile dependencies..."
    if ($IsWindows) {
        $env:NODE_OPTIONS = "--use-system-ca"
    }
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed. Try: `$env:NODE_OPTIONS='--use-system-ca'; npm install"
    }
}

Write-Host ""
Write-Host "Starting Expo dev server..."
Write-Host "  Press a = Android emulator"
Write-Host "  Scan QR with Expo Go on your phone (same Wi-Fi)"
Write-Host ""

if ($IsWindows) {
    $env:NODE_OPTIONS = "--use-system-ca"
}
npm start

Pop-Location
