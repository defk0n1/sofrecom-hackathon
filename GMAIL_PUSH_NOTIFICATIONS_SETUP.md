# Gmail Push Notifications Setup Guide

## Overview

This guide will help you set up Gmail push notifications using Google Cloud Pub/Sub. Once configured, your application will receive real-time updates whenever new emails arrive in your Gmail inbox, instead of having to poll for changes.

## Architecture

```
Gmail Mailbox → Cloud Pub/Sub Topic → Your Backend Webhook → SQLite Database
```

When a new email arrives:
1. Gmail detects the change and publishes a notification to your Pub/Sub topic
2. Cloud Pub/Sub sends an HTTP POST to your webhook endpoint
3. Your backend processes the notification and fetches new emails
4. New emails are automatically saved to `email.db`

---

## Prerequisites

✅ You should already have:
- Gmail API enabled in your Google Cloud Project
- `credentials.json` file downloaded
- `token.json` created (from Gmail authentication)
- Backend server running

---

## Step-by-Step Setup

### Step 1: Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the same one you used for Gmail API)
3. Make sure billing is enabled for your project (required for Pub/Sub)

---

### Step 2: Enable Cloud Pub/Sub API

1. In the Cloud Console, navigate to **APIs & Services** → **Library**
2. Search for "**Cloud Pub/Sub API**"
3. Click on it and click **ENABLE**
4. Wait for the API to be enabled (takes a few seconds)

---

### Step 3: Create a Pub/Sub Topic

1. In the Cloud Console, navigate to **Pub/Sub** → **Topics**
   - Or go directly to: https://console.cloud.google.com/cloudpubsub/topic/list

2. Click **CREATE TOPIC**

3. Configure the topic:
   - **Topic ID**: `gmail-notifications` (you can choose any name)
   - Leave other settings as default
   - Click **CREATE**

4. **Note down your full topic name**:
   ```
   projects/YOUR-PROJECT-ID/topics/gmail-notifications
   ```
   Replace `YOUR-PROJECT-ID` with your actual Google Cloud Project ID

---

### Step 4: Grant Gmail Publishing Rights

Gmail needs permission to publish notifications to your topic.

1. On the **Topics** page, click on your topic (`gmail-notifications`)

2. Click the **PERMISSIONS** tab

3. Click **ADD PRINCIPAL**

4. In the "New principals" field, enter:
   ```
   gmail-api-push@system.gserviceaccount.com
   ```

5. In the "Role" dropdown, select:
   ```
   Pub/Sub → Pub/Sub Publisher
   ```

6. Click **SAVE**

**Important**: If you get a domain restriction error, you need to:
- Go to **IAM & Admin** → **Organization Policies**
- Find "Domain restricted sharing"
- Add `gmail-api-push@system.gserviceaccount.com` to the allowed service accounts

---

### Step 5: Create a Push Subscription (Webhook)

Now we'll configure Pub/Sub to send notifications to your backend.

#### 5.1 Make Your Backend Publicly Accessible

Your webhook needs to be accessible from the internet. Options:

**Option A: Use ngrok (Recommended for testing)**

1. Download ngrok from https://ngrok.com/download
2. Run your backend server:
   ```bash
   cd backend
   python main.py
   ```
3. In another terminal, start ngrok:
   ```bash
   ngrok http 5000
   ```
4. Copy the HTTPS forwarding URL (e.g., `https://abcd1234.ngrok.io`)

**Option B: Deploy to Cloud (Recommended for production)**
- Deploy to Google Cloud Run, AWS, Heroku, etc.
- Get your public HTTPS URL

#### 5.2 Create the Subscription

1. Go back to **Pub/Sub** → **Subscriptions**
   - Or: https://console.cloud.google.com/cloudpubsub/subscription/list

2. Click **CREATE SUBSCRIPTION**

3. Configure the subscription:
   - **Subscription ID**: `gmail-notifications-webhook`
   - **Select a Cloud Pub/Sub topic**: Choose your topic (`gmail-notifications`)
   - **Delivery type**: Select **Push**
   - **Endpoint URL**: Enter your webhook URL:
     ```
     https://YOUR-NGROK-URL.ngrok.io/pubsub/webhook
     ```
     OR
     ```
     https://your-domain.com/pubsub/webhook
     ```
   
4. **Expand "Retry policy"** (optional but recommended):
   - Set **Minimum backoff**: 10 seconds
   - Set **Maximum backoff**: 600 seconds

5. Click **CREATE**

---

### Step 6: Install Dependencies

Install the required Python package:

```bash
cd backend
pip install google-cloud-pubsub==2.26.1
```

Or install all requirements:

```bash
pip install -r requirements.txt
```

