// services/mailmateApi.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export interface EmailAnalysis {
  summary: string;
  key_points: string[];
  sentiment: string;
  urgency: string;
  language_detected: string;
  tasks: Task[];
  meeting_suggestions: MeetingSuggestion[];
  entities: {
    people: string[];
    organizations: string[];
    dates: string[];
    locations: string[];
  };
  follow_up_required: boolean;
  attachments_mentioned: string[];
}

export interface Task {
  task: string;
  priority: string;
  due_date: string | null;
  estimated_time: string | null;
  assigned_to: string | null;
}

export interface MeetingSuggestion {
  title: string;
  purpose?: string;
  suggested_date: string;
  suggested_time: string;
  duration: string;
  attendees: string[];
  location?: string;
  priority?: string;
  preparation_needed?: string;
  notes?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TranslationResult {
  translated_text: string;
  source_language: string;
  target_language: string;
  translation_notes?: string;
}

export const mailmateAPI = {
  // Process email
  processEmail: async (
    emailText: string | null = null,
    file: File | null = null
  ) => {
    const formData = new FormData();
    if (file) formData.append("file", file);
    if (emailText) formData.append("email_text", emailText);

    const response = await fetch(`${API_BASE_URL}/ai/process`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  replyToEmail: async (
    emailId: string,
    replyText: string,
    attachments?: File[]
  ) => {
    const formData = new FormData();
    formData.append("body", replyText);
    
    if (attachments && attachments.length > 0) {
      // Convert files to base64 for attachment handling
      const attachmentPromises = attachments.map(async (file) => {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
          };
          reader.readAsDataURL(file);
        });
        
        return {
          filename: file.name,
          content: base64,
          mime_type: file.type
        };
      });
      
      const attachmentData = await Promise.all(attachmentPromises);
      formData.append("attachments", JSON.stringify(attachmentData));
    }

    const response = await fetch(`${API_BASE_URL}/gmail/${emailId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: replyText,
        attachments: attachments && attachments.length > 0 
          ? await Promise.all(attachments.map(async (file) => {
              const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const base64String = (reader.result as string).split(',')[1];
                  resolve(base64String);
                };
                reader.readAsDataURL(file);
              });
              
              return {
                filename: file.name,
                content: base64,
                mime_type: file.type
              };
            }))
          : undefined
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  replyToAll: async (
    emailId: string,
    replyText: string,
    attachments?: File[]
  ) => {
    const response = await fetch(`${API_BASE_URL}/gmail/${emailId}/reply-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: replyText,
        attachments: attachments && attachments.length > 0 
          ? await Promise.all(attachments.map(async (file) => {
              const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const base64String = (reader.result as string).split(',')[1];
                  resolve(base64String);
                };
                reader.readAsDataURL(file);
              });
              
              return {
                filename: file.name,
                content: base64,
                mime_type: file.type
              };
            }))
          : undefined
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Chat with AI
  chat: async (
    history: ChatMessage[],
    userInput: string,
    context: string | null = null
  ) => {
    const response = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history,
        user_input: userInput,
        context,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Translate text
  translate: async (
    text: string,
    targetLanguage: string,
    sourceLanguage: string | null = null
  ) => {
    const response = await fetch(`${API_BASE_URL}/ai/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        target_language: targetLanguage,
        source_language: sourceLanguage,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Detect tasks
  detectTasks: async (emailText: string) => {
    const response = await fetch(`${API_BASE_URL}/ai/detect-tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email_text: emailText }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Suggest meetings
  suggestMeetings: async (
    emailText: string,
    userAvailability: string[] = []
  ) => {
    const response = await fetch(`${API_BASE_URL}/ai/suggest-meetings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email_text: emailText,
        user_availability: userAvailability,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Query attachment
  queryAttachment: async (
    filename: string,
    query: string,
    fileBase64: string
  ) => {
    const response = await fetch(`${API_BASE_URL}/attachments/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename,
        query,
        file_content_base64: fileBase64,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Smart query for attachments (auto-detects file type)
  smartQuery: async (filename: string, query: string, fileBase64: string) => {
    const response = await fetch(`${API_BASE_URL}/attachments/smart-query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename,
        query,
        file_content_base64: fileBase64,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Classify attachment
  classifyAttachment: async (file: File, extractPreview: boolean = true) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("extract_preview", extractPreview.toString());

    const response = await fetch(`${API_BASE_URL}/ai/classify-attachment`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Health check
  healthCheck: async () => {
    const response = await fetch(`${API_BASE_URL}/health`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Email database endpoints
  getEmailThreads: async () => {
    const response = await fetch(`${API_BASE_URL}/emails/threads`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  getEmailThread: async (threadId: string) => {
    const response = await fetch(`${API_BASE_URL}/emails/threads/${threadId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  summarizeEmail: async (emailText: string) => {
    const formData = new FormData();
    formData.append("email_text", emailText);

    const response = await fetch(`${API_BASE_URL}/ai/summarize`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  getEmailDatabaseStats: async () => {
    const response = await fetch(`${API_BASE_URL}/emails/db-stats`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Calendar endpoints
  getCalendarEvents: async (
    maxResults: number = 10,
    timeMin?: string,
    timeMax?: string
  ) => {
    const params = new URLSearchParams({
      max_results: maxResults.toString(),
      ...(timeMin && { time_min: timeMin }),
      ...(timeMax && { time_max: timeMax }),
    });

    const response = await fetch(`${API_BASE_URL}/calendar/events?${params}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  getCalendarEvent: async (eventId: string) => {
    const response = await fetch(`${API_BASE_URL}/calendar/events/${eventId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  createCalendarEvent: async (event: {
    summary: string;
    start_time: string;
    end_time: string;
    description?: string;
    location?: string;
    attendees?: string[];
    timezone?: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/calendar/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  updateCalendarEvent: async (
    eventId: string,
    event: {
      summary?: string;
      start_time?: string;
      end_time?: string;
      description?: string;
      location?: string;
      attendees?: string[];
      timezone?: string;
    }
  ) => {
    const response = await fetch(`${API_BASE_URL}/calendar/events/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  deleteCalendarEvent: async (eventId: string) => {
    const response = await fetch(`${API_BASE_URL}/calendar/events/${eventId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  runAgent: async (prompt: string, context?: string, messages?: ChatMessage[]) => {
    const response = await fetch(`${API_BASE_URL}/agent/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt, // Just the user goal, no context embedded
        email_text: context || null, // CHANGED: Use email_text instead of context
        validator: true,
        return_plan: true,
        history: messages || [], // Include messages if provided
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `HTTP error! status: ${response.status}`
      );
    }

    return response.json();
  },
};
