# Web3 Full-Stack Learning Roadmap

# Day1
## Progress Tracker

- [x] **Mission A: Smart Contract (Vault.sol)**
- [x] **Mission B: React Frontend with MetaMask**
- [x] **Mission C: Local Anvil Node & Deployment**

---

## Mission A: Smart Contract (Vault.sol) ✅ COMPLETED

- [x] 1. Create Vault.sol contract with deposit/withdraw functions
- [x] 2. Compile the contract
- [x] 3. Install OpenZeppelin dependencies
- [x] 4. Deploy to local Anvil node

**Status**: ✅ Contract created, compiled, and deployed successfully!

**Deployed Contract Address**: 0x8A791620dd6260079BF849Dc5567aDC3F2FdC318 (redeployed)

---

## Mission B: React Frontend with MetaMask ⏳ IN PROGRESS

### Phase 1: Project Setup
- [x] 1.1 Create Next.js 16 project
- [x] 1.2 Install Web3 dependencies
- [x] 1.3 Configure TailwindCSS (auto-configured)
- [x] 1.4 Fix version compatibility (wagmi 2.x + RainbowKit)

### Phase 2: Web3 Configuration ✅
- [x] 2.1 Setup Wagmi config (lib/wagmi.ts)
- [x] 2.2 Configure Anvil chain (lib/chains.ts)
- [x] 2.3 Define Vault contract ABI (lib/vault.ts)

### Phase 3: Core Components ✅
- [x] 3.1 Root layout with providers (components/Providers.tsx)
- [x] 3.2 Wallet connect component (components/WalletConnect.tsx)

### Phase 4: Custom Hooks ✅
- [x] 4.1 useVaultContract hook (hooks/useVaultContract.ts)
- [x] 4.2 useVaultBalance hook (hooks/useVaultBalance.ts)

### Phase 5: UI Components ✅
- [x] 5.1 Vault dashboard (components/VaultDashboard.tsx)
- [x] 5.2 Balance display (components/BalanceDisplay.tsx)
- [x] 5.3 Deposit panel (components/DepositPanel.tsx)
- [x] 5.4 Withdraw panel (components/WithdrawPanel.tsx)

### Phase 6: Integration ✅
- [x] 6.1 Main page setup (app/page.tsx)
- [x] 6.2 Connect all components

**Status**: Code complete! Using unified hook approach ✅

**Plan Document**: FRONTEND_PLAN.md

**Architecture**: Unified `useVault` hook (simpler, no circular dependencies)

**Working Features**:
- ✅ Wallet connection
- ✅ Vault balance updates after transactions
- ✅ ETH balance updates after transactions (unified hook)

**Learning**:
- Circular dependencies in React hooks
- Unified hooks vs separate hooks coordination
- Data flow and state management

---

## Mission C: Local Anvil Node & Deployment ⏳ IN PROGRESS

- [x] 1. Update Docker configuration for Anvil
- [x] 2. Start Anvil node in container
- [x] 3. Configure MetaMask to connect to Anvil
- [x] 4. Deploy Vault contract
- [x] 5. Verify deployment


**Status**: completed

- ✅ Docker configuration is set up and running                                                                         
- ✅ Container foundry-dev is up
- ✅ Anvil IS running (PID: 601, current block: 48)
- ✅ Port 8545 is exposed and RPC is working
- ✅ Vault contract deployed to: 0x8A791620dd6260079BF849Dc5567aDC3F2FdC318
- ✅ Frontend is configured to connect to Anvil (Chain ID: 31337)
- ✅ MetaMask was configured during development

---

## Learning Notes

### Key Concepts Learned:
- OpenZeppelin Ownable for access control
- OpenZeppelin ReentrancyGuard for security
- receive() function for direct ETH transfers
- Solidity 0.8.20+ syntax

### Commands Used:
```
git init
git submodule add https://github.com/OpenZeppelin/openzeppelin-contracts.git lib/openzeppelin-contracts
forge build --contracts /app/contracts
forge create --rpc-url http://localhost:8545 --private-key <key> --broadcast contracts/Vault.sol:Vault
```

---

## Next Action

**Current**: Mission C is functionally complete - the infrastructure is running and working. The Vault contract is deployed on Anvil, the frontend connects to it successfully, and all features (deposit/withdraw) are working.


**Next**: Day 2 - Asset Standards and AI Intent Engine

---

# Day2

## Day 2: Asset Standards and AI Intent Engine (10-Hour Sprint)

### Overview

Day 2 advances from "CRUD operations" to **architectural governance**. As a FinTech Transition Architect, you'll master not just code, but how to build high-trust systems through **asset standards (ERC20)** and **smart security (simulation execution)**.

---

## Session 1: Protocol Layer Refactoring (09:00 - 11:30, 2.5h)

