# GERETOU - Lance tout en une commande
# Usage : .\start.ps1          (serveur Expo + web)
#         .\start.ps1 -Clear   (idem, en vidant le cache Metro)

param([switch]$Clear)

Set-Location $PSScriptRoot

Write-Host "=== GERETOU ===" -ForegroundColor Green

# 1. Installer les dependances si besoin
if (-not (Test-Path "node_modules\expo")) {
    Write-Host "Installation des dependances..." -ForegroundColor Yellow
    pnpm install
    if ($LASTEXITCODE -ne 0) { Write-Host "Echec de pnpm install" -ForegroundColor Red; exit 1 }
}

# 2. Lancer le serveur Expo + ouvrir la version web
#    Dans le terminal : 'a' = Android, 'i' = iOS, QR code = Expo Go
$expoArgs = @("start", "--web")
if ($Clear) { $expoArgs += "--clear" }

Write-Host "Demarrage du serveur Expo (web : http://localhost:8081)..." -ForegroundColor Green
pnpm exec expo @expoArgs
