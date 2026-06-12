import { keccak256, parseAbi, stringToHex } from 'viem'
import { type SupportedChainKey, CHAIN_IDS } from './chains'
import { USDC_ARBITRUM, USDC_BASE } from './aave'

export const VAULT_ABI = parseAbi([
  'function asset() external view returns (address)',
  'function totalAssets() external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function deposit(uint256 assets, address receiver) external returns (uint256)',
  'function mint(uint256 shares, address receiver) external returns (uint256)',
  'function withdraw(uint256 assets, address receiver, address owner) external returns (uint256)',
  'function redeem(uint256 shares, address receiver, address owner) external returns (uint256)',
  'function convertToShares(uint256 assets) external view returns (uint256)',
  'function convertToAssets(uint256 shares) external view returns (uint256)',
  'function previewDeposit(uint256 assets) external view returns (uint256)',
  'function previewMint(uint256 shares) external view returns (uint256)',
  'function previewWithdraw(uint256 assets) external view returns (uint256)',
  'function previewRedeem(uint256 shares) external view returns (uint256)',
  'function maxDeposit(address receiver) external view returns (uint256)',
  'function maxMint(address receiver) external view returns (uint256)',
  'function maxWithdraw(address owner) external view returns (uint256)',
  'function maxRedeem(address owner) external view returns (uint256)',
  'function paused() external view returns (bool)',
  'function blacklisted(address account) external view returns (bool)',
  'function depositCap() external view returns (uint256)',
  'function largeWithdrawalThreshold() external view returns (uint256)',
  'function performanceFeeBps() external view returns (uint256)',
  'function feeTreasury() external view returns (address)',
  'function strategyPrincipal() external view returns (uint256)',
  'function strategy() external view returns (address)',
  'function getStrategyBalance() external view returns (uint256)',
  'function getIdleAssets() external view returns (uint256)',
  'function withdrawalNonce(address account) external view returns (uint256)',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function pause() external',
  'function unpause() external',
  'function blacklist(address account) external',
  'function unblacklist(address account) external',
  'function requestLargeWithdrawal(uint256 assets, address receiver) external',
  'function approveLargeWithdrawal(address owner, address receiver, uint256 assets, uint256 nonce) external',
  'function setDepositCap(uint256 cap) external',
  'function setLargeWithdrawalThreshold(uint256 newThreshold) external',
  'function setFeeTreasury(address treasury) external',
  'function setPerformanceFee(uint256 newFeeBps) external',
  'function setStrategy(address strategy) external',
  'function invest(uint256 amount) external',
  'function divest(uint256 amount, uint256 minAmountOut) external',
  'function emergencyDivest() external',
  'event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)',
  'event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)',
  'event StrategySet(address indexed strategy)',
  'event Invested(uint256 amount)',
  'event Divested(uint256 requestedAmount, uint256 receivedAmount)',
  'event DepositCapUpdated(uint256 oldCap, uint256 newCap)',
  'event LargeWithdrawalRequested(address indexed user, address indexed receiver, uint256 assets, uint256 nonce, bytes32 requestHash)',
  'event LargeWithdrawalApproved(address indexed user, address indexed receiver, uint256 assets, uint256 nonce, bytes32 requestHash)',
  'event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold)',
  'event PerformanceFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps)',
  'event FeeTreasuryUpdated(address indexed oldTreasury, address indexed newTreasury)',
  'event PerformanceFeeAccrued(uint256 realizedProfit, uint256 feeAssets, uint256 feeShares)',
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

export const ROLE_IDS = {
  manager: keccak256(stringToHex('MANAGER_ROLE')),
  operator: keccak256(stringToHex('OPERATOR_ROLE')),
  treasurer: keccak256(stringToHex('TREASURER_ROLE')),
} as const

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

  if (normalized === USDC_BASE.toLowerCase() || normalized === USDC_ARBITRUM.toLowerCase()) {
    return '2'
  }

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
