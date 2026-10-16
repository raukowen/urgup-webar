@echo off
title GitHub'a Yukle - Urgup Meydani WebAR
cd /d "%~dp0"
set GIT_CMD=..\tools\mingit\cmd\git.exe

echo ========================================================
echo  URGUP MEYDANI WEBAR - GITHUB'A YUKLEME ARACI
echo ========================================================
echo.
set /p REPO_URL="GitHub Repo URL'inizi yapistirin (Ornek: https://github.com/kullanici/urgup-webar.git): "

if "%REPO_URL%"=="" (
    echo Hata: URL bos birakilamaz!
    pause
    exit /b
)

echo.
echo Git remote baglantisi ekleniyor...
%GIT_CMD% remote remove origin >nul 2>&1
%GIT_CMD% remote add origin %REPO_URL%
%GIT_CMD% branch -M main

echo.
echo Kodlar GitHub'a gonderiliyor (GitHub giris penceresi acilabilir)...
%GIT_CMD% push -u origin main

echo.
if %errorlevel% equ 0 (
    echo ========================================================
    echo  BASARILI! Proje GitHub'a yuklendi.
    echo  Simdi GitHub reponuzda Settings ^> Pages kismindan
    echo  Branch: 'main' secip Save'e basin.
    echo  1 dakika icinde telefonla denemek icin https linkiniz aktif olacaktir!
    echo ========================================================
) else (
    echo Yukleme sirasinda bir hata olustu. Lutfen URL'yi ve yetkilerinizi kontrol edin.
)

pause
