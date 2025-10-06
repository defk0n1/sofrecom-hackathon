# Gmail Service Integration - Complete Guide

## Overview

The Gmail services have been successfully integrated into the main MailMate AI Backend. You no longer need to run a separate server for Gmail functionality. All Gmail operations are now available through the unified backend API.

## What Changed

### 1. **Services Integrated**
- Gmail service from `app/gmail_service.py` → `backend/services/gmail_service.py`
- Gmail models from `app/models.py` → `backend/models/gmail_models.py`

### 2. **New Router Added**
- Created `backend/routers/gmail.py` with all Gmail endpoints
- Integrated into main backend via `backend/main.py`

### 3. **Dependencies Updated**
Added to `backend/requirements.txt`:
- `google-api-python-client==2.184.0`
- `google-auth-httplib2==0.2.0`
- `google-auth-oauthlib==1.2.0`
- `python-dotenv==1.0.0`
- `email-validator==2.1.0`

## Running the Unified Backend

### Prerequisites
1. Python 3.8 or higher
2. Gmail API credentials (`credentials.json`)
3. Required environment variables (if any)

### Setup Steps

1. **Install Dependencies**
```bash
cd backend
pip install -r requirements.txt
```

2. **Set Up Gmail API Credentials**
   - Follow the setup guide in `GMAIL_API_README.md` to obtain `credentials.json`
   - Place `credentials.json` in the `backend/` directory

3. **Start the Backend Server**
```bash
cd backend
python main.py
```

The server will start on `http://localhost:5000` (or the port specified in your configuration).

## Available Gmail Endpoints

All Gmail endpoints are now available under the `/gmail` prefix:

### Authentication
- `POST /gmail/auth/gmail` - Initiate Gmail OAuth authentication
- `GET /gmail/auth/callback` - Handle OAuth callback

### Email Operations
- `GET /gmail/emails` - Get list of emails (supports pagination and query)
- `GET /gmail/emails/{email_id}` - Get detailed email information
- `POST /gmail/emails/send` - Send a new email
- `POST /gmail/emails/{email_id}/reply` - Reply to an email
- `POST /gmail/emails/{email_id}/forward` - Forward an email
- `DELETE /gmail/emails/{email_id}` - Delete an email

### Email Management
- `POST /gmail/emails/{email_id}/mark-read` - Mark email as read
- `POST /gmail/emails/{email_id}/mark-unread` - Mark email as unread
- `GET /gmail/labels` - Get all Gmail labels
- `POST /gmail/emails/{email_id}/add-label` - Add label to email
- `DELETE /gmail/emails/{email_id}/remove-label` - Remove label from email

### Health Check
- `GET /gmail/` - Gmail service root endpoint
- `GET /gmail/health` - Gmail service health check

## API Usage Examples

### 1. Get Emails
```bash
curl -X GET "http://localhost:5000/gmail/emails?max_results=10&query=is:unread" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "status": "success",
  "emails": [
    {
      "id": "18f2c3d4e5f6g7h8",
      "threadId": "18f2c3d4e5f6g7h8",
      "from": "sender@example.com",
      "subject": "Important Message",
      "date": "Mon, 6 Jan 2025 10:30:00 -0800",
      "snippet": "This is a preview of the email..."
    }
  ]
}
```

### 2. Send Email
```bash
curl -X POST "http://localhost:5000/gmail/emails/send" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Test Email",
    "body": "This is a test email from the integrated backend.",
    "cc": ["cc@example.com"],
    "bcc": ["bcc@example.com"]
  }'
```

Response:
```json
{
  "status": "success",
  "message": "Email sent successfully",
  "message_id": "18f2c3d4e5f6g7h8"
}
```

### 3. Reply to Email
```bash
curl -X POST "http://localhost:5000/gmail/emails/{email_id}/reply" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Thank you for your email. I will respond shortly."
  }'
```

### 4. Mark Email as Read
```bash
curl -X POST "http://localhost:5000/gmail/emails/{email_id}/mark-read" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Frontend Integration

Update your frontend to use the new unified endpoint:

### Before (Separate Gmail Server)
```javascript
const gmailAPI = 'http://localhost:8000';
const backendAPI = 'http://localhost:5000';

// Different base URLs for different services
fetch(`${gmailAPI}/emails`);
fetch(`${backendAPI}/ai/process`);
```

### After (Unified Backend)
```javascript
const API_BASE = 'http://localhost:5000';

