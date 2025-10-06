import { Home, CheckSquare, Calendar, ChevronRight } from "lucide-react";
import { useState } from "react";

interface PagesSidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export default function PagesSidebar({ currentPage, onPageChange }: Readonly<PagesSidebarProps>) {
  const [collapsed, setCollapsed] = useState(false);
    
  const pages = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'todo', name: 'Todo List', icon: CheckSquare },
    { id: 'calendar', name: 'Calendar', icon: Calendar },
  ];

  return (
    <aside
      className={`bg-gradient-to-b from-gray-900 to-gray-800 dark:from-gray-950 dark:to-gray-900 border-r border-gray-700 dark:border-gray-800 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700 dark:border-gray-800 flex items-center justify-between">
        {!collapsed && (
          <h2 className="text-lg font-bold text-white">
            MailMate
          </h2>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronRight
            className={`w-5 h-5 text-gray-400 transition-transform ${
              collapsed ? '' : 'rotate-180'
            }`}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {pages.map((page) => {
          const Icon = page.icon;
          const isActive = currentPage === page.id;

          return (
            <button
              key={page.id}
              onClick={() => onPageChange(page.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
              title={collapsed ? page.name : undefined}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 ${
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                }`}
              />
              {!collapsed && (
                <span className="font-medium text-sm truncate">
                  {page.name}
                </span>
              )}
              {isActive && !collapsed && (
                <div className="ml-auto w-2 h-2 rounded-full bg-white"></div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-700 dark:border-gray-800">
          <div className="text-xs text-gray-500">
            <p className="font-medium mb-1">AI Email Assistant</p>
            <p>Manage emails smarter</p>
          </div>
        </div>
      )}
    </aside>
  );
}