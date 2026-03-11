import { http, createConfig } from 'wagmi'
import { anvil } from './chains'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'

export const config = getDefaultConfig({
  appName: 'Web3 Vault Dashboard',
  projectId: 'YOUR_PROJECT_ID', // Required for WalletConnect
  chains: [anvil],
  transports: {
    [anvil.id]: http(),
  },
})
