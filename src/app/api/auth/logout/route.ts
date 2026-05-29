import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { verifyToken } from "@/lib/auth";

/**
 * Logout doesn't just clear cookies — it bumps the user's `tokenVersion`
 * so the refresh token (which lives 7 days) is invalidated server-side too.
 * Fixes the E6 audit finding where logout left a stolen refresh token
 * usable for its full lifetime.
 *
 * Best-effort: if the DB call fails we still clear cookies, so the user is
 * never stuck "logged in" on the client. The worst-case fallback is that
 * the existing access token continues to work for up to 15min (its TTL).
 */
export async function POST() {
    const response = NextResponse.json({ message: "Logged out" });

    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get("access_token")?.value;
        const refreshToken = cookieStore.get("refresh_token")?.value;
        const payload =
            (accessToken && verifyToken(accessToken)) ||
            (refreshToken && verifyToken(refreshToken)) ||
            null;

        if (payload?.sub) {
            await connectDB();
            await User.findByIdAndUpdate(payload.sub, { $inc: { tokenVersion: 1 } });
        }
    } catch (err) {
        console.warn("Logout: failed to bump tokenVersion, clearing cookies anyway:", err);
    }

    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
    response.cookies.delete("user_role");
    response.cookies.delete("preview_tier");
    return response;
}
