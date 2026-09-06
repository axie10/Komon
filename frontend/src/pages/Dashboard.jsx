import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useTranslation } from "../context/SettingsContext";
import { useFactory } from "../hooks/useFactory";
import { POT_STATE, POT_STATE_COLOR, formatETH } from "../config/constants";

function FactorySetup({ onSave }) {
  const { factoryAddress, setFactoryAddress } = useWallet();
  const { t } = useTranslation();
  const [input, setInput] = useState(factoryAddress || "");

  return (
    <div className="max-w-lg mx-auto bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
      <h2 className="text-xl font-bold mb-2 dark:text-white">{t("dashboard.factoryTitle")}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t("dashboard.factoryDesc")}</p>
      <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="0x..."
        className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-komon-500 focus:border-transparent font-mono" />
      <button onClick={() => { setFactoryAddress(input); onSave(); }} disabled={!input || input.length < 42}
        className="w-full bg-komon-600 hover:bg-komon-700 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-lg transition text-sm">
        {t("dashboard.factorySave")}
      </button>
    </div>
  );
}

function PotCard({ pot, onClick }) {
  const { t } = useTranslation();
  const stateLabels = [t("states.funding"), t("states.active"), t("states.closed"), t("states.cancelled")];

  return (
    <button onClick={onClick}
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 text-left hover:border-komon-300 dark:hover:border-komon-500 hover:shadow-md transition-all group w-full">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-base group-hover:text-komon-600 dark:text-white transition">{pot.name}</h3>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${POT_STATE_COLOR[pot.state]}`}>
          {stateLabels[pot.state]}
        </span>
      </div>
      <div className="flex gap-4 text-sm text-slate-500 dark:text-slate-400">
        <span>{pot.memberCount} {t("dashboard.members")}</span>
        <span>·</span>
        <span>{formatETH(pot.totalFunds)} ETH</span>
        <span>·</span>
        <span>{pot.contributionsReceived}/{pot.memberCount} {t("dashboard.paid")}</span>
      </div>
      {!pot.contributed && pot.state === POT_STATE.FUNDING && (
        <div className="mt-3 text-xs text-amber-600 font-medium bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-lg inline-block">
          {t("dashboard.pending")}
        </div>
      )}
      {pot.pendingVotes > 0 && (
        <div className="mt-3 text-xs text-komon-600 font-medium bg-komon-50 dark:bg-komon-900/30 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-komon-600 animate-pulse" />
          {pot.pendingVotes} {t("dashboard.pendingVotes")}
        </div>
      )}
    </button>
  );
}

export default function Dashboard() {
  const { factoryAddress } = useWallet();
  const { t } = useTranslation();
  const { pots, loading, loadPots } = useFactory();
  const [showSetup, setShowSetup] = useState(!factoryAddress);
  const navigate = useNavigate();

  useEffect(() => { if (factoryAddress) loadPots(); }, [factoryAddress, loadPots]);

  if (showSetup || !factoryAddress) {
    return <div className="max-w-5xl mx-auto px-4 pt-12"><FactorySetup onSave={() => setShowSetup(false)} /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pt-8 pb-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">{t("dashboard.title")}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t("dashboard.subtitle")}</p>
        </div>
        <button onClick={() => setShowSetup(true)} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
          ⚙ {t("dashboard.factory")}
        </button>
      </div>
      {loading ? (
        <div className="text-center py-16 text-slate-400">{t("dashboard.loading")}</div>
      ) : pots.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🫙</div>
          <p className="text-slate-500 dark:text-slate-400 mb-4">{t("dashboard.empty")}</p>
          <button onClick={() => navigate("/create")}
            className="bg-komon-600 hover:bg-komon-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition">
            {t("dashboard.emptyCta")}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pots.map((pot) => <PotCard key={pot.address} pot={pot} onClick={() => navigate(`/pot/${pot.address}`)} />)}
        </div>
      )}
    </div>
  );
}
