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
  - [x] Test with: "withdraw 0.5 ETH"
  - [x] Verify JSON response structure
  - [ ] Add fallback for unrecognized intents

**Milestone**: Input command returns structured JSON with action, amount, token, token_address

---

## Session 4: Frontend Integration (16:30 - 18:30, 2h)

### Mission G: AI Panel Component ✅ COMPLETED

**Detailed Implementation:** See `./summary-report/MISSION_G_COMPLETE.md` for full technical details, ERC20 integration guide, and testing checklist.

- [x] 1. Create `AIPanel.tsx` component
  - [x] Add text input for natural language commands
  - [x] Add "Process" button to send to API
  - [x] Display parsed intent preview
  - [x] Show confidence level if available

- [x] 2. Integrate with existing forms
  - [x] Auto-fill `DepositPanel` from AI response
  - [x] Auto-fill `WithdrawPanel` from AI response
  - [x] Handle token selection (ETH vs ERC20)
  - [x] Add visual feedback for AI processing

- [x] 3. Add token selector UI
  - [x] Create dropdown for token selection (ETH/USDT)
  - [x] Display token balances for selected token
  - [x] Update `useVault` hook to support ERC20

- [x] 4. Test end-to-end flow
  - [x] Type "deposit 1 USDT"
  - [x] Verify form auto-fills
  - [x] Execute transaction
  - [x] Verify balance updates

**Milestone**: ✅ UI automatically recognizes intent and triggers form updates

**Implementation Details:**
- Created `AIPanel.tsx` with natural language input
- Integrated with Dify API for intent parsing
- Displays parsed intent: action, amount, token, confidence
- Added to VaultDashboard layout
- Error handling for unknown intents
- Support for both English and Chinese commands
- Auto-fill functionality: Intent passed to DepositPanel and WithdrawPanel
- Visual indicators: "AI Parsed" badge shows when form is auto-filled
- Intent auto-clears after 30 seconds
- **NEW**: Token selector UI with ETH/USDT selection
- **NEW**: ERC20 support in useVault hook (depositToken, withdrawToken, approveUsdt)
- **NEW**: Allowance tracking and approval flow for USDT
- **NEW**: Balance display shows both ETH and USDT

**Files Created:**
- `components/AIPanel.tsx` - AI command interface component
- `components/TokenSelector.tsx` - Token selection UI component
- Updated `components/VaultDashboard.tsx` - Added AIPanel to layout and intent state
- Updated `components/DepositPanel.tsx` - Added token selection and ERC20 support
- Updated `components/WithdrawPanel.tsx` - Added token selection and ERC20 support
- Updated `components/BalanceDisplay.tsx` - Shows both ETH and USDT balances
- Updated `hooks/useVault.ts` - Added ERC20 operations (approve, depositToken, withdrawToken)

---

## Break (18:30 - 19:30, 1h)

*Dinner*

---

## Session 5: Simulation Execution (19:30 - 21:00, 1.5h)

### Mission H: Pre-execution Safety Checks ✅ COMPLETED

- [x] 1. Implement `simulateContract` with viem
  - [x] Add simulation before `writeContract` calls
  - [x] Extract `publicClient` from wagmi config
  - [x] Create `simulateTransaction` helper functions

- [x] 2. Add error interception
  - [x] Catch simulation errors before wallet signature
  - [x] Display user-friendly error messages
  - [x] Add specific error types:
    - "Insufficient balance"
    - "Insufficient allowance" (for ERC20)
    - "Contract execution will revert"

- [x] 3. Test safety mechanisms
  - [x] Try to withdraw more than balance → Should block
  - [x] Try to deposit without approval → Should block
  - [x] Try invalid token address → Should block
  - [x] Verify no wallet signature popup for failed simulations

- [x] 4. Add UI feedback
  - [x] Show "Checking..." state during simulation
  - [x] Display error message when simulation fails
  - [x] Red error box with explanation
  - [x] Button disabled during simulation

**Milestone**: ✅ Deliberately input excess amount, frontend successfully intercepts and shows clear error

**Implementation Details:**
- Added `simulateContract` functions to useVault hook
- Implemented error type detection: insufficient_balance, insufficient_allowance, revert, unknown
- Updated DepositPanel to simulate before deposit/approve
- Updated WithdrawPanel to simulate before withdraw
- UI shows "Checking..." during simulation
- Red error box displays simulation failures
- No MetaMask popup if simulation fails (saves gas!)
- User-friendly error messages instead of raw blockchain errors

**Files Modified:**
- `hooks/useVault.ts` - Added simulation functions and error types
- `components/DepositPanel.tsx` - Added pre-transaction simulation
- `components/WithdrawPanel.tsx` - Added pre-transaction simulation

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

**Current**: Mission G completed - Full ERC20 support with AI-powered natural language interface

**Completed Missions:**
- ✅ Mission D: ERC20 Vault (Protocol Layer)
- ✅ Mission E: Security Foundation
- ✅ Mission F: AI Intent Layer (Dify integration)
- ✅ Mission G: Frontend Integration (AI Panel + ERC20 support)

**Recommended Next**: Mission H - Pre-execution Safety Checks (Simulation Execution)

**Key Achievement:**
- Users can now type "deposit 100 USDT" or "withdraw 0.5 ETH" in natural language
- System automatically parses intent, selects correct token, and fills forms
- Full ERC20 support with approve/transferFrom pattern
- Allowance tracking and smart approval flow

**Documentation:**
- `./summary-report/MISSION_G_COMPLETE.md` - Detailed Mission G implementation guide
- `./summary-report/SECURITY_FOUNDATION.md` - Security patterns and best practices
- `DIFY_INTEGRATION.md` - AI integration documentation
- `FRONTEND_PLAN.md` - Complete frontend architecture and day 2 progress

---

# Day3

## Day 3: Advanced Security Governance & Permission Refactoring (10-Hour Sprint)

### Overview

Day 3 evolves from "single-admin mode" to "multi-role permission governance," implementing AI-powered risk control gates. As a FinTech Transition Architect, you'll master **access control**, **circuit breakers**, and **semantic-level risk assessment**.

---

## Session 1: Protocol Layer - Permission Refactoring (09:00 - 11:30, 2.5h)

### Mission I: Access Control Upgrade with SoD Architecture ✅

**Why Upgrade from Ownable to AccessControl?**

In Day 2, you used `Ownable`, but this is dangerous in real FinTech architectures:

- **Ownable**: Only one boss. If the boss's private key is lost, the entire Vault is compromised.
- **AccessControl**: Supports multiple roles with granular permissions.
- **SoD (Separation of Duties)**: Banking standard - no single person controls everything.

**Understanding OpenZeppelin AccessControl:**

⚠️ **Critical: DEFAULT_ADMIN_ROLE is Built-In**

```solidity
// ❌ NEVER redefine DEFAULT_ADMIN_ROLE!
bytes32 public constant DEFAULT_ADMIN_ROLE = keccak256("DEFAULT_ADMIN_ROLE");

// ✅ CORRECT - DEFAULT_ADMIN_ROLE is built-in (value: 0x00)
// Just use it directly, no need to define

// ✅ Custom roles MUST use keccak256
bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");
```

**How Role Granting Works:**

- By default, **only the role's admin** can grant/revoke that role
- **DEFAULT_ADMIN_ROLE** is the default admin for ALL roles
- Having a role (e.g., OPERATOR_ROLE) doesn't let you grant it to others
- Only DEFAULT_ADMIN_ROLE members can call `grantRole(OPERATOR_ROLE, account)`

**SoD Architecture for VaultV3:**

| Role | Hash Value | Admin Role | Responsibility | Can Touch Money? | Key Functions |
|------|-----------|------------|----------------|------------------|---------------|
| **DEFAULT_ADMIN_ROLE** | `0x00` (built-in) | Self | Root governance | ❌ No | `grantRole()`, `revokeRole()` only |
| **MANAGER_ROLE** | `keccak256("MANAGER_ROLE")` | DEFAULT_ADMIN_ROLE | Risk control officer | ❌ No | `pause()`, `unpause()`, `blacklist()`, `unblacklist()` |
| **OPERATOR_ROLE** | `keccak256("OPERATOR_ROLE")` | DEFAULT_ADMIN_ROLE | Daily operator/AI | ✅ Yes (routine) | Daily deposit/withdraw operations |
| **TREASURER_ROLE** | `keccak256("TREASURER_ROLE")` | DEFAULT_ADMIN_ROLE | Fund officer | ✅ Yes (large amounts) | `approveLargeWithdrawal()`, `setWithdrawalFee()`, `setThreshold()` |

**Implementation Tasks:**

- [x] 1. Import OpenZeppelin libraries
  - [x] Add `import "@openzeppelin/contracts/access/AccessControl.sol"`
  - [x] Add `import "@openzeppelin/contracts/utils/Pausable.sol"`
  - [x] Keep `import "@openzeppelin/contracts/utils/ReentrancyGuard.sol"`
  - [x] Keep `import "@openzeppelin/contracts/token/ERC20/IERC20.sol"`

- [x] 2. Define custom role identifiers (NOT DEFAULT_ADMIN_ROLE)
  ```solidity
  // Custom roles (must define these)
  bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
  bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
  bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");

  // DEFAULT_ADMIN_ROLE is built-in (0x00), don't redefine!
  ```

- [x] 3. Replace `Ownable` with `AccessControl, Pausable`
  - [x] Remove `import "@openzeppelin/contracts/access/Ownable.sol"`
  - [x] Change inheritance from `Ownable, ReentrancyGuard` to `AccessControl, Pausable, ReentrancyGuard`
  - [x] Update constructor:
    ```solidity
    constructor() {
        // DEFAULT_ADMIN_ROLE is built-in, just grant it
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // Grant custom roles to deployer for initial setup
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(TREASURER_ROLE, msg.sender);
    }
    ```

- [x] 4. Implement role-based functions
  - [x] **DEFAULT_ADMIN functions**:
    - [x] `grantManagerRole(address account)` - only DEFAULT_ADMIN_ROLE
    - [x] `grantOperatorRole(address account)` - only DEFAULT_ADMIN_ROLE
    - [x] `grantTreasurerRole(address account)` - only DEFAULT_ADMIN_ROLE
    - [x] `revokeRole(bytes32 role, address account)` - only DEFAULT_ADMIN_ROLE

  - [x] **MANAGER functions** (risk control, cannot touch money):
    - [x] `pause()` - only MANAGER_ROLE, adds `whenNotPaused` modifier
    - [x] `unpause()` - only MANAGER_ROLE
    - [x] `blacklist(address account)` - only MANAGER_ROLE
    - [x] `unblacklist(address account)` - only MANAGER_ROLE

  - [x] **TREASURER functions** (fund management):
    - [x] `approveLargeWithdrawal(address user, uint256 amount, bytes32 requestHash)` - only TREASURER_ROLE
    - [x] `setWithdrawalFee(uint256 newFee)` - only TREASURER_ROLE, max 10%
    - [x] `setLargeWithdrawalThreshold(uint256 newThreshold)` - only TREASURER_ROLE

  - [x] **Public functions** (anyone can use):
    - [x] `deposit()` - add `whenNotPaused` modifier
    - [x] `withdraw(uint256 amount)` - add `whenNotPaused` modifier, check blacklist, check large withdrawal
    - [x] `depositToken(address token, uint256 amount)` - add `whenNotPaused` modifier
    - [x] `withdrawToken(address token, uint256 amount)` - add `whenNotPaused` modifier

- [x] 5. Add security features
  - [x] Blacklist mapping: `mapping(address => bool) public blacklisted`
  - [x] Large withdrawal threshold: `uint256 public largeWithdrawalThreshold = 10 ether`
  - [x] Withdrawal approval mapping: `mapping(bytes32 => bool) public largeWithdrawalApproved`
  - [x] Withdrawal fee system: `uint256 public withdrawalFee`, max 10%
  - [x] Check blacklist in all deposit/withdraw functions
  - [x] Check large withdrawal threshold and require TREASURER approval
  - [x] Apply withdrawal fee when applicable

- [x] 6. Add view functions
  - [x] `hasManagerRole(address account)` - check if has MANAGER_ROLE
  - [x] `hasOperatorRole(address account)` - check if has OPERATOR_ROLE
  - [x] `hasTreasurerRole(address account)` - check if has TREASURER_ROLE
  - [x] `getWithdrawalRequestHash(address user, uint256 amount)` - generate request hash

**Milestone**: ✅ Mission I Complete - Full SoD Architecture Implemented and Tested

- [x] 7. Deploy and test VaultV3
  - [x] Deploy to Anvil
  - [x] Test: Non-admin cannot grant roles
  - [x] Test: Non-manager cannot call `pause()`
  - [x] Test: Non-treasurer cannot approve large withdrawals
  - [x] Test: Blacklisted addresses cannot deposit/withdraw
  - [x] Test: Large withdrawals require treasurer approval
  - [x] Test: Withdrawal fees work correctly
  - [x] Test: Pause stops all operations
  - [x] Test: Role separation works correctly
  - [x] Foundry tests: 38/38 passed



**Milestone**: ✅ Non-manager accounts calling `withdraw` with admin privileges are reverted at contract level

**Files to Create:**
- `contracts/VaultV3.sol` - AccessControl-enabled vault
- `test/VaultV3.t.sol` - Permission testing suite

**Summary**: See `./summary-report/MISSION_I_COMPLETE.md`.

---

## Session 2: Protocol Layer - Circuit Breaker (11:30 - 13:00, 1.5h)

### Mission J: Pausable Mechanism ✅

**Implementation Tasks:**

- [x] 1. Add OpenZeppelin `Pausable`
  - [x] Import `@openzeppelin/contracts/utils/Pausable.sol`
  - [x] Inherit `Pausable` in contract
  - [x] Add `whenNotPaused` modifier to:
    - `deposit()`
    - `depositToken()`
    - `withdraw()`
    - `withdrawToken()`

- [x] 2. Implement pause/resume functions
  ```solidity
  function pause() public onlyRole(ADMIN_ROLE) {
      _pause();
  }

  function resume() public onlyRole(ADMIN_ROLE) {
      _unpause();
  }
  ```

- [x] 3. Test circuit breaker
  - [x] Call pause() as admin → Test: testManagerCanPause()
  - [x] Attempt deposit → Should revert with "EnforcedPause" → Test: testCannotDepositWhenPaused()
  - [x] Call unpause() as admin → Test: testManagerCanUnpause()
  - [x] Attempt deposit → Should succeed → Test: testCanDepositAfterUnpause()

- [x] 4. Integrate with frontend simulation
  - [x] Add `pause()`/`unpause()` to useVault hook
  - [x] Add UI controls for admin-only operations
  - [x] Show "System Paused" banner when paused

**Milestone**: ✅ After calling `pause()`, all `deposit/withdraw` fail simulation with clear error

**Files Created:**
- [x] `components/AdminPanel.tsx` - Admin controls for pause/resume
- [x] Updated `hooks/useVault.ts` - Add pause/resume functions
- [x] `components/SystemPausedBanner.tsx` - Warning banner when paused
- [x] Updated `components/VaultDashboard.tsx` - Integrated admin controls
- [x] Updated `lib/vault.ts` - Added `paused()` function to ABI

**Mission J Status**: ✅ **COMPLETE** - Contract implementation + Frontend integration + Testing

---

## Break (13:00 - 14:00, 1h)

*Lunch and review*

---

## Session 3: AI Layer - Semantic Risk Control (14:00 - 16:30, 2.5h)

### Mission K: Dify Risk Assessment Engine ✅ COMPLETED

**Objective**: Upgrade Dify Agent to identify "anomalous intents" (e.g., withdrawing 100% of balance at once).

**Implementation Tasks:**

- [x] 1. Enhance Dify System Role prompt
  - [x] Add percentage support for amount field ("100%", "50%", etc.)
  - [x] Support "all/全部/所有" → "100%"
  - [x] Support "half/一半" → "50%"

- [x] 2. Update API route to calculate risk
  - [x] Accept `vaultBalances` from frontend
  - [x] Convert percentage strings to actual numbers
  - [x] Calculate risk based on percentage of vault balance
  - [x] Return consistent `amount: number` to frontend

- [x] 3. Implement risk-based UI flow
  - [x] HIGH RISK: Force double confirmation with warning in AIPanel
  - [x] MEDIUM RISK: Show warning but allow single confirmation
  - [x] LOW RISK: Normal flow

- [x] 4. Test risk scenarios (manual testing required)
  - [x] "withdraw all USDT" → HIGH RISK (100%)
  - [x] "withdraw 50% ETH" → MEDIUM RISK (50%)
  - [x] "deposit 100 USDT" → LOW RISK (deposit)

**Milestone**: ✅ API calculates `risk_level` based on vault balance, frontend enforces double confirmation

**Architecture:**
```
Frontend sends: { message, vaultBalances: { ETH: 10, USDT: 1000 } }
     ↓
Dify returns: { amount: "100%", token: "USDT" }
     ↓
API converts: amount = 1000 * (100/100) = 1000
     ↓
API calculates risk: 100% = HIGH
     ↓
Frontend receives: { amount: 1000, risk_level: "high", risk_reason: "..." }
```

**Files Modified:**
- `app/api/chat/route.ts` - Added risk calculation and percentage conversion
- `components/AIPanel.tsx` - Pass vault balances, display risk warnings
- `components/VaultDashboard.tsx` - Updated Intent interface
- `components/DepositPanel.tsx` - Updated Intent interface
- `components/WithdrawPanel.tsx` - Updated Intent interface

**Files to Modify:**
- `app/api/chat/route.ts` - Update Dify prompt and response handling
- `components/AIPanel.tsx` - Add risk display and confirmation flow
- `components/DepositPanel.tsx` - Add risk-based confirmation
- `components/WithdrawPanel.tsx` - Add risk-based confirmation

---

## Session 4: Frontend Layer - Simulation & Interception (16:30 - 18:30, 2h)

### Mission L: Pre-execution Safety ✅ COMPLETED

**Status**: All tasks completed. Simulation infrastructure from Day 2 enhanced with specific error types.

**Enhancement Tasks:**

- [x] 1. Pause/Resume simulation
  - [x] `simulateContract` catches `EnforcedPause` error
  - [x] Shows user-friendly error: "System is paused. Contact admin to resume operations."

- [x] 2. Role-based access simulation
  - [x] `simulateContract` catches AccessControl errors
  - [x] Shows user-friendly error: "Insufficient permissions for this operation."

