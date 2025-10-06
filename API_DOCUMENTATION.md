# MailMate AI - Complete Documentation

## Overview

MailMate AI is a comprehensive email management system that integrates Gmail API with AI capabilities to provide intelligent email handling, automated responses, and smart categorization. The system consists of a FastAPI backend with automatic Gmail authentication and a React frontend with chat-like email thread visualization.

## Architecture

```
┌─────────────────────┐
│   Frontend (React)  │
│  - Email Thread UI  │
│  - AI Chat UI       │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│   FastAPI Backend   │
│  - Auto Gmail Auth  │
│  - AI Integration   │
└──────────┬──────────┘
           │
     ┌─────┴─────┬─────────┐
     │           │         │
┌────▼────┐ ┌───▼───┐ ┌───▼───┐
│  Gmail  │ │Gemini │ │Email  │
│   API   │ │  AI   │ │  DB   │
└─────────┘ └───────┘ └───────┘
```

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 16+
- Gmail account
- Google Cloud Console project

### 1. Google Cloud Console Configuration

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Gmail API:
   - Navigate to **APIs & Services > Library**
   - Search "Gmail API"
   - Click **Enable**

4. Create OAuth 2.0 Credentials:
   - Go to **APIs & Services > Credentials**
   - Click **Create Credentials > OAuth client ID**
   - Configure consent screen:
     - User type: External
     - Add scopes: `gmail.readonly`, `gmail.send`, `gmail.modify`, `gmail.labels`
   - Application type: **Desktop app**
   - Download as `credentials.json`
   - Place in `backend/` directory

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# One-time authentication setup
python setup_gmail_auth.py

# Start server (auto-authenticates)
python main.py
```

The authentication process:
- First run opens browser for OAuth consent
- Creates `token.json` with refresh token
- Auto-refreshes tokens on expiration
- No manual token management needed

### 3. Frontend Setup

```bash
cd MailMate-AI

# Install dependencies
npm install

# Start development server
npm run dev
```

## API Endpoints

### Health & Status

```
GET  /                    # API info
GET  /health             # Health check with auth status
```

### Email Operations

```
GET  /emails             # List emails
     ?max_results=10     # Limit results
     ?query=is:unread    # Gmail search query

GET  /emails/{email_id}  # Get email details

POST /emails/send        # Send email
     Body: {
       "to": "recipient@example.com",
       "subject": "Subject",
       "body": "Email content",
       "cc": ["cc@example.com"],
       "bcc": ["bcc@example.com"]
     }

POST /emails/{email_id}/reply     # Reply to email
POST /emails/{email_id}/forward   # Forward email
DELETE /emails/{email_id}         # Delete email
POST /emails/{email_id}/mark-read # Mark as read
POST /emails/{email_id}/mark-unread # Mark as unread
```

### Email Thread Operations

```
GET  /emails/threads              # List all threads
GET  /emails/threads/{thread_id}  # Get thread details
GET  /emails/db-stats            # Database statistics
```

### AI Operations

```
POST /ai/summarize               # Summarize text
     Body: { "text": "..." }

POST /ai/analyze-email           # Analyze email content
POST /emails/smart-reply         # Generate AI reply
POST /emails/auto-categorize     # Auto-categorize email
POST /emails/extract-tasks       # Extract tasks from email
```

### Label Management

```
GET  /labels                          # List all labels
POST /emails/{email_id}/add-label     # Add label
DELETE /emails/{email_id}/remove-label # Remove label
```

## Key Features

### 1. Automatic Gmail Authentication
- **Zero-config after setup**: Token auto-refresh
- **No auth headers needed**: Backend handles authentication
- **Browser opens once**: Only for initial consent
- **Persistent tokens**: Survives server restarts

### 2. Email Thread Viewer
- **Chat-like interface**: Familiar messaging UI
- **Auto-summarization**: AI-powered email summaries
- **Thread grouping**: Related emails grouped together
- **Smart tools**: Reply, Chat, Analyze, Translate options
- **Attachment support**: View and query attachments

### 3. AI Integration
- **Email analysis**: Extract key points, urgency, tasks
- **Smart replies**: Generate context-aware responses
- **Auto-categorization**: Intelligent label application
- **Meeting detection**: Extract meeting details
- **Task extraction**: Find action items in emails

### 4. Database Storage
- **Local SQLite**: Stores email metadata
- **Thread tracking**: Groups conversations
- **Attachment metadata**: JSON storage
- **Performance optimized**: Indexed queries

## Usage Examples

### Fetch Emails (No Auth Required!)

```javascript
// Frontend - No auth headers needed
fetch('http://localhost:8000/emails?max_results=10')
  .then(res => res.json())
  .then(data => console.log(data.emails))
