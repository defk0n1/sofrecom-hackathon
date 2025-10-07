# 📧 Gmail Push Notifications - Complete Package

## 🎉 What You Have

You now have a **complete, production-ready Gmail push notification system** that:

✅ Receives real-time notifications when new emails arrive  
✅ Automatically fetches and saves emails to your database  
✅ No polling required - instant updates  
✅ Handles email threads, attachments, and metadata  
✅ Includes comprehensive documentation and testing tools  

---

## 📦 Package Contents

### Core Implementation (5 files)

| File | Purpose | Status |
|------|---------|--------|
| `backend/services/pubsub_service.py` | Notification processing & database operations | ✅ NEW |
| `backend/routers/pubsub_router.py` | API endpoints for push notifications | ✅ NEW |
| `backend/services/gmail_service.py` | Gmail API integration (updated) | ✅ UPDATED |
| `backend/main.py` | Main application (updated) | ✅ UPDATED |
| `backend/requirements.txt` | Dependencies (updated) | ✅ UPDATED |

### Documentation (4 files)

| File | Purpose | Audience |
|------|---------|----------|
| `GMAIL_PUSH_README.md` | Overview & navigation | Everyone |
| `GMAIL_PUSH_QUICK_START.md` | 5-minute setup guide | Quick setup |
| `GMAIL_PUSH_NOTIFICATIONS_SETUP.md` | Complete setup guide | Detailed setup |
| `GMAIL_PUSH_IMPLEMENTATION.md` | Technical documentation | Developers |

### Helper Tools (3 files)

| File | Purpose |
|------|---------|
| `backend/get_project_info.py` | Extract project configuration |
| `backend/verify_setup.py` | Verify setup before starting |
| `backend/test_push_notifications.py` | Test notification system |

---

## 🚀 Getting Started (Choose Your Path)

### Path 1: Quick Start (5 minutes) ⚡

```bash
# 1. Run verification
cd backend
python verify_setup.py

# 2. Get your project info
python get_project_info.py

# 3. Follow quick start guide
# Open: GMAIL_PUSH_QUICK_START.md
```

### Path 2: Detailed Setup (15 minutes) 📚

```bash
# Open: GMAIL_PUSH_NOTIFICATIONS_SETUP.md
# Follow step-by-step instructions
```

### Path 3: Developer Deep Dive (30 minutes) 💻

```bash
# Read: GMAIL_PUSH_IMPLEMENTATION.md
# Understand architecture and code
```

---

## ⚙️ Installation

### 1. Install Dependencies

```bash
cd backend
pip install google-cloud-pubsub==2.26.1
# OR
pip install -r requirements.txt
```

### 2. Verify Setup

```bash
python verify_setup.py
```

### 3. Get Project Configuration

```bash
python get_project_info.py
```

---

## 🌐 Cloud Console Setup (Required)

### Quick Checklist

- [ ] Enable Cloud Pub/Sub API
- [ ] Create topic: `gmail-notifications`
- [ ] Grant `gmail-api-push@system.gserviceaccount.com` Publisher role
- [ ] Create Push subscription with webhook URL
- [ ] Enable billing (required for Pub/Sub)

**Detailed instructions:** See `GMAIL_PUSH_NOTIFICATIONS_SETUP.md`

---

## 🎯 Start Watching Gmail

### Option 1: Using curl

```bash
curl -X POST http://localhost:5000/pubsub/watch \
  -H "Content-Type: application/json" \
  -d '{
    "topic_name": "projects/YOUR-PROJECT-ID/topics/gmail-notifications",
    "label_ids": ["INBOX"]
  }'
```

### Option 2: Using Python

```python
import requests

response = requests.post('http://localhost:5000/pubsub/watch', json={
    'topic_name': 'projects/YOUR-PROJECT-ID/topics/gmail-notifications',
    'label_ids': ['INBOX']
})

print(response.json())
```

### Option 3: Using Postman

- Method: `POST`
- URL: `http://localhost:5000/pubsub/watch`
- Headers: `Content-Type: application/json`
- Body:
  ```json
  {
    "topic_name": "projects/YOUR-PROJECT-ID/topics/gmail-notifications",
    "label_ids": ["INBOX"]
  }
  ```

---

## 🧪 Testing

### Quick Test

```bash
cd backend
python test_push_notifications.py
```

### Manual Tests

```bash
# 1. Check status
curl http://localhost:5000/pubsub/status

# 2. Send test notification
curl -X POST http://localhost:5000/pubsub/test \
  -H "Content-Type: application/json" \
  -d '{"emailAddress": "test@example.com", "historyId": "123"}'

# 3. Send yourself a real email and check logs!
```

