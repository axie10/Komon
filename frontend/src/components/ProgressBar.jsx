export default function ProgressBar({ current, total, label, color = "bg-komon-500" }) {
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500">{label}</span>
          <span className="text-xs font-medium text-slate-700">
            {current}/{total}
          </span>
        </div>
      )}
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
