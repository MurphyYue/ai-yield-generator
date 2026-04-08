import { parseAbi } from 'viem'

export const AAVE_POOL_ABI = parseAbi([
  'function getReserveData(address asset) external view returns ((uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
  'function getReservesList() external view returns (address[])',
])

export const AAVE_POOL_SEPOLIA = '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951' as const

// Verified from Aave Sepolia reserve list on 2026-04-07.
export const AAVE_LISTED_USDT_SEPOLIA = '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0' as const
export const AAVE_LISTED_USDC_SEPOLIA = '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8' as const

// Testnet ETH has no market value; use a virtual reference price for gas-cost advice.
export const VIRTUAL_ETH_PRICE_USD = 2200
export const DEFAULT_GAS_UNITS = BigInt(200_000)
export const RAY = 1e27

