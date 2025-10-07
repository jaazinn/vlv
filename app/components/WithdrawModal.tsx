// app/components/WithdrawModal.tsx
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

import { validateWithdrawAmount } from "../utils/validation";
import { generateWithdrawCalls } from "../utils/transactions";
import { formatBalance } from "../utils/formatting";
import { getVaultAddress, isChainSupported, VaultConfig } from "../utils/addresses";
import { ExternalWalletWithdraw } from "./ExternalWalletWithdraw";
import { Modal } from "./Modal";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInMiniApp: boolean;
  asset: `0x${string}` | undefined;
  assetDecimals: number | undefined;
  assetSymbol: string | undefined;
  convertedAssets: bigint | undefined;
  userShares: bigint | undefined;
  selectedVault?: VaultConfig;
  onSuccess?: () => void;
}

export function WithdrawModal({
  isOpen,
  onClose,
  isInMiniApp,
//   asset,
  assetDecimals,
  assetSymbol,
  convertedAssets,
//   userShares,
  selectedVault,
  onSuccess,
}: WithdrawModalProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [validationError, setValidationError] = useState<string | undefined>();

  // Get network-specific vault address
  const vaultAddress = isChainSupported(chainId) ? getVaultAddress(chainId) : null;

  // Validation with memoization
  const validation = useMemo(() => 
    validateWithdrawAmount(withdrawAmount, convertedAssets, assetDecimals), 
    [withdrawAmount, convertedAssets, assetDecimals]
  );

  // Event handlers
  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setWithdrawAmount(value);
      setValidationError(undefined);
      
      if (value && value !== "0") {
        const newValidation = validateWithdrawAmount(value, convertedAssets, assetDecimals);
        if (!newValidation.isValid && newValidation.error) {
          setValidationError(newValidation.error);
        }
      }
    }
  }, [convertedAssets, assetDecimals]);

  const handleMaxClick = useCallback(() => {
    if (convertedAssets && assetDecimals !== undefined) {
      setWithdrawAmount(formatUnits(convertedAssets, assetDecimals));
      setValidationError(undefined);
    }
  }, [convertedAssets, assetDecimals]);

  // Transaction setup
  const withdrawCalls = useMemo(() => {
    if (!address || !withdrawAmount || assetDecimals === undefined || !validation.isValid || !vaultAddress) {
      return [];
    }
    
    return generateWithdrawCalls(
      withdrawAmount,
      address,
      address,
      assetDecimals,
      vaultAddress as `0x${string}`
    );
  }, [address, withdrawAmount, assetDecimals, validation.isValid, vaultAddress]);

  const handleSuccess = useCallback((response?: TransactionResponse) => {
    if (response) {
      console.log(`Withdraw successful: ${response.transactionReceipts[0].transactionHash}`);
    }
    setWithdrawAmount("");
    setValidationError(undefined);
    onClose();
    // Call the parent success handler to refresh data
    onSuccess?.();
  }, [onClose, onSuccess]);

  // Reset form when modal closes
  const handleClose = useCallback(() => {
    setWithdrawAmount("");
    setValidationError(undefined);
    onClose();
  }, [onClose]);

  // Render transaction button based on context
  const renderTransactionButton = () => {
    if (!address) {
      return (
        <div className="text-center py-4">
          <p className="text-[#021043] mb-4">Connect your wallet to withdraw</p>
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

    if (!withdrawAmount || withdrawAmount === "0" || !validation.isValid) {
      return (
        <button className="w-full py-3 px-4 bg-gray-300 text-gray-500 rounded-xl font-medium cursor-not-allowed">
          {validationError || "Withdraw"}
        </button>
      );
    }

    // Use Mini App transaction flow if in Mini App context
    if (isInMiniApp) {
      return (
        <Transaction
          calls={withdrawCalls}
          onSuccess={handleSuccess}
          onError={(error: TransactionError) => console.error("Withdraw failed:", error)}
        >
          <TransactionButton 
            className="w-full py-3 px-4 bg-[#2B51E8] hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            text="Withdraw"
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
      <ExternalWalletWithdraw
        withdrawAmount={withdrawAmount}
        address={address}
        assetSymbol={assetSymbol}
        assetDecimals={assetDecimals}
        convertedAssets={convertedAssets}
        selectedVault={selectedVault}
        onSuccess={handleSuccess}
      />
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Withdraw">
      {/* Input Container */}
      <div className="bg-[rgba(245,246,254,0.35)] border border-[rgba(189,201,248,0.5)] rounded-xl p-6 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <input
              type="text"
              value={withdrawAmount}
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
            
            {/* Available to Withdraw */}
            {address && (
              <button
                onClick={convertedAssets ? handleMaxClick : undefined}
                className={`flex items-center space-x-1 px-2 py-1 text-[12px] leading-[18px] text-[#021043] rounded transition-colors ${
                  convertedAssets ? 'hover:bg-[rgba(255,255,255,0.3)] cursor-pointer' : 'cursor-default'
                }`}
                style={{ fontFamily: 'Public Sans' }}
                disabled={!convertedAssets}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H9a2 2 0 00-2 2v2M7 13h10l4 8H3l4-8z" />
                </svg>
                <span>
                  {convertedAssets 
                    ? formatBalance(convertedAssets, assetDecimals || 6)
                    : "Loading..."
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