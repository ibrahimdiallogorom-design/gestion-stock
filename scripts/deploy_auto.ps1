# Script de Déploiement et Synchronisation Automatique vers GitHub Pages
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  STOCKFLOW - DEPLOIEMENT AUTOMATIQUE CLOUD & GITHUB PAGES" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$Workspace = "C:\Users\USER\antigravity\StockFlow---Gestion-de-Stock"
$DeployDir = "C:\Users\USER\Desktop\PROJET\gestion de stock"

# 1. Compilation Production Vite
Write-Host "`n[1/5] Compilation de production Vite..." -ForegroundColor Yellow
Set-Location $Workspace
cmd /c npm.cmd run build

# 2. Synchronisation des sources vers le dépôt de déploiement
Write-Host "`n[2/5] Synchronisation des fichiers sources..." -ForegroundColor Yellow
robocopy "$Workspace\src" "$DeployDir\src" /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null

# 3. Synchronisation du dossier dist
Write-Host "`n[3/5] Synchronisation du dossier dist/..." -ForegroundColor Yellow
robocopy "$Workspace\dist" "$DeployDir\dist" /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null

# 4. Synchronisation des fichiers racines pour GitHub Pages
Write-Host "`n[4/5] Mise à jour des bundles racines (index.html, 404.html, assets, APK)..." -ForegroundColor Yellow
Copy-Item -Path "$Workspace\dist\index.html" -Destination "$DeployDir\index.html" -Force
Copy-Item -Path "$Workspace\dist\index.html" -Destination "$DeployDir\404.html" -Force
Copy-Item -Path "$Workspace\dist\manifest.json" -Destination "$DeployDir\manifest.json" -Force
Copy-Item -Path "$Workspace\dist\sw.js" -Destination "$DeployDir\sw.js" -Force
Copy-Item -Path "$Workspace\dist\icon.png" -Destination "$DeployDir\icon.png" -Force
if (Test-Path "$Workspace\dist\GestionStock.apk") {
    Copy-Item -Path "$Workspace\dist\GestionStock.apk" -Destination "$DeployDir\GestionStock.apk" -Force
}

# Synchroniser assets (avec suppression des anciens bundles hachés)
robocopy "$Workspace\dist\assets" "$DeployDir\assets" /MIR /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
robocopy "$Workspace\dist\assets" "$Workspace\assets" /MIR /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
Copy-Item -Path "$Workspace\dist\index.html" -Destination "$Workspace\404.html" -Force

# 5. Git Commit & Push (Dépôt de déploiement Desktop)
Write-Host "`n[5/5] Envoi automatique vers GitHub (Push origin main)..." -ForegroundColor Yellow
Set-Location $DeployDir
git add -A
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "auto: mise a jour automatique cloud et application ($timestamp)"
git push origin main

# 6. Git Commit & Push (Workspace Antigravity)
Write-Host "`n[Bonus] Synchronisation du Workspace Antigravity..." -ForegroundColor Yellow
Set-Location $Workspace
git add -A
git commit -m "auto: mise a jour automatique cloud et application ($timestamp)"
git push origin main

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  DEPLOIEMENT ET SYNCHRONISATION TOTALE REUSSIS !" -ForegroundColor Green
Write-Host "  Votre site web, VS Code et GitHub sont 100% a jour." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
