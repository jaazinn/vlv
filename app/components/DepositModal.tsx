// app/components/DepositModal.tsx
"use client";

import {
  Transaction,
  TransactionButton,
  TransactionToast,
  TransactionToastAction,
  TransactionToastIcon,
  TransactionToastLabel,
  TransactionError,
  TransactionResponse,
  TransactionStatusAction,
  TransactionStatusLabel,
  TransactionStatus,
} from "@coinbase/onchainkit/transaction";
import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { useState, useCallback, useMemo } from "react";
import { formatUnits } from "viem";
import { useAccount, useChainId } from "wagmi";
import Image from "next/image";

import { validateDepositAmount } from "../utils/validation";
import { generateDepositCalls } from "../utils/transactions";
import { formatBalance } from "../utils/formatting";
import { getVaultAddress, isChainSupported, VaultConfig } from "../utils/addresses";
import { useVaultApy } from "../hooks/useYieldsData";
import { ExternalWalletDeposit } from "./ExternalWalletDeposit";
import { Modal } from "./Modal";

interface UserBalance {
  value: bigint;
  decimals: number;
  symbol: string;
  formatted: string;
}

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInMiniApp: boolean;
  asset: `0x${string}` | undefined;
  assetDecimals: number | undefined;
  assetSymbol: string | undefined;
  userBalance: UserBalance | undefined;
  allowance: bigint | undefined;
  selectedVault?: VaultConfig;
  onSuccess?: () => void;
}

