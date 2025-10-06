# Gmail API Backend - Setup and Usage Guide

## Overview

This Gmail API backend provides a complete FastAPI-based interface for Gmail operations including:
- Email sending, replying, and forwarding
- Email management (read/unread, delete, labels)
- OAuth 2.0 authentication
- Full email retrieval with attachments

## Prerequisites

- Python 3.8 or higher
- Gmail account
- Google Cloud Console project with Gmail API enabled

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure OAuth consent screen if prompted:
   - Choose "External" for user type
   - Fill in required fields (App name, User support email, Developer contact)
   - Add scopes: `gmail.readonly`, `gmail.send`, `gmail.modify`, `gmail.labels`
   - Add test users if in testing mode
4. Create OAuth 2.0 Client ID:
   - Application type: "Desktop app" or "Web application"
   - For web application, add authorized redirect URIs:
     - `http://localhost:8000/auth/callback`
     - `http://127.0.0.1:8000/auth/callback`
5. Download the credentials file as `credentials.json`
6. Place `credentials.json` in the root directory of this project

### 3. Install Dependencies

```bash
# Create a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Run the Application

```bash
# Start the FastAPI server
cd app
python main.py

# Or use uvicorn directly
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The server will start at `http://localhost:8000`

### 5. First-Time Authentication

On first run, the application will:
1. Open a browser window for Gmail OAuth authentication
2. Ask you to log in with your Gmail account
3. Request permissions for Gmail access
4. Save authentication token to `token.json`

**Important**: Keep `token.json` secure and add it to `.gitignore`

## API Endpoints

### Health Check
```
GET /
GET /health
```

### Authentication
```
POST /auth/gmail          - Get OAuth authorization URL
POST /auth/callback       - Handle OAuth callback
```

### Email Operations
```
GET  /emails                          - List emails
GET  /emails/{email_id}               - Get email detail
POST /emails/send                     - Send new email
POST /emails/{email_id}/reply         - Reply to email
POST /emails/{email_id}/forward       - Forward email
DELETE /emails/{email_id}             - Delete email
POST /emails/{email_id}/mark-read     - Mark as read
POST /emails/{email_id}/mark-unread   - Mark as unread
```

### Label Management
```
GET  /labels                          - Get all labels
POST /emails/{email_id}/add-label     - Add label to email
DELETE /emails/{email_id}/remove-label - Remove label from email
```

## API Usage Examples

### Send an Email

```bash
curl -X POST http://localhost:8000/emails/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Test Email",
    "body": "This is a test email from Gmail API",
    "cc": ["cc@example.com"],
    "bcc": ["bcc@example.com"]
  }'
```

### Get Emails

```bash
curl -X GET "http://localhost:8000/emails?max_results=10&query=is:unread" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Reply to Email

```bash
curl -X POST http://localhost:8000/emails/{email_id}/reply \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Thank you for your email. I will review and get back to you."
  }'
```

## Testing

Run the included test script to verify the setup:

```bash
python3 test_gmail_api.py
```

This will check:
- ✓ Module imports
- ✓ Pydantic models
- ✓ GmailService class structure
- ✓ Auth module
- ✓ FastAPI app structure
- ✓ All endpoint routes

## Security Notes

1. **Never commit credentials**: Add these to `.gitignore`:
   - `credentials.json`
   - `token.json`
   - `.env`

2. **Token Security**: The `token.json` file contains access and refresh tokens. Keep it secure.

3. **Production Deployment**:
   - Use environment variables for sensitive data
   - Implement proper token verification in `app/auth.py`
   - Set up HTTPS
   - Configure CORS properly for your frontend domain
   - Use proper secret management (AWS Secrets Manager, Azure Key Vault, etc.)

## Troubleshooting

### "credentials.json not found"
- Download credentials from Google Cloud Console
- Place in the root directory of the project

### "Access blocked: This app's request is invalid"
- Verify OAuth consent screen configuration
- Add test users in Google Cloud Console
- Check authorized redirect URIs

### "Token has been expired or revoked"
- Delete `token.json`
- Re-authenticate by running the app again

### Rate Limits
Gmail API has usage quotas:
- 1 billion quota units per day
- 250 quota units per user per second
- See [Gmail API quotas](https://developers.google.com/gmail/api/reference/quota)

## Project Structure

```
app/
├── __init__.py          - Package initialization
├── main.py              - FastAPI application and routes
├── gmail_service.py     - Gmail API service class
├── models.py            - Pydantic models
└── auth.py              - Authentication utilities

credentials.json         - OAuth credentials (not in git)
token.json              - Access token (not in git)
requirements.txt        - Python dependencies
test_gmail_api.py       - Test script
```

## Environment Variables

Create a `.env` file for configuration:

```env
# Optional: Custom port
PORT=8000

# Optional: Custom credentials path
CREDENTIALS_PATH=./credentials.json
TOKEN_PATH=./token.json
```

## Integration with Main Backend

To integrate this Gmail API service with the main MailMate AI backend:

1. **Import the Gmail service** in the main backend
2. **Add Gmail routes** to the main router
3. **Use Gemini AI** to analyze emails fetched from Gmail
4. **Implement smart features**:
   - Auto-reply based on email analysis
   - Task extraction from Gmail
   - Meeting suggestions from email threads
   - Smart email categorization

Example integration:
```python
from app.gmail_service import GmailService
from backend.services.gemini_service import GeminiService

gmail = GmailService()
gemini = GeminiService()

# Fetch email
email = await gmail.get_email_detail(email_id)

# Analyze with Gemini
analysis = gemini.analyze_email(email['body'])

# Auto-categorize and suggest actions
if analysis['urgency'] == 'high':
    await gmail.add_label(email_id, 'URGENT')
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review [Gmail API documentation](https://developers.google.com/gmail/api)
3. Check Google Cloud Console for quota and error logs

## License

This project is part of the MailMate AI hackathon project.
