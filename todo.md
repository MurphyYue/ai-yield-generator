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

- [ ] 1. Initialize Ponder project
  - [ ] Run `pnpm create ponder` in project root (follow prompts, select existing ABI)
  - [ ] Copy VaultV3 ABI JSON to the ponder project's `abis/` directory

- [ ] 2. Configure `ponder.config.ts`
  - [ ] Set network: Anvil local (chainId 31337, rpcUrl `http://localhost:8545`)
  - [ ] Set contract: VaultV3 address + ABI
  - [ ] Note: When switching to Sepolia later, just change network config

- [ ] 3. Define schema in `ponder.schema.ts`
  - [ ] Define ONE entity: `DepositHistory`
    ```typescript
    // Fields: id, sender, amount, token, tokenSymbol, timestamp, blockNumber, transactionHash
    ```

- [ ] 4. Write handler in `src/index.ts` (<30 lines)
  - [ ] Listen to `TokenDeposited` event
  - [ ] On event: create `DepositHistory` record with sender, amount, timestamp
  - [ ] (Optional) Also listen to `Deposited` (ETH) event

- [ ] 5. Test locally
  - [ ] Start Ponder: `pnpm dev`
  - [ ] Make a deposit through the frontend
  - [ ] Query via Ponder's built-in GraphQL playground
  - [ ] Verify the deposit appears in query results

**Milestone**: Ponder running locally, you can query your deposit history via GraphQL instantly

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

- [ ] 1. Prepare environment
  - [ ] Get Alchemy API key (free tier): https://www.alchemy.com/
  - [ ] Get Etherscan API key (free): https://etherscan.io/apis
  - [ ] Create a **dedicated testnet wallet** (never use mainnet keys!)
  - [ ] Get Sepolia ETH from faucet (try multiple if one is dry):
    - Google Cloud faucet: https://cloud.google.com/application/web3/faucet/ethereum/sepolia
    - Alchemy faucet: https://sepoliafaucet.com/
  - [ ] Set environment variables in `.env`:
    ```bash
    PRIVATE_KEY=your_sepolia_private_key
    SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
    ETHERSCAN_API_KEY=your_etherscan_api_key
    ```

- [ ] 2. Update foundry.toml for Sepolia
  - [ ] Add Sepolia RPC and Etherscan config:
    ```toml
    [rpc_endpoints]
    sepolia = "${SEPOLIA_RPC_URL}"

    [etherscan]
    sepolia = { key = "${ETHERSCAN_API_KEY}" }
    ```

- [ ] 3. Create/update deployment script
  - [ ] Update `script/Deploy.s.sol` to deploy all contracts:
    1. Deploy MockERC20 (test USDT with Permit)
    2. Deploy VaultV3
    3. Deploy AaveStrategy (pointing to real Aave V3 Pool on Sepolia: `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951`)
    4. Set strategy in VaultV3
    5. Mint test USDT to deployer
  - [ ] Log all deployed addresses with `console.log()`

- [ ] 4. Deploy and verify on Etherscan
  - [ ] Deploy:
    ```bash
    forge script script/Deploy.s.sol:DeployScript \
      --rpc-url $SEPOLIA_RPC_URL \
      --broadcast \
      --verify \
      --etherscan-api-key $ETHERSCAN_API_KEY
    ```
  - [ ] If `--verify` fails (Etherscan rate limits), verify manually:
    ```bash
    forge verify-contract <CONTRACT_ADDRESS> contracts/VaultV3.sol:VaultV3 \
      --chain-id 11155111 \
      --etherscan-api-key $ETHERSCAN_API_KEY
    ```
  - [ ] Save all deployed addresses to `DEPLOYED_ADDRESSES.md`

- [ ] 5. Update frontend for Sepolia
  - [ ] Use env-based chain config (support both Anvil and Sepolia):
    - `frontend/.env.local`:
      ```bash
      NEXT_PUBLIC_CHAIN=sepolia
      NEXT_PUBLIC_ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
      NEXT_PUBLIC_VAULT_ADDRESS=<deployed_vault_address>
      NEXT_PUBLIC_USDT_ADDRESS=<deployed_usdt_address>
      ```
    - Update `frontend/lib/wagmi.ts` to read chain from env
    - Update `frontend/lib/vault.ts` to read addresses from env
  - [ ] This way you can switch between Anvil and Sepolia by changing `.env.local`

- [ ] 6. End-to-end test on Sepolia
  - [ ] Connect MetaMask to Sepolia network
  - [ ] Test deposit ETH to vault
  - [ ] Test deposit USDT with permit (one-click)
  - [ ] Test invest USDT to Aave via strategy
  - [ ] Check all transactions on Etherscan
  - [ ] Verify contract source code is visible on Etherscan

**Milestone**: All contracts deployed to Sepolia, verified on Etherscan, frontend fully functional on testnet

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
   - [ ] User deposits USDT without prior approval (one-click)
   - [ ] Fallback to two-step flow works if permit fails

2. **Strategy Pattern** (Mission O):
   - [ ] AaveStrategy deployed with MockAavePool on Anvil
   - [ ] `invest()` moves USDT from vault → strategy → pool
   - [ ] `divest()` moves USDT back
   - [ ] `getTotalBalance()` includes strategy funds
   - [ ] try/catch: strategy failure does NOT revert vault operations

3. **Ponder Indexing** (Mission P):
   - [ ] Ponder container running, indexing `TokenDeposited` events
   - [ ] GraphQL query returns deposit you just made

4. **Sepolia Deployment** (Mission Q):
   - [ ] Contracts verified on Etherscan (source code visible)
   - [ ] Frontend works on Sepolia (deposit, withdraw, permit all functional)
   - [ ] Strategy connects to real Aave V3 on Sepolia

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
