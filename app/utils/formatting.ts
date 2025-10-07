import { formatUnits } from "viem";

/**
 * Formats a balance for display with appropriate decimal places
 */
export const formatBalance = (balance: bigint, decimals: number, maxDecimals?: number): string => {
  const formatted = formatUnits(balance, decimals);
  const defaultDecimals = decimals === 6 ? 2 : 4;
  const decimalPlaces = maxDecimals ?? defaultDecimals;
  
  return parseFloat(formatted).toFixed(decimalPlaces);
};

/**
 * Formats a balance with commas for thousands separator
 */
export const formatBalanceWithCommas = (balance: bigint, decimals: number): string => {
  const formatted = formatUnits(balance, decimals);
  const num = parseFloat(formatted);
  
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals === 6 ? 2 : 4,
    maximumFractionDigits: decimals === 6 ? 2 : 4
  });
};

/**
 * Formats a USD amount with appropriate formatting
 */
export const formatUSD = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `$${(num / 1000).toFixed(1)}K`;
  } else {
    return `$${num.toFixed(2)}`;
  }
};

/**
 * Formats a percentage with appropriate decimal places
 */
export const formatPercentage = (value: number, decimals: number = 2): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Shortens an address for display
 */
export const shortenAddress = (address: string, chars: number = 4): string => {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

/**
 * Formats APY with appropriate styling
 */
export const formatAPY = (apy: number): string => {
  if (apy >= 10) {
    return apy.toFixed(1);
  } else {
    return apy.toFixed(2);
  }
};