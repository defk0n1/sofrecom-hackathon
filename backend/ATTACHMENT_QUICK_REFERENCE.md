# Attachment Management - Quick Reference

## For Backend Developers

### Extract attachments from an email
```python
from services.attachment_service import AttachmentService

attachment_service = AttachmentService()
attachments = await attachment_service.process_and_save_attachments(email_id)
print(f"Processed {len(attachments)} attachments")
```

### Get attachment list from Gmail (without saving)
```python
from services.gmail_service import GmailService

gmail_service = GmailService()
attachments = await gmail_service.get_attachments_list(email_id)
# Returns: [{ id, filename, mimeType, size }]
```

### Get attachment content from Gmail
```python
content = await gmail_service.get_attachment_content(email_id, attachment_id)
# Returns: { data: "base64...", size: 1024 }
```

## For Frontend Developers

### List all attachments
```typescript
const response = await fetch('/attachment-manager/attachments?limit=50');
const attachments = await response.json();
// Returns array of: { id, email_id, attachment_id, filename, mime_type, size, created_at }
```

### Get attachment content (for download/preview)
```typescript
const response = await fetch(
  `/attachment-manager/attachments/${emailId}/${attachmentId}/content`
);
const data = await response.json();
// Returns: { filename, mime_type, size, data: "base64..." }

// Convert to blob for download
const byteCharacters = atob(data.data);
const byteArray = new Uint8Array(byteCharacters.length);
for (let i = 0; i < byteCharacters.length; i++) {
  byteArray[i] = byteCharacters.charCodeAt(i);
}
const blob = new Blob([byteArray], { type: data.mime_type });
```

### Get attachments for specific email
```typescript
const response = await fetch(
  `/attachment-manager/attachments?email_id=${emailId}`
);
const attachments = await response.json();
```

### Count total attachments
```typescript
const response = await fetch('/attachment-manager/attachments/count');
const { count } = await response.json();
```

## API Endpoints Quick Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/attachment-manager/attachments` | List all attachments (metadata only) |
| GET | `/attachment-manager/attachments/{email_id}/{attachment_id}/content` | Get attachment content (base64) |
| GET | `/attachment-manager/attachments/count` | Get total count |
| POST | `/attachment-manager/process-email-attachments/{email_id}` | Extract attachments from email |
| POST | `/attachment-manager/process-multiple-emails` | Batch process emails |
| GET | `/gmail/{email_id}/attachments` | Get attachments from Gmail directly |

## Database Queries

### Get all attachments for an email
```sql
SELECT * FROM attachments WHERE email_id = ?;
```

### Get attachments by filename pattern
```sql
SELECT * FROM attachments WHERE filename LIKE '%.pdf';
```

### Get total size of attachments per email
```sql
SELECT email_id, SUM(size) as total_size 
FROM attachments 
GROUP BY email_id;
```

### Get most recent attachments
```sql
SELECT * FROM attachments 
ORDER BY created_at DESC 
LIMIT 10;
```

## Common Use Cases

### Display attachments in email view
1. Fetch email details (includes attachment metadata if `extract_attachments=true`)
2. Display attachment list with file icons
3. Add "Download" button for each attachment
4. On click, fetch content and trigger download

### Attachment preview
1. Check mime_type (e.g., image/*, application/pdf)
2. Fetch content via API
3. Display in modal/dialog
4. For images: `<img src="data:image/png;base64,...">`
5. For PDFs: Use PDF viewer library

### Batch download
1. Get all attachments for email
2. Loop through and fetch content
3. Create zip file on client side
4. Trigger download

### Search attachments
1. Use SQL LIKE query on filename
2. Filter by mime_type for specific file types
3. Order by size, created_at, etc.

## Error Handling

### Attachment not found
```typescript
try {
  const response = await fetch(/* ... */);
  if (response.status === 404) {
    console.error('Attachment not found in database');
  }
} catch (error) {
  console.error('Failed to fetch attachment:', error);
}
```

### Gmail API rate limit
```python
try:
    content = await gmail_service.get_attachment_content(email_id, attachment_id)
except Exception as e:
    if 'quota' in str(e).lower():
        # Handle rate limit
        print("Rate limit exceeded, retry later")
```

## Performance Tips

1. **Pagination**: Always use limit/offset for large lists
2. **Lazy Loading**: Only fetch content when user clicks
3. **Caching**: Cache attachment metadata on frontend
4. **Batch Processing**: Use batch endpoint for multiple emails
5. **Indexing**: Database has index on email_id for fast queries

## Security Notes

1. **Authentication**: All endpoints require valid Gmail OAuth token
2. **Authorization**: Users can only access their own attachments
3. **Content**: Attachments are fetched from Gmail with user's credentials
4. **Storage**: No attachments stored on server (only metadata)

## Testing

Run the test suite:
```bash
cd backend
python tests/test_attachments.py
```

Expected output: All tests pass ✓

## Troubleshooting

### "Attachments table does not exist"
Run the migration script:
```bash
cd backend/db
python create_attachments_table.py
```

### "Gmail service not initialized"
Check that credentials.json and token.json exist:
```bash
ls backend/credentials.json backend/token.json
```

### "Failed to extract attachments"
Email might not have attachments, or Gmail API error. Check logs.

## Migration Guide

If you have existing email data:
1. Run the database migration script
2. Process existing emails to extract attachments:
```python
from services.attachment_service import AttachmentService
import sqlite3

# Get all email IDs
conn = sqlite3.connect('db/email.db')
cursor = conn.cursor()
cursor.execute("SELECT id FROM emails")
email_ids = [row[0] for row in cursor.fetchall()]

# Process them
service = AttachmentService()
result = await service.process_multiple_emails(email_ids)
print(f"Processed {result['total_processed']} attachments")
```
