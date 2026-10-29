import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Route protection:
 *  - Pages (/studio, /agents*) redirect to /login when unauthenticated.
 *  - API routes (/api/*, except auth) return 401 JSON when unauthenticated,
 *    so client fetch() calls can surface "Unauthorized" cleanly.
 */
export default withAuth(
  function middleware(req) {
    // API routes: return JSON 401 instead of a redirect.
    if (req.nextUrl.pathname.startsWith("/api/")) {
      if (!req.nextauth.token) {
        return NextResponse.json(
          { success: false, error: "Unauthorized. Please sign in." },
          { status: 401 }
        );
      }
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow API routes through to the middleware body so they can return
        // a JSON 401. Pages are only allowed when a token is present.
        if (req.nextUrl.pathname.startsWith("/api/")) return true;
        return !!token;
      },
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: ["/studio/:path*", "/agents/:path*", "/api/extract-spec/:path*", "/api/deploy-agent/:path*", "/api/agents/:path*", "/api/run-agent/:path*", "/api/test-spec/:path*", "/api/generate-code/:path*"],
};
