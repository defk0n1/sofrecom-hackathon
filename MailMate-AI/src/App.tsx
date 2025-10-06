import "./scss/styles.scss";
import { useState, useEffect } from "react";
import { Sparkles, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import UnifiedChatInterface from "@/components/UnifiedChatInterface";
import ConversationSidebar from "@/components/ConversationSidebar";
import TodoList from "@/components/TodoList";
import TodoListPage from "@/components/TodoListPage";
import { useTheme } from "@/contexts/ThemeContext";
import {
  conversationStorage,
  type Conversation,
} from "@/utils/conversationStorage";
import type { ChatMessage } from "@/services/mailmateApi";
import Header from "./components/Header";

function App() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [showTodoListPage, setShowTodoListPage] = useState(false);

  useEffect(() => {
    const loadedConversations = conversationStorage.getAll();
    setConversations(loadedConversations);
    if (loadedConversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(loadedConversations[0].id);
    }
  }, []);

  const selectedConversation = selectedConversationId
    ? conversations.find((c) => c.id === selectedConversationId)
    : null;

  const handleNewConversation = () => {
    const newConversation = conversationStorage.create(
      `Conversation ${conversations.length + 1}`
    );
    setConversations([newConversation, ...conversations]);
    setSelectedConversationId(newConversation.id);
  };

  const handleSelectConversation = (id: string) =>
    setSelectedConversationId(id);

  const handleDeleteConversation = (id: string) => {
    conversationStorage.delete(id);
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    if (selectedConversationId === id) {
      setSelectedConversationId(updated[0]?.id || null);
    }
  };

  const handleMessagesChange = (messages: ChatMessage[]) => {
    if (!selectedConversationId) return;
    conversationStorage.update(selectedConversationId, { messages });
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConversationId
          ? { ...c, messages, updatedAt: Date.now() }
          : c
      )
    );
  };

  const changeLanguage = (lng: string) => i18n.changeLanguage(lng);

  useEffect(() => {
    if (conversations.length === 0) handleNewConversation();
  }, [conversations.length]);

  return (
    <div className="bg-background transition-colors flex h-screen overflow-hidden">
      {/* Messenger-style Sidebar - Fixed to left */}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <Header setTheme={setTheme} theme={theme} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {showTodoListPage ? (
            <div className="h-full px-6 py-6">
              <TodoListPage
                onBack={() => setShowTodoListPage(false)}
                conversationId={selectedConversationId || undefined}
              />
            </div>
          ) : (
            <div className="h-full px-6 py-6">
              <div className="flex gap-6 h-full">
                <aside className="w-80 flex-shrink-0 bg-card dark:bg-gray-900 flex flex-col border-r border-gray-200 dark:border-gray-800">
                  <ConversationSidebar
                    conversations={conversations}
                    selectedConversationId={selectedConversationId}
                    onSelectConversation={handleSelectConversation}
                    onNewConversation={handleNewConversation}
                    onDeleteConversation={handleDeleteConversation}
                  />
                </aside>
                {/* Chat Interface - Takes up more space */}
                <div className="flex-1 min-w-0">
                  {selectedConversation ? (
                    <UnifiedChatInterface
                      messages={selectedConversation.messages}
                      onMessagesChange={handleMessagesChange}
                      emailContext={selectedConversation.emailContent}
                      conversationId={selectedConversation.id}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 animate-fadeIn bg-card rounded-lg border p-8">
                      <Sparkles className="w-14 h-14 mb-4 opacity-60" />
                      <p className="text-lg font-medium">
                        {t("sidebar.startFirst")}
                      </p>
                    </div>
                  )}
                </div>

                {/* Todo List on the right */}
                <div className="w-80 flex-shrink-0">
                  <TodoList
                    conversationId={selectedConversationId || undefined}
                    onExpand={() => setShowTodoListPage(true)}
                    isCompact={true}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
