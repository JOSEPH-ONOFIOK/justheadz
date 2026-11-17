// Fill these in when they're ready.
export const SITE = {
  name: "JustHeadz",
  tagline: "new evolution",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

// The project's X account. PLACEHOLDER until the real handle is confirmed:
// the follow button, tag checks and post text all use it.
export const X_HANDLE = "@justheadz";
export const X_URL = `https://x.com/${X_HANDLE.slice(1)}`;

// The pinned post people like, repost, reply under and quote. Empty until it's up:
// until then replies and quotes only need to tag X_HANDLE.
export const PINNED_POST = "";
export const PINNED_ID = /\/status(?:es)?\/(\d+)/.exec(PINNED_POST)?.[1] ?? "";

// Who may apply. Override with env vars without touching code.
export const MIN_ACCOUNT_DAYS = Number(process.env.MIN_ACCOUNT_DAYS ?? 90);
export const MIN_FOLLOWERS = Number(process.env.MIN_FOLLOWERS ?? 50);
// Friends that must be tagged in the reply and the quote
export const FRIENDS_NEEDED = 2;

export const WALLET = /^0x[a-fA-F0-9]{40}$/;
export const HANDLE = /^\w{1,15}$/;
