// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/VaultV4.sol";
import "../contracts/AaveStrategy.sol";

interface IVerifiedAToken {
    function UNDERLYING_ASSET_ADDRESS() external view returns (address);
    function POOL() external view returns (address);
}

contract VerifyDeploymentScript is Script {
    uint256 internal constant BASE_CHAIN_ID = 8453;

    function run() external view {
        require(block.chainid == BASE_CHAIN_ID, "Verification requires Base");
        VaultV4 vault = VaultV4(vm.envAddress("VAULT_V4"));
        AaveStrategy strategy = AaveStrategy(vm.envAddress("AAVE_STRATEGY"));
        address expectedAsset = vm.envAddress("USDC_ADDRESS");
        address expectedPool = vm.envAddress("AAVE_POOL_ADDRESS");
        address expectedAToken = vm.envAddress("ATOKEN_ADDRESS");

        require(address(vault).code.length > 0 && address(strategy).code.length > 0, "Deployment has no code");
        require(expectedAsset.code.length > 0 && expectedPool.code.length > 0, "Dependency has no code");
        require(expectedAToken.code.length > 0, "aToken has no code");
        require(vault.asset() == expectedAsset, "Vault asset mismatch");
        require(address(vault.strategy()) == address(strategy), "Vault strategy mismatch");
        require(strategy.underlyingToken() == expectedAsset, "Strategy asset mismatch");
        require(strategy.aavePool() == expectedPool, "Strategy pool mismatch");
        require(strategy.aToken() == expectedAToken, "Strategy aToken mismatch");
        require(IVerifiedAToken(expectedAToken).UNDERLYING_ASSET_ADDRESS() == expectedAsset, "aToken asset mismatch");
        require(IVerifiedAToken(expectedAToken).POOL() == expectedPool, "aToken pool mismatch");
        require(vault.hasRole(vault.DEFAULT_ADMIN_ROLE(), vm.envAddress("ADMIN_ADDRESS")), "Admin role mismatch");
        require(vault.hasRole(vault.MANAGER_ROLE(), vm.envAddress("MANAGER_ADDRESS")), "Manager role mismatch");
        require(vault.hasRole(vault.OPERATOR_ROLE(), vm.envAddress("OPERATOR_ADDRESS")), "Operator role mismatch");
        require(vault.hasRole(vault.TREASURER_ROLE(), vm.envAddress("TREASURER_ADDRESS")), "Treasurer role mismatch");
        require(vault.paused(), "Vault must start paused");
        require(vault.depositCap() > 0 && vault.depositCap() <= 50e6, "Unsafe deposit cap");
    }
}
