import type { NextConfig } from "next";
import { config as dataroomConfig } from "./dataroom.config";

/**
 * CSP allow-list for `connect-src`. The list covers all three supported LLM
 * provider endpoints so a deployment can flip `config.ai.chatProvider` without
 * a CSP change. Tightening per-provider is a future optimisation.
 */
const CONNECT_SRC = [
    "'self'",
    "https://*.googleapis.com",                // Drive + Gemini
    "https://generativelanguage.googleapis.com", // Gemini chat endpoint
    "https://api.openai.com",                  // OpenAI
    "https://api.anthropic.com",               // Anthropic
].join(" ");

const CSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",        // Next runtime + inline hydration
    "style-src 'self' 'unsafe-inline'",         // Tailwind v4 + react-aria
    "img-src 'self' data: https:",              // markdown + asset URLs
    `connect-src ${CONNECT_SRC}`,
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com", // /portal/videos embeds
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
].join("; ");

const imageRemotePatterns: NextConfig["images"] = {
    remotePatterns: [
        // Google's avatar CDN; kept for future "team page avatars from Google profile" wiring
        { protocol: "https", hostname: "lh3.googleusercontent.com" },
        ...(dataroomConfig.brand.cdnDomain
            ? [{
                protocol: "https" as const,
                hostname: new URL(dataroomConfig.brand.cdnDomain).hostname,
            }]
            : []),
    ],
};

const nextConfig: NextConfig = {
    images: imageRemotePatterns,
    turbopack: {},
    // The email module reads `public/${config.email.logoPath}` at runtime;
    // Vercel's serverless bundler only ships files it can trace statically.
    // Bundle the default email logo into every API route so any future email-
    // sending endpoint (revocation notice, alerts, …) doesn't silently lose
    // the logo in production. The literal path here must match
    // `config.email.logoPath` — forkers changing the path need to update this.
    // See docs/deploy.md.
    outputFileTracingIncludes: {
        "/api/**/*": ["./public/assets/branding/email-logo.png"],
    },
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "X-Frame-Options", value: "DENY" },
                    { key: "X-XSS-Protection", value: "1; mode=block" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
                    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
                    { key: "Content-Security-Policy", value: CSP },
                ],
            },
        ];
    },
};

export default nextConfig;
