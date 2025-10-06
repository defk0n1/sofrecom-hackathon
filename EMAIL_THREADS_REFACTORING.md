# Email Threads Refactoring Summary

## Overview
Refactored the email thread functionality to fetch threads from the main App component and pass them as props to child components, following React best practices for state management.

## Changes Made

### 1. App.tsx (Main Changes)
- **Added Email Thread State Management**
  - `emailThreads`: Array of all email threads
  - `selectedThreadId`: Currently selected thread ID
  - `threadsLoading`: Loading state for thread fetching

- **Added `loadEmailThreads()` Function**
  - Fetches email threads from the API using `mailmateAPI.getEmailThreads()`
  - Automatically selects the first thread on load
  - Handles loading and error states

- **Added Email Context Extraction**
  - `selectedThread`: Gets the currently selected thread from the threads array
  - `emailContextFromThread`: Formats thread emails into context string for AI chat
  - This context is passed to UnifiedChatInterface for context-aware chat

- **Conditional Sidebar Rendering**
  - When in 'email' mode: Shows `EmailThreadSidebar` with threads
  - When in 'chat' mode: Shows `ConversationSidebar` with conversations

### 2. EmailThreadViewer.tsx (Refactored)
- **Updated Props Interface**
  ```typescript
  interface EmailThreadViewerProps {
    userEmail?: string;
    threads: EmailThread[];           // Received from parent
    selectedThreadId: string | null;  // Received from parent
    loading?: boolean;                // Loading state from parent
  }
  ```

- **Removed Internal Thread Management**
  - Removed `threads` state (now comes from props)
  - Removed `loading` state (now comes from props)
  - Removed `loadThreads()` function (moved to App.tsx)
  - Removed `onSelectThread` prop (selection handled by sidebar)

- **Updated useEffect**
  - Now watches `selectedThreadId` and `threads` props
  - Loads thread with summaries when selection changes
  - No longer fetches threads directly

### 3. EmailThreadSidebar.tsx (New Component)
- **Purpose**: Displays list of email threads with search and selection
  
- **Features**
  - Thread list with subject, sender, preview, and timestamp
  - Search/filter functionality
  - Refresh button to reload threads
  - Loading states
  - Selected thread highlighting
  - Message count badge per thread

- **Props Interface**
  ```typescript
  interface EmailThreadSidebarProps {
    threads: EmailThread[];
    selectedThreadId: string | null;
    onSelectThread: (threadId: string) => void;
    onRefresh: () => void;
    loading?: boolean;
  }
  ```

### 4. Type Definitions
- **Moved to App.tsx** for shared access:
  ```typescript
  export interface EmailMessage {
    id: string;
    thread_id: string;
    sender: string;
    recipients: string;
    subject: string;
    body: string;
    received_date: string;
    is_reply: number;
    attachments: Array<{ filename: string; mimeType: string; size: number }>;
    summary?: string;
  }

  export interface EmailThread {
    thread_id: string;
    subject: string;
    emails: EmailMessage[];
  }
  ```

## Data Flow

```
App.tsx (State Container)
  ├── Fetches threads via mailmateAPI.getEmailThreads()
  ├── Manages emailThreads state
  ├── Manages selectedThreadId state
  │
  ├──> EmailThreadSidebar (Thread Selection)
  │     ├── Receives: threads, selectedThreadId, loading
  │     ├── Displays: Thread list with search
  │     └── Emits: onSelectThread(threadId)
  │
  └──> EmailThreadViewer (Thread Display)
        ├── Receives: threads, selectedThreadId, loading
        ├── Finds: Selected thread from threads array
        ├── Loads: Email summaries for display
        └── Displays: Email messages with tools
```

## Benefits

1. **Single Source of Truth**: Threads are fetched once in App.tsx
2. **Better Performance**: No duplicate API calls
3. **Easier State Management**: Thread selection controlled from one place
4. **Reusability**: EmailThreadViewer can be used with any thread data
5. **Separation of Concerns**: 
   - App.tsx: Data fetching and state management
   - EmailThreadSidebar: Thread selection UI
   - EmailThreadViewer: Thread display UI
6. **Context-Aware Chat**: Selected thread context available for AI chat

## Usage

When the user switches to "Email Threads" mode:
1. App.tsx fetches threads from the API
2. EmailThreadSidebar displays the list
3. User clicks a thread in the sidebar
4. App.tsx updates selectedThreadId
5. EmailThreadViewer receives the new selectedThreadId
6. EmailThreadViewer loads and displays that thread's emails
7. If user switches to chat mode, email context is available for AI

## Future Enhancements

- Add thread caching to reduce API calls
- Implement real-time thread updates via WebSocket
- Add thread archiving/deletion
- Add thread tagging and filtering
- Implement thread pagination for large datasets
