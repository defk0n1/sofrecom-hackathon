# Integrating Gmail API with MailMate AI Backend

This guide explains how to integrate the Gmail API service with the existing MailMate AI backend to create a powerful email management system with AI capabilities.

## Architecture Overview

```
┌─────────────────────┐
│   Frontend (React)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Main Backend API   │ ← FastAPI with Gemini AI
│  (backend/main.py)  │
└──────────┬──────────┘
           │
           ├──────────────┬────────────────┐
           │              │                │
           ▼              ▼                ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ Gemini   │   │  Gmail   │   │  Other   │
    │ Service  │   │  Service │   │ Services │
    └──────────┘   └──────────┘   └──────────┘
```

## Integration Steps

### 1. Copy Gmail Service to Main Backend

```bash
# Copy the Gmail service module to your main backend
cp -r app/gmail_service.py backend/services/
cp -r app/models.py backend/models/gmail_models.py
```

### 2. Update Main Backend Dependencies

Add to `backend/requirements.txt`:
```txt
google-api-python-client==2.108.0
google-auth-httplib2==0.1.1
google-auth-oauthlib==1.1.0
```

### 3. Create Gmail Router

Create `backend/routers/gmail.py`:

```python
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from backend.services.gmail_service import GmailService
from backend.services.gemini_service import GeminiService
from backend.models.gmail_models import EmailRequest, EmailResponse

router = APIRouter(prefix="/gmail", tags=["Gmail"])
security = HTTPBearer()

# Initialize services
gmail_service = None
gemini_service = GeminiService()

def get_gmail_service():
    global gmail_service
    if gmail_service is None:
        gmail_service = GmailService()
    return gmail_service


@router.get("/emails")
async def get_emails_with_analysis(
    max_results: int = 10,
    query: str = "",
    analyze: bool = False,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get emails with optional AI analysis"""
    gmail = get_gmail_service()
    emails = await gmail.get_emails(max_results, query)
    
    if analyze:
        # Analyze each email with Gemini AI
        for email in emails:
            detail = await gmail.get_email_detail(email['id'])
            analysis = gemini_service.analyze_email(detail['body'])
            email['analysis'] = analysis
    
    return {"status": "success", "emails": emails}


@router.post("/emails/smart-reply")
async def smart_reply(
    email_id: str,
    tone: str = "professional",
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Generate and send AI-powered reply"""
    gmail = get_gmail_service()
    
    # Get original email
    email = await gmail.get_email_detail(email_id)
    
    # Generate reply using Gemini
    prompt = f"""Generate a {tone} reply to this email:
    
Subject: {email['subject']}
From: {email['from']}
Body: {email['body']}

Generate a concise, appropriate reply."""
    
    response = gemini_service.flash_model.generate_content([prompt])
    reply_body = response.text
    
    # Send reply
    result = await gmail.reply_to_email(email_id, reply_body)
    
    return {
        "status": "success",
        "message": "Smart reply sent",
        "reply_body": reply_body,
        "message_id": result.get("id")
    }


@router.post("/emails/auto-categorize")
async def auto_categorize_email(
    email_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Automatically categorize email using AI"""
    gmail = get_gmail_service()
    
    # Get email
    email = await gmail.get_email_detail(email_id)
    
    # Analyze with Gemini
    analysis = gemini_service.analyze_email(email['body'])
    
    # Apply labels based on analysis
    labels_to_add = []
    
    if analysis.get('urgency') == 'high':
        labels_to_add.append('IMPORTANT')
    
    if 'meeting' in analysis.get('key_points', []):
        labels_to_add.append('CATEGORY_SOCIAL')
    
    # Add labels
    for label in labels_to_add:
        await gmail.add_label(email_id, label)
    
    return {
        "status": "success",
        "analysis": analysis,
        "labels_added": labels_to_add
    }


@router.post("/emails/extract-tasks")
async def extract_and_save_tasks(
    email_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Extract tasks from email and save them"""
    gmail = get_gmail_service()
    
    # Get email
    email = await gmail.get_email_detail(email_id)
    
    # Extract tasks using Gemini
    tasks = gemini_service.detect_tasks(email['body'])
    
    # Here you can save tasks to your database
    # For now, just return them
    
    return {
        "status": "success",
        "email_id": email_id,
        "tasks": tasks,
        "count": len(tasks)
    }


@router.get("/emails/unread-summary")
async def get_unread_summary(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get AI summary of unread emails"""
    gmail = get_gmail_service()
    
    # Get unread emails
    emails = await gmail.get_emails(max_results=20, query="is:unread")
    
    # Get details and analyze
    summaries = []
    for email in emails:
        detail = await gmail.get_email_detail(email['id'])
        analysis = gemini_service.analyze_email(detail['body'])
        
        summaries.append({
            "id": email['id'],
            "from": email['from'],
            "subject": email['subject'],
            "summary": analysis.get('summary'),
            "urgency": analysis.get('urgency'),
            "key_points": analysis.get('key_points', [])
        })
    
    return {
        "status": "success",
        "total_unread": len(summaries),
        "summaries": summaries
    }
```

### 4. Update Main Backend Router

In `backend/main.py`, add:

```python
from routers import ai, attachments, gmail  # Add gmail import

# Include routers
app.include_router(ai.router)
app.include_router(attachments.router)
app.include_router(gmail.router)  # Add this line
```

### 5. Frontend Integration

Update `MailMate-AI/src/services/mailmateApi.ts`:

