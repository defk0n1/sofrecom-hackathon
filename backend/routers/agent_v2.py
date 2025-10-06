from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
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
    validate: bool = True
    return_plan: bool = True
    enforce_revision: bool = False  # Future: auto-revise if needs_revision

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
        plan_raw = str(decomp_result).strip()
        print(plan_raw)
        plan = parse_plan(plan_raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Decomposition failed: {e}")

    # 2. Execution Phase
    try:
        exec_crew = build_execution_crew()
        exec_result = exec_crew.kickoff(inputs={"user_goal": req.prompt, "plan_json": plan_raw})
        final_answer = str(exec_result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {e}")

    validation_report = None
    notes = None

    # 3. Validation Phase (optional)
    if req.validate:
        try:
            val_crew = build_validation_crew()
            val_result = val_crew.kickoff(inputs={
                "user_goal": req.prompt,
                "plan_json": plan_raw,
                "final_answer": final_answer
            })
            validation_report = parse_validation(str(val_result))
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