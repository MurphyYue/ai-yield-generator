import { createConfig } from "ponder";
import { VaultV3_ABI } from "./abis/VaultV3Abi";

export default createConfig({
  chains: {
    base: {
      id: 8453,
      rpc: process.env.PONDER_RPC_URL_8453,
      maxRequestsPerSecond: 4,    // Alchemy free tier: ~300 CU/s, eth_getLogs costs 75 CU
      ethGetLogsBlockRange: 2000,   // Alchemy free tier hard limit: 10 blocks per eth_getLogs
    },
  },
  contracts: {
    VaultV3: {
      chain: "base",
      abi: VaultV3_ABI,
      address: "0xF0E2c34BF85d4C6cCDA7e872669836bFDBa2ef66",
      startBlock: 44728466,
    },
  },
});
