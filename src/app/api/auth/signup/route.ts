import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Invite } from "@/lib/models/invite";
import { hashPassword, createAccessToken, createRefreshToken } from "@/lib/auth";
import { sendInviteAcceptedNotification } from "@/lib/email";
import { config } from "@/config";

export async function POST(request: Request) {
    try {
        const { token, name, password } = await request.json();

        if (!token || !name || !password) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
        }

        await connectDB();

        const invite = await Invite.findOne({ token, status: "pending" });

        if (!invite) {
            return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
        }

        if (new Date() > invite.expiresAt) {
            invite.status = "expired";
            await invite.save();
            return NextResponse.json({ error: "Invitation has expired" }, { status: 400 });
        }

        const existing = await User.findOne({ email: invite.email });
        if (existing) {
            return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
        }

        // If the invite carries a tier id, that tier must still exist in the
        // current config. Tiers can be removed from `dataroom.config.ts` after
        // an invite was sent — fail loud rather than mint an orphan user.
        if (invite.tier) {
            const validIds = config.access.tiers.map((t) => t.id);
            if (!validIds.includes(invite.tier)) {
                return NextResponse.json(
                    { error: "This invitation's access tier is no longer configured. Please ask the admin to re-issue your invite." },
                    { status: 400 },
                );
            }
        }

        const passwordHash = await hashPassword(password);
        const user = await User.create({
            email: invite.email,
            passwordHash,
            name: name.trim(),
            role: "investor",
            tier: invite.tier || undefined,
            isActive: true,
            inviteToken: token,
        });

        invite.status = "accepted";
        invite.acceptedAt = new Date();
        await invite.save();

        // Notify admin that an investor joined
        try {
            await sendInviteAcceptedNotification(user.name, user.email, invite.tier);
        } catch (emailErr) {
            console.error("Failed to send invite accepted notification:", emailErr);
        }

        const accessToken = createAccessToken(user);
        const refreshToken = createRefreshToken(user);

        const response = NextResponse.json({
            message: "Account created successfully",
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

        return response;
    } catch (err) {
        console.error("Signup error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
