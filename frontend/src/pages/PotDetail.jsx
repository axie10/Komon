import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useTranslation } from "../context/SettingsContext";
import { usePot } from "../hooks/usePot";
import { useAliases } from "../hooks/useAliases";
import ProgressBar from "../components/ProgressBar";
import Countdown from "../components/Countdown";
import ConfirmModal from "../components/ConfirmModal";
import ActivityFeed from "../components/ActivityFeed";
import BalanceSummary from "../components/BalanceSummary";
import ExpenseChart from "../components/ExpenseChart";
import SettlementSummary from "../components/SettlementSummary";
import CopyButton from "../components/CopyButton";
import { useENS } from "../hooks/useENS";
import {
  POT_STATE, POT_STATE_COLOR, PROPOSAL_STATE, PROPOSAL_STATE_COLOR,
  EXPENSE_TAGS, TAG_EMOJI, shortenAddress, formatETH,
} from "../config/constants";

function ProposalForm({ onSubmit, onCancel, loading, t }) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState("other");
  const inputClass = "border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-komon-500 focus:border-transparent";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-komon-200 dark:border-komon-800 p-6 mb-4">
      <h3 className="font-semibold mb-4 dark:text-white">{t("potDetail.proposalForm")}</h3>
      <div className="space-y-3">
        <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder={t("potDetail.recipient")} className={`w-full ${inputClass} font-mono`} />
        <div className="grid grid-cols-2 gap-3">
          <input type="number" step="0.001" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t("potDetail.amount")} className={inputClass} />
          <select value={tag} onChange={(e) => setTag(e.target.value)} className={`${inputClass} bg-white dark:bg-slate-700`}>
            {EXPENSE_TAGS.map((tg) => <option key={tg.value} value={tg.value}>{tg.emoji} {t(`tags.${tg.value}`)}</option>)}
          </select>
        </div>
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("potDetail.description")} className={`w-full ${inputClass}`} />
        <div className="flex gap-2">
          <button onClick={() => { if (recipient && amount && description) onSubmit({ recipient, amount, description, tag }); }} disabled={loading}
            className="bg-komon-600 hover:bg-komon-700 disabled:bg-slate-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition">
            {loading ? t("potDetail.creatingProposal") : t("potDetail.submitProposal")}
          </button>
          <button onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 px-4 py-2.5 transition">{t("potDetail.cancel")}</button>
        </div>
      </div>
    </div>
  );
}

