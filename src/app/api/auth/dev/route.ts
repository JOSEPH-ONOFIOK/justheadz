import { cookies } from "next/headers";
import { authMode, sessionCookie } from "@/lib/auth";
import { bad, enroll } from "@/lib/api";
import { toPublic } from "@/lib/entry";
import { HANDLE } from "@/lib/site";

// Local testing only: sign in by typing a handle. Off whenever X keys are set,
// and never available in production.
export async function POST(req: Request) {
  if (authMode !== "dev") return bad("Not available.", 404);
  const body = await req.json().catch(() => ({}));
  const handle = String(body.handle ?? "").trim().replace(/^@/, "");
  if (!HANDLE.test(handle)) return bad("That isn't a valid X handle.");
  const entry = await enroll(handle, undefined, typeof body.ref === "string" ? body.ref : undefined);
  (await cookies()).set(sessionCookie(entry.handle));
  return Response.json({ entry: toPublic(entry) });
}