- [x] 3. Risk-based confirmation flow
  - [x] HIGH RISK: Show warning → Require second confirmation → Simulate
  - [x] MEDIUM RISK: Show warning → Single confirmation → Simulate
  - [x] LOW RISK: Direct → Simulate

- [x] 4. Verify no wallet popup on simulation failure
  - [x] Simulation happens before writeContract
  - [x] MetaMask never appears if simulation fails

**Milestone**: ✅ User clicks AI-filled form with insufficient balance, frontend shows error immediately, MetaMask doesn't popup

**Error Types Supported:**
| Type | Error Message |
|------|--------------|
| `paused` | "System is paused. Contact admin to resume operations." |
| `access_denied` | "Insufficient permissions for this operation." |
| `insufficient_balance` | "Insufficient balance for this transaction" |
| `insufficient_allowance` | "Insufficient allowance. Please approve the token first." |
| `revert` | "Transaction would fail. Please check your inputs." |
| `unknown` | "Transaction could not be simulated" |

---

## Break (18:30 - 19:30, 1h)

*Dinner*

---

## Session 5: Architecture Documentation (19:30 - 21:00, 1.5h)

### Mission M: Governance Specification ✅ COMPLETED

**Documentation Tasks:**

- [x] 1. Update `SECURITY_FOUNDATION.md`
  - [x] Added "Access Control" section with SoD pattern
  - [x] Documented role hierarchy
  - [x] Added "Circuit Breaker" section
  - [x] Documented pause/resume workflow
  - [x] Added "Multi-Layer Security" diagram

- [x] 2. Create Role Matrix
  - [x] Complete permission matrix table
  - [x] Documented role responsibilities
  - [x] Added `onlyRole` usage patterns
  - [x] Added role management best practices

- [x] 3. Create Risk Assessment Guide
  - [x] Documented 5-layer risk assessment architecture
  - [x] Provided risk calculation logic
  - [x] Listed all supported commands and examples
  - [x] Documented double-confirmation flow

- [x] 4. Create Day 3 Summary
  - [x] `./summary-report/MISSION_I_COMPLETE.md` - AccessControl implementation
  - [x] `./summary-report/MISSION_J_COMPLETE.md` - Pausable mechanism
  - [x] `./summary-report/MISSION_K_COMPLETE.md` - AI risk control
  - [x] `./summary-report/MISSION_L_COMPLETE.md` - Pre-execution safety
  - [x] `./summary-report/DAY3_COMPLETE.md` - Complete day 3 summary

**Milestone**: ✅ Clear permission role matrix and comprehensive documentation produced

**Files Created:**
- `summary-report/SECURITY_FOUNDATION.md` - Updated with Access Control & Circuit Breaker
- `summary-report/ROLE_MATRIX.md` - Complete role permission reference
- `summary-report/RISK_ASSESSMENT.md` - Risk control documentation
- `summary-report/MISSION_J_COMPLETE.md` - Pausable mechanism
- `summary-report/DAY3_COMPLETE.md` - Day 3 complete summary

---

## Day 3 Verification Checklist

At the end of Day 3, verify:

1. **Permission Governance Verification**:
   - [ ] Switch MetaMask accounts
   - [ ] Verify only designated "admin account" can execute `pause()` operation
   - [ ] Verify non-admin accounts receive revert when trying to pause

2. **Simulation Pre-check Verification**:
   - [ ] Try to deposit without approval
   - [ ] Frontend captures error via `simulateContract`
   - [ ] Shows "Please approve first" instead of wallet error
   - [ ] MetaMask doesn't popup

3. **AI Risk Control Verification**:
   - [ ] Input "把钱全取了" (withdraw all money)
   - [ ] AI provides warning instead of direct execution
   - [ ] High-risk operations require double confirmation

4. **Circuit Breaker Verification**:
   - [ ] Admin calls `pause()`
   - [ ] All deposit/withdraw operations fail
   - [ ] Admin calls `resume()`
   - [ ] Operations resume normally

---

## Architecture Principles: Day 3

### 1. Principle of Least Privilege
- **Why**: Minimize blast radius of compromised keys
- **Implementation**: Use `AccessControl` with granular roles
- **Benefit**: AI operators can't modify core parameters

### 2. Circuit Breaker Pattern
- **Principle**: `Pausable` modifier on critical functions
- **Trigger**: Admin can pause in emergency
- **Recovery**: Only admin can resume
- **Frontend**: Show "System Paused" banner

### 3. Semantic Risk Assessment
```
User Input → AI Risk Analysis → Risk Score → UI Flow
  ↓              ↓                   ↓            ↓
"withdraw all" → 100% withdrawal → HIGH → Double Confirm
"withdraw 10%" → Normal amount → LOW → Direct Flow
```

### 4. Simulation Before Signature
- **Already Implemented**: Mission H (Day 2)
- **Enhanced**: Add pause/resume and role checking
- **Always**: Catch errors before wallet popup

---

## Coach's Tips

### About AccessControl
- Use `keccak256("ROLE_NAME")` for role identifiers
- `DEFAULT_ADMIN_ROLE` can grant all other roles
- Test role permissions with multiple accounts
- Document role hierarchy clearly

### About Risk Assessment
- Define clear risk thresholds (e.g., >90% = HIGH)
- Consider transaction history in risk calculation
- Provide context in risk warnings (not just "high risk")
- Allow users to proceed after explicit confirmation

### About Circuit Breakers
- Pause should be fast (single function call)
- Resume should require admin verification
- Consider time-based auto-resume (optional)
- Log all pause/resume events

### About Testing
- Test with multiple MetaMask accounts
- Verify role-based access on contract level
- Test simulation catches all error types
- Verify no wallet popup on failures

---

## Next Action

**Current**: Day 2 completed with full ERC20 support and AI integration

**Completed Missions:**
- ✅ Mission D: ERC20 Vault (Protocol Layer)
- ✅ Mission E: Security Foundation
- ✅ Mission F: AI Intent Layer (Dify integration)
- ✅ Mission G: Frontend Integration (AI Panel + ERC20 support)
- ✅ Mission H: Pre-execution Safety Checks (Simulation)

**Recommended Next**: Mission I - Access Control Upgrade (Day 3, Session 1)

**Key Achievement from Day 2:**
- Users can type "deposit 100 USDT" or "withdraw 0.5 ETH" in natural language
- System automatically parses intent, selects correct token, and fills forms
- Full ERC20 support with approve/transferFrom pattern
- Pre-execution simulation prevents failed transactions

**Day 3 Goals:**
- Evolve from single-admin to multi-role governance
- Implement circuit breaker for emergency control
- Add AI-powered risk assessment
- Complete security governance architecture

---

# Day4

## Day 4: Intent-Based Interactions, Yield Strategy, Indexing & Deployment (10-Hour Sprint)

### Overview

Day 4 transforms the vault from a **secure storage system** to a **production-ready DeFi protocol** with yield generation capabilities. As a FinTech Transition Architect, you'll master **EIP-2612 Permit**, **Strategy Pattern**, **Ponder Indexing**, and **Real Testnet Deployment**.

---

## Session 1: Protocol Layer - EIP-2612 Permit (09:00 - 11:30, 2.5h)

### Mission N: Intent-Based Interactions with EIP-2612 ✅ COMPLETED

**Why EIP-2612?**

Current Problem (Day 3):
- Users need TWO transactions for USDT deposit: approve() → depositToken()
- Poor UX, higher gas costs, more failure points

EIP-2612 Solution:
- Users sign ONE off-chain permit (gasless)
- Single transaction: depositWithPermit() handles approval + deposit
- "Intent-based interaction" - hottest Web3 architect skill in 2025-2026

**Implementation Tasks:**

- [x] 1. Update MockERC20.sol to support EIP-2612
  - [x] Import `@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol`
  - [x] Change inheritance: `ERC20, ERC20Permit, Ownable`
  - [x] Update constructor: Add `ERC20Permit("Mock USDT")` initialization
  - [x] Test: Contract has `permit()`, `nonces()`, `DOMAIN_SEPARATOR()` functions

- [x] 2. Add `depositWithPermit()` to VaultV3.sol
  - [x] Import `IERC20Permit` from OpenZeppelin
  - [x] Create function signature:
    ```solidity
    function depositWithPermit(
        address token,
        uint256 amount,
        address owner,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant whenNotPaused
    ```
  - [x] Implement logic:
    - Verify parameters (amount > 0, not blacklisted, deadline not expired)
    - Call `IERC20Permit(token).permit(owner, spender, amount, deadline, v, r, s)`
    - Call `IERC20(token).transferFrom(owner, address(this), amount)`
    - Update `tokenBalances[token][owner]`
    - Emit `TokenDeposited` event
  - [x] Add error handling for invalid signatures

- [x] 3. Create `usePermitSignature` hook (frontend)
  - [x] Create `frontend/hooks/usePermitSignature.ts`
  - [x] Implement `signPermit()` function:
    - Get token nonce from contract
    - Build EIP-712 domain separator (name, version, chainId, verifyingContract)
    - Create Permit struct (owner, spender, value, nonce, deadline)
    - Call `walletClient.signTypedData()` to get signature
    - Split signature into v, r, s components
    - Return `{ v, r, s, deadline }`
  - [x] Add error handling for signature failures

- [x] 4. Update DepositPanel.tsx for permit flow
  - [x] Import `usePermitSignature` hook
  - [x] Add permit flow logic:
    - Try permit signature generation first
    - If successful, call `depositWithPermit()` (one transaction)
    - If failed, fallback to approve + deposit (two transactions)
  - [x] Add UI indicator: "One-Click Deposit" for USDT
  - [x] Show success/error messages

- [x] 5. Update ABIs and test
  - [x] Add `depositWithPermit` to VAULT_ABI in `lib/vault.ts`
  - [x] Add `permit`, `nonces`, `DOMAIN_SEPARATOR` to ERC20_ABI
  - [x] Test: User deposits USDT without prior approval
  - [x] Verify: Single MetaMask popup for signature + transaction

**Milestone**: ✅ User deposits USDT in ONE transaction (no prior approve needed)

**Files Modified:**
- `contracts/MockERC20.sol` - Add ERC20Permit inheritance
- `contracts/VaultV3.sol` - Add depositWithPermit function
- `frontend/hooks/usePermitSignature.ts` - NEW FILE - EIP-2612 signature generation
- `frontend/hooks/useVault.ts` - Add depositWithPermit function
- `frontend/components/DepositPanel.tsx` - Integrate permit flow
- `frontend/lib/vault.ts` - Update ABIs


---

## Session 2: Protocol Layer - Strategy Pattern (11:30 - 14:00, 2.5h)

### Mission O: Robust Aave Strategy Architecture (Strategy Pattern) ✅ COMPLETED

**Why Strategy Pattern?**

Current Problem (Day 3):
- Vault stores funds but doesn't generate yield
- All funds sit idle in contract
- Changing yield protocol requires vault contract upgrade

Strategy Pattern Solution:
- Decouple vault from yield protocol (Aave, Compound, Uniswap)
- Add new strategies without touching vault logic
- Control fund flow with try/catch for external protocol risk

**Aave V3 on Sepolia:**
- Aave V3 is deployed on Sepolia testnet — no API key needed, it's an on-chain protocol
- Aave Pool (Sepolia): `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951`
- For local Anvil testing, we use a `MockAavePool.sol` (like MockERC20 — a test stand-in)
- On Sepolia deployment, AaveStrategy points to the real Aave V3 Pool

**Architecture: Fund Routing**
```
Vault.invest() → Strategy.deposit() → AavePool.supply()
Vault.divest() → Strategy.withdraw() → AavePool.withdraw()
```

