# Deployed Contract Addresses (Day 2)

## Local Anvil Node (Chain ID: 31337)

### MockUSDT (ERC20 Token)
- **Address**: `0x4c5859f0F772848b2D91F1D83E2Fe57935348029`
- **Name**: Mock USDT
- **Symbol**: USDT
- **Decimals**: 6
- **Initial Supply**: 1 USDT (1,000,000 with 6 decimals)

### Vault (Day 2 - ERC20 Support)
- **Address**: `0x1291Be112d480055DaFd8a610b7d1e203891C274`
- **Features**:
  - ETH deposit/withdraw (existing)
  - ERC20 deposit/withdraw (new)
  - Reentrancy protection
  - Per-token balance tracking

### Vault (Day 1 - ETH Only)
- **Address**: `0x8A791620dd6260079BF849Dc5567aDC3F2FdC318`
- **Note**: Replaced by Day 2 Vault

## Test Accounts (Anvil Default)

### Account 0 (Deployer)
- **Address**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Private Key**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

## Test Results

### ERC20 Workflow Test
- ✅ MockUSDT deployment successful
- ✅ Vault deployment successful
- ✅ approve() on MockUSDT: 1 USDT approved
- ✅ depositToken(): 0.5 USDT deposited
- ✅ getTokenBalance(): 0.5 USDT confirmed
- ✅ withdrawToken(): 0.25 USDT withdrawn
- ✅ Final balance: 0.25 USDT confirmed

## Commands Used

```bash
# Deploy MockUSDT
forge create contracts/MockERC20.sol:MockERC20 --constructor-args 1000000 \
  --rpc-url http://localhost:8545 \
  --private-key <private-key> \
  --broadcast

# Deploy Vault
forge create contracts/Vault.sol:Vault \
  --rpc-url http://localhost:8545 \
  --private-key <private-key> \
  --broadcast

# Approve Vault to spend tokens
cast send <mockusdt-address> "approve(address,uint256)" <vault-address> <amount> \
  --rpc-url http://localhost:8545 \
  --private-key <private-key>

# Deposit tokens
cast send <vault-address> "depositToken(address,uint256)" <token-address> <amount> \
  --rpc-url http://localhost:8545 \
  --private-key <private-key>

# Withdraw tokens
cast send <vault-address> "withdrawToken(address,uint256)" <token-address> <amount> \
  --rpc-url http://localhost:8545 \
  --private-key <private-key>

# Check token balance in Vault
cast call <vault-address> "getTokenBalance(address,address)(uint256)" <token-address> <user-address> \
  --rpc-url http://localhost:8545
```

