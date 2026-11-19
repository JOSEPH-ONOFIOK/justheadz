import { connection } from "next/server";
import { authed, bad } from "@/lib/api";
import { getSession, sign, unsign } from "@/lib/auth";
import { toPublic } from "@/lib/entry";
import { GAME, POINTS, day, evoOf, fedToday, gameLeft, nextFeed, points, stageFor } from "@/lib/evolve";
import { ALL_HEADS } from "@/lib/heads";
import { store } from "@/lib/store";
import { verifyShare } from "@/lib/xpost";

// POST { action, ... } for the signed-in account:
//   pick   { head }            choose a head, once
//   feed                       once per UTC day, builds the streak
//   start                      begin a Feed the Head game: returns a signed ticket, no save
//   finish { score, ticket }   end it; points capped per day
//   share  { link }            a post tagging us with the evolution card, once per stage
type Ticket = { game: 1; h: string; t: number };

export async function POST(req: Request) {
  try {
    const body = await req.clone().json().catch(() => ({}));
    if (body?.action === "start") return await startGame();
    return await act(req);
  } catch (e) {
    console.error("evolve failed", e);
    return bad("Something went wrong. Please try again.", 500);
  }
}

// Fast path: the start time goes in a signed ticket instead of a trip to the store
async function startGame() {
  const s = await getSession();
  if (!s) return bad("Connect your X first.", 401);
  return Response.json({ ticket: sign({ game: 1, h: s.h.toLowerCase(), t: Date.now() } satisfies Ticket) });
}

async function act(req: Request) {
  const a = await authed(req);
  if ("error" in a) return a.error;
  const { entry, body } = a;
  if (entry.blocked) return bad(entry.blocked, 403);
  const evo = evoOf(entry);
  const now = Date.now();
  let gained = 0;

  if (body.action !== "pick" && !evo.head) return bad("Pick your head first.");

  switch (body.action) {
    case "pick": {
      if (evo.head) return bad("Your head is already picked. It's yours for good.");
      const head = String(body.head ?? "");
      if (!ALL_HEADS.some((h) => h.id === head)) return bad("Unknown head.");
      evo.head = head;
      break;
    }

    case "feed": {
      if (fedToday(evo, now)) return bad("Already fed today. It gets hungry again at midnight UTC.");
      const { streak, reward } = nextFeed(evo, now);
      evo.streak = streak;
      evo.lastFeed = day(now);
      evo.xp += reward;
      gained = reward;
      break;
    }

    case "finish": {
      const ticket = unsign<Ticket>(typeof body.ticket === "string" ? body.ticket : undefined);
      const start = ticket?.game === 1 && ticket.h === entry.handle.toLowerCase() ? ticket.t : 0;
      const ms = start ? now - start : 0;
      // Each ticket counts once, and only for a believable round length
      if (!start || start <= (evo.gameLast ?? 0) || ms < GAME.minMs || ms > 10 * 60_000) return bad("That round didn't count. Start a new one.");
      evo.gameLast = start;
      // No more than a real round could score
      const score = Math.max(0, Math.min(Math.floor(Number(body.score) || 0), Math.ceil(Math.min(ms / 1000, GAME.seconds + 5) * GAME.maxPerSec)));
      const today = day(now);
      if (evo.gameDay !== today) {
        evo.gameDay = today;
        evo.gamePts = 0;
      }
      gained = Math.min(score, gameLeft(evo, now));
      evo.gamePts = (evo.gamePts ?? 0) + gained;
      evo.xp += gained;
      evo.best = Math.max(evo.best ?? 0, score);
      break;
    }

    case "share": {
      const stage = stageFor(points(entry).total).n;
      if (evo.shared?.includes(stage)) return bad(`You've already shared stage ${stage}. Evolve to share again.`);
      const r = await verifyShare(String(body.link ?? ""), entry.handle);
      if (!r.ok) return bad(r.error);
      const used = new Set([...(evo.shareLinks ?? []), entry.tagLink, entry.quoteLink].filter(Boolean).map((l) => l!.toLowerCase()));
      if (used.has(r.link.toLowerCase())) return bad("That post was already used. Make a new one for this stage.");
      evo.shared = [...(evo.shared ?? []), stage];
      evo.shareLinks = [...(evo.shareLinks ?? []), r.link];
      evo.xp += POINTS.share;
      gained = POINTS.share;
      break;
    }

    default:
      return bad("Unknown action.");
  }

  entry.evo = evo;
  entry.updatedAt = now;
  await store.put(entry);
  if (gained || body.action === "pick") cache = null; // the board changed
  return Response.json({ entry: toPublic(entry), gained });
}

// GET → the leaderboard, plus the signed-in account's rank
type Row = { handle: string; head: string; points: number; stage: number };
let cache: { at: number; rows: Row[] } | null = null;
const CACHE_MS = 60_000;

export async function GET() {
  await connection();
  if (!cache || Date.now() - cache.at > CACHE_MS) {
    const all = await store.all().catch(() => []);
    const rows = all
      .filter((e) => e.evo?.head && !e.blocked)
      .map((e) => {
        const total = points(e).total;
        return { handle: e.handle, head: e.evo!.head!, points: total, stage: stageFor(total).n };
      })
      .sort((a, b) => b.points - a.points);
    cache = { at: Date.now(), rows };
  }
  const s = await getSession();
  const i = s ? cache.rows.findIndex((r) => r.handle.toLowerCase() === s.h.toLowerCase()) : -1;
  return Response.json({ board: cache.rows.slice(0, 25), heads: cache.rows.length, rank: i >= 0 ? i + 1 : null });
}
