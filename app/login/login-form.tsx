"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const DEMO_EMAIL = "palesa@demo.citizenbank.co.ls";

export default function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const reason = params.get("reason");
  const showDemo = process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN !== "false";

  useEffect(() => {
    try {
      if (!localStorage.getItem("citizen-onboarding-seen-v1") || (localStorage.getItem("citizen-onboarding-replay-v1") && !sessionStorage.getItem("citizen-onboarding-shown-this-session-v1"))) {
        window.location.replace(`/welcome?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      }
    } catch { /* Private browsing may disable storage. */ }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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
    <form onSubmit={submit} noValidate>
      {reason === "timeout" && <div className="info">You were signed out after 5 minutes of inactivity.</div>}
      {error && <div className="err" role="alert">{error}</div>}
      <label className="field">
        <span>Email</span>
        <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label className="field">
        <span>Password</span>
        <span className="password-wrap"><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></span>
      </label>
      <button className="btn" disabled={busy || !email || !password}>{busy ? "Signing in…" : "Sign in"}</button>
      <p className="alt">New to Citizen Bank? <a href="/register">Open an account</a></p>
      {showDemo && (
        <div className="demo">
          <button type="button" onClick={() => setDemoOpen(!demoOpen)} aria-expanded={demoOpen}>{demoOpen ? "Hide demo account" : "Try a demo account"}</button>
          {demoOpen && <p><button type="button" onClick={() => setEmail(DEMO_EMAIL)}>{DEMO_EMAIL}</button><br />Ask your administrator for the demo password.</p>}
        </div>
      )}
    </form>
  );
}
