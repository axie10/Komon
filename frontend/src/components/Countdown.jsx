import { useState, useEffect } from "react";

function formatTimeLeft(seconds) {
  if (seconds <= 0) return "Expired";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

export default function Countdown({ deadline }) {
  const [timeLeft, setTimeLeft] = useState(() =>
    Math.max(0, deadline - Math.floor(Date.now() / 1000))
  );

  useEffect(() => {
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, deadline - Math.floor(Date.now() / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [deadline, timeLeft]);

  const isUrgent = timeLeft > 0 && timeLeft < 86400; // Less than 24h
  const isExpired = timeLeft <= 0;

  return (
    <span
      className={`text-xs font-medium ${
        isExpired
          ? "text-red-600"
          : isUrgent
            ? "text-amber-600"
            : "text-slate-500"
      }`}
    >
      {formatTimeLeft(timeLeft)}
    </span>
  );
}
