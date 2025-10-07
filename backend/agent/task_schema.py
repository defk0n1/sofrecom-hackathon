from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any

class AtomicTask(BaseModel):
    id: str
    description: str
    rationale: Optional[str] = None
    priority: Optional[Literal["low", "medium", "high"]] = "medium"
    suggested_tools: List[str] = Field(default_factory=list)
    requires_sequential: bool = False

class ExecutionStep(BaseModel):
    order: int
    task_id: str
    tool: str
    args: Dict[str, Any]
    notes: Optional[str] = None

class DecomposedPlan(BaseModel):
    original_goal: str
    tasks: List[AtomicTask]
    steps: List[ExecutionStep]
    coverage_notes: Optional[str] = None

class ValidationIssue(BaseModel):
    severity: Literal["info", "warning", "error"]
    message: str
    related_task_ids: List[str] = Field(default_factory=list)

class ValidationReport(BaseModel):
    goal: str
    plan_task_count: int
    executed_task_ids: List[str]
    missing_task_ids: List[str]
    extraneous_tasks: List[str]
    adequacy_score: float  # 0.0 - 1.0
    status: Literal["ok", "needs_revision", "failed"]
    issues: List[ValidationIssue] = Field(default_factory=list)
    summary: str


# ============================================================================
# GMAIL SCHEMAS
# ============================================================================

class EmailSummary(BaseModel):
    """Summary representation of an email"""
    id: str
    thread_id: str
    from_email: str = Field(alias="from")
    subject: str
    date: str
    snippet: str
    labels: Optional[List[str]] = Field(default_factory=list)

class EmailDetail(BaseModel):
    """Full email details"""
    id: str
    thread_id: str
    from_email: str = Field(alias="from")
    to: str
    subject: str
    date: str
    body: str
    snippet: str
    labels: Optional[List[str]] = Field(default_factory=list)

class SendEmailRequest(BaseModel):
    """Request to send an email"""
    to: str
    subject: str
    body: str
    cc: Optional[List[str]] = None
    bcc: Optional[List[str]] = None

class ReplyEmailRequest(BaseModel):
    """Request to reply to an email"""
    email_id: str
    body: str
    cc: Optional[List[str]] = None
    bcc: Optional[List[str]] = None

class GmailLabel(BaseModel):
    """Gmail label/folder"""
    id: str
    name: str
    type: Optional[str] = None


# ============================================================================
# CALENDAR SCHEMAS
# ============================================================================

class EventAttendee(BaseModel):
    """Calendar event attendee"""
    email: str
    response_status: Optional[Literal["needsAction", "declined", "tentative", "accepted"]] = "needsAction"

class CalendarEvent(BaseModel):
    """Calendar event details"""
    id: str
    summary: str
    description: Optional[str] = None
    location: Optional[str] = None
    start: str  # ISO format datetime
    end: str    # ISO format datetime
    attendees: Optional[List[EventAttendee]] = Field(default_factory=list)
    organizer: Optional[str] = None
    html_link: Optional[str] = None
    status: Optional[Literal["confirmed", "tentative", "cancelled"]] = "confirmed"
    created: Optional[str] = None
    updated: Optional[str] = None

class CreateEventRequest(BaseModel):
    """Request to create a calendar event"""
    summary: str
    start_time: str  # ISO format
    end_time: str    # ISO format
    description: Optional[str] = None
    location: Optional[str] = None
    attendees: Optional[List[str]] = None  # List of email addresses
    timezone: str = 'UTC'

class UpdateEventRequest(BaseModel):
    """Request to update a calendar event"""
    event_id: str
    summary: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    attendees: Optional[List[str]] = None
    timezone: str = 'UTC'