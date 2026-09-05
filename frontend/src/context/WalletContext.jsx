import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { BrowserProvider } from "ethers";

// ──────────────────────────────────────────────
//  Context
// ──────────────────────────────────────────────

const WalletContext = createContext(null);

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

// ──────────────────────────────────────────────
//  Provider
// ──────────────────────────────────────────────

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [factoryAddress, setFactoryAddress] = useState(
    () => localStorage.getItem("komon_factory") || ""
  );
  const [toast, setToast] = useState(null);

  // ── Toast ──────────────────────────────────

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  // ── Factory persistence ────────────────────

  const saveFactoryAddress = useCallback((address) => {
    setFactoryAddress(address);
    try {
      localStorage.setItem("komon_factory", address);
    } catch (e) {
      // localStorage unavailable — address lives in state only
    }
  }, []);

  // ── Wallet connection ──────────────────────

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      showToast("Install MetaMask to continue.", "error");
      return;
    }

    try {
      const browserProvider = new BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      const walletSigner = await browserProvider.getSigner();

      setProvider(browserProvider);
      setSigner(walletSigner);
      setAccount(accounts[0]);
      showToast("Wallet connected!", "success");
    } catch (err) {
      console.error("Connection failed:", err);
      showToast("Connection rejected.", "error");
    }
  }, [showToast]);

  const disconnect = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
  }, []);

  // ── Wallet events ─────────────────────────

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAccount(accounts[0]);
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [disconnect]);

  // ── Auto-reconnect ────────────────────────

  useEffect(() => {
    if (!window.ethereum) return;

    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        if (accounts.length > 0) {
          connect();
        }
      })
      .catch(console.error);
  }, [connect]);

  // ── Context value ─────────────────────────

  const value = {
    // Wallet
    account,
    provider,
    signer,
    isConnected: !!account,
    connect,
    disconnect,

    // Factory
    factoryAddress,
    setFactoryAddress: saveFactoryAddress,

    // Toast
    toast,
    showToast,
    clearToast,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}