---

## 📊 API Reference

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/pubsub/webhook` | POST | Receive notifications (called by Google) |
| `/pubsub/watch` | POST | Start watching Gmail mailbox |
| `/pubsub/stop` | POST | Stop watching |
| `/pubsub/status` | GET | Get watch status |
| `/pubsub/test` | POST | Test notification manually |

### Start Watch

```bash
POST /pubsub/watch
Content-Type: application/json

{
  "topic_name": "projects/YOUR-PROJECT/topics/gmail-notifications",
  "label_ids": ["INBOX"],
  "label_filter_behavior": "INCLUDE"
}
```

Response:
```json
{
  "status": "success",
  "history_id": "1234567890",
  "expiration": 1234567890000,
  "message": "Watch started successfully..."
}
```

### Check Status

```bash
GET /pubsub/status
```

Response:
```json
{
  "status": "active",
  "history_id": "1234567890",
  "expiration": 1234567890000,
  "last_updated": "2025-01-07T10:30:00"
}
```

---

## 📁 Database Schema

### New: `watch_state` table

```sql
CREATE TABLE watch_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    history_id TEXT NOT NULL,
    expiration BIGINT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Updated: `emails` table

Automatically populated with new emails:

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

## 🔄 How It Works

```
┌──────────────┐
│ Gmail Inbox  │  New email arrives
└──────┬───────┘
       │
       ↓ Gmail detects change
       │
┌──────────────────────┐
│ Gmail API            │  Publishes notification
│ watch()              │
└──────┬───────────────┘
       │
       ↓ HTTP POST
       │
┌──────────────────────┐
│ Cloud Pub/Sub Topic  │  Routes notification
│ gmail-notifications  │
└──────┬───────────────┘
       │
       ↓ HTTP POST
       │
┌──────────────────────┐
│ Your Backend         │  /pubsub/webhook
│ localhost:5000       │
└──────┬───────────────┘
       │
       ↓ Process notification
       │
┌──────────────────────┐
│ PubSubService        │  Fetch email details
│ handle_notification()│
└──────┬───────────────┘
       │
       ↓ Save to database
       │
┌──────────────────────┐
│ SQLite Database      │  Email saved!
│ email.db             │
└──────────────────────┘
```

---

## ⚠️ Important Notes

### Watch Expiration
- **Expires after 7 days**
- Must be renewed regularly
- Set up automated renewal (cron/scheduled task)

### Rate Limits
- Max 1 notification/second per user
- Exceeding this rate may drop notifications

### Costs
- Cloud Pub/Sub: ~$1/month for typical usage
- First 10 GB/month: FREE

---

## 🔧 Troubleshooting

### Quick Diagnostics

```bash
# Run all checks
cd backend
python verify_setup.py

# Test notifications
python test_push_notifications.py

# Check status
curl http://localhost:5000/pubsub/status
```

### Common Issues

| Problem | Solution |
|---------|----------|
| Backend not running | `python main.py` |
| Dependencies missing | `pip install -r requirements.txt` |
| Watch returns 403 | Enable billing on GCP project |
| No notifications | Check webhook URL is accessible |
| Database error | Check file permissions |

**Full troubleshooting:** See `GMAIL_PUSH_NOTIFICATIONS_SETUP.md`

---

## 🎓 Documentation Map

Choose the right guide for your needs:

```
Start Here
    ↓
┌─────────────────────────────────┐
│ GMAIL_PUSH_README.md           │  ← Overview (you are here)
└─────────────────────────────────┘
    ↓
    ├─→ Quick Setup? ────→ GMAIL_PUSH_QUICK_START.md
    │
    ├─→ Detailed Setup? ─→ GMAIL_PUSH_NOTIFICATIONS_SETUP.md
    │
    └─→ Developer Docs? ─→ GMAIL_PUSH_IMPLEMENTATION.md

Helper Tools:
    • backend/get_project_info.py
    • backend/verify_setup.py
    • backend/test_push_notifications.py
```

---

## 📋 Setup Checklist

### Prerequisites
- [ ] Gmail API enabled
- [ ] credentials.json downloaded
- [ ] token.json created (authenticated)
- [ ] Backend running

### Cloud Setup
- [ ] Cloud Pub/Sub API enabled
- [ ] Billing enabled on project
- [ ] Topic created: `gmail-notifications`
- [ ] Permission granted to `gmail-api-push@system.gserviceaccount.com`
- [ ] Push subscription created with webhook URL

