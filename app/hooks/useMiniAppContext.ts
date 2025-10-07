// app/hooks/useMiniAppContext.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { sdk } from '@farcaster/miniapp-sdk';

interface MiniAppContextState {
  isInMiniApp: boolean;
  isLoading: boolean;
  context: unknown; // OnchainKit context
  sdk: typeof sdk | null; // MiniApp SDK instance
}

/**
 * Efficient hook to determine Mini App context with caching and fast short-circuiting
 * Now uses the new @farcaster/miniapp-sdk
 */
export function useMiniAppContext(timeoutMs: number = 100): MiniAppContextState {
  const { context, isFrameReady } = useMiniKit();
  const [state, setState] = useState<MiniAppContextState>({
    isInMiniApp: false,
    isLoading: true,
    context: null,
    sdk: null
  });

  const checkMiniAppContext = useCallback(async () => {
    // Fast short-circuit checks
    if (typeof window === 'undefined') {
      // Server-side rendering
      setState({ 
        isInMiniApp: false, 
        isLoading: false, 
        context: null,
        sdk: null
      });
      return;
    }

    // Check if we're in an iframe or ReactNative WebView
    const isInIframe = window.self !== window.top;
    const isInReactNativeWebView = !!(window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
    
    if (!isInIframe && !isInReactNativeWebView) {
      // Not in potential Mini App environment
      setState({ 
        isInMiniApp: false, 
        isLoading: false, 
        context: null,
        sdk: null
      });
      return;
    }

    // Check if MiniApp SDK is available
    let sdkInstance: typeof sdk | null = null;
    try {
      // The SDK is automatically available when imported
      sdkInstance = sdk;
    } catch (error) {
      console.warn('MiniApp SDK not available:', error);
    }

    // If OnchainKit has already determined context, use it
    if (context || sdkInstance) {
      setState({ 
        isInMiniApp: true, 
        isLoading: false, 
        context,
        sdk: sdkInstance
      });
      return;
    }

    // For potential Mini App environments, do a timeout-based check
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), timeoutMs);
    });

    const contextPromise = new Promise<boolean>((resolve) => {
      // Check for Mini App specific APIs/behaviors
      const checkInterval = setInterval(() => {
        if (context || isFrameReady || sdk) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 10);

      // Cleanup interval after timeout
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, timeoutMs);
    });

    try {
      const isMiniApp = await Promise.race([contextPromise, timeoutPromise]);
      setState({ 
        isInMiniApp: isMiniApp, 
        isLoading: false, 
        context: isMiniApp ? context : null,
        sdk: isMiniApp && sdk ? sdk : null
      });
    } catch (error) {
      console.warn('Mini App context check failed:', error);
      setState({ 
        isInMiniApp: false, 
        isLoading: false, 
        context: null,
        sdk: null
      });
    }
  }, [context, isFrameReady, timeoutMs]);

  useEffect(() => {
    checkMiniAppContext();
  }, [checkMiniAppContext]);

  // Update when OnchainKit context changes
  useEffect(() => {
    if (context && !state.isInMiniApp) {
      setState(prevState => ({ 
        ...prevState,
        isInMiniApp: true, 
        isLoading: false, 
        context,
        sdk: sdk || null
      }));
    }
  }, [context, state.isInMiniApp]);

  return state;
}