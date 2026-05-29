import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Invite } from "@/lib/models/invite";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
        return NextResponse.json({ valid: false });
    }

    try {
        await connectDB();

        const invite = await Invite.findOne({ token, status: "pending" });

        if (!invite) {
            return NextResponse.json({ valid: false });
        }

        if (new Date() > invite.expiresAt) {
            invite.status = "expired";
            await invite.save();
            return NextResponse.json({ valid: false });
        }

        return NextResponse.json({ valid: true, email: invite.email, name: invite.name });
    } catch (err) {
        console.error("Validate invite error:", err);
        return NextResponse.json({ valid: false });
    }
}
