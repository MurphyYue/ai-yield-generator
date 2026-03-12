// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Import OpenZeppelin standard libraries (architect standard configuration)
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Vault - Production Ready Vault with ERC20 Support
/// @notice Supports both ETH and ERC20 token deposits/withdrawals with reentrancy protection
contract Vault is Ownable, ReentrancyGuard {
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event TokenDeposited(address indexed user, address indexed token, uint256 amount);
    event TokenWithdrawn(address indexed user, address indexed token, uint256 amount);

    // ETH balances
    mapping(address => uint256) public balances;

    // ERC20 token balances: token => user => balance
    mapping(address => mapping(address => uint256)) public tokenBalances;

    // Architecture adjustment: Add constructor to initialize Ownable
    constructor() Ownable(msg.sender) {}

    // Architecture adjustment: Add receive function to handle direct transfers to contract
    receive() external payable {
        deposit();
    }

    function deposit() public payable {
        require(msg.value > 0, "Amount must be > 0");
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    // Architecture adjustment: Add nonReentrant modifier to prevent reentrancy attacks
    function withdraw(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Amount must be > 0");
        require(balances[msg.sender] >= _amount, "Insufficient balance");

        balances[msg.sender] -= _amount;

        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");

        emit Withdrawn(msg.sender, _amount);
    }

    /// @notice Deposit ERC20 tokens into the vault
    /// @param token The ERC20 token address
    /// @param amount The amount of tokens to deposit
    function depositToken(address token, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(token != address(0), "Invalid token address");

        // Transfer tokens from user to vault using transferFrom
        // User must have approved this contract to spend their tokens first
        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
        require(success, "Token transfer failed");

        // Update user's token balance
        tokenBalances[token][msg.sender] += amount;

        emit TokenDeposited(msg.sender, token, amount);
    }

    /// @notice Withdraw ERC20 tokens from the vault
    /// @param token The ERC20 token address
    /// @param amount The amount of tokens to withdraw
    function withdrawToken(address token, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(token != address(0), "Invalid token address");
        require(tokenBalances[token][msg.sender] >= amount, "Insufficient token balance");

        // Update user's token balance
        tokenBalances[token][msg.sender] -= amount;

        // Transfer tokens from vault to user
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

    // Architect reserve: Emergency pause function (example: called by Owner)
    // function pause() external onlyOwner { ... }
}
