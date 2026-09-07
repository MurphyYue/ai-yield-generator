// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/// @title Mock Aave aToken
/// @notice A one-to-one receipt token controlled by a MockAavePool.
/// @dev This contract is test-only and does not model Aave's scaled-balance accounting.
contract MockAToken is ERC20 {
    address public immutable POOL;
    address public immutable UNDERLYING_ASSET_ADDRESS;

    uint8 private immutable _UNDERLYING_DECIMALS;
    bool public balanceOfShouldRevert;

    modifier onlyPool() {
        _checkPool();
        _;
    }

    function _checkPool() private view {
        require(msg.sender == POOL, "MockAToken: caller is not pool");
    }

    /// @param underlyingAsset The ERC-20 asset represented by this receipt token.
    /// @param pool The mock pool allowed to mint and burn receipt tokens.
    constructor(address underlyingAsset, address pool) ERC20("Mock Aave Token", "maToken") {
        require(underlyingAsset != address(0), "MockAToken: invalid underlying");
        require(pool != address(0), "MockAToken: invalid pool");

        UNDERLYING_ASSET_ADDRESS = underlyingAsset;
        POOL = pool;
        _UNDERLYING_DECIMALS = IERC20Metadata(underlyingAsset).decimals();
    }

    /// @notice Uses the underlying asset's decimals so receipt units remain one-to-one.
    function decimals() public view override returns (uint8) {
        return _UNDERLYING_DECIMALS;
    }

    /// @notice Enables a receipt-balance read failure for emergency recovery tests.
    function setBalanceOfRevert(bool shouldRevert) external {
        balanceOfShouldRevert = shouldRevert;
    }

    function balanceOf(address account) public view override returns (uint256) {
        require(!balanceOfShouldRevert, "MockAToken: balance lookup failure");
        return super.balanceOf(account);
    }

    /// @notice Mints receipt tokens after the pool receives matching underlying backing.
    function mint(address account, uint256 amount) external onlyPool {
        _mint(account, amount);
    }

    /// @notice Burns receipt tokens when the pool releases underlying backing.
    function burn(address account, uint256 amount) external onlyPool {
        _burn(account, amount);
    }
}
