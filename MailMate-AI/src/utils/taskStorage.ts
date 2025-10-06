import type { Task } from '@/services/mailmateApi';

export type TaskStatus = 'Not Started' | 'In Progress' | 'Done';

export interface TaskItem extends Task {
  id: string;
  conversationId: string;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'mailmate_tasks';

export const taskStorage = {
  getAll: (): TaskItem[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading tasks:', error);
      return [];
    }
  },

  getByConversationId: (conversationId: string): TaskItem[] => {
    const tasks = taskStorage.getAll();
    return tasks.filter(t => t.conversationId === conversationId);
  },

  create: (conversationId: string, task: Task): TaskItem => {
    const taskItem: TaskItem = {
      ...task,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      status: 'Not Started',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const tasks = taskStorage.getAll();
    tasks.push(taskItem);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    
    return taskItem;
  },

  update: (id: string, updates: Partial<TaskItem>): void => {
    const tasks = taskStorage.getAll();
    const index = tasks.findIndex(t => t.id === id);
    
    if (index !== -1) {
      tasks[index] = {
        ...tasks[index],
        ...updates,
        updatedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }
  },

  delete: (id: string): void => {
    const tasks = taskStorage.getAll();
    const filtered = tasks.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  deleteByConversationId: (conversationId: string): void => {
    const tasks = taskStorage.getAll();
    const filtered = tasks.filter(t => t.conversationId !== conversationId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  updateStatus: (id: string, status: TaskStatus): void => {
    taskStorage.update(id, { status });
  },

  // Smart priority sorting
  sortByPriority: (tasks: TaskItem[]): TaskItem[] => {
    const priorityOrder: { [key: string]: number } = {
      'high': 1,
      'medium': 2,
      'low': 3
    };

    return [...tasks].sort((a, b) => {
      // First sort by status (incomplete tasks first)
      if (a.status === 'Done' && b.status !== 'Done') return 1;
      if (a.status !== 'Done' && b.status === 'Done') return -1;

      // Then by priority
      const priorityA = priorityOrder[a.priority?.toLowerCase()] || 4;
      const priorityB = priorityOrder[b.priority?.toLowerCase()] || 4;
      if (priorityA !== priorityB) return priorityA - priorityB;

      // Then by due date (earliest first)
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;

      // Finally by creation date
      return a.createdAt - b.createdAt;
    });
  }
};
