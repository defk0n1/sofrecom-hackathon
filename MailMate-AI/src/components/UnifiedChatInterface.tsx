import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Loader2, Sparkles, Bot, Paperclip, File, X, RotateCcw } from "lucide-react";
import { mailmateAPI, type ChatMessage, type AttachmentDetail } from "@/services/mailmateApi";
import { useTranslation } from "react-i18next";

import type { EmailThread } from "@/App";

interface UnifiedChatInterfaceProps {
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
  emailContext?: string;
  conversationId?: string;
  selectedThread?: EmailThread | null;
}

// Thread-specific conversation storage
const threadConversations = new Map<string, {
  messages: ChatMessage[];
  attachmentInfo: {
    count: number;
    summary: string;
    details?: AttachmentDetail[];
  } | null;
}>();

// Global conversation (when no thread is selected)
const GLOBAL_CONVERSATION_ID = "__global__";

export default function UnifiedChatInterface({
  messages: externalMessages,
  onMessagesChange: externalOnMessagesChange,
  emailContext,
  selectedThread,
}: Readonly<UnifiedChatInterfaceProps>) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [includeAttachments, setIncludeAttachments] = useState(true);
  
  // Get current conversation ID
  const currentConversationId = selectedThread?.thread_id || GLOBAL_CONVERSATION_ID;
  
  // Local state for thread-specific messages
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(() => {
    const stored = threadConversations.get(currentConversationId);
    return stored?.messages || [];
  });
  
  const [attachmentInfo, setAttachmentInfo] = useState<{
    count: number;
    summary: string;
    details?: AttachmentDetail[];
  } | null>(() => {
    const stored = threadConversations.get(currentConversationId);
    return stored?.attachmentInfo || null;
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousThreadIdRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [localMessages]);

  // Auto-resize the textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  }, [input]);

  // Handle thread switching - Load thread-specific conversation
  useEffect(() => {
    const newConversationId = selectedThread?.thread_id || GLOBAL_CONVERSATION_ID;
    
    // Only switch if the thread actually changed
    if (previousThreadIdRef.current !== newConversationId) {
      // Save current conversation before switching
      if (previousThreadIdRef.current) {
        threadConversations.set(previousThreadIdRef.current, {
          messages: localMessages,
          attachmentInfo: attachmentInfo,
        });
      }
      
      // Load new conversation
      const stored = threadConversations.get(newConversationId);
      if (stored) {
        setLocalMessages(stored.messages);
        setAttachmentInfo(stored.attachmentInfo);
      } else {
        // New conversation - start fresh
        setLocalMessages([]);
        setAttachmentInfo(null);
      }
      
      previousThreadIdRef.current = newConversationId;
      
      console.log(`[Chat] Switched to conversation: ${newConversationId}`);
    }
  }, [selectedThread?.thread_id]);

  // Save conversation whenever messages or attachment info changes
  useEffect(() => {
    if (currentConversationId) {
      threadConversations.set(currentConversationId, {
        messages: localMessages,
        attachmentInfo: attachmentInfo,
      });
    }
  }, [localMessages, attachmentInfo, currentConversationId]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input,
    };

    const updatedMessages = [...localMessages, userMessage];
    setLocalMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      // Get email ID from selected thread
      const emailId = selectedThread?.thread_id;
      
      const agentResponse = await mailmateAPI.runAgent(
        input,
        emailContext || undefined,
        localMessages, // Use local thread-specific messages
        // Include attachment options if email is selected
        emailId && includeAttachments
          ? {
              includeAttachments: true,
              emailId: emailId,
              saveAttachments: false,
              outputDir: `attachments/defk0n1/${new Date().toISOString().split('T')[0]}/${emailId}`,
            }
          : undefined
      );

      // Build response content
      let responseContent = `🤖 **AI Agent Response**\n\n${agentResponse.output}`;

      // Add attachment info if present
      if (agentResponse.attachments_processed && agentResponse.attachments_processed > 0) {
        responseContent += `\n\n📎 **Attachments Analyzed:** ${agentResponse.attachment_summary}`;
        
        setAttachmentInfo({
          count: agentResponse.attachments_processed,
          summary: agentResponse.attachment_summary || "",
          details: agentResponse.attachment_details,
        });
      }

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: responseContent,
      };

      setLocalMessages([...updatedMessages, assistantMessage]);
    } catch (err) {
      console.error("Error:", err);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "❌ Sorry, I encountered an error. Please try again.",
      };
      setLocalMessages([...updatedMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Clear current conversation
  const handleClearConversation = () => {
    if (confirm("Clear this conversation? This cannot be undone.")) {
      setLocalMessages([]);
      setAttachmentInfo(null);
      threadConversations.delete(currentConversationId);
    }
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden gap-0 pt-2.5 pb-0">
      <CardHeader className="py-1 border-b m-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="w-5 h-5" />
            AI Agent
            {selectedThread && (
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                ({localMessages.length} messages)
              </span>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-3">
            {/* Clear conversation button */}
            {localMessages.length > 0 && (
              <button
                onClick={handleClearConversation}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 transition-colors"
                title="Clear this conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
            
            {/* Attachment Toggle - Native HTML */}
            {selectedThread?.thread_id && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="include-attachments"
                  className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Include Attachments</span>
                </label>
                <div className="relative">
                  <input
                    type="checkbox"
                    id="include-attachments"
                    checked={includeAttachments}
                    onChange={(e) => setIncludeAttachments(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:bg-supporting-orange transition-colors cursor-pointer">
                    <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Conversation Context Indicator */}
        {selectedThread && (
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>
              Conversation with: <strong>{selectedThread.subject || "Untitled Thread"}</strong>
            </span>
          </div>
        )}
        
        {/* Attachment Info Banner */}
        {attachmentInfo && (
          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <File className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                  {attachmentInfo.summary}
                </p>
                {attachmentInfo.details && attachmentInfo.details.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {attachmentInfo.details.slice(0, 3).map((att, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                        <span className="truncate">{att.filename}</span>
                        <span className="text-blue-500 dark:text-blue-400">
                          ({att.type})
                        </span>
                      </div>
                    ))}
                    {attachmentInfo.details.length > 3 && (
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        +{attachmentInfo.details.length - 3} more
                      </p>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setAttachmentInfo(null)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                aria-label="Dismiss attachment info"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 mb-0 pb-0 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
          {localMessages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <Sparkles className="text-primary w-12 h-12 mx-auto mb-4 opacity-80" />
              <p>
                {selectedThread 
                  ? "Start a conversation about this email"
                  : "Start a conversation with the AI Agent"}
              </p>
              <p className="text-sm mt-2">
                {selectedThread?.thread_id 
                  ? "Ask questions about this email or its attachments" 
                  : "Describe a complex task or question"}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2 max-w-md mx-auto">
                {(selectedThread?.thread_id ? [
                  { id: "summarize", text: "Summarize this email and attachments" },
                  { id: "tasks", text: "Extract tasks from attachments" },
                  { id: "data", text: "What data is in the spreadsheet?" },
                  { id: "action", text: "What actions should I take?" },
                ] : [
                  { id: "organize", text: "Help me organize my emails" },
                  { id: "draft", text: "Draft a professional response" },
                  { id: "research", text: "Research this topic for me" },
                  { id: "plan", text: "Create an action plan" },
                ]).map((suggestion) => (
                  <button
                    key={suggestion.id}
                    className="text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors"
                    onClick={() => setInput(suggestion.text)}
                  >
                    {suggestion.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            localMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}-${message.content.substring(0, 10)}`}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-supporting-orange text-black"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {includeAttachments && selectedThread?.thread_id 
                      ? "Processing email and attachments..." 
                      : "Thinking..."}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Modern Input Area */}
        <div className="border-t bg-gray-50 dark:bg-gray-900/50 p-2">
          <div className="max-w-4xl mx-auto">
            <div className="relative flex items-end gap-3 bg-card rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-2 transition-all duration-200 focus-within:ring-2 focus-within:ring-supporting-orange focus-within:border-supporting-orange">
              {/* Textarea Container */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={
                    selectedThread?.thread_id && includeAttachments
                      ? "Ask about this email or its attachments..."
                      : "Describe a complex task for the AI agent..."
                  }
                  disabled={loading}
                  className="w-full resize-none min-h-[48px] max-h-[150px] bg-transparent border-0 focus:outline-none focus:ring-0 text-foreground placeholder-gray-400 dark:placeholder-gray-500 p-1 text-sm leading-relaxed"
                  rows={1}
                  style={{ scrollbarWidth: "thin", resize: "none" }}
                />

                {/* Loading indicator */}
                {loading && (
                  <div className="absolute bottom-2 left-3 flex items-center gap-2 text-xs text-gray-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Processing...</span>
                  </div>
                )}
              </div>

              {/* Send Button */}
              <div className="flex-shrink-0 pb-1">
                <Button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className={`rounded-xl w-10 h-10 p-0 flex items-center justify-center transition-all duration-200 ${
                    input.trim() && !loading
                      ? "bg-supporting-orange hover:bg-supporting-orange/90 text-white shadow-md hover:shadow-lg"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  }`}
                  title={input.trim() ? "Send message" : "Type a message"}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send
                      className={`w-4 h-4 transition-transform ${
                        input.trim() ? "scale-100" : "scale-90"
                      }`}
                    />
                  )}
                </Button>
              </div>
            </div>

            {/* Helper text */}
            <div className="flex items-center justify-between mt-2 px-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Press{" "}
                <kbd className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                  Enter
                </kbd>{" "}
                to send,{" "}
                <kbd className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                  Shift + Enter
                </kbd>{" "}
                for new line
              </div>
              
              {/* Attachment indicator */}
              {selectedThread?.thread_id && includeAttachments && (
                <div className="text-xs text-supporting-orange flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  <span>Attachments enabled</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}