import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { AccessLog } from "@/lib/models/access-log";
import { verifyPassword, createAccessToken, createRefreshToken, seedAdmin } from "@/lib/auth";
import { resolveIpLocation } from "@/lib/geo";

// In-memory rate limiter (resets on deploy, good enough for Vercel serverless)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(key: string): boolean {
    const now = Date.now();
    const entry = loginAttempts.get(key);
    if (!entry || now > entry.resetAt) {
        loginAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
        return false;
    }
    entry.count++;
    return entry.count > MAX_ATTEMPTS;
}

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        // Rate limit by IP and email
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
        const emailKey = email.toLowerCase().trim();
        if (isRateLimited(`ip:${ip}`) || isRateLimited(`email:${emailKey}`)) {
            return NextResponse.json({ error: "Too many login attempts. Please try again in 15 minutes." }, { status: 429 });
        }

        await connectDB();
        await seedAdmin();

        const user = await User.findOne({ email: emailKey });


        if (!user) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        if (!user.isActive) {
            return NextResponse.json({ error: "Account is deactivated" }, { status: 403 });
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Create tokens
        const accessToken = createAccessToken(user);
        const refreshToken = createRefreshToken(user);

        // Log access with geo lookup
        const userAgent = request.headers.get("user-agent") || "unknown";
        const geo = await resolveIpLocation(ip);

        await AccessLog.create({
            userId: user._id,
            userName: user.name,
            userEmail: user.email,
            action: "login",
            ip,
            location: geo?.location,
            country: geo?.country,
            userAgent,
        });

        // Set cookies via response headers
        const response = NextResponse.json({
            message: "Login successful",
            role: user.role,
            user: { id: user._id, email: user.email, name: user.name, role: user.role },
        });

        const isProduction = process.env.NODE_ENV === "production";

        response.cookies.set("access_token", accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            path: "/",
            maxAge: 15 * 60,
        });

        response.cookies.set("refresh_token", refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60,
        });

        // Non-httpOnly cookie for client-side role check (not sensitive)
        response.cookies.set("user_role", user.role, {
            httpOnly: false,
            secure: isProduction,
            sameSite: "lax",
            path: "/",
            maxAge: 15 * 60,
        });

        return response;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Login error:", message);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
