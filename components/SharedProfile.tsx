"use client";
import { useEffect, useState, useRef } from "react";
type Shared = {linked:boolean;roles:string[];profile?:Record<string,unknown>};
const common=[['full_name','Full name'],['phone','Phone'],['street_address','Street address'],['city','City'],['country','Country'],['occupation','Occupation'],['employer','Employer'],['bio','About me']];
const investor=[['source_of_funds','Source of funds'],['investor_type','Investor type'],['investment_purpose','Investment purpose']];
export default function SharedProfile(){
 const [data,setData]=useState<Shared|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[saved,setSaved]=useState('');
 const [editing,setEditing]=useState<string|null>(null);
 const [values,setValues]=useState<Record<string,string>>({});
 async function load(){setError('');try{const r=await fetch('/api/profile',{cache:'no-store'});if(!r.ok)throw new Error('Your shared profile is unavailable. Please try again.');const d=await r.json();setData(d);setValues(Object.fromEntries([...common,...investor].map(([key])=>[key,String(d.profile?.[key]??'')])));}catch(e){setError(e instanceof Error?e.message:'Profile unavailable');}}
 useEffect(()=>{void load();},[]);
 async function save(e:React.FormEvent){e.preventDefault();if(!data?.profile)return;setBusy(true);setError('');setSaved('');try{const fields=[...common,...(data.roles.some(r=>['investor','shareholder'].includes(r))?investor:[])];const patch: Record<string, unknown>=Object.fromEntries(fields.filter(([key])=>values[key]!==String(data.profile?.[key]??'')).map(([key])=>[key,values[key]]));if(!Object.keys(patch).length){setSaved('No changes to save.');return;}patch.version=data.profile.version;const r=await fetch('/api/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch)});if(!r.ok)throw new Error(r.status===409?'Your profile changed elsewhere. Reload before saving.':'Your profile could not be saved.');await load();setSaved('Profile saved across your Citizen roles.');}catch(e){setError(e instanceof Error?e.message:'Unable to save');}finally{setBusy(false);}}
 const [section,setSection]=useState<string|null>(null);
 const groups: [string,string,string[][]][]=[['basic','Contact details',common.slice(0,2)],...(data?.roles.includes('customer')?[['standard','Address & identity',common.slice(2,5)] as [string,string,string[][]]]:[]),...(data?.roles.some(r=>['investor','shareholder','staff','board_member','employee'].includes(r))?[['professional','Professional details',common.slice(5,7)] as [string,string,string[][]]]:[]),...(data?.roles.some(r=>['investor','shareholder'].includes(r))?[['investor','Investor details',investor] as [string,string,string[][]]]:[])];
 const modal=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(section&&modal.current&&!modal.current.open)modal.current.showModal();},[section]);
 const selected=groups.find(([key])=>key===section);
 return <section className="citizen-profile">
 <div className="profile-top"><div><h1>My profile</h1><p>{values.full_name||'Your Citizen account'}</p></div><a className="profile-edit" href="/">Back to banking</a></div>
 {error&&<p role="alert">{error} <button className="profile-edit" onClick={()=>void load()}>Retry</button></p>}{saved&&<p role="status">{saved}</p>}
 {!data&&!error&&<p role="status">Loading profile…</p>}
 {data?.profile&&<><div className="profile-tiles">{groups.map(([key,title])=><button key={key} className="profile-tile" onClick={()=>setSection(key)}>{title}<span aria-hidden="true">↗</span></button>)}</div>
 <p className="profile-note">Only details relevant to your services are shown.</p></>}
 {data&&!data.linked&&<p>Your Citizen identity needs linking before shared details can be edited.</p>}
 {selected&&<dialog ref={modal} className="profile-modal" aria-label={selected[1]} onCancel={()=>setSection(null)}><div className="profile-top"><h2>{selected[1]}</h2><button className="profile-edit" onClick={()=>{setSection(null);setEditing(null);}}>Close</button></div><form onSubmit={async e=>{await save(e);}}>
 {selected[2].map(([key,label])=><div className="profile-item" key={key}><div><strong>{label}</strong><p>{values[key]||'Add when needed'}</p></div><button type="button" className="profile-edit" onClick={()=>setEditing(key)}>Edit</button>{editing===key&&<div className="profile-question"><label htmlFor={'profile-'+key}>{label}</label><input id={'profile-'+key} autoFocus placeholder={'Enter your '+label.toLowerCase()} value={values[key]||''} onChange={e=>setValues({...values,[key]:e.target.value})}/><button type="button" className="profile-edit" onClick={()=>setEditing(null)}>Done</button></div>}</div>)}
 <button className="profile-edit" disabled={busy}>{busy?'Saving…':'Save changes'}</button>{error&&<p role="alert">{error}</p>}{saved&&<p role="status">{saved}</p>}</form></dialog>}
 </section>;
}
