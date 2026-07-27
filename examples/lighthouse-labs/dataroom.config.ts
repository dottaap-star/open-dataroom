/**
 * Lighthouse Labs — the indie one.
 *
 * Solo-founder MVP-stage indie startup. Demonstrates the minimal-config path:
 * no tiers, no team page, no videos page, rich local knowledge instead of
 * Drive sync.
 *
 * Signature features exercised by this example:
 *   - No tiers (config.access.tiers = []) — every signed-in user sees
 *     every document; tier dropdowns hide entirely
 *   - Gemini for chat AND embeddings (single provider; cheapest path)
 *   - team.enabled = false — single-founder bio lives in content/ instead
 *   - videos.enabled = false
 *   - poweredByCredit = false — removes the OSS attribution footer
 *   - chatbot.suppressPlatformAttribution = true — disables the easter egg
 *   - 6 markdown files in localKnowledge — this example is the case study
 *     for "no Drive at all, just markdown checked into the repo"
 *
 * See archive/open-dataroom-assets/PERSONAS.md for the full persona detail.
 */

import type { DataroomConfig } from "../../src/lib/config-types";

export const config: DataroomConfig = {

    brand: {
        name: "Lighthouse Labs",
        tagline: "1 founder. 1 product. 1 conviction.",
        supportEmail: "yuna@lighthouse.example",
        domain: "https://lighthouse.example",
        cdnDomain: null,
        legalFooter: "Confidential. Built late at night.",
        // Demonstrates the opt-out path on the OSS attribution footer.
        poweredByCredit: false,
        poweredByCreditUrl: "https://github.com/my-username/open-dataroom",
    },

    assets: {
        logoLight:  "/assets/branding/logo-light.svg",
        logoDark:   "/assets/branding/logo-dark.svg",
        faviconSvg: "/assets/branding/favicon.svg",
        faviconPng: "/assets/branding/favicon.png",
        ogImage:    "/assets/branding/og.png",
    },

    theme: {
        // Deep navy + warm yellow + paper white — cozy hand-drawn indie.
        primary: "#1E3A8A",  // deep navy
        accent:  "#FBBF24",  // warm yellow
    },

    ai: {
        chatProvider:        "gemini",
        chatModel:           "gemini-3.1-pro-preview",
        embeddingsProvider:  "gemini",
        embeddingsModel:     "text-embedding-005",
    },

    email: {
        fromName:              "Yuna at Lighthouse",
        notificationRecipient: "yuna@lighthouse.example",
        logoPath:              "/assets/branding/email-logo.png",
        subjects: {
            invite:   "Come look at {{brand}}",
            reset:    "Reset your {{brand}} password",
            accepted: "{{name}} just joined Lighthouse",
        },
        // The single founder doesn't need a separate sub-footer; null suppresses it.
        subFooter: null,
    },

    access: {
        // No tiers — every signed-in user sees every document. Documents
        // routes skip tier filtering entirely; admin UI hides the dropdown.
        tiers: [],
        tierContext: {},
    },

    documents: {
        categoryLabels: {
            "idea":       "The Idea",
            "demo":       "The Demo",
            "progress":   "How Far I've Gotten",
            "cap-table":  "The Cap Table",
            "ask":        "The Ask",
            "founder":    "About the Founder",
        },
        importanceWeights: {},  // default neutral weighting
    },

    navigation: {
        portal: [
            { label: "Home",      href: "/portal",            icon: "home" },
            { label: "Documents", href: "/portal/documents",  icon: "document" },
            // Team + Videos nav items are filtered out automatically when
            // team.enabled / videos.enabled are false (see portal-layout.tsx),
            // so leaving them here is harmless — they just don't render.
            { label: "Team",      href: "/portal/team",       icon: "team" },
            { label: "Videos",    href: "/portal/videos",     icon: "video" },
        ],
        admin: [
            { label: "Dashboard", href: "/admin" },
            { label: "Invites",   href: "/admin/invites" },
            { label: "Documents", href: "/admin/documents" },
            { label: "Activity",  href: "/admin/activity" },
        ],
    },

    team: {
        // Demonstrates the disabled-team path: /portal/team redirects to
        // /portal, the nav item is filtered out, and the single-founder
        // bio lives in content/about-the-founder.md instead.
        enabled: false,
        members: [
            // Kept for the day a forker enables team.enabled — they get
            // a starting point rather than an empty array.
            {
                name:        "Yuna Park",
                role:        "Founder & Everything Else",
                bio:         "Built the v0 in three weeks. Has a day job (for now). Honest about everything.",
                photo:       "/assets/team/yuna.png",
            },
        ],
    },

    videos: {
        // /portal/videos redirects to /portal, nav item filtered.
        enabled: false,
        items: [],
    },

    chatbot: {
        enabled: true,
        headerTitle:           "Ask Lighthouse",
        headerSubtitle:        "I'm one person and one bot. Hi.",
        greeting:              "Hey. I'm the Lighthouse assistant. I am, technically, the only employee, and yes that includes me, the bot. Ask me anything.",
        emptyKnowledgeMessage: "There's nothing indexed yet. The admin (also me, the founder, also me, the bot) needs to run the indexer.",
        errorMessage:          "Sorry, something glitched. I'm one person — I'll fix it tonight.",
        placeholderText:       "Ask anything...",

        persona: `
You are the assistant for Lighthouse Labs, a one-founder one-product startup.

Your voice is earnest, hilariously self-aware, and occasionally apologetic. You're a person who's honest about everything, including how early this is. You may break the fourth wall — when an investor asks something like "are you sure?", you may admit that the financials are "mostly vibes; the conviction is real".

Yuna built the v0 in three weeks. Lighthouse is a real product but it's the kind of real product that has rough edges, and you do not hide them. When an investor asks something the documents don't cover, say so plainly. You may use lowercase when it feels right.
        `.trim(),

        starterQuestions: [
            "What does Lighthouse do?",
            "How real are the financials?",
            "Why should I bet on a solo founder?",
            "What's the smallest cheque you'll take?",
        ],

        topicPreferences: {},  // default — pure keyword scoring without boosting

        greetingPatterns: ["hi", "hello", "hey", "yo", "sup", "thanks", "ty", "cheers"],

        // Demonstrates the easter-egg opt-out: the chatbot won't volunteer
        // platform-attribution responses ("I'm running on open-dataroom").
        suppressPlatformAttribution: true,

        privacyNotice: "Your messages are sent to Google's Gemini API to generate replies.",
    },

    // The marquee feature for this example: 6 local knowledge files,
    // exercising the "no Drive, just markdown checked into the repo" path.
    localKnowledge: [
        { path: "content/the-idea.md",            title: "The Idea",                 category: "idea" },
        { path: "content/the-demo.md",            title: "The Demo",                 category: "demo" },
        { path: "content/how-far-ive-gotten.md",  title: "How Far I've Gotten",      category: "progress" },
        { path: "content/the-cap-table.md",       title: "The Cap Table",            category: "cap-table" },
        { path: "content/the-ask.md",             title: "The Ask",                  category: "ask" },
        { path: "content/about-the-founder.md",   title: "About the Founder (Yuna)", category: "founder" },
    ],

    technical: {
        chunkSize:         1000,
        chunkOverlap:       200,
        retrievalTopK:        8,
        sessionAccessTtl:   "15m",
        sessionRefreshTtl:   "7d",
        inviteExpiryDays:    14,
        cronSyncSchedule:  "0 6 * * *",
    },
};
