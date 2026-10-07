import { NextResponse } from "next/server";
export async function GET(req:Request) {
 const base=process.env.PLATFORM_HUB_URL || process.env.PLATFORM_WEBSITE_URL || process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_SIGN_IN_URL;
 if(!base)return NextResponse.json({error:"Website sign-in is unavailable"},{status:503});
 const account=new URL(req.url).searchParams.get("account");
 if(!account || !/^[a-z_]{1,30}$/.test(account))return NextResponse.json({error:"Invalid demo account"},{status:400});
 const url=new URL("/demo",base);url.searchParams.set("demo_account",account);url.searchParams.set("service","app");
 return NextResponse.redirect(url);
}