### Mission D: ERC20 Vault Implementation ✅ COMPLETED

- [x] 1. Implement ERC20-supported `Vault.sol`
  - [x] Add `depositToken(address token, uint256 amount)` function
  - [x] Add `withdrawToken(address token, uint256 amount)` function
  - [x] Add token balance mapping: `mapping(address => mapping(address => uint256))`
  - [x] Enforce `nonReentrant` on all token operations
  - [x] Add `getTokenBalance()` view function

- [x] 2. Create MockUSDT (MockERC20) for testing
  - [x] Deploy `MockERC20.sol` with standard ERC20 interface
  - [x] Mint initial supply to deployer
  - [x] Add `mint(address to, uint256 amount)` function for testing

- [x] 3. Configure Foundry for ERC20
  - [x] Install OpenZeppelin contracts: `forge install OpenZeppelin/openzeppelin-contracts`
  - [x] Configure `remappings.txt` for clean imports
  - [x] Update `foundry.toml` with proper paths

- [x] 4. Test ERC20 workflow
  - [x] Deploy MockUSDT to Anvil
  - [x] Test `approve()` on MockUSDT
  - [x] Test `depositToken()` with `transferFrom()`
  - [x] Verify token balance tracking in Vault
  - [x] Test `withdrawToken()`
  - [x] Verify final balance correctness

**Milestone**: ✅ Successfully deposit MockUSDT via `approve` + `transferFrom`

**Implementation Details**:
- Created `MockERC20.sol` with 6 decimals (matching USDT)
- Extended `Vault.sol` with ERC20 support using OpenZeppelin's IERC20
- Added token balance tracking: `mapping(address => mapping(address => uint256))`
- Deployed MockUSDT: `0x4c5859f0F772848b2D91F1D83E2Fe57935348029`
- Deployed Vault V2: `0x1291Be112d480055DaFd8a610b7d1e203891C274`
- All tests passed: approve → deposit (0.5 USDT) → withdraw (0.25 USDT) → balance verified (0.25 USDT)

---

## Session 2: Security Foundation (11:30 - 13:00, 1.5h)

### Mission E: Understanding ERC20 Security ✅ COMPLETED

- [x] 1. Study Approve/TransferFrom pattern
  - [x] Understand why ERC20 uses "pull" vs "push" pattern
  - [x] Learn about allowance mechanism
  - [x] Understand approval race conditions

- [x] 2. Research `delegatecall` security
  - [x] Understand `delegatecall` vs `call` vs `staticcall`
  - [x] Learn about storage layout vulnerabilities
  - [x] Study proxy pattern security considerations

- [x] 3. Document security learnings
  - [x] Explain why direct `transfer` is unsafe in some contexts
  - [x] Document reentrancy protection strategies
  - [x] Create security checklist for ERC20 interactions

**Milestone**: ✅ Explained why direct `transfer` is unsafe and how approve/transferFrom works

**Key Security Learnings:**
- **Pull vs Push Pattern**: Pull pattern (approve + transferFrom) is safer than direct transfer
- **Allowance Mechanism**: Two-step process giving users control and limiting exposure
- **Reentrancy Protection**: Always use `nonReentrant` modifier on functions with external calls
- **Checks-Effects-Interactions**: Validate inputs → Update state → Make external calls
- **Approval Race Conditions**: Use SafeERC20 to prevent race conditions in allowance changes
- **Frontend Security**: Check allowances, simulate before signing, handle errors gracefully

**Documentation**: SECURITY_FOUNDATION.md created with complete security guide

---

## Break (13:00 - 14:00, 1h)

*Lunch and review*

---

## Session 3: AI Intent Layer (14:00 - 16:30, 2.5h)

### Mission F: Dify Agent Integration ✅ COMPLETED

- [x] 1. Setup Dify Agent
  - [x] Create Dify account and project
  - [x] Configure System Role prompt (JSON-only responses)
  - [x] Define intent schema: `{"action": "deposit|withdraw", "amount": number, "token": "ETH|USDT", "token_address": string}`
  - [x] Get API credentials

- [x] 2. Create Next.js API Route
  - [x] Create `app/api/chat/route.ts`
  - [x] Implement server-side Dify API call
  - [x] Add API key protection (server-side only)
  - [x] Add error handling and validation

- [x] 3. Test AI parsing
  - [x] Test with natural language: "存入 100 USDT" (Deposit 100 USDT)
  - [x] Verify JSON response structure
  - [x] Add fallback for unrecognized intents

**Milestone**: ✅ Input command returns structured JSON with action, amount, token, token_address

