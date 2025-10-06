import i18n from "@/i18n/config";
import { t, changeLanguage } from "i18next";
import { Sparkles, Moon, Sun } from "lucide-react";


interface HeaderProps {
    setTheme: (theme: "light" | "dark") => void;
    theme: "light" | "dark" | "system";
}

const Header = ({ setTheme, theme }: HeaderProps) => {
  return (
    <header className="bg-card border-b dark:border-gray-700 z-20 transition-colors shadow-sm flex-shrink-0">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-white p-2 rounded-xl shadow-sm">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold m-0">{t("app.title")}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="flex items-center gap-1 border dark:border-gray-600 rounded-xl px-2 py-1 bg-muted/30 backdrop-blur-sm">
              {["en", "fr"].map((lng) => (
                <button
                  key={lng}
                  onClick={() => changeLanguage(lng)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    i18n.language === lng
                      ? "bg-primary text-white shadow-md"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                  aria-label={`Switch to ${lng.toUpperCase()} language`}
                >
                  {lng.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="p-2.5 rounded-lg border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              title={t("theme.toggle")}
            >
              {theme === "light" ? (
                <Moon className="w-5 h-5 text-gray-600" />
              ) : (
                <Sun className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;