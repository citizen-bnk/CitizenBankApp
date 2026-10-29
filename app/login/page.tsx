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
        <h1>Welcome back</h1>
        <p className="sub">Sign in to talk to Citizen AI and manage your money.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="alt"><a href={process.env.NEXT_PUBLIC_WEBSITE_URL || "https://citizenbank.co.ls"}>Back to Citizen Bank website</a></p>
      </div>
      <p className="legal">
        Citizen Digital Ltd (Reg. 99073) is the applicant for a Central Bank of Lesotho banking licence and does not
        currently carry on banking business. This is a pre-licensing demonstration of the proposed Citizen Bank.
      </p>
    </main>
  );
}
