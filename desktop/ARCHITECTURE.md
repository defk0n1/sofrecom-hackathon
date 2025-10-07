# Desktop Application Architecture

## Overview

The MailMate AI Desktop application is built using Electron to wrap the existing React frontend and Python FastAPI backend into a native desktop application.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                  Electron Main Process               │
│  ┌──────────────────────────────────────────────┐  │
│  │  main.js                                     │  │
│  │  - Window management                         │  │
│  │  - Backend process spawning                  │  │
│  │  - IPC communication                         │  │
│  └──────────────────────────────────────────────┘  │
│                         │                            │
│         ┌───────────────┴───────────────┐           │
│         ▼                               ▼           │
│  ┌─────────────┐                ┌──────────────┐   │
│  │  Renderer   │                │   Backend    │   │
│  │  Process    │◄──────────────►│   Process    │   │
│  │             │   HTTP/WS      │              │   │
│  │  (React)    │   localhost    │  (FastAPI)   │   │
│  └─────────────┘                └──────────────┘   │
│         │                               │           │
└─────────┼───────────────────────────────┼───────────┘
          │                               │
          ▼                               ▼
  ┌──────────────┐              ┌─────────────────┐
  │   Frontend   │              │  Backend APIs   │
  │  Components  │              │  - Email AI     │
  │  - Dashboard │              │  - Chat         │
  │  - Calendar  │              │  - Attachments  │
  │  - Todos     │              │  - Gmail        │
  └──────────────┘              └─────────────────┘
```

## Components

### 1. Electron Main Process (`main.js`)

**Responsibilities:**
- Create and manage the main window
- Spawn and manage the Python backend process
- Handle application lifecycle events
- Provide IPC handlers for renderer communication

**Key Features:**
- Detects development vs production environment
- Automatically starts backend server in production
- Manages proper cleanup on app quit

### 2. Preload Script (`preload.js`)

**Responsibilities:**
- Bridge between main and renderer processes
- Expose safe APIs to the frontend
- Provide context isolation

**Exposed APIs:**
- `window.electron.getAppVersion()`
- `window.electron.checkBackendHealth()`
- `window.electron.isElectron` (flag)

### 3. React Frontend (from `../MailMate-AI`)

**Integration:**
- In development: Loaded from Vite dev server (http://localhost:8080)
- In production: Loaded from bundled files

**No Changes Required:**
- The existing React app works as-is
- Uses the same API calls to http://localhost:5000

### 4. FastAPI Backend (from `../backend`)

**Integration:**
- In development: Started manually by developer
- In production: Spawned automatically by Electron

**Process Management:**
- Started with: `python -m uvicorn main:app --host 0.0.0.0 --port 5000`
- Output is logged to console
- Automatically killed when app quits

## Communication Flow

```
User Interaction
      │
      ▼
[React Components]
      │
      ▼
[mailmateApi Service]
      │
      ▼
HTTP Request (localhost:5000)
      │
      ▼
[FastAPI Backend]
      │
      ▼
[Gemini AI / Processing]
      │
      ▼
JSON Response
      │
      ▼
[React State Update]
      │
      ▼
