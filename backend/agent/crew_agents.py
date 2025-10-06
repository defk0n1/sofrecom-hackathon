import os
from crewai import Agent, Crew, Task, LLM
import json
from typing import List, Optional

from .crew_tools import ALL_TOOLS
from .task_schema import (
    DecomposedPlan, AtomicTask, ExecutionStep,
    ValidationReport, ValidationIssue
)

from .plan_norm import normalize_decomposer_output


llm = LLM(
    model="gemini/gemini-2.0-flash",
    temperature=0.7,
)


# Build once (CrewAI holds reference)


ORCHESTRATOR_SYSTEM = """You are the orchestrator for an email productivity AI.
You receive a USER GOAL and (for advanced mode) a PRE-BUILT PLAN JSON (tasks + steps).
If PLAN_JSON is provided: FOLLOW IT EXACTLY. Do not invent new tasks.
Mapping (when you have to infer in simple mode):
- translation -> translate_text
- summarization / analysis -> process_email (or summarize_email if present in tools)
- tasks extraction -> detect_tasks
- meeting suggestions -> suggest_meetings
- conversational follow-up -> chat_with_context
- attachment Q&A -> query_attachment
- attachment classification -> classify_attachment

Use the MINIMUM necessary tools. Merge multi-tool results into a coherent final answer.
If tasks or meetings exist, append a compact JSON: {"tasks":[...],"meetings":[...]} (omit empty keys).
Avoid verbosity. No tool reasoning narrative unless requested by user.
"""

SPECIALIST_SYSTEM = """You are the Email Intelligence Specialist.
You can execute ALL capabilities via tools (never hallucinate):

Capabilities & Tools:
1. Summarization (summarize_email or process_email if summary + insights)
2. Full email analysis (process_email)
3. Task extraction (detect_tasks)
4. Meeting suggestions (suggest_meetings)
5. Translation (translate_text)
6. Contextual Q&A (chat_with_context)
7. Attachment classification (classify_attachment)
8. Attachment Q&A (query_attachment)

Rules:
- Always call the appropriate tool (no direct answers if a tool exists).
- Summaries: 1–2 transformed sentences (no verbatim copy).
- Tasks: bullet list or JSON array; deduplicate if multiple sources.
- Meetings: structured concise list (title, purpose, date/time or 'TBD').
- Translation: include <=200 char original snippet + translation (unless user objects).
- Attachment Q&A: only use extracted content; never invent.
- If a requested capability yields nothing, state that fact concisely.
- Append final JSON only if tasks or meetings present.
- Be concise, factual, no unnecessary meta commentary.
"""



DECOMPOSER_SYSTEM_TEMPLATE = """You are a Task Decomposer for an email-productivity AI.
Input: USER GOAL (possibly multi-intent).
You MUST output ONLY a single valid JSON object (UTF-8, no markdown fences, no extra text) with EXACTLY these top-level keys:

{{
  "original_goal": "<original goal>",
  "tasks": [
    {{
      "id": "t1",
      "description": "Atomic task",
      "rationale": "Short rationale",
      "priority": "low|medium|high",
      "suggested_tools": ["summarize_email"],
      "requires_sequential": false
    }}
  ],
  "steps": [
    {{
      "order": 1,
      "task_id": "t1",
      "tool": "summarize_email",
      "args": {{ "email_text": "{{{{email_text}}}}" }},
      "notes": "Short note if needed"
    }}
  ],
  "coverage_notes": "How tasks cover the goal"
}}

Rules:
1. Use only tools from: {tool_list}
2. If a task fits multiple tools, list them in suggested_tools; in steps choose most direct.
3. Each step: exactly one tool.
4. Use placeholders (e.g., {{{{email_text}}}}) for missing info—do not invent content.
5. Task IDs incremental: t1, t2...
6. Keep tasks minimal, non-overlapping.
7. NO text outside JSON.
8. DO NOT wrap output inside any extra key like "plan" or "result". Only the JSON object above.
9. DO NOT include code fences (no ```json at the beginning and ``` at the end).
10. DO NOT add commentary before or after the JSON.
11. DO NOT create nested 'actions' arrays. Each element in "steps" is a single tool invocation.

Return ONLY the JSON object. No extra text, no explanations.

"""


