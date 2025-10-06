import { RefreshCw, Mail, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EmailThread } from "@/App";
import { useState } from "react";
import { useToast } from "@/contexts/ToastContext";

interface EmailThreadSidebarProps {
  threads: EmailThread[];
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export default function EmailThreadSidebar({
  threads,
  selectedThreadId,
  onSelectThread,
  onRefresh,
  loading = false,
}: Readonly<EmailThreadSidebarProps>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { showToast } = useToast();

  const handleRefresh = () => {
    onRefresh();
    if (!loading) {
      showToast("info", "Refreshing email threads...");
    }
  };

  const filteredThreads = searchTerm
    ? threads.filter(
        (t) =>
          t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.emails.some(
            (e) =>
              e.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
              e.body.toLowerCase().includes(searchTerm.toLowerCase())
          )
      )
    : threads;

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const getThreadPreview = (thread: EmailThread): string => {
    if (thread.emails.length === 0) return "No messages";
    const lastEmail = thread.emails[thread.emails.length - 1];
    const preview = lastEmail.summary || lastEmail.body || "No content";
    return preview.substring(0, 80) + (preview.length > 80 ? "..." : "");
  };

  const getSenderName = (sender: string): string => {
    const match = /^([^<]+)/.exec(sender);
    return match ? match[1].trim() : sender;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header Section */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white m-0">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg">
              <Mail className="w-5 h-5 text-white" />
            </div>
            Inbox
            {filteredThreads.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                {filteredThreads.length}
              </span>
            )}
          </h3>
          <Button
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="btn btn-icon rounded-full w-9 h-9 p-0 flex items-center justify-center hover:scale-105 transition-transform"
            aria-label="Refresh threads"
            title="Refresh threads"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Search input */}
        <div className="relative">
          <div
            className={`flex items-center transition-all ${
              isSearchFocused ? "ring-2 ring-orange-500 rounded-full" : ""
            }`}
          >
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              placeholder="Search emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="w-full rounded-full pl-10 pr-10 py-2.5 bg-gray-100 dark:bg-gray-800 border-0 text-sm placeholder:text-gray-400 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto">
        {loading && threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
            <div className="relative">
              <Mail className="w-16 h-16 mb-4 opacity-20" />
              <Loader2 className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-spin text-orange-500" />
            </div>
            <p className="text-sm font-medium">Loading your emails...</p>
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
            <Mail className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-sm font-medium">
              {searchTerm ? "No matching emails" : "No email threads"}
            </p>
            {!searchTerm && (
              <p className="text-xs mt-2 text-gray-400">
                Your conversations will appear here
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredThreads.map((thread) => {
              const lastEmail = thread.emails[thread.emails.length - 1];
              const senderName = lastEmail
                ? getSenderName(lastEmail.sender)
                : "Unknown";
              const isSelected = selectedThreadId === thread.thread_id;
              const emailCount = thread.emails.length;

              return (
                <div
                  key={thread.thread_id}
                  className={`group relative px-4 py-3 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "bg-gradient-to-r from-orange-50 to-transparent dark:from-gray-800 dark:to-transparent border-l-4 border-orange-500"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/30 border-l-4 border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                  }`}
                  onClick={() => onSelectThread(thread.thread_id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4
                          className={`font-semibold text-sm truncate ${
                            isSelected
                              ? "text-gray-900 dark:text-white"
                              : "text-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {thread.subject || "(No subject)"}
                        </h4>
                        {emailCount > 1 && (
                          <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                            {emailCount}
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs font-medium mb-1 truncate ${
                          isSelected
                            ? "text-gray-700 dark:text-gray-300"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {senderName}
                      </p>
                      <p className="text-xs truncate text-gray-500 dark:text-gray-500 leading-relaxed">
                        {getThreadPreview(thread)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span
                        className={`text-xs font-medium whitespace-nowrap ${
                          isSelected
                            ? "text-orange-500"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        {lastEmail ? formatDate(lastEmail.received_date) : ""}
                      </span>
                    </div>
                  </div>

                  {/* Hover indicator */}
                  {!isSelected && (
                    <div className="absolute inset-y-0 right-0 w-1 bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
