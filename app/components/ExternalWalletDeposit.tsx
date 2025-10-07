"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain, useAccount } from "wagmi";
import { parseUnits } from "viem";
import { erc4626ABI, erc20ABI } from "../abi/erc4626";
import { validateDepositAmount } from "../utils/validation";
import { getVaultAddress, isChainSupported, getDefaultChainId, VaultConfig } from "../utils/addresses";

interface ExternalWalletDepositProps {
  depositAmount: string;
  asset: `0x${string}` | undefined;
  address: `0x${string}` | undefined;
  allowance: bigint | undefined;
  assetSymbol: string | undefined;
  assetDecimals: number | undefined;
  userBalance: bigint | undefined;
  selectedVault?: VaultConfig;
  onSuccess: () => void;
}

export function ExternalWalletDeposit({
  depositAmount,
  asset,
  address,
  allowance,
  assetDecimals,
  userBalance,
  selectedVault,
  onSuccess,
}: ExternalWalletDepositProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [approvalHash, setApprovalHash] = useState<`0x${string}` | undefined>();
  const [depositHash, setDepositHash] = useState<`0x${string}` | undefined>();
  const [hasApproved, setHasApproved] = useState(false);
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
  const { isLoading: isApprovalPending, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ 
    hash: approvalHash 
  });
  const { isLoading: isDepositPending, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({ 
    hash: depositHash 
  });

  // Add validation check
  const validation = useMemo(() => 
    validateDepositAmount(depositAmount, userBalance, assetDecimals), 
    [depositAmount, userBalance, assetDecimals]
  );

  const needsApproval = useMemo(() => {
    if (!depositAmount || assetDecimals === undefined || !validation.isValid) return false;
    
    // If we've already approved in this session, no need to approve again
    if (hasApproved || isApprovalSuccess) return false;
    
    // If allowance is not loaded yet, assume we need approval
    if (allowance === undefined) return true;
    
    try {
      const amount = parseUnits(depositAmount, assetDecimals);
      return allowance < amount;
    } catch {
      return false;
    }
  }, [depositAmount, allowance, assetDecimals, hasApproved, isApprovalSuccess, validation.isValid]);

  const handleDeposit = useCallback(async () => {
    if (!asset || !address || !depositAmount || assetDecimals === undefined || !validation.isValid || !vaultAddress) return;
    
    try {
      const amount = parseUnits(depositAmount, assetDecimals);
      setIsDepositing(true);
      
      writeContract({
        address: vaultAddress as `0x${string}`,
        abi: erc4626ABI,
        functionName: "deposit",
        args: [amount, address],
      }, {
        onSuccess: (hash) => {
          setDepositHash(hash);
          setIsDepositing(false);
        },
        onError: (error) => {
          console.error("Deposit error:", error);
          setIsDepositing(false);
        }
      });
    } catch (error) {
      console.error("Deposit transaction error:", error);
      setIsDepositing(false);
    }
  }, [asset, address, depositAmount, assetDecimals, writeContract, validation.isValid, vaultAddress]);

  // Auto-proceed to deposit after approval is confirmed
  useEffect(() => {
    if (isApprovalSuccess && approvalHash && !isDepositing && !hasApproved) {
      setHasApproved(true);
      handleDeposit();
    }
  }, [isApprovalSuccess, approvalHash, isDepositing, hasApproved, handleDeposit]);

  // Call onSuccess when deposit transaction is confirmed
  useEffect(() => {
    if (isDepositSuccess && depositHash) {
      setApprovalHash(undefined);
      setDepositHash(undefined);
      setHasApproved(false); // Reset for next transaction
      onSuccess();
    }
  }, [isDepositSuccess, depositHash, onSuccess]);

  // Reset approval and deposit state when deposit amount changes
  useEffect(() => {
    setHasApproved(false);
    setApprovalHash(undefined);
    setDepositHash(undefined);
  }, [depositAmount]);

  const handleApproval = async () => {
    if (!asset || !address || !depositAmount || assetDecimals === undefined || !validation.isValid || !vaultAddress) return;
    
    try {
      const amount = parseUnits(depositAmount, assetDecimals);
      setIsApproving(true);
      
      writeContract({
        address: asset,
        abi: erc20ABI,
        functionName: "approve",
        args: [vaultAddress as `0x${string}`, amount],
      }, {
        onSuccess: (hash) => {
          setApprovalHash(hash);
          setIsApproving(false);
        },
        onError: (error) => {
          console.error("Approval error:", error);
          setIsApproving(false);
          setApprovalHash(undefined);
        }
      });
    } catch (error) {
      console.error("Approval transaction error:", error);
      setIsApproving(false);
    }
  };

  const handleNetworkSwitch = useCallback(() => {
    if (switchChain) {
      const targetChainId = selectedVault ? selectedVault.chainId : getDefaultChainId();
      switchChain({ chainId: targetChainId });
    }
  }, [selectedVault, switchChain]);

  const handleTransaction = async () => {
    if (!validation.isValid) return;
    
    if (needsApproval) {
      await handleApproval();
    } else {
      await handleDeposit();
    }
  };

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
    if (isApproving) return "Approving...";
    if (isApprovalPending) return "Confirming Approval...";
    if (isDepositing) return "Depositing...";
    if (isDepositPending) return "Confirming Deposit...";
    if (needsApproval) return `Approve USDC & Deposit`;
    return "Deposit";
  };

  const isDisabled = !isOnCorrectNetwork ? false : (isApproving || isApprovalPending || isDepositing || isDepositPending || !validation.isValid);

  return (
    <button
      onClick={!isOnCorrectNetwork ? handleNetworkSwitch : handleTransaction}
      disabled={isDisabled}
      className="w-full py-3 px-4 bg-[#2B51E8] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
    >
      {getButtonText()}
    </button>
  );
}