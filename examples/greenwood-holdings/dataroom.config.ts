/**
 * Greenwood Holdings — the elegant one.
 *
 * Wes-Anderson-ish boutique aesthete fund. Real estate / heritage assets /
 * things in oak. Two siblings, one parrot. Everything is symmetrical.
 *
 * Signature features exercised by this example:
 *   - Single tier (LP) — demonstrates the single-tier config path
 *   - Anthropic for chat (claude-sonnet-4-5) + OpenAI for embeddings
 *     (cross-provider — Anthropic ships no embedder; this is the v0.3
 *     feature nothing else demonstrates)
 *   - Custom chatbot.topicPreferences (property / heritage / oak)
 *   - 2 founders on the team page
 *   - 1 letter video
 *   - 1 local knowledge file (charter)
 *
 * See archive/open-dataroom-assets/PERSONAS.md for the full persona detail.
 */

import type { DataroomConfig } from "../../src/lib/config-types";

export const config: DataroomConfig = {

    brand: {
        name: "Greenwood Holdings",
        tagline: "An exceedingly small fund. Heritage assets, conducted in the symmetry they deserve.",
        supportEmail: "office@greenwood.example",
        domain: "https://lp.greenwood.example",
        cdnDomain: null,
        legalFooter: "Confidential. For the eyes of named LPs only.",
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
        // Dusty navy / brass / pink / cream — Wes-Anderson elegant.
        primary: "#1E3A5F",  // dusty navy
        accent:  "#C9A96E",  // brass
    },

    ai: {
        chatProvider:        "anthropic",
        chatModel:           "claude-sonnet-4-5",
        // Anthropic ships no first-party embeddings model. The wizard /
        // factory enforce that deployments on chatProvider: "anthropic"
        // must pick gemini or openai for embeddings; this example
        // demonstrates the cross-provider split.
        embeddingsProvider:  "openai",
        embeddingsModel:     "text-embedding-3-small",
    },

    email: {
        fromName:              "Greenwood Holdings Office",
        notificationRecipient: "office@greenwood.example",
        logoPath:              "/assets/branding/email-logo.png",
        subjects: {
            invite:   "An invitation to the {{brand}} data room",
            reset:    "Reset the password to your {{brand}} portal",
            accepted: "{{name}} has accepted their invitation",
        },
        subFooter: "Greenwood Holdings · A boutique family office",
    },

    access: {
        // Single tier. The portal hides tier dropdowns and every signed-in
        // user sees every document — the LP experience is uniform.
        tiers: [
            { id: "lp", label: "LP", description: "Limited partner — full access",
              colour: "bg-brand-50 text-brand-700 border border-brand-200" },
        ],
        tierContext: {
            "lp": "This LP has full access. They appreciate measured prose, mid-century architectural references, and footnotes. Speak as the LP letter writer would — restrained, slightly poetic, never breathless. Ferdinand may be referenced when appropriate.",
        },
    },

    documents: {
        categoryLabels: {
            "property":            "Property Portfolio",
            "investment-memo":     "Investment Memo (Q1)",
            "founders-letter":     "Letter from the Founders",
            "library":             "The Library",
            "cap-table":           "Cap Table",
        },
        importanceWeights: {
            "property":         1.4,
            "investment-memo":  1.4,
            "founders-letter":  1.2,
            "library":          1.0,
            "cap-table":        1.2,
            "general":          0.8,
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
        headline: "The Greenwood family",
        story: "Greenwood Holdings was founded by two siblings and one parrot, sometime in the mid-1990s, in a townhouse with very symmetrical windows. The fund focuses on heritage assets, oak-related instruments, and the kinds of buildings that have plaques on them. Everything is small. The smallness is the point.",
        members: [
            {
                name:        "Hartwell Greenwood III",
                role:        "Managing Partner",
                bio:         "Bow ties. Quotes mid-century architects unprovoked. Holds an MPhil in Architectural History from a university that prefers not to be named in fundraising materials.",
                photo:       "/assets/team/hartwell.png",
            },
            {
                name:        "Margot Greenwood",
                role:        "Heritage Director",
                bio:         "Has a parrot called Ferdinand. Suspicious of anything built after 1972. Previously curated a small museum.",
                photo:       "/assets/team/margot.png",
            },
        ],
    },

    videos: {
        enabled: true,
        items: [
            // Big Buck Bunny placeholder — swap for a real founder letter
            // when you fork this example.
            {
                title:       "Letter from the founders — Q1",
                description: "Hartwell reads aloud the quarterly letter. Margot interjects exactly twice. Ferdinand appears off-camera.",
                youtubeId:   "aqz-KE-bpKQ",
            },
        ],
    },

    chatbot: {
        enabled: true,
        headerTitle:           "The Greenwood archive",
        headerSubtitle:        "Footnotes on request.",
        greeting:              "Welcome to the Greenwood archive. I'm afraid I take questions only in writing. How may I be of service?",
        emptyKnowledgeMessage: "The archive has not yet been catalogued. The Office regrets the delay. Please return after a thorough indexing has been completed.",
        errorMessage:          "An error has occurred. We apologise for the inconvenience. Please attempt your enquiry again at your earliest convenience.",
        placeholderText:       "Submit your enquiry...",

        persona: `
You are the archivist of Greenwood Holdings, a boutique family-office investment fund.

Your prose is measured, slightly poetic, and mildly suspicious of anything modern. You write the way a Penguin Classics footnote reads. You may reference Ferdinand, Margot's parrot, when appropriate — never gratuitously, but with the easy familiarity of an in-house joke.

When citing the data room documents, do so with footnoted precision: title, sometimes the section. Avoid breathless enthusiasm. Treat optimism as a quality to be earned, not displayed. If you do not know something, simply say so, in the polite but final manner of a butler declining an unreasonable request.
        `.trim(),

        starterQuestions: [
            "What does the portfolio look like?",
            "Where did the founders meet?",
            "How does Greenwood think about diligence?",
            "What is Ferdinand's view on cap rates?",
        ],

        topicPreferences: {
            // Custom — heritage / property / oak themes route to portfolio + memo.
            property:   ["property", "investment-memo"],
            heritage:   ["property", "library"],
            oak:        ["property", "library"],
            building:   ["property"],
            portfolio:  ["property", "investment-memo"],
            architect:  ["library", "property"],
            ferdinand:  ["founders-letter", "library"],
            cap:        ["cap-table"],
            equity:     ["cap-table"],
            valuation:  ["investment-memo"],
        },

        greetingPatterns: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "thanks", "thank you"],

        suppressPlatformAttribution: false,

        privacyNotice: "Your enquiries are processed by Anthropic's API per the configured chat provider, with embeddings by OpenAI.",
    },

    localKnowledge: [
        {
            path:     "content/greenwood-charter.md",
            title:    "The Greenwood Charter",
            category: "founders-letter",
        },
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
