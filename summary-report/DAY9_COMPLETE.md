# Day 9 Complete: Base Mainnet Canary Deployment

## Mission Goal

Day 9 was the first real-money validation of the vault system on Base mainnet.

The goal was to prove that:

- `VaultV3` and `AaveStrategy` can be deployed on real Base mainnet,
- the deployed contracts can interact with real Base USDC and real Aave infrastructure,
- and a full small-value canary cycle can complete safely:
  - approve
  - deposit
  - invest
  - divest
  - withdraw

This mission moved the project from fork-tested confidence to real on-chain operational proof.

---

## Business Meaning

This mission matters because fork tests are still simulations.

They are valuable, but they do not prove:

- deployment works on the real target chain,
- wallet permissions are correct in production,
- gas, approvals, and transaction sequencing behave as expected with live infrastructure,
- or that small real money can complete a full cycle without loss.

For a real DeFi product, Day 9 is the first genuine trust checkpoint.

For your career path, this demonstrates:

- live mainnet deployment discipline,
- operational caution with real capital,
- ability to validate a DeFi system under real execution conditions,
- and the difference between "code works" and "product operates safely."

---

## Architecture Meaning

Day 9 did not primarily change architecture. It validated architecture under production conditions.

The main architectural principle tested was:

- separation between user custody flow and treasury allocation flow

The live sequence proved that these two layers work together correctly:

1. user custody/accounting layer
   - `approve`
   - `depositToken`
   - `withdrawToken`

2. treasury strategy layer
   - `invest`
   - `divest`

This is important because user deposits are not directly coupled to protocol allocation. Funds can sit idle in the vault or be deployed into Aave through an explicit treasury operation.

---

## What Changed

### 1. Deployed contracts to Base mainnet

Deployment succeeded with these live addresses:

- VaultV3: `0xF0E2c34BF85d4C6cCDA7e872669836bFDBa2ef66`
- AaveStrategy: `0x4d287Aaf11dEb2142246327eEbE3AFF558EF6a22`
- Deployer: `0x4423D93f6DbF82aAbeaa50A72F4Be9ABe4464F08`

The deployment used:

- Base chain id `8453`
- Base USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Base Aave Pool `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5`

### 2. Executed the full 5 USDC mainnet canary

The full live flow completed successfully:

- approve vault to spend 5 USDC
- deposit 5 USDC into vault
- invest 5 USDC into Aave via strategy
- divest 5 USDC back to vault
- withdraw 5 USDC back to wallet

Final result:

- all transactions succeeded
- 5 USDC returned to wallet
- no loss occurred

---

## How It Works

### 1. Approve

Your wallet approved the vault to pull 5 USDC from your wallet.

This changed allowance only.
No USDC moved yet.

### 2. Deposit

`depositToken()` moved 5 USDC from your wallet into the vault.

Inside the vault:

- real USDC balance of the vault increased
- `tokenBalances[USDC][yourAddress]` increased by 5 USDC

At this stage, your funds were idle inside the vault.

### 3. Invest

`invest()` did two things:

1. Vault transferred 5 USDC to `AaveStrategy`
2. `AaveStrategy.deposit()` approved the Aave pool and called:
   - `AavePool.supply(token, amount, address(this), 0)`

That caused Aave to pull the USDC from the strategy and mint the Aave position to the strategy.

After this step:

- vault idle USDC decreased
- strategy held the Aave-backed position
- your vault accounting balance still represented your deposited 5 USDC

This is the key DeFi concept:
the funds did not disappear. They changed location from idle vault balance to deployed Aave-backed balance.

### 4. Divest

`divest()` called `strategy.withdraw(amount)`.

Inside the strategy:

- it called Aave `withdraw(token, amount, vault)`
- Aave burned the strategy's aToken position
- Aave sent underlying USDC directly back to the vault

After this step:

- strategy exposure decreased
- vault idle USDC increased again

### 5. Withdraw

`withdrawToken()` transferred 5 USDC from the vault back to your wallet and reduced your vault accounting balance.

This completed the full real-money lifecycle.

---

## Problems We Met And How We Solved Them

### Problem 1: Moving from fork confidence to real-money caution

**Issue**

Fork tests had already passed, but real deployment introduces new risks:

