from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional, List
from models.schemas import (
    ChatRequest, EmailProcessRequest, TranslateRequest,
    TaskDetectionRequest, MeetingSuggestionRequest, EmailAnalysisResponse
)
from services.gemini_service import GeminiService
from routers.utils import FileProcessor, detect_mime_type
import json

router = APIRouter(prefix="/ai", tags=["AI Processing"])

# Initialize Gemini service
try:
    gemini_service = GeminiService()
except Exception as e:
    print(f"Warning: Failed to initialize Gemini service: {e}")
    gemini_service = None

@router.post("/process")
async def process_email(
    file: Optional[UploadFile] = File(None),
    email_text: Optional[str] = Form(None)
):
    """
    Process email and extract insights, tasks, meetings, etc.
    Accepts either a file upload or pasted text.
    """
    if not gemini_service:
        raise HTTPException(status_code=500, detail="Gemini service not initialized")
    
    if not file and not email_text:
        raise HTTPException(status_code=400, detail="Either file or email_text must be provided")
    
    try:
        # Extract text from file if provided
        email_content = email_text
        attachments_info = []
        
        if file:
            file_content = await file.read()
            email_content = FileProcessor.extract_text_from_file(file_content, file.filename)
            attachments_info.append({
                "filename": file.filename,
                "mime_type": detect_mime_type(file.filename),
                "size": len(file_content)
            })
        
        # Analyze email with Gemini
        analysis = gemini_service.analyze_email(email_content, attachments_info)
        
        # Format response
        return {
            "success": True,
            "email_content": email_content[:500] + "..." if len(email_content) > 500 else email_content,
            "analysis": analysis,
            "attachments": attachments_info
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing email: {str(e)}")

@router.post("/chat")
async def chat(request: ChatRequest):
    """
    Chat with AI assistant about the email
    """
    if not gemini_service:
        raise HTTPException(status_code=500, detail="Gemini service not initialized")
    
    try:
        # Convert chat messages to format expected by Gemini
        messages = [
            {"role": msg.role.value, "content": msg.content}
            for msg in request.history
        ]
        messages.append({"role": "user", "content": request.user_input})
        
        # Get response from Gemini
        response = gemini_service.chat_with_context(messages, request.context)
        
        return {
            "success": True,
            "response": response
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

@router.post("/translate")
async def translate(request: TranslateRequest):
    """
    Translate text to target language
    """
    if not gemini_service:
        raise HTTPException(status_code=500, detail="Gemini service not initialized")
    
    try:
        result = gemini_service.translate_text(
            request.text,
            request.target_language,
            request.source_language
        )
        
        return {
            "success": True,
            "translation": result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")

@router.post("/detect-tasks")
async def detect_tasks(request: TaskDetectionRequest):
    """
    Detect tasks from email text
    """
    if not gemini_service:
        raise HTTPException(status_code=500, detail="Gemini service not initialized")
    
    try:
        tasks = gemini_service.detect_tasks(request.email_text)
        
        return {
            "success": True,
            "tasks": tasks,
            "count": len(tasks)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Task detection error: {str(e)}")

@router.post("/suggest-meetings")
async def suggest_meetings(request: MeetingSuggestionRequest):
    """
    Suggest meetings based on email content
    """
    if not gemini_service:
        raise HTTPException(status_code=500, detail="Gemini service not initialized")
    
    try:
        meetings = gemini_service.suggest_meetings(
            request.email_text,
            request.user_availability
        )
        
        return {
            "success": True,
            "meetings": meetings,
            "count": len(meetings)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Meeting suggestion error: {str(e)}")

@router.post("/classify-attachment")
async def classify_attachment(
    file: UploadFile = File(...),
    extract_preview: bool = Form(True)
):
    """
    Classify attachment and provide insights
    """
    if not gemini_service:
        raise HTTPException(status_code=500, detail="Gemini service not initialized")
    
    try:
        file_content = await file.read()
        
        # Extract preview if requested
        preview = None
        if extract_preview:
            try:
                preview = FileProcessor.extract_text_from_file(file_content, file.filename)
            except:
                preview = None
        
        # Classify with Gemini
        classification = gemini_service.classify_attachment(file.filename, preview)
        
        return {
            "success": True,
            "filename": file.filename,
            "size": len(file_content),
            "mime_type": detect_mime_type(file.filename),
            "classification": classification
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification error: {str(e)}")

@router.post("/analyze-multiple")
async def analyze_multiple_emails(
    files: List[UploadFile] = File(...)
):
    """
    Analyze multiple emails at once
    """
    if not gemini_service:
        raise HTTPException(status_code=500, detail="Gemini service not initialized")
    
    try:
        results = []
        
        for file in files:
            file_content = await file.read()
            email_content = FileProcessor.extract_text_from_file(file_content, file.filename)
            
            analysis = gemini_service.analyze_email(email_content, [{
                "filename": file.filename,
                "mime_type": detect_mime_type(file.filename),
                "size": len(file_content)
            }])
            
            results.append({
                "filename": file.filename,
                "analysis": analysis
            })
        
        return {
            "success": True,
            "count": len(results),
            "results": results
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Multiple analysis error: {str(e)}")

@router.post("/summarize")
async def summarize_email(
    email_text: str = Form(...)
):
    """
    Summarize email content into a concise version (1-2 sentences).
    This is used for the chat-style email viewer.
    """
    if not gemini_service:
        raise HTTPException(status_code=500, detail="Gemini service not initialized")
    
    try:
        # Use Gemini to summarize
        summary = gemini_service.summarize_text(email_text, max_sentences=2)
        
        return {
            "success": True,
            "summary": summary,
            "original_length": len(email_text),
            "summary_length": len(summary)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization error: {str(e)}")
