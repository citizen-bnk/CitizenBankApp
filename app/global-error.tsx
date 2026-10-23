"use client";
import {ScreenRecovery} from '@/components/ScreenRecovery';
export default function GlobalError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){return <html lang="en"><body style={{margin:0,background:'#070519',minHeight:'100vh',padding:16}}><ScreenRecovery error={error} retry={reset}/></body></html>;}
