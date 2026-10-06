import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "../app/sso/route";

const realFetch = globalThis.fetch;
let calls: { url: string; body: string }[] = [];
const core = (status: number, cookies: string[] = []) => {
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: String(init?.body) });
    const h = new Headers();
    for (const c of cookies) h.append("set-cookie", c);
    return new Response("{}", { status, headers: h });
  }) as typeof fetch;
};
beforeEach(() => { calls = []; process.env.CORE_API_URL = "https://core.example.test"; });
afterEach(() => { globalThis.fetch = realFetch; });

const hit = (host: string, query: string) => GET(new NextRequest(`http://${host}/sso?${query}`));
const CODE = "c".repeat(40);

test("a good code sets Core's cookie and continues to the requested path, whatever host was used", async () => {
  for (const host of ["localhost:3001", "127.0.0.1:3001", "banking.example.test"]) {
    core(200, ["cb_session=abc; Path=/; HttpOnly; SameSite=lax"]);
    const res = await hit(host, `code=${CODE}&next=/dashboard`);
    assert.equal(res.status, 303);
    assert.equal(res.headers.get("location"), "/dashboard"); // relative, so it can never switch host
    assert.equal(res.headers.get("set-cookie"), "cb_session=abc; Path=/; HttpOnly; SameSite=lax");
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.equal(res.headers.get("referrer-policy"), "no-referrer");
  }
  assert.deepEqual(calls.map((c) => c.url), Array(3).fill("https://core.example.test/api/auth/sso"));
  assert.deepEqual(JSON.parse(calls[0].body), { code: CODE });
});

test("an unsafe next is replaced by /", async () => {
  for (const next of ["https://evil.example.test", "//evil.example.test", "/\\evil", "javascript:1", "x"]) {
    core(200, ["cb_session=abc"]);
    const res = await hit("banking.example.test", `code=${CODE}&next=${encodeURIComponent(next)}`);
    assert.equal(res.headers.get("location"), "/", next);
  }
});

test("a refused code goes to /login with a reason and sets no cookie", async () => {
  core(401, ["cb_session=should-not-be-forwarded"]);
  let res = await hit("banking.example.test", `code=${CODE}`);
  assert.equal(res.headers.get("location"), "/login?reason=sso");
  assert.equal(res.headers.get("set-cookie"), null);
  core(503);
  res = await hit("banking.example.test", `code=${CODE}`);
  assert.equal(res.headers.get("location"), "/login?reason=unavailable");
});

test("a missing code never calls Core", async () => {
  core(200, ["cb_session=abc"]);
  const res = await hit("banking.example.test", "next=/dashboard");
  assert.equal(res.headers.get("location"), "/login?reason=sso");
  assert.equal(calls.length, 0);
});
