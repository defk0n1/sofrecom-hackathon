import TodoList from "@/components/TodoList";

export default function TodoPage() {
  return (
    <div className="h-full flex flex-col px-6 py-6">
      <div className="flex-1 overflow-y-auto bg-card dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        <TodoList isCompact={false} />
      </div>
    </div>
  );
}