import { useState, useCallback } from "react";

const STORAGE_KEY = "komon_aliases";

function loadAliases() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function persistAliases(aliases) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(aliases));
  } catch {
    // localStorage unavailable
  }
}

export function useAliases() {
  const [aliases, setAliases] = useState(loadAliases);

  const setAlias = useCallback((address, name) => {
    if (!address || !name.trim()) return;
    const key = address.toLowerCase();
    setAliases((prev) => {
      const updated = { ...prev, [key]: name.trim() };
      persistAliases(updated);
      return updated;
    });
  }, []);

  const setMultipleAliases = useCallback((entries) => {
    // entries: [{ address, name }]
    setAliases((prev) => {
      const updated = { ...prev };
      entries.forEach(({ address, name }) => {
        if (address && name.trim()) {
          updated[address.toLowerCase()] = name.trim();
        }
      });
      persistAliases(updated);
      return updated;
    });
  }, []);

  const getAlias = useCallback(
    (address) => {
      if (!address) return "";
      const key = address.toLowerCase();
      return aliases[key] || "";
    },
    [aliases]
  );

  const displayName = useCallback(
    (address) => {
      if (!address) return "";
      const alias = getAlias(address);
      if (alias) return alias;
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    },
    [getAlias]
  );

  return { aliases, setAlias, setMultipleAliases, getAlias, displayName };
}
