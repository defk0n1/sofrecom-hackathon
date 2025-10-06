# Quick Start Guide - Google Calendar Integration

## 🚀 Getting Started in 5 Minutes

### 1. Prerequisites
- Google Cloud Console project with Calendar API enabled
- `credentials.json` file in project root
- Backend server running: `cd backend && python -m uvicorn main:app --reload`

### 2. Test the Integration

```bash
# Run the demo script
python3 examples/calendar_usage_demo.py

# Or test with curl
curl http://localhost:5000/calendar/events?max_results=5
```

### 3. Basic Usage

#### Get Upcoming Events
```bash
curl http://localhost:5000/calendar/events
```

#### Create an Event
```bash
curl -X POST http://localhost:5000/calendar/events \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Team Meeting",
    "start_time": "2025-01-20T14:00:00",
    "end_time": "2025-01-20T15:00:00",
    "timezone": "UTC"
  }'
```

#### Update an Event
```bash
curl -X PUT http://localhost:5000/calendar/events/EVENT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Updated Meeting Title",
    "location": "Zoom"
  }'
```

#### Delete an Event
```bash
curl -X DELETE http://localhost:5000/calendar/events/EVENT_ID
```

## 📚 Documentation Quick Links

- **Full Integration Guide**: [CALENDAR_INTEGRATION.md](CALENDAR_INTEGRATION.md)
- **Implementation Details**: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- **API Reference**: [backend/BACKEND_README.md](backend/BACKEND_README.md#calendar-endpoints-calendar)
- **Usage Examples**: [examples/calendar_usage_demo.py](examples/calendar_usage_demo.py)

## 🔑 Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `app/calendar_service.py` | Calendar API service | 259 |
| `backend/routers/calendar.py` | REST API endpoints | 154 |
| `backend/models/schemas.py` | Data models | +29 |

## 📋 API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/calendar/events` | List upcoming events |
| GET | `/calendar/events/{id}` | Get event details |
| POST | `/calendar/events` | Create new event |
| PUT | `/calendar/events/{id}` | Update event |
| DELETE | `/calendar/events/{id}` | Delete event |

## 💡 Common Use Cases

### 1. Get Today's Meetings
```python
from datetime import datetime
import requests

today = datetime.now().replace(hour=0, minute=0, second=0).isoformat() + 'Z'
response = requests.get(
    f"http://localhost:5000/calendar/events?time_min={today}&max_results=10"
)
events = response.json()['events']
```

### 2. Create Meeting from Email AI Analysis
```python
# Step 1: Analyze email
ai_response = requests.post("http://localhost:5000/ai/suggest-meetings", json={
    "email_text": "Let's meet tomorrow at 2pm"
})
suggestion = ai_response.json()['meetings'][0]

# Step 2: Create calendar event
calendar_event = {
    "summary": suggestion['title'],
    "start_time": f"{suggestion['suggested_date']}T{suggestion['suggested_time']}:00",
    "end_time": f"{suggestion['suggested_date']}T{int(suggestion['suggested_time'].split(':')[0]) + 1}:00:00",
    "timezone": "UTC"
}
requests.post("http://localhost:5000/calendar/events", json=calendar_event)
```

### 3. Bulk Event Creation
```python
events = [
    {"summary": "Meeting 1", "start_time": "2025-01-20T10:00:00", "end_time": "2025-01-20T11:00:00"},
    {"summary": "Meeting 2", "start_time": "2025-01-21T14:00:00", "end_time": "2025-01-21T15:00:00"},
]

for event in events:
    event["timezone"] = "UTC"
    requests.post("http://localhost:5000/calendar/events", json=event)
```

## 🧪 Testing

```bash
# Run all tests including calendar service tests
python3 test_gmail_api.py

# Expected output:
# CalendarService Structure: PASS
# ✓ Method 'get_upcoming_events' exists (async)
# ✓ Method 'create_event' exists (async)
# ✓ Method 'update_event' exists (async)
# ✓ Method 'delete_event' exists (async)
```

## 🔐 Authentication

Calendar uses the same OAuth flow as Gmail. First-time setup:

1. Place `credentials.json` in project root
2. Run the backend server
3. Make your first API call
4. Complete OAuth flow in browser
5. Token saved to `token.json` for future use

Both Gmail and Calendar permissions are requested together.

## 🐛 Troubleshooting

### Error: "Calendar service initialization failed"
- Check `credentials.json` exists
- Ensure Calendar API is enabled in Google Cloud Console
- Verify `token.json` has calendar scopes

### Error: "Invalid time format"
- Use ISO 8601 format: `2025-01-20T14:00:00`
- Include timezone parameter: `"timezone": "UTC"`

### Error: "Event not found"
- Verify event_id is correct
- Check event exists in your primary calendar

## 🎯 Next Steps

1. **Try the Demo**: Run `python3 examples/calendar_usage_demo.py`
2. **Read Full Docs**: Check [CALENDAR_INTEGRATION.md](CALENDAR_INTEGRATION.md)
3. **Integrate with Frontend**: Use the API endpoints in your UI
4. **Explore AI Integration**: Connect with meeting suggestions feature

## 📞 Support

- Check [CALENDAR_INTEGRATION.md](CALENDAR_INTEGRATION.md) for detailed examples
- Review [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for technical details
- See [backend/BACKEND_README.md](backend/BACKEND_README.md) for full API reference

---

**Status**: ✅ Production Ready  
**Version**: 1.0  
**Last Updated**: 2025-01-06
