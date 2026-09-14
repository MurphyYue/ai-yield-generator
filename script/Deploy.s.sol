// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console2.sol";
import "../contracts/VaultV4.sol";
import "../contracts/AaveStrategy.sol";
import "../contracts/MockERC20.sol";
import "../contracts/mocks/MockAavePool.sol";
import "../contracts/mocks/MockAToken.sol";

contract DeployScript is Script {
    uint256 internal constant BASE_CHAIN_ID = 8453;
    uint256 internal constant ANVIL_CHAIN_ID = 31337;
    uint256 internal constant DEFAULT_CANARY_CAP = 50e6;
    address internal constant BASE_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address internal constant BASE_AAVE_POOL = 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5;

    function run() external {
        uint256 chainId = block.chainid;
        require(chainId == BASE_CHAIN_ID || chainId == ANVIL_CHAIN_ID, "Unsupported deployment chain");
        uint256 cap = vm.envOr("VAULT_DEPOSIT_CAP", DEFAULT_CANARY_CAP);
        address token;
        address pool;

        vm.startBroadcast();
        if (chainId == BASE_CHAIN_ID) {
            token = BASE_USDC;
            pool = BASE_AAVE_POOL;
            require(token.code.length > 0 && pool.code.length > 0, "Base dependency has no code");
        } else {
            MockERC20 localToken = new MockERC20(1_000_000_000e6);
            MockAavePool localPool = new MockAavePool();
            token = address(localToken);
            pool = address(localPool);
            localPool.configureReserve(token, address(new MockAToken(token, pool)));
            console2.log("Local MockERC20:", token);
            console2.log("Local MockAavePool:", pool);
        }

        VaultV4 vault = new VaultV4(token);
        AaveStrategy strategy = new AaveStrategy(address(vault), token, pool);
        vault.setStrategy(address(strategy));
        vault.setDepositCap(cap);
        vault.pause();
        vm.stopBroadcast();

        console2.log("Chain ID:", chainId);
        console2.log("VaultV4:", address(vault));
        console2.log("AaveStrategy:", address(strategy));
        console2.log("Asset:", token);
        console2.log("Aave Pool:", pool);
        console2.log("Deposit cap:", cap);
        console2.log("Paused: true");
    }
}
