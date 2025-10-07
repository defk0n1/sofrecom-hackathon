from pydantic import BaseModel, EmailStr
from typing import Optional, List


class EmailRequest(BaseModel):
    """Email request model"""
    to: EmailStr
    subject: str
    body: str
    cc: Optional[List[EmailStr]] = None
    bcc: Optional[List[EmailStr]] = None
    attachments: Optional[List[dict]] = None


class ReplyRequest(BaseModel):
    """Reply request model - doesn't require 'to' field as it's extracted from thread"""
    body: str
    cc: Optional[List[EmailStr]] = None
    bcc: Optional[List[EmailStr]] = None
    attachments: Optional[List[dict]] = None


class EmailResponse(BaseModel):
    """Email response model"""
    status: str
    message: str
    message_id: Optional[str] = None


class AuthResponse(BaseModel):
    """Authentication response model"""
    status: str
    message: str
    auth_url: Optional[str] = None
