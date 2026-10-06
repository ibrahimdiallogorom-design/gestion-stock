@echo off
chcp 65001 > nul
echo ==============================================================
echo   Synchronisation Boutique VisionTech vers GitHub
echo ==============================================================
echo.
cd /d "C:\Users\USER\Desktop\PROJET\gestion de stock"

echo [1/3] Indexation des fichiers...
git add -A

echo [2/3] Enregistrement des modifications (Commit)...
git commit -m "Mise a jour Boutique VisionTech"

echo [3/3] Envoi vers GitHub (Push)...
git push origin main

echo.
if %errorlevel% equ 0 (
    echo ==============================================================
    echo [SUCCES] Modifications envoyees avec succes sur GitHub !
    echo Votre site en ligne sera actualise d'ici 1 a 2 minutes.
    echo ==============================================================
) else (
    echo ==============================================================
    echo [ATTENTION] Verifiez la connexion ou vos identifiants GitHub.
    echo ==============================================================
)
echo.
pause
