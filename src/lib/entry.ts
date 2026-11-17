// One application and its tasks. Shared by the API routes and the UI.

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
  // From X at sign in, used for the eligibility check
  xCreated?: string;
  followers?: number;
  // Why this account can't apply, if it can't
  blocked?: string;
  ip?: string;
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
