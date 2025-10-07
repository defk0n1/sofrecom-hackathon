import json
from typing import List, Optional, Any, Dict
from crewai.tools import BaseTool
from services.gemini_service import GeminiService
from services.gmail_service import GmailService
from services.calendar_service import CalendarService
from routers.utils import FileProcessor

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


# ---------------------------- EMAIL ANALYSIS TOOLS ---------------------------- #

class ProcessEmailTool(BaseTool):
    name: str = "process_email"
    description: str = (
        "Analyze raw email text (no attachments here) and extract insights, tasks, meetings, sentiment, "
        "and classification. Input: email_text:str"
    )

    def _run(self, email_text: str) -> Dict[str, Any]:
        _ensure_gemini_service()
        analysis = gemini_service.analyze_email(email_text, attachments_info=[])
        return analysis 


class DetectTasksTool(BaseTool):
    name: str = "detect_tasks"
    description: str = (
        "Extract actionable tasks from an email body. Input: email_text:str"
    )

    def _run(self, email_text: str) -> Dict[str, Any]:
        _ensure_gemini_service()
        tasks = gemini_service.detect_tasks(email_text)
        return {"tasks": tasks, "count": len(tasks)}


class SuggestMeetingsTool(BaseTool):
    name: str = "suggest_meetings"
    description: str = (
        "Suggest meeting proposals from email content. Inputs: email_text:str, user_availability:Optional[List[str]]"
    )

    def _run(self, email_text: str, user_availability: Optional[List[str]] = None) -> Dict[str, Any]:
        _ensure_gemini_service()
        meetings = gemini_service.suggest_meetings(email_text, user_availability or [])
        return {"meetings": meetings, "count": len(meetings)}


class TranslateTextTool(BaseTool):
    name: str = "translate_text"
    description: str = (
        "Translate text to target language. Inputs: text:str, target_language:str, source_language:Optional[str]"
    )

    def _run(self, text: str, target_language: str, source_language: Optional[str] = None) -> Dict[str, Any]:
        _ensure_gemini_service()
        translation = gemini_service.translate_text(text, target_language, source_language)
        return {"translation": translation}


class ChatWithContextTool(BaseTool):
    name: str = "chat_with_context"
    description: str = (
        "Chat with AI about an email or conversation. Inputs: history:List[Dict{role,content}], user_input:str, "
        "context:Optional[str]. History roles: user|assistant."
    )

    def _run(
        self,
        history: List[Dict[str, str]],
        user_input: str,
        context: Optional[str] = None
    ) -> Dict[str, Any]:
        _ensure_gemini_service()
        messages = history + [{"role": "user", "content": user_input}]
        response = gemini_service.chat_with_context(messages, context)
        return {"response": response}


class ClassifyAttachmentTool(BaseTool):
    name: str = "classify_attachment"
    description: str = (
        "Classify an attachment by filename and optional preview text. Inputs: filename:str, preview_text:Optional[str]"
    )

    def _run(self, filename: str, preview_text: Optional[str] = None) -> Dict[str, Any]:
        _ensure_gemini_service()
        classification = gemini_service.classify_attachment(filename, preview_text)
        return {"filename": filename, "classification": classification}


class QueryAttachmentTool(BaseTool):
    name: str = "query_attachment"
    description: str = (
        "Ask a question about an attachment file content (base64). Inputs: filename:str, file_content_base64:str, query:str"
    )

    def _run(self, filename: str, file_content_base64: str, query: str) -> Dict[str, Any]:
        _ensure_gemini_service()
        import base64
        try:
            raw_bytes = base64.b64decode(file_content_base64)
        except Exception:
            raise RuntimeError("Invalid base64 content for attachment.")
        extracted_text = FileProcessor.extract_text_from_file(raw_bytes, filename)
        messages = [{"role": "user", "content": f"Attachment content:\n{extracted_text}\n\nQuestion: {query}"}]
        answer = gemini_service.chat_with_context(messages, None)
        return {"filename": filename, "query": query, "answer": answer}


# ---------------------------- GMAIL TOOLS ---------------------------- #

class GetEmailsTool(BaseTool):
    name: str = "get_emails"
    description: str = (
        "Retrieve emails from Gmail inbox. Inputs: max_results:int (default 10), query:str (optional Gmail search query). "
        "Returns list of emails with id, from, subject, date, snippet."
    )

    def _run(self, max_results: int = 10, query: str = "") -> Dict[str, Any]:
        _ensure_gmail_service()
        import asyncio
        emails = asyncio.run(gmail_service.get_emails(max_results=max_results, query=query))
        return {"emails": emails, "count": len(emails)}


class GetEmailDetailTool(BaseTool):
    name: str = "get_email_detail"
    description: str = (
        "Get detailed information about a specific email. Input: email_id:str. "
        "Returns full email with body, headers, labels, etc."
    )

    def _run(self, email_id: str) -> Dict[str, Any]:
        _ensure_gmail_service()
        import asyncio
        email_detail = asyncio.run(gmail_service.get_email_detail(email_id))
        return email_detail


