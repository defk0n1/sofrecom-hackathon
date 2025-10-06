import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, Clock, Calendar, Plus, ChevronDown, ChevronRight,
  Mail, Trash2, ArrowUpDown, Download
} from 'lucide-react';
import { taskStorage, type TaskItem, type TaskStatus } from '@/utils/taskStorage';
import { conversationStorage } from '@/utils/conversationStorage';

interface TodoListProps {
  conversationId?: string;
  onExpand?: () => void;
  isCompact?: boolean;
}

export default function TodoList({ conversationId, onExpand, isCompact = true }: TodoListProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set());
  const [newTaskText, setNewTaskText] = useState<{ [key: string]: string }>({});
  const [sortByPriority, setSortByPriority] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [conversationId]);

  const loadTasks = () => {
    if (conversationId) {
      setTasks(taskStorage.getByConversationId(conversationId));
    } else {
      setTasks(taskStorage.getAll());
    }
  };

  const toggleConversation = (convId: string) => {
    setExpandedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(convId)) {
        newSet.delete(convId);
      } else {
        newSet.add(convId);
      }
      return newSet;
    });
  };

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    taskStorage.updateStatus(taskId, status);
    loadTasks();
  };

  const handleAddTask = (convId: string) => {
    const text = newTaskText[convId]?.trim();
    if (!text) return;

    const newTask = {
      task: text,
      priority: 'medium',
      due_date: null,
      estimated_time: null,
      assigned_to: null
    };

    taskStorage.create(convId, newTask);
    setNewTaskText({ ...newTaskText, [convId]: '' });
    loadTasks();
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      taskStorage.delete(taskId);
      loadTasks();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'badge-danger';
      case 'medium':
        return 'badge-warning';
      default:
        return 'badge-secondary';
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'Done':
        return 'text-bg-success';
      case 'In Progress':
        return 'text-bg-info';
      default:
        return 'text-bg-secondary';
    }
  };

  const generateProgressReport = (convId: string) => {
    const convTasks = taskStorage.getByConversationId(convId);
    const conversation = conversationStorage.getById(convId);
    
    const totalTasks = convTasks.length;
    const completedTasks = convTasks.filter(t => t.status === 'Done').length;
    const inProgressTasks = convTasks.filter(t => t.status === 'In Progress').length;
    const notStartedTasks = convTasks.filter(t => t.status === 'Not Started').length;
    
    const report = `
# Progress Report - ${conversation?.title || 'Conversation'}
Generated on: ${new Date().toLocaleString()}

## Summary
- Total Tasks: ${totalTasks}
- Completed: ${completedTasks} (${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%)
- In Progress: ${inProgressTasks}
- Not Started: ${notStartedTasks}

## Task Details

${convTasks.map((task, idx) => `
### ${idx + 1}. ${task.task}
- **Status:** ${task.status}
- **Priority:** ${task.priority}
${task.due_date ? `- **Due Date:** ${task.due_date}` : ''}
${task.estimated_time ? `- **Estimated Time:** ${task.estimated_time}` : ''}
${task.assigned_to ? `- **Assigned To:** ${task.assigned_to}` : ''}
`).join('\n')}
    `.trim();

    // Download as text file
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progress-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendReportEmail = (convId: string) => {
    const conversation = conversationStorage.getById(convId);
    const convTasks = taskStorage.getByConversationId(convId);
    
    const completedTasks = convTasks.filter(t => t.status === 'Done').length;
    const totalTasks = convTasks.length;
    
    const emailSubject = `Progress Report: ${conversation?.title || 'Tasks'}`;
    const emailBody = `Dear Team,

I'm pleased to share the progress report for "${conversation?.title || 'our conversation'}".

Progress Summary:
- Total Tasks: ${totalTasks}
- Completed: ${completedTasks} (${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%)
- Remaining: ${totalTasks - completedTasks}

All tasks have been completed successfully. Please find the detailed report attached.

Best regards`;

    const mailtoLink = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoLink;
  };

  // Group tasks by conversation
  const groupedTasks: { [key: string]: TaskItem[] } = {};
  const conversations = conversationStorage.getAll();
  
  if (conversationId) {
    groupedTasks[conversationId] = sortByPriority 
      ? taskStorage.sortByPriority(tasks) 
      : tasks;
  } else {
    conversations.forEach(conv => {
      const convTasks = tasks.filter(t => t.conversationId === conv.id);
      if (convTasks.length > 0) {
        groupedTasks[conv.id] = sortByPriority 
          ? taskStorage.sortByPriority(convTasks) 
          : convTasks;
      }
    });
  }

  if (isCompact) {
    // Compact view for dashboard
    const displayTasks = conversationId 
      ? (sortByPriority ? taskStorage.sortByPriority(tasks) : tasks).slice(0, 5)
      : (sortByPriority ? taskStorage.sortByPriority(tasks) : tasks).slice(0, 5);

    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="w-5 h-5" />
              To-Do List
            </CardTitle>
            {onExpand && (
              <Button 
                onClick={onExpand} 
                variant="outline" 
                size="sm"
                className="text-xs"
              >
                View All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {displayTasks.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No tasks yet</p>
              <p className="text-xs mt-1">Tasks will appear here from email analysis</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayTasks.map(task => (
                <div key={task.id} className="border rounded-lg p-2 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${task.status === 'Done' ? 'line-through text-gray-500' : ''}`}>
                        {task.task}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className={`badge ${getPriorityColor(task.priority)} text-xs`}>
                          {task.priority}
                        </span>
                        <span className={`badge ${getStatusColor(task.status)} text-xs`}>
                          {task.status}
                        </span>
                        {task.due_date && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                      className="text-xs border rounded px-1 py-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>
                </div>
              ))}
              {tasks.length > 5 && (
                <div className="text-center py-2">
                  <button 
                    onClick={onExpand}
                    className="text-sm text-supporting-orange hover:underline"
                  >
                    +{tasks.length - 5} more tasks
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full expanded view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6" />
          Task Management
        </h2>
        <Button
          onClick={() => setSortByPriority(!sortByPriority)}
          variant="outline"
          size="sm"
        >
          <ArrowUpDown className="w-4 h-4 mr-2" />
          {sortByPriority ? 'Sort by Priority' : 'Sort by Date'}
        </Button>
      </div>

      {Object.keys(groupedTasks).length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No tasks yet</p>
              <p className="text-sm mt-2">Tasks extracted from email analysis will appear here</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedTasks).map(([convId, convTasks]) => {
          const conversation = conversationStorage.getById(convId);
          const isExpanded = expandedConversations.has(convId);
          const completedCount = convTasks.filter(t => t.status === 'Done').length;
          const totalCount = convTasks.length;
          const allCompleted = completedCount === totalCount && totalCount > 0;

          return (
            <Card key={convId}>
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleConversation(convId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                    <div>
                      <CardTitle className="text-lg">
                        {conversation?.title || 'Unknown Conversation'}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {completedCount} / {totalCount} tasks completed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        generateProgressReport(convId);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Report
                    </Button>
                    {allCompleted && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          sendReportEmail(convId);
                        }}
                        size="sm"
                        className="bg-supporting-orange hover:bg-opacity-90"
                      >
                        <Mail className="w-4 h-4 mr-1" />
                        Send Report
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent>
                  <div className="space-y-3">
                    {convTasks.map(task => (
                      <div key={task.id} className="border rounded-lg p-3 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-start gap-2">
                              <h4 className={`font-medium ${task.status === 'Done' ? 'line-through text-gray-500' : ''}`}>
                                {task.task}
                              </h4>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className={`badge ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                              <span className={`badge ${getStatusColor(task.status)}`}>
                                {task.status}
                              </span>
                              {task.due_date && (
                                <span className="text-sm text-gray-600 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              )}
                              {task.estimated_time && (
                                <span className="text-sm text-gray-600 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {task.estimated_time}
                                </span>
                              )}
                              {task.assigned_to && (
                                <span className="text-sm text-gray-600">
                                  👤 {task.assigned_to}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={task.status}
                              onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                              className="form-select text-sm border rounded px-2 py-1"
                            >
                              <option value="Not Started">Not Started</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Done">Done</option>
                            </select>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                              title="Delete task"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Quick Add Task */}
                    <div className="border-t pt-3 mt-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTaskText[convId] || ''}
                          onChange={(e) => setNewTaskText({ ...newTaskText, [convId]: e.target.value })}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddTask(convId);
                            }
                          }}
                          placeholder="Quick add new task..."
                          className="flex-1 form-control text-sm border rounded px-3 py-2"
                        />
                        <Button
                          onClick={() => handleAddTask(convId)}
                          size="sm"
                          disabled={!newTaskText[convId]?.trim()}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
