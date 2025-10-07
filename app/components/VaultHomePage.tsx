"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAllVaults, getVaultsForChain, VaultConfig, getSupportedChainIds, getVaultUrl } from "../utils/addresses";
import { VaultCard } from "./VaultCard";
import { base, mainnet } from "wagmi/chains";

export function VaultHomePage() {
  const [filterByNetwork, setFilterByNetwork] = useState<'all' | number>('all');
  const router = useRouter();
  
  const allVaults = getAllVaults();
  const supportedChainIds = getSupportedChainIds();
  
  const displayedVaults = filterByNetwork === 'all' 
    ? allVaults 
    : getVaultsForChain(filterByNetwork as 8453 | 1);
  
  const getNetworkName = (chainId: number) => {
    switch (chainId) {
      case base.id: return 'Base';
      case mainnet.id: return 'Ethereum';
      default: return 'Unknown Network';
    }
  };

  const handleVaultSelect = (vault: VaultConfig) => {
    router.push(getVaultUrl(vault));
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-[32px] leading-[57px] font-normal text-white mb-2" style={{ fontFamily: 'Public Sans', letterSpacing: '-0.02em' }}>
          DeFi&apos;s most liquid vaults.
        </h1>
        <p className="text-[16.8px] leading-[21px] text-center text-white opacity-80" style={{ fontFamily: 'Public Sans', letterSpacing: '-0.02em' }}>
          The only vaults that ensure full withdrawability at any time.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Available Vaults</h2>
          <p className="text-sm text-gray-400">
            {displayedVaults.length} vault{displayedVaults.length !== 1 ? 's' : ''} available
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">Network:</span>
          <select
            value={filterByNetwork}
            onChange={(e) => {
              const value = e.target.value;
              setFilterByNetwork(value === 'all' ? 'all' : parseInt(value));
            }}
            className="bg-[#242B52] border border-gray-600 rounded-md px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Networks</option>
            {supportedChainIds.map(chainId => (
              <option key={chainId} value={chainId}>
                {getNetworkName(chainId)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {displayedVaults.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No vaults available</h3>
          <p className="text-gray-400 text-sm">
            {filterByNetwork !== 'all' 
              ? `No vaults are available on ${getNetworkName(filterByNetwork as number)}.`
              : 'No vaults are currently configured.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedVaults.map((vault) => (
            <VaultCard
              key={vault.id}
              vault={vault}
              onSelect={handleVaultSelect}
            />
          ))}
        </div>
      )}

      <div className="mt-8 p-6 bg-gray-800/30 rounded-lg border border-gray-700">
        <h3 className="text-lg font-medium text-white mb-2">About Very Liquid Vaults</h3>
        <p className="text-gray-300 text-sm leading-relaxed">
          Very Liquid Vaults by Size Credit are designed to provide maximum liquidity while generating yield. 
          Unlike traditional DeFi vaults, these vaults ensure you can withdraw your full deposit at any time, 
          making them perfect for users who need instant access to their funds while still earning rewards.
        </p>
      </div>
    </div>
  );
}