import type { Metadata } from "next";
import { config } from "@/config";

export const metadata: Metadata = {
    title: "Data Room",
};

// Quick-link cards shown on the portal home — filter out disabled sections so
// the home page doesn't link to pages that redirect.
const QUICK_LINKS = [
    {
        href: "/portal/documents",
        title: "Documents",
        description: "Business plan, pitch deck, financials, and more",
        enabled: true,
        icon: (
            <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
            </svg>
        ),
    },
    {
        href: "/portal/team",
        title: "Meet the Team",
        description: "Get to know the people behind the company",
        enabled: config.team.enabled,
        icon: (
            <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        ),
    },
    {
        href: "/portal/videos",
        title: "Videos",
        description: "Product demo and pitch recordings",
        enabled: config.videos.enabled,
        icon: (
            <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
        ),
    },
];

export default function PortalHome() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-display-md font-semibold text-primary">
                    Welcome to {config.brand.name}
                </h1>
                <p className="mt-3 max-w-2xl text-lg text-tertiary">
                    {config.brand.tagline}
                </p>
                <p className="mt-2 max-w-2xl text-md text-quaternary">
                    Browse the documents
                    {config.team.enabled ? ", meet the team," : ","}
                    {" "}or ask our AI assistant anything.
                </p>
            </div>

            {/* Quick access cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {QUICK_LINKS.filter((l) => l.enabled).map((link) => (
                    <QuickCard
                        key={link.href}
                        href={link.href}
                        title={link.title}
                        description={link.description}
                        icon={link.icon}
                    />
                ))}
            </div>

            {/* Confidentiality notice */}
            <div className="mt-12 rounded-xl border border-warning-200 bg-warning-25 p-4">
                <p className="text-sm font-medium text-warning-700">Confidential Information</p>
                <p className="mt-1 text-sm text-warning-600">
                    The materials in this data room are confidential and intended solely for the recipient. By accessing
                    this portal, you agree not to share, distribute, or reproduce any of its contents without prior
                    written consent from {config.brand.name}.
                </p>
            </div>
        </div>
    );
}

function QuickCard({
    href,
    title,
    description,
    icon,
}: {
    href: string;
    title: string;
    description: string;
    icon: React.ReactNode;
}) {
    return (
        <a
            href={href}
            className="group relative overflow-hidden rounded-xl border border-paper-rule bg-paper-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[0_12px_24px_-12px_rgba(0,0,0,0.18)]"
        >
            {/* Hairline brand accent on hover — reads as a stamp at the top edge */}
            <div className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-brand-600 transition-transform duration-300 group-hover:scale-x-100" />

            <div className="mb-5 flex size-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-100">
                {icon}
            </div>
            <h3 className="text-lg font-semibold text-primary">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-tertiary">{description}</p>

            {/* Read-more affordance */}
            <div className="mt-5 flex items-center gap-1 text-sm font-medium text-brand-700 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                Open
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                </svg>
            </div>
        </a>
    );
}
