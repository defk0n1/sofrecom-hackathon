from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
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
from services.gmail_service import GmailService

router = APIRouter(prefix="/agent", tags=["Agentic-Advanced"])

# Initialize Gmail service
try:
    gmail_service = GmailService()
except Exception as e:
    print(f"[AgentRouter] Warning: GmailService init failed: {e}")
    gmail_service = None


class AdvancedRunRequest(BaseModel):
    prompt: str
    email_text: Optional[str] = None
    validator: bool = True
    return_plan: bool = True
    enforce_revision: bool = False
    history: Optional[List[Dict[str, str]]] = None
    
    # NEW: Attachment fields
    include_attachments: bool = False
    email_id: Optional[str] = None
    save_attachments: bool = False
    attachment_output_dir: str = 'attachments'


class AdvancedRunResponse(BaseModel):
    success: bool
    output: str
    plan: Optional[DecomposedPlan] = None
    validation: Optional[ValidationReport] = None
    notes: Optional[str] = None
    
    # NEW: Attachment response fields
    attachments_processed: Optional[int] = None
    attachment_summary: Optional[str] = None
    attachment_details: Optional[List[Dict[str, Any]]] = None


async def process_email_attachments(
    email_id: str,
    save_to_disk: bool = False,
    output_dir: str = 'attachments'
) -> Dict[str, Any]:
    """Process attachments from an email"""
    if not gmail_service:
        return {
            "count": 0,
            "summary": "Gmail service unavailable",
            "formatted_text": "",
            "attachments": []
        }
    
    try:
        # Get and process attachments
        processed = await gmail_service.get_and_process_attachments(
            email_id=email_id,
            save_to_disk=save_to_disk,
            output_dir=output_dir
        )
        
        # Format for LLM
        formatted_text = gmail_service.format_attachments_for_llm(processed)
        
        # Create summary
        summary = f"{len(processed)} attachment(s)"
        if processed:
            file_types = [att.get('type', 'unknown') for att in processed]
            summary += f": {', '.join(set(file_types))}"
        
        return {
            "count": len(processed),
            "summary": summary,
            "formatted_text": formatted_text,
            "attachments": processed
        }
    except Exception as e:
        print(f"[AgentRouter] Error processing attachments: {e}")
        return {
            "count": 0,
            "summary": f"Error: {str(e)}",
            "formatted_text": "",
            "attachments": []
        }


@router.post("/run", response_model=AdvancedRunResponse)
async def run_advanced(req: AdvancedRunRequest):
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    # Initialize variables
    email_text = req.email_text or ""
    attachment_context = ""
    attachments_count = 0
    attachment_summary = None
    attachment_details = []

    # NEW: Process attachments if requested
    if req.include_attachments and req.email_id:
        print(f"[AgentRouter] Processing attachments for email: {req.email_id}")
        
        attachment_data = await process_email_attachments(
            email_id=req.email_id,
            save_to_disk=req.save_attachments,
            output_dir=req.attachment_output_dir
        )
        
        attachments_count = attachment_data['count']
        attachment_summary = attachment_data['summary']
        attachment_context = attachment_data['formatted_text']
        attachment_details = attachment_data['attachments']
        
        # Add attachment context to email text
        if attachment_context:
            email_text = f"{email_text}\n\n{attachment_context}" if email_text else attachment_context
            print(f"[AgentRouter] Added {attachments_count} attachments to context")

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
        
        # Add email context (now includes attachments)
        if email_text:
            exec_inputs["email_text"] = email_text
        
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
        notes=notes,
        attachments_processed=attachments_count if req.include_attachments else None,
        attachment_summary=attachment_summary,
        attachment_details=attachment_details if req.include_attachments else None
    )