**Security Logic (Tutor's Key Points):**
1. **Permission Locking**: Only `Vault` can call `Strategy` deposit/withdraw (modifier: `onlyVault`)
2. **Fund Routing**: `Vault.invest()` → `Strategy.deposit()` → `AavePool.supply()`
3. **Failure Isolation**: `try/catch` wraps all Aave calls — external protocol failure never crashes the Vault

**Implementation Tasks:**

- [x] 1. Create IStrategy.sol interface
  - [x] Create `contracts/IStrategy.sol`
  - [x] Define interface:
    ```solidity
    interface IStrategy {
        function deposit(uint256 amount) external returns (bool success);
        function withdraw(uint256 amount) external returns (bool success);
        function totalAssets() external view returns (uint256);
        function underlyingToken() external view returns (address);
        function emergencyWithdraw() external returns (bool success);
    }
    ```
  - [x] Add events: `Deposited`, `Withdrawn`, `EmergencyWithdrawn`

- [x] 2. Create MockAavePool.sol (for local Anvil testing only)
  - [x] Create `contracts/mocks/MockAavePool.sol`
  - [x] Simulate Aave's `supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)`
  - [x] Simulate Aave's `withdraw(address asset, uint256 amount, address to)`
  - [x] Track balances internally (simple mapping)
  - [x] ~30 lines — just enough so Strategy's try/catch has something to call

- [x] 3. Create AaveStrategy.sol implementation
  - [x] Create `contracts/AaveStrategy.sol`
  - [x] State variables:
    ```solidity
    address public immutable vault;       // Only authorized caller
    address public immutable token;       // Underlying token (USDT)
    address public aavePool;              // Aave V3 Pool address (configurable for mock vs real)
    ```
  - [x] Constructor: Set vault, token, aavePool addresses
  - [x] `modifier onlyVault()` — only the Vault contract can call deposit/withdraw
  - [x] Implement `deposit(uint256 amount)`:
    - Only vault can call (`onlyVault`)
    - Transfer tokens from vault to strategy
    - Approve Aave pool to spend tokens
    - `try IPool(aavePool).supply(token, amount, address(this), 0)` with catch
    - If catch: return tokens to vault, return false
    - Emit event on success
  - [x] Implement `withdraw(uint256 amount)`:
    - Only vault can call (`onlyVault`)
    - `try IPool(aavePool).withdraw(token, amount, vault)` with catch
    - Emit event on success
  - [x] Implement `totalAssets()`: Return aToken balance (or token balance from pool)
  - [x] Implement `emergencyWithdraw()`: Owner withdraws all funds back to vault

- [x] 4. Integrate strategy into VaultV3.sol
  - [x] Add state variables:
    ```solidity
    IStrategy public strategy;
    ```
  - [x] Add events: `StrategySet`, `Invested`, `Divested`
  - [x] Add `setStrategy(address _strategy)`:
    - Only `DEFAULT_ADMIN_ROLE` can call
    - Verify strategy's `underlyingToken()` matches expected token
    - Set `strategy`
  - [x] Add `invest(address token, uint256 amount)`:
    - Only `TREASURER_ROLE` can call
    - Transfer tokens to strategy, then call `strategy.deposit(amount)`
    - Use try/catch — if strategy fails, tokens stay in vault
    - Emit `Invested` event
  - [x] Add `divest(uint256 amount)`:
    - Only `TREASURER_ROLE` can call
    - Call `strategy.withdraw(amount)`
    - Emit `Divested` event
  - [x] Add `getTotalBalance(address token)`:
    - Return `tokenBalances[token][user] + strategy.totalAssets()` (vault + strategy)

- [x] 5. Write Foundry tests
  - [x] Create `test/AaveStrategy.t.sol`
  - [x] Test: Only vault can call `deposit()` / `withdraw()` (onlyVault modifier)
  - [x] Test: `invest()` moves tokens from vault to strategy to MockAavePool
  - [x] Test: `divest()` moves tokens back from pool to vault
  - [x] Test: `getTotalBalance()` returns vault balance + strategy balance
  - [x] Test: try/catch isolation — make MockAavePool revert, verify vault is unaffected
  - [x] Test: Only TREASURER_ROLE can call `invest()` / `divest()`
  - [x] Test: Only DEFAULT_ADMIN_ROLE can call `setStrategy()`
  - [x] Test: `emergencyWithdraw()` returns all funds to vault

- [x] 6. Add frontend support
  - [x] Update `frontend/hooks/useVault.ts`:
    - Add `invest(amount)` function
    - Add `divest(amount)` function
    - Add `getTotalBalance()` read
  - [x] Update `frontend/components/AdminPanel.tsx`:
    - Add "Invest to Aave" / "Divest from Aave" buttons (Treasurer only)
    - Show strategy balance alongside vault balance

**Milestone**: VaultV3 can route USDT to Aave via Strategy, and strategy failures don't crash the vault

**Files to Create/Modify:**
- `contracts/IStrategy.sol` - NEW - Generic strategy interface
- `contracts/mocks/MockAavePool.sol` - NEW - Local test mock for Aave
- `contracts/AaveStrategy.sol` - NEW - Aave V3 strategy implementation
- `contracts/VaultV3.sol` - MODIFY - Add strategy integration
- `test/AaveStrategy.t.sol` - NEW - Strategy test suite
- `frontend/hooks/useVault.ts` - MODIFY - Add invest/divest
- `frontend/components/AdminPanel.tsx` - MODIFY - Add strategy controls

---

## Break (14:00 - 15:00, 1h)

*Lunch and review*

---

## Session 3: Data Layer - Minimal Ponder Indexing (15:00 - 17:00, 2h)

### Mission P: Minimal Indexing Gateway

**Why Ponder Indexing?**

Current Problem:
- Frontend relies on RPC calls for all data
- No historical transaction tracking
- Slow and expensive to query past events

Ponder Solution:
- Transform blockchain "cold data" (events) to "hot data" (instant queries)
- Modern alternative to The Graph
- Uses TypeScript — your 10-year frontend experience is a direct advantage here
- <30 lines of handler code with AI assistance

**Tutor's approach: Keep it minimal.**
- ONE entity: `DepositHistory`
- ONE handler: listen to `TokenDeposited` event
- Store `sender`, `amount`, `timestamp` — done.

**Implementation Tasks:**

- [x] 1. Initialize Ponder project
  - [x] Run `pnpm create ponder` in project root (follow prompts, select existing ABI)
  - [x] Copy VaultV3 ABI JSON to the ponder project's `abis/` directory

- [x] 2. Configure `ponder.config.ts`
  - [x] Set network: Anvil local (chainId 31337, rpcUrl `http://localhost:8545`)
  - [x] Set contract: VaultV3 address + ABI
  - [x] Note: When switching to Sepolia later, just change network config

- [x] 3. Define schema in `ponder.schema.ts`
  - [x] Define ONE entity: `DepositHistory`

- [x] 4. Write handler in `src/index.ts` (<30 lines)
  - [x] Listen to `TokenDeposited` event
  - [x] On event: create `DepositHistory` record with sender, amount, timestamp

- [x] 5. Test locally
  - [x] Start Ponder: `pnpm dev`
  - [x] Query via Ponder's built-in GraphQL playground
  - [x] Verified 4 deposit records returned

**Milestone**: ✅ Ponder running locally, queried deposit history via GraphQL — 4 records confirmed

**Files to Create:**
- `ponder-indexing/ponder.config.ts` - Ponder configuration
- `ponder-indexing/ponder.schema.ts` - DepositHistory schema
- `ponder-indexing/src/index.ts` - Event handler (<30 lines)

---

## Session 4: Full-Stack Deployment - Sepolia Testnet (17:00 - 20:00, 3h)

### Mission Q: Real Network Deployment

**Why Sepolia?**

Leave the Anvil sandbox and face real-world challenges:
- Real gas costs and block confirmations
- Contract verification on Etherscan (public source code)
- Real Aave V3 protocol interaction
- Real transaction history visible to anyone

**Implementation Tasks:**

- [x] 1. Prepare environment
  - [x] Get Alchemy API key (free tier): https://www.alchemy.com/
  - [x] Get Etherscan API key (free): https://etherscan.io/apis
  - [x] Create a **dedicated testnet wallet** (never use mainnet keys!) (0x4423D93f6DbF82aAbeaa50A72F4Be9ABe4464F08)
  - [x] Get Sepolia ETH from faucet (try multiple if one is dry):
    - Google Cloud faucet: https://cloud.google.com/application/web3/faucet/ethereum/sepolia
    - Alchemy faucet: https://sepoliafaucet.com/
  - [x] Set environment variables in `.env`:
    ```bash
    PRIVATE_KEY=your_sepolia_private_key
    SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
    ETHERSCAN_API_KEY=your_etherscan_api_key
    ```

- [x] 2. Update foundry.toml for Sepolia
  - [x] Add Sepolia RPC and Etherscan config:
    ```toml
    [rpc_endpoints]
    sepolia = "${SEPOLIA_RPC_URL}"

    [etherscan]
    sepolia = { key = "${ETHERSCAN_API_KEY}" }
    ```

- [x] 3. Create/update deployment script
  - [x] Update `script/Deploy.s.sol` to deploy all contracts:
    1. Deploy MockERC20 (test USDT with Permit)
    2. Deploy VaultV3
    3. Deploy AaveStrategy (pointing to real Aave V3 Pool on Sepolia: `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951`)
    4. Set strategy in VaultV3
    5. Mint test USDT to deployer
  - [x] Log all deployed addresses with `console.log()`

- [x] 4. Deploy and verify on Etherscan
  - [x] Deploy:
    ```bash
    forge script script/Deploy.s.sol:DeployScript \
      --rpc-url $SEPOLIA_RPC_URL \
      --broadcast \
      --verify \
      --etherscan-api-key $ETHERSCAN_API_KEY
    ```
  - [x] Save all deployed addresses to `DEPLOYED_ADDRESSES.md`

- [x] 5. Update frontend for Sepolia
  - [x] Use env-based chain config (support both Anvil and Sepolia):
    - `frontend/.env.local`:
      ```bash
      NEXT_PUBLIC_CHAIN=sepolia
      NEXT_PUBLIC_ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
      NEXT_PUBLIC_VAULT_ADDRESS=<deployed_vault_address>
      NEXT_PUBLIC_USDT_ADDRESS=<deployed_usdt_address>
      ```
    - Update `frontend/lib/wagmi.ts` to read chain from env
      - To get a project id:
        1. Go to https://cloud.walletconnect.com                                                                                     
        2. Sign in → Create Project → name it anything (e.g. "ai-vault")                                                           
        3. Copy the Project ID (a 32-char hex string)                                                                                
        4. Replace 'YOUR_PROJECT_ID' with it  
    - Update `frontend/lib/vault.ts` to read addresses from env
  - [x] This way you can switch between Anvil and Sepolia by changing `.env.local`

- [ ] 6. End-to-end test on Sepolia
  - [x] Connect MetaMask to Sepolia network
  - [x] Test deposit ETH to vault
  - [x] Test deposit USDT with permit (one-click)
  - [x] Check all transactions on Etherscan
  - [x] Verify contract source code is visible on Etherscan

**Milestone**: ✅ All contracts deployed to Sepolia, verified on Etherscan, frontend fully functional on testnet

**Files to Create/Modify:**
- `script/Deploy.s.sol` - UPDATE - Full deployment script for Sepolia
- `foundry.toml` - MODIFY - Add Sepolia config
- `frontend/.env.local` - NEW - Environment-based chain/address config
- `frontend/lib/wagmi.ts` - MODIFY - Env-based chain selection
- `frontend/lib/vault.ts` - MODIFY - Env-based contract addresses
- `DEPLOYED_ADDRESSES.md` - NEW - Record of all Sepolia deployments

---

## Session 5: AI Layer - Strategy Suggestions (20:00 - 21:00, 1h)

### Mission R: AI-Powered Strategy Advisory

**Why upgrade the AI layer?**

Current state: Dify only does risk assessment ("this withdrawal is HIGH risk").
Next level: Dify gives **strategy suggestions** ("Aave USDT yield is 4.2% — should you invest?").

This connects your AI layer to the Strategy layer, completing the "Deposit → Invest → Monitor" loop.

**Implementation Tasks:**

- [ ] 1. Enhance Dify system prompt
  - [ ] Add strategy-related intents: "invest", "divest", "check yield"
  - [ ] Add intent schema for strategy actions:
    ```json
    {"action": "invest|divest|check_yield", "amount": number, "token": "USDT", "protocol": "aave"}
    ```

- [ ] 2. Update API route for strategy suggestions
  - [ ] Accept strategy-related intents from Dify
  - [ ] For "check_yield" or deposit intents, add a suggestion field:
    - e.g., `"suggestion": "You have 1000 USDT idle in vault. Consider investing in Aave for yield."`
  - [ ] For "invest" intents, calculate risk same as withdrawals

- [ ] 3. Update AIPanel.tsx
  - [ ] Display strategy suggestions when returned
  - [ ] Support "invest" and "divest" as AI-driven actions
  - [ ] Example: User types "should I invest my USDT?" → AI responds with suggestion + one-click invest button

- [ ] 4. Test AI strategy flow
  - [ ] "invest 500 USDT in Aave" → parses intent, fills invest form
  - [ ] "check my yield" → shows current Aave balance and earnings
  - [ ] "should I invest?" → AI gives suggestion based on idle balance

**Milestone**: Dify upgrades from "risk assessment" to "strategy advisor" — user can ask "should I invest?" and get actionable advice

**Files to Modify:**
- `app/api/chat/route.ts` - Add strategy intents and suggestions
- `components/AIPanel.tsx` - Display strategy suggestions and invest actions

---

## Day 4 Verification Checklist

At the end of Day 4, verify:

1. **EIP-2612 Permit** (Mission N - Done):
   - [x] User deposits USDT without prior approval (one-click)
   - [x] Fallback to two-step flow works if permit fails

2. **Strategy Pattern** (Mission O):
   - [x] AaveStrategy deployed with MockAavePool on Anvil
   - [x] `invest()` moves USDT from vault → strategy → pool
   - [x] `divest()` moves USDT back
   - [x] `getTotalBalance()` includes strategy funds
   - [x] try/catch: strategy failure does NOT revert vault operations

3. **Ponder Indexing** (Mission P):
   - [x] Ponder container running, indexing `TokenDeposited` events
   - [x] GraphQL query returns deposit you just made

4. **Sepolia Deployment** (Mission Q):
   - [x] Contracts verified on Etherscan (source code visible)
   - [x] Frontend works on Sepolia (deposit, withdraw, permit all functional)
   - [x] Strategy connects to real Aave V3 on Sepolia

5. **AI Strategy Advisory** (Mission R):
   - [ ] Dify can parse "invest" and "check yield" intents
   - [ ] AI gives strategy suggestions based on idle vault balance

---

## Architecture Principles: Day 4

### 1. Intent-Based Interaction (EIP-2612)
- **Principle**: Sign once, execute once
- **Benefit**: Better UX, lower gas costs
- **Implementation**: Off-chain permit signature + on-chain execution

### 2. Strategy Pattern (Decoupled Yield)
- **Principle**: Decouple vault from yield protocols via interface
- **Benefit**: Switch strategies (Aave → Compound → Lido) without upgrading vault
- **Safety**: try/catch isolates external protocol failures from vault
- **Permissions**: Only Vault calls Strategy (onlyVault), only Treasurer triggers invest/divest

### 3. Event Indexing (Cold → Hot Data)
- **Principle**: Transform blockchain events to instantly queryable data
- **Benefit**: No more slow RPC polling; structured data for analytics
- **Implementation**: Ponder listens to events, stores in DB, serves via GraphQL

### 4. Progressive Deployment
- **Principle**: Anvil (mock) → Sepolia (real testnet) → Mainnet
- **Benefit**: Test in increasingly realistic environments
- **Implementation**: Same contracts, env-based network switching

### 5. AI-Driven DeFi Advisory
- **Principle**: AI layer evolves from risk gatekeeper to strategy advisor
- **Benefit**: Users get actionable yield suggestions, not just warnings
- **Implementation**: Dify parses strategy intents, API enriches with on-chain data

---

## Coach's Tips

### About Strategy Pattern
- Use try/catch for ALL external protocol calls — this is non-negotiable
- Only vault should call strategy functions (onlyVault modifier)
- MockAavePool is like MockERC20 — a test stand-in for local development
- On Sepolia, point to real Aave V3 Pool: `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951`
- Emergency withdraw for owner in crisis

### About Ponder Indexing
- Keep it minimal: one entity, one handler, <30 lines
- Ponder uses TypeScript — leverage your 10 years of frontend experience
- Start local, then point to Sepolia RPC when deployed
- GraphQL is auto-generated — no extra work needed

### About Sepolia Deployment
- Use dedicated testnet wallet (NEVER mainnet keys)
- Get testnet ETH from multiple faucets (they can be unreliable)
- If `--verify` fails, use `forge verify-contract` separately
- Save all deployed addresses — you'll need them for frontend and Ponder config
- Use `.env` for chain switching, don't hardcode addresses

### About AI Strategy Advisory
- Build on existing Dify + API route architecture
- Add "invest/divest/check_yield" to the intent schema
- Suggestions should be informational, not auto-executing (user confirms)

---

## Next Action

**Current**: Mission N (EIP-2612 Permit) completed

**Completed Missions:**
- ✅ Mission N: EIP-2612 Permit (Intent-Based Interactions)

**Remaining Missions:**
- Mission O: Aave Strategy Architecture (Strategy Pattern)
- Mission P: Minimal Ponder Indexing (Data Layer)
- Mission Q: Sepolia Testnet Deployment (Full-Stack)
- Mission R: AI Strategy Advisory (AI Layer Upgrade)

**Recommended Order**: O → P → Q → R
- O first: Strategy contracts need to exist before deploying to Sepolia
- P second: Set up indexing locally while contracts are fresh
- Q third: Deploy everything to Sepolia (real network)
- R last: AI upgrade builds on top of everything

**Key Achievement after Day 4:**
Complete "Deposit → Invest → Monitor" loop:
- One-click deposits with permit (N)
- Yield generation through Aave strategy (O)
- Instant data queries with Ponder (P)
- Production-ready on Sepolia with verified contracts (Q)
- AI-powered strategy advisory (R)

# Day 5: AI-Powered Strategy Advisory System(extended mission from 'Mission R' in Day 4 plan)

## Context

**Problem**: The current AI layer (Dify) is a stateless intent parser — it maps "deposit 100 USDT" to JSON but has zero knowledge of the user's vault state, market rates, or strategy performance. It cannot advise.

**Goal**: Transform Dify from a **parser** into a **strategy advisor** that reads real Aave on-chain data, reasons with Chain of Thought, and guides users through a multi-turn "suggest → confirm → execute" flow with safety pre-checks.

**Architecture Overview**:
```
Frontend (AIPanel)
  → sends vault state + user message
  → POST /api/chat (upgraded, stateful conversation_id)
     → POST /api/vault-context (new, reads on-chain data)
        → Aave Pool.getReserveData() on Sepolia (real APY)
        → viem getGasPrice() (real gas)
        → calculates net APY
     → Dify Chatflow (upgraded with new nodes, keeps multi-turn)
        → Node 1: HTTP Request → vault-context API
        → Node 2: Knowledge Retrieval (Aave_Strategy_Context.md)
        → Node 3: LLM reasoning (CoT)
        → Node 4: structured output (strategy_logic + action_data)
        → conversation_id maintained across turns (built-in)
  ← returns { action: "suggest" | "intent_confirmed", strategy_logic, action_data }
  → Frontend renders: suggestion bubble OR Transaction Card
  → On confirm click: safety pre-check (re-fetch APY, deviation check)
  → Execute invest/divest via useVault hook
```

---

## Step 1: Data Pipeline — vault-context API (1 Day)

### Goal
Create `app/api/vault-context/route.ts` that returns real-time on-chain data for Dify to reason with.

### 1.1 Create Aave ABI fragment for reading reserve data

**File**: `frontend/lib/aave.ts` (NEW)

The Aave V3 Pool contract at `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951` has a `getReserveData(address asset)` function that returns a struct including `currentLiquidityRate` (supply APY in RAY format, 27 decimals).

We also need `getReservesList()` to find which tokens Aave recognizes on Sepolia (to pick a real listed USDT/USDC address for APY reference).

```typescript
// ABI fragments needed:
// Pool.getReserveData(address asset) → returns struct with currentLiquidityRate
// Pool.getReservesList() → returns address[] of listed assets

export const AAVE_POOL_ABI = parseAbi([
  'function getReserveData(address asset) external view returns ((uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
  'function getReservesList() external view returns (address[])',
])

export const AAVE_POOL_SEPOLIA = '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951' as const

// Virtual ETH price for Sepolia gas cost calculation (ETH has no real value on testnet)
export const VIRTUAL_ETH_PRICE_USD = 2200
```

**Important**: The `getReserveData` return type is a tuple struct. The `currentLiquidityRate` is at index 2 (0-based). It's in RAY format (1e27). Conversion: `currentLiquidityRate / 1e27 * 100 = APY%`.

**Finding the Aave-listed USDT on Sepolia**: We'll call `getReservesList()` once during development to discover the correct address, then hardcode it in `aave.ts` as `AAVE_LISTED_USDT_SEPOLIA`. This avoids a runtime lookup on every request.

**Prerequisite task**: Before coding Step 1, run this one-time command to find listed tokens:
```bash
cast call 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951 \
  "getReservesList()(address[])" \
  --rpc-url $SEPOLIA_RPC_URL
```
This returns all Aave-listed token addresses on Sepolia. We pick the one that represents USDT or USDC and hardcode it.

### 1.2 Create vault-context API route

**File**: `frontend/app/api/vault-context/route.ts` (NEW)

**Request**: `GET` (no body needed — reads on-chain data directly)

**Query params** (optional, for user-specific context from frontend):
- `vaultIdle` — USDT sitting idle in vault
- `strategyBalance` — USDT deployed in Aave
- `userUsdtBalance` — user's total USDT in vault

**Response JSON**:
```typescript
{
  success: boolean
  data: {
    aave: {
      supplyApy: number          // e.g., 3.897 (percentage)
      token: string              // "USDT"
      listedTokenAddress: string // Aave's real USDT on Sepolia
    }
    gas: {
      gasPriceGwei: number       // e.g., 2.5
      estimatedTxCostUsd: number // e.g., 0.12 (using virtual ETH price)
    }
    netApy: number               // ((principal * APY) - gasCost) / principal
    vault: {
      idleUsdt: number           // from query param
      strategyUsdt: number       // from query param
      userUsdt: number           // from query param
    }
    timestamp: number            // Unix timestamp
  }
  error?: string                 // If Aave call failed, include error and fallback data
}
```

**Implementation logic**:
1. Create a viem `publicClient` pointing to Sepolia RPC (from env `SEPOLIA_RPC_URL` or `NEXT_PUBLIC_ALCHEMY_RPC_URL`)
2. Call `Pool.getReserveData(AAVE_LISTED_USDT_SEPOLIA)` → extract `currentLiquidityRate`
3. Convert RAY to percentage: `Number(currentLiquidityRate) / 1e27 * 100`
4. Call `getGasPrice()` → convert to Gwei
5. Estimate gas cost: `gasPrice * 200_000 (estimated gas units) * VIRTUAL_ETH_PRICE_USD / 1e18`
6. Calculate net APY using query param `vaultIdle` as principal:
   - `netApy = ((vaultIdle * supplyApy / 100) - estimatedTxCostUsd) / vaultIdle * 100`
   - If `vaultIdle <= 0`, set `netApy = supplyApy` (no principal to net against)
7. Wrap Aave calls in try/catch — if Aave is down, return `error` field with message and `supplyApy: 0`

**Anvil fallback**: If `NEXT_PUBLIC_CHAIN !== 'sepolia'`, return mock data:
```json
{ "supplyApy": 4.2, "gasPriceGwei": 1, "estimatedTxCostUsd": 0.01, "netApy": 4.19 }
```

### 1.3 Verification — Step 1

- Start frontend dev server
- `curl http://localhost:3000/api/vault-context?vaultIdle=1000&strategyBalance=200`
- Verify response contains real `supplyApy` from Aave (should be a non-zero number)
- Verify `gasPriceGwei` is a real value
- Verify `netApy` is calculated correctly
- Test error handling: use an invalid RPC URL, verify graceful fallback

---

## Step 2: Knowledge Base + Dify Chatflow Upgrade (1 Day)

### Goal
Upgrade the existing Dify Chatflow with HTTP Request, Knowledge Retrieval, and CoT reasoning nodes. Stay with Chatflow (not Workflow) because Chatflow supports multi-turn `conversation_id` natively, which is required for our suggest → confirm flow.

### 2.1 Create knowledge base document

**File**: `docs/Aave_Strategy_Context.md` (NEW — uploaded to Dify Knowledge Base)

Content covers:
- What Aave V3 is (lending protocol, supply to earn yield)
- Risk thresholds by investor profile:
  - Conservative: only invest if net APY > 3%, max 50% of idle funds
  - Moderate: invest if net APY > 1%, max 80% of idle funds
  - Aggressive: invest if net APY > 0%, up to 100% of idle funds
- Red line: if `netApy < 0` (gas cost exceeds yield), MUST block with warning
- What "idle USDT" means (funds in vault not earning yield)
- What "strategy balance" means (funds deployed in Aave, earning yield)
- Gas cost considerations on Ethereum

### 2.2 Configure Dify Chatflow (Manual — user does this in Dify dashboard)

**Why Chatflow, not Workflow?**
- Chatflow supports `conversation_id` for multi-turn memory (Workflow does not)
- Modern Dify Chatflow supports the same node types as Workflow: HTTP Request, Knowledge Retrieval, LLM, Code, etc.
- We need multi-turn for the "suggest → confirm" flow — switching to Workflow would lose this

**Chatflow nodes**:

**Node 1: Start**
- Input variable: `query` (user's message)
- Input variable: `vault_context_url` (set to the vault-context API URL)

**Node 2: HTTP Request**
- Method: GET
- URL: `{{vault_context_url}}` (the vault-context API endpoint)
- This fetches real-time APY, gas, and vault state
- Output: `http_response` (the JSON from vault-context)

**Node 3: Knowledge Retrieval**
- Knowledge base: `Aave_Strategy_Context.md`
- Query: `{{query}}`
- Retrieves relevant risk thresholds and strategy guidance

**Node 4: LLM (Main reasoning node)**
- Model: Claude or GPT-4
- System prompt with CoT instructions:

```
You are a DeFi strategy advisor for a Web3 vault system.

You have access to:
1. Real-time market data (from HTTP node): {{http_response}}
2. Strategy knowledge base (from retrieval): {{knowledge}}
3. User's question: {{query}}

RESPONSE FORMAT — Return ONLY valid JSON, no markdown:
{
  "action": "suggest" | "intent_confirmed" | "unknown",
  "strategy_logic": "<human-readable explanation for the user>",
  "action_data": {
    "type": "invest" | "divest" | "check_yield" | "none",
    "amount": <number or 0>,
    "token": "USDT",
    "protocol": "aave",
    "net_apy": <number from http data>,
    "risk_level": "low" | "medium" | "high"
  },
  "confidence": "high" | "medium" | "low"
}

REASONING RULES (think step by step):
1. First, check the net APY from the HTTP data.
   - If net_apy < 0: action="suggest", risk_level="high", strategy_logic MUST warn that gas exceeds yield.
   - If net_apy > 0: proceed to step 2.

2. Check the user's idle USDT (from vault data in HTTP response).
   - If idle > 0 and user asks about investing or yield: suggest investing with specific amount.
   - If idle = 0: tell user all funds are deployed or they need to deposit first.

3. Determine action:
   - If user is ASKING (e.g., "should I invest?", "check yield"): action="suggest"
   - If user is CONFIRMING (e.g., "yes invest", "do it", "confirm"): action="intent_confirmed"
   - If unclear: action="suggest" with clarifying question in strategy_logic

4. For "intent_confirmed", include the exact amount in action_data.

5. Always include strategy_logic with clear reasoning the user can understand.
```

**Node 5: Output**
- Variables: Parse LLM output JSON → extract `action`, `strategy_logic`, `action_data`, `confidence`

### 2.3 Update chat API route for Chatflow + multi-turn

**File**: `frontend/app/api/chat/route.ts` (MODIFY)

**Key changes**:
1. Keep the existing Dify API endpoint `POST /v1/chat-messages` (Chatflow API — unchanged)
2. Pass `vault_context_url` as an input variable to Dify (Chatflow supports `inputs` dict)
3. Accept and return `conversation_id` for multi-turn state:
   - Request adds: `conversation_id?: string`
   - Response adds: `conversation_id: string` (from Dify response)
   - Currently sends `conversation_id: ''` — change to pass through the stored ID
4. Update `IntentResponse` type to match new Chatflow output:
   ```typescript
   interface IntentResponse {
     action: 'suggest' | 'intent_confirmed' | 'unknown'
     strategy_logic: string      // human-readable advice
     action_data: {
       type: 'invest' | 'divest' | 'check_yield' | 'deposit' | 'withdraw' | 'none'
       amount: number
       token: string
       protocol: string
       net_apy: number
       risk_level: 'low' | 'medium' | 'high'
     }
     confidence: 'high' | 'medium' | 'low'
   }
   ```
5. Keep the existing risk calculation as a fallback for deposit/withdraw intents
6. For backward compatibility: if Dify returns old-format responses (from the existing Chatflow), handle gracefully

**Dify Chatflow API call format** (same endpoint as before, just add inputs + conversation_id):
```typescript
const response = await fetch(DIFY_API_URL, {  // stays as /v1/chat-messages
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${DIFY_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    inputs: {
      vault_context_url: `${baseUrl}/api/vault-context?vaultIdle=${vaultIdle}&strategyBalance=${strategyBalance}`,
    },
    query: message,
    response_mode: 'blocking',
    user: userId,
    conversation_id: conversationId || '',  // pass stored ID for multi-turn
  }),
})
```

**Key advantage of staying with Chatflow**: The API endpoint, request format, and response format are almost identical to what we already have. The only additions are:
- `inputs` dict (for vault_context_url)
- Storing and passing `conversation_id` from previous response

### 2.4 Verification — Step 2

- Configure Dify Chatflow with HTTP Request + Knowledge + LLM nodes
- Upload `Aave_Strategy_Context.md` to Dify Knowledge Base
- Test in Dify playground: "should I invest my USDT?"
  - Verify HTTP node fetches real data from vault-context API
  - Verify LLM generates structured JSON with strategy_logic
- Test via `curl` to `/api/chat`:
  ```bash
  curl -X POST http://localhost:3000/api/chat \
    -H 'Content-Type: application/json' \
    -d '{"message":"should I invest?","vaultBalances":{"ETH":1,"USDT":1000,"vaultIdle":800,"strategyBalance":200}}'
  ```
- Verify response has `action: "suggest"` and `strategy_logic` with real APY numbers

---

## Step 3: Frontend — Transaction Card + Multi-turn Chat (2 Days)

### Goal
Upgrade AIPanel to display strategy suggestions as chat bubbles and render a Transaction Card when the user confirms investment intent.

### 3.1 Update AIPanel for multi-turn and suggestions

**File**: `frontend/components/AIPanel.tsx` (MODIFY)

**Key changes**:
1. Store `conversationId` in state — pass to `/api/chat`, receive back updated ID from Dify Chatflow response
2. Extend `Intent` interface to match new Workflow output:
   ```typescript
   interface Intent {
     action: 'suggest' | 'intent_confirmed' | 'unknown'
     strategy_logic: string
     action_data: {
       type: 'invest' | 'divest' | 'check_yield' | 'deposit' | 'withdraw' | 'none'
       amount: number
       token: string
       protocol: string
       net_apy: number
       risk_level: 'low' | 'medium' | 'high'
     }
     confidence: 'high' | 'medium' | 'low'
   }
   ```
3. Display `strategy_logic` as a styled advice bubble (not raw JSON)
4. When `action === 'suggest'`:
   - Show AI advice text in a chat-style bubble
   - Show a "Yes, invest" / "No thanks" button pair for follow-up
   - On "Yes, invest" → send confirmation message with same `conversationId` → multi-turn
5. When `action === 'intent_confirmed'`:
   - Render the **Transaction Card** component (see 3.2)
6. Send `vaultIdle` and `strategyBalance` in request body (get from useVault hook)
7. Update the example hint text: `Try: "should I invest?" · "check my yield" · "invest 500 USDT"`

### 3.2 Create TransactionCard component

**File**: `frontend/components/TransactionCard.tsx` (NEW)

**Props**:
```typescript
interface TransactionCardProps {
  actionData: {
    type: 'invest' | 'divest'
    amount: number
    token: string
    protocol: string
    net_apy: number
    risk_level: 'low' | 'medium' | 'high'
  }
  strategyLogic: string        // AI's reasoning to display
  onExecute: () => void        // Called after safety pre-check passes
  onCancel: () => void
}
```

**UI layout** (within the AIPanel card area):
```
┌─────────────────────────────────────────┐
│  Strategy Execution Card                │
│                                         │
│  AI Reasoning:                          │
│  "Based on current Aave USDT yield of   │
│   3.9% and low gas costs, investing     │
│   500 USDT would earn ~19.5 USDT/year"  │
│                                         │
│  ┌──────────┐  ┌──────────┐             │
│  │ Amount   │  │ Net APY  │             │
│  │ 500 USDT │  │  3.87%   │             │
│  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐             │
│  │ Protocol │  │ Risk     │             │
│  │ Aave V3  │  │ LOW      │             │
│  └──────────┘  └──────────┘             │
│                                         │
│  Gas: ~0.12 USD                         │
│                                         │
│  [Step 1: Approve USDT]  (if needed)    │
│  [Confirm Invest]        [Cancel]       │
└─────────────────────────────────────────┘
```

**Logic**:
1. On mount: check USDT allowance via `useVault().usdtAllowance`
   - If allowance < amount → show "Step 1: Approve USDT" button
   - If allowance >= amount → show "Confirm Invest" button directly
2. "Approve USDT" click → call `useVault().approveUsdt(amount)`
   - On success → button changes to "Confirm Invest"
3. "Confirm Invest" click → triggers **safety pre-check** (see Step 4) → then calls `onExecute`
4. `onExecute` in parent calls `useVault().invest(amount)` or `useVault().divest(amount)`

### 3.3 Pass intent to AdminPanel for invest/divest

**File**: `frontend/components/VaultDashboard.tsx` (MODIFY)

**Changes**:
1. Extend `Intent` interface to match new format
2. Pass `intent` prop to `AdminPanel`:
   ```tsx
   <AdminPanel intent={intent} />
   ```
3. When AI returns `intent_confirmed` with `type: 'invest'` or `type: 'divest'`, the TransactionCard handles it directly in AIPanel (no need to route to AdminPanel form)

**File**: `frontend/components/AdminPanel.tsx` (MODIFY)

**Changes**:
1. Accept optional `intent` prop
2. When `intent?.action_data?.type === 'invest'`, auto-fill `investAmount`
3. When `intent?.action_data?.type === 'divest'`, auto-fill `divestAmount`

### 3.4 Verification — Step 3

- Start dev server, connect wallet
- Type "should I invest?" → AI shows suggestion bubble with real APY
- Click "Yes, invest" → AI confirms intent → Transaction Card appears
- Verify allowance check works (shows approve step if needed)
- Click approve → then confirm invest → transaction executes
- Type "check my yield" → shows current strategy balance info
- Type "invest 500 USDT" → direct to intent_confirmed → Transaction Card

---

## Step 4: Safety Pre-check + Integration Test (1 Day)

### Goal
Add session lock, deviation interceptor, and run full end-to-end tests.

### 4.1 Implement session lock and deviation interceptor

**File**: `frontend/components/TransactionCard.tsx` (MODIFY — add safety logic)

**Session Lock**:
- When Transaction Card renders, store `suggestedNetApy` in component state (from `actionData.net_apy`)
- This is the APY that was valid when AI made the suggestion

**Pre-check on "Confirm Invest" click**:
1. Call `GET /api/vault-context?vaultIdle=...` to get fresh `netApy`
2. Compare `freshNetApy` vs `suggestedNetApy`
3. Calculate deviation: `Math.abs(freshNetApy - suggestedNetApy) / suggestedNetApy * 100`

**Deviation Interceptor**:
- If deviation > 10%:
  - Block the transaction
  - Show warning: "Market conditions changed since AI's recommendation"
  - Display: old APY vs new APY
  - Send hidden re-query to Dify via `/api/chat`: `"[SYSTEM] Net APY changed from X% to Y%. Re-evaluate recommendation for user."`
  - Display Dify's updated `strategy_logic` to user
  - User can then re-confirm or cancel
- If deviation <= 10%:
  - Proceed with transaction normally

### 4.2 Error handling for Aave data unavailability

**File**: `frontend/components/TransactionCard.tsx` (in same modification)

- If vault-context API returns `error` field (Aave is down):
  - Show warning: "Unable to fetch current market rates"
  - Disable "Confirm" button
  - Suggest user try again later

### 4.3 Integration test checklist

**Full flow test**:
1. [x] Start frontend with `NEXT_PUBLIC_CHAIN=sepolia`
2. [x] Connect MetaMask to Sepolia
3. [x] Type "should I invest my USDT?" in AI panel
4. [x] Verify: suggestion bubble shows real Aave APY (non-zero)
5. [x] Click "Yes, invest"
6. [x] Verify: Transaction Card appears with amount, APY, gas estimate
7. [x] Verify: allowance check works (approve step if needed)
8. [x] Click "Confirm Invest"
9. [x] Verify: safety pre-check runs (fetches fresh APY)
10. [x] If deviation OK: MetaMask popup for invest transaction
11. [x] Note: invest() will fail on Sepolia (MockERC20 not Aave-listed) — this is expected and documented

**Multi-turn test**:
1. [x] Type "check my yield"
2. [x] AI responds with strategy balance info
3. [x] Type "should I invest more?"
4. [x] Verify: conversation continues (same context, Dify remembers previous exchange)

**Safety test**:
1. [x] Manually test deviation interceptor by modifying `suggestedNetApy` in devtools
2. [x] Verify warning appears when deviation > 10%
3. [x] Verify re-query to Dify generates updated advice

**Anvil test** (where invest actually works):
1. [ ] Switch to `NEXT_PUBLIC_CHAIN=anvil`
2. [ ] Full flow: suggest → confirm → approve → invest → balance updates
3. [ ] Verify strategy balance increases after invest

### 4.4 Verification — Step 4

- All integration test checklist items pass
- Deviation interceptor blocks when APY changes significantly
- Multi-turn conversation maintains context
- Error states handled gracefully (Aave down, network error)

---

## Critical Files Summary

### New Files
| File | Purpose |
|------|---------|
| `frontend/lib/aave.ts` | Aave Pool ABI fragment, addresses, constants |
| `frontend/app/api/vault-context/route.ts` | On-chain data aggregation API |
| `frontend/components/TransactionCard.tsx` | Strategy execution card with safety pre-check |
| `docs/Aave_Strategy_Context.md` | Knowledge base document for Dify RAG |

### Modified Files
| File | Changes |
|------|---------|
| `frontend/app/api/chat/route.ts` | Add conversation_id pass-through, inputs dict, new response types |
| `frontend/components/AIPanel.tsx` | Multi-turn state, suggestion bubbles, TransactionCard rendering |
| `frontend/components/VaultDashboard.tsx` | Extended Intent type, pass intent to AdminPanel |
| `frontend/components/AdminPanel.tsx` | Accept intent prop, auto-fill invest/divest amounts |

### Manual Tasks (User does in Dify dashboard)
| Task | Description |
|------|-------------|
| Upgrade Dify Chatflow | Add HTTP Request, Knowledge Retrieval, LLM nodes to existing Chatflow |
| Upload Knowledge Base | Upload `Aave_Strategy_Context.md` to Dify |
| Configure LLM Node | Paste CoT system prompt with reasoning rules |
| No new API key needed | Chatflow uses the same API key as before |

---

## Architecture Principles

1. **Truth Provider Pattern**: AI never fabricates data — all numbers come from on-chain reads via vault-context API
2. **Separation of Advisory and Execution**: Dify suggests, frontend executes — AI never auto-signs transactions
3. **Session Lock**: APY recorded at suggestion time, re-validated at execution time
4. **Graceful Degradation**: If Aave is down, show warning instead of crashing; if Dify fails, fall back to manual invest form
5. **Multi-turn Statefulness**: Dify Chatflow's built-in conversation_id enables memory across turns (Workflow lacks this — that's why we stayed with Chatflow)

---

# Days 6-14: Cross-Chain Yield Navigator — Base + Arbitrum Mainnet

## Context

**Problem**: The project runs on Sepolia testnet with MockERC20 (not Aave-listed). The invest() flow doesn't work on Sepolia, APY data is unreliable on thinly-traded testnets, and the system cannot demonstrate real yield generation.

**Goal**: Deploy VaultV3 + AaveStrategy on Base mainnet and Arbitrum mainnet using real USDC and real Aave V3. Add cross-chain APY comparison, AI advisory with honest cost modeling, and LI.FI bridge widget for cross-chain migration. Budget: <50 USDC total risk.

**Career Goal**: Land a **Senior Full-Stack Web3 Engineer** role (global remote) within 1-3 months. This project is the portfolio centerpiece. Each day includes interview preparation tasks alongside building work.

**Engineering Process** (follows industry-standard 5-level DeFi workflow):
```
Level 1: Local Unit Tests (Days 1-5)           ✅ Done (63 tests, mocks)
Level 2: Mainnet Fork Testing (Days 6-8)       ← THIS PLAN STARTS HERE
Level 3: Public Testnet UI Flow (Days 1-5)     ✅ Done (Sepolia)
Level 4: Canary Mainnet Deployment (Days 9-10) ← Small real USDC
Level 5: Production Features (Days 11-14)      ← Cross-chain, LI.FI, AI
```

**Why this order matters**:
Our reviewer correctly identified that we tried to do Level 2 work (protocol integration) in a Level 3 environment (Sepolia testnet). Testnets have broken liquidity, stale oracles, and incompatible tokens. Mainnet forking solves all of these by cloning real protocol state locally at zero cost.

**Architecture**:
```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                        │
│                                                              │
│  AIPanel → vault-context API → reads BOTH chains             │
│    │              │                  │                        │
│    │       Base Aave Pool     Arbitrum Aave Pool              │
│    │              │                  │                        │
│    ▼              ▼                  ▼                        │
│  "Arb is 2.1% higher. Net advantage $3 after fees."         │
│    │                                                         │
│    ▼                                                         │
│  Risk Modal → LI.FI Widget → Bridge USDC Base↔Arbitrum      │
│                                    │                         │
│                                    ▼                         │
│                     Deposit into destination Vault            │
└─────────────────────────────────────────────────────────────┘

CONTRACT LAYER:
┌──────────────────────┐         ┌──────────────────────┐
│   Base (8453)        │  LI.FI  │  Arbitrum (42161)    │
│                      │◄═══════►│                      │
│  VaultV3             │  bridge │  VaultV3             │
│  AaveStrategy        │         │  AaveStrategy        │
│  → Base Aave Pool    │         │  → Arb Aave Pool     │
│  Real USDC           │         │  Real USDC           │
└──────────────────────┘         └──────────────────────┘
```

---

## Critical Addresses Reference

| | Base (8453) | Arbitrum (42161) |
|---|---|---|
| **Aave V3 Pool** | `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5` | `0x794a61358D6845594F94dc1DB02A252b5b4814aD` |
| **Native USDC** | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| **USDC Decimals** | 6 | 6 |

**Important**: Aave Pool addresses must be verified via `cast call` before any deployment.

Sources:
- [Aave V3 Deployed Contracts](https://docs.aave.com/developers/deployed-contracts/v3-mainnet)
- [Circle USDC Multi-chain](https://www.circle.com/multi-chain-usdc)
- [BGD Labs Aave Address Book](https://github.com/bgd-labs/aave-address-book)

---

## Day 6: Environment Setup + Deploy Script Update

### 6.1 Get RPC endpoints + API keys (User does manually)

- **Alchemy**: Create Base mainnet + Arbitrum mainnet apps (free tier)
  - Base RPC URL: `https://base-mainnet.g.alchemy.com/v2/YOUR_KEY`
  - Arbitrum RPC URL: `https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY`
- **BaseScan API key**: https://basescan.org/apis (free)
- **Arbiscan API key**: https://arbiscan.io/apis (free)

### 6.2 Update .env (root)

**File**: `.env`

Add (keep existing Sepolia/Anvil vars):
```
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
BASESCAN_API_KEY=your_basescan_key
ARBISCAN_API_KEY=your_arbiscan_key
```

### 6.3 Update foundry.toml

**File**: `foundry.toml`

Add Base and Arbitrum RPC endpoints and block explorer configs:
```toml
[rpc_endpoints]
base = "${BASE_RPC_URL}"
arbitrum = "${ARBITRUM_RPC_URL}"

[etherscan]
base = { key = "${BASESCAN_API_KEY}", url = "https://api.basescan.org/api" }
arbitrum = { key = "${ARBISCAN_API_KEY}", url = "https://api.arbiscan.io/api" }
```

### 6.4 Verify Aave Pool addresses

Before writing any deploy code, confirm the Aave pools are real and responsive:

```bash
source .env

# Verify Base Aave Pool — should return a list of token addresses
cast call 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5 \
  "getReservesList()(address[])" --rpc-url $BASE_RPC_URL

# Verify Arbitrum Aave Pool
cast call 0x794a61358D6845594F94dc1DB02A252b5b4814aD \
  "getReservesList()(address[])" --rpc-url $ARBITRUM_RPC_URL

# Confirm USDC is a listed reserve on Base Aave
# (check if 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 appears in the list)
```

If any address is wrong, stop and find the correct one before proceeding.

### 6.5 Update Deploy.s.sol for mainnet

**File**: `script/Deploy.s.sol`

Key changes:
- Add Base and Arbitrum Aave Pool + USDC address constants
- For mainnet chains: DO NOT deploy MockERC20 — use real USDC
- For mainnet chains: DO NOT mint tokens — user already has real USDC
- Keep Anvil/Sepolia paths for backward compatibility

```
Chain detection logic:
  if (chainId == 8453)       → Base mainnet: real Aave Pool, real USDC
  if (chainId == 42161)      → Arbitrum mainnet: real Aave Pool, real USDC
  if (chainId == 11155111)   → Sepolia: Sepolia Aave Pool, MockERC20
  else                       → Anvil: MockAavePool, MockERC20

Mainnet deployment deploys ONLY:
  1. VaultV3
  2. AaveStrategy(vault, USDC_ADDRESS, AAVE_POOL_ADDRESS)
  3. vault.setStrategy(strategy)
  (No MockERC20, no mint, no MockAavePool)
```

### 6.6 Verification — Day 6
- [x] Alchemy RPC URLs work (`cast block-number --rpc-url $BASE_RPC_URL`)
- [x] BaseScan + Arbiscan API keys obtained
- [x] Aave Pool addresses verified (getReservesList returns USDC)
- [x] Deploy.s.sol updated with Base/Arbitrum chain detection
- [x] `forge build` passes with updated script


---

## Day 7: Mainnet Fork Testing — Base (Level 2)

This is the **most critical day**. We validate that our contracts work with real Aave, real USDC, and real liquidity — at zero cost.

### 7.1 Start Base mainnet fork

```bash
source .env
anvil --fork-url $BASE_RPC_URL
# Anvil now runs at http://127.0.0.1:8545 with Base mainnet state cloned
```

### 7.2 Create fork test file

**File**: `test/ForkBase.t.sol` (NEW)

This is a Foundry test that runs against the forked Base mainnet state. It uses real addresses, real Aave, real USDC.

**Test cases to write** (all using `--fork-url`):

```solidity
// Setup:
// - Use deal() to give test address 100,000 USDC
// - Deploy VaultV3 + AaveStrategy pointing to real Base Aave Pool
// - Set strategy in vault

function test_fork_deposit_real_usdc()
  // Approve vault, depositToken(USDC, 1000e6)
  // Assert: tokenBalances[USDC][user] == 1000e6

function test_fork_invest_into_real_aave()
  // deposit 1000 USDC, then invest(USDC, 1000e6)
  // Assert: vault's USDC balance decreased
  // Assert: strategy.totalAssets() == 1000e6
  // Assert: Aave aToken balance > 0 (real aToken minted)

function test_fork_divest_from_real_aave()
  // invest 1000, then divest(500e6)
  // Assert: vault's USDC balance increased by ~500
  // Assert: strategy.totalAssets() == ~500e6

function test_fork_full_cycle_deposit_invest_divest_withdraw()
  // deposit → invest → divest → withdrawToken
  // Assert: user gets USDC back (minus any Aave rounding)

function test_fork_read_real_apy()
  // Call Pool.getReserveData(USDC) on fork
  // Assert: currentLiquidityRate > 0 (real APY exists)
  // Log the actual APY for manual verification

function test_fork_large_deposit_respects_supply_cap()
  // Try to invest 10,000,000 USDC (exceeds supply cap)
  // Assert: strategy.deposit() returns false (try/catch catches it)
  // Assert: vault funds are safe (returned to vault)

function test_fork_strategy_failure_isolation()
  // Deploy with wrong Aave Pool address (to force failure)
  // Try invest → should fail gracefully
  // Assert: vault USDC balance unchanged

function test_fork_permit_with_real_usdc()
  // Note: Real USDC on Base may or may not support EIP-2612 permit
  // If it does: test depositWithPermit
  // If not: test that fallback to approve+deposit works
```

### 7.3 Run fork tests

```bash
source .env
forge test --match-path test/ForkBase.t.sol --fork-url $BASE_RPC_URL -vvv
```

Key flags:
- `--fork-url`: tells Foundry to run against cloned mainnet state
- `-vvv`: verbose output to see actual Aave interactions
- Tests are free — no real gas spent

### 7.4 Run Slither static analysis

```bash
pip install slither-analyzer  # if not installed
slither contracts/VaultV3.sol --solc-remaps "@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/"
slither contracts/AaveStrategy.sol --solc-remaps "@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/"
```

Document findings in `summary-report/SECURITY_ANALYSIS.md`:
- Critical: must fix before mainnet
- High/Medium: fix if possible, document if accepted
- Low/Info: document and accept

### 7.5 Verification — Day 7
- [x] All 8 fork tests pass against Base mainnet state
- [x] `invest()` successfully supplies USDC to real Base Aave (on fork)
- [x] `divest()` successfully withdraws from real Base Aave (on fork)
- [x] `getReserveData()` returns real APY (non-zero, reasonable range)
- [x] Strategy failure isolation confirmed (bad pool address → vault funds safe)
- [x] Slither run completed, critical findings addressed
- [x] `summary-report/SECURITY_ANALYSIS.md` created


---

## Day 8: Mainnet Fork Testing — Arbitrum + Cross-Chain API

### 8.1 Start Arbitrum mainnet fork

```bash
source .env
anvil --fork-url $ARBITRUM_RPC_URL --port 8546
# Runs on port 8546 to avoid conflict with Base fork on 8545
```

### 8.2 Create Arbitrum fork test file

**File**: `test/ForkArbitrum.t.sol` (NEW)

Same test cases as ForkBase.t.sol but with Arbitrum addresses:
- USDC: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- Aave Pool: `0x794a61358D6845594F94dc1DB02A252b5b4814aD`

```bash
forge test --match-path test/ForkArbitrum.t.sol --fork-url $ARBITRUM_RPC_URL -vvv
```

### 8.3 Test dual-chain vault-context API against forks

With both forks running (Base on 8545, Arbitrum on 8546):

**Temporarily update** `frontend/.env.local` to point to local forks:
```
NEXT_PUBLIC_BASE_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_ARBITRUM_RPC_URL=http://127.0.0.1:8546
```

### 8.4 Upgrade vault-context API for dual-chain reads

**File**: `frontend/app/api/vault-context/route.ts`

Key changes:
1. Create TWO viem publicClients (Base RPC + Arbitrum RPC)
2. Use `Promise.all` to read Aave reserve data from both chains concurrently
3. Return both APYs + gas prices + cross-chain cost calculation

New response shape:
```typescript
{
  success: true,
  data: {
    base: {
      supplyApy: 3.2,
      gasPriceGwei: 0.01,
      estimatedTxCostUsd: 0.002
    },
    arbitrum: {
      supplyApy: 5.3,
      gasPriceGwei: 0.1,
      estimatedTxCostUsd: 0.02
    },
    crossChain: {
      deltaApy: 2.1,
      estimatedBridgeFeeUsd: 0.5,
      estimatedReturnBridgeFeeUsd: 0.5,
      destinationGasCostUsd: 0.02,
      slippageEstimateUsd: 0.1,
      netAdvantage: null    // calculated with principal from query params
    },
    vault: {
      idleUsdc: 1000,
      strategyBalance: 200,
      userUsdc: 1200
    },
    timestamp: 1712345678
  }
}
```

### 8.5 Implement honest cross-chain cost formula

```
Net_Advantage = (Principal × ΔAPY × Days/365)
              - Bridge_Fee_Out
              - Bridge_Fee_Return
              - Gas_Destination (deposit + invest on arrival chain)
              - Slippage_Estimate (0.1% of principal)
```

Calculated using query params `principal` and `holdingDays`.

### 8.6 Test vault-context API against forks

```bash
# Start frontend
cd frontend && npm run dev

# Test — should return real APY data from both forked chains
curl "http://localhost:3000/api/vault-context?principal=500&holdingDays=30"
```

### 8.7 Verification — Day 8
- [x] All Arbitrum fork tests pass
- [x] Both Base and Arbitrum forks running concurrently
- [x] vault-context API returns real APY from both chains
- [x] `netAdvantage` calculation is correct (manually verify the math)
- [x] Small principal (20 USDC, 30 days): netAdvantage is negative (correct)
- [x] Large principal (5000 USDC, 90 days): netAdvantage may be positive


---

## Day 9: Canary Deployment — Base Mainnet (Level 4)

Now that fork tests pass, we deploy with real money. Small amounts only.

### 9.1 Fund the Base Wallet (User does manually)

1. Open MetaMask, copy `0x` address
2. In OKX: ETH → Withdraw → **select Base network** (NOT ERC20)
3. Withdraw 0.01 ETH (~$20)
4. After arrival, swap ~20 USDC on [app.uniswap.org](https://app.uniswap.org) (select Base network)
5. Verify: MetaMask shows ETH + USDC on Base

### 9.2 Deploy to Base mainnet

```bash
source .env
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

Record deployed addresses in `DEPLOYED_ADDRESSES.md`.

### 9.3 Smoke test with real USDC (5 USDC only)

Using cast or the frontend:

```bash
# Approve vault to spend 5 USDC
cast send $USDC_BASE "approve(address,uint256)" $VAULT_BASE 5000000 \
  --rpc-url $BASE_RPC_URL --private-key $PRIVATE_KEY

# Deposit 5 USDC into vault
cast send $VAULT_BASE "depositToken(address,uint256)" $USDC_BASE 5000000 \
  --rpc-url $BASE_RPC_URL --private-key $PRIVATE_KEY

# Check vault balance
cast call $VAULT_BASE "getTokenBalance(address,address)" $USDC_BASE $YOUR_ADDRESS \
  --rpc-url $BASE_RPC_URL

# Invest 5 USDC into Aave
cast send $VAULT_BASE "invest(address,uint256)" $USDC_BASE 5000000 \
  --rpc-url $BASE_RPC_URL --private-key $PRIVATE_KEY

# Check strategy balance
cast call $VAULT_BASE "getStrategyBalance()" --rpc-url $BASE_RPC_URL

# Divest 5 USDC back
cast send $VAULT_BASE "divest(uint256)" 5000000 \
  --rpc-url $BASE_RPC_URL --private-key $PRIVATE_KEY

# Withdraw back to wallet
cast send $VAULT_BASE "withdrawToken(address,uint256)" $USDC_BASE 5000000 \
  --rpc-url $BASE_RPC_URL --private-key $PRIVATE_KEY
```

Verify each step on BaseScan.

### 9.4 Verification — Day 9
- [x] VaultV3 + AaveStrategy deployed and verified on BaseScan
- [x] Deposit 5 USDC → vault balance shows 5 USDC
- [x] Invest → USDC moves to Aave (verify on BaseScan)
- [x] Divest → USDC returns to vault
- [x] Withdraw → USDC back in wallet
- [x] Full cycle completed with real money, no loss


**Milestone: You now have verified contracts on BaseScan**

Add the BaseScan link to your GitHub README and LinkedIn profile.

---

## Day 10: Canary Deployment — Arbitrum + Frontend Multi-Chain

### 10.1 Fund Arbitrum wallet (User does manually)

Option A: Withdraw ETH from OKX directly to Arbitrum → swap for USDC
Option B: Bridge USDC from Base using Stargate/Across

### 10.2 Deploy to Arbitrum

```bash
source .env
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $ARBITRUM_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ARBISCAN_API_KEY
```

### 10.3 Smoke test on Arbitrum (5 USDC)

Same cast commands as Day 9 but with Arbitrum addresses and RPC.

### 10.4 Update frontend for multi-chain support

**File**: `frontend/lib/wagmi.ts`
- Support chain switching: `base | arbitrum | sepolia | anvil`

**File**: `frontend/lib/aave.ts`
- Add Base/Arbitrum Aave Pool + USDC addresses with chain-aware resolution

**File**: `frontend/lib/vault.ts`
- Contract addresses remain env-based (already set up from Day 4)

**File**: `frontend/.env.local`
```
NEXT_PUBLIC_CHAIN=base
NEXT_PUBLIC_VAULT_ADDRESS=<base vault address>
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_BASE_VAULT_ADDRESS=<base vault address>
NEXT_PUBLIC_ARBITRUM_VAULT_ADDRESS=<arb vault address>
```

### 10.5 Test frontend deposit + invest on Base

- Connect MetaMask to Base
- Deposit 5 USDC via frontend
- Invest via AdminPanel
- Verify on BaseScan
- Divest + withdraw

### 10.6 Verification — Day 10
- [x] Contracts deployed + verified on Arbitrum (Arbiscan)
- [x] Smoke test passed on Arbitrum with real USDC
- [x] Frontend connects to Base, shows real USDC balances
- [x] Deposit → invest → divest cycle works via frontend on Base
- [x] DEPLOYED_ADDRESSES.md updated with both chains


---

## Day 11: AI Cross-Chain Advisory (Dify + Knowledge Base)

### 11.1 Update vault-context API for real mainnet RPCs

**File**: `frontend/app/api/vault-context/route.ts`

Switch from fork URLs to real mainnet RPC URLs (if still pointing to forks from Day 8).

### 11.2 Update Aave_Strategy_Context.md

**File**: `docs/Aave_Strategy_Context.md`

Add cross-chain advisory rules:
- Net_Advantage formula with ALL cost components
- Thresholds:
  - Net_Advantage > $1: suggest migration
  - Net_Advantage $0-$1: suggest staying (not worth risk)
  - Net_Advantage <= $0: must block migration suggestion
- Bridge risk warnings
- Breakeven calculation: `Total_Bridge_Cost / (Principal × ΔAPY / 365)`
- Small principal rule: <$100 almost never justifies cross-chain

### 11.3 Update Dify Chatflow (User does manually)

- Update HTTP Request node URL → real vault-context API
- Update LLM system prompt:
  - Add `"cross_chain_migrate"` action type
  - Add `"source_chain"` and `"target_chain"` to action_data
  - Include bridge risk warning in strategy_logic when recommending migration
- Upload updated Knowledge Base document

New LLM output schema for cross-chain:
```json
{
  "action": "suggest",
  "strategy_logic": "Arbitrum Aave USDC yields 5.3% vs Base 3.2%. For 500 USDC held 30 days, net advantage is $1.80 after bridge fees. Breakeven: 17 days.",
  "action_data": {
    "type": "cross_chain_migrate",
    "amount": 500,
    "token": "USDC",
    "source_chain": "base",
    "target_chain": "arbitrum",
    "net_apy": 5.3,
    "delta_apy": 2.1,
    "net_advantage_usd": 1.80,
    "breakeven_days": 17,
    "risk_level": "medium"
  }
}
```

### 11.4 Update chat route.ts for cross-chain intents

**File**: `frontend/app/api/chat/route.ts`

- Pass both-chain vault context URL in Dify inputs
- Handle `cross_chain_migrate` action type
- Pass through to frontend for bridge widget rendering

### 11.5 Verification — Day 11
- [x] Dify returns cross-chain advisory with real APY
- [x] "should I invest?" compares both chains
- [x] Small principal (20 USDC): AI says "stay on Base"
- [x] Multi-turn conversation preserved


---

## Day 12-13: LI.FI Bridge Widget + Risk Modal

### 12.1 Install LI.FI dependencies

```bash
cd frontend
npm install @lifi/widget @lifi/sdk
# Check peer deps — may need @mui/material @emotion/react @emotion/styled
```

### 12.2 Create CrossChainRiskModal component

**File**: `frontend/components/CrossChainRiskModal.tsx` (NEW)

Mandatory modal before any bridge execution:
- Bridge protocol risk warning (smart contract exploit = total loss possible)
- Time delay warning (5 min to 2 hours)
- Non-custody disclaimer
- Checkbox: "I understand the risks" (must check to unlock Confirm)
- Confirm / Cancel buttons

### 12.3 Create CrossChainWidget component

**File**: `frontend/components/CrossChainWidget.tsx` (NEW)

LI.FI Widget must be client-side only:
```typescript
import dynamic from 'next/dynamic'
const LiFiWidget = dynamic(
  () => import('@lifi/widget').then(mod => mod.LiFiWidget),
  { ssr: false }
)
```

Pre-fills from AI intent:
```typescript
const widgetConfig: WidgetConfig = {
  integrator: 'AI-Yield-Navigator',
  fromChain: 8453,       // Base
  toChain: 42161,        // Arbitrum
  fromToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  toToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  fromAmount: intent.amount.toString(),
}
```

### 12.4 Update AIPanel for cross-chain flow

**File**: `frontend/components/AIPanel.tsx`

When `action_data.type === 'cross_chain_migrate'`:
1. Show AI suggestion bubble with cross-chain reasoning
2. "Migrate" button → opens CrossChainRiskModal
3. After risk acceptance → render CrossChainWidget (LI.FI)
4. After bridge → prompt user to deposit into destination Vault

### 12.5 Create YieldRadar component (stretch goal)

**File**: `frontend/components/YieldRadar.tsx` (NEW)

Visual comparison: two cards showing Base vs Arbitrum APY, gas, net yield.

### 12.6 Verification — Day 12-13
- [x] LI.FI Widget renders (no SSR error)
- [x] Risk modal blocks widget until checkbox confirmed
- [x] Widget pre-fills chain/token/amount from AI intent
- [x] Real bridge test: 2-5 USDC from Base → Arbitrum
- [x] After bridge, deposit into Arbitrum Vault works


---

## Day 14: Integration Testing + Documentation

### 14.1 Full end-to-end test on Base

1. [ ] Connect MetaMask to Base
2. [ ] Deposit 10 USDC into Base Vault
3. [ ] Invest via AdminPanel → USDC to Base Aave
4. [ ] AI: "check my yield" → shows real APY
5. [ ] AI: "should I invest?" → compares Base vs Arbitrum
6. [ ] Divest → USDC returns to Vault
7. [ ] Withdraw → USDC back in wallet

### 14.2 Cross-chain migration test

1. [ ] AI suggests migration to Arbitrum (if APY higher)
2. [ ] Risk modal appears with warnings
3. [ ] Accept → LI.FI widget pre-filled
4. [ ] Bridge 5 USDC Base → Arbitrum
5. [ ] Verify USDC arrives on Arbitrum (Arbiscan)
6. [ ] Deposit into Arbitrum Vault → invest into Arbitrum Aave
7. [ ] Verify yield accrual

### 14.3 Safety tests

1. [ ] Small principal (5 USDC): AI says "stay on Base"
2. [ ] Equal APY: AI says "no advantage to migrate"
3. [ ] Deviation interceptor: re-check APY before confirm
4. [ ] Multi-turn: "check yield" → "should I migrate?" → "yes do it"

### 14.4 Documentation

- Update `DEPLOYED_ADDRESSES.md` with all mainnet addresses
- Update `todo.md` with Day 6-14 section
- Create `summary-report/DAY6-14_COMPLETE.md`
- Ensure `summary-report/SECURITY_ANALYSIS.md` is complete


---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `test/ForkBase.t.sol` | Fork tests against real Base Aave (8 test cases) |
| `test/ForkArbitrum.t.sol` | Fork tests against real Arbitrum Aave |
| `summary-report/SECURITY_ANALYSIS.md` | Slither findings + risk documentation |
| `frontend/components/CrossChainRiskModal.tsx` | Mandatory risk warning before bridge |
| `frontend/components/CrossChainWidget.tsx` | LI.FI bridge widget with AI pre-fill |
| `frontend/components/YieldRadar.tsx` | Visual APY comparison (stretch goal) |

### Modified Files
| File | Changes |
|------|---------|
| `script/Deploy.s.sol` | Add Base/Arbitrum chain detection, skip MockERC20 on mainnet |
| `foundry.toml` | Add Base/Arbitrum RPC + Etherscan config |
| `.env` | Add Base/Arbitrum RPC URLs + API keys |
| `frontend/.env.local` | Multi-chain env vars |
| `frontend/lib/aave.ts` | Add Base/Arbitrum Aave Pool + USDC addresses |
| `frontend/lib/wagmi.ts` | Support base/arbitrum chain selection |
| `frontend/app/api/vault-context/route.ts` | Dual-chain concurrent reads, cross-chain cost formula |
| `frontend/app/api/chat/route.ts` | Handle cross_chain_migrate action type |
| `frontend/components/AIPanel.tsx` | Cross-chain suggestion + bridge flow |
| `docs/Aave_Strategy_Context.md` | Cross-chain advisory rules + risk thresholds |
| `DEPLOYED_ADDRESSES.md` | Add Base + Arbitrum mainnet addresses |

### Manual Tasks (User)
| Task | When |
|------|------|
| Get Alchemy/BaseScan/Arbiscan API keys | Day 6 |
| Fund Base wallet (OKX → Base, 0.01 ETH + 20 USDC) | Day 9 |
| Fund Arbitrum wallet | Day 10 |
| Update Dify Chatflow for cross-chain | Day 11 |
| Upload updated Knowledge Base | Day 11 |

---

## Key Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Unaudited contracts with real USDC | Fork test first. Slither analysis. Max 50 USDC total. Personal only. |
| Bridge exploit during cross-chain | Mandatory risk modal. Test with 2-5 USDC. |
| Aave Pool address incorrect | Verify with `cast call getReservesList()` before deploying |
| Real USDC has no `mint()` | Only use what you swap. Don't over-invest. |
| LI.FI widget SSR crash | Dynamic import with `{ ssr: false }` |
| Supply cap exceeded | Fork test for large deposit. Vault returns funds on failure. |
| Real USDC may not support EIP-2612 permit | Fork test permit. If fails, fallback to approve+deposit. |

---

## Architecture Principles

1. **Fork before deploy**: All protocol integrations validated on mainnet fork before real money touches contracts
2. **Same contract, multiple chains**: VaultV3 + AaveStrategy are chain-agnostic. Only constructor params change.
3. **Hub-and-spoke capital model**: Base is home base. Arbitrum is satellite. Capital concentrates by default.
4. **Honest cost modeling**: Cross-chain formula includes ALL costs (bridge × 2 + destination gas + slippage).
5. **Bridge risk isolation**: LI.FI handles bridge execution. Our contracts never touch bridge funds.
6. **Progressive trust**: Fork test → cast smoke test (5 USDC) → frontend test → full integration. Never skip levels.

---

# Days 15-19: LangGraph AI Agent + Ponder Integration

## Context

**Problem**: The current AI layer (Dify) is a JSON translator — the backend makes all decisions, the AI just formats them into words. This is not a real AI agent. Additionally, the Ponder indexer exists but has zero frontend consumption and only works on localhost.

**Goal**: Build a genuine LangGraph-based AI agent that reasons over raw data, makes its own recommendations, remembers user preferences across sessions, and proactively monitors alerts. Integrate Ponder for transaction history display.

**What makes this a real agent (not just a chatbot)**:
1. Agent calls tools to gather data (not fed pre-computed answers)
2. Agent reasons over raw data to form recommendations
3. Agent has persistent memory (alerts, preferences, conversation history)
4. Agent proactively checks stored alerts on each interaction
5. Agent notices things the user didn't ask about (idle funds, triggered alerts)

**Engineering level**: This demonstrates backend service architecture (state persistence, tool orchestration, streaming) alongside AI agent design — both critical for a Senior Full-Stack Web3 Engineer.

---

## Architecture: Dify → LangGraph

```
BEFORE (Dify):
  Frontend → /api/chat → Dify (external) → formats backend decision → response
  AI intelligence: 0%  Backend intelligence: 100%

AFTER (LangGraph):
  Frontend → /api/chat → LangGraph Agent (in-process)
                           ├── Tool: get_yield_data (raw APY + gas)
                           ├── Tool: get_user_positions (on-chain balances)
                           ├── Tool: get_user_history (Ponder GraphQL)
                           ├── Tool: check_alerts (PostgreSQL)
                           ├── Tool: set_alert (PostgreSQL)
                           ├── Tool: calculate_costs (pure math)
                           └── LLM reasoning over all data
                               → structured intent response
  AI intelligence: 70%  Backend intelligence: 30% (raw data only)
```

Key change: vault-context API is refactored to return **raw data only** — no `shouldSuggestMigration`, no `recommendation`. The agent reasons over the numbers itself.

---

## Agent Graph Structure

```
                    ┌─────────────┐
                    │   START     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ checkAlerts │ ← proactive: check stored alerts first
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ planAction  │ ← LLM decides which tools to call
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ executeTools│ ← call selected tools (yield data, positions, history)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   reason    │ ← LLM reasons over all gathered data
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ formatIntent│ ← produce structured JSON for frontend
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
     ┌────────▼────────┐     ┌─────────▼────────┐
     │ directResponse  │     │ humanApproval    │ ← high-risk actions
     └─────────────────┘     └────────┬─────────┘
                                      │
                              ┌───────▼───────┐
                              │   INTERRUPT   │ ← pause, wait for user
                              └───────────────┘
```

---

## Agent Tools Definition

| Tool | Input | Output | Data Source |
|------|-------|--------|-------------|
| `get_yield_data` | none | `{ base: { apy, gas }, arbitrum: { apy, gas } }` | vault-context API (raw data only) |
| `get_user_positions` | `wallet_address` | `{ baseVault: { idle, invested }, arbVault: { idle, invested } }` | On-chain reads (viem) |
| `get_user_history` | `wallet_address, limit` | `[{ type, amount, token, chain, timestamp }]` | Ponder GraphQL |
| `check_alerts` | `wallet_address` | `[{ type, threshold, triggered, message }]` | PostgreSQL |
| `set_alert` | `wallet_address, type, params` | `{ success, alert_id }` | PostgreSQL |
| `calculate_costs` | `principal, source, target` | `{ bridgeFee, returnFee, gas, slippage, total, breakeven }` | Pure function |

---

## Day 15: LangGraph Core + Agent Structure

### 15.1 Install dependencies

```bash
cd frontend
npm install @langchain/langgraph @langchain/core @langchain/openai
```

Also install PostgreSQL client for state persistence:
```bash
npm install pg @langchain/langgraph-checkpoint-postgres
npm install -D @types/pg
```

Start PostgreSQL via Docker (run once, reuse across sessions):
```bash
docker run --name vault-postgres \
  -e POSTGRES_USER=vault \
  -e POSTGRES_PASSWORD=vault \
  -e POSTGRES_DB=vault \
  -p 5432:5432 \
  -d postgres:16
```

Add to `.env`:
```
DATABASE_URL=postgresql://vault:vault@localhost:5432/vault
```

### 15.2 Create agent graph structure

**File**: `frontend/lib/agent/graph.ts` (NEW)

Define the LangGraph StateGraph:
- State schema (messages, vaultContext, userPositions, alerts, intent)
- Node definitions (checkAlerts, planAction, executeTools, reason, formatIntent)
- Edge routing (direct response vs human approval)
- Checkpoint persistence (PostgreSQL via Docker)

**File**: `frontend/lib/agent/state.ts` (NEW)

Define the agent state type:
```typescript
interface AgentState {
  messages: BaseMessage[]
  userId: string           // wallet address
  vaultContext: any | null  // raw yield + gas data from both chains
  userPositions: any | null // current balances
  userHistory: any | null   // past transactions from Ponder
  alerts: Alert[]          // stored alerts for this user
  intent: AIIntent | null  // final structured output
  requiresApproval: boolean
}
```

### 15.3 Create tool definitions

**File**: `frontend/lib/agent/tools.ts` (NEW)

Define LangGraph tools:
- `get_yield_data` — calls vault-context API internally (refactored to raw data)
- `get_user_positions` — reads on-chain balances via viem
- `calculate_costs` — pure math for cross-chain costs

### 15.4 Create system prompt

**File**: `frontend/lib/agent/prompts.ts` (NEW)

Embed `Aave_Strategy_Context.md` content directly as system prompt (no vector store needed — document is small enough). Add reasoning instructions:

```
You are a DeFi strategy advisor agent. You have tools to read real-time on-chain data.

IMPORTANT: You make decisions based on data you gather. Do NOT invent numbers.
Call tools first, then reason over the results.

When a user asks about yield or investing:
1. Call get_yield_data to see current APY on both chains
2. Call get_user_positions to see their current balances
3. Reason: is investing/migrating worthwhile for THIS user's specific situation?
4. Consider: principal size, holding period, bridge costs, risk tolerance

When suggesting cross-chain migration:
- Calculate ALL costs: bridge out + bridge return + destination gas + slippage
- If net advantage < $1 OR principal < $100: recommend staying
- Always explain your reasoning with actual numbers

You can also notice things the user didn't ask:
- If they have idle funds: suggest investing
- If an alert is triggered: warn them before answering their question
- If they asked about yield but have nothing invested: suggest depositing first
```

### 15.5 Refactor vault-context API to return raw data only

**File**: `frontend/app/api/vault-context/route.ts` (MODIFY)

Remove: `shouldSuggestMigration`, `recommendation`, `reasonCodes`, `summaryReason`
Keep: raw APY, gas prices, bridge fee estimates, balances

The agent now decides. The API just provides facts.

### 15.6 Verification — Day 15
- [x] LangGraph dependencies installed
- [x] Agent graph compiles and runs with a test message
- [x] Tools defined and callable (get_yield_data returns real data)
- [x] System prompt embedded with strategy knowledge
- [x] vault-context API returns raw data only (no decisions)

---

## Day 16: Ponder Upgrade + Transaction History Tool

### 16.1 Ponder conceptual background for Murphy

**What Ponder is**: An event indexer. When your VaultV3 contract emits events (Deposited, Withdrawn, Invested, Divested), Ponder catches them and stores them in a database. The database is queryable via GraphQL.

**Why it exists**: Reading historical events from the blockchain is slow and expensive. Ponder transforms "cold" blockchain event logs into "hot" queryable data.

**Current state**: Your Ponder only indexes on localhost (Anvil, chain 31337). It needs to be reconfigured for Base mainnet.

```
Current:  Anvil events → Ponder → PGlite → GraphQL (localhost:42069)
Target:   Base events  → Ponder → PostgreSQL → GraphQL (localhost:42069)
          (Ponder and LangGraph share the same PostgreSQL instance)
```

### 16.2 Upgrade Ponder for Base mainnet

**File**: `ponder-indexing/ponder.config.ts` (MODIFY)

Change from Anvil to Base mainnet:
```typescript
chains: {
  base: {
    id: 8453,
    rpc: process.env.PONDER_RPC_URL_8453 ?? "https://base-mainnet.g.alchemy.com/v2/YOUR_KEY",
  },
},
contracts: {
  VaultV3: {
    chain: "base",
    abi: VaultV3Json.abi,
    address: "<your Base VaultV3 address>",
    startBlock: <deployment block number>,  // find on BaseScan
  },
},
```

### 16.3 Extend Ponder schema for more event types

**File**: `ponder-indexing/ponder.schema.ts` (MODIFY)

Add tables for all vault events:
```typescript
export const depositHistory = onchainTable("deposit_history", (t) => ({
  id: t.text().primaryKey(),
  user: t.hex().notNull(),
  token: t.hex().notNull(),
  amount: t.bigint().notNull(),
  eventType: t.text().notNull(),  // "deposit" | "withdraw" | "invest" | "divest"
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.integer().notNull(),
  transactionHash: t.hex().notNull(),
}))
```

### 16.4 Add event handlers

**File**: `ponder-indexing/src/index.ts` (MODIFY)

Add handlers for: TokenDeposited, TokenWithdrawn, Invested, Divested

### 16.5 Create get_user_history agent tool

**File**: `frontend/lib/agent/tools.ts` (ADD to existing)

Tool that queries Ponder GraphQL:
```typescript
// get_user_history tool
// Input: { wallet_address, limit }
// Queries: http://localhost:42069/graphql
// Returns: last N transactions for this user
```

### 16.6 Create Transaction History frontend component

**File**: `frontend/components/TransactionHistory.tsx` (NEW)

Simple table/list showing user's past transactions:
- Fetches from Ponder GraphQL on mount
- Shows: type (deposit/withdraw/invest/divest), amount, token, time, tx link
- Pagination (show 10, load more)

**File**: `frontend/components/VaultDashboard.tsx` (MODIFY)

Add TransactionHistory to the layout.

### 16.7 Verification — Day 16
- [x] Ponder running against Base mainnet (indexing real events)
- [x] All 4 event types indexed (deposit, withdraw, invest, divest)
- [x] Agent's get_user_history tool returns real transaction data
- [x] TransactionHistory component renders user's past transactions
- [x] GraphQL query at localhost:42069 returns correct data

---

## Day 17: State Persistence + Alert System

### 17.1 Set up PostgreSQL for agent state

PostgreSQL should already be running from Day 15 Docker setup. Verify:
```bash
docker ps | grep vault-postgres
# If not running: docker start vault-postgres
```

**File**: `frontend/lib/agent/db.ts` (NEW)

Create PostgreSQL connection and tables:
```sql
-- User alerts (our custom feature)
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  user_address TEXT NOT NULL,
  alert_type TEXT NOT NULL,        -- "apy_threshold" | "position_change"
  chain TEXT NOT NULL,             -- "base" | "arbitrum"
  threshold REAL,                  -- e.g., 2.0 (APY percentage)
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  triggered_at TIMESTAMP,          -- null if not yet triggered
  active BOOLEAN DEFAULT TRUE
);

-- Conversation metadata
CREATE TABLE IF NOT EXISTS conversations (
  thread_id TEXT PRIMARY KEY,
  user_address TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_address, active);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_address);
```

Use `pg` client for direct queries (alerts, conversations) and `PostgresSaver` for LangGraph checkpoints.

### 17.2 Create alert tools

**File**: `frontend/lib/agent/tools.ts` (ADD)

```typescript
// set_alert: stores a new monitoring alert
// check_alerts: reads active alerts, checks against current data, returns triggered ones
```

### 17.3 Wire checkpoint persistence

**File**: `frontend/lib/agent/graph.ts` (MODIFY)

Configure LangGraph to use PostgreSQL for checkpointing:
```typescript
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres"

const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL!)
await checkpointer.setup()  // creates checkpoint tables automatically
const app = graph.compile({ checkpointer })
```

This means: conversation state persists across server restarts. User can close browser, come back tomorrow, and the agent remembers the conversation.

### 17.4 Add checkAlerts node to graph

The graph's first node after START checks alerts before doing anything else. If a user set "alert me if APY drops below 3%" and the APY is now 2.8%, the agent warns them immediately — even if they asked a different question.

### 17.5 Verification — Day 17
- [ ] PostgreSQL running via Docker, tables created
- [ ] Agent can set an alert: "alert me if Base APY drops below 3%"
- [ ] Alert persists in PostgreSQL across server restarts
- [ ] On next conversation, agent checks alerts and warns if triggered
- [ ] Conversation state persists via PostgresSaver (multi-turn works after restart)

---

## Day 18: Streaming Responses + Update /api/chat

### 18.1 Replace Dify call with LangGraph invocation

**File**: `frontend/app/api/chat/route.ts` (REWRITE)

The API route now invokes the LangGraph agent instead of Dify:
```typescript
export async function POST(request: NextRequest) {
  const { message, user_id, conversation_id } = await request.json()

  const agent = getAgent()  // get compiled LangGraph graph
  const thread_id = conversation_id || generateThreadId()

  const result = await agent.invoke(
    { messages: [new HumanMessage(message)] },
    { configurable: { thread_id, user_id } }
  )

  // Extract structured intent from agent's final state
  const intent = result.intent
  return NextResponse.json({ success: true, intent, conversation_id: thread_id })
}
```

### 18.2 Add streaming support (Server-Sent Events)

**File**: `frontend/app/api/chat/stream/route.ts` (NEW)

For a better UX, stream the agent's thinking process:
```typescript
export async function POST(request: NextRequest) {
  // Return a ReadableStream that sends events as the agent works
  const stream = new ReadableStream({
    async start(controller) {
      // Agent streams: "Reading yield data..." → "Checking your positions..." → "Analyzing..."
      for await (const event of agent.stream(input, config)) {
        controller.enqueue(`data: ${JSON.stringify(event)}\n\n`)
      }
      controller.close()
    }
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
}
```

### 18.3 Update AIPanel for streaming (optional, time permitting)

**File**: `frontend/components/AIPanel.tsx` (MODIFY)

If time permits, consume SSE stream to show agent's thinking steps:
```
🔍 Reading yield data from Base and Arbitrum...
📊 Base: 3.2% APY | Arbitrum: 5.1% APY
💰 Checking your positions... 20 USDC idle on Base
🧮 Calculating migration costs...
💡 Forming recommendation...
```

If time is tight, keep the existing blocking request. Streaming is a nice-to-have.

### 18.4 Remove Dify dependencies

- Remove Dify API key from `.env` and `.env.local`
- Remove Dify-specific code from route.ts
- Keep the intent type definitions (they're used by frontend components)

### 18.5 Verification — Day 18
- [x] /api/chat now invokes LangGraph agent (not Dify)
- [x] Agent returns structured StrategyIntent (same format as before)
- [x] Frontend works with new backend (no UI changes needed for basic flow)
- [x] Conversation multi-turn works via thread_id
- [x] (Optional) Streaming endpoint returns SSE events
- [x] Dify env vars removed

---

## Day 19: Integration Testing + Polish + Portfolio

### 19.1 Full agent test suite

Test these conversations end-to-end:

**Basic yield query:**
- [x] "should I invest?" → agent calls get_yield_data + get_user_positions → recommendation

**Cross-chain advisory:**
- [x] "should I migrate to Arbitrum?" → agent reasons with real APY data → nuanced answer

**Transaction history:**
- [x] "show me my last deposits" → agent calls get_user_history → formatted response

**Alert system:**
- [x] "alert me if Base APY drops below 3%" → agent stores alert
- [x] Next message: agent checks alert, warns if triggered

**Proactive intelligence:**
- [x] User asks "check my yield" but has idle funds → agent notices and suggests investing

**Multi-turn memory:**
- [x] Turn 1: "should I invest?" → suggestion
- [x] Turn 2: "yes do it" → agent remembers context → returns intent_confirmed

**Cross-chain with human approval:**
- [x] Agent suggests migration → requiresApproval: true → frontend shows risk modal

### 19.2 Final README.md and demo video

**File**: `README.md` (UPDATE)

Add LangGraph section:
```
## AI Agent Architecture
Built with LangGraph (TypeScript) — not a chatbot wrapper.
- 6 tools: yield data, positions, history, alerts, cost calculation
- PostgreSQL-backed state persistence (Docker)
- Proactive alert monitoring
- Human-in-the-loop for high-risk operations
- Streaming responses via Server-Sent Events
```

**Demo video** (3 minutes):
1. "Should I invest?" → agent reasons with real data
2. "Alert me if APY drops below 3%" → stored
3. "Show my transaction history" → Ponder data displayed
4. Cross-chain flow → risk modal → bridge
5. Next conversation → agent checks alert proactively

### 19.3 Clean up and push

- [x] Remove all Dify references from code and env files
- [x] Ensure .env.example has correct vars (LLM API key, not Dify key)

### 19.4 Verification — Day 19
- [ ] All integration tests pass
- [ ] Agent makes genuinely intelligent recommendations (not just relaying backend decisions)
- [ ] Transaction history renders from Ponder
- [ ] Alerts persist and trigger correctly
---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `frontend/lib/agent/graph.ts` | LangGraph StateGraph definition |
| `frontend/lib/agent/state.ts` | Agent state type definitions |
| `frontend/lib/agent/tools.ts` | Tool definitions (yield, positions, history, alerts, costs) |
| `frontend/lib/agent/prompts.ts` | System prompt with embedded strategy knowledge |
| `frontend/lib/agent/db.ts` | PostgreSQL connection + alerts/conversations table setup |
| `frontend/app/api/chat/stream/route.ts` | SSE streaming endpoint (optional) |
| `frontend/components/TransactionHistory.tsx` | Transaction history display from Ponder |

### Modified Files
| File | Changes |
|------|---------|
| `frontend/app/api/chat/route.ts` | Replace Dify with LangGraph agent invocation |
| `frontend/app/api/vault-context/route.ts` | Remove decisions, return raw data only |
| `frontend/components/AIPanel.tsx` | Minor: streaming support (optional) |
| `frontend/components/VaultDashboard.tsx` | Add TransactionHistory component |
| `ponder-indexing/ponder.config.ts` | Switch from Anvil to Base mainnet |
| `ponder-indexing/ponder.schema.ts` | Add eventType column, expand schema |
| `ponder-indexing/src/index.ts` | Add handlers for withdraw, invest, divest events |

### Removed
| Item | Reason |
|------|--------|
| Dify API key in .env | No longer using Dify |
| Dify-specific parsing code in route.ts | Replaced by LangGraph |
| `shouldSuggestMigration` in vault-context | Agent decides, not backend |

---

# Days 20-22: LangGraph Enterprise Redesign — Store, Subgraphs, HITL, Parallel Prep

## Context

**Problem**: The current LangGraph agent (built Days 15-19) works but does not match the official LangGraph enterprise pattern. It uses `PostgresSaver` for short-term memory, but has no long-term memory `Store`, no semantic search across user history, no real human-in-the-loop interrupt (just a `requiresApproval` boolean flag), no parallel prep, no subgraphs, and no token streaming. The graph is a single monolithic tool loop.

**Goal**: Redesign the agent following the official LangGraph docs (`add-memory`, `persistence`, `interrupts`, `use-subgraphs`, `workflows-agents`, `streaming`) so it demonstrates every primitive — linear flow, branching, parallel execution, loops, subgraphs, and HITL — exactly once where each earns its keep. Preserve all existing user-facing behaviour (market advisory, alert system, cross-chain migration).

**What makes this enterprise-grade**:
1. Long-term memory via `PostgresStore` with `pgvector` semantic search — agent remembers users across threads
2. Per-turn parallel prep (market fetch + memory load + alert check) instead of sequential
3. Router classifies intent and dispatches to specialised subgraphs
4. Real `interrupt()` for migration approval — graph genuinely pauses, survives restarts
5. Multi-mode streaming (`updates` + `messages` + `custom`) for token-by-token output
6. Hot-path memory consolidation — docs' default for "most applications"

**Out of scope**: Authentication (still trusts `user_id` in request body — separate concern). Background cron consolidation (deferred until traffic justifies it; cron interval must match lookback window per docs). Supabase migration (plain Postgres + `pgvector` is sufficient; `PostgresStore` uses its own schema).

---

## Architecture: Linear → Parallel + Router + Subgraphs + HITL

```
BEFORE (Days 15-19):
  START → checkAlerts → agent ⇄ tools → formatIntent → END
  Memory: PostgresSaver (short-term only). HITL: boolean flag, no real pause.

AFTER (Days 20-22):
  START                                  ← parent graph
   ├── fetchMarket ──┐
   ├── loadMemory  ──┼─→ router          ← parallel fan-out, then converge
   └── checkAlerts ──┘     │
                           ├─→ yieldSubgraph ─────────┐
                           ├─→ migrationSubgraph ────┤  ← branching (4 specialists)
                           ├─→ alertSubgraph ────────┤
                           └─→ knowledgeSubgraph ────┤
                                                      ↓
                                       consolidateMemory ← hot-path memory write
                                                      ↓
                                                     END

  Inside yield/migration/alert subgraphs: agent ⇄ tools (ReAct loop)
  Inside migrationSubgraph, before END:
    approvalGate calls interrupt() → graph pauses → UI risk modal →
      POST /api/chat/resume with Command({ resume: true|false }) → graph completes

  Memory:
    Short-term:  PostgresSaver  (per-thread checkpoints)         ← unchanged
    Long-term:   PostgresStore  ([userAddress, 'profile'])        ← NEW
    Embeddings:  text-embedding-3-small (1536 dims) via pgvector  ← NEW
```

Patterns demonstrated: linear ✓ branching ✓ parallel ✓ loops ✓ subgraphs ✓ HITL ✓ streaming ✓

---

## Decisions Locked

| Dimension | Choice | Rationale |
|---|---|---|
| Short-term memory | `PostgresSaver` (unchanged) | Already working, survives restarts |
| Long-term memory | `PostgresStore` from `@langchain/langgraph-checkpoint-postgres/store` | Official Store interface, no custom table needed |
| Vector search | `pgvector` + `OpenAIEmbeddings('text-embedding-3-small')`, dims 1536 | Official pattern from `add-memory.mdx` |
| Memory timing | Hot-path extraction node only | Docs' recommended default: *"For most applications, the hot path is sufficient."* Background cron deferred. |
| HITL scope | Migration approval only, via `interrupt()` | Minimal friction, maximum safety story |
| Topology | Parallel prep → router → 4 subgraphs → consolidate | Demonstrates every LangGraph primitive |
| Streaming | `streamMode: ['updates','messages','custom']` with `subgraphs: true` | Token streaming + progress + custom events |
| Database | Plain Docker Postgres + `pgvector` extension | Supabase adds nothing here |

---

## Day 20: Long-term memory infrastructure + state expansion

Day 20 is purely additive: it wires up `PostgresStore`, enables `pgvector`, and expands the state schema. The existing graph still runs unchanged at end of day. Lower risk, foundation for Days 21-22.

### 20.1 Enable pgvector extension and verify dependencies

**File**: `frontend/lib/agent/db.ts` (MODIFY)

Add `CREATE EXTENSION` to existing `setupTables()`. Must run before any `PostgresStore.setup()` call:

```typescript
export async function setupTables(): Promise<void> {
  const db = getDb()
  await db.query(`
    CREATE EXTENSION IF NOT EXISTS vector;

    CREATE TABLE IF NOT EXISTS alerts (...);     -- existing
    CREATE TABLE IF NOT EXISTS conversations (...); -- existing (unused, leave as-is)

    CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_address, active);
    CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_address);
  `)
}
```

Manual one-time sanity check via shell:
```bash
docker exec vault-postgres psql -U vault -d vault -c "CREATE EXTENSION IF NOT EXISTS vector"
```

Confirm `@langchain/langgraph-checkpoint-postgres@1.0.1` exposes `PostgresStore` at the `/store` subpath:
```typescript
import { PostgresStore } from '@langchain/langgraph-checkpoint-postgres/store'
```

### 20.2 Create PostgresStore singleton

**File**: `frontend/lib/agent/memory.ts` (NEW)

```typescript
import { PostgresStore } from '@langchain/langgraph-checkpoint-postgres/store'
import { OpenAIEmbeddings } from '@langchain/openai'

export interface MemoryFact {
  key: string
  value: string
  category: 'preference' | 'behavior' | 'decision'
  confidence: number
  updatedAt: string
}

let storeInstance: PostgresStore | null = null

export async function getStore(): Promise<PostgresStore> {
  if (!storeInstance) {
    const embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-small',
      apiKey: process.env.OPENAI_API_KEY,
      configuration: { baseURL: process.env.OPENAI_API_BASE_URL },
    })
    storeInstance = PostgresStore.fromConnString(process.env.DATABASE_URL!, {
      index: { embeddings, dims: 1536 },
    })
    await storeInstance.setup()  // creates store tables + pgvector index
  }
  return storeInstance
}
```

### 20.3 Wire Store into agent boot

**File**: `frontend/lib/agent/graph.ts` (MODIFY)

In `buildAgent()`, fetch the store and pass it to `compile()`. No node reads it yet — wiring only:

```typescript
async function buildAgent() {
  const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL!)
  await checkpointer.setup()
  await setupTables()
  const store = await getStore()  // NEW

  return workflow.compile({ checkpointer, store })  // pass both
}
```

### 20.4 Expand AgentState schema

**File**: `frontend/lib/agent/state.ts` (MODIFY)

Add channels for parallel prep results, router output, and approval status. Remove dead channels:

```typescript
import type { MemoryFact } from './memory'

export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({ reducer: messagesStateReducer, default: () => [] }),
  userId: Annotation<string>({ reducer: (_, b) => b, default: () => '' }),

  // Set by parallel prep nodes (Day 21)
  vaultContext: Annotation<any | null>({ reducer: (_, b) => b, default: () => null }),
  relevantMemories: Annotation<MemoryFact[]>({ reducer: (_, b) => b, default: () => [] }),
  triggeredAlerts: Annotation<Alert[]>({ reducer: (_, b) => b, default: () => [] }),

  // Set by router (Day 21)
  route: Annotation<'yield' | 'migration' | 'alert' | 'knowledge'>({
    reducer: (_, b) => b, default: () => 'knowledge',
  }),

  // Set by subgraphs / approvalGate (Day 22)
  intent: Annotation<AIIntent | null>({ reducer: (_, b) => b, default: () => null }),
  approvalStatus: Annotation<'pending' | 'approved' | 'rejected' | null>({
    reducer: (_, b) => b, default: () => null,
  }),
})
```

Removed: `userPositions`, `userHistory` (dead — tools wrote into messages anyway), `requiresApproval` (replaced by `approvalStatus` + real interrupt on Day 22). `alerts` renamed to `triggeredAlerts` for clarity.

### 20.5 Update non-streaming chat route to match new state shape

**File**: `frontend/app/api/chat/route.ts` (MODIFY)

Replace `result.requiresApproval` with `result.approvalStatus === 'pending'` in the response envelope. Behaviour unchanged this day — the underlying flag is still set by the existing `formatIntent` node.

### 20.6 Verification — Day 20

- [ ] `docker exec vault-postgres psql -U vault -d vault -c "\dx"` lists `vector` extension
- [ ] App boots without errors; logs show `PostgresStore.setup()` ran
- [ ] Throwaway test:
  ```typescript
  const store = await getStore()
  await store.put(['test-user', 'profile'], 'k1', { value: 'I love pizza' })
  const hits = await store.search(['test-user', 'profile'], { query: "user's food preference" })
  // expect [{ value: { value: 'I love pizza' }, score: > 0.5 }]
  ```
- [ ] Existing `/api/chat` flow still works end-to-end (yield query, alert set, migration suggestion)
- [ ] Server restart: store data persists; conversation checkpoints still load
- [ ] **Deliverable**: commit `feat: wire PostgresStore + pgvector for long-term memory infrastructure`

---

## Day 21: Graph topology — Parallel prep, router, subgraphs, hot-path memory

Day 21 replaces the monolithic graph with the new topology. HITL is wired but uses a **stub** — real `interrupt()` lands on Day 22. All existing scenarios must still pass at end of day.

### 21.1 Extract fetchMarket parallel prep node

**File**: `frontend/lib/agent/nodes/fetchMarket.ts` (NEW)

Pure I/O. Calls `/api/vault-context`, writes `vaultContext` channel:

```typescript
import type { AgentStateType } from '../state'

