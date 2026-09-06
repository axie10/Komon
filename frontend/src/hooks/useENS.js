import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Resolves Ethereum addresses to ENS names.
 * Only works on networks that support ENS (mainnet, sepolia).
 * Returns empty string for addresses without ENS or on unsupported networks.
 */
export function useENS(provider) {
  const [ensNames, setEnsNames] = useState({});
  const cache = useRef({});

  const resolveAddress = useCallback(
    async (address) => {
      if (!provider || !address) return "";

      const key = address.toLowerCase();

      // Check cache first
      if (cache.current[key] !== undefined) return cache.current[key];

      // Mark as resolving to prevent duplicate calls
      cache.current[key] = "";

      try {
        const name = await provider.lookupAddress(address);
        if (name) {
          cache.current[key] = name;
          setEnsNames((prev) => ({ ...prev, [key]: name }));
          return name;
        }
      } catch {
        // ENS not supported on this network — silently ignore
      }

      return "";
    },
    [provider]
  );

  const resolveMultiple = useCallback(
    async (addresses) => {
      if (!provider || !addresses?.length) return;

      const unresolved = addresses.filter(
        (addr) => cache.current[addr.toLowerCase()] === undefined
      );

      await Promise.allSettled(unresolved.map(resolveAddress));
    },
    [provider, resolveAddress]
  );

  const getENS = useCallback(
    (address) => {
      if (!address) return "";
      return ensNames[address.toLowerCase()] || "";
    },
    [ensNames]
  );

  return { resolveAddress, resolveMultiple, getENS };
}
