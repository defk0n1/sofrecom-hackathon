"""
Service for processing and storing attachment metadata
"""
import sqlite3
import os
from typing import List, Dict, Any
from services.gmail_service import GmailService

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "email.db")

class AttachmentService:
    def __init__(self):
        self.gmail_service = GmailService()
    
    def get_db_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    
    async def process_and_save_attachments(self, email_id: str) -> List[Dict[str, Any]]:
        """
        Extract attachment metadata from an email and save it to the database.
        Returns list of saved attachments.
        """
        try:
            # Get attachments list from Gmail
            attachments = await self.gmail_service.get_attachments_list(email_id)
            
            if not attachments:
                return []
            
            # Save to database
            conn = self.get_db_connection()
            cursor = conn.cursor()
            
            saved_attachments = []
            for attachment in attachments:
                try:
                    cursor.execute("""
                        INSERT OR IGNORE INTO attachments (email_id, attachment_id, filename, mime_type, size)
                        VALUES (?, ?, ?, ?, ?)
                    """, (
                        email_id,
                        attachment['id'],
                        attachment['filename'],
                        attachment.get('mimeType'),
                        attachment.get('size', 0)
                    ))
                    
                    if cursor.rowcount > 0:
                        saved_attachments.append({
                            'email_id': email_id,
                            'attachment_id': attachment['id'],
                            'filename': attachment['filename'],
                            'mime_type': attachment.get('mimeType'),
                            'size': attachment.get('size', 0)
                        })
                except sqlite3.IntegrityError:
                    # Attachment already exists, skip
                    pass
            
            conn.commit()
            conn.close()
            
            return saved_attachments
        except Exception as e:
            print(f"Error processing attachments for email {email_id}: {str(e)}")
            return []
    
    async def process_multiple_emails(self, email_ids: List[str]) -> Dict[str, Any]:
        """
        Process attachments for multiple emails.
        Returns summary of processed attachments.
        """
        total_processed = 0
        errors = []
        
        for email_id in email_ids:
            try:
                attachments = await self.process_and_save_attachments(email_id)
                total_processed += len(attachments)
            except Exception as e:
                errors.append({'email_id': email_id, 'error': str(e)})
        
        return {
            'total_processed': total_processed,
            'total_emails': len(email_ids),
            'errors': errors
        }
