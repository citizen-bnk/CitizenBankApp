"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import AccessButtons from "@/components/AccessButtons";
import { loginReasonMessage, websiteSignInUrl } from "@/lib/sso";

export default function LoginForm() {
  const params = useSearchParams();
  const website = websiteSignInUrl(process.env.NEXT_PUBLIC_WEBSITE_URL) ?? "https://citizenbank.co.ls/";
  const signIn = new URL("/enter-app", website).toString();
  const legacyEnabled = process.env.NEXT_PUBLIC_LEGACY_BANKING_LOGIN === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [legacyOpen, setLegacyOpen] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(45000) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Sign-in failed. Please try again.");
      const next = params.get("next");
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed."); setBusy(false);
    }
  }

  return <form onSubmit={submit}>
    {loginReasonMessage(params.get("reason")) && <div className="info" role="status">{loginReasonMessage(params.get("reason"))}</div>}
    <p><a href={website}>Back to Citizen Bank website</a></p>
    <section className="central-sign-in">
      <h2>One Citizen account</h2>
      <p className="sub">Your Citizen account works here and on Internet Banking.</p>
      <a className="btn" href={signIn}>Sign in with Citizen</a>
      <p className="alt">New to Citizen? <a href="/register">Create your account</a></p>
    </section>
    {legacyEnabled && <details open={legacyOpen || Boolean(error)} onToggle={event => setLegacyOpen(event.currentTarget.open)}>
      <summary>Existing banking credentials</summary>
      {error && <div className="err" role="alert">{error}</div>}
      <label className="field"><span>Email</span><input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></label>
      <label className="field"><span>Password</span><input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
      <AccessButtons />
      <button className="btn" disabled={busy || !email || !password}>{busy ? "Signing in…" : "Sign in with existing credentials"}</button>
    </details>}
  </form>;
}
