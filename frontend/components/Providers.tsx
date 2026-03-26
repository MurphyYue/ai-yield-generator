'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '@/lib/wagmi'
import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { ThemeProvider } from 'next-themes'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
        color: '#666'
      }}>
        Loading Web3...
      </div>
    )
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <WagmiProvider config={config}>
        <QueryClientProvider client={new QueryClient()}>
          <RainbowKitProvider>
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  )
}
