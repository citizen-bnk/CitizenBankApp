import type { Metadata } from "next";
import RegisterForm from "./register-form";
import "../auth.css";

export const metadata: Metadata = { title: "Open an account · Citizen Bank" };

export default function RegisterPage() {
  return (
    <main className="auth">
      <div className="auth-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="auth-logo" src="/brand/logo.png" alt="Citizen Bank" />
        <h1>Open your account</h1>
        <p className="sub">A current account, a savings account and a virtual card — in two minutes.</p>
        <RegisterForm />
      </div>
      <p className="legal">
        Citizen Digital Ltd (Reg. 99073) is the applicant for a Central Bank of Lesotho banking licence and does not
        currently carry on banking business. Accounts opened here are demonstration accounts.
      </p>
    </main>
  );
}
