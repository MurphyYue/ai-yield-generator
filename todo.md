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

### Mission K: Dify Risk Assessment Engine 

**Objective**: Upgrade Dify Agent to identify "anomalous intents" (e.g., withdrawing 100% of balance at once).

**Implementation Tasks:**

- [ ] 1. Enhance Dify System Role prompt
  - [ ] Add risk assessment logic:
    ```
    Analyze transaction intent for risk factors:
    - HIGH RISK: Withdraw > 90% of balance
    - MEDIUM RISK: Withdraw > 50% of balance
    - LOW RISK: Withdraw < 50% of balance
    - HIGH RISK: First-time large transaction
    - MEDIUM RISK: Unusual token combination
    ```
  - [ ] Add `risk_level` field to response schema:
    ```json
    {
      "action": "withdraw",
      "amount": 100,
      "token": "USDT",
      "token_address": "0x...",
      "confidence": "high",
      "risk_level": "high|medium|low",
      "risk_reason": "Withdrawing 100% of USDT balance"
    }
    ```

- [ ] 2. Update API route schema
  - [ ] Extend `Intent` interface in `AIPanel.tsx`
  - [ ] Add `risk_level?: 'high' | 'medium' | 'low'`
  - [ ] Add `risk_reason?: string`

- [ ] 3. Implement risk-based UI flow
  - [ ] HIGH RISK: Force double confirmation with warning
  - [ ] MEDIUM RISK: Show warning but allow single confirmation
  - [ ] LOW RISK: Normal flow

- [ ] 4. Test risk scenarios
  - [ ] "取出所有 USDT" → HIGH RISK (withdraw all)
  - [ ] "withdraw 0.5 ETH" from 1 ETH → MEDIUM RISK (50%)
  - [ ] "deposit 100 USDT" → LOW RISK (deposit)

**Milestone**:  AI returns `risk_level: "high"` for dangerous operations, frontend enforces double confirmation

**Files to Modify:**
- `app/api/chat/route.ts` - Update Dify prompt and response handling
- `components/AIPanel.tsx` - Add risk display and confirmation flow
- `components/DepositPanel.tsx` - Add risk-based confirmation
- `components/WithdrawPanel.tsx` - Add risk-based confirmation

---

## Session 4: Frontend Layer - Simulation & Interception (16:30 - 18:30, 2h)

### Mission L: Pre-execution Safety (Already Implemented in Day 2) 

**Status**: Mission H completed simulation infrastructure. Now integrate with new features.

**Enhancement Tasks:**

- [ ] 1. Test pause/resume simulation
  - [ ] Verify `simulateContract` catches `EnforcedPause` error
  - [ ] Show user-friendly error: "System is paused. Contact admin."

- [ ] 2. Test role-based access simulation
  - [ ] Verify `simulateContract` catches missing role errors
  - [ ] Show user-friendly error: "Insufficient permissions for this operation."

- [ ] 3. Test risk-based confirmation flow
  - [ ] HIGH RISK: Show warning → Require second confirmation → Simulate
  - [ ] MEDIUM RISK: Show warning → Single confirmation → Simulate
  - [ ] LOW RISK: Direct → Simulate

- [ ] 4. Verify no wallet popup on simulation failure
  - [ ] Test all failure scenarios
  - [ ] Confirm MetaMask never appears if simulation fails

**Milestone**:  User clicks AI-filled form with insufficient balance, frontend shows error immediately, MetaMask doesn't popup

---

## Break (18:30 - 19:30, 1h)

*Dinner*

---

## Session 5: Architecture Documentation (19:30 - 21:00, 1.5h)

### Mission M: Governance Specification 

**Documentation Tasks:**

- [ ] 1. Update `SECURITY_FOUNDATION.md`
  - [ ] Add "Access Control" section
  - [ ] Document role hierarchy:
    ```
    DEFAULT_ADMIN_ROLE
    └── ADMIN_ROLE (pause/resume, grant roles)
        └── OPERATOR_ROLE (emergency operations)
    ```
  - [ ] Add "Circuit Breaker" section
  - [ ] Document pause/resume workflow

- [ ] 2. Create Role Matrix
  - [ ] Table mapping roles to permissions
  - [ ] Document `onlyRole` usage patterns
  - [ ] Add role management best practices

- [ ] 3. Create Risk Assessment Guide
  - [ ] Document risk level calculation logic
  - [ ] Provide examples of risk scenarios
  - [ ] Document double-confirmation flow

- [ ] 4. Create Day 3 Summary
  - [ ] `MISSION_I_COMPLETE.md` - AccessControl implementation
  - [ ] `MISSION_J_COMPLETE.md` - Pausable mechanism
  - [ ] `MISSION_K_COMPLETE.md` - AI risk control
  - [ ] `DAY3_COMPLETE.md` - Complete day 3 summary

**Milestone**:  Clear permission role matrix (Role Matrix) produced

**Files to Create:**
- Updated `SECURITY_FOUNDATION.md`
- `ROLE_MATRIX.md` - Role permission reference
- `RISK_ASSESSMENT.md` - Risk control documentation
- Mission completion markdown files

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
