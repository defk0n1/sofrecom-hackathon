# Google Calendar Integration

This document describes the Google Calendar integration added to the MailMate AI project.

## Overview

The calendar integration allows you to:
- **Get upcoming meetings** from your Google Calendar
- **Create new events** with attendees, location, and description
- **Modify existing events** (update time, attendees, location, etc.)
- **Delete events** from your calendar

## Architecture

The integration follows the same pattern as the Gmail service:

```
app/
  ├── gmail_service.py       # Gmail API integration
  └── calendar_service.py    # Calendar API integration (NEW)

backend/
  ├── routers/
  │   ├── ai.py
  │   ├── attachments.py
  │   └── calendar.py        # Calendar endpoints (NEW)
  └── models/
      └── schemas.py         # Added calendar models (UPDATED)
```

## Authentication

The calendar service uses the same OAuth 2.0 credentials as the Gmail service. The required scopes have been added to `app/gmail_service.py`:

```python
SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.labels',
    'https://www.googleapis.com/auth/calendar',           # NEW
    'https://www.googleapis.com/auth/calendar.events'      # NEW
]
```

When users authenticate with the Gmail service, they will also be asked to grant calendar permissions.

## API Endpoints

### 1. Get Upcoming Events
```http
GET /calendar/events?max_results=10&time_min=2025-01-15T00:00:00Z
```

### 2. Get Event Details
```http
GET /calendar/events/{event_id}
```

### 3. Create Event
```http
POST /calendar/events
Content-Type: application/json

{
  "summary": "Team Meeting",
  "start_time": "2025-01-20T14:00:00",
  "end_time": "2025-01-20T15:00:00",
  "description": "Weekly sync meeting",
  "location": "Conference Room A",
  "attendees": ["john@example.com", "jane@example.com"],
  "timezone": "UTC"
}
```

### 4. Update Event
```http
PUT /calendar/events/{event_id}
Content-Type: application/json

{
  "summary": "Updated Meeting Title",
  "start_time": "2025-01-20T15:00:00",
  "end_time": "2025-01-20T16:00:00"
}
```

### 5. Delete Event
```http
DELETE /calendar/events/{event_id}
```

## Usage Examples

### Python Example

```python
import requests
from datetime import datetime, timedelta

base_url = "http://localhost:5000"

# Get upcoming events
response = requests.get(f"{base_url}/calendar/events?max_results=5")
events = response.json()
print(f"Found {events['count']} upcoming events")

# Create a new event
new_event = {
    "summary": "Project Review",
    "start_time": (datetime.now() + timedelta(days=1)).isoformat(),
    "end_time": (datetime.now() + timedelta(days=1, hours=1)).isoformat(),
    "description": "Quarterly project review meeting",
    "location": "Zoom",
    "attendees": ["team@example.com"],
    "timezone": "UTC"
}

response = requests.post(f"{base_url}/calendar/events", json=new_event)
created_event = response.json()
print(f"Created event: {created_event['event']['htmlLink']}")

# Update the event
event_id = created_event['event']['id']
update_data = {
    "summary": "Project Review - Updated",
    "location": "Conference Room B"
}

response = requests.put(f"{base_url}/calendar/events/{event_id}", json=update_data)
print(f"Event updated successfully")

# Delete the event
response = requests.delete(f"{base_url}/calendar/events/{event_id}")
print(f"Event deleted successfully")
```

### JavaScript/Fetch Example

```javascript
const baseUrl = 'http://localhost:5000';

// Get upcoming events
async function getUpcomingEvents() {
  const response = await fetch(`${baseUrl}/calendar/events?max_results=10`);
  const data = await response.json();
  console.log(`Found ${data.count} events:`, data.events);
  return data.events;
}

// Create a new event
async function createEvent() {
  const event = {
    summary: 'Team Standup',
    start_time: '2025-01-20T09:00:00',
    end_time: '2025-01-20T09:30:00',
    description: 'Daily standup meeting',
    attendees: ['team@example.com'],
    timezone: 'UTC'
  };
  
  const response = await fetch(`${baseUrl}/calendar/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  });
  
  const result = await response.json();
  console.log('Event created:', result.event);
  return result.event;
}

