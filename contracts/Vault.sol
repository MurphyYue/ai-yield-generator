// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Import OpenZeppelin standard libraries (architect standard configuration)
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Vault - Production Ready Vault
/// @notice Introduces permission management and reentrancy protection
contract Vault is Ownable, ReentrancyGuard {
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    mapping(address => uint256) public balances;

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

    // Architect reserve: Emergency pause function (example: called by Owner)
    // function pause() external onlyOwner { ... }
}
