"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { DevConnect, XLogo } from "../apply/Apply";
import { SessionProvider, useSession } from "../apply/Session";
import { Morph } from "../motion/PageShell";
import { Title } from "../motion/Title";
import { EvoHead } from "./EvoHead";
import { FeedGame } from "./FeedGame";
import { downloadEvoCard } from "@/lib/card";
import { TASK_ORDER, type PublicEntry } from "@/lib/entry";
import { POINTS, STAGES, evoOf, fedToday, gameLeft, liveStreak, nextFeed, nextStage, points, stageFor, untilReset } from "@/lib/evolve";
import { ALL_HEADS } from "@/lib/heads";
import { SITE, X_HANDLE } from "@/lib/site";

const HOST = SITE.url.replace(/^https?:\/\//, "");
const headImg = (id?: string) => ALL_HEADS.find((h) => h.id === id)?.img ?? ALL_HEADS[0].img;
const openX = (text: string) => window.open(`https://x.com/intent/post?${new URLSearchParams({ text })}`, "_blank", "noopener,noreferrer");
const inviteLink = (handle: string) => `${SITE.url}/evolve?ref=${handle}`;

function hoursLeft() {
  const m = Math.ceil(untilReset() / 60_000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

function Card({ title, tag, children, tone = "bg-bone" }: { title: string; tag?: string; children: ReactNode; tone?: string }) {
  return (
    <section className={`border-4 border-ink p-4 shadow-[6px_6px_0_#120c0a] sm:p-6 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="display text-2xl sm:text-3xl">{title}</h3>
        {tag && <span className="chip shrink-0 bg-ink text-xs text-sand">{tag}</span>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

// ---------- pick a head ----------
function PickHead() {
  const { evolve } = useSession();
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const head = ALL_HEADS.find((h) => h.id === chosen);

  return (
    <div className="pop-in border-4 border-ink bg-bone p-5 shadow-[6px_6px_0_#120c0a] sm:p-8">
      <h2 className="display text-center text-3xl sm:text-4xl">Pick your head</h2>
      <p className="mx-auto mt-2 max-w-md text-center font-medium">It starts asleep. Feed it, play with it, show it off, and it evolves. You only get one, so choose well.</p>
      <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-5">
        {ALL_HEADS.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => setChosen(h.id)}
            aria-pressed={chosen === h.id}
            className={`focus-ink rounded-full transition-transform duration-200 ${chosen === h.id ? "scale-110 -rotate-6" : "hover:scale-105"}`}
          >
            <EvoHead img={h.img} stage={chosen === h.id ? 2 : 1} small className="w-full" />
            <span className="mt-1 block text-xs font-bold">{h.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-6 text-center">
        {head && (
          <p className="mb-3 font-semibold">
            <span className="display">{head.name}</span>: &ldquo;{head.line}&rdquo;
          </p>
        )}
        <button
          type="button"
          disabled={!chosen || busy}
          onClick={async () => {
            setBusy(true);
            const r = await evolve({ action: "pick", head: chosen });
            setBusy(false);
            setError(r.error ?? null);
          }}
          className="btn bg-wine text-lg text-bone disabled:opacity-50"
        >
          <span>{busy ? "Waking it…" : head ? `This one: ${head.name}` : "Choose a head"}</span>
        </button>
        {error && <p className="mt-2 text-sm font-bold text-wine">{error}</p>}
      </div>
    </div>
  );
}

// ---------- the lab ----------
function ShareStage({ entry, stage }: { entry: PublicEntry; stage: (typeof STAGES)[number] }) {
  const { evolve } = useSession();
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [carded, setCarded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const evo = evoOf(entry);
  const total = points(entry).total;

  if (evo.shared?.includes(stage.n)) {
    return <p className="font-semibold">Stage {stage.n} shared. Reach the next stage to share again for another +{POINTS.share}.</p>;
  }

  const text = `My head just hit Stage ${stage.n}: ${stage.name} 👁️👁️\n\n${X_HANDLE} heads are evolving before the free mint. Feed yours 👇\n${HOST}/evolve?ref=${entry.handle}`;
  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await evolve({ action: "share", link });
    setBusy(false);
    setError(r.error ?? null);
    if (!r.error) setLink("");
  };

  return (
    <div>
      <p className="text-sm font-semibold">Post your Stage {stage.n} card tagging {X_HANDLE}, then paste the link. Once per stage.</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={async () => setCarded(await downloadEvoCard({ handle: entry.handle, img: headImg(evo.head), stage: stage.n, name: stage.name, points: total, site: `${HOST}/evolve` }))}
          className={`btn text-sm ${carded ? "bg-wine text-bone" : "bg-bone"}`}
        >
          <span>{carded ? "Card downloaded" : "Download card"}</span>
        </button>
        <button type="button" onClick={() => openX(text)} className="btn bg-ink text-sm text-sand">
          <span className="flex items-center gap-2">
            <XLogo /> Write the post
          </span>
        </button>
      </div>
      <form onSubmit={verify} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="share-link">
          Link to your post
        </label>
        <input
          id="share-link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://x.com/you/status/…"
          spellCheck={false}
          className="focus-ink min-w-0 flex-1 border-4 border-ink bg-white px-3 py-2 text-sm"
        />
        <button type="submit" disabled={busy || !link.trim()} className="btn justify-center bg-ink text-sm text-sand disabled:opacity-60">
          <span>{busy ? "The eyes are reading…" : "Verify"}</span>
        </button>
      </form>
      {error && <p className="pop-in mt-2 text-sm font-bold text-wine">{error}</p>}
    </div>
  );
}

function Lab({ entry, onGain }: { entry: PublicEntry; onGain: () => void }) {
  const { evolve } = useSession();
  const [gain, setGain] = useState<{ n: number; key: number } | null>(null);
  const [feeding, setFeeding] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const ticket = useRef<string | undefined>(undefined);

  const evo = evoOf(entry);
  const p = points(entry);
  const stage = stageFor(p.total);
  const next = nextStage(stage);
  const head = ALL_HEADS.find((h) => h.id === evo.head) ?? ALL_HEADS[0];
  const pct = next ? ((p.total - stage.min) / (next.min - stage.min)) * 100 : 100;
  const fed = fedToday(evo);
  const streak = liveStreak(evo);
  const upcoming = nextFeed(evo);
  const steps = TASK_ORDER.filter((t) => entry.done[t]).length;
  const invites = entry.refs?.length ?? 0;

  const pop = (n?: number) => {
    if (!n) return;
    setGain({ n, key: Date.now() });
    onGain();
  };

  const feed = async () => {
    setFeeding(true);
    const r = await evolve({ action: "feed" });
    setFeeding(false);
    setFeedError(r.error ?? null);
    pop(r.gained);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
      {/* the head */}
      <div className="border-4 border-ink bg-sand p-5 text-center shadow-[8px_8px_0_#120c0a] sm:p-8 lg:sticky lg:top-6">
        <p className="font-bold uppercase tracking-[0.2em] text-wine">
          Stage {stage.n} of {STAGES.length}
        </p>
        <h2 className="display mt-1 text-5xl sm:text-6xl">{stage.name}</h2>
        <div className="relative mx-auto my-10 w-48 text-3xl sm:w-60">
          <EvoHead img={head.img} stage={stage.n} className="w-full" label={`${head.name} at stage ${stage.n}, ${stage.name}`} />
          {gain && (
            <span key={gain.key} className="evo-gain display pointer-events-none absolute -top-6 left-1/2 z-10 -translate-x-1/2 text-4xl text-wine" aria-live="polite">
              +{gain.n}
            </span>
          )}
        </div>
        <p className="font-semibold">
          <span className="display">{head.name}</span> · &ldquo;{stage.line}&rdquo;
        </p>

        <div className="mt-6 text-left">
          <div className="flex items-baseline justify-between font-bold">
            <span className="display text-2xl">{p.total} pts</span>
            <span className="text-sm">{next ? `${next.min - p.total} to ${next.name}` : "Fully evolved"}</span>
          </div>
          <div className="mt-2 h-5 -skew-x-12 border-4 border-ink bg-bone" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Progress to next stage">
            <div className="h-full bg-wine transition-[width] duration-700" style={{ width: `${Math.max(pct, 2)}%` }} />
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-sm font-bold">
            <div className="border-[3px] border-ink bg-bone p-2">
              <dt className="opacity-70">Whitelist</dt>
              <dd className="display text-xl">{p.tasks}</dd>
            </div>
            <div className="border-[3px] border-ink bg-bone p-2">
              <dt className="opacity-70">Feed &amp; play</dt>
              <dd className="display text-xl">{p.xp}</dd>
            </div>
            <div className="border-[3px] border-ink bg-bone p-2">
              <dt className="opacity-70">Invites</dt>
              <dd className="display text-xl">{p.invites}</dd>
            </div>
          </dl>
        </div>

        {/* every stage */}
        <ol className="mt-6 flex items-end justify-between gap-1">
          {STAGES.map((s) => (
            <li key={s.n} className={`flex w-1/5 flex-col items-center text-[0.65rem] font-bold uppercase ${s.n > stage.n ? "opacity-35" : ""}`}>
              <EvoHead img={head.img} stage={s.n} small className="w-full max-w-14" />
              <span className="mt-1">{s.name}</span>
              <span className="opacity-60">{s.min}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* ways to evolve */}
      <div className="flex flex-col gap-5">
        <Card title="Daily feed" tag={streak ? `🔥 ${streak} day streak` : undefined}>
          {fed ? (
            <p className="font-semibold">Fed for today. It gets hungry again in {hoursLeft()}. Come back to keep the streak.</p>
          ) : (
            <>
              <p className="text-sm font-semibold">
                Once a day. Every day in a row adds +{POINTS.streakStep}, up to +{POINTS.streakStep * POINTS.streakMax}. Miss a day and the streak resets.
              </p>
              <button type="button" onClick={feed} disabled={feeding} className="btn mt-3 bg-wine text-bone disabled:opacity-60">
                <span>{feeding ? "Feeding…" : `Feed it (+${upcoming.reward})`}</span>
              </button>
            </>
          )}
          {feedError && <p className="mt-2 text-sm font-bold text-wine">{feedError}</p>}
        </Card>

        <Card title="Feed the Head" tag={evo.best ? `Best ${evo.best}` : undefined}>
          <FeedGame
            img={head.img}
            left={gameLeft(evo)}
            onStart={async () => {
              const r = await evolve({ action: "start" });
              ticket.current = r.ticket;
              return r;
            }}
            onFinish={async (score) => {
              const r = await evolve({ action: "finish", score, ticket: ticket.current });
              pop(r.gained);
              return r;
            }}
          />
        </Card>

        <Card title="Show it off" tag={`+${POINTS.share} per stage`}>
          <ShareStage entry={entry} stage={stage} />
        </Card>

        <Card title="Bring heads" tag={`${invites} joined`}>
          <p className="text-sm font-semibold">
            +{POINTS.referral} for every friend who signs up with your link and finishes the whitelist (up to {POINTS.referralMax}).
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input readOnly value={inviteLink(entry.handle)} onFocus={(e) => e.target.select()} aria-label="Your invite link" className="focus-ink min-w-0 flex-1 border-4 border-ink bg-white px-3 py-2 font-mono text-xs" />
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(inviteLink(entry.handle));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                } catch {}
              }}
              className="btn justify-center bg-bone text-sm"
            >
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => openX(`My ${X_HANDLE} head is evolving 👁️👁️\n\nGet yours before the free mint 👇\n${HOST}/evolve?ref=${entry.handle}`)}
            className="btn mt-3 bg-ink text-sm text-sand"
          >
            <span className="flex items-center gap-2">
              <XLogo /> Post your invite
            </span>
          </button>
        </Card>

        <Card title="Whitelist steps" tag={`${steps}/${TASK_ORDER.length}`}>
          <p className="text-sm font-semibold">
            Each whitelist step is worth +{POINTS.task}. {steps === TASK_ORDER.length ? "All done." : `${TASK_ORDER.length - steps} left.`}
          </p>
          {steps < TASK_ORDER.length && (
            <Link href="/whitelist" className="btn mt-3 bg-bone text-sm">
              <span>Go to the whitelist</span>
            </Link>
          )}
        </Card>
      </div>
    </div>
  );
}

// ---------- leaderboard ----------
type Row = { handle: string; head: string; points: number; stage: number };

function Board({ refresh, me }: { refresh: number; me?: string }) {
  const [data, setData] = useState<{ board: Row[]; heads: number; rank: number | null } | null>(null);
  const load = useCallback(() => {
    fetch("/api/evolve")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);
  useEffect(() => load(), [load, refresh]);

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Title as="h2" text="Most evolved" className="text-[clamp(2.2rem,6vw,4.5rem)]" />
        {data?.rank && (
          <p className="chip bg-wine text-sm text-bone">
            <span className="inline-block skew-x-[9deg]">
              You&rsquo;re #{data.rank} of {data.heads}
            </span>
          </p>
        )}
      </div>
      <div className="mt-6 border-4 border-ink bg-bone shadow-[6px_6px_0_#120c0a]">
        {!data ? (
          <p className="p-6 text-center font-bold opacity-60">Counting heads…</p>
        ) : !data.board.length ? (
          <p className="p-6 text-center font-bold">No heads yet. Be the first one awake.</p>
        ) : (
          <ol>
            {data.board.map((r, i) => (
              <li
                key={r.handle}
                className={`flex items-center gap-3 border-b-[3px] border-ink/15 px-3 py-2 last:border-0 sm:gap-4 sm:px-5 ${r.handle.toLowerCase() === me?.toLowerCase() ? "bg-sand" : ""}`}
              >
                <span className="display w-8 shrink-0 text-xl">{i + 1}</span>
                <EvoHead img={headImg(r.head)} stage={r.stage} small className="w-10 shrink-0" />
                <span className="min-w-0 flex-1 truncate font-bold">@{r.handle}</span>
                <span className="hidden text-sm font-bold uppercase opacity-70 sm:inline">{STAGES[r.stage - 1]?.name}</span>
                <span className="display shrink-0 text-lg">{r.points}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

// ---------- page ----------
function EvolvePage() {
  const { ready, auth, entry, notice, connect, disconnect } = useSession();
  const [refresh, setRefresh] = useState(0);
  const evo = entry ? evoOf(entry) : null;
  const stage = entry ? stageFor(points(entry).total) : null;

  return (
    <section className="relative px-4 pt-32 pb-24 sm:px-8 sm:pt-40 sm:pb-32">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <Morph name="door-evolve">
            <div className="bob mx-auto mb-4 w-20 text-base sm:w-24" style={{ ["--r" as string]: "-6deg" }}>
              <EvoHead img={evo?.head ? headImg(evo.head) : "/art/heads/smug.webp"} stage={stage?.n ?? 4} small className="w-full" />
            </div>
          </Morph>
          <p className="mb-2 font-bold uppercase tracking-[0.2em] text-wine">New evolution</p>
          <Title text="Evolve" className="text-[clamp(3rem,12vw,9rem)]" />
          <p className="mx-auto mt-4 max-w-xl text-lg font-medium">
            Every head starts asleep. Feed it daily, play Feed the Head, show it off and bring friends. Five stages, from Dormant to Evolved. The most evolved heads get seen first when the whitelist is reviewed.
          </p>
        </div>

        {notice && <p className="pop-in mx-auto mt-6 max-w-3xl border-4 border-ink bg-bone px-4 py-2 text-center font-bold">{notice}</p>}

        <div className="mt-10">
          {!ready ? (
            <p className="display text-center text-2xl opacity-50">Loading…</p>
          ) : !entry ? (
            <div className="mx-auto max-w-3xl border-4 border-ink bg-bone p-6 text-center shadow-[6px_6px_0_#120c0a] sm:p-8">
              <h2 className="display text-3xl sm:text-4xl">Wake a head</h2>
              <p className="mx-auto mt-3 max-w-md font-medium">Connect your X to get your head. We only read your public profile and never post for you.</p>
              {auth === "off" ? (
                <p className="display mt-6 text-2xl">Evolution opens soon. Follow {X_HANDLE} to hear first.</p>
              ) : (
                <button onClick={() => connect("/evolve")} disabled={auth !== "x"} className="btn mt-6 bg-ink text-lg text-sand disabled:opacity-50">
                  <span className="flex items-center gap-2">
                    <XLogo className="h-5 w-5" /> Connect X
                  </span>
                </button>
              )}
              {auth === "dev" && <DevConnect />}
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-4 border-ink bg-ink px-4 py-2 text-sand">
                <p className="font-bold">
                  Evolving as <span className="display text-xl text-bone">@{entry.handle}</span>
                </p>
                <button onClick={disconnect} className="focus-ink text-sm font-bold underline decoration-2 underline-offset-2">
                  Disconnect
                </button>
              </div>
              {entry.blocked ? (
                <div className="pop-in border-4 border-ink bg-wine p-6 text-center text-bone shadow-[6px_6px_0_#120c0a]">
                  <p className="display text-4xl">Not this account.</p>
                  <p className="mt-2 font-bold">{entry.blocked}</p>
                </div>
              ) : !evo?.head ? (
                <PickHead />
              ) : (
                <Lab entry={entry} onGain={() => setRefresh((n) => n + 1)} />
              )}
            </>
          )}
        </div>

        <Board refresh={refresh} me={entry?.handle} />
      </div>
    </section>
  );
}

export function Evolve() {
  return (
    <SessionProvider>
      <EvolvePage />
    </SessionProvider>
  );
}
