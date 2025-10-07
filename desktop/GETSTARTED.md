# MailMate AI Desktop - Visual Getting Started Guide

## 🎯 What You Get

```
╔═══════════════════════════════════════════════════════════════╗
║                  MailMate AI Desktop Application               ║
║                                                                ║
║  📧 Email Analysis        🤖 AI Chat        📎 Attachments    ║
║  📅 Calendar             ✅ Todos           🌍 Translation     ║
║                                                                ║
║  ✨ Same UI as web • Native desktop • Offline capable ✨      ║
╚═══════════════════════════════════════════════════════════════╝
```

## 📦 What's Inside

```
desktop/
│
├── 🚀 START HERE
│   ├── 📖 README.md          ← Full documentation
│   ├── ⚡ QUICKSTART.md      ← Fast setup (2 minutes)
│   └── 📊 SUMMARY.md         ← Complete overview
│
├── 🛠️ INSTALLATION
│   ├── 🐧 install.sh         ← Linux/macOS (just run it!)
│   ├── 🪟 install.bat         ← Windows (double-click!)
│   ├── ✅ validate.sh        ← Check if ready (Linux/macOS)
│   └── ✅ validate.bat       ← Check if ready (Windows)
│
├── 💻 FOR DEVELOPERS
│   ├── 🔧 DEVELOPMENT.md    ← Dev guide
│   ├── 🏗️ ARCHITECTURE.md   ← Technical details
│   └── 📝 CHANGELOG.md      ← Version history
│
└── ⚙️ CONFIGURATION
    ├── main.js              ← Electron app
    ├── preload.js          ← Security bridge
    ├── package.json        ← Dependencies
    └── .env.example        ← Config template
```

## 🚀 Quick Start (Choose Your Path)

### Path 1: I Just Want To Use It (Recommended)

```bash
# Step 1: Install everything
./install.sh              # Linux/macOS
install.bat              # Windows

# Step 2: Check it's ready
./validate.sh            # Linux/macOS  
validate.bat            # Windows

# Step 3: Configure
cd ../backend
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Step 4: Run!
cd ../desktop
npm run dev
```

**Total time: ~5 minutes**

### Path 2: I'm A Developer

```bash
# Read the development guide first
cat DEVELOPMENT.md

# Then follow Path 1, or:
# Terminal 1
cd ../backend && source venv/bin/activate && uvicorn main:app --reload

# Terminal 2  
cd ../MailMate-AI && npm run dev

# Terminal 3
cd ../desktop && npm start
```

**You get hot reload and full control!**

### Path 3: I Want To Build Production App

```bash
# After setup (Path 1)
npm run build

# Find your app in:
cd dist-electron/
```

**Installers for Windows, macOS, and Linux ready!**

## 📚 Documentation Roadmap

```
START HERE ─────────────────────────────────────┐
                                                 │
                                                 v
   Are you a USER or DEVELOPER?
                                                 
   USER              DEVELOPER                   
    │                    │                       
    v                    v                       
README.md           DEVELOPMENT.md               
QUICKSTART.md       ARCHITECTURE.md              
    │                    │                       
    v                    v                       
INSTALL             CODE & DEBUG                 
    │                    │                       
    v                    v                       
VALIDATE            BUILD & TEST                 
    │                    │                       
    v                    v                       
  RUN!              DEPLOY!                      
```

## 🎓 File Guide - What Each File Does

### Documentation Files (Read These!)

| File | Size | Purpose | For |
|------|------|---------|-----|
| **README.md** | 6 KB | Main documentation | Everyone |
| **QUICKSTART.md** | 3 KB | Fast setup guide | Users |
| **SUMMARY.md** | 11 KB | Complete overview | Everyone |
| **DEVELOPMENT.md** | 9 KB | Developer workflows | Developers |
| **ARCHITECTURE.md** | 10 KB | Technical details | Developers |
| **CHANGELOG.md** | 5 KB | Version history | Everyone |
| **GETSTARTED.md** | This file | Visual guide | New users |

### Script Files (Run These!)

| File | Platform | Purpose |
|------|----------|---------|
| **install.sh** | Linux/macOS | Auto-install everything |
| **install.bat** | Windows | Auto-install everything |
| **validate.sh** | Linux/macOS | Check if ready |
| **validate.bat** | Windows | Check if ready |

### Code Files (Don't Edit Unless You Know What You're Doing!)

