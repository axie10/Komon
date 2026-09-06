import { useState, useCallback } from "react";
import { Contract, parseEther, ZeroAddress } from "ethers";
import { useWallet } from "../context/WalletContext";
import { FACTORY_ABI } from "../config/abis";
import { POT_ABI } from "../config/abis";

export function useFactory() {
  const { provider, signer, account, factoryAddress, showToast } = useWallet();
  const [pots, setPots] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── Read: load user's pots ────────────────

  const loadPots = useCallback(async () => {
    if (!factoryAddress || !provider || !account) return;

    setLoading(true);
    try {
      const factory = new Contract(factoryAddress, FACTORY_ABI, provider);
      const addresses = await factory.getPotsByMember(account);

      const potData = await Promise.all(
        addresses.map(async (addr) => {
          const pot = new Contract(addr, POT_ABI, provider);

          const [
            name,
            state,
            totalFunds,
            contributionAmount,
            memberCount,
            deadline,
            contributed,
            contributionsReceived,
            proposalCount,
          ] = await Promise.all([
            pot.name(),
            pot.state(),
            pot.totalFunds(),
            pot.contributionAmount(),
            pot.getMemberCount(),
            pot.deadline(),
            pot.hasContributed(account),
            pot.contributionsReceived(),
            pot.proposalCount(),
          ]);

          // Count pending votes (active proposals where user hasn't voted)
          let pendingVotes = 0;
          const pCount = Number(proposalCount);
          const potState = Number(state);

          if (potState === 1 && pCount > 0) {
            // Only check ACTIVE pots
            for (let i = 0; i < pCount; i++) {
              const [, , , , , , , pState] = await pot.getProposal(i);
              if (Number(pState) === 0) {
                // Proposal is ACTIVE
                const voted = await pot.hasVotedOnProposal(i, account);
                if (!voted) pendingVotes++;
              }
            }
          }

          return {
            address: addr,
            name,
            state: potState,
            totalFunds,
            contributionAmount,
            memberCount: Number(memberCount),
            deadline: Number(deadline),
            contributed,
            contributionsReceived: Number(contributionsReceived),
            pendingVotes,
          };
        })
      );

      setPots(potData);
    } catch (err) {
      console.error("Failed to load pots:", err);
      showToast("Could not load pots. Check factory address.", "error");
    }
    setLoading(false);
  }, [factoryAddress, provider, account, showToast]);

  // ── Write: create a new pot ───────────────

  const createPot = useCallback(
    async ({ name, token = ZeroAddress, members, amount, deadlineDays, isETH = true }) => {
      if (!signer || !factoryAddress) return;

      try {
        const factory = new Contract(factoryAddress, FACTORY_ABI, signer);
        const deadline =
          Math.floor(Date.now() / 1000) + parseInt(deadlineDays) * 86400;

        // ETH uses 18 decimals (parseEther), USDC/USDT use 6
        const parsedAmount = isETH
          ? parseEther(amount)
          : BigInt(Math.round(parseFloat(amount) * 1e6));

        showToast("Creating pot... confirm in your wallet.", "info");

        const tx = await factory.createPot(
          name,
          token,
          members,
          parsedAmount,
          deadline
        );

        showToast("Transaction sent. Waiting for confirmation...", "info");
        await tx.wait();
        showToast("Pot created!", "success");

        return true;
      } catch (err) {
        console.error("Create pot failed:", err);
        showToast(err.reason || "Failed to create pot.", "error");
        return false;
      }
    },
    [signer, factoryAddress, showToast]
  );

  return { pots, loading, loadPots, createPot };
}
