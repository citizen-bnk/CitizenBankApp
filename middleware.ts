import { NextResponse, type NextRequest } from "next/server";
import { signInRedirect } from "@/lib/sso";

/** Signed-out visitors go straight to /login (Core still verifies every API call). */
export function middleware(req: NextRequest) {
  // When the website handles sign-in (SIGN_IN_URL), the local sign-in and registration pages hand over to it.
  const path = req.nextUrl.pathname;
  if (path === "/login" || path === "/register") {
    const to = signInRedirect(process.env.SIGN_IN_URL, req.nextUrl.searchParams.get("reason"));
    return to ? NextResponse.redirect(to) : NextResponse.next();
  }
  if (!req.cookies.get("cb_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = req.nextUrl.pathname === "/" ? "" : `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/login", "/register", "/", "/statements/:path*"] };
