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

interface RheoApiResponse {
  [chainId: string]: {
    [poolName: string]: number;
  };
}

// Map chain IDs to chain names
const CHAIN_ID_MAP: Record<string, string> = {
  "8453": "Base",
  "1": "Ethereum",
};

// Map Rheo pool names to our vault symbols
const POOL_NAME_MAP: Record<string, Record<string, string>> = {
  "8453": {
    "VLV-Core": "VLVCOREUSDC",
  },
  "1": {
    "VLV-Core": "VLVCOREUSDC",
    "VLV-Frontier": "VLVFRONTIERUSDC",
  },
};

const fetchYieldsData = unstable_cache(
  async (): Promise<YieldsPool[]> => {
    const response = await fetch("https://api.rheo.xyz/pool-apy", {
      headers: {
        "User-Agent": "VLV-Farcaster-MiniApp/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch yields data: ${response.statusText}`);
    }

    const data: RheoApiResponse = await response.json();

    // Transform Rheo API data to match our YieldsPool interface
    const yieldsData: YieldsPool[] = [];

    for (const [chainId, pools] of Object.entries(data)) {
      const chainName = CHAIN_ID_MAP[chainId];
      if (!chainName) continue;

      const chainPoolMap = POOL_NAME_MAP[chainId];
      if (!chainPoolMap) continue;

      for (const [poolName, apy] of Object.entries(pools)) {
        const symbol = chainPoolMap[poolName];
        if (!symbol) continue;

        yieldsData.push({
          chain: chainName,
          project: "vlv",
          symbol,
          tvlUsd: 0,
          apyBase: apy,
          apyReward: null,
          apy,
          rewardTokens: null,
          pool: poolName,
          apyPct1D: null,
          apyPct7D: null,
          apyPct30D: null,
          stablecoin: true,
          ilRisk: "none",
          exposure: "single",
          predictions: {
            predictedClass: null,
            predictedProbability: null,
            binnedConfidence: null,
          },
          poolMeta: "",
          mu: 0,
          sigma: 0,
          count: 0,
          outlier: false,
          underlyingTokens: ["USDC"],
          il7d: null,
          apyBase7d: null,
          apyMean30d: null,
          volumeUsd1d: null,
          volumeUsd7d: null,
          apyBaseInception: null,
        });
      }
    }

    return yieldsData;
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