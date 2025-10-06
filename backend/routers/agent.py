from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from agent.crew_agents import build_crew

router = APIRouter(prefix="/agent", tags=["Agentic"])

class ConversationMessage(BaseModel):
    role: str
    content: str

class AgentRunRequest(BaseModel):
    prompt: str
    context: Optional[str] = None
    history: Optional[List[ConversationMessage]] = None

class AgentRunResponse(BaseModel):
    success: bool
    output: str
    raw: Optional[Dict[str, Any]] = None

_crew = None

def _get_crew():
    global _crew
    if _crew is None:
        _crew = build_crew()
    return _crew

@router.post("/run", response_model=AgentRunResponse)
async def run_agent(req: AgentRunRequest):
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    crew = _get_crew()
    try:
        result = crew.kickoff(inputs={"user_goal": req.prompt})
        output_text = str(result)
        return AgentRunResponse(success=True, output=output_text, raw=None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent execution failed: {e}")