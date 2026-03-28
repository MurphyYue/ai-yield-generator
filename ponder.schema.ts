import { onchainTable } from "ponder";

// ONE entity: tracks every ERC20 token deposit into the vault
export const depositHistory = onchainTable("deposit_history", (t) => ({
  id: t.text().primaryKey(),           // txHash-logIndex (unique per event)
  sender: t.hex().notNull(),           // user who deposited
  token: t.hex().notNull(),            // ERC20 token address (USDT)
  amount: t.bigint().notNull(),        // raw amount (6 decimals for USDT)
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.integer().notNull(),
  transactionHash: t.hex().notNull(),
}));
