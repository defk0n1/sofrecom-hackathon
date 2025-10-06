import json
from typing import List, Optional, Any, Dict
from crewai.tools import BaseTool
from services.gemini_service import GeminiService
from routers.utils import FileProcessor

# Single shared Gemini service instance (mirroring routers/ai.py pattern)
try:
    gemini_service = GeminiService()
except Exception as e:
    print(f"[CrewTools] Warning: GeminiService init failed: {e}")
    gemini_service = None


def _ensure_service():
    if not gemini_service:
        raise RuntimeError("Gemini service not initialized (GEMINI_API_KEY missing?)")


# ---------------------------- TOOLS DEFINITIONS ---------------------------- #

class ProcessEmailTool(BaseTool):
    name: str = "process_email"
    description: str = (
        "Analyze raw email text (no attachments here) and extract insights, tasks, meetings, sentiment, "
        "and classification. Input: email_text:str"
    )

    def _run(self, email_text: str) -> Dict[str, Any]:
        _ensure_service()
        analysis = gemini_service.analyze_email(email_text, attachments_info=[])
        return analysis 


class DetectTasksTool(BaseTool):
    name: str = "detect_tasks"
    description: str = (
        "Extract actionable tasks from an email body. Input: email_text:str"
    )

    def _run(self, email_text: str) -> Dict[str, Any]:
        _ensure_service()
        tasks = gemini_service.detect_tasks(email_text)
        return {"tasks": tasks, "count": len(tasks)}


class SuggestMeetingsTool(BaseTool):
    name: str = "suggest_meetings"
    description: str = (
        "Suggest meeting proposals from email content. Inputs: email_text:str, user_availability:Optional[List[str]]"
    )

    def _run(self, email_text: str, user_availability: Optional[List[str]] = None) -> Dict[str, Any]:
        _ensure_service()
        meetings = gemini_service.suggest_meetings(email_text, user_availability or [])
        return {"meetings": meetings, "count": len(meetings)}


class TranslateTextTool(BaseTool):
    name: str = "translate_text"
    description: str = (
        "Translate text to target language. Inputs: text:str, target_language:str, source_language:Optional[str]"
    )

    def _run(self, text: str, target_language: str, source_language: Optional[str] = None) -> Dict[str, Any]:
        _ensure_service()
        translation = gemini_service.translate_text(text, target_language, source_language)
        return {"translation": translation}


class ChatWithContextTool(BaseTool):
    name: str = "chat_with_context"
    description: str = (
        "Chat with AI about an email or conversation. Inputs: history:List[Dict{role,content}], user_input:str, "
        "context:Optional[str]. History roles: user|assistant."
    )

    def _run(
        self,
        history: List[Dict[str, str]],
        user_input: str,
        context: Optional[str] = None
    ) -> Dict[str, Any]:
        _ensure_service()
        messages = history + [{"role": "user", "content": user_input}]
        response = gemini_service.chat_with_context(messages, context)
        return {"response": response}


class ClassifyAttachmentTool(BaseTool):
    name: str = "classify_attachment"
    description: str = (
        "Classify an attachment by filename and optional preview text. Inputs: filename:str, preview_text:Optional[str]"
    )

    def _run(self, filename: str, preview_text: Optional[str] = None) -> Dict[str, Any]:
        _ensure_service()
        classification = gemini_service.classify_attachment(filename, preview_text)
        return {"filename": filename, "classification": classification}


class QueryAttachmentTool(BaseTool):
    name: str = "query_attachment"
    description: str = (
        "Ask a question about an attachment file content (base64). Inputs: filename:str, file_content_base64:str, query:str"
    )

    def _run(self, filename: str, file_content_base64: str, query: str) -> Dict[str, Any]:
        _ensure_service()
        import base64
        try:
            raw_bytes = base64.b64decode(file_content_base64)
        except Exception:
            raise RuntimeError("Invalid base64 content for attachment.")
        extracted_text = FileProcessor.extract_text_from_file(raw_bytes, filename)
        messages = [{"role": "user", "content": f"Attachment content:\n{extracted_text}\n\nQuestion: {query}"}]
        answer = gemini_service.chat_with_context(messages, None)
        return {"filename": filename, "query": query, "answer": answer}


# ---------------------------- EXPORT ALL TOOLS ---------------------------- #

ALL_TOOLS = [
    ProcessEmailTool(),
    DetectTasksTool(),
    SuggestMeetingsTool(),
    TranslateTextTool(),
    ChatWithContextTool(),
    ClassifyAttachmentTool(),
    QueryAttachmentTool(),
]
