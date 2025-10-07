// app/utils/strategies.ts

import { Address } from "viem";

// Strategy name mapping for display purposes
// TODO: Add strategy addresses and names as they become available 
// MUST BE LOWERCASE
export const strategyNames: Record<string, string> = {
  // Base strategies
  "0xe822cb00dd72a2278f623b82d0234b15241bcfd9": "Cash",
  "0x5a33c8517f4ddd3939a87feaaaaaf570a542d2ad": "Morpho Steakhouse USDC", 
  "0xdded8eab321803a3c2e836caadd54339f4cdd5d1": "Morpho Moonwell Flagship USDC",
  "0x40aeb7c4c392f90b37e0ff0cac005fa7804653ec": "Morpho Gauntlet USDC Prime",
  "0x930d8350ff644114d9fc29d820228acd0cc719ed": "Morpho Spark USDC",
  "0x63954a96a4e77a96cf78c3a4959c45123cda5de1": "Aave v3",
  
  // Ethereum Mainnet strategies
  "0x30c37256cd4dbac733d815ae520f94a9adaff579": "Aave v3",
  "0x096a1e4176ca516bced19b15903eab4654f7ee7a": "Cash",
  "0x0860b5c685a7985789251f54524c49d71d56d10d":"Morpho Steakhouse USDC",
  "0x2ae61a7463667503ab530b17b387a448b0471bcc":"Euler Prime USDC",
  "0xd72d29287503ccda5bd9131baa8d96df436dcdf0":"Euler Yield USDC",
  "0x23de7fc5c9dc55b076558e6be0cfa7755bb5f38b":"Morpho Smokehouse USDC",
  "0xc266c2544b768d94b627d66060e2662533a1dee3":"Morpho Usual Boosted USDC"
  
  // Add more strategies as needed
};

export function getStrategyName(address: string): string {
  return strategyNames[address.toLowerCase()] || `Strategy ${address.slice(0, 6)}...${address.slice(-4)}`;
}

export interface StrategyAllocation {
  address: Address;
  name: string;
  balance: bigint;
  assets: bigint;
  allocationPercentage: number;
}

/**
 * Calculate allocation percentages for strategies
 */
export function calculateAllocations(
  strategyAddresses: readonly Address[],
  strategyAssets: readonly bigint[]
): StrategyAllocation[] {
  if (strategyAddresses.length !== strategyAssets.length) {
    throw new Error("Strategy addresses and assets arrays must have the same length");
  }

  // Calculate total assets across all strategies
  const totalAssets = strategyAssets.reduce((sum, assets) => sum + assets, BigInt(0));

  // If total is zero, return zero allocations
  if (totalAssets === BigInt(0)) {
    return strategyAddresses.map((address, i) => ({
      address,
      name: getStrategyName(address),
      balance: BigInt(0), // We'll need to fetch this separately
      assets: strategyAssets[i],
      allocationPercentage: 0,
    }));
  }

  // Calculate percentages
  return strategyAddresses.map((address, i) => {
    const assets = strategyAssets[i];
    const percentage = Number(assets * BigInt(10000) / totalAssets) / 100; // Calculate with 2 decimal precision
    
    return {
      address,
      name: getStrategyName(address),
      balance: BigInt(0), // We'll need to fetch this separately
      assets,
      allocationPercentage: percentage,
    };
  });
}