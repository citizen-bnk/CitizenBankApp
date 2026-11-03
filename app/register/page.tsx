import { redirect } from "next/navigation";

export default function RegisterPage() {
  const website = process.env.NEXT_PUBLIC_WEBSITE_URL ?? "https://citizenbank.co.ls";
  redirect(new URL("/auth/sign-up?next=/enter-app", website).toString());
}
