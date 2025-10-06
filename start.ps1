# MailMate AI - Quick Start Script for Windows
# Automatically sets up Gmail authentication and starts the backend

Write-Host "=" -ForegroundColor Cyan -NoNewline
Write-Host ("=" * 69) -ForegroundColor Cyan
Write-Host "  MailMate AI - Backend Quick Start" -ForegroundColor Yellow
Write-Host "=" -ForegroundColor Cyan -NoNewline
Write-Host ("=" * 69) -ForegroundColor Cyan
Write-Host ""

# Change to backend directory
Set-Location -Path "backend"

# Check for credentials.json
if (-Not (Test-Path "credentials.json")) {
    Write-Host "❌ ERROR: credentials.json not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please follow these steps:" -ForegroundColor Yellow
    Write-Host "1. Go to https://console.cloud.google.com/" -ForegroundColor White
    Write-Host "2. Create/select a project" -ForegroundColor White
    Write-Host "3. Enable Gmail API" -ForegroundColor White
    Write-Host "4. Create OAuth 2.0 credentials (Desktop app)" -ForegroundColor White
    Write-Host "5. Download credentials.json" -ForegroundColor White
    Write-Host "6. Place it in the backend directory" -ForegroundColor White
    Write-Host ""
    Write-Host "See AUTO_AUTH_GUIDE.md for detailed instructions" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host "✅ Found credentials.json" -ForegroundColor Green
Write-Host ""

# Check for token.json
if (Test-Path "token.json") {
    Write-Host "✅ Found existing authentication token" -ForegroundColor Green
    Write-Host "   Gmail authentication is already set up!" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "⚠️  No authentication token found" -ForegroundColor Yellow
    Write-Host "   First-time authentication required..." -ForegroundColor Gray
    Write-Host ""
    Write-Host "🔐 Starting authentication setup..." -ForegroundColor Cyan
    Write-Host ""
    
    # Run authentication setup
    python setup_gmail_auth.py
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "❌ Authentication setup failed!" -ForegroundColor Red
        Write-Host "   Please check the error messages above and try again." -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
}

Write-Host "=" -ForegroundColor Cyan -NoNewline
Write-Host ("=" * 69) -ForegroundColor Cyan
Write-Host "  Starting MailMate AI Backend Server" -ForegroundColor Yellow
Write-Host "=" -ForegroundColor Cyan -NoNewline
Write-Host ("=" * 69) -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Server starting at http://localhost:5000" -ForegroundColor Green
Write-Host "📧 Gmail service will auto-initialize..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Start the backend server
python main.py
