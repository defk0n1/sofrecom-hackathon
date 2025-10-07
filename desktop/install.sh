#!/bin/bash

# Installation script for MailMate AI Desktop Application

echo "========================================="
echo "  MailMate AI Desktop - Setup Script"
echo "========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.11+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ Python version: $(python3 --version 2>/dev/null || python --version)"
echo ""

# Step 1: Install desktop dependencies
echo "📦 Installing desktop dependencies..."
cd "$(dirname "$0")"
npm install

# Step 2: Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd ../MailMate-AI
npm install

# Step 3: Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd ../backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv 2>/dev/null || python -m venv venv
fi

# Activate virtual environment
source venv/bin/activate 2>/dev/null || . venv/Scripts/activate

# Install Python dependencies
pip install -r requirements.txt

echo ""
echo "========================================="
echo "  ✅ Installation Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Configure your .env file in the backend directory:"
echo "   cd ../backend"
echo "   cp .env.example .env"
echo "   # Edit .env and add your GEMINI_API_KEY"
echo ""
echo "2. Start the development server:"
echo "   cd ../desktop"
echo "   npm run dev"
echo ""
echo "   OR start components separately:"
echo "   Terminal 1: cd backend && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 5000 --reload"
echo "   Terminal 2: cd MailMate-AI && npm run dev"
echo "   Terminal 3: cd desktop && npm start"
echo ""
echo "3. Build for production:"
echo "   npm run build"
echo ""
echo "========================================="
