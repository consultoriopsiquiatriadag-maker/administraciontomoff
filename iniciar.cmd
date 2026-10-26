@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js 24 LTS desde https://nodejs.org y vuelve a abrir este archivo.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm ci --cache "%TEMP%\mis-cuentas-npm"
  if errorlevel 1 goto error
)
call npm run build
if errorlevel 1 goto error
echo.
echo Mis cuentas: abre http://127.0.0.1:4173 en tu navegador.
echo Conserva esta ventana abierta. Para cerrar la aplicacion, presiona Ctrl+C.
echo Usa siempre la misma direccion y el mismo perfil del navegador.
echo.
call npm start
if errorlevel 1 goto error
exit /b 0
:error
echo No se pudo iniciar Mis cuentas. Revisa el mensaje anterior.
pause
exit /b 1