---

### Step 7: Start Your Backend

Make sure your backend is running:

```bash
cd backend
python main.py
```

You should see:
```
🚀 Starting MailMate AI Backend...
Gmail service initialized successfully!
```

The backend will be available at `http://localhost:5000`

---

### Step 8: Start Watching Your Gmail Mailbox

Now tell Gmail to start sending notifications to your Pub/Sub topic.

#### Using the API Endpoint

Send a POST request to start watching:

**Using curl:**
```bash
curl -X POST http://localhost:5000/pubsub/watch \
  -H "Content-Type: application/json" \
  -d '{
    "topic_name": "projects/YOUR-PROJECT-ID/topics/gmail-notifications",
    "label_ids": ["INBOX"],
    "label_filter_behavior": "INCLUDE"
  }'
```

**Using Python:**
```python
import requests

response = requests.post('http://localhost:5000/pubsub/watch', json={
    'topic_name': 'projects/YOUR-PROJECT-ID/topics/gmail-notifications',
    'label_ids': ['INBOX'],
    'label_filter_behavior': 'INCLUDE'
})

print(response.json())
```

**Using Postman:**
- Method: `POST`
- URL: `http://localhost:5000/pubsub/watch`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "topic_name": "projects/YOUR-PROJECT-ID/topics/gmail-notifications",
  "label_ids": ["INBOX"],
  "label_filter_behavior": "INCLUDE"
}
```

#### Expected Response

If successful, you'll get:
```json
{
  "status": "success",
  "history_id": "1234567890",
  "expiration": 1234567890000,
  "message": "Watch started successfully. You will receive notifications at your webhook endpoint."
}
```

You should also immediately receive a test notification at your webhook!

---

### Step 9: Test It!

#### 9.1 Send Yourself an Email

Send an email to your Gmail account from another account or email app.

#### 9.2 Check Your Backend Logs

You should see output like this:

```
============================================================
🔔 INCOMING PUBSUB NOTIFICATION
============================================================
📧 Email: your-email@gmail.com
📊 History ID: 9876543210

📥 Processing history changes from ID: 1234567890
  📧 New message detected: abc123xyz
  ✓ Saved email: Test Email Subject
✓ Processed 1 new email(s)
✅ Result: {'status': 'success', 'message': 'Processed 1 new email(s)', ...}
============================================================
```

#### 9.3 Verify Database

Check that the email was saved:

```bash
cd backend
python
```

```python
import sqlite3
conn = sqlite3.connect('db/email.db')
cursor = conn.cursor()
cursor.execute('SELECT subject, sender FROM emails ORDER BY received_date DESC LIMIT 5')
for row in cursor.fetchall():
    print(row)
conn.close()
```

---

## API Endpoints

### 1. Start Watch
```
POST /pubsub/watch
```

Request body:
```json
{
  "topic_name": "projects/your-project/topics/gmail-notifications",
  "label_ids": ["INBOX"],
  "label_filter_behavior": "INCLUDE"
}
```

### 2. Stop Watch
```
POST /pubsub/stop
```

No request body needed.

### 3. Check Status
```
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

### 4. Webhook Endpoint (for Pub/Sub)
```
POST /pubsub/webhook
```

This is called automatically by Cloud Pub/Sub. Don't call it manually.

### 5. Test Notification (for debugging)
```
POST /pubsub/test
```

Request body:
```json
{
  "emailAddress": "your-email@gmail.com",
  "historyId": "1234567890"
}
```

---

## Important Notes

### Watch Expiration

Gmail watch expires after **7 days**. You need to renew it regularly.

**Option 1: Manual Renewal**
- Call `/pubsub/watch` again every 7 days

**Option 2: Automated Renewal (Recommended)**
- Set up a cron job or scheduled task:

**Linux/Mac:**
```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * curl -X POST http://localhost:5000/pubsub/watch -H "Content-Type: application/json" -d '{"topic_name": "projects/YOUR-PROJECT-ID/topics/gmail-notifications"}'
```

**Windows (Task Scheduler):**
1. Open Task Scheduler
2. Create a new task that runs daily
3. Action: Start a program
   - Program: `curl.exe`
   - Arguments: `-X POST http://localhost:5000/pubsub/watch -H "Content-Type: application/json" -d "{\"topic_name\": \"projects/YOUR-PROJECT-ID/topics/gmail-notifications\"}"`

### Notification Rate Limit

- Maximum: 1 notification per second per user
- Any notifications above this rate will be dropped
- Design your system to handle this gracefully

### Reliability

- Notifications are usually delivered within seconds
- In rare cases, they may be delayed or dropped
- Implement a fallback: periodically check for new emails using `/gmail/emails`

