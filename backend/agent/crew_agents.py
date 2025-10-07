import os
from crewai import Agent, Crew, Task, LLM
import json
from typing import List, Optional
import re
from pydantic import BaseModel, Field

from .crew_tools import ALL_TOOLS
from .task_schema import (
    DecomposedPlan, AtomicTask, ExecutionStep,
    ValidationReport, ValidationIssue
)

from .plan_norm import normalize_decomposer_output


# ============================================================================
# LLM CONFIGURATIONS
# ============================================================================

json_llm = LLM(
    model="gemini/gemini-2.0-flash",
    temperature=0.1,
    response_format={"type": "json_object"}
)

standard_llm = LLM(
    model="gemini/gemini-2.0-flash",
    temperature=0.7,
)


# ============================================================================
# PYDANTIC MODELS FOR output_json (CrewAI requirement)
# ============================================================================

class DecomposerOutputModel(BaseModel):
    """Pydantic model for decomposer output validation"""
    original_goal: str = Field(description="The user's original request")
    tasks: List[dict] = Field(description="List of atomic tasks")
    steps: List[dict] = Field(description="Ordered execution steps")
    coverage_notes: Optional[str] = Field(None, description="How tasks cover the goal")


class ValidatorOutputModel(BaseModel):
    """Pydantic model for validator output validation"""
    goal: str = Field(description="The user goal being validated")
    plan_task_count: int = Field(description="Number of tasks in plan")
    executed_task_ids: List[str] = Field(description="Task IDs that were executed")
    missing_task_ids: List[str] = Field(default_factory=list, description="Missing task IDs")
    extraneous_tasks: List[str] = Field(default_factory=list, description="Unnecessary tasks")
    adequacy_score: float = Field(description="Score from 0.0 to 1.0")
    status: str = Field(description="ok, needs_revision, or failed")
    issues: List[dict] = Field(default_factory=list, description="Validation issues")
    summary: str = Field(description="Human-readable evaluation")


# ============================================================================
# SYSTEM PROMPTS
# ============================================================================

ORCHESTRATOR_SYSTEM = """You are the orchestrator for an email productivity AI with Gmail and Calendar integration.

You receive a USER GOAL and (for advanced mode) a PRE-BUILT PLAN JSON (tasks + steps).
If PLAN_JSON is provided: FOLLOW IT EXACTLY. Do not invent new tasks.

Available Capabilities & Tool Mapping:
- Email Analysis: process_email, detect_tasks, suggest_meetings
- Translation: translate_text
- Q&A: chat_with_context
- Attachment Handling: classify_attachment, query_attachment, get_email_attachments, download_attachment, process_email_attachments

- Gmail Operations:
  * get_emails - retrieve emails from inbox
  * get_email_detail - get full email content
  * get_email_attachments - list attachments in an email
  * download_attachment - download specific attachment
  * process_email_attachments - extract text from all attachments for AI analysis
  * send_email - send new email
  * reply_to_email - reply to existing email
  * mark_email_as_read/unread - manage read status
  * delete_email - delete email
  * get_gmail_labels - list all labels
  * add_email_label - add label to email

- Calendar Operations:
  * get_upcoming_events - retrieve calendar events
  * create_calendar_event - create new event
  * update_calendar_event - modify existing event
  * delete_calendar_event - remove event
  * get_calendar_event_detail - get event details

OUTPUT FORMAT RULES:
- Present information in natural, conversational language
- For meeting suggestions: describe in prose (e.g., "Lynda suggested Wednesday 10h-12h or Thursday 14h-16h")
- ONLY append JSON at the very end if user explicitly needs structured data
- Default to human-readable format unless user asks for JSON/structured output
- Keep responses concise and natural

Use the MINIMUM necessary tools. Merge multi-tool results into a coherent final answer.
Avoid verbosity. No tool reasoning narrative unless requested by user.
"""

