import { parseAbi } from 'viem'

// VaultV3 Contract ABI (Day 3 - SoD Architecture with AccessControl)
export const VAULT_ABI = parseAbi([
  // ETH functions
  'function deposit() external payable',
  'function withdraw(uint256 amount) external',
  'function balances(address) external view returns (uint256)',
  // ERC20 functions
  'function depositToken(address token, uint256 amount) external',
  'function withdrawToken(address token, uint256 amount) external',
  'function depositWithPermit(address token, uint256 amount, address owner, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external',
  'function getTokenBalance(address token, address user) external view returns (uint256)',
  'function tokenBalances(address, address) external view returns (uint256)',
  // Day 3: Role management functions
  'function grantManagerRole(address account) external',
  'function grantOperatorRole(address account) external',
  'function grantTreasurerRole(address account) external',
  'function hasManagerRole(address account) external view returns (bool)',
  'function hasOperatorRole(address account) external view returns (bool)',
  'function hasTreasurerRole(address account) external view returns (bool)',
  // Day 3: Manager functions
  'function pause() external',
  'function unpause() external',
  'function paused() external view returns (bool)',
  'function blacklist(address account) external',
  'function unblacklist(address account) external',
  'function blacklisted(address) external view returns (bool)',
  // Day 3: Treasurer functions
  'function approveLargeWithdrawal(address user, uint256 amount, bytes32 requestHash) external',
  'function setWithdrawalFee(uint256 newFee) external',
  'function setLargeWithdrawalThreshold(uint256 newThreshold) external',
  'function largeWithdrawalThreshold() external view returns (uint256)',
  'function withdrawalFee() external view returns (uint256)',
  'function getWithdrawalRequestHash(address user, uint256 amount) external view returns (bytes32)',
  'function largeWithdrawalApproved(bytes32) external view returns (bool)',
  // Events
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

// VaultV3 Contract Address (Day 4 - Deployed with EIP-2612 Permit)
export const VAULT_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as const

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

// ERC20 Permit ABI (EIP-2612)
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
  'function name() external view returns (string)',
  'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external',
  'function nonces(address owner) external view returns (uint256)',
  'function DOMAIN_SEPARATOR() external view returns (bytes32)',
  'function version() external view returns (string)',
])

// MockUSDT Token Address (Day 4 - Deployed with ERC20Permit)
export const MOCK_USDT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3' as const