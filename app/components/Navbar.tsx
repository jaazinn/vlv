// app/components/Navbar.tsx
"use client";

import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { useConnect, useDisconnect, useAccount, useSwitchChain } from "wagmi";
import { useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useMiniAppContext } from "../hooks/useMiniAppContext";
import { isChainSupported } from "../utils/addresses";
import { base } from "wagmi/chains";
import { mainnet } from "wagmi/chains";
import Image from "next/image";

// Chain selector component
function ChainSelector() {
  const { switchChain } = useSwitchChain();
  const { chain, isConnected } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Only show network warnings on vault pages (not on the main page)
  const isOnVaultPage = pathname && pathname !== '/' && pathname.includes('/vault/');

  const chains = [
    {
      id: base.id,
      name: "Base",
      logo: "/base-logo.svg",
      chain: base
    },
    {
      id: mainnet.id,
      name: "Ethereum",
      logo: "/eth-logo.svg",
      chain: mainnet
    }
  ];

  const isOnSupportedNetwork = chain ? isChainSupported(chain.id) : false;
  const shouldShowWarning = isConnected && !isOnSupportedNetwork && isOnVaultPage;
  
  const currentChain = chains.find(c => c.id === chain?.id);
  const displayChain = currentChain || { 
    id: chain?.id || 0, 
    name: chain?.name || "Unsupported Network", 
    logo: "/eth-logo.svg",
    chain: null 
  };

  const handleChainSwitch = useCallback((targetChain: typeof chains[0]) => {
    if (switchChain && targetChain.id !== chain?.id) {
      switchChain({ chainId: targetChain.id });
    }
    setIsOpen(false);
  }, [switchChain, chain?.id]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2 border rounded-lg transition-colors ${
          shouldShowWarning
            ? 'border-orange-500 bg-orange-500/10 hover:bg-orange-500/20'
            : 'border-[#5B73BD] hover:bg-[rgba(63,98,255,0.1)]'
        }`}
      >
        <Image 
          src={displayChain.logo} 
          alt={displayChain.name}
          width={20}
          height={20}
          className="w-5 h-5"
        />
        <span className={`text-sm hidden sm:inline ${
          shouldShowWarning ? 'text-orange-300' : 'text-white'
        }`}>
          {displayChain.name}
        </span>
        {shouldShowWarning && (
          <span className="px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">
            !
          </span>
        )}
        <svg className={`w-4 h-4 ${shouldShowWarning ? 'text-orange-400' : 'text-[#5B73BD]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-[#1a1b23] border border-[#5B73BD] rounded-lg shadow-xl z-50">
            {shouldShowWarning && (
              <div className="p-2 border-b border-gray-600">
                <div className="px-3 py-2 text-xs text-orange-400 font-medium">
                  Current: {displayChain.name}
                </div>
                <div className="px-3 py-1 text-xs text-gray-400">
                  Switch to a supported network:
                </div>
              </div>
            )}
            <div className="p-2">
              {chains.map((chainOption) => (
                <button
                  key={chainOption.id}
                  onClick={() => handleChainSwitch(chainOption)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-lg transition-colors ${
                    chainOption.id === chain?.id 
                      ? 'bg-[rgba(63,98,255,0.2)] text-white' 
                      : 'text-gray-300 hover:bg-[rgba(63,98,255,0.1)] hover:text-white'
                  }`}
                >
                  <Image 
                    src={chainOption.logo} 
                    alt={chainOption.name}
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                  <span className="text-sm font-medium">
                    {chainOption.name}
                  </span>
                  {chainOption.id === chain?.id && (
                    <svg className="w-4 h-4 ml-auto text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Custom wallet connect button for external contexts
function ExternalWalletConnect() {
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAccount();
  const [isOpen, setIsOpen] = useState(false);

  const handleDisconnect = useCallback(() => {
    disconnect();
    setIsOpen(false);
  }, [disconnect]);

  const handleConnect = useCallback((connector: (typeof connectors)[0]) => {
    connect({ connector });
    setIsOpen(false);
  }, [connect]);

  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-4 py-2 bg-[#C5D3FF] rounded-lg hover:bg-blue-200 transition-colors"
        >
          <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full"></div>
          <span className="text-sm font-medium text-[#021043]">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </button>
        
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
              <div className="p-3 border-b border-gray-200">
                <div className="text-xs text-gray-500 mb-1">Address</div>
                <div className="text-sm font-mono text-gray-900">
                  {address.slice(0, 8)}...{address.slice(-8)}
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-b-lg transition-colors"
              >
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="flex items-center space-x-2 px-4 py-2 bg-[#C5D3FF] rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H9a2 2 0 00-2 2v2M7 13h10l4 8H3l4-8z" />
        </svg>
        <span className="text-sm font-medium text-[#021043]">
          {isPending ? "Connecting..." : "Connect Wallet"}
        </span>
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
            <div className="p-2">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => handleConnect(connector)}
                  disabled={isPending}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {connector.name.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {connector.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Mini App wallet component
function MiniAppWallet() {
  const { address } = useAccount();

  return (
    <Wallet className="z-50">
      <ConnectWallet>
        <button className="flex items-center space-x-2 px-4 py-2 bg-[#C5D3FF] rounded-lg hover:bg-blue-200 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H9a2 2 0 00-2 2v2M7 13h10l4 8H3l4-8z" />
          </svg>
          <span className="text-sm font-medium text-[#021043]">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connect Wallet"}
          </span>
        </button>
      </ConnectWallet>
      <WalletDropdown>
        <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
          <Avatar />
          <Name />
          <Address />
          <EthBalance />
        </Identity>
        <WalletDropdownDisconnect />
      </WalletDropdown>
    </Wallet>
  );
}

// Loading wallet button for context detection phase
function LoadingWalletButton() {
  return (
    <button className="flex items-center space-x-2 px-4 py-2 bg-[#C5D3FF] rounded-lg transition-colors opacity-50">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#021043]"></div>
      <span className="text-sm font-medium text-[#021043]">Loading...</span>
    </button>
  );
}

export function NavBar() {
  const { isInMiniApp, isLoading: contextLoading } = useMiniAppContext();
  const { isConnected } = useAccount();

  const renderWalletComponent = () => {
    if (contextLoading) {
      return <LoadingWalletButton />;
    }

    return isInMiniApp ? <MiniAppWallet /> : <ExternalWalletConnect />;
  };

  return (
    <nav className="w-full bg-[#1E274780] border-b border-[rgba(159,182,250,0.2)] px-4 py-2">
      <div className="flex items-center justify-between w-full max-w-none">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-3">
              <Image
                src="/vlv-logo.svg"
                alt="VLV Logo"
                width={32}
                height={18}
                className="w-8 h-auto hidden sm:block"
              />
              <div className="flex items-baseline space-x-2">
                <h1 className="text-xl font-extrabold text-white hidden sm:block" style={{ fontFamily: 'Abhaya Libre', fontWeight: '800' }}>
                  Very Liquid Vaults
                </h1>
                {/* <div className="text-sm text-white opacity-80 hidden sm:block" style={{ fontFamily: 'Abhaya Libre' }}>
                  by Size Credit
                </div> */}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Chain Selector - Only show when wallet is connected */}
          {isConnected && <ChainSelector />}

          {/* Wallet Component - Efficiently renders based on context */}
          {renderWalletComponent()}
        </div>
      </div>
    </nav>
  );
}