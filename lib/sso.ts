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

const REASON_MESSAGES: Record<string, string> = {
  timeout: "You were signed out after 5 minutes of inactivity.",
  sso: "That sign-in link had expired or was already used. Please start again from the Citizen Bank website.",
  unavailable: "Sign-in through the Citizen Bank website is temporarily unavailable. Please try again in a moment.",
};

/** Message for the ?reason= on /login. Unknown or missing reasons show nothing. */
export function loginReasonMessage(reason: string | null | undefined): string | null {
  return reason && Object.prototype.hasOwnProperty.call(REASON_MESSAGES, reason) ? REASON_MESSAGES[reason] : null;
}

/** The website's sign-in address, offered as one more way in. Only a plain http(s) address is accepted; otherwise nothing is shown. */
export function websiteSignInUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
