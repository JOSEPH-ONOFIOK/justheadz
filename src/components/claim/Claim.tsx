"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DevConnect, XLogo } from "../apply/Apply";
import { SessionProvider, useSession } from "../apply/Session";
import { Morph } from "../motion/PageShell";
import { Title } from "../motion/Title";
import { ALL_COMMUNITIES, CHAIN_NAMES, CLAIM_POST, CLAIM_POST_ID, PHASES, claimReplyText, CLAIM_ENDS, shownCap, spotsOf, type Claim, type ClaimStats } from "@/lib/claim";
import { SITE, WALLET, X_HANDLE, X_URL } from "@/lib/site";

const US = X_HANDLE.slice(1);
const HOST = SITE.url.replace(/^https?:\/\//, "");
const openX = (url: string) => window.open(url, "_blank", "noopener,noreferrer");
const intent = (path: string, params: Record<string, string>) => `https://x.com/intent/${path}?${new URLSearchParams(params)}`;
const claimPost = CLAIM_POST || X_URL;
const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
const logoOf = (name?: string) => ALL_COMMUNITIES.find((c) => c.name === name)?.logo;

// Wallet first, then the X tasks
const STEPS = ["Wallet", "Follow", "Like + repost", "Reply"] as const;
const stepOf = (c: Claim) => (!c.community ? 0 : !c.followed ? 1 : !c.liked || !c.reposted ? 2 : 3);

// ---------- step 1: wallet ----------
function WalletStep({ claim, onError }: { claim: Claim; onError: (e: string | null) => void }) {
  const { claim: run } = useSession();
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");

  const check = async (e: FormEvent) => {
    e.preventDefault();
    const wallet = typed.trim();
    if (!WALLET.test(wallet)) return onError("That isn't a valid EVM address. It starts with 0x followed by 40 characters.");
    onError(null);
    setBusy(true);
    const r = await run({ step: "wallet", wallet });
    setBusy(false);
    onError(r.error ?? null);
  };

  return (
    <div>
      <p className="font-semibold">Paste the wallet that holds your NFT. That&rsquo;s the wallet that mints. No connecting, no signing.</p>
      {claim.wallet && !claim.community && <p className="mt-2 text-sm font-bold">Last checked: {short(claim.wallet)}</p>}
      <form onSubmit={check} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="claim-typed">
          Wallet address
        </label>
        <input
          id="claim-typed"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="0x…"
          spellCheck={false}
          autoComplete="off"
          className="focus-ink min-w-0 flex-1 border-4 border-ink bg-white px-3 py-2 font-mono text-sm"
        />
        <button type="submit" disabled={busy || !typed.trim()} className="btn justify-center bg-ink text-sm text-sand disabled:opacity-60">
          <span>{busy ? "Reading the chain…" : "Check wallet"}</span>
        </button>
      </form>
    </div>
  );
}

// ---------- countdown (display only: the claim doesn't close on it) ----------
function Countdown() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Date.parse(CLAIM_ENDS) - Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  if (left === null) return <p className="display mt-3 text-2xl tabular-nums sm:text-3xl">&nbsp;</p>;
  if (left <= 0) return <p className="display mt-3 text-2xl sm:text-3xl">Claim closing any minute</p>;
  const s = Math.floor(left / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <p className="display mt-3 text-2xl tabular-nums sm:text-3xl" aria-live="off">
      Claim ends in {pad(Math.floor(s / 3600))}h {pad(Math.floor((s % 3600) / 60))}m {pad(s % 60)}s
    </p>
  );
}

// ---------- step 1: follow, notifications on ----------
export function NotisBanner({ className = "" }: { className?: string }) {
  return (
    <p className={`display flex items-center gap-3 border-4 border-ink bg-wine px-4 py-3 text-xl leading-tight text-bone shadow-[4px_4px_0_#120c0a] sm:text-2xl ${className}`}>
      <span aria-hidden="true" className="text-3xl">
        🔔
      </span>
      <span>Turn on notis. Spots drop on X first.</span>
    </p>
  );
}

