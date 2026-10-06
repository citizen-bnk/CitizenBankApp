import { test } from "node:test";
import assert from "node:assert/strict";
import { redeemHandoff, safeNext, loginReasonMessage, websiteSignInUrl } from "../lib/sso";

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

test("the website sign-in link is offered only for a plain http(s) address", () => {
  for (const bad of [undefined, "", "not a url", "javascript:alert(1)", "ftp://x.test/"]) assert.equal(websiteSignInUrl(bad), null);
  assert.equal(websiteSignInUrl("https://site.example.test/demo"), "https://site.example.test/demo");
});

test("the login page explains known reasons and nothing else", () => {
  assert.match(loginReasonMessage("sso") ?? "", /expired or was already used/);
  assert.match(loginReasonMessage("timeout") ?? "", /inactivity/);
  assert.match(loginReasonMessage("unavailable") ?? "", /temporarily unavailable/);
  for (const bad of [null, undefined, "", "<script>", "__proto__", "constructor"]) assert.equal(loginReasonMessage(bad), null);
});

