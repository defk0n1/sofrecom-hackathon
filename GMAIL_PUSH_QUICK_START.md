# Gmail Push Notifications - Quick Start

**⚡ 5-Minute Setup for Real-Time Email Notifications**

---

## What This Does

✅ Automatically saves new emails to your database  
✅ No polling required - instant notifications  
✅ Works in real-time when emails arrive

---

## Quick Setup Steps

### 1️⃣ Enable Cloud Pub/Sub API

1. Go to https://console.cloud.google.com/apis/library/pubsub.googleapis.com
2. Click **ENABLE**

### 2️⃣ Create Topic

1. Go to https://console.cloud.google.com/cloudpubsub/topic/list
2. Click **CREATE TOPIC**
3. Topic ID: `gmail-notifications`
4. Click **CREATE**
5. **Copy your full topic name**: `projects/supcom-474314/topics/gmail-notifications`

### 3️⃣ Grant Gmail Permission

1. Click on your topic → **PERMISSIONS** tab
2. Click **ADD PRINCIPAL**
3. Add: `gmail-api-push@system.gserviceaccount.com`
4. Role: `Pub/Sub Publisher`
5. Click **SAVE**

### 4️⃣ Create Webhook Subscription

**First, make your backend accessible:**

```bash
# Terminal 1: Start backend
cd backend
python main.py

# Terminal 2: Start ngrok
ngrok http 5000
# Copy the https URL (e.g., https://abc123.ngrok.io)
```

**Then create subscription:**

1. Go to https://console.cloud.google.com/cloudpubsub/subscription/list
2. Click **CREATE SUBSCRIPTION**
3. Subscription ID: `gmail-notifications-webhook`
4. Select topic: `gmail-notifications`
5. Delivery type: **Push**
6. Endpoint URL: `https://YOUR-NGROK-URL.ngrok.io/pubsub/webhook`
7. Click **CREATE**

### 5️⃣ Install Dependencies

```bash
cd backend
pip install google-cloud-pubsub==2.26.1
```

### 6️⃣ Start Watching Gmail

```bash
curl -X POST http://localhost:5000/pubsub/watch \
  -H "Content-Type: application/json" \
  -d '{"topic_name": "projects/supcom-474314/topics/gmail-notifications"}'
```

Replace `supcom-474314` with your actual project ID.

### 7️⃣ Test It!

Send yourself an email and watch the backend logs! 🎉

---

## Important: Watch Expires Every 7 Days

Renew weekly:
```bash
curl -X POST http://localhost:5000/pubsub/watch \
  -H "Content-Type: application/json" \
  -d '{"topic_name": "projects/supcom-474314/topics/gmail-notifications"}'
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/pubsub/watch` | POST | Start watching Gmail |
| `/pubsub/stop` | POST | Stop watching |
| `/pubsub/status` | GET | Check watch status |
| `/pubsub/webhook` | POST | Receive notifications (called by Google) |

---

## Troubleshooting

**No notifications?**
- Check ngrok is running
- Verify webhook URL in subscription
- Check backend logs
- Call `GET /pubsub/status` to verify watch is active

**Watch fails?**
- Enable billing on your GCP project
- Verify Pub/Sub API is enabled
- Check gmail-api-push has Publisher role

---

## What Happens When Email Arrives?

1. Gmail detects new email
2. Sends notification to Pub/Sub topic
3. Pub/Sub POSTs to your webhook (`/pubsub/webhook`)
4. Backend fetches email details from Gmail API
5. Email saved to `backend/db/email.db` automatically
6. You can query via `/emails/threads` API

---

**For full documentation, see:** `GMAIL_PUSH_NOTIFICATIONS_SETUP.md`
