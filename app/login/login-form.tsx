"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import DemoAccounts from "@/components/DemoAccounts";
import AccessButtons from "@/components/AccessButtons";
import { loginReasonMessage, websiteSignInUrl } from "@/lib/sso";

export default function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [legacyOpen, setLegacyOpen] = useState(false);
  const reasonNotice = loginReasonMessage(params.get("reason"));
  const centralSignIn = websiteSignInUrl(process.env.NEXT_PUBLIC_SIGN_IN_URL)
    ?? "https://hub.citizenbank.co.ls/api/platform/handoff?audience=app";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(45000),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Sign-in failed. Please try again.");
      const next = params.get("next");
      // Full page load so the app shell's scripts run fresh.
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {reasonNotice && <div className="info" role="status">{reasonNotice}</div>}
      <p><a href={process.env.NEXT_PUBLIC_WEBSITE_URL || "https://citizenbank.co.ls/"}>Back to Citizen Bank website</a></p>

      <section className="central-sign-in">
        <h2>One Citizen identity</h2>
        <p className="sub">Use one verified Citizen account across Citizen Hub, Internet Banking and the mobile app.</p>
        <a className="btn" href={centralSignIn}>Continue with your Citizen account</a>
        <p className="alt">New to Citizen? <a href="/register">Create your Citizen account</a></p>
      </section>

      {error && (
        <div className="err" role="alert">
          <p>{error}</p>
          <button type="button" className="button" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <details
        open={legacyOpen || Boolean(error)}
        onToggle={(event) => setLegacyOpen(event.currentTarget.open)}
      >
        <summary>Existing banking credentials or demo access</summary>
        <p className="alt">Use this option for an existing Core banking login, an enrolled passkey or a demonstration profile. New sign-ups should start with your Citizen account above.</p>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <AccessButtons />
        <button className="btn" disabled={busy || !email || !password}>{busy ? "Signing in…" : "Sign in with existing banking credentials"}</button>
        <p className="access-note"><a href={(process.env.NEXT_PUBLIC_HUB_URL || "https://hub.citizenbank.co.ls") + "/reset-password"}>Activate account / reset password</a></p>
        <DemoAccounts />
      </details>
    </form>
  );
}
