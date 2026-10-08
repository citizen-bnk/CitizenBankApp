"use client";
import {ScreenRecovery} from '@/components/ScreenRecovery';
export default function ErrorScreen({error,reset}:{error:Error&{digest?:string};reset:()=>void}){return <ScreenRecovery error={error} retry={reset}/>;}
