from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from routers import ai, attachments, calendar, gmail
import uvicorn
from dotenv import load_dotenv
import os


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
app.include_router(calendar.router)
app.include_router(gmail.router)

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
            "calendar_events": "/calendar/events",
            "gmail_emails": "/gmail/emails",
            "gmail_send": "/gmail/emails/send",
            "gmail_auth": "/gmail/auth/gmail"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    load_dotenv()
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)