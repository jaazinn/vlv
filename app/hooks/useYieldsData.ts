"use client";

import { useQuery } from "@tanstack/react-query";
import { useMiniKit } from "@coinbase/onchainkit/minikit";

export interface YieldsPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase: number;
  apyReward: number | null;
  apy: number;
  rewardTokens: string[] | null;
  pool: string;
  apyPct1D: number | null;
  apyPct7D: number | null;
  apyPct30D: number | null;
  stablecoin: boolean;
  ilRisk: string;
  exposure: string;
  predictions: {
    predictedClass: string | null;
    predictedProbability: number | null;
    binnedConfidence: number | null;
  };
  poolMeta: string;
  mu: number;
  sigma: number;
  count: number;
  outlier: boolean;
  underlyingTokens: string[];
  il7d: number | null;
  apyBase7d: number | null;
  apyMean30d: number | null;
  volumeUsd1d: number | null;
  volumeUsd7d: number | null;
  apyBaseInception: number | null;
}

export interface YieldsResponse {
  status: string;
  data: YieldsPool[];
  lastUpdated: string;
}

export function useYieldsData() {
  const { context } = useMiniKit();

  return useQuery({
    queryKey: ["yields-data"],
    queryFn: async (): Promise<YieldsResponse> => {
      const response = await fetch("/api/yields");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch yields data: ${response.statusText}`);
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: context ? 5 * 60 * 1000 : false, // Refetch every 5 minutes in MiniKit
    retry: 3,
  });
}

// Map vault addresses to their API info (symbol + chain for disambiguation)
const VAULT_API_MAP: Record<string, { symbol: string; chain: string }> = {
  // Base Core USDC vault
  "0xf4D43A8570Dad86595fc079c633927aa936264F4": { symbol: "VLVCOREUSDC", chain: "Base" },
  // Ethereum Core USDC vault  
  "0x3AdF08AFe804691cA6d76742367cc50A24a1f4A1": { symbol: "VLVCOREUSDC", chain: "Ethereum" },
  // Ethereum Frontier USDC vault
  "0x13dDa6fD149a4Da0f2012F16e70925586ee603b8": { symbol: "VLVFRONTIERUSDC", chain: "Ethereum" },
};

export function getVaultApiInfo(vaultAddress: string): { symbol: string; chain: string } | undefined {
  // Try exact match first, then case-insensitive match
  const exactMatch = VAULT_API_MAP[vaultAddress];
  if (exactMatch) return exactMatch;
  
  // Case-insensitive fallback
  const lowerAddress = vaultAddress.toLowerCase();
  for (const [key, value] of Object.entries(VAULT_API_MAP)) {
    if (key.toLowerCase() === lowerAddress) {
      return value;
    }
  }
  
  return undefined;
}

export function useVaultApy(vaultAddress?: string) {
  const { data: yieldsData, isLoading, error } = useYieldsData();
  
  const apiInfo = vaultAddress ? getVaultApiInfo(vaultAddress) : undefined;
  const vaultYieldData = apiInfo 
    ? yieldsData?.data.find(pool => pool.symbol === apiInfo.symbol && pool.chain === apiInfo.chain)
    : null;


  return {
    apy: vaultYieldData?.apy,
    apyBase: vaultYieldData?.apyBase,
    apyReward: vaultYieldData?.apyReward,
    apyPct1D: vaultYieldData?.apyPct1D,
    apyPct7D: vaultYieldData?.apyPct7D,
    apyPct30D: vaultYieldData?.apyPct30D,
    apyMean30d: vaultYieldData?.apyMean30d,
    tvlUsd: vaultYieldData?.tvlUsd,
    poolMeta: vaultYieldData?.poolMeta,
    isLoading,
    error,
    lastUpdated: yieldsData?.lastUpdated,
  };
}