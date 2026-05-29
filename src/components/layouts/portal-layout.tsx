"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cx } from "@/utils/cx";
import { ChatPanel } from "@/components/chat/chat-panel";
import { config } from "@/config";

const ICONS: Record<string, (props: { className?: string }) => React.ReactElement> = {
    home: HomeIcon,
    document: DocumentIcon,
    team: TeamIcon,
    video: VideoIcon,
};

// Filter nav items: hide Team if team.enabled = false, hide Videos if videos.enabled = false.
// (Both pages render a redirect when disabled, but hiding the nav link is the cleaner UX.)
const NAV_ITEMS = config.navigation.portal.filter((item) => {
    if (item.href === "/portal/team" && !config.team.enabled) return false;
    if (item.href === "/portal/videos" && !config.videos.enabled) return false;
    return true;
});

function getRole(): string | null {
    try {
        const cookie = document.cookie.split("; ").find((c) => c.startsWith("user_role="));
        return cookie ? cookie.split("=")[1] : null;
    } catch {
        return null;
    }
}

export function PortalLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [chatOpen, setChatOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        setIsAdmin(getRole() === "admin");
    }, []);

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <aside className="flex w-64 shrink-0 flex-col border-r border-secondary bg-primary">
                {/* Logo */}
                <div className="flex h-16 items-center border-b border-secondary px-6">
                    <Image src={config.assets.logoLight} alt={config.brand.name} width={100} height={32} />
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1 px-3 py-4">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/portal" && pathname.startsWith(item.href));
                        const IconComponent = item.icon ? ICONS[item.icon] : null;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cx(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-brand-50 text-brand-700"
                                        : "text-tertiary hover:bg-secondary hover:text-primary"
                                )}
                            >
                                {IconComponent && (
                                    <IconComponent className={cx("size-5", isActive ? "text-brand-600" : "text-gray-400")} />
                                )}
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom section */}
                <div className="space-y-3 border-t border-secondary p-4">
                    <button
                        onClick={async () => {
                            await fetch("/api/auth/logout", { method: "POST" });
                            window.location.href = "/login";
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-tertiary transition-colors hover:bg-secondary hover:text-primary"
                    >
                        Sign out
                    </button>
                    <div>
                        <p className="text-xs text-quaternary">{config.brand.legalFooter}</p>
                        {config.brand.poweredByCredit && (
                            <p className="mt-2 text-xs text-quaternary">
                                Powered by{" "}
                                <a
                                    href={config.brand.poweredByCreditUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline hover:text-tertiary"
                                >
                                    open-dataroom
                                </a>
                            </p>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main content area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Page content */}
                <main className={cx("flex-1 overflow-y-auto", chatOpen ? "w-[60%]" : "w-full")}>
                    {/* Admin banner — only renders when there are tiers AND viewer is admin */}
                    {isAdmin && config.access.tiers.length > 0 && (
                        <div className="flex items-center justify-between bg-brand-600 px-6 py-2">
                            <div className="flex items-center gap-3">
                                <p className="text-xs font-medium text-white">Viewing as</p>
                                <select
                                    defaultValue={(() => {
                                        const c = document.cookie.split("; ").find((c) => c.startsWith("preview_tier="));
                                        return c?.split("=")[1] || config.access.tiers[0].id;
                                    })()}
                                    onChange={(e) => {
                                        document.cookie = `preview_tier=${e.target.value}; path=/; max-age=3600; SameSite=lax`;
                                        window.location.reload();
                                    }}
                                    className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium text-white border-none focus:outline-none focus:ring-1 focus:ring-white/40"
                                >
                                    {config.access.tiers.map((tier) => (
                                        <option key={tier.id} value={tier.id} className="text-gray-900">
                                            {tier.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => {
                                    document.cookie = "preview_tier=; path=/; max-age=0";
                                    window.location.href = "/admin";
                                }}
                                className="rounded-md bg-white/20 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-white/30"
                            >
                                Back to Admin
                            </button>
                        </div>
                    )}
                    {/* Top bar */}
                    <header className="flex h-16 items-center justify-between border-b border-secondary px-6">
                        <div />
                        {config.chatbot.enabled && (
                            <button
                                onClick={() => setChatOpen(!chatOpen)}
                                className={cx(
                                    "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                                    chatOpen
                                        ? "bg-brand-50 text-brand-700"
                                        : "bg-brand-600 text-white shadow-xs hover:bg-brand-700"
                                )}
                            >
                                <ChatBubbleIcon className="size-4" />
                                {chatOpen ? "Close Chat" : config.chatbot.headerTitle}
                            </button>
                        )}
                    </header>
                    <div className="p-6">{children}</div>
                </main>

                {/* Chat panel - collapsible */}
                {chatOpen && config.chatbot.enabled && (
                    <div className="w-[40%] min-w-[380px] max-w-[500px] border-l border-secondary">
                        <ChatPanel onClose={() => setChatOpen(false)} />
                    </div>
                )}
            </div>
        </div>
    );
}

// Inline SVG icons (lightweight, no external dependency needed)
function HomeIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    );
}

function DocumentIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
    );
}

function TeamIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function VideoIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
    );
}

function ChatBubbleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    );
}
