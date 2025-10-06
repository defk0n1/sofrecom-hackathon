from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from services.gmail_service import GmailService
from models.gmail_models import EmailRequest, EmailResponse, AuthResponse

router = APIRouter(prefix="/gmail", tags=["Gmail"])
security = HTTPBearer()

# Gmail service instance (lazy initialization)
gmail_service = None


def get_gmail_service():
    """Get or initialize Gmail service instance"""
    global gmail_service
    if gmail_service is None:
        gmail_service = GmailService()
    return gmail_service


@router.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Gmail API is integrated!", "version": "1.0.0"}


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "gmail-api"}


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
        credentials = await get_gmail_service().handle_auth_callback(code)
        return {"status": "success", "message": "Authentication successful"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/emails")
async def get_emails(
    max_results: int = 10,
    query: str = "",
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get emails from Gmail"""
    try:
        emails = await get_gmail_service().get_emails(
            max_results=max_results,
            query=query
        )
        return {"status": "success", "emails": emails}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/emails/{email_id}")
async def get_email_detail(
    email_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get detailed information about a specific email"""
    try:
        email_detail = await get_gmail_service().get_email_detail(email_id)
        return {"status": "success", "email": email_detail}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/emails/send", response_model=EmailResponse)
async def send_email(
    email_request: EmailRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
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


@router.post("/emails/{email_id}/reply", response_model=EmailResponse)
async def reply_to_email(
    email_id: str,
    email_request: EmailRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Reply to a specific email"""
    try:
        result = await get_gmail_service().reply_to_email(
            email_id=email_id,
            body=email_request.body,
            cc=email_request.cc,
            bcc=email_request.bcc
        )
        return EmailResponse(
            status="success",
            message="Reply sent successfully",
            message_id=result.get("id")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/emails/{email_id}/forward", response_model=EmailResponse)
async def forward_email(
    email_id: str,
    email_request: EmailRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
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


@router.delete("/emails/{email_id}")
async def delete_email(
    email_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete an email"""
    try:
        await get_gmail_service().delete_email(email_id)
        return {"status": "success", "message": "Email deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/emails/{email_id}/mark-read")
async def mark_email_as_read(
    email_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Mark an email as read"""
    try:
        await get_gmail_service().mark_as_read(email_id)
        return {"status": "success", "message": "Email marked as read"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/emails/{email_id}/mark-unread")
async def mark_email_as_unread(
    email_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Mark an email as unread"""
    try:
        await get_gmail_service().mark_as_unread(email_id)
        return {"status": "success", "message": "Email marked as unread"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/labels")
async def get_labels(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all Gmail labels"""
    try:
        labels = await get_gmail_service().get_labels()
        return {"status": "success", "labels": labels}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/emails/{email_id}/add-label")
async def add_label_to_email(
    email_id: str,
    label_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Add a label to an email"""
    try:
        await get_gmail_service().add_label(email_id, label_id)
        return {"status": "success", "message": "Label added successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/emails/{email_id}/remove-label")
async def remove_label_from_email(
    email_id: str,
    label_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Remove a label from an email"""
    try:
        await get_gmail_service().remove_label(email_id, label_id)
        return {"status": "success", "message": "Label removed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
