import { useState, useEffect } from "react";
import { Calendar, Plus, Clock, MapPin, Users, Edit, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { mailmateAPI } from "@/services/mailmateApi";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  attendees?: Array<{
    email: string;
    responseStatus: string;
  }>;
  organizer?: string;
  htmlLink?: string;
  status: string;
}

interface EventFormData {
  summary: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  attendees: string;
  timezone: string;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    summary: "",
    description: "",
    location: "",
    start_time: "",
    end_time: "",
    attendees: "",
    timezone: "UTC"
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await mailmateAPI.getCalendarEvents(50);
      if (response.success && response.events) {
        setEvents(response.events);
      }
    } catch (error) {
      console.error("Error loading calendar events:", error);
      // Load mock data for testing if API fails
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    // Mock data from calendar_api_result.json for testing
    const mockEvents: CalendarEvent[] = [
      {
        id: "mock-1",
        summary: "Team Meeting",
        description: "Weekly team sync",
        location: "",
        start: "2025-01-20T14:00:00+01:00",
        end: "2025-01-20T15:00:00+01:00",
        attendees: [
          { email: "team@example.com", responseStatus: "needsAction" }
        ],
        organizer: "organizer@example.com",
        status: "confirmed"
      }
    ];
    setEvents(mockEvents);
  };

  const handleOpenModal = (event?: CalendarEvent) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        summary: event.summary || "",
        description: event.description || "",
        location: event.location || "",
        start_time: formatDateTimeForInput(event.start),
        end_time: formatDateTimeForInput(event.end),
        attendees: event.attendees?.map(a => a.email).join(", ") || "",
        timezone: "UTC"
      });
    } else {
      setEditingEvent(null);
      setFormData({
        summary: "",
        description: "",
        location: "",
        start_time: "",
        end_time: "",
        attendees: "",
        timezone: "UTC"
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEvent(null);
    setFormData({
      summary: "",
      description: "",
      location: "",
      start_time: "",
      end_time: "",
      attendees: "",
      timezone: "UTC"
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const eventData = {
        summary: formData.summary,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        description: formData.description || undefined,
        location: formData.location || undefined,
        attendees: formData.attendees 
          ? formData.attendees.split(",").map(e => e.trim()).filter(e => e)
          : undefined,
        timezone: formData.timezone
      };

      if (editingEvent) {
        await mailmateAPI.updateCalendarEvent(editingEvent.id, eventData);
      } else {
        await mailmateAPI.createCalendarEvent(eventData);
      }

      handleCloseModal();
      loadEvents();
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Failed to save event. Please check your backend connection.");
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) {
      return;
    }

    try {
      await mailmateAPI.deleteCalendarEvent(eventId);
      loadEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event. Please check your backend connection.");
    }
  };

  const formatDateTimeForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-full flex flex-col px-6 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Calendar
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage your events and meetings
            </p>
          </div>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="bg-supporting-orange hover:bg-opacity-90 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Event
        </Button>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading events...</div>
          </div>
        ) : events.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16">
              <div className="text-center text-gray-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No events yet</p>
                <p className="text-sm mt-2">Create your first event to get started</p>
                <Button
                  onClick={() => handleOpenModal()}
                  variant="outline"
                  className="mt-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{event.summary}</CardTitle>
                      {event.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {event.description}
                        </p>
                      )}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>{formatDateTime(event.start)}</span>
                          <span>→</span>
                          <span>{formatDateTime(event.end)}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <MapPin className="w-4 h-4" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        {event.attendees && event.attendees.length > 0 && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Users className="w-4 h-4" />
                            <span>{event.attendees.length} attendee(s)</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        onClick={() => handleOpenModal(event)}
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(event.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Create/Edit Event */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {editingEvent ? "Edit Event" : "Create New Event"}
              </h2>
              <Button
                onClick={handleCloseModal}
                variant="outline"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <Label htmlFor="summary">Event Title *</Label>
                <Input
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Team Meeting"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Meeting agenda and details..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Date & Time *</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Date & Time *</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Conference Room A"
                />
              </div>

              <div>
                <Label htmlFor="attendees">Attendees (comma-separated emails)</Label>
                <Input
                  id="attendees"
                  value={formData.attendees}
                  onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                  placeholder="john@example.com, jane@example.com"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <Button
                  type="button"
                  onClick={handleCloseModal}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-supporting-orange hover:bg-opacity-90 text-white"
                >
                  {editingEvent ? "Update Event" : "Create Event"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}