'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useDisconnect } from 'wagmi'
import { signOut } from 'next-auth/react'

export function WalletConnect() {
  const { isConnected, address } = useAccount()
  const { disconnect } = useDisconnect()

  const handleDisconnect = async () => {
    await signOut({ redirect: false })
    disconnect()
  }

  return (
    <div className="flex items-center gap-4">
      <ConnectButton showBalance={true} />
      {isConnected && address && (
        <button
          onClick={handleDisconnect}
          className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
        >
          Disconnect
        </button>
      )}
    </div>
  )
}
