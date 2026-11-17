import { authed, bad } from "@/lib/api";
import { ipHash } from "@/lib/auth";
import { TASK_ORDER, nextTask, toPublic, type TaskId } from "@/lib/entry";
import { PINNED_ID, WALLET } from "@/lib/site";
import { store } from "@/lib/store";
import { verifyQuote, verifyTagReply } from "@/lib/xpost";

// Shortest believable time to clear all three memory rounds
const MEMORY_MIN_MS = 15_000;

// POST { task, ... } completes one task for the signed-in account, strictly in order.
//   follow                            clicked the follow button
//   engage  { action: like|repost }   done when both are clicked
//   tag     { link }                  reply under the pinned post tagging friends (verified on X)
//   memory  { action: start|finish }  the face memory game
//   wallet  { wallet }                EVM address, one per account
//   quote   { link }                  quote of the pinned post with wallet, friends and card (verified on X)
export async function POST(req: Request) {
  try {
    return await complete(req);
  } catch (e) {
    console.error("task failed", e);
    return bad("Something went wrong. Please try again.", 500);
  }
}

async function complete(req: Request) {
  const a = await authed(req);
  if ("error" in a) return a.error;
  const { entry, body } = a;
  if (entry.blocked) return bad(entry.blocked, 403);
  const task = body.task as TaskId;
  if (!TASK_ORDER.includes(task)) return bad("Unknown task.");

  // Nothing out of order. A finished task can be redone only where that makes sense (wallet).
  const next = nextTask(entry);
  if (!entry.done[task] && task !== next) return bad("Finish the step before this one first.", 409);
  const now = Date.now();

  switch (task) {
    case "follow":
      entry.done.follow ??= now;
      break;

    case "engage": {
      if (body.action === "like") entry.liked = true;
      else if (body.action === "repost") entry.reposted = true;
      else return bad("Unknown action.");
      if (entry.liked && entry.reposted) entry.done.engage ??= now;
      break;
    }

    case "tag": {
      if (entry.done.tag) break;
      const r = await verifyTagReply(String(body.link ?? ""), entry.handle, PINNED_ID);
      if (!r.ok) return bad(r.error);
      entry.tagLink = r.link;
      entry.done.tag = now;
      break;
    }

    case "memory": {
      if (entry.done.memory) break;
      if (body.action === "start") {
        entry.memoryStart = now;
      } else if (body.action === "finish") {
        if (!entry.memoryStart || now - entry.memoryStart < MEMORY_MIN_MS) return bad("The eyes saw that. Play it properly.");
        entry.done.memory = now;
      } else return bad("Unknown action.");
      break;
    }

    case "wallet": {
      const wallet = String(body.wallet ?? "").trim();
      if (!WALLET.test(wallet)) return bad("That isn't a valid EVM address. It starts with 0x followed by 40 characters.");
      if (entry.done.quote && wallet.toLowerCase() !== entry.wallet?.toLowerCase()) {
        return bad("Your final post already uses this wallet, so it can't be changed now.");
      }
      const owner = await store.walletOwner(wallet);
      if (owner && owner !== entry.handle.toLowerCase()) return bad("That wallet is already used by another account.");
      await store.claimWallet(wallet, entry.handle, entry.wallet);
      entry.wallet = wallet;
      if (!entry.done.wallet) {
        entry.done.wallet = now;
        entry.ip = ipHash(req);
      }
      break;
    }

    case "quote": {
      if (entry.done.quote) break;
      if (!entry.wallet) return bad("Save your wallet first.");
      const r = await verifyQuote(String(body.link ?? ""), entry.handle, entry.wallet, PINNED_ID);
      if (!r.ok) return bad(r.error);
      entry.quoteLink = r.link;
      entry.done.quote = now;
      break;
    }
  }

  entry.updatedAt = now;
  await store.put(entry);
  return Response.json({ entry: toPublic(entry) });
}
