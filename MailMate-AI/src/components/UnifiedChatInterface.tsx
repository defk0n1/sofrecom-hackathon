import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Loader2, Sparkles, Bot } from "lucide-react";
import { mailmateAPI, type ChatMessage } from "@/services/mailmateApi";
import { useTranslation } from "react-i18next";

import type { EmailThread } from "@/App";

interface UnifiedChatInterfaceProps {
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
  emailContext?: string;
  conversationId?: string;
  selectedThread?: EmailThread | null;
}

export default function UnifiedChatInterface({
  messages,
  onMessagesChange,
  emailContext,
}: Readonly<UnifiedChatInterfaceProps>) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize the textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input,
    };

    const updatedMessages = [...messages, userMessage];
    onMessagesChange(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const agentResponse = await mailmateAPI.runAgent(
        input,
        emailContext || undefined,
        messages
      );
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: `🤖 **AI Agent Response**\n\n${agentResponse.output}`,
      };

      onMessagesChange([...updatedMessages, assistantMessage]);
    } catch (err) {
      console.error("Error:", err);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "❌ Sorry, I encountered an error. Please try again.",
      };
      onMessagesChange([...updatedMessages, errorMessage]);
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

  if (!messages) {
    return null;
  }

  return (
    <Card className="flex flex-col h-full overflow-hidden gap-0 pt-2.5 pb-0">
      <CardHeader className="py-1 border-b m-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="w-5 h-5" />
          AI Agent
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 mb-0 pb-0 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <Sparkles className="text-primary w-12 h-12 mx-auto mb-4 opacity-80" />
              <p>Start a conversation with the AI Agent</p>
              <p className="text-sm mt-2">
                Describe a complex task or question
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2 max-w-md mx-auto">
                {[
                  { id: "organize", text: "Help me organize my emails" },
                  { id: "draft", text: "Draft a professional response" },
                  { id: "research", text: "Research this topic for me" },
                  { id: "plan", text: "Create an action plan" },
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
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}-${message.content.substring(
                  0,
                  10
                )}`}
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
                <Loader2 className="w-4 h-4 animate-spin" />
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
                  placeholder="Describe a complex task for the AI agent..."
                  disabled={loading}
                  className="w-full resize-none min-h-[48px] max-h-[150px] bg-transparent border-0 focus:outline-none focus:ring-0 text-foreground placeholder-gray-400 dark:placeholder-gray-500 p-1 text-sm leading-relaxed"
                  rows={1}
                  style={{ scrollbarWidth: "thin", resize: "none" }}
                />

                {/* Character count or loading indicator */}
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
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
