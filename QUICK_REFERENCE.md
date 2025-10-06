# 🚀 Gmail Auto-Authentication - Quick Reference

## ⚡ Quick Start (3 Steps)

```bash
# 1. Place credentials.json in backend/
cd backend

# 2. Run one-time setup
python setup_gmail_auth.py

# 3. Start server (or use start.bat / start.ps1)
python main.py
```

**That's it!** Gmail is now auto-authenticated. 🎉

---

## 📋 No Auth Headers Needed!

### ❌ Before (Manual Auth)
```javascript
fetch('/emails', {
  headers: { 
    'Authorization': 'Bearer YOUR_TOKEN_HERE' 
  }
})
```

### ✅ After (Automatic)
```javascript
fetch('http://localhost:5000/emails')
```

---

## 🔧 Common Tasks

### Check Authentication Status
```bash
curl http://localhost:5000/health
```

### Get Emails
```bash
curl http://localhost:5000/emails?max_results=10
```

### Re-authenticate
```bash
rm token.json
python setup_gmail_auth.py
```

---

## 📁 Required Files

| File | Purpose | Get From |
|------|---------|----------|
| `credentials.json` | OAuth client secrets | Google Cloud Console |
| `token.json` | Auto-generated auth token | Created by setup script |

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Missing credentials | Download from Google Cloud Console |
| Token expired | Automatic refresh (no action needed) |
| Auth failed | Run `python setup_gmail_auth.py` |
| "API not enabled" | Enable Gmail API in Cloud Console |

---

## 📚 Full Documentation

- **Setup Guide**: `AUTO_AUTH_GUIDE.md`
- **Implementation Details**: `AUTH_IMPLEMENTATION_SUMMARY.md`
- **Main README**: `README.md`

---

## ✨ Key Features

✅ **One-time setup** - Authenticate once, never again  
✅ **Auto token refresh** - Expired tokens refresh automatically  
✅ **No auth headers** - Just call endpoints directly  
✅ **Instant startup** - Service ready when server starts  
✅ **Secure** - Tokens stored locally, never exposed  

---

## 🎯 What Happens Automatically?

```
Backend Starts
    ↓
Load token.json
    ↓
Token Valid? ──→ Yes ──→ ✅ Ready!
    ↓
   No
    ↓
Token Expired? ──→ Yes ──→ Auto Refresh ──→ ✅ Ready!
    ↓
   No
    ↓
First Time? ──→ Yes ──→ Open Browser ──→ Save Token ──→ ✅ Ready!
```

---

**Status**: 🟢 Automatic authentication is ACTIVE!

Run `python main.py` and everything works automatically.
