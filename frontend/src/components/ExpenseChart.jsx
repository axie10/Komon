import { useTranslation } from "../context/SettingsContext";
import { TAG_EMOJI } from "../config/constants";

const CATEGORY_COLORS = {
  food: "bg-orange-400",
  transport: "bg-blue-400",
  accommodation: "bg-purple-400",
  party: "bg-pink-400",
  shopping: "bg-amber-400",
  other: "bg-slate-400",
};

export default function ExpenseChart({ proposals }) {
  const { t } = useTranslation();

  const executed = proposals.filter((p) => p.state === 2);

  if (executed.length === 0) return null;

  // Group by tag and sum amounts
  const byCategory = {};
  let total = 0;

  executed.forEach((p) => {
    const amount = Number(p.amount) / 1e18;
    const tag = p.tag || "other";
    byCategory[tag] = (byCategory[tag] || 0) + amount;
    total += amount;
  });

  // Sort by amount descending
  const categories = Object.entries(byCategory)
    .map(([tag, amount]) => ({
      tag,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-4">
      <h3 className="font-semibold mb-4 dark:text-white">{t("chart.title")}</h3>

      {/* Stacked bar */}
      <div className="w-full h-4 rounded-full overflow-hidden flex mb-5">
        {categories.map((cat) => (
          <div
            key={cat.tag}
            className={`h-full ${CATEGORY_COLORS[cat.tag] || CATEGORY_COLORS.other}`}
            style={{ width: `${cat.percentage}%` }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="space-y-2.5">
        {categories.map((cat) => (
          <div key={cat.tag} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[cat.tag] || CATEGORY_COLORS.other}`} />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {TAG_EMOJI[cat.tag] || "📦"} {t(`tags.${cat.tag}`)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium dark:text-white">
                {cat.amount.toFixed(4)} ETH
              </span>
              <span className="text-xs text-slate-400 w-12 text-right">
                {cat.percentage.toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
