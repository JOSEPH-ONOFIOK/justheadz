import { connection } from "next/server";
import { authed, bad } from "@/lib/api";
import { CLAIM_CAP, CLAIM_POST_ID, PHASES, claimStepsDone, type ClaimStats } from "@/lib/claim";
import { toPublic, type Entry } from "@/lib/entry";
import { checkSignature, findHoldings, isBurn, type Found } from "@/lib/holdings";
import { WALLET, X_HANDLE } from "@/lib/site";
import { store } from "@/lib/store";
import { verifyClaimReply } from "@/lib/xpost";

// POST { step, ... } moves the signed-in account through the holder claim:
//   wallet  { wallet, ts, signature }  connected: the wallet signs a free message
//   wallet  { wallet }                 typed: no signature
//                                      Either way we look for an eligible NFT in the wallet, and in
//                                      vaults that delegated to it (phases with delegation on).
//   follow                             clicked follow on our X account
//   engage  { action: like|repost }    on the claim post
//   reply   { link }                   a reply under the claim post (verified on X)
//   confirm                            retry the final check, if a chain was down
// When every step is done, the holdings are checked again and the spot is locked, up to
// CLAIM_CAP in total. Only then are the wallet and vault reserved.
// A signed claim takes a wallet over from a typed one: typing someone else's wallet can't lock them out.
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
const FULL = `All ${CLAIM_CAP.toLocaleString("en-US")} spots are claimed.`;
const TAKEN = "That wallet, or the vault behind it, already claimed with another X account.";
const key = (addr: string) => `claim:${addr.toLowerCase()}`;

// Who holds these wallets now. "blocked": another account has them for good.
// "takeover": only typed claims have them, and this claim is signed, so it wins.
async function holders(me: string, addrs: (string | undefined)[], signed: boolean) {
  const others: Entry[] = [];
  for (const a of addrs.filter(Boolean) as string[]) {
    const owner = await store.walletOwner(key(a));
    if (!owner || owner === me) continue;
    const other = await store.get(owner);
    if (!other?.claim?.claimedAt) continue; // reserved by a claim since lost: free
    if (!signed || other.claim.signed) return { blocked: true, others };
    others.push(other);
  }
  return { blocked: false, others };
}

async function claimedCount() {
  return (await store.all()).filter((e) => e.claim?.claimedAt).length;
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
      if (!WALLET.test(wallet) || isBurn(wallet)) return bad("That isn't a wallet you can claim with. It starts with 0x followed by 40 characters.");
      const signed = body.signature !== undefined;
      if (signed && !(await checkSignature(wallet, entry.handle, Number(body.ts), String(body.signature)))) {
        return bad("We couldn't confirm that signature. Sign again with the wallet you connected.");
      }
      if (!(await store.limit(`claimcheck:${me}`, 10, 600))) return bad("Too many checks. Try again in a few minutes.", 429);
      const { found, down } = await findHoldings(wallet);
      if (!found.length) {
        if (down.length) return bad(downMsg(down), 503);
        const vaults = PHASES.some((p) => p.delegation) ? " or in any vault delegated to it on delegate.xyz" : "";
        return bad(`No eligible NFT in this wallet${vaults}.`);
      }
      const open = found.filter((f) => live.has(f.phase));
      if (!open.length) return bad(soonMsg(found));
      // The best holding whose wallets nobody else has for good
      let pick: Found | null = null;
      for (const f of open) if (!(await holders(me, [wallet, f.via], signed)).blocked) { pick = f; break; }
      if (!pick) return bad(TAKEN);
      Object.assign(c, { wallet: wallet.toLowerCase(), via: pick.via, community: pick.community, phase: pick.phase, signed });
      if (!c.via) delete c.via;
      delete c.lostTo;
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

  // Every step done: make sure they still hold and there's room, then lock the spot
  let error = "";
  if (claimStepsDone(c) && c.wallet) {
    const { found, down } = await findHoldings(c.wallet);
    const open = found.filter((f) => live.has(f.phase));
    const still = open.find((f) => f.community === c.community && f.via === c.via) ?? open[0];
    const h = still ? await holders(me, [c.wallet, still.via], !!c.signed) : null;
    if (!still) {
      error = down.length ? downMsg(down) : "The NFT isn't in that wallet or its vault any more. Check your wallet again.";
      if (!down.length) {
        delete c.community; // back to the wallet step
        delete c.phase;
      }
    } else if (h!.blocked) error = TAKEN;
    else if ((await claimedCount()) >= CLAIM_CAP) error = FULL;
    else {
      // A signed claim takes the wallet from typed claims on it
      for (const other of h!.others) {
        const oc = other.claim!;
        other.claim = { wallet: oc.wallet, followed: oc.followed, liked: oc.liked, reposted: oc.reposted, replyLink: oc.replyLink, lostTo: entry.handle };
        other.updatedAt = Date.now();
        await store.put(other);
      }
      await store.claimWallet(key(c.wallet), me);
      if (still.via) await store.claimWallet(key(still.via), me);
      Object.assign(c, { community: still.community, phase: still.phase, via: still.via, claimedAt: Date.now() });
      if (!c.via) delete c.via;
      stats = null;
    }
  }

  entry.updatedAt = Date.now();
  await store.put(entry);
  if (error) return Response.json({ entry: toPublic(entry), error }, { status: 409 });
  return Response.json({ entry: toPublic(entry) });
}

// GET → spots claimed in total, per phase and per community
let stats: { at: number; data: ClaimStats } | null = null;

export async function GET() {
  await connection();
  if (!stats || Date.now() - stats.at > 30_000) {
    const data: ClaimStats = { claimed: 0, cap: CLAIM_CAP, byPhase: {}, byCommunity: {} };
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
