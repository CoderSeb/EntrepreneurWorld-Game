$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot

function Install-MobileDependencies {
    if ($env:GITHUB_ACTIONS -eq 'true' -or $env:CI -eq 'true') {
        Write-Host "Installing mobile dependencies (npm ci)..."
        npm ci
        if ($LASTEXITCODE -ne 0) {
            Pop-Location
            exit 1
        }
        return
    }

    if (Test-Path "node_modules") {
        return
    }

    Write-Host "Installing mobile dependencies..."
    if ($IsWindows) {
        $env:NODE_OPTIONS = "--use-system-ca"
    }
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "npm install failed (often TLS on Windows). Try: `$env:NODE_OPTIONS='--use-system-ca'; npm install"
        Pop-Location
        exit 1
    }
}

Install-MobileDependencies

Write-Host "== Mobile typecheck =="
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "TypeScript check failed." }

Write-Host "== Mobile unit tests =="
npm test
if ($LASTEXITCODE -ne 0) { throw "Jest tests failed." }

Write-Host "== npm audit (informational) =="
npm audit --audit-level=high 2>&1 | Out-String | Write-Host
if ($LASTEXITCODE -ne 0) {
    Write-Warning "npm audit reported high/critical issues. See hub docs/DEPENDENCIES.md."
}

Write-Host "Mobile checks passed."
Pop-Location
