from fastapi import APIRouter, HTTPException
from typing import Optional, List
import sys
import os

# Add parent directory to path to import from app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.calendar_service import CalendarService
from backend.models.schemas import CalendarEventRequest, CalendarEventUpdate, CalendarEventResponse

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
