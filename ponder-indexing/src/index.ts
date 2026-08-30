import { ponder } from "ponder:registry";
import { vaultActivity } from "../ponder.schema";

// Helper: insert a vault activity record
async function insertActivity(
  context: Parameters<Parameters<typeof ponder.on>[1]>[0]["context"],
  event: Parameters<Parameters<typeof ponder.on>[1]>[0]["event"],
  eventType: string,
  user: `0x${string}`,
  token: `0x${string}`,
  amount: bigint
) {
  await context.db.insert(vaultActivity).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    user,
    token,
    amount,
    eventType,
    blockNumber: event.block.number,
    blockTimestamp: Number(event.block.timestamp),
    transactionHash: event.transaction.hash,
  });
}

// event TokenDeposited(address indexed user, address indexed token, uint256 amount)
ponder.on("VaultV3:TokenDeposited", async ({ event, context }) => {
  await insertActivity(context, event, "deposit", event.args.user, event.args.token, event.args.amount);
});

// event TokenWithdrawn(address indexed user, address indexed token, uint256 amount)
ponder.on("VaultV3:TokenWithdrawn", async ({ event, context }) => {
  await insertActivity(context, event, "withdraw", event.args.user, event.args.token, event.args.amount);
});

// event Invested(address indexed token, uint256 amount)
ponder.on("VaultV3:Invested", async ({ event, context }) => {
  await insertActivity(context, event, "invest", event.args.token, event.args.token, event.args.amount);
});

// event Divested(address indexed token, uint256 amount)
ponder.on("VaultV3:Divested", async ({ event, context }) => {
  await insertActivity(context, event, "divest", event.args.token, event.args.token, event.args.amount);
});
