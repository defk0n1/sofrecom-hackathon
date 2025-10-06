@echo off
REM MailMate AI - Quick Start Script for Windows
REM Automatically sets up Gmail authentication and starts the backend

echo ======================================================================
echo   MailMate AI - Backend Quick Start
echo ======================================================================
echo.

cd backend

REM Check for credentials.json
if not exist "credentials.json" (
    echo [ERROR] credentials.json not found!
    echo.
    echo Please follow these steps:
    echo 1. Go to https://console.cloud.google.com/
    echo 2. Create/select a project
    echo 3. Enable Gmail API
    echo 4. Create OAuth 2.0 credentials ^(Desktop app^)
    echo 5. Download credentials.json
    echo 6. Place it in the backend directory
    echo.
    echo See AUTO_AUTH_GUIDE.md for detailed instructions
    echo.
    pause
    exit /b 1
)

echo [OK] Found credentials.json
echo.

REM Check for token.json
if exist "token.json" (
    echo [OK] Found existing authentication token
    echo      Gmail authentication is already set up!
    echo.
) else (
    echo [WARNING] No authentication token found
    echo           First-time authentication required...
    echo.
    echo Starting authentication setup...
    echo.
    
    python setup_gmail_auth.py
    
    if errorlevel 1 (
        echo.
        echo [ERROR] Authentication setup failed!
        echo         Please check the error messages above and try again.
        echo.
        pause
        exit /b 1
    )
)

echo ======================================================================
echo   Starting MailMate AI Backend Server
echo ======================================================================
echo.
echo Server starting at http://localhost:5000
echo Gmail service will auto-initialize...
echo.
echo Press Ctrl+C to stop the server
echo.

python main.py
