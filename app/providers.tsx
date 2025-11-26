"use client";

import { type ReactNode, useEffect, useState, useMemo } from "react";
import { base, mainnet } from "wagmi/chains";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { coinbaseWallet, walletConnect } from "wagmi/connectors";

// Create a query client for React Query - singleton to prevent re-initialization
let queryClientInstance: QueryClient | null = null;
const getQueryClient = () => {
  if (!queryClientInstance) {
    queryClientInstance = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5, // 5 minutes
          refetchOnWindowFocus: false,
        },
      },
    });
  }
  return queryClientInstance;
};

// Reown/WalletConnect configuration
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "your-project-id";

// Global flags to prevent multiple initializations
let miniappInitialized = false;
let wagmiConfigCache: ReturnType<typeof createConfig> | null = null;

// Detect MiniKit context quickly
function detectMiniKitContext(): boolean {
  if (typeof window === 'undefined') return false;
  
  const isInIframe = window.self !== window.top;
  const isInReactNativeWebView = !!(window as { ReactNativeWebView?: unknown }).ReactNativeWebView;
  const hasFarcasterContext = !!(window as { farcaster?: unknown }).farcaster;
  const hasParentPostMessage = window.parent && window.parent !== window;
  
  return isInIframe || isInReactNativeWebView || hasFarcasterContext || hasParentPostMessage;
}

// Create Wagmi config with memoization to prevent re-initialization
function createWagmiConfig(isMiniKit: boolean) {
  const configKey = `${isMiniKit}-${projectId}`;
  
  if (wagmiConfigCache && (wagmiConfigCache as typeof wagmiConfigCache & { _configKey: string })._configKey === configKey) {
    return wagmiConfigCache;
  }

  const connectors = isMiniKit ? [] : [
    coinbaseWallet({
      appName: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Vault",
      appLogoUrl: process.env.NEXT_PUBLIC_ICON_URL,
      preference: "smartWalletOnly",
    }),
    walletConnect({
      projectId,
      metadata: {
        name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Vault",
        description: "Vault - ERC4626 Deposit Interface",
        url: process.env.NEXT_PUBLIC_URL || "https://localhost:3000",
        icons: [process.env.NEXT_PUBLIC_ICON_URL || ""],
      },
    }),
  ];

  wagmiConfigCache = createConfig({
    chains: [base, mainnet],
    connectors,
    transports: {
      [base.id]: http(),
      [mainnet.id]: http(process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL),
    },
  });

  // Add a marker to track which config this is
  (wagmiConfigCache as typeof wagmiConfigCache & { _configKey: string })._configKey = configKey;
  
  return wagmiConfigCache;
}

export function Providers(props: { children: ReactNode }) {
  const [isMiniKit, setIsMiniKit] = useState<boolean | null>(null);

  useEffect(() => {
    // Quick synchronous detection
    const detected = detectMiniKitContext();
    setIsMiniKit(detected);

    // Initialize MiniApp SDK only once if in MiniApp context
    if (detected && !miniappInitialized) {
      try {
        // The SDK will auto-initialize, but we can set debug mode
        if (process.env.NODE_ENV === 'development') {
          console.log('MiniApp SDK debug mode enabled');
        }
        miniappInitialized = true;
        console.log('MiniApp SDK initialized successfully');
      } catch (error) {
        console.warn('Failed to initialize MiniApp SDK:', error);
        // Don't set miniappInitialized = true on error, allow retry
      }
    }
  }, []);

  // Memoize the wagmi config to prevent re-creation on every render
  const wagmiConfig = useMemo(() => {
    if (isMiniKit === null) return null;
    return createWagmiConfig(isMiniKit);
  }, [isMiniKit]);

  // Memoize the query client
  const queryClient = useMemo(() => getQueryClient(), []);

  // Loading state
  if (isMiniKit === null || !wagmiConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#181930]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  // Always wrap with MiniKitProvider to avoid hook errors
  // But configure it appropriately based on context
  return (
    <MiniKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
      config={{
        appearance: {
          mode: "auto",
          theme: "mini-app-theme",
          name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
          logo: process.env.NEXT_PUBLIC_ICON_URL,
        },
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {props.children}
        </QueryClientProvider>
      </WagmiProvider>
    </MiniKitProvider>
  );
}