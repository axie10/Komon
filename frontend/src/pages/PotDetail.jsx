import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { formatEther } from "ethers";
import { useWallet } from "../context/WalletContext";
import { usePot } from "../hooks/usePot";
import { useAliases } from "../hooks/useAliases";
import ProgressBar from "../components/ProgressBar";
import Countdown from "../components/Countdown";
import ConfirmModal from "../components/ConfirmModal";
import ActivityFeed from "../components/ActivityFeed";
import {
  POT_STATE,
  POT_STATE_LABEL,
  POT_STATE_COLOR,
  PROPOSAL_STATE,
  PROPOSAL_STATE_LABEL,
  PROPOSAL_STATE_COLOR,
  EXPENSE_TAGS,
  TAG_EMOJI,
  shortenAddress,
} from "../config/constants";

// ──────────────────────────────────────────────
//  Proposal Form
// ──────────────────────────────────────────────

function ProposalForm({ onSubmit, onCancel, loading }) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState("other");

  const handleSubmit = () => {
    if (!recipient || !amount || !description) return;
    onSubmit({ recipient, amount, description, tag });
  };

  return (
    <div className="bg-white rounded-2xl border border-komon-200 p-6 mb-4">
      <h3 className="font-semibold mb-4">New proposal</h3>
      <div className="space-y-3">
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Recipient address (0x...)"
          className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-komon-500 focus:border-transparent"
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            step="0.001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (ETH)"
            className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-komon-500 focus:border-transparent"
          />
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-komon-500 focus:border-transparent bg-white"
          >
            {EXPENSE_TAGS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.emoji} {t.label}
              </option>
            ))}
          </select>
        </div>

        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (e.g. Dinner at the Italian place)"
          className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-komon-500 focus:border-transparent"
        />

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-komon-600 hover:bg-komon-700 disabled:bg-slate-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
          >
            {loading ? "Creating..." : "Submit proposal"}
          </button>
          <button
            onClick={onCancel}
            className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2.5 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
//  Proposal Card
// ──────────────────────────────────────────────

