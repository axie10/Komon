import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useTranslation } from "../context/SettingsContext";
import { useFactory } from "../hooks/useFactory";
import { useAliases } from "../hooks/useAliases";
import { ZERO_ADDRESS } from "../config/constants";

const CURRENCY_OPTIONS = [
  { value: "ETH", label: "ETH" },
  { value: "USDC", label: "USDC" },
  { value: "USDT", label: "USDT" },
];

export default function CreatePot() {
  const { account, showToast } = useWallet();
  const { t } = useTranslation();
  const { createPot } = useFactory();
  const { setMultipleAliases } = useAliases();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("ETH");
  const [tokenAddress, setTokenAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("7");
  const [members, setMembers] = useState([
    { address: account || "", alias: "Me" },
    { address: "", alias: "" },
  ]);
  const [loading, setLoading] = useState(false);

  const addMember = () => setMembers([...members, { address: "", alias: "" }]);
  const removeMember = (i) => { if (members.length > 2) setMembers(members.filter((_, j) => j !== i)); };
  const updateMember = (i, field, value) => { const u = [...members]; u[i] = { ...u[i], [field]: value }; setMembers(u); };

  const handleSubmit = async () => {
    const valid = members.filter((m) => m.address.trim().length === 42);
    if (!name.trim()) { showToast(t("toast.invalidName"), "error"); return; }
    if (valid.length < 2) { showToast(t("toast.invalidMembers"), "error"); return; }
    if (!amount || parseFloat(amount) <= 0) { showToast(t("toast.invalidAmount"), "error"); return; }
    if (!deadlineDays || parseInt(deadlineDays) <= 0) { showToast(t("toast.invalidDeadline"), "error"); return; }
    const resolvedToken = currency === "ETH" ? ZERO_ADDRESS : tokenAddress;
    if (currency !== "ETH" && (!tokenAddress || tokenAddress.length < 42)) { showToast(t("toast.invalidToken"), "error"); return; }

    setLoading(true);
    const success = await createPot({ name, token: resolvedToken, members: valid.map((m) => m.address), amount, deadlineDays, isETH: currency === "ETH" });
    if (success) {
      const entries = valid.filter((m) => m.alias.trim()).map((m) => ({ address: m.address, name: m.alias }));
      if (entries.length > 0) setMultipleAliases(entries);
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const inputClass = "w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-komon-500 focus:border-transparent";

  return (
    <div className="max-w-5xl mx-auto px-4 pt-8 pb-16">
      <button onClick={() => navigate("/dashboard")} className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 mb-4 inline-flex items-center gap-1 transition">
        {t("createPot.back")}
      </button>
      <div className="max-w-lg">
        <h2 className="text-2xl font-bold mb-1 dark:text-white">{t("createPot.title")}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t("createPot.subtitle")}</p>

        {/* Templates */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { emoji: "✈️", label: t("templates.trip"), name: "", amount: "0.5", days: "14" },
            { emoji: "🏠", label: t("templates.rent"), name: "", amount: "1", days: "30" },
            { emoji: "🎁", label: t("templates.gift"), name: "", amount: "0.05", days: "7" },
            { emoji: "🎉", label: t("templates.event"), name: "", amount: "0.1", days: "3" },
          ].map((tpl, i) => (
            <button
              key={i}
              onClick={() => { setAmount(tpl.amount); setDeadlineDays(tpl.days); }}
              className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg transition"
            >
              <span>{tpl.emoji}</span>
              <span>{tpl.label}</span>
            </button>
          ))}
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("createPot.name")}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("createPot.namePlaceholder")} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("createPot.currency")}</label>
            <select value={currency} onChange={(e) => { setCurrency(e.target.value); if (e.target.value === "ETH") setTokenAddress(""); }} className={`${inputClass} bg-white dark:bg-slate-700`}>
              {CURRENCY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            {currency !== "ETH" && (
              <input type="text" value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)}
                placeholder={`${currency} ${t("createPot.tokenPlaceholder")}`} className={`${inputClass} font-mono mt-2`} />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("createPot.contribution")} ({currency})</label>
            <input type="number" step="0.001" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.1" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("createPot.deadline")}</label>
            <input type="number" value={deadlineDays} onChange={(e) => setDeadlineDays(e.target.value)} placeholder="7" className={inputClass} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t("createPot.members")}</label>
              <button onClick={addMember} className="text-xs text-komon-600 hover:text-komon-700 font-medium">{t("createPot.addMember")}</button>
            </div>
            <div className="space-y-3">
              {members.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <input type="text" value={m.alias} onChange={(e) => updateMember(i, "alias", e.target.value)}
                    placeholder={t("createPot.aliasPlaceholder")} className="w-28 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-komon-500 focus:border-transparent" />
                  <input type="text" value={m.address} onChange={(e) => updateMember(i, "address", e.target.value)}
                    placeholder={t("createPot.addressPlaceholder")} className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-komon-500 focus:border-transparent" />
                  {members.length > 2 && <button onClick={() => removeMember(i)} className="text-slate-400 hover:text-red-500 px-2 transition">✕</button>}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1.5">{t("createPot.memberHint")}</p>
          </div>
          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-komon-600 hover:bg-komon-700 disabled:bg-slate-300 text-white font-medium py-3 rounded-xl transition text-sm mt-2">
            {loading ? t("createPot.creating") : t("createPot.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