- wrong chain
- wrong wallet
- wrong RPC
- insufficient gas
- bad sequencing
- real asset movement mistakes

**Solution**

Used a canary approach:

- funded Base wallet first
- kept the test size very small at 5 USDC
- used explicit `cast` commands
- validated each transaction step-by-step

**Architectural meaning**

Production safety is not only contract logic. It is also operational process.

### Problem 2: Understanding `invest` and `divest`

**Issue**

`depositToken()` is intuitive because it is a direct user-to-vault transfer.

`invest()` and `divest()` are harder to understand because they are treasury-level movements across multiple contracts.

**Solution**

Traced the exact program flow through:

- [VaultV3.sol](/Users/murphyyue/Projects/web3-projects/contracts/VaultV3.sol)
- [AaveStrategy.sol](/Users/murphyyue/Projects/web3-projects/contracts/AaveStrategy.sol)
- [IStrategy.sol](/Users/murphyyue/Projects/web3-projects/contracts/IStrategy.sol)

This made the routing clear:

- wallet -> vault
- vault -> strategy
- strategy -> Aave
- Aave -> vault
- vault -> wallet

**Architectural meaning**

This is the strategy pattern working as intended. The vault manages user accounting and delegates yield deployment to a strategy adapter.

---

## Verification Results

Day 9 verification succeeded.

Confirmed outcomes:

- `VaultV3` deployed successfully on Base mainnet
- `AaveStrategy` deployed successfully on Base mainnet
- strategy registered in vault successfully
- all 7 operational commands completed successfully
- 5 USDC returned to your wallet
- no loss occurred in the full cycle

This is the first true mainnet proof for the project.

---

## Security / Risk Notes

Day 9 is a successful canary, but it is still not final production readiness.

Current limitations:

- governance roles are still concentrated in the deployer wallet
- the system does not yet implement full share-based multi-user yield accounting
- the frontend is not yet the primary production execution path for mainnet operations
- operational safety still depends heavily on manual caution

This means Day 9 proves:

- deployment is real
- contract routing is real
- Aave integration is real
- canary operations are real

It does not yet prove:

- full production governance maturity
- scalable multi-user vault economics
- automated mainnet operations

---

## What You Should Learn

1. Fork tests reduce risk, but they do not replace live canary deployment.
2. `depositToken` and `withdrawToken` are user custody operations.
3. `invest` and `divest` are treasury allocation operations.
4. A strategy pattern cleanly separates vault logic from protocol-specific logic.
5. In DeFi, the most important question is often not "who owns the funds?" but "where are the funds currently held?"
6. Real deployment work includes infrastructure correctness, not just contract correctness.

---

## Frontend Analogy

Think of the vault like an application wallet and the strategy like an external managed yield service.

- `depositToken` = user loads funds into the app
- `invest` = the app treasury deploys idle funds into an external capital venue
- `divest` = the treasury pulls funds back from that venue
- `withdrawToken` = user cashes out from the app

So the important distinction is:

- deposit/withdraw are user actions
- invest/divest are treasury actions

---

## Senior Engineer Lens

The strong Day 9 decision was not "deploy and hope."

It was:

- deploy only after fork validation,
- use a canary amount,
- validate the complete asset path with real money,
- and inspect the actual system flow until the contract model is fully understood.

That is senior full-stack engineering behavior in Web3:

- code is not treated as complete until it survives real infrastructure,
- capital movement is tested cautiously,
- and contract logic is explained as an end-to-end system, not as isolated functions.

---

## Open Questions

- Should deployed Base addresses now be recorded in a dedicated mainnet deployment record if not already done?
- Should BaseScan verification links be added to project documentation and README?
- Should Day 10 now upgrade the frontend chain layer before using the UI for mainnet operations?
- Should the vault eventually move to share-based accounting for correct multi-user yield attribution?

---

## Next Mission Context

Day 7 proved Base integration on forks.
Day 8 proved Arbitrum integration and cross-chain advisory logic.
Day 9 proved the Base deployment and full real-money canary on mainnet.

This sets up Day 10 naturally:

- deploy to Arbitrum mainnet
- add frontend multi-chain support
- connect the user-facing application layer to real deployed contracts across chains