// All services through one backend
fetch(`${API_BASE}/gmail/emails`);
fetch(`${API_BASE}/ai/process`);
```

### Example React/TypeScript Integration
```typescript
// api/mailmate.ts
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const mailmateAPI = {
  // Gmail operations
  async getEmails(maxResults = 10, query = '') {
    const response = await fetch(
      `${API_BASE_URL}/gmail/emails?max_results=${maxResults}&query=${query}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.json();
  },

  async sendEmail(emailData) {
    const response = await fetch(`${API_BASE_URL}/gmail/emails/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(emailData)
    });
    return response.json();
  },

  // AI operations
  async processEmail(emailContent) {
    const response = await fetch(`${API_BASE_URL}/ai/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailContent)
    });
    return response.json();
  }
};
```

## Testing the Integration

### 1. Test Backend Health
```bash
# Test main backend
curl http://localhost:5000/health

# Test Gmail service
curl http://localhost:5000/gmail/health
```

### 2. Test All Services
```bash
# Get all available endpoints
curl http://localhost:5000/

# Response includes Gmail endpoints
{
  "message": "MailMate AI Backend",
  "status": "active",
  "endpoints": {
    ...
    "gmail_emails": "/gmail/emails",
    "gmail_send": "/gmail/emails/send",
    "gmail_auth": "/gmail/auth/gmail"
  }
}
```

### 3. Interactive API Documentation
Visit `http://localhost:5000/docs` for Swagger UI documentation with all endpoints including Gmail.

## Authentication Setup

### First-Time Gmail Authentication

1. **Start the backend**:
```bash
cd backend
python main.py
```

2. **Initiate OAuth flow**:
```bash
curl -X POST http://localhost:5000/gmail/auth/gmail
```

3. **Follow the returned auth URL** to authenticate with Google

4. **The backend will handle the callback** and save credentials to `token.json`

### Subsequent Usage

Once authenticated, the `token.json` file will be used automatically for all Gmail operations. The backend will refresh expired tokens automatically.

## Configuration

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Backend Configuration
PORT=5000
HOST=0.0.0.0

# Gmail API (optional - can use credentials.json)
GMAIL_CREDENTIALS_PATH=./credentials.json
GMAIL_TOKEN_PATH=./token.json

# Gemini AI (if using AI features)
GEMINI_API_KEY=your_gemini_api_key_here
```

### Credentials Files

Both files should be in the `backend/` directory:
- `credentials.json` - OAuth client credentials from Google Cloud Console
- `token.json` - Generated after successful authentication (auto-created)

## Troubleshooting

### Issue: "credentials.json not found"
**Solution**: Download OAuth credentials from Google Cloud Console and place in `backend/` directory.

### Issue: "token.json not found" or authentication errors
**Solution**: Run the OAuth flow again:
```bash
curl -X POST http://localhost:5000/gmail/auth/gmail
```
Then visit the returned URL to re-authenticate.

### Issue: Import errors
**Solution**: Ensure all dependencies are installed:
```bash
cd backend
pip install -r requirements.txt
```

### Issue: "Module not found" for Gmail services
**Solution**: Make sure you're running from the `backend/` directory:
```bash
cd backend
python main.py
```

## Migration Guide

If you were previously running the separate Gmail server:

### 1. Stop the Separate Gmail Server
```bash
# No longer needed - can be shut down
# Old: uvicorn app.main:app --port 8000
```

### 2. Update Frontend Configuration
Change all Gmail API calls from port 8000 to port 5000 (or your backend port):
```javascript
// Old
const GMAIL_API = 'http://localhost:8000';

// New
const GMAIL_API = 'http://localhost:5000/gmail';
```

### 3. Update CORS Settings (if needed)
The main backend already has CORS configured. Ensure your frontend URL is allowed.

### 4. Remove Redundant Scripts
The `start_gmail_api.sh` script is no longer needed as Gmail is now part of the main backend.

## Security Considerations

1. **Token Storage**: `token.json` contains sensitive credentials. Add it to `.gitignore`:
```bash
echo "token.json" >> backend/.gitignore
echo "credentials.json" >> backend/.gitignore
```

2. **CORS Configuration**: In production, update CORS settings in `backend/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],  # Specific domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

3. **Authentication**: Implement proper token verification in the `security` dependency.

4. **Rate Limiting**: Consider adding rate limiting for Gmail API calls to avoid quota issues.

## Benefits of Integration

✅ **Single Server**: Run everything from one backend server
✅ **Unified API**: All services available through one base URL
✅ **Easier Deployment**: Deploy one application instead of two
✅ **Shared Resources**: Gmail and AI services can easily interact
✅ **Better Maintenance**: Single codebase to maintain
✅ **Simplified Frontend**: One API client for all features

## Next Steps

1. **Remove Old Gmail Server**: The `app/` directory containing the separate Gmail server is no longer needed for the main application.

2. **Update Documentation**: Any user-facing documentation should be updated to reflect the unified backend.

3. **Test All Features**: Ensure all Gmail functionality works correctly through the new endpoints.

4. **Deploy**: Deploy the unified backend to your production environment.

## Support

For issues or questions:
- Check the logs in the backend console
- Review `GMAIL_API_README.md` for Gmail API setup
- Check `INTEGRATION_GUIDE.md` for additional integration details
- Test endpoints using the Swagger UI at `/docs`

## Summary

The Gmail services are now fully integrated into the main MailMate AI Backend. You can:
- ✅ Run a single unified backend server
- ✅ Access all Gmail endpoints via `/gmail/*`
- ✅ Use the same authentication and error handling
- ✅ Simplify your deployment and frontend integration

**No separate Gmail server is needed anymore!**
