# Contract Deployment Summary - March 25, 2026

## Deployment Details

**Network**: Anvil Local Testnet (Docker)
**Chain ID**: 31337
**RPC URL**: http://localhost:8545
**Deployer**: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

## Deployed Contracts

### MockERC20 (Mock USDT)
- **Address**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **Features**:
  - Standard ERC20 with 6 decimals (matching USDT)
  - ERC20Permit support (EIP-2612)
  - Mintable by owner
- **Initial Supply**: 1,000,000 USDT (1,000,000,000,000 with 6 decimals)
- **Deployer Balance**: 1,000,000 USDT ✅

### VaultV3
- **Address**: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- **Features**:
  - AccessControl with SoD architecture
  - Pausable circuit breaker
  - ReentrancyGuard
  - Blacklist system
  - Large withdrawal approvals
  - Withdrawal fees
  - ETH and ERC20 support
  - EIP-2612 Permit support

## Role Assignments

All roles initially granted to deployer:
- ✅ DEFAULT_ADMIN_ROLE (0x00)
- ✅ MANAGER_ROLE
- ✅ OPERATOR_ROLE
- ✅ TREASURER_ROLE

## Frontend Configuration Updated

**File**: `frontend/lib/vault.ts`

```typescript
export const VAULT_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
export const MOCK_USDT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'
```

## How to Access USDT in MetaMask

**Option 1: Import Anvil Account (Recommended)**

1. Open MetaMask
2. Click account → Import Account
3. Paste private key:
   ```
   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
4. This adds account with 1,000,000 USDT

**Option 2: Mint USDT to Your Address**

If you want to use your existing MetaMask account, the contract owner can mint USDT to your address using the `mint()` function.

## Network Configuration for MetaMask

**Network Name**: Anvil Local
**RPC URL**: http://localhost:8545
**Chain ID**: 31337
**Currency Symbol**: ETH

## Verification Commands

```bash
# Check MockERC20 name
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 "name()(string)" --rpc-url http://localhost:8545

# Check USDT balance
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 "balanceOf(address)(uint256)" 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url http://localhost:8545

# Check Vault is paused
cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "paused()(bool)" --rpc-url http://localhost:8545
```

## Deployment Script Location

`/Users/murphyyue/Projects/web3-projects/script/Deploy.s.sol`

## Broadcast Logs

`/Users/murphyyue/Projects/web3-projects/broadcast/Deploy.s.sol/31337/run-latest.json`

## Notes

- Anvil is running in Docker container: `c9cbe3067bf38ad7f5cc243e13ee45160719c4ec3c522a40e229bfb6a67e19a6`
- Contracts deployed from host machine via localhost:8545
- All contract state is stored in Anvil's memory inside Docker
- If Docker container restarts, contracts will need redeployment
