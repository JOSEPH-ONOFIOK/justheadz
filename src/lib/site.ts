// Fill these in when they're ready.
export const SITE = {
  name: "JustHeadz",
  tagline: "new evolution",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://justheadz.xyz").replace(/\/$/, ""),
};

// The project's X account: the follow button, tag checks and post text all use it.
export const X_HANDLE = "@justheadzhq";
export const X_URL = `https://x.com/${X_HANDLE.slice(1)}`;

// The pinned post people like, repost, reply under and quote. Empty until it's up:
// until then replies and quotes only need to tag X_HANDLE.
export const PINNED_POST = "https://x.com/JustheadzHQ/status/2123849728693870744";
export const PINNED_ID = /\/status(?:es)?\/(\d+)/.exec(PINNED_POST)?.[1] ?? "";

// Friends that must be tagged in the reply and the quote
export const FRIENDS_NEEDED = 2;

// Team and test accounts: they can use everything, but never show on the leaderboard
export const OFF_BOARD = new Set(["dextervqsm", "xmartsol", "zztest_evo", "zztest_14644"]);

export const WALLET = /^0x[a-fA-F0-9]{40}$/;
export const HANDLE = /^\w{1,15}$/;
