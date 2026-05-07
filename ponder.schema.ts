import { onchainTable } from "ponder";

// Unified vault activity table — tracks all 4 event types from VaultV3
export const vaultActivity = onchainTable("vault_activity", (t) => ({
  id: t.text().primaryKey(),              // txHash-logIndex (unique per event)
  user: t.hex().notNull(),                // wallet address of the actor
  token: t.hex().notNull(),               // ERC20 token address (USDC)
  amount: t.bigint().notNull(),           // raw amount (6 decimals for USDC)
  eventType: t.text().notNull(),          // "deposit" | "withdraw" | "invest" | "divest"
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.integer().notNull(),
  transactionHash: t.hex().notNull(),
}));
