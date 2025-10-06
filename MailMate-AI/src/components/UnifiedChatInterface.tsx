import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MessageCircle, Send, Loader2, Mail, Languages, Paperclip, 
  FileText, X, Sparkles, RefreshCw, Bot
} from 'lucide-react';
import { mailmateAPI, type ChatMessage } from '@/services/mailmateApi';
import { useTranslation } from 'react-i18next';
import { formatFileSize, isAttachmentFile } from '@/utils/fileHelpers';
import { taskStorage } from '@/utils/taskStorage';

import type { EmailThread } from "@/App";

type ToolType = 'chat' | 'analyze' | 'translate' | 'attachment' | 'agent';

interface UnifiedChatInterfaceProps {
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
  emailContext?: string;
  conversationId?: string;
  selectedThread?: EmailThread | null; // Add selected thread for attachment access
}

export default function UnifiedChatInterface({ 
  messages, 
  onMessagesChange,
  emailContext,
  conversationId,
  selectedThread
}: UnifiedChatInterfaceProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ToolType>('chat');
  const [file, setFile] = useState<File | null>(null);
  const [targetLanguage, setTargetLanguage] = useState('French');
  const [selectedThreadAttachment, setSelectedThreadAttachment] = useState<{
    emailId: string;
    filename: string;
    mimeType: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragCounter = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Auto-resize the textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  }, [input]);

  // Handle file selection for attachment tool
  // Handle file removal
  const handleRemoveFile = () => {
    setFile(null);
  };
  
  // Get appropriate placeholder text based on selected tool
  const getPlaceholderText = (): string => {
    switch (selectedTool) {
      case 'chat':
        return 'Ask about the email...';
      case 'analyze':
        return 'Ask about email content...';
      case 'translate':
        return 'Enter text to translate...';
      case 'attachment':
        return 'Ask about the attachment...';
      case 'agent':
        return 'Describe a complex task for the AI agent...';
      default:
        return 'Type your message...';
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input
    };

    const updatedMessages = [...messages, userMessage];
    onMessagesChange(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      let assistantMessage: ChatMessage;

      switch (selectedTool) {
        case 'analyze':
          const analysisResponse = await mailmateAPI.processEmail(input);
          
          // Extract and save tasks if conversation ID is available
          if (conversationId && analysisResponse.analysis?.tasks?.length > 0) {
            analysisResponse.analysis.tasks.forEach((task: any) => {
              taskStorage.create(conversationId, task);
            });
          }
          
          assistantMessage = {
            role: 'assistant',
            content: `📧 **Email Analysis**\n\n**Summary:** ${analysisResponse.analysis.summary}\n\n**Sentiment:** ${analysisResponse.analysis.sentiment}\n**Urgency:** ${analysisResponse.analysis.urgency}\n\n**Key Points:**\n${analysisResponse.analysis.key_points.map((point: string, i: number) => `${i + 1}. ${point}`).join('\n')}${analysisResponse.analysis.tasks?.length > 0 ? `\n\n**Tasks Detected:** ${analysisResponse.analysis.tasks.length} task(s) added to your to-do list` : ''}`
          };
          break;

        case 'translate':
          const translateResponse = await mailmateAPI.translate(input, targetLanguage);
          assistantMessage = {
            role: 'assistant',
            content: `🌐 **Translation** (${translateResponse.translation.source_language} → ${translateResponse.translation.target_language})\n\n${translateResponse.translation.translated_text}${translateResponse.translation.translation_notes ? `\n\n*Note: ${translateResponse.translation.translation_notes}*` : ''}`
          };
          break;

        case 'attachment':
          if (file) {
            try {
              const reader = new FileReader();
              reader.onload = async (e) => {
                const base64 = e.target?.result?.toString().split(',')[1];
                if (base64) {
                  try {
                    const attachmentResponse = await mailmateAPI.smartQuery(file.name, input, base64);
                    const assistantMsg: ChatMessage = {
                      role: 'assistant',
                      content: `📎 **Attachment Query** (${file.name})\n\n${attachmentResponse.answer || attachmentResponse.response}`
                    };
                    onMessagesChange([...updatedMessages, assistantMsg]);
                  } catch (err) {
                    const errorMsg: ChatMessage = {
                      role: 'assistant',
                      content: `⚠️ Error analyzing attachment: ${err instanceof Error ? err.message : 'Unknown error'}`
                    };
                    onMessagesChange([...updatedMessages, errorMsg]);
                  } finally {
                    setLoading(false);
                    setFile(null);
                  }
                }
              };
              reader.onerror = () => {
                const errorMsg: ChatMessage = {
                  role: 'assistant',
                  content: '⚠️ Error reading file. Please try again with a different file.'
                };
                onMessagesChange([...updatedMessages, errorMsg]);
                setLoading(false);
              };
              reader.readAsDataURL(file);
              return;
            } catch (err) {
              assistantMessage = {
                role: 'assistant',
                content: `⚠️ Error processing file: ${err instanceof Error ? err.message : 'Unknown error'}`
              };
            }
          } else if (selectedThreadAttachment) {
            // For thread attachments, we would need to fetch content from backend
            assistantMessage = {
              role: 'assistant',
              content: `📎 **Thread Attachment Query** (${selectedThreadAttachment.filename})\n\n⚠️ Note: Direct querying of email thread attachments requires backend support to fetch attachment content from Gmail. This feature can be implemented by adding an endpoint to retrieve attachment content by email ID and filename.\n\nFor now, please download and upload the attachment manually to query it.`
            };
          } else {
            assistantMessage = {
              role: 'assistant',
              content: '⚠️ Please upload a file first to query attachments.'
            };
          }
          break;

        case 'agent':
          const agentResponse = await mailmateAPI.runAgent(input, emailContext || undefined, messages);
          assistantMessage = {
            role: 'assistant',
            content: `🤖 **AI Agent Response**\n\n${agentResponse.output}`
          };
          break;

        default: // chat
          const chatResponse = await mailmateAPI.chat(messages, input, emailContext || null);
          assistantMessage = {
            role: 'assistant',
            content: chatResponse.response
          };
      }

      onMessagesChange([...updatedMessages, assistantMessage]);
    } catch (err) {
      console.error('Error:', err);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please try again.'
      };
      onMessagesChange([...updatedMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const languages = [
    'French', 'Spanish', 'German', 'Italian', 'Portuguese',
    'Chinese', 'Japanese', 'Korean', 'Arabic', 'Russian'
  ];

  // Handle drag and drop for files
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    
    if (selectedTool !== 'attachment') {
      setSelectedTool('attachment');
    }
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      // Check if file type is acceptable
      if (isAttachmentFile(droppedFile)) {
        setFile(droppedFile);
      } else {
        // Add a message indicating unsupported file type
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: '⚠️ Unsupported file type. Please upload PDF, Office documents, CSV, or images.'
        };
        onMessagesChange([...messages, errorMessage]);
      }
    }
  };

  return (
    <Card 
      className={`flex flex-col h-full overflow-hidden ${isDragging ? 'border-2 border-supporting-orange' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <CardHeader className="pb-2 border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="w-5 h-5" />
          {t('chat.title')}
        </CardTitle>
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            className={`btn btn-sm ${selectedTool === 'chat' ? 'btn-primary bg-supporting-orange' : 'btn-secondary'}`}
            onClick={() => setSelectedTool('chat')}
          >
            <MessageCircle className="w-3 h-3 mr-1" />
            {t('chat.tools.chat')}
          </button>
          <button
            className={`btn btn-sm ${selectedTool === 'analyze' ? 'btn-primary bg-supporting-orange' : 'btn-secondary'}`}
            onClick={() => setSelectedTool('analyze')}
          >
            <Mail className="w-3 h-3 mr-1" />
            {t('chat.tools.analyze')}
          </button>
          <button
            className={`btn btn-sm ${selectedTool === 'translate' ? 'btn-primary bg-supporting-orange' : 'btn-secondary'}`}
            onClick={() => setSelectedTool('translate')}
          >
            <Languages className="w-3 h-3 mr-1" />
            {t('chat.tools.translate')}
          </button>
          <button
            className={`btn btn-sm ${selectedTool === 'attachment' ? 'btn-primary bg-supporting-orange' : 'btn-secondary'}`}
            onClick={() => setSelectedTool('attachment')}
          >
            <Paperclip className="w-3 h-3 mr-1" />
            {t('chat.tools.attachment')}
          </button>
          <button
            className={`btn btn-sm ${selectedTool === 'agent' ? 'btn-primary bg-supporting-orange' : 'btn-secondary'}`}
            onClick={() => setSelectedTool('agent')}
          >
            <Bot className="w-3 h-3 mr-1" />
            Agent
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('chat.emptyState')}</p>
              <p className="text-sm mt-2">{t('chat.suggestions')}</p>
              {selectedTool === 'chat' && (
                <div className="mt-6 grid grid-cols-2 gap-2 max-w-md mx-auto">
                  {[
                    { id: 'summary', text: "Summarize this email" },
                    { id: 'tasks', text: "Extract tasks from email" },
                    { id: 'sentiment', text: "What's the sentiment?" },
                    { id: 'reply', text: "Who should I reply to?" }
                  ].map((suggestion) => (
                    <button
                      key={suggestion.id}
                      className="text-sm bg-gray-100 hover:bg-gray-200 rounded-lg p-2"
                      onClick={() => setInput(suggestion.text)}
                    >
                      {suggestion.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}-${message.content.substring(0, 10)}`}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-supporting-orange text-black'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Tool-specific options */}
        {selectedTool === 'translate' && (
          <div className="border-t p-3 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <span className="text-sm">Target language:</span>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="form-select text-sm rounded-md border-gray-300 focus:border-supporting-orange focus:ring focus:ring-supporting-orange focus:ring-opacity-50"
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              <button 
                className="ml-auto btn btn-sm btn-outline-secondary rounded-full p-1 hover:bg-gray-200"
                onClick={() => {
                  // Add language swap functionality
                  const detectedLanguage = 'English'; // This would be dynamic in a real app
                  setTargetLanguage(detectedLanguage);
                }}
                title="Swap languages"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {selectedTool === 'attachment' && (
          <div className="border-t p-3 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <span className="text-sm">File:</span>
              {file ? (
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                  <button
                    onClick={handleRemoveFile}
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
            
            {/* Show attachments from selected thread */}
            {selectedThread && selectedThread.emails.some(e => e.attachments && e.attachments.length > 0) && (
              <div className="mt-2">
                <span className="text-sm text-gray-600">Or select from thread:</span>
                <select
                  className="form-select text-sm mt-1 rounded-md border-gray-300 focus:border-supporting-orange w-full"
                  value={selectedThreadAttachment ? `${selectedThreadAttachment.emailId}-${selectedThreadAttachment.filename}` : ''}
                  onChange={(e) => {
                    if (!e.target.value) {
                      setSelectedThreadAttachment(null);
                      return;
                    }
                    const [emailId, ...filenameParts] = e.target.value.split('-');
                    const filename = filenameParts.join('-');
                    const email = selectedThread.emails.find(em => em.id === emailId);
                    const attachment = email?.attachments.find(a => a.filename === filename);
                    if (attachment) {
                      setSelectedThreadAttachment({
                        emailId,
                        filename: attachment.filename,
                        mimeType: attachment.mimeType
                      });
                      setFile(null); // Clear uploaded file if thread attachment selected
                    }
                  }}
                >
                  <option value="">-- Select an attachment --</option>
                  {selectedThread.emails.flatMap(email => 
                    email.attachments?.map(att => (
                      <option 
                        key={`${email.id}-${att.filename}`} 
                        value={`${email.id}-${att.filename}`}
                      >
                        {att.filename} ({formatFileSize(att.size)})
                      </option>
                    )) || []
                  )}
                </select>
              </div>
            )}

            {isDragging && (
              <div className="mt-2 p-4 border-2 border-dashed border-supporting-orange rounded-md text-center text-sm">
                Drop file here to upload
              </div>
            )}
          </div>
        )}

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
                disabled={loading || (selectedTool === 'attachment' && !file && !selectedThreadAttachment)}
                className="form-control w-full resize-none min-h-[40px] max-h-[150px] rounded-md p-2 pr-8 border-gray-300 focus:border-supporting-orange focus:ring focus:ring-supporting-orange focus:ring-opacity-50"
                rows={1}
              />
            </div>
            <Button 
              onClick={handleSend} 
              disabled={loading || !input.trim() || (selectedTool === 'attachment' && !file && !selectedThreadAttachment)}
              className="btn btn-icon btn-primary h-[40px] flex-shrink-0 bg-supporting-orange hover:bg-opacity-90"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-xs text-gray-500 mt-1 text-right">
            {selectedTool === 'attachment' ? 'Upload a file or select from thread, drag & drop' : 'Press Enter to send, Shift+Enter for new line'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
