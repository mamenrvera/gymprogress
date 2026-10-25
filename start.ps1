# GymProgress - Launcher for Windows (PowerShell)
# Sets up portable Node.js PATH and starts the dev server on LAN

$NodePath = "C:\Users\Mamen\AppData\Local\nodejs-portable\node-v24.22.1-win-x64"
$env:Path = "$NodePath;$env:Path"

Write-Host ""
Write-Host "========================================"
Write-Host "  GymProgress - Iniciando servidor"
Write-Host "========================================"
Write-Host ""
Write-Host "Node.js: $NodePath"
Write-Host "Directorio: $PSScriptRoot"
Write-Host ""

Set-Location $PSScriptRoot

Write-Host "Iniciando servidor de desarrollo en http://0.0.0.0:5173"
Write-Host "Accesible desde la red local (LAN)."
Write-Host ""
Write-Host "Para acceder desde el movil, usa la IP local del ordenador:"
Write-Host "  http://<IP-DEL-ORDENADOR>:5173"
Write-Host ""
Write-Host "Ejemplo: http://192.168.1.175:5173"
Write-Host ""
Write-Host "Pulsa Ctrl+C para detener el servidor."
Write-Host ""

npm.cmd run dev