```typescript
export const mailmateAPI = {
  // ... existing methods ...
  
  // Gmail Integration
  getEmails: async (maxResults = 10, query = "", analyze = false) => {
    const response = await fetch(
      `${API_BASE_URL}/gmail/emails?max_results=${maxResults}&query=${query}&analyze=${analyze}`,
      {
        headers: { 
          'Authorization': `Bearer ${getToken()}`,
        }
      }
    );
    return response.json();
  },

  sendSmartReply: async (emailId: string, tone = 'professional') => {
    const response = await fetch(
      `${API_BASE_URL}/gmail/emails/smart-reply?email_id=${emailId}&tone=${tone}`,
      {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${getToken()}`,
        }
      }
    );
    return response.json();
  },

  autoCategorizeEmail: async (emailId: string) => {
    const response = await fetch(
      `${API_BASE_URL}/gmail/emails/auto-categorize?email_id=${emailId}`,
      {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${getToken()}`,
        }
      }
    );
    return response.json();
  },

  extractTasksFromEmail: async (emailId: string) => {
    const response = await fetch(
      `${API_BASE_URL}/gmail/emails/extract-tasks?email_id=${emailId}`,
      {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${getToken()}`,
        }
      }
    );
    return response.json();
  },

  getUnreadSummary: async () => {
    const response = await fetch(
      `${API_BASE_URL}/gmail/emails/unread-summary`,
      {
        headers: { 
          'Authorization': `Bearer ${getToken()}`,
        }
      }
    );
    return response.json();
  }
};

// Helper function to get auth token
function getToken() {
  return localStorage.getItem('gmail_token') || '';
}
```

## Smart Features to Implement

### 1. Auto-Reply with AI

```python
@router.post("/emails/auto-reply")
async def auto_reply_to_email(email_id: str, rules: dict):
    """Auto-reply based on email analysis and rules"""
    email = await gmail.get_email_detail(email_id)
    analysis = gemini.analyze_email(email['body'])
    
    # Check if auto-reply rules match
    if should_auto_reply(analysis, rules):
        reply = generate_smart_reply(analysis, rules)
        await gmail.reply_to_email(email_id, reply)
```

### 2. Email Prioritization

```python
@router.get("/emails/prioritized")
async def get_prioritized_emails():
    """Get emails sorted by AI-determined priority"""
    emails = await gmail.get_emails(max_results=50)
    
    for email in emails:
        detail = await gmail.get_email_detail(email['id'])
        analysis = gemini.analyze_email(detail['body'])
        email['ai_priority'] = calculate_priority(analysis)
    
    # Sort by priority
    emails.sort(key=lambda x: x['ai_priority'], reverse=True)
    return emails
```

### 3. Meeting Detection and Calendar Integration

```python
@router.post("/emails/detect-meetings")
async def detect_and_schedule_meetings():
    """Detect meetings in emails and create calendar events"""
    emails = await gmail.get_emails(query="is:unread")
    
    meetings = []
    for email in emails:
        detail = await gmail.get_email_detail(email['id'])
        meeting_suggestions = gemini.suggest_meetings(detail['body'])
        
        if meeting_suggestions:
            meetings.append({
                'email_id': email['id'],
                'suggestions': meeting_suggestions
            })
    
    return {"status": "success", "meetings": meetings}
```

### 4. Automated Email Categorization

```python
@router.post("/emails/batch-categorize")
async def batch_categorize_emails():
    """Automatically categorize all unread emails"""
    emails = await gmail.get_emails(query="is:unread", max_results=100)
    
    results = []
    for email in emails:
        detail = await gmail.get_email_detail(email['id'])
        analysis = gemini.analyze_email(detail['body'])
        
        # Apply smart labels
        category = determine_category(analysis)
        await gmail.add_label(email['id'], category)
        
        results.append({
            'email_id': email['id'],
            'category': category,
            'urgency': analysis['urgency']
        })
    
    return {"status": "success", "categorized": len(results), "results": results}
```

## Configuration

### Environment Variables

Add to `.env`:
```env
# Gmail API
GMAIL_CREDENTIALS_PATH=./credentials.json
GMAIL_TOKEN_PATH=./token.json

# AI Features
ENABLE_AUTO_REPLY=false
ENABLE_AUTO_CATEGORIZE=true
AUTO_CATEGORIZE_INTERVAL=300  # seconds
```

### CORS Configuration

Update CORS in main backend to allow frontend:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        # Add your production frontend URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Testing the Integration

1. **Start the backend**:
```bash
cd backend
uvicorn main:app --reload
```

2. **Test Gmail endpoints**:
```bash
# Get emails
curl http://localhost:8000/gmail/emails?analyze=true \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get unread summary
curl http://localhost:8000/gmail/emails/unread-summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. **Test from frontend**:
```typescript
// In your React component
const { data: emails } = await mailmateAPI.getEmails(10, 'is:unread', true);
const summary = await mailmateAPI.getUnreadSummary();
```

## Security Considerations

1. **Token Storage**: Store Gmail tokens securely, never in frontend
2. **Rate Limiting**: Implement rate limiting for Gmail API calls
3. **Error Handling**: Handle Gmail API quota errors gracefully
4. **User Consent**: Always get user consent before accessing Gmail
5. **Data Privacy**: Don't store email content longer than necessary

## Next Steps

1. Implement background workers for:
   - Auto-categorization
   - Email monitoring
   - Smart notifications

2. Add database models for:
   - Email metadata caching
   - Task extraction
   - User preferences

3. Create frontend components for:
   - Gmail inbox view
   - Email composer with AI suggestions
   - Task dashboard from emails

4. Implement webhooks for:
   - Real-time email notifications
   - Auto-reply triggers

## Support

For issues with integration:
- Check Gmail API quotas in Google Cloud Console
- Review backend logs for errors
- Test Gmail service independently first
- Verify OAuth credentials are correct

