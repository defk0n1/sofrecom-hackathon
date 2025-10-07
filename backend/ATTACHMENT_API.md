# Attachment Management API Documentation

## Overview
The attachment management system allows you to:
1. Extract and save attachment metadata from emails without storing the actual content
2. List all attachments for the authenticated user
3. Fetch attachment content on-demand when needed

## Database Schema

### Attachments Table
```sql
CREATE TABLE attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_id TEXT NOT NULL,
    attachment_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email_id) REFERENCES emails(id),
    UNIQUE(email_id, attachment_id)
);
```

## API Endpoints

### 1. Get User Attachments
**Endpoint:** `GET /attachment-manager/attachments`

**Description:** Get all attachments metadata for the authenticated user. Does not include attachment content - only metadata.

**Query Parameters:**
- `email_id` (optional): Filter by specific email ID
- `limit` (optional, default: 100): Maximum number of attachments to return
- `offset` (optional, default: 0): Number of attachments to skip

**Response:**
```json
[
  {
    "id": 1,
    "email_id": "18d4c5f2a1b3e567",
    "attachment_id": "ANGjdJ8wN...",
    "filename": "invoice.pdf",
    "mime_type": "application/pdf",
    "size": 524288,
    "created_at": "2025-01-07T10:30:00"
  }
]
```

### 2. Get Attachment Content
**Endpoint:** `GET /attachment-manager/attachments/{email_id}/{attachment_id}/content`

**Description:** Fetch the actual content of a specific attachment from Gmail. This is called on-demand when the user wants to view or download an attachment.

**Path Parameters:**
- `email_id`: The email ID
- `attachment_id`: The attachment ID

**Response:**
```json
{
  "filename": "invoice.pdf",
  "mime_type": "application/pdf",
  "size": 524288,
  "data": "base64_encoded_content..."
}
```

### 3. Get Attachments Count
**Endpoint:** `GET /attachment-manager/attachments/count`

**Description:** Get the total count of attachments.

**Query Parameters:**
- `email_id` (optional): Filter by specific email ID

**Response:**
```json
{
  "count": 42
}
```

### 4. Process Email Attachments
**Endpoint:** `POST /attachment-manager/process-email-attachments/{email_id}`

**Description:** Extract and save attachment metadata from a specific email. This should be called during email analysis/processing.

**Path Parameters:**
- `email_id`: The email ID to process

**Response:**
```json
{
  "status": "success",
  "email_id": "18d4c5f2a1b3e567",
  "attachments_processed": 2,
  "attachments": [
    {
      "email_id": "18d4c5f2a1b3e567",
      "attachment_id": "ANGjdJ8wN...",
      "filename": "invoice.pdf",
      "mime_type": "application/pdf",
      "size": 524288
    }
  ]
}
```

### 5. Process Multiple Emails
**Endpoint:** `POST /attachment-manager/process-multiple-emails`

**Description:** Process attachments for multiple emails at once.

**Request Body:**
```json
["email_id_1", "email_id_2", "email_id_3"]
```

**Response:**
```json
{
  "status": "success",
  "total_processed": 5,
  "total_emails": 3,
  "errors": []
}
```

### 6. Get Email Attachments (from Gmail)
**Endpoint:** `GET /gmail/{email_id}/attachments`

**Description:** Get list of attachments for a specific email directly from Gmail.

**Response:**
```json
{
  "status": "success",
  "email_id": "18d4c5f2a1b3e567",
  "attachments": [
    {
      "id": "ANGjdJ8wN...",
      "filename": "invoice.pdf",
      "mimeType": "application/pdf",
      "size": 524288
    }
  ]
}
```

## Integration Flow

### During Email Processing
When an email is fetched or analyzed, attachment metadata should be extracted and saved:

```python
# In your email processing flow
from services.attachment_service import AttachmentService

attachment_service = AttachmentService()
attachments = await attachment_service.process_and_save_attachments(email_id)
```

### Frontend Display Flow
1. **List attachments**: Call `GET /attachment-manager/attachments` to display attachment metadata
2. **User clicks to view/download**: Call `GET /attachment-manager/attachments/{email_id}/{attachment_id}/content` to fetch the actual content
3. **Display in dialog**: Show the content to the user

## Benefits
- **Storage efficiency**: Only metadata is stored in the database, not the actual file content
- **On-demand fetching**: Attachment content is only fetched from Gmail when needed
- **Fast listing**: Quickly display all attachments without loading their content
- **Scalability**: Reduces database size and improves performance

## Example Usage

### Python Client
```python
import requests

# List all attachments
response = requests.get("http://localhost:5000/attachment-manager/attachments")
attachments = response.json()

# Get specific attachment content
email_id = attachments[0]['email_id']
attachment_id = attachments[0]['attachment_id']
response = requests.get(
    f"http://localhost:5000/attachment-manager/attachments/{email_id}/{attachment_id}/content"
)
content = response.json()

# Decode base64 content
import base64
file_data = base64.b64decode(content['data'])
```

### Frontend (React/TypeScript)
```typescript
// Fetch attachments list
const fetchAttachments = async () => {
  const response = await fetch('/attachment-manager/attachments');
  const attachments = await response.json();
  return attachments;
};

// Fetch attachment content on demand
const downloadAttachment = async (emailId: string, attachmentId: string, filename: string) => {
  const response = await fetch(
    `/attachment-manager/attachments/${emailId}/${attachmentId}/content`
  );
  const data = await response.json();
  
  // Convert base64 to blob
  const byteCharacters = atob(data.data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: data.mime_type });
  
  // Create download link
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};
```

## Gmail Service Methods

### get_attachments_list
```python
async def get_attachments_list(self, email_id: str) -> List[Dict[str, Any]]
```
Extracts attachment metadata from an email in Gmail.

### get_attachment_content
```python
async def get_attachment_content(self, email_id: str, attachment_id: str) -> Dict[str, Any]
```
Fetches the actual content of an attachment from Gmail (base64url-encoded).
