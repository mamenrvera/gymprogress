@echo off
REM GymProgress - Launcher for Windows
REM Sets up portable Node.js PATH and starts the dev server on LAN

set NODE_PATH=C:\Users\Mamen\AppData\Local\nodejs-portable\node-v24.22.1-win-x64
set PATH=%NODE_PATH%;%PATH%

echo.
echo ========================================
echo   GymProgress - Iniciando servidor
echo ========================================
echo.
echo Node.js: %NODE_PATH%
echo Directorio: %~dp0
echo.

cd /d "%~dp0"

echo Iniciando servidor de desarrollo en http://0.0.0.0:5173
echo Accesible desde la red local (LAN).
echo.
echo Para acceder desde el movil, usa la IP local del ordenador:
echo   http://<IP-DEL-ORDENADOR>:5173
echo.
echo Ejemplo: http://192.168.1.175:5173
echo.
echo Pulsa Ctrl+C para detener el servidor.
echo.

npm.cmd run dev