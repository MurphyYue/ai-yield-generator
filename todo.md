# Web3 Full-Stack Learning Roadmap

## Progress Tracker

- [ ] **Mission A: Smart Contract (Vault.sol)**
- [ ] **Mission B: React Frontend with MetaMask**
- [ ] **Mission C: Local Anvil Node & Deployment**

---

## Mission A: Smart Contract (Vault.sol) ✅ COMPLETED

- [x] 1. Create Vault.sol contract with deposit/withdraw functions
- [x] 2. Compile the contract
- [x] 3. Install OpenZeppelin dependencies
- [ ] 4. Deploy to local Anvil node

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

- [ ] 1. Update Docker configuration for Anvil
- [ ] 2. Start Anvil node in container
- [ ] 3. Configure MetaMask to connect to Anvil
- [ ] 4. Deploy Vault contract
- [ ] 5. Verify deployment

**Status**: Pending

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

**Current**: Mission A - Deploy to local Anvil node (Mission C)

**Next**: Start Anvil and deploy Vault contract
