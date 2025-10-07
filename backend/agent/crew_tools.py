import json
import asyncio
import traceback
from typing import List, Optional, Any, Dict
from crewai.tools import BaseTool
from pydantic import BaseModel, Field, validator
from services.gemini_service import GeminiService
from services.gmail_service import GmailService
from services.calendar_service import CalendarService
from routers.utils import FileProcessor
from services.attachment_handler import AttachmentProcessor, AttachmentFormatter
import base64
# Single shared service instances
try:
    gemini_service = GeminiService()
except Exception as e:
    print(f"[CrewTools] Warning: GeminiService init failed: {e}")
    gemini_service = None

try:
    gmail_service = GmailService()
except Exception as e:
    print(f"[CrewTools] Warning: GmailService init failed: {e}")
    gmail_service = None

try:
    calendar_service = CalendarService()
except Exception as e:
    print(f"[CrewTools] Warning: CalendarService init failed: {e}")
    calendar_service = None


def _ensure_gemini_service():
    if not gemini_service:
        raise RuntimeError("Gemini service not initialized (GEMINI_API_KEY missing?)")

def _ensure_gmail_service():
    if not gmail_service:
        raise RuntimeError("Gmail service not initialized (authentication missing?)")

def _ensure_calendar_service():
    if not calendar_service:
        raise RuntimeError("Calendar service not initialized (authentication missing?)")


# ============================================================================
# HELPER FUNCTION WITH ERROR HANDLING
# ============================================================================

