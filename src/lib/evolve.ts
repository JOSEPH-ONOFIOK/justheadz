// Head evolution: the rules shared by the API and the UI.
// Points come from the whitelist steps, the daily feed, the Feed the Head game,
// sharing each new stage on X and invites who finish the whitelist.

export type Evo = {
  head?: string; // id from ALL_HEADS, picked once
  xp: number; // from feeding, the game and shares
  streak: number; // days fed in a row
  lastFeed?: string; // UTC day, "2026-11-19"
  gameDay?: string; // the day gamePts counts for
  gamePts?: number; // game points earned on gameDay
  gameLast?: number; // start time of the last game counted, so a ticket works once
  best?: number; // best game score
  shared?: number[]; // stages already shared on X
  shareLinks?: string[];
};

export const POINTS = {
  task: 20, // each whitelist step
  feed: 10, // daily feed, plus the streak bonus
  streakStep: 3, // extra per day of streak
  streakMax: 7, // the bonus stops growing after a week
  gameDaily: 40, // most the game can earn in a day
  share: 30, // sharing a stage you reached, once per stage
  referral: 50, // each invite who finishes the whitelist
  referralMax: 20, // invites that count
};

export const GAME = { seconds: 30, lives: 3, minMs: 8_000, maxPerSec: 6 };

export const STAGES = [
  { n: 1, name: "Dormant", min: 0, line: "Eyes shut. Barely a head." },
  { n: 2, name: "Awake", min: 60, line: "Something in there just blinked." },
  { n: 3, name: "Seeing", min: 180, line: "The eyes are open. They see everything." },
  { n: 4, name: "Feral", min: 400, line: "No longer asking. Taking." },
  { n: 5, name: "Evolved", min: 800, line: "New evolution. Fully cooked." },
] as const;
export type Stage = (typeof STAGES)[number];

export const day = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
const yesterday = (t = Date.now()) => day(t - 864e5);

type Scorable = { done: Partial<Record<string, number>>; evo?: Evo; refs?: string[] };

export const evoOf = (e: { evo?: Evo }): Evo => e.evo ?? { xp: 0, streak: 0 };

export function points(e: Scorable) {
  const tasks = Object.values(e.done).filter(Boolean).length * POINTS.task;
  const xp = evoOf(e).xp;
  const invites = Math.min(e.refs?.length ?? 0, POINTS.referralMax) * POINTS.referral;
  return { tasks, xp, invites, total: tasks + xp + invites };
}

export function stageFor(total: number): Stage {
  return [...STAGES].reverse().find((s) => total >= s.min) ?? STAGES[0];
}
export const nextStage = (s: Stage): Stage | null => (STAGES as readonly Stage[])[s.n] ?? null;

// Streak as it stands today: it breaks if yesterday was missed
export function liveStreak(evo: Evo, now = Date.now()) {
  return evo.lastFeed === day(now) || evo.lastFeed === yesterday(now) ? evo.streak : 0;
}
export const fedToday = (evo: Evo, now = Date.now()) => evo.lastFeed === day(now);
export const feedReward = (streak: number) => POINTS.feed + Math.min(Math.max(streak - 1, 0), POINTS.streakMax) * POINTS.streakStep;

// The streak and reward if they feed right now
export function nextFeed(evo: Evo, now = Date.now()) {
  const streak = evo.lastFeed === yesterday(now) ? evo.streak + 1 : 1;
  return { streak, reward: feedReward(streak) };
}

export const gameLeft = (evo: Evo, now = Date.now()) => POINTS.gameDaily - (evo.gameDay === day(now) ? (evo.gamePts ?? 0) : 0);

// Milliseconds until the next UTC day, when feeding and game points reset
export const untilReset = (now = Date.now()) => 864e5 - (now % 864e5);
