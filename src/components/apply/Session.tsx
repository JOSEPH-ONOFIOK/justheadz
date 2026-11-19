"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { PublicEntry } from "@/lib/entry";

type Auth = "x" | "dev" | "off";
type Result = { error?: string; gained?: number; ticket?: string };

type SessionValue = {
  ready: boolean;
  auth: Auth;
  entry: PublicEntry | null;
  notice: string | null;
  connect: (back?: string) => void;
  devConnect: (handle: string) => Promise<Result>;
  disconnect: () => Promise<void>;
  task: (body: Record<string, unknown>) => Promise<Result>;
  evolve: (body: Record<string, unknown>) => Promise<Result>;
  claim: (body: Record<string, unknown>) => Promise<Result>;
};

const Ctx = createContext<SessionValue | null>(null);

export const useSession = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession outside SessionProvider");
  return v;
};

const AUTH_ERRORS: Record<string, string> = {
  cancelled: "You cancelled Connect X. Try again whenever you're ready.",
  expired: "That took too long. Please connect again.",
  handle_taken: "That handle is linked to a different X account.",
  rate_limited: "Too many tries. Wait a few minutes and try again.",
  unavailable: "Connect X isn't switched on yet.",
  x_failed: "X didn't respond properly. Please try again.",
};

async function post(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return (await res.json().catch(() => ({ error: "Something went wrong. Please try again." }))) as {
    entry?: PublicEntry;
    error?: string;
    gained?: number;
    ticket?: string;
  };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [auth, setAuth] = useState<Auth>("off");
  const [entry, setEntry] = useState<PublicEntry | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Invite links carry ?ref=handle; it rides along through Connect X
  const ref = useRef<string | null>(null);

  useEffect(() => {
    const r = new URLSearchParams(location.search).get("ref");
    try {
      if (r) sessionStorage.setItem("jh_ref", r);
      ref.current = r ?? sessionStorage.getItem("jh_ref");
    } catch {
      ref.current = r;
    }
  }, []);

  useEffect(() => {
    // Messages from the X redirect, then tidy the address bar
    const q = new URLSearchParams(location.search);
    const err = q.get("auth_error");
    let msg: string | null = null;
    if (err) msg = AUTH_ERRORS[err] ?? AUTH_ERRORS.x_failed;
    if (q.has("auth_error") || q.has("connected")) history.replaceState(null, "", `${location.pathname}${location.hash}`);

    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        setAuth(d.auth);
        setEntry(d.entry);
        if (q.has("connected") && d.entry) msg = `Connected as @${d.entry.handle}!`;
      })
      .catch(() => {})
      .finally(() => {
        setNotice(msg);
        setReady(true);
      });
  }, []);

  // back: a page to return to after X, such as /whitelist
  const connect = useCallback((back?: string) => {
    // Full page navigation: the route redirects to X's consent screen
    const q = new URLSearchParams();
    if (back) q.set("to", back);
    if (ref.current) q.set("ref", ref.current);
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full load: the route redirects to X
    location.href = `/api/auth/x/start?${q}`;
  }, []);

  const devConnect = useCallback(async (handle: string) => {
    const d = await post("/api/auth/dev", { handle, ref: ref.current });
    if (d.entry) setEntry(d.entry);
    return { error: d.error };
  }, []);

  const disconnect = useCallback(async () => {
    await post("/api/auth/logout");
    setEntry(null);
  }, []);

  const task = useCallback(async (body: Record<string, unknown>) => {
    const d = await post("/api/task", body);
    if (d.entry) setEntry(d.entry);
    return { error: d.error };
  }, []);

  const evolve = useCallback(async (body: Record<string, unknown>) => {
    const d = await post("/api/evolve", body);
    if (d.entry) setEntry(d.entry);
    return { error: d.error, gained: d.gained, ticket: d.ticket };
  }, []);

  const claim = useCallback(async (body: Record<string, unknown>) => {
    const d = await post("/api/claim", body);
    if (d.entry) setEntry(d.entry);
    return { error: d.error };
  }, []);

  return (
    <Ctx.Provider value={{ ready, auth, entry, notice, connect, devConnect, disconnect, task, evolve, claim }}>{children}</Ctx.Provider>
  );
}