// Update an event
async function updateEvent(eventId) {
  const updates = {
    summary: 'Team Standup - Updated',
    location: 'Zoom'
  };
  
  const response = await fetch(`${baseUrl}/calendar/events/${eventId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  
  const result = await response.json();
  console.log('Event updated:', result.event);
}

// Delete an event
async function deleteEvent(eventId) {
  const response = await fetch(`${baseUrl}/calendar/events/${eventId}`, {
    method: 'DELETE'
  });
  
  const result = await response.json();
  console.log('Event deleted:', result);
}
```

## Integration with Existing Features

The calendar integration works seamlessly with existing MailMate AI features:

### Meeting Suggestions from Emails
The existing `/ai/suggest-meetings` endpoint analyzes emails and suggests meetings. You can now take those suggestions and create actual calendar events:

```python
# Step 1: Analyze email to get meeting suggestions
response = requests.post("http://localhost:5000/ai/suggest-meetings", json={
    "email_text": "Let's meet next week to discuss the project. Tuesday at 2 PM works for me.",
    "user_availability": []
})

suggestions = response.json()['meetings']

# Step 2: Create calendar event from suggestion
if suggestions:
    meeting = suggestions[0]
    calendar_event = {
        "summary": meeting['title'],
        "start_time": f"{meeting['suggested_date']}T{meeting['suggested_time']}:00",
        "end_time": f"{meeting['suggested_date']}T{int(meeting['suggested_time'].split(':')[0]) + 1}:00:00",
        "description": meeting.get('purpose', ''),
        "location": meeting.get('location', ''),
        "attendees": meeting.get('attendees', []),
        "timezone": "UTC"
    }
    
    response = requests.post("http://localhost:5000/calendar/events", json=calendar_event)
    print("Created event from AI suggestion:", response.json())
```

## Time Zones

All times should be in ISO 8601 format. The `timezone` parameter (default: "UTC") specifies the timezone for the event. Common values:
- "UTC"
- "America/New_York"
- "Europe/London"
- "Asia/Tokyo"

Example with timezone:
```python
event = {
    "summary": "Meeting",
    "start_time": "2025-01-20T14:00:00",
    "end_time": "2025-01-20T15:00:00",
    "timezone": "America/New_York"  # Eastern Time
}
```

## Error Handling

All endpoints return appropriate HTTP status codes and error messages:

```json
// Success (200)
{
  "success": true,
  "message": "Event created successfully",
  "event": { ... }
}

// Error (500)
{
  "detail": "Error creating calendar event: [error details]"
}
```

Common errors:
- **401**: Authentication failed (credentials expired or invalid)
- **404**: Event not found
- **500**: Internal server error (e.g., invalid time format, API quota exceeded)

## Testing

Run the test suite to verify the calendar integration:

```bash
python3 test_gmail_api.py
```

The test verifies that:
- ✓ CalendarService class exists with all required methods
- ✓ All methods are properly marked as async where appropriate
- ✓ Calendar endpoints are registered in the FastAPI app

## Setup Requirements

1. **Google Cloud Console Setup**:
   - Enable Google Calendar API for your project
   - Download `credentials.json` and place it in the project root
   - The required scopes are already configured in the code

2. **First-time Authentication**:
   - When you first run the service, you'll be prompted to authenticate
   - Grant both Gmail and Calendar permissions
   - A `token.json` file will be created for future use

3. **No Additional Dependencies**:
   - Calendar integration uses the same `google-api-python-client` library as Gmail
   - No new packages need to be installed

## File Changes Summary

### New Files
- `app/calendar_service.py` - Calendar API service implementation
- `backend/routers/calendar.py` - FastAPI router for calendar endpoints
- `CALENDAR_INTEGRATION.md` - This documentation file

### Modified Files
- `app/gmail_service.py` - Added calendar scopes to SCOPES list
- `backend/models/schemas.py` - Added CalendarEventRequest, CalendarEventUpdate, CalendarEventResponse models
- `backend/main.py` - Imported and registered calendar router
- `backend/BACKEND_README.md` - Added calendar endpoints documentation
- `test_gmail_api.py` - Added calendar service structure tests

## Future Enhancements

Possible improvements for the calendar integration:
- Add recurring event support
- Implement event reminders configuration
- Add calendar sharing and permissions management
- Support for multiple calendars (not just primary)
- Integration with task detection to auto-create events from email tasks
- Smart scheduling based on calendar availability
