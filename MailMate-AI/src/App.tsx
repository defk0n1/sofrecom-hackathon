import "./scss/styles.scss";
import { useState, useEffect } from "react";
import { Sparkles, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import UnifiedChatInterface from "@/components/UnifiedChatInterface";
import ConversationSidebar from "@/components/ConversationSidebar";
import { useTheme } from "@/contexts/ThemeContext";
import {
  conversationStorage,
  type Conversation,
} from "@/utils/conversationStorage";
import type { ChatMessage } from "@/services/mailmateApi";

function App() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

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

  const handleSelectConversation = (id: string) => setSelectedConversationId(id);

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
    <div className="bg-background transition-colors min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-card border-b dark:border-gray-700 sticky top-0 z-20 transition-colors shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-white p-2 rounded-xl shadow-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">{t("app.title")}</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t("app.subtitle")}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Language Switcher */}
              <div className="flex items-center gap-1 border dark:border-gray-600 rounded-xl px-1.5 py-1 bg-muted/30 backdrop-blur-sm">
                {["en", "fr"].map((lng) => (
                  <button
                    key={lng}
                    onClick={() => changeLanguage(lng)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      i18n.language === lng
                        ? "bg-primary text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {lng.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="p-2.5 rounded-lg border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                title={t("theme.toggle")}
              >
                {theme === "light" ? (
                  <Moon className="w-5 h-5 text-gray-600" />
                ) : (
                  <Sun className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-3">
            <ConversationSidebar
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
              onDeleteConversation={handleDeleteConversation}
            />
          </div>

          {/* Chat Interface */}
          <div className="col-span-12 lg:col-span-9 transition-all">
            {selectedConversation ? (
              <UnifiedChatInterface
                messages={selectedConversation.messages}
                onMessagesChange={handleMessagesChange}
                emailContext={selectedConversation.emailContent}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 animate-fadeIn">
                <Sparkles className="w-14 h-14 mb-4 opacity-60" />
                <p className="text-lg font-medium">{t("sidebar.startFirst")}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto dark:bg-gray-800 border-t dark:border-gray-700 transition-colors">
        <div className="container mx-auto px-4 py-5">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            {t("app.footer")}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
