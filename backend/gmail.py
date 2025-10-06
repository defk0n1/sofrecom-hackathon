from __future__ import print_function
import os.path
import base64
import sqlite3
import json
from datetime import datetime
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.auth.transport.requests import Request
import email

# If modifying these scopes, delete the file token.json
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def create_database():
    """Create SQLite database and emails table if they don't exist."""
    conn = sqlite3.connect('db/email.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS emails (
            id TEXT PRIMARY KEY,
            thread_id TEXT,
            sender TEXT,
            recipients TEXT,
            subject TEXT,
            body TEXT,
            received_date DATETIME,
            is_reply INTEGER DEFAULT 0,
            attachments TEXT
        )
    ''')
    conn.commit()
    return conn

def get_body(payload):
    """Recursively get the email body from payload."""
    if 'parts' in payload:
        for part in payload['parts']:
            body = get_body(part)
            if body:
                return body
    else:
        data = payload.get('body', {}).get('data')
        if data:
            return base64.urlsafe_b64decode(data).decode('utf-8')
    return None

def get_attachments(payload):
    """Extract attachment information from email payload."""
    attachments = []
    if 'parts' in payload:
        for part in payload['parts']:
            if part.get('filename'):
                attachment_info = {
                    'filename': part.get('filename'),
                    'mimeType': part.get('mimeType'),
                    'size': part.get('body', {}).get('size', 0)
                }
                attachments.append(attachment_info)
    return attachments

def main():
    # Create database connection
    conn = create_database()
    cursor = conn.cursor()

    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('token.json', 'w') as token:
            token.write(creds.to_json())

    try:
        service = build('gmail', 'v1', credentials=creds)

        # Get latest 10 messages
        results = service.users().messages().list(userId='me', maxResults=10).execute()
        messages = results.get('messages', [])

        if not messages:
            print('No messages found.')
        else:
            print('Saving emails to database...\n')
            for msg in messages:
                msg_data = service.users().messages().get(userId='me', id=msg['id']).execute()
                payload = msg_data['payload']
                headers = payload.get("headers")

                subject = ""
                sender = ""
                recipients = ""
                thread_id = msg_data.get('threadId', '')
                in_reply_to = ""
                
                for header in headers:
                    if header['name'] == 'From':
                        sender = header['value']
                    if header['name'] == 'Subject':
                        subject = header['value']
                    if header['name'] == 'To':
                        recipients = header['value']
                    if header['name'] == 'In-Reply-To':
                        in_reply_to = header['value']

                body = get_body(payload)
                attachments = get_attachments(payload)
                attachments_json = json.dumps(attachments) if attachments else None
                received_date = datetime.fromtimestamp(int(msg_data['internalDate'])/1000)
                is_reply = 1 if in_reply_to or subject.startswith('Re:') else 0

                # Insert or update email in database
                cursor.execute('''
                    INSERT OR REPLACE INTO emails (id, thread_id, sender, recipients, subject, body, received_date, is_reply, attachments)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (msg['id'], thread_id, sender, recipients, subject, body, received_date, is_reply, attachments_json))
                
                print(f"Saved email: {subject}")

            conn.commit()
            print("\nAll emails have been saved to the database.")

    except HttpError as error:
        print(f'An error occurred: {error}')
    finally:
        conn.close()

if __name__ == '__main__':
    main()
