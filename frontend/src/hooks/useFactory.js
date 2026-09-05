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
          ] = await Promise.all([
            pot.name(),
            pot.state(),
            pot.totalFunds(),
            pot.contributionAmount(),
            pot.getMemberCount(),
            pot.deadline(),
            pot.hasContributed(account),
            pot.contributionsReceived(),
          ]);

          return {
            address: addr,
            name,
            state: Number(state),
            totalFunds,
            contributionAmount,
            memberCount: Number(memberCount),
            deadline: Number(deadline),
            contributed,
            contributionsReceived: Number(contributionsReceived),
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
    async ({ name, members, amount, deadlineDays }) => {
      if (!signer || !factoryAddress) return;

      try {
        const factory = new Contract(factoryAddress, FACTORY_ABI, signer);
        const deadline =
          Math.floor(Date.now() / 1000) + parseInt(deadlineDays) * 86400;

        showToast("Creating pot... confirm in your wallet.", "info");

        const tx = await factory.createPot(
          name,
          ZeroAddress,
          members,
          parseEther(amount),
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