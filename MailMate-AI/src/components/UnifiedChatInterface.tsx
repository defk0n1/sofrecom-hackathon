import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, Loader2, Mail, Languages, Paperclip, Sparkles } from 'lucide-react';
import { mailmateAPI, type ChatMessage } from '@/services/mailmateApi';
import { useTranslation } from 'react-i18next';

type ToolType = 'chat' | 'analyze' | 'translate' | 'attachment';

interface UnifiedChatInterfaceProps {
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
  emailContext?: string;
}

export default function UnifiedChatInterface({ 
  messages, 
  onMessagesChange,
  emailContext 
}: UnifiedChatInterfaceProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ToolType>('chat');
  const [file, setFile] = useState<File | null>(null);
  const [targetLanguage, setTargetLanguage] = useState('French');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
          assistantMessage = {
            role: 'assistant',
            content: `📧 **Email Analysis**\n\n**Summary:** ${analysisResponse.analysis.summary}\n\n**Sentiment:** ${analysisResponse.analysis.sentiment}\n**Urgency:** ${analysisResponse.analysis.urgency}\n\n**Key Points:**\n${analysisResponse.analysis.key_points.map((point: string, i: number) => `${i + 1}. ${point}`).join('\n')}`
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
            const reader = new FileReader();
            reader.onload = async (e) => {
              const base64 = e.target?.result?.toString().split(',')[1];
              if (base64) {
                const attachmentResponse = await mailmateAPI.smartQuery(file.name, input, base64);
                const assistantMsg: ChatMessage = {
                  role: 'assistant',
                  content: `📎 **Attachment Query** (${file.name})\n\n${attachmentResponse.answer || attachmentResponse.response}`
                };
                onMessagesChange([...updatedMessages, assistantMsg]);
                setLoading(false);
                setFile(null);
              }
            };
            reader.readAsDataURL(file);
            return;
          } else {
            assistantMessage = {
              role: 'assistant',
              content: '⚠️ Please upload a file first to query attachments.'
            };
          }
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
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const languages = [
    'French', 'Spanish', 'German', 'Italian', 'Portuguese',
    'Chinese', 'Japanese', 'Korean', 'Arabic', 'Russian'
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="w-5 h-5" />
          {t('chat.title')}
        </CardTitle>
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            className={`btn btn-sm ${selectedTool === 'chat' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedTool('chat')}
          >
            <MessageCircle className="w-3 h-3 mr-1" />
            {t('chat.tools.chat')}
          </button>
          <button
            className={`btn btn-sm ${selectedTool === 'analyze' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedTool('analyze')}
          >
            <Mail className="w-3 h-3 mr-1" />
            {t('chat.tools.analyze')}
          </button>
          <button
            className={`btn btn-sm ${selectedTool === 'translate' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedTool('translate')}
          >
            <Languages className="w-3 h-3 mr-1" />
            {t('chat.tools.translate')}
          </button>
          <button
            className={`btn btn-sm ${selectedTool === 'attachment' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedTool('attachment')}
          >
            <Paperclip className="w-3 h-3 mr-1" />
            {t('chat.tools.attachment')}
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('chat.emptyState')}</p>
              <p className="text-sm mt-2">{t('chat.suggestions')}</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-white'
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
          <div className="px-4 py-2 border-t bg-gray-50 dark:bg-gray-900">
            <select
              className="form-select w-full text-sm"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
        )}

        {selectedTool === 'attachment' && (
          <div className="px-4 py-2 border-t bg-gray-50 dark:bg-gray-900">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.txt,.png,.jpg,.jpeg"
            />
            <button
              className="btn btn-sm btn-secondary w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-3 h-3 mr-2" />
              {file ? file.name : 'Upload File'}
            </button>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            {selectedTool === 'analyze' ? (
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('chat.placeholder')}
                disabled={loading}
                className="flex-1 min-h-[60px]"
              />
            ) : (
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('chat.placeholder')}
                disabled={loading}
                className="flex-1"
              />
            )}
            <Button onClick={handleSend} disabled={loading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
