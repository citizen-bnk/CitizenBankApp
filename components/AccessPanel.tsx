"use client";
import { useEffect,useRef,useState } from 'react';
import { usePathname } from 'next/navigation';
import { startRegistration,startAuthentication } from '@simplewebauthn/browser';
import KycReview from './KycReview';
type Assessment={activity:string;risk:string;missing:string[]};
type Profile={declared:Record<string,string>;verified:string[];status:string};
const fields:Record<string,{key:string;label:string;type?:string;auto?:string}[]>={
 contact:[{key:'email',label:'Email',type:'email',auto:'email'},{key:'phone',label:'Mobile number including country code',type:'tel',auto:'tel'}],
 identity:[{key:'legalName',label:'Full legal name',auto:'name'},{key:'dateOfBirth',label:'Date of birth',type:'date',auto:'bday'},{key:'nationality',label:'Nationality'}],
 address:[{key:'address',label:'Residential address',auto:'street-address'}],source_of_funds:[{key:'sourceOfFunds',label:'Source of funds'}]};
export default function AccessPanel(){
 const path=usePathname(),dialog=useRef<HTMLDialogElement>(null);
 const [open,setOpen]=useState(false),[assessment,setAssessment]=useState<Assessment|null>(null),[profile,setProfile]=useState<Profile|null>(null),[values,setValues]=useState<Record<string,string>>({}),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[reauth,setReauth]=useState(false);
 const visible=!path.startsWith('/login') && !path.startsWith('/register');
 const [submitted,setSubmitted]=useState(false);
 const [canReview,setCanReview]=useState(false);
 async function request(url:string,data?:unknown){const r=await fetch(url,{method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),cache:'no-store'});const j=await r.json();if(!r.ok){if(j.code==='KYC_REQUIRED'){setAssessment(j.kyc);return null;}throw new Error(j.error || 'Please try again.');}return j;}
 async function load(){try{const j=await request('/api/kyc');setProfile(j.profile);setCanReview(j.canReview);setValues(j.profile?.declared || {});}catch(e){setMessage(e instanceof Error?e.message:'Please try again.');}}
 useEffect(()=>{const show=(event:Event)=>{setAssessment((event as CustomEvent).detail);setSubmitted(false);setReauth(false);setMessage('');setOpen(true);};const unlock=()=>{setReauth(true);setOpen(true);setMessage('Unlock again, then review and confirm your activity. Nothing is sent automatically.');};window.addEventListener('citizen:kyc-required',show);window.addEventListener('citizen:reauth-required',unlock);return()=>{window.removeEventListener('citizen:kyc-required',show);window.removeEventListener('citizen:reauth-required',unlock);};},[]);
 useEffect(()=>{if(open){dialog.current?.showModal();void load();}else dialog.current?.close();},[open]); // Opening fetches the latest submitted state; no payment is replayed.
 async function run(fn:()=>Promise<void>){setBusy(true);setMessage('');try{await fn();}catch(e){setMessage(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}}
 const missing=assessment?.missing || [];
 const requested=missing.flatMap(e=>fields[e] || []);
 return visible?<>
 <button type="button" onClick={()=>{setAssessment(null);setReauth(false);setMessage('');setOpen(true);}} style={{position:'fixed',top:10,right:12,zIndex:900,padding:'8px 12px',borderRadius:20,border:'1px solid #74699c',background:'#19132b',color:'#fff',fontSize:12}}>Setup & security</button>
 <dialog ref={dialog} onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)} style={{width:'min(94vw,460px)',maxHeight:'88dvh',overflowY:'auto',border:'1px solid #766791',borderRadius:22,background:'#171126',color:'#f5f2fb',padding:24}}>
 <button type="button" onClick={()=>setOpen(false)} aria-label="Close setup" style={{float:'right',background:'transparent',border:0,color:'inherit',fontSize:24}}>×</button>
 <h2 style={{marginTop:0}}>{assessment?'A quick check before you continue':'Your secure access'}</h2>
 <p style={{fontSize:14,lineHeight:1.5}}>{assessment?'We need a few details before you continue. Your activity has not been completed.':'Explore now. Open a demo account after the required checks. Secure unlock lets you return without typing a password.'}</p>
 {message && <p role="status" style={{padding:12,border:'1px solid #74699c',borderRadius:10}}>{message}</p>}
 {reauth && <div style={{display:'grid',gap:12}}><button type="button" disabled={busy} style={button} onClick={()=>run(async()=>{const options=await request('/api/auth/passkey/options',{purpose:'reauth'});const response=await startAuthentication({optionsJSON:options});await request('/api/auth/passkey/verify',{purpose:'reauth',response});setReauth(false);setMessage('Secure unlock complete. Close this panel, then review and confirm your activity.');})}>Unlock securely</button><a href="/login">Use password instead</a></div>}
 {profile && <p style={{fontSize:13}}>Checks: {profile.status.replaceAll('_',' ')}. {profile.verified.length} evidence categories reviewed.</p>}
 {!assessment && !reauth && <div style={{display:'grid',gap:12}}>
 <button type="button" disabled={busy} onClick={()=>run(async()=>{const j=await request('/api/accounts/open',{});if(j){setMessage('Your demo accounts are ready.');window.location.reload();}})} style={button}>Open demo account</button>
 <button type="button" disabled={busy} onClick={()=>run(async()=>{const options=await request('/api/auth/passkey/options',{purpose:'register'});const response=await startRegistration({optionsJSON:options});await request('/api/auth/passkey/verify',{purpose:'register',response});setMessage('Secure unlock enabled. Next time, tap Unlock securely.');})} style={button}>Enable face, fingerprint or device PIN</button>
 <p style={{fontSize:12,lineHeight:1.5}}>Your device controls its unlock PIN. Biometrics stay on your device. If this temporary explorer profile is not secured with a passkey, access is lost when its session expires.</p>
 </div>}
 {submitted && <button type="button" onClick={()=>setSubmitted(false)} style={button}>Edit provided details</button>}
 {requested.length>0 && !submitted && <form onSubmit={e=>{e.preventDefault();void run(async()=>{const data:Record<string,string>={};for(const f of requested)if(values[f.key]?.trim())data[f.key]=values[f.key].trim();await request('/api/kyc',data);await load();setSubmitted(true);setMessage('Details saved for demo review. You can keep exploring. Return and confirm your activity after approval.');});}}>
 {requested.map(f=><label key={f.key} style={{display:'grid',gap:6,marginBottom:14,fontSize:14}}>{f.label}<input type={f.type || 'text'} autoComplete={f.auto} value={values[f.key] || ''} onChange={e=>setValues(v=>({...v,[f.key]:e.target.value}))} required={f.key!=='email' && f.key!=='phone'} maxLength={f.key==='address'?300:250} style={{padding:12,borderRadius:10,border:'1px solid #74699c',background:'#211a32',color:'#fff',fontSize:16}}/></label>)}
 <p style={{fontSize:12}}>Contact details need a review of ownership. Identity details need review too. Saving this form does not mark them verified. Do not enter real identity documents in this demo.</p>
 <button disabled={busy} style={button}>Save for review</button></form>}
 {canReview && <KycReview />}
 </dialog></>:null;
}
const button={padding:'12px 16px',borderRadius:12,border:'1px solid #766791',background:'#6541d7',color:'#fff',fontSize:15,width:'100%'};

