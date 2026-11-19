// One application and its tasks. Shared by the API routes and the UI.

import type { Claim } from "./claim";
import { evoOf, points, stageFor, type Evo } from "./evolve";

export type TaskId = "follow" | "engage" | "tag" | "memory" | "wallet" | "quote";

// Strict order: each task opens only when the one before it is done
export const TASK_ORDER: TaskId[] = ["follow", "engage", "tag", "memory", "wallet", "quote"];

export type Entry = {
  handle: string;
  xid?: string;
  createdAt: number;
  updatedAt: number;
  done: Partial<Record<TaskId, number>>;
  wallet?: string;
  tagLink?: string;
  quoteLink?: string;
  liked?: boolean;
  reposted?: boolean;
  // When the memory game was started, so it can't be skipped instantly
  memoryStart?: number;
  // From X at sign in, saved for reference
  xCreated?: string;
  followers?: number;
  // Why this account can't apply, if it can't
  blocked?: string;
  ip?: string;
  // Head evolution (see evolve.ts)
  evo?: Evo;
  // Who invited them (lowercase handle), and the invites of theirs who finished
  refBy?: string;
  refs?: string[];
  // Holder claim (see claim.ts)
  claim?: Claim;
};

export const isComplete = (e: Pick<Entry, "done">) => TASK_ORDER.every((t) => e.done[t]);

// The first task not yet done, or null when all are
export const nextTask = (e: Pick<Entry, "done">) => TASK_ORDER.find((t) => !e.done[t]) ?? null;

export function signupRow(e: Entry) {
  const iso = (t?: number) => (t ? new Date(t).toISOString() : "");
  const complete = isComplete(e);
  return {
    handle: e.handle,
    wallet: e.wallet ?? "",
    complete: complete ? "yes" : "no",
    blocked: e.blocked ?? "",
    followers: e.followers === undefined ? "" : String(e.followers),
    x_created: e.xCreated ?? "",
    tag_reply: e.tagLink ?? "",
    quote_post: e.quoteLink ?? "",
    joined_at: iso(e.createdAt),
    completed_at: complete ? iso(Math.max(...Object.values(e.done).map(Number))) : "",
    updated_at: iso(e.updatedAt),
    ...sheetExtra(e),
  };
}

// The evolution and holder claim columns in the export and the sheet
export function sheetExtra(e: Entry) {
  const total = points(e).total;
  const c = e.claim?.claimedAt ? e.claim : undefined;
  return {
    head: evoOf(e).head ?? "",
    stage: String(stageFor(total).n),
    evo_points: String(total),
    referrals: String(e.refs?.length ?? 0),
    referred_by: e.refBy ?? "",
    claim_phase: c?.phase ? String(c.phase) : "",
    claim_community: c?.community ?? "",
    claim_wallet: c?.wallet ?? "",
    claim_vault: c?.via ?? "",
    claimed_at: c?.claimedAt ? new Date(c.claimedAt).toISOString() : "",
  };
}

export type PublicEntry = Omit<Entry, "xid" | "ip" | "memoryStart">;

export function toPublic(e: Entry): PublicEntry {
  const copy = { ...e };
  delete copy.xid;
  delete copy.ip;
  delete copy.memoryStart;
  return copy;
}
