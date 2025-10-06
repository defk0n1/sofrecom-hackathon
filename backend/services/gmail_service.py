import os
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, List, Dict, Any
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

token_path = 'token.json'
credentials_path = 'credentials.json'

SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.labels',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
]

if not os.path.exists(token_path):
    print(f"Warning: {token_path} not found. Please authenticate first to create this file.")

class GmailService:
    def __init__(self):
        self.service = None
        self.creds = None
        self.authenticate()

    def authenticate(self):
        """Authenticate with Gmail API using OAuth 2.0 - Auto-handles token refresh"""
        try:
            # Load existing credentials from token.json
            if os.path.exists(token_path):
                self.creds = Credentials.from_authorized_user_file(token_path, SCOPES)

            # If credentials don't exist or are invalid, authenticate
            if not self.creds or not self.creds.valid:
                if self.creds and self.creds.expired and self.creds.refresh_token:
                    # Automatically refresh expired tokens
                    print("Token expired, refreshing automatically...")
                    self.creds.refresh(Request())
                    # Save refreshed credentials
                    with open(token_path, 'w') as token:
                        token.write(self.creds.to_json())
                    print("Token refreshed successfully!")
                else:
                    # First-time authentication
                    if not os.path.exists('credentials.json'):
                        raise FileNotFoundError(
                            "credentials.json not found. Please download it from Google Cloud Console."
                        )
                    print("First-time authentication required. Opening browser...")
                    flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
                    self.creds = flow.run_local_server(port=0)
                    
                    # Save credentials for future use
                    with open(token_path, 'w') as token:
                        token.write(self.creds.to_json())
                    print("Authentication successful! Token saved.")
            
            # Build the service
            self.service = build('gmail', 'v1', credentials=self.creds)
            print("Gmail service initialized successfully!")
            
        except FileNotFoundError as e:
            print(f"❌ Authentication setup error: {str(e)}")
            raise Exception(f"Authentication setup error: {str(e)}")
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            raise Exception(f"Authentication error: {str(e)}")

    async def get_auth_url(self) -> str:
        """Get OAuth authorization URL"""
        if not os.path.exists('credentials.json'):
            raise FileNotFoundError("credentials.json not found")
        
        flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
        flow.redirect_uri = 'http://localhost:8000/auth/callback'
        auth_url, _ = flow.authorization_url(prompt='consent')
        return auth_url

    async def handle_auth_callback(self, code: str) -> Dict:
        """Handle OAuth callback and save credentials"""
        flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
        flow.redirect_uri = 'http://localhost:8000/auth/callback'
        flow.fetch_token(code=code)
        
        creds = flow.credentials
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
        
        self.service = build('gmail', 'v1', credentials=creds)
        return {"status": "success"}

    async def get_emails(self, max_results: int = 10, query: str = "") -> List[Dict[str, Any]]:
        """Get list of emails from Gmail"""
        try:
            results = self.service.users().messages().list(
                userId='me',
                maxResults=max_results,
                q=query
            ).execute()
            
            messages = results.get('messages', [])
            email_list = []
            
            for message in messages:
                email_detail = self.service.users().messages().get(
                    userId='me',
                    id=message['id'],
                    format='metadata',
                    metadataHeaders=['From', 'Subject', 'Date']
                ).execute()
                
                headers = {header['name']: header['value'] 
                          for header in email_detail.get('payload', {}).get('headers', [])}
                
                email_list.append({
                    'id': message['id'],
                    'threadId': email_detail.get('threadId'),
                    'from': headers.get('From', ''),
                    'subject': headers.get('Subject', ''),
                    'date': headers.get('Date', ''),
                    'snippet': email_detail.get('snippet', '')
                })
            
            return email_list
        except Exception as e:
            raise Exception(f"Error fetching emails: {str(e)}")

    async def get_email_detail(self, email_id: str) -> Dict[str, Any]:
        """Get detailed information about a specific email"""
        try:
            message = self.service.users().messages().get(
                userId='me',
                id=email_id,
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
                        body = base64.urlsafe_b64decode(
                            part['body'].get('data', '')
                        ).decode('utf-8')
                        break
            elif 'body' in payload and 'data' in payload['body']:
                body = base64.urlsafe_b64decode(
                    payload['body']['data']
                ).decode('utf-8')
            
            return {
                'id': message['id'],
                'threadId': message.get('threadId'),
                'labelIds': message.get('labelIds', []),
                'from': headers.get('From', ''),
                'to': headers.get('To', ''),
                'subject': headers.get('Subject', ''),
                'date': headers.get('Date', ''),
                'body': body,
                'snippet': message.get('snippet', '')
            }
        except Exception as e:
            raise Exception(f"Error fetching email detail: {str(e)}")

    async def send_email(
        self,
        to: str,
        subject: str,
        body: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """Send an email with optional CC, BCC, and attachments"""
        try:
            message = MIMEMultipart()
            message['to'] = to
            message['subject'] = subject
            
            if cc:
                message['cc'] = ', '.join(cc)
            if bcc:
                message['bcc'] = ', '.join(bcc)
            
            # Add body
            message.attach(MIMEText(body, 'plain'))
            
            # Add attachments if provided
            if attachments:
                for attachment in attachments:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(base64.b64decode(attachment['content']))
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename= {attachment["filename"]}'
                    )
                    message.attach(part)
            
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
            send_message = {'raw': raw_message}
            
            result = self.service.users().messages().send(
                userId='me',
                body=send_message
            ).execute()
            
            return result
        except Exception as e:
            raise Exception(f"Error sending email: {str(e)}")

    async def reply_to_email(
        self,
        email_id: str,
        body: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Reply to a specific email"""
        try:
            # Get original email
            original = await self.get_email_detail(email_id)
            
            message = MIMEMultipart()
            message['to'] = original['from']
            message['subject'] = f"Re: {original['subject']}"
            message['In-Reply-To'] = email_id
            message['References'] = email_id
            
            if cc:
                message['cc'] = ', '.join(cc)
            if bcc:
                message['bcc'] = ', '.join(bcc)
            
            message.attach(MIMEText(body, 'plain'))
            
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
            send_message = {
                'raw': raw_message,
                'threadId': original['threadId']
            }
            
            result = self.service.users().messages().send(
                userId='me',
                body=send_message
            ).execute()
            
            return result
        except Exception as e:
            raise Exception(f"Error replying to email: {str(e)}")

    async def forward_email(
        self,
        email_id: str,
        to: str,
        body: str = "",
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Forward a specific email"""
        try:
            # Get original email
            original = await self.get_email_detail(email_id)
            
            message = MIMEMultipart()
            message['to'] = to
            message['subject'] = f"Fwd: {original['subject']}"
            
            if cc:
                message['cc'] = ', '.join(cc)
            if bcc:
                message['bcc'] = ', '.join(bcc)
            
            # Add forwarding body and original content
            forward_body = f"{body}\n\n---------- Forwarded message ---------\n"
            forward_body += f"From: {original['from']}\n"
            forward_body += f"Date: {original['date']}\n"
            forward_body += f"Subject: {original['subject']}\n"
            forward_body += f"To: {original['to']}\n\n"
            forward_body += original['body']
            
            message.attach(MIMEText(forward_body, 'plain'))
            
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
            send_message = {'raw': raw_message}
            
            result = self.service.users().messages().send(
                userId='me',
                body=send_message
            ).execute()
            
            return result
        except Exception as e:
            raise Exception(f"Error forwarding email: {str(e)}")

    def delete_email(self, email_id: str) -> None:
        """Delete an email permanently"""
        try:
            self.service.users().messages().delete(
                userId='me',
                id=email_id
            ).execute()
        except Exception as e:
            raise Exception(f"Error deleting email: {str(e)}")

    def mark_as_read(self, email_id: str) -> None:
        """Mark an email as read"""
        try:
            self.service.users().messages().modify(
                userId='me',
                id=email_id,
                body={'removeLabelIds': ['UNREAD']}
            ).execute()
        except Exception as e:
            raise Exception(f"Error marking email as read: {str(e)}")

    def mark_as_unread(self, email_id: str) -> None:
        """Mark an email as unread"""
        try:
            self.service.users().messages().modify(
                userId='me',
                id=email_id,
                body={'addLabelIds': ['UNREAD']}
            ).execute()
        except Exception as e:
            raise Exception(f"Error marking email as unread: {str(e)}")

    def get_labels(self) -> List[Dict[str, Any]]:
        """Get all Gmail labels"""
        try:
            results = self.service.users().labels().list(userId='me').execute()
            labels = results.get('labels', [])
            return labels
        except Exception as e:
            raise Exception(f"Error fetching labels: {str(e)}")

    def add_label(self, email_id: str, label_id: str) -> None:
        """Add a label to an email"""
        try:
            self.service.users().messages().modify(
                userId='me',
                id=email_id,
                body={'addLabelIds': [label_id]}
            ).execute()
        except Exception as e:
            raise Exception(f"Error adding label: {str(e)}")

    def remove_label(self, email_id: str, label_id: str) -> None:
        """Remove a label from an email"""
        try:
            self.service.users().messages().modify(
                userId='me',
                id=email_id,
                body={'removeLabelIds': [label_id]}
            ).execute()
        except Exception as e:
            raise Exception(f"Error removing label: {str(e)}")
