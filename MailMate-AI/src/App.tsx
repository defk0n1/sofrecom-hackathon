import "./scss/styles.scss";
import { useState, useEffect } from "react";
import { Sparkles, Moon, Sun } from "lucide-react";
import { useTranslation } from 'react-i18next';
import UnifiedChatInterface from "@/components/UnifiedChatInterface";
import ConversationSidebar from "@/components/ConversationSidebar";
import { useTheme } from "@/contexts/ThemeContext";
import { conversationStorage, type Conversation } from "@/utils/conversationStorage";
import type { ChatMessage } from "@/services/mailmateApi";

function App() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  useEffect(() => {
    // Load conversations on mount
    const loadedConversations = conversationStorage.getAll();
    setConversations(loadedConversations);
    
    // Auto-select first conversation if available
    if (loadedConversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(loadedConversations[0].id);
    }
  }, []);

  const selectedConversation = selectedConversationId 
    ? conversations.find(c => c.id === selectedConversationId) 
    : null;

  const handleNewConversation = () => {
    const newConversation = conversationStorage.create(
      `Conversation ${conversations.length + 1}`
    );
    setConversations([newConversation, ...conversations]);
    setSelectedConversationId(newConversation.id);
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
  };

  const handleDeleteConversation = (id: string) => {
    conversationStorage.delete(id);
    const updatedConversations = conversations.filter(c => c.id !== id);
    setConversations(updatedConversations);
    
    if (selectedConversationId === id) {
      setSelectedConversationId(updatedConversations[0]?.id || null);
    }
  };

  const handleMessagesChange = (messages: ChatMessage[]) => {
    if (selectedConversationId) {
      conversationStorage.update(selectedConversationId, { messages });
      setConversations(prev => 
        prev.map(c => 
          c.id === selectedConversationId 
            ? { ...c, messages, updatedAt: Date.now() }
            : c
        )
      );
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  // Create first conversation if none exist
  useEffect(() => {
    if (conversations.length === 0) {
      handleNewConversation();
    }
  }, [conversations.length]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-10 transition-colors">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-white p-2 rounded-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('app.title')}</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('app.subtitle')}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <div className="flex items-center gap-1 border dark:border-gray-600 rounded-lg p-1">
                <button
                  onClick={() => changeLanguage('en')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    i18n.language === 'en' 
                      ? 'bg-primary text-white' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={t('language.en')}
                >
                  EN
                </button>
                <button
                  onClick={() => changeLanguage('fr')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    i18n.language === 'fr' 
                      ? 'bg-primary text-white' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={t('language.fr')}
                >
                  FR
                </button>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={t('theme.toggle')}
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Sun className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
          {/* Left Sidebar - Conversations */}
          <div className="col-span-12 lg:col-span-3">
            <ConversationSidebar
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
              onDeleteConversation={handleDeleteConversation}
            />
          </div>

          {/* Main Chat Area */}
          <div className="col-span-12 lg:col-span-9">
            {selectedConversation ? (
              <UnifiedChatInterface
                messages={selectedConversation.messages}
                onMessagesChange={handleMessagesChange}
                emailContext={selectedConversation.emailContent}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">{t('sidebar.startFirst')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 mt-6 transition-colors">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            {t('app.footer')}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
