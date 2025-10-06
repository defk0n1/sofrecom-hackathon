import { RefreshCw, Mail, Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EmailThread } from '@/App';
import { useState } from 'react';

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
  loading = false
}: Readonly<EmailThreadSidebarProps>) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredThreads = searchTerm 
    ? threads.filter(t => 
        t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.emails.some(e => 
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
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getThreadPreview = (thread: EmailThread): string => {
    if (thread.emails.length === 0) return 'No messages';
    const lastEmail = thread.emails[thread.emails.length - 1];
    const preview = lastEmail.summary || lastEmail.body || 'No content';
    return preview.substring(0, 80) + (preview.length > 80 ? '...' : '');
  };

  const getSenderName = (sender: string): string => {
    const match = /^([^<]+)/.exec(sender);
    return match ? match[1].trim() : sender;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header Section */}
      <div className="p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Threads
          </h2>
          <Button
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="btn btn-icon rounded-full w-10 h-10 p-0 flex items-center justify-center"
            aria-label="Refresh threads"
            title="Refresh threads"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
          </Button>
        </div>
        
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search threads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control w-full rounded-full pl-10 pr-10 py-2 bg-gray-100 dark:bg-gray-800 border-0 focus:ring-2 focus:ring-supporting-orange text-sm"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto">
        {loading && threads.length === 0 ? (
          <div className="text-center text-gray-500 p-8">
            <Loader2 className="w-12 h-12 mx-auto mb-4 opacity-50 animate-spin" />
            <p className="text-sm">Loading threads...</p>
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="text-center text-gray-500 p-8">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">{searchTerm ? 'No matching threads' : 'No email threads'}</p>
            {!searchTerm && <p className="text-xs mt-1">Your email threads will appear here</p>}
          </div>
        ) : (
          <div className="space-y-0">
            {filteredThreads.map((thread) => {
              const lastEmail = thread.emails[thread.emails.length - 1];
              const senderName = lastEmail ? getSenderName(lastEmail.sender) : 'Unknown';
              
              return (
                <div
                  key={thread.thread_id}
                  className={`group relative p-4 cursor-pointer transition-colors border-l-4 ${
                    selectedThreadId === thread.thread_id
                      ? 'bg-gray-100 dark:bg-gray-800 border-supporting-orange'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-transparent'
                  }`}
                  onClick={() => onSelectThread(thread.thread_id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm truncate">
                          {thread.subject || '(No subject)'}
                        </p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                          {thread.emails.length}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {senderName}
                      </p>
                      <p className="text-xs mt-1 truncate text-gray-500 dark:text-gray-400">
                        {getThreadPreview(thread)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs whitespace-nowrap text-gray-400">
                        {lastEmail ? formatDate(lastEmail.received_date) : ''}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
