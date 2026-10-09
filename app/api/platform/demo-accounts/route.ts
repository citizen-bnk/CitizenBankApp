import { NextResponse } from "next/server";
export async function GET() {
  try {
    const base = process.env.PLATFORM_HUB_URL || process.env.PLATFORM_WEBSITE_URL || process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_SIGN_IN_URL;
    if (!base) return NextResponse.json({accounts:[]},{status:503});
    const url = new URL("/api/platform/demo-accounts",base);
    const response = await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(8000)});
    if(!response.ok) return NextResponse.json({accounts:[]},{status:response.status});
    const data = await response.json();
    return NextResponse.json({accounts:data.accounts},{headers:{"Cache-Control":"no-store"}});
  } catch { return NextResponse.json({accounts:[]},{status:503}); }
}
