import { useTranslation } from "../context/SettingsContext";

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 mt-16">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-komon-600 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <div>
              <div className="font-semibold text-sm dark:text-white leading-tight">Komon</div>
              <div className="text-xs text-slate-400 leading-tight mt-0.5">{t("footer.tagline")}</div>
            </div>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm">
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
            <a
              href="#"
              className="text-slate-500 hover:text-komon-600 dark:text-slate-400 dark:hover:text-komon-400 transition"
            >
              {t("footer.terms")}
            </a>
          </nav>

          {/* Copyright */}
          <div className="text-xs text-slate-400">
            © {year} · {t("footer.builtWith")} ❤️
          </div>
        </div>
      </div>
    </footer>
  );
}