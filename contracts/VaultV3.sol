// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Import OpenZeppelin standard libraries
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "./IStrategy.sol";

/// @title VaultV3 - Multi-Role Governance Vault with SoD (Separation of Duties)
/// @notice Supports both ETH and ERC20 tokens with role-based access control and emergency pause
/// @dev SoD Architecture:
///      - DEFAULT_ADMIN_ROLE (0x00, built-in): Root governance - grant/revoke roles only
///      - MANAGER_ROLE: Risk control - pause/unpause, blacklist management
///      - OPERATOR_ROLE: Daily operations - AI automation, routine transactions
///      - TREASURER_ROLE: Fund management - large withdrawal approvals, fee settings
contract VaultV3 is AccessControl, Pausable, ReentrancyGuard {
    // Custom Role Identifiers
    // Note: DEFAULT_ADMIN_ROLE is built-in (0x00), no need to redefine
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");

    // State variables
    mapping(address => uint256) public balances; // ETH balances
    mapping(address => mapping(address => uint256)) public tokenBalances; // ERC20 token balances
    mapping(address => bool) public blacklisted; // Blacklist for addresses (Manager only)

    // Large withdrawal threshold (in ETH) - requires TREASURER approval
    uint256 public largeWithdrawalThreshold = 10 ether; // 10 ETH
    // Large withdrawal requests pending approval
    mapping(bytes32 => bool) public largeWithdrawalApproved; // requestHash => approved

    // Withdrawal fee (basis points, 100 = 1%)
    uint256 public withdrawalFee = 0; // 0% by default
    uint256 public constant MAX_FEE = 1000; // Max 10%

    // ============ STRATEGY STATE ============

    /// @notice Active yield strategy (set by DEFAULT_ADMIN_ROLE)
    IStrategy public strategy;

    // Events
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount, uint256 fee);
    event TokenDeposited(address indexed user, address indexed token, uint256 amount);
    event TokenWithdrawn(address indexed user, address indexed token, uint256 amount);
    // Paused/Unpaused events are inherited from Pausable, don't redefine 
    event Blacklisted(address indexed account, bool indexed status);
    event LargeWithdrawalRequested(address indexed user, uint256 amount, bytes32 indexed requestHash);
    event LargeWithdrawalApproved(address indexed user, bytes32 indexed requestHash);
    event WithdrawalFeeUpdated(uint256 oldFee, uint256 newFee);
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    // RoleGranted event is inherited from AccessControl, don't redefine
    event StrategySet(address indexed strategy);
    event Invested(address indexed token, uint256 amount);
    event Divested(address indexed token, uint256 amount);

    /// @notice Constructor - grant all roles to deployer for initial setup
    constructor() {
        // Grant DEFAULT_ADMIN_ROLE (built-in, 0x00)
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // Grant MANAGER_ROLE (risk control)
        _grantRole(MANAGER_ROLE, msg.sender);

        // Grant OPERATOR_ROLE (daily operations)
        _grantRole(OPERATOR_ROLE, msg.sender);

        // Grant TREASURER_ROLE (fund management)
        _grantRole(TREASURER_ROLE, msg.sender);

        // Note: RoleGranted events are automatically emitted by _grantRole
    }

    // Receive function for direct ETH transfers
    receive() external payable {
        deposit();
    }

    // ============ ADMIN FUNCTIONS (DEFAULT_ADMIN_ROLE) ============

    /// @notice Grant MANAGER_ROLE to an address (Admin only)
    function grantManagerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MANAGER_ROLE, account);
        emit RoleGranted(MANAGER_ROLE, account, msg.sender);
    }

    /// @notice Grant OPERATOR_ROLE to an address (Admin only)
    function grantOperatorRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(OPERATOR_ROLE, account);
        emit RoleGranted(OPERATOR_ROLE, account, msg.sender);
    }

    /// @notice Grant TREASURER_ROLE to an address (Admin only)
    function grantTreasurerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(TREASURER_ROLE, account);
        emit RoleGranted(TREASURER_ROLE, account, msg.sender);
    }

    /// @notice Revoke any role from an address (Admin only)
    function revokeRole(bytes32 role, address account) public override onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(role, account);
    }

    // ============ MANAGER FUNCTIONS (MANAGER_ROLE) ============

    /// @notice Pause all deposit and withdraw operations (Manager only)
    function pause() external onlyRole(MANAGER_ROLE) whenNotPaused {
        _pause();
        emit Paused(msg.sender);
    }

    /// @notice Resume all deposit and withdraw operations (Manager only)
    function unpause() external onlyRole(MANAGER_ROLE) whenPaused {
        _unpause();
        emit Unpaused(msg.sender);
    }

    /// @notice Add address to blacklist (Manager only)
    function blacklist(address account) external onlyRole(MANAGER_ROLE) {
        blacklisted[account] = true;
        emit Blacklisted(account, true);
    }

    /// @notice Remove address from blacklist (Manager only)
    function unblacklist(address account) external onlyRole(MANAGER_ROLE) {
        blacklisted[account] = false;
        emit Blacklisted(account, false);
    }

    // ============ TREASURER FUNCTIONS (TREASURER_ROLE) ============

    /// @notice Approve a large withdrawal request (Treasurer only)
    /// @param user Address requesting withdrawal
    /// @param amount Amount to withdraw
    /// @param requestHash Unique hash identifying the withdrawal request
    function approveLargeWithdrawal(
        address user,
        uint256 amount,
        bytes32 requestHash
    ) external onlyRole(TREASURER_ROLE) {
        largeWithdrawalApproved[requestHash] = true;
        emit LargeWithdrawalApproved(user, requestHash);
    }

    /// @notice Set withdrawal fee (Treasurer only)
    /// @param newFee New fee in basis points (100 = 1%)
    function setWithdrawalFee(uint256 newFee) external onlyRole(TREASURER_ROLE) {
        require(newFee <= MAX_FEE, "Fee exceeds maximum");
        uint256 oldFee = withdrawalFee;
        withdrawalFee = newFee;
        emit WithdrawalFeeUpdated(oldFee, newFee);
    }

    /// @notice Set large withdrawal threshold (Treasurer only)
    function setLargeWithdrawalThreshold(uint256 newThreshold) external onlyRole(TREASURER_ROLE) {
        uint256 oldThreshold = largeWithdrawalThreshold;
        largeWithdrawalThreshold = newThreshold;
        emit ThresholdUpdated(oldThreshold, newThreshold);
    }

    // ============ STRATEGY FUNCTIONS (TREASURER / ADMIN) ============

    /// @notice Set the active yield strategy (Admin only)
    /// @dev Verifies strategy manages the right token before setting
    /// @param _strategy Address of the IStrategy implementation
    function setStrategy(address _strategy) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_strategy != address(0), "Invalid strategy address");
        strategy = IStrategy(_strategy);
        emit StrategySet(_strategy);
    }

    /// @notice Invest vault tokens into the active strategy (Treasurer only)
    /// @dev Transfers tokens to strategy, then calls strategy.deposit().
    ///      If strategy deposit fails (Aave down), tokens return to vault and this call reverts.
    ///      Normal user deposit/withdraw operations are NEVER affected.
    /// @param token ERC20 token address to invest
    /// @param amount Amount to invest
    function invest(address token, uint256 amount) external nonReentrant onlyRole(TREASURER_ROLE) {
        require(address(strategy) != address(0), "No strategy set");
        require(strategy.underlyingToken() == token, "Token mismatch with strategy");
        require(amount > 0, "Amount must be > 0");
        require(IERC20(token).balanceOf(address(this)) >= amount, "Insufficient vault balance");

        // Step 1: Move tokens from vault to strategy contract
        IERC20(token).transfer(address(strategy), amount);

        // Step 2: Tell strategy to deposit into Aave
        // Strategy's try/catch handles Aave failures and returns tokens to vault if needed
        bool success = strategy.deposit(amount);
        require(success, "Strategy deposit failed - tokens returned to vault");

        emit Invested(token, amount);
    }

    /// @notice Withdraw tokens from strategy back to vault (Treasurer only)
    /// @dev Strategy pulls from Aave and sends tokens directly to this vault.
    /// @param amount Amount to withdraw from strategy
    function divest(uint256 amount) external nonReentrant onlyRole(TREASURER_ROLE) {
        require(address(strategy) != address(0), "No strategy set");
        require(amount > 0, "Amount must be > 0");
        require(strategy.totalAssets() >= amount, "Insufficient strategy balance");

        bool success = strategy.withdraw(amount);
        require(success, "Strategy withdraw failed");

        emit Divested(strategy.underlyingToken(), amount);
    }

    /// @notice Emergency: pull all funds from strategy back to vault (Admin only)
    /// @dev Bypasses whenNotPaused — usable even in emergency pause
    function emergencyDivest() external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(address(strategy) != address(0), "No strategy set");
        bool success = strategy.emergencyWithdraw();
        require(success, "Emergency withdraw failed");
    }

    /// @notice Get combined balance: vault holdings + strategy holdings for a token
    /// @param token ERC20 token address
    /// @return Total tokens under vault management
    function getTotalBalance(address token) external view returns (uint256) {
        uint256 vaultBalance = IERC20(token).balanceOf(address(this));
        if (address(strategy) != address(0) && strategy.underlyingToken() == token) {
            return vaultBalance + strategy.totalAssets();
        }
        return vaultBalance;
    }

    /// @notice Get only the tokens currently deployed in the strategy (e.g. sitting in Aave)
    /// @return Amount in strategy; 0 if no strategy is set
    function getStrategyBalance() external view returns (uint256) {
        if (address(strategy) == address(0)) return 0;
        return strategy.totalAssets();
    }

    /// @notice Get the vault contract's idle ERC20 holdings (not counting strategy)
    /// @param token ERC20 token address
    /// @return Vault's raw ERC20 balance — decreases when invest() is called
    function getVaultTokenHoldings(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ============ CORE FUNCTIONS (Public, Pausable) ============

    /// @notice Deposit ETH into the vault
    /// @dev Pausable - can be halted in emergency
    function deposit() public payable whenNotPaused {
        require(msg.value > 0, "Amount must be > 0");
        require(!blacklisted[msg.sender], "Address is blacklisted");
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Withdraw ETH from the vault
    /// @dev Pausable, NonReentrant, checks blacklist, checks large withdrawal
    /// @param _amount Amount to withdraw
    function withdraw(uint256 _amount) external nonReentrant whenNotPaused {
        require(_amount > 0, "Amount must be > 0");
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        require(!blacklisted[msg.sender], "Address is blacklisted");

        // Check if withdrawal requires TREASURER approval
        if (_amount >= largeWithdrawalThreshold) {
            bytes32 requestHash = keccak256(abi.encodePacked(msg.sender, _amount, block.timestamp));
            require(largeWithdrawalApproved[requestHash], "Large withdrawal requires treasurer approval");
            delete largeWithdrawalApproved[requestHash]; // One-time approval
        }

        // Calculate fee
        uint256 fee = 0;
        if (withdrawalFee > 0) {
            fee = (_amount * withdrawalFee) / 10000;
        }

        uint256 amountAfterFee = _amount - fee;
        balances[msg.sender] -= _amount;

        (bool success, ) = msg.sender.call{value: amountAfterFee}("");
        require(success, "Transfer failed");

        emit Withdrawn(msg.sender, amountAfterFee, fee);
    }

    /// @notice Deposit ERC20 tokens into the vault
    /// @dev Pausable and NonReentrant
    /// @param token The ERC20 token address
    /// @param amount The amount of tokens to deposit
    function depositToken(address token, uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        require(token != address(0), "Invalid token address");
        require(!blacklisted[msg.sender], "Address is blacklisted");

        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
        require(success, "Token transfer failed");

        tokenBalances[token][msg.sender] += amount;
        emit TokenDeposited(msg.sender, token, amount);
    }

    /// @notice Deposit ERC20 tokens with EIP-2612 permit (one-step approval+deposit)
    /// @dev Pausable and NonReentrant. Uses off-chain permit signature for gasless approval.
    /// @param token The ERC20 token address
    /// @param amount The amount of tokens to deposit
    /// @param owner The owner of the tokens (signer)
    /// @param deadline The deadline for the permit signature
    /// @param v The v component of the permit signature
    /// @param r The r component of the permit signature
    /// @param s The s component of the permit signature
    function depositWithPermit(
        address token,
        uint256 amount,
        address owner,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        require(token != address(0), "Invalid token address");
        require(!blacklisted[owner], "Address is blacklisted");
        require(block.timestamp <= deadline, "Permit expired");

        // Execute permit (approves vault to spend tokens via signature)
        IERC20Permit(token).permit(owner, address(this), amount, deadline, v, r, s);

        // Transfer tokens from user to vault (now that we have approval)
        bool success = IERC20(token).transferFrom(owner, address(this), amount);
        require(success, "Token transfer failed");

        // Update balance
        tokenBalances[token][owner] += amount;
        emit TokenDeposited(owner, token, amount);
    }

    /// @notice Withdraw ERC20 tokens from the vault
    /// @dev Pausable and NonReentrant
    /// @param token The ERC20 token address
    /// @param amount The amount of tokens to withdraw
    function withdrawToken(address token, uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        require(token != address(0), "Invalid token address");
        require(tokenBalances[token][msg.sender] >= amount, "Insufficient token balance");
        require(!blacklisted[msg.sender], "Address is blacklisted");

        tokenBalances[token][msg.sender] -= amount;

        bool success = IERC20(token).transfer(msg.sender, amount);
        require(success, "Token transfer failed");

        emit TokenWithdrawn(msg.sender, token, amount);
    }

    /// @notice Get user's balance for a specific ERC20 token
    /// @param token The ERC20 token address
    /// @param user The user address
    /// @return The user's balance of the specified token
    function getTokenBalance(address token, address user) external view returns (uint256) {
        return tokenBalances[token][user];
    }

    // ============ VIEW FUNCTIONS ============

    /// @notice Check if an address has MANAGER_ROLE
    function hasManagerRole(address account) external view returns (bool) {
        return hasRole(MANAGER_ROLE, account);
    }

    /// @notice Check if an address has OPERATOR_ROLE
    function hasOperatorRole(address account) external view returns (bool) {
        return hasRole(OPERATOR_ROLE, account);
    }

    /// @notice Check if an address has TREASURER_ROLE
    function hasTreasurerRole(address account) external view returns (bool) {
        return hasRole(TREASURER_ROLE, account);
    }

    /// @notice Generate hash for large withdrawal request
    function getWithdrawalRequestHash(address user, uint256 amount) external view returns (bytes32) {
        return keccak256(abi.encodePacked(user, amount, block.timestamp));
    }
}