function ProposalCard({ proposal, potState, memberCount, onVote, onExecute, loading, displayName }) {
  const canVote =
    proposal.state === PROPOSAL_STATE.ACTIVE &&
    !proposal.voted &&
    potState === POT_STATE.ACTIVE;

  const canExecute = proposal.state === PROPOSAL_STATE.APPROVED;
  const quorumNeeded = Math.ceil((memberCount * 2) / 3);

  return (
    <div className="border border-slate-200 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{TAG_EMOJI[proposal.tag] || "📦"}</span>
          <div>
            <span className="font-medium text-sm">{proposal.description}</span>
            <span className="text-xs text-slate-400 ml-2">
              by {displayName(proposal.proposer)}
            </span>
          </div>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${PROPOSAL_STATE_COLOR[proposal.state]}`}
        >
          {PROPOSAL_STATE_LABEL[proposal.state]}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
        <span className="font-medium text-slate-700">
          {formatEther(proposal.amount)} ETH
        </span>
        <span>→ {displayName(proposal.recipient)}</span>
      </div>

      {/* Voting progress bar */}
      {proposal.state === PROPOSAL_STATE.ACTIVE && (
        <div className="mb-3">
          <ProgressBar
            current={proposal.votesFor}
            total={quorumNeeded}
            label={`Votes needed: ${quorumNeeded}`}
            color="bg-emerald-500"
          />
          <div className="flex gap-3 mt-1 text-xs">
            <span className="text-emerald-600">✓ {proposal.votesFor} for</span>
            <span className="text-red-500">✕ {proposal.votesAgainst} against</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        {canVote && (
          <>
            <button
              onClick={() => onVote(proposal.id, true)}
              disabled={loading}
              className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-lg transition"
            >
              Approve
            </button>
            <button
              onClick={() => onVote(proposal.id, false)}
              disabled={loading}
              className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium px-3 py-1.5 rounded-lg transition"
            >
              Reject
            </button>
          </>
        )}

        {proposal.state === PROPOSAL_STATE.ACTIVE && proposal.voted && (
          <span className="text-xs text-slate-400 py-1.5">Voted</span>
        )}

        {canExecute && (
          <button
            onClick={() => onExecute(proposal.id)}
            disabled={loading}
            className="bg-komon-600 hover:bg-komon-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
          >
            Execute
          </button>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
//  PotDetail Page
// ──────────────────────────────────────────────

export default function PotDetail() {
  const { address } = useParams();
  const { account } = useWallet();
  const { displayName } = useAliases();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const {
    pot,
    proposals,
    loading,
    actionLoading,
    loadPot,
    contribute,
    createProposal,
    vote,
    executeProposal,
    cancelPot,
    emergencyExit,
    closePot,
    claimRefund,
  } = usePot(address);

  useEffect(() => {
    loadPot();
  }, [loadPot]);

  const handleCreateProposal = async (data) => {
    const success = await createProposal(data);
    if (success) setShowForm(false);
  };

  if (loading || !pot) {
    return (
      <div className="max-w-5xl mx-auto px-4 pt-12 text-center text-slate-400">
        Loading pot...
      </div>
    );
  }

  const isCreator = account?.toLowerCase() === pot.creator.toLowerCase();
  const deadlineDate = new Date(pot.deadline * 1000);
  const isExpired = Date.now() > pot.deadline * 1000;

  return (
    <div className="max-w-5xl mx-auto px-4 pt-8 pb-16">
      <button
        onClick={() => navigate("/dashboard")}
        className="text-sm text-slate-500 hover:text-slate-700 mb-4 inline-flex items-center gap-1 transition"
      >
        ← Back
      </button>

      {/* ── Pot Header ──────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">{pot.name}</h2>
            <p className="text-sm text-slate-400 font-mono mt-1">
              {address.slice(0, 10)}...{address.slice(-8)}
            </p>
          </div>
          <span
            className={`text-sm font-medium px-3 py-1.5 rounded-full ${POT_STATE_COLOR[pot.state]}`}
          >
            {POT_STATE_LABEL[pot.state]}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">Total funds</div>
            <div className="font-bold text-lg">
              {formatEther(pot.totalFunds)} ETH
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">Contribution</div>
            <div className="font-bold text-lg">
              {formatEther(pot.contributionAmount)} ETH
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">Members</div>
            <div className="font-bold text-lg">
              {pot.contributionsReceived}/{pot.memberCount} paid
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">Deadline</div>
            <div className="font-bold text-sm">
              {deadlineDate.toLocaleDateString()}
            </div>
            {pot.state === POT_STATE.FUNDING && (
              <Countdown deadline={pot.deadline} />
            )}
          </div>
        </div>

        {/* Contribution progress bar */}
        {pot.state === POT_STATE.FUNDING && (
          <div className="mt-4">
            <ProgressBar
              current={pot.contributionsReceived}
              total={pot.memberCount}
              label="Contributions"
              color="bg-komon-500"
            />
          </div>
        )}
      </div>

      {/* ── Actions ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
        <h3 className="font-semibold mb-4">Actions</h3>
        <div className="flex flex-wrap gap-2">
          {/* FUNDING state */}
          {pot.state === POT_STATE.FUNDING && !pot.contributed && (
            <button
              onClick={contribute}
              disabled={actionLoading}
              className="bg-komon-600 hover:bg-komon-700 disabled:bg-slate-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              Contribute {formatEther(pot.contributionAmount)} ETH
            </button>
          )}
          {pot.state === POT_STATE.FUNDING && pot.contributed && (
            <span className="text-sm text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg font-medium">
              ✓ You've contributed
            </span>
          )}
          {pot.state === POT_STATE.FUNDING && isExpired && (
            <button
              onClick={cancelPot}
              disabled={actionLoading}
              className="bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              Cancel pot (deadline passed)
            </button>
          )}

          {/* ACTIVE state */}
          {pot.state === POT_STATE.ACTIVE && (
            <>
              <button
                onClick={() => setShowForm(!showForm)}
                disabled={actionLoading}
                className="bg-komon-600 hover:bg-komon-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                {showForm ? "Cancel" : "New proposal"}
              </button>
              <button
                onClick={() => setConfirmAction({
                  title: "Emergency exit",
                  message: "You're voting to close this pot early. If 2/3 of members vote, the pot will close and remaining funds will be split equally.",
                  confirmLabel: "Vote to exit",
                  action: emergencyExit,
                })}
                disabled={actionLoading}
                className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                Emergency exit
              </button>
              {isCreator && (
                <button
                  onClick={() => setConfirmAction({
                    title: "Close pot",
                    message: "This will close the pot permanently. Remaining funds will be available for refund to all members.",
                    confirmLabel: "Close pot",
                    action: closePot,
                  })}
                  disabled={actionLoading}
                  className="bg-slate-500 hover:bg-slate-600 disabled:bg-slate-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                >
                  Close pot
                </button>
              )}
            </>
          )}

          {/* CLOSED / CANCELLED state */}
          {(pot.state === POT_STATE.CLOSED ||
            pot.state === POT_STATE.CANCELLED) &&
            !pot.hasClaimed && (
              <button
                onClick={claimRefund}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                Claim refund
              </button>
            )}
          {(pot.state === POT_STATE.CLOSED ||
            pot.state === POT_STATE.CANCELLED) &&
            pot.hasClaimed && (
              <span className="text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-lg">
                ✓ Refund claimed
              </span>
            )}
        </div>
      </div>

      {/* ── New Proposal Form ───────────────── */}
      {showForm && pot.state === POT_STATE.ACTIVE && (
        <ProposalForm
          onSubmit={handleCreateProposal}
          onCancel={() => setShowForm(false)}
          loading={actionLoading}
        />
      )}

      {/* ── Proposals ───────────────────────── */}
      {proposals.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
          <h3 className="font-semibold mb-4">
            Proposals ({proposals.length})
          </h3>
          <div className="space-y-3">
            {proposals.map((p) => (
              <ProposalCard
                key={p.id}
                proposal={p}
                potState={pot.state}
                memberCount={pot.memberCount}
                onVote={vote}
                onExecute={executeProposal}
                loading={actionLoading}
                displayName={displayName}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Members ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
        <h3 className="font-semibold mb-4">Members ({pot.memberCount})</h3>
        <div className="space-y-2">
          {pot.members.map((m, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {displayName(m)}
                </span>
                {displayName(m) !== shortenAddress(m) && (
                  <span className="text-xs text-slate-400 font-mono">
                    {shortenAddress(m)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {m.toLowerCase() === pot.creator.toLowerCase() && (
                  <span className="text-xs text-komon-600 bg-komon-50 px-2 py-0.5 rounded">
                    Creator
                  </span>
                )}
                {m.toLowerCase() === account?.toLowerCase() && (
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    You
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Activity Feed ───────────────────── */}
      <ActivityFeed potAddress={address} />

      {/* ── Confirm Modal ───────────────────── */}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          onConfirm={() => {
            confirmAction.action();
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
