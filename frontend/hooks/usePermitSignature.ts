'use client'

import { useCallback, useState } from 'react'
import { useWalletClient, usePublicClient } from 'wagmi'
import { ERC20_PERMIT_ABI } from '@/lib/vault'

// EIP-2612 Permit types
export interface PermitSignature {
  v: number
  r: `0x${string}`
  s: `0x${string}`
  deadline: bigint
}

export interface UsePermitSignatureResult {
  signPermit: (
    tokenAddress: `0x${string}`,
    spenderAddress: `0x${string}`,
    amount: bigint
  ) => Promise<PermitSignature | null>
  isLoading: boolean
  error: Error | null
}

/**
 * Hook for generating EIP-2612 permit signatures
 * Enables gasless token approvals for one-step deposits
 */
export function usePermitSignature(): UsePermitSignatureResult {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  /**
   * Sign an EIP-2612 permit message
   * @param tokenAddress The ERC20 token address
   * @param spenderAddress The address to approve (vault)
   * @param amount The amount to approve
   * @returns Permit signature components (v, r, s, deadline)
   */
  const signPermit = useCallback(
    async (
      tokenAddress: `0x${string}`,
      spenderAddress: `0x${string}`,
      amount: bigint
    ): Promise<PermitSignature | null> => {
      if (!walletClient) {
        setError(new Error('Wallet not connected'))
        return null
      }

      if (!publicClient) {
        setError(new Error('Public client not available'))
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        // Get connected account
        const [account] = await walletClient.getAddresses()
        if (!account) {
          setError(new Error('No account found'))
          setIsLoading(false)
          return null
        }

        // Fetch token name and chain ID using public client
        const [tokenName, chainId] = await Promise.all([
          publicClient.readContract({
            address: tokenAddress,
            abi: ERC20_PERMIT_ABI,
            functionName: 'name',
          }),
          publicClient.getChainId(),
        ])

        // Build EIP-712 domain separator
        const domain = {
          name: tokenName as string,
          version: '1',
          chainId: chainId,
          verifyingContract: tokenAddress,
        } as const

        // Build EIP-2612 Permit types
        const types = {
          Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
          ],
        } as const

        // Fetch current nonce from contract
        const currentNonce = (await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_PERMIT_ABI,
          functionName: 'nonces',
          args: [account],
        })) as bigint

        // Set deadline (30 minutes from now) - must be bigint for EIP-2612
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 30 * 60)

        // Build permit struct (EIP-2612)
        const message = {
          owner: account,
          spender: spenderAddress,
          value: amount,
          nonce: currentNonce,
          deadline: deadline,
        } as const

        // Sign the permit message (off-chain, no gas)
        const signature = await walletClient.signTypedData({
          domain,
          types,
          primaryType: 'Permit',
          message,
        })

        // Split signature into v, r, s components
        // Signature format: r (32 bytes) + s (32 bytes) + v (1 byte)
        const r = `0x${signature.slice(2, 66)}` as `0x${string}`
        const s = `0x${signature.slice(66, 130)}` as `0x${string}`
        const v = parseInt(signature.slice(130, 132), 16)

        setIsLoading(false)
        return { v, r, s, deadline }
      } catch (err) {
        console.error('Error signing permit:', err)
        setError(err instanceof Error ? err : new Error('Failed to sign permit'))
        setIsLoading(false)
        return null
      }
    },
    [walletClient, publicClient]
  )

  return {
    signPermit,
    isLoading,
    error,
  }
}
