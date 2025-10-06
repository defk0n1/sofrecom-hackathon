#!/usr/bin/env python3
"""
Example usage of the Google Calendar Integration
This script demonstrates how to use the calendar endpoints
"""

import requests
from datetime import datetime, timedelta
import json

BASE_URL = "http://localhost:5000"


def print_section(title):
    """Print a formatted section header"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def demo_get_events():
    """Demonstrate getting upcoming events"""
    print_section("1. Get Upcoming Events")
    
    url = f"{BASE_URL}/calendar/events?max_results=5"
    print(f"GET {url}\n")
    
    # Expected response structure
    response_example = {
        "success": True,
        "count": 2,
        "events": [
            {
                "id": "event123",
                "summary": "Team Meeting",
                "description": "Weekly team sync",
                "location": "Conference Room A",
                "start": "2025-01-15T10:00:00Z",
                "end": "2025-01-15T11:00:00Z",
                "attendees": [
                    {"email": "john@example.com", "responseStatus": "accepted"}
                ],
                "organizer": "admin@example.com",
                "htmlLink": "https://calendar.google.com/...",
                "status": "confirmed"
            }
        ]
    }
    
    print("Expected Response:")
    print(json.dumps(response_example, indent=2))


def demo_create_event():
    """Demonstrate creating a new event"""
    print_section("2. Create New Event")
    
    url = f"{BASE_URL}/calendar/events"
    
    # Calculate start time (tomorrow at 2 PM)
    start_time = (datetime.now() + timedelta(days=1)).replace(hour=14, minute=0, second=0)
    end_time = start_time + timedelta(hours=1)
    
    request_body = {
        "summary": "Project Kickoff Meeting",
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "description": "Kickoff meeting for the new project phase",
        "location": "Conference Room 301",
        "attendees": ["john@example.com", "jane@example.com"],
        "timezone": "UTC"
    }
    
    print(f"POST {url}")
    print("\nRequest Body:")
    print(json.dumps(request_body, indent=2))
    
    response_example = {
        "success": True,
        "message": "Event created successfully",
        "event": {
            "id": "new_event_abc123",
            "summary": "Project Kickoff Meeting",
            "start": start_time.isoformat(),
            "end": end_time.isoformat(),
            "htmlLink": "https://calendar.google.com/calendar/event?eid=...",
            "status": "created"
        }
    }
    
    print("\nExpected Response:")
    print(json.dumps(response_example, indent=2))


def demo_update_event():
    """Demonstrate updating an event"""
    print_section("3. Update Existing Event")
    
    event_id = "event_abc123"
    url = f"{BASE_URL}/calendar/events/{event_id}"
    
    request_body = {
        "summary": "Project Kickoff Meeting - Updated",
        "location": "Zoom Meeting",
        "description": "Updated: Meeting will be held online"
    }
    
    print(f"PUT {url}")
    print("\nRequest Body:")
    print(json.dumps(request_body, indent=2))
    
    response_example = {
        "success": True,
        "message": "Event updated successfully",
        "event": {
            "id": event_id,
            "summary": "Project Kickoff Meeting - Updated",
            "start": "2025-01-20T14:00:00",
            "end": "2025-01-20T15:00:00",
            "htmlLink": "https://calendar.google.com/calendar/event?eid=...",
            "status": "updated"
        }
    }
    
    print("\nExpected Response:")
    print(json.dumps(response_example, indent=2))


def demo_delete_event():
    """Demonstrate deleting an event"""
    print_section("4. Delete Event")
    
    event_id = "event_abc123"
    url = f"{BASE_URL}/calendar/events/{event_id}"
    
    print(f"DELETE {url}\n")
    
    response_example = {
        "success": True,
        "message": "Event deleted successfully",
        "event": {
            "id": event_id,
            "status": "deleted"
        }
    }
    
    print("Expected Response:")
    print(json.dumps(response_example, indent=2))


def demo_integration_with_ai():
    """Demonstrate integration with AI meeting suggestions"""
    print_section("5. Integration with AI Meeting Suggestions")
    
    print("Step 1: Analyze email for meeting suggestions")
    print(f"POST {BASE_URL}/ai/suggest-meetings\n")
    
    ai_request = {
        "email_text": "Let's schedule a meeting next Tuesday at 2 PM to discuss the Q1 results.",
        "user_availability": []
    }
    
    print("Request:")
    print(json.dumps(ai_request, indent=2))
    
    ai_response = {
        "success": True,
        "meetings": [
            {
                "title": "Q1 Results Discussion",
                "purpose": "Review and discuss Q1 results",
                "suggested_date": "2025-01-21",
                "suggested_time": "14:00",
                "duration": "1 hour",
                "attendees": [],
                "priority": "high"
            }
        ]
    }
    
    print("\nAI Response:")
    print(json.dumps(ai_response, indent=2))
    
    print("\n" + "-" * 60)
    print("Step 2: Create calendar event from AI suggestion")
    print(f"POST {BASE_URL}/calendar/events\n")
    
    calendar_request = {
        "summary": "Q1 Results Discussion",
        "start_time": "2025-01-21T14:00:00",
        "end_time": "2025-01-21T15:00:00",
        "description": "Review and discuss Q1 results",
        "timezone": "UTC"
    }
    
    print("Request:")
    print(json.dumps(calendar_request, indent=2))
    
    calendar_response = {
        "success": True,
        "message": "Event created successfully",
        "event": {
            "id": "ai_generated_event_123",
            "summary": "Q1 Results Discussion",
            "start": "2025-01-21T14:00:00",
            "end": "2025-01-21T15:00:00",
            "htmlLink": "https://calendar.google.com/...",
            "status": "created"
        }
    }
    
    print("\nCalendar Response:")
    print(json.dumps(calendar_response, indent=2))


def main():
    """Run all demonstrations"""
    print("\n" + "=" * 60)
    print("  Google Calendar Integration - Usage Examples")
    print("=" * 60)
    print("\nThis script demonstrates the new calendar API endpoints.")
    print("Note: These are examples showing request/response format.")
    print("To actually use the API, ensure the backend server is running.")
    
    demo_get_events()
    demo_create_event()
    demo_update_event()
    demo_delete_event()
    demo_integration_with_ai()
    
    print("\n" + "=" * 60)
    print("  For more information, see CALENDAR_INTEGRATION.md")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
