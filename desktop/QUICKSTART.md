# Quick Start Guide

## For Development (Recommended for testing)

### Option 1: All-in-one command (requires all services to be set up)

```bash
cd desktop
npm run dev
```

This will start:
- Frontend on http://localhost:8080
- Backend on http://localhost:5000
- Electron window

### Option 2: Start components separately (more control)

**Terminal 1 - Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 5000 --reload
```

**Terminal 2 - Frontend:**
```bash
cd MailMate-AI
npm install
npm run dev
```

**Terminal 3 - Electron:**
```bash
cd desktop
npm install
npm start
```

## For Production Build

```bash
cd desktop
npm run build
```

This will:
1. Build the React frontend
2. Package everything into a desktop application
3. Output to `desktop/dist-electron/`

## Installation

### Automated Installation

**Linux/macOS:**
```bash
cd desktop
./install.sh
```

**Windows:**
```cmd
cd desktop
install.bat
```

### Manual Installation

1. Install dependencies:
```bash
cd desktop && npm install
cd ../MailMate-AI && npm install
cd ../backend && pip install -r requirements.txt
```

2. Configure backend:
```bash
cd ../backend
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

3. Run the app:
```bash
cd ../desktop
npm run dev
```

## Troubleshooting

### Backend won't start
- Ensure Python 3.11+ is installed
- Check that all dependencies are installed: `pip install -r requirements.txt`
- Verify .env file exists with GEMINI_API_KEY

### Frontend shows blank screen
- Clear browser cache
- Rebuild: `cd MailMate-AI && npm run build`
- Check that API_URL is set to http://localhost:5000

### Electron window is blank
- Check that both frontend (port 8080) and backend (port 5000) are running
- Open DevTools (Ctrl+Shift+I) to see console errors
- Try starting components separately to isolate the issue

## Environment Setup

Create `.env` file in the `backend` directory:

```env
GEMINI_API_KEY=your_api_key_here
HOST=0.0.0.0
PORT=5000
DEBUG=True
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:5173
```

Create `.env` file in the `MailMate-AI` directory:

```env
VITE_API_URL=http://localhost:5000
```

## Platform-Specific Notes

### macOS
- You may need to grant permissions for the app to access files and network
- For production builds, you'll need a developer certificate

### Windows
- Run as administrator if you encounter permission issues
- Antivirus may flag the packaged app - add an exception

### Linux
- Install required dependencies: `sudo apt-get install python3-pip python3-venv`
- For AppImage builds: `sudo apt-get install fuse`
