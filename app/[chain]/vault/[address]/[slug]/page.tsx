"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { findVaultByUrl } from "../../../../utils/addresses";
import { DepositComponent } from "../../../../components/DepositComponent";
import { NavBar } from "../../../../components/Navbar";
import { Footer } from "../../../../components/Footer";
import { MiniAppReady } from "../../../../components/MiniAppReady";
import { useMiniKit, useAddFrame } from "@coinbase/onchainkit/minikit";
import { useMiniAppContext } from "../../../../hooks/useMiniAppContext";

// Type for the MiniApp context based on Farcaster docs
type MiniAppPlatformType = 'web' | 'mobile';

type FarcasterMiniAppContext = {
  user: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
  client: {
    platformType?: MiniAppPlatformType;
    clientFid: number;
    added: boolean;
  };
};

// OnchainKit context type (for legacy frame contexts)
type OnchainKitContext = {
  client: {
    name: string;
    added: boolean;
  };
};

export default function VaultPage() {
  const params = useParams();
  const router = useRouter();
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const { isInMiniApp, isLoading } = useMiniAppContext();
  const [frameAdded, setFrameAdded] = useState(false);
  const addFrame = useAddFrame();
  
  const chain = params.chain as string;
  const address = params.address as string;
  const slug = params.slug as string;
  
  // Find vault by chain, address, and slug
  const vault = findVaultByUrl(chain, address, slug);

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // Log context for debugging
  useEffect(() => {
    if (isLoading) {
      console.log("Context: Loading...");
      return;
    }
    
    if (isInMiniApp && context) {
      const farcasterContext = context as unknown as FarcasterMiniAppContext;
      const onchainKitContext = context as unknown as OnchainKitContext;
      
      console.log("Full context object:", context);
      
      // Check for OnchainKit legacy context first (has name property)
      if (onchainKitContext?.client?.name === "farcaster") {
        console.log("Context: Farcaster");
      } else if (onchainKitContext?.client?.name === "base") {
        console.log("Context: TBA (The Base App)");
      } else if (farcasterContext?.client?.clientFid) {
        // Check for Farcaster MiniApp context (has clientFid)
        console.log(`Context: Farcaster MiniApp (FID: ${farcasterContext.client.clientFid})`);
      } else {
        console.log("Context: MiniApp (Unknown)");
      }
      
      // Log additional context details
      if (onchainKitContext?.client?.name) {
        console.log(`Client: ${onchainKitContext.client.name}`);
      }
      if (farcasterContext?.client?.clientFid) {
        console.log(`ClientFID: ${farcasterContext.client.clientFid}`);
      }
      if (farcasterContext?.user?.username) {
        console.log(`User: ${farcasterContext.user.username}`);
      }
    } else {
      console.log("Context: Web");
    }
  }, [isInMiniApp, isLoading, context]);

  const handleAddFrame = async () => {
    const result = await addFrame();
    setFrameAdded(Boolean(result));
  };

  const getNetworkName = (chainId: number) => {
    switch (chainId) {
      case 8453: return 'Base';
      case 1: return 'Ethereum';
      default: return 'Unknown Network';
    }
  };

  if (!vault) {
    return (
      <MiniAppReady>
        <div className="flex flex-col min-h-screen bg-[#181930]">
          <NavBar />
          <main className="flex-1 pt-8 px-4 max-w-7xl mx-auto">
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Vault not found</h3>
              <p className="text-gray-400 text-sm mb-4">
                The vault at &quot;{chain}/vault/{address}/{slug}&quot; doesn&apos;t exist.
              </p>
              <button
                onClick={() => router.push('/')}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
          </main>
          <Footer />
        </div>
      </MiniAppReady>
    );
  }

  const showSaveButton = context && !(context as unknown as FarcasterMiniAppContext)?.client?.added && !frameAdded && isInMiniApp;

  const AppContent = () => (
    <div className="flex flex-col min-h-screen bg-[#181930]">
      <NavBar />
      
      {/* Save Frame Button */}
      {showSaveButton && (
        <div className="flex justify-end px-4 py-2">
          <button
            onClick={handleAddFrame}
            className="inline-flex items-center space-x-1 text-sm px-3 py-1.5 rounded-md text-blue-400 hover:bg-blue-900/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Save Frame</span>
          </button>
        </div>
      )}

      {frameAdded && (
        <div className="flex justify-end px-4 py-2">
          <div className="flex items-center space-x-1 text-sm text-green-400 animate-fade-out">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Saved</span>
          </div>
        </div>
      )}
      
      <main className="flex-1 pt-8 px-4 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={() => router.push('/')}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="h-4 border-l border-gray-600"></div>
            <div>
              <h2 className="text-xl font-semibold text-white">{vault.name}</h2>
              <p className="text-sm text-gray-400">{getNetworkName(vault.chainId)}</p>
            </div>
          </div>
          
          <DepositComponent selectedVault={vault} />
        </div>
      </main>

      <Footer />
    </div>
  );

  // Wrap with MiniAppReady to handle the SDK ready() call
  return (
    <MiniAppReady>
      <AppContent />
    </MiniAppReady>
  );
}