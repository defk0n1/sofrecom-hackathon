# 📬 Gmail Push Notifications - Complete Implementation

## 🎯 Overview

This implementation provides **real-time Gmail push notifications** for your MailMate AI backend. New emails are automatically detected and saved to your database within seconds of arrival - no polling required!

---

## ✨ What's Included

### 📁 Core Implementation Files

1. **`backend/services/pubsub_service.py`** (NEW)
   - Handles Pub/Sub notifications
   - Processes email history changes
   - Saves emails to database
   - Manages watch state

2. **`backend/routers/pubsub_router.py`** (NEW)
   - FastAPI endpoints for push notifications
   - Webhook endpoint (`/pubsub/webhook`)
   - Watch management (`/pubsub/watch`, `/pubsub/stop`)
   - Status checking (`/pubsub/status`)

3. **`backend/services/gmail_service.py`** (UPDATED)
   - Added `watch_mailbox()` method
   - Added `stop_watch()` method

4. **`backend/main.py`** (UPDATED)
   - Registered pubsub router
   - Added new endpoints

5. **`backend/requirements.txt`** (UPDATED)
   - Added `google-cloud-pubsub==2.26.1`

### 📖 Documentation Files

1. **`GMAIL_PUSH_NOTIFICATIONS_SETUP.md`**
   - Complete step-by-step setup guide
   - Troubleshooting section
   - Security best practices
   - Advanced configuration

2. **`GMAIL_PUSH_QUICK_START.md`**
   - 5-minute quick start guide
   - Essential steps only
   - Quick troubleshooting

3. **`GMAIL_PUSH_IMPLEMENTATION.md`**
   - Technical implementation details
   - Architecture diagrams
   - Database schema
   - Testing procedures

4. **`GMAIL_PUSH_README.md`** (this file)
   - Overview and quick navigation

### 🛠️ Helper Tools

1. **`backend/get_project_info.py`**
   - Extract project ID from credentials
   - Generate configuration commands
   - Show setup URLs

---

## 🚀 Quick Start

### Option 1: Super Quick (5 minutes)

Follow **`GMAIL_PUSH_QUICK_START.md`**

```bash
# 1. Enable Pub/Sub API
# 2. Create topic: gmail-notifications
# 3. Grant gmail-api-push@system.gserviceaccount.com Publisher role
# 4. Create push subscription with your webhook URL
# 5. Install dependencies
pip install google-cloud-pubsub==2.26.1

# 6. Get your project info
cd backend
python get_project_info.py

# 7. Start watching
curl -X POST http://localhost:5000/pubsub/watch \
  -H "Content-Type: application/json" \
  -d '{"topic_name": "projects/YOUR-PROJECT-ID/topics/gmail-notifications"}'
```

### Option 2: Detailed Setup (15 minutes)

Follow **`GMAIL_PUSH_NOTIFICATIONS_SETUP.md`** for comprehensive guide

---

## 📊 How It Works

```
Gmail Inbox → Pub/Sub Topic → Your Webhook → Database
  (new mail)      (notify)      (fetch+save)    (emails.db)
```

1. **Gmail** detects new email and publishes notification to Pub/Sub
2. **Cloud Pub/Sub** sends HTTP POST to your webhook endpoint
3. **Your backend** receives notification, fetches email details, saves to database
4. **Database** now contains the new email, accessible via `/emails/threads`

---

## 🎛️ API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/pubsub/webhook` | POST | Webhook for receiving notifications |
| `/pubsub/watch` | POST | Start watching Gmail mailbox |
| `/pubsub/stop` | POST | Stop watching |
| `/pubsub/status` | GET | Get current watch status |
| `/pubsub/test` | POST | Test notification processing |

---

## ⚙️ Configuration Steps Summary

### Cloud Console Setup

1. **Enable APIs**
   - Cloud Pub/Sub API

2. **Create Resources**
   - Topic: `gmail-notifications`
   - Subscription: `gmail-notifications-webhook` (Push)

3. **Grant Permissions**
   - Service account: `gmail-api-push@system.gserviceaccount.com`
   - Role: `Pub/Sub Publisher`

### Backend Setup

1. **Install Dependencies**
   ```bash
   pip install google-cloud-pubsub==2.26.1
   ```

2. **Make Webhook Public**
   - Use ngrok for testing: `ngrok http 5000`
   - Use Cloud Run/AWS/Heroku for production

3. **Start Watch**
   ```bash
   curl -X POST http://localhost:5000/pubsub/watch \
     -H "Content-Type: application/json" \
     -d '{"topic_name": "projects/YOUR-PROJECT/topics/gmail-notifications"}'
   ```

---

## 📝 Database Schema

### New Table: `watch_state`

Automatically created when first notification is received:

