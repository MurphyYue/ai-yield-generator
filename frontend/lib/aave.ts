import { parseAbi } from 'viem'

export const AAVE_POOL_ABI = parseAbi([
  'function getReserveData(address asset) external view returns ((uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
  'function getReservesList() external view returns (address[])',
])

export const AAVE_POOL_SEPOLIA = '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951' as const
export const AAVE_POOL_BASE = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5' as const
export const AAVE_POOL_ARBITRUM = '0x794a61358D6845594F94dc1DB02A252b5b4814aD' as const

// Verified from Aave Sepolia reserve list on 2026-04-07.
export const AAVE_LISTED_USDT_SEPOLIA = '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0' as const
export const AAVE_LISTED_USDC_SEPOLIA = '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8' as const
export const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const
export const USDC_ARBITRUM = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const

// Testnet ETH has no market value; use a virtual reference price for gas-cost advice.
export const VIRTUAL_ETH_PRICE_USD = 2200
export const DEFAULT_GAS_UNITS = BigInt(200_000)
export const RAY = 1e27

export const MAINNET_AAVE_MARKETS = {
  base: {
    chainId: 8453,
    name: 'Base',
    pool: AAVE_POOL_BASE,
    usdc: USDC_BASE,
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum',
    pool: AAVE_POOL_ARBITRUM,
    usdc: USDC_ARBITRUM,
  },
} as const
