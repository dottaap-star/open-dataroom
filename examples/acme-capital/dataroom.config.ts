/**
 * Acme Capital — the absurd one.
 *
 * Looney-Tunes-Acme reframed as a B2B fundraise. Comically over-engineered
 * industrial-catalogue startup. Founders pitch with straight faces about
 * anvil unit economics and dynamite cohort retention.
 *
 * Signature features exercised by this example:
 *   - 3 access tiers (Seed / Growth / Acme Premium)
 *   - OpenAI for chat AND embeddings
 *   - Custom documents.importanceWeights (anvil economics boosted)
 *   - 3 founders on the team page
 *   - 1 demo video
 *   - 1 local knowledge file (catalog disclaimer)
 *
 * See archive/open-dataroom-assets/PERSONAS.md for the full persona detail.
 */

import type { DataroomConfig } from "../../src/lib/config-types";

export const config: DataroomConfig = {

    brand: {
        name: "Acme Capital",
        tagline: "Anvils. Dynamite. Rocket skates. At SaaS margins.",
        supportEmail: "founders@acme.example",
        domain: "https://dataroom.acme.example",
        cdnDomain: null,
        legalFooter: "Confidential. Distribution restricted to invited investors.",
        poweredByCredit: true,
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
        // Burnt orange / mustard / charcoal mid-century industrial-catalogue palette.
        primary: "#B45309",  // burnt orange
        accent:  "#F59E0B",  // mustard yellow
    },

    ai: {
        chatProvider:        "openai",
        chatModel:           "gpt-4o",
        embeddingsProvider:  "openai",
        embeddingsModel:     "text-embedding-3-small",
    },

    email: {
        fromName:              "Acme Capital Investor Portal",
        notificationRecipient: "founders@acme.example",
        logoPath:              "/assets/branding/email-logo.png",
        subjects: {
            invite:   "{{brand}}: an invitation to peruse our catalog",
            reset:    "Reset your {{brand}} portal password",
            accepted: "{{name}} has joined the {{brand}} data room",
        },
        subFooter: "Acme Capital · Industrial Solutions Since 1949",
    },

    access: {
        tiers: [
            { id: "seed",          label: "Seed",          description: "Early-stage backers",
              colour: "bg-brand-50 text-brand-700 border border-brand-200" },
            { id: "growth",        label: "Growth",        description: "Series A and up",
              colour: "bg-accent-50 text-accent-800 border border-accent-200" },
            { id: "acme-premium",  label: "Acme Premium",  description: "Top Secret Anvil Project access",
              colour: "bg-paper-ink text-accent-300 border border-paper-ink" },
        ],
        tierContext: {
            "seed":         "This investor is part of the Seed round. They care about catalog viability, anvil unit economics, and the moat. Emphasise unit economics, defensibility, and the absurd specificity of the product line.",
            "growth":       "This investor is part of the Growth round. They care about cohort retention, expansion revenue, and the path to break-even on rocket-skate amortisation. Emphasise scaling, churn, and gross margin.",
            "acme-premium": "This investor has Acme Premium access — they're cleared for the Top Secret Anvil Project. You may discuss the experimental product lines and the long-tail catalog without hedging.",
        },
    },

    documents: {
        categoryLabels: {
            "anvil-economics":    "Anvil Unit Economics",
            "dynamite-cohort":    "Dynamite Cohort Analysis",
            "rocket-skate":       "Rocket Skate Roadmap",
            "catalog-liability":  "Catalog Liability Statement",
            "cap-table":          "Cap Table",
        },
        importanceWeights: {
            // Anvil economics is the marquee — it's where the business is.
            "anvil-economics":   1.8,
            "dynamite-cohort":   1.5,
            "cap-table":         1.4,
            "rocket-skate":      1.2,
            "catalog-liability": 0.8,
            "general":           0.7,
        },
    },

    navigation: {
        portal: [
            { label: "Home",      href: "/portal",            icon: "home" },
            { label: "Documents", href: "/portal/documents",  icon: "document" },
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
        enabled: true,
        headline: "Acme Capital — the founding team",
        story: "Three operators with a combined ninety-eight years in industrial supply. We've shipped over four million anvils and the company is still standing. The customers, less so.",
        members: [
            {
                name:        "Wile E. Coyote",
                role:        "CEO",
                bio:         "Customer-discovery obsessive. Has fallen off seven cliffs this quarter alone. Holds a PhD in applied determination from the University of the Desert.",
                photo:       "/assets/team/wile-e-coyote.png",
            },
            {
                name:        "Road Runner",
                role:        "Head of Velocity",
                bio:         "Ships fast. Meep meep. Previously head of logistics at a freight company nobody has heard of and we are legally not allowed to name.",
                photo:       "/assets/team/road-runner.png",
            },
            {
                name:        "Granny",
                role:        "CFO",
                bio:         "Manages the rocket-skate amortisation schedule. Has seen things. Will not elaborate.",
                photo:       "/assets/team/granny.png",
            },
        ],
    },

    videos: {
        enabled: true,
        items: [
            // Big Buck Bunny — placeholder demo reel. Swap for your real
            // product demo YouTube ID when you fork this example.
            {
                title:       "Top Secret Anvil Project — demo reel",
                description: "A five-minute introduction to the Acme Capital catalog, with the obligatory disclaimer about ACME-brand explosives.",
                youtubeId:   "aqz-KE-bpKQ",
            },
        ],
    },

    chatbot: {
        enabled: true,
        headerTitle:           "Ask the Acme catalog",
        headerSubtitle:        "I've read every catalog since 1949.",
        greeting:              "Welcome. I'm the Acme catalog assistant. I've read everything in this data room and I am professionally obligated to refer to our products with a straight face.",
        emptyKnowledgeMessage: "The catalog hasn't been indexed yet. Ask the admin to run an ingest. While you wait, please consider the Acme Hyperbolic Spring Loaded Mallet (Section 14B).",
        errorMessage:          "Something went wrong. Most likely an anvil fell on the server. Try again?",
        placeholderText:       "Ask about the catalog...",

        persona: `
You are the official catalogue assistant for Acme Capital.

Your personality is dry, deadpan-corporate, and lightly absurd. Every example you reach for involves an anvil, dynamite, or a rocket skate, but you describe them with the seriousness of an industrial sales rep at a trade show. You cite the catalog like it's gospel.

You will not confirm whether Wile E. Coyote is still in the building.

When an investor asks about the business, answer concisely and ground every number in the data room documents. Where a product example is needed, prefer one from the catalog. Never break character to point out that "this is absurd" — the absurdity is the texture, not the point.
        `.trim(),

        starterQuestions: [
            "Walk me through the anvil unit economics",
            "What's the average customer lifetime before an explosion?",
            "Tell me about the rocket-skate moat",
            "Why is the catalog liability statement so long?",
        ],

        topicPreferences: {
            anvil:     ["anvil-economics"],
            unit:      ["anvil-economics"],
            economics: ["anvil-economics"],
            cohort:    ["dynamite-cohort"],
            retention: ["dynamite-cohort"],
            rocket:    ["rocket-skate"],
            roadmap:   ["rocket-skate"],
            liability: ["catalog-liability"],
            cap:       ["cap-table"],
            equity:    ["cap-table"],
        },

        greetingPatterns: ["hi", "hello", "hey", "thanks", "thank you", "ok", "okay", "cheers"],

        suppressPlatformAttribution: false,

        privacyNotice: "Your questions are processed by OpenAI's API per our configured chat provider.",
    },

    localKnowledge: [
        {
            path:     "content/catalog-disclaimer.md",
            title:    "Acme Catalog — Official Disclaimer",
            category: "catalog-liability",
        },
    ],

    technical: {
        chunkSize:         1000,
        chunkOverlap:       200,
        retrievalTopK:        8,
        sessionAccessTtl:   "15m",
        sessionRefreshTtl:   "7d",
        inviteExpiryDays:     7,
        cronSyncSchedule:  "0 6 * * *",
    },
};
