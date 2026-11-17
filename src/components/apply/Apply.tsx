"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Eyes, type EyeMode } from "../Eyes";
import { Morph } from "../motion/PageShell";
import { Title } from "../motion/Title";
import { MemoryGame } from "./MemoryGame";
import { SessionProvider, useSession } from "./Session";
import { downloadCard } from "@/lib/card";
import { TASK_ORDER, isComplete, nextTask, type TaskId } from "@/lib/entry";
import { FRIENDS_NEEDED, PINNED_ID, PINNED_POST, WALLET, X_HANDLE, X_URL } from "@/lib/site";

const US = X_HANDLE.slice(1);
const openX = (url: string) => window.open(url, "_blank", "noopener,noreferrer");
const intent = (path: string, params: Record<string, string>) => `https://x.com/intent/${path}?${new URLSearchParams(params)}`;
// Until the pinned post is up, buttons point at the profile
const pinned = PINNED_POST || X_URL;

// One head per task; they wake up as tasks get done
const PROGRESS = ["sad", "mad", "scream", "shook", "void", "smug"];

function XLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-current`} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function Step({ n, title, state, children }: { n: number; title: string; state: "done" | "open" | "locked"; children: ReactNode }) {
  return (
    <section
      className={`relative border-4 border-ink p-4 transition-all duration-300 sm:p-6 ${
        state === "done" ? "bg-bone/60" : state === "open" ? "pop-in bg-bone shadow-[6px_6px_0_#120c0a]" : "bg-transparent opacity-45"
      }`}
      aria-label={`Step ${n}: ${title}`}
    >
      <div className="flex items-center gap-4">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center border-4 border-ink font-display text-xl ${
            state === "done" ? "bg-ink text-sand" : state === "open" ? "bg-wine text-bone" : "bg-sand"
          }`}
        >
          {state === "done" ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="square" />
            </svg>
          ) : state === "locked" ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" fill="currentColor" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth={3} />
            </svg>
          ) : (
            n
          )}
        </span>
        <h3 className="display text-2xl sm:text-3xl">{title}</h3>
      </div>
      {state === "open" && <div className="mt-4 sm:pl-[60px]">{children}</div>}
      {state === "locked" && <p className="mt-2 text-sm font-bold sm:pl-[60px]">Locked until you finish step {n - 1}.</p>}
    </section>
  );
}

// Link input + verify button for the two X post tasks
function LinkProof({ task, onBusy }: { task: TaskId; onBusy: (b: boolean) => void }) {
  const { task: run } = useSession();
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    onBusy(true);
    setError(null);
    const r = await run({ task, link });
    setBusy(false);
    onBusy(false);
    if (r.error) setError(r.error);
  };

  return (
    <form onSubmit={verify} className="mt-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor={`link-${task}`}>
          Link to your post
        </label>
        <input
          id={`link-${task}`}
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://x.com/you/status/…"
          spellCheck={false}
          className="focus-ink min-w-0 flex-1 border-4 border-ink bg-white px-3 py-2 text-sm"
        />
        <button type="submit" disabled={busy || !link.trim()} className="btn justify-center bg-ink text-sm text-sand disabled:opacity-60">
          <span>{busy ? "The eyes are reading…" : "Verify"}</span>
        </button>
      </div>
      {error && <p className="pop-in mt-2 text-sm font-bold text-wine">{error}</p>}
    </form>
  );
}

function DevConnect() {
  const { devConnect } = useSession();
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await devConnect(handle);
        setError(r.error ?? null);
      }}
      className="mx-auto mt-6 max-w-sm border-4 border-dashed border-ink/40 p-3 text-left"
    >
      <p className="text-xs font-bold opacity-70">Local testing only (X keys not set): type a handle.</p>
      <div className="mt-2 flex gap-2">
        <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@yourhandle" className="focus-ink min-w-0 flex-1 border-4 border-ink bg-white px-3 py-1.5 text-sm" />
        <button className="btn bg-bone text-sm">
          <span>Go</span>
        </button>
      </div>
      {error && <p className="mt-1 text-sm font-bold text-wine">{error}</p>}
    </form>
  );
}

