"use client";
import { useEffect, useId, useState } from "react";
import { safeNext } from "@/lib/sso";
type Account = { key: string; email: string; roles: string[]; description: string };
export default function DemoAccounts() {
 const [accounts,setAccounts]=useState<Account[]>([]),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const id=useId();
 useEffect(()=>{const controller=new AbortController();fetch('/api/platform/demo-accounts',{cache:'no-store',signal:controller.signal}).then(r=>r.ok?r.json():null).then(data=>{if(!controller.signal.aborted&&Array.isArray(data?.accounts))setAccounts(data.accounts);}).catch(()=>{});return ()=>controller.abort();},[]);
 async function explore(){setBusy(true);setError('');try{const r=await fetch('/api/auth/explore',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Exploration is unavailable. Choose a demo account or sign in.');window.location.assign(safeNext(new URLSearchParams(window.location.search).get('next')));}catch(e){setError(e instanceof Error?e.message:'Exploration could not be started.');setBusy(false);}}
 if(!accounts.length)return null;
 return <section className="access-demonstration" aria-label="Demonstration access">
 <button type="button" className="demo-toggle" aria-expanded={show} aria-controls={id} onClick={()=>setShow(v=>!v)}>Try a demo account <span aria-hidden="true">{show?'−':'+'}</span></button>
 {show&&<div id={id}><p className="access-note">Choose a fictional Citizen profile. No real money moves.</p><div className="account-grid">{accounts.map(a=><a key={a.key} href={'/api/platform/demo-start?account='+encodeURIComponent(a.key)}><strong>{a.key}</strong><small>{a.description}</small>{!a.roles.includes('customer')&&<small>Opens your Hub workspace</small>}</a>)}</div></div>}
 <button type="button" className="explore-link" disabled={busy} onClick={()=>void explore()}>{busy?'Starting exploration…':'Explore without an account'}</button><p className="access-note">A temporary demonstration profile; complete checks when a service needs them.</p>
 {error&&<div role="alert" className="access-error"><p>{error}</p><button type="button" disabled={busy} onClick={()=>void explore()}>Retry exploration</button><button type="button" onClick={()=>setError('')}>Cancel</button></div>}
 </section>;
}
