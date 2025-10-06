import { Calendar } from "lucide-react";

export default function CalendarPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6 shadow-lg">
          <Calendar className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
          Calendar
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          Schedule management coming soon...
        </p>
      </div>
    </div>
  );
}