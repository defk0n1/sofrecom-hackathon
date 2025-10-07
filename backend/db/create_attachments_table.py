"""
Database migration script to create attachments table
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "email.db")

def create_attachments_table():
    """Create attachments table if it doesn't exist"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create attachments table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email_id TEXT NOT NULL,
            attachment_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            mime_type TEXT,
            size INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (email_id) REFERENCES emails(id),
            UNIQUE(email_id, attachment_id)
        )
    ''')
    
    # Create index for faster queries
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_email_id 
        ON attachments(email_id)
    ''')
    
    conn.commit()
    conn.close()
    print("✓ Attachments table created successfully")

if __name__ == '__main__':
    create_attachments_table()