function FollowStep({ onError }: { onError: (e: string | null) => void }) {
  const { claim: run } = useSession();
  return (
    <div>
      <NotisBanner />
      <ol className="mt-4 list-decimal space-y-1 pl-5 font-semibold">
        <li>Follow {X_HANDLE}.</li>
        <li>
          On our profile, tap the <b>bell 🔔</b> and choose <b>All posts</b>.
        </li>
      </ol>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            openX(intent("follow", { screen_name: US }));
            run({ step: "follow" }).then((r) => onError(r.error ?? null));
          }}
          className="btn bg-ink text-sand"
        >
          <span className="flex items-center gap-2">
            <XLogo /> Follow + turn on notis
          </span>
        </button>
        <a href={X_URL} target="_blank" rel="noreferrer" className="btn bg-bone text-sm">
          <span>Open profile for the 🔔</span>
        </a>
      </div>
    </div>
  );
}

// ---------- step 4: reply ----------
function ReplyStep({ claim, onError }: { claim: Claim; onError: (e: string | null) => void }) {
  const { claim: run } = useSession();
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const text = `${claimReplyText(claim.community ?? "")}\n${HOST}/claim`;

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    onError(null);
    const r = await run({ step: "reply", link });
    setBusy(false);
    onError(r.error ?? null);
  };

  return (
    <div>
      <p className="font-semibold">
        {CLAIM_POST_ID ? "Reply under the claim post" : `Post on X tagging ${X_HANDLE}`} to say you&rsquo;re in, then paste the link. The eyes check it on X.
      </p>
      <button
        type="button"
        onClick={() => openX(CLAIM_POST_ID ? intent("post", { text, in_reply_to: CLAIM_POST_ID }) : intent("post", { text }))}
        className="btn mt-4 bg-ink text-sm text-sand"
      >
        <span className="flex items-center gap-2">
          <XLogo /> Write the reply
        </span>
      </button>
      <form onSubmit={verify} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="claim-reply">
          Link to your reply
        </label>
        <input
          id="claim-reply"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://x.com/you/status/…"
          spellCheck={false}
          className="focus-ink min-w-0 flex-1 border-4 border-ink bg-white px-3 py-2 text-sm"
        />
        <button type="submit" disabled={busy || !link.trim()} className="btn justify-center bg-wine text-sm text-bone disabled:opacity-60">
          <span>{busy ? "Checking + locking…" : "Verify + lock"}</span>
        </button>
      </form>
    </div>
  );
}

// ---------- the locked stub ----------
function Stub({ claim, handle }: { claim: Claim; handle: string }) {
  const logo = logoOf(claim.community);
  const share = `Locked my ${X_HANDLE} free mint spot as a ${claim.community} holder 👁️👁️\n\nHolders of the right heads claim free 👇\n${HOST}/claim`;
  return (
    <div className="claim-stub pop-in relative mx-auto max-w-2xl bg-ink text-sand shadow-[10px_10px_0_#ad3557]">
      <div className="grid gap-0 sm:grid-cols-[1fr_auto]">
        <div className="p-6 sm:p-8">
          <p className="font-bold uppercase tracking-[0.3em] text-wine">Admit one head</p>
          <p className="display mt-2 text-6xl leading-none sm:text-7xl">Phase {claim.phase}</p>
          <p className="mt-1 font-bold">Spot locked for @{handle}</p>
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="opacity-60">Community</dt>
            <dd className="font-bold">{claim.community}</dd>
            <dt className="opacity-60">Mint wallet</dt>
            <dd className="font-mono font-bold">{short(claim.wallet)}</dd>
            {claim.via && (
              <>
                <dt className="opacity-60">Vault (delegated)</dt>
                <dd className="font-mono font-bold">{short(claim.via)}</dd>
              </>
            )}
            <dt className="opacity-60">Proof</dt>
            <dd className="font-bold">{claim.signed ? "Signed by the wallet" : "Typed (connect to make it permanent)"}</dd>
            <dt className="opacity-60">Locked</dt>
            <dd className="font-bold">{claim.claimedAt ? new Date(claim.claimedAt).toLocaleString() : ""}</dd>
          </dl>
        </div>
        <div className="claim-perf flex items-center justify-center gap-4 border-t-4 border-dashed border-sand/30 p-6 sm:flex-col sm:border-t-0 sm:border-l-4">
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-24 w-24 -rotate-6 rounded-full border-4 border-sand bg-bone object-cover" />
          )}
          <span className="display text-5xl text-wine">#{claim.phase}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 border-t-4 border-sand/20 p-4 sm:px-8">
        <button type="button" onClick={() => openX(intent("post", { text: share }))} className="btn bg-sand text-sm text-ink">
          <span className="flex items-center gap-2">
            <XLogo /> Flex it
          </span>
        </button>
        <a href="/evolve" className="btn bg-violet text-sm text-bone">
          <span>Evolve your head</span>
        </a>
      </div>
    </div>
  );
}

