import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MessageCircle, Send, Loader2, Mail, Languages, Paperclip, 
  FileText, X, Sparkles, RefreshCw, Reply, Inbox
} from 'lucide-react';
import { mailmateAPI, type ChatMessage } from '@/services/mailmateApi';
import { useTranslation } from 'react-i18next';

interface EmailMessage {
  id: string;
  thread_id: string;
  sender: string;
  recipients: string;
  subject: string;
  body: string;
  received_date: string;
  is_reply: number;
  attachments: Array<{filename: string; mimeType: string; size: number}>;
  summary?: string;
}

interface EmailThread {
  thread_id: string;
  subject: string;
  emails: EmailMessage[];
}

type ToolType = 'chat' | 'analyze' | 'translate' | 'attachment' | 'reply';

interface EmailThreadViewerProps {
  userEmail?: string; // The authenticated user's email
}

export default function EmailThreadViewer({ userEmail = 'me@example.com' }: EmailThreadViewerProps) {
  const { t } = useTranslation();
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [currentThread, setCurrentThread] = useState<EmailThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [summariesLoading, setSummariesLoading] = useState<{[key: string]: boolean}>({});
  const [selectedTool, setSelectedTool] = useState<ToolType>('chat');
  const [input, setInput] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentThread]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  }, [input]);

  // Load threads on mount
  useEffect(() => {
    loadThreads();
  }, []);

  const loadThreads = async () => {
    try {
      setLoading(true);
      const response = await mailmateAPI.getEmailThreads();
      const loadedThreads = response.threads || [];
      setThreads(loadedThreads);
      
      // Load the first thread by default
      if (loadedThreads.length > 0) {
        await loadThreadWithSummaries(loadedThreads[0]);
      }
    } catch (error) {
      console.error('Error loading threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadThreadWithSummaries = async (thread: EmailThread) => {
    setCurrentThread(thread);
    
    // Load summaries for each email in the thread
    const updatedEmails = await Promise.all(
      thread.emails.map(async (email) => {
        if (email.summary) return email; // Already has summary
        
        setSummariesLoading(prev => ({...prev, [email.id]: true}));
        
        try {
          const summaryResponse = await mailmateAPI.summarizeEmail(email.body || '');
          const updatedEmail = { ...email, summary: summaryResponse.summary };
          setSummariesLoading(prev => ({...prev, [email.id]: false}));
          return updatedEmail;
        } catch (error) {
          console.error(`Error summarizing email ${email.id}:`, error);
          // Fallback to truncated body
          const fallbackSummary = email.body 
            ? email.body.substring(0, 150) + '...' 
            : 'No content';
          setSummariesLoading(prev => ({...prev, [email.id]: false}));
          return { ...email, summary: fallbackSummary };
        }
      })
    );
    
    setCurrentThread({ ...thread, emails: updatedEmails });
  };

  const isUserEmail = (sender: string): boolean => {
    // Check if the sender matches the user's email
    // This is a simple check - in production you'd want more robust matching
    return sender.toLowerCase().includes(userEmail.toLowerCase()) || 
           sender.toLowerCase().includes('me') ||
           sender.toLowerCase().includes('dev'); // Adjust based on your actual user email patterns
  };

  const getSenderName = (sender: string): string => {
    // Extract name from "Name <email>" format
    const match = sender.match(/^([^<]+)/);
    return match ? match[1].trim() : sender;
  };

  const handleReply = async () => {
    if (!input.trim() || sendingReply || !currentThread) return;

    setSendingReply(true);
    try {
      // Here you would send the reply using the API
      // For now, we'll just show it in the UI
      const newEmail: EmailMessage = {
        id: `reply-${Date.now()}`,
        thread_id: currentThread.thread_id,
        sender: userEmail,
        recipients: currentThread.emails[0].sender,
        subject: `Re: ${currentThread.subject}`,
        body: input,
        received_date: new Date().toISOString(),
        is_reply: 1,
        attachments: [],
        summary: input // For replies, use the actual text as summary
      };

      setCurrentThread({
        ...currentThread,
        emails: [...currentThread.emails, newEmail]
      });
      
      setInput('');
      // In production, you would call an API to actually send the email
      // await mailmateAPI.replyToEmail(currentThread.emails[0].id, input);
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setSendingReply(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && selectedTool === 'reply') {
      e.preventDefault();
      handleReply();
    }
  };

  const getPlaceholderText = (): string => {
    switch (selectedTool) {
      case 'reply':
        return 'Type your reply...';
      case 'chat':
        return 'Ask about this email thread...';
      case 'analyze':
        return 'Analyze this email thread...';
      case 'translate':
        return 'Enter text to translate...';
      case 'attachment':
        return 'Ask about attachments...';
      default:
        return 'Type your message...';
    }
  };

  if (loading) {
    return (
      <Card className="flex flex-col h-full overflow-hidden">
        <CardContent className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-supporting-orange" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardHeader className="pb-2 border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Inbox className="w-5 h-5" />
          {currentThread ? currentThread.subject : 'Email Conversations'}
        </CardTitle>
        {threads.length > 1 && (
          <div className="text-sm text-gray-500 mt-1">
            {threads.length} conversation{threads.length > 1 ? 's' : ''} available
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages/Email Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth bg-muted/10">
          {!currentThread || currentThread.emails.length === 0 ? (
            <div className="text-center text-gray-500 mt-12">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No emails to display</p>
              <p className="text-sm mt-2">Your email conversations will appear here</p>
            </div>
          ) : (
            currentThread.emails.map((email, index) => {
              const isUser = isUserEmail(email.sender);
              const senderName = getSenderName(email.sender);
              const isLoadingSummary = summariesLoading[email.id];
              
              return (
                <div
                  key={`${email.id}-${index}`}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-fadeIn`}
                >
                  {/* Sender name */}
                  <div className={`text-xs text-gray-600 dark:text-gray-400 mb-1 px-2 ${isUser ? 'text-right' : 'text-left'}`}>
                    {senderName}
                  </div>
                  
                  {/* Message bubble */}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                      isUser
                        ? 'bg-supporting-orange text-black rounded-br-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
                    }`}
                  >
                    {isLoadingSummary ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Summarizing...</span>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {email.summary || email.body?.substring(0, 200) + '...' || 'No content'}
                      </p>
                    )}
                    
                    {/* Attachments indicator */}
                    {email.attachments && email.attachments.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                        <div className="flex items-center gap-1 text-xs">
                          <Paperclip className="w-3 h-3" />
                          <span>{email.attachments.length} attachment{email.attachments.length > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Timestamp */}
                  <div className={`text-xs text-gray-500 mt-1 px-2`}>
                    {new Date(email.received_date).toLocaleString()}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Tool Selection - Above Input */}
        <div className="border-t p-3 bg-gray-50 dark:bg-gray-900">
          <div className="flex gap-2 flex-wrap mb-2">
            <button
              className={`btn btn-sm text-xs px-3 py-1 rounded-full ${selectedTool === 'reply' ? 'bg-supporting-orange text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              onClick={() => setSelectedTool('reply')}
            >
              <Reply className="w-3 h-3 mr-1" />
              Reply
            </button>
            <button
              className={`btn btn-sm text-xs px-3 py-1 rounded-full ${selectedTool === 'chat' ? 'bg-supporting-orange text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              onClick={() => setSelectedTool('chat')}
            >
              <MessageCircle className="w-3 h-3 mr-1" />
              Chat
            </button>
            <button
              className={`btn btn-sm text-xs px-3 py-1 rounded-full ${selectedTool === 'analyze' ? 'bg-supporting-orange text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              onClick={() => setSelectedTool('analyze')}
            >
              <Mail className="w-3 h-3 mr-1" />
              Analyze
            </button>
            <button
              className={`btn btn-sm text-xs px-3 py-1 rounded-full ${selectedTool === 'translate' ? 'bg-supporting-orange text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              onClick={() => setSelectedTool('translate')}
            >
              <Languages className="w-3 h-3 mr-1" />
              Translate
            </button>
            <button
              className={`btn btn-sm text-xs px-3 py-1 rounded-full ${selectedTool === 'attachment' ? 'bg-supporting-orange text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              onClick={() => setSelectedTool('attachment')}
            >
              <Paperclip className="w-3 h-3 mr-1" />
              Attachments
            </button>
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t p-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={getPlaceholderText()}
                disabled={sendingReply || !currentThread}
                className="w-full resize-none min-h-[40px] max-h-[150px] rounded-md border-gray-300 p-2 text-sm focus:border-supporting-orange focus:ring focus:ring-supporting-orange/40 transition"
                rows={1}
              />
            </div>
            <Button
              onClick={selectedTool === 'reply' ? handleReply : () => {}}
              disabled={sendingReply || !input.trim() || !currentThread}
              className="h-[40px] flex items-center justify-center rounded-md bg-supporting-orange hover:bg-supporting-orange/90 transition"
            >
              {sendingReply ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="text-xs text-gray-500 mt-1 text-right">
            {selectedTool === 'reply' 
              ? 'Press Enter to send reply, Shift+Enter for new line'
              : 'Select a tool above and type your message'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
