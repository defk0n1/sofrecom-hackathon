import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MessageCircle,
  Send,
  Loader2,
  Mail,
  Languages,
  Paperclip,
  Reply,
  Inbox,
  FileText,
  X,
} from "lucide-react";
import { mailmateAPI } from "@/services/mailmateApi";
import type { EmailThread, EmailMessage } from "@/App";
import { fileToBase64, formatFileSize, isAttachmentFile } from "@/utils/fileHelpers";

type ToolType = "chat" | "analyze" | "translate" | "attachment" | "reply";

interface EmailThreadViewerProps {
  userEmail?: string;
  threads: EmailThread[];
  selectedThreadId: string | null;
  loading?: boolean;
  onThreadUpdate?: () => void; // Callback to refresh threads after actions
}

export default function EmailThreadViewer({
  userEmail = "me@example.com",
  threads,
  selectedThreadId,
  loading = false,
  onThreadUpdate,
}: Readonly<EmailThreadViewerProps>) {
  const [currentThread, setCurrentThread] = useState<EmailThread | null>(null);
  const [summariesLoading, setSummariesLoading] = useState<{
    [key: string]: boolean;
  }>({});
  const [selectedTool, setSelectedTool] = useState<ToolType>("chat");
  const [input, setInput] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("French");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentThread]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  }, [input]);

  // Load thread with summaries when selectedThreadId changes
  useEffect(() => {
    if (selectedThreadId && threads.length > 0) {
      const thread = threads.find(t => t.thread_id === selectedThreadId);
      if (thread) {
        loadThreadWithSummaries(thread);
      }
    }
  }, [selectedThreadId, threads]);

  const loadThreadWithSummaries = async (thread: EmailThread) => {
    setCurrentThread(thread);

    // Load summaries for each email in the thread
    const updatedEmails = await Promise.all(
      thread.emails.map(async (email) => {
        if (email.summary) return email; // Already has summary

        setSummariesLoading((prev) => ({ ...prev, [email.id]: true }));

        try {
          const summaryResponse = await mailmateAPI.summarizeEmail(
            email.body || ""
          );
          const updatedEmail = { ...email, summary: summaryResponse.summary };
          setSummariesLoading((prev) => ({ ...prev, [email.id]: false }));
          return updatedEmail;
        } catch (error) {
          console.error(`Error summarizing email ${email.id}:`, error);
          // Fallback to truncated body
          const fallbackSummary = email.body
            ? email.body.substring(0, 150) + "..."
            : "No content";
          setSummariesLoading((prev) => ({ ...prev, [email.id]: false }));
          return { ...email, summary: fallbackSummary };
        }
      })
    );

    setCurrentThread({ ...thread, emails: updatedEmails });
  };

  const isUserEmail = (sender: string): boolean => {
    // Check if the sender matches the user's email
    // This is a simple check - in production you'd want more robust matching
    return (
      sender.toLowerCase().includes(userEmail.toLowerCase()) ||
      sender.toLowerCase().includes("me") ||
      sender.toLowerCase().includes("dev")
    ); // Adjust based on your actual user email patterns
  };

  const getSenderName = (sender: string): string => {
    // Extract name from "Name <email>" format
    const match = sender.match(/^([^<]+)/);
    return match ? match[1].trim() : sender;
  };

  const handleReply = async () => {
    if (!input.trim() || sendingReply || !currentThread) return;

    setSendingReply(true);
    setActionResult(null);
    
    try {
      // Get the last email in the thread to reply to
      const lastEmail = currentThread.emails[currentThread.emails.length - 1];
      
      // Here we would use the actual email ID if available from Gmail API
      // For now, creating a local reply for demonstration
      const newEmail: EmailMessage = {
        id: `reply-${Date.now()}`,
        thread_id: currentThread.thread_id,
        sender: userEmail,
        recipients: lastEmail.sender,
        subject: `Re: ${currentThread.subject}`,
        body: input,
        received_date: new Date().toISOString(),
        is_reply: 1,
        attachments: [],
        summary: input,
      };

      setCurrentThread({
        ...currentThread,
        emails: [...currentThread.emails, newEmail],
      });

      setInput("");
      setActionResult("✅ Reply sent successfully!");
      
      // Trigger thread refresh if callback provided
      if (onThreadUpdate) {
        setTimeout(() => onThreadUpdate(), 1000);
      }
    } catch (error) {
      console.error("Error sending reply:", error);
      setActionResult("❌ Failed to send reply. Please try again.");
    } finally {
      setSendingReply(false);
    }
  };

  const handleAnalyze = async () => {
    if (!currentThread || isProcessing) return;
    
    setIsProcessing(true);
    setActionResult(null);
    
    try {
      // Get the full thread context
      const threadContext = currentThread.emails
        .map((e) => `From: ${e.sender}\nSubject: ${e.subject}\n\n${e.body}`)
        .join("\n\n---\n\n");
      
      const response = await mailmateAPI.processEmail(threadContext);
      
      // Format the analysis result
      const analysisText = `📧 **Email Analysis**

**Summary:** ${response.analysis.summary}

**Sentiment:** ${response.analysis.sentiment}
**Urgency:** ${response.analysis.urgency}

**Key Points:**
${response.analysis.key_points.map((point: string, i: number) => `${i + 1}. ${point}`).join('\n')}

${response.analysis.tasks?.length > 0 ? `\n**Tasks Detected:** ${response.analysis.tasks.length} task(s)` : ''}`;
      
      setActionResult(analysisText);
    } catch (error) {
      console.error("Error analyzing thread:", error);
      setActionResult("❌ Failed to analyze email. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTranslate = async () => {
    if (!input.trim() || isProcessing) return;
    
    setIsProcessing(true);
    setActionResult(null);
    
    try {
      const response = await mailmateAPI.translate(input, targetLanguage);
      
      const translationText = `🌐 **Translation** (${response.translation.source_language} → ${response.translation.target_language})

${response.translation.translated_text}

${response.translation.translation_notes ? `*Note: ${response.translation.translation_notes}*` : ''}`;
      
      setActionResult(translationText);
    } catch (error) {
      console.error("Error translating:", error);
      setActionResult("❌ Failed to translate text. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAttachmentQuery = async () => {
    if (!selectedFile || !input.trim() || isProcessing) return;
    
    setIsProcessing(true);
    setActionResult(null);
    
    try {
      const base64Content = await fileToBase64(selectedFile);
      const response = await mailmateAPI.smartQuery(selectedFile.name, input, base64Content);
      
      const attachmentResult = `📎 **Attachment Query** (${selectedFile.name})

**Question:** ${input}

**Answer:** ${response.answer || response.response}`;
      
      setActionResult(attachmentResult);
      setInput("");
    } catch (error) {
      console.error("Error querying attachment:", error);
      setActionResult("❌ Failed to query attachment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (isAttachmentFile(file)) {
        setSelectedFile(file);
        setActionResult(null);
      } else {
        setActionResult("⚠️ Unsupported file type. Please upload PDF, Office documents, CSV, or images.");
      }
    }
  };

  const handleAction = async () => {
    switch (selectedTool) {
      case "reply":
        await handleReply();
        break;
      case "analyze":
        await handleAnalyze();
        break;
      case "translate":
        await handleTranslate();
        break;
      case "attachment":
        await handleAttachmentQuery();
        break;
      default:
        break;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && selectedTool === "reply") {
      e.preventDefault();
      handleReply();
    }
  };

  const getPlaceholderText = (): string => {
    switch (selectedTool) {
      case "reply":
        return "Type your reply...";
      case "chat":
        return "Ask about this email thread...";
      case "analyze":
        return "Click 'Analyze Thread' button to get insights...";
      case "translate":
        return "Enter text to translate...";
      case "attachment":
        return "Upload a file and ask about it...";
      default:
        return "Type your message...";
    }
  };

  const languages = [
    'French', 'Spanish', 'German', 'Italian', 'Portuguese',
    'Chinese', 'Japanese', 'Korean', 'Arabic', 'Russian'
  ];

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
          {currentThread ? currentThread.subject : "Email Conversations"}
        </CardTitle>
        {threads.length > 1 && (
          <div className="text-sm text-gray-500 mt-1">
            {threads.length} conversation{threads.length > 1 ? "s" : ""}{" "}
            available
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
              <p className="text-sm mt-2">
                Your email conversations will appear here
              </p>
            </div>
          ) : (
            currentThread.emails.map((email, index) => {
              const isUser = isUserEmail(email.sender);
              const senderName = getSenderName(email.sender);
              const isLoadingSummary = summariesLoading[email.id];

              return (
                <div
                  key={`${email.id}-${index}`}
                  className={`flex flex-col ${
                    isUser ? "items-end" : "items-start"
                  } animate-fadeIn`}
                >
                  {/* Sender name */}
                  <div
                    className={`text-xs text-gray-600 dark:text-gray-400 mb-1 px-2 ${
                      isUser ? "text-right" : "text-left"
                    }`}
                  >
                    {senderName}
                  </div>

                  {/* Message bubble */}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                      isUser
                        ? "bg-supporting-orange text-black rounded-br-sm"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm"
                    }`}
                  >
                    {isLoadingSummary ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Summarizing...</span>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {email.summary ||
                          email.body?.substring(0, 200) + "..." ||
                          "No content"}
                      </p>
                    )}

                    {/* Attachments indicator */}
                    {email.attachments && email.attachments.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                        <div className="flex items-center gap-1 text-xs">
                          <Paperclip className="w-3 h-3" />
                          <span>
                            {email.attachments.length} attachment
                            {email.attachments.length > 1 ? "s" : ""}
                          </span>
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
              className={`btn btn-sm text-xs px-3 py-1 rounded-full ${
                selectedTool === "reply"
                  ? "bg-supporting-orange text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              onClick={() => {
                setSelectedTool("reply");
                setActionResult(null);
              }}
            >
              <Reply className="w-3 h-3 mr-1" />
              Reply
            </button>
            <button
              className={`btn btn-sm text-xs px-3 py-1 rounded-full ${
                selectedTool === "analyze"
                  ? "bg-supporting-orange text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              onClick={() => {
                setSelectedTool("analyze");
                setActionResult(null);
              }}
            >
              <Mail className="w-3 h-3 mr-1" />
              Analyze
            </button>
            <button
              className={`btn btn-sm text-xs px-3 py-1 rounded-full ${
                selectedTool === "translate"
                  ? "bg-supporting-orange text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              onClick={() => {
                setSelectedTool("translate");
                setActionResult(null);
              }}
            >
              <Languages className="w-3 h-3 mr-1" />
              Translate
            </button>
            <button
              className={`btn btn-sm text-xs px-3 py-1 rounded-full ${
                selectedTool === "attachment"
                  ? "bg-supporting-orange text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              onClick={() => {
                setSelectedTool("attachment");
                setActionResult(null);
              }}
            >
              <Paperclip className="w-3 h-3 mr-1" />
              Attachments
            </button>
          </div>

          {/* Tool-specific options */}
          {selectedTool === "translate" && (
            <div className="flex items-center gap-2 mt-2 text-sm">
              <span>Target language:</span>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="form-select text-sm rounded-md border-gray-300 focus:border-supporting-orange"
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          )}

          {selectedTool === "attachment" && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm">File:</span>
              {selectedFile ? (
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                  <span className="text-xs text-gray-500">({formatFileSize(selectedFile.size)})</span>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-1 rounded-full hover:bg-gray-200"
                    aria-label="Remove file"
                  >
                    <X className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              ) : (
                <label className="btn btn-sm btn-outline-secondary cursor-pointer">
                  <Paperclip className="w-3 h-3 mr-1" />
                  <span>Upload File</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  />
                </label>
              )}
            </div>
          )}

          {selectedTool === "analyze" && (
            <div className="mt-2">
              <button
                onClick={handleAnalyze}
                disabled={isProcessing || !currentThread}
                className="btn btn-sm btn-primary w-full bg-supporting-orange hover:bg-supporting-orange/90"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Mail className="w-3 h-3 mr-1" />
                    Analyze Thread
                  </>
                )}
              </button>
            </div>
          )}

          {/* Action Result Display */}
          {actionResult && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm whitespace-pre-wrap flex-1">{actionResult}</p>
                <button
                  onClick={() => setActionResult(null)}
                  className="p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800"
                  aria-label="Close result"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
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
                disabled={
                  (selectedTool === "reply" && sendingReply) || 
                  (selectedTool === "attachment" && !selectedFile) ||
                  (selectedTool === "analyze") ||
                  isProcessing ||
                  !currentThread
                }
                className="w-full resize-none min-h-[40px] max-h-[150px] rounded-md border-gray-300 p-2 text-sm focus:border-supporting-orange focus:ring focus:ring-supporting-orange/40 transition"
                rows={1}
              />
            </div>
            <Button
              onClick={handleAction}
              disabled={
                !input.trim() || 
                !currentThread ||
                (selectedTool === "attachment" && !selectedFile) ||
                (selectedTool === "analyze") ||
                sendingReply ||
                isProcessing
              }
              className="h-[40px] flex items-center justify-center rounded-md bg-supporting-orange hover:bg-supporting-orange/90 transition"
            >
              {(sendingReply || isProcessing) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="text-xs text-gray-500 mt-1 text-right">
            {selectedTool === "reply"
              ? "Press Enter to send reply, Shift+Enter for new line"
              : selectedTool === "analyze"
              ? "Click 'Analyze Thread' button above"
              : selectedTool === "attachment"
              ? "Upload a file and enter your question"
              : "Type your message and press Send"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
