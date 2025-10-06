from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any

class AtomicTask(BaseModel):
    id: str
    description: str
    rationale: Optional[str] = None
    priority: Optional[Literal["low", "medium", "high"]] = "medium"
    suggested_tools: List[str] = Field(default_factory=list)
    # If a task can be satisfied by multiple tools, list them all
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