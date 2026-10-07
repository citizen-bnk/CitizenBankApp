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
  const reasonNotice = loginReasonMessage(params.get("reason"));
  const websiteSignIn = websiteSignInUrl(process.env.NEXT_PUBLIC_SIGN_IN_URL);


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
      {reasonNotice && <div className="info" role="status">{reasonNotice}</div>}
      <AccessButtons />
      <p><a href={process.env.NEXT_PUBLIC_WEBSITE_URL || "https://citizen-website-demo.vercel.app/"}>Back to Citizen Bank website</a></p>
      <DemoAccounts />
      {websiteSignIn && (
        <p style={{ margin: "0 0 20px", fontSize: 14 }}>
          Already an investor or shareholder with a Citizen account? <a href={websiteSignIn}>Sign in with your Citizen account</a>
        </p>
      )}
      <details><summary style={{cursor:"pointer",marginBottom:16}}>Use email and password</summary>
      {error && <div className="err" role="alert">{error}</div>}
      <label className="field">
        <span>Email</span>
        <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label className="field">
        <span>Password</span>
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      <button className="btn" disabled={busy || !email || !password}>{busy ? "Signing in…" : "Sign in"}</button>
      <p className="alt">New to Citizen Bank? <a href="/register">Open an account</a></p>

    </details>
    </form>
  );
}
