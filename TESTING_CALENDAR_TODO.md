# Testing Guide: Calendar and Todo List Features

## Overview
This guide explains how to test the newly implemented Calendar and Todo List features.

## Prerequisites

### Frontend Setup
```bash
cd MailMate-AI
npm install
npm run dev
```
The frontend will run on `http://localhost:8080`

### Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Make sure you have Google Calendar credentials set up
# Place credentials.json in the backend directory
# See API_DOCUMENTATION.md for setup instructions

python main.py
```
The backend will run on `http://localhost:5000`

## Testing Calendar Features

### 1. View Events
1. Navigate to the Calendar page using the sidebar
2. The page should display:
   - A header with Calendar icon and title
   - "New Event" button in orange (supporting-orange color)
   - List of existing events (or mock data if backend is not connected)

### 2. Create Event
1. Click the "New Event" button
2. A modal should appear with the following fields:
   - Event Title* (required)
   - Description
   - Start Date & Time* (required)
   - End Date & Time* (required)
   - Location
   - Attendees (comma-separated emails)
3. Fill in the form:
   ```
   Title: Team Standup
   Description: Daily standup meeting
   Start: 2025-01-22 09:00
   End: 2025-01-22 09:30
   Location: Zoom
   Attendees: team@example.com
   ```
4. Click "Create Event"
5. The event should appear in the list (if backend is connected)

### 3. Edit Event
1. Find an event in the list
2. Click the edit button (pencil icon) on the right side
3. The edit modal should open with pre-filled data
4. Modify any field (e.g., change the title)
5. Click "Update Event"
6. Changes should be reflected in the list

### 4. Delete Event
1. Find an event in the list
2. Click the delete button (trash icon) on the right side
3. A confirmation dialog should appear
4. Click "OK" to confirm
5. The event should be removed from the list

### 5. Mock Data Fallback
If the backend is not running:
1. The Calendar page will automatically load mock data
2. A mock "Team Meeting" event will be displayed
3. This allows testing the UI without backend connection

## Testing Todo List Features

### 1. View Todo List
1. Navigate to the Todo List page using the sidebar
2. The page should display:
   - "Task Management" header with checkmark icon
   - "Sort by Priority" button
   - Clean card-based layout matching dashboard theme
   - Message "No tasks yet" if no tasks exist

### 2. View with Tasks
When tasks exist (from email analysis):
1. Tasks are grouped by conversation
2. Each task shows:
   - Task description
   - Priority badge (high/medium/low)
   - Status badge (Not Started/In Progress/Done)
   - Due date (if available)
   - Estimated time (if available)

### 3. Update Task Status
1. Find a task in the list
2. Use the dropdown on the right to change status
3. Options: Not Started, In Progress, Done
4. The task appearance updates immediately

### 4. Design Consistency
Verify the following design elements match the dashboard:
- ✓ Padding: px-6 py-6
- ✓ Card background: bg-card dark:bg-gray-900
- ✓ Border: border border-gray-200 dark:border-gray-800
- ✓ Shadow: shadow-sm
- ✓ Rounded corners: rounded-lg

## Backend API Testing

### Test Calendar Endpoints

#### Get Events
```bash
curl http://localhost:5000/calendar/events?max_results=10
```

Expected Response:
```json
{
  "success": true,
  "count": 10,
  "events": [...]
}
```

#### Create Event
```bash
curl -X POST http://localhost:5000/calendar/events \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Test Event",
    "start_time": "2025-01-22T10:00:00Z",
    "end_time": "2025-01-22T11:00:00Z",
    "description": "Test description",
    "location": "Test location",
    "attendees": ["test@example.com"]
  }'
```

#### Update Event
```bash
curl -X PUT http://localhost:5000/calendar/events/EVENT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Updated Event Title"
  }'
```

#### Delete Event
```bash
curl -X DELETE http://localhost:5000/calendar/events/EVENT_ID
```

## Common Issues and Solutions

### Issue: Calendar events not loading
**Solution**: 
1. Check if backend is running on port 5000
2. Verify Google Calendar API credentials are set up
3. Check browser console for API errors
4. If offline, mock data should load automatically

### Issue: CORS errors
**Solution**: 
1. Verify backend CORS configuration includes `http://localhost:8080`
2. Check backend main.py line 21

### Issue: Modal not closing after submit
**Solution**: 
1. Check browser console for errors
2. Ensure API response is successful
3. Modal closes automatically on successful operation

### Issue: Todo list styling looks different
**Solution**: 
1. Clear browser cache
2. Verify Vite dev server is running
3. Check that TodoPage.tsx has the proper wrapper div

## Features Checklist

### Calendar Page
- [x] List view with card layout
- [x] Create event modal
- [x] Edit event modal with pre-filled data
- [x] Delete event with confirmation
- [x] Date/time pickers
- [x] Form validation
- [x] Error handling with mock data fallback
- [x] Responsive design
- [x] Dashboard theme consistency

### Todo List Page
- [x] Card-based layout
- [x] Dashboard theme styling (padding, borders, shadows)
- [x] Task grouping by conversation
- [x] Priority badges
- [x] Status management
- [x] Sort by priority feature
- [x] Empty state message
- [x] Responsive design

## Screenshots Reference

1. **Calendar Main View**: Shows event list with edit/delete buttons
2. **Create Event Modal**: Form with all required fields
3. **Edit Event Modal**: Pre-filled form for editing
4. **Todo List Page**: Improved design with card layout

## Next Steps

After testing:
1. ✓ Verify all CRUD operations work
2. ✓ Check UI consistency across pages
3. ✓ Test responsive design on different screen sizes
4. Connect to real backend with Google Calendar API
5. Add more advanced features (recurring events, notifications, etc.)

## Support

For issues or questions:
- Check the API_DOCUMENTATION.md file
- Review backend logs in terminal
- Check browser console for frontend errors
- Verify environment variables are set correctly
