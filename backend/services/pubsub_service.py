"""
Google Cloud Pub/Sub Service for Gmail Push Notifications
Handles receiving and processing Gmail mailbox updates
"""
import base64
import json
import sqlite3
import os
from typing import Dict, Any, Optional
from datetime import datetime
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "email.db")
token_path = os.path.join(os.path.dirname(__file__), "..", "token.json")

class PubSubService:
    def __init__(self):
        self.gmail_service = None
        self.creds = None
        self.last_history_id = self._load_last_history_id()
        
    def _load_last_history_id(self) -> Optional[str]:
        """Load the last processed history ID from database"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            # Create watch_state table if it doesn't exist
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS watch_state (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    history_id TEXT NOT NULL,
                    expiration BIGINT,
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            cursor.execute("SELECT history_id FROM watch_state WHERE id = 1")
            result = cursor.fetchone()
            conn.close()
            
            return result[0] if result else None
        except Exception as e:
            print(f"Error loading history ID: {str(e)}")
            return None
    
    def _save_history_id(self, history_id: str, expiration: Optional[int] = None):
        """Save the current history ID to database"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT OR REPLACE INTO watch_state (id, history_id, expiration, last_updated)
                VALUES (1, ?, ?, CURRENT_TIMESTAMP)
            """, (history_id, expiration))
            
            conn.commit()
            conn.close()
            self.last_history_id = history_id
            print(f"✓ Saved history ID: {history_id}")
        except Exception as e:
            print(f"Error saving history ID: {str(e)}")
    
    def _get_gmail_service(self):
        """Get authenticated Gmail service"""
        if not self.gmail_service:
            if os.path.exists(token_path):
                self.creds = Credentials.from_authorized_user_file(token_path)
                self.gmail_service = build('gmail', 'v1', credentials=self.creds)
            else:
                raise Exception("Gmail not authenticated. Please run authentication first.")
        return self.gmail_service
    
    def _save_email_to_db(self, email_data: Dict[str, Any]):
        """Save email to SQLite database"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            # Check if email already exists
            cursor.execute("SELECT id FROM emails WHERE id = ?", (email_data['id'],))
            if cursor.fetchone():
                print(f"  Email {email_data['id']} already exists, skipping...")
                conn.close()
                return
            
            # Parse attachments
            attachments_json = json.dumps(email_data.get('attachments', []))
            
            cursor.execute("""
                INSERT INTO emails (
                    id, sender, recipients, subject, body, 
                    received_date, thread_id, is_reply, attachments
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                email_data['id'],
                email_data.get('from', ''),
                email_data.get('to', ''),
                email_data.get('subject', ''),
                email_data.get('body', ''),
                email_data.get('date', datetime.now().isoformat()),
                email_data.get('threadId', ''),
                1 if email_data.get('is_reply', False) else 0,
                attachments_json
            ))
            
            conn.commit()
            conn.close()
            print(f"  ✓ Saved email: {email_data.get('subject', 'No Subject')[:50]}")
            
        except Exception as e:
            print(f"  ✗ Error saving email to DB: {str(e)}")
    
    def _fetch_and_save_message(self, message_id: str):
        """Fetch a message by ID and save it to database"""
        try:
            service = self._get_gmail_service()
            
            message = service.users().messages().get(
                userId='me',
                id=message_id,
                format='full'
            ).execute()
            
            payload = message.get('payload', {})
            headers = {header['name']: header['value'] 
                      for header in payload.get('headers', [])}
            
            # Extract body
            body = ""
            if 'parts' in payload:
                for part in payload['parts']:
                    if part['mimeType'] == 'text/plain':
                        if 'data' in part.get('body', {}):
                            body = base64.urlsafe_b64decode(
                                part['body']['data']
                            ).decode('utf-8', errors='ignore')
                            break
            elif 'body' in payload and 'data' in payload['body']:
                body = base64.urlsafe_b64decode(
                    payload['body']['data']
                ).decode('utf-8', errors='ignore')
            
            # Extract attachments info
            attachments = []
            if 'parts' in payload:
                for part in payload['parts']:
                    if part.get('filename'):
                        attachments.append({
                            'filename': part['filename'],
                            'mimeType': part['mimeType'],
                            'size': part.get('body', {}).get('size', 0)
                        })
            
            email_data = {
                'id': message['id'],
                'threadId': message.get('threadId'),
                'from': headers.get('From', ''),
                'to': headers.get('To', ''),
                'subject': headers.get('Subject', ''),
                'date': headers.get('Date', ''),
                'body': body,
                'attachments': attachments,
                'is_reply': 'Re:' in headers.get('Subject', '')
            }
            
            self._save_email_to_db(email_data)
            
        except Exception as e:
            print(f"  ✗ Error fetching message {message_id}: {str(e)}")
    
    def process_history_changes(self, start_history_id: str) -> int:
        """
        Process history changes since the given history ID
        Returns the number of new emails processed
        """
        try:
            service = self._get_gmail_service()
            new_emails_count = 0
            
            print(f"\n📥 Processing history changes from ID: {start_history_id}")
            
            # Get history list
            history_response = service.users().history().list(
                userId='me',
                startHistoryId=start_history_id,
                historyTypes=['messageAdded']  # Only new messages
            ).execute()
            
            if 'history' not in history_response:
                print("  No new changes found")
                return 0
            
            # Process each history record
            for history_record in history_response.get('history', []):
                messages_added = history_record.get('messagesAdded', [])
                
                for message_info in messages_added:
                    message = message_info.get('message', {})
                    message_id = message.get('id')
                    
                    if message_id:
                        print(f"  📧 New message detected: {message_id}")
                        self._fetch_and_save_message(message_id)
                        new_emails_count += 1
            
            # Update to latest history ID
            if 'historyId' in history_response:
                self._save_history_id(history_response['historyId'])
            
            print(f"✓ Processed {new_emails_count} new email(s)")
            return new_emails_count
            
        except Exception as e:
            print(f"✗ Error processing history: {str(e)}")
            return 0
    
    async def handle_pubsub_notification(self, notification_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle incoming Pub/Sub notification from Gmail
        
        Args:
            notification_data: The decoded notification data with emailAddress and historyId
            
        Returns:
            Dict with processing status
        """
        try:
            email_address = notification_data.get('emailAddress')
            new_history_id = notification_data.get('historyId')
            
            print(f"\n🔔 Received notification for {email_address}")
            print(f"   New history ID: {new_history_id}")
            
            if not self.last_history_id:
                print("   No previous history ID, using notification ID as baseline")
                self._save_history_id(new_history_id)
                return {
                    "status": "success",
                    "message": "Baseline history ID set",
                    "new_emails": 0
                }
            
            # Process changes since last known history ID
            new_emails = self.process_history_changes(self.last_history_id)
            
            # Update to new history ID
            self._save_history_id(new_history_id)
            
            return {
                "status": "success",
                "message": f"Processed {new_emails} new email(s)",
                "new_emails": new_emails,
                "history_id": new_history_id
            }
            
        except Exception as e:
            print(f"✗ Error handling notification: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def get_watch_status(self) -> Dict[str, Any]:
        """Get current watch status"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT history_id, expiration, last_updated 
                FROM watch_state 
                WHERE id = 1
            """)
            result = cursor.fetchone()
            conn.close()
            
            if result:
                return {
                    "status": "active",
                    "history_id": result[0],
                    "expiration": result[1],
                    "last_updated": result[2]
                }
            else:
                return {
                    "status": "not_configured",
                    "message": "No watch state found. Call /watch to setup."
                }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }

# Singleton instance
_pubsub_service = None

def get_pubsub_service() -> PubSubService:
    """Get or create PubSubService singleton"""
    global _pubsub_service
    if _pubsub_service is None:
        _pubsub_service = PubSubService()
    return _pubsub_service