export async function fetchMarket(state: AgentStateType): Promise<Partial<AgentStateType>> {
  if (!state.userId) return {}
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const resp = await fetch(`${appUrl}/api/vault-context`)
  if (!resp.ok) return {}
  const json = await resp.json()
  return json.success ? { vaultContext: json.data } : {}
}
```

### 21.2 Extract loadMemory parallel prep node

**File**: `frontend/lib/agent/nodes/loadMemory.ts` (NEW)

Reads top-K relevant facts via vector search. Per docs, `runtime.store` is auto-injected:

```typescript
import { LangGraphRunnableConfig } from '@langchain/langgraph'

export async function loadMemory(state: AgentStateType, config: LangGraphRunnableConfig) {
  const store = config.store
  if (!store || !state.userId) return { relevantMemories: [] }
  const lastUser = state.messages.findLast(m => m._getType() === 'human')
  const query = typeof lastUser?.content === 'string' ? lastUser.content : ''
  const hits = await store.search([state.userId, 'profile'], { query, limit: 5 })
  return { relevantMemories: hits.map(h => h.value as MemoryFact) }
}
```

### 21.3 Extract checkAlerts parallel prep node

**File**: `frontend/lib/agent/nodes/checkAlerts.ts` (NEW — extracted from existing `graph.ts`)

Move the existing `checkAlerts` body verbatim. Writes `triggeredAlerts` and appends `[SYSTEM ALERT]` HumanMessage when applicable. No logic change.

### 21.4 Build router node with structured output

**File**: `frontend/lib/agent/nodes/router.ts` (NEW)

Classifies user intent, writes `route` channel. Uses `withStructuredOutput` per workflow-routing pattern in docs:

```typescript
import { z } from 'zod'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage } from '@langchain/core/messages'
import { ROUTER_PROMPT } from '../prompts'

