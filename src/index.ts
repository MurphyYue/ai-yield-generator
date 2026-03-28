import { ponder } from "ponder:registry";
import { depositHistory } from "../ponder.schema";

// Handler: fires on every TokenDeposited event from VaultV3
// event TokenDeposited(address indexed user, address indexed token, uint256 amount)
ponder.on("VaultV3:TokenDeposited", async ({ event, context }) => {
  await context.db.insert(depositHistory).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    sender: event.args.user,
    token: event.args.token,
    amount: event.args.amount,
    blockNumber: event.block.number,
    blockTimestamp: Number(event.block.timestamp),
    transactionHash: event.transaction.hash,
  });
});
