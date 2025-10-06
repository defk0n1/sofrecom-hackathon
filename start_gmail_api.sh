#!/bin/bash
# Gmail API Backend Quick Start Script

echo "=========================================="
echo "Gmail API Backend - Quick Start"
echo "=========================================="
echo ""

# Check if credentials.json exists
if [ ! -f "credentials.json" ]; then
    echo "❌ Error: credentials.json not found!"
    echo ""
    echo "Please follow these steps:"
    echo "1. Go to https://console.cloud.google.com/"
    echo "2. Create/select a project"
    echo "3. Enable Gmail API"
    echo "4. Create OAuth 2.0 credentials"
    echo "5. Download credentials.json"
    echo "6. Place it in the root directory"
    echo ""
    echo "See GMAIL_API_README.md for detailed instructions"
    exit 1
fi

echo "✓ credentials.json found"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "Installing dependencies..."
    pip install -q -r requirements.txt
    echo "✓ Dependencies installed"
else
    echo "✓ Dependencies already installed"
fi

# Run tests
echo ""
echo "Running tests..."
python3 test_gmail_api.py

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✓ All tests passed!"
    echo "=========================================="
    echo ""
    echo "Starting Gmail API Backend..."
    echo "Server will be available at http://localhost:8000"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    
    # Start the server
    cd app && python main.py
else
    echo ""
    echo "❌ Tests failed. Please check the output above."
    exit 1
fi
