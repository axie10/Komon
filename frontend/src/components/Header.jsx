import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useSettings, useTranslation } from "../context/SettingsContext";
import { shortenAddress } from "../config/constants";

export default function Header() {
  const { account, isConnected, connect, disconnect } = useWallet();
  const { language, toggleLanguage, isDark, toggleTheme } = useSettings();
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => navigate(isConnected ? "/dashboard" : "/")}
          className="flex items-center gap-2.5 hover:opacity-80 transition"
        >
          <div className="w-8 h-8 rounded-lg bg-komon-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">K</span>
          </div>
          <span className="font-bold text-lg tracking-tight dark:text-white">Komon</span>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Language toggle */}
          <button
            onClick={toggleLanguage}
            className="h-9 text-xs font-medium px-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
          >
            {language === "en" ? "ES" : "EN"}
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="h-9 w-9 flex items-center justify-center text-base rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
          >
            {isDark ? "☀️" : "🌙"}
          </button>

          {isConnected && (
            <button
              onClick={() => navigate("/create")}
              className="h-9 bg-komon-600 hover:bg-komon-700 text-white text-sm font-medium px-3 md:px-4 rounded-lg transition flex items-center justify-center"
            >
              <span className="hidden md:inline">{t("header.newPot")}</span>
              <span className="md:hidden text-lg leading-none">+</span>
            </button>
          )}

          {isConnected ? (
            <button
              onClick={disconnect}
              className="h-9 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium px-2.5 md:px-4 rounded-lg transition flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
              <span className="text-xs md:text-sm">{shortenAddress(account)}</span>
            </button>
          ) : (
            <button
              onClick={connect}
              className="h-9 bg-komon-600 hover:bg-komon-700 text-white text-sm font-medium px-3 md:px-4 rounded-lg transition"
            >
              {t("header.connect")}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}