const routerSchema = z.object({
  route: z.enum(['yield', 'migration', 'alert', 'knowledge']),
  reasoning: z.string(),
})

const routerLlm = new ChatOpenAI({
  model: process.env.OPENAI_API_MODEL || 'gpt-5.2',
  temperature: 0,
}).withStructuredOutput(routerSchema)

export async function routerNode(state: AgentStateType) {
  const { route } = await routerLlm.invoke([
    new SystemMessage(ROUTER_PROMPT),
    ...state.messages,
  ])
  return { route }
}

export function routerEdge(state: AgentStateType) {
  return state.route
}
```

### 21.5 Build consolidateMemory node (hot-path extraction)

**File**: `frontend/lib/agent/nodes/consolidateMemory.ts` (NEW)

Runs after each subgraph, before END. Cheap model + structured output. **Only memory-write path** — matches the docs' "hot path" default. Background cron is future work.

```typescript
const extractorLlm = new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0 })
  .withStructuredOutput(z.object({
    upsert: z.array(z.object({
      key: z.string(),
      value: z.string(),
      category: z.enum(['preference', 'behavior', 'decision']),
    })),
    retract_keys: z.array(z.string()),
  }))

export async function consolidateMemory(state: AgentStateType, config) {
  const store = config.store
  if (!store || !state.userId) return {}

  const existing = await store.search([state.userId, 'profile'])
  const existingText = existing.map(h => `${h.value.key}: ${h.value.value}`).join('\n')
  const tail = state.messages.slice(-4)

  const { upsert, retract_keys } = await extractorLlm.invoke([
    new SystemMessage(EXTRACTION_PROMPT),
    new HumanMessage(`Existing facts:\n${existingText || '(none)'}\n\nRecent turn:\n${formatMessages(tail)}`),
  ])

  for (const f of upsert) {
    await store.put([state.userId, 'profile'], f.key, {
      ...f, confidence: 0.7, updatedAt: new Date().toISOString(),
    })
  }
  for (const k of retract_keys) {
    await store.delete([state.userId, 'profile'], k)
  }
  return {}
}
```

### 21.6 Split system prompts by subgraph

**File**: `frontend/lib/agent/prompts.ts` (MODIFY)

Replace single `SYSTEM_PROMPT` with six narrower prompts, each containing only what its consumer needs. Each subgraph prompt includes the memory-injection placeholder:

```typescript
export const ROUTER_PROMPT = `Classify the user's request into one of:
- yield: yield/investing/positions questions
- migration: cross-chain migration requests with explicit chain mention
- alert: setting or reading alerts
- knowledge: general explanations, no action needed
Pick the most specific. Default to knowledge when unsure.`

