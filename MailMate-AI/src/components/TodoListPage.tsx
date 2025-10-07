import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TodoList from './TodoList';
import { useTranslation } from 'react-i18next';

interface TodoListPageProps {
  onBack: () => void;
  conversationId?: string;
}

export default function TodoListPage({ onBack, conversationId }: Readonly<TodoListPageProps>) {
  const { t } = useTranslation();
  
  return (
    <div className="h-full flex flex-col px-6 py-6">
      <div className="mb-6 flex items-center gap-4">
        <Button 
          onClick={onBack} 
          variant="outline" 
          size="sm"
          className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("todo.backToDashboard")}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto bg-card dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        <TodoList conversationId={conversationId} isCompact={false} />
      </div>
    </div>
  );
}
