import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import UnifiedChatInterface from "@/components/UnifiedChatInterface";
import EmailThreadViewer from "@/components/EmailThreadViewer";
import EmailThreadSidebar from "@/components/EmailThreadSidebar";
import {
  type Conversation,
} from "@/utils/conversationStorage";
import type { ChatMessage } from "@/services/mailmateApi";
import { mailmateAPI } from "@/services/mailmateApi";
import type { EmailThread } from "@/App";

interface DashboardPageProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onMessagesChange: (messages: ChatMessage[]) => void;
}

export default function DashboardPage({
  conversations,
  selectedConversationId,
  onMessagesChange,
}: Readonly<DashboardPageProps>) {
  const { t } = useTranslation();
  const [emailThreads, setEmailThreads] = useState<EmailThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadsLoading, setThreadsLoading] = useState(false);

  useEffect(() => {
    loadEmailThreads();
  }, []);

  const loadEmailThreads = async () => {
    try {
      setThreadsLoading(true);
      const response = await mailmateAPI.getEmailThreads();
      const loadedThreads = response.threads || [];
      setEmailThreads(loadedThreads);

      if (loadedThreads.length > 0 && !selectedThreadId) {
        setSelectedThreadId(loadedThreads[0].thread_id);
      }
    } catch (error) {
      console.error("Error loading email threads:", error);
    } finally {
      setThreadsLoading(false);
    }
  };

  const selectedConversation = selectedConversationId
    ? conversations.find((c) => c.id === selectedConversationId)
    : null;

  const selectedThread = selectedThreadId
    ? emailThreads.find((t) => t.thread_id === selectedThreadId)
    : null;

  const emailContextFromThread = selectedThread
    ? selectedThread.emails
        .map((e) => `From: ${e.sender}\nSubject: ${e.subject}\n\n${e.body}`)
        .join("\n\n---\n\n")
    : null;

  return (
    <div className="h-full px-6 py-6">
      <div className="flex gap-6 h-full">
        {/* Email Threads Sidebar */}
        <aside className="w-80 flex-shrink-0 bg-card dark:bg-gray-900 flex flex-col border-r border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden shadow-sm">
          <EmailThreadSidebar
            threads={emailThreads}
            selectedThreadId={selectedThreadId}
            onSelectThread={setSelectedThreadId}
            onRefresh={loadEmailThreads}
            loading={threadsLoading}
          />
        </aside>

        {/* Email Thread Viewer - Center */}
        <div className="flex-1 min-w-0">
          <EmailThreadViewer
            userEmail="dev@example.com"
            threads={emailThreads}
            selectedThreadId={selectedThreadId}
            loading={threadsLoading}
            onThreadUpdate={loadEmailThreads}
          />

          {!selectedConversation && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 animate-fadeIn bg-card rounded-lg border p-8">
              <Sparkles className="w-14 h-14 mb-4 opacity-60" />
              <p className="text-lg font-medium">
                {t("sidebar.startFirst")}
              </p>
            </div>
          )}
        </div>

        {/* AI Chat Interface - Right */}
        <div className="w-80 flex-shrink-0">
          {selectedConversation && (
            <UnifiedChatInterface
              messages={selectedConversation.messages}
              onMessagesChange={onMessagesChange}
              emailContext={
                selectedConversation.emailContent ||
                emailContextFromThread ||
                undefined
              }
              conversationId={selectedConversation.id}
              selectedThread={selectedThread}
            />
          )}
        </div>
      </div>
    </div>
  );
}