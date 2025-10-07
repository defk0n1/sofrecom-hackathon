import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  Users,
  Edit,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { mailmateAPI } from "@/services/mailmateApi";
import { useTranslation } from "react-i18next";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import type { View } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/css/calendar.css";

const localizer = momentLocalizer(moment);

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

interface BigCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: CalendarEvent;
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
  const { t } = useTranslation();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [formData, setFormData] = useState<EventFormData>({
    summary: "",
    description: "",
    location: "",
    start_time: "",
    end_time: "",
    attendees: "",
    timezone: "UTC",
  });

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          { email: "team@example.com", responseStatus: "needsAction" },
        ],
        organizer: "organizer@example.com",
        status: "confirmed",
      },
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
        attendees: event.attendees?.map((a) => a.email).join(", ") || "",
        timezone: "UTC",
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
        timezone: "UTC",
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
      timezone: "UTC",
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
          ? formData.attendees
              .split(",")
              .map((e) => e.trim())
              .filter((e) => e)
          : undefined,
        timezone: formData.timezone,
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
    if (!confirm(t("calendar.deleteConfirm"))) {
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
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Transform events for react-big-calendar
  const calendarEvents = useMemo<BigCalendarEvent[]>(() => {
    return events.map((event) => ({
      id: event.id,
      title: event.summary,
      start: new Date(event.start),
      end: new Date(event.end),
      resource: event,
    }));
  }, [events]);

  // Handle event selection
  const handleSelectEvent = useCallback((event: BigCalendarEvent) => {
    setSelectedEvent(event.resource || null);
    setShowEventDetails(true);
  }, []);

  // Handle slot selection for creating new events
  const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
    setFormData({
      summary: "",
      description: "",
      location: "",
      start_time: moment(slotInfo.start).format("YYYY-MM-DDTHH:mm"),
      end_time: moment(slotInfo.end).format("YYYY-MM-DDTHH:mm"),
      attendees: "",
      timezone: "UTC",
    });
    setEditingEvent(null);
    setShowModal(true);
  }, []);

  // Custom event styling
  const eventStyleGetter = () => {
    return {
      style: {
        backgroundColor: "#ff7900",
        borderRadius: "4px",
        opacity: 0.9,
        color: "white",
        border: "none",
        display: "block",
      },
    };
  };

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  const handleViewChange = (newView: View) => {
    setView(newView);
  };

  const goToToday = () => {
    setDate(new Date());
  };

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t("calendar.loading")}</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col px-6 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-supporting-orange inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br rounded-xl shadow-md">
            <CalendarIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t("calendar.title")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("calendar.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={goToToday}
            variant="outline"
            className="border-gray-300 dark:border-gray-700"
          >
            Today
          </Button>
          <Button
            onClick={() => handleOpenModal()}
            className="bg-supporting-orange hover:bg-opacity-90 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("calendar.newEvent")}
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      <div className="flex-1 overflow-hidden">
        <Card className="h-full border-gray-200 dark:border-gray-800 shadow-sm">
          <CardContent className="p-6 h-full">
            <div className="calendar-container h-full">
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: "100%" }}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                selectable
                view={view}
                onView={handleViewChange}
                date={date}
                onNavigate={handleNavigate}
                eventPropGetter={eventStyleGetter}
                views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                popup
                toolbar={true}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Details Modal */}
      {showEventDetails && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedEvent.summary}
              </h2>
              <Button
                onClick={() => setShowEventDetails(false)}
                variant="outline"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              {selectedEvent.description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Time
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {formatDateTime(selectedEvent.start)} →{" "}
                  {formatDateTime(selectedEvent.end)}
                </p>
              </div>

              {selectedEvent.location && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Location
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedEvent.location}
                  </p>
                </div>
              )}

              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Attendees ({selectedEvent.attendees.length})
                  </h3>
                  <ul className="space-y-1">
                    {selectedEvent.attendees.map((attendee, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-gray-600 dark:text-gray-400"
                      >
                        {attendee.email}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <Button
                  onClick={() => {
                    setShowEventDetails(false);
                    handleOpenModal(selectedEvent);
                  }}
                  className="flex-1 bg-supporting-orange hover:bg-opacity-90 text-white"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Event
                </Button>
                <Button
                  onClick={() => {
                    setShowEventDetails(false);
                    handleDelete(selectedEvent.id);
                  }}
                  variant="outline"
                  className="flex-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Event
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Create/Edit Event */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {editingEvent
                  ? t("calendar.editEvent")
                  : t("calendar.createEvent")}
              </h2>
              <Button onClick={handleCloseModal} variant="outline" size="sm">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <Label htmlFor="summary">{t("calendar.eventTitle")} *</Label>
                <Input
                  id="summary"
                  value={formData.summary}
                  onChange={(e) =>
                    setFormData({ ...formData, summary: e.target.value })
                  }
                  placeholder={t("calendar.placeholders.eventTitle")}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">{t("calendar.description")}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder={t("calendar.placeholders.description")}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">
                    {t("calendar.startDateTime")} *
                  </Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">
                    {t("calendar.endDateTime")} *
                  </Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) =>
                      setFormData({ ...formData, end_time: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location">{t("calendar.location")}</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder={t("calendar.placeholders.location")}
                />
              </div>

              <div>
                <Label htmlFor="attendees">{t("calendar.attendees")}</Label>
                <Input
                  id="attendees"
                  value={formData.attendees}
                  onChange={(e) =>
                    setFormData({ ...formData, attendees: e.target.value })
                  }
                  placeholder={t("calendar.placeholders.attendees")}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <Button
                  type="button"
                  onClick={handleCloseModal}
                  variant="outline"
                  className="flex-1"
                >
                  {t("calendar.cancel")}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-supporting-orange hover:bg-opacity-90 text-white"
                >
                  {editingEvent
                    ? t("calendar.updateEvent")
                    : t("calendar.createEvent")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