export const YIELD_PROMPT = `You are the yield-strategy specialist...
## What we know about this user
{memoryFacts}
## Your tools
- get_market_data, get_user_positions, get_user_history
...`

export const MIGRATION_PROMPT = `You are the cross-chain migration specialist...`
export const ALERT_PROMPT = `You are the alert manager...`
export const KNOWLEDGE_PROMPT = `You answer DeFi knowledge questions concisely...`
export const EXTRACTION_PROMPT = `You extract durable facts about the user...
Return JSON: { upsert: [...], retract_keys: [...] }
Do not invent facts not evidenced in the conversation.`
```

### 21.7 Build yieldSubgraph

**File**: `frontend/lib/agent/subgraphs/yield.ts` (NEW)

Standard ReAct loop. Shares parent's `messages` channel, so passes directly to parent's `addNode` per docs' "shared state" pattern:

```typescript
import { StateGraph, START, END } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { AgentState, type AgentStateType } from '../state'
import { yieldTools } from '../tools'

const llm = /* ChatOpenAI with YIELD_PROMPT memory injection */ .bindTools(yieldTools)

async function yieldAgent(state: AgentStateType) {
  const memoryFacts = state.relevantMemories.map(f => `- ${f.key}: ${f.value}`).join('\n')
  const sys = YIELD_PROMPT.replace('{memoryFacts}', memoryFacts || 'No prior history.')
  const response = await llm.invoke([new SystemMessage(sys), ...state.messages])
  return { messages: [response] }
}