```

### Send Email

```javascript
fetch('http://localhost:8000/emails/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'recipient@example.com',
    subject: 'Test Email',
    body: 'Hello from MailMate AI!'
  })
})
```

### Get Email Threads

```javascript
// In React component
const { data } = await mailmateAPI.getEmailThreads();
// Returns threads with grouped emails
```

### AI-Powered Features

```javascript
// Summarize email
const summary = await mailmateAPI.summarizeEmail(emailText);

// Generate smart reply
const reply = await mailmateAPI.sendSmartReply(emailId, 'professional');

// Extract tasks
const tasks = await mailmateAPI.extractTasksFromEmail(emailId);
```

## Frontend Components

### App.tsx
- Mode toggle between Email Threads and AI Chat
- Thread state management
- Email context extraction for AI

### EmailThreadViewer
- Displays email threads in chat bubbles
- Shows sender names and timestamps
- Auto-summarizes long emails
- Tool selection for each email

### EmailThreadSidebar
- Lists all email threads
- Search/filter functionality
- Thread selection
- Refresh button

## File Structure

```
backend/
├── main.py                 # FastAPI app with auto-auth
├── setup_gmail_auth.py     # One-time auth setup
├── routers/
│   ├── gmail_router.py     # Gmail endpoints (no auth required)
│   ├── email_db_router.py  # Database endpoints
│   └── ai.py              # AI endpoints
├── services/
│   ├── gmail_service.py    # Gmail API wrapper
│   └── gemini_service.py   # AI service
└── token.json             # Auto-managed auth token

MailMate-AI/
├── src/
│   ├── App.tsx            # Main app with mode toggle
│   ├── components/
│   │   ├── EmailThreadViewer.tsx
│   │   └── EmailThreadSidebar.tsx
│   └── services/
│       └── mailmateApi.ts  # API client
└── db/
    └── email.db           # Local email storage
```

## Security Considerations

### Token Management
- `token.json` stored locally, never exposed
- Auto-refresh prevents expiration
- Add to `.gitignore`:
  ```
  credentials.json
  token.json
  .env
  ```

### Production Deployment
- Use environment variables for sensitive data
- Implement HTTPS
- Configure CORS for production domain
- Use proper secret management (AWS Secrets Manager, etc.)

## Troubleshooting

### "credentials.json not found"
```bash
# Download from Google Cloud Console
# Place in backend/ directory
```

### "Token refresh failed"
```bash
cd backend
rm token.json
python setup_gmail_auth.py
```

### "Gmail service not ready"
```bash
# Check health endpoint
curl http://localhost:8000/health

# If authenticated: false, re-run setup
python setup_gmail_auth.py
```

## Gmail Search Queries

- `is:unread` - Unread emails
- `from:boss@company.com` - From specific sender
- `subject:invoice` - Subject contains
- `has:attachment` - Has attachments
- `after:2024/01/01` - Date filters
- `label:important` - By label

## Rate Limits

Gmail API quotas:
- **Per user/second**: 250 quota units
- **Per day**: 1 billion quota units
- Most operations: 5 quota units

## Quick Start Scripts

### Windows PowerShell
```powershell
.\start.ps1
```

### Windows Command Prompt
```cmd
start.bat
```

### Linux/Mac
```bash
cd backend && python main.py
```

## Future Enhancements

- Multi-account support
- Real-time email updates (WebSocket)
- Advanced email composition
- Calendar integration
- Email templates
- Bulk operations
- Email scheduling

## Support

1. Check this documentation
2. Review Google Cloud Console logs
3. Verify Gmail API is enabled
4. Check `backend/logs/` for errors
5. Ensure test user is added in OAuth consent screen

---

**Note**: This system provides automatic Gmail authentication - no manual token management required. Just run the setup once and the backend handles everything automatically!