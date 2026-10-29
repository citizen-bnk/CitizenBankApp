import type { Metadata } from "next";
import { Suspense } from "react";
import WelcomeDeck from "./welcome-deck";
import "./welcome.css";

export const metadata: Metadata = { title: "Welcome · Citizen Bank" };

export default function WelcomePage() {
  return <Suspense><WelcomeDeck /></Suspense>;
}
