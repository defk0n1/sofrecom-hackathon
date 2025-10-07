import "./scss/styles.scss";
import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import {
  conversationStorage,
  type Conversation,
} from "@/utils/conversationStorage";
import type { ChatMessage } from "@/services/mailmateApi";
import Header from "./components/Header";
import PagesSidebar from "./components/PageSideBar";
import DashboardPage from "./pages/Dashboard";
import TodoPage from "./pages/TodoPage";
import CalendarPage from "./pages/CalendarPage";

export interface EmailMessage {
  id: string;
  thread_id: string;
  sender: string;
  recipients: string;
  subject: string;
  body: string;
  received_date: string;
  is_reply: number;
  attachments: Array<{ filename: string; mimeType: string; size: number }>;
  summary?: string;
}

export interface EmailThread {
  thread_id: string;
  subject: string;
  emails: EmailMessage[];
}

function App() {
  const { theme, setTheme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [currentPage, setCurrentPage] = useState<string>("dashboard");

  useEffect(() => {
    const loadedConversations = conversationStorage.getAll();
    setConversations(loadedConversations);
    if (loadedConversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(loadedConversations[0].id);
    }
  }, []);

  const handleNewConversation = () => {
    const newConversation = conversationStorage.create(
      `Conversation ${conversations.length + 1}`
    );
    setConversations([newConversation, ...conversations]);
    setSelectedConversationId(newConversation.id);
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

  useEffect(() => {
    if (conversations.length === 0) handleNewConversation();
  }, [conversations.length]);

  const renderPage = () => {
    switch (currentPage) {
      case "todo":
        return <TodoPage />;
      case "calendar":
        return <CalendarPage />;

      case "dashboard":
      default:
        return (
          <DashboardPage
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onMessagesChange={handleMessagesChange}
          />
        );
    }
  };

  return (
    <div className="bg-background transition-colors flex h-screen overflow-hidden">
      {/* Pages Sidebar - Fixed to left */}
      <PagesSidebar currentPage={currentPage} onPageChange={setCurrentPage} theme={theme} setTheme={setTheme} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">{renderPage()}</main>
      </div>
    </div>
  );
}

export default App;
