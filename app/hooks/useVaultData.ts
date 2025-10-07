"use client";

import { useAccount, useReadContract, useBalance, useChainId } from "wagmi";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useCallback } from "react";
import { erc4626ABI, erc20ABI } from "../abi/erc4626";
import { getVaultAddress, isChainSupported, VaultConfig } from "../utils/addresses";
import { useStrategyAllocations } from "./useStrategyAllocations";

/**
 * Custom hook to fetch all vault-related data for a user
 */
export function useVaultData(selectedVault?: VaultConfig) {
  const { address: wagmiAddress } = useAccount();
  const { context } = useMiniKit();
  const chainId = useChainId();
  
  // In MiniKit, the address should come from wagmi's useAccount hook
  // The MiniKit provider sets up wagmi connectors automatically
  const address = wagmiAddress;

  // Get network-specific vault address - use selected vault if provided, otherwise use current chain
  const vaultAddress = selectedVault 
    ? selectedVault.vaultAddress 
    : (isChainSupported(chainId) ? getVaultAddress(chainId) : null);
  
  // Get the target chain ID - use selectedVault's chain if provided, otherwise current chain
  const targetChainId = selectedVault?.chainId ?? chainId;
  
  // Get the asset address - use selected vault if provided, otherwise query from contract
  const assetAddress = selectedVault?.underlyingAsset.address;

  // Get the underlying asset address - skip if we already have it from selectedVault
  const { data: asset } = useReadContract({
    address: vaultAddress as `0x${string}`,
    abi: erc4626ABI,
    functionName: "asset",
    chainId: targetChainId,
    query: { enabled: !!vaultAddress && !assetAddress }
  });
  
  // Use asset address from selectedVault if available, otherwise from contract query
  const finalAssetAddress = assetAddress || asset;

  // Get asset metadata - use selectedVault data if available
  const { data: assetDecimals } = useReadContract({
    address: finalAssetAddress as `0x${string}`,
    abi: erc20ABI,
    functionName: "decimals",
    chainId: targetChainId,
    query: { enabled: !!finalAssetAddress && !selectedVault }
  });

  const { data: assetSymbol } = useReadContract({
    address: finalAssetAddress as `0x${string}`,
    abi: erc20ABI,
    functionName: "symbol",
    chainId: targetChainId,
    query: { enabled: !!finalAssetAddress && !selectedVault }
  });
  
  // Use metadata from selectedVault if available, otherwise from contract queries
  const finalAssetDecimals = selectedVault?.underlyingAsset.decimals ?? assetDecimals;
  const finalAssetSymbol = selectedVault?.underlyingAsset.symbol ?? assetSymbol;

  // Try direct contract read first for better reliability
  const { data: userBalanceFromContract, refetch: refetchUserBalance } = useReadContract({
    address: finalAssetAddress as `0x${string}`,
    abi: erc20ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: targetChainId,
    query: { 
      enabled: !!address && !!finalAssetAddress,
      // Refresh more frequently in MiniKit
      refetchInterval: context ? 3000 : false,
    }
  });

  // Fallback to wagmi useBalance
  const { data: userBalanceFromWagmi } = useBalance({
    address: address,
    token: finalAssetAddress as `0x${string}`,
    chainId: targetChainId,
    query: { enabled: !!address && !!finalAssetAddress }
  });

  // Create a consistent balance object
  const userBalance = userBalanceFromContract 
    ? { 
        value: userBalanceFromContract, 
        decimals: finalAssetDecimals || 6, 
        symbol: finalAssetSymbol || "USDC",
        formatted: ""
      }
    : userBalanceFromWagmi;

  // Get user's vault shares
  const { data: userShares, refetch: refetchUserShares } = useReadContract({
    address: vaultAddress as `0x${string}`,
    abi: erc4626ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: targetChainId,
    query: { 
      enabled: !!address && !!vaultAddress,
      refetchInterval: context ? 3000 : false,
    }
  });

  // Convert user's shares to underlying assets
  const { data: convertedAssets, refetch: refetchConvertedAssets } = useReadContract({
    address: vaultAddress as `0x${string}`,
    abi: erc4626ABI,
    functionName: "convertToAssets",
    args: userShares ? [userShares] : undefined,
    chainId: targetChainId,
    query: { enabled: !!userShares && !!vaultAddress }
  });

  // Get user's allowance for the vault
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: finalAssetAddress as `0x${string}`,
    abi: erc20ABI,
    functionName: "allowance",
    args: address && finalAssetAddress && vaultAddress ? [address, vaultAddress as `0x${string}`] : undefined,
    chainId: targetChainId,
    query: { enabled: !!address && !!finalAssetAddress && !!vaultAddress }
  });

  // Get vault metadata
  const { data: vaultName } = useReadContract({
    address: vaultAddress as `0x${string}`,
    abi: erc4626ABI,
    functionName: "name",
    chainId: targetChainId,
    query: { enabled: !!vaultAddress }
  });

  const { data: vaultSymbol } = useReadContract({
    address: vaultAddress as `0x${string}`,
    abi: erc4626ABI,
    functionName: "symbol",
    chainId: targetChainId,
    query: { enabled: !!vaultAddress }
  });

  const { data: totalAssets } = useReadContract({
    address: vaultAddress as `0x${string}`,
    abi: erc4626ABI,
    functionName: "totalAssets",
    chainId: targetChainId,
    query: { enabled: !!vaultAddress }
  });

  const { data: totalSupply } = useReadContract({
    address: vaultAddress as `0x${string}`,
    abi: erc4626ABI,
    functionName: "totalSupply",
    chainId: targetChainId,
    query: { enabled: !!vaultAddress }
  });

  // Get strategy allocations
  const { 
    strategies, 
    allocations, 
    isLoading: allocationsLoading, 
    hasStrategies 
  } = useStrategyAllocations(vaultAddress || undefined, targetChainId);

  // Simple refetch function that waits for blockchain to update
  const refetchUserData = useCallback(async () => {
    console.log('🔄 Refreshing user data in 2 seconds (waiting for blockchain)...');
    
    // Wait for the blockchain to be updated after transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🔄 Now refetching all user data...');
    const promises = [];
    
    if (refetchUserBalance) promises.push(refetchUserBalance());
    if (refetchUserShares) promises.push(refetchUserShares());
    if (refetchConvertedAssets) promises.push(refetchConvertedAssets());
    if (refetchAllowance) promises.push(refetchAllowance());
    
    try {
      await Promise.all(promises);
      console.log('✅ User data refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
    }
  }, [refetchUserBalance, refetchUserShares, refetchConvertedAssets, refetchAllowance]);

  return {
    // Asset info
    asset: finalAssetAddress,
    assetDecimals: finalAssetDecimals,
    assetSymbol: finalAssetSymbol,
    
    // User balances
    userBalance,
    userShares,
    convertedAssets,
    allowance,
    
    // Vault info
    vaultName,
    vaultSymbol,
    totalAssets,
    totalSupply,
    
    // Strategy allocation info
    strategies,
    allocations,
    hasStrategies,
    allocationsLoading,
    
    // Computed values
    isConnected: !!address,
    hasShares: userShares && userShares > BigInt(0),
    sharePrice: totalSupply && totalAssets && totalSupply > BigInt(0) 
      ? Number(totalAssets) / Number(totalSupply)
      : 1,
    
    // Debug info
    currentAddress: address,
    isMiniKit: !!context,
    rawBalanceFromContract: userBalanceFromContract,
    rawBalanceFromWagmi: userBalanceFromWagmi,
    
    // Refetch functions
    refetchUserData,
  };
}