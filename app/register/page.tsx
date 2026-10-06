import type { Metadata } from "next";
import AccessButtons from "@/components/AccessButtons";
import RegisterForm from "./register-form";
import "../auth.css";

export const metadata: Metadata = { title: "Open an account · Citizen Bank" };

export default function RegisterPage() {
  return (
    <main className="auth">
      <div className="auth-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="auth-logo" src="/brand/logo.png" alt="Citizen Bank" />
        <h1>Start exploring</h1>
        <p className="sub">Enter now. We will ask for details when a service needs them.</p>
        <AccessButtons /><details><summary>Create a profile with email instead</summary><RegisterForm /></details>
      </div>
      <p className="legal">
        Citizen Digital Ltd (Reg. 99073) is the applicant for a Central Bank of Lesotho banking licence and does not
        currently carry on banking business. Accounts opened here are demonstration accounts.
      </p>
    </main>
  );
}
