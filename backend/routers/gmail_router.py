from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from dotenv import load_dotenv
from services.gmail_service import GmailService
from services.attachment_service import AttachmentService
from models.gmail import EmailRequest, EmailResponse, AuthResponse , ReplyRequest

load_dotenv()

router = APIRouter(prefix="/gmail", tags=["gmail"])

# Security (optional for now - we use OAuth tokens)
security = HTTPBearer(auto_error=False)

# Gmail service instance (singleton - auto-initializes on first request)
gmail_service = None
attachment_service = None


def get_gmail_service():
    """Get or initialize Gmail service instance - auto-authenticates"""
    global gmail_service
    if gmail_service is None:
        print("Initializing Gmail service...")
        gmail_service = GmailService()
    return gmail_service


def get_attachment_service():
    """Get or initialize Attachment service instance"""
    global attachment_service
    if attachment_service is None:
        attachment_service = AttachmentService()
    return attachment_service

@router.post("/auth/gmail", response_model=AuthResponse)
async def authenticate_gmail():
    """Initiate Gmail OAuth authentication"""
    try:
        auth_url = await get_gmail_service().get_auth_url()
        return AuthResponse(
            status="success",
            message="Authentication URL generated",
            auth_url=auth_url
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/auth/callback")
async def auth_callback(code: str):
    """Handle OAuth callback"""
    try:
        await get_gmail_service().handle_auth_callback(code)
        return {"status": "success", "message": "Authentication successful"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/")
async def get_emails(
    max_results: int = Query(20, description="Maximum number of emails to retrieve"),
    query: str = Query("", description="Gmail search query")
):
    """Get emails from Gmail - Authentication handled automatically"""
    try:
        emails = await get_gmail_service().get_emails(
            max_results=max_results,
            query=query
        )
        return {"status": "success", "emails": emails}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{email_id}")
async def get_email_detail(
    email_id: str,
    extract_attachments: bool = Query(True, description="Extract and save attachment metadata")
):
    """Get detailed information about a specific email and optionally extract attachments"""
    try:
        email_detail = await get_gmail_service().get_email_detail(email_id)
        
        # Extract and save attachment metadata if requested
        if extract_attachments:
            try:
                attachment_svc = get_attachment_service()
                attachments = await attachment_svc.process_and_save_attachments(email_id)
                email_detail['attachments_metadata'] = attachments
            except Exception as e:
                print(f"Warning: Failed to extract attachments for email {email_id}: {str(e)}")
                email_detail['attachments_metadata'] = []
        
        return {"status": "success", "email": email_detail}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{email_id}/attachments")
async def get_email_attachments(email_id: str):
    """Get list of attachments for a specific email from Gmail"""
    try:
        attachments = await get_gmail_service().get_attachments_list(email_id)
        return {"status": "success", "email_id": email_id, "attachments": attachments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send", response_model=EmailResponse)
async def send_email(email_request: EmailRequest):
    """Send an email"""
    try:
        result = await get_gmail_service().send_email(
            to=email_request.to,
            subject=email_request.subject,
            body=email_request.body,
            cc=email_request.cc,
            bcc=email_request.bcc,
            attachments=email_request.attachments
        )
        return EmailResponse(
            status="success",
            message="Email sent successfully",
            message_id=result.get("id")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{email_id}/reply", response_model=EmailResponse)
async def reply_to_email(
    email_id: str,
    reply_request: ReplyRequest
):
    """Reply to a specific email"""
    try:
        result = await get_gmail_service().reply_to_email(
            email_id=email_id,
            body=reply_request.body,
            cc=reply_request.cc,
            bcc=reply_request.bcc
        )
        return EmailResponse(
            status="success",
            message="Reply sent successfully",
            message_id=result.get("id")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{email_id}/reply-all", response_model=EmailResponse)
async def reply_to_all(
    email_id: str,
    reply_request: ReplyRequest
):
    """Reply to all recipients of a specific email"""
    try:
        result = await get_gmail_service().reply_to_all(
            email_id=email_id,
            body=reply_request.body,
            cc=reply_request.cc,
            bcc=reply_request.bcc
        )
        return EmailResponse(
            status="success",
            message="Reply to all sent successfully",
            message_id=result.get("id")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{email_id}/forward", response_model=EmailResponse)
async def forward_email(
    email_id: str,
    email_request: EmailRequest
):
    """Forward a specific email"""
    try:
        result = await get_gmail_service().forward_email(
            email_id=email_id,
            to=email_request.to,
            body=email_request.body or "",
            cc=email_request.cc,
            bcc=email_request.bcc
        )
        return EmailResponse(
            status="success",
            message="Email forwarded successfully",
            message_id=result.get("id")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{email_id}")
async def delete_email(email_id: str):
    """Delete an email"""
    try:
        await get_gmail_service().delete_email(email_id)
        return {"status": "success", "message": "Email deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{email_id}/mark-read")
async def mark_email_as_read(email_id: str):
    """Mark an email as read"""
    try:
        await get_gmail_service().mark_as_read(email_id)
        return {"status": "success", "message": "Email marked as read"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{email_id}/mark-unread")
async def mark_email_as_unread(email_id: str):
    """Mark an email as unread"""
    try:
        await get_gmail_service().mark_as_unread(email_id)
        return {"status": "success", "message": "Email marked as unread"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/labels")
async def get_labels():
    """Get all Gmail labels"""
    try:
        labels = await get_gmail_service().get_labels()
        return {"status": "success", "labels": labels}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{email_id}/add-label")
async def add_label_to_email(
    email_id: str,
    label_id: str = Query(..., description="Label ID to add")
):
    """Add a label to an email"""
    try:
        await get_gmail_service().add_label(email_id, label_id)
        return {"status": "success", "message": "Label added successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{email_id}/remove-label")
async def remove_label_from_email(
    email_id: str,
    label_id: str = Query(..., description="Label ID to remove")
):
    """Remove a label from an email"""
    try:
        await get_gmail_service().remove_label(email_id, label_id)
        return {"status": "success", "message": "Label removed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