export function DepositModal({
  isOpen,
  onClose,
  isInMiniApp,
  asset,
  assetDecimals,
  assetSymbol,
  userBalance,
  allowance,
  selectedVault,
  onSuccess,
}: DepositModalProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const [depositAmount, setDepositAmount] = useState("");
  const [validationError, setValidationError] = useState<string | undefined>();

  // Get network-specific vault address
  const vaultAddress = isChainSupported(chainId) ? getVaultAddress(chainId) : null;
  
  // Get APY data for the vault
  const { apy, isLoading: apyLoading, error: apyError } = useVaultApy(
    selectedVault?.vaultAddress || vaultAddress || undefined
  );

  // Validation with memoization
  const validation = useMemo(() => 
    validateDepositAmount(depositAmount, userBalance?.value, assetDecimals), 
    [depositAmount, userBalance?.value, assetDecimals]
  );

  // Event handlers
  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setDepositAmount(value);
      setValidationError(undefined);
      
      if (value && value !== "0") {
        const newValidation = validateDepositAmount(value, userBalance?.value, assetDecimals);
        if (!newValidation.isValid && newValidation.error) {
          setValidationError(newValidation.error);
        }
      }
    }
  }, [userBalance?.value, assetDecimals]);

  const handleMaxClick = useCallback(() => {
    if (userBalance && assetDecimals !== undefined) {
      setDepositAmount(formatUnits(userBalance.value, assetDecimals));
      setValidationError(undefined);
    }
  }, [userBalance, assetDecimals]);

  // Transaction setup
  const depositCalls = useMemo(() => {
    if (!address || !depositAmount || !asset || assetDecimals === undefined || !validation.isValid || !vaultAddress) {
      return [];
    }
    
    return generateDepositCalls(
      depositAmount,
      address,
      asset,
      allowance,
      assetDecimals,
      vaultAddress as `0x${string}`
    );
  }, [address, depositAmount, asset, allowance, assetDecimals, validation.isValid, vaultAddress]);

  const handleSuccess = useCallback((response?: TransactionResponse) => {
    if (response) {
      console.log(`Deposit successful: ${response.transactionReceipts[0].transactionHash}`);
    }
    setDepositAmount("");
    setValidationError(undefined);
    onClose();
    // Call the parent success handler to refresh data
    onSuccess?.();
  }, [onClose, onSuccess]);

  // Reset form when modal closes
  const handleClose = useCallback(() => {
    setDepositAmount("");
    setValidationError(undefined);
    onClose();
  }, [onClose]);

  // Render transaction button based on context
  const renderTransactionButton = () => {
    if (!address) {
      return (
        <div className="text-center py-4">
          <p className="text-[#021043] mb-4">Connect your wallet to deposit</p>
          {isInMiniApp && (
            <ConnectWallet>
              <button className="px-6 py-3 bg-[#2B51E8] hover:bg-blue-700 text-white rounded-xl font-medium transition-colors">
                Connect Wallet
              </button>
            </ConnectWallet>
          )}
        </div>
      );
    }

    if (!depositAmount || depositAmount === "0" || !validation.isValid) {
      return (
        <button className="w-full py-3 px-4 bg-gray-300 text-gray-500 rounded-xl font-medium cursor-not-allowed">
          {validationError || "Deposit"}
        </button>
      );
    }

    // Use Mini App transaction flow if in Mini App context
    if (isInMiniApp) {
      return (
        <Transaction
          calls={depositCalls}
          onSuccess={handleSuccess}
          onError={(error: TransactionError) => console.error("Deposit failed:", error)}
        >
          <TransactionButton 
            className="w-full py-3 px-4 bg-[#2B51E8] hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            text="Deposit"
          />
          <TransactionStatus>
            <TransactionStatusAction />
            <TransactionStatusLabel />
          </TransactionStatus>
          <TransactionToast className="mb-4">
            <TransactionToastIcon />
            <TransactionToastLabel />
            <TransactionToastAction />
          </TransactionToast>
        </Transaction>
      );
    }

    // Use external wallet flow for regular web context
    return (
      <ExternalWalletDeposit
        depositAmount={depositAmount}
        asset={asset}
        address={address}
        allowance={allowance}
        assetSymbol={assetSymbol}
        assetDecimals={assetDecimals}
        userBalance={userBalance?.value}
        selectedVault={selectedVault}
        onSuccess={handleSuccess}
      />
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Deposit">
      {/* APY Display */}
      <div className="text-center mb-6">
        <div className="text-[25.6px] leading-[21px] font-medium text-[#021043] mb-1" style={{ fontFamily: 'Public Sans', letterSpacing: '-0.02em' }}>
          {apyLoading ? "Loading..." : 
           apyError ? "N/A" : 
           apy !== undefined ? `${apy.toFixed(2)}%` : "N/A"}
        </div>
        <div className="text-[16.64px] leading-[21px] text-[#021043] opacity-80" style={{ fontFamily: 'Public Sans', letterSpacing: '-0.02em' }}>
          Current Variable APY
        </div>
      </div>

      {/* Input Container */}
      <div className="bg-[rgba(245,246,254,0.35)] border border-[rgba(189,201,248,0.5)] rounded-xl p-6 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <input
              type="text"
              value={depositAmount}
              onChange={handleAmountChange}
              placeholder="0"
              className="text-[25px] leading-[35px] font-semibold text-[#021043] bg-transparent border-none outline-none w-full placeholder-[#8C9EE4]"
              style={{ fontFamily: 'Public Sans' }}
            />
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            {/* Token Selector */}
            <div className="flex items-center space-x-3 px-2 py-1 rounded-full">
              <Image 
                src="/usdc-logo.svg"
                alt="USDC Logo"
                width={25}
                height={25}
                className="w-6 h-6"
              />
              <span className="text-[17px] leading-[26px] font-medium text-[#021043]" style={{ fontFamily: 'Public Sans' }}>
                {assetSymbol || "USDC"}
              </span>
            </div>
            
            {/* Balance */}
            {address && (
              <button
                onClick={userBalance ? handleMaxClick : undefined}
                className={`flex items-center space-x-1 px-2 py-1 text-[12px] leading-[18px] text-[#021043] rounded transition-colors ${
                  userBalance ? 'hover:bg-[rgba(255,255,255,0.3)] cursor-pointer' : 'cursor-default'
                }`}
                style={{ fontFamily: 'Public Sans' }}
                disabled={!userBalance}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H9a2 2 0 00-2 2v2M7 13h10l4 8H3l4-8z" />
                </svg>
                <span>
                  {userBalance 
                    ? formatBalance(userBalance.value, assetDecimals || 6)
                    : "Switch Network"
                  }
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Validation Error Display */}
      {validationError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
          <p className="text-sm text-red-700">{validationError}</p>
        </div>
      )}

      {/* Transaction Button */}
      {renderTransactionButton()}
    </Modal>
  );
}