function Application() {
  const { ready, auth, entry, notice, connect, disconnect, task } = useSession();
  const [walletDraft, setWallet] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [carded, setCarded] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const wallet = walletDraft ?? entry?.wallet ?? "";
  const next = entry ? nextTask(entry) : null;
  const count = entry ? TASK_ORDER.filter((t) => entry.done[t]).length : 0;
  const complete = !!entry && isComplete(entry);
  const state = (t: TaskId) => (entry?.done[t] ? "done" : t === next ? "open" : "locked") as "done" | "open" | "locked";

  const mode: EyeMode = verifying ? "scan" : complete ? "wide" : entry?.blocked ? "narrow" : "track";

  const saveWallet = async (e: FormEvent) => {
    e.preventDefault();
    if (!WALLET.test(wallet.trim())) return setWalletError("That isn't a valid EVM address. It starts with 0x followed by 40 characters.");
    setSaving(true);
    const r = await task({ task: "wallet", wallet: wallet.trim() });
    setSaving(false);
    setWalletError(r.error ?? null);
  };

  const quoteText = `I'm trying to become a Head. 👁️👁️\n\n${X_HANDLE}\n\n${entry?.wallet ?? ""}\n\nTagging: @ @`;

  return (
    <section className="relative px-4 pt-32 pb-24 sm:px-8 sm:pt-40 sm:pb-32">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <Morph name="door-whitelist">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/art/pfp-sailor.webp" alt="" className="bob mx-auto mb-4 h-20 w-20 rounded-full border-4 border-ink bg-sand object-cover shadow-[4px_5px_0_#120c0a] sm:h-24 sm:w-24" style={{ ["--r" as string]: "6deg" }} />
          </Morph>
          <p className="mb-2 font-bold uppercase tracking-[0.2em] text-wine">Hard mode</p>
          <Title text="Whitelist" className="text-[clamp(3rem,12vw,9rem)]" />
          <p className="mx-auto mt-4 max-w-lg text-lg font-medium">
            Six steps, in order. Every post gets checked on X. Finishing doesn&rsquo;t guarantee a spot: the eyes still review every application.
          </p>
        </div>

        <div className="relative mx-auto mt-10 overflow-hidden border-4 border-ink bg-sand shadow-[8px_8px_0_#120c0a]" style={{ clipPath: "polygon(0 14%, 100% 0, 100% 86%, 0 100%)" }}>
          <Eyes mode={mode} viewBox="1090 380 760 250" className="block aspect-[760/250] w-full" label="The eyes, watching your application" />
        </div>

        {/* six heads wake up as tasks get done */}
        <div className="mt-8 flex items-end justify-center gap-2 sm:gap-3" aria-label={`${count} of ${TASK_ORDER.length} steps done`}>
          {PROGRESS.map((h, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={h}
              src={`/art/heads/${h}.webp`}
              alt=""
              className={`w-11 rounded-full border-[3px] border-ink transition-all duration-500 sm:w-14 ${i < count ? "pop-in bg-sand" : "translate-y-2 opacity-40 grayscale"}`}
            />
          ))}
        </div>

        {notice && <p className="pop-in mt-6 border-4 border-ink bg-bone px-4 py-2 text-center font-bold">{notice}</p>}

        <div className="mt-8">
          {!ready ? (
            <p className="display text-center text-2xl opacity-50">Loading…</p>
          ) : !entry ? (
            <div className="border-4 border-ink bg-bone p-6 text-center shadow-[6px_6px_0_#120c0a] sm:p-8">
              <h2 className="display text-3xl sm:text-4xl">Step 0: Show your face</h2>
              <p className="mx-auto mt-3 max-w-md font-medium">
                Connect your X to start. We only read your public profile and never post for you.
              </p>
              {auth === "off" ? (
                <p className="display mt-6 text-2xl">Applications open soon. Follow {X_HANDLE} to hear first.</p>
              ) : (
                <button onClick={() => connect("/whitelist")} disabled={auth !== "x"} className="btn mt-6 bg-ink text-lg text-sand disabled:opacity-50">
                  <span className="flex items-center gap-2">
                    <XLogo className="h-5 w-5" /> Connect X
                  </span>
                </button>
              )}
              {auth === "dev" && <DevConnect />}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-4 border-ink bg-ink px-4 py-2 text-sand">
                <p className="font-bold">
                  Applying as <span className="display text-xl text-bone">@{entry.handle}</span>
                </p>
                <button onClick={disconnect} className="focus-ink text-sm font-bold underline decoration-2 underline-offset-2">
                  Disconnect
                </button>
              </div>

              {entry.blocked ? (
                <div className="pop-in mt-5 border-4 border-ink bg-wine p-6 text-center text-bone shadow-[6px_6px_0_#120c0a]">
                  <p className="display text-4xl">Not this account.</p>
                  <p className="mt-2 font-bold">{entry.blocked}</p>
                </div>
              ) : (
                <div className="mt-5 flex flex-col gap-4">
                  <Step n={1} title={`Follow ${X_HANDLE}`} state={state("follow")}>
                    <button
                      onClick={() => {
                        openX(intent("follow", { screen_name: US }));
                        task({ task: "follow" });
                      }}
                      className="btn bg-bone text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <XLogo /> Follow on X
                      </span>
                    </button>
                  </Step>

                  <Step n={2} title="Like and repost the pinned post" state={state("engage")}>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => {
                          openX(PINNED_ID ? intent("like", { tweet_id: PINNED_ID }) : pinned);
                          task({ task: "engage", action: "like" });
                        }}
                        className={`btn text-sm ${entry.liked ? "bg-wine text-bone" : "bg-bone"}`}
                      >
                        <span>♥ {entry.liked ? "Liked" : "Like"}</span>
                      </button>
                      <button
                        onClick={() => {
                          openX(PINNED_ID ? intent("retweet", { tweet_id: PINNED_ID }) : pinned);
                          task({ task: "engage", action: "repost" });
                        }}
                        className={`btn text-sm ${entry.reposted ? "bg-wine text-bone" : "bg-bone"}`}
                      >
                        <span>⟲ {entry.reposted ? "Reposted" : "Repost"}</span>
                      </button>
                      <a href={pinned} target="_blank" rel="noreferrer" className="text-sm font-bold underline">
                        View post
                      </a>
                    </div>
                  </Step>

                  <Step n={3} title={`Reply and tag ${FRIENDS_NEEDED} friends`} state={state("tag")}>
                    <p className="text-sm font-semibold">
                      Reply directly under the pinned post and tag at least {FRIENDS_NEEDED} different friends. Then paste your reply&rsquo;s link. We check it on X.
                    </p>
                    <button onClick={() => openX(pinned)} className="btn mt-3 bg-bone text-sm">
                      <span className="flex items-center gap-2">
                        <XLogo /> Go to pinned post
                      </span>
                    </button>
                    <LinkProof task="tag" onBusy={setVerifying} />
                  </Step>

                  <Step n={4} title="Remember the faces" state={state("memory")}>
                    <MemoryGame onStart={() => task({ task: "memory", action: "start" })} onWin={() => task({ task: "memory", action: "finish" })} />
                  </Step>

                  <Step n={5} title="Add your EVM wallet" state={state("wallet")}>
                    <form onSubmit={saveWallet}>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <label className="sr-only" htmlFor="wallet">
                          Wallet address
                        </label>
                        <input
                          id="wallet"
                          value={wallet}
                          onChange={(e) => setWallet(e.target.value)}
                          placeholder="0x…"
                          spellCheck={false}
                          autoComplete="off"
                          className="focus-ink min-w-0 flex-1 border-4 border-ink bg-white px-3 py-2 font-mono text-sm"
                        />
                        <button type="submit" disabled={saving} className="btn justify-center bg-ink text-sm text-sand disabled:opacity-60">
                          <span>{saving ? "Saving…" : "Save wallet"}</span>
                        </button>
                      </div>
                      {walletError && <p className="pop-in mt-2 text-sm font-bold text-wine">{walletError}</p>}
                      <p className="mt-2 text-xs font-semibold opacity-70">One wallet per account. It goes in your final post, so it can&rsquo;t change after that.</p>
                    </form>
                  </Step>

                  <Step n={6} title="Quote the pinned post" state={state("quote")}>
                    <ol className="list-decimal space-y-1 pl-5 text-sm font-semibold">
                      <li>Download your applicant card.</li>
                      <li>
                        Quote the pinned post with your wallet <span className="font-mono text-xs">{entry.wallet}</span>, tag {X_HANDLE} and {FRIENDS_NEEDED} different friends.
                      </li>
                      <li>Attach the card, post it, then paste the link here.</li>
                    </ol>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button onClick={async () => setCarded(await downloadCard(entry.handle))} className={`btn text-sm ${carded ? "bg-wine text-bone" : "bg-bone"}`}>
                        <span>{carded ? "Card downloaded" : "Download my card"}</span>
                      </button>
                      <button
                        onClick={() => openX(PINNED_POST ? intent("post", { text: quoteText, url: PINNED_POST }) : intent("post", { text: quoteText }))}
                        className="btn bg-ink text-sm text-sand"
                      >
                        <span className="flex items-center gap-2">
                          <XLogo /> Write the quote
                        </span>
                      </button>
                    </div>
                    <LinkProof task="quote" onBusy={setVerifying} />
                  </Step>
                </div>
              )}

              {complete && (
                <div className="pop-in mt-8 border-4 border-ink bg-wine p-6 text-center text-bone shadow-[8px_8px_0_#120c0a] sm:p-8">
                  <p className="display text-4xl sm:text-5xl">Application in, @{entry.handle}.</p>
                  <p className="mx-auto mt-3 max-w-md font-bold">
                    All six steps done. The eyes are reviewing it now. Keep your posts up and watch {X_HANDLE}: that&rsquo;s where the list drops.
                  </p>
                  <a href={X_URL} target="_blank" rel="noreferrer" className="btn mt-5 bg-bone text-sm text-ink">
                    <span className="flex items-center gap-2">
                      <XLogo /> {X_HANDLE}
                    </span>
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export function Apply() {
  return (
    <SessionProvider>
      <Application />
    </SessionProvider>
  );
}
