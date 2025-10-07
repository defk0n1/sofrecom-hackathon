import {
    Home,
    CheckSquare,
    Calendar,
    ChevronRight,
    Sparkles,
    Moon,
    Sun,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface PagesSidebarProps {
    currentPage: string;
    onPageChange: (page: string) => void;
    theme: "light" | "dark" | "system";
    setTheme: (theme: "light" | "dark" | "system") => void;
}

export default function PagesSidebar({
    currentPage,
    onPageChange,
    theme,
    setTheme,
}: Readonly<PagesSidebarProps>) {
    const [collapsed, setCollapsed] = useState(false);
    const { t, i18n } = useTranslation();

    const pages = [
        { id: "dashboard", name: t("navigation.dashboard"), icon: Home },
        { id: "todo", name: t("navigation.todoList"), icon: CheckSquare },
        { id: "calendar", name: t("navigation.calendar"), icon: Calendar },
    ];

    return (
        <aside
            className={`bg-gradient-to-b from-gray-900 to-gray-800 dark:from-gray-950 dark:to-gray-900 border-r border-gray-700 dark:border-gray-800 flex flex-col transition-all duration-300 ${
                collapsed ? "w-16" : "w-64"
            }`}
        >
            {/* Header */}
            <div className="p-2 py-4 border-b border-gray-700 dark:border-gray-800 flex items-center justify-between">
                {!collapsed && (
                    <h2 className="flex items-center text-lg font-bold text-white m-0 gap-2">
                        <div className="bg-primary text-white p-2 rounded-xl shadow-sm">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        MailMate
                    </h2>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-2 pr-0 hover:bg-gray-700/50 rounded-lg transition-colors"
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <ChevronRight
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                            collapsed ? "" : "rotate-180"
                        }`}
                    />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-0 space-y-1">
                {pages.map((page) => {
                    const Icon = page.icon;
                    const isActive = currentPage === page.id;

                    return (
                        <button
                            key={page.id}
                            onClick={() => onPageChange(page.id)}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group ${
                                isActive
                                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                                    : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
                            }`}
                            title={collapsed ? page.name : undefined}
                        >
                            <Icon
                                className={`w-5 h-5 flex-shrink-0 ${
                                    isActive
                                        ? "text-white"
                                        : "text-gray-400 group-hover:text-white"
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

            {!collapsed && (
                <div className="p-4 py-3 border-t border-gray-700 dark:border-gray-800">
                    <div className="flex items-center justify-between gap-3">
                        {/* Language Switcher */}
                        <div className="relative flex items-center gap-0.5 bg-gray-800/50 dark:bg-gray-900/50 rounded-lg p-1 backdrop-blur-sm border border-gray-700 dark:border-gray-700">
                            {["en", "fr"].map((lng) => (
                                <button
                                    key={lng}
                                    onClick={() => i18n.changeLanguage(lng)}
                                    className={`relative px-[15px] py-1.5 rounded-md text-xs font-bold transition-all duration-300 ${
                                        i18n.language === lng
                                            ? "text-white scale-105"
                                            : "text-gray-400 hover:text-gray-300"
                                    }`}
                                    aria-label={`Switch to ${lng.toUpperCase()} language`}
                                >
                                    {i18n.language === lng && (
                                        <span className="absolute inset-0 bg-orange-500 rounded-md animate-in fade-in zoom-in-95 duration-300" />
                                    )}
                                    <span className="relative z-10">{lng.toUpperCase()}</span>
                                </button>
                            ))}
                        </div>

                        {/* Theme Toggle */}
                        <button
                            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                            className="relative p-2.5 rounded-lg bg-gray-800/50 dark:bg-gray-900/50 border border-gray-700 dark:border-gray-700 hover:bg-gray-700/50 transition-all duration-300 overflow-hidden group"
                            title={t("theme.toggle")}
                        >
                            <div className="absolute inset-0 bg-orange-500/20 scale-0 group-hover:scale-100 transition-transform duration-300 rounded-lg" />
                            {theme === "light" ? (
                                <Moon className="w-5 h-5 text-gray-300 relative z-10 animate-in spin-in-180 duration-500" />
                            ) : (
                                <Sun className="w-5 h-5 text-gray-300 relative z-10 animate-in spin-in-180 duration-500" />
                            )}
                        </button>
                    </div>
                </div>
            )}
        </aside>
    );
}
