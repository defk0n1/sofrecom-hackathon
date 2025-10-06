from fastapi import APIRouter, HTTPException
from typing import Optional
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from services.calendar_service import CalendarService
from models.schemas import CalendarEventRequest, CalendarEventUpdate

router = APIRouter(prefix="/calendar", tags=["Calendar"])

# Initialize calendar service
calendar_service = None

def get_calendar_service():
    global calendar_service
    if calendar_service is None:
        try:
            calendar_service = CalendarService()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Calendar service initialization failed: {str(e)}")
    return calendar_service


@router.get("/events")
async def get_upcoming_events(
    max_results: int = 10,
    time_min: Optional[str] = None,
    time_max: Optional[str] = None
):
    """
    Get upcoming calendar events
    
    Parameters:
    - max_results: Maximum number of events to return (default: 10)
    - time_min: Lower bound (inclusive) for event start time (ISO 8601 format)
    - time_max: Upper bound (exclusive) for event end time (ISO 8601 format)
    {
    "success": true,
    "count": 10,
    "events": [
        {
            "id": "h3f4e12stp7n1o9v7cospk7sfc",
            "summary": "réunion",
            "description": "aslamaaa inda reunion",
            "location": "",
            "start": "2025-10-07T14:00:00+01:00",
            "end": "2025-10-07T15:00:00+01:00",
            "attendees": [
                {
                    "email": "email2@example.com",
                    "responseStatus": "needsAction"
                },
                {
                    "email": "email1@example.com",
                    "responseStatus": "needsAction"
                }
            ],
            "organizer": "hackathon.sofrecom2025@gmail.com",
            "htmlLink": "https://www.google.com/calendar/event?eid=aDNmNGUxMnN0cDduMW85djdjb3NwazdzZmMgaGFja2F0aG9uLnNvZnJlY29tMjAyNUBt",
            "status": "confirmed"
        },
        {
            "id": "j32g6l3uk1pt7agaqgsane7a14",
            "summary": "réunion",
            "description": "aslamaaa inda reunion",
            "location": "",
            "start": "2025-10-07T14:00:00+01:00",
            "end": "2025-10-07T15:00:00+01:00",
            "attendees": [
                {
                    "email": "email2@example.com",
                    "responseStatus": "needsAction"
                },
                {
                    "email": "email1@example.com",
                    "responseStatus": "needsAction"
                }
            ],
            "organizer": "hackathon.sofrecom2025@gmail.com",
            "htmlLink": "https://www.google.com/calendar/event?eid=ajMyZzZsM3VrMXB0N2FnYXFnc2FuZTdhMTQgaGFja2F0aG9uLnNvZnJlY29tMjAyNUBt",
            "status": "confirmed"
        },
        ...
    ]
    }
        
    """
    try:
        service = get_calendar_service()
        events = await service.get_upcoming_events(
            max_results=max_results,
            time_min=time_min,
            time_max=time_max
        )
        
        return {
            "success": True,
            "count": len(events),
            "events": events
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching events: {str(e)}")


@router.get("/events/{event_id}")
async def get_event_detail(event_id: str):
    """
    Get detailed information about a specific calendar event
    """
    try:
        service = get_calendar_service()
        event = await service.get_event_detail(event_id)
        
        return {
            "success": True,
            "event": event
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching event: {str(e)}")


@router.post("/events")
async def create_calendar_event(event: CalendarEventRequest):
    """
    Create a new calendar event
    
    Request body should include:
    - summary: Event title (required)
    - start_time: Event start time in ISO 8601 format (required)
    - end_time: Event end time in ISO 8601 format (required)
    - description: Event description (optional)
    - location: Event location (optional)
    - attendees: List of attendee email addresses (optional)
    - timezone: Timezone for the event (default: UTC)
    """
    try:
        service = get_calendar_service()
        created_event = await service.create_event(
            summary=event.summary,
            start_time=event.start_time,
            end_time=event.end_time,
            description=event.description,
            location=event.location,
            attendees=event.attendees,
            timezone=event.timezone
        )
        
        return {
            "success": True,
            "message": "Event created successfully",
            "event": created_event
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating event: {str(e)}")


@router.put("/events/{event_id}")
async def update_calendar_event(event_id: str, event: CalendarEventUpdate):
    """
    Update an existing calendar event
    
    All fields are optional - only provided fields will be updated
    """
    try:
        service = get_calendar_service()
        updated_event = await service.update_event(
            event_id=event_id,
            summary=event.summary,
            start_time=event.start_time,
            end_time=event.end_time,
            description=event.description,
            location=event.location,
            attendees=event.attendees,
            timezone=event.timezone
        )
        
        return {
            "success": True,
            "message": "Event updated successfully",
            "event": updated_event
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating event: {str(e)}")


@router.delete("/events/{event_id}")
async def delete_calendar_event(event_id: str):
    """
    Delete a calendar event
    """
    try:
        service = get_calendar_service()
        result = await service.delete_event(event_id)
        
        return {
            "success": True,
            "message": "Event deleted successfully",
            "event": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting event: {str(e)}")