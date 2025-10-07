# MailMate AI - Desktop Application

🚀 **AI-Powered Email Assistant Desktop Application** - Built with Electron, React, and Python FastAPI

## 📋 Overview

This is the desktop version of MailMate AI, packaged as a cross-platform Electron application that includes:
- Full React frontend (identical to the web version)
- Embedded Python FastAPI backend
- Native desktop experience for Windows, macOS, and Linux

## ✨ Features

- **Native Desktop App**: Runs as a standalone application
- **Offline Capable**: Backend runs locally with the application
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Auto-Updates**: Built-in update mechanism
- **System Integration**: Native notifications and file system access

## 🛠️ Setup & Installation

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Electron development environment

### Development Setup

1. **Navigate to the desktop directory**
   ```bash
   cd desktop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../MailMate-AI
   npm install
   cd ../desktop
   ```

4. **Install backend dependencies**
   ```bash
   cd ../backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cd ../desktop
   ```

5. **Configure environment variables**
   
   Create `.env` file in the backend directory:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```

6. **Start development mode**
   ```bash
   npm run dev
   ```
   
   This will:
   - Start the React frontend on port 8080
   - Start the FastAPI backend on port 5000
   - Launch the Electron window
   
   **Note**: You can also start components separately:
   ```bash
   # Terminal 1: Start backend
   cd ../backend
   python -m venv venv
   source venv/bin/activate
   uvicorn main:app --host 0.0.0.0 --port 5000 --reload
   
   # Terminal 2: Start frontend
   cd ../MailMate-AI
   npm run dev
   
   # Terminal 3: Start Electron
   cd ../desktop
   npm start
   ```

## 📦 Building for Production

### Build the Application

```bash
# Build frontend and package for all platforms
npm run build

# Build for specific platform
npm run dist
```

### Platform-Specific Builds

```bash
# Windows only
npm run dist -- --win

# macOS only
npm run dist -- --mac

# Linux only
npm run dist -- --linux
```

The built applications will be in the `dist-electron` directory.

## 📁 Project Structure

```
desktop/
├── main.js                 # Electron main process
├── preload.js             # Preload script for IPC
├── package.json           # Electron dependencies & build config
├── assets/                # App icons and resources
│   ├── icon.png
│   ├── icon.icns
│   └── icon.ico
└── README.md
```

## 🔧 Configuration

### Backend Configuration

The backend is automatically started by Electron. Configure it by editing:
- `../backend/.env` - Environment variables
- `../backend/main.py` - Backend settings

### Frontend Configuration

The frontend is served from the React build. Configure it by editing:
- `../MailMate-AI/.env` - API URL (should be http://localhost:5000)
- `../MailMate-AI/vite.config.ts` - Build settings

### Electron Configuration

Edit `package.json` to modify:
- Build targets
- App metadata
- Resource inclusion
- Platform-specific settings

## 🚀 Features Specific to Desktop App

### Auto-Start Backend

The backend server starts automatically when you launch the app, no manual setup required.

### Native File System Access

- Drag and drop email files
- Browse local files for attachments
- Save analysis results locally

### System Integration

- Native notifications for important emails
- System tray icon (optional)
- Deep linking support

## 🐛 Troubleshooting

### Issue: Backend won't start

**Solution**: Ensure Python and all dependencies are installed:
```bash
cd ../backend
pip install -r requirements.txt
```

### Issue: Frontend shows blank screen

**Solution**: Build the frontend first:
```bash
cd ../MailMate-AI
npm run build
```

### Issue: API calls fail

**Solution**: Check that:
1. Backend is running on port 5000
2. Frontend API URL is set to `http://localhost:5000`
3. CORS is configured correctly in backend

### Issue: Electron won't start

**Solution**: 
```bash
# Reinstall Electron
npm install electron --save-dev

# Clear cache
rm -rf node_modules
npm install
```

## 🔗 Related Documentation

- [Frontend Documentation](../MailMate-AI/README.md)
- [Backend Documentation](../backend/BACKEND_README.md)
- [Main Project README](../README.md)

## 📝 Development Notes

### Development vs Production

- **Development**: Frontend runs on Vite dev server (port 8080), backend runs separately
- **Production**: Both frontend and backend are bundled with the Electron app

### Environment Variables

Create a `.env.local` in the backend directory for development:
```env
GEMINI_API_KEY=your_dev_key
DEBUG=True
```

For production, these will be bundled (except sensitive keys which should be configured post-install).

## 🎨 Customization

### Change App Icon

Replace the icons in `assets/`:
- `icon.png` - Linux icon (512x512)
- `icon.icns` - macOS icon
- `icon.ico` - Windows icon

### Modify Window Size

Edit `main.js`:
```javascript
mainWindow = new BrowserWindow({
  width: 1400,  // Change width
  height: 900,  // Change height
  // ...
});
```

## 📦 Distribution

### Code Signing

For production distribution:

**macOS**:
```bash
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your_password
npm run dist -- --mac
```

**Windows**:
```bash
set CSC_LINK=path\to\certificate.pfx
set CSC_KEY_PASSWORD=your_password
npm run dist -- --win
```

### Auto-Updates

Configure auto-updates in `package.json`:
```json
"publish": {
  "provider": "github",
  "owner": "your-username",
  "repo": "your-repo"
}
```

## 🌟 Features Roadmap

- [ ] Auto-update mechanism
- [ ] System tray integration
- [ ] Offline mode with cached data
- [ ] Dark mode toggle
- [ ] Keyboard shortcuts
- [ ] Multi-account support

---

**Built with ❤️ using Electron, React, TypeScript, and Python FastAPI**
