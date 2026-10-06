/**
 * Single sign-on from the Citizen Bank website. The website sends the browser here with a one-time token;
 * this server passes it to Bank Core, which starts the session, and forwards Core's cookie to the browser.
 * Kept free of framework imports so it runs in the middleware (edge) runtime and can be tested directly.
 */

/** Only a path on this site is allowed as a destination; anything else becomes "/". */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  if (/[\u0000-\u001f\u007f]/.test(value)) return "/";
  return value;
}

export type Redeemed = { ok: true; setCookies: string[] } | { ok: false; reason: "sso" | "unavailable" };

export async function redeemHandoff(
  code: string,
  coreUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Redeemed> {
  if (!code || code.length > 4096) return { ok: false, reason: "sso" };
  let res: Response;
  try {
    res = await fetchImpl(`${coreUrl.replace(/\/+$/, "")}/api/auth/sso`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return { ok: false, reason: "unavailable" };
  }
  if (!res.ok) return { ok: false, reason: res.status >= 500 ? "unavailable" : "sso" };
  const setCookies = res.headers.getSetCookie();
  // A success without a session cookie would leave the person signed out; treat it as a failure.
  return setCookies.length ? { ok: true, setCookies } : { ok: false, reason: "unavailable" };
}

const REASONS = new Set(["timeout", "sso", "unavailable"]);

/**
 * Where /login and /register send people when the website handles sign-in (SIGN_IN_URL is set).
 * Returns null to keep the local sign-in form. Only known reason codes are passed on.
 */
export function signInRedirect(signInUrl: string | undefined, reason: string | null): string | null {
  if (!signInUrl) return null;
  let target: URL;
  try {
    target = new URL(signInUrl);
  } catch {
    return null;
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") return null;
  if (reason && REASONS.has(reason)) target.searchParams.set("reason", reason);
  return target.toString();
}
