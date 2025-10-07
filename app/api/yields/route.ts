import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

interface YieldsPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase: number;
  apyReward: number | null;
  apy: number;
  rewardTokens: string[] | null;
  pool: string;
  apyPct1D: number | null;
  apyPct7D: number | null;
  apyPct30D: number | null;
  stablecoin: boolean;
  ilRisk: string;
  exposure: string;
  predictions: {
    predictedClass: string | null;
    predictedProbability: number | null;
    binnedConfidence: number | null;
  };
  poolMeta: string;
  mu: number;
  sigma: number;
  count: number;
  outlier: boolean;
  underlyingTokens: string[];
  il7d: number | null;
  apyBase7d: number | null;
  apyMean30d: number | null;
  volumeUsd1d: number | null;
  volumeUsd7d: number | null;
  apyBaseInception: number | null;
}

interface YieldsResponse {
  status: string;
  data: YieldsPool[];
}

const fetchYieldsData = unstable_cache(
  async (): Promise<YieldsPool[]> => {
    const response = await fetch("https://yields.llama.fi/pools", {
      headers: {
        "User-Agent": "VLV-Farcaster-MiniApp/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch yields data: ${response.statusText}`);
    }

    const data: YieldsResponse = await response.json();
    
    // Filter for Size Credit vaults only
    const sizeCreditVaults = data.data.filter(
      (pool) => pool.project === "size-credit"
    );

    return sizeCreditVaults;
  },
  ["yields-data"],
  {
    revalidate: 3600, // Cache for 1 hour
    tags: ["yields"],
  }
);

export async function GET() {
  try {
    const yieldsData = await fetchYieldsData();

    const response = NextResponse.json(
      { 
        status: "success",
        data: yieldsData,
        lastUpdated: new Date().toISOString()
      },
      { status: 200 }
    );

    // Set cache headers for edge caching
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );

    return response;
  } catch (error) {
    console.error("Error fetching yields data:", error);
    
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { 
        status: 500,
        headers: {
          "Cache-Control": "no-cache"
        }
      }
    );
  }
}