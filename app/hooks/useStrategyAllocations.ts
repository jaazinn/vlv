"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { useMemo } from "react";
import { erc4626ABI } from "../abi/erc4626";
import { calculateAllocations, StrategyAllocation } from "../utils/strategies";
import { Address } from "viem";

/**
 * Hook to fetch strategy allocations for a vault
 */
export function useStrategyAllocations(vaultAddress?: string, chainId?: number) {
  
  // Get list of strategies
  const { data: strategies, isLoading: strategiesLoading } = useReadContract({
    address: vaultAddress as `0x${string}`,
    abi: erc4626ABI,
    functionName: "strategies",
    chainId: chainId,
    query: { enabled: !!vaultAddress }
  });

  // Prepare contracts for batch reading strategy balances
  const strategyBalanceContracts = useMemo(() => {
    if (!strategies || !vaultAddress) return [];
    
    return strategies.map((strategyAddress: Address) => ({
      address: strategyAddress,
      abi: erc4626ABI,
      functionName: "balanceOf",
      args: [vaultAddress as `0x${string}`],
    }));
  }, [strategies, vaultAddress]);

  // Fetch all strategy balances in parallel
  const { data: strategyBalances, isLoading: balancesLoading } = useReadContracts({
    contracts: strategyBalanceContracts.map(contract => ({ ...contract, chainId })),
    query: { enabled: strategyBalanceContracts.length > 0 }
  });

  // Prepare contracts for batch reading strategy assets
  const strategyAssetContracts = useMemo(() => {
    if (!strategies || !strategyBalances) return [];
    
    return strategies.map((strategyAddress: Address, index: number) => {
      const balance = strategyBalances[index]?.result as bigint | undefined;
      return {
        address: strategyAddress,
        abi: erc4626ABI,
        functionName: "convertToAssets",
        args: [balance || BigInt(0)],
      };
    });
  }, [strategies, strategyBalances]);

  // Fetch all strategy assets in parallel
  const { data: strategyAssets, isLoading: assetsLoading } = useReadContracts({
    contracts: strategyAssetContracts.map(contract => ({ ...contract, chainId })),
    query: { enabled: strategyAssetContracts.length > 0 }
  });

  // Calculate allocations
  const allocations: StrategyAllocation[] = useMemo(() => {
    if (!strategies || !strategyBalances || !strategyAssets) return [];
    
    try {
      const assets = strategyAssets.map(result => result.result as bigint || BigInt(0));
      const balances = strategyBalances.map(result => result.result as bigint || BigInt(0));
      
      const calculatedAllocations = calculateAllocations(strategies, assets);
      
      // Add balance information to each allocation
      return calculatedAllocations.map((allocation, index) => ({
        ...allocation,
        balance: balances[index] || BigInt(0),
      }));
    } catch (error) {
      console.error("Error calculating allocations:", error);
      return [];
    }
  }, [strategies, strategyBalances, strategyAssets]);

  const isLoading = strategiesLoading || balancesLoading || assetsLoading;
  const hasStrategies = strategies && strategies.length > 0;

  return {
    strategies: strategies || [],
    allocations,
    isLoading,
    hasStrategies,
    error: !isLoading && hasStrategies && allocations.length === 0,
  };
}