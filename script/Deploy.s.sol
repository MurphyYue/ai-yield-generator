// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../contracts/MockERC20.sol";
import "../contracts/VaultV3.sol";
import "../contracts/AaveStrategy.sol";
import "../contracts/mocks/MockAavePool.sol";

contract DeployScript is Script {
    // Real Aave V3 Pool on Sepolia testnet
    address constant AAVE_V3_POOL_SEPOLIA = 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951;

    function run() external {
        // Supports both PRIVATE_KEY (Sepolia) and DEPLOYER_PRIVATE_KEY (Anvil)
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0));
        if (deployerPrivateKey == 0) {
            deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        }
        address deployer = vm.addr(deployerPrivateKey);
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy MockERC20 (USDT with Permit, 6 decimals)
        MockERC20 mockUsdt = new MockERC20(1_000_000 * 10 ** 6);
        console.log("MockERC20 deployed at:", address(mockUsdt));

        // 2. Deploy VaultV3
        VaultV3 vault = new VaultV3();
        console.log("VaultV3 deployed at:", address(vault));

        // 3. Determine Aave pool address:
        //    - Sepolia:  real Aave V3 pool (AAVE_V3_POOL_SEPOLIA)
        //    - Anvil:    deploy MockAavePool locally
        address aavePoolAddress;
        uint256 chainId = block.chainid;
        if (chainId == 11155111) {
            // Sepolia — use real Aave V3
            aavePoolAddress = AAVE_V3_POOL_SEPOLIA;
            console.log("Using real Aave V3 Pool (Sepolia):", aavePoolAddress);
        } else {
            // Anvil / local — deploy mock
            MockAavePool mockAavePool = new MockAavePool();
            aavePoolAddress = address(mockAavePool);
            console.log("MockAavePool deployed at:", aavePoolAddress);
        }

        // 4. Deploy AaveStrategy
        AaveStrategy aaveStrategy = new AaveStrategy(
            address(vault),
            address(mockUsdt),
            aavePoolAddress
        );
        console.log("AaveStrategy deployed at:", address(aaveStrategy));

        // 5. Register strategy in VaultV3 (deployer has DEFAULT_ADMIN_ROLE)
        vault.setStrategy(address(aaveStrategy));
        console.log("Strategy registered in VaultV3");

        // 6. Mint 10,000 test USDT to deployer for testing
        mockUsdt.mint(deployer, 10_000 * 10 ** 6);
        console.log("Minted 10,000 USDT to deployer");

        vm.stopBroadcast();

        console.log("");
        console.log("=== Deployment Summary ===");
        console.log("Chain ID:", chainId);
        console.log("Deployer:", deployer);
        console.log("MockERC20 (USDT):", address(mockUsdt));
        console.log("VaultV3:", address(vault));
        console.log("AaveStrategy:", address(aaveStrategy));
        console.log("AavePool:", aavePoolAddress);
    }
}
