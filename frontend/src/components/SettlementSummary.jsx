import { useTranslation } from "../context/SettingsContext";
import { formatETH, TAG_EMOJI } from "../config/constants";

export default function SettlementSummary({ pot, proposals, displayName }) {
  const { t } = useTranslation();

  const executed = proposals.filter((p) => p.state === 2);
  const totalContributed = pot.contributionAmount * BigInt(pot.memberCount);
  const totalSpentBigInt = executed.reduce((sum, p) => sum + p.amount, BigInt(0));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-komon-200 dark:border-komon-800 p-6 mb-4">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xl">📊</span>
        <h3 className="font-bold text-lg dark:text-white">{t("settlement.title")}</h3>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t("settlement.contributed")}</div>
          <div className="font-bold dark:text-white">{formatETH(totalContributed)} ETH</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t("settlement.spent")}</div>
          <div className="font-bold text-red-600 dark:text-red-400">{formatETH(totalSpentBigInt)} ETH</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t("settlement.remaining")}</div>
          <div className="font-bold text-emerald-600 dark:text-emerald-400">{formatETH(pot.totalFunds)} ETH</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t("settlement.refundEach")}</div>
          <div className="font-bold text-komon-600 dark:text-komon-400">
            {pot.memberCount > 0 ? formatETH(pot.totalFunds / BigInt(pot.memberCount)) : "0"} ETH
          </div>
        </div>
      </div>

      {/* Executed expenses list */}
      {executed.length > 0 && (
        <>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            {t("settlement.expenses")} ({executed.length})
          </h4>
          <div className="space-y-2">
            {executed.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <div className="flex items-center gap-2">
                  <span>{TAG_EMOJI[p.tag] || "📦"}</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{p.description}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">→ {displayName(p.recipient)}</span>
                  <span className="text-sm font-medium dark:text-white">{formatETH(p.amount)} ETH</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {executed.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-2">
          {t("settlement.noExpenses")}
        </p>
      )}
    </div>
  );
}
