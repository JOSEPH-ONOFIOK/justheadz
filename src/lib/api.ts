import { getSession, type XUser } from "./auth";
import { MIN_ACCOUNT_DAYS, MIN_FOLLOWERS } from "./site";
import { store } from "./store";

export const bad = (error: string, status = 400) => Response.json({ error }, { status });

// Why an X account can't apply, or undefined when it can.
// Dev sign in has no X data, so it is never blocked.
export function eligibility(user?: XUser): string | undefined {
  if (!user) return undefined;
  const followers = user.public_metrics?.followers_count ?? 0;
  const days = user.created_at ? (Date.now() - Date.parse(user.created_at)) / 864e5 : 0;
  if (days < MIN_ACCOUNT_DAYS) return `Your X account needs to be at least ${MIN_ACCOUNT_DAYS} days old to apply.`;
  if (followers < MIN_FOLLOWERS) return `You need at least ${MIN_FOLLOWERS} followers on X to apply. You have ${followers}.`;
  return undefined;
}

// Creates the entry on first sign in, or returns the existing one.
// With an X user, refreshes their account stats and eligibility every sign in.
export async function enroll(handle: string, user?: XUser) {
  const xid = user?.id;
  const now = Date.now();
  let entry = await store.get(handle);
  if (entry && xid && entry.xid && entry.xid !== xid) throw new Error("handle_taken");
  entry ??= { handle, createdAt: now, updatedAt: now, done: {} };
  if (xid) {
    entry.xid ??= xid;
    entry.xCreated = user?.created_at;
    entry.followers = user?.public_metrics?.followers_count;
    entry.blocked = eligibility(user);
    if (!entry.blocked) delete entry.blocked;
  }
  await store.put(entry);
  return entry;
}

// Reads the session and JSON body, and applies a per-account rate limit
export async function authed(req: Request) {
  const s = await getSession();
  if (!s) return { error: bad("Connect your X first.", 401) };
  const entry = await store.get(s.h);
  if (!entry) return { error: bad("Account not found. Connect your X again.", 401) };
  if (!(await store.limit(`act:${s.h.toLowerCase()}`, 30, 60))) return { error: bad("Slow down a little. Try again in a minute.", 429) };
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return { entry, body };
}
