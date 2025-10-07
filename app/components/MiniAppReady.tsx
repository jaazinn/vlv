// app/components/MiniAppReady.tsx
"use client";

import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useMiniAppContext } from '../hooks/useMiniAppContext';

interface MiniAppReadyProps {
  children: React.ReactNode;
}

/**
 * Component that handles the SDK ready() call for Mini Apps
 * This is required to hide the splash screen and show the app content
 */
export function MiniAppReady({ children }: MiniAppReadyProps) {
  const { isInMiniApp, isLoading } = useMiniAppContext();
  const [isReady, setIsReady] = useState(false);
  const [readyCallMade, setReadyCallMade] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const callReady = async () => {
      if (isInMiniApp && !readyCallMade && !isLoading) {
        try {
          // Wait a bit to ensure the app is fully loaded
          timeoutId = setTimeout(async () => {
            try {
              await sdk.actions.ready();
              console.log('✅ MiniApp SDK ready() called successfully');
              setIsReady(true);
              setReadyCallMade(true);
            } catch (error) {
              console.warn('⚠️ Failed to call SDK ready():', error);
              // Even if ready() fails, show the content to prevent infinite loading
              setIsReady(true);
              setReadyCallMade(true);
            }
          }, 100); // Small delay to ensure DOM is ready
        } catch (error) {
          console.warn('Error setting up SDK ready call:', error);
          setIsReady(true);
          setReadyCallMade(true);
        }
      } else if (!isInMiniApp && !isLoading) {
        // Not in MiniApp, no need to call ready()
        setIsReady(true);
        setReadyCallMade(true);
      }
    };

    callReady();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isInMiniApp, isLoading, readyCallMade]);

  // Show loading state until ready() is called or we determine we're not in a MiniApp
  if (!isReady && isInMiniApp) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#181930]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-sm opacity-70">Loading Mini App...</p>
        </div>
      </div>
    );
  }

  // Show the app content once ready
  return <>{children}</>;
}