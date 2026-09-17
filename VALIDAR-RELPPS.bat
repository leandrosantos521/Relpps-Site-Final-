@echo off
setlocal
cd /d "%~dp0"
echo ========================================
echo RELPPS - VALIDACAO LOCAL
echo ========================================
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale Node 20+.
  exit /b 1
)
for /r netlify\functions %%F in (*.js) do (
  node --check "%%F" >nul || (
    echo ERRO DE SINTAXE: %%F
    exit /b 1
  )
)
node --check app.js >nul || exit /b 1
node --check premium-animations.js >nul || exit /b 1
if not exist index.html exit /b 1
if not exist assets exit /b 1
if not exist netlify\functions\checkout.js exit /b 1
if not exist netlify\functions\bling-webhook-background.js exit /b 1
if not exist SUPABASE-CORRIGIR-AGORA.sql exit /b 1
echo.
echo OK - arquivos e JavaScript validos.
echo Agora publique o ZIP e configure as variaveis do README-ENTREGA-FINAL-17-09-2026.md.
pause
