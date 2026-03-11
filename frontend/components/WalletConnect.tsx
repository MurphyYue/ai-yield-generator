'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useDisconnect } from 'wagmi'

export function WalletConnect() {
  const { isConnected, address } = useAccount()
  const { disconnect } = useDisconnect()

  return (
    <div className="flex items-center gap-4">
      <ConnectButton showBalance={true} />
      {isConnected && address && (
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
        >
          Disconnect
        </button>
      )}
    </div>
  )
}
