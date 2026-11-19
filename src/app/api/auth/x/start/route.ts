import { NextResponse } from "next/server";
import { OAUTH_COOKIE, authMode, authorizeUrl, clientIp, cookieBase, newOAuth, returnPage, returnUrl, sign, siteOrigin } from "@/lib/auth";
import { HANDLE } from "@/lib/site";
import { store } from "@/lib/store";

// GET /api/auth/x/start?to=/whitelist&ref=handle → redirects to X's consent screen
export async function GET(req: Request) {
  const origin = siteOrigin(req);
  const q = new URL(req.url).searchParams;
  const to = returnPage(q.get("to"));
  const ref = q.get("ref")?.replace(/^@/, "");
  const fail = (code: string) => NextResponse.redirect(returnUrl(origin, to, `auth_error=${code}`));
  if (authMode !== "x") return fail("unavailable");
  if (!(await store.limit(`start:${clientIp(req)}`, 20, 600))) return fail("rate_limited");

  const o = newOAuth(to, ref && HANDLE.test(ref) ? ref : undefined);
  const res = NextResponse.redirect(authorizeUrl(o, `${origin}/api/auth/x/callback`));
  res.cookies.set({ name: OAUTH_COOKIE, value: sign(o), ...cookieBase, path: "/api/auth", maxAge: 600 });
  return res;
}
