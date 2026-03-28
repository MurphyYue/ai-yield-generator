import { http } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { anvil } from './chains'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'

const isSepolia = process.env.NEXT_PUBLIC_CHAIN === 'sepolia'
console.log(`Using ${isSepolia ? 'Sepolia' : 'Anvil'} network`)
const activeChain = isSepolia ? sepolia : anvil
const rpcUrl = isSepolia ? (process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL ?? 'https://rpc.sepolia.org') : 'http://localhost:8545'

export const config = getDefaultConfig({
  appName: 'Web3 Vault Dashboard',
  projectId: '3f9e6a7456cd481a9675fc18856e96e3',
  chains: [activeChain],
  transports: {
    [activeChain.id]: http(rpcUrl),
  },
})
