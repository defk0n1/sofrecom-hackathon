# Gmail Auto-Authentication Setup Guide

## Overview

MailMate AI now features **automatic Gmail authentication**! Once set up, the system will:
- ✅ Auto-authenticate on server startup
- ✅ Auto-refresh expired tokens
- ✅ Work seamlessly without manual login prompts
- ✅ No need for Bearer tokens in API requests

## Quick Setup (First Time Only)

### Step 1: Get Gmail API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API:
   - Navigate to "APIs & Services" > "Library"
   - Search "Gmail API" and click Enable
4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Desktop app" as application type
   - Download the credentials file

### Step 2: Configure OAuth Consent Screen (if needed)

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" for user type
3. Fill required fields:
   - App name: "MailMate AI"
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `gmail.readonly`
   - `gmail.send`
   - `gmail.modify`
   - `gmail.labels`
5. Add test users (yourself) if app is in testing mode

### Step 3: Install Credentials

```bash
cd backend
# Place your downloaded credentials file as credentials.json
```

### Step 4: Run One-Time Authentication

```bash
# Option 1: Use the setup script
python setup_gmail_auth.py

# Option 2: Just start the server (it will auto-authenticate)
python main.py
```

A browser window will open. Follow these steps:
1. Select your Google account
2. Click "Allow" to grant Gmail access
3. You'll see "Authentication successful!" in the terminal

**That's it!** 🎉 The authentication token is saved to `token.json`

## How It Works

### Automatic Authentication Flow

```
1. Server Starts
   ↓
2. Gmail Service Initializes
   ↓
3. Check for token.json
   ├─ Exists? → Load token
   │  ├─ Valid? → ✅ Ready to use
   │  └─ Expired? → Auto-refresh → ✅ Ready to use
   └─ Missing? → Open browser for one-time auth → Save token → ✅ Ready to use
```

### Token Management

- **token.json** stores your OAuth credentials
- Tokens are automatically refreshed when expired
- No manual intervention needed after initial setup
- Tokens are stored locally and securely

## Using the API

### No Authentication Headers Required!

Before (Manual):
```typescript
// Had to manage tokens manually
fetch('/emails', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
})
```

After (Automatic):
```typescript
// Just call the endpoint!
fetch('/emails')
```

All authentication is handled transparently by the backend.

## API Endpoints (No Auth Headers Needed)

```bash
# Get emails
GET http://localhost:5000/emails?max_results=10

# Get specific email
GET http://localhost:5000/emails/{email_id}

# Send email
POST http://localhost:5000/emails/send
{
  "to": "recipient@example.com",
  "subject": "Hello",
  "body": "Hi there!"
}

# Reply to email
POST http://localhost:5000/emails/{email_id}/reply
{
  "body": "Thanks for your email!"
}

# Check authentication status
GET http://localhost:5000/health
```

## Troubleshooting

### "credentials.json not found"

**Solution**: Download OAuth credentials from Google Cloud Console and place in `backend/` directory

### "Authentication failed"

**Possible causes:**
1. Gmail API not enabled → Enable it in Google Cloud Console
2. OAuth consent screen not configured → Complete the consent screen setup
3. Not added as test user → Add yourself in OAuth consent screen > Test users

**Fix**: Run `python setup_gmail_auth.py` again

### "Token refresh failed"

**Solution**: Delete `token.json` and re-authenticate:
```bash
rm token.json
python setup_gmail_auth.py
```

### "Access blocked: This app's request is invalid"

**Solution**: 
1. Verify redirect URI is set correctly in Google Cloud Console
2. Add: `http://localhost` as authorized redirect URI
3. Ensure app is published or you're added as test user

## Security Best Practices

✅ **DO:**
- Keep `credentials.json` and `token.json` secure
- Add them to `.gitignore` (already done)
- Only share credentials.json with trusted developers
- Use separate projects for dev/prod environments

❌ **DON'T:**
- Commit credentials to git
- Share tokens publicly
- Use production credentials in development

## Testing Authentication

```bash
# Test if authentication works
python -c "from services.gmail_service import GmailService; s=GmailService(); print('✅ Auth OK!')"

# Check server health
curl http://localhost:5000/health

# Get your emails
curl http://localhost:5000/emails?max_results=5
```

## Development Tips

### Reset Authentication
```bash
rm token.json
python setup_gmail_auth.py
```

### Check Token Expiry
Token automatically refreshes, but you can check status:
```bash
curl http://localhost:5000/health
```

### Multiple Accounts
To switch Gmail accounts:
1. Delete `token.json`
2. Run setup script
3. Authenticate with different account

## What Changed?

### Before (Manual Auth Flow)
- ❌ Required manual OAuth flow for each session
- ❌ Frontend needed to manage tokens
- ❌ Bearer tokens in every request
- ❌ Complex token refresh logic

### After (Automatic Auth Flow)
- ✅ One-time setup
- ✅ Auto token refresh
- ✅ No auth headers needed
- ✅ Works immediately on server start

## Support

If you encounter issues:

1. Check `credentials.json` exists and is valid
2. Verify Gmail API is enabled
3. Run health check: `GET /health`
4. Check server logs for detailed errors
5. Try re-authenticating: `python setup_gmail_auth.py`

## Files Structure

```
backend/
├── credentials.json      # OAuth credentials (from Google)
├── token.json           # Auto-generated auth token
├── setup_gmail_auth.py  # Setup script
├── services/
│   └── gmail_service.py # Auto-authentication logic
└── routers/
    └── gmail_router.py  # No-auth endpoints
```

---

**Status**: ✅ Automatic authentication is now active!

The Gmail service will initialize automatically when you start the backend server. No manual authentication required after initial setup.
