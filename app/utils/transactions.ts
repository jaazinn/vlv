import { parseUnits, encodeFunctionData } from "viem";
import { erc4626ABI, erc20ABI } from "../abi/erc4626";

export interface TransactionCall {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
}

/**
 * Generates the transaction calls needed for a deposit
 * Includes approval if needed
 */
export function generateDepositCalls(
  amount: string,
  recipient: `0x${string}`,
  asset: `0x${string}`,
  allowance: bigint | undefined,
  assetDecimals: number,
  vaultAddress: `0x${string}`
): TransactionCall[] {
  try {
    const amountBigInt = parseUnits(amount, assetDecimals);
    const calls: TransactionCall[] = [];
    
    // Add approval call if needed
    if (!allowance || allowance < amountBigInt) {
      calls.push({
        to: asset,
        data: encodeFunctionData({
          abi: erc20ABI,
          functionName: "approve",
          args: [vaultAddress, amountBigInt],
        }),
        value: BigInt(0),
      });
    }
    
    // Add deposit call
    calls.push({
      to: vaultAddress,
      data: encodeFunctionData({
        abi: erc4626ABI,
        functionName: "deposit",
        args: [amountBigInt, recipient],
      }),
      value: BigInt(0),
    });
    
    return calls;
  } catch (error) {
    console.error("Error generating deposit calls:", error);
    return [];
  }
}

/**
 * Generates the transaction calls needed for a withdrawal
 */
export function generateWithdrawCalls(
  amount: string,
  recipient: `0x${string}`,
  owner: `0x${string}`,
  assetDecimals: number,
  vaultAddress: `0x${string}`
): TransactionCall[] {
  try {
    const amountBigInt = parseUnits(amount, assetDecimals);
    
    return [{
      to: vaultAddress,
      data: encodeFunctionData({
        abi: erc4626ABI,
        functionName: "withdraw",
        args: [amountBigInt, recipient, owner],
      }),
      value: BigInt(0),
    }];
  } catch (error) {
    console.error("Error generating withdraw calls:", error);
    return [];
  }
}

/**
 * Generates the transaction calls needed for a redemption (redeem shares)
 */
export function generateRedeemCalls(
  shares: string,
  recipient: `0x${string}`,
  owner: `0x${string}`,
  shareDecimals: number = 18,
  vaultAddress: `0x${string}`
): TransactionCall[] {
  try {
    const sharesBigInt = parseUnits(shares, shareDecimals);
    
    return [{
      to: vaultAddress,
      data: encodeFunctionData({
        abi: erc4626ABI,
        functionName: "redeem",
        args: [sharesBigInt, recipient, owner],
      }),
      value: BigInt(0),
    }];
  } catch (error) {
    console.error("Error generating redeem calls:", error);
    return [];
  }
}