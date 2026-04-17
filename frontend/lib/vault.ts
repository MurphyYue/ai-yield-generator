import { parseAbi } from 'viem'
import { type SupportedChainKey, CHAIN_IDS } from './chains'
import { USDC_ARBITRUM, USDC_BASE } from './aave'

export const VAULT_ABI = parseAbi([
  'function deposit() external payable',
  'function withdraw(uint256 amount) external',
  'function balances(address) external view returns (uint256)',
  'function depositToken(address token, uint256 amount) external',
  'function withdrawToken(address token, uint256 amount) external',
  'function depositWithPermit(address token, uint256 amount, address owner, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external',
  'function getTokenBalance(address token, address user) external view returns (uint256)',
  'function tokenBalances(address, address) external view returns (uint256)',
  'function grantManagerRole(address account) external',
  'function grantOperatorRole(address account) external',
  'function grantTreasurerRole(address account) external',
  'function hasManagerRole(address account) external view returns (bool)',
  'function hasOperatorRole(address account) external view returns (bool)',
  'function hasTreasurerRole(address account) external view returns (bool)',
  'function pause() external',
  'function unpause() external',
  'function paused() external view returns (bool)',
  'function blacklist(address account) external',
  'function unblacklist(address account) external',
  'function blacklisted(address) external view returns (bool)',
  'function approveLargeWithdrawal(address user, uint256 amount, bytes32 requestHash) external',
  'function setWithdrawalFee(uint256 newFee) external',
  'function setLargeWithdrawalThreshold(uint256 newThreshold) external',
  'function largeWithdrawalThreshold() external view returns (uint256)',
  'function withdrawalFee() external view returns (uint256)',
  'function getWithdrawalRequestHash(address user, uint256 amount) external view returns (bytes32)',
  'function largeWithdrawalApproved(bytes32) external view returns (bool)',
  'function setStrategy(address _strategy) external',
  'function invest(address token, uint256 amount) external',
  'function divest(uint256 amount) external',
  'function emergencyDivest() external',
  'function getTotalBalance(address token) external view returns (uint256)',
  'function getStrategyBalance() external view returns (uint256)',
  'function getVaultTokenHoldings(address token) external view returns (uint256)',
  'function strategy() external view returns (address)',
  'event Deposited(address indexed user, uint256 amount)',
  'event Withdrawn(address indexed user, uint256 amount, uint256 fee)',
  'event TokenDeposited(address indexed user, address indexed token, uint256 amount)',
  'event TokenWithdrawn(address indexed user, address indexed token, uint256 amount)',
  'event Paused(address indexed account)',
  'event Unpaused(address indexed account)',
  'event Blacklisted(address indexed account, bool indexed status)',
  'event LargeWithdrawalApproved(address indexed user, bytes32 indexed requestHash)',
  'event WithdrawalFeeUpdated(uint256 oldFee, uint256 newFee)',
  'event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold)',
])

export const ERC20_ABI = parseAbi([
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
])

export const ERC20_PERMIT_ABI = parseAbi([
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
  'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external',
  'function nonces(address owner) external view returns (uint256)',
  'function DOMAIN_SEPARATOR() external view returns (bytes32)',
  'function version() external view returns (string)',
])

export const FALLBACK_VAULT_ADDRESS = '0xf5059a5D33d5853360D16C683c16e67980206f36' as const
export const FALLBACK_MOCK_TOKEN_ADDRESS = '0x851356ae760d987E095750cCeb3bC6014560891C' as const

export function getVaultAddressForChain(chainKey: SupportedChainKey): `0x${string}` {
  switch (chainKey) {
    case 'base':
      return (process.env.NEXT_PUBLIC_BASE_VAULT_ADDRESS ??
        process.env.NEXT_PUBLIC_VAULT_ADDRESS ??
        '0xF0E2c34BF85d4C6cCDA7e872669836bFDBa2ef66') as `0x${string}`
    case 'arbitrum':
      return (process.env.NEXT_PUBLIC_ARBITRUM_VAULT_ADDRESS ??
        process.env.NEXT_PUBLIC_VAULT_ADDRESS ??
        '0xF0E2c34BF85d4C6cCDA7e872669836bFDBa2ef66') as `0x${string}`
    case 'sepolia':
    case 'anvil':
    default:
      return (process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? FALLBACK_VAULT_ADDRESS) as `0x${string}`
  }
}

export function getStableTokenAddressForChain(chainKey: SupportedChainKey): `0x${string}` {
  switch (chainKey) {
    case 'base':
      return USDC_BASE
    case 'arbitrum':
      return USDC_ARBITRUM
    case 'sepolia':
    case 'anvil':
    default:
      return (process.env.NEXT_PUBLIC_USDT_ADDRESS ?? FALLBACK_MOCK_TOKEN_ADDRESS) as `0x${string}`
  }
}

export function getStableTokenSymbolForChain(chainKey: SupportedChainKey): 'USDC' | 'USDT' {
  return chainKey === 'base' || chainKey === 'arbitrum' ? 'USDC' : 'USDT'
}

export function getPermitVersionForToken(tokenAddress: `0x${string}`): string {
  const normalized = tokenAddress.toLowerCase()

  // Circle USDC on Base and Arbitrum follows the FiatTokenV2 family and expects EIP-712 version "2".
  if (
    normalized === USDC_BASE.toLowerCase() ||
    normalized === USDC_ARBITRUM.toLowerCase()
  ) {
    return '2'
  }

  // Default to "1" for mock/test tokens and older permit-enabled ERC20s unless explicitly overridden.
  return '1'
}

export function getDefaultChainIdFromEnv(): number {
  switch (process.env.NEXT_PUBLIC_CHAIN) {
    case 'base':
      return CHAIN_IDS.base
    case 'arbitrum':
      return CHAIN_IDS.arbitrum
    case 'sepolia':
      return CHAIN_IDS.sepolia
    case 'anvil':
    default:
      return CHAIN_IDS.anvil
  }
}
