import { parseAbi } from 'viem'

// Vault Contract ABI (Day 2 - ERC20 Support)
export const VAULT_ABI = parseAbi([
  // ETH functions
  'function deposit() external payable',
  'function withdraw(uint256 amount) external',
  'function balances(address) external view returns (uint256)',
  // ERC20 functions
  'function depositToken(address token, uint256 amount) external',
  'function withdrawToken(address token, uint256 amount) external',
  'function getTokenBalance(address token, address user) external view returns (uint256)',
  'function tokenBalances(address, address) external view returns (uint256)',
  // Events
  'event Deposited(address indexed user, uint256 amount)',
  'event Withdrawn(address indexed user, uint256 amount)',
  'event TokenDeposited(address indexed user, address indexed token, uint256 amount)',
  'event TokenWithdrawn(address indexed user, address indexed token, uint256 amount)',
])

// Contract Addresses
export const VAULT_ADDRESS = '0x1291Be112d480055DaFd8a610b7d1e203891C274' as const

// MockUSDT (ERC20 Token) ABI
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

// MockUSDT Token Address
export const MOCK_USDT_ADDRESS = '0x4c5859f0F772848b2D91F1D83E2Fe57935348029' as const