### Backend Setup
- [ ] Dependencies installed
- [ ] Files verified (`verify_setup.py`)
- [ ] Configuration obtained (`get_project_info.py`)
- [ ] Tests passed (`test_push_notifications.py`)

### Go Live
- [ ] Watch started (`/pubsub/watch`)
- [ ] Test email sent
- [ ] Database updated
- [ ] Logs verified
- [ ] Renewal automation set up

---

## 🎯 Success Criteria

You'll know it's working when:

✅ `verify_setup.py` shows all checks passed  
✅ `test_push_notifications.py` shows all tests passed  
✅ `/pubsub/status` returns `"status": "active"`  
✅ Test email appears in backend logs within seconds  
✅ New email appears in `email.db`  
✅ `/emails/threads` API returns the new email  

---

## 🚀 Next Steps After Setup

1. **Test thoroughly**
   - Send multiple test emails
   - Verify database updates
   - Check thread grouping

2. **Set up automation**
   - Configure watch renewal (every 7 days)
   - Set up monitoring/alerts
   - Configure backup strategy

3. **Production deployment**
   - Deploy webhook to production server
   - Enable HTTPS
   - Add request verification
   - Set up logging

4. **Integration**
   - Connect frontend to `/emails/threads` API
   - Add real-time UI updates
   - Implement email actions (reply, forward, etc.)

---

## 🔐 Security Best Practices

### For Development
- ✅ Use ngrok for local testing
- ✅ Keep credentials.json private
- ✅ Don't commit token.json to git

### For Production
- ✅ Use HTTPS for webhook endpoint
- ✅ Implement request signature verification
- ✅ Store secrets in environment variables
- ✅ Add rate limiting
- ✅ Enable logging and monitoring
- ✅ Regular security audits

---

## 💡 Pro Tips

1. **Use ngrok for local testing**
   ```bash
   ngrok http 5000
   ```

2. **Monitor Cloud Console regularly**
   - Check Pub/Sub metrics
   - Review delivery errors
   - Monitor costs

3. **Set up automated renewal**
   - Create cron job/scheduled task
   - Run daily to ensure watch never expires

4. **Keep backups**
   - Regularly backup `email.db`
   - Export important emails
   - Document your configuration

5. **Test before production**
   - Use test email accounts
   - Verify all edge cases
   - Load test with multiple emails

---

## 📞 Support & Resources

### Documentation
- Quick Start: `GMAIL_PUSH_QUICK_START.md`
- Full Setup: `GMAIL_PUSH_NOTIFICATIONS_SETUP.md`
- Technical Docs: `GMAIL_PUSH_IMPLEMENTATION.md`

### Helper Tools
```bash
python get_project_info.py      # Get configuration
python verify_setup.py          # Verify setup
python test_push_notifications.py  # Test system
```

### External Resources
- [Gmail API Docs](https://developers.google.com/gmail/api/guides/push)
- [Cloud Pub/Sub Docs](https://cloud.google.com/pubsub/docs)
- [Google Cloud Console](https://console.cloud.google.com/)

---

## 🎉 You're Ready!

Everything is set up and ready to go. Choose your path:

### 🏃 I want to start NOW
→ Run: `python get_project_info.py`  
→ Read: `GMAIL_PUSH_QUICK_START.md`

### 📚 I want detailed instructions
→ Read: `GMAIL_PUSH_NOTIFICATIONS_SETUP.md`

### 💻 I want to understand the code
→ Read: `GMAIL_PUSH_IMPLEMENTATION.md`

---

**Made with ❤️ for MailMate AI**

**Questions?** Check the documentation or run the verification scripts!

**Ready to go live?** Follow the quick start guide!

**Need help?** Review the troubleshooting section!

---

## 📊 Quick Reference Card

```
PROJECT ID: Check credentials.json
TOPIC NAME: projects/YOUR-PROJECT/topics/gmail-notifications
WEBHOOK URL: https://YOUR-DOMAIN/pubsub/webhook

Commands:
  Start watch: curl -X POST localhost:5000/pubsub/watch ...
  Stop watch:  curl -X POST localhost:5000/pubsub/stop
  Check status: curl localhost:5000/pubsub/status
  
Helper Scripts:
  python get_project_info.py
  python verify_setup.py
  python test_push_notifications.py

Important:
  - Watch expires every 7 days (renew!)
  - Max 1 notification/second
  - Cost: ~$1/month
```

---

**🚀 Ready to receive real-time Gmail notifications!**