### Cost

Cloud Pub/Sub pricing:
- First 10 GB/month: Free
- After that: ~$0.40 per GB
- For typical email notifications: **Less than $1/month**

---

## Troubleshooting

### Problem: Watch endpoint returns 400/403 error

**Solution:**
- Verify Gmail API is enabled
- Verify Pub/Sub API is enabled
- Check that `gmail-api-push@system.gserviceaccount.com` has Publisher role on your topic
- Make sure your project has billing enabled

### Problem: No notifications received

**Solution:**
1. Check webhook URL is publicly accessible:
   ```bash
   curl -X POST https://YOUR-URL/pubsub/webhook \
     -H "Content-Type: application/json" \
     -d '{"message":{"data":"eyJlbWFpbEFkZHJlc3MiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaGlzdG9yeUlkIjoiMTIzNDU2In0="}}'
   ```

2. Check Cloud Pub/Sub delivery attempts:
   - Go to Cloud Console → Pub/Sub → Subscriptions
   - Click on your subscription
   - Check the "Metrics" tab for errors

3. Verify watch is still active:
   ```bash
   curl http://localhost:5000/pubsub/status
   ```

### Problem: Duplicate emails in database

**Solution:**
- The code already checks for duplicates using email ID
- If you still see duplicates, check the `id` field in your database

### Problem: Backend crashes on notification

**Solution:**
1. Check backend logs for Python errors
2. Verify all dependencies are installed:
   ```bash
   pip install -r requirements.txt
   ```
3. Check database file permissions
4. Make sure `token.json` exists and is valid

---

## Security Best Practices

1. **HTTPS Only**: Always use HTTPS for your webhook endpoint
2. **Verify Requests**: In production, verify requests come from Google:
   ```python
   # Add to pubsub_router.py
   from google.cloud import pubsub_v1
   # Verify token/signature
   ```
3. **Environment Variables**: Store your topic name in `.env`:
   ```
   PUBSUB_TOPIC_NAME=projects/your-project/topics/gmail-notifications
   ```
4. **Rate Limiting**: Add rate limiting to your webhook endpoint
5. **Monitoring**: Set up logging and monitoring for production

---

## Advanced Configuration

### Watch Specific Labels

Watch only specific labels (e.g., IMPORTANT):
```json
{
  "topic_name": "projects/your-project/topics/gmail-notifications",
  "label_ids": ["IMPORTANT"],
  "label_filter_behavior": "INCLUDE"
}
```

### Watch Multiple Labels

```json
{
  "topic_name": "projects/your-project/topics/gmail-notifications",
  "label_ids": ["INBOX", "IMPORTANT"],
  "label_filter_behavior": "INCLUDE"
}
```

### Exclude Labels

```json
{
  "topic_name": "projects/your-project/topics/gmail-notifications",
  "label_ids": ["SPAM", "TRASH"],
  "label_filter_behavior": "EXCLUDE"
}
```

---

## Support

If you encounter issues:

1. Check the [Gmail API Documentation](https://developers.google.com/gmail/api/guides/push)
2. Check the [Cloud Pub/Sub Documentation](https://cloud.google.com/pubsub/docs)
3. Review backend logs for error messages
4. Test using the `/pubsub/test` endpoint
5. Verify your Cloud Console settings

---

## Summary Checklist

- [ ] Enable Cloud Pub/Sub API
- [ ] Create Pub/Sub topic
- [ ] Grant `gmail-api-push@system.gserviceaccount.com` Publisher role
- [ ] Create Push subscription with your webhook URL
- [ ] Install dependencies (`pip install -r requirements.txt`)
- [ ] Start backend server
- [ ] Call `/pubsub/watch` to start watching
- [ ] Send test email to verify
- [ ] Set up automatic watch renewal (every 7 days)
- [ ] Monitor logs and database

---

## Quick Reference

**Your Configuration:**
- Project ID: `YOUR-PROJECT-ID`
- Topic Name: `projects/YOUR-PROJECT-ID/topics/gmail-notifications`
- Subscription: `gmail-notifications-webhook`
- Webhook URL: `https://YOUR-URL/pubsub/webhook`
- Watch Expiration: 7 days
- Renewal: Required every 7 days

**Commands:**
```bash
# Start watch
curl -X POST http://localhost:5000/pubsub/watch -H "Content-Type: application/json" -d '{"topic_name": "projects/YOUR-PROJECT-ID/topics/gmail-notifications"}'

# Check status
curl http://localhost:5000/pubsub/status

# Stop watch
curl -X POST http://localhost:5000/pubsub/stop
```

---

**You're all set! Your backend will now automatically receive and save new emails to the database in real-time! 🎉**
