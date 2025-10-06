import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Zap, Mail, Languages, Paperclip, Bot, CheckCircle, 
  AlertCircle, X, Loader2, ChevronUp, ChevronDown 
} from 'lucide-react';
import { mailmateAPI } from '@/services/mailmateApi';
import type { EmailThread } from '@/App';

interface FloatingQuickActionsProps {
  selectedThread: EmailThread | null;
  emailContext?: string;
  onActionComplete?: (result: string) => void;
}

type ActionType = 'summarize' | 'extract-tasks' | 'translate' | 'reply-draft';
type ActionStatus = 'idle' | 'processing' | 'success' | 'error';

export default function FloatingQuickActions({
  selectedThread,
  emailContext,
  onActionComplete
}: FloatingQuickActionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionStatus, setActionStatus] = useState<ActionStatus>('idle');
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<ActionType | null>(null);

  const handleQuickAction = async (action: ActionType) => {
    if (!selectedThread || !emailContext) {
      setActionResult('⚠️ Please select an email thread first');
      setActionStatus('error');
      setTimeout(() => {
        setActionStatus('idle');
        setActionResult(null);
      }, 3000);
      return;
    }

    setProcessingAction(action);
    setActionStatus('processing');
    setActionResult(null);

    try {
      let result = '';
      
      switch (action) {
        case 'summarize':
          const summaryResponse = await mailmateAPI.processEmail(emailContext);
          result = `📧 **Quick Summary**\n\n${summaryResponse.analysis.summary}\n\n**Sentiment:** ${summaryResponse.analysis.sentiment}\n**Urgency:** ${summaryResponse.analysis.urgency}`;
          break;

        case 'extract-tasks':
          const tasksResponse = await mailmateAPI.detectTasks(emailContext);
          if (tasksResponse.tasks && tasksResponse.tasks.length > 0) {
            result = `✅ **Tasks Extracted** (${tasksResponse.tasks.length})\n\n${tasksResponse.tasks.map((t: any, i: number) => 
              `${i + 1}. ${t.task} (Priority: ${t.priority})`
            ).join('\n')}`;
          } else {
            result = '✅ No tasks found in this email thread';
          }
          break;

        case 'translate':
          // Get the last email in thread
          const lastEmail = selectedThread.emails[selectedThread.emails.length - 1];
          const translateResponse = await mailmateAPI.translate(
            lastEmail.body, 
            'French' // Default language, could be made configurable
          );
          result = `🌐 **Quick Translation**\n\n${translateResponse.translation.translated_text.substring(0, 200)}${translateResponse.translation.translated_text.length > 200 ? '...' : ''}`;
          break;

        case 'reply-draft':
          // Use agent to generate a reply draft
          const agentResponse = await mailmateAPI.runAgent(
            `Generate a professional reply draft for this email thread. Keep it concise and polite.`,
            emailContext
          );
          result = `✍️ **Reply Draft**\n\n${agentResponse.output}`;
          break;

        default:
          result = '⚠️ Unknown action';
      }

      setActionResult(result);
      setActionStatus('success');
      
      if (onActionComplete) {
        onActionComplete(result);
      }

      // Auto-hide after 5 seconds on success
      setTimeout(() => {
        setActionStatus('idle');
        setActionResult(null);
      }, 5000);

    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      setActionResult(`❌ Failed to ${action.replace('-', ' ')}`);
      setActionStatus('error');
      
      setTimeout(() => {
        setActionStatus('idle');
        setActionResult(null);
      }, 3000);
    } finally {
      setProcessingAction(null);
    }
  };

  const actions = [
    { 
      id: 'summarize' as ActionType, 
      icon: Mail, 
      label: 'Quick Summary', 
      color: 'bg-blue-500 hover:bg-blue-600' 
    },
    { 
      id: 'extract-tasks' as ActionType, 
      icon: CheckCircle, 
      label: 'Extract Tasks', 
      color: 'bg-green-500 hover:bg-green-600' 
    },
    { 
      id: 'translate' as ActionType, 
      icon: Languages, 
      label: 'Translate', 
      color: 'bg-purple-500 hover:bg-purple-600' 
    },
    { 
      id: 'reply-draft' as ActionType, 
      icon: Bot, 
      label: 'Draft Reply', 
      color: 'bg-supporting-orange hover:bg-supporting-orange/90' 
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Action Result Display */}
      {actionResult && (
        <div className={`
          max-w-sm p-4 rounded-lg shadow-lg animate-fadeIn
          ${actionStatus === 'success' ? 'bg-green-50 border-2 border-green-500' : 
            actionStatus === 'error' ? 'bg-red-50 border-2 border-red-500' : 
            'bg-gray-50 border-2 border-gray-300'}
        `}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1">
              {actionStatus === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <p className="text-sm whitespace-pre-wrap text-gray-800">{actionResult}</p>
            </div>
            <button
              onClick={() => {
                setActionStatus('idle');
                setActionResult(null);
              }}
              className="p-1 rounded-full hover:bg-gray-200"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      {isExpanded && (
        <div className="flex flex-col gap-2 animate-fadeIn">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action.id)}
              disabled={processingAction !== null}
              className={`
                ${action.color}
                text-white px-4 py-2 rounded-full shadow-lg
                flex items-center gap-2 text-sm font-medium
                transition-all duration-200 transform hover:scale-105
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {processingAction === action.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <action.icon className="w-4 h-4" />
              )}
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={actionStatus === 'processing'}
        className={`
          bg-supporting-orange text-white p-4 rounded-full shadow-lg
          transition-all duration-200 transform hover:scale-110
          ${actionStatus === 'processing' ? 'animate-pulse' : ''}
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {actionStatus === 'processing' ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : isExpanded ? (
          <ChevronDown className="w-6 h-6" />
        ) : (
          <Zap className="w-6 h-6" />
        )}
      </button>
    </div>
  );
}
