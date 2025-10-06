import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  Mail,
  Paperclip,
  Inbox,
  X,
  Upload,
  Reply,
  ReplyAll,
} from "lucide-react";
import { mailmateAPI } from "@/services/mailmateApi";
import type { EmailThread } from "@/App";
import { formatFileSize, isAttachmentFile } from "@/utils/fileHelpers";
import { useToast } from "@/contexts/ToastContext";

interface EmailThreadViewerProps {
  userEmail?: string;
  threads: EmailThread[];
  selectedThreadId: string | null;
  loading?: boolean;
  onThreadUpdate?: () => void;
}

export default function EmailThreadViewer({
  userEmail = "me@example.com",
  threads,
  selectedThreadId,
  loading = false,
  onThreadUpdate,
}: Readonly<EmailThreadViewerProps>) {
  const [currentThread, setCurrentThread] = useState<EmailThread | null>(null);
  const [input, setInput] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showReplyOptions, setShowReplyOptions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentThread]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  }, [input]);

  useEffect(() => {
    if (selectedThreadId && threads.length > 0) {
      const thread = threads.find((t) => t.thread_id === selectedThreadId);
      if (thread) {
        setCurrentThread(thread);
      }
    }
  }, [selectedThreadId, threads]);

  const isUserEmail = (sender: string): boolean => {
    return (
      sender.toLowerCase().includes(userEmail.toLowerCase()) ||
      sender.toLowerCase().includes("me") ||
      sender.toLowerCase().includes("dev")
    );
  };

  const getSenderName = (sender: string): string => {
    const match = RegExp(/^([^<]+)/).exec(sender);
    return match ? match[1].trim() : sender;
  };

  const handleReply = async (type: "reply" | "replyAll") => {
    if (!input.trim() || sendingReply || !currentThread) return;

    setSendingReply(true);
    setShowReplyOptions(false);

    try {
      if (type === "reply") {
        const lastEmail = currentThread.emails[currentThread.emails.length - 1];
        await mailmateAPI.replyToEmail(
          currentThread.thread_id,
          lastEmail.sender,
          input,
          attachments.length > 0 ? attachments : undefined
        );
      } else {
        await mailmateAPI.replyToAll(
          currentThread.thread_id,
          input,
          attachments.length > 0 ? attachments : undefined
        );
      }

      setInput("");
      setAttachments([]);
      showToast(
        "success",
        `${type === "reply" ? "Reply" : "Reply to all"} sent successfully!`
      );

      if (onThreadUpdate) {
        onThreadUpdate();
      }
    } catch (error) {
      console.error("Error sending reply:", error);
      showToast("error", "Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      setShowReplyOptions(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      isAttachmentFile(file)
    );
    if (files.length > 0) {
      setAttachments((prev) => [...prev, ...files]);
    } else {
      showToast("error", "Unsupported file type");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter((file) =>
        isAttachmentFile(file)
      );
      if (files.length > 0) {
        setAttachments((prev) => [...prev, ...files]);
      } else {
        showToast("error", "Unsupported file type");
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
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
    <Card className="flex flex-col h-full overflow-hidden py-2 gap-0">
      <CardHeader className="pb-2 border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Inbox className="w-5 h-5" />
          {currentThread ? currentThread.subject : "Email Conversations"}
        </CardTitle>
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
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {email.body || "No content"}
                    </p>

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

        {/* Reply Section */}
        <div className="border-t bg-gray-50 dark:bg-gray-900">
          {/* Drag and Drop Overlay - Only shows when dragging */}
            <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm transition-opacity ${
              isDragging
              ? "opacity-100 bg-supporting-orange/10 border-4 border-dashed border-supporting-orange"
              : "opacity-0 pointer-events-none"
            }`}
            >
            <div className="text-center">
              <Upload className="w-12 h-12 mx-auto mb-2 text-supporting-orange" />
              <p className="text-lg font-medium text-supporting-orange">
              Drop files here
              </p>
            </div>
            </div>

          {/* Attachment Upload Button */}
          <div className="p-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-supporting-orange hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition"
            >
              <Paperclip className="w-4 h-4" />
              <span>Attach files</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.txt,.png,.jpg,.jpeg"
              multiple
            />

            {/* Attached Files List */}
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Paperclip className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm font-medium truncate">
                        {file.name}
                      </span>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
                      aria-label="Remove file"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input & Action Buttons */}
          <div className="p-3 pt-0 flex flex-col gap-2 bg-gray-50 dark:bg-gray-900">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your reply..."
              disabled={sendingReply || !currentThread}
              className="w-full resize-none min-h-[50px] max-h-[150px] rounded-md border border-gray-300 p-2 text-sm focus:border-supporting-orange focus:ring focus:ring-supporting-orange/40 transition"
              rows={1}
              style={ { resize: "none" } }
            />

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!input.trim() || sendingReply}
                onClick={() => handleReply("reply")}
                className="flex items-center px-3"
              >
                <Reply className="mr-1 w-4 h-4" />
                Reply
              </Button>
              <Button
                size="sm"
                variant="default"
                disabled={!input.trim() || sendingReply}
                onClick={() => handleReply("replyAll")}
                className="flex items-center px-3"
              >
                <ReplyAll className="mr-1 w-4 h-4" />
                Reply All
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
