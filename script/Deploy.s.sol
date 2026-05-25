// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../contracts/MockERC20.sol";
import "../contracts/VaultV3.sol";
import "../contracts/AaveStrategy.sol";
import "../contracts/mocks/MockAavePool.sol";

contract DeployScript is Script {
    uint256 constant CHAIN_ID_BASE = 8453;
    uint256 constant CHAIN_ID_ARBITRUM = 42161;
    uint256 constant CHAIN_ID_SEPOLIA = 11155111;

    // Real Aave V3 Pool addresses
    address constant AAVE_V3_POOL_BASE = 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5;
    address constant AAVE_V3_POOL_ARBITRUM = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;
    address constant AAVE_V3_POOL_SEPOLIA = 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951;

    // Native token addresses
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant USDC_ARBITRUM = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;

    function run() external {
        // Supports both PRIVATE_KEY (Sepolia) and ANVIL_PRIVATE_KEY (Anvil)
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0));
        if (deployerPrivateKey == 0) {
            deployerPrivateKey = vm.envUint("ANVIL_PRIVATE_KEY");
        }
        address deployer = vm.addr(deployerPrivateKey);
        uint256 chainId = block.chainid;

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy VaultV3
        VaultV3 vault = new VaultV3();
        console.log("VaultV3 deployed at:", address(vault));

        // 2. Resolve deployment configuration by chain.
        address aavePoolAddress;
        address tokenAddress;
        bool usesMockToken;

        if (chainId == CHAIN_ID_BASE) {
            aavePoolAddress = AAVE_V3_POOL_BASE;
            tokenAddress = USDC_BASE;
            console.log("Using Base mainnet config");
            console.log("USDC:", tokenAddress);
            console.log("Aave Pool:", aavePoolAddress);
        } else if (chainId == CHAIN_ID_ARBITRUM) {
            aavePoolAddress = AAVE_V3_POOL_ARBITRUM;
            tokenAddress = USDC_ARBITRUM;
            console.log("Using Arbitrum mainnet config");
            console.log("USDC:", tokenAddress);
            console.log("Aave Pool:", aavePoolAddress);
        } else if (chainId == CHAIN_ID_SEPOLIA) {
            aavePoolAddress = AAVE_V3_POOL_SEPOLIA;
            usesMockToken = true;
            console.log("Using real Aave V3 Pool (Sepolia):", aavePoolAddress);
        } else {
            usesMockToken = true;
            MockAavePool mockAavePool = new MockAavePool();
            aavePoolAddress = address(mockAavePool);
            console.log("MockAavePool deployed at:", aavePoolAddress);
        }

        MockERC20 mockToken;
        if (usesMockToken) {
            mockToken = new MockERC20(1_000_000 * 10 ** 6);
            tokenAddress = address(mockToken);
            console.log("MockERC20 deployed at:", tokenAddress);
        }

        // 3. Deploy AaveStrategy
        AaveStrategy aaveStrategy = new AaveStrategy(address(vault), tokenAddress, aavePoolAddress);
        console.log("AaveStrategy deployed at:", address(aaveStrategy));

        // 4. Register strategy in VaultV3 (deployer has DEFAULT_ADMIN_ROLE)
        vault.setStrategy(address(aaveStrategy));
        console.log("Strategy registered in VaultV3");

        if (usesMockToken) {
            // Legacy local/test deployment path keeps the mock token workflow for compatibility.
            mockToken.mint(deployer, 10_000 * 10 ** 6);
            console.log("Minted 10,000 mock tokens to deployer");
        }

        vm.stopBroadcast();

        console.log("");
        console.log("=== Deployment Summary ===");
        console.log("Chain ID:", chainId);
        console.log("Deployer:", deployer);
        console.log("Underlying token:", tokenAddress);
        console.log("VaultV3:", address(vault));
        console.log("AaveStrategy:", address(aaveStrategy));
        console.log("AavePool:", aavePoolAddress);
        console.log("Uses mock token:", usesMockToken);
    }
}
