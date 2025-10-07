"use client";

import { VaultConfig } from "../utils/addresses";
import { useReadContract } from "wagmi";
import { erc4626ABI } from "../abi/erc4626";
import { formatBalanceWithCommas } from "../utils/formatting";
import { useVaultApy } from "../hooks/useYieldsData";
import Image from "next/image";

interface VaultCardProps {
  vault: VaultConfig;
  onSelect: (vault: VaultConfig) => void;
}

export function VaultCard({ vault, onSelect }: VaultCardProps) {
  // Query total assets (TVL) from the vault contract
  const { data: totalAssets } = useReadContract({
    address: vault.vaultAddress as `0x${string}`,
    abi: erc4626ABI,
    functionName: "totalAssets",
    chainId: vault.chainId,
  });

  // Get APY data for this vault
  const { apy, isLoading: apyLoading, error: apyError } = useVaultApy(vault.vaultAddress);

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-400';
      case 'moderate': return 'text-[#d8f999]';
      case 'high': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getNetworkLogo = (chainId: number) => {
    switch (chainId) {
      case 8453: return '/base-logo.svg';  // Base
      case 1: return '/eth-logo.svg';      // Ethereum
      default: return null;
    }
  };

  return (
    <div 
      className="border border-gray-600 bg-gradient-to-b from-[#1E274780] to-[#222F5F80] hover:from-[#242B52] hover:to-[#283468] rounded-2xl p-6 cursor-pointer transition-all duration-200"
      onClick={() => onSelect(vault)}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white mb-1">{vault.name}</h3>
        </div>
        {getNetworkLogo(vault.chainId) && (
          <Image 
            src={getNetworkLogo(vault.chainId)!}
            alt={`${vault.network} logo`}
            width={24}
            height={24}
            className="w-6 h-6 flex-shrink-0"
          />
        )}
      </div>
      
      <p className="text-gray-300 text-sm mb-4 line-clamp-2">{vault.description}</p>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div>
            <p className="text-xs text-gray-400">Asset</p>
            <div className="flex items-center space-x-2">
              <Image 
                src="/usdc-logo.svg"
                alt="USDC Logo"
                width={16}
                height={16}
                className="w-4 h-4"
              />
              <p className="text-white font-medium">{vault.underlyingAsset.symbol}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400">Risk</p>
            <p className={`font-medium capitalize ${getRiskColor(vault.riskLevel)}`}>
              {vault.riskLevel}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">TVL</p>
            <p className="text-white font-medium">
              {totalAssets !== undefined 
                ? `$${formatBalanceWithCommas(totalAssets, vault.underlyingAsset.decimals)}`
                : "Switch Network"
              }
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">APY</p>
          <p className="text-white font-medium">
            {apyLoading ? "Loading..." : 
             apyError ? "N/A" : 
             apy !== undefined ? `${apy.toFixed(2)}%` : "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}