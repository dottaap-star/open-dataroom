/**
 * Pure HTML builders for transactional emails (invite, password-reset,
 * invite-accepted notification). No I/O, no nodemailer — `email.ts` is the
 * transport, this file is the layout.
 *
 * Everything visible to the recipient comes from `dataroom.config.ts`:
 *   - header strip colour: `config.theme.primary`
 *   - URL-preview link colour: `config.theme.accent`
 *   - subject lines: `config.email.subjects.{invite,reset,accepted}` with
 *     `{{brand}}` and `{{name}}` substitution
 *   - tier label on the accepted-notification: looked up from
 *     `config.access.tiers[].label` (falls back to the raw tier id if
 *     missing, or "Not assigned" when no tier was attached to the invite)
 *   - sub-footer line: `config.email.subFooter` (null = no sub-footer)
 *
 * The CTA buttons hardcode white text on `config.theme.primary`. That
 * assumes the primary colour is dark enough to clear ~4.5:1 contrast with
 * white — call out in `docs/customize.md` (Phase 8). A future hardening
 * could derive button text colour from primary luminance.
 */

import { config } from "@/config";

export const EMAIL_LOGO_CID = "email-logo";

/** Resolves `{{brand}}` and `{{name}}` placeholders in subject templates. */
export function substituteSubject(template: string, vars: { brand?: string; name?: string } = {}): string {
    return template
        .replace(/\{\{brand\}\}/g, vars.brand ?? config.brand.name)
        .replace(/\{\{name\}\}/g, vars.name ?? "");
}

/** Maps a tier id to its human-readable label, or returns a sensible default. */
export function resolveTierLabel(tier?: string): string {
    if (!tier) return "Not assigned";
    return config.access.tiers.find((t) => t.id === tier)?.label ?? tier;
}

interface WrapperOptions {
    /** Optional pre-footer content (table rows). */
    footerExtra?: string;
}

/**
 * Wraps body content in the shared header/footer chrome. The header bar uses
 * `config.theme.primary`; the sub-footer is omitted entirely when
 * `config.email.subFooter` is null.
 */
