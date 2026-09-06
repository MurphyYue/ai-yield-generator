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

    uint8 internal constant REQUIRED_ASSET_DECIMALS = 6;
    uint8 internal constant SHARE_DECIMALS_OFFSET = 6;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");

    /// @notice Maximum managed assets, denominated in raw underlying-asset units.
    /// @dev Zero closes deposits/mints. Max uint is the explicit unlimited sentinel.
    ///      Yield and unsolicited donations may increase totalAssets above a finite cap.
    uint256 public depositCap;
    uint256 public strategyPrincipal;

    IStrategy public strategy;

    event StrategySet(address indexed strategy);
    event Invested(uint256 amount);
    event Divested(uint256 requestedAmount, uint256 receivedAmount);
    event DepositCapUpdated(uint256 oldCap, uint256 newCap);

    error UnsupportedAssetDecimals(uint8 actualDecimals);
    error ZeroSharesForAssets(uint256 assets);

    constructor(address asset_) ERC20("Yield Navigator Vault Share", "ynUSDC") ERC4626(IERC20(asset_)) {
        require(asset_ != address(0), "Invalid asset");

        uint8 actualDecimals = IERC20Metadata(asset_).decimals();
        if (actualDecimals != REQUIRED_ASSET_DECIMALS) {
            revert UnsupportedAssetDecimals(actualDecimals);
        }

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(TREASURER_ROLE, msg.sender);
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

    function totalAssets() public view override returns (uint256) {
        uint256 idleAssets = IERC20(asset()).balanceOf(address(this));
        if (address(strategy) == address(0)) {
            return idleAssets;
        }
        return idleAssets + strategy.totalAssets();
    }

    function maxDeposit(address) public view override returns (uint256) {
        if (paused()) {
            return 0;
        }

        // Test/local fixtures may opt into unlimited inflows explicitly. A fresh
        // deployment stays fail-closed because storage defaults to zero.
        if (depositCap == type(uint256).max) {
            return type(uint256).max;
        }

        if (depositCap == 0) {
            return 0;
        }

        uint256 assets_ = totalAssets();
        if (assets_ >= depositCap) {
            return 0;
        }

        uint256 remainingAssets = depositCap - assets_;
        return previewDeposit(remainingAssets) == 0 ? 0 : remainingAssets;
    }

    function maxMint(address receiver) public view override returns (uint256) {
        uint256 maxAssets = maxDeposit(receiver);
        if (maxAssets == 0) {
            return 0;
        }
        if (maxAssets == type(uint256).max) {
            return type(uint256).max;
        }
        return convertToShares(maxAssets);
    }

    function maxWithdraw(address owner) public view override returns (uint256) {
        if (paused()) {
            return 0;
        }

        uint256 ownerShares = balanceOf(owner);
        if (ownerShares == 0) {
            return 0;
        }

        uint256 idleAssets = IERC20(asset()).balanceOf(address(this));
        if (idleAssets == 0) {
            return 0;
        }

        uint256 ownerAssets = previewRedeem(ownerShares);
        return ownerAssets < idleAssets ? ownerAssets : idleAssets;
    }

    function maxRedeem(address owner) public view override returns (uint256) {
        if (paused()) {
            return 0;
        }

        uint256 ownerShares = balanceOf(owner);
        if (ownerShares == 0) {
            return 0;
        }

        uint256 idleAssets = IERC20(asset()).balanceOf(address(this));
        if (idleAssets == 0) {
            return 0;
        }

        if (previewRedeem(ownerShares) <= idleAssets) {
            return ownerShares;
        }

        // `convertToShares(idleAssets)` rounds down and can understate the
        // largest redeemable share amount. This is the exact inverse boundary
        // for floor-rounded `previewRedeem`: max s where previewRedeem(s) <= idle.
        return previewWithdraw(idleAssets + 1) - 1;
    }

    function deposit(uint256 assets, address receiver) public override nonReentrant whenNotPaused returns (uint256) {
        return super.deposit(assets, receiver);
    }

    function mint(uint256 shares, address receiver) public override nonReentrant whenNotPaused returns (uint256) {
        return super.mint(shares, receiver);
    }

    function withdraw(uint256 assets, address receiver, address owner)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256)
    {
        return super.withdraw(assets, receiver, owner);
    }

    function redeem(uint256 shares, address receiver, address owner)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256)
    {
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

    function _decimalsOffset() internal pure override returns (uint8) {
        return SHARE_DECIMALS_OFFSET;
    }

    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal override {
        if (assets != 0 && shares == 0) {
            revert ZeroSharesForAssets(assets);
        }

        super._deposit(caller, receiver, assets, shares);
    }

    function _withdraw(address caller, address receiver, address owner, uint256 assets, uint256 shares)
        internal
        override
    {
        require(IERC20(asset()).balanceOf(address(this)) >= assets, "Insufficient vault liquidity - divest first");

        super._withdraw(caller, receiver, owner, assets, shares);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (value > 0) {
            if (paused()) {
                revert("Vault is paused");
            }
        }
        super._update(from, to, value);
    }
}
