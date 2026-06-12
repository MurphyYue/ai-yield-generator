import { http } from 'wagmi'
import { arbitrum, base, sepolia } from 'wagmi/chains'
import { anvil, type SupportedChainKey } from './chains'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'

const DEFAULT_CHAIN = (process.env.NEXT_PUBLIC_CHAIN ?? 'anvil') as SupportedChainKey

const rpcUrls = {
  base: process.env.NEXT_PUBLIC_BASE_RPC_URL,
  arbitrum: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL,
  sepolia: process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL ?? 'https://rpc.sepolia.org',
  anvil: 'http://localhost:8545',
} as const

console.log(`Configured default frontend chain: ${DEFAULT_CHAIN}`)

export const config = getDefaultConfig({
  appName: 'Yield Navigator',
  projectId: '3f9e6a7456cd481a9675fc18856e96e3',
  chains: [base, arbitrum, sepolia, anvil],
  transports: {
    [base.id]: http(rpcUrls.base),
    [arbitrum.id]: http(rpcUrls.arbitrum),
    [sepolia.id]: http(rpcUrls.sepolia),
    [anvil.id]: http(rpcUrls.anvil),
  },
  ssr: true,
})
