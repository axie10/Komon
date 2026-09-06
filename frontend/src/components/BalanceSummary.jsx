import { formatETH } from "../config/constants";
import { useTranslation } from "../context/SettingsContext";

export default function BalanceSummary({ pot, proposals, displayName }) {
  const { t } = useTranslation();

  const executedProposals = proposals.filter((p) => p.state === 2); // EXECUTED
  const totalSpent = executedProposals.reduce(
    (sum, p) => sum + parseFloat(formatETH(p.amount)),
    0
  );

  // Calculate per-member stats
  const memberStats = pot.members.map((address) => {
    const proposed = executedProposals
      .filter((p) => p.proposer.toLowerCase() === address.toLowerCase())
      .reduce((sum, p) => sum + parseFloat(formatETH(p.amount)), 0);

    const received = executedProposals
      .filter((p) => p.recipient.toLowerCase() === address.toLowerCase())
      .reduce((sum, p) => sum + parseFloat(formatETH(p.amount)), 0);

    const contributed = pot.contributed ? parseFloat(formatETH(pot.contributionAmount)) : 0;

    return {
      address,
      contributed,
      proposed,
      received,
    };
  });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-4">
      <h3 className="font-semibold mb-4 dark:text-white">{t("balances.title")}</h3>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t("balances.totalContributed")}</div>
          <div className="font-bold text-sm dark:text-white">{formatETH(pot.contributionAmount * BigInt(pot.memberCount))} ETH</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t("balances.totalSpent")}</div>
          <div className="font-bold text-sm text-red-600 dark:text-red-400">{totalSpent.toFixed(4)} ETH</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t("balances.remaining")}</div>
          <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{formatETH(pot.totalFunds)} ETH</div>
        </div>
      </div>

      {/* Per-member breakdown */}
      <div className="space-y-3">
        {memberStats.map((m, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {displayName(m.address)}
            </span>
            <div className="flex gap-4 text-xs">
              {m.proposed > 0 && (
                <span className="text-slate-500 dark:text-slate-400">
                  {t("balances.proposed")}: {m.proposed.toFixed(4)}
                </span>
              )}
              {m.received > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400">
                  {t("balances.received")}: {m.received.toFixed(4)}
                </span>
              )}
              {m.proposed === 0 && m.received === 0 && (
                <span className="text-slate-400">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
