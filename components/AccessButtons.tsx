"use client";
import { useEffect,useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
export default function AccessButtons(){
 const [supported,setSupported]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setSupported(!!window.PublicKeyCredential)},[]);
 async function post(path:string,data:unknown){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw new Error(j.error || 'Please try again.');return j;}
 async function enter(passkey:boolean){setBusy(true);setError('');try{if(passkey){const options=await post('/api/auth/passkey/options',{purpose:'login'});const response=await startAuthentication({optionsJSON:options});await post('/api/auth/passkey/verify',{purpose:'login',response});}else await post('/api/auth/explore',{});
 const next=new URLSearchParams(window.location.search).get('next');window.location.href=next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
 }catch(e){setError(e instanceof Error?e.message:'Secure unlock was cancelled.');setBusy(false);}}
 return <div style={{display:'grid',gap:12,marginBottom:20}}>
 {supported && <button type="button" className="btn block" disabled={busy} onClick={()=>enter(true)}>Unlock securely</button>}
 <button type="button" className="btn block" disabled={busy} onClick={()=>enter(false)}>Get started — explore first</button>
 <p style={{fontSize:13,lineHeight:1.5,margin:0}}>Unlock with an enrolled passkey using your device’s face, fingerprint or PIN. New here? Explore first and complete checks when a service needs them.</p>
 {error && <p role="alert" style={{color:'#ff998d'}}>{error}</p>}
 </div>;
}