// ---------- the claim flow ----------
function Flow() {
  const { ready, auth, entry, notice, connect, disconnect, claim: run } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [rewallet, setRewallet] = useState(false);
  const c: Claim = entry?.claim ?? {};
  const step = rewallet ? 0 : stepOf(c);
  const done = !!c.claimedAt;

  if (!ready) return <p className="display text-center text-2xl opacity-50">Loading…</p>;

  if (!entry)
    return (
      <div className="border-4 border-ink bg-bone p-6 text-center shadow-[6px_6px_0_#120c0a] sm:p-8">
        <h2 className="display text-3xl sm:text-4xl">First, your face</h2>
        <p className="mx-auto mt-3 max-w-md font-medium">Connect X so we know whose spot this is. We only read your public profile and never post for you.</p>
        {auth === "off" ? (
          <p className="display mt-6 text-2xl">The claim opens soon. Follow {X_HANDLE} to hear first.</p>
        ) : (
          <button onClick={() => connect("/claim")} disabled={auth !== "x"} className="btn mt-6 bg-ink text-lg text-sand disabled:opacity-50">
            <span className="flex items-center gap-2">
              <XLogo className="h-5 w-5" /> Connect X
            </span>
          </button>
        )}
        {auth === "dev" && <DevConnect />}
      </div>
    );

  return (
    <div>
      {notice && <p className="pop-in mb-4 border-4 border-ink bg-bone px-4 py-2 text-center font-bold">{notice}</p>}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-4 border-ink bg-ink px-4 py-2 text-sand">
        <p className="font-bold">
          Claiming as <span className="display text-xl text-bone">@{entry.handle}</span>
        </p>
        <button onClick={disconnect} className="focus-ink text-sm font-bold underline decoration-2 underline-offset-2">
          Disconnect
        </button>
      </div>

      {entry.blocked ? (
        <div className="border-4 border-ink bg-wine p-6 text-center text-bone">
          <p className="display text-4xl">Not this account.</p>
          <p className="mt-2 font-bold">{entry.blocked}</p>
        </div>
      ) : done ? (
        <Stub claim={c} handle={entry.handle} />
      ) : (
        <div className="border-4 border-ink bg-bone shadow-[8px_8px_0_#120c0a]">
          {c.lostTo && (
            <p className="border-b-4 border-ink bg-wine px-4 py-3 text-sm font-bold text-bone sm:px-6">
              The owner of {short(c.wallet)} connected it and claimed (@{c.lostTo}), so your typed claim was released. Claim again with a wallet you own: your X steps are kept.
            </p>
          )}
          {/* progress strip */}
          <ol className="grid grid-cols-4 border-b-4 border-ink" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((s, i) => (
              <li
                key={s}
                className={`flex flex-col items-center gap-1 border-ink px-1 py-3 text-center text-[0.65rem] font-bold uppercase sm:flex-row sm:justify-center sm:gap-2 sm:text-xs ${i ? "border-l-4" : ""} ${
                  i < step ? "bg-ink text-sand" : i === step ? "bg-wine text-bone" : "opacity-50"
                }`}
                aria-current={i === step ? "step" : undefined}
              >
                <span className="display text-lg leading-none sm:text-xl">{i < step ? "✓" : i + 1}</span>
                {s}
              </li>
            ))}
          </ol>

          {c.community && (
            <div className="flex items-center gap-3 border-b-4 border-ink bg-sand px-4 py-3 sm:px-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logoOf(c.community) && <img src={logoOf(c.community)} alt="" className="h-10 w-10 rounded-full border-[3px] border-ink object-cover" />}
              <p className="text-sm font-bold">
                {c.community} found{c.via ? ` in vault ${short(c.via)}` : ""}. You&rsquo;re in line for <span className="display text-base">Phase {c.phase}</span>.{" "}
                <button type="button" onClick={() => setRewallet((v) => !v)} className="focus-ink underline decoration-2 underline-offset-2">
                  {rewallet ? "Keep this one" : "Use another wallet"}
                </button>
              </p>
            </div>
          )}

          <div className="p-5 sm:p-8">
            <h3 className="display mb-3 text-3xl sm:text-4xl">{["Prove the bag", `Follow ${X_HANDLE}`, "Like and repost", "Say it out loud"][step]}</h3>
            {step === 1 && <FollowStep onError={setError} />}
            {step === 0 && (
              <WalletStep
                claim={c}
                onError={(e) => {
                  setError(e);
                  if (!e) setRewallet(false);
                }}
              />
            )}
            {step === 2 && (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    openX(CLAIM_POST_ID ? intent("like", { tweet_id: CLAIM_POST_ID }) : claimPost);
                    run({ step: "engage", action: "like" }).then((r) => setError(r.error ?? null));
                  }}
                  className={`btn text-sm ${c.liked ? "bg-wine text-bone" : "bg-bone"}`}
                >
                  <span>♥ {c.liked ? "Liked" : "Like"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openX(CLAIM_POST_ID ? intent("retweet", { tweet_id: CLAIM_POST_ID }) : claimPost);
                    run({ step: "engage", action: "repost" }).then((r) => setError(r.error ?? null));
                  }}
                  className={`btn text-sm ${c.reposted ? "bg-wine text-bone" : "bg-bone"}`}
                >
                  <span>⟲ {c.reposted ? "Reposted" : "Repost"}</span>
                </button>
                <a href={claimPost} target="_blank" rel="noreferrer" className="text-sm font-bold underline">
                  View the claim post
                </a>
              </div>
            )}
            {step === 3 && <ReplyStep claim={c} onError={setError} />}
            {error && <p className="pop-in mt-4 border-l-8 border-wine bg-wine/10 px-3 py-2 text-sm font-bold text-wine">{error}</p>}
            {step === 3 && c.replyLink && !done && (
              <button type="button" onClick={() => run({ step: "confirm" }).then((r) => setError(r.error ?? null))} className="btn mt-4 bg-bone text-sm">
                <span>Try locking again</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- who's eligible ----------
function Phases() {
  const [stats, setStats] = useState<ClaimStats | null>(null);
  useEffect(() => {
    fetch("/api/claim")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);
  const claimed = stats?.claimed ?? 0;
  const cap = shownCap(claimed);
  const pct = Math.min(100, (claimed / cap) * 100);

  return (
    <section className="mt-20">
      <p className="mb-2 font-bold uppercase tracking-[0.2em] text-wine">Who gets in</p>
      <Title as="h2" text="Two phases" className="text-[clamp(2.4rem,7vw,5.5rem)]" />

      {/* every spot, both phases: out of the shown total (1,800, then +100 each time it's reached) */}
      <div className="mt-6 border-4 border-ink bg-bone p-4 shadow-[6px_6px_0_#120c0a] sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="display text-2xl sm:text-3xl">
            {stats ? claimed.toLocaleString("en-US") : "…"} <span className="opacity-40">/ {cap.toLocaleString("en-US")}</span>
          </p>
          <p className="text-sm font-bold uppercase">{claimed >= cap ? "All spots claimed" : `${(cap - claimed).toLocaleString("en-US")} spots left`}</p>
        </div>
        <div className="mt-2 h-6 -skew-x-12 border-4 border-ink bg-sand" role="progressbar" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={claimed} aria-label="Spots claimed">
          <div className="hatch-move h-full bg-wine [background-image:repeating-linear-gradient(-62deg,rgba(255,243,223,0.25)_0_6px,transparent_6px_14px)] transition-[width] duration-700" style={{ width: `${Math.max(pct, claimed ? 1 : 0)}%` }} />
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {PHASES.map((p) => (
          <article key={p.n} className={`relative border-4 border-ink p-5 shadow-[8px_8px_0_#120c0a] sm:p-7 ${p.n === 1 ? "bg-wine text-bone" : "bg-violet text-bone"}`}>
            <span className="display pointer-events-none absolute -top-8 right-4 text-[7rem] leading-none text-ink/25 select-none sm:text-[9rem]" aria-hidden="true">
              {p.n}
            </span>
            <div className="relative flex flex-wrap items-center gap-3">
              <h3 className="display text-4xl sm:text-5xl">{p.name}</h3>
              <span className="chip bg-ink text-xs text-sand">
                <span className="inline-block skew-x-[9deg]">Free mint</span>
              </span>
              <span className={`chip text-xs ${p.status === "live" ? "bg-sand text-ink" : "bg-ink text-sand"}`}>
                <span className="inline-block skew-x-[9deg]">{p.status === "live" ? "Claiming now" : p.status === "soon" ? "Opens soon" : "Closed"}</span>
              </span>
            </div>
            <p className="relative mt-2 font-semibold">{p.blurb}</p>
            <p className="relative mt-1 text-sm font-bold opacity-80">
              {p.n === 2 && stats ? `${Math.max(0, PHASES[1].communities.reduce((n, c) => n + spotsOf(c.name), 0) - (stats.byPhase[2] ?? 0)).toLocaleString("en-US")} spots left` : "\u00a0"}

            </p>
            <ul className="relative mt-5 grid gap-x-4 gap-y-2 sm:grid-cols-2">
              {p.communities.map((c, i) => {
                const off = !c.contracts.length;
                return (
                  <li key={c.name} className="flex items-center gap-3 border-b-2 border-ink/25 py-1.5" title={`${c.name} · ${CHAIN_NAMES[c.chain]}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.logo}
                      alt=""
                      loading="lazy"
                      className={`claim-logo aspect-square w-10 shrink-0 rounded-full border-[3px] border-ink bg-bone object-cover shadow-[2px_2px_0_#120c0a] ${off ? "opacity-50 grayscale" : ""}`}
                      style={{ ["--r" as string]: `${((i * 37) % 13) - 6}deg` }}
                    />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-sm font-bold">{c.name}</span>
                      <span className="block text-[0.65rem] font-bold uppercase opacity-70">{off ? "Checking soon" : CHAIN_NAMES[c.chain]}</span>
                    </span>
                    {stats && (
                      <span className="shrink-0 text-right leading-tight">
                        <span className="display block text-lg tabular-nums">{Math.max(0, spotsOf(c.name) - (stats.byCommunity[c.name] ?? 0)).toLocaleString("en-US")}</span>
                        <span className="block text-[0.6rem] font-bold uppercase opacity-70">left</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}


export function ClaimPage() {
  return (
    <SessionProvider>
      <section className="relative px-4 pt-32 pb-24 sm:px-8 sm:pt-40 sm:pb-32">
        <div className="mx-auto max-w-5xl">
          <div className="pop-in mb-10 -rotate-1 border-4 border-ink bg-wine px-4 py-4 text-center text-bone shadow-[6px_6px_0_#120c0a] sm:px-8 sm:py-5" role="note">
            <p className="display text-[clamp(1.4rem,4.2vw,2.6rem)] leading-tight">Spots are limited and can be filled anytime.</p>
            <p className="display mt-1 text-[clamp(1rem,2.6vw,1.5rem)] text-sand">Grab a head while you can.</p>
            <Countdown />
          </div>
          <div className="text-center">
            <Morph name="door-claim">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/art/pfp-captain.webp" alt="" className="bob mx-auto mb-4 h-20 w-20 rounded-full border-4 border-ink bg-sand object-cover shadow-[4px_5px_0_#120c0a] sm:h-24 sm:w-24" style={{ ["--r" as string]: "-5deg" }} />
            </Morph>
            <p className="mb-2 font-bold uppercase tracking-[0.2em] text-wine">Holder claim</p>
            <Title text="Claim" className="text-[clamp(3rem,12vw,9rem)]" />
            <p className="mx-auto mt-4 max-w-xl text-lg font-medium">
              Hold one of the communities below? You get a free mint spot. Paste your wallet, follow with notis on, like, repost and reply, and it&rsquo;s locked. Both phases are free.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-3xl">
            <Flow />
          </div>
          <Phases />
        </div>
      </section>
    </SessionProvider>
  );
}
