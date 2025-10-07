# Reply and Reply to All Feature Implementation

## Summary
Successfully implemented full integration between frontend and backend for email reply and reply-to-all functionality with proper loading states.

## Changes Made

### Backend Changes

#### 1. **Updated Email Models** (`backend/models/gmail.py`)
- Added new `ReplyRequest` model that doesn't require `to`, `subject` fields since they're extracted from the original email
- Keeps optional `cc`, `bcc`, and `attachments` fields

#### 2. **Enhanced Gmail Service** (`backend/services/gmail_service.py`)
- Added `reply_to_all()` method that:
  - Fetches the original email details
  - Gets the current user's email address
  - Automatically includes all original recipients in CC (except sender and yourself)
  - Maintains thread context with `threadId`
  - Uses proper email headers (`In-Reply-To`, `References`)

#### 3. **Updated Gmail Router** (`backend/routers/gmail_router.py`)
- Imported `ReplyRequest` model
- Updated `reply_to_email` endpoint to use `ReplyRequest` instead of `EmailRequest`
- Added new `reply-all` endpoint at `POST /gmail/{email_id}/reply-all`

### Frontend Changes

#### 1. **Updated API Service** (`MailMate-AI/src/services/mailmateApi.ts`)
- Replaced placeholder implementations with real API calls
- `replyToEmail()` now:
  - Takes `emailId` instead of `threadId` and `receiverId`
  - Converts File attachments to base64
  - Calls `POST /gmail/{emailId}/reply`
  - Returns proper response with error handling
  
- `replyToAll()` now:
  - Takes `emailId` instead of `threadId`
  - Converts File attachments to base64
  - Calls `POST /gmail/{emailId}/reply-all`
  - Returns proper response with error handling

#### 2. **Enhanced Email Thread Viewer** (`MailMate-AI/src/components/EmailThreadViewer.tsx`)
- Updated `handleReply()` to use the last email's `id` instead of thread ID
- Improved error handling with detailed error messages
- Enhanced loading states:
  - **Quick Send Button**: Shows spinner icon when sending
  - **Reply Button**: Shows "Sending..." text with spinner when active
  - **Reply All Button**: Shows "Sending..." text with spinner when active
  - **Inline Indicator**: Shows "Sending..." text near textarea
  - All buttons disabled during sending
  
- Removed unused `showReplyOptions` state
- Enter key now triggers reply directly

## API Endpoints

### Reply to Email
```
POST /gmail/{email_id}/reply
Content-Type: application/json

{
  "body": "Reply message text",
  "cc": ["optional@email.com"],
  "bcc": ["optional@email.com"],
  "attachments": [
    {
      "filename": "file.pdf",
      "content": "base64_encoded_content",
      "mime_type": "application/pdf"
    }
  ]
}
```

### Reply to All
```
POST /gmail/{email_id}/reply-all
Content-Type: application/json

{
  "body": "Reply message text",
  "cc": ["optional@email.com"],
  "bcc": ["optional@email.com"],
  "attachments": [
    {
      "filename": "file.pdf",
      "content": "base64_encoded_content",
      "mime_type": "application/pdf"
    }
  ]
}
```

## User Experience

### Loading States
1. **Before Sending**:
   - User types message
   - All buttons are enabled
   
2. **During Sending**:
   - "Sending..." text appears below textarea
   - Quick send button shows spinner
   - Reply and Reply All buttons show "Sending..." with spinner
   - All buttons disabled to prevent duplicate sends
   
3. **After Sending**:
   - Success toast notification appears
   - Input field clears
   - Attachments list clears
   - Thread updates automatically (if `onThreadUpdate` callback provided)
   - All buttons re-enabled

### Error Handling
- Network errors show detailed error message in toast
- Invalid email ID shows appropriate error
- File attachment conversion errors handled gracefully

## Testing

To test the implementation:

1. **Start Backend**:
   ```bash
   cd backend
   python main.py
   ```

2. **Start Frontend**:
   ```bash
   cd MailMate-AI
   npm run dev
   ```

3. **Test Reply**:
   - Open an email thread
   - Type a reply message
   - Click "Reply" button
   - Verify loading state appears
   - Verify success message after sending

4. **Test Reply All**:
   - Open an email thread with multiple recipients
   - Type a reply message
   - Click "Reply All" button
   - Verify all recipients are included in CC
   - Verify loading state appears
   - Verify success message after sending

## Notes

- Attachments are converted to base64 before sending
- Reply-all automatically excludes the sender and current user from CC
- Thread context is maintained with proper Gmail headers
- All operations use Gmail API OAuth2 authentication
- Error messages include detailed information for debugging
