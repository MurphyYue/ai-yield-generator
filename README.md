# AI-Powered Cross-Chain Yield Navigator

## What This Is
One paragraph: AI-driven DeFi vault that compares yield across Base and Arbitrum Aave V3...

## Architecture
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

## Tech Stack
Solidity, Foundry, Next.js, wagmi/viem, LangGraph, Ponder, LI.FI, Base, Arbitrum

## Engineering Process
"Followed 5-level DeFi workflow: unit tests → mainnet fork testing → canary deployment..."

## Key Features
- EIP-2612 Permit (one-click deposit)
- Strategy Pattern (swappable yield protocols)
- AI advisory with real on-chain data + RAG
- Cross-chain migration with LI.FI bridge
- Safety: fork tests, Slither analysis, risk modals

## Deployed Contracts
Link to BaseScan / Arbiscan verified contracts