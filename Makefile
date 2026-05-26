# ─── Vault Navigator — Foundry Deployment Makefile ───────────────────────────
#
# Private keys are NEVER stored in .env or passed via --private-key.
# All signing uses the encrypted Foundry keystore.
#
# One-time setup (run once per machine):
#   cast wallet import my_deployer_account --interactive
#   cast wallet import anvil_account --interactive   # for local testing
#
# Verify your keystore accounts:
#   cast wallet list
#   cast wallet address --account my_deployer_account

-include .env

.PHONY: help setup-wallet build test deploy-anvil deploy-base deploy-arbitrum verify-base verify-arbitrum clean

# ─── Help ─────────────────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "Vault Navigator — Foundry Commands"
	@echo "─────────────────────────────────────────────────────────────────────"
	@echo "  make setup-wallet        Import deployer key into encrypted keystore"
	@echo "  make build               Compile contracts"
	@echo "  make test                Run all tests"
	@echo "  make test-fork-base      Run Base mainnet fork tests"
	@echo "  make test-fork-arbitrum  Run Arbitrum mainnet fork tests"
	@echo "  make deploy-anvil        Deploy to local Anvil (uses anvil_account)"
	@echo "  make deploy-base         Deploy to Base mainnet"
	@echo "  make deploy-arbitrum     Deploy to Arbitrum mainnet"
	@echo "  make verify-base         Verify contracts on Basescan"
	@echo "  make verify-arbitrum     Verify contracts on Arbiscan"
	@echo "  make clean               Remove build artifacts"
	@echo ""

# ─── One-time keystore setup ──────────────────────────────────────────────────

setup-wallet:
	@echo "Importing mainnet deployer key into encrypted keystore..."
	@echo "You will be prompted for your private key and a password."
	cast wallet import my_deployer_account --interactive
	@echo ""
	@echo "Importing Anvil test key into encrypted keystore..."
	cast wallet import anvil_account --interactive
	@echo ""
	cast wallet list

# ─── Build & Test ─────────────────────────────────────────────────────────────

build:
	forge build

test:
	forge test -vvv

test-fork-base:
	forge test --match-path "test/ForkBase.t.sol" -vvv --fork-url $(BASE_RPC_URL)

test-fork-arbitrum:
	forge test --match-path "test/ForkArbitrum.t.sol" -vvv --fork-url $(ARBITRUM_RPC_URL)

# ─── Local Anvil deployment ───────────────────────────────────────────────────
# Uses the well-known Anvil default key stored in the anvil_account keystore.
# Safe because Anvil keys have no real value.

deploy-anvil:
	forge script script/Deploy.s.sol \
		--rpc-url $(ANVIL_RPC_URL) \
		--account anvil_account \
		--broadcast \
		-vvvv

# ─── Mainnet deployments ──────────────────────────────────────────────────────
# --sender is your deployer address (used for simulation before signing).
# Foundry will prompt for your keystore password at broadcast time.

deploy-base:
	forge script script/Deploy.s.sol \
		--rpc-url $(BASE_RPC_URL) \
		--account my_deployer_account \
		--sender $(YOUR_ADDRESS) \
		--broadcast \
		--verify \
		--etherscan-api-key $(BASESCAN_API_KEY) \
		-vvvv

deploy-arbitrum:
	forge script script/Deploy.s.sol \
		--rpc-url $(ARBITRUM_RPC_URL) \
		--account my_deployer_account \
		--sender $(YOUR_ADDRESS) \
		--broadcast \
		--verify \
		--etherscan-api-key $(ARBISCAN_API_KEY) \
		-vvvv

# ─── Standalone verification (if --verify failed during deploy) ───────────────

verify-base:
	forge verify-contract $(VAULT_BASE) contracts/VaultV3.sol:VaultV3 \
		--chain base \
		--etherscan-api-key $(BASESCAN_API_KEY)
	forge verify-contract $(STRATEGY_BASE) contracts/AaveStrategy.sol:AaveStrategy \
		--chain base \
		--etherscan-api-key $(BASESCAN_API_KEY) \
		--constructor-args $$(cast abi-encode "constructor(address,address,address)" \
			$(VAULT_BASE) $(USDC_BASE) 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5)

verify-arbitrum:
	forge verify-contract $(VAULT_ARB) contracts/VaultV3.sol:VaultV3 \
		--chain arbitrum \
		--etherscan-api-key $(ARBISCAN_API_KEY)
	forge verify-contract $(STRATEGY_ARB) contracts/AaveStrategy.sol:AaveStrategy \
		--chain arbitrum \
		--etherscan-api-key $(ARBISCAN_API_KEY) \
		--constructor-args $$(cast abi-encode "constructor(address,address,address)" \
			$(VAULT_ARB) $(USDC_ARB) 0x794a61358D6845594F94dc1DB02A252b5b4814aD)

# ─── Utilities ────────────────────────────────────────────────────────────────

clean:
	forge clean