def safe_run_async(coro, tool_name: str = "unknown"):
    """
    Run async coroutine with comprehensive error handling
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            import threading
            
            result = [None]
            exception = [None]
            
            def run_in_thread():
                try:
                    new_loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(new_loop)
                    result[0] = new_loop.run_until_complete(coro)
                    new_loop.close()
                except Exception as e:
                    exception[0] = e
            
            thread = threading.Thread(target=run_in_thread)
            thread.start()
            thread.join()
            
            if exception[0]:
                raise exception[0]
            return result[0]
        else:
            return loop.run_until_complete(coro)
    except Exception as e:
        print(f"[{tool_name}] Async execution error: {str(e)}")
        print(traceback.format_exc())
        raise


# ============================================================================
# PYDANTIC SCHEMAS WITH VALIDATORS
# ============================================================================

class TranslateTextSchema(BaseModel):
    text: str = Field(..., description="Text to translate")
    target_language: str = Field(..., description="Target language for translation")
    source_language: Optional[str] = Field(default=None, description="Source language (auto-detect if not provided)")


class SuggestMeetingsSchema(BaseModel):
    email_text: str = Field(..., description="Email text to analyze")
    user_availability: Optional[List[str]] = Field(default=None, description="User's available time slots")
    
    @validator('user_availability', pre=True, always=True)
    def ensure_list(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            return [v]
        return v


class ChatWithContextSchema(BaseModel):
    user_input: str = Field(..., description="Current user input or question")
    history: List[Dict[str, str]] = Field(default_factory=list, description="Conversation history (optional)")
    context: Optional[str] = Field(default=None, description="Additional context like email content (optional)")
    
    @validator('history', pre=True, always=True)
    def ensure_history_list(cls, v):
        if v is None or v == "":
            return []
        if not isinstance(v, list):
            return []
        return v


class ClassifyAttachmentSchema(BaseModel):
    filename: str = Field(..., description="Attachment filename")
    preview_text: Optional[str] = Field(default=None, description="Preview of file content")


class QueryAttachmentSchema(BaseModel):
    filename: str = Field(..., description="Attachment filename")
    file_content_base64: str = Field(..., description="Base64 encoded file content")
    query: str = Field(..., description="Question about the attachment")


# Gmail Schemas
class GetEmailsSchema(BaseModel):
    max_results: int = Field(default=10, ge=1, le=100, description="Maximum number of emails to retrieve")
    query: str = Field(default="", description="Gmail search query")


class GetEmailDetailSchema(BaseModel):
    email_id: str = Field(..., description="Email ID to retrieve")


class SendEmailSchema(BaseModel):
    to: str = Field(..., description="Recipient email address")
    subject: str = Field(..., description="Email subject")
    body: str = Field(..., description="Email body text")
    cc: Optional[List[str]] = Field(default=None, description="CC recipients")
    bcc: Optional[List[str]] = Field(default=None, description="BCC recipients")
    
    @validator('cc', 'bcc', pre=True, always=True)
    def ensure_email_list(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            return [v]
        return v


class ReplyToEmailSchema(BaseModel):
    email_id: str = Field(..., description="ID of email to reply to")
    body: str = Field(..., description="Reply message body")
    cc: Optional[List[str]] = Field(default=None, description="CC recipients")
    bcc: Optional[List[str]] = Field(default=None, description="BCC recipients")
    
    @validator('cc', 'bcc', pre=True, always=True)
    def ensure_email_list(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            return [v]
        return v


class MarkEmailSchema(BaseModel):
    email_id: str = Field(..., description="Email ID")


class DeleteEmailSchema(BaseModel):
    email_id: str = Field(..., description="Email ID to delete")


class AddEmailLabelSchema(BaseModel):
    email_id: str = Field(..., description="Email ID")
    label_id: str = Field(..., description="Label ID to add")


# Calendar Schemas
class GetUpcomingEventsSchema(BaseModel):
    max_results: int = Field(default=10, ge=1, le=100, description="Maximum number of events")
    time_min: Optional[str] = Field(default=None, description="Minimum time (ISO format)")
    time_max: Optional[str] = Field(default=None, description="Maximum time (ISO format)")


class CreateCalendarEventSchema(BaseModel):
    summary: str = Field(..., description="Event title")
    start_time: str = Field(..., description="Start time (ISO format, e.g., 2025-10-08T10:00:00Z)")
    end_time: str = Field(..., description="End time (ISO format, e.g., 2025-10-08T11:00:00Z)")
    description: Optional[str] = Field(default=None, description="Event description")
    location: Optional[str] = Field(default=None, description="Event location")
    attendees: Optional[List[str]] = Field(default=None, description="Attendee email addresses")
    timezone: str = Field(default='UTC', description="Timezone")
    
    @validator('attendees', pre=True, always=True)
    def ensure_attendees_list(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            return [v]
        return v


class UpdateCalendarEventSchema(BaseModel):
    event_id: str = Field(..., description="Event ID to update")
    summary: Optional[str] = Field(default=None, description="Event title")
    start_time: Optional[str] = Field(default=None, description="Start time (ISO format)")
    end_time: Optional[str] = Field(default=None, description="End time (ISO format)")
    description: Optional[str] = Field(default=None, description="Event description")
    location: Optional[str] = Field(default=None, description="Event location")
    attendees: Optional[List[str]] = Field(default=None, description="Attendee email addresses")
    timezone: str = Field(default='UTC', description="Timezone")
    
    @validator('attendees', pre=True, always=True)
    def ensure_attendees_list(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            return [v]
        return v


class DeleteCalendarEventSchema(BaseModel):
    event_id: str = Field(..., description="Event ID to delete")


class GetCalendarEventDetailSchema(BaseModel):
    event_id: str = Field(..., description="Event ID to retrieve")


class GetAttachmentsSchema(BaseModel):
    email_id: str = Field(..., description="Email ID to get attachments from")


class DownloadAttachmentSchema(BaseModel):
    email_id: str = Field(..., description="Email ID")
    attachment_id: str = Field(..., description="Attachment ID to download")


class ProcessAttachmentsSchema(BaseModel):
    email_id: str = Field(..., description="Email ID to process attachments from")
    save_to_disk: bool = Field(default=False, description="Save files to disk")
    output_dir: str = Field(default='attachments', description="Directory to save files")



# ============================================================================
# EMAIL ANALYSIS TOOLS
# ============================================================================

class ProcessEmailTool(BaseTool):
    name: str = "process_email"
    description: str = (
        "Analyze raw email text and extract insights, tasks, meetings, sentiment, and classification. "
        "Required: email_text:str"
    )

    def _run(self, email_text: str) -> Dict[str, Any]:
        try:
            _ensure_gemini_service()
            analysis = gemini_service.analyze_email(email_text, attachments_info=[])
            return analysis
        except RuntimeError as e:
            return {
                "error": "Service unavailable",
                "details": str(e),
                "suggestion": "Please ensure Gemini service is properly configured"
            }
        except Exception as e:
            return {
                "error": f"Email analysis failed: {str(e)}",
                "suggestion": "Please check that email_text contains valid content"
            }


class DetectTasksTool(BaseTool):
    name: str = "detect_tasks"
    description: str = (
        "Extract actionable tasks from an email body. "
        "Required: email_text:str"
    )

    def _run(self, email_text: str) -> Dict[str, Any]:
        try:
            _ensure_gemini_service()
            tasks = gemini_service.detect_tasks(email_text)
            return {"tasks": tasks, "count": len(tasks)}
        except RuntimeError as e:
            return {
                "error": "Service unavailable",
                "details": str(e),
                "tasks": [],
                "count": 0
            }
        except Exception as e:
            return {
                "error": f"Task detection failed: {str(e)}",
                "suggestion": "Please ensure email_text contains valid content",
                "tasks": [],
                "count": 0
            }


class SuggestMeetingsTool(BaseTool):
    name: str = "suggest_meetings"
    description: str = (
        "Suggest meeting proposals from email content. "
        "Required: email_text:str. "
        "Optional: user_availability:List[str] (e.g., ['Monday 2-4pm', 'Tuesday morning'])"
    )
    args_schema: type[BaseModel] = SuggestMeetingsSchema

    def _run(self, email_text: str, user_availability: Optional[List[str]] = None) -> Dict[str, Any]:
        try:
            _ensure_gemini_service()
            availability = user_availability if user_availability is not None else []
            meetings = gemini_service.suggest_meetings(email_text, availability)
            return {"meetings": meetings, "count": len(meetings)}
        except RuntimeError as e:
            return {
                "error": "Service unavailable",
                "details": str(e),
                "meetings": [],
                "count": 0
            }
        except Exception as e:
            return {
                "error": f"Meeting suggestion failed: {str(e)}",
                "suggestion": "Please check that email_text contains valid content",
                "meetings": [],
                "count": 0
            }


class TranslateTextTool(BaseTool):
    name: str = "translate_text"
    description: str = (
        "Translate text to target language. "
        "Required: text:str, target_language:str. "
        "Optional: source_language:str"
    )
    args_schema: type[BaseModel] = TranslateTextSchema

    def _run(self, text: str, target_language: str, source_language: Optional[str] = None) -> Dict[str, Any]:
        try:
            _ensure_gemini_service()
            translation = gemini_service.translate_text(text, target_language, source_language)
            return {"translation": translation}
        except RuntimeError as e:
            return {
                "error": "Service unavailable",
                "details": str(e),
                "suggestion": "Please ensure Gemini service is properly configured"
            }
        except Exception as e:
            return {
                "error": f"Translation failed: {str(e)}",
                "suggestion": "Check that target_language is valid (e.g., 'English', 'French', 'Spanish')"
            }


class ChatWithContextTool(BaseTool):
    name: str = "chat_with_context"
    description: str = (
        "Chat with AI about an email or conversation. "
        "Required: user_input:str (your question). "
        "Optional: history:List[Dict] (previous messages), context:str (email content). "
        "History format: [{'role': 'user'/'assistant', 'content': 'message'}]"
    )
    args_schema: type[BaseModel] = ChatWithContextSchema

    def _run(
        self,
        user_input: str,
        history: Optional[List[Dict[str, str]]] = None,
        context: Optional[str] = None
    ) -> Dict[str, Any]:
        try:
            _ensure_gemini_service()
            
            # Ensure history is a list
            if history is None:
                history = []
            
            messages = history + [{"role": "user", "content": user_input}]
            response = gemini_service.chat_with_context(messages, context)
            
            return {"response": response}
        except RuntimeError as e:
            return {
                "error": "Service unavailable",
                "details": str(e),
                "response": "I'm unable to process your request at the moment. Please ensure the service is properly configured."
            }
        except Exception as e:
            return {
                "error": f"Chat execution failed: {str(e)}",
                "suggestion": "Please ensure the question is clear and context is properly formatted",
                "response": f"I encountered an error: {str(e)}"
            }


class ClassifyAttachmentTool(BaseTool):
    name: str = "classify_attachment"
    description: str = (
        "Classify an attachment by filename and optional preview text. "
        "Required: filename:str. "
        "Optional: preview_text:str"
    )
    args_schema: type[BaseModel] = ClassifyAttachmentSchema

    def _run(self, filename: str, preview_text: Optional[str] = None) -> Dict[str, Any]:
        try:
            _ensure_gemini_service()
            classification = gemini_service.classify_attachment(filename, preview_text)
            return {"filename": filename, "classification": classification}
        except RuntimeError as e:
            return {
                "error": "Service unavailable",
                "details": str(e),
                "filename": filename,
                "classification": {"category": "unknown", "error": str(e)}
            }
        except Exception as e:
            return {
                "error": f"Attachment classification failed: {str(e)}",
                "filename": filename,
                "classification": {"category": "unknown", "error": str(e)}
            }


class QueryAttachmentTool(BaseTool):
    name: str = "query_attachment"
    description: str = (
        "Ask a question about an attachment file content. "
        "Required: filename:str, file_content_base64:str, query:str"
    )
    args_schema: type[BaseModel] = QueryAttachmentSchema

    def _run(self, filename: str, file_content_base64: str, query: str) -> Dict[str, Any]:
        try:
            _ensure_gemini_service()
            import base64
            
            try:
                raw_bytes = base64.b64decode(file_content_base64)
            except Exception as decode_err:
                return {
                    "error": "Invalid base64 content",
                    "details": str(decode_err),
                    "filename": filename,
                    "query": query,
                    "answer": "Unable to decode attachment content"
                }
            
            extracted_text = FileProcessor.extract_text_from_file(raw_bytes, filename)
            messages = [{"role": "user", "content": f"Attachment content:\n{extracted_text}\n\nQuestion: {query}"}]
            answer = gemini_service.chat_with_context(messages, None)
            
            return {"filename": filename, "query": query, "answer": answer}
        except RuntimeError as e:
            return {
                "error": "Service unavailable",
                "details": str(e),
                "filename": filename,
                "query": query,
                "answer": "Service is currently unavailable"
            }
        except Exception as e:
            return {
                "error": f"Attachment query failed: {str(e)}",
                "filename": filename,
                "query": query,
                "answer": f"Unable to process query: {str(e)}"
            }


# ============================================================================
# GMAIL TOOLS
# ============================================================================

class GetEmailsTool(BaseTool):
    name: str = "get_emails"
    description: str = (
        "Retrieve emails from Gmail inbox. "
        "Optional: max_results:int (default 10, max 100), query:str (Gmail search query). "
        "Query examples: 'from:boss@company.com', 'subject:meeting', 'is:unread'"
    )
    args_schema: type[BaseModel] = GetEmailsSchema

    def _run(self, max_results: int = 10, query: str = "") -> Dict[str, Any]:
        try:
            _ensure_gmail_service()
            emails = safe_run_async(
                gmail_service.get_emails(max_results=max_results, query=query),
                tool_name="get_emails"
            )
            return {"emails": emails, "count": len(emails)}
        except RuntimeError as e:
            return {
                "error": "Gmail service unavailable",
                "details": str(e),
                "suggestion": "Please ensure Gmail authentication is completed",
                "emails": [],
                "count": 0
            }
        except Exception as e:
            return {
                "error": f"Failed to retrieve emails: {str(e)}",
                "suggestion": "Check your query syntax or network connection",
                "emails": [],
                "count": 0
            }


class GetEmailDetailTool(BaseTool):
    name: str = "get_email_detail"
    description: str = (
        "Get detailed information about a specific email. "
        "Required: email_id:str (get from get_emails tool first)"
    )
    args_schema: type[BaseModel] = GetEmailDetailSchema

    def _run(self, email_id: str) -> Dict[str, Any]:
        try:
            _ensure_gmail_service()
            email_detail = safe_run_async(
                gmail_service.get_email_detail(email_id),
                tool_name="get_email_detail"
            )
            return email_detail
        except RuntimeError as e:
            return {
                "error": "Gmail service unavailable",
                "details": str(e),
                "email_id": email_id
            }
        except Exception as e:
            return {
                "error": f"Failed to get email detail: {str(e)}",
                "suggestion": "Check that email_id is valid",
                "email_id": email_id
            }


class SendEmailTool(BaseTool):
    name: str = "send_email"
    description: str = (
        "Send an email via Gmail. "
        "Required: to:str (recipient email), subject:str, body:str. "
        "Optional: cc:List[str], bcc:List[str]"
    )
    args_schema: type[BaseModel] = SendEmailSchema
    requires_confirmation: bool = True
    risk_level: str = "high"

    def _run(
        self,
        to: str,
        subject: str,
        body: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        try:
            _ensure_gmail_service()
            result = safe_run_async(
                gmail_service.send_email(to=to, subject=subject, body=body, cc=cc, bcc=bcc),
                tool_name="send_email"
            )
            return {"status": "sent", "message_id": result.get("id"), "result": result}
        except RuntimeError as e:
            return {
                "error": "Gmail service unavailable",
                "details": str(e),
                "status": "failed",
                "suggestion": "Please ensure Gmail authentication is completed"
            }
        except Exception as e:
            return {
                "error": f"Email sending failed: {str(e)}",
                "status": "failed",
                "suggestion": "Check that 'to' is a valid email address and all required fields are provided"
            }


class ReplyToEmailTool(BaseTool):
    name: str = "reply_to_email"
    description: str = (
        "Reply to a specific email. "
        "Required: email_id:str (from get_emails), body:str. "
        "Optional: cc:List[str], bcc:List[str]"
    )
    args_schema: type[BaseModel] = ReplyToEmailSchema
    requires_confirmation: bool = True
    risk_level: str = "medium"

    def _run(
        self,
        email_id: str,
        body: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        try:
            _ensure_gmail_service()
            result = safe_run_async(
                gmail_service.reply_to_email(email_id=email_id, body=body, cc=cc, bcc=bcc),
                tool_name="reply_to_email"
            )
            return {"status": "replied", "message_id": result.get("id"), "result": result}
        except RuntimeError as e:
            return {
                "error": "Gmail service unavailable",
                "details": str(e),
                "status": "failed"
            }
        except Exception as e:
            return {
                "error": f"Reply failed: {str(e)}",
                "status": "failed",
                "suggestion": "Check that email_id is valid and you have permission to reply"
            }


class MarkEmailAsReadTool(BaseTool):
    name: str = "mark_email_as_read"
    description: str = (
        "Mark an email as read. "
        "Required: email_id:str"
    )
    args_schema: type[BaseModel] = MarkEmailSchema

    def _run(self, email_id: str) -> Dict[str, Any]:
        try:
            _ensure_gmail_service()
            gmail_service.mark_as_read(email_id)
            return {"status": "marked_as_read", "email_id": email_id}
        except RuntimeError as e:
            return {
                "error": "Gmail service unavailable",
                "details": str(e),
                "status": "failed",
                "email_id": email_id
            }
        except Exception as e:
            return {
                "error": f"Failed to mark as read: {str(e)}",
                "status": "failed",
                "email_id": email_id
            }


class MarkEmailAsUnreadTool(BaseTool):
    name: str = "mark_email_as_unread"
    description: str = (
        "Mark an email as unread. "
        "Required: email_id:str"
    )
    args_schema: type[BaseModel] = MarkEmailSchema

    def _run(self, email_id: str) -> Dict[str, Any]:
        try:
            _ensure_gmail_service()
            gmail_service.mark_as_unread(email_id)
            return {"status": "marked_as_unread", "email_id": email_id}
        except RuntimeError as e:
            return {
                "error": "Gmail service unavailable",
                "details": str(e),
                "status": "failed",
                "email_id": email_id
            }
        except Exception as e:
            return {
                "error": f"Failed to mark as unread: {str(e)}",
                "status": "failed",
                "email_id": email_id
            }


class DeleteEmailTool(BaseTool):
    name: str = "delete_email"
    description: str = (
        "Delete an email permanently. "
        "Required: email_id:str. "
        "WARNING: This action cannot be undone!"
    )
    args_schema: type[BaseModel] = DeleteEmailSchema
    requires_confirmation: bool = True
    risk_level: str = "high"

    def _run(self, email_id: str) -> Dict[str, Any]:
        try:
            _ensure_gmail_service()
            gmail_service.delete_email(email_id)
            return {"status": "deleted", "email_id": email_id}
        except RuntimeError as e:
            return {
                "error": "Gmail service unavailable",
                "details": str(e),
                "status": "failed",
                "email_id": email_id
            }
        except Exception as e:
            return {
                "error": f"Deletion failed: {str(e)}",
                "status": "failed",
                "email_id": email_id,
                "suggestion": "Check that email_id is valid and you have permission to delete"
            }


class GetGmailLabelsTool(BaseTool):
    name: str = "get_gmail_labels"
    description: str = (
        "Get all Gmail labels/folders. No inputs required."
    )

    def _run(self) -> Dict[str, Any]:
        try:
            _ensure_gmail_service()
            labels = gmail_service.get_labels()
            return {"labels": labels, "count": len(labels)}
        except RuntimeError as e:
            return {
                "error": "Gmail service unavailable",
                "details": str(e),
                "labels": [],
                "count": 0
            }
        except Exception as e:
            return {
                "error": f"Failed to get labels: {str(e)}",
                "labels": [],
                "count": 0
            }


class AddEmailLabelTool(BaseTool):
    name: str = "add_email_label"
    description: str = (
        "Add a label to an email. "
        "Required: email_id:str, label_id:str (get label_id from get_gmail_labels)"
    )
    args_schema: type[BaseModel] = AddEmailLabelSchema

    def _run(self, email_id: str, label_id: str) -> Dict[str, Any]:
        try:
            _ensure_gmail_service()
            gmail_service.add_label(email_id, label_id)
            return {"status": "label_added", "email_id": email_id, "label_id": label_id}
        except RuntimeError as e:
            return {
                "error": "Gmail service unavailable",
                "details": str(e),
                "status": "failed",
                "email_id": email_id,
                "label_id": label_id
            }
        except Exception as e:
            return {
                "error": f"Failed to add label: {str(e)}",
                "status": "failed",
                "email_id": email_id,
                "label_id": label_id,
                "suggestion": "Check that both email_id and label_id are valid"
            }


# ============================================================================
# CALENDAR TOOLS
# ============================================================================

class GetUpcomingEventsTool(BaseTool):
    name: str = "get_upcoming_events"
    description: str = (
        "Get upcoming calendar events. "
        "Optional: max_results:int (default 10, max 100), time_min:str (ISO format), time_max:str (ISO format). "
        "Current date/time: 2025-10-07 02:52:45 UTC"
    )
    args_schema: type[BaseModel] = GetUpcomingEventsSchema

    def _run(
        self,
        max_results: int = 10,
        time_min: Optional[str] = None,
        time_max: Optional[str] = None
    ) -> Dict[str, Any]:
        try:
            _ensure_calendar_service()
            events = safe_run_async(
                calendar_service.get_upcoming_events(
                    max_results=max_results, time_min=time_min, time_max=time_max
                ),
                tool_name="get_upcoming_events"
            )
            return {"events": events, "count": len(events)}
        except RuntimeError as e:
            return {
                "error": "Calendar service unavailable",
                "details": str(e),
                "suggestion": "Please ensure Calendar authentication is completed",
                "events": [],
                "count": 0
            }
        except Exception as e:
            return {
                "error": f"Failed to retrieve events: {str(e)}",
                "suggestion": "Check that time_min and time_max are in ISO format if provided",
                "events": [],
                "count": 0
            }


class CreateCalendarEventTool(BaseTool):
    name: str = "create_calendar_event"
    description: str = (
        "Create a new calendar event. "
        "Required: summary:str (title), start_time:str (ISO format like '2025-10-08T10:00:00Z'), end_time:str. "
        "Optional: description:str, location:str, attendees:List[str] (email addresses), timezone:str (default 'UTC'). "
        "Current date/time: 2025-10-07 02:52:45 UTC"
    )
    args_schema: type[BaseModel] = CreateCalendarEventSchema
    requires_confirmation: bool = True
    risk_level: str = "medium"

    def _run(
        self,
        summary: str,
        start_time: str,
        end_time: str,
        description: Optional[str] = None,
        location: Optional[str] = None,
        attendees: Optional[List[str]] = None,
        timezone: str = 'UTC'
    ) -> Dict[str, Any]:
        try:
            _ensure_calendar_service()
            event = safe_run_async(
                calendar_service.create_event(
                    summary=summary,
                    start_time=start_time,
                    end_time=end_time,
                    description=description,
                    location=location,
                    attendees=attendees,
                    timezone=timezone
                ),
                tool_name="create_calendar_event"
            )
            return {"status": "created", "event": event}
        except RuntimeError as e:
            return {
                "error": "Calendar service unavailable",
                "details": str(e),
                "status": "failed",
                "suggestion": "Please ensure Calendar authentication is completed"
            }
        except Exception as e:
            return {
                "error": f"Calendar event creation failed: {str(e)}",
                "status": "failed",
                "suggestion": "Check that start_time and end_time are in ISO format (YYYY-MM-DDTHH:MM:SSZ). Example: 2025-10-08T10:00:00Z"
            }


class UpdateCalendarEventTool(BaseTool):
    name: str = "update_calendar_event"
    description: str = (
        "Update an existing calendar event. "
        "Required: event_id:str (from get_upcoming_events). "
        "Optional: summary:str, start_time:str (ISO format), end_time:str, description:str, location:str, "
        "attendees:List[str], timezone:str (default 'UTC')"
    )
    args_schema: type[BaseModel] = UpdateCalendarEventSchema
    requires_confirmation: bool = True
    risk_level: str = "medium"

    def _run(
        self,
        event_id: str,
        summary: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        description: Optional[str] = None,
        location: Optional[str] = None,
        attendees: Optional[List[str]] = None,
        timezone: str = 'UTC'
    ) -> Dict[str, Any]:
        try:
            _ensure_calendar_service()
            event = safe_run_async(
                calendar_service.update_event(
                    event_id=event_id,
                    summary=summary,
                    start_time=start_time,
                    end_time=end_time,
                    description=description,
                    location=location,
                    attendees=attendees,
                    timezone=timezone
                ),
                tool_name="update_calendar_event"
            )
            return {"status": "updated", "event": event}
        except RuntimeError as e:
            return {
                "error": "Calendar service unavailable",
                "details": str(e),
                "status": "failed",
                "event_id": event_id
            }
        except Exception as e:
            return {
                "error": f"Calendar event update failed: {str(e)}",
                "status": "failed",
                "event_id": event_id,
                "suggestion": "Check that event_id is valid and timestamps are in ISO format if provided"
            }


class DeleteCalendarEventTool(BaseTool):
    name: str = "delete_calendar_event"
    description: str = (
        "Delete a calendar event. "
        "Required: event_id:str (from get_upcoming_events). "
        "WARNING: This action cannot be undone!"
    )
    args_schema: type[BaseModel] = DeleteCalendarEventSchema
    requires_confirmation: bool = True
    risk_level: str = "high"

    def _run(self, event_id: str) -> Dict[str, Any]:
        try:
            _ensure_calendar_service()
            result = safe_run_async(
                calendar_service.delete_event(event_id),
                tool_name="delete_calendar_event"
            )
            return {"status": "deleted", "event_id": event_id, "result": result}
        except RuntimeError as e:
            return {
                "error": "Calendar service unavailable",
                "details": str(e),
                "status": "failed",
                "event_id": event_id
            }
        except Exception as e:
            return {
                "error": f"Calendar event deletion failed: {str(e)}",
                "status": "failed",
                "event_id": event_id,
                "suggestion": "Check that event_id is valid and you have permission to delete"
            }


class GetCalendarEventDetailTool(BaseTool):
    name: str = "get_calendar_event_detail"
    description: str = (
        "Get detailed information about a specific calendar event. "
        "Required: event_id:str (from get_upcoming_events)"
    )
    args_schema: type[BaseModel] = GetCalendarEventDetailSchema

    def _run(self, event_id: str) -> Dict[str, Any]:
        try:
            _ensure_calendar_service()
            event = safe_run_async(
                calendar_service.get_event_detail(event_id),
                tool_name="get_calendar_event_detail"
            )
            return {"event": event}
        except RuntimeError as e:
            return {
                "error": "Calendar service unavailable",
                "details": str(e),
                "event_id": event_id
            }
        except Exception as e:
            return {
                "error": f"Failed to get event detail: {str(e)}",
                "event_id": event_id,
                "suggestion": "Check that event_id is valid"
            }
class GetEmailAttachmentsTool(BaseTool):
    name: str = "get_email_attachments"
    description: str = (
        "Get list of attachments from an email with metadata. "
        "Required: email_id:str (from get_emails tool). "
        "Returns: list of attachments with filename, size, mimeType, attachmentId"
    )
    args_schema: type[BaseModel] = GetAttachmentsSchema

    def _run(self, email_id: str) -> Dict[str, Any]:
        try:
            _ensure_gmail_service()
            attachments = safe_run_async(
                gmail_service.get_email_attachments(email_id),
                tool_name="get_email_attachments"
            )
            return {"attachments": attachments, "count": len(attachments)}
        except RuntimeError as e:
            return {
                "error": "Gmail service unavailable",
                "details": str(e),
                "attachments": [],
                "count": 0
            }
        except Exception as e:
            return {
                "error": f"Failed to get attachments: {str(e)}",
                "email_id": email_id,
                "attachments": [],
                "count": 0
            }


class DownloadAttachmentTool(BaseTool):
    name: str = "download_attachment"
    description: str = (
        "Download a specific attachment from an email. "
        "Required: email_id:str, attachment_id:str (from get_email_attachments). "
        "Returns: base64 encoded file data"
    )
    args_schema: type[BaseModel] = DownloadAttachmentSchema

    def _run(self, email_id: str, attachment_id: str) -> Dict[str, Any]:
        try:
            _ensure_gmail_service()
            file_data = safe_run_async(
                gmail_service.download_attachment(email_id, attachment_id),
                tool_name="download_attachment"
            )
            
            # Return base64 encoded data
            encoded_data = base64.b64encode(file_data).decode('utf-8')
            
            return {
                "status": "downloaded",
                "email_id": email_id,
                "attachment_id": attachment_id,
                "data": encoded_data,
                "size": len(file_data)
            }
        except RuntimeError as e:
            return {
                "error": "Gmail service unavailable",
                "details": str(e),
                "status": "failed"
            }
        except Exception as e:
            return {
                "error": f"Failed to download attachment: {str(e)}",
                "status": "failed"
            }


class ProcessEmailAttachmentsTool(BaseTool):
    name: str = "process_email_attachments"
    description: str = (
        "Process all attachments from an email and extract text content for LLM analysis. "
        "Supports: PDF, DOCX, TXT, CSV, Excel, JSON, images, code files, HTML. "
        "Required: email_id:str. "
        "Optional: save_to_disk:bool (default False), output_dir:str (default 'attachments'). "
        "Returns: Processed attachments with extracted text ready for AI analysis"
    )
    args_schema: type[BaseModel] = ProcessAttachmentsSchema

    def _run(
        self, 
        email_id: str, 
        save_to_disk: bool = False, 
        output_dir: str = 'attachments'
    ) -> Dict[str, Any]:
        try:
            _ensure_gmail_service()
            
            # Get and process attachments
            processed = safe_run_async(
                gmail_service.get_and_process_attachments(
                    email_id=email_id,
                    save_to_disk=save_to_disk,
                    output_dir=output_dir
                ),
                tool_name="process_email_attachments"
            )
            
            # Format for LLM
            llm_formatted = AttachmentFormatter.format_for_llm(processed)
            summary = AttachmentFormatter.format_summary(processed)
            
            return {
                "status": "processed",
                "email_id": email_id,
                "count": len(processed),
                "summary": summary,
                "attachments": processed,
                "llm_formatted_text": llm_formatted
            }
        except RuntimeError as e:
            return {
                "error": "Gmail service unavailable",
                "details": str(e),
                "status": "failed",
                "count": 0,
                "attachments": []
            }
        except Exception as e:
            return {
                "error": f"Failed to process attachments: {str(e)}",
                "status": "failed",
                "count": 0,
                "attachments": [],
                "suggestion": "Check that email_id is valid and attachments are in supported formats"
            }






# ============================================================================
# EXPORT ALL TOOLS
# ============================================================================

ALL_TOOLS = [
    # Email Analysis Tools
    ProcessEmailTool(),
    DetectTasksTool(),
    SuggestMeetingsTool(),
    TranslateTextTool(),
    ChatWithContextTool(),
    ClassifyAttachmentTool(),
    QueryAttachmentTool(),
    
    # Gmail Tools
    GetEmailsTool(),
    GetEmailDetailTool(),
    SendEmailTool(),
    ReplyToEmailTool(),
    MarkEmailAsReadTool(),
    MarkEmailAsUnreadTool(),
    DeleteEmailTool(),
    GetGmailLabelsTool(),
    AddEmailLabelTool(),
    
    # Calendar Tools
    GetUpcomingEventsTool(),
    CreateCalendarEventTool(),
    UpdateCalendarEventTool(),
    DeleteCalendarEventTool(),
    GetCalendarEventDetailTool(),


    # NEW: Attachment Tools
    GetEmailAttachmentsTool(),
    DownloadAttachmentTool(),
    ProcessEmailAttachmentsTool(),
    

]