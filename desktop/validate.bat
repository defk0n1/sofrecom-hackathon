@echo off
REM Validation script for MailMate AI Desktop Application (Windows)

echo =========================================
echo   MailMate AI Desktop - Validation
echo =========================================
echo.

set ERRORS=0

echo Checking prerequisites...
echo.

REM Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [OK] Node.js: %NODE_VERSION%
) else (
    echo [ERROR] Node.js is not installed
    set /a ERRORS+=1
)

REM Check npm
where npm >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo [OK] npm: %NPM_VERSION%
) else (
    echo [ERROR] npm is not installed
    set /a ERRORS+=1
)

REM Check Python
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
    echo [OK] Python: %PYTHON_VERSION%
) else (
    echo [ERROR] Python is not installed
    set /a ERRORS+=1
)

REM Check pip
where pip >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] pip is installed
) else (
    echo [ERROR] pip is not installed
    set /a ERRORS+=1
)

echo.
echo Checking project structure...
echo.

REM Check desktop files
if exist "%~dp0main.js" (
    echo [OK] Desktop main.js exists
) else (
    echo [ERROR] Desktop main.js not found
    set /a ERRORS+=1
)

if exist "%~dp0preload.js" (
    echo [OK] Desktop preload.js exists
) else (
    echo [ERROR] Desktop preload.js not found
    set /a ERRORS+=1
)

if exist "%~dp0package.json" (
    echo [OK] Desktop package.json exists
) else (
    echo [ERROR] Desktop package.json not found
    set /a ERRORS+=1
)

REM Check frontend
if exist "%~dp0..\MailMate-AI" (
    echo [OK] Frontend directory exists
    if exist "%~dp0..\MailMate-AI\package.json" (
        echo [OK] Frontend package.json exists
    ) else (
        echo [ERROR] Frontend package.json not found
        set /a ERRORS+=1
    )
) else (
    echo [ERROR] Frontend directory not found
    set /a ERRORS+=1
)

REM Check backend
if exist "%~dp0..\backend" (
    echo [OK] Backend directory exists
    if exist "%~dp0..\backend\main.py" (
        echo [OK] Backend main.py exists
    ) else (
        echo [ERROR] Backend main.py not found
        set /a ERRORS+=1
    )
    if exist "%~dp0..\backend\requirements.txt" (
        echo [OK] Backend requirements.txt exists
    ) else (
        echo [ERROR] Backend requirements.txt not found
        set /a ERRORS+=1
    )
) else (
    echo [ERROR] Backend directory not found
    set /a ERRORS+=1
)

echo.
echo Checking dependencies...
echo.

REM Check desktop dependencies
if exist "%~dp0node_modules" (
    echo [OK] Desktop dependencies installed
    if exist "%~dp0node_modules\electron" (
        echo [OK] Electron is installed
    ) else (
        echo [WARNING] Electron not found - run: npm install
        set /a ERRORS+=1
    )
) else (
    echo [WARNING] Desktop dependencies not installed - run: npm install
    set /a ERRORS+=1
)

REM Check frontend dependencies
if exist "%~dp0..\MailMate-AI\node_modules" (
    echo [OK] Frontend dependencies installed
) else (
    echo [WARNING] Frontend dependencies not installed - run: cd ..\MailMate-AI ^&^& npm install
)

REM Check backend virtual environment
if exist "%~dp0..\backend\venv" (
    echo [OK] Backend virtual environment exists
) else (
    echo [WARNING] Backend virtual environment not found - run: cd ..\backend ^&^& python -m venv venv
)

echo.
echo Checking configuration...
echo.

REM Check .env files
if exist "%~dp0..\backend\.env" (
    echo [OK] Backend .env exists
    findstr /C:"GEMINI_API_KEY=" "%~dp0..\backend\.env" >nul
    if %ERRORLEVEL% EQU 0 (
        echo [OK] GEMINI_API_KEY is configured
    ) else (
        echo [WARNING] GEMINI_API_KEY not found in .env
    )
) else (
    echo [WARNING] Backend .env not found - copy from .env.example
)

if exist "%~dp0..\MailMate-AI\.env" (
    echo [OK] Frontend .env exists
) else (
    echo [WARNING] Frontend .env not found - copy from .env.example
)

echo.
echo =========================================

if %ERRORS% EQU 0 (
    echo [OK] All checks passed!
    echo.
    echo You can now:
    echo   - Run development mode: npm run dev
    echo   - Build for production: npm run build
    echo.
    echo Or start components separately:
    echo   Terminal 1: cd ..\backend ^&^& venv\Scripts\activate ^&^& python -m uvicorn main:app --host 0.0.0.0 --port 5000 --reload
    echo   Terminal 2: cd ..\MailMate-AI ^&^& npm run dev
    echo   Terminal 3: cd ..\desktop ^&^& npm start
) else (
    echo [ERROR] Found %ERRORS% error^(s^)
    echo.
    echo Please fix the errors above before running the application.
)

echo =========================================

pause
