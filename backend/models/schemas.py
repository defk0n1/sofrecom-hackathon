from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"

class ChatMessage(BaseModel):
    role: MessageRole
    content: str

class ChatRequest(BaseModel):
    history: List[ChatMessage] = Field(default_factory=list)
    user_input: str
    context: Optional[str] = None  # Email context for chat

class EmailProcessRequest(BaseModel):
    email_text: Optional[str] = None
    email_html: Optional[str] = None

class TranslateRequest(BaseModel):
    text: str
    target_language: str = "French"
    source_language: Optional[str] = None

class TaskDetectionRequest(BaseModel):
    email_text: str

class MeetingSuggestionRequest(BaseModel):
    email_text: str
    user_availability: Optional[List[str]] = None  # ISO format dates

class AttachmentInfo(BaseModel):
    filename: str
    category: str
    size: Optional[int] = None
    mime_type: Optional[str] = None

class EmailAnalysisResponse(BaseModel):
    summary: str
    key_points: List[str]
    sentiment: str
    urgency: str  # low, medium, high, critical
    tasks: List[Dict[str, Any]]
    meeting_suggestions: List[Dict[str, Any]]
    attachments: List[AttachmentInfo]
    translation: Optional[str] = None
    language_detected: Optional[str] = None

class AttachmentQueryRequest(BaseModel):
    filename: str
    query: str
    file_content_base64: Optional[str] = None

class ExcelOperationRequest(BaseModel):
    filename: str
    operation: str  # "read_sheet", "sum_column", "filter_rows", "get_cell", "statistics"
    file_content_base64: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    # parameters can include: sheet_name, column_name, row_range, cell_reference, etc.

class CSVOperationRequest(BaseModel):
    filename: str
    operation: str  # "read_rows", "sum_column", "filter", "statistics", "group_by"
    file_content_base64: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    # parameters: start_row, end_row, column_name, filter_condition, etc.

class PDFExtractRequest(BaseModel):
    filename: str
    file_content_base64: str
    page_range: Optional[str] = None  # e.g., "1-5" or "all"
    extract_images: bool = False

class TaskItem(BaseModel):
    task: str
    priority: str  # low, medium, high
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None

class MeetingSuggestion(BaseModel):
    title: str
    suggested_date: Optional[str] = None
    suggested_time: Optional[str] = None
    duration: Optional[str] = None
    attendees: List[str] = Field(default_factory=list)
    location: Optional[str] = None
    notes: Optional[str] = None