VALIDATOR_SYSTEM = """You are a Validator (QA Referee).
Input:
- USER GOAL
- PLAN_JSON (tasks + steps)
- FINAL_ANSWER (string)

Return STRICT JSON ONLY:

{
  "goal": "<goal>",
  "plan_task_count": <int>,
  "executed_task_ids": ["t1","t2"],
  "missing_task_ids": [],
  "extraneous_tasks": [],
  "adequacy_score": 0.0,
  "status": "ok" | "needs_revision" | "failed",
  "issues": [
    {"severity":"warning","message":"...", "related_task_ids":["t2"]}
  ],
  "summary": "Concise human-readable evaluation"
}

Evaluation Guidelines:
- adequacy_score up if all clear user intents are covered by tasks & final answer.
- missing_task_ids if goal clearly implies tasks not in plan.
- If final answer fails to summarize when user asked for summary -> issue.
- If tasks referenced but not executed -> needs_revision.
- extraneous_tasks if plan includes irrelevant tasks.
- status:
  - ok (adequacy_score >= 0.85 and no error issues)
  - needs_revision (adequacy_score >= 0.5 but missing or warning issues significant)
  - failed (adequacy_score < 0.5 or critical errors).
NO prose outside JSON.
"""
def build_crew() -> Crew:
    orchestrator = Agent(
        role="Orchestrator",
        goal="Interpret user goal and coordinate the right tools.",
        backstory="Expert planner for email-centric workflows.",
        allow_delegation=True,
        verbose=True,
        tools=ALL_TOOLS,
        memory=True,
        max_iter=8,
        system_prompt=ORCHESTRATOR_SYSTEM,
        llm=llm
    )

    specialist = Agent(
        role="Email Intelligence Specialist",
        goal="Perform deep email analysis, task extraction, translation, and Q&A.",
        backstory="Seasoned analyst converting raw email data into structured insights.",
        allow_delegation=False,
        verbose=True,
        tools=ALL_TOOLS,
        memory=True,
        max_iter=6,
        system_prompt=SPECIALIST_SYSTEM,
        llm=llm
    )

    main_task = Task(
        description=(
            "User Goal:\n{{user_goal}}\n\n"
            "Produce: direct answer. If tasks or meetings discovered, optionally append JSON:\n"
            "{'tasks':[...], 'meetings':[...]}.\n"
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




# ---------------------------------------------------------------------------
# ADVANCED: Separate crews for each phase
# ---------------------------------------------------------------------------
def _tool_names() -> List[str]:
    return [t.name for t in ALL_TOOLS]

def build_decomposition_crew():
    tool_list_str = ", ".join(_tool_names())
    decomposer_system = DECOMPOSER_SYSTEM_TEMPLATE.format(tool_list=tool_list_str)
    print(decomposer_system)
    decomposer = Agent(
        role="Task Decomposer",
        goal="Produce atomic tasks & ordered steps from user goal.",
        backstory="Breaks multi-intent requests into structured plan.",
        allow_delegation=False,
        verbose=True,
        tools=[],
        memory=False,
        max_iter=2,
        system_prompt=decomposer_system,
        llm=llm
    )
    task = Task(
        description="Decompose user goal into JSON plan. USER GOAL:\n{{user_goal}}\nReturn ONLY JSON.",
        agent=decomposer,
        expected_output="JSON decomposition plan"
    )
    return Crew(agents=[decomposer], tasks=[task], verbose=True)

def build_execution_crew():
    orchestrator = Agent(
        role="Orchestrator",
        goal="Execute provided plan using available tools.",
        backstory="Executes structured plan without scope creep.",
        allow_delegation=True,
        verbose=True,
        tools=ALL_TOOLS,
        memory=True,
        max_iter=6,
        system_prompt=ORCHESTRATOR_SYSTEM,
        llm=llm
    )
    specialist = Agent(
        role="Email Intelligence Specialist",
        goal="Perform analysis, summarization, extraction, translation with precision.",
        backstory="Transforms raw email & attachments into structured info.",
        allow_delegation=False,
        verbose=False,
        tools=ALL_TOOLS,
        memory=True,
        max_iter=4,
        system_prompt=SPECIALIST_SYSTEM,
        llm=llm
    )
    exec_task = Task(
        description=(
            "Execute plan EXACTLY.\nPLAN_JSON:\n{{plan_json}}\nUSER GOAL:\n{{user_goal}}\n"
            "Produce final integrated answer."
        ),
        agent=orchestrator,
        expected_output="Final integrated answer."
    )
    return Crew(agents=[orchestrator, specialist], tasks=[exec_task], verbose=True)

def build_validation_crew():
    validator = Agent(
        role="Validator",
        goal="Assess plan completeness & final answer alignment.",
        backstory="Quality assurance ensuring no user intent gaps.",
        allow_delegation=False,
        verbose=True,
        tools=[],
        memory=False,
        max_iter=2,
        system_prompt=VALIDATOR_SYSTEM,
        llm=llm
    )
    v_task = Task(
        description=(
            "Validate plan & final answer.\nUSER GOAL:\n{{user_goal}}\nPLAN_JSON:\n{{plan_json}}\n"
            "FINAL_ANSWER:\n{{final_answer}}\nReturn ONLY validation JSON."
        ),
        agent=validator,
        expected_output="Validation JSON"
    )
    return Crew(agents=[validator], tasks=[v_task], verbose=True)

# ---------------------------------------------------------------------------
# PARSERS
# ---------------------------------------------------------------------------
def parse_plan(raw: str) -> DecomposedPlan:
    """
    Robust parser that first tries direct parse, then normalization,
    and raises a clear error if both paths fail.
    """
    last_error: Optional[Exception] = None
    for attempt in ("direct", "normalize"):
        try:
            if attempt == "direct":
                data = json.loads(raw)
                # Accept wrapper {"plan": {...}}
                if "plan" in data and isinstance(data["plan"], dict):
                    data = data["plan"]
                tasks = [AtomicTask(**t) for t in data.get("tasks", [])] if data.get("tasks") else []
                steps = [ExecutionStep(**s) for s in data.get("steps", [])] if data.get("steps") else []
                # If direct parse produced both tasks and steps, we are good
                if tasks and steps:
                    return DecomposedPlan(
                        original_goal=data.get("original_goal", ""),
                        tasks=tasks,
                        steps=steps,
                        coverage_notes=data.get("coverage_notes")
                    )
                # If missing tasks or steps, fall through to normalization
                last_error = ValueError("Direct parse missing tasks or steps, switching to normalization.")
            else:
                normalized = normalize_decomposer_output(raw)
                print("normalized: " ,normalized)
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
            continue

    raise ValueError(f"Failed to parse or normalize plan JSON: {last_error}\nRaw snippet:\n{raw[:800]}")

def parse_validation(raw: str) -> ValidationReport:
    try:
        data = json.loads(raw)
        return ValidationReport(
            goal=data.get("goal", ""),
            plan_task_count=data.get("plan_task_count", 0),
            executed_task_ids=data.get("executed_task_ids", []),
            missing_task_ids=data.get("missing_task_ids", []),
            extraneous_tasks=data.get("extraneous_tasks", []),
            adequacy_score=data.get("adequacy_score", 0.0),
            status=data.get("status", "failed"),
            issues=[ValidationIssue(**i) for i in data.get("issues", [])],
            summary=data.get("summary", "")
        )
    except Exception as e:
        raise ValueError(f"Failed to parse validation JSON: {e}\nRaw:\n{raw[:800]}")