SPECIALIST_SYSTEM = """You are the Email Intelligence Specialist with Gmail and Calendar integration.

You can execute ALL capabilities via tools (never hallucinate):

Email Analysis:
1. Summarization & insights (process_email)
2. Task extraction (detect_tasks)
3. Meeting suggestions (suggest_meetings)
4. Translation (translate_text)
5. Contextual Q&A (chat_with_context)
6. Attachment classification (classify_attachment)
7. Attachment Q&A (query_attachment)

Gmail Management:
8. Retrieve emails (get_emails) - supports search queries
9. Get email details (get_email_detail)
10. List attachments (get_email_attachments)
11. Download attachment (download_attachment)
12. Process all attachments (process_email_attachments) - extracts text from PDF, DOCX, Excel, CSV, images, etc.
13. Send emails (send_email)
14. Reply to emails (reply_to_email)
15. Mark as read/unread (mark_email_as_read, mark_email_as_unread)
16. Delete emails (delete_email)
17. Manage labels (get_gmail_labels, add_email_label)


Calendar Management:
15. Get upcoming events (get_upcoming_events)
16. Create calendar events (create_calendar_event)
17. Update events (update_calendar_event)
18. Delete events (delete_calendar_event)
19. Get event details (get_calendar_event_detail)

ATTACHMENT PROCESSING:
- Use process_email_attachments to analyze documents attached to emails
- Supports: PDF, Word, Excel, CSV, JSON, images, code files, HTML
- Automatically extracts text content for LLM analysis
- For specific attachment questions, use query_attachment
    

OUTPUT FORMATTING RULES:
- Always respond in natural, conversational language
- For meeting/appointment questions:
  * Extract the key information (who suggested what times)
  * Present as readable text: "X suggested Y time, Z suggested W time"
  * DO NOT include dictionary notation like "title:", "suggested_date:", etc.
  * DO NOT show technical fields (duration, attendees list, etc.) unless explicitly asked
  
EXAMPLES:
Good: "Yes, there are appointment suggestions. Lynda Ayachi suggested Wednesday 10h-12h or Thursday 14h-16h, and Badii Louati suggested Wednesday afternoon."

Bad: "title: Meeting, suggested_date: 2025-10-08, suggested_time: Afternoon, attendees: ['Lynda', 'Badii']"

Rules:
- Always call the appropriate tool (no direct answers if a tool exists).
- For Gmail: use email_id from get_emails before operations like reply/delete
- For Calendar: use ISO 8601 datetime format (e.g., "2025-10-07T10:00:00Z")
- When creating events from meeting suggestions, extract all relevant details
- Summaries: 1–2 transformed sentences (no verbatim copy).
- Tasks: bullet list format; deduplicate if multiple sources.
- Meetings: natural language description (not JSON/dict format).
- Translation: include <=200 char original snippet + translation (unless user objects).
- Attachment Q&A: only use extracted content; never invent.
- If a requested capability yields nothing, state that fact concisely.
- Be concise, factual, no unnecessary meta commentary.
- NO JSON/dictionary output in conversational responses unless explicitly requested.
"""


DECOMPOSER_SYSTEM_TEMPLATE = """You are a Task Decomposer for an email-productivity AI with Gmail and Calendar integration.

CRITICAL: Output EXACTLY this JSON structure with NO modifications:

{{
  "original_goal": "string - the user's original request",
  "tasks": [
    {{
      "id": "t1",
      "description": "string - what this task does",
      "rationale": "string - why this task is needed",
      "priority": "low|medium|high",
      "suggested_tools": ["tool_name"],
      "requires_sequential": true|false
    }}
  ],
  "steps": [
    {{
      "order": 1,
      "task_id": "t1",
      "tool": "tool_name",
      "args": {{"email_text": "PLACEHOLDER"}},
      "notes": "optional string"
    }}
  ],
  "coverage_notes": "string - how these tasks fulfill the goal"
}}

MANDATORY RULES:
1. Output ONLY the JSON object above - NO extra keys, NO wrapper objects
2. DO NOT wrap in "plan", "result", or any other container
3. DO NOT use markdown code fences (no ```json or ```)
4. DO NOT add fields like "description", "expected_output", "details", "step_id"
5. Field names are EXACT: use "order" not "step_id", "tool" not "task", "args" not "details"
6. Each step must have EXACTLY these fields: order, task_id, tool, args, notes
7. Use "PLACEHOLDER" for dynamic content in args
8. Available tools ONLY: {tool_list}
9. NO text before or after the JSON
10. Start your response with {{ and end with }}

EXAMPLE (for "translate and extract tasks from French email"):
{{
  "original_goal": "translate and extract tasks from French email",
  "tasks": [
    {{
      "id": "t1",
      "description": "Translate French email to English",
      "rationale": "User needs English version for task extraction",
      "priority": "high",
      "suggested_tools": ["translate_text"],
      "requires_sequential": false
    }},
    {{
      "id": "t2",
      "description": "Extract action items from translated email",
      "rationale": "User requested task extraction",
      "priority": "high",
      "suggested_tools": ["detect_tasks"],
      "requires_sequential": true
    }}
  ],
  "steps": [
    {{
      "order": 1,
      "task_id": "t1",
      "tool": "translate_text",
      "args": {{"email_text": "PLACEHOLDER"}},
      "notes": "Translate from French to English"
    }},
    {{
      "order": 2,
      "task_id": "t2",
      "tool": "detect_tasks",
      "args": {{"email_text": "PLACEHOLDER"}},
      "notes": "Extract from translated content"
    }}
  ],
  "coverage_notes": "Translation (t1) enables task extraction (t2) from non-English content"
}}

WRONG OUTPUT - NEVER DO THIS:
{{
  "plan": {{
    "steps": [{{"step_id": 1, "task": "translate", "details": {{...}}}}]
  }}
}}

Available tools: {tool_list}

GMAIL TOOLS USAGE:
- get_emails: Use with query parameter for searching (e.g., "from:boss@company.com")
- send_email: Requires to, subject, body (optional: cc, bcc)
- reply_to_email: Requires email_id from get_emails
- create_calendar_event: Requires summary, start_time, end_time in ISO format

CALENDAR TOOLS USAGE:
- create_calendar_event: Use ISO 8601 datetime (e.g., "2025-10-07T10:00:00Z")
- When suggesting events from meetings: extract title, description, attendees


Now process the user goal and output ONLY the correct JSON structure.
"""


