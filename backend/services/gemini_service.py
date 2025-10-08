import google.generativeai as genai
import os
import json
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

load_dotenv()


from dotenv import load_dotenv

load_dotenv()
class GeminiService:
    def __init__(self):

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        genai.configure(api_key=api_key)
        self.flash_model = genai.GenerativeModel("gemini-2.5-flash")
        self.pro_model = genai.GenerativeModel("gemini-1.5-pro")

    def analyze_email(self, email_text: str, attachments_info: List[Dict] = None) -> Dict[str, Any]:
        """
        Comprehensive email analysis
        """
        attachments_str = ""
        if attachments_info:
            attachments_str = "\n\nAttachments:\n" + "\n".join([
                f"- {att['filename']} ({att.get('mime_type', 'unknown')})" 
                for att in attachments_info
            ])

        prompt = f"""You are an intelligent email assistant. Analyze this email comprehensively.

Email content:
{email_text}
{attachments_str}

Provide a detailed analysis in JSON format:
{{
    "summary": "A concise 2-3 sentence summary of the email",
    "key_points": ["point 1", "point 2", "point 3"],
    "sentiment": "positive/neutral/negative/urgent",
    "urgency": "low/medium/high/critical",
    "language_detected": "detected language",
    "tasks": [
        {{
            "task": "specific action item",
            "priority": "low/medium/high",
            "due_date": "extracted date if mentioned or null",
            "assigned_to": "person name if mentioned or null"
        }}
    ],
    "meeting_suggestions": [
        {{
            "title": "suggested meeting title",
            "suggested_date": "extracted date if mentioned or null",
            "suggested_time": "extracted time if mentioned or null",
            "duration": "estimated duration or null",
            "attendees": ["person1", "person2"],
            "location": "location if mentioned or null",
            "notes": "additional context"
        }}
    ],
    "entities": {{
        "people": ["names mentioned"],
        "organizations": ["companies mentioned"],
        "dates": ["dates mentioned"],
        "locations": ["places mentioned"]
    }},
    "follow_up_required": true/false,
    "attachments_mentioned": ["filenames mentioned in email text"]
}}

Guidelines:
- Be precise and actionable
- Extract all actionable items as tasks
- Identify potential meetings from phrases like "let's meet", "schedule a call", "available times"
- Detect urgency from words like "urgent", "ASAP", "immediately"
- Return only valid JSON, no additional text
"""

        response = self.flash_model.generate_content([prompt])
        return self._extract_json(response.text)

    def translate_text(self, text: str, target_language: str, source_language: Optional[str] = None) -> Dict[str, str]:
        """
        Translate text to target language
        """
        source_hint = f" from {source_language}" if source_language else ""
        
        prompt = f"""Translate the following text{source_hint} to {target_language}.
Maintain the tone, formality, and intent of the original message.
If the target language isn't mentionned, translate to the same language as the source.

Text to translate:
{text}

Return JSON format:
{{
    "translated_text": "the translated text",
    "source_language": "detected or provided source language",
    "target_language": "{target_language}",
    "translation_notes": "any important notes about the translation"
}}
"""

        response = self.flash_model.generate_content([prompt])
        return self._extract_json(response.text)

    def detect_tasks(self, email_text: str) -> List[Dict[str, Any]]:
        """
        Detect and extract tasks from email
        """
        prompt = f"""Extract all actionable tasks from this email.

Email:
{email_text}

Return JSON format:
{{
    "tasks": [
        {{
            "task": "clear, actionable task description",
            "priority": "low/medium/high",
            "due_date": "ISO format date if mentioned or null",
            "estimated_time": "time estimate if possible or null",
            "depends_on": "other task if dependent or null",
            "assigned_to": "person if mentioned or null"
        }}
    ]
}}

Guidelines:
- Look for action verbs: send, prepare, review, schedule, confirm, etc.
- Consider deadlines and time constraints
- Identify dependencies between tasks
- Mark as high priority if urgent language is used
"""

        response = self.flash_model.generate_content([prompt])
        result = self._extract_json(response.text)
        return result.get("tasks", [])

    def suggest_meetings(self, email_text: str, user_availability: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Suggest meetings based on email content
        """
        availability_str = ""
        if user_availability:
            availability_str = "\n\nUser's available times:\n" + "\n".join(user_availability)

        prompt = f"""Analyze this email and suggest potential meetings that should be scheduled.

Email:
{email_text}
{availability_str}

Return JSON format:
{{
    "meetings": [
        {{
            "title": "meeting title",
            "purpose": "meeting purpose/agenda",
            "suggested_date": "ISO format date or null",
            "suggested_time": "time in HH:MM format or null",
            "duration": "duration like '30 minutes', '1 hour' or null",
            "attendees": ["person1", "person2"],
            "priority": "low/medium/high",
            "location": "location or 'virtual' or null",
            "preparation_needed": "what to prepare or null",
            "notes": "additional context"
        }}
    ]
}}

Guidelines:
- Look for meeting requests, follow-ups, discussions needed
- Consider user's availability if provided
- Suggest appropriate meeting duration based on topic
- Extract attendees from email
"""

        response = self.flash_model.generate_content([prompt])
        result = self._extract_json(response.text)
        return result.get("meetings", [])

    def chat_with_context(self, messages: List[Dict[str, str]], email_context: Optional[str] = None) -> str:
        """
        Chat with email context
        """
        context_prompt = ""
        if email_context:
            context_prompt = f"Email context:\n{email_context}\n\n"

        # Format messages for Gemini
        formatted_messages = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            formatted_messages.append({
                "role": role,
                "parts": [msg["content"]]
            })

        # Add context as first message if provided
        if context_prompt:
            formatted_messages.insert(0, {
                "role": "user",
                "parts": [f"{context_prompt}You are an email assistant. Use this email context to answer questions."]
            })
            formatted_messages.insert(1, {
                "role": "model",
                "parts": ["I understand the email context and I'm ready to help you with any questions about it."]
            })

        chat = self.flash_model.start_chat(history=formatted_messages[:-1])
        response = chat.send_message(formatted_messages[-1]["parts"][0])
        return response.text

    def classify_attachment(self, filename: str, content_preview: Optional[str] = None) -> Dict[str, str]:
        """
        Classify attachment by category and provide insights
        """
        preview_str = f"\n\nContent preview:\n{content_preview[:500]}" if content_preview else ""
        
        prompt = f"""Classify this attachment and provide insights.

Filename: {filename}
{preview_str}

Return JSON format:
{{
    "category": "category name (e.g., Invoice, Report, Contract, Image, Presentation, etc.)",
    "subcategory": "more specific category",
    "suggested_action": "what should be done with this file",
    "priority": "low/medium/high",
    "keywords": ["keyword1", "keyword2"],
    "description": "brief description of the content"
}}
"""

        response = self.flash_model.generate_content([prompt])
        return self._extract_json(response.text)

    def query_attachment_content(self, filename: str, content: str, query: str) -> str:
        """
        Answer questions about attachment content
        """
        prompt = f"""You are analyzing a document. Answer the user's question based on the content.

Filename: {filename}

Document content:
{content[:15000]}

User question: {query}

Provide a clear, concise answer. If the information is not in the document, say so.
"""

        response = self.flash_model.generate_content([prompt])
        return response.text

    def analyze_data_operation(self, data_preview: str, operation: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Provide insights on data operations (CSV, Excel)
        """
        prompt = f"""Analyze this data operation result and provide insights.

Operation: {operation}
Parameters: {json.dumps(parameters)}

Data preview:
{data_preview}

Return JSON format:
{{
    "summary": "summary of the data",
    "key_findings": ["finding 1", "finding 2"],
    "statistics": {{"stat1": "value1", "stat2": "value2"}},
    "insights": "meaningful insights from the data",
    "recommendations": "suggested actions based on the data"
}}
"""

        response = self.flash_model.generate_content([prompt])
        return self._extract_json(response.text)

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """
        Extract JSON object from text
        """
        try:
            # Find JSON boundaries
            json_start = text.find('{')
            json_end = text.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = text[json_start:json_end]
                parsed_json = json.loads(json_str)
                return parsed_json
            else:
                print("Warning: Could not find valid JSON in response")
                return {"error": "No valid JSON found in response", "raw_text": text}
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {str(e)}")
            return {"error": f"JSON decode error: {str(e)}", "raw_text": text}
        except Exception as e:
            print(f"Error extracting JSON: {str(e)}")
            return {"error": f"Error: {str(e)}", "raw_text": text}
    
    def summarize_text(self, text: str, max_sentences: int = 2) -> str:
        """
        Summarize text into a concise version
        """
        prompt = f"""Summarize the following text in {max_sentences} sentence(s). 
Be concise and capture the main point(s). Do not add any preamble or explanation.

Text:
{text}

Summary:"""
        
        try:
            response = self.flash_model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            # Fallback to simple truncation if API fails
            sentences = text.split('. ')
            return '. '.join(sentences[:max_sentences]) + '.' if len(sentences) > max_sentences else text
