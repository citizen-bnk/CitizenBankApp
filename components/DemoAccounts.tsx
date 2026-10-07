"use client";
import { useEffect, useState } from "react";
type Account = { key: string; email: string; roles: string[]; description: string };
export default function DemoAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  useEffect(() => { let active = true; fetch("/api/platform/demo-accounts", {cache:"no-store"}).then(r=>r.ok?r.json():null).then(data=>{if(active && Array.isArray(data?.accounts)) setAccounts(data.accounts);}).catch(()=>{}); return ()=>{active=false;}; }, []);
  if (!accounts.length) return null;
  return <section aria-label="Demo accounts" style={{marginTop:20}}><h3>Try a demo account</h3><p className="muted">One Citizen profile across the ecosystem. Your roles determine which services open.</p><div style={{display:"grid",gap:8}}>{accounts.map(a=><a key={a.key} className="btn" style={{height:"auto",display:"block",textAlign:"left",padding:12}} href={"/api/platform/demo-start?account="+encodeURIComponent(a.key)}><strong style={{textTransform:"capitalize"}}>{a.key}</strong><small style={{display:"block"}}>{a.description}</small>{!a.roles.includes("customer") && <small style={{display:"block"}}>Opens your Hub workspace</small>}</a>)}</div></section>;
}
