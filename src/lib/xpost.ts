// Reads a public X post through X's public embed data (the source X's own embeds use).
// No API key needed, but it only sees public posts.

import { FRIENDS_NEEDED, X_HANDLE } from "./site";

const US = X_HANDLE.replace("@", "").toLowerCase();
const POST_LINK = /(?:https?:\/\/)?(?:www\.|mobile\.)?(?:x|twitter)\.com\/(\w{1,15})\/status(?:es)?\/(\d+)/i;

type PublicPost = { author: string; text: string; replyTo?: string; quoted?: string; hasImage: boolean };
type Result = { ok: true; link: string } | { ok: false; error: string };

// The embed endpoint expects a token derived from the post id
const tokenFor = (id: string) => ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");

async function fetchPost(id: string): Promise<PublicPost | null> {
  const res = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${tokenFor(id)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const j = await res.json().catch(() => null);
  if (!j?.user?.screen_name || typeof j.text !== "string") return null; // deleted, private or withheld
  const media = [...(j.mediaDetails ?? []), ...(j.photos ?? [])];
  return {
    author: String(j.user.screen_name),
    text: j.text,
    replyTo: j.in_reply_to_status_id_str ?? undefined,
    quoted: j.quoted_tweet?.id_str ?? undefined,
    hasImage: media.length > 0,
  };
}

// Shared first steps: parse the link, load the post, check it's theirs
async function load(link: string, handle: string): Promise<{ post: PublicPost; id: string } | { ok: false; error: string }> {
  const m = POST_LINK.exec(link.trim());
  if (!m) return { ok: false, error: "Paste the link to your post. It looks like x.com/you/status/123…" };
  let post: PublicPost | null;
  try {
    post = await fetchPost(m[2]);
  } catch {
    return { ok: false, error: "We couldn't reach X just now. Try again in a minute." };
  }
  if (!post) return { ok: false, error: "We couldn't find that post. Make sure your account is public and the link is right." };
  if (post.author.toLowerCase() !== handle.toLowerCase()) {
    return { ok: false, error: `That post is from @${post.author}. Post from your own account, @${handle}.` };
  }
  return { post, id: m[2] };
}

// Distinct accounts tagged, not counting us or themselves
const friendsTagged = (text: string, handle: string) => {
  const skip = new Set([US, handle.toLowerCase()]);
  return new Set([...text.matchAll(/@(\w{1,15})/g)].map((t) => t[1].toLowerCase()).filter((h) => !skip.has(h))).size;
};

const tagsUs = (text: string) => new RegExp(`@${US}\\b`, "i").test(text);
const friendsError = `Tag at least ${FRIENDS_NEEDED} different friends.`;

// A reply directly under the pinned post tagging enough friends.
// With no pinned post yet, any post of theirs tagging us and the friends counts.
export async function verifyTagReply(link: string, handle: string, pinnedId: string): Promise<Result> {
  const r = await load(link, handle);
  if ("ok" in r) return r;
  if (pinnedId) {
    if (r.post.replyTo !== pinnedId) return { ok: false, error: "That isn't a reply to our pinned post. Reply directly under it." };
  } else if (!tagsUs(r.post.text)) {
    return { ok: false, error: `Your post needs to tag ${X_HANDLE}.` };
  }
  if (friendsTagged(r.post.text, handle) < FRIENDS_NEEDED) return { ok: false, error: friendsError };
  return { ok: true, link: `https://x.com/${r.post.author}/status/${r.id}` };
}

// The final post: a quote of the pinned post (or, with none yet, a post tagging us)
// with their wallet, enough friends tagged and their applicant card attached
export async function verifyQuote(link: string, handle: string, wallet: string, pinnedId: string): Promise<Result> {
  const r = await load(link, handle);
  if ("ok" in r) return r;
  const text = r.post.text;
  if (pinnedId) {
    if (r.post.quoted !== pinnedId) return { ok: false, error: "That isn't a quote of our pinned post. Use the Quote button on it." };
  } else if (!tagsUs(text)) {
    return { ok: false, error: `Your post needs to tag ${X_HANDLE}.` };
  }
  if (!text.toLowerCase().includes(wallet.toLowerCase())) return { ok: false, error: "Your post needs the exact wallet you saved in step 5." };
  if (friendsTagged(text, handle) < FRIENDS_NEEDED) return { ok: false, error: friendsError };
  if (!r.post.hasImage) return { ok: false, error: "Attach your applicant card image to the post." };
  return { ok: true, link: `https://x.com/${r.post.author}/status/${r.id}` };
}

// Sharing an evolution stage: their own post tagging us with their evolution card attached
export async function verifyShare(link: string, handle: string): Promise<Result> {
  const r = await load(link, handle);
  if ("ok" in r) return r;
  if (!tagsUs(r.post.text)) return { ok: false, error: `Your post needs to tag ${X_HANDLE}.` };
  if (!r.post.hasImage) return { ok: false, error: "Attach your evolution card image to the post." };
  return { ok: true, link: `https://x.com/${r.post.author}/status/${r.id}` };
}

// Holder claim: a reply under the claim post (or, with none yet, a post of theirs tagging us)
export async function verifyClaimReply(link: string, handle: string, postId: string): Promise<Result> {
  const r = await load(link, handle);
  if ("ok" in r) return r;
  if (postId) {
    if (r.post.replyTo !== postId) return { ok: false, error: "That isn't a reply to our claim post. Reply directly under it." };
  } else if (!tagsUs(r.post.text)) {
    return { ok: false, error: `Your post needs to tag ${X_HANDLE}.` };
  }
  return { ok: true, link: `https://x.com/${r.post.author}/status/${r.id}` };
}