function emailWrapper(body: string, opts: WrapperOptions = {}): string {
    const { footerExtra = "" } = opts;
    const brand = config.brand.name;
    const primary = config.theme.primary;
    const subFooter = config.email.subFooter;

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:Inter,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

<!-- Header -->
<tr><td style="background-color:${primary};padding:32px 40px;">
<img src="cid:${EMAIL_LOGO_CID}" alt="${brand}" width="120" height="56" style="display:block;border:0;outline:none;" />
</td></tr>

${body}

<!-- Footer -->
<tr><td style="padding:24px 40px;border-top:1px solid #e9eaeb;background-color:#fafaf9;">
${footerExtra}
<p style="margin:0 0 6px;font-size:12px;color:#a4a7ae;line-height:1.5;">
${config.brand.legalFooter}
</p>
<p style="margin:0;font-size:12px;color:#a4a7ae;">
&copy; ${new Date().getFullYear()} ${brand}. All rights reserved.
</p>
</td></tr>

</table>
${subFooter ? `
<!-- Sub-footer -->
<table width="560" cellpadding="0" cellspacing="0">
<tr><td style="padding:16px 40px 0;">
<p style="margin:0;font-size:11px;color:#c4c4c4;text-align:center;">
${subFooter}
</p>
</td></tr>
</table>` : ""}

</td></tr>
</table>
</body>
</html>`;
}

export interface InviteTemplateArgs {
    name?: string;
    signupUrl: string;
}

export function inviteTemplate({ name, signupUrl }: InviteTemplateArgs): string {
    const greeting = name ? `Hi ${name},` : "Hi there,";
    const brand = config.brand.name;
    const primary = config.theme.primary;
    const inviteExpiryDays = config.technical.inviteExpiryDays;

    const body = `
<!-- Body -->
<tr><td style="padding:40px;">
<h1 style="margin:0 0 16px;font-size:24px;font-weight:600;color:#181D27;line-height:1.3;">
You're invited to ${brand}'s data room
</h1>
<p style="margin:0 0 24px;font-size:16px;color:#535862;line-height:1.6;">
${greeting}
</p>
<p style="margin:0 0 24px;font-size:16px;color:#535862;line-height:1.6;">
The ${brand} team has invited you to access their secure data room. Inside, you'll find business documents, financials, team profiles, and an AI assistant that can answer your questions.
</p>
<p style="margin:0 0 32px;font-size:16px;color:#535862;line-height:1.6;">
Click below to create your account and get started:
</p>

<!-- CTA Button -->
<table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
<tr><td style="background-color:${primary};border-radius:8px;padding:12px 24px;">
<a href="${signupUrl}" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;display:inline-block;">
Access Data Room
</a>
</td></tr>
</table>

<p style="margin:0 0 8px;font-size:14px;color:#a4a7ae;line-height:1.5;">
Or copy and paste this link into your browser:
</p>
<p style="margin:0 0 24px;font-size:14px;color:${primary};word-break:break-all;line-height:1.5;">
${signupUrl}
</p>

<p style="margin:0;font-size:14px;color:#a4a7ae;line-height:1.5;">
This invitation expires in ${inviteExpiryDays} days. If you have any questions, reply to this email.
</p>
</td></tr>`;

    return emailWrapper(body);
}

export interface AcceptedTemplateArgs {
    investorName: string;
    investorEmail: string;
    tier?: string;
    activityUrl: string;
}

export function acceptedTemplate({ investorName, investorEmail, tier, activityUrl }: AcceptedTemplateArgs): string {
    const tierLabel = resolveTierLabel(tier);
    const primary = config.theme.primary;

    const body = `
<!-- Body -->
<tr><td style="padding:40px;">
<h1 style="margin:0 0 16px;font-size:24px;font-weight:600;color:#181D27;line-height:1.3;">
New investor joined the data room
</h1>
<p style="margin:0 0 24px;font-size:16px;color:#535862;line-height:1.6;">
<strong>${investorName}</strong> (${investorEmail}) has accepted their invitation and created an account.
</p>

<table cellpadding="0" cellspacing="0" style="margin:0 0 24px;width:100%;">
<tr>
<td style="padding:12px 16px;background-color:#fafaf9;border-radius:8px;border:1px solid #e9eaeb;">
<table cellpadding="0" cellspacing="0" style="width:100%;">
<tr>
<td style="padding:4px 0;font-size:14px;color:#a4a7ae;width:80px;">Name</td>
<td style="padding:4px 0;font-size:14px;color:#181D27;font-weight:500;">${investorName}</td>
</tr>
<tr>
<td style="padding:4px 0;font-size:14px;color:#a4a7ae;width:80px;">Email</td>
<td style="padding:4px 0;font-size:14px;color:#181D27;font-weight:500;">${investorEmail}</td>
</tr>
<tr>
<td style="padding:4px 0;font-size:14px;color:#a4a7ae;width:80px;">Access</td>
<td style="padding:4px 0;font-size:14px;color:#181D27;font-weight:500;">${tierLabel}</td>
</tr>
</table>
</td>
</tr>
</table>

<!-- CTA Button -->
<table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
<tr><td style="background-color:${primary};border-radius:8px;padding:12px 24px;">
<a href="${activityUrl}" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;display:inline-block;">
View Activity Log
</a>
</td></tr>
</table>
</td></tr>`;

    return emailWrapper(body);
}

export interface ResetTemplateArgs {
    resetUrl: string;
}

export function resetTemplate({ resetUrl }: ResetTemplateArgs): string {
    const brand = config.brand.name;
    const primary = config.theme.primary;
    const accent = config.theme.accent;

    const body = `
<!-- Body -->
<tr><td style="padding:40px;">

<h1 style="margin:0 0 16px;font-size:24px;font-weight:600;color:#181D27;line-height:1.3;">
Reset your password
</h1>
<p style="margin:0 0 24px;font-size:16px;color:#535862;line-height:1.6;">
We received a request to reset your password for the ${brand} data room. Click the button below to choose a new password:
</p>

<!-- CTA Button -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
<tr><td align="center">
<table cellpadding="0" cellspacing="0">
<tr><td style="background-color:${primary};border-radius:8px;padding:14px 32px;">
<a href="${resetUrl}" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;display:inline-block;letter-spacing:0.3px;">
Reset Password &rarr;
</a>
</td></tr>
</table>
</td></tr>
</table>

<p style="margin:0 0 8px;font-size:13px;color:#a4a7ae;line-height:1.5;">
Or copy and paste this link:
</p>
<p style="margin:0 0 24px;font-size:13px;color:${accent};word-break:break-all;line-height:1.5;">
${resetUrl}
</p>

<!-- Divider -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
<tr><td style="border-top:1px solid #e9eaeb;">&nbsp;</td></tr>
</table>

<p style="margin:0 0 4px;font-size:13px;color:#a4a7ae;line-height:1.5;">
This link expires in 1 hour.
</p>
<p style="margin:0;font-size:13px;color:#a4a7ae;line-height:1.5;">
If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
</p>
</td></tr>`;

    return emailWrapper(body);
}
