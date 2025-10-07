@echo off
REM Installation script for MailMate AI Desktop Application (Windows)

echo =========================================
echo   MailMate AI Desktop - Setup Script
echo =========================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

REM Check if Python is installed
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Python is not installed. Please install Python 3.11+ first.
    exit /b 1
)

node --version
python --version
echo.

REM Step 1: Install desktop dependencies
echo Installing desktop dependencies...
cd /d "%~dp0"
call npm install

REM Step 2: Install frontend dependencies
echo.
echo Installing frontend dependencies...
cd ..\MailMate-AI
call npm install

REM Step 3: Install backend dependencies
echo.
echo Installing backend dependencies...
cd ..\backend

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment and install dependencies
call venv\Scripts\activate.bat
pip install -r requirements.txt

echo.
echo =========================================
echo   Installation Complete!
echo =========================================
echo.
echo Next steps:
echo 1. Configure your .env file in the backend directory:
echo    cd ..\backend
echo    copy .env.example .env
echo    REM Edit .env and add your GEMINI_API_KEY
echo.
echo 2. Start the development server:
echo    cd ..\desktop
echo    npm run dev
echo.
echo    OR start components separately:
echo    Terminal 1: cd backend ^&^& venv\Scripts\activate ^&^& python -m uvicorn main:app --host 0.0.0.0 --port 5000 --reload
echo    Terminal 2: cd MailMate-AI ^&^& npm run dev
echo    Terminal 3: cd desktop ^&^& npm start
echo.
echo 3. Build for production:
echo    npm run build
echo.
echo =========================================

pause
