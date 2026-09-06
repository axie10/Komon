import { createContext, useContext, useState, useCallback, useEffect } from "react";
import en from "../i18n/en";
import es from "../i18n/es";

const translations = { en, es };

const SettingsContext = createContext(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

// Simple translation hook
export function useTranslation() {
  const { language } = useSettings();
  const t = translations[language] || translations.en;

  // Access nested keys: t("landing.title1")
  const translate = useCallback(
    (key) => {
      const keys = key.split(".");
      let result = t;
      for (const k of keys) {
        result = result?.[k];
      }
      return result || key;
    },
    [t]
  );

  return { t: translate, lang: language };
}

export function SettingsProvider({ children }) {
  // ── Language ─────────────────────────────
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem("komon_lang") || "en";
    } catch {
      return "en";
    }
  });

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const next = prev === "en" ? "es" : "en";
      try {
        localStorage.setItem("komon_lang", next);
      } catch {}
      return next;
    });
  }, []);

  // ── Theme ────────────────────────────────
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("komon_theme") || "light";
    } catch {
      return "light";
    }
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      try {
        localStorage.setItem("komon_theme", next);
      } catch {}
      return next;
    });
  }, []);

  // Apply dark class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const value = {
    language,
    toggleLanguage,
    theme,
    isDark: theme === "dark",
    toggleTheme,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
