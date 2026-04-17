import { defineChain } from 'viem'

export const anvil = defineChain({
  id: 31337,
  name: 'Anvil Local',
  network: 'anvil',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://localhost:8545'],
    },
    public: {
      http: ['http://localhost:8545'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: '' },
  },
  testnet: true,
})

export type SupportedChainKey = 'base' | 'arbitrum' | 'sepolia' | 'anvil'

export const CHAIN_IDS = {
  base: 8453,
  arbitrum: 42161,
  sepolia: 11155111,
  anvil: 31337,
} as const

export function getChainKey(chainId?: number): SupportedChainKey {
  switch (chainId) {
    case CHAIN_IDS.base:
      return 'base'
    case CHAIN_IDS.arbitrum:
      return 'arbitrum'
    case CHAIN_IDS.sepolia:
      return 'sepolia'
    case CHAIN_IDS.anvil:
    default:
      return 'anvil'
  }
}
