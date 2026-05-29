/**
 * Single source of truth for what the data room can be customized with.
 *
 * Everything user-tunable about a deployment — branding, navigation, the chatbot's
 * personality, which LLM provider to talk to, which tiers of investor access exist,
 * what the email templates say — flows through this interface. The shipped
 * `dataroom.config.ts` at the repo root is one valid `DataroomConfig` instance;
 * the three opt-in datasets under `examples/` ship as alternate instances that
 * `bin/use-example.ts` can swap in.
 *
 * Phase 2 of the migration plan only defines this contract. No consumer reads
 * from it yet; that work lands phase-by-phase from Phase 3a onward.
 *
 * Edge-runtime constraint (plan §12): this file is type-only. The companion
 * `src/lib/config.ts` re-exports the frozen config value and MUST NOT import
 * anything node-only (mongoose, googleapis, nodemailer, llm SDKs). Keep this
 * file types-only and consumers safe to import from the edge runtime.
 */

// -- helper unions --

export type ChatProvider = "gemini" | "openai" | "anthropic";

/**
 * Anthropic ships no first-party embeddings model, so a deployment that runs
 * chat on Claude still needs Gemini or OpenAI here. The wizard enforces that
 * one of those two has an API key set even when chat uses Anthropic.
 */
export type EmbeddingsProvider = "gemini" | "openai";

export type NavIcon = "home" | "document" | "team" | "video";

// -- sub-shapes --

export interface BrandConfig {
    name: string;
    tagline: string;
    supportEmail: string;
    /** Absolute base URL used in transactional emails and the metadataBase tag. */
    domain: string;
    /** Optional CDN hostname allowlisted in `next.config.mjs` for `next/image`. */
    cdnDomain: string | null;
    /** Footer text shown on the investor portal sidebar. */
    legalFooter: string;
    /**
     * When true, renders "Powered by open-dataroom" in the portal footer
     * (links to GitHub). Standard OSS convention (Cal.com, Plausible, Posthog).
     * Default true; set to false to remove. See plan §11.
     */
    poweredByCredit: boolean;
    /**
     * Where the "Powered by open-dataroom" link in the footer points. Lets
     * a fork redirect to its own repo (or removes the bug where forks credit
     * the placeholder `my-username/open-dataroom` URL). Only read when
     * `poweredByCredit` is true.
     */
    poweredByCreditUrl: string;
}

export interface AssetsConfig {
    logoLight: string;
    /** Unused while light-only; kept in the type for the eventual dark-mode revival. */
    logoDark: string;
    faviconSvg: string;
    faviconPng: string;
    ogImage: string;
}

export interface ThemeConfig {
    /**
     * Primary brand colour. Drives the browser `theme-color` meta tag and is
     * surfaced in the wizard / admin theme page as a UX hint. The actual UI
     * ramp lives in `src/styles/theme-brand.css` as 12 hand-tunable RGB lines —
     * this field does NOT regenerate that ramp.
     */
    primary: string;
    /** Lighter accent used in transactional-email links and URL previews. */
    accent: string;
}

export interface AiConfig {
    chatProvider: ChatProvider;
    /** Per-provider sensible defaults: gemini → "gemini-3.1-pro-preview", openai → "gpt-4o", anthropic → "claude-sonnet-4-5". */
    chatModel: string;
    embeddingsProvider: EmbeddingsProvider;
    /** Defaults: gemini → "embedding-001" (768-dim), openai → "text-embedding-3-small" (1536-dim). */
    embeddingsModel: string;
}

export interface EmailSubjects {
    /** Template variables: `{{brand}}`. */
    invite: string;
    /** Template variables: `{{brand}}`. */
    reset: string;
    /** Template variables: `{{name}}` (the new investor's name). */
    accepted: string;
}

export interface EmailConfig {
    /** Shown as the From name in inboxes; the From address is `EMAIL_USER` from env. */
    fromName: string;
    /** Where invite-accepted notifications go — usually the admin's own address. */
    notificationRecipient: string;
    /**
     * Path under /public used as the email logo. Inlined as a CID attachment
     * (works in all email clients). Recommended size: 240×112 PNG @ 2x.
     */
    logoPath: string;
    subjects: EmailSubjects;
    /** Sub-footer line at the bottom of every email. Set to null to omit. */
    subFooter: string | null;
}

export interface AccessTier {
    /** Slug used in DB rows, JWT payloads, and the Drive folder convention. */
    id: string;
    /** Human-readable label shown in admin UI + portal tier badges. */
    label: string;
    /** Optional descriptor surfaced in the admin invite form. */
    description?: string;
    /**
     * Optional tier-specific colour class. Free-text Tailwind class names
     * (e.g. "bg-blue-100 text-blue-700") — admin dashboard renders this on
     * tier badges. Leave undefined for the neutral default.
     */
    colour?: string;
}

