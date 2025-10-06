# router.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import json
from agent.crew_agents import (
    build_decomposition_crew,
    build_execution_crew,
    build_validation_crew,
    parse_plan,
    parse_validation,
    DecomposedPlan,
    ValidationReport
)


router = APIRouter(prefix="/agent", tags=["Agentic-Advanced"])


class AdvancedRunRequest(BaseModel):
    prompt: str
    email_text: Optional[str] = None  # NEW: Optional email context
    validate: bool = True
    return_plan: bool = True
    enforce_revision: bool = False


class AdvancedRunResponse(BaseModel):
    success: bool
    output: str
    plan: Optional[DecomposedPlan] = None
    validation: Optional[ValidationReport] = None
    notes: Optional[str] = None


@router.post("/run", response_model=AdvancedRunResponse)
async def run_advanced(req: AdvancedRunRequest):
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    # 1. Decomposition Phase
    try:
        decomp_crew = build_decomposition_crew()
        decomp_result = decomp_crew.kickoff(inputs={"user_goal": req.prompt})
        
        # Handle CrewAI output properly
        plan = parse_plan(decomp_result)
        
        # Serialize plan for execution phase
        plan_dict = {
            "original_goal": plan.original_goal,
            "tasks": [t.dict() for t in plan.tasks],
            "steps": [s.dict() for s in plan.steps],
            "coverage_notes": plan.coverage_notes
        }
        plan_json = json.dumps(plan_dict, indent=2)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Decomposition failed: {e}")

    # 2. Execution Phase
    try:
        exec_crew = build_execution_crew()
        
        # Build execution inputs
        exec_inputs = {
            "user_goal": req.prompt,
            "plan_json": plan_json
        }
        
        # Add email context if provided
        if req.email_text:
            exec_inputs["email_text"] = req.email_text
        
        exec_result = exec_crew.kickoff(inputs=exec_inputs)
        
        # Extract final answer from CrewAI output
        if hasattr(exec_result, 'raw'):
            final_answer = str(exec_result.raw)
        else:
            final_answer = str(exec_result)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {e}")

    validation_report = None
    notes = None

    # 3. Validation Phase (optional)
    if req.validator:
        try:
            val_crew = build_validation_crew()
            val_result = val_crew.kickoff(inputs={
                "user_goal": req.prompt,
                "plan_json": plan_json,
                "final_answer": final_answer
            })
            
            validation_report = parse_validation(val_result)
            
            if validation_report.status == "needs_revision" and req.enforce_revision:
                notes = "Revision suggested; auto iterative refinement not implemented yet."
                
        except Exception as e:
            # Non-fatal: we still return execution output
            notes = f"Validation failed: {e}"

    return AdvancedRunResponse(
        success=True,
        output=final_answer,
        plan=plan if req.return_plan else None,
        validation=validation_report,
        notes=notes
    )