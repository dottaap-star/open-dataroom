import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { verifyToken, createAccessToken } from "@/lib/auth";

export async function POST() {
    try {
        const cookieStore = await cookies();
        const refreshToken = cookieStore.get("refresh_token")?.value;

        if (!refreshToken) {
            return NextResponse.json({ error: "No refresh token" }, { status: 401 });
        }

        const payload = verifyToken(refreshToken);
        if (!payload || payload.type !== "refresh") {
            return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
        }

        await connectDB();
        const user = await User.findById(payload.sub);

        if (!user || !user.isActive) {
            return NextResponse.json({ error: "User not found" }, { status: 401 });
        }
        // Revocation check: if the user's tokenVersion has moved since this
        // refresh token was minted, the token is invalidated server-side.
        if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
            return NextResponse.json({ error: "Token revoked" }, { status: 401 });
        }

        const newAccessToken = createAccessToken(user);
        const response = NextResponse.json({ message: "Token refreshed" });

        const isProduction = process.env.NODE_ENV === "production";

        response.cookies.set("access_token", newAccessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            path: "/",
            maxAge: 15 * 60,
        });

        response.cookies.set("user_role", user.role, {
            httpOnly: false,
            secure: isProduction,
            sameSite: "lax",
            path: "/",
            maxAge: 15 * 60,
        });

        return response;
    } catch {
        return NextResponse.json({ error: "Token refresh failed" }, { status: 500 });
    }
}
