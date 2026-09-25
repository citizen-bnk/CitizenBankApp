"use client";

import { useCallback, useEffect, useState } from "react";

type Entry = { id: string; amount: string; balanceAfter: string; narrative: string; createdAt: string; reference: string };
type Data = {
  account: { name: string; number: string; type: string; currency: string };
  holder: string; from: string; to: string; openingBalance: string; closingBalance: string; entries: Entry[];
};

const fmt = (v: string | number) => {
  const n = Number(v);
  return (n < 0 ? "-" : "") + "M " + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function Statement({ accountId }: { accountId: string }) {
  const now = new Date();
  const [from, setFrom] = useState(iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
  const [to, setTo] = useState(iso(now));
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59.999`);
    const res = await fetch(`/api/statements/${encodeURIComponent(accountId)}?from=${start.toISOString()}&to=${end.toISOString()}`, { cache: "no-store" });
    if (res.status === 401) { window.location.href = "/login"; return; }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setError(json.error || "Couldn't load the statement."); return; }
    setData(json);
  }, [accountId, from, to]);

  useEffect(() => { load(); }, [load]);

  function downloadCsv() {
    if (!data) return;
    const rows = [["Date", "Description", "Reference", "Amount (LSL)", "Balance (LSL)"],
      ...data.entries.map((e) => [new Date(e.createdAt).toISOString(), e.narrative, e.reference, e.amount, e.balanceAfter])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `citizen-bank-${data.account.number.slice(-4)}-${from}-to-${to}.csv`;
    a.click();
  }

  return (
    <main className="statement">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo.png" alt="Citizen Bank" style={{ width: 44 }} />
      <h1 style={{ fontFamily: "Space Grotesk, sans-serif", margin: "10px 0 0" }}>Account statement</h1>
      <div className="toolbar">
        <label className="field"><span>From</span><input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="field"><span>To</span><input type="date" value={to} min={from} max={iso(now)} onChange={(e) => setTo(e.target.value)} /></label>
        <button className="btn" onClick={() => window.print()}>Save as PDF / print</button>
        <button className="btn" onClick={downloadCsv} disabled={!data}>Download CSV</button>
      </div>
      {error && <div className="err">{error}</div>}
      {data && (
        <>
          <div className="meta">
            <span><b>{data.holder}</b></span>
            <span>{data.account.name} · {data.account.number}</span>
            <span>{new Date(data.from).toLocaleDateString("en-GB")} – {new Date(data.to).toLocaleDateString("en-GB")}</span>
            <span>Opening {fmt(data.openingBalance)}</span>
            <span>Closing {fmt(data.closingBalance)}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Description</th><th className="num">Amount</th><th className="num">Balance</th></tr></thead>
              <tbody>
                {data.entries.length === 0 && <tr><td colSpan={4}>No transactions in this period.</td></tr>}
                {data.entries.map((e) => (
                  <tr key={e.id}>
                    <td>{new Date(e.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td>{e.narrative}<br /><small style={{ opacity: 0.6 }}>{e.reference}</small></td>
                    <td className="num">{fmt(e.amount)}</td>
                    <td className="num">{fmt(e.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="legal" style={{ textAlign: "left", maxWidth: "none" }}>
            Pre-licensing demonstration statement issued by Citizen Digital Ltd (Reg. 99073). Not a statement from a licensed bank.
          </p>
        </>
      )}
    </main>
  );
}
