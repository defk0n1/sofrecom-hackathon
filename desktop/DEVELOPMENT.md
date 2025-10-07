# Development Guide for MailMate AI Desktop

This guide covers development workflows, debugging, and best practices for the desktop application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Development Workflow](#development-workflow)
- [Debugging](#debugging)
- [Common Tasks](#common-tasks)
- [Building & Packaging](#building--packaging)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting development, ensure you have:

1. **Node.js 18+** and npm
2. **Python 3.11+** with pip
3. **Git** for version control
4. **Code Editor** (VS Code recommended)

Optional but recommended:
- **Electron DevTools** extension for VS Code
- **Python** extension for VS Code
- **ESLint** extension for VS Code

## Initial Setup

### 1. Clone and Setup

```bash
# Navigate to desktop directory
cd desktop

# Run validation to check prerequisites
./validate.sh

# Install desktop dependencies
npm install

# Install frontend dependencies
cd ../MailMate-AI
npm install

# Setup backend
cd ../backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### 2. Verify Setup

```bash
cd ../desktop
./validate.sh
```

This should report that all components are properly configured.

## Development Workflow

### Option 1: All-in-One (Recommended for quick testing)

```bash
cd desktop
npm run dev
```

This will:
- Start the React frontend on port 8080
- Start the FastAPI backend on port 5000  
- Launch Electron window
- Enable hot reload for frontend

### Option 2: Separate Terminals (Recommended for active development)

This gives you better control and visibility:

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 5000 --reload
```

**Terminal 2 - Frontend:**
```bash
cd MailMate-AI
npm run dev
```

**Terminal 3 - Electron:**
```bash
cd desktop
npm start
```

### Development Cycle

1. **Make Changes**: Edit code in your preferred editor
2. **Hot Reload**: 
   - Frontend changes reload automatically
   - Backend changes reload with `--reload` flag
   - Electron main process requires restart (Ctrl+R in window)
3. **Test**: Use the application and check console for errors
4. **Debug**: Use DevTools (Ctrl+Shift+I) and console logs
5. **Commit**: Commit working changes to git

## Debugging

### Opening DevTools

In development mode, DevTools open automatically. You can also:
- Press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (macOS)
- Right-click and select "Inspect Element"

### Main Process Debugging

To debug the Electron main process:

**Option 1: Console Logs**
```javascript
// In main.js
console.log('Debug info:', someVariable);
```

Output appears in the terminal where you ran `npm start`.

**Option 2: VS Code Debugger**

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Electron Main",
      "runtimeExecutable": "${workspaceFolder}/desktop/node_modules/.bin/electron",
      "runtimeArgs": ["${workspaceFolder}/desktop"],
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Renderer Process Debugging

Use Chrome DevTools in the Electron window:
- **Console**: View logs and errors
- **Network**: Monitor API calls
- **Elements**: Inspect DOM
- **Sources**: Set breakpoints in React code

### Backend Debugging

**Console Logs:**
```python
print(f"Debug: {variable}")  # Simple logging
logging.debug(f"Debug: {variable}")  # Proper logging
```

**Interactive Debugger:**
```python
import pdb; pdb.set_trace()  # Set breakpoint
```

### Common Debug Points

1. **Backend not responding**: Check terminal 1 for errors
2. **Frontend shows blank**: Check DevTools console
3. **API calls fail**: Check Network tab, verify backend is running
4. **Window won't open**: Check terminal for Electron errors

## Common Tasks

### Adding a New Feature

1. **Backend Changes** (if needed):
   ```bash
   cd backend
   # Edit routers, models, or services
   # Backend auto-reloads with --reload flag
   ```

2. **Frontend Changes**:
   ```bash
   cd MailMate-AI/src
   # Edit components, pages, or services
   # Changes hot-reload automatically
   ```

3. **Electron Changes**:
   ```bash
   cd desktop
   # Edit main.js or preload.js
   # Restart Electron (Ctrl+C then npm start)
   ```

### Adding Dependencies

**Desktop:**
```bash
cd desktop
npm install --save package-name
npm install --save-dev dev-package-name
```

**Frontend:**
```bash
cd MailMate-AI
npm install package-name
```

**Backend:**
```bash
cd backend
source venv/bin/activate
pip install package-name
pip freeze > requirements.txt  # Update requirements
```

### Testing API Endpoints

Use curl, Postman, or the frontend:

```bash
# Health check
curl http://localhost:5000/health

# Process email
curl -X POST http://localhost:5000/ai/process \
  -F "email_text=Hello, this is a test email"
```

### Viewing Logs

**Electron Main Process:**
- Outputs to terminal where `npm start` was run

**Renderer Process:**
- Open DevTools (Ctrl+Shift+I), check Console tab

**Backend:**
- Outputs to terminal where uvicorn was run
- Check for HTTP requests and responses

## Building & Packaging

### Development Build

Test the build process without creating installers:

```bash
cd desktop
npm run pack
```

This creates an unpacked build in `dist-electron/`.

### Production Build

Create platform-specific installers:

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run dist -- --win    # Windows
npm run dist -- --mac    # macOS
npm run dist -- --linux  # Linux
```

Output is in `desktop/dist-electron/`.

### Build Process Steps

1. Frontend is built (`npm run build:frontend`)
2. Backend files are copied
3. Electron packages everything
4. Platform-specific installer is created

### Testing Production Build

After building, test the packaged app:

**Windows:**
```bash
./dist-electron/win-unpacked/MailMate AI.exe
```

**macOS:**
```bash
open "./dist-electron/mac/MailMate AI.app"
```

**Linux:**
```bash
./dist-electron/linux-unpacked/mailmate-ai-desktop
```

## Troubleshooting

### "Cannot find module 'electron'"

```bash
cd desktop
rm -rf node_modules package-lock.json
npm install
```

### Backend won't start

1. Check Python is in PATH: `python --version`
2. Verify dependencies: `pip list`
3. Check port 5000 is free: `lsof -i :5000` (Linux/macOS)
4. Check .env file exists and has valid API key

### Frontend shows blank screen

1. Check console in DevTools (Ctrl+Shift+I)
2. Verify API_URL is correct: `http://localhost:5000`
3. Check backend is running: `curl http://localhost:5000/health`
4. Clear cache: Delete `MailMate-AI/dist` and rebuild

### "Port already in use"

Kill the process using the port:

```bash
# Find process on port 5000
lsof -i :5000          # Linux/macOS
netstat -ano | findstr :5000  # Windows

# Kill it
kill -9 <PID>          # Linux/macOS
taskkill /PID <PID> /F # Windows
```

### Build fails

1. Check all dependencies are installed
2. Verify frontend builds successfully: `cd MailMate-AI && npm run build`
3. Clean and rebuild:
   ```bash
   cd desktop
   rm -rf dist-electron node_modules
   npm install
   npm run build
   ```

### "Python not found" in production

Ensure Python is bundled or available in PATH. For production:
- Include Python runtime with the app
- Or document Python as a prerequisite
- Or use PyInstaller to create Python executable

## Best Practices

### Code Style

- **JavaScript**: Follow Airbnb style guide
- **Python**: Follow PEP 8
- **TypeScript/React**: Use ESLint rules
- **Commit Messages**: Use conventional commits

### Security

1. **Never commit secrets**: Use .env files
2. **Validate user input**: In both frontend and backend
3. **Use context isolation**: Already enabled in preload.js
4. **Sanitize file paths**: Prevent directory traversal

### Performance

1. **Lazy load components**: Import only when needed
2. **Optimize images**: Compress and use appropriate formats
3. **Cache API responses**: Reduce redundant calls
4. **Use production builds**: Development builds are slower

### Testing

1. **Manual testing**: Test all features after changes
2. **API testing**: Use Postman or similar
3. **Cross-platform testing**: Test on Windows, macOS, Linux
4. **Error handling**: Test with invalid inputs

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/my-feature
```

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)

## Getting Help

1. Check documentation files in the repository
2. Search for similar issues on GitHub
3. Ask in team chat or create an issue
4. Check Electron and FastAPI forums

---

**Happy coding! 🚀**
