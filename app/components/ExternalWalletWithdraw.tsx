// app/components/ExternalWalletWithdraw.tsx
"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain, useAccount } from "wagmi";
import { parseUnits } from "viem";
import { erc4626ABI } from "../abi/erc4626";
import { validateWithdrawAmount } from "../utils/validation";
import { getVaultAddress, isChainSupported, getDefaultChainId, VaultConfig } from "../utils/addresses";

interface ExternalWalletWithdrawProps {
  withdrawAmount: string;
  address: `0x${string}` | undefined;
  assetSymbol: string | undefined;
  assetDecimals: number | undefined;
  convertedAssets: bigint | undefined;
  selectedVault?: VaultConfig;
  onSuccess: () => void;
}

export function ExternalWalletWithdraw({
  withdrawAmount,
  address,
  assetDecimals,
  convertedAssets,
  selectedVault,
  onSuccess,
}: ExternalWalletWithdrawProps) {
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawHash, setWithdrawHash] = useState<`0x${string}` | undefined>();
  const chainId = useChainId();
  const { chain } = useAccount();
  const { switchChain } = useSwitchChain();

  const { writeContract } = useWriteContract();
  
  // Check network compatibility - use chain.id like navbar for consistency
  const actualChainId = chain?.id;
  const isOnSupportedNetwork = actualChainId ? isChainSupported(actualChainId) : false;
  const isOnCorrectNetwork = selectedVault 
    ? (isOnSupportedNetwork && actualChainId === selectedVault.chainId)
    : isOnSupportedNetwork;
  
  // Get network-specific vault address - use selectedVault if provided
  const vaultAddress = selectedVault 
    ? selectedVault.vaultAddress 
    : (isChainSupported(chainId) ? getVaultAddress(chainId) : null);
  const { isLoading: isWithdrawPending, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({ 
    hash: withdrawHash 
  });

  // Add validation check
  const validation = useMemo(() => 
    validateWithdrawAmount(withdrawAmount, convertedAssets, assetDecimals), 
    [withdrawAmount, convertedAssets, assetDecimals]
  );

  const handleWithdraw = useCallback(async () => {
    if (!address || !withdrawAmount || assetDecimals === undefined || !validation.isValid || !vaultAddress) return;
    
    try {
      const amount = parseUnits(withdrawAmount, assetDecimals);
      setIsWithdrawing(true);
      
      writeContract({
        address: vaultAddress as `0x${string}`,
        abi: erc4626ABI,
        functionName: "withdraw",
        args: [amount, address, address],
      }, {
        onSuccess: (hash) => {
          setWithdrawHash(hash);
          setIsWithdrawing(false);
        },
        onError: (error) => {
          console.error("Withdraw error:", error);
          setIsWithdrawing(false);
        }
      });
    } catch (error) {
      console.error("Withdraw transaction error:", error);
      setIsWithdrawing(false);
    }
  }, [address, withdrawAmount, assetDecimals, writeContract, validation.isValid, vaultAddress]);

  // Auto-call onSuccess after withdrawal is confirmed
  useEffect(() => {
    if (isWithdrawSuccess && withdrawHash) {
      onSuccess();
    }
  }, [isWithdrawSuccess, withdrawHash, onSuccess]);

  const handleNetworkSwitch = useCallback(() => {
    if (switchChain) {
      const targetChainId = selectedVault ? selectedVault.chainId : getDefaultChainId();
      switchChain({ chainId: targetChainId });
    }
  }, [selectedVault, switchChain]);

  const getNetworkName = (chainId: number) => {
    switch (chainId) {
      case 8453: return 'Base';
      case 1: return 'Ethereum';
      default: return 'Unknown Network';
    }
  };

  const getButtonText = () => {
    if (!isOnCorrectNetwork) {
      const targetChainId = selectedVault ? selectedVault.chainId : getDefaultChainId();
      return `Switch to ${getNetworkName(targetChainId)}`;
    }
    if (!validation.isValid && validation.error) return validation.error;
    if (isWithdrawing) return "Withdrawing...";
    if (isWithdrawPending) return "Confirming Withdrawal...";
    return "Withdraw";
  };

  const isDisabled = !isOnCorrectNetwork ? false : (isWithdrawing || isWithdrawPending || !validation.isValid);

  return (
    <button
      onClick={!isOnCorrectNetwork ? handleNetworkSwitch : handleWithdraw}
      disabled={isDisabled}
      className="w-full py-3 px-4 bg-[#2B51E8] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
    >
      {getButtonText()}
    </button>
  );
}