import { parseAbi } from 'viem'

// Vault Contract ABI
export const VAULT_ABI = parseAbi([
  'function deposit() external payable',
  'function withdraw(uint256 amount) external',
  'function balances(address) external view returns (uint256)',
  'event Deposited(address indexed user, uint256 amount)',
  'event Withdrawn(address indexed user, uint256 amount)',
])

// Contract Address
export const VAULT_ADDRESS = '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318' as const