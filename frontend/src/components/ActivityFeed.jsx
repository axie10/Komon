import { useState, useEffect } from "react";
import { Contract } from "ethers";
import { useWallet } from "../context/WalletContext";
import { useTranslation } from "../context/SettingsContext";
import { useAliases } from "../hooks/useAliases";
import { formatETH } from "../config/constants";

const EVENT_ABI = [
  "event ContributionReceived(address indexed member, uint256 amount)",
  "event PotActivated(uint256 totalFunds)",
  "event ProposalCreated(uint256 indexed proposalId, address indexed proposer, address recipient, uint256 amount, string description, string tag)",
  "event VoteCast(uint256 indexed proposalId, address indexed voter, bool inFavor)",
  "event ProposalExecuted(uint256 indexed proposalId, address indexed recipient, uint256 amount, string tag)",
  "event ProposalRejected(uint256 indexed proposalId)",
  "event EmergencyExitVote(address indexed voter)",
  "event EmergencyExitTriggered()",
  "event PotCancelled()",
  "event PotClosed()",
  "event RefundClaimed(address indexed member, uint256 amount)",
];

function formatEvent(event, displayName, t) {
  const { eventName, args } = event;

  switch (eventName) {
    case "ContributionReceived":
      return { icon: "💰", text: `${displayName(args[0])} ${t("activity.contributed")} ${formatETH(args[1])} ETH` };
    case "PotActivated":
      return { icon: "✅", text: `${t("activity.activated")} ${formatETH(args[0])} ETH` };
    case "ProposalCreated":
      return { icon: "📋", text: `${displayName(args[1])} ${t("activity.proposed")} ${args[4]}` };
    case "VoteCast":
      return { icon: args[2] ? "👍" : "👎", text: `${displayName(args[1])} ${args[2] ? t("activity.votedYes") : t("activity.votedNo")} #${args[0].toString()}` };
    case "ProposalExecuted":
      return { icon: "🚀", text: `#${args[0].toString()} ${t("activity.executed")} ${formatETH(args[2])} ETH` };
    case "ProposalRejected":
      return { icon: "❌", text: `#${args[0].toString()} ${t("activity.rejected")}` };
    case "EmergencyExitVote":
      return { icon: "🚨", text: `${displayName(args[0])} ${t("activity.emergencyVote")}` };
    case "EmergencyExitTriggered":
      return { icon: "🛑", text: t("activity.emergencyTriggered") };
    case "PotCancelled":
      return { icon: "🚫", text: t("activity.cancelled") };
    case "PotClosed":
      return { icon: "🔒", text: t("activity.closed") };
    case "RefundClaimed":
      return { icon: "💸", text: `${displayName(args[0])} ${t("activity.refundClaimed")} ${formatETH(args[1])} ETH` };
    default:
      return { icon: "📝", text: eventName };
  }
}

export default function ActivityFeed({ potAddress }) {
  const { provider } = useWallet();
  const { t } = useTranslation();
  const { displayName } = useAliases();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(5);

  const showMore = () => setVisible((prev) => prev + 5);

  useEffect(() => {
    if (!potAddress || !provider) return;

    const loadEvents = async () => {
      try {
        const contract = new Contract(potAddress, EVENT_ABI, provider);
        const filter = { address: potAddress, fromBlock: 0, toBlock: "latest" };
        const logs = await provider.getLogs(filter);

        const parsed = logs
          .map((log) => {
            try {
              const event = contract.interface.parseLog(log);
              return {
                eventName: event.name,
                args: event.args,
                blockNumber: log.blockNumber,
              };
            } catch {
              return null;
            }
          })
          .filter(Boolean)
          .reverse();

        setEvents(parsed);
      } catch (err) {
        console.error("Failed to load events:", err);
      }
      setLoading(false);
    };

    loadEvents();
  }, [potAddress, provider]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="font-semibold mb-4 dark:text-white">{t("activity.title")}</h3>
        <div className="text-sm text-slate-400">{t("activity.loading")}</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="font-semibold mb-4 dark:text-white">{t("activity.title")}</h3>
        <div className="text-sm text-slate-400">{t("activity.empty")}</div>
      </div>
    );
  }

  const visibleEvents = events.slice(0, visible);
  const hasMore = visible < events.length;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="font-semibold mb-4 dark:text-white">{t("activity.title")} ({events.length})</h3>
      <div className="space-y-3">
        {visibleEvents.map((event, i) => {
          const { icon, text } = formatEvent(event, displayName, t);
          return (
            <div key={i} className="flex items-start gap-3 py-1.5">
              <span className="text-base mt-0.5">{icon}</span>
              <span className="text-sm text-slate-600 dark:text-slate-300">{text}</span>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={showMore}
          className="w-full mt-4 text-sm text-komon-600 dark:text-komon-400 hover:text-komon-700 dark:hover:text-komon-300 font-medium py-2 transition"
        >
          {t("activity.showMore")} ({events.length - visible})
        </button>
      )}
    </div>
  );
}