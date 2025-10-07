#!/bin/bash

# Validation script for MailMate AI Desktop Application
# This script checks if all components are properly configured

echo "========================================="
echo "  MailMate AI Desktop - Validation"
echo "========================================="
echo ""

ERRORS=0

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a file exists
file_exists() {
    [ -f "$1" ]
}

# Function to check if a directory exists
dir_exists() {
    [ -d "$1" ]
}

echo "🔍 Checking prerequisites..."
echo ""

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js: $NODE_VERSION"
else
    echo "❌ Node.js is not installed"
    ERRORS=$((ERRORS + 1))
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm: $NPM_VERSION"
else
    echo "❌ npm is not installed"
    ERRORS=$((ERRORS + 1))
fi

# Check Python
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version)
    echo "✅ Python: $PYTHON_VERSION"
elif command_exists python; then
    PYTHON_VERSION=$(python --version)
    echo "✅ Python: $PYTHON_VERSION"
else
    echo "❌ Python is not installed"
    ERRORS=$((ERRORS + 1))
fi

# Check pip
if command_exists pip3; then
    PIP_VERSION=$(pip3 --version | awk '{print $2}')
    echo "✅ pip: $PIP_VERSION"
elif command_exists pip; then
    PIP_VERSION=$(pip --version | awk '{print $2}')
    echo "✅ pip: $PIP_VERSION"
else
    echo "❌ pip is not installed"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "🔍 Checking project structure..."
echo ""

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Check desktop files
if file_exists "$SCRIPT_DIR/main.js"; then
    echo "✅ Desktop main.js exists"
else
    echo "❌ Desktop main.js not found"
    ERRORS=$((ERRORS + 1))
fi

if file_exists "$SCRIPT_DIR/preload.js"; then
    echo "✅ Desktop preload.js exists"
else
    echo "❌ Desktop preload.js not found"
    ERRORS=$((ERRORS + 1))
fi

if file_exists "$SCRIPT_DIR/package.json"; then
    echo "✅ Desktop package.json exists"
else
    echo "❌ Desktop package.json not found"
    ERRORS=$((ERRORS + 1))
fi

# Check frontend
if dir_exists "$PROJECT_ROOT/MailMate-AI"; then
    echo "✅ Frontend directory exists"
    if file_exists "$PROJECT_ROOT/MailMate-AI/package.json"; then
        echo "✅ Frontend package.json exists"
    else
        echo "❌ Frontend package.json not found"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "❌ Frontend directory not found"
    ERRORS=$((ERRORS + 1))
fi

# Check backend
if dir_exists "$PROJECT_ROOT/backend"; then
    echo "✅ Backend directory exists"
    if file_exists "$PROJECT_ROOT/backend/main.py"; then
        echo "✅ Backend main.py exists"
    else
        echo "❌ Backend main.py not found"
        ERRORS=$((ERRORS + 1))
    fi
    if file_exists "$PROJECT_ROOT/backend/requirements.txt"; then
        echo "✅ Backend requirements.txt exists"
    else
        echo "❌ Backend requirements.txt not found"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "❌ Backend directory not found"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "🔍 Checking dependencies..."
echo ""

# Check desktop dependencies
if dir_exists "$SCRIPT_DIR/node_modules"; then
    echo "✅ Desktop dependencies installed"
    
    # Check for Electron
    if dir_exists "$SCRIPT_DIR/node_modules/electron"; then
        echo "✅ Electron is installed"
    else
        echo "⚠️  Electron not found - run: npm install"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "⚠️  Desktop dependencies not installed - run: npm install"
    ERRORS=$((ERRORS + 1))
fi

# Check frontend dependencies
if dir_exists "$PROJECT_ROOT/MailMate-AI/node_modules"; then
    echo "✅ Frontend dependencies installed"
else
    echo "⚠️  Frontend dependencies not installed - run: cd ../MailMate-AI && npm install"
fi

# Check backend virtual environment
if dir_exists "$PROJECT_ROOT/backend/venv"; then
    echo "✅ Backend virtual environment exists"
else
    echo "⚠️  Backend virtual environment not found - run: cd ../backend && python -m venv venv"
fi

echo ""
echo "🔍 Checking configuration..."
echo ""

# Check .env files
if file_exists "$PROJECT_ROOT/backend/.env"; then
    echo "✅ Backend .env exists"
    
    # Check for API key
    if grep -q "GEMINI_API_KEY=" "$PROJECT_ROOT/backend/.env"; then
        if grep -q "GEMINI_API_KEY=your" "$PROJECT_ROOT/backend/.env"; then
            echo "⚠️  GEMINI_API_KEY is not configured (using placeholder)"
        else
            echo "✅ GEMINI_API_KEY is configured"
        fi
    else
        echo "⚠️  GEMINI_API_KEY not found in .env"
    fi
else
    echo "⚠️  Backend .env not found - copy from .env.example"
fi

if file_exists "$PROJECT_ROOT/MailMate-AI/.env"; then
    echo "✅ Frontend .env exists"
else
    echo "⚠️  Frontend .env not found - copy from .env.example"
fi

echo ""
echo "========================================="

if [ $ERRORS -eq 0 ]; then
    echo "✅ All checks passed!"
    echo ""
    echo "You can now:"
    echo "  - Run development mode: npm run dev"
    echo "  - Build for production: npm run build"
    echo ""
    echo "Or start components separately:"
    echo "  Terminal 1: cd ../backend && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 5000 --reload"
    echo "  Terminal 2: cd ../MailMate-AI && npm run dev"
    echo "  Terminal 3: cd ../desktop && npm start"
else
    echo "❌ Found $ERRORS error(s)"
    echo ""
    echo "Please fix the errors above before running the application."
fi

echo "========================================="
