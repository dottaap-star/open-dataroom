/**
 * Email transport + delivery. HTML bodies live in `./email-templates.ts`.
 *
 * Brand identity, recipient defaults, From name, subject lines, and the
 * inline logo path all flow from `config.email` and `config.brand` — there
 * is no hardcoded brand string in this file.
 *
 * The logo (`config.email.logoPath`) is read from /public on first use and
 * cached in-process. Vercel's serverless build only ships files it can
 * statically trace, so `next.config.ts` lists the email logo in
 * `outputFileTracingIncludes` to guarantee it's present at runtime. Ship a
 * 1×1 transparent PNG at the default path so the read never throws even
 * before a forker drops in their real logo (Phase 6 / wizard).
 */

import nodemailer from "nodemailer";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "@/config";
import {
    EMAIL_LOGO_CID,
    acceptedTemplate,
    inviteTemplate,
    resetTemplate,
    substituteSubject,
} from "./email-templates";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL ||
    config.brand.domain ||
    "http://localhost:3002";

const FROM = `"${config.email.fromName}" <${process.env.EMAIL_USER || config.brand.supportEmail}>`;

let cachedLogo: Buffer | null = null;
let cachedLogoError: Error | null = null;

async function getLogoBuffer(): Promise<Buffer | null> {
    if (cachedLogo) return cachedLogo;
    if (cachedLogoError) return null;
    try {
        const file = path.join(process.cwd(), "public", config.email.logoPath);
        cachedLogo = await readFile(file);
        return cachedLogo;
    } catch (err) {
        cachedLogoError = err as Error;
        console.warn(`[email] could not read logo at ${config.email.logoPath}:`, cachedLogoError.message);
        return null;
    }
}

async function logoAttachment() {
    const buffer = await getLogoBuffer();
    if (!buffer) return [];
    return [{
        filename: path.basename(config.email.logoPath),
        content: buffer,
        cid: EMAIL_LOGO_CID,
    }];
}

export async function sendInviteEmail(to: string, name: string | undefined, signupUrl: string) {
    await transporter.sendMail({
        from: FROM,
        to,
        subject: substituteSubject(config.email.subjects.invite),
        html: inviteTemplate({ name, signupUrl }),
        attachments: await logoAttachment(),
    });
}

export async function sendInviteAcceptedNotification(
    investorName: string,
    investorEmail: string,
    tier?: string,
) {
    await transporter.sendMail({
        from: FROM,
        to: config.email.notificationRecipient,
        subject: substituteSubject(config.email.subjects.accepted, { name: investorName }),
        html: acceptedTemplate({
            investorName,
            investorEmail,
            tier,
            activityUrl: `${APP_URL}/admin/activity`,
        }),
        attachments: await logoAttachment(),
    });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
    await transporter.sendMail({
        from: FROM,
        to,
        subject: substituteSubject(config.email.subjects.reset),
        html: resetTemplate({ resetUrl }),
        attachments: await logoAttachment(),
    });
}
