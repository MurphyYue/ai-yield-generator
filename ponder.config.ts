import { createConfig } from "ponder";

import { VaultV3_ABI } from "./abis/VaultV3Abi";

export default createConfig({
  chains: {
    anvil: {
      id: 31337,
      rpc: process.env.PONDER_RPC_URL_31337 ?? "http://localhost:8545",
    },
  },
  contracts: {
    VaultV3: {
      chain: "anvil",
      abi: VaultV3_ABI,
      address: "0xf5059a5D33d5853360D16C683c16e67980206f36",
      startBlock: 1,
    },
  },
});
