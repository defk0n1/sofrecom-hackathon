import json
import re
from typing import Any, Dict, List, Optional

# Mapping from model-generated generic tool labels to real tools
TOOL_NAME_MAP = {
    "text_summarization": "summarize_email",
    "task_extraction": "detect_tasks",
    "meeting_suggestion": "suggest_meetings",
    "combine_results": None,  # Not an executable tool; skip
}

CODE_FENCE_REGEX = re.compile(r"```(?:json)?(.*?)```", re.DOTALL | re.IGNORECASE)

# Heuristic patterns for tool inference from natural language step "task"
SUMMARY_PAT = re.compile(r"\bsummariz(e|ing|ation)\b", re.IGNORECASE)
TASK_PAT = re.compile(r"\b(task|action item|actionable)\b", re.IGNORECASE)
MEETING_PAT = re.compile(r"\b(meeting|schedule|propose|suggest)\b", re.IGNORECASE)
TRANSLATE_PAT = re.compile(r"\btranslat(e|ion)\b", re.IGNORECASE)
CLASSIFY_PAT = re.compile(r"\bclassif(y|ication)\b", re.IGNORECASE)
ATTACH_QA_PAT = re.compile(r"\b(attachment|file|document).*(question|query|ask)\b", re.IGNORECASE)

ALLOWED_TOOLS = {
    "summarize_email",
    "process_email",
    "detect_tasks",
    "suggest_meetings",
    "translate_text",
    "chat_with_context",
    "classify_attachment",
    "query_attachment"
}


def extract_json_block(text: str) -> str:
    """Pull first fenced code JSON block if present; else return original text."""
    match = CODE_FENCE_REGEX.search(text)
    if match:
        return match.group(1).strip()
    return text.strip()


def try_json_load(raw: str) -> Dict[str, Any]:
    """Attempt to load JSON after trimming and removing trailing commas."""
    raw = raw.strip()
    raw = re.sub(r",(\s*[}\]])", r"\1", raw)  # naive trailing comma cleanup
    return json.loads(raw)


def _infer_tool_from_task_text(task_text: str) -> Optional[str]:
    """Heuristic tool inference from natural language description."""
    t = task_text.lower()
    if SUMMARY_PAT.search(t):
        return "summarize_email"
    if TASK_PAT.search(t) and "extract" in t:
        return "detect_tasks"
    if MEETING_PAT.search(t):
        return "suggest_meetings"
    if TRANSLATE_PAT.search(t):
        return "translate_text"
    if CLASSIFY_PAT.search(t):
        return "classify_attachment"
    if ATTACH_QA_PAT.search(t):
        return "query_attachment"
    # Fallback: if it mentions "task" but not explicit extraction -> detect_tasks
    if "task" in t:
        return "detect_tasks"
    return None