VALIDATOR_SYSTEM = """You are a Validator (QA Referee).

You MUST output EXACTLY this JSON structure:

{{
  "goal": "string - the user goal being validated",
  "plan_task_count": 0,
  "executed_task_ids": ["t1", "t2"],
  "missing_task_ids": [],
  "extraneous_tasks": [],
  "adequacy_score": 0.0,
  "status": "ok|needs_revision|failed",
  "issues": [
    {{
      "severity": "warning|error|critical",
      "message": "description of issue",
      "related_task_ids": ["t1"]
    }}
  ],
  "summary": "string - concise human-readable evaluation"
}}

MANDATORY RULES:
1. Output ONLY valid JSON - NO markdown fences, NO extra text
2. Start with {{ and end with }}
3. All fields are REQUIRED (use empty arrays/0 for missing data)
4. status must be one of: "ok", "needs_revision", "failed"
5. severity must be one of: "warning", "error", "critical"

Evaluation Guidelines:
- adequacy_score: 0.0 to 1.0 based on how well tasks + final answer cover user goal
- missing_task_ids: tasks clearly implied by goal but not in plan
- extraneous_tasks: tasks in plan that don't relate to goal
- executed_task_ids: tasks that were actually performed
- status determination:
  * "ok": adequacy_score >= 0.85 and no critical/error issues
  * "needs_revision": adequacy_score >= 0.5 but has warnings or missing tasks
  * "failed": adequacy_score < 0.5 or has critical errors

Output ONLY the validation JSON object.
"""


# ============================================================================
# CREW BUILDERS
# ============================================================================

def build_crew() -> Crew:
    """Simple mode crew with standard LLM"""
    orchestrator = Agent(
        role="Orchestrator",
        goal="Interpret user goal and coordinate the right tools.",
        backstory=f"{ORCHESTRATOR_SYSTEM}\n\nExpert planner for email-centric workflows.",
        allow_delegation=True,
        verbose=True,
        tools=ALL_TOOLS,
        memory=True,
        max_iter=8,
        llm=standard_llm
    )

    specialist = Agent(
        role="Email Intelligence Specialist",
        goal="Perform deep email analysis, task extraction, translation, and Q&A.",
        backstory=f"{SPECIALIST_SYSTEM}\n\nSeasoned analyst converting raw email data into structured insights.",
        allow_delegation=False,
        verbose=True,
        tools=ALL_TOOLS,
        memory=True,
        max_iter=6,
        llm=standard_llm
    )

    main_task = Task(
        description=(
            "User Goal:\n{user_goal}\n\n"  # FIXED: Single braces
            "Produce: direct answer."
            # "If tasks or meetings discovered, optionally append JSON:\n"" "{{'tasks':[...], 'meetings':[...]}}.\n"  # Escaped for literal output
            "Do not fabricate data if tools returned none."
        ),
        agent=orchestrator,
        expected_output="Helpful final response. Optional JSON with tasks/meetings."
    )

    crew = Crew(
        agents=[orchestrator, specialist],
        tasks=[main_task],
        verbose=True,
    )
    return crew


def _tool_names() -> List[str]:
    return [t.name for t in ALL_TOOLS]


