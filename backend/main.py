from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.credentials_service import google_credentials
from routers import ai, attachments, gmail_router, email_db_router
import uvicorn
from routers.agent_v2 import router as agent_advanced_router
from routers import calendar
from routers import pubsub_router

from dotenv import load_dotenv

load_dotenv()


if (not google_credentials):
    print("⚠️  GOOGLE_CREDENTIALS not found in environment or credentials.json")

app = FastAPI(
    title="MailMate AI Backend",
    description="AI-powered email assistant with multimodal capabilities",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event - Initialize Gmail service automatically
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("=" * 60)
    print("🚀 Starting MailMate AI Backend...")
    print("=" * 60)
    try:
        # Import here to trigger initialization
        from routers.gmail_router import get_gmail_service
        get_gmail_service()  # This will auto-authenticate
    except Exception as e:
        print(f"⚠️  Gmail service initialization failed: {str(e)}")
        print("   Continuing without Gmail integration...")
        print("   Note: Ensure credentials.json and token.json are present")
    print("=" * 60)

# Include routers
app.include_router(ai.router)
app.include_router(attachments.router)
app.include_router(agent_advanced_router)
app.include_router(email_db_router.router)  # NEW - Email database endpoints
app.include_router(gmail_router.router)  # NEW
app.include_router(calendar.router)  # NEW - Calendar endpoints
app.include_router(pubsub_router.router)  # NEW - Push notifications


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
            "agent_run": "/agent/run",
            "pubsub_webhook": "/pubsub/webhook",
            "pubsub_watch": "/pubsub/watch",
            "pubsub_stop": "/pubsub/stop",
            "pubsub_status": "/pubsub/status"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    load_dotenv()
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)