UI Update
```

## Build Process

### Development Build

1. **Frontend**: Vite dev server with hot reload
2. **Backend**: Manual start with uvicorn reload
3. **Electron**: Loads from dev server URLs

### Production Build

1. **Frontend Build**: `npm run build` in MailMate-AI
   - Outputs to `MailMate-AI/dist`
   
2. **Backend Packaging**: Python files are copied
   - Excludes: venv, __pycache__, .env
   
3. **Electron Build**: `electron-builder`
   - Bundles frontend build
   - Bundles backend files
   - Creates platform-specific installers

## File Structure

```
desktop/
├── main.js              # Main Electron process
├── preload.js          # Preload script
├── package.json        # Dependencies & build config
├── README.md           # Main documentation
├── QUICKSTART.md       # Quick start guide
├── ARCHITECTURE.md     # This file
├── install.sh          # Linux/macOS installer
├── install.bat         # Windows installer
├── .gitignore          # Git ignore rules
│
├── assets/             # App icons
│   ├── icon.png        # Linux icon
│   ├── icon.icns       # macOS icon
│   └── icon.ico        # Windows icon
│
└── dist-electron/      # Build output (generated)
```

## Dependencies

### Production Dependencies

- **electron-is-dev**: Detect development environment

### Development Dependencies

- **electron**: Electron framework
- **electron-builder**: Package and build
- **concurrently**: Run multiple commands
- **wait-on**: Wait for servers to start

## Environment Variables

### Backend (.env in backend/)

```env
GEMINI_API_KEY=xxx
HOST=0.0.0.0
PORT=5000
ALLOWED_ORIGINS=http://localhost:8080
```

### Frontend (.env in MailMate-AI/)

```env
VITE_API_URL=http://localhost:5000
```

## Security Considerations

1. **Context Isolation**: Enabled - renderer process has no direct Node.js access
2. **Node Integration**: Disabled - prevents XSS attacks
3. **Remote Module**: Disabled - prevents remote code execution
4. **Preload Script**: Only exposes safe, controlled APIs
5. **CSP**: Consider adding Content Security Policy headers

## Platform Support

### Windows
- **Targets**: NSIS installer, portable executable
- **Requirements**: Node.js, Python 3.11+
- **Build**: `npm run dist -- --win`

### macOS
- **Targets**: DMG, ZIP
- **Requirements**: Node.js, Python 3.11+, Xcode (for signing)
- **Build**: `npm run dist -- --mac`

### Linux
- **Targets**: AppImage, DEB
- **Requirements**: Node.js, Python 3.11+
- **Build**: `npm run dist -- --linux`

## Performance Considerations

1. **Backend Startup**: 2-3 seconds delay in production
2. **Memory Usage**: ~200MB for Electron + ~150MB for Python
3. **Disk Space**: ~300MB installed

## Future Enhancements

1. **Auto-Update**: Implement electron-updater
2. **Offline Mode**: Cache and local storage
3. **System Tray**: Minimize to tray option
4. **Deep Linking**: Handle mailto: and custom protocols
5. **Multi-Window**: Separate windows for chat, calendar, etc.
6. **Native Notifications**: System notifications for emails
7. **Keyboard Shortcuts**: Global shortcuts
8. **Performance**: Lazy loading, code splitting
9. **Crash Reporting**: Integrate Sentry or similar
10. **Analytics**: Optional usage analytics

## Development Tips

1. **Hot Reload**: Frontend auto-reloads, backend needs manual restart
2. **DevTools**: Open with Ctrl+Shift+I (Cmd+Option+I on macOS)
3. **Debugging**: Check both renderer console and main process console
4. **Backend Logs**: Shown in terminal where Electron was started
5. **Clean Build**: Delete dist-electron and node_modules if issues arise

## Testing

### Manual Testing Checklist

- [ ] App launches successfully
- [ ] Backend starts and responds on port 5000
- [ ] Frontend loads and displays correctly
- [ ] All API calls work (email analysis, chat, etc.)
- [ ] File uploads work
- [ ] App closes properly
- [ ] Backend process is terminated on close
- [ ] Window resizing works
- [ ] External links open in browser

### Automated Testing (Future)

- Unit tests for main process logic
- Integration tests for IPC communication
- E2E tests with Spectron or Playwright

## Build Optimization

### Reduce Bundle Size

1. Exclude unnecessary files in package.json
2. Use `asar` archive (enabled by default)
3. Compress with UPX (optional)

### Improve Startup Time

1. Lazy load heavy modules
2. Preload critical resources
3. Use native modules when possible

## Troubleshooting

### Common Issues

**Issue**: Backend doesn't start
- Check Python is in PATH
- Verify requirements.txt installed
- Check port 5000 is not in use

**Issue**: Frontend is blank
- Check console for errors
- Verify API_URL is correct
- Ensure backend is running

**Issue**: Build fails
- Clear cache: `rm -rf dist-electron node_modules`
- Reinstall: `npm install`
- Check electron-builder logs

## Contributing

When contributing to the desktop app:

1. Maintain compatibility with web version
2. Test on all target platforms
3. Update documentation
4. Follow Electron security best practices
5. Keep dependencies updated

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder](https://www.electron.build/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)
