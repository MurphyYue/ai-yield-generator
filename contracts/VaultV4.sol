// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IStrategy.sol";

contract VaultV4 is ERC4626, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");

    uint256 public constant MAX_PERFORMANCE_FEE = 2_000;

    mapping(address => bool) public blacklisted;
    mapping(bytes32 => bool) public largeWithdrawalApproved;
    mapping(address => uint256) public withdrawalNonce;

    uint256 public depositCap;
    uint256 public largeWithdrawalThreshold;
    uint256 public performanceFeeBps = 1_000;
    uint256 public strategyPrincipal;
    address public feeTreasury;

    IStrategy public strategy;

    event Blacklisted(address indexed account, bool indexed status);
    event StrategySet(address indexed strategy);
    event Invested(uint256 amount);
    event Divested(uint256 requestedAmount, uint256 receivedAmount);
    event DepositCapUpdated(uint256 oldCap, uint256 newCap);
    event LargeWithdrawalRequested(address indexed user, address indexed receiver, uint256 assets, uint256 nonce, bytes32 requestHash);
    event LargeWithdrawalApproved(address indexed user, address indexed receiver, uint256 assets, uint256 nonce, bytes32 requestHash);
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event PerformanceFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event FeeTreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event PerformanceFeeAccrued(uint256 realizedProfit, uint256 feeAssets, uint256 feeShares);

    constructor(address asset_, address initialTreasury)
        ERC20("Yield Navigator Vault Share", "ynUSDC")
        ERC4626(IERC20(asset_))
    {
        require(asset_ != address(0), "Invalid asset");
        require(initialTreasury != address(0), "Invalid treasury");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(TREASURER_ROLE, msg.sender);

        feeTreasury = initialTreasury;
        largeWithdrawalThreshold = 10_000 * 10 ** IERC20Metadata(asset_).decimals();
    }

    function pause() external onlyRole(MANAGER_ROLE) whenNotPaused {
        _pause();
    }

    function unpause() external onlyRole(MANAGER_ROLE) whenPaused {
        _unpause();
    }

    function grantManagerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MANAGER_ROLE, account);
    }

    function grantOperatorRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(OPERATOR_ROLE, account);
    }

    function grantTreasurerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(TREASURER_ROLE, account);
    }

    function revokeRole(bytes32 role, address account) public override onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(role, account);
    }

    function blacklist(address account) external onlyRole(MANAGER_ROLE) {
        blacklisted[account] = true;
        emit Blacklisted(account, true);
    }

    function unblacklist(address account) external onlyRole(MANAGER_ROLE) {
        blacklisted[account] = false;
        emit Blacklisted(account, false);
    }

    function totalAssets() public view override returns (uint256) {
        uint256 idleAssets = IERC20(asset()).balanceOf(address(this));
        if (address(strategy) == address(0)) {
            return idleAssets;
        }
        return idleAssets + strategy.totalAssets();
    }

    function maxDeposit(address receiver) public view override returns (uint256) {
        if (paused() || blacklisted[receiver]) {
            return 0;
        }

        if (depositCap == 0) {
            return type(uint256).max;
        }

        uint256 assets_ = totalAssets();
        if (assets_ >= depositCap) {
            return 0;
        }

        return depositCap - assets_;
    }

    function maxMint(address receiver) public view override returns (uint256) {
        uint256 maxAssets = maxDeposit(receiver);
        if (maxAssets == type(uint256).max) {
            return type(uint256).max;
        }
        return convertToShares(maxAssets);
    }

    function maxWithdraw(address owner) public view override returns (uint256) {
        if (paused() || blacklisted[owner]) {
            return 0;
        }

        uint256 ownerAssets = previewRedeem(balanceOf(owner));
        uint256 idleAssets = IERC20(asset()).balanceOf(address(this));
        return ownerAssets < idleAssets ? ownerAssets : idleAssets;
    }

    function maxRedeem(address owner) public view override returns (uint256) {
        if (paused() || blacklisted[owner]) {
            return 0;
        }

        uint256 idleAssets = IERC20(asset()).balanceOf(address(this));
        uint256 liquidityLimitedShares = convertToShares(idleAssets);
        uint256 ownerShares = balanceOf(owner);
        return ownerShares < liquidityLimitedShares ? ownerShares : liquidityLimitedShares;
    }

    function deposit(uint256 assets, address receiver) public override nonReentrant whenNotPaused returns (uint256) {
        _requireNotBlacklisted(_msgSender());
        _requireNotBlacklisted(receiver);
        return super.deposit(assets, receiver);
    }

    function mint(uint256 shares, address receiver) public override nonReentrant whenNotPaused returns (uint256) {
        _requireNotBlacklisted(_msgSender());
        _requireNotBlacklisted(receiver);
        return super.mint(shares, receiver);
    }

    function withdraw(uint256 assets, address receiver, address owner)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256)
    {
        _requireNotBlacklisted(_msgSender());
        _requireNotBlacklisted(receiver);
        _requireNotBlacklisted(owner);
        return super.withdraw(assets, receiver, owner);
    }

    function redeem(uint256 shares, address receiver, address owner)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256)
    {
        _requireNotBlacklisted(_msgSender());
        _requireNotBlacklisted(receiver);
        _requireNotBlacklisted(owner);
        return super.redeem(shares, receiver, owner);
    }

    function setStrategy(address newStrategy) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newStrategy != address(0), "Invalid strategy");
        require(IStrategy(newStrategy).underlyingToken() == asset(), "Strategy asset mismatch");
        strategy = IStrategy(newStrategy);
        emit StrategySet(newStrategy);
    }

    function setDepositCap(uint256 newCap) external onlyRole(TREASURER_ROLE) {
        uint256 oldCap = depositCap;
        depositCap = newCap;
        emit DepositCapUpdated(oldCap, newCap);
    }

    function setLargeWithdrawalThreshold(uint256 newThreshold) external onlyRole(TREASURER_ROLE) {
        uint256 oldThreshold = largeWithdrawalThreshold;
        largeWithdrawalThreshold = newThreshold;
        emit ThresholdUpdated(oldThreshold, newThreshold);
    }

    function setFeeTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newTreasury != address(0), "Invalid treasury");
        address oldTreasury = feeTreasury;
        feeTreasury = newTreasury;
        emit FeeTreasuryUpdated(oldTreasury, newTreasury);
    }

    function setPerformanceFee(uint256 newFeeBps) external onlyRole(TREASURER_ROLE) {
        require(newFeeBps <= MAX_PERFORMANCE_FEE, "Fee exceeds maximum");
        uint256 oldFeeBps = performanceFeeBps;
        performanceFeeBps = newFeeBps;
        emit PerformanceFeeUpdated(oldFeeBps, newFeeBps);
    }

    function getWithdrawalRequestHash(address owner, address receiver, uint256 assets, uint256 nonce)
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(owner, receiver, assets, nonce));
    }

    function requestLargeWithdrawal(uint256 assets, address receiver) external whenNotPaused {
        _requireNotBlacklisted(msg.sender);
        require(assets >= largeWithdrawalThreshold, "Below threshold");

        uint256 nonce = withdrawalNonce[msg.sender];
        bytes32 requestHash = getWithdrawalRequestHash(msg.sender, receiver, assets, nonce);
        emit LargeWithdrawalRequested(msg.sender, receiver, assets, nonce, requestHash);
    }

    function approveLargeWithdrawal(address owner, address receiver, uint256 assets, uint256 nonce)
        external
        onlyRole(TREASURER_ROLE)
    {
        bytes32 requestHash = getWithdrawalRequestHash(owner, receiver, assets, nonce);
        largeWithdrawalApproved[requestHash] = true;
        emit LargeWithdrawalApproved(owner, receiver, assets, nonce, requestHash);
    }

    function invest(uint256 amount) external nonReentrant whenNotPaused onlyRole(OPERATOR_ROLE) {
        require(address(strategy) != address(0), "No strategy set");
        require(amount > 0, "Amount must be > 0");
        require(IERC20(asset()).balanceOf(address(this)) >= amount, "Insufficient idle assets");

        IERC20(asset()).safeTransfer(address(strategy), amount);
        bool success = strategy.deposit(amount);
        require(success, "Strategy deposit failed");

        strategyPrincipal += amount;
        emit Invested(amount);
    }

    function divest(uint256 amount, uint256 minAmountOut) external nonReentrant whenNotPaused onlyRole(OPERATOR_ROLE) {
        require(address(strategy) != address(0), "No strategy set");
        require(amount > 0, "Amount must be > 0");

        uint256 strategyAssetsBefore = strategy.totalAssets();
        require(strategyAssetsBefore >= amount, "Insufficient strategy balance");

        uint256 principalBefore = strategyPrincipal;
        uint256 principalPortion = strategyAssetsBefore == 0 ? 0 : (amount * principalBefore) / strategyAssetsBefore;
        if (principalPortion > principalBefore) {
            principalPortion = principalBefore;
        }

        uint256 balanceBefore = IERC20(asset()).balanceOf(address(this));
        bool success = strategy.withdraw(amount);
        require(success, "Strategy withdraw failed");

        uint256 received = IERC20(asset()).balanceOf(address(this)) - balanceBefore;
        require(received >= minAmountOut, "Slippage: received less than minAmountOut");

        strategyPrincipal = principalBefore - principalPortion;

        uint256 realizedProfit = received > principalPortion ? received - principalPortion : 0;
        if (realizedProfit > 0 && performanceFeeBps > 0) {
            uint256 feeAssets = (realizedProfit * performanceFeeBps) / 10_000;
            if (feeAssets > 0) {
                uint256 feeShares = previewDeposit(feeAssets);
                if (feeShares > 0) {
                    _mint(feeTreasury, feeShares);
                    emit PerformanceFeeAccrued(realizedProfit, feeAssets, feeShares);
                }
            }
        }

        emit Divested(amount, received);
    }

    function emergencyDivest() external nonReentrant onlyRole(DEFAULT_ADMIN_ROLE) {
        require(address(strategy) != address(0), "No strategy set");
        bool success = strategy.emergencyWithdraw();
        require(success, "Emergency withdraw failed");
        strategyPrincipal = 0;
    }

    function getStrategyBalance() external view returns (uint256) {
        if (address(strategy) == address(0)) {
            return 0;
        }
        return strategy.totalAssets();
    }

    function getIdleAssets() external view returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }

    function _withdraw(address caller, address receiver, address owner, uint256 assets, uint256 shares)
        internal
        override
    {
        require(IERC20(asset()).balanceOf(address(this)) >= assets, "Insufficient vault liquidity - divest first");

        if (assets >= largeWithdrawalThreshold) {
            uint256 nonce = withdrawalNonce[owner];
            bytes32 requestHash = getWithdrawalRequestHash(owner, receiver, assets, nonce);
            require(largeWithdrawalApproved[requestHash], "Large withdrawal requires treasurer approval");
            delete largeWithdrawalApproved[requestHash];
            unchecked {
                withdrawalNonce[owner] = nonce + 1;
            }
        }

        super._withdraw(caller, receiver, owner, assets, shares);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (value > 0) {
            if (paused()) {
                revert("Vault is paused");
            }
            if (from != address(0) && blacklisted[from]) {
                revert("Address is blacklisted");
            }
            if (to != address(0) && blacklisted[to]) {
                revert("Address is blacklisted");
            }
        }
        super._update(from, to, value);
    }

    function _requireNotBlacklisted(address account) internal view {
        require(!blacklisted[account], "Address is blacklisted");
    }
}
