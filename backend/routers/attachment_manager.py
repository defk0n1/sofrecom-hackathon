"""
Router for attachment management - listing attachments and fetching content
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import sqlite3
import os
from services.gmail_service import GmailService
from services.attachment_service import AttachmentService
from models.schemas import AttachmentMetadata, AttachmentContentResponse

router = APIRouter(prefix="/attachment-manager", tags=["Attachment Management"])

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "email.db")

# Gmail service instance
gmail_service = None
attachment_service = None

def get_gmail_service():
    """Get or initialize Gmail service instance"""
    global gmail_service
    if gmail_service is None:
        gmail_service = GmailService()
    return gmail_service

def get_attachment_service():
    """Get or initialize Attachment service instance"""
    global attachment_service
    if attachment_service is None:
        attachment_service = AttachmentService()
    return attachment_service

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@router.get("/attachments", response_model=List[AttachmentMetadata])
async def get_user_attachments(
    email_id: Optional[str] = Query(None, description="Filter by specific email ID"),
    limit: int = Query(100, description="Maximum number of attachments to return"),
    offset: int = Query(0, description="Number of attachments to skip")
):
    """
    Get all attachments metadata for the authenticated user from the database.
    Does not include attachment content - only metadata.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if email_id:
            # Get attachments for a specific email
            query = """
                SELECT id, email_id, attachment_id, filename, mime_type, size, created_at
                FROM attachments
                WHERE email_id = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            """
            cursor.execute(query, (email_id, limit, offset))
        else:
            # Get all attachments
            query = """
                SELECT id, email_id, attachment_id, filename, mime_type, size, created_at
                FROM attachments
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            """
            cursor.execute(query, (limit, offset))
        
        attachments = []
        for row in cursor.fetchall():
            attachments.append(AttachmentMetadata(
                id=row['id'],
                email_id=row['email_id'],
                attachment_id=row['attachment_id'],
                filename=row['filename'],
                mime_type=row['mime_type'],
                size=row['size'],
                created_at=row['created_at']
            ))
        
        conn.close()
        return attachments
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching attachments: {str(e)}")

@router.get("/attachments/{email_id}/{attachment_id}/content", response_model=AttachmentContentResponse)
async def get_attachment_content(email_id: str, attachment_id: str):
    """
    Fetch the actual content of a specific attachment from Gmail.
    This is called on-demand when the user wants to view or download an attachment.
    """
    try:
        # First, get attachment metadata from database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT filename, mime_type, size
            FROM attachments
            WHERE email_id = ? AND attachment_id = ?
        """, (email_id, attachment_id))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            raise HTTPException(status_code=404, detail="Attachment not found in database")
        
        # Fetch the actual content from Gmail
        service = get_gmail_service()
        attachment_data = await service.get_attachment_content(email_id, attachment_id)
        
        return AttachmentContentResponse(
            filename=row['filename'],
            mime_type=row['mime_type'],
            size=row['size'],
            data=attachment_data['data']
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching attachment content: {str(e)}")

@router.get("/attachments/count")
async def get_attachments_count(email_id: Optional[str] = Query(None, description="Filter by specific email ID")):
    """
    Get the total count of attachments.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if email_id:
            cursor.execute("SELECT COUNT(*) as count FROM attachments WHERE email_id = ?", (email_id,))
        else:
            cursor.execute("SELECT COUNT(*) as count FROM attachments")
        
        count = cursor.fetchone()['count']
        conn.close()
        
        return {"count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error counting attachments: {str(e)}")

@router.post("/process-email-attachments/{email_id}")
async def process_email_attachments(email_id: str):
    """
    Extract and save attachment metadata from a specific email.
    This should be called during email analysis/processing.
    """
    try:
        service = get_attachment_service()
        attachments = await service.process_and_save_attachments(email_id)
        
        return {
            "status": "success",
            "email_id": email_id,
            "attachments_processed": len(attachments),
            "attachments": attachments
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing email attachments: {str(e)}")

@router.post("/process-multiple-emails")
async def process_multiple_emails(email_ids: List[str]):
    """
    Process attachments for multiple emails at once.
    """
    try:
        service = get_attachment_service()
        result = await service.process_multiple_emails(email_ids)
        
        return {
            "status": "success",
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing multiple emails: {str(e)}")
