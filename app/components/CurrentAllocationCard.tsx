"use client";

import { useState } from "react";
import { useChainId } from "wagmi";
import { formatUnits } from "viem";
import { isChainSupported } from "../utils/addresses";
import { useVaultData } from "../hooks/useVaultData";

import { VaultConfig } from "../utils/addresses";

interface AllocationData {
  protocol: string;
  percentage: number;
  amount: bigint;
  color: string;
}

interface CurrentAllocationCardProps {
  selectedVault?: VaultConfig;
}

export function CurrentAllocationCard({ selectedVault }: CurrentAllocationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const chainId = useChainId();

  // Get vault data including allocations for the specific vault
  const { 
    totalAssets, 
    allocations: strategyAllocations, 
    allocationsLoading, 
    hasStrategies 
  } = useVaultData(selectedVault);

  // Define color palette for strategies - blue/purple/pink spectrum in rainbow order
  const colors = [
    "from-blue-300 to-blue-500",
    "from-blue-400 to-blue-600",
    "from-indigo-400 to-indigo-600",
    "from-purple-300 to-purple-500",
    "from-purple-400 to-purple-600",
    "from-violet-400 to-violet-600",
    "from-pink-300 to-pink-500",
    "from-pink-400 to-pink-600"
  ];

  // Convert strategy allocations to the format expected by the UI
  const allocations: AllocationData[] = strategyAllocations?.map((strategy, index) => ({
    protocol: strategy.name,
    percentage: strategy.allocationPercentage,
    amount: strategy.assets,
    color: colors[index % colors.length]
  })) || [];

  // Fallback to mock data if no strategies are available or still loading
  const fallbackAllocations: AllocationData[] = [
    {
      protocol: "Loading strategies...",
      percentage: 100,
      amount: totalAssets || BigInt(0),
      color: "from-gray-400 to-gray-600"
    }
  ];

  const displayAllocations = hasStrategies && allocations.length > 0 ? allocations : fallbackAllocations;

  const formatAmount = (amount: bigint) => {
    if (!amount) return "0";
    const formatted = formatUnits(amount, 6); // USDC has 6 decimals
    return parseFloat(formatted).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  return (
    <div 
      className="bg-[#222542] rounded-[20px] py-6 px-8 cursor-pointer transition-all duration-300 ease-in-out hover:bg-[#252851]"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[16.64px] leading-[20px] text-[#A8B3DB]" style={{ fontFamily: 'Public Sans', letterSpacing: '-0.02em' }}>
          Current Allocation
        </h3>
        <div className="text-[14px] text-[#A8B3DB]" style={{ fontFamily: 'Public Sans' }}>
          Total: ${totalAssets ? formatAmount(totalAssets) : "0"}
        </div>
      </div>
      
      {/* Combined Progress Bar */}
      <div className="w-full bg-gray-600 rounded-full h-3 mb-4 overflow-hidden flex transition-all duration-300">
        {displayAllocations.map((allocation, index) => (
          <div
            key={allocation.protocol}
            className={`bg-gradient-to-r ${allocation.color} h-full transition-all duration-300 ${index === 0 ? 'rounded-l-full' : ''} ${index === displayAllocations.length - 1 ? 'rounded-r-full' : ''}`}
            style={{ width: `${allocation.percentage}%` }}
          />
        ))}
      </div>

      {/* Expandable Details Container */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {/* Allocation Details */}
        <div className="space-y-3 mb-6">
          {allocationsLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              <span className="ml-2 text-[14px] text-[#A8B3DB]" style={{ fontFamily: 'Public Sans' }}>
                Loading allocations...
              </span>
            </div>
          ) : (
            displayAllocations.map((allocation, index) => (
              <div 
                key={allocation.protocol} 
                className={`flex items-center justify-between transform transition-all duration-300 ease-in-out ${
                  isExpanded 
                    ? 'translate-y-0 opacity-100' 
                    : 'translate-y-4 opacity-0'
                }`}
                style={{
                  transitionDelay: `${index * 100}ms`
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 bg-gradient-to-r ${allocation.color} rounded-full`} />
                  <span className="text-[14px] text-white" style={{ fontFamily: 'Public Sans' }}>
                    {allocation.protocol}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-[14px] text-[#A8B3DB]" style={{ fontFamily: 'Public Sans' }}>
                    ${formatAmount(allocation.amount)}
                  </span>
                  <span className="text-[14px] text-[#A8B3DB] min-w-[45px] text-right" style={{ fontFamily: 'Public Sans' }}>
                    {allocation.percentage.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Strategy Info */}
        <div 
          className={`pt-4 border-t border-gray-600 transform transition-all duration-300 ease-in-out ${
            isExpanded 
              ? 'translate-y-0 opacity-100' 
              : 'translate-y-4 opacity-0'
          }`}
          style={{
            transitionDelay: `${displayAllocations.length * 100}ms`
          }}
        >
          <div className="flex items-center justify-between text-[12px] text-[#A8B3DB]" style={{ fontFamily: 'Public Sans' }}>
            <span>
              {hasStrategies 
                ? `Strategies: ${displayAllocations.length} active` 
                : "Strategy: Loading..."
              }
            </span>
            <span>
              {selectedVault 
                ? selectedVault.network
                : !isChainSupported(chainId) 
                  ? "Unsupported Chain" 
                  : allocationsLoading 
                    ? "Fetching data..." 
                    : "Live data"
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}