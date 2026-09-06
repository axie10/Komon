import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";

const FEATURES = [
  {
    icon: "🏦",
    title: "Shared treasury",
    desc: "Everyone contributes equally. Funds are locked in the contract until the group decides.",
  },
  {
    icon: "🗳️",
    title: "2/3 majority voting",
    desc: "Every expense needs a qualified majority. No single person can move funds alone.",
  },
  {
    icon: "📜",
    title: "On-chain receipts",
    desc: "Every approved expense is recorded immutably. Full transparency, no arguments.",
  },
];

export default function Landing() {
  const { connect, isConnected } = useWallet();
  const navigate = useNavigate();

  const handleConnect = async () => {
    await connect();
    navigate("/dashboard");
  };

  useEffect(() => {
    if (isConnected) navigate("/dashboard");
  }, [isConnected, navigate]);

  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
      <div className="max-w-xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-5">
          Group expenses,
          <br />
          zero trust issues.
        </h1>
        <p className="text-lg text-slate-500 mb-8 leading-relaxed">
          Komon is a shared pot where no one controls the funds. Every expense is
          proposed, voted, and executed on-chain. Split trips, rent, gifts — with
          math, not promises.
        </p>
        <button
          onClick={handleConnect}
          className="bg-komon-600 hover:bg-komon-700 text-white font-semibold px-6 py-3 rounded-xl transition text-base"
        >
          Connect wallet to start
        </button>
      </div>

      <div className="mt-20 grid md:grid-cols-3 gap-6">
        {FEATURES.map((f, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-6 border border-slate-200"
          >
            <div className="text-2xl mb-3">{f.icon}</div>
            <h3 className="font-semibold mb-1.5">{f.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}