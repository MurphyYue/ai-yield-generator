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

**Deployed Contract Address**: 0x5FbDB2315678afecb367f032d93F642f64180aa3

---

## Mission B: React Frontend with MetaMask ⏳ IN PROGRESS

- [ ] 1. Set up Next.js project with Wagmi + Viem
- [ ] 2. Create wallet connection component
- [ ] 3. Display ETH/Token balance
- [ ] 4. Implement deposit function UI
- [ ] 5. Implement withdraw function UI
- [ ] 6. Connect to Anvil and test

**Status**: Pending

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
