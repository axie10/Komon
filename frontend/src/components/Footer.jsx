import { useTranslation } from "../context/SettingsContext";

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 mt-16">
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left — brand + tagline inline */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Komon</span>
            <span>·</span>
            <span className="hidden sm:inline">{t("footer.tagline")}</span>
          </div>

          {/* Right — links */}
          <nav className="flex items-center gap-4 text-xs">
            <a
              href="https://github.com/axie10/komon"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-komon-600 dark:text-slate-400 dark:hover:text-komon-400 transition"
            >
              GitHub
            </a>
            <a
              href="#"
              className="text-slate-500 hover:text-komon-600 dark:text-slate-400 dark:hover:text-komon-400 transition"
            >
              {t("footer.docs")}
            </a>
            <span className="text-slate-400">© {year}</span>
          </nav>
        </div>
      </div>
    </footer>
  );
}