from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from routers import ai, attachments
import uvicorn
from routers.agent import router as agent_router  # NEW
from routers.agent_v2 import router as agent_advanced_router



app = FastAPI(
    title="MailMate AI Backend",
    description="AI-powered email assistant with multimodal capabilities",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(ai.router)
app.include_router(attachments.router)
app.include_router(agent_router)  
app.include_router(agent_advanced_router)


@app.get("/")
async def root():
    return {
        "message": "MailMate AI Backend",
        "status": "active",
        "endpoints": {
            "process_email": "/ai/process",
            "chat": "/ai/chat",
            "translate": "/ai/translate",
            "detect_tasks": "/ai/detect-tasks",
            "suggest_meetings": "/ai/suggest-meetings",
            "attachment_query": "/attachments/query",
            "excel_operations": "/attachments/excel-operations",
            "csv_operations": "/attachments/csv-operations",
            "pdf_extract": "/attachments/pdf-extract",
            "agent_run": "/agent/run"  # NEW

        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)