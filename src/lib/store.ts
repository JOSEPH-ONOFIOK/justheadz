import { cookies } from "next/headers";
import { cookieBase, sign, unsign } from "./auth";
import { sheetExtra, type Entry } from "./entry";

// Storage, first one configured wins:
//   Google Sheet    when GOOGLE_SHEET_URL is set (see apps-script/Code.gs).
//   Upstash Redis   when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set.
//   Browser cookie  otherwise: each visitor's progress is kept in a signed cookie.
// The export and one-wallet-per-account need a database (Sheet or Upstash).

interface Store {
  get(handle: string): Promise<Entry | null>;
  put(entry: Entry): Promise<void>;
  all(): Promise<Entry[]>;
  // Which handle already uses this wallet, if any
  walletOwner(wallet: string): Promise<string | null>;
  claimWallet(wallet: string, handle: string, previous?: string): Promise<void>;
  // Fixed-window rate limit. Returns true when the call is allowed.
  limit(key: string, max: number, windowSec: number): Promise<boolean>;
}

const key = (h: string) => h.toLowerCase();

// ---------- Upstash ----------
const URL_ = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export async function redis<T = unknown>(...cmd: (string | number)[]): Promise<T> {
  const res = await fetch(URL_!, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result as T;
}

const upstash: Store = {
  async get(handle) {
    const v = await redis<string | null>("GET", `e:${key(handle)}`);
    return v ? (JSON.parse(v) as Entry) : null;
  },
  async put(entry) {
    await redis("SET", `e:${key(entry.handle)}`, JSON.stringify(entry));
    await redis("SADD", "entries", key(entry.handle));
  },
  async all() {
    const handles = await redis<string[]>("SMEMBERS", "entries");
    if (!handles.length) return [];
    const vals = await redis<(string | null)[]>("MGET", ...handles.map((h) => `e:${h}`));
    return vals.filter(Boolean).map((v) => JSON.parse(v!) as Entry);
  },
  walletOwner: (wallet) => redis<string | null>("GET", `w:${wallet.toLowerCase()}`),
  async claimWallet(wallet, handle, previous) {
    if (previous) await redis("DEL", `w:${previous.toLowerCase()}`);
    await redis("SET", `w:${wallet.toLowerCase()}`, key(handle));
  },
  async limit(k, max, windowSec) {
    const n = await redis<number>("INCR", `rl:${k}`);
    if (n === 1) await redis("EXPIRE", `rl:${k}`, windowSec);
    return n <= max;
  },
};

// Fixed-window rate limit kept in this server's memory
const windows = new Map<string, { n: number; reset: number }>();
function memoryLimit(k: string, max: number, windowSec: number) {
  const now = Date.now();
  const w = windows.get(k);
  if (!w || w.reset < now) {
    windows.set(k, { n: 1, reset: now + windowSec * 1000 });
    return true;
  }
  return ++w.n <= max;
}

// ---------- Google Sheet (Apps Script web app) ----------
const SHEET_URL = process.env.GOOGLE_SHEET_URL;

async function sheet<T = unknown>(op: string, args: Record<string, unknown> = {}): Promise<T> {
  // Apps Script answers a POST with a redirect to the result, which fetch follows
  const res = await fetch(SHEET_URL!, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ op, ...args }),
    cache: "no-store",
    redirect: "follow",
  });
  const text = await res.text();
  let json: { result?: T; error?: string };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Google Sheet returned ${res.status}, not JSON. Check the web app is deployed with access "Anyone".`);
  }
  if (json.error) throw new Error(`Google Sheet: ${json.error}`);
  return json.result as T;
}

const sheets: Store = {
  get: (handle) => sheet<Entry | null>("get", { handle }),
  // extra: the evolution and claim columns, so the sheet can be sorted by them
  put: async (entry) => void (await sheet("put", { entry, extra: sheetExtra(entry) })),
  all: () => sheet<Entry[]>("all"),
  walletOwner: (wallet) => sheet<string | null>("walletOwner", { wallet }),
  claimWallet: async (wallet, handle, previous) => void (await sheet("claimWallet", { wallet, handle, previous })),
  // In memory: a trip to the sheet per request would make every action slower
  limit: async (k, max, windowSec) => memoryLimit(k, max, windowSec),
};

// ---------- Browser cookie ----------
// No database: each visitor's entry lives in a signed cookie in their own
// browser. Signing means it can't be edited to fake tasks. There is no shared
// list, so the export is empty and wallets can't be checked across accounts.
const ENTRY_COOKIE = "jh_entry";

const cookie: Store = {
  async get(handle) {
    const e = unsign<Entry>((await cookies()).get(ENTRY_COOKIE)?.value);
    return e && key(e.handle) === key(handle) ? e : null;
  },
  async put(entry) {
    (await cookies()).set({ name: ENTRY_COOKIE, value: sign(entry), ...cookieBase, maxAge: 180 * 86400 });
  },
  async all() {
    return [];
  },
  async walletOwner() {
    return null;
  },
  async claimWallet() {},
  // Per server instance only, which is the best a cookie setup can do
  async limit(k, max, windowSec) {
    return memoryLimit(k, max, windowSec);
  },
};

const db: Store | null = SHEET_URL ? sheets : URL_ && TOKEN ? upstash : null;
export const hasDatabase = !!db;
const base = db ?? cookie;

// Someone who started while progress lived in their browser keeps it: the first
// time they come back, their signed cookie moves into the database.
async function importCookieEntry(db: Store, handle: string) {
  const old = await cookie.get(handle);
  if (!old) return null;
  if (old.wallet) {
    const owner = await db.walletOwner(old.wallet);
    if (owner && owner !== key(old.handle)) {
      // Another account claimed this wallet first
      delete old.wallet;
      delete old.done.wallet;
      delete old.done.quote;
      delete old.quoteLink;
    } else await db.claimWallet(old.wallet, old.handle);
  }
  await db.put(old);
  return old;
}

export const store: Store = {
  ...base,
  async get(handle) {
    const entry = await base.get(handle);
    return entry ?? (db ? importCookieEntry(db, handle) : null);
  },
};
