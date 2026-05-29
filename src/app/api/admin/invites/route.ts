import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Invite } from "@/lib/models/invite";
import { User } from "@/lib/models/user";
import { requireAdmin, generateToken } from "@/lib/auth";
import { sendInviteEmail } from "@/lib/email";
import { config } from "@/config";

/**
 * Per-request tier validation.
 *
 * - **No-tier mode** (`config.access.tiers === []`): the tier field must be
 *   omitted (or empty/null). Passing a value is a 400.
 * - **Multi-tier mode**: the tier field is REQUIRED and must match one of
 *   the configured tier ids. Omitting it is a 400.
 *
 * Why required in multi-tier: a missing tier would mint a user whose
 * `documents` query skips the tier filter entirely (see api/documents/route.ts),
 * effectively granting access to every document — a privilege-escalation
 * footgun one missed dropdown away. Forkers who want "any logged-in user
 * sees everything" should configure no tiers at all (or a single all-access
 * tier — the shipped default `dataroom.config.ts` shows the pattern).
 */
function validateTier(tier: unknown): { ok: true; value: string | undefined } | { ok: false; error: string } {
    const validIds = config.access.tiers.map((t) => t.id);
    if (tier === undefined || tier === null || tier === "") {
        if (validIds.length === 0) return { ok: true, value: undefined };
        return { ok: false, error: `Tier is required; expected one of: ${validIds.join(", ")}` };
    }
    if (typeof tier !== "string") {
        return { ok: false, error: "Tier must be a string id" };
    }
    if (validIds.length === 0) {
        return { ok: false, error: "This deployment has no tiers configured; remove the tier field" };
    }
    if (!validIds.includes(tier)) {
        return { ok: false, error: `Invalid tier "${tier}"; expected one of: ${validIds.join(", ")}` };
    }
    return { ok: true, value: tier };
}

export async function POST(request: Request) {
    try {
        const admin = await requireAdmin();
        const { email, name, tier } = await request.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const tierCheck = validateTier(tier);
        if (!tierCheck.ok) {
            return NextResponse.json({ error: tierCheck.error }, { status: 400 });
        }

        await connectDB();

        // Check for existing pending invite
        const existingInvite = await Invite.findOne({ email: email.toLowerCase().trim(), status: "pending" });
        if (existingInvite) {
            return NextResponse.json({ error: "An invitation is already pending for this email" }, { status: 409 });
        }

        // Create invite (config-driven expiry)
        const token = generateToken();
        const expiryMs = config.technical.inviteExpiryDays * 24 * 60 * 60 * 1000;
        const invite = await Invite.create({
            email: email.toLowerCase().trim(),
            name: name?.trim(),
            tier: tierCheck.value,
            token,
            invitedBy: admin.email,
            expiresAt: new Date(Date.now() + expiryMs),
        });

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || config.brand.domain || "http://localhost:3002";
        const signupUrl = `${baseUrl}/signup/${token}`;

        // Send invite email
        try {
            await sendInviteEmail(invite.email, invite.name, signupUrl);
            console.log(`Invite email sent to ${email}`);
        } catch (emailErr) {
            console.error("Failed to send invite email:", emailErr);
            // Still return success since the invite was created
            // Admin can resend or share the link manually
        }

        return NextResponse.json({
            message: `Invitation sent to ${email}`,
            invite: {
                id: invite._id,
                email: invite.email,
                name: invite.name,
                status: invite.status,
                signupUrl,
                expiresAt: invite.expiresAt,
            },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message.includes("Unauthorized") ? 403 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

export async function GET() {
    try {
        await requireAdmin();
        await connectDB();

        const invites = await Invite.find().sort({ createdAt: -1 }).lean();

        return NextResponse.json({ invites });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message.includes("Unauthorized") ? 403 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

export async function PATCH(request: Request) {
    try {
        await requireAdmin();
        await connectDB();

        const { id, tier } = await request.json();

        if (!id) {
            return NextResponse.json({ error: "Invite ID is required" }, { status: 400 });
        }

        const tierCheck = validateTier(tier);
        if (!tierCheck.ok) {
            return NextResponse.json({ error: tierCheck.error }, { status: 400 });
        }
        if (tierCheck.value === undefined) {
            return NextResponse.json({ error: "Valid tier is required" }, { status: 400 });
        }

        const invite = await Invite.findByIdAndUpdate(id, { tier: tierCheck.value }, { new: true });
        if (!invite) {
            return NextResponse.json({ error: "Invite not found" }, { status: 404 });
        }

        // If invite was already accepted, also update the user's tier
        if (invite.status === "accepted") {
            await User.findOneAndUpdate(
                { email: invite.email },
                { tier: tierCheck.value }
            );
        }

        return NextResponse.json({ message: "Access updated", invite });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message.includes("Unauthorized") ? 403 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

export async function DELETE(request: Request) {
    try {
        await requireAdmin();
        await connectDB();

        const { id } = await request.json();

        if (!id) {
            return NextResponse.json({ error: "Invite ID is required" }, { status: 400 });
        }

        const invite = await Invite.findByIdAndDelete(id);

        if (!invite) {
            return NextResponse.json({ error: "Invite not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Invite removed" });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message.includes("Unauthorized") ? 403 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
