import { useEffect } from "react";
import { useWallet } from "../context/WalletContext";

const TOAST_STYLES = {
  info: "bg-komon-600",
  success: "bg-emerald-600",
  error: "bg-red-600",
};

export default function Toast() {
  const { toast, clearToast } = useWallet();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(clearToast, 8000);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div
      className={`toast-enter fixed bottom-6 right-6 z-50 max-w-sm px-5 py-3 rounded-xl shadow-lg text-white ${TOAST_STYLES[toast.type] || TOAST_STYLES.info}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm">{toast.message}</span>
        <button
          onClick={clearToast}
          className="text-white/70 hover:text-white transition"
        >
          ✕
        </button>
      </div>
    </div>
  );
}