import { X, Clock, MapPin, Users, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

interface EventDetailsSidebarProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
}

export default function EventDetailsSidebar({
  event,
  onClose,
  onEdit,
  onDelete,
}: Readonly<EventDetailsSidebarProps>) {
  if (!event) return null;

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

  return (
    <>
      {/* Backdrop */}
      <button
        className="fixed inset-0 bg-black bg-opacity-30 z-40 cursor-default"
        onClick={onClose}
        aria-label="Close event details"
        type="button"
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 shadow-xl z-50 transform transition-transform">
        <Card className="h-full rounded-none border-0">
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between">
              <CardTitle className="text-xl pr-8">{event.summary}</CardTitle>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6 overflow-y-auto">
            {/* Time */}
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDateTime(event.start)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  to
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDateTime(event.end)}
                </div>
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Description
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    Location
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {event.location}
                  </p>
                </div>
              </div>
            )}

            {/* Attendees */}
            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Attendees ({event.attendees.length})
                  </h3>
                  <div className="space-y-2">
                    {event.attendees.map((attendee) => (
                      <div
                        key={attendee.email}
                        className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2"
                      >
                        <span className="truncate">{attendee.email}</span>
                        {attendee.responseStatus === "accepted" && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            Accepted
                          </span>
                        )}
                        {attendee.responseStatus === "declined" && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                            Declined
                          </span>
                        )}
                        {attendee.responseStatus === "needsAction" && (
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                            Pending
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Organizer */}
            {event.organizer && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  Organizer
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {event.organizer}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
              <Button
                onClick={() => onEdit(event)}
                variant="outline"
                className="flex-1"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                onClick={() => {
                  if (confirm("Are you sure you want to delete this event?")) {
                    onDelete(event.id);
                    onClose();
                  }
                }}
                variant="outline"
                className="flex-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
