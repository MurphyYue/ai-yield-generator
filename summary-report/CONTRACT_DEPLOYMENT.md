How Contract Addresses Work
                                                                                                                          
  Key Concept: You Don't Know the Address Until AFTER Deployment

  Unlike traditional development where you might define your API endpoints beforehand, smart contract addresses are
  calculated AFTER deployment.

  The Deployment Flow (What Actually Happened)

  Step 1: I Ran the Deployment Command
  forge create contracts/MockERC20.sol:MockERC20 \
    --constructor-args 1000000 \
    --rpc-url http://localhost:8545 \
    --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
    --broadcast

  Step 2: Foundry Returned the Output
  Warning: This is a nightly build of Foundry...

  No files changed, compilation skipped
  Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  Deployed to: 0x4c5859f0F772848b2D91F1D83E2Fe57935348029  ← THIS IS THE ADDRESS!
  Transaction hash: 0xec78970bc47738f4868ffc9c7f3418da44fb7d6a13e250d646fe3211d7443737

  Step 3: I Copied That Address and Used It

  After seeing Deployed to: 0x4c5859f0F772848b2D91F1D83E2Fe57935348029, I then used it in all subsequent commands:

  # approve() - using the address
  cast send 0x4c5859f0F772848b2D91F1D83E2Fe57935348029 "approve(address,uint256)" ...

  # depositToken() - using the address
  cast send 0x1291Be112d480055DaFd8a610b7d1e203891C274 "depositToken(address,uint256)" \
    0x4c5859f0F772848b2D91F1D83E2Fe57935348029 ...

  ---
  How Addresses Are Calculated (The Technical Details)

  Formula:

  Contract Address = keccak256(deployer_address, nonce)[12:]

  Where:
  - deployer_address = The account deploying the contract (0xf39Fd...)
  - nonce = Transaction count for that account (0, 1, 2, 3...)
  - keccak256() = Hashing algorithm
  - [12:] = Take last 20 bytes (40 hex characters)

  In Our Case:

  Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  Nonce: 52 (this was the 52nd transaction from this account)

  Result: 0x4c5859f0F772848b2D91F1D83E2Fe57935348029

  Why This Matters:

  1. Deterministic
  - Same deployer + same nonce = same address
  - This is how "CREATE2" opcode works (can calculate address before deployment)

  2. Incremental
  - First deployment: nonce 0 → address A
  - Second deployment: nonce 1 → address B
  - Third deployment: nonce 2 → address C

  3. Account-based
  - Different deployer = different addresses (even with same nonce!)

  ---
  Frontend Analogy

  // Frontend: You know the URL before deployment
  const API_URL = 'https://api.example.com/users';

  // Blockchain: You DON'T know the address until deployment
  const mockUSDTAddress = await deployContract({
    bytecode: compiledContract.bytecode,
    args: [1000000]
  });
  // Only NOW you know: 0x4c5859f0F772848b2D91F1D83E2Fe57935348029

  ---
  In Practice: How to Handle Addresses

  Method 1: Copy from Deployment Output (What I Did)

  forge create ... --broadcast
  # Output: Deployed to: 0x4c5859f0...
  # Manually copy this address

  Method 2: Save to File (Better Practice)

  # Deploy and save address
  forge create ... --broadcast | grep "Deployed to" > contract_address.txt

  # Or use JSON output
  forge create ... --json --broadcast > deployment.json

  Method 3: Use Deployment Scripts (Best Practice)

  // script/Deploy.s.sol
  import "forge-std/Script.sol";

  contract DeployScript is Script {
      function run() external {
          vm.startBroadcast();

          MockERC20 token = new MockERC20(1000000);
          console.log("MockUSDT deployed to:", address(token));

          vm.stopBroadcast();
      }
  }

  forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

  ---
  Why I Created CONTRACT_ADDRESSES.md

  This is exactly why I created that file! It's a central place to store all deployed addresses so you don't lose them:

  ### MockUSDT (ERC20 Token)
  - **Address**: `0x4c5859f0F772848b2D91F1D83E2Fe57935348029`
  - **Name**: Mock USDT
  - **Symbol**: USDT

  ### Vault (Day 2 - ERC20 Support)
  - **Address**: `0x1291Be112d480055DaFd8a610b7d1e203891C274`

  This is standard practice:
  - Development: Store addresses in .env or config files
  - Production: Use verified addresses from Etherscan
  - Testing: Script deployment to capture addresses automatically

  ---
  Summary

  Direct Answer to Your Question:

  Yes! I got the address 0x4c5859f0F772848b2D91F1D83E2Fe57935348029 after successfully deploying the contract. The
  deployment output showed "Deployed to: 0x4c5859f0..." and I copied that address to use in all subsequent commands.

  Key Takeaway:
  - Contract addresses are deterministic (calculated from deployer + nonce)
  - But you don't know them until after deployment
  - Always save your deployment addresses!
  - Use deployment scripts to automate address capture

  Deployment Problem Analysis & Solution                                                           
                                                                                                   
  Problem 1: Solidity Version Mismatch                                                             
                  
  Error:                                                                                           
  Error: Encountered invalid solc version in ERC20Permit.sol:
  No solc version exists that matches the version requirement: ^0.8.24

  Cause: OpenZeppelin's ERC20Permit requires Solidity ^0.8.24, but our contracts were using
  ^0.8.20.

  Solution: Updated all files to ^0.8.24:
  # foundry.toml
  solc_version = "0.8.24"

  # contracts/MockERC20.sol
  pragma solidity ^0.8.24;

  # contracts/VaultV3.sol
  pragma solidity ^0.8.24;

  ---
  Problem 2: forge create Private Key Not Working

  Error:
  Error: Error accessing local wallet.
  Did you pass a keystore, hardware wallet, private key or mnemonic?

  Commands That Failed:

  ┌───────────────────────────────────────────┬───────────┐
  │                  Command                  │  Result   │
  ├───────────────────────────────────────────┼───────────┤
  │ --private-key 0xac09...                   │ ❌ Failed │
  ├───────────────────────────────────────────┼───────────┤
  │ --private-key ac09... (no 0x)             │ ❌ Failed │
  ├───────────────────────────────────────────┼───────────┤
  │ --private-key "ac09..." (quoted)          │ ❌ Failed │
  ├───────────────────────────────────────────┼───────────┤
  │ --from 0xf39F... --unlocked               │ ❌ Failed │
  ├───────────────────────────────────────────┼───────────┤
  │ Environment variables (ETH_PRIKEY)        │ ❌ Failed │
  ├───────────────────────────────────────────┼───────────┤
  │ --mnemonic-path with process substitution │ ❌ Failed │
  └───────────────────────────────────────────┴───────────┘

  ---
  Solution: Use forge script Instead

  Why it worked: forge script is the modern recommended approach in Foundry 1.5+. It properly
  handles private keys through environment variables.

  Working Solution:

  # 1. Create deployment script
  # script/DeployPermit.s.sol
  PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  forge script script/DeployPermit.s.sol:DeployPermitScript \
    --rpc-url http://localhost:8545 \
    --broadcast

  Key Differences:

  ┌────────────────────────────────┬──────────────────────────────────────────┐
  │          forge create          │               forge script               │
  ├────────────────────────────────┼──────────────────────────────────────────┤
  │ Direct deployment              │ Script-based deployment                  │
  ├────────────────────────────────┼──────────────────────────────────────────┤
  │ --private-key flag often buggy │ vm.envUint("PRIVATE_KEY") works reliably │
  ├────────────────────────────────┼──────────────────────────────────────────┤
  │ No logging by default          │ console.log() support                    │
  ├────────────────────────────────┼──────────────────────────────────────────┤
  │ Manual address tracking        │ Addresses logged automatically           │
  └────────────────────────────────┴──────────────────────────────────────────┘

  ---
  The Script That Worked

  // SPDX-License-Identifier: MIT
  pragma solidity ^0.8.24;

  import "forge-std/Script.sol";
  import "forge-std/console.sol";
  import "../contracts/MockERC20.sol";
  import "../contracts/VaultV3.sol";

  contract DeployPermitScript is Script {
      function run() external {
          uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
          vm.startBroadcast(deployerPrivateKey);

          MockERC20 mockUsdt = new MockERC20(1000000000000);
          console.log("MockERC20 deployed at:", address(mockUsdt));

          VaultV3 vault = new VaultV3();
          console.log("VaultV3 deployed at:", address(vault));

          vm.stopBroadcast();
      }
  }

  ---
  Key Takeaways

  1. Use forge script for deployments (it's the recommended approach)
  2. Pass private key via environment variable, not command-line flag
  3. Update Solidity version to match OpenZeppelin requirements
  4. Use --broadcast flag to execute the transaction

  ---
  Commands to Remember

  # Deploy with forge script
  PRIVATE_KEY=your_private_key \
  forge script script/YourScript.s.sol:YourScript \
    --rpc-url http://localhost:8545 \
    --broadcast

  # Verify deployment
  cast call CONTRACT_ADDRESS "functionName(args)" --rpc-url http://localhost:8545
  