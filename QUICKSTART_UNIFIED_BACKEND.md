# Quick Start - Unified Backend with Gmail

## TL;DR

Gmail services are now integrated into the main backend. Run one server instead of two!

## Start the Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Server runs at: `http://localhost:5000`

## Setup Gmail (First Time Only)

1. Get `credentials.json` from [Google Cloud Console](https://console.cloud.google.com/)
2. Place it in the `backend/` directory
3. Run OAuth flow:
```bash
curl -X POST http://localhost:5000/gmail/auth/gmail
```
4. Visit the returned URL to authenticate

## Use Gmail Endpoints

All Gmail features are at `http://localhost:5000/gmail/*`:

```bash
# Get emails
curl http://localhost:5000/gmail/emails \
  -H "Authorization: Bearer YOUR_TOKEN"

# Send email
curl -X POST http://localhost:5000/gmail/emails/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Hello",
    "body": "Test email"
  }'
```

## API Documentation

Visit `http://localhost:5000/docs` for interactive API documentation.

## What Changed?

- ✅ Gmail integrated into main backend
- ✅ Single server on port 5000
- ✅ No separate Gmail server needed
- ✅ Endpoints: `/gmail/*` instead of separate URL

## Need Help?

See `GMAIL_INTEGRATION_COMPLETE.md` for detailed documentation.