```sql
CREATE TABLE watch_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    history_id TEXT NOT NULL,
    expiration BIGINT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Existing Table: `emails`

New emails are automatically inserted:

```sql
CREATE TABLE emails (
    id TEXT PRIMARY KEY,
    sender TEXT,
    recipients TEXT,
    subject TEXT,
    body TEXT,
    received_date DATETIME,
    thread_id TEXT,
    is_reply INTEGER DEFAULT 0,
    attachments TEXT
)
```

---

## 🧪 Testing

### 1. Get Your Configuration
```bash
cd backend
python get_project_info.py
```

### 2. Check Status
```bash
curl http://localhost:5000/pubsub/status
```

### 3. Send Test Email
Send yourself an email and watch the logs!

### 4. Verify Database
```python
import sqlite3
conn = sqlite3.connect('backend/db/email.db')
cursor = conn.cursor()
cursor.execute('SELECT subject, sender FROM emails ORDER BY received_date DESC LIMIT 5')
for row in cursor.fetchall():
    print(row)
conn.close()
```

---

## ⚠️ Important Notes

### Watch Expiration
- Gmail watch expires after **7 days**
- Must renew by calling `/pubsub/watch` again
- Set up automated renewal (cron job/scheduled task)

### Notification Rate
- Max: 1 notification/second per user
- Excessive notifications may be dropped

### Costs
- Cloud Pub/Sub: ~$1/month for typical usage
- First 10 GB/month: FREE

---

## 🔧 Troubleshooting

### No Notifications?

1. **Check webhook is accessible**
   ```bash
   curl https://your-webhook-url.com/pubsub/webhook
   ```

2. **Verify watch is active**
   ```bash
   curl http://localhost:5000/pubsub/status
   ```

3. **Check Cloud Console**
   - Pub/Sub → Subscriptions → Your subscription → Metrics
   - Look for delivery errors

4. **Check backend logs**
   - Look for error messages
   - Verify token.json exists

### Common Issues

| Problem | Solution |
|---------|----------|
| 403 error on watch | Enable billing on GCP project |
| Webhook 404 | Verify ngrok is running and URL is correct |
| No history ID | Call `/pubsub/watch` to initialize |
| Duplicate emails | Already handled - checks for existing IDs |

See **`GMAIL_PUSH_NOTIFICATIONS_SETUP.md`** for detailed troubleshooting.

---

## 📚 Documentation Map

Choose your path:

- **🏃 New User?** → Start with `GMAIL_PUSH_QUICK_START.md`
- **🔍 Want Details?** → Read `GMAIL_PUSH_NOTIFICATIONS_SETUP.md`
- **💻 Developer?** → Check `GMAIL_PUSH_IMPLEMENTATION.md`
- **❓ Questions?** → See troubleshooting in setup guide

---

## 🎯 Next Steps

After setup:

1. ✅ Send yourself a test email
2. ✅ Verify it appears in database
3. ✅ Set up watch renewal automation
4. ✅ Deploy webhook to production
5. ✅ Add monitoring/alerting
6. ✅ Implement request verification (production)

---

## 📞 Getting Help

1. Check the documentation files
2. Review backend logs for errors
3. Test with `/pubsub/test` endpoint
4. Check Cloud Console Pub/Sub metrics
5. Verify your credentials and tokens

---

## 🎉 Success Criteria

You'll know it's working when:

- ✅ `/pubsub/status` shows "active"
- ✅ Test email triggers console logs
- ✅ New emails appear in database
- ✅ `/emails/threads` returns new emails

---

## 📦 File Structure

```
Sofrecom/
├── backend/
│   ├── services/
│   │   ├── pubsub_service.py        ← NEW: Notification handler
│   │   └── gmail_service.py         ← UPDATED: Added watch methods
│   ├── routers/
│   │   └── pubsub_router.py         ← NEW: API endpoints
│   ├── db/
│   │   └── email.db                 ← UPDATED: New watch_state table
│   ├── main.py                      ← UPDATED: Router registered
│   ├── requirements.txt             ← UPDATED: Added pubsub
│   └── get_project_info.py          ← NEW: Helper script
├── GMAIL_PUSH_NOTIFICATIONS_SETUP.md  ← Complete guide
├── GMAIL_PUSH_QUICK_START.md         ← Quick start
├── GMAIL_PUSH_IMPLEMENTATION.md      ← Technical details
└── GMAIL_PUSH_README.md              ← This file
```

---

## 🔐 Security Checklist

For Production:

- [ ] Use HTTPS for webhook endpoint
- [ ] Implement request signature verification
- [ ] Store topic name in environment variables
- [ ] Add rate limiting to webhook
- [ ] Set up logging and monitoring
- [ ] Enable Cloud Pub/Sub authentication
- [ ] Review IAM permissions regularly

---

## 💡 Tips

- **Development**: Use ngrok for local testing
- **Production**: Deploy to Cloud Run, AWS Lambda, or similar
- **Monitoring**: Set up alerts for failed deliveries
- **Backup**: Periodically backup `email.db`
- **Testing**: Use `/pubsub/test` endpoint before going live

---

**🎊 You're all set! Your backend will now automatically receive and save new Gmail emails in real-time!**

**Start with:** `GMAIL_PUSH_QUICK_START.md`
