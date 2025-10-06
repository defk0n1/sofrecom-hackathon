# Gmail API - Endpoint Documentation

## Base URL
```
http://localhost:8000
```

## Authentication

Most endpoints require authentication via Bearer token. Include in headers:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## Endpoints

### 1. Root / Health Check

#### GET /
Get basic API information

**Response:**
```json
{
  "message": "Gmail API Backend is running!",
  "version": "1.0.0"
}
```

#### GET /health
Health check endpoint

**Response:**
```json
{
  "status": "healthy",
  "service": "gmail-api-backend"
}
```

---

### 2. Authentication Endpoints

#### POST /auth/gmail
Initiate Gmail OAuth authentication

**Response:**
```json
{
  "status": "success",
  "message": "Authentication URL generated",
  "auth_url": "https://accounts.google.com/o/oauth2/auth?..."
}
```

**Usage:**
1. Call this endpoint to get auth_url
2. Redirect user to auth_url
3. User grants permissions
4. User is redirected to callback URL with code

#### POST /auth/callback
Handle OAuth callback

**Query Parameters:**
- `code` (string, required): Authorization code from OAuth

**Response:**
```json
{
  "status": "success",
  "message": "Authentication successful"
}
```

---

### 3. Email Retrieval

#### GET /emails
Get list of emails

**Query Parameters:**
- `max_results` (integer, optional): Maximum number of emails to return (default: 10)
- `query` (string, optional): Gmail search query (e.g., "is:unread", "from:user@example.com")

**Response:**
```json
{
  "status": "success",
  "emails": [
    {
      "id": "1234567890abcdef",
      "threadId": "1234567890abcdef",
      "from": "sender@example.com",
      "subject": "Meeting Tomorrow",
      "date": "Mon, 1 Jan 2024 10:00:00 +0000",
      "snippet": "Just confirming our meeting..."
    }
  ]
}
```

**Example Queries:**
- `is:unread` - Unread emails
- `from:boss@company.com` - Emails from specific sender
- `subject:invoice` - Emails with invoice in subject
- `has:attachment` - Emails with attachments
- `after:2024/01/01` - Emails after specific date

#### GET /emails/{email_id}
Get detailed information about a specific email

**Path Parameters:**
- `email_id` (string, required): Email ID

**Response:**
```json
{
  "status": "success",
  "email": {
    "id": "1234567890abcdef",
    "threadId": "1234567890abcdef",
    "labelIds": ["INBOX", "UNREAD"],
    "from": "sender@example.com",
    "to": "recipient@example.com",
    "subject": "Meeting Tomorrow",
    "date": "Mon, 1 Jan 2024 10:00:00 +0000",
    "body": "Full email content...",
    "snippet": "Just confirming our meeting..."
  }
}
```

---

### 4. Email Sending

#### POST /emails/send
Send a new email

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Meeting Schedule",
  "body": "Let's schedule a meeting for next week.",
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"],
  "attachments": [
    {
      "filename": "document.pdf",
      "content": "base64_encoded_content"
    }
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Email sent successfully",
  "message_id": "1234567890abcdef"
}
```

#### POST /emails/{email_id}/reply
Reply to a specific email

**Path Parameters:**
- `email_id` (string, required): Email ID to reply to

**Request Body:**
```json
{
  "body": "Thank you for your email. I'll review and respond shortly.",
  "cc": ["manager@example.com"],
  "bcc": []
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Reply sent successfully",
  "message_id": "1234567890abcdef"
}
```

**Note:** Subject is automatically prefixed with "Re:" and maintains email threading.

#### POST /emails/{email_id}/forward
Forward an email

**Path Parameters:**
- `email_id` (string, required): Email ID to forward

**Request Body:**
```json
{
  "to": "colleague@example.com",
  "body": "Please review this email.",
  "cc": [],
  "bcc": []
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Email forwarded successfully",
  "message_id": "1234567890abcdef"
}
```

**Note:** Original email content is included with "---------- Forwarded message ---------" header.

---

### 5. Email Management

#### DELETE /emails/{email_id}
Delete an email permanently

**Path Parameters:**
- `email_id` (string, required): Email ID to delete

**Response:**
```json
{
  "status": "success",
  "message": "Email deleted successfully"
}
```

**Warning:** This permanently deletes the email. To move to trash instead, use label management.

#### POST /emails/{email_id}/mark-read
Mark an email as read

**Path Parameters:**
- `email_id` (string, required): Email ID

**Response:**
```json
{
  "status": "success",
  "message": "Email marked as read"
}
```

#### POST /emails/{email_id}/mark-unread
Mark an email as unread

**Path Parameters:**
- `email_id` (string, required): Email ID

**Response:**
```json
{
  "status": "success",
  "message": "Email marked as unread"
}
```

---

### 6. Label Management

#### GET /labels
Get all Gmail labels

**Response:**
```json
{
  "status": "success",
  "labels": [
    {
      "id": "INBOX",
      "name": "INBOX",
      "type": "system"
    },
    {
      "id": "Label_123",
      "name": "Work",
      "type": "user"
    }
  ]
}
```

#### POST /emails/{email_id}/add-label
Add a label to an email

**Path Parameters:**
- `email_id` (string, required): Email ID

**Query Parameters:**
- `label_id` (string, required): Label ID to add

**Response:**
```json
{
  "status": "success",
  "message": "Label added successfully"
}
```

#### DELETE /emails/{email_id}/remove-label
Remove a label from an email

**Path Parameters:**
- `email_id` (string, required): Email ID

**Query Parameters:**
- `label_id` (string, required): Label ID to remove

**Response:**
```json
{
  "status": "success",
  "message": "Label removed successfully"
}
```

---

## Error Responses

All endpoints may return error responses:

### 400 Bad Request
```json
{
  "detail": "Either file or email_text must be provided"
}
```

### 401 Unauthorized
```json
{
  "detail": "Invalid or missing token"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Error fetching emails: [error message]"
}
```

---

## Rate Limiting

Gmail API has the following quotas:
- **Per user per second**: 250 quota units
- **Per day**: 1 billion quota units

Most operations cost 5 quota units. For details, see:
https://developers.google.com/gmail/api/reference/quota

---

## Best Practices

1. **Batch Requests**: For multiple emails, fetch in batches
2. **Use Queries**: Filter emails server-side using Gmail queries
3. **Cache Labels**: Label list rarely changes, cache it
4. **Handle Errors**: Implement retry logic for transient failures
5. **Respect Rate Limits**: Implement exponential backoff

---

## Interactive API Documentation

When the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

These provide interactive API documentation and testing interfaces.
