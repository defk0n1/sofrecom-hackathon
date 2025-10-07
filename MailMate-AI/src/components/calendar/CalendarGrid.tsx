import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

interface CalendarGridProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
}

export default function CalendarGrid({
  events,
  onEventClick,
  onDateClick,
}: CalendarGridProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Get the first day of the month
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );

  // Get the last day of the month
  const lastDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );

  // Calculate calendar grid
  const calendarDays = useMemo(() => {
    const days = [];
    const startDay = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    // Previous month days
    const prevMonthLastDay = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      0
    ).getDate();

    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - 1,
          prevMonthLastDay - i
        ),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), i),
        isCurrentMonth: true,
      });
    }

    // Next month days to fill the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          i
        ),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentDate]);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventStart = new Date(event.start);
      return (
        eventStart.getFullYear() === date.getFullYear() &&
        eventStart.getMonth() === date.getMonth() &&
        eventStart.getDate() === date.getDate()
      );
    });
  };

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const formatMonthYear = () => {
    return currentDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatMonthYear()}
          </h2>
          <Button onClick={goToToday} variant="outline" size="sm">
            Today
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button
              onClick={goToPreviousMonth}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              onClick={goToNextMonth}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-md p-1">
            <Button
              onClick={() => setView("month")}
              variant={view === "month" ? "default" : "ghost"}
              size="sm"
              className="h-7"
            >
              Month
            </Button>
            <Button
              onClick={() => setView("week")}
              variant={view === "week" ? "default" : "ghost"}
              size="sm"
              className="h-7"
            >
              Week
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
          {daysOfWeek.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-gray-700 dark:text-gray-300 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 h-full overflow-y-auto">
          {calendarDays.map((day) => {
            const dayEvents = getEventsForDate(day.date);
            const isTodayDate = isToday(day.date);
            const dayKey = day.date.toISOString();

            return (
              <div
                key={dayKey}
                onClick={() => onDateClick(day.date)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onDateClick(day.date);
                  }
                }}
                role="button"
                tabIndex={0}
                className={cn(
                  "min-h-[100px] border-r border-b border-gray-200 dark:border-gray-800 p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                  !day.isCurrentMonth && "bg-gray-50 dark:bg-gray-900 opacity-50"
                )}
              >
                <div
                  className={cn(
                    "text-sm font-medium mb-1",
                    isTodayDate
                      ? "bg-supporting-orange text-white rounded-full w-7 h-7 flex items-center justify-center"
                      : "text-gray-900 dark:text-white"
                  )}
                >
                  {day.date.getDate()}
                </div>

                {/* Events for this day */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <button
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      className="w-full text-left bg-supporting-orange bg-opacity-10 border-l-2 border-supporting-orange px-1 py-0.5 rounded text-xs hover:bg-opacity-20 transition-colors cursor-pointer"
                    >
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {formatTime(event.start)}
                      </div>
                      <div className="text-gray-700 dark:text-gray-300 truncate">
                        {event.summary}
                      </div>
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
