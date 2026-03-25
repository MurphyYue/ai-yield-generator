// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../contracts/MockERC20.sol";
import "../contracts/VaultV3.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy MockERC20 with Permit support
        MockERC20 mockUsdt = new MockERC20(1000000000000); // 1,000,000 USDT with 6 decimals
        console.log("MockERC20 deployed at:", address(mockUsdt));

        // Deploy VaultV3
        VaultV3 vault = new VaultV3();
        console.log("VaultV3 deployed at:", address(vault));

        vm.stopBroadcast();

        console.log("");
        console.log("=== Deployment Summary ===");
        console.log("MOCK_USDT_ADDRESS=", vm.toString(address(mockUsdt)));
        console.log("VAULT_ADDRESS=", vm.toString(address(vault)));
    }
}
