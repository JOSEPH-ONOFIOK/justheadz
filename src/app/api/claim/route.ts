import { connection } from "next/server";
import { authed, bad } from "@/lib/api";
import { CLAIM_POST_ID, PHASES, claimStepsDone, type ClaimStats } from "@/lib/claim";
import { toPublic } from "@/lib/entry";
import { checkSignature, findHoldings, isBurn, type Found } from "@/lib/holdings";
import { WALLET, X_HANDLE } from "@/lib/site";
import { store } from "@/lib/store";
import { verifyClaimReply } from "@/lib/xpost";

// POST { step, ... } moves the signed-in account through the holder claim:
//   wallet  { wallet, ts, signature }  the wallet signs a message; we check it and any vaults
//                                      that delegated to it (delegate.xyz) for an eligible NFT
//   follow                             clicked follow on our X account
//   engage  { action: like|repost }    on the claim post
//   reply   { link }                   a reply under the claim post (verified on X)
//   confirm                            retry the final check, if a chain was down
// When every step is done, the holdings are checked again and the spot is locked.
// Only then are the wallet and the vault reserved, so neither can claim twice.
export async function POST(req: Request) {
  try {
    return await run(req);
  } catch (e) {
    console.error("claim failed", e);
    return bad("Something went wrong. Please try again.", 500);
  }
}

const live = new Set(PHASES.filter((p) => p.status === "live").map((p) => p.n));
const soonMsg = (found: Found[]) => `Your ${found[0].community} spot is in Phase ${found[0].phase}, which isn't open yet. Come back when it opens.`;
const downMsg = (down: string[]) => `We couldn't reach ${down.join(" and ")} just now. Try again in a minute.`;
const key = (addr: string) => `claim:${addr.toLowerCase()}`;

// The wallets a claim would reserve, and whether another account already has one
async function takenBy(me: string, f: { wallet: string; via?: string }) {
  for (const a of [f.wallet, f.via].filter(Boolean) as string[]) {
    const owner = await store.walletOwner(key(a));
    if (owner && owner !== me) return a;
  }
  return null;
}

async function run(req: Request) {
  const a = await authed(req);
  if ("error" in a) return a.error;
  const { entry, body } = a;
  if (entry.blocked) return bad(entry.blocked, 403);
  const me = entry.handle.toLowerCase();
  const c = (entry.claim ??= {});
  if (c.claimedAt) return Response.json({ entry: toPublic(entry) });

  switch (body.step) {
    case "wallet": {
      const wallet = String(body.wallet ?? "").trim();
      if (!WALLET.test(wallet) || isBurn(wallet)) return bad("That isn't a wallet you can claim with.");
      if (!(await checkSignature(wallet, entry.handle, Number(body.ts), String(body.signature ?? "")))) {
        return bad("We couldn't confirm that signature. Sign again with the wallet you connected.");
      }
      if (!(await store.limit(`claimcheck:${me}`, 10, 600))) return bad("Too many checks. Try again in a few minutes.", 429);
      const { found, down } = await findHoldings(wallet);
      if (!found.length) return bad(down.length ? downMsg(down) : "No eligible NFT in this wallet or in any vault delegated to it on delegate.xyz.", down.length ? 503 : 400);
      const open = found.filter((f) => live.has(f.phase));
      if (!open.length) return bad(soonMsg(found));
      // The best holding whose wallets nobody else has used
      let pick: Found | null = null;
      for (const f of open) if (!(await takenBy(me, { wallet, via: f.via }))) { pick = f; break; }
      if (!pick) return bad("That wallet, or the vault behind it, already claimed with another X account.");
      c.wallet = wallet.toLowerCase();
      c.via = pick.via;
      c.community = pick.community;
      c.phase = pick.phase;
      if (!c.via) delete c.via;
      break;
    }

    case "follow":
      if (!c.community) return bad("Check your wallet first.");
      c.followed = true;
      break;

    case "engage":
      if (!c.followed) return bad(`Follow ${X_HANDLE} first.`);
      if (body.action === "like") c.liked = true;
      else if (body.action === "repost") c.reposted = true;
      else return bad("Unknown action.");
      break;

    case "reply": {
      if (!c.liked || !c.reposted) return bad("Like and repost the claim post first.");
      const r = await verifyClaimReply(String(body.link ?? ""), entry.handle, CLAIM_POST_ID);
      if (!r.ok) return bad(r.error);
      const used = [entry.tagLink, entry.quoteLink, ...(entry.evo?.shareLinks ?? [])].filter(Boolean).map((l) => l!.toLowerCase());
      if (used.includes(r.link.toLowerCase())) return bad("That post was already used for something else. Reply with a new one.");
      c.replyLink = r.link;
      break;
    }

    case "confirm":
      if (!claimStepsDone(c)) return bad("Finish every step first.");
      break;

    default:
      return bad("Unknown step.");
  }

  // Every step done: make sure they still hold, then lock the spot
  let error = "";
  if (claimStepsDone(c) && c.wallet) {
    const { found, down } = await findHoldings(c.wallet);
    const open = found.filter((f) => live.has(f.phase));
    const still = open.find((f) => f.community === c.community && f.via === c.via) ?? open[0];
    if (!still) error = down.length ? downMsg(down) : "The NFT isn't in that wallet or its vault any more. Check your wallet again.";
    else if (await takenBy(me, { wallet: c.wallet, via: still.via })) error = "That wallet, or the vault behind it, already claimed with another X account.";
    else {
      await store.claimWallet(key(c.wallet), me);
      if (still.via) await store.claimWallet(key(still.via), me);
      Object.assign(c, { community: still.community, phase: still.phase, via: still.via, claimedAt: Date.now() });
      if (!c.via) delete c.via;
      stats = null;
    }
    if (error && !still) {
      // Back to the wallet step
      delete c.community;
      delete c.phase;
    }
  }

  entry.updatedAt = Date.now();
  await store.put(entry);
  if (error) return Response.json({ entry: toPublic(entry), error }, { status: 409 });
  return Response.json({ entry: toPublic(entry) });
}

// GET → spots claimed per phase and community
let stats: { at: number; data: ClaimStats } | null = null;

export async function GET() {
  await connection();
  if (!stats || Date.now() - stats.at > 60_000) {
    const data: ClaimStats = { claimed: 0, byPhase: {}, byCommunity: {} };
    for (const e of await store.all().catch(() => [])) {
      const c = e.claim;
      if (!c?.claimedAt || !c.phase || !c.community) continue;
      data.claimed++;
      data.byPhase[c.phase] = (data.byPhase[c.phase] ?? 0) + 1;
      data.byCommunity[c.community] = (data.byCommunity[c.community] ?? 0) + 1;
    }
    stats = { at: Date.now(), data };
  }
  return Response.json(stats.data);
}
