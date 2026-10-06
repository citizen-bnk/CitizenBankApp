import { test } from "node:test";
import assert from "node:assert/strict";
import { redeemHandoff, safeNext, signInRedirect } from "../lib/sso";

test("safeNext keeps ordinary paths and refuses everything that could leave the site", () => {
  assert.equal(safeNext("/dashboard"), "/dashboard");
  assert.equal(safeNext("/statements/abc?format=csv&x=1"), "/statements/abc?format=csv&x=1");
  for (const bad of ["https://evil.example", "//evil.example/x", "/\\evil.example", "\\\\evil", "javascript:alert(1)",
    "evil", "", null, undefined, "/ok\nSet-Cookie: x=1", "/ok\r\n", "/x\u0000", "/x\u007f"]) {
    assert.equal(safeNext(bad as string | null | undefined), "/", JSON.stringify(bad));
  }
});

const fakeFetch = (res: Response | Error, seen: { url?: string; init?: RequestInit } = {}) =>
  (async (url: string | URL | Request, init?: RequestInit) => {
    seen.url = String(url); seen.init = init;
    if (res instanceof Error) throw res;
    return res;
  }) as typeof fetch;
const withCookie = (status: number, cookies: string[]) => {
  const h = new Headers();
  for (const c of cookies) h.append("set-cookie", c);
  return new Response("{}", { status, headers: h });
};
const CODE = "x".repeat(40);

test("redeemHandoff posts the code to Core and returns its cookies", async () => {
  const seen: { url?: string; init?: RequestInit } = {};
  const out = await redeemHandoff(CODE, "https://core.example.test/", fakeFetch(withCookie(200, ["cb_session=abc; Path=/; HttpOnly"]), seen));
  assert.deepEqual(out, { ok: true, setCookies: ["cb_session=abc; Path=/; HttpOnly"] });
  assert.equal(seen.url, "https://core.example.test/api/auth/sso");
  assert.equal(seen.init?.method, "POST");
  assert.deepEqual(JSON.parse(String(seen.init?.body)), { code: CODE });
  assert.equal(seen.init?.cache, "no-store");
});

test("Core refusing the token is a sign-in problem; Core being down is an availability problem", async () => {
  for (const status of [400, 401, 403, 409, 422]) {
    assert.deepEqual(await redeemHandoff(CODE, "https://c", fakeFetch(withCookie(status, []))), { ok: false, reason: "sso" }, String(status));
  }
  for (const status of [500, 502, 503]) {
    assert.deepEqual(await redeemHandoff(CODE, "https://c", fakeFetch(withCookie(status, []))), { ok: false, reason: "unavailable" }, String(status));
  }
  assert.deepEqual(await redeemHandoff(CODE, "https://c", fakeFetch(new Error("network down"))), { ok: false, reason: "unavailable" });
});

test("a success with no session cookie is not treated as signed in", async () => {
  assert.deepEqual(await redeemHandoff(CODE, "https://c", fakeFetch(withCookie(200, []))), { ok: false, reason: "unavailable" });
});

test("empty or oversized codes never reach Core", async () => {
  let called = false;
  const spy = (async () => { called = true; return withCookie(200, ["a=b"]); }) as unknown as typeof fetch;
  assert.deepEqual(await redeemHandoff("", "https://c", spy), { ok: false, reason: "sso" });
  assert.deepEqual(await redeemHandoff("x".repeat(4097), "https://c", spy), { ok: false, reason: "sso" });
  assert.equal(called, false);
});

test("signInRedirect points /login at the website only when configured, and passes on known reasons only", () => {
  assert.equal(signInRedirect(undefined, null), null);
  assert.equal(signInRedirect("", null), null);
  assert.equal(signInRedirect("not a url", null), null);
  assert.equal(signInRedirect("javascript:alert(1)", null), null);
  assert.equal(signInRedirect("ftp://x.test/", null), null);
  assert.equal(signInRedirect("https://site.example.test/demo", null), "https://site.example.test/demo");
  assert.equal(signInRedirect("https://site.example.test/demo", "timeout"), "https://site.example.test/demo?reason=timeout");
  assert.equal(signInRedirect("https://site.example.test/demo", "<script>"), "https://site.example.test/demo");
  assert.equal(signInRedirect("https://site.example.test/demo?a=1", "sso"), "https://site.example.test/demo?a=1&reason=sso");
});
