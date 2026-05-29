import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/api/auth"];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths
    if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    // Allow static assets and API routes that handle their own auth
    if (pathname.startsWith("/_next") || pathname.startsWith("/api/chat") || pathname.startsWith("/api/cron") || pathname.includes(".")) {
        return NextResponse.next();
    }

    // Check for auth token
    const token = request.cookies.get("access_token")?.value;

    if (!token) {
        const loginUrl = new URL("/login", request.url);
        // Prevent open redirect: only allow relative paths
        if (pathname.startsWith("/") && !pathname.startsWith("//")) {
            loginUrl.searchParams.set("redirect", pathname);
        }
        return NextResponse.redirect(loginUrl);
    }

    // Decode JWT payload (signature verification happens in API routes via jsonwebtoken)
    // Edge Runtime doesn't support Node.js crypto, so we decode-only here for routing
    try {
        const parts = token.split(".");
        if (parts.length !== 3) throw new Error("Invalid token format");

        const payload = JSON.parse(atob(parts[1]));

        // Check token hasn't expired
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            throw new Error("Token expired");
        }

        // Check token type
        if (payload.type !== "access") throw new Error("Not an access token");

        // Admin routes require admin role
        if (pathname.startsWith("/admin") && payload.role !== "admin") {
            return NextResponse.redirect(new URL("/portal", request.url));
        }

        // Redirect root to appropriate dashboard
        if (pathname === "/") {
            const redirectTo = payload.role === "admin" ? "/admin" : "/portal";
            return NextResponse.redirect(new URL(redirectTo, request.url));
        }
    } catch {
        // Invalid or expired token, redirect to login
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete("access_token");
        response.cookies.delete("refresh_token");
        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/).*)"],
};
