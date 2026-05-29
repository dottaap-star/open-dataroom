import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";
import { connectDB } from "./db";
import { User, type IUser } from "./models/user";
import { config } from "@/config";

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("CRITICAL: JWT_SECRET environment variable must be set");
    return secret;
}

interface TokenPayload {
    sub: string;
    email: string;
    role: "investor" | "admin";
    type: "access" | "refresh";
    /**
     * Per-user revocation counter (see `IUser.tokenVersion`). On every
     * authenticated request we compare this against the live DB value
     * and reject on mismatch. Pre-Phase-4.5 tokens may not carry this
     * field; `?? 0` coercion on both sides keeps them valid until the
     * user logs out or is revoked, after which the bump invalidates them.
     */
    tokenVersion: number;
}

export function createAccessToken(user: IUser): string {
    return jwt.sign(
        {
            sub: user._id.toString(),
            email: user.email,
            role: user.role,
            type: "access",
            tokenVersion: user.tokenVersion ?? 0,
        } as TokenPayload,
        getJwtSecret(),
        { expiresIn: "15m" }
    );
}

export function createRefreshToken(user: IUser): string {
    return jwt.sign(
        {
            sub: user._id.toString(),
            email: user.email,
            role: user.role,
            type: "refresh",
            tokenVersion: user.tokenVersion ?? 0,
        } as TokenPayload,
        getJwtSecret(),
        { expiresIn: "7d" }
    );
}

export function verifyToken(token: string): TokenPayload | null {
    try {
        return jwt.verify(token, getJwtSecret()) as TokenPayload;
    } catch {
        return null;
    }
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export function generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
}

/**
 * Resolves the current request's caller from the access_token cookie.
 *
 * Returns null on any of:
 *   - missing / invalid / expired JWT
 *   - wrong token type (refresh passed where access expected)
 *   - user row missing or `isActive: false`
 *   - `tokenVersion` mismatch (user was revoked or logged out elsewhere
 *     since this token was minted)
 *
 * Callers that need an admin context should use `requireAdmin()`.
 */
export async function getCurrentUser(): Promise<IUser | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;

    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload || payload.type !== "access") return null;

    await connectDB();
    const user = await User.findById(payload.sub);

    if (!user || !user.isActive) return null;
    if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) return null;

    return user;
}

export async function requireAdmin(): Promise<IUser> {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
    }
    return user;
}

export async function seedAdmin() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
        console.warn("ADMIN_EMAIL or ADMIN_PASSWORD not set, skipping admin seed");
        return;
    }

    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) return;

    const passwordHash = await hashPassword(password);
    // The admin's `name` is captured at first seed and never updated.
    // Later changes to `config.brand.name` don't propagate to this row.
    // Documented as a known limitation in docs/customize.md.
    await User.create({
        email,
        passwordHash,
        name: `${config.brand.name} Admin`,
        role: "admin",
        isActive: true,
    });

    console.log(`Admin account seeded: ${email}`);
}
