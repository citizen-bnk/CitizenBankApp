"use client";

import { useState } from "react";

export default function RegisterForm() {
  const [f, setF] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, phone: f.phone || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "We couldn't open your account. Please try again.");
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      {error && <div className="err" role="alert">{error}</div>}
      <div className="row2">
        <label className="field"><span>First name</span><input autoComplete="given-name" value={f.firstName} onChange={set("firstName")} required /></label>
        <label className="field"><span>Last name</span><input autoComplete="family-name" value={f.lastName} onChange={set("lastName")} required /></label>
      </div>
      <label className="field"><span>Email</span><input type="email" autoComplete="email" value={f.email} onChange={set("email")} required /></label>
      <label className="field"><span>Mobile number (for airtime)</span><input type="tel" autoComplete="tel" placeholder="+266 5…" value={f.phone} onChange={set("phone")} /></label>
      <label className="field"><span>Password — at least 10 characters with a letter and a number</span><input type="password" autoComplete="new-password" value={f.password} onChange={set("password")} required /></label>
      <button className="btn" disabled={busy}>{busy ? "Opening your account…" : "Open account"}</button>
      <p className="alt">Already with us? <a href="/login">Sign in</a></p>
    </form>
  );
}
