import {redirect} from "next/navigation";
import type {Metadata} from "next";

export const metadata:Metadata={title:"Open an account · Citizen Bank"};

/** New identities are registered in Citizen Hub before the app is provisioned in Bank Core. */
export default function RegisterPage(){
 redirect("https://hub.citizenbank.co.ls/register?next=%2Fmobile-onboarding");
}