function ProposalCard({ proposal, potState, memberCount, onVote, onExecute, onCancel, loading, displayName, t }) {
  const canVote = proposal.state === PROPOSAL_STATE.ACTIVE && !proposal.voted && potState === POT_STATE.ACTIVE;
  const canExecute = proposal.state === PROPOSAL_STATE.APPROVED && potState === POT_STATE.ACTIVE;
  const canCancel = proposal.state === PROPOSAL_STATE.APPROVED;
  const quorumNeeded = Math.ceil((memberCount * 2) / 3);
  const proposalLabels = [t("proposalStates.active"), t("proposalStates.approved"), t("proposalStates.executed"), t("proposalStates.rejected")];

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{TAG_EMOJI[proposal.tag] || "📦"}</span>
          <div>
            <span className="font-medium text-sm dark:text-white">{proposal.description}</span>
            <span className="text-xs text-slate-400 ml-2">by {displayName(proposal.proposer)}</span>
          </div>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PROPOSAL_STATE_COLOR[proposal.state]}`}>{proposalLabels[proposal.state]}</span>
      </div>
      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-3">
        <span className="font-medium text-slate-700 dark:text-slate-200">{formatETH(proposal.amount)} ETH</span>
        <span>→ {displayName(proposal.recipient)}</span>
      </div>
      {proposal.state === PROPOSAL_STATE.APPROVED && proposal.cancelVotes > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2.5 py-1 rounded-lg font-medium">
            🚫 {proposal.cancelVotes}/{Math.ceil((memberCount * 2) / 3)} {t("potDetail.cancelVotes")}
          </span>
          {proposal.votedCancel && (
            <span className="text-xs text-slate-400">({t("potDetail.youVotedCancel")})</span>
          )}
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        {canVote && (
          <>
            <button onClick={() => onVote(proposal.id, true)} disabled={loading} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-lg transition">{t("potDetail.approve")}</button>
            <button onClick={() => onVote(proposal.id, false)} disabled={loading} className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium px-3 py-1.5 rounded-lg transition">{t("potDetail.reject")}</button>
          </>
        )}
        {proposal.state === PROPOSAL_STATE.ACTIVE && proposal.voted && <span className="text-xs text-slate-400 py-1.5">{t("potDetail.voted")}</span>}
        {canCancel && !proposal.votedCancel && <button onClick={() => onCancel(proposal.id)} disabled={loading} className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium px-3 py-1.5 rounded-lg transition">{t("potDetail.cancelProposal")}</button>}
        {canExecute && <button onClick={() => onExecute(proposal.id)} disabled={loading} className="bg-komon-600 hover:bg-komon-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition">{t("potDetail.execute")}</button>}
      </div>
    </div>
  );
}

export default function PotDetail() {
  const { address } = useParams();
  const { account } = useWallet();
  const { t } = useTranslation();
  const { displayName } = useAliases();
  const { provider } = useWallet();
  const { resolveMultiple, getENS } = useENS(provider);
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [filter, setFilter] = useState("all");

  const { pot, proposals, loading, actionLoading, loadPot, contribute, createProposal, vote, executeProposal, cancelProposal, cancelPot, emergencyExit, closePot, claimRefund } = usePot(address);

  useEffect(() => { loadPot(); }, [loadPot]);
  useEffect(() => { if (pot?.members) resolveMultiple(pot.members); }, [pot?.members, resolveMultiple]);

  const handleCreateProposal = async (data) => { const ok = await createProposal(data); if (ok) setShowForm(false); };
  const handleCancelProposal = (proposalId) => {
    setConfirmAction({
      title: t("confirm.cancelProposalTitle"),
      message: t("confirm.cancelProposalMsg"),
      confirmLabel: t("confirm.cancelProposalBtn"),
      action: () => cancelProposal(proposalId),
    });
  };

  // Display priority: alias → ENS → shortened address
  const resolveName = useCallback((addr) => {
    const alias = displayName(addr);
    if (alias !== shortenAddress(addr)) return alias;
    const ens = getENS(addr);
    if (ens) return ens;
    return shortenAddress(addr);
  }, [displayName, getENS]);

  if (loading || !pot) return <div className="max-w-5xl mx-auto px-4 pt-12 text-center text-slate-400">{t("potDetail.loading")}</div>;

  const isCreator = account?.toLowerCase() === pot.creator.toLowerCase();
  const deadlineDate = new Date(pot.deadline * 1000);
  const isExpired = Date.now() > pot.deadline * 1000;
  const stateLabels = [t("states.funding"), t("states.active"), t("states.closed"), t("states.cancelled")];
  const isClosed = pot.state === POT_STATE.CLOSED || pot.state === POT_STATE.CANCELLED;

  // Filter proposals
  const filteredProposals = filter === "all"
    ? proposals
    : proposals.filter((p) => p.state === parseInt(filter));

  const filterOptions = [
    { key: "all", label: t("filters.all") },
    { key: "0", label: t("filters.active") },
    { key: "1", label: t("filters.approved") },
    { key: "2", label: t("filters.executed") },
    { key: "3", label: t("filters.rejected") },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 pt-8 pb-16">
      <button onClick={() => navigate("/dashboard")} className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 mb-4 inline-flex items-center gap-1 transition">{t("potDetail.back")}</button>

      {/* Settlement summary — only when closed */}
      {isClosed && <SettlementSummary pot={pot} proposals={proposals} displayName={resolveName} />}

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold dark:text-white">{pot.name}</h2>
            <p className="text-sm text-slate-400 font-mono mt-1">{address.slice(0, 10)}...{address.slice(-8)}</p>
          </div>
          <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${POT_STATE_COLOR[pot.state]}`}>{stateLabels[pot.state]}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t("potDetail.totalFunds"), value: `${formatETH(pot.totalFunds)} ETH` },
            { label: t("potDetail.contribution"), value: `${formatETH(pot.contributionAmount)} ETH` },
            { label: t("potDetail.members"), value: `${pot.contributionsReceived}/${pot.memberCount} ${t("potDetail.paid")}` },
            { label: t("potDetail.deadline"), value: deadlineDate.toLocaleDateString(), extra: pot.state === POT_STATE.FUNDING ? <Countdown deadline={pot.deadline} /> : null },
          ].map((s, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{s.label}</div>
              <div className="font-bold text-lg dark:text-white">{s.value}</div>
              {s.extra}
            </div>
          ))}
        </div>
        {pot.state === POT_STATE.FUNDING && (
          <div className="mt-4"><ProgressBar current={pot.contributionsReceived} total={pot.memberCount} label={t("potDetail.contributions")} color="bg-komon-500" /></div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-4">
        <h3 className="font-semibold mb-4 dark:text-white">{t("potDetail.actions")}</h3>
        <div className="flex flex-wrap gap-2">
          {pot.state === POT_STATE.FUNDING && !pot.contributed && (
            <button onClick={contribute} disabled={actionLoading} className="bg-komon-600 hover:bg-komon-700 disabled:bg-slate-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
              {t("potDetail.contribute")} {formatETH(pot.contributionAmount)} ETH
            </button>
          )}
          {pot.state === POT_STATE.FUNDING && pot.contributed && <span className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 rounded-lg font-medium">{t("potDetail.contributed")}</span>}
          {pot.state === POT_STATE.FUNDING && isExpired && (
            <button onClick={cancelPot} disabled={actionLoading} className="bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition">{t("potDetail.cancelPot")}</button>
          )}
          {pot.state === POT_STATE.ACTIVE && (
            <>
              <button onClick={() => setShowForm(!showForm)} disabled={actionLoading} className="bg-komon-600 hover:bg-komon-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
                {showForm ? t("potDetail.cancel") : t("potDetail.newProposal")}
              </button>
              <button onClick={() => setConfirmAction({ title: t("confirm.emergencyTitle"), message: t("confirm.emergencyMsg"), confirmLabel: t("confirm.emergencyBtn"), action: emergencyExit })} disabled={actionLoading}
                className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition">{t("potDetail.emergencyExit")}</button>
              {isCreator && (
                <button onClick={() => setConfirmAction({ title: t("confirm.closeTitle"), message: t("confirm.closeMsg"), confirmLabel: t("confirm.closeBtn"), action: closePot })} disabled={actionLoading}
                  className="bg-slate-500 hover:bg-slate-600 disabled:bg-slate-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition">{t("potDetail.closePot")}</button>
              )}
            </>
          )}
          {isClosed && !pot.hasClaimed && (
            <button onClick={claimRefund} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition">{t("potDetail.claimRefund")}</button>
          )}
          {isClosed && pot.hasClaimed && (
            <span className="text-sm text-slate-500 bg-slate-50 dark:bg-slate-700 px-4 py-2 rounded-lg">{t("potDetail.refundClaimed")}</span>
          )}
        </div>
      </div>

      {showForm && pot.state === POT_STATE.ACTIVE && <ProposalForm onSubmit={handleCreateProposal} onCancel={() => setShowForm(false)} loading={actionLoading} t={t} />}

      {/* Proposals with filters */}
      {proposals.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-4">
          <div className="mb-4">
            <h3 className="font-semibold dark:text-white mb-3">{t("potDetail.proposals")} ({proposals.length})</h3>
            <div className="flex gap-1.5 flex-wrap">
              {filterOptions.map((f) => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition ${filter === f.key ? "bg-komon-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {filteredProposals.length > 0 ? (
              filteredProposals.map((p) => <ProposalCard key={p.id} proposal={p} potState={pot.state} memberCount={pot.memberCount} onVote={vote} onExecute={executeProposal} onCancel={handleCancelProposal} loading={actionLoading} displayName={resolveName} t={t} />)
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">{t("filters.all")}: 0</p>
            )}
          </div>
        </div>
      )}

      {/* Expense chart */}
      <ExpenseChart proposals={proposals} />

      {/* Balance summary */}
      <BalanceSummary pot={pot} proposals={proposals} displayName={resolveName} />

      {/* Members */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-4">
        <h3 className="font-semibold mb-4 dark:text-white">{t("potDetail.members")} ({pot.memberCount})</h3>
        <div className="space-y-2">
          {pot.members.map((m, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{resolveName(m)}</span>
                {resolveName(m) !== shortenAddress(m) && <span className="text-xs text-slate-400 font-mono">{shortenAddress(m)}</span>}
                <CopyButton text={m} />
              </div>
              <div className="flex items-center gap-2">
                {m.toLowerCase() === pot.creator.toLowerCase() && <span className="text-xs text-komon-600 bg-komon-50 dark:bg-komon-900/30 px-2 py-0.5 rounded">{t("potDetail.creator")}</span>}
                {m.toLowerCase() === account?.toLowerCase() && <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{t("potDetail.you")}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ActivityFeed potAddress={address} />

      {confirmAction && (
        <ConfirmModal title={confirmAction.title} message={confirmAction.message} confirmLabel={confirmAction.confirmLabel}
          onConfirm={() => { confirmAction.action(); setConfirmAction(null); }} onCancel={() => setConfirmAction(null)} />
      )}
    </div>
  );
}
