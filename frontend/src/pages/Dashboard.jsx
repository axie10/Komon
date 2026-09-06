import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useFactory } from "../hooks/useFactory";
import { formatEther } from "ethers";
import {
  POT_STATE,
  POT_STATE_LABEL,
  POT_STATE_COLOR,
} from "../config/constants";

// ──────────────────────────────────────────────
//  Factory Setup (inline — only shown when needed)
// ──────────────────────────────────────────────

function FactorySetup({ onSave }) {
  const { factoryAddress, setFactoryAddress } = useWallet();
  const [input, setInput] = useState(factoryAddress || "");

  const handleSave = () => {
    setFactoryAddress(input);
    onSave();
  };

  return (
    <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 p-8">
      <h2 className="text-xl font-bold mb-2">Set Factory address</h2>
      <p className="text-sm text-slate-500 mb-6">
        Paste the KomonFactory contract address from your deployment.
      </p>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="0x..."
        className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-komon-500 focus:border-transparent font-mono"
      />
      <button
        onClick={handleSave}
        disabled={!input || input.length < 42}
        className="w-full bg-komon-600 hover:bg-komon-700 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-lg transition text-sm"
      >
        Save and continue
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────
//  Pot Card
// ──────────────────────────────────────────────

function PotCard({ pot, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200 p-5 text-left hover:border-komon-300 hover:shadow-md transition-all group w-full"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-base group-hover:text-komon-600 transition">
          {pot.name}
        </h3>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${POT_STATE_COLOR[pot.state]}`}
        >
          {POT_STATE_LABEL[pot.state]}
        </span>
      </div>

      <div className="flex gap-4 text-sm text-slate-500">
        <span>{pot.memberCount} members</span>
        <span>·</span>
        <span>{formatEther(pot.totalFunds)} ETH</span>
        <span>·</span>
        <span>
          {pot.contributionsReceived}/{pot.memberCount} paid
        </span>
      </div>

      {!pot.contributed && pot.state === POT_STATE.FUNDING && (
        <div className="mt-3 text-xs text-amber-600 font-medium bg-amber-50 px-3 py-1.5 rounded-lg inline-block">
          Your contribution is pending
        </div>
      )}
    </button>
  );
}

// ──────────────────────────────────────────────
//  Dashboard
// ──────────────────────────────────────────────

export default function Dashboard() {
  const { factoryAddress } = useWallet();
  const { pots, loading, loadPots } = useFactory();
  const [showSetup, setShowSetup] = useState(!factoryAddress);
  const navigate = useNavigate();

  useEffect(() => {
    if (factoryAddress) {
      loadPots();
    }
  }, [factoryAddress, loadPots]);

  if (showSetup || !factoryAddress) {
    return (
      <div className="max-w-5xl mx-auto px-4 pt-12">
        <FactorySetup onSave={() => setShowSetup(false)} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pt-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Your pots</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your shared expenses
          </p>
        </div>
        <button
          onClick={() => setShowSetup(true)}
          className="text-sm text-slate-400 hover:text-slate-600 transition"
        >
          ⚙ Factory
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">
          Loading your pots...
        </div>
      ) : pots.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🫙</div>
          <p className="text-slate-500 mb-4">
            No pots yet. Create one to get started.
          </p>
          <button
            onClick={() => navigate("/create")}
            className="bg-komon-600 hover:bg-komon-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
          >
            Create your first pot
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pots.map((pot) => (
            <PotCard
              key={pot.address}
              pot={pot}
              onClick={() => navigate(`/pot/${pot.address}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}