function shouldContinue(state: AgentStateType) {
  const last = state.messages.at(-1) as AIMessage
  return last.tool_calls?.length ? 'tools' : 'END'
}

export const yieldSubgraph = new StateGraph(AgentState)
  .addNode('agent', yieldAgent)
  .addNode('tools', new ToolNode(yieldTools))
  .addEdge(START, 'agent')
  .addConditionalEdges('agent', shouldContinue, { tools: 'tools', END })
  .addEdge('tools', 'agent')
  .compile()
```

### 21.8 Build migrationSubgraph (HITL stub for Day 21)

**File**: `frontend/lib/agent/subgraphs/migration.ts` (NEW)

Same ReAct loop ending in `approvalGate`. **Day 21 stub**: `approvalGate` just sets `approvalStatus: 'pending'` and returns. Real `interrupt()` lands Day 22.

```typescript
async function approvalGate(state: AgentStateType) {
  if (state.intent?.action_data?.type !== 'cross_chain_migrate') return {}
  // Day 21 stub — Day 22 replaces with interrupt()
  return { approvalStatus: 'pending' as const }
}

export const migrationSubgraph = new StateGraph(AgentState)
  .addNode('agent', migrationAgent)
  .addNode('tools', new ToolNode(migrationTools))
  .addNode('approvalGate', approvalGate)
  .addEdge(START, 'agent')
  .addConditionalEdges('agent', shouldContinue, { tools: 'tools', approvalGate: 'approvalGate' })
  .addEdge('tools', 'agent')
  .addEdge('approvalGate', END)
  .compile()
