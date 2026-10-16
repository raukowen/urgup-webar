@echo off
title Urgup Meydani WebAR Sunucusu
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0start_server.ps1"
pause
