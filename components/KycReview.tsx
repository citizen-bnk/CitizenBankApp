"use client";
import {useState} from 'react';
type Pending={userId:string;declared:Record<string,string>;updatedAt:string};
export default function KycReview(){
 const [items,setItems]=useState<Pending[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[selected,setSelected]=useState<string[]>([]),[reference,setReference]=useState('');
 async function load(){setBusy(true);try{const r=await fetch('/api/kyc/review',{cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error);setItems(j.profiles);setMessage('');}catch(e){setMessage(e instanceof Error?e.message:'Review unavailable.');}finally{setBusy(false);}}
 async function decide(item:Pending,decision:'approve'|'reject'){setBusy(true);try{const r=await fetch('/api/kyc/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:item.userId,submittedAt:item.updatedAt,decision,evidence:selected,reference,demoOnly:true})});const j=await r.json();if(!r.ok)throw new Error(j.error);setSelected([]);setReference('');await load();setMessage('Demo review saved.');}catch(e){setMessage(e instanceof Error?e.message:'Review unavailable.');}finally{setBusy(false);}}
 const item=items[0];
 return <section style={{marginTop:20,borderTop:'1px solid #74699c',paddingTop:16}}><h3>Demo review queue</h3><button type="button" disabled={busy} onClick={()=>void load()}>Refresh pending checks</button><p role="status">{message}</p>{item && <>
 <p>Profile {item.userId}</p><dl>{Object.entries(item.declared).map(([key,value])=><div key={key}><dt>{key}</dt><dd style={{overflowWrap:'anywhere'}}>{value}</dd></div>)}</dl>
 <p>Approve only categories you have checked using demo evidence. This does not certify real KYC.</p>
 {['contact','identity','address','source_of_funds'].map(e=><label key={e} style={{display:'block',margin:10}}><input type="checkbox" checked={selected.includes(e)} onChange={event=>setSelected(v=>event.target.checked?[...v,e]:v.filter(x=>x!==e))}/>{e.replaceAll('_',' ')}</label>)}
 <label>Review evidence reference<input value={reference} onChange={e=>setReference(e.target.value)} maxLength={150} style={{display:'block',width:'100%',padding:10}}/></label>
 <div style={{display:'flex',gap:12,marginTop:12}}><button type="button" disabled={busy || !selected.length || reference.trim().length<4} onClick={()=>void decide(item,'approve')}>Approve selected demo checks</button><button type="button" disabled={busy || reference.trim().length<4} onClick={()=>void decide(item,'reject')}>Reject</button></div>
 </>}</section>;
}
