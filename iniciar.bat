@echo off
title Foliador PDF
color 0A

echo.
echo  Foliador PDF - Iniciando servidor...
echo.

:: Verificar que Python esta instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Python no esta instalado o no esta en el PATH.
    echo  Descargalo en https://www.python.org
    pause
    exit /b
)

:: Verificar que las dependencias estan instaladas
python -c "import flask" >nul 2>&1
if %errorlevel% neq 0 (
    echo  Instalando dependencias por primera vez...
    echo  Esto solo ocurre una vez.
    echo.
    pip install -r requirements.txt
    echo.
)

:: Iniciar el servidor
echo  Servidor corriendo en http://localhost:5000
echo  Comparte en red local: http://<tu-ip>:5000
echo.
echo  Presiona Ctrl + C para detener el servidor.
echo.

python run.py

pause