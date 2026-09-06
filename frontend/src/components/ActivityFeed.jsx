import { useState, useEffect } from "react";
import { Contract, formatEther } from "ethers";
import { useWallet } from "../context/WalletContext";
import { useAliases } from "../hooks/useAliases";

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

const TAG_EMOJI = {
  food: "🍕", transport: "🚕", accommodation: "🏨",
  party: "🎉", shopping: "🛍", other: "📦",
};

function formatEvent(event, displayName) {
  const { eventName, args } = event;

  switch (eventName) {
    case "ContributionReceived":
      return { icon: "💰", text: `${displayName(args[0])} contributed ${formatEther(args[1])} ETH` };
    case "PotActivated":
      return { icon: "✅", text: `Pot activated with ${formatEther(args[0])} ETH` };
    case "ProposalCreated":
      return { icon: TAG_EMOJI[args[5]] || "📋", text: `${displayName(args[1])} proposed: ${args[4]}` };
    case "VoteCast":
      return { icon: args[2] ? "👍" : "👎", text: `${displayName(args[1])} voted ${args[2] ? "yes" : "no"} on proposal #${args[0].toString()}` };
    case "ProposalExecuted":
      return { icon: "🚀", text: `Proposal #${args[0].toString()} executed — ${formatEther(args[2])} ETH sent` };
    case "ProposalRejected":
      return { icon: "❌", text: `Proposal #${args[0].toString()} rejected` };
    case "EmergencyExitVote":
      return { icon: "🚨", text: `${displayName(args[0])} voted for emergency exit` };
    case "EmergencyExitTriggered":
      return { icon: "🛑", text: "Emergency exit triggered — pot closed" };
    case "PotCancelled":
      return { icon: "🚫", text: "Pot cancelled — deadline passed" };
    case "PotClosed":
      return { icon: "🔒", text: "Pot closed by creator" };
    case "RefundClaimed":
      return { icon: "💸", text: `${displayName(args[0])} claimed ${formatEther(args[1])} ETH refund` };
    default:
      return { icon: "📝", text: eventName };
  }
}

export default function ActivityFeed({ potAddress }) {
  const { provider } = useWallet();
  const { displayName } = useAliases();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

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
          .reverse(); // Most recent first

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
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-semibold mb-4">Activity</h3>
        <div className="text-sm text-slate-400">Loading activity...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-semibold mb-4">Activity</h3>
        <div className="text-sm text-slate-400">No activity yet.</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="font-semibold mb-4">Activity ({events.length})</h3>
      <div className="space-y-3">
        {events.map((event, i) => {
          const { icon, text } = formatEvent(event, displayName);
          return (
            <div key={i} className="flex items-start gap-3 py-1.5">
              <span className="text-base mt-0.5">{icon}</span>
              <span className="text-sm text-slate-600">{text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}