def build_decomposition_crew():
    """Decomposition crew with JSON-mode LLM"""
    tool_list_str = ", ".join(_tool_names())
    decomposer_system = DECOMPOSER_SYSTEM_TEMPLATE.format(tool_list=tool_list_str)
    
    decomposer = Agent(
        role="Task Decomposer",
        goal="Produce atomic tasks & ordered steps from user goal in strict JSON format.",
        backstory=f"{decomposer_system}",
        allow_delegation=False,
        verbose=True,
        tools=[],
        memory=False,
        max_iter=2,
        llm=json_llm
    )
    
    task = Task(
        description=(
            "Decompose the user goal into a structured JSON plan.\n\n"
            "USER GOAL:\n{user_goal}\n\n"  # FIXED: Single braces
            "CRITICAL: Return ONLY the JSON object. Start with {{ and end with }}.\n"  # Escaped
            "NO markdown fences, NO explanatory text, NO wrapper keys."
        ),
        agent=decomposer,
        expected_output="Raw JSON object with original_goal, tasks, steps, coverage_notes",
        output_json=DecomposerOutputModel
    )
    
    return Crew(agents=[decomposer], tasks=[task], verbose=True)


def build_execution_crew():
    """Execution crew with standard LLM"""
    orchestrator = Agent(
        role="Orchestrator",
        goal="Execute provided plan using available tools.",
        backstory=f"{ORCHESTRATOR_SYSTEM}\n\nExecutes structured plan without scope creep.",
        allow_delegation=True,
        verbose=True,
        tools=ALL_TOOLS,
        memory=True,
        max_iter=6,
        llm=standard_llm
    )
    
    specialist = Agent(
        role="Email Intelligence Specialist",
        goal="Perform analysis, summarization, extraction, translation with precision.",
        backstory=f"{SPECIALIST_SYSTEM}\n\nTransforms raw email & attachments into structured info.",
        allow_delegation=False,
        verbose=False,
        tools=ALL_TOOLS,
        memory=True,
        max_iter=4,
        llm=standard_llm
    )
    
    exec_task = Task(
        description=(
            "Execute plan EXACTLY.\n\n"
            "PLAN_JSON:\n{plan_json}\n\n"
            "USER GOAL:\n{user_goal}\n\n"
            # Optional email context
            "EMAIL CONTEXT (if provided):\n{email_text}\n\n"
            "Produce final integrated answer."
        ),
        agent=orchestrator,
        expected_output="Final integrated answer."
    )
    
    return Crew(agents=[orchestrator, specialist], tasks=[exec_task], verbose=True)


def build_validation_crew():
    """Validation crew with JSON-mode LLM"""
    validator = Agent(
        role="Validator",
        goal="Assess plan completeness & final answer alignment in strict JSON format.",
        backstory=f"{VALIDATOR_SYSTEM}\n\nQuality assurance ensuring no user intent gaps.",
        allow_delegation=False,
        verbose=True,
        tools=[],
        memory=False,
        max_iter=2,
        llm=json_llm
    )
    
    v_task = Task(
        description=(
            "Validate plan & final answer.\n\n"
            "USER GOAL:\n{user_goal}\n\n"  # FIXED: Single braces
            "PLAN_JSON:\n{plan_json}\n\n"  # FIXED: Single braces
            "FINAL_ANSWER:\n{final_answer}\n\n"  # FIXED: Single braces
            "CRITICAL: Return ONLY valid JSON. Start with {{ and end with }}.\n"  # Escaped
            "NO markdown fences, NO explanatory text."
        ),
        agent=validator,
        expected_output="Raw JSON validation report",
        output_json=ValidatorOutputModel
    )
    
    return Crew(agents=[validator], tasks=[v_task], verbose=True)


# ============================================================================
# ENHANCED PARSERS
# ============================================================================

def _strip_markdown_fences(text: str) -> str:
    """Remove markdown code fences from text"""
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*\n?', '', text, flags=re.MULTILINE)
    text = re.sub(r'\n?\s*```\s*$', '', text, flags=re.MULTILINE)
    return text.strip()


