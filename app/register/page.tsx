import type { Metadata } from "next";
import DemoAccounts from "@/components/DemoAccounts";
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
        <p className="sub">Create your Citizen profile. Complete checks when a service needs them.</p>
        <RegisterForm /><AccessButtons /><DemoAccounts />
        <a className="access-return" href={process.env.NEXT_PUBLIC_WEBSITE_URL || "https://citizen-website-demo.vercel.app"}>← Back to Citizen Bank website</a>
      </div>
      <p className="legal">
        Citizen Digital Ltd (Reg. 99073) is the applicant for a Central Bank of Lesotho banking licence and does not
        currently carry on banking business. Accounts opened here are demonstration accounts.
      </p>
    </main>
  );
}
