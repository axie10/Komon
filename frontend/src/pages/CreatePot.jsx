import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useFactory } from "../hooks/useFactory";
import { useAliases } from "../hooks/useAliases";
import { ZERO_ADDRESS } from "../config/constants";

const CURRENCY_OPTIONS = [
  { value: "ETH", label: "ETH", address: ZERO_ADDRESS },
  { value: "USDC", label: "USDC (paste address)", address: "" },
  { value: "USDT", label: "USDT (paste address)", address: "" },
];

export default function CreatePot() {
  const { account, showToast } = useWallet();
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

  const removeMember = (index) => {
    if (members.length <= 2) return;
    setMembers(members.filter((_, i) => i !== index));
  };

  const updateMember = (index, field, value) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  const handleSubmit = async () => {
    const validMembers = members.filter((m) => m.address.trim().length === 42);

    if (!name.trim()) {
      showToast("Enter a pot name.", "error");
      return;
    }
    if (validMembers.length < 2) {
      showToast("Add at least 2 valid member addresses.", "error");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      showToast("Enter a valid contribution amount.", "error");
      return;
    }
    if (!deadlineDays || parseInt(deadlineDays) <= 0) {
      showToast("Enter a valid deadline.", "error");
      return;
    }

    const resolvedToken = currency === "ETH" ? ZERO_ADDRESS : tokenAddress;

    if (currency !== "ETH" && (!tokenAddress || tokenAddress.length < 42)) {
      showToast("Paste a valid token contract address.", "error");
      return;
    }

    setLoading(true);
    const success = await createPot({
      name,
      token: resolvedToken,
      members: validMembers.map((m) => m.address),
      amount,
      deadlineDays,
      isETH: currency === "ETH",
    });

    if (success) {
      // Save aliases for members that have one
      const aliasEntries = validMembers
        .filter((m) => m.alias.trim())
        .map((m) => ({ address: m.address, name: m.alias }));
      if (aliasEntries.length > 0) {
        setMultipleAliases(aliasEntries);
      }
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pt-8 pb-16">
      <button
        onClick={() => navigate("/dashboard")}
        className="text-sm text-slate-500 hover:text-slate-700 mb-4 inline-flex items-center gap-1 transition"
      >
        ← Back
      </button>

      <div className="max-w-lg">
        <h2 className="text-2xl font-bold mb-1">Create a pot</h2>
        <p className="text-sm text-slate-500 mb-8">
          Set up a shared pot for your group.
        </p>

        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Pot name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Trip to Berlin"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-komon-500 focus:border-transparent"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                if (e.target.value === "ETH") setTokenAddress("");
              }}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-komon-500 focus:border-transparent bg-white"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            {currency !== "ETH" && (
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder={`${currency} contract address (0x...)`}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-mono mt-2 focus:outline-none focus:ring-2 focus:ring-komon-500 focus:border-transparent"
              />
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Contribution per member ({currency})
            </label>
            <input
              type="number"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.1"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-komon-500 focus:border-transparent"
            />
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Deadline (days from now)
            </label>
            <input
              type="number"
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(e.target.value)}
              placeholder="7"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-komon-500 focus:border-transparent"
            />
          </div>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Members
              </label>
              <button
                onClick={addMember}
                className="text-xs text-komon-600 hover:text-komon-700 font-medium"
              >
                + Add member
              </button>
            </div>

            <div className="space-y-3">
              {members.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={m.alias}
                    onChange={(e) => updateMember(i, "alias", e.target.value)}
                    placeholder="Name"
                    className="w-28 border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-komon-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={m.address}
                    onChange={(e) => updateMember(i, "address", e.target.value)}
                    placeholder="0x..."
                    className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-komon-500 focus:border-transparent"
                  />
                  {members.length > 2 && (
                    <button
                      onClick={() => removeMember(i)}
                      className="text-slate-400 hover:text-red-500 px-2 transition"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-400 mt-1.5">
              Include yourself and all group members.
            </p>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-komon-600 hover:bg-komon-700 disabled:bg-slate-300 text-white font-medium py-3 rounded-xl transition text-sm mt-2"
          >
            {loading ? "Creating..." : "Create pot"}
          </button>
        </div>
      </div>
    </div>
  );
}
