import { parseUnits } from "viem";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates if a deposit amount is valid given the user's balance
 */
export const validateDepositAmount = (
  amount: string,
  userBalance: bigint | undefined,
  assetDecimals: number | undefined
): ValidationResult => {
  if (!amount || amount === "0") {
    return { isValid: false };
  }

  // Check if balance data is actually loaded (undefined vs 0)
  if (userBalance === undefined || assetDecimals === undefined) {
    return { isValid: false, error: "Balance not loaded" };
  }

  try {
    const amountBigInt = parseUnits(amount, assetDecimals);
    if (amountBigInt > userBalance) {
      return { isValid: false, error: "Insufficient balance" };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, error: "Invalid amount" };
  }
};

/**
 * Validates if a withdrawal amount is valid given the user's vault shares
 */
export const validateWithdrawAmount = (
  amount: string,
  userShares: bigint | undefined,
  shareDecimals: number = 18
): ValidationResult => {
  if (!amount || amount === "0") {
    return { isValid: false };
  }

  // Check if shares data is actually loaded (undefined vs 0)
  if (userShares === undefined) {
    return { isValid: false, error: "Shares not loaded" };
  }

  // If user has no shares (0), show appropriate message
  if (userShares === BigInt(0)) {
    return { isValid: false, error: "No shares to withdraw" };
  }

  try {
    const amountBigInt = parseUnits(amount, shareDecimals);
    if (amountBigInt > userShares) {
      return { isValid: false, error: "Insufficient shares" };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, error: "Invalid amount" };
  }
};

/**
 * Checks if an amount is considered a "dust" amount (too small to be worth transacting)
 */
export const isDustAmount = (
  amount: string,
  decimals: number,
  dustThreshold: number = 0.01 // $0.01 USD
): boolean => {
  try {
    const numAmount = parseFloat(amount);
    return numAmount > 0 && numAmount < dustThreshold;
  } catch {
    return false;
  }
};