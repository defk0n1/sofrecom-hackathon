# Attachment Management System - Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. User views email list                                                │
│     │                                                                     │
│     └──> Display attachment badges/icons (from metadata)                 │
│                                                                           │
│  2. User clicks "View Attachments"                                       │
│     │                                                                     │
│     └──> GET /attachment-manager/attachments?email_id=xxx                │
│          Returns: [{ filename, size, mime_type, ... }]                   │
│                                                                           │
│  3. User clicks "Download" on specific attachment                        │
│     │                                                                     │
│     └──> GET /attachment-manager/attachments/{email}/{attachment}/content│
│          Returns: { data: "base64...", filename, mime_type }             │
│          │                                                                │
│          └──> Convert base64 to blob → Trigger download                  │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/REST API
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (FastAPI)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │         Attachment Manager Router                            │        │
│  │         /attachment-manager/*                                │        │
│  ├─────────────────────────────────────────────────────────────┤        │
│  │  GET  /attachments                                           │        │
│  │  GET  /attachments/{email}/{attachment}/content              │        │
│  │  GET  /attachments/count                                     │        │
│  │  POST /process-email-attachments/{email_id}                  │        │
│  │  POST /process-multiple-emails                               │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                          │                                               │
│                          │ Uses                                          │
│                          ▼                                               │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │         Attachment Service                                   │        │
│  │         services/attachment_service.py                       │        │
│  ├─────────────────────────────────────────────────────────────┤        │
│  │  • process_and_save_attachments(email_id)                    │        │
│  │    - Extracts metadata from Gmail                            │        │
│  │    - Saves to database (metadata only!)                      │        │
│  │    - Returns saved attachments                               │        │
│  │                                                               │        │
│  │  • process_multiple_emails(email_ids)                        │        │
│  │    - Batch process multiple emails                           │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                          │                                               │
│                          │ Uses                                          │
│                          ▼                                               │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │         Gmail Service                                        │        │
│  │         services/gmail_service.py                            │        │
│  ├─────────────────────────────────────────────────────────────┤        │
│  │  • get_attachments_list(email_id)                            │        │
│  │    - Calls Gmail API                                         │        │
│  │    - Returns: [{ id, filename, mimeType, size }]             │        │
│  │                                                               │        │
│  │  • get_attachment_content(email_id, attachment_id)           │        │
│  │    - Calls Gmail API                                         │        │
│  │    - Returns: { data: "base64...", size }                    │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                          │                                               │
└──────────────────────────│───────────────────────────────────────────────┘
                           │
                           │ Google API Client
                           │
┌──────────────────────────▼───────────────────────────────────────────────┐
│                         GMAIL API                                         │
├───────────────────────────────────────────────────────────────────────────┤
│  • messages.get() - Get email with attachments metadata                  │
│  • attachments.get() - Get attachment content                            │
│  • OAuth 2.0 authentication                                              │
└───────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                         DATABASE (SQLite)                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │  Table: emails                                               │        │
│  │  ┌────┬─────────┬────────┬──────┬─────────────┐             │        │
│  │  │ id │ sender  │ subject│ body │ attachments │             │        │
│  │  ├────┼─────────┼────────┼──────┼─────────────┤             │        │
│  │  │... │ ...     │ ...    │ ...  │ JSON string │             │        │
│  │  └────┴─────────┴────────┴──────┴─────────────┘             │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │  Table: attachments (NEW!)                                   │        │
│  │  ┌────┬──────────┬────────────────┬──────────┬──────────┐   │        │
│  │  │ id │ email_id │ attachment_id  │ filename │ mime_type│   │        │
│  │  ├────┼──────────┼────────────────┼──────────┼──────────┤   │        │
│  │  │ 1  │ abc123   │ ANGjdJ8wN...   │ doc.pdf  │ app/pdf  │   │        │
│  │  │ 2  │ abc123   │ ANGjdJ9xM...   │ img.jpg  │ img/jpeg │   │        │
│  │  │ 3  │ def456   │ ANGjdJ0yN...   │ file.xlsx│ app/xlsx │   │        │
│  │  └────┴──────────┴────────────────┴──────────┴──────────┘   │        │
│  │  + size, created_at                                          │        │
│  │                                                               │        │
│  │  ⚠️ NOTE: NO FILE CONTENT STORED!                            │        │
│  │           Only metadata (filename, size, type, etc.)         │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘


FLOW DIAGRAM: Email Processing with Attachments
================================================

1. User fetches email details
   └─> GET /gmail/{email_id}?extract_attachments=true
       │
       ├─> Gmail Service gets email from Gmail API
       │
       ├─> Attachment Service extracts metadata
       │   └─> Gmail Service: get_attachments_list()
       │       └─> Gmail API: messages.get()
       │
       ├─> Save metadata to attachments table
       │   (filename, size, mime_type, attachment_id)
       │
       └─> Return email + attachments metadata


2. User views attachment list
   └─> GET /attachment-manager/attachments?email_id={email_id}
       │
       └─> Query database (fast, metadata only)
           SELECT * FROM attachments WHERE email_id = ?
       │
       └─> Return: [{ id, filename, size, mime_type, ... }]


3. User downloads attachment
   └─> GET /attachment-manager/attachments/{email}/{attachment}/content
       │
       ├─> Get metadata from database
       │   SELECT * FROM attachments WHERE email_id=? AND attachment_id=?
       │
       ├─> Fetch content from Gmail (on-demand!)
       │   └─> Gmail Service: get_attachment_content()
       │       └─> Gmail API: attachments.get()
       │
       └─> Return: { filename, mime_type, data: "base64..." }


BENEFITS OF THIS ARCHITECTURE
==============================

✅ Storage Efficiency
   - Database stores only metadata (~100-200 bytes per attachment)
   - No file storage on server = no disk space issues
   - Scales to millions of attachments easily

✅ Performance
   - List attachments instantly (database query)
   - Content fetched only when needed
   - No large file transfers during listing

✅ Security
   - Files always in user's Gmail account
   - Server never stores sensitive content
   - Uses user's OAuth token for access

✅ Reliability
   - Source of truth is Gmail
   - No sync issues between server and Gmail
   - Automatic updates (always latest version)

✅ Cost Effective
   - Minimal storage requirements
   - Reduced bandwidth usage
   - No file management overhead


COMPARISON: Before vs After
============================

BEFORE (Traditional Approach):
  ❌ Download all attachments from Gmail
  ❌ Store files on server disk/S3
  ❌ Manage file lifecycle (cleanup, expiry)
  ❌ Large database/storage costs
  ❌ Slow listing (load all file data)
  ❌ Complex backup/restore

AFTER (Metadata-Only Approach):
  ✅ Store only metadata in database
  ✅ Fetch content on-demand from Gmail
  ✅ No file management needed
  ✅ Minimal storage costs
  ✅ Fast listing (metadata only)
  ✅ Simple backup (just database)


DATA FLOW EXAMPLE
=================

Email with 3 attachments (10MB total):

Traditional:
  Gmail → Download 10MB → Store on server → 10MB in database/disk
  User lists → Load 10MB from disk
  User downloads → Serve 10MB from disk

Metadata-Only:
  Gmail → Extract metadata (~300 bytes) → Store in database
  User lists → Load 300 bytes from database (instant!)
  User downloads → Fetch 10MB from Gmail (only when needed)

Storage saved: 10MB - 300 bytes ≈ 99.997% reduction!
```
