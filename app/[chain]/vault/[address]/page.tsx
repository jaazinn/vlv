"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { findVaultByAddress, findVaultBySlug, getVaultUrl } from "../../../utils/addresses";

export default function VaultRedirectPage() {
  const params = useParams();
  
  const chain = params.chain as string;
  const addressOrSlug = params.address as string;
  
  useEffect(() => {
    // First try to find vault by address (if it looks like an address - starts with 0x)
    let vault = null;
    
    if (addressOrSlug.startsWith('0x')) {
      vault = findVaultByAddress(chain, addressOrSlug);
    } else {
      // If it doesn't start with 0x, treat it as a slug
      vault = findVaultBySlug(chain, addressOrSlug);
    }
    
    if (vault) {
      // Redirect to the full URL with both address and slug
      const fullUrl = getVaultUrl(vault);
      window.location.replace(fullUrl);
    } else {
      // If vault not found, redirect to home
      window.location.replace('/');
    }
  }, [chain, addressOrSlug]);

  // Show loading state while redirecting
  return (
    <div className="flex flex-col min-h-screen bg-[#181930] items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p className="text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}