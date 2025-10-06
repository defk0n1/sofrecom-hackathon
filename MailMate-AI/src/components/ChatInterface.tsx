import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { mailmateAPI, type ChatMessage } from '@/services/mailmateApi';

interface ChatInterfaceProps {
  emailContext?: string;
  messages?: ChatMessage[];
  onMessagesChange?: (messages: ChatMessage[]) => void;
}

export default function ChatInterface({
  emailContext,
  messages: propMessages,
  onMessagesChange,
}: ChatInterfaceProps) {
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const messages = propMessages ?? localMessages;
  const updateMessages = onMessagesChange ?? ((msgs: ChatMessage[]) => setLocalMessages(msgs));

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    updateMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await mailmateAPI.chat(messages, input, emailContext || null);
      const assistantMessage: ChatMessage = { role: 'assistant', content: response.response };
      updateMessages([...updatedMessages, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      updateMessages([
        ...updatedMessages,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
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

  return (
    <Card className="flex flex-col overflow-hidden shadow-sm border-muted">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <MessageCircle className="w-5 h-5 text-supporting-orange" />
          Chat with AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 p-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth bg-muted/10">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-12 animate-fadeIn">
              <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Ask me anything about this email!</p>
              <p className="text-sm text-gray-400 mt-1">
                Try: “Summarize this email” or “What are the main action items?”
              </p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-supporting-orange text-black rounded-br-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t bg-background p-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your question and press Enter..."
                disabled={loading}
                className="w-full resize-none min-h-[40px] max-h-[150px] rounded-md border-gray-300 p-2 text-sm focus:border-supporting-orange focus:ring focus:ring-supporting-orange/40 transition"
                rows={1}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="h-[40px] flex items-center justify-center rounded-md bg-supporting-orange hover:bg-supporting-orange/90 transition"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-xs text-gray-500 mt-1 text-right">
            Press <span className="font-medium">Enter</span> to send,{" "}
            <span className="font-medium">Shift+Enter</span> for a new line
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
