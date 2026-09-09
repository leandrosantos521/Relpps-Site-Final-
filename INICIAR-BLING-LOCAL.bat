@echo off
cd /d "%~dp0"
title RELPPS - BLING LOCAL
if not exist "%~dp0.env" (
  echo.
  echo ERRO: arquivo .env nao encontrado.
  echo.
  pause
  exit /b 1
)
echo Iniciando Relpps + Bling local...
echo Nao feche esta janela enquanto estiver usando a integracao.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0bling-local.ps1"
pause