def _clean_email_input(val: str) -> str:
    """Strip leading prefixes like 'Email:' or 'Email content:'."""
    prefix_patterns = [
        r"^\s*email\s*:\s*",
        r"^\s*email\s*content\s*:\s*"
    ]
    cleaned = val.strip()
    for pat in prefix_patterns:
        cleaned = re.sub(pat, "", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def _heuristic_from_step_shape(steps_raw: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Handle shape:
      { step_id, task, input, output }
    or similar when no actions/tool/order.
    Produce canonical list with order & tool (if inferable).
    """
    normalized = []
    order_counter = 1
    for s in steps_raw:
        if not isinstance(s, dict):
            continue
        has_basic = ("task" in s) and ("input" in s)
        # Skip if already canonical or actions-based (handled earlier)
        if "actions" in s or ("tool" in s and "order" in s):
            continue
        if has_basic:
            task_text = s.get("task", "")
            tool = _infer_tool_from_task_text(task_text) or "process_email"
            if tool not in ALLOWED_TOOLS:
                # If the tool is disallowed, we skip this step
                continue
            input_text = s.get("input", "")
            email_text = _clean_email_input(str(input_text))
            args = {}
            # Map arg key depending on tool
            if tool in ("summarize_email", "process_email", "detect_tasks", "suggest_meetings", "translate_text"):
                args["email_text"] = email_text
            else:
                args["input_text"] = email_text

            normalized.append({
                "order": order_counter,
                "task_id": None,
                "tool": tool,
                "args": args,
                "notes": task_text
            })
            order_counter += 1
    return normalized


def normalize_decomposer_output(raw: str) -> Dict[str, Any]:
    """
    Produces canonical schema:
    {
      "original_goal": str,
      "tasks": [...],
      "steps": [...],
      "coverage_notes": str|None
    }
    """
    cleaned = extract_json_block(raw)
    data = try_json_load(cleaned)

    # Unwrap {"plan": {...}}
    if "plan" in data and isinstance(data["plan"], dict):
        data = data["plan"]

    original_goal = (
        data.get("original_goal")
        or data.get("goal")
        or ""
    )

    tasks = data.get("tasks", [])
    steps_raw = data.get("steps", [])

    # Normalization pipeline
    normalized_steps: List[Dict[str, Any]] = []

    # 1. If steps have actions
    for s in steps_raw:
        if isinstance(s, dict) and "actions" in s and isinstance(s["actions"], list):
            for action in s["actions"]:
                tool_name = action.get("tool")
                mapped = TOOL_NAME_MAP.get(tool_name, tool_name)
                if mapped is None:
                    continue
                # Build args
                args = {}
                input_val = action.get("input")
                if isinstance(input_val, dict):
                    args.update(input_val)
                elif isinstance(input_val, str):
                    cleaned_input = _clean_email_input(input_val)
                    if mapped in ("summarize_email", "process_email", "detect_tasks", "suggest_meetings"):
                        args["email_text"] = cleaned_input
                    else:
                        args["input_text"] = cleaned_input
                normalized_steps.append({
                    "order": len(normalized_steps)+1,
                    "task_id": None,
                    "tool": mapped,
                    "args": args,
                    "notes": s.get("description")
                })

    # 2. Already-canonical steps (have order + tool)
    if not normalized_steps:
        for s in steps_raw:
            if isinstance(s, dict) and "order" in s and "tool" in s:
                tool_name = TOOL_NAME_MAP.get(s["tool"], s["tool"])
                if tool_name and tool_name in ALLOWED_TOOLS:
                    s["tool"] = tool_name
                    normalized_steps.append(s)

    # 3. Heuristic shape (step_id/task/input/output)
    if not normalized_steps:
        heuristic = _heuristic_from_step_shape(steps_raw)
        normalized_steps.extend(heuristic)

    if not normalized_steps:
        raise ValueError("Could not normalize steps from decomposer output (no recognized step patterns).")

    # Synthesize tasks if missing
    if not tasks:
        tool_to_task_id = {}
        tasks_list = []
        for s in normalized_steps:
            tool = s["tool"]
            if tool not in tool_to_task_id:
                tid = f"t{len(tool_to_task_id)+1}"
                tool_to_task_id[tool] = tid
                tasks_list.append({
                    "id": tid,
                    "description": f"Execute {tool}",
                    "rationale": "Derived from decomposed step",
                    "priority": "medium",
                    "suggested_tools": [tool],
                    "requires_sequential": False
                })
        tasks = tasks_list

    # Ensure each step has task_id
    # Build mapping tool -> first task id
    map_tool_task = {}
    for t in tasks:
        for tool in t.get("suggested_tools", []):
            map_tool_task.setdefault(tool, t["id"])
    for s in normalized_steps:
        if not s.get("task_id"):
            s["task_id"] = map_tool_task.get(s["tool"], tasks[0]["id"])

    return {
        "original_goal": original_goal,
        "tasks": tasks,
        "steps": normalized_steps,
        "coverage_notes": data.get("coverage_notes")
    }