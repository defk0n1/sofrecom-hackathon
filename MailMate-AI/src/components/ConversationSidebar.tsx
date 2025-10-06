import { Plus, MessageSquare, Trash2, Edit, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Conversation } from '@/utils/conversationStorage';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

interface ConversationSidebarProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
}

export default function ConversationSidebar({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation
}: ConversationSidebarProps) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredConversations = searchTerm 
    ? conversations.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()))
    : conversations;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleStartEditing = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };

  const handleSaveEdit = () => {
    if (editingId && editTitle.trim() && onRenameConversation) {
      onRenameConversation(editingId, editTitle.trim());
      setEditingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{t('sidebar.title')}</h2>
          <Button
            size="sm"
            onClick={onNewConversation}
            className="btn btn-primary"
            aria-label="New conversation"
            title="New conversation"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Search input */}
        <div className="relative">
          <input
            type="search"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control w-full rounded-md pl-3 pr-8 py-1 border-gray-300 focus:border-supporting-orange focus:ring focus:ring-supporting-orange focus:ring-opacity-50 text-sm"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="text-center text-gray-500 p-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">{searchTerm ? 'No matching conversations' : t('sidebar.noConversations')}</p>
            {!searchTerm && <p className="text-xs mt-1">{t('sidebar.startFirst')}</p>}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedConversationId === conversation.id
                    ? 'bg-supporting-orange text-black'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => editingId !== conversation.id && onSelectConversation(conversation.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {editingId === conversation.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          autoFocus
                          className="form-control w-full rounded-sm text-sm py-0 px-1 border-gray-300 focus:ring-0"
                        />
                        <div className="flex gap-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveEdit();
                            }}
                            className="text-green-600 p-1 rounded hover:bg-green-100"
                            aria-label="Save"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEdit();
                            }}
                            className="text-red-600 p-1 rounded hover:bg-red-100"
                            aria-label="Cancel"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-sm truncate">
                          {conversation.title}
                        </p>
                        <p className={`text-xs mt-1 truncate ${
                          selectedConversationId === conversation.id
                            ? 'text-black opacity-80'
                            : 'text-gray-500'
                        }`}>
                          {conversation.messages.length > 0
                            ? conversation.messages[conversation.messages.length - 1].content.substring(0, 50) + (conversation.messages[conversation.messages.length - 1].content.length > 50 ? '...' : '')
                            : 'No messages yet'}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs whitespace-nowrap ${
                      selectedConversationId === conversation.id
                        ? 'text-black opacity-70'
                        : 'text-gray-400'
                    }`}>
                      {formatDate(conversation.updatedAt)}
                    </span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
                      {onRenameConversation && editingId !== conversation.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEditing(conversation);
                          }}
                          className={`p-1 rounded ${
                            selectedConversationId === conversation.id
                              ? 'hover:bg-black/10'
                              : 'hover:bg-gray-200'
                          }`}
                          aria-label="Edit"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conversation.id);
                        }}
                        className={`p-1 rounded ${
                          selectedConversationId === conversation.id
                            ? 'hover:bg-red-600 hover:text-white'
                            : 'text-red-500 hover:bg-red-100'
                        }`}
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