class SendEmailTool(BaseTool):
    name: str = "send_email"
    description: str = (
        "Send an email via Gmail. Inputs: to:str, subject:str, body:str, "
        "cc:Optional[List[str]], bcc:Optional[List[str]]. "
        "Returns sent message details."
    )

    def _run(
        self,
        to: str,
        subject: str,
        body: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        _ensure_gmail_service()
        import asyncio
        result = asyncio.run(gmail_service.send_email(
            to=to, subject=subject, body=body, cc=cc, bcc=bcc
        ))
        return {"status": "sent", "message_id": result.get("id"), "result": result}


class ReplyToEmailTool(BaseTool):
    name: str = "reply_to_email"
    description: str = (
        "Reply to a specific email. Inputs: email_id:str, body:str, "
        "cc:Optional[List[str]], bcc:Optional[List[str]]. "
        "Returns reply message details."
    )

    def _run(
        self,
        email_id: str,
        body: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        _ensure_gmail_service()
        import asyncio
        result = asyncio.run(gmail_service.reply_to_email(
            email_id=email_id, body=body, cc=cc, bcc=bcc
        ))
        return {"status": "replied", "message_id": result.get("id"), "result": result}


class MarkEmailAsReadTool(BaseTool):
    name: str = "mark_email_as_read"
    description: str = (
        "Mark an email as read. Input: email_id:str. "
        "Returns success status."
    )

    def _run(self, email_id: str) -> Dict[str, Any]:
        _ensure_gmail_service()
        gmail_service.mark_as_read(email_id)
        return {"status": "marked_as_read", "email_id": email_id}


class MarkEmailAsUnreadTool(BaseTool):
    name: str = "mark_email_as_unread"
    description: str = (
        "Mark an email as unread. Input: email_id:str. "
        "Returns success status."
    )

    def _run(self, email_id: str) -> Dict[str, Any]:
        _ensure_gmail_service()
        gmail_service.mark_as_unread(email_id)
        return {"status": "marked_as_unread", "email_id": email_id}


class DeleteEmailTool(BaseTool):
    name: str = "delete_email"
    description: str = (
        "Delete an email permanently. Input: email_id:str. "
        "Returns success status."
    )

    def _run(self, email_id: str) -> Dict[str, Any]:
        _ensure_gmail_service()
        gmail_service.delete_email(email_id)
        return {"status": "deleted", "email_id": email_id}


class GetGmailLabelsTool(BaseTool):
    name: str = "get_gmail_labels"
    description: str = (
        "Get all Gmail labels/folders. No inputs required. "
        "Returns list of labels with id and name."
    )

    def _run(self) -> Dict[str, Any]:
        _ensure_gmail_service()
        labels = gmail_service.get_labels()
        return {"labels": labels, "count": len(labels)}


class AddEmailLabelTool(BaseTool):
    name: str = "add_email_label"
    description: str = (
        "Add a label to an email. Inputs: email_id:str, label_id:str. "
        "Returns success status."
    )

    def _run(self, email_id: str, label_id: str) -> Dict[str, Any]:
        _ensure_gmail_service()
        gmail_service.add_label(email_id, label_id)
        return {"status": "label_added", "email_id": email_id, "label_id": label_id}


# ---------------------------- CALENDAR TOOLS ---------------------------- #

class GetUpcomingEventsTool(BaseTool):
    name: str = "get_upcoming_events"
    description: str = (
        "Get upcoming calendar events. Inputs: max_results:int (default 10), "
        "time_min:Optional[str] (ISO format), time_max:Optional[str] (ISO format). "
        "Returns list of calendar events."
    )

    def _run(
        self,
        max_results: int = 10,
        time_min: Optional[str] = None,
        time_max: Optional[str] = None
    ) -> Dict[str, Any]:
        _ensure_calendar_service()
        import asyncio
        events = asyncio.run(calendar_service.get_upcoming_events(
            max_results=max_results, time_min=time_min, time_max=time_max
        ))
        return {"events": events, "count": len(events)}


class CreateCalendarEventTool(BaseTool):
    name: str = "create_calendar_event"
    description: str = (
        "Create a new calendar event. Inputs: summary:str (title), start_time:str (ISO format), "
        "end_time:str (ISO format), description:Optional[str], location:Optional[str], "
        "attendees:Optional[List[str]] (email addresses), timezone:str (default 'UTC'). "
        "Returns created event details."
    )

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
        _ensure_calendar_service()
        import asyncio
        event = asyncio.run(calendar_service.create_event(
            summary=summary,
            start_time=start_time,
            end_time=end_time,
            description=description,
            location=location,
            attendees=attendees,
            timezone=timezone
        ))
        return {"status": "created", "event": event}


class UpdateCalendarEventTool(BaseTool):
    name: str = "update_calendar_event"
    description: str = (
        "Update an existing calendar event. Inputs: event_id:str, summary:Optional[str], "
        "start_time:Optional[str] (ISO format), end_time:Optional[str] (ISO format), "
        "description:Optional[str], location:Optional[str], attendees:Optional[List[str]], "
        "timezone:str (default 'UTC'). Returns updated event details."
    )

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
        _ensure_calendar_service()
        import asyncio
        event = asyncio.run(calendar_service.update_event(
            event_id=event_id,
            summary=summary,
            start_time=start_time,
            end_time=end_time,
            description=description,
            location=location,
            attendees=attendees,
            timezone=timezone
        ))
        return {"status": "updated", "event": event}


class DeleteCalendarEventTool(BaseTool):
    name: str = "delete_calendar_event"
    description: str = (
        "Delete a calendar event. Input: event_id:str. "
        "Returns success status."
    )

    def _run(self, event_id: str) -> Dict[str, Any]:
        _ensure_calendar_service()
        import asyncio
        result = asyncio.run(calendar_service.delete_event(event_id))
        return {"status": "deleted", "event_id": event_id, "result": result}


class GetCalendarEventDetailTool(BaseTool):
    name: str = "get_calendar_event_detail"
    description: str = (
        "Get detailed information about a specific calendar event. Input: event_id:str. "
        "Returns full event details including attendees, description, etc."
    )

    def _run(self, event_id: str) -> Dict[str, Any]:
        _ensure_calendar_service()
        import asyncio
        event = asyncio.run(calendar_service.get_event_detail(event_id))
        return {"event": event}


# ---------------------------- EXPORT ALL TOOLS ---------------------------- #

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
]