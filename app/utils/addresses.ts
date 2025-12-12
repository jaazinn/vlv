// app/utils/addresses.ts

import { base, mainnet } from "wagmi/chains";
import vaultConfig from "../config/vaults.json";

export type SupportedChain = typeof base.id | typeof mainnet.id;

export interface VaultConfig {
  id: string;
  name: string;
  description: string;
  slug: string;
  network: string;
  chainId: number;
  vaultAddress: string;
  underlyingAsset: {
    symbol: string;
    name: string;
    address: string;
    decimals: number;
  };
  category: string;
  riskLevel: string;
  tags?: string[];
}

const vaults: VaultConfig[] = vaultConfig.vaults;

export function getVaultsForChain(chainId: SupportedChain): VaultConfig[] {
  return vaults.filter(vault => vault.chainId === chainId);
}

export function getAllVaults(): VaultConfig[] {
  return vaults;
}

export function getVaultById(vaultId: string): VaultConfig | undefined {
  return vaults.find(vault => vault.id === vaultId);
}

export function getVaultAddress(chainId: SupportedChain): string {
  const chainVaults = getVaultsForChain(chainId);
  if (chainVaults.length === 0) {
    throw new Error(`No vaults configured for chain ${chainId}`);
  }
  return chainVaults[0].vaultAddress;
}

export function getUSDCAddress(chainId: SupportedChain): string {
  const chainVaults = getVaultsForChain(chainId);
  if (chainVaults.length === 0) {
    throw new Error(`No vaults configured for chain ${chainId}`);
  }
  return chainVaults[0].underlyingAsset.address;
}

export function isChainSupported(chainId: number): chainId is SupportedChain {
  return vaults.some(vault => vault.chainId === chainId);
}

export function getSupportedChainIds(): number[] {
  return [...new Set(vaults.map(vault => vault.chainId))];
}

export function getDefaultChainId(): SupportedChain {
  return getSupportedChainIds()[0] as SupportedChain;
}

export function getNetworkName(chainId: SupportedChain): string {
  switch (chainId) {
    case base.id:
      return "Base";
    case mainnet.id:
      return "Ethereum";
    default:
      return "Unknown Network";
  }
}

export function getVaultName(chainId: SupportedChain): string {
  const chainVaults = getVaultsForChain(chainId);
  if (chainVaults.length === 0) {
    return "Very Liquid USDC";
  }
  return chainVaults[0].name;
}

export function getChainSlug(chainId: number): string {
  switch (chainId) {
    case 8453: return "base";
    case 1: return "ethereum";
    default: return "unknown";
  }
}

export function getVaultUrl(vault: VaultConfig): string {
  const chainSlug = getChainSlug(vault.chainId);
  return `/${chainSlug}/vault/${vault.vaultAddress}/${vault.slug}`;
}

export function findVaultByUrl(chain: string, address: string, slug: string): VaultConfig | undefined {
  return getAllVaults().find(v => 
    getChainSlug(v.chainId) === chain &&
    v.vaultAddress.toLowerCase() === address.toLowerCase() && 
    v.slug === slug
  );
}

export function findVaultByAddress(chain: string, address: string): VaultConfig | undefined {
  return getAllVaults().find(v => 
    getChainSlug(v.chainId) === chain &&
    v.vaultAddress.toLowerCase() === address.toLowerCase()
  );
}

export function findVaultBySlug(chain: string, slug: string): VaultConfig | undefined {
  return getAllVaults().find(v => 
    getChainSlug(v.chainId) === chain &&
    v.slug === slug
  );
}