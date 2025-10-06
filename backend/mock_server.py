#!/usr/bin/env python3
"""
Simple mock backend server for testing email thread viewer
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import json
import os

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), "db", "email.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

@app.route('/emails/threads', methods=['GET'])
def get_threads():
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
        
        conn.close()
        return jsonify({"status": "success", "threads": threads})
    
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/ai/summarize', methods=['POST'])
def summarize():
    try:
        email_text = request.form.get('email_text', '')
        
        # Simple summarization - take first 2 sentences
        sentences = email_text.split('. ')
        summary = '. '.join(sentences[:2])
        if not summary.endswith('.'):
            summary += '.'
        
        return jsonify({
            "success": True,
            "summary": summary,
            "original_length": len(email_text),
            "summary_length": len(summary)
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/emails/db-stats', methods=['GET'])
def get_stats():
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
        
        return jsonify({
            "status": "success",
            "stats": {
                "total_emails": total_emails,
                "total_threads": total_threads,
                "total_replies": total_replies
            }
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    print("Starting mock backend server on http://localhost:5000")
    print(f"Using database: {DB_PATH}")
    app.run(host='0.0.0.0', port=5000, debug=True)
