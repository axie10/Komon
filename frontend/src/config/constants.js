// ──────────────────────────────────────────────
//  Pot States
// ──────────────────────────────────────────────

export const POT_STATE = {
  FUNDING: 0,
  ACTIVE: 1,
  CLOSED: 2,
  CANCELLED: 3,
};

export const POT_STATE_LABEL = {
  [POT_STATE.FUNDING]: "Funding",
  [POT_STATE.ACTIVE]: "Active",
  [POT_STATE.CLOSED]: "Closed",
  [POT_STATE.CANCELLED]: "Cancelled",
};

export const POT_STATE_COLOR = {
  [POT_STATE.FUNDING]: "bg-amber-100 text-amber-700",
  [POT_STATE.ACTIVE]: "bg-emerald-100 text-emerald-700",
  [POT_STATE.CLOSED]: "bg-slate-100 text-slate-600",
  [POT_STATE.CANCELLED]: "bg-red-100 text-red-700",
};

// ──────────────────────────────────────────────
//  Proposal States
// ──────────────────────────────────────────────

export const PROPOSAL_STATE = {
  ACTIVE: 0,
  APPROVED: 1,
  EXECUTED: 2,
  REJECTED: 3,
};

export const PROPOSAL_STATE_LABEL = {
  [PROPOSAL_STATE.ACTIVE]: "Active",
  [PROPOSAL_STATE.APPROVED]: "Approved",
  [PROPOSAL_STATE.EXECUTED]: "Executed",
  [PROPOSAL_STATE.REJECTED]: "Rejected",
};

export const PROPOSAL_STATE_COLOR = {
  [PROPOSAL_STATE.ACTIVE]: "bg-blue-100 text-blue-700",
  [PROPOSAL_STATE.APPROVED]: "bg-emerald-100 text-emerald-700",
  [PROPOSAL_STATE.EXECUTED]: "bg-slate-100 text-slate-600",
  [PROPOSAL_STATE.REJECTED]: "bg-red-100 text-red-700",
};

// ──────────────────────────────────────────────
//  Expense Tags
// ──────────────────────────────────────────────

export const EXPENSE_TAGS = [
  { value: "food", label: "Food", emoji: "🍕" },
  { value: "transport", label: "Transport", emoji: "🚕" },
  { value: "accommodation", label: "Accommodation", emoji: "🏨" },
  { value: "party", label: "Party", emoji: "🎉" },
  { value: "shopping", label: "Shopping", emoji: "🛍" },
  { value: "other", label: "Other", emoji: "📦" },
];

export const TAG_EMOJI = Object.fromEntries(
  EXPENSE_TAGS.map((t) => [t.value, t.emoji])
);

// ──────────────────────────────────────────────
//  Address helpers
// ──────────────────────────────────────────────

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function shortenAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatETH(value) {
  const num = parseFloat(formatEtherRaw(value));
  if (num === 0) return "0";
  if (num >= 1) return num.toFixed(4).replace(/\.?0+$/, "");
  // For small amounts, show up to 6 decimals
  return num.toFixed(6).replace(/\.?0+$/, "");
}

// Re-export for internal use
import { formatEther as formatEtherRaw } from "ethers";

export function formatAmount(wei) {
  const { formatEther } = require("ethers");
  const raw = formatEther(wei);
  const num = parseFloat(raw);

  if (num === 0) return "0";
  if (num >= 1) return num.toFixed(4).replace(/\.?0+$/, "");
  return num.toPrecision(4).replace(/\.?0+$/, "");
}