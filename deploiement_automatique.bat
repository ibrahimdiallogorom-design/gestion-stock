@echo off
chcp 65001 > nul
echo ==============================================================
echo   StockFlow - Mise a jour Automatique Cloud & GitHub
echo ==============================================================
echo.

powershell -ExecutionPolicy Bypass -File "C:\Users\USER\antigravity\StockFlow---Gestion-de-Stock\scripts\deploy_auto.ps1"

echo.
pause
