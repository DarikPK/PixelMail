# deploy-pixelmail.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "[1/4] Compilando Frontend..."
npm run build

Write-Host ""
Write-Host "[2/4] Instalando dependencias de Functions..."
Push-Location .\mailapi
npm install
Pop-Location

Write-Host ""
Write-Host "[3/4] Desplegando Hosting + Functions + Firestore..."
firebase deploy --only hosting,functions,firestore:rules,firestore:indexes

Write-Host ""
Write-Host "=== Deploy Pixel Mail completado ==="