export interface AccessConfig {
    /**
     * Investor access tiers. Empty array = no tier dropdowns rendered;
     * every investor sees every document.
     */
    tiers: AccessTier[];
    /**
     * Free-text guidance per tier — appended to the system prompt when this
     * investor's tier is active. Keys are `tier.id` values from `tiers`.
     */
    tierContext: Record<string, string>;
}

export interface DocumentsConfig {
    /**
     * Optional pretty labels for Drive-folder slugs. If a folder isn't listed
     * here, the slug is auto-derived (lowercase + hyphens) and used as-is.
     */
    categoryLabels: Record<string, string>;
    /**
     * Per-category importance weight used by the keyword RAG scorer.
     * 1.0 = neutral, higher = preferred. See `src/lib/rag/search.ts`.
     */
    importanceWeights: Record<string, number>;
}

export interface NavItem {
    label: string;
    href: string;
    icon?: NavIcon;
}

export interface NavigationConfig {
    portal: NavItem[];
    admin: NavItem[];
}

export interface TeamMember {
    name: string;
    role: string;
    bio?: string;
    linkedinUrl?: string;
    /** Path under /public/assets/team/. */
    photo?: string;
}

export interface TeamConfig {
    /** False = the /portal/team page redirects to /portal. */
    enabled: boolean;
    headline?: string;
    story?: string;
    members: TeamMember[];
}

export type VideoItem =
    | { title: string; description?: string; youtubeId: string }
    | { title: string; description?: string; mp4Url: string };

export interface VideosConfig {
    /** False = the /portal/videos page redirects to /portal. */
    enabled: boolean;
    items: VideoItem[];
}

export interface ChatbotConfig {
    /** False = the right-side chat panel doesn't render. */
    enabled: boolean;
    headerTitle: string;
    headerSubtitle: string;
    /** First message the panel shows on open. */
    greeting: string;
    /** Shown when the KB hasn't been indexed yet. */
    emptyKnowledgeMessage: string;
    /** Shown on transport/LLM errors. */
    errorMessage: string;
    /** Placeholder text in the input. */
    placeholderText: string;
    /**
     * The persona / system prompt body. Forkers customise the bot's voice by
     * rewriting this. The mechanical guard rails (citation format, "don't
     * speculate", "answer from sources") are appended by `src/lib/chat.ts`.
     */
    persona: string;
    /** Suggested-question chips shown above the input on first open. */
    starterQuestions: string[];
    /**
     * Topic → preferred categories. Tunes RAG retrieval. Empty map = pure
     * keyword scoring with no boosting.
     */
    topicPreferences: Record<string, string[]>;
    /**
     * Greeting fast-path patterns — if the user message matches any of these
     * (case-insensitive substring), RAG retrieval is skipped (no source
     * citations, no token spend on context). Preserves the existing
     * `needsRAG()` heuristic in `src/lib/chat.ts`.
     */
    greetingPatterns: string[];
    /**
     * If true, the chatbot's built-in "I'm running on open-dataroom"
     * easter-egg response is suppressed and the bot answers platform
     * questions strictly from `persona`. White-label deployments want this.
     */
    suppressPlatformAttribution: boolean;
    /**
     * One-line privacy notice shown above the chat input. Renders as muted text.
     * Null = no notice. Default value warns the investor that queries flow to
     * the configured LLM provider. GDPR-bound deployments should customise.
     */
    privacyNotice: string | null;
}

export interface LocalKnowledgeSource {
    /** Path relative to repo root. */
    path: string;
    /** Display title used in citations + chunk dedup. */
    title: string;
    /** Category slug for RAG importance-weight lookups. */
    category: string;
}

export interface TechnicalConfig {
    /** Chunk size in characters (not tokens). */
    chunkSize: number;
    /** Chunk overlap in characters. */
    chunkOverlap: number;
    retrievalTopK: number;
    /** JWT access-token TTL, e.g. "15m". */
    sessionAccessTtl: string;
    /** JWT refresh-token TTL, e.g. "7d". */
    sessionRefreshTtl: string;
    inviteExpiryDays: number;
    /** Crontab string for the Drive-sync schedule. */
    cronSyncSchedule: string;
}

// -- top-level shape --

export interface DataroomConfig {
    brand: BrandConfig;
    assets: AssetsConfig;
    theme: ThemeConfig;
    ai: AiConfig;
    email: EmailConfig;
    access: AccessConfig;
    documents: DocumentsConfig;
    navigation: NavigationConfig;
    team: TeamConfig;
    videos: VideosConfig;
    chatbot: ChatbotConfig;
    localKnowledge: LocalKnowledgeSource[];
    technical: TechnicalConfig;
}
