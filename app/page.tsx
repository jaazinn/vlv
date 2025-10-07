"use client";

import { useMiniKit, useAddFrame } from "@coinbase/onchainkit/minikit";
import { useEffect, useState, useCallback } from "react";
import { NavBar } from "./components/Navbar";
import { VaultHomePage } from "./components/VaultHomePage";
import { MiniAppReady } from "./components/MiniAppReady";
import { useMiniAppContext } from "./hooks/useMiniAppContext";
import { Footer } from "./components/Footer";

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

export default function App() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const { isInMiniApp, isLoading } = useMiniAppContext();
  const [frameAdded, setFrameAdded] = useState(false);
  const addFrame = useAddFrame();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  const handleAddFrame = useCallback(async () => {
    const result = await addFrame();
    setFrameAdded(Boolean(result));
  }, [addFrame]);

  const showSaveButton = context && !(context as unknown as FarcasterMiniAppContext)?.client?.added && !frameAdded && isInMiniApp;

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
        <VaultHomePage />
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