**Implementation Details:**
- Dify Agent configured with system prompt for JSON-only responses
- API route at `/api/chat` handles natural language parsing
- Supports both English and Chinese commands
- Returns structured intent: `{action, amount, token, token_address, confidence}`
- Includes error handling and validation
- Token addresses: ETH (0x0...0), USDT (0x4c58...8029)

**Files Created:**
- `app/api/chat/route.ts` - Next.js API route for Dify integration
- `DIFY_INTEGRATION.md` - Complete integration documentation
- `test-dify-api.sh` - Test script for API endpoint
  - [ ] Test with: "withdraw 0.5 ETH"
  - [ ] Verify JSON response structure
  - [ ] Add fallback for unrecognized intents

**Milestone**: Input command returns structured JSON with action, amount, token, token_address

---

## Session 4: Frontend Integration (16:30 - 18:30, 2h)

### Mission G: AI Panel Component

- [ ] 1. Create `AIPanel.tsx` component
  - [ ] Add text input for natural language commands
  - [ ] Add "Process" button to send to API
  - [ ] Display parsed intent preview
  - [ ] Show confidence level if available

- [ ] 2. Integrate with existing forms
  - [ ] Auto-fill `DepositPanel` from AI response
  - [ ] Auto-fill `WithdrawPanel` from AI response
  - [ ] Handle token selection (ETH vs ERC20)
  - [ ] Add visual feedback for AI processing

- [ ] 3. Add token selector UI
  - [ ] Create dropdown for token selection (ETH/USDT)
  - [ ] Display token balances for selected token
  - [ ] Update `useVault` hook to support ERC20

- [ ] 4. Test end-to-end flow
  - [ ] Type "deposit 1 USDT"
  - [ ] Verify form auto-fills
  - [ ] Execute transaction
  - [ ] Verify balance updates

**Milestone**: UI automatically recognizes intent and triggers form updates

---

## Break (18:30 - 19:30, 1h)

*Dinner*

---

## Session 5: Simulation Execution (19:30 - 21:00, 1.5h)

### Mission H: Pre-execution Safety Checks

- [ ] 1. Implement `simulateContract` with viem
  - [ ] Add simulation before `writeContract` calls
  - [ ] Extract `publicClient` from wagmi config
  - [ ] Create `simulateTransaction` helper function

- [ ] 2. Add error interception
  - [ ] Catch simulation errors before wallet signature
  - [ ] Display user-friendly error messages
  - [ ] Add specific error types:
    - "Insufficient balance"
    - "Insufficient allowance" (for ERC20)
    - "Contract execution will revert"

- [ ] 3. Test safety mechanisms
  - [ ] Try to withdraw more than balance → Should block
  - [ ] Try to deposit without approval → Should block
  - [ ] Try invalid token address → Should block
  - [ ] Verify no wallet signature popup for failed simulations

- [ ] 4. Add UI feedback
  - [ ] Show "Simulating..." state
  - [ ] Display success checkmark when safe
  - [ ] Show warning icon when simulation fails
  - [ ] Add explanation of error to user

**Milestone**: Deliberately input excess amount, frontend successfully intercepts and shows clear error

---

## Day 2 Verification Standards

At the end of Day 2, verify:

1. **Contract Capability**: Your `Vault` can manage both ETH and any ERC20 token balances
2. **Interaction Capability**: Input "存入 100 USDT" (Deposit 100 USDT), UI completes parsing → form filling → execution
3. **Defense Capability**: Simulate "insufficient balance" or "not approved" operation, frontend shows clear error instead of chain exceptions

---

## Architecture Principles: Day 2

### 1. ERC20 "Approve + Pull" Pattern
- **Why**: All DeFi protocols use this pattern
- **Flow**: User approves Vault → Vault pulls tokens via transferFrom
- **Security**: Prevents forced token transfers

### 2. Intent Parsing Architecture
```
Natural Language → Dify AI → JSON Intent → Frontend Logic → Blockchain Transaction
```

### 3. Simulation Before Signature
- **Principle**: `publicClient.simulateContract` uses `eth_call` (no gas, no state change)
- **Benefit**: Catch errors before wallet signature popup
- **Implementation**: Always simulate, only show wallet if simulation succeeds

---

## Coach's Tips

### About MockUSDT
- Don't use real USDT from mainnet
- Write a simple `MockERC20.sol` in Foundry
- Deploy to Anvil - this is the standard developer workflow

### About Dify Configuration
- Set Prompt as `System Role`
- Specify JSON-only output format
- Require `token_address` field for frontend identification
- Test various input phrasings

### About Security
- Never expose API keys on frontend
- Always use Next.js API routes for external API calls
- Validate JSON structure before using
- Add rate limiting for production

---

## Next Action

**Current**: Starting Day 2 missions

**Recommended Start**: Session 1 - Protocol Layer Refactoring (Mission D)
