// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../contracts/MockERC20.sol";
import "../contracts/VaultV3.sol";
import "../contracts/AaveStrategy.sol";
import "../contracts/mocks/MockAavePool.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy MockERC20 (USDT with Permit, 6 decimals)
        // 1,000,000 USDT = 1_000_000 * 10^6
        MockERC20 mockUsdt = new MockERC20(1_000_000 * 10 ** 6);
        console.log("MockERC20 deployed at:", address(mockUsdt));

        // 2. Deploy VaultV3
        VaultV3 vault = new VaultV3();
        console.log("VaultV3 deployed at:", address(vault));

        // 3. Deploy MockAavePool (local testing only — replace with real Aave on Sepolia)
        MockAavePool mockAavePool = new MockAavePool();
        console.log("MockAavePool deployed at:", address(mockAavePool));

        // 4. Deploy AaveStrategy
        //    - vault:    VaultV3 address (only caller allowed)
        //    - token:    MockUSDT address
        //    - aavePool: MockAavePool address (swap for 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951 on Sepolia)
        AaveStrategy aaveStrategy = new AaveStrategy(
            address(vault),
            address(mockUsdt),
            address(mockAavePool)
        );
        console.log("AaveStrategy deployed at:", address(aaveStrategy));

        // 5. Register strategy in VaultV3 (deployer has DEFAULT_ADMIN_ROLE)
        vault.setStrategy(address(aaveStrategy));
        console.log("Strategy registered in VaultV3");

        // 6. Mint 10,000 test USDT to deployer for testing
        mockUsdt.mint(msg.sender, 10_000 * 10 ** 6);
        console.log("Minted 10,000 USDT to deployer");

        vm.stopBroadcast();

        console.log("");
        console.log("=== Deployment Summary ===");
        console.log("MOCK_USDT_ADDRESS=", vm.toString(address(mockUsdt)));
        console.log("VAULT_ADDRESS=", vm.toString(address(vault)));
        console.log("MOCK_AAVE_POOL_ADDRESS=", vm.toString(address(mockAavePool)));
        console.log("AAVE_STRATEGY_ADDRESS=", vm.toString(address(aaveStrategy)));
    }
}