| File | Purpose |
|------|---------|
| **main.js** | Electron main process |
| **preload.js** | Security bridge |
| **package.json** | Dependencies |

### Config Files (Edit These!)

| File | Purpose |
|------|---------|
| **.env.example** | Template for .env files |

## 🎯 Common Commands Reference

```bash
# INSTALLATION
./install.sh              # Install everything (Linux/macOS)
install.bat              # Install everything (Windows)

# VALIDATION  
./validate.sh            # Check setup (Linux/macOS)
validate.bat            # Check setup (Windows)

# DEVELOPMENT
npm run dev              # All-in-one dev mode
npm start                # Electron only

# BUILDING
npm run build            # Build production packages
npm run pack             # Test build (no installer)

# TROUBLESHOOTING
npm install              # Reinstall dependencies
rm -rf node_modules      # Clean dependencies
```

## 🆘 Help! Something's Wrong

### Problem: Script won't run

**Linux/macOS:**
```bash
chmod +x install.sh validate.sh
./install.sh
```

**Windows:**
```cmd
Right-click install.bat → Run as Administrator
```

### Problem: "Command not found"

**Install Node.js:**
- Download from https://nodejs.org/
- Choose LTS version
- Restart terminal after install

**Install Python:**
- Download from https://python.org/
- Choose 3.11 or newer
- Check "Add to PATH" during install

### Problem: "Port already in use"

```bash
# Find what's using port 5000
lsof -i :5000          # Linux/macOS
netstat -ano | findstr :5000  # Windows

# Kill it or use npm run dev (handles this)
```

### Problem: "Backend won't start"

```bash
cd ../backend
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate    # Windows

pip install -r requirements.txt

# Check .env file exists and has GEMINI_API_KEY
cat .env
```

### Problem: "Blank screen"

1. Open DevTools (Ctrl+Shift+I)
2. Check Console for errors
3. Verify backend is running (http://localhost:5000/health)
4. Check frontend is running (http://localhost:8080)

## 📊 Visual Flow

```
USER
  │
  v
┌─────────────┐
│ install.sh  │  ← Runs once
└──────┬──────┘
       │
       v
┌─────────────┐
│ validate.sh │  ← Check ready
└──────┬──────┘
       │
       v
┌─────────────┐
│ Configure   │  ← Edit .env files
│ .env files  │
└──────┬──────┘
       │
       v
┌─────────────┐
│ npm run dev │  ← Start app!
└──────┬──────┘
       │
       v
┌─────────────────────────────┐
│  MailMate AI Desktop App    │
│  ┌─────────────────────┐   │
│  │  Backend (Python)    │   │ ← Auto-starts
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │  Frontend (React)    │   │ ← Auto-starts
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │  Electron Window     │   │ ← Opens
│  └─────────────────────┘   │
└─────────────────────────────┘
```

## 🎉 Success Looks Like This

```
Terminal output:
✅ Node.js: v20.x.x
✅ Python: 3.11.x
✅ npm: 10.x.x
✅ Desktop dependencies installed
✅ Frontend dependencies installed  
✅ Backend virtual environment exists
✅ Backend .env exists
✅ All checks passed!

Browser window opens with:
┌──────────────────────────────────┐
│  MailMate AI                  ⚙️ │
├──────────────────────────────────┤
│                                   │
│   📧 Dashboard                    │
│   📅 Calendar                     │
│   ✅ Todos                        │
│                                   │
│   Same UI as web version!        │
│                                   │
└──────────────────────────────────┘
```

## 🏁 Next Steps After Setup

1. **Try the features:**
   - Upload an email for analysis
   - Chat with the AI
   - Add calendar events
   - Create todos

2. **Read the docs:**
   - README.md for features
   - DEVELOPMENT.md if coding

3. **Build production:**
   - `npm run build`
   - Share the installer!

## 📞 Getting More Help

1. **Read the docs:** Start with README.md
2. **Check examples:** See DEVELOPMENT.md
3. **Troubleshoot:** See QUICKSTART.md
4. **Ask for help:** Create a GitHub issue

## 🌟 You're Ready!

Everything you need is here. Just follow the Quick Start above and you'll have MailMate AI running as a desktop app in minutes!

**Welcome to MailMate AI Desktop! 🚀**

---

**P.S.** Start with `./install.sh` (or `install.bat`), then `npm run dev`. That's it!