def parse_plan(raw) -> DecomposedPlan:
    """
    Robust parser that handles multiple formats:
    - CrewAI TaskOutput object
    - Python dict
    - JSON string
    """
    last_error: Optional[Exception] = None
    
    # Handle CrewAI TaskOutput or CrewOutput objects
    if hasattr(raw, 'json_dict'):
        # CrewAI with output_json returns .json_dict
        data = raw.json_dict
    elif hasattr(raw, 'raw'):
        # CrewAI TaskOutput has .raw attribute
        raw = raw.raw
        if isinstance(raw, dict):
            data = raw
        else:
            data = None
    elif isinstance(raw, dict):
        # Already a dictionary
        data = raw
    else:
        # String - try to parse
        data = None
    
    # If we don't have a dict yet, try parsing as JSON
    if data is None:
        cleaned = _strip_markdown_fences(str(raw))
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError:
            # Try evaluating as Python literal (handles single quotes)
            try:
                import ast
                data = ast.literal_eval(cleaned)
            except Exception as e:
                raise ValueError(
                    f"Failed to parse plan - not valid JSON or Python dict.\n"
                    f"Error: {e}\n"
                    f"Raw output (first 1000 chars):\n{str(raw)[:1000]}"
                )
    
    # Now process the data dictionary
    for attempt in ("direct", "unwrap"):
        try:
            if attempt == "direct":
                if all(k in data for k in ["original_goal", "tasks", "steps"]):
                    tasks = [AtomicTask(**t) for t in data.get("tasks", [])]
                    steps = [ExecutionStep(**s) for s in data.get("steps", [])]
                    if tasks and steps:
                        return DecomposedPlan(
                            original_goal=data.get("original_goal", ""),
                            tasks=tasks,
                            steps=steps,
                            coverage_notes=data.get("coverage_notes")
                        )
                last_error = ValueError("Direct parse missing required keys")
                
            elif attempt == "unwrap":
                if "plan" in data and isinstance(data["plan"], dict):
                    data = data["plan"]
                    if all(k in data for k in ["original_goal", "tasks", "steps"]):
                        tasks = [AtomicTask(**t) for t in data.get("tasks", [])]
                        steps = [ExecutionStep(**s) for s in data.get("steps", [])]
                        if tasks and steps:
                            return DecomposedPlan(
                                original_goal=data.get("original_goal", ""),
                                tasks=tasks,
                                steps=steps,
                                coverage_notes=data.get("coverage_notes")
                            )
                last_error = ValueError("Unwrapped plan missing required keys")
                
        except Exception as e:
            last_error = e
            continue

    # Final fallback: try normalization
    try:
        normalized = normalize_decomposer_output(json.dumps(data))
        tasks = [AtomicTask(**t) for t in normalized["tasks"]]
        steps = [ExecutionStep(**s) for s in normalized["steps"]]
        return DecomposedPlan(
            original_goal=normalized.get("original_goal", ""),
            tasks=tasks,
            steps=steps,
            coverage_notes=normalized.get("coverage_notes")
        )
    except Exception as e:
        last_error = e

    raise ValueError(
        f"Failed to parse plan JSON after all attempts.\n"
        f"Last error: {last_error}\n"
        f"Raw output (first 1000 chars):\n{str(raw)[:1000]}"
    )


def parse_validation(raw) -> ValidationReport:
    """Parse validation JSON with error handling"""
    # Handle CrewAI outputs
    if hasattr(raw, 'json_dict'):
        data = raw.json_dict
    elif hasattr(raw, 'raw'):
        raw = raw.raw
        if isinstance(raw, dict):
            data = raw
        else:
            data = None
    elif isinstance(raw, dict):
        data = raw
    else:
        data = None
    
    # Parse string if needed
    if data is None:
        try:
            cleaned = _strip_markdown_fences(str(raw))
            data = json.loads(cleaned)
        except json.JSONDecodeError:
            try:
                import ast
                data = ast.literal_eval(cleaned)
            except Exception as e:
                raise ValueError(
                    f"Failed to parse validation JSON: {e}\n"
                    f"Raw output (first 1000 chars):\n{str(raw)[:1000]}"
                )
    
    try:
        return ValidationReport(
            goal=data.get("goal", ""),
            plan_task_count=data.get("plan_task_count", 0),
            executed_task_ids=data.get("executed_task_ids", []),
            missing_task_ids=data.get("missing_task_ids", []),
            extraneous_tasks=data.get("extraneous_tasks", []),
            adequacy_score=float(data.get("adequacy_score", 0.0)),
            status=data.get("status", "failed"),
            issues=[ValidationIssue(**i) for i in data.get("issues", [])],
            summary=data.get("summary", "")
        )
    except Exception as e:
        raise ValueError(
            f"Failed to parse validation report: {e}\n"
            f"Raw output (first 1000 chars):\n{str(raw)[:1000]}"
        )