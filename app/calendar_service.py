import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

# Scopes for Google Calendar API
CALENDAR_SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
]


class CalendarService:
    def __init__(self):
        self.service = None
        self.authenticate()

    def authenticate(self):
        """Authenticate with Google Calendar API using OAuth 2.0"""
        creds = None
        
        # Load existing credentials from token.json
        if os.path.exists('token.json'):
            creds = Credentials.from_authorized_user_file('token.json', CALENDAR_SCOPES)
        
        # If credentials don't exist or are invalid, authenticate
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not os.path.exists('credentials.json'):
                    raise FileNotFoundError(
                        "credentials.json not found. Please download it from Google Cloud Console."
                    )
                flow = InstalledAppFlow.from_client_secrets_file('credentials.json', CALENDAR_SCOPES)
                creds = flow.run_local_server(port=0)
            
            # Save credentials for future use
            with open('token.json', 'w') as token:
                token.write(creds.to_json())
        
        self.service = build('calendar', 'v3', credentials=creds)

    async def get_upcoming_events(
        self, 
        max_results: int = 10,
        time_min: Optional[str] = None,
        time_max: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get upcoming calendar events"""
        try:
            # Default to events from now onwards
            if not time_min:
                time_min = datetime.utcnow().isoformat() + 'Z'
            
            events_result = self.service.events().list(
                calendarId='primary',
                timeMin=time_min,
                timeMax=time_max,
                maxResults=max_results,
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            events = events_result.get('items', [])
            
            # Format events for easier consumption
            formatted_events = []
            for event in events:
                start = event.get('start', {}).get('dateTime', event.get('start', {}).get('date'))
                end = event.get('end', {}).get('dateTime', event.get('end', {}).get('date'))
                
                formatted_events.append({
                    'id': event.get('id'),
                    'summary': event.get('summary', 'No Title'),
                    'description': event.get('description', ''),
                    'location': event.get('location', ''),
                    'start': start,
                    'end': end,
                    'attendees': [
                        {
                            'email': attendee.get('email'),
                            'responseStatus': attendee.get('responseStatus', 'needsAction')
                        }
                        for attendee in event.get('attendees', [])
                    ],
                    'organizer': event.get('organizer', {}).get('email', ''),
                    'htmlLink': event.get('htmlLink', ''),
                    'status': event.get('status', 'confirmed')
                })
            
            return formatted_events
        except Exception as e:
            raise Exception(f"Error fetching calendar events: {str(e)}")

    async def create_event(
        self,
        summary: str,
        start_time: str,
        end_time: str,
        description: Optional[str] = None,
        location: Optional[str] = None,
        attendees: Optional[List[str]] = None,
        timezone: str = 'UTC'
    ) -> Dict[str, Any]:
        """Create a new calendar event"""
        try:
            event = {
                'summary': summary,
                'start': {
                    'dateTime': start_time,
                    'timeZone': timezone,
                },
                'end': {
                    'dateTime': end_time,
                    'timeZone': timezone,
                },
            }
            
            if description:
                event['description'] = description
            
            if location:
                event['location'] = location
            
            if attendees:
                event['attendees'] = [{'email': email} for email in attendees]
            
            created_event = self.service.events().insert(
                calendarId='primary',
                body=event,
                sendUpdates='all'  # Send notifications to attendees
            ).execute()
            
            return {
                'id': created_event.get('id'),
                'summary': created_event.get('summary'),
                'start': created_event.get('start', {}).get('dateTime'),
                'end': created_event.get('end', {}).get('dateTime'),
                'htmlLink': created_event.get('htmlLink'),
                'status': 'created'
            }
        except Exception as e:
            raise Exception(f"Error creating calendar event: {str(e)}")

    async def update_event(
        self,
        event_id: str,
        summary: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        description: Optional[str] = None,
        location: Optional[str] = None,
        attendees: Optional[List[str]] = None,
        timezone: str = 'UTC'
    ) -> Dict[str, Any]:
        """Update an existing calendar event"""
        try:
            # First, get the existing event
            event = self.service.events().get(
                calendarId='primary',
                eventId=event_id
            ).execute()
            
            # Update fields if provided
            if summary:
                event['summary'] = summary
            
            if start_time:
                event['start'] = {
                    'dateTime': start_time,
                    'timeZone': timezone,
                }
            
            if end_time:
                event['end'] = {
                    'dateTime': end_time,
                    'timeZone': timezone,
                }
            
            if description is not None:
                event['description'] = description
            
            if location is not None:
                event['location'] = location
            
            if attendees is not None:
                event['attendees'] = [{'email': email} for email in attendees]
            
            updated_event = self.service.events().update(
                calendarId='primary',
                eventId=event_id,
                body=event,
                sendUpdates='all'
            ).execute()
            
            return {
                'id': updated_event.get('id'),
                'summary': updated_event.get('summary'),
                'start': updated_event.get('start', {}).get('dateTime'),
                'end': updated_event.get('end', {}).get('dateTime'),
                'htmlLink': updated_event.get('htmlLink'),
                'status': 'updated'
            }
        except Exception as e:
            raise Exception(f"Error updating calendar event: {str(e)}")

    async def delete_event(self, event_id: str) -> Dict[str, Any]:
        """Delete a calendar event"""
        try:
            self.service.events().delete(
                calendarId='primary',
                eventId=event_id,
                sendUpdates='all'
            ).execute()
            
            return {
                'id': event_id,
                'status': 'deleted'
            }
        except Exception as e:
            raise Exception(f"Error deleting calendar event: {str(e)}")

    async def get_event_detail(self, event_id: str) -> Dict[str, Any]:
        """Get detailed information about a specific event"""
        try:
            event = self.service.events().get(
                calendarId='primary',
                eventId=event_id
            ).execute()
            
            start = event.get('start', {}).get('dateTime', event.get('start', {}).get('date'))
            end = event.get('end', {}).get('dateTime', event.get('end', {}).get('date'))
            
            return {
                'id': event.get('id'),
                'summary': event.get('summary', 'No Title'),
                'description': event.get('description', ''),
                'location': event.get('location', ''),
                'start': start,
                'end': end,
                'attendees': [
                    {
                        'email': attendee.get('email'),
                        'responseStatus': attendee.get('responseStatus', 'needsAction')
                    }
                    for attendee in event.get('attendees', [])
                ],
                'organizer': event.get('organizer', {}).get('email', ''),
                'htmlLink': event.get('htmlLink', ''),
                'status': event.get('status', 'confirmed'),
                'created': event.get('created'),
                'updated': event.get('updated')
            }
        except Exception as e:
            raise Exception(f"Error fetching event detail: {str(e)}")
