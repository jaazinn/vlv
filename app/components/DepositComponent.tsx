// app/components/DepositComponent.tsx
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
import { useAccount, useSwitchChain } from "wagmi";
import Image from "next/image";

// Import utilities and components
import { useVaultData } from "../hooks/useVaultData";
import { useMiniAppContext } from "../hooks/useMiniAppContext";
import { useVaultApy } from "../hooks/useYieldsData";
import { validateDepositAmount } from "../utils/validation";
import { generateDepositCalls } from "../utils/transactions";
import { formatBalance } from "../utils/formatting";
import { getVaultAddress, isChainSupported, getVaultName, VaultConfig, getDefaultChainId } from "../utils/addresses";
import { useChainId } from "wagmi";
import { ExternalWalletDeposit } from "./ExternalWalletDeposit";
import { CurrentAllocationCard } from "./CurrentAllocationCard";
import { DepositModal } from "./DepositModal";
import { WithdrawModal } from "./WithdrawModal";

interface DepositComponentProps {
  selectedVault?: VaultConfig;
}

export function DepositComponent({ selectedVault }: DepositComponentProps) {
  const { isInMiniApp, isLoading: contextLoading } = useMiniAppContext();
  const { address, chain } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [depositAmount, setDepositAmount] = useState("");
  const [validationError, setValidationError] = useState<string | undefined>();
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // Get network-specific vault address and name - use selectedVault if provided
  const vaultAddress = selectedVault 
    ? selectedVault.vaultAddress
    : (isChainSupported(chainId) ? getVaultAddress(chainId) : null);
  const vaultName = selectedVault 
    ? selectedVault.name
    : (isChainSupported(chainId) ? getVaultName(chainId) : "Very Liquid USDC");
  
  // Check network compatibility - use chain.id like navbar for consistency
  const actualChainId = chain?.id;
  const isOnSupportedNetwork = actualChainId ? isChainSupported(actualChainId) : false;
  const isOnCorrectNetwork = selectedVault 
    ? (isOnSupportedNetwork && actualChainId === selectedVault.chainId)
    : isOnSupportedNetwork;
  
  // Debug logging
  // console.log('🐛 DepositComponent Network Debug (FIXED):', {
  //   'useChainId()': chainId,
  //   'actualChainId (chain?.id)': actualChainId,
  //   'useAccount().chain?.name': chain?.name,
  //   'isOnSupportedNetwork': isOnSupportedNetwork,
  //   selectedVault: selectedVault?.id,
  //   selectedVaultChainId: selectedVault?.chainId,
  //   isOnCorrectNetwork,
  //   'actualChainId === selectedVault.chainId': selectedVault ? actualChainId === selectedVault.chainId : 'N/A'
  // });

  
  // Get network name for display
  const getNetworkName = (chainId: number) => {
    switch (chainId) {
      case 8453: return 'Base';
      case 1: return 'Ethereum';
      default: return 'Unknown Network';
    }
  };
  
  // Handle network switching
  const handleNetworkSwitch = useCallback(() => {
    if (switchChain) {
      const targetChainId = selectedVault ? selectedVault.chainId : getDefaultChainId();
      switchChain({ chainId: targetChainId });
    }
  }, [selectedVault, switchChain]);

  // Use custom hook for all vault data
  const {
    asset,
    assetDecimals,
    assetSymbol,
    userBalance,
    convertedAssets,
    allowance,
    hasShares,
    userShares,
    refetchUserData,
  } = useVaultData(selectedVault);

  // Get APY data for the vault
  const { apy, isLoading: apyLoading, error: apyError } = useVaultApy(vaultAddress || undefined);

  // Validation with memoization
  const validation = useMemo(() => 
    validateDepositAmount(depositAmount, userBalance?.value, assetDecimals), 
    [depositAmount, userBalance?.value, assetDecimals]
  );

  // Event handlers for first-time deposit flow
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

  // Transaction setup for first-time deposit flow
  const depositCalls = useMemo(() => {
    if (!address || !depositAmount || !asset || assetDecimals === undefined || !validation.isValid || !vaultAddress) {
      return [];
    }
    
    return generateDepositCalls(
      depositAmount,
      address,
      asset as `0x${string}`,
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
    // Refresh user data to show updated balances
    refetchUserData();
  }, [refetchUserData]);

  // Reusable header component
  const VaultHeader = () => (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center mb-2">
        <h2 className="text-[32px] leading-[57px] font-normal text-[#021043]" style={{ fontFamily: 'Public Sans', letterSpacing: '-0.02em' }}>
          {vaultName}
        </h2>
      </div>
      <p className="text-[12.8px] leading-[21px] text-center text-[#021043] opacity-80" style={{ fontFamily: 'Public Sans', letterSpacing: '-0.02em' }}>
        This vault deploys to highly-rated variable-rate vaults while ensuring full withdrawability at all times. Learn more.
      </p>
    </div>
  );

  // Loading state - show consistent UI during context detection
  if (contextLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-[#C5D3FF] to-[#8CA0DC] backdrop-blur rounded-[20px] border border-[#BDC9F8] p-8">
            <VaultHeader />
            
            <div className="text-center mb-6">
              <div className="text-[25.6px] leading-[21px] font-medium text-[#021043] mb-1" style={{ fontFamily: 'Public Sans', letterSpacing: '-0.02em' }}>
                5.54%
              </div>
              <div className="text-[16.64px] leading-[21px] text-[#021043] opacity-80" style={{ fontFamily: 'Public Sans', letterSpacing: '-0.02em' }}>
                Current Variable APY
              </div>
            </div>

            <div className="bg-[rgba(245,246,254,0.35)] border border-[rgba(189,201,248,0.5)] rounded-xl p-6 mb-6">
              <div className="flex justify-center items-center h-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#021043]"></div>
              </div>
            </div>

            <button className="w-full py-3 px-4 bg-gray-300 text-gray-500 rounded-xl font-medium cursor-not-allowed">
              Loading...
            </button>
          </div>
          <CurrentAllocationCard selectedVault={selectedVault} />
        </div>
      </div>
    );
  }

  // Render transaction button for first-time deposit flow
  const renderFirstTimeDepositButton = () => {
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

    // Show network switch button if on wrong or unsupported network
    if (!isOnCorrectNetwork) {
      const targetChainId = selectedVault ? selectedVault.chainId : getDefaultChainId();
      const targetNetworkName = getNetworkName(targetChainId);
      
      return (
        <button 
          onClick={handleNetworkSwitch}
          className="w-full py-3 px-4 bg-[#2B51E8] hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
        >
          Switch to {targetNetworkName}
        </button>
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
        asset={asset as `0x${string}`}
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

  // Render existing deposits view with action buttons
  const renderExistingDepositsView = () => (
    <div className="bg-gradient-to-br from-[#C5D3FF] to-[#8CA0DC] backdrop-blur rounded-[20px] border border-[#BDC9F8] p-8">
      <VaultHeader />

      {/* Your Deposits Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[19.2px] leading-[21px] text-[#021043]" style={{ fontFamily: 'Public Sans', letterSpacing: '-0.02em' }}>
            Your Deposits
          </span>
          <span className="text-[19.2px] leading-[21px] text-[#021043]" style={{ fontFamily: 'Public Sans', letterSpacing: '-0.02em' }}>
            Your APY
          </span>
        </div>
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-1">
            <span className="text-[25.6px] leading-[21px] font-light text-[#021043]" style={{ fontFamily: 'Public Sans', letterSpacing: '-0.02em' }}>
              $
            </span>
            <span className="text-[25.6px] leading-[21px] text-[#021043]" style={{ fontFamily: 'Public Sans', letterSpacing: '-0.02em' }}>
              {convertedAssets && assetDecimals !== undefined ? formatBalance(convertedAssets, assetDecimals) : "0"}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-[25.6px] leading-[21px] text-[#021043]" style={{ fontFamily: 'Public Sans', letterSpacing: '-0.02em' }}>
              {apyLoading ? "..." : 
               apyError ? "N/A" : 
               apy !== undefined ? apy.toFixed(2) : "N/A"}
            </span>
            <span className="text-[25.6px] leading-[21px] font-light text-[#021043]" style={{ fontFamily: 'Public Sans', letterSpacing: '-0.02em' }}>
              %+
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={() => setIsWithdrawModalOpen(true)}
          className="flex-1 py-3 px-4 transition-colors hover:bg-[rgba(255,255,255,0.1)] text-black border border-[#5B73BD] rounded-xl transition-colors"
        >
          Withdraw
        </button>
        {!isOnCorrectNetwork ? (
          <button
            onClick={handleNetworkSwitch}
            className="flex-1 py-3 px-4 bg-[#2B51E8] hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          >
            Switch to {getNetworkName(selectedVault ? selectedVault.chainId : getDefaultChainId())}
          </button>
        ) : (
          <button
            onClick={() => setIsDepositModalOpen(true)}
            className="flex-1 py-3 px-4 bg-[#2B51E8] hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          >
            Deposit More
          </button>
        )}
      </div>
    </div>
  );

  // Render first-time deposit view
  const renderFirstTimeDepositView = () => (
    <div className="bg-gradient-to-br from-[#C5D3FF] to-[#8CA0DC] backdrop-blur rounded-[20px] border border-[#BDC9F8] p-8">
      <VaultHeader />

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
      {renderFirstTimeDepositButton()}
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="space-y-4">
        {/* Main Card - Different view based on whether user has deposits */}
        {hasShares && convertedAssets ? renderExistingDepositsView() : renderFirstTimeDepositView()}

        {/* Current Allocation Card */}
        <CurrentAllocationCard selectedVault={selectedVault} />

        {/* Modals */}
        <DepositModal
          isOpen={isDepositModalOpen}
          onClose={() => setIsDepositModalOpen(false)}
          isInMiniApp={isInMiniApp}
          asset={asset as `0x${string}`}
          assetDecimals={assetDecimals}
          assetSymbol={assetSymbol}
          userBalance={userBalance}
          allowance={allowance}
          selectedVault={selectedVault}
          onSuccess={refetchUserData}
        />

        <WithdrawModal
          isOpen={isWithdrawModalOpen}
          onClose={() => setIsWithdrawModalOpen(false)}
          isInMiniApp={isInMiniApp}
          asset={asset as `0x${string}`}
          assetDecimals={assetDecimals}
          assetSymbol={assetSymbol}
          convertedAssets={convertedAssets}
          userShares={userShares}
          selectedVault={selectedVault}
          onSuccess={refetchUserData}
        />
      </div>
    </div>
  );
}