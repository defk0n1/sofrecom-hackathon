import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TodoList from './TodoList';

interface TodoListPageProps {
  onBack: () => void;
  conversationId?: string;
}

export default function TodoListPage({ onBack, conversationId }: TodoListPageProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex items-center gap-4">
        <Button onClick={onBack} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <TodoList conversationId={conversationId} isCompact={false} />
      </div>
    </div>
  );
}
