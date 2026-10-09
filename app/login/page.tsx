import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./login-form";
import "../auth.css";

export const metadata: Metadata = { title: "Sign in · Citizen Bank" };

export default function LoginPage() {
  return (
    <main className="auth">
      <div className="auth-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="auth-logo" src="/brand/logo.png" alt="Citizen Bank" />
        <span className="access-eyebrow">ONE CITIZEN. MANY POSSIBILITIES.</span><h1>Welcome to Citizen Bank</h1>
        <p className="sub">Your customer profile, banking services and connected Citizen workspaces.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
      <p className="legal">
        Citizen Digital Ltd (Reg. 99073) is the applicant for a Central Bank of Lesotho banking licence and does not
        currently carry on banking business. This is a pre-licensing demonstration of the proposed Citizen Bank.
      </p>
    </main>
  );
}
