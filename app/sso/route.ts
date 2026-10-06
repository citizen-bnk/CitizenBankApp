import { NextResponse, type NextRequest } from "next/server";
import { redeemHandoff, safeNext } from "@/lib/sso";

export const dynamic = "force-dynamic";

/**
 * 303 with a relative Location, so the browser resolves it against the address it actually used. Building an
 * absolute URL from the request is unreliable behind proxies and in dev (localhost vs 127.0.0.1), and a wrong
 * host would drop the session cookie that was just set.
 */
const see = (path: string) => new NextResponse(null, { status: 303, headers: { location: path } });

/**
 * Landing point for the website's "Open Citizen Bank App" button: /sso?code=<one-time token>&next=<path>.
 * Core checks the token and starts the session; we hand its cookie to the browser and continue.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const result = await redeemHandoff(
    url.searchParams.get("code") ?? "",
    process.env.CORE_API_URL || "http://localhost:4000",
  );
  if (!result.ok) {
    return see(`/login?reason=${result.reason}`);
  }
  const res = see(safeNext(url.searchParams.get("next")));
  for (const cookie of result.setCookies) res.headers.append("set-cookie", cookie);
  res.headers.set("cache-control", "no-store");
  res.headers.set("referrer-policy", "no-referrer");
  return res;
}
