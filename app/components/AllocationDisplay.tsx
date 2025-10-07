"use client";

import { useVaultData } from "../hooks/useVaultData";
import { VaultConfig } from "../utils/addresses";

interface AllocationDisplayProps {
  selectedVault?: VaultConfig;
}

export function AllocationDisplay({ selectedVault }: AllocationDisplayProps) {
  const { allocations, allocationsLoading, hasStrategies } = useVaultData(selectedVault);

  if (allocationsLoading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Allocation</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!hasStrategies || !allocations || allocations.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Allocation</h3>
        <p className="text-gray-500">No strategies found for this vault.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Allocation</h3>
      <div className="space-y-3">
        {allocations.map((allocation) => (
          <div key={allocation.address} className="flex justify-between items-center">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900">
                  {allocation.name}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {allocation.allocationPercentage.toFixed(2)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${allocation.allocationPercentage}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Assets: {(Number(allocation.assets) / 1e6).toFixed(2)} USDC
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          Total Strategies: {allocations.length}
        </div>
      </div>
    </div>
  );
}