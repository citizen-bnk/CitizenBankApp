import { NextResponse, type NextRequest } from "next/server";

/** Signed-out visitors go straight to /login (Core still verifies every API call). */
export function middleware(req: NextRequest) {
  if (!req.cookies.get("cb_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = req.nextUrl.pathname === "/" ? "" : `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/", "/statements/:path*", "/profile"] };