Mission D: Concept Deep Dive for Frontend Engineers                                                                     
                                                                                                                          
  Great question! Let me explain everything I did in Mission D, connecting it to concepts you already know from frontend  
  development.
                                                                                                                          
  ---             
  1. ERC20: The "Interface" of Tokens

  Concept: What is ERC20?

  Think of ERC20 like a standard interface in TypeScript or React:

  // Frontend analogy: A standard interface for components
  interface ButtonProps {
    label: string;
    onClick: () => void;
  }

  In Solidity, ERC20 is a standard token interface that all tokens must implement. Just like how all buttons in your app
  follow the same onClick pattern, all ERC20 tokens follow the same functions.

  The ERC20 Interface (What I Implemented)

  // These functions are REQUIRED for any ERC20 token
  function name() -> "Mock USDT"                    // Token name
  function symbol() -> "USDT"                       // Token symbol
  function decimals() -> 6                          // Decimal places (like 6 cents in $1.00)
  function totalSupply() -> 1000000                 // Total tokens in existence
  function balanceOf(address) -> uint256            // Get user's balance
  function transfer(address, uint256) -> bool       // Send tokens to someone
  function approve(address, uint256) -> bool        // Allow someone to spend your tokens
  function transferFrom(address, address, uint256)  // Pull tokens from approved user
  function allowance(address, address) -> uint256   // Check approved amount

  Why "Approve + Pull" Pattern?

  This is the key difference between ETH and ERC20:

  ETH (Push Pattern):
  // You directly send ETH to someone
  wallet.sendETH(toAddress, amount)

  ERC20 (Pull Pattern):
  // Step 1: You GIVE PERMISSION first
  token.approve(vaultContract, amount)

  // Step 2: The contract PULLS the tokens
  vault.depositToken(tokenAddress, amount) // calls transferFrom internally

  Why this design?
  - Security: Prevents contracts from stealing your tokens without permission
  - Control: You decide HOW MUCH each contract can spend
  - Standard: All DeFi protocols work this way (Uniswap, Aave, Compound)

  Practical Example from Mission D:

  // In Vault.sol - What I implemented
  function depositToken(address token, uint256 amount) external nonReentrant {
      // This line PULLS tokens from user using transferFrom
      // User must have called approve() FIRST
      bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
      require(success, "Token transfer failed");

      // Then we track the balance
      tokenBalances[token][msg.sender] += amount;
  }

  The flow I tested:
  1. User calls approve(Vault, 1 USDT) → "I allow Vault to spend 1 USDT"
  2. User calls depositToken(USDT, 0.5 USDT) → "Vault, pull 0.5 USDT from me"
  3. Vault calls transferFrom(user, Vault, 0.5) → Tokens move to Vault
  4. Vault updates user's balance internally

  ---
  2. Configuration: Why I Did That

  A. foundry.toml - Like package.json for Smart Contracts

  [profile.default]
  src = "contracts"        # Where your source files are (like src/)
  out = "out"              # Where compiled artifacts go (like dist/)
  libs = ["lib"]           # Where libraries are (like node_modules/)
  solc_version = "0.8.20"  # Compiler version (like Node version)

  Why this matters:
  - Just like you specify "type": "module" in package.json
  - Foundry needs to know where to find your contracts
  - Specifies Solidity version (breaking changes between versions!)

  B. remappings.txt - Like tsconfig.json Path Aliases

  Before remappings:
  import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
  // Foundry looks in: lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol

  In remappings.txt:
  @openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/

  Frontend analogy:
  // tsconfig.json - You've seen this!
  {
    "paths": {
      "@components/*": ["src/components/*"],
      "@lib/*": ["src/lib/*"]
    }
  }

  Why I did this:
  - Cleaner imports (@openzeppelin/contracts instead of ../../lib/...)
  - Standard practice in Foundry projects
  - Prevents import path hell

  C. MockERC20.sol - Why Create a Fake Token?

  Real USDT on Ethereum:
  - ❌ Costs real gas fees
  - ❌ Need real USDT tokens
  - ❌ Can't test edge cases easily
  - ❌ Mainnet deployment required

  MockUSDT on Anvil:
  - ✅ Free (local testnet)
  - ✅ Mint unlimited tokens for testing
  - ✅ Control the entire environment
  - ✅ Test fails → just restart Anvil

  This is standard development practice:
  // Frontend analogy: You use mock data in development
  const mockUser = {
    id: 1,
    name: "Test User"
  };

  // Same concept in Solidity
  contract MockERC20 is ERC20 {
      function mint(address to, uint256 amount) external {
          _mint(to, amount); // Free tokens for testing!
      }
  }

  ---
  3. Deployment & Testing: How It Works

  Step-by-Step Deployment Process

  A. Deploy MockUSDT

  forge create contracts/MockERC20.sol:MockERC20 \
    --constructor-args 1000000 \
    --rpc-url http://localhost:8545 \
    --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
    --broadcast

  Breaking it down:
  - forge create = Compile + Deploy (like npm run build && deploy)
  - contracts/MockERC20.sol:MockERC20 = File path:Contract name
  - --constructor-args 1000000 = Pass arguments to constructor (like function params)
  - --rpc-url http://localhost:8545 = Which blockchain to connect to (like API endpoint)
  - --private-key 0x... = Your account credentials (like auth token)
  - --broadcast = Actually send the transaction (dry run without this)

  Frontend analogy:
  // Like deploying to Vercel/Netlify
  vercel deploy --prod \
    --env API_KEY=xxx \
    --yes

  B. Verify Deployment

  cast call 0x4c5859f0... "totalSupply()(uint256)" --rpc-url http://localhost:8545
  # Returns: 1000000 [1e6]

  What this does:
  - cast call = Read contract data (no gas cost, like GET request)
  - 0x4c5859f0... = Contract address (like URL)
  - "totalSupply()(uint256)" = Function signature + return type
  - --rpc-url = Which node to ask

  Frontend analogy:
  // Like making a GET request to your API
  fetch('https://api.example.com/totalSupply')
    .then(res => res.json())
    .then(data => console.log(data)) // 1000000

  C. Test ERC20 Workflow

  Test 1: Approve Vault to Spend Tokens
  cast send 0x4c5859f0... \
    "approve(address,uint256)" \
    0x1291Be112d480055DaFd8a610b7d1e203891C274 \
    1000000 \
    --rpc-url http://localhost:8545 \
    --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

  Breaking it down:
  - cast send = Write to blockchain (costs gas, like POST request)
  - 0x4c5859f0... = Token contract address
  - "approve(address,uint256)" = Function to call
  - 0x1291Be112d480055DaFd8a610b7d1e203891C274 = First argument: spender (Vault)
  - 1000000 = Second argument: amount (1 USDT with 6 decimals)

  What happened on-chain:
  Event emitted: Approval(
    owner: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266,  // User
    spender: 0x1291Be112d480055DaFd8a610b7d1e203891C274, // Vault
    value: 1000000  // 1 USDT
  )

  Test 2: Deposit Tokens
  cast send 0x1291Be112d480055DaFd8a610b7d1e203891C274 \
    "depositToken(address,uint256)" \
    0x4c5859f0F772848b2D91F1D83E2Fe57935348029 \
    500000 \
    --rpc-url http://localhost:8545 \
    --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

  What happened internally:
  1. User calls depositToken(USDT, 0.5 USDT)
  2. Vault contract calls USDT.transferFrom(user, Vault, 0.5)
  3. USDT contract checks: Is 0.5 <= approved amount? YES (1 USDT approved)
  4. USDT transfers 0.5 from user to Vault
  5. Vault updates: tokenBalances[USDT][user] = 0.5
  6. Events emitted:
     - Transfer(user, Vault, 0.5)  // USDT contract
     - TokenDeposited(user, USDT, 0.5)  // Vault contract

  Test 3: Verify Balance
  cast call 0x1291Be112d480055DaFd8a610b7d1e203891C274 \
    "getTokenBalance(address,address)(uint256)" \
    0x4c5859f0F772848b2D91F1D83E2Fe57935348029 \
    0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
    --rpc-url http://localhost:8545
  # Returns: 500000 [5e5] = 0.5 USDT

  ---
  4. Key Differences from Frontend Development

  A. State Management

  // Frontend: State is in memory/Redux
  const [balance, setBalance] = useState(0);

  // Blockchain: State is on-chain (permanent)
  mapping(address => uint256) public balances;

  B. Transaction Cost

  // Frontend: Free API calls
  fetch('/api/balance')

  // Blockchain: Costs gas (real money on mainnet!)
  cast call ...  // Free (read-only)
  cast send ...  // Costs gas (writes state)

  C. Testing

  // Frontend: Jest tests run in milliseconds
  npm test

  // Blockchain: Requires full blockchain simulation
  forge test  # Runs against Anvil (local blockchain)

  D. Error Handling

  // Frontend: Try/catch
  try {
    await api.call();
  } catch (error) {
    showError(error.message);
  }

  // Blockchain: Reverts (transaction fails, gas consumed)
  require(amount > 0, "Amount must be > 0");

  ---
  5. Why This Matters for You as a Frontend Engineer

  The Frontend Connection:

  In your Next.js app, you'll:
  // This is what you'll build in Mission F!
  async function depositTokens(amount: string) {
    // 1. Approve (one-time setup)
    await writeContract({
      address: MOCK_USDT_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [VAULT_ADDRESS, parseUnits(amount, 6)]
    });

    // 2. Deposit
    await writeContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'depositToken',
      args: [MOCK_USDT_ADDRESS, parseUnits(amount, 6)]
    });
  }

  The data flow:
  User clicks "Deposit 0.5 USDT"
    → MetaMask popup (approve)
    → Transaction sent to Anvil
    → Smart contract executes
    → Events emitted
    → Frontend listens to events
    → UI updates with new balance

  ---
  Summary: What You Learned

  1. ERC20 is a standard interface - Like React component props
  2. Approve + Pull pattern - Security feature, gives user control
  3. Configuration files - foundry.toml = package.json, remappings.txt = tsconfig.json
  4. Mock tokens for testing - Like using mock data in frontend dev
  5. Deployment = API call - forge create compiles + deploys
  6. Testing = State verification - Read from blockchain, verify values

  ---