```

### 21.9 Build alertSubgraph

**File**: `frontend/lib/agent/subgraphs/alert.ts` (NEW)

Focused ReAct loop with `[set_alert, get_alerts]` tools only. Same shape as yieldSubgraph.

### 21.10 Build knowledgeSubgraph

**File**: `frontend/lib/agent/subgraphs/knowledge.ts` (NEW)

Single LLM call — no tools, fast path:

```typescript
async function knowledgeAgent(state: AgentStateType) {
  const memoryFacts = state.relevantMemories.map(f => `- ${f.key}: ${f.value}`).join('\n')
  const sys = KNOWLEDGE_PROMPT.replace('{memoryFacts}', memoryFacts || 'No prior history.')
  const response = await llm.invoke([new SystemMessage(sys), ...state.messages])
  return { messages: [response] }
}

export const knowledgeSubgraph = new StateGraph(AgentState)
  .addNode('agent', knowledgeAgent)
  .addEdge(START, 'agent')
  .addEdge('agent', END)
  .compile()
```

### 21.11 Reassemble parent graph

**File**: `frontend/lib/agent/graph.ts` (REWRITE)

Wire parallel prep + router + subgraphs + consolidateMemory. Per docs, multiple edges to the same node make LangGraph wait for all to complete (converge pattern):

```typescript
const workflow = new StateGraph(AgentState)
  // Parallel prep
  .addNode('fetchMarket', fetchMarket)
  .addNode('loadMemory', loadMemory)
  .addNode('checkAlerts', checkAlerts)
  // Router
  .addNode('router', routerNode)
  // Subgraphs (compiled, share parent state)
  .addNode('yield', yieldSubgraph)
  .addNode('migration', migrationSubgraph)
  .addNode('alert', alertSubgraph)
  .addNode('knowledge', knowledgeSubgraph)
  // Memory consolidation
  .addNode('consolidateMemory', consolidateMemory)

  // Fan-out
  .addEdge(START, 'fetchMarket')
  .addEdge(START, 'loadMemory')
  .addEdge(START, 'checkAlerts')
  // Converge → router
  .addEdge('fetchMarket', 'router')
  .addEdge('loadMemory', 'router')
  .addEdge('checkAlerts', 'router')
  // Branch
  .addConditionalEdges('router', routerEdge, {
    yield: 'yield', migration: 'migration', alert: 'alert', knowledge: 'knowledge',
  })
  // Converge → memory
  .addEdge('yield', 'consolidateMemory')
  .addEdge('migration', 'consolidateMemory')
  .addEdge('alert', 'consolidateMemory')
  .addEdge('knowledge', 'consolidateMemory')
  .addEdge('consolidateMemory', END)
```

Subgraphs do NOT set their own checkpointer (per-invocation persistence per docs). The parent's checkpointer + store propagate automatically.

### 21.12 Group tools by subgraph

**File**: `frontend/lib/agent/tools.ts` (MODIFY)

Tool bodies unchanged. Add new exports for narrower tool lists:

```typescript
export const yieldTools = [getMarketData, getUserPositions, getUserHistory]
export const migrationTools = [getMarketData, getUserPositions]
export const alertTools = [setAlert, getAlerts]
// keep existing `agentTools` export for any legacy import
```

### 21.13 Verification — Day 21

- [ ] **Parallel prep timing**: wrap each prep node in `console.time`. Total wall-clock ≈ slowest node, not sum (proves fan-out works).
- [ ] **Routing correctness**: send 4 representative messages, confirm `route` is correct via `agent.getState(config)`:
  - "should I invest?" → `yield`
  - "I have 1000 USDC, migrate to Arbitrum?" → `migration`
  - "alert me if Base APY drops below 3%" → `alert`
  - "what is USDC?" → `knowledge`
- [ ] **Memory write**: send any message, then `SELECT * FROM store WHERE namespace LIKE '%profile%'` shows facts written.
- [ ] **Memory read**: open new thread for same user, send a follow-up. System prompt for the chosen subgraph contains the prior facts.
- [ ] **Per-user isolation**: seed two distinct wallet addresses, confirm one user's facts never appear in the other's prompt.
- [ ] **Regression**: every Day-19 integration scenario still passes (yield, migration suggest, alert set + warn, multi-turn).
- [ ] **Deliverable**: commit `refactor: parallel prep + router + subgraphs + hot-path memory consolidation`

---

## Day 22: Real HITL via interrupt(), multi-mode streaming, frontend resume flow

Day 22 replaces the migration approval stub with a genuine `interrupt()`, rewrites the streaming endpoint to emit token-level SSE events, and updates the frontend to render a risk modal that calls a new resume route.

### 22.1 Replace stub with real interrupt() in migration subgraph

**File**: `frontend/lib/agent/subgraphs/migration.ts` (MODIFY)

Replace the `approvalGate` stub. `interrupt()` pauses execution; the resume value (`true|false`) becomes the return value of the call:

```typescript
import { interrupt } from '@langchain/langgraph'

async function approvalGate(state: AgentStateType) {
  if (state.intent?.action_data?.type !== 'cross_chain_migrate') return {}

  const decision = interrupt({
    question: 'Approve cross-chain migration?',
    details: state.intent.action_data,  // amount, chains, deltaApy, breakeven
  })

  return {
    intent: {
      ...state.intent,
      action: decision ? 'intent_confirmed' : 'suggest',
    },
    approvalStatus: decision ? 'approved' as const : 'rejected' as const,
  }
}
```

When the graph hits `interrupt()`, LangGraph saves state via the parent's checkpointer and exits. The next `agent.invoke(new Command({ resume }), config)` re-enters the node from the top, but `interrupt()` returns the resume value instead of pausing.

### 22.2 Create resume route

**File**: `frontend/app/api/chat/resume/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Command } from '@langchain/langgraph'
import { getAgent } from '@/lib/agent/graph'

export async function POST(request: NextRequest) {
  const { thread_id, user_id, decision } = await request.json()
  if (!thread_id || typeof decision !== 'boolean') {
    return NextResponse.json({ error: 'thread_id and decision required' }, { status: 400 })
  }

  const agent = await getAgent()
  const result = await agent.invoke(
    new Command({ resume: decision }),
    { configurable: { thread_id, user_id } },
  )

  return NextResponse.json({
    success: true,
    intent: result.intent,
    approvalStatus: result.approvalStatus,
    conversation_id: thread_id,
  })
}
```

### 22.3 Update non-streaming chat route for interrupt detection

**File**: `frontend/app/api/chat/route.ts` (MODIFY)

After `agent.invoke(...)`, check for `__interrupt__` and surface it to the client:

```typescript
const result = await agent.invoke(input, { configurable: { thread_id, user_id } })

if (result.__interrupt__) {
  return NextResponse.json({
    success: true,
    interrupted: true,
    interrupt: result.__interrupt__[0],
    conversation_id: thread_id,
  })
}

return NextResponse.json({ success: true, intent: result.intent, conversation_id: thread_id })
```

### 22.4 Rewrite streaming route for multi-mode SSE

**File**: `frontend/app/api/chat/stream/route.ts` (REWRITE)

Use three stream modes: `updates` (per-node progress), `messages` (token-by-token), `custom` (writer events). Break the stream when `__interrupt__` appears so the client can prompt for approval:

```typescript
const events = await agent.stream(input, {
  configurable: { thread_id, user_id },
  streamMode: ['updates', 'messages', 'custom'],
  subgraphs: true,
})

for await (const [namespace, mode, chunk] of events) {
  if (mode === 'messages') {
    const [msg, meta] = chunk
    if (msg.content && meta.langgraph_node !== 'consolidateMemory' && meta.langgraph_node !== 'router') {
      emit({ type: 'token', content: msg.content, node: meta.langgraph_node })
    }
  } else if (mode === 'updates') {
    const [nodeName, update] = Object.entries(chunk)[0]
    if (update?.__interrupt__) {
      emit({ type: 'interrupt', interrupt: update.__interrupt__[0], conversation_id: thread_id })
      break  // client will resume via /api/chat/resume
    }
    emit({ type: 'progress', node: nodeName })
    if (nodeName === 'consolidateMemory' && update?.intent) {
      emit({ type: 'intent', intent: update.intent })
    }
  }
}
emit({ type: 'done' })
```

### 22.5 Handle token streaming in AIPanel

**File**: `frontend/components/AIPanel.tsx` (MODIFY)

Add SSE event handlers. On `type: 'token'`, append to currently-streaming bubble. Filter out tokens from `consolidateMemory` and `router` (already done backend-side, but defensive):

```typescript
case 'token':
  setMessages(prev => prev.map((m, i) =>
    i === prev.length - 1 ? { ...m, content: m.content + event.content } : m
  ))
  break
```

### 22.6 Render risk modal on interrupt event

**File**: `frontend/components/RiskModal.tsx` (NEW) and `AIPanel.tsx` (MODIFY)

When SSE emits `type: 'interrupt'`, AIPanel sets state `pendingApproval = event.interrupt` and renders the modal. Modal shows `interrupt.value.details` (action_data: amount, chains, deltaApy, breakeven). Two buttons: "Approve & Sign" / "Cancel".

### 22.7 Wire resume call

**File**: `frontend/components/AIPanel.tsx` (MODIFY)

On approve/cancel:

```typescript
const handleApproval = async (decision: boolean) => {
  setPendingApproval(null)
  const resp = await fetch('/api/chat/resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thread_id: conversationId, user_id: address, decision }),
  })
  const data = await resp.json()
  if (data.intent) handleIntent(data.intent)
}
```

Replace any remaining UI checks against the old `requiresApproval` field. The modal now opens on SSE `interrupt` event, NOT on intent shape.

### 22.8 Verification — Day 22

- [ ] **Migration HITL end-to-end (browser)**: connect wallet, send "I have 1000 USDC, should I migrate to Arbitrum?". Tokens stream in. Risk modal appears with real `action_data`. Click Approve → final intent has `action: 'intent_confirmed'`, `approvalStatus: 'approved'`. Repeat with Cancel → `action: 'suggest'`, `approvalStatus: 'rejected'`.
- [ ] **Resume after restart**: trigger interrupt, kill server, restart, POST `/api/chat/resume` with same `thread_id` → graph completes correctly (proves checkpointer durability across server restarts).
- [ ] **Token streaming**: visible character-by-character output for yield/knowledge responses. Tokens from `consolidateMemory` extraction are NOT shown in UI (filtered).
- [ ] **Non-migration paths unchanged**: yield/alert/knowledge questions complete without modal.
- [ ] **Regression**: all Day-19 + Day-21 integration scenarios still pass.
- [ ] **Deliverable**: commit `feat: real HITL interrupts + multi-mode streaming + risk modal flow`

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `frontend/lib/agent/memory.ts` | `getStore()` singleton + `MemoryFact` type |
| `frontend/lib/agent/nodes/fetchMarket.ts` | Parallel prep: vault-context API fetch |
| `frontend/lib/agent/nodes/loadMemory.ts` | Parallel prep: vector search over user's profile namespace |
| `frontend/lib/agent/nodes/checkAlerts.ts` | Parallel prep: extracted from existing graph.ts |
| `frontend/lib/agent/nodes/router.ts` | Intent classification with `withStructuredOutput` |
| `frontend/lib/agent/nodes/consolidateMemory.ts` | Hot-path memory extraction (gpt-4o-mini) |
| `frontend/lib/agent/subgraphs/yield.ts` | ReAct loop for yield/positions questions |
| `frontend/lib/agent/subgraphs/migration.ts` | ReAct loop + `approvalGate` with `interrupt()` |
| `frontend/lib/agent/subgraphs/alert.ts` | ReAct loop for alert management |
| `frontend/lib/agent/subgraphs/knowledge.ts` | No-tools fast-path for knowledge questions |
| `frontend/app/api/chat/resume/route.ts` | POST resume endpoint for HITL approval |
| `frontend/components/RiskModal.tsx` | Renders interrupt payload as approve/cancel UI |

### Modified Files
| File | Changes |
|------|---------|
| `frontend/lib/agent/db.ts` | Add `CREATE EXTENSION vector` to `setupTables()` |
| `frontend/lib/agent/state.ts` | Add `relevantMemories`, `triggeredAlerts`, `route`, `approvalStatus`. Remove `userPositions`, `userHistory`, `requiresApproval`. |
| `frontend/lib/agent/graph.ts` | Replace monolithic graph with parallel-prep + router + subgraphs + consolidateMemory assembly. Compile with `{ checkpointer, store }`. |
| `frontend/lib/agent/prompts.ts` | Split into `ROUTER_PROMPT`, `YIELD_PROMPT`, `MIGRATION_PROMPT`, `ALERT_PROMPT`, `KNOWLEDGE_PROMPT`, `EXTRACTION_PROMPT` |
| `frontend/lib/agent/tools.ts` | Add narrower exports: `yieldTools`, `migrationTools`, `alertTools`. Tool bodies unchanged. |
| `frontend/app/api/chat/route.ts` | Detect `__interrupt__` → return `{ interrupted: true, interrupt }` |
| `frontend/app/api/chat/stream/route.ts` | Multi-mode SSE: `['updates','messages','custom']` + `subgraphs: true`. Emit `init`, `progress`, `token`, `interrupt`, `intent`, `done`. |
| `frontend/components/AIPanel.tsx` | Handle new SSE event types. Token streaming. Resume flow on modal approve/cancel. |

### Deferred (NOT in this plan)
| Item | Why deferred |
|------|--------------|
| Background consolidation cron (per docs' "Background consolidation" pattern) | Hot-path is the docs default. Add when traffic justifies it. Cron interval MUST match lookback window. |
| Authentication (SIWE / JWT) | `user_id` still trusted from request body. Address before production. |
| Conversations sidebar UI | `conversations` table remains dead schema. Wire or drop in dedicated UI pass. |
| Drop `conversations` table from `setupTables()` | Out of scope for this redesign. |
