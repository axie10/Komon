import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { shortenAddress } from "../config/constants";

export default function Header() {
  const { account, isConnected, connect, disconnect } = useWallet();
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => navigate(isConnected ? "/dashboard" : "/")}
          className="flex items-center gap-2.5 hover:opacity-80 transition"
        >
          <div className="w-8 h-8 rounded-lg bg-komon-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">K</span>
          </div>
          <span className="font-bold text-lg tracking-tight">Komon</span>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {isConnected && (
            <button
              onClick={() => navigate("/create")}
              className="bg-komon-600 hover:bg-komon-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              New pot
            </button>
          )}

          {isConnected ? (
            <button
              onClick={disconnect}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
              {shortenAddress(account)}
            </button>
          ) : (
            <button
              onClick={connect}
              className="bg-komon-600 hover:bg-komon-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              Connect wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}