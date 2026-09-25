import type { Metadata } from "next";
import Statement from "./statement";
import "../../auth.css";

export const metadata: Metadata = { title: "Statement · Citizen Bank" };

export default async function StatementPage({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  return <Statement accountId={accountId} />;
}
