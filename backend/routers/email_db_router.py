from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sqlite3
import json
import os
from datetime import datetime

router = APIRouter(prefix="/emails", tags=["emails"])

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "email.db")

class EmailSummaryRequest(BaseModel):
    email_text: str

class EmailThread(BaseModel):
    thread_id: str
    subject: str
    emails: List[Dict[str, Any]]

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@router.get("/threads")
async def get_email_threads():
    """Get all email threads grouped by thread_id"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all unique threads
        cursor.execute("""
            SELECT DISTINCT thread_id, subject 
            FROM emails 
            WHERE thread_id IS NOT NULL AND thread_id != ''
            ORDER BY received_date DESC
        """)
        
        threads = []
        seen_threads = set()
        
        for row in cursor.fetchall():
            thread_id = row['thread_id']
            if thread_id not in seen_threads:
                seen_threads.add(thread_id)
                
                # Get all emails in this thread
                cursor.execute("""
                    SELECT id, thread_id, sender, recipients, subject, body, 
                           received_date, is_reply, attachments
                    FROM emails
                    WHERE thread_id = ?
                    ORDER BY received_date ASC
                """, (thread_id,))
                
                emails = []
                for email_row in cursor.fetchall():
                    email_data = dict(email_row)
                    # Parse attachments JSON if present
                    if email_data['attachments']:
                        try:
                            email_data['attachments'] = json.loads(email_data['attachments'])
                        except:
                            email_data['attachments'] = []
                    else:
                        email_data['attachments'] = []
                    emails.append(email_data)
                
                if emails:
                    threads.append({
                        'thread_id': thread_id,
                        'subject': row['subject'],
                        'emails': emails
                    })
        
        # Also get emails without thread_id
        cursor.execute("""
            SELECT id, thread_id, sender, recipients, subject, body, 
                   received_date, is_reply, attachments
            FROM emails
            WHERE thread_id IS NULL OR thread_id = ''
            ORDER BY received_date DESC
        """)
        
        for email_row in cursor.fetchall():
            email_data = dict(email_row)
            if email_data['attachments']:
                try:
                    email_data['attachments'] = json.loads(email_data['attachments'])
                except:
                    email_data['attachments'] = []
            else:
                email_data['attachments'] = []
            
            # Create a single-email thread
            threads.append({
                'thread_id': email_data['id'],
                'subject': email_data['subject'],
                'emails': [email_data]
            })
        
        conn.close()
        return {"status": "success", "threads": threads}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/threads/{thread_id}")
async def get_email_thread(thread_id: str):
    """Get a specific email thread by thread_id"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, thread_id, sender, recipients, subject, body, 
                   received_date, is_reply, attachments
            FROM emails
            WHERE thread_id = ? OR id = ?
            ORDER BY received_date ASC
        """, (thread_id, thread_id))
        
        emails = []
        for email_row in cursor.fetchall():
            email_data = dict(email_row)
            if email_data['attachments']:
                try:
                    email_data['attachments'] = json.loads(email_data['attachments'])
                except:
                    email_data['attachments'] = []
            else:
                email_data['attachments'] = []
            emails.append(email_data)
        
        conn.close()
        
        if not emails:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        return {
            "status": "success",
            "thread": {
                "thread_id": thread_id,
                "subject": emails[0]['subject'],
                "emails": emails
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/db-stats")
async def get_database_stats():
    """Get statistics about the email database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) as total FROM emails")
        total_emails = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(DISTINCT thread_id) as threads FROM emails WHERE thread_id IS NOT NULL AND thread_id != ''")
        total_threads = cursor.fetchone()['threads']
        
        cursor.execute("SELECT COUNT(*) as replies FROM emails WHERE is_reply = 1")
        total_replies = cursor.fetchone()['replies']
        
        conn.close()
        
        return {
            "status": "success",
            "stats": {
                "total_emails": total_emails,
                "total_threads": total_threads,
                "total_replies": total_replies
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
