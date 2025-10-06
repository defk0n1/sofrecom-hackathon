import type { ChatMessage, Task } from '@/services/mailmateApi';

export interface Conversation {
  id: string;
  title: string;
  emailContent?: string;
  messages: ChatMessage[];
  tasks?: Task[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'mailmate_conversations';

export const conversationStorage = {
  getAll: (): Conversation[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading conversations:', error);
      return [];
    }
  },

  getById: (id: string): Conversation | null => {
    const conversations = conversationStorage.getAll();
    return conversations.find(c => c.id === id) || null;
  },

  create: (title: string, emailContent?: string): Conversation => {
    const conversation: Conversation = {
      id: Date.now().toString(),
      title,
      emailContent,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const conversations = conversationStorage.getAll();
    conversations.unshift(conversation);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    
    return conversation;
  },

  update: (id: string, updates: Partial<Conversation>): void => {
    const conversations = conversationStorage.getAll();
    const index = conversations.findIndex(c => c.id === id);
    
    if (index !== -1) {
      conversations[index] = {
        ...conversations[index],
        ...updates,
        updatedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    }
  },

  delete: (id: string): void => {
    const conversations = conversationStorage.getAll();
    const filtered = conversations.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  addMessage: (conversationId: string, message: ChatMessage): void => {
    const conversation = conversationStorage.getById(conversationId);
    if (conversation) {
      conversation.messages.push(message);
      conversationStorage.update(conversationId, { messages: conversation.messages });
    }
  }
};
