import { useState, useCallback } from "react";
import { Contract, parseEther } from "ethers";
import { useWallet } from "../context/WalletContext";
import { POT_ABI } from "../config/abis";

export function usePot(potAddress) {
  const { provider, signer, account, showToast } = useWallet();
  const [pot, setPot] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Read: load full pot data ──────────────

  const loadPot = useCallback(async () => {
    if (!potAddress || !provider || !account) return;

    setLoading(true);
    try {
      const contract = new Contract(potAddress, POT_ABI, provider);

      const [
        name,
        creator,
        state,
        totalFunds,
        contributionAmount,
        deadline,
        memberCount,
        contributionsReceived,
        proposalCount,
        contributed,
        members,
        hasClaimed,
      ] = await Promise.all([
        contract.name(),
        contract.creator(),
        contract.state(),
        contract.totalFunds(),
        contract.contributionAmount(),
        contract.deadline(),
        contract.getMemberCount(),
        contract.contributionsReceived(),
        contract.proposalCount(),
        contract.hasContributed(account),
        contract.getMembers(),
        contract.hasClaimedRefund(account),
      ]);

      // Load proposals
      const pCount = Number(proposalCount);
      const loadedProposals = [];

      for (let i = 0; i < pCount; i++) {
        const [
          proposer,
          recipient,
          amount,
          description,
          tag,
          votesFor,
          votesAgainst,
          pState,
        ] = await contract.getProposal(i);

        const voted = await contract.hasVotedOnProposal(i, account);

        // Read the raw proposal struct to get cancelVotes
        const rawProposal = await contract.proposals(i);
        const cancelVotes = Number(rawProposal.cancelVotes);
        const votedCancel = await contract.hasVotedCancelOnProposal(i, account);

        loadedProposals.push({
          id: i,
          proposer,
          recipient,
          amount,
          description,
          tag,
          votesFor: Number(votesFor),
          votesAgainst: Number(votesAgainst),
          state: Number(pState),
          voted,
          cancelVotes,       // ← nuevo
          votedCancel,       // ← nuevo
        });
      }

      setPot({
        address: potAddress,
        name,
        creator,
        state: Number(state),
        totalFunds,
        contributionAmount,
        deadline: Number(deadline),
        memberCount: Number(memberCount),
        contributionsReceived: Number(contributionsReceived),
        contributed,
        members,
        hasClaimed,
      });

      setProposals(loadedProposals);
    } catch (err) {
      console.error("Failed to load pot:", err);
      showToast("Failed to load pot data.", "error");
    }
    setLoading(false);
  }, [potAddress, provider, account, showToast]);

  // ── Write helper ──────────────────────────

  const execAction = useCallback(
    async (label, fn) => {
      if (!signer) return false;

      setActionLoading(true);
      try {
        showToast(`${label}... confirm in your wallet.`, "info");
        const tx = await fn();
        showToast("Waiting for confirmation...", "info");
        await tx.wait();
        showToast(`${label} — confirmed!`, "success");
        await loadPot();
        return true;
      } catch (err) {
        console.error(`${label} failed:`, err);
        showToast(err.reason || `${label} failed.`, "error");
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [signer, showToast, loadPot]
  );

  const getContract = useCallback(
    () => new Contract(potAddress, POT_ABI, signer),
    [potAddress, signer]
  );

  // ── Write: Contributions ──────────────────

  const contribute = useCallback(
    () =>
      execAction("Contributing", () =>
        getContract().contribute({ value: pot.contributionAmount })
      ),
    [execAction, getContract, pot]
  );

  // ── Write: Proposals ──────────────────────

  const createProposal = useCallback(
    ({ recipient, amount, description, tag }) =>
      execAction("Creating proposal", () =>
        getContract().createProposal(
          recipient,
          parseEther(amount),
          description,
          tag
        )
      ),
    [execAction, getContract]
  );

  const vote = useCallback(
    (proposalId, inFavor) =>
      execAction(inFavor ? "Voting yes" : "Voting no", () =>
        getContract().vote(proposalId, inFavor)
      ),
    [execAction, getContract]
  );

  const executeProposal = useCallback(
    (proposalId) =>
      execAction("Executing proposal", () =>
        getContract().executeProposal(proposalId)
      ),
    [execAction, getContract]
  );

  // ── Write: Lifecycle ──────────────────────

  const cancelPot = useCallback(
    () => execAction("Cancelling pot", () => getContract().cancelPot()),
    [execAction, getContract]
  );

  const emergencyExit = useCallback(
    () =>
      execAction("Emergency exit vote", () => getContract().emergencyExit()),
    [execAction, getContract]
  );

  const closePot = useCallback(
    () => execAction("Closing pot", () => getContract().closePot()),
    [execAction, getContract]
  );

  const cancelProposal = useCallback(
    (proposalId) =>
      execAction("Cancelling proposal", () =>
        getContract().cancelProposal(proposalId)
      ),
    [execAction, getContract]
  );

  const claimRefund = useCallback(
    () => execAction("Claiming refund", () => getContract().claimRefund()),
    [execAction, getContract]
  );

  return {
    // State
    pot,
    proposals,
    loading,
    actionLoading,

    // Read
    loadPot,

    // Write
    contribute,
    createProposal,
    vote,
    executeProposal,
    cancelPot,
    cancelProposal,
    emergencyExit,
    closePot,
    claimRefund,
  };
}